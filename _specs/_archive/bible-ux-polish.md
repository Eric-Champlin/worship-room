# BB-47: Bible UX Polish — Scroll Fix, Copy, Colors

**Master Plan Reference:** N/A — standalone polish spec following the Bible audio wave (BB-26 through BB-44).

**Status:** Draft
**Date:** 2026-04-16
**Branch:** `bible-ux-polish` (off `main`)
**Depends on:** Audio wave (BB-26 through BB-44) merged to main
**Depended on by:** None

---

## Overview

A sweep of small but high-impact UX fixes surfaced during manual exploration of the Bible section after the audio wave shipped. Two categories of work: a global scroll-to-top bug that makes every navigation feel broken, and a set of copy/color/styling changes that make the Bible browser feel polished rather than draft-quality.

The scroll-to-top fix is the single highest-priority item because it affects every page transition in the app, not just the Bible section. A user clicking any internal link and landing at the bottom of the next page is confused and thinks the app is broken — directly at odds with the "sanctuary immersion" design goal.

## User Story

As a **logged-out or logged-in visitor**, I want every page I navigate to start at the top, legible copy, and accurate counts so that **the Bible section feels intentionally designed rather than half-finished** — reinforcing trust in the sanctuary before I commit to a reading habit.

## Requirements

### Functional Requirements

1. **Global scroll-to-top on route change.** A `ScrollToTop` component mounted inside the Router scrolls `window` to `(0, 0)` on every pathname change. Query-param-only changes (e.g., Daily Hub `?tab=pray` → `?tab=journal`) MUST NOT trigger scroll reset. Deep-link verse scroll (`/bible/john/3?verse=16`) MUST still land on the target verse — the BibleReader's own scroll-to-verse effect runs after mount and supersedes the initial scroll-to-top.
2. **FirstRunWelcome popup removed from render.** The conditional render of `FirstRunWelcome` is removed wherever it is currently mounted (Home / Dashboard / App). The component file itself is NOT deleted. The `wr_first_run_completed` localStorage key remains in the registry (harmless, deferred cleanup).
3. **Bible browser heading.** Replace "The word of God open to you" with "Your Study Bible" using the 2-line heading pattern — "Your" in `text-white`, "Study Bible" in `GRADIENT_TEXT_STYLE` (white → primary-lt gradient).
4. **Navbar label renamed.** All navigation references labeled "Bible" become "Study Bible" — desktop navbar, mobile drawer, any other nav surface. `.claude/rules/10-ux-flows.md` updated to reflect the renamed top-level nav item.
5. **Subtitle removed.** The subtitle "No account needed. Free forever. The World English Bible, always here for you." is deleted from the Bible browser page (element removed, not hidden).
6. **Inaccurate plan count removed.** The text "Choose from 10 guided plans" is deleted from the Reading Plans section (the actual count is 4). No replacement — let the cards speak for themselves.
7. **Redundant "Browse all plans" button removed.** The duplicate button/link below the reading plans section is deleted. Individual plan cards and the "Try a reading plan" CTA remain as entry points.
8. **Footer text removed.** "World English Bible (WEB) — Public Domain — No account, ever." is deleted from the bottom of the Bible browser page.
9. **Verse of the Day text size reduced.** Verse text shrinks from its current size (likely `text-2xl`/`text-3xl`) to `text-lg` on mobile and `text-xl` on tablet+. Reference and attribution sizes unchanged.
10. **Action button text color.** "Read in context", "Share", and "Save" action buttons on the Verse of the Day module use `text-white` (currently a muted opacity that is hard to read on the dark background).
11. **Seasonal banner styling.** Seasonal banner CTA/body text (e.g., "Read today's devotional") uses `font-bold text-white` (currently a hard-to-read purple).
12. **Seasonal banner season logic.** The Easter banner must not show weeks after Easter. Investigate `useLiturgicalSeason` (or whichever hook drives the banner content). If the season detection is correct but the banner lacks a non-Easter fallback, add one: show current liturgical season content, or hide the banner entirely during Ordinary Time if no seasonal content is available.
13. **"Or read the next chapter" text color.** Changes from its current muted color to `text-white`.

