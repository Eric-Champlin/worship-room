# Implementation Plan: Inner Page Hero Font Standardization

**Spec:** `_specs/inner-page-hero-font-standard.md`
**Date:** 2026-03-30
**Branch:** `claude/feature/inner-page-hero-font-standard`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Current State

All inner page hero headings currently use the same pattern:
```
font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl
```

This renders the **entire** heading in Caveat (script) at `text-3xl/text-4xl` with a **left-to-right** (90-degree) Tailwind gradient from white to `#8B5CF6`.

The **home page hero** (`HeroSection.tsx`) uses a different approach:
```tsx
style={{
  color: 'white',
  backgroundImage: WHITE_PURPLE_GRADIENT, // 223deg
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}
className="text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl"
```

This spec standardizes inner page heroes to match the home page: **223-degree gradient via inline style**, **Inter font** (not Caveat), **larger sizing**, with **one Caveat accent word** per heading.

### Files Affected

**Shared hero components (3):**
- `frontend/src/components/PageHero.tsx` — used by MusicPage, AskPage, MyPrayers, 6 meditation sub-pages
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — hardcoded "Prayer Wall" heading
- `frontend/src/components/local-support/LocalSupportHero.tsx` — receives title via prop

**LocalSupportPage config (1):**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — passes `scriptWord` to hero

**Local Support page configs (3):**
- `frontend/src/pages/Churches.tsx` — title: "Find a Church Near You"
- `frontend/src/pages/Counselors.tsx` — title: "Find a Christian Counselor"
- `frontend/src/pages/CelebrateRecovery.tsx` — title: "Find Celebrate Recovery"

**PageHero consumers (3):**
- `frontend/src/pages/MusicPage.tsx` — `<PageHero title="Music">`
- `frontend/src/pages/AskPage.tsx` — `<PageHero title="Ask God's Word">`
- `frontend/src/pages/MyPrayers.tsx` — `<PageHero title="My Prayers">`

**Meditation sub-pages (6) — all use `<PageHero>`, just need scriptWord prop:**
- `BreathingExercise.tsx`, `ScriptureSoaking.tsx`, `GratitudeReflection.tsx`, `ActsPrayerWalk.tsx`, `PsalmReading.tsx`, `ExamenReflection.tsx`

**Inline hero pages (11):**
- `BibleBrowser.tsx`, `GrowPage.tsx`, `Insights.tsx`, `Friends.tsx`, `Settings.tsx`, `MonthlyReport.tsx`, `RoutinesPage.tsx`, `GrowthProfile.tsx`, `ChallengeDetail.tsx`, `BibleReader.tsx`, `ReadingPlanDetail.tsx`

**Constants:**
- `frontend/src/constants/gradients.ts` — already has `WHITE_PURPLE_GRADIENT`

**Test files (3+):**
- `frontend/src/components/__tests__/PageHero.test.tsx`
- `frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx`
- `frontend/src/components/local-support/__tests__/LocalSupportHero.test.tsx`

### Existing Patterns

- **PageHero.tsx** (line 22-54): accepts `title: string`, `subtitle?: string`, `showDivider?: boolean`, `children?: ReactNode`. Uses `ATMOSPHERIC_HERO_BG` background. Title rendered as plain text in `<h1>`. Optional `HeadingDivider` via `useElementWidth()`.
- **LocalSupportHero.tsx** (line 12-38): accepts `headingId`, `title`, `subtitle`, `extraContent?`, `action?`. Same visual pattern as PageHero.
- **PrayerWallHero.tsx** (line 9-25): hardcoded "Prayer Wall" heading, accepts only `action?` prop.
- **HeroSection.tsx** (line 126-136): reference implementation — applies `WHITE_PURPLE_GRADIENT` via inline style with `backgroundClip: 'text'`.
- All subtitles use: `font-serif italic text-base text-white/60 sm:text-lg`
- All hero containers use: `ATMOSPHERIC_HERO_BG` background with `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` padding.

### Test Patterns

- Tests use Vitest + React Testing Library
- Hero tests check: heading accessible name via `getByRole('heading')`, subtitle text, CSS class assertions, ARIA landmarks
- PrayerWallHero test checks `{ name: 'Prayer Wall', level: 1 }` — this will still work since the heading text stays the same
- LocalSupportHero test checks `px-1`/`sm:px-2` classes — keep these on the h1
- PageHero test checks heading name and `px-1`/`sm:px-2` classes

### DO NOT TOUCH

- **DailyHub.tsx** — time-of-day greeting ("Good Morning!", etc.) stays in full Caveat. Explicitly out of scope.
- **DashboardHero.tsx** — separate greeting pattern, out of scope.
- **HeroSection.tsx** — home page hero is the reference; do not modify.
- **Hero backgrounds** — `ATMOSPHERIC_HERO_BG` stays unchanged; only text treatment changes.

---

## Auth Gating Checklist

