import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function ChatModal({ chatId, onClose }: { chatId: string, onClose: () => void }) {
  // Convert string to Id<\"chats\">
  const chatConvexId = chatId as Id<"chats">;
  const chat = useQuery(
    api.chats.getChat,
    chatId ? { id: chatConvexId, userId: "" } : "skip"
  );
  const messages = useQuery(api.messages.list, chatId ? { chatId: chatConvexId } : "skip");

  if (!chat) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>✕</button>
        <h2 className="text-xl font-bold mb-4">Chat Conversation</h2>
        <div className="mb-2 text-gray-700">
          <b>Title:</b> {chat.title}
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {messages?.map((msg: any) => (
            <div key={msg._id} className="p-2 rounded border">
              <b>{msg.role === "user" ? "User" : "Assistant"}:</b> {msg.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
