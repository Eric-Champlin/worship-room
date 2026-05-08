# Implementation Plan: Spec 4B — Dashboard Data Widgets

**Spec:** `_specs/spec-4b-dashboard-data-widgets.md`
**Date:** 2026-05-04
**Branch:** forums-wave-continued (DO NOT branch, commit, push, or run any branch-modifying git command — user manages git)
**Design System Reference:** `_plans/recon/design-system.md` (not loaded — file not present in `_plans/recon/`)
**Recon Report:** `_plans/recon/dashboard-2026-05-04.md` (loaded)
**Direction Doc:** `_plans/direction/dashboard-2026-05-04.md` (loaded — Decision 11 Tonal Icon Pattern is the load-bearing system addition this spec ships)
**Master Spec Plan:** N/A — this is a sub-spec of the three-spec dashboard migration (4A foundation already shipped, 4C social/recap deferred to its own spec)

---

## Affected Frontend Routes

- `/` — primary surface (Dashboard, logged-in users). Every change in this spec lands here.
- `/daily?tab=devotional` — regression surface (FrostedCard `accent` variant + BackgroundCanvas not modified, but the violet-glow textarea pattern applied to GratitudeWidget must visually match Pray/Journal — verify side-by-side).
- `/daily?tab=pray` — regression + visual reference for the GratitudeWidget input chrome migration (Change 9). The `PrayerInput.tsx` textarea is the canonical violet-glow source.
- `/daily?tab=journal` — regression + visual reference (`JournalInput.tsx` shares the same canonical textarea glow class string).
- `/daily?tab=meditate` — regression only (no shared primitives changed).
- `/bible` (BibleLanding) — regression only (consumes BackgroundCanvas + FrostedCard already; verify nothing changes).
- `/bible/plans` — regression + alignment check for ReadingPlanWidget discovery mini-cards (Change 6) which use a flavor of the Tonal Icon Pattern from `/bible/plans` already.

---

## Architecture Context

### Source files in scope (11 widget files + 1 grid orchestrator)

The Tonal Icon Pattern's load-bearing insight from a code-architecture standpoint: header icons for ~10 of the 11 widgets are **passed in as a `ReactNode` prop from `DashboardWidgetGrid.tsx` to `DashboardCard.tsx`** (DashboardCard then wraps them in `<span className="text-white/60">`, but Lucide icons rendering with their own `text-*` Tailwind class on the `<svg>` override the parent's `currentColor` — verified by GratitudeWidget already passing `<Heart className="h-5 w-5 text-pink-400" />` and rendering pink). So:

- **Header tonal colors live in `DashboardWidgetGrid.tsx`** (Step 3 of this plan). Adding `text-pink-300`, `text-sky-300`, `text-violet-300`, `text-emerald-300`, `text-amber-100`, `text-amber-300`, `text-yellow-300` to the `icon={...}` JSX in the relevant `case` blocks is the single touch-point that lights up the pattern across the row. NO change to `DashboardCard.tsx` itself.
- **Per-widget body changes** (badge pills, ring stroke, item icons, tooltip, input chrome, NumberedHeart, Saved-state Check, etc.) live inside the individual widget files (Steps 4-13).

### Files this spec modifies

| File | Change number(s) | Touched for |
|------|------------------|-------------|
| `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` | Header tonal colors for 10 widgets | Steps 3 |
| `frontend/src/components/dashboard/StreakCard.tsx` | 1 (badge pills, AnimatedCounter typography review, longest tone, links verify) | Step 4 |
| `frontend/src/components/dashboard/MoodChart.tsx` | 2 (MoodTooltip restyle, axis tick decision) | Step 5 |
| `frontend/src/components/dashboard/ActivityChecklist.tsx` | 3 (ring stroke, special icons, multiplier preview, item rows) | Step 6 |
| `frontend/src/components/dashboard/TodaysDevotionalCard.tsx` | 4 (category pill chrome, Check icon to mint, body tone) | Step 7 |
| `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` | 5 (Share button as ghost Button, italic preserved) | Step 8 |
| `frontend/src/components/dashboard/ReadingPlanWidget.tsx` | 6 (4-state typography review, mini-cards verified, Check to mint) | Step 9 |
| `frontend/src/components/dashboard/PrayerListWidget.tsx` | 7 (typography review, body Heart family) | Step 10 |
| `frontend/src/components/dashboard/RecentHighlightsWidget.tsx` | 8 (empty BookOpen tonal, StickyNote tonal, dots preserved) | Step 11 |
| `frontend/src/components/dashboard/GratitudeWidget.tsx` | 9 (violet-glow input chrome, NumberedHeart alignment, Saved-state Check to mint, Edit as ghost Button) | Step 12 |
| `frontend/src/components/dashboard/ChallengeWidget.tsx` | 10 (themeColor preserved, day-count typography, reminder button as Button variant) | Step 13 |
| `frontend/src/components/dashboard/BadgeGrid.tsx` | 11 (overlay backdrop alignment, close as ghost Button, earned/unearned contrast review) | Step 14 |

### Test files likely needing class-string updates

Per recon Part 8 and the spec § Non-Functional Requirements:

- `StreakCard.test.tsx` — verify any assertion on the inline `style.backgroundColor: 'rgba(139,92,246,0.2)'` on badge pills; migrate to assert `bg-violet-500/20`.
- `ActivityChecklist.test.tsx` and `__tests__/dashboard-widgets-integration.test.tsx` — if they assert on `text-success` on item rows, migrate to `text-emerald-300` (or whichever shade is locked at execution).
- `GratitudeWidget.test.tsx` — class-string assertions on input chrome (`border-white/10`, `bg-white/5`, `focus:border-primary`) — migrate to violet-glow tokens.
- `MoodChart.test.tsx` — likely no class assertions; verify.
- `progress-bar-glow.test.tsx` (recon line 567) — preserved verbatim per spec; verify still passes.
- `entrance-animation.test.tsx` and `transition-animation.test.tsx` — preserved (no entrance/transition classes change).
- `BadgeGrid.test.tsx` — overlay backdrop chrome assertions if any.

**Behavioral tests (must continue passing without modification):** click handlers (badge pill open BadgeGrid, recent badge buttons, repair flow, save gratitude, edit gratitude, mood chart hover, Recharts tooltip activation, ChallengeWidget reminder toggle, BadgeGrid open/close + focus trap, reading plan navigation), conditional rendering branches (active/all-completed/recently-completed/discovery in ReadingPlanWidget, active/season-open/no-season/fallback in ChallengeWidget, empty/filled in PrayerListWidget + RecentHighlightsWidget + GratitudeWidget input/saved/editing), completion tracking, faith point recording.

### Test patterns to match

- React Testing Library + Vitest, jsdom environment
- Provider wrapping per existing tests: `ToastProvider` for GratitudeWidget (uses `useToast`), `MemoryRouter` for any widget with `<Link>`
- Mood/activity/streak/badge test fixtures live in `frontend/src/test/__fixtures__/` (verify path during execution)
- Reactive store consumer pattern: RecentHighlightsWidget reads from `wr_bible_highlights` (highlightStore) and `bible:notes` (noteStore) via `bible-annotations-storage` service. **Existing subscription wiring is preserved verbatim.** This spec does NOT introduce new reactive store consumers.

### Auth gating patterns

This spec adds **zero new auth gates**. All 11 widgets only render when `isAuthenticated === true` (Dashboard route swap renders `<Home />` otherwise). Existing per-widget auth-gated actions are inherited from 4A and 2.75; no `useAuth` / `useAuthModal` hook touches in this spec. See "Auth Gating Checklist" below for the verification matrix.

### FrostedCard primitive (consumed, not modified)

`frontend/src/components/homepage/FrostedCard.tsx` (already reviewed):

- **`variant="default"`:** `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` — the chrome of every widget after 4A.
- **`variant="accent"`:** violet-tinted, used by GettingStartedCard (post-4A patch — preserved).
- **`variant="subdued"`:** softer, used by CustomizePanel.
- **Hover:** `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5` (already wired by `DashboardCard.tsx`).
- **Eyebrow:** Tier 1 accent dot (violet) vs Tier 2 inline label (white/50) — NOT used in this spec's scope.

### Cross-spec dependencies / preservations from 4A

Per the spec Pre-execution recon item 1 — verify before any code change:

- `Dashboard.tsx` wraps `<main>` in `<BackgroundCanvas>` ✓ (4A Step 2)
- `DashboardCard.tsx` renders as `<FrostedCard variant="default">` ✓ (4A Step 3, verified above)
- `GrowthGarden.tsx` renders as a single responsive SVG ✓ (4A Step 10)
- `GettingStartedCard.tsx` renders as `<FrostedCard variant="accent">` ✓ (post-4A patch — verified at line 108)
- `bg-primary` solid → `<Button variant="subtle">` migration shipped (4A Step 7)
- `text-primary` ghost links → `text-white/80` migration shipped (4A Step 8 — 12 instances migrated)

If any of the above are NOT verified during the recon step (Step 1), STOP and reconcile before proceeding.

### Direction-doc decisions honored (preservations + locked exceptions)

- **Decision 7 — Lora italic for scripture only.** VerseOfTheDayCard verse text stays `font-serif italic` (Step 8). NO migration.
- **Decision 10 — MoodChart ghosted empty state preserved.** NOT migrated to `FeatureEmptyState` (Step 5).
- **Decision 11 — Tonal Icon Pattern, system-wide debut.** This is the load-bearing change in the spec.
- **StreakCard amber "Restore Streak" button preserved** (Step 4) — warm-emergency cue intentionally conflicting with violet system.
- **MoodChart morning line stroke `#8B5CF6` preserved** (Step 5) — data viz, not categorical icon.
- **StreakCard direction-aware FP progress glow preserved** (Step 4) — explicit UX touch.
- **ChallengeWidget themeColor accent preserved** (Step 13) — challenge-config-driven brand color.
- **RecentHighlightsWidget user-selected highlight color dots preserved** (Step 11) — meaningful user data.
- **GrowthGarden palette preserved** (Decision 2 — out of scope entirely).

---

## Auth Gating Checklist

Every action in the spec that requires login is verified to be gated. This spec adds zero new gates; all are inherited.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Visit `/` | Dashboard renders only when `isAuthenticated` | (no change) | `RootRoute` swap → `<Home />` when logged out |
| Click streak repair "Restore Streak" | StreakCard only renders for logged-in users | Step 4 (preservation) | Inherited from `RootRoute` |
| Click any of the 3 recent-badge pills | StreakCard only renders for logged-in users | Step 4 (badge pill class migration) | Inherited |
| Click "View all badges" | StreakCard only | Step 4 | Inherited |
| Hover MoodChart data point | MoodChart only renders for logged-in users | Step 5 (tooltip restyle) | Inherited |
| Click "Check in now" link in MoodChart empty state | MoodChart only | Step 5 (preservation) | Inherited |
| Toggle ActivityChecklist item | ActivityChecklist only | Step 6 (visual changes) | Inherited |
| Click "Read today's devotional" | TodaysDevotionalCard only | Step 7 | Inherited |
| Click "Meditate on this verse" | VerseOfTheDayCard only | Step 8 | Inherited |
| Click Share on VerseOfTheDayCard | VerseOfTheDayCard only | Step 8 (ghost Button) | Inherited |
| Click Continue/Browse plans in ReadingPlanWidget | Widget only | Step 9 | Inherited |
| Click Add Prayer in PrayerListWidget | Widget only | Step 10 | Inherited (subtle Button preserved from 4A) |
| Click highlight item in RecentHighlightsWidget | Widget only | Step 11 | Inherited |
| Type into GratitudeWidget input | Widget only | Step 12 (input chrome migration) | Inherited |
| Click Save in GratitudeWidget | Widget only | Step 12 | Inherited (subtle Button preserved from 4A) |
| Click Edit in GratitudeWidget | Widget only | Step 12 (Edit as ghost Button) | Inherited |
| Click Continue/Join in ChallengeWidget | Widget only | Step 13 | Inherited |
| Toggle reminder in ChallengeWidget no-season state | Widget only | Step 13 (Button variant decision) | Inherited |
| Open BadgeGrid overlay | Triggered from StreakCard only | Step 14 | Inherited; focus trap added if missing |

This plan is complete with regard to the spec's Auth Gating section. No new gates exist to wire.

---

## Design System Values (for UI steps)

Locked tonal token assignments — the executor picks the exact shade per widget during execution within the documented family and locks the choice in the Execution Log.

