import { useState, useRef, useCallback } from "react";

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
}

/**
 * Hook for recording voice using browser MediaRecorder API
 * Records in webm format and transcribes using OpenAI Whisper
 */
export const useVoiceRecording = (): UseVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to use the most compatible audio format for Whisper
      // Prefer webm with opus codec, then mp4, then fallback to default
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      }

      console.log(`[Voice Recording] Using MIME type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      // Collect audio data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("[Voice Recording] MediaRecorder error:", event);
        setError("Recording error occurred");
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      // Start recording with timeslice to ensure continuous recording
      // The timeslice (1000ms) ensures data is available in chunks but doesn't stop recording
      mediaRecorder.start(1000);
      setIsRecording(true);

      console.log("[Voice Recording] Started recording with timeslice");
    } catch (err) {
      console.error("[Voice Recording] Failed to start recording:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to access microphone");
      }
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        console.warn(
          `[Voice Recording] No active recording to stop. State: ${mediaRecorder?.state || "no recorder"}`,
        );
        resolve(null);
        return;
      }

      console.log(
        `[Voice Recording] Stopping recording (state: ${mediaRecorder.state})`,
      );

      mediaRecorder.onstop = async () => {
        console.log(
          `[Voice Recording] Stopped. Processing ${chunksRef.current.length} chunks`,
        );

        // Create audio blob from chunks
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        chunksRef.current = [];

        // Stop all tracks to release microphone
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach((track) => track.stop());

        setIsRecording(false);

        // Send to Whisper API for transcription
        try {
          const formData = new FormData();

          // Ensure proper file extension for Whisper API
          // Remove codec info from MIME type for filename
          const baseType = audioBlob.type.split(";")[0];
          let filename = "recording.webm";

          if (baseType.includes("mp4") || baseType.includes("m4a")) {
            filename = "recording.m4a";
          } else if (baseType.includes("webm")) {
            filename = "recording.webm";
          } else if (baseType.includes("ogg")) {
            filename = "recording.ogg";
          }

          console.log(
            `[Voice Recording] Blob type: ${audioBlob.type}, size: ${audioBlob.size} bytes`,
          );
          console.log(`[Voice Recording] Sending as: ${filename}`);

          formData.append("audio", audioBlob, filename);

          const response = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || "Transcription failed");
          }

          const { text } = await response.json();
          console.log(`[Voice Recording] Transcribed: "${text}"`);
          resolve(text);
        } catch (err) {
          console.error("[Voice Recording] Transcription error:", err);
          setError(
            err instanceof Error ? err.message : "Failed to transcribe audio",
          );
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
  };
};
