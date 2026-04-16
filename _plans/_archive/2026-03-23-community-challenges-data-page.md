# Implementation Plan: Community Challenges Data Model & Challenge Page

**Spec:** `_specs/community-challenges-data-page.md`
**Date:** 2026-03-23
**Branch:** `claude/feature/community-challenges-data-page`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** `_plans/recon/community-challenges.md` (not applicable — new feature)
**Master Spec Plan:** Not applicable (standalone spec, part of Phase 2.95 community challenges 3-spec sequence)

---

## Architecture Context

### Project Structure
- **Pages:** `frontend/src/pages/` — one file per route (e.g., `ReadingPlans.tsx`, `ReadingPlanDetail.tsx`)
- **Components:** `frontend/src/components/{feature}/` — feature-scoped components (e.g., `components/reading-plans/`)
- **Types:** `frontend/src/types/` — TypeScript interfaces per feature (e.g., `reading-plans.ts`)
- **Constants:** `frontend/src/constants/` — config values and localStorage keys (e.g., `reading-plans.ts`)
- **Data:** `frontend/src/data/` — hardcoded content (e.g., `data/reading-plans/`)
- **Hooks:** `frontend/src/hooks/` — feature-specific hooks (e.g., `useReadingPlanProgress.ts`)
- **Tests:** `frontend/src/pages/__tests__/` and `frontend/src/components/{feature}/__tests__/`

### Patterns to Follow

**Reading Plans** is the closest analogue — same browser + detail page architecture, day navigation, progress tracking via localStorage, frosted glass action callout.

- **Route setup:** Add `<Route>` entries in `App.tsx` (lines 105-150). Import page components at top.
- **Navbar links:** Add to `NAV_LINKS` array in `Navbar.tsx` (line 21-28). Uses `{ label, to, icon? }` shape. Currently: Daily Hub, Bible, Daily Devotional, Reading Plans, Prayer Wall, Music. Per spec, Challenges goes **after Reading Plans, before Prayer Wall** (index 4).
- **PageHero:** `PageHero.tsx` — linear gradient `#0D0620→#0D0620→#6D28D9→#F5F5F5`, Caveat h1, optional subtitle/divider.
- **Detail page hero:** Reading Plans uses custom inline gradient `DETAIL_HERO_STYLE` with `bg-hero-dark` full-page background.
- **Day content:** `max-w-2xl mx-auto px-4 sm:px-6` column, sections separated by `border-t border-white/10`, section label in `text-xs font-medium uppercase tracking-widest text-white/40`, scripture in `font-serif text-base italic leading-relaxed text-white/90 sm:text-lg`.
- **Day navigation:** Previous/Next buttons with `bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 hover:bg-white/15` + DaySelector dropdown with `bg-hero-mid border border-white/15 rounded-xl shadow-lg`.
- **Action callout:** Frosted glass `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6`.
- **Progress bar:** `h-2 rounded-full bg-white/10` container, filled div with `h-2 rounded-full bg-primary transition-all duration-500`.
- **Auth gating:** `useAuth()` from `@/hooks/useAuth`, `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider`. Pattern: check `isAuthenticated`, call `authModal?.openAuthModal('Sign in to ...')` if not.
- **Progress hook:** `useReadingPlanProgress` pattern — `readProgress()`/`writeProgress()` from localStorage, `useState` for reactivity, auth guard on writes.
- **Test setup:** `MemoryRouter` + `ToastProvider` + `AuthModalProvider` wrapping. Mock `useAuth`, `useAuthModal`, `useFaithPoints` via `vi.mock`.

### Liturgical Calendar Integration
- **File:** `frontend/src/constants/liturgical-calendar.ts`
- **Key exports:** `computeEasterDate(year)`, `getAdventStart(year)` (private, need to replicate or adapt logic), `LITURGICAL_SEASONS`, `getLiturgicalSeason(date)`
- **`getAdventStart`** is not currently exported — we need either: (a) export it, or (b) replicate the "nearest Sunday to Nov 30" logic in our challenge start date functions. Option (a) is cleaner — minimal change, just add `export`.
- **Lent:** Ash Wednesday = Easter - 46 days (already computed in `getSeasonRangesForDate` line 208)
- **Easter:** Direct from `computeEasterDate(year)`
- **Pentecost:** Easter + 49 days (line 180)
- **Advent:** `getAdventStart(year)` — nearest Sunday to Nov 30
- **New Year:** January 1 — trivial

