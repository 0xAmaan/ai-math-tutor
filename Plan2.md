# AI Math Tutor - Enhancement Plan v2

**Timeline:** Days 1-7 (Nov 4-10, 2025)
**Objective:** Transform MVP into a 10/10 learning platform with visual, interactive, and multimodal features while maintaining Socratic teaching approach.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Feature Specifications](#feature-specifications)
3. [Implementation Phases](#implementation-phases)
4. [Git Worktree Strategy](#git-worktree-strategy)
5. [Database Schema Changes](#database-schema-changes)
6. [Tech Stack Additions](#tech-stack-additions)
7. [Agent Context & Guidelines](#agent-context--guidelines)
8. [Testing & Validation](#testing--validation)
9. [Conflict Resolution Strategy](#conflict-resolution-strategy)
10. [Success Criteria](#success-criteria)

---

## Architecture Overview

### Current State (MVP)
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (using `@theme inline`)
- **AI:** Anthropic Claude Sonnet 4.5 via Vercel AI SDK
- **Backend:** Convex (real-time database)
- **Auth:** Clerk with JWT integration
- **Build:** Bun package manager + Turbopack

### Key Existing Features
✅ Text-based Socratic tutoring
✅ Image upload (file picker + paste) with Claude Vision
✅ KaTeX math rendering
✅ Streaming responses
✅ Conversation management
✅ Real-time optimistic UI updates

### What We're Adding
🔨 Drag & drop image upload
🔨 Interactive whiteboard (inline + immersive modes)
🔨 Practice problem generator with MCQ interface
🔨 Step visualization (roadmap + progress + replay)
🔨 Voice mode (TTS/STT)
🔨 Enhanced system prompt
🔨 Manual testing framework

---

## Feature Specifications

### 1. Drag & Drop Image Upload

**Current State:**
- File picker button works
- Paste from clipboard works
- Images stored in Convex Storage
- Claude Vision integration complete

**What to Add:**
- HTML5 drag & drop events on message input area
- Visual feedback: dashed border + background highlight when dragging over
- Show "Drop image here" text overlay during drag
- Reuse existing upload pipeline (no backend changes)

**UX Flow:**
1. User drags image file over chat input
2. Input area highlights with dashed border (e.g., `border-2 border-dashed border-blue-500`)
3. Shows "Drop image here" text
4. On drop: preview image, upload on send (existing flow)

**Files to Modify:**
- `components/MessageInput.tsx`

**No Schema Changes Required** (reuses `imageStorageId`)

---

### 2. Problem Testing Framework

**Deliverable:** `docs/problem-testing.md`

**Test Categories:**
1. **Simple Arithmetic:** `12 + 8 = ?`, `24 ÷ 6 = ?`
2. **Linear Equations:** `2x + 5 = 13`, `3x - 7 = 20`
3. **Quadratic Equations:** `x² + 5x + 6 = 0`
4. **Geometry:** "Find area of circle with radius 5"
5. **Word Problems:** "Train travels 120 miles in 2 hours, what's the speed?"
6. **Multi-step Problems:** "If 3(x+2) = 18, what is x?"

**Validation Criteria:**
- ✅ Does NOT give direct answers
- ✅ Asks guiding questions ("What information do we have?")
- ✅ Breaks problem into steps
- ✅ Provides hints when stuck (after 2+ turns)
- ✅ Uses encouraging language
- ✅ Validates final answer

**Files to Create:**
- `docs/problem-testing.md` (test scripts + expected behaviors)

---

### 3. System Prompt Revision

**Current Issues:**
- Not always reliable at avoiding direct answers
- Could explain concepts better
- Sometimes skips Socratic questioning

**Improvements:**
1. **Explicit Phase Structure:**
   - Phase 1: Understanding (inventory knowns/unknowns)
   - Phase 2: Planning (identify method/approach)
   - Phase 3: Execution (step-by-step guidance)
   - Phase 4: Verification (check answer)

2. **Stricter "No Direct Answers" Rule:**
   - Never solve the problem yourself
   - If student asks for answer, respond: "Let's work through it together..."
   - Maximum hint: show similar example, not the actual solution

3. **Step Tracking Integration:**
   - Explicitly state current step ("We're on step 2 of 3")
   - Recap progress when student seems lost
   - Celebrate milestones

4. **Better Error Handling:**
   - If student makes mistake, ask them to check their work
   - Guide toward the error without pointing it out directly
   - Use phrases like "Let's verify this step..."

**Files to Modify:**
- `lib/prompts.ts`

---

### 4. Step Visualization System

**Problem to Solve:**
Students lose track of where they are in complex problems and need to see progress.

**Components:**

#### A. Solution Roadmap (Collapsible)
Shows overall structure before diving in:
```
📋 Solution Steps:
  ✅ 1. Isolate the variable term
  🔄 2. Divide both sides by coefficient  ← Currently here
  ⭕ 3. Verify the solution
```

**Display:**
- Appears after first few exchanges (when problem structure is clear)
- Collapsible accordion component
- Updates as student progresses
- Visual: checkmark (done), circle outline (pending), spinner (current)

#### B. Progress Indicator
Visual bar showing completion:
```
[████████░░░░░░] 60% Complete - Step 2 of 3
```

**Display:**
- Always visible at top of chat when working on problem
- Animates with Framer Motion on progress
- Green gradient fill

#### C. Step Replay/History
"So far we've done..." reference section:
```
📝 Progress So Far:
  ✓ Started with: 2x + 5 = 13
  ✓ Subtracted 5: 2x = 8
  → Now solving: 2x = 8
```

**Display:**
- Collapsible section in sidebar or above input
- Shows last 3-5 steps
- Helps students who say "wait, where were we?"

**Technical Implementation:**

1. **LLM Integration:**
   - Update system prompt to include step tracking instructions
   - LLM returns structured data in responses:
   ```json
   {
     "message": "Great! Now that we've...",
     "problemContext": {
       "currentProblem": "2x + 5 = 13",
       "currentStep": 2,
       "totalSteps": 3,
       "problemType": "linear-equation",
       "stepsCompleted": [
         "Subtracted 5 from both sides",
         "Simplified to 2x = 8"
       ]
     }
   }
   ```

2. **Schema Addition:**
   ```typescript
   messages: {
     // ... existing fields
     problemContext: v.optional(v.object({
       currentProblem: v.string(),
       currentStep: v.number(),
       totalSteps: v.number(),
       problemType: v.string(),
       stepsCompleted: v.array(v.string()),
     })),
   }
   ```

3. **Components:**
   - `components/StepTracker.tsx` - Main visualization component
   - `components/ProgressBar.tsx` - Progress indicator
   - `components/StepRoadmap.tsx` - Collapsible step list
   - `components/StepHistory.tsx` - Replay section

**Animation with Framer Motion:**
- Progress bar fills with smooth transition
- Checkmarks animate in when step completes
- Current step pulses/highlights
- Step list items fade in when revealed

**Files to Create:**
- `components/StepTracker.tsx`
- `components/ProgressBar.tsx`
- `components/StepRoadmap.tsx`
- `components/StepHistory.tsx`

**Files to Modify:**
- `components/MessageList.tsx` (render step tracker)
- `components/ChatInterface.tsx` (manage problem state)
- `lib/prompts.ts` (add step tracking instructions)
- `convex/schema.ts` (add problemContext)
- `app/api/chat/route.ts` (parse problemContext from LLM)

---

### 5. Interactive Whiteboard - Inline Mode

**Use Case:**
Student needs to sketch diagram, show work, or visualize problem while chatting.

**UX Flow:**
1. User clicks "Whiteboard" toggle button (in message input toolbar)
2. Canvas panel expands above input area (300-400px height)
3. Student draws/writes on canvas
4. Canvas persists across messages (per-conversation)
5. When sending message, detects if whiteboard changed since last send
6. If changed: exports PNG, sends to Claude Vision API
7. Whiteboard remains visible but doesn't re-send unless changed

**Technical Implementation:**

#### tldraw Integration
```typescript
// components/WhiteboardPanel.tsx
import dynamic from 'next/dynamic'

const Tldraw = dynamic(
  () => import('tldraw').then(mod => mod.Tldraw),
  { ssr: false }
)

export const WhiteboardPanel = ({ conversationId }) => {
  const [editor, setEditor] = useState(null)

  // Load snapshot from Convex on mount
  useEffect(() => {
    if (editor && snapshotFromDB) {
      loadSnapshot(editor.store, JSON.parse(snapshotFromDB))
    }
  }, [editor, snapshotFromDB])

  // Save snapshot to Convex on change (debounced)
  useEffect(() => {
    if (!editor) return

    const save = debounce(() => {
      const { document } = getSnapshot(editor.store)
      saveSnapshotMutation({
        conversationId,
        snapshot: JSON.stringify({ document })
      })
    }, 2000)

    const unsubscribe = editor.store.listen(save)
    return unsubscribe
  }, [editor])

  return (
    <div className="h-[400px] border rounded-lg">
      <Tldraw onMount={setEditor} />
    </div>
  )
}
```

#### Change Detection
```typescript
// Track snapshot hash to detect changes
const lastSentHash = useRef(null)

const exportIfChanged = async () => {
  const { document } = getSnapshot(editor.store)
  const currentHash = await hashString(JSON.stringify(document))

  if (currentHash === lastSentHash.current) {
    return null // No changes, don't send
  }

  lastSentHash.current = currentHash

  // Export as PNG
  const shapeIds = editor.getCurrentPageShapeIds()
  const { blob } = await editor.toImage([...shapeIds], {
    format: 'png',
    background: true,
    scale: 2 // Higher res for Claude
  })

  return blob
}
```

#### Storage Strategy
- **Persist tldraw JSON** to `messages.whiteboardSnapshot` (for loading/editing)
- **Generate PNG thumbnail** and store in Convex Storage (for display in history)
- **Send PNG to Claude** when whiteboard changes

**Schema Changes:**
```typescript
messages: {
  // ... existing
  whiteboardSnapshot: v.optional(v.string()), // JSON of tldraw document
  whiteboardThumbnailId: v.optional(v.id("_storage")), // PNG preview
}
```

**New Convex Functions:**
```typescript
// convex/whiteboard.ts
export const saveSnapshot = mutation({
  args: { conversationId: v.id("conversations"), snapshot: v.string() },
  handler: async (ctx, args) => {
    // Save to latest message or create new whiteboard message
  }
})

export const getSnapshot = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Return latest whiteboard snapshot for conversation
  }
})
```

**Files to Create:**
- `components/WhiteboardPanel.tsx`
- `convex/whiteboard.ts`
- `lib/whiteboard-utils.ts` (hash, export helpers)

**Files to Modify:**
- `components/MessageInput.tsx` (add whiteboard toggle, export logic)
- `components/MessageList.tsx` (display whiteboard thumbnails)
- `convex/schema.ts`
- `app/api/chat/route.ts` (include whiteboard image in API call)

**Dependencies to Add:**
- `tldraw` (~300KB)
- `hash-wasm` (~5KB, for change detection)

---

### 6. Practice Problem Generator

**Use Case:**
Student wants to practice similar problems after learning a concept.

**UX Flow:**
1. User clicks "Generate Practice Problems" icon (in input toolbar, next to image upload)
2. Shows tooltip: "Generate practice problems"
3. Expands input field asking: "What type of problem do you want to practice?"
4. User types problem description (e.g., "2x+5=25" or "linear equations")
5. Dropdown to select number: 3 (default), 5, or 10
6. Clicks generate button
7. LLM generates practice problems similar to the input
8. Practice card appears as a message in chat

**Practice Card Component:**

```
┌─────────────────────────────────────────────────┐
│ Solving Linear Equations: 2x+5=13 practice      │
│                                    Easy     MCQ  │
├─────────────────────────────────────────────────┤
│                                                  │
│ Solve for x in the equation 2x + 7 = 19.        │
│                                                  │
│ Choose one:                                      │
│                                                  │
│ ○ A. x = 5                                       │
│ ✓ B. x = 6     ← Selected, highlighted green    │
│ ○ C. x = 7                                       │
│ ○ D. x = 8                                       │
│                                                  │
│ [Clear Answer] [Reset Answer]  ✓ Correct!       │
│                                                  │
│ Explanation:                                     │
│ To solve 2x + 7 = 19, we need to isolate x.     │
│ First, subtract 7 from both sides: 2x = 12.     │
│ Then divide by 2: x = 6. Therefore, x = 6.      │
│                                                  │
│                         Problem 1 of 3      [<] [>]│
└─────────────────────────────────────────────────┘
```

**Features:**
- **Pagination:** Navigate between 3 problems (1 of 3, 2 of 3, 3 of 3)
- **Multiple Choice:** 4 options per problem (A, B, C, D)
- **Instant Feedback:** Click option → highlights green/red + shows checkmark/X
- **Inline Explanation:** Expands below answer choices when answered
- **Reset/Clear:** Buttons to try again or clear selection
- **Difficulty Badge:** Shows "Easy", "Medium", or "Hard"
- **Math Rendering:** Uses KaTeX for equations

**Technical Implementation:**

#### 1. Generation Flow
```typescript
// User clicks "Generate Practice Problems"
const generateProblems = async (problemDescription: string, count: number) => {
  // Call Claude API with special prompt
  const response = await fetch('/api/practice/generate', {
    method: 'POST',
    body: JSON.stringify({
      problemDescription,
      count,
      conversationContext // Include recent messages for context
    })
  })

  const { problems } = await response.json()

  // Store in Convex
  const sessionId = await createPracticeSession({
    problems,
    conversationId,
    topic: problemDescription
  })

  // Render practice card in chat
  return sessionId
}
```

#### 2. LLM Response Format
```json
{
  "problems": [
    {
      "problem": "Solve for x in the equation 3x + 7 = 19.",
      "options": [
        { "label": "A", "value": "x = 3", "isCorrect": false },
        { "label": "B", "value": "x = 4", "isCorrect": true },
        { "label": "C", "value": "x = 5", "isCorrect": false },
        { "label": "D", "value": "x = 6", "isCorrect": false }
      ],
      "explanation": "To solve 3x + 7 = 19, subtract 7: 3x = 12, then divide by 3: x = 4.",
      "difficulty": "easy"
    },
    // ... 2 more problems
  ]
}
```

#### 3. Schema Design
```typescript
// New table for practice sessions
practiceSessions: defineTable({
  userId: v.string(),
  conversationId: v.id("conversations"),
  topic: v.string(), // "Linear equations", "Quadratic formulas"
  difficulty: v.union(
    v.literal("easy"),
    v.literal("medium"),
    v.literal("hard")
  ),
  problems: v.array(v.object({
    problem: v.string(),
    options: v.array(v.object({
      label: v.string(),
      value: v.string(),
      isCorrect: v.boolean(),
    })),
    explanation: v.string(),
    studentAnswer: v.optional(v.string()), // Which option they chose
    attemptedAt: v.optional(v.number()),
  })),
  totalProblems: v.number(),
  currentProblemIndex: v.number(),
  score: v.number(), // Number correct
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
}).index("by_user", ["userId", "createdAt"])
  .index("by_conversation", ["conversationId"]),
```

#### 4. Practice Card Component
```typescript
// components/PracticeCard.tsx
export const PracticeCard = ({ sessionId }: { sessionId: Id<"practiceSessions"> }) => {
  const session = useQuery(api.practice.getSession, { sessionId })
  const updateAnswer = useMutation(api.practice.updateAnswer)
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!session) return <LoadingSpinner />

  const problem = session.problems[currentIndex]
  const [selectedOption, setSelectedOption] = useState(problem.studentAnswer)

  const handleSelect = async (optionLabel: string) => {
    setSelectedOption(optionLabel)
    await updateAnswer({
      sessionId,
      problemIndex: currentIndex,
      answer: optionLabel
    })
  }

  const isAnswered = !!selectedOption
  const correctOption = problem.options.find(o => o.isCorrect)
  const isCorrect = selectedOption === correctOption?.label

  return (
    <motion.div
      className="border rounded-lg p-6 bg-zinc-900"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">
          {session.topic} practice
        </h3>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
            {session.difficulty}
          </span>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
            MCQ
          </span>
        </div>
      </div>

      {/* Problem Statement (with KaTeX) */}
      <div className="mb-6">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {problem.problem}
        </ReactMarkdown>
      </div>

      {/* Multiple Choice Options */}
      <div className="space-y-3 mb-4">
        {problem.options.map(option => {
          const isSelected = selectedOption === option.label
          const showCorrect = isAnswered && option.isCorrect
          const showWrong = isAnswered && isSelected && !option.isCorrect

          return (
            <motion.button
              key={option.label}
              onClick={() => handleSelect(option.label)}
              disabled={isAnswered}
              className={cn(
                "w-full p-4 rounded-lg text-left flex items-center gap-3",
                "transition-colors border",
                !isAnswered && "hover:border-blue-500 cursor-pointer",
                showCorrect && "bg-green-500/20 border-green-500",
                showWrong && "bg-red-500/20 border-red-500",
                !isAnswered && !isSelected && "border-zinc-700",
                isSelected && !isAnswered && "border-blue-500"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                showCorrect && "border-green-500 bg-green-500",
                showWrong && "border-red-500",
                !isAnswered && "border-zinc-500"
              )}>
                {showCorrect && <Check className="w-4 h-4 text-white" />}
                {showWrong && <X className="w-4 h-4 text-red-500" />}
              </div>

              <span className="font-medium">{option.label}.</span>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                className="flex-1"
              >
                {option.value}
              </ReactMarkdown>
            </motion.button>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedOption(undefined)}
            disabled={!selectedOption}
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            Clear Answer
          </button>
          <button
            onClick={() => {
              setSelectedOption(undefined)
              updateAnswer({ sessionId, problemIndex: currentIndex, answer: undefined })
            }}
            disabled={!isAnswered}
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            Reset Answer
          </button>
        </div>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex items-center gap-2 font-medium",
              isCorrect ? "text-green-400" : "text-red-400"
            )}
          >
            {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {isCorrect ? "Correct!" : "Incorrect"}
          </motion.div>
        )}
      </div>

      {/* Explanation (shows when answered) */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-700 pt-4"
          >
            <h4 className="font-medium mb-2">Explanation:</h4>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              className="text-zinc-400"
            >
              {problem.explanation}
            </ReactMarkdown>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-700">
        <span className="text-sm text-zinc-400">
          Problem {currentIndex + 1} of {session.totalProblems}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex(i => Math.min(session.totalProblems - 1, i + 1))}
            disabled={currentIndex === session.totalProblems - 1}
            className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
```

#### 5. Message Integration
Practice cards appear as special message types in the chat:

```typescript
// In MessageList.tsx
{message.practiceSessionId ? (
  <PracticeCard sessionId={message.practiceSessionId} />
) : (
  <ReactMarkdown>{message.content}</ReactMarkdown>
)}
```

**Files to Create:**
- `components/PracticeCard.tsx`
- `components/PracticeGeneratorInput.tsx` (the popup input UI)
- `convex/practice.ts` (all practice-related queries/mutations)
- `app/api/practice/generate/route.ts` (LLM generation endpoint)

**Files to Modify:**
- `components/MessageInput.tsx` (add generation button)
- `components/MessageList.tsx` (render practice cards)
- `convex/schema.ts` (add practiceSessions table)
- `convex/messages.ts` (support practiceSessionId field)

**Schema Changes:**
```typescript
messages: {
  // ... existing
  practiceSessionId: v.optional(v.id("practiceSessions")),
}

// New table (see above)
practiceSessions: { ... }
```

---

### 7. Immersive Voice + Whiteboard Mode

**Use Case:**
Full tutoring session with voice conversation and shared whiteboard, similar to one-on-one tutoring experience.

**UX Flow:**
1. User clicks "Voice Mode" button (in top nav or input area)
2. Enters full-screen immersive mode with:
   - Large whiteboard (60-70% of screen)
   - Voice controls (bottom)
   - Conversation transcript (side panel, collapsible)
3. User can speak or draw simultaneously
4. AI responds via voice while student draws/listens
5. Exit button returns to normal chat

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [Exit Voice Mode]              Problem: 2x + 5 = 13     │ ← Header
├─────────────────────────────────────────────────────────┤
│                                            │             │
│                                            │ Transcript  │
│                                            │ ───────     │
│           Whiteboard Canvas                │ You: ...    │
│           (tldraw component)               │             │
│                                            │ AI: ...     │
│                                            │             │
├─────────────────────────────────────────────────────────┤
│  🎤 [Hold to Talk]   🔊 [Speaking...]   [Clear Board]   │ ← Voice Controls
└─────────────────────────────────────────────────────────┘
```

**Voice Implementation: OpenAI TTS + STT**

#### A. Speech-to-Text (Whisper)
```typescript
// app/api/stt/route.ts
import { OpenAI } from 'openai'

const openai = new OpenAI()

export async function POST(req: Request) {
  const formData = await req.formData()
  const audioFile = formData.get('audio') as File

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'en',
    response_format: 'json'
  })

  return Response.json({ text: transcription.text })
}
```

**Client-side Recording:**
```typescript
// lib/useVoiceRecording.ts
export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder>()
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm' // Smaller file size
    })

    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []

      // Send to STT API
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData
      })

      const { text } = await response.json()
      return text
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  return { isRecording, startRecording, stopRecording }
}
```

#### B. Text-to-Speech
```typescript
// app/api/tts/route.ts
import { OpenAI } from 'openai'

const openai = new OpenAI()

export async function POST(req: Request) {
  const { text } = await req.json()

  const response = await openai.audio.speech.create({
    model: 'tts-1', // Real-time optimized
    voice: 'alloy', // Neutral, clear voice
    input: text,
    response_format: 'mp3'
  })

  // Stream audio back
  return new Response(response.body, {
    headers: { 'Content-Type': 'audio/mpeg' }
  })
}
```

**Client-side Playback:**
```typescript
// lib/useTextToSpeech.ts
export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement>()

  const speak = async (text: string) => {
    setIsSpeaking(true)

    const response = await fetch('/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text })
    })

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    const audio = new Audio(audioUrl)
    audioRef.current = audio

    audio.onended = () => {
      setIsSpeaking(false)
      URL.revokeObjectURL(audioUrl)
    }

    await audio.play()
  }

  const stopSpeaking = () => {
    audioRef.current?.pause()
    setIsSpeaking(false)
  }

  return { isSpeaking, speak, stopSpeaking }
}
```

#### C. Voice Mode Component
```typescript
// components/VoiceMode.tsx
export const VoiceMode = ({ conversationId }: { conversationId: Id<"conversations"> }) => {
  const { isRecording, startRecording, stopRecording } = useVoiceRecording()
  const { isSpeaking, speak } = useTextToSpeech()
  const [transcript, setTranscript] = useState<{ role: string, text: string }[]>([])

  const handleVoiceInput = async () => {
    const text = await stopRecording()
    setTranscript(t => [...t, { role: 'user', text }])

    // Send to chat API (reuse existing endpoint)
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        message: text,
        // Include whiteboard if changed
      })
    })

    const reader = response.body.getReader()
    let aiResponse = ''

    // Read streaming response
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = new TextDecoder().decode(value)
      aiResponse += text
    }

    setTranscript(t => [...t, { role: 'assistant', text: aiResponse }])

    // Speak the response
    await speak(aiResponse)
  }

  return (
    <div className="fixed inset-0 bg-zinc-900 z-50">
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          Exit Voice Mode
        </button>
        <h2 className="text-lg font-medium">Problem: {currentProblem}</h2>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Whiteboard */}
        <div className="flex-1 p-6">
          <WhiteboardPanel conversationId={conversationId} />
        </div>

        {/* Transcript Sidebar */}
        <div className="w-80 border-l border-zinc-800 p-4 overflow-y-auto">
          <h3 className="font-medium mb-4">Transcript</h3>
          <div className="space-y-4">
            {transcript.map((item, i) => (
              <div key={i} className={cn(
                "p-3 rounded",
                item.role === 'user' ? "bg-zinc-800" : "bg-zinc-900"
              )}>
                <div className="text-xs text-zinc-400 mb-1">
                  {item.role === 'user' ? 'You' : 'AI Tutor'}
                </div>
                <div className="text-sm">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="h-16 border-t border-zinc-800 flex items-center justify-center gap-4">
        <button
          onMouseDown={startRecording}
          onMouseUp={handleVoiceInput}
          onTouchStart={startRecording}
          onTouchEnd={handleVoiceInput}
          disabled={isSpeaking}
          className={cn(
            "px-8 py-3 rounded-lg font-medium flex items-center gap-2",
            "transition-colors",
            isRecording && "bg-red-500 text-white",
            !isRecording && !isSpeaking && "bg-blue-600 hover:bg-blue-700 text-white",
            isSpeaking && "bg-zinc-700 text-zinc-400 cursor-not-allowed"
          )}
        >
          <Mic className="w-5 h-5" />
          {isRecording ? 'Recording...' : 'Hold to Talk'}
        </button>

        {isSpeaking && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Volume2 className="w-5 h-5 animate-pulse" />
            Speaking...
          </div>
        )}

        <button
          onClick={() => {/* Clear whiteboard */}}
          className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
        >
          Clear Board
        </button>
      </div>
    </div>
  )
}
```

**Latency Considerations:**
- **STT:** ~2-3 seconds after user stops speaking
- **LLM Response:** 1-2 seconds for first token (streaming)
- **TTS:** ~2 seconds to generate full audio
- **Total:** 5-7 seconds from "user stops talking" to "AI starts speaking"

This is acceptable for tutoring (similar to human think time).

**Cost per 10-min Session:**
- STT (5 min user speaking): ~$0.03
- TTS (5 min AI speaking): ~$0.60
- Claude API: ~$0.10
- **Total: ~$0.73 per 10-min voice session**

**Files to Create:**
- `components/VoiceMode.tsx`
- `lib/useVoiceRecording.ts`
- `lib/useTextToSpeech.ts`
- `app/api/tts/route.ts`
- `app/api/stt/route.ts`

**Files to Modify:**
- `components/ChatInterface.tsx` (add voice mode toggle)
- `app/layout.tsx` (voice mode can mount at root level)

**Schema Changes:**
```typescript
messages: {
  // ... existing
  isVoiceMessage: v.optional(v.boolean()),
  audioStorageId: v.optional(v.id("_storage")), // Store original audio
}
```

**Dependencies to Add:**
- `openai` (official SDK)

---

## Implementation Phases

### Phase 1: Foundation & Testing (Days 1-2)
**Goal:** Improve core functionality and establish testing framework

**Tasks:**
1. Add drag & drop to image upload
2. Create problem-testing.md with test scripts
3. Revise system prompt with phase structure
4. Run all test cases, document results

**Deliverables:**
- Drag & drop working
- `docs/problem-testing.md` complete
- Updated `lib/prompts.ts`
- Test results documented

**Worktree:** `feature/foundation`

**Estimated Time:** 1-2 days

---

### Phase 2: Step Visualization (Days 2-3)
**Goal:** Help students track progress through problems

**Tasks:**
1. Install Framer Motion
2. Create StepTracker components
3. Update schema with problemContext
4. Modify system prompt to output structured step data
5. Update API route to parse problemContext
6. Integrate into MessageList
7. Test with various problem types

**Deliverables:**
- Progress bar showing % complete
- Collapsible step roadmap
- Step history/replay section
- Smooth animations

**Worktree:** `feature/step-visualization`

**Estimated Time:** 1-2 days

**Conflict Zones:**
- `MessageList.tsx` (adding step tracker UI)
- `lib/prompts.ts` (step tracking instructions)
- `convex/schema.ts` (problemContext field)

---

### Phase 3: Whiteboard - Inline Mode (Days 3-4)
**Goal:** Enable visual problem-solving with persistent whiteboard

**Tasks:**
1. Install tldraw and hash-wasm
2. Create WhiteboardPanel component with dynamic import
3. Implement snapshot save/load with Convex
4. Add change detection (hash-based)
5. Implement PNG export for Claude Vision
6. Add whiteboard toggle to MessageInput
7. Update schema and create Convex functions
8. Test persistence and image export

**Deliverables:**
- Whiteboard toggle in chat
- Canvas persists per-conversation
- Exports to Claude when changed
- Thumbnails in message history

**Worktree:** `feature/whiteboard`

**Estimated Time:** 1-2 days

**Conflict Zones:**
- `MessageInput.tsx` (whiteboard toggle + export)
- `convex/schema.ts` (whiteboard fields)
- `app/api/chat/route.ts` (include whiteboard image)

---

### Phase 4: Practice Problems (Days 4-5)
**Goal:** Interactive practice with MCQ and instant feedback

**Tasks:**
1. Create practiceSessions schema
2. Build PracticeGeneratorInput component
3. Create API route for problem generation
4. Build PracticeCard component with:
   - MCQ interface
   - Pagination
   - Instant feedback
   - Inline explanations
5. Add Convex mutations for tracking answers
6. Integrate into MessageList
7. Test problem generation and interactions

**Deliverables:**
- Generate practice problems button
- Interactive MCQ cards
- Paginated problems (3 per set)
- Score tracking

**Worktree:** `feature/practice-problems`

**Estimated Time:** 1-2 days

**Conflict Zones:**
- `MessageList.tsx` (rendering practice cards)
- `convex/schema.ts` (practiceSessions table)

---

### Phase 5: Immersive Voice Mode (Days 5-6)
**Goal:** Full-screen voice tutoring with whiteboard

**Tasks:**
1. Install OpenAI SDK
2. Create TTS and STT API routes
3. Build useVoiceRecording hook
4. Build useTextToSpeech hook
5. Create VoiceMode component with:
   - Full-screen layout
   - Whiteboard integration
   - Voice controls
   - Transcript sidebar
6. Add voice mode toggle to ChatInterface
7. Test voice recording, transcription, and playback
8. Optimize latency and error handling

**Deliverables:**
- Voice mode button
- Full-screen immersive experience
- Push-to-talk recording
- TTS playback
- Live transcript

**Worktree:** `feature/voice-mode`

**Estimated Time:** 1-2 days

**Conflict Zones:**
- `ChatInterface.tsx` (voice mode integration)
- `MessageInput.tsx` (voice button)
- Multiple file changes for voice infrastructure

---

### Phase 6: Integration & Polish (Days 6-7)
**Goal:** Merge all features and ensure quality

**Tasks:**
1. Merge foundation → main
2. Merge step-visualization → main (resolve conflicts)
3. Merge whiteboard → main (resolve conflicts)
4. Merge practice-problems → main (resolve conflicts)
5. Merge voice-mode → main (resolve conflicts)
6. Run full test suite
7. Performance optimization:
   - Check bundle size
   - Lazy load heavy components
   - Optimize animations
8. Update documentation (CLAUDE.md, README)
9. Create demo video
10. Final testing across all features

**Deliverables:**
- All features merged into main
- No regressions in existing functionality
- Updated documentation
- Demo video

**Estimated Time:** 1-2 days

---

## Git Worktree Strategy

### Why Worktrees?
- Work on multiple features in parallel
- Each feature has isolated environment
- Switch between features without stashing
- Test features independently

### Setup Commands

```bash
# Create worktrees
git worktree add ../ai-math-tutor-foundation feature/foundation
git worktree add ../ai-math-tutor-step-viz feature/step-visualization
git worktree add ../ai-math-tutor-whiteboard feature/whiteboard
git worktree add ../ai-math-tutor-practice feature/practice-problems
git worktree add ../ai-math-tutor-voice feature/voice-mode