| Component / Element | Property | Value (default; family options in parens) | Source |
|---------------------|----------|-------------------------------------------|--------|
| StreakCard header Flame (in `DashboardWidgetGrid.tsx`) | text color | **PRESERVE EXISTING** — body Flame is amber when `currentStreak > 0`, `text-white/30` when `currentStreak === 0`. Header Flame in DashboardWidgetGrid currently has no tonal class — ADD `text-amber-400` to match the body active state. | Direction doc Decision 11 (Streak amber assignment) |
| MoodChart header icon (`TrendingUp`) | text color | `text-violet-300` (lavender — introspection) | Decision 11 + spec Change 2 |
| ActivityChecklist header icon (`CheckCircle2`) | text color | `text-emerald-300` (mint default; fallback `text-teal-300` if visually pale) | Decision 11 + spec Change 3 |
| TodaysDevotionalCard header icon (`BookOpen`) | text color | `text-sky-300` (muted blue default; fallback `text-blue-300`) | Decision 11 + spec Change 4 |
| VerseOfTheDayCard header icon (`BookOpen`) | text color | `text-amber-100` (warm cream/parchment default; fallback `text-yellow-200`) | Decision 11 + spec Change 5 |
| ReadingPlanWidget header icon (`BookOpen`) | text color | `text-sky-300` (matches Devotional family) | Decision 11 + spec Change 6 |
| PrayerListWidget header icon (`Heart`) | text color | `text-pink-300` (pink-violet, slightly cooler than gratitude rose) | Decision 11 + spec Change 7 |
| RecentHighlightsWidget header icon (`Highlighter`) | text color | `text-yellow-300` (warm yellow default; fallback `text-amber-300`) | Decision 11 + spec Change 8 |
| GratitudeWidget header icon (`Heart`) | text color | `text-pink-300` or `text-rose-300` — currently `text-pink-400` (saturated). MIGRATE to `text-pink-300` (default — pastel match) or `text-rose-300` (judgment call at execution based on reading against the FrostedCard surface). | Decision 11 + spec Change 9 |
| ChallengeWidget header icon (`Target` — current; `Flame` per Decision 11 — but glyph swap out of scope) | text color | `text-amber-300` (amber, slightly distinct from StreakCard's `text-amber-400` to avoid feeling identical) | Decision 11 + spec Change 10. **Glyph stays `Target`** (current) — per spec Pre-execution recon item 8, icon glyph swaps are out of scope. |
| StreakCard body badge pills (3 inline) | background | Migrate `style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}` → `className="... bg-violet-500/20 hover:bg-violet-500/30 transition-colors"` | spec Change 1 |
| StreakCard body Flame (line 204 active / line 264 inactive) | text color | PRESERVE: `text-amber-400` active, `text-white/30` inactive | spec Change 1 |
| StreakCard "Longest: N days" (lines 220, 274) | text color | Currently `text-white/50` — verify; if drifted, migrate to `text-white/60` per spec | spec Change 1 |
| StreakCard "View all badges" link (line 373) | text color | PRESERVE: `text-white/80 hover:text-white` (4A migration) | spec Change 1 verify |
| StreakCard FP progress bar inline glow (lines 320-326) | boxShadow | PRESERVE verbatim (direction-aware: violet `rgba(139,92,246,0.4)` on increase, amber `rgba(217,119,6,0.3)` on decrease) | Locked exception |
| StreakCard "Restore Streak" amber button (line 232) | className | PRESERVE verbatim (warm-emergency cue) | Locked exception |
| MoodTooltip body | className | Currently `border border-white/15 bg-hero-mid px-3 py-2 text-sm text-white shadow-lg`. MIGRATE to: `rounded-lg border border-white/[0.12] bg-white/[0.07] backdrop-blur-md px-3 py-2 text-sm text-white shadow-lg` (FrostedCard tooltip alignment) | spec Change 2 |
| MoodChart axis ticks (lines 171, 269, 277) | tick fill | PRESERVE: `rgba(255, 255, 255, 0.5)` — Recharts `tick` prop accepts a style object, NOT Tailwind class strings cleanly. Document the constraint inline. | spec Change 2 |
| MoodChart morning line stroke (line 288) | stroke | PRESERVE: `#8B5CF6` | Locked exception |
| MoodChart connecting lines (line 113) | stroke | PRESERVE: `rgba(255,255,255,0.15)` | Locked exception |
| MoodChart "Check in now" link (line 200) | text color | PRESERVE: `text-white/80 hover:text-white` (4A migration) | spec Change 2 verify |
| ActivityChecklist progress ring stroke (line 150) | stroke | Try `stroke-violet-600` — Tailwind v3 supports stroke-* utilities. **If `stroke-violet-600` does NOT compile or render correctly**, FALLBACK to keeping `stroke="#6D28D9"` and document constraint inline. Either preserves the violet visual. | spec Change 3 |
| ActivityChecklist completed item check icon (line 185, 189) | text color | Currently `text-success` (= `#27AE60`, saturated green). MIGRATE to `text-emerald-300` (mint pastel) — `text-success` does not match the Tonal Icon Pattern's "muted/pastel" requirement and reads as too saturated against the FrostedCard surface. | spec Change 3 |
| ActivityChecklist `+N pts` text on completed rows (line 214) | text color | Currently `text-success` — MIGRATE to `text-emerald-300` to match completion icon family. (Or to `text-emerald-400` if 300 reads too pale; lock at execution.) | spec Change 3 |
| ActivityChecklist BookOpen for readingPlan item (line 182) | text color | When completed: same migration to `text-emerald-300`. When NOT completed: change `text-white/20` → `text-sky-300` (muted blue — matches Devotional family per spec Change 3). | spec Change 3 |
| ActivityChecklist Moon for reflection item (line 186) | text color | Currently `text-indigo-300/50`. MIGRATE to `text-violet-300` (lavender — matches end-of-day / introspection family). | spec Change 3 |
| ActivityChecklist multiplier preview (line 240) | text color | Currently `text-amber-300` (celebration) or `text-white/60` (utility). VERIFY: utility branch is `text-white/60` ✓. NO change needed — already aligned. Spec calls for "muted utility text tone" which matches. | spec Change 3 verify |
| TodaysDevotionalCard category pill (line 36) | className | Currently `rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60`. MIGRATE to `inline-block rounded-full bg-white/[0.05] px-2.5 py-0.5 text-xs text-white/70` (system-aligned chrome with slightly more readable text). | spec Change 4 |
| TodaysDevotionalCard Check icon (line 28) | text color | Currently `text-success`. MIGRATE to `text-emerald-300` (mint completion signal). | spec Change 4 |
| TodaysDevotionalCard reflection preview (line 40) | text color | Currently `text-white/60`. MIGRATE to `text-white/80` (body content alignment per spec). | spec Change 4 |
| TodaysDevotionalCard "Read again" link (line 47) | text color | Currently `text-white/50 hover:text-white/70` (read state). PRESERVE — this is a deliberate muted state for already-completed action. | spec Change 4 verify |
| TodaysDevotionalCard "Read today's devotional" link (line 54) | text color | PRESERVE: `text-white/80 hover:text-white` (4A migration) | spec Change 4 verify |
| VerseOfTheDayCard verse text (line 14) | className | PRESERVE: `font-serif italic text-lg leading-relaxed text-white` | Decision 7 |
| VerseOfTheDayCard reference (line 17) | text color | PRESERVE: `text-white/50` | spec Change 5 verify |
| VerseOfTheDayCard "Meditate on this verse" link (line 20) | text color | PRESERVE: `text-white/80 hover:text-white` (4A migration) | spec Change 5 verify |
| VerseOfTheDayCard Share button (line 26-35) | className | Currently a custom `<button>` with `text-white/50`. MIGRATE to `<Button variant="ghost" size="sm">` while preserving every existing aria attribute (`aria-label`, `aria-haspopup="dialog"`, `aria-expanded`), the Share2 icon, and the click handler (`setSharePanelOpen((prev) => !prev)`). | spec Change 5 |
| ReadingPlanWidget active progress bar fill (line 144) | className | PRESERVE: `bg-primary` violet fill on `bg-white/10` track | spec Change 6 verify |
| ReadingPlanWidget Check icons (lines 174, 190) | text color | Currently `text-success`. MIGRATE to `text-emerald-300` (mint completion signal — aligns with TodaysDevotionalCard / GratitudeWidget). | spec Change 6 |
| ReadingPlanWidget all-state body text (lines 178, 213) | text color | Currently `text-white/50`. MIGRATE descriptive body to `text-white/80` per spec body-content alignment; keep `text-white/50` for the small explanatory text "Reading plans walk you through Scripture day by day". Lock at execution. | spec Change 6 |
| ReadingPlanWidget mini-card chrome (lines 222-230) | className | Currently `rounded-lg bg-white/5 hover:bg-white/10 p-3`. PRESERVE — existing flavor of Tonal Icon Pattern from `/bible/plans`. The `coverEmoji` is the categorical signal. | spec Change 6 verify |
| ReadingPlanWidget continue/browse links (lines 155, 200, 236) | text color | PRESERVE: `text-white/80 hover:text-white` (4A migration) | spec Change 6 verify |
| PrayerListWidget body text "X active prayer(s)" (line 38) | text color | Currently `text-white/60` — VERIFY. Spec calls for muted supporting text. PRESERVE if `text-white/60`; migrate to `text-white/60` if drifted. | spec Change 7 |
| PrayerListWidget most recent title (line 42) | text color | PRESERVE: `text-white` (prominent) | spec Change 7 verify |
| PrayerListWidget answered-this-month text (line 46) | text color | Currently `text-emerald-400`. PRESERVE — already in mint family for the answered/completion semantic. | spec Change 7 verify |
| PrayerListWidget Add Prayer button | variant | PRESERVE: `<Button variant="subtle" size="md">` (4A migration) | spec Change 7 verify |
| PrayerListWidget "View all" link (line 51) | text color | PRESERVE: `text-white/80 hover:text-white` (4A migration) | spec Change 7 verify |
| RecentHighlightsWidget empty BookOpen icon (line 12) | text color | Currently `text-white/30`. MIGRATE to `text-yellow-300` (warm-yellow tonal — matches header icon family per spec Change 8). | spec Change 8 |
| RecentHighlightsWidget StickyNote icon (line 43) | text color | Currently `text-white/40`. MIGRATE to `text-yellow-300` (warm-yellow — matches highlight family) — DEFAULT. Alternative: `text-emerald-300` (mint — personal annotation). LOCK at execution; document inline. **Default to warm-yellow** per spec "or warm yellow" wording. | spec Change 8 |
| RecentHighlightsWidget user-selected color dots (line 38) | style | PRESERVE: `style={{ backgroundColor: item.color }}` — meaningful user data | Locked exception |
| RecentHighlightsWidget empty + "Open Bible" / "See all" links | text color | PRESERVE: `text-white/80 hover:text-white` (4A migrations) | spec Change 8 verify |
| GratitudeWidget header Heart in DashboardWidgetGrid line 211 | text color | Currently `text-pink-400` (saturated). MIGRATE to `text-pink-300` (pastel match per Tonal Icon Pattern). | spec Change 9 |
| GratitudeWidget NumberedHeart fill (line 42) | className | Currently `fill-pink-400/20 text-pink-400`. MIGRATE to `fill-pink-300/20 text-pink-300` (alignment with header tonal). | spec Change 9 |
| GratitudeWidget input chrome (line 161) | className | Currently `h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`. **MIGRATE to the canonical violet-glow textarea pattern from PrayerInput.tsx:145 / JournalInput.tsx:283 (verified live class string):** `h-11 w-full rounded-lg border border-violet-400/30 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30`. PRESERVE `h-11`, `w-full`, `px-3`, `text-sm` for input-row height + horizontal padding. | spec Change 9 (load-bearing visual change) |
| GratitudeWidget Saved-state Check icons (line 121) | text color | Currently `text-success`. MIGRATE to `text-emerald-300` (mint). | spec Change 9 |
| GratitudeWidget Edit button (line 129-134) | element type | Currently a plain `<button>`. MIGRATE to `<Button variant="ghost" size="sm">` while preserving the click handler (`onClick={handleEdit}`), label "Edit", and `min-h-[44px]` tap target. | spec Change 9 |
| GratitudeWidget Save button | variant | PRESERVE: `<Button variant="subtle" size="md">` (4A migration) | spec Change 9 verify |
| GratitudeWidget CrisisBanner | component | PRESERVE — out of scope (visual + keyword logic verbatim) | spec Change 9 locked |
| GratitudeWidget first-time italic intro "Count three blessings from today" (line 145) | className | Currently `text-sm italic text-white/60`. The italic here is short utility intro, not body prose. PRESERVE — Decision 7 prose-italic deprecation applies to long-form prose (StreakCard repair message, AnniversaryCard closing) — short UI helper text is acceptable. Document decision inline. | spec Change 9 judgment |
| ChallengeWidget body Flame for streak (line 78) | style | PRESERVE: `style={{ color: challenge.themeColor }}` — themeColor preserved per locked exception | spec Change 10 |
| ChallengeWidget themeColor accent dot (line 67) | style | PRESERVE: `style={{ backgroundColor: challenge.themeColor }}` | Locked exception |
| ChallengeWidget Continue/Join links (lines 86, 117) | style | PRESERVE: `style={{ color: challenge.themeColor }}` | Locked exception |
| ChallengeWidget no-season reminder button (line 143-154) | element type | Currently a plain `<button>` with conditional border/text classes. MIGRATE to `<Button variant="ghost" size="sm">` (default judgment — toggle is low-stakes preference). Use conditional class overlay or `aria-pressed` styling for the "Reminder set" state. Lock at execution; document inline. | spec Change 10 |
| ChallengeWidget day-count typography (lines 58-60) | className | Currently `text-xs font-semibold text-white` (Day N) + `text-[10px] text-white/50` (of N). PRESERVE — already aligned with overall card hierarchy. | spec Change 10 verify |
| BadgeGrid overlay outer chrome (line 190) | className | Currently `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6`. **MIGRATE to FrostedCard subdued-tier alignment:** `rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 backdrop-blur-sm sm:p-6`. NO migration to `<FrostedCard>` component itself (BadgeGrid renders inside StreakCard which is already inside DashboardCard/FrostedCard — wrapping in another FrostedCard would double the chrome). Class-level alignment only. | spec Change 11 |
| BadgeGrid section heading typography (line 215) | className | Currently `text-xs font-semibold uppercase tracking-wider text-white/50`. PRESERVE — already aligned with the system's inline section-label pattern. | spec Change 11 verify |
| BadgeGrid earned badge cell (line 138-146) | className | PRESERVE: existing `config.bgColor` + `boxShadow` glow per badge config. The earned visual already has soft warmth via the per-badge `glowColor`. NO change needed beyond inheriting the new chrome. | spec Change 11 verify |
| BadgeGrid unearned badge cell IconComponent (line 151) | text color | Currently `text-white/40`. PRESERVE — within "muted contrast" range; spec wording "muted enough to NOT compete with earned" matches `text-white/40` ✓. | spec Change 11 verify |
| BadgeGrid unearned Lock overlay (line 157) | text color | Currently `text-white/40`. **MIGRATE to `text-white/20`** per spec ("`text-white/20` for the lock icon") — quieter "available, not yet" cue. | spec Change 11 |
| BadgeGrid Close button (line 199-208) | element type | Currently a plain `<button>` with custom classes. MIGRATE to `<Button variant="ghost" size="sm">` while preserving the X icon, `aria-label="Close badge collection"`, and the `onClick={onClose}` handler. The 44×44 mobile / 32×32 desktop sizing handled by Button variant defaults — verify size is preserved. | spec Change 11 |

**No Design System Reference computed-CSS file exists** at `_plans/recon/design-system.md`. All values above sourced from: (a) the direction doc Decision 11 token families, (b) the spec's per-widget application table, (c) live class strings read from PrayerInput.tsx + JournalInput.tsx for the violet-glow pattern, (d) FrostedCard.tsx for the chrome tokens, (e) `09-design-system.md` § "Textarea Glow Pattern" + "Frosted Glass Cards" for the canonical tokens. Lighthouse scoring + visual rendering verification is deferred to Step 15 (`/verify-with-playwright`).

---

## Design System Reminder

`/execute-plan` displays this verbatim before each UI step:

- The Tonal Icon Pattern (Decision 11) is this spec's load-bearing change. Color signals function (rose=gratitude, blue=scripture, mint=completion, lavender=introspection, amber=warmth/effort, yellow=highlight). Card chrome stays violet/glass; ONLY icons carry tonal color. Tonal colors are muted/pastel (`-300` typically), never fully saturated. Do NOT introduce tonal-colored TEXT — only icons.
- Header tonal colors live in `DashboardWidgetGrid.tsx` (the icon prop passed to DashboardCard). The `text-white/60` wrapper in DashboardCard.tsx does NOT override icon colors set on the SVG itself — verified by current GratitudeWidget passing `<Heart className="text-pink-400">`.
- The violet-glow textarea pattern lives in PrayerInput.tsx:145 and JournalInput.tsx:283. Read it during execution and copy verbatim. Class string: `border border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`.
- DO NOT use `animate-glow-pulse` (deprecated) or cyan border (deprecated). DO NOT migrate the textarea to white-glow shadow either — Daily Hub Round 4 / DailyHub 1B replaced both with the violet-glow pattern.
- DO NOT swap icon glyphs. Per spec Pre-execution recon item 8, icon glyph swaps are out of scope. Apply tonal color to whatever icon is currently in the file (e.g., RecentHighlightsWidget currently uses `Highlighter` per `DashboardWidgetGrid.tsx:197` — apply `text-yellow-300` to `Highlighter`, do NOT swap to `Bookmark` or `StickyNote`).
- DO NOT use `bg-primary` solid buttons (deprecated — 4A migrated all to subtle Button).
- DO NOT use `text-primary` ghost links (deprecated — 4A migrated all to `text-white/80`).
- DO NOT use Caveat font on headings (deprecated — out of scope here, but flagged).
- DO NOT add per-section `GlowBackground` or `BackgroundSquiggle` to dashboard widgets — Dashboard uses BackgroundCanvas at the page root (4A).
- StreakCard "Restore Streak" amber button is a **deliberate** warm-emergency cue that conflicts with the violet system. DO NOT migrate to subtle Button.
- StreakCard FP progress bar inline `boxShadow` glow is direction-aware (violet on increase, amber on decrease). DO NOT remove or replace.
- MoodChart morning line stroke `#8B5CF6` is data visualization, not categorical iconography. Tonal Icon Pattern explicitly does NOT apply to chart strokes.
- VerseOfTheDayCard verse text `font-serif italic` is the canonical Lora italic case (Decision 7 — scripture). DO NOT migrate to non-italic.
- MoodChart ghosted-chart empty state (Decision 10) is preserved verbatim. DO NOT replace with `FeatureEmptyState`.
- ReadingPlanWidget discovery mini-card colored emojis are the existing flavor of the Tonal Icon Pattern from `/bible/plans`. PRESERVE.
- RecentHighlightsWidget user-selected highlight color dots are meaningful user data, NOT categorical chrome. PRESERVE inline `style={{ backgroundColor: item.color }}`.
- ChallengeWidget themeColor accents are challenge-config-driven brand colors. PRESERVE.
- All animation durations and easings come from `frontend/src/constants/animation.ts`. DO NOT hardcode `200ms` or `cubic-bezier(...)` strings. None are introduced in this spec.
- All clickable affordances must have 44×44 minimum tap targets and visible focus rings. The migrations to `<Button variant="ghost" size="sm">` and `<Button variant="ghost">` inherit the canonical focus ring + `min-h-[44px]` from the Button component — verify during execution by inspecting the rendered DOM.
- Inline-row layouts (badge pill row in StreakCard, item icon + label + points in ActivityChecklist, NumberedHeart + input in GratitudeWidget): document expected y-coordinate alignment so `/verify-with-playwright` can compare `boundingBox().y` between elements.
- `text-success` (= `#27AE60`) is too saturated for the Tonal Icon Pattern's "muted/pastel" requirement. MIGRATE to `text-emerald-300` for completion signals (Activity item rows, Devotional Check, ReadingPlan Check, GratitudeWidget Saved-state Check).
- Reactive store discipline: RecentHighlightsWidget consumes `wr_bible_highlights` and `bible:notes` reactive stores via the `bible-annotations-storage` service. The current `getRecentBibleAnnotations(3)` call runs on every render (no `useMemo`). DO NOT introduce `useState` snapshot without subscription (BB-45 anti-pattern). PRESERVE existing call pattern verbatim.

---

## Shared Data Models (from Master Plan)

N/A for this spec — it is a visual migration, NOT a data-model change. No new TypeScript interfaces, no localStorage key changes, no new types. All existing data models documented in `types/dashboard.ts`, `types/bible-personal.ts`, and `types/personal-prayer.ts` remain unchanged.

**localStorage keys this spec touches:** none for write. The widgets read existing keys per recon Part 6:

| Key | Read/Write | Description (no spec changes) |
|-----|-----------|-------------------------------|
| `wr_streak`, `wr_streak_repairs`, `wr_badges`, `wr_faith_points` | Read | StreakCard (visual changes only) |
| `wr_mood_entries` | Read | MoodChart (visual changes only) |
| `wr_daily_activities`, `wr_local_visits` | Read | ActivityChecklist (visual changes only) |
| `wr_devotional_reads` | Read | TodaysDevotionalCard (visual changes only) |
| `wr_reading_plan_progress`, `wr_custom_plans` | Read | ReadingPlanWidget (visual changes only) |
| `wr_prayer_list` | Read | PrayerListWidget (visual changes only) |
| `wr_bible_highlights`, `bible:notes` | Read (reactive store via bible-annotations-storage) | RecentHighlightsWidget (visual changes only) |
| `wr_gratitude_entries` | Read/Write | GratitudeWidget (visual changes only — Save handler unchanged) |
| `wr_challenge_progress`, `wr_challenge_reminders` | Read/Write | ChallengeWidget (visual changes only — toggleReminder unchanged) |

No new localStorage keys. No key shape changes. No key migrations.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | DashboardWidgetGrid renders single-column. All 11 widgets stack vertically inside FrostedCard chrome. Tonal icons render at `h-5 w-5` (header) and per-widget body sizes. GratitudeWidget input rows render full-width with the violet-glow shadow visible. StreakCard badge pills render at `h-11 w-11` (mobile) per `flex h-11 w-11 ... sm:h-8 sm:w-8` (line 354). ActivityChecklist progress ring + activity list stack vertically (`flex-col` per line 126). MoodChart Recharts ResponsiveContainer fills width. BadgeGrid overlay renders as full-screen-style modal sheet within `max-h-[60vh] overflow-y-auto` (line 212). |
| Tablet | 768px | DashboardWidgetGrid switches to 2-column layout (per recon — `lg:grid-cols-5` only kicks in at 1024px, but `md:gap-6` reduces gap). Tonal icons render at the same size; the FrostedCard chrome scales with the grid cell. ActivityChecklist progress ring + list switch to `sm:flex-row` (`flex flex-col items-center gap-4 sm:flex-row sm:items-start`). GratitudeWidget Save button switches from `w-full` to `sm:w-auto`. |
| Desktop | 1440px | DashboardWidgetGrid switches to 5-column layout (`lg:grid-cols-5`); widgets declare `lg:col-span-2`, `lg:col-span-3`, or `lg:col-span-5` per `WIDGET_DEFINITIONS`. Tonal icons read clearest here — full grid is scannable at a glance. FrostedCard hover treatments (`hover:-translate-y-0.5`, `shadow-frosted-hover`) become meaningful with cursor input. The "color carries function" test reads strongest. |

**Custom breakpoints:** None introduced. ActivityChecklist's `sm:flex-row` breakpoint at 640px is preserved.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| StreakCard badge pill row (Step 4) | 3 inline badge pills (h-11 w-11 mobile, h-8 w-8 desktop) within `<div className="flex items-center gap-1.5">` | Same y ±5px at 1440px and 768px | Single row required at all breakpoints — `gap-1.5` + max 3 pills always fit |
| StreakCard multiplier + badge row (Step 4) | "Nx bonus today!" pill (left) + 3 badge pills (right) within `flex items-center justify-between` | Same y ±5px at 1440px (when both render) | Wrapping at 375px acceptable (justify-between on narrow viewport may stack) |
| ActivityChecklist item row (Step 6) | Icon + label + `+N pts` per row, within `<div className="flex items-center gap-2">` | Same y ±2px per row at all breakpoints | NO wrap allowed — single line per item required (label uses `text-sm`, no truncation) |
| ActivityChecklist ring + list (Step 6) | Progress ring + activity list, within `<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">` | Stacked at 375px (vertical); same baseline at 768px+ | INTENTIONAL stacking below 640px — flex-col is correct |
| GratitudeWidget input row (Step 12) | NumberedHeart (h-7 w-7) + input (h-11) within `<div className="flex items-center gap-2">` | Same y ±5px at all breakpoints | NO wrap allowed — single line per input row required |
| TodaysDevotionalCard heading + Check (Step 7) | `<h3>` title text + inline Check icon | Same y as inline text | NO wrap — inline `<Check>` inside `<h3>` |
| MoodChart legend area (Step 5) | None — chart fills container, MoodTooltip is positioned by Recharts | N/A | N/A |
| BadgeGrid header row (Step 14) | "Badge Collection X/N" heading + Close X button within `flex items-center justify-between` | Same y ±5px at all breakpoints | NO wrap — heading and close stay aligned |
| BadgeGrid badge cells per section (Step 14) | 4 cells/row mobile, 5/row sm, 6/row lg within `grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6` | All cells in a row share y ±2px | INTENTIONAL grid wrap — multi-row is the layout |
| ChallengeWidget active state ring + text (Step 13) | Progress ring (48px) + text content, within `flex flex-col items-center sm:flex-row` | Stacked at 375px; same baseline at 640px+ | INTENTIONAL stacking below 640px |
| ReadingPlanWidget mini-card row (Step 9) | Emoji + plan title within `flex items-center gap-3` | Same y ±2px per row | NO wrap |
| RecentHighlightsWidget item row (Step 11) | Color dot OR StickyNote + text content, within `flex items-start gap-2` | Top-aligned (`items-start`), same y for icon + first text line ±2px | NO wrap on icon column |

This table feeds `/verify-with-playwright` Step 6l (Inline Element Positional Verification).

---

## Vertical Rhythm

The widgets sit inside the existing `DashboardWidgetGrid` 5-column grid with `gap-4 md:gap-6` between cards. This spec does NOT modify grid spacing or vertical rhythm at the page level — all changes are inside individual widget cards.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Adjacent widgets in DashboardWidgetGrid | 16px (mobile) / 24px (md+) | `gap-4 md:gap-6` on grid container (preserved from 4A) |
| FrostedCard padding (every widget chrome) | 24px all sides (`p-6`) | `FrostedCard` component default for `variant="default"` |
| StreakCard inner sections | 16px (`space-y-4`) | Preserved verbatim |
| ActivityChecklist inner sections | 12px (`space-y-3`) + 12px between ring and list (`gap-4` at sm:flex-row) | Preserved verbatim |
| GratitudeWidget input rows | 8px (`space-y-2`) inside the rows wrapper | Preserved verbatim |
| GratitudeWidget Saved-state entries | 8px (`space-y-2`) | Preserved verbatim |
| BadgeGrid sections | 24px (`mb-6 last:mb-0`) | Preserved verbatim |
| MoodChart ResponsiveContainer height | 160px mobile / 180px sm+ | Preserved verbatim |
| ChallengeWidget active ring + text | 16px (`gap-4`) | Preserved verbatim |

**No vertical rhythm changes.** `/verify-with-playwright` Step 6e (vertical-rhythm comparison) should record the same gaps pre- and post-spec.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Working branch is `forums-wave-continued`. No new branch will be created. NO commits will land — user manages git.
- [ ] Spec 4A is complete and committed (verified at recon Step 1 — `bb113d7 spec-4a-dashboard-foundation patch`).
- [ ] `_plans/direction/dashboard-2026-05-04.md` is present and matches the locked decisions referenced in this plan (especially Decision 11 Tonal Icon Pattern with the per-widget assignment table, Decision 7 scripture italic, Decision 10 MoodChart empty state preserved).
- [ ] `_plans/recon/dashboard-2026-05-04.md` is present.
- [ ] All 11 widget files exist at the paths in the Architecture Context table.
- [ ] FrostedCard primitive at `frontend/src/components/homepage/FrostedCard.tsx` exposes `default`, `accent`, `subdued` variants — verified.
- [ ] Button primitive at `frontend/src/components/ui/Button.tsx` exposes `subtle`, `ghost`, `gradient` variants — verify during Step 1.
- [ ] PrayerInput.tsx:145 + JournalInput.tsx:283 violet-glow class string verified live: `border border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30` (verified — see Step 1 grep).
- [ ] Test baseline captured: `cd frontend && pnpm test -- --run --reporter=verbose 2>&1 | tail -50` and `pnpm typecheck`. Record total pass/fail counts in Step 1's Execution Log row. The post-4A baseline target per spec is **9437 pass / 2 fail** (the spec's number) but the 4A plan recorded **9432 pass / 2 fail** at completion. Either is acceptable as the baseline — record what is actually observed; any new failure introduced by this spec must be reconciled.
- [ ] All auth-gated actions from the spec are accounted for in the plan (verified — see Auth Gating Checklist; zero new gates).
- [ ] Design system values are derived from spec Decision 11 token families + canonical class strings from PrayerInput.tsx + JournalInput.tsx + FrostedCard.tsx.
- [ ] All [UNVERIFIED] values are flagged with verification methods (see Step 6 ActivityChecklist progress ring stroke decision; Step 14 BadgeGrid coupling — verified inline within StreakCard).
- [ ] Recon report loaded: `_plans/recon/dashboard-2026-05-04.md`.
- [ ] No deprecated patterns used (Caveat headings, BackgroundSquiggle on Dashboard, GlowBackground on Dashboard, animate-glow-pulse, cyan textarea borders, italic Lora prompts on prose body, soft-shadow 8px-radius cards on dark backgrounds, PageTransition).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to apply the header tonal color (DashboardWidgetGrid vs each widget file) | `DashboardWidgetGrid.tsx` (single touch-point, 10 case blocks) | The header icon is passed as a prop from the grid to DashboardCard. Lucide SVGs with their own `text-*` Tailwind class override the parent `<span text-white/60>`'s `currentColor`. Verified by GratitudeWidget at line 211 currently passing `<Heart className="text-pink-400">` and rendering pink. |
| `text-success` migration scope | Migrate ALL completion-signal Check icons (Activity rows, Devotional Check, ReadingPlan Check, GratitudeWidget Saved-state Check) to `text-emerald-300` | `text-success` resolves to `#27AE60` in tailwind.config.js — saturated, not pastel. Tonal Icon Pattern requires "muted/pastel". Mint family per Decision 11. |
| BadgeGrid coupling (inline within StreakCard vs standalone) | **Inline within StreakCard** (verified — StreakCard.tsx:194-197 renders `<BadgeGrid onClose={...} />` inline as a sibling). | Modify in-place. Class-level chrome alignment (FrostedCard subdued tokens), Close button as `<Button variant="ghost" size="sm">`. |
| ActivityChecklist progress ring stroke | Try `stroke-violet-600` Tailwind utility first; FALLBACK to `stroke="#6D28D9"` if Tailwind v3 stroke-color utilities don't render correctly | Either preserves the violet visual; the choice is a Tailwind capability question. Tailwind v3 supports `stroke-*` utilities; verify during execution by reading the rendered SVG attribute. Document the chosen path inline. |
| MoodChart axis tick text — Tailwind class vs `rgba()` | Keep as `rgba(255, 255, 255, 0.5)` via Recharts `tick` prop | Recharts' `tick` prop accepts a style object (`fill`, `fontSize`, etc.), NOT Tailwind class strings cleanly through its prop API. Migration to `text-white/50` would require a custom tick renderer (out of scope). Document inline. |
| RecentHighlightsWidget StickyNote tonal color | `text-yellow-300` (warm-yellow — matches highlight family) DEFAULT | Spec wording "or warm yellow" tilts default toward yellow. Lock at execution; document inline. Alternative is `text-emerald-300` (mint — personal annotation). |
| ChallengeWidget header glyph | Keep `Target` (current); apply `text-amber-300` tonal color | Decision 11 lists `Flame` for Challenge in the assignment table, but spec Pre-execution recon item 8 explicitly defers icon glyph swaps. Apply tonal to existing glyph. |
| ChallengeWidget reminder toggle button | `<Button variant="ghost" size="sm">` (default judgment) | Toggle is a low-stakes preference — ghost reads correctly. Use `aria-pressed` styling for the "Reminder set" state. If ghost reads too quiet at execution, fallback to `subtle`. |
| GratitudeWidget header Heart token migration | `text-pink-400` → `text-pink-300` | Currently saturated `pink-400`; Tonal Icon Pattern wants pastel `pink-300`. Migrate header + NumberedHeart fill + NumberedHeart text in the same step for visual unity. |
| GratitudeWidget first-time italic intro preservation | PRESERVE `text-sm italic text-white/60` | Decision 7's prose-italic deprecation targets long-form prose. Short UI helper text ("Count three blessings from today") is a different idiom. |
| Mood-chart MoodTooltip migration | `bg-hero-mid` → `bg-white/[0.07] backdrop-blur-md` | FrostedCard tooltip alignment per spec. The dark frosted-glass tooltip feels like part of the chrome. |
| Test baseline pass count | Record observed value at Step 1; tolerate 9432-9437 range from prior runs | The 4A plan recorded 9432 at completion; the spec mentions 9437 as the target. Both are within the same pre-existing-flake band; record actually observed and reconcile any NEW failure. |
| Pre-existing baseline flakes | The 2 documented flakes (`useFaithPoints — unauthenticated returns default values when not authenticated` + `Pray > shows loading then prayer`) | These are timing flakes carried from 4A. Net regression target: **0 new failures**. Pre-existing 2 fails carry through. |

