# BB-53: Bible Polish Round 5 — Spacing, Width Parity, Auth Gates

**Master Plan Reference:** N/A — standalone polish spec in the BB-47 → BB-52 cluster.

**Status:** Draft
**Date:** 2026-04-17
**Branch:** Stay on current branch (`claude/feature/bible-polish-round-2`) — do NOT create a new branch. All BB-47 through BB-52 commits already live on this branch.
**Depends on:** BB-47, BB-48, BB-49, BB-50, BB-51, BB-52
**Depended on by:** None

---

## Overview

Final targeted fixes for the Bible section after BB-52's visual parity pass. Three narrow focus areas: vertical spacing of hero headings on `/bible` and `/bible/plans`, width parity between the "Continue Reading" and "Verse of the Day" cards on `/bible`, and auth-gating of the individual plan-day items on the `/bible/plans/:slug` Plan Overview list (the "Start this plan" button is already gated; the day rows are not).

Also covered: a global `pb` fix on every heading that renders with `GRADIENT_TEXT_STYLE` / `bg-clip-text` to eliminate the descender clip that currently shows on plan detail titles containing letters with descenders ("y", "p", "g").

A future-enhancement note about verse-number discoverability is recorded at the bottom but is NOT in scope here.

## User Story

As a **logged-out or logged-in visitor**, I want the Bible browser and Reading Plans hero headings to feel centered in the hero zone (not pushed down), the two cards on the Bible browser's upper content slot to have the same width, gradient-text headings to never clip their descenders, and the individual day rows in a plan's "Plan Overview" to require sign-in the same way "Start this plan" does — so that **the Bible section's final polish round closes out the visual inconsistencies and the obvious auth-gating gap without changing the surrounding BB-47 → BB-52 behavior**.

## Requirements

### Functional Requirements

#### 1. Vertical centering of hero headings

**Affected pages:**

- `/bible` — `BibleLanding.tsx` → `BibleHero` section (`components/bible/landing/BibleHero.tsx`) — "Your Study Bible" heading
- `/bible/plans` — `PlanBrowserPage.tsx` hero section — "Reading Plans" heading

**Problem:** On both pages, the hero uses `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44`. The top padding (above the heading) is visually dominant, and the bottom padding (between the heading and the first content card / divider) is noticeably smaller. The heading feels pushed down against the first content element rather than centered in the hero zone.

**Fix:** Reduce the top padding so the heading sits closer to vertically centered between the navbar's bottom edge and the top edge of the first content element (divider → first card). Acceptable approach: drop the top padding by one tier (e.g., `pt-28 sm:pt-32 lg:pt-36`) and slightly increase the bottom padding so the heading feels balanced. The implementer chooses exact values, but the visual target is: **the heading is closer to optically centered, with top spacing ≤ ~1.2× bottom spacing, not ~2×+ as today.**

Both pages must use matching hero padding so the two heroes look like siblings.

**Measurement approach:** In DevTools at 1440px, measure the computed distance from the navbar's bottom edge to the heading's top edge, and from the heading's bottom edge to the first downstream element's top edge. The target ratio is roughly 1.0–1.2 (top slightly larger than bottom for optical centering is fine; ~2:1 as today is not).

#### 2. Card width parity on `/bible`

**Problem:** On `/bible` under the hero divider, the `BibleHeroSlot` renders two stacked cards: the Resume Reading card (or `ActivePlanBanner` + Resume Reading when a plan is active) and `VerseOfTheDay`. The Resume Reading card is currently wider than the VerseOfTheDay card. The page reads as two unrelated cards floating at different widths rather than a clean vertical stack.

**Fix:** Both cards must render at the same width. Options the implementer may choose from (in order of preference):

1. Apply a shared `max-w-*` wrapper at the `BibleHeroSlot` level (or in `BibleLandingInner` around the `BibleHeroSlot` call) so every priority branch inherits the same width. The existing outer container is `max-w-6xl`; this fix likely introduces a narrower inner wrapper (e.g., `max-w-3xl` or `max-w-4xl`) applied to both cards.
2. If per-card wrappers are easier, wrap each rendered card (Resume Reading, VerseOfTheDay, ActivePlanBanner + demoted content) in the same `max-w-* mx-auto` container.

