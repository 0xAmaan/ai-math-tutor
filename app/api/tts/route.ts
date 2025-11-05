import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30;

/**
 * Text-to-Speech endpoint using OpenAI TTS
 */
export const POST = async (req: NextRequest) => {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log(`[TTS] Generating speech for text (${text.length} chars)`);

    const response = await openai.audio.speech.create({
      model: "tts-1", // Real-time optimized model
      voice: "alloy", // Neutral, clear voice
      input: text,
      response_format: "mp3",
    });

    console.log("[TTS] Speech generation successful");

    // Stream the audio back to the client
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="speech.mp3"',
      },
    });
  } catch (error) {
    console.error("[TTS] Error during speech generation:", error);
    return NextResponse.json(
      {
        error: "TTS generation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
