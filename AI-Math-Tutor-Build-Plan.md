# AI Math Tutor - Build Plan

## Architecture Overview

**Tech Stack:**
- Frontend: Next.js (App Router) + TypeScript + Tailwind
- Database: Convex
- LLM: Claude API (Sonnet 4.5)
- Auth: Clerk
- AI SDK: Vercel AI SDK (streaming)
- Deployment: Vercel

**Key Decisions:**
- ✅ No validation initially (add symbolic validation later)
- ✅ Sliding window context (last 10-15 messages)
- ✅ Streaming text responses
- ✅ Multi-problem sessions (free-flowing like Claude Learning Mode)
- ✅ No complex problem tracking - just conversations with messages

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Claude API endpoint with streaming
│   ├── page.tsx                   # Main chat interface
│   └── layout.tsx                 # Root layout with Clerk + Convex providers
│
├── components/
│   ├── ChatInterface.tsx          # Main chat component
│   ├── MessageList.tsx            # Scrollable message display
│   ├── MessageInput.tsx           # Text input + send button
│   ├── ConversationSidebar.tsx    # List of conversations
│   └── NewConversationButton.tsx  # Create new conversation
│
├── convex/
│   ├── schema.ts                  # Database schema
│   ├── conversations.ts           # Conversation CRUD
│   └── messages.ts                # Message CRUD + queries
│
└── lib/
    └── prompts.ts                 # System prompt(s)
```

---

## Database Schema

### `convex/schema.ts`

```typescript
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
  }).index("by_conversation", ["conversationId", "timestamp"]),
});
```

**Note:** `lastActiveAt` is used to sort conversations by recency in sidebar.

---

## Convex Functions

### `convex/conversations.ts`

```typescript
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
```

### `convex/messages.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      timestamp: Date.now(),
    });
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
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(limit);
    
    return allMessages.reverse(); // Return chronological order
  },
});
```

---

## System Prompt

### `lib/prompts.ts`

```typescript
export const SYSTEM_PROMPT = `You are a patient, encouraging math tutor using the Socratic method to guide students.

CORE RULES:
- NEVER give direct answers or complete solutions
- Ask guiding questions: "What information do we have?", "What are we trying to find?", "What method might help?"
- Break problems into small steps
- If student struggles 2-3 times on the same concept, provide a more concrete hint
- Use encouraging language: "Great thinking!", "You're on the right track!", "Let's try this together..."

APPROACH:
1. When student presents a problem, help them identify what they know and what they're solving for
2. Guide them to choose an appropriate method or strategy  
3. Walk through solution one step at a time with questions
4. Have them verify their own answer

Be conversational and supportive. You're a tutor, not a problem-solver.`;
```

---

## API Route

### `app/api/chat/route.ts`

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toDataStreamResponse();
}
```

---

## Day 1 Build Plan (4-6 hours)

### Phase 1: Setup (30 min)

```bash
npx create-next-app@latest ai-math-tutor --typescript --tailwind --app
cd ai-math-tutor
npm install convex @clerk/nextjs @anthropic-ai/sdk ai
npx convex dev
```

**Environment Setup:**
1. Create Clerk app at clerk.com
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Create Convex project and link

### Phase 2: Database Schema (15 min)
- Create `convex/schema.ts` (see above)
- Create `convex/conversations.ts` (see above)
- Create `convex/messages.ts` (see above)
- Run `npx convex dev` to push schema

### Phase 3: Claude API Route (1 hour)
- Create `lib/prompts.ts` (see above)
- Create `app/api/chat/route.ts` (see above)
- Test with curl or Postman

### Phase 4: Basic UI (2 hours)
Build these components:
1. `app/layout.tsx` - Wrap with ClerkProvider and ConvexProvider
2. `app/page.tsx` - Main layout with sidebar + chat area
3. `components/ChatInterface.tsx` - Message list + input
4. `components/MessageList.tsx` - Display messages with auto-scroll
5. `components/MessageInput.tsx` - Text input + send button
6. `components/ConversationSidebar.tsx` - List conversations
7. `components/NewConversationButton.tsx` - Create conversation button

