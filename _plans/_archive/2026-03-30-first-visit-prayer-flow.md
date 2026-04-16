# Implementation Plan: First-Visit Prayer Flow

**Spec:** `_specs/first-visit-prayer-flow.md`
**Date:** 2026-03-30
**Branch:** `claude/feature/first-visit-prayer-flow`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before the Round 2 dark theme redesign and inner-page hero redesign (~2026-03-25). Ask page dark theme values come from codebase inspection of `AskPage.tsx`, not the recon.

---

## Architecture Context

### Relevant Files and Current State

| File | Role | Lines | Key Auth Details |
|------|------|-------|------------------|
| `frontend/src/components/HeroSection.tsx` | Landing page hero with TypewriterInput | 169 | Lines 83-84: `useAuth()` + `useAuthModal()`. Lines 91-96: `handleInputSubmit` checks `isAuthenticated`, opens auth modal if false, navigates to `/ask?q=` if true |
| `frontend/src/pages/AskPage.tsx` | Ask page — textarea, mock AI response, conversation thread | 368 | Line 33: `useAuth()`. Lines 63-66: `handleSubmit` gates on `isAuthenticated`. Lines 93-103: `?q=` auto-submit only fires when `isAuthenticated`. Lines 134-137: `handleFollowUpClick` gates on `isAuthenticated`. Lines 177-198: `handleFeedback` stores to localStorage only when `isAuthenticated` |
| `frontend/src/components/ask/AskResponseDisplay.tsx` | Response display with verse cards, action buttons, feedback | 212 | No direct auth checks — all callbacks are passed from AskPage. Action buttons: Ask another, Journal, Pray, Share (lines 103-155). Feedback: thumbs up/down (lines 158-206). Follow-ups via `DigDeeperSection` |
| `frontend/src/components/daily/CrisisBanner.tsx` | Crisis keyword detection + resource display | 55 | **No auth dependency** — props are `{ text: string }`, displays for all users. Uses `containsCrisisKeyword()` from `@/constants/crisis-resources` |
| `frontend/src/components/prayer-wall/AuthModalProvider.tsx` | Auth modal context provider | 45 | `openAuthModal(subtitle?: string, initialView?: 'login' \| 'register')`. Used as `authModal?.openAuthModal('message')` |
| `frontend/src/components/prayer-wall/AuthModal.tsx` | Auth modal UI shell | 361 | Phase 2 placeholder — shows "Authentication coming soon" toast. Props: `isOpen, onClose, onShowToast, subtitle?, initialView?` |
| `frontend/src/mocks/ask-mock-data.ts` | Mock AI responses | — | `getAskResponse(question: string): AskResponse` — keyword-matched to 16 topic buckets, fallback response |
| `frontend/src/pages/__tests__/AskPage.test.tsx` | Ask page tests | 854 | 40+ tests covering structure, input, chips, submit, crisis, auth gating, loading, response, actions, feedback, URL params, conversation thread, accessibility |

### Component Composition (AskPage)

```
AskPage
├── PageHero
├── CrisisBanner (text-driven, no auth dependency)
├── Topic Chips (6 starter phrases)
├── Submit Button ("Find Answers")
├── PopularTopicsSection (5 topics with starter questions)
└── Conversation Thread
    ├── UserQuestionBubble
    └── AskResponseDisplay
        ├── Direct answer paragraphs
        ├── "What Scripture Says" (3 verse cards with VerseCardActions)
        ├── Encouragement callout
        ├── Suggested prayer
        ├── AI disclaimer
        ├── DigDeeperSection (3 follow-up chips)
        ├── Action Buttons (Ask another, Journal, Pray, Share)
        └── Feedback Row (thumbs up/down)
```

### Patterns to Follow

