# Post Round-3 Visual Rollout — Doc Reconciliation Audit

**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**In scope:** Commits between 2026-04-30 and 2026-05-07 (Spec 1 through Spec 13 of the visual rollout — 26 plan files).
**Audit goal:** Reconcile the documentation surface (`CLAUDE.md`, `.claude/rules/`, `.claude/skills/spec/SKILL.md`, `.claude/skills/plan/SKILL.md`, `_forums_master_plan/round3-master-plan.md`, `_forums_master_plan/spec-tracker.md`) against the shipped frontend code.

**Read-only research only.** No code changes were attempted during this audit. Discoveries that look like real product bugs are filed in `discoveries.md`, not fixed inline.

**Test baseline at audit time (post-Spec-13, 2026-05-07):**
9,830 pass / 1 fail across 1 file. The single failing test — `src/pages/__tests__/Pray.test.tsx:153` looking for "generating prayer for you" loading-state copy — appears to be a regression from one of the DailyHub 1B / Pray-related plans (not the `useFaithPoints` intercession failure that was the prior baseline). Filed in `discoveries.md`.

---

## Section 1 — Drift Inventory

This section enumerates every doc location with drift between what's written and what's actually shipped. Each row says: WHERE the drift is, WHAT'S WRONG, and WHAT IT SHOULD SAY (or pointer to Section 4 for proposed full diff).

### 1.1 — `CLAUDE.md`

| File:section | Drift | Should say |
|---|---|---|
| `CLAUDE.md` § Foundation feature summary (line 79) | "HorizonGlow on Daily Hub" — `HorizonGlow.tsx` has zero live consumers as of Spec 1A (DailyHub 1A). Dead code now. | Change to "BackgroundCanvas atmospheric layer (multi-bloom 5-stop gradient) on Daily Hub and most inner pages; HorizonGlow.tsx remains in-tree as orphaned legacy until a cleanup spec removes it." |
| `CLAUDE.md` § Build Health (line 165) | Baseline says 9,470 pass (post-Spec-5 of *Forums Wave* Phase 3 / not the visual rollout). Actual at audit: 9,830 pass / 1 new fail. Stale. | Refresh to "post-visual-rollout (Spec 13, 2026-05-07): 9,830 pass / 1 known fail (`Pray.test.tsx — shows loading then prayer after generating` looking for now-stale loading copy). The prior `useFaithPoints — intercession` and `useNotifications — sorted` flakes were not observed in the post-Spec-13 run." |
| `CLAUDE.md` § Implementation Phases | No mention of the visual rollout (HP-→BB- → AI Integration → Key Protection → **Round 3 Visual Rollout** → Forums Wave). The rollout ran in parallel with Forums Wave and is its own discrete chapter. | Add a paragraph after "Phase 3 — Forums Wave" describing the Round 3 Visual Rollout (2026-04-30 → 2026-05-07, 26 specs, every page except Prayer Wall migrated to canonical FrostedCard / BackgroundCanvas / muted-white-active-state / Pattern 2 white pill / GRADIENT_TEXT_STYLE / violet-glow textarea / Tonal Icon palette / BB-33 tokens). |
| `CLAUDE.md` § Working Guidelines | "Visual patterns live in `09-design-system.md`" — true *aspirationally*; the rollout introduced ~24 canonical patterns that are NOT in 09 yet. Following this directive today gives stale guidance. | Keep the rule, but note in the Reconciliation Report that 09 needs updates (Section 4.1 below) before the directive is reliable. |

### 1.2 — `.claude/rules/09-design-system.md`

This is the highest-impact drift target. The rollout shipped substantial new canonical patterns; the file documents either prior versions or omits them entirely.

