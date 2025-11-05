import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createSession = mutation({
  args: {
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
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const sessionId = await ctx.db.insert("practiceSessions", {
      userId: identity.subject,
      conversationId: args.conversationId,
      topic: args.topic,
      difficulty: args.difficulty,
      problems: args.problems.map((p) => ({
        ...p,
        studentAnswer: undefined,
        attemptedAt: undefined,
      })),
      totalProblems: args.problems.length,
      currentProblemIndex: 0,
      score: 0,
      createdAt: Date.now(),
      completedAt: undefined,
    });

    return sessionId;
  },
});

export const getSession = query({
  args: { sessionId: v.id("practiceSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const session = await ctx.db.get(args.sessionId);

    // Verify ownership
    if (session && session.userId !== identity.subject) {
      return null;
    }

    return session;
  },
});

export const updateAnswer = mutation({
  args: {
    sessionId: v.id("practiceSessions"),
    problemIndex: v.number(),
    answer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new Error("Session not found or unauthorized");
    }

    const updatedProblems = [...session.problems];
    const problem = updatedProblems[args.problemIndex];

    if (!problem) {
      throw new Error("Problem index out of bounds");
    }

    // Calculate score change
    let scoreChange = 0;
    const wasCorrect =
      problem.studentAnswer &&
      problem.options.find((o) => o.label === problem.studentAnswer)?.isCorrect;
    const isCorrect =
      args.answer &&
      problem.options.find((o) => o.label === args.answer)?.isCorrect;

    if (wasCorrect && !isCorrect) {
      scoreChange = -1; // Was correct, now wrong
    } else if (!wasCorrect && isCorrect) {
      scoreChange = 1; // Was wrong/unanswered, now correct
    }

    // Update the problem
    updatedProblems[args.problemIndex] = {
      ...problem,
      studentAnswer: args.answer,
      attemptedAt: args.answer ? Date.now() : undefined,
    };

    await ctx.db.patch(args.sessionId, {
      problems: updatedProblems,
      score: session.score + scoreChange,
    });

    return { success: true };
  },
});

export const updateCurrentProblem = mutation({
  args: {
    sessionId: v.id("practiceSessions"),
    index: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new Error("Session not found or unauthorized");
    }

    if (args.index < 0 || args.index >= session.totalProblems) {
      throw new Error("Invalid problem index");
    }

    await ctx.db.patch(args.sessionId, {
      currentProblemIndex: args.index,
    });

    return { success: true };
  },
});

export const completeSession = mutation({
  args: { sessionId: v.id("practiceSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
    });

    return { success: true };
  },
});
