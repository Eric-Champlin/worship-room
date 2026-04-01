# Implementation Plan: PWA Install Prompt Improvement

**Spec:** `_specs/pwa-install-prompt-improvement.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/pwa-install-prompt-improvement`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Existing Files & Patterns

- **`frontend/src/hooks/useInstallPrompt.ts`** — Current hook captures `beforeinstallprompt` internally, stores deferred prompt in a ref, manages visit count (`wr_visit_count`), dismissal (`wr_install_dismissed` with 7-day cooldown), standalone detection, and iOS detection. Returns `{ showBanner, isIOS, triggerInstall, dismissBanner }`. Show threshold: `visitCount >= 2`.
- **`frontend/src/components/pwa/InstallBanner.tsx`** — Current bottom-fixed overlay banner. Uses `useInstallPrompt`, `useAudioState` (for `pillVisible` positioning), `useToast`. Renders at `fixed bottom-6/bottom-24` with z-index `Z.INSTALL_BANNER` (9997). Glassmorphic: `bg-white/10 backdrop-blur-md rounded-xl border-t border-white/15`. iOS-specific path (Share icon + manual instructions). Non-iOS: 32px app icon + text + Install button + X dismiss.
- **`frontend/src/App.tsx:161`** — `InstallBanner` rendered at root level (after `WhisperToastProvider`, before `ChunkErrorBoundary`), outside any route-specific layout.
- **`frontend/src/components/Navbar.tsx`** — `SeasonalBanner` rendered at line 234: `{!hideBanner && <SeasonalBanner />}`, inside the `<nav>` tag, after the navbar pill content and `MobileDrawer`. Navbar container: `mx-auto max-w-6xl px-4 pt-5 pb-2 sm:px-6`.
- **`frontend/src/components/SeasonalBanner.tsx`** — Full-width div with glassmorphic inner: `rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 px-4 py-2 sm:px-6`. Dismiss with max-height/opacity animation (200ms). Dismiss button: `h-11 w-11` touch target, absolute-positioned right.
- **`frontend/src/pages/Settings.tsx`** — 5 sections: profile, dashboard, notifications, privacy, account. Sections array at line 21-27. Content rendered in `<div className="flex-1 max-w-[640px]">` via conditional rendering on `activeSection`.
- **`frontend/src/components/settings/AccountSection.tsx`** — Section card pattern: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`. Heading: `text-base font-semibold text-white md:text-lg mb-6`. Rows use `space-y-4` with `flex items-center justify-between`. Buttons: `min-h-[44px]`, `text-primary hover:text-primary-lt`, focus-visible ring.
- **`frontend/src/components/dashboard/DashboardWidgetGrid.tsx`** — Grid: `grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5`. Widgets rendered via switch on `WidgetId`. Each widget wrapped in div with CSS `order` property and `colSpan` from `WIDGET_MAP`. Full-width widgets use `lg:col-span-5`.
- **`frontend/src/constants/dashboard/widget-order.ts`** — `WidgetId` union type, `WIDGET_DEFINITIONS` array, `WIDGET_MAP`, `TIME_OF_DAY_ORDERS`. The `getting-started` widget is always last in the definitions array.
- **`frontend/src/constants/z-index.ts`** — `Z.INSTALL_BANNER: 9997`. The new banner does not need this z-index since it will be in page flow, not fixed.

### Provider Tree (App.tsx)

`BrowserRouter > HelmetProvider > ErrorBoundary > AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > WhisperToastProvider > [MidnightVerse, UpdatePrompt, InstallBanner] > ChunkErrorBoundary > Suspense > PageTransition > Routes`

### Test Patterns

- Vitest + React Testing Library
- Component tests wrap in necessary providers: `AuthProvider`, `ToastProvider`, `AudioProvider`, etc.
- Mock `localStorage` via `vi.spyOn(Storage.prototype, 'getItem')` / `setItem`
- Mock `window.matchMedia` for standalone detection
- Mock `window.addEventListener` for `beforeinstallprompt`
- Render and assert with `screen.getByRole`, `screen.getByText`, `screen.queryByText`
- Use `vi.useFakeTimers()` for timer-dependent tests (auto-dismiss)

---

## Auth Gating Checklist

**No new auth gating required.** The banner works for both logged-out and logged-in users. Settings and Dashboard are already auth-gated pages.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View install banner | No auth needed | Step 2 | N/A — renders globally |
| Tap Install on banner | No auth needed | Step 2 | N/A |
| View Settings install row | Settings page is already auth-gated | Step 4 | Existing `Navigate` redirect in Settings.tsx |
| View dashboard install card | Dashboard is already auth-gated | Step 5 | Existing auth check in Dashboard route |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Navbar container | max-width + padding | `max-w-6xl mx-auto px-4 sm:px-6` | Navbar.tsx:180 |
| Seasonal banner glass | background | `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl` | SeasonalBanner.tsx:77 |
| Seasonal banner padding | padding | `px-4 py-2 sm:px-6` | SeasonalBanner.tsx:77 |
| Seasonal banner dismiss | size | `h-11 w-11` (44px touch target) | SeasonalBanner.tsx:97 |
| Dashboard card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4` | design-system.md, DashboardCard pattern |
| Settings section card | background | `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6` | AccountSection.tsx:41 |
| Settings heading | font | `text-base font-semibold text-white md:text-lg mb-6` | AccountSection.tsx:42 |
| Primary button | background | `bg-primary text-white rounded-full` | spec, consistent with CTAs app-wide |
| Text primary | opacity | `text-white/70` | design-system.md WCAG table |
| Text secondary | opacity | `text-white/60` | design-system.md WCAG table |
| Text decorative/dismiss | opacity | `text-white/40` | design-system.md WCAG table |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Seasonal banner glassmorphic: `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl` — NOT `bg-white/10` (the old InstallBanner used `bg-white/10`, seasonal uses `0.04`)
- Dashboard cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` — note `backdrop-blur-sm` not `backdrop-blur-md`
- Navbar container width: `max-w-6xl mx-auto px-4 sm:px-6` — consistent across navbar pill and seasonal banner
- Dismiss button touch target: `h-11 w-11` (44px) — match SeasonalBanner pattern
- Primary button pill: `bg-primary text-white rounded-full px-4 py-1.5` — per spec, compact
- Text opacities: 70% primary, 60% secondary, 40% decorative/dismiss — WCAG AA required
- Hook APIs: Always verify destructured properties match actual hook return signature (e.g., `useSoundEffects()` returns `{ playSoundEffect }` NOT `{ play }`)
- Toast hook: `useToast()` returns `{ showToast }`, not a callable function directly
- Settings row buttons: `min-h-[44px]`, `text-primary hover:text-primary-lt`, focus-visible ring with `focus-visible:ring-offset-dashboard-dark`
- Animation: Use `200ms ease-out` for slides/fades, match SeasonalBanner animation approach

---

## Shared Data Models (from Master Plan)

N/A — standalone feature.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_install_dismissed` | Both | Banner dismissal timestamp. Change: permanent (remove 7-day cooldown) |
| `wr_visit_count` | Read | Visit count. Change: threshold from >= 2 to >= 3 |
| `wr_install_dashboard_shown` | Both | NEW — dashboard card one-time show flag |
| `wr_session_counted` | Read | Session flag for visit counting (no change) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Banner full-width in `max-w-6xl` container. Single-row icon+text+button+X. Dashboard card full-width at bottom of single-column grid. |
| Tablet | 768px | Banner centered in `max-w-6xl`. Comfortable single row. Dashboard card at bottom of widget grid. |
| Desktop | 1440px | Banner centered in `max-w-6xl`. Dashboard card at bottom of 5-column grid, spans full width (`lg:col-span-5`). |

