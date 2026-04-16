# BB-41: Web Push Notifications

**Master Plan Reference:** N/A — standalone feature (depends on BB-39 PWA, BB-40 SEO, BB-38 deep linking, BB-18 Verse of the Day, BB-17 reading streak, all shipped)

**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)

---

## Overview

Worship Room's mission is helping users find emotional healing through daily scripture engagement. The daily verse and reading streak features assume the user returns regularly, but right now the only return mechanism is the user remembering to open the app. Web push notifications add a gentle, opt-in channel that delivers a daily verse to the user's lock screen and sends a kind reminder when their reading streak is about to break — keeping scripture in the user's rhythm without being manipulative or anxiety-inducing.

This is a frontend-first spec. The backend push server does not exist yet and is explicitly out of scope. BB-41 builds everything the frontend needs so that when a Phase 3 backend spec lands, push notifications work end-to-end without touching the frontend again. In the meantime, a local-fallback delivery mechanism fires notifications from the service worker itself.

## User Stories

As a **logged-in or logged-out user**, I want to **opt into daily verse notifications** so that **I receive a verse on my device each morning that opens the Bible reader when tapped**.

As a **logged-in or logged-out user**, I want to **opt into streak reminder notifications** so that **I get a gentle nudge in the evening if I haven't read yet today, helping me maintain my reading rhythm without feeling pressured**.

As a **logged-in or logged-out user**, I want to **control which notification types I receive and when** so that **I'm never surprised by unwanted notifications and can customize the experience to my schedule**.

## Requirements

### Functional Requirements

#### Permission Request Flow

1. BB-41 never requests notification permission on first visit or any automatic trigger — only in response to explicit user interaction (Settings toggle click, contextual prompt button click)
2. A "Notifications" section on the Settings page explains what notifications Worship Room sends (daily verse, streak reminders, nothing else), with an "Enable notifications" button that triggers the browser permission prompt
3. A contextual permission prompt appears on the BibleReader page after the user completes their second reading session of the same day (not the first). The prompt is a small non-modal card at the bottom of the screen with "Enable" and "Maybe later" buttons
4. The contextual prompt fires at most once per user ever (tracked via localStorage key `wr_notification_prompt_dismissed`)
5. iOS Safari detection shows a modified permission card that explains the home-screen-install requirement (Safari 16.4+ supports web push only for PWAs added to the home screen). Detection must check both browser version and standalone mode
6. When the user has permanently denied notification permission at the browser level, the Settings section shows clear instructions for re-enabling via browser settings rather than attempting to re-prompt

#### Subscription Lifecycle

7. When the user grants permission, BB-41 creates a Push API subscription using a VAPID public key read from `VITE_VAPID_PUBLIC_KEY` at build time
8. The subscription object (endpoint, encryption keys, timestamp) is stored in localStorage under `wr_push_subscription`
9. **First subscribe:** calls `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`, stores result
10. **Key rotation recovery:** if the stored subscription's applicationServerKey differs from the current VAPID public key, unsubscribe the old subscription and create a new one
11. **Invalidation recovery:** if `registration.pushManager.getSubscription()` returns null but localStorage still has a subscription record, re-subscribe automatically
12. A placeholder VAPID public key is used for local dev. It is clearly marked as dev-only in `.env.example` and in the code that reads it, with documentation that the real key comes from the Phase 3 backend spec

#### Notification Content — Daily Verse

13. Daily verse notification content is generated from the existing BB-18 verse of the day system, using the same verse the app shows for that calendar day
14. Notification payload: `title` = verse reference (e.g. "John 3:16"), `body` = verse text preview, `icon` = app icon, `badge` = small badge icon, `tag` = `'daily-verse'` (replaces previous), `data.url` = deep link to Bible reader at verse using BB-38 URL contract (`/bible/<book>/<chapter>?verse=<n>`)

#### Notification Content — Streak Reminder