- **Auth gating pattern**: `const { isAuthenticated } = useAuth(); const authModal = useAuthModal(); if (!isAuthenticated) { authModal?.openAuthModal('message'); return; }` — used in HeroSection.tsx:91-96, AskPage.tsx:63-66
- **Test wrapping**: `<MemoryRouter>` → `<ToastProvider>` → `<AuthModalProvider>` → `<Routes>` → component. Auth mock via `vi.hoisted()` + `vi.mock('@/hooks/useAuth')` + `vi.mock('@/contexts/AuthContext')`
- **Frosted glass card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (Dashboard Card Pattern from `09-design-system.md`)
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-full` (rounded variant for standalone CTAs)
- **Fade-in animation**: `animate-fade-in` class (500ms opacity + slide up)

### Directory Conventions

- Components: `frontend/src/components/ask/` for Ask-specific components
- Tests: `__tests__/` subdirectory within the component directory
- Page tests: `frontend/src/pages/__tests__/`

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Hero input submit | No gate (all users navigate to `/ask?q=`) | Step 1 | Remove existing auth check |
| First AI response generation | No gate (response displays for all users) | Step 2 | Remove `isAuthenticated` condition from auto-submit and submit handler |
| Copy response | No gate | Step 3 | Verify no auth check exists (currently none — Share handler uses clipboard) |
| Share response | No gate | Step 3 | Verify no auth check exists (currently none) |
| Follow-up question | Auth-gated: "Sign in to continue the conversation" | Step 3 | Existing `handleFollowUpClick` auth check preserved |
| Follow-up chip click | Auth-gated: "Sign in to continue the conversation" | Step 3 | Existing `handleFollowUpClick` auth check — update message |
| Journal about this CTA | Auth-gated: "Sign in to save journal entries" | Step 3 | New auth check in `handleJournal` |
| Pray about this CTA | Auth-gated: "Sign in to generate prayers" | Step 3 | New auth check in `handlePray` |
| Thumbs up/down feedback | Auth-gated: "Sign in to give feedback" | Step 3 | New auth check in `handleFeedback` — show auth modal instead of allowing click |
| Save conversation | Auth-gated: "Sign in to save conversations" | Step 3 | Existing `SaveConversationButton` — add auth check |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Conversion card container | background/border | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | `09-design-system.md` Dashboard Card Pattern |
| Conversion card padding | padding | `p-6` desktop, `p-4` mobile (`p-4 sm:p-6`) | Spec + Dashboard Card Pattern |
| Conversion card heading | font | Inter 18px (text-lg) 600 (font-semibold) white | Spec: `text-white font-semibold text-lg` |
| Conversion card body | font | Inter 14px (text-sm) 400 white/70 | Spec: `text-white/70 text-sm` |
| CTA button | style | `bg-primary text-white rounded-full px-6 py-3 font-semibold` | Spec + design-system.md Primary CTA (rounded) |
| Secondary link | style | `text-primary-lt text-sm hover:underline` | Spec |
| Fade-in animation | class | `animate-fade-in` (500ms) | `09-design-system.md` Custom Animations |
| Ask page background | class | `bg-dashboard-dark` | AskPage.tsx:207 (codebase inspection) |
| Ask page content width | class | `max-w-2xl` | AskPage.tsx:214 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for decorative script headings, not Lora
- Lora (`font-serif`) is for scripture text and italic journal prompts
- Dashboard Card Pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Primary CTA (rounded): `bg-primary text-white font-semibold py-3 px-8 rounded-full`
- `animate-fade-in` is 500ms opacity + translate-y animation
- All Ask page content uses `max-w-2xl` container width
- Ask page uses `bg-dashboard-dark` background (dark theme)
- Action buttons use: `bg-white/10 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/15`
- Conversion card heading is Inter (not Caveat) — it's body copy, not a hero heading
- Touch targets: 44px minimum (`min-h-[44px]`) on all interactive elements

---

## Shared Data Models (from Master Plan)

Not applicable — standalone feature.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_chat_feedback` | Write (logged-in only) | Feedback entries — existing behavior unchanged |

