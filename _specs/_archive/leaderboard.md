# Feature: Leaderboard

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_leaderboard_global`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider`, navbar logged-in state; Spec 5 (Streak & Faith Points Engine) provides `useFaithPoints()`, `wr_daily_activities`, and level/streak data; Spec 6 (Dashboard Widgets + Activity Integration) provides the "Friends & Leaderboard Preview" dashboard widget skeleton; Spec 7/8 (Badges) provide badge data for profile popups; Spec 9 (Friends System) builds the `/friends` page shell, Friends tab, tab bar, route, mock friend data, and `wr_friends` — this spec replaces the Leaderboard tab placeholder
- Shared constants: Level thresholds and names from `dashboard/levels.ts`; level icon mappings from Spec 6; activity points from `dashboard/activity-points.ts`
- Shared utilities: `getLocalDateString()` and `getCurrentWeekStart()` from `utils/date.ts` (Spec 1); `useFaithPoints()` hook (Spec 5); `useToast()` from Toast system (Spec 8 extended)

---

## Overview

The Leaderboard is the second tab of the `/friends` page, providing a gentle, encouraging way for users to see where they stand among friends and the broader Worship Room community. Two boards — Friends (default) and Global — rank users by weekly faith points, celebrating consistent engagement without shaming inactivity. The Friends board shows avatars, streaks, and levels to foster personal connection; the Global board uses display names only for privacy. A compact dashboard widget surfaces the top 3 friends and the user's position, driving navigation to the full leaderboard.

This feature reinforces the "gentle gamification" philosophy: the leaderboard celebrates presence and consistency, never punishes absence. Users who haven't been active simply appear lower — there are no "lost rank" notifications or shame messaging.

---

## User Stories

- As a **logged-in user**, I want to see how my weekly faith points compare to my friends so that I feel part of an encouraging community journey.
- As a **logged-in user**, I want to toggle between "This Week" and "All Time" on the Friends board so that I can see both short-term momentum and long-term faithfulness.
- As a **logged-in user**, I want to see a Global leaderboard of the broader community so that I can feel part of something larger than my friend circle.
- As a **logged-in user**, I want to see my rank pinned at the top of the Global board so that I always know where I stand without scrolling.
- As a **logged-in user**, I want to tap a name on the Global board to see their level and badges so that I can learn about other community members.
- As a **logged-in user**, I want a compact leaderboard preview on my dashboard so that I get a quick snapshot without leaving the home page.

---

## Requirements

### Tab Integration with `/friends` Page

- This spec replaces the existing Leaderboard tab placeholder (from Spec 9) with the full leaderboard implementation
- The tab bar, route, URL param syncing (`?tab=leaderboard`), and page shell from Spec 9 remain unchanged
- Navigating to `/friends?tab=leaderboard` renders the leaderboard content
- The "Friends" tab continues to show the friends list from Spec 9

### Board Selector

- Two sub-tabs within the Leaderboard tab: "Friends" (default) and "Global"
- Styled as a segmented control / pill toggle — visually distinct from the page-level tab bar
- Active segment: filled purple background (`bg-primary text-white rounded-full`)
- Inactive segment: transparent with muted text (`text-white/60`)
- Switching between Friends and Global does not update the URL (local state only — URL stays `?tab=leaderboard`)

### Friends Leaderboard

**Default view when the Leaderboard tab is active.**

- Ranked by **weekly faith points** (Monday 00:00 to Sunday 23:59, local time)
- Default toggle: "This Week" — shows weekly ranking
- "All Time" toggle: shows ranking by total faith points