15. Streak reminder uses deliberately gentle copy with no mention of streak numbers, no exclamation points, no "Don't break your streak" language
16. `title`: "Still time to read today"
17. `body`: one of three rotating messages chosen by hashing the current date:
    - "A short chapter, a moment of peace. No pressure."
    - "Your rhythm is still here. Come back when you can."
    - "Five minutes of scripture is still five minutes of scripture."
18. `tag`: `'streak-reminder'` (replaces previous). `data.url`: `/daily?tab=devotional`

#### Service Worker Integration

19. The service worker registers a `push` event listener that parses the push payload and fires a notification
20. The service worker registers a `notificationclick` event listener that deep-links to the URL in `event.notification.data.url`
21. Notification clicks open the app focused on the target URL (using `clients.openWindow()` or `clients.matchAll()` + `client.focus()`) — not in a new window if the app is already open

#### Local-Fallback Delivery

22. A local-only delivery mechanism fires notifications from the service worker without a real push server. Strategy: fire the notification whenever the service worker wakes up (via periodic sync where supported, or on any service worker activation/fetch event) if the scheduled time has passed and a `last-fired-timestamp` prevents duplicates for that day
23. This is imperfect — notifications may not fire at the exact requested time and may not fire at all on some days. This is documented and acceptable. When the Phase 3 backend ships real push, the local-fallback stays as a graceful degradation path

#### Settings UI

