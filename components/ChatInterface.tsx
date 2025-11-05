"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { StepSidePanel } from "./StepSidePanel";
import { RealtimeVoiceMode } from "./RealtimeVoiceMode";
import { PanelRightOpen, Mic } from "lucide-react";

interface ChatInterfaceProps {
  conversationId: string | null;
}

export const ChatInterface = ({ conversationId }: ChatInterfaceProps) => {
  const [streamingMessages, setStreamingMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const hasTriggeredFirstResponseRef = useRef(false);
  const messageInputRef = useRef<{ triggerAutoSend: () => void } | null>(null);


  // Query messages to detect first message scenario
  const messages = useQuery(
    api.messages.getRecent,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );

  // Get the latest problemContext from messages
  const latestProblemContext = messages
    ?.slice()
    .reverse()
    .find((msg) => msg.role === "assistant" && msg.problemContext)?.problemContext || null;

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

  // Keyboard shortcut for toggling right panel (Cmd+.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '.') {
        e.preventDefault();
        if (latestProblemContext) {
          setIsPanelOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [latestProblemContext]);

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
    <div className="flex h-full w-full flex-col relative">
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

      {/* Add margin-right when panel is open to keep chat centered */}
      <div
        className={`relative flex-1 transition-all duration-300 ${
          isPanelOpen && latestProblemContext ? 'mr-80' : ''
        }`}
      >
        <MessageList
          conversationId={conversationId}
          streamingMessages={streamingMessages}
          isLoading={isLoading}
        />
      </div>
      <div
        className={`shrink-0 transition-all duration-300 ${
          isPanelOpen && latestProblemContext ? 'mr-80' : ''
        }`}
      >
        <MessageInput
          ref={messageInputRef}
          conversationId={conversationId}
          onStreamingMessages={setStreamingMessages}
          onLoadingChange={setIsLoading}
        />
      </div>

      {/* Floating toggle button - shows when panel is closed but problemContext exists */}
      {!isPanelOpen && latestProblemContext && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="fixed right-4 top-4 z-40 p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Show progress tracker"
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>
      )}

      {/* Side Panel for Step Tracking - Always mounted when problemContext exists */}
      {latestProblemContext && (
        <StepSidePanel
          problemContext={latestProblemContext}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
};
