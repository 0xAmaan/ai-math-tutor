"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { RealtimeVoiceMode } from "./RealtimeVoiceMode";
import { Mic } from "lucide-react";

interface ChatInterfaceProps {
  conversationId: string | null;
}

export const ChatInterface = ({ conversationId }: ChatInterfaceProps) => {
  const [streamingMessages, setStreamingMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const hasTriggeredFirstResponseRef = useRef(false);
  const messageInputRef = useRef<{ triggerAutoSend: () => void } | null>(null);


  // Query messages to detect first message scenario
  const messages = useQuery(
    api.messages.getRecent,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );

  // Auto-trigger AI response for new conversations with first user message
  useEffect(() => {
    if (!conversationId || !messages || hasTriggeredFirstResponseRef.current) {
      return;
    }

    // Check if this is a new conversation with exactly 1 user message and no assistant message
    const hasExactlyOneUserMessage = messages.length === 1 && messages[0].role === "user";

    if (hasExactlyOneUserMessage) {
      hasTriggeredFirstResponseRef.current = true;

      // Trigger the auto-send via MessageInput
      if (messageInputRef.current?.triggerAutoSend) {
        messageInputRef.current.triggerAutoSend();
      }
    }
  }, [conversationId, messages]);

  // Reset the ref when conversation changes
  useEffect(() => {
    hasTriggeredFirstResponseRef.current = false;
  }, [conversationId]);

  if (!conversationId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold text-white">
            Welcome to AI Math Tutor
          </h2>
          <p className="text-zinc-400">
            Select a conversation or create a new one to get started
          </p>
        </div>
      </div>
    );
  }

  // Render voice mode if active
  if (isVoiceMode) {
    return (
      <RealtimeVoiceMode
        conversationId={conversationId as Id<"conversations">}
        onExit={() => setIsVoiceMode(false)}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Voice Mode Toggle Button */}
      <div className="flex justify-end border-b border-zinc-800 px-4 py-2">
        <button
          onClick={() => setIsVoiceMode(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Mic className="h-4 w-4" />
          Voice Mode
        </button>
      </div>

      <div className="relative flex-1">
        <MessageList
          conversationId={conversationId}
          streamingMessages={streamingMessages}
          isLoading={isLoading}
        />
      </div>
      <div className="shrink-0">
        <MessageInput
          ref={messageInputRef}
          conversationId={conversationId}
          onStreamingMessages={setStreamingMessages}
          onLoadingChange={setIsLoading}
        />
      </div>
    </div>
  );
};