**Visual target:** At 1440px, both cards have identical computed `width` (measured via DevTools `getBoundingClientRect()`). On mobile (375px), both cards are full-width within the existing `px-4` content gutter.

**No changes to card internals** — this spec only normalizes the width wrapper. Do not touch ResumeReadingCard's box-shadow, border, or padding.

#### 3. Gradient-text descender clip (global `pb` fix)

**Problem:** `GRADIENT_TEXT_STYLE` (from `constants/gradients.tsx`) sets `WebkitBackgroundClip: 'text'` with `WebkitTextFillColor: 'transparent'`. When combined with tight `line-height` or when the containing element crops at the text baseline, the bottom of letters with descenders ("y", "p", "g") plus the bottom of the gradient fill get clipped. This was flagged in BB-51 on the `/bible/plans` page and fixed there with `pb-2`. The same bug still ships on `/bible/plans/:slug` plan detail (heading contains titles with descenders).

**Fix (global):** Apply a small bottom padding (`pb-1` or `pb-2`) to **every** heading that renders with `GRADIENT_TEXT_STYLE` or `bg-clip-text`. The implementer MUST audit the codebase for this usage (there are ~30 files referencing `GRADIENT_TEXT_STYLE` or `bg-clip-text`) and add the padding wherever a heading uses the gradient and lacks sufficient bottom padding / `leading` to clear descenders.

**Audit starting points** (known to be affected, verified during spec recon — not exhaustive):

- `pages/BiblePlanDetail.tsx` line 126 — plan title `<h1>` (acceptance criterion below)
- `pages/ReadingPlanDetail.tsx` line 199 — plan title `<h1>`
- `pages/ChallengeDetail.tsx` — challenge title
- `pages/BiblePlanDay.tsx` — day title
- `components/homepage/SectionHeading.tsx` — 2-line treatment (bottom line gets the gradient)
- `components/prayer-wall/PrayerWallHero.tsx`, `components/local-support/LocalSupportHero.tsx`, `components/PageHero.tsx` — hero heading components

Every `GRADIENT_TEXT_STYLE` / `bg-clip-text` heading must be verified at 1440px with a descender-containing string and visually confirmed not to clip. The `BibleHero` ("Study Bible") and `PlanBrowserPage` ("Reading Plans") headings already have `pb-2`; if hero padding is reduced per Requirement 1, re-verify they still clear.

**Preferred fix:** `pb-1` or `pb-2` on the heading element itself. If an unusual layout needs more room (deep shadow, multi-line + descender overlap), `leading-relaxed` or `leading-loose` is an acceptable alternative. Do not remove `GRADIENT_TEXT_STYLE` — the fix is spacing, not style.

#### 4. Plan Overview day-row auth-gating on `/bible/plans/:slug`

**Affected file:** `pages/BiblePlanDetail.tsx` — the "Plan Overview" section, lines 213–248 (the `visibleDays.map(...)` → `<Link>` list of day rows).

**Problem:** The "Start this plan" button (line 169) is correctly auth-gated — `handleStart` (and the related `handlePause` / `handleRestart` handlers) call `authModal?.openAuthModal(...)` when `!isAuthenticated`. But the day rows in "Plan Overview" are plain React Router `<Link>` elements that navigate directly to `/bible/plans/:slug/day/:day` regardless of auth state. A logged-out user who clicks "Start this plan" is correctly stopped, but can then click a day row and bypass the gate to access the day's content.

**Fix:** Auth-gate the day rows with the same pattern used by `handleStart`. Replace the plain `<Link>` with an interactive element (button or wrapped Link) that:

- If `isAuthenticated` → navigates to `/bible/plans/:slug/day/:day` (preserve current behavior, including scroll-to-top if applicable).
- If `!isAuthenticated` → `event.preventDefault()` on the click, then `authModal?.openAuthModal('Sign in to start this reading plan')` using the **same auth modal message string** as `handleStart` on line 69 so messaging is consistent.

