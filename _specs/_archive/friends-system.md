# Feature: Friends System

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_friends`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider`, navbar logged-in state, avatar dropdown with "Friends" item; Spec 5 (Streak & Faith Points Engine) provides `useFaithPoints()` and level/streak data displayed on friend rows; Spec 6 (Dashboard Widgets + Activity Integration) provides the Friends & Leaderboard Preview widget with "See all" link that navigates to this page; Spec 7/8 (Badges) provide badge data for friend profiles; Spec 10 (Leaderboard) builds the second tab of this page
- Shared constants: Level thresholds and names from `dashboard/levels.ts`; level icon mappings from Spec 6
- Shared utilities: `getLocalDateString()` from `utils/date.ts` (Spec 1); `useToast()` from Toast system (Spec 8 extended)

---

## Overview

The Friends System is the social foundation of Worship Room's gentle gamification layer. It creates a `/friends` page where authenticated users can find, connect with, and encourage fellow believers on their spiritual journey. The feature uses a mutual friend model (both parties must consent) and surfaces friend connections throughout the dashboard — streak counts, faith levels, and leaderboard positioning create aspirational community without judgment.

This spec builds the Friends tab of the `/friends` page. The Leaderboard tab is a placeholder that says "Coming in Spec 10" — full leaderboard functionality is delivered in the next spec.

The entire system is frontend-first with localStorage and mock data, following the same pattern as Music and Prayer Wall. Backend API wiring is deferred to Phase 3.

---

## User Stories

- As a **logged-in user**, I want to see all my friends with their spiritual growth data (level, streak, last active) so that I feel part of a community journey.
- As a **logged-in user**, I want to search for other users by name and send friend requests so that I can grow my faith community.
- As a **logged-in user**, I want to accept or decline incoming friend requests so that I control who is in my circle.
- As a **logged-in user**, I want to invite friends who aren't on the platform yet via link or email so that I can bring others into the community.
- As a **logged-in user**, I want to remove or block friends when needed so that I feel safe in this space.
- As a **logged-in user**, I want to see "People you may know" suggestions from the Prayer Wall so that I can discover fellow community members.

---

## Requirements

### Route & Navigation

- **Route**: `/friends` (protected — requires authentication)
- **Tabs**: Two tabs — "Friends" (default) and "Leaderboard"
- **Tab state via URL**: `?tab=friends` (default) | `?tab=leaderboard`
- **Entry points**:
  - Dashboard "Friends & Leaderboard Preview" widget → "See all" link navigates to `/friends`
  - Avatar dropdown menu → "Friends" item navigates to `/friends`
- **Page theme**: Dark, matching the dashboard — dark purple gradient background with frosted glass cards

### Tab Bar

