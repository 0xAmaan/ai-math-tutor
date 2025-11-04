import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 30;

export const POST = async (req: Request) => {
  const { messages, imageUrl } = await req.json();

  console.log("=".repeat(80));
  console.log("[HISTORY DEBUG - API] POST /api/chat received");
  console.log(
    "[HISTORY DEBUG - API] Total messages received:",
    messages.length,
  );
  console.log("[HISTORY DEBUG - API] Message history:");
  messages.forEach((msg: any, idx: number) => {
    const contentPreview =
      typeof msg.content === "string"
        ? msg.content.substring(0, 100)
        : "[multimodal content]";
    console.log(
      `  [${idx}] ${msg.role}: ${contentPreview}${typeof msg.content === "string" && msg.content.length > 100 ? "..." : ""}`,
    );
  });
  console.log("[HISTORY DEBUG - API] Has image:", !!imageUrl);
  console.log("=".repeat(80));

  // Transform messages to include image if present
  const processedMessages = messages.map((msg: any) => {
    // If this is the last user message and we have an imageUrl, add the image
    if (
      msg.role === "user" &&
      imageUrl &&
      messages.indexOf(msg) === messages.length - 1
    ) {
      return {
        ...msg,
        content: [
          {
            type: "image" as const,
            image: imageUrl,
          },
          {
            type: "text" as const,
            text: msg.content,
          },
        ],
      };
    }
    return msg;
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages: processedMessages,
  });

  return result.toUIMessageStreamResponse();
};
