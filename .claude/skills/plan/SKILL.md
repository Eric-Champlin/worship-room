---
description: Generate an implementation plan from a spec file
argument-hint: Path to spec file (e.g. _specs/mood-selector-page.md)
user-invokable: true
---
 
You are generating a technical implementation plan for **Worship Room** — a Christian emotional healing and worship web application built with React 18 + TypeScript (Vite), Spring Boot (Java), TailwindCSS, and PostgreSQL.
 
User input: $ARGUMENTS
 
## High-Level Behavior
 
Your job is to:
 
1. Read and internalize a spec file
2. Explore the codebase to understand existing patterns, components, and architecture
3. Load the Design System Reference for exact styling values
4. Load the Master Spec Plan if this spec is part of a multi-spec feature
5. Generate a detailed, step-by-step implementation plan
6. Save the plan to `_plans/` as a durable artifact
 
The plan is the source of truth for `/execute-plan`. It must be precise enough that execution requires no improvisation.
 
---
 
## Step 1: Read the Spec
 
Read the spec file at the path provided in `$ARGUMENTS`.
 
**If the file does not exist**, display:
 
```
Error: Spec file not found at <path>
 
Run /spec <feature idea> first to generate a spec, or verify the path.
```
 
**Stop immediately** if the file is not found.
 
**Extract and internalize these sections from the spec** — they are the product contract this plan must fulfill, and every one of them maps to a downstream consumer:
 
- **Affected Frontend Routes** — the user-facing routes this feature touches. The plan inherits this section *unchanged* (Step 3 template) so `/verify-with-playwright` can auto-derive its verification target. If the spec says "N/A — backend-only spec", carry that through verbatim.
- **Overview & User Story** — the feature's purpose and the user role(s) involved. Grounds every implementation decision.
- **Requirements** (Functional + Non-Functional) — the testable behaviors the Implementation Steps must cover. Performance and accessibility targets become test specs.
- **Auth Gating table** — every interactive element's logged-out behavior, logged-in behavior, and exact auth modal message. Every row becomes an entry in the plan's Auth Gating Checklist AND an auth check in the relevant Implementation Step. A spec auth gate with no plan step is an incomplete plan.
- **Responsive Behavior table** — the mobile/tablet/desktop layout behavior. Feeds the plan's Responsive Structure section and every UI step's "Responsive behavior" field.
- **AI Safety Considerations** — crisis keyword handling, content filtering, guardrails. If the spec says "N/A", carry the reason through. If it specifies safety behavior, every step touching AI-generated content or free-text input must include the corresponding guardrail.
- **Auth & Persistence** — demo-mode zero-persistence rules, what persists for logged-in users, which `wr_*` localStorage keys are touched. Feeds the plan's Shared Data Models section and the Architecture Context.
- **Completion & Navigation** — for Daily Hub features: how completion signals to the tracking system, post-completion CTAs, context passing. For standalone features the spec says "N/A".
- **Design Notes** — referenced existing components, referenced design system patterns, and any **NEW visual patterns flagged by the spec**. Spec-flagged new patterns MUST be marked `[UNVERIFIED]` in the plan until verified — the spec author has already told you these values aren't confirmed.
- **Acceptance Criteria** — the checkbox list the spec ends with. These are consumed directly by `/code-review --spec` for feature-completeness verification, and the visual criteria are consumed by `/verify-with-playwright`. Every criterion must be traceable to an Implementation Step.
 
If the spec is missing a section that should be present (e.g., a UI feature with no Responsive Behavior table, or interactive elements with no Auth Gating table), do not silently proceed — note it in the plan's Assumptions & Pre-Execution Checklist as a gap for the user to resolve before execution.
 
---
 
## Step 2: Codebase Reconnaissance
 
Before writing any plan, explore the codebase to ground your plan in reality.
 
**If context is large (complex feature touching many files), prioritize in this order:**
1. The spec itself
2. Design System Reference (`_plans/recon/design-system.md`)
3. Security rules (`.claude/rules/02-security.md`)
4. Related existing files the feature extends or modifies
5. Master Spec Plan (if multi-spec feature)
6. Everything else
 
**Summarize rather than quoting when possible** to preserve working context for plan generation.
 
Discover:
 
