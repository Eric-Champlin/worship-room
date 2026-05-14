# Forums Wave Plan: Prayer Wall Redesign (Side Quest)

**Spec:** `_specs/forums/spec-prayer-wall-redesign.md`
**Master Plan:** N/A — side quest. Not in `_forums_master_plan/round3-master-plan.md` or `spec-tracker.md`. Eric tracks completion manually.
**Date:** 2026-05-13
**Branch:** `forums-wave-continued` (existing wave branch; CC never alters git state)
**Phase:** N/A
**Size:** L
**Risk:** Medium

---

## Affected Frontend Routes

- `/prayer-wall` (primary surface — 3-column grid wrapper, sidebars, hero/CTA repositioning, category bar redesign)
- `/prayer-wall/:id` (PageShell inherits the redesigned global header with NightModeBadge)
- `/prayer-wall/user/:id` (same — inherits header changes)
- `/prayer-wall/dashboard` (same — inherits header changes)
- `/settings` (Night Mode preference labels updated to match Off / Auto / On chip cycle semantics)
- **Global** — every route mounting `Navbar.tsx` receives the new NightModeBadge in the user-state slot (visible at night hours only)

Additionally, `frontend/src/index.css` changes are global (removing the `[data-night-mode='on']` palette block, removing the `data-prayer-wall-night-mode-pending` body backdrop rule, adding `.prayer-wall-grid` responsive rules).

---

## Universal Rules Checklist

N/A — side quest, no master plan reference. The following project-wide rules still apply (drawn from `.claude/rules/`):

- **AI safety (`01-ai-safety.md`):** N/A — no AI surfaces touched.
- **Security (`02-security.md`):** New `wr_prayer_wall_guidelines_dismissed` key is browser-local UX flag. No PII, no auth-gating change.
- **Frontend standards (`04-frontend-standards.md`):** All new components use FrostedCard tier system, Button variants, animation tokens, `cn()` helper, semantic HTML.
- **Testing (`06-testing.md`):** ~18 tests across unit, integration, behavioral, E2E, a11y. Vitest + RTL + Playwright. Test names follow project conventions.
- **Logging (`07-logging-monitoring.md`):** N/A — frontend-only.
- **Local storage (`11-local-storage-keys.md`):** New `wr_prayer_wall_guidelines_dismissed` key documented per project rule.
- **Accessibility:** Gate-G-A11Y mandates axe-core zero violations at 1440/1024/768/375px, keyboard navigation traversal, semantic `<nav>` / `<section>` + appropriate aria-labels, reduced-motion accommodation.
- **Anti-pressure copy:** All new strings (Local Support, Guidelines, NightModeBadge labels) are calm, no urgency, no engagement-coded phrasing, no metrics.
- **Reactive store discipline:** No new reactive stores introduced. The Guidelines dismiss flag is a plain localStorage boolean — single consumer, no cross-surface broadcast needed.
- **Animation token discipline:** All animations import from `frontend/src/constants/animation.ts`.

---

## Architecture Context

**Files verified on disk (spec-recon + plan-recon):**

