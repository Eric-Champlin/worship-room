# BB-52: Bible Polish Round 4 — Final Visual Parity and UX Fixes

**Master Plan Reference:** N/A — standalone polish spec following BB-47 (scroll-to-top, copy/color fixes), BB-48 (layout/nav fixes), BB-49, BB-50 (layout, reader UX, devotional fix), and BB-51 (edge-to-edge, auth gating, persistent fixes).

**Status:** Draft
**Date:** 2026-04-17
**Branch:** Stay on current branch (`claude/feature/bible-polish-round-2`) — do NOT create a new branch. All BB-47 through BB-51 commits already live on this branch.
**Depends on:** BB-47, BB-48, BB-49, BB-50, BB-51 (all executed on the current branch)
**Depended on by:** None

---

## Overview

Fourth and hopefully final round of Bible section polish. The core recurring issue is visual parity with the Daily Hub — the Bible routes still look structurally different despite three prior rounds of fixes. This spec takes a different approach: instead of describing what to change, it describes the EXACT visual target (the Daily Hub) and requires the implementer to match it by structural comparison.

Additionally covers: restoration of the static chapter heading in the reader body, repositioning of the chapter dropdown in the top toolbar, focus mode toggle feedback and icon fix, a switch from a conversion card to an auth modal on the "My Bible" entry point, verification of the BB-41 notification dismissal persistence, and a re-styling of reading plan cards to match the homepage dashboard preview card aesthetic.

**Amendments to prior specs:**

- **Amends BB-51 § "BibleReader Top Bar Persistence":** BB-51 removed the static chapter heading from the reader body, leaving only the interactive toolbar selector. This round restores the static heading (user feedback: the static heading is a valuable visual anchor at the top of the passage even with focus mode off).
- **Amends BB-51 § "Auth-Gate My Bible Page":** BB-51 wrapped `/bible/my` in a conversion card for logged-out users. This round goes further — the click on "My Bible" (from the Bible browser three-card grid, avatar dropdown, or any other link) should trigger the auth modal directly without first navigating to `/bible/my`. The conversion card becomes a fallback for direct URL navigation only.

## User Story

As a **logged-out or logged-in visitor**, I want the Bible section to look structurally indistinguishable from the Daily Hub, with no visible container edges, no lighter rectangles behind headings, a usable focus-mode toggle that gives immediate feedback, a smoother auth flow on the "My Bible" entry point, and reading plan cards that match the rest of the design system, so that **the Bible section finally feels like a polished, trustworthy continuation of the Worship Room experience**.

## Requirements

### Functional Requirements

#### 1. CRITICAL: Visual parity with Daily Hub across ALL Bible routes

**THE PROBLEM (FOURTH ATTEMPT):**

The Daily Hub page looks correct: the glassmorphic navbar sits on a seamless dark background that flows uninterrupted into the page content. There is NO seam, NO color break, NO lighter rectangle, NO visible container edge between the navbar and the content area.

Every Bible route (`/bible`, `/bible/my`, Reading Plans, Browse Books) still looks wrong: there is a visible lighter/purple rectangle behind the content that creates a "box floating on a page" appearance instead of a "content flowing seamlessly from the navbar" appearance. The "Your Study Bible" hero section has a light purple box behind it that shouldn't be there.

**WHY PREVIOUS FIXES FAILED:**

Previous attempts adjusted CSS classes on the `BibleBrowser` component or its immediate wrapper. The problem is higher up — there is a layout wrapper, a page background, or a `<main>` container that creates the visual box. Patching inner components while this outer container persists will never fix the issue.

**MANDATORY APPROACH — DO NOT SKIP ANY STEP:**

1. Open the Daily Hub page (`/daily`) with DevTools. Starting from the `<body>` element, walk each DOM node down to the "Good Morning!" heading. For EVERY node along that path, record:
   - The element tag and component name
   - ALL CSS classes
   - The computed `background-color`
   - The computed `max-width` or `width`
   - Any `padding` or `margin` values

   This is the reference trace.

2. Do the exact same trace for the Bible browser page (`/bible`), from `<body>` down to the "Your Study Bible" heading.

3. Compare the two traces. Every difference between them is a candidate for the bug. The most likely differences are:
   - A wrapper element on the Bible route that has a `background-color` other than transparent or `#08051A`
   - A wrapper element on the Bible route that has a `max-width` that the Daily Hub doesn't have
   - A wrapper element on the Bible route that has `border-radius` or `overflow: hidden` creating the visible box edges
   - A decorative glow / gradient positioned differently from the Daily Hub's `HorizonGlow` layer

