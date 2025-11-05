"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { HomePageInput } from "@/components/HomePageInput";
import { useState, useEffect } from "react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

const Home = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarCollapsed");
      return saved === "true";
    }
    return false;
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Cmd+\ to toggle sidebar
  useKeyboardShortcut({ key: "\\", metaKey: true }, () =>
    setIsSidebarCollapsed((prev) => !prev),
  );

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
              <button className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
                Sign In to Get Started
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <ConversationSidebar
          activeConversationId={null}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-6">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-semibold text-white">
              AI Math Tutor
            </h1>
            <p className="text-zinc-400">Ask me anything about math</p>
          </div>
          <HomePageInput />
        </div>
      </SignedIn>
    </div>
  );
};

export default Home;
