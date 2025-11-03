# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Math Tutor is a Socratic method-based tutoring application built with Next.js, using Claude Sonnet 4.5 for conversational AI, Convex for real-time database, and Clerk for authentication.

**Core Philosophy**: Never give direct answers - guide students through problems using questioning and encouragement.

## Development Commands

```bash
# Development (runs both Convex and Next.js in parallel)
bun run dev

# Run Convex backend only
bun run convex-dev

# Run Next.js frontend only
bun run next-dev --turbopack

# Production build (deploys Convex first, then builds Next.js)
bun run build

# Production server
bun run start
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Backend**: Convex (real-time database with queries/mutations)
- **AI**: Anthropic Claude API (Sonnet 4.5) via Vercel AI SDK
- **Auth**: Clerk (integrated with Convex via JWT)
- **Styling**: Tailwind CSS v4 (using `@theme inline` and CSS variables)

### Database Schema

**Conversations Table**:
- `userId` (string): Clerk user ID
- `title` (string): Conversation title
- `createdAt` (number): Creation timestamp
- `lastActiveAt` (number): Last activity timestamp
- Index: `by_user_and_active` on `[userId, lastActiveAt]`

**Messages Table**:
- `conversationId` (id): Foreign key to conversations
- `role` (union): "user" or "assistant"
- `content` (string): Message text
- `timestamp` (number): Message timestamp
- Index: `by_conversation` on `[conversationId, timestamp]`

### Directory Structure

```
app/
├── api/chat/route.ts       # Claude API endpoint (streaming)
├── layout.tsx              # Root layout with Clerk + Convex providers
├── page.tsx                # Main chat interface
└── globals.css             # Tailwind CSS + custom CSS variables

components/
├── providers/
│   └── ConvexClientProvider.tsx  # Convex + Clerk integration
├── ChatInterface.tsx       # Main chat component
├── MessageList.tsx         # Message display with auto-scroll
├── MessageInput.tsx        # User input component
├── ConversationSidebar.tsx # Conversation list
└── NewConversationButton.tsx

convex/
├── schema.ts               # Database schema definition
├── conversations.ts        # Conversation CRUD operations
├── messages.ts             # Message CRUD + getRecent query
└── auth.config.ts          # Clerk JWT configuration

lib/
└── prompts.ts              # System prompt for Socratic tutoring
```

## Key Implementation Details

### Authentication Flow
1. Clerk handles user authentication in the browser
2. `ConvexClientProvider` integrates Clerk's `useAuth` with Convex
3. Convex validates Clerk JWT tokens via `auth.config.ts`
4. All Convex queries/mutations automatically have access to authenticated user

### Message Context Management
- Uses **sliding window**: fetches last 15 messages via `messages.getRecent()`
- Messages are stored in Convex in chronological order
- When calling Claude API, recent messages are passed as context
- No explicit conversation summarization (yet)

### Streaming Response Flow
1. User sends message → stored in Convex
2. Fetch last 15 messages from conversation
3. POST to `/api/chat/route.ts` with message history
4. Claude API streams response using Vercel AI SDK
5. `streamText()` returns `toUIMessageStreamResponse()`
6. Frontend receives stream and displays in real-time
7. Once complete, assistant message stored in Convex

### Styling with Tailwind v4
- Using new `@theme inline` syntax in `globals.css`
- CSS variables defined in `:root` for dark theme
- No `tailwind.config.js` file (v4 uses CSS-based config)
- Uses `@tailwindcss/postcss` plugin

## Environment Variables Required

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=<your-domain>.clerk.accounts.dev

# Convex Database
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...
```

## Common Development Tasks

### Adding a New Convex Query/Mutation
1. Define schema in `convex/schema.ts` if needed
2. Create function in appropriate file (e.g., `convex/messages.ts`)
3. Use `query()` for reads, `mutation()` for writes
4. Import via `convex/_generated/api` in components
5. Use `useQuery()` or `useMutation()` React hooks

### Modifying the System Prompt
- Edit `lib/prompts.ts`
- Changes apply immediately (no restart needed)
- Test thoroughly - prompt changes affect tutoring behavior

### Adding UI Components
- Create in `components/` directory
- Use arrow function syntax: `const Component = () => { ... }`
- Use Tailwind classes for styling
- Prefer client components (`"use client"`) for interactivity

## Important Architectural Decisions

### No Explicit Problem Boundaries
- Free-flowing conversation like Claude Learning Mode
- LLM naturally handles topic shifts
- No tracking of "current problem" vs "next problem"

### No Validation Layer (Yet)
- Currently trusts LLM output and student self-correction
- Future: add symbolic math validation (mathjs/algebrite)
- Future: add code execution sandbox for numerical checks

### Conversation Titles
- Currently set manually or default to "New Conversation"
- Future: auto-generate from first user message

### Rate Limiting
- No per-user rate limiting implemented
- Relies on Clerk's built-in protections
- Add if abuse becomes an issue

## Debugging Tips

### Convex Dashboard
- Run `bun run convex-dev` and visit Convex dashboard
- View real-time data, logs, and function performance
- Use dashboard to inspect database state

### Streaming Issues
- Check browser Network tab for streaming response
- Verify `toUIMessageStreamResponse()` is used (not `toDataStreamResponse()`)
- Ensure `maxDuration = 30` is set in API route

### Authentication Issues
- Verify Clerk environment variables match
- Check `CLERK_JWT_ISSUER_DOMAIN` in both `.env.local` and Convex dashboard
- Inspect Clerk session in browser DevTools

## Testing Recommendations

### Manual Test Cases
1. **Linear equations**: "Help me solve 2x + 5 = 13"
2. **Quadratic equations**: "Solve x² + 5x + 6 = 0"
3. **Word problems**: "A train travels 120 miles in 2 hours. What's its speed?"
4. **Geometry**: "Find the area of a circle with radius 5"
5. **Calculus**: "What's the derivative of x²?"

### Expected Behavior
- ✅ Should ask guiding questions, not give answers
- ✅ Should break problems into steps
- ✅ Should use encouraging language
- ✅ Should maintain context across 15 messages
- ❌ Should NOT directly solve the problem

## Future Enhancements (Not Yet Implemented)

- [ ] Image upload for OCR (Claude vision API)
- [ ] KaTeX rendering for math notation
- [ ] Auto-generate conversation titles
- [ ] Symbolic math validation
- [ ] Conversation summarization for long sessions
- [ ] Export conversations as study notes
- [ ] Mobile-responsive design improvements