| File:section | Drift | Should say (summary — see Section 4.1 for diff) |
|---|---|---|
| § "Daily Hub Visual Architecture" (~line 628) | Documents `HorizonGlow` as the canonical Daily Hub atmospheric layer with 5 specific opacity values. **DailyHub.tsx no longer imports HorizonGlow** — it uses `BackgroundCanvas` (in `components/ui/BackgroundCanvas.tsx`). HorizonGlow.tsx still exists but has no production consumers. | Replace with the canonical 5-stop `BackgroundCanvas` description. Document its inline gradient string, that it lives in `components/ui/`, and that it's used by Daily Hub plus most inner pages. Document HorizonGlow as a deprecated component pending removal. |
| § "Textarea Glow Pattern" (~line 188) | Documents the **white** box-shadow + cyan-as-deprecated. Actually the canonical was migrated to **violet-glow** during DailyHub 1B (Spec 4). | Replace the canonical class string with the violet-glow string the agent surfaced (`shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`). White-glow becomes a deprecated pattern. |
| § "FrostedCard Tier System" (Spec T) | Mentions Tier 1 / Tier 2 with eyebrow but doesn't document the **violet-leading-dot vs no-dot** distinction Spec DailyHub 2 added explicitly. Also mentions `rounded-2xl` — actual canonical is `rounded-3xl`. Default tier opacity says `bg-white/[0.06]` — actual canonical is `bg-white/[0.07]` (post-iteration-1). Accent tier opacity says `[0.04]` — actual is `[0.08]`. Accent border opacity says `/45` — actual is `/70`. | Update opacities to post-iteration-1 values; update radius to `rounded-3xl`; add the Tier 1 violet-dot eyebrow vs Tier 2 no-dot eyebrow paragraph. |
| § "Round 3 Visual Patterns" → "Glow Backgrounds — Homepage Only" | Implies homepage uses `GlowBackground`. True for some homepage sections. Misleading because BackgroundCanvas is now the primary atmospheric layer for non-homepage pages. | Re-frame as a sibling to BackgroundCanvas: "Homepage sections continue to use `GlowBackground` per-section. Inner pages use `BackgroundCanvas` at the page root (5-stop multi-bloom gradient). Daily Hub, Bible Landing, Bible MyBible, Bible plans, Local Support, Grow, Ask, Auth surfaces all use BackgroundCanvas. Settings and Insights are documented intentional drift — they stay on `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG`." |
| § "White Pill CTA Patterns" | Pattern 2 is approximately correct, but the agent flagged that recent specs (7, 13) reconciled CTAs to the verbatim canonical. Worth asserting the verbatim string is the only acceptable form. | Add a "verbatim only — drift is a regression" note. Add the canonical string for `text-hero-bg` (NOT `text-primary` — Spec 7 fix). |
| § "Section Heading — 2-Line Treatment" | Approximately correct. No drift, but Spec 13 made the homepage adopt this verbatim, so it's a good time to add a "consumed by these N pages" cross-reference. | Add a list: "Used by Daily Hub headings, Local Support hero, Grow hero, Ask hero, Settings hero, Insights hero, Music hero, RoutinesPage hero, RegisterPage hero, FinalCTA, DashboardPreview, DifferentiatorSection, StartingPointQuiz." |
| § "Animation Tokens (BB-33 — canonical)" | Correct. No drift. | (none) |
| § "Reduced-Motion Safety Net" | Correct. No drift. | (none) |
| § "Shared Components" → Layout / Navbar | Documents `Navbar.tsx` with `transparent` prop. Doesn't document that **Layout default flipped to `transparentNav: true`** in Spec 12. Implies opaque mode is alive. Actually opaque mode is retained only as defensive fallback; canonical production state is transparent. | Add: "Layout defaults `transparentNav: true` post-Spec-12. Opaque mode is retained as `transparentNav={false}` defensive fallback only." |
| § "Shared Components" → PageHero | No mention that PageHero exposes `ATMOSPHERIC_HERO_BG` as an exported constant (Spec 8C / 6A consolidated this). Some pages (Settings, Insights) use the constant directly without the PageHero component. | Document `ATMOSPHERIC_HERO_BG` and the Settings/Insights intentional drift. |
| § "Custom Hooks" → Bible Reactive Store Hooks | Pattern A list (`useMemorizationStore`, `useStreakStore`, `usePrayerReactions`) is missing **`useBibleProgress`** which became reactive Pattern A in Spec 8B. | Add `useBibleProgress` to the Pattern A list. |
| § "Round 3 Visual Patterns" — missing | No documentation of: **Button `variant="gradient"`**, **Button `variant="subtle"`**, **muted-white active-state pattern** (`bg-white/15 text-white border border-white/30`), **`text-violet-300` text-button on dark surfaces**, **Tonal Icon Pattern** (per-widget header icon palette), **Border opacity unification** (`border-white/[0.12]` is canon, `border-white/10` is drift), **Pill+halo tab bar** (`bg-violet-500/[0.13] border-violet-400/45 + violet halo`), **`<Link> + FrostedCard` group-hover pattern**, **AlertTriangle-icon-in-alertdialog-heading rule**, **muted destructive button** (`bg-red-950/30 border-red-400/30 text-red-100`), **adaptive pre-h1 greeting** (RoutinesPage 3-state). | Add a new sub-section "Post-Visual-Rollout Canonical Patterns" — or fold into existing sub-sections. See Section 4.1 for the detailed proposal. |
| § "Deprecated Patterns" table | Missing entries from the rollout: `border-l-4 border-l-primary/60` accent stripe → all-around violet border; `bg-white/[0.04]` default tier (now `[0.07]`); `bg-white/[0.02]` subdued; `bg-violet-500/[0.04]` accent (now `[0.08]`); cyan/white textarea glow (now violet); `bg-primary` solid CTAs; `text-primary` text-button on dark; `text-primary-lt` text-button on dark; `text-success`/`text-danger`; `bg-primary/80` overlays; `border-primary/40` AudioPill borders; `border-white/10` (now `[0.12]`); light dropdowns; `font-serif italic text-white/60` hero subtitles; `text-violet-900` on gradient Button (now `text-black`); `ring-primary` selected-card ring (now `ring-violet-400/60`); inline duplicate `ATMOSPHERIC_HERO_BG`; HorizonGlow on Daily Hub (now BackgroundCanvas); GlowBackground on inner pages; AuthModal trailing-period subtitles; saturated `bg-red-700/800` destructive; rolls-own `rounded-2xl border-white/10 bg-white/5 backdrop-blur-sm` cards; `STOP_ROUTINE` action name (canonical is `END_ROUTINE`); Layout `transparentNav: false` default; `bg-dashboard-dark` on RouteLoadingFallback; `aria-pressed` on radio-style answer options (use `role=radio` + `aria-checked`); Caveat font on h1/h2 outside wordmark/RouteLoadingFallback. | Append to the deprecated patterns table — see Section 4.1. |
| § "Music Feature — Technical Architecture" | Documents `bg-dashboard-dark` background + frosted glass cards. Spec 11A migrated the Music tabs but kept Music's atmospheric layer as the rolls-own approach (intentional drift) for audio engine integrity. Should be noted explicitly. | Add a sentence: "Music is documented intentional drift — it does NOT use `BackgroundCanvas` because the audio engine + cluster integrity (AudioProvider, audioReducer, AudioContext) is decoupled from the chrome layer. The canonical migration of Music chrome (Spec 11A) preserves this." |
| § "Error, Loading, and Empty States" | Spec 12 added canonical chrome for `RouteErrorBoundary` and `ChunkErrorBoundary` (FrostedCard wrap, RefreshCw icon, white-pill primary CTA, GRADIENT_TEXT_STYLE heading) — not yet documented here. | Add the post-Spec-12 chrome details to the Error sub-section. |

### 1.3 — `.claude/rules/04-frontend-standards.md`

| File:section | Drift | Should say |
|---|---|---|
| § "Component Patterns" — Textareas | Says "canonical white textarea glow class string from `09-design-system.md`". Once 09 is updated, this is fine — but the wording "white textarea glow" is itself wrong because the canonical is now violet. | Change "white textarea glow" → "violet textarea glow"; otherwise pointer to 09 stays accurate after 09 is updated. |
| § "Deprecated Patterns" | Doesn't include the rollout-introduced deprecations (Caveat-on-headings, `bg-primary` solid CTAs, `text-success`/`text-danger`, etc.). It only lists older deprecations. | Add a "post-rollout deprecations" cross-reference and include the new entries. |

### 1.4 — `.claude/rules/02-security.md`

