"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { ArrowUp, Image as ImageIcon, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export const HomePageInput = () => {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useUser();
  const router = useRouter();
  const createConversation = useMutation(api.conversations.create);
  const addMessage = useMutation(api.messages.add);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textInputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Handle image selection
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      // Refocus textarea after image is loaded
      textInputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  // Handle paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageSelect(file);
          e.preventDefault();
        }
        break;
      }
    }
  };

  // Clear image selection
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload image to Convex storage
  const uploadImage = async (file: File): Promise<Id<"_storage"> | null> => {
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error("Failed to upload image:", error);
      return null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, but allow Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || !user?.id || isSubmitting) return;

    setIsSubmitting(true);
    const userMessage = input.trim() || "Please help me with this problem";
    const title = userMessage.length > 50 ? userMessage.substring(0, 50) + "..." : userMessage;

    // Parallelize image upload and conversation creation for better performance
    const [imageStorageId, conversationId] = await Promise.all([
      selectedImage ? uploadImage(selectedImage) : Promise.resolve(null),
      createConversation({
        userId: user.id,
        title,
      }),
    ]);

    // Add the first message (needs conversationId from above)
    await addMessage({
      conversationId,
      role: "user",
      content: userMessage,
      imageStorageId: imageStorageId || undefined,
    });

    // Navigate to the conversation page
    router.push(`/chat/${conversationId}`);
  };

  return (
    <div className="w-full max-w-3xl">
      <form onSubmit={handleSubmit}>
        {/* Loading indicator */}
        {isSubmitting && (
          <div className="mb-3 text-zinc-400 text-sm flex items-center gap-2">
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>Creating conversation...</span>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-40 rounded-lg border border-zinc-700"
            />
            <button
              type="button"
              onClick={clearImage}
              className="cursor-pointer absolute -top-2 -right-2 bg-zinc-600 rounded-full p-1 hover:bg-zinc-700 transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Input container with multi-row layout */}
        <div className="rounded-2xl bg-zinc-800 p-4 focus-within:ring-2 focus-within:ring-blue-600">
          {/* Text input row */}
          <div className="mb-3">
            <textarea
              ref={textInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type your math question or paste an image..."
              rows={1}
              autoFocus
              className="w-full bg-transparent text-white placeholder-zinc-500 outline-none text-base resize-none overflow-y-auto"
              style={{ minHeight: "24px", maxHeight: "200px" }}
            />
          </div>

          {/* Icons row */}
          <div className="flex items-center justify-between">
            {/* Left side - image upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload image"
            >
              <ImageIcon size={20} />
            </button>

            {/* Right side - send button */}
            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isSubmitting}
              className="cursor-pointer rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Send"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
