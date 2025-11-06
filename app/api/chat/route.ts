import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 30;

// Helper function to extract problemContext from Claude's response
const extractProblemContext = (text: string) => {
  try {
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
    const matches = [...text.matchAll(jsonBlockRegex)];

    for (const match of matches) {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);

      if (parsed.problemContext) {
        return parsed.problemContext;
      }
    }

    return null;
  } catch (error) {
    console.error("[STEP TRACKING] Error parsing problemContext:", error);
    return null;
  }
};

export const POST = async (req: Request) => {
  const { messages, imageUrl, whiteboardUrl } = await req.json();

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
  console.log("[HISTORY DEBUG - API] Has whiteboard:", !!whiteboardUrl);
  console.log("=".repeat(80));

  // Transform messages to include image and/or whiteboard if present
  const processedMessages = messages.map((msg: any) => {
    // If this is the last user message and we have imageUrl or whiteboardUrl, add them
    if (
      msg.role === "user" &&
      (imageUrl || whiteboardUrl) &&
      messages.indexOf(msg) === messages.length - 1
    ) {
      const content: any[] = [];

      // Add image if present
      if (imageUrl) {
        content.push({
          type: "image" as const,
          image: imageUrl,
        });
      }

      // Add whiteboard if present
      if (whiteboardUrl) {
        content.push({
          type: "image" as const,
          image: whiteboardUrl,
        });
      }

      // Add text content
      content.push({
        type: "text" as const,
        text: msg.content,
      });

      return {
        ...msg,
        content,
      };
    }
    return msg;
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages: processedMessages,
    onFinish: async ({ text }) => {
      const problemContext = extractProblemContext(text);
      if (problemContext) {
        console.log(
          "[STEP TRACKING] Extracted problemContext:",
          problemContext,
        );
      }
    },
  });

  return result.toUIMessageStreamResponse();
};