No new localStorage keys introduced. Conversion prompt dismissal uses React state only (per spec).

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Hero input full-width. Ask page response stacks vertically. Conversion card full-width `p-4`. Action buttons 2x2 grid (`grid-cols-2`) |
| Tablet | 768px | Hero input centered `max-w-2xl`. Content centered. Conversion card `p-5` |
| Desktop | 1440px | Hero input centered `max-w-2xl`. Content centered. Conversion card `p-6`. Action buttons flex row |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| AI response → Conversion card | 32px (`mt-8`) | Matches action buttons margin pattern (AskResponseDisplay.tsx:102 uses `mt-8`) |
| Conversion card → follow-up input | 32px (`mt-8`) | Consistent with above |
| Action buttons → Feedback row | 24px (`mt-6`) | AskResponseDisplay.tsx:158 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] The branch `claude/feature/first-visit-prayer-flow` exists and is checked out
- [x] `CrisisBanner` has no auth dependency (confirmed: props = `{ text: string }`, no useAuth call)
- [x] `handleShare` in AskPage.tsx has no auth check (confirmed: lines 165-175, no isAuthenticated guard)
- [x] All auth-gated actions from the spec are accounted for in the plan (10 actions mapped)
- [x] Design system values are verified from codebase inspection (AskPage.tsx, design-system.md)
- [ ] All [UNVERIFIED] values are flagged with verification methods (1 value — see Step 4)
- [ ] Tests pass before starting implementation (`pnpm test`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put auth checks for Journal/Pray CTAs | In AskPage.tsx handlers (`handleJournal`, `handlePray`), not in AskResponseDisplay | Auth logic stays in the page, not the display component — matches existing pattern where all auth is in AskPage |
| Feedback auth gate behavior | Show auth modal on thumbs up/down click for logged-out users; do not show visual feedback | Unlike logged-in flow, logged-out user's click should open auth modal immediately — no point showing filled thumb if feedback won't persist |
| "Ask another question" button for logged-out users | Allow without auth (resets to input form) | This is navigation, not data persistence. Spec says only follow-up actions are gated |
| Auto-submit vs manual submit for logged-out `?q=` | Auto-submit (same as logged-in flow) | Spec says "the page reads the `q` param, displays the user's question, and generates the mock AI response." The first response must be automatic — requiring a manual click defeats the conversion funnel |
| Topic chips on Ask page for logged-out users | Pre-fill textarea (no auto-submit) | Chips set text but don't submit. For logged-in users, `handleTopicClick` triggers auto-submit via `pendingAutoSubmitRef`. For logged-out, same behavior: pre-fill + require "Find Answers" click to get first response. Only the `?q=` param auto-submits. |
| Popular Topics click for logged-out | Pre-fill + auto-submit (first response is free) | `handleTopicClick` currently checks `isAuthenticated` before setting `pendingAutoSubmitRef`. Remove this check so logged-out users also auto-submit from Popular Topics — this is a first response path |
| Conversion card placement | Below action buttons, above `SaveConversationButton` | Spec: "Below the AI response area, above the follow-up input area." Since follow-up input doesn't exist (it's the same textarea that disappears after first submit), place it after the action/feedback rows |
| Follow-up chip auth message | "Sign in to continue the conversation" | Spec table. Currently uses "Sign in to ask questions" — update to match spec |

---

## Implementation Steps

### Step 1: Remove Auth Gate from Hero Input Submit

**Objective:** Allow all users (logged-in and logged-out) to navigate to `/ask?q={text}` when submitting the hero input on the landing page.

**Files to modify:**
- `frontend/src/components/HeroSection.tsx` — Remove auth check from `handleInputSubmit`

**Details:**

In `HeroSection.tsx`, lines 90-96, change `handleInputSubmit` from:
```typescript
const handleInputSubmit = (value: string) => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to ask questions')
    return
  }
  navigate(`/ask?q=${encodeURIComponent(value)}`)
}
```
to:
```typescript
const handleInputSubmit = (value: string) => {
  navigate(`/ask?q=${encodeURIComponent(value)}`)
}
```

Remove unused imports: `useAuth` (line 83), `useAuthModal` (line 84), and their hook calls if no other usage exists in the component. Verify no other references to `isAuthenticated` or `authModal` exist in HeroSection.tsx before removing.

**Auth gating:** None — this step removes an auth gate.

**Responsive behavior:** N/A: no UI impact (only handler logic change).

