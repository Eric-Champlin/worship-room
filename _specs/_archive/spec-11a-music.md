# Spec 11A: Music Page Shell + 3 Tabs + Audio Cluster Chrome

**Master Plan Reference:** Direction document at `_plans/direction/music-2026-05-06.md` is the locked decision set for the Music cluster. Recon at `_plans/recon/music-2026-05-06.md` is the source of truth for current line numbers, the `bg-primary` / `text-primary` / `border-white/10` / `bg-primary/X` audit results, the `useSpotifyAutoPause` consumer audit, and the AudioDrawer focus restoration finding. Spec 11A is the **first sub-spec** of the Music cluster — it establishes cluster patterns (active-tab opacity unification at `bg-white/15`, white-pill primary CTA migrations across the audio cluster, border opacity unification at `bg-white/[0.12]`, decorative tint preservation per Decision 11) that Spec 11B (RoutinesPage + RoutineBuilder + RoutineCard + ContentPicker + 4 dialogs + the routine-delete behavioral fix) will consume. Specs 1A–10B (everything from Daily Hub foundation through Insights) are prerequisites — all merged into the working branch at the time of writing.

This is a **large spec**. ~9,200 production LOC of source edits + ~3,500–4,500 LOC of test updates spread across ~22 production files and ~22 test files. The work is broad rather than deep: eleven distinct migration changes (active-tab opacity unification on MusicPage, six `bg-primary` solid CTAs migrated to canonical white-pill primary, two `text-primary` text buttons migrated to `text-violet-300` for WCAG AA contrast, border opacity unified from `border-white/10` to `border-white/[0.12]` across rolls-own card chrome on six sites, six active-state drift instances migrated within the audio cluster, two BB-33 animation token migrations, one `aria-hidden` addition on `WaveformBars`, AudioDrawer focus restoration verification with conditional fix, deletion of the `(coming soon)` placeholder copy line, deletion of the commented `useSpotifyAutoPause` import plus the hook file if no live consumers, and verification of decorative tint preservation per Decision 11) all applied to the MusicPage shell + 3 tab content components (WorshipPlaylistsTab, AmbientBrowser, SleepBrowse) + the AudioDrawer/AudioPill flyout cluster + scene/sound/scripture/story cards + 2 audio dialogs.

Patterns this spec USES (already shipped via Specs 1A–10B): `bg-dashboard-dark` body root + `<PageHero>` + `ATMOSPHERIC_HERO_BG` (canonical inner-page atmospheric pattern, shared with Friends, Grow, Settings, MyPrayers, Insights), white-pill primary CTA Pattern 2 per `09-design-system.md` § "White Pill CTA Patterns", severity color system per `09-design-system.md` (no severity sites in 11A but cross-referenced for cluster consistency), Daily Hub 1B violet text-button treatment (`text-violet-300 hover:text-violet-200`), Daily Hub 1B canonical active text on active-state (`text-white`), Spec 10A canonical active-state pattern (`bg-white/15` + orientation-appropriate borders), Spec 10A canonical Tab WAI-ARIA pattern (`role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` + `tabIndex` roving + arrow-key navigation), BB-33 animation tokens (`ANIMATION_DURATIONS.fast`, `ANIMATION_DURATIONS.base`, `ANIMATION_DURATIONS.slow`), `useFocusTrap()` canonical modal helper, `<SectionHeader variant="gradient">` canonical heading.

Patterns this spec INTRODUCES at the cluster level: none. 11A is pure pattern application across a new surface cluster.

Patterns this spec MODIFIES: MusicPage tab active-state opacity (`bg-white/[0.12]` → `bg-white/15`), six `bg-primary` solid CTAs across the audio cluster, two `text-primary` text buttons across the cluster (with a third site preserved as decorative-only per Decision 11 unless pre-execution recon finds text-button context), ~6 active-state drift instances within the audio cluster (DrawerNowPlaying active foreground card, TimerTabContent active timer presets ×3, RoutineStepper current step, AudioPill border, FeaturedSceneCard active scene play overlay, SceneCard active scene play overlay), border opacity across ~6 rolls-own card chrome sites (ScriptureSessionCard, BedtimeStoryCard, SavedMixCard, "Build Your Own Mix" panel in AmbientBrowser, "Build a Bedtime Routine" card in SleepBrowse, AudioDrawer), WaveformBars `aria-hidden` attribute, two hardcoded ms values to BB-33 tokens (FavoriteButton bounce, AudioDrawer entering-state), the `(coming soon)` placeholder copy line in AmbientBrowser (delete), and the commented `useSpotifyAutoPause` import line in WorshipPlaylistsTab (delete + conditional hook file deletion).

The `<FrostedCard>` component is intentionally NOT adopted on Music cards in 11A per Direction Decision 4 — Music's cards have intentional chrome variance (scene cards carry visual weight via gradient backgrounds with no border by design; sound buttons are transparent buttons with no border by design; rolls-own cards migrate border opacity only). Blanket FrostedCard adoption is deferred to a hypothetical Spec 11c.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/music-2026-05-06.md`, `_plans/direction/music-2026-05-06.md`) are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/music` — top-level Music hub. Default tab is Worship Playlists when no `?tab=` parameter is present or when the parameter value is invalid. Atmospheric layer (`bg-dashboard-dark` body root + `<PageHero>` + `ATMOSPHERIC_HERO_BG` hero) is preserved exactly per Direction Decision 1. Active-tab indicator at `pages/MusicPage.tsx:219` migrates from `bg-white/[0.12]` to `bg-white/15` per Direction Decision 2 / Spec 10A canonical. Pill+halo border treatment is preserved (the pill chrome is the design intent; only opacity migrates). All other tab pattern semantics — `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` roving, arrow-key navigation, URL-backed state via `useSearchParams`, sticky shadow `IntersectionObserver` — are already canonical per Spec 10A and preserved exactly.
- `/music?tab=playlists` — Worship Playlists tab. Renders the `WorshipPlaylistsTab` component (canonical hero, Spotify embeds via `SpotifyEmbed`, Featured + Explore grid, `<SectionHeader variant="gradient">`). The commented `// import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'` line at line 6 is deleted per Direction Decision 11. The `hooks/useSpotifyAutoPause.ts` file is deleted IF pre-execution recon confirms zero live consumers across `frontend/src/`; if any live consumer is found, only the comment line is deleted and the finding is surfaced. All other WorshipPlaylistsTab chrome is verified canonical and preserved.
- `/music?tab=ambient` — Ambient Sounds tab. Renders the `AmbientBrowser` component (Saved Mixes section for authed users, Featured Scenes carousel via `FeaturedSceneCard`, All Scenes grid via `SceneCard`, "Build Your Own Mix" panel via `SoundCard` + `SoundGrid`, `SceneUndoToast`, `RoutineInterruptDialog` mount). The `<span className="text-primary-lt/50">Search all music (coming soon)</span>` placeholder copy line at line 99 is deleted per Direction Decision 10 (cleans the surface and removes a WCAG AA contrast failure on `text-primary-lt/50`). Only the placeholder copy span is deleted; any surrounding hidden search affordance scaffolding is preserved if present. The "Build Your Own Mix" panel border migrates from `border-white/10` to `border-white/[0.12]` per Direction Decision 4. `FeaturedSceneCard` and `SceneCard` active-scene play overlays migrate from `bg-primary/80` to white-circle with violet icon per Direction Decision 19. Scene gradient backgrounds (preserve — gradient art is the chrome, not a border) and sound button transparent chrome (preserve — buttons not cards) are unchanged. Behavioral preservation: scene preset selection, ambient mix builder, sound favorites toggle, listening history logging.
- `/music?tab=sleep` — Sleep & Rest tab. Renders the `SleepBrowse` component (`BibleSleepSection` BB-26 audio Bible integration, `TonightScripture`, four `ScriptureCollectionRow` strips with `ScriptureSessionCard`, `BedtimeStoriesGrid` with `BedtimeStoryCard`, "Build a Bedtime Routine" CTA card). `ScriptureSessionCard` and `BedtimeStoryCard` and the "Build a Bedtime Routine" CTA card all migrate border opacity from `border-white/10` to `border-white/[0.12]` per Direction Decision 4. `BibleSleepSection.tsx:57` `bg-primary/10` book icon container is preserved per Direction Decision 20 (decorative tint, not CTA chrome). `ScriptureTextPanel.tsx:45` `bg-primary/10 border-l-2 border-primary` active-verse highlight is preserved per Decision 20 (verify text contrast on the highlighted verse text passes WCAG AA; surface finding without patching if it fails). BB-26 audio Bible playback and BB-27 ambient coordination logic (Bible audio plays → ambient pauses) are preserved exactly per Direction Decision 26.
- `/music?tab=<invalid-value>` — defaults to Worship Playlists (invalid params do not crash the page; they fall through the existing tab guard already canonical per Spec 10A precedent).
- `/music?mix=<base64>` — shared-mix variant. The `SharedMixHero` panel renders above the active tab with the parsed mix payload. The purple-to-light gradient is preserved per Direction Decision 16 (the gradient is the celebration of receiving a mix from a friend — the emotional peak of the surface). Only the "Play This Mix" CTA at line 96 migrates from saturated `bg-primary` to canonical white-pill primary CTA Pattern 2. Sound chips, mix payload deserialization, and play-on-click behavior are preserved exactly.
- All routes globally → `AudioPill` (the persistent ambient pill in the layout) renders at the bottom of the viewport whenever audio state is non-idle. Border migrates from `border border-primary/40` (saturated purple) to canonical muted-white. Pre-execution recon Step 6d resolves the exact target opacity: `border border-white/[0.12]` (canonical content-card border opacity, matching the rest of the cluster) is the default; `border border-white/30` is the alternate if recon's intent reads as "active-indicator visibility" since AudioPill is the "audio is playing" indicator. CC surfaces the choice during execution if ambiguous; default is `border-white/[0.12]`. `WaveformBars` (rendered inside AudioPill and elsewhere) gains `aria-hidden="true"` on the parent element wrapping the animated bars per Direction Decision 22; the `bg-primary` animated bars themselves at lines 12, 20, 28 are preserved per Decision 20 (decorative animation, not CTA chrome). The `FavoriteButton` bounce-animation `setTimeout(..., 100)` at line 45 migrates to `setTimeout(..., ANIMATION_DURATIONS.fast)` per Direction Decision 21 (BB-33 token alignment).
- All routes globally → `AudioDrawer` (the full-height flyout) opens via `AudioPill` click. Border migrates from `border-white/10` to `border-white/[0.12]` per Direction Decision 4. The `rgba(15, 10, 30, 0.95)` purple-tinted dark frosted-glass background is preserved exactly per Direction Decision 15 (documented intentional design decision; full-height flyout chrome is genuinely different from canonical content cards). The entering-state `setTimeout(..., 300)` at line 83 migrates to `setTimeout(..., ANIMATION_DURATIONS.base)` per Direction Decision 21. Focus trap, click-outside dismiss, swipe-down dismiss, and Escape dismiss are preserved exactly. Focus restoration to the triggering element (`AudioPill` or `AmbientSoundPill`) is verified during execution per Direction Decision 23; if drift is found, the conditional fix lives in 11A. Inside the drawer, `DrawerNowPlaying` active foreground card at line 100 migrates from `bg-primary/20 text-primary-lt` to `bg-white/15 text-white` (Decisions 18 + 19); the "Play" CTA at line 59 migrates to canonical white-pill primary; the `DrawerTabs` notification dot at line 73 (`bg-primary`) is preserved per Decision 20. `TimerTabContent` active timer presets at lines 269/286/334 migrate from `bg-primary text-white` to `bg-white/15 text-white border border-white/30` (isolated-pill variant since timer presets are isolated chip selectors); the "Timer Start" CTA at line 354 migrates to canonical white-pill primary. `RoutineStepper` current-step active class at line 42 migrates from `bg-primary text-white` to `bg-white/15 text-white` (or white-pill if pre-execution recon classifies it as a CTA rather than active-state pill); the completed-step `bg-primary/30` decorative tint at line 41 is preserved per Decision 20, and the adjacent `text-primary` is preserved as decorative-only IF pre-execution recon Step 7 confirms decorative context (migrate to `text-violet-300` if text-button context found).
- All routes globally → audio dialogs `RoutineInterruptDialog` ("Stop routine to play this scene" CTA at line 41) and `ContentSwitchDialog` ("Switch" CTA at line 52) migrate their primary CTAs from saturated `bg-primary` to canonical white-pill primary per Direction Decision 17.
- All routes globally → `SaveMixButton` "Save Mix" CTA at line 144 migrates from saturated `bg-primary` to canonical white-pill primary per Direction Decision 17. The auth-gate logic (logged-out user click opens the auth modal), the name input flow, the ARIA-live announcement timeout (`setTimeout(..., 3000)` at line 92 — semantic, not animation; preserved per Direction Decision 21), and all behavioral semantics are preserved exactly.

