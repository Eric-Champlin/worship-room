# Implementation Plan: Prayer Wall Question of the Day

**Spec:** `_specs/prayer-wall-question-of-day.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/prayer-wall-question-of-day`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** not applicable

---

## Architecture Context

### Existing Files & Patterns

- **Prayer Wall page:** `frontend/src/pages/PrayerWall.tsx` — Single-column feed layout. Hero → sticky filter bar → InlineComposer → prayer cards → footer. Max-width `720px`, `bg-neutral-bg` background. Uses `useSearchParams` for category filter state.
- **Prayer categories:** `frontend/src/constants/prayer-categories.ts` — 8 categories as `const` array, `PrayerCategory` type union, `CATEGORY_LABELS` record, `isValidCategory()` helper.
- **Prayer types:** `frontend/src/types/prayer-wall.ts` — `PrayerRequest` interface with `id`, `userId`, `authorName`, `content`, `category`, etc. No `qotdId` field yet.
- **Mock data:** `frontend/src/mocks/prayer-wall-mock-data.ts` — 18 mock prayers, 35 comments, 10 users. `getMockPrayers()` returns sorted copy.
- **InlineComposer:** `frontend/src/components/prayer-wall/InlineComposer.tsx` — Textarea (1000 char, auto-expand), category selector, anonymous toggle, crisis detection via `containsCrisisKeyword()`, submit handler.
- **PrayerCard:** `frontend/src/components/prayer-wall/PrayerCard.tsx` — Avatar + name + timestamp + CategoryBadge + content (150 char truncation) + children (InteractionBar + CommentsSection).
- **CategoryBadge:** `frontend/src/components/prayer-wall/CategoryBadge.tsx` — Small pill `bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs`. Button variant with `onClick`, span variant without.
- **CategoryFilterBar:** `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — Horizontal scrollable bar. Active: `border-primary/40 bg-primary/20 text-primary-lt`. Max-width 720px.
- **ShareButton:** `frontend/src/components/daily/ShareButton.tsx` — Web Share API with fallback dropdown (Copy, Email, SMS, Facebook, X). Props: `shareUrl`, `shareText`, `shareTitle`.
- **ShareDropdown:** `frontend/src/components/prayer-wall/ShareDropdown.tsx` — Prayer Wall-specific share with `getShareText()` helper. 5 options with keyboard nav.
- **CrisisBanner pattern:** `containsCrisisKeyword()` from `frontend/src/constants/crisis-resources.ts`. InlineComposer renders crisis alert `role="alert"` with `border-danger/30 bg-red-50 p-4`.
- **Auth modal:** `useAuthModal()` from `AuthModalProvider.tsx`. Usage: `openAuthModal?.('Sign in to [action]')`.
- **Faith points:** `useFaithPoints()` hook. `recordActivity('prayerWall')` awards 15 points. No-ops when not authenticated.
- **Daily rotation:** `getTodaysVerse()` in `frontend/src/constants/verse-of-the-day.ts` — day-of-year modulo pool size. Uses UTC arithmetic to avoid DST. Accepts optional `Date` param.

### Directory Conventions

- Constants: `frontend/src/constants/`
- Types: `frontend/src/types/`
- Components: `frontend/src/components/prayer-wall/`
- Mocks: `frontend/src/mocks/`
- Tests: `frontend/src/components/prayer-wall/__tests__/` and co-located `__tests__` dirs

### Test Patterns

- Vitest + React Testing Library + `userEvent.setup()`
- Render helpers with optional prop overrides
- `MemoryRouter` wrapping with `future` flags: `{ v7_startTransition: true, v7_relativeSplatPath: true }`
- Assertions: `screen.getByText()`, `getByRole()`, `getByLabelText()`, `toBeInTheDocument()`, `toHaveAttribute()`
- Auth modal mocking: `vi.mock('@/components/prayer-wall/AuthModalProvider')` returning `openAuthModal: vi.fn()`
- Faith points mocking: `vi.mock('@/hooks/useFaithPoints')` returning `recordActivity: vi.fn()`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View QOTD card | Public (no gate) | Step 4 | None — visible to all |
| Share QOTD question | Public (no gate) | Step 4 | None — share works for all |
| Open response composer ("Share Your Thoughts") | Auth-gated | Step 5 | `useAuth()` + `openAuthModal?.('Sign in to share your thoughts')` |
| Post QOTD response | Auth-gated | Step 5, Step 6 | `isAuthenticated` check before submission |
| Record faith points on post | Auth-gated | Step 6 | `recordActivity` no-ops when not authenticated |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| QOTD card background | background | `bg-primary/10` (`rgba(109, 40, 217, 0.1)`) | Spec — new pattern |
| QOTD card border | border | `border border-primary/20 rounded-2xl` | Spec — new pattern |
| QOTD card padding | padding | `p-4` mobile, `p-5 sm:p-6` tablet/desktop | Spec responsive reqs |
| Label text | font/color | `text-xs uppercase tracking-wider text-white/50` | Spec + existing section header pattern |
| Question text | font/color | `text-lg font-bold text-white` | Spec |
| Hint text | font/color | `font-serif italic text-sm text-white/50` (Lora) | Spec |
| Response count | font/color | `text-sm text-white/60 hover:underline` | Spec |
| Icon color | color | `text-primary` (`#6D28D9`) | Spec |
| QOTD badge on responses | style | `bg-primary/10 text-primary-lt text-xs rounded-full px-2 py-0.5` | Spec — similar to CategoryBadge |
| Prayer cards | background | `bg-white rounded-xl border border-gray-200 p-6` | design-system.md |
| Prayer Wall max-width | width | `max-w-[720px]` | design-system.md |
| Filter bar active | style | `border-primary/40 bg-primary/20 text-primary-lt` | CategoryFilterBar.tsx |
| Share button | pattern | Web Share API + fallback dropdown | ShareButton.tsx |

