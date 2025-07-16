import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

export async function POST(req: Request) {
  const { chatId, humanResponseNeeded } = await req.json();
  if (!chatId) return NextResponse.json({ success: false, error: "Missing chatId" }, { status: 400 });
  const convex = getConvexClient();
  await convex.mutation(api.chats.markHumanResponseNeeded, { chatId, humanResponseNeeded });
  return NextResponse.json({ success: true });
} 