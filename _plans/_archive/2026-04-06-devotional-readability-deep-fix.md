# Implementation Plan: Devotional Readability — Deep Fix

**Spec:** `_specs/devotional-readability-deep-fix.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/devotional-readability-deep-fix`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a single-file CSS/class refactor of `frontend/src/components/daily/DevotionalTabContent.tsx` (346 lines). No new components, no new state, no new hooks, no routing changes, no data model changes. The companion test file is `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` (481 lines).

**Component structure (DevotionalTabContent.tsx):**

- **Line 143:** `<GlowBackground variant="center" glowOpacity={0.30}>` — wraps entire tab
- **Line 144:** Main container: `mx-auto max-w-4xl px-4 py-10 sm:py-14`
- **Lines 147-185:** Date navigation (unchanged)
- **Lines 187-195:** Title + theme badge (unchanged)
- **Lines 197-241:** Passage section — scripture callout with `border-l-4`, italic passage text, meditate link, SharePanel
- **Lines 243-254:** Quote section — `border-t` divider, FrostedCard, italic blockquote, attribution
- **Lines 256-263:** Reflection section — `border-t border-b` dividers, bare `<div>` with paragraphs (no card)
- **Lines 265-288:** Reflection question — `border-t` divider, FrostedCard, label, question, Journal CTA
- **Lines 290-306:** Pray CTA — `border-t` divider, centered text + button
- **Lines 308-316:** RelatedPlanCallout (unchanged)
- **Lines 318-338:** Share & Read Aloud buttons (unchanged)

**Test patterns (DevotionalTabContent.test.tsx):**

- Provider wrapping: `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → component
- Mocked hooks: `useAuth`, `useFaithPoints`, `useReducedMotion`, `useReadAloud`
- Existing test at line 67 asserts `max-w-4xl` — must be updated to `max-w-2xl`
- Existing test at line 293 asserts `≥ 4` border-white/[0.08] dividers — must be updated (removing dividers)
- Existing test at line 336 asserts reflection has `border-t` and `border-b` — must be updated (reflection gets FrostedCard)
- Existing test at line 354 asserts reflection has no background — must be updated (reflection gets FrostedCard)
- Existing test at line 112 asserts `Something to think about today:` — must be updated to `Something to think about`
- Existing test at line 462 same text assertion — must be updated

**Existing components used (no modifications):**

- `GlowBackground` (`components/homepage/GlowBackground.tsx`) — already has `glowOpacity` prop
- `FrostedCard` (`components/homepage/FrostedCard.tsx`) — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` with dual box-shadow

---

## Auth Gating Checklist

No auth gating changes. This spec modifies only visual/typographic CSS classes.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | N/A | N/A | N/A |

---

## Design System Values (for UI steps)

All values from design-system.md recon (captured 2026-04-05) and codebase inspection of DevotionalTabContent.tsx.

