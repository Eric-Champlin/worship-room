# Implementation Plan: HP-9 — Delete Pillars + Reorder Sections + Differentiator Copy Edits

**Spec:** `_specs/hp-9-pillars-reorder-differentiator.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (exists, not loaded — no new UI patterns in this spec)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Frontend lives in `frontend/src/`
- Homepage components: `frontend/src/components/homepage/`
- Homepage barrel export: `frontend/src/components/homepage/index.ts`
- Landing page: `frontend/src/pages/Home.tsx`
- Tests: co-located in `__tests__/` directories

### Current State (Reconnaissance Findings)

**Part 1 — PillarSection cleanup: ALREADY COMPLETE.**

- `PillarSection.tsx`, `PillarBlock.tsx`, `PillarAccordionItem.tsx`, `pillar-data.ts` — all deleted in a previous commit.
- `frontend/src/components/homepage/index.ts` — no PillarSection export (confirmed: only exports GlowBackground, SectionHeading, FrostedCard, StatsBar, DifferentiatorSection, DashboardPreview, FinalCTA).
- `frontend/src/pages/Home.tsx` — no PillarSection import or render (confirmed).
- No Pillar-related test files exist (`*Pillar*.test.*` and `*pillar*.test.*` — zero results).
- The only remaining reference: `Home.test.tsx:89` has a negative regression test `'does not render PillarSection (removed in HP-8)'`. This is a guard test, not a stale reference — it stays.

**Part 2 — Section reorder: ALREADY COMPLETE.**

Home.tsx currently renders sections in this exact order:
```
<HeroSection />
<JourneySection />
<StatsBar />
<DashboardPreview />      ← line 61
<DifferentiatorSection />  ← line 62
<StartingPointQuiz />
<FinalCTA />
```

This already matches the spec's desired order (DashboardPreview above DifferentiatorSection).

**Part 3 — Differentiator copy edits: THIS IS THE ONLY REMAINING WORK.**

Files to modify:
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — heading text change
- `frontend/src/components/homepage/differentiator-data.ts` — card title/description changes
- `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx` — update test assertions for new content

### Test Patterns

- Tests use Vitest + React Testing Library
- `DifferentiatorSection.test.tsx` uses `vi.mock('@/hooks/useScrollReveal', ...)` setup
- Tests assert on heading text (`/built for your heart/i`), tagline, all 6 titles/descriptions, competitor name exclusion
- Tests import `DIFFERENTIATORS` from data file and iterate — so changing the data file will automatically update content-matching tests

### Component Architecture

- `DifferentiatorSection.tsx` renders a `SectionHeading` component with `heading` and `tagline` props
- Card data comes from `DIFFERENTIATORS` array in `differentiator-data.ts`
- Each item: `{ icon: LucideIcon, title: string, description: string }`

---

## Auth Gating Checklist

N/A — this spec modifies read-only landing page content. No interactive elements are added or changed.

---

## Design System Values (for UI steps)

N/A — no visual/styling changes. Only text content changes.

---

## Design System Reminder

N/A — no UI layout or styling work in this spec.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec.

---

## Responsive Structure

N/A — no layout changes. Existing responsive grid preserved.

---

## Vertical Rhythm

N/A — no spacing changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] PillarSection files already deleted (confirmed via filesystem)
- [x] PillarSection exports already removed from index.ts (confirmed)
- [x] Home.tsx section order already matches spec (DashboardPreview above DifferentiatorSection)
- [x] No Pillar test files exist to clean up
- [ ] Current tests pass before making changes (run `pnpm test` first)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Home.test.tsx PillarSection regression test | Keep as-is | It's a negative assertion guarding against re-introduction, not a stale reference |
| DifferentiatorSection test heading assertion | Already matches (regex `/built for your heart/i`) | The existing regex matches both old and new heading — no test change needed for heading |
| Test assertions for card titles/descriptions | Update via data file | Tests iterate `DIFFERENTIATORS` array, so changing data file auto-updates content tests. But add explicit assertions for the new specific titles to make the test more robust. |

---

## Implementation Steps

### Step 1: Update differentiator card data

**Objective:** Apply copy edits to the 4 cards that need changes in the data file.

**Files to modify:**
- `frontend/src/components/homepage/differentiator-data.ts` — update titles and descriptions

**Details:**

Change the `DIFFERENTIATORS` array entries:

**Card 1 (index 0):**
- Title: `'Your prayer time is sacred'` → `'Your time is sacred'`
- Description: no change

**Card 2 (index 1):**
- Title: `'Your prayers stay between you and God'` → `'Your conversations stay private'`
- Description: no change

**Card 4 (index 3):**
- Title: no change
- Description: `"Life happens. God's grace covers every gap. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we say welcome — not where have you been."` → `"Life happens. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we welcome you back."`

**Card 5 (index 4):**
- Title: `'Prayers that know your heart'` → `'AI That Meets You Where You Are'`
- Description: `"Tell us how you're feeling, and we'll write a prayer just for you. Not a template. Not a generic blessing. A prayer shaped by your words, your moment, your need."` → `"Share how you're feeling and receive a personalized prayer. Ask questions about Scripture and get thoughtful answers. Journal your thoughts and receive reflections that understand your journey. AI woven through every experience."`

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change card icons
- DO NOT change cards 3 (index 2) or 6 (index 5)
- DO NOT change the `DifferentiatorItem` interface
- DO NOT reorder the cards array

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing data tests pass | unit | `DIFFERENTIATORS` still has 6 items with icon/title/description |
| No competitor names | unit | Existing competitor name exclusion test still passes |

**Expected state after completion:**
- [ ] `differentiator-data.ts` has updated titles/descriptions for cards 1, 2, 4, 5
- [ ] Cards 3 and 6 are unchanged
- [ ] All 6 items still have icon, title, and description

---

### Step 2: Update DifferentiatorSection heading

**Objective:** Change the section heading from "Built for Your Heart, Not Our Bottom Line" to "Built for Your Heart".

**Files to modify:**
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — update `SectionHeading` heading prop

**Details:**

Change line 20:
```tsx
// Old
<SectionHeading
  heading="Built for Your Heart, Not Our Bottom Line"
  tagline="The things we'll never do matter as much as the things we will."
