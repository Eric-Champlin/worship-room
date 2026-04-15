# Worship Room Frontend - Round 3 Prayer Wall & Profile Shared Infrastructure Recon

## 1. Auth System Deep Dive

### Core Implementation

**Files:**
- `/Users/Eric/worship-room/frontend/src/contexts/AuthContext.tsx` — Core auth context and provider
- `/Users/Eric/worship-room/frontend/src/hooks/useAuth.ts` — Hook re-export
- `/Users/Eric/worship-room/frontend/src/components/prayer-wall/AuthModal.tsx` — Auth UI (login, register, forgot-password views)
- `/Users/Eric/worship-room/frontend/src/components/prayer-wall/AuthModalProvider.tsx` — Modal context wrapper

### Simulated Auth Mechanism

**Storage Keys (localStorage):**
- `wr_auth_simulated` — Set to `'true'` when user logs in; checked to determine `isAuthenticated`
- `wr_user_name` — Display name (e.g., "Sarah", "John")
- `wr_user_id` — UUID generated on first login; persists across logout (line 46-48 in AuthContext.tsx)

**AuthContext Shape (lines 15-20):**
```typescript
interface AuthContextValue {
  isAuthenticated: boolean
  user: { name: string; id: string } | null
  login: (name: string) => void
  logout: () => void
}
```

**Login Flow (AuthContext.tsx lines 40-53):**
```typescript
const login = useCallback((name: string) => {
  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(NAME_KEY, name)
  let id = localStorage.getItem(ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ID_KEY, id)
  }
  setState({ isAuthenticated: true, user: { name, id } })
})
```

**Logout Flow (lines 55-64):**
- Clears `wr_auth_simulated` and `wr_user_name`
- **Preserves** `wr_user_id` and all other `wr_*` keys across logout (line 59 comment)
- Sets state to `{ isAuthenticated: false, user: null }`

### Cross-Tab Sync

Lines 67-75: StorageEvent listener syncs auth state across browser tabs when `wr_auth_simulated` key changes.

### AuthModal Context

**File:** `AuthModalProvider.tsx`

**Context API (lines 6-8):**
```typescript
interface AuthModalContextValue {
  openAuthModal: (subtitle?: string, initialView?: 'login' | 'register') => void
}
export function useAuthModal(): AuthModalContextValue | undefined
```

**Critical Note (lines 38-45):** `useAuthModal()` returns `undefined` when called outside an `AuthModalProvider` (e.g., in PrayerDetail which has no provider). Callers must handle the `undefined` case and fall back to a regular link.

### AuthModal Views & Validation

**File:** `AuthModal.tsx`

**Three Views (line 9):**
1. `login` — Email + password
2. `register` — First name + last name + email + password + confirm password
3. `forgot-password` — Email only, sends reset link