**After successful authentication**, the destination day URL must be preserved. The simplest pattern matches the existing `useAuthModal` + `navigate` usage elsewhere in the app: call `openAuthModal` with an `onSuccess` callback (if that API shape is supported by `AuthModalProvider`) that navigates to the target URL. If the current `openAuthModal` signature does not take an `onSuccess` callback, the acceptable fallback is: block navigation, open the modal, and after successful auth the user re-clicks the day row — the URL will then navigate normally. Verify which pattern the codebase already uses (e.g., `handleStart` does not pass an `onSuccess`, it just opens the modal) and match that pattern for consistency.

**Do not** change the visual styling of the day rows or the `DayStatusIndicator`. Keep the existing `min-h-[44px]` touch target, `aria-current` behavior, and the "Show all N days" / "Show fewer" toggle buttons.

**No regression on existing gated controls:** "Start this plan", "Pause plan", "Start again" must continue to auth-gate exactly as they do today.

### Non-Functional Requirements

- **Bundle:** No new dependencies. All fixes are CSS adjustments (padding, width wrappers, `pb` on gradient headings) and one auth-gate extension reusing `useAuthModal()`. Expected bundle delta: negligible.
- **Performance:** No new network calls, no new renders, no new subscriptions. Click-handler auth check is already paid for elsewhere on the page.
- **Accessibility:**
  - The auth-gated day rows must remain keyboard-accessible: `Tab` to the row → `Enter` or `Space` triggers the same auth flow as a click when logged out, and the same navigation when logged in. Focus must return to the triggering row after the auth modal closes.
  - `min-h-[44px]` touch target on day rows must be preserved.
  - `aria-current="step"` on the current day row must be preserved.
  - If the day row changes from `<Link>` to `<button>` or a wrapped element, ensure screen readers still announce the day number and title — the visible text structure must not change.
  - Gradient-text headings with `pb-1`/`pb-2` remain WCAG-compliant (padding does not affect contrast).

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Click a day row in "Plan Overview" on `/bible/plans/:slug` | Auth modal opens (via `authModal.openAuthModal(...)`); navigation is prevented | Navigate to `/bible/plans/:slug/day/:day` (current behavior preserved) | `"Sign in to start this reading plan"` (same string as `handleStart`) |
| Click "Start this plan" | Auth modal (unchanged from BB-52 / pre-existing) | Starts the plan (unchanged) | `"Sign in to start a reading plan"` (unchanged — existing string at `BiblePlanDetail.tsx:69`) |
| Click "Pause plan" | Auth modal (unchanged) | Pauses plan (unchanged) | `"Sign in to manage your reading plan"` (unchanged) |
| Click "Start again" (completed plan) | Auth modal (unchanged) | Restarts plan (unchanged) | `"Sign in to start a reading plan"` (unchanged) |
| Hero spacing / gradient `pb` changes | No auth implications | No auth implications | N/A |
| Card width parity changes | No auth implications | No auth implications | N/A |

