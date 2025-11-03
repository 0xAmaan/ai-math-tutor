"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowUp, Image as ImageIcon, X } from "lucide-react";

interface MessageInputProps {
  conversationId: string;
  onStreamingMessages: (messages: any[]) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export const MessageInput = ({
  conversationId,
  onStreamingMessages,
  onLoadingChange,
}: MessageInputProps) => {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const addMessage = useMutation(api.messages.add);
  const updateLastActive = useMutation(api.conversations.updateLastActive);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const recentMessages = useQuery(api.messages.getRecent, {
    conversationId: conversationId as Id<"conversations">,
  });

  const {
    sendMessage,
    status,
    messages: chatMessages,
    setMessages,
  } = useChat({
    id: conversationId, // Tie chat session to conversationId
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, id, trigger, messageId }) => {
        // Get Convex history (previous messages)
        const convexHistory =
          recentMessages?.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })) || [];

        // Extract current message from sendMessage call
        const currentMessages = messages.map((msg: any) => {
          if (msg.parts) {
            const textContent = msg.parts
              .filter((part: any) => part.type === "text")
              .map((part: any) => part.text)
              .join("");
            return { role: msg.role, content: textContent };
          }
          return msg;
        });

        // Combine Convex history with current user message
        const finalMessages = [...convexHistory, ...currentMessages];

        // Get imageUrl from custom data if present
        const imageUrl = messages[messages.length - 1]?.experimental_attachments?.[0]?.url;

        return {
          body: {
            messages: finalMessages,
            imageUrl: imageUrl || null,
          },
        };
      },
    }),
    onFinish: async ({ message }) => {
      // Clear streaming messages BEFORE saving to prevent duplicate display
      onStreamingMessages([]);

      // Save assistant message to Convex after streaming completes
      const textContent = message.parts
        .filter((part: { type: string; text?: string }) => part.type === "text")
        .map((part: { type: string; text?: string }) => part.text)
        .join("");

      if (textContent) {
        await addMessage({
          conversationId: conversationId as Id<"conversations">,
          role: "assistant",
          content: textContent,
        });
      }

      // Clear useChat internal state to prevent old messages from accumulating
      setMessages([]);
    },
  });

  // Clear messages when conversation changes
  useEffect(() => {
    setMessages([]);
    onStreamingMessages([]);
  }, [conversationId, setMessages, onStreamingMessages]);

  // Auto-focus input when conversation changes
  useEffect(() => {
    textInputRef.current?.focus();
  }, [conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textInputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Update streaming messages when chatMessages change
  // Only sync when actually streaming (status is not "ready")
  useEffect(() => {
    if (status === "streaming") {
      onStreamingMessages(chatMessages);
      // Turn off loading when streaming starts
      onLoadingChange?.(false);
    }
  }, [chatMessages, onStreamingMessages, status, onLoadingChange]);

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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || status !== "ready") return;

    const userMessage = input.trim() || "Please help me with this problem";
    let imageStorageId: Id<"_storage"> | null = null;
    const currentImage = selectedImage; // Store reference before clearing
    const currentImagePreview = imagePreview; // Store preview before clearing

    // Set loading state
    onLoadingChange?.(true);

    // Upload image if present
    if (currentImage) {
      imageStorageId = await uploadImage(currentImage);
    }

    setInput("");
    clearImage();

    // Clear streaming messages before sending new message
    onStreamingMessages([]);

    // Save user message to Convex BEFORE sending
    await addMessage({
      conversationId: conversationId as Id<"conversations">,
      role: "user",
      content: userMessage,
      imageStorageId: imageStorageId || undefined,
    });

    // Send to API - prepareSendMessagesRequest will include message history
    sendMessage({
      text: userMessage,
      experimental_attachments: imageStorageId && currentImagePreview ? [{ url: currentImagePreview, contentType: currentImage?.type || "image/jpeg" }] : undefined,
    });

    // Update conversation last active timestamp
    await updateLastActive({
      conversationId: conversationId as Id<"conversations">,
    });
  };

  return (
    <div className="bg-zinc-900 p-6 shrink-0">
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
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
              className="cursor-pointer absolute -top-2 -right-2 bg-red-600 rounded-full p-1 hover:bg-red-700 transition-colors"
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
              ref={textInputRef as any}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type your math question or paste an image..."
              rows={1}
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
              disabled={status !== "ready"}
              className="cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload image"
            >
              <ImageIcon size={20} />
            </button>

            {/* Right side - send button */}
            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || status !== "ready"}
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