### localStorage Keys (New)
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_challenge_progress` | Both | Object keyed by challengeId with join date, current day, completed days, completion timestamp |
| `wr_challenge_reminders` | Both | Array of challenge IDs user wants reminders for |

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Browse `/challenges` | No auth | N/A | Public |
| View challenge detail hero | No auth | N/A | Public |
| Read Day 1 content | No auth (preview) | Step 5 | Public, but no Mark Complete button |
| Read Day 2+ content | Auth required | Step 5 | `useAuth` + auth modal: "Sign in to join this challenge" |
| "Join Challenge" button | Auth required | Step 5 | `useAuth` + auth modal: "Sign in to join this challenge" |
| "Continue" button | Auth required | Step 5 | `useAuth` + auth modal: "Sign in to continue this challenge" |
| "Mark Complete" button | Auth required (not shown logged-out) | Step 5 | Button hidden when `!isAuthenticated` |
| "Remind me" button | Auth required | Step 4 | `useAuth` + auth modal: "Sign in to set a reminder" |
| Day selector (Day 2+) | Auth required if not joined | Step 5 | `useAuth` + auth modal |
| Previous/Next buttons (Day 2+) | Auth required if not joined | Step 5 | `useAuth` + auth modal |
| Feature link ("Go to Prayer >") | No auth | N/A | Feature handles own auth gating |
| Past challenge browsing | No auth for content | Step 5 | All content readable, no progress tracking |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Browser page hero | background | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | PageHero.tsx line 7 |
| Hero H1 | font | Caveat 72px/48px bold white | design-system.md |
| Hero subtitle | font | Inter 18px 400 white/85 | design-system.md |
| Hero padding | padding | `pt-32 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24 px-4` | PageHero.tsx line 24 |
| Detail page bg | background | `bg-hero-dark` (#0D0620) | ReadingPlanDetail.tsx line 137 |
| Detail hero | background | Custom gradient with theme color overlay (see spec) | Adapted from ReadingPlanDetail.tsx line 20-24 |
| Content column | width | `max-w-2xl mx-auto px-4 sm:px-6` | DayContent.tsx line 12 |
| Scripture text | font | Lora italic, `text-base sm:text-lg leading-relaxed text-white/90` | DayContent.tsx line 23 |
| Section label | font | `text-xs font-medium uppercase tracking-widest text-white/40` | DayContent.tsx line 20 |
| Reflection text | font | Inter, `text-base leading-relaxed text-white/80` | DayContent.tsx line 40 |
| Section divider | border | `border-t border-white/10` | DayContent.tsx line 19 |
| Action callout | card | `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6` | DayContent.tsx line 59 |
| Progress bar | track | `h-2 rounded-full bg-white/10` | ReadingPlanDetail.tsx line 167 |
| Progress bar | fill | `h-2 rounded-full bg-{themeColor} transition-all duration-500` | Adapted from ReadingPlanDetail.tsx line 175 |
| Day nav buttons | style | `min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/15` | ReadingPlanDetail.tsx line 224 |
| Day selector trigger | style | Same as day nav buttons + ChevronDown | DaySelector.tsx line 126 |
| Day selector panel | style | `rounded-xl border border-white/15 bg-hero-mid py-2 shadow-lg` | DaySelector.tsx line 140 |
| Featured card (browser) | style | `bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sm:p-8` + `border-t-4` in theme color | Spec requirement 10 |
| Upcoming card (browser) | style | `bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md` | Spec requirement 12 |
| Past card (browser) | style | `bg-gray-50 rounded-xl border border-gray-200 p-4` | Spec requirement 13 |
| Join button | style | Theme color bg, `text-white font-semibold py-3 px-8 rounded-lg` | Spec requirement 10 |
| Remind me button | style | `border border-gray-300 text-text-dark py-2 px-4 rounded-lg text-sm` | Spec requirement 12 |
| Season tag | style | Theme color at 15% opacity bg, theme color text, `rounded-full px-3 py-1 text-xs font-medium` | Spec requirement 12 |
| Completed badge | style | `bg-success/10 text-success text-sm font-medium rounded-full px-4 py-2` | Spec requirement 13 |
| Missed badge | style | `bg-gray-100 text-text-light text-sm font-medium rounded-full px-4 py-2` | Spec requirement 13 |
| Primary CTA | standard | `bg-primary py-3 px-8 font-semibold text-white rounded-lg` | design-system.md |

---

## Design System Reminder

- Worship Room uses Caveat for script/highlighted headings (`font-script`), not Lora
- Lora (`font-serif`) is for scripture text only (italic)
- All inner page heroes use `PageHero.tsx` gradient: `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)`
- All-dark detail pages use `bg-hero-dark` (#0D0620) body, NOT the neutral `#F5F5F5`
- Detail page hero gradient: `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)`
- Content column: `max-w-2xl mx-auto px-4 sm:px-6` — same across Daily Devotional and Reading Plans
- Frosted glass callout: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Day nav buttons: `bg-white/10 text-white border border-white/20 rounded-lg`
- Dropdown panels: `bg-hero-mid border border-white/15 rounded-xl shadow-lg`
- The `Flame` icon from Lucide is already imported in Navbar.tsx (line 6) for liturgical season display
- Mood colors are not relevant to this feature
- The liturgical season theme colors: Lent `#6B21A8`, Easter `#FDE68A`, Pentecost `#DC2626`, Advent `#7C3AED`, New Year: use `#059669` (ordinary-time green) as there's no liturgical "New Year" season

---

## Shared Data Models

### TypeScript Interfaces (new)

```typescript
// types/challenges.ts

export type ChallengeSeason = 'lent' | 'easter' | 'pentecost' | 'advent' | 'newyear'

export type ChallengeActionType = 'pray' | 'journal' | 'meditate' | 'music' | 'gratitude' | 'prayerWall'

export interface ChallengeScripture {
  reference: string
  text: string
}

export interface DayChallengeContent {
  dayNumber: number
  title: string
  scripture: ChallengeScripture
  reflection: string
  dailyAction: string
  actionType: ChallengeActionType
}

export interface Challenge {
  id: string
  title: string
  description: string
  season: ChallengeSeason
  getStartDate: (year: number) => Date
  durationDays: number
  icon: string // Lucide icon name
  themeColor: string
  dailyContent: DayChallengeContent[]
  communityGoal: string
}

export interface ChallengeProgress {
  joinedAt: string  // ISO timestamp
  currentDay: number
  completedDays: number[]
  completedAt: string | null
}

export type ChallengeProgressMap = Record<string, ChallengeProgress>
```

### localStorage Keys
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_challenge_progress` | Both | `ChallengeProgressMap` — progress keyed by challengeId |
| `wr_challenge_reminders` | Both | `string[]` — array of challenge IDs with reminders set |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column cards, full-width active card, stacked day nav buttons, full-width dropdown, `px-4` side padding |
| Tablet | 640-1024px | 2-column grid for upcoming/past cards, horizontal day nav, inline day selector |
| Desktop | > 1024px | Full-width active card with horizontal layout, 2-col upcoming grid with `max-w-4xl`, `max-w-2xl` content column on detail |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → first content section (browser) | 32px | `pt-8` matching Prayer Wall main content |
| Card section → next section | 48px | `py-8 sm:py-12` sections |
| Hero → day content (detail) | 32px-40px | `pt-8 sm:pt-10` from DayContent.tsx line 14 |
| Content section → next section (detail) | Section spacing via `py-8 sm:py-10` | DayContent.tsx lines 19, 36, 48, 58 |
| Last section → footer | Standard Layout footer gap | Handled by Layout component |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/community-challenges-data-page` exists (already created)
- [ ] Liturgical calendar's `getAdventStart` can be exported (minimal change to existing file)
- [ ] Bible text for all challenge days is WEB translation and accurately transcribed
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from design-system.md recon + codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] No recon report needed (new feature, not modifying existing pages)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `getAdventStart` export | Export the existing private function from `liturgical-calendar.ts` | Cleaner than duplicating the logic; minimal change to existing file |
| New Year theme color | `#059669` (ordinary-time green, since no liturgical "New Year" season) | The spec says "matching the liturgical season color" but New Year isn't a liturgical season. Green/renewal is thematically appropriate. Spec table says to use seasonal colors — New Year will be differentiated. |
| Participant count capping | Cap at 2,000 per spec formula | Mock data — simple Math.min cap |
| Challenge data file structure | Single `data/challenges.ts` file with all 5 challenges | Unlike Reading Plans which has separate files per plan, challenges are smaller in scope (max 40 days) and only 5 total |
| Theme color for action callout button | Use challenge's `themeColor` instead of `bg-primary` | Per spec: "Mark Complete" and "Join Challenge" buttons use the challenge's theme color |
| Past challenges: day locking | No locking for past challenges — all content accessible | Per spec edge case: "all days are accessible (no locking for past challenges)" |
| Challenge still in progress after calendar window ends | Allow user to continue | Per spec: "they can continue completing remaining days" |
| Day 1 preview for logged-out | Show full content without Mark Complete button | Per spec: "Full Day 1 content readable without the 'Mark Complete' button" |
| Pulsing nav dot animation | CSS `@keyframes` with `prefers-reduced-motion` check | Per spec: "purely CSS — no JavaScript polling or timers" and a11y requirement |
| Reflection field type | Single string (not array) | Spec says "1-2 paragraphs" as a single reflection block; use `\n\n` for paragraph breaks, render with `whitespace: pre-line` or split on `\n\n` |

