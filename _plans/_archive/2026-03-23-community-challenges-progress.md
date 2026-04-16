# Implementation Plan: Community Challenges Progress Tracking & Dashboard Widget

**Spec:** `_specs/community-challenges-progress.md`
**Date:** 2026-03-23
**Branch:** `claude/feature/community-challenges-progress`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** Dashboard & Growth specs (Phase 2.75) — referenced indirectly via codebase inspection
**Spec 1 Dependency:** `_specs/community-challenges-data-page.md` (COMPLETE — committed as `55e871f`)

---

## Architecture Context

### Existing Files & Patterns

**Challenge System (Spec 1 — complete):**
- `frontend/src/types/challenges.ts` — `ChallengeProgress`, `ChallengeProgressMap`, `Challenge`, `DayChallengeContent`, `ChallengeActionType`
- `frontend/src/hooks/useChallengeProgress.ts` — `getProgress`, `joinChallenge`, `completeDay`, `isChallengeJoined`, `isChallengeCompleted`, `toggleReminder`, `getReminders`
- `frontend/src/constants/challenges.ts` — `CHALLENGE_PROGRESS_KEY`, `CHALLENGE_REMINDERS_KEY`, `ACTION_TYPE_LABELS`, `ACTION_TYPE_ROUTES`, `getParticipantCount`, `getContrastSafeColor`
- `frontend/src/data/challenges.ts` — 5 `Challenge` objects with `dailyContent`, `themeColor`, `durationDays`
- `frontend/src/lib/challenge-calendar.ts` — `getChallengeCalendarInfo()`, `getActiveChallengeInfo()`
- `frontend/src/pages/ChallengeDetail.tsx` — detail page with `handleMarkComplete`, `handleJoin`
- `frontend/src/pages/Challenges.tsx` — browser page

**Gamification System (Phase 2.75 — complete):**
- `frontend/src/types/dashboard.ts` — `ActivityType` (union of 9 types: mood|pray|listen|prayerWall|meditate|journal|readingPlan|gratitude|reflection), `DailyActivities`, `BadgeData`, `ActivityCounts`, `BadgeDefinition`, `CelebrationTier`
- `frontend/src/constants/dashboard/activity-points.ts` — `ACTIVITY_POINTS: Record<ActivityType, number>`, `MULTIPLIER_TIERS`, `ALL_ACTIVITY_TYPES`, `ACTIVITY_CHECKLIST_NAMES`, `ACTIVITY_DISPLAY_NAMES`
- `frontend/src/constants/dashboard/badges.ts` — `BADGE_DEFINITIONS[]`, `BADGE_MAP`, `FRESH_ACTIVITY_COUNTS`, `FRESH_BADGE_DATA`
- `frontend/src/hooks/useFaithPoints.ts` — `recordActivity(type: ActivityType)` — idempotent, updates daily activities, faith points, streak, triggers badge checks
- `frontend/src/services/faith-points-storage.ts` — `getActivityLog()`, `getTodayActivities()`, `getFaithPoints()`, `calculateDailyPoints()`, `freshDailyActivities()`, `persistAll()`
- `frontend/src/services/badge-engine.ts` — `checkForNewBadges(context, earned): string[]`
- `frontend/src/services/badge-storage.ts` — `getOrInitBadgeData()`, `addEarnedBadge()`, `incrementActivityCount()`, `saveBadgeData()`, `getBadgeData()`

**Dashboard (Phase 2.75 — complete):**
- `frontend/src/pages/Dashboard.tsx` — orchestrator, renders `DashboardWidgetGrid`, `CelebrationQueue`
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — 5-col grid, staggered entrance animation, 11+ cards in order
- `frontend/src/components/dashboard/DashboardCard.tsx` — reusable frosted glass card with collapse/expand, `id`, `title`, `icon`, `action`, `collapsible`
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — 7+ items, SVG progress ring (R=24, 60×60 viewBox, 6px stroke)
- `frontend/src/components/dashboard/CelebrationOverlay.tsx` — full-screen portal with confetti, badge icon, focus trap, scroll lock, 6s Continue delay, `prefers-reduced-motion` support
- `frontend/src/components/dashboard/CelebrationQueue.tsx` — wraps `useCelebrationQueue` hook, renders overlays
- `frontend/src/hooks/useCelebrationQueue.ts` — processes `newlyEarnedBadges` queue: toasts first (sorted by tier), full-screen last, 1.5s initial delay, 500ms gap between toasts

**Toast System:**
- `frontend/src/components/ui/Toast.tsx` — `ToastProvider`, `useToast()`, `showToast(message, type)` (standard: top-right, 6s auto-dismiss), `showCelebrationToast(badgeName, message, type, icon)` (celebration: bottom)
- Standard toast types: `'success'|'error'|'warning'`
- **No action button support in standard toasts** — the nudge toast will need an extension

**Auth:**
- `frontend/src/hooks/useAuth.ts` / `frontend/src/contexts/AuthContext.tsx` — `useAuth()` returns `{ isAuthenticated, user, login, logout }`
- `frontend/src/components/prayer-wall/AuthModalProvider.tsx` — `useAuthModal()` returns `{ openAuthModal(message) }`

**Settings:**
- `frontend/src/services/settings-storage.ts` — `getSettings()` returns `UserSettings` with deep-merge against `DEFAULT_SETTINGS`. `DEFAULT_SETTINGS.notifications.nudges = true`

### Directory Conventions

- Components: `frontend/src/components/challenges/` (existing), `frontend/src/components/dashboard/` (existing)
- Hooks: `frontend/src/hooks/`
- Services: `frontend/src/services/`
- Constants: `frontend/src/constants/`, `frontend/src/constants/dashboard/`
- Types: `frontend/src/types/`
- Tests: `__tests__/` directories adjacent to source files

### Test Patterns

- Vitest + React Testing Library
- Render with `MemoryRouter`, `ToastProvider`, `AuthModalProvider` wrappers as needed
- `vi.spyOn(Storage.prototype, 'getItem')` / `setItem` for localStorage mocking
- `vi.mock('@/hooks/useAuth')` to control auth state
- Check rendered text/roles, simulate clicks with `fireEvent.click` or `userEvent.click`

### Key Integration Points

