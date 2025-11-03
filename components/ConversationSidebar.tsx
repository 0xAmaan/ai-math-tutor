"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NewConversationButton } from "./NewConversationButton";
import { Id } from "@/convex/_generated/dataModel";

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export const ConversationSidebar = ({
  activeConversationId,
  onSelectConversation,
}: ConversationSidebarProps) => {
  const { user } = useUser();
  const conversations = useQuery(
    api.conversations.list,
    user?.id ? { userId: user.id } : "skip"
  );

  return (
    <div className="flex w-80 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="p-4">
        <NewConversationButton onConversationCreated={onSelectConversation} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations?.length === 0 ? (
          <div className="p-4 text-center text-sm text-zinc-500">
            No conversations yet. Create one to get started!
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations?.map((conversation) => (
              <button
                key={conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
                className={`w-full rounded-lg p-3 text-left transition-colors ${
                  activeConversationId === conversation._id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50"
                }`}
              >
                <div className="truncate font-medium">{conversation.title}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {new Date(conversation.lastActiveAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