N/A — this is a visual-only change. No interactive elements are added or modified. All existing auth behavior remains unchanged.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero heading gradient | backgroundImage | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `constants/gradients.ts:4` (`WHITE_PURPLE_GRADIENT`) |
| Hero heading gradient | backgroundClip | `text` (+ `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`) | `HeroSection.tsx:128-133` |
| Hero heading sizing (inner) | font-size | `text-3xl sm:text-4xl lg:text-5xl` (1.875rem / 2.25rem / 3rem) | Spec requirement |
| Hero heading font | font-family | Inter (default sans — no font class needed) | Spec: "Inter (the default sans-serif body font)" |
| Hero heading weight | font-weight | `font-bold` (700) | Existing pattern |
| Caveat accent word | font-family | `font-script` (Caveat) | Spec: "One word in each heading uses font-script" |
| Subtitle | font | `font-serif italic text-base sm:text-lg text-white/60` (Lora 1rem/1.125rem) | Existing pattern, confirmed in spec |
| Hero container | padding | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` | `PageHero.tsx:28` |
| Hero background | backgroundColor | `#0f0a1e` with radial gradient overlay | `PageHero.tsx:9-13` (ATMOSPHERIC_HERO_BG) |
| Heading fallback color | color | `white` (prevents flash if gradient fails) | `HeroSection.tsx:128` |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- **Caveat is for ONE accent word only** — the h1 itself is Inter (no `font-script` on the h1 element). Only the accent word `<span>` gets `font-script`.
- **Use `WHITE_PURPLE_GRADIENT` constant** from `constants/gradients.ts` — NOT Tailwind gradient classes. The 223-degree angle is the whole point of this spec.
- **Apply gradient via inline style** — `backgroundImage`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`, `color: 'white'`. Must match `HeroSection.tsx` exactly.
- **Remove ALL Tailwind gradient classes** — `bg-gradient-to-r`, `from-white`, `to-primary-lt`, `bg-clip-text`, `text-transparent` must all be removed from headings being updated.
- **Keep `px-1 sm:px-2`** on the h1 — this prevents Caveat accent words from being clipped by `background-clip: text`.
- **Text opacity standards**: subtitle at `text-white/60` meets WCAG AA for large text (18px+). Do not change.
- **Mood colors**: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399 (not relevant to this spec but displayed per protocol).
- **Toast API**: `showToast(message, type)` where type is `'success'` (not `'celebration'`). Not relevant to this spec.

---

## Shared Data Models (from Master Plan)

N/A — standalone visual polish feature. No new data models, localStorage keys, or cross-spec dependencies.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Heading: `text-3xl` (1.875rem). Subtitle: `text-base` (1rem). Single-line headings may wrap naturally. |
| Tablet | 768px | Heading: `text-4xl` (2.25rem) via `sm:` prefix. Subtitle: `text-lg` (1.125rem). |
| Desktop | 1440px | Heading: `text-5xl` (3rem) via `lg:` prefix. Subtitle: `text-lg`. All headings single-line. |

No heading text should be cut off at any viewport width. The Caveat accent word wraps naturally with the heading — no forced line breaks.

---

## Vertical Rhythm

No changes to vertical spacing. Hero container padding (`pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40`) and margins between heading/subtitle/divider remain unchanged. Only the text treatment (font, size, gradient) is being modified.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `WHITE_PURPLE_GRADIENT` constant exists in `constants/gradients.ts` with value `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`
- [x] All inner page heroes use the same Tailwind gradient pattern (`bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`)
- [x] DailyHub greeting is explicitly excluded (Section 6 of spec)
- [x] Design system values are verified from codebase inspection (file paths cited above)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [x] No auth-gated actions in this spec
- [x] Heading text changes are minimal (keep existing text, just change visual treatment)
- [ ] Existing tests pass before starting (`pnpm test`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| scriptWord for dynamic titles (ChallengeDetail, ReadingPlanDetail) | Extract last word at runtime | Spec says "(last word)" for ChallengeDetail; consistent pattern for other dynamic titles |
| scriptWord for BibleReader | Book name rendered in Caveat | Spec says "(book name)" — the book name is already separate from "Chapter X" |
| scriptWord for GrowthProfile | Change heading to "{name}'s Garden" with "Garden" in Caveat | Spec suggests this thematic heading; current heading is just the display name |
| Meditation sub-page titles | Add scriptWord to each PageHero usage | Acceptance criteria: "Each inner page heading has exactly one word rendered in Caveat" |
| PsalmReading multiple titles | Use different scriptWord per screen (e.g., "Reading", "119", Psalm name) | PsalmReading has 5 PageHero usages with different titles depending on screen state |
| PageHero `scriptWord` when omitted | Render entire heading in Inter (no accent) | Safe fallback; no existing consumer breaks |
| Keep `px-1 sm:px-2` padding on h1 | Yes — prevents Caveat accent clipping | Existing pattern for `background-clip: text` + Caveat combination |
| ReadingPlanDetail (not in spec table) | Apply same visual treatment, use last word of plan title as accent | Same pattern as other pages; consistent visual language |
| `GRADIENT_TEXT_STYLE` constant | Add to `constants/gradients.ts` for reuse | Prevents repeating 5-line inline style object across 15+ files |
| `renderWithScriptAccent` helper | Add to `constants/gradients.ts` | Small helper for splitting title + wrapping accent word; used by PageHero, LocalSupportHero, and inline heroes with dynamic titles |

---

## Implementation Steps

### Step 1: Add gradient text utilities and update PageHero.tsx

**Objective:** Add shared `GRADIENT_TEXT_STYLE` constant and `renderWithScriptAccent` helper to `gradients.ts`, then update `PageHero.tsx` to use the 223-degree gradient, larger sizing, and support a `scriptWord` prop.

**Files to create/modify:**
- `frontend/src/constants/gradients.ts` — add `GRADIENT_TEXT_STYLE` constant and `renderWithScriptAccent` helper
- `frontend/src/components/PageHero.tsx` — new gradient, sizing, scriptWord prop

**Details:**

In `gradients.ts`, add after the existing `WHITE_PURPLE_GRADIENT` constant:

```typescript
import type { CSSProperties, ReactNode } from 'react'

