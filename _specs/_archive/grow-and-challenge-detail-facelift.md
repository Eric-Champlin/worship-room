# Grow Page & Challenge Detail Facelift

**Master Plan Reference:** `_plans/grow-and-challenge-detail-facelift.md`
- Detailed implementation notes, code samples, and exact token recommendations live in the plan file.
- Use the plan as the authoritative source for HOW to implement; this spec defines WHAT must be true when complete.

**Status:** Draft
**Date:** 2026-04-17
**Scope:** `/grow` (both tabs) and `/challenges/:id` (upcoming, active, completed states)
**Recon sources:** `_plans/recon/daily-hub-recon.json`, `_plans/recon/grow-recon.json`, `_plans/recon/grow-recon-deep.json`, `_plans/recon/challenge-detail-pre-start.md`

---

## Overview

Visual polish and correctness pass on `/grow` and `/challenges/:id` to bring them into parity with the Daily Hub Round 3 visual language, fix an embarrassing pre-start Challenge Community UX bug (fabricated "Daniel S. completed Day 1 just now" activity on a challenge 37 days from starting), remove WCAG AA contrast failures on challenge category tags, and make the challenge detail hero render edge-to-edge like every other inner page. The feature serves the mission by removing friction and cognitive dissonance — a Lenten challenge showing fake activity, or a "Faith" cursive word clashing against the gradient Inter heading, quietly erodes trust in moments where users are trying to commit to a spiritual practice.

Two small shared primitives (`<Tabs>`, `<Button variant="light">`) are introduced here and used on `/grow` only. A central category color map (`CATEGORY_COLORS`) replaces the inline Tailwind palette classes scattered across `challenges.ts`. Other sites that could adopt these primitives are explicitly out of scope and tracked as follow-ups.

## User Story

As a **logged-out or logged-in visitor**, I want `/grow` and `/challenges/:id` to feel like the same product as `/daily` (same tabs, same white pill CTAs, same frosted card treatment, same full-bleed hero), to see honest Challenge Community state (waiting/active/completed — not fabricated activity), to read category tags without squinting, and to see a neutral "Starts in 37 days" rather than an alarming red countdown — so that **the Grow section reinforces the same calm, trustworthy sanctuary feel as the rest of the app**.

## Requirements

### Functional Requirements

**Part 1 — Grow Page (`/grow`):**

1. The hero heading renders "Grow in Faith" as a single Inter gradient heading — no Caveat accent on any word.
2. Tabs match Daily Hub: frosted pill container (`bg-white/[0.06]`, `border-white/[0.12]`, `rounded-full`), filled active tab with purple halo, inactive tab hover state, no width shift on switch, keyboard-accessible with proper ARIA roles.
3. A shared `<Tabs>` component is extracted to `@/components/ui/Tabs` and consumed by GrowPage. The component is standalone (no page-specific imports) so future sites can adopt it.
4. The "Create Your Own Plan" card uses canonical FrostedCard treatment (`bg-white/[0.06]`, `border-white/[0.12]`, `rounded-2xl`, `backdrop-blur-sm`, dual purple+dark shadow) instead of the current flat purple-tinted banner. The inner sparkle icon retains its purple color (the icon is the semantic cue, not the card background).
5. Reading plan cards render emoji inline left of the title at matching font size (~18px), separated by ~12px gap — not stacked above with `text-4xl`.
6. Reading plan card "Start Plan" CTAs use the new `<Button variant="light">` — white pill matching Daily Hub's secondary action pattern — not a purple rectangle.
7. Reading plan cards in the same grid row render at equal heights (achieved via `flex flex-col h-full` + `mt-auto` on the button, not a hard min-height).
8. Reading plan cards use canonical FrostedCard hover states: bg lifts from 6% to 8%, border lifts from 12% to 20%.

**Part 2 — Challenge Cards (appear on both `/grow?tab=challenges` and cross-references):**