# Each worktree is a separate directory
# Navigate to work on specific feature
cd ../ai-math-tutor-foundation
bun install  # Install dependencies
bun run dev  # Start dev server
```

### Branch Strategy

```
main (stable MVP)
├── feature/foundation
├── feature/step-visualization
├── feature/whiteboard
├── feature/practice-problems
└── feature/voice-mode
```

### Merge Order (Sequential)

**Important:** Merge in this order to minimize conflicts

1. **foundation** → main
   - Clean merge (minimal changes)
   - Establishes improved prompt

2. **step-visualization** → main
   - Conflicts: `MessageList.tsx`, `lib/prompts.ts`
   - Resolution: Keep both step tracker UI and prompt enhancements

3. **whiteboard** → main
   - Conflicts: `MessageInput.tsx`, `convex/schema.ts`
   - Resolution: Combine whiteboard toggle with existing image upload

4. **practice-problems** → main
   - Conflicts: `MessageList.tsx`, `convex/schema.ts`
   - Resolution: Support both step tracker AND practice cards in MessageList

5. **voice-mode** → main
   - Conflicts: `ChatInterface.tsx`, `MessageInput.tsx`
   - Resolution: Major UI changes, careful merge required

---

## Database Schema Changes

### Current Schema (Reference)
```typescript
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
  imageStorageId: v.optional(v.id("_storage")), // Already exists!
}).index("by_conversation", ["conversationId", "timestamp"]),
```

### Complete New Schema

```typescript
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // EXISTING TABLES (with additions)

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

    // EXISTING: Image upload
    imageStorageId: v.optional(v.id("_storage")),

    // NEW: Whiteboard
    whiteboardSnapshot: v.optional(v.string()), // JSON of tldraw document
    whiteboardThumbnailId: v.optional(v.id("_storage")), // PNG preview

    // NEW: Step tracking
    problemContext: v.optional(v.object({
      currentProblem: v.string(),
      currentStep: v.number(),
      totalSteps: v.number(),
      problemType: v.string(), // "linear-equation", "quadratic", etc.
      stepsCompleted: v.array(v.string()), // Descriptions of completed steps
    })),

    // NEW: Practice problems
    practiceSessionId: v.optional(v.id("practiceSessions")),

    // NEW: Voice
    isVoiceMessage: v.optional(v.boolean()),
    audioStorageId: v.optional(v.id("_storage")),
  }).index("by_conversation", ["conversationId", "timestamp"]),

  // NEW TABLE: Practice Sessions
  practiceSessions: defineTable({
    userId: v.string(),
    conversationId: v.id("conversations"),
    topic: v.string(), // "Linear equations", "Quadratic formulas"
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    problems: v.array(v.object({
      problem: v.string(),
      options: v.array(v.object({
        label: v.string(), // "A", "B", "C", "D"
        value: v.string(), // "x = 3"
        isCorrect: v.boolean(),
      })),
      explanation: v.string(),
      studentAnswer: v.optional(v.string()), // "A", "B", etc.
      attemptedAt: v.optional(v.number()),
    })),
    totalProblems: v.number(),
    currentProblemIndex: v.number(),
    score: v.number(), // Number correct
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId", "createdAt"])
    .index("by_conversation", ["conversationId"]),
})
```

### Migration Strategy

**No breaking changes!** All new fields are optional.

1. Deploy schema changes to Convex
2. Existing messages continue working
3. New features add optional fields as they're used
4. No data migration required

---

## Tech Stack Additions

### New Dependencies

```bash
# Animations
bun add framer-motion

