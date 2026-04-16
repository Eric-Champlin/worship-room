# Implementation Plan: Notification System

**Spec:** `_specs/notification-system.md`
**Date:** 2026-03-17
**Branch:** `claude/feature/notification-system`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon — this is a component within existing pages)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded — Spec 12 of 16)

---

## Architecture Context

### Project Structure (Frontend)

```
frontend/src/
├── components/
│   ├── Navbar.tsx          — Bell icon placeholder lives here (line ~374-380)
│   ├── ui/Toast.tsx        — ToastProvider + useToast() (no changes needed)
│   ├── dashboard/          — Dashboard card components
│   └── ...
├── contexts/
│   └── AuthContext.tsx      — AuthProvider with isAuthenticated, user, login(), logout()
├── hooks/
│   ├── useAuth.ts          — Re-exports from AuthContext
│   ├── useFocusTrap.ts     — Focus trapping for modals/panels
│   ├── useFriends.ts       — Friends CRUD, reads wr_friends
│   └── ...
├── lib/
│   └── time.ts             — timeAgo(), formatFullDate()
├── types/
│   └── dashboard.ts        — NotificationEntry type (needs extension)
├── mocks/
│   └── friends-mock-data.ts — 10 mock friends (Sarah M., James K., Maria L., etc.)
├── constants/
│   └── dashboard/          — Activity points, levels, badges, mood colors, encouragements
└── services/
    └── storage-service.ts  — StorageService interface with LocalStorageService
```

### Existing Patterns to Follow

- **Avatar dropdown** (Navbar.tsx:326-429): `useState(isOpen)`, `wrapperRef` for outside-click detection, `useEffect` for Escape key, `animate-dropdown-in` class on panel
- **Auth gating**: `useAuth()` → check `isAuthenticated` before rendering bell/panel
- **localStorage read/write**: Direct `JSON.parse(localStorage.getItem(...))` with try/catch, or via `StorageService` for music keys. Dashboard specs use direct localStorage access with helper functions.
- **Mock data seeding**: Check if key exists, seed if not (pattern from friends-mock-data.ts, mood check-in)
- **Cross-tab sync**: Listen for `window.addEventListener('storage', handler)` on relevant key
- **Type definitions**: In `types/dashboard.ts` alongside other dashboard types
- **Test patterns**: Vitest + React Testing Library, `vi.fn()` mocks, `renderWithProviders()` wrappers with AuthContext/ToastProvider

### Key Integration Points

- **Navbar.tsx**: Currently has a non-functional bell `<button>` at line ~374-380. This spec replaces it with `<NotificationBell>` component that manages panel toggle and badge.
- **useFriends.ts**: `acceptRequest(requestId)` and `declineRequest(requestId)` — called from friend_request notification Accept/Decline buttons.
- **Toast.tsx**: `useToast()` → `showToast(message)` for "You and [Name] are now friends!" toast.
- **types/dashboard.ts**: `NotificationEntry` exists but needs `actionUrl` and `actionData` fields added.

### Existing NotificationEntry Type (dashboard.ts:157-163)

```typescript
export interface NotificationEntry {
  id: string;
  type: 'encouragement' | 'nudge' | 'friend_milestone' | 'weekly_recap' | 'friend_request' | 'milestone' | 'level_up';
  message: string;
  timestamp: string;
  read: boolean;
}
```

Missing from spec: `actionUrl?: string` and `actionData?: { friendRequestId?: string; badgeName?: string; [key: string]: unknown }`.

---

## Auth Gating Checklist