| File:section | Drift | Should say |
|---|---|---|
| § "Bible Wave Auth Posture" | Describes that `/bible/my` and Bible reader features add zero auth gates. After Spec 8B, **`/bible/my` is now genuinely public** — this should be made explicit. Also `markChapterRead` no longer auth-gated post-Spec-8B (writes for all users). | Add an explicit bullet: "`/bible/my` is fully public post-Spec-8B; the device-storage banner (`wr_mybible_device_storage_seen`) explains data scope to logged-out users. `markChapterRead` no longer auth-gated; chapter visit writes happen on every chapter mount via `recordChapterVisit()`." |
| § "Auth Gating Strategy" | Adds context to "/login" route (which post-Spec-7 is a `<Navigate to="/?auth=login" replace />` redirect) and the `/?auth=login|register` query-param-driven AuthModal. | Add a sub-section "Query-param-driven AuthModal (Spec 7)" describing the new deep-link convention and `AuthQueryParamHandler` in `App.tsx`. |

### 1.5 — `.claude/rules/10-ux-flows.md`

| File:section | Drift | Should say |
|---|---|---|
| § "Navigation Structure" | Approximately correct. Layout default flipped to `transparentNav: true` in Spec 12 — every page uses transparent nav now. Worth a one-line note. | Add: "Post-Spec-12, Layout defaults `transparentNav: true` site-wide. The `transparent` prop on Navbar still exists; the canonical production mode is transparent on every page including non-hero pages." |
| § "Auth Flow" (if present) / cross-references | Need to document the `/?auth=login` and `/?auth=register` deep-link convention introduced by Spec 7. | Add a section or update existing auth flow with the query-param deep link. |

### 1.6 — `.claude/rules/11-local-storage-keys.md`

| File:section | Drift | Should say |
|---|---|---|
| § Music & Audio | `wr_routine_favorites` is documented (Spec 11C). ✓ | (none) |
| § Local Support | `wr_bookmarks_<category>` is documented. ✓ | (none) |
| § Engagement & Surprise Moments | `wr_mybible_device_storage_seen` is documented (Spec 8B). ✓ | (none) |
| Overall | This file is largely up-to-date with rollout work. | (none — minor cross-references could be added but no drift) |

### 1.7 — `.claude/rules/11b-local-storage-keys-bible.md`

| File:section | Drift | Should say |
|---|---|---|
| § "Reactive stores across the codebase" table | Missing **`useBibleProgress`** (joins Pattern A list as of Spec 8B). | Add `useBibleProgress` row with module path `hooks/useBibleProgress.ts` (or whichever path it lives at), Pattern A, Spec 8B. |

### 1.8 — `.claude/rules/12-project-reference.md`

| File:section | Drift | Should say |
|---|---|---|
| Public routes table | `/login` is listed as `ComingSoon` placeholder. **Spec 7 changed this** — it now redirects to `/?auth=login` via `<Navigate replace />`. | Update the row: `/login` → "Redirects to `/?auth=login` (Spec 7 — query-param-driven AuthModal)". Same for `/register` if it gained query param parity. |
| Public routes — missing | Document the `/?auth=login` and `/?auth=register` query-param deep-link behavior at the top of the routes section. | Add a one-paragraph section: "Query-param deep links (Spec 7): `/?auth=login` and `/?auth=register` open AuthModal in the corresponding mode on top of the home page. The legacy `/login` and `/register` routes redirect to these for back-compat." |

### 1.9 — `.claude/skills/spec/SKILL.md`

| File:section | Drift | Should say |
|---|---|---|
| Step 4 — "Read Existing Context" | Mandates `09-design-system.md` reads. Once 09 is updated for the rollout, this is fine. **Currently, 09 says HorizonGlow on Daily Hub and white textarea glow** — both wrong. So a spec generated today off this skill produces a stale spec. | No change needed to the skill itself; the fix is to update 09 (Section 4.1). After that, the skill is correct. |
| Step 5 — Template, Design Notes section | The template tells spec authors to "Reference design system from `.claude/rules/09-design-system.md`" — same dependency chain. Fine after 09 is updated. | (none) |
| Step 6 — Self-Review Checklist | Item: "New visual patterns flagged as new (so /plan marks values [UNVERIFIED])." This is correct as a process. | (none) |

### 1.10 — `.claude/skills/plan/SKILL.md`

| File:section | Drift | Should say |
|---|---|---|
| § "Design System Reminder" inline rule (~line 178) | Says "Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`." **Stale.** Daily Hub now uses `<BackgroundCanvas />`. | Replace with: "Daily Hub and most inner pages (Bible Landing, MyBible, Local Support, Grow, Ask, RegisterPage, etc.) wrap content in `<BackgroundCanvas>` (5-stop multi-bloom gradient at `components/ui/BackgroundCanvas.tsx`). Settings and Insights stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` (intentional drift). Music preserves rolls-own atmospheric layers (audio engine integrity). HorizonGlow.tsx is orphaned legacy." |
| § "Design System Reminder" inline rule (~line 180) | Says "Pray and Journal textareas use the canonical static white box-shadow glow." **Stale.** They use violet-glow. | Replace with: "Pray and Journal textareas use the canonical violet-glow pattern: `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`. White-glow and cyan-glow are deprecated." |
| § "Design System Reminder" — missing | Doesn't mention: **Button `variant="subtle"`** is the canonical secondary CTA on dark surfaces (replaces most `bg-primary` solid usage); **muted-white active-state** for selectable pills; **`text-violet-300` text-button** (replaces `text-primary` on dark for WCAG); **Tonal Icon Pattern** for widget headers; **`rounded-3xl`** for FrostedCard (replaces `rounded-2xl`); **Border opacity unification** (`border-white/[0.12]`). | Add a "Post-Visual-Rollout Canonical Patterns" bullet group — see Section 4.4. |
| § "Plan Quality Self-Review Checklist" — Item 21 | "No deprecated patterns are introduced" — points at the (out-of-date) 09 deprecated table. Once 09 is refreshed, this is correct. | (no change to skill needed; 09 update fixes this transitively) |
| § "Master plan data flows into Architecture Context" | Correct as written. | (none) |

### 1.11 — `_forums_master_plan/round3-master-plan.md` § Phase 5