| Component | Property | Current Value | Target Value | Source |
|-----------|----------|---------------|--------------|--------|
| GlowBackground | glowOpacity | `0.30` | `0.18` | spec requirement |
| Main container | max-width | `max-w-4xl` (896px) | `max-w-2xl` (672px) | spec requirement |
| Passage text | font-style | `italic` | remove `italic` | spec requirement |
| Passage text | font-size | `text-base sm:text-lg` | `text-lg sm:text-xl` | spec requirement |
| Passage text | line-height | `leading-relaxed` (~1.625) | `leading-[1.75]` | spec requirement |
| Passage text | color | `text-white` | `text-white` (unchanged) | design-system.md |
| Passage container | background | `bg-white/[0.03]` | `bg-white/[0.04]` | spec requirement |
| Passage container | padding | `px-5 py-5 sm:px-6 sm:py-6` | `px-5 py-6 sm:px-7 sm:py-7` | spec requirement |
| Verse superscripts | color | `text-white/40` | `text-white/50` | spec requirement |
| Verse superscripts | weight | (none) | `font-medium` | spec requirement |
| Passage reference | color | `text-primary-lt` (VerseLink className) | `text-white/80` | spec requirement |
| Quote mark | color | `text-white/20` | `text-white/25` | spec requirement |
| Quote blockquote | line-height | `leading-relaxed` | `leading-[1.6]` | spec requirement |
| Quote attribution | color | `text-white/70` | `text-white/80` | spec requirement |
| Quote section | border-t | `border-t border-white/[0.08]` | remove | spec requirement |
| Reflection section | container | bare `<div>` with `border-t border-b` | FrostedCard wrapper | spec requirement |
| Reflection text | font-size | `text-base` | `text-[17px] sm:text-lg` | spec requirement |
| Reflection text | line-height | `leading-relaxed` | `leading-[1.8]` | spec requirement |
| Reflection text | spacing | `space-y-4` | `space-y-5` | spec requirement |
| Reflection question label | style | `text-sm text-white/60` | `text-xs font-medium uppercase tracking-widest text-white/70` | spec requirement |
| Reflection question label | text | `Something to think about today:` | `Something to think about` | spec requirement |
| Reflection question text | font-size | `text-lg` | `text-xl sm:text-2xl` | spec requirement |
| Reflection question text | line-height | (default) | `leading-[1.5]` | spec requirement |
| Question section | border-t | `border-t border-white/[0.08]` | remove | spec requirement |
| Pray CTA section | border-t | `border-t border-white/[0.08]` | remove | spec requirement |
| All sections | vertical spacing | mixed `py-5/py-6/py-8` | consistent `py-6 sm:py-8` | spec requirement |
| FrostedCard | base classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` | unchanged | FrostedCard.tsx:22 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- FrostedCard base classes: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` with `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`
- Passage callout uses `border-l-4 border-l-primary/60` (keep intact — only padding/bg/typography change)
- Devotional tab uses `GlowBackground variant="center"` — the `glowOpacity` prop directly controls the single orb's opacity in the radial gradient
- Lora = `font-serif`, Inter = `font-sans` (default). Spec keeps `font-serif` on passage, removes italic
- `leading-relaxed` in Tailwind = `line-height: 1.625` — spec targets 1.75-1.8 for reading comfort
- Quote section retains italic (literary convention for short quotation)
- FrostedCard `className` prop merges with base classes via `cn()` — pass padding overrides there
- VerseLink component accepts `className` prop for color override — pass `text-white/80` instead of default `text-primary-lt`
- `text-white` is full opacity (rgb 255,255,255) — exceeds WCAG AAA on hero-bg (#08051A)
- All border-t/border-b dividers being removed use `border-white/[0.08]`

---

## Shared Data Models (from Master Plan)

N/A — standalone spec.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_devotional_reads` | Read | Checked for completion badge (unchanged) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column, `max-w-2xl` fills available width (container was already narrower than 672px at mobile). `px-4` side padding. No `sm:` bumps applied. |
| Tablet | 768px | `max-w-2xl` constrains width to 672px. `sm:` font bumps active. Generous side whitespace. |
| Desktop | 1440px | `max-w-2xl` centers content at 672px. Large side whitespace. All `sm:` bumps fully active. |

No custom breakpoints. The narrower container improves mobile (no overflow risk — content was already narrower than max-w-4xl).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Date nav → title | `pt-8 sm:pt-10` (unchanged) | DevotionalTabContent.tsx:188 |
| Title → passage section | section uses `py-6 sm:py-8` | spec target |
| Passage → quote | section uses `py-6 sm:py-8` | spec target |
| Quote → reflection | section uses `py-6 sm:py-8` | spec target |
| Reflection → question | section uses `py-6 sm:py-8` | spec target |
| Question → pray CTA | section uses `py-6 sm:py-8` | spec target |

All inter-section spacing becomes consistent `py-6 sm:py-8`.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec requires CSS/class changes only — no new components, hooks, routes, or state
- [x] No auth-gating changes (spec confirms N/A)
- [x] Design system values verified from recon (captured 2026-04-05, fresh)
- [x] All [UNVERIFIED] values flagged (none — all values from spec or recon)
- [x] VerseLink component accepts `className` prop (confirmed in DevotionalTabContent.tsx:203)
- [x] FrostedCard accepts `className` prop for padding override (confirmed in FrostedCard.tsx:7)
- [x] Existing tests that assert old classes identified and enumerated

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Passage italic removal | Remove `italic` class only, keep `font-serif` (Lora) | Spec: Lora without italic is still distinct from body text (Inter) but faster to read |
| Quote italic retention | Keep `italic` on blockquote | Spec: brief literary quotation — appropriate use of italic |
| Reflection FrostedCard padding | Use `p-5 sm:p-8` | Spec says "generous padding" — matches the larger reading content with comfortable margins |
| Glow opacity 0.18 | Round to `0.18` exactly | Spec says "approximately 0.18" — use 0.18 |
| Section spacing uniformity | All sections use `py-6 sm:py-8` | Spec: "All major sections should use consistent vertical padding" |
| VerseLink color override | Pass `className="text-white/80"` | Spec: passage reference label needs brighter contrast than purple-on-dark |
| Reflection question label "today:" removal | Change to "Something to think about" (drop "today:") | Spec explicitly states this simplification |

---

## Implementation Steps

### Step 1: Update GlowBackground opacity and container width

**Objective:** Narrow the devotional container from `max-w-4xl` to `max-w-2xl` and dim the glow orb from 0.30 to 0.18.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — lines 143-144

**Details:**

Line 143 — change `glowOpacity={0.30}` to `glowOpacity={0.18}`:
```tsx
// Before:
<GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
// After:
<GlowBackground variant="center" glowOpacity={0.18} className="!bg-transparent">
```

Line 144 — change `max-w-4xl` to `max-w-2xl`:
```tsx
// Before:
<div className="mx-auto max-w-4xl px-4 py-10 sm:py-14" {...swipeHandlers}>
// After:
<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14" {...swipeHandlers}>
```

**Guardrails (DO NOT):**
- DO NOT change the `variant="center"` prop
- DO NOT change the `!bg-transparent` className
- DO NOT change padding values (`px-4 py-10 sm:py-14`)
- DO NOT modify any other GlowBackground usage (Pray, Journal, Meditate tabs)

**Responsive behavior:**
- Desktop (1440px): Content narrows from 896px to 672px, more side whitespace
- Tablet (768px): Content constrained to 672px (was 768px fill)
- Mobile (375px): No visible change (content already narrower than both limits)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `uses max-w-2xl container width` | integration | Update existing test (line 67-71): assert `max-w-2xl` present, `max-w-4xl` absent |
| `glow orb uses reduced opacity` | integration | New test: query `[data-testid="glow-orb"]`, assert style contains `0.18` not `0.30` |

**Expected state after completion:**
- [ ] Container width is `max-w-2xl`
- [ ] Glow orb opacity is 0.18
- [ ] All other tab GlowBackgrounds still use their own opacity (unaffected)

---

### Step 2: Fix passage section typography and container

**Objective:** Remove italic from passage text, increase font size and line height, brighten verse superscripts, override reference color, strengthen passage container background and padding.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — lines 198-226

**Details:**

Line 198 — standardize section padding (remove border, use consistent spacing):
```tsx
// Before:
<div className="py-5 sm:py-6">
// After:
<div className="py-6 sm:py-8">
```

Line 200-204 — brighten reference label. The VerseLink component accepts a `className` prop:
```tsx
// Before:
<VerseLink
  reference={devotional.passage.reference}
  className="text-primary-lt"
/>
// After:
<VerseLink
  reference={devotional.passage.reference}
  className="text-white/80"
/>
```

Line 215 — strengthen passage container background and padding:
```tsx
// Before:
<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.03] px-5 py-5 sm:px-6 sm:py-6">
// After:
<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">
```

Line 216 — remove italic, increase font size, set explicit line height:
```tsx
// Before:
<p className="font-serif text-base italic leading-relaxed text-white sm:text-lg">
// After:
<p className="font-serif text-lg leading-[1.75] text-white sm:text-xl">
```

Line 219 — brighten verse superscripts and add font-medium:
```tsx
// Before:
<sup className="mr-1 align-super font-sans text-xs text-white/40">
// After:
<sup className="mr-1 align-super font-sans text-xs font-medium text-white/50">
```

**Guardrails (DO NOT):**
- DO NOT remove `font-serif` from passage text (spec keeps Lora)
- DO NOT change `border-l-4 border-l-primary/60` accent (spec keeps it)
- DO NOT modify the Meditate link, SharePanel, or share button below passage
- DO NOT touch VerseLink component internals — only override via `className` prop

**Responsive behavior:**
- Desktop (1440px): Passage at `text-xl` (~20px) with 1.75 line-height inside 672px container = ~60-70 chars/line
- Tablet (768px): Same as desktop (672px max)
- Mobile (375px): Passage at `text-lg` (~18px) fills width with `px-5` padding

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `passage text is not italic` | integration | Query passage `<p>` inside `.border-l-4`, assert className does NOT contain `italic` |
| `passage text uses larger font and explicit line height` | integration | Assert passage `<p>` contains `text-lg`, `leading-[1.75]`, `sm:text-xl` |
| `passage container uses bg-white/[0.04]` | integration | Update existing test (line 300-306): assert `bg-white/[0.04]` instead of `bg-white/[0.03]` |
| `verse superscripts are text-white/50 font-medium` | integration | Update existing test (line 318-325): assert `text-white/50` and `font-medium` |
| `passage reference uses text-white/80` | integration | Update existing test (line 247-255): find VerseLink by href, assert `text-white/80` not `text-primary-lt` |

**Expected state after completion:**
- [ ] Passage text is Lora, NOT italic, `text-lg sm:text-xl`, `leading-[1.75]`, `text-white`
- [ ] Passage container has `bg-white/[0.04]` and increased padding
- [ ] Verse superscripts are `text-white/50 font-medium`
- [ ] Reference label is `text-white/80`

---

### Step 3: Fix quote section typography and remove outer divider

**Objective:** Remove `border-t` divider above quote section, brighten quote mark and attribution, set explicit line-height on blockquote.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — lines 243-254

**Details:**

Line 244 — remove `border-t`, use consistent section spacing:
```tsx
// Before:
<div className="border-t border-white/[0.08] py-5 sm:py-6">
// After:
<div className="py-6 sm:py-8">
```

Line 246 — brighten quote mark:
```tsx
// Before:
<span className="font-serif text-5xl leading-none text-white/20" aria-hidden="true">
// After:
<span className="font-serif text-5xl leading-none text-white/25" aria-hidden="true">
```

Line 249 — set explicit leading on blockquote (keep italic):
```tsx
// Before:
<blockquote className="mt-2 font-serif text-xl italic leading-relaxed text-white sm:text-2xl">
// After:
<blockquote className="mt-2 font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
```

Line 252 — brighten attribution:
```tsx
// Before:
<p className="mt-3 text-sm text-white/70">&mdash; {devotional.quote.attribution}</p>
// After:
<p className="mt-3 text-sm text-white/80">&mdash; {devotional.quote.attribution}</p>
```

**Guardrails (DO NOT):**
- DO NOT remove `italic` from blockquote (spec: retain for short quotation)
- DO NOT change FrostedCard usage or padding
- DO NOT change font sizes on quote text

**Responsive behavior:**
- N/A: All changes are color/line-height/border only — no layout impact

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `quote section has no border-t divider` | integration | Find blockquote, traverse to parent FrostedCard, then parent section div — assert NO `border-t` class |
| `quote blockquote retains italic` | integration | Assert blockquote className contains `italic` |
| `quote attribution is text-white/80` | integration | Find attribution by `—` mdash content, assert `text-white/80` |

**Expected state after completion:**
- [ ] No `border-t` above quote section
- [ ] Quote mark is `text-white/25`
- [ ] Blockquote has `leading-[1.6]` and retains `italic`
- [ ] Attribution is `text-white/80`

---

### Step 4: Promote reflection body to FrostedCard

**Objective:** Wrap the reflection body paragraphs in a FrostedCard (instead of bare `<div>` with border dividers), increase font size, line height, and paragraph spacing.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — lines 256-263

**Details:**

Replace the entire reflection section (lines 256-263):
```tsx
// Before:
<div className="border-t border-b border-white/[0.08] py-6 sm:py-8">
  <div className="space-y-4 text-base leading-relaxed text-white">
    {devotional.reflection.map((paragraph, i) => (
      <p key={i}>{paragraph}</p>
    ))}
  </div>
