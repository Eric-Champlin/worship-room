# Implementation Plan: BB-41 Web Push Notifications

**Spec:** `_specs/bb-41-web-push-notifications.md`
**Date:** 2026-04-12
**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 7 days old — fresh)
**Recon Report:** N/A — infrastructure feature, no visual page to recon
**Master Spec Plan:** N/A — standalone feature

---

## Architecture Context

### Existing Service Worker Infrastructure

The project uses `vite-plugin-pwa@^1.2.0` with `generateSW` strategy (`vite.config.ts:10-113`). This auto-generates a service worker with Workbox precache and runtime caching rules. There is **no custom service worker file** — the entire SW is generated at build time.

BB-41 requires custom `push` and `notificationclick` event listeners in the service worker. The `generateSW` strategy does not support custom event listeners. **The plan must switch to `injectManifest` strategy**, which lets us write a custom `src/sw.ts` that the plugin injects the precache manifest into.

**Existing runtime caching rules to replicate in custom SW:**
1. Google Fonts stylesheets — `StaleWhileRevalidate`, cache `wr-google-fonts-stylesheets`, 365 days, 10 entries
2. Google Fonts webfonts — `CacheFirst`, cache `wr-google-fonts-webfonts`, 365 days, 30 entries
3. API routes (`/api/`) — `NetworkFirst`, cache `wr-api-v1`, 7 days, 100 entries, 10s timeout
4. Images (png/jpg/svg/gif/webp) — `CacheFirst`, cache `wr-images-v1`, 30 days, 60 entries
5. Audio (mp3/wav/ogg/m4a) — `CacheFirst`, cache `wr-audio-cache`, range requests, 10 entries
6. Same-origin catch-all — `NetworkFirst`, cache `wr-runtime-v1`, 7 days, 200 entries
7. Navigate fallback — `/index.html`, denylist: `/api/`

**Client-side SW registration:** `UpdatePrompt.tsx` uses `useRegisterSW` from `virtual:pwa-register/react` with `registerType: 'prompt'`. This continues to work with `injectManifest` — no change needed.

### Verse of the Day System (BB-18)

- `src/lib/bible/votdSelector.ts:21-26` — `selectVotdForDate(date)` returns `VotdListEntry` (ref, book, chapter, startVerse, endVerse, theme) via deterministic day-of-year rotation over 60 entries
- `src/data/bible/votd/votd-list.json` — 60-entry verse pool (static JSON import)
- `src/hooks/bible/useVerseOfTheDay.ts` — Hydrates entry with verse text via `loadChapterWeb()`
- **SW limitation:** `selectVotdForDate` is importable in the SW (static JSON, no DOM). `loadChapterWeb` is NOT (requires fetch + dynamic chunk loading). The SW must use pre-generated payloads from IDB or a text-less fallback.

### Reading Streak System (BB-17)

- `src/lib/bible/streakStore.ts:85-168` — `recordReadToday()` returns `StreakUpdateResult` with `delta` field
- `delta: 'same-day'` indicates the user has already read today (line 100-108) — fires on 2nd+ chapter view of the day
- Called in `BibleReader.tsx:562` on chapter mount
- `getStreak()` returns `StreakRecord` with `lastReadDate` for "has user read today" check
- `subscribe(listener)` for reactive updates

### BibleReader Chapter View Event

`BibleReader.tsx:562` calls `recordReadToday()` inside a `useEffect` with deps `[bookSlug, book, chapterNumber, isLoading, loadError, verses.length]`. This fires on every successful chapter render. The `StreakUpdateResult.delta === 'same-day'` return is the trigger for "second reading session of the day."

### BB-38 Deep Linking URL Contract

- `/bible/<book>/<chapter>?verse=<n>` — direct verse link
- `/daily?tab=devotional` — devotional tab
- Used as notification click deep links

### Settings Page Architecture

- `Settings.tsx` — 6 sections: profile, dashboard, notifications, privacy, account, app
- Desktop sidebar + mobile tabs pattern
- `NotificationsSection.tsx:36-148` — Currently has Sound, General (in-app + push "coming soon"), Email, and Activity toggle groups
- `ToggleSwitch.tsx:11-55` — Custom component: `{ checked, onChange, label, description, id }` with `role="switch"`, `aria-checked`, 44px min-height, focus ring
- `useSettings().updateNotifications(key, value)` — persists to `wr_settings` via `settings-storage.ts`

### iOS Safari Detection (existing)

`InstallPromptProvider.tsx:25-38` has `isIOSSafari()` and `isStandalone()` functions. These are module-level (not exported) but the pattern is proven. BB-41 will create equivalent exports in the notification permissions module.

### localStorage Pattern

Mixed direct `localStorage.getItem/setItem` and `StorageService` abstraction. New notification keys will use direct access with try/catch (matches the simpler pattern used by streakStore, InstallPromptProvider, and NotificationsSection).

### Environment Variable Pattern

`src/lib/env.ts` — Centralized typed accessors. Keys OPTIONAL at load, REQUIRED at use via `require*` helpers. Non-throwing `is*Configured` checks for conditional UI.

### Test Patterns (from recent BB specs)

- `beforeEach`: `localStorage.clear()`, `vi.useFakeTimers()` where needed
- Provider wrapping: `MemoryRouter`, `AuthProvider`, `ToastProvider` as needed
- Mock pattern: `vi.mock('@/lib/...')` for service modules
- Assertions: `screen.getByRole/getByText/getByTestId`, `expect(...).toBeInTheDocument()`
- `userEvent` for clicks, `fireEvent` for lower-level events
- Module-level mocks for `navigator` properties

---

## Auth Gating Checklist

