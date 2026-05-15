# Forums Wave: Spec 6.11 — Sound Effects Settings Polish

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.11 (`round3-phase06-spec11-sound-effects-polish`, lines 6171–6184)
**Brief Source:** `_plans/forums/spec-6-11-brief.md` (preserved verbatim below)
**Branch:** `forums-wave-continued` (per Brief §1 — CC never alters git state at any phase; Phase 6 specs accumulate on this branch — see commits `2a4ccbe Spec 6-11 MD`, `0d519cd Spec 6-10 MD`, `2b189e0 Spec 6-9`, `0659821 Spec 6-9 MD`)
**Date:** 2026-05-15
**Phase:** 6 (Engagement Features)
**Size:** S (per master plan stub) — collapsed to **audit + coverage test + as-built docs** per Eric's 2026-05-15 decision (see "Path Selected" below). The headline AC-A (toggle exists in Settings) is already satisfied on disk; 6.11's actual work is verifying that all three gate-layer call paths respect the existing toggle and amending the master plan stub with an AS-BUILT note.
**Risk:** Low — the toggle, the gate logic, and the default-true semantics already ship correctly. New work is additive (a coverage test + a docs amendment), not behavioral.

---

## Affected Frontend Routes

`/verify-with-playwright` should focus on `/settings` to confirm the toggle's visual home and behavior. The toggle's effect is on hero-feature surfaces (Daily Hub, Prayer Wall, Dashboard) — a narrow Playwright pass on one of those with the toggle off (asserting no sound) is reasonable but the test is unit-testable in Vitest alone. Plan decides.

- `/settings` (canonical surface — toggle lives here today, may move per Decision below)

---

## Spec-time Recon Summary (verified on disk 2026-05-15)

Brief §3 designated R1–R6 as PLAN-RECON-REQUIRED — the planner runs them at `/plan-forums` time. Per the spec-6-10 precedent, this summary captures spec-time filesystem reality up front so the planner can build on confirmed facts rather than re-discover them. **Three of the Brief's load-bearing premises resolve as ALREADY-SATISFIED or MOOT at spec-time.** Findings are AUTHORITATIVE — the planner MUST surface them to Eric per Brief §10 ("Plan STOPS and surfaces") before writing any implementation plan.

