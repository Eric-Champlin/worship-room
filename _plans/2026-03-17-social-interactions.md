# Implementation Plan: Social Interactions

**Spec:** `_specs/social-interactions.md`
**Date:** 2026-03-17
**Branch:** `claude/feature/social-interactions`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Project Structure

- **Components:** `frontend/src/components/` — feature folders (friends/, leaderboard/, dashboard/, prayer-wall/, ui/)
- **Pages:** `frontend/src/pages/` — route-level components (Friends.tsx, Dashboard.tsx)
- **Hooks:** `frontend/src/hooks/` — custom hooks (useAuth.ts, useFriends.ts, useFaithPoints.ts)
- **Types:** `frontend/src/types/dashboard.ts` — shared interfaces (FriendProfile, FriendsData, etc.)
- **Services:** `frontend/src/services/` — localStorage abstractions (friends-storage.ts, leaderboard-storage.ts, faith-points-storage.ts)
- **Constants:** `frontend/src/constants/dashboard/` — activity-points.ts, levels.ts, badge-icons.ts
- **Mocks:** `frontend/src/mocks/` — friends-mock-data.ts, leaderboard-mock-data.ts
- **Utils:** `frontend/src/utils/` — date.ts, leaderboard.ts

### Existing Patterns This Spec Extends

1. **FriendRow** (`components/friends/FriendRow.tsx`): Renders friend row with avatar, name, level, streak, last active, and three-dot menu. The "Encourage" button will be added alongside the three-dot menu.
2. **FriendMenu** (`components/friends/FriendMenu.tsx`): Dropdown menu with `role="menu"` + `role="menuitem"`, styled `bg-hero-mid border border-white/15 shadow-lg`, close on outside click and Escape. The encouragement popover follows this exact pattern.
3. **LeaderboardRow** (`components/leaderboard/LeaderboardRow.tsx`): Renders leaderboard entry with rank, avatar, name, level, points, streak. The "Encourage" button will be added here (Friends board only).
4. **FriendsPreview** (`components/dashboard/FriendsPreview.tsx`): Dashboard widget with top-3 leaderboard + hardcoded `MOCK_MILESTONES`. The milestone feed replaces this hardcoded data.
5. **DashboardCard** (`components/dashboard/DashboardCard.tsx`): Frosted glass card with collapsible behavior, `id`, `title`, `icon`, `action`, `children`. Weekly recap uses this.
6. **useToast** (`components/ui/Toast.tsx`): `showToast(message, type)` for success/error toasts.
7. **useAuth** (`hooks/useAuth.ts` + `contexts/AuthContext.tsx`): Returns `{ isAuthenticated, user, login, logout }`.
8. **useFriends** (`hooks/useFriends.ts`): Returns friends, actions, auth-gated (no-ops when logged out).
9. **FriendMenu confirmation pattern**: Uses `window.confirm()` for destructive actions. Nudge confirmation dialog will be a custom dialog (not `window.confirm`) per spec requirement for focus trapping and `role="alertdialog"`.
10. **Date utilities** (`utils/date.ts`): `getLocalDateString()`, `getCurrentWeekStart()` — used for cooldown tracking and weekly recap.

### Test Patterns

- **Provider wrapping**: Tests wrap in `<MemoryRouter>` for navigation. Mock `useAuth` with `vi.mock('@/hooks/useAuth')`.
- **localStorage**: Seed with `localStorage.setItem(key, JSON.stringify(data))`, clean up with `localStorage.clear()` in `beforeEach`.
- **User interactions**: `userEvent.setup()` + `await user.click()`.
- **Assertions**: `screen.getByText()`, `screen.getByRole()`, `screen.queryByText()` for absence.
- **Accessibility**: Assert `role`, `aria-label`, `aria-expanded`, `aria-disabled` attributes.

### Cross-Spec Dependencies

- **Spec 9 (Friends)** provides: `useFriends()`, `FriendRow`, `FriendList`, `FriendProfile` type, `wr_friends` data, mock friends
- **Spec 10 (Leaderboard)** provides: `LeaderboardRow`, `FriendsLeaderboard`, `FriendsPreview` widget with hardcoded milestones
- **Spec 5 (Streak & Faith Points)** provides: `useFaithPoints()`, `getActivityLog()`, `wr_daily_activities`
- **Spec 12 (Notifications)** will consume: notification entries this spec generates in `wr_notifications`
- **Spec 13 (Settings)** will provide: `wr_settings` with `nudgePermission` toggle (this spec reads it if present)

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap "Encourage" button | N/A — pages already auth-gated | Steps 3, 4 | Parent pages (`/friends`, dashboard) already require auth |
| Select encouragement preset | "Full access to all social interaction features" | Step 3 | `useSocialInteractions()` no-ops when not authenticated |
| Send nudge | "Full access to all social interaction features" | Step 5 | `useSocialInteractions()` no-ops when not authenticated |
| Dismiss weekly recap | "Full access to all social interaction features" | Step 7 | Dashboard already requires auth |
| View milestone feed | "Dashboard not accessible" when logged out | Step 6 | Dashboard already requires auth |
| View weekly recap | "Dashboard not accessible" when logged out | Step 7 | Dashboard already requires auth |

