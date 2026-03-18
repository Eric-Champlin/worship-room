# Implementation Plan: Leaderboard

**Spec:** `_specs/leaderboard.md`
**Date:** 2026-03-17
**Branch:** `claude/feature/leaderboard`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded — Spec 10)

---

## Architecture Context

### Relevant Existing Files & Patterns

**Friends Page Shell (Spec 9 — complete):**
- `frontend/src/pages/Friends.tsx` — Tab bar (`friends` | `leaderboard`), URL param sync via `useSearchParams`, `LeaderboardPlaceholder` component at line 24 (to be replaced)
- Tab bar pattern: `role="tablist"` → `role="tab"` buttons → `role="tabpanel"` divs, active tab `bg-primary text-white`, inactive `border border-white/20 text-white/60`
- Page background: `bg-[#0f0a1e]`, header gradient: `from-[#1a0533] to-[#0f0a1e]`, content area: `mx-auto max-w-4xl px-4 sm:px-6`

**Friend Data (Spec 9 — complete):**
- `frontend/src/types/dashboard.ts` — `FriendProfile` (lines 83-93), `FriendsData` (103-108), `DailyActivityLog` (27-29)
- `frontend/src/mocks/friends-mock-data.ts` — 10 mock friends with `weeklyPoints`, `faithPoints`, `currentStreak`, `level`, `levelName` fields
- `frontend/src/hooks/useFriends.ts` — Returns `{ friends, pendingIncoming, ... }`, sorted by `lastActive`
- `frontend/src/services/friends-storage.ts` — `FRIENDS_KEY = 'wr_friends'`, pure operations

**Dashboard Widget (Spec 6 — complete):**
- `frontend/src/components/dashboard/FriendsPreview.tsx` — Current widget shows top 3 friends by `lastActive` with avatar + name + level. Will be updated with leaderboard ranking.
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Widget grid, `FriendsPreview` at line 75, wrapped in `DashboardCard` with title "Friends & Leaderboard", action `{ label: 'See all', to: '/friends' }`

**Faith Points & Activities (Spec 5 — complete):**
- `frontend/src/hooks/useFaithPoints.ts` — Returns `totalPoints`, `currentLevel`, `levelName`, `currentStreak`, `longestStreak`, `todayActivities`
- `frontend/src/constants/dashboard/activity-points.ts` — `ACTIVITY_POINTS`, `MULTIPLIER_TIERS`
- `wr_daily_activities` localStorage key — `DailyActivityLog` keyed by `YYYY-MM-DD` date strings

**Date Utilities (Spec 1 — complete):**
- `frontend/src/utils/date.ts` — `getLocalDateString()`, `getCurrentWeekStart()` (returns Monday of current week as `YYYY-MM-DD`)

**Level Constants (Spec 5 — complete):**
- `frontend/src/constants/dashboard/levels.ts` — `LEVEL_THRESHOLDS`, `LEVEL_ICON_NAMES`, `getLevelForPoints()`
- Level icons in `FriendRow.tsx`: `LEVEL_ICONS: Record<number, React.ElementType>` mapping 1→Sprout, 2→Leaf, 3→Flower2, 4→TreePine, 5→Trees, 6→Landmark

**Badge Data (Spec 7 — complete):**
- `frontend/src/constants/dashboard/badges.ts` — `BADGE_DEFINITIONS` array, `BADGE_MAP`

**Avatar Component:**
- `frontend/src/components/prayer-wall/Avatar.tsx` — Sizes: `sm` (h-8/w-8 = 32px), `md` (h-10/w-10 = 40px), `lg` (h-16/w-16 = 64px). Takes `firstName`, `lastName`, `avatarUrl`, `size`, `userId`.
- `frontend/src/components/friends/utils.ts` — `splitDisplayName()` helper

**Toast System (Spec 8 — complete):**
- `frontend/src/components/ui/Toast.tsx` — `ToastProvider`, `useToast()` with `showToast(message, type)`

**Test Patterns:**
- `frontend/src/pages/__tests__/Friends.test.tsx` — Mock `useAuth` via `vi.mock`, render with `MemoryRouter` + `ToastProvider`, `localStorage.clear()` in `beforeEach`
- Provider wrapping: `MemoryRouter` (with `future` flags) → `ToastProvider` → Component
- Assertion patterns: `screen.getByRole`, `screen.getByText`, `within()`, `userEvent.setup()`
- Auth mock: `vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn(() => ({...})) }))`

**Route Setup:**
- `frontend/src/App.tsx` — `/friends` route renders `<Friends />` directly. Auth check inside Friends component (`Navigate to="/"` if not authenticated).

### Cross-Spec Dependencies