/** Inline style for gradient text headings — matches HeroSection.tsx */
export const GRADIENT_TEXT_STYLE: CSSProperties = {
  color: 'white',
  backgroundImage: WHITE_PURPLE_GRADIENT,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

/**
 * Renders heading text with one word in Caveat script font.
 * If scriptWord is not found in the text, returns the text unchanged.
 */
export function renderWithScriptAccent(text: string, scriptWord?: string): ReactNode {
  if (!scriptWord) return text
  const idx = text.indexOf(scriptWord)
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const after = text.slice(idx + scriptWord.length)
  return (
    <>
      {before}<span className="font-script">{scriptWord}</span>{after}
    </>
  )
}
```

In `PageHero.tsx`:
- Add `scriptWord?: string` to `PageHeroProps`
- Import `GRADIENT_TEXT_STYLE` and `renderWithScriptAccent` from `@/constants/gradients`
- Replace the h1 className: remove `font-script`, `bg-gradient-to-r`, `from-white`, `to-primary-lt`, `bg-clip-text`, `text-transparent`. Change sizing to `text-3xl sm:text-4xl lg:text-5xl`. Keep `px-1 sm:px-2 font-bold leading-tight`.
- Add `style={GRADIENT_TEXT_STYLE}` to the h1
- Render title via `renderWithScriptAccent(title, scriptWord)`

Updated h1:
```tsx
<h1
  ref={showDivider ? headingRef : undefined}
  id="page-hero-heading"
  className={cn(
    'px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl',
    showDivider ? 'inline-block' : 'mb-3'
  )}
  style={GRADIENT_TEXT_STYLE}
>
  {renderWithScriptAccent(title, scriptWord)}
</h1>
```

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): `text-5xl` (3rem) heading
- Tablet (768px): `text-4xl` (2.25rem) heading
- Mobile (375px): `text-3xl` (1.875rem) heading

**Guardrails (DO NOT):**
- DO NOT add `font-script` to the h1 element itself — only the accent word span gets it
- DO NOT change the `ATMOSPHERIC_HERO_BG` background
- DO NOT change the subtitle styling
- DO NOT change the container padding or layout
- DO NOT remove the `showDivider` / `HeadingDivider` support
- DO NOT remove the `children` slot
- DO NOT modify HeroSection.tsx (home page hero)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders title with gradient inline style | unit | Verify h1 has `style` attribute containing `backgroundImage` |
| renders scriptWord in font-script span | unit | `<PageHero title="My Prayers" scriptWord="Prayers" />` → heading contains span with `font-script` class |
| renders title without accent when scriptWord omitted | unit | `<PageHero title="Music" />` → heading text is plain "Music" |
| retains px-1 sm:px-2 padding | unit | Keep existing test assertion |
| uses lg:text-5xl sizing | unit | Verify h1 className contains `lg:text-5xl` |
| does not use font-script on h1 | unit | Verify h1 className does NOT contain `font-script` |

**Expected state after completion:**
- [ ] `GRADIENT_TEXT_STYLE` exported from `constants/gradients.ts`
- [ ] `renderWithScriptAccent` exported from `constants/gradients.ts`
- [ ] `PageHero` renders with 223-degree gradient inline style
- [ ] `PageHero` supports optional `scriptWord` prop
- [ ] `PageHero` h1 is `text-3xl sm:text-4xl lg:text-5xl font-bold` (no `font-script`)
- [ ] Existing PageHero consumers still render (no breaking changes — scriptWord is optional)

---

### Step 2: Update PrayerWallHero.tsx and LocalSupportHero.tsx

**Objective:** Apply the standardized gradient + sizing + Caveat accent to the two standalone hero components.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — gradient + sizing + hardcoded accent word
- `frontend/src/components/local-support/LocalSupportHero.tsx` — gradient + sizing + scriptWord prop
- `frontend/src/components/local-support/LocalSupportPage.tsx` — add `scriptWord` to config interface and pass-through

**Details:**

**PrayerWallHero.tsx:** The heading is hardcoded "Prayer Wall". The accent word is "Wall".
- Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`
- Replace h1 className: remove `font-script`, `bg-gradient-to-r`, `from-white`, `to-primary-lt`, `bg-clip-text`, `text-transparent`. Add `text-3xl sm:text-4xl lg:text-5xl`. Keep `px-1 sm:px-2 font-bold leading-tight`.
- Add `style={GRADIENT_TEXT_STYLE}` to h1
- Change h1 content from `Prayer Wall` to `Prayer <span className="font-script">Wall</span>`

Updated h1:
```tsx
<h1 id="prayer-wall-heading" className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
  Prayer <span className="font-script">Wall</span>
</h1>
```

**LocalSupportHero.tsx:**
- Add `scriptWord?: string` to `LocalSupportHeroProps`
- Import `GRADIENT_TEXT_STYLE`, `renderWithScriptAccent` from `@/constants/gradients`
- Same h1 changes as PrayerWallHero (remove Tailwind gradient, add inline style, change sizing)
- Render title via `renderWithScriptAccent(title, scriptWord)`

**LocalSupportPage.tsx:**
- Add `scriptWord?: string` to `LocalSupportPageConfig` interface (line 22-32)
- Pass `scriptWord={config.scriptWord}` to `<LocalSupportHero>` at line 240-245

**Auth gating:** N/A

**Responsive behavior:**
- Same as Step 1 — `text-3xl sm:text-4xl lg:text-5xl`

**Guardrails (DO NOT):**
- DO NOT change PrayerWallHero's heading text ("Prayer Wall") or subtitle ("You're not alone.")
- DO NOT change LocalSupportHero's subtitle styling or layout
- DO NOT change the `action` or `extraContent` slot behavior
- DO NOT change ATMOSPHERIC_HERO_BG
- DO NOT modify PrayerWallHero to accept `title` as a prop — it's intentionally hardcoded

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerWallHero: heading still accessible as "Prayer Wall" | unit | `getByRole('heading', { name: 'Prayer Wall' })` still finds heading (span is inline) |
| PrayerWallHero: heading has gradient inline style | unit | Verify h1 has `style.backgroundImage` |
| PrayerWallHero: accent word "Wall" in font-script span | unit | Query for span with `font-script` class containing "Wall" |
| LocalSupportHero: renders scriptWord accent | unit | Pass `scriptWord="Church"` with `title="Find a Church"`, verify span |
| LocalSupportHero: renders without accent when scriptWord omitted | unit | Title renders as plain text |

**Expected state after completion:**
- [ ] PrayerWallHero uses 223-degree gradient with "Wall" in Caveat
- [ ] LocalSupportHero supports `scriptWord` prop with gradient treatment
- [ ] LocalSupportPageConfig includes `scriptWord?: string`
- [ ] LocalSupportPage passes `scriptWord` to hero

---

### Step 3: Add scriptWord to Local Support and simple PageHero consumers

**Objective:** Wire up scriptWord prop for all pages using PageHero or LocalSupportPage — Churches, Counselors, CelebrateRecovery, MusicPage, AskPage, MyPrayers.

**Files to create/modify:**
- `frontend/src/pages/Churches.tsx` — add `scriptWord: 'Church'` to config
- `frontend/src/pages/Counselors.tsx` — add `scriptWord: 'Counselor'` to config
- `frontend/src/pages/CelebrateRecovery.tsx` — add `scriptWord: 'Recovery'` to config

**Details:**

Each file gets one added line in the config object:

**Churches.tsx** (config at line 19-27): add `scriptWord: 'Church',` — matches "Find a **Church** Near You"

**Counselors.tsx** (config at line 19-30): add `scriptWord: 'Counselor',` — matches "Find a Christian **Counselor**"

**CelebrateRecovery.tsx** (config at line 18-38): add `scriptWord: 'Recovery',` — matches "Find Celebrate **Recovery**"

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — just wiring props.

**Guardrails (DO NOT):**
- DO NOT change heading text, subtitle text, or any other config values
- DO NOT change component structure or layout
- DO NOT modify the LocalSupportPage component itself (already updated in Step 2)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No new tests needed | — | Existing LocalSupportHero tests validate the rendering. Integration is validated visually. |

**Expected state after completion:**
- [ ] All 3 Local Support pages pass `scriptWord` to their hero
- [ ] Accent words: Church, Counselor, Recovery

---

### Step 4: Add scriptWord to MusicPage, AskPage, MyPrayers, and meditation sub-pages

**Objective:** Add scriptWord prop to all remaining PageHero consumers.

**Files to create/modify:**
- `frontend/src/pages/MusicPage.tsx` — add `scriptWord="Music"`
- `frontend/src/pages/AskPage.tsx` — add `scriptWord="Word"`
- `frontend/src/pages/MyPrayers.tsx` — add `scriptWord="Prayers"`
- `frontend/src/pages/meditate/BreathingExercise.tsx` — add `scriptWord="Exercise"` (3 usages)
- `frontend/src/pages/meditate/ScriptureSoaking.tsx` — add `scriptWord="Soaking"` (3 usages)
- `frontend/src/pages/meditate/GratitudeReflection.tsx` — add `scriptWord="Reflection"` (2 usages)
- `frontend/src/pages/meditate/ActsPrayerWalk.tsx` — add `scriptWord="Walk"` (2 usages)
- `frontend/src/pages/meditate/PsalmReading.tsx` — add `scriptWord` per usage (5 usages: "Reading", "119", psalm-specific)
- `frontend/src/pages/meditate/ExamenReflection.tsx` — add `scriptWord="Reflection"` (2 usages)

**Details:**

Each change is adding a single prop to an existing `<PageHero>` element:

| File | Line(s) | Change |
|------|---------|--------|
| MusicPage.tsx | ~183 | `<PageHero title="Music" scriptWord="Music" subtitle="...">` |
| AskPage.tsx | ~214 | `<PageHero title="Ask God's Word" scriptWord="Word" showDivider>` |
| MyPrayers.tsx | ~177 | `<PageHero title="My Prayers" scriptWord="Prayers" subtitle="...">` |
| BreathingExercise.tsx | ~170, ~216, ~256 | `scriptWord="Exercise"` on all 3 `<PageHero>` usages |
| ScriptureSoaking.tsx | ~133, ~161, ~215 | `scriptWord="Soaking"` on all 3 usages |
| GratitudeReflection.tsx | ~90, ~131 | `scriptWord="Reflection"` on both usages |
| ActsPrayerWalk.tsx | ~52, ~82 | `scriptWord="Walk"` on both usages |
| PsalmReading.tsx | ~89, ~117, ~154, ~217 | `scriptWord="Reading"` on selection screens; title-appropriate for psalm-specific screens |
| ExamenReflection.tsx | ~52, ~82 | `scriptWord="Reflection"` on both usages |

**Special case — PsalmReading.tsx:** Has 5 `<PageHero>` usages with different titles:
1. `title="Psalm Reading"` → `scriptWord="Reading"`
2. `title="Psalm 119"` → `scriptWord="119"` (no — this looks odd in Caveat; use `scriptWord="Psalm"`)
3. `title="Choose a section to read."` subtitle → `scriptWord="Reading"` (title is "Psalm 119")
4. `title={title}` (dynamic psalm title like "Psalm 23") → `scriptWord="Psalm"`
5. `title="Psalm Reading"` → `scriptWord="Reading"`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — just wiring props.

**Guardrails (DO NOT):**
- DO NOT change any heading text, subtitle, or other props
- DO NOT change component structure or layout
- DO NOT add scriptWord to DailyHub — explicitly excluded

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No new tests needed | — | PageHero tests from Step 1 cover scriptWord rendering |

**Expected state after completion:**
- [ ] All PageHero consumers pass scriptWord
- [ ] All meditation sub-pages show Caveat accent on appropriate word

---

### Step 5: Update inline heroes — BibleBrowser, GrowPage, Insights

**Objective:** Replace Tailwind gradient + `font-script` on inline hero headings with `GRADIENT_TEXT_STYLE` + Caveat accent word + updated sizing.

**Files to create/modify:**
- `frontend/src/pages/BibleBrowser.tsx` — inline hero heading
- `frontend/src/pages/GrowPage.tsx` — inline hero heading
- `frontend/src/pages/Insights.tsx` — inline hero heading

**Details:**

For each file, the pattern is the same:

1. Add import: `import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'`
2. Find the h1 element in the hero section
3. Replace className: remove `font-script`, `bg-gradient-to-r`, `from-white`, `to-primary-lt`, `bg-clip-text`, `text-transparent`, change `text-3xl ... sm:text-4xl` to `text-3xl sm:text-4xl lg:text-5xl`
4. Add `style={GRADIENT_TEXT_STYLE}` to h1
5. Wrap accent word in `<span className="font-script">...</span>`

**BibleBrowser.tsx:**
- Current heading: `"Bible"` (full Caveat)
- New heading: `"The <span className="font-script">Bible</span>"` — adding "The" prefix per spec suggestion for a complete phrase
- Subtitle: `"The Word of God"` — already exists, keep as-is
- Note: already imports `ATMOSPHERIC_HERO_BG` from PageHero; add `GRADIENT_TEXT_STYLE` from `@/constants/gradients`

Current h1 (approximately):
```tsx
<h1 className="font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl">
  Bible
</h1>
```

New h1:
```tsx
<h1 className="px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
  The <span className="font-script">Bible</span>
</h1>
```

**GrowPage.tsx:**
- Current heading: `"Grow in Faith"` (full Caveat)
- New heading: `Grow in <span className="font-script">Faith</span>`
- Subtitle: `"Structured journeys to deepen your walk with God"` — keep as-is

**Insights.tsx:**
- Current heading: `"Mood Insights"` (full Caveat)
- New heading: `Mood <span className="font-script">Insights</span>`
- Subtitle: `"Reflect on your journey"` — keep as-is
- Note: has "Dashboard" back link before heading — do not change

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): `lg:text-5xl` (3rem)
- Tablet (768px): `sm:text-4xl` (2.25rem)
- Mobile (375px): `text-3xl` (1.875rem)

