# Feature: Landing Page VOTD Banner Redesign

**Master Plan Reference:** N/A — standalone feature (builds on the Daily Hub Hero Redesign spec)

---

## Overview

The logged-in Daily Hub greeting area currently shows a "Good Morning!" greeting with two frosted glass cards side by side: a Verse of the Day card and a Daily Devotional preview card. The Daily Devotional card is redundant — the Devotional tab is the very next thing below it. This spec removes the devotional card and redesigns the Verse of the Day as a full-width frosted glass banner, creating a cleaner entry point where the verse — the app's daily spiritual anchor — gets the prominence it deserves.

The vertical rhythm becomes three distinct emotional beats: greeting (personal) → verse (spiritual anchor) → tabs (action).

---

## User Story

As a **logged-in user**, I want to see the Verse of the Day as a prominent, full-width banner below my greeting, so that I can absorb the day's spiritual anchor without visual competition from a redundant devotional link.

---

## Requirements

### 1. Remove Daily Devotional Preview Card

**Current state:** A frosted glass card next to the VOTD card showing "DAILY DEVOTIONAL" label, the devotional title (e.g., "The Road to the Cross"), a theme tag pill (e.g., "Hope"), and a "Read today's devotional >" link that navigates to `/daily?tab=devotional`.

**Target state:** This card is removed entirely from the greeting area. The Devotional tab in the Daily Hub immediately below serves this purpose. No replacement card is needed.

### 2. Verse of the Day Full-Width Banner

The VOTD becomes a full-width horizontal banner below the greeting, replacing the two-column card layout.

**Layout structure:**
```
[Good Morning, Name! — full width, centered greeting]

[────────────────────────────────────────────────────────]
[  "bearing with one another, and forgiving each          ]
[   other... even as Christ forgave you, so you           ]
[   also do."                                             ]
[                                                         ]
[   — Colossians 3:13           [Meditate >]    [Share]   ]
[────────────────────────────────────────────────────────]

[Daily Hub tabs: Devotional | Pray | Journal | Meditate  ]
```

**Banner styling:**
- Container: Full width of the content area, respects the same `max-w` constraint as the Daily Hub content area
- Background: Frosted glass — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (matches the Dashboard Card Pattern from the design system)
- Padding: `p-6 sm:p-8`

**Verse text:**
- Font: Lora serif italic (`font-serif italic`)
- Color: `text-white/90`
- Size: `text-lg sm:text-xl`
- Line height: `leading-relaxed` — generous for readability
- The verse text is the visual focus of the banner

**Reference:**
- Below the verse text, left-aligned
- Preceded by an em dash: "— Colossians 3:13"
- Color: `text-white/60`
- Size: `text-sm sm:text-base`
- Spacing: `mt-3` from verse text

