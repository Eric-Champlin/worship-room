# BB-48: Bible Layout and Navigation Fixes

**Master Plan Reference:** N/A — standalone polish spec following BB-47.

**Status:** Draft
**Date:** 2026-04-16
**Branch:** `bible-ux-polish` (continuation — no new branch)
**Depends on:** BB-47 (scroll-to-top fix must be in place first — several items here interact with navigation)
**Depended on by:** None

---

## Overview

Layout and navigation fixes for the Bible section surfaced during manual exploration after BB-47. These items are bigger than the copy/color tweaks in BB-47 but smaller than full feature specs. The common thread is "the Bible section should feel like a cohesive, polished product, not a collection of independently-built features."

Six distinct fixes: full-width Bible browser, Reading Plans filter removal, Reading Plan card redesign to the FrostedCard dark-theme aesthetic, standard Navbar on reading plan detail pages, heatmap back-nav + contrast fix, and "Open the reader" button clarity.

## User Story

As a **logged-out or logged-in visitor exploring the Bible section**, I want the browser to fill the screen, the reading plan cards to match the rest of the dark theme, the navbar to stay visible when I click into a plan, the heatmap to actually be visible, and navigation buttons to tell me where I'm going, so that **the Bible section feels like a single cohesive product rather than pieces bolted together**.

## Requirements

### Functional Requirements

1. **Bible browser full-width layout.** The BibleBrowser outer container MUST fill the available viewport width within the standard page layout (Navbar + global padding respected; no local `max-w` constraint that floats content in a narrow column). If an outer `max-w-*` exists today that is narrower than `max-w-6xl`, either remove it or lift to `max-w-6xl` / `max-w-7xl` while ensuring the background fills edge-to-edge. Match the container behavior of other full-width pages (landing page, Daily Hub).
2. **Reading Plans filters removed.** The Theme and Duration filter controls above the Reading Plans grid are removed from render. The plans grid renders directly under the section heading. If filters live in a standalone component, the render call is removed but the component file is kept for possible reuse when plan count grows. If filters are inline JSX, the filter block is deleted inline.
3. **Reading Plan cards redesigned to FrostedCard pattern.** Each card uses:
   - Container: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
   - Title: `text-white font-semibold`
   - Duration + theme metadata: `text-white/70`
   - Hover: `hover:bg-white/[0.08] hover:border-white/20` with standard FrostedCard transition
   - Focus-visible ring for keyboard users
   - A small accent element to differentiate cards visually — either a thin `border-t-2` top border in a muted palette color (different per card but from the project palette — no garish hues), or a small category pill `bg-white/10 text-white/70` near the metadata line
   - All previous "ugly color" background classes (full-card solid colors that do not belong on the dark theme) are removed
4. **Reading plan detail page renders standard Navbar.** The `/reading-plans/:planId` route (whether accessed directly or via `/grow?tab=plans`) renders with the standard `Navbar` component at the top. It MUST NOT use `ReaderChrome` — ReaderChrome is scoped to the BibleReader immersive reading experience only. The fix depends on what the page currently does:
   - If wrapped in `ReaderChrome` → switch to the standard page layout with `Navbar`.
   - If missing a layout wrapper → add the standard page layout (same as other protected/public pages).
   - If the Navbar is rendered but something is hiding it (overflow, z-index, display) → find and remove whatever hides it.
   The plan step MUST investigate the actual cause before choosing the fix.
5. **Heatmap back-navigation preserves history.** The "Read verses" link (and any other chapter-open link) on the BB-43 heatmap in My Bible navigates to the BibleReader WITHOUT `{ replace: true }`. Pressing the browser back button from that BibleReader returns the user to `/bible/my` (not `/bible`). The BB-47 scroll-to-top fix already handles scroll position — user lands at the top of My Bible, which is acceptable because the heatmap sits near the top.
6. **Heatmap color contrast fix.** The heatmap day cells switch from the current purple-on-purple (nearly invisible) to white with opacity tiers:
   - Empty day: `bg-white/10`
   - Light activity (1st tier): `bg-white/20`
   - Moderate activity (2nd tier): `bg-white/50`
   - Heavy activity (3rd tier): `bg-white`
   Activity-tier thresholds MUST match whatever the heatmap currently uses — this is a color-only change, not a threshold change.
7. **"Open the reader" button clarity.** The "Open the reader" button on the Bible browser page is investigated and relabeled based on its actual behavior:
   - If it opens the last-read chapter using the `wr_bible_last_read` localStorage value (book/chapter), the label becomes `Continue reading {Book} {Chapter}` (e.g., "Continue reading John 3").
   - If no last-read chapter exists (new user), the label becomes `Start reading Genesis 1` and the button points to `/bible/genesis/1`. (Alternative: hide the button — the plan step chooses based on whether removing the button leaves the page without a primary reader entry point.)
   - If the button does something else entirely (opens a random chapter, opens a settings panel, etc.), the plan step documents the actual behavior before picking a label and may adjust the spec.

### Non-Functional Requirements