See Section 2 below for the full per-spec assessment.

### 1.12 — `_forums_master_plan/spec-tracker.md` § Phase 5

The status column for specs 73 (5.1) through 77 (5.5) is `⬜`. Most are still pending — Prayer Wall has not been visually migrated yet. So the `⬜` status is technically correct. However, the **spec body text in the master plan** references stale terminology (HorizonGlow). See Section 2.

---

## Section 2 — Phase 5 Spec Assessments

Phase 5 of the Forums Wave master plan is "Visual Migration to Round 2 Brand" — scoped specifically to Prayer Wall. The Round 3 Visual Rollout (this audit's scope) migrated *every page except Prayer Wall*. Phase 5 is therefore still 100% relevant to Prayer Wall but its spec body text references some patterns that have evolved since the master plan was written.

**Reality check:** `frontend/src/components/prayer-wall/PrayerCard.tsx` line 53 still uses `rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm` — the exact inline pattern Spec 5.1 was supposed to replace. So Spec 5.1 is genuinely unstarted on Prayer Wall.

| # | Spec | Title | Recommended action | Rationale |
|---|---|---|---|---|
| 73 | 5.1 | FrostedCard Migration | **KEEP AS-IS, with body-text refresh** | Prayer Wall's inline `rounded-xl border-white/10 bg-white/[0.06]` chrome is unchanged. Spec is still valid. Body text should be refreshed to mention canonical post-rollout values: `rounded-3xl`, `bg-white/[0.07]` default, `bg-violet-500/[0.08]` accent, `border-violet-400/70`, eyebrow + violet-dot (Tier 1 only). Add reference to the now-canonical FrostedCard variant API (`variant: 'accent' \| 'default' \| 'subdued'` + `eyebrow` + `eyebrowColor` props). |
| 74 | 5.2 | HorizonGlow at Prayer Wall Root | **RESCOPE — rename to "BackgroundCanvas at Prayer Wall Root"** | HorizonGlow.tsx is orphaned legacy. The canonical inner-page atmospheric layer is `<BackgroundCanvas>` (5-stop gradient at `components/ui/BackgroundCanvas.tsx`). Spec body should be rewritten to use BackgroundCanvas; the four prayer-wall pages get `<BackgroundCanvas>` wrap. The opacity-range concern in the spec ("0.25-0.50") is moot for BackgroundCanvas (it has its own gradient stops) — that paragraph should be deleted. |
| 75 | 5.3 | 2-Line Heading Treatment | **KEEP AS-IS** | The canonical `<SectionHeading topLine bottomLine />` from `homepage/SectionHeading.tsx` is the correct primitive. Prayer Wall still uses its own pre-Round-2 `PrayerWallHero`. Spec is still valid. Body could be tightened to require `SectionHeading` specifically rather than the more abstract `<PageHero eyebrow= headline= />` (which is a different primitive and may not exist). |
| 76 | 5.4 | Animation Token Migration (BB-33) | **KEEP AS-IS** | BB-33 token migration is still relevant for any Prayer Wall component using hardcoded `200ms` / `cubic-bezier()`. The pattern documented in 09 is correct. |
| 77 | 5.5 | Deprecated Pattern Purge and Visual Audit | **KEEP AS-IS, with expanded acceptance criteria** | The acceptance-criteria checklist names a few deprecated patterns. The **post-rollout** deprecation list is much longer. The expanded list should include all post-rollout deprecations from Section 1.2 above. Estimating ~30 patterns to grep against Prayer Wall files instead of the current ~10. |
| 78 | 5.6 | Redis Cache Foundation | **KEEP AS-IS — UNAFFECTED** | Backend infrastructure spec, no relation to the visual rollout. |

**Recommended new addition (NEEDS_DECISION):** Should the Phase 5 phase header be retitled from "Visual Migration to Round 2 Brand" to "Prayer Wall Visual Migration"? The first wording was accurate when the master plan was written — at that time, Prayer Wall and the rest of the app shared the older Round-2 idiom and Phase 5 would migrate everything. Today, every other page already migrated outside Phase 5. The phase only delivers Prayer Wall now. Renaming would clarify intent. **Eric to decide.**

**Recommended new addition (NEEDS_DECISION):** Should we add a "Spec 5.0 — Architecture Context Refresh" stub that explicitly catalogs the canonical post-rollout patterns Phase 5 will apply to Prayer Wall (FrostedCard tier system, BackgroundCanvas, violet-glow textareas, muted-white active-state, etc.)? This would make Phase 5 self-contained without forcing readers to chase the rules files. **Eric to decide.**

---

## Section 3 — Proposed `CLAUDE.md` Updates

The proposed diffs below are written for `CLAUDE.md`. Format: Find → Replace blocks with full surrounding context.

### Diff 3.1 — Foundation feature summary (line 79)

**Find:**
```
…Design System (dark theme, frosted glass cards, HorizonGlow on Daily Hub, BB-33 canonical animation tokens), First-Run Welcome (BB-34, never on deep-linked routes).
```

**Replace with:**
```
…Design System (dark theme, frosted glass cards via `FrostedCard` tier system, `BackgroundCanvas` 5-stop atmospheric layer on Daily Hub and most inner pages, BB-33 canonical animation tokens), First-Run Welcome (BB-34, never on deep-linked routes).
```

### Diff 3.2 — Build Health (line 165)

**Find:**
```
**Frontend regression baseline (post-Spec-5):** 9,470 pass / 1 pre-existing fail across 1 file (`useFaithPoints — intercession` activity drift). A second flaky test, `useNotifications — returns notifications sorted newest first`, occasionally fails on tight timing — when it does, the baseline reads 9,469/2 across 2 files. The 4 Local Support test failures previously listed at this anchor were verified absent during Spec 5 (Change 15 / Step 18) — they were resolved by an earlier wave (likely Spec 4A/4B/4C) before Spec 5 landed. **Any NEW failing file or any increase in fail count after a Forums Wave spec lands is a regression.**
```

**Replace with:**
```
**Frontend regression baseline (post-Visual-Rollout Spec 13, 2026-05-07):** 9,830 pass / 1 known fail across 1 file (`Pray.test.tsx — shows loading then prayer after generating` looking for the loading-state copy "generating prayer for you" that may have been bypassed by an animation-timing change during DailyHub 1B). The prior `useFaithPoints — intercession` and `useNotifications — sorted newest first` flakes from the post-Spec-5 baseline were not observed in the post-Spec-13 run. **Any NEW failing file or any increase in fail count after a Forums Wave spec or visual rollout spec lands is a regression.**
```

### Diff 3.3 — Implementation Phases (after the Forums Wave paragraph)

**Find:**
```
**Phase 4 — Light Mode & Native Prep** (deferred) — Light mode toggle, real TTS audio files, performance optimization, native app planning.
```

**Replace with:**
```
**Round 3 Visual Rollout** ✅ Merged 2026-05-07 (parallel with Forums Wave). 26 specs across 8 days migrated every page except Prayer Wall to canonical Round-3 patterns: `FrostedCard` tier system (`accent` / `default` / `subdued` with `rounded-3xl`, eyebrow + violet leading dot for Tier 1), `BackgroundCanvas` 5-stop multi-bloom atmospheric layer, violet-glow textarea (`shadow-[0_0_20px...0_0_40px...] border-violet-400/30`), muted-white active-state for selectable pills (`bg-white/15 text-white border-white/30`), `Button variant="gradient"` and `variant="subtle"` (replacing most `bg-primary` solid usage), `text-violet-300` text-button (replacing `text-primary` on dark surfaces for WCAG AA), Tonal Icon Pattern for widget headers, border opacity unification (`border-white/[0.12]`), GRADIENT_TEXT_STYLE on every h1/h2 outside wordmark/RouteLoadingFallback, Layout default `transparentNav: true`, query-param-driven AuthModal (`/?auth=login|register`). Patterns documented in `09-design-system.md`. Prayer Wall migration is the focus of Forums Wave Phase 5.

**Phase 4 — Light Mode & Native Prep** (deferred) — Light mode toggle, real TTS audio files, performance optimization, native app planning.
```

### Diff 3.4 — Working Guidelines (no diff needed)

The "Visual patterns live in `09-design-system.md`" guideline is correct in principle. After Section 4.1's diff lands, it becomes accurate. No CLAUDE.md change needed.

---

## Section 4 — Proposed Rule File Updates

Each sub-section below provides per-file proposed diffs (or pointers to the ones large enough to be summarized rather than literally rendered).

### 4.1 — `09-design-system.md`

This is the largest delta. Proposed changes by section, in file order.

#### Diff 4.1.1 — Replace § "Daily Hub Visual Architecture (Spec Y + Wave 7)" with a renamed and rewritten § "BackgroundCanvas Atmospheric Layer (Visual Rollout)"

**Find:** Entire current section starting at "### Daily Hub Visual Architecture (Spec Y + Wave 7)" through the StarField paragraph.

**Replace with:** A rewritten section that covers:
1. The canonical `BackgroundCanvas` component at `components/ui/BackgroundCanvas.tsx`, its 5-stop CANVAS_BACKGROUND constant (top violet bloom → mid-right violet → bottom-left violet → dark center vignette → diagonal linear), `min-h-screen overflow-hidden`, `data-testid="background-canvas"`.
2. The canonical inline gradient string (literal copy from the file).
3. Pages using BackgroundCanvas: DailyHub, BibleLanding, MyBiblePage, BiblePlanDetail, BiblePlanDay, PlanBrowserPage, ReadingPlanDetail, ChallengeDetail, GrowPage, LocalSupportPage, AskPage, RegisterPage, CreatePlanFlow.
4. Pages with intentional drift: Settings and Insights stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` (Direction Decision per Spec 10A). Music preserves rolls-own atmospheric layers (audio engine integrity, Spec 11A).
5. HorizonGlow.tsx is orphaned legacy as of Spec 1A (DailyHub 1A); remains in-tree pending a cleanup spec.
6. StarField was experimented with and removed (preserved from current section).

#### Diff 4.1.2 — Update § "Textarea Glow Pattern"

**Find:** Current paragraph including the `shadow-[0_0_20px_3px_rgba(255,255,255,0.50)...]` white-glow string.

**Replace with:** The violet-glow canonical that's actually in production:
```
shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
border border-violet-400/30 bg-white/[0.04]
focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
placeholder:text-white/40
```

Update applies-to list: PrayerInput, JournalInput, GratitudeWidget input (Spec 4B), CreatePlanFlow textarea (Spec 6C), AskPage question textarea (Spec 9). Note the white-glow and cyan-glow are now deprecated.

#### Diff 4.1.3 — Update § "FrostedCard Tier System (Spec T)"

**Find:** Current sub-section.

**Replace with:** Update the values to post-iteration-1 canonical:

- Default tier opacity: `bg-white/[0.07]` (was `bg-white/[0.04]`)
- Accent tier surface: `bg-violet-500/[0.08]` (was `[0.04]`); border: `border-violet-400/70` (was `/45`)
- All tiers use `rounded-3xl` (NOT `rounded-2xl` from earlier)
- Add the eyebrow + violet-leading-dot signature for Tier 1 (`<FrostedCard variant="accent" eyebrow="..." eyebrowColor="violet">` — renders dot + uppercase tracked label `text-violet-300 font-semibold tracking-[0.15em]`).
- Reaffirm Tier 2 is the rolls-own callout idiom (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04]` plus eyebrow with NO leading dot, label-only `text-white/50`). The left-stripe IS the Tier 2 visual signature; the violet dot is Tier 1's signature.
- Document `variant="subdued"` (Spec 1, Spec 6B) — reduced surface opacity for sub-content panels.