- Two tabs at the top of the page content (below the hero/header)
- Active tab: filled purple background (`bg-primary text-white`)
- Inactive tab: outline style (`border border-white/20 text-white/60`)
- Tab switching updates URL search params without page reload
- Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` pattern

### Friends Tab (Default)

The Friends tab contains the following sections from top to bottom:

**1. Header**
- Title: "Friends" with friend count in parentheses (e.g., "Friends (8)")
- Count reflects current friends list length (not including pending)

**2. Search Bar**
- Text input with search icon (Lucide `Search`)
- Placeholder: "Search by name..."
- Debounced at 300ms — filters after user stops typing
- Searches the full mock user list (not just current friends)
- Results appear in a dropdown below the input as a selectable list
- Each result: avatar + display name + level badge
- If the result is already a friend: "Already friends" label (no action)
- If the result has a pending request: "Request pending" label
- If the result is blocked: not shown in results
- Otherwise: "Add Friend" button that sends a request
- Dropdown closes on outside click or Escape
- Search dropdown uses `role="listbox"` with `role="option"` items
- `aria-label="Search for friends"` on the input

**3. Invite Section**
- Two cards side by side on desktop, stacked on mobile:
  - **Invite by Link**: Generates a shareable URL using `${import.meta.env.VITE_APP_URL || window.location.origin}/invite/${code}` where `code` is a random 8-character alphanumeric string. "Copy Link" button copies to clipboard via `navigator.clipboard.writeText()`. Success toast: "Invite link copied!" The link is cosmetic (no backend handling) — it's a UI pattern ready for Phase 3.
  - **Invite by Email**: Email text input with validation (basic email format) + "Send Invite" button. On submit: mock success — show toast "Invitation sent!" and clear the input. No actual email is sent. Disabled state while "sending" (300ms simulated delay).

**4. Pending Requests Section** (only visible if there are pending requests)
- Section header: "Pending Requests"
- **Incoming requests**: Each row shows sender's avatar + display name + level badge + "Accept" (primary) and "Decline" (secondary/outline) buttons
  - Accept: moves both parties to friends list, removes from pending, shows success toast "You and [Name] are now friends!"
  - Decline: removes request silently (no toast)
- **Outgoing requests**: Each row shows recipient's avatar + display name + "Pending" label + "Cancel" button (text/link style)
  - Cancel: removes from pending outgoing, no toast
- Section collapses/hides entirely when no pending requests exist

**5. My Friends List**
- Each friend displayed as a list row with:
  - Avatar (circular, 40px, with initials fallback if no avatar image)
  - Display name (bold)
  - Level badge (level icon + level name, small, muted)
  - Streak indicator (flame icon + number, e.g., "12" — no "day streak" text to keep compact)
  - Last active (relative time, e.g., "Active 2h ago", "Active 5d ago")
  - Entire row is tappable → navigates to `/profile/:id`
- Three-dot menu (Lucide `MoreVertical`) on each row, right-aligned:
  - "Remove Friend" — confirmation prompt ("Remove [Name] from friends?") → removes from friends list
  - "Block" — confirmation prompt ("Block [Name]? This will remove them and prevent future requests.") → adds to blocked list, removes from friends
  - Menu uses `aria-haspopup="menu"` with focus management
- Sort order: most recently active first
- If no friends: empty state (see Empty States section)

**6. People You May Know**
- Section header: "People You May Know"
- 3 suggestion cards from mock Prayer Wall interactions
- Each card: avatar + display name + level + mutual context (e.g., "Active on Prayer Wall")
- "Add Friend" button on each card
- Tapping "Add Friend" creates a pending outgoing request, button changes to "Request Sent" (disabled)
- Section hidden if no suggestions available

### Leaderboard Tab (Placeholder for Spec 10)

- Renders a centered message: "Leaderboard coming soon" with a trophy icon
- Styled consistently with the dashboard placeholder pattern
- This tab will be fully implemented in Spec 10

### Friend Data Model

Stored in `wr_friends` localStorage key:

```
FriendsData {
  friends: FriendProfile[]
  pendingIncoming: FriendRequest[]
  pendingOutgoing: FriendRequest[]
  blocked: string[]           // Array of blocked user IDs
}

FriendProfile {
  id: string                  // Unique user ID
  displayName: string
  avatar: string              // Avatar identifier (preset name or URL)
  level: number               // 1-6
  levelName: string           // "Seedling" through "Lighthouse"
  currentStreak: number
  faithPoints: number         // Total points
  weeklyPoints: number        // Points earned this week
  lastActive: string          // ISO timestamp
}

