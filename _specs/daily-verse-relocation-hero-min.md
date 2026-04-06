# Feature: Daily Verse Relocation + Hero Minimalism

**Master Plan Reference:** N/A — standalone feature

---

## Overview

The Daily Hub hero currently stacks three content blocks (greeting, verse of the day card, tab bar) in a compact space, creating visual competition. This spec relocates the daily verse card from the hero into the devotional tab — where it anchors the "scripture first" devotional flow — and simplifies the hero to a minimal greeting-only section. The quote card within the devotional is also repositioned to create a layered "word to commentary to application" reading structure.

## User Story

As a **logged-in user or logged-out visitor**, I want to encounter today's verse as the opening anchor of the devotional experience so that the scripture feels intentional and immersive rather than crowded into the hero alongside the greeting.

## Requirements

### Functional Requirements

1. **Hero simplification**: Remove the verse of the day card from the Daily Hub hero section. The hero should contain only the gradient greeting heading — no verse card, no quiz teaser, no other content below the heading.
2. **Hero breathing room**: Increase hero bottom padding to `pb-12 sm:pb-16` so the greeting has visual space without the verse card beneath it.
3. **Verse card relocation**: Add the verse of the day as a Tier 1 `FrostedCard` at the very top of the `DevotionalTabContent`, before the date navigation.
4. **Verse card styling upgrade**: The relocated verse card uses larger text (`text-lg sm:text-xl`) and brighter text (`text-white`) since it's now the primary content anchor, not a compact sidebar element.
5. **Verse card functionality preservation**: All existing verse card interactions must work identically in the new location:
   - Verse text links to the Bible reader at the correct book/chapter
   - "Meditate on this verse" link navigates to `/meditate/soaking` with all 3 URL params (`verse`, `verseText`, `verseTheme`)
   - Share button opens `SharePanel` with canvas-generated image sharing
6. **Independent share state**: The verse card's `SharePanel` must use its own state variable, independent of the devotional passage's existing share panel state.
7. **Quote card repositioning**: Move the quote card (saint's quote in `FrostedCard`) from its current position (between date navigation and passage) to between the passage and the reflection body.
8. **Unused code cleanup**: Remove any imports, state variables, and derived values from `DailyHub.tsx` that are no longer referenced after the verse card removal. Verify each symbol is truly unused before removing (some may be referenced in SEO metadata or JSON-LD).

### Non-Functional Requirements

- **Performance**: No new data fetching — `getTodaysVerse()` is a pure date-based lookup, already used elsewhere
- **Accessibility**: All existing ARIA attributes, focus-visible rings, keyboard navigation, and 44px touch targets preserved on the relocated verse card

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View verse card | Can view | Can view | N/A |
| Click verse text (Bible reader link) | Navigates to Bible reader | Navigates to Bible reader | N/A |
| Click "Meditate on this verse" | Navigates to soaking page (auth-gated there) | Navigates to soaking page | N/A |
| Click share button | Opens SharePanel | Opens SharePanel | N/A |
| View devotional content | Can view | Can view | N/A |

No new auth gates introduced. The verse card is read-only and navigational.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero: `pt-32 pb-12`. Verse card: full-width `FrostedCard` with `mb-8`. Verse text `text-lg`. All elements stack vertically. |
| Tablet (640-1024px) | Hero: `pt-36 pb-16`. Verse card: `mb-10`. Verse text `text-xl`. |
| Desktop (> 1024px) | Hero: `pt-40 pb-16`. Verse card within `max-w-4xl` container. Same styling as tablet. |

The verse card, share button, and "Meditate on this verse" link should fit comfortably at 375px mobile width with no horizontal overflow.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users**: Can view the verse card and all interactions (Bible link, meditate link, share). Zero persistence.
- **Logged-in users**: Same experience. No new data persistence introduced.
- **localStorage usage**: None new. Existing share template/size preferences (`wr_share_last_template`, `wr_share_last_size`) still apply.

## Completion & Navigation

N/A — This is a layout/positioning change within the devotional tab. No new completion signals or CTAs introduced. Existing cross-tab CTAs within the devotional flow are unaffected.

## Design Notes

- **Verse card**: Uses `FrostedCard` component (Tier 1) — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow
- **Verse text**: `font-serif italic text-lg sm:text-xl text-white` — larger and brighter than the previous hero version
- **Reference attribution**: `text-sm text-white/70` for the verse reference line
- **Hero**: Uses `GlowBackground` with `variant="center"` and `GRADIENT_TEXT_STYLE` on the greeting heading — unchanged visually, just with more bottom padding
- **Quote card**: Retains existing Tier 1 `FrostedCard` styling — only its position in the flow changes

### Final Devotional Content Order

After this spec, the devotional tab content flows as:

1. **Daily Verse Card** (Tier 1 FrostedCard) — NEW
2. **Date Navigation** — unchanged
3. **Devotional Title + Theme Tag** — unchanged
4. **Passage** (Tier 2 scripture callout) — unchanged
5. **Quote Card** (Tier 1 FrostedCard) — REPOSITIONED from before passage to after passage
6. **Reflection Body** (Tier 3 inset) — unchanged
7. **Reflection Question Card** (Tier 1 with embedded Journal CTA) — unchanged
8. **Pray CTA** — unchanged
9. **Related Plan Callout** (if applicable) — unchanged
10. **Share & Read Aloud buttons** — unchanged

This creates a layered reading structure: today's general verse, thematic devotional passage, historical commentary (saint's quote), modern reflection, personal application (question), and response (prayer/journal).

## Out of Scope

- No changes to verse data fetching logic or the `getTodaysVerse()` function
- No changes to the verse rotation algorithm
- No changes to `SharePanel` functionality or canvas rendering
- No new verse card on other Daily Hub tabs (Pray, Journal, Meditate) — verse card appears only on the Devotional tab
- No changes to the Verse of the Day dashboard widget (`VotdWidget`)
- No landing page changes
- Backend/API work (Phase 3+)

## Acceptance Criteria

- [ ] Verse card block REMOVED from `DailyHub.tsx` hero section
- [ ] Unused imports removed from `DailyHub.tsx` (only those confirmed unused via grep)
- [ ] Unused state/variables removed from `DailyHub.tsx` (only those confirmed unused)
- [ ] Hero section bottom padding is `pb-12 sm:pb-16`
- [ ] Hero contains ONLY the greeting heading — no verse card, no quiz teaser, no other content between heading and section close
- [ ] Verse card ADDED to top of DevotionalTabContent as a Tier 1 `FrostedCard`
- [ ] Verse card text uses `text-lg sm:text-xl text-white` (larger and brighter than hero version)
- [ ] Verse card `SharePanel` uses its own independent state variable (no conflict with passage share)
- [ ] Verse card "Meditate on this verse" link includes all 3 URL params (`verse`, `verseText`, `verseTheme`)
- [ ] Verse card Bible reader link navigates to correct book/chapter
- [ ] Quote card REPOSITIONED from between date-nav/title and passage to between passage and reflection
- [ ] Final devotional content order matches the 10-item structure above
- [ ] Both `SharePanel` instances (verse card + passage) function independently
- [ ] Mobile layout works at 375px with no horizontal overflow
- [ ] Hero-to-tab-bar visual transition feels clean (no awkward empty space)
- [ ] Tab switching (devotional → pray → devotional) preserves the verse card at top
- [ ] All existing tests pass after changes