---

## Implementation Steps

### Step 1: Types, Constants & Liturgical Calendar Export

**Objective:** Define TypeScript interfaces, localStorage key constants, and export `getAdventStart` from the liturgical calendar.

**Files to create/modify:**
- `frontend/src/types/challenges.ts` — New file, challenge type definitions
- `frontend/src/constants/challenges.ts` — New file, localStorage key constants and helper functions
- `frontend/src/constants/liturgical-calendar.ts` — Add `export` to `getAdventStart` function (line 137)

**Details:**

**`types/challenges.ts`** — Define all interfaces per the Shared Data Models section above: `ChallengeSeason`, `ChallengeActionType`, `ChallengeScripture`, `DayChallengeContent`, `Challenge`, `ChallengeProgress`, `ChallengeProgressMap`.

**`constants/challenges.ts`:**
```typescript
export const CHALLENGE_PROGRESS_KEY = 'wr_challenge_progress'
export const CHALLENGE_REMINDERS_KEY = 'wr_challenge_reminders'

export const CHALLENGE_SEASONS = ['lent', 'easter', 'pentecost', 'advent', 'newyear'] as const

export const ACTION_TYPE_LABELS: Record<ChallengeActionType, string> = {
  pray: 'Prayer', journal: 'Journal', meditate: 'Meditation',
  music: 'Music', gratitude: 'Gratitude', prayerWall: 'Prayer Wall',
}

export const ACTION_TYPE_ROUTES: Record<ChallengeActionType, string> = {
  pray: '/daily?tab=pray', journal: '/daily?tab=journal',
  meditate: '/daily?tab=meditate', music: '/music',
  gratitude: '/meditate/gratitude', prayerWall: '/prayer-wall',
}
```

**Liturgical calendar change:** Add `export` keyword to `function getAdventStart` on line 137 of `liturgical-calendar.ts`. This is a single-word addition to an existing function.

**`getParticipantCount` utility function** in `constants/challenges.ts`:
```typescript
export function getParticipantCount(challengeId: string, calendarDayWithinChallenge: number): number {
  return Math.min(500 + (calendarDayWithinChallenge * 23) + (challengeId.length * 47), 2000)
}

export function getCommunityGoalProgress(participantCount: number, goalNumber: number): number {
  return Math.min(participantCount * 3, goalNumber)
}
```

**Guardrails (DO NOT):**
- DO NOT modify any existing types or constants beyond adding `export` to `getAdventStart`
- DO NOT add any UI code in this step
- DO NOT create localStorage entries — that's the hook's job

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getParticipantCount` returns deterministic value | unit | Same inputs → same output |
| `getParticipantCount` caps at 2000 | unit | Large calendarDay produces max 2000 |
| `getCommunityGoalProgress` caps at goalNumber | unit | Verify Math.min works correctly |
| `ACTION_TYPE_ROUTES` maps all 6 types | unit | All keys present and point to valid routes |

**Expected state after completion:**
- [ ] `types/challenges.ts` exists with all interfaces
- [ ] `constants/challenges.ts` exists with keys, labels, routes, and utility functions
- [ ] `getAdventStart` is exported from `liturgical-calendar.ts`
- [ ] All tests pass

---

### Step 2: Challenge Data — 5 Hardcoded Challenges with Full Daily Content

**Objective:** Create the challenge data file with all 5 challenges, their start date computation functions, and full daily content (scripture, reflection, daily action) for all days.

**Files to create:**
- `frontend/src/data/challenges.ts` — All 5 challenge definitions with complete daily content

**Details:**

Each challenge uses `computeEasterDate` and `getAdventStart` from `liturgical-calendar.ts` for start date computation.

**Challenge definitions:**

| # | id | title | season | duration | themeColor | icon | communityGoal |
|---|---|---|---|---|---|---|---|
| 1 | `pray40-lenten-journey` | "Pray40: A Lenten Journey" | `lent` | 40 | `#6B21A8` | `Heart` | "10,000 prayers as a community" |
| 2 | `easter-joy-resurrection-hope` | "Easter Joy: 7 Days of Resurrection Hope" | `easter` | 7 | `#FDE68A` | `Sun` | "5,000 moments of gratitude" |
| 3 | `fire-of-pentecost` | "Fire of Pentecost: 21 Days of the Spirit" | `pentecost` | 21 | `#DC2626` | `Flame` | "7,000 prayers for boldness" |
| 4 | `advent-awaits` | "Advent Awaits: 21 Days to Christmas" | `advent` | 21 | `#7C3AED` | `Star` | "8,000 acts of kindness" |
| 5 | `new-year-new-heart` | "New Year, New Heart: 21 Days of Renewal" | `newyear` | 21 | `#059669` | `Leaf` | "6,000 journal entries of hope" |

**Start date functions:**
```typescript
getStartDate: (year) => {
  // Lent: Ash Wednesday = Easter - 46 days
  const easter = computeEasterDate(year)
  return new Date(year, easter.getMonth(), easter.getDate() - 46)
}
// Easter: computeEasterDate(year)
// Pentecost: Easter + 49 days
// Advent: getAdventStart(year)
// New Year: new Date(year, 0, 1)
```

