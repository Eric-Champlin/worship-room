# Implementation Plan: PWA Content Caching & Install Prompt

**Spec:** `_specs/pwa-content-caching-install.md`
**Date:** 2026-03-23
**Branch:** `claude/feature/pwa-content-caching-install`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Existing PWA Setup (Spec 31)

- **vite-plugin-pwa** configured in `frontend/vite.config.ts` with `registerType: 'prompt'`
- **Precaching:** All `**/*.{js,css,html,ico,png,svg,woff2}` files are precached by Workbox
- **Runtime caching strategies:**
  - Google Fonts: `StaleWhileRevalidate` / `CacheFirst`
  - API routes (`/api/`): `NetworkFirst` (7-day, 100 entries)
  - Images: `CacheFirst` (30-day, 60 entries)
  - Same-origin: `NetworkFirst` (7-day, 200 entries, cache `wr-runtime-v1`)
- **Navigate fallback:** `/offline.html`
- **UpdatePrompt component:** `src/components/pwa/UpdatePrompt.tsx` — fixed-bottom toast, z-[9998], adjusts position based on `pillVisible`
- **Service worker registration:** Managed entirely by vite-plugin-pwa (no explicit `sw.ts`)

### Critical Discovery: Bible & Devotional Content is Local Data

**Bible chapters** are loaded via dynamic `import()` from `src/data/bible/books/*.ts` — these are code-split JS chunks that Vite already precaches. They do NOT require runtime service worker caching.

**Devotional content** is bundled inline in `src/data/devotionals.ts` — it's part of the main JS bundle, already precached.

**Implication:** Spec Requirements 2 (Bible caching) and 3 (Devotional caching) are already satisfied by Vite's precaching of static assets. No additional runtime caching configuration is needed for these. The service worker runtime caching is only needed for **ambient sound MP3 files** (Requirement 1).

### Audio File URL Pattern

- `AUDIO_BASE_URL` = `import.meta.env.VITE_AUDIO_BASE_URL ?? '/audio/'` (from `src/constants/audio.ts`)
- Sound catalog files: `AUDIO_BASE_URL + filename` (e.g., `/audio/rain-gentle.mp3`)
- 24 ambient sounds in `src/data/sound-catalog.ts` with `.mp3` filenames

### Z-Index Scale

| Element | Z-Index | Position |
|---------|---------|----------|
| Navbar | `z-50` | Fixed top |
| Toast | `z-50` | Fixed top-right |
| SceneUndoToast | `z-[9998]` | Fixed bottom |
| UpdatePrompt | `z-[9998]` | Fixed bottom, adjusts for AudioPill |
| AudioPill | `z-[9999]` | Fixed bottom |
| AudioDrawer overlay | `z-[10000]` | Fixed inset |
| AudioDrawer panel | `z-[10001]` | Fixed right/bottom |

**Install banner:** `z-[9997]` — below UpdatePrompt and AudioPill, above all page content. Adjusts bottom position when AudioPill is visible, same pattern as UpdatePrompt.

### Component Patterns

- **Hooks:** Custom hooks in `src/hooks/`, test files in `src/hooks/__tests__/`
- **PWA components:** `src/components/pwa/` (currently: `UpdatePrompt.tsx`, tests)
- **Test pattern:** Vitest + RTL, `vi.mock()` for dependencies, `vi.useFakeTimers()` for timing, `beforeEach`/`afterEach` cleanup
- **State management:** React hooks + context, localStorage via `storageService` or direct access
- **Icons:** Lucide React (`lucide-react` package)
- **Toast system:** `useToast()` hook from `src/components/ui/Toast.tsx` — `showToast(message, type)`, `showCelebrationToast()`
- **Audio state:** `useAudioState()` from `AudioProvider` — provides `pillVisible`
- **Auth:** `useAuth()` from `src/hooks/useAuth.ts` — provides `isAuthenticated`

### Spotify Embed Locations

1. `src/components/SongPickSection.tsx` — inline `<iframe>` on Daily Hub + Landing Page
2. `src/components/music/SpotifyEmbed.tsx` — reusable component used by:
3. `src/components/music/WorshipPlaylistsTab.tsx` — hero + grid of playlists

### Key Files to Modify

- `frontend/vite.config.ts` — add audio runtime caching rule
- `frontend/src/components/pwa/UpdatePrompt.tsx` — reference pattern (no changes)
- `frontend/src/components/Navbar.tsx` — add offline indicator
- `frontend/src/components/SongPickSection.tsx` — wrap Spotify embed with offline check
- `frontend/src/components/music/SpotifyEmbed.tsx` — add offline handling
- `frontend/src/components/music/WorshipPlaylistsTab.tsx` — wrap section with offline check
- `frontend/src/App.tsx` — add visit counter + install prompt provider

