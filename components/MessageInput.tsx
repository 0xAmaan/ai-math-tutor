"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Send } from "lucide-react";

interface MessageInputProps {
  conversationId: string;
  onStreamingMessages: (messages: any[]) => void;
}

export const MessageInput = ({
  conversationId,
  onStreamingMessages,
}: MessageInputProps) => {
  const [input, setInput] = useState("");
  const addMessage = useMutation(api.messages.add);
  const updateLastActive = useMutation(api.conversations.updateLastActive);

  const recentMessages = useQuery(api.messages.getRecent, {
    conversationId: conversationId as Id<"conversations">,
  });

  const {
    sendMessage,
    status,
    messages: chatMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, id, trigger, messageId }) => {
        // Convert UI messages to model messages and include Convex history
        const convexHistory =
          recentMessages?.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })) || [];

        // Extract content from the current UI messages being sent
        const currentMessages = messages.map((msg: any) => {
          // If it's a UI message with parts, extract text content
          if (msg.parts) {
            const textContent = msg.parts
              .filter((part: any) => part.type === "text")
              .map((part: any) => part.text)
              .join("");
            return { role: msg.role, content: textContent };
          }

          return msg;
        });

        const finalMessages = [...convexHistory, ...currentMessages];

        // Combine Convex history with current messages
        return {
          body: {
            messages: finalMessages,
          },
        };
      },
    }),
    onFinish: async ({ message }) => {
      // Save assistant message to Convex after streaming completes
      const textContent = message.parts
        .filter((part: { type: string; text?: string }) => part.type === "text")
        .map((part: { type: string; text?: string }) => part.text)
        .join("");

      if (textContent) {
        await addMessage({
          conversationId: conversationId as Id<"conversations">,
          role: "assistant",
          content: textContent,
        });
      }

      // Clear streaming messages after saving
      onStreamingMessages([]);
    },
  });

  // Update streaming messages when chatMessages change
  useEffect(() => {
    onStreamingMessages(chatMessages);
  }, [chatMessages, onStreamingMessages]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;

    const userMessage = input.trim();
    setInput("");

    // Save user message to Convex
    await addMessage({
      conversationId: conversationId as Id<"conversations">,
      role: "user",
      content: userMessage,
    });

    // Update conversation last active timestamp
    await updateLastActive({
      conversationId: conversationId as Id<"conversations">,
    });

    // Send to API - prepareSendMessagesRequest will include message history
    sendMessage({
      text: userMessage,
    });
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900 p-4">
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your math question here..."
            disabled={status !== "ready"}
            className="flex-1 rounded-lg bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || status !== "ready"}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            <span className="font-medium">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
