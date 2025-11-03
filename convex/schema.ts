import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  conversations: defineTable({
    userId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  }).index("by_user_and_active", ["userId", "lastActiveAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    imageStorageId: v.optional(v.id("_storage")),
  }).index("by_conversation", ["conversationId", "timestamp"]),
});