**The entire notification system is auth-gated. Bell icon only renders when `isAuthenticated === true`.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Bell icon visibility | Only visible when authenticated | Step 3 | `isAuthenticated` check in Navbar before rendering `<NotificationBell>` |
| Panel open | Only accessible when authenticated | Step 3 | Bell not rendered → panel inaccessible |
| Mark as read (individual) | Logged-in only | Step 4 | Gated by bell visibility |
| Mark all as read | Logged-in only | Step 4 | Gated by bell visibility |
| Dismiss notification | Logged-in only | Step 4 | Gated by bell visibility |
| Accept friend request | Logged-in only | Step 4 | Gated by bell visibility + `useFriends().acceptRequest()` |
| Decline friend request | Logged-in only | Step 4 | Gated by bell visibility |
| Push notification toggle | Settings page auth-gated (Spec 13) | Step 6 | Settings page-level auth gate |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Notification panel BG | background | `bg-hero-mid/95 backdrop-blur-md` (#1E0B3E at 95% opacity) | spec + design-system.md (Hero Mid = #1E0B3E) |
| Panel border | border | `border border-white/15 shadow-lg rounded-xl` | spec + avatar dropdown (Navbar.tsx:401) |
| Panel width (desktop) | width | ~360px | spec |
| Panel width (tablet) | width | ~320px | spec |
| Panel max height | max-height | 400px | spec |
| Unread badge | background | `bg-red-500 text-white text-xs font-bold` ~18px | spec |
| Unread badge position | offset | `top: -4px, right: -4px` | spec |
| Unread row BG | background | `bg-white/10` | spec |
| Read row BG | background | transparent | spec |
| Unread dot | circle | 4px `bg-primary-lt` (#8B5CF6) | spec |
| Message text | font | `text-sm font-medium text-white/90` | spec |
| Timestamp text | font | `text-xs text-white/40` | spec |
| Panel title | font | `text-base font-semibold text-white` | spec |
| "Mark all as read" | font | `text-xs text-primary-lt hover:text-primary` | spec |
| Dividers | border | `border-b border-white/10` | spec |
| Accept button | style | `bg-primary text-white rounded-full px-3 py-1 text-xs` | spec |
| Decline button | style | `bg-white/10 text-white/60 rounded-full px-3 py-1 text-xs` | spec |
| Dismiss X | icon | Lucide X, 16px, `text-white/40 hover:text-white/70` | spec |
| Row hover (desktop) | background | `hover:bg-white/5` | spec |
| Mobile backdrop | background | `bg-black/50` | spec |
| Mobile sheet corners | radius | `rounded-t-2xl` | spec |
| Drag handle | shape | `bg-white/30`, 32px wide, 4px tall | spec |
| Empty state title | font | `text-white text-lg font-medium` | spec |
| Empty state subtext | font | `text-white/40 text-sm` | spec |

---

## Design System Reminder

- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Navbar dropdown panels use: `bg-hero-mid border border-white/15 shadow-lg rounded-xl animate-dropdown-in`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Primary = `#6D28D9`, Primary Light = `#8B5CF6`
- Hero Mid = `#1E0B3E` (notification panel base)
- Animations respect `prefers-reduced-motion` — use `motion-safe:` prefix or check in JS
- `animate-dropdown-in` = 150ms ease-out fade + translateY(-4px → 0)
- Bell icon in navbar is a Lucide `Bell` component at `h-5 w-5`
- Mobile drawer uses `bg-hero-mid border border-white/15 shadow-lg` matching desktop dropdown
- All interactive elements: minimum 44px touch targets, visible focus outlines via `focus-visible:ring-2 focus-visible:ring-primary`

---

## Shared Data Models (from Master Plan)

```typescript
// Extend existing NotificationEntry in types/dashboard.ts
export type NotificationType =
  | 'encouragement'
  | 'friend_request'
  | 'milestone'
  | 'friend_milestone'
  | 'nudge'
  | 'weekly_recap'
  | 'level_up';

export interface NotificationEntry {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  timestamp: string;          // ISO 8601
  actionUrl?: string;         // Navigation target on tap
  actionData?: {              // Structured data for special types
    friendRequestId?: string; // For friend_request
    badgeName?: string;       // For milestone
    [key: string]: unknown;
  };
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_notifications` | Both | Notification array, max 50, newest first |
| `wr_friends` | Read + Write | Read to check "already friends" state; Write via `useFriends().acceptRequest()` |
| `wr_settings` | Read | Check notification preferences (if Spec 13 is built) |
| `wr_auth_simulated` | Read (via useAuth) | Auth state check |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Bottom sheet (full-width), backdrop overlay, swipe-to-dismiss, stacked Accept/Decline buttons, 48px min row height, drag handle bar |
| Tablet | 640-1024px | Dropdown (~320px wide), X dismiss visible, inline Accept/Decline, same max height |
| Desktop | > 1024px | Dropdown (~360px wide), right-aligned, X on hover only, hover states on rows, inline Accept/Decline |

---

## Vertical Rhythm

Not applicable — this spec adds a floating panel component (dropdown/bottom sheet), not page sections with vertical spacing.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 2 (Dashboard Shell) is complete: `AuthProvider`, navbar logged-in state with bell icon placeholder, avatar dropdown
- [ ] Spec 9 (Friends System) is complete: `useFriends()` hook with `acceptRequest()` and `declineRequest()`
- [ ] Spec 11 (Social Interactions) is complete: encouragements, nudges, milestone feed that generate notification entries
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from spec + design-system.md recon)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior specs in the sequence are complete and committed (Specs 1-11)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Panel z-index | `z-[60]` | Must render above navbar dropdown (`z-50`), audio pill/drawer, and modals |
| Mobile swipe-to-dismiss | Basic touch event handling (no library) | Spec explicitly says no swipe gesture library |
| Mobile body scroll lock | Prevent background scroll when panel open | Standard mobile bottom sheet UX |
| Mutual exclusion: bell + avatar | Bell open → close avatar; Avatar open → close bell | Spec requirement; implemented via shared state in DesktopUserActions |
| Already-added friend in request | Show "Already friends" muted text instead of buttons | Check `useFriends().friends` for matching ID |
| localStorage corruption | Re-initialize with 12 mock notifications | Spec requirement |
| Cross-tab sync | `window.addEventListener('storage', ...)` on `wr_notifications` | Spec requirement for badge count sync |
| Panel close on navigation | Close panel + mark read before `navigate()` | Edge case from spec |
| Debounce Accept/Decline | Guard with loading state per notification ID | Prevent double-tap duplicate friend additions |

---

## Implementation Steps

### Step 1: Extend Data Model & Create Notification Storage Utilities

**Objective:** Add `actionUrl` and `actionData` fields to `NotificationEntry`, create `NotificationType` type alias, and build notification storage helpers.

**Files to create/modify:**
- `frontend/src/types/dashboard.ts` — Extend `NotificationEntry` with `actionUrl` and `actionData`
- `frontend/src/mocks/notifications-mock-data.ts` — 12 mock notifications per spec
- `frontend/src/lib/notifications-storage.ts` — Storage read/write/seed helpers

**Details:**

1. In `types/dashboard.ts`, add `NotificationType` as a type alias and extend `NotificationEntry`:
   ```typescript
   export type NotificationType =
     | 'encouragement'
     | 'friend_request'
     | 'milestone'
     | 'friend_milestone'
     | 'nudge'
     | 'weekly_recap'
     | 'level_up';

   export interface NotificationEntry {
     id: string;
     type: NotificationType;
     message: string;
     read: boolean;
     timestamp: string;
     actionUrl?: string;
     actionData?: {
       friendRequestId?: string;
       badgeName?: string;
       [key: string]: unknown;
     };
   }
   ```

2. Create `mocks/notifications-mock-data.ts` with 12 mock notifications:
   - Use `crypto.randomUUID()` for IDs
   - Timestamps computed as `new Date(Date.now() - daysAgo * 86400000).toISOString()`
   - Reference mock friend names from `friends-mock-data.ts`: Sarah M., David R., Maria L., James K., Grace H., Joshua P.
   - 5 unread (ids 1-5), 7 read (ids 6-12)
   - Include `actionUrl` on all (e.g., `/friends`, `/`)
   - `friend_request` (id 2) includes `actionData.friendRequestId` matching a mock friend ID
   - Exact messages and types per spec table (Section 7)

3. Create `lib/notifications-storage.ts`:
   ```typescript
   const STORAGE_KEY = 'wr_notifications';
   const MAX_NOTIFICATIONS = 50;

   export function getNotifications(): NotificationEntry[] { ... }
   export function setNotifications(notifications: NotificationEntry[]): void { ... }
   export function seedNotificationsIfNeeded(): void { ... }
   ```
   - `getNotifications()`: Try parse `wr_notifications`. If invalid JSON or not an array, re-seed with mock data and return it.
   - `setNotifications()`: Enforce max 50 cap (trim oldest), write to localStorage.
   - `seedNotificationsIfNeeded()`: If `wr_notifications` doesn't exist, seed with mock data.

**Guardrails (DO NOT):**
- Do NOT import or use `StorageService` class — dashboard specs use direct localStorage access
- Do NOT add any UI components in this step
- Do NOT modify any existing mock data files

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getNotifications returns empty array when key missing` | unit | No localStorage key → returns [] (after seeding) |
| `getNotifications re-seeds on corrupt JSON` | unit | Invalid JSON → re-initializes with 12 mocks |
| `setNotifications enforces 50-cap` | unit | Write 55 items → only 50 stored (oldest trimmed) |
| `seedNotificationsIfNeeded creates 12 mocks` | unit | Empty localStorage → 12 entries with correct types/read states |
| `mock data has 5 unread and 7 read` | unit | Count `read === false` and `read === true` |
| `mock data includes all 7 notification types` | unit | At least one of each type present or spec-defined set |
| `mock data friend_request has actionData.friendRequestId` | unit | Verify field is present on friend_request entries |

**Expected state after completion:**
- [ ] `NotificationEntry` type extended with `actionUrl` and `actionData`
- [ ] `NotificationType` type alias exported
- [ ] 12 mock notifications matching spec exactly
- [ ] Storage helpers with corruption handling and 50-cap enforcement
- [ ] All unit tests passing

---

### Step 2: Create `useNotifications` Hook

**Objective:** Build the central hook that provides notification state and actions, with cross-tab sync.

**Files to create/modify:**
- `frontend/src/hooks/useNotifications.ts` — New hook

**Details:**

Hook signature per spec:
```typescript
export function useNotifications() {
  return {
    notifications: NotificationEntry[],  // All, newest first
    unreadCount: number,                 // Count where read === false
    markAsRead: (id: string) => void,
    markAllAsRead: () => void,
    dismiss: (id: string) => void,
    addNotification: (n: Omit<NotificationEntry, 'id'>) => void,
  }
}
```

Implementation:
- Use `useState<NotificationEntry[]>` initialized from `getNotifications()` (with seed check)
- `unreadCount` derived: `notifications.filter(n => !n.read).length`
- All mutations call `setNotifications()` then update React state
- `addNotification`: Generates `id` via `crypto.randomUUID()`, prepends to array, trims to 50
- Cross-tab sync: `useEffect` with `window.addEventListener('storage', handler)` that checks `event.key === 'wr_notifications'` and updates state from `event.newValue`
- Sort order maintained: newest first (by `timestamp` descending)

**Guardrails (DO NOT):**
- Do NOT add any UI components
- Do NOT import from other hooks (useFriends, useAuth) — this hook is pure data
- Do NOT add toast/navigation side effects — those belong in the UI layer

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `returns notifications sorted newest first` | unit | Verify ordering by timestamp descending |
| `unreadCount matches notifications with read: false` | unit | 5 unread from mock data |
| `markAsRead sets specific notification to read` | unit | Mark id → verify `read: true`, others unchanged |
| `markAllAsRead sets all to read` | unit | All `read: true` after call |
| `dismiss removes notification from array` | unit | Array length decreases by 1, ID no longer present |
| `addNotification prepends with generated ID` | unit | New item at index 0, has valid UUID |
| `addNotification enforces 50-cap` | unit | Add to 50-item list → oldest removed |
| `cross-tab sync updates state on storage event` | integration | Simulate `StorageEvent` → state updates |

**Expected state after completion:**
- [ ] `useNotifications` hook exported and functional
- [ ] All CRUD operations work correctly
- [ ] Cross-tab sync via storage events
- [ ] All tests passing

---

### Step 3: Create NotificationBell Component & Integrate into Navbar

**Objective:** Replace the placeholder bell button in `Navbar.tsx` with a functional `NotificationBell` component that shows the unread badge and toggles the panel. Implement mutual exclusion with the avatar dropdown.

**Files to create/modify:**
- `frontend/src/components/dashboard/NotificationBell.tsx` — New component (bell button + badge)
- `frontend/src/components/Navbar.tsx` — Replace bell placeholder, add mutual exclusion state

**Details:**

**NotificationBell component:**
```typescript
interface NotificationBellProps {
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
}
```

- Renders Lucide `Bell` icon (h-5 w-5) inside a `<button>`
- `aria-label` includes count: `"Notifications, ${unreadCount} unread"` (or `"Notifications"` when 0)
- `aria-expanded={isOpen}`
- `aria-haspopup="dialog"`
- Badge: Absolutely positioned `<span>` top-right (`-top-1 -right-1`), `bg-red-500 text-white text-xs font-bold`, min-width 18px, height 18px, rounded-full, centered text
- Badge displays count, or "9+" if count > 9
- Badge hidden (`hidden`) when count === 0
- Existing button classes from Navbar: `rounded-lg p-1.5 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`
- Wrap button in `relative` div for badge positioning

**Navbar integration:**

Refactor `DesktopUserActions` to manage both bell and avatar state:
- Add `const [isBellOpen, setIsBellOpen] = useState(false)` alongside existing `isOpen` (avatar)
- Bell toggle: `setIsBellOpen(prev => !prev); setIsOpen(false)` (close avatar when bell opens)
- Avatar toggle: `setIsOpen(prev => !prev); setIsBellOpen(false)` (close bell when avatar opens)
- Pass `isBellOpen` and toggle callback to `<NotificationBell>`
- Render `<NotificationPanel>` (Step 4) conditionally below NotificationBell when `isBellOpen`
- Add bell's wrapper ref to outside-click handler: if click is outside both bell wrapper AND avatar wrapper, close both
- Close bell on Escape (add to existing Escape handler)
- Close bell on route change (add to existing location effect)

**Mobile drawer:**
- In `MobileDrawer`, the bell button (line ~615-620) triggers opening the notification panel as a bottom sheet
- Add state to `MobileDrawer`: `const [isBellOpen, setIsBellOpen] = useState(false)`
- When bell tapped in drawer, close drawer first, then open bottom sheet panel
- OR: render notifications inline in the drawer as a section (simpler approach — check spec: spec says "bottom sheet on mobile" which is separate from drawer)
- Decision: Bell tap in mobile drawer → close drawer → open bottom sheet overlay

**Accessibility:**
- Bell button: `aria-label`, `aria-expanded`, `aria-haspopup="dialog"`
- Focus returns to bell button when panel closes via Escape

**Responsive behavior:**
- Desktop (> 1024px): Bell in navbar with dropdown panel
- Tablet (640-1024px): Same as desktop
- Mobile (< 640px): Bell in mobile drawer; tap opens bottom sheet

**Guardrails (DO NOT):**
- Do NOT build the notification panel in this step — just the bell + badge + toggle state
- Do NOT remove or modify the avatar dropdown behavior beyond adding mutual exclusion
- Do NOT change bell icon size or position — match existing placeholder exactly

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `bell icon renders when authenticated` | integration | Auth context with `isAuthenticated: true` → bell visible |
| `bell icon does not render when not authenticated` | integration | Auth context with `isAuthenticated: false` → no bell |
| `badge shows correct unread count` | unit | Pass unreadCount=5 → badge shows "5" |
| `badge shows "9+" when count > 9` | unit | Pass unreadCount=15 → badge shows "9+" |
| `badge hidden when unreadCount is 0` | unit | Pass unreadCount=0 → badge not visible |
| `clicking bell toggles isOpen` | integration | Click → `aria-expanded="true"`, click again → `"false"` |
| `opening bell closes avatar dropdown` | integration | Open avatar → open bell → avatar closed |
| `opening avatar closes bell panel` | integration | Open bell → open avatar → bell closed |
| `Escape closes bell panel` | integration | Open bell → press Escape → panel closed, focus on bell |
| `click outside closes bell panel` | integration | Open bell → click outside → panel closed |
| `aria-label includes unread count` | unit | `aria-label="Notifications, 5 unread"` |

**Expected state after completion:**
- [ ] Bell icon with functional badge in navbar (desktop + mobile)
- [ ] Mutual exclusion between bell and avatar dropdowns
- [ ] All keyboard and click-outside close behaviors
- [ ] Accessibility attributes correct
- [ ] All tests passing

---

### Step 4: Create NotificationPanel Component

**Objective:** Build the notification dropdown panel (desktop) / bottom sheet (mobile) with all notification types, actions, and empty state.

**Files to create/modify:**
- `frontend/src/components/dashboard/NotificationPanel.tsx` — New component (the main panel)
- `frontend/src/components/dashboard/NotificationItem.tsx` — New component (individual notification row)

**Details:**

**NotificationPanel component:**
```typescript
interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;  // Determines dropdown vs bottom sheet rendering
}
```

**Desktop rendering (dropdown):**
- Absolute positioned below bell: `absolute right-0 top-full z-[60] pt-2`
- Inner panel: `bg-hero-mid/95 backdrop-blur-md border border-white/15 shadow-lg rounded-xl`
- Width: `w-[360px]` desktop, `w-[320px]` tablet (use `lg:w-[360px] w-[320px]`)
- Max height: `max-h-[400px] overflow-y-auto`
- Entrance animation: `animate-dropdown-in` (matches avatar dropdown)
- `role="dialog"` with `aria-label="Notifications"`
- Focus trap via `useFocusTrap(isOpen, onClose)`

**Mobile rendering (bottom sheet):**
- Fixed overlay: `fixed inset-0 z-[60]`
- Backdrop: `bg-black/50` overlay, tap to close
- Sheet: `fixed bottom-0 left-0 right-0 bg-hero-mid/95 backdrop-blur-md rounded-t-2xl border-t border-white/15 shadow-lg`
- Max height: `max-h-[400px] overflow-y-auto`
- Entrance animation: slide up from bottom (300ms ease-out) — use `animate-slide-from-bottom` (already exists in tailwind config)
- Drag handle bar: centered `div` at top, `bg-white/30 w-8 h-1 rounded-full mx-auto mt-3 mb-2`
- Body scroll lock: `useEffect` to add `overflow-hidden` to `document.body` when open on mobile
- Focus trap via `useFocusTrap`

**Header:**
- Padding: `px-4 py-3`
- Left: "Notifications" in `text-base font-semibold text-white`
- Right: "Mark all as read" link in `text-xs text-primary-lt hover:text-primary` — `<button>` element
- "Mark all as read" disabled/muted when all are read: `text-white/30 cursor-default` + `disabled`
- Divider below header: `border-b border-white/10`

**Notification list:**
- `role="list"` container
- Each item: `<NotificationItem>` with `role="listitem"`

**Empty state (when `notifications.length === 0`):**
- Centered in panel content area (min-height ~200px to prevent tiny panel)
- Text block: party popper emoji (🎉) + "All caught up!" in `text-white text-lg font-medium` + "We'll let you know when something happens" in `text-white/40 text-sm`
- Vertically and horizontally centered: `flex flex-col items-center justify-center`

**NotificationItem component:**
```typescript
interface NotificationItemProps {
  notification: NotificationEntry;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcceptFriend: (notification: NotificationEntry) => void;
  onDeclineFriend: (notification: NotificationEntry) => void;
  isMobile: boolean;
  isAlreadyFriend?: boolean;  // For friend_request type
}
```

**Item layout:**
- Row: `flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors`
- Unread: `bg-white/10` + 4px dot on left edge (`bg-primary-lt rounded-full`, absolutely positioned)
- Read: `bg-transparent`
- Desktop hover: `hover:bg-white/5`
- Min height: 48px on mobile (touch target)
- Divider: `border-b border-white/10` between items (applied to container, not individual items)

**Item content:**
- Left: Emoji icon in a 32px container (`w-8 h-8 flex items-center justify-center text-xl shrink-0`)
- Center (flex-1):
  - Message: `text-sm font-medium text-white/90` (single line or 2-line clamp)
  - Timestamp: `text-xs text-white/40 mt-0.5` — uses `timeAgo(notification.timestamp)` from `lib/time.ts`
- Right (desktop): Dismiss X button — Lucide `X` icon, 16px, `text-white/40 hover:text-white/70`
  - Only visible on hover: `opacity-0 group-hover:opacity-100 transition-opacity` (add `group` to row)
  - `aria-label="Dismiss notification"`

**Type → icon mapping:**
```typescript
const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  encouragement: '🙏',
  friend_request: '👤',
  milestone: '🏆',
  friend_milestone: '🎉',
  nudge: '❤️',
  weekly_recap: '📊',
  level_up: '⬆️',
};
```

**Tap behavior (non-friend_request):**
- Click row → `onMarkAsRead(id)` → navigate to `notification.actionUrl` (use `useNavigate()`)
- Close panel before navigation (call `onClose()`)

**Friend request special behavior:**
- No navigation on tap
- Below message + timestamp, render Accept/Decline buttons:
  - Accept: `bg-primary text-white rounded-full px-3 py-1 text-xs font-medium` — `aria-label="Accept friend request from [Name]"`
  - Decline: `bg-white/10 text-white/60 rounded-full px-3 py-1 text-xs font-medium` — `aria-label="Decline friend request from [Name]"`
  - Desktop: inline side-by-side (`flex gap-2 mt-2`)
  - Mobile: full-width stacked (`flex flex-col gap-2 mt-2`)
- Accept: calls `onAcceptFriend(notification)` → parent uses `useFriends().acceptRequest()`, removes notification, shows toast
- Decline: calls `onDeclineFriend(notification)` → parent removes notification silently
- Already friends: Replace buttons with "Already friends" in `text-xs text-white/40 mt-2`
- Guard against double-tap: disable buttons after first click (use local loading state per notification)

**Mobile swipe-to-dismiss:**
- Implement with `onTouchStart`, `onTouchMove`, `onTouchEnd` on each item
- Track horizontal swipe distance; threshold: 80px left
- During swipe: translate item left, reveal red dismiss indicator behind
- On threshold reached + release: animate item out (200ms slide left + opacity 0), then call `onDismiss`
- On insufficient swipe: spring back to original position
- No X button on mobile (spec: "No X dismiss button per row — swipe instead")
- Respect `prefers-reduced-motion`: instant dismiss (no animation)

**Panel entrance animation:**
- Desktop: `motion-safe:animate-dropdown-in` → `motion-reduce:` just show
- Mobile: `motion-safe:animate-slide-from-bottom` → `motion-reduce:` just show
- Optional: stagger-fade notification items (50ms between items) — implement with inline `style={{ animationDelay: ${index * 50}ms }}` and a fade-in animation. Skip if `prefers-reduced-motion`.

**Dismiss animation:**
- Item slides out left (200ms): `translate-x-[-100%] opacity-0 transition-all duration-200`
- After animation, remove from array (use `setTimeout` or `onTransitionEnd`)

**Screen reader announcement:**
- On panel open: `aria-live="polite"` region announces "[N] unread notifications"

**`prefers-reduced-motion`:**
- All animations instant (no entrance animation, no stagger, no slide-out)
- Check via `window.matchMedia('(prefers-reduced-motion: reduce)')` or Tailwind `motion-safe:` / `motion-reduce:` classes

**Guardrails (DO NOT):**
- Do NOT modify Toast.tsx — use existing `showToast()` as-is
- Do NOT add real navigation logic inside NotificationItem — pass callbacks up
- Do NOT use `dangerouslySetInnerHTML` for notification messages
- Do NOT add a swipe gesture library — use raw touch events

**Responsive behavior:**
- Desktop (> 1024px): Dropdown 360px, X on hover, inline Accept/Decline, `hover:bg-white/5`
- Tablet (640-1024px): Dropdown 320px, X always visible, inline Accept/Decline
- Mobile (< 640px): Bottom sheet full-width, backdrop, drag handle, swipe-to-dismiss, stacked buttons, 48px rows

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders all 12 mock notifications` | integration | Panel open → 12 items visible |
| `renders correct icon for each notification type` | unit | Each type → correct emoji |
| `unread notifications have brighter background` | unit | Check `bg-white/10` class on unread items |
| `unread notifications show dot indicator` | unit | 4px dot with `bg-primary-lt` class |
| `read notifications have transparent background` | unit | No `bg-white/10` class |
| `tapping non-friend_request marks as read and navigates` | integration | Click → markAsRead called, navigate called |
| `friend_request shows Accept/Decline buttons` | unit | Type=friend_request → buttons visible |
| `Accept calls onAcceptFriend and shows toast` | integration | Click Accept → callback fired |
| `Decline calls onDeclineFriend (no toast)` | integration | Click Decline → callback fired, no toast |
| `already-friend shows "Already friends" text` | unit | `isAlreadyFriend=true` → muted text, no buttons |
| `"Mark all as read" sets all to read` | integration | Click → all items lose unread styling |
| `"Mark all as read" disabled when all read` | unit | All read → button disabled, muted color |
| `dismiss removes notification` | integration | Click X → item removed from list |
| `empty state renders when no notifications` | unit | Empty array → "All caught up!" message |
| `panel has role="dialog" and aria-label` | unit | Accessibility attributes present |
| `focus trapped within panel` | integration | Tab cycles within panel, doesn't escape |
| `Escape closes panel` | integration | Press Escape → onClose called |
| `mobile: bottom sheet with backdrop` | unit | isMobile=true → backdrop + sheet rendering |
| `mobile: tap backdrop closes panel` | integration | Click backdrop → onClose called |
| `mobile: drag handle visible` | unit | isMobile=true → drag handle element present |
| `mobile: swipe left dismisses notification` | integration | Simulate touch events → item dismissed |
| `mobile: no X dismiss button` | unit | isMobile=true → no X button on items |
| `mobile: Accept/Decline buttons stacked` | unit | isMobile=true → flex-col layout |
| `panel closes before navigation on item tap` | integration | Click item → onClose called before navigate |
| `screen reader announcement on open` | unit | aria-live region with unread count |