9. Next Challenge and Coming Up sections share a single card template with a `variant` prop (`hero` for Next Challenge — larger padding, `rounded-2xl`, 24px title; `grid` for Coming Up — standard padding, `rounded-xl`, 18px title). Both variants share background, border, blur, and the same inner anatomy.
10. Every challenge card (regardless of section) renders both `Remind me` and `View Details` buttons in consistent order. Next Challenge no longer lacks `View Details`.
11. All Coming Up cards in the same grid row render at the exact same pixel height.
12. Challenge card category icons (Flame, Star, Heart, etc.) render in `text-white/90` — not inherited from category color. The category association is communicated through the category tag, not the icon.
13. Action buttons use `<Button variant="light" size="sm">` — white pill matching Daily Hub, not glassmorphic secondary.

**Part 3 — Category Tags (accessibility):**

14. A central `CATEGORY_COLORS` map is created with WCAG AA compliant foreground colors at 12px over a FrostedCard background for all 5 categories (Pentecost, Advent, Lent, New Year, Easter). No category tag text passes below 4.5:1 contrast.
15. A `<CategoryTag category={...} />` component is the single rendering path for category tags. Inline color classes in `challenges.ts` are replaced with a `category: ChallengeCategory` string reference.
16. Hero overlay `themeColor` values move into the same map so per-challenge tinting behavior is preserved.

**Part 4 — Challenge Detail (`/challenges/:id`):**

17. The navbar on `/challenges/:id` is flat transparent (matching `/daily` and `/grow`) — not the opaque default `bg-hero-dark`. This is implemented via a new `transparentNav` prop on `<Layout>`; all other Layout consumers are unaffected (default `false`).
18. The hero h1 renders the full challenge title in a single Inter gradient — no `<span className="font-script">` accent on the last word. Supporting `titlePrefix`/`titleLastWord` split logic is removed.
19. The hero section renders full-bleed: its atmospheric background (radial red + purple gradient) extends edge-to-edge at all breakpoints. Hero content remains constrained to `max-w-4xl` inner container. Post-hero content (breadcrumb, CommunityFeed) remains at `max-w-2xl`.
20. The `CommunityFeed` component is state-aware with three distinct layouts:
    - **Upcoming** — shows reminder count ("N people waiting to start"), waiting copy with start date, and a reminder toggle CTA. No fabricated activity.
    - **Active** — renders the existing participant activity feed, scoped behind the `status === 'active'` guard. Includes live participant count if available.
    - **Completed** — shows total completion count with Award icon. No fabricated activity.
21. The "Pray for the community" link pointing to `/prayer-wall?filter=challenge` is removed from CommunityFeed entirely.
22. The "Starts in N days" countdown color scales with urgency:
    - ≤ 1 day → `text-red-400`
    - ≤ 7 days → `text-amber-300`
    - > 7 days → `text-white` (neutral, no alarm)

**Part 5 — Shared primitives:**

23. `<Button variant="light">` is added as a new variant: white background, `text-primary` foreground, rounded-full, 44px min-height, hover → `#f3f4f6`, focus ring inherited from base. Supports `asChild` for wrapping `<Link>`.
24. `<Layout>` accepts a `transparentNav?: boolean` prop that threads through to `<Navbar transparent={...} />`. Defaults to `false`.
25. Mock data in `challenges.ts` gains three new optional fields for CommunityFeed state: `remindersCount`, `activeParticipantsCount`, `completedCount`. Seed plausible values.

### Non-Functional Requirements

- **Accessibility:** WCAG AA contrast on all category tags at 12px (≥4.5:1). Lighthouse Accessibility ≥95 on `/grow?tab=challenges`. Keyboard navigation on tabs works via Tab/Enter/Space with visible focus ring. `aria-selected`, `role="tab"`, `role="tablist"`, `aria-controls` all present on the shared Tabs component. Icons inside action buttons are decorative (`aria-hidden="true"`); the button label carries meaning.
- **Performance:** No new network requests introduced. No bundle-size regression beyond the shared `Tabs.tsx` + `CategoryTag.tsx` + `categoryColors.ts` (estimated +2 KB gzip).
- **Visual parity tolerance:** ±2px per design system convention. Tabs on `/grow` must be visually indistinguishable from tabs on `/daily` — same pill container, same active fill + purple halo, same inactive hover behavior.
- **Reduced motion:** All new transitions respect `motion-reduce:transition-none`. No animation is introduced that would fall outside the BB-33 canonical token set.

