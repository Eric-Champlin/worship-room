# Feature: Notification System

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_notifications`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider`, navbar logged-in state, bell icon placement in Navbar; Spec 8 (Celebrations & Badge UI) extended the existing `Toast.tsx` with celebration toast types; Spec 9 (Friends System) provides `wr_friends` data and friend request actions (Accept/Decline); Spec 11 (Social Interactions) generates encouragement, nudge, friend_milestone, and weekly_recap notification entries that this spec renders
- Shared constants: Notification type icons, toast positioning
- Shared utilities: `timeAgo()` from `lib/time.ts`; `useToast()` from `components/ui/Toast.tsx`; `useAuth()` from auth context

---

## Overview

The Notification System transforms Worship Room's bell icon (placed by Spec 2) into a fully functional notification center. It gives users a single, peaceful place to see encouragements from friends, friend requests, personal milestones, community celebrations, gentle nudges, weekly recaps, and level-up achievements. The system reinforces connection and spiritual growth by surfacing meaningful moments — never noise — in a design that feels like a quiet inbox of blessings rather than a demanding alert feed.

This spec delivers three capabilities: the notification dropdown panel (bell click behavior), the unread badge count on the bell, and an extension to the existing toast/snackbar system for notification-driven toasts. It also provides 12 pre-seeded mock notifications and push notification stubs (settings toggle only, no actual push).

---

## User Stories

- As a **logged-in user**, I want to tap the bell icon and see my recent notifications so that I can stay connected with friends and my own growth milestones.
- As a **logged-in user**, I want to see an unread count on the bell so that I know when something new has happened without opening the panel.
- As a **logged-in user**, I want to accept or decline friend requests directly from the notification panel so that I can respond quickly without navigating away.
- As a **logged-in user**, I want to dismiss or mark notifications as read so that I can keep my notification list clean and focused.
- As a **logged-in user**, I want toast notifications to appear briefly when something important happens so that I'm aware without being interrupted.

---

## Requirements

### 1. Bell Icon Behavior (Spec 2 Upgrade)

Spec 2 placed the Lucide `Bell` icon in the navbar for authenticated users. This spec adds:

**Click toggle:**
- Click the bell icon → notification panel opens (dropdown on desktop, bottom sheet on mobile)
- Click again (or click outside, or press Escape) → panel closes
- Panel toggle is independent of avatar dropdown — opening bell closes avatar dropdown and vice versa

**Unread badge:**
- Small red circle badge positioned top-right of the bell icon
- White text showing unread count (count of notifications where `read === false`)
- Only visible when unread count > 0
- If count exceeds 9, display "9+"
- Badge uses `bg-red-500 text-white text-xs font-bold` styling, ~18px diameter

### 2. Notification Panel

**Desktop layout (~360px width):**
- Absolute positioned below the bell icon, right-aligned to prevent overflow
- Dark frosted glass background: `bg-hero-mid/95 backdrop-blur-md border border-white/15 shadow-lg rounded-xl`
- Max height: 400px with vertical scroll (`overflow-y-auto`)
- Header row: "Notifications" title (left) + "Mark all as read" link (right)
- Notification list below header
- Empty state at bottom if no notifications

**Mobile layout (full-width bottom sheet):**
- Slides up from bottom of screen, full viewport width
- Same max height 400px with scroll
- Same header, same notification items
- Semi-transparent backdrop overlay behind the sheet
- Swipe down to dismiss (or tap backdrop)
- Touch-optimized: larger tap targets (minimum 48px row height)

**Panel entrance animation:**
- Desktop: `animate-dropdown-in` (existing 150ms fade + slide up animation)
- Mobile: slide up from bottom (300ms ease-out)
- Respect `prefers-reduced-motion`: instant show/hide

### 3. Notification Types and Display

Seven notification types, each with a distinct icon and behavior:

| Type | Icon | Example Message | Tap Action |
|------|------|----------------|------------|
| `encouragement` | 🙏 | "Sarah sent: Praying for you" | Mark read, navigate to `/friends` |
| `friend_request` | 👤 | "James wants to be your friend" | Inline Accept/Decline (no navigation) |
| `milestone` | 🏆 | "You earned Burning Bright!" | Mark read, navigate to dashboard |
| `friend_milestone` | 🎉 | "Sarah hit a 30-day streak!" | Mark read, navigate to `/friends` |
| `nudge` | ❤️ | "Sarah is thinking of you" | Mark read, navigate to dashboard |
| `weekly_recap` | 📊 | "Your weekly recap is ready" | Mark read, scroll to recap card on dashboard |
| `level_up` | ⬆️ | "You leveled up to Sprout!" | Mark read, navigate to dashboard |

