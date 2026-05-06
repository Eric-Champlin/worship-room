# Spec 11B: RoutinesPage + RoutineBuilder + RoutineCard + ContentPicker + RoutineStepCard + DeleteRoutineDialog + Routine-Delete Behavioral Fix

**Master Plan Reference:** Direction document at `_plans/direction/music-2026-05-06.md` is the locked decision set for the Music cluster. Recon at `_plans/recon/music-2026-05-06.md` is the source of truth for current line numbers and the per-file audit results. **Spec 11A is shipped** and established the cluster patterns this spec consumes (active-state muted-white at `bg-white/15`, white-pill primary CTA Pattern 2, `text-violet-300` text-button treatment, border opacity unification at `border-white/[0.12]`, decorative-tint preservation per Decision 20, font-script removal precedent, font-serif italic → canonical body chrome migration precedent). Spec 11B is the **second sub-spec** of the Music cluster — pattern application against the RoutinesPage stack (RoutinesPage + RoutineBuilder + RoutineCard + ContentPicker + RoutineStepCard + DeleteRoutineDialog) plus one small behavioral fix folded into `RoutinesPage.handleDelete` per Direction Decision 14. Specs 1A through 11A (everything from Daily Hub foundation through the Music cluster shell + audio chrome) are prerequisites — all merged into the working branch at the time of writing.