The single non-route effect: ~22 test files (`pages/__tests__/MusicPage.test.tsx`, `components/music/__tests__/{WorshipPlaylistsTab,SpotifyEmbed,SpotifyEmbed-offline,FavoriteButton,SharedMixHero,DeleteMixDialog,SavedTabContent}.test.tsx`, `components/audio/__tests__/{AmbientBrowser,AmbientBrowser.integration,AudioDrawer,AudioPill,DrawerNowPlaying,TimerTabContent,RoutineStepper,RoutineInterruptDialog,ContentSwitchDialog,SaveMixButton,SceneCard,FeaturedSceneCard,ScriptureSessionCard,BedtimeStoryCard,BibleSleepSection,SleepBrowse}.test.tsx`) get class-string assertions migrated for the active-tab opacity, the six white-pill CTAs, the two text-violet-300 text-button migrations, the six active-state drift migrations, the six border-opacity unifications, the WaveformBars `aria-hidden` addition, the AudioDrawer focus restoration regression test, the `(coming soon)` copy absence assertion, and the `useSpotifyAutoPause` import absence assertion. Behavioral assertions (audio engine wiring, scene player, sleep timer, ambient mix builder, foreground content, routine player, BB-26 audio Bible playback, BB-27 ambient coordination, saved mix CRUD, mix sharing URL serialization, scene preset selection, sleep timer countdown, sound favorites toggle, listening history logging, auth gates on Save Mix and Bookmark, tab URL state, shared mix URL hero parsing) are preserved.

---

## Overview

Music is one of the five canonical navbar items (Daily Hub, Bible, Grow, Prayer Wall, Music) and one of the few remaining surfaces not yet fully migrated to the Round 3 / Round 4 visual canon. Spec 11A focuses on the `/music` shell, its three tab content surfaces (Worship Playlists, Ambient Sounds, Sleep & Rest), and the audio cluster chrome — `AudioPill`, `AudioDrawer` and its sub-components, scene/sound/scripture/story cards, the shared-mix hero, the saved-mix card, the favorite button, the save-mix button, and two interruption-class dialogs. Spec 11B will follow with the RoutinesPage stack (`/music/routines`, `RoutineBuilder`, `RoutineCard`, `ContentPicker`, four dialogs) and the routine-delete behavioral fix. 11A is sequenced first because every cluster pattern it establishes — active-tab opacity at `bg-white/15`, white-pill primary CTA migrations across the audio cluster, border opacity unification at `bg-white/[0.12]`, decorative tint preservation per Decision 11 — is a pattern Spec 11B will consume. Shipping 11A first means 11B is mechanical pattern application against an already-canonical Music precedent rather than two specs negotiating cluster patterns in parallel.

The work in 11A is broad-but-mechanical. It does not introduce new visual primitives, new auth gates, new copy, new architecture, or new behavior. Every change is one of: (a) replacing one Tailwind class string with another already-shipped Tailwind class string from the design system or from Spec 10A's canonical patterns, (b) adding a single ARIA attribute to a decorative element, (c) replacing a hardcoded ms value with a BB-33 animation token, (d) deleting a half-finished placeholder copy line or a commented-out import (and conditionally deleting an unreferenced hook file), or (e) verifying that an already-correct behavior (AudioDrawer focus restoration) is in fact correct, with a conditional fix folded into the spec only if drift is found. There is no behavioral change in 11A. (The behavioral fix on routine delete is folded into Spec 11B per Direction Decision 14.)

The atmospheric layer is preserved per Direction Decision 1: `bg-dashboard-dark` body root, `<PageHero>` component, and `ATMOSPHERIC_HERO_BG` hero stay exactly as they are. No `BackgroundCanvas`, no `HorizonGlow`, no `GlowBackground` is introduced — those are canonical for the Round 3 hero pattern, but the inner-page atmospheric pattern (which Music shares with Friends, Grow, Settings, MyPrayers, Insights) is the right home for Music, not the hero pattern. Per-tab atmospheric variation (Sleep darker than Worship, ambient-active subtle scene tint) is a real Round 3 enhancement opportunity that introducing on a visual-migration spec would be the same anti-pattern rejected on Settings/Insights — deferred to Spec 11c. The `AudioDrawer` `rgba(15, 10, 30, 0.95)` background is preserved per Direction Decision 15 (documented intentional design decision; full-height flyout chrome is genuinely different from canonical content cards). The `SharedMixHero` purple gradient is preserved per Direction Decision 16 (the gradient is the celebration of receiving a mix from a friend — the emotional peak of the surface). Scene gradient backgrounds in `data/scene-backgrounds.ts` are preserved (gradient art is the chrome). Sound button transparent chrome is preserved (buttons not cards). All `bg-primary/X` decorative tints enumerated in Direction Decision 20 are preserved (book icon container in BibleSleepSection, completed-step tint in RoutineStepper, notification dot in DrawerTabs, animated waveform bars in WaveformBars, active-verse highlight in ScriptureTextPanel, Template badge background in RoutineCard which is touched by Spec 11B). The `ring-primary` selection rings on scene cards (if any) are preserved per the same Decision 11 / Decision 20 precedent.

The behavioral semantics that must NOT change in this spec: the entire audio engine internals — `AudioProvider.tsx`, `audioReducer.ts`, `lib/audio-engine.ts`, and every hook (`useScenePlayer`, `useSleepTimer`, `useForegroundPlayer`, `useRoutinePlayer`, `useAmbientSearch`, `useSoundToggle`, `useFavorites`, `useListenTracker`, `useAudioDucking`, `useReaderAudioAutoStart`) — per Direction Decision 24 (visual migration ONLY); BB-26 audio Bible playback (`AudioPlayButton`, `AudioPlayerExpanded`, `AudioPlayerSheet`, `AudioPlayerMini`, `BibleSleepSection` BB-27 wiring) per Direction Decision 26; the `wr_listening_history` schema (no field additions, removals, or renames) per Direction Decision 25, including the cross-cutting consumers `hooks/useGardenElements.ts:62` (Dashboard garden hook) and `services/badge-engine.ts:289` (Worship Listener badge); the auth gates on Save Mix, Bookmark, and Routines Create/Clone (the chrome migrates; the gates do not move); the tab URL state (`?tab=playlists|ambient|sleep`); the shared-mix URL hero parsing (`?mix=base64`); saved mix CRUD (`MixActionsMenu`, `DeleteMixDialog`); mix sharing URL serialization; the `SaveMixButton` ARIA-live announcement clear timeout (3000ms — semantic, not animation, preserved per Direction Decision 21); the `useFocusTrap()` hook and its restoration semantics (verified, fixed only if drift found); and every dialog's click-outside / Escape / focus-trap behavior.

