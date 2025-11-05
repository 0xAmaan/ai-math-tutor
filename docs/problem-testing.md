# AI Math Tutor - Problem Testing Framework

**Purpose:** Manual test cases to validate Socratic tutoring behavior across different problem types.

**Last Updated:** Nov 4, 2025

---

## Testing Instructions

For each test case below:
1. Start a new conversation
2. Submit the test input exactly as written
3. Evaluate the AI's response against the validation criteria
4. Document results in the "Test Results" section
5. Mark ✅ (pass) or ❌ (fail) with notes

---

## Test Categories

### 1. Simple Arithmetic

**Purpose:** Verify the tutor doesn't give direct answers to basic calculations.

#### Test Case 1.1: Addition
**Input:** `What is 12 + 8?`

**Expected Behavior:**
- ✅ Asks guiding questions like "What operation is this?" or "Can you try adding these together?"
- ✅ Does NOT say "It's 20" or "The answer is 20"
- ✅ May ask student to break it down or visualize it
- ✅ Encourages student to attempt the calculation

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Uses guiding questions
- [ ] Encouraging tone
- [ ] Validates student's final answer when they provide it

---

#### Test Case 1.2: Division
**Input:** `What is 24 ÷ 6?`

**Expected Behavior:**
- ✅ Asks "What does division mean?" or "How can we think about this?"
- ✅ May suggest visualization (24 items split into 6 groups)
- ✅ Does NOT say "It's 4"
- ✅ Guides student to the answer through questioning

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Uses guiding questions
- [ ] May use concrete examples
- [ ] Encouraging language

---

### 2. Linear Equations

**Purpose:** Ensure the tutor breaks down multi-step problems systematically.

#### Test Case 2.1: Two-Step Equation
**Input:** `Help me solve 2x + 5 = 13`

**Expected Behavior:**
- ✅ Asks "What are we solving for?" (identifies variable)
- ✅ Breaks into phases: "First, what should we undo?"
- ✅ Guides isolation: "What's being added to 2x?" → "How do we undo addition?"
- ✅ Helps with second step: "Now we have 2x = 8, how do we get x by itself?"
- ✅ Asks student to verify: "Let's check by plugging x = 4 back in"
- ✅ Does NOT directly say "x = 4"

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Breaks problem into clear steps
- [ ] Asks guiding questions for each step
- [ ] Encourages verification at the end
- [ ] Uses encouraging language ("Great!", "You're on the right track!")

---

#### Test Case 2.2: Equation with Negative Numbers
**Input:** `Solve 3x - 7 = 20`

**Expected Behavior:**
- ✅ Guides student to identify what to undo first
- ✅ Helps with negative number handling
- ✅ Step-by-step isolation of variable
- ✅ Verification step at the end
- ✅ Does NOT say "x = 9" directly

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Handles negative numbers with guidance
- [ ] Clear step breakdown
- [ ] Verification encouraged

---

### 3. Quadratic Equations

**Purpose:** Validate handling of more complex algebraic concepts.

#### Test Case 3.1: Factoring Quadratic
**Input:** `Solve x² + 5x + 6 = 0`

**Expected Behavior:**
- ✅ Asks "What method could we use to solve this?" (factoring, quadratic formula, completing the square)
- ✅ If student chooses factoring: "What two numbers multiply to 6 and add to 5?"
- ✅ Guides through factoring: "So we have (x + 2)(x + 3) = 0"
- ✅ Explains zero product property: "If the product is zero, what can we say about the factors?"
- ✅ Does NOT directly give factors or solutions
- ✅ Helps student find x = -2 and x = -3 through questioning

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Offers method choices
- [ ] Guides through chosen method
- [ ] Explains concepts (zero product property)
- [ ] Helps student discover both solutions

---

### 4. Geometry

**Purpose:** Test visual/spatial problem guidance.

#### Test Case 4.1: Circle Area
**Input:** `Find the area of a circle with radius 5`

**Expected Behavior:**
- ✅ Asks "What formula do we use for the area of a circle?"
- ✅ If student doesn't know: "The formula involves π and the radius. Do you know it?"
- ✅ Breaks down formula: "What does πr² mean?"
- ✅ Guides calculation: "What is 5²?" then "What is π times that?"
- ✅ Does NOT say "78.5 square units" or "25π square units" directly
- ✅ May discuss exact vs. approximate answers

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Asks about formula knowledge
- [ ] Breaks down formula components
- [ ] Guides calculation step-by-step
- [ ] Discusses mathematical concepts (exact vs. approximate)

---

### 5. Word Problems

**Purpose:** Verify problem comprehension and equation setup guidance.

#### Test Case 5.1: Speed Problem
**Input:** `A train travels 120 miles in 2 hours. What's its speed?`

