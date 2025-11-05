import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    practiceSessionId: v.optional(v.id("practiceSessions")),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      ...args,
      timestamp: Date.now(),
    });

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

    // Enrich messages with practice session data
    const enrichedMessages = await Promise.all(
      allMessages.map(async (msg) => {
        if (msg.practiceSessionId) {
          const session = await ctx.db.get(msg.practiceSessionId);
          return { ...msg, practiceSession: session };
        }
        return msg;
      }),
    );

    return enrichedMessages.reverse(); // Return chronological order
  },
});
