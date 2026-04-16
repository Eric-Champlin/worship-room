# Implementation Plan: Starting Point Quiz

**Spec:** `_specs/starting-point-quiz.md`
**Date:** 2026-02-24
**Branch:** `claude/feature/starting-point-quiz`

---

## Architecture Context

### Existing File Structure
- Landing page sections live in `frontend/src/components/` as standalone components (e.g., `HeroSection.tsx`, `JourneySection.tsx`, `GrowthTeasersSection.tsx`)
- Tests live in `frontend/src/components/__tests__/ComponentName.test.tsx`
- Components are exported via `frontend/src/components/index.ts`
- All sections are composed in `frontend/src/pages/Home.tsx`
- `frontend/src/hooks/useInView.ts` provides the Intersection Observer hook for fade-in animations
- `frontend/src/lib/utils.ts` provides the `cn()` utility for conditional Tailwind classes

### Patterns to Follow
- **Heading accent**: Caveat font via inline `style={{ fontFamily: "'Caveat', cursive", color: '#8B5CF6' }}` on a `<span>` wrapping the accent word (see `GrowthTeasersSection.tsx:165-173` and `JourneySection.tsx:174-183`)
- **Fade-in animation**: `useInView` hook → conditional classes `inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'` with `transition-all duration-500 ease-out` (see `JourneySection.tsx:197-205`)
- **Gradient transitions**: Dedicated `<div>` with `h-32 sm:h-40` and inline `background: 'linear-gradient(...)'` style (see `GrowthTeasersSection.tsx:146-151`)
- **Section semantics**: `<section aria-labelledby="heading-id">` with a heading that has the matching `id` (see `GrowthTeasersSection.tsx:144,161`)
- **CTA buttons**: `cn()` with Tailwind classes for primary violet button styling + focus-visible ring (see `GrowthTeasersSection.tsx:227-231`)
- **Tests**: Vitest + RTL, `MemoryRouter` wrapper, `describe/it/expect`, `screen.getByRole` preferred, `data-testid` for non-semantic queries (see `GrowthTeasersSection.test.tsx`)
- **IntersectionObserver mock**: Test setup (`test/setup.ts:18-37`) immediately triggers `isIntersecting: true`, so `inView` is always `true` in tests

### Key Integration Points
- `Home.tsx:15` has `<div id="quiz" />` placeholder — replace with `<StartingPointQuiz />`
- `HeroSection.tsx:40-52` has quiz teaser that scrolls to `#quiz` — already works, just needs the section to exist
- `GrowthTeasersSection.tsx` ends with a solid `#251248` purple background and `pb-20 sm:pb-24` padding — the quiz section gradient must start from this color
- `JourneySection` has `aria-labelledby="journey-heading"` — the "explore all features" link will scroll to this section