1. `ActivityType` union in `types/dashboard.ts` — must add `'challenge'`
2. `ACTIVITY_POINTS` in `constants/dashboard/activity-points.ts` — must add `challenge: 20`
3. `DailyActivities` interface — must add `challenge: boolean`
4. `freshDailyActivities()` in `faith-points-storage.ts` — must add `challenge: false`
5. `extractActivities()` in `useFaithPoints.ts` — must add `challenge`
6. `ACTIVITY_CHECKLIST_NAMES` / `ACTIVITY_DISPLAY_NAMES` — must add `challenge` entry (though challenge is NOT shown in checklist)
7. `ActivityChecklist.tsx` — must NOT include `'challenge'` in `BASE_ACTIVITY_ORDER`
8. `BADGE_DEFINITIONS` in `badges.ts` — must add 7 new badge definitions
9. `FRESH_ACTIVITY_COUNTS` / `ActivityCounts` — must add `challengesCompleted: number`
10. `badge-engine.ts` — must add challenge badge check logic
11. `useChallengeProgress.ts` — must extend `completeDay` with gamification integration, add status/streak/missedDays management, add switch-challenge dialog support
12. `ChallengeDetail.tsx` — must wire gamification into `handleMarkComplete` and `handleJoin`
13. `DashboardWidgetGrid.tsx` — must add Challenge widget card
14. `Toast.tsx` — must extend standard toast to support action button for nudge

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Join Challenge (switch dialog) | Auth modal if logged out | Step 4 | `useAuth` + `useAuthModal` (existing Spec 1 behavior) |
| Mark Complete gamification | No-op if logged out | Step 3 | `isAuthenticated` guard in `completeDay` |
| Auto-detection | Only runs for authenticated users | Step 5 | `isAuthenticated` guard in `useChallengeAutoDetect` |
| Challenge completion celebration | Only for authenticated users | Step 6 | Triggered by `completeDay` which is already auth-gated |
| Dashboard widget | Dashboard is auth-gated | Step 7 | Dashboard route check (existing) |
| Challenge nudge toast | Only for authenticated users | Step 8 | `isAuthenticated` guard in nudge logic |
| Resume paused challenge | Auth modal if logged out | Step 4 | `useAuth` + `useAuthModal` |
| Set reminder (dashboard widget) | Auth modal if logged out | Step 7 | `useAuth` + `useAuthModal` (existing Spec 1 behavior) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm` | DashboardCard.tsx:49 |
| Dashboard card | border | `border border-white/10 rounded-2xl` | DashboardCard.tsx:49 |
| Dashboard card | padding | `p-4 md:p-6` | DashboardCard.tsx:49 |
| SVG progress ring | viewBox / size | `60×60`, radius=24, stroke-width=6 | ActivityChecklist.tsx:27-28 |
| SVG ring unfilled | stroke | `rgba(255,255,255,0.1)` | ActivityChecklist.tsx:126 |
| SVG ring filled | stroke | `#6D28D9` (primary) | ActivityChecklist.tsx:134 |
| Celebration overlay | backdrop | `bg-black/70 backdrop-blur-md` | CelebrationOverlay.tsx:136 |
| Celebration overlay | confetti count | 30 desktop, 15 mobile | CelebrationOverlay.tsx:90 |
| Celebration overlay | button delay | 6s (immediate with reduced motion) | CelebrationOverlay.tsx:98-109 |
| Standard toast | position | `fixed top-4 right-4 z-50` | Toast.tsx:136 |
| Standard toast | auto-dismiss | 6000ms | Toast.tsx:99 |
| Standard toast | style | `rounded-lg border bg-white px-4 py-3 shadow-lg` + left border color | Toast.tsx:143-150 |
| Celebration toast | position | `fixed bottom-4 z-50` | Toast.tsx:160-162 |
| Script font | family | Caveat, `font-script` | 09-design-system.md |

**Challenge theme colors (from `data/challenges.ts`):**
| Challenge | Season | Color |
|-----------|--------|-------|
| Pray40: A Lenten Journey | lent | `#6D28D9` (purple) |
| Easter Joy | easter | `#FDE68A` (yellow — use `#92400E` for text contrast) |
| Fire of Pentecost | pentecost | `#DC2626` (red) |
| Advent Awaits | advent | `#5B21B6` (violet) |
| New Year, New Heart | newyear | `#0891B2` (cyan) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Easter yellow `#FDE68A` fails WCAG contrast — use `getContrastSafeColor()` for text-on-light
- All dashboard cards use `DashboardCard` component with `id`, `title`, `icon` props
- Staggered entrance animations use `motion-safe:animate-widget-enter` with incremented `animationDelay`
- `cn()` from `@/lib/utils` for conditional classnames
- SVG progress ring pattern: 60×60 viewBox, R=24, circumference = 2πR ≈ 150.8, strokeDashoffset for progress
- Toast standard types: `success|error|warning` (top-right, white bg). Celebration types: bottom, dark bg with backdrop-blur
- Badge icons come from `getBadgeIcon(badgeId)` in `constants/dashboard/badge-icons.ts`

---

## Shared Data Models (from Spec 1 + Phase 2.75)

```typescript
// Existing ChallengeProgress (Spec 1) — to be extended
interface ChallengeProgress {
  joinedAt: string
  currentDay: number
  completedDays: number[]
  completedAt: string | null
}

// Extended ChallengeProgress (Spec 2) — adds 3 fields
interface ChallengeProgress {
  joinedAt: string
  currentDay: number
  completedDays: number[]
  completedAt: string | null
  streak: number          // NEW: consecutive completed days
  missedDays: number[]    // NEW: skipped day numbers
  status: ChallengeStatus // NEW: active|completed|paused|abandoned
}

type ChallengeStatus = 'active' | 'completed' | 'paused' | 'abandoned'

// ActivityType — adding 'challenge'
type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal'
  | 'readingPlan' | 'gratitude' | 'reflection' | 'challenge'

// ActivityCounts — adding challengesCompleted
interface ActivityCounts {
  // ... existing fields ...
  challengesCompleted: number  // NEW
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_challenge_progress` | Both | Extended with `streak`, `missedDays`, `status` fields |
| `wr_daily_activities` | Write (via `recordActivity`) | Challenge completion triggers activity recording |
| `wr_faith_points` | Write (via `recordActivity` + bonus) | Points from challenge day completion + 100 bonus |
| `wr_badges` | Write (via badge engine) | 7 new challenge badges, `challengesCompleted` counter |
| `wr_challenge_nudge_shown` | Both | NEW: date string (YYYY-MM-DD) for once-per-day nudge |
| `wr_challenge_reminders` | Read | Dashboard widget reads existing reminder state |
| `wr_settings` | Read | Reads `notifications.nudges` for nudge suppression |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Dashboard widget full-width, progress ring stacked above text, buttons full-width, 44px touch targets. Overlay full viewport with `px-6`. Dialog full-width minus `mx-4`, buttons stacked. Toasts bottom-center full-width. |
| Tablet | 640px - 1024px | Widget in dashboard grid flow. Overlay centered `max-w-md`. Dialog centered `max-w-sm`. Toasts bottom-right. |
| Desktop | > 1024px | Widget in 2-column grid, ring and text side by side. Overlay centered `max-w-md`. Dialog centered `max-w-sm`. Toasts bottom-right. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Dashboard card → next card | `gap-4 md:gap-6` (16px / 24px) | DashboardWidgetGrid.tsx:71 |
| Card header → card content | `pt-3` (12px) | DashboardCard.tsx:105 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (community-challenges-data-page) is complete and committed (`55e871f`)
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from codebase inspection
- [ ] `data/challenges.ts` has 5 challenges with `dailyContent[].actionType` fields populated
- [ ] `ActivityType` union and `DailyActivities` interface are extensible (add `'challenge'`)
- [ ] `ActivityCounts` interface is extensible (add `challengesCompleted`)
- [ ] Toast system can be extended for action button support (nudge "Go" button)
- [ ] `useCelebrationQueue` supports external queue items (for challenge completion overlay)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to add `'challenge'` to `ActivityType` | Add to union type, `ACTIVITY_POINTS`, `DailyActivities`, but NOT to `BASE_ACTIVITY_ORDER` in ActivityChecklist | Spec: "challenge activity is NOT part of the daily 6-item checklist" |
| How to handle 100 bonus points | Direct addition to `wr_faith_points.totalPoints` via storage, not through `recordActivity` | Spec: "not routed through recordActivity, do not count toward daily multiplier" |
| Toast action button for nudge | Extend `showToast` with optional `action` parameter | Minimal change to existing toast system |
| Challenge completion overlay vs CelebrationOverlay reuse | New `ChallengeCompletionOverlay` component | Challenge overlay has different content (title, stats, share button, browse CTA) vs badge overlay |
| Challenge completion overlay sequencing | Fire challenge overlay first, then let badge celebrations queue behind | Spec: "challenge completion overlay fires first. Other celebrations queue behind it" |
| Auto-detection hook | Separate `useChallengeAutoDetect` hook | Clean separation of concerns, reusable across dashboard and detail page |
| `recordActivity('challenge')` key not in `DailyActivities` boolean keys | Add `challenge: boolean` to `DailyActivities` but skip it in checklist rendering | Keeps the type system consistent while hiding from UI |
| Switch challenge dialog | New `SwitchChallengeDialog` component | Modal with frosted glass style, reusable |
| Dashboard widget positioning | After Activity Checklist (order-8), before Friends (order-9) → use order-8.5 via CSS order | Spec: "after Activity Checklist card and before Mood Insights card" |

