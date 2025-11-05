"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useVAD } from "@/lib/useVAD";
import { useStreamingTTS } from "@/lib/useStreamingTTS";
import { convertFloat32ToWav, containsSpeech } from "@/lib/audio-utils";
import { WhiteboardPanel } from "./WhiteboardPanel";
import { ArrowLeft, Mic, Volume2, Loader2, Brain, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceSessionProps {
  conversationId: Id<"conversations">;
  onExit: () => void;
}

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

type SessionState =
  | "initializing"  // Loading VAD
  | "idle"          // VAD ready, waiting for speech
  | "listening"     // User is speaking
  | "transcribing"  // Converting speech to text
  | "thinking"      // AI processing response
  | "speaking";     // AI speaking response

/**
 * Immersive voice tutoring session with VAD and continuous conversation
 */
export const VoiceSession = ({ conversationId, onExit }: VoiceSessionProps) => {
  const [sessionState, setSessionState] = useState<SessionState>("initializing");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [whiteboardBlob, setWhiteboardBlob] = useState<Blob | null>(null);
  const [whiteboardChanged, setWhiteboardChanged] = useState(false);
  const [currentUserText, setCurrentUserText] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Hooks
  const { state: vadState, isInitialized: vadInitialized, startVAD, stopVAD, onSpeechStart, onSpeechEnd, error: vadError } = useVAD();
  const { isSpeaking, speak, stopSpeaking, error: ttsError } = useStreamingTTS();

  // Convex mutations
  const sendMessage = useMutation(api.messages.add);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Get recent messages for context
  const messages = useQuery(api.messages.getRecent, {
    conversationId,
    limit: 15,
  });

  /**
   * Transcribe audio using Whisper API
   */
  const transcribeAudio = useCallback(async (audioData: Float32Array): Promise<string | null> => {
    try {
      console.log("[Voice Session] Transcribing audio...", audioData.length, "samples");

      // Check if audio contains speech
      if (!containsSpeech(audioData, 0.005)) {
        console.log("[Voice Session] Audio too quiet, skipping transcription");
        return null;
      }

      // Convert Float32Array to WAV blob
      const wavBlob = convertFloat32ToWav(audioData, 16000);
      console.log("[Voice Session] Created WAV blob:", wavBlob.size, "bytes");

      // Send to Whisper API
      const formData = new FormData();
      formData.append("audio", wavBlob, "recording.wav");

      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Transcription failed");
      }

      const { text } = await response.json();
      console.log("[Voice Session] Transcribed:", text);

      return text;
    } catch (err) {
      console.error("[Voice Session] Transcription error:", err);
      return null;
    }
  }, []);

  /**
   * Get AI response and speak it
   */
  const processUserMessage = useCallback(async (text: string) => {
    try {
      setSessionState("thinking");
      setCurrentUserText("");

      // Add user message to transcript
      setTranscript((prev) => [
        ...prev,
        { role: "user", text, timestamp: Date.now() },
      ]);

      // Upload whiteboard image if changed
      let imageUrl: string | undefined;
      if (whiteboardBlob && whiteboardChanged) {
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
          console.log("[Voice Session] Uploaded whiteboard image");
          setWhiteboardChanged(false); // Reset flag
        } catch (err) {
          console.error("[Voice Session] Failed to upload whiteboard:", err);
        }
      }

      // Prepare message history
      const messageHistory = messages?.map((m) => ({
        role: m.role,
        content: m.content,
      })) || [];

      // Create abort controller for cancellation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Send message to chat API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messageHistory,
            { role: "user", content: text },
          ],
          imageUrl,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      // Read streaming response
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
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "text-delta" && parsed.delta) {
                  aiResponse += parsed.delta;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      const cleanResponse = aiResponse.trim();

      // Add AI response to transcript
      setTranscript((prev) => [
        ...prev,
        { role: "assistant", text: cleanResponse, timestamp: Date.now() },
      ]);

      // Store messages in Convex
      await sendMessage({
        conversationId,
        role: "user",
        content: text,
      });

      await sendMessage({
        conversationId,
        role: "assistant",
        content: cleanResponse,
      });

      // Speak the AI response
      setSessionState("speaking");
      await speak(cleanResponse);

      // Return to idle after speaking
      setSessionState("idle");
      abortControllerRef.current = null;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[Voice Session] Request aborted by user speech");
        setSessionState("idle");
        return;
      }

      console.error("[Voice Session] Error processing message:", error);
      setSessionState("idle");
      abortControllerRef.current = null;
    }
  }, [whiteboardBlob, whiteboardChanged, messages, conversationId, sendMessage, generateUploadUrl, speak]);

  /**
   * Handle speech detection from VAD
   */
  useEffect(() => {
    onSpeechStart(() => {
      console.log("[Voice Session] User started speaking");

      // Interrupt AI if speaking
      if (isSpeaking) {
        console.log("[Voice Session] Interrupting AI speech");
        stopSpeaking();
      }

      // Abort ongoing AI request
      if (abortControllerRef.current) {
        console.log("[Voice Session] Aborting AI request");
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      setSessionState("listening");
    });

    onSpeechEnd(async (audioData) => {
      console.log("[Voice Session] User stopped speaking");
      setSessionState("transcribing");

      const text = await transcribeAudio(audioData);

      if (text && text.trim().length > 0) {
        setCurrentUserText(text);
        await processUserMessage(text);
      } else {
        console.log("[Voice Session] No valid transcription, returning to idle");
        setSessionState("idle");
      }
    });
  }, [onSpeechStart, onSpeechEnd, isSpeaking, stopSpeaking, transcribeAudio, processUserMessage]);

  /**
   * Initialize VAD on mount
   */
  useEffect(() => {
    const init = async () => {
      await startVAD();
      setSessionState("idle");
    };

    init();

    return () => {
      stopVAD();
      stopSpeaking();
    };
  }, [startVAD, stopVAD, stopSpeaking]);

  /**
   * Load initial transcript from messages
   */
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

  const showError = vadError || ttsError;

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
        {/* Whiteboard (75%) */}
        <div className="flex-[75] p-6">
          <WhiteboardPanel
            conversationId={conversationId}
            onExport={(blob) => {
              setWhiteboardBlob(blob);
              setWhiteboardChanged(true);
            }}
          />
        </div>

        {/* Transcript Sidebar (25%) */}
        <div className="flex-[25] overflow-y-auto border-l border-zinc-800 bg-zinc-900/50 p-4">
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
            {currentUserText && (
              <div className="rounded-lg p-3 text-sm bg-zinc-800">
                <div className="mb-1 text-xs font-medium text-zinc-400">You</div>
                <div className="text-zinc-200">{currentUserText}</div>
              </div>
            )}
            {sessionState === "thinking" && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Brain className="h-4 w-4 animate-pulse" />
                Thinking...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Status Bar */}
      <div className="flex h-20 shrink-0 items-center justify-center gap-6 border-t border-zinc-800 bg-zinc-900/50">
        {/* State Indicator */}
        <div className="flex items-center gap-3">
          {sessionState === "initializing" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <span className="text-sm font-medium text-zinc-300">Initializing...</span>
            </>
          )}
          {sessionState === "idle" && (
            <>
              <Mic className="h-6 w-6 text-green-400" />
              <span className="text-sm font-medium text-zinc-300">Listening for speech...</span>
            </>
          )}
          {sessionState === "listening" && (
            <>
              <Mic className="h-6 w-6 animate-pulse text-red-400" />
              <span className="text-sm font-medium text-zinc-300">You're speaking...</span>
            </>
          )}
          {sessionState === "transcribing" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <span className="text-sm font-medium text-zinc-300">Transcribing...</span>
            </>
          )}
          {sessionState === "thinking" && (
            <>
              <Brain className="h-6 w-6 animate-pulse text-purple-400" />
              <span className="text-sm font-medium text-zinc-300">AI is thinking...</span>
            </>
          )}
          {sessionState === "speaking" && (
            <>
              <Volume2 className="h-6 w-6 animate-pulse text-blue-400" />
              <span className="text-sm font-medium text-zinc-300">AI is speaking...</span>
            </>
          )}
        </div>

        {/* Error Display */}
        {showError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {vadError || ttsError}
          </div>
        )}
      </div>
    </div>
  );
};