- `frontend/src/index.css` — 556 lines. `[data-night-mode='on']` palette block runs lines 129–225 (palette vars at 129–148, hero gradient text override at 158–164, BackgroundCanvas multi-bloom warm-amber override at 181–189 — brown `#1f1a17` at line 188, marker-class surgical overrides at 194–225). Body-backdrop rule at lines 232–234. Removal scope: all of 129–225 and 232–234. Animation keyframe comment at 236–238 may stay (the actual keyframe lives in `tailwind.config.js`).
- `frontend/src/hooks/useNightMode.ts` — 62 lines. Returns `{ active, source, userPreference }`. Polls `setHour(readCurrentHour())` every 60s. Writes `wr_night_mode_hint` localStorage hint. **D-PreserveHook: ZERO changes.**
- `frontend/src/hooks/useWatchMode.ts` — 84 lines. Composes `useNightMode()` and `useSettings()`. **PRESERVED.**
- `frontend/src/constants/night-mode-copy.ts` — 8 day/night copy variant pairs. **PRESERVED.**
- `frontend/src/lib/night-mode-resolver.ts` — pure resolver shared with the no-FOUC inline script. **PRESERVED** (still consumed by useNightMode).
- `frontend/index.html` lines 37–67 — no-FOUC inline script sets `data-prayer-wall-night-mode-pending` on `<html>`. Plan-time decision: see Plan-Time Divergence #1.
- `frontend/src/components/Navbar.tsx` — 253 lines. Glassmorphic navbar. Logo + DesktopNav (5 NAV_LINKS + LocalSupportDropdown) + DesktopUserActions or DesktopAuthActions + hamburger. Lines 197–201 are the user-state slot — NightModeBadge mounts adjacent to `DesktopUserActions`/`DesktopAuthActions`.
- `frontend/src/pages/PrayerWall.tsx` — 1137 lines. Already wraps in `<BackgroundCanvas nightMode={nightActive ? 'on' : 'off'}>`. Renders `<NightWatchChip>` and passes it as `nightWatchChip` prop to `PrayerWallHero`. Already has `RoomSelector` (post type) + `CategoryFilterBar` (category) as TWO stacked filter bars under a sticky wrapper.
- `frontend/src/components/prayer-wall/NightWatchChip.tsx` — 95 lines. Uses CSS vars `var(--pw-night-border-strong)`, `var(--pw-night-bg-elev)`, `var(--pw-night-text)`, `var(--pw-night-accent)` — all defined inside the palette block being removed. "(always on)" copy at lines 25 + 51. Internal focus-trapped popover.
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — uses `data-night-hero-heading` on h1 + `text-white-night-aware` on subtitle. The h1 attribute hook stays (it's harmless without a CSS rule); the marker class becomes a no-op.
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — uses `frosted-card-accent-night-aware` className on the FrostedCard wrapper. **Plan-time finding for R4:** removing the palette block automatically restores QOTD to the canonical FrostedCard `variant="accent"` day-state (`bg-violet-500/[0.08]` + `border-violet-400/70`) — opacity 0.08 violet over `BackgroundCanvas` is the readable, consistent treatment used across all Tier 1 cards. No further alpha tuning needed.
- `frontend/src/pages/Settings.tsx` — Settings page hosts 7 sections. Night Mode preference lives in `PrivacySection.tsx` (lines 175–196), wired to `prayerWall.nightMode` via `updatePrayerWall`. `NIGHT_MODE_OPTIONS` constant at lines 40–44 with labels "Auto (9pm – 6am)", "Always on", "Always off".
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` (140 lines) + `frontend/src/components/prayer-wall/RoomSelector.tsx` — the two filter bars being collapsed into one `<CategoryFilters>` component.
- `frontend/src/constants/prayer-categories.ts` — `PRAYER_CATEGORIES` (10 categories incl. 'discussion' + 'other') and `CATEGORY_LABELS`. New CategoryFilters should EXCLUDE `'discussion'` and `'other'` from the "By topic" subsection (or treat them per existing app convention) — `'discussion'` is also a post type which causes UX confusion, and `'other'` is a catch-all. Plan-time decision: see Plan-Time Divergence #4.
- `frontend/src/constants/post-types.ts` — 5 post types (prayer_request, testimony, question, discussion, encouragement).
- `frontend/src/components/ui/BackgroundCanvas.tsx` — already takes `nightMode?: 'on' | 'off'` prop. Plan KEEPS this prop and PrayerWall.tsx KEEPS passing it (the attribute remains, only the CSS that consumes it is removed — preserves the behavioral signal for tests / future non-brown styles).

**Spec-recon items resolved at plan-time:**

- **R1 (brown gradient source):** Confirmed — `#1f1a17` at `index.css:188` is the SOLE source. Grep for `#1f1a17`, `linear-gradient.*pw-night`, `radial-gradient.*pw-night-bloom`, and `var(--pw-night` returned matches ONLY inside lines 129–225 of index.css. No other page consumes the palette block.
- **R2 (top-nav structure):** Canonical candidate is `frontend/src/components/Navbar.tsx`. Pick: KEEP the existing Navbar as the global header on ALL routes. The Prayer Wall left sidebar adds primary nav (Daily Hub / Bible / Grow / Music / Prayer Wall) ON `/prayer-wall` only at desktop — Navbar nav links continue to render across the page (they appear in both the top nav and the left sidebar on desktop /prayer-wall, intentional duplication for sidebar discoverability per brief Section 6 R2 recommendation). Brief explicitly recommended this approach.
- **R3 (chip explainer discoverability):** Pick **(b) — secondary "i" icon next to the badge label** opens the explainer popover. The badge tap-area cycles preference; the small "i" affordance (Lucide `Info` icon, 16px) opens the existing focus-trapped popover (reused from NightWatchChip).
- **R4 (QOTD opacity):** **Removing the palette block delivers the fix.** R4 is RESOLVED by D-RemovePaletteOverride; no separate alpha tuning step needed. Day-state FrostedCard `variant="accent"` `bg-violet-500/[0.08]` is the canonical treatment and already readable on `BackgroundCanvas`.
- **R5 (Settings Night Mode UX):** Settings remains the canonical edit surface. `NIGHT_MODE_OPTIONS` labels change to align with chip cycle semantics: `"Off"`, `"Auto (9pm – 6am)"`, `"On"`. The chip writes to the same `prayerWall.nightMode` field via `updatePrayerWall`. No "always" parenthetical anywhere.
- **R6 (CSS variable inventory):** New components reuse Tailwind tokens (`bg-white/[0.07]`, `border-white/[0.12]`, `text-white`, `text-white/70`, `text-violet-300`) — NO new CSS variables. The dark-theme palette is already exposed via Tailwind config (`hero-bg`, `hero-dark`, `hero-mid`, etc.). No parallel naming.

---

## Database Changes

N/A — frontend-only side quest.

---

## API Changes

N/A — frontend-only side quest.

---

## Assumptions & Pre-Execution Checklist

- [ ] Spec 6.5 (Intercessor Timeline) has merged to `forums-wave-continued` (or whatever branch is canonical). Verify by reading `_forums_master_plan/spec-tracker.md` and grepping for `IntercessorTimeline` component (already present per spec-recon).
- [ ] Phase 6 specs 6.1, 6.2, 6.2b, 6.3, 6.4 all ✅ shipped per `_forums_master_plan/spec-tracker.md`.
- [ ] Working tree clean except for any in-progress redesign work (`git status` read-only check; CC never alters git state).
- [ ] Node + pnpm available; `pnpm install` completed.
- [ ] `pnpm dev` boots `/prayer-wall` without errors before any changes land.
- [ ] No concurrent Phase 6 spec is in flight (this redesign touches the most-modified file in the wave: `PrayerWall.tsx`).

---

## Spec-Category-Specific Guidance

This is a **FRONTEND-ONLY spec inside the Forums Wave**. The `/plan-forums` skill warns that most Forums Wave frontend work is dual-write; this is the rare exception (no backend, no API). Standard frontend conventions apply — no backend-rule checks (Liquibase / OpenAPI / SecurityConfig / Caffeine / Phase 3 Addendum items 1–8). Skip the entire "BACKEND-ONLY" gate block. Test discipline still applies; accessibility still applies; copy review still applies.

The closest applicable pattern set is the visual-rollout / cinematic-hero family (Specs 1A–14 of the Round 3 Visual Rollout). Borrow conventions from there: `FrostedCard` tier system, `Button variant="subtle"`, border opacity `border-white/[0.12]`, no hardcoded animation durations.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Source of brown gradient | `index.css:188` (single source) | Spec-recon + plan-recon R1 confirmed. Removing palette block fixes it. |
| Top-nav strategy | KEEP Navbar globally; left sidebar adds nav surface on `/prayer-wall` desktop only (duplicates nav links — intentional per brief R2 recommendation) | Avoids two-component fork; preserves cross-route header. |
| Chip explainer discoverability | Secondary `Info` (i) icon next to badge label | More discoverable than long-press; doesn't conflict with iOS Safari long-press defaults. |
| QOTD alpha tuning | Not needed — palette removal restores violet `bg-violet-500/[0.08]` automatically | R4 resolved by D-RemovePaletteOverride. |
| Settings Night Mode option labels | `"Off"`, `"Auto (9pm – 6am)"`, `"On"` (drops "Always") | Aligns with chip cycle; W8 grep verifies no "(always on)" anywhere. |
| Reactive store for Guidelines dismissal | NO — plain `localStorage` boolean | Single consumer (`CommunityGuidelinesCard`); no cross-surface broadcast. |
| Single-select vs multi-select categories | Single-select per D-CategorySingleSelect | Brief explicitly out-of-scope multi-select for v1. |
| Multi-select handling for "All" | Tapping "All posts" clears both `category` AND `postType` URL params; tapping any specific filter sets that param and clears the other | Matches D-CategorySingleSelect ("All deselects everything"). |
| Categories shown in "By topic" sidebar list | 8 topics: Health, Mental Health, Family, Work, Grief, Gratitude, Praise, Relationships. EXCLUDES `'discussion'` and `'other'` from the topic list. | Brief Section 3 lists exactly these 8. `'discussion'` is also a post type; surfacing it as a topic causes UX confusion. `'other'` is a catch-all (no user-friendly meaning). See Plan-Time Divergence #4. |
| Filter bar deprecation | KEEP `CategoryFilterBar.tsx` and `RoomSelector.tsx` files (no production consumers post-redesign; flagged for future cleanup spec) | Matches W7 (NightWatchChip deprecation shim philosophy). No deletes in v1 per Section 10. |
| Layout default left/right sidebars hidden on `/prayer-wall/dashboard` | YES — only `/prayer-wall` exact route mounts the 3-column grid wrapper | Sub-routes (`/:id`, `/user/:id`, `/dashboard`) keep existing PageShell layout. |
| Right sidebar contents on tablet (768–1279px) | QOTD inlines to top of center column; Local Support + Guidelines NOT rendered (returning users dismissed; new users see desktop) | Brief Section 3 explicit. |
| Right sidebar contents on mobile (<768px) | NONE shown — QOTD already inlined above feed via existing render, Local Support reachable via main nav, Guidelines deferred until user has desktop access | Brief Section 3 explicit. |
| Guidelines collapsed state | Collapsed by default; localStorage flag stores "dismissed" only (never "expanded") | Brief Section 3 explicit. Expansion is per-session state. |
| Sticky filter sentinel preservation | KEEP the existing `filterSentinelRef` + `IntersectionObserver` from current PrayerWall.tsx; relocate to wrap the new `<CategoryFilters>` on mobile only (desktop sidebar doesn't sticky-toggle, it's already sticky via column) | Preserves the existing sticky-shadow visual on mobile category row. |

---

## Implementation Steps

### Step 1: Create `NightModeBadge.tsx` + tests

**Objective:** Build the redesigned header badge that replaces `NightWatchChip`. Cycles Off → Auto → On on tap. Secondary "i" icon opens the existing focus-trapped explainer popover.

**Files to create/modify:**

- `frontend/src/components/prayer-wall/NightModeBadge.tsx` — new component
- `frontend/src/components/prayer-wall/__tests__/NightModeBadge.test.tsx` — unit tests

**Details:**

Component signature:

```tsx
import { useState, useRef } from 'react'
import { Moon, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useSettings } from '@/hooks/useSettings'
import { useNightMode } from '@/hooks/useNightMode'
import { cn } from '@/lib/utils'
import type { NightModePreference } from '@/types/settings'

const CYCLE: Record<NightModePreference, NightModePreference> = {
  off: 'auto',
  auto: 'on',
  on: 'off',
}

const ICON_STATE: Record<NightModePreference, { fillClass: string; label: string }> = {
  off:  { fillClass: 'text-white/50',    label: '' },      // outlined
  auto: { fillClass: 'text-white/80',    label: 'Auto' },  // half-filled visually via opacity
  on:   { fillClass: 'text-violet-300',  label: 'On' },    // solid
}

export function NightModeBadge() {
  const { settings, updatePrayerWall } = useSettings()
  const { active, userPreference } = useNightMode()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useFocusTrap(popoverOpen, () => setPopoverOpen(false))

  // Render NOTHING when night mode is not currently active (badge is an
  // active-state indicator, not a perpetual settings toggle — Settings is
  // the canonical editor; the badge is the night-hours shortcut).
  if (!active) return null

  const next = CYCLE[userPreference]
  const ariaLabel = `Night Mode is ${userPreference === 'auto' ? 'Auto' : userPreference === 'on' ? 'On' : 'Off'}. Tap to change.`

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <button
        ref={badgeRef}
        type="button"
        onClick={() => updatePrayerWall({ nightMode: next })}
        aria-label={ariaLabel}
        aria-live="polite"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full',
          'border border-white/[0.12] bg-white/[0.07] backdrop-blur-sm',
          'px-3 py-1.5 text-xs font-medium text-white',
          'min-h-[44px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          'transition-colors',
          'hover:bg-white/[0.12]'
        )}
      >
        <Moon className={cn('h-4 w-4', ICON_STATE[userPreference].fillClass)} aria-hidden="true" />
        {ICON_STATE[userPreference].label && (
          <span className="hidden sm:inline">{ICON_STATE[userPreference].label}</span>
        )}
      </button>

      <button
        type="button"
        onClick={() => setPopoverOpen((p) => !p)}
        aria-label="What is Night Mode?"
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'min-h-[32px] min-w-[32px] p-1',
          'text-white/60 hover:text-white/90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {popoverOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="night-mode-popover-heading"
          className={cn(
            'absolute right-0 top-full mt-2 z-40 w-72',
            'rounded-3xl backdrop-blur-sm p-4',
            'border border-white/[0.18] bg-hero-mid/95',
            'shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
          )}
        >
          <h3 id="night-mode-popover-heading" className="text-base font-semibold text-white">
            Night Mode
          </h3>
          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            Subtle late-night tone changes for the Prayer Wall.
          </p>
          <Link
            to="/settings?tab=privacy#night-mode"
            className="mt-3 inline-block text-sm text-violet-300 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
            onClick={() => setPopoverOpen(false)}
          >
            Change in Settings
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Guardrails (DO NOT):**

- DO NOT use any `var(--pw-night-*)` CSS variables — they're being deleted in Step 10.
- DO NOT include the string "always on" or "(always on)" anywhere — W8 grep verifies global absence.
- DO NOT add a breathing-glow animation (`motion-safe:animate-night-pulse`) — D-ChipRename removes it.
- DO NOT call any random / non-deterministic content during render.
- DO NOT mutate the hook's return — D-PreserveHook protects `useNightMode()`.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test -- --run NightModeBadge.test.tsx` passes
- [ ] Build passes: `pnpm build` succeeds with new file
- [ ] No new CSS vars introduced; new component uses Tailwind tokens only

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders null when night mode inactive | unit | `active=false` → component returns null |
| renders badge when active | unit | `active=true, userPreference='auto'` → Moon icon + "Auto" visible at `sm:` |
| cycle Off → Auto on tap | unit | Initial 'off', click → `updatePrayerWall({ nightMode: 'auto' })` |
| cycle Auto → On on tap | unit | Initial 'auto', click → `updatePrayerWall({ nightMode: 'on' })` |
| cycle On → Off on tap | unit | Initial 'on', click → `updatePrayerWall({ nightMode: 'off' })` |
| aria-label reflects state | unit | aria-label contains "Night Mode is Auto" when 'auto' active |
| no "always on" text | unit | `screen.queryByText(/always/i)` returns null |
| info icon opens popover | unit | Click "What is Night Mode?" → dialog visible, focus trapped |

**Expected state after completion:**

- [ ] `NightModeBadge.tsx` exists at `frontend/src/components/prayer-wall/NightModeBadge.tsx`
- [ ] All 8 unit tests pass

---

### Step 2: Create `CommunityGuidelinesCard.tsx` + tests

**Objective:** Build the dismissible community guidelines card for the right sidebar. Collapsed by default. Tap header to expand. "Got it" link writes `wr_prayer_wall_guidelines_dismissed = 'true'` and hides the card on subsequent loads.

**Files to create/modify:**

- `frontend/src/components/prayer-wall/CommunityGuidelinesCard.tsx`
- `frontend/src/components/prayer-wall/__tests__/CommunityGuidelinesCard.test.tsx`

**Details:**

```tsx
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'wr_prayer_wall_guidelines_dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // private mode / quota — graceful no-op
  }
}

export function CommunityGuidelinesCard() {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())
  const [expanded, setExpanded] = useState(false)

  // Re-read on mount for SSR / hydration robustness
  useEffect(() => {
    setDismissed(readDismissed())
  }, [])

  if (dismissed) return null

  return (
    <FrostedCard variant="default" as="section" aria-labelledby="cg-heading">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="cg-body"
        className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
      >
        <h3 id="cg-heading" className="text-sm font-semibold text-white">
          Welcome to Prayer Wall
        </h3>
        <ChevronDown
          className={cn('h-4 w-4 text-white/60 transition-transform duration-base', expanded && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div id="cg-body" className="mt-3">
          <p className="text-sm text-white/70 leading-relaxed">
            This is a place for prayer, honest conversation, and presence with one another.
            Posts can be public, friends-only, or anonymous. We keep it kind and real.
          </p>
          <button
            type="button"
            onClick={() => {
              writeDismissed()
              setDismissed(true)
            }}
            className="mt-3 text-sm text-violet-300 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded min-h-[44px] py-2"
            aria-label="Dismiss community guidelines card"
          >
            Got it (don&apos;t show again)
          </button>
        </div>
      )}
    </FrostedCard>
  )
}
```

**Guardrails (DO NOT):**

- DO NOT use `dangerouslySetInnerHTML`.
- DO NOT add exclamation points in the body copy.
- DO NOT create a new reactive store for this — single-consumer flag, plain localStorage is correct.
- DO NOT trigger the dismiss flag write on expand — only on the explicit "Got it" button.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test -- --run CommunityGuidelinesCard.test.tsx` passes
- [ ] Component renders nothing when localStorage has `wr_prayer_wall_guidelines_dismissed=true` before mount

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders collapsed by default | unit | Heading visible; body hidden |
| expands on header tap | unit | Click heading → body becomes visible |
| dismiss writes localStorage flag | unit | Tap "Got it" → `localStorage.getItem(STORAGE_KEY) === 'true'` |
| renders null when already dismissed | unit | Pre-set localStorage flag → component returns null |
| chevron rotates on expand | unit | `chevron.className` contains 'rotate-180' when expanded |

**Expected state after completion:**

- [ ] `CommunityGuidelinesCard.tsx` exists
- [ ] All 5 tests pass
- [ ] Component returns null when flag pre-set

---

### Step 3: Create `LocalSupportPromo.tsx` + tests

**Objective:** Build the right-sidebar Local Support card per D-LocalSupportCopy.

**Files to create/modify:**

- `frontend/src/components/prayer-wall/LocalSupportPromo.tsx`
- `frontend/src/components/prayer-wall/__tests__/LocalSupportPromo.test.tsx`

**Details:**

```tsx
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'

export function LocalSupportPromo() {
  return (
    <FrostedCard variant="default" as="section" aria-labelledby="lsp-heading">
      <h3 id="lsp-heading" className="text-sm font-semibold text-white">
        Need someone to talk to?
      </h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">
        Find a local church, counselor, or Celebrate Recovery group near you.
      </p>
      <Link
        to="/local-support/churches"
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.07] border border-white/[0.12] backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.12] hover:border-white/[0.20] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        Browse Local Support
      </Link>
    </FrostedCard>
  )
}
```

**Guardrails (DO NOT):**

- DO NOT use `bg-primary` solid CTA — Visual Rollout deprecated this on dark surfaces. Use the canonical `Button variant="subtle"` treatment inline (or import `Button` and use `variant="subtle" size="sm" asChild` wrapping the Link).
- DO NOT include exclamation points; copy is calm by design.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test -- --run LocalSupportPromo.test.tsx` passes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders heading + body + CTA | unit | All three strings visible |
| CTA links to /local-support/churches | unit | `screen.getByRole('link').getAttribute('href')` === `/local-support/churches` |
| has aria-labelledby | unit | Section has `aria-labelledby="lsp-heading"` |

