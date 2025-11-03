"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface NewConversationButtonProps {
  isCollapsed?: boolean;
}

export const NewConversationButton = ({
  isCollapsed = false,
}: NewConversationButtonProps) => {
  const { user } = useUser();
  const router = useRouter();
  const createConversation = useMutation(api.conversations.create);

  const handleCreateConversation = async () => {
    if (!user?.id) return;

    const title = `New Conversation - ${new Date().toLocaleDateString()}`;
    const conversationId = await createConversation({
      userId: user.id,
      title,
    });

    // Navigate to the new conversation
    router.push(`/chat/${conversationId}`);
  };

  return (
    <button
      onClick={handleCreateConversation}
      className="cursor-pointer flex items-center rounded-lg h-10 text-white transition-colors hover:bg-zinc-800 w-full"
      aria-label="New chat"
      title={isCollapsed ? "New chat" : undefined}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 transition-colors shrink-0">
        <Plus size={16} />
      </div>
      {!isCollapsed && (
        <span className="font-medium text-sm whitespace-nowrap ml-3">
          New chat
        </span>
      )}
    </button>
  );
};