### No Backend/Database Changes
This feature is 100% client-side React. No API endpoints, no database tables, no backend changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] On branch `claude/feature/starting-point-quiz`
- [x] `<div id="quiz" />` placeholder exists in `Home.tsx:15`
- [x] Hero quiz teaser already scrolls to `#quiz` (implemented in `HeroSection.tsx`)
- [x] `GrowthTeasersSection` ends with `#251248` purple background
- [x] `useInView` hook exists and is tested
- [x] `cn()` utility exists at `@/lib/utils`
- [x] Vitest + RTL test infrastructure is set up with IntersectionObserver mock
- [x] Caveat font is loaded (used in JourneySection and GrowthTeasersSection)
- [x] Lora font is loaded (configured in Tailwind config as `font-serif`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put quiz data | Separate `quiz-data.ts` file in `frontend/src/components/` | Keeps component file focused on rendering; makes data easy to modify independently |
| Scoring recalculation on back | Store selected answer index per question in state, recalculate scores from scratch on every change | Simpler and less error-prone than incremental add/subtract |
| Auto-advance delay | 400ms `setTimeout` after selection | Spec requirement; long enough to see selection feedback, short enough to feel responsive |
| Slide animation approach | CSS `transform: translateX()` with `transition` on a wrapper div, track slide direction in state | Pure CSS, no animation library needed, consistent with existing transition patterns |
| GrowthTeasers bottom color | Gradient starts from `#251248` (the actual GrowthTeasers background) not `#0D0620` | The spec says "Hero Dark (#0D0620)" but GrowthTeasers actually uses `#251248`. Use the actual color for a seamless transition. |
| JourneySection scroll target | `document.getElementById('journey-heading')?.scrollIntoView({ behavior: 'smooth' })` | JourneySection has `id="journey-heading"` on its h2; scrolling there puts the Journey steps in view |
| Progress bar accessibility | `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` | Required for screen reader support per WCAG |
| Answer option keyboard access | Use `<button>` elements for each option | Native keyboard support (Enter/Space to select), focus management |
| Result card CTA | `<Link to={route}>` from react-router-dom | Consistent with existing CTA patterns (e.g., GrowthTeasersSection register link) |

---

## Implementation Steps

### Step 1: Create Quiz Data File

**Objective:** Define all quiz questions, answer options, point mappings, and result destinations as typed constants in a dedicated data file.

**Files to create:**
- `frontend/src/components/quiz-data.ts` — All quiz constants and types

**Details:**

Define these TypeScript types:
```typescript
type FeatureKey = 'pray' | 'journal' | 'meditate' | 'music' | 'sleepRest' | 'prayerWall' | 'localSupport'

interface QuizOption {
  label: string
  points: Partial<Record<FeatureKey, number>>
}

interface QuizQuestion {
  question: string
  options: QuizOption[]
}

interface QuizDestination {
  key: FeatureKey
  name: string
  route: string
  ctaLabel: string
  description: string
  verse: string
  verseReference: string
}
```

Define constants:
- `QUIZ_QUESTIONS: QuizQuestion[]` — 5 questions with 4 options each, point values exactly as specified in CLAUDE.md "Starting Point Quiz Flow"
- `QUIZ_DESTINATIONS: QuizDestination[]` — 7 destinations with name, route, CTA label, description, verse, and verse reference exactly as specified in CLAUDE.md
- `FEATURE_KEYS: FeatureKey[]` — ordered array with 'pray' first (for tiebreaker)

Define pure function:
- `calculateResult(answers: (number | null)[]): QuizDestination` — Takes an array of 5 selected answer indices (or null for unanswered), sums points across all answered questions, returns the destination with the highest score. Tiebreaker: 'pray' wins ties (iterate `FEATURE_KEYS` in order, 'pray' is first, so the first max encountered wins).

**Guardrails (DO NOT):**
- Do NOT import React or any UI libraries — this is a pure data/logic file
- Do NOT use any side effects or state — pure functions and constants only
- Do NOT deviate from the exact question text, option text, or point values in CLAUDE.md

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `calculateResult returns Pray for all-first-option answers` | unit | Select option 0 for all 5 questions → verify result is Pray destination |
| `calculateResult returns Journal when journal-heavy answers selected` | unit | Select options that maximize journal points → verify Journal destination |
| `calculateResult returns Pray on tiebreaker` | unit | Construct answers that produce equal top scores for pray and another feature → verify Pray wins |
| `calculateResult handles null answers` | unit | Pass array with some null entries → verify it still returns a valid destination |
| `calculateResult returns each of the 7 destinations` | unit | For each destination, find an answer combination that produces it and verify |
| `QUIZ_QUESTIONS has exactly 5 questions` | unit | Verify array length |
| `Each question has exactly 4 options` | unit | Verify all questions have 4 options |
| `QUIZ_DESTINATIONS has exactly 7 entries` | unit | Verify array length |

**Expected state after completion:**
- [ ] `quiz-data.ts` exports types, constants, and `calculateResult` function
- [ ] All data matches CLAUDE.md exactly

---

### Step 2: Create StartingPointQuiz Component

**Objective:** Build the full quiz UI component with progress bar, question display, answer selection with auto-advance, back navigation, slide animations, and result card.

**Files to create:**
- `frontend/src/components/StartingPointQuiz.tsx` — Main quiz component

**Details:**

**Component state (all `useState`):**
- `currentQuestion: number` — 0-indexed, 0–4 for questions, 5 for result
- `answers: (number | null)[]` — array of 5 entries, initially all `null`
- `slideDirection: 'left' | 'right'` — controls animation direction

**Section wrapper:**
```tsx
<section id="quiz" aria-labelledby="quiz-heading">
```

**Gradient transition div** (same pattern as `GrowthTeasersSection.tsx:146-151`):
- `h-32 sm:h-40` div with `background: 'linear-gradient(to bottom, #251248 0%, #FFFFFF 100%)'`
- This sits at the very top of the section, before the white content area

**White content area:**
- `bg-white` (or `bg-neutral-bg`) with `px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-24`
- Centered heading + quiz card inside `mx-auto max-w-5xl`

**Heading** (follow `GrowthTeasersSection.tsx:160-178` pattern):
- h2 with `id="quiz-heading"`: "Not Sure Where to " + `<span>` with Caveat font for "Start" + "?"
- Caveat span: `style={{ fontFamily: "'Caveat', cursive", color: '#6D28D9' }}` (Primary violet, matching JourneySection accent color, NOT Primary Light)
- Subheading `<p>` in `text-text-light`: "Take a 30-second quiz and we'll point you in the right direction."
- Text colors: `text-text-dark` for heading (since on white background, unlike GrowthTeasers which uses white on purple)

**Quiz card container:**
- `mx-auto max-w-[600px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-md`

**Progress bar** (inside card, at top):
- Outer: `h-1.5 w-full bg-gray-100` (thin track)
- Inner: `h-full bg-primary rounded-full` with `style={{ width: '${(currentQuestion + 1) * 20}%' }}` and `transition: width 300ms ease`
- Add `role="progressbar"` with `aria-valuenow={(currentQuestion + 1) * 20}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Quiz progress"`
- Below: `<p>` with "Question {currentQuestion + 1} of 5" in `text-sm text-text-light` centered, with `mt-3 mb-2` padding
- When on result card (currentQuestion === 5), hide progress bar and question counter

**Question display area** (inside card, below progress):
- Wrapper div with `relative overflow-hidden` to clip slides
- Inner animated div with `transition: transform 300ms ease-out` and `transform: translateX(...)` based on slide direction
- Question text: `<h3>` with `text-lg font-semibold text-text-dark mb-4 sm:mb-6 px-6`

**Answer options** (4 buttons per question):
- Use `<button>` elements (not radio inputs)
- Container: `flex flex-col gap-3 px-6 pb-6`
- Each button: `w-full rounded-xl border p-4 text-left text-sm sm:text-base transition-all duration-200`
- Unselected: `border-gray-200 bg-gray-50 hover:border-primary/30 hover:bg-primary/5`
- Selected: `border-primary bg-[#8B5CF620]` with a `Check` icon (from lucide-react) at the right side
- On click:
  1. Update `answers[currentQuestion]` to the selected index
  2. Set `slideDirection` to `'left'`
  3. After 400ms delay (`setTimeout`), increment `currentQuestion`
  4. If this was question 4 (0-indexed), set `currentQuestion` to 5 (result)

**Back button:**
- Below question counter or above question text: `<button>` with `ArrowLeft` icon + "Back" text
- `text-sm text-text-light hover:text-text-dark transition-colors`
- Hidden when `currentQuestion === 0`
- On click: set `slideDirection` to `'right'`, decrement `currentQuestion`
- Visible but do NOT show on result card (result has "Retake Quiz" instead)

**Slide animation approach:**
- Use a key-based approach: wrap the question content in a div with `key={currentQuestion}`
- Apply CSS animation classes based on `slideDirection`:
  - Advancing (left): new question slides in from right
  - Going back (right): previous question slides in from left
- Use Tailwind `@keyframes` or inline style for the slide. Simplest approach: CSS `animation` with two keyframes defined in a `<style>` tag or via Tailwind config. Alternatively, use a transition group pattern with `translate-x` classes.
- **Recommended simple approach**: Use `transform` + `transition` on a container that shifts position, OR use React's key-based remount with CSS `@keyframes slide-in-left` / `slide-in-right` animations.

**Result card** (when `currentQuestion === 5`):
- Call `calculateResult(answers)` to get the winning destination
- Slides in from right (same animation)
- Content inside the same card container (replaces question content):
  - Headline: `<h3>` "We'd recommend starting with {destination.name}" in `text-xl font-bold text-text-dark px-6 pt-6`
  - Description: `<p>` in `text-text-light px-6 mt-3`
  - Scripture verse: `<blockquote>` with `font-serif italic text-text-dark px-6 mt-4` — verse text in quotes, reference below in `text-sm text-text-light font-sans not-italic`
  - Primary CTA: `<Link to={destination.route}>` styled as primary violet button (follow `GrowthTeasersSection.tsx:227-231` pattern) with text "Go to {destination.ctaLabel}". Centered, `mx-6 mt-6 block text-center`.
  - Secondary link: `<button>` "Or explore all features ↑" in `text-sm text-text-light hover:text-primary mt-3 text-center`. On click: `document.getElementById('journey-heading')?.scrollIntoView({ behavior: 'smooth' })`
  - Retake: `<button>` "Retake Quiz" in `text-sm text-primary hover:underline mt-2 mb-6 text-center`. On click: reset `answers` to all nulls, set `currentQuestion` to 0, set `slideDirection` to `'right'`.
  - All centered in the card.

**Fade-in on scroll:**
- Use `useInView` hook on the section or the heading area (same as other sections)
- Apply `inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'` with `transition-all duration-700 ease-out`

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` anywhere
- Do NOT persist any quiz state to localStorage, cookies, or any external store
- Do NOT add analytics tracking on quiz answers
- Do NOT use raw `<input type="radio">` — use `<button>` elements for answer options
- Do NOT forget to clear the 400ms timeout on unmount or when going back (use cleanup in `useEffect` or a ref to track the timeout)
- Do NOT use `outline-none` without a visible focus replacement — use `focus-visible:ring-2 focus-visible:ring-primary`
- Do NOT hardcode quiz data in JSX — import from `quiz-data.ts`

**Expected state after completion:**
- [ ] Component renders the quiz section with gradient, heading, card, progress bar, and questions
- [ ] Answer selection works with auto-advance
- [ ] Back navigation works
- [ ] Result card displays after Q5
- [ ] Retake resets to Q1
- [ ] CTA links to correct route
- [ ] Scroll-to-journey works

---

### Step 3: Integrate Component into Home.tsx and Exports

**Objective:** Wire the new component into the landing page and component barrel export.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — Replace quiz placeholder with component
- `frontend/src/components/index.ts` — Add export

**Details:**

**Home.tsx changes:**
1. Add import: `import { StartingPointQuiz } from '@/components/StartingPointQuiz'`
2. Replace line 14-15 (`{/* Quiz placeholder... */}` and `<div id="quiz" />`) with `<StartingPointQuiz />`

Final Home.tsx should look like:
```tsx
import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { JourneySection } from '@/components/JourneySection'
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <Navbar transparent />
      <main>
        <HeroSection />
        <JourneySection />
        <GrowthTeasersSection />
        <StartingPointQuiz />
      </main>
    </div>
  )
}
```

**index.ts changes:**
Add `export { StartingPointQuiz } from './StartingPointQuiz'` (alphabetical order, after `Navbar`).

**Guardrails (DO NOT):**
- Do NOT remove or modify any other imports or sections in Home.tsx
- Do NOT change the GrowthTeasersSection component itself

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|

No new tests for this step — integration is verified by the component tests in Step 4.

**Expected state after completion:**
- [ ] `Home.tsx` imports and renders `StartingPointQuiz` after `GrowthTeasersSection`
- [ ] `index.ts` exports the new component
- [ ] `pnpm build` succeeds with no errors

---

### Step 4: Write Tests

**Objective:** Comprehensive test suite for the quiz data logic and the quiz component.

**Files to create:**
- `frontend/src/components/__tests__/quiz-data.test.ts` — Unit tests for scoring logic and data constants
- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — Component tests

**Details:**

**quiz-data.test.ts** (pure unit tests, no React):

```typescript
import { describe, it, expect } from 'vitest'
import { QUIZ_QUESTIONS, QUIZ_DESTINATIONS, calculateResult } from '@/components/quiz-data'
```

Tests:
1. `QUIZ_QUESTIONS has exactly 5 questions` — verify length
2. `Each question has exactly 4 options` — iterate and verify
3. `QUIZ_DESTINATIONS has exactly 7 entries` — verify length
4. `Each destination has required fields` — verify name, route, description, verse, verseReference are non-empty strings
5. `calculateResult returns Pray when first options selected` — `[0, 0, 0, 0, 0]` → verify result key
6. `calculateResult returns correct result for journal-heavy answers` — Select options that maximize journal: `[1, 2, 1, 0, 0]` → verify Journal
7. `calculateResult returns correct result for music-heavy answers` — Select options that maximize music: `[2, 0, 3, 1, 1]` → verify Music
8. `calculateResult returns correct result for meditate-heavy answers` — Select options that maximize meditate: `[1, 1, 2, 2, 2]` → verify Meditate
9. `calculateResult returns Pray on tiebreaker` — Find answer combination producing a tie including pray → verify Pray wins
10. `calculateResult handles all-null answers` — `[null, null, null, null, null]` → verify returns Pray (0 scores, tiebreaker)
11. `calculateResult handles partial answers` — `[0, null, 2, null, 3]` → verify returns valid destination
12. `All 7 destinations are reachable` — For each destination, construct answers that produce it and verify

**StartingPointQuiz.test.tsx** (component tests):

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
```

