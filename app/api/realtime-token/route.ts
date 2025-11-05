import { NextResponse } from "next/server";

export const maxDuration = 10;

/**
 * Generate ephemeral token for OpenAI Realtime API
 * This is required for secure browser-based voice sessions
 */
export const POST = async () => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Generate ephemeral client token
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-4o-realtime-preview-2024-12-17",
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[Realtime Token] Failed to generate token:", error);
      return NextResponse.json(
        { error: "Failed to generate realtime token" },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("[Realtime Token] Token generated successfully");
    console.log(
      "[Realtime Token] Token value:",
      data.value ? "present" : "missing",
    );

    return NextResponse.json({
      apiKey: data.value, // Token is directly at data.value
    });
  } catch (error) {
    console.error("[Realtime Token] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate token",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
