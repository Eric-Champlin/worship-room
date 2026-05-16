# Forums Wave: Spec 7.3 — Music During Prayer Wall

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 7.3 (lines 6403–6418, tracker row 95)
**Spec ID:** `round3-phase07-spec03-music-during-prayer-wall`
**Phase:** 7 (Cross-Feature Integration) — third spec, follows 7.1 (shipped) + 7.2 (in flight per tracker row 94)
**Branch:** `forums-wave-continued` (no branch switch — Phase 6 / 7.1 / 7.2 discipline)
**Date:** 2026-05-16
**Size:** S
**Risk:** Low
**Prerequisites:** Spec 7.2 (tracker ⬜ at brief-authoring time per row 94 — Eric is queueing 7.3 ahead; planner must re-verify 7.2 status before execute)
**Tier:** Standard

**Brief Source:** `_plans/forums/spec-7-3-brief.md`, authored 2026-05-16 against the live master plan stub + live code recon.

**Goal:** Verify that the existing `AudioProvider` context (BB-26 era) supports music continuing to play while the user navigates Prayer Wall pages. The vast majority of the work is manual QA + verification — only a CSS adjustment (~5 lines) ships if QA-5 reveals real overlap between `AudioPill` and the sticky filter row.

**Risk rationale:** `AudioProvider` is mounted at `App.tsx:243` (root level), wrapping every route. `AudioPill` (the "FAB" the stub refers to) renders globally from inside `AudioProvider.tsx:300`. Music continuity across navigation is a property of the existing global provider, not Prayer Wall-specific. The risk is bounded to (a) discovering edge cases where the FAB overlaps PrayerWall's sticky filter row at specific viewport sizes, and (b) the spec turning out to be larger than "verify" if the AudioPill's positioning interferes with the sticky behavior in a way that needs a real fix.

---

## Affected Frontend Routes

- `/prayer-wall` — verify AudioPill renders, music continues from prior route, no overlap with sticky filter row at `PrayerWall.tsx:1194-1199`
- `/prayer-wall/:id` — verify AudioPill renders, music continues, no overlap
- `/prayer-wall/dashboard` — verify AudioPill renders, music continues, no overlap
- `/prayer-wall/user/:id` — verify AudioPill renders, music continues, no overlap
- `/music` — start point; verify the AudioPill survives navigation away

The Music page is the typical entry — user starts a playlist there, navigates to Prayer Wall, the AudioPill follows them. The spec does NOT change the Music page itself.

---

## STAY ON BRANCH

Same as Phase 6, 7.1, 7.2 — stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, `gh pr create`, or any other git-state-mutating command at any phase (spec, plan, execute, review). Eric handles git manually. Read-only git inspection (`git status`, `git diff`, `git log`, `git show`, `git blame`) is permitted.

---

## Post-Brief Recon Override (the load-bearing finding)

**The brief's MPD-2 mechanism is broken as written and needs reconciliation by the planner.**

The brief (recon row 6, "Recon override #1", MPD-2) repeatedly claims that an attribute named `data-prayer-wall` is "already set on `<html>` for Prayer Wall routes" and proposes a CSS rule `html[data-prayer-wall] .audio-pill { bottom: <new-offset> }` if FAB overlap exists.

**That attribute does not exist.** Verified 2026-05-16 against `main` at `forums-wave-continued`:

- `grep -rn "data-prayer-wall" frontend/src frontend/index.html` returns 6 hits, ALL of which are `data-prayer-wall-night-mode-pending` (no plain `data-prayer-wall` anywhere).
- The actual attribute set by the Spec 6.3 inline `index.html` script (lines 37-67) is `data-prayer-wall-night-mode-pending`, set ONLY when `active === true` — meaning when EITHER the user's `wr_settings.prayerWall.nightMode === 'on'` OR the current hour is in the night window (>= 21 or < 6) under `'auto'`. It is NOT set on every Prayer Wall route load.
- `App.tsx:200-201` (`NightModePendingCleanup`) removes the SAME `data-prayer-wall-night-mode-pending` attribute on SPA navigation away from Prayer Wall routes.
- The parity test at `frontend/src/lib/__tests__/night-mode-resolver-parity.test.ts:37-64` only verifies the `-night-mode-pending` attribute is set / unset; there is no test (and no implementation) for a plain `data-prayer-wall` attribute.

**Implication for the spec:**