24. A "Notifications" section on the Settings page contains:
    - Master toggle: "Enable notifications" — triggers permission request on first toggle
    - Per-type toggle: "Daily verse" (default on when notifications enabled)
    - Per-type toggle: "Streak reminders" (default on when notifications enabled)
    - Time picker: "Daily verse time" (default 8:00 AM, user's local timezone)
    - "Send test notification" button that fires an immediate sample daily verse notification
    - Status indicator showing current permission state (granted / denied / not yet requested)
25. User notification preferences stored in localStorage under `wr_notification_prefs`

#### Phase 3 Backend Contract

26. A documentation file at `_plans/recon/bb41-push-notifications.md` documents:
    - The subscription lifecycle (subscribe, refresh, key rotation, invalidation)
    - The notification types and their payload schemas
    - The VAPID key management plan
    - The local-fallback limitations
    - An explicit Phase 3 backend integration contract: what endpoints the backend must provide (`POST /api/push/subscribe` for subscription storage, `DELETE /api/push/unsubscribe`, push payload format), so a future backend spec can implement server-side push without reopening BB-41

### Non-Functional Requirements

- **Performance**: Subscription management and content generation are lightweight; no impact on page load or render performance
- **Accessibility**: All Settings UI controls are keyboard-navigable with proper ARIA labels. Toggle states are announced to screen readers. Time picker is accessible. Contextual prompt has proper focus management and dismiss behavior
- **Browser support**: Chrome, Edge, Firefox (full support). Safari 16.4+ (PWA-only). Older Safari and unsupported browsers show a clear "not supported" message rather than broken UI

## Auth Gating

**Notifications are opt-in and work the same for logged-in and logged-out users. Zero new auth gates.**

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Settings > Notifications section | Can view and interact | Can view and interact | N/A — no gate |
| Toggle "Enable notifications" | Triggers browser permission prompt | Same | N/A — no gate |
| Toggle per-type notification | Updates localStorage prefs | Same | N/A — no gate |
| Change daily verse time | Updates localStorage prefs | Same | N/A — no gate |
| Click "Send test notification" | Fires test notification (if permission granted) | Same | N/A — no gate |
| See BibleReader contextual prompt | Shows after second reading session of the day | Same | N/A — no gate |
| Click "Enable" on contextual prompt | Triggers browser permission prompt | Same | N/A — no gate |
| Click "Maybe later" on contextual prompt | Dismisses permanently (localStorage) | Same | N/A — no gate |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Settings notification section is full-width. Time picker is native `<input type="time">`. Contextual BibleReader prompt is a fixed-bottom card spanning full width with stacked buttons. |
| Tablet (640-1024px) | Settings section has comfortable padding. Contextual prompt centered with max-width. |
| Desktop (> 1024px) | Settings section within existing Settings page max-width container. Contextual prompt is a small card fixed to bottom-right corner (not full-width). |

The BibleReader contextual prompt uses `position: fixed; bottom: 0` on mobile and `position: fixed; bottom: 1rem; right: 1rem; max-width: 400px` on desktop. It respects `env(safe-area-inset-bottom)` for notched devices.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All notification copy is hardcoded. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can enable notifications, set preferences, receive notifications. All data stored in localStorage only. Zero database writes.
- **Logged-in users:** Same behavior as logged-out in this frontend-first phase. When Phase 3 backend ships, the subscription will also be POSTed to the server for server-side push delivery.
- **Route type:** Notifications section lives within the existing Settings page (protected route). The BibleReader contextual prompt appears on the public `/bible/:book/:chapter` route.
- **localStorage keys:**
  - `wr_push_subscription` — Push API subscription object (endpoint, keys, timestamp)
  - `wr_notification_prefs` — User preferences: `{ enabled: boolean, dailyVerse: boolean, streakReminder: boolean, dailyVerseTime: string (HH:MM), lastDailyVerseFired: string (ISO date), lastStreakReminderFired: string (ISO date) }`
  - `wr_notification_prompt_dismissed` — `"true"` when the BibleReader contextual prompt has been shown and dismissed (fires at most once per user)

## Completion & Navigation

N/A — standalone infrastructure feature, not a Daily Hub tab.

## Design Notes

- **Settings section** uses the existing Settings page card pattern (frosted glass cards from the Dashboard Card Pattern in the design system: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **Toggle switches** should match existing Settings page toggle styling
- **Time picker** uses native `<input type="time">` styled to match the dark theme (dark background, white text, purple accent for focus ring)
- **Status indicator** uses the existing color tokens: `text-success` (#27AE60) for "granted", `text-danger` (#E74C3C) for "denied", `text-white/60` for "not requested"
- **"Send test notification" button** uses the existing white pill CTA pattern from the design system (`bg-white text-hero-dark rounded-full px-6 py-2 font-semibold`)
- **BibleReader contextual prompt** uses the FrostedCard Tier 1 pattern (`bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-2xl`) with a subtle entrance animation (slide-up fade-in)
- **iOS Safari variant** of the permission card includes a device illustration or icon showing the "Add to Home Screen" flow, matching BB-39's install prompt visual approach
- Design system recon (`_plans/recon/design-system.md`) is available and should be referenced during planning for exact CSS values

## Out of Scope

- **No backend push server** — local-fallback only until Phase 3
- **No VAPID key generation or management** — placeholder key for dev, real key from environment variables at deploy time
- **No server-side subscription storage** — localStorage only until Phase 3 backend adds POST endpoint
- **No notification analytics** — tracking clicks/dismissals/silences is a future spec
- **No rich notification UI** (action buttons, images, custom layouts) — standard browser notification format only
- **No per-user server-side scheduling** — all notifications fire locally in the user's timezone
- **No Prayer Wall, AI response, or other notification types** — daily verse and streak reminder only
- **No sound or vibration customization** — browser defaults
- **No notification grouping or threading** — `tag` field replaces previous of same type
- **No native iOS/Android app notifications** — web push only
- **No changes to existing streak, verse of the day, or reading session logic** — BB-41 reads but doesn't modify
- **No light mode variants** — dark theme only (light mode is Phase 4)

## Acceptance Criteria

- [ ] A `frontend/src/lib/notifications/` module exists with subscription manager, content generators, and permission helpers
- [ ] The subscription manager handles first subscribe, key rotation, and invalidation recovery
- [ ] A VAPID public key is read from `VITE_VAPID_PUBLIC_KEY` with a documented placeholder for dev
- [ ] Daily verse notification content is generated from the existing BB-18 verse of the day system
- [ ] Streak reminder notification content uses the three rotating gentle-voice messages (no streak numbers, no exclamation points)
- [ ] Settings page "Notifications" section exists with master toggle, per-type toggles, time picker, test button, and status indicator
- [ ] The Settings page correctly surfaces denied-permission state with instructions for re-enabling via browser settings
- [ ] A contextual notification permission prompt appears on BibleReader after the second reading session of the day
- [ ] The contextual prompt fires at most once per user (tracked via `wr_notification_prompt_dismissed` in localStorage)
- [ ] iOS Safari detection shows a home-screen-install-required variant of the permission prompt
- [ ] The service worker registers a `push` event listener that fires notifications from push payloads
- [ ] The service worker registers a `notificationclick` event listener that deep-links to the correct URL
- [ ] Notification clicks open the app focused on the target URL, not in a new window if already open
- [ ] A local-fallback delivery mechanism fires the daily verse notification via service worker scheduling (periodic sync or opportunistic wake-up with last-fired dedup)
- [ ] The test notification button fires an immediate sample notification matching the daily verse format
- [ ] All notification types use a `tag` field to replace previous notifications of the same type
- [ ] Denied permission state is surfaced clearly and does not repeatedly re-prompt
- [ ] The subscription object is stored in localStorage under `wr_push_subscription`
- [ ] User notification preferences are stored in localStorage under `wr_notification_prefs` with the documented schema
- [ ] The BibleReader contextual prompt dismissal is stored under `wr_notification_prompt_dismissed`
- [ ] All BB-30 through BB-40 tests continue to pass unchanged
- [ ] At least 15 unit tests cover the subscription manager, content generators, and permission helpers
- [ ] At least 10 unit tests cover the Settings UI notification section
- [ ] An integration test verifies the BibleReader contextual prompt fires on the correct trigger (second reading session)
- [ ] An integration test verifies that notification click handling opens the correct deep-link URL
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates — notifications work identically for logged-in and logged-out users
- [ ] Three new localStorage keys documented in the localStorage keys inventory: `wr_push_subscription`, `wr_notification_prefs`, `wr_notification_prompt_dismissed`
- [ ] Documentation at `_plans/recon/bb41-push-notifications.md` covers subscription lifecycle, notification types, VAPID key plan, local-fallback limitations, and Phase 3 backend integration contract
- [ ] The Phase 3 backend integration contract specifies exact endpoints, payload formats, and subscription management so a backend spec can implement push without reopening BB-41
- [ ] The permission request flow is never fired on first visit or any automatic trigger — only on explicit user interaction
- [ ] On mobile, the BibleReader contextual prompt spans full width with stacked buttons; on desktop, it's a small bottom-right card (max-width 400px)
- [ ] Settings toggles, time picker, and test button are keyboard-navigable with proper ARIA labels

## Notes for Execution

- **Local-fallback is the hard part.** Periodic sync is Chrome/Edge-only (Android). `setTimeout` in service workers is unreliable (workers are killed between events). Best compromise: fire notifications opportunistically when the service worker wakes up (fetch, sync, or periodicsync events) if the scheduled time has passed and a `lastFired` timestamp prevents duplicates. Imperfect but cross-browser.
- **"Second reading session" trigger** needs a clear definition during planning. Likely: the chapter completion event that BB-17's streak system already fires. The plan phase should recon what event/callback exists and hook into it rather than rebuilding completion detection.
- **Settings section** must live alongside existing Settings page sections (Profile, Notifications, Privacy, Account). Don't create a new route.
- **VAPID placeholder key** must have clear comments in `.env.example` and source code that the real key comes from Phase 3.
- **iOS Safari** web push requires both version 16.4+ AND standalone mode (PWA added to home screen). Detection must check both conditions.
- **Pre-existing failing tests are NOT touched.**
- **After BB-41, BB-42 (full-text scripture search) is next.**