**Guardrails (DO NOT):**
- DO NOT modify `TypewriterInput.tsx` — only the submit handler in HeroSection
- DO NOT remove the `navigate` import — it's still needed
- DO NOT change any visual styling of the hero section

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `hero submit navigates to /ask?q= for logged-out user` | integration | Render HeroSection with logged-out auth mock, submit text, verify `navigate` called with `/ask?q={encoded}` |
| `hero submit navigates to /ask?q= for logged-in user` | integration | Same test with logged-in mock — verify identical navigation behavior |
| `hero submit does not open auth modal` | integration | Verify auth modal text does NOT appear after submit for logged-out user |

**Test file:** `frontend/src/components/__tests__/HeroSection.test.tsx` — update existing tests or add new describe block.

**Expected state after completion:**
- [ ] HeroSection submits and navigates to `/ask?q=` for all users regardless of auth state
- [ ] No auth modal appears on hero input submit
- [ ] Existing HeroSection tests pass (update any that expect auth modal on logged-out submit)
- [ ] Build succeeds with no errors

---

### Step 2: Allow Logged-Out First Response on Ask Page

**Objective:** When a logged-out user arrives at `/ask?q=something` (or clicks "Find Answers"), the mock AI response generates and displays without any auth interruption.

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — Remove auth gates from `handleSubmit`, auto-submit `useEffect`, and `handleTopicClick`

**Details:**

**Change 1 — `handleSubmit` (lines 61-88):** Remove the `isAuthenticated` guard. The function becomes:
```typescript
const handleSubmit = () => {
  if (!text.trim()) return
  const submittedText = text.trim()
  setIsLoading(true)
  setPendingQuestion(submittedText)
  setFeedback(null)
  setFeedbackThanks(false)
  // ... rest unchanged (loading timer, getAskResponse, etc.)
}
```

