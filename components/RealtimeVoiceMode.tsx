"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RealtimeAgent, RealtimeSession, tool } from "@openai/agents/realtime";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { VOICE_SYSTEM_PROMPT } from "@/lib/prompts";
import { WhiteboardPanel } from "./WhiteboardPanel";
import { resizeImageForWebRTC } from "@/lib/whiteboard-utils";
import { ArrowLeft, Mic, Volume2, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Global session manager to prevent React strict mode duplicates
let globalSession: RealtimeSession | null = null;
let globalAgent: RealtimeAgent | null = null;
let isGloballyInitializing = false;
let globalWhiteboardBlobRef: Blob | null = null;

interface RealtimeVoiceModeProps {
  conversationId: Id<"conversations">;
  onExit: () => void;
}

type SessionState =
  | "initializing" // Loading agent
  | "connecting" // Connecting to OpenAI
  | "idle" // Ready, waiting for speech
  | "listening" // User is speaking
  | "thinking" // AI processing
  | "speaking"; // AI speaking

/**
 * Voice mode using OpenAI Realtime API with WebRTC
 * Provides low-latency speech-to-speech interaction with GPT-4o
 */
export const RealtimeVoiceMode = ({
  conversationId,
  onExit,
}: RealtimeVoiceModeProps) => {
  const [sessionState, setSessionState] = useState<SessionState>("initializing");
  const [whiteboardBlob, setWhiteboardBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSentImage, setLastSentImage] = useState<string | null>(null);

  const sessionRef = useRef<RealtimeSession | null>(globalSession);
  const agentRef = useRef<RealtimeAgent | null>(null);
  const whiteboardBlobRef = useRef<Blob | null>(null);

  // Convex mutations
  const sendMessage = useMutation(api.messages.add);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Get recent messages for context
  const messages = useQuery(api.messages.getRecent, {
    conversationId,
    limit: 15,
  });

  /**
   * Initialize Realtime Agent and Session
   */
  useEffect(() => {
    // Check IMMEDIATELY if we should skip
    if (isGloballyInitializing || globalSession) {
      console.log("[Realtime] Already initialized or initializing, skipping...");
      sessionRef.current = globalSession;
      agentRef.current = globalAgent;
      if (globalSession) {
        setSessionState("idle");
      }
      return;
    }

    const initializeAgent = async () => {
      // Double-check before async work
      if (isGloballyInitializing || globalSession) {
        console.log("[Realtime] Race condition caught, skipping...");
        return;
      }

      isGloballyInitializing = true;

      try {
        setSessionState("initializing");
        console.log("[Realtime] Initializing agent...");

        // Define whiteboard tool (injects image into conversation)
        const viewWhiteboardTool = tool({
          name: "view_whiteboard",
          description:
            "View the student's whiteboard drawing to see their work. Use this when you want to see what they've drawn or written.",
          parameters: z.object({}),
          execute: async () => {
            console.log("[Whiteboard Tool] Tool called! Blob exists:", !!globalWhiteboardBlobRef);
            const currentBlob = globalWhiteboardBlobRef;

            if (!currentBlob) {
              console.log("[Whiteboard Tool] No blob available");
              return "The whiteboard is currently empty.";
            }

            try {
              // Resize image to reduce size (max 512x512, JPEG compressed)
              console.log("[Whiteboard Tool] Original blob size:", currentBlob.size, "bytes");
              const resizedBlob = await resizeImageForWebRTC(currentBlob, 512, 512);
              console.log("[Whiteboard Tool] Resized blob size:", resizedBlob.size, "bytes");

              // Convert to base64
              const arrayBuffer = await resizedBlob.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString("base64");
              const dataUrl = `data:image/jpeg;base64,${base64}`;

              console.log("[Whiteboard Tool] Base64 size:", base64.length, "chars");
              console.log("[Whiteboard Tool] Estimated data URL size:", dataUrl.length, "chars");

              // Store for visualization
              setLastSentImage(dataUrl);

              // Step 1: Call vision API to analyze the image
              console.log("[Whiteboard Tool] Step 1: Calling vision API endpoint...");
              console.log("[Whiteboard Tool] Data URL length:", dataUrl.length);

              const visionResponse = await fetch("/api/whiteboard-vision", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ imageDataUrl: dataUrl }),
              });

              console.log("[Whiteboard Tool] Vision API response status:", visionResponse.status);

              if (!visionResponse.ok) {
                const errorText = await visionResponse.text();
                console.error("[Whiteboard Tool] Vision API failed:", errorText);
                return "I had trouble viewing the whiteboard. Please try again.";
              }

              const visionData = await visionResponse.json();
              console.log("[Whiteboard Tool] Vision API response:", visionData);

              const description = visionData.description;
              console.log("[Whiteboard Tool] Step 2: Vision analysis complete");
              console.log("[Whiteboard Tool] Description:", description);

              // Step 2: Inject the description as context into the conversation
              if (!sessionRef.current) {
                console.error("[Whiteboard Tool] No session available!");
                return "Session not available to view whiteboard.";
              }

              console.log("[Whiteboard Tool] Step 3: Injecting vision context into conversation...");
              console.log("[Whiteboard Tool] Session object:", sessionRef.current);

              try {
                // sendMessage expects content to be an array of input items
                sessionRef.current.sendMessage({
                  role: "user",
                  content: [
                    {
                      type: "input_text",
                      text: `[WHITEBOARD CONTENT: ${description}]`,
                    },
                  ],
                });

                console.log("[Whiteboard Tool] Step 4: Context injected successfully!");
                console.log("[Whiteboard Tool] Returning acknowledgment to AI...");

                // Return a brief acknowledgment - the AI now has the whiteboard context
                return "I can see your whiteboard now. Let me analyze what you've written...";
              } catch (injectError) {
                console.error("[Whiteboard Tool] Failed to inject message:", injectError);
                console.error("[Whiteboard Tool] Error details:", JSON.stringify(injectError, null, 2));
                return "I saw the whiteboard but had trouble processing it.";
              }
            } catch (err) {
              console.error("[Whiteboard Tool] Error:", err);
              return "Failed to access whiteboard image.";
            }
          },
        });

        // Create agent with tool
        const agent = new RealtimeAgent({
          name: "Math Tutor",
          instructions: VOICE_SYSTEM_PROMPT,
          voice: "alloy",
          tools: [viewWhiteboardTool],
          turnDetection: {
            type: "server_vad",
          },
        });

        console.log("[Realtime] Agent created with tools:", agent.tools?.map(t => t.name));

        agentRef.current = agent;
        globalAgent = agent;

        // Get ephemeral token from backend
        setSessionState("connecting");
        console.log("[Realtime] Fetching ephemeral token...");

        const tokenResponse = await fetch("/api/realtime-token", {
          method: "POST",
        });

        if (!tokenResponse.ok) {
          throw new Error("Failed to get realtime token");
        }

        const { apiKey } = await tokenResponse.json();
        console.log("[Realtime] Received token:", apiKey ? "✓" : "✗", apiKey?.substring(0, 10) + "...");

        // Create session (automatically uses WebRTC in browser)
        const session = new RealtimeSession(agent);
        sessionRef.current = session;
        globalSession = session; // Store globally to prevent duplicates

        // Set up event listeners
        // Listen for tool calls specifically
        session.on("tool_call" as any, (event: any) => {
          console.log("[Realtime] Tool called:", event);
        });

        // Listen for all events to debug
        (session as any).on("*", (event: any) => {
          // Only log important events to avoid spam
          if (event.type?.includes("tool") || event.type?.includes("function")) {
            console.log("[Realtime] Event:", event.type, event);
          }
        });

        session.on("connected", () => {
          console.log("[Realtime] Session connected");
          setSessionState("idle");
        });

        session.on("disconnected", () => {
          console.log("[Realtime] Session disconnected");
          setSessionState("initializing");
        });

        // Track user speech
        session.on("input_audio_buffer.speech_started", () => {
          console.log("[Realtime] User started speaking");
          setSessionState("listening");
        });

        session.on("input_audio_buffer.speech_stopped", () => {
          console.log("[Realtime] User stopped speaking");
          setSessionState("thinking");
        });

        // Track AI response
        session.on("response.audio.delta", () => {
          if (sessionState !== "speaking") {
            setSessionState("speaking");
          }
        });

        session.on("response.audio.done", () => {
          console.log("[Realtime] AI finished speaking");
          setSessionState("idle");
        });

        // Handle transcriptions for message storage
        session.on("conversation.item.completed", async (event: any) => {
          const item = event.item;

          // Store user messages
          if (item.role === "user" && item.content?.[0]?.transcript) {
            const transcript = item.content[0].transcript;
            await sendMessage({
              conversationId,
              role: "user",
              content: transcript,
            });
          }

          // Store assistant messages
          if (item.role === "assistant" && item.content?.[0]?.transcript) {
            const transcript = item.content[0].transcript;
            await sendMessage({
              conversationId,
              role: "assistant",
              content: transcript,
            });
          }
        });

        // Handle errors
        session.on("error", (event: any) => {
          console.error("[Realtime] Session error:", event);
          console.error("[Realtime] Error details:", JSON.stringify(event, null, 2));
          if (event.error) {
            console.error("[Realtime] Error object:", event.error);
            console.error("[Realtime] Error message:", event.error.message);
            console.error("[Realtime] Error type:", event.error.type);
          }
          setError(event.error?.message || "Session error occurred");
        });

        // Connect to OpenAI
        await session.connect({ apiKey });

        console.log("[Realtime] Agent initialized successfully");

        // Set to idle after connection succeeds
        setSessionState("idle");
        isGloballyInitializing = false;
      } catch (err) {
        console.error("[Realtime] Initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
        setSessionState("initializing");
        isGloballyInitializing = false;
        globalSession = null;
      }
    };

    initializeAgent();

    // Cleanup on unmount - but DON'T close session (let it persist for React strict mode remount)
    return () => {
      console.log("[Realtime] Component unmounting (session persists)...");
      // Only clean up on actual exit, not React strict mode remount
    };
  }, [conversationId, sendMessage, generateUploadUrl]);

  // Cleanup when actually exiting voice mode
  useEffect(() => {
    return () => {
      // This runs when the component is truly removed (not strict mode)
      if (globalSession) {
        console.log("[Realtime] Closing global session on exit...");
        try {
          globalSession.close();
        } catch (err) {
          console.error("[Realtime] Error closing session:", err);
        }
        globalSession = null;
        globalAgent = null;
        globalWhiteboardBlobRef = null;
        isGloballyInitializing = false;
      }
    };
  }, []);

  /**
   * Handle whiteboard updates
   */
  const handleWhiteboardExport = useCallback((blob: Blob | null) => {
    console.log("[RealtimeVoiceMode] handleWhiteboardExport called");
    console.log("[RealtimeVoiceMode] Blob received:", blob ? `${blob.size} bytes` : "null");
    setWhiteboardBlob(blob);
    whiteboardBlobRef.current = blob;
    globalWhiteboardBlobRef = blob; // Update global ref for tool access
    console.log("[RealtimeVoiceMode] Global blob ref updated:", !!globalWhiteboardBlobRef);
    console.log("[RealtimeVoiceMode] Whiteboard blob updated:", blob ? "present" : "empty");
  }, []);

  /**
   * Manual interruption (for future skip button)
   */
  const handleInterrupt = useCallback(() => {
    if (sessionRef.current && sessionState === "speaking") {
      console.log("[Realtime] Manually interrupting AI");
      // The Realtime API handles interruption automatically via VAD
      // This is a placeholder for future manual controls
    }
  }, [sessionState]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-6">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Exit Voice Mode
        </button>

        {/* Status Indicator in Header */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-full px-6 py-2",
            sessionState === "initializing" &&
              "bg-zinc-800/90 border border-zinc-700",
            sessionState === "connecting" &&
              "bg-blue-500/20 border border-blue-500",
            sessionState === "idle" &&
              "bg-green-500/20 border border-green-500",
            sessionState === "listening" &&
              "bg-red-500/20 border border-red-500",
            sessionState === "thinking" &&
              "bg-purple-500/20 border border-purple-500",
            sessionState === "speaking" &&
              "bg-blue-500/20 border border-blue-500"
          )}
        >
          {/* Status Icon */}
          {sessionState === "initializing" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
              <span className="text-sm font-medium text-zinc-300">
                Initializing...
              </span>
            </>
          )}
          {sessionState === "connecting" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
              <span className="text-sm font-medium text-blue-300">
                Connecting...
              </span>
            </>
          )}
          {sessionState === "idle" && (
            <>
              <Mic className="h-4 w-4 text-green-300" />
              <span className="text-sm font-medium text-green-300">
                Listening...
              </span>
            </>
          )}
          {sessionState === "listening" && (
            <>
              <Mic className="h-4 w-4 animate-pulse text-red-300" />
              <span className="text-sm font-medium text-red-300">
                You're speaking
              </span>
            </>
          )}
          {sessionState === "thinking" && (
            <>
              <Brain className="h-4 w-4 animate-pulse text-purple-300" />
              <span className="text-sm font-medium text-purple-300">
                Thinking...
              </span>
            </>
          )}
          {sessionState === "speaking" && (
            <>
              <Volume2 className="h-4 w-4 animate-pulse text-blue-300" />
              <span className="text-sm font-medium text-blue-300">
                Tutor speaking
              </span>
            </>
          )}
        </div>

        <div className="w-32" />
      </div>

      {/* Full-Screen Whiteboard */}
      <div className="relative flex-1">
        <WhiteboardPanel
          conversationId={conversationId}
          onExport={handleWhiteboardExport}
        />

        {/* Error Display */}
        {error && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
            <div className="rounded-lg bg-red-500/20 border border-red-500 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          </div>
        )}

        {/* Debug: Show last sent image */}
        {lastSentImage && (
          <div className="absolute top-8 right-8 z-50 bg-zinc-900/95 border border-zinc-700 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-2">Last image sent to AI:</div>
            <img
              src={lastSentImage}
              alt="Sent to AI"
              className="max-w-[200px] max-h-[200px] rounded border border-zinc-600"
            />
            <button
              onClick={() => setLastSentImage(null)}
              className="mt-2 text-xs text-zinc-500 hover:text-white"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