# Whiteboard
bun add tldraw
bun add hash-wasm  # For change detection

# Voice
bun add openai

# Already have (verify versions):
# - katex (math rendering)
# - react-markdown + remark-math + rehype-katex
# - lucide-react (icons)
```

### Bundle Size Impact

| Package | Size (min+gzip) | Purpose |
|---------|-----------------|---------|
| **Existing** |  |  |
| Next.js | ~300 KB | Framework |
| React 19 | ~45 KB | UI library |
| Convex Client | ~40 KB | Database |
| Clerk | ~60 KB | Auth |
| AI SDK | ~20 KB | Streaming |
| KaTeX | ~200 KB | Math rendering |
| **New** |  |  |
| Framer Motion | 40 KB | Animations |
| tldraw | 300 KB | Whiteboard |
| hash-wasm | 5 KB | Change detection |
| openai | ~10 KB | Voice APIs (client) |
| **Total New** | **~355 KB** | Acceptable |

**Total App Size:** ~1.0 MB → ~1.4 MB (acceptable for feature-rich app)

### Optimization Strategies

1. **Dynamic Imports:**
```typescript
// Whiteboard only loads when needed
const Tldraw = dynamic(() => import('tldraw'), { ssr: false })

// Voice mode only loads when entering mode
const VoiceMode = dynamic(() => import('@/components/VoiceMode'))
```

2. **Code Splitting:**
- Practice cards lazy load
- Voice components lazy load
- tldraw lazy loads

3. **Tree Shaking:**
- Import only what's needed from Framer Motion
- Use modular imports where possible

---

## Agent Context & Guidelines

### For Agents Working in Isolation

**Important:** You won't have the full conversation context. Here's what you need to know:

#### Project Structure
```
app/
├── api/
│   └── chat/route.ts          # Claude API endpoint
├── layout.tsx                  # Root layout
├── page.tsx                    # Home page
└── globals.css                 # Tailwind CSS

