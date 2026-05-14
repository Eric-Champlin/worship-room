---
description: Execute all steps from an implementation plan
argument-hint: Path to plan file (e.g. _plans/2026-03-03-daily-experience.md)
user-invokable: true
---
 
# execute-plan
 
Execute all steps from an implementation plan created by `/plan`.
 
User input: $ARGUMENTS
 
## High-Level Behavior
 
Read a plan file, verify assumptions, then work through each step sequentially — implementing code, creating tests, performing visual verification on UI steps, verifying expected state, and updating the Execution Log. After all steps are complete, the user reviews changes and handles git operations.
 
**CRITICAL:** This command does NOT commit, push, or perform any git operations. The user handles all git operations manually.
 
**CRITICAL:** If any step fails verification or encounters a conflict, STOP immediately. Do not continue to the next step.
 
---
 
## Step 1: Read the Plan
 
Read the plan file at the path provided in `$ARGUMENTS`.
 
**If the file does not exist:**
 
```
Error: Plan file not found at <path>
 
Run /plan <spec-path> first to generate a plan, or verify the path.
```
 
**Stop immediately.**
 
---
 
## Step 2: Internalize the Plan
 
Before doing anything, read and internalize:
 
1. **Architecture Context** — Re-ground yourself in the codebase patterns, conventions, and related files documented during reconnaissance. If a Design Context section is present (from Figma or recon), internalize the exact design specifications — these are your source of truth for UI implementation.
 