FriendRequest {
  id: string                  // Request ID
  from: FriendProfile
  to: FriendProfile
  sentAt: string              // ISO timestamp
  message?: string            // Optional request message
}
```

### Mutual Friend Model Logic

- **Send request**: Adds `FriendRequest` to sender's `pendingOutgoing` and recipient's `pendingIncoming` (since this is localStorage with mock data, both sides are simulated in the same data store)
- **Accept**: Moves both `from` and `to` profiles to the `friends` array, removes the request from pending lists
- **Decline**: Removes the request from both pending lists, no other side effects
- **Cancel outgoing**: Removes from sender's `pendingOutgoing`
- **Remove friend**: Removes from `friends` array (both sides in localStorage)
- **Block**: Adds user ID to `blocked` array, removes from `friends` if present, removes any pending requests involving that user. Blocked users do not appear in search results or suggestions.

### Mock Friend Data

Seed 10 mock friends with varied levels, streaks, and activity:

| # | Display Name | Level | Level Name | Streak | Faith Points | Weekly Pts | Last Active | Notes |
|---|-------------|-------|------------|--------|-------------|-----------|-------------|-------|
| 1 | Sarah M. | 4 | Flourishing | 45 | 3200 | 145 | 2h ago | Very active |
| 2 | James K. | 3 | Blooming | 12 | 850 | 95 | 1d ago | Active |
| 3 | Maria L. | 5 | Oak | 90 | 6500 | 170 | 30m ago | Very active, top performer |
| 4 | David R. | 2 | Sprout | 3 | 280 | 40 | 3d ago | Moderate |
| 5 | Rachel T. | 3 | Blooming | 0 | 720 | 0 | 5d ago | Inactive, was 21-day streak (nudge-eligible) |
| 6 | Daniel P. | 1 | Seedling | 7 | 85 | 55 | 6h ago | New user |
| 7 | Grace H. | 4 | Flourishing | 60 | 3800 | 160 | 1h ago | Active, strong streak |
| 8 | Matthew S. | 2 | Sprout | 0 | 200 | 0 | 8d ago | Inactive (nudge-eligible) |
| 9 | Hannah W. | 3 | Blooming | 28 | 1100 | 110 | 4h ago | Active |
| 10 | Joshua B. | 6 | Lighthouse | 180 | 12000 | 170 | 15m ago | Very active, top of leaderboard |

Additional mock data:
- **2 pending incoming requests**: From "Emma C." (Level 2, Sprout) and "Luke A." (Level 3, Blooming)
- **1 pending outgoing request**: To "Naomi F." (Level 1, Seedling)
- **3 suggestions ("People You May Know")**: "Caleb W." (Level 2), "Lydia P." (Level 3), "Micah J." (Level 1) — all with "Active on Prayer Wall" context

### Empty States

- **No friends yet**: Illustration area (subtle icon or graphic) + "Your faith community starts here" heading + "Invite friends or search for people you know" subtext + prominent "Invite a Friend" CTA button (scrolls to invite section) + "Search for friends" secondary CTA
- **No pending requests**: Pending section simply hides (not shown at all)
- **No search results**: Dropdown shows "No users found for '[query]'" message
- **No suggestions**: "People You May Know" section hides

---

## UX & Design Notes

- **Tone**: Warm, welcoming, community-focused. The friends page should feel like a church fellowship hall — inviting, not competitive. Language emphasizes "community" and "journey together."
- **Colors**: Dark theme matching the dashboard. Frosted glass cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`). Level badges use level-specific accent colors. Streak flames use warm amber (`#D97706`).
- **Typography**: Inter for all UI text. Display names in `font-medium`. Level names in `text-sm text-white/50`. Relative timestamps in `text-sm text-white/40`.
- **Animations**: Gentle transitions on request accept/decline (fade out the row, 300ms). Toast slide-in for success messages. Tab switch: content crossfade (150ms). Respect `prefers-reduced-motion`.
- **Card pattern**: Use the existing `DashboardCard` component pattern for sections where appropriate, or the frosted glass style directly for custom layouts.
- **Avatar pattern**: Circular avatars with initials fallback (first letter of first name + first letter of last name, colored background based on name hash). Match the Prayer Wall avatar pattern.

### Responsive Behavior

