# Implementation Plan: Settings & Privacy

**Spec:** `_specs/settings-privacy.md`
**Date:** 2026-03-18
**Branch:** `claude/feature/settings-privacy`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (new page, no external recon)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded — Spec 13 of 16)

---

## Architecture Context

### Relevant Existing Files and Patterns

**Auth system:**
- `frontend/src/contexts/AuthContext.tsx` — `AuthProvider` with `{ isAuthenticated, user: { name, id } | null, login, logout }`. Simulated auth via `wr_auth_simulated`, `wr_user_name`, `wr_user_id` localStorage keys.
- `frontend/src/hooks/useAuth.ts` — Re-exports `useAuth` and `AuthContextValue` from AuthContext.
- Protected page pattern: `Friends.tsx` and `Insights.tsx` both use `if (!isAuthenticated) return <Navigate to="/" replace />` at the top of the component.

**Router:**
- `frontend/src/App.tsx` — Routes defined inside `<AuthProvider>` → `<ToastProvider>` → `<AuthModalProvider>` → `<AudioProvider>` → `<Routes>`. The `/settings` route needs to be added here.

**Navbar:**
- `frontend/src/components/Navbar.tsx` — `AVATAR_MENU_LINKS` array already includes `{ label: 'Settings', to: '/settings' }`. No Navbar changes needed.

