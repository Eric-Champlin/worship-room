# Implementation Plan: Journey Section Update V2

**Spec:** `_specs/journey-section-update-v2.md`
**Date:** 2026-02-23
**Branch:** claude/feature/journey-section-update-v2

---

## Architecture Context

### Existing Files
- `frontend/src/components/JourneySection.tsx` — The component to modify. Currently has 8 steps in `JOURNEY_STEPS` array (Pray, Journal, Meditate, Listen, Music, Reflect, Prayer Wall, Local Support). Each step is already wrapped in a `<Link to={step.to}>` component with focus-visible ring, hover states, and group-hover on the title. The `JourneyStep` interface already includes a `to: string` field.
- `frontend/src/components/__tests__/JourneySection.test.tsx` — 14 tests in 4 describe blocks: Structure & Semantics (4), Step Content (3), Navigation Links (2), Accessibility (3), Animation State (2). All assertions use the number 8 for step count.

### Key Observations
- **Step titles are already clickable links** — The existing code wraps each `<li>` in a `<Link to={step.to}>` with hover/focus styles. No new linking behavior is needed.
- **Descriptions already match spec for the 6 remaining steps** — Pray, Journal, Meditate, Music, Prayer Wall, and Local Support descriptions in the current code are identical to the spec. No text changes needed for those.
- **The only structural change is removing 2 steps** — "Listen" (step 4, `/listen`) and "Reflect" (step 6, `/insights`) must be removed, and the remaining steps renumbered 1-6.
- **Design patterns**: `cn()` utility for conditional classes, `useInView` custom hook for scroll animation, Inter font for text, Caveat for decorative headings, `text-primary` (#6D28D9) for active/hover states.

### Test Patterns
- Tests use `MemoryRouter` wrapper, `screen.getByRole`/`screen.getAllByRole`, `within()` for scoped queries
- Description assertions use partial regex matches (e.g., `/begin with what.s on your heart/i`)
- Link assertions check `getAllByRole('link')` and map `href` attributes

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The branch `claude/feature/journey-section-update-v2` is checked out
- [ ] The current `JourneySection.tsx` still has 8 steps (Listen and Reflect are still present)
- [ ] No other pending changes to `JourneySection.tsx` or its test file

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Step title link styling | Keep existing `<Link>` wrapper pattern (entire card is clickable) | Already implemented — the spec says "make step titles clickable" but the entire step card is already a Link. This exceeds the spec's requirement and is better UX (larger tap target). |
| Hover/focus states | Keep existing `group-hover:text-primary` on title + `hover:bg-white hover:shadow-sm` on card | Already matches spec's design notes: "natural headings that happen to be clickable, underline on hover/focus" — the current pattern uses color change + card lift instead of underline, which is arguably better UX. |
| Renumbering | Sequential 1-6 via the `number` field in each object | Simple mechanical change |

---

## Implementation Steps

### Step 1: Update JourneySection Component and Tests

**Objective:** Remove Listen and Reflect steps from the journey, renumber remaining steps 1-6, and update all test assertions to reflect 6 steps.

**Files to modify:**
- `frontend/src/components/JourneySection.tsx` — Remove Listen and Reflect from `JOURNEY_STEPS`, renumber remaining steps
- `frontend/src/components/__tests__/JourneySection.test.tsx` — Update all 8→6 assertions, remove Listen/Reflect from title/description/route lists

**Details:**

In `JourneySection.tsx`, replace the `JOURNEY_STEPS` array (lines 12-69) with:

```typescript
const JOURNEY_STEPS: JourneyStep[] = [
  {
    number: 1,
    title: 'Pray',
    description:
      "Begin with what\u2019s on your heart. Share your feelings and receive a personalized prayer grounded in Scripture.",
    to: '/scripture',
  },
  {
    number: 2,
    title: 'Journal',
    description:
      'Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life.',
    to: '/journal',
  },
  {
    number: 3,
    title: 'Meditate',
    description:
      'Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in.',
    to: '/meditate',
  },
  {
    number: 4,
    title: 'Music',
    description:
      'Let music carry you deeper. Curated worship playlists matched to where you are right now.',
    to: '/music',
  },
  {
    number: 5,
    title: 'Prayer Wall',
    description:
      "You\u2019re not alone. Share prayer requests and lift others up in a safe, supportive community.",
    to: '/prayer-wall',
  },
  {
    number: 6,
    title: 'Local Support',
    description:
      'Find churches and Christian counselors near you. The next step in your healing may be just around the corner.',
    to: '/churches',
  },
]
```

In `JourneySection.test.tsx`, make these changes:

1. **"renders an ordered list with 8 items"** (line 46) → Change to 6:
   - Test name: `'renders an ordered list with 6 items'`
   - Assertion: `expect(items).toHaveLength(6)`

2. **"renders all 8 step title headings"** (line 55) → Change to 6:
   - Test name: `'renders all 6 step title headings'`
   - Remove 'Listen' and 'Reflect' from the titles array
   - Final titles: `['Pray', 'Journal', 'Meditate', 'Music', 'Prayer Wall', 'Local Support']`

3. **"renders numbered circles 1-8"** (line 74) → Change to 1-6:
   - Test name: `'renders numbered circles 1-6'`
   - Loop: `for (let i = 1; i <= 6; i++)`

4. **"renders a description for each step"** (line 81) → Remove Listen and Reflect descriptions:
   - Remove: `expect(screen.getByText(/hear god.s word spoken over you/i)).toBeInTheDocument()` (Listen)
   - Remove: `expect(screen.getByText(/see how far you.ve come/i)).toBeInTheDocument()` (Reflect)
   - Keep remaining 6 description assertions

5. **"each step links to its correct route"** (line 107) → Update routes:
   - Remove `/listen` and `/insights` from `expectedRoutes`
   - Final routes: `['/scripture', '/journal', '/meditate', '/music', '/prayer-wall', '/churches']`

6. **"all 8 links are keyboard-focusable"** (line 126) → Change to 6:
   - Test name: `'all 6 links are keyboard-focusable'`
   - Assertion: `expect(links).toHaveLength(6)`

7. **"numbered circles are hidden from screen readers"** (line 137) → Update regex:
   - Change `/^[1-8]$/` to `/^[1-6]$/`

8. **Animation State tests** — No changes needed (they iterate `getAllByRole('listitem')` dynamically)

**Guardrails (DO NOT):**
- DO NOT change the `Link` wrapper pattern — steps are already clickable
- DO NOT change the `BackgroundSquiggle`, `StepCircle`, or section heading/subtitle
- DO NOT modify the scroll animation logic (`useInView`, `transitionDelay`)
- DO NOT change the component's exported name or props
- DO NOT add new files — this is a data + test update only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders an ordered list with 6 items | unit | Confirms exactly 6 `<li>` elements in the list |
| renders all 6 step title headings | unit | Each of the 6 titles renders as an h3 |
| renders numbered circles 1-6 | unit | Numbers 1-6 present, no 7 or 8 |
| renders a description for each step | unit | 6 description fragments found |
| each step links to its correct route | unit | 6 routes present in link hrefs |
| all 6 links are keyboard-focusable | unit | 6 links, none with tabindex=-1 |
| numbered circles regex matches 1-6 | unit | aria-hidden on circles matching /^[1-6]$/ |

**Expected state after completion:**
- [ ] All tests pass (`pnpm test` in frontend)
- [ ] Build compiles without errors (`pnpm build` in frontend)
- [ ] No lint errors (`pnpm lint` in frontend)
- [ ] Browser verification: Journey section on landing page shows 6 steps with correct titles, descriptions, and clickable links

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update JourneySection component and tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update JourneySection component and tests | [COMPLETE] | 2026-02-23 | Removed Listen and Reflect from JOURNEY_STEPS, renumbered 1-6. Updated 7 test assertions (8→6 counts, removed Listen/Reflect from titles/descriptions/routes, updated regex). Files: `frontend/src/components/JourneySection.tsx`, `frontend/src/components/__tests__/JourneySection.test.tsx` |