**Expected state after completion:**
- [ ] Full notification panel with all 7 types rendering correctly
- [ ] Desktop dropdown and mobile bottom sheet modes
- [ ] All actions working: mark read, mark all read, dismiss, accept/decline friend request
- [ ] Empty state rendering
- [ ] Swipe-to-dismiss on mobile
- [ ] Accessibility: focus trap, ARIA, screen reader announcements
- [ ] Reduced motion support
- [ ] All tests passing

---

### Step 5: Wire NotificationPanel into Navbar & Handle Side Effects

**Objective:** Connect the NotificationPanel to the Navbar, wire up friend request actions with `useFriends()`, and handle navigation + toast side effects.

**Files to create/modify:**
- `frontend/src/components/Navbar.tsx` — Wire panel into DesktopUserActions and MobileDrawer

**Details:**

**DesktopUserActions integration:**
- Import `useNotifications`, `useToast`, `useFriends`, `NotificationPanel`, `NotificationBell`
- Get `{ notifications, unreadCount, markAsRead, markAllAsRead, dismiss, addNotification }` from `useNotifications()`
- Get `{ friends, acceptRequest }` from `useFriends()`
- Get `{ showToast }` from `useToast()`
- Render `<NotificationBell unreadCount={unreadCount} isOpen={isBellOpen} onToggle={toggleBell} />`
- Render `<NotificationPanel>` when `isBellOpen`, positioned inside the bell's wrapper div
- Pass `isMobile={false}` to panel