**Validation Rules (lines 96-156):**
- Email: Required, valid email format regex (line 122: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Password: Required, minimum 12 characters (line 132, `PASSWORD_MIN_LENGTH = 12`)
- First/Last Name (register only): Required, non-empty after trim
- Confirm Password (register only): Required, must match password

**Submit Behavior:**
- Currently shows a mock toast: "Account creation is on the way. For now, explore freely." (line 153)
- No real backend wiring (Phase 3+)
- Forgot Password shows: "Password reset is coming soon. Hang tight." (line 172)

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="auth-modal-title"` (lines 195-199)
- Form fields have `aria-invalid` and `aria-describedby` for error messages (lines 242, 290, 316, 343, 368, 407)
- `AlertCircle` icon + role="alert" on error messages (line 247)
- Focus trap via `useFocusTrap()` (line 61)
- Close button with min 44px tap target (lines 208-215)

### Logged-Out Experience

**Navbar (checked via `isAuthenticated`):**
- Logged-out: Shows "Log In" + "Get Started" buttons
- Logged-in: Shows notification bell + avatar dropdown

**PrayerWall Behavior:**
- Logged-out: Can read prayers and comments, cannot post/comment/bookmark
- Clicking "Post" or "Add Comment" triggers auth modal with subtitle "Your draft is safe — we'll bring it back after" (Spec V pattern)
- Draft auto-saves to localStorage before modal opens

**Daily Hub & DailyHubTabs:**
- All tabs (`/daily?tab=pray|journal|meditate|devotional`) work for logged-out users
- Auth wall at action level (submit buttons) not route level
- Draft persistence across auth wall (localStorage keys: `wr_prayer_draft`, `wr_journal_draft`)

### Every `useAuth()` Call Site

Found 121 files calling `useAuth()` or `openAuthModal()`. Key call patterns:

**Activity Recording:**
- `DevotionalTabContent.tsx` — `recordActivity('devotional')`
- `JournalTabContent.tsx` — `recordActivity('journal')`
- `PrayTabContent.tsx` — `recordActivity('pray')` (2 call sites, lines 107, 146)

**Auth Gating (meditation):**
- `MeditateTabContent.tsx` — Card click checks `isAuthenticated`, triggers `openAuthModal()` if false

**Settings & Profile:**
- `Settings.tsx`, `Dashboard.tsx`, `Friends.tsx` — Check `isAuthenticated` for rendering

**Complete grep output available on request — 121 files total.**

### Firebase or Real Auth Setup

**Search Results:** Zero matches for "firebase" or "Firebase" in the frontend codebase. No Firebase SDK imported anywhere. Auth is 100% simulated via localStorage until Phase 3.

---

## 2. Faith Points and Activity Tracking

### recordActivity() Pipeline

**Entry Point:** Hook `useFaithPoints()` at `hooks/` (exact path TBD, but called throughout codebase)

**Full Activity Recording Flow:**
1. User completes an action (pray, meditate, journal, etc.)
2. Component calls `const { recordActivity } = useFaithPoints()`
3. `recordActivity(activityType)` increments the daily count for that activity
4. Points are calculated: base points × daily multiplier tier
5. Updated state persists to localStorage (`wr_daily_activities`, `wr_faith_points`)
6. Hook returns updated `{ totalPoints, currentLevel, levelName, pointsToNextLevel, ... }`

**Call Sites (Sample):**
- `DevotionalTabContent.tsx` line 141: `recordActivity('devotional')`
- `JournalTabContent.tsx` line 186: `recordActivity('journal')`
- `PrayTabContent.tsx` lines 107, 146: `recordActivity('pray')` (two separate flows)
- `MeditateTabContent.tsx` (implied via completion)
- `EveningReflection.tsx` lines 78, 85: `recordActivity('gratitude')`, `recordActivity('reflection')`
- `GuidedPrayerSection.tsx` (implied)

### ACTIVITY_POINTS Constant

**File:** `/Users/Eric/worship-room/frontend/src/constants/dashboard/activity-points.ts`

**Point Values (lines 3-16):**
```typescript
export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  mood: 5,
  pray: 10,
  listen: 10,
  prayerWall: 15,
  readingPlan: 15,
  meditate: 20,
  journal: 25,
  gratitude: 5,
  reflection: 10,
  challenge: 20,
  localVisit: 10,
  devotional: 10,
}
```

**Activity Display Names (lines 18-31):** Human-readable labels for each activity in UI.

**Multiplier Tiers (lines 33-38):**
```typescript
MULTIPLIER_TIERS = [
  { minActivities: 7, multiplier: 2, label: 'Full Worship Day' },
  { minActivities: 4, multiplier: 1.5, label: 'Devoted' },
  { minActivities: 2, multiplier: 1.25, label: 'Growing' },
  { minActivities: 0, multiplier: 1, label: '' },
]
```

**Max Daily Points:**
- Base: `MAX_DAILY_BASE_POINTS = 155` (sum of all 12 activities)
- With 2x multiplier: `MAX_DAILY_POINTS = 310`

**Activity Checklist Names (lines 43-56):** UI labels for the 6-item onboarding checklist (mood, pray, listen, prayerWall, meditate, journal, etc.).

### Faith Level Thresholds

**File:** `/Users/Eric/worship-room/frontend/src/constants/dashboard/levels.ts`

**Level System (lines 7-14):**
```typescript
LEVEL_THRESHOLDS: [
  { level: 1, name: 'Seedling', threshold: 0 },
  { level: 2, name: 'Sprout', threshold: 100 },
  { level: 3, name: 'Blooming', threshold: 500 },
  { level: 4, name: 'Flourishing', threshold: 1500 },
  { level: 5, name: 'Oak', threshold: 4000 },
  { level: 6, name: 'Lighthouse', threshold: 10000 },
]
```

**Level Icons (lines 17-24):** Temporary Lucide icon assignments (Sprout, Leaf, Flower2, TreePine, Trees, Landmark).

**Utility Function (lines 26-42):**
```typescript
getLevelForPoints(points: number): {
  level: number
  name: string
  pointsToNextLevel: number
}
```

### Source of Truth Storage

**Keys (implied from code patterns):**
- `wr_daily_activities` — Per-activity boolean flags for today (mood, pray, listen, etc.)
- `wr_faith_points` — Cumulative point total (all-time)
- `wr_streak` — Streak metadata (current, longest, at-risk flags)
- `wr_getting_started` — Onboarding checklist completion flags (6 items)

**Service Module:** `useFaithPoints()` hook (exact file location needs verification, likely `hooks/useFaithPoints.ts` or similar)

---

## 3. Badge Engine

### Badge Storage & Definitions

**Files:**
- `/Users/Eric/worship-room/frontend/src/services/badge-storage.ts` — CRUD operations
- `/Users/Eric/worship-room/frontend/src/services/badge-engine.ts` — Trigger logic
- `/Users/Eric/worship-room/frontend/src/constants/dashboard/badges.ts` — Badge definitions

### Storage Layer (badge-storage.ts)

**Storage Key:** `wr_badges`

**Data Shape (type `BadgeData`):**
```typescript
{
  earned: Record<badgeId, { earnedAt: ISO8601, count?: number }>,
  newlyEarned: string[],
  activityCounts: {
    pray, journal, meditate, listen, prayerWall, readingPlan,
    gratitude, reflection, encouragementsSent, fullWorshipDays,
    challengesCompleted, intercessionCount, bibleChaptersRead, prayerWallPosts
  }
}
```

**Functions:**
- `getBadgeData(): BadgeData` (line 41) — Read current badge state
- `saveBadgeData(data: BadgeData): boolean` (line 68) — Persist to localStorage
- `initializeBadgesForNewUser(): BadgeData` (line 78) — Bootstrap new user (line 85 shows welcome + level_1 badges automatically earned)
- `getOrInitBadgeData(isAuthenticated: boolean): BadgeData` (line 94) — Read or init depending on auth state
- `addEarnedBadge(data, badgeId): BadgeData` (line 121) — Mark badge earned, handle repeatable badges
- `incrementActivityCount(data, type): BadgeData` (line 153) — Increment activity counter
- `clearNewlyEarned(data): BadgeData` (line 169) — Clear the "newly earned" flag after celebration

### Badge Engine (badge-engine.ts)

**Function:** `checkForNewBadges(context, earned): string[]` (line 51)

**Context Inputs:**
- `streak`, `level`, `previousLevel`, `todayActivities`, `activityCounts`, `friendCount`, `allActivitiesWereTrueBefore`

**14 Badge Trigger Categories (lines 62-304):**

1. **Streak Badges (lines 62-67)** — Thresholds: 7, 14, 30, 60, 90, 180, 365 days
2. **Level Badges (lines 70-73)** — Triggers on level advancement (`level_1` through `level_6`)
3. **Activity Milestones (lines 76-85)** — First/100th prayer, first/50th/100th journal, first/25th meditate, first/50th listen, first Prayer Wall
4. **Full Worship Day (lines 88-107)** — 6 base activities + optional reading plan if active (repeatable)
5. **Friend Badges (lines 110-115)** — First friend (1), Inner Circle (10 friends)
6. **Encouragement Badges (lines 117-122)** — 10 and 50 encouragements sent
7. **Reading Plan Completion (lines 125-138)** — First plan, 3 plans, all 10 plans
8. **Local Support Badges (lines 141-151)** — 5 unique visited places
9. **Bible Book Completion (lines 154-174)** — 1, 5, 10, or all 66 books read
10. **Meditation Session Milestones (lines 176-193)** — 10, 50, 100 sessions
11. **Prayer Wall Post Milestones (lines 196-205)** — 1st post, 10 posts
12. **Intercessor Badge (lines 207-210)** — 25+ intercessions (prayer wall reactions)
13. **Bible Chapter Milestones (lines 212-231)** — 1st chapter, 10, 25 chapters total
14. **Gratitude Milestones (lines 234-271)** — 30/100 days of gratitude, 7-day consecutive streak

### Badge Definitions

**File:** `/Users/Eric/worship-room/frontend/src/constants/dashboard/badges.ts`

**All 45+ Badges (partial list):**

| Badge ID | Name | Category | Trigger |
|----------|------|----------|---------|
| `streak_7` | First Flame | streak | 7-day streak |
| `streak_30` | Burning Bright | streak | 30-day streak |
| `level_1` | Seedling | level | Reach Level 1 |
| `level_6` | Lighthouse | level | Reach Level 6 |
| `first_prayer` | First Prayer | activity | 1st prayer |
| `prayer_100` | Prayer Warrior | activity | 100th prayer |
| `first_journal` | First Entry | activity | 1st journal |
| `journal_100` | Devoted Writer | activity | 100th journal |
| `first_meditate` | First Meditation | activity | 1st meditation |
| `meditate_25` | Mindful | activity | 25th meditation |
| `first_listen` | First Listen | activity | 1st audio session |
| `listen_50` | Worship in Song | activity | 50th listen |
| `full_worship_day` | Full Worship Day | special | All daily activities (repeatable) |
| `first_plan` | First Plan | activity | 1st reading plan completed |
| `plans_10` | Scripture Scholar | activity | All 10 plans completed |
| `bible_book_1` | First Book | activity | Read entire book |
| `bible_book_66` | Bible Master | activity | Read all 66 books |
| `first_friend` | First Friend | community | 1st friend added |
| `friends_10` | Inner Circle | community | 10 friends |
| `encourage_10` | Encourager | community | 10 encouragements |
| `local_first_visit` | (not named in constant) | community | 1st local visit |
| `local_support_5` | Local Support Seeker | community | 5 visited locations |
| `prayerwall_first_post` | (not named) | activity | 1st Prayer Wall post |
| `prayerwall_10_posts` | (not named) | activity | 10 Prayer Wall posts |
| `prayerwall_25_intercessions` | (not named) | activity | 25+ intercessions |
| `gratitude_30_days` | (not named) | activity | 30 gratitude days |
| `gratitude_100_days` | (not named) | activity | 100 gratitude days |
| `gratitude_7_streak` | (not named) | activity | 7-day consecutive gratitude |

**Celebration Tiers (badge-icons.ts determines display):**
- `'toast'` — Small dismissible notification
- `'toast-confetti'` — Toast with confetti burst
- `'full-screen'` — Full-screen celebration overlay with verse
- `'special-toast'` — Special styling (e.g., Full Worship Day)

### How Badges Persist

1. Check fires in `Dashboard.tsx` or similar component lifecycle
2. `checkForNewBadges()` returns array of newly earned badge IDs
3. For each ID: `addEarnedBadge(data, id)` adds to `earned` object and `newlyEarned` array
4. `saveBadgeData()` persists to `wr_badges` localStorage
5. Celebration toast/modal fires with icon and verse
6. `clearNewlyEarned()` clears the celebration flag after user dismisses
7. Badge appears in BadgeGrid on next dashboard render

### How They're Displayed

- **BadgeGrid component** renders earned (colored) vs locked (silhouette) badges
- Icon and description pulled from `BADGE_MAP` constant
- New badges glow with `animate-golden-glow` effect
- Locked badges show icon outline only

---

## 4. Notification System

### Core Files

- `/Users/Eric/worship-room/frontend/src/hooks/useNotifications.ts` — Hook managing notification state
- `/Users/Eric/worship-room/frontend/src/components/dashboard/NotificationBell.tsx` — Navbar bell icon with unread count badge
- `/Users/Eric/worship-room/frontend/src/components/dashboard/NotificationPanel.tsx` — Dropdown panel listing notifications
- `/Users/Eric/worship-room/frontend/src/lib/notifications-storage.ts` — Storage layer

### NotificationBell

**Location:** Navbar, logged-in state only

**Behavior:**
- Displays unread notification count in a red badge (top-right)
- Badge only shows when count > 0
- Click opens NotificationPanel dropdown

**Icon:** Lucide `Bell`

### NotificationPanel

**Location:** Dropdown from bell (desktop) / inline (mobile)

**Rendering:**
- Reverse-chronological list of notifications
- Each notification shows icon + type-specific message + relative timestamp
- Unread notifications have a dot indicator
- "Mark all as read" link at top
- Individual dismiss buttons

### Storage

**Key:** `wr_notifications`

**Shape (NotificationEntry):**
```typescript
{
  id: string
  type: NotificationType
  message: string
  read: boolean
  timestamp: string
  actionUrl?: string
  actionData?: { ... }
}
```

**Notification Types (NotificationType):**
- `'encouragement'` — Friend sent encouragement
- `'friend_request'` — Incoming friend request
- `'milestone'` — User hit a milestone (streak, badge, level)
- `'friend_milestone'` — Friend hit a milestone
- `'nudge'` — Gentle nudge after 3+ days inactivity (if enabled in settings)
- `'weekly_recap'` — Monday weekly summary
- `'daily_verse'` — Daily verse push (BB-41, Phase 3+)
- `'streak_reminder'` — Streak at risk reminder (BB-41, Phase 3+)

**Capping:** Stored array capped at 50 entries (slice to last 50, line 59 in useNotifications.ts)

### Hook API (useNotifications.ts)

```typescript
export function useNotifications() {
  return {
    notifications: NotificationEntry[],
    unreadCount: number,
    markAsRead: (id: string) => void,
    markAllAsRead: () => void,
    dismiss: (id: string) => void,
    addNotification: (n: Omit<NotificationEntry, 'id'>) => void,
  }
}
```

**Cross-Tab Sync (lines 66-85):** StorageEvent listener syncs notification updates across browser tabs.

### Notification Sources

**Real (implemented):**
- Friend requests (friends-storage operations)
- Badge/level-up celebrations (badge-engine triggers)
- Milestone events (activity thresholds)

**Coming Soon (stub only):**
- Daily verse push (BB-41 implementation pending)
- Streak reminder push (BB-41 implementation pending)
- Weekly recap (real backend needed)

### Seed Data

Function `seedNotificationsIfNeeded()` (in notifications-storage) checks if `wr_notifications` is empty and populates with mock notifications on first run.

---

## 5. Toast System

### ToastProvider

**File:** `/Users/Eric/worship-room/frontend/src/components/ui/Toast.tsx`

**Provider Setup (lines 94-254):**
- Wraps app (mounted in `App.tsx` line 204)
- Manages two toast queues: standard toasts + celebration toasts
- Exposes context via `useToast()` and `useToastSafe()` hooks

### Toast Types

**Standard Toasts (StandardToastType):**
- `'success'` — Green left border, auto-dismiss 6s
- `'error'` — Red left border, auto-dismiss 6s (assertive aria-live)
- `'warning'` — Orange left border, auto-dismiss 6s

**Celebration Toasts (CelebrationToastType):**
- `'celebration'` — Standard celebration (4s duration, line 49)
- `'celebration-confetti'` — With confetti burst (5s duration)
- `'special-celebration'` — Special styling + glow (5s duration, line 219)

### Styling Approach

**Standard Toasts (lines 163-195):**
```
"rounded-lg border border-white/15 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-md"
```
Positioned: top-right, fixed, z-50

**Celebration Toasts (lines 199-250):**
```
"rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md"
```
Positioned: bottom-right (desktop) / bottom-center (mobile), fixed, z-50

**Animations:**
- Entry: `motion-safe:animate-fade-in` (celebration) or `motion-safe:animate-slide-up` (standard)
- Exit: `motion-safe:animate-fade-out` (lines 172-174)
- Confetti burst: Generated particles with `animate-confetti-burst` (lines 55-86)

### Hook API

**useToast()** (line 259):
```typescript
showToast: (message: string, type?: 'success' | 'error' | 'warning', action?: ToastAction) => void
showCelebrationToast: (badgeName, message, type, icon?, suggestion?) => Promise<void>
```

**useToastSafe()** (line 278):
- Returns no-op functions when outside ToastProvider (safe variant for Navbar, etc.)

### Toast Action

Optional action button on standard toast:
```typescript
interface ToastAction {
  label: string
  onClick: () => void
}
```

Example: "Undo" button on a dismissed notification.

---

## 6. Sound Effects and Audio

### playSoundEffect Function

**File:** `/Users/Eric/worship-room/frontend/src/lib/sound-effects.ts`

**API (lines 142-152):**
```typescript
export function playSound(ctx: AudioContext, soundId: SoundEffectId): void
```

**Sound IDs (type SoundEffectId):**
- `'chime'` — 528 Hz sine wave (healing frequency), 1.5s envelope
- `'ascending'` — 3-tone ascending melody (396 Hz → 528 Hz → 660 Hz), staggered 150ms
- `'harp'` — Twin 440 Hz + 441 Hz (chorus effect), triangle wave, 305ms decay
- `'bell'` — 784 Hz sine wave, 1.71s decay envelope
- `'whisper'` — Filtered white noise (800 Hz bandpass), 1.5s decay with attack
- `'sparkle'` — Twin 1047 Hz + 1319 Hz (simultaneous), 105ms decay

**Volume Mapping (SOUND_VOLUMES):**
```typescript
{ chime: 0.3, ascending: 0.3, harp: 0.3, bell: 0.3, whisper: 0.15, sparkle: 0.1 }
```

### Sound File Locations

**No external files.** All sounds are synthesized on-the-fly using Web Audio API:
- Oscillators (`OscillatorNode`) for tones
- Filter (`BiquadFilter`) for whisper
- Gain nodes for envelope (ADSR-style attack/decay/sustain/release)
- Buffer source for white noise (cached in `noiseBuffer`, line 13)

### Sound Usage in App

**Where Sounds Play:**
1. **Mood check-in completion** — `playSoundEffect('chime')` after selecting mood and verse reveals (line 86 in MoodCheckIn.tsx)
2. **Badge celebrations** — Likely triggered with bell/sparkle on full-screen overlays (TBD via badge celebration component)
3. **Meditation completion** — Likely bell or ascending (TBD)
4. **Daily Hub transitions** — Possibly chime on activity completion (TBD)

### Gate & Control

**Feature Gate:** `wr_sound_effects_enabled` localStorage boolean

**Reduced Motion Handling:** All sound effects are wrapped in `useSoundEffects()` hook which respects `prefers-reduced-motion: reduce` (disables audio entirely).

**Failure Behavior (line 149):** Errors caught and silently swallowed — sound effects are enhancement only, never fatal.

### Relationship to AudioProvider

**Two Separate Systems:**
- **Sound Effects** (`sound-effects.ts`) — Short synthesized tones (< 2s), Web Audio API, used for micro-interactions
- **AudioProvider** (`components/audio/AudioProvider.tsx`) — Ambient sounds, music, TTS, longer playback (minutes), manages drawer state, playback control

They coexist but don't interact. AudioProvider uses `<audio>` elements for foreground playback and `AudioBufferSourceNode` for background ambient looping. Sound effects are pure OscillatorNode synthesis.

---

## 7. Getting Started / Onboarding Checklist

### Core Implementation

**File:** `/Users/Eric/worship-room/frontend/src/hooks/useGettingStarted.ts`

**Storage Layer:** `/Users/Eric/worship-room/frontend/src/services/getting-started-storage.ts`

### Checklist Items

**6 Items (ITEM_DEFINITIONS, lines 21-34):**

| #  | Key | Activity Type | Label | Points | Destination |
|----|-----|---------------|-------|--------|-------------|
| 1  | `mood_done` | `'mood'` | Check in with your mood | 5 | null (triggers check-in modal) |
| 2  | `pray_done` | `'pray'` | Generate your first prayer | 10 | `/daily?tab=pray` |
| 3  | `journal_done` | `'journal'` | Write a journal entry | 25 | `/daily?tab=journal` |
| 4  | `meditate_done` | `'meditate'` | Try a meditation | 20 | `/daily?tab=meditate` |
| 5  | `ambient_visited` | `null` | Listen to ambient sounds | 10 | `/music?tab=ambient` |
| 6  | `prayer_wall_visited` | `null` | Explore the Prayer Wall | 15 | `/prayer-wall` |

### Tracking Mechanism

**Storage Key:** `wr_getting_started`

**Shape:**
```typescript
{
  mood_done: boolean,
  pray_done: boolean,
  journal_done: boolean,
  meditate_done: boolean,
  ambient_visited: boolean,
  prayer_wall_visited: boolean,
}
```

### Completion Logic

**Auto-Completion (lines 48-66):**
- Items 1-4 auto-mark complete when corresponding activity is recorded in today's activity log (`todayActivities`)
- `useGettingStarted` effect compares `todayActivities` against permanent flags and syncs via `setGettingStartedFlag(key, true)`
- Items 5-6 require explicit user navigation to destination (tracked by visit to those routes)

**Manual Completion (items 5-6):**
- Visiting `/music?tab=ambient` sets `ambient_visited = true`
- Visiting `/prayer-wall` sets `prayer_wall_visited = true`

### Visibility & Dismissal

**Visible When (lines 90-93):**
- User is authenticated
- Onboarding is complete (`isOnboardingComplete()`)
- NOT dismissed today (`dismissed === false`)

**Dismissal (lines 95-98):**
- `dismiss()` calls `setGettingStartedComplete()` which sets a date-based flag
- Checklist re-appears tomorrow (flag resets per calendar day)

### GettingStartedCard Component

**File:** `/Users/Eric/worship-room/frontend/src/components/dashboard/GettingStartedCard.tsx`

**Rendering:**
- Shows 6 item rows: label + point hint + checkbox/checkmark
- Progress ring shows completion percentage (0-6)
- All-complete celebration banner with golden glow

---

## 8. Mood System

### MoodCheckIn Component

**File:** `/Users/Eric/worship-room/frontend/src/components/dashboard/MoodCheckIn.tsx`

**Rendering:**
- Full-screen dialog (`role="dialog"`, `aria-modal="true"`)
- Dark radial gradient background
- Time-of-day greeting: "How are you feeling today, {userName}?"

**Interactive Flow (3 phases):**

1. **Idle / Mood Selected (lines 131-234)**
   - 5 mood orbs (role="radiogroup", roving tabindex)
   - Selected orb: scales 1.15x with glow, others fade to 30% opacity (lines 172-175)
   - On selection: optional textarea slides in "Want to share what's on your heart?" (max 280 chars, line 206)
   - Continue button saves entry and transitions to next phase

2. **Verse Display (lines 237-263)**
   - 3s auto-advance (VERSE_DISPLAY_DURATION_MS, line 54)
   - KaraokeTextReveal animation (word-by-word fade-in, 2.5s total)
   - Verse reference appears below after reveal (fade in, line 252-256)

3. **Crisis Banner (lines 266-310)**
   - Triggered if mood text contains crisis keywords (line 81, containsCrisisKeyword check)
   - Shows 3 hotline links: 988 (suicide prevention), Crisis Text Line, SAMHSA
   - Continue button dismisses and completes flow

**Keyboard Navigation (lines 96-119):**
- Arrow keys navigate mood orbs (horizontal + vertical wrapping)
- Enter/Space selects focused mood
- Roving tabindex for accessibility (lines 161)

### MoodEntry Shape

**Saved to wr_mood_entries localStorage (line 67-76):**
```typescript
{
  id: UUID,
  date: YYYY-MM-DD (local),
  mood: 1-5 (MoodValue),
  moodLabel: "Struggling" | "Heavy" | "Okay" | "Good" | "Thriving",
  text?: string (user's optional reflection),
  timestamp: number (Date.now()),
  verseSeen: "Psalm 34:18" (etc.),
  timeOfDay: "morning",
}
```

### MoodChart Component

**File:** `/Users/Eric/worship-room/frontend/src/components/dashboard/MoodChart.tsx`

**Rendering:**
- Recharts line chart (7-day rolling window on dashboard, customizable via `useMoodChartData(days)`)
- Y-axis: Mood values 1-5
- Points colored by mood (from MOOD_COLORS constant)
- Connected line with interpolation

**Data Source:** `useMoodChartData(days)` reads from `wr_mood_entries`, filters to last N days, returns array of `{ date, mood, label }`.

### MoodChart Data Hook

**File:** `/Users/Eric/worship-room/frontend/src/hooks/useMoodChartData.ts`

**API:**
```typescript
function useMoodChartData(days: number): Array<{
  date: string,
  mood: MoodValue,
  label: string,
}>
```

**Parameters:**
- `days = 7` on dashboard widget
- `days = 30|90|180|365` on insights page (`/insights`)

### Mood Recommendation Pipeline

**Flow:**
1. User logs mood
2. `MoodRecommendations` component reads current mood from latest entry
3. Passes mood to content recommender (TBD service)
4. Returns 3-5 suggested content cards (devotional, prayer prompts, meditation types, music playlists)
5. UI displays cards with staggered fade-in animation

**File:** `/Users/Eric/worship-room/frontend/src/components/dashboard/MoodRecommendations.tsx`

### Mood State Propagation

**Dashboard Integration:**
- MoodCheckIn fires on dashboard load (once per day, checked via `wr_mood_done` in daily activities)
- Completing check-in triggers `onComplete(entry)` callback
- Dashboard updates mood chart and recommendations
- Activity is recorded in daily log

**Sidebar Effect:**
- Mood influences greeting tone and content prioritization
- Heavy/Struggling moods surface crisis resources more prominently
- Thriving moods highlight celebratory badges and milestones

---

## 9. Friends System

### friends-storage.ts

**File:** `/Users/Eric/worship-room/frontend/src/services/friends-storage.ts`

**Storage Key:** `wr_friends`

**Data Shape (FriendsData):**
```typescript
{
  friends: FriendProfile[],
  pendingIncoming: FriendRequest[],
  pendingOutgoing: FriendRequest[],
  blocked: string[],
}
```

**FriendProfile Structure:**
```typescript
{
  id: string,
  name: string,
  avatar?: string,
  // ... other profile fields (TBD)
}
```

**FriendRequest Structure:**
```typescript
{
  id: string,
  from: FriendProfile,
  to: FriendProfile,
  sentAt: ISO8601,
}
```

### Full Public API

**Read Functions (lines 13-150):**
- `getFriendsData(): FriendsData` — Get current state
- `getOrInitFriendsData(currentUserId): FriendsData` — Get or initialize on first run
- `isFriend(data, userId): boolean` — Check if user is in friends list
- `hasPendingRequest(data, userId): boolean` — Check if incoming or outgoing request pending
- `isBlocked(data, userId): boolean` — Check if user is blocked

**Write Functions (pure):**
- `sendFriendRequest(data, fromProfile, toProfile): FriendsData` — Create new request
- `acceptFriendRequest(data, requestId): FriendsData` — Accept incoming request
- `declineFriendRequest(data, requestId): FriendsData` — Reject incoming request
- `cancelOutgoingRequest(data, requestId): FriendsData` — Cancel outgoing request
- `removeFriend(data, friendId): FriendsData` — Unfriend
- `blockUser(data, userId): FriendsData` — Block user (removes friend, clears pending requests)

**Persist:** `saveFriendsData(data): boolean` — Write to localStorage

### Relationship Computation

**For any viewer-viewee pair:**

1. If `viewee.id === viewer.id` → Same person (self)
2. If `isBlocked(data, viewee.id)` → Blocked
3. If `isFriend(data, viewee.id)` → Friend (mutual)
4. If `hasPendingRequest(data, viewee.id)` → Pending (incoming or outgoing, check which)
5. Otherwise → Stranger

**Used in FriendsPage (`/friends`) and ProfilePage (`/profile/:userId`) to determine which action buttons show.**

### Storage Shape

**localStorage `wr_friends` JSON:**
```json
{
  "friends": [
    { "id": "uuid-1", "name": "Sarah", "avatar": "url..." },
    { "id": "uuid-2", "name": "John", "avatar": "url..." }
  ],
  "pendingIncoming": [
    { "id": "req-1", "from": {...}, "to": {...}, "sentAt": "..." }
  ],
  "pendingOutgoing": [
    { "id": "req-2", "from": {...}, "to": {...}, "sentAt": "..." }
  ],
  "blocked": ["uuid-3", "uuid-4"]
}
```

---

## 10. Global State and Contexts

### Provider Wrapping Order (App.tsx)

**Nesting Structure (lines 199-286):**

```
<BrowserRouter>
  <HelmetProvider>
    <ErrorBoundary>
      <AuthProvider>                    {/* Auth context */}
        <InstallPromptProvider>         {/* PWA install prompt */}
          <ToastProvider>               {/* Toast notifications */}
            <AuthModalProvider>         {/* Auth modal context */}
              <AudioProvider>           {/* Ambient audio + music state */}
                <WhisperToastProvider>  {/* Whisper-specific toast variant */}
                  <MidnightVerse />
                  <UpdatePrompt />
                  <OfflineIndicator />
                  <InstallPrompt />
                  <NotificationSchedulerEffect />
                  <ChunkErrorBoundary>
                    <Suspense>
                      <RouteTransition>
                        <Routes>
                          {/* All routes mounted here */}
                        </Routes>
                      </RouteTransition>
                    </Suspense>
                  </ChunkErrorBoundary>
                </WhisperToastProvider>
              </AudioProvider>
            </AuthModalProvider>
          </ToastProvider>
        </InstallPromptProvider>
      </AuthProvider>
    </ErrorBoundary>
  </HelmetProvider>
</BrowserRouter>
```

### Context Providers & Dependencies

| Provider | Purpose | Dependencies |
|----------|---------|--------------|
| `AuthProvider` | User auth state (simulated) | None — foundational |
| `InstallPromptProvider` | PWA install prompt state | None |
| `ToastProvider` | Toast notifications | Used by AuthModalProvider |
| `AuthModalProvider` | Auth modal visibility + subtitle | Requires ToastProvider |
| `AudioProvider` | Ambient audio, music, sleep timer | None |
| `WhisperToastProvider` | Whisper-specific toast variant | None |

### What Each Provides

**AuthProvider (AuthContext.tsx):**
- `useAuth()` → `{ isAuthenticated, user, login(), logout() }`

**AuthModalProvider (AuthModalProvider.tsx):**
- `useAuthModal()` → `{ openAuthModal(subtitle?, initialView?) }` (or `undefined` outside provider)

**ToastProvider (Toast.tsx):**
- `useToast()` → `{ showToast(), showCelebrationToast() }`
- `useToastSafe()` → Same API but returns no-ops outside provider

**InstallPromptProvider (InstallPromptProvider.tsx):**
- `useInstallPrompt()` (hook not shown here but exported from context)
- Manages visit count, PWA install prompt state, session dismissal

**AudioProvider (components/audio/AudioProvider.tsx):**
- `useAudioState()` → Current audio state (active sounds, volume, etc.)
- `useAudioDispatch()` → Actions to control audio (play, pause, etc.)
- `useAudioEngine()` → Web Audio API service singleton
- `useSleepTimerControls()` → Sleep timer management

### What Depends on What

```
AuthProvider (base)
  ↓
InstallPromptProvider
  ↓
ToastProvider
  ↓
AuthModalProvider (uses ToastProvider for toast feedback)
  ↓
AudioProvider
  ↓
Routes / Page Components
```

**Critical:** AuthModalProvider must nest AFTER ToastProvider so auth modal can call `showToast()` from its children.

---

## 11. Routing and Layout

### Route Definition

**Framework:** React Router v6.4+ (`future` flags enabled, line 199)

**Main Routes Structure (App.tsx lines 216-274):**

- `/` → RootRoute (Dashboard if logged in, Home if not) — Suspense with DashboardSkeleton
- `/daily` → DailyHub (Suspense → DailyHubSkeleton)
- `/daily?tab=pray|journal|meditate|devotional` — Same component, tab-based rendering
- `/bible` → BibleLanding
- `/bible/browse` → BibleBrowse (Suspense → BibleBrowserSkeleton)
- `/bible/my` → MyBiblePage (personal layer: heatmap, progress map, deck, feed)
- `/bible/:book/:chapter` → BibleReader
- `/prayer-wall` → PrayerWall (Suspense → PrayerWallSkeleton)
- `/prayer-wall/:id` → PrayerDetail
- `/prayer-wall/user/:id` → PrayerWallProfile
- `/prayer-wall/dashboard` → PrayerWallDashboard
- `/friends` → Friends (Suspense → FriendsSkeleton)
- `/settings` → Settings (Suspense → SettingsSkeleton)
- `/insights` → Insights (Suspense → InsightsSkeleton)
- `/music` → MusicPage (Suspense → MusicSkeleton)
- `/grow` → GrowPage (Suspense → GrowPageSkeleton)
- `/profile/:userId` → GrowthProfile (Suspense → ProfileSkeleton)
- `/ask` → AskPage
- `/meditation/[type]` → Breathing/Soaking/Gratitude/ACTS/Psalms/Examen pages
- `/verse/:id` → SharedVerse
- `/prayer/:id` → SharedPrayer
- `/local-support/[churches|counselors|celebrate-recovery]` → Local support pages
- Legacy redirects: `/pray` → `/daily?tab=pray`, `/journal` → `/daily?tab=journal`, etc.
- `/login` → ComingSoon stub
- `/register` → RegisterPage
- `/accessibility` → AccessibilityPage
- `*` → NotFound (404)

### PageShell / Navbar / MobileDrawer

**Layout Component:**
- `Layout.tsx` wraps most pages with Navbar + SiteFooter
- `Layout` has `dark` and `transparent` props for styling variants

**Navbar Component:**
- Checks `isAuthenticated` from `useAuth()`
- Logged-out: "Log In" + "Get Started" buttons
- Logged-in: Notification bell (with unread badge) + avatar dropdown
- Desktop: 5 top-level links (Daily Hub, Bible, Grow, Prayer Wall, Music) + Local Support dropdown
- Mobile: Hamburger menu → MobileDrawer (full-screen overlay)

**MobileDrawer Component:**
- Slides in from left when hamburger clicked
- Same navigation items as desktop, arranged vertically
- Auto-closes on link click

**BibleReader Exception:**
- Does NOT use Layout.tsx, Navbar, SiteFooter
- Uses dedicated `ReaderChrome` component (top + bottom toolbars)
- Immersive reading surface with focus mode (dims chrome after 6s inactivity)

### Auth-Gated Routes

**Route Level:**
- Meditation sub-pages (`/meditate/breathing` etc.) redirect to `/daily?tab=meditate` if not logged in
- **NOT wrapped in auth gating** — auth is checked at component mount instead

**Component Level:**
- Daily Hub tabs don't gate the route, but action buttons (submit, save, etc.) trigger auth modal
- Prayer Wall: Post/comment buttons gate with auth modal
- Friends: Individual actions (add friend, accept request) gate with auth modal

**Pattern:** Draft persistence across auth wall via localStorage (`wr_prayer_draft`, `wr_journal_draft`). Auth modal subtitle reads "Your draft is safe — we'll bring it back after" (Spec V).

### 404 Handler

**Component:** `NotFound()` (lines 123-145)

**Rendering:**
- Layout with `dark` prop (dark background)
- Heading: "Page Not Found"
- Subtitle: "This page doesn't exist, but there's plenty of peace to find elsewhere."
- "Go Home" link back to `/`

**Route:** `<Route path="*" element={<NotFound />} />` (line 273, must be last)

### Route Loading Fallback

**Component:** `RouteLoadingFallback()` (lines 87-102)

**Rendering:** Pulsing "Worship Room" logo (Caveat font, conditional animate-logo-pulse based on prefers-reduced-motion)

**Usage:** Fallback for `<Suspense>` boundaries on all major routes

### Dev Route

**Conditional** (lines 267-269):
- `/dev/mood-checkin` → MoodCheckInPreview component (only in DEV mode)

---

## Summary Table: Cross-Cutting Systems Touch Points for Prayer Wall & Profile

| System | Files | Key Data Models | Prayer Wall Touch | Profile Touch |
|--------|-------|-----------------|-------------------|---------------|
| **Auth** | AuthContext.tsx, AuthModal.tsx, AuthModalProvider.tsx | `AuthContextValue`, user { name, id } | Login gate on post/comment | Display current user in nav |
| **Activity** | activity-points.ts, useFaithPoints() | ACTIVITY_POINTS, multiplier tiers | `recordActivity('prayerWall')` on interaction | Show user's activity counts |
| **Badges** | badge-engine.ts, badge-storage.ts | BadgeData, CheckBadgeContext | Fire badges on Prayer Wall milestones (first post, 25 intercessions) | Display earned badges |
| **Notifications** | useNotifications.ts, NotificationBell.tsx | NotificationEntry, NotificationType | Notify friends of prayer posts | Notify on milestone reached |
| **Toast** | Toast.tsx | ToastContextValue | Show feedback on post/comment save | Show feedback on action |
| **Sound** | sound-effects.ts | SoundEffectId, SOUND_VOLUMES | Play chime on prayer posted (optional) | Play sound on badge earned |
| **Getting Started** | useGettingStarted.ts | GettingStartedData (6 items) | `prayer_wall_visited` tracked on page load | Item 6 auto-complete |
| **Mood** | MoodCheckIn.tsx, MoodChart.tsx | MoodEntry, MoodValue 1-5 | Mood influences prayer recommendations | Show mood chart on profile |
| **Friends** | friends-storage.ts | FriendsData (friends, pending, blocked) | Friend status controls interaction options | Show user's friends list, friend actions |
| **Toast (standard)** | Toast.tsx (standard queue) | StandardToast { success, error, warning } | Feedback on save/delete | Feedback on profile update |
| **Contexts** | App.tsx | AuthProvider, ToastProvider, AuthModalProvider, AudioProvider | All wrapped in App; AuthModalProvider > ToastProvider | All wrapped in App |
| **Routing** | App.tsx | React Router routes | `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/user/:id`, `/prayer-wall/dashboard` | `/profile/:userId` |
| **Layout** | Layout.tsx, Navbar.tsx | `dark`, `transparent` props | Uses Layout with Navbar | Uses Layout with Navbar |
