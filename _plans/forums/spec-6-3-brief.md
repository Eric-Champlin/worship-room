# Brief: Spec 6.3 — Night Mode

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` lines 5169-5200

**Spec ID:** `round3-phase06-spec03-night-mode`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop)

**Size:** L (Large)

**Risk:** Medium (master plan); brief concurs — visual surface change, no-FOUC implementation, timezone handling, direct prerequisite for 6.4 crisis-adjacent surface

**Prerequisites:**
- 6.2 (Quick Lift) — must merge first (per master plan stub)
- 6.1 (Prayer Receipt) ✅ (shipped)
- Existing PrayerWall page + theming infrastructure ✅ verified
- Existing `UserSettings.prayerWall` namespace from 6.1 ✅ verified

**Tier:** **xHigh** (visual design surface + brand-defining theming + no-FOUC implementation + direct prerequisite for 6.4 crisis-adjacent code)

**Pipeline:** This brief → `/spec-forums spec-6-3-brief.md` → `/plan-forums spec-6-3.md` → execute → review.

**Execution sequencing:** Execute AFTER 6.2 merges. No backend changes → no conflict with 1.5g. Safest order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 OR 6.1 → 6.2 → 6.2b → 6.3 → 1.5g. 6.3 should NOT execute concurrently with 6.2b (both touch frontend prayer/daily surfaces with copy variants).

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that working tree is clean except for any pending 6.3 work.

---

## 2. Tier — xHigh

6.3 is **xHigh** tier. The bump from High (6.2b's tier) is justified by:

**Brand-defining visual surface.**
Night Mode is signature UX. Every CSS variable choice for the night state shapes the spiritual tone of the Prayer Wall at the hours users are most emotionally vulnerable. The dimmed palette must read as reverent and quiet, not gloomy or depressed.

**No-FOUC implementation is tricky.**
The attribute must be applied BEFORE React hydrates, otherwise users see a flash of day-mode content at 11pm. This requires an inline `<script>` in `index.html` that reads localStorage AND browser hour synchronously, with carefully scoped DOM manipulation. Easy to get wrong; hard to test (Playwright + visual regression on first-render frame).

**Timezone footgun.**
Browser local time vs `users.timezone` column (added Spec 1.3b). Brief picks browser-local (D-TimeSource) for sound reasons, but this decision has consequences if server-side notifications later need different timezone treatment. Worth locking down explicitly.

**Multiple copy variants.**
6-8 string pairs (day variant vs night variant) need precise authoring. Anti-pressure gates apply: "Good evening" not "Welcome back!" Every word matters.

**Direct prerequisite for 6.4 (3am Watch).**
6.4 is HIGH-RISK crisis-adjacent and builds directly on `useNightMode()`. The hook's public API design constrains 6.4's architecture. Get the hook wrong now → 6.4 either re-architects or inherits bugs in the most consequential surface in the wave.

**Practical execution implication:** xHigh tier means CC uses Opus 4.7 thinking `xhigh` for ALL phases (spec, plan, execute, review). Eric reviews:
- All night-state CSS variable values (palette)
- The `index.html` no-FOUC script (security + correctness)
- All day/night copy pair strings
- The `useNightMode()` hook public API (forward-compatibility with 6.4)
- Settings page UX (3-way toggle, defaults, persistence)
- Manual visual verification at 9pm → 6am transition windows on real device

---

## 3. Visual & Integration Verification

### Frontend (Playwright)

**Auto-mode transitions (default behavior):**
- Mock browser time to 8:59pm; load `/prayer-wall`; verify `data-night-mode="off"` on root container; verify day palette
- Mock browser time to 9:00pm; load `/prayer-wall`; verify `data-night-mode="on"`; verify night palette; verify Night Watch chip visible
- Mock browser time to 5:59am; verify night mode still active
- Mock browser time to 6:00am; verify `data-night-mode="off"`; verify Night Watch chip absent
- Mock browser time to 3:00am; verify night mode active (mid-window)
- Live transition: load at 8:58pm with mock-time progressing; wait until polling tick crosses 9:00pm; verify attribute flips without page reload

**Manual override modes:**
- Set settings to `nightMode: 'on'`; load at 2pm (daytime); verify `data-night-mode="on"`; verify Night Watch chip visible with "(always on)" subtitle
- Set settings to `nightMode: 'off'`; load at 3am (deep night); verify `data-night-mode="off"`; verify Night Watch chip absent
- Toggle from `auto` to `on` at 2pm; verify mode flips immediately (no page reload)
- Toggle from `on` to `off` at 3am; verify mode flips immediately

**No-FOUC verification:**
- Load `/prayer-wall` at 11pm with browser cache cleared (no localStorage hint); verify FIRST rendered frame shows night mode (inline script applies attribute before React hydrates)
- Load with stale localStorage hint (`wr_night_mode_hint: 'off'`) at 11pm; verify final state reconciles to `night-mode=on` AFTER React hydrates, but the FOUC duration is <16ms (single frame)
- Visual regression test: screenshot first frame; assert dominant background pixel is in night-palette range

**Copy variant verification:**
- At 2pm: hero subtitle reads day variant (e.g., "What weighs on you today?")
- At 11pm: hero subtitle reads night variant (e.g., "It's quiet here. You're awake.")
- Compose-FAB tooltip: day vs night variants
- Empty state message has day vs night variants
- All 6-8 copy pairs verified via Playwright text content assertions

**Night Watch chip:**
- Visible in PrayerWall page header when night mode active
- Tap chip → opens a small popover/modal explaining what Night Mode is + link to Settings (popover only; not a full route navigation)
- Popover closes on outside click or Esc
- Chip is decorative; the accessible name comes from the surrounding context

**Scope verification:**
- At 11pm: load `/daily` (Daily Hub) — NO night mode applied
- At 11pm: load `/settings` — NO night mode applied
- At 11pm: load `/music` — NO night mode applied
- Night Mode is Prayer-Wall-scoped (D-Scope)

**Reduced motion:**
- `prefers-reduced-motion: reduce` — the transition between day/night palettes is instant (no CSS animation on color values)
- Night Watch chip has a subtle breathing-glow animation in standard motion; reduced-motion disables the glow

**Accessibility:**
- Night palette meets WCAG AA contrast for all body text against night backgrounds
- Night Watch chip has descriptive `aria-label` ("Night Mode active")
- Axe-core scan passes with zero violations in night state at multiple viewport widths

### Backend

NO backend changes for 6.3. The setting persists via existing settings-storage service + dual-write infrastructure already shipped.

### Manual verification by Eric after execute

- Open Prayer Wall just before 9pm local time; verify it's still day-mode; wait for the transition tick at 9:00pm; verify it flips without reload (DO NOT have dev tools open changing time — actual wall-clock)
- Stay on the page until 6:00am (or use the mock-time test) and verify reverse transition
- Visit `/prayer-wall` at 2am; observe the actual feel of the night palette. Does it read as reverent? Or gloomy? Or hard to read? This is the brand-voice judgment Eric makes (xHigh tier review)
- Read every copy pair aloud; verify night variants land softer than day variants without feeling sad or clinical
- Toggle to `'on'` mode at 2pm; verify the whole Prayer Wall surface dims; verify it doesn't feel like a bug
- Visit `/daily` at 11pm; verify it does NOT dim (Daily Hub is out of scope per D-Scope)
- Real device test on iPhone: visit at 11pm; verify no FOUC visible during page load

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the stub at lines 5169-5200. Plan/execute MUST honor the brief, not the stub.

**MPD-1: Time source is browser-local, NOT `users.timezone` column.**
Stub says "local time" — ambiguous. Two candidate sources:
- Browser local time (`Date.getHours()` in JS, returns user's current machine timezone)
- Server-side `users.timezone` column (added Spec 1.3b, IANA timezone string)

Brief decides: **browser-local.** Rationale:
- Night Mode is about the user's CURRENT physical environment. If they're traveling, their browser reflects current location's time. The server-stored timezone is what they configured weeks ago at registration.
- Browser-local is synchronous (no API call), enabling the no-FOUC inline script.
- Server-side timezone is for things like "send me my weekly email at 9am MY time" — different concern.

Consequence documented in W-Timezone-Drift: if a user travels east and forgets to update Settings.timezone, Night Mode still works correctly (browser knows). If a user uses a VPN that masks timezone or a desktop with wrong clock, Night Mode may be wrong — that's a known limitation, accepted.

**MPD-2: Scope is Prayer-Wall-only, NOT site-wide.**
Stub says "Prayer Wall enters Night Mode" — brief commits to a strict interpretation: the `data-night-mode` attribute is applied on a Prayer-Wall-root container, NOT on `<html>`. Daily Hub, Music, Settings, and other surfaces stay in their normal theme regardless of time.

Rationale:
- Night Mode is about the *content* of the Prayer Wall (intimate, slower, vulnerable). Daily Hub being dim at 11pm doesn't serve any UX purpose.
- Site-wide theming has scope creep risk (every component needs night-state styles).
- 6.4 (3am Watch) is also Prayer-Wall-scoped, so this aligns the architectural surface.

If future spec wants site-wide dark mode, it would be a SEPARATE concern (system dark mode integration via `prefers-color-scheme`).

**MPD-3: Theming mechanism is `[data-night-mode='on']` attribute selector with CSS variable overrides.**
Stub doesn't specify mechanism. Brief picks attribute-selector + CSS custom properties, matching the existing pattern in `index.css` (`[data-reader-theme='midnight']` from BB-4 Bible Reader). Same pattern, same file, same conventions.

WHY not React Context with inline styles? Performance + simplicity. The CSS layer handles 100% of the visual change; React just toggles the attribute. No re-renders cascade through component trees.

WHY not a class like `.night-mode`? Tailwind class-based dark mode is one option, but the existing pattern is attribute-based. Consistency wins.

**MPD-4: 3-state preference (`'auto' | 'on' | 'off'`), NOT a binary toggle.**
Stub mentions "override in settings." Brief locks down the exact shape: a 3-state enum, defaulting to `'auto'`. `'on'` and `'off'` are explicit overrides that bypass time-based evaluation entirely.

UI: radio buttons (NOT a toggle switch). Each labeled with descriptive text:
- "Auto (9pm – 6am)" — default
- "Always on"
- "Always off"

**MPD-5: Time window is 9pm to 6am LOCAL browser hour, no minute precision.**
Stub says "between 9pm and 6am." Brief locks: 21:00:00 to 05:59:59 inclusive of start, exclusive of end (so 6:00am exactly flips back to day mode).

No minute-level precision (e.g., "9:00pm but not 9:01pm"). The hour boundary is the trigger.

No seasonal adjustment (no "earlier in winter"). The window is fixed regardless of sunset time.

No per-user customization of window hours — the three options are auto/on/off. (Future spec could add "custom window"; out of scope here.)

**MPD-6: Live re-evaluation via polling, not just on mount.**
Stub doesn't address what happens if a user is actively on Prayer Wall at the 9pm boundary. Brief mandates: `useNightMode()` polls `Date.now()` every 60 seconds while mounted, re-evaluating the active state. When the boundary crosses, the attribute flips without page reload, copy strings re-render via React.

The 60-second granularity means worst-case the user sees the wrong mode for up to 59 seconds at the boundary. Acceptable trade-off vs. continuous evaluation (which would burn battery for no perceptual benefit).

**MPD-7: No-FOUC via inline `<script>` in `index.html` with localStorage hint.**
Stub says "SSR-safe via local storage hint." Brief locks the mechanism:
1. Inline `<script>` near top of `<body>` in `index.html` (runs synchronously before React)
2. Script reads `localStorage.wr_night_mode_hint` (cached last-applied state from previous render)
3. Script also computes current hour from `new Date().getHours()`
4. Script resolves: if `wr_night_mode_hint === 'on'` OR (`wr_night_mode_hint === 'auto'` AND hour in [21..29]), apply `data-night-mode="on"` to a SPECIFIC ID'd container OR set a `<html data-prayer-wall-night-mode="pending">` flag that the Prayer Wall route reads on mount
5. React mounts; `useNightMode()` re-evaluates with fresh data (settings hook resolves user preference); reconciles attribute; updates `wr_night_mode_hint` for next load

Plan-time recon (R7) decides the exact DOM target: an SPA approach where the attribute lives on a `<div id="prayer-wall-root">` requires the script to know when Prayer Wall is the active route. Alternative: apply on `<html>` and remove on routes that aren't Prayer Wall. Plan picks the cleaner path.

**MPD-8: Copy variants authored inline in brief (similar to 6.2b prompts).**
Stub doesn't author copy. Brief includes a full 8-pair day/night copy set in Section 7 D-CopyPairs. Eric reviews + approves before execute. Plan may light-edit for fit (within 2 words) but cannot replace wholesale.

**MPD-9: Night Watch chip is a NEW component, not just a visibility class.**
Stub says "NightWatchChip.tsx" is a new file. Brief locks: it's a self-contained React component with internal state for the popover, breathing-glow animation, and accessibility wiring. It's NOT a string of CSS applied to an existing element. Modular component for downstream consumers (6.4 reuses or extends it for the "Watch is on" indicator).

**MPD-10: NO crisis-adjacent copy in 6.3.**
Night Mode is purely visual + ambient. It does NOT change feed sorting (that's 6.4's job). It does NOT inject crisis resources (that's 6.4's job). It does NOT add any mental-health-specific copy or imagery (that's 6.4's job).

This separation is load-bearing: 6.3 ships an aesthetic theming feature. 6.4 ships a content-prioritization feature. Conflating them in 6.3 would lock in 6.4's design before its higher-risk review is done.

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R5) or flagged for plan-time recon (R6-R12).

**R1 — PrayerWall.tsx structure: VERIFIED.**
File: `frontend/src/pages/PrayerWall.tsx` (~800+ lines).
- Imports SEO + Navbar + PrayerWallHero + composer + feed
- Root return wraps in a container; plan-recon (R6) determines exact insertion point for `data-night-mode` attribute
- Component is large but well-structured; insertion of the attribute is a single change

**R2 — Existing theming pattern in `index.css`: VERIFIED.**
File: `frontend/src/index.css`.
- Line 34-52: `[data-reader-theme='midnight']` block defines CSS custom properties for Bible Reader theme (`--reader-bg`, `--reader-text`, `--reader-verse-num`, `--reader-divider`, plus highlight colors)
- NO `prefers-color-scheme` usage anywhere in the codebase
- NO existing `useTheme` or `data-night-mode` infrastructure
- The pattern: attribute selector → CSS variable overrides. 6.3 follows this pattern verbatim.

**R3 — Settings type structure: VERIFIED.**
File: `frontend/src/types/settings.ts`.
- Namespaced `UserSettings.prayerWall` namespace exists (added Spec 6.1)
- Currently contains `prayerReceiptsVisible: boolean` (from 6.1)
- 6.3 adds `nightMode: 'auto' | 'on' | 'off'` to this namespace, default `'auto'`
- Other namespaces: `account`, `notifications`, `privacy` (NudgePermission/StreakVisibility enums exist)

**R4 — Settings storage + hook infrastructure: VERIFIED.**
Files:
- `frontend/src/services/settings-storage.ts` — read/write `wr_settings` localStorage with deep-merge
- `frontend/src/hooks/useSettings.ts` — React hook wrapping the service
- `frontend/src/pages/Settings.tsx` — Settings page (~230 lines per memory)
- Existing pattern is well-established. 6.3 plugs into it.

**R5 — NO existing useTime or useTheme hook: VERIFIED.**
- `Filesystem:search_files` for `*Theme*` and `*Time*` in `frontend/src/hooks/` returned nothing useful
- `useNightMode()` is genuinely new infrastructure
- No existing setInterval-based polling hook to reuse

**R6 — PLAN-RECON-REQUIRED: PrayerWall root container DOM target.**
Plan reads `PrayerWall.tsx` end-to-end. Two options:
- (a) Add `<div data-night-mode={mode}>` as the outermost wrapping element
- (b) Apply attribute to an existing root element

Whichever the plan picks, CSS selectors in index.css cascade FROM that target. All Prayer Wall styling that needs night-state overrides must be reachable via that selector.

**R7 — PLAN-RECON-REQUIRED: index.html structure + inline script placement.**
Plan reads `frontend/index.html`. The inline script for no-FOUC must:
- Run before React's hydration script
- Read localStorage synchronously
- Compute hour from `new Date()`
- Apply attribute to `<html>` OR set a flag the React app reads on mount
- NOT throw if localStorage is unavailable (e.g., privacy mode); fall back to time-based only
- Be short enough that its parse-and-execute cost is negligible (<5ms)

If the SPA approach uses route-based rendering, the inline script may need to read `window.location.pathname` to decide whether to apply Night Mode at all (since Daily Hub etc. shouldn't get it). Alternative: apply universally but only target `[data-night-mode='on']` from CSS selectors scoped to Prayer Wall classNames. Plan picks the simpler path.

**R8 — PLAN-RECON-REQUIRED: Night palette CSS variable values.**
Plan-time recon reads existing Prayer Wall day-state colors (which CSS vars are used) and derives night equivalents. Brief specifies the directional palette (warm muted tones, lower contrast on non-critical elements, preserved contrast for body text per WCAG AA) but the exact hex values are plan-recon. Eric reviews + approves before execute.

**R9 — PLAN-RECON-REQUIRED: Existing PrayerWall copy strings + their files.**
Plan reads:
- `PrayerWallHero.tsx` (hero subtitle)
- ComposerCTA / FAB component
- EmptyState component
- Other Prayer Wall surface copy locations
Then maps which strings need day/night variants. Brief commits to 6-8 pairs in D-CopyPairs but actual count is plan-recon.

**R10 — PLAN-RECON-REQUIRED: Settings page Night Mode toggle placement.**
Plan reads existing `Settings.tsx`. Decides which section the 3-radio Night Mode preference lives in. Likely candidates: "Display" section (if exists), "Prayer Wall" section (created by 6.1), or new "Appearance" section. Plan picks; Eric reviews.

**R11 — PLAN-RECON-REQUIRED: localStorage rules file update.**
Plan adds two new keys to `.claude/rules/11-local-storage-keys.md`:
- `wr_night_mode_hint` (string: 'on' | 'off' | 'auto' — cached last-applied state)
- (settings already covered via existing `wr_settings.prayerWall.nightMode` per R3)

**R12 — PLAN-RECON-REQUIRED: 6.4's expected `useNightMode()` API surface.**
Plan reads master plan stub for 6.4 (lines 5202+) to understand what `useWatchMode()` will need from `useNightMode()`. Brief's recommendation: `useNightMode()` returns `{ active: boolean, source: 'auto' | 'manual', userPreference: 'auto' | 'on' | 'off' }`. The `source` field lets 6.4 distinguish between "user is in night mode because of the time" vs "user has manually toggled it on at 2pm." Plan refines if 6.4's draft needs more.

---

## 6. Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A.** | No DB changes. |
| Gate-2 (OpenAPI updates) | **N/A.** | No new endpoints. |
| Gate-3 (Copy Deck) | **Applies (HARD).** | All 8 day/night copy pairs + Night Watch chip strings + Settings labels added to Copy Deck. See Gate-G-COPY-PAIRS. |
| Gate-4 (Tests mandatory) | **Applies.** | ~16-20 tests. |
| Gate-5 (Accessibility) | **Applies (HARD).** | Night palette WCAG AA contrast, chip aria-label, reduced-motion accommodation. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | Inline script <5ms, polling tick negligible, CSS variable swap is native browser path. |
| Gate-7 (Rate limiting on ALL endpoints) | **N/A.** | No new endpoints. |
| Gate-8 (Respect existing patterns) | **Applies (HARD).** | Reuse `index.css` attribute-selector pattern (BB-4 Bible Reader precedent), useSettings hook, settings-storage. |
| Gate-9 (Plain text only) | **Applies.** | Night Watch chip popover content is plain text. No markdown. |
| Gate-10 (Crisis detection supersession) | **N/A.** | (Per MPD-10: 6.3 has no crisis surface.) |

**New gates specific to 6.3:**

**Gate-G-NO-FOUC (HARD).**
First-frame render at any hour with valid localStorage hint shows the correct mode. Visual regression test asserts dominant-background-pixel-color of first frame falls in expected palette range. If hint is missing or stale, FOUC duration is < 16ms (one frame at 60fps).

Integration test: simulate browser hour 23:00 with empty localStorage; verify the first frame Playwright sees has `data-night-mode="on"` (browser hour fallback applied by inline script).

**Gate-G-COPY-PAIRS (HARD).**
All 8 day/night copy pairs in Section 7 D-CopyPairs are AUTHORED in this brief. Eric reviews + approves before execute. CC executes against the approved set.

During execute, CC MAY light-edit a copy variant for fit (within 2 words) but MUST NOT replace wholesale.

**Gate-G-A11Y (accessibility — HARD).**
MUST cover:
- All night-state body text meets WCAG AA contrast (4.5:1 minimum) against night background
- Heading text meets WCAG AA contrast (3:1 for large text)
- Night Watch chip has `aria-label="Night Mode active"` (with optional `"(always on)"` suffix if manual override)
- Chip popover is keyboard-accessible: Tab to chip, Enter/Space to open, Esc to close
- Reduced motion: chip's breathing-glow animation disabled
- Reduced motion: palette transition is instant (no CSS animation on color values)
- Axe-core test passes with zero violations at 3 viewport widths in night state

**Gate-G-SCOPE-PRAYER-WALL-ONLY (HARD).**
`data-night-mode` attribute MUST be applied only to Prayer Wall surfaces. Daily Hub, Music, Settings, etc. NEVER receive this attribute regardless of time.

Integration test: at 11pm, navigate from `/prayer-wall` to `/daily`; verify the `data-night-mode` attribute is removed (or scoped element unmounts); verify Daily Hub renders in normal day theme.

Code review hard-blocks any CSS rule that uses `:root[data-night-mode]` or `html[data-night-mode]` (the attribute must be scoped to Prayer Wall containers only).

**Gate-G-LIVE-TRANSITION (SOFT).**
While user is actively on Prayer Wall at the 9pm or 6am boundary, the mode flips within 60s without page reload. Integration test using fake timers + setInterval mock.

---

## 7. Decisions Catalog

The 14 design decisions baked into the brief that plan and execute must honor.

**D-TimeSource: Browser-local time via `new Date().getHours()`.** (MPD-1)
Synchronous, no API call, works offline, reflects user's current physical environment. Server-side `users.timezone` column NOT used for Night Mode evaluation.

**D-Scope: Prayer-Wall-only.** (MPD-2)
`data-night-mode` attribute applied to Prayer Wall root container, NOT `<html>`. Other surfaces stay in normal theme.

**D-Mechanism: Attribute selector + CSS variable overrides.** (MPD-3)
Follows existing `[data-reader-theme='midnight']` pattern from BB-4 Bible Reader. New attribute: `data-night-mode='on' | 'off'`. CSS variables overridden in `[data-night-mode='on']` block.

**D-StateValues: 3-state preference, `'auto'` default.** (MPD-4)
```typescript
type NightModePreference = 'auto' | 'on' | 'off'
const DEFAULT_NIGHT_MODE: NightModePreference = 'auto'
```
Stored at `UserSettings.prayerWall.nightMode`.

**D-TimeWindow: 21:00 to 05:59 inclusive of start, exclusive of end.** (MPD-5)
```typescript
function isNightHour(hour: number): boolean {
  return hour >= 21 || hour < 6
}
```
Fixed window. No seasonal adjustment. No per-user customization.

**D-LivePolling: 60-second polling tick.** (MPD-6)
`useNightMode()` uses `setInterval(reEvaluate, 60_000)` while mounted. Worst-case 59-second latency at boundary. Acceptable.

Polling cleared on unmount (no memory leak).

**D-NoFOUC: Inline script in `index.html`.** (MPD-7)
Script runs synchronously before React. Reads localStorage hint + browser hour. Applies attribute. Plan-time recon (R7) decides exact DOM target and route detection strategy.

**D-CopyPairs: 8 authored day/night copy pairs.** (MPD-8 / Gate-G-COPY-PAIRS)

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

**Anti-pressure compliance:** No night variant uses sad-shaming or insomnia-language. No "can't sleep again?" No "insomnia." Just neutral acknowledgment that it's night.

Eric MUST review + approve before execute. Edits welcome. Plan may shorten by 1-2 words; cannot replace wholesale.

**D-NightWatchChip: Self-contained component with popover.** (MPD-9)
Component: `<NightWatchChip />` rendered in PrayerWall page header when `active === true`.
- Icon: Lucide `Moon` (crescent moon)
- Text: "Night Mode" (always); subtitle "(always on)" if `source === 'manual'`
- Tap opens popover with explainer text + link to `/settings#night-mode`
- Breathing-glow animation on the icon (3s cycle, low intensity); disabled by reduced-motion
- Accessibility: `role="button"`, `aria-label="Night Mode active"` (or with `(always on)` suffix)
- Component is reusable; 6.4 may extend or replace with its own "Watch is on" indicator

