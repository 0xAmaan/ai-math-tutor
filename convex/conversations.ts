import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: { userId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title,
      createdAt: now,
      lastActiveAt: now,
    });
  },
});

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_user_and_active", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const updateLastActive = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      lastActiveAt: Date.now(),
    });
  },
});
