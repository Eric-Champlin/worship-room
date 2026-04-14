# Prompt 4 — Architecture & Pattern Consistency
 
**Protocol:** Repository-Wide Deep Review v1.1
**Order:** Fourth (after Prompts 1, 2, and 3)
**Time budget:** 1 to 4 hours
**Prerequisites:** Prompts 1, 2, and 3 complete and committed
 
---
 
## Purpose
 
Audit the codebase for architectural drift, pattern inconsistency, and convention violations that accumulate over months of feature development. This is the prompt that catches the class of bugs where a spec ships its own way, and three specs later the codebase has four different ways of doing the same thing.
 
This prompt does not refactor. It identifies inconsistencies, documents them, and produces a unification plan that humans decide whether to execute. Refactoring is its own focused work that requires more context than a deep review can carry.
 
---
 
## Why this matters
 
Per-spec code review catches issues within one spec's diff. It cannot catch the kind of issue where:
 
- Spec A creates a store with `getAll*` and `subscribe`
- Spec B creates a similar store with `getList` and no subscribe
- Spec C imports from both and works correctly in isolation
- Spec D fails because it assumed Spec B's store had subscribe
 
That's a cross-spec contract failure, and it only becomes visible when you look at all four specs together. This prompt is where that happens.
 
---
 
## Pre-flight checks
 
Before doing any work, verify and record:
 
1. Prompts 1, 2, and 3 are complete and their commits are on the current branch
2. Build is clean, lint is clean, tests pass, dependencies are clean
3. Working tree is clean
4. Today's report file exists at `_reports/deep-review-YYYY-MM-DD.md`
5. The Phase 3 inventory data from Prompt 1 is available in the report (this prompt reads it as input)
6. **Read `00-protocol-overview.md`** for reporting standards and severity scale
7. **Read `99-project-specific-overrides.md`** for project-specific patterns, known intentional drift, component primitives, and wave audit artifacts
8. **Read any wave-level integration audits referenced in the overrides file.** For Prompt 4 specifically, this is the highest-value pre-flight read — wave audits like `_plans/recon/bb37b-integration-audit.md` already traced cross-spec contracts and identified known issues. Use these as starting points and verify their findings rather than rediscovering them.
9. **Read `frontend/docs/process-lessons.md`** if it exists. The BB-45 store mirror anti-pattern, the BB-33 completeness gap, and the BB-35 "verify is not a terminal state" lessons are all directly relevant to this prompt.
 
---
 
## Phase 0 — Read prior wave audits
 
Before running any audit phases, read every wave-level audit document referenced in the overrides file. The deep review protocol is the **external verification** of wave audits — it should build on them, not duplicate them.
 
For each wave audit document:
 
1. Read it end-to-end
2. Note every contract, pattern, or finding it identified
3. Verify (during the appropriate later phase) that the finding is still accurate
4. If the wave audit said something was fixed, verify it stayed fixed (silent regressions are high-signal findings)
5. If the wave audit identified a pattern, extend the audit to look for the same pattern in any code that shipped after the audit
 
This phase is read-only. It produces a "prior audit findings" section in the report that the rest of the protocol's phases reference.
 
---
 
## Phase 1 — Storage layer audit
 
### 1A. Inventory all storage modules
 
List every file in the codebase that reads from or writes to:
 
- `localStorage`
- `sessionStorage`
- `IndexedDB`
- `Cache API` (service worker caches)
- Any project-specific storage abstraction
 
For each storage location, identify:
 
- The file that owns the read/write
- The localStorage key or storage identifier
- The data shape (TypeScript type if available, inferred shape otherwise)
- Whether the file exposes a getter, setter, subscribe mechanism
- Whether the file is consumed by other modules or only used internally
 
### 1B. Categorize by pattern
 
Group storage modules by their pattern:
 
