import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    console.log("[OCR DEBUG - Convex] Adding message to database:", {
      conversationId: args.conversationId,
      role: args.role,
      contentLength: args.content.length,
      hasImageStorageId: !!args.imageStorageId,
      imageStorageId: args.imageStorageId || "none",
    });

    const messageId = await ctx.db.insert("messages", {
      ...args,
      timestamp: Date.now(),
    });

    console.log("[OCR DEBUG - Convex] ✅ Message saved with ID:", messageId);

    return messageId;
  },
});

export const getRecent = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 15;

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(limit);

    return allMessages.reverse(); // Return chronological order
  },
});