**Expected Behavior:**
- ✅ Asks "What information do we have?" or "What are we looking for?"
- ✅ Guides student to identify knowns: distance = 120 miles, time = 2 hours
- ✅ Asks "What's the relationship between distance, speed, and time?"
- ✅ Helps student recall or derive: speed = distance ÷ time
- ✅ Guides setup: "Can you write an equation with what we know?"
- ✅ Does NOT say "60 mph" directly

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Helps identify given information
- [ ] Guides to relevant formula/relationship
- [ ] Helps student set up equation
- [ ] Encourages student to solve final step

---

#### Test Case 5.2: Multi-Step Word Problem
**Input:** `Sarah has 3 times as many books as Tom. Together they have 24 books. How many books does each person have?`

**Expected Behavior:**
- ✅ Asks "What are we trying to find?"
- ✅ Guides variable definition: "Let's call Tom's books x. How many does Sarah have?"
- ✅ Helps set up equation: "If we add their books together, what do we get?"
- ✅ Guides solving: x + 3x = 24
- ✅ Helps interpret: "We found x = 6, what does this mean for each person?"
- ✅ Does NOT directly state the answer

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Guides variable definition
- [ ] Helps translate words to math
- [ ] Step-by-step equation solving
- [ ] Helps interpret solution in context

---

### 6. Multi-Step Problems

**Purpose:** Test handling of complex, multi-operation problems.

#### Test Case 6.1: Distribution and Solving
**Input:** `If 3(x + 2) = 18, what is x?`

**Expected Behavior:**
- ✅ Asks "What approach could we take?" (distribute or divide both sides)
- ✅ If distributing: "What is 3 times (x + 2)?"
- ✅ Guides simplification: "So we have 3x + 6 = 18, now what?"
- ✅ If dividing: "What happens if we divide both sides by 3?"
- ✅ Guides to final answer through questioning
- ✅ Does NOT skip to "x = 4"
- ✅ Validates answer: "Let's check: does 3(4 + 2) = 18?"

**Validation Criteria:**
- [ ] No direct answer given
- [ ] Presents multiple valid approaches
- [ ] Guides through chosen method
- [ ] Clear step breakdown
- [ ] Verification step included

---

## General Validation Criteria (Apply to ALL Tests)

For each test, verify the AI demonstrates:

### Socratic Method
- [ ] Asks guiding questions instead of lecturing
- [ ] Leads student to discover answers
- [ ] Doesn't provide direct solutions
- [ ] Uses questions to check understanding

### Problem Breakdown
- [ ] Breaks complex problems into manageable steps
- [ ] Explicitly states or numbers steps when helpful
- [ ] Progresses logically through the solution

### Encouragement
- [ ] Uses positive, encouraging language
- [ ] Phrases like "Great thinking!", "You're on the right track!", "Let's work through this together"
- [ ] Celebrates progress and correct steps
- [ ] Maintains patience with mistakes

### Error Handling
- [ ] When student makes a mistake, asks them to check their work
- [ ] Guides toward the error without pointing it out directly
- [ ] Uses phrases like "Let's verify this step..." or "Does that make sense when we check it?"
- [ ] Maintains encouraging tone even when correcting

### Concept Explanation
- [ ] Explains "why" behind methods, not just "how"
- [ ] Connects to prior knowledge when relevant
- [ ] Uses appropriate mathematical terminology
- [ ] Provides context or real-world connections when helpful

### Verification
- [ ] Encourages checking the final answer
- [ ] Guides substitution back into original equation
- [ ] Asks "Does this make sense?"
- [ ] Validates student's correct work enthusiastically

---

## Test Results Log

### Test Run: [Date: ______]

**Tester:** _______________

**Environment:**
- Conversation ID: _______________
- System Prompt Version: _______________

---

#### Test Case 1.1: Simple Addition (12 + 8)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 1.2: Simple Division (24 ÷ 6)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 2.1: Linear Equation (2x + 5 = 13)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 2.2: Linear Equation with Negatives (3x - 7 = 20)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 3.1: Quadratic Equation (x² + 5x + 6 = 0)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 4.1: Circle Area (radius 5)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 5.1: Speed Word Problem
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 5.2: Multi-Step Word Problem (Sarah & Tom books)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

#### Test Case 6.1: Distribution Problem (3(x + 2) = 18)
**Result:** ⬜ Pass / ⬜ Fail

**AI Response Summary:**
```
[Record first 2-3 exchanges here]
```

**Notes:**
-

**Issues Found:**
-

---

## Overall Test Summary

**Total Tests:** 9
**Passed:** ___
**Failed:** ___
**Pass Rate:** ___%

### Critical Issues Found:
1.
2.
3.

### Recommendations:
1.
2.
3.

### System Prompt Changes Needed:
1.
2.
3.

---

## Regression Testing

When making changes to the system prompt, re-run ALL test cases to ensure:
- No new failures introduced
- Pass rate maintained or improved
- New features don't break Socratic approach

**Baseline Pass Rate:** ___% (from initial MVP testing)
**Current Pass Rate:** ___%
**Change:** ___% (improvement/regression)