**Change 2 — `?q=` auto-submit `useEffect` (lines 93-103):** Remove the `isAuthenticated` condition so logged-out users also auto-submit:
```typescript
useEffect(() => {
  let timeoutId: ReturnType<typeof setTimeout>
  const qParam = searchParams.get('q')
  if (qParam) {
    setText(qParam)
    timeoutId = setTimeout(() => handleSubmitRef.current(), 0)
  }
  return () => clearTimeout(timeoutId)
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

**Change 3 — `handleTopicClick` (lines 118-123):** Remove the `isAuthenticated` check so logged-out users also get auto-submit from Popular Topics:
```typescript
const handleTopicClick = (starterQuestion: string) => {
  setText(starterQuestion)
  pendingAutoSubmitRef.current = starterQuestion
}
```

**Change 4 — Auto-submit effect for Popular Topics (lines 106-111):** Remove the `isAuthenticated` condition:
```typescript
useEffect(() => {
  if (pendingAutoSubmitRef.current && text === pendingAutoSubmitRef.current) {
    pendingAutoSubmitRef.current = null
    handleSubmitRef.current()
  }
}, [text])
```

After these changes, verify that `isAuthenticated` and `authModal` are still imported — they will be needed in Step 3 for follow-up action gating.

**Auth gating:** None removed that shouldn't be — the first response is explicitly ungated per spec.

**Responsive behavior:** N/A: no UI impact (only handler logic changes).

**Guardrails (DO NOT):**
- DO NOT remove `useAuth` or `useAuthModal` imports — they're needed in Step 3
- DO NOT modify `getAskResponse` or mock data
- DO NOT change the loading delay (`ASK_LOADING_DELAY_MS`)
- DO NOT add any localStorage writes for logged-out users
- DO NOT modify CrisisBanner — it already works without auth

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `logged-out user: ?q= param auto-submits and shows response` | integration | Render with logged-out mock + `?q=suffering`, advance timers, verify "What Scripture Says" renders |
| `logged-out user: Find Answers submits and shows response` | integration | Type text, click "Find Answers", advance timers, verify response appears |
| `logged-out user: Popular Topics auto-submits first response` | integration | Click Popular Topic card, advance timers, verify response appears |
| `logged-out user: crisis keywords in ?q= show CrisisBanner` | integration | Render with `?q=I want to kill myself`, verify `role="alert"` element with crisis resources |
| `logged-in user: all existing flows unchanged` | integration | Verify existing logged-in test suite still passes |

**Test file:** `frontend/src/pages/__tests__/AskPage.test.tsx` — update existing "Auth Gating" and "URL Params" describe blocks.

**Expected state after completion:**
- [ ] Logged-out user arriving at `/ask?q=suffering` sees the full AI response (verse cards, prayer, encouragement) after loading animation
- [ ] Logged-out user clicking "Find Answers" gets the response without auth modal
- [ ] Logged-out user clicking Popular Topic auto-submits and gets response
- [ ] CrisisBanner displays for crisis keywords regardless of auth state
- [ ] All existing logged-in tests pass without modification (or with minimal adjustment)
- [ ] Build succeeds

---

### Step 3: Gate Follow-Up Actions for Logged-Out Users

**Objective:** After the first response displays, auth-gate deeper engagement actions (follow-ups, journal, pray, feedback) while keeping copy/share free. Update auth modal messages to match spec.

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — Add auth gates to `handleJournal`, `handlePray`, `handleFeedback`; update message in `handleFollowUpClick`; add auth gate to `SaveConversationButton` rendering

**Details:**

**Change 1 — `handleFollowUpClick` (lines 133-153):** Update auth modal message:
```typescript
const handleFollowUpClick = (question: string) => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to continue the conversation')
    return
  }
  // ... rest unchanged
}
```

**Change 2 — `handleJournal` (lines 155-158):** Add auth gate:
```typescript
const handleJournal = () => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to save journal entries')
    return
  }
  const questionText = conversation.length > 0 ? conversation[0].question : text
  navigate('/daily?tab=journal', { state: { prayWallContext: questionText } })
}
```

**Change 3 — `handlePray` (lines 160-163):** Add auth gate:
```typescript
const handlePray = () => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to generate prayers')
    return
  }
  const questionText = conversation.length > 0 ? conversation[0].question : text
  navigate('/daily?tab=pray', { state: { prayWallContext: questionText } })
}
```

**Change 4 — `handleFeedback` (lines 177-198):** Add auth gate at the top (before visual feedback):
```typescript
const handleFeedback = (type: 'up' | 'down') => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to give feedback')
    return
  }
  setFeedback(type)
  setFeedbackThanks(true)
  feedbackTimerRef.current = setTimeout(() => setFeedbackThanks(false), 2000)

  if (conversation.length === 0) return
  // ... localStorage persist logic unchanged
}
```

**Change 5 — `SaveConversationButton` rendering (line 360):** Add auth condition so it only renders for logged-in users. Wrap in auth check:
```typescript
{isAuthenticated && <SaveConversationButton conversation={conversation} />}
```

**Change 6 — Verify Copy/Share have NO auth gates:** Confirm `handleShare` (lines 165-175) has no `isAuthenticated` check. It currently doesn't — it copies to clipboard unconditionally. Confirm.

**Auth gating:**
- `handleFollowUpClick`: "Sign in to continue the conversation"
- `handleJournal`: "Sign in to save journal entries"
- `handlePray`: "Sign in to generate prayers"
- `handleFeedback`: "Sign in to give feedback"
- `SaveConversationButton`: hidden for logged-out users

**Responsive behavior:** N/A: no UI impact (only handler logic changes).

**Guardrails (DO NOT):**
- DO NOT add auth gates to `handleShare` — copy/share must remain free per spec
- DO NOT add auth gates to `handleAskAnother` — resetting to input is navigation, not persistence
- DO NOT modify `AskResponseDisplay.tsx` in this step — all auth logic stays in AskPage
- DO NOT change existing logged-in behavior — follow-ups, journal, pray all still work as before

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `logged-out: follow-up chip click shows auth modal "Sign in to continue the conversation"` | integration | Submit question (now ungated), get response, click follow-up chip, verify auth modal with exact message |
| `logged-out: "Journal about this" shows auth modal "Sign in to save journal entries"` | integration | Submit, get response, click Journal button, verify auth modal |
| `logged-out: "Pray about this" shows auth modal "Sign in to generate prayers"` | integration | Submit, get response, click Pray button, verify auth modal |
| `logged-out: feedback thumbs up shows auth modal "Sign in to give feedback"` | integration | Submit, get response, click thumbs up, verify auth modal |
| `logged-out: feedback thumbs down shows auth modal "Sign in to give feedback"` | integration | Same for thumbs down |
| `logged-out: Copy/Share works without auth` | integration | Submit, get response, click Share button, verify clipboard write (no auth modal) |
| `logged-out: "Ask another question" works without auth` | integration | Submit, get response, click "Ask another", verify input form returns |
| `logged-out: SaveConversationButton not rendered` | integration | Submit, get response, verify save button absent |
| `logged-in: all follow-up actions work as before` | integration | Verify existing logged-in tests still pass |

**Test file:** `frontend/src/pages/__tests__/AskPage.test.tsx` — add new describe block "AskPage — Logged-Out Action Gating".

**Expected state after completion:**
- [ ] Follow-up chips/questions show auth modal for logged-out users
- [ ] Journal CTA shows auth modal with correct message
- [ ] Pray CTA shows auth modal with correct message
- [ ] Feedback buttons show auth modal with correct message
- [ ] Copy and Share work without auth
- [ ] "Ask another question" works without auth
- [ ] SaveConversationButton hidden for logged-out users
- [ ] All logged-in behavior unchanged

---

### Step 4: Add Inline Conversion Prompt Card

**Objective:** Display a gentle frosted glass conversion card below the AI response for logged-out users. The card has a heading, body, CTA button, and dismissible secondary link.

**Files to create:**
- `frontend/src/components/ask/ConversionPrompt.tsx` — New component

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — Render `ConversionPrompt` after response for logged-out users

**Details:**

**New component: `ConversionPrompt.tsx`**

```typescript
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface ConversionPromptProps {
  onDismiss: () => void
  prefersReducedMotion: boolean
}

