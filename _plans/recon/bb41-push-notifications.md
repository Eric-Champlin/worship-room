# BB-41: Web Push Notifications — Phase 3 Backend Integration Contract

**Date:** 2026-04-12
**Status:** Frontend complete. Backend push server not yet implemented.

---

## 1. Subscription Lifecycle

### First Subscribe
1. User toggles "Enable notifications" in Settings or clicks "Enable" on BibleReader contextual prompt
2. Frontend calls `Notification.requestPermission()`
3. If granted, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`
4. Subscription object stored in localStorage under `wr_push_subscription`:
   ```json
   {
     "endpoint": "https://fcm.googleapis.com/fcm/send/...",
     "keys": { "p256dh": "...", "auth": "..." },
     "applicationServerKey": "BEl62iUY...",
     "createdAt": 1712937600000
   }
   ```
5. **Phase 3 addition:** After storing locally, POST the subscription to `POST /api/push/subscribe`

### Key Rotation
- Frontend reads `VITE_VAPID_PUBLIC_KEY` at build time
- On each app load, `ensureSubscription()` compares stored `applicationServerKey` with current key
- If they differ: unsubscribe the old subscription, create a new one with the new key
- **Phase 3 addition:** After re-subscribing, POST the new subscription and DELETE the old one

### Invalidation Recovery
- If `pushManager.getSubscription()` returns null but localStorage has a record, re-subscribe automatically
- This handles browser subscription invalidation (e.g., browser data cleared, subscription expired)

---

## 2. Notification Types and Payload Schemas

### Daily Verse
```json
{
  "title": "John 3:16",
  "body": "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
  "icon": "/icons/icon-192.png",
  "badge": "/icons/icon-192.png",
  "tag": "daily-verse",
  "data": { "url": "/bible/john/3?verse=16" }
}
```

- `title`: Verse reference from the BB-18 verse-of-the-day system
- `body`: Verse text, truncated to 120 characters with ellipsis if longer
- `tag`: `"daily-verse"` — replaces any previous daily verse notification
- `data.url`: Deep link following BB-38 URL contract: `/bible/<book>/<chapter>?verse=<n>`

### Streak Reminder
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

- `title`: Always "Still time to read today" (no exclamation marks, no streak numbers)
- `body`: One of three rotating messages, selected by hashing the date
- `tag`: `"streak-reminder"` — replaces any previous streak reminder
- Messages:
  1. "A short chapter, a moment of peace. No pressure."
  2. "Your rhythm is still here. Come back when you can."
  3. "Five minutes of scripture is still five minutes of scripture."

---

## 3. VAPID Key Management

- **Frontend:** Reads `VITE_VAPID_PUBLIC_KEY` at build time via `src/lib/env.ts`
- **Backend (Phase 3):** Generate a VAPID key pair using `web-push generate-vapid-keys` or equivalent
- **Deploy:** Set `VITE_VAPID_PUBLIC_KEY` to the generated public key in the frontend's environment
- **Key rotation:** Bump `VITE_VAPID_PUBLIC_KEY` → redeploy frontend → users auto-resubscribe on next visit
- **Dev placeholder:** `BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-dRgkJiVWFCL_F-rxJGXPbUZMR0a0xS9mW_Y78`

---

## 4. Local-Fallback Limitations

The current implementation uses a local-fallback delivery mechanism instead of a real push server:

- **Main thread:** On each app load, checks if the scheduled notification time has passed and fires via `registration.showNotification()` if the user hasn't received it today
- **Service worker:** On `periodicsync` events (Chrome/Edge only) and `activate` events, reads pre-generated payloads from IndexedDB and fires if overdue
- **Periodic sync:** Registered with 1-hour minimum interval, Chrome/Edge only, requires browser permission

**Known limitations:**
- Notifications may not fire at the exact scheduled time — they fire when the SW wakes up
- If the user doesn't visit the app and periodic sync doesn't fire, no notification is delivered
- Periodic sync is Chrome/Edge only (Android primarily)
- Does not work when the device is completely off or the browser is force-closed
- iOS Safari does not support periodic sync

**When Phase 3 backend ships:** The local-fallback mechanism stays as graceful degradation. Server-side push is the primary delivery, local-fallback covers the case where the push message doesn't arrive (e.g., user is offline, then comes online later).

---

## 5. Phase 3 Backend Integration Contract

### Endpoints

#### `POST /api/push/subscribe`
Store a push subscription for server-side delivery.

**Request body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": { "p256dh": "...", "auth": "..." },
  "applicationServerKey": "BEl62iUY...",
  "createdAt": 1712937600000
}
```