#### Diff 4.1.4 — Update § "White Pill CTA Patterns" — Pattern 2

**Find:** Current Pattern 2 string.

**Replace with:** Confirm `text-hero-bg` (NOT `text-primary` — Spec 7 reconciliation). Add a "verbatim only" note: any drift from the canonical class string is a regression. Reference the post-Spec-13 reconciliation across DashboardPreview, FinalCTA, RegisterPage.

#### Diff 4.1.5 — New § "Button Component Variants (Visual Rollout)"

**Add new sub-section** documenting:
- `variant="primary"` — legacy `bg-primary` solid; deprecated for new code.
- `variant="secondary"` — legacy.
- `variant="outline"` — legacy.
- `variant="ghost"` — `text-white/80 hover:text-white hover:bg-white/5` on dark surfaces (Spec 6, "make-it-right"). Older `text-primary hover:bg-primary/5` is deprecated.
- `variant="light"` — light pill, used pre-rollout.
- `variant="gradient"` — violet gradient pill (`from-violet-400 to-violet-300`, `text-black` post-iteration-1 — earlier `text-violet-900` was deprecated). Used for emotional-peak CTAs ("Help Me Pray", "Save Entry", "Generate"). Canonical `size="lg"`.
- `variant="subtle"` — frosted pill (`rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 gap-2 font-medium min-h-[44px]`). Default secondary CTA on dark surfaces — replaces most `bg-primary` solid uses (Spec 4A counted 12+ instances migrated).
- `variant="alertdialog"` — added in Spec 10A. Used in destructive confirmations.
- `asChild` prop — Button polymorphic via `cloneElement` so it can wrap a `<Link>` while preserving styling.