**Action handlers (in DesktopUserActions):**
```typescript
const handleNotificationTap = (notification: NotificationEntry) => {
  markAsRead(notification.id);
  setIsBellOpen(false);
  if (notification.actionUrl) {
    navigate(notification.actionUrl);
  }
};

const handleAcceptFriend = (notification: NotificationEntry) => {
  const friendId = notification.actionData?.friendRequestId;
  if (friendId) {
    acceptRequest(friendId);
    dismiss(notification.id);
    // Extract name from message: "David R. wants to be your friend"
    const name = notification.message.split(' wants to')[0] || 'Friend';
    showToast(`You and ${name} are now friends!`);
  }
};

const handleDeclineFriend = (notification: NotificationEntry) => {
  dismiss(notification.id);
};
```

**Already-friend check:**
- For each `friend_request` notification, check if `notification.actionData?.friendRequestId` is in `friends.map(f => f.id)`
- Pass `isAlreadyFriend` prop to `NotificationItem`

**Mobile bottom sheet integration:**
- In `MobileDrawer`, the bell button currently just shows a label
- On bell tap in drawer: close drawer (`onClose()`), then show mobile bottom sheet
- The mobile bottom sheet needs to be rendered OUTSIDE the drawer (at Navbar level or App level) to avoid z-index issues
- Option: Lift mobile notification panel state to `Navbar` component, render a conditional mobile `<NotificationPanel isMobile={true}>` portal-style at the end of Navbar
- Use `isMobile` detection: `const isMobile = window.innerWidth < 640` or `useMediaQuery` pattern (check `matchMedia('(max-width: 639px)')`)