export function ConversionPrompt({ onDismiss, prefersReducedMotion }: ConversionPromptProps) {
  return (
    <div
      className={cn(
        'mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm sm:p-5 lg:p-6',
        !prefersReducedMotion && 'animate-fade-in',
      )}
    >
      <h3 className="text-lg font-semibold text-white">
        This is just the beginning.
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
        Create a free account to save your prayers, journal your thoughts,
        track your growth, and join a community that cares.
      </p>
      <div className="mt-4">
        <Link
          to="/register"
          className={cn(
            'inline-block min-h-[44px] rounded-full bg-primary px-6 py-3 font-semibold text-white',
            'transition-colors hover:bg-primary-lt',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          Get Started — It's Free
        </Link>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'mt-3 text-sm text-primary-lt hover:underline',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'min-h-[44px]',
        )}
      >
        Keep exploring
      </button>
    </div>
  )
}
```

**AskPage.tsx integration:**

Add state: `const [conversionDismissed, setConversionDismissed] = useState(false)`

Render the conversion prompt inside the conversation map area, after the response display but before `SaveConversationButton`. Place it right after the last `AskResponseDisplay` in the conversation loop, conditionally:

```tsx
{/* Conversion prompt for logged-out users */}
{!isAuthenticated && conversation.length > 0 && !conversionDismissed && (
  <ConversionPrompt
    onDismiss={() => setConversionDismissed(true)}
    prefersReducedMotion={prefersReducedMotion}
  />
)}
```

Place this block after the `</div>` of the `aria-live="polite"` region (line 357), before the `SaveConversationButton` line (line 360).

**[UNVERIFIED] Conversion card visual integration:**
The frosted glass card uses exact Dashboard Card Pattern values. The centered text layout with heading + body + button + link is new for the Ask page context.
→ To verify: Run `/verify-with-playwright /ask` and inspect card visual at 375px, 768px, 1440px
→ If wrong: Adjust padding/margins to match surrounding content spacing

**Auth gating:** Component only renders when `!isAuthenticated` — never shown to logged-in users.

**Responsive behavior:**
- Desktop (1440px): `p-6`, centered within `max-w-2xl` content column. CTA and link centered.
- Tablet (768px): `p-5`, same centered layout.
- Mobile (375px): `p-4`, full-width within content column. All elements stack vertically centered.

**Guardrails (DO NOT):**
- DO NOT use a modal or popup — spec explicitly says inline card
- DO NOT use urgency language ("Limited time", "Don't miss out")
- DO NOT persist dismissal to localStorage — spec says React state only
- DO NOT show the conversion prompt for logged-in users
- DO NOT add the conversion prompt before the AI response loads — it appears after
- DO NOT use Caveat font for the heading — it's Inter (body copy style, not hero heading)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `conversion prompt renders for logged-out user after response` | integration | Submit as logged-out, get response, verify "This is just the beginning." text appears |
| `conversion prompt does NOT render for logged-in user` | integration | Submit as logged-in, get response, verify "This is just the beginning." text is absent |
| `conversion prompt "Get Started" links to /register` | unit | Render ConversionPrompt, verify Link has `to="/register"` |
| `conversion prompt "Keep exploring" dismisses card` | integration | Click "Keep exploring", verify card disappears |
| `conversion prompt uses frosted glass styling` | unit | Verify container has `bg-white/5`, `backdrop-blur-sm`, `border-white/10`, `rounded-2xl` classes |
| `conversion prompt uses animate-fade-in` | unit | Verify `animate-fade-in` class is present when `prefersReducedMotion` is false |
| `conversion prompt respects prefers-reduced-motion` | unit | Verify `animate-fade-in` class is absent when `prefersReducedMotion` is true |
| `conversion prompt CTA has 44px min touch target` | unit | Verify `min-h-[44px]` class on CTA link |
| `conversion prompt "Keep exploring" has 44px min touch target` | unit | Verify `min-h-[44px]` class on dismiss button |

**Test file:** `frontend/src/components/ask/__tests__/ConversionPrompt.test.tsx` (new file) + updates in `AskPage.test.tsx` for integration tests.

**Expected state after completion:**
- [ ] Logged-out user sees frosted glass conversion card below the AI response
- [ ] Card heading: "This is just the beginning."
- [ ] Card body describes free account benefits
- [ ] "Get Started — It's Free" button links to `/register`
- [ ] "Keep exploring" dismisses the card
- [ ] Card uses `animate-fade-in` animation
- [ ] Card does NOT appear for logged-in users
- [ ] Card does NOT appear before response loads
- [ ] Responsive padding: `p-4` mobile, `p-5` tablet, `p-6` desktop
- [ ] All touch targets ≥ 44px

---

### Step 5: Update Tests

**Objective:** Update existing tests that expect the old auth-gated behavior (auth modal on hero submit, auth modal on Ask page submit) and add comprehensive new test coverage for the logged-out first response flow.

**Files to modify:**
- `frontend/src/pages/__tests__/AskPage.test.tsx` — Update existing tests, add new test blocks
- `frontend/src/components/__tests__/HeroSection.test.tsx` — Update hero submit tests (if they test auth modal behavior)

**Files to create:**
- `frontend/src/components/ask/__tests__/ConversionPrompt.test.tsx` — New test file

**Details:**

**AskPage.test.tsx updates:**

1. **Update "Auth Gating" describe block** (lines 173-182, 796-853):
   - Remove or update `'logged-out user clicking submit sees auth modal'` — this should now verify the response appears instead
   - Remove or update `'logged-out: submit button triggers auth modal'` — same
   - Add new test: `'logged-out: submit shows response, not auth modal'`

2. **Update "URL Params" describe block** (lines 506-557):
   - Update `'does NOT auto-submit for logged-out user with ?q='` — this test should now expect auto-submit behavior (loading state, then response)
   - Update to verify response appears for logged-out `?q=` param

3. **Add new describe block "AskPage — Logged-Out First Response":**
   - Tests for logged-out submit → response display
   - Tests for logged-out `?q=` → auto-submit → response
   - Tests for logged-out Popular Topics → auto-submit → response
   - Tests for crisis banner on logged-out `?q=` with crisis keywords

4. **Add new describe block "AskPage — Logged-Out Action Gating":**
   - All 9 tests from Step 3 test specifications

5. **Add new describe block "AskPage — Conversion Prompt Integration":**
   - Conversion prompt appears for logged-out user after response
   - Conversion prompt does NOT appear for logged-in user
   - Conversion prompt dismisses on "Keep exploring"

**ConversionPrompt.test.tsx (new file):**
Follow the pattern from `AskResponseDisplay.test.tsx` — render in `<MemoryRouter>`, test props and rendering.

| Test | Type | Description |
|------|------|-------------|
| `renders heading "This is just the beginning."` | unit | Verify heading text |
| `renders body copy about free account` | unit | Verify body text |
| `"Get Started — It's Free" links to /register` | unit | Verify Link href |
| `"Keep exploring" calls onDismiss` | unit | Click button, verify callback |
| `uses frosted glass classes` | unit | Check container classes |
| `uses animate-fade-in when motion allowed` | unit | Check class presence |
| `no animate-fade-in when prefersReducedMotion` | unit | Check class absence |
| `CTA has 44px min touch target` | unit | Check `min-h-[44px]` |
| `"Keep exploring" has 44px min touch target` | unit | Check `min-h-[44px]` |

**HeroSection.test.tsx:** Check if existing tests verify auth modal on submit. If so, update to verify navigation instead. If no HeroSection test file exists, the tests added in Step 1 cover this.

**Auth gating:** N/A — test-only step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT delete existing passing tests that are still valid
- DO NOT change test wrapping pattern (MemoryRouter + ToastProvider + AuthModalProvider)
- DO NOT remove the auth mock setup pattern (`vi.hoisted` + `vi.mock`)
- DO NOT add tests that depend on real auth — always use mocked auth

**Expected state after completion:**
- [ ] All tests pass (`pnpm test`)
- [ ] No test expects auth modal on first submit (hero or Ask page)
- [ ] New tests verify logged-out first response flow
- [ ] New tests verify per-action auth gating for logged-out users
- [ ] ConversionPrompt has unit test coverage
- [ ] Integration tests verify conversion prompt appears/hides correctly
- [ ] Build succeeds

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Remove hero input auth gate |
| 2 | — | Remove Ask page first-response auth gate |
| 3 | 2 | Add per-action auth gates for follow-up actions (needs ungated first response to test) |
| 4 | 2 | Add conversion prompt card (needs response to render before card) |
| 5 | 1, 2, 3, 4 | Update and add tests for all changes |

Steps 1 and 2 can execute in parallel. Steps 3 and 4 can execute in parallel (both depend on 2). Step 5 is last.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Remove Hero Auth Gate | [COMPLETE] | 2026-03-30 | Modified `HeroSection.tsx` (removed useAuth/useAuthModal imports and auth check), updated `HeroSection.test.tsx` (replaced auth modal tests with navigation tests) |
| 2 | Allow Logged-Out First Response | [COMPLETE] | 2026-03-30 | Modified `AskPage.tsx`: removed auth gate from handleSubmit, ?q= auto-submit, handleTopicClick, and Popular Topics auto-submit effect. 3 old auth-gated tests now fail (expected — will update in Step 5). 62 other tests pass. |
| 3 | Gate Follow-Up Actions | [COMPLETE] | 2026-03-30 | Modified `AskPage.tsx`: updated handleFollowUpClick message, added auth gates to handleJournal/handlePray/handleFeedback, wrapped SaveConversationButton in isAuthenticated. handleShare confirmed ungated. |
| 4 | Add Conversion Prompt Card | [COMPLETE] | 2026-03-30 | Created `ConversionPrompt.tsx`, integrated in `AskPage.tsx` with conversionDismissed state. Renders after response for logged-out users only. |
| 5 | Update Tests | [COMPLETE] | 2026-03-30 | Updated 3 failing tests in AskPage.test.tsx, added 13 new integration tests (Logged-Out First Response, Action Gating, Conversion Prompt), created ConversionPrompt.test.tsx (9 unit tests). Updated feedback NOT stored test. 4,902 tests pass (4 pre-existing Challenge failures). |