**Daily content authoring rules (from spec):**
- All scripture in WEB (World English Bible) translation
- Reflections: warm, encouraging, practical, non-denominational, second-person ("you") voice
- Daily actions: specific, completable in 5-15 minutes, clearly mapped to one actionType
- Action type distribution: variety across all 6 types within each challenge, weighted by theme

**Action type distribution targets:**
- **Lent (40 days):** ~12 pray, ~8 journal, ~8 meditate, ~4 music, ~4 gratitude, ~4 prayerWall
- **Easter (7 days):** ~2 pray, ~1 journal, ~1 meditate, ~1 music, ~1 gratitude, ~1 prayerWall
- **Pentecost (21 days):** ~6 pray, ~4 journal, ~4 meditate, ~3 music, ~2 gratitude, ~2 prayerWall
- **Advent (21 days):** ~5 pray, ~4 journal, ~4 meditate, ~3 music, ~3 gratitude, ~2 prayerWall
- **New Year (21 days):** ~4 pray, ~5 journal, ~4 meditate, ~3 music, ~3 gratitude, ~2 prayerWall

**This is the largest step in the plan.** The 40-day Lent challenge alone has 40 daily entries, each with a scripture passage (reference + full WEB text), a 1-2 paragraph reflection, and a daily action. Total: 110 days of content across all 5 challenges.

**Exported lookup function:**
```typescript
export const CHALLENGES: Challenge[] = [...]
export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find(c => c.id === id)
}
```

**Guardrails (DO NOT):**
- DO NOT use any copyrighted Bible translations — WEB only
- DO NOT write preachy or judgmental reflections — always encouraging, hopeful, second-person
- DO NOT claim divine authority ("God is telling you...") — use "Scripture encourages us..." language
- DO NOT make all days the same action type — distribute across all 6 types
- DO NOT use HTML or Markdown in reflection text — plain text with `\n\n` for paragraph breaks
- DO NOT modify any existing data files

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All 5 challenges exist | unit | `CHALLENGES.length === 5` |
| Each challenge has correct duration | unit | Lent=40, Easter=7, Pentecost=21, Advent=21, NewYear=21 |
| Each challenge has matching dailyContent length | unit | `challenge.dailyContent.length === challenge.durationDays` |
| Day numbers are sequential 1-N | unit | Each challenge's days are `[1, 2, ..., N]` |
| All 6 action types used in each challenge | unit | Every challenge uses at least 4 of 6 action types |
| Lent start date correct for 2026 | unit | Feb 18, 2026 (Ash Wednesday) |
| Easter start date correct for 2026 | unit | April 5, 2026 |
| Pentecost start date correct for 2026 | unit | May 24, 2026 |
| Advent start date correct for 2026 | unit | Nov 29, 2026 |
| New Year start date for any year | unit | January 1 |
| Start dates correct for 2027 | unit | Lent: Feb 10, Easter: Mar 28, etc. |
| All scriptures have reference and text | unit | No empty `reference` or `text` |
| All reflections are non-empty | unit | No empty reflection strings |
| All daily actions are non-empty | unit | No empty dailyAction strings |
| `getChallenge` returns correct challenge | unit | Lookup by ID works |
| `getChallenge` returns undefined for invalid ID | unit | Graceful handling |

**Expected state after completion:**
- [ ] `data/challenges.ts` exists with 5 complete challenges
- [ ] All 110 days of content authored
- [ ] Start date functions use liturgical calendar correctly
- [ ] All tests pass

---

### Step 3: useChallengeProgress Hook

**Objective:** Create the progress tracking hook following the `useReadingPlanProgress` pattern.

**Files to create:**
- `frontend/src/hooks/useChallengeProgress.ts` — Progress tracking hook

**Details:**

Follow the exact pattern from `useReadingPlanProgress.ts` (lines 1-113):
- `readProgress()` / `writeProgress()` private functions for localStorage
- `useState(readProgress)` for reactivity
- All write operations guarded by `isAuthenticated`

**Hook API:**
```typescript
export function useChallengeProgress() {
  const { isAuthenticated } = useAuth()
  // ...
  return {
    getProgress,       // (challengeId: string) => ChallengeProgress | undefined
    joinChallenge,     // (challengeId: string) => void — creates entry with currentDay:1
    completeDay,       // (challengeId: string, dayNumber: number) => void
    isChallengeJoined, // (challengeId: string) => boolean
    isChallengeCompleted, // (challengeId: string) => boolean
    getReminders,      // () => string[]
    toggleReminder,    // (challengeId: string) => void — add/remove from reminders
  }
}
```

**Key logic:**
- `joinChallenge`: Creates `{ joinedAt: new Date().toISOString(), currentDay: 1, completedDays: [], completedAt: null }`
- `completeDay`: Only works on the user's current day. Adds to `completedDays`, increments `currentDay`. If all days complete, sets `completedAt`.
- `toggleReminder`: Reads `wr_challenge_reminders` array, adds/removes the challenge ID
- All writes no-op when `!isAuthenticated`

**Auth gating:**
- `joinChallenge`, `completeDay`, `toggleReminder` all check `isAuthenticated` and no-op if false
- Read operations (`getProgress`, `isChallengeJoined`, etc.) work regardless of auth

**Guardrails (DO NOT):**
- DO NOT write to localStorage when user is not authenticated
- DO NOT allow completing days out of order
- DO NOT allow completing a day that's already completed
- DO NOT mutate state objects directly — always create new objects

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `joinChallenge` creates progress entry | unit | Verify localStorage write with correct shape |
| `joinChallenge` no-ops when not authenticated | unit | No localStorage write |
| `completeDay` advances currentDay | unit | currentDay increments |
| `completeDay` adds to completedDays | unit | Array grows |
| `completeDay` sets completedAt on final day | unit | Non-null when all days done |
| `completeDay` no-ops for wrong day | unit | Only current day can be completed |
| `completeDay` no-ops for already completed day | unit | Idempotent |
| `isChallengeJoined` returns false for unknown | unit | Unjoined challenge |
| `isChallengeCompleted` returns true when all days done | unit | completedAt is set |
| `toggleReminder` adds reminder | unit | Array contains challenge ID |
| `toggleReminder` removes existing reminder | unit | Toggle behavior |
| `toggleReminder` no-ops when not authenticated | unit | No localStorage write |
| Multiple challenges tracked simultaneously | unit | Two different challenge IDs, both tracked |
| Progress persists across hook re-instantiation | unit | Read from localStorage on init |