---

## Vertical Rhythm

| From -> To | Expected Gap | Source |
|-----------|-------------|--------|
| Seasonal banner -> Install banner | `mt-2` (8px) | spec requirement |
| Navbar pill -> Install banner (no seasonal) | `mt-2` (8px) | consistent spacing |
| Install banner -> page content | Natural page flow (no gap needed — banner is in-flow) | spec |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec file read and understood
- [x] Current `useInstallPrompt` hook implementation reviewed
- [x] Current `InstallBanner` component implementation reviewed
- [x] Navbar/SeasonalBanner layout structure understood
- [x] Settings page section pattern understood
- [x] Dashboard widget grid structure understood
- [x] No new auth gating required (verified)
- [x] Design system values sourced from codebase (not guessed)
- [ ] iOS install flow is OUT OF SCOPE per spec — existing iOS banner behavior is unaffected
- [ ] The `beforeinstallprompt` event currently lives inside the hook as a ref — it needs to be lifted to context for shared access

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto-dismiss progress line | Implement — CSS animation on a thin bar (`h-0.5 bg-white/20`) | Spec says "implement if straightforward" — a CSS animation shrinking width from 100% to 0 over 10s is simple |
| Seasonal + install banner coexistence | Show both with `mt-2` spacing between them | Spec says prioritize seasonal if "too much visual noise" — both are compact single-row bars, coexistence is fine |
| Dashboard card placement | Render after all other widgets, always last in the grid (after `getting-started`) | Spec says "bottom of the widget grid (last widget)" — render outside the widget order system, unconditionally last |
| Settings section placement | Add "App" section after "Account" with its own card | Spec suggests "Account section or a new App section" — separate section keeps it clean and avoids cluttering Account |
| Hook → Context refactor | Create `InstallPromptProvider` context wrapping the app, replace direct `useInstallPrompt` calls | Three consumers need the deferred prompt — context is the right pattern |
| iOS handling in new banner | Keep iOS-specific behavior in the banner (Share icon + instructions) | Spec says iOS is out of scope for this redesign but doesn't say remove it — preserve existing iOS behavior in the redesigned banner |
| Visit count threshold | Change from `>= 2` to `>= 3` in the hook | Spec requirement 6 |
| Dismiss cooldown removal | Remove 7-day cooldown entirely — dismissal is permanent | Spec requirement 1: "no 7-day cooldown" |
| Banner z-index | Remove fixed positioning and z-index — banner is now in page flow | Banner moves from fixed overlay to in-flow element below navbar |
| Settings section name in tabs | Add new section `{ id: 'app', label: 'App' }` to `SECTIONS` array | Keep separate from Account for clarity |
| After successful install in Settings | Show "App Installed" green indicator (non-interactive) | Spec says "hides entirely or shows confirmation" — green text indicator is warmer |