Helper:
```typescript
function renderQuiz() {
  return render(
    <MemoryRouter>
      <StartingPointQuiz />
    </MemoryRouter>
  )
}
```

Tests:

*Structure & Semantics:*
1. `renders as a named section landmark` — `screen.getByRole('region', { name: /not sure where to start/i })`
2. `renders the heading with Caveat "Start" accent` — verify heading level 2 exists with text
3. `renders the subheading` — verify "Take a 30-second quiz" text
4. `has id="quiz" on the section` — verify `document.getElementById('quiz')` exists
5. `renders progress bar with correct ARIA attributes` — verify `role="progressbar"` with `aria-valuenow="20"`, `aria-valuemin="0"`, `aria-valuemax="100"`
6. `shows "Question 1 of 5" initially` — verify text

*Question Display:*
7. `displays first question text` — verify Q1 question text from QUIZ_QUESTIONS
8. `displays 4 answer options as buttons` — `screen.getAllByRole('button')` filtered to answer buttons, verify length
9. `back button is hidden on first question` — verify no "Back" button visible

*User Interaction:*
10. `selecting an answer highlights it` — click an option → verify it gets selected styling (check for aria-pressed or visual indicator)
11. `selecting an answer auto-advances to next question after delay` — click option → use `vi.advanceTimersByTime(400)` or `waitFor` → verify Q2 text appears and "Question 2 of 5"
12. `progress bar updates on advance` — after advancing → verify `aria-valuenow="40"`
13. `back button appears on question 2` — after advancing → verify "Back" button exists
14. `clicking back returns to previous question` — advance to Q2 → click Back → verify Q1 text and "Question 1 of 5"
15. `going back preserves previous answer selection` — select option on Q1, advance, go back → verify option is still selected
16. `changing answer on back navigation updates correctly` — select option A on Q1, advance to Q2, go back, select option B → advance through remaining → verify result reflects option B

