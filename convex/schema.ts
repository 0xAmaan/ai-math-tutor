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
    practiceSessionId: v.optional(v.id("practiceSessions")),
  }).index("by_conversation", ["conversationId", "timestamp"]),

  practiceSessions: defineTable({
    userId: v.string(),
    conversationId: v.id("conversations"),
    topic: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    problems: v.array(
      v.object({
        problem: v.string(),
        difficulty: v.union(
          v.literal("easy"),
          v.literal("medium"),
          v.literal("hard"),
        ),
        options: v.array(
          v.object({
            label: v.string(),
            value: v.string(),
            isCorrect: v.boolean(),
          }),
        ),
        explanation: v.string(),
        studentAnswer: v.optional(v.string()),
        attemptedAt: v.optional(v.number()),
      }),
    ),
    totalProblems: v.number(),
    currentProblemIndex: v.number(),
    score: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_conversation", ["conversationId"]),
});