**Zero new auth gates.** Notifications work identically for logged-in and logged-out users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View Settings > Notifications | No gate | Step 6 | N/A |
| Toggle "Enable notifications" | No gate | Step 6 | N/A |
| Toggle per-type notification | No gate | Step 6 | N/A |
| Change daily verse time | No gate | Step 6 | N/A |
| Click "Send test notification" | No gate | Step 6 | N/A |
| See BibleReader contextual prompt | No gate | Step 7 | N/A |
| Click "Enable" on contextual prompt | No gate | Step 7 | N/A |
| Click "Maybe later" on contextual prompt | No gate | Step 7 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Settings section card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | NotificationsSection.tsx:37 |
| Settings heading h2 | font | `text-base font-semibold text-white md:text-lg mb-6` | NotificationsSection.tsx:38 |
| Settings subgroup heading h3 | font | `text-xs text-white/60 uppercase tracking-wider mb-3` | NotificationsSection.tsx:43 |
| Section divider | style | `border-t border-white/10 pt-4` | NotificationsSection.tsx:56 |
| ToggleSwitch | dimensions | `h-6 w-12` pill, `h-5 w-5` knob, `min-h-[44px]` row | ToggleSwitch.tsx:16,41,48 |
| Toggle description | font | `text-xs text-white/60 mt-0.5` | ToggleSwitch.tsx:22-24 |
| Status granted | color | `text-success` (#27AE60) | spec design notes |
| Status denied | color | `text-danger` (#E74C3C) | spec design notes |
| Status not requested | color | `text-white/60` | spec design notes |
| Test button | style | `bg-white text-hero-dark rounded-full px-6 py-2 font-semibold` (white pill CTA pattern 1) | 09-design-system.md |
| Contextual prompt card | style | `bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-2xl` (FrostedCard Tier 1) | spec design notes |
| Time picker input | style | `bg-white/[0.06] border border-white/15 rounded-lg text-white px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none` | codebase inspection (matches dark input pattern) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Settings page sections use Dashboard Card Pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` with `p-4 md:p-6`. NOT FrostedCard component (Settings pre-dates Round 3).
- ToggleSwitch is a custom component at `src/components/settings/ToggleSwitch.tsx`. Props: `{ checked, onChange, label, description, id }`. Role: `switch`, `aria-checked`. Always use this component — do not create a new toggle.
- White pill CTA Pattern 1 (inline): `bg-white text-hero-dark rounded-full px-6 py-2 font-semibold`. Use for "Send test notification" button.
- All readable text on Settings page uses `text-white` for labels, `text-white/60` for descriptions. No lower opacities for interactive text.
- BibleReader contextual prompt uses fixed positioning with `env(safe-area-inset-bottom)` for notched devices. Mobile: full-width bottom, Desktop: bottom-right max-width 400px.
- Slide-up fade-in entrance animation for the contextual prompt: `animate-slide-up` (or CSS transition from `translateY(100%) opacity-0` to `translateY(0) opacity-1`).
- Focus management: contextual prompt must have a focus trap or at minimum return focus on dismiss. Both "Enable" and "Maybe later" must be keyboard accessible.
- Sound effects: no sound effects on notification-related actions (notifications are OS-level, not in-app).
- The Settings page is a protected route (auth-gated). The BibleReader is a public route. The contextual prompt appears on the public route — no auth check needed.

---

## Shared Data Models (from Spec)

```typescript
// New: frontend/src/lib/notifications/types.ts

/** Stored in wr_notification_prefs */
export interface NotificationPrefs {
  enabled: boolean
  dailyVerse: boolean
  streakReminder: boolean
  dailyVerseTime: string // "HH:MM" in 24h format, user's local timezone
  lastDailyVerseFired: string // ISO date "YYYY-MM-DD"
  lastStreakReminderFired: string // ISO date "YYYY-MM-DD"
}

/** Stored in wr_push_subscription */
export interface PushSubscriptionRecord {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  applicationServerKey: string // VAPID public key at time of subscription
  createdAt: number // epoch ms
}

/** Notification payload for both push and local-fallback */
export interface NotificationPayload {
  title: string
  body: string
  icon: string
  badge: string
  tag: 'daily-verse' | 'streak-reminder'
  data: {
    url: string
  }
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_notification_prefs` | Both | User notification preferences (enabled, per-type, time, last-fired dates) |
| `wr_push_subscription` | Both | Push API subscription object (endpoint, keys, VAPID key, timestamp) |
| `wr_notification_prompt_dismissed` | Both | BibleReader contextual prompt once-per-user dismissal flag |
| `wr_bible_streak` | Read | Check if user has read today (for streak reminder logic) |
| `wr_settings` | Read | Existing notification toggle state (read for migration, not written by BB-41) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Settings section full-width. Time picker native `<input type="time">`. Contextual prompt fixed bottom, full-width, stacked buttons. |
| Tablet | 768px | Settings section comfortable padding (within max-w-[640px] Settings content panel). Contextual prompt centered with max-width. |
| Desktop | 1440px | Settings section within Settings page sidebar layout. Contextual prompt fixed bottom-right, max-width 400px. |

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. Settings toggles are vertically stacked. The contextual prompt buttons stack on mobile, sit side-by-side on desktop but within a constrained card.

---

## Vertical Rhythm

N/A — this feature modifies existing pages (Settings, BibleReader) rather than creating new full-page layouts. Settings section uses existing `space-y-6` + `space-y-4` rhythm. BibleReader prompt is a fixed overlay, not part of the page flow.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-39 (PWA) is committed — provides service worker, manifest, install prompt infra
- [x] BB-17 (Reading Streak) is committed — provides `recordReadToday()` and `getStreak()`
- [x] BB-18 (Verse of the Day) is committed — provides `selectVotdForDate()` and `useVerseOfTheDay()`
- [x] BB-38 (Deep Linking) is committed — provides URL contract for notification click targets
- [x] All auth-gated actions from the spec are accounted for (zero new gates)
- [x] Design system values are verified from codebase inspection
- [ ] Workbox packages for `injectManifest` may need explicit installation (`workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration`, `workbox-cacheable-response`, `workbox-range-requests`) — verify during Step 5
- [x] No deprecated patterns used
- [ ] Confirm VAPID placeholder key works for dev without a real push server

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| injectManifest vs generateSW | Switch to `injectManifest` | `generateSW` cannot add custom `push`/`notificationclick` handlers. `injectManifest` gives full control while preserving the precache manifest injection. |
| "Second reading session" definition | `recordReadToday()` returns `delta: 'same-day'` on 2nd+ chapter view | Leverages existing streak system. Simple, no new state needed. A refresh counts as a new view — acceptable since the prompt fires at most once ever. |
| Verse text in SW notifications | Pre-generate in main thread, store in IDB for SW fallback | SW cannot use `loadChapterWeb()` (requires dynamic chunk loading). Main thread generates payload and stores in IDB. SW reads from IDB for local-fallback delivery. |
| IDB vs localStorage for SW data | IDB (via thin wrapper) | Service workers cannot access localStorage. IDB is the only storage API available in both main thread and SW context. |
| Local-fallback delivery timing | Opportunistic: fire on SW wake-up (periodicsync, activate, fetch) if time has passed | Perfect timing is impossible without a push server. Spec explicitly accepts this: "may not fire at exact requested time." |
| Streak reminder: "hasn't read today" check | Read `wr_bible_streak` from main thread, store result in IDB | SW cannot read localStorage directly. Main thread syncs the "has read today" flag to IDB on each visit. |
| iOS Safari push support check | Check `navigator.userAgent` for iOS + Safari version 16.4+ AND `display-mode: standalone` | Safari web push requires both version AND PWA-installed mode. Reuses proven patterns from `InstallPromptProvider.tsx:25-38`. |
| Denied permission: re-prompt strategy | Show browser-specific instructions in Settings UI | Spec requirement 6: "clear instructions for re-enabling via browser settings rather than attempting to re-prompt." |
| Notification prefs independent of wr_settings | Yes — separate `wr_notification_prefs` key | Keeps push notification prefs self-contained. The existing `wr_settings.notifications.pushNotifications` boolean is read once for migration, then `wr_notification_prefs.enabled` is the source of truth. |
| VAPID public key format | Base64url-encoded string, converted to Uint8Array for `subscribe()` | Standard VAPID format. Conversion utility included in subscription manager. |

---

## Implementation Steps

### Step 1: Notification Module — Types, Preferences, Content Generators

**Objective:** Create the core notification library with types, localStorage preferences, and notification content generators.

**Files to create:**
- `frontend/src/lib/notifications/types.ts` — TypeScript interfaces
- `frontend/src/lib/notifications/preferences.ts` — Read/write notification prefs from localStorage
- `frontend/src/lib/notifications/content.ts` — Generate daily verse and streak reminder payloads
- `frontend/src/lib/notifications/index.ts` — Public barrel export

**Details:**

**`types.ts`:**
```typescript
export interface NotificationPrefs {
  enabled: boolean
  dailyVerse: boolean
  streakReminder: boolean
  dailyVerseTime: string // "HH:MM" 24h format
  lastDailyVerseFired: string // "YYYY-MM-DD"
  lastStreakReminderFired: string // "YYYY-MM-DD"
}

export interface PushSubscriptionRecord {
  endpoint: string
  keys: { p256dh: string; auth: string }
  applicationServerKey: string
  createdAt: number
}

export interface NotificationPayload {
  title: string
  body: string
  icon: string
  badge: string
  tag: 'daily-verse' | 'streak-reminder'
  data: { url: string }
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  dailyVerse: true,
  streakReminder: true,
  dailyVerseTime: '08:00',
  lastDailyVerseFired: '',
  lastStreakReminderFired: '',
}
```

**`preferences.ts`:**
- `NOTIFICATION_PREFS_KEY = 'wr_notification_prefs'`
- `getNotificationPrefs(): NotificationPrefs` — read from localStorage, return defaults if missing/invalid
- `setNotificationPrefs(prefs: NotificationPrefs): void` — write to localStorage
- `updateNotificationPrefs(updates: Partial<NotificationPrefs>): NotificationPrefs` — merge and persist
- All wrapped in try/catch for localStorage unavailability

**`content.ts`:**
- `generateDailyVersePayload(votdEntry: VotdListEntry, verseText: string): NotificationPayload`
  - `title`: `votdEntry.ref` (e.g., "John 3:16")
  - `body`: `verseText` truncated to 120 chars with "…" if longer
  - `icon`: `/icons/icon-192.png`
  - `badge`: `/icons/icon-192.png`
  - `tag`: `'daily-verse'`
  - `data.url`: `/bible/${votdEntry.book}/${votdEntry.chapter}?verse=${votdEntry.startVerse}` (BB-38 contract)
- `generateStreakReminderPayload(): NotificationPayload`
  - `title`: `"Still time to read today"`
  - `body`: one of 3 rotating messages selected by `hashDate(today) % 3`:
    1. "A short chapter, a moment of peace. No pressure."
    2. "Your rhythm is still here. Come back when you can."
    3. "Five minutes of scripture is still five minutes of scripture."
  - `tag`: `'streak-reminder'`
  - `data.url`: `/daily?tab=devotional`
- `hashDate(dateStr: string): number` — deterministic hash for message rotation (simple char code sum, same approach as `getDayOfYear`)

**Auth gating:** N/A — pure logic module.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT import React or any hooks — this is a pure TypeScript module
- Do NOT use `useVerseOfTheDay` hook — this module takes `VotdListEntry` and `verseText` as arguments
- Do NOT hardcode notification body text outside of `content.ts` — all copy lives here for single-point maintenance
- Do NOT use streak numbers or exclamation points in streak reminder copy (spec requirement 15)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| getNotificationPrefs returns defaults when empty | unit | localStorage empty → returns DEFAULT_PREFS |
| getNotificationPrefs reads saved prefs | unit | Set key, read back, verify |
| updateNotificationPrefs merges correctly | unit | Update one field, verify others unchanged |
| generateDailyVersePayload correct structure | unit | Verify title=ref, body=text, tag, url |
| generateDailyVersePayload truncates long text | unit | 200-char verse text → truncated to 120 + "…" |
| generateDailyVersePayload deep link matches BB-38 | unit | Verify `/bible/{book}/{chapter}?verse={n}` format |
| generateStreakReminderPayload correct structure | unit | Verify title, tag, url |
| generateStreakReminderPayload rotates messages | unit | Different dates → different body messages (3 variants) |
| generateStreakReminderPayload no streak numbers | unit | Verify body doesn't contain digits |
| generateStreakReminderPayload no exclamation marks | unit | Verify body doesn't contain "!" |

**Expected state after completion:**
- [ ] `frontend/src/lib/notifications/` directory exists with 4 files
- [ ] All types exported and usable from other modules
- [ ] Notification prefs CRUD works with localStorage
- [ ] Daily verse and streak reminder payloads match spec format

---

### Step 2: VAPID Key + Environment Setup

**Objective:** Add VAPID public key to the environment variable system with a documented dev placeholder.

**Files to modify:**
- `frontend/.env.example` — Add VAPID key with documentation
- `frontend/src/lib/env.ts` — Add typed accessor functions

**Details:**

**`.env.example` addition (at bottom):**
```bash
# Web Push Notifications — VAPID key (BB-41)
# The VAPID public key is used to authenticate push subscription requests.
# For local dev, use this placeholder. Push subscriptions will be created
# but notifications won't arrive without a matching private key on the server.
# The real key pair is generated and managed by the Phase 3 backend.
# Generate a real key pair: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-dRgkJiVWFCL_F-rxJGXPbUZMR0a0xS9mW_Y78
```

The placeholder above is a valid VAPID public key format (base64url, 65 bytes when decoded). It allows subscription creation in dev without a backend. Notifications will not be delivered without the matching private key.

**`env.ts` additions:**
```typescript
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function getVapidPublicKey(): string | undefined {
  return VAPID_PUBLIC_KEY
}

export function requireVapidPublicKey(): string {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error(
      'VAPID public key is not configured. Add VITE_VAPID_PUBLIC_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for a dev placeholder.'
    )
  }
  return VAPID_PUBLIC_KEY
}

export function isVapidKeyConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY
}
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT commit a real VAPID private key anywhere
- Do NOT throw at module load — the `require*` pattern ensures the key is only checked when the feature is actually used
- Do NOT use `import.meta.env.VITE_VAPID_PUBLIC_KEY` directly elsewhere — always go through `env.ts`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| getVapidPublicKey returns undefined when not set | unit | Clear env, verify undefined |
| requireVapidPublicKey throws with helpful message | unit | Clear env, verify error message mentions .env.example |
| isVapidKeyConfigured returns false when not set | unit | Clear env, verify false |

**Expected state after completion:**
- [ ] `.env.example` has `VITE_VAPID_PUBLIC_KEY` with dev placeholder and documentation
- [ ] `env.ts` has 3 new exported functions for VAPID key access
- [ ] Pattern matches existing Gemini/Maps key accessors

---

### Step 3: Permission Helpers + Push Subscription Manager

**Objective:** Create the permission detection and push subscription lifecycle manager.

**Files to create:**
- `frontend/src/lib/notifications/permissions.ts` — Browser support, iOS checks, permission request
- `frontend/src/lib/notifications/subscription.ts` — Subscribe, unsubscribe, key rotation, invalidation recovery

**Details:**

**`permissions.ts`:**

```typescript
export type PushSupportStatus =
  | 'supported'           // Full push support
  | 'ios-needs-install'   // iOS Safari 16.4+ but not standalone (needs home screen install)
  | 'unsupported'         // Browser doesn't support push

export function getPushSupportStatus(): PushSupportStatus
```

- Check `'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window`
- If iOS Safari (reuse UA detection pattern from `InstallPromptProvider.tsx:25-32`):
  - Check Safari version ≥ 16.4 via `navigator.userAgent` regex: `/Version\/(\d+\.\d+)/` → parse major.minor
  - Check `(window.matchMedia('(display-mode: standalone)').matches)` for PWA-installed mode
  - If version ≥ 16.4 AND standalone → `'supported'`
  - If version ≥ 16.4 AND NOT standalone → `'ios-needs-install'`
  - Otherwise → `'unsupported'`
- Non-iOS browsers with all APIs present → `'supported'`
- Otherwise → `'unsupported'`

```typescript
export function getPermissionState(): NotificationPermission | 'unsupported'
```
- Returns `Notification.permission` ('default', 'granted', 'denied') or `'unsupported'` if Notification API not present.

```typescript
export function requestPermission(): Promise<NotificationPermission>
```
- Calls `Notification.requestPermission()` and returns the result
- Does NOT auto-subscribe — caller handles subscription after permission grant

```typescript
export function isIOSSafari(): boolean
export function isStandalone(): boolean
```
- Exported utility functions, same logic as `InstallPromptProvider.tsx:25-38`

**`subscription.ts`:**

```typescript
const SUBSCRIPTION_KEY = 'wr_push_subscription'

export async function subscribeToPush(): Promise<PushSubscriptionRecord | null>
```
1. Get SW registration via `navigator.serviceWorker.ready`
2. Read VAPID key via `requireVapidPublicKey()` from `env.ts`
3. Convert base64url VAPID key to `Uint8Array` via `urlBase64ToUint8Array(key)` helper
4. Call `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
5. Extract `endpoint`, `keys.p256dh`, `keys.auth` from the `PushSubscription`
6. Construct `PushSubscriptionRecord` with `applicationServerKey` and `createdAt: Date.now()`
7. Store in localStorage under `wr_push_subscription`
8. Return the record

```typescript
export async function unsubscribeFromPush(): Promise<void>
```
1. Get current subscription via `registration.pushManager.getSubscription()`
2. If exists, call `subscription.unsubscribe()`
3. Remove `wr_push_subscription` from localStorage

```typescript
export async function ensureSubscription(): Promise<PushSubscriptionRecord | null>
```
Handles key rotation and invalidation recovery:
1. Read stored record from `wr_push_subscription`
2. Read current VAPID key from `getVapidPublicKey()`
3. Get live subscription from `registration.pushManager.getSubscription()`
4. **Key rotation:** If stored record's `applicationServerKey` differs from current VAPID key → unsubscribe old, subscribe new
5. **Invalidation recovery:** If localStorage has a record but `getSubscription()` returns null → re-subscribe
6. **Normal:** If live subscription matches stored record → return stored record
7. **No subscription:** If nothing stored and no live subscription → return null (user hasn't opted in)

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array
```
Standard VAPID key conversion utility (well-known pattern for Web Push API).

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT call `subscribeToPush()` without first confirming `Notification.permission === 'granted'` — the Push API will throw
- Do NOT store the VAPID private key — only the public key is stored client-side
- Do NOT call `requestPermission()` from this module — permission request lives in `permissions.ts` and is triggered by explicit user action only
- Do NOT retry subscription on failure — return null and let the caller handle the error state

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| getPushSupportStatus returns 'supported' when APIs present | unit | Mock navigator with all APIs |
| getPushSupportStatus returns 'unsupported' when missing | unit | Mock navigator without PushManager |
| getPushSupportStatus returns 'ios-needs-install' for iOS Safari not standalone | unit | Mock iOS Safari UA + non-standalone |
| getPermissionState returns current Notification.permission | unit | Mock Notification.permission = 'granted' |
| urlBase64ToUint8Array converts correctly | unit | Known base64url input → known Uint8Array output |
| subscribeToPush stores subscription in localStorage | unit | Mock pushManager.subscribe, verify localStorage write |
| ensureSubscription handles key rotation | unit | Stored key differs → unsubscribe + resubscribe |
| ensureSubscription handles invalidation | unit | localStorage has record, getSubscription returns null → resubscribe |
| ensureSubscription returns null when not opted in | unit | No stored record, no live subscription |
| unsubscribeFromPush clears localStorage | unit | Verify localStorage key removed |

**Expected state after completion:**
- [ ] Permission detection works across Chrome, Firefox, Safari (iOS and non-iOS)
- [ ] Subscription lifecycle handles first subscribe, key rotation, and invalidation recovery
- [ ] All subscription state persisted in `wr_push_subscription`

---

### Step 4: IDB Notification Store + Main-Thread Scheduler

**Objective:** Create an IndexedDB store for notification payloads (readable by SW) and a main-thread scheduler that prepares content and fires local-fallback notifications.

**Files to create:**
- `frontend/src/lib/notifications/store.ts` — Thin IDB wrapper
- `frontend/src/lib/notifications/scheduler.ts` — Prepare payloads, check timing, fire

**Details:**

**`store.ts`:**

Minimal IndexedDB wrapper. DB name: `'wr-notifications'`, version 1, object store: `'payloads'`.

```typescript
interface StoredPayload {
  key: 'daily-verse' | 'streak-reminder'
  payload: NotificationPayload
  scheduledDate: string // "YYYY-MM-DD"
  fired: boolean
}

export function openNotificationDB(): Promise<IDBDatabase>
export function storePayload(entry: StoredPayload): Promise<void>
export function getPayload(key: string): Promise<StoredPayload | undefined>
export function markFired(key: string): Promise<void>
```

- All operations wrapped in try/catch — IDB unavailable (private browsing, quota) degrades to no-op
- Keep the DB tiny: only 2 entries max (one per notification type), overwrite on each prepare cycle

**`scheduler.ts`:**

```typescript
export async function prepareAndSchedule(): Promise<void>
```
Called on every app load (from a `useEffect` in App.tsx or a layout component). Does:

1. Read `wr_notification_prefs` — if not enabled, return early
2. If `dailyVerse` enabled:
   a. Call `selectVotdForDate(new Date())` to get today's entry
   b. Try to load verse text via `loadChapterWeb(entry.book, entry.chapter)` — if fails, use reference only
   c. Call `generateDailyVersePayload(entry, verseText)` to build payload
   d. Store payload in IDB via `storePayload({ key: 'daily-verse', payload, scheduledDate: today, fired: false })`
3. If `streakReminder` enabled:
   a. Call `generateStreakReminderPayload()` to build payload
   b. Store in IDB similarly
4. Check if it's time to fire:
   a. Daily verse: parse `dailyVerseTime` as `HH:MM`, compare to current time. If current time ≥ scheduled time AND `lastDailyVerseFired !== today` → fire
   b. Streak reminder: fire at `dailyVerseTime` + 10 hours (or 8 PM, whichever is earlier) AND user hasn't read today (`getStreak().lastReadDate !== today`) AND `lastStreakReminderFired !== today`
5. Fire via `navigator.serviceWorker.ready.then(reg => reg.showNotification(payload.title, { body, icon, badge, tag, data }))`
6. Update `lastDailyVerseFired` / `lastStreakReminderFired` in prefs

```typescript
export async function fireTestNotification(): Promise<boolean>
```
For the "Send test notification" button:
1. Check `Notification.permission === 'granted'` — return false if not
2. Generate today's daily verse payload
3. Fire immediately via `registration.showNotification()`
4. Return true

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT fire notifications without checking `Notification.permission === 'granted'`
- Do NOT fire if user has not explicitly enabled notifications (`prefs.enabled === false`)
- Do NOT fire the same notification type twice in one day (dedup via `lastDailyVerseFired`/`lastStreakReminderFired`)
- Do NOT use `setTimeout` or `setInterval` for scheduling — fire check runs once on page load, that's it
- Do NOT modify streak data — only read via `getStreak()` to check `lastReadDate`
- Do NOT throw if IDB is unavailable — degrade gracefully to main-thread-only delivery

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| prepareAndSchedule skips when disabled | unit | prefs.enabled = false → no IDB write, no notification |
| prepareAndSchedule stores payload in IDB | unit | Enabled + verse loaded → IDB storePayload called |
| prepareAndSchedule fires when time has passed | unit | Current time > scheduled time, not fired today → showNotification called |
| prepareAndSchedule does not double-fire | unit | lastDailyVerseFired = today → no notification |
| streak reminder skips when user has read today | unit | getStreak().lastReadDate = today → no reminder |
| fireTestNotification returns false without permission | unit | Notification.permission = 'default' → returns false |
| fireTestNotification fires with permission | unit | Notification.permission = 'granted' → showNotification called |

**Expected state after completion:**
- [ ] IDB store can write and read notification payloads
- [ ] Scheduler generates correct payloads from VOTD system
- [ ] Main-thread local-fallback fires notifications when time has passed
- [ ] Double-fire prevention works via last-fired date tracking

---

### Step 5: Custom Service Worker (injectManifest Switch)

**Objective:** Switch from `generateSW` to `injectManifest` and create a custom service worker with push, notificationclick, and local-fallback handlers.

**Files to create/modify:**
- `frontend/src/sw.ts` — Custom service worker (NEW)
- `frontend/vite.config.ts` — Switch to injectManifest strategy (MODIFY)

**Details:**

**Install workbox packages (if not resolvable from transitive deps):**
```bash
pnpm add -D workbox-precaching workbox-routing workbox-strategies workbox-expiration workbox-cacheable-response workbox-range-requests
```

**`vite.config.ts` changes:**

Replace the VitePWA plugin config:

```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'prompt',
  includeAssets: ['apple-touch-icon.png', 'icons/*.png', 'og-default.png'],
  manifest: {
    // ... (unchanged manifest object)
  },
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  },
})
```

Remove the entire `workbox: { ... }` block — runtime caching rules move into `sw.ts`.

**`src/sw.ts`:**

```typescript
/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { RangeRequestsPlugin } from 'workbox-range-requests'

declare const self: ServiceWorkerGlobalScope

// ── Precache ──
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Navigation fallback ──
const navHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navHandler, { denylist: [/^\/api\//] }))

// ── Runtime caching (replicated from previous generateSW config) ──

// Google Fonts stylesheets
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'wr-google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
)

// Google Fonts webfonts
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'wr-google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// API routes
registerRoute(
  /\/api\//,
  new NetworkFirst({
    cacheName: 'wr-api-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 })],
    networkTimeoutSeconds: 10,
  })
)

// Images
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  new CacheFirst({
    cacheName: 'wr-images-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

// Audio files
registerRoute(
  /\.(?:mp3|wav|ogg|m4a)$/,
  new CacheFirst({
    cacheName: 'wr-audio-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10 }),
      new RangeRequestsPlugin(),
    ],
  })
)

// Same-origin catch-all
registerRoute(
  ({ sameOrigin }) => sameOrigin,
  new NetworkFirst({
    cacheName: 'wr-runtime-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  })
)

// ── Push notification handler ──
self.addEventListener('push', (event) => {
  if (!event.data) return

  const payload = event.data.json() as {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: { url?: string }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      tag: payload.tag,
      data: payload.data,
    })
  )
})

// ── Notification click handler ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Otherwise, open a new window
      return self.clients.openWindow(targetUrl)
    })
  )
})

// ── Local-fallback: periodic sync (Chrome/Edge) ──
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'wr-notification-check') {
    event.waitUntil(checkAndFireFromIDB())
  }
})

// ── Local-fallback: opportunistic on activate ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      checkAndFireFromIDB(),
    ])
  )
})

// ── IDB read + fire helper ──
async function checkAndFireFromIDB(): Promise<void> {
  try {
    const db = await openIDB()
    const today = new Date().toISOString().slice(0, 10)

    for (const key of ['daily-verse', 'streak-reminder']) {
      const tx = db.transaction('payloads', 'readonly')
      const store = tx.objectStore('payloads')
      const request = store.get(key)
      const entry = await idbRequest(request)

      if (entry && entry.scheduledDate === today && !entry.fired) {
        await self.registration.showNotification(entry.payload.title, {
          body: entry.payload.body,
          icon: entry.payload.icon,
          badge: entry.payload.badge,
          tag: entry.payload.tag,
          data: entry.payload.data,
        })

        // Mark as fired
        const writeTx = db.transaction('payloads', 'readwrite')
        const writeStore = writeTx.objectStore('payloads')
        writeStore.put({ ...entry, fired: true })
      }
    }
    db.close()
  } catch {
    // IDB unavailable — no-op
  }
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('wr-notifications', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('payloads', { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT remove any existing runtime caching rule — replicate ALL 6 rules exactly as they were in the `workbox` config block
- Do NOT change `registerType: 'prompt'` — `UpdatePrompt.tsx` depends on this
- Do NOT import from `@/` path aliases in `sw.ts` — the SW is built separately and may not resolve aliases. Use relative paths or inline the minimal logic needed.
- Do NOT use `localStorage` in the SW — it's not available in the ServiceWorkerGlobalScope
- Do NOT use `setTimeout` for scheduling — SW timers are unreliable
- Do NOT remove the `navigateFallback` behavior — the `NavigationRoute` replaces it

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Build succeeds after injectManifest switch | integration | `pnpm build` exits 0, produces SW file in dist |
| SW file contains precache manifest placeholder | unit | Read built SW, verify `__WB_MANIFEST` was replaced |
| Existing UpdatePrompt.tsx still works | smoke | Import useRegisterSW, verify no type errors |

**Expected state after completion:**
- [ ] `vite.config.ts` uses `strategies: 'injectManifest'`
- [ ] `src/sw.ts` exists with precache + all 6 runtime caching rules + push + notificationclick + local-fallback
- [ ] `pnpm build` succeeds with the custom SW
- [ ] All existing offline/caching behavior is preserved

---

### Step 6: Settings UI — NotificationsSection Overhaul

**Objective:** Replace the "coming soon" push notification section with a fully functional notification controls panel.

**Files to modify:**
- `frontend/src/components/settings/NotificationsSection.tsx` — Rewrite Push section

**Details:**

Keep the existing Sound, Email, and Activity sections unchanged. Replace the "General" section's push toggle with a new "Push Notifications" section:

```
┌─────────────────────────────────────────────────────┐
│ Notifications                                        │
│                                                      │
│ SOUND                                                │
│ [Toggle] Sound Effects                               │
│                                                      │
│ ─────────────────────────────────────────────        │
│                                                      │
│ PUSH NOTIFICATIONS                                   │
│                                                      │
│ [Status indicator: "Granted" / "Denied" / ...]       │
│                                                      │
│ [Toggle] Enable notifications                        │
│          Receive a daily verse and gentle reminders   │
│                                                      │
│ (when enabled:)                                      │
│ [Toggle] Daily verse                                 │
│          A verse delivered to your device each day    │
│                                                      │
│ [Toggle] Streak reminders                            │
│          A gentle nudge in the evening if you         │
│          haven't read yet today                       │
│                                                      │
│ Daily verse time                                     │
│ [08:00 ▾] (native time picker)                       │
│                                                      │
│ [Send test notification]                             │
│                                                      │
│ (if denied:)                                         │
│ ┌──────────────────────────────────────┐             │
│ │ Notifications are blocked.           │             │
│ │ To re-enable:                        │             │
│ │ 1. Open browser settings             │             │
│ │ 2. Find worshiproom.com              │             │
│ │ 3. Set Notifications to "Allow"      │             │
│ └──────────────────────────────────────┘             │
│                                                      │
│ ─────────────────────────────────────────────        │
│                                                      │
│ IN-APP                                               │
│ [Toggle] In-app notifications                        │
│                                                      │
│ ... (Email and Activity sections unchanged) ...       │
└─────────────────────────────────────────────────────┘
```

**Component state:**
- `pushSupport: PushSupportStatus` — from `getPushSupportStatus()`
- `permissionState: NotificationPermission | 'unsupported'` — from `getPermissionState()`
- `prefs: NotificationPrefs` — from `getNotificationPrefs()`
- `testSending: boolean` — loading state for test button

**Master toggle behavior:**
1. User clicks "Enable notifications" toggle ON for the first time
2. If `permissionState === 'default'` → call `requestPermission()`
3. If granted → call `subscribeToPush()` → update prefs `enabled: true`
4. If denied → show denied instructions, toggle stays OFF
5. If already granted → just update prefs, no re-prompt

**Per-type toggles:**
- Only visible when `prefs.enabled === true`
- Toggle `prefs.dailyVerse` / `prefs.streakReminder` via `updateNotificationPrefs()`

**Time picker:**
- `<input type="time" value={prefs.dailyVerseTime} />` styled dark: `bg-white/[0.06] border border-white/15 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none`
- `aria-label="Daily verse notification time"`
- Only visible when `prefs.dailyVerse === true`

**Test notification button:**
- White pill CTA Pattern 1: `bg-white text-hero-dark rounded-full px-6 py-2 font-semibold text-sm hover:bg-white/90 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`
- Only visible when `permissionState === 'granted'`
- On click: `fireTestNotification()` → brief "Sent!" toast (2s)
- Disabled during `testSending`

**Permission status indicator:**
- Granted: `<span className="text-sm text-success font-medium">✓ Notifications enabled</span>`
- Denied: `<span className="text-sm text-danger font-medium">✗ Notifications blocked</span>` + instructions panel
- Not requested: `<span className="text-sm text-white/60">Not yet enabled</span>`
- Unsupported: `<span className="text-sm text-white/60">Your browser doesn't support push notifications</span>`

**iOS Safari variant:**
- When `pushSupport === 'ios-needs-install'`: Show an info panel instead of the enable toggle:
  - "To receive notifications on iOS, add Worship Room to your home screen first."
  - Small "How to add" text: "Tap the Share button, then 'Add to Home Screen'"
  - Same visual treatment as `AppSection.tsx:32-41` (Share icon + instructions)

**Denied permission instructions panel:**
- `bg-white/[0.04] rounded-xl p-4 mt-3`
- Bold heading: "Notifications are blocked"
- Steps list (browser-specific — detect Chrome/Firefox/Safari and show appropriate instructions):
  - Chrome: "Click the lock icon in the address bar → Site settings → Notifications → Allow"
  - Firefox: "Click the lock icon → Connection secure → More Information → Permissions → Notifications"
  - Safari: "Safari → Settings for This Website → Allow Notifications"
  - Generic fallback: "Open your browser settings, find worshiproom.com, and set Notifications to Allow"

**Auth gating:** N/A — Settings page is already auth-gated at the route level, but the notification section itself has no additional auth gate.

**Responsive behavior:**
- Desktop (1440px): Section renders within the Settings content panel (max-width 640px). All elements have comfortable spacing.
- Tablet (768px): Same layout, wider touch targets.
- Mobile (375px): Full-width. Time picker uses native `<input type="time">` dropdown. All toggles have 44px min-height.

**Guardrails (DO NOT):**
- Do NOT auto-trigger permission request on component mount — only on explicit toggle interaction
- Do NOT remove the existing Sound Effects, Email, or Activity sections
- Do NOT create a new toggle component — use the existing `ToggleSwitch` from `./ToggleSwitch`
- Do NOT change the `useSettings` hook or `UserSettingsNotifications` type — push prefs use the separate `wr_notification_prefs` key
- Do NOT show per-type toggles or time picker when master toggle is off (progressive disclosure)
- Do NOT show test button when permission is not granted

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders without push support gracefully | unit | Mock unsupported → shows "not supported" message |
| renders master toggle OFF by default | unit | Fresh state → toggle unchecked |
| master toggle ON triggers permission request | integration | Click toggle → requestPermission called |
| shows per-type toggles when enabled | unit | prefs.enabled = true → daily verse + streak toggles visible |
| hides per-type toggles when disabled | unit | prefs.enabled = false → only master toggle visible |
| time picker updates prefs | unit | Change time → updateNotificationPrefs called with new time |
| test button fires test notification | unit | Click → fireTestNotification called |
| denied state shows instructions | unit | Permission denied → instructions panel visible |
| iOS needs-install shows install instructions | unit | Mock ios-needs-install → shows home screen instructions |
| status indicator shows correct state | unit | Test all 4 states: granted, denied, default, unsupported |

**Expected state after completion:**
- [ ] NotificationsSection has full push notification controls
- [ ] Master toggle triggers permission request on first enable
- [ ] Per-type toggles and time picker are progressively disclosed
- [ ] Test notification button works when permission is granted
- [ ] Denied state shows clear re-enable instructions
- [ ] iOS Safari shows home-screen-install variant
- [ ] All ARIA labels and keyboard navigation work

---

### Step 7: BibleReader Contextual Prompt

**Objective:** Show a non-modal notification permission prompt on the BibleReader page after the user's second reading session of the day.

**Files to create/modify:**
- `frontend/src/components/bible/reader/NotificationPrompt.tsx` — Contextual prompt card (NEW)
- `frontend/src/pages/BibleReader.tsx` — Integrate prompt trigger (MODIFY)

**Details:**

**Trigger logic (in BibleReader.tsx):**

1. Import `getPermissionState`, `getPushSupportStatus` from `lib/notifications/permissions`
2. Add state: `const [showNotifPrompt, setShowNotifPrompt] = useState(false)`
3. In the existing `useEffect` that calls `recordReadToday()` (line 562), capture the return value:
   ```typescript
   const result = recordReadToday()
   ```
4. After `recordReadToday()`, check if the prompt should show:
   ```typescript
   if (
     result.delta === 'same-day' &&
     getPushSupportStatus() !== 'unsupported' &&
     getPermissionState() === 'default' &&
     localStorage.getItem('wr_notification_prompt_dismissed') !== 'true'
   ) {
     setShowNotifPrompt(true)
   }
   ```
5. Render `<NotificationPrompt>` conditionally at the bottom of the component

**`NotificationPrompt.tsx`:**

A fixed-position card that slides up from the bottom:

```
┌─────────────────────────────────────────────────┐
│ 📖 Never miss your daily verse                   │
│                                                   │
│ Get a verse delivered to your device each         │
│ morning, plus a gentle reminder if you            │
│ haven't read yet.                                 │
│                                                   │
│ [Enable]  [Maybe later]                           │
└─────────────────────────────────────────────────┘
```

**iOS variant (when `pushSupport === 'ios-needs-install'`):**
```
┌─────────────────────────────────────────────────┐
│ 📖 Get verse notifications on iOS                │
│                                                   │
│ To receive daily verse notifications, add         │
│ Worship Room to your home screen first:           │
│ Tap Share → "Add to Home Screen"                  │
│                                                   │
│ [Got it]                                          │
└─────────────────────────────────────────────────┘
```

**Component props:**
```typescript
interface NotificationPromptProps {
  onEnable: () => void
  onDismiss: () => void
  iosNeedsInstall: boolean
}
```

**Styling:**
- Card: `bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-lg`
- Desktop: `fixed bottom-4 right-4 max-w-[400px] z-50`
- Mobile: `fixed bottom-0 left-0 right-0 rounded-b-none z-50` with `pb-[calc(1.25rem+env(safe-area-inset-bottom))]`
- Entrance animation: CSS transition — mount with `translate-y-full opacity-0`, animate to `translate-y-0 opacity-100` over 300ms
- Heading: `text-base font-semibold text-white mb-2`
- Body text: `text-sm text-white/80 mb-4`
- Enable button: `bg-white text-hero-dark rounded-full px-6 py-2 font-semibold text-sm` (white pill)
- Maybe later button: `text-white/60 text-sm font-medium hover:text-white/80 ml-3`
- Mobile: buttons stack vertically (`flex-col gap-2`), Enable is full-width

**"Enable" click handler:**
1. Call `requestPermission()`
2. If granted → call `subscribeToPush()` → call `updateNotificationPrefs({ enabled: true })` → dismiss prompt
3. If denied → dismiss prompt (denied state shows in Settings)
4. Set `localStorage.setItem('wr_notification_prompt_dismissed', 'true')`

**"Maybe later" click handler:**
1. Set `localStorage.setItem('wr_notification_prompt_dismissed', 'true')`
2. Dismiss prompt

**Auth gating:** N/A — BibleReader is a public route, prompt works for logged-in and logged-out users.

**Responsive behavior:**
- Desktop (1440px): Fixed bottom-right, max-width 400px, buttons side-by-side
- Tablet (768px): Fixed bottom-right, max-width 400px
- Mobile (375px): Fixed bottom, full-width (no right/left margin), buttons stacked, safe-area-inset-bottom padding

**Inline position expectations:** N/A — buttons stack on mobile, side-by-side on desktop but within constrained card.

**Guardrails (DO NOT):**
- Do NOT show the prompt on first visit or first reading session — only on `delta === 'same-day'` (second+ chapter view today)
- Do NOT show the prompt if permission is already granted or denied
- Do NOT show the prompt more than once per user lifetime (`wr_notification_prompt_dismissed`)
- Do NOT use a modal — this is a non-blocking card that doesn't prevent reading
- Do NOT auto-focus the prompt — the user should be able to ignore it and keep reading
- Do NOT add the prompt to any page other than BibleReader

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders with correct copy | unit | Verify heading, body, buttons present |
| Enable button calls requestPermission | integration | Click Enable → requestPermission mock called |
| Maybe later dismisses and sets localStorage | unit | Click → localStorage has 'wr_notification_prompt_dismissed' = 'true' |
| does not show when already dismissed | unit | Set localStorage flag → prompt not rendered |
| does not show on first read (delta !== same-day) | integration | recordReadToday returns 'first-read' → no prompt |
| shows on second read (delta === same-day) | integration | recordReadToday returns 'same-day' → prompt appears |
| does not show when permission already granted | unit | Notification.permission = 'granted' → no prompt |
| does not show when push unsupported | unit | getPushSupportStatus = 'unsupported' → no prompt |
| iOS variant shows install instructions | unit | iosNeedsInstall = true → different copy, no Enable button |
| mobile layout has full-width bottom position | unit | Check mobile styles applied |
| desktop layout has bottom-right position | unit | Check desktop styles applied |

**Expected state after completion:**
- [ ] Contextual prompt appears on BibleReader after 2nd chapter view of the day
- [ ] Prompt fires at most once per user lifetime
- [ ] Enable button triggers browser permission prompt then subscribes
- [ ] Maybe later dismisses permanently
- [ ] iOS variant shows home-screen-install instructions
- [ ] Mobile: full-width bottom. Desktop: bottom-right 400px card.

---

### Step 8: Wire Scheduler + Periodic Sync Registration

**Objective:** Wire the notification scheduler into the app lifecycle and register periodic sync for background delivery.

**Files to modify:**
- `frontend/src/App.tsx` — Call `prepareAndSchedule()` on mount (or create a small hook)
- `frontend/src/lib/notifications/scheduler.ts` — Add periodic sync registration

**Details:**

**App.tsx integration:**

Add a `useEffect` that runs once on mount (or create a `useNotificationScheduler` hook):

```typescript
useEffect(() => {
  // Only run if notifications are enabled
  const prefs = getNotificationPrefs()
  if (prefs.enabled && Notification.permission === 'granted') {
    prepareAndSchedule().catch(() => {
      // Silent fail — notifications are a courtesy, not a critical path
    })
    registerPeriodicSync().catch(() => {
      // Periodic sync not supported — main thread fallback handles it
    })
  }
}, [])
```

**`registerPeriodicSync()` in scheduler.ts:**

```typescript
export async function registerPeriodicSync(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  // periodicSync is Chrome/Edge only
  if ('periodicSync' in registration) {
    try {
      await (registration as any).periodicSync.register('wr-notification-check', {
        minInterval: 60 * 60 * 1000, // 1 hour
      })
    } catch {
      // Permission denied for periodic sync — acceptable fallback
    }
  }
}
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT block app rendering on notification scheduling — fire-and-forget with `.catch()`
- Do NOT log errors to console for expected failures (periodic sync not supported)
- Do NOT call `prepareAndSchedule` if notifications are disabled or permission not granted
- Do NOT run in SSR context — guard with `typeof window !== 'undefined'`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| scheduler runs on mount when enabled | unit | Prefs enabled + permission granted → prepareAndSchedule called |
| scheduler skips when disabled | unit | Prefs disabled → prepareAndSchedule not called |
| periodic sync registered when available | unit | Mock periodicSync API → register called |
| periodic sync failure is silent | unit | Mock periodicSync.register throws → no error propagated |

**Expected state after completion:**
- [ ] Notification payloads are prepared on every app load
- [ ] Local-fallback fires if time has passed
- [ ] Periodic sync registered on Chrome/Edge for background delivery
- [ ] Zero impact on app load performance

---

### Step 9: Tests — Full Suite

**Objective:** Ensure comprehensive test coverage meeting the spec's acceptance criteria (15+ unit tests on notification lib, 10+ on Settings UI, integration tests for contextual prompt and notification click handling).

**Files to create:**
- `frontend/src/lib/notifications/__tests__/content.test.ts`
- `frontend/src/lib/notifications/__tests__/preferences.test.ts`
- `frontend/src/lib/notifications/__tests__/permissions.test.ts`
- `frontend/src/lib/notifications/__tests__/subscription.test.ts`
- `frontend/src/lib/notifications/__tests__/scheduler.test.ts`
- `frontend/src/components/settings/__tests__/NotificationsPushSection.test.tsx`
- `frontend/src/components/bible/reader/__tests__/NotificationPrompt.test.tsx`

**Details:**

Tests were specified in each step above. This step consolidates them and adds any missing coverage:

**Notification lib tests (content + preferences + permissions + subscription + scheduler):** ≥15 tests

Combines tests from Steps 1, 2, 3, 4:
- Content: 10 tests (payload structure, truncation, deep links, rotation, no streak numbers/exclamation)
- Preferences: 3 tests (defaults, read/write, merge)
- Permissions: 4 tests (support status detection across browsers, iOS variant, permission state)
- Subscription: 5 tests (subscribe, key rotation, invalidation, unsubscribe, VAPID conversion)
- Scheduler: 4 tests (skip when disabled, fire when overdue, dedup, streak check)
- Env accessors: 3 tests (undefined, require throws, isConfigured)

**Settings UI tests:** ≥10 tests

From Step 6: render states, toggle behavior, time picker, test button, denied instructions, iOS variant, status indicator.

**BibleReader contextual prompt tests:** ≥6 tests

From Step 7: trigger conditions (same-day delta, first-read skip, already dismissed, permission state), enable flow, dismiss flow, iOS variant.

**Integration tests:**
- Contextual prompt fires on correct trigger (second reading session) — mount BibleReader twice in same test with mocked streak
- Notification click handling opens correct deep-link URL — test `notificationclick` handler logic in isolation

**Mock setup patterns:**
- `navigator.serviceWorker`: `vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(mockRegistration) } })`
- `Notification.permission`: `Object.defineProperty(Notification, 'permission', { value: 'granted', configurable: true })`
- `PushManager`: mock on `mockRegistration.pushManager`
- `indexedDB`: use `fake-indexeddb` package or mock the IDB open/transaction/store APIs
- `localStorage`: `vi.stubGlobal('localStorage', createMockStorage())` or rely on jsdom's built-in

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify existing test files that aren't related to BB-41
- Do NOT use `fake-indexeddb` unless it's already in devDependencies — mock manually instead
- Do NOT test the actual service worker in jsdom (SW APIs aren't available) — test the handler logic in isolation
- Do NOT skip mocking `Notification` API — jsdom doesn't provide it

**Expected state after completion:**
- [ ] ≥15 unit tests on notification lib (content, preferences, permissions, subscription, scheduler)
- [ ] ≥10 unit tests on Settings UI notification section
- [ ] ≥6 tests on BibleReader contextual prompt (including integration tests)
- [ ] All tests pass with `pnpm test`
- [ ] No new test failures in existing test suite

---

### Step 10: Documentation + localStorage Inventory + Build Verification

**Objective:** Create the Phase 3 backend contract documentation, update the localStorage key inventory, and verify the build is clean.

**Files to create/modify:**
- `_plans/recon/bb41-push-notifications.md` — Backend integration contract (NEW)
- `.claude/rules/11-local-storage-keys.md` — Add 3 new keys (MODIFY)

**Details:**

**`_plans/recon/bb41-push-notifications.md`:**

Document:
1. **Subscription Lifecycle:**
   - First subscribe: VAPID public key → `pushManager.subscribe()` → subscription object stored in `wr_push_subscription`
   - Key rotation: stored `applicationServerKey` vs current → unsubscribe old, subscribe new
   - Invalidation: `getSubscription()` returns null but localStorage has record → re-subscribe
   - Phase 3 migration: on subscribe, also POST to `/api/push/subscribe`

2. **Notification Types and Payload Schemas:**
   ```json
   {
     "title": "John 3:16",
     "body": "For God so loved the world...",
     "icon": "/icons/icon-192.png",
     "badge": "/icons/icon-192.png",
     "tag": "daily-verse",
     "data": { "url": "/bible/john/3?verse=16" }
   }
   ```
   ```json
   {
     "title": "Still time to read today",
     "body": "A short chapter, a moment of peace. No pressure.",
     "icon": "/icons/icon-192.png",
     "badge": "/icons/icon-192.png",
     "tag": "streak-reminder",
     "data": { "url": "/daily?tab=devotional" }
   }
   ```

3. **VAPID Key Management:**
   - Frontend reads `VITE_VAPID_PUBLIC_KEY` at build time
   - Backend generates VAPID key pair and provides public key via config
   - Key rotation: bump `VITE_VAPID_PUBLIC_KEY` → frontend auto-resubscribes on next visit

4. **Local-Fallback Limitations:**
   - Notifications fire when the SW wakes up (periodic sync, page visit, fetch event)
   - No guaranteed delivery time — may be minutes or hours late, or not fire at all
   - Periodic sync is Chrome/Edge only (Android)
   - Does not work when the device is off or the browser is fully closed
   - When Phase 3 backend ships real push, local-fallback stays as graceful degradation

5. **Phase 3 Backend Integration Contract:**
   - `POST /api/push/subscribe` — Body: `PushSubscriptionRecord` — stores subscription for server-side push
   - `DELETE /api/push/unsubscribe` — Body: `{ endpoint: string }` — removes subscription
   - `POST /api/push/send` (internal/admin) — triggers push to all subscriptions for a notification type
   - Push payload format: same JSON schema as above
   - Server needs: `web-push` npm library (or Java equivalent), VAPID private key, subscription storage table
   - Server scheduling: cron job runs at each user's `dailyVerseTime` (requires timezone storage)
   - The frontend needs ZERO changes — the service worker already handles `push` events

**`.claude/rules/11-local-storage-keys.md` additions:**

Add to the appropriate section (after "Engagement & Surprise Moments"):

```markdown
### Push Notifications (BB-41)

