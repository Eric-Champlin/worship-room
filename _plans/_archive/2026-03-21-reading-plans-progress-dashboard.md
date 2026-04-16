# Implementation Plan: Reading Plans Progress Tracking & Dashboard Widget

**Spec:** `_specs/reading-plans-progress-dashboard.md`
**Date:** 2026-03-21
**Branch:** `claude/feature/reading-plans-progress-dashboard`
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-03-06)
**Recon Report:** not applicable (no external recon for this spec)
**Master Spec Plan:** Consumes data models from Dashboard & Growth specs (Phase 2.75) and Reading Plans Browser (Spec 1). No single master plan file — cross-spec dependencies documented in spec header and Architecture Context below.

> **Design System Recon Note:** Recon was captured 2026-03-06. Phase 2.85 and 2.9 additions (devotional page, reading plans browser, prayer list, UX polish) have been implemented since then. The recon values for dashboard cards, color palette, typography, and frosted glass patterns remain valid — those patterns have not changed.

---

## Architecture Context

### Project Structure
- **Components:** `frontend/src/components/` — organized by feature (`dashboard/`, `reading-plans/`, `prayer-wall/`, `insights/`, `daily/`, `audio/`, `ui/`)
- **Pages:** `frontend/src/pages/` — one file per route (`Dashboard.tsx`, `ReadingPlanDetail.tsx`, `DevotionalPage.tsx`, `Insights.tsx`)
- **Hooks:** `frontend/src/hooks/` — custom hooks (`useFaithPoints.ts`, `useReadingPlanProgress.ts`, `useFocusTrap.ts`)
- **Constants:** `frontend/src/constants/dashboard/` — activity-points, badges, levels, mood, recommendations, devotional-integration
- **Services:** `frontend/src/services/` — faith-points-storage, badge-engine, badge-storage, mood-storage
- **Types:** `frontend/src/types/` — dashboard.ts, reading-plans.ts, devotional.ts
- **Data:** `frontend/src/data/reading-plans/` — 10 plan data files + index
- **Tests:** Co-located `__tests__/` directories

### Key Existing Files This Spec Touches

| File | Purpose | What This Spec Changes |
|------|---------|----------------------|
| `types/dashboard.ts` | Type definitions | Add `readingPlan` to `ActivityType` union, add `readingPlan` boolean to `DailyActivities`, add to `ActivityCounts` |
| `constants/dashboard/activity-points.ts` | Activity point values | Add `readingPlan: 15` to `ACTIVITY_POINTS`, display names, checklist names, `ALL_ACTIVITY_TYPES` |
| `constants/dashboard/badges.ts` | Badge definitions | Add 3 new reading plan badges |
| `services/badge-engine.ts` | Badge unlock detection | Add reading plan badge checks |
| `services/badge-storage.ts` | Badge data persistence | Add `readingPlan` to `ActivityCounts` |
| `hooks/useFaithPoints.ts` | Core gamification hook | Handle `readingPlan` activity type |
| `services/faith-points-storage.ts` | localStorage persistence | Handle `readingPlan` in `DailyActivities` |
| `pages/ReadingPlanDetail.tsx` | Plan detail page | Add inline celebration + completion overlay + `recordActivity` call |
| `components/reading-plans/DayContent.tsx` | Day content renderer | No changes (celebration goes below this) |
| `components/dashboard/ActivityChecklist.tsx` | 6-item checklist | Conditionally add 7th item, update progress ring denominator |
| `components/dashboard/DashboardWidgetGrid.tsx` | Dashboard widget grid | Add ReadingPlanWidget after devotional |
| `components/dashboard/MoodRecommendations.tsx` | Post-check-in recommendations | Add reading plan recommendation card |
| `pages/DevotionalPage.tsx` | Devotional page | Add "Related Reading Plan" callout |
| `components/insights/ActivityCorrelations.tsx` | Insights activity correlations | Add reading plan correlation |

### Component/Service Patterns to Follow

- **DashboardCard pattern:** `<DashboardCard id="..." title="..." icon={...}>` with `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`. See `DashboardWidgetGrid.tsx` lines 68-183.
- **Activity recording:** `recordActivity(type)` in `useFaithPoints` hook. Idempotent per day. Updates `wr_daily_activities`, `wr_faith_points`, `wr_streak`, triggers `checkForNewBadges()`. See `useFaithPoints.ts` lines 128-238.
- **Badge definition:** `BadgeDefinition` interface with `id`, `name`, `description`, `category`, `celebrationTier`, optional `verse`. See `badges.ts` lines 97-141.
- **Badge engine checks:** `checkForNewBadges(context, earned)` returns new badge IDs. Add reading plan checks in a new section (section 6). See `badge-engine.ts` lines 36-97.
- **Intersection Observer completion:** In `ReadingPlanDetail.tsx` lines 37-55. Observer fires on 50% visibility of action step, calls `completeDay()`, disconnects.
- **CelebrationOverlay pattern:** Full-screen overlay with `createPortal`, `useFocusTrap`, confetti particles, scroll lock, delayed continue button. See `CelebrationOverlay.tsx` lines 84-191.
- **Recommendation card pattern:** Link cards with mood-colored left border, icon, title, description. See `MoodRecommendations.tsx` lines 134-162.
- **DevotionalPage callout placement:** After reflection question card (line 229), before action buttons (line 232). The `max-w-2xl` content container wraps the content.
- **Auth gating:** `useAuth()` for `isAuthenticated`, `useAuthModal()?.openAuthModal()` for triggering login prompt. Most dashboard features no-op when not authenticated.

### Test Patterns

- **Provider wrapping:** `MemoryRouter` with future flags (`{ v7_startTransition: true, v7_relativeSplatPath: true }`). No AuthProvider/ToastProvider needed for basic component tests.
- **localStorage:** `beforeEach(() => { localStorage.clear() })` for isolation.
- **User interaction:** `const user = userEvent.setup()`, `await user.click(...)`.
- **Selectors:** Prefer `screen.getByRole()`, `screen.getByText()` over `screen.getByTestId()`.
- **Hook testing:** `renderHook(() => useXxx(), { wrapper })` with provider wrapper function.
- **Mock pattern:** `vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ ... }) }))`.

### Cross-Spec Data Dependencies

| localStorage Key | Owner | This Spec's Access | Description |
|------------------|-------|-------------------|-------------|
| `wr_reading_plan_progress` | Spec 1 (reading-plans-browser) | Read | Plan progress data (`ReadingPlanProgressMap`) |
| `wr_daily_activities` | Streak & Faith Points Engine | Read + Write (via `recordActivity`) | Daily activity log |
| `wr_faith_points` | Streak & Faith Points Engine | Read + Write (via `recordActivity`) | Total points, level |
| `wr_streak` | Streak & Faith Points Engine | Read + Write (via `recordActivity`) | Streak data |
| `wr_badges` | Badge Definitions | Read + Write (via `checkForNewBadges`) | Earned badges, activity counts |
| `wr_mood_entries` | Mood Check-In | Read | Recent mood history (for widget suggestions) |
| `wr_devotional_reads` | Devotional Dashboard Integration | Read | Today's devotional completion |

### Theme Type Mismatch

`DevotionalTheme` and `PlanTheme` are different union types with partial overlap:
- **Exact matches (7):** trust, gratitude, forgiveness, identity, purpose, hope, healing
- **DevotionalTheme only:** anxiety-and-peace, faithfulness, community
- **PlanTheme only:** anxiety, grief, relationships