---

## Design System Reminder

- Worship Room uses **Caveat** for script/highlighted headings (not Lora)
- **Lora** is used for scripture/italic/warm text (journal prompts, hints)
- Prayer Wall uses `bg-neutral-bg` (`#F5F5F5`) for the feed area below the hero
- Prayer cards are `bg-white rounded-xl border border-gray-200` (NOT frosted glass)
- The QOTD card is a **new pattern**: `bg-primary/10 border border-primary/20 rounded-2xl` — distinct from prayer cards
- All interactive elements need `min-h-[44px]` touch targets
- Crisis banner uses `role="alert"` with crisis resources (988, Crisis Text Line, SAMHSA)
- Prayer Wall content max-width: `720px` (`max-w-[720px]`)
- Category badges: `bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs`
- Focus ring pattern: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | QOTD card full-width `p-4`, composer full-width, action row may stack |
| Tablet | 640-1024px | Same single-column, `p-5`/`p-6` padding |
| Desktop | > 1024px | Same single-column, `max-w-[720px]` centered, hover states on buttons |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → QOTD card | Within main content area `py-6 sm:py-8` | PrayerWall.tsx line 289 |
| QOTD card → filter bar | N/A — QOTD card is inside main, filter bar is above main in sticky position | PrayerWall.tsx layout |
| QOTD card → prayer feed | `gap-4` (16px) in flex column | Matches existing prayer card spacing |

**Note:** The spec says QOTD card is "above the category filter bar" — but looking at the page layout, the filter bar is sticky at the top (outside `<main>`). The QOTD card will be the first element inside `<main>`, visually below the hero and filter bar. This matches the spec's intent: "top of the Prayer Wall feed, above prayer cards, below the hero section."

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is clear on QOTD card position (top of feed, below hero and filter bar)
- [x] `PrayerRequest` type will gain optional `qotdId` field
- [x] "Discussion" is added as 9th category after "Other"
- [x] QOTD responses are stored as regular prayer items with `qotdId` + `category: 'discussion'`
- [x] No new localStorage keys needed
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from recon and spec
- [x] Response count scrolls to first QOTD response in feed (or opens composer if none)
- [ ] The QOTD card sits **inside** `<main>` above the prayer feed (not above the sticky filter bar in the DOM — the filter bar is above `<main>` in the current layout). This is the correct rendering because the spec says "above prayer cards, below the hero section and CTA area."

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| QOTD card DOM position | Inside `<main>`, before InlineComposer and prayer feed | Filter bar is sticky above `<main>`. QOTD card is content, not navigation. |
| QOTD card visibility when category filtered | Always visible (above the feed regardless of filter) | Spec: "QOTD card itself is always visible at the top regardless of active filter" |
| Response count with 0 responses + tap | Opens response composer (auth-gated) | Spec: "If no responses exist yet, tapping opens the response composer instead" |
| Multiple responses per user per day | Allowed (no limit in Phase 2) | Spec out of scope: "no limit enforced in Phase 2" |
| Crisis detection on QOTD composer | Same `containsCrisisKeyword()` pattern | Spec: "same CrisisBanner pattern as Pray tab and Prayer Wall composer" |
| Share text format | "Today's question on Worship Room: [question text]" | Spec defines exact format |
| QOTD response `category` | Always `'discussion'` (hardcoded) | Spec: "responses are automatically tagged with the 'Discussion' category" |
| QOTD badge styling | `bg-primary/10 text-primary-lt` pill (primary tint, not gray) | Spec: "slightly different color tint to visually connect to QOTD card" |

---

## Implementation Steps

### Step 1: Question Pool Constants & Rotation Function

