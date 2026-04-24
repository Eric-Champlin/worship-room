# Implementation Plan: Grow Page & Challenge Detail Facelift

**Spec:** `_specs/grow-and-challenge-detail-facelift.md`
**Date:** 2026-04-17
**Branch:** `claude/feature/grow-and-challenge-detail-facelift` (current)
**Design System Reference:** `_plans/recon/design-system.md` — loaded (captured 2026-04-05)
**Recon Reports:** `_plans/recon/challenge-detail-pre-start.md` — loaded. `_plans/recon/grow-recon.json` — loaded. `_plans/recon/grow-recon-deep.json` — available. `_plans/recon/daily-hub-recon.json` — available for tab-parity values.
**Master Spec Plan:** not applicable — standalone facelift spec with a companion `_plans/grow-and-challenge-detail-facelift.md` code-sample reference file (the spec references it, not a master plan).

---

## Architecture Context

### Files that will change

| Path | Change |
|---|---|
| `frontend/src/components/ui/Tabs.tsx` | CREATE — shared pill-style tabs primitive |
| `frontend/src/constants/categoryColors.ts` | CREATE — central `CATEGORY_COLORS` map + `ChallengeCategory` type |
| `frontend/src/components/challenges/CategoryTag.tsx` | CREATE — single render path for category tags |
| `frontend/src/components/ui/Button.tsx` | MODIFY — add `variant="light"`, add `asChild` support |
| `frontend/src/components/Layout.tsx` | MODIFY — add `transparentNav?: boolean` prop |
| `frontend/src/pages/GrowPage.tsx` | MODIFY — remove `font-script`, swap underline tabs for shared Tabs |
| `frontend/src/pages/ReadingPlans.tsx` | MODIFY — Create-Your-Own-Plan card → FrostedCard + white pill CTA |
| `frontend/src/components/reading-plans/PlanCard.tsx` | MODIFY — emoji inline, white pill, equal-height flex column |
| `frontend/src/components/challenges/UpcomingChallengeCard.tsx` | MODIFY — equal-height, icon color, CategoryTag, white pill buttons |
| `frontend/src/components/challenges/NextChallengeCountdown.tsx` | MODIFY — add View Details, use CategoryTag, white pill, icon color, staged countdown urgency |
| `frontend/src/components/challenges/CommunityFeed.tsx` | REWRITE — state-aware (upcoming / active / completed) |
| `frontend/src/pages/ChallengeDetail.tsx` | MODIFY — `transparentNav`, full-bleed hero, remove `font-script`, countdown urgency, CommunityFeed wiring, `isCompletedChallenge` derived state |
| `frontend/src/data/challenges.ts` | MODIFY — add `remindersCount`, `activeParticipantsCount`, `completedCount` fields (Challenge type and all 5 records) |
| `frontend/src/types/challenges.ts` | MODIFY — add optional `remindersCount`, `activeParticipantsCount`, `completedCount` to Challenge interface |
| `frontend/src/components/challenges/__tests__/CommunityFeed.test.tsx` | MODIFY — rewrite tests for state-aware behavior, drop `/prayer-wall?filter=challenge` assertion |

### Key existing patterns

- **Daily Hub tabs (the target parity)** — `frontend/src/pages/DailyHub.tsx:244-291`. Pill container: `flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1`. Active tab: `bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]`. Inactive: `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`. Each button `min-h-[44px]`, `rounded-full`, `transition-all motion-reduce:transition-none duration-base`, `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`, `active:scale-[0.98]`. Arrow-key roving tabindex (Home/End/ArrowLeft/ArrowRight) — copy this logic.
- **`GrowPage` current tab logic** — `frontend/src/pages/GrowPage.tsx:17-77`. `TABS` constant, `switchTab` setter, `handleTabKeyDown` arrow-key handler, `tabButtonRefs`, sticky sentinel + IntersectionObserver. These keep working; only the visual treatment changes.
- **`<Layout>` contract** — `frontend/src/components/Layout.tsx`. Two modes: `hero` prop (renders `<Navbar transparent />` + hero + `<main max-w-7xl>`) and default (renders `<Navbar />` + `<main max-w-7xl py-8>`). `ChallengeDetail` uses default mode today (opaque nav). `hero` mode is OFF-PATH for this spec — we add a third option (`transparentNav` prop) rather than forcing ChallengeDetail through `hero={...}` (the hero layout gates `py-8` and constrains `<main>`, which breaks full-bleed).
- **`<Button>` contract** — `frontend/src/components/ui/Button.tsx`. Variants: `primary | secondary | outline | ghost`. Sizes: `sm | md | lg`. No `asChild` support, no `rounded-full`, no `min-h-[44px]` defaults (size=`sm` is `h-9`, `md` is `h-10`). **Adding `variant="light"` requires carrying `rounded-full` + `min-h-[44px]` into the variant (not the base or size tokens) to avoid changing existing variants.** Spec req 25 also requires `asChild` — we add a minimal implementation using `Slot` semantics via `React.cloneElement`-style composition (NOT pulling in Radix — the usage is limited to `<Button variant="light" asChild><Link /></Button>`).
- **Frosted glass card canonical classes** — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`. Hover lift: `hover:bg-white/[0.08] hover:border-white/20`. This matches `FrostedCard` component but spec req 149 explicitly allows inline class parity as the minimum bar.
- **Anti-fabrication guards on ChallengeDetail hero** — `ChallengeDetail.tsx:288` and `:296` both wrap in `{!isFutureChallenge && ...}`. **The existing pattern — guard community UI behind `isFutureChallenge` — is the template. CommunityFeed is the outlier; bringing it in line is the spec's top priority.**

### Test patterns in use

- **Vitest + React Testing Library**, `@testing-library/react` imports, `MemoryRouter` wrapper for any component containing a `<Link>`. See `frontend/src/components/challenges/__tests__/CommunityFeed.test.tsx` for the canonical pattern.
- **Provider wrappers** — CommunityFeed needs only `MemoryRouter` today. CategoryTag needs nothing. Layout and ChallengeDetail tests need `AuthModalProvider`, `ToastProvider`, `AudioProvider` (if audio hooks fire) — follow pattern in existing `frontend/src/pages/__tests__/ChallengeDetail.test.tsx`.
- **Test file naming** — `__tests__/<ComponentName>.test.tsx` co-located next to the component.
- **Imports** — `import { render, screen } from '@testing-library/react'`, `import { describe, it, expect } from 'vitest'`.

### Auth gating patterns

The spec preserves existing auth behavior (spec line 82–83). Auth modal triggers on reminder toggle (logged out), challenge day access (logged out), plan start (logged out), plan creation (logged out). These handlers are already in place in `ChallengesContent`, `ReadingPlansContent`, and `ChallengeDetail` — this spec does not rewire them. New components (`CategoryTag`, `Tabs`) are auth-agnostic.

---

## Auth Gating Checklist

Every action in the spec that requires login must have an auth check in the plan. Spec § "Auth Gating" explicitly says this facelift does not change any auth behavior. All handlers below are preserved as-is.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Start Plan" on reading plan card | Unchanged — preserved | Step 6 | Existing `handleStartOrContinue` in `ReadingPlans.tsx:108-132` — calls `authModal.openAuthModal(...)` when logged-out |
| Click "Create Your Own Plan" | Unchanged — preserved | Step 6 | Existing `handleCreatePlan` in `ReadingPlans.tsx:88-94` — calls `authModal.openAuthModal(...)` when logged-out |
| Click "Remind me" on challenge card (grid) | Unchanged — preserved | Step 7 | Existing `handleToggleReminder` in `Challenges.tsx:139-145` — calls `authModal.openAuthModal(...)` when logged-out |
| Click "Remind me" on CommunityFeed upcoming state | Unchanged — wired via existing `handleToggleReminder` in `ChallengeDetail.tsx:348-353` | Step 10 | Existing handler passed down through `onToggleReminder` — auth modal fires if logged out |
| Click "View Details" on a challenge card | Public route — no gate (spec line 90) | Step 7 | Navigates to `/challenges/:id`; no auth check |
| Switch Grow tab | Public — no gate (spec line 87) | Step 5 | `setSearchParams` — no auth check |
| Browse `/challenges/:id` | Public — no gate | Step 10 | No Layout auth wrapping added |

**Every existing auth gate handler is retained. No new gates wired. No gates removed.**

---

## Design System Values (for UI steps)

Values are sourced from `_plans/recon/daily-hub-recon.json`, `_plans/recon/grow-recon.json`, `_plans/recon/challenge-detail-pre-start.md`, and `.claude/rules/09-design-system.md`. All are **verified** against live pages.

### Tabs pattern (Daily Hub parity — target)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Tab pill container | classes | `flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1` | DailyHub.tsx:247 (verified in daily-hub-recon.json) |
| Active tab | classes | `bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]` | DailyHub.tsx:271 |
| Inactive tab | classes | `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent` | DailyHub.tsx:272 |
| Each tab button | classes | `flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all motion-reduce:transition-none duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:text-base active:scale-[0.98]` | DailyHub.tsx:268-269 |
| Tab wrapper (sticky) | classes | `sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none` + sticky-shadow `shadow-md shadow-black/20` | DailyHub.tsx:240-242 |
| Tab container | classes | `mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4` | DailyHub.tsx:244 |

### FrostedCard canonical treatment

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Card | background | `bg-white/[0.06]` | 09-design-system.md |
| Card | border | `border border-white/[0.12]` | 09-design-system.md |
| Card | blur | `backdrop-blur-sm` | 09-design-system.md |
| Card | radius | `rounded-2xl` | 09-design-system.md |
| Card | shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | 09-design-system.md |
| Card hover | bg lift | `hover:bg-white/[0.08]` | 09-design-system.md |
| Card hover | border lift | `hover:border-white/20` | 09-design-system.md |
| Coming Up grid card | radius override | `rounded-xl` (grid variant per spec req 9) | spec |
| Coming Up grid card | padding override | `p-6` | spec |
| Next Challenge hero card | radius | `rounded-2xl` | spec req 9 |
| Next Challenge hero card | padding | `p-6 sm:p-8` | NextChallengeCountdown.tsx:32 (existing) |
| Next Challenge title | font | `text-xl sm:text-2xl font-bold text-white` | NextChallengeCountdown.tsx:44 |
| Coming Up title | font | `text-lg font-bold text-white` | UpcomingChallengeCard.tsx:39 |

### White pill button (Daily Hub Pattern 1 — inline/secondary)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `Button variant="light"` | classes | `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]` | 09-design-system.md "White Pill CTA Patterns" Pattern 1 |
| `size="sm"` (when used with `variant="light"`) | override | `px-4 py-2 text-sm` (smaller for inline card actions) | spec req 13 |
| Disabled | classes | `disabled:cursor-not-allowed disabled:opacity-50` | carried from Button base |

### Hero atmospheric background (preserve — out of scope to change)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero section | backgroundColor | `#0f0a1e` | PageHero.tsx:10-14 |
| Hero section | backgroundImage | `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` | PageHero.tsx ATMOSPHERIC_HERO_BG |
| ChallengeDetail hero | backgroundImage override | `radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 0%, transparent 60%), <base>` | ChallengeDetail.tsx:203-206 (preserved, just sourced from CATEGORY_COLORS now) |
| Hero padding | classes | `px-4 pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` | ChallengeDetail.tsx:232 / GrowPage.tsx:93 |

### Gradient heading

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| h1 | classes | `mb-1 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2` | GrowPage.tsx:98 (existing) |
| h1 | inline style | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` | `constants/gradients.tsx:9-15` |
| h1 | background (computed) | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | Verified in grow-recon.json |

### Category tag colors (WCAG AA at 12px over FrostedCard on `#0f0a1e`)

| Category | bgClass | fgClass | borderClass | themeColor (hero overlay) | Contrast |
|---|---|---|---|---|---|
| pentecost | `bg-red-500/15` | `text-red-300` | `border-red-400/30` | `#DC2626` | ~7.1:1 [UNVERIFIED] |
| advent | `bg-violet-500/15` | `text-violet-300` | `border-violet-400/30` | `#7C3AED` | ~6.8:1 [UNVERIFIED] |
| lent | `bg-purple-500/15` | `text-purple-300` | `border-purple-400/30` | `#6B21A8` | ~7.4:1 [UNVERIFIED] |
| newyear | `bg-emerald-500/15` | `text-emerald-300` | `border-emerald-400/30` | `#059669` | ~6.9:1 [UNVERIFIED] |
| easter | `bg-amber-500/15` | `text-amber-200` | `border-amber-400/30` | `#D97706` | ~8.3:1 [UNVERIFIED] |

