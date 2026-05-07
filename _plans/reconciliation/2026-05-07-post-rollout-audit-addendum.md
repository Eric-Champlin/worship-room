# Post Round-3 Visual Rollout — Doc Reconciliation Audit Addendum

**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**Scope:** Three Worship Room Claude Code skills NOT covered by the original audit:

1. `.claude/skills/execute-plan/SKILL.md`
2. `.claude/skills/code-review/SKILL.md`
3. `.claude/skills/verify-with-playwright/SKILL.md`

**Prior work prerequisite:** Step 5 of the original 2026-05-07 audit is complete. Modifications to `CLAUDE.md`, `09-design-system.md`, `04-frontend-standards.md`, `02-security.md`, `10-ux-flows.md`, `11b-local-storage-keys-bible.md`, `12-project-reference.md`, `plan/SKILL.md`, the master plan, and the spec tracker are present in the working tree (uncommitted). This addendum was written against that just-updated canonical state.

**Read-only research only.** No skill or rule files were modified during this addendum pass.

---

## Section A — Drift Inventory: `.claude/skills/execute-plan/SKILL.md`

The biggest drift here is the **hardcoded Design System Reminder block in Step 4d (lines 209-220)**. It is a duplicate of the inline reminder in `plan/SKILL.md` (now updated as part of Step 5) but was NOT updated alongside it. `/execute-plan` displays this block **verbatim before every UI step**, so its accuracy directly affects implementation. Today, executing a plan against the post-rollout codebase produces stale guidance at the most important moment.

There are also two cross-reference bugs pointing at a section name that no longer exists in `09-design-system.md`.

### A.1 — Step 4d "Design System Reminder" hardcoded block (lines 210-220)

| Line(s) | Drift | Should say |
|---|---|---|
| 212 | "Daily Hub uses HorizonGlow at the page root, NOT per-section GlowBackground (deprecated on Daily Hub)" | "Daily Hub and most inner pages wrap content in `<BackgroundCanvas>` (5-stop gradient at `components/ui/BackgroundCanvas.tsx`). HorizonGlow.tsx is orphaned legacy as of Visual Rollout Spec 1A. Music preserves rolls-own atmospheric layers (Decision 24 — audio engine integrity). Settings and Insights use `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` (intentional drift)." |
| 214 | "Pray/Journal textareas use static white box-shadow glow, NOT animate-glow-pulse (removed)" | "Pray/Journal textareas use the canonical violet-glow pattern (DailyHub 1B): `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60`. White-glow shadow and cyan border are deprecated post-Visual-Rollout." |
| 219 | "Frosted glass cards: bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl" | "Frosted glass cards: bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-3xl (use the FrostedCard component, not hand-rolled)" |
| 215 — missing | No mention of post-Visual-Rollout button variants | Add: "Default secondary CTA on dark surfaces is `<Button variant="subtle">` (replaces most `bg-primary` solid usage). Default emotional-peak CTA is `<Button variant="gradient" size="lg">` (text-black, NOT text-violet-900). Default text-button on dark is `text-violet-300` (NOT `text-primary`)." |
| 215 — missing | No mention of muted-white active-state, pill+halo tab bar, selected-card ring | Add: "Selectable pills (settings tabs, time-range, RadioPillGroup) use `bg-white/15 text-white border-white/30`. Tab bars use pill+halo: outer `bg-white/[0.07] border-white/[0.08]`, active `bg-violet-500/[0.13] border-violet-400/45 + violet halo`. Selected card ring: `ring-violet-400/60` (NOT `ring-primary`)." |
| 215 — missing | No mention of border opacity unification | Add: "All decorative card/chrome borders on dark use `border-white/[0.12]`, NOT `border-white/10`." |
| 215 — missing | No mention of Layout transparentNav default flip | Add: "Layout default flipped to `transparentNav: true` post-Spec-12 — every page uses transparent overlay navbar." |
| 215 — missing | No mention of Tonal Icon Pattern + severity color refresh | Add: "Tonal icon palette per widget (Spec 4B): `text-pink-300` gratitude, `text-sky-300` insight, `text-violet-300` default, `text-emerald-300` positive, `text-amber-300` recap, `text-yellow-300` achievement. Status indicators: `text-emerald-300` / `text-red-300` / `text-amber-300` (NOT `text-success`/`text-danger`/`text-warning` — deprecated)." |
| 215 — missing | No mention of AlertDialog pattern | Add: "Destructive confirmations use `<Button variant="alertdialog">` + `AlertTriangle` icon in heading + muted treatment (`bg-red-950/30 border-red-400/30 text-red-100` — saturated `bg-red-700/800` deprecated)." |
| 215 — missing | No mention of `<Link> + FrostedCard` group-hover pattern | Add: "Navigable cards use `<Link>` outer + `<FrostedCard variant="default" as="article">` inner with group-hover. FrostedCard does NOT receive onClick." |
| 215 — missing | No mention of `/?auth=login` deep links (Spec 7) | Add: "Auth deep links: `/?auth=login` and `/?auth=register` open the AuthModal. Cross-surface auth-gating CTAs use these query-param deep links, not `<Navigate>` to `/login`." |
| 215 — missing | No mention of FrostedCard tier 3 (subdued variant) | The current bullet covers Tier 1 / Tier 2; the canonical now adds `variant="subdued"` (sub-content panels, `bg-white/[0.05]`). Append: "FrostedCard variant API is `accent | default | subdued`. Tier 1 (`accent`) eyebrow has violet leading dot; Tier 2 (rolls-own scripture callout) has no dot — left-stripe is its signature." |