4. Fix every difference so the Bible route's DOM trace matches the Daily Hub's trace from `<body>` down through the layout wrappers. The page-specific content inside is obviously different, but the STRUCTURAL wrappers must be identical.

5. Apply the same fixes to ALL Bible sub-routes: `/bible`, `/bible/my` (logged-in view and logged-out conversion card), Reading Plans page, Browse Books view.

6. Take a screenshot of the Bible page at 1440px width and compare it side-by-side with the Daily Hub at 1440px width. The top ~200px (navbar + hero section area) must be visually indistinguishable in terms of background color, edge-to-edge coverage, and the relationship between the navbar and the content below.

**ALSO FIX:** The "Your Study Bible" heading must be vertically positioned the same way "Good Morning!" is on the Daily Hub — close to the navbar, in the upper portion of the viewport, not pushed far down with excessive top padding. Match the Daily Hub's heading `padding-top` / `margin-top`.

**ALSO FIX:** Whatever light purple box/rectangle is appearing behind the "Your Study Bible" hero section (most likely a decorative gradient or glow element) — either remove it or reduce its opacity to match the low-intensity `HorizonGlow` treatment on the Daily Hub. The HorizonGlow canonical opacity values per `09-design-system.md` are 0.28–0.35.

#### 2. BibleReader top bar adjustments

**Problem:** BB-51 removed the static book/chapter heading from the passage content area based on the reasoning that the toolbar selector was sufficient. User feedback: the static heading should be restored — it serves as a visual anchor when the toolbar is scrolled out of view or visually dim. Separately, the "Genesis 1 ▾" dropdown is currently on the left side of the top toolbar (near the back arrow), which is the wrong place — it should be grouped with the other interactive controls on the right.

**Fixes:**

1. **Restore the static book/chapter heading in the reader body.** Render a static heading at the top of the chapter content in the reader body (e.g., "Genesis 1"). This is a plain `<h1>` or `<h2>` — not interactive, not a dropdown. It anchors the user to the passage they're reading and does not conflict with the interactive selector in the top toolbar (they serve different purposes: toolbar selector = navigate, body heading = anchor).

2. **Move the chapter dropdown to the right side of the top toolbar.** The "Genesis 1 ▾" dropdown selector should be positioned on the RIGHT side, grouped with the "T" (Typography) button and other settings icons. The LEFT side should have only the back arrow ("← Study Bible").

   Target layout of the top bar:

   ```
   [← Study Bible]                       [Genesis 1 ▾] [T] [🔍] [other icons]
   ```

   Left side: back navigation only.
   Right side: all interactive controls grouped together.

#### 3. Focus mode toggle investigation and fix

**Problem:** The two-arrows-facing-each-other button (the focus mode / shrink-expand toggle) in the BibleReader toolbar does nothing visible when tapped. Two possible root causes:

- The click handler is broken or no-op
- The handler works and flips `wr_bible_focus_enabled`, but the default is now OFF (per BB-51), so toggling ON has no immediate effect until the idle timer expires 6 seconds later — the user taps, sees nothing happen, and thinks it's broken

**Investigation required:**

1. Identify the button component and its click handler.
2. Verify the handler fires on click (temporarily add `console.log` in a dev session, remove before commit).
3. Verify the handler flips `wr_bible_focus_enabled` in localStorage.
4. Verify the focus mode idle timer logic reads the new value immediately without requiring a page refresh.

**Fix:** Provide immediate visual feedback when focus mode is toggled:

- **When toggled ON:** The button's appearance changes (e.g., icon fills in, background tints toward primary, or icon swaps to the "active" state) AND a subtle inline hint appears for ~2 seconds with copy like "Toolbar will auto-hide after inactivity."
- **When toggled OFF:** The button's appearance changes back. No toast needed since the toolbar just stays visible.
- **Use the sharp easing token (150ms `fast` + `sharp`)** from `animation.ts` for the button state swap — this is a toggle micro-interaction.

**Icon clarification:** The current icon (described as two arrows facing each other / shrink-expand) does not communicate "auto-hide toolbar." Replace it with a semantically clearer icon. Acceptable choices:

