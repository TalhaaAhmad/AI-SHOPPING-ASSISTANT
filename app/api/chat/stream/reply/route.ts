import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

export async function POST(req: Request) {
  try {
    const { chatId, message } = await req.json();
    if (!chatId || !message) {
      return NextResponse.json({ success: false, error: "Missing chatId or message" }, { status: 400 });
    }

    // Store the message in Convex as an assistant message
    const convex = getConvexClient();
    await convex.mutation(api.messages.store, {
      chatId,
      content: message,
      role: "assistant",
      attachments: [],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in chat admin reply:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