**Popover content (also authored):**
```
Heading: "Night Mode"
Body: "The Prayer Wall is quieter at night. Same posts; gentler palette."
Link: "Change in Settings"
```

**D-NightPalette: Direction-only; exact values plan-recon (R8).**
Plan-recon picks the exact hex values for:
- Background (warmer, darker than day)
- Text primary (slightly muted but WCAG AA against background)
- Text secondary (more muted; for timestamps, metadata)
- Accent (warmer tone; e.g., amber instead of cool blue)
- Border/divider (lower contrast than day)
- Highlight (warmer for "praying" / "candle" interactions)

Directional guidance:
- Backgrounds shift warm (not cool). Think candlelit room, not blue twilight.
- Avoid pure black; use a near-black with warm undertone (e.g., `#1a1614` not `#000000`)
- Avoid pure white text; use a soft cream (e.g., `#e8e3da`) for body
- Accent shifts from cool to warm: e.g., if day accent is `#7b9ce0` (cool blue), night accent might be `#d4a373` (warm amber)

Eric reviews + approves before execute. xHigh-tier judgment surface.

**D-Hook-API: `useNightMode()` returns rich state object for 6.4 compat.** (MPD-12 forward-compat)
```typescript
type UseNightModeReturn = {
  active: boolean                              // true if mode is currently active
  source: 'auto' | 'manual'                    // 'auto' = time-based; 'manual' = user override
  userPreference: 'auto' | 'on' | 'off'        // raw setting value
  // (NOT exposed: the current hour or polling internals)
}
```
Forward-compatible for 6.4's `useWatchMode()` which combines this with timezone + opt-in.