1. **R1's option (b) "real overlap — CSS fix per MPD-2" cannot use the selector MPD-2 specifies as written.** The selector would only match during a specific time-of-day window (night mode auto) or when the user has explicitly turned night mode on — i.e., a minority of Prayer Wall sessions. A daytime user with night mode off would still see the FAB overlap.
2. **Gate-G-DATA-PRAYER-WALL-NO-REGRESSION** as written is also misframed — there is no plain `data-prayer-wall` to "not regress." The gate's *spirit* (the night-mode attribute contract from Spec 6.3 must not change) is still load-bearing; the wording needs to be updated to reference `data-prayer-wall-night-mode-pending` specifically.

**Planner direction (plan-forums R1.5 — net-new):**

If R1 returns (b) "real overlap exists," the planner must choose between three mechanisms:

- **(b-i) Pure CSS, route-keyed via `useLocation()`-set className on the `AudioPill` element.** Add a conditional `pw-route` class on AudioPill when `useLocation().pathname` starts with `/prayer-wall`. Then `.audio-pill.pw-route { bottom: <new-offset> }`. Single component touch, no global attribute, no night-mode dependency.
- **(b-ii) Plain CSS using the existing `useAudioState().pillVisible` + `useLocation()` combo, like `UpdatePrompt.tsx` already does** (`UpdatePrompt.test.tsx:93-109` verifies UpdatePrompt's `bottom-24` ↔ `bottom-6` toggle keyed on `mockPillVisible`). Mirror that pattern but key on `useLocation()` rather than `pillVisible` (the AudioPill IS the pill — it cannot key on its own visibility).
- **(b-iii) Add a new, intentionally general `data-prayer-wall` attribute** (separate from `data-prayer-wall-night-mode-pending`) set by a small `useEffect` in a Prayer Wall route component. Cleaner from a CSS-only standpoint but introduces a new global attribute contract that future specs would need to respect. Generally worth avoiding unless (b-i) or (b-ii) prove insufficient.

**Recommended default per Worship Room frontend standards: (b-i)** — class-on-component is the most local, most testable, and most consistent with the audio-cluster decoupling discipline (Decision 24: do not introduce new global attribute contracts that the audio cluster has to be aware of).

The planner's R1.5 resolution surfaces to Eric only if R1 returns (b); if R1 returns (a) "no overlap," the spec collapses to verification-only and the recon override is logged in the spec-execute notes without code impact.

---

## Spec-time Recon Summary (verified on disk 2026-05-16)

Every claim below cites live code. Plan-recon re-confirms at execute time.

| Item | Status | Evidence |
|---|---|---|
| `AudioProvider` is mounted at App root, wrapping every route | ✅ | `frontend/src/App.tsx:243` — `<AudioProvider>` wraps `<AudioPlayerProvider>` and all `<Suspense>` / `<Routes>` children. Music playback state persists across route changes by React Context contract |
| `AudioProvider` renders `AudioPill` and `AudioDrawer` globally | ✅ | `frontend/src/components/audio/AudioProvider.tsx:15-16` (imports), `:295` (`<AudioDrawer />` inside SleepTimerBridge), `:300` (`<AudioPill />`). Both are children of the provider, so they appear on every route by default |
| `AudioPill` IS the "FAB" the stub refers to (no component named `MiniPlayerFAB` exists) | ✅ | Stub uses "FAB" informally. `frontend/src/components/audio/AudioPill.tsx` is the floating bottom-anchored audio control. Two render paths: routine-shortcut variant (lines 61-91) + general-playback variant (lines 109-149). Both use `fixed bottom-*` positioning |
| `AudioPill` uses `fixed bottom-*` positioning | ✅ | `AudioPill.tsx:65` (routine-shortcut variant — `fixed z-[${Z.AUDIO_PILL}] ... bottom-0 ... mb-[max(24px,calc(env(safe-area-inset-bottom)+8px))] lg:left-auto lg:right-6 lg:bottom-6 lg:translate-x-0 lg:mb-0`) and `:112` (now-playing variant — identical positioning class string). Mobile: centered along bottom edge with safe-area-inset. Desktop (lg+): bottom-right at `bottom-6 right-6` |
| PrayerWall.tsx has a sticky filter row with an IntersectionObserver sentinel | ✅ | `PrayerWall.tsx:290-303` — `filterSentinelRef` + IntersectionObserver tracks when the sticky bar pins. `:1192-1208` — the actual sticky element rendered with `className={cn('sticky top-0 z-30 -mx-4 transition-shadow ... bg-hero-mid/90 backdrop-blur-sm border-b border-white/[0.12]', isFilterSticky && 'shadow-md')}`. **Visible only on viewports `<xl` (mobile + tablet)** per line 1192's `<div className="xl:hidden">` wrapper — desktop xl+ uses a left-sidebar CategoryFilters component instead. This means FAB overlap can ONLY occur on mobile + tablet viewports |
| ⚠️ **`data-prayer-wall` attribute does NOT exist** (brief misread) | ❌ | See "Post-Brief Recon Override" section above. The actual attribute is `data-prayer-wall-night-mode-pending`, set conditionally by `index.html:37-67` inline script and cleaned by `App.tsx:194-205` `NightModePendingCleanup`. Brief's MPD-2 selector is invalid as written. |
| Existing UpdatePrompt UI already coordinates positioning with AudioPill visibility | ✅ | `frontend/src/components/pwa/UpdatePrompt.test.tsx:93-109` — tests assert that UpdatePrompt's `bottom-24` ↔ `bottom-6` class changes based on `mockPillVisible`. The bottom-stack coordination pattern exists; AudioPill is already a citizen of it. The pattern's mechanism is a React hook (`useAudioState().pillVisible` consumed by UpdatePrompt and conditional className) — NOT a global HTML attribute |
| Audio test infrastructure exists for cross-route scenarios | ✅ | Multiple test files use `<AudioProvider><AudioPlayerProvider>` wrapping pattern: `BibleReaderAudio.test.tsx:178-191`, `BibleReader.test.tsx:136-149`, `bb27-ambient-coordination.test.tsx:107-117`, etc. Cross-route AudioProvider testing has established patterns |
| `AudioProvider` is BB-26 era (per stub) | ✅ (claim) | Stub says "existing AudioProvider context (BB-26 era)." Plan-recon confirms by reading the git history or the file header — not load-bearing |
| `AudioProvider` already auto-closes the drawer on route change | ✅ (new finding) | `AudioProvider.tsx:279-284` — `useEffect` watching `location.pathname` dispatches `CLOSE_DRAWER` when the path changes. This is a property of the existing provider and **not in scope for 7.3 to alter**, but it confirms that route navigation already triggers audio-cluster state coordination, which is why QA-6 (drawer open/close on Prayer Wall) is expected to pass without any new wiring |

---

## Major Plan Decisions (MPD) — baked into this brief

**MPD-1.** Treat 7.3 as primarily a verification spec. The first decision point is the manual QA pass; only if QA reveals real visual overlap does the spec touch code. Don't preemptively add CSS that "might" address overlap — verify first.

**MPD-2.** If FAB overlap exists, the fix uses the **class-on-component pattern (b-i)** per the Post-Brief Recon Override above, NOT the `html[data-prayer-wall]` selector originally proposed (that attribute does not exist). The conditional CSS rule lives on the `AudioPill` component scoped via a route-aware className. Plan-recon picks the new bottom offset based on the actual sticky filter row's pinned-state height (~ 56-60px observed for `CategoryFilters variant="mobile"` plus its border + padding — confirm during QA-5 with `boundingBox()`).

**MPD-3.** The 4-manual-QA-case minimum in the stub maps to these specific cases:
- **QA-1:** Start a worship playlist on `/music`, navigate to `/prayer-wall`. Verify playback continues uninterrupted. AudioPill visible on Prayer Wall.
- **QA-2:** From `/prayer-wall` with music playing, navigate to a prayer detail page (`/prayer-wall/:id`). Verify playback continues. AudioPill visible.
- **QA-3:** From `/prayer-wall/:id`, navigate back to `/prayer-wall`. Verify playback continues, AudioPill visible.
- **QA-4:** From `/prayer-wall`, navigate to `/prayer-wall/dashboard` and `/prayer-wall/user/:id`. Verify playback continues, AudioPill visible on both.
- **QA-5 (overlap check):** On `/prayer-wall` with playback active, scroll down to where the filter row becomes sticky. Verify NO visual overlap between the AudioPill and the sticky filter row at desktop (1366px), tablet (768px), and mobile (375px) viewports. **Note: the sticky filter row only renders at `<xl` viewports** — so desktop xl+ (≥1280px) is by definition overlap-free with this filter row. The QA-5 check applies to mobile + tablet only for the filter row; desktop should still verify the AudioPill renders without any other surface overlap. If overlap → file the CSS fix per MPD-2 mechanism (b-i).
- **QA-6 (drawer check):** Tap the AudioPill on `/prayer-wall`. Verify AudioDrawer opens correctly, with full controls accessible. Tap close. Verify drawer closes without disrupting Prayer Wall scroll position. (Note: `AudioProvider.tsx:279-284` already auto-closes the drawer on route change — this QA verifies open/close from a tap, not the route-change side effect.)

**MPD-4.** Automated test coverage is light — manual QA is the primary tool here. The stub says "At least 4 manual QA cases verified" which is the spec's primary deliverable. The spec MAY add 1–2 automated tests if QA-5 reveals a CSS fix, asserting the CSS rule applies on Prayer Wall routes.

**MPD-5.** No new frontend code is expected unless QA-5 reveals overlap. If overlap exists, the fix is bounded to:
- A single conditional className addition in `AudioPill.tsx` (added when `useLocation().pathname.startsWith('/prayer-wall')`) coordinating a new bottom offset, OR a tailwind utility added to the existing className string conditionally. Plan-recon picks the exact tailwind class (likely `bottom-24` mirroring UpdatePrompt's coordination value, or a smaller offset measured against the actual sticky filter row height).
- 1–2 tests asserting the conditional className fires on Prayer Wall routes (component snapshot or attribute-presence test). Mirror the test pattern from `UpdatePrompt.test.tsx:93-109`.

**MPD-6.** No backend changes. The spec is frontend-only verification.

**MPD-7.** Audio state behavior beyond playback continuity (e.g., volume, queue, current-track display, scrubber position, mute) is in-scope only insofar as "verify the existing behavior continues to work on Prayer Wall." The spec does NOT test new audio features.

---

## Plan-Recon Gating Questions (R1–R6)

These are load-bearing. Plan-recon MUST resolve each before execute. Same discipline as 7.1, 7.2. R1.5 is net-new per the Post-Brief Recon Override.

**R1 — FAB overlap actually exists? (the load-bearing finding).** Three options:
- (a) **No overlap.** AudioPill's bottom offset and the sticky filter row's bottom-of-pinned-state don't visually collide. Spec collapses to verification only — manual QA cases 1–6 pass, no code change ships. This is the cheapest outcome and the most likely given that UpdatePrompt + AudioPill already coordinate AND the sticky filter row only renders at `<xl` viewports.
- (b) **Real overlap at one or more viewport sizes** (mobile and/or tablet — desktop xl+ is overlap-free with the filter row by design). Plan-recon QA-5 produces evidence (screenshot or `boundingBox()` measurement). Fix per MPD-2 with mechanism R1.5(b-i).
- (c) **Overlap exists AND it interacts badly with UpdatePrompt's coordination layer.** Larger fix. Plan-recon surfaces and Eric decides scope.

**Default per MPD-1: defer the decision to QA.** No preemptive code change. Brief assumes (a) but plans for (b).

**R1.5 — If R1 returns (b), which selector mechanism? (NEW per Post-Brief Recon Override).** Three options (in recommendation order):
- (b-i) **Route-aware conditional className on AudioPill via `useLocation().pathname.startsWith('/prayer-wall')`** — recommended default. Local, testable, no new global attribute contract.
- (b-ii) **Mirror UpdatePrompt's `useAudioState().pillVisible` + conditional className pattern, keyed on `useLocation()` instead** — also acceptable; same shape as the established UpdatePrompt coordination.
- (b-iii) **Introduce a new general `data-prayer-wall` attribute** (separate from `data-prayer-wall-night-mode-pending`) — generally avoid unless (b-i)/(b-ii) prove insufficient. Adds a new global attribute contract for future specs to respect.

Default: (b-i). Plan-recon surfaces if the chosen mechanism interacts poorly with the AudioPill's existing two render paths (routine-shortcut variant vs now-playing variant — both would need the className).

**R2 — Night-mode attribute semantics not regressed.** The `data-prayer-wall-night-mode-pending` attribute is owned by Spec 6.3 (Night Mode). Plan-recon confirms:
- 7.3's CSS work does NOT read, write, or depend on the `-night-mode-pending` attribute (under R1.5 default (b-i), this is trivially true — no global attribute is involved)
- The existing parity test at `night-mode-resolver-parity.test.ts:37-64` continues to pass without modification
- The night-mode attribute contract is unchanged

If plan-recon chooses (b-iii) for any reason, this gate becomes load-bearing — the new `data-prayer-wall` attribute MUST coexist with `-night-mode-pending` without collision or shared semantics.

**R3 — AudioDrawer accessibility on Prayer Wall (AC-2 / QA-6).** The stub AC says "AudioDrawer accessible from all 4 Prayer Wall pages." Plan-recon confirms:
- Tapping the AudioPill opens the drawer regardless of route (since AudioPill + AudioDrawer are both rendered globally from AudioProvider)
- The drawer's positioning / z-index / backdrop is correct on Prayer Wall (no clipping by Prayer Wall's overflow rules — note Prayer Wall uses `BackgroundCanvas` per Spec 14, which uses `overflow-x-clip` not `overflow-hidden` per the sticky-safety rule, so no scroll container traps the drawer)
- The drawer's close behavior does not disrupt Prayer Wall's scroll position or sticky state
- **Special note:** `AudioProvider.tsx:279-284` auto-closes the drawer on route change. QA-6 verifies tap-to-open + tap-to-close on the SAME route; the route-change auto-close behavior is a separate property that is NOT a regression target for 7.3.

Manual QA-6 verifies. Plan-recon may add a quick visual check at execute time.

**R4 — Audio playback during Prayer Wall feed reads.** A subtle question: when the user is on Prayer Wall, the feed makes background polling / fetch requests. Could those requests interfere with audio playback (e.g., audio stutter, network contention)?
- Default: NO. The audio engine uses Web Audio API + buffered streams; HTTP fetches don't compete for audio resources
- Plan-recon confirms by reading `AudioProvider.tsx` for the engine setup and confirming no shared resource pool between audio and Prayer Wall fetch
- Manual QA-1 should incidentally verify (10+ minutes of playback while scrolling Prayer Wall → no audio stutter)

If plan-recon finds a real concern (e.g., service worker fetch interception affects audio streaming), the spec scope grows; plan-recon surfaces.

**R5 — Crisis-flagged Prayer Wall page and audio.** When a user is on a crisis-flagged prayer detail page, the Spec 6.4 / 6.11b crisis-suppression UI is active. Should audio pause / lower volume / be suppressed during crisis-flagged content?
- Default: NO. Audio is a comfort/companion feature; abruptly stopping it on a crisis page would be jarring and would conflict with the anti-pressure design
- Plan-recon confirms by reading any existing audio-crisis interaction (probably none, but worth verifying)
- The AudioPill itself should remain visible and tappable on crisis-flagged pages; the user can choose to pause if they want

If Eric prefers audio to auto-pause on crisis-flagged pages, plan-recon surfaces and the spec grows. Default leans toward NO change.

**R6 — Decision 24 (Music chrome decoupling) is not violated.** Music chrome is intentionally decoupled from `BackgroundCanvas`/`FrostedCard` per Decision 24 (see `09-design-system.md` § "BackgroundCanvas Atmospheric Layer"). 7.3's work happens entirely on the AudioPill component (which is OUTSIDE the Music chrome — it's mounted from AudioProvider, not from MusicPage). Plan-recon confirms:
- The conditional className on AudioPill does NOT touch Music chrome
- The CSS rule (if it ships) does NOT pull AudioPill into `BackgroundCanvas` or `FrostedCard` styling
- No new dependency from AudioPill onto chrome layer primitives

