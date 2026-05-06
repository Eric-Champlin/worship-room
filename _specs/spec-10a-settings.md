# Spec 10A: Settings + AvatarPickerModal + 3 Modals

**Master Plan Reference:** Direction document at `_plans/direction/settings-insights-2025-05-05.md` is the locked decision set for the Settings/Insights cluster. Recon at `_plans/recon/settings-insights-2026-05-05.md` is the source of truth for current line numbers, tab-implementation structure, `text-primary` / `bg-primary` / `font-script` audit results, severity color usage inventory, and the Bible-data leak finding in the delete account flow. Spec 10A is the **first sub-spec** of the Settings/Insights cluster — it establishes cluster patterns (active-state muted-white, severity color system migration, white-pill primary CTA migrations, URL-backed tab state) that Spec 10B (Insights surfaces) will consume. Specs 1A–9 (everything from Daily Hub foundation through AskPage) are prerequisites — all merged into the working branch at the time of writing.

This is a **large spec**. ~2,000 LOC of source edits + ~1,400 LOC of test updates spread across 10 production files and 9 test files. The work is broad rather than deep: ten distinct migration changes (tab pattern unification, URL-backed active state, active-state styling across 5 sites, 5 `text-primary` text-button migrations to `text-violet-300`, 4 `bg-primary` solid CTA migrations to canonical white-pill primary, 3 `font-script` span removals, severity color system migration across 5+ sites, Bible-data leak fix in `handleDeleteConfirm`, `aria-modal` addition on DeleteAccountModal, and the AvatarPickerModal chrome migration deferred from Spec 6D) all applied to the same Settings shell + 10 section components + 3 modals. Patterns this spec USES (already shipped via Specs 1A–9): `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` hero (canonical inner-page pattern — Friends, Grow, MyPrayers all use it), white-pill primary CTA Pattern 2 per `09-design-system.md`, Subtle Button variant, severity color system per `09-design-system.md`, Daily Hub / AskPage URL-backed tab pattern via `useSearchParams`, Bible / Daily Hub canonical tab active state (`bg-white/15 text-white`), arrow-key roving on `RadioPillGroup` and `TimeRangePills`, the `useSettings()` hook (cross-tab synced via `storage` event), and `useFocusTrap()` canonical modal helper. Patterns this spec INTRODUCES at the cluster level: none — 10A is pure pattern application across the Settings surface. Patterns this spec MODIFIES: Settings tab semantics (mobile tablist + desktop nav → unified tablist with arrow-key roving), Settings tab state (local `useState` → URL-backed via `useSearchParams`), Settings active-state styling across 5 sites, 5 `text-primary` text buttons (WCAG AA contrast fix), 4 `bg-primary` solid CTA buttons, 3 `font-script` spans, the severity color system across DeleteAccount/ChangePassword/Notifications/AvatarPicker error states, AvatarPickerModal focus-on-open destination, AvatarPickerModal tab button height, and the `handleDeleteConfirm` localStorage prefix sweep.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/settings-insights-2026-05-05.md`, `_plans/direction/settings-insights-2025-05-05.md`) are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/settings` — default tab is Profile when no `?tab=` parameter is present or when the parameter value is invalid. Mobile renders a horizontal tablist above the panel; desktop renders a vertical sidebar tablist on the left. Both contexts use `role="tab"` inside `role="tablist"` parents after this spec; the prior `<nav role="navigation">` desktop wrapper is eliminated. The `<h1>` no longer wraps "Settings" inside `<span class="font-script">` — the parent `GRADIENT_TEXT_STYLE` already supplies emphasis. Atmospheric layer (`bg-dashboard-dark` body root + `ATMOSPHERIC_HERO_BG` hero) is preserved exactly per Direction Decision 1.
- `/settings?tab=profile` — Profile section (avatar, display name, bio). The "Change avatar" text button migrates from `text-primary` / `text-primary-lt` to `text-violet-300` / `text-violet-200` (WCAG AA contrast fix). All other Profile section behavior (display name save, bio truncation, avatar mount) is preserved exactly.
- `/settings?tab=dashboard` — Dashboard customization section. Verification only — no code changes. Customize / Reset buttons render normally. Atmospheric pattern preserved.
- `/settings?tab=notifications` — Notifications section. The "Send test notification" CTA migrates from a slightly-undersized white pill (`px-6 py-2`) to the canonical white-pill primary CTA Pattern 2 (`px-8 py-3.5`). Status indicators "✓ Notifications enabled" (currently `text-success` raw class) and "✗ Notifications blocked" (currently `text-danger` raw class) migrate to severity color system canonical class strings per `09-design-system.md`. BB-41 push integration internals (`fireTestNotification`, `subscribeToPush`, the daily verse native `<input type="time">` time picker, the notification preference toggles) are preserved exactly.
- `/settings?tab=privacy` — Privacy section (blocked users, muted users). The Unblock and Unmute text buttons migrate from `text-primary` to `text-violet-300`. The `bg-primary/20` decorative tints on the initial avatar circles for blocked / muted users are preserved per Decision 11 (categorical signals, not CTAs).
- `/settings?tab=account` — Account section (email, password, delete account). The Change Email and Change Password text buttons migrate from `text-primary` to `text-violet-300`. The Delete Account trigger button migrates from `bg-red-500/20 text-red-400` to canonical severity muted-destructive (`bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`). The Cancel button is verified as already-canonical secondary chrome.
- `/settings?tab=app` — App section (PWA install affordance, app version, etc.). Verification only — no code changes per Direction scope. PWA install affordance renders normally.
- `/settings?tab=<invalid-value>` — defaults to Profile (invalid params do not crash the page; they fall through the `VALID_SECTIONS` guard).
- `/settings` (any tab) → AvatarPickerModal opens via the Profile section's "Change avatar" affordance. Full chrome migration per Direction Decision 14: Save buttons (Presets tab + Upload tab) migrate from `bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90` to canonical white-pill primary CTA. Tab buttons bump from `py-2 px-4` (≈ 36-40px height) to `min-h-[44px]` for touch-target compliance. Active Tab/Upload tab background bumps from `bg-white/10` to `bg-white/15` per Direction Decision 2. Photo error messages migrate from `text-red-400 text-center` to severity system colors. Focus-on-open destination changes from the close X button to the currently-selected avatar preset (Presets tab) or the Choose File button (Upload tab). Preserved exactly per Decision 11 / Decision 14: `ring-primary` selection rings, container chrome (`bg-hero-mid border border-white/15`), drag-drop zone (`border-2 border-dashed border-white/20`), `animate-dropdown-in` (canonical BB-33), `useFocusTrap`, click-outside dismiss, Escape dismiss, `aria-modal="true"`, `aria-labelledby="avatar-picker-title"`, the Save callback signature `(avatarId, avatarUrl?) → onUpdateProfile`.
- `/settings?tab=account` → ChangePasswordModal opens via the Change Password text button. Full chrome migration per Direction Decision 15: the Update password submit button migrates to canonical white-pill primary CTA. The 3 password input class strings align to the RegisterPage / AuthModal canonical chrome (`bg-white/5 border border-white/15 ...`). Validation timing changes — the `newTooShort` and `confirmMismatch` calculations promote to error red ONLY on blur (not on every keystroke); during typing or while empty/focused, "Use at least 8 characters" displays as a non-error help hint (`text-white/60`). Field error colors migrate from `text-red-400` to severity system (likely `text-red-100` on appropriate background). Form-level error messaging (CURRENT_PASSWORD_INCORRECT, PASSWORDS_MUST_DIFFER, CHANGE_PASSWORD_RATE_LIMITED, generic) is preserved exactly. The `aria-invalid` / `aria-describedby` / `role="alert"` wiring on the error-promotion path is preserved. The Cancel button is verified as already-canonical secondary. The `changePasswordApi` call site and error-mapping logic are preserved.
- `/settings?tab=account` → DeleteAccountModal opens via the Delete Account trigger. Full chrome migration per Direction Decision 16. The Delete Everything CTA migrates from saturated `bg-red-500 text-white hover:bg-red-600` to muted destructive (`bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`). `aria-modal="true"` is added (currently missing per recon Part 11). An `<AlertTriangle>` icon (`aria-hidden="true"`, `text-red-300`, `h-5 w-5`) renders before the heading text in a `flex items-center gap-3` row. The "We'll miss you" copy is preserved (emotionally honest, intentional). `role="alertdialog"`, `aria-labelledby`, `aria-describedby`, `useFocusTrap` are preserved. The behavioral fix (Bible-data localStorage prefix sweep) lives inside `handleDeleteConfirm` — see Functional Requirement #6 for the exact `DELETE_PREFIXES` const and the keys it must clear.