**D-LocalStorageHint: `wr_night_mode_hint` key.**
Written on every reconciliation pass by `useNightMode()`. Read by inline script on next page load. Value matches the current resolved attribute ('on' | 'off').

3-state preference (`'auto' | 'on' | 'off'`) is stored elsewhere (`wr_settings.prayerWall.nightMode`). Hint key is just the RESOLVED state for no-FOUC purposes.

**D-ReducedMotion: Visual-only.**
`prefers-reduced-motion: reduce` changes:
- Day/night palette transition: instant (no CSS animation on `--bg`, `--text`, etc.)
- Night Watch chip breathing-glow: disabled (icon static)

Does NOT change:
- Time-based evaluation (still triggers at 9pm/6am)
- Polling cadence
- Any user-facing behavior

**D-NoTracking: No analytics on Night Mode usage.**
Do NOT add telemetry for:
- How many users have Night Mode 'on' vs 'off' vs 'auto'
- How much time users spend on Prayer Wall during night hours
- Whether users see the Night Watch chip popover

Night Mode is a quiet, ambient feature. Measuring it would turn it into a metric. Anti-pattern.

Aggregate anonymous logs (e.g., "Prayer Wall served 1000 requests at 3am") that already exist for capacity planning are fine — but no new analytics paths added for 6.3.