Default: trivially true under MPD-2 / R1.5 (b-i). Worth a quick verification gate to make explicit.

---

## Section 1 — As-Designed Behavior

### 1.1 Music continuity across navigation

User starts a worship playlist (or any audio content) on `/music`. They navigate to any Prayer Wall route. Per the React Context contract of `AudioProvider` (mounted at `App.tsx:243`), the audio state persists across route changes. The audio engine continues playback uninterrupted. The AudioPill remains visible at its bottom-anchored fixed position.

### 1.2 AudioPill visibility

The AudioPill renders globally from inside `AudioProvider` (`AudioProvider.tsx:300`). On Prayer Wall routes, the AudioPill is visible at its bottom-anchored fixed position. The user can tap it to expand AudioDrawer.

### 1.3 AudioDrawer access

Tapping the AudioPill opens the AudioDrawer (also globally rendered from `AudioProvider.tsx:295`). The drawer's controls (play/pause, skip, volume, queue, save) are accessible on Prayer Wall same as on any other route. Tapping outside or pressing Escape closes the drawer. **Note:** `AudioProvider.tsx:279-284` already dispatches `CLOSE_DRAWER` on route changes — this is existing behavior and not in 7.3's scope to alter.

### 1.4 FAB overlap with sticky filter row

When the user scrolls Prayer Wall and the filter row pins (sticky state, `PrayerWall.tsx:1192-1208`), the AudioPill must NOT visually overlap or interfere with the sticky filter row. The sticky filter row renders only at `<xl` viewports (mobile + tablet) — desktop xl+ uses a left-sidebar that doesn't compete with the bottom-right AudioPill position. Per MPD-1, overlap is verified by QA-5 at the affected viewport sizes. If overlap exists, MPD-2 / R1.5 specifies the fix mechanism.