**Expected state after completion:**
- [ ] `hooks/useChallengeProgress.ts` exists
- [ ] All localStorage operations are auth-gated
- [ ] All tests pass

---

### Step 4: Challenges Browser Page (`/challenges`)

**Objective:** Build the browser page with PageHero, active challenge featured card, upcoming cards grid, past challenges section, and reminder toggles.

**Files to create/modify:**
- `frontend/src/pages/Challenges.tsx` — New page component
- `frontend/src/components/challenges/ActiveChallengeCard.tsx` — Featured active challenge card
- `frontend/src/components/challenges/UpcomingChallengeCard.tsx` — Medium card for upcoming challenges
- `frontend/src/components/challenges/PastChallengeCard.tsx` — Muted card for past challenges
- `frontend/src/components/challenges/NextChallengeCountdown.tsx` — Countdown when no challenge is active
- `frontend/src/App.tsx` — Add route `/challenges`

**Details:**

**Page structure:**
1. `<Layout>` wrapper
2. `<PageHero title="Community Challenges" subtitle="Grow together in faith" />` — uses existing `PageHero` component
3. Content area on `bg-neutral-bg` (#F5F5F5) background
4. `max-w-4xl mx-auto px-4 sm:px-6` container for card grid

**Challenge categorization logic** (in page component):
```typescript
function getChallengeStatus(challenge: Challenge, today: Date): 'active' | 'upcoming' | 'past' {
  const year = today.getFullYear()
  const startDate = challenge.getStartDate(year)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + challenge.durationDays - 1)

  // Also check previous year (for challenges that might have started in prior year)
  // Also check next year (for upcoming)
  // ... compute for current year, next year, prev year
  // Return 'active' if today is within [startDate, endDate]
  // Return 'upcoming' if startDate is in the future
  // Return 'past' if endDate is in the past
}
```

Important: Need to check multiple years since challenges are seasonal. For any given date, we must find the most relevant instance of each challenge (current year, next year, or previous year).

**Active Challenge Card (`ActiveChallengeCard.tsx`):**
- White card: `bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sm:p-8`
- Top border accent: `border-t-4` with inline `borderTopColor: challenge.themeColor`
- Challenge icon (Lucide, dynamically rendered from icon name string)
- Title in `text-2xl sm:text-3xl font-bold text-text-dark`
- Days remaining: bold countdown in theme color
- Participant count with `Users` icon, `text-text-light text-sm`
- Community goal display
- CTA: "Join Challenge" / "Continue" / "Completed" badge (auth-gated)
- Progress indicator if joined: "Day X of Y"
- Desktop layout: icon+title left, countdown+CTA right (`flex flex-col sm:flex-row sm:items-center sm:justify-between`)

**Upcoming Challenge Card (`UpcomingChallengeCard.tsx`):**
- `bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow`
- Icon + title + description (2-line truncation: `line-clamp-2`)
- Season tag pill: inline style `backgroundColor: ${themeColor}26` (15% opacity hex), `color: themeColor`
- Duration: "40 days" / "21 days" / "7 days"
- Start date: "Starts March 1"
- "Remind me" button (auth-gated)
- Click → `/challenges/${challenge.id}`

**Past Challenge Card (`PastChallengeCard.tsx`):**
- `bg-gray-50 rounded-xl border border-gray-200 p-4`
- Icon + title + season tag
- "Completed" badge or "Missed" badge
- Click → `/challenges/${challenge.id}`

**Next Challenge Countdown (`NextChallengeCountdown.tsx`):**
- Shown when no challenge is currently active
- "Next challenge starts in X days" with next challenge's title
- Preview of description
- "Remind me" button (auth-gated)
- Visually subdued compared to active card

**Section ordering:** Active (or countdown) → Upcoming → Past

**Dynamic Lucide icon rendering:** Create a small icon map:
```typescript
import { Heart, Sun, Flame, Star, Leaf } from 'lucide-react'
const CHALLENGE_ICON_MAP: Record<string, LucideIcon> = { Heart, Sun, Flame, Star, Leaf }
```

**Auth gating:**
- "Join Challenge" → `authModal?.openAuthModal('Sign in to join this challenge')`
- "Continue" → `authModal?.openAuthModal('Sign in to continue this challenge')`
- "Remind me" → `authModal?.openAuthModal('Sign in to set a reminder')`

**Responsive behavior:**
- Desktop (> 1024px): Active card full-width horizontal layout, upcoming 2-col grid, past 2-col grid
- Tablet (640-1024px): Same as desktop but narrower
- Mobile (< 640px): All single column, stacked

**Route addition in App.tsx:** Add `<Route path="/challenges" element={<Challenges />} />` after the reading plans routes.

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT persist anything to localStorage for logged-out users
- DO NOT show "Mark Complete" on the browser page (that's the detail page)
- DO NOT forget the empty state ("New challenges are coming soon...")

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Page renders with PageHero | integration | Title and subtitle visible |
| Active challenge card renders when challenge is running | integration | Card with title, countdown, CTA visible |
| Countdown renders when no challenge active | integration | "Next challenge starts in X days" |
| Upcoming challenges render in grid | integration | Cards visible with title, description, season tag |
| Past challenges render with badges | integration | "Completed" or "Missed" badges |
| "Join Challenge" shows auth modal when logged out | integration | Auth modal opens with message |
| "Remind me" shows auth modal when logged out | integration | Auth modal opens |
| "Remind me" toggles reminder when logged in | integration | Button text changes |
| Cards link to detail page | integration | Click navigates to `/challenges/:id` |
| Route `/challenges` renders the page | integration | Routing works |
| Empty state renders as fallback | unit | Safety net message |
| Responsive: mobile single column | integration | Card layout stacks |

**Expected state after completion:**
- [ ] `/challenges` route works
- [ ] PageHero renders with correct title/subtitle
- [ ] Active challenge card displays with all info
- [ ] Upcoming/past challenge cards render correctly
- [ ] Auth gating works for Join/Remind buttons
- [ ] All tests pass

---

### Step 5: Challenge Detail Page (`/challenges/:challengeId`)

**Objective:** Build the challenge detail page with hero, daily content, day navigation, progress tracking, Mark Complete, and completion celebration.

**Files to create/modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — New page component
- `frontend/src/components/challenges/ChallengeDayContent.tsx` — Day content column
- `frontend/src/components/challenges/ChallengeDaySelector.tsx` — Day selector dropdown (adapted from Reading Plans)
- `frontend/src/components/challenges/ChallengeNotFound.tsx` — 404 for invalid challenge ID
- `frontend/src/App.tsx` — Add route `/challenges/:challengeId`

**Details:**

**Page structure:**
1. `<Layout>` wrapper
2. `min-h-screen bg-hero-dark` full-page dark background
3. Hero section with custom gradient
4. Day content column
5. Day navigation (Previous/Next + DaySelector)

**Hero section:**
- Background: Standard dark hero + theme color radial overlay:
  ```typescript
  const heroStyle = {
    backgroundImage: `radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 0%, transparent 60%), radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)`,
    backgroundSize: '100% 100%',
  }
  ```