- `Eye` / `EyeOff` from Lucide — communicates visibility toggle
- `PanelTop` / `PanelTopClose` from Lucide — communicates toolbar visibility
- Whatever the implementer picks should have a clear visual distinction between the OFF (default, toolbar always visible) and ON (focus mode, toolbar auto-hides) states

Update `aria-label` on the button to match: "Enable focus mode (auto-hide toolbar)" / "Disable focus mode (keep toolbar visible)".

#### 4. My Bible auth flow — trigger modal on click, not page navigation

**Problem:** Per BB-51, a logged-out user who navigates to `/bible/my` sees a conversion card with a "Get Started" CTA. However, the user still navigates to `/bible/my` first — this is an unnecessary extra step when the click originates from a link that knows the user is logged out.

**Fix:** When a logged-out user taps "My Bible" (in the Bible browser three-card grid, in the navbar avatar dropdown, in the mobile drawer, or anywhere else a "My Bible" link appears in-app), intercept the click and trigger the auth modal directly:

- The user stays on the current page.
- The auth modal opens with the message "Sign in to access your highlights, notes, and reading history."
- After successful auth, navigate to `/bible/my`.

**Implementation pattern:** Wrap the "My Bible" link/card in the same auth-gating pattern used elsewhere in the app (`useAuthModal()` + `isAuthenticated` check on click). If authenticated, navigate normally via `<Link>` / `navigate()`. If not authenticated, `event.preventDefault()` and open the modal. The auth modal's success callback navigates to `/bible/my`.

**Retain the BB-51 conversion card as a fallback.** A user who hits `/bible/my` via direct URL entry, deep link, or browser back/forward still sees the BB-51 conversion card. The two paths coexist:

- In-app "My Bible" click → auth modal (preferred, no URL change)
- Direct URL / deep link to `/bible/my` → conversion card (fallback, full page render)

#### 5. Notification prompt behavior verification (BB-41)

**Goal:** Verify — and if necessary, fix — that the BB-41 "Never miss your daily verse" notification permission prompt does not re-appear after the user clicks "Maybe later."

**Expected behavior per BB-41 and `11-local-storage-keys.md`:**

1. User clicks **Enable** → browser's native push notification permission dialog fires.
   - If permission is granted: `wr_push_subscription` is created with the subscription record.
   - If denied OR granted: `wr_notification_prompt_dismissed` is set to `"true"` so the prompt never appears again for the user.
2. User clicks **Maybe later** → `wr_notification_prompt_dismissed` is set to `"true"`. The prompt NEVER appears again for that browser in any future session.

**Verification:**

1. Reproduce: open `/bible/:book/:chapter`, complete a reading session, see the prompt, click "Maybe later." Navigate away and come back. The prompt should NOT re-appear.
2. Read the code that checks `wr_notification_prompt_dismissed` before showing the prompt. Verify:
   - The check happens on every prompt-render consideration, not just on first mount.
   - Nothing else in the app clears `wr_notification_prompt_dismissed` (no "reset preferences" button, no sign-out cleanup, no localStorage migration that wipes it).
3. If the prompt re-appears: find the bug, fix it. Likely culprits are a missed `localStorage.getItem` check, a stale React state that doesn't re-read localStorage after navigation, or a race between the prompt render condition and the localStorage write.
4. If the prompt does NOT re-appear: document that the behavior is correct as-is in the `/plan` artifact and skip any code change. The acceptance criterion is still covered (behavior verified).

#### 6. Reading Plans visual parity

**Problem:** Two issues:

1. The Reading Plans page shares the same background/color mismatch as the Bible browser (covered in Requirement 1 above).
2. The reading plan cards are plain dark boxes and look nothing like the homepage dashboard preview cards (Mood Insights, Streaks & Faith Points, Growth Garden). The reading plan cards should look like they came from the same design system.

**What makes the homepage dashboard preview cards look polished:**

- A subtle lighter edge at the top of the card (a thin gradient or brighter border-top)
- A colored icon to the left of the title
- A slightly brighter border compared to the reading plan cards' current border
- A descriptive subtitle line below the title in a lighter text weight
- An overall glassmorphic / frosted-glass feel with depth

**Fix for reading plan cards (match the dashboard preview card aesthetic):**