#### Diff 4.1.6 — New § "Active-State and Selection Patterns (Spec 10A canonical)"

**Add new sub-section** documenting:
- **Muted-white isolated pill** (canonical for `RadioPillGroup`, settings tabs, tonal-pill TimeRange selector): `bg-white/15 text-white border border-white/30`.
- **Muted-white active foreground** (canonical for active foreground without border, e.g., active sidebar item): `bg-white/15 text-white`.
- **Pill+halo tab bar** (canonical for tabbed views — DailyHub, Music, Local Support, Grow): outer `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`; active tab `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`.
- **Selected card ring** (canonical for selectable cards): `ring-violet-400/60`. The pre-rollout `ring-primary` is deprecated.

#### Diff 4.1.7 — New § "Text-Button Pattern (Spec 10A WCAG AA fix)"

**Add new sub-section** documenting:
- Canonical text-button color on dark surfaces: `text-violet-300 hover:text-violet-200`.
- Pre-rollout `text-primary` and `text-primary-lt` are deprecated for text-buttons on dark backgrounds (fail WCAG 4.5:1 floor on `bg-hero-bg`).
- Spec 10A's audit migrated all known instances.

#### Diff 4.1.8 — New § "Tonal Icon Pattern (Dashboard widgets — Spec 4B)"

**Add new sub-section** documenting:
- Per-widget header icon color taxonomy: `text-pink-300` (gratitude family), `text-sky-300` (insight/data family), `text-violet-300` (default/spiritual family), `text-emerald-300` (positive/success family), `text-amber-100` / `text-amber-300` (recap/seasonal family), `text-yellow-300` (achievement family).
- Lucide icon stroke color via Tailwind text-color class.
- Applied via `DashboardWidgetGrid.tsx` icon prop.
- Severity-tonal split for status indicators: `text-emerald-300` / `text-red-300` / `text-amber-300` (replaces `text-success`/`text-danger`/`text-warning` which referenced old palette).

#### Diff 4.1.9 — New § "Border Opacity Unification"

**Add a one-paragraph rule:** All decorative card and chrome borders on dark surfaces use `border-white/[0.12]` (NOT `border-white/10`). This was unified across the audio cluster (Spec 11A) and applies app-wide. Tighter (`border-white/[0.18]`) acceptable on hover-emphasis. Looser (`border-white/[0.08]`) acceptable for pill tabs' outer border.

#### Diff 4.1.10 — New § "Shared Components — Cross-surface card pattern (Spec 3)"

**Add a one-paragraph rule:** Navigable cards use the `<Link> + FrostedCard` group-hover pattern: outer `<Link className="block group focus-visible:outline-none focus-visible:ring-2 ring-white/50 rounded-3xl">` with inner `<FrostedCard variant="default" as="article" className="group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5">`. FrostedCard does NOT receive `onClick`; the Link handles navigation. This is the canonical for EchoCard, VersePromptCard, PlanBrowseCard, ListingCard, etc.

#### Diff 4.1.11 — New § "AlertDialog Pattern (Spec 10A / 11B canonical)"

**Add a one-paragraph rule:** Destructive confirmations (DeleteAccountModal, DeleteRoutineDialog, DeletePrayerDialog) use:
- `<Button variant="alertdialog">` for the destructive action (semantic discipline).
- `AlertTriangle` icon in the heading row.
- Muted destructive treatment (`bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`) — saturated `bg-red-700/800` is deprecated.

#### Diff 4.1.12 — Append to § "Deprecated Patterns" table

Add the following new rows (one per pattern). Truncated for the report — full list is the deprecation block in the agent's summary, restated in Section 1.2 above. ~30 new entries.

#### Diff 4.1.13 — Update § "Music Feature — Technical Architecture"

**Add a one-paragraph note** clarifying that Music chrome was migrated in Spec 11A but the atmospheric layer is intentionally NOT BackgroundCanvas — Music preserves rolls-own atmospheric layers because the audio engine + AudioProvider + audioReducer + AudioContext form a load-bearing cluster that should be touched as little as possible.

#### Diff 4.1.14 — Update § "Reactive Store Pattern" (and the Custom Hooks section)

Add `useBibleProgress` to the Pattern A list (subscription via standalone hook). Spec 8B converted it.

#### Diff 4.1.15 — Update § "Error, Loading, and Empty States"

Add canonical chrome details for `RouteErrorBoundary` and `ChunkErrorBoundary` (Spec 12): FrostedCard tier 1 wrap, `role="alert"`, lucide RefreshCw icon, white-pill primary CTA, GRADIENT_TEXT_STYLE heading.

### 4.2 — `04-frontend-standards.md`

#### Diff 4.2.1 — § "Component Patterns" — Textareas line

**Find:** "use the canonical white textarea glow class string from `09-design-system.md`"

**Replace with:** "use the canonical violet textarea glow class string from `09-design-system.md` § Textarea Glow Pattern"

#### Diff 4.2.2 — § "Deprecated Patterns" — append the post-rollout entries