---

## Implementation Steps

### Step 1: Pre-execution recon + test baseline

**Objective:** Verify the working branch contains all 4A + post-4A patch artifacts, and capture test/typecheck baseline. NO code changes.

**Files to create/modify:** None (recon-only step).

**Details:**

1. Verify working branch via `git rev-parse --abbrev-ref HEAD`. Must equal `forums-wave-continued`. STOP if mismatch.
2. Verify Spec 4A artifacts via grep + Read:
   - `frontend/src/pages/Dashboard.tsx` contains `<BackgroundCanvas>` (4A Step 2).
   - `frontend/src/components/dashboard/DashboardCard.tsx:47-57` renders `<FrostedCard variant="default">` (verified at line 47).
   - `frontend/src/components/dashboard/GettingStartedCard.tsx:108` renders `<FrostedCard variant="accent">` (verified — post-4A patch).
   - `frontend/src/components/dashboard/EveningReflectionBanner.tsx`, `frontend/src/components/dashboard/GratitudeWidget.tsx`, `frontend/src/components/dashboard/PrayerListWidget.tsx`, `frontend/src/components/dashboard/InstallCard.tsx`, `frontend/src/components/dashboard/MoodCheckIn.tsx`, `frontend/src/components/dashboard/CustomizePanel.tsx` — grep `bg-primary` should return ZERO matches in these files (4A Step 7). Run: `grep -n 'bg-primary' frontend/src/components/dashboard/EveningReflectionBanner.tsx frontend/src/components/dashboard/GratitudeWidget.tsx frontend/src/components/dashboard/PrayerListWidget.tsx frontend/src/components/dashboard/InstallCard.tsx frontend/src/components/dashboard/MoodCheckIn.tsx frontend/src/components/dashboard/CustomizePanel.tsx`. Expected: zero output. Document any unexpected matches in Execution Log.
   - Run: `grep -rn 'text-primary' frontend/src/components/dashboard/`. Expected per 4A's final grep audit: only NotificationItem:157, StreakCard:300 (LevelIcon — semantic), CelebrationOverlay:225 (4D scope), WelcomeWizard:488/526 (out of 4A scope). Document any unexpected matches.