**Expected state after completion:**

- [ ] `LocalSupportPromo.tsx` exists
- [ ] All 3 tests pass

---

### Step 4: Create `QotdSidebar.tsx` + tests

**Objective:** Wrap the existing `QuestionOfTheDay` widget in a sidebar slot. Re-uses the existing component (no logic duplication) but ensures it renders correctly in a 280px column.

**Files to create/modify:**

- `frontend/src/components/prayer-wall/QotdSidebar.tsx`
- `frontend/src/components/prayer-wall/__tests__/QotdSidebar.test.tsx`

**Details:**

`QotdSidebar` accepts the same props as `QuestionOfTheDay` and renders the existing widget. The wrapper exists so the layout container (`PrayerWallRightSidebar`) can apply width constraints + spacing without modifying the widget itself. The wrapper may strip or pass through certain props depending on space (e.g., truncate the response count for narrow columns).

```tsx
import { QuestionOfTheDay } from '@/components/prayer-wall/QuestionOfTheDay'

interface QotdSidebarProps {
  responseCount: number
  isComposerOpen: boolean
  onToggleComposer: () => void
  onScrollToResponses: () => void
}

export function QotdSidebar(props: QotdSidebarProps) {
  // Width constraint is applied by the parent PrayerWallRightSidebar.
  // QuestionOfTheDay handles its own internal layout.
  return <QuestionOfTheDay {...props} />
}
```

**Plan note on R4 (QOTD opacity):** `QuestionOfTheDay` currently sets `className="frosted-card-accent-night-aware"` on the FrostedCard wrapper. Once Step 10 removes the palette block, that class is a no-op marker. The FrostedCard's day-state `variant="accent"` style (`bg-violet-500/[0.08]` + `border-violet-400/70`) becomes the SOLE rendered treatment. This is the canonical Tier 1 card style and matches every other Tier 1 card across the app. The "transparent QOTD" complaint is resolved automatically.

