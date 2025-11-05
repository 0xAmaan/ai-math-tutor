import { useState, useEffect, useRef, useCallback } from "react";
import { MicVAD, utils } from "@ricky0123/vad-web";

type VADState = "idle" | "listening" | "speaking";

interface UseVADReturn {
  state: VADState;
  isInitialized: boolean;
  startVAD: () => Promise<void>;
  stopVAD: () => void;
  onSpeechStart: (callback: () => void) => void;
  onSpeechEnd: (callback: (audio: Float32Array) => void) => void;
  error: string | null;
}

/**
 * Voice Activity Detection hook using @ricky0123/vad-web
 * Automatically detects when user starts/stops speaking
 */
export const useVAD = (): UseVADReturn => {
  const [state, setState] = useState<VADState>("idle");
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vadRef = useRef<MicVAD | null>(null);
  const onSpeechStartCallbackRef = useRef<(() => void) | null>(null);
  const onSpeechEndCallbackRef = useRef<((audio: Float32Array) => void) | null>(
    null,
  );

  const startVAD = useCallback(async () => {
    try {
      setError(null);
      console.log("[VAD] Initializing...");

      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately, VAD will create its own stream

      const vad = await MicVAD.new({
        onSpeechStart: () => {
          console.log("[VAD] Speech started");
          setState("speaking");
          onSpeechStartCallbackRef.current?.();
        },
        onSpeechEnd: (audio) => {
          console.log("[VAD] Speech ended", audio.length, "samples");
          setState("listening");
          onSpeechEndCallbackRef.current?.(audio);
        },
        onVADMisfire: () => {
          console.log("[VAD] Misfire (noise detected, not speech)");
          setState("listening");
        },
        positiveSpeechThreshold: 0.8, // Higher = more confident speech detection
        negativeSpeechThreshold: 0.7, // Lower = faster speech end detection
        redemptionFrames: 3, // Wait 3 frames before confirming speech ended
        minSpeechFrames: 5, // Minimum frames for valid speech
        preSpeechPadFrames: 1, // Frames to include before speech start
        // Use local files from public directory
        workletURL: "/_next/static/chunks/vad.worklet.bundle.min.js",
        modelURL: "/_next/static/chunks/silero_vad_v5.onnx",
        ortConfig: (ort) => {
          ort.env.wasm.wasmPaths =
            "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/";
        },
      });

      vadRef.current = vad;
      setState("listening");
      setIsInitialized(true);
      console.log("[VAD] Initialized successfully");

      vad.start();
      console.log("[VAD] Started listening");
    } catch (err) {
      console.error("[VAD] Initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize VAD");
      setState("idle");
    }
  }, []);

  const stopVAD = useCallback(() => {
    if (vadRef.current) {
      console.log("[VAD] Stopping...");
      vadRef.current.destroy();
      vadRef.current = null;
      setState("idle");
      setIsInitialized(false);
    }
  }, []);

  const onSpeechStart = useCallback((callback: () => void) => {
    onSpeechStartCallbackRef.current = callback;
  }, []);

  const onSpeechEnd = useCallback((callback: (audio: Float32Array) => void) => {
    onSpeechEndCallbackRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVAD();
    };
  }, [stopVAD]);

  return {
    state,
    isInitialized,
    startVAD,
    stopVAD,
    onSpeechStart,
    onSpeechEnd,
    error,
  };
};
