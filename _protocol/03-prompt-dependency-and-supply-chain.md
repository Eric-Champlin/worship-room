# Prompt 3 — Dependency & Supply Chain Audit
 
**Protocol:** Repository-Wide Deep Review v1.1
**Order:** Third (after Prompts 1 and 2)
**Time budget:** 30 minutes (clean codebase) to 3 hours (debt-laden codebase)
**Prerequisites:** Prompts 1 and 2 complete and committed
 
---
 
## Purpose
 
Audit the project's dependency tree for security vulnerabilities, staleness, bundle size impact, license compatibility, and lockfile integrity. Dependencies are silent until they're catastrophic — this prompt catches them before they become incidents.
 
This is its own prompt because dependency hygiene requires a different mental mode than code review, test repair, or visual QA. It's mostly automatic but the findings need human judgment (do we accept the risk of this stale package? do we replace this 200KB dep with a 5KB alternative?).
 
---
 
## Pre-flight checks
 
Before doing any work, verify and record:
 
1. Prompts 1 and 2 are complete and their commits are on the current branch
2. Working tree is clean
3. Today's report file exists at `_reports/deep-review-YYYY-MM-DD.md`
4. The Prompts 1 and 2 sections are populated
5. Required tooling is available:
   - `pnpm audit` (or `npm audit` / `yarn audit` depending on package manager)
   - `license-checker` or equivalent (`pnpm dlx license-checker` works in a pinch)
   - `source-map-explorer` or equivalent for bundle analysis
   - `npm-check-updates` or `pnpm outdated`
   - `madge` for circular dependency detection (optional, used in Prompt 1 too)
   - `depcheck` for orphan dependency detection (optional)
6. **Read `00-protocol-overview.md`** for reporting standards and severity scale
7. **Read `99-project-specific-overrides.md`** for project-specific bundle measurement tools, performance baselines, and supply chain trust priorities
8. **Read any wave audit artifacts referenced in the overrides file.** For Prompt 3 specifically, read the most recent performance/metrics baseline (e.g., `_plans/recon/bb37b-metrics-reconciliation.md` or `_plans/recon/bb36-performance-baseline.md`). This gives you the bundle size and Lighthouse baseline that any dependency changes must not regress against.
 
If any tool is missing, document it and skip the affected checks rather than producing false negatives.
 
---
 
## Phase 1 — Vulnerability scan
 
### 1A. Run the audit
 
Run the package manager's audit command:
 
    pnpm audit --json > /tmp/audit-output.json
 
Capture:
 
- Total vulnerabilities by severity (critical, high, moderate, low)
- Affected packages
- Whether each vulnerability has a fix available
- Whether the vulnerability is in a direct dependency or transitive
 
Note: pnpm audit's output format has changed across versions. If the JSON output is unexpected, check the installed pnpm version and adapt the command. Some pnpm versions need `--audit-level moderate` or similar flags.
 
### 1B. Triage by severity
 
For each vulnerability, determine:
 
- **Direct dependency, fix available:** apply the fix immediately. Document the version change.
- **Direct dependency, no fix available:** document the vulnerability, the affected package, and the project's exposure. Decide whether to replace the dependency, pin to a known-safe version, or accept the risk with documentation.
- **Transitive dependency, fix available via direct upgrade:** identify which direct dependency pulls in the vulnerable package. Upgrade the direct dependency to a version that pulls in a fixed transitive.
- **Transitive dependency, no path to a fix:** investigate the upstream package's status. If the package is unmaintained, consider replacing the direct dependency that pulls it in.
 
For every critical or high severity vulnerability, the report must include the CVE number (if available), the affected package, the fix path, and the action taken or planned.
 
### 1C. Verify after fixing
 
After applying fixes, rerun the audit and confirm zero critical or high severity issues remain. Moderate and low severity issues may remain if they're documented and accepted, but the report must list each one with justification.
 
If you cannot reach zero critical/high without breaking the build or tests, stop and escalate. Critical vulnerabilities are P0 — they should not coexist with a "passing" protocol run.
 
---
 
## Phase 2 — Staleness audit
 
### 2A. Check outdated packages
 
Run:
 
    pnpm outdated --format json > /tmp/outdated-output.json
 
(or the equivalent for your package manager)
 
Capture for every dependency:
 
- Current installed version
- Latest available version
- Wanted version (within the version range in `package.json`)
- Type (production, dev, peer)
- Days since the latest version was published
 
### 2B. Categorize by staleness
 
For each dependency:
 
- **Fresh** — installed version matches latest, or latest was published less than 30 days ago
- **Slightly stale** — latest is 1 to 6 months old, no security implications
- **Stale** — latest is 6 to 12 months old
- **Very stale** — latest is more than 12 months old, or the package hasn't had a release in 12+ months
- **Abandoned** — no release in 24+ months, or the upstream repo is archived
 
