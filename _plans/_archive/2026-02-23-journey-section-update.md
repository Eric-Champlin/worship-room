# Implementation Plan: Journey Section Update

**Spec:** `_specs/journey-section-update.md`
**Date:** 2026-02-23
**Branch:** `claude/feature/journey-section-update`

---

## Architecture Context

### Existing Component Structure

The JourneySection lives in a single file: `frontend/src/components/JourneySection.tsx` (267 lines). It contains:

- **`JOURNEY_STEPS` array** (lines 12-55): 6 hardcoded step objects with `{ number, title, description, to }` shape, typed as `JourneyStep[]`
- **`BackgroundSquiggle` component** (lines 57-116): 6 SVG `<path>` elements creating a decorative background texture. The SVG uses `viewBox="0 0 1200 1000"` with `preserveAspectRatio="none"`. All paths end around y=1000.
- **`StepCircle` component** (lines 118-131): Renders the numbered purple circle badge
- **`JourneySection` component** (lines 133-266): Main export — uses `useInView` hook for scroll animation, renders an `<ol>` with `<li>` items mapped from `JOURNEY_STEPS`

### SVG Squiggle Structure

The `BackgroundSquiggle` has 6 paths with this visual hierarchy:
1. **Wide central brushstroke** — `strokeWidth="100"`, `opacity="0.25"`, `#D6D3D1`
2. **Right sweeping stroke** — `strokeWidth="80"`, `opacity="0.18"`, `#D6D3D1`
3. **Left sweeping stroke** — `strokeWidth="90"`, `opacity="0.22"`, `#E7E5E4`
4. **Thin central accent** — `strokeWidth="30"`, `opacity="0.15"`, `#D6D3D1`
5. **Far-left thin accent** — `strokeWidth="45"`, `opacity="0.15"`, `#E7E5E4`
6. **Far-right thin accent** — `strokeWidth="45"`, `opacity="0.15"`, `#E7E5E4`

Each path is a series of cubic Bezier curves (`C`) that snake vertically from top (~y=0) to bottom (~y=1000). With 8 steps the section is ~33% taller, so the viewBox needs to extend to y=1350 and each path needs additional curve segments to fill the extra height.

### Key Patterns

- Steps use `Link` from `react-router-dom` — entire row is a clickable link
- Stagger animation: `transitionDelay: inView ? \`${index * 150}ms\` : '0ms'`
- Connecting line: `<div className="mx-auto mt-1 w-0.5 flex-1 bg-primary/30">` rendered for all items except the last
- Bottom padding: `pb-8` on content div for all items except the last
- The `useInView` hook (in `frontend/src/hooks/useInView.ts`) fires a single `IntersectionObserver` on the `<ol>` container — no per-step observers

### Test Structure

Tests are in `frontend/src/components/__tests__/JourneySection.test.tsx` (165 lines). They use:
- `MemoryRouter` wrapper (component uses `<Link>`)
- `renderJourney()` helper function
- 5 describe blocks: Structure & Semantics, Step Content, Navigation Links, Accessibility, Animation State
- 14 total tests — all reference the number 6 (list items, circles, links, etc.)

### Test Setup

`frontend/src/test/setup.ts` provides a `MockIntersectionObserver` that fires synchronously with `isIntersecting: true` on `observe()`. This means tests always see the "animated in" state — no `waitFor` needed.

### Routes

`App.tsx` only has `/` and `/health` routes. The journey steps link to routes (`/pray`, `/journal`, `/meditate`, `/music`, `/prayer-wall`, `/churches`) that are not yet registered in App.tsx. The two new routes (`/listen` and `/insights`) will similarly be unregistered — they are out of scope for this feature (spec says placeholder pages are a separate feature).

### Note on `Pray` Route Change

