# Implementation Plan: Devotional Layered Container Treatment

**Spec:** `_specs/devotional-layered-containers.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/devotional-layered-containers`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Component: `frontend/src/components/daily/DevotionalTabContent.tsx` — **only file modified**
- Tests: `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`
- Design system component: `frontend/src/components/homepage/FrostedCard.tsx` — referenced (Tier 1), not modified

### Current DevotionalTabContent Layout (lines 150-352)

The component renders inside `GlowBackground` (variant="center", glowOpacity=0.30) with a `max-w-4xl` container. Content sections flow vertically, each separated by `border-t border-white/[0.08]`:

1. **Date navigation** (lines 155-193) — chevron arrows + date string
2. **Title + theme badge** (lines 196-203) — centered heading
3. **Quote section** (lines 206-216) — `FrostedCard` wrapping blockquote (already Tier 1 — unchanged)
4. **Passage section** (lines 219-252) — verse reference + share button + passage text + SharePanel
5. **Reflection section** (lines 255-261) — reflection paragraphs
6. **Prayer section** (lines 264-271) — "Closing Prayer" label + prayer text
7. **Reflection question** (lines 274-296) — `FrostedCard` with left accent (already Tier 1 — unchanged)
8. **RelatedPlanCallout** (lines 299-306) — its own component (unchanged)
9. **Action buttons** (lines 309-328) — Share + Read Aloud
10. **Cross-tab CTAs** (lines 331-344) — "Pray about today's reading"

### Current CSS Classes Per Section

| Section | Outer div classes | Text classes |
|---------|------------------|-------------|
| Passage (line 219) | `border-t border-white/[0.08] py-5 sm:py-6` | `text-white/80` (passage), `text-white/30` (superscripts) |
| Reflection (line 255) | `border-t border-white/[0.08] py-5 sm:py-6` | `text-white` (already brightest) |
| Prayer (line 264) | `border-t border-white/[0.08] py-5 sm:py-6` | `text-white/60` (label + body) |
| Quote (line 206) | `border-t border-white/[0.08] py-5 sm:py-6` | — (FrostedCard wraps content) |
| Question (line 274) | `border-t border-white/[0.08] py-5 sm:py-6` | — (FrostedCard wraps content) |

### Existing Test Coverage (327 lines, 22 tests)

Provider wrapping pattern: `MemoryRouter` > `ToastProvider` > `AuthModalProvider`. Mocks: `useAuth`, `useFaithPoints`, `useReducedMotion`, `useReadAloud`.

**Tests that will need updates:**

| Test | Current assertion | Required change |
|------|------------------|-----------------|
| "section dividers use border-white/[0.08]" (line 314) | `expect(dividers.length).toBeGreaterThanOrEqual(5)` | Change to `>= 4` — passage and prayer lose their outer `border-white/[0.08]` (−2), but Tier 4 card adds one (+1), net −1 |
| "Closing Prayer label matches prayer body opacity (text-white/60)" (line 127) | Both label and body assert `text-white/60` | Prayer body changes to `text-white/70` — test needs to reflect this |

### FrostedCard Component (reference only)

`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` with dual box-shadow. Quote and reflection question cards already use this — no changes needed.

---

## Auth Gating Checklist

N/A — This spec changes only visual styling. No interactive elements are added or modified.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Tier 2: Scripture Callout | classes | `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.03] px-5 py-5 sm:px-6 sm:py-6` | Spec (no existing pattern to reference) |
| Tier 3: Inset Section | classes | `border-t border-b border-white/[0.08] py-6 sm:py-8` | Spec |
| Tier 4: Dimmed Card | classes | `rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5` | Spec |
| Passage text (brightened) | class | `text-white` (from `text-white/80`) | Spec |
| Verse superscripts (brightened) | class | `text-white/40` (from `text-white/30`) | Spec |
| Prayer body text (brightened) | class | `text-white/70` (from `text-white/60`) | Spec |
| Section divider | class | `border-white/[0.08]` | design-system.md |
| Primary/60 (border accent) | color | `rgba(109, 40, 217, 0.6)` via `border-l-primary/60` | Tailwind config (`primary: #6D28D9`) |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before UI steps:**

- FrostedCard base: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` — Tier 4 is intentionally lighter: `bg-white/[0.03]` and `border-white/[0.08]`
- GlowBackground on Devotional tab uses `glowOpacity={0.30}` (overrides default 0.15)
- Section dividers site-wide: `border-white/[0.08]` — Tier 4 uses same opacity for its border
- `text-white` is the default for readable text on dark backgrounds (WCAG AA exceeds minimum)
- `primary` = `#6D28D9`, `primary-lt` = `#8B5CF6` — the Tier 2 accent uses `border-l-primary/60`
- No new components, no new JS, no new imports — purely Tailwind class changes on existing elements

---

## Shared Data Models (from Master Plan)