Note: All social interaction features live on auth-gated pages (`/friends` redirects to `/` when not authenticated, dashboard only renders when `isAuthenticated`). The hook itself also no-ops when not authenticated as a defense-in-depth measure.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Encouragement popover | background | `bg-hero-mid` (#1E0B3E) | design-system.md — dropdown panel pattern |
| Encouragement popover | border | `border border-white/15` | design-system.md — FriendMenu line 61 |
| Encouragement popover | shadow | `shadow-lg` | design-system.md — dropdown panels |
| Encouragement popover | border-radius | `rounded-xl` (12px) | FriendMenu.tsx:61 |
| Popover menu item | text | `text-sm font-medium text-white/80` | FriendMenu.tsx:67 |
| Popover menu item hover | background | `hover:bg-white/5 hover:text-white` | FriendMenu.tsx:67 |
| Popover menu item height | min-height | `min-h-[44px]` | FriendMenu.tsx:67 |
| Encourage button | style | muted text button, `text-white/40 hover:text-white/60` | Matches three-dot menu trigger styling |
| Nudge button | style | `text-sm text-white/40 hover:text-white/60` | Muted text link style |
| Milestone feed avatar | size | 24px (`h-6 w-6`) | FriendsPreview.tsx:86 |
| Milestone feed avatar | style | `rounded-full bg-primary/40 text-[10px] font-semibold text-white` | FriendsPreview.tsx:87 |
| Milestone timestamp | color | `text-xs text-white/40` | FriendsPreview.tsx:113 |
| Dashboard card (recap) | style | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | DashboardCard.tsx:71 |
| Nudge dialog backdrop | style | `fixed inset-0 bg-black/50 z-50` | Standard modal pattern |
| Nudge dialog | style | `bg-hero-mid border border-white/15 rounded-2xl shadow-lg` | Matches FriendMenu |
| Primary button (Send) | style | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | design-system.md button patterns |
| Secondary button (Cancel) | style | `text-white/60 hover:text-white/80` | Standard cancel pattern |
| Disabled encourage button | opacity | `opacity-40 cursor-not-allowed` | Standard disabled pattern |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Dropdown/popover panels use: `bg-hero-mid border border-white/15 shadow-lg rounded-xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- All text on dark backgrounds: primary text `text-white`, secondary `text-white/50` or `text-white/40`, muted `text-white/40`
- Touch targets: minimum `min-h-[44px] min-w-[44px]`
- Animations: use `motion-safe:` prefix, respect `prefers-reduced-motion`
- Inter for all UI text, Lora for scripture, Caveat for decorative headings only
- FriendRow uses `hover:bg-white/5` transition on the row container
- Level icons map: 1=Sprout, 2=Leaf, 3=Flower2, 4=TreePine, 5=Trees, 6=Landmark

---

## Shared Data Models (from Master Plan)

```typescript
// From types/dashboard.ts (already exists)
interface FriendProfile {
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

// NEW — this spec creates these types
interface Encouragement {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;           // One of 4 presets
  timestamp: string;         // ISO timestamp
}

interface Nudge {
  id: string;
  fromUserId: string;
  toUserId: string;
  timestamp: string;         // ISO timestamp
}

interface SocialInteractionsData {
  encouragements: Encouragement[];
  nudges: Nudge[];
  recapDismissals: string[]; // Array of weekStart date strings (YYYY-MM-DD)
}

interface MilestoneEvent {
  id: string;
  type: 'streak_milestone' | 'level_up' | 'badge_earned' | 'points_milestone';
  userId: string;
  displayName: string;
  avatar: string;
  detail: string;            // e.g., "30" for streak, "Blooming" for level
  timestamp: string;         // ISO timestamp
}

type MilestoneFeed = MilestoneEvent[];

// Weekly recap stats (computed, not stored)
interface WeeklyRecapStats {
  prayers: number;
  journals: number;
  meditations: number;
  worshipHours: number;
  userContributionPercent: number;
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_social_interactions` | Both | Encouragements, nudges, recap dismissals |
| `wr_milestone_feed` | Both | Mock milestone events (max 20) |
| `wr_friends` | Read | Friend list (from Spec 9) |
| `wr_daily_activities` | Read | User activity log (from Spec 5) for recap |
| `wr_faith_points` | Read | User points (from Spec 5) for recap |
| `wr_notifications` | Write | Stub writes for Spec 12 consumption |
| `wr_settings` | Read | Privacy settings for nudge permission (from Spec 13, may not exist yet) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Encourage button icon-only (heart, no text); popover renders as bottom sheet (full-width, anchored to bottom); nudge text below last-active timestamp; weekly recap stats stack vertically |
| Tablet | 640-1024px | Popover anchored to button (~200px wide); encourage shows icon + text; milestone feed same as desktop |
| Desktop | > 1024px | Popover anchored to button (~220px wide); leaderboard "Encourage" appears on row hover; recap stats in 2×2 grid |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Leaderboard top-3 → milestone feed | 8px (border-t separator + space-y-1.5) | FriendsPreview.tsx:110 |
| Milestone feed entries | 6px (`space-y-1.5`) | FriendsPreview.tsx:111 |
| Dashboard card → next card | 16px / 24px (`gap-4 md:gap-6`) | Dashboard widget grid |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Specs 1-10 (Mood Check-In through Leaderboard) are complete and committed
- [ ] `FriendRow.tsx`, `LeaderboardRow.tsx`, `FriendsPreview.tsx`, `DashboardCard.tsx` exist as described
- [ ] `useToast()`, `useAuth()`, `useFriends()`, `useFaithPoints()` hooks are functional
- [ ] `utils/date.ts` provides `getLocalDateString()` and `getCurrentWeekStart()`
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from design-system.md and codebase inspection)
- [ ] `wr_notifications` key is not yet in use (Spec 12 will consume what this spec writes)
- [ ] The `encouragements.ts` constants file does NOT exist yet (referenced in 09-design-system.md as planned)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Encouragement popover vs bottom sheet on mobile | Bottom sheet (full-width at bottom) on < 640px, anchored popover on >= 640px | Spec requirement: "full-width bottom sheet anchored to bottom of screen — easier to reach on mobile" |
| Nudge dialog pattern | Custom dialog with focus trap (`role="alertdialog"`) instead of `window.confirm()` | Spec requires focus trapping, Escape close, backdrop click close — `window.confirm()` can't do this |
| Notification writes | Stub writes to `wr_notifications` array (append-only) | Spec 12 will build the full notification system; this spec just generates data entries |
| Weekly recap "Monday" check | Show if current day is Monday OR recap for current week hasn't been dismissed | Spec: "persists until dismissed or next week" — users who miss Monday still see it |
| Leaderboard "Encourage" visibility | Friends board only, not Global board | Spec: "Leaderboard rows on /friends?tab=leaderboard (Spec 10, Friends board only — not Global board)" |
| Encouragement presets WITHOUT emoji | Plain text: "Praying for you", "Keep going!", "Proud of you", "Thinking of you" | Spec section §1 lists plain text presets. The UX flow section mentions emoji versions but spec Requirements take precedence |
| Profile page "Encourage" button | Deferred — not implemented in this spec | Spec: "exact placement deferred to Spec 14" |
| `wr_notifications` data model | `{ id, type, message, timestamp, read: false }` array | Simple append-only for Spec 12 to consume; include `read` field since Spec 12 will need it |

---

## Implementation Steps

### Step 1: Types, Constants, and Storage Service

**Objective:** Create the data types, encouragement preset constants, and localStorage storage service for social interactions and milestone feed.

**Files to create/modify:**
- `frontend/src/types/dashboard.ts` — Add `Encouragement`, `Nudge`, `SocialInteractionsData`, `MilestoneEvent`, `MilestoneEventType`, `NotificationEntry` types
- `frontend/src/constants/dashboard/encouragements.ts` — Create with 4 preset messages
- `frontend/src/services/social-storage.ts` — Create CRUD functions for `wr_social_interactions` and `wr_milestone_feed`

**Details:**

Add to `types/dashboard.ts`:
```typescript
// Social Interactions types (Spec 11)

export type MilestoneEventType = 'streak_milestone' | 'level_up' | 'badge_earned' | 'points_milestone';

export interface MilestoneEvent {
  id: string;
  type: MilestoneEventType;
  userId: string;
  displayName: string;
  avatar: string;
  detail: string;
  timestamp: string;
}

export interface Encouragement {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: string;
}

export interface Nudge {
  id: string;
  fromUserId: string;
  toUserId: string;
  timestamp: string;
}

export interface SocialInteractionsData {
  encouragements: Encouragement[];
  nudges: Nudge[];
  recapDismissals: string[];
}

export interface NotificationEntry {
  id: string;
  type: 'encouragement' | 'nudge' | 'friend_milestone' | 'weekly_recap' | 'friend_request' | 'milestone' | 'level_up';
  message: string;
  timestamp: string;
  read: boolean;
}
```

Create `constants/dashboard/encouragements.ts`:
```typescript
export const ENCOURAGEMENT_PRESETS = [
  'Praying for you',
  'Keep going!',
  'Proud of you',
  'Thinking of you',
] as const;

export type EncouragementPreset = typeof ENCOURAGEMENT_PRESETS[number];

export const MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY = 3;
export const NUDGE_COOLDOWN_DAYS = 7;
export const NUDGE_INACTIVE_THRESHOLD_DAYS = 3;
export const MILESTONE_FEED_CAP = 20;
```

Create `services/social-storage.ts`:
- `SOCIAL_KEY = 'wr_social_interactions'`
- `MILESTONE_KEY = 'wr_milestone_feed'`
- `NOTIFICATIONS_KEY = 'wr_notifications'`
- `getSocialInteractions(): SocialInteractionsData` — parse from localStorage, default to `{ encouragements: [], nudges: [], recapDismissals: [] }`
- `saveSocialInteractions(data: SocialInteractionsData): void`
- `getMilestoneFeed(): MilestoneEvent[]` — parse, default to mock events (imported from mock file)
- `saveMilestoneFeed(events: MilestoneEvent[]): void` — enforce 20-event cap (FIFO)
- `addNotification(entry: Omit<NotificationEntry, 'id' | 'timestamp' | 'read'>): void` — append to `wr_notifications` array
- `getEncouragementCountToday(fromUserId: string, toUserId: string): number` — filter encouragements by `toUserId` and `getLocalDateString(timestamp) === getLocalDateString(now)`
- `canEncourage(fromUserId: string, toUserId: string): boolean` — count < MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY
- `getLastNudge(fromUserId: string, toUserId: string): Nudge | undefined` — most recent nudge to that friend
- `canNudge(fromUserId: string, toUserId: string): boolean` — no nudge in last 7 days
- `isRecapDismissedThisWeek(): boolean` — check if `getCurrentWeekStart()` is in `recapDismissals`
- All parse functions handle corrupted JSON gracefully (try/catch, return defaults)

**Guardrails (DO NOT):**
- DO NOT use `new Date().toISOString().split('T')[0]` — use `getLocalDateString()` from `utils/date.ts`
- DO NOT store notification data inside `wr_social_interactions` — notifications go in `wr_notifications`
- DO NOT create duplicate types that conflict with existing types in `dashboard.ts`
- DO NOT add emoji to the encouragement presets (spec lists plain text)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getSocialInteractions returns empty default when no data | unit | Verify default state |
| getSocialInteractions handles corrupted JSON | unit | Set invalid JSON, verify default returned |
| saveSocialInteractions persists to localStorage | unit | Save and re-read |
| getMilestoneFeed returns mock data when empty | unit | No localStorage → returns mock events |
| getMilestoneFeed handles corrupted JSON | unit | Set invalid JSON, verify mock data returned |
| saveMilestoneFeed enforces 20-event FIFO cap | unit | Save 25 events, verify only 20 stored (most recent) |
| getEncouragementCountToday counts correctly | unit | Add 3 encouragements today + 2 yesterday, verify count is 3 |
| canEncourage returns false at limit | unit | Add 3 today, verify false |
| canEncourage returns true for different friends | unit | 3 to friendA, verify true for friendB |
| getLastNudge returns most recent | unit | Multiple nudges, verify latest |
| canNudge returns false within 7 days | unit | Nudge 3 days ago, verify false |
| canNudge returns true after 7 days | unit | Nudge 8 days ago, verify true |
| isRecapDismissedThisWeek works | unit | Dismiss current week, verify true; different week, verify false |
| addNotification appends entry | unit | Add 2, verify both in wr_notifications |

**Expected state after completion:**
- [ ] Types added to `types/dashboard.ts`
- [ ] `constants/dashboard/encouragements.ts` exists with 4 presets and rate limit constants
- [ ] `services/social-storage.ts` exists with all CRUD functions
- [ ] All 14 unit tests pass
- [ ] No existing tests broken

---

### Step 2: Mock Milestone Data

**Objective:** Create 12 pre-seeded mock milestone events referencing existing mock friends, spread across the last 7 days.

**Files to create/modify:**
- `frontend/src/mocks/social-mock-data.ts` — Create with mock milestone events

**Details:**

Create `mocks/social-mock-data.ts`:
```typescript
import type { MilestoneEvent } from '@/types/dashboard';

// Reference existing mock friends from friends-mock-data.ts:
// Sarah M. (friend-1), James K. (friend-2), Maria L. (friend-3),
// David R. (friend-4), Grace H. (friend-7), Hannah W. (friend-9),
// Joshua B. (friend-10)

export const MOCK_MILESTONE_EVENTS: MilestoneEvent[] = [
  // Today
  { id: 'ms-1', type: 'streak_milestone', userId: 'friend-3', displayName: 'Maria L.', avatar: '', detail: '90', timestamp: /* ~2h ago */ },
  { id: 'ms-2', type: 'badge_earned', userId: 'friend-7', displayName: 'Grace H.', avatar: '', detail: 'Burning Bright', timestamp: /* ~5h ago */ },
  // Yesterday
  { id: 'ms-3', type: 'level_up', userId: 'friend-2', displayName: 'James K.', avatar: '', detail: 'Blooming', timestamp: /* ~1d ago */ },
  { id: 'ms-4', type: 'points_milestone', userId: 'friend-10', displayName: 'Joshua B.', avatar: '', detail: '12,000', timestamp: /* ~1d ago */ },
  // 2 days ago
  { id: 'ms-5', type: 'streak_milestone', userId: 'friend-1', displayName: 'Sarah M.', avatar: '', detail: '45', timestamp: /* ~2d ago */ },
  { id: 'ms-6', type: 'badge_earned', userId: 'friend-9', displayName: 'Hannah W.', avatar: '', detail: 'Prayer Warrior', timestamp: /* ~2d ago */ },
  // 3 days ago
  { id: 'ms-7', type: 'level_up', userId: 'friend-7', displayName: 'Grace H.', avatar: '', detail: 'Flourishing', timestamp: /* ~3d ago */ },
  // 4 days ago
  { id: 'ms-8', type: 'streak_milestone', userId: 'friend-4', displayName: 'David R.', avatar: '', detail: '7', timestamp: /* ~4d ago */ },
  { id: 'ms-9', type: 'points_milestone', userId: 'friend-1', displayName: 'Sarah M.', avatar: '', detail: '3,500', timestamp: /* ~4d ago */ },
  // 5 days ago
  { id: 'ms-10', type: 'badge_earned', userId: 'friend-3', displayName: 'Maria L.', avatar: '', detail: 'Faithful Journaler', timestamp: /* ~5d ago */ },
  // 6 days ago
  { id: 'ms-11', type: 'level_up', userId: 'friend-4', displayName: 'David R.', avatar: '', detail: 'Sprout', timestamp: /* ~6d ago */ },
  { id: 'ms-12', type: 'streak_milestone', userId: 'friend-9', displayName: 'Hannah W.', avatar: '', detail: '30', timestamp: /* ~6d ago */ },
];
```

Timestamps should be computed relative to current time using `new Date(Date.now() - hoursAgo * 3600000).toISOString()` in a factory function so they stay fresh.

**Guardrails (DO NOT):**
- DO NOT use hardcoded ISO date strings (they'll become stale)
- DO NOT reference friend IDs that don't exist in `friends-mock-data.ts`
- DO NOT exceed 20 events (FIFO cap)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| MOCK_MILESTONE_EVENTS has 12 entries | unit | Verify length |
| All event types are represented | unit | At least 1 of each type |
| All userIds reference valid mock friends | unit | Cross-reference with MOCK_FRIENDS IDs |
| Timestamps are in the past 7 days | unit | Verify all timestamps are within 7 days of now |

**Expected state after completion:**
- [ ] `mocks/social-mock-data.ts` exists with 12 mock milestone events
- [ ] Events reference existing mock friend IDs
- [ ] All 4 tests pass

---

### Step 3: Encouragement Popover Component + FriendRow Integration

**Objective:** Build the EncourageButton and EncouragePopover components, then integrate them into FriendRow.

**Files to create/modify:**
- `frontend/src/components/social/EncourageButton.tsx` — Create: button + popover
- `frontend/src/components/social/EncouragePopover.tsx` — Create: popover with 4 presets
- `frontend/src/components/social/index.ts` — Create: barrel export
- `frontend/src/components/friends/FriendRow.tsx` — Modify: add EncourageButton alongside three-dot menu

**Details:**

**EncourageButton** props:
```typescript
interface EncourageButtonProps {
  friendId: string;
  friendName: string;
  iconOnly?: boolean; // true on mobile (< 640px)
}
```

Button renders a Lucide `Heart` icon + "Encourage" text (or icon-only when `iconOnly` prop). Styling: `text-white/40 hover:text-white/60` matching the three-dot menu trigger. Minimum 44px touch target.

When `disabled` (at 3/day limit): `opacity-40 cursor-not-allowed aria-disabled="true"` with `title="You've encouraged [Name] 3 times today"`.

On click → opens `EncouragePopover`.

**EncouragePopover** props:
```typescript
interface EncouragePopoverProps {
  friendId: string;
  friendName: string;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onSend: (message: string) => void;
}
```

Popover structure:
- Desktop/tablet: absolute positioned below the anchor button, `w-[220px] sm:w-[200px]`
- Mobile (< 640px): fixed bottom sheet, `fixed bottom-0 left-0 right-0 z-50` with backdrop
- Styled: `bg-hero-mid border border-white/15 shadow-lg rounded-xl`
- `role="menu"` on the container, `role="menuitem"` on each preset
- 4 items, each `min-h-[44px] w-full px-4 py-2 text-left text-sm font-medium text-white/80 hover:bg-white/5`
- First item auto-focused on open
- Keyboard: arrow keys between items, Enter/Space to select, Escape to close
- Close on outside click, Escape, or after selecting

On preset tap: popover closes → `onSend(message)` called.

**EncourageButton** handles the storage + toast logic internally:
1. Check `canEncourage()` from storage service
2. If disabled, show disabled state
3. On popover send: call `saveSocialInteractions()` with new encouragement entry, call `addNotification()` with type `encouragement`, show `showToast("Encouragement sent to [Name]!", 'success')`, briefly disable button (300ms) to prevent double-sends

**FriendRow integration:**
- Import `EncourageButton`
- Add `<EncourageButton>` to the right side of the row, before the three-dot menu trigger
- Use `iconOnly` prop on mobile: `<EncourageButton friendId={friend.id} friendName={friend.displayName} iconOnly={/* detect via container width or sm: breakpoint */} />`
- On mobile (< 640px), the Encourage button should be icon-only. Use a CSS approach: render both variants, hide the text one on mobile and icon-only one on desktop via `sm:hidden` / `hidden sm:flex`.

**Responsive behavior:**
- Desktop (> 1024px): Heart icon + "Encourage" text, popover 220px anchored to button
- Tablet (640-1024px): Heart icon + "Encourage" text, popover 200px anchored to button
- Mobile (< 640px): Heart icon only (no text), popover renders as full-width bottom sheet

**Guardrails (DO NOT):**
- DO NOT add free-text input to the popover (presets only, no crisis detection needed)
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT forget to prevent double-sends (300ms debounce after selection)
- DO NOT use `window.confirm()` — the popover is the interaction pattern
- DO NOT add emoji to preset text (spec lists plain text)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| EncourageButton renders with heart icon and text | unit | Verify icon + "Encourage" text |
| EncourageButton renders icon-only when iconOnly prop | unit | Verify only icon, no text |
| Clicking EncourageButton opens popover | integration | Click → popover visible |
| Popover shows 4 preset messages | integration | Verify all 4 presets rendered |
| Selecting a preset closes popover and shows toast | integration | Click preset → popover gone + toast |
| Encouragement stored in wr_social_interactions | integration | Check localStorage after send |
| Notification entry created in wr_notifications | integration | Check localStorage after send |
| Button disabled after 3 encouragements today | integration | Send 3, verify aria-disabled |
| Disabled button shows title text | unit | Verify title attribute |
| Popover closes on Escape | integration | Press Escape → popover closed |
| Popover closes on outside click | integration | Click outside → popover closed |
| Popover has role="menu" and items have role="menuitem" | unit | ARIA assertions |
| Keyboard navigation: arrow keys + Enter | integration | Arrow down to item, Enter selects |
| First item auto-focused on open | integration | Open popover, verify first item focused |
| prefers-reduced-motion: no animation on popover | unit | Verify no animation class with reduced motion |
| FriendRow renders EncourageButton | integration | Render FriendRow, verify Encourage button present |

**Expected state after completion:**
- [ ] `components/social/EncourageButton.tsx` exists and works
- [ ] `components/social/EncouragePopover.tsx` exists with all 4 presets
- [ ] `FriendRow.tsx` renders the Encourage button alongside the three-dot menu
- [ ] All 16 tests pass
- [ ] Existing FriendRow/FriendList tests still pass

---

### Step 4: Leaderboard Row Encourage Button

**Objective:** Add the "Encourage" button to Friends leaderboard rows (not Global board, not current user row).

**Files to create/modify:**
- `frontend/src/components/leaderboard/LeaderboardRow.tsx` — Modify: add EncourageButton
- `frontend/src/components/leaderboard/FriendsLeaderboard.tsx` — Modify: pass `showEncourage` prop

**Details:**

**LeaderboardRow changes:**
- Add optional prop: `showEncourage?: boolean`
- When `showEncourage && !isCurrentUser`: render `<EncourageButton>` after the streak display
- Desktop: button appears on row hover only. Use `opacity-0 group-hover:opacity-100 transition-opacity` inside the row's existing `hover:bg-white/5` container. Add `group` class to the `<li>` element.
- Mobile: button always visible (icon-only heart) since hover doesn't work on touch

**FriendsLeaderboard changes:**
- Pass `showEncourage={true}` to `LeaderboardRow` for all friend entries

**Note:** `GlobalLeaderboard` and `GlobalRow` are NOT modified — spec explicitly excludes Global board.

**Responsive behavior:**
- Desktop (> 1024px): Encourage button hidden by default, appears on row hover
- Tablet (640-1024px): Encourage button always visible
- Mobile (< 640px): Icon-only heart, always visible

**Guardrails (DO NOT):**
- DO NOT add encourage button to GlobalRow or GlobalLeaderboard
- DO NOT add encourage button to the current user's row (`isCurrentUser`)
- DO NOT break existing leaderboard row layout or test patterns

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| LeaderboardRow renders Encourage button when showEncourage=true | unit | Verify button present |
| LeaderboardRow does NOT render Encourage for current user | unit | isCurrentUser=true → no button |
| LeaderboardRow does NOT render Encourage when showEncourage=false | unit | Verify button absent |
| Encourage button on leaderboard row is hidden by default on desktop | unit | Verify opacity-0 class |
| FriendsLeaderboard passes showEncourage to rows | integration | Verify prop forwarding |
| GlobalLeaderboard does NOT have Encourage buttons | integration | Render GlobalLeaderboard, verify no Encourage |

**Expected state after completion:**
- [ ] Friends leaderboard rows have Encourage button (hover-to-reveal on desktop)
- [ ] Global leaderboard rows unchanged
- [ ] Current user row has no Encourage button
- [ ] All 6 tests pass
- [ ] Existing leaderboard tests still pass

---

### Step 5: Nudge System — Button, Dialog, and Storage

**Objective:** Build the nudge button that appears on friend rows for inactive friends, with confirmation dialog and storage.

**Files to create/modify:**
- `frontend/src/components/social/NudgeButton.tsx` — Create: button + dialog
- `frontend/src/components/social/NudgeDialog.tsx` — Create: focus-trapped confirmation dialog
- `frontend/src/components/friends/FriendRow.tsx` — Modify: add NudgeButton below last-active text

**Details:**

**NudgeButton** props:
```typescript
interface NudgeButtonProps {
  friendId: string;
  friendName: string;
  lastActive: string; // ISO timestamp
}
```

Visibility logic (computed from props + storage):
1. Friend `lastActive` is 3+ days ago: `(Date.now() - new Date(lastActive).getTime()) >= NUDGE_INACTIVE_THRESHOLD_DAYS * 86400000`
2. Current user has NOT nudged this friend in the last 7 days: `canNudge(userId, friendId)`
3. Friend has not disabled nudges: check `wr_settings` for nudge permission (if key doesn't exist, default to enabled)

If ALL conditions met → show "Send a nudge" text button with heart icon
If nudged within 7 days → show "Nudge sent" (disabled)
If friend active within 3 days → don't render anything

Styling: `text-sm text-white/40 hover:text-white/60` — muted, gentle, not attention-grabbing. Heart icon (`Heart` from Lucide, `h-3.5 w-3.5`).

**NudgeDialog** props:
```typescript
interface NudgeDialogProps {
  friendName: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

Dialog structure:
- `role="alertdialog"` with `aria-labelledby` and `aria-describedby`
- Backdrop: `fixed inset-0 bg-black/50 z-50`
- Dialog panel: `bg-hero-mid border border-white/15 rounded-2xl shadow-lg p-6 max-w-sm mx-auto`
- Title: "Send a nudge" (`text-lg font-semibold text-white`)
- Body: "Let [Name] know you're thinking of them. They'll receive a gentle reminder." (`text-sm text-white/60`)
- Buttons: "Send" (primary: `bg-primary text-white font-semibold py-2.5 px-6 rounded-lg`) + "Cancel" (secondary: `text-white/60 hover:text-white/80 py-2.5 px-6`)
- Focus trapped (reuse `useFocusTrap` hook from `hooks/useFocusTrap.ts`)
- Close on Escape key
- Close on backdrop click
- Auto-focus "Send" button on open
- **Body text does NOT mention how long the friend has been inactive** (never shame absence)

**NudgeButton** flow:
1. Click "Send a nudge" → open NudgeDialog
2. Confirm → store nudge in `wr_social_interactions.nudges`, add notification to `wr_notifications` (type: `nudge`, message: "[currentUserName] is thinking of you"), show toast "Nudge sent to [Name]", button changes to "Nudge sent" (disabled)
3. Cancel → close dialog, no action

**FriendRow integration:**
- Import `NudgeButton`
- Render below the activity text line (line 2 of the row): `<NudgeButton friendId={friend.id} friendName={friend.displayName} lastActive={friend.lastActive} />`
- Only renders when friend is inactive 3+ days

**Responsive behavior:**
- Desktop (> 1024px): Dialog centered, max-w-sm
- Tablet (640-1024px): Same as desktop
- Mobile (< 640px): Dialog full-width with padding (`mx-4`), centered vertically

**Guardrails (DO NOT):**
- DO NOT mention inactivity duration in the dialog body (spec: "never shame absence")
- DO NOT use `window.confirm()` — must be a custom dialog with focus trap
- DO NOT allow nudging active friends (< 3 days)
- DO NOT forget to check privacy settings from `wr_settings`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| NudgeButton renders for friend inactive 3+ days | unit | lastActive 5 days ago → button visible |
| NudgeButton does NOT render for active friend | unit | lastActive 1 day ago → not rendered |
| NudgeButton shows "Nudge sent" when recently nudged | unit | Nudge stored 2 days ago → disabled |
| NudgeButton renders normally after 7-day cooldown | unit | Nudge stored 8 days ago → button enabled |
| Clicking "Send a nudge" opens dialog | integration | Click → dialog visible |
| Dialog has correct title and body | integration | Verify text content |
| Dialog body does NOT mention inactivity | integration | Verify no "days", "inactive", "away" text |
| Confirming nudge stores in localStorage | integration | Confirm → check wr_social_interactions |
| Confirming nudge creates notification | integration | Confirm → check wr_notifications |
| Confirming nudge shows success toast | integration | Confirm → verify toast |
| Button changes to "Nudge sent" after confirming | integration | Confirm → verify disabled text |
| Dialog closes on Escape | integration | Open, press Escape → dialog closed |
| Dialog closes on backdrop click | integration | Click backdrop → dialog closed |
| Dialog has role="alertdialog" | unit | ARIA assertion |
| Dialog is focus-trapped | integration | Tab cycles within dialog |
| NudgeButton respects nudgePermission=nobody | unit | Set wr_settings, verify not rendered |
| FriendRow renders NudgeButton for inactive friend | integration | Render with inactive friend → nudge visible |
| NudgeButton state persists across reload | integration | Nudge, re-render, verify "Nudge sent" |

**Expected state after completion:**
- [ ] `components/social/NudgeButton.tsx` exists
- [ ] `components/social/NudgeDialog.tsx` exists with focus trap
- [ ] FriendRow shows nudge button for inactive friends
- [ ] All 18 tests pass
- [ ] Existing FriendRow tests still pass

---

### Step 6: Milestone Feed — Component and Dashboard Integration

**Objective:** Build the MilestoneFeed component and replace the hardcoded `MOCK_MILESTONES` in `FriendsPreview` with the real feed from `wr_milestone_feed`.

**Files to create/modify:**
- `frontend/src/components/social/MilestoneFeed.tsx` — Create: feed component
- `frontend/src/components/dashboard/FriendsPreview.tsx` — Modify: replace MOCK_MILESTONES with MilestoneFeed
- `frontend/src/components/social/index.ts` — Modify: add MilestoneFeed export

**Details:**

**MilestoneFeed** props:
```typescript
interface MilestoneFeedProps {
  maxItems?: number;  // default 3 for dashboard widget
  showViewAll?: boolean; // default true
}
```

Feed structure:
- Read from `getMilestoneFeed()` (returns mock data on first load)
- Sort by timestamp descending (most recent first)
- Render `maxItems` entries
- Each entry: `<li>` in an `<ol>` with `aria-label="Friend milestones"`
  - 24px circular avatar (`h-6 w-6 rounded-full bg-primary/40 text-[10px] font-semibold text-white`) with initials
  - Event text formatted by type:
    - `streak_milestone`: "[Name] hit a [detail]-day streak!"
    - `level_up`: "[Name] leveled up to [detail]!"
    - `badge_earned`: "[Name] earned [detail]!"
    - `points_milestone`: "[Name] reached [detail] Faith Points!"
  - Relative timestamp (`timeAgo()` from `lib/time.ts`) in `text-xs text-white/40`
- Subtle fade-in animation on load: `motion-safe:opacity-0 motion-safe:animate-fade-in` with staggered delay

**FriendsPreview changes:**
- Remove the `MOCK_MILESTONES` constant
- Remove the hardcoded milestone section (lines 109-117)
- Replace with `<MilestoneFeed maxItems={3} />`
- Keep the existing top-3 leaderboard + user rank section above
- The border-t separator remains between leaderboard and feed

**Responsive behavior:**
- All breakpoints: stacked vertically, full-width entries. No layout changes needed — the feed is always a simple vertical list.

**Guardrails (DO NOT):**
- DO NOT change the top-3 leaderboard rendering in FriendsPreview
- DO NOT remove the empty state in FriendsPreview (0 friends)
- DO NOT import `timeAgo` from anywhere except `lib/time.ts`
- DO NOT add click handlers to milestone entries (read-only feed)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| MilestoneFeed renders mock events on first load | integration | No wr_milestone_feed → renders mock data |
| MilestoneFeed shows maxItems entries | unit | 12 events, maxItems=3 → 3 rendered |
| MilestoneFeed formats streak_milestone correctly | unit | Verify "[Name] hit a 30-day streak!" |
| MilestoneFeed formats level_up correctly | unit | Verify "[Name] leveled up to Blooming!" |
| MilestoneFeed formats badge_earned correctly | unit | Verify "[Name] earned Burning Bright!" |
| MilestoneFeed formats points_milestone correctly | unit | Verify "[Name] reached 12,000 Faith Points!" |
| MilestoneFeed shows relative timestamps | unit | Verify timeAgo output |
| MilestoneFeed shows 24px avatars with initials | unit | Verify avatar size and content |
| MilestoneFeed uses semantic list markup | unit | ol > li structure |
| FriendsPreview renders MilestoneFeed instead of MOCK_MILESTONES | integration | Verify feed is present, hardcoded data is gone |
| FriendsPreview still shows leaderboard top-3 | integration | Verify top-3 still renders |
| prefers-reduced-motion: no animation on feed entries | unit | Verify no animation with reduced motion |

**Expected state after completion:**
- [ ] `components/social/MilestoneFeed.tsx` exists
- [ ] `FriendsPreview.tsx` uses MilestoneFeed instead of hardcoded data
- [ ] All 12 tests pass
- [ ] Existing FriendsPreview tests updated/passing

---

### Step 7: Weekly Community Recap Card

**Objective:** Build the WeeklyRecap dashboard card that shows group activity stats every Monday and can be dismissed.

**Files to create/modify:**
- `frontend/src/components/dashboard/WeeklyRecap.tsx` — Create: recap card component
- `frontend/src/hooks/useWeeklyRecap.ts` — Create: recap data computation hook
- Dashboard page — Modify: add WeeklyRecap card to the widget grid

**Details:**

**useWeeklyRecap** hook:
```typescript
interface WeeklyRecapData {
  isVisible: boolean;
  stats: {
    prayers: number;
    journals: number;
    meditations: number;
    worshipHours: number;
  };
  userContributionPercent: number;
  hasFriends: boolean;
  dismiss: () => void;
}
```

Logic:
- `isVisible`: true if (a) recap not dismissed this week AND (b) current day is Monday OR user hasn't dismissed yet this week (i.e., show all week until dismissed)
  - Simplified: `!isRecapDismissedThisWeek()` — show every day until dismissed for the current week
- `hasFriends`: `friends.length > 0` from `useFriends()`
- Mock friend group stats (hardcoded realistic numbers):
  - prayers: 23
  - journals: 15
  - meditations: 8
  - worshipHours: 12
- User contribution: read actual `wr_daily_activities` for current week, sum user's activity count. Compute `userWeeklyActivities / (userWeeklyActivities + mockGroupTotal) * 100`, rounded to nearest integer. Mock group total: ~64 activities.
- `dismiss()`: add `getCurrentWeekStart()` to `recapDismissals` in `wr_social_interactions`, also add a weekly_recap notification if one doesn't exist for this week

**WeeklyRecap** component:
- Uses `DashboardCard` wrapper with `id="weekly-recap"`, `title="Weekly Recap"`, `icon={<BarChart3 />}` (Lucide)
- Custom dismiss: X button in the card header (override DashboardCard action area or add as child)
- Content:
  - If no friends: "Add friends to see your weekly recap" + Link to `/friends` CTA
  - If has friends:
    - "Last week, your friend group:" header (`text-sm text-white/60`)
    - Stats grid (2×2 on desktop, stacked on mobile):
      - "Prayed 23 times" with prayer icon
      - "Journaled 15 entries" with journal icon
      - "Completed 8 meditations" with meditation icon
      - "Spent 12 hours in worship music" with music icon
    - "You contributed X% of the group's growth!" (`text-sm font-medium text-primary`)
- X (dismiss) button: `absolute top-2 right-2` inside card, styled as subtle close button

**Dashboard integration:**
- Add `<WeeklyRecap />` to the dashboard widget grid
- Position: below the Quick Actions row (or as a full-width card at the bottom of the grid)
- Only renders when `isVisible` is true

**Notification on Monday:**
- When recap becomes visible and no `weekly_recap` notification exists for this week → add one: `{ type: 'weekly_recap', message: 'Your weekly recap is ready' }`

**Responsive behavior:**
- Desktop (> 1024px): Stats in 2×2 grid within the card
- Tablet (640-1024px): Same as desktop
- Mobile (< 640px): Stats stacked vertically, full-width

**Guardrails (DO NOT):**
- DO NOT show real friend activity data (friends' activities are mock — use hardcoded group totals)
- DO NOT show the recap card if user has 0 friends (show CTA instead)
- DO NOT show the recap permanently — respect dismissal per week
- DO NOT generate a notification more than once per week

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useWeeklyRecap.isVisible returns true when not dismissed | unit | No dismissal → visible |
| useWeeklyRecap.isVisible returns false when dismissed this week | unit | Dismiss → not visible |
| useWeeklyRecap.isVisible resets for new week | unit | Dismiss last week → visible this week |
| useWeeklyRecap.hasFriends reflects friend count | unit | 0 friends → false, 5 friends → true |
| useWeeklyRecap.userContributionPercent computed correctly | unit | Set activities, verify percentage |
| useWeeklyRecap.dismiss stores week start in recapDismissals | unit | Call dismiss, check storage |
| WeeklyRecap renders no-friends state with CTA | integration | 0 friends → CTA to /friends |
| WeeklyRecap renders stats with friend data | integration | Has friends → stats grid visible |
| WeeklyRecap shows contribution percentage | integration | Verify "You contributed X%" text |
| WeeklyRecap X button dismisses card | integration | Click X → card not rendered |
| WeeklyRecap dismissed state persists across reload | integration | Dismiss, re-render → not visible |
| WeeklyRecap stats use 2×2 grid on desktop | unit | Verify grid layout classes |
| WeeklyRecap stats stack on mobile | unit | Verify stacked layout classes |
| Notification generated when recap visible | integration | Verify wr_notifications entry |
| Notification NOT generated twice for same week | integration | Render twice, verify only 1 notification |

**Expected state after completion:**
- [ ] `components/dashboard/WeeklyRecap.tsx` exists
- [ ] `hooks/useWeeklyRecap.ts` exists
- [ ] Dashboard renders WeeklyRecap card when visible
- [ ] All 15 tests pass
- [ ] Existing dashboard tests still pass

---

### Step 8: useSocialInteractions Hook + Integration Wiring

**Objective:** Create a single hook that exposes all social interaction operations, wire it into existing components, and ensure the full flow works end-to-end.

**Files to create/modify:**
- `frontend/src/hooks/useSocialInteractions.ts` — Create: unified hook
- `frontend/src/components/social/EncourageButton.tsx` — Modify: use hook instead of direct storage calls
- `frontend/src/components/social/NudgeButton.tsx` — Modify: use hook instead of direct storage calls

**Details:**

**useSocialInteractions** hook:
```typescript
interface UseSocialInteractions {
  // Encouragements
  sendEncouragement: (toUserId: string, toName: string, message: string) => void;
  canEncourage: (toUserId: string) => boolean;
  getEncouragementCount: (toUserId: string) => number;

  // Nudges
  sendNudge: (toUserId: string, toName: string) => void;
  canNudge: (toUserId: string) => boolean;
  wasNudged: (toUserId: string) => boolean;

  // Recap
  isRecapDismissedThisWeek: boolean;
  dismissRecap: () => void;
}
```

- Auth-gated: all functions no-op when `!isAuthenticated`
- `sendEncouragement()`: validates `canEncourage()`, stores encouragement, adds notification, validates friend still exists in `wr_friends`
- `sendNudge()`: validates `canNudge()`, stores nudge, adds notification
- Uses `useState` to trigger re-renders when data changes
- Edge case: if friend was removed between render and send, no-op gracefully

**Component refactor:**
- `EncourageButton`: replace direct storage calls with `useSocialInteractions().sendEncouragement()`
- `NudgeButton`: replace direct storage calls with `useSocialInteractions().sendNudge()`

This centralizes all social interaction logic and makes testing easier.

**Guardrails (DO NOT):**
- DO NOT break the existing EncourageButton/NudgeButton API (props stay the same)
- DO NOT add state management beyond what's needed (keep it simple)
- DO NOT expose internal storage details through the hook interface

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useSocialInteractions no-ops when not authenticated | unit | Mock auth off → functions return without effect |
| sendEncouragement stores data and notification | unit | Call, verify both localStorage keys |
| sendEncouragement respects 3/day limit | unit | Call 4x, verify 4th is no-op |
| sendNudge stores data and notification | unit | Call, verify storage |
| sendNudge respects 7-day cooldown | unit | Call twice within 7 days, verify 2nd is no-op |
| canEncourage returns correct boolean | unit | Various states |
| canNudge returns correct boolean | unit | Various states |
| sendEncouragement validates friend exists | unit | Remove friend, call send → no-op |

**Expected state after completion:**
- [ ] `hooks/useSocialInteractions.ts` exists as unified hook
- [ ] EncourageButton and NudgeButton use the hook
- [ ] All 8 tests pass
- [ ] All Step 3 and Step 5 tests still pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types, constants, storage service |
| 2 | 1 | Mock milestone data |
| 3 | 1 | Encouragement popover + FriendRow integration |
| 4 | 3 | Leaderboard row encourage button |
| 5 | 1 | Nudge button + dialog + FriendRow integration |
| 6 | 1, 2 | Milestone feed component + FriendsPreview integration |
| 7 | 1 | Weekly recap card + dashboard integration |
| 8 | 3, 5 | Unified hook + component refactor |

Steps 3, 5, 6, 7 are independent of each other (all depend on Step 1). Step 4 depends on Step 3. Step 8 depends on Steps 3 and 5.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types, Constants, Storage Service | [COMPLETE] | 2026-03-17 | Added 5 types to `types/dashboard.ts`, created `constants/dashboard/encouragements.ts`, created `services/social-storage.ts` with all CRUD functions. 23 tests pass. |
| 2 | Mock Milestone Data | [COMPLETE] | 2026-03-17 | Created `mocks/social-mock-data.ts` with 12 events using factory function for fresh timestamps. Uses actual friend IDs (e.g., `friend-sarah-m` not `friend-1`). 4 tests pass. |
| 3 | Encourage Popover + FriendRow | [COMPLETE] | 2026-03-17 | Created `EncourageButton.tsx`, `EncouragePopover.tsx`, `index.ts` in `components/social/`. Modified `FriendRow.tsx` to include EncourageButton. Used ref-based debounce instead of setTimeout. Added useAuth/useToast mocks to `FriendList.test.tsx`. 14 new tests + 46 existing friend tests pass. |
| 4 | Leaderboard Row Encourage | [COMPLETE] | 2026-03-17 | Added `showEncourage` prop to `LeaderboardRow.tsx`, hover-reveal on desktop (sm:opacity-0 group-hover:opacity-100), icon-only on mobile. `FriendsLeaderboard.tsx` passes `showEncourage`. GlobalRow untouched. 6 new tests + 51 existing pass. |
| 5 | Nudge Button + Dialog | [COMPLETE] | 2026-03-17 | Created `NudgeButton.tsx`, `NudgeDialog.tsx`. Dialog uses `useFocusTrap`, `role="alertdialog"`. Body text never mentions inactivity. Integrated into `FriendRow.tsx`. 14 new tests pass. |
| 6 | Milestone Feed + Dashboard | [COMPLETE] | 2026-03-17 | Created `MilestoneFeed.tsx` with 4 event type formatters, staggered animations, semantic `ol>li`. Replaced hardcoded `MOCK_MILESTONES` in `FriendsPreview.tsx`. Updated FriendsPreview test. 12 new + 7 existing tests pass. |
| 7 | Weekly Recap Card | [COMPLETE] | 2026-03-17 | Created `hooks/useWeeklyRecap.ts` and `components/dashboard/WeeklyRecap.tsx`. Added to `DashboardWidgetGrid.tsx` with BarChart3 icon, full-width, conditionally visible. Updated widget grid test assertion. 7 hook + 4 component tests pass. |
| 8 | useSocialInteractions Hook | [COMPLETE] | 2026-03-17 | Created `hooks/useSocialInteractions.ts` as unified hook. Refactored `EncourageButton.tsx` and `NudgeButton.tsx` to use it. Added friend existence validation in `sendEncouragement`. 8 hook tests + all 40 social component tests pass. |