The single non-route effect: 9 test files (`pages/__tests__/Settings.test.tsx`, `components/settings/__tests__/{ProfileSection,AccountSection,PrivacySection,NotificationsSection,RadioPillGroup,DeleteAccountModal,ChangePasswordModal}.test.tsx`, `components/shared/__tests__/AvatarPickerModal.test.tsx`) get class-string assertions migrated, new tab-pattern + URL-state tests added, new arrow-key roving tests added, new aria-modal + focus-on-open assertions added, new Bible-data-sweep assertions added, and validation-timing tests refactored from keystroke-real-time to blur-promoted. Behavioral assertions (toggle wiring, push permission flow, validation flows, modal behaviors, delete sequence sign-out + navigation, ChangePasswordModal `changePasswordApi` call + error mapping, AvatarPickerModal Save callback signature) are preserved.

---

## Overview

Settings and Insights are the last two top-level surfaces in the app that haven't fully adopted the canonical Round 3 / Round 4 visual patterns. Spec 10A focuses on the Settings shell and its three modals (AvatarPickerModal, ChangePasswordModal, DeleteAccountModal); Spec 10B will follow with the Insights work. 10A is sequenced first because every cluster pattern it establishes — active-state muted-white styling, severity color system migration, white-pill primary CTA migrations, URL-backed tab state — is a pattern Spec 10B will consume. Shipping 10A first means 10B is mechanical pattern application against an already-canonical Settings precedent, rather than two specs negotiating cluster patterns in parallel.

The work in 10A is broad-but-mechanical. It does not introduce new visual primitives, new auth gates, new copy, new architecture, or new behavior. Every change is one of: (a) replacing one Tailwind class string with another already-shipped Tailwind class string from the design system, (b) restructuring an `aria-*` attribute set or DOM hierarchy to match a documented accessibility pattern, (c) moving from keystroke-real-time validation to blur-promoted validation in line with the Spec 7 auth-canonical pattern, or (d) replacing a `useState` tab-state hook with a `useSearchParams` URL-backed equivalent matching the Daily Hub / AskPage precedent. The one behavioral change is in `handleDeleteConfirm`: the localStorage sweep is widened to cover the Bible-namespaced keys (`bible:*`, `bb*-v1:*`) that were missed when the original delete handler shipped before the Bible wave introduced those storage namespaces. This is a privacy bug fix — when a user deletes their account today, their Bible bookmarks, notes, journal entries, memorization cards, plans state, AI cache, and audio cache survive. After 10A, all four Bible-namespaced prefix families are cleared as part of the "all your Worship Room data" sweep.

The atmospheric layer is preserved per Direction Decision 1: `bg-dashboard-dark` body root and `ATMOSPHERIC_HERO_BG` hero stay exactly as they are. No `BackgroundCanvas`, no `HorizonGlow`, no `GlowBackground` is introduced — those are canonical for the Round 3 hero pattern, but the inner-page atmospheric pattern (which Settings shares with Friends, Grow, MyPrayers) is the right home for Settings, not the hero pattern. The ToggleSwitch's `bg-primary` on-state is preserved per Direction Decision 3 (state indicators warrant high-saturation distinction; native OS toggle convention; the active-state migration to muted-white applies to tab/pill active states, not toggle on-states). The `ring-primary` selection rings on AvatarPickerModal preset thumbnails are preserved per Decision 11 (selection chrome on a thumbnail grid, not a CTA chrome). The `bg-primary/20` decorative tints on the blocked-/muted-user initial avatars in PrivacySection are preserved per Decision 11 (categorical signals, not CTAs — same precedent as the Bible cluster's decorative preservations under Decision 11). The AvatarPickerModal container chrome (`bg-hero-mid border border-white/15`), drag-drop zone (`border-2 border-dashed border-white/20`), and `animate-dropdown-in` (canonical BB-33 animation token) are all preserved.

The behavioral semantics that must NOT change in this spec: the BB-41 push permission flow, the `subscribeToPush` call site, the `fireTestNotification` call site, the daily verse time picker (native `<input type="time">`), the `useSettings()` hook + cross-tab `storage` event sync, the `services/settings-storage.ts` storage discipline, every ToggleSwitch's Enter-key handler and click handler, every section-level handler (display name save, bio truncation, etc.), the DeleteAccountModal's delete-sequence sign-out + navigation logic (only the chrome and the `DELETE_PREFIXES` const change — the post-delete sign-out, navigate, and toast logic is byte-for-byte preserved), the ChangePasswordModal's `changePasswordApi` call + error mapping (only the chrome and the validation-timing logic change), and the AvatarPickerModal's Save callback signature `(avatarId, avatarUrl?) → onUpdateProfile`. After 10A ships, every documented chrome pattern listed in Acceptance Criteria below has been applied; every documented behavioral preservation is intact; every documented out-of-scope item is untouched.

The cluster pattern this spec ships forward to 10B: the Settings tab unification (mobile tablist + desktop nav → unified `role="tab"`-everywhere with URL-backed state via `useSearchParams` and arrow-key roving) is precedent for Insights, which has a similar tab structure. The active-state class strings (`bg-white/15 text-white border-b-2 border-white/40` for horizontal context, `bg-white/15 text-white border-l-2 border-white/40` for vertical context) are precedent for Insights. The white-pill primary CTA Pattern 2 alignment is precedent for the eventual Insights surfaces' CTAs. The severity color system migration is precedent for any future Insights error-state or alert chrome.

---

## User Story

As a **logged-in user navigating to `/settings`** to update my display name, change my avatar, or adjust notification preferences, I want the page to feel visually consistent with the rest of the app. Today the tab active states use saturated `bg-primary` chrome while the rest of the cluster uses muted-white isolated-pill chrome; the Change avatar / Change Email / Change Password / Unblock / Unmute text buttons render in `text-primary` purple that fails WCAG AA contrast against the dark background; the AvatarPickerModal Save buttons and ChangePasswordModal Update button render as saturated purple solid-fill CTAs while the homepage Get Started / RegisterPage CTA / every other primary CTA in the app renders as a translucent white pill; and the DeleteAccountModal's Delete Everything button is alarmingly saturated red. After 10A, the tabs render with muted-white isolated-pill chrome matching the rest of the cluster, every text button uses violet-300 / violet-200 for accessible contrast, every primary CTA matches the canonical white pill, and every destructive action uses the severity color system's muted-destructive variant — consistent, accessible, and intentional rather than alarming.

As a **logged-in user who lands on `/settings?tab=privacy` from a deep link** (notification email, support article, or browser bookmark from a prior session), I want the page to render with the Privacy panel active, not Profile. Today, the Settings page uses `useState<SettingsSection>('profile')` and ignores any `?tab=` parameter, so deep links are functionally broken — the user lands on Profile and has to manually click Privacy. After 10A, the active section is URL-backed via `useSearchParams`. Deep links work. Refreshing the page persists the active tab. Clicking a tab updates the URL via `replace` (not `push`), so the back button doesn't accumulate tab-switch history.

As a **keyboard-only user navigating the Settings tab list**, I want canonical arrow-key roving behavior. Today, tab navigation requires Tab/Shift-Tab through every tab button (and through every interactive element between tabs); there's no Home/End shortcut to jump to first/last; arrow keys do nothing. After 10A, ArrowLeft / ArrowRight (mobile horizontal) and ArrowUp / ArrowDown (desktop vertical) navigate between tabs with wraparound; Home / End jump to first / last; `tabIndex` rovers (0 on the active tab, -1 on inactive tabs) so the Tab key moves out of the tablist after one keypress, and arrow keys handle within-tablist navigation — matching the canonical pattern that `RadioPillGroup` and `TimeRangePills` already use elsewhere in the app.