- **Reactive store** — exposes `getAll*`, `subscribe`, mutation methods, follows pub-sub pattern
- **Plain CRUD service** — exposes get/set/delete functions, no subscribe
- **Inline localStorage access** — components read/write localStorage directly without going through a store module
- **Mixed** — combination of the above
 
A healthy codebase usually has one or two patterns, not four. Three or more is a sign of drift.
 
The overrides file documents whether the project intentionally has multiple patterns (e.g., reactive stores for newer features, CRUD services for older features). Respect that documentation.
 
### 1C. Identify drift
 
For each pattern divergence, report:
 
- Which modules use which pattern
- When each pattern was introduced (git blame the relevant files)
- Why the divergence exists (look at PR descriptions, commit messages, spec docs)
- Impact: which downstream consumers care about the difference
- Whether the drift is documented in the overrides file as intentional
 
Example finding:
 
> The codebase has two store patterns: reactive (`highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`, `chapterVisitStore`, `memorizationStore`, `echoStore`) and plain CRUD (`prayerStorage`, `meditationStorage`). The reactive pattern was introduced in BB-7 and adopted by every subsequent personal-layer feature in the Bible wave. The CRUD pattern predates the Bible wave and is used by older Daily Hub features. The overrides file documents this as known intentional drift. The My Bible activity feed successfully renders both types but only auto-refreshes for the reactive ones; CRUD-based data requires a manual reload after import.
>
> **Recommendation:** documented intentional drift, no action required. Future cleanup spec could unify under the reactive pattern.
 
### 1D. Verify storage key conventions
 
Cross-reference Prompt 1's storage key audit. Verify:
 
- Every storage key follows a consistent prefix convention, OR the multiple prefixes are documented and intentional in the overrides file
- No two modules write to the same key
- Every key has a documented purpose (in comments or in a key registry file)
- The overrides file's storage key list matches the keys actually in use (if not, the overrides file needs updating)
 
### 1E. Store consumer audit (BB-45 anti-pattern check)
 
This is the most important sub-phase in the entire prompt. The BB-45 store mirror anti-pattern is a real correctness bug that the wave already exposed once and could expose again.
 
**For every reactive store identified in Phase 1A, find every file that imports from it.**
 
For each consumer:
 
1. Verify it uses the store's hook (e.g., `useHighlightStore()`) for reading data
2. Verify it does NOT call `getAllX()` and store the result in local `useState`
3. Verify it does NOT call `getAllX()` once in `useEffect` and store the result in local `useState`
4. Verify it does NOT mock the store entirely in tests instead of using the real subscription pattern
 
**The anti-pattern to find:**
 
```tsx
// WRONG — local state mirrors the store
const [highlights, setHighlights] = useState(getAllHighlights());
 
// WRONG — useEffect snapshots the store on mount
const [highlights, setHighlights] = useState([]);
useEffect(() => {
  setHighlights(getAllHighlights());
}, []);
 
// CORRECT — hook subscribes to the store
const highlights = useHighlightStore();
```
 
**For each instance of the anti-pattern found:**
 
- Component file path
- Store being consumed
- The specific anti-pattern variant (initial-value snapshot, useEffect snapshot, mock-only)
- Severity: **P1 minimum.** This is a correctness bug even if the component currently works in shipped state. It will break silently when the store mutates from a different surface.
- Recommended fix: switch to the store's hook. The store should expose a hook that internally calls `useSyncExternalStore` or equivalent.
 
This sub-phase is high-value and worth running thoroughly even if it takes 30+ minutes by itself.
 
---
 
## Phase 2 — Hook patterns audit
 
### 2A. Inventory all custom hooks
 
List every file matching `use*.ts` or `use*.tsx` in the codebase. For each:
 
- File path
- Hook name
- Return shape (single value, object, tuple)
- Number of parameters
- Number of consumers
- Lines of code
 
### 2B. Categorize by pattern
 
Group hooks by their conventions:
 
