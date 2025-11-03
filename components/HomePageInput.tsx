"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export const HomePageInput = () => {
  const [input, setInput] = useState("");
  const { user } = useUser();
  const router = useRouter();
  const createConversation = useMutation(api.conversations.create);
  const addMessage = useMutation(api.messages.add);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user?.id) return;

    const userMessage = input.trim();

    // Create new conversation
    const title = userMessage.length > 50 ? userMessage.substring(0, 50) + "..." : userMessage;
    const conversationId = await createConversation({
      userId: user.id,
      title,
    });

    // Add the first message
    await addMessage({
      conversationId,
      role: "user",
      content: userMessage,
    });

    // Navigate to the conversation page
    router.push(`/chat/${conversationId}`);
  };

  return (
    <div className="w-full max-w-3xl">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about math..."
            autoFocus
            className="flex-1 rounded-lg bg-zinc-800 px-6 py-4 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="cursor-pointer flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