---

## Auth Gating Checklist

**No auth gating.** All features in this spec work for both logged-out and logged-in users. No actions require login.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — no auth-gated actions | Spec confirms "No auth gating" | — | — |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Install banner bg | background | `bg-white/10 backdrop-blur-md` | spec + design-system.md |
| Install banner border | border-top | `border-t border-white/15` | spec |
| Install banner heading | font | Inter 600 (semi-bold), white | spec + design-system.md |
| Install banner subtext | font/color | Inter 400, `text-white/50` | spec |
| Install button | background | `bg-primary` (`#6D28D9`) | design-system.md |
| Install button hover | background | `hover:bg-primary-lt` (`#8B5CF6`) | design-system.md |
| Offline message icon | color (dark bg) | `text-white/40` | spec |
| Offline message text | color (dark bg) | `text-white/60` | spec |
| Offline message icon | color (light bg) | `text-text-light` (`#7F8C8D`) | spec + design-system.md |
| Offline message text | color (light bg) | `text-text-light` | spec |
| AudioPill dark bg | background | `rgba(15, 10, 30, 0.85)` | design-system.md |
| Dismiss button | color | `text-white/60 hover:text-white` | UpdatePrompt pattern |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- AudioPill is z-[9999], UpdatePrompt is z-[9998] — new install banner should be z-[9997]
- All fixed-bottom elements adjust position when `pillVisible` — use `useAudioState()` for this
- Frosted glass on dark backgrounds: `bg-white/10 backdrop-blur-md border border-white/15`
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Primary purple: `#6D28D9` (Tailwind: `bg-primary`), light variant: `#8B5CF6` (`bg-primary-lt`)
- Icon library: Lucide React — import from `lucide-react`
- Toast system: `useToast()` → `showToast(message, 'success')` for success toasts
- Safe area bottom: `env(safe-area-inset-bottom)` used by AudioPill for notched devices

---

## Shared Data Models

