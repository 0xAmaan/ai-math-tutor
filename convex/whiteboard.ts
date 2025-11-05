import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save whiteboard snapshot for a conversation
 */
export const saveSnapshot = mutation({
  args: {
    conversationId: v.id("conversations"),
    snapshot: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the most recent message in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(1);

    if (messages.length > 0) {
      // Update the latest message with the whiteboard snapshot
      await ctx.db.patch(messages[0]._id, {
        whiteboardSnapshot: args.snapshot,
      });
    }

    return { success: true };
  },
});

/**
 * Get the latest whiteboard snapshot for a conversation
 */
export const getSnapshot = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the most recent message with a whiteboard snapshot
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .collect();

    for (const message of messages) {
      if (message.whiteboardSnapshot) {
        return message.whiteboardSnapshot;
      }
    }

    return null;
  },
});