**[UNVERIFIED] Category tag contrast ratios:** Values in the spec were pre-computed but not cross-checked in this plan. Verification method: Run axe DevTools on `/grow?tab=challenges` after implementation (acceptance criterion in spec § "Part 3"). If any tag fails (<4.5:1), bump the foreground one step lighter (`text-*-300` → `text-*-200`).

**[UNVERIFIED] Easter themeColor bump:** Spec bumps Easter's hero overlay themeColor from `#92400E` to `#D97706` for hero visibility. No category currently uses `#92400E` for the hero — challenges.ts line 2137 Easter challenge uses `themeColor: '#FDE68A'` which is even lighter. The `getContrastSafeColor('#FDE68A')` helper in `constants/challenges.ts:38-41` currently maps `#FDE68A → #92400E` for tag text. Verification method: Check the `easter-joy-resurrection-hope` challenge record's inline themeColor and ensure the new `CATEGORY_COLORS.easter.themeColor = '#D97706'` produces a visible hero overlay; if the hero reads as washed-out, fall back to a brighter hex like `#F59E0B`.

### Countdown urgency scaling

| Days until start | Color class | Source |
|---|---|---|
| ≤ 1 day | `text-red-400` | spec req 22 |
| ≤ 7 days | `text-amber-300` | spec req 22 |
| > 7 days | `text-white` | spec req 22 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. **Caveat font is deprecated for headings — removing the two `<span className="font-script">` instances in `GrowPage.tsx` and `ChallengeDetail.tsx` is a core goal of this spec. Caveat remains only on the navbar logo.**
- Daily Hub Pattern 1 (white pill secondary) is: `bg-white text-primary rounded-full min-h-[44px] px-6 py-2.5 text-sm font-semibold hover:bg-gray-100`. This is the target for the new `Button variant="light"` and every challenge card action button and every reading-plan-card CTA in this spec. The purple-rectangle `bg-primary rounded-lg` pattern on PlanCard Start buttons is deprecated on this surface.
- Daily Hub tab pattern: frosted **pill** container with **filled active + purple halo shadow**, inactive with transparent reserved border to prevent width shift. **Underline-tab patterns (the current `/grow` look) are deprecated for top-level tabs.** The new shared `<Tabs>` primitive mirrors Daily Hub exactly.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. The `FrostedCard` component exists, but the spec explicitly allows inline class parity. Do NOT use the hand-rolled `bg-primary/[0.08]` banner pattern (current "Create Your Own Plan" card) — that's the deprecated light-theme card look.
- BB-33 animation tokens: import from `frontend/src/constants/animation.ts`. **Do NOT hardcode `200ms`, `300ms`, or `cubic-bezier(...)` strings.** Use `duration-fast`, `duration-base`, `motion-reduce:transition-none`.
- Full-bleed hero pattern: hero section is a direct child of `<Layout>`, NOT wrapped in `<main max-w-7xl>`. Post-hero content gets its own `<main class="mx-auto max-w-2xl px-4 sm:px-6">`. This is how `/grow` and `/daily` achieve the full-bleed atmospheric background.
- `transparentNav` is a NEW `Layout` prop in this spec. It defaults to `false`. **Every existing `<Layout>` caller must continue to work with no changes — verify via `grep "<Layout" src/**/*.tsx` after the Layout edit.**
- Inline-row layout verification: Challenge card action button rows (Remind me + View Details) must share a y-coordinate at ≥640px. A `flex-wrap` row with mismatched widths will silently break to row 2 and CSS-only tests won't catch it. Document expected y-alignment in each UI step and compare `boundingBox().y` in Playwright verification.
- Anti-fabrication is the load-bearing goal of Part 4: CommunityFeed must NEVER render fabricated activity when `status !== 'active'`. The guard must be at the component level (defense in depth), not just at the call site.
- Spec's `'new-year'` category key has been normalized to `'newyear'` in this plan to match the existing `ChallengeSeason` enum in `types/challenges.ts`. See Assumptions.
- All transitions in new components use BB-33 tokens. New tabs transition: `transition-all motion-reduce:transition-none duration-base` (matches Daily Hub). White pill buttons: `transition-colors motion-reduce:transition-none`.

---

## Shared Data Models (from Master Plan)

No master plan applies. Local data models introduced by this spec:

```typescript
// frontend/src/constants/categoryColors.ts
export type ChallengeCategory = 'pentecost' | 'advent' | 'lent' | 'newyear' | 'easter'

export interface CategoryColorTokens {
  bgClass: string
  fgClass: string
  borderClass: string
  themeColor: string  // hex for hero overlay tinting
}

export const CATEGORY_COLORS: Record<ChallengeCategory, CategoryColorTokens>
export const CATEGORY_LABELS: Record<ChallengeCategory, string>
```

```typescript
// frontend/src/types/challenges.ts — additions (all optional)
export interface Challenge {
  // ... existing fields
  remindersCount?: number           // Upcoming state: reminder count
  activeParticipantsCount?: number  // Active state: live participant count
  completedCount?: number           // Completed state: total finishers
}
```

```typescript
// frontend/src/components/challenges/CommunityFeed.tsx
export type ChallengeStatus = 'upcoming' | 'active' | 'completed'

export interface CommunityFeedProps {
  status: ChallengeStatus
  dayNumber: number
  challengeDuration: number
  remindersCount?: number
  activeParticipantsCount?: number
  completedCount?: number
  startDateLabel?: string
  hasReminder?: boolean
  onToggleReminder?: () => void
}
```

```typescript
// frontend/src/components/ui/Tabs.tsx
export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  badge?: ReactNode  // optional badge node (used by Grow's active-challenge pulse dot)
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  ariaLabel?: string
  className?: string
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_challenge_reminders` | Read/Write (unchanged behavior) | Existing — reminder IDs for CommunityFeed upcoming state. No schema change. |
| `wr_challenge_progress` | Read (unchanged) | Existing — challenge progress data. Not mutated. |
| `wr_reading_plan_progress` | Read (unchanged) | Existing — reading plan progress. Not mutated. |

**No new localStorage keys.** Confirmed against `.claude/rules/11-local-storage-keys.md`.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Grow tabs pill fits inside `max-w-xl` container with `px-4` gutter (container = ~343px wide). Reading plan cards stack single column. Coming Up challenge cards stack single column (grid-cols-1 at <640px). Challenge detail hero full-bleed; hero inner `max-w-4xl` effectively fills viewport. Action buttons wrap via `flex-wrap`. CommunityFeed inner `max-w-2xl` within `px-4`. |
| Tablet | 768px | Grow tabs still centered in `max-w-xl` pill. Reading plan cards in `sm:grid-cols-2`. Coming Up challenge cards in `sm:grid-cols-2`. Challenge detail hero padding `sm:pt-36 sm:pb-12`. |
| Desktop | 1440px | Reading plan cards `grid-cols-2` (unchanged). Coming Up challenge cards `grid-cols-2`. Challenge detail hero padding `lg:pt-40`. Hero background full-bleed to viewport edges; hero text centered in `max-w-4xl`. Post-hero `max-w-2xl`. |

**Cross-breakpoint invariants:**

- Tabs on `/grow` never width-shift on switch (reserved transparent border on inactive tab prevents the pixel push).
- Category tag contrast remains AA at every breakpoint (contrast is a function of card bg, not viewport).
- Full-bleed challenge hero background extends to viewport edges at every breakpoint.
- Post-hero content (breadcrumb, CommunityFeed) stays at `max-w-2xl` at every breakpoint.
- No new breakpoints introduced beyond Tailwind defaults (sm/md/lg).

**Mobile-specific interactions:**

- Tab touch targets: `min-h-[44px]` on every tab button (from shared Tabs primitive).
- Challenge card action buttons: `min-h-[44px]` carried by `Button variant="light"`.
- Reminder toggle in CommunityFeed upcoming state: `Button variant="light" size="sm"` = 44px pill.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Grow tab bar | "Reading Plans" button, "Challenges" button (+ optional active-challenge pulse dot) | Same y ±2px at 1440px, 768px, and 375px | Tabs never wrap — if pill width exceeds container, horizontal overflow is acceptable but spec prefers `max-w-xl` container always fits both tabs at ≥375px. |
| Reading plan card header | Emoji `<span>` + `<h3>` title | Same y ±2px at 1440px and 768px | Wrapping allowed at <400px only if title exceeds 2 lines — emoji must stay on row 1. |
| Coming Up challenge card header | Icon + title + CategoryTag | Same y ±5px (vertical alignment is visual, tag sits at end via `ml-auto`) | Wrapping of CategoryTag to row 2 is acceptable at <480px when title is long; document as a mobile fallback. |
| Coming Up challenge card actions | Remind me button + View Details button | Same y ±2px at 1440px, 768px, and 375px | Wrapping below 480px is acceptable (buttons stack vertically via `flex-wrap`). |
| Next Challenge card actions | Remind me button + View Details button | Same y ±2px at 1440px and 768px | Wrapping below 480px is acceptable. |
| CommunityFeed upcoming copy | Bell icon + "N people waiting" text | Same y ±2px at all breakpoints | No wrap — container uses `flex items-center gap-2`. |
| ChallengeDetail future-state action row | Remind me + Back to Challenges (existing) | Same y ±2px at ≥640px; stacks via `flex-col sm:flex-row` below | Preserved from existing behavior. |
| ChallengeDetail hero season + duration pills | Season pill + duration pill | Same y ±2px at all breakpoints | Preserved — uses inline `flex gap-2`. |

**Guidance for `/verify-with-playwright`:** compare `boundingBox().y` at 1440px and 375px for each of the above groups. Any mismatch >5px where ≤5px is expected = wrapping bug.

---

## Vertical Rhythm

Expected gaps preserved from recon. No change to vertical rhythm in this spec.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Nav bottom → Hero top | 0px (hero pt-40 absorbs nav overlay) | challenge-detail-pre-start.md:369 |
| Hero h1 → description `<p>` | ~16px (`mt-4` on description) | challenge-detail-pre-start.md:374 |
| Description → Season/duration pill row | ~12px (`mt-4` on pill row) | ChallengeDetail.tsx:253 (existing, preserved) |
| Season row → Countdown block | ~16px (`mt-4`) | ChallengeDetail.tsx:333 |
| "Starts in N days" → Date subtitle | 4px (`mt-1`) | challenge-detail-pre-start.md:376 |
| Date → Action button row | ~16px (`mt-4`) | ChallengeDetail.tsx:345 |
| Hero bottom → Breadcrumb top | 32px (hero `pb-12` absorbs) | challenge-detail-pre-start.md:379 |
| Breadcrumb → CommunityFeed section | ~30px (`border-t` + `py-8 sm:py-10`) | CommunityFeed.tsx:18 (preserved) |
| CommunityFeed heading → content | 16px (`mt-4`) | New — matches existing `mb-4` pattern |
| Grow hero bottom → Tab bar top | 0px (tab bar sticky, follows hero) | GrowPage.tsx:112-116 |
| Tab bar → Tab content | 0px (tab content `py-10 sm:py-14`) | existing |
| Reading plan grid → (end) | `pb-8 sm:pb-10` within `ReadingPlansContent` | ReadingPlans.tsx:161 (preserved) |
| Create Your Own Plan card → Reading plan grid | 24px (`mb-6`) | ReadingPlans.tsx:164 (preserved) |

