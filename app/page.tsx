"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { useState } from "react";

const Home = () => {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  return (
    <div className="flex h-screen bg-zinc-900">
      <SignedOut>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-white">
              AI Math Tutor
            </h1>
            <p className="mb-8 text-zinc-400">
              Your personal AI-powered math tutor
            </p>
            <SignInButton mode="modal">
              <button className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
                Sign In to Get Started
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4 shrink-0">
            <h1 className="text-xl font-semibold text-white">AI Math Tutor</h1>
            <UserButton afterSignOutUrl="/" />
          </header>
          <ChatInterface conversationId={activeConversationId} />
        </div>
      </SignedIn>
    </div>
  );
};

export default Home;