*Result Card:*
17. `shows result card after completing all 5 questions` — answer all 5 → verify "We'd recommend starting with" text appears
18. `result card shows correct destination name` — answer all 5 with known answers → verify expected destination name
19. `result card shows description text` — verify description paragraph exists
20. `result card shows scripture verse in serif font` — verify verse text exists
21. `result card CTA links to correct route` — verify Link `href` matches expected destination route
22. `result card "explore all features" scrolls to journey` — mock `getElementById` and `scrollIntoView` → click → verify called with `journey-heading`
23. `retake quiz resets to question 1` — complete quiz → click "Retake Quiz" → verify Q1 appears, "Question 1 of 5", progress bar at 20%
24. `progress bar and question counter hidden on result card` — complete quiz → verify "Question X of 5" not visible

*Accessibility:*
25. `answer buttons are keyboard accessible` — verify buttons are focusable
26. `progress bar has accessible label` — verify `aria-label="Quiz progress"` or similar

**Important test notes:**
- For auto-advance tests, use `vi.useFakeTimers()` in a `beforeEach` and `vi.useRealTimers()` in `afterEach`, with `vi.advanceTimersByTime(400)` to trigger the delay
- Wrap state updates in `act()` when using fake timers
- The IntersectionObserver mock in `test/setup.ts` ensures `inView` is always `true`, so fade-in animations won't block rendering