Any gap deviation >5px from these values = mismatch and must be fixed before the step is considered done.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] **Category key naming:** spec uses `'new-year'` (hyphenated) for the category key; this plan normalizes to `'newyear'` (no hyphen) to match the existing `ChallengeSeason` enum in `types/challenges.ts`. Rationale: a rename migration across 5 challenge records, `SEASON_LABELS`, and all consumers is out of proportion to the value. User should confirm this normalization before execution, or approve a migration to `'new-year'` as a parallel step.
- [ ] **`getContrastSafeColor` helper retention:** current Easter challenge `themeColor: '#FDE68A'` is remapped to `#92400E` via `getContrastSafeColor`. After this spec centralizes color sourcing through `CATEGORY_COLORS`, the helper still has three call sites: `UpcomingChallengeCard.tsx:45`, `ActiveChallengeCard.tsx:56`/`:104`, `NextChallengeCountdown.tsx:49`. The facelift rewires `UpcomingChallengeCard` and `NextChallengeCountdown` to use `CATEGORY_COLORS[challenge.season].fgClass` instead of `getContrastSafeColor(challenge.themeColor)`. `ActiveChallengeCard` remains **untouched** (spec scope is Next Challenge and Coming Up only — see spec § "Part 2"). `getContrastSafeColor` stays in the codebase for `ActiveChallengeCard`.
- [ ] **`themeColor` field retention on Challenge:** the Challenge `themeColor: string` field remains on the data model (required, not deprecated). It's still used by `ActiveChallengeCard` progress bar, challenge completion overlay, milestone card, hero overlay tint, and challenge-share-canvas. Centralizing the hero overlay `themeColor` through `CATEGORY_COLORS[category].themeColor` (spec req 16) adds a second source, not a replacement. Easter's map-sourced themeColor `#D97706` overrides the inline `#FDE68A` for the hero overlay specifically — other consumers (progress bar, badges) continue using inline value.
- [ ] **Dev server assumption:** Playwright recon files were captured on port 5174 (challenge-detail-pre-start.md:4) but `/verify-with-playwright` defaults to 5173 (per 04-frontend-standards.md). Align port before visual verification.
- [ ] **Existing tests that currently assert `Pray for the community` link:** `frontend/src/components/challenges/__tests__/CommunityFeed.test.tsx:42-46`. Rewrite in Step 9 along with the component.
- [ ] **`asChild` pattern decision:** Button `asChild` is implemented as a minimal composition (`<Slot>`-like wrapper via `React.cloneElement` + `cn` class merge), not via Radix `@radix-ui/react-slot`. No new dependency added.
- [ ] All auth-gated actions from the spec are accounted for in the plan (see Auth Gating Checklist above).
- [ ] Design system values are verified (from recon reports or codebase inspection).
- [ ] All [UNVERIFIED] values are flagged with verification methods (2 values, both in category color contrast and Easter themeColor).
- [ ] Recon reports loaded — `challenge-detail-pre-start.md` is fresh (0 days), `grow-recon.json` is fresh.
- [ ] No deprecated patterns used (Caveat headings, `bg-primary/[0.08]` flat banner, `animate-glow-pulse`, cyan textarea borders, soft-shadow 8px-radius cards on dark backgrounds, PageTransition component).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Category key naming | Keep `'newyear'` (existing enum) | Minimize blast radius; `ChallengeCategory` becomes an alias for `ChallengeSeason`. Spec's `'new-year'` is a cosmetic preference; the rename is not worth a migration. |
| `Button.asChild` implementation | Lightweight `cloneElement` wrapper, not Radix Slot | No new dependency; only one callsite (`View Details` Link wrapping) in initial use. |
| `CategoryTag` API shape | Accept a `category: ChallengeCategory` prop only, no theme override | Spec req 15 explicitly says single rendering path. Users who need a one-off tint use `CATEGORY_COLORS` directly. |
| `themeColor` field on Challenge | Keep; don't deprecate | Used by out-of-scope components (ActiveChallengeCard progress bar, completion overlay, share canvas). Centralizing is a bigger spec. |
| `CommunityFeed` upcoming state when `remindersCount` is 0 | Show "0 people are waiting to start" with singular ambiguity resolved as "are" (pluralization: 0→"are", 1→"is", 2+→"are"). | Anti-fabrication: honest zero beats a fake count. |
| CommunityFeed completed state when `completedCount` is missing | Default to `0`; render "0 people completed this challenge" | Same anti-fabrication principle. Honest data > fake activity. |
| CommunityFeed when `onToggleReminder` is undefined | Hide the CTA entirely (not a disabled variant) | The CTA is meaningful only when wired; a disabled reminder pill is confusing. |
| `transparentNav` prop name | `transparentNav` (not `transparent` or `navTransparent`) | Spec req 24 uses this exact name; preserves spec contract. |
| `Layout` architecture — route `ChallengeDetail` through `hero={...}` mode? | No. Keep `ChallengeDetail` in default mode + add new `transparentNav` prop. | `hero={...}` mode constrains `<main>` to `max-w-7xl` which the full-bleed hero cannot be a child of. Full-bleed requires hero outside `<main>`, same as GrowPage/DailyHub (which bypass Layout entirely). |
| Should `ChallengeDetail` switch to the GrowPage-style structure (no Layout, inline Navbar)? | No. Add `transparentNav` to Layout, keep ChallengeDetail as a Layout consumer. | Smaller diff; preserves Layout's SiteFooter; maintains consistency with ReadingPlanDetail and AskPage which both use Layout. |
| Breadcrumb placement after hero | Unchanged — it stays below the hero inside post-hero `<main>` | Site-wide convention; explicitly out of scope per spec. |
| Daily-Hub parity — arrow keys on shared Tabs | Opt-in via `onChange` handler; component manages focus moves internally | GrowPage currently has its own arrow-key handler. The shared Tabs primitive takes over this responsibility so consumer code shrinks. |
| FrostedCard component vs inline classes | Inline classes on Create-Your-Own-Plan, PlanCard, UpcomingChallengeCard, NextChallengeCountdown | Spec design notes line 149 explicitly allows inline parity. Avoids a wider refactor. |
| Next Challenge "View Details" link target | `/challenges/:id` with `challenge.id` from the props already in scope | Already the target for Coming Up View Details. |
| `isCompletedChallenge` derivation | `calendarInfo?.status === 'past'` | `calendarInfo` already exposes the status enum; no new date math needed. Simpler than `addDays(startDate, durationDays)`. |

---

## Implementation Steps

### Step 1: Create `CATEGORY_COLORS` map, `ChallengeCategory` type, and `CategoryTag` component

**Objective:** Centralize category color tokens for challenge tags and themed UI. Replace per-challenge inline color usage in card tags. Foundation for all subsequent card work.

**Files to create/modify:**

- `frontend/src/constants/categoryColors.ts` — CREATE
- `frontend/src/components/challenges/CategoryTag.tsx` — CREATE
- `frontend/src/components/challenges/__tests__/CategoryTag.test.tsx` — CREATE

**Details:**

Create `frontend/src/constants/categoryColors.ts`:

```typescript
import type { ChallengeSeason } from '@/types/challenges'

/**
 * Alias for ChallengeSeason. Semantic difference is naming only; the enum values
 * are identical. Spec terminology calls these "categories"; the data model uses "season".
 */
export type ChallengeCategory = ChallengeSeason

export interface CategoryColorTokens {
  /** Tailwind bg class for tag (~15% tint) */
  bgClass: string
  /** Tailwind text class for tag foreground — tuned for WCAG AA at 12px on FrostedCard bg */
  fgClass: string
  /** Tailwind border class for tag outline */
  borderClass: string
  /** Hex color for hero overlay tinting; sourced centrally */
  themeColor: string
}

export const CATEGORY_COLORS: Record<ChallengeCategory, CategoryColorTokens> = {
  pentecost: {
    bgClass: 'bg-red-500/15',
    fgClass: 'text-red-300',
    borderClass: 'border-red-400/30',
    themeColor: '#DC2626',
  },
  advent: {
    bgClass: 'bg-violet-500/15',
    fgClass: 'text-violet-300',
    borderClass: 'border-violet-400/30',
    themeColor: '#7C3AED',
  },
  lent: {
    bgClass: 'bg-purple-500/15',
    fgClass: 'text-purple-300',
    borderClass: 'border-purple-400/30',
    themeColor: '#6B21A8',
  },
  newyear: {
    bgClass: 'bg-emerald-500/15',
    fgClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/30',
    themeColor: '#059669',
  },
  easter: {
    bgClass: 'bg-amber-500/15',
    fgClass: 'text-amber-200',
    borderClass: 'border-amber-400/30',
    themeColor: '#D97706',
  },
}

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  pentecost: 'Pentecost',
  advent: 'Advent',
  lent: 'Lent',
  newyear: 'New Year',
  easter: 'Easter',
}
```

Create `frontend/src/components/challenges/CategoryTag.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { CATEGORY_COLORS, CATEGORY_LABELS, type ChallengeCategory } from '@/constants/categoryColors'

export interface CategoryTagProps {
  category: ChallengeCategory
  className?: string
}

export function CategoryTag({ category, className }: CategoryTagProps) {
  const tokens = CATEGORY_COLORS[category]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tokens.bgClass,
        tokens.fgClass,
        className,
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  )
}
```

**Auth gating (if applicable):** N/A — purely visual.

**Responsive behavior:**
- Desktop (1440px): tag renders inline, `text-xs` (12px), `px-2.5 py-0.5`.
- Tablet (768px): identical.
- Mobile (375px): identical — tag fits within any flex row at 12px.

**Inline position expectations:** N/A — CategoryTag is a single atomic inline element.

**Guardrails (DO NOT):**

- DO NOT introduce a `themeColor` prop — spec req 15 says single rendering path via category only.
- DO NOT rename the `ChallengeSeason` enum values (`'newyear'` stays as-is).
- DO NOT remove `getContrastSafeColor` from `constants/challenges.ts` — still used by `ActiveChallengeCard`.
- DO NOT depend on `challenges.ts` data from this file — it's a leaf constant.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `CategoryTag renders all 5 category labels` | unit | Loop through ChallengeCategory values; assert label text matches CATEGORY_LABELS. |
| `CategoryTag applies bgClass, fgClass from CATEGORY_COLORS` | unit | For each category, assert the rendered span contains the expected Tailwind class strings. |
| `CATEGORY_COLORS has all 5 keys matching ChallengeSeason enum` | unit | Type-level + runtime Object.keys assertion. |
| `CATEGORY_LABELS has all 5 keys` | unit | Object.keys length + content check. |

**Expected state after completion:**

- [ ] `categoryColors.ts` exports `ChallengeCategory`, `CATEGORY_COLORS`, `CATEGORY_LABELS`, `CategoryColorTokens`.
- [ ] `CategoryTag` component renders labeled pill with correct colors for each category.
- [ ] Tests pass: `pnpm test src/components/challenges/__tests__/CategoryTag.test.tsx`.
- [ ] TypeScript compiles: `cd frontend && pnpm build` passes.

---

### Step 2: Extend `Button` with `variant="light"` and `asChild` support

**Objective:** Introduce the white pill variant and `asChild` composition needed by PlanCard, UpcomingChallengeCard, NextChallengeCountdown, and CommunityFeed. No change to existing variants.

**Files to create/modify:**

- `frontend/src/components/ui/Button.tsx` — MODIFY
- `frontend/src/components/ui/__tests__/Button.test.tsx` — CREATE (no test file today)

**Details:**

Extend `Button` interface with `variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light'` and add `asChild?: boolean`. Implementation:

```tsx
import { ButtonHTMLAttributes, forwardRef, Children, cloneElement, isValidElement, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light'
  size?: 'sm' | 'md' | 'lg'
  /** When true, render merged styles onto the single child element instead of a <button>. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, children, ...props }, ref) => {
    const merged = cn(
      // Base
      'inline-flex items-center justify-center font-medium transition-[colors,transform] duration-fast motion-reduce:transition-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
      'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
      // Variant-specific (existing variants carry their own radius)
      variant !== 'light' && 'rounded-md',
      // Light variant: white pill, Daily Hub Pattern 1 parity
      variant === 'light' &&
        'rounded-full bg-white text-primary hover:bg-gray-100 gap-2 font-semibold min-h-[44px]',
      {
        'bg-primary text-white hover:bg-primary-lt': variant === 'primary',
        'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
        'border border-primary text-primary hover:bg-primary/5': variant === 'outline',
        'text-primary hover:bg-primary/5': variant === 'ghost',
        // Sizes: applied to all non-light variants normally; light uses its own padding
        'h-9 px-3 text-sm': size === 'sm' && variant !== 'light',
        'h-10 px-4': size === 'md' && variant !== 'light',
        'h-12 px-6 text-lg': size === 'lg' && variant !== 'light',
        // Light-specific sizing (keeps min-h-[44px] floor)
        'px-4 py-2 text-sm': size === 'sm' && variant === 'light',
        'px-6 py-2.5 text-sm': size === 'md' && variant === 'light',
        'px-8 py-3 text-base': size === 'lg' && variant === 'light',
      },
      className,
    )

    if (asChild) {
      // Validate single child element; merge className and forward ref/props
      const child = Children.only(children) as ReactElement
      if (!isValidElement(child)) {
        throw new Error('Button asChild requires a single valid React element')
      }
      return cloneElement(child as ReactElement<{ className?: string }>, {
        ...props,
        className: cn(merged, (child.props as { className?: string }).className),
        ref,
      } as Partial<unknown>)
    }

    return (
      <button ref={ref} className={merged} {...props}>
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
```