This is a **medium spec**. ~770 production LOC of source edits + ~150–200 LOC of test updates spread across 6 production files and up to 5 test files (2 existing + up to 3 created). The work is shallow and deterministic: 4 surface migrations on `RoutinesPage.tsx` (font-script span removal on the "Routines" wordmark, font-serif italic subtitle migration to canonical body chrome, `bg-primary` Create Routine CTA migration to canonical white-pill primary, addition of a single warm one-liner hint between the templates and the Create Routine CTA), 1 behavioral fix on `RoutinesPage.handleDelete` (dispatch `STOP_ROUTINE` to AudioProvider when the user deletes the actively-playing routine so the AudioPill / AudioDrawer don't continue claiming "Currently in routine: <name>" against a now-orphaned reference), 1 white-pill primary CTA migration on `RoutineBuilder.tsx` (Save Routine), 2 migrations on `RoutineCard.tsx` (Start CTA to canonical white-pill primary, Template badge text from `text-primary` to `text-violet-300` while preserving the `bg-primary/10` background tint as decorative per Decision 20 / Decision 11 precedent), and verification of `ContentPicker.tsx` + `RoutineStepCard.tsx` + `DeleteRoutineDialog.tsx` chrome canonical compliance with conditional migrations only if pre-execution recon finds drift. RoutineBuilder is also audited for active-state UI (RoutineStepCard selected state, Sleep Timer interval selector, Fade Duration selector) that may need Spec 11A's muted-white pattern application; only migrated if drift is found. `DeleteRoutineDialog` is compared to Spec 10A's canonical alertdialog pattern (`role="alertdialog"`, `aria-modal="true"`, `AlertTriangle` icon, severity color CTA, `useFocusTrap` focus restoration); migrated if drift is found.

Patterns this spec USES (already shipped via Specs 1A–11A): `bg-dashboard-dark` body root + `<Layout>` + inline `ATMOSPHERIC_HERO_BG` (canonical inner-page atmospheric pattern shared with Friends, Grow, Settings, MyPrayers, Insights, Music), white-pill primary CTA Pattern 2 per `09-design-system.md` § "White Pill CTA Patterns" (canonical class string locked by Spec 11A; reuse verbatim), Daily Hub 1B violet text-button treatment (`text-violet-300 hover:text-violet-200`), Spec 10A font-script span removal pattern, Spec 10A font-serif italic → canonical body chrome migration pattern (`text-white/60`, no italic), Spec 10A canonical alertdialog pattern from `DeleteAccountModal` (consumed for `DeleteRoutineDialog` if drift found), Spec 10A severity color system (no severity color migrations expected in 11B, but cross-referenced for `DeleteRoutineDialog` muted destructive Delete CTA), Spec 10B narrative one-liner copy pattern (warm, anti-pressure — consumed by Change 4's empty-state hint), Spec 11A active-state muted-white pattern (`bg-white/15 text-white` for active-foreground variant, `bg-white/15 text-white border border-white/30` for isolated-pill variant — consumed if RoutineBuilder has active-state UI), Spec 11A border opacity canonical (`border-white/[0.12]` — RoutineCard already canonical and preserved), Spec 11A decorative-tint preservation per Decision 20 (Template badge `bg-primary/10` background preserved as categorical signal), `useFocusTrap()` canonical modal helper (verified preserved on DeleteRoutineDialog and the kebab-menu popover), canonical `Breadcrumb` component (preserved on RoutinesPage), `AudioProvider` state + dispatch hooks via `useAudioState()` / `useAudioDispatch()` (read-only consumption — only `STOP_ROUTINE` dispatch is added in 11B), `storageService.deleteRoutine` (existing, signature unchanged), `ROUTINE_TEMPLATES` from `data/music/routines.ts` (4 templates preserved as real content per Direction Decision 13 — NOT replaced with `FeatureEmptyState`), `wr_session_state.activeRoutine` schema (read-only consumption per Direction Decision 25; no schema changes).

Patterns this spec INTRODUCES at the cluster level: none. 11B is pattern application + 1 small behavioral fix. Every class string used in this spec is already shipped in `09-design-system.md` or in Spec 10A / Spec 11A canonical migrations. No `[UNVERIFIED]` design values.

Patterns this spec MODIFIES: RoutinesPage h1 (font-script span removal — preserve `GRADIENT_TEXT_STYLE` on parent), RoutinesPage subtitle (font-serif italic → canonical body chrome), RoutinesPage Create Routine CTA (`bg-primary` → canonical white-pill primary CTA Pattern 2), RoutinesPage between-templates-and-CTA copy (NEW: subtle warm one-liner hint per Direction Decision 13 — the only net-new copy in 11B), RoutinesPage `handleDelete` (behavioral fix dispatching `STOP_ROUTINE` when the deleted routine is the active routine per Direction Decision 14), RoutineBuilder Save Routine CTA (`bg-primary` → canonical white-pill primary), RoutineCard Start CTA (`bg-primary` → canonical white-pill primary), RoutineCard Template badge text (`text-primary` → `text-violet-300` while preserving the `bg-primary/10` background tint), and (conditional, only if pre-execution recon finds drift) `ContentPicker.tsx`, `RoutineStepCard.tsx`, `DeleteRoutineDialog.tsx` chrome.

The atmospheric layer is preserved per Direction Decision 1: `bg-dashboard-dark` body root, `<Layout>`, and inline `ATMOSPHERIC_HERO_BG` hero stay exactly as they are. No `BackgroundCanvas`, no `HorizonGlow`, no `GlowBackground` is introduced — RoutinesPage shares the canonical inner-page atmospheric pattern with the rest of the Music cluster, Friends, Grow, Settings, MyPrayers, and Insights. Per-tab atmospheric variation (any cinematic upgrade for the routine builder, animated routine-stepper backgrounds, etc.) is deferred to Spec 11c. The 4 routine templates from `ROUTINE_TEMPLATES` are preserved as real content per Direction Decision 13 — they are NOT replaced with `FeatureEmptyState` because the templates ARE the empty-state content for users who haven't built their own routines yet. The kebab menu pattern (Clone for templates / Edit-Duplicate-Delete for user routines) is preserved with its existing `useFocusTrap` wiring. The routine state schema in `storageService` is preserved exactly per Direction Decision 24. The `wr_session_state.activeRoutine` semantics are preserved per Direction Decision 25; the behavioral fix in Change 5 reads `state.activeRoutine?.id` and dispatches `STOP_ROUTINE` — it does NOT mutate the schema.

The behavioral semantics that must NOT change in this spec: the entire `AudioProvider` state management and `audioReducer` logic per Direction Decision 24 (visual migration ONLY for chrome; the only behavioral edit is dispatching the existing `STOP_ROUTINE` action from a new call site in `RoutinesPage.handleDelete`); `storageService.deleteRoutine` implementation; `ROUTINE_TEMPLATES` content in `data/music/routines.ts`; the bedtime routine ritual onboarding walkthrough (Decision 9 — Spec 11c); the `wr_listening_history` schema per Direction Decision 25; BB-26 / BB-27 audio Bible cross-cutting per Direction Decision 26; the auth gates on Create Routine and Clone (the chrome migrates; the gates do not move — Create still routes through `useAuthModal` for logged-out users, Clone still gates the action); the routine state schema (active routine, sleep timer, fade duration, steps array); RoutineBuilder form state management (Routine Name field, Steps editor, Sleep Timer selector, Fade Duration selector, Cancel/Save flow); ContentPicker scene/scripture/story selection flow; `RoutineCard.handleClone` / `handleEdit` / `handleDuplicate` / `handleDelete` orchestration in `RoutinesPage.tsx` (only `handleDelete` gets the STOP_ROUTINE augmentation); `useFocusTrap` and click-outside / Escape dismiss on every modal and popover (kebab menu, ContentPicker modal, DeleteRoutineDialog).

The cluster pattern this spec ships forward: after both 11A and 11B ship, the entire Music cluster is canonical and ready to participate in any future Round 4 / Round 5 visual work. The combined precedent — active-state muted-white, white-pill primary CTAs, `text-violet-300` text buttons, border opacity unification, decorative-tint preservation, font-script removal, font-serif italic migration, alertdialog canonical, Decision 13 warm one-liner empty-state hints, Decision 14 active-routine-delete cleanup — covers the shape of every remaining pre-Round-3 inner page and is a complete reference set for downstream work.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/music-2026-05-06.md`, `_plans/direction/music-2026-05-06.md`) and the Spec 11A spec (`_specs/spec-11a-music.md`) are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/music/routines` — top-level RoutinesPage. Atmospheric layer (`<Layout>` wrapper + inline `ATMOSPHERIC_HERO_BG` hero with `bg-dashboard-dark` body root inherited from `<Layout>`) is preserved exactly per Direction Decision 1. The hero `<h1>` at `pages/RoutinesPage.tsx:125` migrates from `Bedtime <span className="font-script">Routines</span>` to `Bedtime Routines` plain text per Direction Decision (Spec 10A font-script removal precedent); `GRADIENT_TEXT_STYLE` on the parent `<h1>` and the `HeadingDivider` below the heading are preserved exactly. The hero subtitle at `pages/RoutinesPage.tsx:127` migrates from `font-serif italic text-base text-white/60 sm:text-lg` to canonical body chrome (`text-white/60 text-base sm:text-lg`, no italic, `font-sans` Inter inherited from page default) per Spec 10A migration pattern. The canonical `Breadcrumb` (Music → Bedtime Routines) immediately below the hero is preserved exactly. The Create Routine CTA at `pages/RoutinesPage.tsx:187` migrates from `rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70` to canonical white-pill primary CTA Pattern 2 per Spec 11A precedent (the exact class string established by Spec 11A is reused verbatim — pre-execution recon Step 14 captures it from a Spec 11A reference site for the plan to apply). A new warm one-liner hint paragraph is inserted between the routine cards grid and the Create Routine CTA per Direction Decision 13: `<p className="text-white/60 text-sm sm:text-base text-center mt-6 mb-4">Tap a template to start, or create your own.</p>` — bridges the templates and the Create Routine action without reading as instruction-text or a bare empty-state. The 4 routine templates from `ROUTINE_TEMPLATES` are preserved as real content per Direction Decision 13 (NOT replaced with `FeatureEmptyState`); user-saved routines render after the templates in the same grid via the existing `allRoutines = [...ROUTINE_TEMPLATES, ...userRoutines]` composition. `RoutinesPage.handleDelete` at lines 80–86 augments to dispatch `STOP_ROUTINE` to `AudioProvider` when `state.activeRoutine?.id === deletingRoutine.id` per Direction Decision 14 — the `storageService.deleteRoutine` call signature is unchanged, `refreshRoutines` is preserved, `showToast` is preserved, `setDeletingRoutine(null)` is preserved. The `showBuilder` toggle, the `handleCreate` / `handleClone` / `handleEdit` / `handleDuplicate` / `handleSave` handlers are all preserved exactly. Behavioral preservation: routine playback start, edit existing routine, duplicate user routine, clone template (auth-gated), Create Routine flow (auth-gated via `useAuthModal`), DeleteRoutineDialog open/confirm/dismiss, RoutineBuilder showBuilder toggle, breadcrumb navigation back to Music.
- `/music/routines` — when `showBuilder === true`, the page swaps the routine cards grid and Create Routine CTA for the inline `<RoutineBuilder>` form. The Save Routine CTA inside RoutineBuilder at `components/music/RoutineBuilder.tsx:315` (verify exact line during pre-execution recon Step 5; line numbers may have drifted) migrates from saturated `bg-primary` chrome to canonical white-pill primary CTA Pattern 2. The Cancel button is verified canonical secondary; if drift is found, migrate. Active-state UI inside RoutineBuilder (RoutineStepCard selected state if any, Sleep Timer interval selector active state, Fade Duration selector active state) is audited during pre-execution recon Step 5; if drift is found, apply Spec 11A's muted-white active-state pattern (`bg-white/15 text-white border border-white/30` for isolated-pill variant since Sleep Timer and Fade Duration selectors are isolated chip selectors; `bg-white/15 text-white` for active-foreground variant if applicable). All form behavior is preserved exactly: Routine Name input, Steps editor (add/remove/reorder steps), Sleep Timer selection, Fade Duration selection, ContentPicker mount for adding scenes/scriptures/stories to a step, Cancel returns to the routines list without saving, Save persists via `handleSave` and returns to the list with a success toast.
- `/music/routines` — RoutineCard rendering (4 templates + N user routines). Each card at `components/music/RoutineCard.tsx` has its Start CTA at line 148 (verify) migrated from `bg-primary` chrome to canonical white-pill primary. The Template badge at line 108 (verify) migrates `text-primary` text to `text-violet-300` while preserving the `bg-primary/10` background tint as decorative per Direction Decision 11 / Decision 20 precedent (categorical signal — the violet tint reads as "this is a curated template" — not CTA chrome). The card chrome `border-white/[0.12]` is already canonical per Spec 11A's border-opacity unification and is preserved exactly. The kebab menu (Clone for templates / Edit + Duplicate + Delete for user routines) is verified canonical popover with `useFocusTrap`; if drift is found, migrate to the canonical popover pattern. Step icons are preserved. The "X steps · ~N min" copy is preserved. All handlers (`onStart`, `onClone`, `onEdit`, `onDuplicate`, `onDelete`) are preserved.
- `/music/routines` — ContentPicker modal mount (opened from inside RoutineBuilder when adding a scene/scripture/story to a step). `components/music/ContentPicker.tsx` is audited during pre-execution recon Step 7 for any chrome drift requiring migration: `bg-primary` CTAs, `text-primary` text buttons, font-script / font-serif italic, border opacity drift, active-state drift on selected scene / scripture / story. If drift is found, apply canonical migrations matching Spec 11A patterns. If no drift is found, no changes. Modal chrome (focus trap, click-outside dismiss, Escape dismiss) is preserved. Scene / scripture / story selection flow is preserved exactly.
- `/music/routines` — RoutineStepCard rendering (single-step component used inside RoutineBuilder's Steps editor). `components/music/RoutineStepCard.tsx` is audited during pre-execution recon Step 8 for chrome drift; same audit shape as ContentPicker. If drift is found, migrate; if not, no changes.
- `/music/routines` — DeleteRoutineDialog (opened when the user clicks Delete on the kebab menu of a user routine). `components/music/DeleteRoutineDialog.tsx` is compared during pre-execution recon Step 9 to Spec 10A's canonical alertdialog pattern from `DeleteAccountModal`: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` + `aria-describedby`, `AlertTriangle` icon in heading row with `aria-hidden="true"`, severity-color CTA (muted destructive: `bg-red-950/30 border border-red-400/30 text-red-100` from `09-design-system.md` § "Severity color system"), `useFocusTrap` with focus restoration. If drift is found, migrate to canonical alertdialog. If already canonical, no changes. The confirmation copy ("Delete this routine?" or whatever the current copy is) is preserved exactly — copy edits are NOT in scope.
- All routes globally → `AudioPill` and `AudioDrawer` continue to render across navigation as established by Spec 11A. 11B does NOT touch any audio cluster chrome. The only audio-cluster interaction in 11B is the `STOP_ROUTINE` dispatch from `RoutinesPage.handleDelete` when the deleted routine matches `state.activeRoutine?.id` — this is a behavioral fix for a real bug (the AudioPill / AudioDrawer would otherwise continue claiming "Currently in routine: <name>" against an orphaned reference after the routine was deleted from storage). The dispatch uses the existing `STOP_ROUTINE` action that the audio engine already implements; no new action types or reducer logic are introduced.

The single non-route effect: 5 test files (`pages/__tests__/RoutinesPage.test.tsx`, `components/music/__tests__/RoutineBuilder.test.tsx`, `components/music/__tests__/RoutineCard.test.tsx`, `components/music/__tests__/ContentPicker.test.tsx`, `components/music/__tests__/DeleteRoutineDialog.test.tsx`) get class-string and behavioral assertions added or updated. RoutinesPage.test.tsx and RoutineBuilder.test.tsx exist on the working branch (verified during this spec); RoutineCard.test.tsx, ContentPicker.test.tsx, and DeleteRoutineDialog.test.tsx do NOT yet exist and are created during execution if their corresponding production component requires test coverage for the migrated chrome (RoutineCard always — Start CTA + Template badge migrations). ContentPicker.test.tsx and DeleteRoutineDialog.test.tsx are created only if Changes 8 / 10 find drift requiring migration. Behavioral assertions (RoutineBuilder form flow, ContentPicker selection flow, DeleteRoutineDialog focus trap, kebab menu popover focus trap, breadcrumb navigation, auth gates on Create / Clone, AudioProvider STOP_ROUTINE dispatch on active-routine delete, no STOP_ROUTINE dispatch on non-active routine delete) are added per the changes below. Behavioral assertions for unchanged code paths (ROUTINE_TEMPLATES rendering, `storageService.deleteRoutine` signature, refreshRoutines wiring, showToast messaging, showBuilder toggle, handleSave persistence) are preserved.

---

## Overview

The Bedtime Routines surface at `/music/routines` is the last Music-cluster page that has not yet been migrated to the Round 3 / Round 4 visual canon. Spec 11A shipped the Music page shell, the three tabs (Worship Playlists, Ambient Sounds, Sleep & Rest), and the audio cluster chrome (AudioPill, AudioDrawer, scene cards, scripture cards, bedtime story cards, the shared-mix hero, the saved-mix card, the favorite button, the save-mix button, two interruption-class dialogs). 11B closes the cluster by migrating the RoutinesPage stack — the page shell itself, the inline RoutineBuilder form, the RoutineCard component used by both templates and user routines, the ContentPicker modal that opens from inside RoutineBuilder, the RoutineStepCard sub-component, and the DeleteRoutineDialog. The work is shallow and mechanical: 4 surface migrations on RoutinesPage, 1 white-pill primary CTA migration on RoutineBuilder, 2 migrations on RoutineCard (Start CTA + Template badge text), and verification of three other components (ContentPicker, RoutineStepCard, DeleteRoutineDialog) with conditional migrations only if pre-execution recon finds drift. None of these migrations introduce new visual primitives, new auth gates, new copy, or new architecture. Every class string used in this spec is already shipped in Spec 10A or Spec 11A.

The one behavioral change in 11B is the active-routine-delete cleanup in `RoutinesPage.handleDelete`. Today, if a user is actively running a routine (`state.activeRoutine` is non-null) and they navigate to `/music/routines` and delete that same routine, the routine is removed from `storageService` but the AudioProvider's `state.activeRoutine` still references it. The AudioPill at the bottom of every page continues to display "Currently in routine: <name>" against an orphaned reference. Direction Decision 14 folds the fix into 11B (rather than spinning it into a separate behavioral spec) because the touch site is the same `handleDelete` function being modified for the cluster pattern work in Changes 1–4. The fix is two lines: check whether the routine being deleted matches `state.activeRoutine?.id`; if so, dispatch the existing `STOP_ROUTINE` action before calling `storageService.deleteRoutine`. No new action types are introduced. No reducer logic is added. The audio engine already correctly handles `STOP_ROUTINE` to clear `activeRoutine` from state, fade ambient sounds, and dismiss any running content. The bug today is that the dispatch never fires because the delete handler doesn't check.

The one net-new copy element in 11B is the warm one-liner hint between the routine templates grid and the Create Routine CTA: "Tap a template to start, or create your own." Direction Decision 13 calls for this subtle bridge to soften the transition between curated content (the 4 templates) and the user's own creation entry point. The copy is anti-pressure and warm — it does NOT read as instruction text ("Click here to..."), it does NOT read as an empty-state stand-in (the 4 templates are real content, not placeholder), and it does NOT replace the `FeatureEmptyState` primitive (Direction Decision 13 explicitly preserves the templates as content). The placement is between the templates grid and the CTA so the visual rhythm is: see the curated templates → read a one-line invitation → see the canonical white-pill primary action.

The atmospheric layer is preserved per Direction Decision 1: `<Layout>` + inline `ATMOSPHERIC_HERO_BG` hero. No `BackgroundCanvas`, no `HorizonGlow`, no `GlowBackground` is introduced. The 4 routine templates from `ROUTINE_TEMPLATES` are preserved as real content per Direction Decision 13 (NOT replaced with `FeatureEmptyState`). The canonical breadcrumb (Music → Bedtime Routines) is preserved. The kebab menu pattern with `useFocusTrap` is preserved (verified during execution; conditional fix only if drift found). RoutineCard's existing `border-white/[0.12]` chrome is preserved (already canonical per Spec 11A's border-opacity unification). The routine state schema in `storageService` is preserved per Direction Decision 24. The `wr_session_state.activeRoutine` semantics are preserved per Direction Decision 25.

The cluster pattern this spec ships forward to future Round 4 / Round 5 work: after 11A and 11B both ship, every Music-cluster surface is canonical. The combined precedent set — active-state muted-white at `bg-white/15`, canonical white-pill primary CTA Pattern 2, `text-violet-300` text-button treatment, border opacity unification at `border-white/[0.12]`, decorative-tint preservation per Decision 20, font-script removal, font-serif italic → canonical body chrome, alertdialog canonical from Spec 10A, Decision 13 warm one-liner empty-state hints, Decision 14 active-routine-delete cleanup — is a complete reference set for any pending pre-Round-3 surface in the codebase.

---

## User Story

As a **logged-in user navigating to `/music/routines`** to start a bedtime routine, build a new routine, or edit an existing one, I want the page to feel visually consistent with the rest of the Music cluster (now canonical after Spec 11A) and the rest of the app. Today the hero `<h1>` at `pages/RoutinesPage.tsx:125` renders "Bedtime" in the gradient heading style and "Routines" in `font-script` Caveat — a deprecated pattern per `09-design-system.md` § "Deprecated Patterns" ("`Caveat` font on headings"). The hero subtitle at line 127 renders in `font-serif italic` — also deprecated for prose body text. The Create Routine CTA at line 187 renders as a saturated `bg-primary` solid pill while every other primary CTA in the app (homepage Get Started, RegisterPage hero, Spec 10A migrations, Spec 11A migrations) renders as a translucent white pill. The Save Routine CTA inside RoutineBuilder at line 315 has the same drift. The Start CTAs on every RoutineCard (4 templates + N user routines) all render saturated. The Template badge text on each template card renders in `text-primary` purple, which fails WCAG AA contrast against the dark card background. After 11B, every heading, subtitle, primary CTA, and badge text on the RoutinesPage stack matches the canonical pattern — consistent, accessible, and intentional.

As a **logged-in user actively running a bedtime routine** (the AudioPill at the bottom of every page reads "Currently in routine: Wind Down" or whatever the active routine name is) who navigates to `/music/routines` and decides to delete that routine, I want the AudioPill / AudioDrawer to stop claiming the routine is active. Today, if I delete the routine that is currently running, `storageService.deleteRoutine` removes the routine from storage but `AudioProvider.state.activeRoutine` still references it. The AudioPill continues to display "Currently in routine: <name>" against a routine that no longer exists. After 11B, `RoutinesPage.handleDelete` checks whether the routine being deleted matches `state.activeRoutine?.id` and dispatches `STOP_ROUTINE` to AudioProvider before calling `storageService.deleteRoutine`. The audio engine then correctly clears `activeRoutine` from state, fades ambient sounds, and dismisses any running content. The AudioPill returns to its idle state. The orphaned reference bug is resolved.

As a **logged-out visitor browsing `/music/routines`** scrolling through the 4 routine templates wondering whether to try one or build my own, I want a soft invitation to bridge the templates and the Create Routine CTA. Today the page shows 4 template cards in a grid, then immediately jumps to a saturated `bg-primary` "Create Routine" button at the bottom. There's no narrative bridge — it's "here's a list, here's a button." After 11B, a single warm one-liner hint reads "Tap a template to start, or create your own." between the templates and the CTA. The copy is anti-pressure (no instruction-text imperative, no exclamation point, no marketing voice), warm (acknowledges that the user has options), and properly placed (after the templates, before the CTA — the visual rhythm bridges the two). The 4 templates remain visible and are still the primary affordance; the CTA remains the secondary path for users who want to build something custom.

As a **keyboard-only user navigating the kebab menu** on a user routine to delete it, I want the focus trap and Escape dismiss to work correctly. The existing `useFocusTrap()` hook is canonical and supports restoration; pre-execution recon Step 9 verifies that the kebab popover and the DeleteRoutineDialog both wire it correctly. If verification confirms canonical, no code change is made. If drift is found (e.g., Escape doesn't dismiss the kebab, or focus escapes to the page after the dialog closes), the conditional fix is folded into 11B — patch using the canonical pattern from Spec 10A's `DeleteAccountModal`.

As a **screen-reader user opening the DeleteRoutineDialog** to confirm a routine deletion, I want the dialog to announce as an alert (not just a generic dialog) because the action is destructive. The Spec 10A canonical alertdialog pattern uses `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` + `aria-describedby`, `AlertTriangle` icon in the heading row with `aria-hidden="true"`, severity-color CTA (muted destructive — `bg-red-950/30 border border-red-400/30 text-red-100` from the canonical severity palette), and `useFocusTrap` with focus restoration. After 11B, DeleteRoutineDialog matches this pattern (or already does — if pre-execution recon Step 9 confirms canonical, no changes are made; if drift is found, migrate).

As a **future spec author working on a hypothetical Spec 11c** (Bedtime Routine ritual onboarding walkthrough, per Direction Decision 9 deferred), I want the cluster patterns established by 11A and 11B to be canonical and ready to reuse. After 11B, the active-state class strings from 11A, the canonical white-pill primary CTA Pattern 2 alignment, the border opacity unification at `border-white/[0.12]`, the `text-primary` → `text-violet-300` text-button precedent, the Decision 20 decorative-tint preservation, and the Decision 13 warm one-liner empty-state hint pattern are all canonical and ready to apply against any new RoutinesPage extensions or any other pre-Round-3 surface.

---

## Requirements

### Functional Requirements

1. **RoutinesPage font-script span removal (Change 1).** In `frontend/src/pages/RoutinesPage.tsx` at line 125 (verify exact line during pre-execution recon Step 4 — line numbers may have drifted from the recon doc), find the heading `<h1 ... style={GRADIENT_TEXT_STYLE}>Bedtime <span className="font-script">Routines</span></h1>` and migrate to `<h1 ... style={GRADIENT_TEXT_STYLE}>Bedtime Routines</h1>`. The `font-script` span wrapping the word "Routines" is removed; the word is now plain text inside the parent `<h1>`. `GRADIENT_TEXT_STYLE` on the parent `<h1>` is preserved exactly. The wordmark visual emphasis comes from the gradient + font weight, not from `font-script`. The `headingRef` on the `<h1>` and the `useElementWidth()` hook driving the `HeadingDivider` width below the heading are preserved exactly. All other classes on the parent `<h1>` (`px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2`) are preserved exactly. **Why:** `Caveat` font on headings is deprecated per `09-design-system.md` § "Deprecated Patterns" (replaced by `GRADIENT_TEXT_STYLE`). Spec 10A established the migration pattern; Spec 11B applies it to RoutinesPage.

2. **RoutinesPage subtitle migration (Change 2).** In `frontend/src/pages/RoutinesPage.tsx` at line 127 (verify), find the subtitle `<p className="mx-auto mt-4 max-w-lg font-serif italic text-base text-white/60 sm:text-lg">Build your path to peaceful sleep</p>` and migrate to `<p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">Build your path to peaceful sleep</p>`. The `font-serif italic` classes are removed; `font-sans` Inter is inherited from the page default; the `text-white/60` color, the responsive sizing (`text-base sm:text-lg`), and the `mx-auto mt-4 max-w-lg` layout are all preserved exactly. The subtitle copy "Build your path to peaceful sleep" is preserved exactly. **Why:** `font-serif italic` on prose body text is deprecated per `09-design-system.md` (the canonical reading-prose treatment is `font-sans` Inter, no italic, with appropriate `text-white/X` opacity per the Text Opacity Standards table). Spec 10A established the migration pattern; Spec 11B applies it to RoutinesPage.

3. **RoutinesPage Create Routine CTA migration (Change 3).** In `frontend/src/pages/RoutinesPage.tsx` at line 187 (verify), find the Create Routine button `<button type="button" onClick={handleCreate} className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70">Create Routine</button>` and migrate the className to canonical white-pill primary CTA Pattern 2 per `09-design-system.md` § "White Pill CTA Patterns" Pattern 2. Pre-execution recon Step 14 captures the exact class string from a Spec 11A reference site (e.g., the `SaveMixButton.tsx:144` "Save Mix" CTA migrated in Spec 11A Change 4b, or the `SharedMixHero.tsx:96` "Play This Mix" CTA migrated in Spec 11A Change 4a) and applies it verbatim. Critical preservations: `onClick={handleCreate}` (which calls `useAuthModal` for logged-out users — preserved); the accessible name "Create Routine" (button text content); `min-h-[44px]` tap target (the canonical pattern includes this); `focus-visible:ring-white/50` canonical ring per the pattern; the surrounding `<div className="mt-8 text-center">` wrapper that centers the CTA. **Why:** The homepage Get Started CTA, the RegisterPage hero CTA, the Spec 10A AvatarPickerModal Save / ChangePasswordModal Update / NotificationsSection Send test notification CTAs, and the six Spec 11A audio-cluster CTAs all use the canonical white-pill primary pattern. Aligning Create Routine completes the cluster's primary-CTA consistency.

4. **RoutinesPage empty-state hint addition (Change 4).** In `frontend/src/pages/RoutinesPage.tsx`, between the routine cards grid (the closing `</div>` of `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">` at approximately line 180) and the Create Routine button wrapper (`<div className="mt-8 text-center">` at approximately line 183), insert a new paragraph: `<p className="text-white/60 text-sm sm:text-base text-center mt-6 mb-4">Tap a template to start, or create your own.</p>`. Margins (`mt-6 mb-4`) are tuned to fit the existing layout — pre-execution recon Step 4 reads the surrounding spacing during execution and the plan adjusts margins as needed to maintain visual balance. The copy is exactly "Tap a template to start, or create your own." — period terminator, sentence case, no exclamation point, no instruction-text imperative voice. The `text-white/60` opacity matches the canonical "secondary text" tier from `09-design-system.md` § "Text Opacity Standards" and meets WCAG AA contrast against `bg-dashboard-dark`. The `text-center` alignment matches the centered Create Routine CTA below it. The hint renders ONLY in the routines list view; it does NOT render when `showBuilder === true` (the RoutineBuilder form is mounted instead and the hint is hidden by the existing conditional render). **Why:** Direction Decision 13 — a subtle warm bridge between the curated templates and the Create Routine action softens the transition without reading as instruction text or replacing the templates as content (the templates ARE the empty-state content). Spec 10B established the warm one-liner narrative pattern; Spec 11B applies it here.

5. **RoutinesPage handleDelete behavioral fix (Change 5).** In `frontend/src/pages/RoutinesPage.tsx` at lines 80–86 (verify), find the `handleDelete` function:

   ```tsx
   const handleDelete = () => {
     if (!deletingRoutine) return
     storageService.deleteRoutine(deletingRoutine.id)
     refreshRoutines()
     showToast(`Deleted "${deletingRoutine.name}"`)
     setDeletingRoutine(null)
   }
   ```

   And augment it to dispatch `STOP_ROUTINE` to AudioProvider when the deleted routine is the currently-active routine:

   ```tsx
   const handleDelete = () => {
     if (!deletingRoutine) return

     // If the user is deleting the actively-playing routine, stop it first
     // so the AudioPill / Drawer doesn't continue claiming "Currently in routine: <name>"
     // with a now-orphaned reference (Spec 11 Direction Decision 14).
     if (state.activeRoutine?.id === deletingRoutine.id) {
       dispatch({ type: 'STOP_ROUTINE' })
     }

     storageService.deleteRoutine(deletingRoutine.id)
     refreshRoutines()
     showToast(`Deleted "${deletingRoutine.name}"`)
     setDeletingRoutine(null)
   }
   ```

   The exact hook names for reading `state` and `dispatch` from AudioProvider are confirmed during pre-execution recon Step 13 by inspecting an existing call site of `STOP_ROUTINE` (or `useAudioState()` / `useAudioDispatch()` per `09-design-system.md` § "Music Feature — Technical Architecture"). Critical preservations: `storageService.deleteRoutine` call signature unchanged; `refreshRoutines()` call preserved; `showToast(...)` call preserved with same template literal; `setDeletingRoutine(null)` reset preserved (closes the DeleteRoutineDialog). The order of operations is: (1) check whether the deleted routine is active and dispatch STOP_ROUTINE if so; (2) delete from storage; (3) refresh routines; (4) show toast; (5) close dialog. Steps 1 and 2 are sequential because STOP_ROUTINE clearing `activeRoutine` from state must happen BEFORE storage deletion so any subscribed UI updates with consistent state. Pre-execution recon Step 10 confirms whether `wr_session_state.activeRoutine` carries an `id` field for comparison (the brief assumes it does); if the schema differs, surface the finding before patching. **Why:** Direction Decision 14 — orphaned `activeRoutine` references in AudioProvider state cause the AudioPill / AudioDrawer to display "Currently in routine: <name>" against deleted routines. The fix is local to the touch site (`handleDelete`) and uses an existing action type (`STOP_ROUTINE` is already implemented in the audio engine).

6. **RoutineBuilder Save Routine CTA migration (Change 6).** In `frontend/src/components/music/RoutineBuilder.tsx` at line 315 (verify exact line during pre-execution recon Step 5; line numbers may have drifted), migrate the Save Routine button's className from saturated `bg-primary` chrome to canonical white-pill primary CTA Pattern 2 (same exact class string captured by recon Step 14 and reused from Change 3). Critical preservations: `onClick` handler (calls `handleSave` with the form state); disabled-state logic (the button is disabled when the form is invalid — preserved exactly); accessible name "Save Routine" (button text content); `min-h-[44px]` per the canonical pattern. The Cancel button is verified canonical secondary during execution (likely already canonical per the existing chrome); if drift is found, migrate. Pre-execution recon Step 5 also audits for active-state UI inside RoutineBuilder that may need Spec 11A's muted-white pattern application: the RoutineStepCard selected/active state if any; the Sleep Timer interval selector active state; the Fade Duration selector active state. If drift is found, apply Spec 10A canonical (`bg-white/15 text-white border border-white/30` for isolated-pill chip selectors; `bg-white/15 text-white` for active-foreground pills). If no active-state drift is found, no changes here beyond the Save Routine CTA migration. **Why:** Cluster consistency with the six Spec 11A white-pill primary CTAs and the Spec 10A migrations.

7. **RoutineCard Start CTA migration + Template badge text migration (Change 7).** In `frontend/src/components/music/RoutineCard.tsx`:
   - **(a) Start CTA migration.** At line 148 (verify), migrate the Start button's className from `bg-primary` chrome to canonical white-pill primary CTA Pattern 2 (same class string from Change 3 / Change 6). Critical preservations: `onClick` handler (starts the routine); accessible name "Start" (or whatever the existing button text is); `min-h-[44px]`; the surrounding card chrome `border-white/[0.12]` is already canonical per Spec 11A and is preserved exactly.
   - **(b) Template badge text migration.** At line 108 (verify), find the Template badge `<span className="bg-primary/10 text-primary ...">Template</span>` and migrate the text color only: `<span className="bg-primary/10 text-violet-300 ...">Template</span>`. The `bg-primary/10` background tint is preserved per Direction Decision 11 / Decision 20 precedent (categorical signal — the violet tint reads as "this card is a curated template, not a user creation" — decorative chrome, not CTA chrome). Only the `text-primary` text color migrates to `text-violet-300` for WCAG AA contrast against the dark card background. All other classes on the badge (sizing, padding, rounded-corner, etc.) are preserved exactly.
   - **(c) Kebab menu chrome verification.** Verify the kebab menu (Clone for templates / Edit + Duplicate + Delete for user routines) aligns to canonical popover chrome with `useFocusTrap`. If drift is found, migrate to the canonical popover pattern. If canonical, no change. Pre-execution recon Step 6 reads the kebab implementation during execution and surfaces drift before patching.

   **Why:** Cluster consistency with Spec 11A's white-pill CTA migrations and the `text-primary` → `text-violet-300` text-button migrations on `SavedMixCard.tsx:141`. The Template badge is a categorical signal that fits the Decision 20 / Decision 11 decorative-tint preservation precedent (same shape as the BibleSleepSection book icon container, the RoutineStepper completed-step tint, the DrawerTabs notification dot, and the ScriptureTextPanel active-verse highlight — all preserved in 11A as `bg-primary/X` decorative chrome).

8. **ContentPicker chrome verification (Change 8 — conditional).** In `frontend/src/components/music/ContentPicker.tsx`, audit during pre-execution recon Step 7 for any chrome drift requiring migration: `bg-primary` solid CTAs, `text-primary` text buttons, `font-script` / `font-serif italic` typography, border opacity drift (`border-white/10` → `border-white/[0.12]`), active-state drift on selected scene / scripture / story (saturated purple → muted-white). If drift is found, apply canonical migrations matching Spec 11A patterns (white-pill primary for CTAs, `text-violet-300` for text buttons, `border-white/[0.12]` for rolls-own card borders, `bg-white/15 text-white border border-white/30` for isolated-pill active states, `bg-white/15 text-white` for active-foreground variants). If no drift is found, no changes. The scene / scripture / story selection flow, the modal focus trap, the click-outside dismiss, and the Escape dismiss are preserved exactly regardless. **Why:** ContentPicker is the modal that opens from inside RoutineBuilder when adding content to a step; if it has chrome drift, the cluster is incomplete after 11B even though every other touch site is migrated.

9. **RoutineStepCard chrome verification (Change 9 — conditional).** In `frontend/src/components/music/RoutineStepCard.tsx`, same audit as ContentPicker (Change 8). If drift is found, migrate. If not, no changes. Single-step rendering behavior is preserved exactly. **Why:** RoutineStepCard renders inside RoutineBuilder's Steps editor; same cluster-completeness rationale as ContentPicker.

10. **DeleteRoutineDialog alignment with Spec 10A canonical alertdialog (Change 10 — conditional).** In `frontend/src/components/music/DeleteRoutineDialog.tsx`, compare during pre-execution recon Step 9 to Spec 10A's canonical alertdialog pattern from `DeleteAccountModal`:
    - `role="alertdialog"` (not `role="dialog"` — alert variant for destructive actions)
    - `aria-modal="true"`
    - `aria-labelledby` referencing the heading element id
    - `aria-describedby` referencing the body description element id
    - `AlertTriangle` icon (from lucide-react) in the heading row with `aria-hidden="true"`
    - Severity-color Delete CTA: muted destructive (`bg-red-950/30 border border-red-400/30 text-red-100`) per `09-design-system.md` § "Severity color system"
    - Cancel button: canonical secondary
    - `useFocusTrap` with focus restoration to the trigger element (the kebab menu Delete option) on close

    Identify drift. If drift is found on any of the above, migrate to canonical. If already canonical, no changes. The confirmation copy ("Delete this routine?" or whatever the current copy is) is preserved exactly — copy edits are NOT in scope. The click-outside dismiss and Escape dismiss are preserved. **Why:** Spec 10A established the canonical alertdialog pattern for destructive actions; DeleteRoutineDialog should match for cluster-wide a11y consistency.

### Non-Functional Requirements

- **Performance:** No regression in RoutinesPage initial render time, RoutineBuilder mount time, RoutineCard render performance, ContentPicker open animation, or DeleteRoutineDialog open animation. The behavioral fix in Change 5 adds one conditional check (`state.activeRoutine?.id === deletingRoutine.id`) and one optional dispatch — net cost is sub-millisecond. Bundle size unchanged (no new dependencies, no new modules; the only net-new code is one paragraph element in JSX, one conditional + one dispatch in the delete handler, and conditional className updates).
- **Accessibility:** WCAG 2.2 AA preserved across the RoutinesPage stack. The `text-primary` → `text-violet-300` Template badge text migration resolves the WCAG AA contrast failure on `text-primary` against the dark card background. The font-script removal removes a decorative-font heading anti-pattern. The font-serif italic subtitle migration improves prose readability. The white-pill primary CTAs preserve `min-h-[44px]` tap target and `focus-visible:ring-white/50`. The new empty-state hint copy uses `text-white/60` (canonical secondary text tier, meets WCAG AA against `bg-dashboard-dark`). The DeleteRoutineDialog alertdialog migration (if applied) brings the dialog to canonical a11y compliance per Spec 10A. The `useFocusTrap` semantics on the kebab menu and on DeleteRoutineDialog are preserved (or fixed if drift found).
- **Browser/device:** Existing responsive breakpoints preserved (mobile / tablet / desktop). No new breakpoints introduced. RoutineCard grid responsive layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) preserved. RoutineBuilder form layout responsive behavior preserved. DeleteRoutineDialog layout preserved. Touch-target compliance verified on all migrated white-pill CTAs (Create Routine, Save Routine, Start) at `min-h-[44px]`. The new empty-state hint paragraph has no interactive elements (decorative copy only).
- **Test count expectation:** Per `06-testing.md` size guidance, a Medium spec expects 10–20 tests. 11B adds approximately 12–15 assertions across 5 test files (3 of which may need to be created): RoutinesPage.test.tsx gets 6–8 new assertions (font-script absence, font-serif italic absence, white-pill Create Routine, empty-state hint copy, handleDelete active-routine path with STOP_ROUTINE dispatch, handleDelete non-active-routine path without STOP_ROUTINE dispatch, optional regression assertion on auth gate preserved, optional assertion on `setDeletingRoutine(null)` after both paths); RoutineBuilder.test.tsx gets 1–2 assertions (white-pill Save Routine + conditional active-state assertions if drift found); RoutineCard.test.tsx (created if not exists) gets 2–3 assertions (white-pill Start CTA, `text-violet-300` Template badge, `bg-primary/10` background preserved, optional kebab menu canonical chrome if drift found); ContentPicker.test.tsx (created if Change 8 finds drift) gets 1–3 assertions; DeleteRoutineDialog.test.tsx (created if Change 10 finds drift) gets 3–4 assertions (`aria-modal="true"`, `AlertTriangle` icon, muted destructive Delete CTA, canonical secondary Cancel CTA). Existing behavioral tests in RoutinesPage.test.tsx and RoutineBuilder.test.tsx are preserved.

---

## Auth Gating

11B does not introduce, remove, or relocate any auth gate on the RoutinesPage stack. Every existing auth gate is preserved exactly. The visible chrome on the auth-gated triggers (Create Routine button on RoutinesPage; Clone option in the kebab menu of template RoutineCards) migrates per the cluster canon, but the gates themselves are unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Browse `/music/routines` | Full access — page renders, breadcrumb works, 4 templates visible, kebab menu visible (Clone option present on templates) | Full access; same | N/A — public route, no gate |
| View RoutineCard details, scroll routine list | Full access — all 4 templates visible | Full access; same | N/A |
| Click Start on a template RoutineCard | Full access — template starts playing via `startRoutine` (auth-independent — playback is engine state) | Full access; same | N/A |
| Click Create Routine CTA (chrome migrates to white-pill primary in Change 3) | Auth-gated (existing) — `handleCreate` calls `useAuthModal` to open the auth modal; clicking "Sign in" on the modal completes the auth simulation flow and then routes back to RoutinesPage with `showBuilder = true` | Full access — `handleCreate` sets `showBuilder = true` directly; RoutineBuilder renders inline | "Sign in to create a routine" (existing copy if present; preserved verbatim — the brief does not specify a copy edit, and copy edits are NOT in scope) |
| Click Clone in the kebab menu of a template RoutineCard | Auth-gated (existing) — `handleClone` calls `useAuthModal`; after auth, the template is duplicated into user routines | Full access — `handleClone` duplicates the template into `userRoutines`, refreshes the list, shows a success toast | "Sign in to clone a routine" (existing copy if present; preserved verbatim) |
| Click Edit in the kebab menu of a user routine | N/A (templates have no Edit option; user routines only render for authenticated users since storage requires auth) | Full access — `handleEdit` sets `editingRoutine` and `showBuilder = true`; RoutineBuilder mounts pre-populated with the routine state | N/A |
| Click Duplicate in the kebab menu of a user routine | N/A | Full access — `handleDuplicate` clones the user routine into a new entry with "(Copy)" suffix on the name | N/A |
| Click Delete in the kebab menu of a user routine | N/A | Full access — opens DeleteRoutineDialog; on confirm, runs `handleDelete` which (Change 5) dispatches STOP_ROUTINE if the deleted routine is active, then deletes from storage, refreshes, shows toast, closes dialog | N/A |
| Save Routine inside RoutineBuilder (chrome migrates to white-pill primary in Change 6) | N/A — RoutineBuilder is only mounted for authenticated users (Create Routine routes through auth modal first) | Full access — `handleSave` persists via `storageService.saveRoutine` or `storageService.updateRoutine`, refreshes, closes builder, shows success toast | N/A |
| Cancel inside RoutineBuilder | N/A | Full access — `setShowBuilder(false)` and `setEditingRoutine(null)`; returns to routines list without saving | N/A |
| Open ContentPicker from RoutineBuilder | N/A | Full access — modal opens, scene / scripture / story selection flow runs as today | N/A |

The auth modal pattern, shared with all other Music-cluster auth gates and with the broader app's auth gating per `02-security.md`, is the existing modal component. No new modal copy is introduced in 11B. No existing modal copy is edited in 11B.

---

## Responsive Behavior

11B preserves all existing responsive behavior across the RoutinesPage stack. No breakpoints, layout reflows, or orientation behaviors are introduced or changed; the visual migration is class-string updates within existing layout structures, plus one new paragraph element with responsive sizing classes that match the surrounding pattern.

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | RoutinesPage hero renders the migrated `<h1>` "Bedtime Routines" plain text with `text-3xl font-bold` and `GRADIENT_TEXT_STYLE` (Change 1) and the migrated subtitle "Build your path to peaceful sleep" with `text-base text-white/60` (Change 2 — `font-sans` Inter, no italic). HeadingDivider renders below the subtitle. Breadcrumb (Music → Bedtime Routines) renders below the hero. RoutineCard grid is single-column (`grid-cols-1`). The new empty-state hint paragraph (Change 4) renders below the grid with `text-sm text-white/60 text-center mt-6 mb-4` — the `text-sm` mobile sizing matches the canonical secondary-text tier on small viewports. The Create Routine CTA (Change 3) renders below the hint as a canonical white-pill primary button at `min-h-[44px]`, centered via the existing `<div className="mt-8 text-center">` wrapper. The kebab menu on each RoutineCard opens as a popover with focus trap; on mobile, the popover is a small absolutely-positioned panel with the canonical popover chrome (verified during execution; conditional fix only if drift found). DeleteRoutineDialog renders as a centered modal sized for mobile (canonical alertdialog pattern; verified or migrated per Change 10). When `showBuilder === true`, the inline RoutineBuilder form replaces the routine cards grid + hint + CTA; the form layout preserves the existing mobile-first structure with the migrated white-pill Save Routine CTA (Change 6) and the canonical secondary Cancel button below the form. ContentPicker modal opens as a mobile-sized centered modal (verified or migrated per Change 8). |
| Tablet (640–1024px) | RoutinesPage hero `<h1>` scales to `text-4xl` per the existing `sm:text-4xl` class. Subtitle scales to `text-lg` per `sm:text-lg`. RoutineCard grid becomes 2-column (`sm:grid-cols-2`). The new empty-state hint paragraph scales to `text-base` per `sm:text-base`. The Create Routine CTA preserves its centered placement. The kebab menu popover rendering is breakpoint-agnostic (popover positioning logic is preserved). RoutineBuilder form may use a wider container per existing breakpoint logic (preserved). ContentPicker modal renders at the same width as mobile or scales per existing breakpoint logic (preserved). |
| Desktop (> 1024px) | RoutinesPage hero `<h1>` scales to `text-5xl` per `lg:text-5xl`. RoutineCard grid becomes 3-column (`lg:grid-cols-3`). The empty-state hint and the Create Routine CTA scale per their existing responsive sizing. White-pill primary CTAs (Create Routine, Save Routine, Start) preserve `px-8 py-3.5` from the canonical pattern (or whatever sizing the canonical class string specifies — pre-execution recon captures verbatim). The breadcrumb, the HeadingDivider, and the surrounding section container (`mx-auto max-w-5xl px-4 py-8`) preserve their existing desktop layout. RoutineBuilder form preserves its existing desktop layout. ContentPicker modal preserves its existing desktop layout (centered, constrained to a max-width container). |

Mobile-specific interactions preserved: kebab menu touch interaction; DeleteRoutineDialog Cancel / Delete touch targets at `min-h-[44px]` (canonical alertdialog); ContentPicker scene / scripture / story selection touch interaction. Touch-target compliance verified at `min-h-[44px]` on all migrated white-pill CTAs and on the kebab menu trigger / popover items.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. RoutinesPage / RoutineBuilder / RoutineCard / ContentPicker / RoutineStepCard / DeleteRoutineDialog are purely a routines-management surface (template browsing, custom routine creation, routine playback orchestration). The only user-supplied text is the Routine Name field inside RoutineBuilder (a short text input — preserved exactly, no migration touches it); the Routine Name is rendered as plain text in RoutineCard headings and in toast messages (`Deleted "${deletingRoutine.name}"`) — React escapes the value by default. No LLM, no AI cache, no crisis detection required. The behavioral fix in Change 5 (`STOP_ROUTINE` dispatch on active-routine delete) is purely audio engine state management; it does not involve any user content beyond the routine id comparison.

---

## Auth & Persistence

- **Logged-out users (demo mode):** Full read access to `/music/routines` — page renders, 4 templates visible, kebab menu visible with Clone option on templates. Clicking Create Routine opens the auth modal (existing gate, preserved). Clicking Clone on a template opens the auth modal (existing gate, preserved). User routines (`wr_routines`) are NOT written for logged-out users per the demo-mode zero-persistence rule in `02-security.md` § "Demo Mode Data Policy". The routine playback engine state (`wr_session_state.activeRoutine`) is preserved as a client-side-only value matching its existing `02-security.md` exception (allowed for logged-out users since it survives in-browser only via the 24-hour expiry; the brief assumes templates can be played without auth — verify during pre-execution recon, but this is the existing behavior preserved). The new empty-state hint paragraph (Change 4) is visible to logged-out users.
- **Logged-in users:** All RoutinesPage behaviors persist as today. `wr_routines` (custom user routines) writes via `storageService.saveRoutine`, `updateRoutine`, `deleteRoutine`. `wr_session_state.activeRoutine` writes via the audio engine when a routine is started; the new behavioral fix in Change 5 dispatches `STOP_ROUTINE` to clear `activeRoutine` from state when the active routine is deleted (the existing reducer logic handles the state clear and any cascade — fade ambient sounds, dismiss running content, etc.). No new localStorage keys are introduced in 11B.
- **localStorage keys touched in 11B:** None added, removed, or schema-changed. `wr_routines` schema is read-only per Direction Decision 24 (the chrome migrates; the underlying storage shape does not change). `wr_session_state.activeRoutine` schema is read-only per Direction Decision 25 — Change 5 reads `state.activeRoutine?.id` (existing field on the existing schema) to compare against the deleted routine's id; no schema additions, removals, or renames. Pre-execution recon Step 10 confirms the schema during execution and surfaces any deviation before patching.
- **Database:** N/A — RoutinesPage stack is entirely client-side / localStorage-backed at this time. Backend Routines sync is greenfield for a future spec.

---

## Completion & Navigation

N/A — RoutinesPage is a sub-route of the Music top-level navbar destination, not a Daily Hub tab. Standalone feature with persistent navigation back to `/music` via the canonical breadcrumb (Music → Bedtime Routines) and to the rest of the app via the navbar. The AudioPill persists across navigation when audio is playing, providing always-on access back to playback state from any other surface.

---

## Design Notes

- **Atmospheric layer:** Preserve `<Layout>` wrapper + inline `ATMOSPHERIC_HERO_BG` hero per Direction Decision 1 (canonical inner-page atmospheric pattern shared with Friends, Grow, Settings, MyPrayers, Insights, Music). Do not introduce per-tab or per-section atmospheric variants in 11B (Spec 11c). Do not introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground`.
- **White-pill primary CTA Pattern 2:** Reference `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 for the exact class string. Cross-reference the homepage Get Started button, the RegisterPage hero CTA, the Spec 10A migrations (AvatarPickerModal Save / ChangePasswordModal Update password / NotificationsSection Send test notification / DeleteAccountModal Delete Everything chrome severity variant), and the six Spec 11A migrations (`SharedMixHero.tsx:96` Play This Mix, `SaveMixButton.tsx:144` Save Mix, `RoutineInterruptDialog.tsx:41` Stop routine, `ContentSwitchDialog.tsx:52` Switch, `DrawerNowPlaying.tsx:59` Play, `TimerTabContent.tsx:354` Timer Start) for visual consistency. Pre-execution recon Step 14 captures the exact class string from one of these reference sites; apply it verbatim to all 3 11B sites (Create Routine + Save Routine + Start).
- **Daily Hub 1B violet text-button treatment:** Reference `09-design-system.md` for the canonical `text-violet-300 hover:text-violet-200` text treatment. Apply to RoutineCard Template badge text per Change 7b. The `bg-primary/10` background tint is preserved as decorative per Decision 11 / Decision 20 precedent.
- **Spec 10A font-script removal pattern:** Reference Spec 10A's migration of any `font-script` heading drift. Apply the same `font-script` span removal to RoutinesPage `<h1>` per Change 1; preserve `GRADIENT_TEXT_STYLE` on the parent.
- **Spec 10A font-serif italic → canonical body chrome migration:** Reference Spec 10A's migration of any `font-serif italic` prose body text. Apply the same migration to RoutinesPage subtitle per Change 2; the canonical body chrome is `font-sans` Inter (page default), no italic, with `text-white/60` opacity per the Text Opacity Standards table.
- **Spec 10B narrative one-liner copy pattern:** Reference Spec 10B for the warm anti-pressure copy voice. Apply to the new empty-state hint per Change 4. The copy is "Tap a template to start, or create your own." — sentence case, period terminator, no exclamation point, no instruction-text imperative, no comparison or urgency.
- **Spec 11A active-state muted-white pattern:** Reference Spec 11A for the canonical active-state class strings (`bg-white/15 text-white` for active-foreground; `bg-white/15 text-white border border-white/30` for isolated-pill chip selectors). Apply ONLY if pre-execution recon Step 5 finds active-state drift in RoutineBuilder (RoutineStepCard selected state, Sleep Timer selector active state, Fade Duration selector active state). If no drift, no migrations.
- **Spec 11A border opacity canonical:** Reference Spec 11A's border-opacity unification. RoutineCard chrome is already at `border-white/[0.12]` and is preserved exactly (verified during execution). Other components (RoutineBuilder, ContentPicker, RoutineStepCard, DeleteRoutineDialog) are audited; if any have `border-white/10` drift, migrate per Change 8 / 9 / 10.
- **Spec 11A decorative tint preservation per Decision 20:** Reference Spec 11A and Spec 10A Decision 11 precedent. The RoutineCard Template badge `bg-primary/10` background is decorative chrome (categorical signal — "this is a curated template"), not CTA chrome. Preserved exactly per Change 7b. The fix migrates only the text color (`text-primary` → `text-violet-300`), not the background tint.
- **Spec 10A canonical alertdialog pattern (DeleteAccountModal precedent):** Reference Spec 10A for the canonical alertdialog pattern (`role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` + `aria-describedby`, `AlertTriangle` icon with `aria-hidden="true"`, severity-color CTA, `useFocusTrap` with focus restoration). Apply to DeleteRoutineDialog per Change 10 if pre-execution recon Step 9 finds drift. The severity-color CTA uses the canonical muted destructive palette (`bg-red-950/30 border border-red-400/30 text-red-100`) per `09-design-system.md` § "Severity color system".
- **`useFocusTrap()` canonical modal helper:** Reference the existing canonical hook (used in 37 modal/dialog components per BB-35 accessibility coverage). Pre-execution recon Step 9 confirms the kebab menu popover and DeleteRoutineDialog both use the hook canonically. Reuse the hook; do not patch the hook itself in 11B.
- **Canonical Breadcrumb component:** Reference the existing component used across the app. RoutinesPage breadcrumb (Music → Bedtime Routines) is verified canonical during execution and preserved exactly.
- **AudioProvider state + dispatch:** Reference `09-design-system.md` § "Music Feature — Technical Architecture" for the AudioProvider context system (`useAudioState()`, `useAudioDispatch()`). Change 5 reads `state.activeRoutine?.id` and dispatches `{ type: 'STOP_ROUTINE' }` — these are existing context exports and an existing action type. Pre-execution recon Step 13 confirms the exact hook names and dispatch shape from a reference call site. Do NOT introduce new action types or modify the reducer.
- **storageService.deleteRoutine:** Reference the existing `services/storage-service.ts` module. The signature is preserved exactly (`(id: string) => void`). Change 5 wraps the call with the conditional STOP_ROUTINE dispatch but does NOT modify `storageService` itself.
- **ROUTINE_TEMPLATES from data/music/routines.ts:** Reference the existing data file. The 4 templates are preserved as real content per Direction Decision 13 — NOT replaced with `FeatureEmptyState`. The new empty-state hint per Change 4 sits between the templates grid and the Create Routine CTA; it does NOT replace the templates and does NOT change the templates' content.
- **Anti-pressure copy voice:** The new empty-state hint per Change 4 follows the project's anti-pressure copy voice (CLAUDE.md "Anti-pressure voice", `01-ai-safety.md` § "Community Guidelines"): warm, never preachy, no exclamation point, no comparison, no urgency, sentence case, period terminator. The single hint reads as a soft invitation — "Tap a template to start, or create your own." — not as marketing voice or instruction text.
- **No new patterns introduced.** 11B is pattern application + 1 small behavioral fix. Every class string used in this spec is already shipped in `09-design-system.md` or in Spec 10A / Spec 11A canonical migrations. No `[UNVERIFIED]` design values.

---

## Out of Scope

- Atmospheric layer changes (Direction Decision 1 preserve)
- Per-tab atmospheric variants on RoutinesPage (deferred to Spec 11c)
- Bedtime Routine ritual onboarding walkthrough (Direction Decision 9; Spec 11c)
- Replacement of the 4 routine templates with `FeatureEmptyState` (Direction Decision 13 — preserve templates as content)
- AudioProvider state management or `audioReducer` logic (Direction Decision 24 — read-only consumption; only `STOP_ROUTINE` dispatch is added in 11B, no new action types or reducer logic)
- `storageService.deleteRoutine` implementation (Direction Decision 24 — the delete logic itself unchanged; the behavioral fix is in the consuming `RoutinesPage.handleDelete`)
- `ROUTINE_TEMPLATES` content in `data/music/routines.ts` (preserved exactly; no template additions, removals, or edits)
- `wr_routines` schema changes (Direction Decision 24; read-only)
- `wr_session_state.activeRoutine` schema changes (Direction Decision 25; read-only — Change 5 only reads `state.activeRoutine?.id`)
- `wr_listening_history` schema changes (Direction Decision 25; read-only)
- BB-26 / BB-27 audio Bible cross-cutting coordination logic (Direction Decision 26)
- All Spec 11A cluster surfaces — MusicPage, the three tabs, the audio cluster chrome (already shipped via Spec 11A; preserved)
- All Bible / Daily Hub / Settings / Insights / Auth / Dashboard / Local Support / Ask surfaces (already shipped via prior specs; preserved)
- All `AudioProvider`, `audioReducer`, `lib/audio-engine.ts` engine internals (Direction Decision 24)
- All audio-engine hooks (`useScenePlayer`, `useSleepTimer`, `useForegroundPlayer`, `useRoutinePlayer`, `useAmbientSearch`, `useSoundToggle`, `useFavorites`, `useListenTracker`, `useAudioDucking`, `useReaderAudioAutoStart`) (Direction Decision 24)
- AudioPill / AudioDrawer chrome (already migrated in Spec 11A)
- ContentPicker modal chrome (only audited in 11B; conditional migration only if drift found per Change 8)
- RoutineStepCard chrome (only audited in 11B; conditional migration only if drift found per Change 9)
- DeleteRoutineDialog alertdialog migration (only audited in 11B; conditional migration only if drift found per Change 10)
- DeleteRoutineDialog confirmation copy edits (preserved verbatim — copy edits are NOT in scope)
- All Music Spotify OAuth Phase 3.13 placeholder work (Direction Decision 27)
- Lazy-mount inactive panel performance optimization on RoutinesPage (Spec 11c performance pass)
- Backend Routines sync (greenfield; future spec)
- Spec 11A's `useSpotifyAutoPause` hook deletion (already shipped in Spec 11A Change 2)
- The empty-state copy text on RoutinesPage beyond the single new hint per Change 4 (no other copy edits — the page does not need additional copy)

---

## Acceptance Criteria

### RoutinesPage migrations

- [ ] `font-script` span removed from `<h1>` at `pages/RoutinesPage.tsx:125` (verify exact line) — heading reads "Bedtime Routines" as plain text inside the parent `<h1>`
- [ ] `GRADIENT_TEXT_STYLE` on the parent `<h1>` preserved exactly
- [ ] `headingRef` and `useElementWidth()` driving `HeadingDivider` width preserved exactly
- [ ] All other classes on the parent `<h1>` preserved exactly (`px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2`)
- [ ] Subtitle at `pages/RoutinesPage.tsx:127` migrated from `font-serif italic text-base text-white/60 sm:text-lg` to canonical body chrome (no `font-serif`, no `italic`; `font-sans` Inter inherited from page default; `text-white/60` preserved; responsive sizing `text-base sm:text-lg` preserved; `mx-auto mt-4 max-w-lg` layout preserved)
- [ ] Subtitle copy "Build your path to peaceful sleep" preserved exactly
- [ ] Create Routine CTA at `pages/RoutinesPage.tsx:187` migrated to canonical white-pill primary CTA Pattern 2 (exact class string from Spec 11A reference site, applied verbatim)
- [ ] `onClick={handleCreate}` preserved (auth gate via `useAuthModal` for logged-out users preserved)
- [ ] `min-h-[44px]` preserved on the Create Routine CTA per the canonical pattern
- [ ] `focus-visible:ring-white/50` canonical ring per the white-pill pattern
- [ ] Empty-state hint paragraph "Tap a template to start, or create your own." rendered between the routine cards grid and the Create Routine CTA wrapper
- [ ] Hint styling: `text-white/60 text-sm sm:text-base text-center mt-6 mb-4` (margins tuned during execution if needed for visual balance)
- [ ] Hint copy is a single sentence with period terminator, no exclamation point, no instruction-text imperative
- [ ] Hint renders only when `showBuilder === false` (hidden when RoutineBuilder is mounted; existing conditional render preserved)
- [ ] 4 templates from `ROUTINE_TEMPLATES` rendered as 4 RoutineCard instances (preserved as real content per Direction Decision 13; NOT replaced with `FeatureEmptyState`)
- [ ] User routines rendered after templates if any (existing `allRoutines = [...ROUTINE_TEMPLATES, ...userRoutines]` composition preserved)
- [ ] Canonical Breadcrumb (Music → Bedtime Routines) preserved exactly

### handleDelete behavioral fix

- [ ] When `state.activeRoutine?.id === deletingRoutine.id`, `dispatch({ type: 'STOP_ROUTINE' })` is called BEFORE `storageService.deleteRoutine`
- [ ] When `state.activeRoutine?.id !== deletingRoutine.id` (or `state.activeRoutine` is null), no STOP_ROUTINE dispatch fires
- [ ] `storageService.deleteRoutine(deletingRoutine.id)` called with the correct id on every delete (regardless of active-routine status)
- [ ] `refreshRoutines()` called on every delete
- [ ] `showToast(`Deleted "${deletingRoutine.name}"`)` called on every delete with the correct template literal
- [ ] `setDeletingRoutine(null)` called on every delete to close the DeleteRoutineDialog
- [ ] Order of operations: (1) conditional STOP_ROUTINE, (2) deleteRoutine, (3) refreshRoutines, (4) showToast, (5) setDeletingRoutine(null)
- [ ] AudioProvider state + dispatch hooks wired correctly (`useAudioState()` + `useAudioDispatch()` per `09-design-system.md` § "Music Feature — Technical Architecture", or whatever the exact hook names are per pre-execution recon Step 13)

### RoutineBuilder migrations

- [ ] Save Routine CTA at `components/music/RoutineBuilder.tsx:315` (verify) migrated to canonical white-pill primary CTA Pattern 2
- [ ] `onClick` handler (calls `handleSave`) preserved
- [ ] Disabled-state logic preserved (button disabled when form invalid)
- [ ] Accessible name "Save Routine" (button text) preserved
- [ ] `min-h-[44px]` preserved per the canonical pattern
- [ ] Cancel button verified canonical secondary (or migrated if drift found)
- [ ] Form flow preserved: Routine Name input, Steps editor, Sleep Timer selector, Fade Duration selector, Cancel/Save flow
- [ ] ContentPicker mount preserved (RoutineBuilder still opens ContentPicker when adding scenes/scriptures/stories)
- [ ] Active-state UI verified canonical (or migrated per Change 6c findings) — RoutineStepCard selected state (if any), Sleep Timer interval selector active state, Fade Duration selector active state

### RoutineCard migrations

- [ ] Start CTA at `components/music/RoutineCard.tsx:148` (verify) migrated to canonical white-pill primary CTA Pattern 2
- [ ] `onClick` handler (starts the routine) preserved
- [ ] Accessible name preserved
- [ ] `min-h-[44px]` preserved per the canonical pattern
- [ ] Card chrome `border-white/[0.12]` preserved (already canonical per Spec 11A; verified)
- [ ] Template badge at `components/music/RoutineCard.tsx:108` (verify) migrated text color from `text-primary` to `text-violet-300`
- [ ] Template badge `bg-primary/10` background tint preserved (decorative per Direction Decision 20 / Decision 11)
- [ ] All other classes on the badge preserved (sizing, padding, rounded corners)
- [ ] Kebab menu (Clone for templates / Edit + Duplicate + Delete for user routines) verified canonical popover with `useFocusTrap` (or migrated per Change 7c findings)
- [ ] Step icons preserved
- [ ] "X steps · ~N min" copy preserved
- [ ] Clone (templates) / Edit / Duplicate / Delete (user routines) handlers preserved exactly

### ContentPicker (conditional)

- [ ] Verified canonical, OR migrated per Change 8a findings (if drift found, applied canonical migrations matching Spec 11A patterns)
- [ ] Scene / scripture / story selection flow preserved exactly
- [ ] Modal chrome (focus trap, click-outside dismiss, Escape dismiss) preserved exactly

### RoutineStepCard (conditional)

- [ ] Verified canonical, OR migrated per Change 9a findings
- [ ] Single-step rendering preserved exactly

### DeleteRoutineDialog (conditional)

- [ ] `aria-modal="true"` present on the dialog root
- [ ] `role="alertdialog"` present (not `role="dialog"`)
- [ ] `aria-labelledby` references the heading element id; `aria-describedby` references the body description element id
- [ ] `AlertTriangle` icon (from lucide-react) in the heading row with `aria-hidden="true"`
- [ ] Delete CTA in muted destructive severity (`bg-red-950/30 border border-red-400/30 text-red-100` per the canonical severity palette)
- [ ] Cancel CTA canonical secondary
- [ ] `useFocusTrap` with focus restoration to the trigger element (kebab menu Delete option) preserved
- [ ] Confirmation copy preserved exactly (no copy edits in scope)
- [ ] Click-outside dismiss preserved
- [ ] Escape dismiss preserved

### Atmospheric (Direction Decision 1 preserve)

- [ ] `<Layout>` wrapper preserved
- [ ] Inline `ATMOSPHERIC_HERO_BG` style on the hero `<section>` preserved
- [ ] `bg-dashboard-dark` body root inherited from `<Layout>` preserved
- [ ] No `BackgroundCanvas` introduced
- [ ] No `HorizonGlow` introduced
- [ ] No `GlowBackground` introduced

### Empty-state (Direction Decision 13)

- [ ] 4 templates preserved as real content (NOT replaced with `FeatureEmptyState`)
- [ ] Subtle warm one-liner hint added per Change 4
- [ ] Create Routine CTA preserved at the bottom of the routines list view

### Tests

- [ ] All existing tests in `pages/__tests__/RoutinesPage.test.tsx` and `components/music/__tests__/RoutineBuilder.test.tsx` pass after migrations
- [ ] No regressions in any other test file (cluster-wide test suite passes)
- [ ] `pages/__tests__/RoutinesPage.test.tsx` adds: assertion that `<h1>` does NOT contain a `font-script` span; assertion that `<h1>` contains "Bedtime Routines" plain text; assertion that subtitle does NOT have `font-serif` or `italic` classes; assertion that subtitle copy unchanged; class-string assertion that Create Routine CTA matches canonical white-pill primary; assertion that empty-state hint copy "Tap a template to start, or create your own." renders between templates and Create Routine CTA; behavioral test that handleDelete dispatches STOP_ROUTINE when active-routine matches; behavioral test that handleDelete does NOT dispatch STOP_ROUTINE when active-routine differs (or is null); regression assertions on `storageService.deleteRoutine` called, `refreshRoutines` called, `showToast` called, `setDeletingRoutine(null)` called on both paths
- [ ] `components/music/__tests__/RoutineBuilder.test.tsx` adds: class-string assertion that Save Routine CTA matches canonical white-pill primary; conditional active-state assertions if Change 6c found drift
- [ ] `components/music/__tests__/RoutineCard.test.tsx` (created if not exists) adds: class-string assertion that Start CTA matches canonical white-pill primary; assertion that Template badge text uses `text-violet-300`; assertion that Template badge background `bg-primary/10` preserved; conditional kebab menu canonical chrome assertion if Change 7c found drift
- [ ] `components/music/__tests__/ContentPicker.test.tsx` (created if Change 8 found drift) adds: conditional assertions per migrations applied
- [ ] `components/music/__tests__/DeleteRoutineDialog.test.tsx` (created if Change 10 found drift) adds: assertion that `aria-modal="true"` present; assertion that `AlertTriangle` icon present with `aria-hidden`; assertion that Delete CTA in muted destructive severity; assertion that Cancel CTA canonical secondary
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (no new failures; ~12–15 net assertions added per the test count expectation)

### Manual eyeball checks

- [ ] `/music/routines` renders normally for logged-in user
- [ ] `/music/routines` renders normally for logged-out user (templates browse, kebab menu Clone gated, Create Routine gated)
- [ ] Hero shows "Bedtime Routines" `<h1>` with no script font (gradient + bold weight only)
- [ ] Subtitle "Build your path to peaceful sleep" renders in canonical body chrome (no italic, `font-sans` Inter, `text-white/60`)
- [ ] HeadingDivider renders below the subtitle
- [ ] Breadcrumb (Music → Bedtime Routines) renders below the hero
- [ ] 4 template RoutineCards render in the grid with Start CTAs as canonical white pills (matching the homepage Get Started visual)
- [ ] Template badges show "Template" text in `text-violet-300` with subtle violet `bg-primary/10` tint background
- [ ] Empty-state hint reads "Tap a template to start, or create your own." between templates and Create Routine CTA
- [ ] Create Routine CTA renders as canonical white pill (matching the homepage Get Started visual and the Spec 11A migrated CTAs)
- [ ] Clicking Create Routine (logged in) opens RoutineBuilder inline; (logged out) opens auth modal
- [ ] RoutineBuilder Save Routine CTA renders as canonical white pill
- [ ] Clicking RoutineCard Start initiates routine playback (preserve behavior)
- [ ] Clicking kebab menu on a user routine shows Edit / Duplicate / Delete options
- [ ] Clicking kebab menu on a template shows Clone option (auth-gated)
- [ ] Clicking Delete opens DeleteRoutineDialog
- [ ] DeleteRoutineDialog shows AlertTriangle + canonical secondary Cancel + muted destructive Delete CTA (verified canonical or migrated per Change 10)
- [ ] Confirming delete with the active routine: AudioPill stops claiming "Currently in routine: <name>" (the new behavioral fix)
- [ ] Confirming delete with a non-active routine: AudioPill / drawer state unchanged
- [ ] Toast appears with `Deleted "<name>"` message
- [ ] DeleteRoutineDialog closes after confirm

### Behavioral preservation

- [ ] AudioProvider state + dispatch wired correctly for `STOP_ROUTINE` (read via `useAudioState()`, write via `useAudioDispatch()`, or whatever hook names recon Step 13 confirms)
- [ ] `storageService.deleteRoutine` implementation unchanged
- [ ] `wr_routines` schema unchanged (Direction Decision 24 read-only)
- [ ] `wr_session_state.activeRoutine` schema unchanged (Direction Decision 25 read-only)
- [ ] All other RoutinesPage handlers preserved exactly (`handleCreate`, `handleClone`, `handleEdit`, `handleDuplicate`, `handleSave`)
- [ ] RoutineBuilder form state management preserved exactly (Routine Name, Steps editor, Sleep Timer, Fade Duration, Cancel/Save)
- [ ] ContentPicker scene / scripture / story selection flow preserved exactly
- [ ] Auth gates preserved (Create Routine via `useAuthModal`; Clone on templates via `useAuthModal`)
- [ ] Breadcrumb navigation preserved (Music → Bedtime Routines, clicking "Music" routes back to `/music`)
- [ ] `showBuilder` toggle preserved exactly (true while builder is mounted; false in routines list view)
- [ ] `editingRoutine` state preserved exactly (set by `handleEdit`, cleared by Cancel / Save)
- [ ] `deletingRoutine` state preserved exactly (set by kebab Delete click, cleared by `handleDelete`)

### Regression checks

- [ ] All Spec 11A surfaces unchanged (MusicPage shell, the 3 tabs, AudioPill, AudioDrawer, scene cards, scripture cards, bedtime story cards, SharedMixHero, SaveMixButton, FavoriteButton, RoutineInterruptDialog, ContentSwitchDialog, DrawerNowPlaying, TimerTabContent, RoutineStepper, WaveformBars)
- [ ] All Bible surfaces unchanged (BibleReader, BibleBrowser, MyBible, ReadingHeatmap, BibleProgressMap, MemorizationDeck, EchoCard, ExplainPanel, ReflectPanel, NotificationPermissionPrompt, BibleSearchMode)
- [ ] All Daily Hub surfaces unchanged (DailyHub root, DevotionalTabContent, PrayTabContent, JournalTabContent, MeditateTabContent, all sub-pages)
- [ ] All Settings / Insights / Auth / Dashboard / Local Support / Ask surfaces unchanged
- [ ] AudioProvider behavior unchanged (only consumes via dispatch — no new action types, no reducer changes)
- [ ] AudioPill / AudioDrawer behavior unchanged (the new STOP_ROUTINE dispatch triggers existing reducer logic that already correctly clears `activeRoutine` from state)
- [ ] BB-26 / BB-27 audio Bible coordination unchanged
- [ ] `wr_listening_history` schema unchanged
- [ ] `wr_routines` storage CRUD unchanged
- [ ] `wr_session_state.activeRoutine` schema unchanged
- [ ] Auth simulation flow unchanged (`AuthProvider` context, `useAuth()` hook, `useAuthModal()` context, `wr_auth_simulated` localStorage)
- [ ] No new localStorage keys introduced
- [ ] No new Tailwind classes added beyond existing canonical patterns from `09-design-system.md` and Spec 10A / Spec 11A migrations
- [ ] No new dependencies added
- [ ] Bundle size unchanged