**Guardrails (DO NOT):**
- DO NOT change subtitle text or styling
- DO NOT change hero container padding, background, or layout
- DO NOT change back links or other hero content
- DO NOT add `font-script` to the h1 element itself
- DO NOT change or remove any existing `mb-*` or `mt-*` margins on the h1

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BibleBrowser heading accessible | integration | `getByRole('heading', { name: /Bible/ })` finds the heading |
| GrowPage heading accessible | integration | `getByRole('heading', { name: /Faith/ })` finds the heading |

**Expected state after completion:**
- [ ] BibleBrowser: "The *Bible*" with 223-degree gradient
- [ ] GrowPage: "Grow in *Faith*" with 223-degree gradient
- [ ] Insights: "Mood *Insights*" with 223-degree gradient
- [ ] All 3 pages use `lg:text-5xl` sizing

---

### Step 6: Update inline heroes — Friends, Settings, MonthlyReport

**Objective:** Same gradient + sizing + accent treatment for the next batch of inline heroes.

**Files to create/modify:**
- `frontend/src/pages/Friends.tsx` — inline hero heading
- `frontend/src/pages/Settings.tsx` — inline hero heading
- `frontend/src/pages/MonthlyReport.tsx` — inline hero heading

**Details:**

Same pattern as Step 5. For each:
1. Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`
2. Replace h1 className and add inline style
3. Wrap accent word in `<span className="font-script">`

**Friends.tsx:**
- Current heading: `"Friends"` (full Caveat)
- New heading: `<span className="font-script">Friends</span>` — single-word heading, entire word in Caveat
- No subtitle currently
- Has "Dashboard" back link — do not change

**Settings.tsx:**
- Current heading: `"Settings"` (full Caveat)
- New heading: `<span className="font-script">Settings</span>` — single-word heading
- No subtitle currently
- Has "Dashboard" back link — do not change

**MonthlyReport.tsx:**
- Current heading: `"Monthly Report"` (full Caveat)
- New heading: `Monthly <span className="font-script">Report</span>`
- No subtitle (replaced with month/year selector UI) — do not change

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): `lg:text-5xl` (3rem)
- Tablet (768px): `sm:text-4xl` (2.25rem)
- Mobile (375px): `text-3xl` (1.875rem)

**Guardrails (DO NOT):**
- DO NOT change the MonthlyReport month/year selector UI
- DO NOT change "Dashboard" back links
- DO NOT add subtitles where they don't exist
- DO NOT change the hero container or ATMOSPHERIC_HERO_BG

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No new tests needed | — | Headings remain accessible with same text content |

**Expected state after completion:**
- [ ] Friends: "*Friends*" with 223-degree gradient
- [ ] Settings: "*Settings*" with 223-degree gradient
- [ ] MonthlyReport: "Monthly *Report*" with 223-degree gradient

---

### Step 7: Update inline heroes — RoutinesPage, GrowthProfile, ChallengeDetail

**Objective:** Same treatment for RoutinesPage, GrowthProfile (with content change), and ChallengeDetail (with dynamic accent).

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — inline hero heading
- `frontend/src/pages/GrowthProfile.tsx` — inline hero heading (content change: add "'s Garden")
- `frontend/src/pages/ChallengeDetail.tsx` — inline hero heading (dynamic accent: last word)

**Details:**

**RoutinesPage.tsx:**
- Current heading: `"Bedtime Routines"` (full Caveat)
- New heading: `Bedtime <span className="font-script">Routines</span>`
- Subtitle: `"Build your path to peaceful sleep"` — keep as-is
- Has `HeadingDivider` — keep as-is
- Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`