1. **Project structure** — directory layout, key directories, where components/services/routes live
2. **Existing patterns** — how existing features are built (component structure, API patterns, state management, styling approach)
3. **Related files** — any existing code that this feature will extend, modify, or interact with
4. **Database schema** — relevant tables from `.claude/rules/05-database.md` and any existing migrations
5. **Test patterns** — how existing tests are structured (naming, setup, assertion style, provider wrapping)
6. **Design system** — read `.claude/rules/09-design-system.md` for component inventory, hooks, utilities, Round 3 visual patterns, Daily Hub Visual Architecture, FrostedCard tier system, white pill CTA patterns, textarea glow pattern, sticky FAB pattern, drawer-aware visibility pattern, inline element layout verification, and the Deprecated Patterns table.
7. **Security rules** — read `.claude/rules/02-security.md` for auth gating requirements. Identify every action in the spec that requires login and ensure the plan includes auth checks for each one.
8. **Design System Reference** — check if `_plans/recon/design-system.md` exists. If it does, read it for exact computed CSS values, color tokens, typography, spacing, and component patterns (heroes, cards, buttons, decorative elements). These exact values must be referenced in any UI step's Details section — not "match the hero" but "use `background: linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)`, font: Inter 48px/1.2 bold, color: #FFFFFF`".
 
   **Precedence rule** — three design sources can be in play; they have different roles and don't compete:
   - **The external Recon Report** (`_plans/recon/{slug}.md`, item 9 below — transported into this plan's `## Recon Context` section) **takes precedence for THIS feature's per-screen/per-component values**: the exact CSS Mapping Table values for the specific screens being replicated. It is the most specific source — when it covers a component, it wins for that component.
   - **`_plans/recon/design-system.md`** (the live design-system snapshot from `--internal` mode) **takes precedence for design-system-wide visual values**: exact colors, gradients, spacing, font sizes, box-shadows, class lists shared across the whole app. Authoritative for any component the external Recon Report does not cover.
   - **`.claude/rules/09-design-system.md`** **takes precedence** for architectural patterns, component inventory, design principles, the Daily Hub Visual Architecture, the FrostedCard Tier System, the white pill CTA patterns, the textarea glow pattern, the deprecated patterns table, and the "why" behind the system (color semantics, accessibility floors, section heading treatment rules).
   - Resolution order for a specific CSS value: external Recon Report → Design System Reference → 09-design-system.md + codebase inspection. For a principle or component description, trust 09-design-system.md. If no source covers a value, mark it `[UNVERIFIED]`.
9. **Recon Report** — check if the spec references an external Recon Report (e.g., `_plans/recon/{slug}.md`). If it does, read it for per-screen CSS Mapping Tables, Gradient tables, Vertical Rhythm tables, Image tables, Link inventories, States tables, Form Responsive Widths tables, Intra-element text variation tables, Text Content Snapshots, Inline Element Position tables (if present), and Responsive CSS Mapping Tables. **Transport these tables into the plan's `## Recon Context` section** (Step 3 template) — that section is how the recon data reaches `/execute-plan` and `/verify-with-playwright` without them re-opening the recon file. Do not leave the recon data only in the external file; copy it into the plan.
10. **Master Spec Plan** — check if the spec references a master plan (e.g., `dashboard-growth-spec-plan-v2.md`). Also check CLAUDE.md for a multi-spec phase listing the current spec. If a master plan exists, read it for:
    - Shared data models (TypeScript interfaces, localStorage keys)
    - Cross-spec integration points (what this spec produces/consumes)
    - Shared constants (mood colors, activity points, level thresholds, badge definitions)
    - Prior spec decisions that this spec must respect
    - Include relevant shared context in the Architecture Context section
11. **Recent Execution Log deviations** — check the Execution Logs of the 2-3 most recent plans in `_plans/` for deviations caused by design system misunderstandings (wrong font, wrong gradient, wrong spacing, wrong textarea glow class, missing FAB safe-area-inset, inline elements wrapping when they shouldn't). These patterns belong in the Design System Reminder block to prevent the same mistakes.
 
    **"Recent" definition** — plans modified within the last 14 days, sorted by file mtime (newest first). Command: `ls -t _plans/*.md | head -3` then filter by mtime within 14 days. If no plans fall within that window, check the most recent plan regardless of age (it may still surface relevant deviations).
 
If the Design System Reference does not exist, note it in the Assumptions section: "No design system reference found. UI styling values are based on codebase inspection and may not be pixel-perfect. Consider running `/playwright-recon --internal` before execution."
 
**Recon staleness check:** If `_plans/recon/design-system.md` exists, check the date at the top of the file. Also compare the list of pages captured in the recon against current routes in CLAUDE.md — if new pages exist that weren't captured, or if CLAUDE.md mentions recent visual redesigns since the capture date (e.g., Round 3 Visual Rollout / `BackgroundCanvas` / FrostedCard tier system / violet-glow textareas / muted-white active-state), flag it: "⚠️ Design System Reference may be stale (captured before recent changes: {list what changed}). Consider re-running `/playwright-recon --internal` to capture current values." A stale recon is worse than no recon — it gives false confidence in outdated values.
 
**[UNVERIFIED] value marking:** When the spec introduces visual patterns not covered by any recon report or design system reference, or when a value is derived from codebase inspection rather than computed extraction, mark it as `[UNVERIFIED]` in the plan. Include a verification method and correction method for each:
 
```
[UNVERIFIED] Hero min-height: Best guess is 400px
→ To verify: Run /verify-with-playwright and compare against existing heroes
→ If wrong: Update to the value from the design system reference
```
 
`/execute-plan` displays these prominently before implementation, `/verify-with-playwright` gives them priority during comparison, and `/code-review` audits whether they were subsequently verified.
 
Document what you find — this becomes the **Architecture Context** section of the plan.
 
---
 
## Step 3: Generate the Plan
 
Create the plan file at `_plans/YYYY-MM-DD-<feature_slug>.md` using today's date and the feature slug from the spec filename.
 
Use this exact structure:
 
````markdown
# Implementation Plan: 
 
**Spec:** ``
**Date:** YYYY-MM-DD
**Branch:** 
**Design System Reference:** `_plans/recon/design-system.md` (loaded / not found)
**Recon Report:** `_plans/recon/{slug}.md` (loaded / not applicable)
**Master Spec Plan:** `{path}` (loaded / not applicable)
 
---
 
## Affected Frontend Routes
 
{List the user-facing routes this spec touches, one per line as markdown bullets. The `/verify-with-playwright` skill reads this section when invoked plan-only (e.g., `/verify-with-playwright _plans/...md`) and uses these routes to drive UI verification. Format: backtick-wrapped, including any query parameters that affect rendering. If this is a backend-only spec with NO frontend changes, write "N/A — backend-only spec" and omit the bullets.}
 
- `/route-1`
- `/route-2?tab=variant`
 
---
 
## Architecture Context
 
 
- Relevant existing files and patterns
- Directory conventions
- Component/service patterns to follow
- Database tables involved
- Test patterns to match (including provider wrapping: AuthModalProvider, ToastProvider, AudioProvider for Daily Hub features, etc.)
- Auth gating patterns (useAuth + useAuthModal pattern, which actions are gated)
- Shared data models from master plan (if applicable)
- Cross-spec dependencies from master plan (if applicable)
 
---
 
## Recon Context (if a Recon Report was loaded)
 
> Populate this section ONLY if the spec referenced an external Recon Report (`_plans/recon/{slug}.md`) and it was loaded in Step 2 (reconnaissance item 9). This section is the **transport mechanism**: it copies the recon report's tables INTO the plan so `/execute-plan` and `/verify-with-playwright` can consume them without re-opening the recon file. If no Recon Report applies, write "N/A — no external Recon Report for this feature" and omit the sub-tables.
 
- **Recon Report path:** `_plans/recon/{slug}.md`
- **Source URL:** {the live URL the recon captured — `/verify-with-playwright` auto-detects this for `--compare-prod` mode}
- **Screen Inventory:** {if the recon captured a multi-screen flow, copy the Screen Inventory table — screen count, flow type, per-screen navigation. The Implementation Steps below must be decomposable per screen, and any step touching a later screen carries that screen's recon data with it.}
- **Per-Screen Component Audit:** {if the recon produced a component audit per screen, copy it — then use it as a completeness gate: every component listed in the audit MUST have a corresponding Implementation Step. A component in the audit with no plan step means the plan is incomplete.}
- **Staleness:** {capture date, N days ago — "current" / "⚠️ may be stale, see Assumptions"}
- **CSS Mapping Table:** {paste the full per-screen/per-component CSS Mapping Table from the recon report — exact Tailwind classes and computed values. This is the source of truth for all UI-step styling values. `/execute-plan` copies these verbatim; `/verify-with-playwright` Step 6a compares the built page against them.}
- **Gradient tables:** {paste if the recon captured gradient backgrounds — exact gradient strings, angles, color stops, cutoff positions. Consumed by `/verify-with-playwright` Step 6c.}
- **Vertical Rhythm table:** {paste if present — spacing between adjacent sections. NOTE: this is the same data as the plan's standalone Vertical Rhythm section below; when a recon report exists, the recon values are authoritative and the Vertical Rhythm section should reference this table rather than duplicate it.}
- **Image tables:** {paste if present — rendered width/height/max-width per image. Consumed by `/verify-with-playwright` Step 6d.}
- **Link inventory tables:** {paste if present — link text, href, target, color, text-decoration for inline links in body content. Consumed by `/verify-with-playwright` Step 6f.}
- **States tables (hover/focus/active):** {paste if present — interactive-state styling for buttons, links, inputs. Consumed by `/execute-plan` Step 4g and `/verify-with-playwright` Step 6g.}
- **Form Responsive Widths table:** {paste if present — form container width AND input width at every breakpoint. Consumed by `/verify-with-playwright` Step 6h. Without this, "full width" is ambiguous and inputs stretch incorrectly on mobile.}
- **Intra-element text variation tables:** {paste if present — which phrases within a text block need `<strong>`/`<em>`/`<b>`/`<i>` wrapper tags. Consumed by `/verify-with-playwright` Step 6i.}
- **Text Content Snapshot:** {paste if present — exact rendered copy per screen. Consumed by `/verify-with-playwright` Step 6j to catch hardcoded-text drift.}
- **Inline Element Position tables:** {if the recon report documents inline-row layouts, note them here — they also feed the plan's standalone Inline Element Position Expectations section below.}
- **Responsive CSS Mapping Table:** {paste if present — per-breakpoint class application. Feeds the plan's Responsive Structure section.}
 
**Precedence:** the Recon Report (this section) is authoritative for per-screen/per-component CSS *values*. The Design System Reference (`_plans/recon/design-system.md`) is authoritative for design-system-wide patterns and tokens. `.claude/rules/09-design-system.md` is authoritative for architectural principles. See the precedence rule in Step 2 reconnaissance item 8.
 
---
 
## Auth Gating Checklist
 
**Every action in the spec that requires login must have an auth check in the plan.**
 
| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
|  |  | Step  | useAuth + auth modal / redirect |
 
If any spec-defined auth gate is missing from the implementation steps, this plan is incomplete.
 
---
 
## Design System Values (for UI steps)
 
**If a Design System Reference was loaded, include the exact values needed for this feature:**
 
| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero section | background |  | design-system.md |
| Heading | font |  | design-system.md |
| Card | box-shadow |  | design-system.md |
| Button (primary) | background |  | design-system.md |
|  |  |  |  |
 
**If no Design System Reference:** Note "Values from codebase inspection" and cite the specific file/line where each value was found.
 
This table is the executor's copy-paste reference for all styling. No guessing.
 
---
 
## Design System Reminder
 
**Project-specific quirks that `/execute-plan` displays before every UI step:**
 
<!-- MAINTENANCE NOTE: This canonical patterns block must stay in sync with `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns" AND with the matching ```text block in `.claude/skills/execute-plan/SKILL.md` § "Step 4d: Design System Reminder". When 09 updates, update both inline copies. The original visual-rollout sync was performed in the 2026-05-07 reconciliation (see `_plans/reconciliation/2026-05-07-post-rollout-audit-addendum.md`). -->
 
- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font is restricted to the wordmark and `RouteLoadingFallback` only — it is deprecated for every other h1/h2.
- All Daily Hub tab content components use `max-w-2xl` container width with the padding pattern `mx-auto max-w-2xl px-4 py-10 sm:py-14`. They have transparent backgrounds — the `BackgroundCanvas` atmospheric layer shows through.
- The Daily Hub and most inner pages (Bible Landing, MyBible, Local Support, Grow, Ask, RegisterPage, Reading Plan detail, Challenge detail, etc.) wrap content in `<BackgroundCanvas>` (5-stop multi-bloom gradient at `components/ui/BackgroundCanvas.tsx`). Settings and Insights stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` (intentional drift per Spec 10A). Music preserves rolls-own atmospheric layers (audio engine + AudioProvider / audioReducer / AudioContext cluster integrity per Spec 11A — Decision 24). HorizonGlow.tsx is orphaned legacy as of Visual Rollout Spec 1A. GlowBackground remains active on the homepage only.
- Daily Hub tab headings ("What's On Your Heart/Mind/Spirit?") have been REMOVED. Tab content leads directly into the input or activity — no heading.
- Devotional readability tiers (Spec T + DailyHub 2): Tier 1 (primary reading content) uses `FrostedCard variant="accent"` with `text-white leading-[1.75-1.8] text-[17px] sm:text-lg`, eyebrow + violet leading dot signature. Tier 2 (scripture callout) uses `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` with eyebrow but NO leading dot — left-stripe is its visual signature. Italic styling is removed for sustained-reading prose.
- Pray and Journal textareas use the canonical violet-glow pattern (DailyHub 1B / Visual Rollout): `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`. Same pattern applies to GratitudeWidget input, CreatePlanFlow textarea, and AskPage question textarea. Do NOT use `animate-glow-pulse` (deprecated), white-glow shadow (deprecated post-Visual-Rollout), or cyan border (deprecated).
- White pill CTA patterns: Pattern 1 (inline, smaller, used inside cards) and Pattern 2 (homepage primary, larger with white drop shadow — uses `text-hero-bg`, NOT `text-primary`). See `09-design-system.md` § "White Pill CTA Patterns" for the canonical class strings — the strings are verbatim only; any drift is a regression.
- Default secondary CTA on dark surfaces is `<Button variant="subtle">` (frosted pill: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:-translate-y-0.5`). Replaces most `bg-primary` solid usage post-Visual-Rollout. Default emotional-peak CTA is `<Button variant="gradient" size="lg">` (text-black, NOT text-violet-900). Default text-button on dark is `text-violet-300 hover:text-violet-200` (NOT `text-primary` — fails WCAG 4.5:1 floor).
- Selectable pills (settings tabs, time-range selectors, RadioPillGroup) use the muted-white active-state: `bg-white/15 text-white border border-white/30`. Tab bars use the pill+halo treatment: outer `bg-white/[0.07] border-white/[0.08]`, active tab `bg-violet-500/[0.13] border-violet-400/45 + violet halo shadow`. Selected card ring: `ring-violet-400/60` (NOT `ring-primary`).
- Border opacity unification (Visual Rollout): all decorative card/chrome borders on dark use `border-white/[0.12]`, NOT `border-white/10`. Tighter (`/[0.18]`) acceptable for hover emphasis. Looser (`/[0.08]`) acceptable for pill tabs' outer border.
- Sticky FABs use `pointer-events-none` outer + `pointer-events-auto` inner with `env(safe-area-inset-*)` for iOS notch and Android nav bar respect. Drawer-aware FABs (like `DailyAmbientPillFAB`) auto-hide when `state.drawerOpen === true`.
- Frosted glass cards: `bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-3xl` with dual box-shadow (post-Visual-Rollout values — earlier `bg-white/[0.06]` + `rounded-2xl` are drift). Use the `FrostedCard` component, not a hand-rolled card. Variant API: `accent | default | subdued`. Tier 1 uses `variant="accent"` with eyebrow + violet leading dot.
- Tonal Icon Pattern (Spec 4B — dashboard widget headers): per-widget header icon color taxonomy: `text-pink-300` (gratitude family), `text-sky-300` (insight/data family), `text-violet-300` (default/spiritual family), `text-emerald-300` (positive/success family), `text-amber-100` / `text-amber-300` (recap/seasonal family), `text-yellow-300` (achievement family). Severity status indicators: `text-emerald-300` / `text-red-300` / `text-amber-300` (replaces `text-success`/`text-danger`/`text-warning` which referenced old palette).
- Layout default flipped to `transparentNav: true` post-Spec-12. Opaque mode is retained only as `transparentNav={false}` defensive fallback. The transparent overlay navbar is the canonical production state on every page including non-hero pages.
- Severity color refresh: `text-success` and `text-danger` (CSS variables) are deprecated; use `text-emerald-300` / `text-red-300` directly. Muted destructive button treatment: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40` — saturated `bg-red-700/800` is deprecated.
- AlertDialog pattern (Spec 10A / 11B): destructive confirmations use `<Button variant="alertdialog">` for the destructive action, `AlertTriangle` icon in the heading row, and the muted destructive treatment above.
- Cross-surface card pattern (Spec 3): navigable cards use `<Link> + FrostedCard` group-hover. Outer `<Link className="block group focus-visible:outline-none focus-visible:ring-2 ring-white/50 rounded-3xl">` with inner `<FrostedCard variant="default" as="article" className="group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5">`. FrostedCard does NOT receive `onClick`; the Link handles navigation.
- Auth deep links (Spec 7): `/?auth=login` and `/?auth=register` open the AuthModal in the corresponding mode. The legacy `/login` route now redirects to `/?auth=login`. Cross-surface auth-gating CTAs that previously hard-routed to `/login` should use the query-param deep link instead.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- Inline element layouts (chips and pills on a single row, label + input pairs): document expected y-coordinate alignment in the plan so `/verify-with-playwright` can compare `boundingBox().y` values between elements. CSS class verification alone misses wrapping bugs.
 
**Source these from:** the Design System Reference, `.claude/rules/09-design-system.md` (especially the Round 3 Visual Patterns + Daily Hub Visual Architecture + Deprecated Patterns sections), AND recent plan Execution Logs where deviations were caused by design system misunderstandings. Patterns that caused past bugs are the most important to include here.
 
This block is displayed verbatim by `/execute-plan` Step 4d before each UI step to prevent mid-implementation drift back to default assumptions.
 
---
 
## Shared Data Models (from Master Plan)
 
**If a master spec plan was loaded, include the shared data models this spec depends on or produces:**
 
```typescript
// Include relevant TypeScript interfaces from the master plan
// that this spec needs to implement or consume
```
 
**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
|  | Read / Write / Both |  |
 
---
 
## Responsive Structure
 
**Breakpoints and layout behavior for `/execute-plan` and `/verify-with-playwright`:**
 
| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | {e.g., single column, full-width cards, stacked sections} |
| Tablet | 768px | {e.g., 2-column grid, side padding increases} |
| Desktop | 1440px | {e.g., max-width container, 3-column grid} |
 
**Custom breakpoints (if any):** {from recon or design system — e.g., "card grid switches at 640px, not 768px"}
 
---
 
## Inline Element Position Expectations (UI features with inline rows)
 
**For any feature where multiple elements should sit on the same row** (chip rows, button groups, pills inline with inputs, label + input pairs, etc.), document the expected positional alignment so visual verification can catch wrapping bugs that CSS-only verification misses.
 
| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| {e.g., "Pray chip row"} | Chip 1, Chip 2, Chip 3, Ambient pill | No wrapping at 1440px and 768px (children stay within the row's vertical span) | Wrapping below 640px is acceptable |
 
**If the feature has no inline-row layouts:** write "N/A — no inline-row layouts in this feature."
 
This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification).
 
### How to phrase the alignment expectation
 
Two distinct assertions, used in different contexts:
 
1. **"No wrapping" — the right assertion for variable-height children.** Children stay within the row's vertical span. With `flex items-center` plus children of different intrinsic heights (e.g., a fixed-size icon next to a multi-line title and a CategoryTag chip), each child's `boundingBox().top` legitimately differs by 16–30px while the row is correctly center-aligned. A wrapping bug shows up as one child sitting an entire row-height (typically 40px+) below the others — that is what the verification step needs to catch. The assertion text should describe the anti-state: "No element drops below the row's vertical span" or simply "No wrap allowed" plus the breakpoint.
 
2. **"Matching top-y values (±5px)" — only when children share intrinsic heights.** Use this when every element in the row has the same height by construction (e.g., a row of equal-height pill buttons, or a tab bar where every tab item has identical chrome). Spec 6A's sticky tab bar — `[role="tab"]` items with identical chrome — passed top-y matching at 0px delta at every breakpoint. If a row has any variable-height child, top-y matching produces false positives even when the layout is correct.
 
**Default to "No wrapping".** Reserve "Matching top-y" for rows of structurally identical elements. If a heading-row contains an icon + multi-line title + chip, write "No wrap allowed" — Spec 6A's verification surfaced this anti-pattern when the plan's "Same y ±5px" expectation produced a 30px delta on a correctly-rendered `items-center` heading row. (See Spec 6A verification report, Finding 2.)
 
---
 
## Vertical Rhythm
 
**Expected spacing between adjacent sections (from the Recon Context table above, the Design System Reference, or codebase inspection):**
 
| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → first content section | {px} | design-system.md / codebase inspection |
| Content section → next section | {px} | {source} |
| Last section → footer | {px} | {source} |
 
`/execute-plan` checks these during visual verification (Step 4g). `/verify-with-playwright` compares these in Step 6e. Any gap difference >5px is flagged as a mismatch.
 
---
 
## Assumptions & Pre-Execution Checklist
 
Before executing this plan, confirm:
 
- [ ] 
- [ ] 
- [ ] 
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference or codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Recon report loaded if available (for visual verification during execution)
- [ ] Prior specs in the sequence are complete and committed (if multi-spec feature)
- [ ] No deprecated patterns used. Pre-Visual-Rollout: Caveat headings outside wordmark/RouteLoadingFallback, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, HorizonGlow as canonical, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds. Post-Visual-Rollout: white textarea glow, `bg-primary` solid CTAs on dark, `text-primary` text-buttons on dark (use `text-violet-300`), `text-success`/`text-danger` (use explicit emerald/red 300), `border-white/10` (use `border-white/[0.12]`), `rounded-2xl` as FrostedCard default (use `rounded-3xl`), saturated `bg-red-700/800` destructive, `Layout transparentNav: false` as default. See `09-design-system.md` § "Deprecated Patterns" for the full table.
 
---
 
## Edge Cases & Decisions
 
| Decision | Choice | Rationale |
|----------|--------|-----------|
|  |  |  |
 
---
 
## Implementation Steps
 
### Step 1: 
 
**Objective:** 
 
**Files to create/modify:**
- `` — 
 
**Details:**
 
 
 
**Auth gating (if applicable):**
- 
- 
- 
 
**Responsive behavior (UI steps only — write "N/A: no UI impact" for non-UI steps):**
- Desktop (1440px): 
- Tablet (768px): 
- Mobile (375px): 
 
**Inline position expectations (if this step renders an inline-row layout):**
- {e.g., "Chips and ambient pill must share y-coordinate at 768px and 1440px (±5px tolerance)"}
 
**Guardrails (DO NOT):**
- 
 
**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
|  | unit/integration |  |
|  | unit |  |
 
**Expected state after completion:**
- [ ] 
- [ ] 
- [ ] 
 
---
 
### Step 2: 
 
 
 
---
 
 
 
---
 
## Step Dependency Map
 
| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — |  |
| 2 | 1 |  |
| 3 | 1, 2 |  |
 
---
 
## Execution Log
 
| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 |  | [NOT STARTED] | | |
| 2 |  | [NOT STARTED] | | |
| 3 |  | [NOT STARTED] | | |
````
 
### Plan Quality Self-Review Checklist
 
**Before saving the plan, verify it passes ALL of these checks. Do not save until every applicable item is confirmed:**
 
1. [ ] Every step has: exact file paths, method signatures/prop types, DO NOT guardrails, test specs, expected state
2. [ ] **No tentative language anywhere** — no "should probably", "might want to", "consider doing". Every decision is explicit.
3. [ ] Patterns referenced in the plan actually match what was found in reconnaissance (not assumed from general knowledge)
4. [ ] The plan is self-contained: someone reading it without the spec can understand what to build
5. [ ] **Affected Frontend Routes** section populated — either with the actual user-facing routes touched by this spec (one per line, backtick-wrapped, including query params), or with "N/A — backend-only spec" if no UI is involved. Required for `/verify-with-playwright` plan-only invocation.
6. [ ] Every auth-gated action from the spec appears in the Auth Gating Checklist AND in the relevant implementation step
7. [ ] Every [UNVERIFIED] value includes: best guess, how to verify, what to do if wrong
8. [ ] Test count is calibrated to complexity — simple utility: 2-4 tests; complex interactive component with auth gating, error states, responsive: 10-15
9. [ ] UI steps include responsive behavior at 3 breakpoints (mobile, tablet, desktop); non-UI steps say "N/A: no UI impact"
10. [ ] If Design System Reference exists: exact computed values used in Details section (not "use the primary color" but "use `#6D28D9`")
11. [ ] If Design System Reference NOT found: values from codebase inspection are cited with file:line, and guessed values are marked [UNVERIFIED]
12. [ ] Steps are small — each touches ≤3 files and is independently verifiable
13. [ ] Steps are ordered for safety — data models/API before UI, shared utilities before consumers
14. [ ] AI Safety guardrails included in every step that touches AI-generated content
15. [ ] Auth gate tests included for every step that implements a gated action (verify auth modal appears for logged-out users)
16. [ ] Design System Reminder populated from: the Design System Reference + rules files (especially `09-design-system.md` Round 3 Visual Patterns, Daily Hub Visual Architecture, and Deprecated Patterns) + deviations from recent Execution Logs
17. [ ] Vertical Rhythm values included (from the Recon Context table or Design System Reference, if available)
18. [ ] Inline Element Position Expectations table populated for any UI step with inline-row layouts (or marked N/A)
19. [ ] If master spec plan exists: shared data models, localStorage keys, and cross-spec integration points are in Architecture Context
20. [ ] Edge Cases & Decisions table is populated — at least the obvious edge cases are covered
21. [ ] No deprecated patterns are introduced. Pre-Visual-Rollout: Caveat headings outside wordmark/RouteLoadingFallback, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, HorizonGlow as canonical, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds, PageTransition component. Post-Visual-Rollout: white textarea glow, `bg-primary` solid CTAs on dark, `text-primary` text-buttons on dark, `text-success`/`text-danger` CSS-variable colors, `border-white/10` decorative borders, `rounded-2xl` as FrostedCard default, saturated `bg-red-700/800` destructive, `Layout transparentNav: false` as default. See `09-design-system.md` § "Deprecated Patterns" for the canonical table.
 
**Additional quality rules:**
 
- **Reference existing patterns.** Cite specific file and line range: "Follow the pattern in `src/components/daily/PrayTabContent.tsx` lines 15-40."
- **Include guardrails.** Every step should have a "DO NOT" list — especially around Worship Room–specific concerns (AI safety, demo mode, encryption, crisis detection, deprecated visual patterns).
- **Use exact design values.** When citing a component pattern, include the full CSS: not "match the hero" but "use `background: linear-gradient(...)`, `padding: 3rem 0`, `text-align: center`".
- **Include shared data models.** When a master spec plan exists, include the shared TypeScript interfaces and localStorage keys this spec depends on or produces.
 
---
 
## Step 4: Final Output
 
After the plan is saved, respond with:
 
```
Plan saved: _plans/YYYY-MM-DD-<feature_slug>.md
Steps:      <N> steps
Spec:       <path to spec>
Auth gates: <N> actions gated
Design System Reference: loaded / not found
Recon Report: loaded / not applicable
Master plan: loaded / not applicable
[UNVERIFIED] values: <N> (will be flagged during execution and verification)
Inline-row layouts: <N> (will be position-verified by /verify-with-playwright)
 
Pipeline:
  1. Review the plan
  2. /execute-plan _plans/YYYY-MM-DD-<feature_slug>.md
  3. /code-review _plans/YYYY-MM-DD-<feature_slug>.md
  4. /verify-with-playwright {route} _plans/YYYY-MM-DD-<feature_slug>.md
  5. Commit when satisfied
```
 
Do not repeat the full plan in chat unless the user asks. The plan file is the artifact — point the user to it.
 
---
 
## Examples
 
```bash
# Generate a plan from a spec
/plan _specs/mood-selector-page.md
 
# Generate a plan for a multi-spec feature
/plan _specs/daily-experience.md
```
 
## Rules
 
- **Stay in Act mode.** Do not enter Plan Mode. You need file write access to save the plan.
- **Do not implement anything.** This command produces a plan, not code.
- **Do not modify any existing files.** Only create the new plan file.
- **Do not perform git operations.** The user handles all git operations.
- **No tentative language.** Never write "should probably", "might want to", "consider doing" in the plan. Every decision must be explicit.
- **The spec is the product authority.** If something is ambiguous in the spec, note it in "Assumptions & Pre-Execution Checklist" rather than guessing. The user resolves ambiguities before execution.
- **Security rules are mandatory.** Read `.claude/rules/02-security.md` during reconnaissance. Every auth-gated action from the spec must appear in the Auth Gating Checklist and in the relevant implementation step.
- **Design values are mandatory for UI.** If a Design System Reference exists, use its exact values. If not, cite the specific codebase file/line where you found each value.
- **Deprecated patterns are forbidden.** The Deprecated Patterns table in `09-design-system.md` is canonical. Plans that introduce deprecated patterns must be rejected and rewritten.
- **[UNVERIFIED] values must be explicit.** Never silently use a guessed value. Mark it `[UNVERIFIED]` with verification and correction methods. This is how the downstream pipeline catches visual mismatches early instead of after all steps are complete.
- **Inline-row layouts must document position expectations.** If the feature has any layout where multiple elements should share a row, populate the Inline Element Position Expectations table so `/verify-with-playwright` can catch wrapping bugs.
- **Recon data flows downstream.** If a recon report exists, its CSS Mapping Tables, Gradient tables, Vertical Rhythm tables, Link inventories, States tables, and Text Content Snapshots are consumed by `/execute-plan` (visual verification checkpoints) and `/verify-with-playwright` (design compliance checks). Reference the recon report path in the plan header so downstream skills can auto-load it.
- **Master plan data flows into Architecture Context.** If a master spec plan exists, its shared data models, localStorage keys, cross-spec integration points, and constants must appear in the Architecture Context and Shared Data Models sections. This prevents specs from inventing conflicting interfaces.
 
---
 
## See Also
 
The standard flow is `playwright-recon (optional) → spec → plan → execute-plan → code-review → verify-with-playwright`.
 
- `/playwright-recon` — Capture visual specs from live pages (`--internal` for the design system, default mode for an external page being replicated); its Recon Report is transported into this plan's `## Recon Context` section
- `/spec` — Write a feature specification (produces the spec this skill consumes)
- `/execute-plan` — Execute all steps from this plan
- `/code-review` — Pre-commit code review (cross-references this plan for compliance)
- `/verify-with-playwright` — Runtime UI verification (consumes this plan for context, including the Recon Context section and its Source URL for `--compare-prod`)