**All other Bible-section auth behaviors from BB-47 → BB-52 remain unchanged.** No new gates are added outside the Plan Overview day rows.

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | Hero padding reduction applies proportionally (smaller top/bottom scale via the `sm:` prefix). Cards in BibleHeroSlot stack full-width within `px-4` gutter at matched width. Plan Overview day rows remain single-column with `min-h-[44px]` touch target. Auth modal triggered by day-row click opens full-width. |
| Tablet (640–1024px) | Both hero heroes use the intermediate `sm:` padding values (tighter than today but still generous). BibleHeroSlot cards use the shared `max-w-*` wrapper; both cards same width. Plan Overview day rows unchanged. |
| Desktop (> 1024px) | Hero heroes use `lg:` padding (reduced from today's `lg:pt-44`). BibleHeroSlot cards render at matching width — at 1440px, Resume Reading width === VerseOfTheDay width (compare via `getBoundingClientRect()`). Plan Overview day rows unchanged. |

**Additional responsive notes:**

- The hero padding reduction must not cause the "Your Study Bible" or "Reading Plans" headings to overlap the transparent navbar on any breakpoint. Keep at least enough top padding to clear the navbar's 64–72px height plus a small gap.
- Card width parity is verified at both 1440px (desktop) and 375px (mobile). Intermediate widths must behave — no layout break between these two anchor breakpoints.
- Descender-clip fix is independent of breakpoint; the fix applies equally at all sizes.

## AI Safety Considerations

N/A — this spec does not involve AI-generated content, free-text user input, or crisis-detection paths. The existing AI Explain / AI Reflect features and the crisis-keyword checks on Pray/Journal are untouched.

## Auth & Persistence

- **Logged-out users:** Can continue to browse `/bible`, `/bible/plans`, and `/bible/plans/:slug`. The day rows under "Plan Overview" now open the auth modal on click (same pattern as "Start this plan"). All existing unauthenticated Bible-reader behaviors (reading a chapter, highlighting, notes, bookmarks, memorization, AI Explain/Reflect, search) remain unauthenticated — this spec does NOT extend auth gating beyond the plan-day row.
- **Logged-in users:** No behavior changes. Hero spacing, card width, and gradient `pb` are all visual. Day-row clicks navigate normally.
- **localStorage usage:** None. No new keys. No reads, no writes, no key semantics changed. Nothing to document in `11-local-storage-keys.md`.

## Completion & Navigation

N/A — standalone polish spec. No completion tracking, no Daily Hub integration, no cross-tab context passing.

## Design Notes

- **Hero padding reduction** is consistent with the Daily Hub hero heading positioning targeted in BB-52 Requirement 1. Align the `/bible` and `/bible/plans` hero vertical rhythm with the Daily Hub reference as a secondary visual anchor — the heading should sit where "Good Morning!" does on the Daily Hub.
- **Card width parity:** The shared width wrapper should land at a value that reads as "card-like" (not full-viewport stretched). `max-w-3xl` or `max-w-4xl` are both reasonable targets — the implementer picks whichever produces the best visual result against the overall `max-w-6xl` page container. If unsure, start at `max-w-3xl` and compare against the BB-52 reading plan card grid (`grid-cols-1 sm:grid-cols-2` with the `FrostedCard` aesthetic from BB-52 Requirement 6).
- **Gradient `pb` fix:** This is a global, low-risk sweep. Default to `pb-2`. Use `pb-1` only if `pb-2` introduces unwanted extra space between the heading and a tightly-coupled subtitle. `GRADIENT_TEXT_STYLE` is defined in `constants/gradients.tsx` — do NOT modify the style object itself (that would affect every consumer uniformly and the issue is consumer-level spacing, not the gradient).
- **Day-row auth-gating pattern:** Use the same `useAuthModal()` + `isAuthenticated` + `event.preventDefault()` pattern as:
  - `handleStart` in `BiblePlanDetail.tsx` (line 69)
  - `handleCreatePlan` in `ReadingPlans.tsx` (line 88–94)
  - The meditation card click pattern in `MeditateTabContent`
  - The BB-52 "My Bible" click-intercept pattern
- **Auth modal message string:** Match exactly — `"Sign in to start this reading plan"`. This is already the string used by `handleStart` at `BiblePlanDetail.tsx:69`. Do not invent a new message.
- **Animation tokens (BB-33 compliance):** No new animations introduced. Existing `transition-colors` on day rows uses whatever duration the day-row class already specifies — do not add hardcoded durations.

## Out of Scope

- Real authentication (Phase 3 — current auth is simulated)
- Backend sync for personal-layer data (Phase 3)
- Light mode (Phase 4)
- BibleReader chrome changes (BB-50 / BB-51 / BB-52 shipped the reader polish; this round does not touch the reader)
- Audio player changes (BB-26-29 wave is on its own branch)
- New features or new pages — this is pure polish
- Verse-number discoverability / verse action menu tooltip (documented below as a future enhancement, not in this spec)
- Re-styling of the reading plan cards from BB-52 — those remain as specified in BB-52 Requirement 6
- Changing `GRADIENT_TEXT_STYLE` itself — the fix is at the consumer level, not the gradient definition
- Changing the `handleStart` / `handlePause` / `handleRestart` auth gates — they already work correctly
- Changing any non-gradient heading's spacing
- The `/reading-plans/:planId` legacy detail page (`ReadingPlanDetail.tsx`) — receives the gradient-text `pb` fix only. Its day navigation uses a `DaySelector` component with its own gating via `isDayAccessible`, which is NOT the same auth-gate this spec is closing on `BiblePlanDetail.tsx`. If a similar gap exists there, it's out of scope for this round.

## Future Enhancement Note (NOT in this spec)

**Verse interaction discoverability.** Users currently cannot discover the verse action menu (highlight, bookmark, memorize, note, journal, share, copy) because tapping verse number superscripts is the only trigger and nothing about their appearance signals interactivity.

Recommended approach for a future small spec:

- Add a subtle hover/focus affordance (background circle or underline) on verse number superscripts.
- Add a one-time dismissible tooltip near the first verse on a user's first BibleReader visit: "Tap a verse number to highlight, save, or memorize."
- Persist a localStorage flag (`wr_verse_menu_hint_shown`) so the tooltip only appears once.

This is a UX-onboarding improvement worth doing, but it's a separate spec with its own acceptance criteria and is explicitly not included here.

## Acceptance Criteria

- [ ] On `/bible`, the vertical distance from the navbar's bottom edge to the top of the "Your Study Bible" heading is ≤ ~1.2× the distance from the bottom of the heading to the top of the first content element below it (divider + first card). Measured at 1440px via DevTools.
- [ ] On `/bible/plans`, the "Reading Plans" heading has the same balanced spacing (ratio ≤ ~1.2× top-to-bottom). Both hero pages use matching hero padding values.
- [ ] On `/bible`, the Resume Reading card (or `ActivePlanBanner` when a plan is active) and the VerseOfTheDay card render at identical computed width at 1440px. Verified via `getBoundingClientRect().width` equality (within ±1px).
- [ ] Both cards are centered and full-width within the `px-4` gutter at 375px mobile.
- [ ] On `/bible/plans/:slug` (plan detail), the plan title `<h1>` at `BiblePlanDetail.tsx:126` renders without any descender clipping. Verified with a plan whose title contains "y", "p", or "g" (e.g., "The Story of Jesus", "30 Days in the Psalms").
- [ ] Every heading across the codebase that uses `GRADIENT_TEXT_STYLE` or `bg-clip-text` has sufficient bottom padding (`pb-1`/`pb-2`) or `leading` to prevent descender and gradient-bottom clipping. Audit includes at minimum: `BibleHero`, `PlanBrowserPage`, `BiblePlanDetail`, `ReadingPlanDetail`, `ChallengeDetail`, `BiblePlanDay`, `SectionHeading` (homepage), `PrayerWallHero`, `LocalSupportHero`, `PageHero`.
- [ ] `GRADIENT_TEXT_STYLE` itself in `constants/gradients.tsx` is unchanged — the fix is applied at consumer headings only.
- [ ] On `/bible/plans/:slug`, a logged-out user clicking any row in the "Plan Overview" section sees the auth modal with the message `"Sign in to start this reading plan"`. The browser URL does NOT change to `/bible/plans/:slug/day/:day` — navigation is prevented.
- [ ] On `/bible/plans/:slug`, a logged-in user clicking any row in the "Plan Overview" section navigates to `/bible/plans/:slug/day/:day` exactly as before (no regression).
- [ ] Keyboard navigation on Plan Overview day rows works for both logged-in and logged-out users: `Tab` → focus visible on the row → `Enter` or `Space` triggers the same behavior as a click.
- [ ] `aria-current="step"` on the current day row is preserved.
- [ ] `min-h-[44px]` touch target on day rows is preserved.
- [ ] "Start this plan", "Pause plan", and "Start again" auth-gating continue to work exactly as they do today (no regression from the day-row gating change).
- [ ] All existing tests pass. Updated tests cover: the new day-row auth gate (at least one test for logged-out → modal opens + no navigation, and one test for logged-in → navigation succeeds). Gradient `pb` fix may not need unit-test coverage but should be verified visually.
- [ ] `/verify-with-playwright` sweep of `/bible`, `/bible/plans`, and `/bible/plans/:slug` confirms hero spacing, card width parity, no descender clipping, and the day-row auth modal — at 1440px and 375px.