- **Consumed from Spec 5:** `useFaithPoints()` hook — provides current user's `totalPoints`, `currentLevel`, `levelName`, `currentStreak`
- **Consumed from Spec 9:** `/friends` page shell, tab bar, `useFriends()` hook, `wr_friends` data
- **Consumed from Spec 1:** `getCurrentWeekStart()` for weekly point calculation
- **Produced by this spec:** `wr_leaderboard_global` localStorage key, `LeaderboardEntry` type, `LeaderboardTab` component, updated `FriendsPreview` widget

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View `/friends?tab=leaderboard` | Protected route — redirect if not auth'd | Inherits from Spec 9 | `useAuth()` + `<Navigate>` in Friends.tsx |
| Toggle Friends/Global board | N/A (page not accessible logged-out) | Step 3 | Inherits from route-level auth |
| Toggle This Week/All Time | N/A (page not accessible logged-out) | Step 3 | Inherits from route-level auth |
| Tap name on Global board (popup) | N/A (page not accessible logged-out) | Step 4 | Inherits from route-level auth |
| Load more on Global board | N/A (page not accessible logged-out) | Step 4 | Inherits from route-level auth |
| View dashboard leaderboard widget | Dashboard requires auth | Step 6 | `useAuth()` in Dashboard.tsx |
| "See all" link on widget | Dashboard requires auth | Step 6 | Inherits from dashboard auth |