The cluster pattern this spec ships forward to 11B: the active-state class strings (`bg-white/15 text-white` with `border border-white/30` for isolated-pill variant; `bg-white/15 text-white` for active-foreground variant) and the canonical white-pill primary CTA Pattern 2 are precedent for RoutinesPage and the RoutineBuilder/RoutineCard/ContentPicker stack. The border opacity unification at `border-white/[0.12]` is precedent for any rolls-own card chrome 11B touches. The `text-primary` → `text-violet-300` text-button migration is precedent for `RoutineCard.tsx:108` Template badge text. The decorative-tint preservation per Decision 20 is precedent for `RoutineCard.tsx:108` `bg-primary/10` Template badge background. After 11A and 11B both ship, the entire Music cluster is canonical and ready to participate in any future Round 4 / Round 5 visual work.

---

## User Story

As a **logged-in user navigating to `/music`** to play a worship playlist, build an ambient mix, or settle into a Sleep & Rest scripture session, I want the page to feel visually consistent with the rest of the app. Today the active-tab chrome at `pages/MusicPage.tsx:219` uses `bg-white/[0.12]` while the rest of the cluster uses `bg-white/15` — a visible drift. Six primary CTAs across the audio cluster (`SharedMixHero` "Play This Mix", `SaveMixButton` "Save Mix", `RoutineInterruptDialog` "Stop routine", `ContentSwitchDialog` "Switch", `DrawerNowPlaying` "Play", `TimerTabContent` "Timer Start") render as saturated `bg-primary` solid-fill pills while the homepage Get Started button, the RegisterPage hero CTA, and every other primary CTA in the app renders as a translucent white pill. Two text buttons (`SavedMixCard` Play, `DrawerNowPlaying` active foreground card text) render in `text-primary` purple that fails WCAG AA contrast against the dark background. Six rolls-own card chrome sites (ScriptureSessionCard, BedtimeStoryCard, SavedMixCard, "Build Your Own Mix" panel, "Build a Bedtime Routine" card, AudioDrawer) use `border-white/10` while the rest of the cluster uses `border-white/[0.12]`. Six active-state drift sites within the audio cluster render with saturated purple chrome that breaks the cluster-wide muted-white pattern Spec 10A established. After 11A, every active-tab indicator, every primary CTA, every text button, every rolls-own card border, and every active-state pill matches the canonical pattern — consistent, accessible, and intentional.

As a **logged-out visitor browsing `/music?tab=ambient`** scrolling down through Featured Scenes and All Scenes looking for an ambient mix to listen to, I want the page to not feel half-finished. Today the AmbientBrowser at line 99 contains a `<span class="text-primary-lt/50">Search all music (coming soon)</span>` placeholder copy line. The copy reads as a broken promise — the user can't actually search; the affordance is dead — and the `text-primary-lt/50` styling fails WCAG AA contrast. After 11A, the placeholder copy is gone. The surrounding hidden search-affordance scaffolding (if present) is preserved so a future spec can wire real search without rebuilding the layout, but the broken-promise copy is no longer in the DOM.

As a **developer maintaining `WorshipPlaylistsTab.tsx`** scanning imports during a future spec, I want the file to not contain commented-out imports referencing hooks that may or may not exist. Today line 6 reads `// import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'` — a stale comment from an in-progress experiment that never landed. After 11A, the comment line is deleted. If `useSpotifyAutoPause` has zero live consumers across `frontend/src/` (which pre-execution recon Step 5 verifies), the hook file `hooks/useSpotifyAutoPause.ts` and any associated test file are also deleted; if any live consumer is found, only the comment line is deleted and the finding is surfaced before any further action.

As a **screen-reader user listening to ambient audio** with the `AudioPill` rendered at the bottom of every page, I want the animated `WaveformBars` decoration to not announce itself as content. Today the bars render without `aria-hidden`, so a screen reader reads them as content during navigation. After 11A, `aria-hidden="true"` lives on the parent element wrapping the animated bars; the bars remain visible and animated for sighted users but are silent to assistive tech. The `bg-primary` color of the animated bars themselves at lines 12, 20, 28 is preserved per Decision 20 (decorative animation, not CTA chrome).

As a **keyboard-only user opening the `AudioDrawer` via `AudioPill`**, I want focus to restore to the `AudioPill` (the triggering element) when the drawer closes. The `useFocusTrap()` hook is canonical and supports restoration; pre-execution recon Step 12 verifies whether the restoration target is correctly wired. If working correctly, no code change is made (a regression test is optionally added asserting focus returns to the triggering element on close). If drift is found, the conditional fix lives in 11A — either passing the triggering element ref to `useFocusTrap()` if the hook supports it, or implementing focus restoration via a stored ref before drawer mount that is restored in the `onClose` handler.

As a **mobile user playing an ambient scene** and tapping the active scene's play overlay on a `FeaturedSceneCard` or `SceneCard`, I want the active overlay to feel like the canonical Music pattern — a white circle with a violet play icon over a dimmed background. Today the active overlay renders as `bg-primary/80` (saturated purple) which clashes with the muted-white pattern the rest of the cluster uses. After 11A, the overlay is `bg-black/40` with an inner white-circle (`rounded-full bg-white p-3`) carrying a violet (`text-primary`) play icon — preserving the dim background and the visual cue that the scene is active, while aligning the chrome with the cluster.

As a **future spec author working on RoutinesPage (Spec 11B)** or another Round-4-pending Music surface, I want the cluster patterns established by 11A to be canonical and ready to reuse. After 11A, the active-state class strings, the canonical white-pill primary CTA Pattern 2 alignment for the audio cluster, the border opacity unification at `border-white/[0.12]`, the `text-primary` → `text-violet-300` text-button precedent, and the Decision 20 decorative tint preservation list are all canonical and ready to apply against RoutinesPage's similar tab structure, CTA pattern, and rolls-own card chrome.

---

## Requirements

### Functional Requirements