| Item | Status | Evidence |
|---|---|---|
| **R1 (GATING): "existing sound effects system"** | ✅ confirmed exists | Two coexisting modules: (a) `frontend/src/lib/sound-effects.ts` exposing 6 synthesized Web Audio sounds (chime, ascending, harp, bell, whisper, sparkle), wrapped by `frontend/src/hooks/useSoundEffects.ts` with `STORAGE_KEY = 'wr_sound_effects_enabled'` (default true on `!== 'false'`) plus a `prefers-reduced-motion` short-circuit; and (b) `frontend/src/lib/quickLiftSound.ts` exposing a feature-specific `playWindChime()` for Quick Lift (Spec 6.2) that DUPLICATES the same gate independently per the comment ("Kept in its own module … because the chime is feature-specific to Quick Lift, not part of the standard palette"). The system exists. R1 passes. |
| **R1.5 (NEW — not in brief): "Sound effects" toggle ALREADY exists in Settings** | ⚠️ **HEADLINE AC-A APPEARS SATISFIED** | `frontend/src/components/settings/NotificationsSection.tsx:74-94` declares `const SOUND_EFFECTS_KEY = 'wr_sound_effects_enabled'` and a `useState` initializer reading the key with `!== 'false'` default-true semantics. Lines 150-157 render a `<ToggleSwitch>` with `id="notif-sound-effects"`, `label="Sound Effects"`, and `description="Play subtle sounds on achievements and milestones."` inside the **Notifications → Sound** subsection. Test coverage at `NotificationsSection.test.tsx:78` confirms toggle-off writes `'false'` to the key. **The brief's Acceptance Criterion A — "Single 'Sound effects' toggle renders in settings" — is satisfied today.** This is the most important spec-time finding; it transforms the spec from "build a toggle" to "audit + relocate?" |
| **R2 — hero-feature sound call sites (the "all" enumeration)** | ⚠️ **3 GATE LAYERS, NOT 1** | Brief W2 assumes "the system gates at one layer." Reality is three readers of the same key: (1) `useSoundEffects().playSoundEffect()` — the central hook used by **17 production files** (`WhisperToast`, `PlanCompletionOverlay`, `PrayerAnsweredCelebration`, `DevotionalTabContent`, `GardenShareButton`, `GratitudeWidget`, `AnniversaryCard`, `EveningReflection` (also reads the key directly — see (3)), `GettingStartedCard`, `WelcomeBack`, `StreakCard`, `CelebrationQueue`, `MoodCheckIn`, `QuickLiftOverlay`, `InteractionBar`, `CelebrateReaction`, `ChallengeDetail`, `Dashboard`); (2) `quickLiftSound.ts` `isSoundEnabled()` — duplicates the check independently for the wind chime (deliberate per the file's header comment); (3) `EveningReflection.tsx:107` — direct `localStorage.getItem('wr_sound_effects_enabled') !== 'false'` check (architectural inconsistency — bypasses the hook). All three READ THE SAME KEY, so the toggle DOES gate every call site today. But the picture is "shared key, three readers," not "one layer." This affects T2/T3 test strategy: a `vi.mock` on `useSoundEffects` will MISS the `quickLiftSound` and `EveningReflection` paths. The right test shape is either (a) localStorage-set + spy on Web Audio output, OR (b) three parallel test fixtures, one per reader. |
| **R3 — settings section structure** | ⚠️ **SECTION MISMATCH** | Brief §3 R3 contemplates the toggle living in the "Gentle extras" section (6.8's home for Verse-Finds-You). Reality: the toggle lives under **Notifications → Sound** in `NotificationsSection.tsx:148-158`. The "Gentle extras" section at `Settings.tsx:254-256` currently hosts only the Verse-Finds-You toggle (`verseFindsYou.enabled`). **This is a Decision Eric must make** at /plan-forums Step 0 — see Path B below. |
| **R4 — 6.10 prereq sequencing-only** | ✅ confirmed | Sound-effects toggle (`NotificationsSection.tsx`) and PrayerCard author-link routing (Spec 6.10 surface, `PrayerCard.tsx`) share zero code. The brief's read is correct: 6.10 is sequencing prereq only, no technical dependency. |
| **R5 — default-on for new users** | ✅ confirmed (already correct) | Both `useSoundEffects.isSoundEffectsEnabled()` (line 11: `return val !== 'false'`) and `quickLiftSound.isSoundEnabled()` (line 15: same pattern) and `NotificationsSection.tsx:76` (same pattern) all use `!== 'false'` default-true semantics. New users (no key set) get `true`. Existing users (key set explicitly to `'true'` or absent) get `true`. Existing users who previously set `'false'` keep `false`. This matches the brief's W3 requirement perfectly — no migration logic needed. |
| **R6 — PrayCeremony runaway-timer adjacency (Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG)** | ⚠️ **APPEARS MOOT — NEEDS ERIC CONFIRMATION** | `find frontend/src -iname "PrayCeremony*"` returns ONLY `frontend/src/components/prayer-wall/__tests__/PrayCeremony.test.tsx` — there is NO production `PrayCeremony.tsx` component file. `git log` confirms the test was last touched by `654e70b prayer-wall-redesign` (the commit referenced in the brief), but the production component is absent. This means EITHER (a) the production component was deleted as part of the prayer-wall-redesign and the test was orphaned, OR (b) `PrayCeremony` was renamed to something else and the test wasn't updated, OR (c) some other refactor situation. The "PrayCeremony runaway-timer bug" the brief warns 6.11 not to mask refers to a **test file's** recursive-`setTimeout` signature, not a production component's behavior. **The Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG and W4 and T6 ALL APPEAR MOOT** — there is no production code path for 6.11 to accidentally mask. **Surfacing to Eric** rather than silently downgrading the gate, because (i) the test failure is real and parked in the tracker, (ii) Eric may know context the recon doesn't, (iii) the brief frames the gate as HARD. |
| Existing test file for the toggle | ✅ exists | `frontend/src/components/settings/__tests__/NotificationsSection.test.tsx` includes at least one test (line 78) verifying toggle-off writes `'false'` to `wr_sound_effects_enabled`. Hook tests at `frontend/src/hooks/__tests__/useSoundEffects.test.ts` verify the gate semantics (lines 45, 60, 67). Default-on coverage is partial — there's a "plays when key not set" test (line 67) but no consolidated "all hero features respect the toggle" test that enumerates the 17 consumers. New 6.11 tests would extend coverage rather than introduce it. |
| Prereq 6.10 (PrayerCard author-link routing) | ⚠️ deferred | Per Brief §intro: 6.10 was deferred 2026-05-15 to after Phase 8's `unified-profile`. Sequencing-only dependency (R4). 6.11 proceeds. |

### Path Selected — Path A: Audit + Coverage Test (Eric decision 2026-05-15)

**The brief was written against the stub language "the existing sound effects system gets exposed in settings" — but the toggle is already exposed in settings, and has been since at least the wave that built `NotificationsSection.tsx`.** Eric reviewed the four spec-time recon findings (R1.5, R2, R3, R6) on 2026-05-15 and made the following decisions. These supersede the brief sections they conflict with — where the brief and these decisions disagree, **these decisions win**.

#### Decisions

1. **R1.5 (toggle already exists) — ACCEPT REALITY.** AC-A is satisfied by the existing `NotificationsSection.tsx:74-94, 150-157` implementation. **Do NOT rebuild it.** The spec's work collapses to audit + coverage.

2. **R2 (three gate layers, all reading the same key) — ACCEPT as a finding; do NOT refactor.** The hook + `quickLiftSound` + `EveningReflection`'s direct localStorage read all gate today via the same key — that's correct, even if `EveningReflection`'s path is architecturally inconsistent. Refactoring `EveningReflection` to go through the hook is **OUT OF SCOPE for 6.11** — document it as a future cleanup but do not absorb. (Brief Gate-G-NO-SCOPE-CREEP applies.)

3. **R3 (toggle lives in Notifications → Sound, not "Gentle extras") — LEAVE IT WHERE IT IS.** The brief's §3 R3 was an expectation, not a requirement. The existing location works, has tests, and users may already know where it is. Cosmetic relocation has nonzero risk for zero functional benefit. **Do NOT move the toggle.** Update the brief's documentation to match reality (this section).

4. **R6 (PrayCeremony "Gate" is moot — no production component exists) — DROP THE GATE.** The brief authored Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG based on a sanity-sweep classification of the test failure as POTENTIAL PROD BUG — that classification was wrong (no prod code to be buggy). **Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG is dropped. Watch-for W4 is dropped. Test T6 is dropped. Acceptance Criterion F is dropped.** The test-file failure remains real test debt for a future cleanup spec but is NOT a production concern for 6.11. The planner should ignore W4/T6/AC-F and Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG when reading the brief below.

#### Revised Scope (what 6.11 actually does)

1. **Audit.** Confirm the existing toggle gates all three call paths — the central `useSoundEffects` hook (17+ production consumers), the `quickLiftSound.playWindChime()` path, and the `EveningReflection.tsx:107` direct-localStorage read. Plan-recon already enumerated these in the table above; the audit step is verifying coverage, not building.

2. **Coverage test (load-bearing new work).** Write a test (or tests) that asserts the toggle gates **ALL THREE PATHS**, not just the central hook. **Test strategy MUST NOT use `vi.mock` on `useSoundEffects`** — per R2, that would miss the `quickLiftSound` and `EveningReflection` paths and produce a false-green. Use real localStorage manipulation (`localStorage.setItem('wr_sound_effects_enabled', 'false')`) plus a wider mock or spy that covers all three call paths (e.g., spy on the underlying Web Audio output, or three test fixtures — one per gate layer). The "at least 1 explicit 'all paths respect toggle' test" is the load-bearing assertion. Total tests target the stub's "at least 4 tests" floor.

3. **Document findings.** In the test file (or a sibling docs comment), record the three gate layers and note `EveningReflection`'s direct-localStorage read as a known architectural inconsistency for future cleanup. This is documentation, not refactor.

4. **Master plan AS-BUILT note.** Amend the 6.11 master plan stub (lines 6171-6184 of `_forums_master_plan/round3-master-plan.md`) with an AS-BUILT RECONCILIATION block (same pattern as the 6.5 amendment from the brief-drift remediation). The stub treats 6.11 as net-new build; the as-built reality is audit + coverage. Note that the toggle landed earlier (find the commit via `git blame frontend/src/components/settings/NotificationsSection.tsx` if quick — otherwise just note "pre-2026-05-15 implementation"). Original "build a toggle" framing preserved for history.

5. **Tracker line.** Add a sibling bullet to `_forums_master_plan/spec-tracker.md`'s Phase 6 work noting 6.11 was found pre-built; 6.11's actual work was audit + coverage; AS-BUILT note added to master plan.

#### Hard "do NOT" list (locked by Eric, 2026-05-15)

- Do NOT rebuild the toggle in a new component
- Do NOT relocate it to "Gentle extras"
- Do NOT refactor `EveningReflection`'s direct localStorage read into the hook (Gate-G-NO-SCOPE-CREEP — that's a future cleanup spec)
- Do NOT mock the central `useSoundEffects` hook in tests covering "all paths respect the toggle" (would miss two of three paths — false-green)
- Do NOT investigate or fix `PrayCeremony`'s test-file failure (separate test-debt item, not 6.11's scope)
- Do NOT add new sound effects, volume control, per-effect toggles, or `prefers-reduced-motion` integration (Brief §10)
- No git operations

