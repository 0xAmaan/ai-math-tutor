import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save or update whiteboard snapshot for a conversation (chat mode)
 * Stores the tldraw JSON document state in whiteboardStates table
 */
export const upsertWhiteboardState = mutation({
  args: {
    conversationId: v.id("conversations"),
    snapshot: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the conversation belongs to this user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Check if a whiteboard state already exists for this conversation
    const existing = await ctx.db
      .query("whiteboardStates")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        snapshot: args.snapshot,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("whiteboardStates", {
        conversationId: args.conversationId,
        snapshot: args.snapshot,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get whiteboard snapshot for a conversation (chat mode)
 */
export const getWhiteboardState = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Verify the conversation belongs to this user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== identity.subject) {
      return null;
    }

    const state = await ctx.db
      .query("whiteboardStates")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    return state?.snapshot || null;
  },
});

/**
 * Save whiteboard snapshot to a specific message (when sending with chat)
 * This attaches the whiteboard state to the message itself
 */
export const saveWhiteboardToMessage = mutation({
  args: {
    messageId: v.id("messages"),
    snapshot: v.string(),
    thumbnailId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify the conversation belongs to this user
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || conversation.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Update the message with whiteboard snapshot
    await ctx.db.patch(args.messageId, {
      whiteboardSnapshot: args.snapshot,
      whiteboardThumbnailId: args.thumbnailId,
    });

    return args.messageId;
  },
});
