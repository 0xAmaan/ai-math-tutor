"use client";

import { ConversationSidebar } from "@/components/ConversationSidebar";
import { ChatInterface } from "@/components/ChatInterface";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

const ConversationPage = () => {
  const params = useParams();
  const conversationId = params.id as string;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // Persist to localStorage whenever it changes (only after mount)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isMounted]);

  // Cmd+\ to toggle sidebar
  useKeyboardShortcut(
    { key: "\\", metaKey: true },
    () => setIsSidebarCollapsed((prev) => !prev)
  );

  return (
    <div className="flex h-screen w-screen bg-zinc-900">
      <ConversationSidebar
        activeConversationId={conversationId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <ChatInterface conversationId={conversationId} />
      </div>
    </div>
  );
};

export default ConversationPage;
