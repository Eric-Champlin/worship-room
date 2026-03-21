# Implementation Plan: Reading Plans Data Model & Browser Page

**Spec:** `_specs/reading-plans-browser.md`
**Date:** 2026-03-21
**Branch:** `claude/feature/reading-plans-browser`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (this is Spec 1 of a 3-spec reading plans sequence — no master plan exists yet)

---

## Architecture Context

### Relevant Existing Files and Patterns

- **Route config:** `frontend/src/App.tsx` — add two new public routes (`/reading-plans`, `/reading-plans/:planId`)
- **Navbar:** `frontend/src/components/Navbar.tsx` — `NAV_LINKS` array (line 12), `MobileDrawer` renders same array (line 588). Add "Reading Plans" between "Daily Devotional" and "Prayer Wall"
- **PageHero:** `frontend/src/components/PageHero.tsx` — reusable hero for browser page with `title`, `subtitle`, `showDivider`, `children` props
- **DevotionalPage:** `frontend/src/pages/DevotionalPage.tsx` — visual reference for the plan detail page. All-dark background (`bg-hero-dark`), passage in Lora italic with verse numbers in `text-white/30`, reflection in Inter, prayer in Lora italic, callout card in `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, section dividers `border-t border-white/10`, section spacing `py-8 sm:py-10`
- **Devotional types:** `frontend/src/types/devotional.ts` — model for `DevotionalVerse` (reusable `{ number, text }` pattern)
- **Devotional data:** `frontend/src/data/devotionals.ts` — `DEVOTIONAL_POOL` array with getter functions
- **Auth pattern:** `useAuth()` from `@/hooks/useAuth` returns `{ isAuthenticated, user }`. `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` for gating actions
- **Toast:** `useToast()` from `@/components/ui/Toast` for notifications
- **Layout:** `Layout` component wraps all pages with Navbar + SiteFooter
- **CategoryFilterBar:** `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — pill-based filter with `aria-pressed`, `min-h-[44px]`, active/inactive styling
- **Intersection Observer:** DevotionalPage lines 44-65 — completion tracking on scroll

### Directory Conventions

- Types: `frontend/src/types/`
- Data/constants: `frontend/src/data/`
- Pages: `frontend/src/pages/`
- Components: `frontend/src/components/` (subdirectories per feature)
- Hooks: `frontend/src/hooks/`
- Tests: `frontend/src/pages/__tests__/`, `frontend/src/components/__tests__/`

### Test Patterns

- Wrap with `MemoryRouter` (with `future` flags), `ToastProvider`, `AuthModalProvider`
- Mock `useAuth` via `vi.mock('@/hooks/useAuth')`
- Mock `useAuthModal` when needed
- Use `screen.getByRole`, `screen.getByText`, `screen.getByLabelText`
- `beforeEach` clears localStorage
- Render helper function per test file

### Auth Gating Pattern

```typescript
const { isAuthenticated } = useAuth()
const authModal = useAuthModal()

// In handler:
if (!isAuthenticated) {
  authModal?.openAuthModal('Sign in to start this reading plan')
  return
}
```

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| "Start Plan" button click | Auth modal: "Sign in to start this reading plan" | Step 5 | useAuth + authModal |
| "Continue" / "Resume" button click | Auth modal: "Sign in to continue this reading plan" | Step 5 | useAuth + authModal |
| Navigate to Day 2+ content | Auth modal: "Sign in to start this reading plan" | Step 6 | useAuth + authModal |
| Day selector dropdown (plan not started) | Auth modal: "Sign in to start this reading plan" | Step 6 | useAuth + authModal |
| Previous/Next Day buttons on Day 2+ | Auth modal on Day 2+ if plan not started | Step 6 | useAuth + authModal |
| Day completion tracking (Intersection Observer) | Not tracked for logged-out users | Step 7 | Guard with isAuthenticated check |
| localStorage writes | No writes for logged-out users | Step 4, 7 | Guard with isAuthenticated check |
| Confirmation dialog (pause plan) | Not applicable for logged-out users | Step 5 | Only reachable by authenticated users |

---

## Design System Values (for UI steps)

