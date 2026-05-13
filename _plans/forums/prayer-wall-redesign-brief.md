# Brief: Prayer Wall Redesign (Side Quest)

**Status:** Side quest. NOT part of the official forums-wave spec tracker. No Phase 6 spec ID. Executes after 6.5 (Intercessor Timeline) merges.

**Working title:** Prayer Wall Redesign

**Origin:** Visual + structural problems observed in shipped 6.3 Night Mode + existing Prayer Wall layout. User-driven feedback session 2026-05-13.

**Size:** L (Large)

**Risk:** Medium (visual redesign of brand-defining surface; reducing shipped functionality; load-bearing layout change)

**Tier:** **xHigh** — brand-defining surface; reduces a previously-shipped feature (Night Mode palette); load-bearing 3-column layout introduces responsive complexity; categorization redesign touches feed-render path

**Prerequisites:**
- 6.5 (Intercessor Timeline) — must merge first; this side quest touches PrayerCard and PrayerWall.tsx layout where 6.5's IntercessorTimeline mounts
- 6.4 (3am Watch v1) — ✅ (Watch consumes useNightMode hook; this redesign preserves the hook, modifies its CSS effect only)
- 6.3 (Night Mode) — ✅ (shipped; this redesign reduces it)
- All Phase 6 specs through 6.5 — ✅ expected by execute time

**Pipeline:** This brief → `/spec-forums prayer-wall-redesign-brief.md` → `/plan-forums prayer-wall-redesign.md` → execute → review.

**Execution sequencing:** Execute AFTER 6.5 merges to master. Should NOT execute concurrently with any in-flight Phase 6 spec (touches the most-modified file in the wave: PrayerWall.tsx).

---

## 1. Branch Discipline

Branch: `forums-wave-continued` (continues the existing wave branch since this is a follow-on cleanup). Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase.

At execute-start, CC verifies via `git status` (read-only) that working tree is clean except for any pending redesign work.

Note: this brief is a SIDE QUEST. It does NOT appear in `spec-tracker.md`. Eric tracks completion manually. No tracker update at merge.

---

## 2. Tier — xHigh

xHigh tier is justified by four factors:

**Brand-defining surface.**
Prayer Wall is the highest-engagement surface in the app. Layout, color, and visual hierarchy decisions compound across every user session. A poor execution here degrades the app's spiritual tone globally.

**Reducing a shipped feature.**
Night Mode (6.3) shipped a CSS palette override that produced visually-broken output (brown gradient, transparent QOTD cards, palette conflict with existing dark theme). This redesign REMOVES that palette layer entirely while preserving the hook + chip + copy variants that DO work. Reducing shipped surface area is higher-risk than adding new surface area because users have adapted to the existing behavior — brief documents the reduction explicitly.

**Load-bearing layout change.**
Moving from single-column to 3-column on desktop is a significant restructure. Existing components (PrayerWall.tsx, navigation, QOTD widget) all have layout dependencies that need to be considered. The categorization bar redesign compounds this.

**Responsive complexity.**
Three breakpoints with different sidebar behaviors require careful testing across viewport widths. Easy to ship a layout that works at desktop but breaks at tablet, or vice versa.

**Practical execution implication:** xHigh tier means CC uses Opus 4.7 thinking `xhigh` for all phases. Eric reviews:
- The Night Mode reduction code (verify hook + chip + copy preserved; only CSS palette removed)
- 3-column layout responsive behavior at all three breakpoints
- Category bar redesign (left sidebar stacked list; horizontal chip row on mobile)
- Right sidebar contents (QOTD moved correctly; Local Support card content)
- Visual judgment on the final palette (no more brown; cohesive with existing dark theme)
- All new copy strings
- Manual responsive verification at ~1440px, ~1024px, ~768px, ~375px viewports

---

## 3. Visual & Integration Verification

### Desktop (≥1280px)

**3-column layout:**
- Left sidebar (240px wide, sticky on scroll): primary nav + category filters
- Center column (flexible, max ~720px): hero + Share Something CTA + Night Mode chip (relocated to header) + feed
- Right sidebar (280px wide, sticky on scroll): QOTD widget + Local Support promo + Community Guidelines card
- Total page max-width: ~1240px centered, with appropriate padding

**Visual checks:**
- No brown gradient anywhere — the existing cosmic-purple+stars background extends full page
- QOTD card has appropriate background opacity (not transparent; readable card surface)
- Share Something CTA renders above the Night Mode chip (positions swapped per user feedback)
- Night Mode chip is small, in the page header next to nav, NOT under the hero
- Hero text "Prayer Wall" + subtitle renders cleanly without competing visual elements

### Tablet (768px–1279px)

**2-column layout:**
- Left sidebar collapses to icon-only rail (~64px wide); category labels hidden, icons + tooltips remain
- Right sidebar hidden entirely; QOTD widget moves to top of center column above feed
- Local Support remains accessible via main nav only
- Community Guidelines does not appear (returning users have dismissed; new users see desktop)

### Mobile (<768px)

**Single-column layout:**
- Top nav as today (existing mobile pattern preserved)
- Hero + Share Something + Night Mode chip (chip moves to header area)
- QOTD widget inlined above feed (current mobile placement)
- Category chip row: single horizontal-scroll row, deduplicated, "All" first, post types + topics combined into one filter list (NOT two stacked rows)
- Feed
- Right sidebar contents (Local Support, Guidelines) NOT shown

### Night Mode behavior (after reduction)

**Daytime, any viewport:**
- Prayer Wall renders in the existing cosmic-purple+stars dark theme (which IS already nocturnal-feeling)
- NO `data-night-mode='on'` attribute applied even at 11pm
- Wait — incorrect. The hook still applies the attribute; CSS just doesn't override anything. Restate:
- Hook still applies `data-night-mode` attribute at appropriate hours (preserved for 6.4 Watch consumption)
- CSS rule for `[data-night-mode='on']` is REMOVED — attribute exists but has no visual effect
- Day/night copy variants STILL swap (subtle copy changes preserved)
- Night Mode chip in header STILL appears at night hours (with redesigned UX, see below)

