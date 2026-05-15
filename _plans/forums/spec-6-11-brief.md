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