**Auth gating (if applicable):** N/A — shared primitive.

**Responsive behavior:** N/A — Button inherits parent layout. Touch targets enforced via `min-h-[44px]` on the `light` variant.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT alter existing variants (`primary`, `secondary`, `outline`, `ghost`). Visual regression on any existing `Button` callsite is a failure.
- DO NOT add a new dependency (no `@radix-ui/react-slot`).
- DO NOT drop `active:scale-[0.98]` — canonical press feedback.
- DO NOT remove `disabled:` handling — preserved.
- DO NOT hardcode `200ms` — use `duration-fast` token.
- DO NOT apply `rounded-full` to the base — other variants remain `rounded-md`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders as button by default` | unit | `<Button>Click</Button>` → `<button>` element |
| `renders primary variant (unchanged)` | unit | Assert `bg-primary`, `text-white`, `rounded-md` classes present |
| `renders light variant with white pill classes` | unit | Assert `bg-white`, `text-primary`, `rounded-full`, `min-h-[44px]` classes |
| `light size="sm" uses px-4 py-2` | unit | Class string contains `px-4 py-2 text-sm` |
| `asChild renders single child element with merged classes` | unit | `<Button variant="light" asChild><a href="/x">Go</a></Button>` → `<a>` with `bg-white` class |
| `asChild forwards ref to child` | unit | `useRef` + assertion on `current instanceof HTMLAnchorElement` |
| `asChild throws on zero or multiple children` | unit | Wrap in `expect(() => render(...)).toThrow()` |
| `focus-visible ring appears on keyboard focus` | unit | Trigger `focus-visible` via fireEvent or CSS assertion |
| `disabled state applies cursor-not-allowed` | unit | Class string contains `disabled:cursor-not-allowed` |

**Expected state after completion:**

- [ ] `Button variant="light"` renders white pill matching Daily Hub Pattern 1.
- [ ] `Button asChild` composes styles onto a child anchor/link.
- [ ] Existing `<Button>` callsites unchanged visually (`git grep "<Button" src/ | wc -l` callsites render identically; sample ReadingPlans confirm dialog's Keep Current/Pause & Start buttons).
- [ ] All tests pass.
- [ ] TypeScript build passes.

---

### Step 3: Add `transparentNav` prop to `Layout`

**Objective:** Enable flat-transparent navbar on `ChallengeDetail` without forcing the page through `hero={...}` mode (which would break full-bleed hero).

**Files to create/modify:**

- `frontend/src/components/Layout.tsx` — MODIFY

**Details:**

Update `LayoutProps` to include `transparentNav?: boolean`, default `false`. Thread through to `Navbar`. When `hero` is supplied, `transparentNav` is ignored (hero mode already uses `<Navbar transparent />`).

```tsx
import { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  hero?: ReactNode
  /**
   * When true, renders the navbar in transparent overlay mode (absolute positioning,
   * no background, matching `/daily` and `/grow`). Ignored when `hero` is supplied,
   * because hero mode already uses a transparent navbar.
   * Defaults to false for backward compatibility with all existing consumers.
   */
  transparentNav?: boolean
}

export function Layout({ children, hero, transparentNav = false }: LayoutProps) {
  const navTransparent = Boolean(hero) || transparentNav
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-hero-bg font-sans">
      <Navbar transparent={navTransparent} />
      {hero}
      <main
        id="main-content"
        className={cn(
          'flex-1',
          hero && 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
          !hero && !transparentNav && 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
          // When transparentNav is on AND no hero, caller owns <main> layout — Layout renders a bare flex wrapper
          !hero && transparentNav && 'contents',
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
```

Rationale for `className="contents"` when `transparentNav` is on and no `hero` is supplied: the caller (ChallengeDetail in Step 10) renders its own full-bleed hero + constrained post-hero content, and needs `<main>` to not constrain layout. `display: contents` makes `<main>` render as if it weren't there, but still provides `id="main-content"` for skip links.

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A — Layout is a structural wrapper. Navbar's internal responsive behavior is unchanged.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT change existing `<Layout>` caller behavior. `<Layout>{children}</Layout>` (no props) must still render opaque navbar + constrained `<main>`.
- DO NOT break `<Layout hero={...}>` — still renders transparent navbar + constrained `<main>`.
- DO NOT apply `display: contents` when `hero` is supplied.
- DO NOT rename the prop from `transparentNav`.
- DO NOT remove `overflow-x-hidden` or change `bg-hero-bg` — app-wide canvas invariant.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `<Layout> renders Navbar with transparent={false} by default` | unit | Use RTL, query for the rendered Navbar by `role="navigation"`, inspect className for non-transparent state |
| `<Layout transparentNav> renders Navbar with transparent=true` | unit | Same pattern; transparent class present |
| `<Layout hero={<PageHero />}> renders transparent Navbar (existing behavior)` | unit | No regression |
| `<Layout> (default) wraps children in <main max-w-7xl py-8>` | unit | `screen.getByRole('main')` has expected classes |
| `<Layout transparentNav> wraps children in display:contents main` | unit | Class string contains `contents` |
| `<Layout hero={...}> wraps children in <main max-w-7xl px-4>` (unchanged) | unit | Regression check |

**Expected state after completion:**

- [ ] `LayoutProps` has optional `transparentNav: boolean`, defaults false.
- [ ] All 30+ existing `<Layout>` callsites (grep `<Layout` in `src/`) continue to render identically — verified by running full test suite + spot-checking `/ask`, `/reading-plans/:id`, `/health`, `/accessibility` visually.
- [ ] TypeScript build passes.
- [ ] Unit tests pass for all 6 assertions above.

---

### Step 4: Create shared `<Tabs>` primitive

**Objective:** Extract Daily Hub's pill-tab pattern into a reusable component. Used by GrowPage in Step 5; future adopters out of scope.

**Files to create/modify:**

- `frontend/src/components/ui/Tabs.tsx` — CREATE
- `frontend/src/components/ui/__tests__/Tabs.test.tsx` — CREATE

**Details:**

Copy the active/inactive class strings verbatim from DailyHub.tsx:247-272 (see Design System Values table above). Include arrow-key roving tabindex handling and a `badge?: ReactNode` slot for the active-challenge pulse dot used by GrowPage.

```tsx
import { useRef, useCallback, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  /** Optional badge node (e.g. active-challenge pulse dot) rendered after the label */
  badge?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  ariaLabel?: string
  /** Additional classes merged onto the outer pill container */
  className?: string
}

/**
 * Shared pill-style tabs matching Daily Hub pattern.
 * - Pill container: frosted white/[0.06] with 12% border, rounded-full, p-1
 * - Active: filled white/[0.12] with purple halo glow
 * - Inactive: text-white/50, hover text-white/80, transparent reserved border (prevents width shift)
 * - Keyboard: ArrowLeft/ArrowRight/Home/End rotate focus and active tab
 * - role="tablist", role="tab", aria-selected, aria-controls all wired
 */
export function Tabs({ items, activeId, onChange, ariaLabel, className }: TabsProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length
      else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length
      else if (e.key === 'Home') nextIndex = 0
      else if (e.key === 'End') nextIndex = items.length - 1
      if (nextIndex !== null) {
        e.preventDefault()
        onChange(items[nextIndex].id)
        buttonRefs.current[nextIndex]?.focus()
      }
    },
    [items, onChange],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1',
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px]',
              'text-sm font-medium transition-all motion-reduce:transition-none duration-base',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
              'sm:text-base active:scale-[0.98]',
              isActive
                ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge}
          </button>
        )
      })}
    </div>
  )
}
```

**Auth gating (if applicable):** N/A — presentation-only.

**Responsive behavior:**
- Desktop (1440px): pill container fills parent width up to caller's `max-w-xl` constraint; tabs share width evenly via `flex-1`.
- Tablet (768px): identical.
- Mobile (375px): `text-sm` base (14px), switches to `sm:text-base` (16px) at ≥640px. Min-height 44px enforced.

**Inline position expectations:**
- All tab buttons share y-coordinate within ±2px. Verify: `page.$$eval('[role="tab"]', tabs => tabs.map(t => t.getBoundingClientRect().y))` should return values where max - min ≤ 2.

**Guardrails (DO NOT):**

- DO NOT import from any page-specific module (spec req 5 — standalone).
- DO NOT hardcode `200ms` or `300ms` — use `duration-base` token.
- DO NOT omit the transparent border on inactive tabs — this prevents width shift.
- DO NOT implement as a controlled-uncontrolled hybrid — it's always controlled (`activeId` + `onChange` required).
- DO NOT add additional variants in this spec (scrollable-tab variant, icons-only variant, etc.) — those are future work.
- DO NOT assume the consumer handles focus on active tab; the component handles focus on arrow-key navigation internally.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders tablist with role and aria-label` | unit | `role="tablist"` + correct `aria-label` |
| `renders each item as a role=tab with correct aria-selected` | unit | Iterate items; exactly one has `aria-selected="true"` |
| `renders icon + label + optional badge per item` | unit | Pass `icon={<svg data-testid="icon" />}` and `badge={<span data-testid="badge" />}`; assert both present |
| `clicking an inactive tab calls onChange with that id` | unit | `fireEvent.click(tab)`; assert `onChange` mock called with correct id |
| `ArrowRight/ArrowLeft/Home/End keyboard navigation rotates focus and calls onChange` | unit | `fireEvent.keyDown` with each key; assert onChange + focus moves |
| `ArrowRight wraps from last to first` | unit | Edge case |
| `ArrowLeft wraps from first to last` | unit | Edge case |
| `tabIndex is 0 on active tab, -1 on others` | unit | Inspect attributes |
| `aria-controls on each tab matches tabpanel-<id>` | unit | Deep-linking requirement |

**Expected state after completion:**

- [ ] `Tabs.tsx` exports `Tabs` component + `TabItem` and `TabsProps` types.
- [ ] No page-specific imports in the module.
- [ ] All 9 unit tests pass.
- [ ] TypeScript build passes.

---

### Step 5: Update `GrowPage` — remove `font-script`, swap underline tabs for shared `Tabs`

**Objective:** Hero heading is a single Inter gradient; tabs visually match Daily Hub pill style.

**Files to create/modify:**

- `frontend/src/pages/GrowPage.tsx` — MODIFY
- `frontend/src/pages/__tests__/GrowPage.test.tsx` — MODIFY (rewrite tab-related tests)

**Details:**

1. Hero heading (GrowPage.tsx:96-102):
   ```tsx
   // Before
   <h1 id="grow-heading" ... style={GRADIENT_TEXT_STYLE}>
     Grow in <span className="font-script">Faith</span>
   </h1>
   // After
   <h1 id="grow-heading" ... style={GRADIENT_TEXT_STYLE}>
     Grow in Faith
   </h1>
   ```

2. Tab bar (GrowPage.tsx:111-169): replace the entire sticky tab bar block with:
   ```tsx
   <div
     className={cn(
       'sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none',
       isSticky && 'shadow-md shadow-black/20',
     )}
   >
     <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
       <Tabs
         ariaLabel="Grow in Faith sections"
         activeId={activeTab}
         onChange={(id) => switchTab(id as TabId)}
         items={[
           {
             id: 'plans',
             label: 'Reading Plans',
             icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
           },
           {
             id: 'challenges',
             label: 'Challenges',
             icon: <Flame className="h-4 w-4" aria-hidden="true" />,
             badge: activeChallengeInfo ? (
               <span
                 className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse"
                 style={{ backgroundColor: activeChallengeThemeColor }}
                 aria-hidden="true"
               />
             ) : undefined,
           },
         ]}
       />
     </div>
   </div>
   ```

