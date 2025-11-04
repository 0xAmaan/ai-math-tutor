"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
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

export interface MessageInputRef {
  triggerAutoSend: () => void;
}

export const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(({
  conversationId,
  onStreamingMessages,
  onLoadingChange,
}, ref) => {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Store current image URL for access in prepareSendMessagesRequest
  const currentImageUrlRef = useRef<string | null>(null);

  const convex = useConvex();
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

        // Get imageUrl from ref (set in onSubmit)
        const imageUrl = currentImageUrlRef.current;

        console.log("[OCR DEBUG - Frontend] prepareSendMessagesRequest called:", {
          convexHistoryCount: convexHistory.length,
          currentMessagesCount: currentMessages.length,
          finalMessagesCount: finalMessages.length,
          hasImageUrl: !!imageUrl,
          imageUrlLength: imageUrl?.length || 0,
          imageUrlPrefix: imageUrl ? imageUrl.substring(0, 50) + "..." : "none",
        });

        const requestBody = {
          messages: finalMessages,
          imageUrl: imageUrl || null,
        };

        console.log("[OCR DEBUG - Frontend] Request body being sent to /api/chat:", {
          messagesCount: requestBody.messages.length,
          hasImageUrl: !!requestBody.imageUrl,
          imageUrlType: requestBody.imageUrl ? "base64 DataURL" : "none",
        });

        // Clear the ref after using it
        currentImageUrlRef.current = null;

        return {
          body: requestBody,
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
    currentImageUrlRef.current = null;
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

    console.log("[OCR DEBUG - Frontend] Image selected:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    });

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      setImagePreview(preview);
      console.log("[OCR DEBUG - Frontend] Image preview generated:", {
        previewLength: preview.length,
        previewPrefix: preview.substring(0, 50) + "...",
      });
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
    currentImageUrlRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload image to Convex storage
  const uploadImage = async (file: File): Promise<Id<"_storage"> | null> => {
    try {
      console.log("[OCR DEBUG - Frontend] Requesting upload URL from Convex...");
      const uploadUrl = await generateUploadUrl();
      console.log("[OCR DEBUG - Frontend] Upload URL received:", uploadUrl);

      console.log("[OCR DEBUG - Frontend] Uploading file to Convex storage...");
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();
      console.log("[OCR DEBUG - Frontend] ✅ File uploaded successfully to Convex:", {
        storageId,
        fileType: file.type,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
      });

      return storageId;
    } catch (error) {
      console.error("[OCR DEBUG - Frontend] ❌ Failed to upload image:", error);
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

  // Expose triggerAutoSend method via ref for auto-triggering from ChatInterface
  useImperativeHandle(ref, () => ({
    triggerAutoSend: async () => {
      console.log("[MessageInput] Auto-send triggered from ChatInterface", {
        status,
        hasRecentMessages: !!recentMessages,
        recentMessagesCount: recentMessages?.length || 0,
      });

      // Trigger the AI response without needing user input
      // The message is already saved in Convex, we just need to send to AI
      if (status === "ready" && recentMessages && recentMessages.length > 0) {
        const lastMessage = recentMessages[recentMessages.length - 1];
        console.log("[MessageInput] Last message:", {
          role: lastMessage.role,
          content: lastMessage.content.substring(0, 50),
          hasImage: !!lastMessage.imageStorageId,
        });

        if (lastMessage.role === "user") {
          console.log("[MessageInput] Sending last user message to AI:", lastMessage.content);
          onLoadingChange?.(true);

          // If the message has an image, fetch it and convert to data URL
          if (lastMessage.imageStorageId) {
            try {
              console.log("[MessageInput] Fetching image for auto-send, storageId:", lastMessage.imageStorageId);

              // Get the image URL from Convex using the query
              const imageUrl = await convex.query(api.files.getImageUrl, {
                storageId: lastMessage.imageStorageId,
              });

              if (!imageUrl) {
                console.error("[MessageInput] Failed to get image URL from Convex");
                onLoadingChange?.(false);
                return;
              }

              console.log("[MessageInput] Image URL retrieved from Convex:", imageUrl.substring(0, 50));

              // Fetch the image as blob
              const imageBlob = await fetch(imageUrl).then(r => r.blob());
              console.log("[MessageInput] Image blob fetched, size:", imageBlob.size);

              // Convert blob to data URL
              const reader = new FileReader();
              reader.onloadend = () => {
                const dataUrl = reader.result as string;
                console.log("[MessageInput] Image converted to data URL for auto-send, length:", dataUrl.length);
                currentImageUrlRef.current = dataUrl;

                console.log("[MessageInput] Calling sendMessage with image...");
                // Send message with image
                sendMessage({
                  text: lastMessage.content,
                });
              };
              reader.onerror = (error) => {
                console.error("[MessageInput] FileReader error:", error);
                onLoadingChange?.(false);
              };
              reader.readAsDataURL(imageBlob);
              return; // Exit early, the reader callback will send the message
            } catch (error) {
              console.error("[MessageInput] Failed to fetch image for auto-send:", error);
              onLoadingChange?.(false);
              // Continue without image if fetch fails
            }
          }

          console.log("[MessageInput] Calling sendMessage without image...");
          // Send message without image
          sendMessage({
            text: lastMessage.content,
          });
        } else {
          console.log("[MessageInput] Last message is not from user, skipping auto-send");
          onLoadingChange?.(false);
        }
      } else {
        console.log("[MessageInput] Cannot auto-send - conditions not met");
        onLoadingChange?.(false);
      }
    },
  }), [status, recentMessages, sendMessage, onLoadingChange, convex]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || status !== "ready") return;

    const userMessage = input.trim() || "Please help me with this problem";
    let imageStorageId: Id<"_storage"> | null = null;
    const currentImage = selectedImage; // Store reference before clearing
    const currentImagePreview = imagePreview; // Store preview before clearing

    console.log("[OCR DEBUG - Frontend] Form submitted:", {
      hasText: !!input.trim(),
      hasImage: !!selectedImage,
      messageText: userMessage,
    });

    // Create optimistic message for immediate display
    const optimisticMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user" as const,
      content: userMessage,
      imageStorageId: undefined,
      isOptimistic: true,
    };

    // Clear input immediately for better UX
    setInput("");
    clearImage();

    // Show optimistic message immediately
    onStreamingMessages([optimisticMessage]);

    // Set loading state
    onLoadingChange?.(true);

    // Upload image if present (in background)
    if (currentImage) {
      console.log("[OCR DEBUG - Frontend] Starting image upload...");
      imageStorageId = await uploadImage(currentImage);

      if (imageStorageId) {
        console.log("[OCR DEBUG - Frontend] ✅ Image uploaded, storageId will be saved to Convex");
      } else {
        console.error("[OCR DEBUG - Frontend] ❌ Image upload failed, storageId is null");
      }
    }

    // Save user message to Convex (in background)
    console.log("[OCR DEBUG - Frontend] Saving message to Convex:", {
      conversationId,
      role: "user",
      content: userMessage,
      imageStorageId: imageStorageId || "none",
    });

    await addMessage({
      conversationId: conversationId as Id<"conversations">,
      role: "user",
      content: userMessage,
      imageStorageId: imageStorageId || undefined,
    });

    console.log("[OCR DEBUG - Frontend] ✅ Message saved to Convex");

    // Don't clear optimistic message yet - let it stay until streaming starts
    // This prevents the jarring refresh when real message loads from Convex

    // Set the image URL in ref so prepareSendMessagesRequest can access it
    if (imageStorageId && currentImagePreview) {
      currentImageUrlRef.current = currentImagePreview;
      console.log("[OCR DEBUG - Frontend] ✅ Image URL stored in ref for API request");
    }

    console.log("[OCR DEBUG - Frontend] Sending to chat API:", {
      text: userMessage,
      hasImageInRef: !!currentImageUrlRef.current,
      imageUrlLength: currentImageUrlRef.current?.length || 0,
      imageUrlPrefix: currentImageUrlRef.current?.substring(0, 50) + "..." || "none",
    });

    sendMessage({
      text: userMessage,
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
});

MessageInput.displayName = "MessageInput";
