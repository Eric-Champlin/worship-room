# Implementation Plan: Spec 10A — Settings + AvatarPickerModal + 3 Modals

**Spec:** `_specs/spec-10a-settings.md`
**Date:** 2026-05-06
**Branch:** `forums-wave-continued` (DO NOT create new branches; user manages all git ops)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; pre-Settings recon, but the canonical patterns it covers — white-pill primary, FrostedCard, GRADIENT_TEXT_STYLE, animation tokens — are stable. ⚠️ Settings page was NOT in the captured pages set, so reader must lean on `.claude/rules/09-design-system.md` for Settings-specific values.)
**Recon Report:** `_plans/recon/settings-insights-2026-05-05.md` (loaded — fresh, 1 day old)
**Direction Doc:** `_plans/direction/settings-insights-2025-05-05.md` (loaded; cluster-locked decisions 1–23. Note: spec body references this as `2026-05-05.md` but the on-disk filename is `2025-05-05.md` — use on-disk path)
**Master Spec Plan:** N/A — Spec 10A is the first sub-spec of the Settings/Insights cluster; it locks cluster patterns for Spec 10B to consume but has no upstream master.

---

## Affected Frontend Routes

- `/settings` — default tab is Profile when no `?tab=` is present or invalid
- `/settings?tab=profile`
- `/settings?tab=dashboard`
- `/settings?tab=notifications`
- `/settings?tab=privacy`
- `/settings?tab=account`
- `/settings?tab=app`
- `/settings?tab=<invalid-value>` — falls through `VALID_SECTIONS` guard, defaults to Profile
- `/settings` (any tab) → `AvatarPickerModal` overlay (mounted from `ProfileSection`)
- `/settings?tab=account` → `ChangePasswordModal` overlay
- `/settings?tab=account` → `DeleteAccountModal` overlay

All routes are auth-gated end-to-end via `<Navigate to="/" replace />` when `!isAuthenticated` (existing behavior, NOT modified by this spec).

---

## Architecture Context

### Source-of-truth files this spec edits

| File | LOC | Role |
|------|-----|------|
| `frontend/src/pages/Settings.tsx` | 178 | Hero + dual-nav (mobile tablist + desktop sidebar) + active panel. Hosts `useSettings`, `useFriends`, `useAuth`. Tab state local `useState<SettingsSection>('profile')` (line 44). |
| `frontend/src/components/settings/ProfileSection.tsx` | 185 | Display name + bio + avatar trigger. Mounts `AvatarPickerModal` (line 114). Change avatar button at line 107. |
| `frontend/src/components/settings/AccountSection.tsx` | 105 | Email row + Change Email link (line 56) + Change Password link (line 66) + Delete Account trigger (line 82). Owns `handleDeleteConfirm` (lines 19–39 — current `wr_*` + `worship-room-*` sweep, missing Bible prefixes). |
| `frontend/src/components/settings/PrivacySection.tsx` | 213 | Toggles + RadioPillGroups + blocked/muted user lists. Unblock button at line 151, Unmute at line 182. Initial-avatar circles use `bg-primary/20` decorative tint (lines 141 + 173 — Decision 11 preserve). |
| `frontend/src/components/settings/NotificationsSection.tsx` | 339 | Largest section. Status indicator at lines 55 (`text-success`) and 62 (`text-danger`). "Send test notification" button at lines 234–241 (`bg-white text-hero-dark px-6 py-2`). |
| `frontend/src/components/settings/RadioPillGroup.tsx` | 67 | Reusable radio-pill group with arrow-key roving. Selected pill chrome at line 55 (`bg-primary/20 border border-primary text-white`). |
| `frontend/src/components/settings/DeleteAccountModal.tsx` | 56 | `role="alertdialog"` confirm dialog. Missing `aria-modal="true"` (lines 22–24). Delete Everything button at line 48 (`bg-red-500 text-white`). |
| `frontend/src/components/settings/ChangePasswordModal.tsx` | 185 | 3 password inputs (lines 94, 116, 139) currently `border border-white/15 bg-white/5 px-3 py-2`. `newTooShort`/`confirmMismatch` calculated keystroke-real-time at lines 23–24. Submit button at line 173 (`bg-primary text-white`). Field errors `text-red-400` at lines 106, 129, 151, 158. |
| `frontend/src/components/settings/ToggleSwitch.tsx` | 56 | `role="switch"` reusable toggle. On-state `bg-primary` at line 43 — Decision 3 preserve, comment-only addition. |
| `frontend/src/components/shared/AvatarPickerModal.tsx` | ~447 | Container `bg-hero-mid border border-white/15 rounded-2xl motion-safe:animate-dropdown-in` (line 171). Tab buttons at lines 196 + 209 use `flex-1 py-2 px-4` + active `bg-white/10`. Selection rings `ring-primary` at lines 261 + 311 (Decision 11 preserve). Save buttons at lines 346 + 418 (`bg-primary text-white py-3 px-8`). Photo error inline messages at lines 234 + 370 + 408 (`text-red-400 text-center`). Focus moves to close X on open (current behavior). |

### Patterns this spec consumes (already shipped)