components/
├── ChatInterface.tsx           # Main chat component
├── MessageList.tsx             # Message display
├── MessageInput.tsx            # User input
├── ConversationSidebar.tsx     # Sidebar navigation
└── providers/
    └── ConvexClientProvider.tsx

convex/
├── schema.ts                   # Database schema
├── conversations.ts            # Conversation CRUD
├── messages.ts                 # Message CRUD
└── files.ts                    # File storage

lib/
└── prompts.ts                  # System prompt
```

#### Key Patterns

**1. Convex Queries/Mutations:**
```typescript
// Define in convex/
export const myQuery = query({
  args: { id: v.id("table") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

// Use in components
const data = useQuery(api.path.myQuery, { id })
```

**2. Message Rendering:**
```typescript
// MessageList.tsx renders different message types
{message.practiceSessionId ? (
  <PracticeCard sessionId={message.practiceSessionId} />
) : message.whiteboardSnapshot ? (
  <WhiteboardThumbnail snapshot={message.whiteboardSnapshot} />
) : (
  <ReactMarkdown>{message.content}</ReactMarkdown>
)}
```

**3. Streaming Responses:**
```typescript
// Use Vercel AI SDK's useChat hook
const { messages, input, setInput, append, isLoading } = useChat({
  api: '/api/chat',
  // ... config
})
```

**4. File Upload Pattern:**
```typescript
// 1. Generate upload URL
const uploadUrl = await generateUploadUrl()

// 2. Upload file
const response = await fetch(uploadUrl, {
  method: 'POST',
  body: file
})

// 3. Get storage ID
const { storageId } = await response.json()

// 4. Store in message
await createMessage({ imageStorageId: storageId })
```

#### Coding Standards

**TypeScript:**
- Use arrow functions exclusively: `const Component = () => { }`
- Avoid excessive types/interfaces unless needed
- Use Convex's generated types: `Id<"table">`

**Styling:**
- Use Tailwind classes only (no custom CSS)
- Dark theme colors: `bg-zinc-900`, `text-zinc-400`
- Consistent spacing: `p-6`, `mb-4`, `gap-3`

**Components:**
- Prefer client components: `"use client"`
- Use Framer Motion for animations
- Use lucide-react for icons

**Error Handling:**
- Show loading states for async operations
- Display error messages to user
- Log errors to console for debugging

#### Testing Locally

```bash
# In each worktree:
bun install
bun run dev  # Runs both Convex + Next.js

# Visit http://localhost:3000
```

#### Environment Variables

You'll need these in `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-... # For voice features
```

#### Commit Guidelines

```bash
# Make frequent, small commits
git add .
git commit -m "feat: add whiteboard toggle button"

# Push to your feature branch
git push origin feature/whiteboard
```

---

## Testing & Validation

### Manual Testing Framework

**Location:** `docs/problem-testing.md`

#### Test Cases

**1. Simple Arithmetic**
```
Input: "What is 12 + 8?"
Expected: Asks "What operation is this?" or "Can you break this down?"
Should NOT: Say "It's 20"
```

**2. Linear Equations**
```
Input: "Solve 2x + 5 = 13"
Expected:
- Ask "What are we solving for?"
- Guide: "To isolate x, what should we undo first?"
- Validate: "Let's check your answer by plugging it back in"
Should NOT: Say "x = 4" directly
```

**3. Quadratic Equations**
```
Input: "Solve x² + 5x + 6 = 0"
Expected:
- Ask about method: "What method could we use?"
- Suggest: "Could we factor this?"
- Guide factoring process
Should NOT: Give factors directly
```

**4. Geometry**
```
Input: "Find the area of a circle with radius 5"
Expected:
- Ask: "What formula do we use for circle area?"
- Break down: "What does πr² mean?"
- Guide calculation step-by-step
Should NOT: Say "78.5 square units"
```

**5. Word Problems**
```
Input: "A train travels 120 miles in 2 hours. What's its speed?"
Expected:
- Ask: "What information do we have?"
- Guide: "What's the relationship between distance, speed, and time?"
- Help set up: "Can you write an equation?"
Should NOT: Say "60 mph"
```

**6. Multi-step Problems**
```
Input: "If 3(x+2) = 18, what is x?"
Expected:
- Break into phases: "First, let's simplify the left side"
- Guide distribution or division approach
- Validate each step
Should NOT: Skip to "x = 4"
```

#### Validation Checklist

For each test case, verify:
- [ ] No direct answers given
- [ ] Asks guiding questions
- [ ] Breaks problem into clear steps
- [ ] Provides hints when stuck (after 2+ turns)
- [ ] Uses encouraging language ("Great work!", "You're on the right track!")
- [ ] Validates final answer by substitution or checking
- [ ] Handles incorrect student answers gracefully
- [ ] Adapts to student's understanding level

#### Testing New Features

**Step Visualization:**
- [ ] Progress bar appears and updates correctly
- [ ] Step roadmap shows current/completed/pending
- [ ] Step history is accurate and helpful
- [ ] Animations are smooth

**Whiteboard:**
- [ ] Toggle opens/closes canvas
- [ ] Drawing persists across messages
- [ ] Only sends to Claude when changed
- [ ] Thumbnails display in history

**Practice Problems:**
- [ ] Generation prompt appears
- [ ] LLM generates similar problems
- [ ] MCQ options render correctly
- [ ] Selection highlights properly
- [ ] Explanations are helpful
- [ ] Pagination works

**Voice Mode:**
- [ ] Recording starts/stops correctly
- [ ] Transcription is accurate
- [ ] TTS voice is clear
- [ ] Latency is acceptable (<10s)
- [ ] Transcript updates in real-time

---

## Conflict Resolution Strategy

### Conflict Zones

**Files with High Conflict Probability:**

1. **`MessageList.tsx`**
   - **Conflicts between:** step-visualization + practice-problems
   - **Resolution:** Support rendering both step trackers AND practice cards
   - **Strategy:** Use if/else chain to determine message type

2. **`MessageInput.tsx`**
   - **Conflicts between:** foundation (drag-drop) + whiteboard + voice-mode
   - **Resolution:** Combine all input enhancements
   - **Strategy:** Single toolbar with multiple buttons/toggles

3. **`convex/schema.ts`**
   - **Conflicts between:** All branches add fields
   - **Resolution:** Merge all new fields (all are optional)
   - **Strategy:** Add all fields sequentially, no conflicts since all optional

4. **`lib/prompts.ts`**
   - **Conflicts between:** foundation (prompt v2) + step-visualization
   - **Resolution:** Combine improved base prompt + step tracking instructions
   - **Strategy:** Structured prompt with sections for each feature

5. **`ChatInterface.tsx`**
   - **Conflicts between:** voice-mode (major changes)
   - **Resolution:** Add voice mode toggle without breaking existing flow
   - **Strategy:** Conditional rendering for voice mode

### Merge Process

**For Each Merge:**

1. **Pull latest main**
   ```bash
   git checkout feature/your-feature
   git fetch origin
   git merge origin/main
   ```

2. **Identify conflicts**
   ```bash
   git status
   # Look for "both modified" files
   ```

3. **Resolve systematically**
   - Open each conflict in editor
   - Keep both sets of changes when possible
   - Test after each resolution

4. **Test thoroughly**
   ```bash
   bun run dev
   # Manually test both old and new features
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "merge: resolve conflicts with main"
   git push origin feature/your-feature
   ```

6. **Create PR**
   ```bash
   # Via GitHub UI or:
   gh pr create --title "feat: your feature" --body "Description"
   ```

---

## Success Criteria

### Core Functionality
- ✅ All existing features still work (no regressions)
- ✅ Maintains Socratic approach (never gives direct answers)
- ✅ Sub-2s response times maintained
- ✅ No console errors or warnings

### New Features

**Drag & Drop:**
- ✅ Visual feedback on drag over
- ✅ Works with all image formats
- ✅ Integrates seamlessly with existing upload

**Step Visualization:**
- ✅ Progress bar updates correctly
- ✅ Step roadmap helps students track progress
- ✅ Step history provides useful context
- ✅ Animations are smooth (60fps)

**Whiteboard:**
- ✅ Toggle opens/closes smoothly
- ✅ Canvas persists per-conversation
- ✅ Only sends to Claude when changed
- ✅ PNG export works reliably
- ✅ Can draw and chat simultaneously

**Practice Problems:**
- ✅ Generates 3 similar problems
- ✅ MCQ interface works perfectly
- ✅ Instant feedback on selection
- ✅ Explanations are helpful
- ✅ Pagination works smoothly
- ✅ Score tracking accurate

**Voice Mode:**
- ✅ Full-screen mode is immersive
- ✅ Voice recording works reliably
- ✅ Transcription accuracy >90%
- ✅ TTS voice is clear and natural
- ✅ Total latency <10s (acceptable)
- ✅ Whiteboard visible and usable
- ✅ Transcript updates in real-time

### Quality Metrics

**Performance:**
- [ ] Bundle size <1.5 MB (currently ~1.4 MB with all features)
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] No layout shifts (CLS = 0)

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (where applicable)
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

**Testing:**
- [ ] All 6 problem types pass manual tests
- [ ] No direct answers in any scenario
- [ ] Prompt handles edge cases well

### Documentation
- [ ] `Plan2.md` complete (this document)
- [ ] `docs/problem-testing.md` complete with results
- [ ] `CLAUDE.md` updated with new features
- [ ] README updated with setup instructions
- [ ] Demo video recorded (5 min)

---

## Timeline Summary

| Phase | Features | Days | Status |
|-------|----------|------|--------|
| 1 | Foundation | 1-2 | 🔨 |
| 2 | Step Viz | 1-2 | ⏳ |
| 3 | Whiteboard | 1-2 | ⏳ |
| 4 | Practice | 1-2 | ⏳ |
| 5 | Voice | 1-2 | ⏳ |
| 6 | Integration | 1-2 | ⏳ |
| **Total** |  | **6-12 days** |  |

**Target:** Complete by Day 7 (Nov 10, 2025)

---

## Additional Resources

### API Documentation
- **Anthropic Claude:** https://docs.anthropic.com/
- **OpenAI TTS/STT:** https://platform.openai.com/docs/guides/speech-to-text
- **Convex:** https://docs.convex.dev/
- **tldraw:** https://tldraw.dev/docs/

### Design Inspiration
- Khan Academy tutoring demo: https://www.youtube.com/watch?v=IvXZCocyU_M
- Math Academy: (user will research separately)

### Libraries
- **Framer Motion:** https://www.framer.com/motion/
- **KaTeX:** https://katex.org/
- **Tailwind CSS v4:** https://tailwindcss.com/docs

---

## Notes for Implementation

### Priority Order
1. **Phase 1** is foundational - must complete first
2. **Phases 2-4** can run in parallel (different files)
3. **Phase 5** should wait until whiteboard is stable (reuses whiteboard component)
4. **Phase 6** is sequential (merging)

### Risk Mitigation
- **Whiteboard complexity:** If tldraw is too heavy, consider simpler canvas library
- **Voice latency:** If >10s, consider WebSocket streaming
- **LLM consistency:** If step tracking unreliable, simplify format
- **Merge conflicts:** Resolve incrementally, test after each merge

### Future Enhancements (Post-Launch)
- [ ] Handwriting recognition (OCR for student's work)
- [ ] Realtime API for lower-latency voice
- [ ] Mobile-responsive design
- [ ] Spaced repetition algorithm for practice
- [ ] Export study notes/conversation
- [ ] Multi-language support
- [ ] Math validation with symbolic solver

---

**End of Plan2.md**