**Guardrails (DO NOT):**
- Do NOT test implementation details (internal state values) — test observable behavior
- Do NOT skip the MemoryRouter wrapper — Links require router context
- Do NOT use `getByTestId` when a semantic query (`getByRole`, `getByText`) is available

**Expected state after completion:**
- [ ] `pnpm test` passes all quiz data tests
- [ ] `pnpm test` passes all component tests
- [ ] No test warnings or console errors

---

### Step 5: Verify Build and Lint

**Objective:** Ensure the complete feature builds, lints, and all tests pass.

**Files to modify:** None (verification only)

**Details:**

Run in order:
1. `cd frontend && pnpm build` — verify no TypeScript or build errors
2. `cd frontend && pnpm lint` — verify no ESLint errors
3. `cd frontend && pnpm test` — verify all tests pass (including existing tests unaffected)

**Guardrails (DO NOT):**
- Do NOT suppress or ignore lint warnings — fix them
- Do NOT skip running existing tests — verify no regressions

**Expected state after completion:**
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (all suites, including pre-existing)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create quiz data file (types, constants, scoring function) |
| 2 | 1 | Create StartingPointQuiz component |
| 3 | 2 | Integrate into Home.tsx and barrel export |
| 4 | 1, 2, 3 | Write tests for data logic and component |
| 5 | 1, 2, 3, 4 | Verify build, lint, and all tests pass |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create quiz data file | [COMPLETE] | 2026-02-24 | Created `frontend/src/components/quiz-data.ts` with types, 5 questions, 7 destinations, FEATURE_KEYS, and calculateResult function |
| 2 | Create StartingPointQuiz component | [COMPLETE] | 2026-02-24 | Created `frontend/src/components/StartingPointQuiz.tsx` with gradient, heading, progress bar, question cards, answer selection with auto-advance, back navigation, slide animations, result card with CTA/retake |
| 3 | Integrate into Home.tsx and exports | [COMPLETE] | 2026-02-24 | Updated `Home.tsx` (replaced placeholder with component) and `index.ts` (added export) |
| 4 | Write tests | [COMPLETE] | 2026-02-24 | Created `quiz-data.test.ts` (15 tests) and `StartingPointQuiz.test.tsx` (25 tests). Fixed pre-existing GrowthTeasersSection test (wrong reassurance text regex). All 137 tests pass. |
| 5 | Verify build and lint | [COMPLETE] | 2026-02-24 | Build passes, lint clean, 137/137 tests pass, browser verification confirmed: gradient, heading, progress bar, 5 questions, auto-advance, result card, retake all working |