2. **Design System Reference** — Check if `_plans/recon/design-system.md` exists. If it does, read it and internalize the full design system: color tokens, typography scale, spacing values, and design-system-wide component patterns (hero, card, button, section, decorative elements). **This is the source of truth for design-system-wide styling** — the tokens and patterns shared across the whole app. When the plan says "match the existing hero" or "use the same card style," look up the exact computed values from this file — do NOT inspect other components at build time or guess. (Per-screen/per-component exact values for *this feature* live in the plan's Recon Context section — see item 4 below.) If the design system file does not exist, proceed without it but flag to the user: "No Design System Reference found at `_plans/recon/design-system.md`. Consider running `/playwright-recon --internal` to generate one for more accurate UI implementation."
 
3. **`.claude/rules/09-design-system.md`** — Read this for architectural patterns, the Round 3 Visual Patterns section, the BackgroundCanvas Atmospheric Layer section (which includes the Daily Hub-specific structure paragraph), the FrostedCard Tier System, the Button variant taxonomy, the Active-State and Selection Patterns, the Text-Button Pattern, the Tonal Icon Pattern, the white pill CTA patterns, the violet textarea glow pattern, the AlertDialog Pattern, the sticky FAB pattern, the drawer-aware visibility pattern, the inline element layout verification rule, and the Deprecated Patterns table. The Design System Reference wins on specific design-system-wide CSS values; this file wins on architectural principles and component patterns.
 
4. **Recon Context (if present)** — If the plan has a `## Recon Context` section, internalize it. This is the per-screen/per-component source of truth for this feature's visual values: the CSS Mapping Table, Gradient tables, Vertical Rhythm table, Image tables, Link inventory, States tables, Form Responsive Widths table, Intra-element text variation tables, and Text Content Snapshot. Every exact Tailwind class and pixel value in the UI implementation steps came from here. The Recon Context is authoritative for *this feature's* values; the Design System Reference (item 2) is authoritative for design-system-wide tokens and patterns. If the plan references a Recon Report but the Recon Context section is empty or missing, flag to the user: "Plan references a Recon Report but has no populated Recon Context section — visual verification will fall back to the Design System Reference and codebase inspection."
 
5. **Master Spec Plan** — Check the plan header for a "Master Spec Plan" reference. If one exists, read it for shared data models, localStorage keys, cross-spec integration points, and constants. When implementing data models or storage keys, use the exact interfaces and key names from the master plan — do not invent alternatives.
 
6. **Assumptions & Pre-Execution Checklist** — If this is the first run (no steps marked [COMPLETE] in the Execution Log), verify the checklist:
   - Display the checklist to the user
   - Ask: "Have you reviewed and confirmed these assumptions? (yes/no)"
   - **DO NOT proceed until the user confirms**
   - If the user says an assumption is wrong, **STOP** and inform them to update the plan
 
7. **Edge Cases & Decisions table** — Know the explicit decisions so you don't re-decide them during implementation.
 
8. **[UNVERIFIED] values** — Scan the plan for any `[UNVERIFIED]` flags. Know which values are provisional before you start implementing. These get extra scrutiny during visual verification (Step 4g).
 
9. **Inline Element Position Expectations table** — If the plan contains inline-row layouts, internalize the expected y-coordinate alignments. These are checked in Step 4g (Inline Element Positional Verification).
 
10. **Record the starting file set** — Run `git diff --name-only HEAD 2>/dev/null` and store the list of already-changed files. This is used in Step 4a to distinguish pre-existing changes from changes made by this execution session.
 
---
 
## Step 3: Find the Starting Point
 
Check the **Execution Log** table. Find the first step with status `[NOT STARTED]` or `[IN PROGRESS]`.
 
**If all steps are `[COMPLETE]`:**
 
```
# Plan Complete
 
All steps have been executed successfully.
 
## Completed Steps
| Step | Title | Completion Date |
|------|-------|----------------|
(from Execution Log)
 
## Next Actions
1. Review all changes
2. Run full test suite: pnpm test
3. Run /code-review for final quality check
4. For UI work: /verify-with-playwright {route} <plan-path> for comprehensive visual check
5. Commit and push when satisfied
6. Plan retained at: <plan-path>
```
 
**Stop.**
 
**If there are incomplete steps:**
 
**Create a safety backup before making any code changes (first run only):**
 
If this is the first execution (no steps marked [COMPLETE] in the Execution Log):
 
```bash
BACKUP_BRANCH="backup/pre-execute-$(date +%Y%m%d%H%M%S)"
git branch "$BACKUP_BRANCH" 2>/dev/null || true
```
 
```text
✅ Safety backup created: {BACKUP_BRANCH}
 
If execution goes badly, you can restore with:
  git reset --hard {BACKUP_BRANCH}
```
 
Store the backup branch name for consistent reference throughout the session.
 
If this is a re-run (some steps already [COMPLETE]), skip the backup — the user may have committed intermediate progress.
 
Proceed to Step 4 and begin the execution loop.
 
---
 
## Step 4: Execute Each Step (Loop)
 
For each incomplete step in order:
 
### 4a: Pre-Execution Safety Check
 
**CRITICAL: Before executing ANY step that modifies or reverts files, check for uncommitted changes that predate this execution session:**
 
```bash
git status --porcelain
```
 
Compare the list of changed files against:
1. Files listed in any completed step's "Files to create/modify" (changes from this session — expected)
2. The starting file set recorded in Step 2.10 (changes that predate this session — unexpected)
 
**If there are uncommitted changes to files NOT created/modified by any completed step in this session AND NOT in the starting file set:**
 
```text
⚠️  UNCOMMITTED CHANGES DETECTED (not from this execution session)
 
The following files have uncommitted changes that predate this run:
- {file list}
 
The plan may include operations that overwrite files.
 
Options:
1. Commit current changes first (recommended): git add -A && git commit -m "WIP: save progress"
2. Stash changes: git stash push -m "pre-plan-execution"
3. Proceed anyway (WILL LOSE uncommitted work)
 
Which option? (1/2/3)
```
 
**NEVER run `git checkout`, `git restore`, or any file-reverting command on files with uncommitted changes without explicit user approval.** This is a destructive operation. Wait for the user to choose.
 
**If all uncommitted changes are from completed steps in this session:** Proceed normally — these are expected work-in-progress files.
 
### 4b: Check Dependencies
 
Verify all dependencies (from the Step Dependency Map) are marked `[COMPLETE]`.
 
**If not met:** Stop and tell the user which steps need to be completed first.
 
### 4c: Preview the Step
 
Before implementing, show:
 
```
# Executing: Step <N> — <title>
 
Objective: <objective>
 
Files to create/modify:
- <file list>
 
Guardrails (DO NOT):
- <each DO NOT item>
 
Proceeding...
```
 
**Check for [UNVERIFIED] values in this step:**
 
If the step contains any values marked `[UNVERIFIED]`, display them prominently before implementing:
 
```text
⚠️  UNVERIFIED VALUES IN THIS STEP:
 
The following values were not confirmed by the Recon Context or Design System Reference and may be wrong:
 
- [UNVERIFIED] {description}: Best guess is {value}
  → To verify: {verification method from plan}
  → If wrong: {correction method from plan}
 
These values will be used as-is during implementation. The visual verification
checkpoint (4g) should specifically compare these against the design system or existing UI.
```
 
**Do NOT skip unverified values — implement the best guess, but flag them for extra scrutiny during visual verification (Step 4g).**
 
### 4d: Design System Reminder (UI steps only)
 
**Before implementing any step that touches UI, do two things:**
 
**1. Display the Design System Reminder from the plan (if present):**
 
<!-- MAINTENANCE NOTE: This canonical patterns block must stay in sync with `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns" AND with the matching block in `.claude/skills/plan/SKILL.md` § "Design System Reminder". When 09 updates, update both inline copies. The original visual-rollout sync was performed in the 2026-05-07 reconciliation (see `_plans/reconciliation/2026-05-07-post-rollout-audit-addendum.md`). -->
 
```text
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
 
{plan-specific quirks from the Design System Reminder block}
 
All styling for this step must account for these patterns.
```
 
**2. Re-read the relevant section of the Design System Reference** (`_plans/recon/design-system.md`) AND the relevant Round 3 Visual Patterns / BackgroundCanvas Atmospheric Layer / FrostedCard Tier System / Button Component Variants / Active-State and Selection Patterns sections of `.claude/rules/09-design-system.md` for the specific component being built in this step. Do not rely on values memorized from Step 2 — re-read fresh to ensure accuracy. Look up the exact values for this component's colors, typography, spacing, gradients, and hover states.
 
**If no Design System Reminder in the plan:** Skip the plan-specific quirk display, but still show the canonical patterns block above and re-read both design system files.
 
### 4e: Implement
 
Execute the step following the plan's exact specifications.
 
**Hierarchy of authority:**
 
1. **The plan's explicit instructions** — file paths, method signatures, patterns, guardrails
2. **Master Spec Plan** — shared data models, localStorage keys, cross-spec interfaces
3. **Recon Context** (the plan's `## Recon Context` section, transported from an external Recon Report) — per-screen/per-component exact CSS values for *this feature*. Most specific source: when it covers a component, it wins on that component's values.
4. **Design System Reference** (`_plans/recon/design-system.md`) — design-system-wide computed CSS values, color tokens, typography, component patterns. Authoritative for any component the Recon Context does not cover.
5. **`.claude/rules/09-design-system.md`** — architectural patterns, Round 3 Visual Patterns, Daily Hub Visual Architecture, deprecated patterns
6. **Architecture Context** — patterns from reconnaissance
7. **CLAUDE.md and `.claude/rules/`** — project standards
8. **General best practices** — only when the above are silent
 
**Requirements:**
 
- Use exact file paths from the plan
- Follow referenced patterns — when the plan says "follow the pattern in `ExistingComponent.tsx`", read that file and match it
- Respect DO NOT guardrails — check each action against them before proceeding
- Match design specs — use exact colors, spacing, typography from the Design System Reference or plan's Architecture Context. Do not approximate.
- **Do not introduce deprecated patterns.** The Deprecated Patterns table in `09-design-system.md` lists patterns that have been replaced. If the spec or plan accidentally references a deprecated pattern, STOP and flag it before implementing.
- Match test patterns — use the same naming, assertion style, and setup patterns from Architecture Context
- Use shared data models exactly as defined — when the master plan specifies a TypeScript interface or localStorage key, use it verbatim. Do not rename fields or invent alternative keys.
 
**Logging best practices:**
- Don't fetch additional data just for logging
- Log only essential information already available
- Keep log statements concise and informative
 
**If you encounter ambiguity:**
- **STOP** and ask the user. Do not guess.
 
**If the plan is wrong** (file doesn't exist, interface doesn't match):
- **STOP** and flag the discrepancy. Show what the plan says vs. what exists.
- Ask whether to update the plan or adapt.
- Do not silently deviate.
 
### 4f: Create Tests
 
Implement test cases specified in the plan's test specifications for this step.
 
- Use the naming conventions and assertion patterns from the Architecture Context
- Use constants for test data (group by context, alphabetize within groups)
- Only create tests specified in the plan
- If you spot an obvious testing gap, implement the planned tests first, then flag the gap
 
**Repository tests (if specified):**
- Use SQL INSERT statements from the plan for test data setup
- Set up foreign key dependencies in the order specified
 
**Integration tests (if specified):**
- Use exact test data setup from the plan
- Use appropriate stubbing for external HTTP services
- Reuse test contexts to keep tests fast
 
### 4g: Visual Verification Checkpoint (UI steps only)
 
**CRITICAL: For any step that creates or modifies a UI component, perform visual verification BEFORE moving to the next step. Do NOT batch visual checks at the end.**
 
This applies when:
- The step creates a new React component
- The step modifies styling, layout, or spacing
- The step changes any visible UI element
- The plan has a Recon Context section or design specs
 
**Skip visual verification for purely backend steps with no UI impact.**
 
**Verification process:**
 
1. Start the dev server if not already running (`pnpm dev` from `/frontend`)
2. **Wait for render:** After navigation, wait for `networkidle` AND verify key elements are visible before taking screenshots. For components with async data (Spotify embeds, API calls, lazy images), wait for the loading state to resolve. Do NOT screenshot a loading spinner or partially-rendered page.
3. **Screenshot the built component at multiple breakpoints** using Playwright. Use breakpoints from the plan's Responsive Structure section, or defaults: 375px, 768px, 1440px.
4. **Compare against the Recon Report screenshots** for that component (if the external Recon Report includes them)
5. **Extract computed styles** and compare against the CSS Mapping Table from the plan's Recon Context section (if a Recon Report was loaded), falling back to the Design System Reference's design-system-wide values for any component the recon didn't cover. Use the **exhaustive property list** — compare ALL of these for every element:
   - Dimensions: width, height, max-width, min-width, min-height
   - Spacing: padding (all sides), margin (all sides), gap
   - Borders: border-top, border-right, border-bottom, border-left, border-radius
   - Background: background-color, background-image
   - Typography: font-size, font-weight, line-height, color, text-align, text-transform, letter-spacing
   - Layout: display, flex-direction, align-items, justify-content
   - Effects: box-shadow, opacity
 
6. **Inline Element Positional Verification (NEW — if plan has Inline Element Position Expectations):**
 
   For every entry in the plan's Inline Element Position Expectations table, capture the `boundingBox().y` of each element in the group at each tested breakpoint and compare:
 
   ```text
   ## Inline Position Verification: Step <N>
 
   ### Group: {e.g., "Pray chip row"} at 1440px
   | Element | y-coordinate | Match expected? |
   |---------|-------------|-----------------|
   | Chip 1 | 412 | YES |
   | Chip 2 | 412 | YES |
   | Chip 3 | 412 | YES |
   | Ambient pill | 466 | NO — wrapped to row 2 |
   ```
 
   **Differing y-coordinates indicate wrapping bugs.** This is a HIGH severity layout failure even if individual element CSS is correct. Treat as a structural mismatch and fix before continuing.
 
7. **Matching tolerance: There is NO "CLOSE" verdict.** Every comparison is YES or NO:
   - Numeric values differ by ≤2px → YES
   - Numeric values differ by >2px → NO
   - Colors differ at all → NO
   - y-coordinates of inline-row elements differ by >5px → NO (wrapping bug)
   - Any other difference → NO
 
8. **If any [UNVERIFIED] values exist in this step**, compare them FIRST against the recon or existing UI and flag if the guess was wrong.
 
9. **Additional checks (if the recon/plan includes these tables):**
   - **Gradients:** Compare the full background-image gradient string. If the gradient angle or cutoff position differs by >5px, flag as a mismatch.
   - **Vertical rhythm:** Measure the gap between adjacent sections and compare against the recon's Vertical Rhythm table. Any gap difference >5px is a mismatch.
   - **Images:** Compare rendered width/height of images against the recon's Image tables.
   - **Links:** Verify that text documented as links in the recon's Link inventory is actually wrapped in `<a>` tags with correct href, target, color, and text-decoration. Plain text where links should be is a mismatch.
   - **Hover/focus states:** If the recon includes States tables, hover each button and verify background-color/shadow changes match. Focus each input and verify border/outline changes match. Missing hover/focus styles are a mismatch.
   - **Form responsive widths:** If the plan or recon includes a Form Responsive Widths table, verify form container and input widths at EVERY breakpoint — not just desktop. If inputs stretch full-width on mobile when the design constrains them, this is a HIGH severity mismatch.
   - **Intra-element style variations:** If the plan or recon documents text blocks with mixed formatting (e.g., bold opening phrase, italic body, styled links within one paragraph), verify each style region renders correctly. Check that `<strong>`, `<em>`, `<b>`, `<i>` tags are present in the rendered HTML where documented.
   - **Conditional content:** If the recon documents conditional/dynamic content (e.g., a field that appears when a tab is selected), trigger the condition and verify the content appears with correct styling.
 
10. **Auth state verification for dashboard/logged-in features:**
    If the component requires logged-in state and the project uses simulated auth via localStorage (`wr_auth_simulated`):
    - Inject auth state via Playwright's `page.addInitScript()` BEFORE navigating:
      ```typescript
      await page.addInitScript(() => {
        localStorage.setItem('wr_auth_simulated', 'true');
        localStorage.setItem('wr_user_name', 'Test User');
      });
      ```
    - Verify BOTH logged-out state (default, no injection) AND logged-in state
    - If the step also needs seed data (mood entries, friends, badges, etc.), inject it via the same mechanism using the data models from the master plan
    - Do NOT modify source code for auth or data seeding
 
11. **Produce a comparison table:**
 
```text
## Visual Verification: Step <N> — <component name>
 
| Element | Property | Expected Value | Built Value | Match? | Fix Hint |
|---------|----------|---------------|-------------|--------|----------|
| {elem}  | {prop}   | {expected}    | {actual}    | YES/NO | {Tailwind class if NO} |
```
 
12. **If all values match (including positional):** Proceed to 4h
13. **If mismatches found:**
 
   First, classify each mismatch:
   - **(a) Value mismatch** — wrong color, size, spacing, font, etc. Fix: apply the exact value from the CSS Mapping Table or Fix Hint.
   - **(b) Structural mismatch** — wrong HTML nesting, missing wrapper div, wrong flexbox direction, missing element entirely, **inline-row elements wrapping when they should be on the same row**. Fix: review DOM structure against the plan's expected component structure; for wrapping, narrow chip widths, increase container max-width, or change to a different layout pattern.
   - **(c) Behavioral mismatch** — wrong state, missing hover effect, interaction not working. Fix: review component logic, event handlers, and state management.
 
   Then fix using the appropriate strategy for the mismatch type. Re-screenshot and re-compare.
   
   After **two failed fix attempts**, STOP entirely:
 
```text
[WARNING] Visual verification failed for Step <N> after 2 fix attempts.
 
Mismatches remaining:
| Element | Property | Expected | Actual | Type |
|---------|----------|----------|--------|------|
| {elem}  | {prop}   | {val}    | {val}  | value / structural / behavioral |
 
Options:
1. I'll fix it manually and re-run /execute-plan
2. Show me the component code so I can guide you
3. Skip visual verification and continue (not recommended)
4. Run /verify-with-playwright for a more comprehensive visual check
5. Restore from backup: git reset --hard {BACKUP_BRANCH}
```
 
**If no Recon Context and no Design System Reference exists:** Do a basic browser sanity check instead — navigate to the page, verify key elements are visible, layout is correct, no console errors, interactions work. Check at mobile and desktop. If the step has inline-row layouts, still capture y-coordinates and verify alignment manually. This catches obvious visual/behavioral issues that unit tests miss.
 
### 4h: Verify Expected State
 
**Do this BEFORE updating the Execution Log.**
 
Check every item in the step's "Expected state after completion" checklist:
 
- Run specified test commands
- Verify the app compiles cleanly (`pnpm build` for frontend, `./mvnw compile` for backend)
- Check any other verification items listed
 
**If verification fails:**
 
1. Analyze and attempt one fix
2. Re-verify all items
3. **If still failing**, stop entirely:
 
```text
[WARNING] Step <N> verification failed after fix attempt. Stopping execution.
 
Failure: <what failed and why>
 
Rollback notes: <from plan>
Steps completed before failure: <list>
 
Options:
1. I'll fix it manually and re-run /execute-plan
2. Show me what you tried so I can guide you
3. Roll back this step
4. Restore from backup: git reset --hard {BACKUP_BRANCH}
```
 
**Never update the log with failing verifications. Never continue to the next step.**
 
### 4i: Update the Plan
 
**Only after all verifications pass.**
 
Update the Execution Log entry for this step:
 
| Field | Value |
|-------|-------|
| Status | [COMPLETE] |
| Completion Date | YYYY-MM-DD |
| Notes / Actual Files | Files created/modified, key changes, any deviations from plan |
 
Also update the step's **Status** field from [NOT STARTED] to [COMPLETE].
 
If the actual implementation deviated from the plan in any way, document the deviation in the Notes column so the plan remains an accurate record.
 
### 4j: Continue
 
```
— Step <N> [COMPLETE] — moving to Step <N+1> —
```
 
Loop back to 4a.
 
---
 
## Step 5: Final Summary
 
**Before producing the summary, run the end-of-run completeness gate.** Per-step verification (4h) confirms each step in isolation; this gate confirms the run as a whole is sound. Check every item:
 
- [ ] **Every step is `[COMPLETE]`** in the Execution Log — no step left `[NOT STARTED]` or `[IN PROGRESS]`. If any step is incomplete, execution stopped early; do not present a "complete" summary — report the stopping point instead.
- [ ] **Every UI step ran its Step 4g visual verification checkpoint** — and each produced an all-match comparison table (no unresolved NO verdicts, no skipped checkpoints). A UI step marked `[COMPLETE]` with no visual verification in its Execution Log notes is a gap — flag it.
- [ ] **Every `[UNVERIFIED]` value from the plan was resolved** — either confirmed correct during a Step 4g checkpoint (note which step), or escalated to the user. No `[UNVERIFIED]` value should reach code review still unverified and unflagged.
- [ ] **Every inline-row layout passed Step 4g positional verification** at the breakpoints the plan's Inline Element Position Expectations table specifies — no unresolved wrapping bugs.
- [ ] **The full test suite passes** (`pnpm test`) — not just the per-step tests run in isolation during 4h. Cross-step regressions only surface when the whole suite runs together.
- [ ] **The app builds cleanly** — `pnpm build` (frontend) and `./mvnw compile` (backend) both succeed.
- [ ] **No deprecated patterns were introduced** — a final spot-check against `09-design-system.md` § "Deprecated Patterns" across all modified UI files. (Per-step 4e already guards this; this is the whole-diff confirmation.)
 
**If any gate item fails:** do NOT present the "Plan Execution Complete" summary. Report which gate item failed and stop — the user needs to resolve it before the work is ready for `/code-review`.
 
**If all gate items pass**, produce the summary:
 
```
# Plan Execution Complete
 
All <N> steps executed successfully.
 
## Completed Steps
| Step | Title | Files Modified |
|------|-------|---------------|
(from Execution Log)
 
## Next Actions
1. Review all changes
2. Run full test suite: pnpm test
3. Run /code-review for final quality check
4. For UI work: /verify-with-playwright {route} <plan-path> for comprehensive visual check
5. Commit and push when satisfied
6. Delete safety backup after confirming changes: git branch -D {BACKUP_BRANCH}
7. Plan retained at: <plan-path>
```
 
**Stop.**
 
---
 
## Rules
 
**Execution Model:**
- Executes all incomplete steps in one invocation
- If re-run after partial execution, picks up from the first incomplete step
- **Stops immediately** on any failure, ambiguity, or plan conflict
 
**Git Operations — HANDS OFF:**
- **DO NOT** run `git commit` under any circumstances
- **DO NOT** run `git push` under any circumstances
- **DO NOT** run `git add` under any circumstances
- **DO NOT** perform any git operations whatsoever
- The user handles ALL git operations manually after reviewing code changes
 
**Plan Authority:**
- The plan is the source of truth — follow it precisely
- The master spec plan is the authority for shared data models and localStorage keys
- If the plan conflicts with general best practices, follow the plan (it was written with codebase-specific knowledge)
- If the plan conflicts with reality (files don't exist, interfaces don't match), STOP and flag it
- If the plan accidentally introduces a deprecated pattern (per `09-design-system.md` § "Deprecated Patterns"), STOP and flag it before implementing
- If you need to deviate, get user approval first and document the deviation in the Execution Log
 
**Quality:**
- Always verify expected state before marking complete
- Only update the Execution Log after verifications pass
- Do not delete the plan file — it serves as a record
- For UI steps: visual verification is mandatory, not optional
- For UI steps with inline-row layouts: positional verification (boundingBox().y) is mandatory
- Before each UI step: re-read the relevant Design System Reference section AND the relevant `09-design-system.md` patterns fresh — do not rely on memorized values from Step 2
 
**Error Handling:**
- Ambiguity → STOP, ask the user
- Plan contradicts codebase → STOP, flag with evidence
- Plan introduces deprecated pattern → STOP, flag and ask for spec/plan correction
- Tests fail after one fix → STOP, show failure details
- Visual verification fails after two fixes → STOP, surface mismatches with classification (value / structural / behavioral)
- Inline-row positional verification fails → treat as structural mismatch, narrow widths or change layout, re-verify
- Dependency not met → STOP, inform user
- Uncommitted changes from outside this session detected → STOP, offer commit/stash/proceed options
 
**Philosophy:** The plan was carefully crafted with full codebase reconnaissance. Trust it. Follow it precisely. Flag conflicts rather than improvising. Quality over speed — each step should be production-ready code.
 
---
 
## Examples
 
```bash
# Execute all steps of the plan
/execute-plan _plans/2026-03-03-daily-experience.md
 
# If execution stopped due to a failure, fix the issue and re-run
/execute-plan _plans/2026-03-03-daily-experience.md
```
 
## See Also
 
The standard flow is `playwright-recon (optional) → spec → plan → execute-plan → code-review → verify-with-playwright`.
 
- `/playwright-recon` — Capture visual specs from live pages (`--internal` for the design system, default mode for an external page being replicated)
- `/spec` — Write a feature specification (upstream of /plan)
- `/plan` — Create implementation plan from a spec (produces the plan this skill consumes)
- `/code-review` — Review all code changes (run immediately after this skill completes — the next step in the standard flow)
- `/verify-with-playwright` — Runtime UI verification with screenshots and computed style comparison (runs after code-review)