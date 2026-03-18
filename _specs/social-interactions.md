# Feature: Social Interactions

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_social_interactions` and `wr_milestone_feed`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider`, navbar logged-in state, `DashboardCard` component; Spec 5 (Streak & Faith Points Engine) provides `useFaithPoints()` and activity data; Spec 6 (Dashboard Widgets + Activity Integration) provides the "Friends & Leaderboard Preview" dashboard widget which houses the milestone feed; Spec 9 (Friends System) provides `wr_friends` data, friend list rows, friend profile pages, and `FriendProfile` type; Spec 10 (Leaderboard) provides leaderboard rows where "Encourage" button appears; Spec 12 (Notification System) consumes the notifications this spec generates; Spec 13 (Settings & Privacy) provides privacy toggles that control nudge receiving
- Shared constants: Level thresholds and names from `dashboard/levels.ts`; encouragement presets from `dashboard/encouragements.ts`
- Shared utilities: `getLocalDateString()` from `utils/date.ts` (Spec 1); `getCurrentWeekStart()` from `utils/date.ts` (Spec 5); `useToast()` from Toast system (Spec 8 extended); `timeAgo()` from `lib/time.ts`

---

## Overview

Social Interactions bring warmth and human connection to Worship Room's growth system. This feature adds four interconnected capabilities: quick-tap encouragements that let friends send preset spiritual affirmations, a milestone feed that celebrates community achievements, gentle nudges that re-engage inactive friends with love, and a weekly community recap that summarizes group activity. Together these features transform the dashboard from a solo tracking tool into a shared journey — reinforcing the "gentle gamification" philosophy of celebrating presence without punishing absence.

Every interaction in this spec generates a notification entry for Spec 12's notification system, ensuring the social layer integrates seamlessly with the notification bell and panel.

---

## User Stories

- As a **logged-in user**, I want to send a quick encouragement to a friend so that they know I'm thinking of them on their faith journey.
- As a **logged-in user**, I want to see what milestones my friends have reached so that I can celebrate their progress and feel inspired.
- As a **logged-in user**, I want to gently nudge a friend who hasn't been active so that they feel remembered and loved, not judged.
- As a **logged-in user**, I want to see a weekly summary of my community's spiritual activity so that I feel part of something bigger than myself.

---

## Requirements

### 1. Quick-Tap Encouragements

**Location**: "Encourage" button appears in three places:
- Friend list rows on the `/friends` page (Spec 9)
- Leaderboard rows on the `/friends?tab=leaderboard` page (Spec 10, Friends board only — not Global board)
- Profile pages at `/profile/:userId` (Spec 14 — button placement defined here, profile page built later)

**Button appearance:**
- Small button with a heart icon (Lucide `Heart`) and text "Encourage"
- Sits alongside the existing three-dot menu on friend list rows
- On leaderboard rows, appears on hover (desktop) or as a secondary action (mobile)
- On profile pages, appears below the user header area (exact placement deferred to Spec 14)

**Popover flow:**
1. Tap "Encourage" button → popover appears anchored to the button
2. Popover displays 4 preset messages in a vertical list:
   - "Praying for you"
   - "Keep going!"
   - "Proud of you"
   - "Thinking of you"
3. Each option is a tappable row in the popover
4. Tap an option → popover closes → interaction stored → success toast → notification generated for recipient

**Success toast messages:**
- "Encouragement sent to [Name]!" (brief, warm)

**Rate limiting:**
- 3 encouragements per friend per day
- Cooldown resets at midnight local time (uses `getLocalDateString()`)
- When limit reached: "Encourage" button becomes disabled with tooltip/title "You've encouraged [Name] 3 times today"
- The 3/day limit is per-friend — a user can encourage 3 different friends 3 times each (9 total) in a day

**Storage:**
- Stored in `wr_social_interactions` localStorage key
- Each interaction: `{ id, type: 'encouragement', fromUserId, toUserId, message, timestamp }`
- Cooldown tracking: keyed by `toUserId + date` → count

**Notification generated:**
- Type: `encouragement`
- Message: "[Name] sent: [preset message]" (e.g., "Sarah sent: Praying for you")
- Stored in `wr_notifications` for recipient (mock — same localStorage since no real users)

### 2. Milestone Feed

