# Forums Wave: Spec 6.3 — Night Mode

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 6.3 (lines 5169–5200, ~32 lines of original stub — minimal; the brief carries the load).
**Source Brief:** `_plans/forums/spec-6-3-brief.md` (authored 2026-05-13, 766 lines — **brief is binding for design intent; brief wins over master plan stub where they diverge** per MPD-1 through MPD-10. This spec's Recon Reality Overrides win over the brief where the brief's recon is wrong on disk. Rules-file standards in `.claude/rules/01-ai-safety.md`, `02-security.md`, `06-testing.md`, `07-logging-monitoring.md`, `09-design-system.md`, `11-local-storage-keys.md` win over both brief and spec on cross-cutting conventions.)
**ID:** `round3-phase06-spec03-night-mode`
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations at any phase: no `git checkout`, no `git commit`, no `git push`, no `git stash`, no `git reset`, no `gh pr create`. Only read-only inspection — `git status`, `git diff`, `git log`, `git show` — is permitted. See brief § 1 / W1.)
**Date:** 2026-05-13.

---

## Affected Frontend Routes

6.3 is **frontend-only** (NO backend changes per brief § 3 Backend section, § 10 NOT to modify, § 12 Out of scope). The user-facing surface is the Prayer Wall family of routes; Night Mode is **strictly Prayer-Wall-scoped** per Gate-G-SCOPE-PRAYER-WALL-ONLY / MPD-2 / D-Scope. `/verify-with-playwright` is **REQUIRED** after `/code-review` (brief § 3 Frontend (Playwright), § 9 Playwright E2E).

- `/prayer-wall` — main feed; the root container receives `data-night-mode="on" | "off"`; hero subtitle + compose-FAB tooltip + compose placeholder + empty-state copy + (optional) greeting card + page title swap to night variants when active; `<NightWatchChip />` mounts in page header when `active === true`.
- `/prayer-wall/:id` — single-post detail; same root-container attribute treatment; same chip-in-header treatment (plan-recon R6 confirms whether the detail page shares a layout wrapper with `/prayer-wall` — if so, one wrap covers both; if not, each page applies the attribute itself).
- `/prayer-wall/dashboard` — author's dashboard; same Prayer-Wall-family treatment (plan-recon R6).
- `/prayer-wall/user/:id` — public profile feed; same treatment (plan-recon R6).
- `/settings` — Settings page gains a 3-radio Night Mode preference UI (`'auto'` / `'on'` / `'off'`, default `'auto'`) in a plan-determined section (plan-recon R10). The Settings page itself does **NOT** receive `data-night-mode` — it stays in normal day theme regardless of time (Gate-G-SCOPE-PRAYER-WALL-ONLY).

Plus an internal/transient surface that does not have a route:

- `<NightWatchChip />` popover (mounts on top of the chip when tapped; explainer text + Settings link; not a separate route).

Out-of-scope routes that MUST stay in normal day theme regardless of browser hour (Gate-G-SCOPE-PRAYER-WALL-ONLY hard-block):

- `/` (Dashboard / Landing), `/daily`, `/grow`, `/music`, `/bible`, `/bible/*`, `/ask`, `/local-support/*`, `/insights`, `/insights/monthly`, `/friends`, `/profile/:userId`, `/my-prayers`, `/accessibility`, `/community-guidelines`, every other public + protected route enumerated in `.claude/rules/12-project-reference.md`. Cross-route Playwright test (Test § 9 Reconciliation / Cross-route) asserts navigating `/prayer-wall → /daily` removes the attribute.

---

## STAY ON BRANCH