The spec changes Pray's route from `/pray` (current) to `/scripture`. This is a meaningful change — the current component links to `/pray`.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The branch `claude/feature/journey-section-update` is checked out and clean
- [ ] The spec intentionally changes "Pray" from linking to `/pray` to `/scripture` — this is not a typo
- [ ] No placeholder pages for `/listen` or `/insights` are needed in this feature (out of scope per spec)
- [ ] The SVG squiggle paths need to be extended for the taller 8-step section — extend viewBox and add curve segments to each path

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Stagger timing for 8 steps | Reduce from 150ms to 120ms per step | 8 × 150ms = 1200ms total cascade is too long. 8 × 120ms = 960ms keeps the animation under 1 second, matching the feel of the original 6 × 150ms = 900ms. |
| SVG squiggle viewBox | Extend from `0 0 1200 1000` to `0 0 1200 1350` | 8 steps is ~33% taller than 6 steps. Extending the viewBox and adding curve segments to each path keeps the squiggle texture consistent rather than stretching/distorting the original curves. |
| SVG path extension approach | Add 1-2 additional cubic Bezier segments per path | Maintain the same visual rhythm (wave frequency, amplitude) as the existing curves. Keep same stroke colors, widths, and opacities. |
| "Pray" route | Change from `/pray` to `/scripture` | Spec explicitly specifies `/scripture`. This aligns with the route table in CLAUDE.md. |
| Test circle regex | Change from `/^[1-6]$/` to `/^[1-8]$/` | Numbered circles now go up to 8. |
| Mask gradient on squiggle wrapper | Keep unchanged | The mask uses percentage-based gradients (0%, 12%, 88%, 100%) which scale naturally with any container height. |

---

## Implementation Steps

### Step 1: Update the JOURNEY_STEPS Data Array

**Objective:** Replace the 6-step array with the 8-step array matching the spec exactly.

**Files to modify:**
- `frontend/src/components/JourneySection.tsx` — replace `JOURNEY_STEPS` array (lines 12-55)

**Details:**

Replace the `JOURNEY_STEPS` constant with the 8 steps in this exact order:

1. `{ number: 1, title: 'Pray', description: "Begin with what\u2019s on your heart. Share your feelings and receive a personalized prayer grounded in Scripture.", to: '/scripture' }`
2. `{ number: 2, title: 'Journal', description: 'Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life.', to: '/journal' }`
3. `{ number: 3, title: 'Meditate', description: 'Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in.', to: '/meditate' }`
4. `{ number: 4, title: 'Listen', description: "Hear God\u2019s Word spoken over you. Audio scripture, prayers, and calming content for rest and renewal.", to: '/listen' }`
5. `{ number: 5, title: 'Music', description: 'Let music carry you deeper. Curated worship playlists matched to where you are right now.', to: '/music' }`
6. `{ number: 6, title: 'Reflect', description: "See how far you\u2019ve come. Track your journey and discover patterns in your spiritual growth.", to: '/insights' }`
7. `{ number: 7, title: 'Prayer Wall', description: "You\u2019re not alone. Share prayer requests and lift others up in a safe, supportive community.", to: '/prayer-wall' }`
8. `{ number: 8, title: 'Local Support', description: 'Find churches and Christian counselors near you. The next step in your healing may be just around the corner.', to: '/churches' }`