**Night Mode chip redesign (smaller, header-located, no "always on" label):**
- Located in top-right of page header, next to user avatar/log-in
- Icon-first design: crescent moon icon + optional small label "Night"
- Tap to cycle preference: Off → Auto → On (icon state changes per state)
- NO "(always on)" parenthetical text ever
- Tooltip on hover (desktop): "Night Mode — [state]. Tap to change."
- Popover on tap-and-hold OR secondary tap: brief explainer of what Night Mode does ("Subtle late-night tone changes for the Prayer Wall.")

### Categorization (left sidebar on desktop, horizontal row on mobile)

**Desktop left sidebar (stacked vertical):**
- Section heading: "Filter posts"
- Subsection 1: "All posts" (active by default; visual highlight)
- Subsection 2 heading: "By type"
  - Prayer requests
  - Testimonies
  - Questions
  - Discussions
  - Encouragements
- Subsection 3 heading: "By topic"
  - Health
  - Mental Health
  - Family
  - Work
  - Grief
  - Gratitude
  - Praise
  - Relationships
- Active filter shows visual emphasis (background pill, brand purple accent)
- Multi-select supported? NO for v1. Single filter at a time. "All" deselects everything.

**Mobile horizontal row:**
- All filters in one scrollable row (deduplicated; "All" first, then all types + topics interleaved or in a sensible order)
- Horizontal scroll with momentum; no horizontal scroll bar visible (overflow-x: auto, hidden scrollbar)
- Active filter pill has the same brand-purple accent treatment

### Right sidebar contents (desktop only)

**QOTD widget (top):**
- Same content as today ("QUESTION OF THE DAY" label, question text, response count, "Share Your Thoughts" CTA, share icon)
- Width fits in 280px sidebar (text wrapping handled)
- Card background: opaque enough to be readable against the cosmic-purple background

**Local Support promo (middle):**
- Small card with title "Need someone to talk to?"
- Body: "Find a local church, counselor, or Celebrate Recovery group near you."
- CTA button: "Browse Local Support" linking to /local-support
- Tonally calm; not anxiety-inducing

**Community Guidelines (bottom, collapsed by default):**
- Header: "Welcome to Prayer Wall" with chevron to expand
- Body (when expanded): brief description of the space ("This is a place for prayer, honest conversation, and presence with one another. We keep it kind and real.")
- Dismiss link at bottom: "Got it (don't show again)"
- Dismissed state persists via `localStorage.wr_prayer_wall_guidelines_dismissed = 'true'`
- Dismissed users do not see this card on any future page load

### Manual verification by Eric after execute

- Load Prayer Wall at desktop width (~1440px); verify 3-column layout renders
- Resize browser to ~1024px; verify left sidebar collapses to icon rail, right sidebar disappears, QOTD moves to top of center
- Resize to ~375px; verify single-column with horizontal category chip row
- At 11pm local time, verify Night Mode chip still appears in header; verify hero subtitle still swaps to night variant ("It's quiet here. You're awake."); verify NO palette change (background looks the same as daytime)
- Tap Night Mode chip multiple times; verify it cycles Off → Auto → On with icon state changes; verify NO "(always on)" text
- Verify QOTD card is readable (not transparent)
- Verify Local Support card links correctly
- Tap "Got it" on guidelines card; refresh; verify card does not reappear
- Read all new copy aloud; verify nothing feels coercive or off-tone

## 4. Scope — What's In, What's Out

### In scope (v1 of redesign)

**Visual cleanup:**
1. Remove brown gradient from Prayer Wall (and any other page where it appears)
2. Remove `[data-night-mode='on']` CSS palette overrides in `index.css`
3. Fix QOTD card transparency (bump alpha on card background per D-QotdOpacity)
4. Swap positioning of Share Something CTA and Night Mode chip
5. Move Night Mode chip from under hero to page header (top-right area)

**Night Mode reduction:**
6. Preserve `useNightMode()` hook (6.4 dependency)
7. Preserve 8 day/night copy variant swaps
8. Redesign Night Mode chip: smaller, header-located, tap-to-cycle preference
9. Remove "(always on)" parenthetical label permanently
10. Add a `<NightModeBadge>` component (replaces the current `<NightWatchChip>` per D-ChipRename)
11. Update Settings page to reflect simplified preference UX

**3-column layout (desktop):**
12. Implement left sidebar (240px, sticky)
13. Implement right sidebar (280px, sticky)
14. Constrain center column to ~720px max-width
15. Wrap PrayerWall.tsx in a 3-column flex/grid container
16. Move primary nav into left sidebar on desktop (existing top nav stays for mobile)

**Right sidebar contents:**
17. Build `<QotdSidebar>` component (or relocate existing QOTD widget into sidebar slot)
18. Build `<LocalSupportPromo>` component
19. Build `<CommunityGuidelinesCard>` component with localStorage dismiss

**Category bar redesign:**
20. Dedup categorization (remove the doubled "All" row)
21. Move category filters from above-feed horizontal bars to left sidebar stacked list
22. Build `<CategoryFilters>` component for the left sidebar
23. On mobile, build horizontal-scroll chip row for categories (replaces stacked rows)

**Responsive behavior:**
24. Three breakpoints: ≥1280px (3-col), 768-1279px (2-col), <768px (1-col)
25. Tablet behavior: left sidebar icon rail, right sidebar hidden, QOTD inlined
26. Mobile behavior: full single-column, horizontal category chip row

### Out of scope (v1)

**Deferred to future side quest or never:**
- Multi-select categorization (single filter only for v1)
- Custom user-defined topics or saved filter sets
- Sidebar customization (which blocks appear, what order)
- A right-sidebar "trending" or "hot topics" widget (anti-metrics violation)
- A right-sidebar "active intercessors" or social-presence widget (anti-metrics)
- A right-sidebar scripture rotation card (separate concern; deserves its own design pass)
- Drawer-based mobile navigation (Reddit-style hamburger drawer); v1 uses existing top nav + horizontal chip row
- Persistent left-sidebar collapse preference (always full on desktop, always icon-rail on tablet)
- Recoloring the existing dark theme palette (brown removal only; cosmic-purple stays)
- Modifying the landing page or any non-Prayer-Wall surfaces

