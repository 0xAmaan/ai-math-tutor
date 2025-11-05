import { useState, useRef, useCallback } from "react";

interface UseStreamingTTSReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  error: string | null;
}

/**
 * Streaming Text-to-Speech hook with immediate playback using AudioContext
 * Starts playing audio as soon as first chunks arrive for lower latency
 */
export const useStreamingTTS = (): UseStreamingTTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopSpeaking = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
      currentSourceRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsSpeaking(false);
    console.log("[Streaming TTS] Stopped");
  }, []);

  const speak = useCallback(
    async (text: string) => {
      try {
        // Stop any existing playback
        stopSpeaking();

        setError(null);
        setIsSpeaking(true);

        console.log(
          `[Streaming TTS] Generating speech for: "${text.substring(0, 50)}..."`,
        );

        // Initialize AudioContext if needed
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const audioContext = audioContextRef.current;

        // Create abort controller for cancellation
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Call TTS API with abort signal
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "TTS generation failed");
        }

        // Get full audio blob (OpenAI TTS returns complete audio, not streaming chunks)
        const audioBlob = await response.blob();

        // Convert blob to array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create source node
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        currentSourceRef.current = source;

        // Handle playback end
        source.onended = () => {
          console.log("[Streaming TTS] Playback finished");
          setIsSpeaking(false);
          currentSourceRef.current = null;
          abortControllerRef.current = null;
        };

        // Start playback
        source.start(0);
        console.log("[Streaming TTS] Playback started");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[Streaming TTS] Request aborted");
          return;
        }

        console.error("[Streaming TTS] Error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate speech",
        );
        setIsSpeaking(false);
        abortControllerRef.current = null;
      }
    },
    [stopSpeaking],
  );

  return {
    isSpeaking,
    speak,
    stopSpeaking,
    error,
  };
};
