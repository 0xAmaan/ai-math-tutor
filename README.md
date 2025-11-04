# AI Math Tutor

Socratic method-based math tutoring powered by Claude AI. Never gives direct answers - guides students through problems with questioning and encouragement.

## Features

- **Text & Image Input** - Type problems or upload screenshots with automatic OCR
- **Socratic Dialogue** - AI asks guiding questions instead of giving solutions
- **Math Rendering** - Beautiful LaTeX formatting via KaTeX
- **Conversation History** - Save and resume tutoring sessions
- **Arithmetic Verification** - Validates student calculations while staying encouraging

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Backend**: Convex (real-time database)
- **AI**: Claude Sonnet 4.5 via Anthropic API
- **Auth**: Clerk
- **Styling**: Tailwind CSS v4

## Setup

### Prerequisites
- [Bun](https://bun.sh) installed
- [Clerk](https://clerk.com) account
- [Convex](https://convex.dev) account
- [Anthropic](https://anthropic.com) API key

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local`:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=your-domain.clerk.accounts.dev

# Convex Database
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...
```

**Important**: Add `CLERK_JWT_ISSUER_DOMAIN` to your Convex dashboard environment variables as well.

### Run Development Server

```bash
bun run dev
```

This runs both Convex backend and Next.js frontend in parallel.

Separate commands:
```bash
bun run convex-dev  # Convex only
bun run next-dev    # Next.js only
```

### Build for Production

```bash
bun run build   # Deploys Convex then builds Next.js
bun run start   # Start production server
```

## Example Usage

### Linear Equation
**Student**: "Help me solve 2x + 5 = 13"
**AI**: "What are we trying to find?"
**Student**: "x"
**AI**: "Right! To get x alone, we need to undo the +5 and ×2. Which should we undo first?"

### Quadratic Equation
**Student**: [uploads screenshot of "x² + 5x + 6 = 0"]
**AI**: "I can see the equation x² + 5x + 6 = 0. What methods do you know for solving quadratic equations?"
**Student**: "Factoring?"
**AI**: "Great choice! Can you find two numbers that multiply to 6 and add to 5?"

### Word Problem
**Student**: "A train travels 120 miles in 2 hours. What's its speed?"
**AI**: "Let's break this down. What information do we have?"
**Student**: "120 miles and 2 hours"
**AI**: "Perfect! And what's the relationship between distance, time, and speed?"

### Geometry
**Student**: "Find area of circle with radius 5"
**AI**: "What's the formula for the area of a circle?"
**Student**: "πr²"
**AI**: "Exactly! So what would we substitute for r?"

### Calculus
**Student**: "What's the derivative of x²?"
**AI**: "Do you remember the power rule for derivatives?"
**Student**: "Bring down the exponent?"
**AI**: "Good start! Can you write out the full power rule formula?"

## How It Works

1. **Student submits problem** (text or image)
2. **AI identifies concepts** and asks clarifying questions
3. **Student responds** with their thinking
4. **AI guides next step** without giving answers
5. **Validates arithmetic** while staying encouraging
6. **Repeats until solution** is reached

The AI maintains context of the last 15 messages in each conversation.

## Project Structure

```
app/
├── api/chat/route.ts       # Claude API streaming endpoint
├── chat/[id]/page.tsx      # Individual conversation view
├── chats/page.tsx          # All conversations list
└── page.tsx                # Home page with new chat input

components/
├── ChatInterface.tsx       # Main chat component
├── MessageInput.tsx        # Text input + image upload
├── MessageList.tsx         # Message display with KaTeX
└── ConversationSidebar.tsx # History navigation

convex/
├── schema.ts              # Database schema
├── conversations.ts       # CRUD operations
├── messages.ts            # Message queries/mutations
└── files.ts              # Image storage

lib/
└── prompts.ts            # Socratic tutoring system prompt
```

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift+Enter` - New line
- `Cmd+.` - Toggle sidebar
- `Cmd+V` - Paste image from clipboard

## Architecture Notes

- **Message Context**: Sliding window of last 15 messages per conversation
- **Streaming**: Real-time AI responses using Vercel AI SDK
- **Image Storage**: Files stored in Convex with signed URLs
- **Auth Flow**: Clerk JWT tokens validated by Convex backend

## Pedagogical Approach

The system prompt enforces:
- Never giving direct answers
- Breaking problems into small steps
- Asking guiding questions first
- Providing hints after 2-3 struggles
- Verifying arithmetic rigorously
- Distinguishing method correctness from calculation accuracy

## License

MIT
