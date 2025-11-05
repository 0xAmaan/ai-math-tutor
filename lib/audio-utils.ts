/**
 * Convert Float32Array audio from VAD to WAV blob for Whisper API
 * @param audioData Float32Array from VAD (16kHz sample rate)
 * @returns WAV Blob ready for Whisper transcription
 */
export const convertFloat32ToWav = (
  audioData: Float32Array,
  sampleRate: number = 16000,
): Blob => {
  // WAV file format:
  // - RIFF header
  // - fmt chunk (format info)
  // - data chunk (audio samples)

  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = audioData.length * bytesPerSample;
  const bufferLength = 44 + dataLength; // 44 bytes for WAV header

  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // Helper to write string to buffer
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, "RIFF");
  // File length minus RIFF identifier length and file description length
  view.setUint32(4, 36 + dataLength, true);
  // RIFF type
  writeString(8, "WAVE");
  // Format chunk identifier
  writeString(12, "fmt ");
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // Channel count
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate
  view.setUint32(28, byteRate, true);
  // Block align
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, bitsPerSample, true);
  // Data chunk identifier
  writeString(36, "data");
  // Data chunk length
  view.setUint32(40, dataLength, true);

  // Write audio samples (convert Float32 [-1, 1] to Int16 [-32768, 32767])
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i])); // Clamp to [-1, 1]
    const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff; // Convert to 16-bit
    view.setInt16(offset, int16Sample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
};

/**
 * Calculate RMS (Root Mean Square) volume of audio data
 * @param audioData Float32Array audio samples
 * @returns RMS value (0-1 range typically)
 */
export const calculateRMS = (audioData: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  return Math.sqrt(sum / audioData.length);
};

/**
 * Check if audio data contains speech (basic volume threshold check)
 * @param audioData Float32Array audio samples
 * @param threshold Minimum RMS value to consider as speech (default: 0.01)
 * @returns true if likely contains speech
 */
export const containsSpeech = (
  audioData: Float32Array,
  threshold: number = 0.01,
): boolean => {
  const rms = calculateRMS(audioData);
  return rms > threshold;
};