**Each notification item displays:**
- Left: Type icon (emoji, displayed at 20px size in a 32px container)
- Center: Message text (primary) + relative timestamp below (muted, uses `timeAgo()` from `lib/time.ts`)
- Right: Dismiss button (X icon, desktop only) or swipe-to-dismiss (mobile)
- Unread indicator: Brighter background (`bg-white/10` vs `bg-transparent`) + small dot indicator (4px circle, `bg-primary-lt`) on the left edge
- Read state: Default background, no dot

**Friend request special behavior:**
- Instead of navigating on tap, `friend_request` notifications display inline "Accept" and "Decline" buttons below the message
- Accept: adds friend (writes to `wr_friends`), removes the notification, shows success toast "You and [Name] are now friends!"
- Decline: removes the notification silently (no toast)
- Buttons: small pill-style, "Accept" uses `bg-primary text-white`, "Decline" uses `bg-white/10 text-white/60`

### 4. Notification Actions

**Mark as read (individual):**
- Tap a notification (except `friend_request`) → set `read: true` in `wr_notifications` → navigate to `actionUrl`
- Visual: unread indicator (dot + bright bg) disappears

**Mark all as read:**
- "Mark all as read" link in panel header
- Sets `read: true` on all notifications
- Link becomes muted/disabled when all are already read
- No toast on this action

**Dismiss (individual):**
- Desktop: X button on hover (right side of notification row)
- Mobile: Swipe left to reveal "Dismiss" action (or swipe to dismiss directly)
- Removes the notification from `wr_notifications` entirely (hard delete from array)
- No toast on dismiss

### 5. Toast/Snackbar System Extension

The existing `Toast.tsx` (`ToastProvider` + `useToast()`) already supports `success`, `error`, and celebration types. This spec does NOT change the existing toast types or behavior. The existing `showToast()` function is used by the notification system to display brief toasts when new notifications arrive (e.g., when an encouragement is received).

**Toast positioning** (already implemented):
- Standard toasts: top-right on all devices
- Celebration toasts: bottom-center mobile, bottom-right desktop
- Max 3 stacked (already enforced by existing `.slice(-3)`)
- Auto-dismiss (already implemented: 6s for standard, 4-5s for celebration)

**No changes to Toast.tsx are required.** Notification-triggered toasts use the existing `showToast()` with `'success'` type. Example: when a friend sends an encouragement, the social interaction system (Spec 11) calls `showToast("Sarah sent: Praying for you")`.

### 6. Unread Badge Count

**Computation:**
- Count entries in `wr_notifications` where `read === false`
- Display on bell icon as red badge
- Update reactively when notifications are read, dismissed, or new ones are added

**Cross-tab consistency:**
- Listen for `storage` events on `wr_notifications` key to sync badge count across tabs
- When another tab marks notifications as read, the badge updates in all open tabs

### 7. Mock Notification Data

Seed 12 mock notifications spanning 7 days. 5 unread, 7 read.

| # | Type | Message | Timestamp (days ago) | Read |
|---|------|---------|---------------------|------|
| 1 | `encouragement` | "Sarah M. sent: Praying for you" | 0 (today) | false |
| 2 | `friend_request` | "David R. wants to be your friend" | 0 (today) | false |
| 3 | `level_up` | "You leveled up to Sprout!" | 1 | false |
| 4 | `friend_milestone` | "Maria L. hit a 14-day streak!" | 1 | false |
| 5 | `nudge` | "James K. is thinking of you" | 2 | false |
| 6 | `milestone` | "You earned First Light!" | 2 | true |
| 7 | `encouragement` | "Grace T. sent: Keep going!" | 3 | true |
| 8 | `weekly_recap` | "Your weekly recap is ready" | 3 | true |
| 9 | `friend_milestone` | "Joshua P. leveled up to Blooming!" | 4 | true |
| 10 | `milestone` | "You earned Burning Bright!" | 5 | true |
| 11 | `encouragement` | "Sarah M. sent: Proud of you" | 6 | true |
| 12 | `friend_milestone` | "Maria L. earned Prayer Warrior!" | 7 | true |

Mock names should reference friends from Spec 9's mock data for consistency.

### 8. Push Notification Stubs