**Dashboard card pattern:**
- `frontend/src/components/dashboard/DashboardCard.tsx` — Frosted glass card: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`. Section-based with `aria-labelledby`. Used as a reference for settings section cards, but settings cards don't need collapse behavior.

**Toast system:**
- `frontend/src/components/ui/Toast.tsx` — `useToast()` returns `{ showToast(message, type?) }`. Standard types: `'success' | 'error'`. 6s auto-dismiss. Also `useToastSafe()` for components outside provider tree.

**Focus trap:**
- `frontend/src/hooks/useFocusTrap.ts` — `useFocusTrap(isActive, onEscape)` returns `containerRef`. Handles Tab cycling, Escape key, restores previous focus on close.

**Friends data:**
- `frontend/src/hooks/useFriends.ts` — Returns `{ blocked: string[], blockUser, ... }`. Data persisted via `frontend/src/services/friends-storage.ts`.
- `frontend/src/types/dashboard.ts` — `FriendsData.blocked: string[]` (array of user IDs).
- Mock users in `frontend/src/mocks/friends-mock-data.ts` — `ALL_MOCK_USERS` has `FriendProfile` objects with `id`, `displayName`, `avatar`.

**Settings storage (existing partial):**
- `frontend/src/lib/notifications-storage.ts` — Already reads/writes `wr_settings.notifications.pushNotifications` via `getPushNotificationFlag()`/`setPushNotificationFlag()`. The settings service must be compatible with this existing code.

**Test patterns:**
- `DashboardCard.test.tsx`: `render()` with `<MemoryRouter>`, `beforeEach(() => localStorage.clear())`, `userEvent.setup()`, query by role/text.
- Auth-gated tests: Set `localStorage.setItem('wr_auth_simulated', 'true')` and `localStorage.setItem('wr_user_name', 'Test')` before render, wrap in `<AuthProvider>`.
- Provider wrapping: `<MemoryRouter>` → `<AuthProvider>` → `<ToastProvider>` → component.

**Directory conventions:**
- Pages: `frontend/src/pages/` (e.g., `Friends.tsx`, `Insights.tsx`, `Dashboard.tsx`)
- Components: `frontend/src/components/{feature}/` (e.g., `components/dashboard/`, `components/friends/`, `components/insights/`)
- Hooks: `frontend/src/hooks/`
- Services: `frontend/src/services/`
- Types: `frontend/src/types/`
- Tests: Co-located in `__tests__/` directories next to source files

### Cross-spec Dependencies (from Master Plan)

- **Spec 2 (Dashboard Shell)**: Provides `AuthProvider`, avatar dropdown with "Settings" link, `DashboardCard` — all built ✅
- **Spec 9 (Friends System)**: Provides `wr_friends` with `blocked` array, `useFriends()` hook — built ✅
- **Spec 10 (Leaderboard)**: Reads `privacy.showOnGlobalLeaderboard` from `wr_settings` — this spec writes it
- **Spec 11 (Social Interactions)**: Reads `privacy.nudgePermission` from `wr_settings` — this spec writes it
- **Spec 12 (Notification System)**: Reads notification toggles from `wr_settings.notifications` — this spec writes them. Also, existing `notifications-storage.ts` already reads/writes `wr_settings.notifications.pushNotifications`.
- **Spec 14 (Profile & Avatars)**: Provides avatar picker — this spec stubs the "Change" button

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Access `/settings` route | Entire page requires auth | Step 1 | `useAuth()` + `<Navigate to="/" replace />` |
| Edit display name | N/A when page inaccessible | Step 3 | Page-level auth gate |
| Avatar "Change" button | N/A when page inaccessible | Step 3 | Page-level auth gate |
| Edit bio | N/A when page inaccessible | Step 3 | Page-level auth gate |
| Toggle notification settings | N/A when page inaccessible | Step 4 | Page-level auth gate |
| Change privacy settings | N/A when page inaccessible | Step 5 | Page-level auth gate |
| Unblock users | N/A when page inaccessible | Step 5 | Page-level auth gate |
| Delete account | N/A when page inaccessible | Step 6 | Page-level auth gate |

Since the entire `/settings` route is auth-gated at the page level, individual elements don't need separate auth checks.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | gradient | `bg-[#0f0a1e]` (solid dark) matching Friends/Dashboard pages | Friends.tsx line 67, codebase |
| Page header | gradient | `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]` | Friends.tsx line 77 |
| Frosted glass card | classes | `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6` | DashboardCard.tsx line 71 |
| Card title | classes | `text-base font-semibold text-white md:text-lg` | DashboardCard.tsx line 84 |
| Primary accent | hex | `#6D28D9` / Tailwind `primary` | design-system.md |
| Primary light | hex | `#8B5CF6` / Tailwind `primary-lt` | design-system.md |
| Body font | family | Inter / `font-sans` | design-system.md |
| Hero dark | hex | `#0D0620` / Tailwind `hero-dark` | design-system.md |
| Hero mid | hex | `#1E0B3E` / Tailwind `hero-mid` | design-system.md |
| Text white | opacity levels | `text-white`, `text-white/80`, `text-white/70`, `text-white/40` | spec + design-system.md |
| Input field | classes | `bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/50` | spec (new pattern) |
| Toggle ON | background | `bg-primary` (`#6D28D9`) | spec |
| Toggle OFF | background | `bg-white/20` | spec |
| Radio pill selected | classes | `bg-primary/20 border-primary text-white` | spec |
| Radio pill unselected | classes | `bg-white/5 border-white/15 text-white/60` | spec |
| Danger button | classes | `bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30` | spec |
| Danger confirm | classes | `bg-red-500 text-white` | spec |
| Modal backdrop | classes | `bg-black/60` | spec |
| Divider | classes | `border-t border-white/10` | spec |
| Group header | classes | `text-xs text-white/40 uppercase tracking-wider` | spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Dashboard/Growth pages use all-dark theme: `bg-[#0f0a1e]` page background, NOT `bg-neutral-bg`
- Frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Use Inter (`font-sans`) throughout — no serif (Lora) or script (Caveat) on settings page
- Primary accent: `#6D28D9` / Tailwind `primary` for active states, toggle ON, selected pills
- Worship Room uses `useToastSafe()` for components that may render outside `ToastProvider`; within pages wrapped by `ToastProvider`, use `useToast()`
- The navbar overlay pattern uses `<Navbar transparent />` on dark-background pages (e.g., Friends.tsx, Dashboard.tsx)
- Page header pattern from Friends/Insights: `pt-24 pb-6 md:pt-28 md:pb-8` with `mx-auto max-w-4xl px-4 sm:px-6`
- Minimum 44px touch targets on all interactive elements
- `prefers-reduced-motion`: all animations instant
- Focus visible: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`

---

## Shared Data Models (from Master Plan)

```typescript
// UserSettings — the data model this spec owns
interface UserSettings {
  profile: {
    displayName: string        // 2-30 chars, alphanumeric + spaces
    avatarId: string           // Preset avatar ID or 'custom'
    avatarUrl?: string         // Base64 data URL (Spec 14)
    bio?: string               // Optional, max 160 chars
    email?: string             // Display only, default "user@example.com"
  }
  notifications: {
    inAppNotifications: boolean         // default: true
    pushNotifications: boolean          // default: false (stub)
    emailWeeklyDigest: boolean          // default: true (stub)
    emailMonthlyReport: boolean         // default: true (stub)
    encouragements: boolean             // default: true
    milestones: boolean                 // default: true
    friendRequests: boolean             // default: true
    nudges: boolean                     // default: true
    weeklyRecap: boolean                // default: true
  }
  privacy: {
    showOnGlobalLeaderboard: boolean    // default: true
    activityStatus: boolean             // default: true
    nudgePermission: 'everyone' | 'friends' | 'nobody'   // default: 'friends'
    streakVisibility: 'everyone' | 'friends' | 'only_me'  // default: 'friends'
    blockedUsers: string[]              // array of user IDs
  }
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_settings` | Both | Primary settings store (this spec owns it) |
| `wr_user_name` | Both | Synced with `profile.displayName` on save |
| `wr_auth_simulated` | Read | Auth state check |
| `wr_user_id` | Read | Current user ID |
| `wr_friends` | Both | Syncs `blockedUsers` on unblock |
| `wr_*` (all) | Write (delete) | Delete account clears ALL `wr_` prefixed keys |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Top horizontal tabs (4), full-width content, stacked toggle rows, radio pills 3-across, modal full-width with `mx-4` |
| Tablet | 640-1024px | Left sidebar (~200px) + content panel, single-line toggle rows, modal centered ~400px |
| Desktop | > 1024px | Left sidebar (~240px) + content panel (~640px max-width), generous spacing, hover states |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Page header → content area | 24-32px (`pb-6 md:pb-8`) | Friends.tsx header pattern |
| Section card → next section card | 24px (`space-y-6`) | spec: 32px mobile between sections → using `space-y-6` |
| Fields within a section | 16px (`space-y-4`) | spec: 16px between fields |
| Toggle groups within section | 24px (`space-y-6`) with divider | spec: 24px between groups |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] AuthProvider and auth gating pattern established (Spec 2 complete)
- [x] Friends system with `blocked` array built (Spec 9 complete)
- [x] Notification system reads from `wr_settings.notifications` (Spec 12 complete)
- [x] `notifications-storage.ts` already reads/writes to `wr_settings` — settings service must be compatible
- [x] All auth-gated actions from the spec are accounted for (page-level gate covers all)
- [x] Design system values verified from codebase inspection and design-system.md
- [x] Prior specs (1-12) in the sequence are complete and committed
- [ ] `wr_friends` has mock data with blocked users for testing unblock flow — may need to seed test data

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Section switching | Swap rendered section (not scroll-to) | Simpler, cleaner UX; each section can be independently lazy |
| Settings auto-save | Debounced on change, not on blur for toggles | Toggles should save immediately; text inputs save on blur per spec |
| Settings initialization | Lazy init on first Settings page visit | Don't create `wr_settings` until user visits settings; other specs read with `?? default` fallback |
| Delete account: key iteration | `Object.keys(localStorage).filter(k => k.startsWith('wr_'))` | Future-proof per spec — catches any new `wr_` keys |
| Blocked users display names | Look up from `ALL_MOCK_USERS` by ID | Frontend-first with mock data; Phase 3 will use API |
| `wr_settings` compatibility with notifications-storage.ts | Settings service does deep merge, never overwrites entire object | Prevents clobbering `notifications.pushNotifications` written by existing code |

---

## Implementation Steps

### Step 1: Settings Page Shell, Route, and Section Navigation

**Objective:** Create the `/settings` page with auth gating, dark theme, and section navigation (sidebar desktop / tabs mobile).

**Files to create/modify:**
- `frontend/src/pages/Settings.tsx` — New page component
- `frontend/src/App.tsx` — Add `/settings` route

**Details:**

Create `Settings.tsx` following the `Friends.tsx` pattern:
- Auth gate: `const { isAuthenticated, user } = useAuth()` → `if (!isAuthenticated) return <Navigate to="/" replace />`
- Page background: `<div className="min-h-screen bg-[#0f0a1e]">`
- Skip to content link (same pattern as Friends.tsx)
- `<Navbar transparent />` for dark background overlay
- Page header: `<header className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8">`
- Back link to `/` (dashboard) using `<Link>` + `<ArrowLeft>` icon, same as Friends.tsx
- Page title: `<h1 className="text-2xl font-bold text-white md:text-3xl">Settings</h1>`
- `document.title = 'Settings'` via `useEffect`
- `<DevAuthToggle />` at bottom (dev mode only, same pattern as Friends/Insights)
- `<SiteFooter />` at bottom

**Section navigation (responsive):**

Desktop/Tablet (≥ 640px):
```tsx
<nav role="navigation" aria-label="Settings" className="hidden sm:block w-[200px] lg:w-[240px] shrink-0">
  {sections.map(s => (
    <button
      key={s.id}
      onClick={() => setActiveSection(s.id)}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
        activeSection === s.id
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:text-white/80 hover:bg-white/5'
      )}
    >
      {s.label}
    </button>
  ))}
</nav>
```

Mobile (< 640px):
```tsx
<div role="tablist" aria-label="Settings sections" className="sm:hidden flex border-b border-white/10">
  {sections.map(s => (
    <button
      key={s.id}
      role="tab"
      aria-selected={activeSection === s.id}
      aria-controls={`settings-panel-${s.id}`}
      onClick={() => setActiveSection(s.id)}
      className={cn(
        'flex-1 py-3 text-sm font-medium text-center transition-colors',
        activeSection === s.id
          ? 'text-white border-b-2 border-primary'
          : 'text-white/50'
      )}
    >
      {s.label}
    </button>
  ))}
</div>
```

Content panel wrapped in `<div role="tabpanel" id="settings-panel-{activeSection}" className="flex-1 max-w-[640px]">`.

Section IDs: `'profile' | 'notifications' | 'privacy' | 'account'`

In `App.tsx`, add route: `<Route path="/settings" element={<Settings />} />`

**Auth gating:**
- Page-level: `if (!isAuthenticated) return <Navigate to="/" replace />`

**Responsive behavior:**
- Desktop (> 1024px): Sidebar 240px + content panel ~640px max-width, centered in remaining space
- Tablet (640-1024px): Sidebar 200px + content adjusts
- Mobile (< 640px): Top horizontal tabs, full-width content below

**Guardrails (DO NOT):**
- Do NOT create sub-routes (all sections on single page)
- Do NOT render content when logged out — redirect immediately
- Do NOT use `role="tablist"` on desktop sidebar — use `role="navigation"` (it's nav, not tabs, on desktop)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Redirects to `/` when not authenticated | integration | Render `<Settings>` without auth → expect `Navigate` to `/` |
| Renders page when authenticated | integration | Set auth in localStorage → renders "Settings" heading |
| Browser tab title is "Settings" | unit | Check `document.title` after render |
| Desktop: sidebar with 4 nav items | unit | Verify `role="navigation"` with 4 buttons |
| Mobile: tab bar with 4 tabs | unit | At `<640px`, verify `role="tablist"` with 4 `role="tab"` elements |
| Clicking nav/tab switches section content | integration | Click "Notifications" → notifications section visible |
| Active sidebar item has highlighted background | unit | Active button has `bg-white/10` class |
| Active mobile tab has underline | unit | Active tab has `border-primary` |
| `aria-selected` on mobile tabs | unit | Only active tab has `aria-selected="true"` |

**Expected state after completion:**
- [ ] `/settings` route exists and is protected
- [ ] Page renders with dark theme, section navigation
- [ ] Desktop sidebar + mobile tabs both functional
- [ ] Placeholder content per section ("Profile section coming in Step 3", etc.)

---

### Step 2: Settings Storage Service and UserSettings Type

**Objective:** Create the settings data layer — TypeScript types, default values, localStorage read/write service with corruption handling and cross-tab sync.

**Files to create/modify:**
- `frontend/src/types/settings.ts` — New type definitions
- `frontend/src/services/settings-storage.ts` — New storage service
- `frontend/src/hooks/useSettings.ts` — New hook for reactive settings state

**Details:**

`types/settings.ts`:
```typescript
export type NudgePermission = 'everyone' | 'friends' | 'nobody'
export type StreakVisibility = 'everyone' | 'friends' | 'only_me'

export interface UserSettingsProfile {
  displayName: string
  avatarId: string
  avatarUrl?: string
  bio?: string
  email?: string
}

export interface UserSettingsNotifications {
  inAppNotifications: boolean
  pushNotifications: boolean
  emailWeeklyDigest: boolean
  emailMonthlyReport: boolean
  encouragements: boolean
  milestones: boolean
  friendRequests: boolean
  nudges: boolean
  weeklyRecap: boolean
}

export interface UserSettingsPrivacy {
  showOnGlobalLeaderboard: boolean
  activityStatus: boolean
  nudgePermission: NudgePermission
  streakVisibility: StreakVisibility
  blockedUsers: string[]
}

export interface UserSettings {
  profile: UserSettingsProfile
  notifications: UserSettingsNotifications
  privacy: UserSettingsPrivacy
}
```

`services/settings-storage.ts`:
- `SETTINGS_KEY = 'wr_settings'`
- `DEFAULT_SETTINGS` constant with all defaults from spec
- `getSettings(): UserSettings` — reads from localStorage, deep-merges with defaults (handles missing keys from partial saves by other specs like `notifications-storage.ts`), handles corrupted JSON by returning defaults
- `saveSettings(settings: UserSettings): void` — writes full object to localStorage
- `updateSettings(partial: DeepPartial<UserSettings>): UserSettings` — deep merges partial updates into existing settings, saves, returns updated
- **Compatibility with `notifications-storage.ts`**: The existing `setPushNotificationFlag()` writes directly to `wr_settings.notifications.pushNotifications`. `getSettings()` must deep-merge with defaults so it picks up values written by other code.

`hooks/useSettings.ts`:
```typescript
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => getSettings())

  const updateProfile = useCallback((updates: Partial<UserSettingsProfile>) => {
    setSettings(prev => {
      const next = { ...prev, profile: { ...prev.profile, ...updates } }
      saveSettings(next)
      return next
    })
  }, [])

  const updateNotifications = useCallback((key: keyof UserSettingsNotifications, value: boolean) => {
    setSettings(prev => {
      const next = { ...prev, notifications: { ...prev.notifications, [key]: value } }
      saveSettings(next)
      return next
    })
  }, [])

  const updatePrivacy = useCallback((updates: Partial<Omit<UserSettingsPrivacy, 'blockedUsers'>>) => {
    setSettings(prev => {
      const next = { ...prev, privacy: { ...prev.privacy, ...updates } }
      saveSettings(next)
      return next
    })
  }, [])

  const unblockUser = useCallback((userId: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        privacy: {
          ...prev.privacy,
          blockedUsers: prev.privacy.blockedUsers.filter(id => id !== userId)
        }
      }
      saveSettings(next)
      return next
    })
  }, [])

  // Cross-tab sync
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === SETTINGS_KEY) {
        setSettings(getSettings())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return { settings, updateProfile, updateNotifications, updatePrivacy, unblockUser }
}
```

**Default initialization**: `getSettings()` returns defaults if `wr_settings` doesn't exist. It does NOT write to localStorage on read — only write happens on explicit user action.

**Guardrails (DO NOT):**
- Do NOT initialize `wr_settings` in localStorage on page load — other specs read with `?? default` pattern
- Do NOT use `JSON.parse(localStorage.getItem(key)!)` — always handle null/undefined
- Do NOT clobber existing `wr_settings` data — always deep-merge

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getSettings()` returns defaults when no localStorage | unit | Clear localStorage → returns DEFAULT_SETTINGS |
| `getSettings()` returns defaults on corrupted JSON | unit | Set invalid JSON → returns defaults without crash |
| `getSettings()` deep-merges partial data | unit | Set `{ notifications: { pushNotifications: true } }` → returns full settings with pushNotifications=true and all other defaults |
| `saveSettings()` persists to localStorage | unit | Save settings → read raw localStorage → matches |
| `updateSettings()` merges correctly | unit | Partial update → only specified fields changed |
| `useSettings()` returns reactive state | integration | Render hook, call updateProfile → state updates |
| Cross-tab sync updates state | integration | Simulate `storage` event → hook state updates |
| Compatibility: respects pushNotification flag set by notifications-storage | unit | Write via `setPushNotificationFlag(true)` → `getSettings().notifications.pushNotifications` is `true` |

**Expected state after completion:**
- [ ] TypeScript types for all settings defined
- [ ] Storage service reads/writes `wr_settings` with corruption handling
- [ ] Deep-merge preserves values written by other specs
- [ ] `useSettings()` hook provides reactive state with update functions
- [ ] Cross-tab sync works via `storage` event

---

### Step 3: Profile Section

**Objective:** Build the Profile section with display name input (validated, save-on-blur), avatar preview with stub "Change" button, and bio textarea.

**Files to create/modify:**
- `frontend/src/components/settings/ProfileSection.tsx` — New component

**Details:**

**Display Name:**
- `<input type="text">` with classes: `w-full bg-white/10 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/50 focus-visible:outline-none`
- Pre-filled from `settings.profile.displayName` or `user.name` fallback
- Validation: 2-30 characters, `/^[a-zA-Z0-9 ]+$/` (alphanumeric + spaces)
- Live character count: `<span className="text-xs text-white/40">{len}/30</span>` right-aligned below input
- On blur: validate → if valid, call `updateProfile({ displayName: value })` AND `localStorage.setItem('wr_user_name', value)` for backward compat → show inline "Saved" text (`text-xs text-green-400`) that fades after 2s (use `setTimeout` + state)
- On blur invalid: revert to previous valid name, show error: `<p className="text-xs text-red-400">Display name must be 2-30 characters, letters, numbers, and spaces only</p>`
- Minimum 44px height on input for touch targets

**Avatar Preview:**
- Circular div (80px): `w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-white text-2xl font-semibold`
- Content: first letter of display name (initials fallback) — `displayName.charAt(0).toUpperCase()`
- "Change" button next to avatar: `<button className="text-sm text-primary hover:text-primary-lt transition-colors">Change</button>`
- On click: `showToast('Avatar picker coming soon')` using `useToast()`

**Bio:**
- `<textarea>` with same dark input styling, `rows={3}`
- Placeholder: `"Tell your friends a little about yourself..."`
- 160 char limit with live count: `<span className="text-xs text-white/40">{len}/160</span>`
- Save on blur: `updateProfile({ bio: value })`
- Hint below: `<p className="text-xs text-white/40">Your bio will appear on your profile (coming soon)</p>`

**Card wrapper:** Frosted glass card wrapping all profile fields: `rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6`

**Responsive behavior:**
- Desktop: Avatar + Change button horizontal row, name/bio inputs full-width of content panel
- Tablet: Same as desktop
- Mobile: Same layout, inputs span full width

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` for any user content
- Do NOT allow saving empty display name — revert to previous value
- Do NOT strip characters silently — show validation error
- Do NOT render avatar picker modal — stub only

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Display name pre-filled from settings | unit | Set settings → input shows name |
| Character count updates live | unit | Type characters → count updates |
| Valid name saves on blur | integration | Type name, blur → localStorage updated, "Saved" shown |
| Invalid name shows error | unit | Type "A" (too short), blur → error message visible |
| Empty name reverts to previous | unit | Clear name, blur → reverts to previous valid name |
| Special characters rejected | unit | Type "Name@#" → validation error shown |
| `wr_user_name` synced on save | integration | Save name → `wr_user_name` localStorage matches |
| Avatar shows first letter | unit | Name "Eric" → avatar shows "E" |
| Avatar Change button shows toast | integration | Click Change → toast "Avatar picker coming soon" |
| Bio saves on blur | integration | Type bio, blur → settings updated |
| Bio character count at 160 limit | unit | Type 160 chars → count shows "160/160" |

**Expected state after completion:**
- [ ] Profile section renders with name, avatar, bio
- [ ] Display name validates and saves on blur
- [ ] Avatar shows initials, Change button shows toast
- [ ] Bio saves on blur with character count

---

### Step 4: Notifications Section

**Objective:** Build the Notifications section with 9 toggle switches organized in 3 groups.

**Files to create/modify:**
- `frontend/src/components/settings/NotificationsSection.tsx` — New component
- `frontend/src/components/settings/ToggleSwitch.tsx` — Reusable toggle switch component

**Details:**

**ToggleSwitch component:**
```tsx
interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  id: string
}
```
- Visual: pill-shaped, 48px wide × 24px tall
- ON: `bg-primary` with white knob at right
- OFF: `bg-white/20` with white knob at left
- Knob: 20px white circle, `transition-transform duration-150 motion-reduce:transition-none`
- `role="switch"` with `aria-checked={checked}`
- `aria-labelledby` pointing to label element
- Label on left, toggle on right, description below label
- Minimum 44px touch target on toggle area
- Keyboard: Enter/Space to toggle
- Focus: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e]`

**NotificationsSection layout:**
- Frosted glass card
- 3 groups with group headers (`text-xs text-white/40 uppercase tracking-wider mb-3`)
- Group 1 "General": inAppNotifications, pushNotifications
- Group 2 "Email": emailWeeklyDigest, emailMonthlyReport
- Group 3 "Activity": encouragements, milestones, friendRequests, nudges, weeklyRecap
- Groups separated by `border-t border-white/10 pt-4` + `mt-4`
- Each toggle calls `updateNotifications(key, value)` from `useSettings()`
- Push notifications: when toggled ON, show inline note below: `<p className="mt-1 text-xs text-white/40">Push notifications will be available in a future update</p>`
- Stubs (push, email weekly, email monthly) have "(coming soon)" in their description text

**Responsive behavior:**
- Desktop: Single-line toggle rows with label + description on left, toggle on right
- Tablet: Same as desktop
- Mobile: Label + toggle on same row, description on next line (2-line layout)

**Guardrails (DO NOT):**
- Do NOT call browser Push API — just store the flag
- Do NOT create individual localStorage keys per toggle — all in `wr_settings.notifications`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All 9 toggles render with correct labels | unit | Check for all 9 toggle labels |
| Push notifications defaults to OFF | unit | Initial state → pushNotifications toggle unchecked |
| All other toggles default to ON | unit | Initial state → 8 toggles checked |
| Toggle click persists to settings | integration | Click toggle → `wr_settings.notifications.{key}` updated |
| 3 groups with correct headers | unit | "General", "Email", "Activity" group headers visible |
| Push toggle shows inline note when ON | unit | Toggle push ON → note text visible |
| ToggleSwitch has `role="switch"` | unit | Check ARIA role |
| `aria-checked` updates on toggle | unit | Toggle → `aria-checked` changes |
| Keyboard: Enter/Space toggles | integration | Focus toggle, press Space → state changes |

**Expected state after completion:**
- [ ] 9 toggles organized in 3 groups
- [ ] Toggles save immediately to `wr_settings.notifications`
- [ ] Stub notifications show "(coming soon)"
- [ ] ToggleSwitch is reusable and accessible

---

### Step 5: Privacy Section

**Objective:** Build the Privacy section with 2 toggles, 2 radio groups, and blocked users list with unblock.

**Files to create/modify:**
- `frontend/src/components/settings/PrivacySection.tsx` — New component
- `frontend/src/components/settings/RadioPillGroup.tsx` — Reusable radio pill group

**Details:**

**Toggle settings** (reuse `ToggleSwitch` from Step 4):
- "Show on global leaderboard" → `privacy.showOnGlobalLeaderboard` (default ON)
- "Activity status" → `privacy.activityStatus` (default ON)
- Each calls `updatePrivacy({ key: value })`

**RadioPillGroup component:**
```tsx
interface RadioPillGroupProps {
  label: string
  name: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}
```
- `role="radiogroup"` with `aria-label={label}`
- Each option: `<button role="radio" aria-checked={selected}>`
- Selected: `bg-primary/20 border border-primary text-white rounded-full px-4 py-2 text-sm font-medium`
- Unselected: `bg-white/5 border border-white/15 text-white/60 rounded-full px-4 py-2 text-sm font-medium hover:bg-white/10`
- Horizontal row layout with `flex gap-2 flex-wrap`
- Keyboard: arrow keys navigate between options
- Minimum 44px height for touch targets

**Radio groups:**
- "Who can send nudges" → `privacy.nudgePermission` — options: Everyone, Friends, Nobody (default: Friends)
- "Who can see your streak & level" → `privacy.streakVisibility` — options: Everyone, Friends, Only me (default: Friends)
- Each calls `updatePrivacy({ key: value })`

**Blocked Users List:**
- Section header: `<h3 className="text-sm font-medium text-white/80 mb-3">Blocked Users</h3>`
- Empty state: `<p className="text-sm text-white/40">You haven't blocked anyone</p>`
- Populated: list of blocked user entries
- Each entry: avatar (initials, 32px circle) + display name + "Unblock" button
- Display name resolution: import `ALL_MOCK_USERS` from `@/mocks/friends-mock-data`, look up by ID. Fallback to "Unknown User" if not found.
- "Unblock" button: `text-sm text-primary hover:text-primary-lt transition-colors`
- On unblock:
  1. Call `unblockUser(userId)` from `useSettings()` (removes from `wr_settings.privacy.blockedUsers`)
  2. Also update `wr_friends`: read friends data, remove user from `blocked` array, save back
  3. Show toast: `showToast('Unblocked [Name]')`
- Divider (`border-t border-white/10`) between toggle/radio section and blocked users list

**Responsive behavior:**
- Desktop: Radio pills fit in one row (3 options)
- Tablet: Same
- Mobile: Radio pills fit 3 across at 375px (short labels)

**Guardrails (DO NOT):**
- Do NOT auto-re-add as friend after unblock — spec says they return to "not friends" state
- Do NOT add confirmation dialog for unblock — spec says it's low-risk
- Do NOT hardcode blocked user list — read from settings dynamically

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Both privacy toggles render with correct defaults | unit | showOnGlobalLeaderboard ON, activityStatus ON |
| Toggling persists to settings | integration | Toggle → `wr_settings.privacy.showOnGlobalLeaderboard` updated |
| Nudge radio group renders with 3 options | unit | Everyone, Friends, Nobody visible |
| Nudge radio defaults to Friends | unit | "Friends" has `aria-checked="true"` |
| Selecting radio option persists | integration | Click "Nobody" → `wr_settings.privacy.nudgePermission` = "nobody" |
| Streak visibility radio renders | unit | Everyone, Friends, Only me visible |
| `role="radiogroup"` with `role="radio"` on options | unit | Check ARIA roles |
| Arrow keys navigate radio options | integration | Focus radio, arrow right → next option focused |
| Empty blocked users shows message | unit | No blocked users → "You haven't blocked anyone" |
| Blocked users list renders | unit | Set blocked users → list shows names + Unblock buttons |
| Unblock removes from settings | integration | Click Unblock → user removed from `wr_settings.privacy.blockedUsers` |
| Unblock removes from wr_friends | integration | Click Unblock → user removed from `wr_friends.blocked` |
| Unblock shows toast | integration | Click Unblock → toast "Unblocked [Name]" |
| Radio pills have selected/unselected styling | unit | Selected has `bg-primary/20`, unselected has `bg-white/5` |

**Expected state after completion:**
- [ ] Privacy toggles, radio groups, and blocked users list all functional
- [ ] Changes persist immediately to `wr_settings.privacy`
- [ ] Unblock syncs both `wr_settings` and `wr_friends`
- [ ] RadioPillGroup is reusable and accessible

---

### Step 6: Account Section with Delete Account Modal

**Objective:** Build the Account section with email display, stub buttons, and the delete account flow with confirmation modal.

**Files to create/modify:**
- `frontend/src/components/settings/AccountSection.tsx` — New component
- `frontend/src/components/settings/DeleteAccountModal.tsx` — Confirmation modal

**Details:**

**AccountSection layout (frosted glass card):**

**Email display:**
- Label: `<p className="text-sm font-medium text-white/80">Email</p>`
- Value: `<p className="text-white">{settings.profile.email || 'user@example.com'}</p>`
- "Change Email" button: `text-sm text-primary hover:text-primary-lt` → `showToast('Email change coming soon')`

**Change Password:**
- "Change Password" button: same style → `showToast('Password change coming soon')`
- No password fields rendered

**Delete Account:**
- Divider: `border-t border-white/10 mt-6 pt-6`
- Warning text: `<p className="text-sm text-white/40 mb-4">Permanently delete your account and all data.</p>`
- Button: `<button className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[44px]">Delete Account</button>`
- On click: set `showDeleteModal(true)`

**DeleteAccountModal:**
- `role="alertdialog"` with `aria-labelledby` and `aria-describedby`
- Backdrop: `<div className="fixed inset-0 bg-black/60 z-50" onClick={onClose}>`
- Focus trap: `useFocusTrap(isOpen, onClose)`
- Escape key closes modal (handled by useFocusTrap)
- Click outside closes (backdrop onClick)
- Modal card: `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 max-w-md w-full mx-4`
- Title: `<h2 id="delete-title" className="text-lg font-semibold text-white mb-2">Delete Your Account?</h2>`
- Body: `<p id="delete-desc" className="text-sm text-white/70 mb-6">This will permanently delete all your Worship Room data including mood entries, journal drafts, badges, friends, and settings. This action cannot be undone.</p>`
- Buttons:
  - Desktop: side by side (`flex gap-3`): Cancel (left) + Delete Everything (right)
  - Mobile: stacked (`flex flex-col gap-3`): Delete Everything (top) + Cancel (bottom)
  - Cancel: `bg-white/10 text-white border border-white/15 rounded-lg px-4 py-3 hover:bg-white/15 min-h-[44px]`
  - Delete Everything: `bg-red-500 text-white rounded-lg px-4 py-3 hover:bg-red-600 font-medium min-h-[44px]`

**On Delete confirm:**
1. Iterate `Object.keys(localStorage)` → filter keys starting with `wr_` → `localStorage.removeItem(key)` for each
2. Call `logout()` from `useAuth()`
3. Navigate to `/` via `useNavigate()`
4. No toast (user is logged out seeing landing page)

**Responsive behavior:**
- Desktop: Modal centered, ~480px max-width, buttons side by side
- Tablet: Modal centered, ~400px max-width, buttons side by side
- Mobile: Modal full-width with `mx-4`, buttons stacked vertically

**Guardrails (DO NOT):**
- Do NOT hardcode a list of `wr_` keys to delete — iterate dynamically
- Do NOT use `dangerouslySetInnerHTML`
- Do NOT show toast after deletion — user is redirected and logged out
- Do NOT delete `wr_` keys selectively (delete ALL of them)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Email displayed from settings | unit | Email shows "user@example.com" default |
| Change Email shows toast | integration | Click → toast visible |
| Change Password shows toast | integration | Click → toast visible |
| Delete Account button has danger styling | unit | Check `bg-red-500/20` class |
| Delete button opens modal | integration | Click → modal visible |
| Modal has `role="alertdialog"` | unit | Check ARIA role |
| Modal has focus trap | integration | Tab cycles within modal |
| Escape closes modal | integration | Press Escape → modal hidden |
| Clicking backdrop closes modal | integration | Click outside → modal hidden |
| Cancel closes modal | integration | Click Cancel → modal hidden |
| Delete Everything clears all wr_ keys | integration | Set multiple `wr_*` keys → confirm delete → all removed |
| Delete calls logout | integration | Confirm → `isAuthenticated` becomes false |
| Delete navigates to `/` | integration | Confirm → location is `/` |
| Mobile: buttons stack vertically | unit | At mobile width, buttons use flex-col |

**Expected state after completion:**
- [ ] Account section with email, stub buttons, delete button
- [ ] Delete modal with focus trap, ARIA, backdrop
- [ ] Delete clears ALL `wr_` keys, logs out, redirects
- [ ] All accessibility requirements met

---

### Step 7: Integration, Polish, and Full Page Tests

**Objective:** Wire all 4 sections together in the Settings page, add debouncing, handle edge cases (first visit initialization, rapid toggle clicks, back navigation after delete).

**Files to create/modify:**
- `frontend/src/pages/Settings.tsx` — Wire sections with `useSettings()` hook
- `frontend/src/pages/__tests__/Settings.test.tsx` — Full page integration tests

**Details:**

**Wire sections in Settings.tsx:**
- Instantiate `useSettings()` at page level
- Pass relevant props to each section component
- Ensure `useToast()` is used within the ToastProvider tree

**Toggle debouncing:**
- UI state updates immediately on toggle click
- localStorage write debounced with 100ms timeout (use `useRef` for timer ID)
- Implementation: `useSettings()` hook updates state immediately, queues debounced localStorage write

**First visit initialization:**
- `getSettings()` returns defaults — no localStorage write on read
- First actual user change triggers a write with full defaults + the change

**Back navigation after delete:**
- After delete → redirect to `/` → user is logged out → if they press back to `/settings`, the auth gate redirects to `/` again. No action needed.

**`prefers-reduced-motion`:**
- Toggle animation: `motion-reduce:transition-none` on knob transition
- Section switch: no animation (instant swap, not cross-fade)

**Full page test file structure:**

```typescript
// Wrapper: MemoryRouter + AuthProvider + ToastProvider
function renderSettings() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Test User')
  localStorage.setItem('wr_user_id', 'test-user-id')
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<div>Home</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
```

**Guardrails (DO NOT):**
- Do NOT add `prefers-reduced-motion` media query as a separate CSS file — use Tailwind's `motion-reduce:` prefix
- Do NOT over-test individual sections here — they have their own test files. Focus on integration concerns.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full page renders all 4 section titles in nav | integration | Auth → renders Profile, Notifications, Privacy, Account nav items |
| Section switching preserves settings state | integration | Change name → switch to Privacy → switch back → name unchanged |
| Settings persist across page reload | integration | Change toggle → unmount → remount → toggle still in new state |
| Corrupted wr_settings recovers | integration | Set invalid JSON → render → page loads with defaults |
| Cross-tab sync | integration | Simulate `storage` event → displayed values update |
| Delete account full flow | integration | Click delete → confirm → all `wr_*` gone → redirected to `/` |
| Keyboard navigation through sections | integration | Tab through sidebar, Enter to switch, Tab into fields |
| Screen reader section announcement | unit | Section panel has `aria-label` or is properly associated |

**Expected state after completion:**
- [ ] All 4 sections fully wired and functional
- [ ] Toggle debouncing works (rapid clicks don't cause issues)
- [ ] Edge cases handled (corruption, first visit, back nav)
- [ ] Comprehensive integration tests pass
- [ ] `prefers-reduced-motion` respected

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Settings page shell, route, section navigation |
| 2 | — | Settings storage service and types |
| 3 | 1, 2 | Profile section (uses page shell + settings service) |
| 4 | 1, 2 | Notifications section (uses page shell + settings service) |
| 5 | 1, 2, 4 | Privacy section (uses page shell + settings service + ToggleSwitch from Step 4) |
| 6 | 1, 2 | Account section with delete modal |
| 7 | 1-6 | Integration, polish, full page tests |

**Parallelizable:** Steps 3, 4, and 6 can be built in parallel after Steps 1 and 2 are complete. Step 5 depends on Step 4 (reuses ToggleSwitch).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Settings Page Shell & Route | [COMPLETE] | 2026-03-18 | Created `pages/Settings.tsx` (auth gate, dark theme, sidebar + mobile tabs, placeholder content per section), added `/settings` route to `App.tsx`, 11 tests in `pages/__tests__/Settings.test.tsx` |
| 2 | Settings Storage Service | [COMPLETE] | 2026-03-18 | Created `types/settings.ts`, `services/settings-storage.ts` (deep-merge, corruption handling, compat with notifications-storage.ts), `hooks/useSettings.ts` (reactive state, cross-tab sync). 11 storage tests + 7 hook tests all passing. |
| 3 | Profile Section | [COMPLETE] | 2026-03-18 | Created `components/settings/ProfileSection.tsx` (name validation, save-on-blur, avatar initials, bio textarea, char counts). 12 tests passing. |
| 4 | Notifications Section + ToggleSwitch | [COMPLETE] | 2026-03-18 | Created `ToggleSwitch.tsx` (role=switch, aria-checked, keyboard, min 44px touch target, motion-reduce) and `NotificationsSection.tsx` (9 toggles, 3 groups, push note). 10 tests passing. |
| 5 | Privacy Section + RadioPillGroup | [COMPLETE] | 2026-03-18 | Created `RadioPillGroup.tsx` (radiogroup, arrow key navigation, pill styling) and `PrivacySection.tsx` (2 toggles, 2 radio groups, blocked users list with unblock syncing wr_friends). 14 tests passing. |
| 6 | Account Section + Delete Modal | [COMPLETE] | 2026-03-18 | Created `AccountSection.tsx` (email display, stub buttons, delete trigger), `DeleteAccountModal.tsx` (alertdialog, focus trap, escape/backdrop close, clears all wr_ keys, logout, navigate). 12 tests passing. |
| 7 | Integration, Polish & Full Tests | [COMPLETE] | 2026-03-18 | Wired all 4 sections into `Settings.tsx` with `useSettings()` hook. Updated page-level integration tests (14 tests). Fixed TS cleanup (deepMerge typing, unused imports/vars). 80 total tests across 7 files all passing. |
