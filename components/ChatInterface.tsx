"use client";

import { useState } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface ChatInterfaceProps {
  conversationId: string | null;
}

export const ChatInterface = ({ conversationId }: ChatInterfaceProps) => {
  const [streamingMessages, setStreamingMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1">
        <MessageList
          conversationId={conversationId}
          streamingMessages={streamingMessages}
          isLoading={isLoading}
        />
      </div>
      <div className="shrink-0">
        <MessageInput
          conversationId={conversationId}
          onStreamingMessages={setStreamingMessages}
          onLoadingChange={setIsLoading}
        />
      </div>
    </div>
  );
};