### Phase 5: Wire Everything Together (1 hour)
1. User creates conversation → Convex insert
2. User sends message → Convex insert → fetch last 15 messages → API call → stream → Convex insert
3. Update `lastActiveAt` on conversation when message sent
4. Sidebar shows conversations sorted by recency

### End of Day 1 Goal

You should be able to:
- ✅ Sign in with Clerk
- ✅ Create new conversation
- ✅ Type a math problem
- ✅ Get streaming Socratic response
- ✅ Continue conversation with context
- ✅ See conversation list in sidebar
- ✅ Switch between conversations

**Test:** Type "Help me solve 2x + 5 = 13" and verify you get guided questions, not direct answers.

---

## Days 2-5 Plan

### Day 2: UI Polish
- Loading states
- Error handling
- Auto-generate conversation titles from first message
- Empty states (no conversations, no messages)
- Mobile-friendly (even if not responsive)

### Day 3: Math Rendering & Testing
- Install and integrate KaTeX for math rendering
- Test with 5+ problem types:
  - Linear equations (2x + 5 = 13)
  - Quadratic equations (x² + 5x + 6 = 0)
  - Word problems
  - Geometry (area, perimeter)
  - Calculus (derivatives, integrals)
- Refine system prompt based on testing

### Day 4: Image Upload (OCR)
- Add image upload UI component
- Integrate Claude vision API for OCR
- Test with screenshots of printed problems
- Handle image + text in same message

### Day 5: Ship It
- Write README with setup instructions
- Document 5+ example problem walkthroughs
- Record 5-minute demo video
- Deploy to Vercel
- Submit project

---

## Future Improvements (Phase 2)

### Validation Layer
- [ ] Integrate `mathjs` or `algebrite` for symbolic algebra validation
- [ ] Add code execution sandbox for numerical verification
- [ ] Prompt Claude to write verification code when needed

### Context Management
- [ ] Implement conversation summarization every N messages
- [ ] Add embeddings for very long sessions (Convex vector search)
- [ ] Smart retrieval: pull relevant context when student gets stuck

### UX Polish
- [ ] Track problem types for analytics
- [ ] Show "problems solved" counter
- [ ] Export conversation as study notes
- [ ] Problem difficulty indicators

---

## Critical Notes

**Context Window:**
- Sliding window fetches last 15 messages
- Most tutoring sessions won't exceed this
- If needed, add summarization in Phase 2

**Validation:**
- No LLM-based validation initially (unreliable for math)
- Add symbolic checker later
- For now, trust student to self-correct

**Problem Boundaries:**
- No explicit tracking needed
- Free-flowing conversation like Claude Learning Mode
- LLM naturally handles topic shifts

**Token Costs:**
- ~2K input + 1K output = 3K tokens per request
- At $3/M input tokens = $0.009 per interaction
- Negligible for demo purposes

---

## Testing Checklist

Before considering Day 1 complete:
- [ ] Can sign in with Clerk
- [ ] Can create new conversation
- [ ] Can send message and get streamed response
- [ ] Response follows Socratic method (no direct answers)
- [ ] Can see previous messages in conversation
- [ ] Can switch between multiple conversations
- [ ] Sidebar updates with most recent conversation on top
- [ ] Context maintained within 15-message window

---

## Questions to Revisit

1. **Rate limiting:** Do you need per-user rate limiting?
2. **Error handling:** What if Claude API is down? Show error or fallback?
3. **Conversation titles:** Auto-generate from first message or let user name?
4. **Mobile:** Truly skip responsive, or make it at least functional?
5. **Problem detection:** Let LLM handle naturally or add heuristics?

---

## Resources

- Vercel AI SDK Docs: https://sdk.vercel.ai/docs
- Convex Docs: https://docs.convex.dev
- Clerk Docs: https://clerk.com/docs
- Anthropic API Docs: https://docs.anthropic.com
- KaTeX Docs: https://katex.org/

---

Ready to build! 🚀
