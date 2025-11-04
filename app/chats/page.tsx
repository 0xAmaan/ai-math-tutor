"use client";

import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useState, useEffect } from "react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

const ChatsPage = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  const { user } = useUser();
  const router = useRouter();

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Cmd+. to toggle sidebar
  useKeyboardShortcut(
    { key: ".", metaKey: true },
    () => setIsSidebarCollapsed((prev) => !prev)
  );

  const conversations = useQuery(
    api.conversations.list,
    user?.id ? { userId: user.id } : "skip"
  );

  const handleSelectConversation = (id: string) => {
    router.push(`/chat/${id}`);
  };

  return (
    <div className="flex h-screen bg-zinc-900">
      <ConversationSidebar
        activeConversationId={null}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="mb-6 text-3xl font-semibold text-white text-center">All Chats</h1>

          {conversations?.length === 0 ? (
            <div className="text-center text-zinc-500">
              No conversations yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {conversations?.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => handleSelectConversation(conversation._id)}
                  className="cursor-pointer w-full rounded-lg bg-zinc-800 p-4 text-left transition-colors hover:bg-zinc-700 flex items-center gap-3"
                >
                  <MessageSquare size={20} className="text-zinc-400 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-white">{conversation.title}</div>
                    <div className="text-sm text-zinc-500">
                      {new Date(conversation.lastActiveAt).toLocaleDateString()} at{" "}
                      {new Date(conversation.lastActiveAt).toLocaleTimeString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatsPage;
