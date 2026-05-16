# Forums Wave: Spec 7.3 — Music During Prayer Wall

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` Spec 7.3 stub (master plan lines 6403–6418, tracker row 95). Size S, Risk Low, prerequisites 7.2. Four-AC checklist + 4-manual-QA-case minimum. Goal: *"Verify that the existing AudioProvider context (BB-26 era) supports music continuing to play while the user navigates Prayer Wall pages. No new code expected — this is verification and polish."*

**Brief Source:** This brief, authored 2026-05-16 against the live master plan stub + live code recon.

**Branch:** `forums-wave-continued`. CC never alters git state; Eric handles all commits manually.

**Date:** 2026-05-16.

**Spec ID:** `round3-phase07-spec03-music-during-prayer-wall`

**Phase:** 7 (Cross-Feature Integration) — the third spec.

**Size:** S — almost entirely verification + manual QA, with at most a CSS tweak (~5 lines) if FAB overlap exists with any of PrayerWall's sticky elements.

**Risk:** Low — `AudioProvider` is already mounted at `App.tsx:243` (root level), wrapping every route. `AudioPill` (the "FAB" the stub refers to) renders globally from inside `AudioProvider` (line 300). Music continuity across navigation is a property of the existing global provider, not Prayer Wall-specific. The risk is bounded to: (a) discovering edge cases where the FAB overlaps PrayerWall's sticky filter row at certain viewport sizes; (b) the spec turning out to be larger than "verify" if the AudioPill's positioning interferes with the sticky behavior in a way that needs a real fix.

**Tier:** Standard.

---

## Affected Frontend Routes

- `/prayer-wall` (verify AudioPill renders, music continues from prior route, no overlap with sticky filter row at `PrayerWall.tsx:1194-1199`)
- `/prayer-wall/:id` (verify AudioPill renders, music continues, no overlap)
- `/prayer-wall/dashboard` (verify AudioPill renders, music continues, no overlap)
- `/prayer-wall/user/:id` (verify AudioPill renders, music continues, no overlap)
- `/music` (start point — verify the AudioPill survives the navigation away)

The Music page is the typical entry — user starts a playlist there, navigates to Prayer Wall, the AudioPill follows them. The spec does NOT change the Music page itself.

---

## STAY ON BRANCH

Same as Phase 6, 7.1, 7.2 — stay on `forums-wave-continued`. No git mutation commands at any phase. Read-only git inspection (`git status`, `git diff`, `git log`, `git show`, `git blame`) is permitted.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

Every claim below cites live code. Plan-recon re-confirms at execute time.

| Item | Status | Evidence |
|---|---|---|
| `AudioProvider` is mounted at App root, wrapping every route | ✅ | `frontend/src/App.tsx:243` — `<AudioProvider>` wraps `<AudioPlayerProvider>` and all `<Suspense>` / `<Routes>` children. Music playback state persists across route changes by React Context contract |
| `AudioProvider` renders `AudioPill` and `AudioDrawer` globally | ✅ | `frontend/src/components/audio/AudioProvider.tsx:15-16` (imports), `:300` (renders `<AudioPill />` inside the provider). Both are children of the provider, so they appear on every route by default |
| `AudioPill` IS the "FAB" the stub refers to (no component named `MiniPlayerFAB` exists) | ✅ | Stub uses "FAB" informally. `frontend/src/components/audio/AudioPill.tsx` is the floating bottom-anchored audio control. Two render paths: routine-shortcut variant (lines 62-72) + general-playback variant (lines 110-117). Both use `fixed bottom-*` positioning |
| `AudioPill` uses `fixed bottom-*` positioning | ✅ | `AudioPill.tsx:65` (`className=".... fixed bottom-..."`) and `:112` (same pattern). Exact bottom offset requires reading the full className strings; plan-recon confirms |
| PrayerWall.tsx has a sticky filter row with an IntersectionObserver sentinel | ✅ | `PrayerWall.tsx:288-300` — `filterSentinelRef` + IntersectionObserver tracks when the sticky bar pins. `:1194-1199` — the actual sticky element rendered with `className={cn('sticky', ...)}` |
| `data-prayer-wall` attribute is ALREADY set on `<html>` for Prayer Wall routes | ✅ | `App.tsx:170-203` — code comment lines 171–175 explain it's for Spec 6.3 Night Mode no-FOUC bootstrap. `index.css:127-129` notes the attribute "persists as a forward-compat signal for any future non-brown" styling. Test coverage at `night-mode-resolver-parity.test.ts:37-64` |
| Existing UpdatePrompt UI already coordinates positioning with AudioPill visibility | ✅ | `frontend/src/components/pwa/UpdatePrompt.test.tsx:90-105` — tests assert that UpdatePrompt's `bottom-6` class changes based on `mockPillVisible`. Pattern exists; AudioPill is already a citizen of the bottom-stack coordination layer |
| Audio test infrastructure exists for cross-route scenarios | ✅ | Multiple test files use `<AudioProvider><AudioPlayerProvider>` wrapping pattern: `BibleReaderAudio.test.tsx:178-191`, `BibleReader.test.tsx:136-149`, `bb27-ambient-coordination.test.tsx:107-117`, etc. Cross-route AudioProvider testing has established patterns |
| `AudioProvider` is BB-26 era (per stub) | ✅ (claim) | Stub says "existing AudioProvider context (BB-26 era)." Plan-recon confirms by reading the git history or the file header — not load-bearing |

**Recon override:** Two important findings change the spec's framing:
1. **`data-prayer-wall` already exists.** The stub's "add a `data-prayer-wall` flag to adjust the FAB position" wording is misleading — the flag IS already set on `<html>` for night-mode reasons. The spec leverages the existing attribute via CSS, doesn't invent a new one.
2. **AudioPill and UpdatePrompt already coordinate.** The bottom-stack coordination layer already exists. The spec's FAB-overlap concern may be partially addressed already; plan-recon confirms by reading whether sticky filter row also coordinates.

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** Treat 7.3 as primarily a verification spec. The first decision point is the manual QA pass; only if QA reveals real visual overlap does the spec touch code. Don't preemptively add CSS that "might" address overlap — verify first.

**MPD-2.** If FAB overlap exists, the fix uses CSS keyed on the EXISTING `html[data-prayer-wall]` attribute, NOT a new `data-prayer-wall` attribute on a specific element. One CSS rule, scoped to AudioPill. Example: `html[data-prayer-wall] .audio-pill { bottom: <new-offset> }`. Plan-recon picks the new offset based on what the sticky filter row actually occupies.

**MPD-3.** The 4-manual-QA-case minimum in the stub maps to these specific cases:
- **QA-1:** Start a worship playlist on `/music`, navigate to `/prayer-wall`. Verify playback continues uninterrupted. AudioPill visible on Prayer Wall.
- **QA-2:** From `/prayer-wall` with music playing, navigate to a prayer detail page (`/prayer-wall/:id`). Verify playback continues. AudioPill visible.
- **QA-3:** From `/prayer-wall/:id`, navigate back to `/prayer-wall`. Verify playback continues, AudioPill visible.
- **QA-4:** From `/prayer-wall`, navigate to `/prayer-wall/dashboard` and `/prayer-wall/user/:id`. Verify playback continues, AudioPill visible on both.
- **QA-5 (overlap check):** On `/prayer-wall` with playback active, scroll down to where the filter row becomes sticky. Verify NO visual overlap between the AudioPill and the sticky filter row at desktop (1366px), tablet (768px), and mobile (375px) viewports. If overlap → file the CSS fix.
- **QA-6 (drawer check):** Tap the AudioPill on `/prayer-wall`. Verify AudioDrawer opens correctly, with full controls accessible. Tap close. Verify drawer closes without disrupting Prayer Wall scroll position.

**MPD-4.** Automated test coverage is light — manual QA is the primary tool here. The stub says "At least 4 manual QA cases verified" which is the spec's primary deliverable. The spec MAY add 1–2 automated tests if QA-5 reveals a CSS fix, asserting the CSS rule applies on Prayer Wall routes.

**MPD-5.** No new frontend code is expected unless QA-5 reveals overlap. If overlap exists, the fix is bounded to:
- A single CSS rule in either `AudioPill.tsx`'s className strings (using a tailwind class conditional on a route check) OR `index.css` (using the existing `html[data-prayer-wall]` selector). Plan-recon picks. Prefer CSS-only solution; avoid adding route-check logic inside AudioPill TypeScript.
- 1–2 tests asserting the CSS rule fires (e.g., snapshot or attribute-presence test).

**MPD-6.** No backend changes. The spec is frontend-only verification.

**MPD-7.** Audio state behavior beyond playback continuity (e.g., volume, queue, current-track display, scrubber position, mute) is in-scope only insofar as "verify the existing behavior continues to work on Prayer Wall." The spec does NOT test new audio features.

---

## Plan-Recon Gating Questions (R1–R5)

These are load-bearing. Plan-recon MUST resolve each before execute. Same discipline as 7.1, 7.2.

**R1 — FAB overlap actually exists? (the load-bearing finding).** Three options:
- (a) **No overlap.** AudioPill's bottom offset and the sticky filter row's bottom-of-pinned-state don't visually collide. Spec collapses to verification only — manual QA cases 1–6 pass, no code change ships. This is the cheapest outcome and the most likely given that UpdatePrompt + AudioPill already coordinate.
- (b) **Real overlap at one or more viewport sizes.** Plan-recon QA-5 produces evidence (screenshot or measurement). Fix per MPD-2: CSS rule keyed on `html[data-prayer-wall]` bumping AudioPill's bottom offset.
- (c) **Overlap exists AND it interacts badly with UpdatePrompt's coordination layer.** Larger fix. Plan-recon surfaces and Eric decides scope.

**Default per MPD-1: defer the decision to QA.** No preemptive code change. Brief assumes (a) but plans for (b).

**R2 — `data-prayer-wall` semantics conflict?** The attribute is owned by Spec 6.3 (Night Mode). Plan-recon confirms:
- Adding a CSS rule that reads `html[data-prayer-wall]` to adjust AudioPill positioning does NOT change the night-mode contract (the night-mode code only writes the attribute, it doesn't read it back for any other purpose at runtime per the recon)
- The two uses (night-mode source + 7.3 styling consumer) coexist cleanly
- The attribute test in `night-mode-resolver-parity.test.ts` does NOT need to change

If plan-recon finds a conflict, the spec uses a different mechanism (e.g., a new CSS class on the AudioPill component conditioned on a route hook).

**R3 — AudioDrawer accessibility on Prayer Wall (AC-2).** The stub AC says "AudioDrawer accessible from all 4 Prayer Wall pages." Plan-recon confirms:
- Tapping the AudioPill opens the drawer regardless of route (since AudioPill + AudioDrawer are both rendered globally from AudioProvider)
- The drawer's positioning / z-index / backdrop is correct on Prayer Wall (no clipping by Prayer Wall's overflow rules, etc.)
- The drawer's close behavior does not disrupt Prayer Wall's scroll position or sticky state

Manual QA-6 verifies this. Plan-recon may add a quick visual check at execute time.

**R4 — Audio playback during Prayer Wall feed reads.** A subtle question: when the user is on Prayer Wall, the feed makes background polling / fetch requests. Could those requests interfere with audio playback (e.g., audio stutter, network contention)?
- Default: NO. The audio engine uses Web Audio API + buffered streams; HTTP fetches don't compete for audio resources
- Plan-recon confirms by reading `AudioProvider.tsx` for the engine setup and confirming no shared resource pool between audio and Prayer Wall fetch
- Manual QA-1 should incidentally verify (10+ minutes of playback while scrolling Prayer Wall → no audio stutter)

If plan-recon finds a real concern (e.g., service worker fetch interception affects audio streaming), the spec scope grows; plan-recon surfaces.

**R5 — Crisis-flagged Prayer Wall page and audio.** When a user is on a crisis-flagged prayer detail page, the spec 6.4 / 6.11b crisis-suppression UI is active. Should audio pause / lower volume / be suppressed during crisis-flagged content?
- Default: NO. Audio is a comfort/companion feature; abruptly stopping it on a crisis page would be jarring and would conflict with the anti-pressure design
- Plan-recon confirms by reading any existing audio-crisis interaction (probably none, but worth verifying)
- The AudioPill itself should remain visible and tappable on crisis-flagged pages; the user can choose to pause if they want

If Eric prefers audio to auto-pause on crisis-flagged pages, plan-recon surfaces and the spec grows. Default leans toward NO change.

---

## Section 1 — As-Designed Behavior

### 1.1 Music continuity across navigation

User starts a worship playlist (or any audio content) on `/music`. They navigate to any Prayer Wall route. Per the React Context contract of `AudioProvider` (mounted at `App.tsx:243`), the audio state persists across route changes. The audio engine continues playback uninterrupted. The AudioPill remains visible at its bottom-anchored fixed position.

### 1.2 AudioPill visibility

The AudioPill renders globally from inside `AudioProvider` (`AudioProvider.tsx:300`). On Prayer Wall routes, the AudioPill is visible at its bottom-anchored fixed position. The user can tap it to expand AudioDrawer.

### 1.3 AudioDrawer access

Tapping the AudioPill opens the AudioDrawer (also globally rendered from `AudioProvider.tsx:16`). The drawer's controls (play/pause, skip, volume, queue, save) are accessible on Prayer Wall same as on any other route. Tapping outside or pressing Escape closes the drawer.

### 1.4 FAB overlap with sticky filter row

When the user scrolls Prayer Wall and the filter row pins (sticky state, `PrayerWall.tsx:1194-1199`), the AudioPill must NOT visually overlap or interfere with the sticky filter row. Per MPD-1, this is verified by QA-5. If overlap exists, MPD-2 specifies the CSS fix.

### 1.5 No new audio features

7.3 does NOT add new audio features. The scope is "verify existing AudioProvider works on Prayer Wall + polish FAB positioning if needed."

---

## Section 2 — Gates

- **Gate-G-PLAYBACK-CONTINUITY.** Audio playback initiated on `/music` continues uninterrupted across navigation to any of the 4 Prayer Wall routes. Manual QA cases 1–4.
- **Gate-G-AUDIOPILL-VISIBLE.** AudioPill renders on all 4 Prayer Wall routes when audio is playing. Manual QA cases 1–4 incidentally verify.
- **Gate-G-DRAWER-ACCESSIBLE.** AudioDrawer opens correctly from the AudioPill on all 4 Prayer Wall routes. Manual QA case 6.
- **Gate-G-NO-FAB-OVERLAP.** AudioPill does not visually overlap the sticky filter row at any tested viewport (desktop 1366px, tablet 768px, mobile 375px). Manual QA case 5. If overlap exists, CSS fix per MPD-2 + new automated test.
- **Gate-G-NO-NEW-AUDIO-CODE.** No new audio engine, state, or feature code lands. Verified by code-review checking that no diffs touch `AudioProvider.tsx`, `audioReducer.ts`, `AudioEngineService`, or any new audio components.
- **Gate-G-DATA-PRAYER-WALL-NO-REGRESSION.** If MPD-2's CSS fix uses `html[data-prayer-wall]`, the existing night-mode test at `night-mode-resolver-parity.test.ts:37-64` continues to pass without modification. The attribute's semantics for night-mode are NOT changed.
- **Gate-G-CRISIS-FLAGGED-NO-AUDIO-INTERRUPTION.** Audio playback continues on crisis-flagged prayer detail pages (per R5 default). Manual QA: navigate to a crisis-flagged prayer with music playing, verify audio does not pause or lower.

---

## Section 3 — Tests

The stub minimum is 4 manual QA cases. Realistic count: 6 manual QA cases (per MPD-3) + 0–2 automated tests (only if MPD-2 ships a CSS fix).

**Manual QA cases (6 total — primary deliverable):**
- QA-1: Music → PrayerWall navigation, playback continuity
- QA-2: PrayerWall → PrayerDetail navigation, playback continuity
- QA-3: PrayerDetail → PrayerWall navigation, playback continuity
- QA-4: PrayerWall → Dashboard / Profile navigation, playback continuity
- QA-5: FAB overlap check at 3 viewport sizes (desktop / tablet / mobile)
- QA-6: AudioDrawer open/close on PrayerWall

**Automated tests (conditional, 0–2 tests):**
- ONLY IF QA-5 reveals overlap and MPD-2 ships a CSS fix:
  - Test 1: Snapshot or DOM check confirming AudioPill's computed bottom offset on a Prayer Wall route is different from a non-Prayer-Wall route. Lightweight assertion.
  - Test 2: Optional integration check that AudioPill remains visible and tappable when the sticky filter row is pinned.

**Documentation deliverable:**
- A manual QA log file (or section in the spec's execute output) documenting each QA case's result with a brief note (PASS / FAIL + screenshot link if FAIL). The log lives in `_plans/forums/spec-7-3-qa-log.md` or similar.

---

## Section 4 — Anti-Pressure + Privacy Decisions

- Audio is a comfort feature, not engagement bait. The AudioPill's bottom-anchored positioning is intentionally non-intrusive — don't make it more prominent on Prayer Wall.
- Per R5 default, audio does NOT auto-pause on crisis-flagged pages. The user retains control. Anti-pressure rule: don't override the user's audio choices based on content-flag inference.
- The spec does NOT add engagement-tracking analytics around audio + Prayer Wall co-usage. If Eric ever wants "people who pray with music stay longer" metrics, that's a separate spec that the anti-pressure design wave (W1 broadly) likely opposes.
- AudioPill / AudioDrawer copy and visual treatment are NOT changed by this spec.

---

## Section 5 — Deferred / Out of Scope

- **New audio features.** Adding "Prayer Wall–specific" playlists, recommendations, or "play this song while you read prayers" CTAs are out of scope. 7.3 is verify-and-polish only.
- **Daily Hub ↔ Music bridge.** Possibly part of a future Phase 7 spec (7.4 onward). Not 7.3.
- **Bible ↔ Music bridge.** Similarly future.
- **Mobile native audio session handling.** PWA / Capacitor audio session interactions are out of scope. Audio works on web; native concerns deferred to mobile wrap.
- **AudioPlayer accessibility deep audit.** A broader a11y pass on AudioPill / AudioDrawer would be its own spec; 7.3 doesn't touch the audio components' a11y.
- **AudioPill positioning on other routes.** 7.3 only touches Prayer Wall–specific positioning if overlap exists there. Other routes' AudioPill positioning is not in scope.
- **`useNotifications` mock-data flake, Bible data layer consolidation, framework majors, X-RateLimit-* standardization, PrayCeremony load-induced timeout, presence WARN log noise control.** All still parked.

---

## Pipeline Notes

- **`/playwright-recon` (RECOMMENDED for this spec specifically):** Capture screenshots of `/prayer-wall` at 3 viewport sizes with the AudioPill visible (music playing) AND with the filter row pinned. This is the primary evidence for QA-5. Without these screenshots, the overlap check is subjective.
- **`/spec-forums`:** Produces the actual spec file at `_specs/forums/spec-7-3.md` from this brief.
- **`/plan-forums`:** Resolves R1–R5. R1 is load-bearing (whether overlap exists). Manual QA happens at plan-recon time OR at execute time, depending on Eric's preference; recommend at execute time so plan stays small.
- **`/execute-plan-forums`:** Mostly manual QA execution. Logs results. Only ships CSS code + tests if QA-5 reveals overlap.
- **`/code-review`:** Standard pass. Specifically check Gate-G-NO-NEW-AUDIO-CODE and Gate-G-DATA-PRAYER-WALL-NO-REGRESSION.
- **`/verify-with-playwright`:** Verify the QA cases via Playwright if Eric wants automated verification of what the manual QA caught. Otherwise the manual QA log is sufficient.
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.3 stub (master plan lines 6403–6418, tracker row 95)
- `frontend/src/App.tsx:243` — AudioProvider root mount; `:170-203` — existing `data-prayer-wall` setter for Night Mode
- `frontend/src/components/audio/AudioProvider.tsx:15-16,300` — global AudioPill + AudioDrawer rendering
- `frontend/src/components/audio/AudioPill.tsx:62-72,110-117` — two render paths, both `fixed bottom-*`
- `frontend/src/components/audio/AudioDrawer.tsx` — the drawer the FAB opens
- `frontend/src/pages/PrayerWall.tsx:288-300,1194-1199` — sticky filter row + IntersectionObserver
- `frontend/src/components/pwa/UpdatePrompt.test.tsx:90-105` — existing bottom-stack coordination pattern
- `frontend/src/index.css:125-129` — `data-prayer-wall` styling notes
- `frontend/src/lib/__tests__/night-mode-resolver-parity.test.ts:37-64` — existing test that verifies Spec 6.3 attribute contract (must NOT regress per Gate-G-DATA-PRAYER-WALL-NO-REGRESSION)
- `_plans/forums/spec-7-2-brief.md` — sibling brief (7.2 is currently in flight, 7.3 follows it)
- `_plans/forums/spec-7-1-brief.md` — sibling brief (7.1 shipped earlier today)
- BB-26 — the audio system era referenced by the stub