Same as the rest of the wave. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`, `git rebase`, `git merge`, `gh pr create`, or any other git-state-mutating command. Eric handles git manually. Read-only git inspection (`git status`, `git diff`, `git log`, `git show`) is permitted at every phase. See brief § 1 (W1).

Violation of W1 is grounds to halt execute and flag.

---

## Recon Reality Overrides (2026-05-13)

**This section is the gate where brief recon meets disk reality at spec authorship.** Pattern follows Spec 3.7 § Recon R1/R2/R3, Spec 5.5 § Recon Reality Overrides, Spec 5.6 § R-OVR, Spec 6.1 § R-OVR-S1, and Spec 6.2 § R-OVR-1 through R-OVR-3. The codebase wins on facts; the brief's design intent (D-TimeSource through D-NoNotifications; MPD-1 through MPD-10; W1 through W34; the 5 new gates Gate-G-NO-FOUC / Gate-G-COPY-PAIRS / Gate-G-A11Y / Gate-G-SCOPE-PRAYER-WALL-ONLY / Gate-G-LIVE-TRANSITION) is preserved verbatim except where an R-OVR explicitly supersedes a VERIFIED claim.

### R-OVR-S1 — All brief-recon claims R1–R5 ratify clean on disk (no overrides needed)

The brief's R1–R5 are spec-authorship-time recon items (verified by the brief author at brief authorship). At spec authorship (2026-05-13), each was re-verified:

- **R1 (PrayerWall.tsx exists with hero + composer + feed structure):** ✅ present at `frontend/src/pages/PrayerWall.tsx`.
- **R2 (`[data-reader-theme='midnight']` attribute-selector + CSS-variable pattern in `index.css`):** ✅ present at `frontend/src/index.css` line 35 (block runs 35→58; brief said 34→52 — minor line-number drift, mechanism identical). Two additional reader themes also follow the same pattern at line 60 (`parchment`) and line 85 (`sepia`). 6.3 follows this established attribute-selector + CSS-variable pattern verbatim per D-Mechanism.
- **R3 (`UserSettingsPrayerWall` namespace with `prayerReceiptsVisible: boolean`):** ✅ present at `frontend/src/types/settings.ts` line 39 inside the `UserSettingsPrayerWall` interface. Adjacent enums (`NudgePermission`, `StreakVisibility`) confirm the namespace pattern. 6.3 adds `nightMode: NightModePreference` (with new exported type `NightModePreference = 'auto' | 'on' | 'off'`) to this same interface.
- **R4 (settings-storage.ts + useSettings.ts + Settings.tsx exist):** ✅ present at `frontend/src/services/settings-storage.ts`, `frontend/src/hooks/useSettings.ts`, `frontend/src/pages/Settings.tsx`. Plan-recon R4 + R10 read these end-to-end.
- **R5 (no existing `useNightMode`, `useTheme`, or `<NightWatchChip />` infrastructure):** ✅ confirmed. `find frontend/src/hooks -name 'useNightMode*' -o -name 'useTheme*'` returns nothing. `ls frontend/src/components/prayer-wall/` shows no `NightWatchChip.tsx`. 6.3 is genuinely additive infrastructure.

**Override disposition:** None. The brief's recon is correct on every R1–R5 item. The brief's plan-recon items (R6–R12) remain as plan-time tasks — `/plan-forums spec-6-3.md` does that work, NOT spec authorship. **Brief design intent preserved verbatim.**

### R-OVR-S2 — Prerequisite 6.2 (Quick Lift) is ⏳ in progress, not ✅; execution sequencing matters

**Brief § Prerequisites (line 14):** *"6.2 (Quick Lift) — must merge first (per master plan stub)"*
**Brief § 16 Prerequisites Confirmed (line 754):** *"6.2 (Quick Lift): must merge first (per master plan stub)"*
**Brief § Execution sequencing (line 23):** *"Safest order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 OR 6.1 → 6.2 → 6.2b → 6.3 → 1.5g. 6.3 should NOT execute concurrently with 6.2b (both touch frontend prayer/daily surfaces with copy variants)."*

**Disk reality at spec authorship (2026-05-13):** 6.1 has shipped (`spec-6-1.md` exists with full Recon Reality Overrides; tracker confirms ✅ in CLAUDE.md commit history references). 6.2 is **in progress** (`spec-6-2.md` exists at `_specs/forums/spec-6-2.md` dated 2026-05-12). 6.2b is in progress (`spec-6-2b.md` exists in `_specs/forums/`). 6.3's brief was authored knowing 6.2 was unshipped; the brief correctly defers execute sequencing to Eric.

**Override disposition:** No override; the brief's prerequisite + sequencing guidance is preserved. Plan authorship can proceed at any time. **EXECUTE BLOCKED until 6.2 fully merges to `forums-wave-continued`.** Plan recon at `/plan-forums spec-6-3.md` re-checks `_forums_master_plan/spec-tracker.md` to confirm 6.2 status before producing the final plan. If 6.2 is still ⏳ at plan time, plan still proceeds (specs serialize separately from execution), but plan's "Ready to execute?" gate must explicitly mark "BLOCKED — wait for 6.2 merge."

**Concurrency rule (HARD):** 6.3 MUST NOT execute concurrently with 6.2b (both touch frontend Prayer-Wall surfaces and copy variants; cognitive load + merge conflict risk). 6.3 MUST NOT execute concurrently with 6.2 (frontend conflicts). Safe orderings are:

1. 6.1 (✅) → 1.5g → 6.2 → 6.2b → 6.3
2. 6.1 (✅) → 6.2 → 6.2b → 6.3 → 1.5g
3. 6.1 (✅) → 6.2 → 6.3 → 6.2b → 1.5g (if 6.3 finishes execute review before 6.2b starts execute)

Plan must re-confirm at execute time that none of {6.2, 6.2b} are in execute phase.

### R-OVR-S3 — Brief's `index.css` line-number reference is off-by-one; mechanism is correct

**Brief § 5 R2:** *"Line 34-52: `[data-reader-theme='midnight']` block defines CSS custom properties..."*

**Disk reality at spec authorship (2026-05-13):** The `[data-reader-theme='midnight']` block begins at line 35 (not 34) and continues through line 58 (not 52). The block defines 8 custom properties (`--reader-bg`, `--reader-text`, `--reader-verse-num`, `--reader-divider`, plus highlight color variants). Two additional reader themes follow at line 60 (`parchment`) and line 85 (`sepia`).

**Override disposition:** Cosmetic — the line numbers are off-by-one in the brief but the mechanism and pattern are correct. 6.3 follows the attribute-selector + CSS-variable pattern verbatim per D-Mechanism. Plan recon R8 (palette values) reads the actual block to enumerate which CSS variables the Prayer Wall day-state uses today, and derives night equivalents. **No design change.**

---

## Metadata

- **ID:** `round3-phase06-spec03-night-mode`
- **Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop — 6.3 is the third spec of Phase 6 and the most brand-defining visual surface in the phase; sets the night-state aesthetic for Prayer Wall and is a direct prerequisite for 6.4's crisis-adjacent 3am Watch)
- **Size:** L (per master plan; brief ratifies — three new hooks/components/constants + one new pure-functions library + modifications to PrayerWall + Settings + index.css + index.html + settings types/storage + ~18 tests; frontend-only but spans multiple surfaces)
- **Risk:** Medium (per master plan; brief ratifies — visual surface change, no-FOUC implementation, timezone footgun, direct prerequisite for 6.4 crisis-adjacent surface; brief Section 13 (Tier Rationale) and § 14 implicit explain why this is Medium not High)
- **Tier:** **xHigh** (per brief § 2 — brand-defining visual surface + no-FOUC implementation is tricky engineering + timezone footgun + multiple curated copy variants + direct prerequisite for 6.4's HIGH-RISK crisis-adjacent surface. xHigh is the right tier; High would understate the design-judgment surface and palette-curation load; MAX is reserved for HUMAN-IN-THE-LOOP curation + privacy-architectural surfaces (6.1's wire-format design) + anti-abuse surfaces (6.2's server-authoritative timing) — none of which apply here. Practical execution implication: CC uses Opus 4.7 thinking `xhigh` for ALL phases (spec, plan, execute, review). Eric reviews all night-state CSS variable values, the `index.html` no-FOUC script, all day/night copy pairs, the `useNightMode()` hook public API for forward-compatibility with 6.4, the Settings UX, and manual visual verification at 9pm→6am transitions on real device.)
- **Prerequisites:**
  - **6.2 (Quick Lift) ⏳ in progress** — must merge first per brief § Prerequisites and § Execution sequencing. **EXECUTE BLOCKED until 6.2 ships.** Plan authorship can proceed in parallel. See R-OVR-S2.
  - **6.1 (Prayer Receipt) ✅** — shipped. Provides `UserSettings.prayerWall` namespace at `frontend/src/types/settings.ts` line 39, into which `nightMode` is added. Brief R3 verified; spec-authorship R-OVR-S1 ratified.
  - **Existing PrayerWall.tsx structure** ✅ — verified at `frontend/src/pages/PrayerWall.tsx` (R1). Plan-recon R6 picks the exact DOM target for `data-night-mode` attribute (outermost wrapper recommended).
  - **Existing `[data-reader-theme='midnight']` attribute-selector + CSS-variable pattern in `index.css`** ✅ — verified at `frontend/src/index.css` line 35 (R2). 6.3 follows this pattern verbatim per D-Mechanism.
  - **Existing settings infrastructure** ✅ — verified: `services/settings-storage.ts`, `hooks/useSettings.ts`, `pages/Settings.tsx`, `types/settings.ts` (R4).
  - **NO existing `useNightMode`, `useTheme`, or `<NightWatchChip />`** ✅ confirmed (R5). 6.3 is genuinely additive.
  - **NO Eric-curated content pre-execute (unlike 6.1's 60-WEB-verse Gate-29)** — but two Eric-approval gates exist:
    - **Gate-G-COPY-PAIRS (HARD):** Eric reviews + approves the 8 day/night copy pairs in § 7 D-CopyPairs of the brief BEFORE execute. Edits welcome; plan may light-edit (within 2 words per variant) for fit but cannot replace wholesale.
    - **D-NightPalette (HARD):** Plan-recon R8 surfaces proposed hex values for the night palette. Eric reviews + approves before execute. xHigh-tier judgment surface ("Does this read as reverent, not gloomy?").

---

## Goal

Between 9pm and 6am **browser-local time** (D-TimeSource), the Prayer Wall (and only the Prayer Wall — Gate-G-SCOPE-PRAYER-WALL-ONLY) enters Night Mode automatically: a dimmed, warm-muted palette via CSS-variable overrides under `[data-night-mode='on']`, swap of 6–8 hero/CTA/empty-state/title copy strings to night variants, and a quiet "Night Watch" chip in the page header. User can override the auto behavior in Settings via a 3-state preference (`'auto'` / `'on'` / `'off'`, default `'auto'`). No flash of un-night-modded content on page load (Gate-G-NO-FOUC via inline script in `index.html`).

6.3 is **frontend-only** with **no backend changes**. The setting persists via existing dual-write settings infrastructure (`wr_settings.prayerWall.nightMode`).

6.3 is **purely aesthetic + ambient** (MPD-10). It does NOT change feed sorting (that's 6.4's job). It does NOT inject crisis resources (that's 6.4's job). It does NOT add any mental-health-specific copy or imagery (that's 6.4's job). This separation is load-bearing: 6.3 ships visual theming; 6.4 ships content prioritization. Conflating them in 6.3 would lock in 6.4's design before its higher-risk review is done.

---

## Approach

A new `useNightMode()` hook returns `{ active: boolean, source: 'auto' | 'manual', userPreference: 'auto' | 'on' | 'off' }` (D-Hook-API). The hook reads:

1. `UserSettings.prayerWall.nightMode` (3-state preference) via `useSettings()`.
2. Browser local hour via `new Date().getHours()` (D-TimeSource).
3. Polls every 60 seconds via `setInterval` (D-LivePolling) so users actively on Prayer Wall at the 21:00 or 06:00 boundary see the mode flip without page reload (Gate-G-LIVE-TRANSITION).

A pure-functions library `frontend/src/lib/night-mode-resolver.ts` exports `isNightHour(hour: number): boolean` (returns `true` for hours `[21..23] ∪ [0..5]`, exclusive of `6`) and `resolveNightModeActive(preference, hour): boolean` (returns `true` for `'on'`, `false` for `'off'`, calls `isNightHour(hour)` for `'auto'`). These pure functions are imported by both `useNightMode.ts` AND the inline `index.html` no-FOUC script (the latter inlines them at build time via Vite — plan-recon R7 picks the exact bundling mechanism).

Prayer Wall page wrapper (plan-recon R6 picks the exact DOM target — outermost wrapper recommended) gets `data-night-mode={active ? 'on' : 'off'}` applied. `frontend/src/index.css` gains a new `[data-night-mode='on'] { --bg: ...; --text: ...; --accent: ...; ... }` block (palette values plan-authored at R8 with Eric's pre-execute approval). The CSS layer handles 100% of the visual swap; React just toggles the attribute. No re-renders cascade.

`frontend/src/constants/night-mode-copy.ts` exports the 8 day/night copy pairs (D-CopyPairs). Surface components (PrayerWallHero, composer, empty state, etc.) consume the appropriate variant based on `active` from `useNightMode()`.

`<NightWatchChip />` is a new self-contained component mounted in the PrayerWall page header when `active === true` (D-NightWatchChip). Icon: Lucide `Moon`. Text: "Night Mode" (always); subtitle "(always on)" if `source === 'manual'`. Tapping opens a small popover (NOT a route navigation) with explainer text + link to `/settings#night-mode`. Breathing-glow animation on the icon (3s cycle, low intensity); disabled by `prefers-reduced-motion`. Forward-compatible: 6.4 may reuse or extend this component.

