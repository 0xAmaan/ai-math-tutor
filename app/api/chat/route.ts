import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 30;

export const POST = async (req: Request) => {
  const { messages, imageUrl } = await req.json();

  console.log("[OCR DEBUG - API] POST /api/chat received:", {
    messagesCount: messages.length,
    hasImageUrl: !!imageUrl,
    imageUrlType: imageUrl
      ? imageUrl.startsWith("data:")
        ? "base64 DataURL"
        : "URL string"
      : "none",
    imageUrlLength: imageUrl?.length || 0,
    imageUrlPrefix: imageUrl ? imageUrl.substring(0, 60) + "..." : "none",
  });

  // Log last message to see if it should get the image
  const lastMessage = messages[messages.length - 1];
  console.log("[OCR DEBUG - API] Last message in history:", {
    role: lastMessage?.role,
    contentPreview: lastMessage?.content.substring(0, 100),
    isUserMessage: lastMessage?.role === "user",
    willReceiveImage: lastMessage?.role === "user" && !!imageUrl,
  });

  // Transform messages to include image if present
  const processedMessages = messages.map((msg: any) => {
    // If this is the last user message and we have an imageUrl, add the image
    if (
      msg.role === "user" &&
      imageUrl &&
      messages.indexOf(msg) === messages.length - 1
    ) {
      console.log(
        "[OCR DEBUG - API] ✅ Transforming last user message to include image",
      );
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

  console.log("[OCR DEBUG - API] Processed messages for Claude:", {
    totalMessages: processedMessages.length,
    lastMessageType:
      typeof processedMessages[processedMessages.length - 1]?.content,
    lastMessageIsMultimodal: Array.isArray(
      processedMessages[processedMessages.length - 1]?.content,
    ),
  });

  // Log the structure being sent to Claude
  if (imageUrl) {
    const lastProcessed = processedMessages[processedMessages.length - 1];
    console.log("[OCR DEBUG - API] Last processed message structure:", {
      role: lastProcessed.role,
      contentType: Array.isArray(lastProcessed.content)
        ? "array (multimodal)"
        : "string",
      contentParts: Array.isArray(lastProcessed.content)
        ? lastProcessed.content.length
        : "N/A",
      partTypes: Array.isArray(lastProcessed.content)
        ? lastProcessed.content.map((p: any) => p.type)
        : "N/A",
    });
  }

  console.log("[OCR DEBUG - API] Calling Claude Sonnet 4 with streamText...");

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages: processedMessages,
  });

  console.log(
    "[OCR DEBUG - API] ✅ streamText initiated, returning response stream",
  );

  return result.toUIMessageStreamResponse();
};