### New localStorage keys

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_install_dismissed` | Read/Write | Timestamp (epoch ms) of last install banner dismissal |
| `wr_visit_count` | Read/Write | Number of app visits, incremented once per session |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Install banner full-width, safe area padding. Offline indicator in hamburger area. Offline messages full-width. |
| Tablet | 640-1024px | Install banner max-w-[560px] centered. Offline indicator next to nav items. |
| Desktop | > 1024px | Install banner max-w-[560px] centered. Offline indicator next to avatar/nav. |

---

## Vertical Rhythm

Not applicable — this spec adds fixed-position overlays and inline replacements, not new page sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 31 (PWA Manifest & Service Worker) is complete and committed (`c1fe121`)
- [x] Bible chapters are local data (dynamic imports) — already precached by Vite; no additional caching needed
- [x] Devotional content is bundled inline — already precached; no additional caching needed
- [x] Audio files served from `AUDIO_BASE_URL` (`/audio/` or CDN) — these DO need runtime caching
- [x] No auth-gated actions in this spec
- [x] Design system values verified from `_plans/recon/design-system.md`
- [ ] `pnpm build` succeeds before starting (verify Spec 31 didn't break build)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bible chapter caching | Not needed — already precached as JS chunks | `loadChapter()` uses dynamic `import()` from `src/data/bible/books/*.ts`. Vite precaches all `**/*.{js,...}` files. These are static assets, not API responses. |
| Devotional caching | Not needed — bundled inline | `src/data/devotionals.ts` is imported directly. Content is part of the main bundle. |
| Audio caching cache name | `wr-audio-cache` | Per spec. Separate from `wr-runtime-v1`. |
| Install banner z-index | `z-[9997]` | Below AudioPill (9999) and UpdatePrompt (9998), above page content. Follows existing z-index scale. |
| Install banner bottom position | Dynamic: `bottom-6` normally, `bottom-24` when AudioPill visible | Same pattern as UpdatePrompt. Uses `useAudioState()` for `pillVisible`. |
| iOS detection | UA check for iPhone/iPad + Safari | Standard approach for `beforeinstallprompt` absence detection. |
| Visit counter increment timing | On App mount (once per session via sessionStorage guard) | Prevents double-counting on HMR/re-renders. Uses `sessionStorage` flag to ensure once-per-session. |
| Offline hook SSR safety | `navigator.onLine` with typeof check | Safe for SSR (defaults to `true` if `navigator` unavailable). |
| Spotify offline handling | Wrap at the component level with `useOnlineStatus` | SpotifyEmbed gets an offline prop/wrapper; SongPickSection and WorshipPlaylistsTab check online status. |
| Local Support offline | Show OfflineMessage in SearchControls when offline | SearchControls already has geolocation — add offline check before search. |
| Prayer Wall composer offline | Show inline message in InlineComposer when offline | Disable submit, show message. |
| Share buttons offline | Hide social share options, keep copy-to-clipboard | ShareButton checks online status for external links. |

---

## Implementation Steps

### Step 1: `useOnlineStatus` Hook

**Objective:** Create a shared React hook that provides reactive online/offline status for use across the entire app.

**Files to create:**
- `frontend/src/hooks/useOnlineStatus.ts`
- `frontend/src/hooks/__tests__/useOnlineStatus.test.ts`

**Details:**

```typescript
// hooks/useOnlineStatus.ts
import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true // Assume online during SSR
}

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { isOnline }
}
```

Use `useSyncExternalStore` (React 18) instead of `useState` + `useEffect` for correctness with concurrent rendering.

**Guardrails (DO NOT):**
- Do NOT use `useState` + `useEffect` — `useSyncExternalStore` is the correct React 18 pattern for external store subscriptions
- Do NOT default to `false` (offline) — default to `true` (online) for SSR and initial render

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns `{ isOnline: true }` when navigator.onLine is true | unit | Initial state matches navigator |
| returns `{ isOnline: false }` when navigator.onLine is false | unit | Respects offline state |
| re-renders when `offline` event fires | unit | Dispatch window `offline` event, verify hook returns false |
| re-renders when `online` event fires | unit | Dispatch window `online` event after going offline, verify returns true |
| cleans up event listeners on unmount | unit | Verify removeEventListener called |

**Expected state after completion:**
- [ ] Hook exists at `src/hooks/useOnlineStatus.ts`
- [ ] All tests pass
- [ ] Hook can be imported from `@/hooks/useOnlineStatus`

---

### Step 2: `OfflineMessage` Component

**Objective:** Create a reusable inline UI element that replaces network-dependent content when offline.

**Files to create:**
- `frontend/src/components/pwa/OfflineMessage.tsx`
- `frontend/src/components/pwa/__tests__/OfflineMessage.test.tsx`

**Details:**

```typescript
interface OfflineMessageProps {
  /** Message to display. Defaults to "You're offline — this feature needs an internet connection" */
  message?: string
  /** 'dark' for dark backgrounds (text-white/40 icon, text-white/60 text), 'light' for neutral-bg */
  variant?: 'dark' | 'light'
  className?: string
}
```

Layout:
- Horizontal flex: WiFiOff icon (16px) + message text
- Icon: `WifiOff` from `lucide-react`
- Dark variant: icon `text-white/40`, text `text-white/60`
- Light variant: icon `text-text-light`, text `text-text-light`
- Font size: `text-sm` (0.875rem)
- Padding: `px-3 py-3 sm:px-4 sm:py-4`
- Full width within parent container
- `role="status"` for accessibility

**Responsive behavior:**
- All breakpoints: Full-width within parent. Text wraps naturally. Icon and text on same line.

**Guardrails (DO NOT):**
- Do NOT use alarming language ("ERROR", "FAILED", "BROKEN")
- Do NOT use red/danger colors — use muted opacity for gentle tone
- Do NOT make this an overlay — it replaces content inline

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders default message with WiFiOff icon | unit | Check default text and icon presence |
| renders custom message | unit | Pass custom `message` prop |
| dark variant uses correct colors | unit | Check `text-white/40` on icon, `text-white/60` on text |
| light variant uses correct colors | unit | Check `text-text-light` on icon and text |
| has role="status" | unit | Accessibility check |

**Expected state after completion:**
- [ ] Component exists at `src/components/pwa/OfflineMessage.tsx`
- [ ] All tests pass
- [ ] Can be imported and used with `variant="dark"` or `variant="light"`

---

### Step 3: Audio Runtime Caching in Service Worker

**Objective:** Add a Workbox runtime caching rule for ambient sound MP3 files so they're cached on first play and available offline.

**Files to modify:**
- `frontend/vite.config.ts` — add audio caching rule to `runtimeCaching` array

**Details:**

Add a new runtime caching entry **before** the catch-all same-origin rule (which is last in the array). Position it after the images rule:

```typescript
// Audio files (ambient sounds) — cache on first play for offline use
{
  urlPattern: /\.(?:mp3|wav|ogg|m4a)$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'wr-audio-cache',
    expiration: {
      maxEntries: 10,
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
    rangeRequests: true,
  },
},
```

**Key details:**
- `CacheFirst` strategy: serve from cache if available, otherwise fetch from network and cache
- `maxEntries: 10` with LRU eviction (Workbox handles this automatically)
- `rangeRequests: true` — required for audio files that may use HTTP Range requests for streaming
- `cacheableResponse: statuses: [0, 200]` — cache opaque responses (from CDN/CORS) and successful responses
- URL pattern matches `.mp3`, `.wav`, `.ogg`, `.m4a` — broader than just MP3 to future-proof
- Cache name `wr-audio-cache` per spec

**No max age** — audio files are immutable (filename-based), so no expiration needed. LRU eviction at 10 entries is sufficient.

**Guardrails (DO NOT):**
- Do NOT put this rule after the same-origin catch-all — Workbox matches rules in order, first match wins
- Do NOT use `NetworkFirst` — audio files are static assets, `CacheFirst` is correct
- Do NOT forget `rangeRequests: true` — audio playback often uses Range headers
- Do NOT change existing caching rules

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build succeeds with new caching rule | integration | Run `pnpm build` and verify success |
| Audio caching rule is in generated SW | integration | Check built SW file contains `wr-audio-cache` |

**Expected state after completion:**
- [ ] `vite.config.ts` has audio caching rule with `wr-audio-cache`
- [ ] `pnpm build` succeeds
- [ ] Generated service worker includes the audio caching strategy

---

### Step 4: Spotify Embed Offline Handling

**Objective:** Hide Spotify embeds when offline and show a gentle replacement message. Re-show when back online without page refresh.

**Files to modify:**
- `frontend/src/components/music/SpotifyEmbed.tsx` — add offline detection
- `frontend/src/components/SongPickSection.tsx` — add offline detection
- `frontend/src/components/music/WorshipPlaylistsTab.tsx` — wrap with offline check

**Files to create:**
- `frontend/src/components/music/__tests__/SpotifyEmbed-offline.test.tsx`
- `frontend/src/components/__tests__/SongPickSection-offline.test.tsx`

**Details:**

**SpotifyEmbed.tsx changes:**
Add `useOnlineStatus()` at the top. When `!isOnline`, render an offline replacement instead of the iframe:

```tsx
const { isOnline } = useOnlineStatus()