**GrowthProfile.tsx:**
- Current heading: `{profileData.displayName}` (full Caveat)
- New heading: `{profileData.displayName}'s <span className="font-script">Garden</span>` — per spec suggestion
- Subtitle: `{profileData.levelName}` conditional — keep as-is
- Has "Back" link — do not change
- Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`

**ChallengeDetail.tsx:**
- Current heading: `{challenge.title}` (full Caveat)
- New heading: render with dynamic last-word accent — extract last word of `challenge.title` and wrap in Caveat span
- Implementation: compute `lastWord` and `titlePrefix` from `challenge.title`:
  ```tsx
  const words = challenge.title.split(' ')
  const lastWord = words[words.length - 1]
  const titlePrefix = words.slice(0, -1).join(' ')
  ```
  Then render: `{titlePrefix} <span className="font-script">{lastWord}</span>`
- Subtitle: `{challenge.description}` — keep as-is
- Has challenge icon above heading — do not change
- Has custom ATMOSPHERIC_HERO_BG with theme color overlay — do not change
- Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): `lg:text-5xl` (3rem)
- Tablet (768px): `sm:text-4xl` (2.25rem)
- Mobile (375px): `text-3xl` (1.875rem)

**Guardrails (DO NOT):**
- DO NOT change the RoutinesPage HeadingDivider
- DO NOT change the ChallengeDetail's custom hero background overlay (theme color radial gradient)
- DO NOT change the ChallengeDetail progress bar, participant count, or join button
- DO NOT change the GrowthProfile back link or level subtitle

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GrowthProfile heading includes "Garden" | unit | Verify heading contains "'s Garden" text |
| ChallengeDetail heading has accent on last word | unit | For a challenge with title "Lenten Journey", verify span with "Journey" |

**Expected state after completion:**
- [ ] RoutinesPage: "Bedtime *Routines*" with 223-degree gradient
- [ ] GrowthProfile: "{name}'s *Garden*" with 223-degree gradient
- [ ] ChallengeDetail: dynamic title with last word in Caveat

---

### Step 8: Update inline heroes — BibleReader and ReadingPlanDetail

**Objective:** Apply gradient + accent treatment to the two remaining inline hero pages with dynamic content.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — inline hero heading (dynamic: book name + chapter)
- `frontend/src/pages/ReadingPlanDetail.tsx` — inline hero heading (dynamic: plan title)

**Details:**

**BibleReader.tsx:**
- Current heading: `{book.name} Chapter {chapterNumber}` where book.name is a `<Link>` element
- The book name link already wraps `book.name`. Add `font-script` class to the link element to make the book name the Caveat accent word.
- Replace h1 className: remove `font-script`, `bg-gradient-to-r`, `from-white`, `to-primary-lt`, `bg-clip-text`, `text-transparent`. Add `text-3xl sm:text-4xl lg:text-5xl`. Keep `px-1 sm:px-2 font-bold`.
- Add `style={GRADIENT_TEXT_STYLE}` to h1
- The gradient flows across both the Link (book name in Caveat) and "Chapter X" (in Inter) seamlessly because the gradient is on the parent h1
- Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`
- Note: the Link element inside the gradient h1 needs `style={{ color: 'inherit', WebkitTextFillColor: 'inherit' }}` or simply no color override, since the parent's `WebkitTextFillColor: 'transparent'` + `background-clip: text` handles the gradient. Check if the Link has explicit color classes that would override the gradient and remove them.

