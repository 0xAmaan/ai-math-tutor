"use client";

import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowUp, Image as ImageIcon, X, FlaskConical } from "lucide-react";
import { PracticeGeneratorInput } from "./PracticeGeneratorInput";

// Helper function to extract problemContext from Claude's response
const extractProblemContext = (text: string) => {
  try {
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
    const matches = [...text.matchAll(jsonBlockRegex)];

    for (const match of matches) {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);

      if (parsed.problemContext) {
        return parsed.problemContext;
      }
    }

    return null;
  } catch (error) {
    console.error("[STEP TRACKING] Error parsing problemContext:", error);
    return null;
  }
};

interface MessageInputProps {
  conversationId: string;
  onStreamingMessages: (messages: any[]) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export interface MessageInputRef {
  triggerAutoSend: () => void;
}

export const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(
  ({ conversationId, onStreamingMessages, onLoadingChange }, ref) => {
    const [input, setInput] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showPracticeGenerator, setShowPracticeGenerator] = useState(false);
    const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // Store current image URL for access in prepareSendMessagesRequest
    const currentImageUrlRef = useRef<string | null>(null);

    const convex = useConvex();
    const addMessage = useMutation(api.messages.add);
    const updateLastActive = useMutation(api.conversations.updateLastActive);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const createPracticeSession = useMutation(api.practice.createSession);

    const recentMessages = useQuery(api.messages.getRecent, {
      conversationId: conversationId as Id<"conversations">,
    });

    // Log recentMessages whenever it changes
    useEffect(() => {
      console.log("[HISTORY DEBUG - Component] recentMessages updated:", {
        count: recentMessages?.length || 0,
        messages:
          recentMessages?.map((msg, idx) => ({
            index: idx,
            role: msg.role,
            contentPreview:
              msg.content.substring(0, 50) +
              (msg.content.length > 50 ? "..." : ""),
          })) || [],
      });
    }, [recentMessages]);

    const {
      sendMessage,
      status,
      messages: chatMessages,
      setMessages,
    } = useChat({
      id: conversationId, // Tie chat session to conversationId
      transport: new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({
          messages,
          id,
          trigger,
          messageId,
        }) => {
          // IMPORTANT: Fetch fresh messages from Convex RIGHT NOW
          // Don't rely on recentMessages from closure as it may be stale
          const freshMessages = await convex.query(api.messages.getRecent, {
            conversationId: conversationId as Id<"conversations">,
          });

          // Get Convex history (previous messages) with practice session data
          const convexHistory =
            freshMessages?.map((msg: any) => {
              let content = msg.content;

              // If message has practice session, append the data
              if (msg.practiceSession) {
                const session = msg.practiceSession;
                const problemsSummary = session.problems
                  .map((p: any, idx: number) => {
                    const answered = p.studentAnswer
                      ? `answered ${p.studentAnswer}`
                      : "not answered";
                    const correct =
                      p.studentAnswer &&
                      p.options.find((o: any) => o.label === p.studentAnswer)
                        ?.isCorrect;
                    return `  Problem ${idx + 1}: ${p.problem} (${answered}${correct !== undefined ? (correct ? " - correct" : " - incorrect") : ""})`;
                  })
                  .join("\n");

                content += `\n\n[Practice Session: ${session.topic}]\nScore: ${session.score}/${session.problems.filter((p: any) => p.studentAnswer).length}\n${problemsSummary}`;
              }

              return {
                role: msg.role,
                content,
              };
            }) || [];

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

          console.log("=".repeat(80));
          console.log("[HISTORY DEBUG] prepareSendMessagesRequest called");
          console.log(
            "[HISTORY DEBUG] Convex history count:",
            convexHistory.length,
          );
          console.log("[HISTORY DEBUG] Convex history details:");
          convexHistory.forEach((msg, idx) => {
            console.log(
              `  [${idx}] ${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}`,
            );
          });
          console.log(
            "[HISTORY DEBUG] Current messages count:",
            currentMessages.length,
          );
          console.log("[HISTORY DEBUG] Current messages details:");
          currentMessages.forEach((msg, idx) => {
            console.log(
              `  [${idx}] ${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}`,
            );
          });
          console.log(
            "[HISTORY DEBUG] Final combined messages count:",
            finalMessages.length,
          );
          console.log("[HISTORY DEBUG] Final combined messages details:");
          finalMessages.forEach((msg, idx) => {
            console.log(
              `  [${idx}] ${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}`,
            );
          });
          console.log("=".repeat(80));

          const requestBody = {
            messages: finalMessages,
            imageUrl: imageUrl || null,
          };

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
          .filter(
            (part: { type: string; text?: string }) => part.type === "text",
          )
          .map((part: { type: string; text?: string }) => part.text)
          .join("");

        if (textContent) {
          // Extract problem context for step tracking
          const problemContext = extractProblemContext(textContent);

          await addMessage({
            conversationId: conversationId as Id<"conversations">,
            role: "assistant",
            content: textContent,
            problemContext: problemContext || undefined,
          });

          if (problemContext) {
            console.log(
              "[STEP TRACKING - MessageInput] Stored problemContext:",
              problemContext,
            );
          }
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

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setImagePreview(preview);
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

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set to false if we're leaving the container itself
      if (e.currentTarget === e.target) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleImageSelect(file);
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

    // Expose triggerAutoSend method via ref for auto-triggering from ChatInterface
    useImperativeHandle(
      ref,
      () => ({
        triggerAutoSend: async () => {
          // Trigger the AI response without needing user input
          // The message is already saved in Convex, we just need to send to AI
          if (
            status === "ready" &&
            recentMessages &&
            recentMessages.length > 0
          ) {
            const lastMessage = recentMessages[recentMessages.length - 1];

            if (lastMessage.role === "user") {
              onLoadingChange?.(true);

              // If the message has an image, fetch it and convert to data URL
              if (lastMessage.imageStorageId) {
                try {
                  // Get the image URL from Convex using the query
                  const imageUrl = await convex.query(api.files.getImageUrl, {
                    storageId: lastMessage.imageStorageId,
                  });

                  if (!imageUrl) {
                    console.error("Failed to get image URL from Convex");
                    onLoadingChange?.(false);
                    return;
                  }

                  // Fetch the image as blob
                  const imageBlob = await fetch(imageUrl).then((r) => r.blob());

                  // Convert blob to data URL
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    currentImageUrlRef.current = dataUrl;

                    // Send message with image
                    sendMessage({
                      text: lastMessage.content,
                    });
                  };
                  reader.onerror = (error) => {
                    console.error("FileReader error:", error);
                    onLoadingChange?.(false);
                  };
                  reader.readAsDataURL(imageBlob);
                  return; // Exit early, the reader callback will send the message
                } catch (error) {
                  console.error("Failed to fetch image for auto-send:", error);
                  onLoadingChange?.(false);
                  // Continue without image if fetch fails
                }
              }

              // Send message without image
              sendMessage({
                text: lastMessage.content,
              });
            } else {
              onLoadingChange?.(false);
            }
          } else {
            onLoadingChange?.(false);
          }
        },
      }),
      [status, recentMessages, sendMessage, onLoadingChange, convex],
    );

    const handleGeneratePractice = async (topic: string, count: number) => {
      try {
        setIsGeneratingPractice(true);

        // Get recent conversation context (last 5 messages)
        const conversationContext =
          recentMessages?.slice(-5).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })) || [];

        // Call API to generate practice problems
        const response = await fetch("/api/practice/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemDescription: topic,
            count,
            conversationContext,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error.error || "Failed to generate practice problems",
          );
        }

        const { problems, difficulty } = await response.json();

        // Create practice session in Convex
        const sessionId = await createPracticeSession({
          conversationId: conversationId as Id<"conversations">,
          topic,
          difficulty,
          problems,
        });

        // Add a message with the practice session
        await addMessage({
          conversationId: conversationId as Id<"conversations">,
          role: "assistant",
          content: `I've generated ${count} practice problems for you on "${topic}". Try solving them below!`,
          practiceSessionId: sessionId,
        });

        // Update conversation last active
        await updateLastActive({
          conversationId: conversationId as Id<"conversations">,
        });

        // Close the generator
        setShowPracticeGenerator(false);
      } catch (error) {
        console.error("Failed to generate practice problems:", error);
        alert("Failed to generate practice problems. Please try again.");
      } finally {
        setIsGeneratingPractice(false);
      }
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if ((!input.trim() && !selectedImage) || status !== "ready") return;

      const userMessage = input.trim() || "Please help me with this problem";
      let imageStorageId: Id<"_storage"> | null = null;
      const currentImage = selectedImage; // Store reference before clearing
      const currentImagePreview = imagePreview; // Store preview before clearing

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
        imageStorageId = await uploadImage(currentImage);
      }