</div>

// After:
<div className="py-6 sm:py-8">
  <FrostedCard className="p-5 sm:p-8">
    <div className="space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg">
      {devotional.reflection.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  </FrostedCard>
</div>
```

Key changes:
- Outer div: removes `border-t border-b border-white/[0.08]` (FrostedCard provides visual separation)
- Adds `<FrostedCard className="p-5 sm:p-8">` wrapper with generous padding
- Inner div: `space-y-4` → `space-y-5`, `text-base` → `text-[17px] sm:text-lg`, `leading-relaxed` → `leading-[1.8]`

**Guardrails (DO NOT):**
- DO NOT add `font-serif` (reflection uses Inter, not Lora)
- DO NOT add `italic` to reflection text
- DO NOT change text color (already `text-white`)
- DO NOT change the reflection data mapping (`devotional.reflection.map`)

**Responsive behavior:**
- Desktop (1440px): FrostedCard inside 672px container with `p-8` = text area ~608px wide at 18px = ~55-65 chars/line
- Tablet (768px): Same as desktop
- Mobile (375px): FrostedCard full-width with `p-5` = comfortable reading width

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `reflection body is wrapped in FrostedCard` | integration | Find reflection paragraphs, traverse up to FrostedCard (has `backdrop-blur` and `bg-white/[0.06]`), assert it exists |
| `reflection text uses increased size and line height` | integration | Find the text container inside FrostedCard, assert `text-[17px]`, `leading-[1.8]`, `space-y-5` |
| `reflection section has no border dividers` | integration | Find FrostedCard containing reflection, check parent div has no `border-t` or `border-b` |

**Expected state after completion:**
- [ ] Reflection body wrapped in FrostedCard with generous padding
- [ ] Text is `text-[17px] sm:text-lg leading-[1.8] text-white` with `space-y-5`
- [ ] No `border-t` or `border-b` dividers around reflection

---

### Step 5: Fix reflection question section and remove outer divider

**Objective:** Remove `border-t` divider above question section, upgrade label to uppercase tracked treatment, simplify label text, increase question font size and add explicit line-height.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — lines 265-288

**Details:**

Line 266 — remove `border-t`:
```tsx
// Before:
<div className="border-t border-white/[0.08] py-5 sm:py-6" ref={questionRef}>
// After:
<div className="py-6 sm:py-8" ref={questionRef}>
```

Line 268 — upgrade label styling and simplify text:
```tsx
// Before:
<p className="text-sm text-white/60">Something to think about today:</p>
// After:
<p className="text-xs font-medium uppercase tracking-widest text-white/70">Something to think about</p>
```

Line 269 — increase question font size and add line-height:
```tsx
// Before:
<p className="mt-2 text-lg font-medium text-white">
// After:
<p className="mt-2 text-xl font-medium leading-[1.5] text-white sm:text-2xl">
```

Line 270 — update the `.replace()` to match new label text. The `reflectionQuestion` field from data may be prefixed with "Something to think about today: " — the `.replace()` strips this prefix. Since we changed the visible label, the strip logic stays the same (it operates on data, not on the displayed label):
```tsx
// No change to line 270 — the .replace() strips the data prefix regardless of what the label says
{devotional.reflectionQuestion.replace('Something to think about today: ', '')}
```

Also update the strip in the Journal CTA click handler (line 276):
```tsx
// No change needed — same .replace() on data, not on label
```

**Guardrails (DO NOT):**
- DO NOT change the FrostedCard wrapper or its `border-l-2 border-l-primary` accent
- DO NOT change the Journal CTA button styling or behavior
- DO NOT change the `ref={questionRef}` (used by IntersectionObserver for completion tracking)
- DO NOT change the `.replace('Something to think about today: ', '')` logic — it strips a data prefix, not the displayed label

**Responsive behavior:**
- Desktop (1440px): Question at `text-2xl` (~24px) with 1.5 line-height — short text, plenty of room
- Tablet (768px): Same
- Mobile (375px): Question at `text-xl` (~20px) — wraps naturally at mobile width

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `reflection question label uses uppercase tracked treatment` | integration | Find label by text "Something to think about", assert `uppercase`, `tracking-widest`, `text-white/70`, `font-medium` |
| `reflection question label simplified text` | integration | Assert `Something to think about` present, `Something to think about today:` absent |
| `question section has no border-t divider` | integration | Find question ref div, assert no `border-t` |
| `question text uses larger font` | integration | Find question text, assert `text-xl`, `sm:text-2xl`, `leading-[1.5]` |

**Expected state after completion:**
- [ ] Question label: `text-xs font-medium uppercase tracking-widest text-white/70`
- [ ] Question label text: "Something to think about" (no "today:")
- [ ] Question text: `text-xl sm:text-2xl leading-[1.5] font-medium text-white`
- [ ] No `border-t` divider above question section

---

### Step 6: Remove Pray CTA section border divider

**Objective:** Remove the `border-t` divider above the Pray CTA section and standardize section spacing.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — line 291

**Details:**

Line 291 — remove `border-t`:
```tsx
// Before:
<div className="border-t border-white/[0.08] py-6 sm:py-8">
// After:
<div className="py-6 sm:py-8">
```

**Guardrails (DO NOT):**
- DO NOT change the Pray CTA button styling, text, or behavior
- DO NOT change the `onSwitchToPray` callback
- DO NOT change the intro text or its `text-white/60` styling

**Responsive behavior:**
- N/A: no UI impact — border removal only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pray CTA section has no border-t divider` | integration | Update existing test (line 404-409): find CTA intro text, traverse to `.py-6` parent, assert no `border-t` |

**Expected state after completion:**
- [ ] No `border-t` above Pray CTA section
- [ ] All 4 `border-t` / `border-b` dividers between sections removed (quote, reflection top/bottom, question, pray CTA)

---

### Step 7: Update tests

**Objective:** Update all existing tests that assert old class values, add new tests for the readability changes.

**Files to modify:**
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`

**Details:**

Tests to **update** (existing assertions that will break):

1. **Line 67-72 — `uses max-w-4xl container width`** → Rename to `uses max-w-2xl container width`. Assert `max-w-2xl` present, `max-w-4xl` absent (flip the assertions).

2. **Line 112 — `renders reflection question`** → Update text matcher from `Something to think about today:` to `Something to think about`.

3. **Line 247-255 — `devotional link has correct styling`** → Update to find VerseLink with `text-white/80` instead of `text-primary-lt`.

4. **Line 293-297 — `section dividers use border-white/[0.08]`** → This test asserts `≥ 4` dividers. After removing 4 dividers (quote border-t, reflection border-t + border-b, question border-t, pray CTA border-t), fewer remain. The passage section still has none. Update to check that FrostedCards provide separation instead. Replace with a test that asserts zero `border-t border-white/[0.08]` between content sections (any remaining `border-white/[0.08]` would be on FrostedCard borders or other elements).

5. **Line 300-306 — `Tier 2: passage wrapped in scripture callout`** → Update `bg-white/[0.03]` to `bg-white/[0.04]`.

6. **Line 318-325 — `Tier 2: verse superscripts use text-white/40`** → Update to `text-white/50`, also assert `font-medium`.

7. **Line 336-343 — `Tier 3: reflection section has top and bottom dividers`** → Replace with test: `reflection section is wrapped in FrostedCard`. Assert backdrop-blur and bg-white/[0.06] exist on ancestor.

8. **Line 345-352 — `Tier 3: reflection section has increased padding`** → Update: find reflection content inside FrostedCard, verify padding override classes.

9. **Line 354-362 — `Tier 3: reflection section has no background`** → **Delete this test** — it directly contradicts the new FrostedCard wrapper.

10. **Line 404-409 — `CTA section has top border separator`** → Update to assert NO `border-t` on section wrapper.

11. **Line 462 — content order test** → Update `Something to think about today:` to `Something to think about`.

Tests to **add**:

12. `glow orb uses reduced opacity (0.18)` — query `[data-testid="glow-orb"]`, check style attribute contains `0.18`.

13. `passage text is not italic` — query passage `<p>` inside `.border-l-4`, assert `italic` absent.

14. `passage text uses reading-optimized line height` — assert `leading-[1.75]`.

15. `quote blockquote has explicit line height` — assert `leading-[1.6]`.

16. `quote section has no border-t divider` — blockquote parent chain has no `border-t`.

17. `reflection body is wrapped in FrostedCard` — reflection paragraphs are inside a `backdrop-blur` element with `bg-white/[0.06]`.

18. `reflection text uses increased size and spacing` — assert `text-[17px]`, `leading-[1.8]`, `space-y-5`.

19. `no section border dividers between content sections` — assert zero `border-t` elements between passage and Share/Read Aloud buttons.

**Guardrails (DO NOT):**
- DO NOT change the provider wrapping pattern
- DO NOT change mock setup for hooks
- DO NOT remove tests for: date navigation, cross-tab CTAs, completion tracking, verse linking, swipe, share, read aloud
- DO NOT change the `renderComponent` helper function

**Responsive behavior:**
- N/A: no UI impact — test-only step

**Test specifications:**
Self-validating — run `pnpm test frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` after changes.

**Expected state after completion:**
- [ ] All existing tests updated to match new class names and text
- [ ] 7-8 new tests added for readability changes
- [ ] All tests pass: `pnpm test` shows 0 failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Container width + glow opacity |
| 2 | — | Passage typography + container |
| 3 | — | Quote typography + divider removal |
| 4 | — | Reflection FrostedCard promotion |
| 5 | — | Question label + font size + divider removal |
| 6 | — | Pray CTA divider removal |
| 7 | 1, 2, 3, 4, 5, 6 | Update all tests |

Steps 1-6 are independent of each other (all modify different sections of the same file, no overlapping lines). Step 7 depends on all previous steps being complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Container width + glow opacity | [COMPLETE] | 2026-04-06 | `DevotionalTabContent.tsx`: glowOpacity 0.30→0.18, max-w-4xl→max-w-2xl |
| 2 | Passage typography + container | [COMPLETE] | 2026-04-06 | `DevotionalTabContent.tsx`: removed italic, text-lg/xl, leading-[1.75], bg-white/[0.04], text-white/80 reference, text-white/50 font-medium sups |
| 3 | Quote typography + divider removal | [COMPLETE] | 2026-04-06 | `DevotionalTabContent.tsx`: removed border-t, text-white/25 quote mark, leading-[1.6], text-white/80 attribution |
| 4 | Reflection FrostedCard promotion | [COMPLETE] | 2026-04-06 | `DevotionalTabContent.tsx`: wrapped in FrostedCard p-5 sm:p-8, text-[17px] sm:text-lg, leading-[1.8], space-y-5 |
| 5 | Question label + font size + divider removal | [COMPLETE] | 2026-04-06 | `DevotionalTabContent.tsx`: removed border-t, uppercase tracked label, simplified text, text-xl sm:text-2xl leading-[1.5] |
| 6 | Pray CTA divider removal | [COMPLETE] | 2026-04-06 | `DevotionalTabContent.tsx`: removed border-t |
| 7 | Update all tests | [COMPLETE] | 2026-04-06 | `DevotionalTabContent.test.tsx`: 11 tests updated, 1 deleted, 9 new tests added. All pass. 5 pre-existing failures in unrelated files. |