- **Naming:** all hooks start with `use*`?
- **Placement:** are hooks in a `hooks/` directory, co-located with consumers, or scattered?
- **Return shape:** does the project consistently use objects, tuples, or single values?
- **Parameter shape:** does the project pass options as objects or as positional parameters?
- **Error handling:** do hooks throw, return error states, or use a Result type?
- **Loading state:** how do hooks indicate loading? `isLoading` boolean? `status` enum? Suspense?
 
### 2C. Identify drift
 
For each inconsistency, report:
 
- The two or more conflicting patterns
- Which hooks use which
- When each pattern was introduced
- The impact on consumers (does code using these hooks need conditional logic to handle different patterns?)
 
### 2D. Hook complexity audit
 
Find hooks that are doing too much:
 
- Hooks longer than 100 lines
- Hooks with more than 3 `useState` calls
- Hooks with more than 5 dependencies in their `useEffect` arrays
- Hooks that return more than 8 fields
- Hooks that take more than 4 parameters
 
These are not bugs but they're often signs that a hook is straddling multiple concerns and would benefit from being split.
 
### 2E. Removed-hook verification
 
If the wave audit documents specific hooks that were added and then removed during cleanup (e.g., BB-33's `useReducedMotion` was added and then removed), verify those hooks are actually gone from the codebase. Sometimes a "removed" hook leaves orphan files or imports.
 
---
 
## Phase 3 — Component file conventions
 
### 3A. File structure consistency
 
Pick 20 representative component files at random and check whether they follow a consistent internal structure. The expected order is typically:
 
1. `import` statements
2. Type declarations
3. Constants
4. Helper functions
5. The component itself
6. Export statement
 
If files vary significantly (some put types after the component, some have inline helper functions, etc.), document the variance and propose a canonical structure.
 
### 3B. Naming conventions
 
Verify:
 
- Component files use PascalCase (`UserCard.tsx`)
- Hook files use camelCase starting with `use` (`useAuth.ts`)
- Utility files use camelCase (`formatDate.ts`)
- Type-only files use camelCase or kebab-case consistently
- Test files match the source file name with `.test` suffix
 
Flag any files that violate the project's convention.
 
### 3C. Component complexity
 
Find components longer than 300 lines. For each:
 
- File path
- Line count
- Estimated number of "concerns" the component is handling (state management, data fetching, UI rendering, event handling, business logic)
 
Components over 300 lines are not always bugs but they're often refactor candidates. Suggest splits where appropriate, but do not auto-refactor.
 
### 3D. Prop drilling
 
Find components that pass the same prop through more than 3 levels of children. This is a sign that the prop should live in a context or a store rather than being threaded.
 
For each instance, report the prop name, the chain of components, and a recommendation (lift to context, lift to store, or accept as-is if the chain is shallow enough).
 
### 3E. Reusable primitive enforcement
 
The overrides file lists component primitives the project has standardized on (e.g., `FeatureEmptyState`, `FrostedCard`, `SectionHeading`). Find any code that reinvents these primitives:
 
- Components rendering "No data" or similar empty state copy without using the canonical empty state primitive
- Cards built with raw divs and manual frosted-glass classes instead of the canonical card primitive
- Section headings built with inline `<h2>` elements instead of the canonical heading primitive
 
For each instance, recommend migration to the primitive. This is documentation, not auto-refactoring.
 
---
 
## Phase 4 — Test file conventions
 
### 4A. Test placement
 
Are tests:
 
- Co-located with source (`src/components/Foo.tsx` and `src/components/Foo.test.tsx`)?
- In a parallel `__tests__` directory (`src/components/__tests__/Foo.test.tsx`)?
- In a top-level `tests/` directory?
- Mixed?
 
A consistent codebase uses one. Mixed is a sign of drift, but the overrides file may document mixed placement as intentional. Respect documented intentional drift.
 
### 4B. Test file naming
 
Verify the project's convention:
 
- `Foo.test.tsx` vs `Foo.spec.tsx`
- Lowercase vs PascalCase
 
### 4C. Test structure
 
Pick 20 test files at random and verify they follow consistent structure:
 
- Top-level `describe` block matching the file name
- Nested `describe` blocks for grouping
- `beforeEach` / `afterEach` cleanup
- Use of fixtures vs inline data
- Mocking conventions (vi.mock at top, beforeEach setup, etc.)
 
Flag files that deviate.
 
---
 
## Phase 5 — Error handling patterns
 
### 5A. Inventory error handling approaches
 
Find every `try/catch` block. Categorize the catch behavior:
 
- **Logged and rethrown** — `catch (e) { console.error(e); throw e; }`
- **Logged and swallowed** — `catch (e) { console.error(e); }`
- **Silent swallow** — `catch (e) {}`
- **Converted to error state** — `catch (e) { setError(e); }`
- **Converted to a Result type** — `catch (e) { return { error: e }; }`
- **Toast or user-visible feedback** — `catch (e) { showToast(e.message); }`
 
Silent swallows are bugs in disguise. Each one should either be:
 
- Justified with a comment explaining why the error doesn't matter
- Replaced with logging
- Replaced with proper error handling
 
### 5B. Error boundaries
 
Verify the application has error boundaries at appropriate levels:
 
- Route-level boundary (catches errors in any page)
- Component-level boundaries for risky widgets (charts, third-party embeds, etc.)
- Async error handling for data fetching that error boundaries don't catch by default
 
**Surfaces that especially deserve component-level error boundaries (check the overrides file for project-specific surfaces):**
 
- Search functionality (the search index can fail to load)
- PWA install prompts (browser APIs can fail)
- Notification subscription flows (permission denied, service worker failure)
- Audio/media players (file load failures, codec issues)
- Third-party embeds (Spotify, YouTube, etc.)
- Charts and data visualizations
- Map components
 
If any of these are missing, log as P1.
 
### 5C. Async error handling
 
Find every `async` function and `Promise` chain. Verify each one handles rejection somewhere upstream. Async errors that aren't caught become unhandled promise rejections, which are silent in production.
 
For each unhandled async error path, report the function and recommend a catch.
 
### 5D. Error UX consistency
 
When errors are surfaced to users, are they consistent? Some places might use toasts, some might use inline messages, some might use modals. A user shouldn't have to learn three error UI patterns.
 
Identify the patterns in use, recommend a canonical one, and list the places that diverge.
 
---
 
## Phase 6 — Cross-spec contract audit
 
This is the prompt's most valuable phase. It catches the class of bug that has caused most of the integration failures in the project's history.
 
### 6.0. Read prior integration audits
 
Before identifying contracts from scratch, read any wave-level integration audit referenced in the overrides file (e.g., `_plans/recon/bb37b-integration-audit.md`). The wave audit already traced contracts within its scope — your job is to:
 
1. Verify the wave audit's findings are still accurate
2. Extend the audit to any code that shipped after the wave audit ran
3. Identify any contracts the wave audit missed
 
This is build-on-prior-work, not redo-prior-work.
 
### 6A. Identify cross-spec contracts
 
A "contract" is any interface that one spec depends on from another spec. Examples:
 
- Function signatures (e.g., `getAllHighlights()` returns `Highlight[]`)
- Data shapes (e.g., a `Highlight` has fields x, y, z)
- URL formats (e.g., `/bible/<book>/<chapter>?verse=<n>`, `/bible?mode=search&q=<query>`, `/daily?tab=<tab>`)
- LocalStorage schemas
- Event names and payloads
- Component prop interfaces
- Reactive store hooks (the store's exported hook signature is a contract)
 
For each contract, identify:
 
- The spec or commit that established it
- The current implementation in the codebase
- Every consumer of the contract
- Whether the current implementation matches the established contract
 
### 6B. Find contract violations
 
For each contract, look for:
 
- **Drift:** the implementation has changed since the contract was established
- **Partial implementation:** the contract was established but never fully implemented (e.g., a data shape was specified but the persistence layer doesn't actually save all the fields)
- **Multiple implementations:** the same contract has been implemented twice in two different places, slightly differently
- **Silent assumption:** consumers assume something the contract doesn't actually guarantee
 
For each violation, report:
 
- The contract
- The expected behavior (per the spec)
- The actual behavior (per the code)
- The consumers affected
- The severity (P0 if a user flow is broken, P1 if data is being lost, P2 if it's just inconsistent)
 
### 6C. Bridge and integration audits
 
For projects with cross-feature integrations (e.g., the Bible reader has bridges to Daily Hub Pray/Journal/Meditate tabs), audit each integration end-to-end:
 
- Walk the user flow
- Verify the data passes correctly from origin to destination
- Verify the destination receives and stores what the origin sent
- Verify any optional metadata fields actually populate at runtime, not just in the type definitions
 
This is the test that catches the class of bug where a spec ships UI but its persistence layer never lands.
 
---
 
## Phase 7 — Naming consistency audit
 
### 7A. Concept naming
 
Find every concept that has multiple names in the codebase. Examples:
 
- "User" vs "Account" vs "Profile"
- "Cart" vs "Bag" vs "Order"
- "Highlight" vs "Mark" vs "Annotation"
- "Verse" vs "Passage" vs "Reference"
 
For each concept with multiple names, report the names in use, the contexts where each is used, and a recommended canonical name. Do not auto-rename — this is a coordination task.
 
### 7B. Function naming patterns
 
Verify consistent verb usage:
 
- `getX` vs `fetchX` vs `loadX` vs `retrieveX`
- `createX` vs `addX` vs `insertX` vs `newX`
- `updateX` vs `editX` vs `modifyX` vs `setX`
- `deleteX` vs `removeX` vs `destroyX`
 
The project should pick one verb per operation type and stick with it. Document the inconsistencies.
 
### 7C. Boolean naming
 
Verify booleans use consistent prefixes:
 
- `is*` for state (`isLoading`, `isAuthenticated`)
- `has*` for possession (`hasAccess`, `hasErrors`)
- `should*` for predicates (`shouldRender`, `shouldFetch`)
- `can*` for capabilities (`canEdit`, `canDelete`)
 
Flag booleans that don't use a prefix or use the wrong prefix for their semantic.
 
The overrides file may document specific boolean conventions the project has standardized on.
 
---
 
## Phase 8 — Report
 
Append the Prompt 4 section to the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:
 
### Header
 
- Prompt name and version (v1.1)
- Start time, end time, total duration
 
### Wave context
 
- Most recent wave referenced (from the overrides file)
- Wave audit artifacts read as input
- Contracts verified against prior wave audits
- New contracts identified that weren't in prior audits
 
### Storage layer summary
 
- Number of storage modules
- Number of distinct patterns in use
- Pattern divergence findings (each with affected modules, history, recommendation, intentional-drift flag)
- Storage key consistency (any duplicates, any undocumented keys)
- **Reactive store consumer findings (BB-45 anti-pattern check):** count of consumers verified, count using proper hook pattern, count using anti-pattern (each anti-pattern instance is P1)
 
### Hook patterns summary
 
- Total hook count
- Pattern divergence findings
- Complex hook list (over 100 lines)
- Removed hooks verification (any orphans?)
- Recommended unification
 
### Component conventions
 
- File structure consistency findings
- Naming convention violations
- Components over 300 lines
- Prop drilling chains over 3 levels
- Reusable primitive enforcement findings (places that reinvent FeatureEmptyState, FrostedCard, SectionHeading, etc.)
 
### Test conventions
 
- Test placement consistency
- Test file naming consistency
- Test structure consistency
 
### Error handling
 
- Try/catch categorization
- Silent swallows (full list, P1)
- Error boundary coverage gaps (with focus on critical surfaces from overrides file)
- Unhandled async error paths
- Error UX consistency findings
 
### Cross-spec contracts
 
- Contracts identified (count)
- Contracts verified against prior wave audits (count)
- New contracts not in prior audits (count)
- Contract violations (full list with severity)
- Bridge audit results
- Integration end-to-end findings
 
### Naming consistency
 
- Concepts with multiple names
- Function verb inconsistencies
- Boolean naming violations
 
### Comparison to previous run
 
If a previous deep review report exists:
 
- Number of pattern divergences (delta)
- New cross-spec contracts introduced
- Resolved cross-spec contracts
- Naming inconsistencies (delta)
- Reactive store consumer anti-pattern instances (delta — should ideally trend to zero)
 
### Action items
 
Consolidated list of architecture-related items requiring follow-up. Group by category:
 
- Pattern unification candidates (with effort estimate and risk)
- Cross-spec contract fixes (P0/P1 first)
- Naming standardization
- Refactor candidates (long components, complex hooks, prop drilling)
- Reactive store anti-pattern fixes (P1, must be addressed)
- Reusable primitive migrations
 
---
 
## Commit strategy
 
This prompt produces a report, not code changes. The only thing to commit is the report itself.
 
Any actionable findings become their own follow-up specs, written separately. Do not refactor in this prompt.
 
The exception is the BB-45 anti-pattern findings: if any reactive store consumer is using the local state mirror anti-pattern, those should be fixed in this prompt because they're correctness bugs, not stylistic drift. Use a separate commit for each fix:
 
    fix(highlights): use useHighlightStore hook instead of local useState mirror
 
The report is the primary deliverable. Future specs will reference it when planning unification work.
 
---
 
## Handoff to Prompt 5
 
After Prompt 4 (Architecture & Pattern Consistency) is complete and committed, Prompt 5 (Visual Verification) is ready to run. The order is intentional: visual verification runs against a codebase whose architecture has been audited and documented, so any visual issues found can be correlated with architectural ones.
 
---
 
## Common pitfalls specific to this prompt
 
- **Don't refactor in this prompt.** This is an audit, not a redesign. If you see something messy, document it. The actual refactor is its own focused work. The exception is BB-45 anti-pattern fixes, which are correctness bugs.
- **Don't fix individual instances of pattern divergence.** Document them all and propose a unification plan. Fixing one or two instances without a plan creates more drift, not less.
- **Don't conflate "different" with "wrong."** Sometimes two patterns coexist intentionally because they serve different needs. Investigate before flagging. The overrides file's "known intentional drift" section is authoritative.
- **Don't skip the cross-spec contract phase.** It's the most valuable part. Most integration bugs hide here.
- **Don't expect to find everything in one pass.** Architecture audits surface a lot. You'll often need multiple runs over multiple weeks to catalog all the drift in a mature codebase.
- **Don't propose huge refactors as the answer to small inconsistencies.** Sometimes the answer is "document the difference and live with it." Refactoring a working system has real cost.
- **Don't blame the original author of any pattern.** Patterns drift because the codebase grows, not because anyone made bad decisions. The audit is to catch drift, not to assign blame.
- **Don't skip Phase 1E (store consumer audit).** This is the most valuable single sub-phase in the entire prompt. The BB-45 anti-pattern is a real correctness bug that will silently break the app when discovered in shipped code. Find every instance.
- **Don't duplicate prior wave audit work.** Read the wave audits first. Verify their findings, extend them to new code, and identify what they missed. Don't redo what's already been done.
- **Don't mark something as a "violation" without checking the overrides file's intentional drift section.** The BibleReader layout exception, the reactive/CRUD store split, the storage key prefix mixing — all documented as intentional. Flagging them as violations creates noise that hides real findings.
 