**Location**: Compact activity stream displayed in the dashboard "Friends & Leaderboard Preview" widget, below the leaderboard top-3 section (Spec 10 placed hardcoded milestone data here — this spec replaces it with the full feed system).

**Feed content:**
- Shows recent friend achievements as a scrollable list
- Each entry: small avatar (24px, circular, initials fallback) + event text + relative timestamp
- Most recent events first
- Dashboard widget shows the 3 most recent events with a "View all" expandable or link

**Event types and display format:**

| Event Type | Display Format | Example |
|------------|---------------|---------|
| `streak_milestone` | "[Name] hit a [N]-day streak!" | "Sarah hit a 30-day streak!" |
| `level_up` | "[Name] leveled up to [Level]!" | "James leveled up to Blooming!" |
| `badge_earned` | "[Name] earned [Badge Name]!" | "Grace earned Burning Bright!" |
| `points_milestone` | "[Name] reached [N] Faith Points!" | "Joshua reached 12,000 Faith Points!" |

**Mock data:**
- 10-15 pre-seeded mock events in `wr_milestone_feed`
- Events reference the mock friends from Spec 9 (Sarah M., James K., Maria L., etc.)
- Timestamps spread across the last 7 days
- Include a variety of event types

**Event data model:**
```
MilestoneEvent {
  id: string
  type: 'streak_milestone' | 'level_up' | 'badge_earned' | 'points_milestone'
  userId: string         // Friend who achieved the milestone
  displayName: string
  avatar: string
  detail: string         // e.g., "30" for streak, "Blooming" for level, badge name
  timestamp: string      // ISO timestamp
}
```

**Feed cap:** Maximum 20 events stored in `wr_milestone_feed`. When a new event would exceed 20, remove the oldest event. FIFO.

**Notification generated for each event:**
- Type: `friend_milestone`
- Message: Same as the display format (e.g., "Sarah hit a 30-day streak!")

### 3. Nudges

**Location**: "Send a nudge" button appears on friend list rows for friends whose `lastActive` timestamp is 3+ days ago.

**Eligibility:**
- Friend's `lastActive` is 3 or more days in the past
- The current user has not nudged this friend in the last 7 days (1/week limit)
- The recipient has not disabled nudges in their privacy settings (Spec 13 — `nudgePermission` setting; for this spec, assume all mock friends accept nudges unless their privacy data says otherwise)

**Button appearance:**
- Subtle text button: "Send a nudge" with a small heart icon (Lucide `Heart`)
- Appears below or beside the friend's "last active" text (which already shows "Active 5d ago" etc.)
- Muted styling — not attention-grabbing, feels gentle

**Flow:**
1. Tap "Send a nudge" → confirmation dialog appears
2. Dialog content:
   - Title: "Send a nudge"
   - Body: "Let [Name] know you're thinking of them. They'll receive a gentle reminder."
   - Two buttons: "Send" (primary) and "Cancel" (secondary)
   - Dialog does NOT mention how long the friend has been inactive (never shame absence)
3. Confirm → nudge stored → button changes to "Nudge sent" (disabled) → success toast
4. Notification generated for recipient

**Success toast:** "Nudge sent to [Name]"

**Recipient notification:**
- Type: `nudge`
- Message: "[Name] is thinking of you" (e.g., "Sarah is thinking of you")
- Tone: warm and loving, never mentions inactivity or absence

**Rate limiting:**
- 1 nudge per friend per 7-day rolling window
- Tracked in `wr_social_interactions` by `toUserId` + `type: 'nudge'` + `timestamp`
- After nudging, the "Send a nudge" button changes to "Nudge sent" with a disabled state
- Button remains disabled until 7 days have passed since the last nudge to that friend

**Privacy integration (Spec 13):**
- Spec 13 adds a "Who can send nudges" privacy setting with options: "Everyone" / "Friends" / "Nobody"
- For this spec, the setting is read from `wr_settings` if it exists. If `nudgePermission === 'nobody'`, the "Send a nudge" button does not appear for that friend.
- Default behavior (no settings yet): nudges are enabled for all friends

**Storage:**
- Nudge interactions stored in `wr_social_interactions`: `{ id, type: 'nudge', fromUserId, toUserId, timestamp }`

### 4. Weekly Community Recap

**Trigger**: Generated client-side, displayed as a dashboard card every Monday.