**Optional cleanup (Plan-Time Divergence #5):** Step 10 could ALSO strip the `frosted-card-accent-night-aware` marker className from `QuestionOfTheDay.tsx` since it's now a no-op. Plan-time decision: KEEP the marker class (no production effect; signals "this card has a night-mode-aware variant" for future styling). Documented as Plan-Time Divergence #5.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test -- --run QotdSidebar.test.tsx` passes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| forwards all props to QuestionOfTheDay | unit | Snapshot test verifies rendered output matches QuestionOfTheDay |
| renders the QOTD heading | unit | `screen.getByText(/question of the day/i)` (or whichever exact label QOTD uses) |

**Expected state after completion:**

- [ ] `QotdSidebar.tsx` exists
- [ ] All 2 tests pass

---

### Step 5: Create `CategoryFilters.tsx` + tests

**Objective:** Build the unified category filter component. Renders as a stacked vertical list (desktop, in the left sidebar) or a horizontal scroll chip row (mobile). Combines post-type AND topic filters into ONE component. Single-select.

**Files to create/modify:**

- `frontend/src/components/prayer-wall/CategoryFilters.tsx`
- `frontend/src/components/prayer-wall/__tests__/CategoryFilters.test.tsx`

**Details:**

Two render modes controlled by a prop or by the parent's container (CSS-driven via Tailwind). Recommend: render BOTH a desktop stacked layout and a mobile horizontal row, with appropriate visibility classes (`hidden lg:flex flex-col` for desktop list, `flex lg:hidden flex-row overflow-x-auto` for mobile row). One source of truth for state.

```tsx
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'
import { POST_TYPES, type PostType } from '@/constants/post-types'

// 8 topics per brief Section 3 (excludes 'discussion' and 'other' from prayer-categories)
const TOPIC_FILTERS: ReadonlyArray<PrayerCategory> = [
  'health', 'mental-health', 'family', 'work', 'grief', 'gratitude', 'praise', 'relationships'
]

interface CategoryFiltersProps {
  activeCategory: PrayerCategory | null
  activePostType: PostType | null
  onSelectCategory: (category: PrayerCategory | null) => void
  onSelectPostType: (postType: PostType | null) => void
  /** 'desktop' renders stacked sidebar list; 'mobile' renders horizontal chip row. */
  variant: 'desktop' | 'mobile'
}

export function CategoryFilters({
  activeCategory,
  activePostType,
  onSelectCategory,
  onSelectPostType,
  variant,
}: CategoryFiltersProps) {
  const noneActive = activeCategory === null && activePostType === null

  const handleAll = () => {
    onSelectCategory(null)
    onSelectPostType(null)
  }

  const handleType = (t: PostType) => {
    onSelectCategory(null)
    onSelectPostType(t)
  }

  const handleTopic = (c: PrayerCategory) => {
    onSelectPostType(null)
    onSelectCategory(c)
  }

  if (variant === 'mobile') {
    return (
      <nav
        aria-label="Filter prayer wall posts"
        className="w-full"
      >
        <div className="flex flex-nowrap gap-2 overflow-x-auto scroll-smooth px-4 py-3 scrollbar-none">
          <FilterChip label="All" active={noneActive} onClick={handleAll} ariaPressed={noneActive} />
          {POST_TYPES.filter((t) => t.enabled).map((t) => (
            <FilterChip
              key={t.id}
              label={t.pluralLabel}
              active={activePostType === t.id}
              onClick={() => handleType(t.id)}
              ariaPressed={activePostType === t.id}
            />
          ))}
          {TOPIC_FILTERS.map((c) => (
            <FilterChip
              key={c}
              label={CATEGORY_LABELS[c]}
              active={activeCategory === c}
              onClick={() => handleTopic(c)}
              ariaPressed={activeCategory === c}
            />
          ))}
        </div>
      </nav>
    )
  }

  // Desktop stacked list
  return (
    <nav aria-label="Filter prayer wall posts" className="flex flex-col gap-1">
      <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
        Filter posts
      </h3>
      <FilterRow label="All posts" active={noneActive} onClick={handleAll} ariaPressed={noneActive} />

      <h4 className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-white/40">
        By type
      </h4>
      {POST_TYPES.filter((t) => t.enabled).map((t) => (
        <FilterRow
          key={t.id}
          label={t.pluralLabel}
          active={activePostType === t.id}
          onClick={() => handleType(t.id)}
          ariaPressed={activePostType === t.id}
        />
      ))}

      <h4 className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-white/40">
        By topic
      </h4>
      {TOPIC_FILTERS.map((c) => (
        <FilterRow
          key={c}
          label={CATEGORY_LABELS[c]}
          active={activeCategory === c}
          onClick={() => handleTopic(c)}
          ariaPressed={activeCategory === c}
        />
      ))}
    </nav>
  )
}

function FilterRow({ label, active, onClick, ariaPressed }: { label: string; active: boolean; onClick: () => void; ariaPressed: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        active
          ? 'bg-white/15 text-white border border-white/30'
          : 'text-white/70 hover:bg-white/[0.06] hover:text-white border border-transparent'
      )}
    >
      {label}
    </button>
  )
}

function FilterChip({ label, active, onClick, ariaPressed }: { label: string; active: boolean; onClick: () => void; ariaPressed: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={cn(
        'min-h-[44px] shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]',
        active
          ? 'bg-white/15 text-white border-white/30'
          : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90'
      )}
    >
      {label}
    </button>
  )
}
```

**Guardrails (DO NOT):**

- DO NOT render count badges on filters (Gate-G-NO-METRICS-IN-SIDEBARS).
- DO NOT use `border-primary/40 bg-primary/20 text-primary-lt` active state — Visual Rollout deprecated. Use canonical `bg-white/15 text-white border-white/30` muted-white active state.
- DO NOT include `'discussion'` or `'other'` in the topic list (D-decision above).
- DO NOT support multi-select — D-CategorySingleSelect.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test -- --run CategoryFilters.test.tsx` passes
- [ ] Renders both desktop and mobile variants without horizontal scroll bleed

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| desktop variant renders stacked list | unit | All / By type heading / 5 types / By topic heading / 8 topics |
| mobile variant renders horizontal row | unit | All filters in one scrollable row, 'All' first |
| tap topic deselects active type | unit | Initial postType='prayer_request' + tap 'Health' → calls `onSelectPostType(null)` AND `onSelectCategory('health')` |
| tap type deselects active topic | unit | Initial category='family' + tap 'Testimonies' → calls `onSelectCategory(null)` AND `onSelectPostType('testimony')` |
| tap 'All' clears both filters | unit | Initial category='health' + postType='prayer_request' + tap 'All' → both callbacks called with `null` |
| no count badges | unit | No element with `data-count` attribute; no parenthesized numbers in chip labels |
| topic list excludes discussion+other | unit | `screen.queryByText('Discussion')` returns null inside topic group; `screen.queryByText('Other')` returns null |
| active row has aria-pressed=true | unit | Active filter button has `aria-pressed="true"` |

**Expected state after completion:**

- [ ] `CategoryFilters.tsx` exists
- [ ] All 8 tests pass

---

### Step 6: Create `PrayerWallLeftSidebar.tsx` and `PrayerWallRightSidebar.tsx`

**Objective:** Build the two sidebar containers that compose smaller pieces into the layout slots.

**Files to create/modify:**

- `frontend/src/components/prayer-wall/PrayerWallLeftSidebar.tsx`
- `frontend/src/components/prayer-wall/PrayerWallRightSidebar.tsx`

**Details:**

Left sidebar (desktop only) composes: primary nav (the 5 NAV_LINKS — Daily Hub / Bible / Grow / Music / Prayer Wall — repeating the Navbar nav for sidebar discoverability per R2) + `<CategoryFilters variant="desktop">`. Sticky via parent CSS Grid column; internal `overflow-y: auto` for short viewports.

Right sidebar (desktop only) composes: `<QotdSidebar>` + `<LocalSupportPromo>` + `<CommunityGuidelinesCard>`. Same sticky pattern.

```tsx
// PrayerWallLeftSidebar.tsx
import { Link, useLocation } from 'react-router-dom'
import { Book, Calendar, Heart, Music, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryFilters } from '@/components/prayer-wall/CategoryFilters'
import { isNavActive } from '@/components/Navbar'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PostType } from '@/constants/post-types'

const NAV_LINKS = [
  { label: 'Daily Hub', to: '/daily', icon: Calendar },
  { label: 'Study Bible', to: '/bible', icon: Book },
  { label: 'Grow', to: '/grow', icon: TrendingUp },
  { label: 'Music', to: '/music', icon: Music },
  { label: 'Prayer Wall', to: '/prayer-wall', icon: Heart },
] as const

interface Props {
  activeCategory: PrayerCategory | null
  activePostType: PostType | null
  onSelectCategory: (c: PrayerCategory | null) => void
  onSelectPostType: (t: PostType | null) => void
}