- Challenge icon (Lucide, large)
- Title: `font-script text-5xl font-bold text-white sm:text-6xl lg:text-7xl`
- Description: `text-base text-white/85 sm:text-lg`
- Progress bar (if joined, not completed): `h-2 rounded-full bg-white/10`, fill in theme color
- Participant count: `Users` icon + count + `text-white/60 text-sm`
- Community goal: mini progress bar + text, `text-white/50 text-xs`

**Day content (`ChallengeDayContent.tsx`):**
- Follow `DayContent.tsx` from Reading Plans exactly:
  - `mx-auto max-w-2xl px-4 sm:px-6`
  - Day title: `text-2xl font-bold text-white sm:text-3xl` centered
  - Scripture section: reference label (`text-xs font-medium uppercase tracking-widest text-white/40`), verse text in `font-serif text-base italic leading-relaxed text-white/90 sm:text-lg`
  - Reflection section: `text-base leading-relaxed text-white/80` with paragraph splitting on `\n\n`
  - Daily action callout: frosted glass card with action type icon, "Today's action:" label, action text, "Mark Complete" button, feature link
- Sections separated by `border-t border-white/10` with `py-8 sm:py-10`

**Daily action callout specifics:**
- Frosted glass: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6`
- Action type icon (Lucide — map: pray→`HandHeart`?, journal→`PenLine`, meditate→`Brain`, music→`Music`, gratitude→`Heart`, prayerWall→`MessageSquare`)
- "Today's action:" in `text-sm text-white/40`
- Action text in `text-lg font-medium text-white`
- "Mark Complete" button: full-width, theme color background, `text-white font-semibold py-3 rounded-lg`
  - Only visible for the user's current uncompleted day AND `isAuthenticated`
  - Hidden for logged-out users, completed days, non-current days, past challenges
- Feature link: `text-sm font-medium` in theme color, e.g. "Go to Prayer →" linking to `ACTION_TYPE_ROUTES[actionType]`

**Day sequencing:**
- Current day = `Math.min(daysSince(progress.joinedAt) + 1, challenge.durationDays)` — but spec says days are sequential, not calendar-based. User's current day is determined by their `currentDay` from progress.
- Actually re-reading spec requirement 18: "Days are sequential based on when the user joined, not the calendar date." The `currentDay` in progress tracks this — user advances by completing days, not by calendar time passing.

**Day navigation:**
- Reuse the pattern from `DaySelector.tsx` and `ReadingPlanDetail.tsx` Previous/Next buttons
- **ChallengeDaySelector** adapted from `DaySelector.tsx` — same keyboard navigation, same dropdown styling
- Locked days for active challenges (beyond current progress)
- No locking for past challenges (all content accessible)
- Day 1 always accessible for previewing (even for non-joined users)

**Day accessibility rules:**
- Day 1: Always accessible (preview for logged-out)
- Day 2+: Requires auth + challenge joined + day ≤ currentDay OR day in completedDays
- Past challenges: All days accessible (read-only)
- Clicking a locked day: toast "Complete today's challenge to unlock the next day."

**Mark Complete logic:**
- Only fires for user's current uncompleted day
- Updates `currentDay + 1`, adds to `completedDays`
- On final day: sets `completedAt`, shows completion celebration message

**Completion celebration:**
- On the last day's content, after Mark Complete: brief message below the action callout
- "You've completed [Challenge Title]! What an incredible journey. [Participant count] others completed this challenge with you."
- Styled in a success-themed card: `bg-success/10 border border-success/20 rounded-2xl p-6 text-center`

**Edge cases:**
- Invalid challenge ID → `ChallengeNotFound` component with link to `/challenges`
- Future challenge → Show description, start date countdown, "Remind me" CTA, no day content
- Past challenge → All content readable, no "Mark Complete" buttons
- Logged-out Day 2+ → Auth modal: "Sign in to join this challenge"

**Auth gating:**
- Day 2+ content → auth modal if not joined
- "Mark Complete" → hidden for logged-out
- "Join Challenge" (on hero if not joined, active challenge) → auth modal
- Navigation to Day 2+ → auth modal if not joined

**Responsive behavior:**
- Desktop: Generous hero padding, `max-w-2xl` content column, horizontal nav buttons
- Tablet: Slightly reduced padding, same layout
- Mobile: Full-width content `px-4`, stacked nav buttons, full-width dropdown, full-width Mark Complete, `p-4` on callout

**Route addition:** `<Route path="/challenges/:challengeId" element={<ChallengeDetail />} />`

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT allow completing days out of order
- DO NOT show Mark Complete for logged-out users or non-current days
- DO NOT lock days for past challenges
- DO NOT auto-complete on scroll (unlike Reading Plans — challenges use explicit Mark Complete button per spec requirement 20)
- DO NOT forget the Day 1 preview for logged-out users

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Page renders with hero for valid challenge | integration | Title, description, icon visible |
| Invalid challenge shows ChallengeNotFound | integration | "Challenge not found" message + link |
| Day 1 content renders for logged-out user | integration | Scripture, reflection, action visible |
| Day 1 does not show Mark Complete for logged-out | integration | Button absent |
| Day 2 access shows auth modal for logged-out | integration | Auth modal with message |
| "Join Challenge" auth gates for logged-out | integration | Auth modal opens |
| Joining creates progress entry | integration | localStorage updated |
| Mark Complete advances currentDay | integration | Progress updated |
| Mark Complete hidden for completed days | integration | Button absent on revisited day |
| Mark Complete hidden for non-current day | integration | Only current day shows button |
| Final day completion shows celebration | integration | Celebration message visible |
| Previous/Next navigation works | integration | Selected day changes |
| Day selector dropdown opens and selects | integration | Dropdown interaction |
| Locked day in selector shows toast | integration | Warning toast appears |
| Past challenge shows all days unlocked | integration | No Lock icons |
| Future challenge shows countdown, no content | integration | Start date countdown visible |
| Progress bar reflects completion percentage | integration | Width matches percentage |
| Feature link navigates to correct route | integration | "Go to Prayer >" links to /daily?tab=pray |
| Community goal shows progress | integration | Progress bar + text |
| Participant count displayed | integration | Number with Users icon |

**Expected state after completion:**
- [ ] `/challenges/:challengeId` route works
- [ ] Hero renders with theme color gradient
- [ ] Day content matches Reading Plans style
- [ ] Mark Complete works with auth gating
- [ ] Day navigation (Previous/Next/Selector) works
- [ ] All edge cases handled (invalid ID, future, past)
- [ ] All tests pass

---

### Step 6: Navbar Integration with Active Season Pulsing Dot

**Objective:** Add "Challenges" to the navbar with a Flame icon and active season pulsing dot indicator.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Add Challenges link + pulsing dot
- `frontend/src/index.css` — Add pulsing dot animation (if not using Tailwind keyframes)

**Details:**

**NAV_LINKS modification (Navbar.tsx line 21-28):**
Insert new entry at index 4 (after Reading Plans, before Prayer Wall):
```typescript
const NAV_LINKS = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Bible', to: '/bible', icon: Book },
  { label: 'Daily Devotional', to: '/devotional', icon: Sparkles },
  { label: 'Reading Plans', to: '/reading-plans', icon: BookOpen },
  { label: 'Challenges', to: '/challenges', icon: Flame },  // NEW
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Music', to: '/music' },
]
```

`Flame` is already imported at line 6 of Navbar.tsx for the liturgical season icon map.

**Active season pulsing dot:**
- Check if any challenge is currently active using the challenge status logic
- Render a small 6px circle next to the "Challenges" nav text
- CSS-only pulse animation
- Uses the active challenge's theme color
- Respects `prefers-reduced-motion` (static dot, no animation)

**Implementation approach:**
- Create a helper function `getActiveChallengeInfo()` that checks all 5 challenges against today's date and returns `{ isActive: boolean, themeColor: string }` (or null)
- Export this from `constants/challenges.ts` or a shared utility
- In the nav link rendering, conditionally add the pulsing dot after the "Challenges" text

**Pulsing dot CSS (add to Tailwind config or index.css):**
```css
@keyframes challenge-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.3); }
}
.animate-challenge-pulse {
  animation: challenge-pulse 2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-challenge-pulse { animation: none; }
}
```

**Dot markup (next to "Challenges" text in nav):**
```tsx
{isActiveChallengeNow && (
  <span
    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full animate-challenge-pulse"
    style={{ backgroundColor: activeChallengeThemeColor }}
    aria-hidden="true"
  />
)}
```

**Mobile drawer:** The link automatically appears because the mobile drawer iterates over `NAV_LINKS`. The pulsing dot will need to be rendered in the mobile drawer link rendering as well.

**Active state:** The `NavLink` component from React Router automatically handles active state via the `getNavLinkClass` function. Since we're adding to `NAV_LINKS`, it works automatically for both `/challenges` and `/challenges/:challengeId` (because NavLink with `to="/challenges"` is active when the path starts with `/challenges`).

Wait — actually NavLink's default `end` behavior may cause issues. Check: by default React Router's `NavLink` considers a link active only for exact match. For `/challenges/some-id` to also highlight `/challenges`, we need the link to match. Looking at the existing code: the links in the nav use `NavLink` with the default behavior. Let me verify — looking at `ReadingPlans`: the nav link is `to="/reading-plans"` and when on `/reading-plans/:planId` it should also be active. Looking at the existing codebase, NavLink by default does NOT match descendant routes unless `end={false}` is set.

Actually, React Router v6 NavLink: without `end` prop (or `end={true}`), a NavLink is only active for exact match. With `end={false}`, it matches any path starting with the `to` value. Looking at the existing NAV_LINKS rendering... I need to check how the existing links handle this.

In the existing Navbar code, the `NavLink` for `/reading-plans` would need `end={false}` to also be active on `/reading-plans/:planId`. I'll check if this is already handled and follow the same pattern.

**Guardrails (DO NOT):**
- DO NOT use JavaScript timers for the pulsing animation — CSS only
- DO NOT modify existing nav links — only insert the new one
- DO NOT break the mobile drawer layout
- DO NOT make the pulsing dot overly distracting
- DO NOT forget `aria-hidden="true"` on the decorative dot
- DO NOT forget `prefers-reduced-motion` media query

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Challenges" link appears in desktop nav | integration | Link text visible |
| "Challenges" link appears in mobile drawer | integration | Link visible in drawer |
| "Challenges" link has Flame icon | integration | Icon rendered |
| Link navigates to /challenges | integration | Click → correct route |
| Active underline shows on /challenges | integration | Active class applied |
| Pulsing dot shows during active challenge | integration | Dot visible with correct color |
| Pulsing dot hidden when no active challenge | integration | Dot not in DOM |
| No regressions on existing nav links | integration | All other links still work |

**Expected state after completion:**
- [ ] "Challenges" link in navbar after "Reading Plans"
- [ ] Flame icon renders next to link text
- [ ] Active state works for `/challenges` and `/challenges/:challengeId`
- [ ] Pulsing dot appears during active challenge seasons
- [ ] Pulsing dot respects `prefers-reduced-motion`
- [ ] Mobile drawer includes "Challenges"
- [ ] All tests pass
- [ ] No regressions on existing navbar

---

### Step 7: Accessibility & Polish Pass

**Objective:** Ensure all components meet accessibility requirements, add missing ARIA attributes, verify touch targets, and polish responsive behavior.

**Files to modify:**
- All files created in Steps 4-6 as needed

**Details:**

**Accessibility checklist (from spec):**
- [ ] All text meets WCAG AA color contrast — verify theme colors against white and dark backgrounds
  - Easter yellow `#FDE68A` against dark bg — may need darker text variant for buttons. [UNVERIFIED] Easter theme color contrast.
    → To verify: Check `#FDE68A` against `#0D0620` (dark bg) and white (light bg) via WCAG contrast checker
    → If insufficient: Use `#B45309` (amber-700) or darken the yellow for text, keep yellow for decorative elements