**Actions row:**
- Below the reference, flex row
- "Meditate on this verse >" link: `text-primary-lt hover:text-primary text-sm`, navigates to the meditation/pray destination (same behavior as the current VOTD card's meditate link)
- Share icon button: Same share functionality as the current VOTD card — opens the existing `SharePanel` with canvas-generated verse images (4 templates × 3 sizes via `verse-card-canvas.ts`)
- Spacing: `mt-4` from the reference line

### 3. Preserve All Existing VOTD Functionality

- Daily rotation via `getVerseOfTheDay()` (or `getTodaysVerse()`)
- Seasonal verse priority (Lent verses during Lent, etc.) via `useLiturgicalSeason`
- Share icon opens `SharePanel` with 4 canvas templates × 3 sizes (square/story/wide)
- "Meditate on this verse" link navigates to the appropriate destination

### 4. Spacing Between Sections

- Greeting → VOTD banner: `mb-6` or `mb-8` — comfortable breathing room
- VOTD banner → Daily Hub tabs: `mb-8` or `mb-10` — the VOTD feels like its own moment, not crowded against the tabs
- The vertical rhythm should feel like three distinct beats: greeting (personal warmth) → verse (spiritual anchor) → tabs (action)

### 5. Logged-Out vs. Logged-In

- **Logged-in:** Shows greeting + VOTD full-width banner + Daily Hub tabs (as described above)
- **Logged-out:** The landing page (`Home` component) has its own separate VOTD section further down the page (in `VotdSection` or similar). That section is NOT affected by this spec.
- The two VOTD displays may share data sources — ensure removing the devotional card from the logged-in view does not break the logged-out landing page VOTD section.

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View VOTD banner | N/A — logged-out users see the landing page, not the Daily Hub greeting area | Verse displays in full-width banner | N/A |
| Share verse | N/A (not visible when logged out) | Opens SharePanel with canvas image templates | N/A |
| "Meditate on this verse" | N/A (not visible when logged out) | Navigates to meditation/pray destination | N/A |

The VOTD banner lives in the logged-in greeting area above the Daily Hub tabs. Logged-out users see the `Home` landing page instead, so no auth gating is needed for the banner itself.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Banner is full-width with `px-4` outer padding. Verse text `text-lg`, reference and actions stack vertically below. Single column. No horizontal overflow. |
| Tablet (640–1024px) | Banner renders at mid-width, `p-6` padding. Verse text `text-xl`. Actions row below reference. |
| Desktop (> 1024px) | Banner is a wide horizontal card. Verse text takes most of the width. Actions appear in a row below the reference, right-aligned or spread with `justify-between`. `p-8` padding. |

- On all breakpoints, the banner stacks naturally: verse text → reference → actions. No elements hide or require different layouts — only padding and font sizes scale.
- Touch targets for Share button and Meditate link: minimum 44px (per accessibility requirements).

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The VOTD is a hardcoded scripture from the `verse-of-the-day.ts` constants file. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** See the landing page, not this banner. Zero persistence.
- **Logged-in users:** No new persistence needed. The VOTD rotates daily from hardcoded constants — no localStorage writes for the banner itself. Share functionality uses existing `SharePanel` patterns.
- **Route type:** The banner is part of the `/daily` page, which is public. However, the greeting area with this banner only renders for authenticated users (the logged-out `/daily` view shows a different hero).

---

## Completion & Navigation

N/A — The VOTD banner is a passive content display, not a completable activity. The "Meditate on this verse" link navigates to an existing Daily Hub tab or meditation destination. No completion tracking changes needed.

---

## Design Notes

- **Frosted glass card:** Use the Dashboard Card Pattern from the design system: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Scripture typography:** Lora serif italic, matching the existing VOTD card's font treatment
- **Design system recon reference:** The Inner Page Hero gradient is documented in the design system recon (`_plans/recon/design-system.md`). The VOTD banner sits within this hero gradient area. Ensure the frosted glass card contrast works against the hero gradient background.
- **Existing components to reuse:** `SharePanel` for verse sharing, `verse-card-canvas.ts` for canvas image generation, `getVerseOfTheDay()` / `getTodaysVerse()` for verse data, `useLiturgicalSeason` for seasonal awareness
- **New patterns:** None — this is a layout change using existing design system patterns (frosted glass card, Lora serif, white/opacity text hierarchy)
- **Greeting heading:** Must preserve the Spec 9 fix that prevents the greeting heading from being cut off

---

## Out of Scope

- Verse of the Day content changes (adding more verses is a separate completed quick win)
- Logged-out landing page VOTD section changes
- Daily Hub tab heading changes ("What's On Your Soul?" etc.)
- Devotional tab content changes
- Song Pick section changes
- Dashboard VOTD widget changes (the dashboard has its own `VotdWidget` — that stays as-is)
- Quiz teaser link changes (remains below the VOTD banner, if present)
- Backend/API work (Phase 3+)

---

## Acceptance Criteria

- [ ] Daily Devotional preview card is removed from the greeting area above Daily Hub tabs
- [ ] No redundant "Read today's devotional" link exists in the greeting area (the Devotional tab serves this purpose)
- [ ] Verse of the Day renders as a full-width frosted glass banner (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) below the greeting
- [ ] Verse text is in Lora serif italic (`font-serif italic`), `text-white/90`, `text-lg sm:text-xl`, `leading-relaxed`
- [ ] Reference is displayed below the verse with em dash prefix ("— Colossians 3:13"), `text-white/60`, `text-sm sm:text-base`
- [ ] "Meditate on this verse" link is present with `text-primary-lt hover:text-primary text-sm` and navigates correctly
- [ ] Share icon button is present and opens the `SharePanel` with canvas-generated verse image templates (4 templates × 3 sizes)
- [ ] Verse rotates daily using the same `getVerseOfTheDay()` / `getTodaysVerse()` logic
- [ ] Seasonal verse priority works correctly (Lent verses during Lent, etc.)
- [ ] Spacing between greeting → VOTD banner → tabs feels balanced — three distinct visual beats with `mb-6`–`mb-8` and `mb-8`–`mb-10` gaps
- [ ] Mobile (375px): VOTD banner stacks cleanly in single column, no horizontal overflow, touch targets ≥ 44px
- [ ] Tablet (768px): VOTD banner renders well at mid-width with appropriate padding
- [ ] Desktop (1440px): VOTD banner is a wide horizontal card with generous padding
- [ ] Logged-out landing page VOTD section still renders correctly and is unaffected by this change
- [ ] The greeting heading ("Good Morning!") is not cut off (Spec 9 fix preserved)
- [ ] Existing tests that reference the removed devotional preview card are updated
- [ ] No new lint errors or TypeScript errors introduced