1. **Background:** `bg-white/[0.03]` with `backdrop-blur-sm` (matches the homepage preview card's frosted-glass feel). Note: BB-51 specified `bg-white/5` — this round refines that to `bg-white/[0.03]` to match the homepage preview cards exactly. Either value is acceptable if a DOM comparison against the dashboard preview cards shows parity; the implementer should match whatever the dashboard preview cards actually render.
2. **Border:** `border border-white/[0.08] rounded-xl`, with a brighter top edge via `border-t border-white/20` (or an equivalent top-edge treatment).
3. **Hover:** `hover:bg-white/[0.06] hover:border-white/20 transition-all` using the `base` (300ms) duration + `standard` easing tokens.
4. **Colored icon to the left of each plan title.** Choose contextually appropriate Lucide icons:
   - "30 Days in the Psalms" → `BookOpen` or `Book` in blue (`text-blue-400`)
   - "The Story of Jesus" → `Star` or `Cross` in amber/gold (`text-amber-400`)
   - "When You're Anxious" → `Heart` in teal (`text-teal-400`)
   - "When You Can't Sleep" → `Moon` in indigo (`text-indigo-400`)
   - For any other plan card, pick a Lucide icon that matches the plan's theme and a color from the existing Tailwind palette.
5. **Subtitle line** in `text-white/70 text-sm` below the title if one isn't already there (plan duration, day count, or theme tag).
6. **Keep the 2x2 grid layout** that BB-51 established on desktop, 1-column on mobile.

The goal: if you place a reading plan card next to a homepage dashboard preview card, they should look like they came from the same design system.

### Non-Functional Requirements

- **Bundle:** No new dependencies. Uses existing `useAuthModal()`, `isAuthenticated`, Lucide icons already bundled, and existing animation tokens. Expected delta: negligible.
- **Performance:** No new network requests. Changes are CSS/DOM, conditional rendering, and a click-handler auth check. Focus mode icon replacement is a one-import swap.
- **Accessibility:**
  - The new "My Bible" click handler must be keyboard-accessible — it wraps a focusable element (card button or link), `Enter` and `Space` must trigger the auth modal path when logged out. Focus must return to the triggering element after modal close.
  - Focus mode toggle needs an updated `aria-label` reflecting the new icon's purpose ("Enable focus mode (auto-hide toolbar)" / "Disable focus mode (keep toolbar visible)").
  - Static chapter heading in the reader body must use a semantic heading tag (`<h1>` or `<h2>`) with the correct hierarchy — the BibleReader page already has a heading for the chapter, and the interactive toolbar selector is a button (not a heading), so the restored body heading is the page's primary `<h1>` for the chapter.
  - Notification prompt "Maybe later" button needs a visible focus ring (likely already correct — verify during implementation).

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|--------------------|
| Click "My Bible" (in-app link: three-card grid, navbar avatar dropdown, mobile drawer) | Auth modal opens; user stays on current page; on successful auth, navigate to `/bible/my` | Navigate to `/bible/my` | "Sign in to access your highlights, notes, and reading history" |
| Navigate directly to `/bible/my` via URL | BB-51 conversion card (unchanged) | Full My Bible experience (unchanged) | "Sign in to track your Bible reading journey" (from BB-51) |
| Focus mode toggle | Works (same as logged-in) — no auth required | Works | N/A |
| Notification prompt "Enable" / "Maybe later" | Works (browser permission is per-browser, not per-account) | Works | N/A |
| Restore-static-heading, reading plan card restyle, visual parity, dropdown move | No auth implications | No auth implications | N/A |

**Unchanged auth behavior (all remain unauthenticated from BB-51):**

- Bible reader (`/bible/:book/:chapter`)
- Highlighting, notes, bookmarks, memorization
- AI Explain, AI Reflect
- Full-text search
- Browse Books
- Reading Plans pages (reading a plan, not tracking progress — progress remains in localStorage)

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Reading plan cards: 1-column grid. Static chapter heading: same as desktop, scales with body type size. Focus mode toggle button: same size, same position on right of top bar (may compress other right-side icons as needed). Top-bar "← Study Bible" back button may shorten to just the arrow icon if space is tight. |
| Tablet (640-1024px) | Reading plan cards: 2-column grid. Top bar: all right-side controls visible ("Genesis 1 ▾" + T + focus-mode toggle + other icons). Static chapter heading renders at full size. |
| Desktop (> 1024px) | Reading plan cards: 2-column grid (same as BB-51; do not change to 3-column or 4-column). Top bar has all controls grouped on the right with comfortable spacing. Edge-to-edge dark background verified at 1440px+ against the Daily Hub reference. |

Additional responsive notes:

- The static chapter heading in the reader body must not cause horizontal scrolling on mobile. Use the same `max-w-2xl mx-auto px-4` pattern as the verses below it.
- The right-side toolbar group on mobile may need to drop lower-priority icons (verse number toggle, etc.) to a secondary "more" menu if the right cluster overflows the viewport. Do NOT cover the dropdown or the T button — those are the two highest-priority controls.
- Reading plan card icons must remain visible at all breakpoints. On very narrow widths, the icon may shrink from 24px to 20px but must not be hidden.

## AI Safety Considerations

N/A — This spec does not involve AI-generated content or free-text user input. No crisis detection required. The existing AI Explain and AI Reflect features are untouched.

## Auth & Persistence

- **Logged-out users:** Can browse `/bible`, read chapters, use all personal-layer features (highlights, notes, bookmarks, memorization) via localStorage. Clicking in-app "My Bible" links opens the auth modal. Focus mode toggle works without auth. Notification prompt works without auth (permission is per-browser).
- **Logged-in users:** Full Bible experience including all BB-47 through BB-51 behaviors; no new gated features introduced here.
- **localStorage usage:** No new keys. Existing keys referenced:
  - `wr_bible_focus_enabled` — already read/written by the focus mode toggle; this spec changes the toggle's UI feedback, not the key semantics
  - `wr_notification_prompt_dismissed` — already written by the BB-41 prompt "Maybe later" action; this spec verifies the read-side persistence
  - `wr_push_subscription` — already written by the BB-41 "Enable" action; unchanged

No new localStorage keys, no key semantics changed. Nothing to document in `11-local-storage-keys.md`.

## Completion & Navigation

N/A — standalone polish feature. No completion tracking changes.

## Design Notes

- **Daily Hub visual reference is authoritative.** For Requirement 1, the target is the Daily Hub's DOM structure under `<body>` — `bg-hero-bg` on the root div, `HorizonGlow` atmospheric layer at `z-0`, transparent page content on top. Reference `09-design-system.md` § "Daily Hub Visual Architecture" and the existing DailyHub.tsx structure. The Bible routes must adopt the same three-layer structure, scoped to the Bible section.
- **HorizonGlow on Bible routes:** If the light purple rectangle behind "Your Study Bible" is from a misconfigured or overly-bright decorative gradient, either remove it entirely or replace it with the same `HorizonGlow` component used on the Daily Hub. Canonical HorizonGlow opacity values per `09-design-system.md`: 0.28–0.35 (low intensity, non-reference).
- **FrostedCard for reading plan cards:** Use the homepage `FrostedCard` + `DashboardPreviewCard` aesthetic — frosted glass, brighter top edge, colored icon to the left, subtitle in lighter weight. Reference `components/homepage/DashboardPreviewCard.tsx` for the exact styling to match.
- **Focus mode toggle icon:** `Eye` / `EyeOff` or `PanelTop` / `PanelTopClose` from Lucide. Whichever the implementer picks should give the ON and OFF states clear visual distinction. Use the `fast` (150ms) + `sharp` easing tokens from `constants/animation.ts` for the toggle transition.
- **Animation tokens:** All transitions in this spec must import from `frontend/src/constants/animation.ts` per BB-33 rules. Hover transitions on the reading plan cards use `base` (300ms) + `standard` easing. Focus mode toggle state swap uses `fast` (150ms) + `sharp` easing. Button press feedback uses `active:scale-[0.98]` where applicable.
- **`GRADIENT_TEXT_STYLE`:** From `constants/gradients.tsx` — no change to heading treatment here; BB-51 already brought "My Bible" to full-line gradient. This spec only moves the existing heading's vertical position, not its style.
- **"My Bible" click interception pattern:** Follow the same pattern used by the Prayer Wall auth-gated actions and meditation card clicks. Check `isAuthenticated`, `event.preventDefault()` if logged out, call `openAuthModal({ title, message, onSuccess })` with `onSuccess: () => navigate('/bible/my')`.

## Out of Scope

- Real authentication (Phase 3 — current auth is simulated)
- Backend sync for personal-layer data (Phase 3)
- Light mode (Phase 4)
- BibleReader theme changes (midnight / parchment / sepia remain as-is)
- Audio player changes (BB-26-29 wave is separate)
- New features or new pages — this is pure polish
- Changing the default of `wr_bible_focus_enabled` (BB-51 set it to `'false'`; this spec keeps it there)
- Re-styling of any cards outside the reading plan grid (Bible browser three-card grid, verse-of-the-day card, etc. remain as-is)
- Rewriting the BB-41 notification permission flow — only verifying the dismissal persistence
- Redesigning the focus mode idle timer logic — only fixing the toggle button feedback and icon

## Acceptance Criteria

- [ ] Bible browser page (`/bible`) background is visually identical to Daily Hub background treatment — edge-to-edge dark, no seam, no lighter rectangle, no visible container edge. Verified by side-by-side screenshot comparison at 1440px.
- [ ] Same visual parity achieved on `/bible/my` (both logged-out conversion card and logged-in full view), Reading Plans page, and Browse Books view.
- [ ] "Your Study Bible" heading is vertically positioned close to the navbar, matching "Good Morning!" positioning on Daily Hub (same `padding-top` / `margin-top` as Daily Hub's hero heading).
- [ ] No light purple box/rectangle visible behind the "Your Study Bible" hero section.
- [ ] Static book/chapter heading (e.g., "Genesis 1") is restored in the BibleReader passage area as a semantic heading tag (`<h1>` or `<h2>`), directly above the first verse.
- [ ] Chapter dropdown ("Genesis 1 ▾") is positioned on the RIGHT side of the top bar, grouped with the "T" (Typography) button and other settings icons. Left side contains only the "← Study Bible" back button.
- [ ] Top bar layout: `[← Study Bible]` on left, `[Chapter ▾] [T] [other icons]` on right. Verified at desktop and tablet breakpoints.
- [ ] Focus mode toggle provides immediate visual feedback when tapped — button appearance changes immediately (icon swap, color, or fill), and an inline hint ("Toolbar will auto-hide after inactivity") appears for ~2 seconds when toggling ON.
- [ ] Focus mode toggle icon communicates the feature clearly (not generic shrink/expand arrows). Uses `Eye`/`EyeOff` or `PanelTop`/`PanelTopClose` from Lucide, with distinct ON/OFF visual states.
- [ ] Focus mode toggle `aria-label` reflects the icon's purpose ("Enable focus mode (auto-hide toolbar)" when OFF, "Disable focus mode (keep toolbar visible)" when ON).
- [ ] Logged-out user clicking an in-app "My Bible" link (Bible browser three-card grid, navbar avatar dropdown, mobile drawer) sees the auth modal immediately with the message "Sign in to access your highlights, notes, and reading history." The URL does NOT change — user stays on the current page.
- [ ] After successful auth from the "My Bible" click path, user navigates to `/bible/my`.
- [ ] Logged-out user navigating directly to `/bible/my` via URL still sees the BB-51 conversion card (the fallback path is unchanged).
- [ ] Logged-in user clicking any "My Bible" link navigates to `/bible/my` normally (no modal).
- [ ] BB-41 "Never miss your daily verse" prompt does NOT re-appear after "Maybe later" is clicked. Verified by: click "Maybe later" → navigate to any other route → return to a BibleReader chapter → complete another reading session → prompt does not render.
- [ ] `wr_notification_prompt_dismissed` is set to `"true"` in localStorage after "Maybe later" is clicked and persists across page refreshes.
- [ ] Reading plan cards visually match the homepage dashboard preview cards — glassmorphic background (`bg-white/[0.03] backdrop-blur-sm` or whatever the dashboard preview cards render), brighter top edge, `border border-white/[0.08] rounded-xl`, hover state `hover:bg-white/[0.06] hover:border-white/20`.
- [ ] Each reading plan card has a colored Lucide icon to the left of the title (blue `BookOpen` for Psalms, amber `Star`/`Cross` for Jesus, teal `Heart` for Anxious, indigo `Moon` for Sleep, appropriate theme-matched icons for others).
- [ ] Each reading plan card has a subtitle line in `text-white/70 text-sm` below the title.
- [ ] Reading plan cards are in a 2-column grid on desktop and tablet, 1-column on mobile.
- [ ] All existing tests pass, with updates for: the restored static chapter heading, the moved dropdown position, the new focus mode toggle icon and `aria-label`, the "My Bible" click-triggers-modal behavior (not page navigation), and the reading plan card styling. If notification prompt behavior was already correct, no test update needed for that item.
- [ ] Keyboard navigation on "My Bible" auth-gated link works: `Tab` to the link → `Enter` or `Space` triggers the auth modal → modal receives focus → on close, focus returns to the triggering link.