- [ ] "Join Challenge" and "Mark Complete" buttons: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2` focus indicators
- [ ] Day navigation buttons: `aria-label="Go to previous day"` / `aria-label="Go to next day"`
- [ ] Day selector dropdown: full keyboard navigation (ArrowUp/Down, Enter, Escape) — already implemented in `DaySelector.tsx` pattern
- [ ] Locked days: `aria-disabled="true"` in selector
- [ ] Progress bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Participant count: semantic `<p>` element, not just styled span
- [ ] All interactive elements: minimum 44px touch target (`min-h-[44px]` / `min-w-[44px]`)
- [ ] `prefers-reduced-motion`: pulsing dot animation disabled (static dot)
- [ ] Logical heading hierarchy: h1 (page title) → h2 (section headings) → h3 (card titles)
- [ ] "Remind me" toggle: `aria-pressed` attribute reflecting toggle state
- [ ] Screen reader announcements for Mark Complete: use `aria-live` region or toast

**Easter theme color contrast issue:**
The Easter challenge uses `#FDE68A` (yellow) as themeColor. On white backgrounds (browser page cards), yellow text would fail contrast. On dark backgrounds (detail page), yellow text against `#0D0620` passes easily (contrast ratio ~13:1). For the browser page cards (white bg), the "Join Challenge" button uses the theme color as BACKGROUND (not text), so yellow bg + dark text should be fine. Season tag pill: yellow bg + yellow text would fail — use darker variant for text.