**ReadingPlanDetail.tsx:**
- Current heading: `{plan.title}` (full Caveat)
- New heading: render with dynamic last-word accent (same pattern as ChallengeDetail):
  ```tsx
  const words = plan.title.split(' ')
  const lastWord = words[words.length - 1]
  const titlePrefix = words.slice(0, -1).join(' ')
  ```
- Replace h1 className: same pattern as all other inline heroes
- Add `style={GRADIENT_TEXT_STYLE}` to h1
- Has cover emoji above heading and breadcrumb — do not change
- Import `GRADIENT_TEXT_STYLE` from `@/constants/gradients`

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): `lg:text-5xl` (3rem)
- Tablet (768px): `sm:text-4xl` (2.25rem)
- Mobile (375px): `text-3xl` (1.875rem)

**Guardrails (DO NOT):**
- DO NOT change the BibleReader book name Link behavior (it navigates to the book's chapter list)
- DO NOT change the ReadingPlanDetail breadcrumb, cover emoji, or progress UI
- DO NOT break the BibleReader heading when book.name is a long name (e.g., "1 Thessalonians")
- DO NOT remove existing accessibility attributes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BibleReader heading accessible | integration | Heading contains both book name and chapter number |
| ReadingPlanDetail heading has gradient style | unit | Verify h1 has inline style with backgroundImage |

**Expected state after completion:**
- [ ] BibleReader: "*{Book Name}* Chapter {X}" with 223-degree gradient, book name in Caveat
- [ ] ReadingPlanDetail: dynamic title with last word in Caveat

---

### Step 9: Update existing tests

**Objective:** Update tests that assert on hero heading classes (font-script, gradient classes) to match the new pattern.

**Files to create/modify:**
- `frontend/src/components/__tests__/PageHero.test.tsx` — update class assertions + add new tests from Step 1
- `frontend/src/components/prayer-wall/__tests__/PrayerWallHero.test.tsx` — update class assertions + add accent test
- `frontend/src/components/local-support/__tests__/LocalSupportHero.test.tsx` — update Caveat flourish test + add accent test

**Details:**

**PageHero.test.tsx:**
Current test checks `px-1` and `sm:px-2` — these remain. Add tests from Step 1 spec:
- `renders title with gradient inline style`: verify `heading.style.backgroundImage` matches `WHITE_PURPLE_GRADIENT`
- `renders scriptWord in font-script span`: render with `scriptWord="Prayers"`, query for span
- `renders title without accent when scriptWord omitted`: render without scriptWord, verify no font-script span
- `uses lg:text-5xl sizing`: verify `heading.className` contains `lg:text-5xl`
- `does not use font-script on h1`: verify `heading.className` does NOT contain `font-script`
- Update existing "Caveat flourish fix" test description since it's no longer specifically about Caveat flourish but about gradient text clipping

**PrayerWallHero.test.tsx:**
- Existing `getByRole('heading', { name: 'Prayer Wall' })` test: still works because the heading accessible name includes text from the span
- Update "uses font-script (Caveat)" test (if it checks h1 class for font-script) → check that h1 does NOT have font-script, but a child span does
- Add: accent word "Wall" renders in font-script span
- Update "padding for Caveat flourish fix" → still checks px-1/sm:px-2 on h1

**LocalSupportHero.test.tsx:**
- Update "heading uses font-script (Caveat)" test (line 84-93) — now the h1 should NOT have font-script class; instead check that when scriptWord is passed, a child span has it
- Add: renders scriptWord accent when provided
- Add: renders without accent when scriptWord omitted

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT remove existing test coverage — update assertions to match new DOM structure
- DO NOT change test file organization or naming
- DO NOT add tests for pages that don't have existing hero tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All new/updated tests listed above | unit | See Details section for full list |

**Expected state after completion:**
- [ ] All 3 hero test files updated with correct assertions
- [ ] New tests for gradient style, scriptWord rendering, sizing
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] No regressions in other test files

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add GRADIENT_TEXT_STYLE constant + update PageHero.tsx |
| 2 | 1 | Update PrayerWallHero + LocalSupportHero + LocalSupportPage |
| 3 | 2 | Add scriptWord to Local Support page configs |
| 4 | 1 | Add scriptWord to PageHero consumers (Music, Ask, MyPrayers, meditation) |
| 5 | 1 | Update inline heroes: BibleBrowser, GrowPage, Insights |
| 6 | 1 | Update inline heroes: Friends, Settings, MonthlyReport |
| 7 | 1 | Update inline heroes: RoutinesPage, GrowthProfile, ChallengeDetail |
| 8 | 1 | Update inline heroes: BibleReader, ReadingPlanDetail |
| 9 | 1-8 | Update tests |