**Response:** `201 Created` with `{ "id": "subscription-uuid" }`

**Frontend change needed:** After `subscribeToPush()` succeeds, POST the subscription record. Add to `subscription.ts`.

#### `DELETE /api/push/unsubscribe`
Remove a push subscription.

**Request body:**
```json
{ "endpoint": "https://fcm.googleapis.com/fcm/send/..." }
```

**Response:** `204 No Content`

**Frontend change needed:** In `unsubscribeFromPush()`, call this endpoint after browser unsubscribe.

#### `POST /api/push/send` (internal/admin only)
Trigger push delivery for a notification type.

**Request body:**
```json
{
  "type": "daily-verse" | "streak-reminder",
  "payload": { ... }  // same schema as above
}
```

**Server behavior:**
- For `"daily-verse"`: iterate all subscriptions, send the payload
- For `"streak-reminder"`: iterate subscriptions where the user hasn't read today (requires streak data in DB)

### Server Requirements

- **Library:** `web-push` (npm) or Java equivalent (`nl.martijndwars:web-push-java`)
- **VAPID keys:** Generate and store securely (private key never sent to frontend)
- **Subscription storage:** Database table with endpoint, keys, user_id (nullable for logged-out), timezone, preferences
- **Scheduling:** Cron job or task scheduler that sends notifications at each user's configured time (requires timezone storage)
- **Rate limiting:** 2 push messages per user per day (daily verse + streak reminder)

### Frontend Changes for Phase 3

The service worker's `push` event handler already parses and displays push payloads. **Zero frontend changes needed for basic push delivery.** The only additions:

1. POST subscription to `/api/push/subscribe` after `subscribeToPush()`
2. DELETE subscription from `/api/push/unsubscribe` in `unsubscribeFromPush()`
3. Optionally POST user preferences (notification types enabled, daily verse time) to a preferences endpoint

---

## 6. User Preferences (stored in localStorage)

### `wr_notification_prefs`
```json
{
  "enabled": true,
  "dailyVerse": true,
  "streakReminder": true,
  "dailyVerseTime": "08:00",
  "lastDailyVerseFired": "2026-04-12",
  "lastStreakReminderFired": "2026-04-12"
}
```

### `wr_push_subscription`
Full PushSubscription record (see Section 1).

### `wr_notification_prompt_dismissed`
`"true"` — set when the BibleReader contextual prompt is shown and dismissed (once per user).

---

## 7. Deferred Test Coverage (BB-37)

Two spec acceptance criteria are deferred to the BB-37 Playwright full audit, which tests against a real browser with real service workers:

- **BibleReader contextual prompt integration test** — Verifying that `recordReadToday()` returning `delta: 'same-day'` causes the `NotificationPrompt` to appear requires mocking the entire BibleReader component tree plus four notification module functions. The trigger logic is 7 lines of straightforward conditionals at `BibleReader.tsx:572-578`. Component-level tests on `NotificationPrompt` already verify rendering. BB-37 should test this end-to-end: navigate to two different chapters in the same day and assert the prompt appears on the second.
- **SW `notificationclick` deep-link test** — Service workers are not available in jsdom. The `notificationclick` handler at `sw.ts:152-173` extracts `event.notification.data.url` and calls `clients.openWindow()` or `client.navigate()`. Verified manually during development. BB-37 should fire a test notification and assert the browser navigates to the correct `/bible/<book>/<chapter>?verse=<n>` deep link.