**D-NoNotifications: No push or in-app notifications when night mode toggles.**
When the mode flips at the boundary, the user sees the visual change. No toast. No notification. No "Night Mode is now active" message. The mode change is the message.

If the user manually toggles in Settings, the visual change confirms the action; no toast needed.

---

## 8. Watch-fors

Organized by theme. ~30 items total.

### Security / correctness
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: Inline `index.html` script must NOT execute arbitrary user content. Read localStorage as JSON (catch parse errors), read `Date.getHours()`, write attribute. No `eval`, no `innerHTML`, no dynamic imports.
- W3: Inline script must gracefully handle localStorage exceptions (private mode, quota exceeded, disabled). On exception, fall back to time-based evaluation only.
- W4: Inline script must NOT block React hydration. Total execution <5ms on first run.
- W5: Polling tick uses `setInterval` (not `setTimeout` chains). Properly cleared on unmount. Test verifies no memory leak.

### Scope discipline (Gate-G-SCOPE-PRAYER-WALL-ONLY)
- W6: `data-night-mode` attribute applied to Prayer Wall containers ONLY. NEVER on `<html>`, `<body>`, or `:root`.
- W7: CSS selectors using `[data-night-mode='on']` must be scoped to Prayer Wall classNames or container IDs. NO global selectors.
- W8: When user navigates from `/prayer-wall` to `/daily`, the night mode visual treatment must completely disappear (no leakage).
- W9: Landing page's existing "cinematic dark theme" (from memory) is unrelated to Night Mode. Verify no CSS variable name collisions.