#### Acceptance Criteria — revised reconciliation against the brief's §9

| Brief AC | Status under Path A |
|---|---|
| A. Single "Sound effects" toggle renders in settings | ✅ Already satisfied (`NotificationsSection.tsx:150-157`) — verified at audit |
| B. Toggle defaults to ON for new users | ✅ Already satisfied (`!== 'false'` semantics across all three readers) — verified at audit |
| C. Existing users' sound-effect behavior is unchanged | ✅ Already satisfied (no migration logic touched) — verified at audit |
| D. ALL hero-feature sound-effect call sites respect the toggle | ⚠️ **Load-bearing new test** — must cover all 3 gate layers per R2, not just central hook |
| E. Toggle state takes effect immediately (no page reload) | ✅ Already satisfied (each `playSoundEffect` reads localStorage at call time, not at mount) — verified at audit |
| F. PrayCeremony runaway-timer bug remains visible / un-masked | ❌ **DROPPED** — gate is moot per Eric decision (no production component) |
| G. At least 4 tests passing | Applies — coverage test plus existing test count meets the floor |
| H. Toggle is keyboard-reachable and a11y-clean | ✅ Already satisfied (existing `<ToggleSwitch>` component at `NotificationsSection.tsx:150-157` is the canonical accessible toggle) — verified at audit |
| I. Frontend lint + typecheck + tests pass | Applies |
| J. No backend, DB, or API changes | Applies (trivial — none introduced) |
| K. No new sound effects added; no existing effects removed | Applies (trivial — nothing touched in the sound system itself) |
| **NEW: Master plan stub amended with AS-BUILT note** | Applies — reconciliation work item per Revised Scope #4 |
| **NEW: Tracker line added marking 6.11 audit-complete** | Applies — reconciliation work item per Revised Scope #5 |

