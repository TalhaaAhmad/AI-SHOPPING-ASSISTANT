"use client";

import { useEffect, useRef, useState } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import WelcomeMessage from "@/components/WelcomeMessage";
import { createSSEParser } from "@/lib/SSEParser";
import { MessageBubble } from "@/components/MessageBubble";
import { ArrowRight, Sparkles, Image, X } from "lucide-react";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

interface Attachment {
  type: "image";
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
}

export default function ChatInterface({
  chatId,
  initialMessages,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    input: unknown;
  } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chat, setChat] = useState<Doc<"chats"> | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const { user } = useUser();
  const userId = user?.id;
  const [confirmation, setConfirmation] = useState("");

  // Fetch chat object on mount
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const convex = getConvexClient();
      try {
        const chatObj = await convex.query(api.chats.getChat, { id: chatId, userId });
        if (mounted) setChat(chatObj);
      } catch (e) {
        setChat(null);
      }
    })();
    return () => { mounted = false; };
  }, [chatId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponse]);

  const handleFileUpload = async (files: FileList | File[]) => {
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      setAttachments((prev) => [...prev, ...result.files]);
    } catch (error) {
      console.error("Upload error:", error);
      // Show a more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Filter for image files only
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (imageFiles.length !== files.length) {
        alert("Some files were skipped because they are not images.");
      }
      
      if (imageFiles.length > 0) {
        handleFileUpload(imageFiles);
      }
    }
  };

  /**
   * Processes a ReadableStream from the SSE response.
   * This function continuously reads chunks of data from the stream until it's done.
   * Each chunk is decoded from Uint8Array to string and passed to the callback.
   */
  const processStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string) => Promise<void>
  ) => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await onChunk(new TextDecoder().decode(value));
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput && attachments.length === 0) return;
    if (isLoading) return;

    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);
    setConfirmation("");

    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId,
      content: trimmedInput || "Sent an image",
      role: "user",
      createdAt: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    } as Doc<"messages">;

    setMessages((prev) => [...prev, optimisticUserMessage]);

    // If human escalation is active, just store the message and show confirmation
    if (chat && chat.humanResponseNeeded) {
      try {
        const convex = getConvexClient();
        await convex.mutation(api.messages.store, {
          chatId,
          content: trimmedInput || "Sent an image",
          role: "user",
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        setConfirmation("Your message has been sent to a human agent.");
        setAttachments([]);
      } catch (error) {
        setConfirmation("Failed to send message to human agent.");
        setMessages((prev) => prev.filter((msg) => msg._id !== optimisticUserMessage._id));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Track complete response for saving to database
    let fullResponse = "";

    try {
      // Prepare chat history and new message for API
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          attachments: msg.attachments,
        })),
        newMessage: trimmedInput || "Sent an image",
        chatId,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      // Initialize SSE connection
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body available");

      // Create SSE parser and stream reader
      const parser = createSSEParser();
      const reader = response.body.getReader();

      // Process the stream chunks
      await processStream(reader, async (chunk) => {
        // Parse SSE messages from the chunk
        const messages = parser.parse(chunk);

        // Handle each message based on its type
        for (const message of messages) {
          switch (message.type) {
            case StreamMessageType.Token:
              // Handle streaming tokens (normal text response)
              if ("token" in message) {
                fullResponse += message.token;
                setStreamedResponse(fullResponse);
              }
              break;

            case StreamMessageType.ToolStart:
              // Handle start of tool execution (e.g. API calls, file operations)
              if ("tool" in message) {
                setCurrentTool({
                  name: message.tool,
                  input: message.input,
                });
              }
              break;

            case StreamMessageType.ToolEnd:
              // Handle completion of tool execution
              if ("tool" in message && currentTool) {
                setCurrentTool(null);
              }
              break;

            case StreamMessageType.Error:
              // Handle error messages from the stream
              if ("error" in message) {
                throw new Error(message.error);
              }
              break;

            case StreamMessageType.Done:
              // Handle completion of the entire response
              const assistantMessage: Doc<"messages"> = {
                _id: `temp_assistant_${Date.now()}`,
                chatId,
                content: fullResponse,
                role: "assistant",
                createdAt: Date.now(),
              } as Doc<"messages">;

              // Save the complete message to the database
              const convex = getConvexClient();
              await convex.mutation(api.messages.store, {
                chatId,
                content: fullResponse,
                role: "assistant",
              });

              setMessages((prev) => [...prev, assistantMessage]);
              setStreamedResponse("");
              setAttachments([]);
              return;
          }
        }
      });
    } catch (error) {
      // Handle any errors during streaming
      console.error("Error sending message:", error);
      // Remove the optimistic user message if there was an error
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== optimisticUserMessage._id)
      );
      setStreamedResponse(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Escalate to human handler
  const handleEscalate = async () => {
    setIsEscalating(true);
    try {
      const convex = getConvexClient();
      await convex.mutation(api.chats.markHumanResponseNeeded, { chatId, humanResponseNeeded: true });
      setChat((prev) => prev ? { ...prev, humanResponseNeeded: true } : prev);
    } catch (e) {
      alert("Failed to escalate to human. Please try again.");
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
      {/* Messages container */}
      <section className="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-0">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {messages?.length === 0 && <WelcomeMessage />}

          {messages?.map((message: Doc<"messages">) => (
            <MessageBubble
              key={message._id}
              content={message.content}
              isUser={message.role === "user"}
              attachments={message.attachments}
            />
          ))}

          {streamedResponse && <MessageBubble content={streamedResponse} />}

          {/* Loading indicator */}
          {isLoading && !streamedResponse && (
            <div className="flex justify-start animate-in fade-in-0">
              <div className="rounded-2xl px-4 py-3 bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
                <div className="flex items-center gap-1.5">
                  {[0.3, 0.15, 0].map((delay, i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `-${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Talk to Human Button */}
          {messages.length > 5 && chat && !chat.humanResponseNeeded && (
            <div className="flex justify-center my-4">
              <Button onClick={handleEscalate} disabled={isEscalating} variant="outline">
                {isEscalating ? "Requesting human..." : "Talk to Human"}
              </Button>
            </div>
          )}
          {/* Escalated message */}
          {chat && chat.humanResponseNeeded && (
            <div className="flex flex-col items-center my-4">
              <div className="text-blue-600 font-semibold mb-2">
                A human will respond to you soon. AI replies are paused.
              </div>
              <Button
                variant="secondary"
                onClick={async () => {
                  setIsEscalating(true);
                  try {
                    const convex = getConvexClient();
                    await convex.mutation(api.chats.markHumanResponseNeeded, { chatId, humanResponseNeeded: false });
                    setChat((prev) => prev ? { ...prev, humanResponseNeeded: false } : prev);
                  } catch (e) {
                    alert("Failed to resume AI. Please try again.");
                  } finally {
                    setIsEscalating(false);
                  }
                }}
                disabled={isEscalating}
              >
                {isEscalating ? "Resuming..." : "Resume AI"}
              </Button>
            </div>
          )}
          {confirmation && (
            <div className="flex justify-center my-2 text-green-600 font-medium">{confirmation}</div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Input form */}
      <footer className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          {/* File upload area */}
          <div
            className={`mb-3 p-4 border-2 border-dashed rounded-lg transition-colors ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-center">
              <Image className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">
                {isUploading ? (
                  "Uploading images..."
                ) : (
                  <>
                    Drag and drop images here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-500 hover:text-blue-600 underline"
                      disabled={isUploading}
                    >
                      browse
                    </button>
                  </>
                )}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="relative inline-block border rounded-lg overflow-hidden"
                >
                  <img
                    src={attachment.url}
                    alt={attachment.filename}
                    className="h-16 w-16 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about products, comparisons, or recommendations..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${
                (input.trim() || attachments.length > 0)
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Sparkles className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
}