---

## Implementation Steps

### Step 1: Extend Data Model — Types & Constants

**Objective:** Add `'challenge'` to the activity type system, extend `ChallengeProgress` with new fields, add 7 badge definitions, add `challengesCompleted` counter.

**Files to create/modify:**
- `frontend/src/types/challenges.ts` — Add `ChallengeStatus` type, extend `ChallengeProgress`
- `frontend/src/types/dashboard.ts` — Add `'challenge'` to `ActivityType` union, add `challenge: boolean` to `DailyActivities`, add `challengesCompleted: number` to `ActivityCounts`
- `frontend/src/constants/dashboard/activity-points.ts` — Add `challenge: 20` to `ACTIVITY_POINTS`, add `challenge` entries to display name maps, add to `ALL_ACTIVITY_TYPES`
- `frontend/src/constants/dashboard/badges.ts` — Add 7 challenge badge definitions, add `challengesCompleted: 0` to `FRESH_ACTIVITY_COUNTS`
- `frontend/src/services/faith-points-storage.ts` — Add `challenge: false` to `freshDailyActivities()`
- `frontend/src/hooks/useFaithPoints.ts` — Add `challenge` to `extractActivities()` and `DEFAULT_STATE.todayActivities`
- `frontend/src/constants/challenges.ts` — Add `CHALLENGE_NUDGE_KEY`, `ACTION_TYPE_VERBS` map

**Details:**

**`types/challenges.ts` additions:**
```typescript
export type ChallengeStatus = 'active' | 'completed' | 'paused' | 'abandoned'

export interface ChallengeProgress {
  joinedAt: string
  currentDay: number
  completedDays: number[]
  completedAt: string | null
  streak: number          // consecutive completed days
  missedDays: number[]    // skipped day numbers
  status: ChallengeStatus // active|completed|paused|abandoned
}
```

**`types/dashboard.ts` changes:**
- `ActivityType` union: append `| 'challenge'`
- `DailyActivities` interface: add `challenge: boolean`
- `ActivityCounts` interface: add `challengesCompleted: number`