1. **MusicPage active-tab opacity unification (Change 1).** In `frontend/src/pages/MusicPage.tsx` at line 219 (verify exact line during pre-execution recon Step 4), migrate the active-tab class string from `bg-white/[0.12] border border-white/[0.15]` to `bg-white/15 border border-white/[0.15]` per Direction Decision 2. The pill+halo border treatment is preserved (the pill chrome is the design intent; only the active-state opacity migrates). All other tab pattern semantics — `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` roving, arrow-key navigation, URL-backed state via `useSearchParams`, sticky shadow `IntersectionObserver` — are already canonical per Spec 10A and preserved exactly. Default behavior on `?tab=<invalid-value>` defaults to Worship Playlists is preserved.
2. **WorshipPlaylistsTab cleanup (Change 2).** In `frontend/src/components/music/WorshipPlaylistsTab.tsx` at line 6 (verify exact line during pre-execution), delete the comment line `// import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'`. During pre-execution recon Step 5, run a grep for any non-comment imports of `useSpotifyAutoPause` across `frontend/src/`. If zero live consumers are found, also delete `frontend/src/hooks/useSpotifyAutoPause.ts` and any associated test file (`hooks/__tests__/useSpotifyAutoPause.test.ts` or equivalent). If any live consumer is found, only delete the comment line in `WorshipPlaylistsTab.tsx` and surface the finding to the user before proceeding with any further action. All other WorshipPlaylistsTab chrome (canonical hero, Spotify embeds via `SpotifyEmbed`, Featured + Explore grid, `<SectionHeader variant="gradient">`) is verified canonical and preserved exactly.
3. **AmbientBrowser placeholder copy deletion (Change 3).** In `frontend/src/components/audio/AmbientBrowser.tsx` at line 99 (verify exact line during pre-execution recon Step 10), delete the entire `<span className="text-primary-lt/50">Search all music (coming soon)</span>` line. If the span is wrapped in a parent element (such as next to a search icon) or sits inside surrounding hidden search-affordance scaffolding, inspect the surrounding JSX during execution and delete only the placeholder copy span. The surrounding hidden search-affordance scaffolding (if present) is preserved so a future spec can wire real search without rebuilding the layout. Goal: clean removal of the placeholder copy without breaking layout. All other AmbientBrowser features (Saved Mixes section for authed users, Featured Scenes carousel, All Scenes grid, "Build Your Own Mix" panel, search results variant, `SceneUndoToast`, `RoutineInterruptDialog` mount) are preserved exactly.
4. **`bg-primary` solid CTA migrations to canonical white-pill primary CTA Pattern 2 (Change 4 a–f).** In each of the six enumerated sites, replace the saturated `bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90` chrome (or the close variant per recon Step 6 audit) with the canonical white-pill primary CTA Pattern 2 from `09-design-system.md` § "White Pill CTA Patterns". The exact class string is captured during pre-execution recon Step 16; apply it verbatim and consistent with the homepage Get Started button, the RegisterPage hero CTA, and the white-pill CTAs migrated in Spec 10A. Critical preservations on every site: `onClick` handlers, disabled-state logic, accessible names (button text content), `min-h-[44px]` tap target, `focus-visible:ring-white/50` canonical ring per the pattern, and all surrounding layout. Sites: (a) `SharedMixHero.tsx:96` "Play This Mix" — the surrounding purple gradient panel and sound chips are preserved per Direction Decision 16; (b) `SaveMixButton.tsx:144` "Save Mix" — the auth-gate logic, name input flow, and 3000ms ARIA-live timeout at line 92 are preserved; (c) `RoutineInterruptDialog.tsx:41` "Stop routine to play this scene"; (d) `ContentSwitchDialog.tsx:52` "Switch"; (e) `DrawerNowPlaying.tsx:59` "Play"; (f) `TimerTabContent.tsx:354` "Timer Start". Pre-execution recon Step 6 captures exact line numbers and class strings as they exist on the working branch (line numbers may have drifted from the recon doc).
5. **`text-primary` text-button migrations to violet-300 (Change 5 a–c).** Apply Direction Decision 18 to enumerated sites. (a) `frontend/src/components/music/SavedMixCard.tsx:141` Play button: migrate `text-primary` to `text-violet-300 hover:text-violet-200`. Preserve all other classes (sizing, layout, focus rings, touch-target compliance), `onClick` handlers, ARIA attributes, and button text content. (b) `frontend/src/components/audio/DrawerNowPlaying.tsx:100` active foreground card text: migrate `text-primary-lt` to `text-white` (Daily Hub 1B canonical active text on active-state); this is paired with the active-state class migration in Change 6a (the foreground card's full active-state class migrates from `bg-primary/20 text-primary-lt` to `bg-white/15 text-white` — both halves of the migration are needed). (c) `frontend/src/components/audio/RoutineStepper.tsx:41` `text-primary` adjacent to the `bg-primary/30` completed-step tint: per Direction Decision 18, this is decorative-only completed-step tint and is preserved per Decision 11 precedent IF context confirms decorative. If pre-execution recon Step 7 finds it is actually a text-button context (clickable, semantic action), migrate to `text-violet-300 hover:text-violet-200`. Surface finding before patching either way.
6. **Active-state drift migrations within the audio cluster (Change 6 a–f).** Apply Direction Decision 19. Migrate active-state classes to Spec 10A canonical muted-white pattern. (a) `DrawerNowPlaying.tsx:100` active foreground card: `bg-primary/20 text-primary-lt` → `bg-white/15 text-white` (paired with Change 5b). (b) `TimerTabContent.tsx:269,286,334` active timer presets ×3: `bg-primary text-white` → `bg-white/15 text-white border border-white/30` (isolated-pill variant since timer presets are isolated chip selectors). (c) `RoutineStepper.tsx:42` current step: `bg-primary text-white` → `bg-white/15 text-white` (default; if pre-execution recon classifies the current step as a CTA rather than active-state pill, use canonical white-pill primary instead — surface during pre-execution). (d) `AudioPill.tsx:65` border: `border border-primary/40` (saturated purple) → canonical muted-white border. Default is `border border-white/[0.12]` (canonical content-card border opacity, matching the rest of the cluster). Alternate `border border-white/30` is acceptable if recon's intent reads as "active-indicator visibility" since AudioPill is the "audio is playing" indicator; surface during execution if ambiguous. (e) `FeaturedSceneCard.tsx:34` active scene play overlay: replace `bg-primary/80` overlay with white-circle pattern — outer dimmed bg `bg-black/40`, inner `rounded-full bg-white p-3` carrying a violet `text-primary` play icon. Preserve the surrounding scene gradient art unchanged. (f) `SceneCard.tsx:50` active scene play overlay: same migration as 6e.
7. **Border opacity unification (Change 7 a–f).** Apply Direction Decision 4. Migrate `border-white/10` → `border-white/[0.12]` across enumerated rolls-own card chrome sites: (a) `frontend/src/components/audio/ScriptureSessionCard.tsx`; (b) `frontend/src/components/audio/BedtimeStoryCard.tsx`; (c) `frontend/src/components/music/SavedMixCard.tsx`; (d) the "Build Your Own Mix" panel section in `frontend/src/components/audio/AmbientBrowser.tsx` (find the wrapping `<div>` with `border-white/10`); (e) the "Build a Bedtime Routine" CTA card in `frontend/src/components/audio/SleepBrowse.tsx`; (f) `frontend/src/components/audio/AudioDrawer.tsx` (the `rgba(15, 10, 30, 0.95)` background is preserved per Direction Decision 15; only the border opacity migrates). Cards that intentionally have no border and rely on gradient art or transparent chrome (FeaturedSceneCard, SceneCard, SoundCard) are not touched. RoutineCard already at `border-white/[0.12]` is preserved (and is touched by Spec 11B for other reasons, not for border opacity).
8. **BB-33 animation token migrations (Change 8 a–c).** Apply Direction Decision 21 to two animation-relevant hardcoded ms values. (a) `frontend/src/components/music/FavoriteButton.tsx:45` bounce timeout: migrate `setTimeout(..., 100)` to `setTimeout(..., ANIMATION_DURATIONS.fast)`. The token resolves to 150ms (per recon Step 15); the slight visual difference between 100ms and 150ms is acceptable for the bounce animation — accept the alignment as a positive (cluster-wide consistency, BB-33 token discipline) over the 50ms drift. Add `import { ANIMATION_DURATIONS } from '...'` if not already present. (b) `frontend/src/components/audio/AudioDrawer.tsx:83` entering-state timeout: migrate `setTimeout(..., 300)` to `setTimeout(..., ANIMATION_DURATIONS.base)`. The token resolves to 250ms (per recon Step 15); same caveat as 8a — 50ms drift is acceptable for the entering-state flag clear. Add the import if not already present. (c) Preserve `frontend/src/components/audio/SaveMixButton.tsx:92` `setTimeout(..., 3000)` — semantic timeout for ARIA-live announcement clear, NOT animation duration. Direction Decision 21 explicitly excludes this site.
9. **WaveformBars `aria-hidden` (Change 9).** In `frontend/src/components/audio/WaveformBars.tsx`, identify the parent element wrapping the animated bars (during pre-execution recon Step 11, determine whether it is a `<div>` or `<span>` and which level of the tree is the appropriate target — likely the outermost wrapper). Add `aria-hidden="true"` on that element. Preserve the `bg-primary` color of the individual animated bars at lines 12, 20, 28 per Direction Decision 20 (decorative animation, not CTA chrome). The visual rendering is unchanged; only the screen-reader announcement is silenced.
10. **AudioDrawer focus restoration verification + conditional fix (Change 10).** During pre-execution recon Step 12, read `frontend/src/components/audio/AudioDrawer.tsx` and the `useFocusTrap` usage. Trace the focus restoration target — should restore to the triggering element (`AudioPill` or `AmbientSoundPill`) on close (Escape, click-outside, swipe-down, or X button). If focus restoration is correctly wired, no code change is made; optionally add a regression test asserting focus returns to the triggering element on close. If focus restoration is broken (e.g., focus moves to body or somewhere unexpected), patch using one of two approaches: (Option A) pass the triggering element ref to `useFocusTrap()` if the hook supports it; (Option B) implement focus restoration via a stored ref before drawer mount, restored in the `onClose` handler. Surface the chosen approach before patching. If patched, add a focus restoration test in `AudioDrawer.test.tsx`.
11. **Decorative tint preservation per Decision 20 (Change 11).** No code changes — verification only. Confirm during execution that all enumerated `bg-primary/X` decorative tints remain as-is in the codebase: (a) `BibleSleepSection.tsx:57` `bg-primary/10` book icon container; (b) `RoutineStepper.tsx:41` `bg-primary/30 text-primary` completed step (preserve unless Change 5c finds text-button context, in which case the `text-primary` migrates per 5c but the `bg-primary/30` background tint stays); (c) `DrawerTabs.tsx:73` `bg-primary` notification dot; (d) `WaveformBars.tsx:12,20,28` `bg-primary` animated bars; (e) `ScriptureTextPanel.tsx:45` `bg-primary/10 border-l-2 border-primary` active-verse highlight. For the ScriptureTextPanel highlight, additionally verify text contrast on the highlighted verse text passes WCAG AA — read the text element starting at line 45+ during execution and check the foreground color against `bg-primary/10`. If text contrast fails, surface the finding without patching (categorical highlight is decorative; the text inside it should adapt color if needed, but only with user confirmation since this is a Decision 20 preserve site).

### Non-Functional Requirements

- **Performance:** No regression in MusicPage initial render time, AudioDrawer open animation smoothness, scene activation latency, ambient mix builder response time, or sleep timer countdown precision. Lazy-mount inactive tab panel performance optimization is out of scope (Spec 11c). Bundle size unchanged (no new dependencies; deletions slightly reduce bundle if `useSpotifyAutoPause.ts` is removed).
- **Accessibility:** WCAG 2.2 AA preserved across the cluster. Active-tab visual treatment retains `aria-selected="true"` on the active button per Spec 10A canonical. All white-pill primary CTAs preserve `min-h-[44px]` tap target and `focus-visible:ring-white/50`. `text-violet-300` migrations resolve the WCAG AA contrast failures on `text-primary` against the dark background. `WaveformBars` gains `aria-hidden="true"`. `AudioDrawer` focus restoration is verified (or fixed). The `(coming soon)` copy line removal removes a `text-primary-lt/50` contrast failure. ScriptureTextPanel active-verse text contrast is verified (finding surfaced if it fails).
- **Browser/device:** Existing responsive breakpoints (mobile / tablet / desktop) preserved; no new breakpoints introduced. `AudioDrawer` swipe-down dismiss preserved on touch devices. `AudioPill` persistence across navigation preserved. PWA / offline behaviors preserved.
- **Test count expectation:** Per `06-testing.md` size guidance, an XL spec expects 40+ tests. 11A modifies ~22 existing test files with class-string assertion updates and adds ~5–8 new assertions (`(coming soon)` copy absence, `useSpotifyAutoPause` import absence, WaveformBars `aria-hidden`, AudioDrawer focus restoration regression test, the six border-opacity assertions). Existing behavioral tests are preserved.

---

## Auth Gating

11A does not introduce, remove, or relocate any auth gate. Every existing auth gate in the Music cluster is preserved exactly. The visible chrome on the auth-gated triggers migrates per the design canon, but the gates themselves are unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Browse `/music` and switch tabs | Full access — Worship Playlists, Ambient Sounds, Sleep & Rest all browse and play freely | Full access; same | N/A — public route, no gate |
| Play a Spotify embed (Worship Playlists tab) | Full access — Spotify iframe handles its own auth (Spotify cookie if any) | Full access; same | N/A — no Worship Room gate |
| Activate an ambient scene preset | Full access — scene plays via AudioProvider | Full access; same | N/A |
| Toggle individual sounds in "Build Your Own Mix" | Full access — sound activation is engine state, no persistence | Full access; same | N/A |
| Favorite a sound (`FavoriteButton`) | Auth-gated (existing) — clicking opens the auth modal | Full access — favorite state writes to localStorage | "Sign in to save favorites" (existing copy; preserved) |
| Save a mix (`SaveMixButton` "Save Mix" CTA — chrome migrates to white-pill primary in Change 4b) | Auth-gated (existing) — clicking opens the auth modal | Full access — name input + save flow proceeds | "Sign in to save your mix" (existing copy; preserved) |
| Open Saved Mixes section (Ambient Sounds tab) | Section hidden / placeholder (existing — preserved) | Full access — `SavedMixCard` list with Play / Edit / Delete affordances | N/A — section hidden when logged-out |
| Play a saved mix (`SavedMixCard` Play — `text-primary` text migrates to `text-violet-300` in Change 5a) | N/A (section hidden when logged-out) | Full access — mix plays via AudioProvider | N/A |
| Open `MixActionsMenu` / delete via `DeleteMixDialog` | N/A (section hidden when logged-out) | Full access | N/A |
| Receive a shared mix via `?mix=base64` URL (`SharedMixHero`) | Full access — hero renders, "Play This Mix" plays the mix (chrome migrates to white-pill primary in Change 4a) | Full access; same | N/A — public on the receiving end |
| Bookmark anything (Sleep & Rest tab features) | Auth-gated (existing) — clicking opens the auth modal | Full access — bookmark state writes to localStorage | "Sign in to bookmark" (existing copy; preserved) |
| Open `AudioDrawer` via `AudioPill` | Full access | Full access; same | N/A |
| Use Timer / Now Playing / Mixer / Saved tabs inside `AudioDrawer` | Full access for Timer / Now Playing / Mixer; Saved tab gated (existing) | Full access | "Sign in to view saved mixes" (existing copy; preserved on the Saved tab gate) |
| Trigger `RoutineInterruptDialog` (when user activates content during an active routine) | N/A (routines authed-only — gate is upstream) | Full access — dialog opens, "Stop routine" CTA migrates to white-pill primary in Change 4c | N/A — gate is upstream of this dialog |
| Trigger `ContentSwitchDialog` (when user activates competing content) | Full access | Full access — "Switch" CTA migrates to white-pill primary in Change 4d | N/A |
| Set sleep timer (`TimerTabContent` "Timer Start") | Full access — timer is engine state | Full access; same — CTA migrates to white-pill primary in Change 4f | N/A |
| BB-26 audio Bible playback inside `BibleSleepSection` | Full access (intentionally unauthenticated per `02-security.md` § "Bible Wave Auth Posture") | Full access; same | N/A — Bible wave deliberately adds zero auth gates |

The auth modal pattern, shared with Prayer Wall / Daily Hub / Bible cluster gates, is the existing modal component. No new modal copy is introduced in 11A.

---

## Responsive Behavior

11A preserves all existing responsive behavior across the Music cluster. No breakpoints, layout reflows, or orientation behaviors are introduced or changed; the visual migration is class-string updates within existing layout structures.

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | `MusicPage` renders the three-tab horizontal tablist above the panel (already canonical); active-tab class migrates to `bg-white/15` (Change 1a) without changing the pill+halo border treatment; pill width / padding / sticky shadow `IntersectionObserver` are preserved. WorshipPlaylistsTab Spotify embeds stack vertically; Featured + Explore grid is single-column. AmbientBrowser: Featured Scenes carousel is horizontally scrollable; All Scenes grid is single-column; "Build Your Own Mix" panel stacks above sound grid. SleepBrowse: BibleSleepSection card stacks; ScriptureCollectionRow strips are horizontally scrollable; BedtimeStoriesGrid is single-column; "Build a Bedtime Routine" CTA card is full-width. `AudioPill` renders bottom-fixed; tap-target is `min-h-[44px]` (preserved). `AudioDrawer` renders as a full-height bottom-up flyout with swipe-down dismiss; border opacity migrates to `border-white/[0.12]` (Change 7f) without affecting the `rgba(15, 10, 30, 0.95)` background or the swipe gesture handler. White-pill primary CTAs across the cluster preserve `min-h-[44px]` per the canonical pattern. `SharedMixHero` gradient panel is full-width with the "Play This Mix" CTA below the sound chips. |
| Tablet (640–1024px) | `MusicPage` tablist remains horizontal; pill chrome unchanged structurally. WorshipPlaylistsTab Spotify Featured grid becomes 2-column; Explore grid 2-column. AmbientBrowser Featured Scenes carousel may convert to 2-column grid depending on existing breakpoint logic (preserved); All Scenes grid is 2-column; "Build Your Own Mix" panel renders side-by-side with sound grid where space allows (preserved). SleepBrowse: ScriptureCollectionRow strips remain horizontally scrollable or convert to 2-column grid per existing logic; BedtimeStoriesGrid is 2-column. `AudioDrawer` renders at the same width as mobile (full-width flyout from bottom) or as a side panel depending on existing breakpoint (preserved; no change). `AudioPill` remains bottom-fixed. `FeaturedSceneCard` and `SceneCard` active-scene play overlays migrate to white-circle (Change 6e, 6f) regardless of breakpoint. |
| Desktop (> 1024px) | `MusicPage` tablist remains horizontal at the top of the panel (no sidebar variant for Music — that pattern is reserved for Settings/Insights). Active-tab class migration applies identically across breakpoints. WorshipPlaylistsTab Featured + Explore grid is 3-column or 4-column (preserved per existing breakpoint). AmbientBrowser Featured Scenes is 3-up grid; All Scenes is 3-or-4-column grid; "Build Your Own Mix" panel is full-width or constrained to a max-width container (preserved). SleepBrowse: ScriptureCollectionRow strips render as full rows; BedtimeStoriesGrid is 3-column; "Build a Bedtime Routine" CTA card is constrained to max-width. `AudioDrawer` renders as a side-panel flyout (preserved per existing breakpoint logic) with the canonical border opacity migration applied. `AudioPill` may render bottom-right or bottom-center per existing positioning (preserved). White-pill primary CTAs scale per the canonical pattern (`px-8 py-3.5`, `min-h-[44px]`, larger interactive area but the same component). `SharedMixHero` gradient panel renders at full container width with the canonical CTA below. |

Mobile-specific interactions preserved: `AudioDrawer` swipe-down dismiss; `AudioPill` tap to open; horizontal carousel pan on Featured Scenes / ScriptureCollectionRow; bottom-fixed positioning for `AudioPill`. Touch-target compliance verified at `min-h-[44px]` on all migrated white-pill CTAs and on `WaveformBars` parent (decorative; no tap behavior change).

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. Music is purely a passive-content / engine-driven surface. No crisis detection required. The `(coming soon)` copy line deletion in AmbientBrowser is dead UI scaffolding that referenced a hypothetical future search; no LLM or AI is involved.

The cross-cutting BB-26 audio Bible playback inside `BibleSleepSection` (Sleep & Rest tab) is preserved per Direction Decision 26 and is unauthenticated reading-only content (no AI). The unauthenticated reading-only posture aligns with `02-security.md` § "Bible Wave Auth Posture".

---

## Auth & Persistence

- **Logged-out users (demo mode):** Full read access to all three Music tabs, all scene playback, all ambient mix building, all Sleep & Rest content, all `AudioPill` / `AudioDrawer` interactions except Saved Mixes (gated). Listening history (`wr_listening_history`) is **not** written for logged-out users per the demo-mode zero-persistence rule in `02-security.md` § "Demo Mode Data Policy". Sound favorites and saved mixes are not persisted. The `wr_session_state` localStorage entry (24-hour-expiry audio session persistence) is preserved as a client-side-only value matching its existing `02-security.md` exception (allowed for logged-out users since it survives in-browser only).
- **Logged-in users:** All Music behaviors persist as today. `wr_listening_history` (max 100 entries) records ListeningSession entries — schema unchanged per Direction Decision 25. `wr_favorites`, `wr_saved_mixes`, `wr_routines` (touched in Spec 11B, not 11A), `wr_music_hint_pill`, `wr_music_hint_sound_grid`, `wr_session_state` all persist with their existing shapes. No new localStorage keys are introduced in 11A.
- **localStorage keys touched in 11A:** None (additions, removals, or schema changes). The `wr_listening_history` schema is read-only per Direction Decision 25; the cross-cutting consumers `hooks/useGardenElements.ts:62` (Dashboard garden hook) and `services/badge-engine.ts:289` (Worship Listener badge) require schema stability and are preserved.
- **Database:** N/A — Music cluster is entirely client-side / localStorage-backed at this time. Backend Music sync is greenfield for a future spec.

---

## Completion & Navigation

N/A — Music is a top-level navbar destination, not a Daily Hub tab. Standalone feature with persistent navigation back to the rest of the app via the navbar. The `AudioPill` persists across navigation when audio is playing, providing always-on access back to Music state from any other surface.

---

## Design Notes

- **Atmospheric layer:** Preserve `bg-dashboard-dark` body root + `<PageHero>` + `ATMOSPHERIC_HERO_BG` per Direction Decision 1 (canonical inner-page atmospheric pattern shared with Friends, Grow, Settings, MyPrayers, Insights). Do not introduce per-tab atmospheric variants in 11A (Spec 11c). Do not introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground` (those are hero-pattern primitives, not inner-page-pattern primitives).
- **AudioDrawer background:** Preserve `rgba(15, 10, 30, 0.95)` exactly per Direction Decision 15 — documented intentional design decision; full-height flyout chrome is genuinely different from canonical content cards. Border opacity migrates separately per Change 7f without affecting the background.
- **SharedMixHero gradient:** Preserve the purple-to-light gradient on the hero panel per Direction Decision 16 — the gradient is the celebration of receiving a mix from a friend, the emotional peak of the surface. Sound chips are preserved. Only the "Play This Mix" CTA migrates per Change 4a.
- **Scene gradient backgrounds:** Preserve `data/scene-backgrounds.ts` and the gradient art on `FeaturedSceneCard` / `SceneCard` exactly per Direction Decision 4. Gradient art is the chrome — the cards intentionally have no border. Only the active-scene play overlay migrates per Changes 6e / 6f.
- **Sound button transparent chrome:** Preserve `SoundCard` transparent button chrome per Direction Decision 4. Sound buttons are buttons, not cards. No border opacity migration applies; the transparency is intentional.
- **Active-tab pattern (MusicPage):** Migrate active opacity from `bg-white/[0.12]` to `bg-white/15` per Direction Decision 2 / Spec 10A canonical. Preserve the pill+halo border treatment (`border border-white/[0.15]`) — the pill chrome is the design intent for MusicPage; Spec 10A's `border-b-2 border-white/40` underline pattern is a horizontal-tablist alternate, not a replacement. Default to preserving pill+halo. The user has flagged this as a check-in point during the plan stage; default behavior preserves the pill chrome with opacity migrated only.
- **White-pill primary CTA Pattern 2:** Reference `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 for the exact class string. Cross-reference the homepage Get Started button, the RegisterPage hero CTA, and the Spec 10A migrations (AvatarPickerModal Save buttons, ChangePasswordModal Update password, NotificationsSection Send test notification, DeleteAccountModal Delete Everything chrome severity variant) for visual consistency. Pre-execution recon Step 16 captures the exact class string; apply it verbatim to all six 11A sites.
- **Daily Hub 1B violet text-button treatment:** Reference `09-design-system.md` for the canonical `text-violet-300 hover:text-violet-200` text-button pattern. Apply to `SavedMixCard.tsx:141` Play button per Change 5a. The `RoutineStepper.tsx:41` `text-primary` may also receive this treatment if pre-execution recon Step 7 finds text-button context (otherwise preserved as decorative per Decision 11).
- **Daily Hub 1B canonical active text on active-state:** Reference `09-design-system.md` for the canonical `text-white` on active-state pills. Apply to `DrawerNowPlaying.tsx:100` per Change 5b (paired with the active-state class migration in Change 6a — both halves needed to match the cluster pattern).
- **Spec 10A canonical active-state pattern:** `bg-white/15 text-white` with orientation-appropriate borders. For active-foreground variant (DrawerNowPlaying): no extra border. For isolated-pill variant (TimerTabContent timer presets): `border border-white/30`. For RoutineStepper current step: default to active-foreground variant (`bg-white/15 text-white`); use white-pill if pre-execution recon classifies the step as a CTA.
- **Border opacity unification:** Migrate `border-white/10` → `border-white/[0.12]` across the six rolls-own card chrome sites per Direction Decision 4. Cards with no border by design (FeaturedSceneCard, SceneCard, SoundCard) are not touched. RoutineCard is already at `border-white/[0.12]` and is preserved.
- **`<FrostedCard>` deferral:** Direction Decision 4 explicitly defers blanket FrostedCard adoption on Music cards to Spec 11c. 11A's border opacity unification is the lightweight equivalent — same target opacity, but rolls-own chrome preserved.
- **BB-33 animation tokens:** Reference `frontend/src/constants/animation.ts` (or wherever `ANIMATION_DURATIONS` lives — pre-execution recon Step 15 verifies). Tokens used: `ANIMATION_DURATIONS.fast` (150ms, FavoriteButton bounce); `ANIMATION_DURATIONS.base` (250ms, AudioDrawer entering-state). Do not migrate `SaveMixButton.tsx:92` `setTimeout(..., 3000)` — semantic ARIA-live announcement clear, not animation. Per `09-design-system.md` § "Animation Tokens" and CLAUDE.md "Animation token discipline" rule.
- **`useFocusTrap()` canonical modal helper:** Reference the existing canonical hook (used in 37 modal/dialog components per `BB-35` accessibility coverage). Pre-execution recon Step 13 confirms restoration semantics. Reuse the hook; do not patch the hook itself in 11A.
- **`<SectionHeader variant="gradient">` canonical heading:** Reference the existing component used across the cluster. WorshipPlaylistsTab section headings, SleepBrowse section headings, AmbientBrowser section headings all use this component (verified canonical during pre-execution).
- **Decorative tint preservation per Decision 20:** Cross-reference Spec 10A Decision 11 and Spec 10B Decision 21 precedent. Categorical signals (book icon containers, completed-step tints, notification dots, animated waveform bars, active-verse highlights, Template badge backgrounds touched in 11B) are not CTA chrome and are preserved exactly.
- **WaveformBars `aria-hidden`:** Apply Direction Decision 22. The decorative animated bars should not announce as content.
- **Audio engine integrity:** Per Direction Decision 24, AudioProvider, audioReducer, audio-engine.ts, and all hook internals are OUT OF SCOPE. Visual chrome only. If CC encounters apparent engine bugs during execution, surface — do NOT silently patch.
- **No new patterns introduced.** 11A is pattern application, not pattern introduction. Every class string used in this spec is already shipped in `09-design-system.md` or in Spec 10A's canonical migrations. No `[UNVERIFIED]` design values.

---

## Out of Scope

- Atmospheric layer changes (Direction Decision 1 preserve)
- Per-tab atmospheric variants — Sleep darker than Worship, ambient-active subtle scene tint (Decision 1; deferred to Spec 11c)
- Featured Scenes carousel cinematic upgrade — desktop hero-feature pattern, larger artwork (Direction Decision 6; Spec 11c)
- "Build Your Own Mix" panel creator-tier elevation — larger sound buttons with ambient art, frosted-glass elevated container, real-time mix waveform visualization (Direction Decision 7; Spec 11c)
- Time-of-day awareness on Music tabs — default tab variation by time-of-day (Direction Decision 8; Spec 11c)
- `<FrostedCard>` blanket adoption on Music cards (Direction Decision 4; Spec 11c if ever)
- Cross-surface scripture-card chrome unification with `MeditateTabContent` (Direction Decision 12; Spec 11c if drift becomes a complaint)
- MeditateTabContent — leave Daily Hub Meditate tab untouched (Direction Decision 12)
- Scene preset count reduction — keep 11 scenes (Direction Decision 5)
- Scene gradient backgrounds in `data/scene-backgrounds.ts` (preserved)
- Sound button transparent chrome on `SoundCard` (preserved)
- AudioDrawer `rgba(15, 10, 30, 0.95)` background (Direction Decision 15)
- SharedMixHero purple gradient (Direction Decision 16)
- All `AudioProvider`, `audioReducer`, `lib/audio-engine.ts` engine internals (Direction Decision 24)
- All audio-engine hooks: `useScenePlayer`, `useSleepTimer`, `useForegroundPlayer`, `useRoutinePlayer`, `useAmbientSearch`, `useSoundToggle`, `useFavorites`, `useListenTracker`, `useAudioDucking`, `useReaderAudioAutoStart` (Direction Decision 24)
- BB-26 / BB-27 audio Bible cross-cutting coordination logic — `AudioPlayButton`, `AudioPlayerExpanded`, `AudioPlayerSheet`, `AudioPlayerMini`, `BibleSleepSection` BB-27 wiring (Direction Decision 26)
- `wr_listening_history` schema changes (Direction Decision 25; read-only)
- `ScriptureTextPanel.tsx:45` active-verse highlight tint (preserved as decorative; only verify text contrast per Change 11b)
- All decorative `bg-primary/X` tints per Decision 20 preservation list
- Lazy-mount inactive tab panel performance optimization (Spec 11c performance pass)
- Sound chip aria-label additions on `SharedMixHero` (Spec 11c if a11y becomes priority)
- All RoutinesPage / RoutineBuilder / RoutineCard / ContentPicker / RoutineStepCard / DeleteRoutineDialog / RoutineDelete behavioral fix work (Spec 11B)
- The empty-state hint copy on RoutinesPage (Spec 11B)
- Spotify OAuth Phase 3.13 placeholder — no "Connect Spotify" affordance introduced on Music side (Direction Decision 27; Phase 3.13 stays greenfield)
- New audio interaction surfaces competing with `AudioDrawer` (out of scope per design constraint)
- All Bible / Daily Hub / Settings / Insights / Auth / Dashboard / Local Support / Ask surfaces (already shipped via prior specs)
- ListeningLogger / `wr_listening_history` purge / eviction logic
- Backend Music sync (greenfield; future spec)

---

## Acceptance Criteria

### MusicPage active-tab unification

- [ ] Active tab class at `pages/MusicPage.tsx:219` migrated from `bg-white/[0.12]` to `bg-white/15`
- [ ] Pill+halo border treatment (`border border-white/[0.15]`) preserved (pill chrome is the design intent)
- [ ] All other tab pattern semantics preserved (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` roving, arrow-key navigation, URL-backed state via `useSearchParams`, sticky shadow `IntersectionObserver`)
- [ ] `?tab=<invalid-value>` defaults to Worship Playlists (existing behavior; preserved)

### WorshipPlaylistsTab cleanup

- [ ] `// import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'` comment line at `WorshipPlaylistsTab.tsx:6` deleted
- [ ] `frontend/src/hooks/useSpotifyAutoPause.ts` file deleted IF zero live consumers found in pre-execution recon Step 5; if any live consumer found, only the comment line deleted and finding surfaced before further action
- [ ] If hook file deleted: associated test file `hooks/__tests__/useSpotifyAutoPause.test.ts` (if it exists) also deleted
- [ ] All other WorshipPlaylistsTab chrome preserved (canonical hero, Spotify embeds via `SpotifyEmbed`, Featured + Explore grid, `<SectionHeader variant="gradient">`)

### AmbientBrowser cleanup

- [ ] `<span className="text-primary-lt/50">Search all music (coming soon)</span>` line at `AmbientBrowser.tsx:99` deleted
- [ ] No layout regression after deletion (surrounding hidden search-affordance scaffolding, if present, preserved)
- [ ] All other AmbientBrowser features preserved (Saved Mixes section for authed users, Featured Scenes carousel, All Scenes grid, "Build Your Own Mix" panel, search results variant, `SceneUndoToast`, `RoutineInterruptDialog` mount)

### `bg-primary` solid CTA migrations (6 sites)

- [ ] `SharedMixHero.tsx:96` "Play This Mix" → canonical white-pill primary CTA Pattern 2
- [ ] `SaveMixButton.tsx:144` "Save Mix" → canonical white-pill primary
- [ ] `RoutineInterruptDialog.tsx:41` "Stop routine" → canonical white-pill primary
- [ ] `ContentSwitchDialog.tsx:52` "Switch" → canonical white-pill primary
- [ ] `DrawerNowPlaying.tsx:59` "Play" → canonical white-pill primary
- [ ] `TimerTabContent.tsx:354` "Timer Start" → canonical white-pill primary
- [ ] All `onClick` handlers preserved on every site
- [ ] All ARIA + accessible names preserved on every site
- [ ] All `min-h-[44px]` preserved on every site
- [ ] `focus-visible:ring-white/50` canonical ring per pattern on every site
- [ ] White-pill chrome visually matches the homepage Get Started button, the RegisterPage hero CTA, and the Spec 10A AvatarPickerModal Save / ChangePasswordModal Update / NotificationsSection Send test notification CTAs

### `text-primary` text-button migrations

- [ ] `SavedMixCard.tsx:141` Play → `text-violet-300 hover:text-violet-200`
- [ ] `DrawerNowPlaying.tsx:100` active-foreground card text → `text-white` (Daily Hub 1B canonical active text)
- [ ] `RoutineStepper.tsx:41` — preservation OR migration based on pre-execution recon Step 7 finding (decorative-only preserve per Decision 20 OR text-button migrate to `text-violet-300`); finding surfaced before patching either way

### Active-state drift migrations

- [ ] `DrawerNowPlaying.tsx:100` active foreground card: `bg-white/15 text-white` (paired with `text-white` migration in Change 5b)
- [ ] `TimerTabContent.tsx:269,286,334` active timer presets ×3: `bg-white/15 text-white border border-white/30` (isolated-pill variant)
- [ ] `RoutineStepper.tsx:42` current step: `bg-white/15 text-white` (default; or canonical white-pill primary if pre-execution recon classifies the step as a CTA)
- [ ] `AudioPill.tsx:65` border: canonical muted-white (`border-white/[0.12]` default; `border-white/30` alternate if recon's intent reads as active-indicator visibility — finding surfaced)
- [ ] `FeaturedSceneCard.tsx:34` active overlay: outer dimmed `bg-black/40` + inner `rounded-full bg-white p-3` with violet `text-primary` play icon
- [ ] `SceneCard.tsx:50` active overlay: same migration as FeaturedSceneCard

### Border opacity unification

- [ ] `ScriptureSessionCard.tsx`: `border-white/10` → `border-white/[0.12]`
- [ ] `BedtimeStoryCard.tsx`: `border-white/10` → `border-white/[0.12]`
- [ ] `SavedMixCard.tsx`: `border-white/10` → `border-white/[0.12]`
- [ ] "Build Your Own Mix" panel in `AmbientBrowser.tsx`: `border-white/10` → `border-white/[0.12]`
- [ ] "Build a Bedtime Routine" CTA card in `SleepBrowse.tsx`: `border-white/10` → `border-white/[0.12]`
- [ ] `AudioDrawer.tsx`: `border-white/10` → `border-white/[0.12]` (background `rgba(15, 10, 30, 0.95)` preserved per Decision 15)
- [ ] Scene cards (`FeaturedSceneCard`, `SceneCard`) border unchanged (gradient art is the chrome by design — no border)
- [ ] `SoundCard` chrome unchanged (transparent button by design — no border)
- [ ] `RoutineCard` already at `border-white/[0.12]` — preserved (touched by Spec 11B for other reasons)

### BB-33 token migrations

- [ ] `FavoriteButton.tsx:45`: `setTimeout` migrated to use `ANIMATION_DURATIONS.fast`
- [ ] `AudioDrawer.tsx:83`: `setTimeout` migrated to use `ANIMATION_DURATIONS.base`
- [ ] `SaveMixButton.tsx:92` `setTimeout(..., 3000)` preserved (semantic ARIA-live timeout, not animation)
- [ ] `ANIMATION_DURATIONS` imported in both files if not already present

### a11y additions

- [ ] `WaveformBars.tsx` parent element wrapping the animated bars carries `aria-hidden="true"`
- [ ] AudioDrawer focus restoration verified during execution (or fixed if drift found per Change 10); finding surfaced; if patched, focus restoration test added in `AudioDrawer.test.tsx`

### Decorative tint preservation (Decision 20)

- [ ] `BibleSleepSection.tsx:57` `bg-primary/10` book icon container preserved
- [ ] `RoutineStepper.tsx:41` `bg-primary/30` decorative tint preserved (the `text-primary` may migrate per Change 5c finding; the `bg-primary/30` background tint stays regardless)
- [ ] `DrawerTabs.tsx:73` `bg-primary` notification dot preserved
- [ ] `WaveformBars.tsx:12,20,28` `bg-primary` animated bars preserved (only the parent gets `aria-hidden`, the bars themselves keep their color)
- [ ] `ScriptureTextPanel.tsx:45` `bg-primary/10 border-l-2 border-primary` active-verse highlight preserved
- [ ] Text contrast verified on `ScriptureTextPanel` highlighted verse text (WCAG AA pass OR finding surfaced without patching)

### AudioDrawer rgba(15, 10, 30, 0.95) background (Decision 15 preserve)

- [ ] `AudioDrawer` background unchanged
- [ ] Border opacity migrated separately per Change 7f (does not affect background)
- [ ] Focus trap (`useFocusTrap`) preserved
- [ ] Click-outside dismiss preserved
- [ ] Swipe-down dismiss preserved
- [ ] Escape dismiss preserved
- [ ] X button dismiss preserved

### SharedMixHero gradient (Decision 16 preserve)

- [ ] Purple-to-light gradient on hero panel preserved
- [ ] Sound chips preserved
- [ ] Mix payload deserialization (`?mix=base64`) preserved
- [ ] Only the "Play This Mix" CTA migrated (Change 4a)

### Atmospheric layer (Decision 1 preserve)

- [ ] `bg-dashboard-dark` body root preserved
- [ ] `<PageHero>` + `ATMOSPHERIC_HERO_BG` preserved
- [ ] No per-tab atmospheric variants introduced
- [ ] No `BackgroundCanvas` / `HorizonGlow` / `GlowBackground` introduced

### Audio engine integrity (Decision 24 OUT OF SCOPE)

- [ ] `AudioProvider.tsx` unchanged
- [ ] `audioReducer.ts` unchanged
- [ ] `lib/audio-engine.ts` unchanged
- [ ] All hooks (`useScenePlayer`, `useSleepTimer`, `useForegroundPlayer`, `useRoutinePlayer`, `useAmbientSearch`, `useSoundToggle`, `useFavorites`, `useListenTracker`, `useAudioDucking`, `useReaderAudioAutoStart`) unchanged
- [ ] No state management or business logic modifications

### BB-26 / BB-27 audio Bible cross-cutting (Decision 26)

- [ ] `BibleSleepSection` chrome migrations limited to Decision 20 preservation (book icon container) + border opacity (no separate migration since BibleSleepSection's primary card is its containing surface, verify scope during pre-execution)
- [ ] BB-27 ambient coordination logic preserved (Bible audio plays → ambient pauses)
- [ ] `AudioPlayerExpanded` / `AudioPlayerSheet` / `AudioPlayerMini` / `AudioPlayButton` not modified

### `wr_listening_history` schema (Decision 25)

- [ ] Schema unchanged (no field additions, removals, or renames)
- [ ] `useGardenElements` consumer pattern unchanged
- [ ] `badge-engine` consumer pattern unchanged

### Spotify Phase 3.13 (Decision 27)

- [ ] No "Connect Spotify" affordance introduced on Music side
- [ ] Phase 3.13 stays greenfield

### Tests

- [ ] All existing tests pass; updated tests pass; no new failures (frontend regression baseline preserved per CLAUDE.md "Build Health" guidance)
- [ ] `pages/__tests__/MusicPage.test.tsx`: active-tab class assertion updated from `bg-white/[0.12]` to `bg-white/15`; all other tab pattern tests pass
- [ ] `components/music/__tests__/SharedMixHero.test.tsx`: white-pill CTA class assertion updated
- [ ] `components/audio/__tests__/SaveMixButton.test.tsx`: white-pill CTA class assertion updated
- [ ] `components/audio/__tests__/RoutineInterruptDialog.test.tsx`: white-pill CTA class assertion updated
- [ ] `components/audio/__tests__/ContentSwitchDialog.test.tsx`: white-pill CTA class assertion updated
- [ ] `components/audio/__tests__/DrawerNowPlaying.test.tsx`: white-pill CTA + `bg-white/15 text-white` active-foreground + `text-white` text assertions updated
- [ ] `components/audio/__tests__/TimerTabContent.test.tsx`: white-pill CTA + `bg-white/15 text-white border border-white/30` ×3 active-preset assertions updated
- [ ] `components/music/__tests__/SavedTabContent.test.tsx` (or wherever `SavedMixCard` is tested): `text-violet-300` Play button + `border-white/[0.12]` border assertions updated
- [ ] `components/audio/__tests__/RoutineStepper.test.tsx`: current-step active-state assertion updated; `text-primary` preservation OR migration assertion updated per Change 5c finding
- [ ] `components/audio/__tests__/AudioPill.test.tsx`: muted-white border assertion updated; WaveformBars `aria-hidden` assertion added
- [ ] `components/audio/__tests__/FeaturedSceneCard.test.tsx`: white-circle play overlay assertion updated
- [ ] `components/audio/__tests__/SceneCard.test.tsx`: white-circle play overlay assertion updated
- [ ] `components/audio/__tests__/ScriptureSessionCard.test.tsx`: `border-white/[0.12]` assertion updated
- [ ] `components/audio/__tests__/BedtimeStoryCard.test.tsx`: `border-white/[0.12]` assertion updated
- [ ] `components/audio/__tests__/AmbientBrowser.test.tsx`: "Search all music (coming soon)" copy absence assertion added; "Build Your Own Mix" panel `border-white/[0.12]` assertion updated
- [ ] `components/audio/__tests__/AmbientBrowser.integration.test.tsx`: regressions verified
- [ ] `components/audio/__tests__/SleepBrowse.test.tsx`: "Build a Bedtime Routine" CTA card `border-white/[0.12]` assertion updated
- [ ] `components/audio/__tests__/AudioDrawer.test.tsx`: `border-white/[0.12]` assertion updated; focus restoration regression test added or verified per Change 10
- [ ] `components/audio/__tests__/BibleSleepSection.test.tsx`: Decision 20 preservation assertions verified; BB-26 / BB-27 behavior preserved
- [ ] `components/music/__tests__/WorshipPlaylistsTab.test.tsx`: `useSpotifyAutoPause` import absence verified (no test asserts presence of the comment); all other tests pass
- [ ] `components/music/__tests__/SpotifyEmbed.test.tsx`: regressions verified
- [ ] `components/music/__tests__/SpotifyEmbed-offline.test.tsx`: regressions verified
- [ ] `components/music/__tests__/FavoriteButton.test.tsx`: BB-33 token usage tests pass (functional equivalence — bounce animation runs)
- [ ] `components/music/__tests__/DeleteMixDialog.test.tsx`: regressions verified (no chrome migration in 11A; verify still canonical)
- [ ] All decorative tint preservation tests still pass
- [ ] `pnpm typecheck` passes

### Manual eyeball checks

- [ ] `/music` renders normally at all 3 tabs
- [ ] Active tab visual treatment is `bg-white/15` muted-white (not violet-tinted `bg-white/[0.12]`)
- [ ] Worship Playlists tab: hero embed + Featured grid + Explore grid render normally; no "(coming soon)" copy anywhere
- [ ] Ambient Sounds tab: Saved Mixes (authed) + Featured Scenes carousel + All Scenes grid + "Build Your Own Mix" panel + scene undo toast all render normally with canonical chrome
- [ ] Sleep & Rest tab: BibleSleepSection + TonightScripture + 4 ScriptureCollectionRow strips + BedtimeStoriesGrid + "Build a Bedtime Routine" CTA all render normally with canonical chrome
- [ ] `AudioPill` renders with canonical muted-white border (no saturated purple `border-primary/40`)
- [ ] `AudioDrawer` opens with `rgba(15, 10, 30, 0.95)` background preserved + canonical `border-white/[0.12]` border
- [ ] `AudioDrawer` Now Playing section active foreground card uses `bg-white/15 text-white` muted-white pattern
- [ ] `AudioDrawer` Timer tab active timer presets ×3 use `bg-white/15 text-white border border-white/30` isolated-pill pattern
- [ ] `AudioDrawer` Routine tab current step uses `bg-white/15 text-white` (or white-pill if applied per pre-execution recon classification)
- [ ] All six white-pill primary CTAs render canonically (matching homepage Get Started visual)
- [ ] `SavedMixCard` `text-violet-300` Play button visible
- [ ] `SharedMixHero` gradient panel preserved + canonical "Play This Mix" CTA
- [ ] `FeaturedSceneCard` / `SceneCard` active overlays show white circle with violet icon over dimmed background
- [ ] `WaveformBars` animation runs normally (visual unchanged, just `aria-hidden` added — invisible to screen readers, visible to sighted users)
- [ ] `FavoriteButton` bounce animation runs normally (150ms feels snappy; 50ms drift from prior 100ms is imperceptible in practice)
- [ ] `AudioDrawer` entering animation runs normally (250ms timing matches BB-33 token; 50ms drift from prior 300ms is imperceptible)

### Behavioral preservation

- [ ] All audio engine behavior preserved (sound activation, scene player, sleep timer, ambient mix builder, foreground content, routine player)
- [ ] BB-26 audio Bible playback unchanged
- [ ] BB-27 ambient coordination unchanged (Bible audio plays → ambient pauses)
- [ ] Saved mix CRUD preserved (`MixActionsMenu`, `DeleteMixDialog`)
- [ ] Mix sharing URL serialization preserved (`?mix=base64` round-trip)
- [ ] Scene preset selection preserved
- [ ] Sleep timer countdown preserved
- [ ] Sound favorites toggle preserved (with auth gate intact)
- [ ] Listening history logging preserved (`wr_listening_history` writes intact for authed users; not written for logged-out users)
- [ ] Auth gates preserved on Save Mix, Bookmark, Saved Mixes section visibility, AudioDrawer Saved tab
- [ ] Tab URL state preserved (`?tab=playlists|ambient|sleep`)
- [ ] Shared mix URL hero parsing preserved (`?mix=base64`)
- [ ] `AudioPill` persistence across navigation preserved
- [ ] `AudioDrawer` swipe-down dismiss preserved on touch devices

### Regression checks

- [ ] All Bible cluster surfaces unchanged from 8B/8C/8A (BB-26 / BB-27 cross-cutting honored)
- [ ] AskPage unchanged from Spec 9
- [ ] Settings + Insights surfaces unchanged from Spec 10A / 10B
- [ ] All other surfaces unchanged (Daily Hub, Grow, Prayer Wall, Dashboard, Local Support, Auth, Friends, MyPrayers)
- [ ] `AudioPill` + `AudioDrawer` behavior unchanged (only chrome migrated)
- [ ] `AmbientSoundPill` (if separate from `AudioPill`) unchanged
- [ ] Daily Hub Meditate tab unchanged (Decision 12 — leave Meditate untouched)
- [ ] All `MeditateTabContent` scripture cards unchanged
- [ ] Auth simulation flow unchanged
- [ ] No new `VITE_*_API_KEY` introduced in frontend bundle
- [ ] Frontend regression baseline preserved (per CLAUDE.md "Build Health"): no new failing test files; no increase in fail count after Spec 11A lands