## Auth Gating

This facelift does not change any auth behavior. All existing auth gates are preserved; the spec introduces no new gated actions.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|--------------------|
| Switch Grow tab | Works (view-only browse) | Works | N/A |
| Click "Start Plan" on reading plan card | Unchanged from current — preserved as-is | Unchanged | (existing copy preserved) |
| Click "Create Your Own Plan" | Unchanged from current | Unchanged | (existing copy preserved) |
| Click "View Details" on a challenge card | Navigates to `/challenges/:id` (public route) | Navigates to `/challenges/:id` | N/A |
| Click "Remind me" on a challenge card (in grid or CommunityFeed upcoming state) | Unchanged from current | Unchanged | (existing copy preserved) |
| Browse `/challenges/:id` | Works (public route) | Works | N/A |

If any of the "unchanged from current" handlers currently ship without auth gates and the plan implementation surfaces that fact, `/code-review` must flag it — but wiring new gates is **not** in scope for this spec.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Grow tabs stretch to full width of a narrow container (`max-w-xl`). Reading plan cards stack single column. Coming Up challenge cards stack single column (not `grid-cols-2`). Challenge detail hero is full-bleed; hero content stacks centered; action buttons wrap. CommunityFeed inner stays at `max-w-2xl` within the existing `px-4` gutter. |
| Tablet (640–1024px) | Grow tabs unchanged (still centered in `max-w-xl` pill). Reading plan cards in a 2-column grid. Coming Up challenge cards in `grid-cols-2`. Challenge detail hero padding expands (`sm:pt-36`, `sm:pb-12`). |
| Desktop (> 1024px) | Reading plan cards in 2-column grid (unchanged). Coming Up challenge cards in `grid-cols-2`. Challenge detail hero padding further expands (`lg:pt-40`). Hero background is full-bleed; hero text remains constrained to `max-w-4xl` inner container regardless of viewport. |

**Cross-breakpoint invariants:**
- Tabs on `/grow` never width-shift on switch (reserved transparent border on inactive tab).
- All category tag colors remain AA-compliant regardless of breakpoint (contrast is a function of card background, not viewport).
- Full-bleed challenge hero background extends to viewport edges at every breakpoint. Page root `bg-hero-bg` is only visible below the hero.
- Post-hero content (breadcrumb, CommunityFeed) stays at `max-w-2xl` at every breakpoint.

**Mobile-specific interactions:**
- Tab touch targets meet 44px minimum (`min-h-[44px]` on every tab button).
- Challenge card action buttons meet 44px touch targets via `size="sm"` → `min-h-[44px]`.
- Reminder toggle in CommunityFeed upcoming state is a 44px pill.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. The facelift changes visual presentation and fixes a state-handling bug; no user content pathways are modified.

## Auth & Persistence

- **Logged-out users:** All visual changes apply. Tab state is URL-driven (`?tab=plans`/`?tab=challenges`); no localStorage involved for tab state. Challenge reminders may be set client-side via the existing `wr_challenge_reminders` key (see `.claude/rules/11-local-storage-keys.md`); this spec does not introduce new persistence semantics.
- **Logged-in users:** Same as logged-out — the facelift does not change what gets persisted. Existing challenge reminder and reading plan progress behavior is preserved.
- **localStorage usage:** No new keys introduced. Existing `wr_challenge_reminders`, `wr_reading_plan_progress`, `wr_challenge_progress` unchanged.

## Completion & Navigation

N/A — this is a visual/behavior facelift on existing pages, not a Daily Hub tab. No new completion signals are emitted. The existing navigation structure (tab deep-links, `/challenges/:id` route, breadcrumbs) is preserved.

