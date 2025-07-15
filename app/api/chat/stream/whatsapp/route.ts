import { submitQuestion } from "@/lib/langgraph";
import { NextResponse } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

// Helper to send message to WhatsApp API
async function sendToWhatsApp(receiver: string, msgtext: string, token: string) {
  const nodeurl = "https://server.msgbucket.com/send";
  const data: Record<string, string> = {
    receiver,
    msgtext,
    token,
  };
  const response = await fetch(nodeurl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  });
  return response.json();
}

// Helper to fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<{ base64: string, mimeType: string }> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { base64, mimeType };
}

export async function POST(req: Request) {
  try {
    // 1. Parse incoming WhatsApp payload
    const body = await req.json();
    const payload = body.payload || {};
    const contactName = payload.contact_name;
    const userMessage = payload.message;
    if (!contactName || !userMessage) {
      return NextResponse.json({ success: false, error: "Missing contact_name or message in payload" }, { status: 400 });
    }

    // 2. Get or create WhatsApp chat
    const convex = getConvexClient();
    const chatId = await convex.mutation(api.whatsapp.getOrCreateChat, {
      contact_name: contactName,
      name: payload.sender_name,
    });

    // 3. Fetch previous messages for this chat
    const previousMessages = await convex.query(api.whatsapp.listMessages, { chatId });

    // 4. Convert to LangChain format
    const langChainMessages = previousMessages.map(msg =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    // 5. Append the new user message
    langChainMessages.push(new HumanMessage(userMessage));

    // 6. Prepare image attachments if present
    let attachments = [];
    if (payload.media && payload.media !== "none") {
      try {
        const { base64, mimeType } = await fetchImageAsBase64(payload.media);
        attachments.push({
          type: "image" as const,
          url: `data:${mimeType};base64,${base64}`,
          filename: payload.filename !== "none" ? payload.filename : "image.jpg",
          mimeType,
        });
      } catch (e) {
        console.error("Failed to fetch/process image:", e);
      }
    }

    // 7. Call submitQuestion with full history and attachments
    const eventStream = await submitQuestion(langChainMessages, chatId, attachments);

    // 8. Buffer the streamed AI response
    let aiResponse = "";
    for await (const event of eventStream) {
      if (event.event === "on_chat_model_stream") {
        const token = event.data.chunk;
        const text = token?.content?.at(0)?.["text"];
        if (text) aiResponse += text;
      }
    }

    // 9. Store the new user message and AI response in Convex
    await convex.mutation(api.whatsapp.sendMessage, {
      chatId,
      content: userMessage,
      role: "user",
      sender_name: payload.sender_name,
      message_type: payload.message_type,
      direction: payload.direction,
      hour: payload.hour,
      my_number: payload.my_number,
      media: payload.media,
      keyword: payload.keyword,
      filename: payload.filename,
      group_flag: payload.group_flag,
      scan_number: payload.scan_number,
      quote_message: payload.quote_message,
      quote_from: payload.quote_from,
      quote_name: payload.quote_name,
    });
    await convex.mutation(api.whatsapp.sendMessage, {
      chatId,
      content: aiResponse,
      role: "assistant",
      sender_name: undefined,
      message_type: undefined,
      direction: "outgoing",
      hour: undefined,
      my_number: undefined,
      media: undefined,
      keyword: undefined,
      filename: undefined,
      group_flag: undefined,
      scan_number: undefined,
      quote_message: undefined,
      quote_from: undefined,
      quote_name: undefined,
    });

    // 10. Send the buffered response to WhatsApp API
    const token = "Dac8B0ALQliH91ykKhQ2"; // Use your actual token
    const sendResult = await sendToWhatsApp(contactName, aiResponse, token);

    // 11. Return JSON response
    return NextResponse.json({ success: true, sendResult, aiResponse });
  } catch (error) {
    console.error("Error in WhatsApp webhook:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}