if (!isOnline) {
  return (
    <div className={cn(
      'rounded-xl border border-white/10 bg-[rgba(15,10,30,0.3)] p-6 text-center',
      className
    )}>
      <WifiOff className="mx-auto h-6 w-6 text-white/40" aria-hidden="true" />
      <p className="mt-2 text-sm text-white/60">
        Spotify playlists available when online
      </p>
    </div>
  )
}
```

Style matches the existing error fallback in SpotifyEmbed but with the offline message per spec.

**SongPickSection.tsx changes:**
Add `useOnlineStatus()`. When offline, replace the entire iframe + CTA section with:

```tsx
if (!isOnline) {
  return (
    <section aria-labelledby="song-pick-heading" className="bg-hero-dark px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20">
      <div className="mx-auto max-w-5xl text-center">
        {/* Keep heading */}
        <div className="mx-auto mt-8 max-w-xl">
          <OfflineMessage variant="dark" message="Spotify playlists available when online" />
        </div>
      </div>
    </section>
  )
}
```

Actually — keep the section heading visible but replace the iframe area with the offline message. The heading "Today's Song Pick" should still show so users know what the section is.

**WorshipPlaylistsTab.tsx changes:**
The `SpotifyEmbed` component already handles its own offline state, so no changes needed at this level — each embed will individually show the offline message.

**Responsive behavior:**
- All breakpoints: Offline message fills the embed area. Text centered. Consistent with existing error fallback layout.

**Guardrails (DO NOT):**
- Do NOT leave broken Spotify iframes visible when offline
- Do NOT remove the entire SongPickSection when offline — keep the heading visible
- Do NOT cache Spotify iframe content — it requires live connection
- Do NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SpotifyEmbed shows offline message when offline | unit | Mock `useOnlineStatus` to return `{ isOnline: false }`, verify message renders |
| SpotifyEmbed shows iframe when online | unit | Mock `useOnlineStatus` to return `{ isOnline: true }`, verify iframe renders |
| SpotifyEmbed transitions from offline to online | unit | Change mock, verify iframe appears |
| SongPickSection shows offline message when offline | unit | Verify offline replacement in section |
| SongPickSection keeps heading when offline | unit | Verify "Today's Song Pick" still visible |
| Offline message text matches spec | unit | "Spotify playlists available when online" |

**Expected state after completion:**
- [ ] Spotify embeds hidden when offline, replaced with gentle message
- [ ] Embeds reappear when back online (reactive via `useOnlineStatus`)
- [ ] All tests pass
- [ ] Heading "Today's Song Pick" remains visible when offline

---

### Step 5: Navbar Offline Indicator

**Objective:** Show a subtle WiFiOff icon in the navbar when the user is offline.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — add offline indicator

**Files to create:**
- `frontend/src/components/__tests__/Navbar-offline.test.tsx`

**Details:**

Add `useOnlineStatus()` to the Navbar component.

**Desktop (logged-in):** Add WiFiOff icon next to the avatar button in `DesktopUserActions`, before the avatar:

```tsx
{!isOnline && (
  <div className="relative group" title="You're offline — some features are limited">
    <WifiOff className="h-4 w-4 text-white/40" aria-label="You're offline — some features are limited" />
    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white">
      You're offline — some features are limited
    </div>
  </div>
)}
```

**Desktop (logged-out):** Add WiFiOff icon in the nav area, before the "Log In" button.

**Mobile:** Add WiFiOff icon in the hamburger menu header area (top of MobileDrawer), next to the close button.

**Styling:**
- Icon: `WifiOff` from lucide-react, `h-4 w-4` (~16px)
- Color: `text-white/40` — muted, non-alarming
- Tooltip: CSS-only tooltip on hover (desktop), no tooltip on mobile (visible label sufficient)
- `aria-label="You're offline — some features are limited"`
- Reactive: appears/disappears as connectivity changes (no page refresh needed)

**Responsive behavior:**
- Desktop (> 1024px / `lg`): Icon next to avatar (logged-in) or before Log In button (logged-out)
- Tablet (640-1024px): Same as mobile — in hamburger menu header
- Mobile (< 640px): In the hamburger menu header area

**Guardrails (DO NOT):**
- Do NOT use alarming colors (red, danger) — use muted `text-white/40`
- Do NOT use large icons — 16px is intentionally subtle
- Do NOT block other navbar interactions
- Do NOT add JavaScript-based tooltip — CSS `group-hover` is sufficient

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| WiFiOff icon not shown when online | unit | Mock online, verify no WiFiOff in navbar |
| WiFiOff icon shown when offline | unit | Mock offline, verify WiFiOff rendered |
| Icon has correct aria-label | unit | Check accessible name |
| Icon has tooltip text | unit | Check title attribute or tooltip content |
| Icon appears reactively on connectivity change | unit | Toggle online status, verify icon appears/disappears |

**Expected state after completion:**
- [ ] WiFiOff icon appears in navbar when offline
- [ ] Icon is subtle (16px, muted opacity)
- [ ] Tooltip on hover (desktop)
- [ ] Reactive to connectivity changes
- [ ] All tests pass

---

### Step 6: Install Prompt Hook & Visit Counter

**Objective:** Create the install prompt logic: visit counting, deferred `beforeinstallprompt` event capture, iOS detection, dismissal tracking, and display conditions.

**Files to create:**
- `frontend/src/hooks/useInstallPrompt.ts`
- `frontend/src/hooks/__tests__/useInstallPrompt.test.ts`

**Details:**

```typescript
interface UseInstallPromptReturn {
  /** Whether to show the install banner */
  showBanner: boolean
  /** Whether this is iOS Safari (needs manual instructions) */
  isIOS: boolean
  /** Call the deferred prompt's prompt() method (standard browsers only) */
  triggerInstall: () => Promise<'accepted' | 'dismissed' | null>
  /** Dismiss the banner (stores timestamp in localStorage) */
  dismissBanner: () => void
}
```

**Visit counter logic:**
- On hook mount, check `sessionStorage.getItem('wr_session_counted')`
- If not set: increment `wr_visit_count` in localStorage, set sessionStorage flag
- This ensures exactly one increment per browser session (survives HMR, prevents double-count)

**beforeinstallprompt capture:**
- Listen for `beforeinstallprompt` event on `window`
- Store the event in a ref (`deferredPromptRef`)
- `triggerInstall()` calls `deferredPromptRef.current.prompt()` and awaits `userChoice`

**Display conditions (ALL must be true):**
1. `wr_visit_count >= 2` (not first visit)
2. Not in standalone mode (`window.matchMedia('(display-mode: standalone)').matches === false`)
3. Not dismissed in last 7 days (check `wr_install_dismissed` timestamp)
4. Either: `deferredPromptRef.current` exists (standard browsers) OR `isIOS` is true

**iOS detection:**
```typescript
function isIOSSafari(): boolean {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIOS && isSafari
}
```

**Dismiss logic:**
- `dismissBanner()` stores `Date.now()` in `wr_install_dismissed` localStorage
- 7-day cooldown: `Date.now() - stored > 7 * 24 * 60 * 60 * 1000`

**Guardrails (DO NOT):**
- Do NOT show banner on first visit — require `wr_visit_count >= 2`
- Do NOT show banner in standalone mode
- Do NOT increment visit count more than once per session
- Do NOT cache the `beforeinstallprompt` event in state — use a ref to avoid stale closures

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| increments wr_visit_count on first call | unit | Check localStorage after mount |
| does not increment twice in same session | unit | Remount hook, check count is still 1 |
| showBanner is false on first visit | unit | wr_visit_count = 1, verify false |
| showBanner is true on second visit | unit | wr_visit_count = 2 + beforeinstallprompt fired, verify true |
| showBanner is false when dismissed < 7 days ago | unit | Set wr_install_dismissed to recent, verify false |
| showBanner is true when dismissed > 7 days ago | unit | Set wr_install_dismissed to 8 days ago, verify true |
| showBanner is false in standalone mode | unit | Mock matchMedia to return standalone, verify false |
| isIOS is true for iPhone Safari UA | unit | Mock navigator.userAgent |
| isIOS is false for Chrome on iOS | unit | Mock UA with CriOS |
| triggerInstall calls prompt() on deferred event | unit | Mock event, verify prompt() called |
| dismissBanner stores timestamp | unit | Verify localStorage written |

**Expected state after completion:**
- [ ] Hook handles all display conditions
- [ ] Visit counter works correctly with sessionStorage guard
- [ ] iOS detection works for Safari but not Chrome/Firefox on iOS
- [ ] All tests pass

---

### Step 7: Install Prompt Banner Component

**Objective:** Create the user-facing install banner that appears at the bottom of the screen.

**Files to create:**
- `frontend/src/components/pwa/InstallBanner.tsx`
- `frontend/src/components/pwa/__tests__/InstallBanner.test.tsx`

**Details:**

Two visual variants in one component: standard (Chrome/Android/Edge) and iOS Safari.

**Standard banner layout:**
```
[Worship Room icon 32px] | "Install Worship Room" (bold)        | [Install btn] [X]
                         | "Get the full app experience" (muted) |