### Visual / brand
- W10: Night palette reads as REVERENT, not GLOOMY. Backgrounds shift warm (candlelit room), not cool (twilight blue). Plan recon must verify this directionally; Eric reviews exact hex values.
- W11: Body text contrast in night mode meets WCAG AA (4.5:1 minimum). Test with axe-core at multiple viewport widths.
- W12: Night Watch chip's breathing-glow animation is SUBTLE (opacity oscillation 0.7-1.0, NOT 0.0-1.0). Should feel like a slow heartbeat, not a flashing alert.
- W13: Night Watch chip's icon and text are READABLE in the night palette. Don't make the indicator itself hard to see.
- W14: Day-to-night palette transition (when polling tick fires at 9pm) is smooth in standard motion; instant in reduced-motion. NO flash of unstyled content during the transition.

### Brand voice / copy (Gate-G-COPY-PAIRS)
- W15: Night copy variants avoid sad-shaming. NO "can't sleep?" NO "insomnia" NO "another sleepless night." Just neutral acknowledgment.
- W16: Night variants are SHORTER or EQUAL length to day variants (never longer). Night is quieter; copy reflects that.
- W17: Reaction/Pray copy is identical day and night ("Praying for them." never changes). The action is the same; only the ambient feel shifts.
- W18: Night Watch chip's popover content is gentle. "The Prayer Wall is quieter at night" not "You're using Night Mode."
- W19: Settings labels for the 3-state preference are descriptive, not technical. "Auto (9pm – 6am)" not "Time-based."