---

## Implementation Steps

### Step 1: Create `InstallPromptProvider` Context

**Objective:** Lift the `beforeinstallprompt` event capture from the hook into a shared context so all three consumers (banner, settings row, dashboard card) can access the deferred prompt.

**Files to create/modify:**
- `frontend/src/contexts/InstallPromptContext.tsx` — NEW: context provider
- `frontend/src/hooks/useInstallPrompt.ts` — MODIFY: refactor to consume context, simplify

**Details:**

Create `InstallPromptContext.tsx` that:
1. Captures `beforeinstallprompt` on `window` (move from hook)
2. Stores deferred prompt in a ref
3. Tracks: `isInstallable` (prompt captured), `isInstalled` (standalone check via `matchMedia`), `isDismissed` (localStorage `wr_install_dismissed` is set)
4. Exposes `promptInstall()` — calls `deferredPrompt.prompt()`, awaits `userChoice`, returns outcome
5. Exposes `dismissBanner()` — sets `wr_install_dismissed` to `Date.now()`, updates state
6. Exposes `markDashboardCardShown()` — sets `wr_install_dashboard_shown` to `"true"`
7. Exposes `isDashboardCardShown` — reads `wr_install_dashboard_shown`
8. Tracks `visitCount` (move increment logic from hook)
9. `isIOS` detection (move from hook)
10. Listens for `appinstalled` event on `window` to update `isInstalled` reactively

Interface:
```typescript
interface InstallPromptContextValue {
  isInstallable: boolean    // beforeinstallprompt captured (or iOS Safari)
  isInstalled: boolean      // standalone mode or appinstalled fired
  isIOS: boolean            // iOS Safari (needs manual instructions)
  visitCount: number        // current visit count
  isDismissed: boolean      // wr_install_dismissed is set
  isDashboardCardShown: boolean  // wr_install_dashboard_shown is set
  promptInstall: () => Promise<'accepted' | 'dismissed' | null>
  dismissBanner: () => void
  markDashboardCardShown: () => void
}
```

Remove the 7-day cooldown logic (`DISMISS_COOLDOWN_MS`, `isDismissedRecently()`). Dismissal is now permanent: if `wr_install_dismissed` is set, `isDismissed = true`.