Steps 3-8 all depend on Step 1 (for the constant/helper) but are independent of each other and could be executed in parallel. Step 9 depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Gradient utilities + PageHero.tsx | [COMPLETE] | 2026-03-31 | Renamed gradients.ts → gradients.tsx for JSX support. Added GRADIENT_TEXT_STYLE, renderWithScriptAccent. Updated PageHero with inline gradient style, lg:text-5xl sizing, scriptWord prop. |
| 2 | PrayerWallHero + LocalSupportHero | [COMPLETE] | 2026-03-31 | Updated PrayerWallHero with gradient style + "Wall" accent. Updated LocalSupportHero with scriptWord prop + gradient. Added scriptWord to LocalSupportPageConfig + pass-through. 1 pre-existing test failure in LocalSupportHero (font-script on h1 check) — deferred to Step 9. |
| 3 | Local Support page scriptWord configs | [COMPLETE] | 2026-03-31 | Added scriptWord to Churches (Church), Counselors (Counselor), CelebrateRecovery (Recovery). |
| 4 | PageHero consumer scriptWord props | [COMPLETE] | 2026-03-31 | Added scriptWord to 19 PageHero usages across 9 files: MusicPage, AskPage, MyPrayers, BreathingExercise(3), ScriptureSoaking(3), GratitudeReflection(2), ActsPrayerWalk(2), ExamenReflection(2), PsalmReading(4). |
| 5 | Inline heroes: BibleBrowser, GrowPage, Insights | [COMPLETE] | 2026-03-31 | Updated 3 inline heroes. BibleBrowser heading changed to "The Bible". Also fixed BibleBrowser test (heading name), Insights test (disambiguation), LocalSupportHero test (font-script on span). |
| 6 | Inline heroes: Friends, Settings, MonthlyReport | [COMPLETE] | 2026-03-31 | Updated all 3 files. Friends/Settings: single-word accent. MonthlyReport: "Report" accent. |
| 7 | Inline heroes: RoutinesPage, GrowthProfile, ChallengeDetail | [COMPLETE] | 2026-03-31 | RoutinesPage: "Routines" accent. GrowthProfile: changed to "{name}'s Garden" with "Garden" accent. ChallengeDetail: dynamic last-word accent. |
| 8 | Inline heroes: BibleReader, ReadingPlanDetail | [COMPLETE] | 2026-03-31 | BibleReader: book name Link gets font-script + inherit styles for gradient pass-through. ReadingPlanDetail: dynamic last-word accent. |
| 9 | Update tests | [COMPLETE] | 2026-03-31 | PageHero: 6 tests (was 1). PrayerWallHero: 6 tests (was 4, added gradient + accent). LocalSupportHero: 7 tests (fixed in Step 5). 4952 pass / 5 pre-existing failures. No regressions. |
