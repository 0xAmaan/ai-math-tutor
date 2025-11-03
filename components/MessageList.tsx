"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface MessageListProps {
  conversationId: string;
  streamingMessages: any[];
}

const MessageImage = ({ storageId }: { storageId: Id<"_storage"> }) => {
  const imageUrl = useQuery(api.files.getImageUrl, { storageId });

  if (!imageUrl) {
    return <div className="h-32 w-32 animate-pulse rounded bg-zinc-700" />;
  }

  return (
    <img
      src={imageUrl}
      alt="Uploaded problem"
      className="mb-2 max-h-64 rounded-lg border border-zinc-700"
    />
  );
};

export const MessageList = ({
  conversationId,
  streamingMessages,
}: MessageListProps) => {
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
      imageStorageId: msg.imageStorageId,
      isStreaming: false,
    })),
    ...streamingMessages
      .filter((msg) => msg.role === "assistant") // Only show streaming assistant messages
      .map((msg) => {
        const textContent =
          msg.parts
            ?.filter((part: any) => part.type === "text")
            .map((part: any) => part.text)
            .join("") || "";
        return {
          id: msg.id,
          role: msg.role,
          content: textContent,
          imageStorageId: undefined,
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
              {message.imageStorageId && (
                <MessageImage storageId={message.imageStorageId} />
              )}
              <div className="prose prose-invert max-w-none prose-p:my-0 prose-p:leading-normal">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {message.content}
                </ReactMarkdown>
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