### Anti-pressure / anti-metrics
- W20: NO analytics on Night Mode usage (D-NoTracking). NO event for "user toggled night mode." NO event for "user saw night mode chip."
- W21: NO toast/notification when mode flips. The visual change IS the message.
- W22: NO "Night Owl" badge or gamification. No celebration of using Night Mode. (Future spec might add Faithful Watcher-style badges, but those are for 6.4 if at all.)
- W23: NO suggestion to enable Night Mode for users who haven't opted in. Default is `'auto'`; explicit opt-out (`'off'`) is honored without nagging.

### Accessibility (Gate-G-A11Y)
- W24: All night-state body text passes WCAG AA contrast (4.5:1). Heading text passes WCAG AA for large text (3:1).
- W25: Night Watch chip is keyboard-accessible: focusable, Enter/Space opens popover, Esc closes.
- W26: Popover traps focus while open; closing returns focus to chip.
- W27: Reduced-motion preference disables chip's breathing-glow AND day/night palette transition animation.
- W28: Color is NEVER the sole signal for any state. Chip has text label AND icon.

### Performance
- W29: Inline `index.html` script <5ms total execution. NO complex regex, NO loops, NO heavy DOM manipulation. Just: read localStorage, compute hour, set attribute.
- W30: CSS variable swap on day/night transition does NOT cause layout reflow. All changing values are `color`, `background-color`, `border-color` (no width/height/positioning).
- W31: Polling tick runs once per 60s; CPU cost negligible. Battery impact unmeasurable.

### Forward-compatibility with 6.4
- W32: `useNightMode()` returns `{ active, source, userPreference }` shape. 6.4's `useWatchMode()` consumes this shape unchanged.
- W33: `NightWatchChip` component is exported in a way that 6.4 can reuse or extend (NOT inlined into PrayerWall.tsx).
- W34: CSS variable namespacing reserves space for 6.4 to add Watch-specific overrides on top of Night Mode base.

---

## 9. Test Specifications

~18 tests total. Heavy on frontend integration; one Playwright visual regression.

### Frontend unit tests (~5)
- `isNightHour(hour)`: returns true for 21, 22, 23, 0, 1, 2, 3, 4, 5; false for 6, 7, ..., 20.
- `isNightHour(6)`: returns false (exclusive end-of-window).
- `isNightHour(21)`: returns true (inclusive start-of-window).
- `resolveNightModeActive(preference, hour)`: returns true for `('on', any)`, false for `('off', any)`, calls `isNightHour(hour)` for `'auto'`.
- `useNightMode()` returns `source: 'auto'` when active via time, `'manual'` when via override.

### Frontend integration tests (~8)
- `useNightMode()`: mock browser hour to 23; setting `'auto'`; verify `active: true`, `source: 'auto'`.
- `useNightMode()`: mock hour 14; setting `'on'`; verify `active: true`, `source: 'manual'`.
- `useNightMode()`: mock hour 23; setting `'off'`; verify `active: false`, `source: 'manual'`.
- `useNightMode()`: with `setInterval` mock, advance time 60s across the 21:00 boundary; verify `active` flips from false to true.
- `useNightMode()`: on unmount, polling is cleared (verify via `clearInterval` spy).
- `<NightWatchChip>`: renders icon + text "Night Mode"; renders subtitle "(always on)" only when `source === 'manual'`.
- `<NightWatchChip>`: keyboard navigation — Tab focuses, Enter opens popover, Esc closes, focus returns to chip.
- localStorage hint: simulate fresh load with `wr_night_mode_hint: 'on'`; verify root container has `data-night-mode="on"` synchronously (before React mounts).

### Frontend reconciliation tests (~3)
- localStorage hint stale: mock hour 14, setting `'auto'`, localStorage hint = `'on'`; verify React mount reconciles to `data-night-mode="off"`; verify hint is updated to `'off'`.
- Settings change live: user has Night Mode active via auto; user toggles preference to `'off'`; verify attribute flips to `"off"` without page reload.
- Cross-route: from `/prayer-wall` at 23:00 (night active), navigate to `/daily`; verify the Daily Hub does NOT have any night-mode attribute or styling.

### Playwright E2E + visual regression (~2)
- **Hour-boundary scenario:** Login, navigate to `/prayer-wall` at mocked 20:58; verify day theme; advance time to 21:01 via test harness; verify night theme applied without reload; verify Night Watch chip visible.
- **Visual regression (no-FOUC):** Load `/prayer-wall` at 23:00 with empty localStorage; screenshot the FIRST frame after `DOMContentLoaded`; assert dominant background pixel is in night palette range (not day). This catches FOUC if the inline script is broken.

---

## 10. Files

### To CREATE

