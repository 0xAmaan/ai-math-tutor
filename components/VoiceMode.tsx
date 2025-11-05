"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useVoiceRecording } from "@/lib/useVoiceRecording";
import { useTextToSpeech } from "@/lib/useTextToSpeech";
import { WhiteboardPanel } from "./WhiteboardPanel";
import { ArrowLeft, Mic, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceModeProps {
  conversationId: Id<"conversations">;
  onExit: () => void;
}

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

/**
 * Full-screen immersive voice mode with whiteboard
 */
export const VoiceMode = ({ conversationId, onExit }: VoiceModeProps) => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [whiteboardBlob, setWhiteboardBlob] = useState<Blob | null>(null);

  const { isRecording, startRecording, stopRecording, error: recordingError } =
    useVoiceRecording();
  const { isSpeaking, speak, stopSpeaking, error: ttsError } =
    useTextToSpeech();

  // Convex mutations
  const sendMessage = useMutation(api.messages.add);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Get recent messages for context
  const messages = useQuery(api.messages.getRecent, {
    conversationId,
    limit: 15,
  });

  /**
   * Handle voice input: record → transcribe → send to AI → speak response
   */
  const handleVoiceInput = async () => {
    setIsProcessing(true);

    try {
      // Stop recording and get transcribed text
      const transcribedText = await stopRecording();

      if (!transcribedText) {
        console.warn("[Voice Mode] No text transcribed");
        setIsProcessing(false);
        return;
      }

      // Add user message to transcript
      setTranscript((prev) => [
        ...prev,
        { role: "user", text: transcribedText, timestamp: Date.now() },
      ]);

      // Upload whiteboard image if available
      let imageUrl: string | undefined;
      if (whiteboardBlob) {
        try {
          const uploadUrl = await generateUploadUrl();
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            body: whiteboardBlob,
          });
          const { storageId } = await uploadResponse.json();
          imageUrl = await fetch(
            `/api/convex-storage?storageId=${storageId}`
          ).then((r) => r.text());
          console.log("[Voice Mode] Uploaded whiteboard image");
        } catch (err) {
          console.error("[Voice Mode] Failed to upload whiteboard:", err);
        }
      }

      // Send message to chat API
      const messageHistory = messages?.map((m) => ({
        role: m.role,
        content: m.content,
      })) || [];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messageHistory,
            { role: "user", content: transcribedText },
          ],
          imageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      // Read streaming response and parse data events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6); // Remove "data: " prefix
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                // Extract text delta from streaming events
                if (parsed.type === "text-delta" && parsed.delta) {
                  aiResponse += parsed.delta;
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
                console.debug("[Voice Mode] Skipping non-JSON line:", line);
              }
            }
          }
        }
      }

      // Clean up response
      const cleanResponse = aiResponse.trim();

      // Add AI response to transcript
      setTranscript((prev) => [
        ...prev,
        { role: "assistant", text: cleanResponse, timestamp: Date.now() },
      ]);

      // Store messages in Convex (timestamp is added automatically by the mutation)
      await sendMessage({
        conversationId,
        role: "user",
        content: transcribedText,
      });

      await sendMessage({
        conversationId,
        role: "assistant",
        content: cleanResponse,
      });

      // Speak the AI response
      await speak(cleanResponse);
    } catch (error) {
      console.error("[Voice Mode] Error processing voice input:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Start recording (called on button press)
   */
  const handleStartRecording = async () => {
    if (!isRecording && !isSpeaking && !isProcessing) {
      console.log("[Voice Mode] Starting recording...");
      await startRecording();
    }
  };

  /**
   * Stop recording and process (called on button release)
   */
  const handleStopRecording = async () => {
    if (isRecording) {
      console.log("[Voice Mode] Stopping recording...");
      await handleVoiceInput();
    }
  };

  // Load initial transcript from messages
  useEffect(() => {
    if (messages && transcript.length === 0) {
      const initialTranscript: TranscriptEntry[] = messages.map((m) => ({
        role: m.role,
        text: m.content,
        timestamp: m.timestamp,
      }));
      setTranscript(initialTranscript);
    }
  }, [messages, transcript.length]);

  const canRecord = !isSpeaking && !isProcessing;
  const showError = recordingError || ttsError;

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
        <h2 className="text-lg font-medium">Voice Tutoring Session</h2>
        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Whiteboard (70%) */}
        <div className="flex-[7] p-6">
          <WhiteboardPanel
            conversationId={conversationId}
            onExport={setWhiteboardBlob}
          />
        </div>

        {/* Transcript Sidebar (30%) */}
        <div className="flex-[3] overflow-y-auto border-l border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="mb-4 font-medium text-zinc-200">Transcript</h3>
          <div className="space-y-3">
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg p-3 text-sm",
                  entry.role === "user"
                    ? "bg-zinc-800"
                    : "bg-zinc-800/50 border border-zinc-700"
                )}
              >
                <div className="mb-1 text-xs font-medium text-zinc-400">
                  {entry.role === "user" ? "You" : "AI Tutor"}
                </div>
                <div className="text-zinc-200">{entry.text}</div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="flex h-20 shrink-0 items-center justify-center gap-4 border-t border-zinc-800 bg-zinc-900/50">
        <button
          onMouseDown={handleStartRecording}
          onMouseUp={handleStopRecording}
          onMouseLeave={() => {
            if (isRecording) handleStopRecording();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleStartRecording();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleStopRecording();
          }}
          disabled={!canRecord}
          className={cn(
            "flex items-center gap-2 rounded-lg px-8 py-3 font-medium transition-all",
            isRecording &&
              "animate-pulse bg-red-500 text-white shadow-lg shadow-red-500/50",
            !isRecording &&
              canRecord &&
              "bg-blue-600 text-white hover:bg-blue-700",
            !canRecord &&
              "cursor-not-allowed bg-zinc-700 text-zinc-400 opacity-50"
          )}
        >
          <Mic className="h-5 w-5" />
          {isRecording
            ? "Recording..."
            : isProcessing
              ? "Processing..."
              : "Hold to Talk"}
        </button>

        {isSpeaking && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Volume2 className="h-5 w-5 animate-pulse" />
            Speaking...
          </div>
        )}

        {showError && (
          <div className="absolute bottom-24 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            {recordingError || ttsError}
          </div>
        )}
      </div>
    </div>
  );
};
