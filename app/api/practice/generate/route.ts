import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const maxDuration = 30;

const PRACTICE_GENERATION_PROMPT = `You are a math practice problem generator. Generate practice problems based on the user's topic description.

CRITICAL REQUIREMENTS:
1. Generate problems with PROGRESSIVE difficulty: first problem should be easy, second medium, third harder
2. Each problem must be SOLVABLE and have ONE correct answer
3. Create 3 plausible wrong answers that represent common mistakes
4. Explanations should teach the concept, not just show steps
5. Use LaTeX math notation wrapped in $ or $$ for all mathematical expressions
6. Vary the numbers and contexts while keeping the same concept

OUTPUT FORMAT (JSON only, no markdown):
{
  "problems": [
    {
      "problem": "Problem statement with $\\\\text{LaTeX math}$ notation",
      "difficulty": "easy",
      "options": [
        { "label": "A", "value": "Answer with $\\\\text{math}$", "isCorrect": false },
        { "label": "B", "value": "Answer with $\\\\text{math}$", "isCorrect": true },
        { "label": "C", "value": "Answer with $\\\\text{math}$", "isCorrect": false },
        { "label": "D", "value": "Answer with $\\\\text{math}$", "isCorrect": false }
      ],
      "explanation": "Clear explanation with $\\\\text{step-by-step}$ reasoning"
    }
  ]
}

Example for "solve 2x + 5 = 13":
{
  "problems": [
    {
      "problem": "Solve for $x$ in the equation $3x + 7 = 19$.",
      "difficulty": "easy",
      "options": [
        { "label": "A", "value": "$x = 3$", "isCorrect": false },
        { "label": "B", "value": "$x = 4$", "isCorrect": true },
        { "label": "C", "value": "$x = 5$", "isCorrect": false },
        { "label": "D", "value": "$x = 26$", "isCorrect": false }
      ],
      "explanation": "To solve $3x + 7 = 19$, subtract 7 from both sides to get $3x = 12$, then divide by 3 to find $x = 4$. We can verify: $3(4) + 7 = 12 + 7 = 19$ ✓"
    }
  ]
}`;

interface ProblemOption {
  label: string;
  value: string;
  isCorrect: boolean;
}

interface GeneratedProblem {
  problem: string;
  difficulty: "easy" | "medium" | "hard";
  options: ProblemOption[];
  explanation: string;
}

interface GenerationResponse {
  problems: GeneratedProblem[];
}

export const POST = async (req: Request) => {
  try {
    const { problemDescription, count, conversationContext } = await req.json();

    if (!problemDescription || !count) {
      return Response.json(
        { error: "Missing required fields: problemDescription, count" },
        { status: 400 },
      );
    }

    if (![3, 5, 10].includes(count)) {
      return Response.json(
        { error: "Count must be 3, 5, or 10" },
        { status: 400 },
      );
    }

    console.log(
      "[PRACTICE GEN] Generating",
      count,
      "problems for:",
      problemDescription,
    );

    // Build context from conversation if provided
    let contextMessage = "";
    if (conversationContext && conversationContext.length > 0) {
      const recentMessages = conversationContext.slice(-5); // Last 5 messages for context
      contextMessage =
        "\n\nRecent conversation context:\n" +
        recentMessages
          .map((msg: any) => `${msg.role}: ${msg.content.substring(0, 200)}`)
          .join("\n");
    }

    const userPrompt = `Generate exactly ${count} practice problems similar to: "${problemDescription}"${contextMessage}

IMPORTANT: Make the problems progressively harder:
- Problem 1: Easy/introductory level
- Problem 2: Medium difficulty
- Problem 3: Challenging/harder

Each problem should:
- Test the same concept but with varied numbers/contexts
- Have realistic wrong answers (common student mistakes)
- Include clear, teaching-focused explanations`;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: PRACTICE_GENERATION_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    console.log("[PRACTICE GEN] Raw response:", result.text);

    // Parse the JSON response
    let parsedResponse: GenerationResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedText = result.text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("[PRACTICE GEN] JSON parse error:", parseError);
      console.error("[PRACTICE GEN] Failed text:", result.text);
      return Response.json(
        { error: "Failed to parse LLM response as JSON" },
        { status: 500 },
      );
    }

    // Validate response structure
    if (!parsedResponse.problems || !Array.isArray(parsedResponse.problems)) {
      return Response.json(
        { error: "Invalid response structure from LLM" },
        { status: 500 },
      );
    }

    if (parsedResponse.problems.length !== count) {
      console.warn(
        `[PRACTICE GEN] Expected ${count} problems, got ${parsedResponse.problems.length}`,
      );
    }

    // Validate each problem has required fields
    for (const problem of parsedResponse.problems) {
      if (
        !problem.problem ||
        !problem.difficulty ||
        !problem.options ||
        !problem.explanation
      ) {
        return Response.json(
          {
            error:
              "Problem missing required fields (problem, difficulty, options, or explanation)",
          },
          { status: 500 },
        );
      }

      if (problem.options.length !== 4) {
        return Response.json(
          { error: "Each problem must have exactly 4 options" },
          { status: 500 },
        );
      }

      const correctCount = problem.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        return Response.json(
          { error: "Each problem must have exactly 1 correct answer" },
          { status: 500 },
        );
      }
    }

    // Auto-determine difficulty based on topic complexity
    let difficulty: "easy" | "medium" | "hard" = "medium";
    const lowerDesc = problemDescription.toLowerCase();

    if (
      lowerDesc.includes("add") ||
      lowerDesc.includes("subtract") ||
      lowerDesc.includes("multiply") ||
      lowerDesc.includes("divide") ||
      lowerDesc.includes("basic")
    ) {
      difficulty = "easy";
    } else if (
      lowerDesc.includes("calculus") ||
      lowerDesc.includes("derivative") ||
      lowerDesc.includes("integral") ||
      lowerDesc.includes("trigonometric") ||
      lowerDesc.includes("logarithm")
    ) {
      difficulty = "hard";
    }

    console.log(
      "[PRACTICE GEN] Success! Generated",
      parsedResponse.problems.length,
      "problems",
    );

    return Response.json({
      problems: parsedResponse.problems,
      difficulty,
    });
  } catch (error) {
    console.error("[PRACTICE GEN] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