**Frontend:**
- `frontend/src/hooks/useNightMode.ts` — hook returning `{active, source, userPreference}` per D-Hook-API; polling tick per D-LivePolling
- `frontend/src/hooks/__tests__/useNightMode.test.ts` — unit + integration tests
- `frontend/src/constants/night-mode-copy.ts` — 8 day/night copy pairs per D-CopyPairs; type-safe export
- `frontend/src/constants/__tests__/night-mode-copy.test.ts` — validates pair count + non-empty fields
- `frontend/src/components/prayer-wall/NightWatchChip.tsx` — component per D-NightWatchChip
- `frontend/src/components/prayer-wall/__tests__/NightWatchChip.test.tsx` — component tests
- `frontend/src/lib/night-mode-resolver.ts` — pure functions: `isNightHour()`, `resolveNightModeActive()`. Imported by both `useNightMode.ts` AND the inline `index.html` script (the latter inlines them at build time per Vite's HTML plugin).
- `frontend/src/lib/__tests__/night-mode-resolver.test.ts` — unit tests
- `frontend/tests/e2e/night-mode.spec.ts` — Playwright suite with visual regression baseline

### To MODIFY

**Frontend:**
- `frontend/index.html` — add inline `<script>` block per D-NoFOUC. Position: in `<body>` just before the React bundle script tag. ~15-20 lines of minified JS.
- `frontend/src/pages/PrayerWall.tsx` — wrap root content in `<div data-night-mode={mode}>` (or apply attribute to existing root); import + render `<NightWatchChip />` in header when `active`
- `frontend/src/pages/PrayerWallDashboard.tsx` — if it's a Prayer-Wall surface, apply same wrapping (plan-recon decides)
- `frontend/src/pages/PrayerWallProfile.tsx` — same as Dashboard (plan-recon)
- `frontend/src/index.css` — add new section `[data-night-mode='on'] { ... }` with CSS variable overrides per D-NightPalette. Pattern matches existing `[data-reader-theme='midnight']`.
- `frontend/src/types/settings.ts` — add `nightMode: 'auto' | 'on' | 'off'` to `UserSettings.prayerWall` namespace; export `NightModePreference` type
- `frontend/src/services/settings-storage.ts` — update default settings shape to include `nightMode: 'auto'`
- `frontend/src/pages/Settings.tsx` — add 3-radio Night Mode preference UI in plan-determined section (R10)
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — consume day/night copy variant based on `active`
- `frontend/src/components/prayer-wall/<other components>` — each component using a copy-variant string consumes the appropriate one per D-CopyPairs (plan-recon R9 enumerates)
- `.claude/rules/11-local-storage-keys.md` — document `wr_night_mode_hint` key + allowed values
- `frontend/vite.config.ts` — if needed for HTML plugin configuration to inline night-mode-resolver.ts content into index.html script (plan-recon)

### NOT to modify (explicit non-targets)
- Backend: NO backend changes. Setting persists via existing settings-storage dual-write.
- `index.css`'s `[data-reader-theme='midnight']` block — untouched; Bible Reader theme is separate concern.
- Landing page's "cinematic dark theme" — untouched; that's a different visual layer.
- Daily Hub, Music, other non-Prayer-Wall pages — must NOT receive `data-night-mode` attribute.
- Notification system — NO new notifications for night mode toggles.
- Faith points / streak system — night mode has NO points implications.
- Activity log — NO new activity types.

### To DELETE
None. 6.3 is purely additive.

---

## 11. Acceptance Criteria

**Functional (from master plan):**
- A. Night Mode auto-enables between 9pm and 6am local browser time.
- B. User can override in Settings: 3-state preference (`'auto'` / `'on'` / `'off'`), default `'auto'`.
- C. Active Night Mode applies dimmed accents via CSS variable overrides under `[data-night-mode='on']`.
- D. 6-8 hero/CTA/empty-state/title copy strings swap to night variants per D-CopyPairs.
- E. Night Watch chip visible in PrayerWall page header when mode is active.
- F. NO flash of un-night-modded content on page load (Gate-G-NO-FOUC via inline script in `index.html`).
- G. ~18 tests covering hour boundaries, settings overrides, polling re-evaluation, no-FOUC, scope discipline, accessibility, visual regression.

**Scope:**
- H. `data-night-mode` attribute applied ONLY to Prayer Wall surfaces (Gate-G-SCOPE-PRAYER-WALL-ONLY).
- I. Daily Hub, Music, Settings, Landing page unaffected.

**Live transition:**
- J. User actively on Prayer Wall at the 21:00 or 06:00 boundary sees mode flip within 60s without page reload (Gate-G-LIVE-TRANSITION).

**Accessibility:**
- K. Night palette body text passes WCAG AA contrast.
- L. Night Watch chip is keyboard-accessible (Tab/Enter/Esc).
- M. `prefers-reduced-motion` disables chip's breathing-glow and palette transition animation.
- N. Axe-core passes zero violations at 3 viewport widths in night state.

**Brand voice:**
- O. Night copy variants pass Gate-G-COPY-PAIRS audit (no sad-shaming, no insomnia framing).
- P. Night Watch chip popover content is gentle + descriptive.

**Forward-compatibility:**
- Q. `useNightMode()` returns `{active, source, userPreference}`; 6.4's planned `useWatchMode()` can consume this shape.
- R. `<NightWatchChip />` is reusable as a standalone component.

**Performance:**
- S. Inline `index.html` script <5ms total execution.
- T. Palette transition does NOT cause layout reflow.

**Anti-metrics:**
- U. NO analytics on Night Mode usage (D-NoTracking).
- V. NO toast/notification on mode flip (D-NoNotifications).

---

## 12. Out of Scope

Explicitly NOT in 6.3:

- **Site-wide dark mode** / system `prefers-color-scheme` integration. Future spec if user feedback shows demand.
- **Per-user customization of the time window** ("my night starts at 10pm"). Window is fixed 9pm-6am. Future spec might add.
- **Seasonal adjustment** ("earlier sunset in winter triggers earlier night"). Window is fixed.
- **Geo-based timezone detection** (use user.timezone column). D-TimeSource locks browser-local.
- **Crisis content prioritization during night mode.** That's 6.4 (3am Watch).
- **Mental-health-specific copy or resources.** That's 6.4.
- **Notification suppression at night** ("don't ping me after 9pm"). Different concern; out of scope.
- **Brightness / blue-light filter** beyond the CSS palette swap. Browser-level extensions handle this; we don't.
- **A11Y-only "high contrast night mode"** (different from the design palette). Out of scope; system-level high-contrast modes handle this.
- **Analytics dashboard for Night Mode adoption.** D-NoTracking.
- **"Night Owl" badge or achievement.** Anti-pressure violation.
- **Recommendation to enable Night Mode** ("You're on the Prayer Wall at 11pm — turn on Night Mode?"). Anti-pressure violation.

---

## 13. Tier Rationale

**Why xHigh not High:** Visual design surface is brand-defining; no-FOUC implementation is tricky engineering; direct prerequisite for 6.4 crisis-adjacent surface; multiple curated copy pairs; palette judgment is qualitative.

**Why xHigh not MAX:** No HUMAN-IN-THE-LOOP hard-gate content (Eric pre-approves copy pairs and palette but no per-prompt curation like 6.1's 60 verses). No privacy-architectural surface (vs 6.1's wire-format design). No anti-abuse surface (vs 6.2's server-authoritative timing).

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking xhigh
- plan-from-spec: Opus 4.7 thinking xhigh (especially R6-R12 plan-recon)
- execute: xhigh throughout — the palette implementation, no-FOUC script, and copy integration all warrant deeper thinking
- review: xhigh focus on palette values, copy pairs, no-FOUC correctness, and forward-compat hook API

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 6.3 per /Users/eric.champlin/worship-room/_plans/forums/spec-6-3-brief.md.

Tier: xHigh. Use Opus 4.7 thinking depth xhigh throughout.

Honor all 10 MPDs, 14 decisions, ~34 watch-fors, ~18 tests, and 5 new gates
(Gate-G-NO-FOUC, Gate-G-COPY-PAIRS, Gate-G-A11Y, Gate-G-SCOPE-PRAYER-WALL-ONLY,
Gate-G-LIVE-TRANSITION).

Required plan-time recon (R6-R12):
- R6: read PrayerWall.tsx (~800 lines) end-to-end; pick the DOM target for
  `data-night-mode` attribute (outermost wrapper recommended)
- R7: read frontend/index.html; design inline no-FOUC script (handle localStorage
  exceptions, scope to Prayer Wall route, <5ms execution)
- R8: enumerate existing Prayer Wall day-state CSS variables; propose night
  equivalents (warm muted palette per D-NightPalette directional guidance);
  surface specific hex values for Eric's review
- R9: read PrayerWallHero, composer, empty state, all surfaces with copy that
  needs day/night variants; enumerate the actual count (brief estimates 6-8
  pairs; plan can refine)
- R10: read Settings.tsx; pick section for 3-radio Night Mode preference
- R11: update .claude/rules/11-local-storage-keys.md with wr_night_mode_hint
- R12: read master plan stub 6.4 (lines 5202+); confirm useNightMode() return
  shape supports useWatchMode()'s needs; adjust if necessary

Plan-time divergences from brief: document in a Plan-Time Divergences section
(same pattern as 6.1's plan). Justifiable divergences welcome; surface them.

Do NOT plan for execution while Spec 6.2 OR 6.2b is running. The plan can be
authored at any time. Execute waits for 6.2 to fully merge (6.2b can run
before or after 6.3; both are frontend; do not run concurrently).

The 8 day/night copy pairs in Section 7 D-CopyPairs are BRIEF-LEVEL CONTENT.
Generate the plan referencing them verbatim. CC during execute may light-edit
(within 2 words per pair) for layout fit but MUST NOT replace wholesale.

The night palette CSS variable values are PLAN-RECON-AUTHORED (R8) with Eric's
approval before execute. Plan surfaces proposed hex values; Eric approves or
edits; execute applies the approved values.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**

1. Review code diff section by section.
2. Open the copy pairs file (`night-mode-copy.ts`); verify all 8 pairs match the brief's approved set within 2 words per variant.
3. Open `index.css`; verify the new `[data-night-mode='on']` block uses warm-muted palette values that match Eric-approved hex codes (NOT cool/gloomy).
4. Open Prayer Wall at 2pm; verify day theme; toggle Night Mode to `'on'` in Settings; verify the surface flips to night theme without reload; verify Night Watch chip appears with "(always on)" subtitle.
5. Toggle Night Mode back to `'auto'`; verify reverts to day theme at 2pm.
6. (At actual 9pm if possible, or via test harness) verify auto-flip happens within 60s of the boundary.
7. Navigate from `/prayer-wall` (in night mode) to `/daily`; verify Daily Hub renders in normal day theme (Gate-G-SCOPE-PRAYER-WALL-ONLY).
8. On real iPhone or fresh browser: clear localStorage; visit `/prayer-wall` at 11pm; record screen via dev tools; verify FIRST frame shows night theme (no FOUC).
9. Read all 8 night copy variants aloud; verify they pass the gentleness test (no sad-shaming, no insomnia language).
10. Enable `prefers-reduced-motion` in OS; verify palette transition is instant; verify chip's breathing-glow is disabled.
11. Run axe-core scan in night state at desktop + tablet + mobile widths; verify zero violations.
12. Tap Night Watch chip; verify popover opens with explainer text + Settings link; verify Esc closes popover; verify focus returns to chip.
13. Visual judgment: open at 2am. Does the night palette feel reverent? Calm? Or does it feel sad/clinical/depressing? This is the xHigh-tier brand-voice call only Eric can make.

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: 6.3 flips ⬜ → ✅.

---

## 16. Prerequisites Confirmed

- **6.2 (Quick Lift):** must merge first (per master plan stub)
- **6.1 (Prayer Receipt):** ✅ (shipped or near-shipped; provides `UserSettings.prayerWall` namespace)
- **Existing PrayerWall + theming infrastructure:** ✅ verified via R1, R2
- **Existing Settings type + storage + hook:** ✅ verified via R3, R4
- **Existing `[data-reader-theme='midnight']` pattern in index.css:** ✅ verified via R2 — 6.3 follows this pattern

**Execution sequencing:**
Safest order: 6.1 → 1.5g → 6.2 → 6.2b → 6.3 OR 6.1 → 6.2 → 6.2b → 6.3 → 1.5g. 6.3 cannot execute concurrently with 6.2b (shared frontend surface + cognitive load).

After 6.2 merges to master:
- Rebase/merge `forums-wave-continued` onto master
- Eric reviews + approves the 8 copy pairs in Section 7 D-CopyPairs (edits welcome)
- Run `/spec-forums spec-6-3-brief.md` → generates spec file
- Run `/plan-forums spec-6-3.md` → generates plan file (with R6-R12 plan-recon; surfaces proposed palette hex values for Eric's review)
- Eric reviews plan + approves palette values
- Run `/execute-plan-forums YYYY-MM-DD-spec-6-3.md` → executes
- Eric reviews code + manual verification (especially the visual judgment in step 13)
- Eric commits + pushes + MRs + merges

---

## End of Brief