Add cross-reference: "See `09-design-system.md` § Deprecated Patterns for the post-Visual-Rollout deprecations (Caveat-on-headings outside wordmark/RouteLoadingFallback, `bg-primary` solid CTAs, `text-success`/`text-danger`, `border-white/10` unification, etc.)."

### 4.3 — `02-security.md`

#### Diff 4.3.1 — § "Bible Wave Auth Posture"

**Add bullets:**
- "/bible/my is fully public post-Spec-8B (Visual Rollout). Logged-out users see the device-storage banner (`wr_mybible_device_storage_seen`) explaining data scope."
- "`markChapterRead` is no longer auth-gated post-Spec-8B. Chapter visit writes happen on every chapter mount via `recordChapterVisit()`."

#### Diff 4.3.2 — § "Auth Gating Strategy" — new sub-section

**Add new sub-section:**
- "**Query-param-driven AuthModal (Spec 7 — Visual Rollout):** `/?auth=login` and `/?auth=register` are deep links that open the AuthModal in the corresponding mode on top of the home page. Implemented via `AuthQueryParamHandler` in `App.tsx` which reads `useSearchParams` on every render. The legacy `/login` route redirects to `/?auth=login` (`<Navigate to=... replace />`). Used for cross-surface auth-gating CTAs that previously hard-routed to `/login`."

### 4.4 — `10-ux-flows.md`

#### Diff 4.4.1 — § "Navigation Structure" — append

**Add:** "Post-Spec-12 (Visual Rollout), `Layout` defaults `transparentNav: true`. The transparent overlay navbar is the canonical production state on every page including non-hero pages. Opaque mode is retained as `transparentNav={false}` defensive fallback only."

#### Diff 4.4.2 — Add new § "Auth Surface Deep Links (Spec 7)"

**Add new section** documenting `/?auth=login` and `/?auth=register` query-param convention. (Same content as Diff 4.3.2 but framed as a UX flow rather than a security policy.)

### 4.5 — `11b-local-storage-keys-bible.md`

#### Diff 4.5.1 — § "Reactive stores across the codebase" table

Add a row:
```
| `wr_bible_progress` (or relevant key)| `lib/bible/...` (path) | `useBibleProgress()` hook (Pattern A) | Spec 8B  | 11b           |
```

(Verify exact storage key and module path during execution — the agent flagged this hook joined Pattern A but didn't capture the exact storage key it backs.)

### 4.6 — `12-project-reference.md`

#### Diff 4.6.1 — Public routes table — `/login` row

**Find:** `| `/login` | `ComingSoon` | Login placeholder (stub) |`

**Replace with:** `| `/login` | Redirect → `/?auth=login` | Spec 7 redirect to query-param-driven AuthModal |`

#### Diff 4.6.2 — Add a top-of-section paragraph

**Add before the public routes table:** "Query-param deep links (Spec 7 — Visual Rollout): `/?auth=login` and `/?auth=register` open AuthModal in the corresponding mode on top of `/`. The legacy `/login` and `/register` direct routes redirect to these for back-compat. Documented in `02-security.md` § Auth Gating Strategy."

---

## Section 5 — Proposed Skill Updates

### 5.1 — `.claude/skills/spec/SKILL.md`

No skill-file changes required. Skill correctly directs spec authors to read `09-design-system.md`. Once Section 4.1's diffs land, the skill's recommendations become accurate again. The skill itself does not encode design-system knowledge — it points at the rules file, which is the right architecture.

### 5.2 — `.claude/skills/plan/SKILL.md`

Updates needed in the inline "Design System Reminder" block (~lines 175-189 of the skill). The block is a verbatim text the `/execute-plan` skill displays before each UI step, so its accuracy directly affects implementation.

#### Diff 5.2.1 — Replace HorizonGlow bullet (~line 178)

**Find:**
```
- The Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`. Do NOT add `GlowBackground` to Daily Hub components. GlowBackground is still used by the homepage.
```

**Replace with:**
```
- The Daily Hub and most inner pages (Bible Landing, MyBible, Local Support, Grow, Ask, RegisterPage, etc.) wrap content in `<BackgroundCanvas>` (5-stop multi-bloom gradient at `components/ui/BackgroundCanvas.tsx`). Settings and Insights stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` (intentional drift per Spec 10A). Music preserves rolls-own atmospheric layers (audio engine integrity per Spec 11A). HorizonGlow.tsx is orphaned legacy as of Visual Rollout Spec 1A. GlowBackground remains active on the homepage only.
```

#### Diff 5.2.2 — Replace textarea-glow bullet (~line 180)

**Find:**
```
- Pray and Journal textareas use the canonical static white box-shadow glow: `shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] border border-white/30 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30`. Do NOT use `animate-glow-pulse` (deprecated) or cyan border (deprecated).
```

**Replace with:**
```
- Pray and Journal textareas use the canonical violet-glow pattern (DailyHub 1B / Visual Rollout): `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`. Same pattern applies to GratitudeWidget input, CreatePlanFlow textarea, and AskPage question textarea. Do NOT use `animate-glow-pulse` (deprecated), white-glow shadow (deprecated post-Visual-Rollout), or cyan border (deprecated).
```

#### Diff 5.2.3 — Add new bullets after the white pill CTA bullet