**Estimated plan size:** 2-3 steps (audit verification + coverage test write + as-built doc updates), reflecting that the bulk of the work is already shipped.

---

{Brief content preserved verbatim below — note: §4 Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG, §5 W4, §7 T6, and §9 AC-F are SUPERSEDED by the Eric decision above and should be ignored. All other brief content (gates, watch-fors, tests, ACs, copy, files, out-of-scope) remains in force as written.}

---

# Brief: Spec 6.11 — Sound Effects Settings Polish

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` (Spec 6.11 stub, live version, lines 6171-6184) — ID `round3-phase06-spec11-sound-effects-polish`

**Spec ID:** `round3-phase06-spec11-sound-effects-polish`

**Phase:** 6 (Engagement Features)

**Size:** S (per stub) — a single settings toggle wired into an existing sound-effects system.

**Risk:** Low (per stub).

**Tier:** **Low/Standard** — settings UI surface that respects an existing system. No backend, no DB, no API. Brief is sized to match.

**Prerequisites:**
- 6.10 (per stub). **Note:** 6.10 was deferred 2026-05-15 to after Phase 8's `unified-profile` spec (R1+R3 gating questions returned NO). However, 6.10's surface (PrayerCard author-link routing) shares ZERO code with 6.11's surface (sound-effects toggle). The 6.10 prereq is sequencing, NOT technical. 6.11 proceeds. Plan-recon R4 confirms.
- Implicit prereq: an existing sound-effects system in the codebase. Plan-recon R1 is GATING on this — the stub says "existing" but does not point at it. If it doesn't exist, 6.11 STOPS.

**Pipeline:** This brief → `/spec-forums spec-6-11-brief.md` → `/plan-forums` → execute → `/code-review`. Verify-with-playwright optional — the settings toggle is unit-testable; if any hero-feature surface has visual changes when the toggle is off, a small playwright pass on one of them is reasonable. Plan decides.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git ops manually. CC never commits/pushes/branches at any phase. Standard discipline.

---

## 2. What 6.11 Builds (Verbatim from the Stub)

**Goal:** The existing sound effects system (chimes, soft tones) gets exposed in settings as a single toggle.

**Acceptance criteria (verbatim from the stub):**
- Single "Sound effects" toggle in settings
- All hero features respect the toggle
- Default: on for new users
- At least 4 tests

That is the entire stub. The brief below adds plan-time recon (with one gating question), a small set of watch-fors including a real adjacency to the PrayCeremony runaway-timer finding, light test expansion, files, and ACs.

---

## 3. Recon Ground Truth (Plan-Time)

**R1 — GATING QUESTION: does the "existing sound effects system" actually exist?**
The stub calls it "existing." Plan reads the codebase to locate it. Most likely homes: a Web Audio API setup (the project memory notes 6.x work touched Web Audio oscillators for ambient sounds), a hooks directory (`useSoundEffect.ts` or similar), or a shared utility. Plan confirms:
- Where the sound-effects system lives (files + entry points).
- What it exposes today (single play function? per-effect functions? a registry?).
- Whether it has any existing on/off control (e.g., a hardcoded constant, a per-call check, nothing) — the toggle wires to whatever the current state-check is, or replaces a hardcoded check.
- If the system does NOT exist as a recognizable, reusable surface, 6.11 implicitly requires building it — plan STOPS and surfaces. The stub uses "existing" as a load-bearing word; if it's wrong, the spec ballooned.

**R2 — the "hero features" that fire sound effects.**
The stub says "all hero features respect the toggle." Plan enumerates the hero features that currently play sounds:
- Likely candidates from earlier wave work: Pray ceremony (the candle-lighting / prayer-toggle ritual), prayer-receipt confirmation, possibly Answered-Wall reactions, possibly the Daily Hub completion moments, possibly Verse-Finds-You's appearance/save moments.
- Plan lists every call site of the sound-effects system, so the wiring is comprehensive. Missing one = "all hero features respect the toggle" is partially false.
- If plan finds sound-effect calls scattered across many files without a central system, that's a recon finding that affects design — the toggle may need to wrap calls at the call site rather than at the system level.

**R3 — the settings page structure.**
6.8 added a "Gentle extras" section to settings (the Verse-Finds-You toggle). 6.11's "Sound effects" toggle plausibly belongs in the same section, OR in a dedicated audio/sensory section. Plan reads the current settings page structure, finds the right home for the new toggle, and matches the existing toggle pattern (same component, same wiring, same Settings type extension).

**R4 — the 6.10-prereq question.**
Confirm the 6.10 prereq is sequencing-only and 6.11 has no technical dependency on PrayerCard author-link routing or `/u/:username`. Almost certainly trivially yes-sequencing, but worth explicit. If by some surprise 6.11 DOES touch surfaces 6.10 was going to ship (unlikely), plan surfaces.

**R5 — default-on-for-new-users mechanism.**
The stub specifies default ON (contrast: 6.8's Verse-Finds-You defaulted OFF). Plan reads how the existing settings defaults mechanism handles new and EXISTING users — the same question 6.8 had to answer in reverse. For sound effects, the conservative reading is: existing users keep whatever sounds-played-today behavior they had (which was uncontrolled-on, so they remain on); new users default on. If the default mechanism is uniform, this is trivially correct.

**R6 — the PrayCeremony runaway-timer adjacency (related to the deferred bug).**
The sanity sweep on 2026-05-15 surfaced a `PrayCeremony.test.tsx` failure with a recursive-`setTimeout` signature attributed to the prayer-wall-redesign side quest (commit 654e70b). The PrayCeremony component very likely interacts with the sound-effects system. Plan must:
- Read PrayCeremony's sound-effect call path and confirm 6.11's toggle wiring does not interact with the runaway-timer bug in a way that masks it, fixes it accidentally, or makes it harder to investigate later.
- If 6.11's wiring touches PrayCeremony directly, document the interaction and surface to Eric. The bug is parked in the tracker as POTENTIAL PROD BUG — 6.11 must not paper over it.

---

## 4. Gates (Standard — Nothing Exotic)

6.11 is a low-risk settings-toggle spec. Standard discipline.

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A** | No DB changes. |
| Gate-2 (OpenAPI updates) | **N/A** | No API changes. |
| Gate-3 (Copy Deck) | **Applies (lightly).** | Toggle label + optional short description. See Section 6. |
| Gate-4 (Tests mandatory) | **Applies.** | Stub mandates at least 4 tests. See Section 7. |
| Gate-5 (Accessibility) | **Applies.** | Toggle is keyboard-reachable, has accessible name, focus-visible. Same a11y posture as 6.8's toggle. |
| Gate-6 (Performance) | **N/A** | Settings read is trivial. |
| Gate-7 (Rate limiting) | **N/A** | No backend. |
| Gate-8 (Respect existing patterns) | **Applies (heavy).** | Match the 6.8 "Gentle extras" toggle pattern (component, wiring, type extension) unless plan-recon R3 finds a more appropriate section. Do NOT invent a new settings primitive. |
| Gate-9 (Plain text only) | **N/A** | No content surface. |
| Gate-10 (Crisis detection supersession) | **N/A** | No content surface. |
| Gate-G-NO-SCOPE-CREEP | **Applies (HARD).** | 6.11 is one toggle wired into existing sound-effect call sites. Nothing else. NO refactor of the sound-effects system, NO new sound effects, NO per-feature granular toggles, NO volume control. |
| Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG | **Applies (HARD).** | The PrayCeremony runaway-timer bug (commit 654e70b, parked in tracker) must not be silently masked or worked around by 6.11's wiring. If the toggle path touches PrayCeremony, plan surfaces. See R6. |

---

## 5. Watch-Fors

Real failure modes worth covering.

**W1.** **"All" means ALL.** "All hero features respect the toggle" — the test should enumerate every call site plan-recon R2 found and assert each respects the toggle. Missing one is a silent failure (the user toggles off and still gets one sound).

**W2.** **The toggle gates at the right layer.** If the sound-effects system is a central utility with one entry point, the toggle wraps the entry point — one place to enforce. If sound calls are scattered, plan picks the safest layer (per-call wrap with a helper, OR a central guard at the play function). Either works; the watch-for is internal consistency and no missed call site.

**W3.** **Default ON for new users; existing users undisturbed.** New accounts: setting initializes to `true`. Existing accounts: their experience does not change (they were getting sounds before; they continue to). The mechanism is the same one 6.8 used in reverse — confirm it works correctly in this direction.

**W4.** **PrayCeremony runaway-timer bug stays visible.** Per R6 + Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG: if 6.11's wiring touches PrayCeremony's sound-effect call path, the wiring must not introduce a code path that bypasses or masks the recursive-timer signature. The bug is parked in the tracker as POTENTIAL PROD BUG — a future spec investigates it; 6.11 must not make that investigation harder.

**W5.** **Reduced-motion / a11y settings.** The OS-level prefers-reduced-motion setting is a separate concern from this toggle. They MAY interact (a user with reduced-motion preference might reasonably also want sound off by default, or vice versa) — but 6.11 is one toggle, not a sensory-preferences system. Document the relationship if recon surfaces it; do not absorb prefers-reduced-motion logic into this spec.

**W6.** **Logged-out users.** Settings are per-user. Logged-out visitors hitting hero features (e.g., the Verse-Finds-You card displays for them if Phase 10 is live? — unlikely given today's state) — plan confirms whether logged-out users encounter any sound-firing surface, and if so, picks a sensible default (probably: logged-out = treat as sound-on, since the toggle is per-user and they can't toggle).

**W7.** **No volume control, no per-effect toggle.** The stub specifies a SINGLE toggle. Resist any "helpful" expansion into volume sliders, separate chime-vs-tone toggles, or per-feature toggles. Future feature spec, not 6.11.

**W8.** **Settings type extension is clean.** Whatever shape the existing settings type takes (likely `wr_settings.audio.soundEffects` or `wr_settings.soundEffects.enabled` — plan-recon R3 confirms), the type extension is additive and matches the existing nested pattern documented in `.claude/rules/11-local-storage-keys.md`. If the storage key needs documentation, add it there.

---

## 6. Copy Deck (D-Copy)

Settings toggle text. Eric-approved before execute.

*Toggle label:* **"Sound effects"**

*Optional short description (one line, if the settings UI pattern uses descriptions):* **"Subtle chimes and tones on moments like prayers and reactions. On by default."**

*Settings section heading:* plan-recon R3 confirms whether this is in the existing "Gentle extras" section (6.8's home) or a separate audio section. Match the existing pattern.

No other user-facing copy. The toggle is silent in effect — turning it off does not surface a confirmation; turning it on does not surface a confirmation.

---

## 7. Test Specifications

The stub mandates **at least 4 tests.** Target ~6 to cover the watch-fors. Frontend: Vitest + RTL.

**T1.** Toggle defaults to `true` for new users (settings initialization test).
**T2.** Toggle off → no sound plays on any hero-feature call site enumerated by plan-recon R2. (One test per call site, OR one test with a mocked sound-system spy asserting zero calls across all enumerated paths — plan picks the cleaner shape.)
**T3.** Toggle on → sound plays normally at each enumerated call site.
**T4.** Toggle is keyboard-reachable and has accessible name "Sound effects" (a11y).
**T5.** Toggling does not require page reload — the change takes effect immediately on the next sound-firing surface (live state, not stale read).
**T6.** (Regression / adjacency) PrayCeremony's sound-effect call path still triggers the existing runaway-timer signature when the toggle is on — i.e., 6.11 has not silently fixed or masked the bug. (If R6 finds 6.11's wiring doesn't touch PrayCeremony, this test is moot; otherwise it's load-bearing.)

---

## 8. Files

### Create

- A new toggle component file IF the 6.8 "Gentle extras" pattern uses per-toggle component files. Plan-recon R3 confirms. More likely: just an addition inside the existing settings page.
- The corresponding test file(s) per Section 7.

### Modify

- The settings page — add the "Sound effects" toggle (location per R3).
- The settings type / default mechanism — add the new setting, default `true` for new users, leave existing users undisturbed (per W3).
- The sound-effects system entry point(s) — wire the toggle check at the right layer per R1+R2. (Plan-recon decides the layer.)
- `.claude/rules/11-local-storage-keys.md` IF a new storage key is introduced. If the setting nests inside an existing namespace (likely), no new entry needed.

### Do NOT modify

- The sound effects themselves (no new chimes, no removed chimes, no volume changes).
- The PrayCeremony component's logic beyond the minimum wiring needed for the toggle to gate its sound calls — the runaway-timer bug stays visible (Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG).
- Any non-sound hero-feature behavior — the toggle gates AUDIO, not the features themselves. A prayer ceremony still happens when the toggle is off; just silently.
- The 6.8 Verse-Finds-You toggle or any other unrelated settings toggle.

### Delete

- Nothing.

---

## 9. Acceptance Criteria (from the stub + clarifications)

6.11 is done when:

- [ ] A. A single "Sound effects" toggle renders in settings (location per plan-recon R3).
- [ ] B. The toggle defaults to ON for new users.
- [ ] C. Existing users' sound-effect behavior is unchanged by the rollout (they continue to get sounds, with the option to turn off).
- [ ] D. ALL hero-feature sound-effect call sites enumerated by plan-recon R2 respect the toggle (toggle off → no sound from any of them).
- [ ] E. Toggle state takes effect immediately (no page reload).
- [ ] F. PrayCeremony runaway-timer bug remains visible / un-masked (Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG).
- [ ] G. At least 4 tests passing (Section 7 targets ~6).
- [ ] H. Toggle is keyboard-reachable and a11y-clean.
- [ ] I. Frontend lint + typecheck + tests pass.
- [ ] J. No backend, DB, or API changes (verify by diff).
- [ ] K. No new sound effects added; no existing effects removed.

---

## 10. Out of Scope

- Volume control / volume slider.
- Per-effect granular toggles (separate toggles for chimes vs. tones vs. ambient).
- Per-feature granular toggles ("sound for prayers but not reactions").
- Investigating or fixing the PrayCeremony runaway-timer bug — that is its own future investigation spec.
- Refactoring the sound-effects system itself. The stub says "existing" — 6.11 wires to it, does not redesign it.
- OS-level prefers-reduced-motion / accessibility-preference integration.
- New sound effects of any kind.
- Sound-effect previews in the settings UI ("play sample").
- Time-of-day / quiet-hours scheduling.

---

## 11. Recommended Planner Instruction

> Plan Spec 6.11 from `spec-6-11-brief.md`. This is a Low-risk, Size S frontend-only spec — the second-smallest in the wave.
>
> Plan-recon R1 is GATING: confirm the "existing sound effects system" actually exists in the codebase. If it does NOT, STOP and surface to Eric — the stub assumes existence and building one is out of scope.
>
> Confirm R2 (enumerate every hero-feature sound call site — the test list depends on this), R3 (settings section + toggle pattern), R4 (the 6.10 prereq is sequencing-only — almost certainly trivially yes), R5 (default-ON mechanism for new users without disturbing existing users), R6 (PrayCeremony adjacency to the runaway-timer bug — do not mask it).
>
> Honor HARD gates: Gate-G-NO-SCOPE-CREEP (one toggle, not a sensory-preferences system) and Gate-G-DO-NOT-MASK-PRAYCEREMONY-BUG (the parked bug stays investigatable).
>
> Standard discipline: no git operations.

---

## 12. Prerequisites Confirmed

- [x] The live 6.11 master plan stub read in full (lines 6171-6184) — authored against the LIVE stub, not the pristine-baseline backup.
- [~] 6.10 — listed as prereq, but DEFERRED to after Phase 8. The dependency is sequencing-only; 6.11 proceeds. Plan-recon R4 confirms.
- [ ] **R1 (gating):** the existing sound effects system exists — confirmed at plan-recon, not now.
- [ ] **R2:** hero-feature sound call sites enumerated — plan-recon.

---

## End of Brief