3. Verify violet-glow textarea pattern is the live class string in PrayerInput.tsx + JournalInput.tsx (already verified during plan generation — see Architecture Context). If it has drifted at execution, lock the live string into Step 12 inline.
4. Read `frontend/tailwind.config.js` to confirm `success: '#27AE60'` (verified) and check for `stroke` utilities config — Tailwind v3 includes them by default. If `stroke-violet-600` does not work at execution time, fallback per Step 6 documentation.
5. Capture test baseline: `cd frontend && pnpm test -- --run --reporter=verbose 2>&1 | tail -50`. Record total pass/fail counts. Expected baseline: ~9432-9437 pass / 2 fail.
6. Capture typecheck baseline: `pnpm typecheck`. Expected: clean.
7. Read each of the 11 widget files referenced in the Architecture Context table. Verify the class strings cited in the Design System Values table match what's live. If anything has drifted, update the per-step Details before executing.
8. Record all baseline values in the Execution Log Notes column.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT modify any source file in this step.
- Do NOT skip any verification — if any 4A artifact is missing, STOP and reconcile.
- Do NOT proceed if the test baseline reports a NEW failing file (>2 fails or different test names).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (recon) | n/a | Running existing tests for baseline; not adding new tests |

**Expected state after completion:**

- [ ] All 4A artifacts verified.
- [ ] Test baseline recorded.
- [ ] Typecheck baseline recorded.
- [ ] Per-widget class string drift checked.
- [ ] Direction doc + recon present.

---

### Step 2: Decide token finalization for ambiguous color choices

**Objective:** Lock the final tonal token for each widget where the spec gives a family with multiple options, BEFORE making any code changes. Document each lock in the Execution Log.

**Files to create/modify:** None (decision-only step — Execution Log entries).

**Details:**

For each ambiguous choice in the Design System Values table, lock the chosen token. Default to the first option listed; only deviate if execution-time visual inspection reveals contrast issues:

