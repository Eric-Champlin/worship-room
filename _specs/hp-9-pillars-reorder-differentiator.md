# HP-9: Delete Pillars + Reorder Sections + Differentiator Copy Edits

**Master Plan Reference:** N/A — standalone homepage polish spec

---

## Overview

This spec covers three homepage cleanup tasks: removing the PillarSection entirely, reordering sections so the dashboard preview appears before the differentiator, and applying copy edits to the differentiator cards to broaden messaging beyond prayer-only language.

## User Story

As a **logged-out visitor**, I want to see a streamlined homepage with the dashboard preview higher up and broader differentiator messaging so that I understand the full value of Worship Room before being asked to commit.

## Requirements

### Functional Requirements

1. Delete PillarSection component files and all references (imports, exports, tests)
2. Reorder Home.tsx sections so DashboardPreview renders above DifferentiatorSection
3. Update differentiator heading from "Built for Your Heart, Not Our Bottom Line" to "Built for Your Heart"
4. Update 4 of 6 differentiator card titles/descriptions per the copy edits below
5. All 6 differentiator cards continue to render correctly in the responsive grid

### Non-Functional Requirements

- Performance: No new components or dependencies — this is a deletion + copy edit spec
- Accessibility: No changes to existing accessibility patterns

## Part 1: Delete PillarSection

Delete the following files entirely:

```
src/components/homepage/PillarSection.tsx
src/components/homepage/PillarBlock.tsx
src/components/homepage/PillarAccordionItem.tsx
src/components/homepage/pillar-data.ts
```

**Note:** These component files were already deleted in a previous commit. Remaining cleanup:
- Remove any `PillarSection` export from `src/components/homepage/index.ts`
- Delete any test files associated with PillarSection, PillarBlock, or PillarAccordionItem
- Remove any `PillarSection` import and usage from `src/pages/Home.tsx`

## Part 2: Reorder Sections in Home.tsx

After cleanup, Home.tsx should render sections in this exact order:

```tsx
<Navbar transparent hideBanner />
<HeroSection />

{/* === Homepage Redesign === */}
<JourneySection />
<StatsBar />
<DashboardPreview />
<DifferentiatorSection />
<StartingPointQuiz />
<FinalCTA />
{/* === End Homepage Redesign === */}

<SiteFooter />
```

The key change: `DashboardPreview` ("See What's Waiting for You") now renders **above** `DifferentiatorSection` ("Built for Your Heart"). Previously, Differentiator was above DashboardPreview.

## Part 3: Differentiator Section Copy Edits

All changes are in `DifferentiatorSection.tsx` and `differentiator-data.ts`.

### 3a. Section heading

- **Old heading:** "Built for Your Heart, Not Our Bottom Line"
- **New heading:** "Built for Your Heart"
- Tagline stays the same: "The things we'll never do matter as much as the things we will."

### 3b. Card 1

- **Old title:** "Your prayer time is sacred"
- **New title:** "Your time is sacred"
- Description: No change

### 3c. Card 2

- **Old title:** "Your prayers stay between you and God"
- **New title:** "Your conversations stay private"
- Description: No change

### 3d. Card 3: "Honest from day one"

No changes.

### 3e. Card 4: "We'll never guilt you for missing a day"

- Title: No change
- **Old description:** "Life happens. God's grace covers every gap. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we say welcome — not where have you been."
- **New description:** "Life happens. Your streak has gentle repair, your garden doesn't wilt, and when you come back, we welcome you back."

### 3f. Card 5: AI card

- **Old title:** "Prayers that know your heart"
- **New title:** "AI That Meets You Where You Are"
- **Old description:** "Tell us how you're feeling, and we'll write a prayer just for you. Not a template. Not a generic blessing. A prayer shaped by your words, your moment, your need."
- **New description:** "Share how you're feeling and receive a personalized prayer. Ask questions about Scripture and get thoughtful answers. Journal your thoughts and receive reflections that understand your journey. AI woven through every experience."
- Icon: Keep `Sparkles`

### 3g. Card 6: "A safe space when it matters most"

No changes.

### Final 6 cards (in order)

| # | Title | Icon |
|---|-------|------|
| 1 | Your time is sacred | `ShieldOff` |
| 2 | Your conversations stay private | `EyeOff` |
| 3 | Honest from day one | `CreditCard` |
| 4 | We'll never guilt you for missing a day | `HeartHandshake` |
| 5 | AI That Meets You Where You Are | `Sparkles` |
| 6 | A safe space when it matters most | `LifeBuoy` |

## Auth Gating

N/A — this spec modifies read-only landing page content. No interactive elements are added or changed.

## Responsive Behavior

No changes to responsive behavior. The existing differentiator grid layout is preserved.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

N/A — landing page content only. No data persistence involved.

## Completion & Navigation

N/A — standalone landing page changes.

## Design Notes

- Existing DifferentiatorSection component and card grid layout are preserved
- Only text content and section ordering change
- No new visual patterns introduced

## Out of Scope

- Redesigning the differentiator card layout or visual style
- Adding new differentiator cards
- Any backend changes
- Icon changes (all existing icons are retained)

## Acceptance Criteria

- [ ] `PillarSection.tsx`, `PillarBlock.tsx`, `PillarAccordionItem.tsx`, and `pillar-data.ts` are deleted (or confirmed already deleted)
- [ ] PillarSection export removed from `src/components/homepage/index.ts`
- [ ] PillarSection tests deleted or references removed
- [ ] Home.tsx no longer imports or renders PillarSection
- [ ] Section order in Home.tsx matches the specified order (DashboardPreview above DifferentiatorSection)
- [ ] Differentiator heading is "Built for Your Heart" (no "Not Our Bottom Line")
- [ ] Card 1 title is "Your time is sacred"
- [ ] Card 2 title is "Your conversations stay private"
- [ ] Card 4 description updated (shorter, no "God's grace covers every gap")
- [ ] Card 5 title is "AI That Meets You Where You Are" with new description covering prayer, Bible chat, and journal reflections
- [ ] Cards 3 and 6 unchanged
- [ ] All 6 cards still render correctly in the responsive grid
- [ ] Build passes with 0 errors
- [ ] All remaining tests pass

## Files Deleted / Modified

| Action | File |
|--------|------|
| DELETE | `src/components/homepage/PillarSection.tsx` (already deleted) |
| DELETE | `src/components/homepage/PillarBlock.tsx` (already deleted) |
| DELETE | `src/components/homepage/PillarAccordionItem.tsx` (already deleted) |
| DELETE | `src/components/homepage/pillar-data.ts` (already deleted) |
| DELETE | PillarSection / PillarBlock / PillarAccordionItem test files |
| MODIFY | `src/components/homepage/index.ts` (remove PillarSection export) |
| MODIFY | `src/pages/Home.tsx` (remove PillarSection, reorder sections) |
| MODIFY | `src/components/homepage/differentiator-data.ts` (copy edits) |
| MODIFY | `src/components/homepage/DifferentiatorSection.tsx` (heading edit) |