**Objective:** Create the 60-question pool and `getTodaysQuestion()` function using the same day-of-year modulo pattern as `getTodaysVerse()`.

**Files to create/modify:**
- `frontend/src/constants/question-of-the-day.ts` — NEW: Question pool + rotation function
- `frontend/src/constants/__tests__/question-of-the-day.test.ts` — NEW: Tests

**Details:**

Define the `QuestionOfTheDay` interface:
```typescript
export interface QuestionOfTheDay {
  id: string           // e.g., 'qotd-1'
  text: string
  theme: 'faith_journey' | 'practical' | 'reflective' | 'encouraging' | 'community' | 'seasonal'
  hint?: string        // Optional conversation-starter
}
```

Define `QUESTION_THEMES` as a const array of the 6 themes.

Create `QUESTION_OF_THE_DAY_POOL: QuestionOfTheDay[]` with exactly 60 questions (10 per theme). Use the spec's examples as starting points:
- **Faith Journey** (10): "What Bible verse has meant the most to you this year?", etc.
- **Practical** (10): "How do you make time for God in a busy schedule?", etc.
- **Reflective** (10): "When was the last time you felt God's presence clearly?", etc.
- **Encouraging** (10): "What's one thing God has taught you recently?", etc.
- **Community** (10): "How has another believer encouraged you this week?", etc.
- **Seasonal** (10): "What are you praying for this season?", etc.

About half the questions should include a `hint` string (conversation-starter).

Create `getTodaysQuestion()` — copy the exact algorithm from `getTodaysVerse()`:
```typescript
export function getTodaysQuestion(date: Date = new Date()): QuestionOfTheDay {
  const year = date.getFullYear()
  const dayOfYear = Math.floor(
    (Date.UTC(year, date.getMonth(), date.getDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24),
  )
  return QUESTION_OF_THE_DAY_POOL[dayOfYear % QUESTION_OF_THE_DAY_POOL.length]
}
```

**Guardrails (DO NOT):**
- Do NOT use AI-generated questions at runtime — all 60 are hardcoded constants
- Do NOT use `new Date().toISOString()` for day calculation — use UTC arithmetic per `getTodaysVerse` pattern
- Do NOT include questions that could be triggering (self-harm, trauma) — keep tone inviting and warm
- Do NOT duplicate the exact algorithm with a different formula — use the identical day-of-year modulo pattern

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pool has exactly 60 questions | unit | `QUESTION_OF_THE_DAY_POOL.length === 60` |
| 10 questions per theme | unit | Count each theme, expect 10 |
| All questions have required fields | unit | Every item has `id`, `text`, `theme` |
| Unique IDs | unit | No duplicate `id` values |
| getTodaysQuestion is deterministic | unit | Same date returns same question |
| Different days return different questions | unit | Two consecutive days differ |
| Handles year boundaries | unit | Dec 31 and Jan 1 don't crash |
| Uses local date, not UTC | unit | Late-night local time returns expected question |

**Expected state after completion:**
- [x] 60-question pool with all 6 themes
- [x] `getTodaysQuestion()` returns deterministic daily question
- [x] All tests pass

---

### Step 2: Add "Discussion" Category to Prayer Category System

**Objective:** Add `'discussion'` as the 9th prayer category, after `'other'`.

**Files to modify:**
- `frontend/src/constants/prayer-categories.ts` — Add `'discussion'` to array and labels
- `frontend/src/types/prayer-wall.ts` — Add optional `qotdId` field to `PrayerRequest`
- `frontend/src/mocks/prayer-wall-mock-data.ts` — Add 2-3 mock QOTD responses

**Details:**

In `prayer-categories.ts`:
```typescript
export const PRAYER_CATEGORIES = [
  'health', 'family', 'work', 'grief',
  'gratitude', 'praise', 'relationships', 'other', 'discussion',
] as const
```

Add to `CATEGORY_LABELS`:
```typescript
discussion: 'Discussion',
```

The `PrayerCategory` type automatically updates (derived from `typeof PRAYER_CATEGORIES[number]`).
`isValidCategory('discussion')` will automatically return true.

In `prayer-wall.ts`, add optional `qotdId` to `PrayerRequest`:
```typescript
export interface PrayerRequest {
  // ... existing fields ...
  qotdId?: string  // Links response to a Question of the Day
}
```

In mock data, add 2-3 QOTD response items with `category: 'discussion'` and `qotdId` matching today's question. Import `getTodaysQuestion` to get today's question ID dynamically. These should look like regular prayer items but with the QOTD fields set.

