"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useUser } from "@clerk/nextjs";
import { PracticeCard } from "./PracticeCard";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);

  // Get first letter of email for user avatar
  const userInitial = user?.emailAddresses?.[0]?.emailAddress?.charAt(0).toUpperCase() || "U";

  // Only auto-scroll when NEW messages are added, not when existing messages update
  useEffect(() => {
    const currentMessageCount = (messages?.length || 0) + streamingMessages.length;

    // Only scroll if message count increased (new message added)
    if (currentMessageCount > previousMessageCountRef.current) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages, streamingMessages]);

  // Deduplicate messages - if we have an optimistic message with same content as a real message, only show real one
  const streamingMessagesProcessed = streamingMessages.map((msg) => {
    // Handle optimistic user messages
    if (msg.isOptimistic) {
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        imageStorageId: msg.imageStorageId,
        isStreaming: false,
        isOptimistic: true,
      };
    }

    // Handle streaming assistant messages
    if (msg.role === "assistant") {
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
        isOptimistic: false,
      };
    }

    return null;
  }).filter(Boolean);

  // Check if we have an optimistic message that matches a real message
  const hasOptimisticMessage = streamingMessagesProcessed.some((msg: any) => msg.isOptimistic);
  const lastRealMessage = messages?.[messages.length - 1];
  const shouldHideLastReal = hasOptimisticMessage &&
    lastRealMessage?.role === "user" &&
    streamingMessagesProcessed.some((msg: any) =>
      msg.isOptimistic && msg.content === lastRealMessage.content
    );

  const allMessages = [
    ...(messages || [])
      .filter((msg, idx) => {
        // Filter out the last real message if we have a matching optimistic one
        if (shouldHideLastReal && idx === messages.length - 1) {
          return false;
        }
        return true;
      })
      .map((msg) => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        imageStorageId: msg.imageStorageId,
        practiceSessionId: msg.practiceSessionId,
        isStreaming: false,
        isOptimistic: false,
      })),
    ...streamingMessagesProcessed,
  ];

  if (allMessages.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
        <div className="text-center text-zinc-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto bg-zinc-900 p-6">
      <div className="mx-auto max-w-3xl">
        {allMessages.map((message, index) => {

          // Determine spacing: user messages get small bottom margin, assistant messages get larger
          const nextMessage = allMessages[index + 1];
          const isLastMessage = index === allMessages.length - 1;
          let marginBottom = 'mb-5'; // Default small margin for user messages (20px)

          if (message.role === 'assistant') {
            marginBottom = 'mb-8'; // Larger margin after assistant responses (32px)
          }

          if (isLastMessage) {
            marginBottom = ''; // No margin on last message
          }

          return (
            <div
              key={message.id}
              className={`flex gap-4 ${marginBottom}`}
            >
              {message.role === "user" ? (
              <>
                {/* User message - full width with sidebar background, first letter of email inside */}
                <div className={`w-full rounded-lg bg-zinc-950 px-4 py-3 flex gap-3 items-start ${(message as any).isOptimistic ? 'opacity-70' : ''}`}>
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
                  {/* Check if this is a practice session message */}
                  {(message as any).practiceSessionId ? (
                    <PracticeCard sessionId={(message as any).practiceSessionId} />
                  ) : (
                    <div className="prose prose-invert max-w-none prose-p:my-2" style={{ lineHeight: '1.8' }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-4 mt-8">
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