      // Save user message to Convex (in background)
      await addMessage({
        conversationId: conversationId as Id<"conversations">,
        role: "user",
        content: userMessage,
        imageStorageId: imageStorageId || undefined,
      });

      // Set the image URL in ref so prepareSendMessagesRequest can access it
      if (imageStorageId && currentImagePreview) {
        currentImageUrlRef.current = currentImagePreview;
      }

      console.log("[HISTORY DEBUG - Submit] About to call sendMessage()");
      console.log(
        "[HISTORY DEBUG - Submit] recentMessages state at this moment:",
        {
          count: recentMessages?.length || 0,
          messages:
            recentMessages?.map((msg, idx) => ({
              index: idx,
              role: msg.role,
              contentPreview:
                msg.content.substring(0, 50) +
                (msg.content.length > 50 ? "..." : ""),
            })) || [],
        },
      );
      console.log(
        "[HISTORY DEBUG - Submit] Current message being sent:",
        userMessage,
      );

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
        <div className="mx-auto max-w-3xl">
          {/* Practice Generator Input */}
          {showPracticeGenerator && (
            <PracticeGeneratorInput
              onGenerate={handleGeneratePractice}
              onClose={() => setShowPracticeGenerator(false)}
              isGenerating={isGeneratingPractice}
            />
          )}
        </div>
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
          <div
            className={`rounded-2xl bg-zinc-800 p-4 focus-within:ring-2 focus-within:ring-blue-600 transition-all relative ${
              isDragging
                ? "border-2 border-dashed border-blue-500 bg-blue-500/10"
                : ""
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-2xl pointer-events-none z-10">
                <p className="text-blue-400 font-medium text-lg">
                  Drop image here
                </p>
              </div>
            )}

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
              {/* Left side - image upload and practice generator */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status !== "ready"}
                  className="cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload image"
                >
                  <ImageIcon size={20} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setShowPracticeGenerator(!showPracticeGenerator)
                  }
                  disabled={status !== "ready" || isGeneratingPractice}
                  className={`cursor-pointer rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    showPracticeGenerator
                      ? "bg-blue-500 text-white"
                      : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                  title="Generate practice problems"
                >
                  <FlaskConical size={20} />
                </button>
              </div>

              {/* Right side - send button */}
              <button
                type="submit"
                disabled={
                  (!input.trim() && !selectedImage) || status !== "ready"
                }
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
  },
);

MessageInput.displayName = "MessageInput";