## Design Notes

**Reference patterns from `.claude/rules/09-design-system.md`:**
- FrostedCard tokens: `bg-white/[0.06]`, `border-white/[0.12]`, `rounded-2xl`, `backdrop-blur-sm`, dual purple+dark shadow `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`.
- Round 3 text color default: `text-white` for readable copy; muted opacities (`text-white/70`, `text-white/60`) only for secondary/meta.
- Gradient heading pattern: `GRADIENT_TEXT_STYLE` white-to-purple, Inter bold, no Caveat. Apply `pb-2` per BB-53 to clear gradient descenders.
- Daily Hub Pattern 1 (white pill secondary button): white bg, `text-primary`, rounded-full, 44px min-height, hover `bg-gray-100`.
- Daily Hub tab pattern: frosted pill container with filled active + purple halo shadow.
- BB-33 animation tokens: `duration-base` for transitions. No hardcoded `200ms` values.
- `ATMOSPHERIC_HERO_BG` + per-category `themeColor` overlay is the canonical inner-page hero pattern — preserve as-is.

**Reference recon files:**
- `_plans/recon/daily-hub-recon.json` — exact tab pill tokens and white pill button tokens to match.
- `_plans/recon/grow-recon.json`, `_plans/recon/grow-recon-deep.json` — current-state tokens and defect capture for `/grow`.
- `_plans/recon/challenge-detail-pre-start.md` — defect capture for `/challenges/:id` pre-start state.

**Existing components to reuse:**
- `<Button>` (`frontend/src/components/ui/Button.tsx`) — extend with `variant="light"`, do not create a parallel component.
- `<Navbar>` (already supports `transparent` prop per the design system) — thread through `<Layout>`.
- `ATMOSPHERIC_HERO_BG`, `GRADIENT_TEXT_STYLE` — reuse as-is.
- `FrostedCard` tokens — apply inline with matching classes rather than refactoring every card to the `<FrostedCard>` wrapper component; the plan file is explicit about inline class parity as the minimum bar.

**New patterns introduced:**
- Shared `<Tabs>` primitive — used on `/grow` only in this spec. Flagged as new pattern; subsequent adopters (AudioDrawer, LocalSupportPage, etc.) will migrate in follow-up specs.
- `<Button variant="light">` — white pill secondary variant. Values are copied directly from the Daily Hub recon so they are **verified**, not derived.
- `CATEGORY_COLORS` central map + `<CategoryTag>` component — new pattern. Foreground classes are tuned per-category to meet AA and must be verified with a contrast checker during implementation.
- `<Layout transparentNav>` prop — new prop, default `false`; no other Layout consumer is affected.
- State-aware `CommunityFeed` component — new internal pattern, not a reusable primitive.

## Out of Scope

- **`font-script` removal from other hero headings** — ~15 other files use `<span className="font-script">` on hero words (Settings, Insights, MonthlyReport, Friends, GrowthProfile, Routines, PrayerWallHero, SharedPrayer, SharedVerse, MilestoneCard, CreatePlanFlow, WorshipPlaylistsTab). A follow-up spec will batch these. Logo and intentional decorative uses (celebration overlays) remain.
- **Tab primitive migration for 7 other sites** — AudioDrawer, BooksDrawerContent, BoardSelector, ContentPicker, AvatarPickerModal, LocalSupportPage, DrawerTabs all have their own tab implementations. Migration requires per-site audit (scrollable-tab variants, etc.) and is its own spec.
- **Hero background system changes** — `ATMOSPHERIC_HERO_BG` + themeColor overlay is the canonical pattern; preserved as-is.
- **Breadcrumb placement** — site-wide convention, not touched here.
- **Prayer wall linkage cleanup** — if `/prayer-wall?filter=challenge` has no other referrers after the CTA removal, the Prayer Wall side cleanup is its own follow-up spec.
- **Reflection-question card style drift** — design-system doc vs code mismatch (`border-l-4 border-l-primary/60` vs `border-l-2 border-l-primary`) reconciled in a separate design-system audit.
- **Backend API work** — Phase 3 (Forums Wave) territory. CommunityFeed remains mock-data-driven in this spec.
- **New auth gates** — this spec preserves existing auth behavior; no new gates are wired.

