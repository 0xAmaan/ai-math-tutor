import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30;

/**
 * Speech-to-Text endpoint using OpenAI Whisper
 */
export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    console.log(
      `[STT] Received audio file: ${audioFile.name}, type: ${audioFile.type}, size: ${audioFile.size} bytes`,
    );

    // Verify file has content
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: "Audio file is empty" },
        { status: 400 },
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "json",
    });

    console.log(`[STT] Transcription successful: "${transcription.text}"`);

    return NextResponse.json({
      text: transcription.text,
    });
  } catch (error) {
    console.error("[STT] Error during transcription:", error);
    return NextResponse.json(
      {
        error: "Transcription failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