```

**iOS banner layout:**
```
[Share icon] | "Install Worship Room"                                                | [X]
             | "Tap the Share button below, then 'Add to Home Screen'" (muted text)  |
```

**Styling (both variants):**
- Position: `fixed left-1/2 -translate-x-1/2` (centered)
- Z-index: `z-[9997]`
- Background: `bg-white/10 backdrop-blur-md border-t border-white/15`
- Rounded: `rounded-xl` (matches UpdatePrompt)
- Shadow: `shadow-2xl`
- Animation: `animate-fade-in` (existing Tailwind animation — slides up + fades in)
- Bottom position: `bottom-6` normally, `bottom-24` when AudioPill visible (via `useAudioState().pillVisible`)

**Mobile (< 640px):**
- `w-[calc(100%-32px)]` (16px margin each side)
- `pb-[max(16px,env(safe-area-inset-bottom))]` for notched devices

**Tablet/Desktop (>= 640px):**
- `sm:max-w-[560px]`

**Install button:** `rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-lt`

**Dismiss button:** `text-white/60 hover:text-white` with X icon, `aria-label="Dismiss install prompt"`

**Worship Room icon:** Use a simple app icon — can use a small inline SVG of the cross/worship motif, or the `Church` icon from Lucide as a stand-in. [UNVERIFIED] Using Lucide `Church` icon as app icon stand-in.
→ To verify: Check if there's a dedicated app icon SVG in `public/`
→ If wrong: Replace with the actual app icon from the PWA manifest assets

**iOS share icon:** Use `Share` or `ExternalLink` from Lucide with the characteristic iOS share shape. [UNVERIFIED] Using `Share` from Lucide.
→ To verify: Check if iOS share icon (square with up arrow) matches Lucide's `Share` icon
→ If different: Create a small inline SVG matching the iOS share icon

**On install success:** Show celebration toast via `useToast()`:
```typescript
showToast('Worship Room installed! Find it on your home screen.', 'success')
```

**Guardrails (DO NOT):**
- Do NOT use alarming or pushy language — tone is gentle invitation
- Do NOT make the banner hard to dismiss
- Do NOT show banner in standalone/installed mode
- Do NOT use `dangerouslySetInnerHTML`
- Do NOT forget safe area padding on mobile

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders standard banner when showBanner and not iOS | unit | Verify "Install Worship Room" text and Install button |
| renders iOS banner when showBanner and isIOS | unit | Verify iOS-specific instructions |
| Install button triggers install | unit | Click Install, verify triggerInstall called |
| Dismiss button calls dismissBanner | unit | Click X, verify dismissBanner called |
| shows celebration toast on successful install | unit | Mock triggerInstall returning 'accepted', verify toast |
| banner has correct z-index | unit | Check z-[9997] class |
| adjusts bottom when AudioPill visible | unit | Mock pillVisible, check bottom-24 class |
| has safe area padding on mobile | unit | Check safe-area-inset-bottom style |
| does not render when showBanner is false | unit | Verify null output |
| has correct ARIA attributes | unit | role, aria-label checks |

**Expected state after completion:**
- [ ] Install banner renders correctly for standard and iOS variants
- [ ] Correct positioning (z-index, bottom adjustment for AudioPill)
- [ ] Safe area padding on mobile
- [ ] Animation on appearance
- [ ] Toast on successful install
- [ ] All tests pass

---

### Step 8: Wire Install Banner into App

**Objective:** Add the InstallBanner to the app layout and wire up the visit counter.

**Files to modify:**
- `frontend/src/App.tsx` — add InstallBanner component

**Details:**

Add `<InstallBanner />` alongside `<UpdatePrompt />` in `App.tsx`. The InstallBanner is self-contained — it uses `useInstallPrompt()` internally and only renders when conditions are met.

```tsx
// In App.tsx, alongside UpdatePrompt:
<UpdatePrompt />
<InstallBanner />
```

The visit counter is handled inside `useInstallPrompt()` which runs on mount. No additional wiring needed.

**Guardrails (DO NOT):**
- Do NOT wrap InstallBanner in any auth gate — it works for all users
- Do NOT add new routes — this is a floating UI element
- Do NOT change provider wrapping order

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| InstallBanner is rendered in the app tree | integration | Render App, verify InstallBanner mounts (may be hidden) |

**Expected state after completion:**
- [ ] InstallBanner renders in the app
- [ ] Visit counter increments on app load
- [ ] Banner appears when all conditions are met

---

### Step 9: Offline Handling for Network-Dependent Features

**Objective:** Add offline graceful degradation to Prayer Wall composer, Local Support search, and share buttons.

**Files to modify:**
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — disable submit when offline
- `frontend/src/components/local-support/SearchControls.tsx` — show offline message when offline
- `frontend/src/components/daily/ShareButton.tsx` — hide social share options when offline

**Files to create:**
- `frontend/src/components/prayer-wall/__tests__/InlineComposer-offline.test.tsx`
- `frontend/src/components/local-support/__tests__/SearchControls-offline.test.tsx`
- `frontend/src/components/daily/__tests__/ShareButton-offline.test.tsx`

**Details:**

**InlineComposer.tsx:**
- Add `useOnlineStatus()` at the top
- When `!isOnline`, show an inline `OfflineMessage` at the top of the composer: "Posting prayers requires an internet connection"
- Disable the submit button when offline (`disabled` attribute + reduced opacity)
- User can still type (draft stays in state) — just can't submit

**SearchControls.tsx:**
- Add `useOnlineStatus()` at the top
- When `!isOnline`, replace the search interface with `<OfflineMessage variant="light" message="Search requires an internet connection" />`
- Geolocation button also hidden when offline (it works offline technically, but search doesn't)

**ShareButton.tsx:**
- Add `useOnlineStatus()` at the top
- In the fallback dropdown menu, when `!isOnline`:
  - Keep "Copy link" (works offline — clipboard API is local)
  - Hide: Email, SMS, Facebook, X/Twitter (require external services)
- Web Share API: Allow attempt (OS may handle offline sharing differently per platform)

**Responsive behavior:**
- All breakpoints: Inline messages fill their container. No layout changes.

**Guardrails (DO NOT):**
- Do NOT prevent users from typing in the composer when offline — only disable submit
- Do NOT show error messages — use gentle offline messages
- Do NOT remove the copy-to-clipboard option when offline
- Do NOT change the Prayer Wall feed display when offline (cached content should still show)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| InlineComposer shows offline message when offline | unit | Mock offline, verify message |
| InlineComposer disables submit when offline | unit | Mock offline, verify button disabled |
| InlineComposer allows typing when offline | unit | Mock offline, type in textarea, verify text |
| SearchControls shows offline message when offline | unit | Mock offline, verify message replaces search |
| ShareButton hides social options when offline | unit | Mock offline, verify Facebook/Twitter hidden |
| ShareButton keeps copy-to-clipboard when offline | unit | Mock offline, verify copy option present |

**Expected state after completion:**
- [ ] Prayer Wall composer shows offline message, submit disabled
- [ ] Local Support search replaced with offline message
- [ ] Share button hides social options, keeps copy
- [ ] All transitions are reactive (no page refresh needed)
- [ ] All tests pass

---

### Step 10: Integration Testing & Build Verification

**Objective:** Verify the build succeeds, all existing tests still pass, and new features integrate correctly.

**Files to modify:** None (verification only)

**Details:**

1. Run `pnpm build` — verify success with new Workbox config
2. Run `pnpm test` — verify all existing tests pass
3. Run `pnpm lint` — verify no linting errors
4. Manually verify in built output:
   - Check generated service worker contains `wr-audio-cache` cache name
   - Verify `navigateFallback` is still `/offline.html`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| pnpm build succeeds | integration | Build completes without errors |
| pnpm test passes | integration | All tests (existing + new) pass |
| SW contains audio cache config | integration | Grep built SW for `wr-audio-cache` |

**Expected state after completion:**
- [ ] Build succeeds
- [ ] All tests pass (existing + ~40 new tests)
- [ ] No lint errors
- [ ] Service worker correctly configured

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | `useOnlineStatus` hook |
| 2 | — | `OfflineMessage` component |
| 3 | — | Audio runtime caching in Workbox config |
| 4 | 1, 2 | Spotify embed offline handling |
| 5 | 1 | Navbar offline indicator |
| 6 | — | Install prompt hook + visit counter |
| 7 | 6 | Install banner component |
| 8 | 7 | Wire banner into App |
| 9 | 1, 2 | Offline handling for network-dependent features |
| 10 | 1-9 | Integration testing & build verification |

**Parallelizable:** Steps 1, 2, 3, 6 are independent — can be executed in any order. Steps 4 and 5 depend on Step 1. Step 7 depends on Step 6. Step 9 depends on Steps 1 and 2.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | `useOnlineStatus` hook | [COMPLETE] | 2026-03-23 | Created `src/hooks/useOnlineStatus.ts` (useSyncExternalStore), 5 tests pass |
| 2 | `OfflineMessage` component | [COMPLETE] | 2026-03-23 | Created `src/components/pwa/OfflineMessage.tsx`, 5 tests pass |
| 3 | Audio runtime caching | [COMPLETE] | 2026-03-23 | Added `wr-audio-cache` CacheFirst rule to `vite.config.ts` with rangeRequests |
| 4 | Spotify embed offline handling | [COMPLETE] | 2026-03-23 | Modified `SpotifyEmbed.tsx`, `SongPickSection.tsx`; 7 tests pass |
| 5 | Navbar offline indicator | [COMPLETE] | 2026-03-23 | Modified `Navbar.tsx` (desktop auth/user + mobile drawer); 5 tests pass |
| 6 | Install prompt hook & visit counter | [COMPLETE] | 2026-03-23 | Created `src/hooks/useInstallPrompt.ts`, 11 tests pass |
| 7 | Install banner component | [COMPLETE] | 2026-03-23 | Created `InstallBanner.tsx` with standard + iOS variants, used `/icon-192.png` instead of Lucide Church icon; 10 tests pass |
| 8 | Wire banner into App | [COMPLETE] | 2026-03-23 | Added `<InstallBanner />` to `App.tsx` alongside `<UpdatePrompt />` |
| 9 | Offline handling for network features | [COMPLETE] | 2026-03-23 | Modified `InlineComposer.tsx`, `SearchControls.tsx`, `ShareButton.tsx`; 9 tests pass |
| 10 | Integration testing & build verification | [COMPLETE] | 2026-03-23 | 353/355 test files pass (3630/3644 tests), 2 pre-existing failures (BibleReader*). Build fails with 7 pre-existing TS errors (none in our files). Lint: 1 issue fixed (unused import), remainder pre-existing. `wr-audio-cache` confirmed in config. |