**Guardrails (DO NOT):**
- Do NOT change the `JourneyStep` interface — same shape, just more entries
- Do NOT change the `StepCircle` or `JourneySection` component logic
- Do NOT modify the SVG paths in this step (that's Step 2)

**Test specifications:** None — data-only change, verified in Step 4.

**Expected state after completion:**
- [ ] `JOURNEY_STEPS` array has exactly 8 entries in the correct order
- [ ] `pnpm build` passes (no TypeScript errors)

---

### Step 2: Extend SVG Squiggle Paths

**Objective:** Extend the `BackgroundSquiggle` SVG viewBox and all 6 paths so the decorative texture covers the taller 8-step section without distortion.

**Files to modify:**
- `frontend/src/components/JourneySection.tsx` — modify `BackgroundSquiggle` component (lines 57-116)

**Details:**

1. Change the `viewBox` from `"0 0 1200 1000"` to `"0 0 1200 1350"`

2. Extend each of the 6 paths by adding 1-2 additional cubic Bezier curve segments that continue the existing wave pattern from ~y=1000 down to ~y=1350. The new segments should:
   - Maintain the same wave amplitude and frequency as existing curves
   - End with `L` (lineTo) to y=1350 for clean termination
   - Keep all stroke colors, widths, opacities, and `strokeLinecap` unchanged

3. Extended paths:

   **Wide central brushstroke** (`strokeWidth="100"`, `opacity="0.25"`):
   ```
   M400,0 C550,50 300,120 500,200 C700,280 250,370 500,450 C750,530 300,620 550,700 C800,780 350,870 500,960 C650,1050 350,1140 500,1230 L500,1350
   ```

   **Right sweeping stroke** (`strokeWidth="80"`, `opacity="0.18"`):
   ```
   M700,0 C850,80 600,170 800,260 C1000,350 650,440 850,530 C1050,620 700,710 900,800 C1100,890 750,960 900,1050 C1050,1140 800,1230 950,1350
   ```

   **Left sweeping stroke** (`strokeWidth="90"`, `opacity="0.22"`):
   ```
   M200,50 C350,130 100,220 300,310 C500,400 150,490 350,580 C550,670 200,760 350,850 C500,940 250,1030 350,1120 C500,1210 250,1280 350,1350
   ```

   **Thin central accent** (`strokeWidth="30"`, `opacity="0.15"`):
   ```
   M550,20 C700,100 400,190 600,280 C800,370 450,460 650,550 C850,640 500,730 680,820 C860,910 550,1000 680,1090 C810,1180 550,1270 650,1350
   ```

   **Far-left thin accent** (`strokeWidth="45"`, `opacity="0.15"`):
   ```
   M80,80 C200,160 0,250 150,340 C300,430 50,520 200,610 C350,700 100,790 200,880 C300,970 100,1060 200,1150 C300,1240 120,1300 200,1350
   ```

   **Far-right thin accent** (`strokeWidth="45"`, `opacity="0.15"`):
   ```
   M1000,30 C1120,110 900,200 1050,290 C1200,380 950,470 1080,560 C1210,650 980,740 1080,830 C1180,920 1000,1010 1080,1100 C1180,1190 1000,1280 1080,1350
   ```

**Guardrails (DO NOT):**
- Do NOT change any stroke colors (`#D6D3D1`, `#E7E5E4`), widths, or opacities
- Do NOT change `preserveAspectRatio="none"` or `aria-hidden="true"`
- Do NOT change the mask gradient on the squiggle wrapper (it uses percentages and scales automatically)
- Do NOT add or remove paths — keep exactly 6 paths

**Test specifications:** None — SVG is decorative (`aria-hidden="true"`), verified visually in browser.

**Expected state after completion:**
- [ ] `pnpm build` passes
- [ ] Browser visual check: squiggle texture extends to the bottom of the 8-step section without visible cutoff

---

### Step 3: Adjust Stagger Animation Timing

**Objective:** Reduce the stagger delay from 150ms to 120ms per step so the 8-step cascade completes in ~960ms (similar feel to the original 6 × 150ms = 900ms).

**Files to modify:**
- `frontend/src/components/JourneySection.tsx` — change `index * 150` to `index * 120`

**Details:**

In the `JourneySection` component, the `<li>` element has:
```
style={{ transitionDelay: inView ? `${index * 150}ms` : '0ms' }}
```
Change `150` to `120`:
```
style={{ transitionDelay: inView ? `${index * 120}ms` : '0ms' }}
```

**Guardrails (DO NOT):**
- Do NOT change the `'0ms'` fallback when `inView` is false — this prevents stagger replay on remount
- Do NOT change the `duration-500` or `ease-out` transition properties
- Do NOT change the `useInView` options (threshold, rootMargin)

**Test specifications:** None — timing verified in Step 4.

**Expected state after completion:**
- [ ] Animation stagger is 120ms per step
- [ ] Total cascade duration is 840ms (7 × 120ms for the 8th item)

---

### Step 4: Update All Tests

**Objective:** Update every test that references the old 6-step structure to reflect the new 8-step structure.

**Files to modify:**
- `frontend/src/components/__tests__/JourneySection.test.tsx` — update all 14 tests

**Details:**

Changes needed by test:

**Structure & Semantics:**
- `'renders an ordered list with 6 items'` → rename to `'renders an ordered list with 8 items'`, change `toHaveLength(6)` to `toHaveLength(8)`

**Step Content:**
- `'renders all 6 step title headings'` → rename to `'renders all 8 step title headings'`, add `'Listen'` and `'Reflect'` to the `titles` array (insert `'Listen'` after `'Meditate'`, `'Reflect'` after `'Music'`)
- `'renders numbered circles 1-6'` → rename to `'renders numbered circles 1-8'`, change loop to `i <= 8`
- `'renders a description for each step'` → add assertions for the two new descriptions:
  - `screen.getByText(/hear god.s word spoken over you/i)` (Listen)
  - `screen.getByText(/see how far you.ve come/i)` (Reflect)

**Navigation Links:**
- `'each step links to its correct route'` → update `expectedRoutes` array: change `/pray` to `/scripture`, add `/listen` (after `/meditate`), add `/insights` (after `/music`)
- `'all 6 links are keyboard-focusable'` → rename to `'all 8 links are keyboard-focusable'`, change `toHaveLength(6)` to `toHaveLength(8)`

**Accessibility:**
- `'numbered circles are hidden from screen readers'` → change regex from `/^[1-6]$/` to `/^[1-8]$/`

**Animation State:**
- `'steps have staggered transition delays'` → change `index * 150` to `index * 120`

**Guardrails (DO NOT):**
- Do NOT change the `renderJourney()` helper or the `MemoryRouter` wrapper
- Do NOT change the test structure (describe blocks, test names beyond the number updates)
- Do NOT add any new describe blocks — the existing 5 categories cover everything

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders an ordered list with 8 items | unit | Verifies `<ol>` has 8 `<li>` children |
| renders all 8 step title headings | unit | Verifies all 8 h3 titles including Listen and Reflect |
| renders numbered circles 1-8 | unit | Verifies circles 1 through 8 exist in the DOM |
| renders a description for each step | unit | Verifies all 8 descriptions including Listen and Reflect |
| each step links to its correct route | unit | Verifies 8 routes including `/scripture`, `/listen`, `/insights` |
| all 8 links are keyboard-focusable | unit | Verifies 8 links with no `tabindex="-1"` |
| numbered circles are hidden | unit | Verifies `aria-hidden="true"` on circles 1-8 |
| staggered transition delays | unit | Verifies delays use `index * 120` |

**Expected state after completion:**
- [ ] `pnpm test` passes — all 14 tests green
- [ ] No test references the number 6 or the old route `/pray`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update the JOURNEY_STEPS data array |
| 2 | — | Extend SVG squiggle paths |
| 3 | 1 | Adjust stagger animation timing |
| 4 | 1, 2, 3 | Update all tests |

---

## Verification Checklist

After all steps are complete:

- [ ] `pnpm build` — zero TypeScript errors
- [ ] `pnpm test` — all 14 tests pass
- [ ] `pnpm lint` — zero ESLint errors
- [ ] Visual check: landing page shows 8 steps in correct order with connecting line spanning all steps
- [ ] Visual check: stagger animation completes in ~1 second, feels smooth
- [ ] Visual check: SVG squiggle background extends to cover the full taller section without cutoff or distortion
- [ ] Responsive check: 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Keyboard: Tab through all 8 step links — focus ring visible on each
- [ ] Each link navigates to its correct route (even if the destination is a 404 for now)

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update the JOURNEY_STEPS data array | [COMPLETE] | 2026-02-23 | `frontend/src/components/JourneySection.tsx` — replaced 6-step array with 8 steps, changed Pray route from `/pray` to `/scripture` |
| 2 | Extend SVG squiggle paths | [COMPLETE] | 2026-02-23 | `frontend/src/components/JourneySection.tsx` — extended viewBox to `0 0 1200 1350`, added curve segments to all 6 paths |
| 3 | Adjust stagger animation timing | [COMPLETE] | 2026-02-23 | `frontend/src/components/JourneySection.tsx` — changed `index * 150` to `index * 120` |
| 4 | Update all tests | [COMPLETE] | 2026-02-23 | `frontend/src/components/__tests__/JourneySection.test.tsx` — updated all 14 tests for 8 steps, fixed subtitle test to use function matcher for Caveat-styled split text |