**Polish items:**
- Card hover transitions: `transition-shadow duration-200`
- Smooth scroll on day change: `window.scrollTo({ top: 0, behavior: 'smooth' })`
- Loading states: challenge data is synchronous (hardcoded), so no loading states needed
- Theme color consistency: verify the same color appears on card accent, button, tag, progress bar fill, hero overlay

**Guardrails (DO NOT):**
- DO NOT use `outline-none` without a replacement focus indicator
- DO NOT skip ARIA labels on interactive elements
- DO NOT let touch targets drop below 44px on mobile
- DO NOT introduce new accessibility issues

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Progress bar has role="progressbar" and aria attributes | unit | ARIA attributes present |
| Day nav buttons have aria-label | unit | Labels present |
| Locked days have aria-disabled="true" | unit | Attribute present |
| "Remind me" has aria-pressed | unit | Toggle state reflected |
| All buttons meet 44px min touch target | unit | min-h-[44px] class present |
| Keyboard navigation works in day selector | integration | Arrow keys + Enter + Escape |

**Expected state after completion:**
- [ ] All WCAG AA contrast requirements met
- [ ] All interactive elements keyboard accessible
- [ ] All ARIA attributes in place
- [ ] Touch targets ≥ 44px
- [ ] `prefers-reduced-motion` respected
- [ ] All tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types, constants, liturgical calendar export |
| 2 | 1 | Challenge data (uses types and liturgical calendar) |
| 3 | 1 | Progress tracking hook (uses types and constants) |
| 4 | 1, 2, 3 | Browser page (uses all data, types, and progress hook) |
| 5 | 1, 2, 3 | Detail page (uses all data, types, and progress hook) |
| 6 | 2 | Navbar integration (uses challenge data for active season check) |
| 7 | 4, 5, 6 | Accessibility & polish pass (refines all UI steps) |

Steps 4, 5, and 6 can be worked on in parallel after Steps 1-3 are complete, but the plan orders them sequentially for clarity.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types, Constants & Liturgical Calendar Export | [COMPLETE] | 2026-03-23 | Created `types/challenges.ts`, `constants/challenges.ts`, exported `getAdventStart` from `liturgical-calendar.ts`. 7 tests pass. |
| 2 | Challenge Data — 5 Hardcoded Challenges | [COMPLETE] | 2026-03-23 | Created `data/challenges.ts` with all 5 challenges, 110 days of content. All start date functions use liturgical calendar. 16 tests pass. |
| 3 | useChallengeProgress Hook | [COMPLETE] | 2026-03-23 | Created `hooks/useChallengeProgress.ts` following Reading Plans pattern. All localStorage ops auth-gated, sequential day completion enforced. 15 tests pass. |
| 4 | Challenges Browser Page | [COMPLETE] | 2026-03-23 | Created `pages/Challenges.tsx`, `components/challenges/ChallengeIcon.tsx`, `ActiveChallengeCard.tsx`, `UpcomingChallengeCard.tsx`, `PastChallengeCard.tsx`, `NextChallengeCountdown.tsx`. Route `/challenges` added to App.tsx. Used `<Layout>` + `<PageHero>` inline (matching ReadingPlans pattern). 11 tests pass. |
| 5 | Challenge Detail Page | [COMPLETE] | 2026-03-23 | Created `pages/ChallengeDetail.tsx`, `components/challenges/ChallengeDayContent.tsx`, `ChallengeDaySelector.tsx`, `ChallengeNotFound.tsx`. Route `/challenges/:challengeId` added to App.tsx. Hero with theme color gradient, day content, Mark Complete, completion celebration, day nav. 13 tests pass. |
| 6 | Navbar Integration with Pulsing Dot | [COMPLETE] | 2026-03-23 | Added "Challenges" with Flame icon to NAV_LINKS (index 4). Pulsing dot in DesktopNav + MobileDrawer using `getActiveChallengeInfo()`. CSS animation in index.css with `prefers-reduced-motion`. 3 new tests pass + 50 existing Navbar tests pass (no regressions). |
| 7 | Accessibility & Polish Pass | [COMPLETE] | 2026-03-23 | Fixed: progress bars have `role="progressbar"` + ARIA attrs, reminder toggles have `aria-pressed`, PastChallengeCard `min-h-[44px]`, heading hierarchy (h3 in ChallengeDayContent), "Go to" link touch target, community goal progress bar ARIA. Easter yellow `#FDE68A` contrast fixed with `getContrastSafeColor()` → `#92400E` on light backgrounds. `prefers-reduced-motion` handled in CSS. 8 accessibility tests pass. |