**Settings toggle only — no actual push implementation:**
- In `/settings` (Spec 13), the "Push notifications" toggle stores a permission flag in `wr_settings.notifications.pushNotifications`
- Toggling ON: shows a mock browser permission prompt explanation ("Enable push notifications to get updates even when you're away") but does NOT call `Notification.requestPermission()` or register a service worker
- The flag is stored for future Phase 3 implementation
- No service worker, no FCM, no APNS — purely a UI toggle that persists a boolean

### 9. Empty State

When `wr_notifications` array is empty (all dismissed or none exist):
- Panel body shows centered empty state illustration area
- Text: "All caught up!" with party popper emoji
- Muted subtext: "We'll let you know when something happens"
- "All caught up!" in `text-white text-lg font-medium`
- Subtext in `text-white/40 text-sm`
- Vertically centered within the panel content area

---

## UX & Design Notes

- **Tone**: Notifications should feel like blessings, not demands. The panel is a peaceful inbox. No urgency cues (no red text, no exclamation marks, no "ACTION REQUIRED"). The unread badge is the only assertive element.
- **Colors**: Dark frosted glass panel matching the navbar dropdown pattern (`bg-hero-mid` base). Unread rows use `bg-white/10`. Read rows use transparent background. Timestamp text in `text-white/40`. Message text in `text-white/90`. Type icons use their natural emoji rendering.
- **Typography**: Message text in `text-sm font-medium text-white/90`. Timestamp in `text-xs text-white/40`. Panel title "Notifications" in `text-base font-semibold text-white`. "Mark all as read" in `text-xs text-primary-lt hover:text-primary`.
- **Animations**: Panel entrance uses `animate-dropdown-in` (desktop). Mobile bottom sheet slides up. Notification items stagger-fade on first open (50ms between items, optional — respect `prefers-reduced-motion`). Dismiss: item slides out left (200ms) then list reflows.
- **Dividers**: Subtle `border-b border-white/10` between notification items
- **Scroll**: Custom scrollbar styling for dark theme (thin, `bg-white/20` thumb, transparent track) or hide scrollbar (`scrollbar-hide` utility class if available)

### Design System Recon References

- **Frosted glass panel**: Match the navbar dropdown panel style from design-system.md — `bg-hero-mid border border-white/15 shadow-lg` with the mobile drawer's full-width treatment
- **Badge**: Red circle with white text, consistent with standard notification badge patterns. Position offset: `top: -4px, right: -4px` relative to bell icon container
- **Button styles**: "Accept" button matches primary button pattern (`bg-primary text-white rounded-full px-3 py-1 text-xs`). "Decline" matches secondary/ghost pattern.
- **Dismiss X icon**: Lucide `X` icon, 16px, `text-white/40 hover:text-white/70`
- **Mobile bottom sheet**: Similar to the encouragement popover bottom sheet pattern from Spec 11 — full-width, rounded top corners (`rounded-t-2xl`), backdrop overlay (`bg-black/50`)

### Responsive Behavior

**Mobile (< 640px):**
- Panel renders as a full-width bottom sheet (slides up from bottom)
- Rounded top corners: `rounded-t-2xl`
- Semi-transparent backdrop overlay (`bg-black/50`) behind the sheet — tap backdrop to close
- Max height: 400px with scroll
- Notification rows: 48px minimum height for touch targets
- No X dismiss button per row — swipe left to dismiss instead
- Friend request Accept/Decline buttons: full-width stacked (Accept on top, Decline below)
- Panel header: "Notifications" left, "Mark all as read" right, same row
- Close affordance: drag handle bar at top center (small pill shape, `bg-white/30`, 32px wide, 4px tall)

**Tablet (640-1024px):**
- Panel renders as dropdown, same as desktop but slightly narrower (~320px)
- X dismiss button visible on each row
- Friend request buttons: inline (side by side)
- Same max height and scroll behavior as desktop

