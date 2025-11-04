"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NewConversationButton } from "./NewConversationButton";
import { PanelLeft, MessagesSquare, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface ConversationSidebarProps {
  activeConversationId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ConversationSidebar = ({
  activeConversationId,
  isCollapsed,
  onToggleCollapse,
}: ConversationSidebarProps) => {
  const { user } = useUser();
  const router = useRouter();
  const conversations = useQuery(
    api.conversations.list,
    user?.id ? { userId: user.id } : "skip"
  );

  // Get last 10 conversations for Recents section
  const recentConversations = conversations?.slice(0, 10) || [];

  const handleNavigateHome = () => {
    router.push("/");
  };

  const handleNavigateChats = () => {
    router.push("/chats");
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/chat/${id}`);
  };

  return (
    <div
      className={`flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-80"
      }`}
    >
      {/* Header with collapse button and title */}
      <div className="flex items-center py-3 mb-4 shrink-0" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
        <button
          onClick={onToggleCollapse}
          className="cursor-pointer flex items-center justify-center rounded-lg h-10 w-10 text-zinc-400 transition-colors hover:text-white shrink-0"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft size={15} />
        </button>
        {!isCollapsed && (
          <button
            onClick={handleNavigateHome}
            className="cursor-pointer text-lg font-semibold text-white hover:text-zinc-300 transition-colors whitespace-nowrap"
          >
            AI Math Tutor
          </button>
        )}
      </div>

      {/* New conversation button */}
      <div className="px-2 pt-1 shrink-0">
        <NewConversationButton isCollapsed={isCollapsed} />
      </div>

      {/* Chats button */}
      <div className="px-2 pt-1 mb-6 shrink-0">
        <button
          onClick={handleNavigateChats}
          className={`cursor-pointer flex items-center rounded-lg h-10 px-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white ${isCollapsed ? '' : 'w-full'}`}
          title={isCollapsed ? "Chats" : undefined}
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <MessagesSquare size={15} />
          </div>
          {!isCollapsed && (
            <span className="font-medium text-sm whitespace-nowrap ml-3">
              Chats
            </span>
          )}
        </button>
      </div>

      {/* Conversations list - only show when expanded */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {recentConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">
              No conversations yet. Create one to get started!
            </div>
          ) : (
            <>
              {/* Recents section header */}
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Recents
              </div>

              <div className="space-y-1 px-2 pb-2">
                {recentConversations.map((conversation) => (
                  <button
                    key={conversation._id}
                    onClick={() => handleSelectConversation(conversation._id)}
                    className={`cursor-pointer w-full rounded-lg transition-colors p-3 text-left ${
                      activeConversationId === conversation._id
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="truncate font-medium text-sm">{conversation.title}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Spacer when collapsed to push user button to bottom */}
      {isCollapsed && <div className="flex-1" />}

      {/* User button at bottom */}
      <div className="px-2 py-3 shrink-0">
        <div className={`flex items-center rounded-lg h-10 px-3 transition-colors hover:bg-zinc-800 ${isCollapsed ? '' : 'w-full'}`}>
          <div className="flex h-6 w-6 items-center justify-center shrink-0">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "cursor-pointer"
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