**Mobile width detection:**
- Create a simple check: `const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 639px)').matches)`
- Add `matchMedia` listener for resize tracking
- Pass `isMobile` to panel

**Guardrails (DO NOT):**
- Do NOT modify `useFriends()` hook — call its existing API
- Do NOT modify `Toast.tsx` — use existing `showToast()`
- Do NOT add new routes
- Do NOT duplicate the `useNotifications` hook call — share via props or context if needed

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `notification tap marks as read and navigates` | integration | Full Navbar render → click notification → verify navigate called |
| `accept friend request calls useFriends.acceptRequest` | integration | Click Accept → acceptRequest called with correct ID |
| `accept friend request shows toast` | integration | Click Accept → showToast called with "You and [Name] are now friends!" |
| `decline friend request dismisses silently` | integration | Click Decline → notification removed, no toast |
| `panel closes on navigation` | integration | Click notification with actionUrl → panel closed |
| `mobile bell tap closes drawer and opens bottom sheet` | integration | Mobile render → tap bell in drawer → drawer closes, sheet opens |
| `isMobile detection works` | unit | matchMedia mock → correct boolean |

**Expected state after completion:**
- [ ] Full notification system working in desktop navbar
- [ ] Mobile bottom sheet accessible from mobile drawer
- [ ] Friend request Accept/Decline wired to useFriends
- [ ] Toast on friend acceptance
- [ ] Navigation on notification tap
- [ ] All tests passing