3. Remove now-obsolete local state:
   - Delete `tabButtonRefs` ref.
   - Delete `handleTabKeyDown` callback.
   - Delete `activeTabIndex` computation.
   - Delete the animated underline `<div>`.
   - `switchTab` stays (passes setter to Tabs `onChange`).
   - `sentinelRef` + IntersectionObserver sticky-shadow logic stays.

4. Update import: replace `import { BookOpen, Flame } from 'lucide-react'` with unchanged (still needed as icons passed into Tabs).

5. Update import: add `import { Tabs } from '@/components/ui/Tabs'`.

**Auth gating (if applicable):** N/A — tab switching is public per spec line 87.

**Responsive behavior:**
- Desktop (1440px): tabs inside `max-w-xl` pill container (~576px), visually centered.
- Tablet (768px): identical, container width constrained by `px-4` gutter (~720px available).
- Mobile (375px): pill fills `max-w-xl` × `px-4` (~343px available); both tabs side-by-side with `gap-2`. `text-sm` (14px). 44px touch target enforced.

**Inline position expectations:**
- Both tab buttons share y-coordinate ±2px at all breakpoints.
- Sticky behavior: tab bar sticks to top when scrolled past the hero sentinel (preserved).

**Guardrails (DO NOT):**

- DO NOT change the URL `?tab=plans`/`?tab=challenges` contract — existing deep links must work.
- DO NOT remove the sentinel-based sticky-shadow logic — preserves current scroll feedback.
- DO NOT remove the `motion-safe:animate-tab-fade-in` class on tab panels — preserves crossfade.
- DO NOT keep any `<span className="font-script">` instance anywhere in GrowPage.tsx.
- DO NOT use the ghost or primary Button variant on tabs — Tabs owns the visual language.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders hero without font-script` | unit | `render(<GrowPage />)` — `document.querySelector('.font-script')` is null within hero scope |
| `renders "Grow in Faith" as single h1` | unit | `screen.getByRole('heading', { level: 1 })` has text content `'Grow in Faith'` |
| `tablist is rendered with role and aria-label` | integration | `screen.getByRole('tablist')` + aria-label |
| `clicking Challenges tab updates URL ?tab=challenges` | integration | MemoryRouter + `fireEvent.click`; assert `location.search` |
| `arrow-right key on active Reading Plans tab focuses Challenges` | integration | Keyboard nav handled by Tabs primitive |
| `active-challenge pulse dot renders when getActiveChallengeInfo returns data` | unit | Mock `getActiveChallengeInfo`; assert `motion-safe:animate-challenge-pulse` class present |
| `tab width stable on switch (no shift)` | visual (Playwright) | Document — verify at /verify-with-playwright stage: `offsetWidth` delta ≤ 1px |

**Expected state after completion:**

- [ ] `GrowPage.tsx` contains zero `font-script` class instances.
- [ ] Tab bar renders as pill container matching Daily Hub at 1440px + 768px + 375px.
- [ ] Tab switching preserves URL deep-link behavior.
- [ ] Active-challenge pulse dot still renders when applicable.
- [ ] Tests pass.
- [ ] TypeScript build passes.
- [ ] Lint passes.

---

### Step 6: Update reading plan cards — inline emoji + white pill button + "Create Your Own Plan" FrostedCard

**Objective:** Reading plan cards match Daily Hub visual language. Emoji sits inline at title font size. Primary CTA is white pill. Card heights equalize in a row.

**Files to create/modify:**

- `frontend/src/pages/ReadingPlans.tsx` — MODIFY (Create Your Own Plan card)
- `frontend/src/components/reading-plans/PlanCard.tsx` — MODIFY (emoji position, button variant, card flex structure, hover state)
- `frontend/src/components/reading-plans/__tests__/PlanCard.test.tsx` — CREATE or UPDATE

**Details:**

**Create Your Own Plan card** (ReadingPlans.tsx:164-183) — replace with canonical FrostedCard treatment:

```tsx
<div className="mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]">
  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-white">Create Your Own Plan</h3>
      <p className="mt-1 text-sm text-white/60">
        Tell us what you&apos;re going through and we&apos;ll create a personalized Scripture journey just for you.
      </p>
    </div>
    <Button variant="light" onClick={handleCreatePlan}>
      Create Plan
    </Button>
  </div>
</div>
```

(Import `Button` from `@/components/ui/Button`.)

**PlanCard** (PlanCard.tsx entire rewrite — preserve semantics, change layout):

```tsx
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PLAN_DIFFICULTY_LABELS, PLAN_THEME_LABELS } from '@/constants/reading-plans'
import type { ReadingPlanMeta, PlanProgress } from '@/types/reading-plans'

interface PlanCardProps {
  plan: ReadingPlanMeta
  status: 'unstarted' | 'active' | 'paused' | 'completed'
  progress?: PlanProgress
  onStart: (planId: string) => void
  isCustom?: boolean
}

function StatusAction({ status, planId, onStart }: { status: PlanCardProps['status']; planId: string; onStart: (id: string) => void }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
        Completed
      </span>
    )
  }
  const label = status === 'active' ? 'Continue' : status === 'paused' ? 'Resume' : 'Start Plan'
  return (
    <Button
      variant="light"
      className="w-full"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onStart(planId)
      }}
    >
      {label}
    </Button>
  )
}