**`constants/dashboard/activity-points.ts` changes:**
- `ACTIVITY_POINTS`: add `challenge: 20`
- `ACTIVITY_DISPLAY_NAMES`: add `challenge: 'Challenge'`
- `ACTIVITY_CHECKLIST_NAMES`: add `challenge: 'Challenge'` (even though it won't be displayed in checklist)
- `ALL_ACTIVITY_TYPES`: add `'challenge'`

**`constants/dashboard/badges.ts` additions:**
```typescript
const challengeBadges: BadgeDefinition[] = [
  { id: 'challenge_lent', name: 'Lenten Warrior', description: 'Completed the Lenten Journey challenge', category: 'challenge' as BadgeCategory, celebrationTier: 'full-screen' },
  { id: 'challenge_easter', name: 'Easter Champion', description: 'Completed the Easter Joy challenge', category: 'challenge' as BadgeCategory, celebrationTier: 'full-screen' },
  { id: 'challenge_pentecost', name: 'Spirit-Filled', description: 'Completed the Pentecost challenge', category: 'challenge' as BadgeCategory, celebrationTier: 'full-screen' },
  { id: 'challenge_advent', name: 'Advent Faithful', description: 'Completed the Advent challenge', category: 'challenge' as BadgeCategory, celebrationTier: 'full-screen' },
  { id: 'challenge_newyear', name: 'New Year Renewed', description: 'Completed the New Year challenge', category: 'challenge' as BadgeCategory, celebrationTier: 'full-screen' },
  { id: 'challenge_first', name: 'Challenge Accepted', description: 'Completed your first community challenge', category: 'challenge' as BadgeCategory, celebrationTier: 'toast-confetti' },
  { id: 'challenge_master', name: 'Challenge Master', description: 'Completed all 5 community challenges', category: 'challenge' as BadgeCategory, celebrationTier: 'full-screen' },
]
```
- Add `'challenge'` to `BadgeCategory` type in `types/dashboard.ts`
- Add `challengesCompleted: 0` to `FRESH_ACTIVITY_COUNTS`

**`constants/challenges.ts` additions:**
```typescript
export const CHALLENGE_NUDGE_KEY = 'wr_challenge_nudge_shown'

export const ACTION_TYPE_VERBS: Record<ChallengeActionType, string> = {
  pray: 'prayed',
  journal: 'journaled',
  meditate: 'meditated',
  music: 'listened to worship music',
  gratitude: 'practiced gratitude',
  prayerWall: 'prayed on the Prayer Wall',
}

export const CHALLENGE_BADGE_MAP: Record<string, string> = {
  'pray-40': 'challenge_lent',
  'easter-joy': 'challenge_easter',
  'fire-of-pentecost': 'challenge_pentecost',
  'advent-awaits': 'challenge_advent',
  'new-year-new-heart': 'challenge_newyear',
}
```
(Verify challenge IDs from `data/challenges.ts`)

**Guardrails (DO NOT):**
- Do NOT add `'challenge'` to `BASE_ACTIVITY_ORDER` in `ActivityChecklist.tsx` (Step 2 handles this)
- Do NOT change the Full Worship Day badge logic — it must still check only the original 6 activities
- Do NOT modify any existing badge definitions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ChallengeProgress extended fields` | unit | Verify TypeScript interfaces compile with new fields |
| `ACTIVITY_POINTS includes challenge` | unit | `ACTIVITY_POINTS.challenge === 20` |
| `BADGE_DEFINITIONS includes 7 challenge badges` | unit | Filter by category 'challenge', assert length 7 |
| `FRESH_ACTIVITY_COUNTS has challengesCompleted` | unit | `FRESH_ACTIVITY_COUNTS.challengesCompleted === 0` |
| `freshDailyActivities includes challenge` | unit | `freshDailyActivities().challenge === false` |

**Expected state after completion:**
- [ ] `ActivityType` includes `'challenge'`
- [ ] `DailyActivities` has `challenge: boolean`
- [ ] `ActivityCounts` has `challengesCompleted: number`
- [ ] `ACTIVITY_POINTS.challenge === 20`
- [ ] 7 new badge definitions in `BADGE_DEFINITIONS`
- [ ] `freshDailyActivities()` returns object with `challenge: false`
- [ ] All existing tests still pass

---

### Step 2: Protect Activity Checklist from New Activity Type

**Objective:** Ensure the `'challenge'` activity type does NOT appear in the Activity Checklist widget's 6-item display.

**Files to modify:**
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — No change needed if `BASE_ACTIVITY_ORDER` is unchanged (it doesn't include `'challenge'`)

**Details:**

Review `ActivityChecklist.tsx` to confirm `BASE_ACTIVITY_ORDER` only includes the 7 base activities (mood, pray, listen, prayerWall, gratitude, meditate, journal) and the conditional readingPlan/reflection. The `'challenge'` type is intentionally excluded.

The `getMultiplierPreview` function counts completed activities from `activityList` which is built from `BASE_ACTIVITY_ORDER`. Since `'challenge'` is not in this list, it won't affect the checklist ring or Full Worship Day logic.

However, the multiplier calculation in `faith-points-storage.ts` counts ALL true boolean keys in `DailyActivities`. Need to verify that `calculateDailyPoints` counts `challenge` toward the multiplier tier (spec requirement: "challenge activity DOES count toward the daily multiplier calculation").

**Files to verify/modify:**
- `frontend/src/services/faith-points-storage.ts` — Verify `calculateDailyPoints` counts boolean activity keys. If it counts all `true` keys, `challenge` will automatically count toward the multiplier. If it uses a specific list, add `'challenge'`.

**Guardrails (DO NOT):**
- Do NOT add `'challenge'` to `BASE_ACTIVITY_ORDER`
- Do NOT change the Full Worship Day badge trigger (it checks specific keys: mood, pray, listen, prayerWall, meditate, journal)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ActivityChecklist does not show challenge` | unit | Render ActivityChecklist with `challenge: true` in todayActivities, verify no "Challenge" text |
| `calculateDailyPoints counts challenge toward multiplier` | unit | Set challenge=true along with 1 other activity, verify multiplier >= 1.25 |

**Expected state after completion:**
- [ ] Activity Checklist still shows 7 base items (no challenge)
- [ ] Challenge activity counts toward multiplier tiers
- [ ] Full Worship Day badge logic unchanged

---

### Step 3: Extend useChallengeProgress Hook — Status Management & Gamification

**Objective:** Extend `useChallengeProgress` to manage `status`, `streak`, `missedDays`, integrate gamification on day completion, and support the single-active-challenge constraint.

**Files to modify:**
- `frontend/src/hooks/useChallengeProgress.ts` — Major extension

**Details:**

Extend the hook to:

1. **Migrate existing progress entries**: When reading `wr_challenge_progress`, if an entry lacks `status`/`streak`/`missedDays`, backfill: `status: completedAt ? 'completed' : 'active'`, `streak: 0`, `missedDays: []`.

2. **`joinChallenge(challengeId)`**:
   - Create entry with `status: 'active'`, `streak: 0`, `missedDays: []`
   - Returns the ID of any challenge that was previously active (for switch dialog handling)

3. **`getActiveChallenge()`**: New function that returns the challengeId + progress for the entry with `status: 'active'`, or `undefined`.

4. **`pauseChallenge(challengeId)`**: Sets `status: 'paused'` on the given challenge.

5. **`resumeChallenge(challengeId)`**: Sets `status: 'active'` on the given challenge (caller is responsible for pausing the currently active one first).

6. **`completeDay(challengeId, dayNumber, recordActivityFn)`**: Extended to:
   - Existing: add to `completedDays`, advance `currentDay`, set `completedAt` on last day
   - New: recalculate `streak` (consecutive days check)
   - New: set `status: 'completed'` if last day
   - New: call `recordActivityFn('challenge')` for faith points
   - New: call `recordActivityFn(actionType)` for cross-activity credit
   - New: return `{ isCompletion: boolean, bonusPoints: number }` for celebration trigger
   - The function accepts `recordActivityFn` as a parameter to avoid importing `useFaithPoints` inside (keeps hooks composable)

7. **Bonus points on completion**: When all days are done, add 100 points directly to `wr_faith_points.totalPoints` (not via `recordActivity`).

8. **Challenge badge checks on completion**: After final day, check and award:
   - The challenge-specific badge (via `CHALLENGE_BADGE_MAP`)
   - `challenge_first` if this is the user's 1st completed challenge
   - `challenge_master` if all 5 are now completed
   - Increment `challengesCompleted` counter in `wr_badges.activityCounts`

**Auth gating:** All mutation functions (`joinChallenge`, `completeDay`, `pauseChallenge`, `resumeChallenge`) check `isAuthenticated` and no-op if false.

**Guardrails (DO NOT):**
- Do NOT break existing `completeDay` callers — maintain backward compatibility or update all call sites
- Do NOT modify challenge progress that doesn't belong to the current user
- Do NOT award bonus points through `recordActivity` (spec requirement)
- Do NOT make badge checks break if `wr_badges` doesn't exist yet

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `joinChallenge creates entry with new fields` | unit | Verify `status: 'active'`, `streak: 0`, `missedDays: []` |
| `completeDay increments streak on consecutive` | unit | Complete day 1, then day 2 → streak = 2 |
| `completeDay resets streak on gap` | unit | Complete day 1, skip day 2, complete day 3 → streak = 1 |
| `completeDay calls recordActivity('challenge')` | unit | Mock recordActivity, verify called with 'challenge' |
| `completeDay calls recordActivity(actionType)` | unit | Day with actionType='pray' → recordActivity('pray') called |
| `completeDay sets status completed on final day` | unit | Complete last day → `status: 'completed'` |
| `completeDay awards 100 bonus points on completion` | unit | Verify `wr_faith_points.totalPoints` increased by 100 |
| `completeDay is idempotent` | unit | Complete same day twice → no double processing |
| `getActiveChallenge returns active entry` | unit | Join challenge → getActiveChallenge returns it |
| `pauseChallenge sets status paused` | unit | Pause → `status: 'paused'` |
| `resumeChallenge sets status active` | unit | Resume paused → `status: 'active'` |
| `completeDay awards challenge-specific badge` | unit | Complete lent challenge → `challenge_lent` badge earned |
| `completeDay awards challenge_first on first completion` | unit | First ever completion → `challenge_first` in newlyEarned |
| `completeDay awards challenge_master when all 5 done` | unit | 5th challenge completed → `challenge_master` earned |
| `migration backfills status/streak/missedDays` | unit | Read entry without new fields → gets defaults |
| `completeDay no-ops when not authenticated` | unit | `isAuthenticated=false` → no state change |

**Expected state after completion:**
- [ ] `useChallengeProgress` exposes: `getActiveChallenge`, `pauseChallenge`, `resumeChallenge`, extended `completeDay`
- [ ] Day completion triggers `recordActivity('challenge')` + `recordActivity(actionType)`
- [ ] 100 bonus points awarded on challenge completion
- [ ] Challenge badges checked and awarded on completion
- [ ] `challengesCompleted` counter incremented
- [ ] All existing Spec 1 tests updated and passing

---

### Step 4: Switch Challenge Dialog & Resume Button

**Objective:** Build the switch-challenge confirmation dialog. Add "Resume" button for paused challenges on the browser page.

**Files to create/modify:**
- `frontend/src/components/challenges/SwitchChallengeDialog.tsx` — NEW
- `frontend/src/pages/ChallengeDetail.tsx` — Wire switch dialog into `handleJoin`
- `frontend/src/pages/Challenges.tsx` — Show "Resume" button for paused challenges

**Details:**

**`SwitchChallengeDialog.tsx`:**
- Props: `{ isOpen, currentChallengeName, currentDay, newChallengeTitle, themeColor, onConfirm, onCancel }`
- Portal to `document.body`
- Focus trap via `useFocusTrap`
- Escape key closes
- Style: `bg-hero-mid border border-white/15 rounded-2xl p-6`, centered with dark backdrop (`bg-black/60`)
- Title: "Switch Challenges?" in `text-white font-semibold text-lg`
- Body: "You're on Day X of [Current Challenge Title]. Joining this challenge will pause your current one. You can resume it later." in `text-white/70`
- Primary button: "Join [New Challenge Title]" with `backgroundColor: themeColor`
- Secondary button: "Keep current challenge" with `border border-white/20 text-white/70`

**`ChallengeDetail.tsx` changes:**
- `handleJoin`: Check `getActiveChallenge()`. If active, show `SwitchChallengeDialog`. On confirm: `pauseChallenge(activeId)`, then `joinChallenge(newId)`.
- `handleMarkComplete`: Pass `faithPoints.recordActivity` to `completeDay`. Handle completion result for celebration trigger.

**`Challenges.tsx` changes:**
- For each challenge card: if `getProgress(id)?.status === 'paused'`, show "Resume" button instead of "Join Challenge".
- Resume: check `getActiveChallenge()`, if active, show switch dialog. On confirm: `pauseChallenge(activeId)`, `resumeChallenge(pausedId)`, navigate to detail page.

**Responsive behavior:**
- Desktop: Dialog centered `max-w-sm`
- Tablet: Dialog centered `max-w-sm`
- Mobile: Full-width minus `mx-4`, buttons stack vertically, full-width. Primary on top.

**Auth gating:**
- Join/Resume buttons already trigger auth modal for logged-out users (existing Spec 1 behavior)
- Switch dialog only appears for authenticated users (since join requires auth)

**Guardrails (DO NOT):**
- Do NOT remove existing "Join Challenge" button logic — only extend it
- Do NOT allow joining a completed challenge (show "Completed" badge instead)
- Do NOT modify challenge data or structure

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SwitchChallengeDialog renders correctly` | unit | Open dialog → title, body, both buttons visible |
| `SwitchChallengeDialog confirm calls onConfirm` | unit | Click primary → onConfirm called |
| `SwitchChallengeDialog cancel calls onCancel` | unit | Click secondary → onCancel called |
| `SwitchChallengeDialog traps focus` | unit | Focus within dialog, tab cycling |
| `SwitchChallengeDialog escape closes` | unit | Press Escape → onCancel called |
| `ChallengeDetail shows switch dialog when active challenge exists` | integration | Join while another active → dialog appears |
| `Challenges page shows Resume for paused challenges` | integration | Paused challenge → "Resume" button visible |
| `Resume triggers switch dialog if another active` | integration | Resume while active → switch dialog |

**Expected state after completion:**
- [ ] Switch dialog appears when joining with an active challenge
- [ ] Confirming switch pauses current, activates new
- [ ] Paused challenges show "Resume" on browser page
- [ ] Dialog is keyboard-accessible and focus-trapped

---

### Step 5: Auto-Detection Hook

**Objective:** Create `useChallengeAutoDetect` hook that auto-completes challenge days when the user has already performed the day's action type.

**Files to create:**
- `frontend/src/hooks/useChallengeAutoDetect.ts` — NEW

**Files to modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — Wire auto-detection on page load
- `frontend/src/pages/Dashboard.tsx` — Wire auto-detection on dashboard render

**Details:**

**`useChallengeAutoDetect.ts`:**
```typescript
function useChallengeAutoDetect(options: {
  isAuthenticated: boolean
  getActiveChallenge: () => { challengeId: string; progress: ChallengeProgress } | undefined
  completeDay: (challengeId: string, dayNumber: number, recordActivityFn: (type: ActivityType) => void) => CompletionResult
  recordActivity: (type: ActivityType) => void
  showToast: (message: string, type?: StandardToastType) => void
}): {
  checkAndAutoComplete: () => CompletionResult | null
}
```

Logic:
1. Guard: if not authenticated, return null
2. Get active challenge. If none, return null
3. Get current uncompleted day's `actionType`
4. Read today's `wr_daily_activities` entry
5. Check if `todayActivities[actionType]` is `true`
6. If yes AND the day is not already in `completedDays`:
   - Call `completeDay(challengeId, dayNumber, recordActivity)`
   - Show success toast: `"Challenge Day X auto-completed! You already [verb] today."`
   - Return the completion result
7. If no, return null

**Trigger points:**
- `ChallengeDetail.tsx`: Call `checkAndAutoComplete()` in a `useEffect` on mount (when viewing current day of active challenge)
- `Dashboard.tsx`: Call `checkAndAutoComplete()` in a `useEffect` on mount

**Event-driven trigger:** Listen for `wr:activity-recorded` custom event (already dispatched by `useFaithPoints` listener pattern). When fired, re-run auto-detection.

**Guardrails (DO NOT):**
- Do NOT run for logged-out users
- Do NOT check past days retroactively
- Do NOT fire if the day is already completed (idempotent)
- Do NOT auto-detect on pages other than dashboard and challenge detail

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `auto-detects when activity already done` | unit | Set `pray: true` in daily activities, challenge day actionType='pray' → auto-complete fires |
| `shows correct toast message` | unit | Auto-complete pray → "Challenge Day 3 auto-completed! You already prayed today." |
| `does not fire for logged-out users` | unit | `isAuthenticated=false` → no auto-complete |
| `does not fire if no active challenge` | unit | No active challenge → null returned |
| `does not fire if day already completed` | unit | Day in completedDays → no-op |
| `does not retroactively check past days` | unit | Only checks currentDay |
| `fires on wr:activity-recorded event` | unit | Dispatch event → auto-detection runs |

**Expected state after completion:**
- [ ] Auto-detection runs on challenge detail page load
- [ ] Auto-detection runs on dashboard render
- [ ] Auto-detection runs on `wr:activity-recorded` event
- [ ] Toast shows with correct verb mapping
- [ ] Idempotent — no double processing

---

### Step 6: Challenge Completion Celebration Overlay

**Objective:** Build the full-screen celebration overlay for challenge completion, with priority sequencing.

**Files to create:**
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` — NEW

**Files to modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — Show overlay on final day completion
- `frontend/src/pages/Dashboard.tsx` — Show overlay if auto-detection completes final day

**Details:**

**`ChallengeCompletionOverlay.tsx`:**
- Props: `{ challengeTitle, themeColor, daysCompleted, totalPointsEarned, badgeName, onDismiss, onBrowseMore }`
- Portal to `document.body`
- Focus trap via `useFocusTrap`
- Scroll lock (same as `CelebrationOverlay`)
- Auto-dismiss after 8 seconds OR click/tap

**Content layout (centered, `max-w-md`, `p-8`):**
1. Challenge title in Caveat script font, challenge theme color: `font-script text-4xl sm:text-5xl` with `style={{ color: themeColor }}`
2. "Challenge Complete!" in Inter bold white: `text-2xl sm:text-3xl font-bold text-white`
3. Days completed: `"{daysCompleted} days of faithful commitment"` in `text-white/70 text-lg`
4. Points earned: `"+{totalPointsEarned} faith points"` in `text-white/70 text-lg`
5. Badge display: placeholder colored circle + badge name in `text-white font-medium`
6. Confetti: Same CSS pattern as `CelebrationOverlay`, using challenge theme color + gold + white (20-30 particles on desktop, 10-15 on mobile)
7. "Share Your Achievement" button: `border border-white/30 text-white/80 py-3 px-6 rounded-lg` — logs to console (placeholder)
8. "Browse more challenges" CTA: `text-white/60 text-sm underline` → navigates to `/challenges`

**Backdrop:** `bg-black/80 backdrop-blur-sm` (spec says `/80`, slightly darker than badge overlay's `/70`)

**Reduced motion:** No confetti, no fade animations, static display. Auto-dismiss button appears immediately.

**Celebration sequencing:**
- The challenge completion overlay fires BEFORE badge celebrations
- In `ChallengeDetail.tsx`: When `completeDay` returns `isCompletion: true`, set state to show `ChallengeCompletionOverlay`. Badge celebrations (via `CelebrationQueue`) will fire after the overlay is dismissed.
- In `Dashboard.tsx`: Same pattern — if auto-detection completes a challenge, show overlay first.

**Responsive behavior:**
- Mobile: Full viewport, `px-6`, buttons full-width stacked
- Tablet/Desktop: Centered `max-w-md`

**Guardrails (DO NOT):**
- Do NOT modify the existing `CelebrationOverlay` component
- Do NOT change `CelebrationQueue` behavior — it processes badges after challenge overlay dismisses
- Do NOT make "Share Your Achievement" do anything real (Spec 3)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders challenge title in Caveat font` | unit | Check for `font-script` class |
| `renders "Challenge Complete!" heading` | unit | Text present |
| `shows days completed and points` | unit | "21 days of faithful commitment" visible |
| `shows badge name` | unit | Badge name text visible |
| `auto-dismisses after 8 seconds` | unit | `vi.advanceTimersByTime(8000)` → `onDismiss` called |
| `dismisses on click` | unit | Click overlay → `onDismiss` called |
| `dismisses on Escape` | unit | Press Escape → `onDismiss` called |
| `respects prefers-reduced-motion` | unit | No confetti class, immediate display |
| `"Browse more challenges" navigates to /challenges` | unit | Click → navigate called |
| `focus is trapped` | unit | Focus stays within overlay |

**Expected state after completion:**
- [ ] Challenge completion overlay renders on final day
- [ ] Shows correct challenge title, days, points, badge
- [ ] Confetti animates (respects reduced motion)
- [ ] Auto-dismisses after 8s
- [ ] Fires before badge celebrations
- [ ] "Share Your Achievement" logs to console

---

### Step 7: Dashboard Challenge Widget

**Objective:** Add a Challenge widget card to the dashboard grid that shows active challenge progress, promotion to join, or countdown to next.

**Files to create:**
- `frontend/src/components/dashboard/ChallengeWidget.tsx` — NEW

**Files to modify:**
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Add ChallengeWidget

**Details:**

**`ChallengeWidget.tsx`:**

Three states:

**State 1: Active Challenge** (`getActiveChallenge()` returns a challenge with `status: 'active'`):
- Layout: Desktop = ring left, text right (side by side). Mobile = ring stacked above text.
- **Progress ring**: 48px diameter SVG ring (R=18, viewBox 48×48, stroke-width 5). Unfilled: `rgba(255,255,255,0.1)`. Filled: `challenge.themeColor`. Center text: "Day X" in `text-xs font-semibold text-white`, "of Y" below in `text-[10px] text-white/50`.
  - `role="progressbar"` with `aria-valuenow={currentDay}`, `aria-valuemin={1}`, `aria-valuemax={durationDays}`
- **Challenge title**: `text-white font-semibold text-sm` with small colored circle (8px, `challenge.themeColor`) as accent
- **Today's action**: `text-white/60 text-sm truncate` (single line with ellipsis)
- **Challenge streak**: `text-white/40 text-xs`. If streak > 3, add Lucide `Flame` icon (14px) in `challenge.themeColor`
- **"Continue →"**: `text-sm font-medium` in `challenge.themeColor` with `hover:underline`. `aria-label={`Continue ${challenge.title}`}`. Links to `/challenges/${challengeId}`

**State 2: No Active Challenge, Season Active** (`getActiveChallengeInfo()` returns a challenge):
- "Community Challenge" header
- "Join [Challenge Title]" in `text-white font-semibold`
- Description in `text-white/60 text-sm line-clamp-2`
- Days remaining + participant count in `text-white/40 text-xs`
- "Join now →" in challenge theme color, links to `/challenges/${challengeId}`

**State 3: No Active Challenge, No Season Active**:
- "Community Challenge" header
- "Next challenge starts in X days" in `text-white/60`
- Upcoming challenge title in `text-white/80`
- "Set reminder" outline button: `border border-white/20 text-white/60 text-xs rounded-lg px-3 py-1.5`
- If no upcoming: "New challenges are coming soon" in `text-white/50`

**`DashboardWidgetGrid.tsx` changes:**
- Import `ChallengeWidget`
- Add new `DashboardCard` with `id="challenge"`, `title="Challenge"` (or dynamic from active challenge), icon `<Target className="h-5 w-5" />` (Lucide)
- Position: CSS order to place after Activity Checklist. Use `order-[8.5]` or insert between activity-checklist (order-8) and friends-preview (order-9). May need to adjust order values or use `order-[9]` and bump friends to `order-10`.
- Span: `lg:col-span-3` (left column)
- Pass `faithPoints` prop for potential reactivity

**Responsive behavior:**
- Desktop (lg+): Side-by-side layout (ring left, text right) within `lg:col-span-3`
- Mobile: Full-width card, ring centered above text, stacked vertically

**Guardrails (DO NOT):**
- Do NOT change existing widget order or grid behavior
- Do NOT make the widget visible for logged-out users (dashboard is auth-gated)
- Do NOT fetch or display real participant data (mock only)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders active challenge state` | unit | Active challenge → shows progress ring, title, action, streak, "Continue →" |
| `renders join promotion state` | unit | No active but season running → shows "Join [Title]", description, "Join now →" |
| `renders countdown state` | unit | No active, no season → shows "Next challenge starts in X days" |
| `renders "coming soon" fallback` | unit | No challenges at all → "New challenges are coming soon" |
| `progress ring has correct aria attributes` | unit | `role="progressbar"`, correct values |
| `"Continue →" has descriptive aria-label` | unit | Includes challenge title |
| `flame icon shows when streak > 3` | unit | Streak=4 → Flame icon visible |
| `flame icon hidden when streak <= 3` | unit | Streak=2 → no Flame icon |
| `widget renders in DashboardWidgetGrid` | integration | Dashboard renders → ChallengeWidget card present |
| `mobile layout stacks ring above text` | unit | Mobile viewport → vertical flex layout |

**Expected state after completion:**
- [ ] Challenge widget appears on dashboard
- [ ] Three states render correctly
- [ ] Progress ring uses challenge theme color
- [ ] Widget is properly positioned in grid

---

### Step 8: Challenge Nudge Toast

**Objective:** Show a gentle reminder toast after 6 PM when the user has an active challenge day incomplete.

**Files to modify:**
- `frontend/src/components/ui/Toast.tsx` — Extend standard toast to support action button
- `frontend/src/pages/Dashboard.tsx` — Add nudge logic

**Files to create:**
- `frontend/src/hooks/useChallengeNudge.ts` — NEW

**Details:**

**Toast extension (`Toast.tsx`):**
Add optional `action` parameter to `showToast`:
```typescript
showToast: (message: string, type?: StandardToastType, action?: { label: string; onClick: () => void }) => void
```
When `action` is provided, render a small button inside the toast:
```tsx
{toast.action && (
  <button
    onClick={toast.action.onClick}
    className="ml-2 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-lt"
  >
    {toast.action.label}
  </button>
)}
```
The action button sits to the right of the message text, same line.

**`useChallengeNudge.ts`:**
```typescript
function useChallengeNudge(options: {
  isAuthenticated: boolean
  isDashboard: boolean
  getActiveChallenge: () => ActiveChallengeInfo | undefined
  showToast: (message: string, type?: StandardToastType, action?: ToastAction) => void
  navigate: (path: string) => void
}): void
```

Logic (runs once on mount in a `useEffect`):
1. Guard: if not authenticated or not on dashboard, return
2. Guard: if current hour < 18, return
3. Guard: read `wr_challenge_nudge_shown`. If value matches today's date string (YYYY-MM-DD), return
4. Guard: read `wr_settings`. If `notifications.nudges === false`, return (use `getSettings()` with deep-merge defaults)
5. Get active challenge. If none, return
6. Check if current challenge day is already completed. If yes, return
7. Write today's date to `wr_challenge_nudge_shown`
8. Show toast: `"Don't forget your challenge! Day X: [action summary ~60 chars]"` with action `{ label: "Go", onClick: () => navigate(`/challenges/${challengeId}`) }`
9. Toast type: `'warning'` (uses amber/orange left border — closest to "neutral/warm")

**`Dashboard.tsx` changes:**
- Import `useChallengeNudge`
- Call it with appropriate dependencies, only when `phase === 'dashboard'`

**Guardrails (DO NOT):**
- Do NOT show nudge on non-dashboard pages
- Do NOT show nudge more than once per day
- Do NOT show nudge if settings disable nudges
- Do NOT use guilt-inducing language — "Don't forget" is the ceiling of urgency

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `shows nudge after 6 PM with incomplete day` | unit | Time after 18:00, active challenge, day incomplete → toast shown |
| `does not show nudge before 6 PM` | unit | Time before 18:00 → no toast |
| `does not show nudge if day complete` | unit | Day already in completedDays → no toast |
| `does not show nudge if shown today` | unit | `wr_challenge_nudge_shown` = today → no toast |
| `does not show nudge if nudges disabled` | unit | `wr_settings.notifications.nudges = false` → no toast |
| `does not show nudge for unauthenticated users` | unit | `isAuthenticated=false` → no toast |
| `does not show nudge without active challenge` | unit | No active → no toast |
| `"Go" button navigates to challenge detail` | unit | Click "Go" → navigate called with correct path |
| `toast auto-dismisses after 6 seconds` | unit | Standard toast behavior (6000ms) |
| `writes today's date to wr_challenge_nudge_shown` | unit | After showing → localStorage updated |

**Expected state after completion:**
- [ ] Nudge toast appears after 6 PM on dashboard
- [ ] "Go" button navigates to challenge detail page
- [ ] Once per day, respects settings
- [ ] Standard toast with action button works

---

### Step 9: Wire Auto-Detection & Celebrations into ChallengeDetail & Dashboard

**Objective:** Connect all the pieces: auto-detection, completion celebrations, and gamification into the detail page and dashboard.

**Files to modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — Wire gamification into `handleMarkComplete`, add auto-detection, add completion overlay
- `frontend/src/pages/Dashboard.tsx` — Wire auto-detection, add completion overlay state

**Details:**

**`ChallengeDetail.tsx` changes:**
1. Import `useFaithPoints`, `useChallengeAutoDetect`, `ChallengeCompletionOverlay`, `useToast`
2. In `handleMarkComplete`:
   - Call extended `completeDay(challengeId, dayNumber, faithPoints.recordActivity)`
   - If result indicates completion: set `showCompletionOverlay = true`
3. Add `useEffect` for auto-detection on mount (when viewing current day of active challenge)
4. Add `ChallengeCompletionOverlay` render when `showCompletionOverlay` is true
5. On overlay dismiss: set `showCompletionOverlay = false` (badges will fire via `CelebrationQueue` if any are newly earned)

**`Dashboard.tsx` changes:**
1. Import `useChallengeAutoDetect`, `ChallengeCompletionOverlay`
2. Wire auto-detection in a `useEffect` when `phase === 'dashboard'`
3. If auto-detection completes a challenge: set `showChallengeCompletionOverlay = true`
4. Render `ChallengeCompletionOverlay` (if true) BEFORE `CelebrationQueue` in the JSX order

**Celebration sequencing:**
- Challenge completion overlay fires first (managed by component state)
- User dismisses it
- `CelebrationQueue` picks up badge celebrations from `newlyEarnedBadges` (populated during `completeDay`)
- Badge toasts / full-screen celebrations fire in sequence

**Guardrails (DO NOT):**
- Do NOT fire auto-detection on every render — use proper `useEffect` with dependencies
- Do NOT show completion overlay AND badge overlay simultaneously
- Do NOT break existing Dashboard flow (mood check-in, getting started, evening reflection)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ChallengeDetail: Mark Complete awards faith points` | integration | Click "Mark Complete" → recordActivity called |
| `ChallengeDetail: final day shows completion overlay` | integration | Complete last day → overlay appears |
| `ChallengeDetail: auto-detects on mount` | integration | Active challenge, action done → toast |
| `Dashboard: auto-detects on render` | integration | Active challenge, action done → toast |
| `Dashboard: completion overlay fires before badge celebrations` | integration | Complete final day → overlay first, then badges |
| `ChallengeDetail: completion overlay dismissal allows badge queue` | integration | Dismiss overlay → badge celebrations fire |

**Expected state after completion:**
- [ ] `handleMarkComplete` integrates gamification
- [ ] Auto-detection works on both pages
- [ ] Completion overlay fires first, badges fire after
- [ ] All celebration sequencing is correct

---

### Step 10: Comprehensive Test Suite

**Objective:** Add comprehensive tests for all new functionality, ensuring edge cases and regressions are covered.

**Files to create:**
- `frontend/src/hooks/__tests__/useChallengeProgress.test.ts` — Extended tests for new functionality
- `frontend/src/hooks/__tests__/useChallengeAutoDetect.test.ts` — NEW
- `frontend/src/hooks/__tests__/useChallengeNudge.test.ts` — NEW
- `frontend/src/components/challenges/__tests__/SwitchChallengeDialog.test.tsx` — NEW
- `frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx` — NEW
- `frontend/src/components/dashboard/__tests__/ChallengeWidget.test.tsx` — NEW

**Details:**

Focus areas:

1. **No regressions:**
   - Activity Checklist still shows 7 base items (no challenge)
   - Full Worship Day badge logic unchanged (checks original 6 activities)
   - Existing streak system unaffected
   - Existing badge definitions unchanged
   - Existing toast system works for non-challenge toasts
   - Existing dashboard widgets unaffected

2. **Edge cases from spec:**
   - Idempotent completion (button + auto-detect simultaneously)
   - Multiple `recordActivity` calls (both `'challenge'` and action type)
   - Paused challenge resumes mid-progress (progress preserved)
   - Completed challenge can't be resumed
   - Badge already earned (skip silently)
   - All 5 challenges completed → Challenge Master fires alongside specific badge
   - Nudge timing edge cases (exactly 6 PM, localStorage cleared)
   - Settings not initialized → nudge defaults to enabled
   - Dashboard with no challenges data → "coming soon" fallback

3. **Accessibility:**
   - Progress ring `role="progressbar"` with correct aria attributes
   - Dialog focus trap and keyboard dismissal
   - Overlay focus trap and keyboard dismissal
   - Toast `role="status"` / `aria-live="polite"`
   - "Continue →" / "Join now →" links with descriptive `aria-label`
   - 44px minimum touch targets on mobile

**Guardrails (DO NOT):**
- Do NOT skip testing edge cases listed in the spec
- Do NOT test implementation details (test behavior, not internals)

**Expected state after completion:**
- [ ] All new functionality has test coverage
- [ ] No regression tests fail
- [ ] Edge cases from spec are covered
- [ ] Accessibility requirements are tested

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend data model: types, constants, badges |
| 2 | 1 | Protect Activity Checklist from new type |
| 3 | 1 | Extend useChallengeProgress with gamification |
| 4 | 3 | Switch challenge dialog & resume button |
| 5 | 3 | Auto-detection hook |
| 6 | 3 | Challenge completion celebration overlay |
| 7 | 3, 5 | Dashboard challenge widget |
| 8 | — (Toast extension is independent) | Challenge nudge toast |
| 9 | 3, 4, 5, 6, 7, 8 | Wire everything into ChallengeDetail & Dashboard |
| 10 | 1-9 | Comprehensive test suite |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend Data Model | [COMPLETE] | 2026-03-23 | Extended `ChallengeProgress` (streak/missedDays/status), added `'challenge'` to ActivityType/DailyActivities, `challengesCompleted` to ActivityCounts, 7 challenge badges, CHALLENGE_BADGE_MAP/ACTION_TYPE_VERBS/CHALLENGE_NUDGE_KEY constants. Updated MAX_DAILY_BASE_POINTS (115→135), MAX_DAILY_POINTS (230→270). Fixed challenge IDs from plan (pray-40→pray40-lenten-journey, easter-joy→easter-joy-resurrection-hope). Updated badge-storage fillActivityCounts. Fixed 11 test files for new fields. |
| 2 | Protect Activity Checklist | [COMPLETE] | 2026-03-23 | Verified BASE_ACTIVITY_ORDER excludes 'challenge'. Challenge counts toward multiplier via ACTIVITY_BOOLEAN_KEYS. Added test confirming 'Challenge' not shown in checklist. Added calculateDailyPoints test for challenge+multiplier. |
| 3 | Extend useChallengeProgress | [COMPLETE] | 2026-03-23 | Extended hook with getActiveChallenge, pauseChallenge, resumeChallenge, CompletionResult return type. completeDay now accepts recordActivityFn, awards 100 bonus points on completion, awards challenge badges (specific+first+master), increments challengesCompleted. Migration backfills legacy entries. 30 tests pass. |
| 4 | Switch Dialog & Resume | [COMPLETE] | 2026-03-23 | Created SwitchChallengeDialog with portal, focus trap, escape key. Wired into ChallengeDetail (handleJoin checks getActiveChallenge) and Challenges page (handleResume for paused). Added isPaused/onResume to ActiveChallengeCard. 8 dialog tests pass, all existing tests pass. |
| 5 | Auto-Detection Hook | [COMPLETE] | 2026-03-23 | Created useChallengeAutoDetect hook. Checks active challenge's current day actionType against today's activities. Fires once on mount + on wr:activity-recorded event. Maps challenge actionTypes to DailyActivities keys (music→listen). Shows success toast with verb. 6 tests pass. |
| 6 | Completion Celebration Overlay | [COMPLETE] | 2026-03-23 | Created ChallengeCompletionOverlay with portal, focus trap, scroll lock, 8s auto-dismiss, Escape key, confetti (reduced-motion safe), Caveat title, stats, badge display, Share (console.log placeholder), Browse more CTA. 10 tests pass. |
| 7 | Dashboard Challenge Widget | [COMPLETE] | 2026-03-23 | Created ChallengeWidget with 3 states (active/join/countdown). 48px SVG progress ring with theme color. Flame icon for streak>3. Added getNextChallengeInfo to challenge-calendar.ts. Changed getActiveChallengeInfo return to use challengeId. Added to DashboardWidgetGrid after activity checklist (order-9). 6 tests pass. |
| 8 | Challenge Nudge Toast | [COMPLETE] | 2026-03-23 | Extended Toast.tsx with optional ToastAction (label+onClick). Created useChallengeNudge hook: runs once on mount, checks hour>=18, once-per-day via localStorage, respects settings.notifications.nudges, shows warning toast with "Go" action button. 9 tests pass. |
| 9 | Wire Into Pages | [COMPLETE] | 2026-03-23 | Wired useFaithPoints, useChallengeAutoDetect, useToastSafe, ChallengeCompletionOverlay into ChallengeDetail. handleMarkComplete now calls completeDay with recordActivity, shows completion overlay on final day. Wired useChallengeAutoDetect + useChallengeNudge into Dashboard. Fixed Navbar.tsx for getActiveChallengeInfo return type change (challengeId instead of challenge). All 22 tests pass. |
| 10 | Comprehensive Tests | [COMPLETE] | 2026-03-23 | Fixed useFaithPoints test (challenge:false in default), BadgeGrid test (32 rendered vs 39 defined), Challenges test (challengeId return type). Full suite: 361 files / 3706 tests passing. 6 pre-existing failures in BibleReader*, MyPrayers, useNotifications are unrelated. |
