import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const { chatId, contact_name, message } = await req.json();
    if (!chatId || !contact_name || !message) {
      return NextResponse.json({ success: false, error: "Missing chatId, contact_name, or message" }, { status: 400 });
    }

    // 1. Send the message to WhatsApp
    const token = "Dac8B0ALQliH91ykKhQ2"; // Use your actual token
    const sendResult = await sendToWhatsApp(contact_name, message, token);

    // 2. Store the message in Convex as an assistant message
    const convex = getConvexClient();
    await convex.mutation(api.whatsapp.sendMessage, {
      chatId,
      content: message,
      role: "assistant",
      direction: "outgoing",
    });

    return NextResponse.json({ success: true, sendResult });
  } catch (error) {
    console.error("Error in WhatsApp admin reply:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
} 