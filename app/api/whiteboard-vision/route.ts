import { NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * Analyze whiteboard image using GPT-4o Vision via Chat Completions API
 * This is called by the Realtime API tool to describe what's on the whiteboard
 */
export const POST = async (req: Request) => {
  console.log("[Whiteboard Vision API] Request received");

  try {
    const body = await req.json();
    console.log("[Whiteboard Vision API] Body keys:", Object.keys(body));

    const { imageDataUrl } = body;

    if (!imageDataUrl) {
      console.error("[Whiteboard Vision API] No image data provided");
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 },
      );
    }

    console.log(
      "[Whiteboard Vision API] Image data URL length:",
      imageDataUrl.length,
    );
    console.log(
      "[Whiteboard Vision API] Image data URL preview:",
      imageDataUrl.substring(0, 100),
    );

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("[Whiteboard Vision API] OPENAI_API_KEY not configured");
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 },
      );
    }

    console.log("[Whiteboard Vision API] API key found:", apiKey ? "✓" : "✗");
    console.log("[Whiteboard Vision API] Calling GPT-4o Vision API...");

    // Call Chat Completions API with vision
    const startTime = Date.now();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are a math tutor. Describe what you see on this student's whiteboard. Focus on any math work, equations, diagrams, or calculations. Be specific and concise about what's written.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    const elapsedTime = Date.now() - startTime;
    console.log("[Whiteboard Vision API] Response status:", response.status);
    console.log("[Whiteboard Vision API] Response time:", elapsedTime, "ms");

    if (!response.ok) {
      const error = await response.text();
      console.error("[Whiteboard Vision API] OpenAI API error:", error);
      return NextResponse.json(
        { error: "Failed to analyze image" },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log(
      "[Whiteboard Vision API] OpenAI response:",
      JSON.stringify(data, null, 2),
    );

    const description =
      data.choices[0]?.message?.content ||
      "I couldn't see anything on the whiteboard.";

    console.log("[Whiteboard Vision API] Extracted description:", description);
    console.log(
      "[Whiteboard Vision API] Description length:",
      description.length,
    );
    console.log("[Whiteboard Vision API] Returning success response");

    return NextResponse.json({ description });
  } catch (error) {
    console.error("[Whiteboard Vision API] Unhandled error:", error);
    console.error(
      "[Whiteboard Vision API] Error stack:",
      error instanceof Error ? error.stack : "N/A",
    );
    return NextResponse.json(
      {
        error: "Failed to analyze whiteboard",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
