# Implementation Plan: Devotional Pray Authentic Generation Flow

**Spec:** `_specs/devotional-pray-generation.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/devotional-pray-generation`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure
- **Components:** `frontend/src/components/daily/` — Daily Hub tab content components
- **Mocks:** `frontend/src/mocks/daily-experience-mock-data.ts` — Mock prayer generator + topic keywords
- **Types:** `frontend/src/types/daily-experience.ts` — `PrayContext`, `MockPrayer` interfaces
- **Data:** `frontend/src/data/devotionals.ts` — 50 devotionals with theme, passage, prayer, reflectionQuestion
- **Types:** `frontend/src/types/devotional.ts` — `Devotional`, `DevotionalTheme`, `DevotionalPassage`
- **Pages:** `frontend/src/pages/DailyHub.tsx` — Tab management, context passing via `prayContext` state
- **Tests:** `frontend/src/components/daily/__tests__/` — Vitest + RTL tests with provider wrapping

### Existing Patterns

**Cross-tab context passing (already implemented in `devotional-prompt-passing` plan):**
1. `DevotionalTabContent` calls `onSwitchToPray(theme, customPrompt)` (line 339-342)
2. `DailyHub.handleSwitchToDevotionalPray` sets `prayContext: { from: 'devotional', topic, customPrompt }` (line 147-153)
3. `PrayTabContent` detects `prayContext?.from === 'devotional'` and pre-fills textarea (lines 80-96)
4. Scroll-to-input via `requestAnimationFrame` + `scrollIntoView({ behavior: 'smooth', block: 'center' })` (lines 90-93)

**CTA styling pattern:** `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100` (DevotionalTabContent line 294, 344)

**Mock prayer generator:** `getMockPrayer(userInput)` in `daily-experience-mock-data.ts` (lines 499-509). Iterates `TOPIC_KEYWORDS` map, returns first matching `MockPrayer`. Falls back to `general` topic.

**DevotionalTheme values:** `trust`, `gratitude`, `forgiveness`, `identity`, `anxiety-and-peace`, `faithfulness`, `purpose`, `hope`, `healing`, `community` (10 themes)

**Existing TOPIC_KEYWORDS keys:** `anxiety`, `gratitude`, `healing`, `guidance`, `grief`, `forgiveness`, `relationships`, `strength` (8 topics)

**Theme-to-topic mapping gaps:**
- `trust` → no existing topic (needs devotional-specific prayer)
- `identity` → no existing topic (needs devotional-specific prayer)
- `anxiety-and-peace` → maps to `anxiety`
- `faithfulness` → no existing topic (needs devotional-specific prayer)
- `purpose` → partially maps to `guidance`
- `hope` → no existing topic (needs devotional-specific prayer)
- `community` → partially maps to `relationships`

**Test provider wrapping pattern** (DevotionalTabContent.test.tsx):
```tsx
<MemoryRouter initialEntries={['/daily?tab=devotional']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <ToastProvider>
    <AuthModalProvider>
      <DevotionalTabContent {...props} />
    </AuthModalProvider>
  </ToastProvider>
</MemoryRouter>
```

**PrayTabContent test provider wrapping** includes `AudioProvider` and mocks for `useAuth`, `useFaithPoints`, `useCompletionTracking`, `useReadAloud`.

### Key Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/components/daily/DevotionalTabContent.tsx` | Modify | Remove prayer section, remove bottom CTA, add new CTA with richer context |
| `frontend/src/mocks/daily-experience-mock-data.ts` | Modify | Add devotional-aware prayer detection + devotional prayer template |
| `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` | Modify | Update tests for removed prayer, removed bottom CTA, new CTA placement |
| `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` | Modify | Add test for devotional-aware mock prayer generation |

### What Does NOT Change