### 1.5 No new audio features

7.3 does NOT add new audio features. The scope is "verify existing AudioProvider works on Prayer Wall + polish FAB positioning if needed."

---

## Section 2 — Gates

- **Gate-G-PLAYBACK-CONTINUITY.** Audio playback initiated on `/music` continues uninterrupted across navigation to any of the 4 Prayer Wall routes. Manual QA cases 1–4.
- **Gate-G-AUDIOPILL-VISIBLE.** AudioPill renders on all 4 Prayer Wall routes when audio is playing. Manual QA cases 1–4 incidentally verify.
- **Gate-G-DRAWER-ACCESSIBLE.** AudioDrawer opens correctly from the AudioPill on all 4 Prayer Wall routes. Manual QA case 6.
- **Gate-G-NO-FAB-OVERLAP.** AudioPill does not visually overlap the sticky filter row at any tested viewport (mobile 375px, tablet 768px). Desktop 1366px is overlap-free with the filter row by design (the sticky filter row only renders at `<xl` viewports). Manual QA case 5. If overlap exists, conditional className fix per MPD-2 / R1.5 (b-i) + new automated test.
- **Gate-G-NO-NEW-AUDIO-CODE.** No new audio engine, state, or feature code lands. Verified by code-review checking that no diffs touch `AudioProvider.tsx`, `audioReducer.ts`, `AudioEngineService`, `lib/audio/`, or any new audio components. The ONLY permitted code change is in `AudioPill.tsx` (className conditional) and a sibling test.
- **Gate-G-NIGHT-MODE-ATTR-NO-REGRESSION.** The `data-prayer-wall-night-mode-pending` attribute contract from Spec 6.3 is unchanged. The existing parity test at `frontend/src/lib/__tests__/night-mode-resolver-parity.test.ts:37-64` continues to pass without modification. The `index.html:37-67` inline script is NOT modified. The `App.tsx:194-205` `NightModePendingCleanup` is NOT modified. (Wording corrected from brief's "Gate-G-DATA-PRAYER-WALL-NO-REGRESSION" per Post-Brief Recon Override — the attribute is `-night-mode-pending`, not plain `data-prayer-wall`.)
- **Gate-G-CRISIS-FLAGGED-NO-AUDIO-INTERRUPTION.** Audio playback continues on crisis-flagged prayer detail pages (per R5 default). Manual QA: navigate to a crisis-flagged prayer with music playing, verify audio does not pause or lower.
- **Gate-G-DECISION-24-RESPECTED.** AudioPill's CSS work (if any) does NOT introduce new dependencies on `BackgroundCanvas`, `FrostedCard`, or any chrome-layer primitive. AudioPill stays in the audio cluster's chrome-decoupled layer. (Per R6.)

---

## Section 3 — Tests

The stub minimum is 4 manual QA cases. Realistic count: 6 manual QA cases (per MPD-3) + 0–2 automated tests (only if MPD-2 ships a CSS fix).

**Manual QA cases (6 total — primary deliverable):**
- QA-1: Music → PrayerWall navigation, playback continuity
- QA-2: PrayerWall → PrayerDetail navigation, playback continuity
- QA-3: PrayerDetail → PrayerWall navigation, playback continuity
- QA-4: PrayerWall → Dashboard / Profile navigation, playback continuity
- QA-5: FAB overlap check at 2 viewport sizes (mobile 375px, tablet 768px) — desktop xl+ is exempted per Gate-G-NO-FAB-OVERLAP wording
- QA-6: AudioDrawer open/close on PrayerWall

**Automated tests (conditional, 0–2 tests):**

ONLY IF QA-5 reveals overlap and R1.5 (b-i) ships:
- Test 1: Render AudioPill within a `MemoryRouter` initialized at `/prayer-wall`. Assert the rendered AudioPill className contains the Prayer-Wall-specific bottom-offset utility (e.g., `bottom-24` or whatever offset plan-recon picks). Render at a non-Prayer-Wall route (e.g., `/daily`); assert the default offset utility is present and the Prayer-Wall-specific one is NOT.
- Test 2 (optional integration): Render PrayerWall with mocked `AudioState` showing pill visible; scroll the filter row into sticky state; assert AudioPill's `boundingBox().y` does not overlap the sticky filter row's bounding box. Lightweight — can be a `getBoundingClientRect` check.

**Mirror UpdatePrompt's test pattern:** `frontend/src/components/pwa/UpdatePrompt.test.tsx:93-109` is the canonical example of testing conditional bottom-offset className based on context. New AudioPill tests should mirror that shape (mock the relevant hook, render, assert className contains the expected utility).

**Documentation deliverable:**

A manual QA log file documenting each QA case's result with a brief note (PASS / FAIL + screenshot link if FAIL). The log lives at `_plans/forums/spec-7-3-qa-log.md` (created at execute time).

---

## Section 4 — Anti-Pressure + Privacy Decisions

- Audio is a comfort feature, not engagement bait. The AudioPill's bottom-anchored positioning is intentionally non-intrusive — don't make it more prominent on Prayer Wall.
- Per R5 default, audio does NOT auto-pause on crisis-flagged pages. The user retains control. Anti-pressure rule: don't override the user's audio choices based on content-flag inference.
- The spec does NOT add engagement-tracking analytics around audio + Prayer Wall co-usage. If Eric ever wants "people who pray with music stay longer" metrics, that's a separate spec that the anti-pressure design wave (W1 broadly) likely opposes.
- AudioPill / AudioDrawer copy and visual treatment are NOT changed by this spec.
- No new copy strings ship with this spec. The Anti-Pressure Copy Checklist is trivially satisfied (no copy to review). If R1 returns (b) and a CSS fix ships, no copy is involved — purely positional.

---

## Section 5 — Deferred / Out of Scope

- **New audio features.** Adding "Prayer Wall–specific" playlists, recommendations, or "play this song while you read prayers" CTAs are out of scope. 7.3 is verify-and-polish only.
- **Daily Hub ↔ Music bridge.** Possibly part of a future Phase 7 spec (7.4 onward). Not 7.3.
- **Bible ↔ Music bridge.** Similarly future.
- **Mobile native audio session handling.** PWA / Capacitor audio session interactions are out of scope. Audio works on web; native concerns deferred to mobile wrap.
- **AudioPlayer accessibility deep audit.** A broader a11y pass on AudioPill / AudioDrawer would be its own spec; 7.3 doesn't touch the audio components' a11y.
- **AudioPill positioning on other routes.** 7.3 only touches Prayer Wall–specific positioning if overlap exists there. Other routes' AudioPill positioning is not in scope.
- **Auto-pause audio on crisis content.** Per R5 default, audio does NOT auto-pause on crisis-flagged pages. Anti-pressure design wins. If Eric ever wants this behavior, separate spec.
- **Music chrome migration to `BackgroundCanvas` or `FrostedCard`.** Per Decision 24, Music chrome is intentionally decoupled. 7.3 does NOT migrate Music chrome. The Music chrome migration would be its own spec with explicit Decision 24 reconciliation.
- **Introducing a plain `data-prayer-wall` global attribute.** Per Post-Brief Recon Override R1.5 (b-iii) is documented as available but not recommended. 7.3 defaults to (b-i) (route-aware className) which avoids introducing a new global attribute contract.
- **`useNotifications` mock-data flake, Bible data layer consolidation, framework majors, X-RateLimit-* standardization, PrayCeremony load-induced timeout, presence WARN log noise control.** All still parked.

---

## Acceptance Criteria (from master plan stub + Post-Brief Recon Override updates)

- [ ] **AC-1** — Music continues to play across Prayer Wall navigation (Gate-G-PLAYBACK-CONTINUITY).
- [ ] **AC-2** — AudioDrawer accessible from all 4 Prayer Wall pages (Gate-G-DRAWER-ACCESSIBLE).
- [ ] **AC-3** — No FAB overlap with sticky elements at the affected viewports (Gate-G-NO-FAB-OVERLAP, scoped to mobile + tablet per recon row 5 — sticky filter row is `xl:hidden`).
- [ ] **AC-4** — At least 4 manual QA cases verified (spec plans 6).
- [ ] **AC-5 (net-new per Recon Override)** — `data-prayer-wall-night-mode-pending` attribute contract is unchanged; no plain `data-prayer-wall` attribute is introduced by 7.3 (Gate-G-NIGHT-MODE-ATTR-NO-REGRESSION + Spec-time Recon row 6).

---

## Notes for Plan-Recon Phase

- **R1 is the load-bearing gate.** Resolve it first via QA-5 evidence. If (a), the spec collapses to verification-only (manual QA log + no code change). If (b), proceed to R1.5.
- **R1.5 selector mechanism choice surfaces to Eric ONLY if R1 returns (b).** Default to (b-i) route-aware className on AudioPill. (b-ii) acceptable as a sibling pattern of UpdatePrompt. (b-iii) requires explicit Eric approval given the new global attribute contract overhead.
- **Plan-recon should also verify 7.2's tracker status before execute begins** — Eric is queueing 7.3 ahead of 7.2's shipping per tracker row 94 (⬜ at brief-authoring time). 7.3's prerequisites depend on 7.2's chip-side `?scroll-to=` work shipping cleanly. If 7.2 has not landed, 7.3 may proceed but the "round-trip from Bible chip back to Prayer Wall + audio continuity" implicit case (QA-2 / QA-3) is partially blocked from end-to-end verification.
- **Recommended `/playwright-recon` step:** Capture screenshots of `/prayer-wall` at 3 viewport sizes with the AudioPill visible (music playing) AND with the filter row pinned. This is the primary evidence for QA-5. Without these screenshots, the overlap check is subjective.

---

## Pipeline Notes

- **`/playwright-recon` (RECOMMENDED for this spec specifically):** Capture screenshots of `/prayer-wall` at 375 / 768 viewport sizes with AudioPill visible and filter row pinned. Primary evidence for QA-5.
- **`/spec-forums`:** Produces this spec file at `_specs/forums/spec-7-3.md` from the brief at `_plans/forums/spec-7-3-brief.md` (DONE — this file).
- **`/plan-forums`:** Resolves R1 (load-bearing) and R1.5 (net-new per Post-Brief Recon Override). Manual QA happens at plan-recon time OR at execute time per Eric's preference; recommend at execute time so plan stays small.
- **`/execute-plan-forums`:** Mostly manual QA execution. Logs results to `_plans/forums/spec-7-3-qa-log.md`. Only ships CSS code + tests if QA-5 reveals overlap.
- **`/code-review`:** Standard pass. Specifically check Gate-G-NO-NEW-AUDIO-CODE, Gate-G-NIGHT-MODE-ATTR-NO-REGRESSION, and Gate-G-DECISION-24-RESPECTED.
- **`/verify-with-playwright`:** Verify the QA cases via Playwright if Eric wants automated verification of what the manual QA caught. Otherwise the manual QA log is sufficient.
- **Eric commits manually** when satisfied.

---

## See Also

- `_forums_master_plan/round3-master-plan.md` Spec 7.3 stub (master plan lines 6403–6418, tracker row 95)
- `_plans/forums/spec-7-3-brief.md` — the source brief this spec was extracted from
- `frontend/src/App.tsx:194-205` (`NightModePendingCleanup` — removes `data-prayer-wall-night-mode-pending` attribute, NOT plain `data-prayer-wall`), `:243` (AudioProvider root mount)
- `frontend/src/components/audio/AudioProvider.tsx:15-16,279-284,295,300` — global AudioPill + AudioDrawer rendering, route-change auto-close drawer effect
- `frontend/src/components/audio/AudioPill.tsx:61-91,109-149` — two render paths (routine-shortcut + now-playing), both `fixed bottom-*`
- `frontend/src/components/audio/AudioDrawer.tsx` — the drawer the FAB opens
- `frontend/src/pages/PrayerWall.tsx:290-303,1192-1208` — sticky filter row + IntersectionObserver (`xl:hidden` wrapper — mobile + tablet only)
- `frontend/src/components/pwa/UpdatePrompt.test.tsx:93-109` — existing bottom-stack coordination pattern (canonical test shape to mirror)
- `frontend/index.html:32-67` — Spec 6.3 inline Night Mode no-FOUC bootstrap (sets `data-prayer-wall-night-mode-pending` conditionally; NOT plain `data-prayer-wall`)
- `frontend/src/index.css:121-131` — comment block noting Prayer Wall night-mode attributes
- `frontend/src/lib/__tests__/night-mode-resolver-parity.test.ts:37-64` — existing test that verifies Spec 6.3 attribute contract (must NOT regress per Gate-G-NIGHT-MODE-ATTR-NO-REGRESSION)
- `_specs/forums/spec-7-2.md` — sibling spec (7.2 is currently in flight; tracker ⬜ at brief-authoring time)
- `_specs/forums/spec-7-1.md` — sibling spec (7.1 shipped earlier today; canonical reference for STAY ON BRANCH discipline)
- `.claude/rules/09-design-system.md` § "BackgroundCanvas Atmospheric Layer" — Decision 24 reconciliation note for Music chrome (relevant to R6)
- `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md` — not directly relevant (no AI in 7.3), but cited for completeness on the Forums Wave guardrail set
- BB-26 / BB-27 — the audio system era referenced by the stub; the entire audio cluster (AudioProvider + audioReducer + AudioEngineService + AudioDrawer + AudioPill) ships from those specs and is the foundation 7.3 verifies