**Mobile (< 640px)**:
- Search bar: full width
- Invite section: stacked vertically (link card on top, email card below)
- Friend list rows: avatar + name + level on one line, streak + last active below (2-line layout per row)
- Three-dot menu: right-aligned, same row as name
- Pending request buttons: full-width stacked (Accept on top, Decline below)
- Suggestion cards: full-width, stacked vertically
- Tabs: full width, equal sizing
- Page padding: `px-4`

**Tablet (640-1024px)**:
- Search bar: max-width ~500px, centered
- Invite section: side by side (2-column)
- Friend list rows: single line (avatar + name + level + streak + last active all inline)
- Suggestion cards: 2-column grid
- Page max-width: ~768px, centered

**Desktop (> 1024px)**:
- Search bar: max-width ~500px
- Invite section: side by side with more spacing
- Friend list rows: single line with generous spacing
- Suggestion cards: 3-column grid
- Page max-width: ~900px, centered
- Content area centered with padding

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this page has no free-text input that could contain crisis language. The search bar searches by name only. The email invite field accepts email addresses only.
- **User input involved?**: Yes — search query (name only, not free text) and email address for invite. Neither requires crisis detection. Email validation prevents arbitrary text submission.
- **AI-generated content?**: No — all content is user data or mock data. No AI calls.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Cannot access `/friends`** — the route is protected. Logged-out users attempting to navigate to `/friends` are redirected to the landing page (or shown the auth modal, depending on existing auth gate pattern used by other protected routes).
- **Zero data persistence** — no `wr_friends` reads or writes for logged-out users.
- **Dashboard "Friends & Leaderboard Preview" widget**: Not visible on the dashboard (dashboard itself requires auth).
- **Avatar dropdown "Friends" item**: Not visible (avatar dropdown only renders for authenticated users).

### Logged-in users:
- Full access to `/friends` page with all functionality
- Friend data persists in `wr_friends` localStorage key
- `logout()` does NOT clear friend data — user retains all friends, requests, and blocks
- Data persists across sessions and page reloads

### Route type: Protected

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `/friends` route | Redirect to landing page or auth modal | Full page renders |
| Search bar | N/A (page not accessible) | Searches mock user list, debounced 300ms |
| Invite by Link | N/A | Generates link, copies to clipboard |
| Invite by Email | N/A | Shows toast, mock send |
| Accept/Decline requests | N/A | Moves to friends / removes request |
| Remove/Block friend | N/A | Confirmation prompt, then action |
| Friend row tap → profile | N/A | Navigates to `/profile/:id` |
| Add Friend (search/suggestions) | N/A | Creates pending outgoing request |
| Tab switching | N/A | Switches between Friends/Leaderboard tabs |

---

## Edge Cases

- **Blocking a user with pending request**: If user A blocks user B who has a pending incoming request from B, the request should be removed AND B added to the blocked list. Subsequent searches by A should not show B.
- **Self-search**: The current user should not appear in search results.
- **Duplicate requests**: If a request already exists between two users (in either direction), the "Add Friend" button should not create a duplicate. Show "Request pending" instead.
- **Accepting while blocked**: If user A unblocks user B and B had previously sent a request, no stale request should reappear. Blocking removes all pending requests permanently.
- **localStorage corruption**: If `wr_friends` contains invalid JSON, initialize with default empty state: `{ friends: [], pendingIncoming: [], pendingOutgoing: [], blocked: [] }`. No crash.
- **Very long friends list**: The list should scroll within the page (no virtualization needed for MVP — max realistic count is ~50). Performance is acceptable with simple list rendering.
- **Clipboard API unavailable**: If `navigator.clipboard.writeText()` is unavailable (e.g., non-HTTPS, older browser), fall back to selecting text in a hidden input. Show toast either way.
- **Rapid button clicks**: Accept/Decline/Remove/Block buttons should be debounced or disabled after first click to prevent double-processing.
- **Profile link for mock users**: `/profile/:id` routes will show a "Profile coming soon" state until Spec 14 builds the profile page. This is acceptable — the link is structurally correct.

