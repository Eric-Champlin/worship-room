# Prompt 4 — Architecture & Pattern Consistency

**Protocol:** Repository-Wide Deep Review v1.0
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

### 1C. Identify drift

For each pattern divergence, report:

- Which modules use which pattern
- When each pattern was introduced (git blame the relevant files)
- Why the divergence exists (look at PR descriptions, commit messages, spec docs)
- Impact: which downstream consumers care about the difference

Example finding:

> The codebase has two store patterns: reactive (`highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`) and plain CRUD (`prayerStorage`, `meditationStorage`). The reactive pattern was introduced in BB-7 and adopted by BB-7.5, BB-8, BB-11b. The CRUD pattern predates the Bible wave and is used by older Daily Hub features. The My Bible activity feed (BB-14) successfully renders both types but only auto-refreshes for the reactive ones; CRUD-based data requires a manual reload after import (BB-16 documented this as a known limitation).
>
> **Recommendation:** unify under the reactive pattern in a focused refactor spec. Estimated effort: medium. Risk: low (the CRUD services are small).

### 1D. Verify storage key conventions

Cross-reference Prompt 1's storage key audit. Verify:

- Every storage key follows a consistent prefix convention, OR the multiple prefixes are documented and intentional
- No two modules write to the same key
- Every key has a documented purpose (in comments or in a key registry file)

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

---

## Phase 4 — Test file conventions

### 4A. Test placement

Are tests:

- Co-located with source (`src/components/Foo.tsx` and `src/components/Foo.test.tsx`)?
- In a parallel `__tests__` directory (`src/components/__tests__/Foo.test.tsx`)?
- In a top-level `tests/` directory?
- Mixed?

A consistent codebase uses one. Mixed is a sign of drift. Document the mixing.

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

### 6A. Identify cross-spec contracts

A "contract" is any interface that one spec depends on from another spec. Examples:

- Function signatures (e.g., `getAllHighlights()` returns `Highlight[]`)
- Data shapes (e.g., a `Highlight` has fields x, y, z)
- URL formats (e.g., `/daily?tab=pray&verseBook=...&verseChapter=...`)
- LocalStorage schemas
- Event names and payloads
- Component prop interfaces

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

This is the test that catches the BB-10/BB-11 class of bug where a spec ships UI but its persistence layer never lands.

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

---

## Phase 8 — Report

Append the Prompt 4 section to the deep review report at `_reports/deep-review-YYYY-MM-DD.md`. The section must include:

### Header

- Prompt name and version
- Start time, end time, total duration

### Storage layer summary

- Number of storage modules
- Number of distinct patterns in use
- Pattern divergence findings (each with affected modules, history, recommendation)
- Storage key consistency (any duplicates, any undocumented keys)

### Hook patterns summary

- Total hook count
- Pattern divergence findings
- Complex hook list (over 100 lines)
- Recommended unification

### Component conventions

- File structure consistency findings
- Naming convention violations
- Components over 300 lines
- Prop drilling chains over 3 levels

### Test conventions

- Test placement consistency
- Test file naming consistency
- Test structure consistency

### Error handling

- Try/catch categorization
- Silent swallows (full list, P1)
- Error boundary coverage gaps
- Unhandled async error paths
- Error UX consistency findings

### Cross-spec contracts

- Contracts identified (count)
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

### Action items

Consolidated list of architecture-related items requiring follow-up. Group by category:

- Pattern unification candidates (with effort estimate and risk)
- Cross-spec contract fixes (P0/P1 first)
- Naming standardization
- Refactor candidates (long components, complex hooks, prop drilling)

---

## Commit strategy

This prompt produces a report, not code changes. The only thing to commit is the report itself.

Any actionable findings become their own follow-up specs, written separately. Do not refactor in this prompt.

The report is the deliverable. Future specs will reference it when planning unification work.

---

## Handoff to Prompt 5

After Prompt 4 (Architecture & Pattern Consistency) is complete and committed, Prompt 5 (Visual Verification) is ready to run. The order is intentional: visual verification runs against a codebase whose architecture has been audited and documented, so any visual issues found can be correlated with architectural ones.

---

## Common pitfalls specific to this prompt

- **Don't refactor in this prompt.** This is an audit, not a redesign. If you see something messy, document it. The actual refactor is its own focused work.
- **Don't fix individual instances of pattern divergence.** Document them all and propose a unification plan. Fixing one or two instances without a plan creates more drift, not less.
- **Don't conflate "different" with "wrong."** Sometimes two patterns coexist intentionally because they serve different needs. Investigate before flagging.
- **Don't skip the cross-spec contract phase.** It's the most valuable part. Most integration bugs hide here.
- **Don't expect to find everything in one pass.** Architecture audits surface a lot. You'll often need multiple runs over multiple weeks to catalog all the drift in a mature codebase.
- **Don't propose huge refactors as the answer to small inconsistencies.** Sometimes the answer is "document the difference and live with it." Refactoring a working system has real cost.
- **Don't blame the original author of any pattern.** Patterns drift because the codebase grows, not because anyone made bad decisions. The audit is to catch drift, not to assign blame.