### Non-Functional Requirements

- **Performance:** No perceptible impact. `ScrollToTop` is ~10 lines, fires a single `window.scrollTo` per pathname change.
- **Bundle:** No new dependencies. Expected delta under 0.5 KB.
- **Accessibility:** All text-color changes MUST maintain WCAG AA contrast. `text-white` (#FFFFFF) on hero-dark (#0D0620) and hero-mid (#1E0B3E) exceeds 4.5:1 — passes easily.
- **Reduced motion:** `window.scrollTo(0, 0)` uses the default instant behavior (no `{ behavior: 'smooth' }`), so `prefers-reduced-motion` has nothing to override.

## Auth Gating

No auth behavior changes. The Bible section remains unauthenticated per the Bible wave posture (see `.claude/rules/02-security.md` § "Bible Wave Auth Posture"). Removing the FirstRunWelcome popup does not change any auth gate — it was a welcome card, not a gate.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Navigate Bible pages | Works, scroll resets to top | Same | N/A |
| Click Verse of the Day actions (Read in context / Share / Save) | Works — unchanged from current | Same | N/A |
| Use reading plans | Works — unchanged | Same | N/A |

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 640px) | Verse of the Day verse text at `text-lg`. Navbar label "Study Bible" in mobile drawer. All other changes are text-color / content-removal only and inherit existing responsive rules. |
| Tablet (640–1024px) | Verse of the Day verse text at `text-xl`. Desktop navbar label "Study Bible". |
| Desktop (> 1024px) | Verse of the Day verse text at `text-xl`. Desktop navbar label "Study Bible". |

ScrollToTop behavior is breakpoint-independent — same route change trigger on all devices.

## AI Safety Considerations

N/A — this spec changes scroll behavior, copy, and colors. It does not involve AI-generated content, free-text user input, or crisis-adjacent surfaces. Crisis-resource handling elsewhere in the app is not touched.

## Auth & Persistence

- **Logged-out users:** No persistence changes. `wr_first_run_completed` is no longer read/written (the popup no longer renders), but the key remains in localStorage on existing users' devices as harmless legacy data.
- **Logged-in users:** Same as logged-out — this spec does not touch any user data.
- **localStorage usage:** No new keys. No keys removed. `wr_first_run_completed` becomes dormant.
- **Route type:** All changes affect public routes.

## Completion & Navigation

N/A — standalone polish spec. No Daily Hub completion tracking touched.

## Design Notes