/>

// New
<SectionHeading
  heading="Built for Your Heart"
  tagline="The things we'll never do matter as much as the things we will."
/>
```

Tagline stays the same.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change the tagline
- DO NOT change any other part of the component
- DO NOT change the `SectionHeading` component itself

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Heading renders | unit | Existing test `/built for your heart/i` already matches new heading |

**Expected state after completion:**
- [ ] Heading reads "Built for Your Heart" (not "Built for Your Heart, Not Our Bottom Line")
- [ ] Tagline unchanged

---

### Step 3: Update tests for new content

**Objective:** Ensure tests validate the new card content explicitly and build passes.

**Files to modify:**
- `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx` — add explicit assertions for key new content

**Details:**

The existing tests iterate `DIFFERENTIATORS` to check titles/descriptions, so they'll auto-pass with the new data. However, add explicit assertions for the most important spec acceptance criteria to prevent accidental regression:

Add a test case:
```typescript
it('renders updated card titles per HP-9 spec', () => {
  render(<DifferentiatorSection />)
  expect(screen.getByText('Your time is sacred')).toBeInTheDocument()
  expect(screen.getByText('Your conversations stay private')).toBeInTheDocument()
  expect(screen.getByText('AI That Meets You Where You Are')).toBeInTheDocument()
})
```

Add a test case:
```typescript
it('renders updated card descriptions per HP-9 spec', () => {
  render(<DifferentiatorSection />)
  expect(screen.getByText(/we welcome you back/i)).toBeInTheDocument()
  expect(screen.getByText(/AI woven through every experience/i)).toBeInTheDocument()
})
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove or modify existing tests — only add new ones
- DO NOT change test setup/mocking patterns

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Updated card titles | unit | Explicit assertions for 3 changed titles |
| Updated card descriptions | unit | Explicit assertions for key phrases in 2 changed descriptions |

**Expected state after completion:**
- [ ] All existing tests pass
- [ ] New explicit title/description tests pass
- [ ] `pnpm test` passes with 0 failures
- [ ] `pnpm build` passes with 0 errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update card data (titles + descriptions) |
| 2 | — | Update section heading |
| 3 | 1 | Add explicit test assertions for new content |

Steps 1 and 2 are independent. Step 3 depends on Step 1 (tests reference updated content).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update differentiator card data | [COMPLETE] | 2026-04-02 | Updated titles for cards 1, 2, 5; updated descriptions for cards 4, 5 in `differentiator-data.ts` |
| 2 | Update DifferentiatorSection heading | [COMPLETE] | 2026-04-02 | Changed heading to "Built for Your Heart" in `DifferentiatorSection.tsx` |
| 3 | Update tests for new content | [COMPLETE] | 2026-04-02 | Added 2 new test cases (HP-9 titles + descriptions) in `DifferentiatorSection.test.tsx`. 16/16 tests pass. Build failure is pre-existing (workbox-window PWA plugin); `tsc --noEmit` passes cleanly. |