As a **logged-in user who decides to delete their account**, I want "all your Worship Room data" to actually mean all of it. Today, the delete sweep iterates only `wr_*` and `worship-room-*` prefixes, so my Bible bookmarks (`bible:bookmarks`), notes (`bible:notes`), journal entries (`bible:journalEntries`), memorization cards (`wr_memorization_cards` — already covered, but adjacent), reading plan progress (`bible:plans`), streak data (`bible:streak`), AI Explain/Reflect cache (`bb32-v1:explain:*`, `bb32-v1:reflect:*`), audio Bible cache (`bb26-v1:audioBibles`), continuous-playback preference (`bb29-v1:continuousPlayback`), and read-along preference (`bb44-v1:readAlong`) all survive the deletion. This is a privacy regression — when the Bible wave introduced the `bible:*` and `bb*-v1:*` prefix namespaces (post-original-delete-handler), nobody updated `handleDeleteConfirm`. After 10A, the `DELETE_PREFIXES` const includes `'wr_'`, `'worship-room-'`, `'bible:'`, and `'bb'` — and the sweep iterates `localStorage` and removes every key matching any of those prefixes. Unrelated keys (e.g., a third-party tool's `unrelated_key`) are preserved. The post-delete sign-out + navigation + toast logic is unchanged.

As a **screen-reader user opening the DeleteAccountModal**, I want the modal to announce itself as a modal dialog, not as a non-modal alert that happens to look like a dialog. Today, the modal uses `role="alertdialog"` and `aria-labelledby`/`aria-describedby` correctly, but it's missing `aria-modal="true"` (recon Part 11 finding). Some screen readers and assistive tech respect this attribute differently — without it, the user's screen reader may not announce the focus-trap / background-suppression behavior. After 10A, `aria-modal="true"` is on the dialog element, and an `<AlertTriangle aria-hidden="true">` icon renders before the heading text to provide a redundant visual severity cue (the icon is decoration; the screen-reader announcement is unchanged because of `aria-hidden`).

As a **mobile user opening the AvatarPickerModal on a touchscreen device**, I want the Presets / Upload tab buttons to clear the WCAG AA 44×44 minimum tap target. Today they render at `py-2 px-4` (~36–40px height), which is below the threshold. After 10A, they bump to `min-h-[44px]`, and the active tab background bumps from `bg-white/10` to `bg-white/15` to match the canonical active-state opacity used elsewhere in the cluster.

As a **logged-in user opening the AvatarPickerModal**, I want focus to land on something useful — either my currently-selected avatar (so I can confirm what's selected and tab-roving operates within the choice grid) or the Choose File button (if I'm on the Upload tab and ready to select a photo). Today, focus moves to the close X button when the modal opens — actively unhelpful, because the user almost never wants to close immediately. After 10A, focus moves to the currently-selected avatar preset (Presets tab) or the Choose File button (Upload tab). The other focus-trap behaviors (Escape dismiss, click-outside dismiss, Tab / Shift-Tab roving inside the modal) are preserved exactly.

As a **logged-in user typing in the ChangePasswordModal's New Password field**, I want the validation feedback to feel like a friendly hint, not a real-time correction. Today the modal calculates `newTooShort` and `confirmMismatch` on every keystroke, so a user mid-typing a 12-character password sees a red error message after their first character that disappears after their eighth — distracting and pressuring. After 10A, "Use at least 8 characters" displays as a non-error help hint (`text-white/60`) when the field is empty or focused, and only promotes to error red (severity system) on blur with a too-short value. `confirmMismatch` similarly only errors after blur of the confirm field. The `aria-invalid` / `aria-describedby` / `role="alert"` wiring on the error-promotion path is preserved — when the error does promote, screen readers announce it as expected.

As a **future spec author working on Insights (Spec 10B)** or another Round-4-pending surface, I want the cluster patterns established by 10A to be canonical and ready to reuse. After 10A, the Settings tab pattern (unified `role="tab"`-everywhere, URL-backed state, active-state muted-white styling, arrow-key roving) is canonical and the Insights tab structure can mirror it exactly. The white-pill primary CTA alignment, severity color system migration, and `font-script` removal patterns are all canonical and ready to apply against any other surface that hasn't migrated yet.

---

## Requirements

### Functional Requirements

1. **Settings tab pattern unification (Change 1 in the brief).** In `frontend/src/pages/Settings.tsx`, replace the dual-nav structure (mobile `<div role="tablist">` + desktop `<nav role="navigation">`) with a single semantic model where both contexts use `role="tab"` everywhere. The two contexts continue to render at different breakpoints (mobile horizontal tablist above the panel; desktop vertical sidebar tablist on the left), but both contexts contain `role="tab"` buttons inside `role="tablist"` parents. Eliminate the `<nav>` wrapper. Mobile tablist: `aria-orientation="horizontal"` (default; can omit). Desktop sidebar: `aria-orientation="vertical"`. Both contexts wire `aria-selected={activeSection === id}` and `aria-controls={`settings-panel-${id}`}` on each tab button.
2. **Settings URL-backed active state (Change 1b).** Replace `useState<SettingsSection>('profile')` with `useSearchParams`. Canonical implementation:

   ```tsx
   import { useSearchParams } from 'react-router-dom'

   const VALID_SECTIONS: SettingsSection[] = ['profile', 'dashboard', 'notifications', 'privacy', 'account', 'app']

   const [searchParams, setSearchParams] = useSearchParams()
   const tabParam = searchParams.get('tab')
   const activeSection: SettingsSection = (VALID_SECTIONS.includes(tabParam as SettingsSection) ? tabParam : 'profile') as SettingsSection

   const setActiveSection = (section: SettingsSection) => {
     setSearchParams({ tab: section }, { replace: true })
   }
   ```

   Each tab button's `onClick` calls `setActiveSection(id)`. Critical preservations: `key={activeSection}` on the active panel container (forces full remount on tab change — preserves the existing reset-state pattern); `aria-live="polite"` on the panel container.
3. **Settings active-state styling (Change 1c).** Mobile tablist active button uses `bg-white/15 text-white border-b-2 border-white/40`. Desktop sidebar active button uses `bg-white/15 text-white border-l-2 border-white/40`. Inactive buttons (both contexts) use `text-white/60 hover:text-white hover:bg-white/[0.06]`.
4. **Settings arrow-key roving (Change 1d).** Add a keyboard handler to each tab button: ArrowLeft / ArrowUp focuses previous tab (wrap to last on first); ArrowRight / ArrowDown focuses next tab (wrap to first on last); Home focuses first tab; End focuses last tab. `tabIndex={activeSection === id ? 0 : -1}` — only the active tab is in the tab order; arrow keys move focus within the tablist. For desktop sidebar (vertical orientation), ArrowUp/Down primary; ArrowLeft/Right also work for parity. For mobile tablist (horizontal orientation), ArrowLeft/Right primary; ArrowUp/Down also work for parity. If a shared keyboard-handler util exists (RadioPillGroup or TimeRangePills may export one), import and reuse it; otherwise factor the handler out to a small util colocated with Settings.tsx or inline it consistently across both contexts. Pre-execution recon Step 11 confirms which case applies.
5. **`font-script` removal in Settings.tsx h1 (Change 1e).** Remove the `<span class="font-script">Settings</span>` wrapper around the h1 heading text. Replace with plain `Settings`. The parent `GRADIENT_TEXT_STYLE` already provides emphasis. Acceptance check: the h1's outer element (with `id="settings-heading"`, `style={GRADIENT_TEXT_STYLE}`, etc.) is preserved exactly; only the inner `<span class="font-script">...</span>` wrapper is removed.
6. **`text-primary` text-button migration to violet-300 (Change 2 a–e).** In each of the 5 enumerated sites, replace `text-primary hover:text-primary-lt ...` with `text-violet-300 hover:text-violet-200 ...`. Preserve all other classes (sizing, layout, focus rings, touch-target compliance), `onClick` handlers, ARIA attributes, and button text content. Sites: ProfileSection.tsx Change avatar (line 107 area per recon), AccountSection.tsx Change Email (line 56 area), AccountSection.tsx Change Password (line 66 area), PrivacySection.tsx Unblock (line 151 area), PrivacySection.tsx Unmute (line 182 area). Pre-execution recon Step 5 captures exact line numbers and class strings as they exist on the working branch.
7. **`bg-primary` solid CTA migration to canonical white-pill primary (Change 3 a–d).** In each of the 4 enumerated sites, replace the `bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90` chrome (or the close variant in NotificationsSection's already-white-but-undersized button) with the canonical white-pill primary CTA Pattern 2 from `09-design-system.md`. The exact class string is captured during pre-execution recon Step 16; apply it verbatim. Critical preservations: `onClick` handlers, disabled-state logic (AvatarPickerModal Saves only when valid avatar selected; ChangePasswordModal Updates only when fields valid), accessible names (button text content), `min-h-[44px]` tap target. Sites: AvatarPickerModal Save (Presets tab, line 346 area), AvatarPickerModal Save / Use This Photo (Upload tab, line 418 area), ChangePasswordModal Update password (line 176 area), NotificationsSection Send test notification (line 238 area — bumps padding from `px-6 py-2` to canonical `px-8 py-3.5`).
8. **Severity color system migration (Change 4 a–e).** Apply Direction Decision 7 to all enumerated sites. (a) DeleteAccountModal Delete Everything button: `bg-red-500 text-white hover:bg-red-600` → `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`. Preserve `onClick`, ARIA, button text content, `min-h-[44px]`. (b) AccountSection Delete Account trigger: `bg-red-500/20 text-red-400` → canonical severity muted-destructive (same class as 4a). (c) NotificationsSection severity raw classes at lines 55 and 62 area: `text-success` → severity success canonical class; `text-danger` → severity danger canonical class. Exact class strings come from `09-design-system.md` § "Severity color system" via pre-execution recon Step 15. (d) ChangePasswordModal `text-red-400` field-level and form-level error messages → severity system (likely `text-red-100` per recon recommendation; verify exact pattern during execution). (e) AvatarPickerModal `text-red-400 text-center` photo error inline messages → severity system (same pattern as 4d).
9. **`RadioPillGroup` selected pill active state (Change 5).** In `frontend/src/components/settings/RadioPillGroup.tsx` line 55 area, migrate the selected pill class string from `bg-primary/20 text-primary-lt` to `bg-white/15 text-white border border-white/30` per Direction Decision 2 muted-white isolated-pill variant. Preserve all other props, `onClick` handlers, `role="radio"`, `aria-checked`, and `tabIndex` roving.
10. **Delete account Bible-data leak fix in `handleDeleteConfirm` (Change 6).** During pre-execution recon Step 8, locate the `handleDeleteConfirm` function body — it likely lives in `AccountSection.tsx` or `DeleteAccountModal.tsx`. In that file, define the prefix list at the top of the function (or as a module-level const if cleaner):

    ```tsx
    const handleDeleteConfirm = () => {
      const DELETE_PREFIXES = [
        'wr_',           // Worship Room core (existing)
        'worship-room-', // Worship Room legacy (existing)
        'bible:',        // Bible reactive stores (NEW — Spec 10A fix)
        'bb',            // Bible AI/audio cache (NEW — bb26-, bb29-, bb32-, bb44-)
      ]

      const keysToDelete: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && DELETE_PREFIXES.some(prefix => key.startsWith(prefix))) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key))

      // ... existing post-delete navigation / sign-out logic
    }
    ```

    Preserve the existing post-delete logic (sign out, navigate, toast, etc.) exactly. Verify the prefix sweep covers every Bible-namespaced key documented in `.claude/rules/11b-local-storage-keys-bible.md`: `bible:bookmarks`, `bible:notes`, `bible:journalEntries`, `bible:plans`, `bible:streak`, `bible:streakResetAcknowledged` (covered by `'bible:'` prefix); `bb26-v1:audioBibles`, `bb29-v1:continuousPlayback`, `bb32-v1:explain:*`, `bb32-v1:reflect:*`, `bb44-v1:readAlong` (covered by `'bb'` prefix); `wr_bible_*` keys, `wr_chapters_visited`, `wr_memorization_cards`, `wr_chat_feedback` (covered by `'wr_'` prefix already). Pre-execution recon Step 9 audits the canonical list; if any Bible-namespaced key uses a prefix outside `'bible:'`, `'bb'`, or `'wr_'`, add it to `DELETE_PREFIXES`.
11. **DeleteAccountModal a11y polish (Change 7).** In `frontend/src/components/settings/DeleteAccountModal.tsx` lines 22–26 area, add `aria-modal="true"` to the `role="alertdialog"` element. Preserve `aria-labelledby`, `aria-describedby`, and `useFocusTrap`. Add an `<AlertTriangle>` icon (or `<AlertCircle>` — pick whichever is consistent with other alertdialog uses in the codebase; pre-execution recon resolves this) before the heading text. Wrap the heading row in `flex items-center gap-3`. The icon carries `aria-hidden="true"`, `className="h-5 w-5 text-red-300"`. The heading text and `id="delete-account-heading"` are preserved exactly. The "We'll miss you" copy is preserved (emotionally honest, intentional).
12. **ChangePasswordModal alignment with Spec 7 auth canonical (Change 8 b–d).** (b) Form field input chrome: align the 3 password input class strings to RegisterPage / AuthModal canonical chrome — `bg-white/5 border border-white/15 ...` per the pattern verified at the Spec 7 canonical site during execution. (c) Validation timing: change `newTooShort` and `confirmMismatch` from real-time-on-every-keystroke to blur-promoted. Display "Use at least 8 characters" as a non-error help hint (`text-white/60`) when newPassword is empty or while focused. Promote to error red (severity color system per requirement 8d) only on blur with a too-short value. `confirmMismatch` similarly only errors after blur of the confirm field. Preserve `aria-invalid` + `aria-describedby` + `role="alert"` wiring on the error-promotion path. (d) Verify Cancel button is already canonical secondary (likely the case; verify during execution and report if not).
13. **AvatarPickerModal full chrome migration (Change 9 b–d).** (b) Tab buttons (lines 198 + 210 area): bump from `py-2 px-4` to `min-h-[44px]` (or `py-2.5` plus current padding to clear 44px). Preserve `aria-selected`, `role="tab"`, and Tab-key behavior. (c) Active Tab/Upload tab background: bump from `bg-white/10` to `bg-white/15` per Direction Decision 2. (d) Focus-on-open destination: change from the close X button to the currently-selected avatar preset (Presets tab) or the Choose File button (Upload tab). If `useFocusTrap` exposes an initial-focus-target prop, use it; otherwise implement post-mount focus via `useEffect` with `setTimeout(0)` to focus the selected avatar's `<button>` element after modal mount. Preserve all other focus-trap behaviors (Escape dismiss, click-outside dismiss, Tab / Shift-Tab roving inside the modal). Preserve `ring-primary` selection rings (lines 261 + 311 — Decision 11), container chrome (`bg-hero-mid border border-white/15`), drag-drop zone (`border-2 border-dashed border-white/20`), `animate-dropdown-in` (canonical BB-33), `aria-modal="true"`, `aria-labelledby="avatar-picker-title"`.
14. **ToggleSwitch on-state preservation (Change 10a — comment-only).** In `frontend/src/components/settings/ToggleSwitch.tsx` line 43 area, add a code comment documenting Direction Decision 3 immediately before the `bg-primary` on-state class. Suggested comment:

    ```tsx
    // Toggle on-state uses bg-primary per Spec 10A Direction Decision 3.
    // State indicators warrant high-saturation distinction; native OS toggle convention.
    ```

    No code changes. The `bg-primary` on-state class string is preserved exactly. `role="switch"`, `aria-checked`, and the Enter-key handler are preserved.
15. **Tests update (Changes 1f, 2f, 3e, 4f, 5a, 6d, 7c, 8f, 9g).** Update class-string assertions across 9 test files to match the post-migration chrome. Settings.test.tsx adds tab-pattern + URL-state tests (deep-link to `/settings?tab=notifications` lands on Notifications panel; clicking a tab updates URL via replace, not push), arrow-key roving tests (ArrowLeft/Right + ArrowUp/Down navigate tabs; Home/End jump to first/last; tabIndex roving), font-script absence assertion, and active-state class assertions for both contexts. Section tests update text-button class-string assertions (`text-primary` / `text-primary-lt` → `text-violet-300` / `text-violet-200`). Modal tests update CTA chrome assertions (white-pill primary canonical), severity color migrations, and (DeleteAccountModal specifically) the new `aria-modal` assertion + the icon-plus-text heading assertion. ChangePasswordModal tests update validation-timing tests (blur vs keystroke) + chrome migration + error color migrations. AvatarPickerModal tests update Save button chrome + tab button `min-h-[44px]` + active tab `bg-white/15` + focus-on-open assertion (selected avatar / Choose File, not close X) + ring-primary selection ring tests still pass + container + drag-drop + animation tests still pass. AccountSection / DeleteAccountModal tests add Bible-data-sweep tests (setting `localStorage.setItem('bible:bookmarks', '[]')` then triggering delete clears it; `bb32-v1:explain:abc` → `{}` clears; `wr_bible_progress` → `{}` clears via existing wr_ path; `unrelated_key` is preserved). RadioPillGroup test (verify file exists; if absent, add a smoke test for the new chrome) updates the selected-pill class assertion. Where a test currently uses class-string-coupled queries to find a button, prefer migration-resilient `getByRole('button', { name: ... })` / `getByRole('link', { name: ... })` queries.
16. **No new localStorage keys.** This spec does not introduce any new `wr_*` or `bible:*` or `bb*-v1:*` storage keys. All key writes / reads are preserved exactly.
17. **Type safety (`pnpm typecheck` passes).** All type contracts hold after the migrations. The `useSearchParams` migration's `setSearchParams({ tab: section }, { replace: true })` invocation is type-safe per `react-router-dom`'s public API.

### Non-Functional Requirements

- **Performance.** No measurable change. The migrations are class-string / DOM-hierarchy / `useState` → `useSearchParams` / validation-timing-only edits. No new React Suspense boundaries, no new lazy imports beyond what's already in the bundle, no new effect dependencies that re-run on every render. The `useSearchParams` hook is already in the bundle (Daily Hub and AskPage use it). The `Button` primitive (via the white-pill canonical) is already in the bundle. Bundle size: zero delta within rounding error.
- **Accessibility (WCAG 2.2 AA).** Settings tab list gains arrow-key roving + Home/End + `tabIndex` roving (improvement). DeleteAccountModal gains `aria-modal="true"` (improvement). AvatarPickerModal tab buttons gain `min-h-[44px]` 44×44 minimum tap target (improvement). AvatarPickerModal focus-on-open lands on a useful destination instead of close X (improvement). All 5 `text-violet-300` / `text-violet-200` migrations meet WCAG AA contrast against the dark background (improvement over the pre-migration `text-primary` / `text-primary-lt` which fail per recon). Severity color system migrations (e.g., `text-red-100` on `bg-red-950/30 border border-red-400/30`) meet WCAG AA contrast per the canonical opacity table in `09-design-system.md`. ChangePasswordModal validation-timing change (blur-promoted vs keystroke-real-time) reduces error-fatigue without compromising the screen-reader announcement path — `aria-invalid` + `aria-describedby` + `role="alert"` wiring is preserved on the error-promotion path. ToggleSwitch's `role="switch"`, `aria-checked`, and Enter-key handler are preserved. RadioPillGroup's `role="radiogroup"` + `role="radio"` + `aria-checked` are preserved. The `font-script` removal does not affect accessibility (the heading text, `id`, and gradient style are all preserved — only the inner span wrapper is removed).
- **Lighthouse targets unchanged.** Performance 90+, Accessibility 95+, Best Practices 90+, SEO 90+ on `/settings` and its query-parameter variants. The migrations should improve Accessibility marginally (touch targets, contrast, modal semantics) but should not degrade any other metric.
- **No new copy.** Every user-facing string is preserved exactly. "Settings" heading. "Change avatar", "Change Email", "Change Password", "Unblock", "Unmute", "Send test notification", "Update password", "Delete Account", "Delete Everything", "We'll miss you", "Use at least 8 characters", "Cancel". All section headings (Profile, Dashboard, Notifications, Privacy, Account, App). All toggle labels. All `aria-label` strings. The form-level error messages in ChangePasswordModal (CURRENT_PASSWORD_INCORRECT, PASSWORDS_MUST_DIFFER, CHANGE_PASSWORD_RATE_LIMITED, generic). No copy review needed.
- **No backend changes.** This is a frontend-only spec. No API contracts change. No database migrations. No environment variables added or modified. No new endpoints touched.

---

## Auth Gating

`/settings` is auth-gated as a route — logged-out users are redirected to `/` per the existing `Settings.tsx` mount-time auth check. This spec does NOT touch the route-level auth gate or the `simulateLegacyAuth` / `wr_auth_simulated` flow. Inside the page (logged-in user), every action is implicitly authenticated; no additional auth modals are introduced.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|--------------------|
| Navigate to `/settings` | Redirected to `/` (existing behavior — no change) | Settings page renders with default `tab=profile` (or URL-specified tab) | N/A — route-level redirect, no modal |
| Navigate to `/settings?tab=<any>` | Redirected to `/` (existing behavior) | Settings page renders with the specified tab (or `profile` if invalid) | N/A |
| Click any tab button | N/A — page not reachable | Active section switches; URL updates via `replace`; panel remounts via `key={activeSection}` | N/A |
| Click "Change avatar" | N/A | AvatarPickerModal opens; focus lands on currently-selected avatar (Presets) or Choose File (Upload) | N/A |
| Click "Change Email" | N/A | (Existing modal flow — unchanged by this spec) | N/A |
| Click "Change Password" | N/A | ChangePasswordModal opens; focus-trap engaged | N/A |
| Click "Unblock" / "Unmute" | N/A | (Existing handler — unchanged by this spec) | N/A |
| Click "Send test notification" | N/A | `fireTestNotification` invoked (existing wiring — unchanged) | N/A |
| Click "Delete Account" trigger | N/A | DeleteAccountModal opens; focus-trap engaged; aria-modal=true | N/A |
| Click "Delete Everything" inside DeleteAccountModal | N/A | `handleDeleteConfirm` runs: sweeps all `wr_*`, `worship-room-*`, `bible:*`, `bb*` localStorage keys; signs out; navigates to `/`; toast | N/A |
| Toggle any ToggleSwitch | N/A | Toggle state flips; `useSettings()` writes to `services/settings-storage.ts`; cross-tab sync via `storage` event | N/A |
| Adjust any RadioPillGroup or TimeRangePills selection | N/A | Selection updates; cross-tab sync | N/A |

This spec introduces zero new auth gates. The existing route-level redirect for logged-out users is preserved. The auth modal pattern (`useAuthModal()`) is not invoked by any Settings action.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Tab list renders above the panel as a horizontal `role="tablist"` with `aria-orientation="horizontal"`. Active tab uses `bg-white/15 text-white border-b-2 border-white/40`. Inactive tabs use `text-white/60 hover:text-white hover:bg-white/[0.06]`. Arrow-key roving: ArrowLeft / ArrowRight primary, ArrowUp/Down also work for parity. Active panel renders below the tablist, full-width. Modals (AvatarPicker, ChangePassword, DeleteAccount) render as full-screen modals or centered cards depending on each modal's existing responsive layout (this spec does not change modal layout — only chrome). AvatarPickerModal preset grid adapts to viewport width per its existing layout. Tab buttons inside AvatarPickerModal clear `min-h-[44px]` (post-migration). |
| Tablet (640–1024px) | Same horizontal tablist as mobile (the desktop sidebar pattern is gated by a `lg:` breakpoint in the existing Settings.tsx layout — pre-execution recon confirms the exact breakpoint). Panel below the tablist. The tablist's full-width vs. content-width sizing follows the existing layout pattern (preserved). |
| Desktop (≥ 1024px or wherever the existing `lg:` breakpoint sits) | Tab list renders as a vertical sidebar `role="tablist"` with `aria-orientation="vertical"` on the left. Active tab uses `bg-white/15 text-white border-l-2 border-white/40`. Arrow-key roving: ArrowUp / ArrowDown primary, ArrowLeft/Right also work for parity. Panel renders to the right of the sidebar. The atmospheric layer (`bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG`) renders behind both. |

Both contexts wire `tabIndex={activeSection === id ? 0 : -1}` for the roving-focus pattern. Both contexts wire `aria-selected={activeSection === id}` and `aria-controls={`settings-panel-${id}`}` on each tab button. The active panel container has `key={activeSection}` (forces full remount on tab change) and `aria-live="polite"` (announces to screen readers when content updates).

The existing breakpoint thresholds in `Settings.tsx` (mobile horizontal tablist vs desktop sidebar) are preserved exactly. This spec does not introduce new breakpoints; it preserves the existing ones and applies the unified semantic model + active-state styling at each.

Touch-target compliance: every interactive element this spec migrates clears WCAG AA 44×44 minimum tap target. The 5 `text-violet-300` text buttons preserve their existing sizing and surrounding clickable padding (verified during pre-execution recon Step 5). The 4 white-pill primary CTA migrations preserve `min-h-[44px]`. The DeleteAccountModal Delete Everything button preserves `min-h-[44px]`. The AvatarPickerModal Save buttons preserve `min-h-[44px]`. The AvatarPickerModal tab buttons gain `min-h-[44px]` (improvement — they didn't clear before).

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. Settings is configuration / preferences UI. The user-facing free-text inputs (display name, bio in ProfileSection; new password, confirm password in ChangePasswordModal; the change-email flow's new email field) are validated for format / length / business rules, but they are not user-content authoring surfaces and do not flow into AI features. The DeleteAccountModal does have a confirmation typing affordance ("type DELETE to confirm" or similar — pre-execution recon confirms the exact pattern), but that's a literal-string match, not a free-text input that requires crisis detection.

The only adjacent free-text concern: the BB-41 push notification preference's daily-verse time-picker (`<input type="time">`) is a structured time input, not free text. The notification-preference toggles are boolean state. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** `/settings` is auth-gated as a route — logged-out users are redirected to `/` per the existing `Settings.tsx` mount-time auth check. No demo-mode behavior; the page is not reachable for logged-out users. This spec does NOT touch the route-level auth gate. (Demo-mode zero-persistence applies to other surfaces — Daily Hub, Bible reader, Prayer Wall reading, Local Support, etc. — but not to Settings, which is account-scoped by definition.)
- **Logged-in users:** All Settings state writes flow through `services/settings-storage.ts` (via the `useSettings()` hook). The hook exposes a cross-tab synced state via the browser's `storage` event — when one tab writes, other open tabs in the same browser refresh. This spec does NOT touch `useSettings()`, `services/settings-storage.ts`, or the cross-tab sync logic. Every preserved behavior listed in the Overview is byte-for-byte preserved.
- **localStorage usage (read):** `useSettings()` reads from its existing storage key (per `services/settings-storage.ts`). The `handleDeleteConfirm` function reads `localStorage.length` and iterates `localStorage.key(i)` to find keys matching the prefix list. No other localStorage reads are added by this spec.
- **localStorage usage (write):** `useSettings()` writes via its existing storage discipline (preserved exactly). The `handleDeleteConfirm` function calls `localStorage.removeItem(key)` for every matching key (the only behavior-changing write in this spec — the prefix list expands from `wr_*` + `worship-room-*` to `wr_*` + `worship-room-*` + `bible:*` + `bb*`). No new localStorage keys are introduced. Specifically, the existing `wr_first_run_completed`, `wr_user_name`, `wr_user_id`, `wr_auth_simulated`, `wr_jwt_token`, all the keys documented in `.claude/rules/11-local-storage-keys.md`, and all the keys documented in `.claude/rules/11b-local-storage-keys-bible.md` are unchanged in shape and unchanged in write semantics — only the delete-account sweep covers a wider prefix set.
- **URL state:** The active tab is now URL-backed via `useSearchParams` (`?tab=` parameter). Default value is `profile` when no parameter or invalid parameter. Tab clicks update the URL via `replace` (not `push`), so the back button doesn't accumulate tab-switch history. URL state is browser-history; there's no localStorage / sessionStorage component to the tab state.

---

## Completion & Navigation

N/A — Settings is not part of the Daily Hub tabbed completion-tracking experience. Settings interactions (changing avatar, updating preferences, deleting account) do not signal to a completion tracker, do not award faith points, do not contribute to streaks, and do not have post-completion CTAs to switch tabs or visit other pages. The page's navigation surface is its tab list (Profile, Dashboard, Notifications, Privacy, Account, App), all of which are intra-page tabs rather than navigation to other routes.

The DeleteAccountModal's "Delete Everything" CTA does have a navigation component — after the localStorage sweep + sign-out, the user is navigated to `/` via the existing post-delete logic. This spec does NOT change that navigation logic — only the prefix sweep widens. The existing toast / notification flow on successful delete is preserved.

---

## Design Notes

This spec is pure pattern application against patterns already documented in `.claude/rules/09-design-system.md`. No new visual primitives are introduced. Reference the design system for canonical values:

- **White-pill primary CTA Pattern 2** — used by 4 CTA migrations in this spec (AvatarPickerModal Save × 2, ChangePasswordModal Update password, NotificationsSection Send test notification). Cross-reference: homepage Get Started button, RegisterPage hero CTA. Pre-execution recon Step 16 captures the exact class string from `09-design-system.md` § "White Pill CTA Patterns" Pattern 2; apply verbatim. The NotificationsSection button currently uses a close-but-undersized variant (`px-6 py-2`) — this spec bumps to canonical (`px-8 py-3.5`).
- **Severity color system** — used by 5+ migrations in this spec (DeleteAccountModal Delete Everything, AccountSection Delete Account trigger, NotificationsSection text-success / text-danger indicators, ChangePasswordModal field error colors, AvatarPickerModal photo error messages). Reference: `09-design-system.md` § "Severity color system" — muted-destructive variant is `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`; success and danger raw-class equivalents come from the same section. Pre-execution recon Step 15 captures the exact class strings.
- **Muted-white isolated pill / tab active state** — used by 5+ migrations in this spec (Settings mobile tablist active button, Settings desktop sidebar active button, AvatarPickerModal active tab background, RadioPillGroup selected pill, and any other internal pill / tab active state surfaced during pre-execution recon). Reference: `09-design-system.md` and Direction Decision 2. Mobile horizontal: `bg-white/15 text-white border-b-2 border-white/40`. Desktop vertical: `bg-white/15 text-white border-l-2 border-white/40`. RadioPillGroup isolated pill: `bg-white/15 text-white border border-white/30`.
- **Inactive-state styling** — used in tab list inactive buttons. Reference: `text-white/60 hover:text-white hover:bg-white/[0.06]`.
- **Atmospheric layer (preserved)** — `bg-dashboard-dark` body root + `ATMOSPHERIC_HERO_BG` hero. Same canonical inner-page pattern that Friends, Grow, MyPrayers use. Direction Decision 1 explicitly preserves this — do NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground`.
- **Subtle Button variant (verified, possibly preserved)** — used by AccountSection's Cancel buttons and ChangePasswordModal's Cancel button. Pre-execution recon verifies these are already canonical secondary chrome.
- **`useFocusTrap()` canonical modal helper** — preserved exactly in all 3 modals. AvatarPickerModal extends it with a custom initial-focus-target (the selected avatar / Choose File button) — if the helper exposes a prop for this, use it; otherwise implement post-mount focus via `useEffect` + `setTimeout(0)`.
- **`animate-dropdown-in` (canonical BB-33 animation token)** — preserved on AvatarPickerModal exactly.
- **`ring-primary` selection rings (Decision 11 preserve)** — preserved on AvatarPickerModal preset thumbnails exactly. These are selection chrome on a thumbnail grid, not CTA chrome.
- **`bg-primary/20` decorative tints (Decision 11 preserve)** — preserved on PrivacySection blocked-/muted-user initial avatar circles exactly. These are categorical signals, not CTAs.
- **`bg-primary` on-state on ToggleSwitch (Direction Decision 3 preserve)** — preserved exactly. A code comment is added to document the decision for future maintainers; no behavior or chrome change.
- **`useSearchParams` URL-backed tab state** — used by Daily Hub and AskPage. This is the canonical URL-backed tab pattern; mirror the precedent. Pre-execution recon Step 10 confirms which file already uses it; mirror the import path and usage.
- **Arrow-key roving navigation** — used by `RadioPillGroup` and `TimeRangePills`. This is the canonical arrow-key pattern. Pre-execution recon Step 11 reads one of those files to capture the keyboard-handler shape; either import a shared util (if one exists) or factor out a colocated util for Settings.tsx.
- **`text-violet-300` / `text-violet-200` text buttons** — Direction Decision 4. `text-violet-300` for normal state; `text-violet-200` for hover. Cross-reference: any existing canonical text-button site already using this pattern. This migration fixes WCAG AA contrast (the previous `text-primary` / `text-primary-lt` fail per recon).

No new visual patterns. No `[UNVERIFIED]` flags needed.

---

## Out of Scope

- **All Insights surfaces (Spec 10B's domain).** `/insights` and `/insights/monthly` chrome migrations, the `InsightsDataContext` wiring, the `TimeRangePills` integration into Insights, the chart-canvas chrome, the mood-heatmap chrome, the streak-display chrome — all live in 10B. 10A's only interaction with Insights is establishing the cluster patterns (active-state muted-white, severity color system, white-pill canonical, URL-backed tab state) that 10B will consume.
- **All non-Settings surfaces.** Bible cluster (BibleLanding, BibleBrowse, MyBiblePage, BibleReader, PlanBrowserPage, BiblePlanDetail, BiblePlanDay), Grow cluster, Daily Hub, Local Support cluster, Auth surfaces (RegisterPage, AuthModal, login flow), Dashboard, Friends, Leaderboard, Profile (`/profile/:userId`), Prayer Wall, Music cluster, AskPage — all already migrated in Specs 1A–9 and out of scope for 10A. Regression checks confirm none of these change.
- **Atmospheric layer migration.** Direction Decision 1 preserves `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG`. Do NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground` on Settings.
- **ToggleSwitch on-state migration.** Direction Decision 3 preserves `bg-primary` on-state. Only a code comment is added; no behavior or chrome change.
- **`ring-primary` selection rings on AvatarPickerModal.** Decision 11 preserve.
- **`bg-primary/20` decorative tints in PrivacySection.** Decision 11 preserve.
- **AvatarPickerModal container chrome migration** (`bg-hero-mid border border-white/15`). Preserve.
- **AvatarPickerModal drag-drop zone chrome migration** (`border-2 border-dashed border-white/20`). Preserve.
- **AvatarPickerModal `animate-dropdown-in`.** Canonical BB-33; preserve.
- **AppSection PWA install affordance migration.** Direction scope: verification only. No code changes.
- **DashboardSection Customize / Reset buttons migration.** Direction scope: verification only. No code changes.
- **"We'll miss you" delete copy.** Emotionally honest; preserve.
- **Notification preferences progressive disclosure.** Direction Decision 17 — Spec 10c.
- **Native time picker custom dropdown.** Spec 10c.
- **"(coming soon)" labeled chips for email options.** Spec 10c.
- **Spotify OAuth placeholder.** Direction Decision 19 — Phase 3.13 greenfield.
- **BB-41 push integration internals.** `fireTestNotification`, `subscribeToPush`, time-picker wiring, notification-preference toggle wiring, the `wr_push_subscription` and `wr_notification_prefs` localStorage keys — all preserved exactly.
- **`useSettings()` hook + cross-tab sync logic.** Preserved exactly.
- **`services/settings-storage.ts` storage discipline.** Preserved exactly.
- **`changePasswordApi` call + error mapping.** Preserved exactly. Only the chrome and validation timing change in ChangePasswordModal.
- **AvatarPickerModal Save callback signature** (`(avatarId, avatarUrl?) → onUpdateProfile`). Preserved exactly.
- **DeleteAccountModal post-delete sequence** (sign-out + navigation + toast). Preserved exactly. Only the prefix sweep widens.
- **All Forums Wave Phase 3 backend code.** No backend changes.
- **API surface, API contracts, OpenAPI spec, frontend type generation.** No API changes.
- **Database migrations / Liquibase changesets.** No backend changes.
- **Environment variables.** No env var additions or modifications.

---

## Acceptance Criteria

### Pre-execution recon (verification before code changes)

- [ ] All prior specs (1A–9) merged into the working branch. Verified via `git log` review or implicit working-branch state.
- [ ] Direction doc at `_plans/direction/settings-insights-2025-05-05.md` present (note: brief states `2026-05-05.md`; actual file uses `2025-05-05.md` — surface this discrepancy if it matters but use the on-disk path).
- [ ] Recon doc at `_plans/recon/settings-insights-2026-05-05.md` present.
- [ ] Settings.tsx tab implementation read at lines 64–115. Dual-nav structure confirmed (mobile tablist + desktop nav). Exact line numbers for active-state class strings captured.
- [ ] `text-primary` audit run on the 5 enumerated text buttons. Exact class strings + line numbers captured (line numbers may have drifted from recon).
- [ ] `bg-primary` solid CTA audit run on AvatarPickerModal, ChangePasswordModal, NotificationsSection. Exact class strings + line numbers + button text content captured.
- [ ] `font-script` span audit run on Settings.tsx. Exact JSX captured.
- [ ] `handleDeleteConfirm` function body located (likely AccountSection.tsx or DeleteAccountModal.tsx). Current prefix sweep logic + the keys it touches captured.
- [ ] localStorage Bible prefix audit run on `bible:` and `bb` prefixes across `lib/`, `hooks/`, `pages/`, `services/`. Canonical list of Bible-namespaced localStorage keys captured.
- [ ] `useSearchParams` import path confirmed available in codebase (Daily Hub or AskPage uses it).
- [ ] Tab keyboard nav reference patterns read from `RadioPillGroup.tsx` or `TimeRangePills.tsx`. Canonical arrow-key roving pattern captured.
- [ ] AvatarPickerModal mount + tests test file location read. Current test structure captured.
- [ ] DeleteAccountModal `aria-modal` missing attribute confirmed at lines 22–26.
- [ ] ChangePasswordModal current `newTooShort` and `confirmMismatch` calculation logic read. Keystroke-real-time confirmed.
- [ ] Severity color system canonical class strings read from `09-design-system.md` § "Severity color system". muted-destructive, success, danger class strings captured.
- [ ] White-pill primary CTA canonical class string read from `09-design-system.md` § "White Pill CTA Patterns" Pattern 2. Cross-referenced against homepage Get Started + RegisterPage hero CTA.
- [ ] Test baseline run: `pnpm install`, `pnpm typecheck`, `pnpm test`. Pre-migration pass/fail counts captured.
- [ ] Bible export overlap audit run on Settings.tsx + components/settings/*. No parallel export flow that overlaps with BibleSettingsModal (or, if found, reported before proceeding).

### Tab pattern unification (Change 1)

- [ ] Mobile and desktop both use `role="tab"` inside `role="tablist"` parents.
- [ ] No more `<nav role="navigation">` wrapper for desktop sidebar.
- [ ] `aria-selected` correctly reflects active state on each tab button.
- [ ] `aria-controls` correctly references panel id (`settings-panel-${id}`).
- [ ] Active panel `aria-live="polite"` preserved.
- [ ] Active panel `key={activeSection}` preserved (full remount on switch).
- [ ] URL state via `useSearchParams` — `?tab=` parameter is canonical.
- [ ] Default to `'profile'` when no `?tab=` param OR invalid param value.
- [ ] Refresh persists active tab.
- [ ] Deep-link to `/settings?tab=notifications` lands on Notifications panel.
- [ ] Clicking a tab updates URL via `replace` (not `push`), so back button doesn't accumulate tab-switch history.
- [ ] Arrow-key roving: ArrowLeft/Right + ArrowUp/Down navigate tabs (with wraparound).
- [ ] Home/End jump to first/last tab.
- [ ] `tabIndex` roving: `0` on active tab, `-1` on inactive tabs.
- [ ] Active tab styling matches Direction Decision 2 muted-white pattern. Mobile: `bg-white/15 text-white border-b-2 border-white/40`. Desktop: `bg-white/15 text-white border-l-2 border-white/40`.
- [ ] Inactive tab styling: `text-white/60 hover:text-white hover:bg-white/[0.06]` (both contexts).

### text-primary text button migrations (Change 2)

- [ ] ProfileSection Change avatar: `text-violet-300 hover:text-violet-200`.
- [ ] AccountSection Change Email: same.
- [ ] AccountSection Change Password: same.
- [ ] PrivacySection Unblock: same.
- [ ] PrivacySection Unmute: same.
- [ ] All other classes preserved (sizing, layout, focus rings, surrounding tap-target padding).

### bg-primary CTA migrations (Change 3)

- [ ] AvatarPickerModal Save (Presets tab): canonical white-pill primary CTA Pattern 2.
- [ ] AvatarPickerModal Save / Use This Photo (Upload tab): canonical white-pill primary CTA Pattern 2.
- [ ] ChangePasswordModal Update password: canonical white-pill primary CTA Pattern 2.
- [ ] NotificationsSection Send test notification: canonical white-pill primary CTA Pattern 2 with full padding alignment (`px-8 py-3.5`, not `px-6 py-2`).
- [ ] All onClick handlers preserved.
- [ ] All ARIA + accessible names preserved.
- [ ] All `min-h-[44px]` preserved.
- [ ] AvatarPickerModal Save disabled-state logic preserved (saves only when valid avatar selected).
- [ ] ChangePasswordModal Update disabled-state logic preserved (Updates only when fields valid).

### Severity color system (Change 4)

- [ ] DeleteAccountModal Delete Everything button: muted destructive (`bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`).
- [ ] AccountSection Delete Account trigger button: canonical severity muted-destructive (same class as DeleteAccountModal Delete Everything).
- [ ] NotificationsSection `text-success` (✓ Notifications enabled) → severity success canonical class.
- [ ] NotificationsSection `text-danger` (✗ Notifications blocked) → severity danger canonical class.
- [ ] ChangePasswordModal field-level + form-level error elements use `text-red-100` on appropriate severity-system background.
- [ ] AvatarPickerModal photo error inline messages use severity system.
- [ ] All `min-h-[44px]` preserved on buttons; all role/ARIA preserved.

### RadioPillGroup (Change 5)

- [ ] Selected pill: `bg-white/15 text-white border border-white/30`.
- [ ] Roving tabindex preserved.
- [ ] Arrow-key handler preserved.
- [ ] `role="radiogroup"` + `role="radio"` + `aria-checked` preserved.

### Delete account Bible-data sweep (Change 6)

- [ ] `DELETE_PREFIXES` const includes `'wr_'`, `'worship-room-'`, `'bible:'`, `'bb'`.
- [ ] Sweep iterates `localStorage` length and removes all matching keys.
- [ ] `bible:bookmarks` cleared.
- [ ] `bible:notes` cleared.
- [ ] `bible:journalEntries` cleared.
- [ ] `bible:plans` cleared.
- [ ] `bible:streak` cleared.
- [ ] `bible:streakResetAcknowledged` cleared.
- [ ] `bb32-v1:explain:*` cleared (any number of cached entries).
- [ ] `bb32-v1:reflect:*` cleared.
- [ ] `bb26-v1:audioBibles` cleared.
- [ ] `bb29-v1:continuousPlayback` cleared.
- [ ] `bb44-v1:readAlong` cleared.
- [ ] `wr_bible_*` keys cleared (existing `wr_` path preserved).
- [ ] `wr_chapters_visited` cleared (existing `wr_` path).
- [ ] `wr_memorization_cards` cleared (existing `wr_` path).
- [ ] `wr_chat_feedback` cleared (existing `wr_` path).
- [ ] Unrelated keys (no matching prefix, e.g., `unrelated_key`) preserved.
- [ ] Post-delete sign-out + navigation + toast logic preserved exactly.

### DeleteAccountModal a11y (Change 7)

- [ ] `aria-modal="true"` added.
- [ ] `<AlertTriangle>` (or `<AlertCircle>` consistent with codebase precedent) icon in heading row, `aria-hidden="true"`, `text-red-300`, `h-5 w-5`.
- [ ] Heading row wrapped in `flex items-center gap-3`.
- [ ] `role="alertdialog"` preserved.
- [ ] `aria-labelledby` + `aria-describedby` preserved.
- [ ] `useFocusTrap` preserved.
- [ ] "We'll miss you" copy preserved.
- [ ] Heading text and `id="delete-account-heading"` preserved exactly.

### ChangePasswordModal alignment (Change 8)

- [ ] Submit button: canonical white-pill primary (Change 3c covers chrome).
- [ ] Form field inputs aligned with RegisterPage / AuthModal canonical chrome (`bg-white/5 border border-white/15 ...`).
- [ ] newPassword length validation: blur-promoted, NOT keystroke-real-time.
- [ ] confirmPassword mismatch validation: blur-promoted.
- [ ] "Use at least 8 characters" help hint renders `text-white/60` before validation fires.
- [ ] Error promotion path uses severity system colors (`text-red-100` etc).
- [ ] `aria-invalid` + `aria-describedby` + `role="alert"` preserved on the error-promotion path.
- [ ] Cancel button verified as canonical secondary.
- [ ] Form-level error messaging preserved (CURRENT_PASSWORD_INCORRECT, PASSWORDS_MUST_DIFFER, CHANGE_PASSWORD_RATE_LIMITED, generic).
- [ ] `changePasswordApi` call site preserved.

### AvatarPickerModal (Change 9)

- [ ] Save buttons (Presets + Upload): canonical white-pill primary (Change 3a + 3b).
- [ ] Tab buttons: `min-h-[44px]`.
- [ ] Active Tab/Upload tab: `bg-white/15` (not `bg-white/10`).
- [ ] Focus-on-open: currently-selected avatar (Presets tab) or Choose File button (Upload tab), NOT close X.
- [ ] Photo error messages: severity system.
- [ ] `ring-primary` selection rings preserved (Decision 11).
- [ ] Container chrome (`bg-hero-mid border border-white/15`) preserved.
- [ ] Drag-drop zone (`border-2 border-dashed border-white/20`) preserved.
- [ ] `animate-dropdown-in` preserved.
- [ ] `useFocusTrap` preserved.
- [ ] Click-outside dismiss preserved.
- [ ] Escape dismiss preserved.
- [ ] `aria-modal="true"` preserved.
- [ ] `aria-labelledby="avatar-picker-title"` preserved.
- [ ] Save callback signature preserved (`(avatarId, avatarUrl?) → onUpdateProfile`).

### font-script removal

- [ ] `Settings.tsx` h1 no longer wraps "Settings" inside `<span class="font-script">`.
- [ ] `GRADIENT_TEXT_STYLE` on h1 preserved (parent emphasis).
- [ ] h1 outer element (`id="settings-heading"`, `style={GRADIENT_TEXT_STYLE}`, surrounding classNames) preserved exactly.

### ToggleSwitch (Direction Decision 3 preserve)

- [ ] On-state class still `bg-primary` (NO migration).
- [ ] Code comment added documenting Direction Decision 3.
- [ ] `role="switch"` + `aria-checked` preserved.
- [ ] Enter-key handler preserved.

### Verification-only items

- [ ] AppSection PWA install affordance renders normally (no chrome changes).
- [ ] DashboardSection Customize + Reset buttons render normally (no chrome changes).
- [ ] PrivacySection `bg-primary/20` initial avatar tints preserved (Decision 11).
- [ ] No Bible export overlap with BibleSettingsModal (or, if found, documented for follow-up).

### Atmospheric layer (Direction Decision 1 preserve)

- [ ] `bg-dashboard-dark` body root preserved.
- [ ] `ATMOSPHERIC_HERO_BG` hero preserved.
- [ ] No `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground` introduced on Settings.

### Tests

- [ ] All existing tests pass; updated tests pass; no new failures introduced.
- [ ] All class-string assertions migrated to post-migration chrome.
- [ ] All new tab pattern + URL state tests pass (deep-link to `/settings?tab=notifications` lands on Notifications panel; clicking a tab updates URL via replace).
- [ ] All new arrow-key roving tests pass (ArrowLeft/Right + ArrowUp/Down navigate; Home/End jump to first/last; tabIndex roving).
- [ ] All new a11y tests pass (`aria-modal` on DeleteAccountModal; focus-on-open on AvatarPickerModal lands on selected avatar / Choose File).
- [ ] All new severity color assertions pass.
- [ ] All new Bible-data-sweep tests pass.
- [ ] `pnpm typecheck` passes.
- [ ] No `data-testid="glow-orb"` introduced (Settings does not use BackgroundCanvas).

### Manual eyeball checks

- [ ] `/settings` renders normally for logged-in user (logged-out redirects to `/`).
- [ ] Tab switching works at all viewports (mobile horizontal, desktop sidebar).
- [ ] Arrow-key roving works in both contexts.
- [ ] Active-tab visual treatment is muted-white with appropriate border indicator.
- [ ] Refresh on `/settings?tab=privacy` lands on Privacy panel.
- [ ] All 5 `text-violet-300` buttons render with correct color + hover state.
- [ ] All 4 white-pill primary CTAs render canonically (matching homepage Get Started visual).
- [ ] Severity color migrations look intentional, not muddled (`text-red-100` on muted bg reads as destructive without alarming).
- [ ] AvatarPickerModal opens with focus on currently-selected avatar (Presets) or Choose File (Upload).
- [ ] AvatarPickerModal Save buttons render as white pill.
- [ ] AvatarPickerModal tab buttons clear 44px touch target.
- [ ] DeleteAccountModal shows AlertTriangle (or AlertCircle) icon next to heading.
- [ ] DeleteAccountModal Delete Everything button renders as muted destructive (NOT saturated `bg-red-500`).
- [ ] ChangePasswordModal new password help hint shows during typing; promotes to error red on blur with too-short value.
- [ ] ChangePasswordModal Update password button renders as white pill.
- [ ] NotificationsSection Send test notification renders as canonical white pill (full size, not undersized).
- [ ] NotificationsSection push status indicators (✓ / ✗) use severity colors.
- [ ] All ToggleSwitch on-states use `bg-primary` (Decision 3 preserve).
- [ ] PrivacySection blocked / muted user list initial avatars use `bg-primary/20` (Decision 11 preserve).
- [ ] AvatarPickerModal selection rings use `ring-primary` (Decision 11 preserve).

### Behavioral preservation

- [ ] BB-41 push permission flow unchanged.
- [ ] `subscribeToPush` call site unchanged.
- [ ] `fireTestNotification` call site unchanged.
- [ ] Daily verse time picker preserved (native `<input type="time">`).
- [ ] `useSettings()` hook + cross-tab sync unchanged.
- [ ] `services/settings-storage.ts` unchanged.
- [ ] All ToggleSwitch behaviors (Enter key, click) unchanged.
- [ ] All section-level handlers (display name save, bio truncation, etc.) unchanged.
- [ ] DeleteAccountModal delete sequence sign-out + navigation + toast unchanged.
- [ ] ChangePasswordModal `changePasswordApi` call + error mapping unchanged.
- [ ] AvatarPickerModal Save callback signature unchanged (`(avatarId, avatarUrl?) → onUpdateProfile`).

### Regression checks

- [ ] All Bible cluster surfaces unchanged from 8B/8C/8A.
- [ ] AskPage unchanged from Spec 9.
- [ ] All other surfaces (Daily Hub, Grow, Local Support, Auth, Dashboard, Friends, Profile, Prayer Wall, Music) unchanged.
- [ ] BibleSettingsModal export flow unaffected (Decision 22 verification).
- [ ] All non-Settings localStorage data preserved (no spurious deletes outside the documented `DELETE_PREFIXES` sweep).
- [ ] Auth simulation (`wr_auth_simulated`) flow unchanged.
