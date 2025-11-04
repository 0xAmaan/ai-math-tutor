"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface NewConversationButtonProps {
  isCollapsed?: boolean;
}

export const NewConversationButton = ({
  isCollapsed = false,
}: NewConversationButtonProps) => {
  const router = useRouter();

  const handleNewChat = () => {
    // Navigate to home page for new chat
    router.push("/");
  };

  return (
    <button
      onClick={handleNewChat}
      className={`cursor-pointer flex items-center rounded-lg h-10 px-3 text-white transition-colors hover:bg-zinc-800 ${isCollapsed ? '' : 'w-full'}`}
      aria-label="New chat"
      title={isCollapsed ? "New chat" : undefined}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 transition-colors shrink-0">
        <Plus size={15} />
      </div>
      {!isCollapsed && (
        <span className="font-medium text-sm whitespace-nowrap ml-3">
          New chat
        </span>
      )}
    </button>
  );
};

