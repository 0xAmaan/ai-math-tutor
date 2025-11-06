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

    // Image upload
    imageStorageId: v.optional(v.id("_storage")),

    // Practice problems
    practiceSessionId: v.optional(v.id("practiceSessions")),

    // Step tracking
    problemContext: v.optional(
      v.object({
        currentProblem: v.string(),
        currentStep: v.number(),
        totalSteps: v.number(),
        problemType: v.string(),
        stepsCompleted: v.array(v.string()),
        currentEquation: v.optional(v.string()),
        stepRoadmap: v.optional(v.array(v.string())),
      }),
    ),

    // Voice features
    isVoiceMessage: v.optional(v.boolean()),
    audioStorageId: v.optional(v.id("_storage")),

    // Whiteboard features
    whiteboardSnapshot: v.optional(v.string()), // JSON of tldraw document
    whiteboardThumbnailId: v.optional(v.id("_storage")), // PNG preview
  }).index("by_conversation", ["conversationId", "timestamp"]),

  // Practice sessions table
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

  // Whiteboard states for chat mode (persistent per-conversation)
  whiteboardStates: defineTable({
    conversationId: v.id("conversations"),
    snapshot: v.string(), // JSON of tldraw document
    updatedAt: v.number(),
  }).index("by_conversation", ["conversationId"]),
});