- **Bundle:** No new dependencies. All changes are CSS/class adjustments, render-tree removals, or route-link adjustments. Expected bundle delta: negligible (small net reduction from removing filter controls).
- **Accessibility:** The new FrostedCard hover states MUST include a `focus-visible` ring for keyboard users (match the existing FrostedCard component's focus treatment). Heatmap `bg-white/20` on the dark hero background passes WCAG AA contrast (white with 20% alpha on `#0D0620` / `#1E0B3E` clears 3:1 for non-text UI; the stronger tiers pass easily). Reading plan cards must remain keyboard-navigable (Tab reaches each card, Enter/Space activates).
- **Reduced motion:** Reading plan card hover transitions MUST respect the global reduced-motion safety net in `frontend/src/styles/animations.css` (existing pattern — no new rules needed, just don't hardcode transitions that bypass the safety net).
- **Testing:** Updated tests for removed filter UI. New tests for card styling (FrostedCard classes applied). Updated tests for reading plan detail page layout (Navbar present). Heatmap color tests updated. Back-navigation behavior test (heatmap → BibleReader → browser back → `/bible/my`).

## Auth Gating

No auth behavior changes. The Bible section — including `/bible`, `/bible/my`, `/bible/:book/:chapter`, and `/reading-plans/:planId` — remains unauthenticated per the Bible wave posture in `.claude/rules/02-security.md` § "Bible Wave Auth Posture".

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Browse Bible on `/bible` full-width | Works, unchanged | Same | N/A |
| Open a reading plan card | Navigates to plan detail with Navbar visible | Same | N/A |
| Click "Read verses" on heatmap | Navigates to BibleReader, back button returns to `/bible/my` | Same | N/A |
| Click "Continue reading {Book Chapter}" / "Start reading Genesis 1" | Navigates into BibleReader | Same | N/A |

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 640px) | BibleBrowser fills full width (no max-w cap kicks in). Reading plan cards stack in a single column. Heatmap cells scale down per existing BB-43 mobile rules. Reading plan detail page Navbar renders as mobile drawer trigger (existing Navbar responsive behavior — no changes). |
| Tablet (640–1024px) | BibleBrowser fills width up to any retained `max-w-6xl`/`max-w-7xl` cap. Reading plan cards render in a 2-column grid (match existing plan grid breakpoints). Reading plan detail page uses standard desktop Navbar from this breakpoint up. |
| Desktop (> 1024px) | BibleBrowser fills width up to the retained max-w cap with edge-to-edge background. Reading plan cards render in a 3- or 4-column grid (match existing grid — no breakpoint changes in this spec). Heatmap renders at full size. |

All responsive behavior inherits existing Tailwind rules for the affected components. This spec does not introduce new breakpoints or rearrange layouts across breakpoints — it removes/replaces elements within the existing responsive structure.

## AI Safety Considerations

N/A — this spec adjusts layout, card styling, color contrast, and navigation history behavior. No AI-generated content, no free-text user input, no crisis-adjacent surfaces involved. Crisis resource handling elsewhere in the app is untouched.

## Auth & Persistence

- **Logged-out users:** No persistence changes. The "Continue reading {Book Chapter}" label reads from `wr_bible_last_read` (already written by BibleReader per BB-4). If the key is absent or malformed, fall back to "Start reading Genesis 1."
- **Logged-in users:** Same as logged-out — this spec does not touch any user data.
- **localStorage usage:** Reads `wr_bible_last_read` (existing key — already documented in `11-local-storage-keys.md`). No new keys written. No keys removed.
- **Route type:** All changes affect public routes (`/bible`, `/bible/my`, `/reading-plans/:planId`).

## Completion & Navigation

N/A — standalone polish spec. No Daily Hub completion tracking touched. Heatmap navigation change IS a navigation behavior change but does not intersect the Daily Hub tab-completion system.

## Design Notes

- **FrostedCard pattern:** the project-wide FrostedCard component lives in the design system (see `.claude/rules/09-design-system.md` § "FrostedCard tier system" and § "Round 3 Visual Patterns"). The reading plan card redesign should reference this component or at minimum apply the identical Tailwind classes (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, hover to `bg-white/[0.08] border-white/20`). If a reusable `FrostedCard` component already exists and fits the data shape, use it. If not, apply the class pattern inline — do NOT create a new card component layer when a handful of classes is all the fix needs.
- **Accent element per card:** the accent is a small visual differentiator, not a garish color block. Preferred options: thin `border-t-2` in a muted palette color (primary / hero shades at low opacity, never saturated), or a `bg-white/10 text-white/70` category pill. The plan step picks one of these two options and applies it consistently across cards.
- **Heatmap white-with-opacity tiers:** this matches the app's "default to white" Round 3 text color standard and keeps the heatmap visually cohesive with surrounding UI (My Bible is a landing-style surface). The alternative (GitHub emerald tiers) was considered and rejected because emerald does not exist elsewhere in the palette and would make the heatmap feel like a drop-in widget rather than a native part of the app.
- **Standard Navbar + ReaderChrome boundary:** `ReaderChrome` is documented in CLAUDE.md as an intentional layout exception scoped to `BibleReader`. No other Bible-section route should use it. Reading plan detail pages, My Bible, and the Bible browser all use the standard `Navbar` + page layout. If the plan step finds any of these using `ReaderChrome` today, that is the bug — fix it.
- **Back-navigation and scroll:** BB-47's `ScrollToTop` component resets scroll on pathname change. When the user presses browser back from BibleReader to `/bible/my`, the pathname changes and `ScrollToTop` fires once, landing them at the top of My Bible. The heatmap sits near the top, so this is acceptable. Do NOT add scroll-restoration hacks specific to this flow — let the BB-47 behavior apply uniformly.
- **Animation tokens:** card hover transitions use the project's canonical animation tokens from `frontend/src/constants/animation.ts` (see `09-design-system.md` § "Animation Tokens"). Do not hardcode `200ms` / `transition-all` without a token import.

## Files Likely Touched (non-binding — `/plan` decides)

- Bible browser page (outer container width, "Open the reader" button label + link)
- Reading Plans section component (remove Theme/Duration filter render, card styling)
- Reading plan card component (replace background classes with FrostedCard pattern, add accent, hover, focus-visible)
- Reading plan detail page component/route (investigate layout, switch from ReaderChrome to standard Navbar if applicable)
- BB-43 heatmap component (color tier classes, verify "Read verses" link has no `{ replace: true }`)
- Tests for the above (filter removal, card classes, detail page Navbar presence, heatmap colors, back-nav behavior)

## Out of Scope

- Deleting the filter component file itself (kept for possible reuse when plan count grows). Only the render call is removed.
- Redesigning reading plan detail page content or the plan progress UI — this spec only fixes the missing Navbar.
- Changing heatmap activity-tier thresholds or timeframe — color-only change.
- Introducing any new card component or abstraction. If the existing FrostedCard fits, reuse it; otherwise apply classes inline.
- Adding emerald or any new palette color (rejected Option B for the heatmap).
- Smooth-scroll or custom scroll-restoration for the heatmap back-nav flow — let BB-47's `ScrollToTop` apply uniformly.
- Backend / Phase 3 work.
- Light mode adjustments (Phase 4).
- Any changes to BibleReader, My Bible's memorization deck, My Bible's highlights/notes/bookmarks sections, or the Bible browser's Verse of the Day module (BB-47 already handled VotD).

## Acceptance Criteria

- [ ] On `/bible`, the BibleBrowser outer container uses the same width behavior as the landing page — content fills the available width up to any retained `max-w-6xl`/`max-w-7xl` cap, and the background is edge-to-edge (no narrow floating column).
- [ ] The Reading Plans section on `/bible` (or wherever reading plans appear) renders zero filter UI — no "Theme" selector, no "Duration" selector, no filter bar element.
- [ ] Reading plan cards have computed CSS matching the FrostedCard pattern: `background-color: rgba(255,255,255,0.05)`, `backdrop-filter: blur(...)`, `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 16px` (rounded-2xl).
- [ ] Reading plan card titles have computed `color: rgb(255,255,255)` and `font-weight: 600` (semibold).
- [ ] Reading plan card duration/theme metadata has computed `color: rgba(255,255,255,0.7)`.
- [ ] Hovering a reading plan card (or keyboard-focusing it) transitions container to `bg-white/[0.08]` + `border-white/20` and shows a visible `focus-visible` ring.
- [ ] Each reading plan card has a visible accent element (either a `border-t-2` top border in a muted palette color OR a `bg-white/10 text-white/70` category pill near the metadata). The accent is consistent across cards (all pills or all top borders — not a mix).
- [ ] The reading plan detail page (`/reading-plans/:planId`) renders the standard `Navbar` component. `ReaderChrome` is NOT present on this route.
- [ ] Clicking "Read verses" (or the equivalent chapter-open link) on the My Bible heatmap navigates to `/bible/:book/:chapter` with a preserved history entry — the navigate call does NOT pass `{ replace: true }`.
- [ ] After navigating heatmap → BibleReader, pressing the browser back button returns the user to `/bible/my` (not `/bible`). Verified via Playwright integration test.
- [ ] Heatmap day cells have computed background colors matching the four tiers: empty `rgba(255,255,255,0.1)`, light `rgba(255,255,255,0.2)`, moderate `rgba(255,255,255,0.5)`, heavy `rgb(255,255,255)`. No purple remains on day cells.
- [ ] On the Bible browser page, when `wr_bible_last_read` contains a valid last-read reference, the primary reader-entry button text reads `Continue reading {Book} {Chapter}` (e.g., "Continue reading John 3") and navigates to that chapter.
- [ ] On the Bible browser page, when `wr_bible_last_read` is absent or malformed, the primary reader-entry button text reads `Start reading Genesis 1` and navigates to `/bible/genesis/1` (or the button is hidden if the plan step determined hiding is preferable for new users — documented in the plan).
- [ ] All existing BibleBrowser, Reading Plans, reading plan detail, and heatmap tests pass after updates for removed filter UI, new card classes, Navbar presence on detail page, new heatmap colors, and navigate-call changes.
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- [ ] Lighthouse Accessibility score on `/bible`, `/bible/my`, and `/reading-plans/:planId` remains ≥ 95 (no regression from BB-35 baseline).