---

### Step 6: Push Notification Stubs in Settings

**Objective:** Add the push notification toggle stub to the settings page (if Spec 13 is built) or document integration point.

**Files to create/modify:**
- `frontend/src/hooks/useNotifications.ts` — Add `getPushPermission()` and `setPushPermission()` utilities (or integrate into settings data model)

**Details:**

**If Spec 13 (Settings) is already built:**
- The settings page should already have a "Push notifications" toggle in the Notifications section
- Toggle reads/writes `wr_settings.notifications.pushNotifications` (boolean)
- Ensure the toggle does NOT call `Notification.requestPermission()` or register service workers
- On toggle ON: show info text "Enable push notifications to get updates even when you're away" — purely informational, no browser API calls
- Flag stored for Phase 3 implementation

**If Spec 13 is NOT yet built:**
- Create a simple utility in `lib/notifications-storage.ts`:
  ```typescript
  export function getPushNotificationFlag(): boolean {
    try {
      const settings = JSON.parse(localStorage.getItem('wr_settings') || '{}');
      return settings?.notifications?.pushNotifications ?? false;
    } catch { return false; }
  }

  export function setPushNotificationFlag(enabled: boolean): void {
    try {
      const settings = JSON.parse(localStorage.getItem('wr_settings') || '{}');
      if (!settings.notifications) settings.notifications = {};
      settings.notifications.pushNotifications = enabled;
      localStorage.setItem('wr_settings', JSON.stringify(settings));
    } catch { /* ignore */ }
  }
  ```