**Permanently not in this redesign:**
- Anything that adds engagement metrics or social comparison
- AI-generated content recommendations in sidebars
- Notification badges on sidebar items (creates urgency anti-pattern)
- Animated/auto-rotating sidebar content (visual noise on primary surface)

---

## 5. Decisions Catalog

14 design decisions for plan + execute.

**D-RemoveBrown: Remove the brown gradient entirely.**
The brown gradient observed in screenshots appears to come from a CSS background-color or gradient layer applied somewhere in the PrayerWall.tsx component tree or its parent. Plan-recon (R1) finds the source. Execute removes it. The page background reverts to whatever the existing cosmic-purple+stars layer provides at the body or app-root level.

**D-RemovePaletteOverride: Remove `[data-night-mode='on']` CSS block.**
The block in `index.css` that overrides CSS variables under the night-mode attribute is deleted entirely. The attribute is still applied by the hook (for 6.4 Watch's benefit), but it has no visual effect. This is the load-bearing decision of the Night Mode reduction.

**D-PreserveHook: `useNightMode()` hook unchanged.**
6.4 Watch consumes the hook's `{active, source, userPreference}` shape. Hook implementation, signature, and behavior remain identical. Only the CSS effect of the resulting attribute is removed.

**D-PreserveCopyVariants: 8 day/night copy swaps preserved.**
The 8 pairs in `frontend/src/constants/night-mode-copy.ts` continue to work. Hero subtitle, compose-FAB tooltip, compose modal heading, empty feed state, compose placeholder, greeting card, page title, and the unchanged Pray reaction toast — all preserved.

**D-ChipRename: Component renamed `NightWatchChip` → `NightModeBadge`.**
The current name conflates "Night Mode" (6.3) with "Watch" (6.4). Brief rename eliminates that confusion. Old file gets a deprecation comment + re-export shim for one release cycle, then deleted in next cleanup.

The component's responsibilities also change: it becomes a HEADER badge with cycle-on-tap behavior, not an in-flow chip with a popover and breathing-glow animation. The breathing-glow is removed (it draws attention to a feature that no longer does much).

**D-ChipPosition: Top-right of page header, next to user avatar / log-in.**
Not under the hero. Not in the feed. The chip is an indicator of state, not a feature affordance — belongs with other state indicators (user account state, etc.).

On mobile, chip sits in the existing top nav area, sized to fit.

**D-ChipCycle: Tap cycles Off → Auto → On → Off.**
No dropdown, no popover required for the basic state change. Tap-and-hold OR secondary tap ("i" icon next to chip?) opens explainer popover. Plan-recon (R3) picks the exact discoverability mechanism for the explainer.

Icon states:
- Off: outlined moon icon, no fill
- Auto: half-filled moon icon
- On: solid moon icon

Label beside icon (desktop only, optional): blank when Off, "Auto" when Auto, "On" when On. NO "(always on)" verbose text ever.

**D-LayoutMechanism: CSS Grid for the 3-column desktop layout.**
PrayerWall.tsx wraps content in a `<div class="prayer-wall-grid">` with `display: grid; grid-template-columns: 240px 1fr 280px;` at desktop. At tablet, columns become `64px 1fr` (right sidebar removed). At mobile, columns become `1fr` (everything stacks).

Not Flexbox: grid handles the sticky-sidebar + scrolling-center pattern more cleanly. Not a third-party layout library (overkill for one-page restructure).

**D-Breakpoints: 1280 / 768 fixed.**
```css
/* Mobile-first base */
.prayer-wall-grid { grid-template-columns: 1fr; }

@media (min-width: 768px) {
  .prayer-wall-grid { grid-template-columns: 64px 1fr; }
  /* left rail collapses to icons; right hidden */
}

@media (min-width: 1280px) {
  .prayer-wall-grid { grid-template-columns: 240px 1fr 280px; }
  /* full 3-column */
}
```

No intermediate breakpoint. Two transitions cover all common viewport widths.

**D-StickyBehavior: Sidebars use `position: sticky` with `top: 64px` (below site header).**
Sidebars remain visible as user scrolls the feed. On viewports too short to fit the sidebar content (rare on desktop, common on landscape tablets), sidebars scroll independently inside their column using `overflow-y: auto`.

Center column scrolls naturally with the page.

**D-QotdOpacity: QOTD card background uses `rgba(...)` with alpha ~0.85.**
The current transparency is too low (background bleeds through, hurts readability). Plan-recon (R4) verifies the exact CSS variable in use and the new alpha value. Card should look like a distinct surface, not a watermark.

**D-CategorySingleSelect: Single filter at a time.**
Tap a filter → it becomes active; previous active filter is deselected. "All" deselects everything (shows full feed).

Multi-select is appealing but adds significant complexity (combined query semantics, visual state for multiple actives, "clear all" affordance). Out of scope for v1. If user feedback shows demand, future side quest can add.

**D-CategorySidebarOrder: All → By type → By topic.**
Left sidebar on desktop:
1. "All posts" (single filter)
2. "By type" subsection heading
3. Five type filters
4. "By topic" subsection heading
5. Eight topic filters

On mobile, the horizontal chip row interleaves but starts with "All" first. Types come before topics in the scroll order (most-used first).

**D-GuidelinesDismissPersistence: localStorage flag, browser-local.**
New key: `wr_prayer_wall_guidelines_dismissed` (boolean string `'true'`). Dismissed state persists per-browser, NOT per-account (no server roundtrip for a UX-only flag). User who switches devices sees the card again on the new device — acceptable for this v1.

Future spec could move this to the dual-write settings storage if user feedback shows the device-specific persistence is annoying.

**D-LocalSupportCopy: Authored inline.**
- Title: "Need someone to talk to?"
- Body: "Find a local church, counselor, or Celebrate Recovery group near you."
- CTA: "Browse Local Support" → links to `/local-support`

Intentionally framed as "if you need this, it's here" rather than "you should do this." Same harm-reduction philosophy as 6.4's crisis banner.

**D-GuidelinesCopy: Authored inline.**
- Collapsed header: "Welcome to Prayer Wall"
- Expanded body: "This is a place for prayer, honest conversation, and presence with one another. Posts can be public, friends-only, or anonymous. We keep it kind and real."
- Dismiss link: "Got it (don't show again)"

**D-NoNewMobileNav: Existing top nav stays.**
Do NOT introduce a drawer / hamburger / off-canvas pattern in v1. Mobile uses the current top nav and horizontal category chip row. The category chip row replaces the existing stacked filter rows; nothing else changes on mobile primary navigation.

This decision avoids the accessibility + interaction cost of building drawer UX for marginal user benefit. The existing top nav works.

---

## 6. Recon Ground Truth

Verified on disk during brief recon (R1-R2) or flagged for plan-time recon (R3-R6).

**R1 — PLAN-RECON-REQUIRED: Source of the brown gradient.**
Plan greps the codebase for `linear-gradient`, `radial-gradient`, and any `background` rule mentioning brown-ish colors (`#3d2e` / `#4a3a` / `#2e2419` / brown / sepia / etc.) in:
- `frontend/src/index.css`
- `frontend/src/pages/PrayerWall.tsx` (inline styles or className)
- Any CSS module imported by PrayerWall
- `frontend/src/styles/` (if it exists)

Likely candidates: the `[data-night-mode='on']` block in index.css applied a brown body gradient; OR a wrapper component applies it inline; OR a global background layer. Plan identifies the exact source and removes it.

If the brown is part of the Night Mode CSS override block, removing the block per D-RemovePaletteOverride also fixes this. Plan-recon confirms.

**R2 — PLAN-RECON-REQUIRED: Existing top-nav structure.**
Plan reads the current top-nav component (likely `frontend/src/components/layout/TopNav.tsx` or similar) to understand:
- Where the Worship Room logo + nav items render
- How user avatar / log-in state slot is structured (NightModeBadge mounts adjacent to this)
- Whether mobile + desktop share one component with responsive CSS, or fork into separate components
- How active-route highlighting works (need to preserve when moving primary nav to left sidebar on desktop)

Key decision plan must make: does the desktop left sidebar REPLACE the top nav (top nav hidden ≥ 1280px), or does the top nav stay as a thin header with sidebar adding ADDITIONAL nav surface? Recommend: top nav stays as thin header (logo + user state + NightModeBadge); left sidebar replaces only the route-link section. Avoids double-rendering of nav items.

**R3 — PLAN-RECON-REQUIRED: Discoverability mechanism for the chip explainer popover.**
Plan picks one of:
- (a) Tap-and-hold opens popover; single tap cycles preference
- (b) Secondary "i" icon next to chip opens popover; chip itself only cycles
- (c) First-time-only popover (auto-shown on first night-hour render, then dismissible)

Recommend (b): more discoverable (visible affordance), cleaner mobile interaction (no long-press gesture which is hard to discover and conflicts with browser default behaviors).

**R4 — PLAN-RECON-REQUIRED: QOTD card current CSS.**
Plan reads the QOTD widget's current CSS:
- Identify the background CSS variable in use
- Determine current alpha value
- Pick the new alpha (recommend `0.85` per D-QotdOpacity, but plan verifies against the actual card-background pattern used by other cards in the app for consistency)

If other cards in the app use a higher alpha (e.g., 0.95), QOTD should match. Consistency wins over the specific number.

**R5 — PLAN-RECON-REQUIRED: Current Settings page Night Mode toggle UX.**
Plan reads `Settings.tsx` (or wherever the Night Mode preference is currently editable) to determine:
- Current UX (radio group, dropdown, etc.)
- Where in the settings hierarchy it lives (likely a general appearance section or its own section)
- Whether to keep the existing Settings UX as the canonical preference editor (and chip is just a status indicator + quick-cycle shortcut) or remove Settings UX entirely (chip becomes only edit surface)

Recommend: keep Settings as the canonical edit surface (descriptive labels per option, room for explanatory text). Chip is a shortcut. Both write to the same `useSettings()` state.

**R6 — PLAN-RECON-REQUIRED: Existing CSS variable names.**
Plan reads `index.css` to identify the existing CSS custom property names used for:
- Backgrounds (`--bg`, `--bg-card`, `--bg-surface`, etc.)
- Text colors (`--text`, `--text-muted`, etc.)
- Accent / brand colors (`--accent`, `--brand-primary`, etc.)

New components (QotdSidebar, LocalSupportPromo, CommunityGuidelinesCard, CategoryFilters, NightModeBadge) reuse existing variables. Do NOT introduce parallel naming.

---

## 7. Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase) | **N/A.** | No DB changes. |
| Gate-2 (OpenAPI) | **N/A.** | No API changes. |
| Gate-3 (Copy Deck) | **Applies.** | Local Support copy, Guidelines copy, NightModeBadge labels, Settings descriptions in Copy Deck. |
| Gate-4 (Tests) | **Applies.** | ~15-20 tests (responsive behavior, dismiss persistence, chip cycle, palette removal verification). |
| Gate-5 (Accessibility) | **Applies (HARD).** | Sidebar navigation requires careful a11y; sticky elements + keyboard navigation; reduced-motion. |
| Gate-6 (Performance) | **Applies.** | Layout shift on responsive transitions must be minimal; sticky sidebars must not jank scroll. |
| Gate-7 (Rate limiting) | **N/A.** | No endpoints. |
| Gate-8 (Respect patterns) | **Applies (HARD).** | Reuse useSettings, useNightMode, existing CSS variables, existing card components. |
| Gate-9 (Plain text) | **Applies.** | All sidebar copy is plain text + links. No markdown. |
| Gate-10 (Crisis supersession) | **N/A.** | No crisis content surface. |

**New gates specific to this redesign:**

**Gate-G-NO-METRICS-IN-SIDEBARS (HARD).**
The right sidebar contains QOTD + Local Support + Guidelines ONLY. No engagement counters, no "trending," no leaderboards, no presence indicators ("5 people online"), no badges. Code review hard-blocks any sidebar widget that surfaces metrics about user activity.

Left sidebar contains nav + category filters ONLY. No engagement counters per category ("23 new today"). Filters show category names, not counts.

**Gate-G-RESPONSIVE-VERIFIED (HARD).**
Responsive behavior verified at four explicit viewport widths via Playwright screenshots in PR:
- 1440px (desktop, full 3-col)
- 1024px (tablet, 2-col with icon rail)
- 768px (tablet boundary, 2-col)
- 375px (mobile, single column with chip row)

No "works on my machine" approvals. Screenshots in PR or it didn't ship.

**Gate-G-PRESERVE-NIGHT-MODE-HOOK (HARD).**
The `useNightMode()` hook public API is unchanged. Specifically:
- Function signature unchanged: `useNightMode(): { active, source, userPreference }`
- Return shape unchanged
- `data-night-mode` attribute STILL applied at appropriate hours (6.4 Watch depends on this)
- The 8 day/night copy variants STILL swap at appropriate hours

Code review verifies all hook-consuming code paths continue to work. Especially 6.4's `useWatchMode()` which composes `useNightMode()`.

**Gate-G-A11Y (HARD).**
MUST cover:
- Left sidebar nav: `<nav>` element with `aria-label="Primary navigation"`
- Category filters: `<nav>` with `aria-label="Filter prayer wall posts"`; each filter is a `<button>` with `aria-pressed` reflecting active state
- Right sidebar: each block is a `<section>` with `aria-labelledby` pointing to its heading
- Guidelines card dismiss button: `<button>` with `aria-label="Dismiss community guidelines card"`
- NightModeBadge: `<button>` with `aria-label="Night Mode is [state]. Tap to change."`; `aria-live="polite"` announcement on state change
- Sticky sidebars: do NOT trap focus; tab order is left sidebar → center column → right sidebar in natural source order
- Reduced motion: chip icon state transitions are instant (no animation); sidebar transitions on viewport change are instant
- Axe-core passes zero violations at all four viewport widths
- Keyboard-only navigation works through all sidebar content + filters + chip + dismiss buttons

---

## 8. Watch-fors

~26 items.

### Night Mode reduction (preserve what works, kill what doesn't)
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: `useNightMode()` hook public API is unchanged. Function signature, return shape, attribute application all preserved.
- W3: `data-night-mode` attribute STILL applied to PrayerWall root at night hours. CSS that consumes it is removed; the attribute itself stays for 6.4 Watch's benefit.
- W4: The 8 copy variant pairs in `night-mode-copy.ts` continue to swap. Plan-recon verifies file is not deleted.
- W5: 6.4 Watch's `useWatchMode()` hook still composes `useNightMode()` correctly. Integration test verifies.
- W6: Settings page Night Mode preference UX continues to function. Same preference values persist via same mechanism.
- W7: NightWatchChip component file gets a deprecation shim (re-export from NightModeBadge for one cycle), NOT deleted in this spec. Future cleanup spec deletes.
- W8: NO "(always on)" parenthetical text appears ANYWHERE in the codebase after this redesign. Grep verifies.
- W9: The chip's breathing-glow animation is removed. Reduced-motion users were unaffected by it; standard-motion users get a cleaner header.

### Visual cleanup
- W10: Brown gradient is removed from ALL surfaces, not just Prayer Wall. Plan-recon (R1) checks other pages.
- W11: QOTD card has visible card surface against the cosmic-purple background. No more watermark-transparent look.
- W12: Share Something CTA is above Night Mode chip in the visual flow. Chip moves to header; CTA stays in hero.
- W13: Cosmic-purple+stars background remains intact. Brief is NOT changing the base dark theme — only removing the brown layer.

### 3-column layout
- W14: Sticky sidebars do NOT cause horizontal scroll on any viewport. Test at 1280px boundary precisely.
- W15: Sticky sidebar `top` offset accounts for the existing site header height (likely 64px). Plan-recon (R2) confirms.
- W16: Center column max-width prevents text from spreading too wide on ultra-wide monitors. ~720px is the reading-ergonomics sweet spot for the feed.
- W17: Layout shift (CLS) on viewport-resize transitions is minimal. No content jumping between columns abruptly.
- W18: Sticky sidebars do not cover content on short viewports. `overflow-y: auto` inside the sticky container handles this.

### Category bar redesign
- W19: Doubled "All" row is removed. There is ONE "All posts" filter affordance, not two.
- W20: Active filter visual state is consistent across desktop sidebar list AND mobile chip row. Same brand-purple accent.
- W21: Single-select behavior: tapping a filter deselects any other active filter. "All posts" deselects everything.
- W22: Mobile horizontal chip row uses momentum scroll, hides scrollbar visually, scrolls smoothly with touch.
- W23: NO new category-level metrics surface (no "23 new today" badges per filter). Gate-G-NO-METRICS-IN-SIDEBARS.

### Right sidebar contents
- W24: QOTD widget in right sidebar functions identically to current QOTD widget (same data, same CTA, same share action). Only the visual location changes.
- W25: Community Guidelines dismiss persists via localStorage. Verified across page refresh and across the same browser session restart.
- W26: Local Support card link works correctly and routes to `/local-support`.

### Accessibility
- W27: All sidebar nav uses semantic `<nav>` elements with appropriate `aria-label`s.
- W28: Keyboard-only navigation through sidebars works. Tab order is natural source order.
- W29: Reduced-motion accommodation: chip cycle has no animation; sidebar transitions are instant.

### Brand voice
- W30: All new copy (Local Support card, Guidelines card, NightModeBadge labels) passes Eric's voice review. No coercive language, no urgency framing, no engagement-coded phrasing.

---

## 9. Test Specifications

~18 tests total.

### Frontend unit tests (~3)
- `useNightMode()` public API unchanged: returns `{active, source, userPreference}` with same shape post-redesign. (Regression test for Gate-G-PRESERVE-NIGHT-MODE-HOOK.)
- `NightModeBadge` cycle logic: tapping cycles preference Off → Auto → On → Off and writes to `useSettings()`.
- `CommunityGuidelinesCard` dismiss: tapping "Got it" writes `'true'` to `localStorage.wr_prayer_wall_guidelines_dismissed`; component returns null on subsequent render.

### Frontend integration tests (~6)
- PrayerWall at desktop width renders 3-column grid; left sidebar contains nav + categories; right sidebar contains QOTD + Local Support + Guidelines.
- PrayerWall at tablet width: left collapses to icon rail; right is hidden; QOTD inlines at top of center column.
- PrayerWall at mobile width: single column; categories render as horizontal chip row; right sidebar contents not rendered.
- Category filter behavior: tapping "Prayer requests" filters feed to type=PRAYER_REQUEST; tapping "All posts" clears filter; tapping "Mental Health" replaces previous active filter (single-select).
- `useNightMode()` still applies `data-night-mode='on'` attribute at night hours after redesign (regression test for Gate-G-PRESERVE-NIGHT-MODE-HOOK).
- Day/night copy variants still swap at appropriate hours (regression test for D-PreserveCopyVariants).

### Frontend behavioral tests (~3)
- After dismissing Guidelines card, refreshing the page does NOT re-show it.
- After dismissing Guidelines card, clearing localStorage and refreshing DOES re-show it.
- After tapping NightModeBadge to cycle to "On", the chip icon updates to solid moon and the `aria-label` updates accordingly (live announcement to screen readers).

### Playwright E2E (~4)
- **Visual snapshot at 1440px:** Full 3-column layout renders correctly; no brown gradient anywhere; QOTD card visible in right sidebar with readable contrast.
- **Visual snapshot at 1024px:** 2-column with icon rail + hidden right sidebar; QOTD inlined at top of center.
- **Visual snapshot at 375px:** Single column with horizontal category chip row; no sidebars rendered.
- **Night-state at 11pm via mocked clock at desktop width:** Verify chip is in header (NOT under hero); verify chip shows current preference state without "(always on)" text; verify hero subtitle is night variant; verify NO palette change (background still cosmic-purple, not brown).

### Accessibility tests (~2)
- Axe-core scan at all four breakpoints (1440 / 1024 / 768 / 375): zero violations.
- Keyboard-only navigation traversal: Tab through left sidebar nav → categories → center column content → right sidebar content; verify natural tab order; verify all interactive elements focusable.

---

## 10. Files

### To CREATE

**Components:**
- `frontend/src/components/prayer-wall/NightModeBadge.tsx` — the redesigned chip per D-ChipRename + D-ChipPosition + D-ChipCycle
- `frontend/src/components/prayer-wall/__tests__/NightModeBadge.test.tsx` — unit + integration tests
- `frontend/src/components/prayer-wall/QotdSidebar.tsx` — right-sidebar wrapper for existing QOTD widget (or relocates existing widget)
- `frontend/src/components/prayer-wall/__tests__/QotdSidebar.test.tsx` — tests
- `frontend/src/components/prayer-wall/LocalSupportPromo.tsx` — per D-LocalSupportCopy
- `frontend/src/components/prayer-wall/__tests__/LocalSupportPromo.test.tsx` — tests
- `frontend/src/components/prayer-wall/CommunityGuidelinesCard.tsx` — per D-GuidelinesCopy + D-GuidelinesDismissPersistence
- `frontend/src/components/prayer-wall/__tests__/CommunityGuidelinesCard.test.tsx` — tests
- `frontend/src/components/prayer-wall/CategoryFilters.tsx` — left sidebar stacked list + mobile chip row per D-CategorySidebarOrder + D-CategorySingleSelect
- `frontend/src/components/prayer-wall/__tests__/CategoryFilters.test.tsx` — tests
- `frontend/src/components/prayer-wall/PrayerWallLeftSidebar.tsx` — left sidebar container (composes primary nav + CategoryFilters)
- `frontend/src/components/prayer-wall/PrayerWallRightSidebar.tsx` — right sidebar container (composes QotdSidebar + LocalSupportPromo + CommunityGuidelinesCard)
- `frontend/tests/e2e/prayer-wall-redesign.spec.ts` — Playwright responsive + visual tests

### To MODIFY

- `frontend/src/pages/PrayerWall.tsx` — wrap content in 3-column CSS grid; mount sidebars; relocate Share Something CTA + Night Mode chip per D-RemoveBrown + position swaps
- `frontend/src/pages/Settings.tsx` — update Night Mode preference UX to drop "(always on)" labeling; align Settings UX with chip cycle semantics (Off / Auto / On)
- `frontend/src/index.css` — remove `[data-night-mode='on']` block (D-RemovePaletteOverride); remove brown gradient layer (D-RemoveBrown); add `.prayer-wall-grid` responsive rules (D-LayoutMechanism + D-Breakpoints); fix QOTD card opacity (D-QotdOpacity)
- `frontend/src/components/prayer-wall/NightWatchChip.tsx` — add deprecation comment + re-export from NightModeBadge per W7. Mark for deletion in future cleanup spec.
- The existing top-nav component (plan-recon R2 identifies path) — add NightModeBadge mount point in user-state slot
- `.claude/rules/11-local-storage-keys.md` — document `wr_prayer_wall_guidelines_dismissed` semantics

### NOT to modify (explicit non-targets)

- `frontend/src/hooks/useNightMode.ts` — PRESERVED per D-PreserveHook. NO modifications to public API, internal logic, or attribute application.
- `frontend/src/hooks/useWatchMode.ts` — PRESERVED. 6.4's Watch hook continues to work unchanged.
- `frontend/src/constants/night-mode-copy.ts` — PRESERVED per D-PreserveCopyVariants.
- `frontend/src/constants/watch-copy.ts` — PRESERVED (6.4 ownership).
- `frontend/src/components/prayer-wall/CrisisResourcesBanner.tsx` — PRESERVED (6.4 ownership).
- `frontend/src/components/prayer-wall/WatchIndicator.tsx` — PRESERVED (6.4 ownership).
- `frontend/src/components/prayer-wall/IntercessorTimeline.tsx` — PRESERVED (6.5 ownership; renders inside PrayerCard which renders inside center column).
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — NOT modified by this redesign. Card internals (6.1 Prayer Receipt button + 6.5 Intercessor Timeline + reactions + etc.) are untouched. The redesign moves the CONTAINER (PrayerWall.tsx) layout; the CARD itself is unchanged.
- Any backend code — NO server changes.
- Landing page, Daily Hub, Bible, Music pages — NOT modified. This redesign scopes to Prayer Wall only.

### To DELETE

None in v1. NightWatchChip stays as a deprecation shim for one release cycle (W7). Future cleanup spec deletes.

---

## 11. Acceptance Criteria

**Visual:**
- A. No brown gradient on Prayer Wall (or any other surface where it was bleeding through)
- B. QOTD card is readable (not transparent watermark)
- C. Share Something CTA appears above Night Mode chip in visual flow
- D. Night Mode chip is in page header (top-right), NOT under hero
- E. Cosmic-purple+stars background remains intact

**Night Mode reduction:**
- F. `useNightMode()` hook public API unchanged (regression test passes)
- G. `data-night-mode` attribute still applied at night hours (Gate-G-PRESERVE-NIGHT-MODE-HOOK)
- H. Day/night copy variants still swap (8 pairs preserved)
- I. `[data-night-mode='on']` CSS block removed entirely
- J. "(always on)" text removed from codebase (grep verifies)
- K. 6.4 Watch's `useWatchMode()` still functions correctly

**3-column layout:**
- L. Desktop ≥1280px renders 3-column grid with sticky sidebars
- M. Tablet 768-1279px renders 2-column with left icon rail + right hidden + QOTD inlined
- N. Mobile <768px renders single column with horizontal category chip row
- O. No horizontal scroll at any viewport width
- P. Center column max-width respected on ultra-wide monitors

**Category bar redesign:**
- Q. Duplicated "All" row removed; single filter list per D-CategorySidebarOrder
- R. Single-select behavior: tapping one filter deselects others
- S. Active filter visual state consistent across desktop sidebar AND mobile chip row
- T. "By type" and "By topic" subsections render with subsection headings

**Right sidebar:**
- U. QOTD widget renders in right sidebar with full functionality
- V. Local Support card renders with correct copy + working link to `/local-support`
- W. Community Guidelines card renders collapsed by default; expands on tap; dismiss persists

**Brand voice (Gate-G-COPY):**
- X. All new copy passes Eric's review (Local Support, Guidelines, NightModeBadge labels, Settings descriptions)

**Accessibility (Gate-G-A11Y):**
- Y. Axe-core passes zero violations at 1440, 1024, 768, 375px viewports
- Z. Keyboard-only navigation works through all sidebars
- AA. Reduced-motion accommodation honored
- BB. All sidebar regions have semantic `<nav>` or `<section>` with appropriate `aria-label`/`aria-labelledby`

**Anti-features (HARD):**
- CC. NO engagement metrics in sidebars (Gate-G-NO-METRICS-IN-SIDEBARS)
- DD. NO trending / hot / leaderboard widgets
- EE. NO category-level count badges ("23 new today")
- FF. NO drawer / hamburger mobile nav pattern (D-NoNewMobileNav)

**Regression:**
- GG. 6.1 Prayer Receipt still works
- HH. 6.4 Watch still works during Watch hours
- II. 6.5 Intercessor Timeline still renders inside PrayerCard
- JJ. All Phase 6 specs' UI surfaces continue to function

---

## 12. Out of Scope

Deferred to future side quest or never. (Repeated from Section 4 for canonical reference.)

### Deferred (future side quest may add)
- Multi-select categorization
- Persistent left-sidebar collapse preference per user
- Drawer-based mobile navigation
- Scripture rotation widget in right sidebar (separate design pass)
- Server-backed Guidelines dismissed flag (currently localStorage only; device-specific)
- Sidebar customization (which blocks appear, what order)
- Adding additional sidebar blocks (community stats, upcoming events, etc. — each requires explicit non-metrics rationale)
- Recoloring base dark theme palette
- Modifying landing page or non-Prayer-Wall surfaces

### Never
- Engagement metrics / leaderboards / social comparison in any sidebar
- AI-generated content recommendations
- Notification badges in sidebar nav (urgency anti-pattern)
- Auto-rotating sidebar carousel content
- Sponsored / promoted content in sidebars

---

## 13. Tier Rationale (closing)

**Why xHigh:** brand-defining surface; reducing shipped functionality (Night Mode palette); load-bearing 3-column layout change; responsive complexity across three breakpoints; the redesign sets the visual baseline for all of Phase 6's UX investments to land on.

**Why not MAX:** no crisis adjacency; no privacy stakes; no AI integration prohibitions; no backend changes; reversible if anything goes wrong.

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking xhigh
- plan-from-spec: xhigh (R1-R6 plan-recon must thoroughly find the brown-gradient source + CSS variable inventory + top-nav structure)
- execute: xhigh throughout, especially when modifying index.css (high blast radius) and PrayerWall.tsx (most-edited file in the wave)
- review: xhigh focus on responsive visual verification at all four widths, regression tests for useNightMode hook preservation, copy audits

---

## 14. Recommended Planner Instruction

```
Plan execution for the Prayer Wall Redesign side quest per
/Users/eric.champlin/worship-room/_plans/forums/prayer-wall-redesign-brief.md.

Tier: xHigh. Use Opus 4.7 thinking depth xhigh throughout.

This is a SIDE QUEST. It does NOT appear in spec-tracker.md. No tracker
update at merge.

Honor all 14 decisions, ~30 watch-fors, ~18 tests, and 5 new gates
(Gate-G-NO-METRICS-IN-SIDEBARS, Gate-G-RESPONSIVE-VERIFIED,
Gate-G-PRESERVE-NIGHT-MODE-HOOK, Gate-G-A11Y, plus existing Gate-3 + Gate-8
standard gates).

CRITICAL: D-PreserveHook is the load-bearing invariant. The `useNightMode()`
hook's public API MUST remain unchanged. Only the CSS effect of its
`data-night-mode` attribute is removed. 6.4 Watch depends on this hook.
Regression test verifies hook + Watch integration.

Required plan-time recon (R1-R6):
- R1: grep for source of brown gradient; identify exact CSS rule to remove
- R2: read existing top-nav component; pick whether to keep top nav as thin
  header or replace entirely with left sidebar at desktop
- R3: pick chip explainer popover discoverability mechanism (recommend
  secondary "i" icon)
- R4: read QOTD current CSS; pick new alpha value (consistency with other
  cards wins over the specific number)
- R5: read Settings.tsx current Night Mode UX; align with chip cycle
  semantics
- R6: inventory existing CSS variable names; new components reuse them

Plan-time divergences from brief: document in a Plan-Time Divergences
section. Visual/copy divergences require Eric's explicit chat sign-off
before execute.

Do NOT plan for execution while Spec 6.5 is running. 6.5 must merge first.
The plan can be authored at any time.

ALL new copy (Local Support card, Guidelines card, NightModeBadge labels)
in Section 5 is BRIEF-LEVEL CONTENT. Generate plan referencing verbatim.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**

1. Review code diff focusing on:
   - `index.css` changes (verify `[data-night-mode='on']` block fully removed; verify brown gradient source removed; verify new `.prayer-wall-grid` rules)
   - `useNightMode.ts` (verify NO changes; this hook must be untouched)
   - `PrayerWall.tsx` (verify 3-column grid wrapper; verify chip relocated to header)
   - `NightModeBadge.tsx` (verify cycle behavior; verify no "always on" text)
   - `CommunityGuidelinesCard.tsx` (verify localStorage dismiss persistence)

2. Load Prayer Wall at ~1440px in browser. Verify:
   - No brown gradient anywhere
   - 3-column layout renders
   - QOTD card readable in right sidebar (no transparency issue)
   - Share Something CTA above any Night Mode element in hero area
   - NightModeBadge in top-right header

3. Resize to ~1024px. Verify left sidebar collapses to icon rail; right sidebar disappears; QOTD inlines at top of center.

4. Resize to ~375px. Verify single column; horizontal category chip row above feed.

5. At 11pm local time (or via mocked clock):
   - Verify NightModeBadge still appears with correct state
   - Verify hero subtitle is night variant ("It's quiet here. You're awake.")
   - Verify NO brown / palette change — background stays cosmic-purple
   - Verify 6.4 Watch still functions if opted in (crisis banner, composer reminder, QOTD suppression)

6. Tap NightModeBadge multiple times. Verify it cycles Off → Auto → On → Off. Verify icon state changes. Verify NO "(always on)" text appears.

7. Tap Community Guidelines card to expand. Read copy aloud. Verify tone is calm + welcoming. Tap "Got it (don't show again)." Verify card disappears.

8. Refresh page. Verify Guidelines card does NOT reappear.

9. Open dev tools → Application → Local Storage. Verify `wr_prayer_wall_guidelines_dismissed: 'true'`. Delete the key. Refresh. Verify card reappears.

10. Tap Local Support promo CTA. Verify routes to `/local-support`.

11. Test category filters:
    - Tap "Prayer requests" → feed filters to prayer requests only
    - Tap "Mental Health" → feed filters to mental health (previous filter deselected)
    - Tap "All posts" → feed shows all posts again
    - Verify active filter visual state is consistent and obvious

12. Keyboard-only navigation: Tab through entire page. Verify natural tab order: left sidebar nav → categories → center column → right sidebar. Verify all interactive elements focusable. Verify Enter / Space activates each.

13. Run axe-core scan at all four breakpoints. Verify zero violations.

14. Visual judgment (the xHigh-tier call only Eric can make): does the new layout feel calmer, more readable, more cohesive than the pre-redesign Prayer Wall? Or did the layout overhaul introduce new problems (visual crowding, awkward proportions, brand drift)? If the latter, identify specific elements for revision before merge.

15. Read all new copy aloud. Verify no coercive / urgency / engagement-coded language.

**If all clean:** Eric commits, pushes, opens MR, merges to master. NO tracker update (side quest).

**If visual / brand-voice element feels wrong:** Halt merge. Discuss in chat. The redesign should feel like a calm exhalation, not a busier surface.

---

## 16. Prerequisites Confirmed

- **6.5 (Intercessor Timeline):** must merge first; this redesign touches PrayerWall.tsx and PrayerCard's rendering context where IntercessorTimeline mounts
- **6.4 (3am Watch v1):** ✅ (Watch consumes useNightMode hook; redesign preserves the hook)
- **6.3 (Night Mode):** ✅ (shipped; this redesign reduces it)
- **All Phase 6 specs through 6.5:** ✅ expected by execute time
- **Existing top-nav component:** ✅ (location verified via plan-recon R2)
- **Existing useSettings hook:** ✅ (NightModeBadge writes preference here)
- **Existing useNightMode hook:** ✅ (preserved unchanged)
- **Existing CSS variable system:** ✅ (reused, not parallel-named)

**Execution sequencing:**
Safest order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 → 6.4 → 6.5 → **Prayer Wall Redesign**. Should NOT execute concurrently with any in-flight Phase 6 spec (touches PrayerWall.tsx, the most-modified file in the wave).

After 6.5 merges to master:
- Rebase/merge `forums-wave-continued` onto master
- Eric reviews + approves all new copy (Local Support, Guidelines, NightModeBadge labels)
- Run `/spec-forums prayer-wall-redesign-brief.md` → generates spec file
- Run `/plan-forums prayer-wall-redesign.md` → generates plan file (with R1-R6 plan-recon)
- Eric reviews plan + verifies Night Mode hook preservation strategy
- Run `/execute-plan-forums YYYY-MM-DD-prayer-wall-redesign.md` → executes
- Eric reviews code via the 15-item verification checklist above
- Eric commits + pushes + MRs + merges
- NO tracker update (side quest)

**Post-merge:** Prayer Wall feels cohesive again. Phase 6 specs land on a clean visual baseline. Phase 7 work (if it materializes) inherits a working 3-column layout to build on.

---

## End of Brief