Settings page (plan-recon R10) gains a 3-radio Night Mode preference UI in a plan-determined section ("Auto (9pm – 6am)" — default / "Always on" / "Always off").

No-FOUC mechanism (D-NoFOUC, Gate-G-NO-FOUC): an inline `<script>` near the top of `<body>` in `frontend/index.html` runs synchronously before React's hydration script. The script reads `localStorage.wr_night_mode_hint` (cached last-resolved state from previous render) and `new Date().getHours()`. It resolves to a state via `resolveNightModeActive(...)` (inlined at build time) and applies the attribute to a plan-determined DOM target (plan-recon R7 picks `<html data-prayer-wall-night-mode="pending">` flag-on-html vs targeted root-container approach). React mounts; `useNightMode()` re-evaluates with fresh settings data; reconciles the attribute; updates the hint for next load.

Scope discipline (Gate-G-SCOPE-PRAYER-WALL-ONLY, MPD-2, D-Scope): the `data-night-mode` attribute lives only on Prayer Wall surfaces. CSS selectors in `index.css` MUST be scoped to Prayer Wall containers — NO `:root[data-night-mode]`, NO `html[data-night-mode]`, NO global selectors. Cross-route Playwright test asserts navigating from `/prayer-wall` to `/daily` removes the attribute (or unmounts the scoped container).

---

## Master Plan Divergences (MPDs)

All 10 MPDs from brief § 4 are PRESERVED VERBATIM. Plan and execute MUST honor the brief, not the master plan stub.

