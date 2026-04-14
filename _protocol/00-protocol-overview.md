# Repository-Wide Deep Review Protocol
 
**Version:** 1.1
**Status:** Active
**Owner:** Engineering
**Last updated:** 2026-04-13
 
---
 
## Purpose
 
This protocol defines a multi-phase deep review of the entire frontend codebase. It is run at strategic intervals (between major waves, before releases, after long branches merge to main) to catch the class of issues that per-spec code review and per-spec verification cannot catch: accumulated drift, cross-spec contract violations, accumulated technical debt, dependency rot, visual regressions on pages outside the current work area, and architectural inconsistency.
 
Per-spec `code-review` and per-spec `verify-with-playwright` are tactical. They answer "is this spec correct in isolation?" This protocol is strategic. It answers "is the codebase as a whole healthy?"
 
The two are complementary, not redundant. Run per-spec checks after every spec. Run this protocol at the intervals defined below.
 
---
 
## When to run
 
Run the full protocol at any of these triggers:
 
- **Between major feature waves** (e.g., after a wave of 15+ specs ships, before starting the next wave)
- **After a wave-level integrity audit completes** (run the deep review as external verification of the wave's internal audit findings)
- **Before any release to production**
- **After a long-running feature branch merges to main**
- **When something feels off** but you can't articulate why — usually a sign of accumulated drift
- **Quarterly at minimum**, even if no other trigger fires
 
Run individual prompts on a more frequent schedule if needed:
 
- **Prompt 1 (Build & Code Health):** monthly
- **Prompt 2 (Test Suite Audit):** monthly, or after any spec that touches >5 test files
- **Prompt 3 (Dependency & Supply Chain):** monthly, plus whenever a security advisory is announced
- **Prompt 4 (Architecture & Pattern Consistency):** quarterly
- **Prompt 5 (Visual Verification):** after any spec that touches a global layout, navbar, or footer
 
---
 
## Time budget
 
A complete run of all five prompts on a healthy codebase: 4 to 8 hours.
 
A complete run on a debt-laden codebase: 12 to 24 hours, possibly spread across multiple sessions.
 
If a single prompt has been running for more than 4 hours without producing a phase boundary, stop it and investigate. Either the codebase has more debt than expected (in which case triage and split into multiple sessions) or the prompt has gone off the rails (in which case restart with tighter scope).
 
Do not interleave with feature work. Deep review and feature development require different mental modes and switching between them produces bad work in both.
 
---
 
## Prerequisites before running any prompt
 
- Working tree is clean (`git status` shows no uncommitted changes)
- Current branch is documented in the report header
- Dev server is stopped (running dev server can interfere with build artifacts)
- A known-good test run from before any current changes exists somewhere in the git history for comparison
- Node version, package manager, and Playwright version match the project's documented requirements
- Required tools are installed (see "Required tools" section below)
- A `_reports/` directory exists at the repo root for output artifacts
- You have a clear, uninterrupted block of time (don't start a 4-hour prompt with 90 minutes available)
- **The project-specific overrides file (`99-project-specific-overrides.md`) has been read and is current** — this is especially important after a major wave ships because the overrides file is where wave-specific context lives
- **Any prior wave-level audit documents have been read** (e.g., `_plans/recon/bb37-debt-audit.md`, `_plans/recon/bb37b-final-audit.md`) so the protocol doesn't duplicate work that was already done in wave-internal audits
 
---
 
## Order of execution
 
The prompts have dependencies. Run them in this order:
 
1. **Prompt 1 — Build & Code Health.** Foundation. Everything else assumes the build is clean.
2. **Prompt 2 — Test Suite Audit.** Depends on Prompt 1. Tests against a broken build are noise.
3. **Prompt 3 — Dependency & Supply Chain.** Independent of Prompt 4 in theory, but easier to run before visual verification because security fixes often require dependency updates that change how pages render.
4. **Prompt 4 — Architecture & Pattern Consistency.** Independent of Prompt 5 but benefits from a clean build and clean tests.
5. **Prompt 5 — Visual Verification.** Last because visual checks against broken code, broken tests, broken dependencies, or inconsistent architecture are wasted effort.
 
If you must run only one prompt, run Prompt 1. If you must run only two, run Prompts 1 and 2. The order is foundation-first.
 
---
 
## Success criteria
 
The protocol is considered "passing" when all of the following are true:
 
- Build is clean (zero errors, all warnings addressed or documented in `KNOWN_WARNINGS.md`)
- Lint is clean (zero errors, all warnings addressed or documented with inline explanations)
- All tests pass (zero failures, all skipped tests justified)
- No P0 or P1 visual issues across the full site
- No high or critical severity dependency vulnerabilities
- Architecture audit shows zero unexplained pattern divergences
- Lighthouse Performance ≥ 90 and Accessibility ≥ 95 on every major page (or at project-specific targets defined in the overrides file)
- A complete report has been committed to the repo at `_reports/deep-review-YYYY-MM-DD.md`
 
Anything less than all of the above is a "partial pass" and the report must list the unresolved items with severity and recommended next steps.
 
---
 
## Output
 
Every run produces a single combined report at:
 
    _reports/deep-review-YYYY-MM-DD.md
 
Where `YYYY-MM-DD` is the date the run started. If multiple runs happen on the same day, append `-N` (e.g., `deep-review-2026-04-13-2.md`).
 
The report contains:
 
- **Header** with date, branch, commit hash, runner identity, total duration, protocol version
- **Wave context** — a short section noting which feature wave (if any) most recently shipped and what wave-level audit documents were used as inputs
- **Summary** with overall verdict (PASS, PARTIAL PASS, FAIL) and one-line status per prompt
- **Per-prompt sections** with the structured output from each prompt
- **Action items** consolidated across all prompts with severity, owner, and target date
- **Comparison to previous run** if a previous report exists (delta in counts, new issues, resolved issues)
 
The report is committed to git as part of the run. Do not let reports live only in chat output — they are historical artifacts.
 
---
 
## Reporting standards (applies to all prompts)
 
Every finding in every prompt's output must include:
 
- **File path** with absolute or repo-relative path
- **Line number** where applicable
- **Description** in plain language
- **Evidence** — a code snippet, screenshot, or grep result showing the issue
- **Recommended fix** or "needs human review" with justification
- **Severity** using the protocol-wide scale (defined below)
- **Wave origin** (optional but recommended) — if the issue traces to a specific past spec or wave, note it for context
 
Every fix applied during a prompt must include:
 
- **Before snippet** showing the original code
- **After snippet** showing the fix
- **Reason** in one sentence
- **Test verification** confirming the fix doesn't break anything
 
Every "could not fix, needs human" item must include:
 
- **Reason** for escalation
- **Suggested approach** for the human reviewer
- **Estimated effort** (small, medium, large)
- **Risk if deferred** (none, low, medium, high)
 
---
 
## Severity scale
 
Used consistently across all prompts:
 
- **P0 — Blocking.** Breaks a core user flow, exposes a security vulnerability, causes data loss, or prevents the build from succeeding. Must be fixed before any other work.
- **P1 — Visible regression or major debt.** A user-visible bug, a significant performance regression, a test failure that hides a real bug, or accumulated debt that will cause P0 issues if left alone. Fix in the current session.
- **P2 — Minor polish or low-risk debt.** A visual inconsistency, a non-critical accessibility issue, a code smell that doesn't currently cause bugs. Schedule for the next polish pass.
- **P3 — Note for the future.** Worth knowing about but not worth fixing now. Documented in the report and revisited in a future protocol run.
 
---
 
## Interaction with wave-level audits
 
Feature waves may produce their own internal audit documents (debt audits, integration audits, playwright full audits, wave integrity certifications). When these exist, the deep review protocol should **build on them, not duplicate them**.
 
Specifically:
 
- Each protocol's pre-flight checks should look for wave audit artifacts in `_plans/recon/` or the project's equivalent location
- If a recent wave audit addressed an item the protocol would otherwise flag, the protocol should report it as "previously audited, resolved" with a reference to the wave's audit document
- If the protocol disagrees with a wave audit (e.g., the audit said something was fixed but the protocol finds it's still broken), that's a high-signal finding worth investigating — the wave audit may have been incomplete
- The deep review protocol is the **external verification** of wave audits. Wave audits are self-reported from within the wave's context. The protocol provides an independent perspective.
 
The list of wave audit documents to look for lives in `99-project-specific-overrides.md` and should be updated after each wave ships.
 
---
 
## Common pitfalls
 
- **Don't try to fix everything in one pass.** The first time you run this protocol on a debt-laden codebase, you will find more than you can fix in one sitting. Triage by severity, fix the P0s and P1s, document the rest.
- **Don't let the AI silently expand scope.** Each prompt has explicit phase boundaries. If the AI starts fixing something outside the current phase, stop it. Scope creep produces unreviewable diffs.
- **Don't skip the report just because the work is done.** The report is the deliverable. Without it, you have no record of what was checked, what was fixed, or what was deferred. Future-you will want this.
- **Don't run all prompts in one session unless you have an uninterrupted block.** Each prompt deserves a clear head. Splitting across days is fine; switching between prompts and feature work in the same hour is not.
- **Don't trust "passes on my machine" for any prompt.** Run on the same environment as production builds. A prompt that passes locally but fails in CI is useless.
- **Don't fix things outside the current prompt's scope just because you noticed them.** If Prompt 1 surfaces a test failure, log it for Prompt 2; don't fix it in Prompt 1's session. Mixing concerns breaks the protocol.
- **Don't skip Prompt 3 because dependencies "feel fine."** Supply chain issues are silent until they're catastrophic.
- **Don't rediscover what wave audits already addressed.** Read the overrides file's wave audit artifact list before starting any protocol. If BB-37b already audited cross-spec contracts, don't redo that work — verify and extend.
- **Don't flag intentional drift as a violation.** The overrides file documents patterns that are known to diverge intentionally (e.g., reactive stores vs CRUD services, the BibleReader layout exception). Always read the overrides file's "known intentional drift" section before flagging any pattern inconsistency.
 
---
 
## Failure modes and what to do
 
| Symptom | Likely cause | Action |
|---|---|---|
| Prompt 1 reports 500+ dead code items | Years of accumulated debt | Triage by likelihood, fix the high-confidence ones, log the rest as P2 follow-ups |
| Prompt 2 has tests that have failed for 6+ months | Haunted graveyard tests | Investigate whether the underlying feature still exists; delete if not, fix if so |
| Prompt 5 produces 80+ P1 visual issues | Visual review has been deferred too long | Book a half-day to triage; do not try to fix in one sitting |
| Prompt 3 reports critical CVEs | Ignored security advisories | Stop everything, patch immediately, rerun the protocol from Prompt 1 |
| Prompt 4 finds the codebase has 4 different state management patterns | Architecture has drifted | Document each pattern, propose a unification plan, do not fix in this protocol run |
| A prompt runs longer than its time budget | Either too much debt or AI scope creep | Stop, audit what the AI has been doing, restart with tighter scope |
| The report is empty after a prompt completes | AI confused success with completion | Rerun the prompt with explicit instruction to produce a structured report |
| Protocol flags something that a wave audit already fixed | Stale overrides file or missing wave audit references | Update the overrides file with the wave's audit artifacts and rerun |
| Protocol flags intentional drift as a violation | Missing "known intentional drift" entries in overrides | Update the overrides file and rerun the affected check |
 
---
 
## Required tools
 
The protocol assumes the following are installed and available:
 
- **Node.js** matching the project's `.nvmrc` or `package.json` engines field
- **Package manager** (pnpm, yarn, or npm) matching the project's lockfile
- **Playwright** with browsers installed (`npx playwright install`)
- **axe-core** for accessibility checks (`@axe-core/playwright`)
- **TypeScript** matching the project's version
- **ESLint** with all project rules configured
- **Source map explorer** or equivalent for bundle size analysis
- **`pnpm audit`** or equivalent for security checks
- **Git** with full history available (no shallow clone)
 
Optional but recommended:
 
- **Stryker** for mutation testing (Prompt 2, advanced phase)
- **Lighthouse CI** for performance baselines (Prompt 5)
- **`license-checker`** for dependency license audit (Prompt 3)
- **`madge`** for circular dependency detection (Prompt 1)
- **`depcheck`** for orphan dependency detection (Prompt 3)
- **`ts-prune`** or **`knip`** for unused export detection (Prompt 1)
 
If any required tool is missing, document it in the report header and skip the affected checks rather than producing false negatives.
 
---
 
## File structure
 
This protocol is split across multiple files for maintainability. Run them in order:
 
| File | Contents |
|---|---|
| `00-protocol-overview.md` | This file. Master overview, prerequisites, success criteria. |
| `01-prompt-build-and-code-health.md` | Prompt 1: build, lint, static analysis, hygiene. |
| `02-prompt-test-suite-audit.md` | Prompt 2: test failures, coverage, quality, mutation. |
| `03-prompt-dependency-and-supply-chain.md` | Prompt 3: vulnerabilities, staleness, bundle impact, licenses. |
| `04-prompt-architecture-and-pattern-consistency.md` | Prompt 4: store patterns, hook patterns, file conventions, error handling. |
| `05-prompt-visual-verification.md` | Prompt 5: full-site Playwright sweep across breakpoints and states. |
| `99-project-specific-overrides.md` | Project-specific values, key names, file paths, wave audit references, known intentional drift. |
 
The numbering reflects execution order. 00 and 99 are reference documents, not executable protocols — they are read by the executable protocols (01-05) but never run standalone.
 
---
 
## How to use this protocol with Claude Code
 
Each of protocols 01-05 is designed to be pasted in full to Claude Code as a single prompt. Claude Code reads the protocol, reads the pre-flight references (this overview and the overrides file), executes the phases in order, makes fixes, and produces the report section.
 
**Execution sequence:**
 
1. Verify all prerequisites from this overview
2. Open Claude Code in the project repository
3. Start with a preamble: "Before running this protocol, read `00-protocol-overview.md` and `99-project-specific-overrides.md` for context on reporting standards, severity scales, and project-specific conventions."
4. Paste the full contents of `01-prompt-build-and-code-health.md`
5. Wait for protocol 01 to complete and commit
6. Review the commits and the report section for protocol 01
7. Repeat steps 3-6 for protocols 02, 03, 04, 05 in order
8. Each protocol appends its section to the same report file
9. When all five are complete, the report is the final deliverable
 
**Do not run protocols in parallel.** They share the report file and can conflict on file changes.
 
**Do not paste protocols into a chat interface like claude.ai** — they require shell access to run commands, which only Claude Code provides. The chat interface can help you plan, discuss findings, or troubleshoot, but it cannot execute the protocols.
 
---
 
## Versioning
 
This protocol will evolve. Each version is numbered and dated. When you make changes, increment the version, update the "Last updated" date, and add an entry to the changelog at the bottom of this file. Future protocol runs should record which version they used.
 
---
 
## Changelog
 
### v1.1 — 2026-04-13
- Added "After a wave-level integrity audit completes" as a trigger condition
- Added pre-flight requirement to read `99-project-specific-overrides.md` and any wave audit documents
- Added "Interaction with wave-level audits" section explaining how the deep review protocol builds on wave-internal audits without duplicating work
- Added "How to use this protocol with Claude Code" section with concrete execution instructions
- Added Lighthouse score targets to success criteria (≥ 90 Performance, ≥ 95 Accessibility)
- Added "Wave context" to report output
- Added "Wave origin" optional field to finding format
- Added two new failure modes related to stale overrides and intentional drift
- Added `depcheck`, `ts-prune`, `knip` to optional tools list
- Updated execution order numbering (Prompt 4 is Architecture, Prompt 5 is Visual — this matches the file numbering and removes the previous v1.0 inconsistency)
- Reworded several pitfalls to reference wave audits and the overrides file
 
### v1.0 — 2026-04-09
- Initial protocol release
- Five prompts: Build & Code Health, Test Suite Audit, Dependency & Supply Chain, Architecture & Pattern Consistency, Visual Verification
- Severity scale defined
- Reporting standards defined
- Project-specific overrides moved to separate appendix file