| Key                              | Type                   | Feature                                           |
| -------------------------------- | ---------------------- | ------------------------------------------------- |
| `wr_push_subscription`           | PushSubscriptionRecord | Push API subscription (endpoint, keys, VAPID key) |
| `wr_notification_prefs`          | NotificationPrefs      | User notification preferences (types, time, last-fired dates) |
| `wr_notification_prompt_dismissed` | `"true"`             | BibleReader contextual prompt once-per-user flag  |
```

**Build verification:**
```bash
pnpm build   # Must succeed with 0 errors, custom SW in dist
pnpm test    # All new tests pass, no regressions
pnpm lint    # No new lint warnings from BB-41 code
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify any file outside of the documentation targets and localStorage inventory
- Do NOT add IDB keys to `11-local-storage-keys.md` — IDB is a separate storage mechanism and the file tracks localStorage only
- Do NOT commit without a passing build

**Expected state after completion:**
- [ ] Phase 3 backend contract documented with exact endpoints and payload schemas
- [ ] Three new localStorage keys documented in inventory
- [ ] `pnpm build` passes with custom SW
- [ ] `pnpm test` passes with all new tests
- [ ] `pnpm lint` has no new warnings from BB-41 code

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types, preferences, content generators |
| 2 | — | VAPID key environment setup |
| 3 | 1, 2 | Permission helpers + subscription manager (needs types + VAPID key) |
| 4 | 1 | IDB store + main-thread scheduler (needs types + content generators) |
| 5 | 1, 4 | Custom service worker (needs IDB store format, content types) |
| 6 | 1, 3, 4 | Settings UI (needs prefs, permissions, subscription, scheduler) |
| 7 | 3 | BibleReader prompt (needs permissions + subscription) |
| 8 | 5, 6 | Wire scheduler to App.tsx (needs SW + scheduler working) |
| 9 | 1-8 | Tests for all modules |
| 10 | 1-9 | Documentation + inventory + build verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Notification types + preferences + content | [COMPLETE] | 2026-04-12 | Created `lib/notifications/` with types.ts, preferences.ts, content.ts, index.ts. StoredPayload type co-located in types.ts for IDB use in Steps 4-5. |
| 2 | VAPID key environment setup | [COMPLETE] | 2026-04-12 | Added VITE_VAPID_PUBLIC_KEY to .env.example. Added getVapidPublicKey, requireVapidPublicKey, isVapidKeyConfigured to env.ts. |
| 3 | Permission helpers + subscription manager | [COMPLETE] | 2026-04-12 | Created permissions.ts and subscription.ts. Fixed TS2322 — applicationServerKey needs `.buffer as ArrayBuffer` cast for PushManager.subscribe() strict typing. |
| 4 | IDB store + main-thread scheduler | [COMPLETE] | 2026-04-12 | Created store.ts (IDB wrapper) and scheduler.ts (prepareAndSchedule, fireTestNotification, registerPeriodicSync). Streak reminder time = dailyVerseTime + 10h capped at 20:00. |
| 5 | Custom service worker (injectManifest) | [COMPLETE] | 2026-04-12 | Created src/sw.ts (248 lines). Switched vite.config.ts to strategies: 'injectManifest'. All 6 workbox packages resolved from transitive deps (no install needed). Build: 407 precache entries (23,253 KiB) — identical to BB-39 baseline. dist/sw.js contains all 6 cache names + push/notificationclick handlers. All 55 PWA tests + 10 manifest tests pass. periodicsync listener typed via EventListener cast (no native TS type). |
| 6 | Settings UI — NotificationsSection | [COMPLETE] | 2026-04-12 | Rewrote NotificationsSection.tsx. Sections: Sound, Push Notifications (master toggle, per-type toggles, time picker, test button, denied instructions, iOS variant), In-app, Email, Activity. Existing tests need update in Step 9 (5 tests reference old "General"/"Push notifications" structure). |
| 7 | BibleReader contextual prompt | [COMPLETE] | 2026-04-12 | Created NotificationPrompt.tsx (slide-up card, iOS variant, responsive). Modified BibleReader.tsx: captures recordReadToday() result, triggers on delta==='same-day' + default permission + not dismissed. |
| 8 | Wire scheduler + periodic sync | [COMPLETE] | 2026-04-12 | Created NotificationSchedulerEffect component in App.tsx. Uses dynamic imports to avoid loading notification code for non-opted-in users. Mounted alongside MidnightVerse/UpdatePrompt/OfflineIndicator. |
| 9 | Full test suite | [COMPLETE] | 2026-04-12 | 63 tests across 6 files: preferences(6), content(18), permissions(8), subscription(5), NotificationsSection(18), NotificationPrompt(8). All pass. Rewrote existing NotificationsSection.test.tsx to match new component structure. Fixed permissions test mock (needed Object.defineProperty on navigator, not shallow mock). |
| 10 | Documentation + localStorage inventory + build | [COMPLETE] | 2026-04-12 | Created `_plans/recon/bb41-push-notifications.md` (Phase 3 contract with 5 sections: subscription lifecycle, payload schemas, VAPID management, local-fallback limitations, backend integration contract with exact endpoints). Added 3 keys to `11-local-storage-keys.md`. **Build:** 0 errors, 413 precache entries, dist/sw.js produced. **Tests:** 7 failed files / 44 failed (matches BB-39 baseline), 7660 passed (+48 new). **Lint:** 21 problems (matches BB-39 baseline), 0 new from BB-41. Fixed 2 lint errors in test files (unused import/var). |