- This will be consumed by Spec 13's Settings page when built

**Guardrails (DO NOT):**
- Do NOT call `Notification.requestPermission()` or any browser push API
- Do NOT register service workers
- Do NOT add FCM/APNS integration

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getPushNotificationFlag returns false by default` | unit | No settings → false |
| `setPushNotificationFlag persists to wr_settings` | unit | Set true → read back true |
| `toggle does NOT call Notification.requestPermission` | unit | Mock and verify never called |

**Expected state after completion:**
- [ ] Push notification flag read/write utilities available
- [ ] No browser push API calls
- [ ] All tests passing

---

### Step 7: Edge Case Handling & Polish

**Objective:** Handle all edge cases from the spec: rapid-click guards, panel-open scroll lock, new notification while panel open, and bell badge animation.

**Files to modify:**
- `frontend/src/components/dashboard/NotificationPanel.tsx` — Scroll lock, new notification handling
- `frontend/src/components/dashboard/NotificationItem.tsx` — Double-tap guard
- `frontend/src/components/dashboard/NotificationBell.tsx` — Optional bell shake animation

**Details:**

1. **Mobile body scroll lock:** When panel is open on mobile, add `overflow-hidden` to `document.body`. Remove on close. Use `useEffect` cleanup.

2. **Rapid-click guard on Accept/Decline:** Add `processingId` state (string | null). When Accept/Decline clicked, set `processingId` to notification ID. Disable buttons for that notification while processing. Reset after action completes.

3. **New notification while panel is open:** Already handled by `useNotifications` cross-tab sync. New items from `storage` event will update `notifications` state, causing re-render with new item at top. Add `motion-safe:animate-fade-in` to newly prepended items (use a `Set<string>` of known IDs to detect new ones).

4. **Panel z-index:** Verify `z-[60]` is above all other floating elements. Avatar dropdown uses `z-50`.

5. **Optional bell shake animation:** When `unreadCount` increases (new notification arrives), briefly animate the bell. Add a subtle CSS animation:
   ```css
   @keyframes bell-ring {
     0%, 100% { transform: rotate(0); }
     25% { transform: rotate(10deg); }
     50% { transform: rotate(-10deg); }
     75% { transform: rotate(5deg); }
   }
   ```
   Add to tailwind config as `animate-bell-ring: 'bell-ring 300ms ease-in-out'`. Trigger via a `useEffect` watching `unreadCount`. Apply `motion-safe:animate-bell-ring` class briefly (remove after 300ms). This is marked optional in the spec — implement only if time permits.

6. **Custom scrollbar:** Add `scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent` to the panel scroll area (if `tailwind-scrollbar` plugin is available). Otherwise, add custom CSS: `::-webkit-scrollbar { width: 6px }` etc. Or use `overflow-y-auto` with `scrollbar-gutter: stable` to prevent layout shift.

7. **Midnight timestamp:** Already handled by `timeAgo()` from `lib/time.ts`. No additional work needed.

8. **localStorage not available:** Wrap all localStorage calls in try/catch (already in storage helpers). If unavailable, `getNotifications()` returns `[]`. Panel shows empty state. No crash.

**Guardrails (DO NOT):**
- Do NOT add external dependencies for scroll lock or animations
- Do NOT override global scroll behavior permanently — always cleanup in useEffect

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `mobile scroll lock: body gets overflow-hidden when panel open` | integration | Open panel on mobile → body has class |
| `mobile scroll lock: body restored when panel closes` | integration | Close panel → body class removed |
| `rapid-click: Accept button disabled after first click` | integration | Click Accept → button disabled |
| `localStorage unavailable: graceful degradation` | unit | Mock localStorage.getItem to throw → returns [] |
| `z-index: panel renders above other content` | unit | Check z-[60] class on panel |

**Expected state after completion:**
- [ ] All edge cases handled
- [ ] Mobile scroll lock working
- [ ] Double-tap prevention on friend request actions
- [ ] Graceful localStorage fallback
- [ ] All tests passing

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Data model, mock data, storage utilities |
| 2 | 1 | useNotifications hook (consumes storage utilities) |
| 3 | 2 | NotificationBell component + Navbar integration |
| 4 | 1, 2 | NotificationPanel + NotificationItem components |
| 5 | 2, 3, 4 | Wire panel into Navbar, connect useFriends + toast |
| 6 | 1 | Push notification stubs (independent of UI) |
| 7 | 3, 4, 5 | Edge cases and polish |

**Parallelizable:** Steps 3 and 4 can be worked on concurrently (bell and panel are separate components). Step 6 is independent of Steps 3-5.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Data Model & Storage Utilities | [COMPLETE] | 2026-03-18 | Extended `NotificationEntry` in `types/dashboard.ts` with `actionUrl`, `actionData`, `NotificationType`. Created `mocks/notifications-mock-data.ts` (12 mocks). Created `lib/notifications-storage.ts` with corruption recovery via `forceSetMockData()`. Tests: `lib/__tests__/notifications-storage.test.ts` (13 tests). |
| 2 | useNotifications Hook | [COMPLETE] | 2026-03-18 | Created `hooks/useNotifications.ts` with CRUD operations, 50-cap enforcement, cross-tab sync. Tests: `hooks/__tests__/useNotifications.test.ts` (9 tests). |
| 3 | NotificationBell & Navbar Integration | [COMPLETE] | 2026-03-18 | Created `NotificationBell.tsx`. Refactored `DesktopUserActions` in `Navbar.tsx` with mutual exclusion (bell ↔ avatar). Updated Navbar test assertions to regex for dynamic aria-label. Tests: `NotificationBell.test.tsx` (9 tests), `Navbar.test.tsx` (45 tests). |
| 4 | NotificationPanel Component | [COMPLETE] | 2026-03-18 | Created `NotificationPanel.tsx` (desktop dropdown + mobile bottom sheet, focus trap, scroll lock, empty state, a11y). Created `NotificationItem.tsx` (7 type icons, swipe-to-dismiss, friend request Accept/Decline, dismiss animation). Tests: `NotificationPanel.test.tsx` (22 tests). |
| 5 | Wire Panel into Navbar & Side Effects | [COMPLETE] | 2026-03-18 | Wired `NotificationPanel` into `DesktopUserActions` with `useFriends().acceptRequest`, `useToast().showToast`, and `navigate()`. Added mobile bottom sheet via `isMobileBellOpen` state in `Navbar`, `onBellTap` prop on `MobileDrawer`. All 45 Navbar + 53 notification tests pass. |
| 6 | Push Notification Stubs | [COMPLETE] | 2026-03-18 | Added `getPushNotificationFlag()` and `setPushNotificationFlag()` to `lib/notifications-storage.ts`. Reads/writes `wr_settings.notifications.pushNotifications`. No browser push API calls. Tests: 3 new tests in `notifications-storage.test.ts` (16 total). |
| 7 | Edge Cases & Polish | [COMPLETE] | 2026-03-18 | Added bell-ring animation to tailwind config + `NotificationBell`. Added `scrollbar-gutter: stable` to panel scroll. Mobile scroll lock, rapid-click guard, z-[60], localStorage fallback all already implemented. Tests: `NotificationEdgeCases.test.tsx` (7 tests). All 108 notification tests pass. |
