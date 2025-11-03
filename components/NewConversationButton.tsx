"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus } from "lucide-react";

interface NewConversationButtonProps {
  onConversationCreated: (id: string) => void;
}

export const NewConversationButton = ({
  onConversationCreated,
}: NewConversationButtonProps) => {
  const { user } = useUser();
  const createConversation = useMutation(api.conversations.create);

  const handleCreateConversation = async () => {
    if (!user?.id) return;

    const title = `New Conversation - ${new Date().toLocaleDateString()}`;
    const conversationId = await createConversation({
      userId: user.id,
      title,
    });

    onConversationCreated(conversationId);
  };

  return (
    <button
      onClick={handleCreateConversation}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700"
    >
      <Plus size={20} />
      <span className="font-medium">New Conversation</span>
    </button>
  );
};