### A.2 — Cross-reference bugs (sections that no longer exist in `09-design-system.md`)

After Step 5, the section "Daily Hub Visual Architecture" is no longer a standalone heading in `09-design-system.md`. Its content was folded into `### BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)` at line 636 (with a "Daily Hub-specific structure" sub-paragraph at line 663). References to the old section name now point at nothing.

| Line | Drift | Should say |
|---|---|---|
| 47 | "...the Round 3 Visual Patterns section, the Daily Hub Visual Architecture section, the FrostedCard Tier System..." | Replace "the Daily Hub Visual Architecture section" with "the BackgroundCanvas Atmospheric Layer section (which includes the Daily Hub-specific structure paragraph)". |
| 227 | "...the relevant Round 3 / Daily Hub Visual Architecture sections of `.claude/rules/09-design-system.md`..." | Replace "Daily Hub Visual Architecture" with "BackgroundCanvas Atmospheric Layer". |

### A.3 — What's NOT drift (verified intact)

- **Hierarchy of authority** (Step 4e, lines 235-243) — correctly points at `09-design-system.md` (#4) and Architecture Context (#5) in the right order.
- **Deprecated Patterns table reference** (line 251) — points at `09-design-system.md`'s table; no inline duplication. After Step 5, this transitively becomes accurate.
- **Test baseline references** — execute-plan does not hardcode any test count, so no "9,470" stale baseline drift here.
- **Cross-skill references** (`/plan`, `/code-review`, `/verify-with-playwright` in Step 5 final summary and See Also) — names match.
- **Visual verification checkpoint (Step 4g)** — already enforces 2px tolerance, role=radio vs aria-pressed for radio-style options is enforced *transitively* via the deprecated patterns table reference (no inline check needed).

---

## Section B — Drift Inventory: `.claude/skills/code-review/SKILL.md`

This skill has weaker drift than execute-plan. The Worship Room Safety table in Step 10 is deprecation-blind: it doesn't have any rows that gate against the post-rollout deprecated patterns. The pattern-detection burden today falls entirely on the reviewer's manual cross-check against `09-design-system.md`'s Deprecated Patterns table. That's tolerable but means the gate is informal.

### B.1 — Step 10 Worship Room-Specific Safety Checks table (lines 500-515)

The table has 13 rows today, all functional/correctness checks (crisis detection, BB-45 reactive store subscription test, dangerouslySetInnerHTML, demo mode writes, journal storage, scripture translation, etc.). It has no visual-deprecation rows.

**Recommendation:** Add ONE consolidated row that points at the canonical deprecated patterns table, plus mark visual-rollout violations as Blocker severity (consistent with the existing "Worship Room-specific violations are ALWAYS Blocker severity" line at 516).

| Line | Drift | Should add |
|---|---|---|
| ~514 (end of Step 10 table) | No Worship Room safety check that flags new code introducing post-rollout deprecated patterns. The table jumps from "Faith points calculation uses correct multiplier tiers" straight to the "Worship Room-specific violations are ALWAYS Blocker severity" sentence. | Add: `\| No deprecated visual patterns introduced (cross-reference `09-design-system.md` § "Deprecated Patterns" — including post-Visual-Rollout entries: HorizonGlow imports, white textarea glow, `bg-primary` solid CTAs on dark, `text-primary` text-buttons on dark, `text-success`/`text-danger` CSS-variable colors, `border-white/10`, `rounded-2xl` as FrostedCard default, `ring-primary` selected-card ring, saturated `bg-red-700/800` destructive, `Layout transparentNav: false` default, Caveat font outside wordmark/RouteLoadingFallback, `aria-pressed` on radio-style options) \| OK / VIOLATION / N/A \| {file}:{line} \|` |

This single-row approach is preferred over enumerating ~10 separate rows because (a) it stays maintainable as the deprecated table grows, (b) the canonical source-of-truth stays in 09 (one place to update), and (c) the row count in Step 10 stays readable.

### B.2 — Step 8 Visual Verification Status checklist (lines 456-468)

The checklist has 11 items today. None of them flag deprecated patterns directly. The check happens transitively via "All [UNVERIFIED] values from the plan were compared against the design system or existing UI" (line 462) — but that's not the same thing.

**Recommendation:** Add a single line referencing the 09 deprecated table so reviewers know to spot-check.

| Line | Drift | Should add |
|---|---|---|
| ~467 (after the existing 11 items) | No deprecated-pattern spot-check in the pre-commit visual checklist | Add: `- [ ] No deprecated visual patterns from the post-Visual-Rollout era introduced in the diff (`09-design-system.md` § "Deprecated Patterns" — see Step 10 row above for the canonical list)` |

### B.3 — Step 1 Triage classification (lines 64-67)

The High-risk classification mentions "auth, encryption, data persistence" but doesn't mention "Visual Rollout / Forums Wave migration files" as a class. After the rollout, files that touch Prayer Wall components (the only remaining unmigrated visual surface, slated for Forums Wave Phase 5) are intrinsically higher risk — they're the most likely surface to accidentally adopt deprecated patterns. **This is optional polish, not a real drift; flagging for Eric's call.**

### B.4 — Severity Definitions (lines 716-719)

Looks correct. "Worship Room safety violations" already includes anything new added to Step 10 by transitivity.

### B.5 — What's NOT drift

- **Severity ladder** is consistent with both the original audit's recommendations and the new visual-rollout posture.
- **Backend Additional Checks** (lines 740-794) — out of scope for this addendum (visual rollout was frontend-only).
- **Proxy Additional Checks** (lines 798-849) — out of scope.
- **Pre-Commit Checklist** (lines 644-657) — fine; the visual verification line correctly points at `/verify-with-playwright`.
- **Test baseline references** — code-review doesn't hardcode test counts. No drift.
- **Cross-references to `/plan`, `/spec`, `/verify-with-playwright`** — all match.

---

## Section C — Drift Inventory: `.claude/skills/verify-with-playwright/SKILL.md`

This skill has the most concrete drift because Step 9 hardcodes specific assertions about Daily Hub ("HorizonGlow layer renders behind content...", "Pray/Journal textareas use static white box-shadow glow..."). Those assertions actively produce false positives against post-rollout pages: a correctly-built post-Spec-1A Daily Hub will FAIL the HorizonGlow check because HorizonGlow is no longer mounted. This is the most urgent skill to fix.

### C.1 — Step 9 Daily Hub Checks table (lines 956-981) — STALE ASSERTIONS

| Line | Drift | Should say |
|---|---|---|
| 959 | "HorizonGlow layer renders behind content (5 large soft purple blobs at strategic vertical positions)" — **WILL PRODUCE FALSE FAIL on a correctly-migrated DailyHub.** | "BackgroundCanvas layer renders at DailyHub root (`data-testid="background-canvas"` element with the 5-stop multi-bloom gradient — top-left + mid-right + bottom-left violet blooms, dark center vignette, diagonal base)" |
| 964 | "Pray/Journal textareas use static white box-shadow glow (NOT animate-glow-pulse)" — false-fails post-DailyHub-1B. | "Pray/Journal textareas use the canonical violet-glow pattern (`shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]` + `border-violet-400/30` + `bg-white/[0.04]`). White-glow shadow and cyan border are deprecated." |
| 970 | "Devotional uses Tier 2 scripture callout (border-l-4 border-l-primary/60 bg-white/[0.04])" — verbatim still correct (Tier 2 unchanged). | OK — keep as-is. |
| 971 | "Devotional uses Tier 1 FrostedCard for reflection body, saint quote, and reflection question" — partially stale. Saint quote is now the `default` variant, not Tier 1. | "Devotional uses Tier 1 (`<FrostedCard variant="accent">` with eyebrow + violet leading dot) for reflection body. Saint quote uses `<FrostedCard variant="default">` (quieter supporting voice). Reflection question uses Tier 2 rolls-own callout (DailyHub 2 unified to scripture-callout treatment)." |
| 958 | "Daily Hub root has bg-hero-bg with relative min-h-screen overflow-hidden" — partially stale; BackgroundCanvas itself is `min-h-screen overflow-hidden` and the Daily Hub root no longer needs the `bg-hero-bg` class because BackgroundCanvas's diagonal base provides the dark background. | "Daily Hub root mounts `<BackgroundCanvas>` directly. The DailyHub root's `min-h-screen overflow-hidden` is provided by BackgroundCanvas's own root; tab content components mount as plain `<div>` wrappers with `mx-auto max-w-2xl px-4 py-10 sm:py-14`." |

### C.2 — Step 9 Global Checks deprecated-patterns line (line 939)

| Line | Drift | Should say |
|---|---|---|
| 939 | Lists 6 deprecated patterns (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts). **Missing all post-Visual-Rollout deprecations.** | Expand to: "(Caveat headings outside wordmark/RouteLoadingFallback, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub or inner pages, HorizonGlow imports anywhere, animate-glow-pulse, white textarea glow, cyan/purple textarea borders, italic Lora/serif prompts, `bg-primary` solid CTAs on dark, `text-primary`/`text-primary-lt` text-buttons on dark, `text-success`/`text-danger`/`text-warning` CSS-variable colors, `border-white/10` decorative borders, `rounded-2xl` as FrostedCard default, `ring-primary` selected-card ring, saturated `bg-red-700`/`bg-red-800` destructive, `Layout transparentNav: false` default, `aria-pressed` on radio-style options, AuthModal trailing-period subtitles) — see `09-design-system.md` § "Deprecated Patterns" for the canonical table" |

### C.3 — Step 9 Auth Modal Checks (lines 1004-1009)

| Line | Drift | Should add |
|---|---|---|
| ~1009 (end of table) | No check for the `/?auth=login` and `/?auth=register` query-param deep-link convention introduced by Spec 7 (Visual Rollout). The legacy `/login` route now redirects to `/?auth=login`; cross-surface auth-gating CTAs should use the deep link, not hard-route to `/login`. | Add: `\| Cross-surface auth CTAs use `/?auth=login` query-param deep link, NOT hard-routing to `/login` (Spec 7 — legacy `/login` redirects to `/?auth=login` via `<Navigate>`) \| YES / NO / N/A \| {details} \|` |

### C.4 — Step 9 Navbar Checks (lines 996-1003)

| Line | Drift | Should add |
|---|---|---|
| ~1003 (end of table) | No check that Layout's `transparentNav` default is `true` post-Spec-12. Worth confirming when verifying inner pages because the canonical state is now transparent overlay nav site-wide. | Add: `\| Layout uses transparent overlay nav (`transparentNav: true` is the post-Spec-12 default; opaque mode is defensive fallback only) \| YES / NO / N/A \| {details} \|` |

### C.5 — Rules section deprecated-patterns line (line 1258)

| Line | Drift | Should say |
|---|---|---|
| 1258 | Same incomplete list as Step 9 line 939 (Caveat, BackgroundSquiggle, GlowBackground, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards, "What's On Your Heart" headings, inline AmbientSoundPill, theme tag pills, static Closing Prayer, PageTransition). | Apply the same post-Visual-Rollout expansion as C.2 above. To stay maintainable, **prefer a short pointer** to `09-design-system.md` over enumerating: "Finding any deprecated pattern from `09-design-system.md` § 'Deprecated Patterns' (currently ~50 entries — both pre- and post-Visual-Rollout) is a HIGH severity finding and makes the overall verdict FAIL." |

### C.6 — What's NOT drift

- **Comparison Rules** (lines 56-75) — tolerances are correct; no change needed for the visual rollout.
- **Breakpoints** (lines 419-427: 375 / 428 / 768 / 1024 / 1440 / 1920) — match the conventions used elsewhere. Plan/SKILL.md uses the 3-breakpoint subset (375 / 768 / 1440); verify uses the full 6. Consistent — verify just adds granularity. No drift on the "375 / 768 / 1280 / 1440" mention in the audit brief; the canonical is 1440, not 1280, across the whole codebase.
- **Step 6l Inline Element Positional Verification** — fine, matches plan/SKILL.md's Inline Element Position Expectations table contract.
- **Auto-derive route from plan** (lines 130-160) — fine; reads the `## Affected Frontend Routes` section that plan/SKILL.md still emits.
- **Auth state injection via `localStorage.setItem('wr_auth_simulated', 'true')`** (lines 322-332, 348-356) — still correct. The legacy mock-auth path remains in `AuthContext.readInitialState` per the post-1.9 transitional posture; flipping `wr_jwt_token` for real-auth verification is a future skill enhancement, not a drift.
- **Cross-references to `/code-review`, `/plan`, `/playwright-recon`** — all match.
- **Test baseline references** — verify-with-playwright doesn't hardcode test counts. No drift.
- **Step 9 Landing Page Checks** (lines 945-952) — homepage is unaffected by inner-page rollout patterns (still uses GlowBackground per-section). No drift.
- **Step 9 Music Page Checks** (lines 1014-1017) — Music intentional drift is preserved; the "Dark background on all tabs (bg-dashboard-dark #0f0a1e)" check is still correct.
- **Step 9 AudioDrawer Checks** (lines 1020-1027) — no drift; the AudioDrawer pattern is unchanged by the visual rollout.
- **Step 9 Auth Modal subtitle copy** (line 1009: "Your draft is safe — we'll bring it back after") — already without trailing period, so consistent with the AuthModal trailing-period subtitle deprecation.

---

## Section D — Proposed Diffs

Each block below is a copy-paste-ready Find / Replace pair. They are NOT yet applied. Eric must approve before execution.

### Diff D.1 — `execute-plan/SKILL.md` line 47 (cross-reference fix)

**Find:**
```
3. **`.claude/rules/09-design-system.md`** — Read this for architectural patterns, the Round 3 Visual Patterns section, the Daily Hub Visual Architecture section, the FrostedCard Tier System, the white pill CTA patterns, the textarea glow pattern, the sticky FAB pattern, the drawer-aware visibility pattern, the inline element layout verification rule, and the Deprecated Patterns table. The recon snapshot wins on specific CSS values; this file wins on architectural principles and component patterns.
```

**Replace with:**
```
3. **`.claude/rules/09-design-system.md`** — Read this for architectural patterns, the Round 3 Visual Patterns section, the BackgroundCanvas Atmospheric Layer section (which includes the Daily Hub-specific structure paragraph), the FrostedCard Tier System, the Button variant taxonomy, the Active-State and Selection Patterns, the Text-Button Pattern, the Tonal Icon Pattern, the white pill CTA patterns, the violet textarea glow pattern, the AlertDialog Pattern, the sticky FAB pattern, the drawer-aware visibility pattern, the inline element layout verification rule, and the Deprecated Patterns table. The recon snapshot wins on specific CSS values; this file wins on architectural principles and component patterns.
```

### Diff D.2 — `execute-plan/SKILL.md` line 227 (cross-reference fix)

**Find:**
```
**2. Re-read the relevant section of the Design System Reference** (`_plans/recon/design-system.md`) AND the relevant Round 3 / Daily Hub Visual Architecture sections of `.claude/rules/09-design-system.md` for the specific component being built in this step.
```

**Replace with:**
```
**2. Re-read the relevant section of the Design System Reference** (`_plans/recon/design-system.md`) AND the relevant Round 3 Visual Patterns / BackgroundCanvas Atmospheric Layer / FrostedCard Tier System / Button Component Variants / Active-State and Selection Patterns sections of `.claude/rules/09-design-system.md` for the specific component being built in this step.
```

### Diff D.3 — `execute-plan/SKILL.md` Step 4d hardcoded canonical block (lines 209-220)

**Find:** The entire `Canonical patterns (always check):` block.

```
⚠️  DESIGN SYSTEM REMINDER:

Canonical patterns (always check):
- Worship Room uses GRADIENT_TEXT_STYLE for headings on dark backgrounds, NOT Caveat (deprecated)
- Daily Hub uses HorizonGlow at the page root, NOT per-section GlowBackground (deprecated on Daily Hub)
- Daily Hub tab content uses transparent backgrounds with `mx-auto max-w-2xl px-4 py-10 sm:py-14`
- No "What's On Your Heart/Mind/Spirit?" headings on Daily Hub tabs (removed)
- Pray/Journal textareas use static white box-shadow glow, NOT animate-glow-pulse (removed)
- White pill CTAs use Pattern 1 (inline) or Pattern 2 (homepage primary) from `09-design-system.md`
- FrostedCard tier system: Tier 1 for primary reading, Tier 2 (left-border accent) for scripture callouts
- Sticky FABs use pointer-events-none outer + pointer-events-auto inner with env(safe-area-inset-*)
- Drawer-aware FABs auto-hide when state.drawerOpen === true
- Frosted glass cards: bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
```

**Replace with:**
```
⚠️  DESIGN SYSTEM REMINDER:

Canonical patterns (always check):
- Worship Room uses GRADIENT_TEXT_STYLE for headings on dark backgrounds. Caveat font is restricted to the wordmark and RouteLoadingFallback only — deprecated for every other h1/h2.
- Daily Hub and most inner pages (Bible Landing, MyBible, Local Support, Grow, Ask, RegisterPage, Reading Plan detail, Challenge detail, etc.) wrap content in `<BackgroundCanvas>` (5-stop multi-bloom gradient at `components/ui/BackgroundCanvas.tsx`). Settings and Insights stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` (intentional drift per Spec 10A). Music preserves rolls-own atmospheric layers (audio engine + AudioProvider / audioReducer / AudioContext cluster integrity per Spec 11A — Decision 24). HorizonGlow.tsx is orphaned legacy as of Visual Rollout Spec 1A. GlowBackground remains active on the homepage only.
- Daily Hub tab content uses transparent backgrounds with `mx-auto max-w-2xl px-4 py-10 sm:py-14` — the BackgroundCanvas atmospheric layer shows through.
- No "What's On Your Heart/Mind/Spirit?" headings on Daily Hub tabs (removed in Wave 5).
- Pray/Journal textareas use the canonical violet-glow pattern (DailyHub 1B): `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`. White-glow shadow, cyan border, and animate-glow-pulse are deprecated.
- White pill CTAs use Pattern 1 (inline, `text-primary`) or Pattern 2 (homepage primary, `text-hero-bg` NOT `text-primary`) from `09-design-system.md` — verbatim only, drift is a regression.
- Default secondary CTA on dark surfaces is `<Button variant="subtle">` (frosted pill — replaces most `bg-primary` solid usage). Default emotional-peak CTA is `<Button variant="gradient" size="lg">` (text-black, NOT text-violet-900). Default text-button on dark is `text-violet-300 hover:text-violet-200` (NOT `text-primary` — fails WCAG 4.5:1 floor).
- Selectable pills (settings tabs, time-range, RadioPillGroup) use the muted-white active-state: `bg-white/15 text-white border border-white/30`. Tab bars use pill+halo: outer `bg-white/[0.07] border-white/[0.08]`, active `bg-violet-500/[0.13] border-violet-400/45 + violet halo`. Selected card ring: `ring-violet-400/60` (NOT `ring-primary`).
- Border opacity unification (Visual Rollout): all decorative card/chrome borders on dark use `border-white/[0.12]` (NOT `border-white/10`). Tighter `/[0.18]` acceptable for hover emphasis. Looser `/[0.08]` acceptable for pill tabs' outer border.
- FrostedCard tier system: variant API `accent | default | subdued`, `rounded-3xl`, `bg-white/[0.07]` (default) / `bg-violet-500/[0.08]` (accent) / `bg-white/[0.05]` (subdued). Tier 1 (`variant="accent"`) eyebrow has violet leading dot signature; Tier 2 (rolls-own scripture callout `border-l-4 border-l-primary/60`) eyebrow has NO dot — left-stripe is its signature.
- Tonal Icon Pattern (Spec 4B — dashboard widget headers): per-widget header icon palette: `text-pink-300` (gratitude), `text-sky-300` (insight/data), `text-violet-300` (default/spiritual), `text-emerald-300` (positive/success), `text-amber-100`/`text-amber-300` (recap/seasonal), `text-yellow-300` (achievement). Status indicators: `text-emerald-300`/`text-red-300`/`text-amber-300` (NOT `text-success`/`text-danger`/`text-warning` — deprecated).
- AlertDialog pattern (Spec 10A / 11B): destructive confirmations use `<Button variant="alertdialog">` + `AlertTriangle` icon in heading + muted treatment (`bg-red-950/30 border-red-400/30 text-red-100`). Saturated `bg-red-700/800` is deprecated.
- Cross-surface card pattern (Spec 3): navigable cards use `<Link>` outer + `<FrostedCard variant="default" as="article">` inner with group-hover. FrostedCard does NOT receive `onClick`; the Link handles navigation.
- Layout default flipped to `transparentNav: true` post-Spec-12. The transparent overlay navbar is the canonical production state on every page including non-hero pages. Opaque mode is retained only as `transparentNav={false}` defensive fallback.
- Auth deep links (Spec 7): `/?auth=login` and `/?auth=register` open the AuthModal in the corresponding mode. Cross-surface auth-gating CTAs use these query-param deep links, not hard-routing to `/login`.
- Sticky FABs use `pointer-events-none` outer + `pointer-events-auto` inner with `env(safe-area-inset-*)` for iOS notch and Android nav bar respect. Drawer-aware FABs (like `DailyAmbientPillFAB`) auto-hide when `state.drawerOpen === true`.
- Frosted glass cards: `bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-3xl` (post-Visual-Rollout — earlier `bg-white/[0.06]` + `rounded-2xl` are drift). Use the FrostedCard component, not a hand-rolled card.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
```

### Diff D.4 — `code-review/SKILL.md` Step 10 — append new safety check row (after line 514)

**Find:**
```
| Faith points calculation uses correct multiplier tiers | OK / WRONG TIERS / N/A | {file}:{line} |

**Worship Room-specific violations are ALWAYS Blocker severity.**
```

**Replace with:**
```
| Faith points calculation uses correct multiplier tiers | OK / WRONG TIERS / N/A | {file}:{line} |
| No deprecated visual patterns introduced (cross-reference `09-design-system.md` § "Deprecated Patterns" — including post-Visual-Rollout entries: HorizonGlow imports, white textarea glow, `bg-primary` solid CTAs on dark, `text-primary` text-buttons on dark, `text-success`/`text-danger` CSS-variable colors, `border-white/10`, `rounded-2xl` as FrostedCard default, `ring-primary` selected-card ring, saturated `bg-red-700`/`bg-red-800` destructive, `Layout transparentNav: false` default, Caveat font outside wordmark/RouteLoadingFallback, `aria-pressed` on radio-style options) | OK / VIOLATION / N/A | {file}:{line} |

**Worship Room-specific violations are ALWAYS Blocker severity.**
```

### Diff D.5 — `code-review/SKILL.md` Step 8 — append visual-deprecation spot-check (after line 467)

**Find:** The line `- [ ] \`prefers-reduced-motion\` respected for all animations and video`

**Replace with:**
```
- [ ] `prefers-reduced-motion` respected for all animations and video
- [ ] No deprecated visual patterns from the post-Visual-Rollout era introduced in the diff (`09-design-system.md` § "Deprecated Patterns" — Step 10 gates this formally; this is a pre-commit spot-check)
```

### Diff D.6 — `verify-with-playwright/SKILL.md` Step 9 Daily Hub Checks — replace stale assertions

**Find:** The Daily Hub Checks rows currently containing the HorizonGlow, white-glow textarea, and ambiguous Tier 1 saint quote assertions.

```
| Daily Hub root has bg-hero-bg with relative min-h-screen overflow-hidden | YES / NO / N/A | {details} |
| HorizonGlow layer renders behind content (5 large soft purple blobs at strategic vertical positions) | YES / NO / N/A | {details} |
| Tab content backgrounds are transparent (no per-section bg, no GlowBackground wrapper) | YES / NO / N/A | {details} |
| Tab content uses `mx-auto max-w-2xl px-4 py-10 sm:py-14` padding pattern | YES / NO / N/A | {details} |
| No "What's On Your Heart/Mind/Spirit?" headings on tabs (removed in Wave 5) | CLEAN / FOUND HEADING | {details} |
| No BackgroundSquiggle on any Daily Hub tab (removed in Wave 5) | CLEAN / FOUND SQUIGGLE | {details} |
| Pray/Journal textareas use static white box-shadow glow (NOT animate-glow-pulse) | YES / NO / N/A | {details} |
| Pray/Journal "Help Me Pray" / "Save Entry" buttons use homepage white pill CTA pattern (Pattern 2) | YES / NO / N/A | {details} |
```

**Replace with:**
```
| Daily Hub root mounts `<BackgroundCanvas>` directly (BackgroundCanvas's own root provides `min-h-screen overflow-hidden`); no separate HorizonGlow layer | YES / NO / N/A | {details} |
| BackgroundCanvas renders with `data-testid="background-canvas"` and the 5-stop multi-bloom gradient (top-left + mid-right + bottom-left violet blooms, dark center vignette, diagonal base) | YES / NO / N/A | {details} |
| Tab content backgrounds are transparent (no per-section bg, no GlowBackground wrapper) — the BackgroundCanvas atmospheric layer shows through | YES / NO / N/A | {details} |
| Tab content uses `mx-auto max-w-2xl px-4 py-10 sm:py-14` padding pattern with `relative z-10` so it sits above the gradient | YES / NO / N/A | {details} |
| No "What's On Your Heart/Mind/Spirit?" headings on tabs (removed in Wave 5) | CLEAN / FOUND HEADING | {details} |
| No BackgroundSquiggle on any Daily Hub tab (removed in Wave 5) | CLEAN / FOUND SQUIGGLE | {details} |
| Pray/Journal textareas use the canonical violet-glow pattern (`shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border-violet-400/30 bg-white/[0.04]`); white-glow shadow, cyan border, and animate-glow-pulse are deprecated | YES / NO / N/A | {details} |
| Pray/Journal "Help Me Pray" / "Save Entry" buttons use homepage white pill CTA Pattern 2 (`text-hero-bg`, NOT `text-primary` — Spec 7 reconciliation) | YES / NO / N/A | {details} |
```

### Diff D.7 — `verify-with-playwright/SKILL.md` Step 9 Daily Hub Checks — fix Tier 1 saint quote assertion

**Find:**
```
| Devotional uses Tier 1 FrostedCard for reflection body, saint quote, and reflection question | YES / NO / N/A | {details} |
```

**Replace with:**
```
| Devotional uses Tier 1 (`<FrostedCard variant="accent">` + eyebrow + violet leading dot) for reflection body. Saint quote uses `<FrostedCard variant="default">` (quieter supporting voice; italic preserved). Reflection question uses Tier 2 rolls-own callout (DailyHub 2 unified to scripture-callout treatment). | YES / NO / N/A | {details} |
```

### Diff D.8 — `verify-with-playwright/SKILL.md` Step 9 Global Checks — expand deprecated patterns line

**Find:**
```
| No deprecated visual patterns (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts) | CLEAN / DEPRECATED PATTERN FOUND | {details} |
```

**Replace with:**
```
| No deprecated visual patterns — see `09-design-system.md` § "Deprecated Patterns" for the canonical table. Pre-Visual-Rollout entries: Caveat headings outside wordmark/RouteLoadingFallback, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub or inner pages, animate-glow-pulse, cyan/purple textarea borders, italic Lora/serif prompts. Post-Visual-Rollout entries: HorizonGlow imports, white textarea glow, `bg-primary` solid CTAs on dark, `text-primary`/`text-primary-lt` text-buttons on dark, `text-success`/`text-danger`/`text-warning` CSS-variable colors, `border-white/10` decorative borders, `rounded-2xl` as FrostedCard default, `ring-primary` selected-card ring, saturated `bg-red-700`/`bg-red-800` destructive, `Layout transparentNav: false` default, `aria-pressed` on radio-style options, AuthModal trailing-period subtitles. | CLEAN / DEPRECATED PATTERN FOUND | {details} |
```

### Diff D.9 — `verify-with-playwright/SKILL.md` Step 9 Auth Modal Checks — append Spec 7 deep-link check

**Find:**
```
| Auth modal subtitle reads "Your draft is safe — we'll bring it back after" when triggered from Pray/Journal with draft (Spec V) | YES / NO / N/A | {details} |
```

**Replace with:**
```
| Auth modal subtitle reads "Your draft is safe — we'll bring it back after" when triggered from Pray/Journal with draft (Spec V) | YES / NO / N/A | {details} |
| Cross-surface auth CTAs use `/?auth=login` query-param deep link, NOT hard-routing to `/login` (Spec 7 — legacy `/login` redirects to `/?auth=login` via `<Navigate>`) | YES / NO / N/A | {details} |
```

### Diff D.10 — `verify-with-playwright/SKILL.md` Step 9 Navbar Checks — append transparentNav default check

**Find:**
```
| Log In / Get Started buttons hidden when authenticated | YES / NO / N/A | {details} |
```

**Replace with:**
```
| Log In / Get Started buttons hidden when authenticated | YES / NO / N/A | {details} |
| Layout uses transparent overlay nav (`transparentNav: true` is the post-Spec-12 default; opaque mode is defensive fallback only) | YES / NO / N/A | {details} |
```

### Diff D.11 — `verify-with-playwright/SKILL.md` Rules section deprecated-patterns line

**Find:**
```
- Finding any deprecated pattern (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds, "What's On Your Heart/Mind/Spirit?" headings, inline AmbientSoundPill in tab content, theme tag pills on devotional, static Closing Prayer section, PageTransition component) is a HIGH severity finding and makes the overall verdict FAIL
- Reference `09-design-system.md` § "Deprecated Patterns" for the canonical list
```

**Replace with:**
```
- Finding any deprecated pattern from `09-design-system.md` § "Deprecated Patterns" (currently ~50 entries — pre- and post-Visual-Rollout) is a HIGH severity finding and makes the overall verdict FAIL. The canonical table is the single source of truth; do not duplicate it inline (it grows). The Step 9 Worship Room Checks table includes the most-likely-to-regress patterns as explicit table rows.
```

---

## Section E — Open Questions for Eric

These are decisions that should be made before Section D diffs are executed:

1. **Single-row vs enumerated deprecated-pattern check in code-review Step 10.** Diff D.4 proposes ONE row that points at the 09 table (with the most common post-rollout entries inlined for grep-ability). The alternative is a row per pattern (~10+ rows). **Recommendation: keep as one row.** Reasons in Section B.1.

2. **code-review Step 1 triage classification for Forums Wave Phase 5 (Prayer Wall) files.** Section B.3 flagged that Phase 5 specs (when they ship) are intrinsically higher visual-deprecation risk because Prayer Wall is the only remaining unmigrated visual surface. Should Step 1 add "Prayer Wall component files (during Forums Wave Phase 5)" to the High-risk classification? **Recommendation: defer.** It's pre-emptive; the existing High-risk criteria (>100 lines changed, new components) will catch Phase 5 work organically.

3. **verify-with-playwright Daily Hub `bg-hero-bg` assertion.** Diff D.6 reframes the `bg-hero-bg + relative min-h-screen overflow-hidden` check as "BackgroundCanvas's own root provides `min-h-screen overflow-hidden`". Worth confirming via inspection of `DailyHub.tsx` whether the outer wrapper still needs `bg-hero-bg` for safety against backgrounds-not-painted edge cases (some browsers paint the html root color through to whitespace). If kept, the diff should preserve a softened version of the `bg-hero-bg` check. **Recommendation: verify against `DailyHub.tsx` during execution; keep the softened check if `bg-hero-bg` is still on the outer wrapper.**

4. **Cross-skill consistency surfaced.** plan/SKILL.md was updated in Step 5 with the post-Visual-Rollout canonical block. execute-plan/SKILL.md's hardcoded canonical block (Step 4d) was NOT — it lags. The same drift will recur if any future visual-system change updates one without the other. **Question: should both files instead reference a SHARED canonical block?** The shared block could live in `09-design-system.md` § "Round 3 Visual Patterns" (already there), and both skills could be edited to say "display the canonical patterns list from 09 § Round 3 Visual Patterns" instead of inlining their own. **Recommendation: keep them as two inline copies for now — execute-plan needs to display the patterns to the model verbatim, and pulling from a markdown file at runtime is fragile. Add a note in both skills' YAML/comments that says 'this block must stay in sync with 09 § Round 3 Visual Patterns; update both when 09 changes.'** This is a process recommendation, not a diff in this addendum.

5. **Pre-existing 09-design-system.md drift Step 5 didn't sweep.** Two spots in 09 still reference HorizonGlow as canonical for Daily Hub:
   - **Line 267** (DevotionalTabContent inventory): "No GlowBackground (replaced by Daily Hub HorizonGlow)" — should now say "(transparent — sits over the Daily Hub `BackgroundCanvas` atmospheric layer)".
   - **Line 794** (Section Dividers Homepage): "Daily Hub does NOT use these (the HorizonGlow continuous layer makes section boundaries invisible by design)" — should now say "the BackgroundCanvas continuous layer".

   These are NOT in the three skill files this addendum audits, but they're orphan stale references inside 09 that the original Step 5 left untouched. **Recommendation: fold into Step 6 alongside the skill diffs — either add two surgical edits to 09, or file them as a follow-up.**

6. **HorizonGlow component inventory entry (09-design-system.md line 272).** The HorizonGlow.tsx component description is preserved verbatim in the inventory — it's correct that the file still exists, but readers won't know it's orphaned legacy without scrolling to line 667 ("HorizonGlow.tsx is orphaned legacy as of Spec 1A"). **Recommendation: prepend "(Orphaned legacy as of Visual Rollout Spec 1A — pending cleanup, do not import from new code)" to the line 272 description.** Same defer/fold-in question as #5.

---

## Cross-Skill Consistency Findings

**No conflicts found** between the three skill files and the post-Step-5 plan/SKILL.md or 09-design-system.md. The drift is one-directional: the plan/09 are now ahead of the three skills, and the proposed diffs bring the skills forward.

**One indirect consistency issue:** code-review's Step 10 currently has no row that flags visual-deprecation patterns at all, while verify-with-playwright Step 9 does have a (incomplete) deprecated-patterns row. After Diff D.4 lands, both skills will gate against the same canonical table in 09 — code-review at the diff level (file:line evidence), verify-with-playwright at the runtime level (browser inspection). They are complementary, not redundant.

---

## Execution estimate

If all proposed diffs are approved as-is:

- **`execute-plan/SKILL.md`:** 3 edits (D.1, D.2, D.3). D.3 is the largest — replacing a ~10-line block with a ~22-line block. Estimated **20-25 min** including post-edit `wc -l` sanity check.
- **`code-review/SKILL.md`:** 2 edits (D.4, D.5). Both surgical row additions. Estimated **10 min**.
- **`verify-with-playwright/SKILL.md`:** 6 edits (D.6 through D.11). All surgical (find/replace single row or single line). Estimated **20-25 min** including verification that Step 9's table structure still parses cleanly.
- **Section E follow-ups (if approved):**
  - 09 line 267 + line 272 + line 794 surgical edits: **5-10 min**.

**Total estimated execution time: 60-75 min** for the three skill diffs alone, plus 5-10 min if the optional 09 follow-ups are bundled in.

**Total proposed edits: 11** across the three skills (3 in execute-plan, 2 in code-review, 6 in verify-with-playwright). Plus 3 optional 09 follow-ups from Section E.

---

## Summary of drift found per skill

- **`.claude/skills/execute-plan/SKILL.md` — HIGHEST drift severity.** The Step 4d hardcoded "canonical patterns" block is displayed verbatim before every UI step, and three of its bullets are stale (HorizonGlow, white textarea glow, rounded-2xl + bg-white/[0.06] frosted cards). Two cross-references point at a section name that no longer exists. Fixing Step 4d gives the model accurate guidance at the most important moment in execution.

- **`.claude/skills/code-review/SKILL.md` — LOW drift severity.** The skill is structurally fine; it just lacks an explicit row in Step 10 that gates against the deprecated patterns table. Adding one consolidated row (preferred over 10+ enumerated rows) is sufficient.

- **`.claude/skills/verify-with-playwright/SKILL.md` — MEDIUM drift severity.** Step 9 Daily Hub Checks contains TWO assertions (HorizonGlow rendering, white-glow textarea) that will produce false FAILs against post-rollout pages. The deprecated-patterns sweep in Step 9 Global Checks and the Rules section's deprecated-patterns line are both incomplete. Auth Modal and Navbar tables miss two new post-rollout invariants (Spec 7 query-param deep links, Spec 12 transparentNav default).

---

## End of Addendum

**Awaiting Eric's approval before executing any of the proposed diffs.** Step 6 execution is a separate authorization, just like Step 5 was.