---

## Out of Scope

- **Leaderboard functionality** — Spec 10 (this spec only creates a placeholder tab)
- **Social interactions (encouragements, nudges, milestone feed)** — Spec 11
- **Notification system integration** (friend request notifications) — Spec 12
- **Privacy settings** (control who sees engagement data) — Spec 13
- **Profile page** (`/profile/:id`) — Spec 14 (friend rows link to it, but the page is not built here)
- **Real authentication** — Phase 3 (uses simulated auth from Spec 2's AuthProvider)
- **Backend API persistence** — Phase 3
- **Real email sending** — Phase 3 (SMTP integration)
- **Real invite link handling** (server-side invite code resolution) — Phase 3
- **Phone contacts friend discovery** — post-MVP, native apps only
- **OAuth friend import** (Facebook/Google) — post-MVP
- **Friend groups / circles** — not in MVP
- **Direct messaging between friends** — not in MVP (no real-time chat per Non-Goals)
- **Friend request messages** (custom text with request) — data model supports it, but UI does not expose it in this spec
- **Photo avatars** — Spec 14 (this spec uses initials-based avatars only)

---

## Acceptance Criteria

### Route & Navigation
- [ ] `/friends` route is protected — redirects logged-out users (consistent with existing auth gate pattern)
- [ ] Page renders with dark theme matching the dashboard
- [ ] Two tabs render: "Friends" (default) and "Leaderboard"
- [ ] Tab state syncs with URL search params (`?tab=friends` / `?tab=leaderboard`)
- [ ] Navigating to `/friends` without `?tab` defaults to the Friends tab
- [ ] Navigating to `/friends?tab=leaderboard` shows the Leaderboard tab (placeholder)
- [ ] Dashboard "Friends & Leaderboard Preview" widget "See all" link navigates to `/friends`
- [ ] Avatar dropdown "Friends" item navigates to `/friends`

### Search
- [ ] Search input renders with search icon and placeholder "Search by name..."
- [ ] Input is debounced at 300ms — results update after typing stops
- [ ] Search results appear in a dropdown below the input
- [ ] Each result shows avatar + display name + level badge
- [ ] Results for existing friends show "Already friends" label
- [ ] Results for pending requests show "Request pending" label
- [ ] Blocked users do not appear in search results
- [ ] Current user does not appear in search results
- [ ] "Add Friend" button creates a pending outgoing request
- [ ] Dropdown closes on outside click and Escape key
- [ ] "No users found" message displays when search has no matches
- [ ] Search dropdown uses `role="listbox"` with `role="option"` items

### Invite Section
- [ ] "Invite by Link" generates a URL using `VITE_APP_URL` or `window.location.origin` + random code
- [ ] "Copy Link" copies to clipboard and shows success toast "Invite link copied!"
- [ ] Clipboard fallback works when `navigator.clipboard` is unavailable
- [ ] "Invite by Email" has email format validation
- [ ] "Send Invite" shows simulated loading state, then success toast "Invitation sent!"
- [ ] Email input clears after successful send
- [ ] On mobile: invite cards stack vertically; on desktop/tablet: side by side

### Pending Requests
- [ ] Incoming requests display with sender avatar + name + level + Accept/Decline buttons
- [ ] Accept button moves both users to friends list and shows toast "You and [Name] are now friends!"
- [ ] Decline button removes request silently (no toast)
- [ ] Outgoing requests display with recipient avatar + name + "Pending" label + Cancel button
- [ ] Cancel button removes outgoing request
- [ ] Pending section hides when no pending requests exist
- [ ] Accept/Decline button labels include friend name for screen readers (e.g., "Accept friend request from Sarah M.")

### Friend List
- [ ] Each friend row shows: avatar (40px circular) + display name + level badge (icon + name) + streak (flame + number) + last active (relative time)
- [ ] Avatar has initials fallback when no image
- [ ] Friends sorted by most recently active first
- [ ] Entire row is tappable and navigates to `/profile/:id`
- [ ] Three-dot menu on each row with "Remove Friend" and "Block" options
- [ ] Remove: shows confirmation prompt, then removes friend
- [ ] Block: shows confirmation prompt, then blocks user and removes from friends
- [ ] Three-dot menu uses `aria-haspopup="menu"` with proper focus management

### People You May Know
- [ ] Section displays 3 suggestion cards from mock data
- [ ] Each card shows avatar + display name + level + context ("Active on Prayer Wall")
- [ ] "Add Friend" button sends request, changes to "Request Sent" (disabled)
- [ ] Section hides when no suggestions available

### Mock Data
- [ ] 10 mock friends seeded with correct data per the mock data table
- [ ] 2 pending incoming requests from Emma C. and Luke A.
- [ ] 1 pending outgoing request to Naomi F.
- [ ] 3 suggestions: Caleb W., Lydia P., Micah J.
- [ ] Rachel T. and Matthew S. have 0-day streaks and 5+/8+ day inactivity (for nudge testing in Spec 11)

### Mutual Friend Model
- [ ] Send request creates pending entry in both outgoing and incoming (simulated in localStorage)
- [ ] Accept moves profiles to friends arrays on both sides
- [ ] Decline removes request from both sides
- [ ] Block adds to blocked array, removes from friends if present, removes pending requests
- [ ] Blocked users cannot be re-added (not shown in search results)
- [ ] Duplicate requests are prevented — "Add Friend" disabled when request already exists

### Empty States
- [ ] No friends: "Your faith community starts here" + invite/search CTAs
- [ ] No search results: "No users found for '[query]'" in dropdown
- [ ] No pending requests: section is hidden (not shown as empty)
- [ ] No suggestions: section is hidden

### Leaderboard Tab (Placeholder)
- [ ] Shows centered message "Leaderboard coming soon" with trophy icon
- [ ] Styled consistently with dashboard placeholder pattern

### Accessibility
- [ ] Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`
- [ ] Search input has `aria-label="Search for friends"`
- [ ] Search results use `role="listbox"` / `role="option"`
- [ ] Accept/Decline buttons have descriptive labels including friend name
- [ ] Three-dot menu uses `aria-haspopup="menu"` with focus trapping
- [ ] Friend list uses semantic list markup (`role="list"` / `role="listitem"`)
- [ ] All interactive elements have focus-visible outlines
- [ ] All touch targets are minimum 44px
- [ ] `prefers-reduced-motion`: tab transitions and row fade animations are instant

### Responsive Behavior
- [ ] Mobile (< 640px): invite cards stack, friend rows use 2-line layout, pending buttons stack, suggestions stack, full-width tabs
- [ ] Tablet (640-1024px): invite cards side by side, single-line friend rows, 2-column suggestion grid, page max-width ~768px
- [ ] Desktop (> 1024px): generous spacing, single-line friend rows, 3-column suggestion grid, page max-width ~900px

### Error Handling
- [ ] Corrupted `wr_friends` (invalid JSON): initializes with empty default state, no crash
- [ ] `localStorage` unavailable: graceful degradation, no crash
- [ ] Rapid button clicks on Accept/Decline/Remove/Block are debounced or disabled after first click

### Visual Verification Criteria
- [ ] Page background matches dashboard dark gradient
- [ ] Card backgrounds match the frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Active tab has filled purple background distinguishable from inactive outline tab
- [ ] Streak flame icon uses warm amber color matching the dashboard streak display
- [ ] Level badges use the same icon set as the dashboard (Lucide icons per level)
- [ ] Friend row hover state is visible but subtle (slight background lightening)
- [ ] Invite section cards have equal visual weight when side by side
- [ ] Search dropdown aligns with the search input and has visible borders/shadow for depth