## Acceptance Criteria

### Part 1 — Grow Page

- [ ] `/grow` hero renders "Grow in Faith" with zero `font-script` class instances anywhere in `GrowPage.tsx`. Entire heading is Inter, gradient-clipped via `GRADIENT_TEXT_STYLE`.
- [ ] `/grow` tabs render as a pill container (`rounded-full`, `bg-white/[0.06]`, `border-white/[0.12]`, `p-1`). Active tab has `bg-white/[0.12]` fill plus `shadow-[0_0_12px_rgba(139,92,246,0.15)]` purple halo. Inactive tab is `text-white/50` with `hover:text-white/80 hover:bg-white/[0.04]`.
- [ ] Switching between Grow tabs produces no horizontal width shift on either tab (verified via Playwright `offsetWidth` comparison before and after switch — delta ≤ 1px).
- [ ] Side-by-side Playwright screenshot of `/grow` tabs and `/daily` tabs at 1440px is visually indistinguishable (pill dimensions, fill opacity, halo glow, border all match within ±2px / ±2% opacity).
- [ ] Shared `<Tabs>` component exists at `frontend/src/components/ui/Tabs.tsx`, exports `Tabs` and `TabItem`/`TabsProps` types, and contains no page-specific imports.
- [ ] Tabs have `role="tablist"` on container, `role="tab"`, `aria-selected`, `aria-controls`, and `id` on each button. Keyboard Tab + Enter/Space activates tabs with visible purple focus ring.
- [ ] "Create Your Own Plan" card uses `bg-white/[0.06]`, `border-white/[0.12]`, `rounded-2xl`, `backdrop-blur-sm`, dual-shadow — no purple-tinted `bg-primary/[0.08]` background. Inner sparkle icon retains its purple color.
- [ ] Reading plan card emojis render at title font size (`text-lg` / ~18px), inline left of the title in a `flex items-center gap-3` row. No separate `text-4xl` emoji block above the title.
- [ ] Reading plan card emojis carry `aria-hidden="true"`.
- [ ] Reading plan card "Start Plan" buttons render as white pills (`bg-white`, `text-primary`, `rounded-full`, `min-h-[44px]`) — no purple rectangles.
- [ ] All reading plan cards in the same grid row render at equal heights (Playwright: `offsetHeight` of first two cards in a row match within 1px).
- [ ] Reading plan card hover state lifts bg from `0.06` to `0.08` and border from `0.12` to `0.20`.

### Part 2 — Challenge Cards