- **`useSearchParams` URL-backed tab state** — Daily Hub uses `useDailyHubTab` hook (`frontend/src/hooks/url/useDailyHubTab.ts`) which wraps `useSearchParams` with `replace: false`. AskPage also uses `useSearchParams`. **Spec 10A inlines its own `useSearchParams` usage with `replace: true`** (per FR #2) — does NOT reuse `useDailyHubTab` because Settings tab clicks must NOT push history entries. This is the documented divergence between Daily Hub (pushes) and Settings (replaces).
- **Arrow-key roving pattern** — `frontend/src/components/settings/RadioPillGroup.tsx` lines 14–29 (canonical: ArrowLeft/Up `(idx - 1 + len) % len`, ArrowRight/Down `(idx + 1) % len`, focus the new selection). `TimeRangePills` (`frontend/src/components/insights/TimeRangePills.tsx`) uses the same pattern with Home/End extension. Settings tab list will inline a similar handler — no shared util extraction needed (the spec explicitly allows inlining if no shared util exists at execution time; pre-execution recon Step 1 confirms which option applies).
- **`useFocusTrap()` canonical modal helper** — `frontend/src/hooks/useFocusTrap.ts`. Used by all 3 modals. Returns `containerRef` callback ref. Stores `previouslyFocused`, restores on close. Currently focuses the first focusable child by default — does NOT expose a `focusOnOpen` target prop. The AvatarPickerModal focus-on-open destination change requires a post-mount `useEffect` + `setTimeout(0)` that focuses the desired element AFTER `useFocusTrap` runs.
- **`useSettings()` hook + cross-tab sync** — `frontend/src/hooks/useSettings.ts`. Lazy-init `useState` from `getSettings()`, listens for `StorageEvent` on `wr_settings`. NOT modified by this spec.
- **`useAuth()` hook** — `frontend/src/hooks/useAuth.ts`. Returns `{ isAuthenticated, user, login(), logout() }`. Settings page mount-time guard: `if (!isAuthenticated) return <Navigate to="/" replace />` (line 56–58). NOT modified.
- **White-pill primary CTA Pattern 2** — canonical class string per `09-design-system.md` § "White Pill CTA Patterns" Pattern 2. RegisterPage line 166 + 382 uses the pattern. The exact class string applied in this spec (verbatim from RegisterPage):
  ```
  inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none
  ```
  Note: the canonical block does NOT include `font-medium` — it uses `font-semibold`. It does NOT include `bg-primary text-white`. RegisterPage uses `text-lg sm:text-xl`; the design system block is `text-base sm:text-lg`. This plan applies the design-system canonical class string exactly to keep cross-cluster consistency. Disabled state preserved via `disabled:opacity-50`.
- **Severity color system (muted destructive)** — per `09-design-system.md` § "Severity color system":
  - `error`: `border-red-400/30 bg-red-950/30 text-red-100`
  - `warning`: `border-amber-400/30 bg-amber-950/30 text-amber-100`
  - `info`: `border-sky-400/30 bg-sky-950/30 text-sky-100`
  - Worship Room never uses pure `bg-red-500` for vulnerability content. The destructive button variant: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`.
- **Severity success / danger raw-class equivalents** — `09-design-system.md` does NOT publish a raw success/danger text class for inline status indicators in the severity-system table. The spec instructs (FR #8c) to use severity success / danger canonical classes. **Pre-execution verification (Step 5 detail) must read `09-design-system.md` § "Severity color system" + the Color Palette section for the exact tokens.** Apply `text-emerald-300` / `text-red-300` if those are the resolved success/danger tokens; otherwise apply whatever the canonical lookup resolves to. **`text-success` (#27AE60) and `text-danger` (#E74C3C)** as currently used are the deprecated tokens — they're listed in the Color Palette for legacy reasons but do not align with the Round 3 muted-tonal severity system. If the resolved success token is not obvious, use the FormError success / danger text colors as guides (`text-red-100` for the error variant) or document an `[UNVERIFIED]` value.
- **Atmospheric layer** — `bg-dashboard-dark` body root + inline `style={ATMOSPHERIC_HERO_BG}` on hero `<section>` (line 69). Direction Decision 1 explicitly preserves. Do NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground`.
- **`text-violet-300 hover:text-violet-200`** — Direction Decision 4 canonical text-button color. WCAG AA compliant on `bg-dashboard-dark` (Settings inner page surface).

### Patterns this spec INTRODUCES (cluster-level)

- **Settings tab unification under one semantic model** — both mobile tablist and desktop sidebar use `role="tab"` inside `role="tablist"`. The desktop `<nav role="navigation">` wrapper is eliminated. Spec 10B's Insights tabs will mirror this.
- **Settings URL-backed tab state via `useSearchParams` with `replace: true`** — distinct from Daily Hub's `replace: false`. Spec 10B's Insights time-range or sub-tab state may consume this convention.
- **Settings active-state classes** — mobile `bg-white/15 text-white border-b-2 border-white/40`, desktop `bg-white/15 text-white border-l-2 border-white/40`. Inactive `text-white/60 hover:text-white hover:bg-white/[0.06]`.
- **`DELETE_PREFIXES` const** — local const at top of `handleDeleteConfirm` listing all prefixes swept. Cluster precedent for any future delete-account-style sweep.

### Test patterns to match

- Vitest + React Testing Library. Existing Settings tests use `renderWithAuth` helpers, `<MemoryRouter>` wrappers when route state matters, and class-string assertions on chrome.
- Tests query primarily via `getByRole('tab', { name: ... })`, `getByRole('button', { name: ... })`, `getByText(...)`. Where class strings are asserted, the tests already brace for chrome migration — update strings in the same commit.
- Reactive store consumer test pattern (BB-45 anti-pattern) does NOT apply — Settings consumes no reactive stores. Only `useSettings` (cross-tab synced via `StorageEvent`), `useFriends`, `useMutes`, `useInstallPrompt` — all already correctly subscribed.
- Mocking pattern for `lib/notifications/*`: existing `NotificationsSection.test.tsx` mocks `getPushSupportStatus`, `getPermissionState`, `getNotificationPrefs`, `requestPermission`, `subscribeToPush`, `unsubscribeFromPush`, `fireTestNotification`, `getBrowserInstructions` via `vi.mock`. Preserve that approach.
- Mocking pattern for `useAuth`: existing `Settings.test.tsx` mocks `useAuth` via `vi.mock('@/hooks/useAuth', ...)` to inject `isAuthenticated: true` + a stub user.
- For `handleDeleteConfirm` localStorage sweep tests in `AccountSection.test.tsx`: existing pattern is `localStorage.setItem('wr_x', 'y')` → trigger delete → assert `localStorage.getItem('wr_x')` is `null`.

### Auth gating patterns

Settings is auth-gated as a route via `<Navigate to="/" replace />` when `!isAuthenticated`. Inside the page, every action is implicitly authenticated; this spec adds NO new auth modals. The `useAuthModal()` context is not invoked. Per the spec's Auth Gating section, every action enumerated already presupposes authentication.

### Cross-spec dependencies

- All Specs 1A–9 must be merged into the working branch (per spec preamble). Confirmed implicitly by working branch state.
- Spec 10B (Insights + MonthlyReport) consumes 10A's cluster patterns AFTER 10A ships. 10A makes NO assumptions about 10B.
- Forums Wave Phase 1 auth lifecycle work (Spec 1.5g session invalidation, future `DELETE /api/v1/auth/account`) is OUT OF SCOPE — `handleDeleteConfirm` remains a localStorage-only sweep in 10A.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Navigate to `/settings` | Auth-gated route — logged-out redirects to `/` | (existing — preserved unchanged in Step 1) | `<Navigate to="/" replace />` mount-time guard in `Settings.tsx` line 56–58 |
| Navigate to `/settings?tab=<any>` | Same redirect; URL params preserved through redirect for re-attempt post-login | (existing — Step 1 preserves) | Same `<Navigate>` |
| Click any tab button | N/A page not reachable when logged-out | Step 1 | N/A — gate is route-level |
| Click "Change avatar" | N/A | Step 2 | N/A — gate is route-level |
| Click "Change Email" | N/A | Step 3 | N/A — gate is route-level |
| Click "Change Password" | N/A | Step 3 | N/A — gate is route-level |
| Click "Unblock" / "Unmute" | N/A | Step 4 | N/A — gate is route-level |
| Click "Send test notification" | N/A | Step 5 | N/A — gate is route-level |
| Toggle ToggleSwitch | N/A | Step 10 (comment-only; no behavior change) | N/A |
| Adjust RadioPillGroup | N/A | Step 6 | N/A |
| Click "Delete Account" trigger | N/A | Step 3 | N/A — gate is route-level |
| Click "Delete Everything" inside DeleteAccountModal | N/A | Step 7 (chrome) + Step 3 (handler) | N/A — gate is route-level |
| Click avatar preset / Save in AvatarPickerModal | N/A | Step 9 | N/A — gate is route-level |
| Submit ChangePasswordModal form | N/A | Step 8 | N/A — gate is route-level |

This spec introduces ZERO new auth gates. The existing route-level redirect for logged-out users is preserved byte-for-byte. The `useAuthModal()` pattern is not invoked by any Settings action.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero `<section>` | `style` | `ATMOSPHERIC_HERO_BG` (preserved as-is) | `frontend/src/components/PageHero.tsx` re-export, used in `Settings.tsx:69` |
| `<h1>` heading | `style` | `GRADIENT_TEXT_STYLE` (preserved) | `frontend/src/constants/gradients.tsx` |
| `<h1>` heading | className | `px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2` (preserved) | `Settings.tsx:80` |
| `<h1>` inner | content | Plain text `Settings` (NO `<span class="font-script">` wrapper) | Direction Decision 5 + spec FR #5 |
| Mobile tablist active button | className (active state) | `bg-white/15 text-white border-b-2 border-white/40` | Direction Decision 2 + spec FR #3 |
| Desktop sidebar active button | className (active state) | `bg-white/15 text-white border-l-2 border-white/40` | Direction Decision 2 + spec FR #3 |
| Tab button (both contexts) | className (inactive state) | `text-white/60 hover:text-white hover:bg-white/[0.06]` | Direction Decision 2 + spec FR #3 |
| Tab button | `tabIndex` | `0` when active, `-1` when inactive | Spec FR #4 |
| Tab button | aria attrs | `role="tab" aria-selected={...} aria-controls={`settings-panel-${id}`}` | Spec FR #1 |
| Tablist parent (mobile) | aria attrs | `role="tablist" aria-label="Settings sections" aria-orientation="horizontal"` (orientation may be omitted as default) | Spec FR #1 |
| Tablist parent (desktop) | aria attrs | `role="tablist" aria-label="Settings sections" aria-orientation="vertical"` | Spec FR #1 |
| Active panel container | aria attrs | `aria-live="polite"` (preserved) | `Settings.tsx:141` |
| Active panel container | `key` | `key={activeSection}` (preserved — full remount on switch) | `Settings.tsx:139` |
| Text button (Change avatar / Change Email / Change Password / Unblock / Unmute) | className (color portion) | `text-violet-300 hover:text-violet-200` | Direction Decision 4 + spec FR #6 |
| White-pill primary CTA (Save / Update password / Send test notification) | className | `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none` | `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 + RegisterPage:166 |
| Severity muted-destructive button (Delete Everything + Delete Account trigger) | className | `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` | `09-design-system.md` § "Severity color system" + spec FR #8a/#8b |
| Severity error inline text (ChangePasswordModal field errors, AvatarPickerModal photo errors) | className | `text-red-100` (replacing `text-red-400`) — wrap in `bg-red-950/30 border border-red-400/30 rounded-md px-2 py-1` only IF the spec text says so. Per spec FR #8d, just text color. | Spec FR #8d, #8e + recon Part 11 |
| `text-success` push status (line 55 NotificationsSection) | className | Severity success canonical — `[UNVERIFIED]` exact token; pre-execution recon Step 5 resolves. Best guess based on severity system: `text-emerald-300`. | Direction Decision 7 + spec FR #8c |
| `text-danger` push status (line 62 NotificationsSection) | className | Severity danger canonical — `[UNVERIFIED]` exact token; best guess `text-red-300` matching the AlertTriangle icon color used in DeleteAccountModal. | Direction Decision 7 + spec FR #8c |
| RadioPillGroup selected pill | className | `bg-white/15 text-white border border-white/30` | Direction Decision 2 + spec FR #9 |
| RadioPillGroup unselected pill | className (preserved) | `bg-white/5 border border-white/15 text-white/60 hover:bg-white/10` | `RadioPillGroup.tsx:56` |
| AvatarPickerModal active tab background | className | `bg-white/15 text-white` (was `bg-white/10`) | Direction Decision 2 + spec FR #13c |
| AvatarPickerModal tab buttons | className (touch target portion) | `min-h-[44px]` (existing `flex-1 py-2 px-4 rounded-md text-sm font-medium ...` preserved with `min-h-[44px]` added) | Spec FR #13b |
| AvatarPickerModal `ring-primary` selection ring | className (preserved — Decision 11) | `ring-2 ring-primary ring-offset-2 ring-offset-hero-mid` | `AvatarPickerModal.tsx:261, 311` |
| AvatarPickerModal container (preserved) | className | `bg-hero-mid border border-white/15 rounded-2xl shadow-xl motion-safe:animate-dropdown-in` | `AvatarPickerModal.tsx:171` |
| AvatarPickerModal drag-drop zone (preserved) | className | `border-2 border-dashed border-white/20` | `AvatarPickerModal.tsx:398` |
| ToggleSwitch on-state (preserved + comment-only) | className | `bg-primary` (NO migration — Direction Decision 3) | `ToggleSwitch.tsx:43` |
| `bg-primary/20` decorative tints (PrivacySection blocked/muted initial avatars — preserved) | className | `bg-primary/20 ... text-white` | `PrivacySection.tsx:141, 173` (Decision 11) |
| DeleteAccountModal AlertTriangle icon | className | `h-5 w-5 text-red-300` + `aria-hidden="true"` | Spec FR #11 + recon Part 11 |
| DeleteAccountModal heading row wrapper | className | `flex items-center gap-3` | Spec FR #11 |
| DeleteAccountModal | aria attr | Add `aria-modal="true"` to the `role="alertdialog"` element | Spec FR #11 |
| ChangePasswordModal field "help hint" (when empty/focused) | className | `text-white/60` paragraph "Use at least 8 characters" — NOT `role="alert"` (helper text, not error) | Spec FR #12c |
| ChangePasswordModal input chrome | className | Align to AuthModal canonical: ChangePasswordModal currently uses `border border-white/15 bg-white/5 px-3 py-2`; AuthModal uses `bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 rounded-xl`. **`[UNVERIFIED]` — pre-execution recon (Step 8 detail) must read AuthModal to confirm canonical**. Best guess: align to AuthModal exact (`bg-white/[0.06] border border-white/[0.12] rounded-xl ... px-3 py-2.5`). | Spec FR #12b + recon Part 11 |
| AvatarPickerModal photo error inline messages | className | `text-red-100 text-center` (replacing `text-red-400 text-center`) | Spec FR #8e |
| ChangePasswordModal field-level error messages | className | `text-red-100` (replacing `text-red-400`) | Spec FR #8d |
| ChangePasswordModal form-level error message | className | `text-red-100` (replacing `text-red-400`) | Spec FR #8d |

This table is the executor's copy-paste reference for all styling. No guessing.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero/section headings on dark backgrounds. Caveat font is deprecated for headings — used only for the logo. The spec REMOVES the `<span class="font-script">Settings</span>` wrapper inside the h1. The parent gradient style is preserved.
- Settings preserves the `bg-dashboard-dark` + inline `ATMOSPHERIC_HERO_BG` atmospheric pattern (Direction Decision 1). DO NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground`. These are for Daily Hub / homepage / register; Settings is an inner-page surface like Friends / Grow / MyPrayers.
- The ToggleSwitch on-state uses `bg-primary` (#6D28D9) and is PRESERVED per Direction Decision 3 (state indicators warrant high-saturation; native OS toggle convention). Only a code comment is added — NO chrome change.
- `ring-primary` selection rings on AvatarPickerModal preset thumbnails are PRESERVED per Decision 11 (selection chrome on a thumbnail grid, not a CTA chrome).
- `bg-primary/20` decorative tints on PrivacySection blocked/muted initial avatar circles are PRESERVED per Decision 11 (categorical signals, not CTAs).
- White-pill primary CTA Pattern 2 is the homepage / RegisterPage canonical. NotificationsSection's "Send test notification" button currently uses `px-6 py-2` — bumps to canonical `px-8 py-3.5`. AvatarPickerModal Save × 2, ChangePasswordModal Update password → all migrate to white pill.
- Severity color system never uses pure `bg-red-500` for vulnerability content. Muted destructive variant: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`.
- `text-violet-300 hover:text-violet-200` is the canonical text-button color on dark backgrounds (Direction Decision 4). The previous `text-primary` / `text-primary-lt` pair fails WCAG AA contrast on `bg-dashboard-dark` (~3.4:1).
- Active-state pattern across the cluster (Settings tabs + AvatarPickerModal tabs + RadioPillGroup pills): muted-white isolated pill, `bg-white/15 text-white` core, with orientation-appropriate border indicators on tabs (`border-b-2 border-white/40` horizontal, `border-l-2 border-white/40` vertical) and a full border on isolated pills (`border border-white/30`). Inactive uses `text-white/60 hover:text-white hover:bg-white/[0.06]`.
- URL-backed tab state via `useSearchParams` with `replace: true` (NOT `false` as Daily Hub uses) — back-button hygiene is the Settings convention.
- Arrow-key roving on the Settings tab list mirrors `RadioPillGroup` and `TimeRangePills`. ArrowLeft/Right + ArrowUp/Down navigate with wraparound; Home/End jump to first/last; `tabIndex` rovers (0 on active, -1 on inactive) so Tab key moves OUT of the tablist after one keypress.
- `useFocusTrap()` does NOT expose a focus-on-open target prop. The AvatarPickerModal focus-on-open destination change requires a post-mount `useEffect` + `setTimeout(0)` that focuses the desired element AFTER `useFocusTrap` runs. Preserve all other focus-trap behaviors (Escape dismiss, click-outside dismiss, Tab/Shift-Tab roving inside).
- ChangePasswordModal validation timing change: keystroke-real-time → blur-promoted. "Use at least 8 characters" is a help hint (`text-white/60`) when empty/focused; promotes to error red (severity system) on blur with too-short value. Preserve `aria-invalid` / `aria-describedby` / `role="alert"` wiring on the error-promotion path.
- `handleDeleteConfirm` widens the localStorage prefix sweep from `wr_*` + `worship-room-*` to `wr_*` + `worship-room-*` + `bible:*` + `bb*`. Existing post-delete sign-out + navigation logic preserved EXACTLY.
- Use `cn()` from `@/lib/utils` for all conditional className composition. Inline `cn(...)` for active-state class string assembly in tab buttons.

**Inline-row layout discipline:** The Settings tab list is an inline-row layout on mobile (horizontal tablist) and a vertical column on desktop (sidebar). Mobile horizontal must not wrap at any breakpoint above 320px (the smallest viewport tested) — 6 tab labels at `flex-1 py-3 text-sm` should fit comfortably at 375px, but document the expected position behavior so `/verify-with-playwright` can verify.

---

## Shared Data Models (from Master Plan)

N/A — Spec 10A is the first sub-spec of the cluster; no upstream master to consume. Spec 10A produces:

- **No new TypeScript interfaces.** `SettingsSection` type already declared inline in `Settings.tsx` line 22. No type schema changes.
- **No new localStorage keys.** All key reads/writes are preserved. `handleDeleteConfirm` widens its sweep but introduces no new keys.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_settings` | Read (via `useSettings`) | UserSettings — profile/notifications/privacy. NOT modified by this spec. |
| `wr_user_name` | Write (via existing `ProfileSection.handleNameBlur`, indirect) | Display name mirror. NOT modified. |
| `wr_jwt_token` | Read (via `useAuth`, indirect) | Auth token. NOT modified. |
| `wr_friends`, `wr_mutes`, `wr_notification_prefs`, `wr_push_subscription`, `wr_sound_effects_enabled` | Read (existing) | Various Settings-adjacent state. NOT modified. |
| `wr_*` (all wr-prefixed) | Delete (in `handleDeleteConfirm`, EXISTING behavior preserved) | Wholesale sweep on delete. Step 3 preserves the existing iteration. |
| `worship-room-*` (legacy prefix) | Delete (in `handleDeleteConfirm`, EXISTING behavior preserved) | Legacy keys swept on delete. Step 3 preserves. |
| `bible:bookmarks`, `bible:notes`, `bible:journalEntries`, `bible:plans`, `bible:streak`, `bible:streakResetAcknowledged` | **NEW: Delete** (in `handleDeleteConfirm`) | Bible reactive store data — currently survives delete. Step 3 widens the sweep to `bible:*`. |
| `bb26-v1:audioBibles`, `bb29-v1:continuousPlayback`, `bb32-v1:explain:*`, `bb32-v1:reflect:*`, `bb44-v1:readAlong` | **NEW: Delete** (in `handleDeleteConfirm`) | Bible AI/audio cache — currently survives delete. Step 3 widens the sweep to `bb*` (catches `bb26-v1:`, `bb29-v1:`, `bb32-v1:`, `bb44-v1:`). |
| Unrelated keys (e.g., `unrelated_key`, `theme_preference`) | NEVER deleted | Sweep matches `wr_`, `worship-room-`, `bible:`, `bb` prefixes only. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single-column. Hero with reduced padding. Below hero: horizontal `role="tablist"` of 6 tabs (`flex` row, `flex-1` per tab). Active panel renders below the tablist, full-width with `max-w-[640px]` constraint (centered). Modals (AvatarPicker / ChangePassword / DeleteAccount) render full-screen via existing modal layouts (NOT modified by this spec — only chrome inside the modals changes). |
| Tablet | 768px | At `sm:` (640px+) breakpoint, mobile tablist hides (`sm:hidden`) and desktop sidebar appears (`hidden sm:block`). Sidebar is `w-[200px] lg:w-[240px] shrink-0`. Layout shifts to two-column flex (`flex gap-8`): sidebar on left, panel on right. The horizontal tablist is gone at this breakpoint. |
| Desktop | 1440px | Same as tablet but with `lg:` (1024px+) sidebar widens to `w-[240px]`. Layout container `max-w-4xl` (Settings.tsx:113). Hero + sidebar + panel all centered on the page. |

**Custom breakpoints:** The `sm:` (640px) breakpoint is the mobile/desktop nav swap threshold (existing Settings.tsx convention). The `lg:` (1024px) breakpoint widens the sidebar by 40px. NO new breakpoints introduced.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| Settings mobile tablist (horizontal) | 6 tab buttons (Profile, Dashboard, Notifications, Privacy, Account, App) | All 6 buttons in a single row at 375px (mobile), 640px, 768px. Each is `flex-1` so they share width equally. NO wrapping at any breakpoint ≥ 320px. | Wrapping below 320px viewport is acceptable (not a supported breakpoint). |
| Settings desktop sidebar (vertical) | Same 6 tab buttons | Stacked vertically — each occupies a full-width row of the sidebar. NO horizontal positioning expectation (this is a column, not a row). | N/A — vertical layout. |
| AvatarPickerModal Tab/Upload tabs | 2 tab buttons | Both buttons in a single row at all breakpoints (`flex-1` row inside `bg-white/5 rounded-lg p-1`). NO wrapping. Top-y values match within ±5px (both buttons have identical chrome and `min-h-[44px]`). | NO wrapping at any breakpoint. |
| AvatarPickerModal Save + Cancel area (Presets tab + Upload tab) | Save button (full-width pill) | Single full-width button — no inline-row concern. | N/A. |
| DeleteAccountModal Cancel + Delete Everything buttons | Two buttons | Mobile (< sm): stacked via `flex-col-reverse sm:flex-row`. Desktop (≥ sm): side-by-side, `flex-1 gap-3`, top-y matches within ±5px. NO wrapping at desktop. | Mobile stacking is intentional — not a wrap bug. |
| ChangePasswordModal Cancel + Update password buttons | Two buttons | Same mobile-stacked / desktop-row pattern. NO wrapping at desktop. | Mobile stacking intentional. |
| RadioPillGroup pill row | 3 pills (Everyone/Friends/Nobody for nudges; Everyone/Friends/Only me for streak) | Existing `flex gap-2 flex-wrap` allows wrap. At 375px, "Only me" (longest label ~7 chars) should fit on one row with the other two. Wrap acceptable below 360px or with longer labels. | Wrap acceptable — existing behavior. |
| AccountSection email row + Change Email button | Email label/value + Change Email button | `flex items-center justify-between` — single row at all breakpoints. NO wrapping. Top-y matches within ±5px. | NO wrapping. |
| PrivacySection blocked/muted user row | Avatar circle + name + Unblock/Unmute button | `flex items-center justify-between` — single row at all breakpoints with name truncation. NO wrapping. Top-y matches within ±5px. | NO wrapping. |
| NotificationsSection daily verse time picker row | Label + native time input | `flex items-center justify-between` — single row at all breakpoints. NO wrapping. | NO wrapping. |

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → mobile tablist OR desktop main | ~32–48px | `Settings.tsx:68` `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` (existing — preserved) |
| Mobile tablist → main panel | ~24px | `Settings.tsx:113` `py-6 sm:py-8` (existing — preserved) |
| Desktop sidebar ↔ panel | 32px (`gap-8`) | `Settings.tsx:114` (existing — preserved) |
| Section card → next section card | 16px (`space-y-4` inside Profile/Notifications/Privacy/Account sections) | Existing — preserved |
| Sub-heading → toggle list | 12px (`mb-3`) | Existing — preserved |
| Section card padding | 16px mobile / 24px desktop (`p-4 md:p-6`) | Existing — preserved |
| Hero → footer (when section is empty, e.g. App on non-installable browser) | natural — no special handling | Existing |

NO vertical rhythm changes in this spec. All gaps preserved.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] All prior specs (1A–9) merged into the working branch `forums-wave-continued`. Verified via the recon report and the spec preamble; trust without re-verifying unless a step fails.
- [ ] Direction doc at `_plans/direction/settings-insights-2025-05-05.md` present and readable.
- [ ] Recon doc at `_plans/recon/settings-insights-2026-05-05.md` present.
- [ ] All auth-gated actions from the spec are accounted for (verified — no NEW gates introduced; all existing gates preserved at the route level).
- [ ] Design system values are verified — RegisterPage white-pill canonical confirmed at line 166. Severity system colors confirmed against `09-design-system.md` § "Severity color system" + `FormError.tsx:30` for muted-destructive variant.
- [ ] [UNVERIFIED] values are flagged with verification methods (3 flagged below).
- [ ] No deprecated patterns are introduced (Caveat headings — REMOVED; BackgroundSquiggle on Daily Hub — N/A; GlowBackground on Daily Hub — N/A; animate-glow-pulse — N/A; cyan textarea borders — N/A; italic Lora prompts — N/A; soft-shadow 8px-radius cards on dark backgrounds — N/A).
- [ ] React Router DOM `useSearchParams` is available (confirmed: `frontend/src/hooks/url/useDailyHubTab.ts` line 2 already imports it).

### [UNVERIFIED] values (3)

1. **`text-success` and `text-danger` replacement classes** — `09-design-system.md` does not publish a precise canonical class for inline status text in the severity system. Best-guess pre-execution: `text-emerald-300` (success) / `text-red-300` (danger).
   - **To verify:** During Step 5 execution, read `09-design-system.md` § "Severity color system" + the Color Palette section + grep for `text-emerald-` and `text-success` usage in the codebase. Use whichever class is most consistent with FormError success/danger patterns.
   - **If wrong:** Update the literal class strings in `NotificationsSection.tsx:55, 62`. Update the corresponding test assertions in `NotificationsSection.test.tsx`.

2. **ChangePasswordModal input chrome alignment** — Spec FR #12b says align to `bg-white/5 border border-white/15`. The current ChangePasswordModal already uses this exact pattern (`border border-white/15 bg-white/5 px-3 py-2`). However, AuthModal uses `bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 rounded-xl` per `frontend/src/components/prayer-wall/AuthModal.tsx:368`.
   - **To verify:** During Step 8 execution, grep for the canonical input chrome usage in `AuthModal.tsx` and `RegisterPage.tsx`. The "canonical" referenced by the spec may be the older form `bg-white/5 border border-white/15` (already in use) — in which case **NO chrome change is needed in Step 8**; only validation timing + error colors change.
   - **If wrong:** Update the 3 password input class strings to the verified canonical. Update class-string assertions in `ChangePasswordModal.test.tsx`.

3. **Field-level error background (severity system) for ChangePasswordModal field errors** — Spec FR #8d says use `text-red-100` "on appropriate severity-system background". The current field error is just `<p role="alert" class="mt-1 text-sm text-red-400">{message}</p>` — inline text, no background. Best-guess: keep inline-text shape, just change `text-red-400` → `text-red-100`.
   - **To verify:** During Step 8 execution, decide whether to (a) change just the text color (minimal, matches current shape) or (b) wrap each error in a `bg-red-950/30 border border-red-400/30 px-2 py-1 rounded-md` pill. Default (a) per "no NEW visual primitives" spec posture; consult `09-design-system.md` § "Error, Loading, and Empty States" for FormField field-error guidance.
   - **If wrong:** Adjust the wrapping/colors. Update test assertions.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| What to do when `?tab=` param is missing | Default to `'profile'` | Spec FR #2 explicit. Matches Daily Hub behavior. |
| What to do when `?tab=invalid` is passed | Default to `'profile'`, do NOT crash, do NOT clear the param from URL | Spec FR #2 + Acceptance Criteria. The `VALID_SECTIONS.includes(...)` guard catches it; `setSearchParams` is NOT called as a side effect of an invalid param (avoids history pollution / loop). Invalid param remains in URL until user clicks a tab. |
| Tab click history behavior | `setSearchParams({ tab: section }, { replace: true })` — replace, don't push | Spec FR #2 explicit. Distinct from Daily Hub (which pushes). |
| Settings tab list behavior on mount with deep link | Reads `?tab=` via `searchParams.get('tab')` on every render — no `useEffect` migration needed | Matches Daily Hub `useDailyHubTab` pattern. |
| Where to put the keyboard arrow-key handler | Inline as a function inside `Settings.tsx` (parent-level), passed to each tab button via `onKeyDown` | Spec FR #4 ("If a shared keyboard-handler util exists, import and reuse it; otherwise factor the handler out to a small util colocated with Settings.tsx or inline it consistently across both contexts"). RadioPillGroup defines its own; TimeRangePills defines its own — no shared util exists. Inlining keeps the spec scoped. |
| AvatarPickerModal focus-on-open implementation | Post-mount `useEffect` watching `isOpen` transitioning to `true` + `setTimeout(0)` to focus the desired element AFTER `useFocusTrap` runs. Element resolution: Presets tab → currently-selected avatar `<button data-avatar-id="${selectedAvatarId}">`; Upload tab → Choose File button (refs already in component). | Spec FR #13d. `useFocusTrap` does not expose an initial-focus-target prop; deferring focus via `setTimeout(0)` defeats the trap's default first-focusable-child focus. |
| ChangePasswordModal `newTooShort` blur-promotion implementation | Add `newPasswordTouched: boolean` state, set `true` on `onBlur` of the new-password input. `newTooShort = newPasswordTouched && newPassword.length > 0 && newPassword.length < 8`. Same pattern for `confirmPasswordTouched`. | Spec FR #12c. Preserves the existing `formValid` calculation (which still uses raw length, not touched state — submit button validation is unchanged). |
| ChangePasswordModal "Use at least 8 characters" help hint | Render below the new-password input as `<p class="mt-1 text-xs text-white/60">Use at least 8 characters.</p>` (no `role="alert"`, no `aria-invalid` linkage) when newPassword is empty OR when newPassword is non-empty but `!newPasswordTouched`. Replace with the existing `role="alert"` `text-red-100` error paragraph when `newPasswordTouched && newPassword.length < 8`. | Spec FR #12c. |
| `DELETE_PREFIXES` const placement | Local const at the top of `handleDeleteConfirm` body | Direction Decision 10 explicitly says "Define the prefix list as a local const at the top of `handleDeleteConfirm` with a comment explaining what's covered. Doesn't justify a separate constants file." |
| `'bb'` prefix in DELETE_PREFIXES — risk of false-positive matches | Acceptable. The only `bb*` localStorage keys in the app are `bb26-v1:`, `bb29-v1:`, `bb32-v1:`, `bb44-v1:` (per `11b-local-storage-keys-bible.md`). No third-party library uses `bb` as a prefix. If a future feature introduces a `bb-` prefix that should NOT be deleted, this needs revisiting. Documented as future-spec concern. | Spec FR #10 + Direction Decision 10. |
| DeleteAccountModal AlertTriangle vs AlertCircle icon choice | `AlertTriangle` — its semantic match for a destructive-action confirmation is stronger than AlertCircle (which is more general info/error). Spec text says "AlertTriangle (or AlertCircle)" — picking AlertTriangle. | Spec FR #11 + recon Part 11. |
| Tests update strategy for `DeleteAccountModal` | DeleteAccountModal does NOT have its own test file. Add new assertions (aria-modal, AlertTriangle icon, severity colors, Bible-data sweep) to `AccountSection.test.tsx` (which already covers the modal trigger + delete handler localStorage sweep). | Recon Part 10 + spec FR #15. |
| Tests update strategy for `RadioPillGroup` | RadioPillGroup has NO test file today. Add a new `RadioPillGroup.test.tsx` smoke test covering: render selected/unselected pill chrome (post-migration class assertion), arrow-key roving still works, `role="radiogroup"` + `role="radio"` + `aria-checked` preserved. | Recon Part 10 + spec FR #15. |
| Test for `font-script` removal | Add an assertion in `Settings.test.tsx` that the h1's outer element does NOT contain a child `<span class="font-script">`. Use `expect(heading.querySelector('span.font-script')).toBeNull()`. | Spec FR #5 + acceptance criteria. |

---

## Implementation Steps

### Step 1: Settings.tsx tab pattern unification + URL state + arrow-key roving + font-script removal + active-state styling

**Objective:** Replace the dual-nav (mobile tablist + desktop nav) structure with a unified `role="tab"` semantic model. URL-back the active tab via `useSearchParams` with `replace: true`. Add arrow-key roving + Home/End. Remove the `<span class="font-script">` wrapper. Apply muted-white active styling. Tests cover the new behavior.

**Files to create/modify:**
- `frontend/src/pages/Settings.tsx` — modify (single file, all five FRs covered: #1, #2, #3, #4, #5)
- `frontend/src/pages/__tests__/Settings.test.tsx` — modify (FR #15)

**Details:**

1. **Imports.** Replace `import { useCallback, useState } from 'react'` with `import { useCallback, useRef } from 'react'` (drop `useState` since `activeSection` becomes derived from URL). Add `useSearchParams` to the `react-router-dom` import: `import { Link, Navigate, useSearchParams } from 'react-router-dom'`.

2. **Tab state derivation.** Replace `const [activeSection, setActiveSection] = useState<SettingsSection>('profile')` (line 44) with:
   ```tsx
   const VALID_SECTIONS: SettingsSection[] = ['profile', 'dashboard', 'notifications', 'privacy', 'account', 'app']
   const [searchParams, setSearchParams] = useSearchParams()
   const tabParam = searchParams.get('tab')
   const activeSection: SettingsSection = (VALID_SECTIONS as string[]).includes(tabParam ?? '')
     ? (tabParam as SettingsSection)
     : 'profile'

   const setActiveSection = useCallback((section: SettingsSection) => {
     setSearchParams({ tab: section }, { replace: true })
   }, [setSearchParams])
   ```
   Hoist `VALID_SECTIONS` to module-scope (outside the `Settings` function) so it's stable. The `SECTIONS` array (line 24–31) already orders the IDs identically; `VALID_SECTIONS` is its `id` projection.

3. **Arrow-key roving handler.** Add a parent-level keyboard handler. Place inside the `Settings` function body (so it can close over `activeSection` and `setActiveSection`):
   ```tsx
   const tablistRef = useRef<HTMLDivElement>(null)
   const desktopTablistRef = useRef<HTMLDivElement>(null)

   const handleTabKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
     const { key } = e
     let nextIndex: number | null = null
     if (key === 'ArrowLeft' || key === 'ArrowUp') {
       e.preventDefault()
       nextIndex = (currentIndex - 1 + SECTIONS.length) % SECTIONS.length
     } else if (key === 'ArrowRight' || key === 'ArrowDown') {
       e.preventDefault()
       nextIndex = (currentIndex + 1) % SECTIONS.length
     } else if (key === 'Home') {
       e.preventDefault()
       nextIndex = 0
     } else if (key === 'End') {
       e.preventDefault()
       nextIndex = SECTIONS.length - 1
     }
     if (nextIndex !== null) {
       const nextSection = SECTIONS[nextIndex].id
       setActiveSection(nextSection)
       // Focus the newly-active tab in whichever context (mobile or desktop) currently has focus
       const target = e.currentTarget as HTMLElement
       const container = target.closest('[role="tablist"]')
       const next = container?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]
       next?.focus()
     }
   }, [setActiveSection])
   ```

4. **`<h1>` font-script removal.** Replace lines 78–84 inner content:
   ```tsx
   <h1
     id="settings-heading"
     className="px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
     style={GRADIENT_TEXT_STYLE}
   >
     Settings
   </h1>
   ```
   The `<span className="font-script">Settings</span>` wrapper is GONE; `Settings` is plain text.

5. **Mobile tablist.** Replace lines 87–110 with a `role="tablist"` + `aria-orientation="horizontal"` (or omit orientation since horizontal is default — pick omitted for terseness). Each tab button uses the new keyboard handler, the new tabIndex roving, and the new active-state classes:
   ```tsx
   <div className="sm:hidden bg-white/[0.08] backdrop-blur-xl border-b border-white/10">
     <div
       ref={tablistRef}
       className="mx-auto max-w-4xl px-4 flex"
       role="tablist"
       aria-label="Settings sections"
     >
       {SECTIONS.map((s, idx) => (
         <button
           key={s.id}
           role="tab"
           aria-selected={activeSection === s.id}
           aria-controls={`settings-panel-${s.id}`}
           tabIndex={activeSection === s.id ? 0 : -1}
           onClick={() => setActiveSection(s.id)}
           onKeyDown={(e) => handleTabKeyDown(e, idx)}
           className={cn(
             'flex-1 py-3 text-sm font-medium text-center transition-colors',
             activeSection === s.id
               ? 'bg-white/15 text-white border-b-2 border-white/40'
               : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
           )}
         >
           {s.label}
         </button>
       ))}
     </div>
   </div>
   ```

6. **Desktop sidebar.** Replace the `<nav role="navigation">` block at lines 116–135 with a `<div role="tablist" aria-orientation="vertical">` (NOT a `<nav>`; spec FR #1 explicitly eliminates the `<nav>` wrapper):
   ```tsx
   <div
     ref={desktopTablistRef}
     role="tablist"
     aria-label="Settings sections"
     aria-orientation="vertical"
     className="hidden sm:block w-[200px] lg:w-[240px] shrink-0 bg-white/[0.04] border-r border-white/10 rounded-lg p-2"
   >
     {SECTIONS.map((s, idx) => (
       <button
         key={s.id}
         role="tab"
         aria-selected={activeSection === s.id}
         aria-controls={`settings-panel-${s.id}`}
         tabIndex={activeSection === s.id ? 0 : -1}
         onClick={() => setActiveSection(s.id)}
         onKeyDown={(e) => handleTabKeyDown(e, idx)}
         className={cn(
           'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
           activeSection === s.id
             ? 'bg-white/15 text-white border-l-2 border-white/40'
             : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
         )}
       >
         {s.label}
       </button>
     ))}
   </div>
   ```

7. **Active panel container.** Preserve `key={activeSection}`, `id={`settings-panel-${activeSection}`}`, `aria-live="polite"`, and `className="flex-1 max-w-[640px] motion-safe:animate-tab-fade-in"` exactly. NO changes to lines 138–170 (the panel and its conditional ProfileSection / DashboardSection / NotificationsSection / PrivacySection / AccountSection / AppSection mount).

8. **Test updates** (`frontend/src/pages/__tests__/Settings.test.tsx`):
   - **Tab pattern unification tests:** Replace existing tests that target `<nav role="navigation">` desktop sidebar with assertions on `[role="tablist"]` + `aria-orientation="vertical"`. Both mobile and desktop tablists query as `getByRole('tablist', { name: /settings sections/i })` (use `getAllByRole` if both contexts render).
   - **URL-state tests:** Add new tests using `<MemoryRouter initialEntries={['/settings?tab=notifications']}>` (or `createMemoryRouter` if the existing test setup uses `RouterProvider`):
     - `'/settings?tab=notifications'` → Notifications panel renders. Assert `getByRole('tabpanel-equivalent', { name: ... })` — actual selector: `getByRole('region', ...)` since the panel uses `aria-live="polite"` not `role="tabpanel"`. Or assert via `getByText(/Notifications/i)` heading inside the active panel.
     - `'/settings'` (no param) → Profile panel renders.
     - `'/settings?tab=invalid'` → Profile panel renders (invalid falls through).
     - Click a tab → URL updates with `?tab=<id>` AND uses `replace` (verify by checking `MemoryRouter` history length doesn't grow).
   - **Arrow-key roving tests:** Render Settings, focus the first tab via `tab.focus()`, fire `fireEvent.keyDown(tab, { key: 'ArrowRight' })`, assert next tab is selected and focused. Same for ArrowLeft/Up/Down/Home/End. Test wraparound (ArrowLeft on first tab → focuses last).
   - **`tabIndex` roving tests:** Assert `getByRole('tab', { selected: true }).tabIndex === 0` and `getAllByRole('tab', { selected: false })[0].tabIndex === -1`.
   - **font-script removal test:** `expect(getByRole('heading', { level: 1, name: 'Settings' }).querySelector('span.font-script')).toBeNull()`.
   - **Active-state styling tests:** `expect(getByRole('tab', { name: /profile/i, selected: true })).toHaveClass('bg-white/15', 'text-white')`. Mobile context: `border-b-2 border-white/40`. Desktop context: `border-l-2 border-white/40`.
   - **Inactive-state tests:** Assert inactive tab has `text-white/60`.
   - **Preserve existing tests:** Logged-out redirect, panel `key` remount on tab switch, `aria-live="polite"` on panel.

**Auth gating (if applicable):**
- Existing `<Navigate to="/" replace />` mount-time guard (Settings.tsx:56–58) is PRESERVED unchanged. Logged-out users get redirected to `/`. URL params are preserved through redirect for re-attempt post-login.
- NO new auth gates introduced.

**Responsive behavior:**
- Desktop (1440px): Vertical sidebar tablist on left (`hidden sm:block`), panel right. ArrowUp/Down primary, ArrowLeft/Right also work.
- Tablet (768px): Same as desktop (sidebar appears at `sm:` 640px+).
- Mobile (375px): Horizontal tablist above panel (`sm:hidden`). 6 tabs in a single row, `flex-1` each. ArrowLeft/Right primary, ArrowUp/Down also work. NO wrapping.

**Inline position expectations (this step renders an inline-row layout):**
- Mobile tablist: 6 tab buttons must share top-y coordinate at 375px (±5px tolerance). NO wrapping at any breakpoint ≥ 320px.

**Guardrails (DO NOT):**
- Do NOT introduce a new `useState` for tab state — derive from URL on every render.
- Do NOT use `setSearchParams({ tab: section }, { replace: false })` — must be `true` per spec FR #2.
- Do NOT wrap the desktop sidebar in `<nav role="navigation">` again — spec FR #1 explicitly eliminates it.
- Do NOT remove the `key={activeSection}` on the panel container — full remount on tab switch is the documented reset-state pattern.
- Do NOT remove `aria-live="polite"` on the panel container — screen reader announcement.
- Do NOT touch `<h1 id="settings-heading">` outer attributes — only the inner span is removed.
- Do NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground` — atmospheric layer preserved per Direction Decision 1.
- Do NOT touch the route-level `<Navigate>` redirect.
- Do NOT modify the tab labels or order (Profile, Dashboard, Notifications, Privacy, Account, App).
- Do NOT extract a shared keyboard handler util to `lib/` — inline per spec FR #4 ("if no shared util exists … inline it consistently"). `RadioPillGroup` and `TimeRangePills` each inline their own.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `tab pattern: both contexts use role="tab" inside role="tablist"` | unit | render Settings; assert `getAllByRole('tablist').length === 2` (mobile + desktop both render in jsdom — neither hidden by default in jsdom); assert tab buttons have `role="tab"`. |
| `tab pattern: no <nav role="navigation"> wrapper` | unit | `expect(container.querySelector('nav[role="navigation"]')).toBeNull()`. |
| `URL state: deep link to ?tab=notifications` | integration | Mount with `<MemoryRouter initialEntries={['/settings?tab=notifications']}>` → Notifications panel renders. |
| `URL state: missing tab defaults to profile` | integration | Mount with `<MemoryRouter initialEntries={['/settings']}>` → Profile panel renders. |
| `URL state: invalid tab defaults to profile` | integration | Mount with `<MemoryRouter initialEntries={['/settings?tab=garbage']}>` → Profile panel renders. |
| `URL state: tab click uses replace, not push` | integration | Mount with `<MemoryRouter initialEntries={['/']}` then navigate to `/settings`; click a tab; assert history length does not grow beyond 2 (the initial `/` + `/settings`). |
| `arrow-key roving: ArrowRight advances` | unit | Focus first tab, fire ArrowRight keyDown, assert second tab has focus and is `aria-selected=true`. |
| `arrow-key roving: ArrowLeft on first wraps to last` | unit | Focus first tab, fire ArrowLeft, assert last tab is selected. |
| `arrow-key roving: Home jumps to first` | unit | Focus middle tab, fire Home, assert first tab is selected. |
| `arrow-key roving: End jumps to last` | unit | Focus middle tab, fire End, assert last tab is selected. |
| `tabIndex roving: active=0, inactive=-1` | unit | Assert active tab `tabIndex === 0`; all others `=== -1`. |
| `font-script removal: h1 has no font-script span` | unit | `expect(getByRole('heading', { level: 1, name: 'Settings' }).querySelector('span.font-script')).toBeNull()`. |
| `active-state styling: mobile horizontal indicator` | unit | Render at small width (or query the mobile tablist directly); assert active tab has `bg-white/15`, `text-white`, `border-b-2`, `border-white/40`. |
| `active-state styling: desktop vertical indicator` | unit | Query desktop tablist; assert active tab has `bg-white/15`, `text-white`, `border-l-2`, `border-white/40`. |
| `inactive-state styling preserved` | unit | Inactive tab has `text-white/60`. |
| Existing: `logged-out user redirects to /` | integration | Preserved. |
| Existing: `panel container has key={activeSection} and aria-live="polite"` | unit | Preserved. |

**Expected state after completion:**
- [ ] Settings tabs visible on `/settings` (logged-in user).
- [ ] Both mobile and desktop tab lists use `role="tab"` + `role="tablist"` semantics.
- [ ] No `<nav role="navigation">` wrapper anywhere on Settings.
- [ ] URL `?tab=` is the source of truth for active tab; deep links work; refresh preserves tab; click uses `replace` (back button doesn't accumulate).
- [ ] Arrow-key roving + Home/End work in both contexts.
- [ ] `tabIndex` rovers (0 active, -1 inactive).
- [ ] `Settings` h1 has no `<span class="font-script">` wrapper.
- [ ] Active styling uses muted-white (`bg-white/15 text-white`) with orientation-appropriate border indicator.
- [ ] All existing tests pass + new tests pass.
- [ ] `pnpm typecheck` clean.

---

### Step 2: ProfileSection.tsx — Change avatar text-button color migration

**Objective:** Migrate the "Change avatar" text button from `text-primary` to `text-violet-300` per Direction Decision 4 (WCAG AA contrast fix).

**Files to create/modify:**
- `frontend/src/components/settings/ProfileSection.tsx` — modify (single line change at line 107)
- `frontend/src/components/settings/__tests__/ProfileSection.test.tsx` — modify (class-string assertion)

**Details:**

1. **Line 107** of `ProfileSection.tsx`: replace
   ```
   className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```
   with
   ```
   className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```
   ONLY the color portion changes: `text-primary hover:text-primary-lt` → `text-violet-300 hover:text-violet-200`. Sizing, layout, focus ring, surrounding tap-target padding all preserved exactly.

2. **`onClick={() => setPickerOpen(true)}`** preserved.
3. **`aria-label="Change avatar"`** preserved.
4. **Button text content "Change"** preserved.
5. **Test update:** In `ProfileSection.test.tsx`, find any assertion matching `text-primary` or `text-primary-lt` for the Change avatar button and replace with `text-violet-300` / `text-violet-200`. Where queries use `getByRole('button', { name: /change/i })`, no change needed (migration-resilient query).

**Auth gating:** Route-level only — preserved.

**Responsive behavior:**
- Desktop (1440px) / Tablet (768px) / Mobile (375px): No change. Button remains in the avatar row; button text "Change" with text-violet-300 color.

**Inline position expectations:** N/A — the button sits in a `flex items-center gap-4` row with the avatar; no wrapping concern at any tested breakpoint.

**Guardrails (DO NOT):**
- Do NOT change the `onClick`, `aria-label`, button text, or any attribute except the className color portion.
- Do NOT touch the AvatarPickerModal mount (lines 114–125) — that's Step 9.
- Do NOT touch the display name or bio fields — out of scope.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Change avatar button uses text-violet-300` | unit | Render ProfileSection; query Change button via `getByRole('button', { name: /change/i })` filtered to the avatar one (or `getByLabelText('Change avatar')`); assert it has `text-violet-300` class. |
| `Change avatar hover class is text-violet-200` | unit | Same assertion for `hover:text-violet-200`. |
| Existing: `clicking Change opens AvatarPickerModal` | unit | Preserved. |

**Expected state after completion:**
- [ ] Change avatar button renders in violet-300 instead of `text-primary`.
- [ ] All existing ProfileSection tests pass.
- [ ] Visual hover changes to violet-200.

---

### Step 3: AccountSection.tsx — text-button colors + Delete Account trigger severity + Bible-data sweep in handleDeleteConfirm

**Objective:** Migrate Change Email + Change Password text buttons from `text-primary` to `text-violet-300`. Migrate Delete Account trigger button from `bg-red-500/20 text-red-400 border border-red-500/30` to canonical severity muted-destructive. Widen `handleDeleteConfirm` localStorage prefix sweep to include `bible:*` and `bb*` (Bible reactive store + AI/audio cache).

**Files to create/modify:**
- `frontend/src/components/settings/AccountSection.tsx` — modify
- `frontend/src/components/settings/__tests__/AccountSection.test.tsx` — modify (class-string updates + new Bible-data sweep tests)

**Details:**

1. **`handleDeleteConfirm` rewrite (lines 19–39).** Replace the function body with:
   ```tsx
   function handleDeleteConfirm() {
     // Spec 10A: widened sweep covers Worship Room (wr_*), legacy Worship Room
     // (worship-room-*), Bible reactive stores (bible:*), and Bible AI/audio
     // cache (bb26-, bb29-, bb32-, bb44-). Captures every per-spec key
     // documented in 11-local-storage-keys.md and 11b-local-storage-keys-bible.md.
     const DELETE_PREFIXES = ['wr_', 'worship-room-', 'bible:', 'bb']

     const keysToDelete: string[] = []
     for (let i = 0; i < localStorage.length; i++) {
       const key = localStorage.key(i)
       if (key && DELETE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
         keysToDelete.push(key)
       }
     }
     keysToDelete.forEach((key) => localStorage.removeItem(key))

     logout()
     navigate('/')
   }
   ```
   This replaces the current 3-block sweep (lines 21–35) with a single-pass loop. The post-delete `logout()` + `navigate('/')` semantics are preserved EXACTLY. The legacy keys hardcoded list (`worship-room-daily-completion` etc.) is no longer needed because all match `worship-room-` prefix — verified during recon.

2. **Change Email button (line 56).** Replace
   ```
   className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```
   with
   ```
   className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```
   `onClick={() => showToast('This feature is on the way.')}` preserved.

3. **Change Password button (line 67).** Same color migration:
   ```
   className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```
   `onClick={() => setShowChangePasswordModal(true)}` preserved.

4. **Delete Account trigger button (line 82).** Replace
   ```
   className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```
   with
   ```
   className="bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
   ```
   `onClick={() => setShowDeleteModal(true)}` preserved. Button text "Delete Account" preserved. `min-h-[44px]` preserved.

5. **Outer warning box (line 75).** Verification only — `bg-red-500/[0.06] border-red-500/20` is the warning surrounding container, not the button. Spec scope: chrome on the button only. The container chrome stays as-is unless a future spec touches it. Leave alone.

6. **Test updates** (`AccountSection.test.tsx`):
   - Update class-string assertions for Change Email + Change Password buttons.
   - Update class-string assertions for Delete Account trigger button.
   - **Bible-data sweep tests** (FR #15): Add tests setting `localStorage.setItem('bible:bookmarks', '[]')`, `localStorage.setItem('bible:notes', '[]')`, `localStorage.setItem('bible:journalEntries', '[]')`, `localStorage.setItem('bible:plans', '{}')`, `localStorage.setItem('bible:streak', '{}')`, `localStorage.setItem('bb26-v1:audioBibles', '{}')`, `localStorage.setItem('bb29-v1:continuousPlayback', 'true')`, `localStorage.setItem('bb32-v1:explain:abc', '{}')`, `localStorage.setItem('bb44-v1:readAlong', 'true')`, `localStorage.setItem('wr_bible_progress', '{}')`, then trigger `handleDeleteConfirm` (via clicking through the modal) and assert each is `localStorage.getItem(...)` returns `null`. Also assert `localStorage.getItem('unrelated_key')` is preserved (set BEFORE delete to verify).
   - **DeleteAccountModal aria-modal assertion** (FR #15): Trigger DeleteAccountModal; assert dialog has `aria-modal="true"`.
   - **DeleteAccountModal AlertTriangle icon assertion** (FR #15): Trigger DeleteAccountModal; assert presence of `<svg>` with `aria-hidden="true"` in the heading row.
   - **DeleteAccountModal Delete Everything severity colors** (FR #15): Assert button has `bg-red-950/30`, `border-red-400/30`, `text-red-100`.
   - Preserve existing tests for: modal trigger, `logout()` call, `navigate('/')` call.

**Auth gating:** Route-level only — preserved.

**Responsive behavior:**
- Desktop / Tablet / Mobile: Email row uses `flex items-center justify-between` — single row at all breakpoints. NO wrapping.
- Delete Account warning box: `mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4` — same at all breakpoints.

**Inline position expectations:**
- Email row + Change Email button: top-y matches within ±5px at 1440px and 768px. NO wrapping.

**Guardrails (DO NOT):**
- Do NOT change `logout()` or `navigate('/')` order or arguments.
- Do NOT add a backend API call (`DELETE /api/v1/auth/account`) — that's Forums Wave Phase 1 future work.
- Do NOT move `DELETE_PREFIXES` to a separate constants file — Direction Decision 10 says local const at top of function body.
- Do NOT widen the prefix list beyond `['wr_', 'worship-room-', 'bible:', 'bb']` — for example, do NOT add `'theme_'` or `'analytics_'`. Anything outside the four documented prefixes preserves.
- Do NOT touch the warning box outer container chrome (line 75 `bg-red-500/[0.06] border border-red-500/20`) — chrome only changes on the button.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Change Email button uses text-violet-300` | unit | `getByRole('button', { name: /change email/i })` has class `text-violet-300`. |
| `Change Password button uses text-violet-300` | unit | `getByRole('button', { name: /change password/i })` has class `text-violet-300`. |
| `Delete Account trigger uses muted-destructive severity` | unit | `getByRole('button', { name: /delete account/i })` has classes `bg-red-950/30`, `border-red-400/30`, `text-red-100`, `hover:bg-red-900/40`. |
| `handleDeleteConfirm sweeps wr_* keys` (existing) | integration | `localStorage.setItem('wr_test', 'x')`, trigger delete, assert `getItem('wr_test') === null`. |
| `handleDeleteConfirm sweeps worship-room-* keys` (existing) | integration | Same. |
| `handleDeleteConfirm sweeps bible:* keys` (NEW) | integration | Set `bible:bookmarks`, `bible:notes`, `bible:journalEntries`, `bible:plans`, `bible:streak` → trigger delete → all null. |
| `handleDeleteConfirm sweeps bb*-v1: keys` (NEW) | integration | Set `bb26-v1:audioBibles`, `bb29-v1:continuousPlayback`, `bb32-v1:explain:abc`, `bb32-v1:reflect:def`, `bb44-v1:readAlong` → trigger delete → all null. |
| `handleDeleteConfirm preserves unrelated keys` (NEW) | integration | `localStorage.setItem('unrelated_key', 'x')`, `localStorage.setItem('analytics_id', 'y')` → trigger delete → both PRESERVED. |
| `handleDeleteConfirm calls logout() then navigate('/')` (existing) | unit | Mock `useAuth.logout` + `useNavigate`; assert call order. |
| `DeleteAccountModal has aria-modal="true"` (NEW — moved from DeleteAccountModal-specific test) | integration | Open modal; assert `getByRole('alertdialog')` has `aria-modal="true"`. |
| `DeleteAccountModal heading row has AlertTriangle icon` (NEW) | integration | Open modal; assert presence of `aria-hidden="true"` SVG in the heading row. |
| `DeleteAccountModal Delete Everything button uses muted destructive` (NEW) | integration | Open modal; assert button has `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`. |

**Expected state after completion:**
- [ ] Change Email + Change Password buttons render in violet-300.
- [ ] Delete Account trigger renders in muted destructive (NOT saturated red).
- [ ] `handleDeleteConfirm` sweeps all 4 prefix families.
- [ ] Bible-data sweep tests pass.
- [ ] Unrelated keys preserved.
- [ ] All existing AccountSection tests pass.
- [ ] All new tests pass.

---

### Step 4: PrivacySection.tsx — Unblock + Unmute text-button color migrations

**Objective:** Migrate Unblock and Unmute text buttons from `text-primary` to `text-violet-300`.

**Files to create/modify:**
- `frontend/src/components/settings/PrivacySection.tsx` — modify
- `frontend/src/components/settings/__tests__/PrivacySection.test.tsx` — modify

**Details:**

1. **Unblock button (line 151).** Replace
   ```
   className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2"
   ```
   with
   ```
   className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2"
   ```
   `onClick={() => handleUnblockClick(userId)}` preserved.

2. **Unmute button (line 182).** Same migration.

3. **`bg-primary/20` initial avatar circles (lines 141 + 173) PRESERVED.** Decision 11 — these are decorative categorical signals, not CTAs. Do NOT change.

4. **Test updates** (`PrivacySection.test.tsx`): Update class-string assertions for Unblock and Unmute buttons. Where the test seeds blocked users via mocked `useFriends`, preserve. Where the test seeds muted users via mocked `useMutes`, preserve.

**Auth gating:** Route-level only — preserved.

**Responsive behavior:**
- All breakpoints: blocked/muted user rows use `flex items-center justify-between` — single row. NO wrapping.

**Inline position expectations:**
- Each user row: avatar + name on left, Unblock/Unmute button on right. Top-y matches within ±5px.

**Guardrails (DO NOT):**
- Do NOT touch the `bg-primary/20` initial avatar circles (lines 141 + 173) — Decision 11 preserve.
- Do NOT touch the toggle switches, RadioPillGroups, or ConfirmDialog wiring.
- Do NOT change the legacy block list merge logic (line 54–57).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Unblock button uses text-violet-300` | unit | Seed blocked user; `getByRole('button', { name: /unblock/i })` has class `text-violet-300`. |
| `Unmute button uses text-violet-300` | unit | Seed muted user; `getByRole('button', { name: /unmute/i })` has class `text-violet-300`. |
| `Initial avatar circles preserve bg-primary/20` (Decision 11) | unit | Render with seeded blocked user; assert avatar circle div has class `bg-primary/20`. |
| Existing: `Unblock click triggers ConfirmDialog` | unit | Preserved. |
| Existing: `Unmute click triggers ConfirmDialog` | unit | Preserved. |
| Existing: toggle wiring tests | unit | Preserved. |

**Expected state after completion:**
- [ ] Unblock + Unmute buttons render in violet-300.
- [ ] `bg-primary/20` initial avatar circles preserved.
- [ ] All existing PrivacySection tests pass.

---

### Step 5: NotificationsSection.tsx — Send test notification white-pill canonical + status indicator severity

**Objective:** Migrate "Send test notification" button from `bg-white text-hero-dark px-6 py-2 …` to canonical white-pill primary CTA Pattern 2 (`px-8 py-3.5`). Migrate `text-success` and `text-danger` raw classes on push status indicators to severity system canonical class strings.

**Files to create/modify:**
- `frontend/src/components/settings/NotificationsSection.tsx` — modify
- `frontend/src/components/settings/__tests__/NotificationsSection.test.tsx` — modify

**Details:**

1. **Send test notification button (lines 234–241).** Replace
   ```tsx
   <button
     type="button"
     onClick={handleTestNotification}
     disabled={testSending}
     className="bg-white text-hero-dark rounded-full px-6 py-2 font-semibold text-sm hover:bg-white/90 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
   >
     {testSending ? 'Sending…' : 'Send test notification'}
   </button>
   ```
   with the canonical white-pill primary CTA Pattern 2 class string:
   ```tsx
   <button
     type="button"
     onClick={handleTestNotification}
     disabled={testSending}
     className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
   >
     {testSending ? 'Sending…' : 'Send test notification'}
   </button>
   ```
   Behavior preserved: `onClick={handleTestNotification}`, `disabled={testSending}`, button text content. `min-h-[44px]` preserved.

2. **Push status indicator (lines 53–58 — granted state).** Replace
   ```tsx
   <span className="text-sm font-medium text-success">
     &#10003; Notifications enabled
   </span>
   ```
   with the severity-success canonical class. **[UNVERIFIED]** — best-guess `text-emerald-300`:
   ```tsx
   <span className="text-sm font-medium text-emerald-300">
     &#10003; Notifications enabled
   </span>
   ```
   During execution: read `09-design-system.md` § "Severity color system" + Color Palette section + grep `text-emerald-` usage in the codebase. If a different success token is canonical, apply that.

3. **Push status indicator (lines 60–66 — denied state).** Replace
   ```tsx
   <span className="text-sm font-medium text-danger">
     &#10007; Notifications blocked
   </span>
   ```
   with severity-danger canonical class. **[UNVERIFIED]** — best-guess `text-red-300` (matches AlertTriangle icon color in DeleteAccountModal):
   ```tsx
   <span className="text-sm font-medium text-red-300">
     &#10007; Notifications blocked
   </span>
   ```

4. **Preserve everything else exactly** — `subscribeToPush`, `unsubscribeFromPush`, `fireTestNotification`, `requestPermission`, `getPermissionState`, `getPushSupportStatus`, `getNotificationPrefs`, `updateNotificationPrefs`, native `<input type="time">` (line 224–229), denied-permission instructions card, iOS install hint card, all 22 toggles, `wr_sound_effects_enabled` write logic, all sub-headings, all section dividers (`border-t border-white/10`).

5. **Test updates** (`NotificationsSection.test.tsx`):
   - Update Send test notification class-string assertion to verify `px-8 py-3.5` and the canonical white-pill class.
   - Update status indicator class assertion: when permission is `granted` → status uses `text-emerald-300`; when `denied` → `text-red-300`.
   - Preserve all push permission flow tests, mocked `subscribeToPush` / `fireTestNotification` assertions, time picker tests, sound effects toggle tests.

**Auth gating:** Route-level only — preserved.

**Responsive behavior:**
- Desktop / Tablet / Mobile: Send test notification button — single button, no wrapping concern. Bigger horizontal padding (`px-8` from `px-6`) at all breakpoints.
- Daily verse time picker row: existing layout preserved.

**Inline position expectations:** N/A — no inline-row layouts modified.

**Guardrails (DO NOT):**
- Do NOT modify `subscribeToPush`, `unsubscribeFromPush`, `requestPermission`, `getPushSupportStatus`, `getPermissionState`, `getNotificationPrefs`, `updateNotificationPrefs`, `fireTestNotification`, `getBrowserInstructions`.
- Do NOT replace the native `<input type="time">` — Direction Decision 17 defers to Spec 10c.
- Do NOT add expand/collapse affordance on the 22 toggles — Direction Decision 17 defers.
- Do NOT touch ToggleSwitch component (Step 10).
- Do NOT touch the iOS install hint card or denied-permission card.
- Do NOT touch `wr_sound_effects_enabled` storage.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Send test notification uses canonical white-pill (px-8 py-3.5)` | unit | Render with push enabled; query button by name; assert classes `px-8`, `py-3.5`, `bg-white`, `rounded-full`, `text-hero-bg`, `shadow-[0_0_30px_rgba(255,255,255,0.20)]`. |
| `Send test notification preserves min-h-[44px]` | unit | Class `min-h-[44px]`. |
| `Send test notification disabled state preserved` | unit | When `testSending`, button has `disabled` attribute. |
| `Push status indicator: granted uses severity success` | unit | Mock permission=granted; assert status text has `text-emerald-300` class (or whatever severity-success resolves to). |
| `Push status indicator: denied uses severity danger` | unit | Mock permission=denied; assert status text has `text-red-300` class. |
| Existing: master push toggle requests permission flow | unit | Preserved. |
| Existing: time picker change fires `updateNotificationPrefs` | unit | Preserved. |
| Existing: `fireTestNotification` called on click → toast 'Sent!' | unit | Preserved. |
| Existing: sound effects toggle writes `wr_sound_effects_enabled` | unit | Preserved. |
| Existing: 22 toggles all wire to `onUpdateNotifications` | unit | Preserved. |

**Expected state after completion:**
- [ ] Send test notification button matches homepage Get Started visual (white pill, `px-8 py-3.5`, white drop shadow).
- [ ] Push status indicators use severity-tonal colors instead of raw `text-success` / `text-danger`.
- [ ] All existing NotificationsSection tests pass.
- [ ] BB-41 push permission flow unchanged (mocked verification).

---

### Step 6: RadioPillGroup.tsx — selected pill muted-white migration + new test

**Objective:** Migrate RadioPillGroup selected pill from `bg-primary/20 border border-primary text-white` to `bg-white/15 text-white border border-white/30` per Direction Decision 2. Add a new RadioPillGroup test file (none exists).

**Files to create/modify:**
- `frontend/src/components/settings/RadioPillGroup.tsx` — modify (line 55)
- `frontend/src/components/settings/__tests__/RadioPillGroup.test.tsx` — **create** (smoke test for new chrome + roving)

**Details:**

1. **Selected pill class string (line 55).** Replace
   ```
   selected
     ? 'bg-primary/20 border border-primary text-white'
     : 'bg-white/5 border border-white/15 text-white/60 hover:bg-white/10',
   ```
   with
   ```
   selected
     ? 'bg-white/15 text-white border border-white/30'
     : 'bg-white/5 border border-white/15 text-white/60 hover:bg-white/10',
   ```
   Inactive class string preserved.

2. **All other props, handlers, ARIA, and roving tabindex preserved.**

3. **New test file** (`RadioPillGroup.test.tsx`) — smoke test:
   ```tsx
   import { render, screen, fireEvent } from '@testing-library/react'
   import { RadioPillGroup } from '../RadioPillGroup'

   const OPTIONS = [
     { value: 'a', label: 'A' },
     { value: 'b', label: 'B' },
     { value: 'c', label: 'C' },
   ]

   describe('RadioPillGroup', () => {
     it('renders role="radiogroup" with role="radio" buttons', () => { /* ... */ })
     it('selected pill uses bg-white/15 text-white border border-white/30', () => { /* ... */ })
     it('unselected pill uses bg-white/5 border border-white/15 text-white/60', () => { /* ... */ })
     it('aria-checked reflects selected state', () => { /* ... */ })
     it('tabIndex roves: selected=0, others=-1', () => { /* ... */ })
     it('ArrowRight focuses next pill and calls onChange', () => { /* ... */ })
     it('ArrowLeft on first wraps to last', () => { /* ... */ })
     it('ArrowDown advances same as ArrowRight (vertical orientation parity)', () => { /* ... */ })
     it('clicking a pill calls onChange', () => { /* ... */ })
   })
   ```

**Auth gating:** N/A.

**Responsive behavior:**
- All breakpoints: existing `flex gap-2 flex-wrap` preserved.

**Inline position expectations:** N/A — pill row uses `flex-wrap`, wrap acceptable.

**Guardrails (DO NOT):**
- Do NOT change the `role="radiogroup"`, `role="radio"`, or `aria-checked` semantics.
- Do NOT modify the arrow-key handler.
- Do NOT touch the `tabIndex` roving (`selected ? 0 : -1`).
- Do NOT modify the `min-h-[44px]` touch target.

**Test specifications:** See list above (10 tests in the new file).

**Expected state after completion:**
- [ ] Selected pill renders muted-white isolated chrome.
- [ ] Unselected pill chrome preserved.
- [ ] New test file passes all assertions.
- [ ] PrivacySection tests still pass (PrivacySection consumes RadioPillGroup).

---

### Step 7: DeleteAccountModal.tsx — aria-modal + AlertTriangle icon + Delete Everything button severity

**Objective:** Add `aria-modal="true"` to the `role="alertdialog"`. Add an `<AlertTriangle aria-hidden>` icon in the heading row, wrapped in `flex items-center gap-3`. Migrate the Delete Everything button from saturated `bg-red-500 text-white hover:bg-red-600` to canonical muted destructive.

**Files to create/modify:**
- `frontend/src/components/settings/DeleteAccountModal.tsx` — modify
- (Tests for these changes live in `AccountSection.test.tsx` per Step 3 — no separate test file.)

**Details:**

1. **Add `aria-modal="true"` to dialog element (line 22).** Update:
   ```tsx
   <div
     ref={containerRef}
     role="alertdialog"
     aria-modal="true"
     aria-labelledby="delete-title"
     aria-describedby="delete-desc"
     className="relative z-10 rounded-2xl border border-white/10 bg-surface-dark backdrop-blur-md p-6 max-w-md w-full mx-4"
   >
   ```

2. **Add AlertTriangle icon to heading row.** Import: `import { AlertTriangle } from 'lucide-react'`. Replace lines 27–29:
   ```tsx
   <h2 id="delete-title" className="text-lg font-semibold text-white mb-2">
     Delete Your Account?
   </h2>
   ```
   with
   ```tsx
   <div className="flex items-center gap-3 mb-2">
     <AlertTriangle className="h-5 w-5 text-red-300 shrink-0" aria-hidden="true" />
     <h2 id="delete-title" className="text-lg font-semibold text-white">
       Delete Your Account?
     </h2>
   </div>
   ```
   The `id="delete-title"` and heading text preserved exactly.

3. **Delete Everything button (lines 45–51).** Replace
   ```tsx
   <button
     type="button"
     onClick={onConfirm}
     className="flex-1 bg-red-500 text-white rounded-lg px-4 py-3 hover:bg-red-600 transition-colors font-medium min-h-[44px] text-sm"
   >
     Delete Everything
   </button>
   ```
   with
   ```tsx
   <button
     type="button"
     onClick={onConfirm}
     className="flex-1 bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 rounded-lg px-4 py-3 transition-colors font-medium min-h-[44px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
   >
     Delete Everything
   </button>
   ```
   `onClick={onConfirm}`, button text "Delete Everything", `min-h-[44px]` preserved.

4. **Cancel button (lines 38–44).** Verify already canonical-secondary chrome (`bg-white/10 text-white border border-white/15 ...`). Per spec FR #12d (about ChangePasswordModal Cancel) the same precedent is the goal here. Confirmed during recon: Cancel already uses canonical secondary chrome; preserve as-is.

5. **`useFocusTrap`** preserved (line 10).
6. **`role="alertdialog"`, `aria-labelledby`, `aria-describedby`** preserved.
7. **Backdrop click-outside dismiss + Escape (via focus trap)** preserved.
8. **"We'll miss you" copy** preserved (intentional emotional honesty).

**Auth gating:** Route-level only — preserved.

**Responsive behavior:**
- Mobile: stacked via `flex-col-reverse sm:flex-row`. Cancel + Delete Everything stack vertically (with Cancel on top because of `flex-col-reverse`).
- Tablet/Desktop: side-by-side row.

**Inline position expectations:**
- Heading row: AlertTriangle icon + heading text on same y at all breakpoints. `flex items-center` with `shrink-0` icon prevents misalignment.
- Cancel + Delete Everything (≥sm): same y within ±5px.

**Guardrails (DO NOT):**
- Do NOT modify `role="alertdialog"` to `role="dialog"`.
- Do NOT touch `aria-labelledby`, `aria-describedby`, or `useFocusTrap`.
- Do NOT change `id="delete-title"` or `id="delete-desc"`.
- Do NOT modify the description text "This will permanently delete all your Worship Room data..." — emotionally honest preservation.
- Do NOT touch `onConfirm` invocation or its prop wiring.
- Do NOT touch the backdrop click-outside handler.
- Do NOT change the Cancel button (verify unchanged is canonical).

**Test specifications:** See Step 3 test list (Bible-data sweep + aria-modal + AlertTriangle icon + severity colors all assert here via AccountSection.test.tsx).

**Expected state after completion:**
- [ ] DeleteAccountModal has `aria-modal="true"` on the dialog.
- [ ] AlertTriangle icon renders before heading in `flex items-center gap-3` row.
- [ ] Delete Everything button uses muted destructive chrome.
- [ ] Cancel button preserved.
- [ ] Modal a11y intact (focus trap, escape, click-outside).

---

### Step 8: ChangePasswordModal.tsx — submit button white-pill + input chrome alignment + validation timing + error colors

**Objective:** Migrate Update password submit button to canonical white-pill primary CTA. Align input chrome to RegisterPage / AuthModal canonical (verify during execution; current chrome may already be canonical — see [UNVERIFIED] #2). Change `newTooShort` and `confirmMismatch` from keystroke-real-time to blur-promoted validation. Migrate field-level + form-level error text colors from `text-red-400` to `text-red-100` per severity system.

**Files to create/modify:**
- `frontend/src/components/settings/ChangePasswordModal.tsx` — modify
- `frontend/src/components/settings/__tests__/ChangePasswordModal.test.tsx` — modify

**Details:**

1. **Add `newPasswordTouched` and `confirmPasswordTouched` state** (line 17 area):
   ```tsx
   const [newPasswordTouched, setNewPasswordTouched] = useState(false)
   const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
   ```
   Reset both to `false` in `resetAndClose` (line 30):
   ```tsx
   function resetAndClose() {
     setCurrentPassword('')
     setNewPassword('')
     setConfirmPassword('')
     setNewPasswordTouched(false)
     setConfirmPasswordTouched(false)
     setCurrentError(null)
     setGeneralError(null)
     onClose()
   }
   ```
   Also reset both to `false` after successful submit (lines 47–50):
   ```tsx
   await changePasswordApi(currentPassword, newPassword)
   onSuccess()
   setCurrentPassword('')
   setNewPassword('')
   setConfirmPassword('')
   setNewPasswordTouched(false)
   setConfirmPasswordTouched(false)
   ```

2. **Validation calculations (lines 23–24).** Update:
   ```tsx
   const newTooShort = newPasswordTouched && newPassword.length > 0 && newPassword.length < 8
   const confirmMismatch =
     confirmPasswordTouched && confirmPassword.length > 0 && newPassword !== confirmPassword
   const formValid =
     currentPassword.length > 0 &&
     newPassword.length >= 8 &&
     newPassword === confirmPassword
   ```
   `formValid` calculation is UNCHANGED — submit button enable state still uses raw length, not touched state.

3. **New password input + onBlur** (line 116 area). Add `onBlur={() => setNewPasswordTouched(true)}` to the input. Add a help hint paragraph that renders BELOW the input when not in error state:
   ```tsx
   <input
     id="cp-new"
     type="password"
     autoComplete="new-password"
     required
     minLength={8}
     value={newPassword}
     onChange={(e) => setNewPassword(e.target.value)}
     onBlur={() => setNewPasswordTouched(true)}
     aria-invalid={newTooShort}
     aria-describedby={newTooShort ? 'cp-new-error' : 'cp-new-hint'}
     className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
   />
   {newTooShort ? (
     <p id="cp-new-error" role="alert" className="mt-1 text-sm text-red-100">
       Use at least 8 characters.
     </p>
   ) : (
     <p id="cp-new-hint" className="mt-1 text-xs text-white/60">
       Use at least 8 characters.
     </p>
   )}
   ```
   The help hint is NOT `role="alert"` — it's just guidance. The error promotion (severity `text-red-100`) is the only `role="alert"`. `aria-describedby` always points to either the hint or the error (not both).

4. **Confirm password input + onBlur** (line 139 area). Add `onBlur={() => setConfirmPasswordTouched(true)}`. Update the error rendering to severity `text-red-100`:
   ```tsx
   <input
     id="cp-confirm"
     type="password"
     autoComplete="new-password"
     required
     value={confirmPassword}
     onChange={(e) => setConfirmPassword(e.target.value)}
     onBlur={() => setConfirmPasswordTouched(true)}
     aria-invalid={confirmMismatch}
     aria-describedby={confirmMismatch ? 'cp-confirm-error' : undefined}
     className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
   />
   {confirmMismatch && (
     <p id="cp-confirm-error" role="alert" className="mt-1 text-sm text-red-100">
       Passwords don&apos;t match.
     </p>
   )}
   ```

5. **Current password error color** (line 106). Update `text-red-400` → `text-red-100`:
   ```tsx
   {currentError && (
     <p id="cp-current-error" role="alert" className="mt-1 text-sm text-red-100">
       {currentError}
     </p>
   )}
   ```

6. **Form-level generalError color** (line 158). Update `text-red-400` → `text-red-100`:
   ```tsx
   {generalError && (
     <p role="alert" className="text-sm text-red-100">
       {generalError}
     </p>
   )}
   ```

7. **Submit button (lines 173–179).** Replace
   ```tsx
   <button
     type="submit"
     disabled={!formValid || submitting}
     className="flex-1 bg-primary text-white rounded-lg px-4 py-3 hover:bg-primary-lt transition-colors font-medium min-h-[44px] text-sm disabled:opacity-50"
   >
     {submitting ? 'Updating…' : 'Update password'}
   </button>
   ```
   with the canonical white-pill class string (note: the canonical Pattern 2 uses `flex-1` only when needed; for this two-button row use it for parity with Cancel):
   ```tsx
   <button
     type="submit"
     disabled={!formValid || submitting}
     className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
   >
     {submitting ? 'Updating…' : 'Update password'}
   </button>
   ```
   `disabled={!formValid || submitting}` preserved. Button text variants preserved.

8. **Cancel button (line 165).** Verify already canonical secondary (`bg-white/10 text-white border border-white/15 ...`). Preserve unchanged.

9. **Input chrome [UNVERIFIED #2].** Pre-execution recon Step 8 detail:
   - Read `frontend/src/components/prayer-wall/AuthModal.tsx` line 368 and `frontend/src/pages/RegisterPage.tsx` for the canonical input chrome.
   - If canonical = `bg-white/[0.06] border border-white/[0.12] rounded-xl ... px-3 py-2.5`, update the 3 ChangePasswordModal inputs to match.
   - If canonical = `bg-white/5 border border-white/15` (the spec's literal language), the current ChangePasswordModal inputs already match — NO chrome change needed.
   - **Default action:** keep current input chrome (`border border-white/15 bg-white/5 px-3 py-2 rounded-lg`) UNLESS execution-time recon resolves canonical to a different shape.

10. **Test updates** (`ChangePasswordModal.test.tsx`):
    - **Validation timing tests:**
      - `'Use at least 8 characters' renders as help hint when newPassword empty` — assert `text-white/60` class on the paragraph; assert NOT `role="alert"`.
      - `'Use at least 8 characters' help hint shown while typing without blur` — type 3 chars, assert hint still `text-white/60` and NOT `role="alert"`.
      - `'Use at least 8 characters' promotes to error on blur with too-short value` — type 3 chars, blur input, assert paragraph has `role="alert"` AND `text-red-100`.
      - `'Use at least 8 characters' clears error on valid length even after blur` — type 8 chars, blur, assert hint NOT shown (or hint shown without error styling).
      - `Passwords don't match: blur-promoted, not real-time` — type mismatched confirm without blur, assert NO error; blur, assert error.
    - **Error color tests:**
      - Field error `text-red-100`.
      - Form-level error `text-red-100`.
    - **Submit button chrome:** Assert `px-8`, `py-3.5`, `bg-white`, `text-hero-bg`, `shadow-[0_0_30px_rgba(255,255,255,0.20)]`, `rounded-full`.
    - **Existing tests preserved:**
      - `formValid` enables/disables submit correctly.
      - `changePasswordApi` called with `(currentPassword, newPassword)`.
      - Error mapping: CURRENT_PASSWORD_INCORRECT → field-level current error; PASSWORDS_MUST_DIFFER → form-level; CHANGE_PASSWORD_RATE_LIMITED → form-level rate-limit copy; generic → form-level generic.
      - `aria-invalid` + `aria-describedby` wiring on error-promotion path.
      - `useFocusTrap` engages.
      - Cancel button preserves chrome.
      - Submit `disabled={submitting}` during async call.

**Auth gating:** Route-level only — preserved.

**Responsive behavior:**
- Mobile: stacked via `flex-col-reverse sm:flex-row`.
- Tablet/Desktop: side-by-side row.

**Inline position expectations:**
- Cancel + Update password (≥sm): top-y matches within ±5px.

**Guardrails (DO NOT):**
- Do NOT change `formValid` calculation (still raw length, not touched).
- Do NOT change `changePasswordApi` call site or error mapping logic.
- Do NOT touch `useFocusTrap`.
- Do NOT change `role="dialog"`, `aria-modal="true"`, `aria-labelledby="change-password-title"`.
- Do NOT remove `aria-invalid` or `aria-describedby` on the error-promotion path.
- Do NOT modify the form-level error messages (CURRENT_PASSWORD_INCORRECT, PASSWORDS_MUST_DIFFER, CHANGE_PASSWORD_RATE_LIMITED, generic) — copy preserved.
- Do NOT change the touched state to default `true` on first render — must be `false` (so the help hint shows initially).
- Do NOT promote errors before blur (this defeats the purpose of the spec change).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `submit button uses canonical white-pill` | unit | `getByRole('button', { name: /update password/i })` has `px-8 py-3.5 bg-white rounded-full text-hero-bg`. |
| `submit disabled when formValid false` | unit | Empty inputs → button disabled. |
| `submit disabled while submitting` | unit | Mock `changePasswordApi` slow; assert button disabled during call. |
| `help hint shown when newPassword empty` | unit | Render; assert paragraph 'Use at least 8 characters.' with `text-white/60` and NOT `role="alert"`. |
| `help hint shown while typing without blur` | unit | Type 3 chars; assert hint still `text-white/60`. |
| `help hint promotes to error after blur with too-short value` | unit | Type 3 chars, blur, assert error paragraph has `role="alert"` and `text-red-100`. |
| `error clears when value reaches 8 chars after blur` | unit | Type 3 chars, blur, then type 5 more chars (newPasswordTouched still true; formValid kicks in). Assert no error. |
| `confirmMismatch waits for blur` | unit | Set newPassword=12345678, type confirm=1234, blur confirm, assert error. Type without blur → no error. |
| `field error text uses text-red-100` | unit | Trigger CURRENT_PASSWORD_INCORRECT; assert paragraph has `text-red-100`. |
| `form-level error uses text-red-100` | unit | Trigger PASSWORDS_MUST_DIFFER; assert form-level paragraph has `text-red-100`. |
| `aria-invalid and aria-describedby wired on error-promotion path` | unit | Trigger newTooShort error; assert `getByLabelText('New password').getAttribute('aria-invalid') === 'true'` and `aria-describedby === 'cp-new-error'`. |
| Existing: `changePasswordApi called with (currentPassword, newPassword)` | unit | Preserved. |
| Existing: `Cancel button preserves chrome` | unit | Preserved. |
| Existing: `useFocusTrap engaged` | unit | Preserved. |

**Expected state after completion:**
- [ ] Update password button matches white-pill canonical.
- [ ] Validation feels like a friendly hint while typing; promotes to error on blur.
- [ ] Field + form errors use severity-tonal `text-red-100`.
- [ ] All existing flow tests pass (changePasswordApi, error mapping, modal close).

---

### Step 9: AvatarPickerModal.tsx — Save buttons + tab buttons + active bg + focus-on-open + photo error severity

**Objective:** Migrate two Save buttons to white-pill canonical. Bump tab buttons to `min-h-[44px]`. Change active tab background `bg-white/10` → `bg-white/15`. Change focus-on-open destination from close X to currently-selected avatar (Presets tab) or Choose File button (Upload tab). Migrate photo error inline messages from `text-red-400 text-center` to `text-red-100 text-center`.

**Files to create/modify:**
- `frontend/src/components/shared/AvatarPickerModal.tsx` — modify
- `frontend/src/components/shared/__tests__/AvatarPickerModal.test.tsx` — modify

**Details:**

1. **Tab button: Presets (lines 190–202).** Add `min-h-[44px]` and bump active background `bg-white/10` → `bg-white/15`:
   ```tsx
   <button
     role="tab"
     id="tab-presets"
     aria-selected={activeTab === 'presets'}
     aria-controls="panel-presets"
     onClick={() => setActiveTab('presets')}
     className={cn(
       'flex-1 min-h-[44px] py-2 px-4 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
       activeTab === 'presets' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70',
     )}
   >
     Presets
   </button>
   ```

2. **Tab button: Upload (lines 203–215).** Same migration: add `min-h-[44px]`, change active bg to `bg-white/15`.

3. **Save button (Presets tab, lines 344–349).** Replace
   ```tsx
   <button
     onClick={handleSave}
     className="w-full bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
   >
     Save
   </button>
   ```
   with canonical white-pill (use `w-full` instead of `flex-1`; the existing button is full-width single-CTA):
   ```tsx
   <button
     onClick={handleSave}
     className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-mid active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
   >
     Save
   </button>
   ```
   Note: focus-ring offset uses `focus-visible:ring-offset-hero-mid` (matches the modal container background `bg-hero-mid`) instead of `hero-bg` — the modal's own surface tone.

4. **Save button (Upload tab, lines 416–421).** Same migration; button text "Use This Photo" preserved.

5. **Photo error: line 234 (Presets tab Save error).** Change `text-red-400 text-center` → `text-red-100 text-center`. Preserve `role="alert"`.

6. **Photo error: line 370 (Upload tab photo processing error).** Same migration: `text-red-400 text-center` → `text-red-100 text-center`.

7. **Photo error: line 408 (Upload tab Save error).** Same migration: `text-red-400 text-center` → `text-red-100 text-center`.

8. **Focus-on-open destination.** Add a new `useEffect` that triggers when `isOpen` transitions to `true`. Targets:
   - Presets tab: `<button data-avatar-id="${selectedAvatarId}">`
   - Upload tab: Choose File button — add a `ref` to it.

   Implementation:
   ```tsx
   // Add a ref for Choose File button at the top of the component:
   const chooseFileButtonRef = useRef<HTMLButtonElement>(null)

   // Focus-on-open effect (placed after the existing useFocusTrap return)
   useEffect(() => {
     if (!isOpen) return
     // Defer to next tick so useFocusTrap's default first-focusable-child focus runs first,
     // then we override.
     const timer = setTimeout(() => {
       if (activeTab === 'presets') {
         const button = document.querySelector<HTMLButtonElement>(
           `[data-avatar-id="${selectedAvatarId}"]`,
         )
         button?.focus()
       } else if (activeTab === 'upload') {
         chooseFileButtonRef.current?.focus()
       }
     }, 0)
     return () => clearTimeout(timer)
     // Only fire when isOpen flips to true OR when the active tab changes WITHIN an open modal
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isOpen, activeTab])
   ```
   On the Choose File button (line 387), add `ref={chooseFileButtonRef}`.

9. **All preserved chrome and behaviors:** `ring-primary` selection rings (Decision 11), container chrome (`bg-hero-mid border border-white/15`), drag-drop zone (`border-2 border-dashed border-white/20`), `motion-safe:animate-dropdown-in` (BB-33 canonical), `useFocusTrap` (Escape + click-outside + Tab roving), `role="dialog"`, `aria-modal="true"`, `aria-labelledby="avatar-picker-title"`, Save callback signature `(avatarId, avatarUrl?) => onSave`, all preset arrow-key handlers, all upload preview/Remove Photo logic.

10. **Test updates** (`AvatarPickerModal.test.tsx`):
    - **Save button chrome:** assert `px-8 py-3.5 bg-white rounded-full text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)]`.
    - **Tab button `min-h-[44px]`:** assert both tab buttons have `min-h-[44px]` class.
    - **Active tab background:** assert active tab has `bg-white/15` class (NOT `bg-white/10`).
    - **Focus-on-open Presets:** open modal with Presets active, assert focus lands on `<button data-avatar-id="${currentAvatarId}">` (NOT close X).
    - **Focus-on-open Upload:** switch to Upload tab, assert focus lands on Choose File button.
    - **Photo error severity:** trigger photo error path; assert paragraph has `text-red-100` class.
    - **`ring-primary` selection rings preserved:** select an avatar; assert `ring-primary` class on its button.
    - **Container chrome preserved:** modal has `bg-hero-mid`, `border-white/15`, `motion-safe:animate-dropdown-in`.
    - **Drag-drop zone preserved:** Upload tab has element with `border-2 border-dashed border-white/20`.
    - **`useFocusTrap` engaged + Escape dismisses + click-outside dismisses:** preserved.
    - **`aria-modal="true"`, `aria-labelledby="avatar-picker-title"`:** preserved.
    - **Save callback signature `(avatarId, avatarUrl?) => onSave`:** preserved.

**Auth gating:** Route-level only — preserved.

**Responsive behavior:**
- Mobile (375px): modal renders `inset-4` (full-screen with 16px margin). Save button full-width pill at all breakpoints.
- Tablet/Desktop: modal centered, `sm:max-w-[500px] lg:max-w-[560px]`.

**Inline position expectations:**
- Tab row (Presets + Upload): two buttons in a single row (`flex gap-1`). Top-y matches within ±5px at all breakpoints. NO wrapping.
- Header row (heading + close X): existing `flex items-center justify-between` row preserved.

**Guardrails (DO NOT):**
- Do NOT modify the Save callback signature `onSave(avatarId, avatarUrl?)`.
- Do NOT touch `ring-primary` selection rings (lines 261 + 311) — Decision 11 preserve.
- Do NOT touch the container chrome (`bg-hero-mid border border-white/15 rounded-2xl shadow-xl motion-safe:animate-dropdown-in`).
- Do NOT touch the drag-drop zone (`border-2 border-dashed border-white/20`).
- Do NOT modify the `processAvatarPhoto` integration.
- Do NOT modify the `useFocusTrap` invocation.
- Do NOT touch the avatar arrow-key navigation (`handlePresetKeyDown`).
- Do NOT change the close X button's existing `aria-label="Close avatar picker"` or its onClick.
- Do NOT extract the white-pill class string to a shared constant — the spec keeps inline class strings per current codebase convention.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Save button (Presets) uses canonical white-pill` | unit | Open modal; query Save button; assert classes. |
| `Save button (Upload) uses canonical white-pill` | unit | Switch to Upload tab, attach a photo, assert "Use This Photo" button has white-pill classes. |
| `Tab buttons have min-h-[44px]` | unit | Assert both `Presets` and `Upload Photo` buttons have `min-h-[44px]`. |
| `Active tab background is bg-white/15 (not bg-white/10)` | unit | Open Presets tab; assert tab has `bg-white/15` class. Switch to Upload; assert. |
| `Focus-on-open lands on selected avatar (Presets)` | unit | Open modal with `currentAvatarId='lighthouse'`; assert `document.activeElement` matches `<button data-avatar-id="lighthouse">`. |
| `Focus-on-open lands on Choose File (Upload)` | unit | Open modal, switch to Upload; assert focus on Choose File button (use `getByRole('button', { name: /choose file/i })`). |
| `Photo error uses text-red-100 severity` | unit | Force `processAvatarPhoto` to throw; assert error paragraph has `text-red-100`. |
| `ring-primary selection ring preserved` | unit | Select avatar; assert button has `ring-primary` class. |
| `Container chrome preserved` | unit | Assert modal has `bg-hero-mid`, `border-white/15`, `rounded-2xl`. |
| `animate-dropdown-in preserved` | unit | Assert modal has `motion-safe:animate-dropdown-in`. |
| `useFocusTrap engaged` | unit | Existing test preserved. |
| `Escape dismisses modal` | unit | Existing test preserved. |
| `Click-outside dismisses modal` | unit | Existing test preserved. |
| `aria-modal="true"` | unit | Existing test preserved. |
| `aria-labelledby="avatar-picker-title"` | unit | Existing test preserved. |
| `Save callback signature (avatarId, avatarUrl?)` | unit | Existing test preserved. |

**Expected state after completion:**
- [ ] AvatarPickerModal Save buttons match homepage Get Started visual.
- [ ] Tab buttons clear 44×44 touch target.
- [ ] Active tab uses `bg-white/15`.
- [ ] Focus-on-open lands on selected avatar (Presets) or Choose File (Upload), NOT close X.
- [ ] Photo errors use severity-tonal `text-red-100`.
- [ ] Selection rings, container chrome, drag-drop zone, `animate-dropdown-in`, focus trap, `aria-modal`, save callback all preserved.

---

### Step 10: ToggleSwitch.tsx — comment-only documentation of Direction Decision 3

**Objective:** Add a code comment immediately before `bg-primary` on-state class to document Direction Decision 3 (toggle on-state preservation rationale). NO code changes.

**Files to create/modify:**
- `frontend/src/components/settings/ToggleSwitch.tsx` — modify (comment only)

**Details:**

1. **Line 43 area.** Add a code comment immediately before the conditional that selects the on-state class:
   ```tsx
   className={cn(
     'relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors self-center p-0',
     'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark',
     // Toggle on-state uses bg-primary per Spec 10A Direction Decision 3.
     // State indicators warrant high-saturation distinction; native OS toggle convention.
     checked ? 'bg-primary' : 'bg-white/20',
   )}
   ```

2. **All other code, props, ARIA, handlers, transitions PRESERVED.**

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT change `bg-primary` to `bg-violet-500` or any other class.
- Do NOT modify `role="switch"`, `aria-checked`, `aria-labelledby`, `aria-describedby`.
- Do NOT modify the Enter-key handler.
- Do NOT modify the transition or `motion-reduce` rule.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Toggle on-state still uses bg-primary` (regression) | unit | Render with `checked=true`; assert button has `bg-primary` class. |
| `Toggle off-state uses bg-white/20` (preserved) | unit | Render with `checked=false`; assert button has `bg-white/20`. |

If a `ToggleSwitch.test.tsx` does NOT exist (it does not, per recon Part 10), do NOT create one for a comment-only step. The class behavior is implicitly covered by NotificationsSection / PrivacySection tests that exercise toggles.

**Expected state after completion:**
- [ ] ToggleSwitch.tsx contains the new code comment.
- [ ] No code or behavior change.
- [ ] All existing tests that consume ToggleSwitch (NotificationsSection, PrivacySection) still pass.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Settings.tsx tab unification + URL state + arrow-key roving + font-script removal + active-state styling. Establishes cluster pattern; all other steps run after. |
| 2 | 1 | ProfileSection.tsx — Change avatar text-violet-300 migration. |
| 3 | 1 | AccountSection.tsx — text buttons + delete trigger severity + handleDeleteConfirm Bible sweep. Tests in `AccountSection.test.tsx` depend on the DeleteAccountModal changes from Step 7 (aria-modal + AlertTriangle icon + severity colors), so Step 7 must land before Step 3 tests run cleanly. Practical execution: run Step 7 BEFORE Step 3's tests. |
| 4 | 1 | PrivacySection.tsx — Unblock + Unmute color migration. |
| 5 | 1 | NotificationsSection.tsx — Send test notification white-pill + status indicator severity. |
| 6 | 1 | RadioPillGroup.tsx — selected pill chrome + new test file. |
| 7 | 1 | DeleteAccountModal.tsx — aria-modal + AlertTriangle + Delete Everything severity. |
| 8 | 1 | ChangePasswordModal.tsx — submit white-pill + input chrome alignment + validation timing + error colors. |
| 9 | 1 | AvatarPickerModal.tsx — Save buttons + tab buttons + active bg + focus-on-open + photo error severity. |
| 10 | 1 | ToggleSwitch.tsx — comment-only. |

**Practical ordering for execution:** Step 1 → 7 → 3 → 2, 4, 5, 6, 8, 9 (in any order) → 10. Steps 2, 4, 5, 6, 8, 9 are mutually independent after Step 1 lands. Step 3's full test suite depends on Step 7's chrome changes already being in place (since AccountSection.test.tsx covers DeleteAccountModal assertions).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Settings.tsx tab unification + URL state + arrow-key roving + font-script removal + active-state styling | [COMPLETE] | 2026-05-06 | Settings.tsx |
| 2 | ProfileSection.tsx — Change avatar text-violet-300 | [COMPLETE] | 2026-05-06 | ProfileSection.tsx + ProfileSection.test.tsx |
| 3 | AccountSection.tsx — text buttons + delete trigger severity + handleDeleteConfirm Bible sweep | [COMPLETE] | 2026-05-06 | AccountSection.tsx + AccountSection.test.tsx |
| 4 | PrivacySection.tsx — Unblock + Unmute text-violet-300 | [COMPLETE] | 2026-05-06 | PrivacySection.tsx + PrivacySection.test.tsx |
| 5 | NotificationsSection.tsx — Send test notification white-pill + status indicator severity | [COMPLETE] | 2026-05-06 | NotificationsSection.tsx + NotificationsSection.test.tsx |
| 6 | RadioPillGroup.tsx — selected pill muted-white + new test | [COMPLETE] | 2026-05-06 | RadioPillGroup.tsx + RadioPillGroup.test.tsx (new) |
| 7 | DeleteAccountModal.tsx — aria-modal + AlertTriangle + Delete Everything severity | [COMPLETE] | 2026-05-06 | DeleteAccountModal.tsx + AccountSection.test.tsx |
| 8 | ChangePasswordModal.tsx — submit white-pill + validation timing + error colors | [COMPLETE] | 2026-05-06 | ChangePasswordModal.tsx + ChangePasswordModal.test.tsx |
| 9 | AvatarPickerModal.tsx — Save buttons + tab buttons + active bg + focus-on-open + photo error severity | [COMPLETE] | 2026-05-06 | AvatarPickerModal.tsx + AvatarPickerModal.test.tsx |
| 10 | ToggleSwitch.tsx — comment-only Direction Decision 3 | [COMPLETE] | 2026-05-06 | ToggleSwitch.tsx |
