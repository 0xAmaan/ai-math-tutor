import { useState, useRef, useCallback } from "react";

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  error: string | null;
}

/**
 * Hook for text-to-speech using OpenAI TTS API
 */
export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const speak = useCallback(async (text: string) => {
    try {
      setError(null);
      setIsSpeaking(true);

      console.log(`[TTS] Generating speech for: "${text.substring(0, 50)}..."`);

      // Call TTS API
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "TTS generation failed");
      }

      // Create audio blob from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        console.log("[TTS] Playback finished");
        setIsSpeaking(false);
        // Clean up URL
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = (event) => {
        console.error("[TTS] Audio playback error:", event);
        setError("Audio playback failed");
        setIsSpeaking(false);
        // Clean up URL
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      await audio.play();
      console.log("[TTS] Playback started");
    } catch (err) {
      console.error("[TTS] Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate speech",
      );
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      console.log("[TTS] Playback stopped");
    }

    // Clean up URL
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  return {
    isSpeaking,
    speak,
    stopSpeaking,
    error,
  };
};