- [ ] Every challenge card (Next Challenge + Coming Up) renders both `Remind me` and `View Details` buttons in that order.
- [ ] All Coming Up cards in the same grid row have identical `offsetHeight` (Playwright assertion: first-two-cards delta ≤ 1px).
- [ ] Challenge card category icons render in `text-white/90` — the computed color has sufficient contrast against the card background (≥ 4.5:1).
- [ ] Action buttons on challenge cards use `<Button variant="light" size="sm">` — white pill, `text-primary`, `min-h-[44px]`.
- [ ] Next Challenge card is visually more prominent than Coming Up cards (hero variant has larger padding and `text-xl sm:text-2xl` title vs grid variant's `text-lg` title).
- [ ] Next Challenge description is NOT truncated. Coming Up descriptions are `line-clamp-2`.

### Part 3 — Category Tags

- [ ] `frontend/src/constants/categoryColors.ts` exists with 5 entries (pentecost, advent, lent, new-year, easter), each exposing `bgClass`, `fgClass`, `borderClass`, `themeColor`.
- [ ] `<CategoryTag category="advent" />` and all 4 other categories render readable text on a FrostedCard background: each tag passes ≥ 4.5:1 contrast at 12px (verified via axe DevTools or equivalent).
- [ ] No inline color classes for categories remain in `challenges.ts`. Every challenge record declares `category: ChallengeCategory`.
- [ ] Hero overlay themeColor on `/challenges/:id` is sourced from `CATEGORY_COLORS[category].themeColor` (unchanged visual behavior, just centralized source).
- [ ] Lighthouse Accessibility score on `/grow?tab=challenges` is ≥ 95 at 1440px.

### Part 4 — Challenge Detail

- [ ] `/challenges/:id` navbar renders at `position: absolute` / `bg-transparent` / no border (matching `/daily` and `/grow` visual state — flat transparent, not "liquid glass").
- [ ] `<Layout>` accepts `transparentNav` prop. All other existing `<Layout>` consumers verified unchanged (grep for `<Layout` — none should break).
- [ ] Challenge detail hero h1 renders the full title in a single Inter gradient. No `font-script` class. No `titlePrefix`/`titleLastWord` split logic remains in `ChallengeDetail.tsx`.
- [ ] Challenge detail hero background (radial red + purple) extends to full viewport width at 375px, 768px, 1024px, 1440px. Page root `bg-hero-bg` is visible only below the hero.
- [ ] Hero inner content stays centered in a `max-w-4xl` container. Post-hero content stays at `max-w-2xl`.
- [ ] CommunityFeed renders exactly one of three distinct layouts based on `status`:
  - [ ] **Upcoming** (e.g., Fire of Pentecost at 37 days out): shows reminder count, "Community activity will begin when the challenge starts on {date}" copy, reminder toggle CTA. NO activity rows. NO "Pray for the community" link.
  - [ ] **Active**: renders the existing participant activity feed with participant count; activity is scoped behind `status === 'active'`.
  - [ ] **Completed**: shows Award icon + completion count. NO activity rows.
- [ ] No "Pray for the community" text or `/prayer-wall?filter=challenge` URL exists anywhere in `CommunityFeed.tsx` or the challenge detail render path.
- [ ] Countdown color derives from days-until-start:
  - Days ≤ 1 → `text-red-400`
  - Days ≤ 7 → `text-amber-300`
  - Days > 7 → `text-white`
- [ ] Copy correctly pluralizes: "1 person is waiting" vs "N people are waiting"; "1 day" vs "N days"; "1 person" vs "N people participating".

### Part 5 — Shared Infrastructure

- [ ] `<Button variant="light">` exists as a new variant. Renders white bg, `text-primary`, `rounded-full`, `min-h-[44px]`, hover `bg-gray-100`. Focus-visible: 2px purple ring with offset.
- [ ] `<Button variant="light" asChild>` wrapping a `<Link>` renders correctly (styling applies to the child anchor).
- [ ] No other `<Button>` variant is visually changed.
- [ ] No hardcoded `200ms` / `cubic-bezier(...)` strings in new components — all transitions pull from `frontend/src/constants/animation.ts`.

### Cross-cutting visual verification

- [ ] Playwright comparison at 1440px and 375px on: `/grow?tab=plans`, `/grow?tab=challenges`, `/challenges/fire-of-pentecost` (upcoming), one seeded active challenge, one seeded past challenge. No "CLOSE" verdicts; tolerance ±2px.
- [ ] Manual keyboard-only pass on `/grow`: Tab enters tab list, Tab/Enter switches tab, focus ring is purple and visible, screen reader announces `role="tab"` and `aria-selected` state changes.
- [ ] Manual keyboard-only pass on `/challenges/:id` upcoming state: Tab reaches the reminder toggle CTA, Enter toggles the reminder state, copy updates without a page reload.
- [ ] Edge case: challenge with exactly 1 reminder renders "1 person is waiting" (not "1 people are waiting").
- [ ] Edge case: challenge starting tomorrow renders "1 day" in red (not "1 days").
- [ ] Edge case: Coming Up grid with an odd number of cards does not stretch the last card wider than siblings.
