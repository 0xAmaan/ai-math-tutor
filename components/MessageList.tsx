"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";

interface MessageListProps {
  conversationId: string;
  streamingMessages: any[];
}

export const MessageList = ({ conversationId, streamingMessages }: MessageListProps) => {
  const messages = useQuery(api.messages.getRecent, {
    conversationId: conversationId as Id<"conversations">,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessages]);

  const allMessages = [
    ...(messages || []).map((msg) => ({
      id: msg._id,
      role: msg.role,
      content: msg.content,
      isStreaming: false,
    })),
    ...streamingMessages.map((msg) => {
      const textContent = msg.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("") || "";
      return {
        id: msg.id,
        role: msg.role,
        content: textContent,
        isStreaming: true,
      };
    }),
  ];

  if (allMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-zinc-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {allMessages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                <Bot size={18} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              <div className="whitespace-pre-wrap wrap-break-word">
                {message.content}
                {message.isStreaming && message.role === "assistant" && (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-blue-400" />
                )}
              </div>
            </div>
            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                <User size={18} className="text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

