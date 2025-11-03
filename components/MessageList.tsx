"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useUser } from "@clerk/nextjs";

interface MessageListProps {
  conversationId: string;
  streamingMessages: any[];
  isLoading?: boolean;
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
  isLoading = false,
}: MessageListProps) => {
  const { user } = useUser();
  const messages = useQuery(api.messages.getRecent, {
    conversationId: conversationId as Id<"conversations">,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get first letter of email for user avatar
  const userInitial = user?.emailAddresses?.[0]?.emailAddress?.charAt(0).toUpperCase() || "U";

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
            className="flex gap-4"
          >
            {message.role === "user" ? (
              <>
                {/* User message - left aligned with blue background, first letter of email inside */}
                <div className="max-w-[80%] rounded-2xl bg-blue-600 px-4 py-3 flex gap-3 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white text-xs font-semibold">
                    {userInitial}
                  </div>
                  <div className="flex-1">
                    {message.imageStorageId && (
                      <MessageImage storageId={message.imageStorageId} />
                    )}
                    <div className="prose prose-invert max-w-none prose-p:my-0 prose-p:leading-normal text-white">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Assistant message - left aligned, no background, no icon */}
                <div className="flex-1">
                  <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.isStreaming && (
                      <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-blue-400" />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