Report each category with the package list. Stale and very stale packages need human judgment about whether to upgrade. Abandoned packages need a replacement plan.
 
### 2C. Check for major version upgrades available
 
For dependencies with major version upgrades available (e.g., installed v3.x, latest v5.x), list each one with:
 
- Current major version
- Latest major version
- Migration effort estimate (small, medium, large) based on the package's changelog
- Breaking changes summary (top 5)
 
These don't need to be applied in this prompt — they're informational. Major upgrades are their own focused work.
 
### 2D. Check engines compatibility
 
Verify the project's `engines` field in `package.json` matches the actually-installed Node version. Mismatches cause subtle bugs that don't show up until production.
 
---
 
## Phase 3 — Bundle size impact
 
### 3A. Build with source maps
 
Build the project in production mode with source maps enabled:
 
    pnpm build
 
Verify the build output includes source maps. If not, temporarily enable them for this audit.
 
### 3B. Run bundle analysis
 
**Check the overrides file for a project-specific bundle measurement tool.** If the project has a custom measurement script (e.g., `frontend/scripts/measure-bundle.mjs`), use it as the primary tool — it's already calibrated to the project's structure and produces the same output format the project's prior baselines used.
 
If no project-specific tool exists, fall back to source-map-explorer:
 
    pnpm dlx source-map-explorer dist/assets/*.js --json > /tmp/bundle-analysis.json
 
Capture the size contribution of every dependency to the production bundle.
 
### 3C. Compare against prior baseline
 
If the overrides file references a prior performance baseline (e.g., `_plans/recon/bb36-performance-baseline.md` or `bb37b-metrics-reconciliation.md`):
 
- Read the baseline's documented bundle size
- Compare current bundle size against the baseline
- **Any growth beyond 5% is a regression that requires investigation.** Either justify it (a new feature shipped that needed the size) or roll back the dependency that caused it.
- Any shrinkage is good and should be noted
 
If no prior baseline exists, the current measurement becomes the baseline for future runs.
 
### 3D. Identify bloat
 
Flag any dependency that contributes more than 50KB gzipped to the production bundle. For each, report:
 
- Package name and version
- Gzipped size contribution
- Whether the size is justified (large library used heavily) or excessive (huge library used for one function)
- Possible alternatives if the size is excessive
 
Examples of common bloat:
 
- `moment` (use `date-fns` or native `Intl.DateTimeFormat` instead)
- `lodash` whole-package import (use individual function imports or native methods)
- `axios` (use native `fetch` if you don't need axios-specific features)
- `react-icons` whole-package (import individual icons)
- `lucide-react` namespace imports (use per-icon imports — namespace imports defeat tree-shaking)
 
For each bloat finding, propose a specific replacement or refactor with the expected size savings. Do not auto-apply replacements — these are decisions that affect runtime behavior and need human review.
 
### 3E. Check for duplicate dependencies
 
Sometimes the same package is included multiple times at different versions because two direct dependencies require different ranges. This wastes bundle size.
 
Run:
 
    pnpm dedupe --check
 
(or `npm ls` with manual inspection)
 
For each duplicate:
 
- Package name
- Versions present
- Direct dependencies that pull in each version
- Whether deduplication is possible without breaking either dependency
 
Apply `pnpm dedupe` if it's safe; otherwise document the duplicates and the reason they can't be deduplicated.
 
### 3F. Lighthouse Performance impact check
 
If the overrides file references a Lighthouse Performance baseline (e.g., from BB-36's performance work):
 
- After any dependency changes in this prompt, run Lighthouse against the major pages listed in the overrides file
- Compare scores against the baseline
- Any page that drops below the project's documented target (e.g., 90+ Performance) is a regression
- If a dependency change caused a regression, roll it back
 
This is the equivalent of "measure before and after" discipline applied to dependency work.
 
---
 
## Phase 4 — License audit
 
### 4A. List all licenses
 
Run a license checker:
 
    pnpm dlx license-checker --json > /tmp/licenses.json
 
Capture every dependency's license.
 
### 4B. Categorize by compatibility
 
Categorize each license:
 
- **Permissive (allowed):** MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0, ISC, CC0
- **Weak copyleft (review required):** LGPL-2.1, LGPL-3.0, MPL-2.0
- **Strong copyleft (typically forbidden in commercial closed-source):** GPL-2.0, GPL-3.0, AGPL-3.0
- **Other or unknown:** anything not in the above lists, or a missing license field
 
For each non-permissive license:
 
- Package name and version
- Direct or transitive
- Why it's in the dependency tree
- Recommended action (replace, document the exception, or accept)
 
GPL and AGPL dependencies in a closed-source commercial project are usually a mistake or an oversight from a transitive include. Investigate and replace if possible.
 
**License audit severity depends on the project's distribution model.** If the overrides file documents that the project is not yet in commercial distribution (e.g., solo-built, pre-launch, internal-only), license issues are P2 rather than P1 — they need to be resolved before commercial launch but aren't urgent today. If the project is in commercial distribution, license issues are P1.
 
### 4C. Missing licenses
 
Some packages don't declare a license at all. Treat these as "unknown" and investigate:
 
- Look at the package's repository for a LICENSE file
- Check the package's README
- If no license is found anywhere, the package is technically not legally usable. Replace it.
 
---
 
## Phase 5 — Lockfile integrity
 
### 5A. Verify lockfile presence and consistency
 
- Confirm the lockfile exists (`pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`)
- Confirm the lockfile is committed to git
- Confirm there's only one lockfile (no mixing of npm and pnpm)
- Confirm the lockfile matches the current `package.json`:
 
      pnpm install --frozen-lockfile
 
  Should succeed without modifying the lockfile.
 
### 5B. Check for manual lockfile edits
 
Lockfiles should never be hand-edited. Look for signs of manual editing:
 
- Inconsistent indentation
- Missing integrity hashes
- Resolved fields pointing to unexpected sources
 
Manual edits are bugs waiting to happen. If found, regenerate the lockfile from scratch.
 
### 5C. Resolve any resolution conflicts
 
If the lockfile has unresolved conflicts (rare but possible after a bad merge), regenerate it:
 
    rm pnpm-lock.yaml
    pnpm install
 
Verify the resulting lockfile produces the same dependency tree as before (or document the changes).
 
---
 
## Phase 6 — Direct vs transitive analysis
 
### 6A. Identify orphan direct dependencies
 
A direct dependency is "orphan" if no source file imports from it. The package was added at some point and is no longer used.
 
Run:
 
    pnpm dlx depcheck --json > /tmp/depcheck.json
 
Or use a similar tool that correlates `package.json` with actual imports.
 
For each unused direct dependency:
 
- Package name
- Date added (from git history)
- Reason it might still be needed (build tool, type-only import, runtime dependency without explicit import)
- Recommended action (remove, keep with justification, investigate)
 
### 6B. Identify missing direct dependencies
 
The opposite problem: source code imports from a package that isn't declared in `package.json`. This works only because the package is pulled in transitively. If the transitive include is removed in a future update, the build will break unexpectedly.
 
For each missing direct dependency:
 
- Package name
- Files that import it
- Direct dependency currently providing it transitively
- Recommended action (add as direct dependency)
 
### 6C. Type-only dependencies
 
Packages used only for TypeScript types (`@types/*`) should be in `devDependencies`, not `dependencies`. Find any misplaced type packages and move them.
 
### 6D. devDependencies vs dependencies misclassification
 
Beyond `@types/*`, look for packages that are clearly dev tools but are in `dependencies`:
 
- Build tools (vite, webpack, rollup, esbuild)
- Test runners (vitest, jest, playwright)
- Linters (eslint, prettier)
- TypeScript itself
 
These should be in `devDependencies`. Misclassification doesn't usually break anything but it's a code smell that often indicates bigger dependency hygiene issues.
 
---
 
## Phase 7 — Supply chain trust
 
This phase is informational and doesn't typically result in fixes, but it's important to track.
 
### 7A. Maintainer changes
 
For each direct dependency, check whether the maintainer has changed in the last 12 months. Sudden maintainer changes on packages with millions of weekly downloads have historically been a vector for supply chain attacks (e.g., `event-stream`, `colors`).
 
**The overrides file may list specific "critical" packages that deserve extra scrutiny.** These are typically the foundational dependencies (React, TypeScript, Vite, build tools, auth libraries). Pay particular attention to maintainer changes on these.
 
Tools like `npm-audit-supply-chain` or manual inspection of the npm package page can surface this. Manual is fine for a small dependency tree; tooling is necessary for a large one.
 
For each suspicious change, log the package, the previous maintainer, the new maintainer, and the date of change. Investigate any package where the new maintainer has no other reputable packages.
 
### 7B. Download count anomalies
 
A direct dependency that has lost more than 50% of its weekly downloads in the last 12 months may indicate a deprecation, a security issue, or community migration to an alternative. Investigate each one.
 
### 7C. Recently published packages
 
Packages published less than 30 days ago that have already been added as direct dependencies are slightly suspicious — there's not enough history to assess reliability. Not always a problem, but worth noting.
 
### 7D. Postinstall and lifecycle scripts
 
Check for dependencies with `postinstall`, `preinstall`, or other lifecycle scripts. These run automatically on install and can execute arbitrary code. List every dependency with lifecycle scripts and verify each one is from a trusted source. Lifecycle scripts are a known supply chain attack vector.
 
---
 
## Phase 8 — Report
 
Append the Prompt 3 section to the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:
 
### Header
 
- Prompt name and version (v1.1)
- Start time, end time, total duration
- Tools used and versions
 
### Wave context
 
- Most recent wave referenced (from the overrides file)
- Performance/bundle baseline used as reference
- Distribution model (pre-launch / commercial) which affects license severity
 
### Vulnerability summary
 
- Total vulnerabilities at start (by severity)
- Total vulnerabilities at end (by severity)
- Critical/high count (must be zero or escalated)
- Detailed list of every critical/high vulnerability with: package, version, CVE, fix path, action taken
 
### Staleness summary
 
- Counts by category (fresh, slightly stale, stale, very stale, abandoned)
- Full list of stale and very stale packages
- Full list of abandoned packages with replacement recommendations
- Major upgrades available (count and list)
 
### Bundle impact
 
- Total production bundle size (before/after if changes were made)
- Comparison against prior baseline (delta and whether it's a regression)
- Top 20 largest dependencies by gzipped size
- Bloat findings (each with current size, justification, and proposed alternative)
- Duplicate dependencies (each with versions, sources, and dedup status)
- Lighthouse Performance scores after any dependency changes (if applicable)
 
### License compliance
 
- License distribution (counts by license type)
- Non-permissive licenses found (full list with packages)
- Missing license packages (full list)
- Action items for each non-compliant package
- Severity adjusted for distribution model
 
### Lockfile status
 
- Lockfile present and committed (yes/no)
- Frozen install verification (passed/failed)
- Manual edit detection (none/found)
- Regeneration performed (yes/no, with reason)
 
### Direct vs transitive
 
- Orphan direct dependencies (full list)
- Missing direct dependencies (full list)
- Misplaced type packages (full list)
- devDependency misclassifications (full list)
 
### Supply chain trust
 
- Suspicious maintainer changes (with focus on critical packages from overrides)
- Download anomalies
- Recently published direct dependencies
- Dependencies with lifecycle scripts (full list)
 
### Comparison to previous run
 
If a previous deep review report exists:
 
- Vulnerability count delta
- New vulnerabilities introduced
- Resolved vulnerabilities
- Bundle size delta
- Dependencies added since last run
- Dependencies removed since last run
 
### Action items
 
Consolidated list of dependency-related items requiring human follow-up, each with severity, package, description, recommended action, estimated effort, wave origin if applicable.
 
---
 
## Commit strategy
 
Commit fixes in logical groups:
 
1. Critical and high vulnerability fixes (one commit per logical group)
2. Bundle bloat fixes (one commit per replacement, e.g., "replace moment with date-fns")
3. Orphan dependency removals
4. Missing dependency additions
5. Misplaced type package moves
6. devDependency reclassifications
7. Lockfile regeneration if needed
8. The report itself
 
Each commit message should start with `chore(deps):` for dependency changes or `chore(deep-review):` for audit-related changes:
 
    chore(deps): patch axios CVE-2024-XXXX (high severity)
    chore(deps): replace moment with date-fns (saves 240KB gzipped)
    chore(deep-review): document accepted moderate vulnerabilities
 
---
 
## Handoff to Prompt 4
 
After Prompt 3 (Dependency & Supply Chain) is complete and committed, Prompt 4 (Architecture & Pattern Consistency) is ready to run. The order matters: fixing dependencies before auditing architecture means the architecture audit runs against current best-practice library versions, not stale ones.
 
---
 
## Common pitfalls specific to this prompt
 
- **Don't update everything at once.** Major version upgrades especially should be applied one at a time so you can attribute any breakage. Bulk updates produce unreviewable diffs.
- **Don't ignore moderate severity vulnerabilities just because they're not critical.** Many "moderate" CVEs are exploitable in real conditions. Document each one with a justification, even if you accept the risk.
- **Don't trust the package's claimed license without checking the LICENSE file.** Some packages declare MIT but ship under different terms.
- **Don't auto-deduplicate without verifying.** Two versions of the same package may exist for legitimate reasons (incompatible APIs). Test after deduping.
- **Don't replace bloated dependencies without measuring after.** "Native fetch is smaller" is true but if you reimplement axios features manually, you may end up with more code. Measure before/after.
- **Don't ignore supply chain trust signals.** They're subtle and easy to dismiss but historically that's how supply chain attacks succeed.
- **Don't skip the lockfile checks.** A broken lockfile produces non-reproducible builds and is a classic source of "works on my machine" bugs.
- **Don't skip the prior baseline comparison.** Bundle size is meaningless without a reference point. If the overrides file points to a prior baseline, use it.
- **Don't apply dependency updates that regress the Lighthouse Performance baseline.** Performance is a contract with users — a faster bundle that ships with worse runtime performance is a bad trade.