- `PrayTabContent.tsx` — devotional pre-fill already works (lines 80-96)
- `DailyHub.tsx` — context passing already works (lines 147-153)
- `PrayContext` type — already has `customPrompt` field
- `devotionals.ts` data — `prayer` field stays in data, just not rendered
- Auth gating — "Help Me Pray" auth check is in PrayTabContent (line 109-111), unchanged
- Crisis banner — `CrisisBanner` in PrayTabContent works on any textarea content, unchanged

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View devotional content | No auth required | N/A | N/A |
| Click "Pray about today's reading" CTA | No auth required (navigates to Pray tab) | Step 1 | N/A — tab switching is not gated |
| "Help Me Pray" on Pray tab | Auth required (existing) | N/A (unchanged) | `useAuth` + `authModal.openAuthModal()` in PrayTabContent line 109-111 |

No new auth gates needed. Existing Pray tab auth gating handles the downstream "Help Me Pray" action.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| CTA pill button | classes | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100` | DevotionalTabContent.tsx:294 |
| CTA section separator | border | `border-t border-white/[0.08]` | Spec design notes |
| CTA section padding | padding | `py-6 sm:py-8` | Spec design notes |
| Intro text | classes | `text-sm text-white/60` | Spec design notes |
| Devotional container | max-width | `max-w-2xl` | DevotionalTabContent.tsx existing pattern |

---

## Design System Reminder

- **CTA pill buttons:** `rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary` — consistent across Journal and Pray CTAs
- **Section separators:** `border-t border-white/[0.08]` for thin dividers between devotional content sections
- **Devotional section padding:** `py-5 sm:py-6` for content sections, `py-6 sm:py-8` for CTA sections per spec
- **Text opacity:** `text-white/60` for labels/intro text, `text-white` for primary content
- **No BackgroundSquiggle on Devotional tab** — uses GlowBackground only
- **Arrow suffix:** Use `&rarr;` HTML entity for CTA arrow (consistent with Journal CTA)
- **DevotionalTheme type:** 10 values — `trust`, `gratitude`, `forgiveness`, `identity`, `anxiety-and-peace`, `faithfulness`, `purpose`, `hope`, `healing`, `community`

---

## Shared Data Models

### PrayContext (existing, unchanged)
```typescript
export interface PrayContext {
  from: 'pray' | 'devotional'
  topic: string
  customPrompt?: string
}
```

### MockPrayer (existing, unchanged)
```typescript
export interface MockPrayer {
  id: string
  topic: string
  text: string
}
```

### DevotionalPassage (existing, unchanged)
```typescript
export interface DevotionalPassage {
  reference: string
  verses: DevotionalVerse[]
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_draft` | Write (overwritten) | Existing draft may be overwritten when devotional context pre-fills textarea |
| `wr_daily_completion` | Read | Pray completion tracking (unchanged behavior) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | CTA section centered, full-width padding. Button auto-width with `px-6`. Intro text above button. |
| Tablet | 768px | Same as mobile — centered column layout. |
| Desktop | 1440px | Same — centered column layout within the `max-w-2xl` devotional container. |

No breakpoint-specific layout changes needed. The CTA section is a simple `flex-col items-center` layout that adapts naturally.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Reflection section → CTA section | `py-6 sm:py-8` (CTA section padding) | Spec design notes |
| Prayer section (removed) → N/A | N/A — section removed | Spec |
| CTA section → Reflection question section | Reflection question has own `border-t border-white/[0.08] py-5 sm:py-6` | DevotionalTabContent.tsx:278 |

The CTA section replaces the prayer section at lines 266-275. It sits between the reflection section (ends at line 263) and the reflection question section (starts at line 278).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `devotional-prompt-passing` plan is complete and committed (context passing infrastructure exists)
- [x] `devotional-layered-containers` plan is complete and committed (current prayer section styling known)
- [x] Auth gating for "Help Me Pray" already handled in PrayTabContent (line 109-111)
- [x] All auth-gated actions from the spec are accounted for in the plan (no new gates needed)
- [x] Design system values verified from codebase inspection (DevotionalTabContent.tsx CTA patterns)
- [x] No [UNVERIFIED] values — all values come from existing code patterns
- [x] Recon report not applicable (no new pages or layouts)
- [ ] `buildReadAloudText` function references `devotional.prayer` — confirm if TTS should still include the static prayer text (Decision: YES, keep it in TTS since the prayer field is still in the data)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `buildReadAloudText` still includes `devotional.prayer` | Keep it | The "Read Aloud" TTS reads the full devotional content. The prayer is still part of the devotional even though it's not rendered as a card. Removing it from TTS would shorten the read-aloud experience. |
| `devotional.prayer` field in data | Keep untouched | Spec explicitly says "The `devotional.prayer` data field remains in the data file but is no longer rendered." |
| Devotional context pre-fill text format | `I'm reflecting on today's devotional about [theme]. The passage is [reference]: "[verse text]". Help me pray about what I've read.` | Richer than the existing `I'm reflecting on [reference]. [question]` — includes theme, passage text, and explicit prayer request. This gives the mock generator more keywords to match. |
| Devotional mock prayer detection | Check for "devotional" or "today's devotional" keywords FIRST (before topic keywords) | Ensures devotional context always returns the devotional-specific prayer, not a random topic match from the passage text. |
| What the devotional mock prayer says | A template prayer that references "today's devotional" and "Your word", thanks God for the reading, and prays for transformation | Spec: "references the theme, thanks for God's word, prayer for change" |
| Scroll-to-input timing | Keep existing `requestAnimationFrame` approach | Spec mentions 100ms fallback, but the existing implementation already works (confirmed in `devotional-prompt-passing` plan execution). Only add timeout if testing reveals issues. |

---

## Implementation Steps

### Step 1: Modify DevotionalTabContent — Remove Prayer Section & Bottom CTA, Add New CTA

**Objective:** Remove the static Closing Prayer card and the duplicate bottom "Pray about today's reading" CTA. Add a new CTA section with intro text and richer prayer context, positioned where the prayer section was.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Remove prayer section (lines 265-275), remove bottom CTA (lines 334-348), add new CTA section

**Details:**

1. **Remove the prayer section** (lines 265-275): Delete the entire `{/* Prayer section */}` block including the dimmed card with "Closing Prayer" label and `devotional.prayer` text.

2. **Remove the bottom cross-tab CTA** (lines 334-348): Delete the entire `{/* Cross-tab CTAs */}` div with the existing "Pray about today's reading" button.

3. **Add new CTA section** where the prayer section was (between reflection section and reflection question section). The new section:

```tsx
{/* Pray CTA section */}
<div className="border-t border-white/[0.08] py-6 sm:py-8">
  <div className="flex flex-col items-center gap-3 text-center">
    <p className="text-sm text-white/60">Ready to pray about today&apos;s reading?</p>
    <button
      type="button"
      onClick={() => {
        const verseText = devotional.passage.verses.map((v) => v.text).join(' ')
        const customPrompt = `I'm reflecting on today's devotional about ${devotional.theme}. The passage is ${devotional.passage.reference}: "${verseText}". Help me pray about what I've read.`
        onSwitchToPray?.(devotional.theme, customPrompt)
      }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
    >
      Pray about today&apos;s reading &rarr;
    </button>
  </div>
</div>
```

4. **Keep `buildReadAloudText` unchanged** — it still includes `devotional.prayer` in the TTS content.

**Auth gating:** None required. CTA switches tabs; auth check is on the downstream "Help Me Pray" button in PrayTabContent.

**Responsive behavior (UI steps only):**
- Desktop (1440px): Centered CTA within `max-w-2xl` container
- Tablet (768px): Same — centered column
- Mobile (375px): Same — centered column, button auto-width with `px-6`

**Guardrails (DO NOT):**
- DO NOT delete the `devotional.prayer` field from the data file
- DO NOT remove `devotional.prayer` from `buildReadAloudText`
- DO NOT change the Journal CTA ("Journal about this question →") — it stays in the reflection question card
- DO NOT change PrayTabContent or DailyHub — context passing already works
- DO NOT add auth gating to the CTA button itself — only the downstream "Help Me Pray" is gated

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Closing Prayer section is not rendered | unit | Assert no element with text "Closing Prayer" exists |
| `devotional.prayer` text is not visible | unit | Assert the prayer text string from the mock devotional is not in the document |
| CTA intro text is visible | unit | Assert "Ready to pray about today's reading?" text exists with `text-sm text-white/60` |
| CTA button is visible with correct text | unit | Assert button with text matching /Pray about today.*reading/ exists |
| CTA button has pill styling | unit | Assert button has `rounded-full bg-white` classes |
| CTA button meets 44px touch target | unit | Assert button has `min-h-[44px]` class |
| CTA has border-t separator | unit | Assert CTA container has `border-t border-white/[0.08]` |
| CTA calls onSwitchToPray with theme and rich context | unit | Click CTA, assert `onSwitchToPray` called with devotional theme as first arg and customPrompt containing theme, passage reference, and verse text |
| Only one "Pray about today's reading" button exists | unit | Assert exactly 1 button matching /Pray about today/ |
| No duplicate bottom CTA | unit | Assert the old bottom CTA wrapper (`mt-8 flex justify-center sm:mt-10`) is gone |

**Expected state after completion:**
- [ ] No "Closing Prayer" card visible on devotional tab
- [ ] New CTA section with intro text + pill button where prayer section was
- [ ] Only one "Pray about today's reading" button (no duplicate at bottom)
- [ ] CTA passes theme + rich context (theme, reference, verse text) to `onSwitchToPray`
- [ ] `buildReadAloudText` still includes `devotional.prayer`
- [ ] All existing tests updated and passing

---

### Step 2: Add Devotional-Aware Mock Prayer Detection

**Objective:** Enhance `getMockPrayer()` to detect devotional context in the input text and return a devotional-specific prayer template that references the theme, thanks God for His word, and prays for transformation.

**Files to modify:**
- `frontend/src/mocks/daily-experience-mock-data.ts` — Add devotional prayer + detection logic

**Details:**

1. **Add devotional keywords** to detect devotional context. The pre-filled text from Step 1 contains phrases like "today's devotional", "devotional about", "Help me pray about what I've read". Add detection for these.

2. **Add a devotional-specific MockPrayer** to the `MOCK_PRAYERS` array:

```typescript
{
  id: 'prayer-devotional',
  topic: 'devotional',
  text: 'Dear God, thank You for speaking to me through Your word today. As I reflect on what I have read, I am reminded that Your truth is living and active, always meeting me right where I am. Help me to carry the message of this passage into my day — not just as head knowledge, but as a reality that transforms how I think, speak, and love. Where I have been holding back from You, give me the courage to surrender. Where I have been striving in my own strength, teach me to rest in Yours. Let the seeds planted by today\'s reading take root deep in my heart and bear fruit that blesses those around me. I am grateful for this time in Your presence. Continue to shape me into the person You created me to be. Amen.',
},
```

3. **Modify `getMockPrayer()`** to check for devotional context FIRST (before topic keyword matching):

```typescript
export function getMockPrayer(userInput: string): MockPrayer {
  const lower = userInput.toLowerCase()

  // Check for devotional context first
  const devotionalKeywords = ["today's devotional", 'devotional about', "what i've read", 'devotional on']
  if (devotionalKeywords.some((kw) => lower.includes(kw))) {
    return MOCK_PRAYERS.find((p) => p.topic === 'devotional') ?? MOCK_PRAYERS[MOCK_PRAYERS.length - 1]
  }

  // Existing topic keyword matching
  for (const prayer of MOCK_PRAYERS) {
    const keywords = TOPIC_KEYWORDS[prayer.topic]
    if (keywords && keywords.some((kw) => lower.includes(kw))) {
      return prayer
    }
  }
  // Fallback to general prayer
  return MOCK_PRAYERS.find((p) => p.topic === 'general') ?? MOCK_PRAYERS[0]
}
```

**Key design choice:** Devotional detection runs BEFORE topic keywords. This prevents the passage text (which may contain words like "heal", "forgive", "strength") from accidentally matching a non-devotional topic.

**Auth gating:** N/A — `getMockPrayer` is a pure function with no auth checks.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify existing `TOPIC_KEYWORDS` map — existing keyword matching must remain unchanged
- DO NOT reorder existing `MOCK_PRAYERS` array entries — only append the devotional prayer
- DO NOT change the `MockPrayer` type — the devotional prayer uses the same `{ id, topic, text }` shape
- DO NOT add devotional keywords to the `TOPIC_KEYWORDS` map — keep devotional detection separate and first-priority

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns devotional prayer for "today's devotional" input | unit | Call `getMockPrayer("I'm reflecting on today's devotional about trust...")`, assert result has `topic: 'devotional'` |
| Returns devotional prayer for "devotional about" input | unit | Call `getMockPrayer("devotional about healing")`, assert result has `topic: 'devotional'` |
| Returns devotional prayer for "what I've read" input | unit | Call `getMockPrayer("Help me pray about what I've read")`, assert result has `topic: 'devotional'` |
| Devotional prayer text contains expected themes | unit | Assert devotional prayer text includes "Your word", "passage", "read" |
| Non-devotional input still returns category-matched prayer | unit | Call `getMockPrayer("I'm anxious about work")`, assert result has `topic: 'anxiety'` |
| General fallback still works | unit | Call `getMockPrayer("hello")`, assert result has `topic: 'general'` |
| Devotional detection takes priority over topic keywords | unit | Call `getMockPrayer("today's devotional about healing and strength")`, assert result has `topic: 'devotional'` (not `healing` or `strength`) |

**Expected state after completion:**
- [ ] `getMockPrayer` returns devotional-specific prayer when input contains devotional context phrases
- [ ] Devotional prayer text thanks God for His word, reflects on the reading, prays for transformation
- [ ] Non-devotional inputs continue to return category-matched prayers (regression test)
- [ ] General fallback continues to work for unmatched inputs
- [ ] All new and existing tests passing

---

### Step 3: Update Tests for DevotionalTabContent Changes

**Objective:** Update existing tests and add new tests to cover the prayer section removal, bottom CTA removal, and new CTA section behavior.

**Files to modify:**
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — Update/add tests

**Details:**

1. **Update existing cross-tab CTA tests** (lines 204-216): The existing test `"Pray about today's reading" calls onSwitchToPray with theme and combined context` needs to verify the new richer context format. The `customPrompt` should now contain:
   - The devotional theme (e.g., "trust")
   - The passage reference (e.g., "Proverbs 3:5-6")
   - The passage verse text
   - The phrase "Help me pray about what I've read"
   - Should NOT contain the reflection question (old format)

2. **Remove or update any tests that assert the prayer section exists.** Search for tests that check for "Closing Prayer" text or `devotional.prayer` rendering.

3. **Add new tests** in a new describe block `'Pray CTA section'`:

| Test | Type | Description |
|------|------|-------------|
| Prayer section is removed | unit | Assert no "Closing Prayer" label text in document |
| `devotional.prayer` text not rendered | unit | Assert prayer text string not visible (using first devotional's prayer text) |
| CTA intro text renders | unit | Assert "Ready to pray about today's reading?" visible |
| CTA intro text styling | unit | Assert intro text element has `text-sm` and `text-white/60` classes |
| CTA button renders with correct text | unit | Assert button matching /Pray about today.*reading/ exists |
| CTA button has pill styling | unit | Assert button className contains `rounded-full` and `bg-white` |
| CTA section has top border separator | unit | Assert CTA section container has `border-t` class |
| CTA calls onSwitchToPray with theme and rich context | unit | Click button, verify `onSwitchToPray` called with theme as first arg, customPrompt containing theme + passage reference + verse text |
| Only one Pray CTA button exists | unit | Assert `getAllByRole('button', { name: /pray about today/i })` has length 1 |
| customPrompt does NOT contain old format | unit | Click button, verify customPrompt does NOT contain "reflecting on [reference]. [question]" (old format) |

4. **Update the existing CTA test** at lines 204-216 to match the new context format. The assertion should check that `customPrompt` contains the theme, passage reference, and verse text instead of "reflecting on".

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT delete tests for the Journal CTA — that's unchanged
- DO NOT modify test provider wrapping — keep the same `MemoryRouter + ToastProvider + AuthModalProvider` pattern
- DO NOT change test for `buildReadAloudText` or Read Aloud — TTS behavior is unchanged

**Expected state after completion:**
- [ ] No test references "Closing Prayer" as expected visible content
- [ ] New CTA section tests verify intro text, button styling, border separator, and rich context
- [ ] Existing CTA test updated for new context format
- [ ] Only 1 "Pray about today's reading" button asserted
- [ ] All tests passing (`pnpm test`)

---

### Step 4: Add Tests for Devotional-Aware Mock Prayer Generator

**Objective:** Add unit tests for the devotional-aware `getMockPrayer` behavior in a test file.

**Files to create:**
- `frontend/src/mocks/__tests__/daily-experience-mock-data.test.ts` — New test file for `getMockPrayer`

**Details:**

Check if this test file already exists. If it does, add to it. If not, create it.

```typescript
import { describe, it, expect } from 'vitest'
import { getMockPrayer } from '../daily-experience-mock-data'

describe('getMockPrayer', () => {
  describe('devotional context detection', () => {
    it('returns devotional prayer for "today\'s devotional" input', () => {
      const result = getMockPrayer("I'm reflecting on today's devotional about trust. The passage is Proverbs 3:5-6.")
      expect(result.topic).toBe('devotional')
    })

    it('returns devotional prayer for "devotional about" input', () => {
      const result = getMockPrayer('devotional about healing')
      expect(result.topic).toBe('devotional')
    })

    it('returns devotional prayer for "what I\'ve read" input', () => {
      const result = getMockPrayer('Help me pray about what I\'ve read')
      expect(result.topic).toBe('devotional')
    })

    it('devotional prayer text references God\'s word and reading', () => {
      const result = getMockPrayer("today's devotional about trust")
      expect(result.text).toContain('word')
      expect(result.text).toContain('read')
    })

    it('devotional detection takes priority over topic keywords', () => {
      const result = getMockPrayer("today's devotional about healing and strength")
      expect(result.topic).toBe('devotional')
    })
  })

  describe('existing topic matching (regression)', () => {
    it('returns anxiety prayer for anxiety-related input', () => {
      const result = getMockPrayer("I'm anxious about work")
      expect(result.topic).toBe('anxiety')
    })

    it('returns general prayer for unmatched input', () => {
      const result = getMockPrayer('hello')
      expect(result.topic).toBe('general')
    })
  })
})
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT import or test any component — this is a pure function test, no React/DOM needed
- DO NOT mock any dependencies — `getMockPrayer` is a pure function

**Test specifications:**
(Tests are the deliverable of this step — see code above for the 7 test cases.)

**Expected state after completion:**
- [ ] New test file exists with 7 tests for `getMockPrayer`
- [ ] All tests passing
- [ ] Devotional detection verified with multiple keyword patterns
- [ ] Regression tests confirm existing topic matching unchanged

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Modify DevotionalTabContent: remove prayer section, remove bottom CTA, add new CTA |
| 2 | — | Add devotional-aware mock prayer detection |
| 3 | 1 | Update DevotionalTabContent tests for new UI |
| 4 | 2 | Add getMockPrayer unit tests |

Steps 1 and 2 are independent and can be executed in parallel.
Steps 3 and 4 are independent of each other but depend on steps 1 and 2 respectively.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Modify DevotionalTabContent UI | [COMPLETE] | 2026-04-06 | Removed Closing Prayer card (lines 265-275), removed bottom CTA (lines 334-348), added new Pray CTA section with intro text + rich context (theme, reference, verse text). Also removed dead code: `REFLECTION_PREFIX` const and `stripReflectionPrefix` fn (only used by removed bottom CTA). |
| 2 | Add devotional-aware mock prayer detection | [COMPLETE] | 2026-04-06 | Appended devotional MockPrayer to MOCK_PRAYERS array. Modified getMockPrayer() to check devotional keywords first before topic keyword matching. |
| 3 | Update DevotionalTabContent tests | [COMPLETE] | 2026-04-06 | Removed 4 Closing Prayer rendering tests + 3 Tier 4 prayer container tests. Added 1 "does not render Closing Prayer" test. Updated Pray CTA test for new rich context format (theme, passage reference, verse text). Renamed stripReflectionPrefix test. Added 7 new Pray CTA section tests (intro text, styling, button, pill, touch target, border separator, uniqueness, no duplicate wrapper). |
| 4 | Add getMockPrayer unit tests | [COMPLETE] | 2026-04-06 | Added 7 tests to existing test file: devotional detection for 3 keyword patterns, prayer text content check, priority over topic keywords, regression for existing anxiety matching, general fallback. |