**Add after the existing white pill CTA bullet:**
```
- Default secondary CTA on dark surfaces is `<Button variant="subtle">` (frosted pill: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:-translate-y-0.5`). Replaces most `bg-primary` solid usage post-Visual-Rollout. Default emotional-peak CTA is `<Button variant="gradient" size="lg">` (text-black, NOT text-violet-900). Default text-button on dark is `text-violet-300 hover:text-violet-200` (NOT `text-primary`).
- Selectable pills (settings tabs, time-range selectors, RadioPillGroup) use the muted-white active-state: `bg-white/15 text-white border border-white/30`. Tab bars use the pill+halo treatment: outer `bg-white/[0.07] border-white/[0.08]`, active tab `bg-violet-500/[0.13] border-violet-400/45 + violet halo shadow`.
- Border opacity unification (Visual Rollout): all decorative card/chrome borders on dark use `border-white/[0.12]`, NOT `border-white/10`. Tighter (`/[0.18]`) acceptable for hover emphasis.
- FrostedCard tier system (Visual Rollout): `accent | default | subdued`, `rounded-3xl`, `bg-white/[0.07]` (default) / `bg-violet-500/[0.08]` (accent) / `bg-white/[0.05]` (subdued). Tier 1 (accent) eyebrow renders with violet leading dot; Tier 2 (rolls-own scripture callout `border-l-4 border-l-primary/60`) eyebrow renders with NO dot — left-stripe is its visual signature.
- Caveat font is now restricted to wordmark and RouteLoadingFallback only. Every other h1/h2 on dark surfaces uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`).
- Layout default flipped to `transparentNav: true` post-Spec-12. Opaque mode is retained only as `transparentNav={false}` defensive fallback.
- Severity color refresh: `text-success` and `text-danger` (CSS variables) are deprecated; use `text-emerald-300` / `text-red-300` directly. Muted destructive button treatment: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`.
- AlertDialog pattern: destructive confirmations use `<Button variant="alertdialog">` plus `AlertTriangle` icon in the heading row.
```

These bullets are ordered to ensure execute-plan's mid-implementation reminders are first about high-impact errors (BackgroundCanvas, textarea glow, button variants) and then about smaller-impact nuances (border opacity, severity colors, AlertDialog).

#### Diff 5.2.4 — Plan Quality Self-Review Checklist

No changes needed — Item 21 ("No deprecated patterns are introduced") points at 09-design-system.md, which after Section 4.1 will be authoritative.

### 5.3 — Other skills (`/spec-forums`, `/plan-forums`, `/execute-plan`, `/code-review`, `/verify-with-playwright`)

Out of scope for this audit per the task brief. Could surface drift in a follow-up audit if needed — particularly `/code-review` may want updated lint heuristics for the new deprecated patterns.

---

## Section 6 — Open Questions for Eric

These are decisions that should be made before Section 4/5 diffs are executed:

1. **Phase 5 phase header rename.** Should "Visual Migration to Round 2 Brand" become "Prayer Wall Visual Migration"? The original wording referred to the *whole* of Round 2's visual idiom; today it really only delivers Prayer Wall (every other page already migrated outside Phase 5). Renaming clarifies intent. **Recommendation: rename.**

2. **Add a "Spec 5.0 — Architecture Context Refresh" stub?** A short prelude that explicitly catalogs the canonical post-rollout patterns Phase 5 will apply (FrostedCard tier system, BackgroundCanvas, violet-glow textareas, muted-white active-state, etc.). This would make Phase 5 self-contained without forcing readers to chase rules files. **Recommendation: add as a thin stub spec, not a full spec.**

3. **HorizonGlow.tsx cleanup spec.** HorizonGlow.tsx and its test file are orphaned legacy. The cleanest move is to delete them in a small dedicated cleanup spec rather than letting the orphans accumulate. **Recommendation: file as a discovery in `discoveries.md` and let a future cleanup spec take it.** (Already filed.)

4. **Failing Pray test (`Pray.test.tsx:153`).** The "generating prayer for you" loading copy still exists in `PrayerResponse.tsx:204`. The test failure suggests the loading state isn't being rendered when the test queries — likely an animation-timing or state-ordering change introduced during DailyHub 1B. Real product bug, not docs drift. **Recommendation: file as a discovery (already filed); fix in a follow-up.**

5. **Music intentional-drift documentation.** Music is documented as "intentional drift — preserves rolls-own atmospheric layers for audio engine integrity." Should this be a hard rule (no spec ever migrates Music to BackgroundCanvas) or a soft preference (any future Music spec can revisit if there's a strong reason)? **Recommendation: hard rule; cite the cluster integrity reason in `09-design-system.md`. Documented as such in the proposed diff.**

6. **`useBibleProgress` storage key.** I flagged that `useBibleProgress` joined reactive Pattern A (per Spec 8B) but didn't verify the exact storage key it backs. Before executing Diff 4.5.1, run `grep` for `useBibleProgress` and `useSyncExternalStore` to confirm the module path and the localStorage key. **Recommendation: verify during Step 5 execution.**

7. **`InsightsDataContext` documentation scope.** Spec 10B introduced `InsightsDataContext` as a centralized data-read pattern. Should this be documented in `09-design-system.md` as a reusable template (similar to `AudioProvider`), or is it an Insights-specific implementation detail? **Recommendation: document as Insights-specific for now; if a second consumer adopts the pattern in a future spec, promote it to canonical.**

8. **Master plan Phase 5 spec body refreshes.** Spec 5.1 / 5.2 / 5.5 body text should be refreshed to reference the post-rollout canonical (BackgroundCanvas instead of HorizonGlow, the expanded deprecation list). Should I do those as separate diffs in this report, or is a Section 2 narrative description sufficient (and the actual body refresh happens during execution of `/spec-forums 5.1`)? **Recommendation: narrative description is sufficient for now; the body-text refresh naturally happens when the spec is extracted via `/spec-forums`.**

---

## Discoveries (filed separately)

See `_plans/reconciliation/discoveries.md` for code-quality and product-bug findings surfaced during the audit (kept separate from the docs-drift report per the task brief).

---

## Execution estimate (Step 5)

If all proposed diffs are approved as-is:

- **CLAUDE.md:** 3 surgical edits (~15 min including verification grep)
- **09-design-system.md:** ~15 logical changes; the file is 982 lines and needs careful chunked edits to avoid corruption. Estimated **45-60 min** including post-edit `wc -l` sanity checks.
- **04-frontend-standards.md:** 2 surgical edits (~10 min)
- **02-security.md:** 2 paragraph additions (~10 min)
- **10-ux-flows.md:** 1 paragraph addition + 1 new section (~15 min)
- **11b-local-storage-keys-bible.md:** 1 row addition pending key verification (~10 min)
- **12-project-reference.md:** 2 small edits (~10 min)
- **`.claude/skills/plan/SKILL.md`:** 4 inline-block edits (~20 min)
- **Master plan Phase 5 body refresh** (if approved as Question 8 "yes"): 3 spec body sections (~30 min)
- **Spec tracker:** No status changes; only commentary (~5 min if added at all)

**Total estimated execution time: 2.5-3 hours of careful editing.**

---

## End of Reconciliation Report
