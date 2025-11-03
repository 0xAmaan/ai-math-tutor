import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 30;

export const POST = async (req: Request) => {
  const { messages, imageUrl } = await req.json();

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