- **2-line heading treatment for "Your Study Bible":** follows the Round 3 homepage redesign pattern documented in `.claude/rules/09-design-system.md`. Use `GRADIENT_TEXT_STYLE` from `frontend/src/constants/gradients.tsx` for the "Study Bible" line.
- **Text color:** all color changes target `text-white` (#FFFFFF) — consistent with the Round 3 "default to white" text opacity standard for homepage / Daily Hub / landing surfaces. The Bible browser is a landing-style surface, so white-default is appropriate.
- **Animation tokens:** ScrollToTop uses instant scroll (no animation token needed). No new animations introduced.
- **ScrollToTop mount point:** implementation should mount it inside the Router wrapper at the top level of the app so every `useLocation()` consumer sees the same router context.
- **BibleReader exception:** BibleReader is a documented layout exception (see CLAUDE.md). It uses its own ReaderChrome and has its own root-level skip link. The ScrollToTop component still applies to it — pathname changes to `/bible/:book/:chapter` reset scroll, then BibleReader's own verse-anchor effect scrolls to the deep-linked verse.

## Files Likely Touched (non-binding — `/plan` decides)

- `frontend/src/components/ScrollToTop.tsx` (new)
- `frontend/src/App.tsx` or the router entry (mount ScrollToTop, remove FirstRunWelcome render)
- Bible browser page (heading, subtitle, footer, plan count, redundant button)
- Verse of the Day component (text size, action button colors)
- Seasonal banner component + `useLiturgicalSeason` hook (styling + fallback logic)
- "Or read the next chapter" component inside BibleReader
- Navbar + MobileDrawer (label string)
- `.claude/rules/10-ux-flows.md` (label update)
- BB-34 FirstRunWelcome tests (assertion flip — verify popup does NOT render)

## Out of Scope

- Deleting the `FirstRunWelcome` component file itself (kept for test references).
- Removing the `wr_first_run_completed` localStorage key from the registry (deferred cleanup — harmless to leave).
- Reworking the Verse of the Day layout or other modules beyond text size / button color.
- Redesigning the reading plans section (only removing inaccurate count and redundant button).
- Any new liturgical season content — this spec only fixes the Easter banner showing too long and enforces a non-Easter fallback.
- Smooth-scroll behavior on ScrollToTop — instant scroll is correct per reduced-motion safety.
- Backend / Phase 3 work.

## Acceptance Criteria

- [ ] `ScrollToTop` component exists and is mounted inside the Router at the top level.
- [ ] Navigating between any two pages via internal links lands the destination page at `window.scrollY === 0`.
- [ ] Deep-link to `/bible/john/3?verse=16` still scrolls to verse 16 after the page loads (not stuck at top).
- [ ] Switching Daily Hub tabs via query param (`?tab=pray` → `?tab=journal`) does NOT trigger scroll-to-top.
- [ ] Unit test verifies `ScrollToTop` calls `window.scrollTo(0, 0)` exactly once when pathname changes.
- [ ] Unit test verifies `ScrollToTop` does NOT call `window.scrollTo` when only search/hash change.
- [ ] Playwright integration test: navigate from `/bible` (scrolled partway down) to `/bible/my`, assert `window.scrollY === 0` on arrival.
- [ ] FirstRunWelcome popup does not render on any page for any user (new visitor, returning visitor, authenticated).
- [ ] `FirstRunWelcome.tsx` component file still exists (not deleted).
- [ ] BB-34 tests updated: assertions that previously verified the popup rendered now verify it does NOT render.
- [ ] Bible browser heading reads "Your" (white) on one line and "Study Bible" (gradient via `GRADIENT_TEXT_STYLE`) on the next line.
- [ ] Desktop navbar, mobile drawer, and any other nav surface show "Study Bible" (not "Bible").
- [ ] `.claude/rules/10-ux-flows.md` updated to reference the "Study Bible" label in navigation structure.
- [ ] The subtitle "No account needed. Free forever. The World English Bible, always here for you." is absent from the DOM.
- [ ] "Choose from 10 guided plans" text is absent from the Reading Plans section.
- [ ] "Browse all plans" button/link is absent below the Reading Plans section.
- [ ] "World English Bible (WEB) — Public Domain — No account, ever." text is absent from the bottom of the Bible browser page.
- [ ] Verse of the Day verse text uses `text-lg` on mobile and `text-xl` on tablet+ (computed font-size matches these Tailwind scale values).
- [ ] Verse of the Day "Read in context", "Share", and "Save" buttons have computed `color: rgb(255, 255, 255)`.
- [ ] Seasonal banner CTA/body text is bold (`font-weight: 700`) with `color: rgb(255, 255, 255)`.
- [ ] On 2026-04-16 (today, weeks after Easter 2026-04-05), the Easter banner is NOT shown. Either the current liturgical season's banner is shown, or the banner is hidden entirely.
- [ ] "Or read the next chapter" text (inside BibleReader) has computed `color: rgb(255, 255, 255)`.
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- [ ] All existing tests pass with updates for removed elements (tests asserting removed text must be updated to assert absence).