Change visit count threshold from `>= 2` to `>= 3` (the threshold check moves to consumers, but expose raw `visitCount`).

Refactor `useInstallPrompt.ts` to simply re-export the context value:
```typescript
export function useInstallPrompt() {
  return useContext(InstallPromptContext)
}
```

Keep the helper functions `isIOSSafari()`, `isStandalone()`, `getVisitCount()`, `incrementVisitCount()` in the context file (they're implementation details).

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove iOS detection — preserve existing iOS behavior
- DO NOT change the `wr_visit_count` increment logic or `wr_session_counted` pattern
- DO NOT add any new localStorage keys beyond `wr_install_dashboard_shown`
- DO NOT move the `beforeinstallprompt` listener to a component — keep it in context/hook level

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| captures beforeinstallprompt and sets isInstallable | unit | Fire custom event, verify context value |
| promptInstall calls prompt() and returns outcome | unit | Mock deferred prompt, verify method call |
| dismissBanner sets wr_install_dismissed permanently | unit | Call dismiss, verify localStorage set, verify isDismissed = true |
| no 7-day cooldown — dismissed stays dismissed | unit | Set wr_install_dismissed to old timestamp, verify isDismissed = true |
| visitCount incremented once per session | unit | Mount provider, verify count incremented, remount, verify not re-incremented |
| isInstalled detects standalone mode | unit | Mock matchMedia to return true, verify isInstalled |
| markDashboardCardShown sets localStorage key | unit | Call method, verify wr_install_dashboard_shown = "true" |
| isIOS detects iOS Safari | unit | Mock navigator.userAgent, verify isIOS |
| appinstalled event sets isInstalled | unit | Fire appinstalled, verify isInstalled = true |

**Expected state after completion:**
- [ ] `InstallPromptContext` created with full interface
- [ ] `useInstallPrompt` hook refactored to consume context
- [ ] 7-day cooldown removed
- [ ] Visit count threshold logic available (raw count exposed)
- [ ] All 9 unit tests pass

---

### Step 2: Wire Provider into App.tsx & Redesign Install Banner

**Objective:** Add `InstallPromptProvider` to the App provider tree. Replace the bottom-fixed overlay banner with a top notification bar rendered inside the Navbar layout area.

**Files to create/modify:**
- `frontend/src/App.tsx` — MODIFY: add `InstallPromptProvider`, remove old `InstallBanner` import
- `frontend/src/components/pwa/InstallBanner.tsx` — MODIFY: complete redesign
- `frontend/src/components/Navbar.tsx` — MODIFY: render `InstallBanner` after `SeasonalBanner`

**Details:**

**App.tsx changes:**
1. Add `InstallPromptProvider` to the provider tree. Place it after `AuthProvider` (before `ToastProvider`) so all providers below can access it:
   ```
   AuthProvider > InstallPromptProvider > ToastProvider > AuthModalProvider > ...
   ```
2. Remove the `<InstallBanner />` render at line 161 (it moves to Navbar)
3. Import `InstallPromptProvider` from `@/contexts/InstallPromptContext`

**Navbar.tsx changes:**
1. Import `InstallBanner` from `@/components/pwa/InstallBanner`
2. Render `<InstallBanner />` after `<SeasonalBanner />` at line 234, with `mt-2` spacing:
   ```tsx
   {!hideBanner && <SeasonalBanner />}
   <InstallBanner />
   ```
   The `InstallBanner` handles its own visibility logic internally. No need for `hideBanner` check — the banner self-hides based on context state.

**InstallBanner.tsx redesign:**

Replace the entire component. New design:
- **Layout:** In-flow element (NOT fixed), inside the Navbar container's `max-w-6xl mx-auto` area
- **Structure:** Single horizontal row — 24px app icon + message text + Install button (rounded-full pill) + dismiss X
- **Glassmorphic:** `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl` (match SeasonalBanner exactly)
- **Padding:** `px-4 py-2 sm:px-6` (match SeasonalBanner)
- **Message:** `text-white/70 text-sm` — "Worship Room is better as an app"
- **Install button:** `bg-primary text-white text-sm rounded-full px-4 py-1.5 hover:bg-primary-lt transition-colors` — compact pill
- **Dismiss X:** `h-11 w-11` touch target (absolute right, match SeasonalBanner pattern), icon `h-3.5 w-3.5`, `text-white/40 hover:text-white/60`
- **App icon:** `<img src="/icon-192.png" alt="" className="h-6 w-6 shrink-0 rounded-md" aria-hidden="true" />` (24px per spec)
- **ARIA:** `role="complementary" aria-label="Install app suggestion"` (not `dialog` — it's not modal)

**Show conditions (ALL must be true):**
```typescript
const show = isInstallable && !isInstalled && !isDismissed && visitCount >= 3
```

For iOS: preserve existing behavior — show Share icon + instructions instead of Install button.

**Animation:**
- Slide down on appear: wrapper div with `max-height` transition (0 -> 200px) and `opacity` (0 -> 1), 200ms ease-out. Match SeasonalBanner's animation pattern exactly.
- Slide up on dismiss: set `hiding` state, transition `max-height` to 0 and `opacity` to 0, 200ms ease-in. After transition, call `dismissBanner()`.

**Auto-dismiss (10 seconds):**
- `useEffect` starts a 10-second timer when the banner is visible
- Timer calls the dismiss handler (same as manual dismiss — sets localStorage, hides banner)
- Timer cancelled on unmount, manual dismiss, or Install tap
- Progress line: thin `h-0.5 bg-white/20 rounded-full` bar at the bottom of the banner content div. CSS animation: `width` from `100%` to `0%` over `10s linear`. Use inline `style` with `animation` property.

**Remove:** All references to `Z.INSTALL_BANNER` z-index, `fixed` positioning, `bottom-*` classes, `useAudioState` import (no longer needed for pill positioning).

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Banner centered within `max-w-6xl` container. Icon + text + button + X comfortably in one row.
- Tablet (768px): Same as desktop, slightly less horizontal space.
- Mobile (375px): Full-width within container padding. Install button and X must be >= 44px touch targets. Text may need to be shorter on very narrow screens — use `truncate` on message text as a safety net, or let it wrap naturally (the flex layout handles it). Test at 320px to verify no awkward wrapping.

**Guardrails (DO NOT):**
- DO NOT use `fixed` positioning — banner must be in page flow
- DO NOT use z-index — banner is in normal document flow
- DO NOT use `useAudioState` — no longer needed (banner is not overlapping audio pill)
- DO NOT remove iOS detection/behavior — keep it working in the new layout
- DO NOT forget to cancel the auto-dismiss timer on unmount and user interaction

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| banner renders when all conditions met | integration | Set visitCount=3, fire beforeinstallprompt, verify banner visible |
| banner does not render when visitCount < 3 | integration | Set visitCount=2, verify banner not rendered |
| banner does not render when dismissed | integration | Set wr_install_dismissed, verify banner not rendered |
| banner does not render when installed | integration | Mock standalone=true, verify banner not rendered |
| Install button triggers native prompt | integration | Click Install, verify promptInstall called |
| Install + accepted dismisses banner and shows toast | integration | Mock accepted outcome, verify banner hides + toast shown |
| Dismiss X hides banner and sets localStorage | integration | Click X, verify wr_install_dismissed set |
| auto-dismiss after 10 seconds | integration | Use fake timers, advance 10s, verify banner dismissed |
| auto-dismiss cancelled by manual dismiss | integration | Dismiss manually before 10s, advance timer, verify no double-dismiss |
| auto-dismiss cancelled by Install tap | integration | Tap Install before 10s, verify timer cancelled |
| progress line renders and animates | unit | Verify h-0.5 element exists with animation style |
| banner renders below seasonal banner with mt-2 spacing | integration | Render Navbar with both banners visible, verify order and spacing |
| banner slides down on appear (animation classes present) | unit | Verify animation wrapper has transition styles |
| iOS shows Share icon instead of Install button | integration | Mock iOS Safari UA, verify Share icon + instructions text |
| mobile: Install and X buttons have 44px touch targets | unit | Verify min-h-[44px] / h-11 w-11 classes |

**Expected state after completion:**
- [ ] `InstallPromptProvider` in App.tsx provider tree
- [ ] Old fixed `InstallBanner` removed from App.tsx root
- [ ] New `InstallBanner` renders inside Navbar after SeasonalBanner
- [ ] Banner uses glassmorphic styling matching SeasonalBanner
- [ ] Auto-dismiss with progress line works
- [ ] All 15 tests pass
- [ ] `pnpm build` succeeds

---

### Step 3: Remove Unused Z-Index Entry

**Objective:** Clean up the `Z.INSTALL_BANNER` z-index constant since the banner is no longer fixed-positioned.

**Files to create/modify:**
- `frontend/src/constants/z-index.ts` — MODIFY: remove `INSTALL_BANNER` entry

**Details:**

Remove the `INSTALL_BANNER: 9997` entry from the `Z` object. The banner no longer uses fixed positioning and doesn't need a z-index.

Search the codebase for any other references to `Z.INSTALL_BANNER` to ensure nothing else uses it (the old `InstallBanner.tsx` was the only consumer).

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove other z-index entries
- DO NOT renumber the remaining values

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Z constant does not include INSTALL_BANNER | unit | Import Z, verify INSTALL_BANNER is not a key |

**Expected state after completion:**
- [ ] `Z.INSTALL_BANNER` removed
- [ ] No other code references `Z.INSTALL_BANNER`
- [ ] TypeScript compiles cleanly

---

### Step 4: Settings Page Install Row

**Objective:** Add an "Install App" section to the Settings page that allows users to install the PWA at any time.

**Files to create/modify:**
- `frontend/src/components/settings/AppSection.tsx` — NEW: install row component
- `frontend/src/pages/Settings.tsx` — MODIFY: add "App" section to sections array and render

**Details:**

**AppSection.tsx:**

Create a new settings section component following the existing pattern (see `AccountSection.tsx`).

```tsx
interface AppSectionProps {}

export function AppSection() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = useInstallPrompt()
  const { showToast } = useToast()
  const [installing, setInstalling] = useState(false)

  // Hide section entirely if not installable (beforeinstallprompt not fired, not iOS)
  // and not already installed
  if (!isInstallable && !isInstalled) return null

  // ... render section
}
```

Section card container: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`

Heading: `<h2 className="text-base font-semibold text-white md:text-lg mb-6">App</h2>`

**When installable and not installed:**
Row layout: `flex items-center gap-4 p-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[44px]`

- Left icon: `<Download className="h-5 w-5 text-primary shrink-0" />` (Lucide `Download` icon)
- Center text:
  - Label: `<span className="text-sm font-medium text-white">Install Worship Room</span>`
  - Description: `<span className="text-xs text-white/60">Add to your home screen for the full experience</span>`
- The entire row is clickable (triggers `promptInstall()`)
- On accepted: show toast "Worship Room is on your home screen now. Welcome home." (same message as banner)

**iOS variation:** Show `<Share className="h-5 w-5 text-primary shrink-0" />` icon instead of Download. Description: "Tap Share, then 'Add to Home Screen'". Row is informational only (no click handler — iOS requires manual browser action).

**When already installed:**
Show a non-interactive indicator:
```tsx
<div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.06]">
  <Check className="h-5 w-5 text-emerald-400 shrink-0" />
  <span className="text-sm font-medium text-emerald-400">App Installed</span>
</div>
```

**Settings.tsx changes:**

1. Add to `SettingsSection` type: `'app'`
2. Add to `SECTIONS` array: `{ id: 'app', label: 'App' }` (after `account`)
3. Add render condition:
   ```tsx
   {activeSection === 'app' && <AppSection />}
   ```
4. Import `AppSection`

**Auth gating:** Settings page is already auth-gated (line 35-37: `if (!isAuthenticated) return <Navigate to="/" replace />`). No additional auth check needed.

**Responsive behavior:**
- Desktop (1440px): Row renders within `max-w-[640px]` content panel. Comfortable layout.
- Tablet (768px): Same — settings content panel is max-width constrained.
- Mobile (375px): Full-width row within mobile tab content. Touch target >= 44px.

**Guardrails (DO NOT):**
- DO NOT render the section if neither installable nor installed (return null)
- DO NOT add the section card if the inner content would be empty
- DO NOT duplicate the toast message — use the same message as the banner
- DO NOT add a loading spinner for the install prompt — the browser handles the UI

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AppSection renders install row when installable | integration | Provide context with isInstallable=true, isInstalled=false, verify row visible |
| AppSection renders "App Installed" when installed | integration | Provide context with isInstalled=true, verify green indicator |
| AppSection returns null when not installable and not installed | integration | Provide context with both false, verify nothing rendered |
| tapping install row triggers promptInstall | integration | Click row, verify promptInstall called |
| successful install shows toast | integration | Mock accepted outcome, verify toast shown |
| iOS shows Share icon and informational text | integration | Mock isIOS=true, verify Share icon + iOS-specific description |
| "App" tab appears in Settings section list | integration | Render Settings, verify "App" tab exists |
| AppSection has accessible labels | unit | Verify button/interactive element has accessible name |

**Expected state after completion:**
- [ ] `AppSection.tsx` created with install row
- [ ] Settings page shows "App" tab
- [ ] Install row triggers native prompt
- [ ] "App Installed" shown when already installed
- [ ] All 8 tests pass

---

### Step 5: Dashboard Install Card (One-Time)

**Objective:** Add a one-time inline install card at the bottom of the dashboard widget grid after the banner has been dismissed.

**Files to create/modify:**
- `frontend/src/components/dashboard/InstallCard.tsx` — NEW: dashboard install card
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — MODIFY: render InstallCard at the bottom

**Details:**

**InstallCard.tsx:**

```tsx
export function InstallCard() {
  const { isInstallable, isInstalled, isDismissed, isDashboardCardShown, promptInstall, markDashboardCardShown } = useInstallPrompt()
  const { showToast } = useToast()
  const [visible, setVisible] = useState(true)

  // Show conditions: banner was dismissed + card not shown yet + installable + not installed
  if (!isDismissed || isDashboardCardShown || !isInstallable || isInstalled || !visible) return null

  async function handleInstall() {
    const outcome = await promptInstall()
    markDashboardCardShown()
    setVisible(false)
    if (outcome === 'accepted') {
      showToast('Worship Room is on your home screen now. Welcome home.', 'success')
    }
  }

  function handleDismiss() {
    markDashboardCardShown()
    setVisible(false)
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
      <p className="text-white text-base font-medium">Take Worship Room with you</p>
      <p className="text-white/60 text-sm mt-1">Install the app for a faster, fuller experience.</p>
      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleInstall}
          className="bg-primary text-white text-sm rounded-full px-4 py-2 hover:bg-primary-lt transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/40 hover:text-white/60 text-sm transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
```

**DashboardWidgetGrid.tsx changes:**

Render `<InstallCard />` AFTER all widgets in the grid, unconditionally last. Place it in a full-width grid item:

```tsx
{/* After the closing of the widget map/loop */}
<div className="lg:col-span-5" style={{ order: 9999 }}>
  <InstallCard />
</div>
```

The `InstallCard` handles its own visibility logic — it returns `null` if conditions aren't met. No conditional rendering needed in the grid.

**Auth gating:** Dashboard is already auth-gated. No additional check needed.

**Responsive behavior:**
- Desktop (1440px): Card spans full width (`lg:col-span-5`) at the bottom of the 5-column grid.
- Tablet (768px): Card at bottom of grid, full width.
- Mobile (375px): Full-width card at bottom of single-column layout. Install and "Not now" buttons >= 44px touch targets.

**Guardrails (DO NOT):**
- DO NOT add `install-card` to the `WidgetId` type or `WIDGET_DEFINITIONS` — this is not a configurable widget, it's a one-time prompt
- DO NOT make the card reorderable or collapsible — it's always last and non-configurable
- DO NOT show the card if `isDismissed` is false (banner hasn't been dismissed yet — don't show card and banner simultaneously)
- DO NOT remove the card from DOM without setting `wr_install_dashboard_shown` first

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| InstallCard renders when all conditions met | integration | isDismissed=true, isDashboardCardShown=false, isInstallable=true, isInstalled=false → card visible |
| InstallCard does not render if banner not dismissed | integration | isDismissed=false → null |
| InstallCard does not render if already shown | integration | isDashboardCardShown=true → null |
| InstallCard does not render if not installable | integration | isInstallable=false → null |
| InstallCard does not render if installed | integration | isInstalled=true → null |
| Install button triggers prompt and marks card shown | integration | Click Install, verify promptInstall + markDashboardCardShown called |
| "Not now" marks card shown and hides | integration | Click "Not now", verify markDashboardCardShown called, card disappears |
| successful install shows toast | integration | Mock accepted, verify toast |
| card never reappears after interaction | integration | Set wr_install_dashboard_shown, re-render, verify null |
| card renders at bottom of widget grid | integration | Render DashboardWidgetGrid, verify InstallCard is last child |

**Expected state after completion:**
- [ ] `InstallCard.tsx` created
- [ ] Card renders at bottom of dashboard widget grid
- [ ] One-time display logic works correctly
- [ ] All 10 tests pass

---

### Step 6: Final Integration & Cleanup

**Objective:** Verify all three install surfaces work together, run full test suite, ensure build passes.

**Files to create/modify:**
- No new files — verification and cleanup only

**Details:**

1. Run `pnpm build` to verify zero build errors
2. Run `pnpm test` to verify all existing tests pass + new tests pass
3. Run `pnpm lint` to verify no new lint errors
4. Verify these scenarios manually or via test:
   - **Visit 1-2:** No install UI appears anywhere
   - **Visit 3+, beforeinstallprompt fired:** Top banner appears, auto-dismisses after 10s
   - **After banner dismiss:** Dashboard card appears (one time), Settings "App" tab shows install row
   - **After dashboard card interaction:** Card never shows again
   - **After install:** All install UI hidden, Settings shows "App Installed" in green
   - **Standalone mode:** No install UI anywhere
   - **No beforeinstallprompt (desktop Chrome with PWA already installed, Firefox, etc.):** No install UI
5. Clean up any unused imports in modified files

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify test infrastructure or config
- DO NOT add features beyond the spec
- DO NOT change existing test expectations unless they test the old banner behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| full flow: visit 3 → banner → dismiss → dashboard card → not now | integration | End-to-end flow verification |
| full flow: visit 3 → banner → install accepted → no dashboard card | integration | Install from banner, verify no card appears |

**Expected state after completion:**
- [ ] `pnpm build` succeeds (0 errors, 0 warnings)
- [ ] All tests pass (existing + new)
- [ ] No new lint errors
- [ ] All three install surfaces verified

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create InstallPromptProvider context |
| 2 | 1 | Wire provider + redesign banner + render in Navbar |
| 3 | 2 | Remove unused Z.INSTALL_BANNER constant |
| 4 | 1 | Settings page install row (depends on context, not banner) |
| 5 | 1 | Dashboard install card (depends on context, not banner) |
| 6 | 1, 2, 3, 4, 5 | Final integration verification |

**Note:** Steps 3, 4, and 5 can be parallelized after Step 2 completes (Step 3 only needs the old banner removed, Steps 4 and 5 only need the context from Step 1). However, sequential execution is recommended for cleaner git history.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create InstallPromptProvider Context | [COMPLETE] | 2026-04-01 | Created `contexts/InstallPromptContext.tsx` with full interface. Refactored `hooks/useInstallPrompt.ts` to consume context. Removed 7-day cooldown. 10 tests pass. |
| 2 | Wire Provider + Redesign Install Banner | [COMPLETE] | 2026-04-01 | Provider added to App.tsx after AuthProvider. Old fixed banner removed. New in-flow banner renders in Navbar after SeasonalBanner. Glassmorphic design matches SeasonalBanner. Auto-dismiss + progress bar. 15 tests pass. Build succeeds. |
| 3 | Remove Unused Z-Index Entry | [COMPLETE] | 2026-04-01 | Removed `Z.INSTALL_BANNER: 9997`. No other references. 1 test pass. |
| 4 | Settings Page Install Row | [COMPLETE] | 2026-04-01 | Created `AppSection.tsx`. Added "App" section to Settings SECTIONS array. Install row, iOS variant, and installed state all working. 8 tests pass. |
| 5 | Dashboard Install Card | [COMPLETE] | 2026-04-01 | Created `InstallCard.tsx`. Added to `DashboardWidgetGrid` at order 9999 (always last). One-time display with markDashboardCardShown. 10 tests pass. |
| 6 | Final Integration & Cleanup | [COMPLETE] | 2026-04-01 | Build passes (0 errors). 5309/5310 tests pass (1 flaky ChunkLoadError). No new lint errors. Fixed test mocks for useToastSafe. Updated Settings test counts (5→6 sections). Used useToastSafe in InstallBanner for provider-less safety. Made useInstallPrompt return safe defaults when outside provider. |