N/A — standalone visual polish spec.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | All 4 tiers render full width. Scripture callout: `px-5 py-5`. Reflection inset: `py-6`. No overflow. |
| Tablet | 640px+ | Scripture callout: `sm:px-6 sm:py-6`. Reflection inset: `sm:py-8`. Same layout, more padding. |
| Desktop | 1024px+ | Same as tablet. Content constrained by `max-w-4xl` container. |

No elements stack, hide, or reflow between breakpoints. Only padding scales at `sm:`.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Quote card → Scripture callout | `py-5 sm:py-6` on quote outer + callout internal padding | Codebase: DevotionalTabContent.tsx:219 |
| Scripture callout → Reflection inset | Callout padding + `py-6 sm:py-8` on reflection | Spec: reflection padding increases |
| Reflection inset → Closing prayer card | Reflection padding + `p-5` on Tier 4 card | Spec: Tier 4 internal padding |
| Closing prayer card → Reflection question | Tier 4 padding + `py-5 sm:py-6` on question outer | Codebase: DevotionalTabContent.tsx:274 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] DevotionalTabContent.tsx is the only file that needs visual changes
- [x] Quote card and reflection question card are already Tier 1 FrostedCards (unchanged)
- [x] RelatedPlanCallout is its own component (unchanged)
- [x] No auth-gated actions in this spec (visual only)
- [x] Design system values are verified from spec + codebase inspection
- [x] SharePanel is a modal/panel and remains outside the scripture callout wrapper
- [ ] If Spec P (authentic prayer generation) has already executed, the Tier 4 closing prayer change is moot — check if the prayer section still exists in the current file

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scripture callout wrapper placement | Wrap ONLY the passage text, NOT the verse reference header or SharePanel | SharePanel is a modal that shouldn't be constrained inside the callout. Verse reference + share button sit above the callout as a header row. |
| Passage outer div handling | Remove `border-t border-white/[0.08]` entirely from the outer div, keep `py-5 sm:py-6` for vertical spacing | The callout's left accent border provides visual separation; double borders would be redundant |
| Prayer outer div handling | Remove `border-t border-white/[0.08]` from outer div, keep `py-5 sm:py-6` for spacing | Tier 4 card border provides separation |
| Tier 4 backdrop-blur-sm | Include per spec even though bg-white/[0.03] is very subtle | Provides micro-frosted effect that differentiates from Tier 3 (no background at all) |
| Test divider count | Update from >= 5 to >= 4 | Passage loses border-t (−1), prayer loses border-t (−1), Tier 4 card adds border with same class (+1), net = −1 |

---

## Implementation Steps

### Step 1: Apply Tier 2, 3, 4 Container Treatments

**Objective:** Wrap passage in scripture callout, convert reflection to inset treatment, wrap prayer in dimmed card, brighten text — all in DevotionalTabContent.tsx.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — 6 targeted class changes + 2 wrapper additions

**Details:**

**1a. Passage section (Tier 2 — Scripture Callout)**

Current outer div (line 219):
```tsx
<div className="border-t border-white/[0.08] py-5 sm:py-6">
```

Change to (remove border-t and border color, keep spacing):
```tsx
<div className="py-5 sm:py-6">
```

Then wrap the passage `<p>` element (line 236) in a callout container. The verse reference header (lines 220-235) and SharePanel (lines 246-251) remain OUTSIDE the callout:

```tsx
{/* Verse reference + share button — above callout */}
<div className="mb-4 flex items-center gap-2">...</div>
{/* Tier 2: Scripture callout */}
<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.03] px-5 py-5 sm:px-6 sm:py-6">
  <p className="font-serif text-base italic leading-relaxed text-white sm:text-lg">
    {/* verses */}
  </p>
</div>
<SharePanel ... />
```

Brighten passage text: `text-white/80` → `text-white` (line 236)
Brighten superscripts: `text-white/30` → `text-white/40` (line 239)

**1b. Reflection section (Tier 3 — Inset)**

Current outer div (line 255):
```tsx
<div className="border-t border-white/[0.08] py-5 sm:py-6">
```

Change to (add border-b, increase padding):
```tsx
<div className="border-t border-b border-white/[0.08] py-6 sm:py-8">
```

No other changes to reflection section — text is already `text-white`.

**1c. Prayer section (Tier 4 — Dimmed Frosted Card)**

Current outer div (line 264):
```tsx
<div className="border-t border-white/[0.08] py-5 sm:py-6">
```

Change to (remove border-t, keep spacing):
```tsx
<div className="py-5 sm:py-6">
```

Wrap the prayer content (label + body) in a Tier 4 container:
```tsx
<div className="py-5 sm:py-6">
  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5">
    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/60">
      Closing Prayer
    </p>
    <p className="font-serif text-sm italic leading-relaxed text-white/70">
      {devotional.prayer}
    </p>
  </div>
</div>
```

Brighten prayer body text: `text-white/60` → `text-white/70` (line 268)

**Auth gating:** N/A — visual only.