**Desktop (> 1024px):**
- Panel renders as dropdown below bell icon, ~360px wide
- Right-aligned to prevent viewport overflow
- X dismiss button appears on row hover (hidden at rest, visible on hover)
- Subtle hover state on notification rows: `hover:bg-white/5`
- Friend request buttons: inline (side by side), compact

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature has no free-text user input. All notification messages are system-generated or preset (from Spec 11's encouragement presets).
- **User input involved?**: No — users tap buttons (mark read, dismiss, accept, decline). No typing, no text fields.
- **AI-generated content?**: No — all notification messages are template-based strings built from user display names + action types.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Bell icon is not visible** — the bell only renders when `isAuthenticated` is true (already handled by Spec 2's navbar logged-in state)
- **Notification panel is inaccessible** — no bell to click
- **Zero data persistence** — no reads or writes to `wr_notifications`
- **No toasts from notification system** — social interaction toasts (Spec 11) are already auth-gated

### Logged-in users:
- Full access to bell icon, notification panel, and all actions
- Data persists in `wr_notifications` localStorage key
- `logout()` does NOT clear `wr_notifications` — user retains notification history (consistent with other `wr_*` keys)
- Mock data is seeded on first load if `wr_notifications` does not exist

### Route type: N/A (this spec adds behavior to the existing Navbar component and does not introduce new routes)

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Bell icon | Not rendered | Visible in navbar with unread badge |
| Unread badge | Not rendered | Shows count > 0, "9+" max |
| Notification panel | Not accessible | Opens on bell click |
| Notification item tap | N/A | Marks read + navigates to actionUrl |
| "Mark all as read" link | N/A | Sets all notifications to read |
| Dismiss (X / swipe) | N/A | Removes notification from list |
| Friend request Accept | N/A | Adds friend to `wr_friends`, removes notification, shows toast |
| Friend request Decline | N/A | Removes notification silently |
| Push notification toggle | N/A (settings page is auth-gated) | Stores boolean flag in `wr_settings` |

---

## Data Model

### `wr_notifications` localStorage key

```
Notification {
  id: string                    // crypto.randomUUID()
  type: NotificationType        // 'encouragement' | 'friend_request' | 'milestone' | 'friend_milestone' | 'nudge' | 'weekly_recap' | 'level_up'
  message: string               // Display message (e.g., "Sarah sent: Praying for you")
  read: boolean                 // false = unread, true = read
  timestamp: string             // ISO timestamp (e.g., "2026-03-17T14:30:00Z")
  actionUrl?: string            // Optional navigation target on tap (e.g., "/friends", "/")
  actionData?: {                // Optional structured data for special notification types
    friendRequestId?: string    // For friend_request: the friend's userId
    badgeName?: string          // For milestone: badge name
    [key: string]: unknown
  }
}

NotificationType = 'encouragement' | 'friend_request' | 'milestone' | 'friend_milestone' | 'nudge' | 'weekly_recap' | 'level_up'
```

**Storage format:** `wr_notifications` stores a JSON array of `Notification` objects, ordered by timestamp descending (newest first).

**Cap:** Maximum 50 notifications stored. When a new notification would exceed 50, remove the oldest (regardless of read state). FIFO.

**Corruption handling:** If `wr_notifications` contains invalid JSON, re-initialize with the 12 mock notifications.

---

## Notification Hook

A `useNotifications()` hook provides the interface for reading and managing notifications:

```
useNotifications() returns {
  notifications: Notification[]       // All notifications, newest first
  unreadCount: number                 // Count where read === false
  markAsRead: (id: string) => void   // Set read: true for one notification
  markAllAsRead: () => void          // Set read: true for all
  dismiss: (id: string) => void      // Remove notification from list
  addNotification: (n: Omit<Notification, 'id'>) => void  // Add new notification (used by other specs)
}
```

This hook reads from and writes to `wr_notifications` in localStorage. It listens for `storage` events to stay in sync across tabs.

---

## Edge Cases

- **Panel open + navigation**: If the panel is open and the user clicks a notification that navigates to a different page, the panel should close before navigation occurs.
- **Panel open + scroll**: The page behind the panel should NOT scroll when the panel is open on mobile (body scroll lock). Desktop: page scrolling is allowed since the panel is a dropdown, not a sheet.
- **Rapid clicks**: Debounce or guard against double-tap on Accept/Decline to prevent duplicate friend additions.
- **Friend request for already-added friend**: If a `friend_request` notification references a user who is already a friend (e.g., accepted from `/friends` page), the notification should still show but the Accept/Decline buttons are replaced with "Already friends" muted text.
- **Empty after dismissing all**: Dismissing the last notification transitions to the empty state smoothly.
- **New notification while panel is open**: If a new notification is added to `wr_notifications` while the panel is open (e.g., from a `storage` event), it should appear at the top of the list. No jarring reflow — prepend with fade-in.
- **Bell badge animation**: When a new unread notification arrives (badge count increases), the bell icon could briefly shake/ring (subtle 300ms animation). Optional — respect `prefers-reduced-motion`.
- **Midnight timestamp rollover**: `timeAgo()` already handles this (from `lib/time.ts`). "Just now", "5m ago", "2h ago", "Yesterday", "3d ago", etc.
- **localStorage not available**: If localStorage is unavailable (private browsing edge cases), the notification system should degrade gracefully — empty notifications, no crash.
- **Panel z-index**: Panel must render above all other content including the navbar dropdown, audio pill/drawer, and any modals. Use `z-[60]` or higher.

---

## Out of Scope

- **Real push notifications** — Phase 3 (this spec only stores a permission flag toggle, no actual push infrastructure)
- **Real email notifications** — Phase 3 (SMTP integration)
- **Backend API persistence** — Phase 3 (all data in localStorage)
- **Real authentication** — Phase 3 (uses simulated auth from Spec 2's AuthProvider)
- **Notification preferences per type** (mute encouragements but keep milestones) — Spec 13 defines the toggles in `/settings`; this spec reads those settings if they exist but does not build the settings UI
- **Notification grouping** (e.g., "Sarah and 2 others sent encouragements") — not in MVP
- **Sound effects on notification arrival** — not in MVP
- **Rich notification content** (images, scripture verses, embedded cards) — not in MVP
- **Notification history page** (full archive beyond the 50-cap dropdown) — not in MVP
- **Real-time notification delivery** (WebSocket, SSE) — Phase 3+
- **Badge animation on bell** (ring/shake) — nice-to-have, not required
- **Swipe gesture library** — implement swipe-to-dismiss with basic touch event handling, not a library dependency

---

## Acceptance Criteria

### Bell Icon & Badge

- [ ] Bell icon in navbar is only visible when user is authenticated
- [ ] Unread badge (red circle with white count) appears on bell when `wr_notifications` has entries with `read: false`
- [ ] Badge displays correct unread count (count where `read === false`)
- [ ] Badge displays "9+" when unread count exceeds 9
- [ ] Badge is hidden when unread count is 0
- [ ] Badge position: top-right of bell icon, slightly offset (`top: -4px, right: -4px`)
- [ ] Badge styling: `bg-red-500 text-white text-xs font-bold`, approximately 18px diameter

### Panel Open/Close

- [ ] Clicking bell icon opens the notification panel
- [ ] Clicking bell icon again closes the panel
- [ ] Clicking outside the panel closes it (desktop)
- [ ] Pressing Escape closes the panel
- [ ] Opening the notification panel closes the avatar dropdown (and vice versa)
- [ ] Panel entrance uses `animate-dropdown-in` on desktop (150ms fade + slide)
- [ ] Mobile: panel slides up as a bottom sheet with backdrop overlay (`bg-black/50`)
- [ ] Mobile: tapping backdrop closes the panel
- [ ] Mobile: drag handle bar visible at top center of the sheet

### Panel Layout & Styling

- [ ] Desktop: panel is ~360px wide, positioned below bell, right-aligned
- [ ] Mobile: panel is full-width bottom sheet with `rounded-t-2xl` top corners
- [ ] Panel max height is 400px with vertical scroll
- [ ] Panel background: dark frosted glass (`bg-hero-mid/95 backdrop-blur-md border border-white/15 shadow-lg rounded-xl`)
- [ ] Header row: "Notifications" title (left) + "Mark all as read" link (right)
- [ ] Notification items separated by `border-b border-white/10` dividers

### Notification Items

- [ ] Each notification displays: type icon (emoji) + message text + relative timestamp
- [ ] Unread notifications have brighter background (`bg-white/10`) + dot indicator (4px `bg-primary-lt` circle on left edge)
- [ ] Read notifications have transparent background, no dot
- [ ] Message text: `text-sm font-medium text-white/90`
- [ ] Timestamp: `text-xs text-white/40`, using `timeAgo()` function
- [ ] All 7 notification types render with correct icons: 🙏 (encouragement), 👤 (friend_request), 🏆 (milestone), 🎉 (friend_milestone), ❤️ (nudge), 📊 (weekly_recap), ⬆️ (level_up)

### Notification Actions

- [ ] Tapping a non-friend_request notification marks it as read and navigates to `actionUrl`
- [ ] `friend_request` notifications display inline "Accept" and "Decline" buttons instead of navigating
- [ ] Accept: adds friend to `wr_friends`, removes the notification, shows toast "You and [Name] are now friends!"
- [ ] Decline: removes the notification silently (no toast)
- [ ] "Accept" button: `bg-primary text-white rounded-full` styling
- [ ] "Decline" button: `bg-white/10 text-white/60` styling
- [ ] If a friend_request references an already-added friend, buttons are replaced with "Already friends" muted text
- [ ] Desktop: X dismiss button appears on notification row hover
- [ ] Mobile: swipe left to dismiss a notification
- [ ] Dismissed notifications are permanently removed from `wr_notifications` array
- [ ] "Mark all as read" sets `read: true` on all notifications
- [ ] "Mark all as read" link becomes muted/disabled when all are already read

### Empty State

- [ ] When no notifications exist (all dismissed or empty), panel shows empty state
- [ ] Empty state text: "All caught up!" with party popper emoji
- [ ] Empty state subtext: "We'll let you know when something happens" in `text-white/40 text-sm`
- [ ] Empty state is vertically centered in panel content area

### Mock Data

- [ ] 12 mock notifications are seeded into `wr_notifications` on first load (if key doesn't exist)
- [ ] Mock data spans 7 days with varied notification types
- [ ] 5 notifications are unread, 7 are read
- [ ] Mock names reference Spec 9's friends (Sarah M., James K., Maria L., etc.)
- [ ] At least one `friend_request` notification is included with inline Accept/Decline

### Push Notification Stubs

- [ ] Push notification toggle in `/settings` (Spec 13) stores boolean flag in `wr_settings.notifications.pushNotifications`
- [ ] Toggle does NOT call browser `Notification.requestPermission()` or register service workers
- [ ] Toggle is purely a UI flag stored for Phase 3

### Data Persistence

- [ ] Notifications stored in `wr_notifications` as JSON array, ordered newest first
- [ ] Maximum 50 notifications; oldest removed when cap exceeded (FIFO)
- [ ] `logout()` does NOT clear `wr_notifications`
- [ ] Corrupted `wr_notifications` (invalid JSON) re-initializes with 12 mock notifications, no crash
- [ ] Cross-tab sync: `storage` event listener updates badge count and notification list when another tab modifies `wr_notifications`

### Accessibility

- [ ] Panel uses `role="dialog"` with `aria-label="Notifications"`
- [ ] Panel is focus-trapped when open (keyboard focus stays within panel)
- [ ] Bell icon button has `aria-label` including unread count (e.g., "Notifications, 5 unread")
- [ ] Bell button has `aria-expanded` reflecting panel open state
- [ ] Bell button has `aria-haspopup="dialog"`
- [ ] Notification list uses `role="list"` with `role="listitem"` for each notification
- [ ] "Mark all as read" link is keyboard-focusable
- [ ] Accept/Decline buttons have descriptive `aria-label` (e.g., "Accept friend request from James")
- [ ] Dismiss X button has `aria-label="Dismiss notification"`
- [ ] All interactive elements have visible focus outlines
- [ ] All touch targets are minimum 44px (mobile: 48px row height)
- [ ] `prefers-reduced-motion`: all panel and item animations are instant
- [ ] Screen reader announcement when panel opens: "Notifications panel, [N] unread" via `aria-live` region

### Responsive Behavior

- [ ] Mobile (< 640px): panel is full-width bottom sheet with backdrop overlay; no per-item X buttons (swipe instead); friend request buttons stack vertically; drag handle bar visible; 48px minimum row height
- [ ] Tablet (640-1024px): panel is dropdown (~320px wide); X dismiss visible; friend request buttons inline; same max height and scroll
- [ ] Desktop (> 1024px): panel is dropdown (~360px wide), right-aligned; X dismiss on hover; hover state on rows (`hover:bg-white/5`); friend request buttons inline

### Visual Verification Criteria

- [ ] Panel background matches navbar dropdown pattern (`bg-hero-mid` base with `border-white/15` border and `shadow-lg`)
- [ ] Unread notification background is visibly brighter than read notification background
- [ ] Unread dot indicator (4px circle) uses `bg-primary-lt` (`#8B5CF6`)
- [ ] Red unread badge on bell uses `bg-red-500` with white text, visually prominent
- [ ] "Mark all as read" uses `text-primary-lt` color
- [ ] Panel rounded corners: `rounded-xl` on desktop, `rounded-t-2xl` on mobile bottom sheet
- [ ] Notification item dividers are subtle (`border-white/10`)
- [ ] Empty state text is centered and visually distinct from notification items
- [ ] Mobile backdrop overlay is semi-transparent (`bg-black/50`)