For the devotional callout (Feature 3), only exact theme matches trigger the callout. This means `anxiety-and-peace` devotionals won't suggest the `anxiety` reading plan, and `community` devotionals won't suggest the `relationships` plan. The spec says "exact match" (requirement 26), so this is correct behavior. Noted in Edge Cases.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Day completion inline celebration | Not shown for logged-out (IO doesn't fire) | Step 3 | `isAuthenticated` check in IO effect (existing) |
| Plan completion overlay | Not shown for logged-out | Step 4 | `isAuthenticated` check before overlay trigger |
| Faith points recording | Not applicable for logged-out | Step 3 | `recordActivity` no-ops when not authenticated |
| Badge unlock | Not applicable for logged-out | Step 2 | `checkForNewBadges` only runs inside `recordActivity` |
| Activity Checklist reading item | Entire dashboard is auth-gated | Step 5 | Dashboard only renders for authenticated users |
| Dashboard widget | Entire dashboard is auth-gated | Step 6 | Dashboard only renders for authenticated users |
| Devotional "Start this plan" link | Auth modal for logged-out | Step 7 | `useAuthModal()?.openAuthModal()` on click |
| Insights correlation | `/insights` is auth-gated | Step 8 | Route-level auth gate (existing) |
| Mood recommendation card | Mood check-in is auth-gated | Step 9 | Dashboard phase machine gates check-in |

---

## Design System Values (for UI steps)

Values from codebase inspection and design system recon (2026-03-06):

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | DashboardCard.tsx:42 |
| Dashboard card | padding | `p-4 md:p-6` | DashboardCard.tsx:42 |
| Progress bar (bg) | styles | `h-2 rounded-full bg-white/10` | ReadingPlanDetail.tsx:141 |
| Progress bar (fill) | styles | `h-2 rounded-full bg-primary transition-all duration-500` | ReadingPlanDetail.tsx:149 |
| Primary CTA button | styles | `bg-primary text-white font-semibold py-3 px-6 rounded-lg` | design-system.md |
| Primary-lt link | styles | `text-primary-lt hover:text-primary font-medium` | spec |
| Success green | hex | `#27AE60` / `text-success` | 09-design-system.md |
| Primary | hex | `#6D28D9` / `bg-primary` | 09-design-system.md |
| Primary Light | hex | `#8B5CF6` / `text-primary-lt` | 09-design-system.md |
| Frosted glass callout | styles | `bg-white/5 border border-white/10 rounded-xl p-5` | spec, matches DayContent action step |
| Overlay backdrop | styles | `fixed inset-0 bg-black/70 backdrop-blur-sm z-50` | CelebrationOverlay.tsx:136 |
| Overlay card | styles | `bg-hero-mid/90 border border-white/15 rounded-2xl p-8 sm:p-10 max-w-md mx-auto` | spec |
| Caveat heading | class | `font-script text-4xl sm:text-5xl text-white` | design-system.md |
| Lora verse | class | `font-serif italic text-white/80 text-base leading-relaxed` | spec, matches CelebrationOverlay |
| Confetti colors | array | `CONFETTI_COLORS` from `badge-icons.ts` lines 285-293 | badge-icons.ts |
| Recommendation card | styles | `rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm` + 4px mood-colored left border | MoodRecommendations.tsx:142-151 |
| Mood colors | mapping | Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399 | mood.ts |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses **Caveat** (`font-script`) for script/highlighted headings, not Lora
- **Lora** (`font-serif`) is for scripture text and verses, always italic
- **Inter** (`font-sans`, default) is for all body text and UI labels
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Smaller callout cards use `rounded-xl` instead of `rounded-2xl`
- Progress bars: `h-2 rounded-full bg-white/10` background, `bg-primary` fill
- Success green: `#27AE60` (`text-success`)
- All `max-w-2xl` for content columns (Daily Hub, reading plans, devotional)
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Confetti particles: use `CONFETTI_COLORS` from `badge-icons.ts`, CSS `animate-confetti-fall`
- All overlays use `createPortal(content, document.body)` for z-index stacking
- `useFocusTrap(isActive, onEscape)` returns a `containerRef` to attach to the trap container
- All dates use `getLocalDateString()` (local timezone, YYYY-MM-DD), never UTC ISO split

---

## Shared Data Models (from Dashboard & Growth Specs)

```typescript
// types/dashboard.ts — ActivityType union (WILL BE MODIFIED)
export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan';

// types/dashboard.ts — DailyActivities (WILL BE MODIFIED)
export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  readingPlan: boolean; // NEW
  pointsEarned: number;
  multiplier: number;
}

// types/dashboard.ts — ActivityCounts (WILL BE MODIFIED)
export interface ActivityCounts {
  pray: number;
  journal: number;
  meditate: number;
  listen: number;
  prayerWall: number;
  readingPlan: number; // NEW
  encouragementsSent: number;
  fullWorshipDays: number;
}

// types/reading-plans.ts — PlanProgress (READ-ONLY, from Spec 1)
export interface PlanProgress {
  startedAt: string;
  currentDay: number;
  completedDays: number[];
  completedAt: string | null;
}

// types/reading-plans.ts — ReadingPlanProgressMap (READ-ONLY)
export type ReadingPlanProgressMap = Record<string, PlanProgress>;

// types/dashboard.ts — BadgeDefinition (used for new reading plan badges)
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  celebrationTier: CelebrationTier;
  repeatable?: boolean;
  verse?: { text: string; reference: string };
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_reading_plan_progress` | Read | Determine active plan, completion state, day counts |
| `wr_daily_activities` | Write (via `recordActivity`) | Record `readingPlan` activity |
| `wr_faith_points` | Write (via `recordActivity`) | Update total points, level |
| `wr_streak` | Write (via `recordActivity`) | Update streak |
| `wr_badges` | Write (via `checkForNewBadges`) | Award reading plan badges |
| `wr_mood_entries` | Read | Get recent mood for widget suggestions |
| `wr_devotional_reads` | Read | Check if today's devotional was read (for recommendations) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Single column, full-width buttons, stacked mini-cards, overlay card `mx-4`, celebration stacks vertically |
| Tablet | 640-1024px | Centered layouts, overlay at `max-w-md`, comfortable padding |
| Desktop | > 1024px | Dashboard 2-column grid (`lg:grid-cols-5`), inline celebration horizontal row, overlay centered |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Action step card → inline celebration | `border-t border-white/10 py-8` | DayContent.tsx pattern |
| Reflection question → devotional callout | `mt-8` (32px) | Spec requirement 27 |
| Devotional callout → action buttons | `mt-8 sm:mt-10` (existing gap) | DevotionalPage.tsx:232 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 1 (reading-plans-browser) is complete and committed on `main` or the working branch
- [ ] The `useReadingPlanProgress` hook exports `getActivePlanId()`, `getProgress()`, `getPlanStatus()`, `completeDay()` as documented
- [ ] The `wr_reading_plan_progress` localStorage key structure matches the `PlanProgress` interface
- [ ] The `useFaithPoints` hook's `recordActivity()` accepts `ActivityType` and the type union can be extended
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference and codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] The `CelebrationOverlay` component and `useFocusTrap` hook are available for reuse

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DevotionalTheme vs PlanTheme mismatch | Use strict equality comparison; only 7 overlapping themes trigger the callout | Spec says "exact match" (req 26). `anxiety-and-peace` ≠ `anxiety`, `community` ≠ `relationships`. This is correct — partial matching would require a mapping table. |
| Multiple days completed same session | Show inline celebration for each day; `+15 pts` only on the first completion that day | `recordActivity('readingPlan')` is idempotent per calendar day. Subsequent day completions show celebration text without points. |
| Reading streak calculation | Count consecutive calendar days where `readingPlan` was true in `wr_daily_activities` | Separate from main app streak. Calculated from `wr_daily_activities` entries backward from today. |
| Full Worship Day badge with 7 activities | Keep current 6-activity check; `readingPlan` is optional/bonus | Spec req 17: "Full Worship Day badge trigger should update to require all 7 activities when the reading plan item is visible, or all 6 when it is not." The multiplier triggers at 6+ regardless. |
| ActivityType union extension | Add `readingPlan` to the union type | This is a breaking change to the type; all existing `Record<ActivityType, ...>` and `DailyActivities` must be updated to include the new field. |
| Widget position in grid | After "Today's Devotional", before "My Prayers" (`order-5` position, `lg:col-span-3`) | Spec req 18: "Positioned after the Today's Devotional widget in grid order." |
| Discovery state plan count | Show up to 3 plans (2-3 per spec) | Default to 3 when mood data exists (filter to mood-matched plans), 3 beginner plans when no mood data |
| All 10 plans completed | Show "You've completed all plans!" message | Spec edge case: "No CTA needed — there's nothing else to start." |