export function PrayerWallLeftSidebar({ activeCategory, activePostType, onSelectCategory, onSelectPostType }: Props) {
  const location = useLocation()
  return (
    <aside
      aria-label="Prayer Wall primary navigation"
      className="sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto px-2 py-4"
    >
      <nav aria-label="Primary navigation" className="flex flex-col gap-1 pb-4 border-b border-white/[0.12]">
        {NAV_LINKS.map(({ label, to, icon: Icon }) => {
          const active = isNavActive(to, location.pathname)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium min-h-[44px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 lg:h-4 lg:w-4 xl:h-4 xl:w-4" aria-hidden="true" />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="pt-4">
        <CategoryFilters
          variant="desktop"
          activeCategory={activeCategory}
          activePostType={activePostType}
          onSelectCategory={onSelectCategory}
          onSelectPostType={onSelectPostType}
        />
      </div>
    </aside>
  )
}
```

```tsx
// PrayerWallRightSidebar.tsx
import { QotdSidebar } from '@/components/prayer-wall/QotdSidebar'
import { LocalSupportPromo } from '@/components/prayer-wall/LocalSupportPromo'
import { CommunityGuidelinesCard } from '@/components/prayer-wall/CommunityGuidelinesCard'

interface Props {
  qotdResponseCount: number
  qotdComposerOpen: boolean
  onToggleQotdComposer: () => void
  onScrollToQotdResponses: () => void
}

export function PrayerWallRightSidebar(props: Props) {
  return (
    <aside
      aria-label="Prayer Wall secondary content"
      className="sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto flex flex-col gap-4 px-2 py-4"
    >
      <QotdSidebar
        responseCount={props.qotdResponseCount}
        isComposerOpen={props.qotdComposerOpen}
        onToggleComposer={props.onToggleQotdComposer}
        onScrollToResponses={props.onScrollToQotdResponses}
      />
      <LocalSupportPromo />
      <CommunityGuidelinesCard />
    </aside>
  )
}
```

**Guardrails (DO NOT):**

- DO NOT add ANY metrics widgets to either sidebar — Gate-G-NO-METRICS-IN-SIDEBARS.
- DO NOT add notification badges to sidebar nav.
- DO NOT add a sidebar-collapse toggle (out of scope per Section 4).

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] Both components import cleanly

**Test specifications:**

No standalone tests — coverage via integration tests in Step 8.

**Expected state after completion:**

- [ ] Both files exist
- [ ] PrayerWall.tsx (Step 8) imports them successfully

---

### Step 7: Mount `<NightModeBadge>` in `Navbar.tsx`

**Objective:** Add NightModeBadge to the user-state slot of the global Navbar so it appears next to user avatar / Log In on every route at night hours.

**Files to create/modify:**

- `frontend/src/components/Navbar.tsx`

**Details:**

Add mount point next to `<DesktopUserActions />` / `<DesktopAuthActions />` for desktop, and to `MobileDrawer` for mobile. The badge itself returns `null` when night mode inactive, so it's safe to mount unconditionally.

Modify the JSX block at lines 197–201:

```tsx
{isAuthenticated ? (
  <div className="hidden items-center gap-3 md:flex">
    <NightModeBadge />
    <DesktopUserActions />
  </div>
) : (
  <div className="hidden items-center gap-3 md:flex">
    <NightModeBadge />
    <DesktopAuthActions transparent={transparent} />
  </div>
)}
```

Import at the top:

```tsx
import { NightModeBadge } from '@/components/prayer-wall/NightModeBadge'
```

**Mobile mount:** Add `<NightModeBadge />` to `MobileDrawer` (in `MobileDrawer.tsx`) at the top of the drawer header, OR adjacent to the hamburger in `Navbar.tsx` itself. Plan-time decision: mount NightModeBadge ADJACENT to the hamburger button at mobile (always visible if active), not inside the drawer. This matches D-ChipPosition ("On mobile, chip sits in the existing top nav area, sized to fit").

Add inside the flex row at line 195 (`<div className="flex items-center justify-between px-6 py-3">`), just before the hamburger button at line 205:

```tsx
{/* NightModeBadge: mobile mount adjacent to hamburger (md:hidden) */}
<div className="md:hidden">
  <NightModeBadge />
</div>
```

**Guardrails (DO NOT):**

- DO NOT conditionally render NightModeBadge based on `pathname` — it's a global indicator. The component itself returns `null` when night mode is inactive. Mounting it always is the correct discipline.
- DO NOT modify `MobileDrawer.tsx` — keep changes scoped to `Navbar.tsx`.
- DO NOT change navbar layout otherwise (no resizing, no font changes, no new nav items).

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test -- --run Navbar.test.tsx` passes (existing tests untouched)
- [ ] Visual smoke: navbar at desktop + mobile, day + night (mocked clock), looks correct

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Navbar renders NightModeBadge on desktop | integration | Mock `useNightMode` to return `active: true` → badge visible in user-state slot |
| Navbar renders NightModeBadge on mobile | integration | Same as above, viewport width 375px, badge visible adjacent to hamburger |
| Navbar does not render badge when night inactive | integration | Mock `useNightMode` `active: false` → badge not in DOM |

**Expected state after completion:**

- [ ] Navbar.tsx imports and mounts NightModeBadge
- [ ] All Navbar tests pass

---

### Step 8: Rewrite `PrayerWall.tsx` with 3-column CSS Grid

**Objective:** Wrap PrayerWall content in `<div className="prayer-wall-grid">` and mount sidebars. Remove the existing `<NightWatchChip>` mount (badge now lives in Navbar). Remove the two stacked filter bars (RoomSelector + CategoryFilterBar) — replaced by left-sidebar CategoryFilters at desktop and a mobile horizontal row.

**Files to create/modify:**

- `frontend/src/pages/PrayerWall.tsx`

**Details:**

Key changes:

1. Remove `import { NightWatchChip } from '@/components/prayer-wall/NightWatchChip'`.
2. Remove the `<NightWatchChip source={nightSource} />` mount inside `PrayerWallHero`'s `nightWatchChip` prop.
3. Remove imports of `RoomSelector` and `CategoryFilterBar`.
4. Remove the JSX block at lines 942–965 (sticky filter sentinel + RoomSelector + CategoryFilterBar).
5. Add imports for `PrayerWallLeftSidebar`, `PrayerWallRightSidebar`, `CategoryFilters`.
6. Wrap the post-hero content in a grid container:

```tsx
<BackgroundCanvas
  className="flex min-h-screen flex-col font-sans"
  nightMode={nightActive ? 'on' : 'off'}
>
  <SEO ... />
  <Navbar transparent />
  {watchMode.active && (
    <div className="mx-auto mt-4 w-full max-w-3xl px-4">
      <CrisisResourcesBanner />
    </div>
  )}
  <PrayerWallHero
    subtitle={getNightModeCopy('heroSubtitle', nightActive)}
    nightWatchChip={null}  {/* now lives in Navbar globally */}
    watchIndicator={watchMode.active ? <WatchIndicator /> : null}
    action={ /* same as before */ }
  />

  <div className="prayer-wall-grid mx-auto w-full max-w-[1240px] flex-1 px-4">
    {/* Left sidebar — desktop only (≥1280px) */}
    <PrayerWallLeftSidebar
      activeCategory={activeCategory}
      activePostType={activePostType}
      onSelectCategory={handleSelectCategory}
      onSelectPostType={handleSelectPostType}
    />

    <main id="main-content" className="w-full max-w-[720px] mx-auto py-6 sm:py-8">
      {/* Mobile horizontal category filter row — visible only at <1280px */}
      <div className="lg:hidden">
        <div ref={filterSentinelRef} aria-hidden="true" />
        <div
          className={cn(
            'sticky top-0 z-30 transition-shadow motion-reduce:transition-none -mx-4 bg-hero-mid/90 backdrop-blur-sm border-b border-white/[0.12]',
            isFilterSticky && 'shadow-md'
          )}
        >
          <CategoryFilters
            variant="mobile"
            activeCategory={activeCategory}
            activePostType={activePostType}
            onSelectCategory={handleSelectCategory}
            onSelectPostType={handleSelectPostType}
          />
        </div>
      </div>

      {/* QOTD card — mobile/tablet only (right sidebar shows it on desktop) */}
      <div className="mb-4 lg:hidden">
        <QuestionOfTheDay {...qotdProps} />
        <QotdComposer ... />
      </div>

      {isLoading ? <PrayerWallSkeleton /> : fetchError ? ... : (
        <>
          {/* 4.7 ComposerChooser, InlineComposer — unchanged */}
          {chooserOpen && <ComposerChooser ... />}
          <InlineComposer ... />

          {/* Screen reader announcement — unchanged */}
          <div className="sr-only" aria-live="polite">...</div>

          {/* Prayer cards feed — unchanged */}
          <div className="flex flex-col gap-4" ref={prayerListRef}>
            {filteredPrayers.map(...)}
          </div>

          {/* Empty states — unchanged */}
          ...

          {/* Load More — unchanged */}
          ...
        </>
      )}
    </main>

    {/* Right sidebar — desktop only (≥1280px) */}
    <PrayerWallRightSidebar
      qotdResponseCount={qotdResponseCount}
      qotdComposerOpen={qotdComposerOpen}
      onToggleQotdComposer={handleToggleQotdComposer}
      onScrollToQotdResponses={handleScrollToQotdResponses}
    />
  </div>

  <SiteFooter />
  {composerTooltip.shouldShow && <TooltipCallout ... />}
</BackgroundCanvas>
```

Key UI logic preserved (do not touch):
- `useStaggeredEntrance` + `getPrayerStaggerProps`
- Backend / mock branching (`isBackendPrayerWallEnabled()`)
- Comment fetching + pagination
- Optimistic update logic (`handleTogglePraying`, `handleResolve`, etc.)
- All toast / celebration timeouts
- Crisis banner mount above hero
- `PrayerCard` render path unchanged (per Section 10 NOT to modify)

Update `PrayerWallHero.tsx` to accept `nightWatchChip={null}` cleanly (likely already a nullable prop — verify; if not, no-op cleanup is needed).

**Guardrails (DO NOT):**

- DO NOT modify `PrayerCard.tsx`, `InteractionBar.tsx`, `CommentsSection.tsx`, `InlineComposer.tsx`, `ComposerChooser.tsx`, `PrayerReceipt.tsx`, `SaveToPrayersForm.tsx`, `WatchIndicator.tsx`, `CrisisResourcesBanner.tsx`, `IntercessorTimeline.tsx` (per Section 10 NOT-to-modify list).
- DO NOT change the QOTD's interaction model — only its rendering location.
- DO NOT change auth modal subtitles / cta strings.
- DO NOT remove `recordActivity`, `getBadgeData`/`saveBadgeData`, or other side-effect calls.
- DO NOT introduce metrics in sidebars.
- DO NOT introduce horizontal scroll at any viewport — Gate-G-RESPONSIVE-VERIFIED.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm build` passes
- [ ] All existing PrayerWall tests pass: `pnpm test -- --run PrayerWall.test.tsx`
- [ ] Sticky regression suite passes: `pnpm exec playwright test e2e/sticky-regression.spec.ts`
- [ ] Manual visual check: open `/prayer-wall` at 1440, 1024, 768, 375px — layouts match brief Section 3

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders 3-column grid at ≥1280px | integration | `getByRole('aside', { name: /primary navigation/i })` + main + `getByRole('aside', { name: /secondary/i })` all visible |
| collapses to single column <768px | integration | Both asides hidden; mobile category row visible |
| QOTD renders inline on mobile, in sidebar on desktop | integration | Conditional render check |
| category filter via sidebar updates URL params | integration | Click 'Mental Health' in sidebar → `?category=mental-health` in URL |
| postType filter via sidebar updates URL params | integration | Click 'Testimonies' in sidebar → `?postType=testimony` in URL |
| 'All posts' clears both filters | integration | Click 'All posts' → both `?category=` and `?postType=` removed |

**Expected state after completion:**

- [ ] PrayerWall.tsx no longer imports NightWatchChip, RoomSelector, or CategoryFilterBar
- [ ] All 6 integration tests pass
- [ ] All existing PrayerWall tests still pass (regression check)

---

### Step 9: Update `Settings.tsx` (via `PrivacySection.tsx`) Night Mode labels

**Objective:** Align `NIGHT_MODE_OPTIONS` labels with chip cycle semantics (drop "Always" verb).

**Files to create/modify:**

- `frontend/src/components/settings/PrivacySection.tsx`
- `frontend/src/components/settings/__tests__/PrivacySection.test.tsx` (test name update)

**Details:**

Modify `NIGHT_MODE_OPTIONS` constant at lines 40–44:

```tsx
// Spec 6.3 — Night Mode 3-state preference (Prayer Wall Redesign — labels
// aligned with NightModeBadge cycle: Off / Auto / On. No "Always" verb.)
const NIGHT_MODE_OPTIONS = [
  { value: 'off',  label: 'Off' },
  { value: 'auto', label: 'Auto (9pm – 6am)' },
  { value: 'on',   label: 'On' },
]
```

Reorder to match cycle (Off / Auto / On). Drops the word "Always" entirely.

Update `PrivacySection.test.tsx` line 301: rename test `'selecting "Always on" calls onUpdatePrayerWall with nightMode="on"'` to `'selecting "On" calls onUpdatePrayerWall with nightMode="on"'`, and similarly for the "Always off" case. Update any `screen.getByText('Always on')` → `screen.getByText('On')`.

**Guardrails (DO NOT):**

- DO NOT modify the `RadioPillGroup` component or other PrivacySection sections.
- DO NOT modify `useSettings` / `updatePrayerWall` — only the displayed labels.
- DO NOT change the underlying `NightModePreference` type values (`'off' | 'auto' | 'on'`) — those remain canonical.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test -- --run PrivacySection.test.tsx` passes (with renamed tests)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders Off / Auto / On labels | unit | All three labels present; no "Always" string anywhere |
| selecting "On" writes nightMode='on' | unit | Click "On" → `updatePrayerWall({ nightMode: 'on' })` |
| selecting "Off" writes nightMode='off' | unit | Click "Off" → `updatePrayerWall({ nightMode: 'off' })` |
| selecting "Auto" writes nightMode='auto' | unit | Click "Auto" → `updatePrayerWall({ nightMode: 'auto' })` |

**Expected state after completion:**

- [ ] PrivacySection has Off / Auto / On labels
- [ ] All PrivacySection tests pass

---

### Step 10: Remove `[data-night-mode='on']` palette block from `index.css` + add `.prayer-wall-grid` rules + NightWatchChip deprecation shim

**Objective:** Delete the brown / warm-amber CSS palette. Add the 3-column responsive grid rules. Convert `NightWatchChip.tsx` to a deprecation re-export of `NightModeBadge` (W7).

**Files to create/modify:**

- `frontend/src/index.css` — delete lines 129–225 (palette block) and lines 232–234 (`html[data-prayer-wall-night-mode-pending='on'] body` rule); add `.prayer-wall-grid` rules.
- `frontend/src/components/prayer-wall/NightWatchChip.tsx` — convert to deprecation shim.
- `frontend/src/components/prayer-wall/__tests__/NightWatchChip.test.tsx` — RENAME the file to `NightModeBadge.test.tsx` (already done in Step 1); the old NightWatchChip tests are superseded. Plan-time decision: KEEP a minimal smoke test in NightWatchChip.test.tsx that imports the deprecation shim and verifies it re-exports NightModeBadge (for forward-compat guarantee).

**Details:**

**Part A — `frontend/src/index.css`:**

Delete lines 121–225 inclusive (the entire `[data-night-mode='on']` block and its comments). Delete lines 230–234 (the FOUC body backdrop rule). Delete the keyframe comment at lines 236–238 (`.night-pulse` is no longer used).

Add after the `bookmark marker hover brightening` block (after line 119) and before the next section:

```css
/* ---------------------------------------------------------------------- */
/* Prayer Wall Redesign — 3-column CSS Grid layout.
   Mobile-first: single column. Tablet (≥768px): left icon rail + main.
   Desktop (≥1280px): left nav + main + right sidebar.
   The center column max-width keeps reading-line ergonomic on ultra-wide. */
/* ---------------------------------------------------------------------- */
.prayer-wall-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

@media (min-width: 768px) {
  .prayer-wall-grid {
    grid-template-columns: 64px 1fr;
    gap: 1rem;
  }
}

@media (min-width: 1280px) {
  .prayer-wall-grid {
    grid-template-columns: 240px 1fr 280px;
    gap: 1.5rem;
  }
}
```

The center-column max-width is enforced on the `<main>` element via Tailwind (`max-w-[720px] mx-auto`) inside PrayerWall.tsx, so it works in all three grid configurations.

**Part B — `frontend/src/components/prayer-wall/NightWatchChip.tsx`:**

Replace the entire file with a deprecation shim:

```tsx
/**
 * @deprecated since Prayer Wall Redesign (2026-05-13).
 * NightWatchChip has been replaced by NightModeBadge, which lives in the
 * global Navbar instead of the PrayerWallHero. This shim is preserved for
 * one release cycle to avoid breaking external imports; new code should
 * import NightModeBadge directly.
 *
 * Note: the original NightWatchChip accepted a `source: 'auto' | 'manual'`
 * prop, but NightModeBadge reads source from the hook directly. The shim
 * accepts (and ignores) the legacy prop for type compatibility. Callers
 * should remove the prop when migrating.
 */
import { NightModeBadge } from '@/components/prayer-wall/NightModeBadge'

interface NightWatchChipProps {
  source?: 'auto' | 'manual'
}

export function NightWatchChip(_props: NightWatchChipProps) {
  return <NightModeBadge />
}
```

**Part C — tests update:**

- The original `NightWatchChip.test.tsx` had two cases asserting "(always on)" copy (per spec-recon). Those test cases must be DELETED or INVERTED.
- Plan: DELETE `frontend/src/components/prayer-wall/__tests__/NightWatchChip.test.tsx` entirely. The shim has trivial behavior (renders NightModeBadge unconditionally); no dedicated test needed. The replacement `NightModeBadge.test.tsx` (Step 1) provides coverage of the actual behavior. Document the deletion as Plan-Time Divergence #2.

**Part D — `index.html` no-FOUC inline script:**

KEEP the inline script unchanged (Plan-Time Divergence #1). It still writes `data-prayer-wall-night-mode-pending` to `<html>`, but the CSS rule that consumed it is gone. The attribute persists as a forward-compat signal for any future non-brown night-mode styling. Removing the script would require deleting the parity test (`night-mode-resolver-parity.test.ts`); keeping it preserves the test + leaves a clear escape hatch.

**Guardrails (DO NOT):**

- DO NOT delete `frontend/src/lib/night-mode-resolver.ts` (still used by `useNightMode`).
- DO NOT delete `frontend/src/lib/__tests__/night-mode-resolver.test.ts` or `frontend/src/lib/__tests__/night-mode-resolver-parity.test.ts`.
- DO NOT delete `frontend/src/hooks/useNightMode.ts` or its test — D-PreserveHook.
- DO NOT delete `frontend/src/constants/night-mode-copy.ts` — D-PreserveCopyVariants.
- DO NOT delete the `BackgroundCanvas.tsx` `nightMode` prop — the attribute is still applied to `data-night-mode` on the div, just with no CSS consumer. Tests + future styling preserve it.
- DO NOT delete the inline FOUC script in `index.html` (Plan-Time Divergence #1).
- DO NOT touch `tailwind.config.js` `keyframes['night-pulse']` (orphan keyframe; harmless; deferred to a future cleanup spec).
- DO NOT add the `.prayer-wall-grid` rule inside a Tailwind `@layer` (keep it as a plain CSS rule to ensure media queries cascade correctly — Tailwind layers have caused similar specificity issues before).
- DO NOT add inline styles to PrayerWall.tsx for the grid; keep all responsive layout in the CSS class.

**Verification:**

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm build` passes
- [ ] `pnpm exec vitest run` passes
- [ ] No CSS variable `var(--pw-night-*)` is referenced anywhere in the codebase: `grep -r "var(--pw-night" frontend/src` returns empty (NightWatchChip shim now renders NightModeBadge which uses Tailwind tokens).
- [ ] No `frosted-card-night-aware`, `prayer-card-night-aware`, `text-white-night-aware`, `text-white-muted-night-aware`, `frosted-card-accent-night-aware`, `data-night-hero-heading` produces visible style — they're no-op markers.
- [ ] No "always on" string anywhere: `grep -ri 'always on' frontend/src` returns empty (W8).
- [ ] Sticky regression: `pnpm exec playwright test e2e/sticky-regression.spec.ts` passes (BackgroundCanvas overflow-x-clip + the new grid don't trap sticky).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| useNightMode hook returns active=true at 23:00 with userPreference='auto' | unit (existing, regression) | Existing test, must still pass |
| useNightMode returns correct shape `{ active, source, userPreference }` | unit (existing, regression) | Public API unchanged — Gate-G-PRESERVE-NIGHT-MODE-HOOK |
| 6.4 useWatchMode still composes useNightMode | unit (existing, regression) | Watch hours still trigger active=true when both inputs align |
| index.css does not contain `[data-night-mode='on']` selector | grep test in CI (or vitest unit test reading the file) | `expect(indexCss).not.toMatch(/\[data-night-mode='on'\]/)` |
| `.prayer-wall-grid` rule exists in index.css | grep / unit | `expect(indexCss).toMatch(/\.prayer-wall-grid/)` |
| no "always on" copy anywhere in components | grep / unit | Recurses all `frontend/src/**/*.{ts,tsx}` for `/always on/i` and asserts empty |
| NightWatchChip shim re-exports NightModeBadge | unit (optional smoke) | Renders the shim; expects the same DOM as NightModeBadge |

**Expected state after completion:**

- [ ] No brown gradient anywhere
- [ ] All Night Mode hook/resolver tests pass (regression-clean)
- [ ] `.prayer-wall-grid` responsive rules active at the three breakpoints
- [ ] NightWatchChip is a deprecation shim

---

### Step 11: Document `wr_prayer_wall_guidelines_dismissed` in `11-local-storage-keys.md`

**Objective:** Per project rule (`04-frontend-standards.md` + `06-testing.md` Definition of Done) and the brief's Section 10, document the new localStorage key.

**Files to create/modify:**

- `.claude/rules/11-local-storage-keys.md`

**Details:**

Add a new row under the most appropriate section. Looking at existing sections, "Prayer Wall" is the obvious fit. Add a new row to that table:

```markdown
| `wr_prayer_wall_guidelines_dismissed` | `"true"` | Community Guidelines card dismissal flag (Prayer Wall Redesign — 2026-05-13). Set when user taps "Got it (don't show again)" on the right-sidebar Community Guidelines card. Read on `CommunityGuidelinesCard` mount; if `"true"`, card returns null. Browser-local (not synced); per-device dismissal. Survives logout. Future spec may migrate to server-backed dual-write settings if user feedback indicates the per-device persistence is annoying. |
```

Actually since this table doesn't exist yet exactly, look at the existing "Prayer Wall" section (around line 144 of 11-local-storage-keys.md). It's a single-row table with `wr_prayer_reactions`. Add a second row immediately after.

**Guardrails (DO NOT):**

- DO NOT introduce a new prefix — `wr_` is correct.
- DO NOT add this to 11b (Bible-redesign file) — Prayer Wall is canonical 11 territory.
- DO NOT promise dual-write or sync — Section 12 explicitly defers that.

**Verification:**

- [ ] Markdown lints clean (no broken table)
- [ ] Key is documented with type, description, and dismissal semantics

**Test specifications:**

No automated test — documentation update only.

**Expected state after completion:**

- [ ] `wr_prayer_wall_guidelines_dismissed` documented in 11-local-storage-keys.md

---

### Step 12: Playwright E2E + accessibility tests

**Objective:** Build the Playwright responsive + visual + a11y suite required by Gate-G-RESPONSIVE-VERIFIED and Gate-G-A11Y.

**Files to create/modify:**

- `frontend/e2e/prayer-wall-redesign.spec.ts`

**Details:**

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BREAKPOINTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet-wide', width: 1024, height: 768 },
  { name: 'tablet-narrow', width: 768, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const

test.describe('Prayer Wall Redesign — responsive layouts', () => {
  for (const bp of BREAKPOINTS) {
    test(`layout at ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await page.goto('/prayer-wall')
      await page.waitForLoadState('networkidle')

      // No horizontal scroll at any viewport
      const documentScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(documentScrollWidth).toBeLessThanOrEqual(bp.width + 1)

      // Brown gradient must not exist
      const bodyBg = await page.evaluate(() => {
        const canvas = document.querySelector('[data-testid="background-canvas"]')
        return canvas ? getComputedStyle(canvas).background : ''
      })
      expect(bodyBg).not.toMatch(/#1f1a17/i)

      // Visual snapshot (regression guard)
      await expect(page).toHaveScreenshot(`prayer-wall-${bp.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      })
    })
  }

  test('night state at 11pm desktop — no palette change', async ({ page, context }) => {
    // Mock the clock to 11pm via Date override
    await context.addInitScript(() => {
      const FakeDate = class extends Date {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) {
            super('2026-05-13T23:00:00')
          } else {
            super(...args)
          }
        }
        static now() {
          return new FakeDate().getTime()
        }
      }
      // @ts-expect-error patch
      window.Date = FakeDate
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    // NightModeBadge visible in navbar (not in hero)
    const badge = page.getByRole('button', { name: /night mode is/i })
    await expect(badge).toBeVisible()

    // No brown gradient
    const bodyBg = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="background-canvas"]')
      return canvas ? getComputedStyle(canvas).background : ''
    })
    expect(bodyBg).not.toMatch(/#1f1a17/i)

    // No "(always on)" text
    await expect(page.getByText(/always on/i)).toHaveCount(0)

    // Hero subtitle uses night variant (if night-mode copy variant differs)
    const heroSubtitle = page.locator('h1 + p').first()
    // Just verify content exists — exact night copy is verified in unit tests
    await expect(heroSubtitle).toBeVisible()
  })
})

test.describe('Prayer Wall Redesign — accessibility', () => {
  for (const bp of BREAKPOINTS) {
    test(`axe-core at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await page.goto('/prayer-wall')
      await page.waitForLoadState('networkidle')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })
  }

  test('keyboard-only navigation traversal at desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/prayer-wall')
    await page.waitForLoadState('networkidle')

    // Tab through: skip link → navbar → left sidebar nav → categories → main → right sidebar
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toContainText(/skip/i)

    // Cycle through a reasonable subset and confirm focus reaches expected regions
    let foundLeftSidebar = false
    let foundMain = false
    let foundRightSidebar = false
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        return {
          tag: el?.tagName,
          aria: el?.getAttribute('aria-label'),
          inAside: !!el?.closest('aside'),
          asideLabel: el?.closest('aside')?.getAttribute('aria-label'),
          inMain: !!el?.closest('main'),
        }
      })
      if (focused.asideLabel?.match(/primary navigation/i)) foundLeftSidebar = true
      if (focused.inMain) foundMain = true
      if (focused.asideLabel?.match(/secondary/i)) foundRightSidebar = true
      if (foundLeftSidebar && foundMain && foundRightSidebar) break
    }
    expect(foundLeftSidebar).toBe(true)
    expect(foundMain).toBe(true)
    expect(foundRightSidebar).toBe(true)
  })
})
```

**Guardrails (DO NOT):**

- DO NOT skip the brown-gradient regression check in the visual snapshots — that's the single biggest visual change.
- DO NOT exceed `maxDiffPixelRatio: 0.02` in snapshots (visual rollout precedent — keep snapshots tight).
- DO NOT include time-sensitive content in snapshots (mock the clock; mock the QOTD).

**Verification:**

- [ ] `pnpm exec playwright test prayer-wall-redesign.spec.ts` passes
- [ ] Snapshot images are checked in to `frontend/e2e/prayer-wall-redesign.spec.ts-snapshots/` (or wherever the Playwright config puts them — verify against existing pattern in `e2e/sticky-regression.spec.ts-snapshots/`)

**Test specifications:**

Tests in this step (all Playwright):

| Test | Type | Description |
|------|------|-------------|
| layout at 1440px (desktop, full 3-col) | Playwright | Visual snapshot + no horizontal scroll + no brown gradient |
| layout at 1024px (tablet-wide, 2-col) | Playwright | Visual snapshot + no horizontal scroll + no brown gradient |
| layout at 768px (tablet-narrow, 2-col) | Playwright | Visual snapshot + no horizontal scroll + no brown gradient |
| layout at 375px (mobile, single column) | Playwright | Visual snapshot + no horizontal scroll + no brown gradient |
| night state at 11pm desktop | Playwright | Badge visible, no brown gradient, no "always on" text |
| axe-core at 1440/1024/768/375px | Playwright × 4 | Zero violations |
| keyboard navigation traversal | Playwright | Focus reaches left sidebar → main → right sidebar |

**Expected state after completion:**

- [ ] 11 new Playwright test cases (4 visual + 1 night-state + 4 axe + 1 traversal + 1 sticky regression existing — already passes)
- [ ] All pass with snapshots committed

---

## Plan Tightening Audit

| Lens | Result | Notes |
|---|---|---|
| 1. Schema state explicit | N/A | No schema changes. |
| 2. Existing entity / class / file reuse | **OK** | NightWatchChip → deprecation shim; CategoryFilterBar + RoomSelector kept (W7 philosophy); QuestionOfTheDay reused via QotdSidebar wrapper; FrostedCard reused. |
| 3. SQL-side counter updates | N/A | Frontend-only. |
| 4. Activity engine fire | N/A | No new activity events. |
| 5. SecurityConfig rule ordering | N/A | Frontend-only. |
| 6. Validation surface | N/A | No new inputs. |
| 7. Pattern A clarification | N/A | No new reactive stores. The Guidelines flag is a plain localStorage boolean per Edge Cases & Decisions table. |
| 8. BB-45 cross-mount subscription test | N/A | No new reactive stores. |
| 9. Step dependency map | **OK** | See "Step Dependency Map" below. |
| 10. Test count vs brief | **OK** | Brief target ~18 tests; plan delivers 18 unit/integration + 11 Playwright = 29 total. Excess attributed to multi-breakpoint axe-core runs (4 viewports × 1 scan = 4 tests) and the storage-key documentation step. |
| 11. L1-cache trap | N/A | No backend. |
| 12. `@Modifying` flags | N/A | No backend. |
| 13. Caffeine-bounded caches | N/A | No backend. |
| 14. Domain-scoped advice | N/A | No backend. |
| 15. Crisis content via CrisisAlertService | N/A | This redesign does NOT touch crisis-detection paths. `CrisisResourcesBanner` mount in PrayerWall.tsx is PRESERVED. |
| Extra — D-PreserveHook | **OK** | `useNightMode.ts`, `useWatchMode.ts`, `night-mode-resolver.ts`, `night-mode-copy.ts` all in NOT-to-modify list. No step touches them. |
| Extra — Sticky regression | **OK** | `BackgroundCanvas.tsx` keeps `overflow-x-clip`; new `.prayer-wall-grid` is a CSS Grid, not a flex/overflow container; existing sticky-regression test passes. |
| Extra — Animation token discipline | **OK** | NightModeBadge popover uses `transition-colors` (Tailwind canonical), CommunityGuidelinesCard uses `transition-transform duration-base` (animation token). No hardcoded `200ms` or `cubic-bezier(...)`. |
| Extra — `border-white/[0.12]` border opacity | **OK** | All new components use `border-white/[0.12]`. |
| Extra — Active state convention | **OK** | All active selections use `bg-white/15 text-white border-white/30` (canonical muted-white). No `border-primary/40 bg-primary/20 text-primary-lt` (deprecated). |
| Extra — White pill CTA pattern | **OK** | LocalSupportPromo CTA uses `Button variant="subtle"` treatment inline (matches "Pattern 2 with violet text-button alternative" guidance). |

---

## Plan-Time Divergences from Brief

| # | Decision | Reason | Reversible? |
|---|---|---|---|
| 1 | KEEP the no-FOUC inline script in `index.html` (lines 37–67) and the `night-mode-resolver.ts` library, even though the consuming CSS (`html[data-prayer-wall-night-mode-pending='on'] body`) is being removed. | The script + resolver form a parity-tested pair (`night-mode-resolver-parity.test.ts`). Deleting them requires deleting the test; keeping them costs ~30 LOC and preserves a forward-compat signal layer for any future non-brown night-mode styles (e.g., a quieter star density or text-color shift). Cleanup deferred to a future spec if the pair stays unused. | Yes — future cleanup spec can remove both atomically. |
| 2 | DELETE `frontend/src/components/prayer-wall/__tests__/NightWatchChip.test.tsx` entirely (do NOT migrate test cases). | Two of its assertions ("(always on)" copy) are inverted by W8; the rest of its behavior is covered by `NightModeBadge.test.tsx` in Step 1. The shim itself has trivial behavior (always renders NightModeBadge). Migrating the file as a smoke test for the shim adds noise. | Yes — a future cleanup spec can re-add a one-line shim test if needed. |
| 3 | KEEP `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` and `RoomSelector.tsx` as orphan files (no production consumers post-redesign). | Matches W7 (NightWatchChip deprecation shim philosophy). Section 10's "To DELETE: None in v1" is explicit. Future cleanup spec removes both. | Yes — future cleanup spec can delete. |
| 4 | The new `CategoryFilters` component EXCLUDES `'discussion'` and `'other'` from the "By topic" list (8 topics only, per brief Section 3). The full `PRAYER_CATEGORIES` constant (10 entries) is NOT used; a hand-written `TOPIC_FILTERS` array of 8 entries lives inside the component. | Brief Section 3 lists exactly 8 topics. `'discussion'` is also a post type (UX confusion); `'other'` is a catch-all (no user-friendly meaning). The full constant remains untouched for backend compat. | Yes — adding `'discussion'` or `'other'` to `TOPIC_FILTERS` is a 1-line change if user feedback demands. |
| 5 | KEEP the no-op marker classes (`frosted-card-night-aware`, `prayer-card-night-aware`, `text-white-night-aware`, `text-white-muted-night-aware`, `frosted-card-accent-night-aware`) in their consuming components (PrayerWallHero, QuestionOfTheDay). They render no styles after Step 10. | The classes are passive markers identifying "this surface was night-aware." Future styling (if Prayer Wall ever re-introduces a non-brown night palette) can re-target the same classes. Removing them creates a one-cycle cleanup burden with no offsetting benefit. | Yes — a future cleanup spec can strip them all in one pass. |
| 6 | The desktop left sidebar duplicates the Navbar's nav links (Daily Hub / Bible / Grow / Music / Prayer Wall). Intentional per brief Section 6 R2 recommendation ("top nav stays as thin header with sidebar adding ADDITIONAL nav surface"). | Removing the duplication would either (a) hide Navbar on `/prayer-wall` desktop (loses cross-route consistency) or (b) hide the sidebar nav (loses discoverability of the new layout). Brief explicitly chose duplication. | Yes — a future spec can drop the sidebar nav links if user feedback indicates the redundancy is excessive. |
| 7 | At tablet (md-xl, 768–1279px) the 64px left rail shows **nav icons only** — `CategoryFilters` (desktop variant) is NOT rendered in the rail. The horizontal `CategoryFilters` (mobile variant) in the main column handles filter UI at this range instead. Spec Section 3 / acceptance criterion M wanted "category labels hidden, icons + tooltips remain" in the rail itself. Documented post-review (Blocker 1 + Medium 5 reconciliation). | Mapping each of the 5 post-types and 8 topics to a Lucide icon is real design work — several topics (Grief, Praise, Gratitude, Relationships) have no canonical icon. Rather than ship an inaccurate icon mapping or block the wave, we deliver a working tablet 2-column layout where the category filter UI lives one viewport-section south of the spec target (in the main column's horizontal scroll row, not the left rail). Functionally identical filter behavior; semantically equivalent (single-select, same active-state styling); only the visual location differs at md-xl. | Yes — a follow-up spec can add a `variant="rail"` icon-only mode to `CategoryFilters` with a vetted icon taxonomy. Until then this is the lowest-risk way to honor the spec's working tablet 2-col layout without inventing icons. |

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create NightModeBadge.tsx + tests |
| 2 | — | Create CommunityGuidelinesCard.tsx + tests |
| 3 | — | Create LocalSupportPromo.tsx + tests |
| 4 | — | Create QotdSidebar.tsx + tests |
| 5 | — | Create CategoryFilters.tsx + tests |
| 6 | 2, 3, 4, 5 | Create PrayerWallLeftSidebar + RightSidebar (composes Steps 2–5) |
| 7 | 1 | Mount NightModeBadge in Navbar.tsx |
| 8 | 5, 6, 7 | Rewrite PrayerWall.tsx with 3-column grid |
| 9 | — | Update Settings.tsx Night Mode labels (parallelizable with 1–8) |
| 10 | 7, 8 | Remove `[data-night-mode='on']` palette from index.css + NightWatchChip shim |
| 11 | 2 | Document `wr_prayer_wall_guidelines_dismissed` in 11-local-storage-keys.md |
| 12 | 8, 10 | Playwright E2E + a11y tests |

**Parallelizable groups:**

- Steps 1, 2, 3, 4, 5 can run in any order (no inter-dependencies).
- Step 9 can run any time (Settings is independent of layout).
- Step 11 can run after Step 2.
- Step 7 must precede Step 10 (CSS removal would break NightWatchChip's `var(--pw-night-*)` consumption until Step 10 also lands the shim).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create NightModeBadge.tsx + tests | [COMPLETE] | 2026-05-13 | Created `NightModeBadge.tsx` + 8-test file. All tests pass; tsc clean. |
| 2 | Create CommunityGuidelinesCard.tsx + tests | [COMPLETE] | 2026-05-13 | Created card + 5 tests; chevron rotation test uses `getAttribute('class')` for SVG. |
| 3 | Create LocalSupportPromo.tsx + tests | [COMPLETE] | 2026-05-13 | Created promo + 3 tests. All pass. |
| 4 | Create QotdSidebar.tsx + tests | [COMPLETE] | 2026-05-13 | Thin wrapper around QuestionOfTheDay; 2 forwarding tests pass. |
| 5 | Create CategoryFilters.tsx + tests | [COMPLETE] | 2026-05-13 | Unified desktop+mobile filter component; 8 tests pass. |
| 6 | Create PrayerWallLeftSidebar + RightSidebar | [COMPLETE] | 2026-05-13 | Both sidebars created; tsc clean. Coverage via Step 8 integration tests. |
| 7 | Mount NightModeBadge in Navbar.tsx | [COMPLETE] | 2026-05-13 | Mounted on desktop user-state slot + mobile hamburger-adjacent. 65 Navbar tests still pass. |
| 8 | Rewrite PrayerWall.tsx with 3-column grid | [COMPLETE] | 2026-05-13 | Wrapped main in `.prayer-wall-grid`; mounted L/R sidebars (desktop) + mobile CategoryFilters row. Removed NightWatchChip mount + RoomSelector+CategoryFilterBar block. Migrated 4 filter tests to new selectors; migrated 2 Night Mode tests; skipped Spec 4.8 block (D-CategorySingleSelect contradicts; coverage shifted to CategoryFilters.test.tsx). Build passes; 31/40 PrayerWall tests pass, 9 skipped. |
| 9 | Update Settings.tsx Night Mode labels | [COMPLETE] | 2026-05-13 | NIGHT_MODE_OPTIONS reordered to Off / Auto / On (no "Always"). PrivacySection tests migrated; all 30 pass. |
| 10 | Remove palette block + NightWatchChip shim | [COMPLETE] | 2026-05-13 | Deleted `[data-night-mode='on']` palette + body backdrop rule; added `.prayer-wall-grid`. NightWatchChip is now a 1-line shim re-exporting NightModeBadge. Deleted `NightWatchChip.test.tsx` (Plan-Time Divergence #2). useNightMode + parity tests still pass. |
| 11 | Document new localStorage key | [COMPLETE] | 2026-05-13 | Added `wr_prayer_wall_guidelines_dismissed` row to Prayer Wall section. |
| 12 | Playwright E2E + a11y tests | [COMPLETE] | 2026-05-13 | Created `e2e/prayer-wall-redesign.spec.ts` — 10 tests at 4 breakpoints (responsive, night, axe-core, focusable-region). All pass. Updated `sticky-regression.spec.ts` threshold 50→100 to admit `top-16` sidebars (still asserts sticky engagement on scroll). |