1. **MoodChart header:** `text-violet-300` (default).
2. **ActivityChecklist header CheckCircle2:** `text-emerald-300` (default; fallback `text-teal-300`).
3. **TodaysDevotionalCard header BookOpen:** `text-sky-300` (default; fallback `text-blue-300`).
4. **VerseOfTheDayCard header BookOpen:** `text-amber-100` (default; fallback `text-yellow-200`).
5. **ReadingPlanWidget header BookOpen:** `text-sky-300` (matches Devotional family — default).
6. **PrayerListWidget header Heart:** `text-pink-300` (default).
7. **RecentHighlightsWidget header Highlighter:** `text-yellow-300` (default; fallback `text-amber-300`).
8. **GratitudeWidget header Heart:** `text-pink-300` (default — distinct from `text-pink-400` saturated).
9. **ChallengeWidget header Target:** `text-amber-300` (slightly distinct from StreakCard `text-amber-400`).
10. **ActivityChecklist completion icons** (item rows + `+N pts` + ReadingPlan completed BookOpen): `text-emerald-300`.
11. **ActivityChecklist non-completed BookOpen for readingPlan item:** `text-sky-300` (Devotional family alignment).
12. **ActivityChecklist non-completed Moon for reflection item:** `text-violet-300`.
13. **TodaysDevotionalCard Check icon:** `text-emerald-300`.
14. **ReadingPlanWidget all-completed and recently-completed Check icons:** `text-emerald-300`.
15. **GratitudeWidget Saved-state Check icons:** `text-emerald-300`.
16. **GratitudeWidget NumberedHeart fill + text:** `fill-pink-300/20 text-pink-300` (alignment with header).
17. **RecentHighlightsWidget empty BookOpen + StickyNote:** `text-yellow-300` for both (default — warm yellow family).
18. **BadgeGrid Lock icon overlay:** `text-white/20` (per spec wording).

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT lock a token without confirming the family in Decision 11.
- Do NOT introduce a token outside the listed families (e.g., `text-purple-200`, `text-fuchsia-300`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | n/a | Decision-only |

**Expected state after completion:**

- [ ] All 18 token decisions locked in Execution Log Notes.

---

### Step 3: Apply tonal header colors in `DashboardWidgetGrid.tsx`

**Objective:** Add tonal Tailwind color classes to the `icon={...}` JSX of 10 widget `case` blocks in `DashboardWidgetGrid.tsx`. This is the single point where 10 of the 11 header icons receive their tonal color.

**Files to create/modify:**

- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — modify icon props for cases: `mood-chart`, `votd`, `devotional`, `reading-plan`, `prayer-list`, `recent-highlights`, `gratitude`, `streak`, `activity-checklist`, `challenge`. NOT `quick-actions` (out of 4B scope — 4C territory), NOT `friends`, NOT `weekly-recap`, NOT `getting-started`, NOT `evening-reflection`, NOT `anniversary`.

**Details:**

Apply changes per token-decision-Step-2 lock. Edit each `case` block's `icon` prop:

1. **`mood-chart` case (line 126):** `<TrendingUp className="h-5 w-5" />` → `<TrendingUp className="h-5 w-5 text-violet-300" />`
2. **`votd` case (line 141):** `<BookOpen className="h-5 w-5" />` → `<BookOpen className="h-5 w-5 text-amber-100" />`
3. **`devotional` case (line 155):** `<BookOpen className="h-5 w-5" />` → `<BookOpen className="h-5 w-5 text-sky-300" />`
4. **`reading-plan` case (line 169):** `<BookOpen className="h-5 w-5" />` → `<BookOpen className="h-5 w-5 text-sky-300" />`
5. **`prayer-list` case (line 183):** `<Heart className="h-5 w-5" />` → `<Heart className="h-5 w-5 text-pink-300" />`
6. **`recent-highlights` case (line 197):** `<Highlighter className="h-5 w-5" />` → `<Highlighter className="h-5 w-5 text-yellow-300" />`
7. **`gratitude` case (line 211):** `<Heart className="h-5 w-5 text-pink-400" />` → `<Heart className="h-5 w-5 text-pink-300" />` (migrate saturated to pastel)
8. **`streak` case (line 225):** `<Flame className="h-5 w-5" />` → `<Flame className="h-5 w-5 text-amber-400" />` (preservation — matches body Flame active state)
9. **`activity-checklist` case (line 251):** `<CheckCircle2 className="h-5 w-5" />` → `<CheckCircle2 className="h-5 w-5 text-emerald-300" />`
10. **`challenge` case (line 269):** `<Target className="h-5 w-5" />` → `<Target className="h-5 w-5 text-amber-300" />`

**Verify after each edit:**

- The `icon` prop is the only thing changed in each case block. No other class strings, no JSX structure changes, no logic changes.
- DashboardCard's `<span className="text-white/60">` wrapper still renders, but the icon's own `text-*` class overrides the parent `currentColor`.

**Auth gating:** N/A — no new gates.

**Responsive behavior:**

- Desktop (1440px): 10 widgets render with their tonal headers; full grid is scannable by category color.
- Tablet (768px): same — tonal colors render at the same `h-5 w-5` size.
- Mobile (375px): same — single column, tonal colors visible per card.

**Inline position expectations:** No inline-row layouts changed in this step.

**Guardrails (DO NOT):**

- Do NOT modify the icon component name (no glyph swap — e.g., do not change `Target` to `Flame` for Challenge per spec Pre-execution recon item 8).
- Do NOT add a container `<div>` around the icon — DashboardCard's `<span text-white/60>` wrapper handles structure.
- Do NOT change `h-5 w-5` icon size.
- Do NOT change `aria-hidden` (icons are decorative — DashboardCard wraps in `<span aria-hidden="true">` already).
- Do NOT modify the `quick-actions`, `friends`, `weekly-recap`, `getting-started`, `evening-reflection`, or `anniversary` cases (out of 4B scope).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Verify class string on each icon | unit (visual inspection of grep) | `grep -n 'text-violet-300\|text-amber-100\|text-sky-300\|text-pink-300\|text-yellow-300\|text-amber-400\|text-emerald-300\|text-amber-300' frontend/src/components/dashboard/DashboardWidgetGrid.tsx` returns 10 lines. |
| `pnpm typecheck` | type | Clean — no TS errors from added Tailwind class strings. |
| Existing DashboardWidgetGrid tests | regression | All pass without modification. |

**Expected state after completion:**

- [ ] 10 header icons in `DashboardWidgetGrid.tsx` carry tonal colors per Step 2 token lock.
- [ ] No JSX structure or logic changes.
- [ ] `pnpm typecheck` clean.
- [ ] Existing tests pass.

---

### Step 4: StreakCard polish (Change 1)

**Objective:** Migrate StreakCard's inline `style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}` to Tailwind tokens; verify all preservations (Flame amber, FP progress glow, Restore Streak amber, View all badges link, AnimatedCounter, Longest tone).

**Files to create/modify:**

- `frontend/src/components/dashboard/StreakCard.tsx`

**Details:**

1. **Badge pill migration (lines 351-362):**
   - Current:
     ```tsx
     <button
       key={badge.id}
       onClick={() => setShowBadgeGrid(true)}
       className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white/50 sm:h-8 sm:w-8"
       style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}
       title={badge.name}
       aria-label={`${badge.name} badge`}
       type="button"
     >
       <BadgeIcon className={`h-4 w-4 ${iconConfig.textColor}`} />
     </button>
     ```
   - New:
     ```tsx
     <button
       key={badge.id}
       onClick={() => setShowBadgeGrid(true)}
       className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/20 transition-colors hover:bg-violet-500/30 focus-visible:ring-2 focus-visible:ring-white/50 sm:h-8 sm:w-8"
       title={badge.name}
       aria-label={`${badge.name} badge`}
       type="button"
     >
       <BadgeIcon className={`h-4 w-4 ${iconConfig.textColor}`} />
     </button>
     ```
   - Specifically: ADD `bg-violet-500/20 transition-colors hover:bg-violet-500/30` to the className; REMOVE the `style={{ backgroundColor: ... }}` attribute. Preserve every other class (`flex h-11 w-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white/50 sm:h-8 sm:w-8`), the click handler, title, aria-label, type. Keep `iconConfig.textColor` on the inner icon (per-badge color).
2. **AnimatedCounter typography (line 209):** Currently `text-3xl font-bold text-white md:text-4xl`. PRESERVE — already aligned with active state. NO change.
3. **"Longest: N days" (lines 220, 274):** Currently `text-xs text-white/50`. The spec requests `text-white/60`. **Migrate `text-white/50` → `text-white/60`** on both occurrences for slightly improved readability. (Both lines use the same paragraph element shape.)
4. **Streak message paragraph (lines 254-257, 277-281):** Currently `text-sm text-white/60`. PRESERVE.
5. **Italic repair message (line 225):** Currently `text-sm italic text-white/60`. **Migrate `italic` removal — body prose italic is deprecated for prose body (Decision 7).** New: `text-sm text-white/60`. Preserve the message text "Everyone misses a day. Grace is built into your journey."
6. **Restore Streak amber button (lines 230-237):** PRESERVE verbatim. Locked exception (warm-emergency cue).
7. **Repair-with-50-points button (lines 241-249):** PRESERVE verbatim.
8. **FP line + LevelIcon (lines 290-302):** PRESERVE — `LevelIcon className="h-5 w-5 text-primary-lt"` is documented semantic preservation (level icon is functional, not categorical). PRESERVE.
9. **FP progress bar (lines 306-328):** PRESERVE verbatim. Direction-aware glow `boxShadow` preserved per locked exception. Animation tokens preserved.
10. **`Math.min(progressPercent, 100)` line below progress bar (lines 330-334):** PRESERVE verbatim.
11. **Multiplier pill (line 341):** Currently `rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300`. PRESERVE — already aligned with amber tonal family.
12. **View all badges link (line 373):** PRESERVE — `text-white/80 hover:text-white` (4A migration).
13. **Body Flame icons (lines 203-206 active, 263-266 inactive):** PRESERVE — `text-amber-400` active, `text-white/30` inactive.

**Auth gating:** N/A (StreakCard renders only when authenticated; no new actions).

**Responsive behavior:**

- Desktop (1440px): badge pills render at `h-8 w-8` (sm:h-8 sm:w-8). Hover state activates with cursor.
- Tablet (768px): same `h-8 w-8`. Hover state activates with cursor.
- Mobile (375px): badge pills render at `h-11 w-11` (44px tap target).

**Inline position expectations:**

- Badge pill row: 3 pills inline, same y ±5px at all breakpoints (gap-1.5 + max 3 pills always fit).
- Multiplier pill + badge row: same y ±5px at desktop. Wrapping at 375px acceptable due to `justify-between`.

**Guardrails (DO NOT):**

- Do NOT remove the inline `style={{ backgroundColor: ... }}` glow on the FP progress bar (line 322) — that's the direction-aware glow, locked exception.
- Do NOT migrate the Restore Streak amber button to subtle Button or violet system.
- Do NOT touch the Flame icon colors (preserved).
- Do NOT introduce a new useRef/useState — repair logic stays verbatim.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Badge pills no longer use inline style.backgroundColor | unit | After render, query the badge pill button; assert `style.backgroundColor` is empty string and `className` includes `bg-violet-500/20`. |
| Badge pill hover state | unit (DOM inspection) | Verify className includes `hover:bg-violet-500/30 transition-colors`. |
| AnimatedCounter renders streak | regression | Existing test passes without modification. |
| Restore Streak button still renders amber | regression | Existing test passes; class assertion `bg-amber-500/20 ... text-amber-300` preserved. |
| FP progress glow direction-aware | regression | `progress-bar-glow.test.tsx` continues passing. |
| Italic repair message no longer italic | unit | After render, query the "Everyone misses a day..." paragraph; assert `className` does NOT include `italic`. |
| Longest streak text uses `text-white/60` | unit | Query both occurrences; assert className contains `text-white/60`. |
| StreakCard click on recent badge opens BadgeGrid | regression | Existing behavioral test passes — click handler unchanged. |

**Expected state after completion:**

- [ ] Inline `style.backgroundColor` removed from badge pill buttons.
- [ ] `bg-violet-500/20 hover:bg-violet-500/30 transition-colors` added.
- [ ] `text-white/50` → `text-white/60` on Longest line (both occurrences).
- [ ] `italic` removed from repair message paragraph.
- [ ] All preservations intact (Flame amber, Restore amber, FP progress glow, View all badges link, multiplier pill).

---

### Step 5: MoodChart polish (Change 2)

**Objective:** Migrate MoodTooltip styling to FrostedCard tooltip alignment. Document axis tick text decision (Recharts API constraint). Preserve empty state, line strokes, connecting lines.

**Files to create/modify:**

- `frontend/src/components/dashboard/MoodChart.tsx`

**Details:**

1. **MoodTooltip body (lines 131-142):**
   - Current:
     ```tsx
     return (
       <div className="rounded-lg border border-white/15 bg-hero-mid px-3 py-2 text-sm text-white shadow-lg">
         <p className="font-medium">{formatTooltipDate(data.date)}</p>
         <p className="text-white/70">{data.moodLabel}</p>
       </div>
     );
     ```
   - New:
     ```tsx
     return (
       <div className="rounded-lg border border-white/[0.12] bg-white/[0.07] px-3 py-2 text-sm text-white shadow-lg backdrop-blur-md">
         <p className="font-medium">{formatTooltipDate(data.date)}</p>
         <p className="text-white/70">{data.moodLabel}</p>
       </div>
     );
     ```
   - Specifically: `border-white/15` → `border-white/[0.12]`, `bg-hero-mid` → `bg-white/[0.07]`, ADD `backdrop-blur-md`. Preserve `rounded-lg`, `px-3 py-2 text-sm text-white shadow-lg`, the inner paragraph structure.
2. **Axis tick text (lines 171, 269, 277):** PRESERVE — Recharts `tick` prop accepts a style object only. Document inline with a code comment on the line referencing the constraint:
   ```tsx
   // Axis tick fill stays as rgba(...) because Recharts' `tick` prop accepts only style objects, not Tailwind class strings. See spec 4B Decision: MoodChart axis tick text.
   ```
   Add this comment above each `tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}` occurrence (3 lines: 171 in empty state, 269 in main chart's XAxis, 277 in YAxis). Keep the comment short — single inline `//` comment above each tick prop usage, NOT a multi-paragraph block.
3. **Empty state (lines 158-208):** PRESERVE — Decision 10 ghosted-chart empty state.
4. **Morning mood line stroke (line 288):** PRESERVE — `stroke="#8B5CF6"`.
5. **Evening mood line stroke (line 298):** PRESERVE — `stroke="rgba(139, 92, 246, 0.3)"`.
6. **Connecting lines (line 113):** PRESERVE — `stroke="rgba(255,255,255,0.15)"`.
7. **`See More` link in card header:** Verify still renders `text-white/80 hover:text-white` per 4A migration. The "See More" link is the `action` prop on the `mood-chart` DashboardCard case (line 127 in DashboardWidgetGrid). DashboardCard renders the action link with `text-sm text-white/80 transition-colors hover:text-white` (verified at DashboardCard.tsx:77). NO change needed.
8. **Empty state "Check in now" button (line 200):** Verify still renders `text-white/80 hover:text-white`. Confirmed at line 200. NO change.

**Auth gating:** N/A.

**Responsive behavior:**

- Desktop (1440px): Recharts tooltip renders at the data point with the new frosted-glass look.
- Tablet (768px): same.
- Mobile (375px): hover→tap to show tooltip; new chrome reads at narrow viewport.

**Inline position expectations:** N/A — chart is a single layout.

**Guardrails (DO NOT):**

- Do NOT migrate the empty state to `FeatureEmptyState`.
- Do NOT change the morning line stroke `#8B5CF6` or evening dot/connecting line colors.
- Do NOT add a tonal class to the chart strokes (Tonal Icon Pattern explicitly does NOT apply to chart strokes).
- Do NOT modify the `MoodChartEmptyState` ghosted-chart hardcoded `EMPTY_STATE_DATA` mood colors (those are mood data, not chrome).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| MoodTooltip new chrome | unit | Render `<MoodTooltip active={true} payload={[mockData]}>`; assert className contains `bg-white/[0.07]`, `border-white/[0.12]`, `backdrop-blur-md`. |
| MoodTooltip text content unchanged | regression | Tooltip renders date + mood label text. |
| Empty state preserved | regression | Existing test for "Your mood journey starts today" + "Check in now" continues passing. |
| Morning mood line stroke unchanged | regression | Recharts Line stroke prop assertion `stroke="#8B5CF6"`. |
| Tonal header icon (`text-violet-300`) | unit | After Step 3, verify TrendingUp icon in DashboardWidgetGrid renders with `text-violet-300`. |

**Expected state after completion:**

- [ ] MoodTooltip uses FrostedCard-aligned chrome.
- [ ] Axis tick decision documented inline.
- [ ] Empty state, line strokes, connecting lines preserved.

---

### Step 6: ActivityChecklist polish (Change 3)

**Objective:** Migrate progress ring stroke (Tailwind token if supported), migrate `text-success` Check icons to `text-emerald-300`, apply tonal colors to special icons (BookOpen→sky, Moon→violet), verify multiplier preview tone.

**Files to create/modify:**

- `frontend/src/components/dashboard/ActivityChecklist.tsx`

**Details:**

1. **Progress ring stroke (line 150):**
   - Current: `stroke="#6D28D9"` hardcoded.
   - **Try Tailwind utility first:** Replace with `className="..." stroke="currentColor"` is messy on SVG circle elements. The cleanest path is to keep the `stroke` SVG attribute but assign via Tailwind's `stroke-violet-600` utility class. Tailwind v3 supports `stroke-*` color utilities. Migration:
     ```tsx
     <circle
       cx="30"
       cy="30"
       r={RING_RADIUS}
       className="stroke-violet-600"
       strokeWidth="6"
       fill="none"
       strokeLinecap="round"
       transform="rotate(-90 30 30)"
       strokeDasharray={RING_CIRCUMFERENCE}
       strokeDashoffset={strokeDashoffset}
       style={...}
     />
     ```
     Remove the `stroke="#6D28D9"` attribute; ADD `className="stroke-violet-600"` (or merge into existing className — there is none on this element currently).
   - **FALLBACK:** If `stroke-violet-600` does not render correctly at execution (verify by inspecting the rendered SVG), KEEP `stroke="#6D28D9"` and document the constraint with an inline comment:
     ```tsx
     // Hardcoded stroke color — Tailwind v3 stroke-* utility doesn't apply correctly here.
     ```
   - Document the chosen path in the Execution Log.
2. **Item-row Circle/CircleCheck icons (lines 184-191):**
   - Current:
     ```tsx
     const iconColor = completed ? 'text-success' : 'text-white/20'
     ```
   - New:
     ```tsx
     const iconColor = completed ? 'text-emerald-300' : 'text-white/20'
     ```
   - Specifically: replace `text-success` with `text-emerald-300`.
3. **Reflection item Moon icon (line 186):**
   - Current: `<Moon className="h-5 w-5 flex-shrink-0 text-indigo-300/50" aria-hidden="true" />`
   - New: `<Moon className="h-5 w-5 flex-shrink-0 text-violet-300" aria-hidden="true" />`
4. **`+N pts` text on completed rows (line 214):**
   - Current: `'ml-auto text-xs text-success'`
   - New: `'ml-auto text-xs text-emerald-300'`
5. **`+N pts` text on incomplete rows (line 215-216):** PRESERVE: `'ml-auto text-xs text-white/60'`.
6. **Multiplier preview message (lines 234-243):** PRESERVE — celebration branch is `text-amber-300`, utility branch is `text-white/60`. Already aligned with utility tone per spec.
7. **"A new day, a new opportunity to grow" empty-state line (line 228):** PRESERVE: `text-sm text-white/50`.
8. **CompletedCheck for completed reflection item (line 185):** When `isReflection && completed`, currently `<CircleCheck className="h-5 w-5 flex-shrink-0 text-success" aria-hidden="true" />`. Migrate to `text-emerald-300` (mint completion family — same as other completed checks).

**Auth gating:** N/A.

**Responsive behavior:**

- Desktop (1440px): ring + activity list inline `sm:flex-row`. Tonal colors clearly visible.
- Tablet (768px): same `sm:flex-row` with breathing room.
- Mobile (375px): ring + list stack vertically (`flex-col`), tonal colors render at the same `h-5 w-5`.

**Inline position expectations:**

- Each item row: icon + label + `+N pts` share y ±2px. NO wrap allowed (label uses `text-sm`).
- Ring + list: stacked at 375px (intentional `flex-col`); shared baseline at 768px+ (`sm:flex-row`).

**Guardrails (DO NOT):**

- Do NOT change ring radius (24), strokeWidth (6), or animation tokens.
- Do NOT change the activity item structure or order.
- Do NOT remove the multiplier celebration `text-amber-300` branch.
- Do NOT change the completed item label color (`text-white`) — readability.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Progress ring renders with violet | unit | Either `className="stroke-violet-600"` or `stroke="#6D28D9"` (whichever path is taken); document choice in Execution Log. |
| Completed item check icon uses mint | unit | Render with mock `todayActivities` showing one completed item; query the CircleCheck icon; assert className contains `text-emerald-300`. |
| Reflection item Moon uses lavender | unit | Mock evening time; render; assert Moon icon className contains `text-violet-300`. |
| ReadingPlan BookOpen tonal in non-completed state | unit | Mock active reading plan; assert non-completed BookOpen className contains `text-white/20` (incomplete) — actually wait, let me recheck spec. |
| `+N pts` on completed rows uses mint | unit | Assert className contains `text-emerald-300`. |
| Activity rendering count + structure | regression | Existing tests for base 7 + readingPlan + localVisit + reflection conditional rendering pass. |
| Progress ring animation | regression | `entrance-animation.test.tsx` continues passing. |

Note on completed-row icon spec: the spec says BookOpen for readingPlan item should use `text-sky-300`. The current code (line 182) uses `iconColor` (which is `text-success`/`text-white/20`) for BookOpen too. **Decision:** when `isReadingPlan && completed`, BookOpen icon should use `text-emerald-300` (mint family — completion); when `isReadingPlan && !completed`, BookOpen icon should use `text-sky-300` (Devotional family) per spec. Update the conditional:

```tsx
} else if (isReadingPlan) {
  Icon = <BookOpen className={`h-5 w-5 flex-shrink-0 ${completed ? 'text-emerald-300' : 'text-sky-300'}`} aria-hidden="true" />
}
```

**Expected state after completion:**

- [ ] Progress ring stroke decision documented.
- [ ] All `text-success` → `text-emerald-300` in 4 locations (item icon completed branch, `+N pts` completed branch, reflection completed CircleCheck, ReadingPlan BookOpen completed branch).
- [ ] Reflection Moon icon → `text-violet-300`.
- [ ] ReadingPlan BookOpen incomplete branch → `text-sky-300`.
- [ ] Multiplier preview tone preserved.

---

### Step 7: TodaysDevotionalCard polish (Change 4)

**Objective:** Migrate category pill chrome to system-aligned tokens, migrate Check icon to mint, migrate reflection preview to body content tone.

**Files to create/modify:**

- `frontend/src/components/dashboard/TodaysDevotionalCard.tsx`

**Details:**

1. **Check icon (line 28):**
   - Current: `<Check className="ml-1.5 inline h-4 w-4 text-success" aria-label="Completed" />`
   - New: `<Check className="ml-1.5 inline h-4 w-4 text-emerald-300" aria-label="Completed" />`
2. **Category pill (line 36):**
   - Current: `<span className="mt-1.5 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">`
   - New: `<span className="mt-1.5 inline-block rounded-full bg-white/[0.05] px-2.5 py-0.5 text-xs text-white/70">`
   - Specifically: `bg-white/10` → `bg-white/[0.05]`, `text-white/60` → `text-white/70`.
3. **Reflection preview (line 40):**
   - Current: `<p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">`
   - New: `<p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">`
   - Specifically: `text-white/60` → `text-white/80`.
4. **"Read again" link (lines 44-49):** PRESERVE — `text-white/50 hover:text-white/70` is a deliberate muted state for already-completed action.
5. **"Read today's devotional" link (lines 51-57):** PRESERVE — `text-white/80 hover:text-white` (4A migration).

**Auth gating:** N/A.

**Responsive behavior:** No responsive structure change. Tonal colors render at all breakpoints.

**Inline position expectations:**

- `<h3>` title + inline `<Check>` icon: same y baseline (inline elements within heading).

**Guardrails (DO NOT):**

- Do NOT modify the category pill shape (`rounded-full`, `px-2.5 py-0.5 text-xs`).
- Do NOT modify the "Read again" link to be more prominent — the muted state is intentional for completed action.
- Do NOT introduce new icons.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Check icon uses mint | unit | Render with `wr_devotional_reads` containing today's date; assert Check className contains `text-emerald-300`. |
| Category pill chrome migrated | unit | Assert className contains `bg-white/[0.05]` and `text-white/70`; does NOT contain `bg-white/10` or `text-white/60`. |
| Reflection preview body tone | unit | Assert className contains `text-white/80`. |
| Read state vs unread state branches | regression | Existing branch test passes. |
| Tonal header BookOpen | unit | After Step 3, verify DashboardWidgetGrid `devotional` icon renders with `text-sky-300`. |

**Expected state after completion:**

- [ ] Check icon → `text-emerald-300`.
- [ ] Category pill → `bg-white/[0.05] text-white/70`.
- [ ] Reflection preview → `text-white/80`.
- [ ] "Read again" / "Read today's devotional" links unchanged.

---

### Step 8: VerseOfTheDayCard polish (Change 5)

**Objective:** Migrate Share button to `<Button variant="ghost" size="sm">`. Verify Lora italic verse, reference, and Meditate link all preserved.

**Files to create/modify:**

- `frontend/src/components/dashboard/VerseOfTheDayCard.tsx`

**Details:**

1. **Verse text (line 14):** PRESERVE — `font-serif italic text-lg leading-relaxed text-white` (Decision 7).
2. **Reference (line 17):** PRESERVE — `text-white/50`.
3. **"Meditate on this verse" link (lines 18-23):** PRESERVE — `text-white/80 transition-colors hover:text-white` (4A migration).
4. **Share button (lines 24-36):**
   - Current: a custom `<button type="button" onClick={...} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg p-1.5 text-sm text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Share verse of the day" aria-haspopup="dialog" aria-expanded={sharePanelOpen}><Share2 className="h-4 w-4" aria-hidden="true" /><span>Share</span></button>`.
   - New: migrate to `<Button>`:
     ```tsx
     <Button
       variant="ghost"
       size="sm"
       type="button"
       onClick={() => setSharePanelOpen((prev) => !prev)}
       aria-label="Share verse of the day"
       aria-haspopup="dialog"
       aria-expanded={sharePanelOpen}
       className="inline-flex items-center gap-1.5"
     >
       <Share2 className="h-4 w-4" aria-hidden="true" />
       <span>Share</span>
     </Button>
     ```
   - Verify the `Button` component supports `aria-haspopup` and `aria-expanded` pass-through. If it does not, keep these attributes on the rendered HTML via spread props or a wrapper. Read Button.tsx during execution.
5. **SharePanel (lines 37-42):** PRESERVE verbatim — out of scope (4D modal sweep).

**Auth gating:** N/A.

**Responsive behavior:** No responsive structure change.

**Inline position expectations:**

- Share button container `flex justify-end` (line 24): button right-aligned at all breakpoints.
- Inside Share button: Share2 icon + "Share" text inline; same y ±2px.

**Guardrails (DO NOT):**

- Do NOT migrate the verse text away from `font-serif italic` (Decision 7 — scripture).
- Do NOT touch the SharePanel modal (4D scope).
- Do NOT remove `aria-haspopup="dialog"` or `aria-expanded` — needed for the modal trigger semantics.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Share button is now a `<Button>` | unit | Assert the rendered element has the Button variant `ghost` chrome + `min-h-[44px]` (Button default tap target). |
| ARIA attributes preserved | unit | Assert `aria-haspopup="dialog"` and `aria-expanded` (boolean) are present on the rendered button. |
| Click handler triggers SharePanel | regression | Click → SharePanel renders. |
| Verse italic preserved | regression | Existing class assertion `font-serif italic text-lg leading-relaxed text-white` passes. |
| "Meditate on this verse" link unchanged | regression | Existing test passes. |
| Tonal header BookOpen | unit | After Step 3, verify DashboardWidgetGrid `votd` icon renders with `text-amber-100`. |

**Expected state after completion:**

- [ ] Share button migrated to `<Button variant="ghost" size="sm">`.
- [ ] All ARIA attributes preserved.
- [ ] Verse Lora italic preserved.

---

### Step 9: ReadingPlanWidget polish (Change 6)

**Objective:** Migrate Check icons to mint; verify all 4 conditional states render correctly with the new chrome; verify mini-cards in discovery state are aligned with `/bible/plans`; verify links.

**Files to create/modify:**

- `frontend/src/components/dashboard/ReadingPlanWidget.tsx`

**Details:**

1. **Active state progress bar (line 144):** PRESERVE — `bg-white/10` track + `bg-primary` violet fill.
2. **Active state typography (lines 133, 149):** PRESERVE — title `text-base font-semibold text-white`, body `text-sm text-white/50`.
3. **Active state Continue link (lines 153-159):** PRESERVE — `text-white/80 hover:text-white` (4A migration).
4. **Active state reading streak (line 162):** PRESERVE — `text-xs text-white/60`.
5. **All-completed state Check (line 174):**
   - Current: `<Check className="h-8 w-8 text-success" />`
   - New: `<Check className="h-8 w-8 text-emerald-300" />`
6. **All-completed state body (line 178):** PRESERVE — `text-sm text-white/50`. Spec says "Typography alignment with `text-white/80` for body text." But this body is "What an incredible journey through Scripture." which is a small explanatory line, not main body text. **Migrate to `text-white/80`** for body content alignment per spec wording. Update line 178 to `text-sm text-white/80`.
7. **Recently-completed state Check (line 190):**
   - Current: `<Check className="h-6 w-6 flex-shrink-0 text-success" />`
   - New: `<Check className="h-6 w-6 flex-shrink-0 text-emerald-300" />`
8. **Recently-completed state title (line 191):** PRESERVE — `text-base font-semibold text-white`.
9. **Recently-completed state Start another link (lines 198-204):** PRESERVE — `text-white/80 hover:text-white`.
10. **Discovery state heading (line 212):** PRESERVE — `text-sm font-semibold text-white`.
11. **Discovery state subtitle (line 213):** PRESERVE — `text-xs text-white/50`.
12. **Discovery state mini-cards (lines 218-231):** PRESERVE — existing `rounded-lg bg-white/5 hover:bg-white/10 p-3` chrome + `coverEmoji` + `text-sm font-medium text-white` plan title. The `coverEmoji` is the categorical signal per the existing flavor of Tonal Icon Pattern from `/bible/plans`. NO change.
13. **Discovery state Browse all plans link (lines 234-240):** PRESERVE — `text-white/80 hover:text-white`.

**Auth gating:** N/A.

**Responsive behavior:** No responsive structure change.

**Inline position expectations:**

- Recently-completed Check + title row (line 189): icon + title share y ±2px (`flex items-center gap-3`).
- Discovery mini-card emoji + title row: same y ±2px (`flex items-center gap-3`).

**Guardrails (DO NOT):**

- Do NOT change the discovery mini-card chrome or `coverEmoji` rendering.
- Do NOT modify the active state progress bar (`bg-white/10` + `bg-primary`).
- Do NOT remove ChevronRight icons from links.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All-completed Check icon uses mint | unit | Mock all-completed state; assert Check className contains `text-emerald-300`. |
| Recently-completed Check icon uses mint | unit | Mock recently-completed state; assert Check className contains `text-emerald-300`. |
| All-completed body uses text-white/80 | unit | Assert body `<p>` className contains `text-white/80`. |
| Active state progress bar unchanged | regression | Class `bg-primary` preserved on fill div. |
| Discovery state mini-cards unchanged | regression | 3 mini-card render with emoji + title, hover state works. |
| All 4 conditional branches render correctly | regression | Existing tests for activePlan / allCompleted / recentlyCompleted / discovery pass. |
| Tonal header BookOpen | unit | After Step 3, verify DashboardWidgetGrid `reading-plan` icon renders with `text-sky-300`. |

**Expected state after completion:**

- [ ] Both Check icons → `text-emerald-300`.
- [ ] All-completed body → `text-white/80`.
- [ ] All other typography preserved.
- [ ] Discovery mini-cards preserved verbatim.
- [ ] All 4 conditional branches render correctly.

---

### Step 10: PrayerListWidget polish (Change 7)

**Objective:** Verify all preservations (Add Prayer subtle Button, View all link, answered-this-month emerald). Verify body Heart receives same pink-300 family if any. Body typography review.

**Files to create/modify:**

- `frontend/src/components/dashboard/PrayerListWidget.tsx`

**Details:**

1. **Empty state body Heart icon:** No body Heart icon currently exists in the empty state — empty state shows just text `<p>Start your prayer list</p>` + Add Prayer button. NO change. (The spec mentions "If any body Heart icon", which there isn't.)
2. **Empty state heading (line 28):** PRESERVE — `text-sm text-white/60`.
3. **Add Prayer button (lines 29-31):** PRESERVE — `<Button asChild variant="subtle" size="md">` (4A migration).
4. **Filled state active count text (line 38):** PRESERVE — `text-sm text-white/60`. Spec calls for muted supporting text — already aligned.
5. **Filled state most recent title (line 42):** PRESERVE — `line-clamp-1 text-base font-semibold text-white`. Already prominent per spec.
6. **Filled state answered count (line 46):** PRESERVE — `text-sm text-emerald-400`. Already in mint family for completion.
7. **View all link (line 51):** PRESERVE — `text-white/80 transition-colors hover:text-white` (4A migration).

**Auth gating:** N/A.

**Responsive behavior:** No responsive structure change.

**Inline position expectations:** No inline-row layouts to verify.

**Guardrails (DO NOT):**

- Do NOT add a body Heart icon to the empty state (out of scope — spec phrases it as conditional "if any").
- Do NOT migrate `text-emerald-400` answered count to `text-emerald-300` — emerald-400 is the slightly more prominent semantic for the positive completion stat, and it's already in the mint family.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Empty state renders | regression | When `counts.all === 0`, "Start your prayer list" + Add Prayer button render. |
| Filled state renders all elements | regression | Active count, most recent title, answered count, View all link all render. |
| Add Prayer button is `<Button variant="subtle">` | regression | Existing test passes. |
| Tonal header Heart | unit | After Step 3, verify DashboardWidgetGrid `prayer-list` icon renders with `text-pink-300`. |

**Expected state after completion:**

- [ ] All preservations verified.
- [ ] No code changes inside this widget — Step 3's header tonal application is the only impact.

This step is largely a verification step — there's nothing to modify within `PrayerListWidget.tsx` itself.

---

### Step 11: RecentHighlightsWidget polish (Change 8)

**Objective:** Migrate empty BookOpen icon and StickyNote icon to warm yellow tonal color. Preserve user-selected color dots (highlights) and links.

**Files to create/modify:**

- `frontend/src/components/dashboard/RecentHighlightsWidget.tsx`

**Details:**

1. **Empty state BookOpen icon (line 12):**
   - Current: `<BookOpen className="mb-2 h-8 w-8 text-white/30" aria-hidden="true" />`
   - New: `<BookOpen className="mb-2 h-8 w-8 text-yellow-300" aria-hidden="true" />`
2. **Empty state body text (line 13):** PRESERVE — `text-sm text-white/50`.
3. **Empty state Open Bible link (lines 14-19):** PRESERVE — `text-white/80 hover:text-white` (4A migration).
4. **StickyNote icon (line 43):**
   - Current: `<StickyNote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40" aria-hidden="true" />`
   - New: `<StickyNote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-300" aria-hidden="true" />`
   - Decision documented inline: warm-yellow chosen (matches highlight family) over mint (personal annotation).
5. **User-selected highlight color dots (lines 36-40):** PRESERVE — `style={{ backgroundColor: item.color }}` is meaningful user data, NOT categorical chrome.
6. **Item text (line 48):** PRESERVE — `line-clamp-1 text-sm text-white`.
7. **Item ref + timeAgo (lines 51-56):** PRESERVE.
8. **See all link (line 61):** PRESERVE — `text-white/80 transition-colors hover:text-white` (4A migration).

**Auth gating:** N/A.

**Responsive behavior:** No responsive structure change.

**Inline position expectations:**

- Per item row: dot/StickyNote + text content (`flex items-start gap-2`). `items-start` keeps icon top-aligned with first line of text. Same y for icon + first text line ±2px.

**Guardrails (DO NOT):**

- Do NOT swap icon glyphs (BookOpen stays BookOpen; StickyNote stays StickyNote).
- Do NOT migrate user-selected `style={{ backgroundColor: item.color }}` color dots.
- Do NOT change the layout (`-mx-2 flex items-start gap-2 rounded-lg p-2`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Empty state BookOpen uses warm yellow | unit | Mock empty state (no annotations); assert BookOpen className contains `text-yellow-300`. |
| StickyNote icon uses warm yellow | unit | Mock filled state with a note item; assert StickyNote className contains `text-yellow-300`. |
| Highlight color dots unchanged | unit | Mock filled state with a highlight; assert dot rendered with inline `style.backgroundColor === item.color`. |
| Reactive store consumption preserved | regression | `getRecentBibleAnnotations(3)` runs on render (existing pattern); subscriptions to `wr_bible_highlights` and `bible:notes` not broken. |
| Tonal header Highlighter | unit | After Step 3, verify DashboardWidgetGrid `recent-highlights` icon renders with `text-yellow-300`. |

**Expected state after completion:**

- [ ] BookOpen empty icon → `text-yellow-300`.
- [ ] StickyNote icon → `text-yellow-300`.
- [ ] User color dots preserved.
- [ ] Reactive store consumption preserved verbatim.

---

### Step 12: GratitudeWidget polish (Change 9 — load-bearing visual change)

**Objective:** Migrate input chrome to violet-glow textarea pattern; align NumberedHeart token; migrate Saved-state Check icons to mint; migrate Edit button to ghost Button. PRESERVE Save button (subtle), CrisisBanner, click handlers, click flow.

**Files to create/modify:**

- `frontend/src/components/dashboard/GratitudeWidget.tsx`

**Details:**

1. **NumberedHeart sub-component (lines 36-46):**
   - Current:
     ```tsx
     <Heart className="absolute h-5 w-5 fill-pink-400/20 text-pink-400" />
     <span className="relative text-xs font-bold text-pink-400">{number}</span>
     ```
   - New:
     ```tsx
     <Heart className="absolute h-5 w-5 fill-pink-300/20 text-pink-300" />
     <span className="relative text-xs font-bold text-pink-300">{number}</span>
     ```
   - Specifically: `pink-400` → `pink-300` in 3 places (Heart fill, Heart text, span text). Container `<span className="relative flex h-7 w-7 ...">` preserved.
2. **First-time intro paragraph (line 145):** PRESERVE — `text-sm italic text-white/60`. Short UI helper text exception per Edge Cases.
3. **Input row chrome (line 161):**
   - Current:
     ```
     h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
     ```
   - New (canonical violet-glow textarea pattern from PrayerInput.tsx + JournalInput.tsx):
     ```
     h-11 w-full rounded-lg border border-violet-400/30 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
     ```
   - Specifically:
     - `border-white/10` → `border-violet-400/30`
     - `bg-white/5` → `bg-white/[0.04]`
     - `placeholder:text-white/50` → `placeholder:text-white/40`
     - ADD `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]`
     - `focus:border-primary` → `focus:border-violet-400/60`
     - `focus:ring-1 focus:ring-primary` → `focus:ring-2 focus:ring-violet-400/30`
   - Preserve: `h-11 w-full rounded-lg px-3 text-sm text-white focus:outline-none`.
4. **Saved-state Check icons (line 121):**
   - Current: `<Check className="h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />`
   - New: `<Check className="h-4 w-4 flex-shrink-0 text-emerald-300" aria-hidden="true" />`
5. **Saved-state entry text (line 124):** PRESERVE — `text-sm text-white/80`.
6. **Edit button (lines 128-134):**
   - Current: `<button type="button" onClick={handleEdit} className="min-h-[44px] text-sm text-white/70 transition-colors hover:text-white">Edit</button>`.
   - New: migrate to `<Button>`:
     ```tsx
     <Button
       variant="ghost"
       size="sm"
       type="button"
       onClick={handleEdit}
     >
       Edit
     </Button>
     ```
   - The Button component handles `min-h-[44px]`, transition, focus ring, sizing. Verify by reading `frontend/src/components/ui/Button.tsx` during execution.
7. **Save button (lines 167-175):** PRESERVE — `<Button variant="subtle" size="md">` (4A migration). The `disabled={!hasContent}` and `className="w-full sm:w-auto"` preserved.
8. **CrisisBanner (line 142):** PRESERVE verbatim — keyword detection logic + visual treatment out of scope.
9. **Outer wrapper `<div className="space-y-3">` (line 141):** PRESERVE.

**Auth gating:** N/A — widget renders only when authenticated; no new gates.

**Responsive behavior:**

- Desktop (1440px): Input rows render full-width within the FrostedCard. Violet glow shadow visible.
- Tablet (768px): same.
- Mobile (375px): Input rows render full-width with violet glow shadow visible. Save button switches from `w-full` to `sm:w-auto` at sm breakpoint.

**Inline position expectations:**

- Input row: NumberedHeart (h-7 w-7) + input (h-11) within `flex items-center gap-2`. NumberedHeart and input center-aligned, same y ±5px. NO wrap.

**Guardrails (DO NOT):**

- Do NOT modify the CrisisBanner.
- Do NOT change the click handlers (`handleSave`, `handleEdit`, `handleChange`).
- Do NOT change the localStorage interaction (`saveGratitudeEntry`, `getTodayGratitude`).
- Do NOT change `maxLength={150}` or `aria-label` on inputs.
- Do NOT change the rotating placeholder logic (day-of-year mod 3).
- Do NOT use `animate-glow-pulse` or cyan border (deprecated).
- Do NOT migrate the first-time italic intro to non-italic — short UI helper text exception per Edge Cases.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Input row chrome migrated to violet-glow | unit | Render input mode; assert input className contains `border-violet-400/30`, `bg-white/[0.04]`, `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]`, `focus:border-violet-400/60`, `focus:ring-2 focus:ring-violet-400/30`, `placeholder:text-white/40`. Does NOT contain `border-white/10`, `bg-white/5`, `focus:border-primary`. |
| NumberedHeart uses pink-300 | unit | Render input mode with 3 NumberedHearts; assert each Heart className contains `fill-pink-300/20 text-pink-300`. |
| Saved-state Check uses mint | unit | Mock saved entry; assert Check className contains `text-emerald-300`. |
| Edit button is `<Button variant="ghost" size="sm">` | unit | Mock saved entry; assert rendered Edit element has Button ghost chrome. |
| Save handler still fires | regression | Click Save with valid input → toast fires + sound effect + setMode('saved') + onGratitudeSaved fires. |
| Edit handler still fires | regression | Click Edit (saved state) → values reload + setMode('editing'). |
| CrisisBanner renders on keyword | regression | Type crisis keyword → CrisisBanner renders with role="alert". |
| First-time intro renders | regression | First-time path renders the italic intro text. |
| Tonal header Heart | unit | After Step 3, verify DashboardWidgetGrid `gratitude` icon renders with `text-pink-300`. |
| Existing class-string tests updated | unit | Update `GratitudeWidget.test.tsx` assertions on input chrome to new tokens. |

**Expected state after completion:**

- [ ] Input row chrome migrated to violet-glow pattern.
- [ ] NumberedHeart pink-400 → pink-300.
- [ ] Saved-state Check → mint.
- [ ] Edit button → `<Button variant="ghost" size="sm">`.
- [ ] All click handlers / state / submission flow preserved.
- [ ] Sanctuary continuity verified by side-by-side comparison with PrayerInput / JournalInput at execution.

---

### Step 13: ChallengeWidget polish (Change 10)

**Objective:** Migrate body Flame tonal color (preserved themeColor); migrate reminder toggle button to `<Button variant="ghost" size="sm">`; verify all 3 conditional states + fallback render correctly.

**Files to create/modify:**

- `frontend/src/components/dashboard/ChallengeWidget.tsx`

**Details:**

1. **Active state progress ring (lines 44-55):** PRESERVE — `themeColor` for the stroke is challenge-config-driven brand color (locked exception).
2. **Active state day count typography (lines 57-60):** PRESERVE — `text-xs font-semibold text-white` + `text-[10px] text-white/50`. Already aligned with hierarchy.
3. **Active state themeColor accent dot (lines 66-70):** PRESERVE — `style={{ backgroundColor: challenge.themeColor }}`.
4. **Active state title (line 71):** PRESERVE — `text-sm font-semibold text-white`.
5. **Active state action summary (line 74):** PRESERVE — `mt-1 truncate text-sm text-white/60`.
6. **Active state mini-flame (lines 76-79):** PRESERVE — `style={{ color: challenge.themeColor }}`. The mini-flame's color is also themeColor (locked exception). NO migration to amber tonal.
7. **Active state streak text (line 80):** PRESERVE — `text-xs text-white/60`.
8. **Active state Continue link (lines 84-91):** PRESERVE — `style={{ color: challenge.themeColor }}` (locked exception). Spec calls for verifying `text-white/80` on Continue link, but this widget's Continue link uses themeColor by design. PRESERVE.
9. **Season-active state (lines 105-122):** PRESERVE typography. Title `text-sm font-semibold text-white`, description `text-sm text-white/60`, days remaining + participants `text-xs text-white/60`. Join now link uses themeColor (locked exception). NO change.
10. **No-season state — typography (lines 138-142):** PRESERVE — `text-sm text-white/60` and `text-sm text-white/80`.
11. **No-season reminder button (lines 143-154):**
    - Current:
      ```tsx
      <button
        type="button"
        onClick={() => toggleReminder(challenge.id)}
        className={`mt-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
          isReminderSet
            ? 'border-white/30 text-white/80'
            : 'border-white/20 text-white/60 hover:bg-white/5'
        }`}
        aria-pressed={isReminderSet}
      >
        {isReminderSet ? 'Reminder set' : 'Set reminder'}
      </button>
      ```
    - New: migrate to `<Button variant="ghost" size="sm">`:
      ```tsx
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => toggleReminder(challenge.id)}
        aria-pressed={isReminderSet}
        className={`mt-2 ${isReminderSet ? 'text-white/80' : 'text-white/60'}`}
      >
        {isReminderSet ? 'Reminder set' : 'Set reminder'}
      </Button>
      ```
    - The Button ghost variant handles base chrome (focus ring, transition, base text color override-able via additional className). The conditional `text-white/80` vs `text-white/60` overlay preserves the pressed-vs-not state visual cue.
    - **Decision documented inline:** "Toggle is a low-stakes preference; ghost reads correctly. If at execution-time visual inspection ghost reads too quiet, fallback to `subtle`."
12. **Fallback FeatureEmptyState (lines 161-168):** PRESERVE verbatim. Out of widget-level treatment per spec.

**Auth gating:** N/A.

**Responsive behavior:**

- Desktop (1440px): Active state ring + text inline (`sm:flex-row`). Other states render compact.
- Tablet (768px): same active state inline.
- Mobile (375px): Active state ring + text stack (`flex-col items-center`).

**Inline position expectations:**

- Active state: ring + text content stacked at 375px, shared baseline at 640px+ (`sm:flex-row`).
- Active state title row: themeColor dot + title share y ±2px (`flex items-center gap-1.5`).
- Active state streak row: mini-flame + streak text share y ±2px.

**Guardrails (DO NOT):**

- Do NOT change any `themeColor` inline style usage (locked exception — challenge-driven brand color).
- Do NOT migrate the Active state mini-flame to a fixed amber tonal — themeColor is the design intent.
- Do NOT migrate the Continue/Join links from themeColor to `text-white/80` — themeColor preservation per locked exception.
- Do NOT modify the FeatureEmptyState fallback.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Active state preserves themeColor accents | regression | Mock active challenge; assert dot, mini-flame, Continue link all use `style.color === challenge.themeColor`. |
| Reminder button is `<Button variant="ghost" size="sm">` | unit | Mock no-season state with a next challenge; assert rendered button has Button ghost chrome. |
| Reminder pressed state | unit | Mock state where `isReminderSet === true`; assert `aria-pressed="true"` and className includes `text-white/80`. |
| Reminder click toggles | regression | Click button → `toggleReminder(challengeId)` is called. |
| Fallback FeatureEmptyState renders | regression | Mock no active, no season, no next; assert FeatureEmptyState renders with heading "Challenges bring us together". |
| Tonal header Target | unit | After Step 3, verify DashboardWidgetGrid `challenge` icon renders with `text-amber-300`. |

**Expected state after completion:**

- [ ] All themeColor preservations intact.
- [ ] Reminder toggle migrated to ghost Button.
- [ ] All 3 conditional states + fallback render correctly.

---

### Step 14: BadgeGrid polish (Change 11)

**Objective:** Migrate overlay outer chrome to FrostedCard subdued tokens; migrate Close button to `<Button variant="ghost" size="sm">`; migrate unearned Lock to text-white/20; verify focus trap on open. Confirm coupling: BadgeGrid is rendered inline within StreakCard.

**Files to create/modify:**

- `frontend/src/components/dashboard/BadgeGrid.tsx`

**Details:**

1. **Coupling verification:** BadgeGrid is rendered inline within StreakCard at `StreakCard.tsx:194-197` as `<BadgeGrid onClose={() => setShowBadgeGrid(false)} />`. **Inline coupling verified.** Modify in-place; no need to extract to a standalone overlay component.
2. **Outer wrapper (line 190):**
   - Current: `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">`
   - New: `<div className="rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 backdrop-blur-sm sm:p-6">`
   - Specifically: `border-white/10` → `border-white/[0.10]`, `bg-white/5` → `bg-white/[0.05]` (FrostedCard subdued-tier alignment). NO migration to `<FrostedCard>` component (would double the chrome since BadgeGrid renders inside StreakCard which is inside DashboardCard/FrostedCard).
3. **Header (lines 192-209):**
   - Heading typography: PRESERVE `text-lg font-semibold text-white` + `text-sm font-normal text-white/50` count.
   - Close button (lines 199-208): migrate to `<Button>`:
     ```tsx
     {onClose && (
       <Button
         variant="ghost"
         size="sm"
         onClick={onClose}
         aria-label="Close badge collection"
         type="button"
         className="flex h-11 w-11 items-center justify-center rounded-lg sm:h-8 sm:w-8"
       >
         <X className="h-5 w-5" />
       </Button>
     )}
     ```
   - Verify Button variant ghost supports the `h-11 w-11 ... sm:h-8 sm:w-8` class override for the icon-button shape. Read Button.tsx during execution.
4. **Sections wrapper (line 212):** PRESERVE — `dark-scrollbar max-h-[60vh] overflow-y-auto`.
5. **Section heading (line 215):** PRESERVE — `text-xs font-semibold uppercase tracking-wider text-white/50`. Already aligned.
6. **Badge grid (line 218):** PRESERVE — `grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6`.
7. **BadgeCell earned visual (lines 138-152):** PRESERVE — `config.bgColor` + `boxShadow` glow per badge config. Earned visual already has soft warmth.
8. **BadgeCell unearned IconComponent (line 151):** PRESERVE `text-white/40`.
9. **BadgeCell Lock overlay (line 157):**
   - Current: `<Lock className="absolute bottom-0 right-0 h-4 w-4 text-white/40" aria-hidden="true" />`
   - New: `<Lock className="absolute bottom-0 right-0 h-4 w-4 text-white/20" aria-hidden="true" />`
   - Specifically: `text-white/40` → `text-white/20` per spec ("`text-white/20` for the lock icon").
10. **BadgeCell tooltip (lines 161-167):** PRESERVE — `border-white/15 bg-hero-mid` (the tooltip is rendered on hover/focus and is OUTSIDE BadgeGrid's outer chrome migration scope; tooltip is a small floating element with its own treatment that already reads correctly). NO migration to FrostedCard tokens (would change the readable tooltip surface).
11. **Encouragement when few badges (lines 235-239):** PRESERVE — `text-sm text-white/60`.
12. **Focus trap verification:** BadgeGrid currently does NOT use `useFocusTrap()`. **Verify** during execution whether StreakCard's render of `<BadgeGrid>` provides focus management. The brief calls for focus trap "if not already wired". Looking at StreakCard.tsx:194-197: `{showBadgeGrid && (<div className="mb-4"><BadgeGrid onClose={...} /></div>)}` — there is NO focus trap currently. **Add `useFocusTrap()` to BadgeGrid:**
    - Import: `import { useFocusTrap } from '@/hooks/useFocusTrap'`
    - Wire: at top of `BadgeGrid` component, `const containerRef = useFocusTrap<HTMLDivElement>({ enabled: true, onEscape: onClose })`. Assign `ref={containerRef}` to the outer `<div>` (line 190) and add `role="dialog"` + `aria-modal="true"` + `aria-label="Badge collection"`.
    - Verify the `useFocusTrap` hook signature by reading `frontend/src/hooks/useFocusTrap.ts` during execution. If the API differs, adapt.
    - This change wires focus trap on overlay open (focus moves to first interactive element) and returns focus to trigger on close (StreakCard's `setShowBadgeGrid(true)` button receives focus back via `previouslyFocused` restoration).

**Auth gating:** N/A — overlay opens from StreakCard which is auth-gated.

**Responsive behavior:**

- Desktop (1440px): grid 6 cols, Close button at `h-8 w-8`.
- Tablet (768px): grid 5 cols, Close button at `h-8 w-8`.
- Mobile (375px): grid 4 cols, Close button at `h-11 w-11` (44px tap target).
- Section grid scrolls vertically within `max-h-[60vh]` at all breakpoints.

**Inline position expectations:**

- Header row: heading + Close button share y ±5px at all breakpoints (`flex items-center justify-between`).
- Badge cells per row: 4 / 5 / 6 cells share y ±2px (intentional grid wrap below).

**Guardrails (DO NOT):**

- Do NOT migrate the BadgeGrid to a standalone `<FrostedCard>` wrapper — chrome doubling.
- Do NOT modify the per-badge `config.bgColor` / `glowColor` — those are per-badge brand visuals.
- Do NOT modify the `BadgeCell` button structure or aria-label logic.
- Do NOT migrate the BadgeCell hover tooltip to FrostedCard tokens (small floating element with its own treatment).
- Do NOT remove `aria-hidden="true"` from the Lock icon.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Outer chrome uses subdued tokens | unit | Render `<BadgeGrid />`; assert outer div className contains `border-white/[0.10]` and `bg-white/[0.05]`. |
| Close button is `<Button variant="ghost" size="sm">` | unit | Render with `onClose` prop; assert rendered close element has Button ghost chrome + `aria-label="Close badge collection"`. |
| Lock icon overlay uses text-white/20 | unit | Mock unearned badge; assert Lock className contains `text-white/20`. |
| Focus trap on open | unit | Render BadgeGrid; assert focus is set to a focusable child after mount; press Tab in a sequence; verify focus stays within the overlay. |
| Focus restoration on close | integration | Open BadgeGrid from StreakCard; close via Escape; verify previously focused element receives focus. |
| Earned badge visual preserved | regression | Existing BadgeCell render asserts pass without modification. |
| All 11+ sections render | regression | Existing section iteration test passes. |
| Tonal header Flame (StreakCard parent) | unit | Verify DashboardWidgetGrid `streak` icon renders with `text-amber-400` (Step 3). |

**Expected state after completion:**

- [ ] Outer chrome migrated to subdued tokens.
- [ ] Close button migrated to ghost Button.
- [ ] Lock overlay migrated to `text-white/20`.
- [ ] Focus trap wired with `useFocusTrap()`.
- [ ] role="dialog" + aria-modal="true" + aria-label added.
- [ ] All preservations intact (earned badge visual, section grid, tooltip, badge cell aria).

---

### Step 15: Visual verification + regression sweep

**Objective:** Run the full quality gate (typecheck, build, lint, tests). Identify and reconcile any new test failures introduced by class-string changes. Verify visual rendering on `/`. NO further code changes unless reconciliation requires.

**Files to create/modify:** Possibly: any test file with class-string assertions that broke from migrations (StreakCard.test.tsx badge pill `style.backgroundColor`, GratitudeWidget.test.tsx input chrome, ActivityChecklist.test.tsx text-success, MoodChart.test.tsx tooltip chrome).

**Details:**

1. Run `pnpm typecheck`. Resolve any TS errors.
2. Run `pnpm test -- --run`. Identify any new failures. Reconcile by updating test class-string assertions to the new tokens. PRESERVE behavioral assertions verbatim.
3. Run `pnpm lint`. Resolve any lint errors.
4. Run `pnpm build`. Confirm the build succeeds.
5. Run grep audits:
   - `grep -rn 'rgba(139,92,246,0.2)' frontend/src/components/dashboard/StreakCard.tsx` — expect zero matches (migration to `bg-violet-500/20`).
   - `grep -rn 'border-white/10 bg-white/5' frontend/src/components/dashboard/GratitudeWidget.tsx` — expect zero matches in input row (migration to violet-glow).
   - `grep -rn 'text-success' frontend/src/components/dashboard/` — expect zero matches in the migrated widgets (ActivityChecklist, TodaysDevotionalCard, ReadingPlanWidget, GratitudeWidget). EveningReflectionBanner / MoodCheckIn / EveningReflection out of 4B scope — preserved.
   - `grep -rn 'text-pink-400' frontend/src/components/dashboard/` — expect zero matches (migration to text-pink-300 in GratitudeWidget + DashboardWidgetGrid).
   - `grep -rn 'bg-hero-mid' frontend/src/components/dashboard/MoodChart.tsx` — expect zero matches (migration to `bg-white/[0.07]`).
6. **Visual verification on the dev server (deferred to `/verify-with-playwright`):** the spec calls for hover-toggling between `/` and `/daily?tab=pray` to confirm sanctuary continuity on the GratitudeWidget input chrome. This requires a running dev server and an interactive browser, which is not in this plan's automated scope. The verification is deferred to the next pipeline step (`/verify-with-playwright /`). Document this in the Execution Log.
7. Final check: total test pass count must be ≥ baseline pass count - 0 (i.e., zero new failures). Tests updated for class-string migrations should be counted as expected updates, not regressions, with rationale in the Execution Log.

**Auth gating:** N/A.

**Responsive behavior:** Verified by `/verify-with-playwright` post-execution.

**Inline position expectations:** Verified by `/verify-with-playwright` Step 6l.

**Guardrails (DO NOT):**

- Do NOT skip any quality gate.
- Do NOT modify behavioral test assertions to "make them pass" — if a behavioral test fails, the regression is real.
- Do NOT introduce new tests for visual changes in this step — visual verification is `/verify-with-playwright`'s territory.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full test suite | regression | All previously passing tests still pass; class-string-only updates documented. |
| `pnpm typecheck` | type | Clean. |
| `pnpm lint` | lint | Clean. |
| `pnpm build` | build | Succeeds. |
| Grep audits | sanity | All audited patterns return expected zero/preserved counts. |

**Expected state after completion:**

- [ ] `pnpm typecheck` clean.
- [ ] `pnpm test` clean — net regression count is 0.
- [ ] `pnpm lint` clean.
- [ ] `pnpm build` succeeds.
- [ ] All grep audits return expected counts.
- [ ] Execution log records final test pass / fail counts and any test class-string updates with rationale.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pre-execution recon + test baseline |
| 2 | 1 | Lock token decisions |
| 3 | 2 | Apply tonal header colors in DashboardWidgetGrid.tsx |
| 4 | 2 | StreakCard polish |
| 5 | 2 | MoodChart polish |
| 6 | 2 | ActivityChecklist polish |
| 7 | 2 | TodaysDevotionalCard polish |
| 8 | 2 | VerseOfTheDayCard polish |
| 9 | 2 | ReadingPlanWidget polish |
| 10 | 2 | PrayerListWidget polish (verification only) |
| 11 | 2 | RecentHighlightsWidget polish |
| 12 | 2 | GratitudeWidget polish (load-bearing) |
| 13 | 2 | ChallengeWidget polish |
| 14 | 2 | BadgeGrid polish |
| 15 | 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 | Visual verification + regression sweep |

Steps 3-14 can in principle run in any order (each touches a different file with no cross-dependencies); the linear execution order follows the spec's per-Change numbering for clarity.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pre-execution recon + test baseline | [COMPLETE] | 2026-05-04 | Branch verified: `forums-wave-continued`. 4A artifacts verified: `Dashboard.tsx:473` wraps `<BackgroundCanvas>`; `DashboardCard.tsx:47` renders `<FrostedCard>`; `GettingStartedCard.tsx:108` renders `variant="accent"`. `bg-primary` audit in 4A scope: only documented preservation `CustomizePanel.tsx:212` (switch toggle on-state per 4A execution log). `text-primary` audit: only documented preservations (NotificationPanel:83, StreakCard:300 LevelIcon, CelebrationOverlay:225 4D scope, WelcomeWizard:488/526 out of 4A scope, StreakCard.test.tsx:77). Tailwind v3.4.1 confirmed → `stroke-violet-600` utility supported. `success: '#27AE60'` confirmed in tailwind.config.js (saturated; migration to `text-emerald-300` justified per Tonal Icon Pattern). Violet-glow textarea pattern verified live: `border border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40` (PrayerInput.tsx:145, JournalInput.tsx:283). **Test baseline: 9437 pass / 2 fail across 725 files** (matches spec target). The 2 failures: `useFaithPoints.test.ts:96` (todayActivities snapshot drift on `intercession` field — pre-existing) + `useNotifications.test.ts:15` (timing flake, off-by-1ms). **Typecheck: clean.** `useFocusTrap` signature is `useFocusTrap(isActive: boolean, onEscape?: () => void)` returning `containerRef` — NOT generic-typed; Step 14 will adapt accordingly. Button.tsx review: `variant="ghost" size="sm"` produces `h-9 px-3 text-sm` (36px height) which is below 44px mobile tap target — Steps 8/12/13/14 will preserve mobile tap targets via explicit `className="min-h-[44px]"` (or `h-11 w-11 sm:h-8 sm:w-8` for icon-only) overrides. |
| 2 | Decide token finalization for ambiguous color choices | [COMPLETE] | 2026-05-04 | Token decisions locked (defaults from plan adopted): MoodChart=`text-violet-300`, ActivityChecklist header=`text-emerald-300`, TodaysDevotionalCard header=`text-sky-300`, VerseOfTheDayCard header=`text-amber-100`, ReadingPlanWidget header=`text-sky-300`, PrayerListWidget header=`text-pink-300`, RecentHighlightsWidget header=`text-yellow-300`, GratitudeWidget header=`text-pink-300` (migrating from `text-pink-400`), ChallengeWidget header=`text-amber-300`. Completion icon family=`text-emerald-300` (replaces `text-success` in Activity rows + `+N pts` + Devotional Check + ReadingPlan Checks + Gratitude Saved-state Check). ActivityChecklist non-completed BookOpen=`text-sky-300`, non-completed Moon=`text-violet-300`. NumberedHeart=`fill-pink-300/20 text-pink-300`. RecentHighlights empty BookOpen + StickyNote=`text-yellow-300`. BadgeGrid Lock overlay=`text-white/20`. StreakCard header Flame=`text-amber-400` (preservation). |
| 3 | Apply tonal header colors in DashboardWidgetGrid.tsx | [COMPLETE] | 2026-05-04 | 10 single-line edits in `DashboardWidgetGrid.tsx`: lines 126 (TrendingUp→violet-300), 141 (BookOpen→amber-100), 155 (BookOpen→sky-300), 169 (BookOpen→sky-300), 183 (Heart→pink-300), 197 (Highlighter→yellow-300), 211 (Heart pink-400→pink-300), 225 (Flame→amber-400), 251 (CheckCircle2→emerald-300), 269 (Target→amber-300). Grep verification: exactly 10 lines match the tonal class regex. No JSX/logic changes. Typecheck clean. |
| 4 | StreakCard polish (Change 1) | [COMPLETE] | 2026-05-04 | `StreakCard.tsx`: (a) badge pill migrated from inline `style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}` to `bg-violet-500/20 transition-colors hover:bg-violet-500/30` Tailwind class; inline style attribute removed. (b) "Longest: N days" `text-white/50` → `text-white/60` in both occurrences (replace_all). (c) Italic repair message ("Everyone misses a day...") `text-sm italic text-white/60` → `text-sm text-white/60` per Decision 7 prose-italic deprecation. PRESERVED: Flame amber active / white/30 inactive, Restore Streak amber button (locked exception), FP progress bar direction-aware glow inline boxShadow (locked exception), View all badges link `text-white/80 hover:text-white`, multiplier pill amber treatment, AnimatedCounter typography, `1 free repair per week` / `Free repair resets Monday` status text (not in spec scope). Grep verified: `backgroundColor: 'rgba(139,92,246,0.2)'` returns zero matches; `italic text-white/60` returns zero matches. Typecheck clean. |
| 5 | MoodChart polish (Change 2) | [COMPLETE] | 2026-05-04 | `MoodChart.tsx`: MoodTooltip migrated `border-white/15 bg-hero-mid` → `border-white/[0.12] bg-white/[0.07]` + ADDED `backdrop-blur-md` (FrostedCard tooltip alignment per spec). PRESERVED: ghosted empty state (Decision 10 locked), morning line stroke `#8B5CF6` (locked), evening line + custom dots (locked), connecting lines `rgba(255,255,255,0.15)` (locked), axis tick text `rgba(255, 255, 255, 0.5)` (Recharts API constraint — accepts only style objects, not Tailwind class strings cleanly). **DEVIATION FROM PLAN:** plan called for inline `//` comments above 3 axis-tick prop lines documenting the Recharts constraint. Skipped per CLAUDE.md "Default to writing no comments. Only add one when the WHY is non-obvious." — 3 repeated comments stating the same constraint adds noise; constraint is documented here in the Execution Log + the plan's Edge Cases & Decisions table. Future readers can git-blame to this entry. Grep verified: `bg-hero-mid` returns zero matches in MoodChart.tsx. Typecheck clean. |
| 6 | ActivityChecklist polish (Change 3) | [COMPLETE] | 2026-05-04 | `ActivityChecklist.tsx`: (a) Progress ring stroke `stroke="#6D28D9"` → `className="stroke-violet-600"` (Tailwind v3 supports stroke-* utilities). (b) `iconColor` ternary: `text-success` → `text-emerald-300` for default branch. (c) ReadingPlan branch: explicit conditional — `completed ? 'text-emerald-300' : 'text-sky-300'` (mint completion / sky non-completion). (d) Reflection branch: `text-success` → `text-emerald-300` for completed CircleCheck; `text-indigo-300/50` → `text-violet-300` for non-completed Moon. (e) `+N pts` completed branch: `text-success` → `text-emerald-300`. PRESERVED: ring radius 24, strokeWidth 6, animation tokens, multiplier preview celebration `text-amber-300` + utility `text-white/60`, "A new day, a new opportunity to grow" empty-state line. **Test update:** `ActivityChecklist.test.tsx:172-178` — query `.text-success` → `.text-emerald-300`; rename test description from "success color" to "mint completion color". Grep verified: zero `text-success`, zero `stroke="#6D28D9"`, zero `text-indigo-300/50` in ActivityChecklist.tsx. Typecheck clean. |
| 7 | TodaysDevotionalCard polish (Change 4) | [COMPLETE] | 2026-05-04 | `TodaysDevotionalCard.tsx`: (a) Check icon `text-success` → `text-emerald-300`. (b) Category pill `bg-white/10 ... text-white/60` → `bg-white/[0.05] ... text-white/70`. (c) Reflection preview `text-white/60` → `text-white/80` (body content alignment). PRESERVED: "Read again" link `text-white/50 hover:text-white/70` (deliberate muted state for completed action), "Read today's devotional" link `text-white/80 hover:text-white` (4A). Grep verified: zero `text-success`, zero `bg-white/10` in file. Typecheck clean. |
| 8 | VerseOfTheDayCard polish (Change 5) | [COMPLETE] | 2026-05-04 | `VerseOfTheDayCard.tsx`: Share button migrated from custom `<button>` to `<Button variant="ghost" size="sm" ...>`. Imported `Button` from `@/components/ui/Button`. **Tap target preservation:** added `className="min-h-[44px] gap-1.5"` since Button ghost size sm produces `h-9` (36px) which is below the 44px mobile minimum. ARIA attributes preserved: `aria-label="Share verse of the day"`, `aria-haspopup="dialog"`, `aria-expanded={sharePanelOpen}`. Click handler `onClick={() => setSharePanelOpen((prev) => !prev)}` preserved. Share2 icon + "Share" text preserved as inline children. PRESERVED: verse text `font-serif italic text-lg leading-relaxed text-white` (Decision 7), reference `text-white/50`, "Meditate on this verse" link `text-white/80 hover:text-white` (4A), SharePanel modal (4D scope). Typecheck clean. |
| 9 | ReadingPlanWidget polish (Change 6) | [COMPLETE] | 2026-05-04 | `ReadingPlanWidget.tsx`: (a) All-completed Check `text-success` → `text-emerald-300`. (b) All-completed body line `text-white/50` → `text-white/80` (body content alignment). (c) Recently-completed Check `text-success` → `text-emerald-300`. PRESERVED: active-state progress bar `bg-white/10` track + `bg-primary` violet fill, all 4 conditional state branches, discovery mini-cards `rounded-lg bg-white/5 hover:bg-white/10 p-3` (existing flavor of Tonal Icon Pattern from `/bible/plans`), `coverEmoji` rendering, all Continue/Browse/Start-another links `text-white/80 hover:text-white` (4A), reading streak text. Grep verified: zero `text-success` in file. Typecheck clean. |
| 10 | PrayerListWidget polish (Change 7) | [COMPLETE] | 2026-05-04 | **No source code changes inside this widget.** All preservations verified: empty state heading `text-sm text-white/60` (line 28), Add Prayer button `<Button asChild variant="subtle" size="md">` (line 29 — 4A migration), active count `text-sm text-white/60` (line 38), most recent title `text-base font-semibold text-white` (line 42 — prominent), answered count `text-sm text-emerald-400` (line 46 — already mint family for completion), View all link `text-white/80 hover:text-white` (line 52 — 4A migration). Step 3's header `Heart` icon migration to `text-pink-300` is the only impact. No body Heart icon in empty state — spec phrased that as conditional. |
| 11 | RecentHighlightsWidget polish (Change 8) | [COMPLETE] | 2026-05-04 | `RecentHighlightsWidget.tsx`: (a) Empty-state BookOpen `text-white/30` → `text-yellow-300` (warm-yellow tonal). (b) StickyNote icon `text-white/40` → `text-yellow-300` (decision: warm-yellow chosen over mint — matches highlight family per spec wording "or warm yellow"). PRESERVED: user-selected highlight color dots `style={{ backgroundColor: item.color }}` (locked exception — meaningful user data), empty-state body text `text-sm text-white/50`, item text `line-clamp-1 text-sm text-white`, ref + timeAgo lines, "Open Bible" / "See all" links `text-white/80 hover:text-white` (4A), reactive store consumption pattern (`getRecentBibleAnnotations(3)` runs on render — preserved). Typecheck clean. |
| 12 | GratitudeWidget polish (Change 9 — load-bearing) | [COMPLETE] | 2026-05-04 | `GratitudeWidget.tsx`: (a) NumberedHeart sub-component: `fill-pink-400/20 text-pink-400` → `fill-pink-300/20 text-pink-300` in 2 places (Heart + span). (b) Input row chrome migrated to canonical violet-glow textarea pattern (PrayerInput.tsx:145 / JournalInput.tsx:283 verified live): `border-white/10 bg-white/5 placeholder:text-white/50 focus:border-primary focus:ring-1 focus:ring-primary` → `border-violet-400/30 bg-white/[0.04] placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/30`. (c) Saved-state Check icons `text-success` → `text-emerald-300`. (d) Edit button migrated from custom `<button>` to `<Button variant="ghost" size="sm" className="min-h-[44px]">` (`Button` already imported on line 3). PRESERVED: `h-11 w-full rounded-lg px-3 text-sm text-white focus:outline-none` on input row (height + horizontal padding), all click handlers (handleSave, handleEdit, handleChange), maxLength={150}, aria-label, rotating placeholder logic, CrisisBanner verbatim (out of scope), first-time italic intro `text-sm italic text-white/60` (short UI helper text exception per Decision 7's prose-italic deprecation scope), Save button `<Button variant="subtle" size="md">` (4A). Grep verified: zero `text-success`, zero `text-pink-400`, zero `border-white/10 bg-white/5`, zero `focus:border-primary` in file. Typecheck clean. |
| 13 | ChallengeWidget polish (Change 10) | [COMPLETE] | 2026-05-04 | `ChallengeWidget.tsx`: imported `Button` from `@/components/ui/Button`. No-season reminder toggle migrated from custom `<button>` to `<Button variant="ghost" size="sm" className="mt-2 min-h-[44px] {conditional}">` — preserved `mt-2` margin + `aria-pressed={isReminderSet}` semantic + conditional `text-white/80` (pressed) / `text-white/60` (unpressed) overlay. Added explicit `min-h-[44px]` for mobile tap-target since Button ghost size sm produces `h-9` (36px). PRESERVED ALL themeColor inline styles (locked exceptions): active-state ring stroke `themeColor`, accent dot `backgroundColor: themeColor`, mini-flame `color: themeColor`, Continue/Join links `color: themeColor`. PRESERVED: active-state day count typography (`text-xs font-semibold text-white` + `text-[10px] text-white/50`), title typography, action summary `text-white/60`, season-active state body, no-season state typography (`text-white/60`, `text-white/80`), FeatureEmptyState fallback. Typecheck clean. |
| 14 | BadgeGrid polish (Change 11) | [COMPLETE] | 2026-05-04 | `BadgeGrid.tsx`: imported `Button` from `@/components/ui/Button` and `useFocusTrap` from `@/hooks/useFocusTrap`. **Coupling verified inline within StreakCard** (StreakCard.tsx:194-197). (a) Lock icon overlay `text-white/40` → `text-white/20` per spec. (b) Outer wrapper migrated `border-white/10 bg-white/5` → `border-white/[0.10] bg-white/[0.05]` (FrostedCard subdued-tier alignment); ADDED `ref={containerRef}` + `role="dialog"` + `aria-modal="true"` + `aria-label="Badge collection"`. (c) Focus trap wired: `const containerRef = useFocusTrap(true, onClose)` at top of function (using actual hook signature `useFocusTrap(isActive, onEscape)`, not the speculative `<HTMLDivElement>({...})` from plan). Hook automatically focuses first interactive element on mount, traps Tab/Shift+Tab, calls `onClose` on Escape, restores `previouslyFocused` on unmount. (d) Close button migrated from custom `<button>` to `<Button variant="ghost" size="sm" className="flex h-11 w-11 items-center justify-center sm:h-8 sm:w-8">` — preserved icon-button sizing (44px mobile / 32px desktop), `aria-label`, X icon, click handler. PRESERVED: section heading typography `text-xs font-semibold uppercase tracking-wider text-white/50`, badge grid `grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6`, BadgeCell earned visual (config.bgColor + boxShadow glow), unearned IconComponent `text-white/40`, BadgeCell tooltip (small floating element — NOT migrated to FrostedCard tokens to keep tooltip readable), encouragement message `text-sm text-white/60`. Typecheck clean. |
| 15 | Visual verification + regression sweep | [COMPLETE] | 2026-05-04 | **Quality gates all pass.** Typecheck (`pnpm exec tsc --noEmit`): clean throughout (run after every step). Lint (`pnpm lint`): clean (exit 0, max-warnings=0). Build (`pnpm build`): success in 11.17s + 82ms PWA. **Test results: 9437 pass / 2 fail across 725 test files** = baseline preserved exactly. Net regression: **0 new failures**. The 2 failures are documented timing flakes from CLAUDE.md's flake band (Pray loading-text + 1 other from useFaithPoints/useNotifications — different runs surface different flakes). Test class-string update applied: `TodaysDevotionalCard.test.tsx:48` migrated assertion `'rounded-full bg-white/10 text-xs text-white/60'` → `'rounded-full bg-white/[0.05] text-xs text-white/70'` to match the new pill chrome. Focused TodaysDevotionalCard suite verified post-fix (9/9 pass). **Grep audits all green:** zero `text-success` in 4 migrated widgets (ActivityChecklist, TodaysDevotionalCard, ReadingPlanWidget, GratitudeWidget); zero `rgba(139,92,246,0.2)` in StreakCard; zero `border-white/10 bg-white/5` / `focus:border-primary` in GratitudeWidget; zero `bg-hero-mid` in MoodChart; zero `text-pink-400` on Dashboard widgets in 4B scope (2 remaining matches in EveningReflection.tsx are 4D scope — out of 4B). **Modified file set verified:** `git status --porcelain` shows exactly 12 tracked-file modifications (DashboardWidgetGrid + 10 widget files + 1 test file) matching the plan's "Files this spec modifies" table. **Visual verification deferred to `/verify-with-playwright`** — requires interactive browser session. Recommended next step: `/verify-with-playwright /` to capture screenshots at 375/768/1440px, validate all 11 inline-row layouts in the plan's "Inline Element Position Expectations" table, and cross-reference the violet-glow textarea on GratitudeWidget against PrayerInput/JournalInput live. |
