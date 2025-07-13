"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";
import { BotIcon } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  isUser?: boolean;
  attachments?: Array<{
    type: "image";
    url: string;
    filename: string;
    size?: number;
    mimeType?: string;
  }>;
}

const formatMessage = (content: string): string => {
  // First unescape backslashes
  content = content.replace(/\\\\/g, "\\");

  // Then handle newlines
  content = content.replace(/\\n/g, "\n");

  // Remove only the markers but keep the content between them
  content = content.replace(/---START---\n?/g, "").replace(/\n?---END---/g, "");

  // Trim any extra whitespace that might be left
  return content.trim();
};

export function MessageBubble({ content, isUser, attachments }: MessageBubbleProps) {
  const { user } = useUser();
  const formattedContent = formatMessage(content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[75%] shadow-sm ring-1 ring-inset relative ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none ring-blue-700"
            : "bg-white text-gray-900 rounded-bl-none ring-gray-200"
        }`}
      >
        {/* Text content */}
        {formattedContent && (
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed mb-2">
            <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
          </div>
        )}

        {/* Image attachments */}
        {attachments && attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative">
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxHeight: "300px" }}
                />
                {attachment.filename && (
                  <div className="text-xs text-gray-500 mt-1">
                    {attachment.filename}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div
          className={`absolute bottom-0 ${
            isUser
              ? "right-0 translate-x-1/2 translate-y-1/2"
              : "left-0 -translate-x-1/2 translate-y-1/2"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 ${
              isUser ? "bg-white border-gray-100" : "bg-blue-600 border-white"
            } flex items-center justify-center shadow-sm`}
          >
            {isUser ? (
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <BotIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}