**Responsive behavior:**
- Desktop (1024px+): Same as tablet; constrained by max-w-4xl
- Tablet (640px+): Scripture callout gains `sm:px-6 sm:py-6`, reflection inset gains `sm:py-8`
- Mobile (375px): Scripture callout `px-5 py-5`, reflection inset `py-6`, Tier 4 card `p-5`

**Guardrails (DO NOT):**
- DO NOT modify the quote card (lines 206-216) — already Tier 1 FrostedCard
- DO NOT modify the reflection question card (lines 274-296) — already Tier 1 with left accent
- DO NOT modify RelatedPlanCallout (lines 299-306) — its own component
- DO NOT add new imports — no new components or JS needed
- DO NOT change any callbacks, event handlers, or state management
- DO NOT move SharePanel inside the scripture callout container
- DO NOT add backgrounds or border-radius to the reflection section (Tier 3 = inset only)

**Test specifications:**

Tests are in Step 2.

**Expected state after completion:**
- [ ] Visual rhythm visible when scrolling: FrostedCard → Callout → Inset → DimmedCard → FrostedCard
- [ ] Passage text readable at `text-white` over `bg-white/[0.03]` callout
- [ ] Prayer text readable at `text-white/70` over `bg-white/[0.03]` dimmed card
- [ ] No horizontal overflow at 375px mobile
- [ ] Build passes with 0 errors

---

### Step 2: Update Existing Tests + Add Container Treatment Tests

**Objective:** Fix broken assertions from Step 1 changes, add tests verifying the 4-tier container treatment.

**Files to modify:**
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — update 2 existing tests, add ~8 new tests

**Details:**

**2a. Fix existing test: section divider count (line 314-318)**

Current:
```tsx
const dividers = container.querySelectorAll('.border-white\\/\\[0\\.08\\]')
expect(dividers.length).toBeGreaterThanOrEqual(5)
```

Change to:
```tsx
expect(dividers.length).toBeGreaterThanOrEqual(4)
```

Rationale: Passage outer div lost `border-white/[0.08]` (−1), prayer outer div lost it (−1), Tier 4 card added it (+1). Net: 5 → 4.

**2b. Fix existing test: "Closing Prayer label matches prayer body opacity" (lines 127-135)**

Current:
```tsx
expect(prayerBody.className).toContain('text-white/60')
```

Change to:
```tsx
expect(prayerBody.className).toContain('text-white/70')
```

**2c. New tests to add in a new `describe('Container tiers')` block:**

| Test | Type | Description |
|------|------|-------------|
| "Tier 2: passage wrapped in scripture callout with left accent" | integration | Query passage text, find closest `rounded-xl` ancestor, assert `border-l-4 border-l-primary/60 bg-white/[0.03]` |
| "Tier 2: passage text brightened to text-white" | unit | Assert passage `<p>` has `text-white` (not `text-white/80`) |
| "Tier 2: verse superscripts use text-white/40" | unit | Assert `<sup>` elements have `text-white/40` (not `text-white/30`) |
| "Tier 2: passage section outer div has no border-t" | unit | Assert passage outer div does NOT have `border-t` class |
| "Tier 3: reflection section has top and bottom dividers" | unit | Assert reflection outer div has both `border-t` and `border-b` |
| "Tier 3: reflection section has increased padding" | unit | Assert `py-6` and `sm:py-8` on reflection div |
| "Tier 3: reflection section has no background" | unit | Assert reflection div does NOT have `bg-white` or `rounded` or `backdrop-blur` |
| "Tier 4: prayer wrapped in dimmed frosted card" | integration | Query "Closing Prayer" text, find closest `rounded-2xl` ancestor, assert `border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm` |
| "Tier 4: prayer section outer div has no border-t" | unit | Assert prayer outer div does NOT have `border-t` class |
| "Tier 4: prayer body text brightened to text-white/70" | unit | Assert prayer body `<p>` has `text-white/70` (not `text-white/60`) |

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify or delete any existing tests beyond the 2 specified updates
- DO NOT add tests for the quote card or reflection question card (unchanged)
- DO NOT test CSS computed values (class-based assertions only)

**Expected state after completion:**
- [ ] All existing tests pass (22 original, 2 updated)
- [ ] ~10 new container tier tests pass
- [ ] Full test suite passes with 0 failures
- [ ] Build passes with 0 errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Apply visual container treatments to DevotionalTabContent.tsx |
| 2 | 1 | Update existing tests + add new container treatment tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Apply Tier 2, 3, 4 container treatments | [COMPLETE] | 2026-04-06 | DevotionalTabContent.tsx: passage wrapped in Tier 2 callout, reflection converted to Tier 3 inset, prayer wrapped in Tier 4 dimmed card, text brightened. Pre-existing build failure (workbox-window PWA plugin) unrelated to changes. |
| 2 | Update existing tests + add container tests | [COMPLETE] | 2026-04-06 | Updated divider count (>=5 → >=4), prayer body opacity (text-white/60 → text-white/70). Added 10 new tests in Container tiers describe block. 40 total tests, all passing. |