Values from `_plans/recon/design-system.md` (loaded):

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| PageHero (browser page) | background | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | PageHero.tsx line 7 |
| PageHero | padding | `pt-32 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24 px-4` | PageHero.tsx line 24 |
| PageHero | title font | Caveat (`font-script`) 5xl/6xl/7xl bold white | design-system.md |
| PageHero | subtitle font | Inter `text-base sm:text-lg lg:text-xl text-white/85` | PageHero.tsx line 43 |
| Detail page hero | background | `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)` | DevotionalPage.tsx line 117 |
| Detail page body bg | background | `bg-hero-dark` (#0D0620) | DevotionalPage.tsx line 111 |
| Plan card (browser) | styles | `bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md` | design-system.md Card Pattern |
| Filter pill (inactive) | styles | `min-h-[44px] rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:bg-gray-50` | design-system.md Chip/Tag |
| Filter pill (active) | styles | `min-h-[44px] rounded-full bg-primary px-4 py-2 text-sm text-white` | spec + design-system.md |
| Primary CTA button | styles | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | design-system.md |
| Passage text | font | `font-serif text-base italic leading-relaxed text-white/90 sm:text-lg` | DevotionalPage.tsx line 190 |
| Verse numbers | font | `font-sans text-xs text-white/30` sup element | DevotionalPage.tsx line 193 |
| Reflection text | font | `text-base leading-relaxed text-white/80` in `space-y-4` | DevotionalPage.tsx line 204 |
| Prayer label | font | `text-xs font-medium uppercase tracking-widest text-white/40` | DevotionalPage.tsx line 213 |
| Prayer text | font | `font-serif text-base italic leading-relaxed text-white/80` | DevotionalPage.tsx line 216 |
| Callout card | styles | `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6` | DevotionalPage.tsx line 223 |
| Section divider | styles | `border-t border-white/10` | DevotionalPage.tsx |
| Section spacing | padding | `py-8 sm:py-10` | DevotionalPage.tsx |
| Action button (dark bg) | styles | `rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15` | DevotionalPage.tsx line 235 |
| Content column | width | `max-w-2xl mx-auto px-4 sm:px-6` | DevotionalPage.tsx line 166 |
| Metadata pill (light bg) | styles | `bg-gray-100 text-text-dark text-xs rounded-full px-3 py-1` | spec |
| Completed badge | styles | `bg-success/10 text-success text-sm font-medium rounded-full px-4 py-2` | spec |
| Progress bar track | styles | `h-2 rounded-full bg-white/10` | spec |
| Progress bar fill | styles | `h-2 rounded-full bg-primary` | spec |
| Dropdown panel | styles | `bg-hero-mid border border-white/15 rounded-xl shadow-lg` | design-system.md Navigation Pattern |
| Dialog | styles | `bg-hero-mid border border-white/15 rounded-2xl p-6 max-w-sm mx-auto` | spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses **Caveat** (`font-script`) for hero H1s and script-style highlighted words, not Lora
- **Lora** (`font-serif`) is used for scripture/passage text (italic) and prayers (italic)
- **Inter** (`font-sans`) is used for body text, headings, UI elements, buttons
- All Daily Hub tabs share `max-w-2xl` container width; devotional detail uses the same
- Inner page heroes use `PageHero` component with gradient `#0D0620 → #0D0620 → #6D28D9 → #F5F5F5`
- All-dark pages (DevotionalPage, Dashboard) use different gradient ending in `#0D0620` instead of `#F5F5F5`
- Frosted glass callout: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Dark section dividers: `border-t border-white/10` with `py-8 sm:py-10` spacing
- Dark page action buttons: `rounded-lg border border-white/20 bg-white/10 px-4 py-3 hover:bg-white/15`
- Nav dropdown panel: `bg-hero-mid border border-white/15 rounded-xl shadow-lg`
- Touch targets: all interactive elements `min-h-[44px]`
- `cn()` from `@/lib/utils` for conditional classNames

---

## Shared Data Models (from Master Plan)

No master plan exists for this spec sequence. This spec defines the foundational data models.

**TypeScript interfaces this spec produces (consumed by Specs 2 & 3):**

```typescript
// frontend/src/types/reading-plans.ts
export interface PlanVerse {
  number: number
  text: string
}

export interface PlanPassage {
  reference: string
  verses: PlanVerse[]
}

export interface PlanDayContent {
  dayNumber: number
  title: string
  passage: PlanPassage
  reflection: string[]
  prayer: string
  actionStep: string
}

export type PlanTheme =
  | 'anxiety' | 'grief' | 'gratitude' | 'identity' | 'forgiveness'
  | 'trust' | 'hope' | 'healing' | 'purpose' | 'relationships'

export type PlanDifficulty = 'beginner' | 'intermediate'

export interface ReadingPlan {
  id: string
  title: string
  description: string
  theme: PlanTheme
  durationDays: 7 | 14 | 21
  difficulty: PlanDifficulty
  coverEmoji: string
  days: PlanDayContent[]
}

// Progress tracking
export interface PlanProgress {
  startedAt: string    // ISO timestamp
  currentDay: number   // 1-based
  completedDays: number[]
  completedAt: string | null  // ISO timestamp or null
}

export type ReadingPlanProgressMap = Record<string, PlanProgress>
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_reading_plan_progress` | Both | Object keyed by planId → PlanProgress. Written when plan started, day completed, plan completed. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single-column plan card grid, full-width cards with `px-4`, filter pills flex-wrap, day nav buttons stacked vertically full-width, day selector full-width below nav |
| Tablet | >= 640px | 2-column plan card grid, filter pills single row, day nav horizontal centered, day selector inline |
| Desktop | >= 1024px | 2-column plan grid with `max-w-4xl`, `max-w-2xl` content column, generous hero padding |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| PageHero → filter section | 0px (filter section flows from hero bg transition to neutral bg) | codebase inspection (Prayer Wall pattern) |
| Filter section → plan grid | 16-24px (`mt-4` to `mt-6`) | codebase inspection |
| Plan grid → footer | handled by SiteFooter | SiteFooter component |
| Detail hero → content column | 0px (content starts with `pt-8 sm:pt-10`) | DevotionalPage.tsx line 168 |
| Content sections | `py-8 sm:py-10` with `border-t border-white/10` | DevotionalPage.tsx |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The spec's 10 reading plans require writing ~10 × 7-21 days of Bible content (WEB translation). The data file will be large (~2000-4000 lines). Confirm this is acceptable in a single data file, or split into per-plan files.
- [ ] The reading plan data content (passages, reflections, prayers, action steps) must be authored during implementation. These are curated, not AI-generated at runtime.
- [ ] All auth-gated actions from the spec are accounted for in the plan (✓ verified above)
- [ ] Design system values are verified from design-system.md and DevotionalPage.tsx (✓)
- [ ] All [UNVERIFIED] values are flagged with verification methods (see below)
- [ ] Prior specs in the sequence — N/A, this is Spec 1

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data file organization | Single `data/reading-plans.ts` file with all 10 plans | Matches `data/devotionals.ts` pattern. Split per-plan only if file exceeds maintainability threshold. |
| Day 1 preview for logged-out | Full Day 1 content shown, no auth modal on detail page load | Spec explicitly says Day 1 is a preview. Auth gate only on Day 2+ and "Start Plan" |
| Active plan detection | Most recently started non-completed plan is "active"; others are "paused" | Spec: "most recently started plan is active" |
| Plan card sort order | Active first, then paused (by startedAt desc), then unstarted, then completed | Spec: "active plan first, then paused plans, then unstarted plans, then completed plans" |
| Day selector UI | Custom dropdown built as a button + panel (not native `<select>`) | Spec requires icons (checkmarks, locks), highlighting, keyboard navigation — native select can't do this |
| Progress bar in hero | Only shown when plan has been started | Spec: "Progress bar (if started)" |
| Plan detail route | `/reading-plans/:planId` with planId as the slug string | Matches spec's `id` field pattern |
| Locked day click feedback | Toast notification "Complete the current day to unlock this one" | Spec says "brief message" — toast is the existing pattern for brief messages |
| Content data authoring | Write full content for all 10 plans during execution | Required by spec — all content is hardcoded, not AI-generated |

---

## Implementation Steps

### Step 1: Types & Constants

**Objective:** Define TypeScript interfaces and constants for reading plans.

**Files to create:**
- `frontend/src/types/reading-plans.ts` — All TypeScript interfaces
- `frontend/src/constants/reading-plans.ts` — localStorage key constant

**Details:**

Create types as defined in the Shared Data Models section above. Also create:

```typescript
// frontend/src/constants/reading-plans.ts
export const READING_PLAN_PROGRESS_KEY = 'wr_reading_plan_progress'

export const PLAN_THEMES = [
  'anxiety', 'grief', 'gratitude', 'identity', 'forgiveness',
  'trust', 'hope', 'healing', 'purpose', 'relationships',
] as const

export const PLAN_THEME_LABELS: Record<PlanTheme, string> = {
  anxiety: 'Anxiety',
  grief: 'Grief',
  gratitude: 'Gratitude',
  identity: 'Identity',
  forgiveness: 'Forgiveness',
  trust: 'Trust',
  hope: 'Hope',
  healing: 'Healing',
  purpose: 'Purpose',
  relationships: 'Relationships',
}

export const PLAN_DIFFICULTY_LABELS: Record<PlanDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
}

export const DURATION_FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '21 days', value: 21 },
] as const

export const DIFFICULTY_FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Beginner', value: 'beginner' as const },
  { label: 'Intermediate', value: 'intermediate' as const },
] as const
```

**Guardrails (DO NOT):**
- DO NOT add any localStorage read/write logic here — that goes in the hook (Step 4)
- DO NOT import from any other module — these are leaf-level definitions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| types compile correctly | unit | Import types in a test to verify they compile without errors |
| constants are defined | unit | Verify PLAN_THEMES has 10 entries, DURATION_FILTER_OPTIONS has 4, etc. |

**Expected state after completion:**
- [ ] `reading-plans.ts` type file exports all interfaces
- [ ] Constants file exports all labels, filter options, localStorage key
- [ ] Types compile without errors

---

### Step 2: Reading Plan Data — Plans 1-5

**Objective:** Create the first 5 hardcoded reading plans with full day content using WEB translation.

**Files to create:**
- `frontend/src/data/reading-plans/index.ts` — Re-exports combined array + getter functions
- `frontend/src/data/reading-plans/finding-peace-in-anxiety.ts` — 7 days
- `frontend/src/data/reading-plans/walking-through-grief.ts` — 14 days
- `frontend/src/data/reading-plans/the-gratitude-reset.ts` — 7 days
- `frontend/src/data/reading-plans/knowing-who-you-are-in-christ.ts` — 21 days
- `frontend/src/data/reading-plans/the-path-to-forgiveness.ts` — 14 days

**Details:**

Split into per-plan files to keep each file manageable. The index file combines them:

```typescript
// frontend/src/data/reading-plans/index.ts
import type { ReadingPlan } from '@/types/reading-plans'
// ... imports of each plan

export const READING_PLANS: ReadingPlan[] = [
  findingPeaceInAnxiety,
  walkingThroughGrief,
  theGratitudeReset,
  knowingWhoYouAreInChrist,
  thePathToForgiveness,
  learningToTrustGod,
  hopeWhenItsHard,
  healingFromTheInsideOut,
  discoveringYourPurpose,
  buildingStrongerRelationships,
]

export function getReadingPlan(id: string): ReadingPlan | undefined {
  return READING_PLANS.find((p) => p.id === id)
}

export function getReadingPlanDay(planId: string, dayNumber: number): PlanDayContent | undefined {
  const plan = getReadingPlan(planId)
  if (!plan) return undefined
  return plan.days.find((d) => d.dayNumber === dayNumber)
}
```

Each plan file follows the structure from the spec. Example for plan 1:

```typescript
// frontend/src/data/reading-plans/finding-peace-in-anxiety.ts
import type { ReadingPlan } from '@/types/reading-plans'

export const findingPeaceInAnxiety: ReadingPlan = {
  id: 'finding-peace-in-anxiety',
  title: 'Finding Peace in Anxiety',
  description: 'A 7-day journey through Scripture to find calm in the chaos. Discover how God meets you in your worry and leads you to a peace that surpasses understanding.',
  theme: 'anxiety',
  durationDays: 7,
  difficulty: 'beginner',
  coverEmoji: '🕊️',
  days: [
    {
      dayNumber: 1,
      title: 'Day 1: When Worry Takes Over',
      passage: {
        reference: 'Philippians 4:6-7',
        verses: [
          { number: 6, text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.' },
          { number: 7, text: 'And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.' },
        ],
      },
      reflection: [
        'Worry has a way of filling every corner of your mind...',
        'Notice what Paul says: "in nothing be anxious." ...',
        'The peace God offers isn\'t the absence of trouble...',
      ],
      prayer: 'Father, I bring my anxious thoughts to You today...',
      actionStep: 'Write down three things you are anxious about right now. After each one, write "I give this to You, Lord." Then sit quietly for two minutes.',
    },
    // ... days 2-7
  ],
}
```

**Content requirements:**
- All passages use WEB (World English Bible) translation
- Each passage has 2-6 verses with verse numbers
- Each reflection has 2-3 paragraphs, warm second-person voice
- Prayers are personal and conversational
- Action steps are specific and doable within a single day
- No denominational bias, no claiming divine authority

**Guardrails (DO NOT):**
- DO NOT use any other Bible translation — WEB only
- DO NOT use "God is telling you..." language — use "Scripture encourages us..." pattern
- DO NOT make action steps vague — each must be specific and completable in one day
- DO NOT import or depend on any runtime code — these are pure data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Plans 1-5 have correct structure | unit | Verify each plan has required fields, correct duration, correct number of days |
| All passages have 2-6 verses | unit | Loop through all days of plans 1-5, verify verse count |
| All reflections have 2-3 paragraphs | unit | Verify reflection array length |
| getReadingPlan returns correct plan | unit | Test getter function with valid/invalid IDs |

**Expected state after completion:**
- [ ] 5 plan data files created with full content
- [ ] Index file re-exports combined array
- [ ] Getter functions work correctly
- [ ] All content follows WEB translation and theological guidelines

---

### Step 3: Reading Plan Data — Plans 6-10

**Objective:** Create the remaining 5 hardcoded reading plans with full day content.

**Files to create:**
- `frontend/src/data/reading-plans/learning-to-trust-god.ts` — 7 days
- `frontend/src/data/reading-plans/hope-when-its-hard.ts` — 7 days
- `frontend/src/data/reading-plans/healing-from-the-inside-out.ts` — 21 days
- `frontend/src/data/reading-plans/discovering-your-purpose.ts` — 14 days
- `frontend/src/data/reading-plans/building-stronger-relationships.ts` — 7 days

**Files to modify:**
- `frontend/src/data/reading-plans/index.ts` — Add imports for plans 6-10

**Details:**

Same structure and guidelines as Step 2. Complete the remaining plans:

| # | Plan | Duration | Difficulty | Emoji |
|---|------|----------|------------|-------|
| 6 | Learning to Trust God | 7 days | beginner | 🤲 |
| 7 | Hope When It's Hard | 7 days | beginner | 🌅 |
| 8 | Healing from the Inside Out | 21 days | intermediate | 💚 |
| 9 | Discovering Your Purpose | 14 days | intermediate | 🧭 |
| 10 | Building Stronger Relationships | 7 days | beginner | 🤝 |

**Guardrails (DO NOT):**
- Same as Step 2

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Plans 6-10 have correct structure | unit | Same validation as Step 2 for plans 6-10 |
| All 10 plans in combined array | unit | Verify READING_PLANS.length === 10 |
| Plan durations match spec | unit | Verify: five 7-day, three 14-day, two 21-day |
| Plan difficulties match spec | unit | Verify: five beginner, five intermediate |
| Each plan has unique coverEmoji | unit | Verify no duplicate emojis |
| Each plan has unique id | unit | Verify no duplicate IDs |

**Expected state after completion:**
- [ ] All 10 plans created with full content
- [ ] Index file exports all 10 plans
- [ ] Duration distribution correct (5×7, 3×14, 2×21)
- [ ] Difficulty distribution correct (5 beginner, 5 intermediate)

---

### Step 4: useReadingPlanProgress Hook

**Objective:** Create a custom hook for reading plan progress management with localStorage persistence.

**Files to create:**
- `frontend/src/hooks/useReadingPlanProgress.ts`

**Details:**

```typescript
// frontend/src/hooks/useReadingPlanProgress.ts
import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { READING_PLAN_PROGRESS_KEY } from '@/constants/reading-plans'
import type { ReadingPlanProgressMap, PlanProgress } from '@/types/reading-plans'
import { READING_PLANS } from '@/data/reading-plans'

function readProgress(): ReadingPlanProgressMap {
  try {
    const raw = localStorage.getItem(READING_PLAN_PROGRESS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ReadingPlanProgressMap
  } catch {
    return {}
  }
}

function writeProgress(progress: ReadingPlanProgressMap): void {
  try {
    localStorage.setItem(READING_PLAN_PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // localStorage unavailable
  }
}

export function useReadingPlanProgress() {
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<ReadingPlanProgressMap>(readProgress)

  const getProgress = useCallback((planId: string): PlanProgress | undefined => {
    return progress[planId]
  }, [progress])

  const getActivePlanId = useCallback((): string | null => {
    // Active plan = most recently started non-completed plan
    let activePlanId: string | null = null
    let latestStartedAt = ''
    for (const [planId, p] of Object.entries(progress)) {
      if (!p.completedAt && p.startedAt > latestStartedAt) {
        latestStartedAt = p.startedAt
        activePlanId = planId
      }
    }
    return activePlanId
  }, [progress])

  const startPlan = useCallback((planId: string) => {
    if (!isAuthenticated) return
    const updated = { ...progress }
    updated[planId] = {
      startedAt: new Date().toISOString(),
      currentDay: 1,
      completedDays: [],
      completedAt: null,
    }
    writeProgress(updated)
    setProgress(updated)
  }, [isAuthenticated, progress])

  const completeDay = useCallback((planId: string, dayNumber: number) => {
    if (!isAuthenticated) return
    const planProgress = progress[planId]
    if (!planProgress) return
    if (planProgress.completedDays.includes(dayNumber)) return

    const plan = READING_PLANS.find((p) => p.id === planId)
    if (!plan) return

    const updated = { ...progress }
    const completedDays = [...planProgress.completedDays, dayNumber]
    const nextDay = planProgress.currentDay + 1
    const isLastDay = completedDays.length >= plan.durationDays

    updated[planId] = {
      ...planProgress,
      completedDays,
      currentDay: isLastDay ? planProgress.currentDay : nextDay,
      completedAt: isLastDay ? new Date().toISOString() : null,
    }
    writeProgress(updated)
    setProgress(updated)
  }, [isAuthenticated, progress])

  const getPlanStatus = useCallback((planId: string): 'unstarted' | 'active' | 'paused' | 'completed' => {
    const p = progress[planId]
    if (!p) return 'unstarted'
    if (p.completedAt) return 'completed'
    if (planId === getActivePlanId()) return 'active'
    return 'paused'
  }, [progress, getActivePlanId])

  return {
    progress,
    getProgress,
    getActivePlanId,
    startPlan,
    completeDay,
    getPlanStatus,
  }
}
```

**Auth gating:**
- `startPlan()` no-ops when not authenticated
- `completeDay()` no-ops when not authenticated
- Read operations work regardless of auth (returns empty progress for logged-out)

**Guardrails (DO NOT):**
- DO NOT write to localStorage when user is not authenticated
- DO NOT import any UI components — this is a pure data hook
- DO NOT auto-complete Day 1 on plan start — user must scroll to bottom

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| readProgress returns empty object when no data | unit | Test with cleared localStorage |
| startPlan creates correct progress entry | unit | Verify startedAt, currentDay=1, completedDays=[], completedAt=null |
| startPlan no-ops when not authenticated | unit | Mock useAuth as unauthenticated, verify no localStorage write |
| completeDay adds day to completedDays | unit | Start plan, complete day 1, verify completedDays=[1] |
| completeDay advances currentDay | unit | Verify currentDay increments after completion |
| completeDay does not duplicate days | unit | Complete same day twice, verify only one entry |
| completeDay sets completedAt on last day | unit | Complete all days of a 7-day plan, verify completedAt is set |
| getActivePlanId returns most recently started | unit | Start two plans, verify latest is active |
| getPlanStatus returns correct states | unit | Test unstarted, active, paused, completed scenarios |
| progress persists across hook re-renders | unit | Write progress, re-render, verify data loaded |

**Expected state after completion:**
- [ ] Hook manages reading plan progress in localStorage
- [ ] All auth guards in place
- [ ] No localStorage writes for unauthenticated users
- [ ] All status calculations correct

---

### Step 5: Reading Plans Browser Page (`/reading-plans`)

**Objective:** Create the browser page with PageHero, filter system, plan card grid, and auth-gated actions.

**Files to create:**
- `frontend/src/pages/ReadingPlans.tsx` — Browser page component
- `frontend/src/components/reading-plans/PlanCard.tsx` — Individual plan card
- `frontend/src/components/reading-plans/FilterBar.tsx` — Duration + difficulty filter pills

**Files to modify:**
- `frontend/src/App.tsx` — Add route for `/reading-plans`

**Details:**

**ReadingPlans.tsx:**
- Wraps in `<Layout>` component
- Uses `<PageHero title="Reading Plans" subtitle="Guided journeys through Scripture" />` for hero
- Below hero: neutral `bg-neutral-bg` background (matching inner page pattern)
- Filter section: `FilterBar` component with duration and difficulty pills
- Plan grid: `max-w-4xl mx-auto px-4 sm:px-6` container, `grid grid-cols-1 sm:grid-cols-2 gap-6`
- Plans sorted: active first, paused, unstarted, completed (within each group, maintain array order)
- Empty state when filters produce zero results
- Each card links to `/reading-plans/:planId`

**FilterBar.tsx:**
- Two rows of filter pills with labels "Duration" and "Difficulty"
- Each row: horizontal flex with gap-2, flex-wrap on mobile
- Active pill: `min-h-[44px] rounded-full bg-primary px-4 py-2 text-sm font-medium text-white`
- Inactive pill: `min-h-[44px] rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:bg-gray-50`
- Both rows use `aria-pressed` for active state
- AND logic: both filters apply simultaneously
- "Clear filters" button in empty state resets both rows to "All"

**PlanCard.tsx:**
- Card: `bg-white rounded-xl border border-gray-200 shadow-sm p-6 transition-shadow hover:shadow-md`
- Cover emoji: `text-4xl` (displayed large as visual anchor)
- Title: `text-lg font-bold text-text-dark`
- Description: `text-sm text-text-light line-clamp-2`
- Metadata pills row: `flex gap-2 mt-3`, each pill `bg-gray-100 text-text-dark text-xs rounded-full px-3 py-1`
- Action area at bottom:
  - Unstarted: "Start Plan" button (`bg-primary text-white font-semibold py-3 px-8 rounded-lg w-full`)
  - Active/Paused: "Continue"/"Resume" button (same primary style)
  - Completed: Badge (`bg-success/10 text-success text-sm font-medium rounded-full px-4 py-2`)
- In-progress indicator: `text-sm text-text-light mt-2` showing "Day X of Y"
- Card click navigates to `/reading-plans/:planId` (except button which has its own handler)

**Auth gating:**
- "Start Plan" / "Continue" / "Resume" button: `useAuth` + `useAuthModal` check
- If logged out: `authModal?.openAuthModal('Sign in to start this reading plan')`
- Card navigation to detail page: always allowed (Day 1 preview for logged-out)

**Confirmation dialog for active plan swap:**
- When starting a new plan while one is active, show modal overlay
- Backdrop: `fixed inset-0 bg-black/50 z-50`
- Dialog: `bg-hero-mid border border-white/15 rounded-2xl p-6 max-w-sm mx-auto` centered on screen
- Title: "Switch Reading Plan?" in `text-lg font-bold text-white`
- Body: "You're currently on Day X of [Plan Title]. Starting a new plan will pause your current progress. You can resume it later." in `text-white/70`
- Buttons: "Pause & Start New" (primary CTA) and "Keep Current" (outline: `border border-white/20 bg-white/10 text-white`)
- Focus trap and Escape to dismiss
- `aria-modal="true"`, `role="dialog"`

**Route addition in App.tsx:**
```typescript
import { ReadingPlans } from './pages/ReadingPlans'
// ...
<Route path="/reading-plans" element={<ReadingPlans />} />
```

**Responsive behavior:**
- Desktop (>=640px): 2-column plan card grid, filter pills in single rows
- Mobile (<640px): Single-column cards, filter pills flex-wrap, full-width buttons

**Guardrails (DO NOT):**
- DO NOT build the plan detail page in this step — only the browser/grid page
- DO NOT write to localStorage from this component — delegate to the hook
- DO NOT show confirmation dialog for logged-out users — they can't start plans
- DO NOT use `dangerouslySetInnerHTML` for any content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders PageHero with correct title/subtitle | integration | Verify "Reading Plans" heading and subtitle |
| Renders all 10 plan cards | integration | Verify 10 cards rendered with correct titles |
| Duration filter: "7 days" shows only 7-day plans | integration | Click "7 days", verify 5 cards |
| Duration filter: "14 days" shows 3 plans | integration | Click "14 days", verify 3 cards |
| Duration filter: "21 days" shows 2 plans | integration | Click "21 days", verify 2 cards |
| Difficulty filter works | integration | Click "Beginner", verify 5 cards |
| Both filters AND together | integration | Click "7 days" + "Beginner", verify correct subset |
| Empty state shown when no plans match | integration | Set impossible filter combo, verify message + clear button |
| Clear filters resets both rows | integration | Apply filters, click "Clear filters", verify all 10 shown |
| "Start Plan" shows auth modal when logged out | integration | Click "Start Plan" logged out, verify auth modal |
| "Start Plan" starts plan when logged in | integration | Mock authenticated, click "Start Plan", verify progress created |
| Confirmation dialog shown when active plan exists | integration | Start one plan, click start on another, verify dialog |
| "Pause & Start New" pauses current and starts new | integration | Verify old plan paused, new plan active |
| "Keep Current" dismisses dialog | integration | Click "Keep Current", verify no changes |
| Card navigates to detail page | integration | Click card, verify navigation to `/reading-plans/:planId` |
| Plan cards sorted by status | integration | Start a plan, verify it appears first in the grid |
| In-progress card shows "Day X of Y" | integration | Start a plan, verify progress text shown |
| Completed card shows badge | integration | Complete a plan, verify "Completed" badge |
| Active filter pills have `aria-pressed="true"` | integration | Click a filter, verify aria-pressed attribute |
| Filter pills meet 44px touch target | integration | Verify min-h-[44px] on filter buttons |

**Expected state after completion:**
- [ ] `/reading-plans` route works
- [ ] All 10 plans shown in grid
- [ ] Filters work with AND logic
- [ ] Auth gating works on Start/Continue/Resume
- [ ] Confirmation dialog for active plan swap
- [ ] Responsive layout correct

---

### Step 6: Plan Detail Page (`/reading-plans/:planId`)

**Objective:** Create the plan detail page with hero, day content, day navigation, and day selector dropdown.

**Files to create:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — Plan detail page
- `frontend/src/components/reading-plans/DayContent.tsx` — Day content rendering (passage, reflection, prayer, action step)
- `frontend/src/components/reading-plans/DaySelector.tsx` — Custom dropdown for day navigation
- `frontend/src/components/reading-plans/PlanNotFound.tsx` — Not found state

**Files to modify:**
- `frontend/src/App.tsx` — Add route for `/reading-plans/:planId`

**Details:**

**ReadingPlanDetail.tsx:**
- Uses `useParams()` to get `planId`
- Looks up plan via `getReadingPlan(planId)` — if not found, renders `PlanNotFound`
- State: `selectedDay` (number, default: logged-in user's `currentDay` from progress, or 1 for new/logged-out)
- All-dark background: `min-h-screen bg-hero-dark` (matches DevotionalPage.tsx line 111)
- Wraps in `<Layout>`

**Hero section (follow DevotionalPage.tsx lines 113-163 pattern):**
- Background: `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)` — same as DevotionalPage
- Cover emoji: `text-5xl sm:text-6xl` centered
- Title: `font-script text-5xl font-bold text-white sm:text-6xl lg:text-7xl` (Caveat)
- Description: `text-base text-white/85 max-w-xl mx-auto mt-3 sm:text-lg`
- Duration + difficulty pills: `inline-flex gap-2 mt-4`, each pill `bg-white/10 text-white text-sm rounded-full px-4 py-1`
- Progress bar (if started): Below pills, `w-full max-w-xs mx-auto mt-4`
  - Track: `h-2 rounded-full bg-white/10`
  - Fill: `h-2 rounded-full bg-primary` with width `(completedDays.length / durationDays) * 100%`
  - Label: `text-sm text-white/50 mt-1` showing "X% complete"
  - `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`

**DayContent.tsx:**
- Container: `max-w-2xl mx-auto px-4 sm:px-6` (matches DevotionalPage.tsx line 166)
- Day title: `pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl` (matches DevotionalPage.tsx line 168)
- Passage section: `border-t border-white/10 py-8 sm:py-10`
  - Reference label: `text-xs font-medium uppercase tracking-widest text-white/40 mb-4`
  - Verse text: `font-serif text-base italic leading-relaxed text-white/90 sm:text-lg`
  - Verse numbers: `<sup className="mr-1 align-super font-sans text-xs text-white/30">`
  - (Exact match of DevotionalPage.tsx lines 186-200)
- Reflection section: `border-t border-white/10 py-8 sm:py-10`
  - Body: `space-y-4 text-base leading-relaxed text-white/80`
  - (Exact match of DevotionalPage.tsx lines 203-208)
- Prayer section: `border-t border-white/10 py-8 sm:py-10`
  - Label: `text-xs font-medium uppercase tracking-widest text-white/40 mb-4`
  - Text: `font-serif text-base italic leading-relaxed text-white/80`
  - (Exact match of DevotionalPage.tsx lines 212-218)
- Action step section: `border-t border-white/10 py-8 sm:py-10`
  - Uses `ref={actionStepRef}` for Intersection Observer (Step 7)
  - Card: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6`
  - Label: `text-sm text-white/40` → "Today's Action Step"
  - Text: `mt-2 text-lg font-medium text-white`
  - (Matches DevotionalPage.tsx lines 222-228 pattern)

**Day navigation (below content):**
- Container: `mt-8 sm:mt-10` centered
- Buttons row: `flex flex-col gap-3 sm:flex-row sm:justify-center`
  - "Previous Day": `inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15`
    - Disabled on Day 1: `cursor-not-allowed opacity-50`
    - `aria-label="Go to previous day"`
  - "Next Day": Same styling. Disabled on last day.
    - `aria-label="Go to next day"`
- Auth gating: If not authenticated and attempting to navigate to Day 2+, show auth modal

**DaySelector.tsx:**
- Trigger button: `rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15`
  - Shows current day number: "Day X of Y"
  - `aria-haspopup="listbox"`, `aria-expanded`
- Dropdown panel: `bg-hero-mid border border-white/15 rounded-xl shadow-lg mt-2 py-2 max-h-60 overflow-y-auto`
  - Mobile: `w-full`; Desktop: `w-64`
  - Each day item: `px-4 py-3 flex items-center gap-3 text-sm text-white cursor-pointer hover:bg-white/10`
  - Completed days: Checkmark icon (Check from Lucide) in `text-success`
  - Locked days: Lock icon (Lock from Lucide) in `text-white/30`, text in `text-white/30`, `cursor-not-allowed`
  - Current day: `bg-white/10` highlight
  - `role="listbox"`, each item `role="option"`, locked items `aria-disabled="true"`
  - Keyboard: Arrow keys navigate, Enter selects, Escape closes
- Locked day click: show toast "Complete the current day to unlock this one."
- Auth gating on selector: If not authenticated and plan not started, show auth modal

**PlanNotFound.tsx:**
- Simple centered message: "Plan not found" with Link to `/reading-plans`
- Follow the `NotFound` pattern in App.tsx (lines 61-81)

**Plan completion celebration:**
- When viewing the last day's content after all days completed, show a celebration message
- Below the action step card: `mt-6 text-center`
  - Emoji: `text-4xl mb-2` → "🎉"
  - Text: `text-lg font-medium text-white` → "You've completed [Plan Title]! What a journey."
  - `animate-fade-in` entrance

**Route addition in App.tsx:**
```typescript
import { ReadingPlanDetail } from './pages/ReadingPlanDetail'
// ...
<Route path="/reading-plans/:planId" element={<ReadingPlanDetail />} />
```

**Responsive behavior:**
- Desktop (>=1024px): `max-w-2xl` content column, horizontal nav buttons, inline day selector
- Tablet (640-1024px): Same as desktop with slightly reduced padding
- Mobile (<640px): Full-width content with `px-4`, stacked nav buttons, full-width day selector

**Guardrails (DO NOT):**
- DO NOT implement Intersection Observer completion in this step — that is Step 7
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT auto-navigate to Day 2 after Day 1 completion — user uses nav buttons
- DO NOT show progress bar for unstarted plans
- DO NOT show locked day content — only show the selected day if it's unlocked

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders plan detail for valid planId | integration | Navigate to `/reading-plans/finding-peace-in-anxiety`, verify title |
| Shows "Plan not found" for invalid planId | integration | Navigate to `/reading-plans/nonexistent`, verify error message |
| Hero shows plan title, description, emoji | integration | Verify all hero elements present |
| Progress bar shown for started plans | integration | Start a plan, verify progress bar with role="progressbar" |
| Progress bar hidden for unstarted plans | integration | Verify no progressbar for new plan |
| Day content renders passage with verse numbers | integration | Verify verse text and superscript numbers |
| Day content renders reflection paragraphs | integration | Verify 2-3 paragraphs rendered |
| Day content renders prayer section | integration | Verify "Closing Prayer" label and prayer text |
| Day content renders action step card | integration | Verify "Today's Action Step" label and action text |
| Previous Day disabled on Day 1 | integration | Verify disabled state on first day |
| Next Day disabled on last day | integration | Navigate to last day, verify disabled |
| Day selector shows all days | integration | Open selector, verify all day items listed |
| Completed days show checkmark in selector | integration | Complete a day, verify check icon |
| Locked days show lock icon and are disabled | integration | Verify locked days have aria-disabled |
| Clicking locked day shows toast | integration | Click locked day, verify toast message |
| Day 1 content visible without login | integration | Logged out, verify Day 1 content renders |
| Day 2+ triggers auth modal when logged out | integration | Logged out, try Next Day on Day 1, verify auth modal |
| Day selector keyboard navigation | integration | Open selector, use arrow keys, verify focus moves |
| Completion celebration on last day | integration | Complete all days, verify celebration message |
| Plan detail has all-dark background | integration | Verify bg-hero-dark class present |

**Expected state after completion:**
- [ ] `/reading-plans/:planId` route works
- [ ] Plan detail page renders all content sections
- [ ] Day navigation works (prev/next/selector)
- [ ] Day locking enforced
- [ ] Auth gating on Day 2+ for logged-out users
- [ ] Not-found state for invalid planId
- [ ] Celebration on plan completion

---

### Step 7: Day Completion Tracking (Intersection Observer)

**Objective:** Implement scroll-based day completion tracking using Intersection Observer on the action step section.

**Files to modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — Add Intersection Observer logic
- `frontend/src/components/reading-plans/DayContent.tsx` — Add ref forwarding for action step

**Details:**

Follow the DevotionalPage.tsx Intersection Observer pattern (lines 44-65):

```typescript
// In ReadingPlanDetail.tsx
const actionStepRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!isAuthenticated) return
  const planProgress = getProgress(planId)
  if (!planProgress) return
  // Only track completion for the current uncompleted day
  if (selectedDay !== planProgress.currentDay) return
  if (planProgress.completedDays.includes(selectedDay)) return

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        completeDay(planId, selectedDay)
        observer.disconnect()
      }
    },
    { threshold: 0.5 },
  )
  if (actionStepRef.current) observer.observe(actionStepRef.current)
  return () => observer.disconnect()
}, [isAuthenticated, planId, selectedDay, getProgress, completeDay])
```

**Key behaviors:**
- Only fires for authenticated users
- Only fires when viewing the user's `currentDay` (next uncompleted day)
- Does NOT fire for already-completed days (re-reading)
- Does NOT fire for logged-out users (even on Day 1 preview)
- Disconnects after firing once
- `threshold: 0.5` — fires when 50% of action step is visible

**Guardrails (DO NOT):**
- DO NOT fire completion for any day other than the user's current uncompleted day
- DO NOT fire for logged-out users — the spec explicitly says no tracking for Day 1 preview
- DO NOT write to localStorage directly — use the `completeDay` function from the hook
- DO NOT trigger completion on page mount — only on scroll intersection

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Intersection Observer set up for current day | unit | Verify observer created when viewing current day |
| Observer not set up when logged out | unit | Verify no observer when unauthenticated |
| Observer not set up for already-completed day | unit | Verify no observer when viewing completed day |
| Observer not set up for Day 1 preview (logged out) | unit | Verify no observer for logged-out Day 1 |
| completeDay called on intersection | unit | Mock IntersectionObserver, trigger entry, verify completeDay called |
| Observer disconnects after firing | unit | Verify observer.disconnect called after completion |
| Re-reading completed day does not re-trigger | unit | Navigate to completed day, verify no observer |

**Expected state after completion:**
- [ ] Day completion fires via Intersection Observer
- [ ] Only fires for current uncompleted day
- [ ] No tracking for logged-out users
- [ ] Re-reading completed days safe

---

### Step 8: Navbar Integration

**Objective:** Add "Reading Plans" link to the desktop navbar and mobile drawer.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Add to `NAV_LINKS` array and verify mobile drawer renders it

**Details:**

Add "Reading Plans" to the `NAV_LINKS` array between "Daily Devotional" and "Prayer Wall" (line 12-17):

```typescript
const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon?: LucideIcon }> = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Daily Devotional', to: '/devotional', icon: Sparkles },
  { label: 'Reading Plans', to: '/reading-plans', icon: BookOpen },
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Music', to: '/music' },
]
```

Import `BookOpen` from `lucide-react` (add to existing import on line 3).

**Active state:** The `NavLink` component with `getNavLinkClass` already handles active state based on route matching. Since the detail page is at `/reading-plans/:planId`, the "Reading Plans" link will need to account for this. The `NavLink` `to="/reading-plans"` will match `/reading-plans` exactly but not sub-routes by default.

To handle sub-route active state, modify the NavLink rendering to use a custom `className` function that checks if the path starts with `/reading-plans`:

```typescript
// In DesktopNav — for the "Reading Plans" link specifically,
// or update getNavLinkClass to handle prefix matching for this route.
// Actually, NavLink's isActive already matches sub-routes when using `to="/reading-plans"`
// without `end` prop. Test this behavior — React Router v6 NavLink matches prefix by default.
```

Verify that React Router v6 `NavLink` matches `/reading-plans/:planId` as active for `to="/reading-plans"`. By default, `NavLink` uses startsWith matching, so this should work without changes.

**Mobile drawer:** The `MobileDrawer` already iterates `NAV_LINKS` (line 588), so adding to the array automatically adds it to the mobile drawer.

**Guardrails (DO NOT):**
- DO NOT change the styling or behavior of existing nav links
- DO NOT add a dropdown — "Reading Plans" is a direct link like "Daily Hub"
- DO NOT modify the mobile drawer rendering logic — just add to NAV_LINKS array

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Reading Plans" appears in desktop navbar | integration | Render navbar, verify link text present |
| "Reading Plans" links to /reading-plans | integration | Verify href/to attribute |
| "Reading Plans" appears in mobile drawer | integration | Open mobile drawer, verify link present |
| Active state on /reading-plans | integration | Navigate to /reading-plans, verify active styling |
| Active state on /reading-plans/:planId | integration | Navigate to detail page, verify nav link active |
| Existing nav links unchanged | integration | Verify Daily Hub, Prayer Wall, Music still present and functional |
| Nav link order is correct | integration | Verify order: Daily Hub, Daily Devotional, Reading Plans, Prayer Wall, Music |

**Expected state after completion:**
- [ ] "Reading Plans" link in desktop navbar between Daily Devotional and Prayer Wall
- [ ] "Reading Plans" in mobile drawer in same relative position
- [ ] Active state works on both browser and detail pages
- [ ] No regressions to existing nav links

---

### Step 9: Integration Tests & Polish

**Objective:** Write comprehensive page-level integration tests and fix any visual/functional issues.

**Files to create:**
- `frontend/src/pages/__tests__/ReadingPlans.test.tsx`
- `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx`
- `frontend/src/data/reading-plans/__tests__/reading-plans-data.test.tsx`
- `frontend/src/hooks/__tests__/useReadingPlanProgress.test.tsx`

**Details:**

**reading-plans-data.test.tsx — Data validation tests:**
- All 10 plans have required fields
- Duration distribution: 5×7, 3×14, 2×21
- Difficulty distribution: 5 beginner, 5 intermediate
- All plans have unique IDs
- All plans have unique coverEmojis
- Each day has correct dayNumber sequence
- All passages have 2-6 verses
- All reflections have 2-3 paragraphs
- No empty action steps or prayers
- getReadingPlan returns correct plan / undefined

**ReadingPlans.test.tsx — Browser page tests:**
Follow test setup pattern from `PrayerWall.test.tsx`:
```typescript
function renderPage(initialEntry = '/reading-plans') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <ReadingPlans />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}
```
- Hero renders with correct title
- All 10 plan cards render
- Filter pills render and are functional
- Empty state for impossible filter
- Auth modal on "Start Plan" when logged out
- Confirmation dialog on active plan swap
- Card sort order reflects plan status

**ReadingPlanDetail.test.tsx — Detail page tests:**
- Valid plan renders all sections
- Invalid plan shows not-found
- Day navigation works
- Day locking enforced
- Auth gating on Day 2+
- Day selector keyboard navigation
- Accessibility: progressbar role, aria-disabled on locked days
- Completion celebration on last day

**useReadingPlanProgress.test.tsx — Hook tests:**
- All hook operations covered (start, complete, status, active plan)

**Guardrails (DO NOT):**
- DO NOT skip auth modal tests — these are required for every auth-gated action
- DO NOT test implementation details — test user-visible behavior
- DO NOT use `container.querySelector` — prefer `screen.getByRole` and RTL queries

**Expected state after completion:**
- [ ] All tests pass
- [ ] 80%+ coverage of new components
- [ ] No console errors during test runs
- [ ] Auth gating tested for every gated action

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & constants |
| 2 | 1 | Reading plan data (plans 1-5) |
| 3 | 1 | Reading plan data (plans 6-10) |
| 4 | 1 | Progress tracking hook |
| 5 | 1, 2, 3, 4 | Browser page |
| 6 | 1, 2, 3, 4 | Detail page |
| 7 | 4, 6 | Intersection Observer completion |
| 8 | — | Navbar integration |
| 9 | 1-8 | Integration tests & polish |

**Parallelization:** Steps 2, 3, and 4 can execute in parallel (all depend only on Step 1). Steps 5 and 6 can begin once 2, 3, and 4 are complete. Step 8 has no dependencies and can execute at any time.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Constants | [COMPLETE] | 2026-03-21 | Created `types/reading-plans.ts` and `constants/reading-plans.ts` |
| 2 | Reading Plan Data (Plans 1-5) | [COMPLETE] | 2026-03-21 | 5 plan files + index in `data/reading-plans/`. Split into per-plan files as planned. |
| 3 | Reading Plan Data (Plans 6-10) | [COMPLETE] | 2026-03-21 | 5 more plan files, index updated with all 10 plans. |
| 4 | useReadingPlanProgress Hook | [COMPLETE] | 2026-03-21 | Created `hooks/useReadingPlanProgress.ts` with auth guards. |
| 5 | Browser Page (/reading-plans) | [COMPLETE] | 2026-03-21 | Created `ReadingPlans.tsx`, `PlanCard.tsx`, `FilterBar.tsx`, confirm dialog. Route added. |
| 6 | Plan Detail Page | [COMPLETE] | 2026-03-21 | Created `ReadingPlanDetail.tsx`, `DayContent.tsx`, `DaySelector.tsx`, `PlanNotFound.tsx`. Route added. Toast type fixed (info→warning). |
| 7 | Day Completion Tracking | [COMPLETE] | 2026-03-21 | Added IntersectionObserver to `ReadingPlanDetail.tsx` following DevotionalPage pattern. |
| 8 | Navbar Integration | [COMPLETE] | 2026-03-21 | Added "Reading Plans" with BookOpen icon to NAV_LINKS between Daily Devotional and Prayer Wall. |
| 9 | Integration Tests & Polish | [COMPLETE] | 2026-03-21 | 58 tests across 4 test files, all passing. Fixed scrollIntoView jsdom compat, toast type, unused imports. |