**Content:**
```
Last week, your friend group:
  - Prayed 23 times
  - Journaled 15 entries
  - Completed 8 meditations
  - Spent 12 hours in worship music
You contributed 34% of the group's growth!
```

**Computation:**
- Computed from mock friend data (since real activity data for friends doesn't exist)
- The "You contributed X%" is computed from the current user's actual `wr_daily_activities` relative to the mock totals
- Stats are fixed/hardcoded mock totals for friend group activities (realistic numbers)
- User's contribution percentage is computed: `userWeeklyPoints / (userWeeklyPoints + mockFriendGroupTotal) * 100`, rounded to nearest integer

**Display as dashboard card:**
- Collapsible `DashboardCard` with title "Weekly Recap" and a bar chart icon
- Shows every Monday — visibility logic: `getCurrentDayOfWeek() === 1` (Monday) OR the recap has not been dismissed for this week
- "Dismiss" action (X button) hides the card for the current week (persisted in `wr_social_interactions` as `{ type: 'recap_dismissed', weekStart: string }`)
- Card reappears next Monday

**Display as notification:**
- Type: `weekly_recap`
- Message: "Your weekly recap is ready"
- Generated once per week (Monday)
- Tapping the notification could scroll to the dashboard card (or no-op if card was dismissed)

**No friends state:**
- If user has no friends: card shows "Add friends to see your weekly recap" with CTA to `/friends`

---

## UX & Design Notes

- **Tone**: Every interaction in this spec must feel warm, loving, and encouraging. Nudges never mention absence duration. Encouragements are positive affirmations. The milestone feed celebrates others. The weekly recap emphasizes collective growth.
- **Colors**: Dark theme matching the dashboard and `/friends` page. Frosted glass cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`). Encouragement popover uses the same frosted glass style. Nudge confirmation dialog uses the same modal pattern as friend remove/block dialogs.
- **Typography**: Inter for all UI. Event text in `text-sm`. Relative timestamps in `text-xs text-white/40`. Encouragement presets in `text-sm font-medium`.
- **Animations**: Popover: `animate-dropdown-in` (150ms fade + slide). Toast: existing toast animation. Milestone feed entries: subtle fade-in on load. Dialog: existing modal fade-in. Respect `prefers-reduced-motion`.
- **Popover pattern**: The encouragement popover is anchored to the "Encourage" button. It should close on outside click, Escape key, or after selecting an option. Arrow/caret pointing to the button is optional but nice-to-have. Use `role="menu"` with `role="menuitem"` for the preset options.
- **Dialog pattern**: The nudge confirmation dialog follows the same pattern as the "Remove Friend" / "Block" dialogs from Spec 9. Focus-trapped, closes on Escape, backdrop click.

### Design System Recon References

- **Frosted glass cards**: Match `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` from Dashboard Card Pattern
- **Popover/dropdown**: Match the navbar dropdown panel style (`bg-hero-mid border border-white/15 shadow-lg`) or the three-dot menu pattern from friend list
- **Toast**: Use existing `useToast()` system
- **Dialog**: Match the confirmation dialog pattern from Spec 9 (friend remove/block)
- **Avatar**: 24px circular with initials fallback, matching the milestone feed pattern from Spec 10

### Responsive Behavior

**Mobile (< 640px):**
- Encouragement popover: full-width bottom sheet anchored to bottom of screen (instead of anchored to button) — easier to reach on mobile
- Nudge confirmation dialog: full-width with padding, centered vertically
- Milestone feed in dashboard widget: stacked vertically, full-width entries
- Weekly recap card: full-width, stacked stats
- "Encourage" button on friend list: icon-only (heart icon, no text) to save horizontal space
- "Send a nudge" text: appears below the last-active timestamp, full-width
- Page padding: inherits from parent pages (`px-4`)

**Tablet (640-1024px):**
- Encouragement popover: anchored to button, ~200px wide
- Friend list "Encourage" button: icon + text
- Milestone feed: same as desktop
- Weekly recap: same as desktop

**Desktop (> 1024px):**
- Encouragement popover: anchored to button, ~220px wide
- "Encourage" button on leaderboard rows: appears on row hover
- Milestone feed: compact single-line entries
- Weekly recap card: stats in a 2x2 grid layout within the card

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature has no free-text input. All messages are preset (encouragement presets) or computed (milestone events, recap stats). Users cannot type custom encouragement messages.
- **User input involved?**: No — all interactions are button taps with predefined outcomes. No text fields, no free-form input.
- **AI-generated content?**: No — all content is user data, mock data, presets, or computed statistics. No AI calls.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Cannot interact with any social features** — all social interactions require authentication
- **Dashboard not accessible** — dashboard requires auth, so the weekly recap card and milestone feed are not visible
- **`/friends` page not accessible** — encouragement buttons and nudge buttons are not visible
- **Zero data persistence** — no writes to `wr_social_interactions`, `wr_milestone_feed`, or `wr_notifications`

### Logged-in users:
- Full access to all social interaction features
- Data persists in `wr_social_interactions` and `wr_milestone_feed` localStorage keys
- `logout()` does NOT clear social interaction data — user retains all encouragement history, nudge cooldowns, and milestone events
- Notifications generated by social interactions persist in `wr_notifications` (Spec 12)

### Route type: N/A (this spec adds features to existing protected pages, not a new route)

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| "Encourage" button (friend list) | N/A (page not accessible) | Shows popover with 4 presets |
| "Encourage" button (leaderboard) | N/A (page not accessible) | Shows popover with 4 presets |
| "Encourage" button (profile) | N/A (profile TBD in Spec 14) | Shows popover with 4 presets |
| Encouragement popover preset tap | N/A | Stores interaction, shows toast, generates notification |
| Milestone feed (dashboard widget) | N/A (dashboard not accessible) | Displays recent friend milestones |
| "Send a nudge" button | N/A (page not accessible) | Shows confirmation dialog |
| Nudge confirmation "Send" | N/A | Stores nudge, updates button, shows toast, generates notification |
| Weekly recap card (dashboard) | N/A (dashboard not accessible) | Displays Monday recap with stats |
| Weekly recap dismiss | N/A | Hides card for current week |

---

## Data Models

### `wr_social_interactions` localStorage key

```
SocialInteractionsData {
  encouragements: Encouragement[]
  nudges: Nudge[]
  recapDismissals: string[]    // Array of weekStart date strings (YYYY-MM-DD)
}

Encouragement {
  id: string
  fromUserId: string
  toUserId: string
  message: string              // One of the 4 presets
  timestamp: string            // ISO timestamp
}

Nudge {
  id: string
  fromUserId: string
  toUserId: string
  timestamp: string            // ISO timestamp
}
```

### `wr_milestone_feed` localStorage key

```
MilestoneFeed: MilestoneEvent[]

MilestoneEvent {
  id: string
  type: 'streak_milestone' | 'level_up' | 'badge_earned' | 'points_milestone'
  userId: string
  displayName: string
  avatar: string
  detail: string               // Milestone-specific detail (streak count, level name, badge name, point total)
  timestamp: string            // ISO timestamp
}
```

### Cooldown Tracking (computed from stored data)

- **Encouragement cooldown**: Count encouragements where `toUserId === friendId` AND `getLocalDateString(timestamp) === getLocalDateString(now)`. If count >= 3, button is disabled.
- **Nudge cooldown**: Find most recent nudge where `toUserId === friendId`. If `now - nudgeTimestamp < 7 days`, button is disabled.

---

## Edge Cases

- **Encouraging a friend who was just removed**: If the user opens the popover then removes the friend in another tab/session, the send should no-op gracefully. Check that the target is still a friend before storing.
- **Nudging a friend who became active**: If a friend's `lastActive` updates between seeing the button and tapping it, the nudge should still send (the button was shown based on the data at render time). The 3-day threshold is checked at render time, not at send time.
- **Weekly recap on non-Monday**: The recap card is primarily a Monday feature but should persist until dismissed. If the user doesn't visit on Monday, they see it on Tuesday/Wednesday/etc. until they dismiss it or a new week starts.
- **No friends for recap**: Show "Add friends to see your weekly recap" with CTA. Don't show mock stats for zero friends.
- **Midnight boundary for encouragement reset**: Uses `getLocalDateString()` which returns local date. A user encouraging at 11:59 PM can encourage again at 12:00 AM. This is by design.
- **localStorage corruption**: If `wr_social_interactions` contains invalid JSON, initialize with default empty state: `{ encouragements: [], nudges: [], recapDismissals: [] }`. If `wr_milestone_feed` is corrupted, re-initialize with the mock event dataset.
- **Rapid popover clicks**: After selecting an encouragement preset, the popover closes immediately and the button enters a brief disabled state (300ms) to prevent double-sends.
- **Multiple encouragement types to same friend**: A user can send 3 different presets to the same friend in one day, or 3 of the same preset — the limit is on total count per friend per day, not per message type.
- **Nudge button after sending**: The button should change to "Nudge sent" immediately and remain disabled for 7 days. If the user refreshes the page, the button state should persist (computed from stored nudge data).

---

## Out of Scope

- **Custom encouragement messages** (free-text) — not in MVP (would require crisis detection)
- **Real push notifications** — Phase 3 (this spec generates in-app notification entries only)
- **Real email notifications** — Phase 3 (SMTP integration)
- **Backend API persistence** — Phase 3 (all data in localStorage)
- **Real authentication** — Phase 3 (uses simulated auth from Spec 2's AuthProvider)
- **Privacy settings UI** (nudge permission toggle) — Spec 13 (this spec reads the setting if it exists)
- **Profile page** (`/profile/:userId`) — Spec 14 (this spec defines the "Encourage" button placement conceptually, Spec 14 builds the page)
- **Notification panel UI** — Spec 12 (this spec generates notification data entries, Spec 12 renders them)
- **Encouragement animations/effects** (confetti, sparkles on send) — nice-to-have, not required
- **Nudge reminders** (auto-nudge after N days) — not in MVP
- **Group encouragements** (encourage multiple friends at once) — not in MVP
- **Encouragement streaks** (send encouragements N days in a row) — not in MVP
- **Weekly recap email** — Phase 3 (SMTP)
- **Historical weekly recaps** (view past weeks) — not in MVP

---

## Acceptance Criteria

### Quick-Tap Encouragements

- [ ] "Encourage" button (heart icon + text) appears on each friend list row on `/friends`
- [ ] "Encourage" button appears on each Friends leaderboard row on `/friends?tab=leaderboard`
- [ ] Tapping "Encourage" opens a popover/menu with exactly 4 preset options: "Praying for you", "Keep going!", "Proud of you", "Thinking of you"
- [ ] Tapping a preset closes the popover, stores the interaction in `wr_social_interactions`, and shows success toast "Encouragement sent to [Name]!"
- [ ] A notification entry of type `encouragement` is created in `wr_notifications` with message "[Name] sent: [preset]"
- [ ] After 3 encouragements to the same friend in one day, the "Encourage" button becomes disabled
- [ ] Disabled button shows tooltip/title "You've encouraged [Name] 3 times today"
- [ ] Encouragement cooldown resets at midnight local time (new `getLocalDateString()` value)
- [ ] The 3/day limit is per-friend — different friends have independent limits
- [ ] Popover closes on outside click and Escape key
- [ ] Popover uses `role="menu"` with `role="menuitem"` for preset options

### Milestone Feed

- [ ] Dashboard widget displays a milestone feed section below the leaderboard top-3 (replaces hardcoded milestone data from Spec 10)
- [ ] Each milestone entry shows: small avatar (24px) + event text + relative timestamp
- [ ] Dashboard widget shows the 3 most recent milestone events
- [ ] Mock data includes 10-15 events spanning the last 7 days with varied event types
- [ ] Events reference existing mock friends (Sarah M., James K., Maria L., etc.)
- [ ] `wr_milestone_feed` is capped at 20 events (FIFO — oldest removed when cap exceeded)
- [ ] Event text formats match: "[Name] hit a [N]-day streak!", "[Name] leveled up to [Level]!", "[Name] earned [Badge]!", "[Name] reached [N] Faith Points!"

### Nudges

- [ ] "Send a nudge" button appears on friend list rows where friend's `lastActive` is 3+ days ago
- [ ] "Send a nudge" does NOT appear for friends active within the last 3 days
- [ ] Tapping "Send a nudge" opens a confirmation dialog with title "Send a nudge", body text explaining the action, and "Send" / "Cancel" buttons
- [ ] The dialog body does NOT mention how long the friend has been inactive
- [ ] Confirming sends the nudge: stores in `wr_social_interactions`, button changes to "Nudge sent" (disabled), success toast "Nudge sent to [Name]"
- [ ] A notification entry of type `nudge` is created in `wr_notifications` with message "[Name] is thinking of you"
- [ ] After nudging a friend, the "Send a nudge" button remains disabled for 7 days (1/week limit)
- [ ] Nudge button state persists across page reloads (computed from stored nudge timestamps)
- [ ] If `wr_settings` exists and friend's `nudgePermission === 'nobody'`, the nudge button does not appear for that friend
- [ ] Nudge confirmation dialog is focus-trapped and closes on Escape

### Weekly Community Recap

- [ ] Weekly recap card appears on the dashboard on Mondays (and persists until dismissed or next week)
- [ ] Card displays group activity stats: prayers, journal entries, meditations, worship music hours
- [ ] Card shows "You contributed X% of the group's growth!" with computed percentage
- [ ] User's contribution percentage is computed from their actual `wr_daily_activities` relative to mock friend totals
- [ ] "Dismiss" action (X button) hides the card for the current week
- [ ] Dismissal persists in `wr_social_interactions` as a `recapDismissals` entry with the week start date
- [ ] Card reappears the following Monday (new week start date)
- [ ] A notification of type `weekly_recap` with message "Your weekly recap is ready" is generated once per week
- [ ] If user has no friends, recap card shows "Add friends to see your weekly recap" with CTA to `/friends`

### Data Persistence

- [ ] All encouragements stored in `wr_social_interactions.encouragements` with id, fromUserId, toUserId, message, timestamp
- [ ] All nudges stored in `wr_social_interactions.nudges` with id, fromUserId, toUserId, timestamp
- [ ] Milestone events stored in `wr_milestone_feed` as an array of `MilestoneEvent` objects
- [ ] `logout()` does NOT clear `wr_social_interactions` or `wr_milestone_feed`
- [ ] Corrupted `wr_social_interactions` (invalid JSON) initializes with empty default state, no crash
- [ ] Corrupted `wr_milestone_feed` (invalid JSON) re-initializes with mock event data, no crash

### Accessibility

- [ ] Encouragement popover uses `role="menu"` with `role="menuitem"` for each preset option
- [ ] Popover is keyboard navigable (arrow keys between options, Enter to select, Escape to close)
- [ ] Nudge confirmation dialog uses `role="alertdialog"` with focus trapping
- [ ] All buttons have descriptive `aria-label` text (e.g., "Encourage Sarah M.", "Send a nudge to David R.")
- [ ] Disabled "Encourage" button has `aria-disabled="true"` and descriptive title text
- [ ] Milestone feed entries use semantic list markup
- [ ] All interactive elements have focus-visible outlines
- [ ] All touch targets are minimum 44px
- [ ] `prefers-reduced-motion`: popover and feed animations are instant

### Responsive Behavior

- [ ] Mobile (< 640px): encouragement popover renders as bottom sheet (full-width, anchored to bottom); "Encourage" button is icon-only (heart, no text); nudge text appears below last-active timestamp; weekly recap stats stack vertically
- [ ] Tablet (640-1024px): popover anchored to button (~200px wide); "Encourage" shows icon + text; milestone feed same as desktop
- [ ] Desktop (> 1024px): popover anchored to button (~220px wide); leaderboard "Encourage" appears on row hover; recap stats in 2x2 grid; generous spacing

### Visual Verification Criteria

- [ ] Encouragement popover background matches frosted glass or dropdown panel style (`bg-hero-mid border border-white/15 shadow-lg` or `bg-white/5 backdrop-blur-sm`)
- [ ] Popover preset options have visible hover states
- [ ] "Encourage" button is visually subtle (not attention-grabbing) — muted color until hover
- [ ] "Send a nudge" button is styled as a gentle text link, not a prominent CTA
- [ ] Milestone feed avatars are 24px circular with clear initials
- [ ] Milestone feed relative timestamps use muted color (`text-white/40`)
- [ ] Weekly recap card matches the `DashboardCard` frosted glass pattern
- [ ] Nudge confirmation dialog has the same visual treatment as the friend remove/block dialogs from Spec 9
- [ ] Disabled "Encourage" button has visually reduced opacity
- [ ] Success toasts appear and auto-dismiss with existing toast behavior