---

## Implementation Steps

### Step 1: Extend Activity Type System

**Objective:** Add `readingPlan` as a new activity type throughout the type system, constants, and storage layer.

**Files to modify:**
- `frontend/src/types/dashboard.ts` — Add `readingPlan` to `ActivityType` union, `DailyActivities` interface, `ActivityCounts` interface
- `frontend/src/constants/dashboard/activity-points.ts` — Add `readingPlan: 15` to `ACTIVITY_POINTS`, display name, checklist name, `ALL_ACTIVITY_TYPES`
- `frontend/src/services/faith-points-storage.ts` — Add `readingPlan: false` to `freshDailyActivities()`
- `frontend/src/services/badge-storage.ts` — Add `readingPlan: 0` to `FRESH_ACTIVITY_COUNTS`
- `frontend/src/hooks/useFaithPoints.ts` — Add `readingPlan: false` to `DEFAULT_STATE.todayActivities` and `extractActivities()`

**Details:**

1. In `types/dashboard.ts` line 14, extend `ActivityType`:
   ```typescript
   export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan';
   ```

2. In `types/dashboard.ts` `DailyActivities` interface (line 16-25), add before `pointsEarned`:
   ```typescript
   readingPlan: boolean;
   ```

3. In `types/dashboard.ts` `ActivityCounts` interface (line 55-63), add before `encouragementsSent`:
   ```typescript
   readingPlan: number;
   ```

4. In `activity-points.ts` line 3-10, add to `ACTIVITY_POINTS`:
   ```typescript
   readingPlan: 15,
   ```

5. In `activity-points.ts` line 12-19, add to `ACTIVITY_DISPLAY_NAMES`:
   ```typescript
   readingPlan: 'Reading Plan',
   ```

6. In `activity-points.ts` line 31-38, add to `ACTIVITY_CHECKLIST_NAMES`:
   ```typescript
   readingPlan: 'Complete a reading',
   ```

7. In `activity-points.ts` line 28, update `MAX_DAILY_BASE_POINTS`:
   ```typescript
   export const MAX_DAILY_BASE_POINTS = 100; // 5+10+10+15+15+20+25
   export const MAX_DAILY_POINTS = 200; // 100 × 2x
   ```

8. In `activity-points.ts` line 40-42, add to `ALL_ACTIVITY_TYPES`:
   ```typescript
   export const ALL_ACTIVITY_TYPES: ActivityType[] = [
     'mood', 'pray', 'listen', 'prayerWall', 'readingPlan', 'meditate', 'journal',
   ];
   ```

9. In `faith-points-storage.ts`, find `freshDailyActivities()` and add `readingPlan: false`.

10. In `badge-storage.ts`, update `FRESH_ACTIVITY_COUNTS` to add `readingPlan: 0`.

11. In `useFaithPoints.ts` line 52, add `readingPlan: false` to `DEFAULT_STATE.todayActivities`.

12. In `useFaithPoints.ts` `extractActivities()` function (lines 62-71), add `readingPlan: da.readingPlan`.