- **MPD-1 (Time source = browser-local).** Use `new Date().getHours()` (sync, no API call, offline-safe, reflects user's current physical environment). Server-side `users.timezone` column (added Spec 1.3b) is **NOT** used for Night Mode evaluation. Brief § 4 MPD-1 / D-TimeSource. Known limitation: VPN-masked timezone or wrong system clock may yield incorrect mode — accepted.
- **MPD-2 (Scope = Prayer-Wall-only).** `data-night-mode` attribute on Prayer Wall root container, NOT `<html>`. Daily Hub, Music, Settings, Landing, every other route stays in normal theme regardless of hour. Brief § 4 MPD-2 / D-Scope / Gate-G-SCOPE-PRAYER-WALL-ONLY.
- **MPD-3 (Mechanism = attribute-selector + CSS variables).** Pattern matches `[data-reader-theme='midnight']` in `index.css` line 35 (BB-4 Bible Reader precedent, R-OVR-S1). New attribute: `data-night-mode='on' | 'off'`. CSS variables overridden in `[data-night-mode='on']` block scoped to Prayer Wall. NOT React Context with inline styles; NOT Tailwind class-based dark mode. Brief § 4 MPD-3 / D-Mechanism.
- **MPD-4 (3-state preference, `'auto'` default).** `type NightModePreference = 'auto' | 'on' | 'off'`; `DEFAULT_NIGHT_MODE: NightModePreference = 'auto'`. UI: radio buttons (NOT toggle switch). Labels: "Auto (9pm – 6am)" / "Always on" / "Always off". Brief § 4 MPD-4 / D-StateValues.
- **MPD-5 (Time window = 21:00 to 05:59, inclusive start, exclusive end).** `isNightHour(hour) = hour >= 21 || hour < 6`. Fixed regardless of season or sunset. No per-user customization of window hours (the three options are auto/on/off — no "custom window"). Brief § 4 MPD-5 / D-TimeWindow.
- **MPD-6 (Live re-evaluation via 60s polling).** `useNightMode()` uses `setInterval(reEvaluate, 60_000)` while mounted; cleared on unmount. Worst-case 59s latency at boundary. Acceptable trade-off vs continuous evaluation. Brief § 4 MPD-6 / D-LivePolling.
- **MPD-7 (No-FOUC via inline `<script>` in `index.html` + localStorage hint).** Inline script runs synchronously before React; reads `wr_night_mode_hint` + `new Date().getHours()`; applies attribute. Plan-time recon (R7) decides DOM target (flag on `<html>` vs attribute on route-specific container) and route detection strategy. Total execution <5ms (W4, W29). Brief § 4 MPD-7 / D-NoFOUC / Gate-G-NO-FOUC.
- **MPD-8 (Copy variants authored inline in brief).** 8 day/night copy pairs in § 7 D-CopyPairs of the brief are AUTHORED. Eric reviews + approves before execute. Plan may light-edit (within 2 words per variant) for fit; cannot replace wholesale. Brief § 4 MPD-8 / D-CopyPairs / Gate-G-COPY-PAIRS.
- **MPD-9 (Night Watch chip = new component, NOT a CSS visibility class).** `<NightWatchChip />` is self-contained React component with internal popover state, breathing-glow animation, and accessibility wiring. Modular for 6.4 reuse/extension. Brief § 4 MPD-9 / D-NightWatchChip.
- **MPD-10 (NO crisis-adjacent copy in 6.3).** Night Mode is purely visual + ambient. Does NOT change feed sorting (6.4's job). Does NOT inject crisis resources (6.4's job). Does NOT add mental-health-specific copy or imagery (6.4's job). Separation is load-bearing. Brief § 4 MPD-10.

---

## Decisions Catalog (D-*)

All 14 decisions from brief § 7 are PRESERVED VERBATIM. Implementation must honor each.

- **D-TimeSource:** Browser-local time via `new Date().getHours()`. (MPD-1)
- **D-Scope:** Prayer-Wall-only — attribute applied to Prayer Wall root container, NOT `<html>`. (MPD-2)
- **D-Mechanism:** Attribute selector + CSS variable overrides. New attribute `data-night-mode='on' | 'off'`. CSS variables in `[data-night-mode='on']` block. (MPD-3)
- **D-StateValues:** `type NightModePreference = 'auto' | 'on' | 'off'`; default `'auto'`. Stored at `UserSettings.prayerWall.nightMode`. (MPD-4)
- **D-TimeWindow:** 21:00 to 05:59 inclusive start, exclusive end. `isNightHour(hour) = hour >= 21 || hour < 6`. Fixed window. (MPD-5)
- **D-LivePolling:** 60-second `setInterval` tick; cleared on unmount. (MPD-6)
- **D-NoFOUC:** Inline `<script>` in `index.html`; plan-recon R7 picks DOM target and route detection. (MPD-7)
- **D-CopyPairs:** 8 day/night copy pairs authored in brief § 7. Eric approves before execute. Pairs:
  1. Hero subtitle: "What weighs on you today?" | "It's quiet here. You're awake."
  2. Compose-FAB tooltip: "Share what's on your heart" | "Write something"
  3. Compose modal heading: "What's on your heart?" | "Write something quiet"
  4. Empty feed state: "The wall is quiet right now." | "It's quiet tonight. Be the first."
  5. Compose placeholder: "Share what's weighing on you..." | "Write what's on your mind tonight..."
  6. Greeting card (if shown): "Good to see you." | "Good evening."
  7. Reaction confirmation toast: "Praying for them." | (unchanged — prayer copy identical at all hours)
  8. Page title (browser tab): "Prayer Wall • Worship Room" | "Prayer Wall • Night • Worship Room"
  - Anti-pressure compliance: no sad-shaming, no "can't sleep again?", no "insomnia." Neutral acknowledgment that it's night.
  - Eric MUST review + approve before execute. Edits welcome. Plan may shorten by 1–2 words; cannot replace wholesale.
- **D-NightWatchChip:** Self-contained `<NightWatchChip />` component with popover. Icon: Lucide `Moon`. Text: "Night Mode" (always); subtitle "(always on)" if `source === 'manual'`. Tap → popover. Breathing-glow animation on icon (3s cycle, low intensity, opacity 0.7–1.0 — W12); disabled by reduced-motion. `role="button"`, `aria-label="Night Mode active"` (with optional `(always on)` suffix). Component exported for 6.4 reuse. Popover content (authored): heading "Night Mode" / body "The Prayer Wall is quieter at night. Same posts; gentler palette." / link "Change in Settings". (MPD-9)
- **D-NightPalette:** Directional guidance only; exact hex values are plan-recon R8 (Eric approves before execute).
  - Backgrounds shift WARM (candlelit room), NOT cool (twilight blue). Brief example: `#1a1614` not `#000000`.
  - Body text: soft cream (brief example: `#e8e3da`), not pure white. WCAG AA contrast (4.5:1 minimum) preserved.
  - Accent: warm tone (e.g., warm amber `#d4a373`), NOT cool blue.
  - Secondary text (timestamps, metadata): more muted, still legible.
  - Border/divider: lower contrast than day.
  - Plan-recon R8 enumerates which CSS variables Prayer Wall day-state uses today and proposes night equivalents. Eric reviews and approves before execute. xHigh-tier judgment surface — Eric's "does this read as reverent, not gloomy?" call.
- **D-Hook-API:** `useNightMode()` returns `{ active: boolean, source: 'auto' | 'manual', userPreference: 'auto' | 'on' | 'off' }`. Forward-compatible for 6.4's `useWatchMode()`. NOT exposed: current hour or polling internals.
- **D-LocalStorageHint:** `wr_night_mode_hint` key (value: `'on' | 'off'`). Written on every reconciliation pass by `useNightMode()`. Read by inline `index.html` script on next page load. 3-state preference (`'auto' | 'on' | 'off'`) stored elsewhere (`wr_settings.prayerWall.nightMode`); hint key is RESOLVED state for no-FOUC purposes.
- **D-ReducedMotion:** `prefers-reduced-motion: reduce` changes (visual-only):
  - Day/night palette transition: instant (no CSS animation on color values).
  - Night Watch chip breathing-glow: disabled (icon static).
  - Does NOT change: time-based evaluation, polling cadence, any user-facing behavior.
- **D-NoTracking:** No analytics on Night Mode usage. NO event for "user toggled night mode." NO event for "user saw night mode chip." NO event for "user opened popover." Aggregate anonymous logs already in place for capacity planning are fine; NO new analytics paths added for 6.3. Anti-pattern to measure ambient features.
- **D-NoNotifications:** No push or in-app notifications when mode toggles. The visual change IS the message. Manual toggle in Settings = visual change confirms action; no toast needed. No "Night Mode is now active" message at boundary.

---

## Watch-fors (W*)

All 34 watch-fors from brief § 8 are PRESERVED VERBATIM. Implementation must honor each.

**Security / correctness:**
- **W1 (CC-no-git):** Claude Code never runs git operations at any phase. Violation halts execute.
- **W2:** Inline `index.html` script must NOT execute arbitrary user content. Read localStorage as JSON (catch parse errors), read `Date.getHours()`, write attribute. No `eval`, no `innerHTML`, no dynamic imports.
- **W3:** Inline script must gracefully handle localStorage exceptions (private mode, quota exceeded, disabled). On exception, fall back to time-based evaluation only.
- **W4:** Inline script must NOT block React hydration. Total execution <5ms on first run.
- **W5:** Polling tick uses `setInterval` (not `setTimeout` chains). Properly cleared on unmount. Test verifies no memory leak.

**Scope discipline (Gate-G-SCOPE-PRAYER-WALL-ONLY):**
- **W6:** `data-night-mode` attribute applied to Prayer Wall containers ONLY. NEVER on `<html>`, `<body>`, or `:root`. (Plan-recon R7 may use a `data-prayer-wall-night-mode="pending"` flag on `<html>` strictly as a route-detection signal for the inline script — but `data-night-mode` itself remains on a Prayer-Wall-scoped container.)
- **W7:** CSS selectors using `[data-night-mode='on']` must be scoped to Prayer Wall classNames or container IDs. NO global selectors.
- **W8:** When user navigates from `/prayer-wall` to `/daily`, the night mode visual treatment must completely disappear (no leakage).
- **W9:** Landing page's existing "cinematic dark theme" is unrelated to Night Mode. Verify no CSS variable name collisions.

**Visual / brand:**
- **W10:** Night palette reads as REVERENT, not GLOOMY. Backgrounds shift warm (candlelit room), not cool (twilight blue). Plan recon verifies directionally; Eric reviews exact hex values.
- **W11:** Body text contrast in night mode meets WCAG AA (4.5:1 minimum). Test with axe-core at multiple viewport widths.
- **W12:** Night Watch chip's breathing-glow animation is SUBTLE (opacity oscillation 0.7–1.0, NOT 0.0–1.0). Should feel like a slow heartbeat, not a flashing alert.
- **W13:** Night Watch chip's icon and text are READABLE in the night palette. Don't make the indicator itself hard to see.
- **W14:** Day-to-night palette transition (when polling tick fires at 9pm) is smooth in standard motion; instant in reduced-motion. NO flash of unstyled content during the transition.

**Brand voice / copy (Gate-G-COPY-PAIRS):**
- **W15:** Night copy variants avoid sad-shaming. NO "can't sleep?" NO "insomnia" NO "another sleepless night." Just neutral acknowledgment.
- **W16:** Night variants are SHORTER or EQUAL length to day variants (never longer). Night is quieter; copy reflects that.
- **W17:** Reaction/Pray copy is identical day and night ("Praying for them." never changes). The action is the same; only the ambient feel shifts.
- **W18:** Night Watch chip's popover content is gentle. "The Prayer Wall is quieter at night" not "You're using Night Mode."
- **W19:** Settings labels for the 3-state preference are descriptive, not technical. "Auto (9pm – 6am)" not "Time-based."

**Anti-pressure / anti-metrics:**
- **W20:** NO analytics on Night Mode usage (D-NoTracking). NO event for "user toggled night mode." NO event for "user saw night mode chip."
- **W21:** NO toast/notification when mode flips. The visual change IS the message.
- **W22:** NO "Night Owl" badge or gamification. No celebration of using Night Mode. (Future spec might add Faithful Watcher-style badges, but those are for 6.4 if at all.)
- **W23:** NO suggestion to enable Night Mode for users who haven't opted in. Default is `'auto'`; explicit opt-out (`'off'`) is honored without nagging.

**Accessibility (Gate-G-A11Y):**
- **W24:** All night-state body text passes WCAG AA contrast (4.5:1). Heading text passes WCAG AA for large text (3:1).
- **W25:** Night Watch chip is keyboard-accessible: focusable, Enter/Space opens popover, Esc closes.
- **W26:** Popover traps focus while open; closing returns focus to chip.
- **W27:** Reduced-motion preference disables chip's breathing-glow AND day/night palette transition animation.
- **W28:** Color is NEVER the sole signal for any state. Chip has text label AND icon.

**Performance:**
- **W29:** Inline `index.html` script <5ms total execution. NO complex regex, NO loops, NO heavy DOM manipulation. Just: read localStorage, compute hour, set attribute.
- **W30:** CSS variable swap on day/night transition does NOT cause layout reflow. All changing values are `color`, `background-color`, `border-color` (no width/height/positioning).
- **W31:** Polling tick runs once per 60s; CPU cost negligible. Battery impact unmeasurable.

**Forward-compatibility with 6.4:**
- **W32:** `useNightMode()` returns `{ active, source, userPreference }` shape. 6.4's `useWatchMode()` consumes this shape unchanged.
- **W33:** `NightWatchChip` component is exported in a way that 6.4 can reuse or extend (NOT inlined into PrayerWall.tsx).
- **W34:** CSS variable namespacing reserves space for 6.4 to add Watch-specific overrides on top of Night Mode base.

---

## Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A.** | No DB changes (frontend-only). |
| Gate-2 (OpenAPI updates) | **N/A.** | No new endpoints. |
| Gate-3 (Copy Deck) | **Applies (HARD).** | All 8 day/night copy pairs + Night Watch chip strings + Settings labels go into the Copy Deck below. See Gate-G-COPY-PAIRS. |
| Gate-4 (Tests mandatory) | **Applies.** | ~18 tests (brief § 9). |
| Gate-5 (Accessibility) | **Applies (HARD).** | Night palette WCAG AA contrast, chip aria-label + keyboard nav, reduced-motion accommodation. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | Inline script <5ms, polling tick negligible, CSS variable swap is native browser path. |
| Gate-7 (Rate limiting on ALL endpoints) | **N/A.** | No new endpoints. |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | Reuse `index.css` attribute-selector pattern (BB-4 Bible Reader precedent at line 35), useSettings hook, settings-storage service. |
| Gate-9 (Plain text only) | **Applies.** | Night Watch chip popover content is plain text. No markdown. No `dangerouslySetInnerHTML`. |
| Gate-10 (Crisis detection supersession, Universal Rule 13) | **N/A for 6.3.** | Per MPD-10, 6.3 has no crisis surface. 6.4 handles crisis-adjacent behavior. |

**New gates specific to 6.3:**

- **Gate-G-NO-FOUC (HARD).** First-frame render at any hour with valid localStorage hint shows the correct mode. Visual regression test asserts dominant-background-pixel-color of first frame falls in expected palette range. If hint is missing or stale, FOUC duration <16ms (one frame at 60fps). Integration test: simulate browser hour 23:00 with empty localStorage; verify the first frame Playwright sees has `data-night-mode="on"` (browser hour fallback applied by inline script).
- **Gate-G-COPY-PAIRS (HARD).** All 8 day/night copy pairs in D-CopyPairs are AUTHORED in the brief. Eric reviews + approves before execute. CC executes against the approved set. During execute, CC MAY light-edit a copy variant for fit (within 2 words) but MUST NOT replace wholesale.
- **Gate-G-A11Y (HARD).**
  - All night-state body text meets WCAG AA contrast (4.5:1 minimum) against night background.
  - Heading text meets WCAG AA contrast (3:1 for large text).
  - Night Watch chip has `aria-label="Night Mode active"` (with optional `(always on)` suffix if manual override).
  - Chip popover is keyboard-accessible: Tab to chip, Enter/Space to open, Esc to close.
  - Reduced motion: chip's breathing-glow animation disabled.
  - Reduced motion: palette transition is instant (no CSS animation on color values).
  - Axe-core test passes with zero violations at 3 viewport widths (desktop, tablet, mobile) in night state.
- **Gate-G-SCOPE-PRAYER-WALL-ONLY (HARD).** `data-night-mode` attribute MUST be applied only to Prayer Wall surfaces. Daily Hub, Music, Settings, Landing, every other route NEVER receives this attribute regardless of time. Integration test: at 11pm, navigate from `/prayer-wall` to `/daily`; verify `data-night-mode` removed (or scoped element unmounts); verify Daily Hub renders in normal day theme. Code review hard-blocks any CSS rule that uses `:root[data-night-mode]` or `html[data-night-mode]` (the attribute must be scoped to Prayer Wall containers only).
- **Gate-G-LIVE-TRANSITION (SOFT).** While user is actively on Prayer Wall at the 9pm or 6am boundary, the mode flips within 60s without page reload. Integration test using fake timers + `setInterval` mock.

---

## Files to Create

**Frontend:**
- `frontend/src/lib/night-mode-resolver.ts` — pure functions `isNightHour(hour)`, `resolveNightModeActive(preference, hour)`. Imported by `useNightMode.ts` AND inlined at build time into `index.html` inline script (plan-recon R7 picks the inlining mechanism).
- `frontend/src/lib/__tests__/night-mode-resolver.test.ts` — unit tests for boundary conditions.
- `frontend/src/hooks/useNightMode.ts` — React hook returning `{ active, source, userPreference }` per D-Hook-API; reads settings + browser hour; polls every 60s per D-LivePolling; clears interval on unmount per W5.
- `frontend/src/hooks/__tests__/useNightMode.test.ts` — unit + integration tests including settings-change live transitions.
- `frontend/src/constants/night-mode-copy.ts` — 8 day/night copy pairs per D-CopyPairs; type-safe export with `NightModeCopyKey` union type.
- `frontend/src/constants/__tests__/night-mode-copy.test.ts` — validates pair count + non-empty fields + length invariant (W16: night ≤ day length).
- `frontend/src/components/prayer-wall/NightWatchChip.tsx` — component per D-NightWatchChip with breathing-glow animation, popover state, keyboard accessibility.
- `frontend/src/components/prayer-wall/__tests__/NightWatchChip.test.tsx` — component tests covering manual/auto subtitle, keyboard nav, popover open/close + focus return, reduced-motion behavior.
- `frontend/tests/e2e/night-mode.spec.ts` — Playwright suite: hour-boundary scenario + visual regression baseline (first-frame palette check).

## Files to Modify

**Frontend:**
- `frontend/index.html` — add inline `<script>` block per D-NoFOUC. Position: in `<body>` just before the React bundle script tag. ~15–20 lines of minified JS. Plan-recon R7 decides DOM target (flag on `<html>` vs targeted container).
- `frontend/src/pages/PrayerWall.tsx` — wrap root content in container with `data-night-mode={mode}` (or apply attribute to existing root element — plan-recon R6); import + render `<NightWatchChip />` in header when `active`; consume day/night copy variants from `night-mode-copy.ts` based on `active`.
- `frontend/src/pages/PrayerWallDashboard.tsx` — Prayer Wall surface; same wrapping if it doesn't share a layout with `/prayer-wall` (plan-recon R6).
- `frontend/src/pages/PrayerWallProfile.tsx` — Prayer Wall surface; same wrapping (plan-recon R6).
- `frontend/src/pages/PrayerDetail.tsx` (if exists) — single-post detail; same wrapping if not under a shared layout (plan-recon R6).
- `frontend/src/index.css` — add new section `[data-night-mode='on'] { ... }` with CSS variable overrides per D-NightPalette, scoped to Prayer Wall containers (W6, W7). Pattern matches existing `[data-reader-theme='midnight']` block at line 35 (R-OVR-S3).
- `frontend/src/types/settings.ts` — add `nightMode: NightModePreference` to `UserSettingsPrayerWall` interface (line 39 today); export `NightModePreference = 'auto' | 'on' | 'off'` type.
- `frontend/src/services/settings-storage.ts` — update default settings shape to include `prayerWall.nightMode: 'auto'`.
- `frontend/src/pages/Settings.tsx` — add 3-radio Night Mode preference UI in plan-determined section (plan-recon R10). Labels: "Auto (9pm – 6am)" / "Always on" / "Always off". Brief D-StateValues / MPD-4 / W19.
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — consume day/night hero subtitle variant based on `active` (D-CopyPairs row 1).
- `frontend/src/components/prayer-wall/<composer surfaces>` — each component using a copy-variant string consumes the appropriate one per D-CopyPairs (plan-recon R9 enumerates the actual surfaces: ComposerChooser, InlineComposer, QotdComposer, EmptyStates, FAB tooltip).
- `.claude/rules/11-local-storage-keys.md` — document `wr_night_mode_hint` key (allowed values: `'on' | 'off'`) plus a note that the 3-state preference is stored at `wr_settings.prayerWall.nightMode` (already documented under settings; cross-reference only). Per Spec spec-discipline.
- `frontend/vite.config.ts` — if needed for inline-script content authoring or HTML plugin configuration (plan-recon R7 decides exact mechanism for inlining `night-mode-resolver.ts` content into `index.html` script; alternative: ship the script statically with hand-maintained copy of resolver logic).

## Files NOT to Modify (explicit non-targets)

- **Backend (all of `backend/`):** NO backend changes. Setting persists via existing dual-write settings-storage infrastructure. NO new endpoints, NO new tables, NO new Liquibase changesets.
- `frontend/src/index.css`'s existing `[data-reader-theme='midnight']`, `[data-reader-theme='parchment']`, `[data-reader-theme='sepia']` blocks (lines 35, 60, 85) — untouched. Bible Reader theme is a separate concern.
- Landing page's existing "cinematic dark theme" — untouched. Different visual layer.
- Daily Hub, Music, Bible, Insights, Friends, every other non-Prayer-Wall page — must NOT receive `data-night-mode` attribute.
- Notification system (`useNotifications`, NotificationBell, etc.) — NO new notifications for night mode toggles (D-NoNotifications, W21).
- Faith points / streak system — night mode has NO points implications (W22).
- Activity log (`useFaithPoints.recordActivity`) — NO new activity types.
- Analytics / telemetry — NO new tracking paths (D-NoTracking, W20).

## Files to Delete

None. 6.3 is purely additive.

---

## Database Changes

**None.** 6.3 is frontend-only.

---

## API Changes

**None.** 6.3 is frontend-only.

---

## Copy Deck (Gate-3 / Gate-G-COPY-PAIRS HARD-block)

All user-facing strings authored in the brief and ratified here. **Eric MUST review + approve before execute.** Plan may light-edit (within 2 words per variant) for fit but cannot replace wholesale.

### Day / Night Copy Pairs

| # | Surface | Day variant | Night variant |
|---|---------|-------------|---------------|
| 1 | Hero subtitle | "What weighs on you today?" | "It's quiet here. You're awake." |
| 2 | Compose-FAB tooltip | "Share what's on your heart" | "Write something" |
| 3 | Compose modal heading | "What's on your heart?" | "Write something quiet" |
| 4 | Empty feed state | "The wall is quiet right now." | "It's quiet tonight. Be the first." |
| 5 | Compose placeholder | "Share what's weighing on you..." | "Write what's on your mind tonight..." |
| 6 | Greeting card (if shown) | "Good to see you." | "Good evening." |
| 7 | Reaction confirmation toast | "Praying for them." | (unchanged — prayer copy is identical at all hours) |
| 8 | Page title (browser tab) | "Prayer Wall • Worship Room" | "Prayer Wall • Night • Worship Room" |

### Night Watch Chip + Popover

- Chip text: "Night Mode" (always).
- Chip subtitle: "(always on)" — shown only when `source === 'manual'`.
- Chip aria-label: "Night Mode active" (with " (always on)" suffix when manual).
- Popover heading: "Night Mode"
- Popover body: "The Prayer Wall is quieter at night. Same posts; gentler palette."
- Popover link: "Change in Settings" (target: `/settings#night-mode` — plan-recon R10 confirms anchor or section route).

### Settings — Night Mode Preference

- Section heading (plan-recon R10 picks placement): "Night Mode" (or as plan determines based on existing Settings section structure).
- Radio label 1: "Auto (9pm – 6am)" — default; first/recommended position.
- Radio label 2: "Always on"
- Radio label 3: "Always off"
- Optional helper text: TBD by plan-recon R10 based on surrounding Settings UX patterns. If included, gentle + descriptive (e.g., "Dim the Prayer Wall at night for a quieter feel.") — never instructional or technical.

### Anti-Pressure Copy Checklist (HARD)

- ✅ No sad-shaming ("can't sleep?", "another sleepless night", "insomnia").
- ✅ No metrics framing ("you've used Night Mode N times").
- ✅ No notification when mode toggles (D-NoNotifications / W21).
- ✅ No suggestion to enable Night Mode for users who haven't opted in (W23).
- ✅ No celebration / gamification ("Night Owl badge", confetti, etc.) (W22).
- ✅ Night variants are SHORTER or EQUAL length to day variants (W16) — verified by `night-mode-copy.test.ts`.
- ✅ Reaction/Pray copy identical day and night (W17) — pair 7 explicitly unchanged.
- ✅ Popover content is gentle ("quieter at night" not "you're using Night Mode") (W18).
- ✅ Settings labels descriptive not technical ("Auto (9pm – 6am)" not "Time-based") (W19).

---

## Anti-Pressure Design Decisions (Universal Rule 17 — Anti-Pressure Voice)

6.3 is an ambient, intentionally-quiet feature. Anti-pressure compliance is load-bearing:

- **The visual change IS the message** (D-NoNotifications). No toast. No "Night Mode is now active" notification. The mode shift is felt, not announced.
- **No metrics, no celebration, no badge** (D-NoTracking, W20, W22). Night Mode is ambient. Measuring it would turn it into a metric. Anti-pattern.
- **Default `'auto'`, not `'off'`** (D-StateValues / MPD-4). Night users discover the feature ambiently; they don't have to opt in to receive it. Day users see no difference.
- **Explicit opt-out is silent** (W23). User selects `'off'` → no nagging, no "are you sure?", no follow-up suggestion to re-enable.
- **Night copy is neutral acknowledgment, not sympathy** (W15, W18). "It's quiet here. You're awake." not "Having a hard night?" — the user's emotional state is theirs, not the app's to name.
- **Reaction copy is timeless** (W17, D-CopyPairs row 7). "Praying for them." never changes. The act of intercession is identical at 2pm and 2am.
- **Brand voice is reverent, not gloomy** (W10, D-NightPalette). Warm muted palette (candlelit room), not cool/depressed (twilight blue). This is the xHigh-tier judgment surface Eric reviews.

---

## Acceptance Criteria

All 22 ACs from brief § 11 are PRESERVED VERBATIM, organized by category for execute/review traceability.

**Functional (from master plan + brief):**

- [ ] **A.** Night Mode auto-enables between 9pm and 6am local browser time (D-TimeSource / D-TimeWindow / MPD-1 / MPD-5).
- [ ] **B.** User can override in Settings: 3-state preference (`'auto'` / `'on'` / `'off'`), default `'auto'` (D-StateValues / MPD-4).
- [ ] **C.** Active Night Mode applies dimmed accents via CSS variable overrides under `[data-night-mode='on']` (D-Mechanism / D-NightPalette / MPD-3).
- [ ] **D.** 6–8 hero / CTA / empty-state / title copy strings swap to night variants per D-CopyPairs (Gate-G-COPY-PAIRS / MPD-8).
- [ ] **E.** Night Watch chip visible in PrayerWall page header when mode is active (D-NightWatchChip / MPD-9).
- [ ] **F.** NO flash of un-night-modded content on page load (Gate-G-NO-FOUC via inline script in `index.html`) (D-NoFOUC / MPD-7).
- [ ] **G.** ~18 tests covering hour boundaries, settings overrides, polling re-evaluation, no-FOUC, scope discipline, accessibility, visual regression (Gate-4 / brief § 9).

**Scope:**

- [ ] **H.** `data-night-mode` attribute applied ONLY to Prayer Wall surfaces (Gate-G-SCOPE-PRAYER-WALL-ONLY / MPD-2 / D-Scope / W6 / W7).
- [ ] **I.** Daily Hub, Music, Settings, Landing page, every non-Prayer-Wall route unaffected (W8 / Gate-G-SCOPE-PRAYER-WALL-ONLY).

**Live transition:**

- [ ] **J.** User actively on Prayer Wall at the 21:00 or 06:00 boundary sees mode flip within 60s without page reload (Gate-G-LIVE-TRANSITION / D-LivePolling / MPD-6).

**Accessibility:**

- [ ] **K.** Night palette body text passes WCAG AA contrast (4.5:1 minimum) — W11, W24.
- [ ] **L.** Night Watch chip is keyboard-accessible (Tab focuses, Enter/Space opens popover, Esc closes, focus returns) — W25, W26.
- [ ] **M.** `prefers-reduced-motion` disables chip's breathing-glow AND palette transition animation — W27, D-ReducedMotion.
- [ ] **N.** Axe-core passes zero violations at 3 viewport widths (desktop, tablet, mobile) in night state — Gate-G-A11Y.

**Brand voice:**

- [ ] **O.** Night copy variants pass Gate-G-COPY-PAIRS audit (no sad-shaming, no insomnia framing) — W15.
- [ ] **P.** Night Watch chip popover content is gentle + descriptive — W18.

**Forward-compatibility:**

- [ ] **Q.** `useNightMode()` returns `{ active, source, userPreference }`; 6.4's planned `useWatchMode()` can consume this shape — D-Hook-API, W32.
- [ ] **R.** `<NightWatchChip />` is reusable as a standalone component (NOT inlined into PrayerWall.tsx) — W33.

**Performance:**

- [ ] **S.** Inline `index.html` script <5ms total execution — W4, W29.
- [ ] **T.** Palette transition does NOT cause layout reflow — W30.

**Anti-metrics:**

- [ ] **U.** NO analytics on Night Mode usage — D-NoTracking, W20.
- [ ] **V.** NO toast/notification on mode flip — D-NoNotifications, W21.

---

## Testing Notes

All ~18 tests from brief § 9 are PRESERVED VERBATIM, organized by category. Plan refines exact test names + assertion targets after R6–R12 recon.

### Frontend unit tests (~5)

- `isNightHour(hour)`: returns `true` for 21, 22, 23, 0, 1, 2, 3, 4, 5; `false` for 6, 7, ..., 20.
- `isNightHour(6)`: returns `false` (exclusive end-of-window).
- `isNightHour(21)`: returns `true` (inclusive start-of-window).
- `resolveNightModeActive(preference, hour)`: returns `true` for `('on', any)`, `false` for `('off', any)`, calls `isNightHour(hour)` for `'auto'`.
- `useNightMode()` returns `source: 'auto'` when active via time, `'manual'` when via override.

### Frontend integration tests (~8)

- `useNightMode()`: mock browser hour to 23; setting `'auto'`; verify `active: true`, `source: 'auto'`.
- `useNightMode()`: mock hour 14; setting `'on'`; verify `active: true`, `source: 'manual'`.
- `useNightMode()`: mock hour 23; setting `'off'`; verify `active: false`, `source: 'manual'`.
- `useNightMode()`: with `setInterval` mock, advance time 60s across the 21:00 boundary; verify `active` flips from `false` to `true`.
- `useNightMode()`: on unmount, polling is cleared (verify via `clearInterval` spy).
- `<NightWatchChip>`: renders icon + text "Night Mode"; renders subtitle "(always on)" only when `source === 'manual'`.
- `<NightWatchChip>`: keyboard navigation — Tab focuses, Enter opens popover, Esc closes, focus returns to chip.
- localStorage hint: simulate fresh load with `wr_night_mode_hint: 'on'`; verify root container has `data-night-mode="on"` synchronously (before React mounts).

### Frontend reconciliation tests (~3)

- localStorage hint stale: mock hour 14, setting `'auto'`, localStorage hint = `'on'`; verify React mount reconciles to `data-night-mode="off"`; verify hint is updated to `'off'`.
- Settings change live: user has Night Mode active via auto; user toggles preference to `'off'`; verify attribute flips to `"off"` without page reload.
- Cross-route: from `/prayer-wall` at 23:00 (night active), navigate to `/daily`; verify Daily Hub does NOT have any night-mode attribute or styling.

### Playwright E2E + visual regression (~2)

- **Hour-boundary scenario:** Login, navigate to `/prayer-wall` at mocked 20:58; verify day theme; advance time to 21:01 via test harness; verify night theme applied without reload; verify Night Watch chip visible.
- **Visual regression (no-FOUC):** Load `/prayer-wall` at 23:00 with empty localStorage; screenshot the FIRST frame after `DOMContentLoaded`; assert dominant background pixel is in night palette range (not day). This catches FOUC if the inline script is broken.

### BB-45 reactive-store-consumer pattern

**N/A for 6.3.** Night Mode does NOT introduce a new reactive store. `useNightMode()` is a derived-state hook reading from `useSettings()` (existing) + browser hour (synchronous). No store subscription pattern needed. Spec 6.4 (`useWatchMode`) may follow the same hook-derived-state pattern.

---

## Notes for Plan Phase Recon (R6–R12 from brief § 5)

These items are explicitly DEFERRED to plan-time. `/plan-forums spec-6-3.md` performs each.

- **R6 — PLAN-RECON-REQUIRED: PrayerWall root container DOM target.**
  Plan reads `PrayerWall.tsx` end-to-end (~800 lines per brief R1). Picks between:
  - (a) Add `<div data-night-mode={mode}>` as the outermost wrapping element.
  - (b) Apply attribute to an existing root element.
  Whichever the plan picks, CSS selectors in `index.css` cascade FROM that target. All Prayer Wall styling needing night-state overrides must be reachable via that selector. Also determines whether `/prayer-wall/:id`, `/prayer-wall/dashboard`, `/prayer-wall/user/:id` share a layout wrapper (single wrap covers all) or each page applies independently.

- **R7 — PLAN-RECON-REQUIRED: `index.html` structure + inline script placement.**
  Plan reads `frontend/index.html`. The inline script for no-FOUC must:
  - Run before React's hydration script.
  - Read localStorage synchronously.
  - Compute hour from `new Date()`.
  - Apply attribute to `<html>` flag (e.g., `data-prayer-wall-night-mode="pending"`) OR set a signal the React app reads on mount.
  - NOT throw if localStorage is unavailable (e.g., privacy mode); fall back to time-based only (W3).
  - Be short enough that parse-and-execute cost is negligible (<5ms — W4, W29).
  If the SPA approach uses route-based rendering, the inline script may need to read `window.location.pathname` to decide whether to apply Night Mode at all (since Daily Hub etc. shouldn't get it). Alternative: apply universally but only target `[data-night-mode='on']` from CSS selectors scoped to Prayer Wall classNames. Plan picks the simpler + safer path.
  Also picks the inlining mechanism for `night-mode-resolver.ts` content (Vite HTML plugin, hand-maintained copy, or other).

- **R8 — PLAN-RECON-REQUIRED: Night palette CSS variable values.**
  Plan-time recon reads existing Prayer Wall day-state colors (which CSS variables are used) and derives night equivalents. Brief specifies the directional palette (warm muted tones, lower contrast on non-critical elements, preserved contrast for body text per WCAG AA — D-NightPalette / W10 / W11) but the exact hex values are plan-recon. **Eric reviews + approves before execute.**

- **R9 — PLAN-RECON-REQUIRED: Existing PrayerWall copy strings + their files.**
  Plan reads:
  - `PrayerWallHero.tsx` (hero subtitle, pair 1)
  - `ComposerChooser.tsx`, `InlineComposer.tsx`, `QotdComposer.tsx`, any FAB/CTA components (compose surfaces — pairs 2, 3, 5)
  - Empty-state component(s) (pair 4)
  - Greeting card component (pair 6, if exists)
  - Toast/notification system (pair 7 — actually unchanged, but verify pair 7's source string exists)
  - SEO/page title management (pair 8)
  Then maps which strings need day/night variants. Brief commits to 8 pairs in D-CopyPairs but actual surface count may differ slightly; plan can refine within the brief's 6–8 range.

- **R10 — PLAN-RECON-REQUIRED: Settings page Night Mode toggle placement.**
  Plan reads existing `Settings.tsx`. Decides which section the 3-radio Night Mode preference lives in. Likely candidates: "Display" section (if exists), "Prayer Wall" section (created by 6.1 via `prayerReceiptsVisible`), or new "Appearance" section. **Plan picks; Eric reviews.**

- **R11 — PLAN-RECON-REQUIRED: localStorage rules file update.**
  Plan adds new key to `.claude/rules/11-local-storage-keys.md`:
  - `wr_night_mode_hint` (string: `'on' | 'off'` — cached last-resolved state for no-FOUC purposes)
  - The 3-state preference (`wr_settings.prayerWall.nightMode`) is already covered via existing `wr_settings` doc; cross-reference only.

- **R12 — PLAN-RECON-REQUIRED: 6.4's expected `useNightMode()` API surface.**
  Plan reads master plan stub for 6.4 (lines 5202+ in `_forums_master_plan/round3-master-plan.md`) to understand what `useWatchMode()` will need from `useNightMode()`. Brief's recommendation: `useNightMode()` returns `{ active: boolean, source: 'auto' | 'manual', userPreference: 'auto' | 'on' | 'off' }`. The `source` field lets 6.4 distinguish "user is in night mode because of the time" vs "user has manually toggled it on at 2pm." Plan refines if 6.4's draft needs more.

---

## Out of Scope (Explicit Non-Targets — brief § 12)

The following are EXPLICITLY OUT OF SCOPE for 6.3:

- **Site-wide dark mode** / system `prefers-color-scheme` integration. Future spec if user feedback shows demand.
- **Per-user customization of the time window** ("my night starts at 10pm"). Window is fixed 9pm–6am. Future spec might add.
- **Seasonal adjustment** ("earlier sunset in winter triggers earlier night"). Window is fixed.
- **Geo-based timezone detection** (use `users.timezone` column added in Spec 1.3b). D-TimeSource locks browser-local.
- **Crisis content prioritization during night mode.** That's 6.4 (3am Watch).
- **Mental-health-specific copy or resources.** That's 6.4.
- **Notification suppression at night** ("don't ping me after 9pm"). Different concern; out of scope.
- **Brightness / blue-light filter** beyond the CSS palette swap. Browser-level extensions handle this; we don't.
- **A11Y-only "high contrast night mode"** (different from the design palette). System-level high-contrast modes handle this.
- **Analytics dashboard for Night Mode adoption.** D-NoTracking.
- **"Night Owl" badge or achievement.** Anti-pressure violation (W22).
- **Recommendation to enable Night Mode** ("You're on the Prayer Wall at 11pm — turn on Night Mode?"). Anti-pressure violation (W23).
- **Backend changes of any kind.** Frontend-only spec.

---

## Out-of-Band Notes for Eric

These items need Eric's attention OUTSIDE the spec/plan/execute pipeline:

1. **Approve the 8 day/night copy pairs in the Copy Deck.** Edits welcome. Light copy edits (within 2 words per variant) during execute are acceptable per Gate-G-COPY-PAIRS; wholesale replacements are not. Approval before execute.

2. **Approve the night-state CSS variable hex values** that plan-recon R8 surfaces. Directional guidance (warm muted, candlelit room, WCAG AA preserved) is locked in D-NightPalette / W10 / W11. Exact hex values are plan-authored. **This is the xHigh-tier judgment surface** — your "does this read as reverent, not gloomy?" call.

3. **Confirm execute sequencing.** 6.3 EXECUTE BLOCKED until 6.2 merges to `forums-wave-continued` (R-OVR-S2). 6.3 MUST NOT execute concurrently with 6.2b. Safe orderings enumerated in R-OVR-S2.

4. **Pick the Settings section** for the 3-radio Night Mode preference UI. Plan-recon R10 surfaces 2–3 candidate sections (Display, Prayer Wall, Appearance) based on `Settings.tsx` structure. You pick.

5. **Visual judgment at 2am.** After execute, open `/prayer-wall` at 2am on a real device (no Chrome DevTools time-mock — actual wall-clock). Does the night palette feel reverent? Or gloomy? Or hard to read? This is the brand-voice call only you can make (brief § 3 Manual verification step 13). If it fails this test, plan recon R8 + Eric-approval is the corrective loop.

6. **No-FOUC reality check.** On real iPhone or fresh browser: clear localStorage; visit `/prayer-wall` at 11pm; record screen via dev tools; verify FIRST frame shows night theme (brief § 3 Manual verification step 8 / brief § 15 Verification step 8). If FOUC is visible, the inline `index.html` script is broken — that's a hard regression and must be fixed before merge.

7. **Forward-compatibility check.** Before execute, optionally have plan re-read master plan stub for 6.4 (lines 5202+) to confirm `useNightMode()` API surface (`{ active, source, userPreference }`) supports `useWatchMode()`'s needs (R12). If 6.4 needs additional fields, surface during plan recon — easier to add now than refactor after 6.3 ships.

8. **Tracker update post-merge.** After Eric merges 6.3 to master: flip `_forums_master_plan/spec-tracker.md` row for 6.3 from ⬜ → ✅. Note in spec-tracker.md the date and any execute-time deviations from this spec.

---

## End of Spec
