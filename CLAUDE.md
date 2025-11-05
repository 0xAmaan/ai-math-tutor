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
- `imageStorageId` (optional): Reference to uploaded image in Convex storage
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
├── files.ts                # Image upload and storage
└── auth.config.ts          # Clerk JWT configuration

lib/
└── prompts.ts              # System prompt for Socratic tutoring (v2 with phases)

docs/
└── problem-testing.md      # Manual testing framework with 9 test cases
```

## Key Implementation Details

### Authentication Flow
1. Clerk handles user authentication in the browser
2. `ConvexClientProvider` integrates Clerk's `useAuth` with Convex
3. Convex validates Clerk JWT tokens via `auth.config.ts`
4. All Convex queries/mutations automatically have access to authenticated user

### Image Upload (File Picker, Paste, Drag & Drop)
**Supported Methods:**
- **File Picker**: Click image icon to select from file system
- **Paste**: Paste image from clipboard directly into textarea
- **Drag & Drop**: Drag image file over input area and drop (NEW in Phase 1)

**Upload Flow:**
1. User selects/pastes/drops image → preview shown
2. Image validated (must be image/* MIME type)
3. On send: image uploaded to Convex Storage via `generateUploadUrl()` mutation
4. Storage ID saved in message's `imageStorageId` field
5. Image sent to Claude Vision API as multimodal message (data URL)
6. Claude processes both text and image content

**Visual Feedback:**
- Drag & drop: Dashed blue border + "Drop image here" overlay
- Preview: Thumbnail with X button to remove
- Auto-focus returns to textarea after image selection

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
- **Current version (v2)**: Includes four-phase structure (Understanding → Planning → Execution → Verification)
- See `docs/problem-testing.md` for comprehensive test cases

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

**See `docs/problem-testing.md` for complete testing framework.**

### Test Categories (9 total test cases)
1. **Simple Arithmetic** (addition, division)
2. **Linear Equations** (two-step, with negatives)
3. **Quadratic Equations** (factoring)
4. **Geometry** (circle area)
5. **Word Problems** (speed, multi-step)
6. **Multi-Step Problems** (distribution and solving)

### Expected Behavior
- ✅ Should ask guiding questions, not give answers
- ✅ Should break problems into four phases (Understanding, Planning, Execution, Verification)
- ✅ Should use encouraging language and celebrate progress
- ✅ Should maintain context across 15 messages
- ✅ Should guide students to find errors themselves (not point them out)
- ✅ Should track and communicate step progress
- ❌ Should NOT directly solve the problem under any circumstances

### Running Tests
1. Open `docs/problem-testing.md`
2. For each test case, start a new conversation
3. Submit the exact test input
4. Evaluate response against validation criteria
5. Document results in the "Test Results Log" section

## Phase 1 Enhancements (Completed)

- ✅ **Drag & drop image upload** - Visual feedback with dashed border and overlay
- ✅ **Enhanced system prompt v2** - Four-phase structure (Understanding → Planning → Execution → Verification)
- ✅ **Comprehensive testing framework** - 9 test cases with validation criteria in `docs/problem-testing.md`
- ✅ **Image upload** - File picker, paste, and drag & drop support with Claude Vision integration

## Future Enhancements (Planned)

### Phase 2: Step Visualization
- [ ] Progress bar showing % complete
- [ ] Collapsible step roadmap
- [ ] Step history/replay section
- [ ] Animated step tracking with Framer Motion

### Phase 3: Interactive Whiteboard
- [ ] Inline whiteboard mode with tldraw
- [ ] Canvas persistence per-conversation
- [ ] Auto-export to Claude Vision when changed

### Phase 4: Practice Problems
- [ ] Practice problem generator
- [ ] Multiple choice interface
- [ ] Instant feedback and explanations
- [ ] Paginated problem sets

### Phase 5: Voice Mode
- [ ] Immersive voice tutoring mode
- [ ] Speech-to-text (OpenAI Whisper)
- [ ] Text-to-speech (OpenAI TTS)
- [ ] Combined voice + whiteboard experience

### Other Future Enhancements
- [ ] KaTeX rendering for math notation
- [ ] Auto-generate conversation titles
- [ ] Symbolic math validation (mathjs/algebrite)
- [ ] Conversation summarization for long sessions
- [ ] Export conversations as study notes
- [ ] Mobile-responsive design improvements