**Guardrails (DO NOT):**
- DO NOT change `MULTIPLIER_TIERS` thresholds — the spec says they remain the same (0-1: 1x, 2-3: 1.25x, 4-5: 1.5x, 6+: 2x)
- DO NOT change point values for existing 6 activities
- DO NOT modify how `calculateDailyPoints()` works — the new activity type just flows through the existing calculation

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ACTIVITY_POINTS includes readingPlan` | unit | Verify `readingPlan: 15` in points map |
| `ALL_ACTIVITY_TYPES includes readingPlan` | unit | Verify new type in ordered array |
| `freshDailyActivities includes readingPlan` | unit | Verify `readingPlan: false` in fresh state |
| `FRESH_ACTIVITY_COUNTS includes readingPlan` | unit | Verify `readingPlan: 0` in fresh counts |
| `MAX_DAILY_BASE_POINTS is 100` | unit | Verify updated max (85 + 15) |
| `recordActivity('readingPlan') awards 15 points` | integration | Call recordActivity, verify points increase |
| `Existing 6 activities unchanged` | regression | Verify all existing point values remain the same |

**Expected state after completion:**
- [ ] TypeScript compiles without errors (no missing `readingPlan` fields in `Record<ActivityType, ...>`)
- [ ] `recordActivity('readingPlan')` successfully records the activity and awards 15 points
- [ ] Existing tests pass (all 6 original activities unchanged)

---

### Step 2: Add Reading Plan Badge Definitions

**Objective:** Add 3 new reading plan badges to the badge system and extend the badge engine to check for them.

**Files to modify:**
- `frontend/src/constants/dashboard/badges.ts` — Add 3 badge definitions
- `frontend/src/services/badge-engine.ts` — Add reading plan completion check
- `frontend/src/constants/dashboard/badge-icons.ts` — Add icon configs for new badges

**Details:**

1. In `badges.ts`, add reading plan badges before `communityBadges` (around line 117):
   ```typescript
   const readingPlanBadges: BadgeDefinition[] = [
     {
       id: 'first_plan',
       name: 'First Plan',
       description: 'Completed your first reading plan',
       category: 'activity',
       celebrationTier: 'toast-confetti',
     },
     {
       id: 'plans_3',
       name: 'Dedicated Reader',
       description: 'Completed 3 reading plans',
       category: 'activity',
       celebrationTier: 'toast-confetti',
     },
     {
       id: 'plans_10',
       name: 'Scripture Scholar',
       description: 'Completed all 10 reading plans',
       category: 'activity',
       celebrationTier: 'full-screen',
       verse: {
         text: 'Your word is a lamp to my feet, and a light for my path.',
         reference: 'Psalm 119:105 WEB',
       },
     },
   ];
   ```

2. In `badges.ts` `BADGE_DEFINITIONS` array (line 134), add `...readingPlanBadges`:
   ```typescript
   export const BADGE_DEFINITIONS: BadgeDefinition[] = [
     ...streakBadges,
     ...levelBadges,
     ...activityMilestoneBadges,
     ...readingPlanBadges,
     fullWorshipDayBadge,
     ...communityBadges,
     welcomeBadge,
   ];
   ```

3. In `badge-engine.ts`, add a new section 6 after the community badges check (after line 94). This section checks `wr_reading_plan_progress` for completed plans:
   ```typescript
   // 6. Reading plan completion badges
   const READING_PLAN_BADGES: Record<number, string> = {
     1: 'first_plan',
     3: 'plans_3',
     10: 'plans_10',
   };

   // Count completed plans from wr_reading_plan_progress
   try {
     const progressJson = localStorage.getItem('wr_reading_plan_progress');
     if (progressJson) {
       const progressMap = JSON.parse(progressJson) as Record<string, { completedAt: string | null }>;
       const completedCount = Object.values(progressMap).filter(p => p.completedAt != null).length;
       for (const [threshold, badgeId] of Object.entries(READING_PLAN_BADGES)) {
         if (completedCount >= Number(threshold) && !earned[badgeId]) {
           result.push(badgeId);
         }
       }
     }
   } catch {
     // Malformed localStorage — skip reading plan badge check
   }
   ```

4. In `badge-icons.ts`, add icon configs for the 3 new badges. Follow the existing pattern (around line 260, inside the explicit badge mappings). Use `BookOpen` icon with blue colors:
   ```typescript
   first_plan: { icon: BookOpen, bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', glowColor: 'rgba(96, 165, 250, 0.3)' },
   plans_3: { icon: BookOpen, bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', glowColor: 'rgba(96, 165, 250, 0.3)' },
   plans_10: { icon: BookOpen, bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', glowColor: 'rgba(96, 165, 250, 0.4)' },
   ```

**Guardrails (DO NOT):**
- DO NOT modify existing badge definitions
- DO NOT change existing badge engine check logic (sections 1-5)
- DO NOT read from `wr_reading_plan_progress` in the `BadgeCheckContext` — access it directly in the badge engine via localStorage (to avoid modifying the context interface signature that all callers use)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `BADGE_DEFINITIONS includes first_plan, plans_3, plans_10` | unit | Verify 3 new badges exist with correct IDs |
| `first_plan has toast-confetti tier` | unit | Verify celebration tier |
| `plans_10 has full-screen tier with verse` | unit | Verify tier and verse content |
| `checkForNewBadges awards first_plan when 1 plan completed` | unit | Set up wr_reading_plan_progress with 1 completed plan, verify badge awarded |
| `checkForNewBadges awards plans_3 when 3 plans completed` | unit | Verify threshold check |
| `checkForNewBadges awards plans_10 when 10 plans completed` | unit | Verify threshold check |
| `checkForNewBadges does not award if already earned` | unit | Set first_plan in earned, verify not re-awarded |
| `Existing badges unchanged` | regression | Verify all original badge IDs still present |

**Expected state after completion:**
- [ ] 3 new badges appear in `BADGE_MAP`
- [ ] Badge engine correctly checks `wr_reading_plan_progress` for completed plans
- [ ] Badge icons render correctly for new badges
- [ ] Existing badge tests pass

---

### Step 3: Inline Day Completion Celebration

**Objective:** When a reading plan day is newly completed via the Intersection Observer, show an inline celebration with animated checkmark, points display, and continue button. Also call `recordActivity('readingPlan')`.

**Files to create/modify:**
- `frontend/src/components/reading-plans/DayCompletionCelebration.tsx` — New component for inline celebration
- `frontend/src/pages/ReadingPlanDetail.tsx` — Integrate celebration component, add `recordActivity` call, track newly completed state

**Details:**

1. Create `DayCompletionCelebration.tsx`:
   ```typescript
   interface DayCompletionCelebrationProps {
     dayNumber: number;
     pointsAwarded: boolean; // true if this is the first readingPlan activity today
     isLastDay: boolean;
     onContinue: () => void; // advances to next day
   }
   ```

2. **SVG checkmark animation:** Create a green circle + checkmark SVG. The path uses `stroke-dasharray` equal to the path length, with `stroke-dashoffset` animating from full to 0 over 500ms via CSS transition. Circle diameter ~48px. Color: `#27AE60` (`text-success`). Stroke width: 3px.

3. **CSS animation:** Add a custom CSS class (via Tailwind `@keyframes` in `tailwind.config.ts` or inline styles) for the checkmark draw effect:
   ```css
   @keyframes checkmark-draw {
     0% { stroke-dashoffset: <pathLength>; }
     100% { stroke-dashoffset: 0; }
   }
   ```
   Use `animation: checkmark-draw 500ms ease-out forwards` on the checkmark path.

4. **Layout:**
   - Container: `border-t border-white/10 py-8 sm:py-10` (matching DayContent section spacing)
   - Centered within `max-w-2xl` (inside the DayContent parent container)
   - Checkmark centered above text
   - "Day X Complete" in `text-lg font-bold text-white`
   - "+15 pts" in `text-primary-lt` (only shown when `pointsAwarded` is true)
   - On desktop: "Day X Complete" and "+15 pts" side by side. On mobile: stacked.
   - "Continue to Day X+1" button: `bg-primary text-white font-semibold py-3 px-6 rounded-lg`. Hidden if `isLastDay`.

5. **Fade-in:** Wrap the entire celebration block in a `div` with inline styles: `opacity: 0 -> 1`, `transform: translateY(10px) -> translateY(0)`, `transition: opacity 300ms ease-out, transform 300ms ease-out`. Use state to trigger on mount.

6. **Reduced motion:** Check `prefers-reduced-motion`. If true: skip checkmark draw animation (show checkmark immediately), skip fade-in (show content immediately). Use `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

7. **In `ReadingPlanDetail.tsx`:**
   - Import `useFaithPoints` and get `recordActivity`, `todayActivities`
   - Add state: `const [justCompletedDay, setJustCompletedDay] = useState<number | null>(null)`
   - Modify the Intersection Observer callback (line 46-48): after `completeDay(planId, selectedDay)`, also:
     ```typescript
     recordActivity('readingPlan' as ActivityType);
     setJustCompletedDay(selectedDay);
     ```
   - Render `<DayCompletionCelebration>` after `<DayContent>` when `justCompletedDay === selectedDay`
   - Pass `pointsAwarded={!todayActivities.readingPlan}` (true if this is the first reading today — before `recordActivity` was called, the value was false; but since `recordActivity` has already run by the time the component renders, check if the activity was already true BEFORE this completion. Track this with a ref.)
   - Actually: better approach — capture `todayActivities.readingPlan` value before calling `recordActivity`, store in a ref, and pass to celebration.
   - `onContinue` handler: advance to next day (`setSelectedDay(selectedDay + 1)`, scroll to top)

8. **Remove existing celebration message** (lines 165-175 in `ReadingPlanDetail.tsx` — the simple emoji celebration). Replace with the new inline celebration component.

**Auth gating:**
- The Intersection Observer already gates on `isAuthenticated` (line 39)
- `recordActivity` no-ops when not authenticated

**Responsive behavior:**
- Desktop (> 1024px): Checkmark centered, "Day X Complete" and "+15 pts" in horizontal row, "Continue" button below centered
- Tablet (640-1024px): Same as desktop
- Mobile (< 640px): Everything stacks vertically, "Continue" button full-width

**Guardrails (DO NOT):**
- DO NOT call `recordActivity` for re-reads of already completed days (the IO already prevents this)
- DO NOT show "+15 pts" when the user already completed a reading today (boolean per day)
- DO NOT show "Continue" button on the last day of a plan

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `DayCompletionCelebration renders checkmark and day number` | unit | Render with dayNumber=3, verify "Day 3 Complete" text |
| `DayCompletionCelebration shows +15 pts when pointsAwarded` | unit | Render with pointsAwarded=true, verify "+15 pts" visible |
| `DayCompletionCelebration hides +15 pts when not pointsAwarded` | unit | Render with pointsAwarded=false, verify "+15 pts" not rendered |
| `DayCompletionCelebration shows Continue button for non-last day` | unit | Render with isLastDay=false, verify button visible |
| `DayCompletionCelebration hides Continue button for last day` | unit | Render with isLastDay=true, verify button not rendered |
| `DayCompletionCelebration respects prefers-reduced-motion` | unit | Mock matchMedia, verify no animation classes |
| `Intersection Observer triggers recordActivity` | integration | Simulate IO fire, verify recordActivity called with 'readingPlan' |
| `Re-reading completed day does not trigger celebration` | integration | Complete day, navigate away, come back — no celebration |

**Expected state after completion:**
- [ ] Completing a day shows green animated checkmark + "Day X Complete" + "+15 pts"
- [ ] Points are recorded via `recordActivity('readingPlan')`
- [ ] "Continue" button advances to next day
- [ ] Last day has no "Continue" button
- [ ] No celebration on re-reads

---

### Step 4: Plan Completion Overlay

**Objective:** When the final day of a plan is completed, show a full-screen celebration overlay with confetti after a 1.5s delay.

**Files to create/modify:**
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` — New full-screen overlay component
- `frontend/src/pages/ReadingPlanDetail.tsx` — Trigger overlay after final day completion

**Details:**

1. Create `PlanCompletionOverlay.tsx`:
   ```typescript
   interface PlanCompletionOverlayProps {
     planTitle: string;
     totalDays: number;
     onDismiss: () => void;
     onBrowsePlans: () => void;
   }
   ```

2. **Overlay structure** (follow `CelebrationOverlay.tsx` pattern):
   - `createPortal(content, document.body)` for z-index isolation
   - Backdrop: `fixed inset-0 z-50 bg-black/70 backdrop-blur-sm`
   - Content card: `bg-hero-mid/90 border border-white/15 rounded-2xl p-8 sm:p-10 max-w-md mx-auto`, centered vertically with flexbox
   - `useFocusTrap(true, onDismiss)` for focus management
   - Scroll lock: `document.body.style.overflow = 'hidden'` on mount, restore on unmount
   - Escape key dismisses (handled by `useFocusTrap`)
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

3. **Content:**
   - "Plan Complete!" in `font-script text-4xl sm:text-5xl text-white`
   - Plan title in `text-xl font-bold text-white mt-4`
   - "X days completed" in `text-white/60 mt-2`
   - Verse: "I have fought the good fight, I have finished the race, I have kept the faith." in `font-serif italic text-white/80 text-base mt-6 leading-relaxed`
   - Attribution: "— 2 Timothy 4:7 WEB" in `text-white/40 text-sm mt-2`
   - "Browse more plans" button: `bg-primary text-white font-semibold py-3 px-6 rounded-lg mt-8 w-full sm:w-auto`
   - Close button: `absolute top-4 right-4`, X icon (`lucide-react X`), `text-white/50 hover:text-white`

4. **Confetti:** Reuse `generateOverlayConfetti()` pattern from `CelebrationOverlay.tsx`. Use `CONFETTI_COLORS`. Mobile: 15 particles, Desktop: 30. 3 second duration (use `animate-confetti-fall` custom animation). Confetti spans hidden with `motion-reduce:hidden`.

5. **Reduced motion:** If `prefers-reduced-motion`, skip confetti (particles have `motion-reduce:hidden`). Show overlay content immediately.

6. **In `ReadingPlanDetail.tsx`:**
   - Add state: `const [showPlanOverlay, setShowPlanOverlay] = useState(false)`
   - When `justCompletedDay` is the last day AND the plan is now completed: start a 1.5s timer, then `setShowPlanOverlay(true)`
   - Render `<PlanCompletionOverlay>` when `showPlanOverlay` is true
   - `onDismiss`: `setShowPlanOverlay(false)`
   - `onBrowsePlans`: navigate to `/reading-plans`

**Auth gating:**
- Only reachable by authenticated users (IO doesn't fire for logged-out)

**Responsive behavior:**
- Desktop: Card `max-w-md` centered
- Tablet: Same as desktop
- Mobile: Card fills width with `mx-4` margins, button full-width

**Guardrails (DO NOT):**
- DO NOT show the overlay for re-reads (only on fresh final-day completion)
- DO NOT auto-dismiss the overlay — user must click dismiss or "Browse more plans"
- DO NOT use `CelebrationOverlay` directly — create a purpose-built component (different content: verse, plan title, browse button)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PlanCompletionOverlay renders title and verse` | unit | Verify "Plan Complete!", plan title, verse text |
| `PlanCompletionOverlay shows confetti particles` | unit | Verify confetti spans rendered (check for motion-reduce:hidden class) |
| `PlanCompletionOverlay traps focus` | unit | Verify focus containment |
| `PlanCompletionOverlay dismisses on Escape` | unit | Simulate Escape key, verify onDismiss called |
| `PlanCompletionOverlay dismisses on X button click` | unit | Click close button, verify onDismiss called |
| `Browse more plans navigates to /reading-plans` | unit | Click button, verify onBrowsePlans called |
| `Overlay appears 1.5s after final day completion` | integration | Complete final day, verify 1.5s delay before overlay |
| `Overlay respects prefers-reduced-motion` | unit | Mock matchMedia, verify confetti hidden |

**Expected state after completion:**
- [ ] Completing the final day triggers a full-screen overlay after 1.5s
- [ ] Overlay shows "Plan Complete!", plan title, verse, confetti
- [ ] Overlay is dismissible via Escape, X button, or "Browse more plans"
- [ ] Focus is trapped in the overlay
- [ ] Reduced motion users see overlay without confetti

---

### Step 5: Activity Checklist — Conditional 7th Item

**Objective:** Add "Complete a reading" as a conditional 7th item in the Activity Checklist widget, visible only when the user has an active reading plan.

**Files to modify:**
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — Add conditional item, update progress ring

**Details:**

1. Import `useReadingPlanProgress` and `BookOpen` from lucide-react.

2. Call `const { getActivePlanId } = useReadingPlanProgress()` inside the component. Check `const hasActivePlan = !!getActivePlanId()`.

3. Build the activity list dynamically:
   ```typescript
   const activityList: { type: ActivityType; icon?: LucideIcon }[] = [
     ...ACTIVITY_ORDER.map(type => ({ type })),
     ...(hasActivePlan ? [{ type: 'readingPlan' as ActivityType, icon: BookOpen }] : []),
   ];
   ```

4. Update the progress ring denominator from hardcoded `6` to `activityList.length`:
   ```typescript
   const totalActivities = activityList.length; // 6 or 7
   const completedCount = activityList.filter((item) => todayActivities[item.type]).length;
   const targetOffset = RING_CIRCUMFERENCE * (1 - completedCount / totalActivities);
   ```

5. Update the center text from `{completedCount}/6` to `{completedCount}/{totalActivities}`.

6. Update the `aria-label` on the progress ring SVG: `` `${completedCount} of ${totalActivities} daily activities completed` ``.

7. Update `getMultiplierPreview` to handle 7 activities — but per the spec, the multiplier tiers don't change. The existing switch-case logic works fine since the multiplier is based on `completedCount` ranges (2: 1.25x, 4: 1.5x, 6+: 2x). With 7 items, the user can reach 7, which still falls under the `6+` tier for 2x. The switch preview text should handle `case 7` by showing the same "Full Worship Day!" message.

8. The reading plan checklist item uses `BookOpen` icon instead of the default `CircleCheck`/`Circle` pattern. When the `readingPlan` item has a custom icon, render `BookOpen` in the completed/uncompleted state (keep the same color logic: `text-success` when completed, `text-white/20` when not).

**Responsive behavior:**
- All breakpoints: Same vertical list layout as existing 6 items

**Guardrails (DO NOT):**
- DO NOT change the multiplier tier thresholds
- DO NOT reorder existing 6 items
- DO NOT show the reading plan item when there is no active plan
- DO NOT hardcode "7" — always use `activityList.length`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Shows 6 items when no active plan` | unit | No wr_reading_plan_progress → 6 items, "X/6" ring |
| `Shows 7 items when active plan exists` | unit | Set up active plan in localStorage → 7 items, "X/7" ring |
| `7th item shows BookOpen icon and "Complete a reading"` | unit | Verify icon and label text |
| `7th item shows +15 pts` | unit | Verify point value display |
| `7th item checked when readingPlan activity recorded` | unit | Set todayActivities.readingPlan=true, verify check icon |
| `Progress ring shows correct fraction` | unit | 3 of 7 completed → ring at 3/7 |
| `Multiplier preview handles 7 completed` | unit | All 7 done → "Full Worship Day! 2x points earned!" |

**Expected state after completion:**
- [ ] Checklist shows 6 items for users without an active plan
- [ ] Checklist shows 7 items (including "Complete a reading") for users with an active plan
- [ ] Progress ring updates correctly with dynamic denominator
- [ ] All existing tests pass

---

### Step 6: Dashboard Reading Plan Widget

**Objective:** Add a new "Reading Plan" widget card to the dashboard with three states: active plan, discovery, and completed.

**Files to create/modify:**
- `frontend/src/components/dashboard/ReadingPlanWidget.tsx` — New widget component with 3 states
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Add widget to grid

**Details:**

1. Create `ReadingPlanWidget.tsx` with 3 state views:

**Active Plan State** (when `getActivePlanId()` returns a plan):
   - Plan title: `text-base font-semibold text-white`
   - Progress bar: `h-2 rounded-full bg-white/10` with `bg-primary` fill, width = `(completedDays.length / totalDays) * 100%`
   - `role="progressbar"` with `aria-valuenow={completedDays.length}`, `aria-valuemin={0}`, `aria-valuemax={totalDays}`, `aria-label="Reading plan progress"`
   - "Day X of Y (Z%)" in `text-sm text-white/50`
   - Current day title: `text-sm text-white/70`
   - "Continue reading" link: `text-sm text-primary-lt hover:text-primary font-medium` with ChevronRight icon, `<Link to={/reading-plans/${planId}}>`
   - Reading streak stat: Calculate by counting consecutive days backward from today where `wr_daily_activities[date].readingPlan` is true. Display "X day reading streak" in `text-xs text-white/40`. Hide if 0.

**Discovery State** (when no active plan, not all completed):
   - "Start a reading plan" in `text-base font-semibold text-white`
   - 2-3 suggested plan mini-cards based on mood matching:
     1. Get mood entries from `wr_mood_entries` for last 7 days
     2. Find most common `MoodValue`
     3. Use the theme-to-mood mapping table (from spec) to find matching plan themes
     4. Filter to unstarted/incomplete plans matching those themes
     5. If no mood data or no matches: show first 3 beginner plans
   - Each mini-card: `bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer`, clickable `<Link>` to `/reading-plans/:planId`. Shows emoji + title in single row.
   - "Browse all plans" link: `text-sm text-primary-lt hover:text-primary font-medium` with ChevronRight, links to `/reading-plans`

**Completed State** (when most recently completed plan has no newer active plan):
   - Green checkmark (`Check` icon, `text-success`) + "You completed [Plan Title]!" in `text-base font-semibold text-white`
   - Plan's cover emoji displayed at `text-2xl`
   - "Start another plan" link: `text-sm text-primary-lt hover:text-primary font-medium`, links to `/reading-plans`

**All 10 Completed State** (special case):
   - "You've completed all plans!" message with a soft achievement tone
   - No CTA needed

2. **Theme-to-mood mapping constant** (create in `constants/reading-plans.ts` or inline in the widget):
   ```typescript
   import type { MoodValue } from '@/types/dashboard';
   import type { PlanTheme } from '@/types/reading-plans';

   export const PLAN_THEME_TO_MOOD: Record<PlanTheme, MoodValue[]> = {
     anxiety: [1, 2],
     grief: [1, 2],
     gratitude: [4, 5],
     identity: [2, 3],
     forgiveness: [1, 2],
     trust: [1, 2],
     hope: [1, 2],
     healing: [1, 2],
     purpose: [3, 4],
     relationships: [4, 5],
   };
   ```

3. **In `DashboardWidgetGrid.tsx`:**
   - Import `ReadingPlanWidget`
   - Add widget after the devotional card (order-5, between devotional order-4 and prayer list which becomes order-6):
   ```tsx
   <DashboardCard
     id="reading-plan"
     title="Reading Plan"
     icon={<BookOpen className="h-5 w-5" />}
     className={cn('order-5 lg:col-span-3', readingPlanAnim.className)}
     style={readingPlanAnim.style}
   >
     <ReadingPlanWidget />
   </DashboardCard>
   ```
   - Update order values: prayer list becomes `order-6`, streak stays `order-1 lg:order-*`, activity checklist `order-7`, friends `order-8`, recap `order-9`, quick actions `order-10`
   - Add `readingPlanAnim = getAnimProps()` between devotional and prayer list animation slots

**Responsive behavior:**
- Desktop (> 1024px): Widget in left column (`lg:col-span-3`), same as devotional and mood chart
- Tablet: Full width within dashboard grid
- Mobile: Full width, stacked layout. Discovery mini-cards stack vertically.

**Guardrails (DO NOT):**
- DO NOT add auth checks inside the widget — the entire dashboard is auth-gated
- DO NOT create new localStorage keys — read from existing `wr_reading_plan_progress`, `wr_daily_activities`, `wr_mood_entries`
- DO NOT show the widget for logged-out users (dashboard is auth-gated)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Active state shows plan title and progress bar` | unit | Set up active plan, verify title and progress |
| `Active state shows correct day fraction` | unit | 3 of 7 days → "Day 4 of 7 (43%)" |
| `Active state progress bar has ARIA attributes` | unit | Verify role="progressbar" and aria attrs |
| `Active state shows Continue reading link` | unit | Verify link to /reading-plans/:planId |
| `Active state shows reading streak when > 0` | unit | Set up consecutive days, verify "2 day reading streak" |
| `Active state hides reading streak when 0` | unit | No consecutive days, verify streak stat hidden |
| `Discovery state shows suggested plans based on mood` | unit | Set up mood entries, verify matching plans shown |
| `Discovery state falls back to beginner plans with no mood data` | unit | No mood entries, verify 3 beginner plans |
| `Discovery state shows "Browse all plans" link` | unit | Verify link to /reading-plans |
| `Completed state shows plan title and checkmark` | unit | Set up completed plan, verify display |
| `All plans completed state shows achievement message` | unit | Set up all 10 completed, verify "You've completed all plans!" |
| `Widget appears in dashboard grid after devotional` | integration | Verify DOM order in grid |

**Expected state after completion:**
- [ ] Dashboard shows Reading Plan widget in correct grid position
- [ ] Widget renders correct state based on plan progress
- [ ] Mood-matched suggestions work with recent mood data
- [ ] All dashboard layout tests pass

---

### Step 7: Devotional Page — Related Reading Plan Callout

**Objective:** Add a "Go Deeper" callout on the devotional page when today's devotional theme matches a reading plan theme.

**Files to create/modify:**
- `frontend/src/components/devotional/RelatedPlanCallout.tsx` — New callout component
- `frontend/src/pages/DevotionalPage.tsx` — Insert callout after reflection question

**Details:**

1. Create `RelatedPlanCallout.tsx`:
   ```typescript
   interface RelatedPlanCalloutProps {
     planId: string;
     planTitle: string;
     planDuration: number;
     planStatus: 'unstarted' | 'active' | 'paused' | 'completed';
   }
   ```

2. **Matching logic** (in `DevotionalPage.tsx`):
   - Get today's devotional theme: `devotional.theme` (DevotionalTheme)
   - Import `getReadingPlans()` (or iterate the reading plans data array)
   - Find first plan where `plan.theme === devotional.theme` (strict equality — only 7 of 10 DevotionalThemes match PlanThemes: trust, gratitude, forgiveness, identity, purpose, hope, healing)
   - Skip if: no match, or matching plan is completed
   - Get plan status via `useReadingPlanProgress().getPlanStatus(planId)`
   - Only show if status is 'unstarted', 'active', or 'paused'

3. **Callout content:**
   - "Go Deeper" label: `text-xs uppercase tracking-wider text-white/40`
   - Plan title: `text-base font-semibold text-white mt-2`
   - Duration: "7-day plan" (or "14-day", "21-day") in `text-sm text-white/50 mt-1`
   - CTA link varies by status:
     - `unstarted`: "Start this plan" in `text-sm text-primary-lt hover:text-primary font-medium`
     - `active`/`paused`: "Continue this plan" in same style
   - Logged-out: clicking "Start this plan" triggers `authModal?.openAuthModal('Sign in to start this reading plan')`
   - Link target: `/reading-plans/:planId`

4. **Styling:** `bg-white/5 border border-white/10 rounded-xl p-5 mt-8`

5. **In `DevotionalPage.tsx`:**
   - Insert the callout after the reflection question section (after line 229), before the action buttons (line 232):
   ```tsx
   {matchingPlan && planStatus !== 'completed' && (
     <RelatedPlanCallout
       planId={matchingPlan.id}
       planTitle={matchingPlan.title}
       planDuration={matchingPlan.durationDays}
       planStatus={planStatus}
     />
   )}
   ```

**Auth gating:**
- Callout visible to all users
- "Start this plan" link: auth-gated for logged-out users (auth modal: "Sign in to start this reading plan")

**Responsive behavior:**
- All breakpoints: Full width within `max-w-2xl` content column, comfortable padding

**Guardrails (DO NOT):**
- DO NOT show the callout when the matching plan is completed
- DO NOT create a fuzzy theme matching system — strict equality only
- DO NOT modify the devotional page layout for non-matching themes
- DO NOT show multiple callouts if somehow multiple plans match (show first unstarted/in-progress only)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Callout renders when theme matches` | unit | Mock devotional with theme 'trust', verify callout shows "Learning to Trust God" |
| `Callout hidden when no theme match` | unit | Mock devotional with theme 'faithfulness' (no plan match), verify no callout |
| `Callout hidden when matching plan is completed` | unit | Set plan as completed, verify no callout |
| `Shows "Start this plan" for unstarted plans` | unit | Plan not started, verify CTA text |
| `Shows "Continue this plan" for active plans` | unit | Plan in progress, verify CTA text |
| `Auth modal on Start click for logged-out users` | unit | Mock logged-out, click CTA, verify auth modal called |
| `Link navigates to /reading-plans/:planId` | unit | Verify link href |

**Expected state after completion:**
- [ ] Devotional page shows "Go Deeper" callout when theme matches a plan
- [ ] CTA text changes based on plan status
- [ ] Auth gating works for logged-out users
- [ ] No callout for completed plans or non-matching themes

---

### Step 8: Insights Page — Reading Plan Activity Correlation

**Objective:** Add reading plan completion to the activity correlations section on the insights page.

**Files to modify:**
- `frontend/src/components/insights/ActivityCorrelations.tsx` — Add reading plan to correlation data

**Details:**

1. Add "Reading Plan" to `MOCK_CORRELATION_DATA`:
   ```typescript
   const MOCK_CORRELATION_DATA = [
     { activity: 'Journaling', withActivity: 4.2, withoutActivity: 3.1 },
     { activity: 'Prayer', withActivity: 4.0, withoutActivity: 3.3 },
     { activity: 'Meditation', withActivity: 4.4, withoutActivity: 3.0 },
     { activity: 'Reading Plan', withActivity: 4.1, withoutActivity: 3.2 },
   ];
   ```

2. The correlation data is currently mock data ("Based on example data. Real correlations coming soon."). Add reading plan as another mock bar. The bar chart will automatically include it since it's data-driven.

3. No changes to the tooltip, legend, or chart configuration needed — the existing Recharts setup handles additional data entries automatically.

**Responsive behavior:**
- Same as existing correlation chart — responsive width via `ResponsiveContainer`

**Guardrails (DO NOT):**
- DO NOT implement real correlation calculation (this is Phase 3+ with real data)
- DO NOT change existing 3 mock correlations — only add the 4th

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Correlation data includes Reading Plan` | unit | Verify "Reading Plan" appears in the chart data |
| `Existing 3 correlations unchanged` | regression | Verify Journaling, Prayer, Meditation still present |

**Expected state after completion:**
- [ ] Insights page shows 4 activity correlations (including Reading Plan)
- [ ] Chart renders correctly with the additional bar

---

### Step 9: Mood Recommendations — Active Plan Card

**Objective:** After mood check-in, add "Continue Your Reading Plan" as a recommendation card when the user has an active plan and hasn't completed a reading today.

**Files to modify:**
- `frontend/src/components/dashboard/MoodRecommendations.tsx` — Add reading plan recommendation card

**Details:**

1. Import `useReadingPlanProgress` and `getReadingPlan` from the reading plans module.

2. After the existing devotional check (around line 75), add reading plan check:
   ```typescript
   const { getActivePlanId, getProgress } = useReadingPlanProgress();
   const activePlanId = getActivePlanId();
   const activePlan = activePlanId ? getReadingPlan(activePlanId) : undefined;
   const activeProgress = activePlanId ? getProgress(activePlanId) : undefined;

   // Check if user already completed a reading today
   const activityLog = JSON.parse(localStorage.getItem('wr_daily_activities') || '{}');
   const todayActivities = activityLog[todayStr];
   const hasReadToday = todayActivities?.readingPlan === true;

   const showReadingPlan = activePlan && activeProgress && !hasReadToday;
   ```

3. Build reading plan recommendation card:
   ```typescript
   const readingPlanRec: MoodRecommendation = {
     title: 'Continue Your Reading Plan',
     description: activeProgress
       ? `Day ${activeProgress.currentDay}: ${activePlan?.days.find(d => d.dayNumber === activeProgress.currentDay)?.title ?? ''}`
       : '',
     icon: 'BookOpen',
     route: `/reading-plans/${activePlanId}`,
   };
   ```

4. Insert into recommendations array — after devotional rec (if present), before the standard 3 suggestions:
   ```typescript
   const recommendations = [
     ...(showDevotional ? [devotionalRec] : []),
     ...(showReadingPlan ? [readingPlanRec] : []),
     ...baseRecommendations,
   ];
   ```

**Auth gating:**
- Mood check-in is already auth-gated — this screen only appears for authenticated users

**Responsive behavior:**
- Same as existing recommendation cards — `flex-col` on mobile, `lg:flex-row` on desktop

**Guardrails (DO NOT):**
- DO NOT show the card when the user has no active plan
- DO NOT show the card when the user already completed a reading today
- DO NOT change the position of the devotional recommendation (it stays first if present)
- DO NOT change the maximum of 3 base recommendations — the reading plan card is additive

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Shows reading plan card when active plan and not read today` | unit | Set up active plan, no today activity → verify card rendered |
| `Hides reading plan card when no active plan` | unit | No active plan → verify card not rendered |
| `Hides reading plan card when already read today` | unit | Set readingPlan=true for today → verify card not rendered |
| `Card shows current day title` | unit | Verify description includes "Day 3: ..." |
| `Card positioned after devotional, before standard recs` | unit | Set up both devotional and reading plan → verify order |
| `Card links to /reading-plans/:planId` | unit | Verify route |

**Expected state after completion:**
- [ ] "Continue Your Reading Plan" appears in recommendations when appropriate
- [ ] Card doesn't appear when conditions aren't met
- [ ] Positioned correctly in the recommendation list

---

### Step 10: Full Worship Day Badge — Dynamic Activity Count

**Objective:** Update the Full Worship Day badge check to account for the optional 7th activity (readingPlan) when the user has an active plan.

**Files to modify:**
- `frontend/src/services/badge-engine.ts` — Update Full Worship Day check

**Details:**

1. In `badge-engine.ts`, section 4 (Full Worship Day, lines 68-79), update the `allTrue` check:
   ```typescript
   // 4. Full Worship Day
   const baseAllTrue =
     context.todayActivities.mood &&
     context.todayActivities.pray &&
     context.todayActivities.listen &&
     context.todayActivities.prayerWall &&
     context.todayActivities.meditate &&
     context.todayActivities.journal;

   // If user has an active reading plan (readingPlan activity was set),
   // Full Worship Day requires readingPlan too
   let hasActivePlan = false;
   try {
     const progressJson = localStorage.getItem('wr_reading_plan_progress');
     if (progressJson) {
       const progressMap = JSON.parse(progressJson) as Record<string, { completedAt: string | null; startedAt: string }>;
       // Check for any plan that's started but not completed
       hasActivePlan = Object.values(progressMap).some(p => p.completedAt == null);
     }
   } catch { /* ignore */ }

   const allTrue = hasActivePlan
     ? baseAllTrue && context.todayActivities.readingPlan
     : baseAllTrue;

   if (allTrue && !context.allActivitiesWereTrueBefore) {
     result.push('full_worship_day');
   }
   ```

2. Update the `fullWorshipDayBadge` description in `badges.ts` to reflect the dynamic nature:
   ```typescript
   const fullWorshipDayBadge: BadgeDefinition = {
     id: 'full_worship_day',
     name: 'Full Worship Day',
     description: 'All daily activities completed in a single day',
     category: 'special',
     celebrationTier: 'special-toast',
     repeatable: true,
   };
   ```

**Guardrails (DO NOT):**
- DO NOT change the multiplier tier thresholds (6+ still triggers 2x)
- DO NOT require `readingPlan` when the user has no active plan

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Full Worship Day triggers with 6 activities when no active plan` | unit | No plan → all 6 true → badge awarded |
| `Full Worship Day requires 7 activities when active plan exists` | unit | Active plan → all 6 true but readingPlan false → badge NOT awarded |
| `Full Worship Day triggers with 7 activities when active plan exists` | unit | Active plan → all 7 true → badge awarded |

**Expected state after completion:**
- [ ] Full Worship Day adapts to whether user has an active reading plan
- [ ] Users without active plans still earn the badge with 6 activities
- [ ] Users with active plans need 7 activities

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend ActivityType system with `readingPlan` |
| 2 | 1 | Add reading plan badge definitions |
| 3 | 1 | Inline day completion celebration + recordActivity |
| 4 | 3 | Plan completion overlay (depends on inline celebration) |
| 5 | 1 | Activity Checklist conditional 7th item |
| 6 | 1 | Dashboard Reading Plan Widget |
| 7 | — | Devotional page related plan callout |
| 8 | — | Insights page activity correlation |
| 9 | 1 | Mood recommendations active plan card |
| 10 | 1, 2 | Full Worship Day dynamic activity count |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend Activity Type System | [COMPLETE] | 2026-03-21 | Modified: types/dashboard.ts, constants/dashboard/activity-points.ts, services/faith-points-storage.ts, services/badge-storage.ts, constants/dashboard/badges.ts, hooks/useFaithPoints.ts, hooks/useProfileData.ts. Updated 10+ test files for new readingPlan field. 132 tests pass. |
| 2 | Add Reading Plan Badge Definitions | [COMPLETE] | 2026-03-21 | Modified: constants/dashboard/badges.ts (3 new badges), services/badge-engine.ts (section 6 reading plan check), constants/dashboard/badge-icons.ts (3 icon configs). Updated badges.test.ts, badge-engine.test.ts. 57 tests pass. |
| 3 | Inline Day Completion Celebration | [COMPLETE] | 2026-03-21 | Created: components/reading-plans/DayCompletionCelebration.tsx. Modified: pages/ReadingPlanDetail.tsx (added useFaithPoints, recordActivity, justCompletedDay state, replaced old emoji celebration). Updated ReadingPlanDetail.test.tsx. 24 tests pass. |
| 4 | Plan Completion Overlay | [COMPLETE] | 2026-03-21 | Created: components/reading-plans/PlanCompletionOverlay.tsx. Modified: pages/ReadingPlanDetail.tsx (added overlay state, 1.5s delay trigger, useNavigate). 24 tests pass. |
| 5 | Activity Checklist — Conditional 7th Item | [COMPLETE] | 2026-03-21 | Rewrote ActivityChecklist.tsx with dynamic activity list (6 or 7 items based on active reading plan). Added useReadingPlanProgress, BookOpen icon, dynamic progress ring denominator. Updated test with mock + 5 new test cases. 17 tests pass. |
| 6 | Dashboard Reading Plan Widget | [COMPLETE] | 2026-03-21 | Created: components/dashboard/ReadingPlanWidget.tsx (4 states: active, discovery, completed, all-completed). Modified: DashboardWidgetGrid.tsx (added widget at order-5, updated remaining order values). 7 tests pass. |
| 7 | Devotional Page — Related Plan Callout | [COMPLETE] | 2026-03-21 | Created: components/devotional/RelatedPlanCallout.tsx. Modified: pages/DevotionalPage.tsx (theme matching logic, callout placement). 6 tests pass. |
| 8 | Insights Page — Activity Correlation | [COMPLETE] | 2026-03-21 | Modified: components/insights/ActivityCorrelations.tsx (added Reading Plan to mock data). 4 tests pass. |
| 9 | Mood Recommendations — Active Plan Card | [COMPLETE] | 2026-03-21 | Modified: components/dashboard/MoodRecommendations.tsx (added useReadingPlanProgress, reading plan recommendation card). Updated test with useAuth mock. 29 tests pass. |
| 10 | Full Worship Day Badge — Dynamic Activity Count | [COMPLETE] | 2026-03-21 | Modified: services/badge-engine.ts (section 4 now checks wr_reading_plan_progress for active plan). Updated badges.ts description. Added 3 new tests. 50 tests pass. |