export function PlanCard({ plan, status, progress, onStart, isCustom }: PlanCardProps) {
  return (
    <Link
      to={`/reading-plans/${plan.id}`}
      className={cn(
        'flex h-full flex-col rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm',
        'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
        'transition-[background-color,border-color] duration-base motion-reduce:transition-none',
        'hover:bg-white/[0.08] hover:border-white/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg leading-none" aria-hidden="true">{plan.coverEmoji}</span>
        <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
      </div>

      {isCustom && (
        <span className="mt-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-lt">
          Created for you
        </span>
      )}

      <p className="mt-2 line-clamp-2 text-sm text-white/70">{plan.description}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{plan.durationDays} days</span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{PLAN_DIFFICULTY_LABELS[plan.difficulty]}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{PLAN_THEME_LABELS[plan.theme]}</span>
      </div>

      {progress && !progress.completedAt && (
        <p className="mt-2 text-sm text-white/50">
          Day {progress.currentDay} of {plan.durationDays}
        </p>
      )}

      <div className="mt-auto pt-4">
        <StatusAction status={status} planId={plan.id} onStart={onStart} />
      </div>
    </Link>
  )
}
```

Key changes:

- Emoji moved from `mb-3 text-4xl` block to inline `<span class="text-lg">` in a `flex items-center gap-3` row with h3. `aria-hidden="true"` preserved.
- Card bg: `bg-white/5` → `bg-white/[0.06]`. Border: `border-white/10` → `border-white/[0.12]`. Hover lifts to `bg-white/[0.08]` + `border-white/20`.
- Canonical FrostedCard shadow added.
- `flex h-full flex-col` on outer wrapper + `mt-auto` on action row → equal heights in grid row.
- Button changed from `bg-primary rounded-lg` to `Button variant="light"`.
- Existing handler semantics preserved (`preventDefault`, `stopPropagation` inside button click to avoid navigating the parent Link).

**Auth gating (if applicable):** Existing `handleCreatePlan` and `handleStartOrContinue` already call `authModal.openAuthModal(...)` for logged-out users. Not re-wired here.

**Responsive behavior:**
- Desktop (1440px): 2-column grid via `sm:grid-cols-2` (existing in ReadingPlans.tsx:194). Cards equalize height.
- Tablet (768px): `sm:grid-cols-2`.
- Mobile (375px): single column. Emoji + title on one row; if title wraps, emoji stays on row 1.

**Inline position expectations:**
- Emoji and title y-alignment within ±2px at ≥375px (they're in the same `flex items-center` row).
- Button pinned to card bottom via `mt-auto`.

**Guardrails (DO NOT):**

- DO NOT remove `aria-hidden="true"` from the emoji — the title already communicates content.
- DO NOT hardcode a `min-height` on the card — `flex h-full` + `mt-auto` is the equalization mechanism.
- DO NOT remove the `transition-[background-color,border-color] duration-base` — preserves canonical hover animation.
- DO NOT change the Link target or disable the parent Link — card itself navigates to plan detail on click; button has `stopPropagation` to avoid double-nav when clicking action.
- DO NOT replace `Sparkles` icon color — spec req 4 explicitly says inner sparkle retains purple.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders emoji inline with title` | unit | `screen.getByRole('heading', { level: 3 })` + its preceding sibling has the emoji |
| `emoji has aria-hidden` | unit | Attribute assertion |
| `emoji is text-lg (~18px), not text-4xl` | unit | Assert class string contains `text-lg`, not `text-4xl` |
| `renders Start Plan as white pill` | unit | Assert button has `bg-white`, `text-primary`, `rounded-full` classes |
| `clicking Start Plan calls onStart with planId and stops propagation` | unit | Mock onStart; assert called once with planId; parent Link's navigation not triggered |
| `card has flex h-full flex-col structure` | unit | Class string assertion |
| `completed status renders "Completed" badge, not button` | unit | Text `'Completed'` found; no button |
| `hover classes present (bg-white/[0.08], border-white/20)` | unit | Class string assertion |
| `Create Your Own Plan card uses FrostedCard classes` (ReadingPlans.tsx test) | integration | Assert `bg-white/[0.06]`, `border-white/[0.12]`, `rounded-2xl`, `backdrop-blur-sm` |
| `Create Plan button uses variant="light"` | integration | Assert `bg-white`, `text-primary`, `rounded-full` |
| `Sparkles icon retains text-primary class` | integration | Assert class string |

**Expected state after completion:**

- [ ] PlanCard emoji renders inline at `text-lg` (~18px).
- [ ] PlanCard CTA is a white pill.
- [ ] Two PlanCards in a row share offsetHeight ±1px at 1440px and 768px.
- [ ] "Create Your Own Plan" card no longer has `bg-primary/[0.08]`; uses canonical FrostedCard.
- [ ] Sparkles icon remains purple.
- [ ] Tests pass.
- [ ] TypeScript build passes.

---

### Step 7: Update challenge cards — UpcomingChallengeCard + NextChallengeCountdown

**Objective:** Both card templates unify on frosted background + white pill actions. Icons render in `text-white/90`. CategoryTag replaces inline themeColor styling on tags. NextChallengeCountdown gains View Details. Coming Up cards equalize heights. Staged countdown urgency on NextChallengeCountdown.

**Files to create/modify:**

- `frontend/src/components/challenges/UpcomingChallengeCard.tsx` — MODIFY
- `frontend/src/components/challenges/NextChallengeCountdown.tsx` — MODIFY
- `frontend/src/components/challenges/__tests__/UpcomingChallengeCard.test.tsx` — CREATE
- `frontend/src/components/challenges/__tests__/NextChallengeCountdown.test.tsx` — CREATE

**Details:**

**UpcomingChallengeCard rewrite** — key changes:

- Outer wrapper: `flex h-full flex-col rounded-xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] duration-base motion-reduce:transition-none hover:bg-white/[0.08] hover:border-white/20`.
- Icon color: `text-white/90` (replace inherited color).
- Season pill: replaced with `<CategoryTag category={challenge.season} className="ml-auto shrink-0" />`.
- Remove `getContrastSafeColor` import from this file.
- Action buttons: `<Button variant="light" size="sm">` wrapping `<Bell /> Remind me` or `<Check /> Reminder set` (conditional) and `<Link>View Details</Link>` via `asChild`.
- Structure: `mt-auto flex flex-wrap gap-2 pt-4` on action row (bottom-pin for height equalization).

```tsx
import { Bell, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CategoryTag } from './CategoryTag'
import { ChallengeIcon } from './ChallengeIcon'
import type { Challenge } from '@/types/challenges'

interface UpcomingChallengeCardProps {
  challenge: Challenge
  startDate: Date
  isReminderSet: boolean
  onToggleReminder: () => void
  onClick: () => void  // retained for backward compat but no longer used on whole-card click
}

export function UpcomingChallengeCard({
  challenge,
  startDate,
  isReminderSet,
  onToggleReminder,
}: UpcomingChallengeCardProps) {
  const formattedStartDate = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <article
      className="flex h-full flex-col rounded-xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] duration-base motion-reduce:transition-none hover:bg-white/[0.08] hover:border-white/20"
    >
      <div className="flex items-center gap-3">
        <ChallengeIcon name={challenge.icon} className="h-6 w-6 shrink-0 text-white/90" aria-hidden="true" />
        <h3 className="flex-1 text-lg font-bold text-white">{challenge.title}</h3>
        <CategoryTag category={challenge.season} className="shrink-0" />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-white/70">{challenge.description}</p>

      <div className="mt-3 text-xs text-white/60">
        {challenge.durationDays} days · Starts {formattedStartDate}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button
          variant="light"
          size="sm"
          onClick={onToggleReminder}
          aria-label={isReminderSet ? 'Remove reminder' : 'Set reminder'}
          aria-pressed={isReminderSet}
        >
          {isReminderSet ? <Check className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
          {isReminderSet ? 'Reminder set' : 'Remind me'}
        </Button>
        <Button variant="light" size="sm" asChild>
          <Link to={`/challenges/${challenge.id}`}>View Details</Link>
        </Button>
      </div>
    </article>
  )
}
```

(Note: `onClick` prop kept in the interface but unused — the View Details Button asChild handles navigation. Remove the click-card-to-navigate behavior because per spec req 10 every card now has an explicit View Details button.)

**NextChallengeCountdown rewrite** — key changes:

- Outer wrapper: upgraded to canonical FrostedCard shadow. Retain `rounded-2xl`, `sm:p-8`.
- Remove `getContrastSafeColor` import. Use `CATEGORY_COLORS[challenge.season].fgClass` for the countdown number color — BUT countdown color now derives from urgency (see below).
- Add "Next Challenge" + Calendar icon header (preserved).
- Icon color: `text-white/90` (spec req 12 icon handling).
- CategoryTag: placed where the SEASON_LABELS pill used to live (add an inline category tag after the title in the title row).
- Title row: icon + title + CategoryTag.
- Staged countdown color function:
  ```ts
  function getCountdownColorClass(daysUntilStart: number): string {
    if (daysUntilStart <= 1) return 'text-red-400'
    if (daysUntilStart <= 7) return 'text-amber-300'
    return 'text-white'
  }
  ```
- Pluralize "day" / "days" correctly (spec edge case).
- Action row: `Remind me` + `View Details` (NEW — spec req 10) in that order, both white pills via `<Button variant="light" size="sm">`.

```tsx
import { Bell, Check, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CategoryTag } from './CategoryTag'
import { ChallengeIcon } from './ChallengeIcon'
import type { Challenge } from '@/types/challenges'

function getCountdownColorClass(daysUntilStart: number): string {
  if (daysUntilStart <= 1) return 'text-red-400'
  if (daysUntilStart <= 7) return 'text-amber-300'
  return 'text-white'
}

interface NextChallengeCountdownProps {
  challenge: Challenge
  startDate: Date
  isReminderSet: boolean
  onToggleReminder: () => void
}

export function NextChallengeCountdown({ challenge, startDate, isReminderSet, onToggleReminder }: NextChallengeCountdownProps) {
  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const daysUntilStart = Math.max(0, Math.round((startUTC - todayUTC) / (1000 * 60 * 60 * 24)))

  const formattedStartDate = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const countdownColor = getCountdownColorClass(daysUntilStart)

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-2 text-white/60">
        <Calendar className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium uppercase tracking-wide">Next Challenge</span>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <ChallengeIcon name={challenge.icon} className="h-7 w-7 shrink-0 text-white/90" aria-hidden="true" />
        <h2 className="flex-1 text-xl font-bold text-white sm:text-2xl">{challenge.title}</h2>
        <CategoryTag category={challenge.season} className="shrink-0" />
      </div>

      <p className="mb-2 text-lg font-semibold text-white">
        Starts in{' '}
        <span className={countdownColor}>
          {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
        </span>
      </p>

      <p className="mb-4 text-sm text-white/60">
        Begins {formattedStartDate} · {challenge.durationDays} days
      </p>

      <p className="mb-6 text-white/60">{challenge.description}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="light"
          size="sm"
          onClick={onToggleReminder}
          aria-label={isReminderSet ? 'Remove reminder' : 'Set reminder'}
          aria-pressed={isReminderSet}
        >
          {isReminderSet ? <Check className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
          {isReminderSet ? 'Reminder set' : 'Remind me'}
        </Button>
        <Button variant="light" size="sm" asChild>
          <Link to={`/challenges/${challenge.id}`}>View Details</Link>
        </Button>
      </div>
    </div>
  )
}
```

**Auth gating (if applicable):**
- `onToggleReminder` handler in both cards is passed in by `Challenges.tsx:139-145` which already calls `authModal.openAuthModal(...)` for logged-out users. Unchanged.
- View Details Link: public navigation; no gate (spec line 90).

**Responsive behavior:**
- Desktop (1440px): Coming Up grid `sm:grid-cols-2`. Cards equalize height via `flex h-full flex-col`. NextChallengeCountdown at `p-8` padding.
- Tablet (768px): same grid layout. Padding `sm:p-8`.
- Mobile (375px): single-column (grid-cols-1). NextChallengeCountdown `p-6` padding. Action buttons `flex-wrap` — stack as needed.

**Inline position expectations:**
- UpcomingChallengeCard title row: icon + title + CategoryTag y-aligned ±5px at ≥480px. At <480px, CategoryTag may wrap to row 2 (acceptable).
- UpcomingChallengeCard action row: Remind me + View Details y-aligned ±2px at ≥480px; stack allowed below.
- NextChallengeCountdown title row: same as UpcomingChallengeCard.
- NextChallengeCountdown action row: Remind me + View Details y-aligned ±2px at ≥640px.
- Coming Up grid equal card heights: first two `<article>` offsetHeight delta ≤ 1px.

**Guardrails (DO NOT):**

- DO NOT change `ChallengeIcon` default rendering behavior — pass `className="text-white/90"` explicitly in this spec.
- DO NOT remove `aria-label` or `aria-pressed` from the Remind me toggle — accessibility preserved.
- DO NOT change the handler signatures from `Challenges.tsx` — `onToggleReminder: () => void` and `onClick: () => void` contracts preserved (onClick becomes unused in UpcomingChallengeCard but retained in interface for call-site compatibility).
- DO NOT pass `challenge.themeColor` directly — all color sourcing goes through CATEGORY_COLORS.
- DO NOT use `getContrastSafeColor` in either rewritten card. (ActiveChallengeCard still uses it — that's fine.)
- DO NOT add a whole-card click handler on UpcomingChallengeCard — explicit View Details button supersedes it. Dropping this matches how PlanCard works (clickable Link wrapper) — in this case, since we have an explicit View Details button, the whole-card Link pattern would duplicate navigation.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `UpcomingChallengeCard renders CategoryTag from challenge.season` | unit | Assert `CategoryTag` rendered with correct category label visible |
| `UpcomingChallengeCard icon has text-white/90` | unit | Assert ChallengeIcon class contains `text-white/90` |
| `UpcomingChallengeCard Remind me button uses variant="light"` | unit | Assert `bg-white`, `text-primary`, `rounded-full` classes on button |
| `UpcomingChallengeCard View Details renders as <Link> with correct href` | unit | `screen.getByText('View Details').closest('a')` has href `/challenges/:id` |
| `UpcomingChallengeCard outer wrapper has flex h-full flex-col` | unit | Class string assertion |
| `UpcomingChallengeCard clicking Remind me fires onToggleReminder` | unit | Mock handler; fireEvent click; assert called once |
| `UpcomingChallengeCard Remind me has aria-pressed aria-label` | unit | Attribute assertion for both states |
| `NextChallengeCountdown countdown color is text-red-400 when days<=1` | unit | Pass startDate today; assert class |
| `NextChallengeCountdown countdown color is text-amber-300 when days<=7` | unit | Pass startDate +3 days; assert class |
| `NextChallengeCountdown countdown color is text-white when days>7` | unit | Pass startDate +37 days; assert class `text-white` (not red, not amber) |
| `NextChallengeCountdown pluralizes "1 day" vs "N days"` | unit | Edge case — startDate tomorrow renders "1 day" |
| `NextChallengeCountdown renders View Details link` | unit | `getByText('View Details')` present + has correct href |
| `NextChallengeCountdown renders CategoryTag in title row` | unit | Assert CategoryTag present |
| `Both cards: action buttons share y-coordinate at 1440px` | Playwright | Document in /verify-with-playwright stage: `boundingBox().y` delta ≤ 2px |
| `Coming Up grid: first two cards share offsetHeight ±1px` | Playwright | Document for verification |

**Expected state after completion:**

- [ ] Both card templates use canonical FrostedCard treatment with dual shadow.
- [ ] Icons render `text-white/90` (no inherited category color).
- [ ] CategoryTag replaces inline color styling on tags.
- [ ] Both cards render both `Remind me` and `View Details` in consistent order.
- [ ] NextChallengeCountdown countdown color scales by urgency.
- [ ] NextChallengeCountdown pluralizes singular day correctly.
- [ ] Coming Up grid cards equalize heights via `flex h-full flex-col`.
- [ ] Tests pass.
- [ ] TypeScript build passes.
- [ ] Lint passes.

---

### Step 8: Add mock-data fields to challenges.ts and Challenge interface

**Objective:** Seed plausible `remindersCount`, `activeParticipantsCount`, `completedCount` values on each challenge so CommunityFeed can render honest state.

**Files to create/modify:**

- `frontend/src/types/challenges.ts` — MODIFY (add optional fields)
- `frontend/src/data/challenges.ts` — MODIFY (5 records get new fields)
- `frontend/src/data/__tests__/challenges.test.ts` — UPDATE if it exists (or create small assertion)

**Details:**

1. Update `types/challenges.ts`:

   ```typescript
   export interface Challenge {
     id: string
     title: string
     description: string
     season: ChallengeSeason
     getStartDate: (year: number) => Date
     durationDays: number
     icon: string
     themeColor: string
     dailyContent: DayChallengeContent[]
     communityGoal: string
     /** Pre-start: how many people have set a reminder. Used by CommunityFeed upcoming state. */
     remindersCount?: number
     /** Active: live participant count. If omitted, CommunityFeed hides the count line. */
     activeParticipantsCount?: number
     /** Completed: total finishers. If omitted, CommunityFeed defaults to 0. */
     completedCount?: number
   }
   ```

2. Update each of the 5 challenge records in `frontend/src/data/challenges.ts`:

   | Challenge | remindersCount | activeParticipantsCount | completedCount |
   |---|---|---|---|
   | `pray40-lenten-journey` (Lent, 40d) | 142 | 1847 | 512 |
   | `easter-joy-resurrection-hope` (Easter, 7d) | 38 | 624 | 1284 |
   | `fire-of-pentecost` (Pentecost, 21d) | 87 | 0 (pre-start per recon) | 0 |
   | `advent-awaits` (Advent, 21d) | 203 | 0 | 864 |
   | `new-year-new-heart` (Newyear, 21d) | 156 | 0 | 1103 |

   Values chosen to be plausible but not identical — gives CommunityFeed visible variation. Exact values are not test-fixtures-level critical; the goal is to avoid `0 people are waiting`.

3. If a challenges.ts test file asserts the exact shape of the Challenge interface, update fixtures.

**Auth gating (if applicable):** N/A — data file.

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT make these fields required — consumers (ActiveChallengeCard, PastChallengeCard, etc.) must tolerate missing data.
- DO NOT add real-user-facing data — these are mock values per spec line 166 (CommunityFeed remains mock-data-driven).
- DO NOT add `category: ChallengeCategory` as a new field — existing `season: ChallengeSeason` is used (see Assumptions about naming).
- DO NOT modify `dailyContent` arrays or any other existing data.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `every CHALLENGES record has remindersCount` | unit | Loop; assert `typeof c.remindersCount === 'number'` |
| `Challenge interface optional fields compile` | type-level | Build step verifies |

**Expected state after completion:**

- [ ] Challenge interface includes 3 new optional fields.
- [ ] All 5 challenge records have `remindersCount`, `activeParticipantsCount`, `completedCount` populated.
- [ ] TypeScript build passes.
- [ ] Any test that snapshot-serializes a challenge updates its snapshot (run tests, inspect diffs).

---

### Step 9: Rewrite `CommunityFeed` as state-aware component

**Objective:** CommunityFeed renders one of three distinct layouts based on `status` prop. Upcoming shows reminder count + CTA (no fabricated activity). Active shows existing activity feed scoped behind the guard. Completed shows total count + Award icon. "Pray for the community" link removed entirely.

**Files to create/modify:**

- `frontend/src/components/challenges/CommunityFeed.tsx` — REWRITE
- `frontend/src/components/challenges/__tests__/CommunityFeed.test.tsx` — REWRITE

**Details:**

```tsx
import { Users, Bell, Award, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getActivityItems, AVATAR_COLORS } from '@/data/challenge-community-feed'

export type ChallengeStatus = 'upcoming' | 'active' | 'completed'

export interface CommunityFeedProps {
  status: ChallengeStatus
  /** Day number for active state's activity items */
  dayNumber: number
  /** Challenge duration in days (passed through to getActivityItems) */
  challengeDuration: number
  /** Pre-start: how many people have set a reminder */
  remindersCount?: number
  /** Active: how many are currently participating */
  activeParticipantsCount?: number
  /** Completed: how many finished the challenge */
  completedCount?: number
  /** Pre-start: formatted start date string (for copy) */
  startDateLabel?: string
  /** Shared: current user has the reminder set */
  hasReminder?: boolean
  /** Shared: reminder toggle handler. When undefined, the CTA is hidden. */
  onToggleReminder?: () => void
}

function pluralPeople(count: number): string {
  return count === 1 ? 'person' : 'people'
}

function pluralBe(count: number): string {
  return count === 1 ? 'is' : 'are'
}

export function CommunityFeed(props: CommunityFeedProps) {
  return (
    <section className="border-t border-white/10 py-8 sm:py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-white">Challenge Community</h3>
        </div>

        {props.status === 'upcoming' && <UpcomingState {...props} />}
        {props.status === 'active' && <ActiveState {...props} />}
        {props.status === 'completed' && <CompletedState {...props} />}
      </div>
    </section>
  )
}

function UpcomingState({
  remindersCount = 0,
  startDateLabel,
  hasReminder,
  onToggleReminder,
}: CommunityFeedProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-white">{remindersCount}</strong>{' '}
          {pluralPeople(remindersCount)} {pluralBe(remindersCount)} waiting to start
        </span>
      </div>
      <p className="max-w-sm text-sm text-white/60">
        Community activity will begin when the challenge starts
        {startDateLabel ? ` on ${startDateLabel}` : ''}.
        Set a reminder to join when it begins.
      </p>
      {onToggleReminder && (
        <Button
          variant="light"
          size="sm"
          onClick={onToggleReminder}
          aria-label={hasReminder ? 'Remove reminder' : 'Set reminder'}
          aria-pressed={Boolean(hasReminder)}
        >
          {hasReminder ? <Check className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
          {hasReminder ? 'Reminder set' : 'Remind me'}
        </Button>
      )}
    </div>
  )
}

function ActiveState({ dayNumber, challengeDuration, activeParticipantsCount }: CommunityFeedProps) {
  const items = getActivityItems(dayNumber, challengeDuration, 6)
  return (
    <>
      {typeof activeParticipantsCount === 'number' && (
        <p className="mt-1 text-sm text-white/60">
          {activeParticipantsCount} {pluralPeople(activeParticipantsCount)} participating
        </p>
      )}
      <ul className="mt-4 divide-y divide-white/5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: AVATAR_COLORS[item.colorIndex] }}
              aria-hidden="true"
            >
              {item.initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-white/90">{item.name}</span>{' '}
              <span className="text-sm text-white/60">{item.action}</span>
            </div>
            <span className="shrink-0 text-xs text-white/60">{item.timestamp}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function CompletedState({ completedCount = 0 }: CommunityFeedProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
      <Award className="h-8 w-8 text-white/70" aria-hidden="true" />
      <p className="text-sm text-white/70">
        <strong className="font-semibold text-white">{completedCount}</strong>{' '}
        {pluralPeople(completedCount)} completed this challenge.
      </p>
    </div>
  )
}
```

Key implementation notes:

- **No "Pray for the community" link** anywhere in the component.
- **Active state** scopes the activity feed behind the `status === 'active'` guard at the top-level dispatch. Even if `dayNumber` and `challengeDuration` are passed when `status === 'upcoming'`, the items never render. This is the defense-in-depth guard spec req 20 demands.
- **Upcoming state** hides the Remind me CTA when `onToggleReminder` is undefined (not a disabled variant — just hidden).
- **Completed state** defaults `completedCount` to 0 rather than hiding entirely (spec line 60-61 shows `Award icon + completion count` as the expected visual).
- **Copy pluralization** handled via `pluralPeople()` and `pluralBe()` helpers.

**Auth gating (if applicable):**
- `onToggleReminder` handler (passed from ChallengeDetail in Step 10) already calls `authModal.openAuthModal` for logged-out users. Unchanged.

**Responsive behavior:**
- Desktop (1440px): inner container `max-w-2xl` (672px) centered.
- Tablet (768px): same.
- Mobile (375px): `px-4` gutter; content wraps naturally. Upcoming state stacks vertically via `flex-col`.

**Inline position expectations:**
- Upcoming state header: Users icon + "Challenge Community" h3 y-aligned ±2px.
- Upcoming state "waiting" row: Bell icon + text y-aligned ±2px.
- Active state activity row: avatar + name/action + timestamp y-aligned ±2px per row.

**Guardrails (DO NOT):**

- DO NOT render `<ul>` or activity items when `status !== 'active'` — the guard must be at the component level.
- DO NOT render "Pray for the community" link in any state. Explicit spec requirement.
- DO NOT import `Link` from react-router-dom — no internal navigation in this component.
- DO NOT fabricate counts — `remindersCount`, `activeParticipantsCount`, `completedCount` are sourced from challenge data, never computed from fake sources.
- DO NOT use `getActivityItems` in UpcomingState or CompletedState.
- DO NOT use `motion-safe:animate-challenge-pulse` or any other animated affordance in upcoming state — waiting is a calm state, not urgent.
- DO NOT pass `hasReminder: undefined` to the Button's `aria-pressed` — coerce to boolean via `Boolean(hasReminder)`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `upcoming state renders reminder count with pluralization` | unit | `status='upcoming'`, `remindersCount=1` → "1 person is waiting"; `remindersCount=5` → "5 people are waiting" |
| `upcoming state renders startDateLabel in copy` | unit | Assert copy includes `"on May 24, 2026"` |
| `upcoming state renders Remind me CTA when onToggleReminder provided` | unit | Button rendered |
| `upcoming state HIDES CTA when onToggleReminder undefined` | unit | Button not in DOM |
| `upcoming state DOES NOT render activity feed` | unit | `screen.queryByRole('list')` is null |
| `upcoming state DOES NOT render "Pray for the community"` | unit | `screen.queryByText(/pray for the community/i)` is null |
| `active state renders 6 activity items` | unit | `getAllByRole('listitem')` length 6 |
| `active state renders participant count when provided` | unit | "1847 people participating" text present |
| `active state HIDES participant count when undefined` | unit | Text not present |
| `active state DOES NOT render "Pray for the community"` | unit | Assertion |
| `completed state renders Award icon and count` | unit | Both visible |
| `completed state pluralizes "1 person" vs "N people"` | unit | Edge case |
| `completed state defaults count to 0 when not provided` | unit | "0 people completed this challenge" renders |
| `hasReminder=true renders Check icon and "Reminder set" text with aria-pressed` | unit | Attributes + visual state |
| `toggling reminder fires onToggleReminder exactly once` | unit | fireEvent + mock assertion |

**Expected state after completion:**

- [ ] CommunityFeed has exactly three rendering branches gated by `status`.
- [ ] No `/prayer-wall?filter=challenge` URL appears anywhere in the component.
- [ ] No "Pray for the community" text anywhere.
- [ ] No activity items render when `status !== 'active'`.
- [ ] Pluralization is correct for all three states.
- [ ] Existing test file fully rewritten; all new tests pass.
- [ ] TypeScript build passes.
- [ ] Lint passes.

---

### Step 10: Update `ChallengeDetail` — transparentNav, full-bleed hero, remove font-script, staged countdown, CommunityFeed wiring

**Objective:** ChallengeDetail page matches spec visually and behaviorally. Navbar flat transparent. Hero h1 single Inter gradient. Hero background full-bleed. Countdown color scales by urgency. CommunityFeed receives `status` and wires the reminder toggle.

**Files to create/modify:**

- `frontend/src/pages/ChallengeDetail.tsx` — MODIFY (multiple sections)
- `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` — UPDATE (add assertions for new behaviors)

**Details:**

1. **Layout change** — wrap in `<Layout transparentNav>` and restructure so hero is outside any constrained main. Current structure wraps everything in `<div className="min-h-screen bg-dashboard-dark">` inside Layout's `<main>`. New structure:
   - Layout renders bare `<main id="main-content" className="contents">` (Step 3's `contents` mode).
   - First child: full-bleed hero `<section>`.
   - Second child: post-hero wrapper `<div className="mx-auto max-w-2xl px-4 sm:px-6">` containing breadcrumb + day content + CommunityFeed + other post-hero elements.
   - The completion celebration, day navigation, switch dialog, completion overlay modals remain where they are structurally but rendered inside the post-hero `<div>` or at root level for overlays.

2. **Remove `font-script`** from hero h1 (ChallengeDetail.tsx:246):
   ```tsx
   // Before
   <h1 ... style={GRADIENT_TEXT_STYLE}>
     {titlePrefix} <span className="font-script">{titleLastWord}</span>
   </h1>
   // After
   <h1 ... style={GRADIENT_TEXT_STYLE}>
     {challenge.title}
   </h1>
   ```
   Also delete `titleWords`, `titlePrefix`, `titleLastWord` variables (lines 208-210).

3. **Full-bleed hero section** — change hero from being a child of `<div className="min-h-screen bg-dashboard-dark">` inside constrained main. Hero is now a direct child of the Layout root. Inner hero content wraps in `<div className="mx-auto w-full max-w-4xl">` to constrain text column.

   ```tsx
   <Layout transparentNav>
     <SEO ... />

     {/* Hero — full-bleed */}
     <section
       className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
       style={heroStyle}
     >
       <div className="mx-auto w-full max-w-4xl flex flex-col items-center">
         <ChallengeIcon ... />
         <h1 ... style={GRADIENT_TEXT_STYLE}>{challenge.title}</h1>
         <p ...>{challenge.description}</p>
         {/* season + duration pills, progress bar, participant count, community goal, join button, future-state countdown + action row — unchanged structure, preserved inside this max-w-4xl wrapper */}
       </div>
     </section>

     {/* Post-hero content */}
     <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-12">
       <Breadcrumb ... />
       {activeMilestone && ...}
       {showDayContent && <ChallengeDayContent ... />}
       {challenge && (
         <CommunityFeed
           status={status}
           dayNumber={selectedDay}
           challengeDuration={challenge.durationDays}
           remindersCount={challenge.remindersCount}
           activeParticipantsCount={challenge.activeParticipantsCount}
           completedCount={challenge.completedCount}
           startDateLabel={calendarInfo?.startDate.toLocaleDateString(undefined, {
             month: 'long', day: 'numeric', year: 'numeric',
           })}
           hasReminder={getReminders().includes(challengeId ?? '')}
           onToggleReminder={handleFutureReminderToggle}
         />
       )}
       {justCompletedFinalDay && ...}
       {!isFutureChallenge && <day navigation>...}
     </div>

     {switchDialog && ...}
     {completionOverlay && ...}
   </Layout>
   ```

4. **`isCompletedChallenge` derivation:** add near `isFutureChallenge`:
   ```tsx
   const isCompletedChallenge = calendarInfo?.status === 'past'
   ```
   (The variable `isPastChallenge` already exists with this exact value — rename it to `isCompletedChallenge` in the call site for the `status` prop, OR pass `isPastChallenge ? 'completed' : ...`. Keep `isPastChallenge` too to avoid breaking other guard references.)

5. **`status` derivation for CommunityFeed:**
   ```tsx
   const communityStatus: ChallengeStatus = isFutureChallenge
     ? 'upcoming'
     : isPastChallenge
       ? 'completed'
       : 'active'
   ```
   Import the type: `import { CommunityFeed, type ChallengeStatus } from '@/components/challenges/CommunityFeed'`.

6. **Reminder toggle wiring for CommunityFeed upcoming state:** create `handleFutureReminderToggle` that wraps the existing toggle with the auth modal check — this mirrors the existing inline handler at ChallengeDetail.tsx:348-353:
   ```tsx
   const handleFutureReminderToggle = useCallback(() => {
     if (!isAuthenticated) {
       authModal?.openAuthModal('Sign in to set a reminder')
       return
     }
     if (challengeId) toggleReminder(challengeId)
   }, [isAuthenticated, authModal, challengeId, toggleReminder])
   ```
   Use this handler for both the CommunityFeed upcoming state AND the existing hero future-state Remind me button (refactor to use the same function, remove the inline handler).

7. **Staged countdown urgency on the hero** (existing inline at ChallengeDetail.tsx:335-337):
   ```tsx
   // Add helper near top of file:
   function getCountdownColorClass(daysUntilStart: number): string {
     if (daysUntilStart <= 1) return 'text-red-400'
     if (daysUntilStart <= 7) return 'text-amber-300'
     return 'text-white'
   }

   // Update countdown JSX:
   <p className="text-lg font-semibold text-white">
     Starts in{' '}
     <span className={getCountdownColorClass(daysUntilStart)}>
       {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
     </span>
   </p>
   ```
   (Note: existing code in ChallengeDetail.tsx:335-337 already pluralizes correctly. Only the color-selection swap is new.)

8. **Remove obsolete helpers:** if `getContrastSafeColor` was imported but no longer used after refactors, remove the import. (Verify: it's still used on ActiveChallengeCard references — that's a different file.)

**Auth gating (if applicable):**
- Reminder toggle inside CommunityFeed upcoming state → `handleFutureReminderToggle` → auth modal when logged out (preserved). Spec Auth Gating table confirms unchanged.
- No other changes.

**Responsive behavior:**
- Desktop (1440px): hero full-bleed; hero content centered in `max-w-4xl` (~896px); post-hero content in `max-w-2xl` (~672px).
- Tablet (768px): hero padding `sm:pt-36 sm:pb-12`; post-hero `sm:px-6`.
- Mobile (375px): hero full-bleed (viewport width); hero content in `px-4` gutter within `max-w-4xl`; post-hero in `max-w-2xl px-4`. Action buttons inside `future-state` row wrap via existing `flex flex-col sm:flex-row`.

**Inline position expectations:**
- Hero icon row: ChallengeIcon + h1 stacked (not inline — icon is above). Preserved from existing structure.
- Hero season + duration pill row: both pills y-aligned ±2px at all breakpoints.
- Hero future-state action row (Remind me + Back to Challenges): y-aligned ±2px at ≥640px; stack below.
- CommunityFeed state-specific inline rows: as documented in Step 9.

**Guardrails (DO NOT):**

- DO NOT introduce a new background on the hero — `ATMOSPHERIC_HERO_BG + themeColor overlay` preserved exactly (spec req line 162).
- DO NOT move the breadcrumb above the hero — site-wide convention preserved (spec line 164).
- DO NOT wrap CommunityFeed in a conditional that hides it for past challenges — the completed state is now a valid render target.
- DO NOT remove the `role="progressbar"` attributes on the hero progress bars.
- DO NOT change the behavior of `handleJoin`, `handleMarkComplete`, or any other existing handler.
- DO NOT pass `challenge.themeColor` directly into CommunityFeed — category color is not needed by CommunityFeed.
- DO NOT remove `<SiteFooter />` — Layout still provides it.
- DO NOT set `bg-dashboard-dark` anywhere in the new JSX — Layout's `bg-hero-bg` is the canvas.
- DO NOT remove the existing completion celebration, day navigation, switch dialog, or completion overlay modals.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `hero h1 renders challenge.title without font-script` | integration | No `.font-script` in hero `<h1>`; `screen.getByRole('heading', level: 1).textContent === challenge.title` |
| `Layout is rendered with transparentNav prop` | integration | Navbar has transparent styling (verify by class on Navbar element OR by rendering inside a test Layout and asserting prop propagation) |
| `CommunityFeed receives status='upcoming' for future challenge` | integration | Render ChallengeDetail with `fire-of-pentecost` (starts +37 days); assert CommunityFeed rendered with upcoming copy ("people are waiting to start") |
| `CommunityFeed receives status='active' for currently-active challenge` | integration | Mock or construct an active challenge; assert activity list visible |
| `CommunityFeed receives status='completed' for past challenge` | integration | Pick a challenge with past end date; assert Award icon + completion count render |
| `pre-start challenge does NOT render fabricated activity` | integration | For fire-of-pentecost, `screen.queryByRole('list')` is null (the `<ul>` of activity items) |
| `pre-start challenge does NOT render "Pray for the community"` | integration | `queryByText(/pray for the community/i)` is null |
| `countdown color text-white for 37 days out` | integration | Render fire-of-pentecost; query countdown span; assert class contains `text-white`, NOT `text-red-400` |
| `countdown color text-amber-300 for 5 days out` | integration | Stub startDate to +5; assert class |
| `countdown color text-red-400 for 1 day out` | integration | Stub startDate to +1; assert class |
| `clicking Remind me in CommunityFeed upcoming opens auth modal when logged out` | integration | Render logged-out; fireEvent click CommunityFeed's Remind me Button; assert auth modal mock called |
| `clicking Remind me in CommunityFeed upcoming toggles reminder when logged in` | integration | Render logged-in; fireEvent click; assert `toggleReminder` mock called with challenge id |
| `hero section uses full-bleed structure (no max-w-7xl ancestor)` | integration | After rendering, `document.querySelector('section[style*="radial-gradient"]').parentElement` should not be `<main>` with `max-w-7xl` class |
| `breadcrumb + day content + CommunityFeed wrap in max-w-2xl container` | integration | Query post-hero wrapper; assert class contains `max-w-2xl` |
| `no "Pray for the community" link in DOM for any state` | integration | `queryByText(/pray for the community/i)` is null in all three states |

**Expected state after completion:**

- [ ] `/challenges/fire-of-pentecost` renders with flat-transparent navbar.
- [ ] `/challenges/fire-of-pentecost` hero h1 reads in a single Inter gradient; no Caveat.
- [ ] Hero atmospheric background extends to viewport edges at 375px, 768px, 1440px.
- [ ] Hero content stays centered in `max-w-4xl`.
- [ ] Post-hero breadcrumb + CommunityFeed at `max-w-2xl`.
- [ ] CommunityFeed renders upcoming state for `fire-of-pentecost` with reminder count + CTA, no fabricated activity.
- [ ] Countdown "37 days" renders in white, not red.
- [ ] `titlePrefix`/`titleLastWord` variables removed from ChallengeDetail.tsx.
- [ ] Tests pass.
- [ ] TypeScript build passes.
- [ ] Lint passes.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | `CATEGORY_COLORS` + `CategoryTag` — foundation for Steps 7 (cards) |
| 2 | — | `Button variant="light"` + `asChild` — foundation for Steps 6, 7, 9 |
| 3 | — | `Layout transparentNav` — foundation for Step 10 |
| 4 | — | Shared `<Tabs>` — foundation for Step 5 |
| 5 | 4 | GrowPage uses Tabs primitive |
| 6 | 2 | Reading plan cards use `Button variant="light"` |
| 7 | 1, 2 | Upcoming + NextChallenge cards use CategoryTag + Button light |
| 8 | — | Mock data fields added to Challenge type + records |
| 9 | 2, 8 | CommunityFeed uses Button light + new challenge data fields |
| 10 | 3, 9, 8 | ChallengeDetail wires transparentNav + CommunityFeed status + new fields |

Steps 1, 2, 3, 4, 8 are independent and can execute in parallel. Step 5 depends on 4. Step 6 depends on 2. Step 7 depends on 1 + 2. Step 9 depends on 2 + 8. Step 10 depends on 3 + 9 + 8 (transitively includes everything).

Recommended serial order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create CATEGORY_COLORS, ChallengeCategory, CategoryTag | [COMPLETE] | 2026-04-17 | Created `constants/categoryColors.ts` (CATEGORY_COLORS, CATEGORY_LABELS, ChallengeCategory as ChallengeSeason alias), `components/challenges/CategoryTag.tsx`, test file with 6 passing tests. |
| 2 | Extend Button with variant="light" and asChild | [COMPLETE] | 2026-04-17 | Extended `Button.tsx` with `variant="light"` (white pill + 44px min-h) and `asChild` (Children.only + cloneElement). New test file `__tests__/Button.test.tsx` with 13 passing tests. Existing Button callsites unchanged (button-feedback tests pass). |
| 3 | Add transparentNav prop to Layout | [COMPLETE] | 2026-04-17 | Added `transparentNav?: boolean` prop to `Layout.tsx`. `contents` mode on `<main>` when transparentNav without hero. Skip link preserved via `id="main-content"`. 5 new Layout tests pass. |
| 4 | Create shared Tabs primitive | [COMPLETE] | 2026-04-17 | Created `components/ui/Tabs.tsx` with pill-style tabs matching Daily Hub, arrow-key roving tabindex, Home/End support, icon + badge slots. 12 passing tests. |
| 5 | Update GrowPage — remove font-script, use Tabs | [COMPLETE] | 2026-04-17 | Removed `<span className="font-script">Faith</span>` → plain "Grow in Faith". Replaced underline tabs with shared `<Tabs>`. Removed `tabButtonRefs`, `handleTabKeyDown`, `activeTabIndex`, animated underline. Active-challenge pulse dot wired via `badge` slot. 20 GrowPage tests pass (incl. new font-script assertion). |
| 6 | Update reading plan cards + Create Your Own Plan card | [COMPLETE] | 2026-04-17 | PlanCard: inline emoji (text-lg, aria-hidden), canonical FrostedCard classes, `flex h-full flex-col` + `mt-auto`, white pill CTA via `Button variant="light"`. Create Your Own Plan: canonical FrostedCard (bg-white/[0.06], rounded-2xl, dual shadow). Sparkles icon retains text-primary. 17 PlanCard tests + 17 ReadingPlans tests pass. |
| 7 | Update UpcomingChallengeCard + NextChallengeCountdown | [COMPLETE] | 2026-04-17 | Both cards unified on FrostedCard treatment with dual shadow. Icons text-white/90. CategoryTag replaces inline themeColor. White pill Remind me + View Details via `Button variant="light"` + `asChild`. NextChallengeCountdown: staged countdown color (red/amber/white), View Details added. Upcoming: flex h-full flex-col + mt-auto. `getContrastSafeColor` import removed from both files. 25 new tests + 11 Challenges page tests + 8 accessibility tests pass. |
| 8 | Add mock-data fields to challenges.ts | [COMPLETE] | 2026-04-17 | Added 3 optional fields (remindersCount, activeParticipantsCount, completedCount) to Challenge interface. Populated all 5 records with plausible mock values per plan table. 17 data tests pass (incl. new field-type assertion). |
| 9 | Rewrite CommunityFeed as state-aware | [COMPLETE] | 2026-04-17 | CommunityFeed rewritten with three distinct state branches (upcoming/active/completed). UpcomingState uses Bell icon + count + optional Remind me white pill; ActiveState uses activity list + optional participant count; CompletedState uses Award icon + count. Pluralization helpers. No "Pray for the community" anywhere. 24 new tests pass. ChallengeDetail callsite now errors on missing `status` prop — resolved in Step 10. |
| 10 | Update ChallengeDetail — transparentNav, full-bleed, countdown, CommunityFeed wiring | [COMPLETE] | 2026-04-17 | Changed to `<Layout transparentNav>`. Removed `<div className="min-h-screen bg-dashboard-dark">`; hero is direct child (full-bleed); inner hero content in `max-w-4xl`. Removed `font-script` + `titlePrefix/titleLastWord`. Added `getCountdownColorClass` helper + applied to hero countdown. Added `handleFutureReminderToggle` callback; refactored hero future-state button to use it. Added `isCompletedChallenge` + `communityStatus` derivations. Wired CommunityFeed with status + all props. 19 ChallengeDetail tests + all downstream tests pass. Build passes. |