**Guardrails (DO NOT):**
- Do NOT remove or reorder existing categories — only append `'discussion'` at the end
- Do NOT change the `PrayerCategory` type derivation pattern — it auto-derives from the const array
- Do NOT add `qotdId` as a required field — it must be optional (most prayers don't have it)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PRAYER_CATEGORIES has 9 items | unit | `.length === 9` |
| 'discussion' is last in array | unit | `PRAYER_CATEGORIES[8] === 'discussion'` |
| CATEGORY_LABELS includes Discussion | unit | `CATEGORY_LABELS.discussion === 'Discussion'` |
| isValidCategory('discussion') returns true | unit | Validation works for new category |
| PrayerRequest accepts qotdId | unit | TypeScript compilation with qotdId field |
| Mock QOTD responses have correct fields | unit | `category === 'discussion'` and `qotdId` is set |

**Expected state after completion:**
- [x] "Discussion" is the 9th category
- [x] `PrayerRequest` type includes optional `qotdId`
- [x] Mock data includes QOTD responses
- [x] Existing tests still pass (no breaking changes)

---

### Step 3: QOTD Response Composer Component

**Objective:** Build a simplified inline composer for QOTD responses — no category selector, no anonymous toggle, 500 char max.

**Files to create:**
- `frontend/src/components/prayer-wall/QotdComposer.tsx` — NEW
- `frontend/src/components/prayer-wall/__tests__/QotdComposer.test.tsx` — NEW

**Details:**

Props interface:
```typescript
interface QotdComposerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string) => void
}
```

Structure (simplified from InlineComposer):
- Outer wrapper with `overflow-hidden transition-all duration-300` collapse pattern (same as InlineComposer)
- Container: `rounded-xl border border-gray-200 bg-white p-4 sm:p-5`
- Heading: "Share Your Thoughts" — `text-base font-semibold text-text-dark`
- Textarea: 500 char max, `minHeight: 100px`, auto-expand, placeholder "Share your thoughts...", `aria-label="Your response to the question of the day"`
- Character count: shows when >= 400 chars, format `{count}/500`, danger color at 500
- Crisis detection: `containsCrisisKeyword(content)` → show crisis banner (same JSX as InlineComposer)
- Button row: Cancel (ghost) + "Post Response" (primary, disabled when empty or over limit)
- On submit: call `onSubmit(content.trim())`, reset form
- `aria-hidden={!isOpen}` and `inert` when closed (same pattern as InlineComposer)

**No anonymous toggle.** No category selector. These are intentionally omitted per spec.

**Responsive behavior:**
- Desktop (> 1024px): Same layout, `p-5` padding
- Tablet (640-1024px): Same layout
- Mobile (< 640px): Full-width `p-4`, textarea and buttons full-width

**Guardrails (DO NOT):**
- Do NOT include category selector — QOTD responses are always `discussion`
- Do NOT include anonymous toggle — QOTD responses are always attributed
- Do NOT exceed 500 char limit (not 1000 like the InlineComposer)
- Do NOT skip crisis detection — this is mandatory for all user text input

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders textarea with placeholder | unit | `getByPlaceholderText('Share your thoughts...')` |
| Submit disabled when empty | unit | "Post Response" button is disabled |
| Submit calls onSubmit with trimmed content | integration | Type text, click submit, verify callback |
| Character count shows at 400+ chars | unit | Type 400+ chars, count visible |
| Character count shows danger at 500 | unit | At limit, count is red |
| Crisis detection shows banner | integration | Type crisis keyword, banner appears with `role="alert"` |
| No anonymous checkbox present | unit | `queryByText('anonymously')` returns null |
| No category selector present | unit | `queryByText('Category')` returns null |
| Cancel resets form and calls onClose | integration | Cancel clears textarea and calls callback |
| Hidden when isOpen is false | unit | `aria-hidden="true"` and `max-h-0` |
| Textarea has accessible label | a11y | `getByLabelText` matches |

**Expected state after completion:**
- [x] QotdComposer renders with simplified form
- [x] Crisis detection works
- [x] All tests pass

---

### Step 4: Question of the Day Card Component

**Objective:** Build the QOTD card that displays today's question, response count, share button, and opens the composer.

**Files to create:**
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — NEW
- `frontend/src/components/prayer-wall/__tests__/QuestionOfTheDay.test.tsx` — NEW

**Details:**

Props interface:
```typescript
interface QuestionOfTheDayProps {
  responseCount: number
  isComposerOpen: boolean
  onToggleComposer: () => void
  onScrollToResponses: () => void
}
```

Card layout (top to bottom):
1. **Icon row:** `MessageCircle` (Lucide) icon, `h-6 w-6 text-primary`
2. **Label:** "QUESTION OF THE DAY" — `text-xs uppercase tracking-wider text-white/50 mt-2`
3. **Question text:** `getTodaysQuestion().text` — `text-lg font-bold text-white mt-2`
4. **Hint:** `getTodaysQuestion().hint` (if exists) — `font-serif italic text-sm text-white/50 mt-2`
5. **Response count:** Clickable button/link:
   - `responseCount === 0`: "Be the first to respond" — tap opens composer (via `onToggleComposer`)
   - `responseCount === 1`: "1 response" — tap scrolls (via `onScrollToResponses`)
   - `responseCount > 1`: "X responses" — tap scrolls
   - Styling: `text-sm text-white/60 hover:underline cursor-pointer mt-3 min-h-[44px] flex items-center`
6. **Action row:** `flex items-center gap-3 mt-4`
   - "Share Your Thoughts" button: `rounded-lg bg-white/10 border border-white/30 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors min-h-[44px]` — auth-gated (calls `onToggleComposer`)
   - Share button: Reuse `ShareButton` from `@/components/daily/ShareButton` with `shareText="Today's question on Worship Room: [question text]"`, `shareTitle="Question of the Day"`, `shareUrl="/prayer-wall"`

Card container styling:
```
bg-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-5 lg:p-6
```

This is the **dark background** QOTD card — it sits in the `bg-neutral-bg` feed area. Since the text is white, and the background is a semi-transparent primary tint over neutral-bg, we need to ensure contrast. The card will be placed in the main content area which has `bg-neutral-bg`. With `bg-primary/10` over `#F5F5F5`, the background will be very light violet. **BUT** the spec says white text — this works if the card has an opaque darker background. Looking at the spec more carefully: the Prayer Wall feed is on `bg-neutral-bg` (light), but prayer cards are `bg-white` with dark text.

**Correction:** The QOTD card uses white text, which means it needs a dark-enough background. Re-reading the spec: "The `primary/10` background with `primary/20` border creates a subtle violet-tinted card." On a light background, `primary/10` would be too light for white text.

**Decision:** The QOTD card should use a darker background to support white text. Looking at the Prayer Wall, the hero and filter bar area are dark, then the feed area is `bg-neutral-bg` (light). The spec positions the card "above prayer cards" which is in the light feed area. To support white text legibility, use `bg-hero-mid` (`#1E0B3E`) with a primary-tinted overlay: `bg-hero-mid border border-primary/30 rounded-2xl`. This maintains the primary tinting while ensuring white text contrast.

**[UNVERIFIED]** Card background approach: `bg-hero-mid border border-primary/30` for dark card with primary accent
→ To verify: Run `/verify-with-playwright` to check contrast ratio of white text on the card background
→ If wrong: Adjust to `bg-hero-dark` or a specific gradient that supports white text

**Alternative simpler approach:** Use `bg-[#1a0d35]` (a dark purple that's close to hero-mid) with `border border-primary/20`. This is definitively dark enough for white text.

**Auth gating:**
- Share button: Works for all users (no gate)
- "Share Your Thoughts" button: The `onToggleComposer` callback in the parent handles auth check
- Response count tap: No gate (scroll is passive)

**Responsive behavior:**
- Desktop (> 1024px): `p-6`, action row horizontal
- Tablet (640-1024px): `p-5`, same layout
- Mobile (< 640px): `p-4`, action row may wrap

**Accessibility:**
- Card uses `<section>` with `aria-labelledby` pointing to question heading
- Question text uses `<h2>` for proper heading hierarchy (Prayer Wall hero has `<h1>`)
- Response count is a `<button>` with descriptive `aria-label`
- All interactive elements keyboard-accessible with focus rings

**Guardrails (DO NOT):**
- Do NOT use `bg-primary/10` with white text on a light background — insufficient contrast
- Do NOT hardcode the question text — always call `getTodaysQuestion()`
- Do NOT skip the hint conditional — only render when `hint` exists
- Do NOT make the card a link — it contains interactive children

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders MessageCircle icon | unit | Icon present |
| Renders "QUESTION OF THE DAY" label | unit | Label text present |
| Renders today's question text | unit | Question from `getTodaysQuestion()` |
| Renders hint when question has one | unit | Mock question with hint, verify italic text |
| Does NOT render hint when absent | unit | Mock question without hint, no hint element |
| Shows "Be the first to respond" when 0 responses | unit | responseCount=0 |
| Shows "1 response" when 1 response | unit | responseCount=1 |
| Shows "X responses" when >1 | unit | responseCount=5 → "5 responses" |
| Response count tap calls onScrollToResponses | integration | Click count, verify callback |
| Response count tap calls onToggleComposer when 0 | integration | responseCount=0, click → onToggleComposer |
| "Share Your Thoughts" calls onToggleComposer | integration | Click button, verify callback |
| Share button renders | unit | Share button present |
| Card has section with aria-labelledby | a11y | Heading referenced |

**Expected state after completion:**
- [x] QOTD card renders with all content sections
- [x] Response count interaction works
- [x] Share button works
- [x] All tests pass

---

### Step 5: QOTD Badge Component for Feed Items

**Objective:** Create a small "Re: Question of the Day" badge that appears on QOTD responses in the feed.

**Files to create:**
- `frontend/src/components/prayer-wall/QotdBadge.tsx` — NEW
- `frontend/src/components/prayer-wall/__tests__/QotdBadge.test.tsx` — NEW

**Files to modify:**
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — Render QotdBadge when `prayer.qotdId` is set

**Details:**

`QotdBadge` is a simple presentational component:
```typescript
export function QotdBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary-lt">
      Re: Question of the Day
    </span>
  )
}
```

Styling uses primary tint (`bg-primary/10 text-primary-lt`) to visually connect to the QOTD card, distinct from the gray `CategoryBadge` (`bg-gray-100 text-gray-500`).

In `PrayerCard.tsx`, add the badge above the author name in the header section. Conditional on `prayer.qotdId`:
```tsx
{prayer.qotdId && <QotdBadge />}
```

Place it above the existing avatar/name/timestamp row, with `mb-1` spacing.

**Guardrails (DO NOT):**
- Do NOT make this badge clickable (it's informational only)
- Do NOT use the same gray styling as CategoryBadge — use primary tint per spec
- Do NOT show this badge on prayers without `qotdId`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| QotdBadge renders text | unit | "Re: Question of the Day" present |
| QotdBadge has pill styling | unit | Has `rounded-full` class |
| PrayerCard shows QotdBadge when qotdId set | integration | Render prayer with qotdId, badge visible |
| PrayerCard hides QotdBadge when no qotdId | integration | Render normal prayer, no badge |

**Expected state after completion:**
- [x] QotdBadge component renders correctly
- [x] PrayerCard conditionally shows badge
- [x] Existing prayer card tests still pass

---

### Step 6: Integrate QOTD into Prayer Wall Page

**Objective:** Wire up the QOTD card, composer, and feed integration into the Prayer Wall page.

**Files to modify:**
- `frontend/src/pages/PrayerWall.tsx` — Add QOTD card, composer, filter logic, scroll behavior

**Details:**

**Imports to add:**
```typescript
import { QuestionOfTheDay } from '@/components/prayer-wall/QuestionOfTheDay'
import { QotdComposer } from '@/components/prayer-wall/QotdComposer'
import { getTodaysQuestion } from '@/constants/question-of-the-day'
```

**State additions:**
```typescript
const todaysQuestion = useMemo(() => getTodaysQuestion(), [])
const [qotdComposerOpen, setQotdComposerOpen] = useState(false)
const firstQotdResponseRef = useRef<HTMLDivElement>(null)
```

**Response count calculation:**
```typescript
const qotdResponseCount = useMemo(
  () => allPrayers.filter(p => p.qotdId === todaysQuestion.id).length,
  [allPrayers, todaysQuestion.id],
)
```

**QOTD composer toggle with auth gating:**
```typescript
const handleToggleQotdComposer = useCallback(() => {
  if (!isAuthenticated) {
    openAuthModal?.('Sign in to share your thoughts')
    return
  }
  setQotdComposerOpen(prev => !prev)
}, [isAuthenticated, openAuthModal])
```

**QOTD response submission:**
```typescript
const handleQotdSubmit = useCallback((content: string) => {
  if (!isAuthenticated) return
  const newResponse: PrayerRequest = {
    id: `prayer-qotd-${Date.now()}`,
    userId: user?.id ?? null,
    authorName: user?.name ?? 'You',
    authorAvatarUrl: null,
    isAnonymous: false,
    content,
    category: 'discussion',
    qotdId: todaysQuestion.id,
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    prayingCount: 0,
    commentCount: 0,
  }
  setPrayers(prev => [newResponse, ...prev])
  setQotdComposerOpen(false)
  recordActivity('prayerWall')
  showToast('Your response has been shared.')
}, [isAuthenticated, user, todaysQuestion.id, recordActivity, showToast])
```

**Scroll to first QOTD response:**
```typescript
const handleScrollToQotdResponses = useCallback(() => {
  if (qotdResponseCount === 0) {
    handleToggleQotdComposer()
    return
  }
  firstQotdResponseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}, [qotdResponseCount, handleToggleQotdComposer])
```

**Category filter logic update:**
In the `filteredPrayers` memo, when a non-discussion and non-null category is active, exclude discussion items:
```typescript
const filteredPrayers = useMemo(() => {
  if (!activeCategory) return prayers
  return allPrayers.filter(p => p.category === activeCategory)
}, [allPrayers, prayers, activeCategory])
```
This already works correctly: when "Discussion" filter is active, it includes QOTD responses. When another filter is active, QOTD responses (category `'discussion'`) are excluded. When "All" is active (`activeCategory === null`), all prayers including discussion show.

**Category counts update:**
The existing `categoryCounts` memo already iterates over `PRAYER_CATEGORIES` which now includes `'discussion'`, so it will automatically count discussion items. No changes needed.

**Layout changes in JSX:**
Insert the QOTD card + composer between the InlineComposer and the prayer feed:

```tsx
<main id="main-content" className="mx-auto max-w-[720px] flex-1 px-4 py-6 sm:py-8">
  {/* Existing InlineComposer */}
  <InlineComposer ... />

  {/* QOTD Card — always visible regardless of filter */}
  <div className="mb-4">
    <QuestionOfTheDay
      responseCount={qotdResponseCount}
      isComposerOpen={qotdComposerOpen}
      onToggleComposer={handleToggleQotdComposer}
      onScrollToResponses={handleScrollToQotdResponses}
    />
    <QotdComposer
      isOpen={qotdComposerOpen}
      onClose={() => setQotdComposerOpen(false)}
      onSubmit={handleQotdSubmit}
    />
  </div>

  {/* Prayer cards feed */}
  <div className="flex flex-col gap-4">
    {filteredPrayers.map((prayer, index) => {
      // Attach ref to first QOTD response for scroll target
      const isFirstQotd = prayer.qotdId === todaysQuestion.id &&
        !filteredPrayers.slice(0, index).some(p => p.qotdId === todaysQuestion.id)
      return (
        <div key={prayer.id} ref={isFirstQotd ? firstQotdResponseRef : undefined}>
          <PrayerCard prayer={prayer} onCategoryClick={handleSelectCategory}>
            ...
          </PrayerCard>
        </div>
      )
    })}
  </div>
  ...
</main>
```

**Auth gating (implementation):**
- "Share Your Thoughts" button on QOTD card → `handleToggleQotdComposer` checks `isAuthenticated`, opens auth modal if false
- QotdComposer submit → `handleQotdSubmit` checks `isAuthenticated` before creating prayer
- `recordActivity('prayerWall')` naturally no-ops when not authenticated

**Responsive behavior:**
- All breakpoints: single-column layout, QOTD card takes full content width
- Mobile: `p-4` on QOTD card, full-width composer
- Desktop: `p-6` on QOTD card, centered within `max-w-[720px]`

**Guardrails (DO NOT):**
- Do NOT remove or reposition the existing InlineComposer — it stays for prayer requests
- Do NOT hide QOTD card when category filter is active — it's always visible
- Do NOT use `scrollIntoView` without `behavior: 'smooth'`
- Do NOT forget to call `recordActivity('prayerWall')` on QOTD response submission
- Do NOT create QOTD responses without `qotdId` and `category: 'discussion'`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| QOTD card renders on Prayer Wall | integration | QuestionOfTheDay component visible |
| QOTD card visible when category filter active | integration | Set filter to 'health', QOTD card still present |
| Logged-out: "Share Your Thoughts" triggers auth modal | integration | Mock auth as logged-out, click button, verify openAuthModal called with 'Sign in to share your thoughts' |
| Logged-in: "Share Your Thoughts" opens composer | integration | Mock auth as logged-in, click → QotdComposer appears |
| QOTD response appears in feed after submit | integration | Submit response, verify new prayer card in feed |
| QOTD response has category 'discussion' and qotdId | integration | Verify new prayer item fields |
| recordActivity called on QOTD submit | integration | Verify recordActivity('prayerWall') called |
| "Discussion" filter shows QOTD responses | integration | Set filter to 'discussion', verify QOTD responses visible |
| Non-discussion filter excludes QOTD responses | integration | Set filter to 'health', verify no discussion items |
| Response count reflects QOTD responses | integration | Verify count matches mock QOTD responses |
| Scroll to first QOTD response | integration | Click response count, verify scrollIntoView called |

**Expected state after completion:**
- [x] QOTD card + composer integrated into Prayer Wall
- [x] Auth gating works correctly
- [x] Category filtering handles 'discussion' correctly
- [x] Faith points awarded on QOTD response
- [x] Scroll to first QOTD response works
- [x] All existing Prayer Wall tests still pass
- [x] New integration tests pass

---

### Step 7: Update Component Exports & Final Polish

**Objective:** Export new components from the barrel file, ensure the Discussion pill appears in the filter bar, and add any missing accessibility/responsive polish.

**Files to modify:**
- `frontend/src/components/prayer-wall/index.ts` (or wherever components are exported) — Add exports for new components
- Verify `CategoryFilterBar` renders "Discussion" pill after "Other"

**Details:**

1. **Exports:** Add `QuestionOfTheDay`, `QotdComposer`, `QotdBadge` to any barrel exports (if the project uses them — check if `components/prayer-wall/index.ts` exists).

2. **Filter bar verification:** Since `PRAYER_CATEGORIES` now includes `'discussion'` at the end, `CategoryFilterBar` will automatically render a "Discussion" pill after "Other". No code changes needed in `CategoryFilterBar` — it maps over `PRAYER_CATEGORIES`.

3. **Screen reader announcement update:** The existing `aria-live="polite"` region in PrayerWall.tsx announces filter changes. Verify it works for the new "Discussion" category: "Showing X Discussion prayers".

4. **Composer animation:** QotdComposer uses the same `overflow-hidden transition-all duration-300` fade-in pattern as InlineComposer. Verify gentle animation on open.

5. **Share button on QOTD card:** Verify the `ShareButton` component works in a dark-background context. The current `ShareButton` has `border-gray-200` styling — it may need a variant for dark backgrounds. If so, add a `variant` prop or use the same `bg-white/10 border-white/30` glass button style.

**[UNVERIFIED]** ShareButton may need dark-variant styling when placed on the QOTD card
→ To verify: Run `/verify-with-playwright` to check visual appearance of share button on QOTD card
→ If wrong: Create a simple share button inline in QuestionOfTheDay that uses `text-white/70 hover:text-white` styling

**Guardrails (DO NOT):**
- Do NOT modify CategoryFilterBar logic — it already works with the expanded category array
- Do NOT add new localStorage keys — responses are stored as prayer items in React state

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Discussion" pill renders in filter bar | integration | Render CategoryFilterBar with 9 categories, verify "Discussion" button |
| "Discussion" pill is after "Other" | integration | Verify DOM order |
| Screen reader announces Discussion filter | a11y | Set filter to discussion, verify aria-live text |

**Expected state after completion:**
- [x] All components properly exported
- [x] Discussion category fully integrated in filter bar
- [x] Accessibility verified
- [x] Feature is complete and ready for visual verification

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Question pool constants & rotation function |
| 2 | — | Add "Discussion" category + `qotdId` type + mock data |
| 3 | — | QOTD Response Composer component |
| 4 | 1 | Question of the Day Card component (uses `getTodaysQuestion`) |
| 5 | 2 | QOTD Badge component (uses `qotdId` field on PrayerRequest) |
| 6 | 1, 2, 3, 4, 5 | Full Prayer Wall integration |
| 7 | 6 | Exports, filter bar verification, polish |

**Steps 1, 2, 3 can be implemented in parallel.** Steps 4 and 5 require their respective dependencies. Step 6 integrates everything. Step 7 is final polish.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Question Pool & Rotation | [COMPLETE] | 2026-03-22 | Created `frontend/src/constants/question-of-the-day.ts` (60 questions, 6 themes, `getTodaysQuestion()`) and `frontend/src/constants/__tests__/question-of-the-day.test.ts` (11 tests, all pass) |
| 2 | Discussion Category + Type + Mock Data | [COMPLETE] | 2026-03-22 | Added `discussion` to `prayer-categories.ts`, `qotdId?` to `PrayerRequest` in `prayer-wall.ts`, 3 mock QOTD responses in `prayer-wall-mock-data.ts`. Updated `CategoryFilterBar.test.tsx` (9→10 buttons). All 105 prayer wall tests pass. |
| 3 | QOTD Composer Component | [COMPLETE] | 2026-03-22 | Created `QotdComposer.tsx` (simplified composer: 500 char, no anon/category, crisis detection) and `QotdComposer.test.tsx` (11 tests, all pass) |
| 4 | Question of the Day Card | [COMPLETE] | 2026-03-22 | Created `QuestionOfTheDay.tsx` (dark card `bg-hero-mid`, white text, share button with dark-variant CSS overrides) and `QuestionOfTheDay.test.tsx` (12 tests, all pass). [UNVERIFIED] bg-hero-mid works well for white text contrast — needs visual verification. |
| 5 | QOTD Badge Component | [COMPLETE] | 2026-03-22 | Created `QotdBadge.tsx` (primary-tinted pill), `QotdBadge.test.tsx` (4 tests). Modified `PrayerCard.tsx` to show badge when `qotdId` set. All existing PrayerCard tests (11) still pass. |
| 6 | Prayer Wall Integration | [COMPLETE] | 2026-03-22 | Modified `PrayerWall.tsx`: added QOTD card + composer between InlineComposer and feed, auth-gated composer toggle, QOTD response submission, scroll-to-response, response count. Created `PrayerWallQotd.test.tsx` (7 tests). All 149 tests pass (21 files). Visual verification: desktop + mobile look correct. |
| 7 | Exports & Polish | [COMPLETE] | 2026-03-22 | No barrel exports needed (direct imports). Fixed TS errors: added `discussion` to CategoryFilterBar test counts, removed unused imports. Created `QotdFilterIntegration.test.tsx` (3 tests). All 166 tests pass (24 files). Build clean (only pre-existing TS errors remain). |