**Each row contains:**
1. **Rank number** — bold, left-aligned (#1, #2, #3, etc.)
2. **Avatar** — circular, 36px, with initials fallback (matches Spec 9 pattern)
3. **Display name** — medium weight
4. **Weekly points** — right-aligned, e.g., "145 pts"
5. **Streak indicator** — flame icon + number (e.g., "🔥 45"), small, muted
6. **Level badge** — level icon + level name, small, muted (e.g., "🌳 Flourishing")

**Current user highlighting:**
- The current user's row has a subtle accent background (`bg-primary/10 border-l-2 border-primary`) to stand out from other rows
- Current user's rank, name, and points are included in the list at their correct position

**"This Week" / "All Time" toggle:**
- Styled as small pill buttons near the top of the board (below the board selector, right-aligned)
- Active: `bg-white/10 text-white`
- Inactive: `text-white/40`
- "This Week" is selected by default
- "All Time" re-ranks by total `faithPoints` instead of `weeklyPoints`

**Sort behavior:**
- "This Week": descending by `weeklyPoints` — ties broken by total `faithPoints`
- "All Time": descending by `faithPoints` — ties broken by `weeklyPoints`
- If a friend has 0 weekly points, they still appear (at the bottom) — no one is hidden

### Global Leaderboard

- Accessible via the "Global" segment of the board selector
- Ranked by **weekly faith points only** (resets every Monday at 00:00 local time)
- No "All Time" toggle — global board is weekly only (per master plan)

**Each row contains:**
1. **Rank number** — bold
2. **Display name only** — no avatar (privacy-preserving for non-friends)
3. **Weekly points** — right-aligned

**Privacy-preserving design:**
- No avatars on global board (users haven't consented to showing their face to strangers)
- Only display names and weekly points visible in the list
- Tapping a name opens a minimal popup/tooltip showing: level name + level icon + badge count (e.g., "🌳 Flourishing · 12 badges"). No other personal data.
- Popup closes on outside click or Escape

**Pagination:**
- Top 50 users displayed initially
- "Load more" button at the bottom loads the next 50 (in practice with mock data, there are only 50 total — the button demonstrates the pattern)
- "Load more" button disabled after all entries loaded, text changes to "All users loaded"

**Current user rank pinned:**
- If the current user is not in the visible top 50, a pinned row appears at the very top of the list (above rank #1)
- Pinned row: "You're #247 this week" with the user's rank, name, and weekly points
- If the current user IS in the top 50, they appear in-line with the accent highlight (same as Friends board) and no pinned row is needed
- The pinned row has a subtle top/bottom border to separate it from the ranked list

### Weekly Points Calculation

Weekly points are computed from `wr_daily_activities` using `getCurrentWeekStart()`:

```
function getWeeklyPoints(activities: Record<string, DailyActivityLog>): number {
  const weekStart = getCurrentWeekStart();
  return Object.entries(activities)
    .filter(([date]) => date >= weekStart)
    .reduce((sum, [, day]) => sum + day.pointsEarned, 0);
}
```

- `getCurrentWeekStart()` returns the Monday of the current week as `YYYY-MM-DD` (local time)
- String comparison `date >= weekStart` works because dates are `YYYY-MM-DD` format
- For mock friends, `weeklyPoints` is pre-set in the mock data (Spec 9 already includes this field)
- For the current user, weekly points are computed live from `wr_daily_activities`

### Dashboard Widget Update

The existing "Friends & Leaderboard Preview" widget (from Spec 6) is updated to include leaderboard data:

**Layout:**
- Widget title: "Leaderboard" (or "Friends & Leaderboard" — match existing title from Spec 6)
- **Top 3 friends** ranked by weekly points:
  - Each entry: rank (#1/#2/#3) + avatar (24px) + name (truncated if needed) + weekly pts
  - Compact single-line rows
- **Current user position** (if not in top 3):
  - Separated by a horizontal divider or "..." indicator
  - "You" label + rank + weekly pts (e.g., "You · #5 · 95 pts")
  - If in top 3, no separate row needed
- **Milestone feed** (2-3 recent friend achievements) below the rankings:
  - e.g., "Maria L. reached Oak level!", "Grace H. earned 7-Day Streak badge"
  - Small text, muted, with relative timestamps
  - This section uses mock milestone data
- **"See all" link** → navigates to `/friends?tab=leaderboard`

**Empty state (no friends):**
- "Add friends to see your leaderboard"
- Invite link CTA (navigates to `/friends?tab=friends` to the invite section)

### Mock Global Leaderboard Data

50 mock global users stored in `wr_leaderboard_global` localStorage key. Each entry:

```
LeaderboardEntry {
  id: string            // Unique user ID
  displayName: string   // Display name
  weeklyPoints: number  // This week's points
  totalPoints: number   // All-time points (used for level calc)
  level: number         // 1-6
  levelName: string     // "Seedling" through "Lighthouse"
  badgeCount: number    // Number of badges earned
}
```

**Data characteristics:**
- 50 users with realistic distribution of weekly points (range: 10-170)
- Names are diverse, first name + last initial format (e.g., "Alex T.", "Priya K.", "Samuel O.")
- Current user's position is rank #12 (per master plan)
- Top performers have 150-170 weekly pts, middle users 60-100, bottom users 10-40
- Level distribution: weighted toward lower levels (more Seedlings/Sprouts than Oaks/Lighthouses)
- Badge counts range from 1-20, correlated loosely with level

**Mock data is seeded on first load** — if `wr_leaderboard_global` doesn't exist or is empty, initialize with the 50-user dataset. Mock data persists across sessions.

### Milestone Feed Data

The dashboard widget milestone feed shows recent friend achievements. Mock data (2-3 entries):

| Friend | Milestone | Relative Time |
|--------|-----------|---------------|
| Maria L. | Reached Oak level | 2h ago |
| Grace H. | Earned 7-Day Streak badge | 1d ago |
| Joshua B. | Hit 12,000 Faith Points | 3d ago |

This data can be hardcoded for now. Spec 11 (Social Interactions) will build the full milestone feed system.

---

## UX & Design Notes

- **Tone**: Encouraging and celebratory — "Look how the community is growing together!" Not competitive or shaming. Rankings feel like friendly accountability, not a race.
- **Colors**: Dark theme matching the `/friends` page and dashboard. Frosted glass cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`). Rank #1/#2/#3 can have subtle gold/silver/bronze accent colors for their rank numbers only (gold: `#FFD700`, silver: `#C0C0C0`, bronze: `#CD7F32`).
- **Typography**: Inter for all UI. Rank numbers: `font-bold text-lg`. Display names: `font-medium`. Points: `text-sm text-white/70`. Level badges: `text-xs text-white/50`.
- **Animations**: Row entrance: subtle staggered fade-in when the board first renders (50ms delay between rows, max 500ms total). Toggle transitions: content crossfade (150ms). Respect `prefers-reduced-motion`.
- **Card pattern**: Leaderboard content lives inside a frosted glass card container. The board selector (Friends/Global) sits at the top of this card.
- **Hover states**: Rows have subtle hover background (`bg-white/5` on hover). On the Global board, hover indicates the row is tappable for the profile popup.

### Responsive Behavior

**Mobile (< 640px):**
- Board selector (Friends/Global): full-width pill toggle
- "This Week" / "All Time" toggle: right-aligned below board selector, same row or just below
- Leaderboard rows: rank + avatar + name on one line, pts + streak + level below (2-line layout per row, same pattern as friend list in Spec 9)
- Global board rows: rank + name on one line, pts on the right (single-line — simpler without avatar/streak/level)
- Pinned user rank row: full-width with accent background
- Dashboard widget: full-width card, top 3 friends compact, milestone feed stacked below
- Page padding: `px-4`

**Tablet (640-1024px):**
- Leaderboard rows: single line (rank + avatar + name + pts + streak + level all inline)
- Global board rows: single line
- Dashboard widget: same as desktop
- Page max-width: ~768px, centered (inherits from `/friends` page)

**Desktop (> 1024px):**
- Leaderboard rows: single line with generous spacing between columns
- Rank numbers wider (min-width ~40px for alignment)
- Points right-aligned with consistent column width
- Dashboard widget: standard card width within dashboard grid
- Page max-width: ~900px, centered (inherits from `/friends` page)

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this page has no free-text input. All content is computed rankings and pre-set mock data.
- **User input involved?**: No — the leaderboard is read-only. No forms, no text inputs, no search.
- **AI-generated content?**: No — all content is user data, mock data, and computed rankings. No AI calls.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Cannot access `/friends?tab=leaderboard`** — the `/friends` route is protected (auth-gated by Spec 9). Logged-out users are redirected to the landing page or shown the auth modal.
- **Zero data persistence** — no `wr_leaderboard_global` reads or writes for logged-out users.
- **Dashboard widget**: Not visible (dashboard itself requires auth).

### Logged-in users:
- Full access to the Leaderboard tab with Friends and Global boards
- Global leaderboard mock data persists in `wr_leaderboard_global` localStorage key
- Friends leaderboard data is derived from `wr_friends` (Spec 9) and `wr_daily_activities` (Spec 5)
- `logout()` does NOT clear leaderboard data — user retains all data

### Route type: Protected (inherits from `/friends` route)

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `/friends?tab=leaderboard` route | Redirect to landing page or auth modal | Full leaderboard renders |
| Board selector (Friends/Global) | N/A (page not accessible) | Toggles between boards |
| "This Week" / "All Time" toggle | N/A | Toggles ranking mode on Friends board |
| Tap name on Global board | N/A | Opens level + badges popup |
| Dashboard leaderboard widget | N/A (dashboard not accessible) | Shows top 3 + user position |
| "See all" link on widget | N/A | Navigates to `/friends?tab=leaderboard` |
| "Load more" on Global board | N/A | Loads next batch |

---

## Edge Cases

- **No friends**: Friends leaderboard shows empty state: "Add friends to see your leaderboard" with invite CTA linking to `/friends?tab=friends`. Global board still renders normally.
- **Single friend**: Friends leaderboard shows just the one friend + current user. Rankings still work correctly.
- **All friends have 0 weekly points**: Everyone tied at 0. Ranked by total faith points as tiebreaker. Display "0 pts" — don't hide them.
- **Current user has 0 weekly points**: Still appears in the friends list at the bottom. On global board, still shows pinned rank. No shame messaging — just the number.
- **Week boundary (Monday transition)**: Weekly points reset because `getCurrentWeekStart()` returns the new Monday. Previous week's points are not displayed (no "last week" view in this spec). Friends who were top last week may appear at 0 this week — this is expected.
- **Mock data consistency**: If `wr_friends` has been modified (friends removed/added), the Friends leaderboard should reflect the current friend list, not the original mock data. Removed friends don't appear.
- **Global board ties**: Users with identical weekly points are ordered by total points. If still tied, order by display name alphabetically.
- **Very long display names**: Truncate with ellipsis after ~20 characters on mobile, ~30 on desktop. Never wrap to a second line within the name field.
- **Profile popup on Global board**: The popup is minimal and lightweight — not a full profile page. It shows level icon + level name + badge count. If the user is a friend, the popup could note "Friends" but this is optional for this spec.
- **localStorage corruption for `wr_leaderboard_global`**: If invalid JSON, re-initialize with the full 50-user mock dataset. No crash.
- **Dashboard widget with no friends but user has points**: Show "Add friends to see your leaderboard" — don't show a solo ranking.

---

## Out of Scope

- **Social interactions (encouragements, nudges)** — Spec 11 (the milestone feed in the dashboard widget uses hardcoded mock data, not the full Spec 11 system)
- **Notification system integration** (leaderboard change notifications) — Spec 12
- **Privacy settings** (hide from leaderboard) — Spec 13
- **Profile page** (`/profile/:userId`) — Spec 14 (Global board popup is minimal, not a full profile)
- **Real authentication** — Phase 3
- **Backend API persistence** — Phase 3
- **Real global leaderboard** (aggregating across all real users) — Phase 3
- **"Last week" view or weekly history** — not in MVP
- **Leaderboard position change indicators** (↑3 or ↓2) — not in MVP
- **Weekly recap notifications** ("You finished #3 this week!") — Spec 11/12
- **Church/group leaderboards** — post-MVP
- **Seasonal/event leaderboards** — post-MVP

---

## Acceptance Criteria

### Tab Integration
- [ ] Leaderboard tab on `/friends` page renders full leaderboard content (replaces placeholder)
- [ ] Navigating to `/friends?tab=leaderboard` shows the leaderboard
- [ ] Tab switching between Friends tab and Leaderboard tab works correctly
- [ ] Leaderboard tab maintains all existing `/friends` page functionality (Friends tab, route, URL sync)

### Board Selector
- [ ] "Friends" and "Global" segmented control renders at the top of the leaderboard content
- [ ] "Friends" is selected by default
- [ ] Active segment has filled purple background; inactive has muted text
- [ ] Switching segments shows the correct board content
- [ ] Board selection does not change the URL

### Friends Leaderboard
- [ ] Friends are ranked by weekly faith points (descending) by default
- [ ] Each row shows: rank + avatar (36px, initials fallback) + display name + weekly pts + streak (flame + number) + level badge
- [ ] Current user's row has accent background (`bg-primary/10`) and left border (`border-l-2 border-primary`)
- [ ] Current user appears at correct rank position based on their weekly points
- [ ] "This Week" / "All Time" toggle renders near the top of the board
- [ ] "This Week" is selected by default
- [ ] Switching to "All Time" re-ranks by total faith points
- [ ] Rank #1/#2/#3 numbers have subtle gold/silver/bronze color accents
- [ ] Friends with 0 weekly points still appear (at bottom)
- [ ] Ties in weekly points are broken by total faith points

### Global Leaderboard
- [ ] Global board shows rank + display name + weekly points only (no avatars)
- [ ] Top 50 mock users displayed initially
- [ ] "Load more" button appears at the bottom
- [ ] "Load more" is disabled and shows "All users loaded" when all entries are visible
- [ ] Tapping a name opens a popup showing level icon + level name + badge count
- [ ] Popup closes on outside click and Escape key
- [ ] Current user's rank is pinned at the top when not in the visible list (e.g., "You're #12 this week")
- [ ] Pinned row has distinct visual separation (border) from the ranked list
- [ ] If current user IS in the top 50, they appear in-line with accent highlight instead of pinned row
- [ ] No "All Time" toggle on Global board (weekly only)

### Weekly Points Calculation
- [ ] Weekly points computed from `wr_daily_activities` using `getCurrentWeekStart()`
- [ ] `getCurrentWeekStart()` returns the Monday of the current week in local time
- [ ] Only activities from Monday 00:00 to current time are summed
- [ ] Current user's weekly points update live as activities are recorded

### Dashboard Widget
- [ ] Dashboard widget shows "Leaderboard" title
- [ ] Top 3 friends displayed with rank + avatar (24px) + name + weekly pts
- [ ] Current user position shown if not in top 3 (separated by divider or "..." indicator)
- [ ] Milestone feed shows 2-3 recent friend achievements below rankings
- [ ] "See all" link navigates to `/friends?tab=leaderboard`
- [ ] Empty state: "Add friends to see your leaderboard" + invite CTA when user has no friends

### Mock Data
- [ ] 50 mock global users with diverse names, varied weekly points (10-170 range), varied levels
- [ ] Current user positioned at rank #12 in mock global data
- [ ] Level distribution weighted toward lower levels
- [ ] Badge counts range 1-20, loosely correlated with level
- [ ] Mock data persists in `wr_leaderboard_global` localStorage key
- [ ] Corrupted localStorage re-initializes with full mock dataset

### Empty States
- [ ] Friends leaderboard with no friends: "Add friends to see your leaderboard" + invite CTA
- [ ] Dashboard widget with no friends: same empty state message + invite link
- [ ] Invite CTA navigates to `/friends?tab=friends` (to the invite section)

### Accessibility
- [ ] Board selector uses accessible toggle pattern (e.g., `role="tablist"` with `role="tab"`)
- [ ] "This Week" / "All Time" toggle is keyboard accessible
- [ ] Leaderboard rows use semantic list markup (`role="list"` / `role="listitem"` or `<ol>`)
- [ ] Global board name popup uses `role="dialog"` or `role="tooltip"` with focus management
- [ ] Popup dismissible via Escape key
- [ ] All interactive elements have visible focus outlines
- [ ] All touch targets are minimum 44px
- [ ] Screen reader: current user row announced with "You" or "Your position" context
- [ ] `prefers-reduced-motion`: staggered row fade-in becomes instant; toggle transitions instant

### Responsive Behavior
- [ ] Mobile (< 640px): Friends board rows use 2-line layout (name line + data line); Global board rows single-line; board selector full-width; page padding `px-4`
- [ ] Tablet (640-1024px): all rows single-line; page max-width ~768px centered
- [ ] Desktop (> 1024px): generous spacing; rank numbers min-width ~40px; points column right-aligned; page max-width ~900px centered

### Visual Verification Criteria
- [ ] Page background matches the `/friends` page dark gradient
- [ ] Leaderboard card uses frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Board selector visually distinct from the page-level tab bar (pill/segmented control vs tab bar)
- [ ] Rank #1/#2/#3 gold/silver/bronze colors visible and distinct
- [ ] Current user row highlight is visible but not overwhelming
- [ ] Rows have subtle hover state (`bg-white/5`)
- [ ] Global board popup has visible border/shadow for depth
- [ ] Dashboard widget is compact and fits within the dashboard card grid without overflow