All auth gating is inherited from the existing route-level protection in `Friends.tsx` (line 69) and `Dashboard.tsx`. No additional auth checks needed within leaderboard components.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `#0f0a1e` (bg-[#0f0a1e]) | Friends.tsx:74 |
| Page header | background | `from-[#1a0533] to-[#0f0a1e]` | Friends.tsx:84 |
| Content container | max-width | `max-w-4xl` (56rem = 896px) | Friends.tsx:85, 126 |
| Content padding | padding | `px-4 sm:px-6` | Friends.tsx:85, 126 |
| Frosted glass card | background + border | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md |
| Card padding | padding | `p-4 md:p-6` | 09-design-system.md |
| Primary purple | color | `#6D28D9` | design-system.md:51 |
| Primary light | color | `#8B5CF6` | design-system.md:52 |
| Page-level tab (active) | background + text | `bg-primary text-white rounded-full` | Friends.tsx:113 |
| Page-level tab (inactive) | border + text | `border border-white/20 text-white/60 hover:text-white/80` | Friends.tsx:114 |
| Row hover | background | `bg-white/5` | FriendRow.tsx:71 |
| Current user highlight | background + border | `bg-primary/10 border-l-2 border-primary` | spec |
| Gold rank color | color | `#FFD700` | spec |
| Silver rank color | color | `#C0C0C0` | spec |
| Bronze rank color | color | `#CD7F32` | spec |
| Pinned row separator | border | `border-t border-b border-white/10` | [UNVERIFIED] → To verify: visual inspection during `/verify-with-playwright` → If wrong: adjust border opacity |
| Avatar sm size | dimensions | `h-8 w-8` (32px) | Avatar.tsx:22 |
| Avatar md size | dimensions | `h-10 w-10` (40px) | Avatar.tsx:23 |
| Level icons | Lucide icons | Sprout(1), Leaf(2), Flower2(3), TreePine(4), Trees(5), Landmark(6) | FriendRow.tsx:9-16 |
| Streak flame color | color | `text-amber-400` | FriendRow.tsx:93 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Inter for all UI text, Lora for scripture, Caveat for script emphasis
- Dashboard/Friends pages use all-dark theme: `bg-[#0f0a1e]` page background
- Frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Friends page uses `max-w-4xl px-4 sm:px-6` container (not max-w-2xl like Daily Hub)
- Page-level tabs are pill-shaped: `rounded-full px-6 py-2 text-sm font-medium`
- All Lucide icons use `aria-hidden="true"` when decorative
- Level icons are imported individually from `lucide-react` (Sprout, Leaf, Flower2, TreePine, Trees, Landmark)
- Avatar uses `splitDisplayName()` from `@/components/friends/utils` to extract first/last
- All interactive elements need min 44px touch targets
- Always respect `prefers-reduced-motion` for animations
- FriendRow uses `text-amber-400` for streak flame color
- Row hover pattern: `hover:bg-white/5` with `transition-colors`

---

## Shared Data Models (from Master Plan)

```typescript
// From types/dashboard.ts (existing)
export interface FriendProfile {
  id: string;
  displayName: string;
  avatar: string;
  level: number;
  levelName: string;
  currentStreak: number;
  faithPoints: number;
  weeklyPoints: number;
  lastActive: string;
}

export interface DailyActivityLog {
  [date: string]: DailyActivities;
}

export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  pointsEarned: number;
  multiplier: number;
}

// NEW — to be added in this spec
export interface LeaderboardEntry {
  id: string;
  displayName: string;
  weeklyPoints: number;
  totalPoints: number;
  level: number;
  levelName: string;
  badgeCount: number;
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_friends` | Read | Friend list for Friends leaderboard |
| `wr_daily_activities` | Read | Current user's activity log for weekly points |
| `wr_faith_points` | Read | Current user's total points for ranking |
| `wr_streak` | Read | Current user's streak for display |
| `wr_leaderboard_global` | Write (seed) + Read | Mock global leaderboard (50 users) |
| `wr_badges` | Read | Current user's badge count for global board popup |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Board selector full-width pill toggle; Friends board rows 2-line (name+avatar line, then pts+streak+level line); Global board single-line; page padding `px-4` |
| Tablet | 640-1024px | All rows single-line; page max-width `max-w-4xl` centered |
| Desktop | > 1024px | Generous spacing; rank numbers min-w-[40px]; points column right-aligned; page max-width `max-w-4xl` centered |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Page header → tab bar | `pb-6` in header, tab section `pb-6` | Friends.tsx:84,98 |
| Tab bar → leaderboard content | `space-y-0` (content directly in tabpanel) | Friends.tsx:126 |
| Board selector → time toggle → board content | `space-y-4` (within frosted card) | [UNVERIFIED] → To verify: visual inspection → If wrong: adjust spacing |
| Board rows → each other | `divide-y divide-white/5` or `space-y-1` | [UNVERIFIED] → To verify: compare to FriendRow spacing → If wrong: match FriendRow gap |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 9 (Friends System) is complete and committed — the `/friends` page shell, tab bar, `useFriends()` hook, and mock data all exist
- [x] Spec 5 (Streak & Faith Points) is complete — `useFaithPoints()` and `wr_daily_activities` exist
- [x] Spec 7/8 (Badges) is complete — badge data and `wr_badges` exist
- [x] `getCurrentWeekStart()` exists in `utils/date.ts`
- [x] `LeaderboardEntry` type does NOT yet exist — needs to be created
- [x] All auth-gated actions from the spec are accounted for in the plan (inherited from route-level protection)
- [x] Design system values are verified from codebase inspection
- [ ] All [UNVERIFIED] values are flagged with verification methods (2 flagged)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Avatar size for leaderboard rows (spec says 36px) | Use Avatar `sm` size (32px) | Closest available size; 36px not in Avatar size map. 32px is acceptable for ranked lists. Adding a new size to Avatar is over-engineering for 4px difference. |
| Avatar size for dashboard widget (spec says 24px) | Use `h-6 w-6` (24px) via className override on a custom mini-avatar | Widget uses compact rows, custom inline avatar with initials is simpler than adding another Avatar size |
| Current user data source for Friends leaderboard | Compute from `useFaithPoints()` hook + `wr_daily_activities` | Ensures live data — user sees their points update immediately after activity |
| Board selector styling | Segmented control with `bg-white/10 rounded-full` container | Visually distinct from page-level tab bar (which uses individual pill buttons without shared container) |
| Global board popup component | Inline positioned popup (not modal/dialog) | Minimal — shows level + badge count only, closes on outside click/Escape. A full dialog is overkill. |
| Row animation | CSS `@keyframes fadeIn` with staggered `animation-delay` via inline style | Simpler than JS-based animation, respects `prefers-reduced-motion` via media query |
| Mock data seeding | Seed in a utility function called on first read | Same pattern as `createDefaultFriendsData()` in friends-mock-data.ts |

---

## Implementation Steps

### Step 1: LeaderboardEntry Type & Weekly Points Utility

**Objective:** Add the `LeaderboardEntry` type and the `getWeeklyPoints()` utility function.

**Files to create/modify:**
- `frontend/src/types/dashboard.ts` — Add `LeaderboardEntry` interface
- `frontend/src/utils/leaderboard.ts` — Create `getWeeklyPoints()`, `sortByWeeklyPoints()`, `sortByTotalPoints()` utilities

**Details:**

Add to `types/dashboard.ts` at the end:
```typescript
export interface LeaderboardEntry {
  id: string;
  displayName: string;
  weeklyPoints: number;
  totalPoints: number;
  level: number;
  levelName: string;
  badgeCount: number;
}
```

Create `utils/leaderboard.ts`:
```typescript
import type { DailyActivityLog } from '@/types/dashboard';
import { getCurrentWeekStart } from '@/utils/date';

export function getWeeklyPoints(activities: DailyActivityLog): number {
  const weekStart = getCurrentWeekStart();
  return Object.entries(activities)
    .filter(([date]) => date >= weekStart)
    .reduce((sum, [, day]) => sum + day.pointsEarned, 0);
}

// Sort friends by weekly points (descending), break ties with total points
export function sortByWeeklyPoints<T extends { weeklyPoints: number; faithPoints?: number; totalPoints?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints;
    const aTotal = a.totalPoints ?? a.faithPoints ?? 0;
    const bTotal = b.totalPoints ?? b.faithPoints ?? 0;
    return bTotal - aTotal;
  });
}

// Sort by total points (descending), break ties with weekly points
export function sortByTotalPoints<T extends { faithPoints?: number; totalPoints?: number; weeklyPoints: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTotal = a.totalPoints ?? a.faithPoints ?? 0;
    const bTotal = b.totalPoints ?? b.faithPoints ?? 0;
    if (bTotal !== aTotal) return bTotal - aTotal;
    return b.weeklyPoints - a.weeklyPoints;
  });
}
```

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` — always use `getLocalDateString()` or `getCurrentWeekStart()` for date strings
- DO NOT import from unused modules

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getWeeklyPoints` returns sum of points for current week only | unit | Filter activities by date >= weekStart |
| `getWeeklyPoints` returns 0 when no activities exist | unit | Empty object input |
| `getWeeklyPoints` excludes last week's activities | unit | Activities from before Monday not counted |
| `sortByWeeklyPoints` sorts descending, ties by total | unit | Verify sort order with tied weekly points |
| `sortByTotalPoints` sorts descending, ties by weekly | unit | Verify sort order with tied total points |

**Expected state after completion:**
- [x] `LeaderboardEntry` type exportable from `types/dashboard.ts`
- [x] `getWeeklyPoints()`, `sortByWeeklyPoints()`, `sortByTotalPoints()` utilities working
- [x] All unit tests pass

---

### Step 2: Mock Global Leaderboard Data

**Objective:** Create 50 mock global leaderboard users and the seeding/storage utilities.

**Files to create/modify:**
- `frontend/src/mocks/leaderboard-mock-data.ts` — 50 mock users + seeding function
- `frontend/src/services/leaderboard-storage.ts` — Storage read/write/init helpers

**Details:**

Create `mocks/leaderboard-mock-data.ts` with 50 `LeaderboardEntry` objects:
- Diverse names (first name + last initial): "Alex T.", "Priya K.", "Samuel O.", etc.
- Weekly points distribution: top 5 users 150-170, middle 20 users 60-100, bottom 25 users 10-40
- Level distribution: weighted lower — ~20 Seedlings, ~12 Sprouts, ~8 Blooming, ~5 Flourishing, ~3 Oak, ~2 Lighthouse
- Badge counts: 1-20 range, loosely correlated with level (higher level = higher badge count)
- Total points: consistent with level (e.g., Seedling 0-99, Sprout 100-499, etc.)
- Current user (from auth context) is NOT in this list — their position is computed as rank #12 per spec

Create `services/leaderboard-storage.ts`:
```typescript
const LEADERBOARD_KEY = 'wr_leaderboard_global';

export function getGlobalLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return initializeGlobalLeaderboard();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return initializeGlobalLeaderboard();
    return parsed;
  } catch {
    return initializeGlobalLeaderboard();
  }
}

function initializeGlobalLeaderboard(): LeaderboardEntry[] {
  const data = MOCK_GLOBAL_LEADERBOARD; // from mock file
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
  return data;
}
```

**Guardrails (DO NOT):**
- DO NOT include the current user in the mock global data — their rank is computed at render time
- DO NOT use real names — use first name + last initial format
- DO NOT make all users have high levels — weight toward lower levels for realism

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Mock data has exactly 50 entries | unit | Length check |
| All entries have required fields | unit | Validate shape |
| Weekly points range is 10-170 | unit | Min/max check |
| Level distribution is weighted lower | unit | Count levels, assert more low than high |
| `getGlobalLeaderboard` returns data from localStorage | unit | Set localStorage, call function |
| `getGlobalLeaderboard` re-initializes on corrupt JSON | unit | Set invalid JSON, assert returns 50 entries |
| `getGlobalLeaderboard` re-initializes on empty array | unit | Set `[]`, assert returns 50 entries |

**Expected state after completion:**
- [x] 50 mock global leaderboard entries exist
- [x] Storage service reads/writes/re-initializes correctly
- [x] All tests pass

---

### Step 3: FriendsLeaderboard Component

**Objective:** Build the Friends leaderboard view with ranked list, "This Week"/"All Time" toggle, and current user highlighting.

**Files to create/modify:**
- `frontend/src/components/leaderboard/FriendsLeaderboard.tsx` — Main Friends board component
- `frontend/src/components/leaderboard/LeaderboardRow.tsx` — Reusable row for Friends board
- `frontend/src/components/leaderboard/BoardSelector.tsx` — "Friends" / "Global" segmented control
- `frontend/src/components/leaderboard/TimeToggle.tsx` — "This Week" / "All Time" toggle

**Details:**

**BoardSelector** (segmented control — visually distinct from page-level tabs):
- Container: `bg-white/10 rounded-full p-1 flex` — shared background makes it a segmented control
- Active segment: `bg-primary text-white rounded-full px-4 py-1.5 text-sm font-medium`
- Inactive segment: `text-white/60 px-4 py-1.5 text-sm font-medium hover:text-white/80 rounded-full`
- ARIA: `role="tablist"` with `role="tab"` on each button, `aria-selected`
- Props: `activeBoard: 'friends' | 'global'`, `onBoardChange: (board) => void`

**TimeToggle** ("This Week" / "All Time"):
- Right-aligned, small pill buttons: `flex gap-1`
- Active: `bg-white/10 text-white text-xs px-3 py-1 rounded-full`
- Inactive: `text-white/40 text-xs px-3 py-1 rounded-full hover:text-white/60`
- ARIA: `role="radiogroup"`, `role="radio"` on each button

**LeaderboardRow** (Friends board row):
- Props: `rank: number`, `friend: FriendProfile`, `isCurrentUser: boolean`, `metric: 'weekly' | 'allTime'`
- Layout (desktop/tablet — single line): rank number (min-w-[40px]) | avatar (sm/32px) | name | points (right-aligned) | streak (flame + count) | level icon + name
- Layout (mobile < 640px — two lines): Line 1: rank + avatar + name. Line 2: points + streak + level (indented, `text-sm text-white/60`)
- Rank #1/#2/#3: rank number colored gold `text-[#FFD700]`, silver `text-[#C0C0C0]`, bronze `text-[#CD7F32]`
- Current user row: `bg-primary/10 border-l-2 border-primary rounded-lg`
- Hover: `hover:bg-white/5 transition-colors`
- Points display: `weeklyPoints` when metric is `'weekly'`, `faithPoints` when `'allTime'`, formatted as "145 pts"
- Streak: only show when `currentStreak > 0`, flame icon `text-amber-400`
- Level: icon from `LEVEL_ICONS` map + levelName, `text-xs text-white/50`
- Row entrance animation: `opacity-0 → opacity-100` via CSS, staggered `animation-delay: ${index * 50}ms` (max 500ms = 10 rows), `prefers-reduced-motion: no-preference` guard
- Row uses semantic `<li>` inside a `<ol>` container

**FriendsLeaderboard** component:
- State: `timeRange: 'weekly' | 'allTime'` (default `'weekly'`)
- Gets friends from `useFriends()` hook
- Gets current user data: compute from `useFaithPoints()` (totalPoints, currentLevel, levelName, currentStreak) + `getWeeklyPoints()` (from `wr_daily_activities` via localStorage read)
- Creates current user entry as `FriendProfile` format: `{ id: user.id, displayName: user.name, ... }`
- Combines friends + current user, sorts via `sortByWeeklyPoints()` or `sortByTotalPoints()`
- Assigns rank (1-indexed) to each entry
- Empty state (no friends): "Add friends to see your leaderboard" + `<Link to="/friends?tab=friends">` "Invite friends"

**Responsive behavior:**
- Desktop (> 1024px): Single-line rows with generous spacing, rank numbers `min-w-[40px]`
- Tablet (640-1024px): Single-line rows, slightly less spacing
- Mobile (< 640px): Two-line rows — name line + data line

**Guardrails (DO NOT):**
- DO NOT fetch or compute data for the Global board in this component
- DO NOT navigate or update URL when toggling "This Week"/"All Time" — local state only
- DO NOT hide friends with 0 weekly points — they appear at bottom per spec
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BoardSelector renders two segments | unit | Both "Friends" and "Global" visible |
| BoardSelector active segment has correct styling | unit | Check for `bg-primary` class |
| BoardSelector calls onBoardChange on click | unit | Mock callback, click inactive |
| TimeToggle renders "This Week" and "All Time" | unit | Both visible |
| TimeToggle defaults to "This Week" | unit | Check aria-checked or active state |
| FriendsLeaderboard ranks by weekly points by default | integration | Verify order matches sorted weekly points |
| FriendsLeaderboard shows current user highlighted | integration | Current user row has accent bg |
| FriendsLeaderboard re-ranks on "All Time" toggle | integration | Switch toggle, verify new order |
| FriendsLeaderboard shows empty state when no friends | integration | Empty friends list, verify CTA |
| LeaderboardRow shows rank, avatar, name, points | unit | All data rendered |
| LeaderboardRow rank #1 has gold color | unit | Check for `text-[#FFD700]` |
| LeaderboardRow current user has border-l-2 | unit | Check `border-l-2 border-primary` |
| Rows use semantic `<ol>` / `<li>` | unit | Check DOM structure |
| Keyboard accessible board selector | integration | Tab/Enter navigates segments |
| Staggered animation respects reduced motion | unit | Check motion-safe guard |

**Expected state after completion:**
- [x] Friends leaderboard renders with correct ranking
- [x] "This Week" / "All Time" toggle works
- [x] Current user is highlighted
- [x] Empty state works
- [x] All tests pass

---

### Step 4: GlobalLeaderboard Component

**Objective:** Build the Global leaderboard with top 50, privacy-preserving design, load more, pinned user rank, and name popup.

**Files to create/modify:**
- `frontend/src/components/leaderboard/GlobalLeaderboard.tsx` — Main Global board component
- `frontend/src/components/leaderboard/GlobalRow.tsx` — Row for Global board (no avatar)
- `frontend/src/components/leaderboard/ProfilePopup.tsx` — Minimal popup (level + badge count)

**Details:**

**GlobalRow** (simpler than Friends row):
- Props: `rank: number`, `entry: LeaderboardEntry`, `isCurrentUser: boolean`, `onClick: () => void`
- Layout: rank number (bold, min-w-[40px]) | display name (clickable) | weekly points (right-aligned)
- NO avatar — privacy-preserving
- Rank #1/#2/#3: gold/silver/bronze colors (same as Friends board)
- Current user: same `bg-primary/10 border-l-2 border-primary` highlight
- Hover: `cursor-pointer hover:bg-white/5`
- Click → triggers popup
- Row entrance animation: same stagger pattern as Friends board

**ProfilePopup:**
- Appears positioned below/next to the clicked name
- Content: level icon + level name + " · " + badge count + " badges" (e.g., "🌳 Flourishing · 12 badges")
- Styling: `bg-[#1a0533] border border-white/15 rounded-xl p-3 shadow-lg`
- Close: outside click (via `useEffect` document click listener) or Escape key
- ARIA: `role="dialog"` with `aria-label="Profile of [name]"`, focus the popup on open
- Fixed positioning relative to the clicked row
- Max width: `max-w-xs` to prevent overflow

**GlobalLeaderboard** component:
- Reads from `getGlobalLeaderboard()` — seeded mock data
- State: `visibleCount: number` (default 50), `popupUserId: string | null`, `popupPosition`
- Sorts mock data by weekly points, breaks ties by total points, then alphabetically by name
- Current user rank: compute user's weekly points from `wr_daily_activities`, find position in sorted list. Per spec, user is at rank #12. Insert user's entry at correct position.
- **Pinned row**: If user is not in the visible batch (visibleCount), show pinned row at top: "You're #[rank] this week" with user's name + weekly points. Pinned row has `border-t border-b border-white/10` separator.
- **If user IS in visible batch**: highlight in-line, no pinned row
- **"Load more" button**: Below the list. Shows next 50 (in practice, mock data is only 50 total + user). Button text: "Load more" when more exist, "All users loaded" (disabled) when all loaded.
- No "All Time" toggle — weekly only per spec

**Responsive behavior:**
- Desktop (> 1024px): Single-line rows, generous spacing
- Tablet (640-1024px): Single-line rows
- Mobile (< 640px): Single-line rows (simpler layout — no avatar/streak/level to stack)

**Guardrails (DO NOT):**
- DO NOT show avatars on the Global board — privacy requirement
- DO NOT show streak, level, or other personal data in the row — only in popup
- DO NOT use a modal/overlay for the popup — use an inline positioned element
- DO NOT show "All Time" toggle on Global board — weekly only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GlobalLeaderboard renders top 50 entries | integration | Verify 50 rows rendered |
| GlobalLeaderboard shows rank + name + points only (no avatar) | integration | Verify no avatar elements |
| Clicking a name opens ProfilePopup | integration | Click name, verify popup |
| ProfilePopup shows level icon + name + badge count | unit | Verify popup content |
| ProfilePopup closes on outside click | integration | Click outside, verify popup gone |
| ProfilePopup closes on Escape key | integration | Press Escape, verify popup gone |
| Current user pinned at top when not in visible range | integration | Set user rank > visible, verify pinned row |
| Current user highlighted in-line when in visible range | integration | User in top 50, verify highlight |
| "Load more" button shows at bottom | integration | Button visible |
| "Load more" disabled and shows "All users loaded" when all loaded | integration | Click load more, verify disabled state |
| Pinned row has correct separator styling | unit | Check border classes |
| Global rows have correct sort order | integration | Verify descending by weekly points |
| Ties broken by total points, then name | integration | Create tied entries, verify order |
| No "All Time" toggle present | integration | Verify toggle not rendered |
| Popup has role="dialog" and aria-label | unit | ARIA check |
| Popup is keyboard dismissible (Escape) | integration | Focus popup, press Escape |

**Expected state after completion:**
- [x] Global leaderboard renders with 50 mock users
- [x] Name popup works with close behavior
- [x] Pinned user rank shows when needed
- [x] Load more works
- [x] No privacy leaks (no avatars, no personal data in rows)
- [x] All tests pass

---

### Step 5: LeaderboardTab Integration & Wire into Friends Page

**Objective:** Create the `LeaderboardTab` wrapper that combines BoardSelector + FriendsLeaderboard/GlobalLeaderboard, and replace the placeholder in `Friends.tsx`.

**Files to create/modify:**
- `frontend/src/components/leaderboard/LeaderboardTab.tsx` — Container component
- `frontend/src/components/leaderboard/index.ts` — Barrel export
- `frontend/src/pages/Friends.tsx` — Replace `LeaderboardPlaceholder` with `LeaderboardTab`

**Details:**

**LeaderboardTab** component:
- State: `activeBoard: 'friends' | 'global'` (default `'friends'`)
- Renders:
  1. Frosted glass card container: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
  2. Board selector (Friends/Global) at top of card
  3. FriendsLeaderboard when `activeBoard === 'friends'`
  4. GlobalLeaderboard when `activeBoard === 'global'`
- Content crossfade: 150ms opacity transition when switching boards. Wrap in `motion-safe:` guard.
- Board switching does NOT update URL — local state only

**Changes to Friends.tsx:**
- Remove `LeaderboardPlaceholder` function (lines 24-31)
- Remove `Trophy` import from lucide-react (only used by placeholder)
- Import `LeaderboardTab` from `@/components/leaderboard`
- Replace `<LeaderboardPlaceholder />` with `<LeaderboardTab />`

**Barrel export** `components/leaderboard/index.ts`:
```typescript
export { LeaderboardTab } from './LeaderboardTab'
```

**Guardrails (DO NOT):**
- DO NOT change the existing tab bar structure, URL syncing, or page-level layout
- DO NOT add new URL params for the board selector
- DO NOT modify the Friends tab content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| LeaderboardTab renders board selector | integration | Both "Friends" and "Global" segments visible |
| LeaderboardTab defaults to Friends board | integration | Friends board content visible |
| Switching to Global shows Global board | integration | Click Global, verify Global board |
| Content wrapped in frosted glass card | integration | Check card classes |
| Board switching does not change URL | integration | Click Global, verify URL still `?tab=leaderboard` |
| Friends page renders LeaderboardTab (not placeholder) | integration | Click Leaderboard tab, verify real content |
| Existing Friends tab still works after integration | integration | Friends tab content unchanged |
| Tab switching between Friends tab and Leaderboard tab works | integration | Navigate between tabs |

**Expected state after completion:**
- [x] Leaderboard tab shows real content (no more placeholder)
- [x] Board selector toggles between Friends and Global
- [x] All existing Friends page tests still pass (update the one that checks for "Leaderboard coming soon")
- [x] All tests pass

---

### Step 6: Dashboard Widget Update (FriendsPreview → Leaderboard Widget)

**Objective:** Update the FriendsPreview dashboard widget to show leaderboard rankings (top 3 by weekly points), current user position, milestone feed, and "See all" link to leaderboard.

**Files to create/modify:**
- `frontend/src/components/dashboard/FriendsPreview.tsx` — Major update: leaderboard data + milestone feed
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Update action link to `/friends?tab=leaderboard`

**Details:**

**FriendsPreview updates:**

Replace current implementation (sort by `lastActive`) with leaderboard ranking:

1. **Top 3 friends** ranked by weekly points:
   - Each entry: rank label ("#1"/"#2"/"#3") + avatar (24px — use inline `h-6 w-6 rounded-full` with initials, not Avatar component for this size) + name (truncate with `truncate max-w-[120px]`) + weekly pts (right-aligned, `text-xs text-white/50`)
   - Compact single-line rows with `flex items-center gap-2`
   - Rank colors: gold/silver/bronze for #1/#2/#3

2. **Current user position** (if not in top 3):
   - Separated by `<div className="border-t border-white/10 my-2" />`
   - "You · #5 · 95 pts" format
   - `text-sm text-white/70`
   - If in top 3, no separate row needed

3. **Milestone feed** (2-3 hardcoded entries):
   - Below rankings, separated by subtle divider
   - Each: `text-xs text-white/40` — "Maria L. reached Oak level · 2h ago"
   - Hardcoded mock data (Spec 11 builds the real system)

4. **Empty state** (no friends):
   - "Add friends to see your leaderboard"
   - Link CTA: "Invite friends" → `/friends?tab=friends`

**DashboardWidgetGrid updates:**
- Change action link from `{ label: 'See all', to: '/friends' }` to `{ label: 'See all', to: '/friends?tab=leaderboard' }`

**Current user weekly points:** Read `wr_daily_activities` from localStorage, compute via `getWeeklyPoints()`. Read `wr_faith_points` for total points. Determine user's rank among friends.

**Guardrails (DO NOT):**
- DO NOT import the full `useFaithPoints()` hook into FriendsPreview — keep it lightweight. Read directly from localStorage.
- DO NOT show the full leaderboard in the widget — only top 3 + user position
- DO NOT show mood data (private)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Widget shows top 3 friends by weekly points | integration | Verify ranking order |
| Widget shows rank numbers with correct colors | unit | Gold/silver/bronze |
| Widget shows current user position when not in top 3 | integration | User at #5, verify "You" row |
| Widget hides user position row when user in top 3 | integration | User is #2, no separate row |
| Widget shows milestone feed below rankings | unit | Verify 2-3 milestone entries |
| Widget empty state shows CTA | integration | No friends, verify message + link |
| "See all" navigates to `/friends?tab=leaderboard` | unit | Check link href |
| Widget works with friends who have 0 weekly points | integration | All friends 0 pts, still shows ranking |

**Expected state after completion:**
- [x] Dashboard widget shows leaderboard-ranked top 3
- [x] Current user position visible
- [x] Milestone feed renders
- [x] "See all" links to leaderboard tab
- [x] Empty state works
- [x] All tests pass

---

### Step 7: Final Test Pass & Edge Case Verification

**Objective:** Run full test suite, fix any broken tests (especially the existing Friends.test.tsx test for placeholder), and add edge case tests.

**Files to create/modify:**
- `frontend/src/pages/__tests__/Friends.test.tsx` — Update placeholder test
- `frontend/src/components/leaderboard/__tests__/` — Verify all tests pass
- `frontend/src/components/dashboard/__tests__/FriendsPreview.test.tsx` — Update existing tests if any

**Details:**

**Update existing Friends.test.tsx:**
- The test `'tab switching shows leaderboard placeholder'` (line 76) currently checks for "Leaderboard coming soon". Update to check for actual leaderboard content (e.g., the board selector "Friends" / "Global" segments).

**Edge case tests to add:**

| Test | Type | Description |
|------|------|-------------|
| All friends have 0 weekly points — ranked by total points | integration | Verify tiebreak logic |
| Current user has 0 weekly points — still appears at bottom | integration | User visible, no crash |
| Single friend + current user — rankings work | integration | Two-person leaderboard |
| Week boundary: fresh Monday, all weekly points are 0 | integration | New week, verify display |
| Very long display name is truncated | unit | 30+ char name, verify ellipsis |
| Mock data corruption for wr_leaderboard_global re-initializes | integration | Set bad JSON, verify recovery |
| Removing a friend updates the Friends leaderboard | integration | Remove friend, verify they disappear from rankings |
| Board selector uses accessible tablist pattern | unit | ARIA roles verified |
| Staggered fade-in disabled with prefers-reduced-motion | unit | Media query check |
| Global board ties broken by total points, then alphabetically | unit | Create three-way tie, verify alpha sort |

**Guardrails (DO NOT):**
- DO NOT skip running the full test suite (`pnpm test`)
- DO NOT modify tests for other features/specs

**Expected state after completion:**
- [x] All existing tests pass (no regressions)
- [x] All new tests pass
- [x] Edge cases covered
- [x] `pnpm test` runs clean

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | LeaderboardEntry type + weekly points utility |
| 2 | 1 | Mock global leaderboard data + storage |
| 3 | 1 | FriendsLeaderboard component + BoardSelector + TimeToggle |
| 4 | 1, 2 | GlobalLeaderboard component + ProfilePopup |
| 5 | 3, 4 | LeaderboardTab integration + Friends.tsx wiring |
| 6 | 1 | Dashboard widget update |
| 7 | 3, 4, 5, 6 | Final test pass + edge cases |

Steps 3, 4, and 6 can be parallelized after Step 1 (and Step 4 also needs Step 2). Step 5 requires both 3 and 4. Step 7 is the final pass after everything.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | LeaderboardEntry type + weekly points utility | [COMPLETE] | 2026-03-17 | Added `LeaderboardEntry` to `types/dashboard.ts`. Created `utils/leaderboard.ts` with `getWeeklyPoints()`, `sortByWeeklyPoints()`, `sortByTotalPoints()`. 9 tests in `utils/__tests__/leaderboard.test.ts`. |
| 2 | Mock global leaderboard data + storage | [COMPLETE] | 2026-03-17 | Created `mocks/leaderboard-mock-data.ts` (50 entries) and `services/leaderboard-storage.ts`. 8 tests across 2 test files. |
| 3 | FriendsLeaderboard component | [COMPLETE] | 2026-03-17 | Created `BoardSelector.tsx`, `TimeToggle.tsx`, `LeaderboardRow.tsx`, `FriendsLeaderboard.tsx` in `components/leaderboard/`. 22 tests across 4 test files. |
| 4 | GlobalLeaderboard component | [COMPLETE] | 2026-03-17 | Created `GlobalLeaderboard.tsx`, `GlobalRow.tsx`, `ProfilePopup.tsx`. 17 tests in 2 test files (GlobalLeaderboard + ProfilePopup). |
| 5 | LeaderboardTab integration + Friends.tsx wiring | [COMPLETE] | 2026-03-17 | Created `LeaderboardTab.tsx`, `index.ts`. Updated `Friends.tsx` (removed placeholder, imported LeaderboardTab). Updated `Friends.test.tsx` (added `@/contexts/AuthContext` mock, updated placeholder test to check real content). 4 new tests + 14 existing tests pass. |
| 6 | Dashboard widget update | [COMPLETE] | 2026-03-17 | Rewrote `FriendsPreview.tsx` with leaderboard rankings (top 3 weekly pts), user position, milestone feed. Updated `DashboardWidgetGrid.tsx` action link to `/friends?tab=leaderboard`. Rewrote `FriendsPreview.test.tsx` (7 tests). |
| 7 | Final test pass + edge cases | [COMPLETE] | 2026-03-17 | Added 8 edge case tests in `edge-cases.test.tsx`. Full suite: 1643 tests, 183 files, 0 failures. |
