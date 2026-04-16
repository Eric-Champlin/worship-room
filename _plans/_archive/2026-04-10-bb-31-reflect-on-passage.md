# Implementation Plan: BB-31 Reflect on This Passage (Gemini Integration)

**Spec:** `_specs/bb-31-reflect-on-passage.md`
**Date:** 2026-04-10
**Branch:** `bible-redesign` (stay on branch — NO new branch, NO merge)
**Design System Reference:** `_plans/recon/design-system.md` (loaded for dark-theme tokens; BB-31 reuses established Bible reader sheet patterns so no new computed values are needed)
**Recon Report:** N/A — BB-31 is strictly additive to shipped BB-30 infrastructure
**Master Spec Plan:** N/A — standalone sibling to BB-30 in the BB-30 → BB-31 → BB-32 AI arc
**Sibling plan for reference:** `_plans/2026-04-10-bb30-explain-this-passage.md` (2006 lines — BB-31 follows its structure verbatim where the two features parallel each other)

---

## Architecture Context

BB-31 adds a second AI feature to the Bible reader's verse action sheet. It is **strictly additive** to BB-30's Gemini client infrastructure and must not modify any BB-30 code. The parallel-component pattern (not a multi-mode refactor) is the required architectural choice.

### Directory conventions (verified during recon)

- `frontend/src/lib/ai/geminiClient.ts` — the shared Gemini SDK wrapper (BB-30). Lazy-initialized singleton client via `getClient()`; `__resetGeminiClientForTests` for test isolation. Contains `MODEL = 'gemini-2.5-flash-lite'`, `REQUEST_TIMEOUT_MS = 30_000`, `MAX_OUTPUT_TOKENS = 600`, `TEMPERATURE = 0.7`.
- `frontend/src/lib/ai/errors.ts` — five typed error classes: `GeminiNetworkError`, `GeminiApiError`, `GeminiSafetyBlockError`, `GeminiTimeoutError`, `GeminiKeyMissingError`. Reused by BB-31 without modification.
- `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` — BB-30's system prompt + user-prompt builder. BB-31 creates a sibling `reflectPassagePrompt.ts` next to it.
- `frontend/src/lib/env.ts` — exports `requireGeminiApiKey()`. Read via `getClient()` inside the Gemini client. BB-31 does not touch this.
- `frontend/src/hooks/bible/useExplainPassage.ts` — BB-30's hook. BB-31 creates a sibling `useReflectOnPassage.ts` that mirrors its structure byte-for-byte, swapping only the generator function and `classifyError` target.
- `frontend/src/components/bible/reader/` — all sub-view components live here. BB-30 created `ExplainSubView.tsx`, `ExplainSubViewLoading.tsx`, `ExplainSubViewError.tsx`, `ExplainSubViewDisclaimer.tsx`. BB-31 creates `ReflectSubView.tsx` and `ReflectSubViewDisclaimer.tsx` only; loading and error components are imported directly from BB-30.
- `frontend/src/lib/bible/verseActionRegistry.ts` — the registry that wires all verse actions into the sheet. BB-31 adds a new `reflect` entry to `SECONDARY_ACTIONS` immediately after the existing `explain` entry.
- `frontend/scripts/bb30-run-prompt-tests.ts` — prompt testing runner that calls the real Gemini API. BB-31 creates a parallel `bb31-run-prompt-tests.ts` script.
- `_plans/recon/` — prompt testing recon output directory. BB-30's file is `bb30-prompt-tests.md`. BB-31 creates `bb31-prompt-tests.md` (and `bb31-prompt-tests.raw.json` for raw captures).

### Current `SECONDARY_ACTIONS` order (verified at `verseActionRegistry.ts:420-429`)

```
pray, journal, meditate, crossRefs, explain, memorize, copy, copyWithRef
```

BB-31 inserts `reflect` **between `explain` and `memorize`**, making the new order:

```
pray, journal, meditate, crossRefs, explain, reflect, memorize, copy, copyWithRef
```

### Icon conflicts (verified at `verseActionRegistry.ts:1-15`)

Already-used Lucide icons in the registry:
- `Paintbrush` → highlight
- `PenLine` → note
- `Bookmark` → bookmark
- `Share2` → share
- `Heart` → pray
- `BookOpen` → journal
- **`Sparkles`** → meditate (**cannot reuse**)
- `Link2` → crossRefs
- **`Brain`** → explain (**cannot reuse**)
- `Layers` → memorize
- `Copy` → copy
- `ClipboardCopy` → copy-with-ref

**Icon choice for `reflect`: `Lightbulb`**. Rationale:
- `Sparkles` is already used by `meditate` — reusing it would be visually confusing in the same sheet.
- `Eye` has surveillance/voyeurism connotations that do not fit contemplative reflection.
- `Lightbulb` signals "insight" / "new thought" without any religious baggage — the exact register the disclaimer's "one way this might land" copy establishes.
- Imported from `lucide-react` via the same import pattern as the other registry icons.

### Error classes + error copy reuse

BB-31's `useReflectOnPassage` uses an **identical** `ERROR_COPY` map to BB-30's `useExplainPassage` (verified at `useExplainPassage.ts:29-37`):

```typescript
const ERROR_COPY: Record<ExplainErrorKind, string> = {
  network: "Couldn't load an explanation right now. Check your connection and try again.",
  api: 'This feature is temporarily unavailable. Try again in a few minutes.',
  safety: 'This passage is too difficult for our AI helper to explain well. Consider reading a scholarly commentary or asking a trusted teacher.',
  timeout: 'The request took too long. Try again in a moment.',
  unavailable: 'This feature is temporarily unavailable. Try again in a few minutes.',
}
```

**Decision:** BB-31 keeps the copy uniform rather than introducing a reflection-specific safety string. The spec explicitly allows both, and the spec's recommendation is uniform copy for initial ship (BB-32 can parameterize later). The `safety` copy says "explain" — this is acceptable per spec edge-case guidance. Keeping uniform copy avoids drift between two hooks and preserves the existing `ERROR_COPY` constant shape.

### 20-verse cap pattern (verified at `ExplainSubView.tsx:20-56`)

```typescript
const MAX_VERSES_PER_REQUEST = 20
const verseCount = selection.endVerse - selection.startVerse + 1
const isOverLimit = verseCount > MAX_VERSES_PER_REQUEST
const safeReference = isOverLimit ? '' : reference
const safeVerseText = isOverLimit ? '' : verseText
const state = useExplainPassage(safeReference, safeVerseText) // called unconditionally
const effectiveStatus = isOverLimit ? 'error' : state.status
```

`useReflectOnPassage` mirrors `useExplainPassage.ts:79-139` where the effect has a `if (!reference || !verseText) return` guard at the top, so passing empty strings keeps the hook in its initial `loading` state without firing a request. `ReflectSubView` overrides `effectiveStatus` to `'error'` and renders an over-limit error with the copy **"Please select 20 or fewer verses to reflect on."** (vs BB-30's "Please select 20 or fewer verses to explain.").

### `ExplainSubViewLoading` / `ExplainSubViewError` reuse

Both components are imported directly by `ReflectSubView.tsx` — no parallel variants. `ExplainSubViewLoading` shows a "Thinking…" label + skeleton bars (verified at `ExplainSubViewLoading.tsx:11-31`) — generic enough to serve reflections without visual change. `ExplainSubViewError` takes `{ kind, message, onRetry }` props — identical signature works for BB-31 unchanged.

### Test patterns (verified during recon)

BB-30 test inventory and approximate size:
- `frontend/src/lib/ai/__tests__/geminiClient.test.ts` — 280 lines, 23 tests (per spec AC 23)
- `frontend/src/lib/ai/prompts/__tests__/explainPassagePrompt.test.ts` — 90 lines, structural prompt tests
- `frontend/src/hooks/bible/__tests__/useExplainPassage.test.ts` — 399 lines, full state machine coverage with `vi.hoisted` + `vi.mock('@/lib/ai/geminiClient', ...)`
- `frontend/src/components/bible/reader/__tests__/ExplainSubView.test.tsx` — 273 lines
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewDisclaimer.test.tsx`
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewLoading.test.tsx`
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewError.test.tsx`
- `frontend/src/components/bible/reader/__tests__/VerseActionSheet.explain.test.tsx` — 246 lines, end-to-end integration test at the sheet level. Mocks `@/lib/ai/geminiClient` via `vi.hoisted` and exercises the full click → loading → success → disclaimer path.

**Test provider wrapping:** The `VerseActionSheet.explain.test.tsx` reconnaissance shows the tests mock `@/components/ui/Toast`, `@/hooks/useReducedMotion`, `@/hooks/useFocusTrap`, `react-router-dom`, `@/data/bible`, `@/lib/bible/crossRefs/loader`. BB-31's `VerseActionSheet.reflect.test.tsx` uses the **identical mock surface** so the two tests can coexist without interference. The sheet itself is rendered directly (no AuthModalProvider wrapping) because the verse action sheet is not auth-gated.

### Auth context

**Zero auth gates.** No `useAuth` imports, no `useAuthModal` imports, no localStorage writes, no database writes. Verified against spec §"Auth Gating" which explicitly mandates this. BB-30's existing `ExplainSubView` likewise has zero auth calls — BB-31 matches that baseline.

### Verified upstream components (no modification)

- `VerseActionSheet.tsx` — handles sub-view navigation via `renderSubView` contract. Adding a new registry entry is sufficient; the sheet is not touched.
- `VerseSelection` / `VerseActionContext` / `VerseActionHandler` types in `@/types/verse-actions` — used as-is.
- `formatReference(sel)` helper from `verseActionRegistry.ts:50-55` — reused by `ReflectSubView`.

---

## Auth Gating Checklist

**BB-31 has zero auth-gated actions by design.** Per spec §"Auth Gating" table and acceptance criterion 43.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap "Reflect on this passage" in verse action sheet | Works identically for logged-in and logged-out users. Zero auth modal. Zero localStorage writes. | Step 4 (ReflectSubView) — explicit "DO NOT import `useAuth` or `useAuthModal`" guardrail | N/A (no auth check) |
| Retry after error | Fires a new Gemini request. No auth gate. | Step 3 (useReflectOnPassage) — explicit guardrail | N/A |
| Read the reflection | No persistence. | Step 4 (ReflectSubView) | N/A |

**Completeness check:** Every action in the spec's Auth Gating table is accounted for. The "Auth Check Method" column reads N/A for all rows because the feature is gate-free by design — this is the complete coverage for this spec.

---

## Design System Values (for UI steps)

All class strings below are **verbatim** from BB-30's shipped `ExplainSubView.tsx` and `ExplainSubViewDisclaimer.tsx`. BB-31 reuses them without modification so zero values are `[UNVERIFIED]`.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `ReflectSubView` outer wrapper | element + classes | `<div>` (no classes, no chrome) | `ExplainSubView.tsx:59` |
| Subtitle row container | className | `px-4 py-1.5` | `ExplainSubView.tsx:61` |
| Subtitle text | className | `text-xs text-white/50` | `ExplainSubView.tsx:62-63` |
| Subtitle text content | literal | `Reflection for {reference}` (NOT "Scholarly context for") | spec §"Sub-view contents" |
| Tier 2 scripture callout outer | className | `mx-4 my-2 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` | `ExplainSubView.tsx:68` |
| Reference line inside callout | className | `font-serif text-sm font-semibold text-white` | `ExplainSubView.tsx:69` |
| Verse text inside callout | className | `mt-1 font-serif text-sm leading-relaxed text-white/80` | `ExplainSubView.tsx:70` |
| Divider below callout | className | `border-t border-white/[0.08]` | `ExplainSubView.tsx:75` |
| Success body container | className | `px-4 py-3` | `ExplainSubView.tsx:106` |
| Success body text | className | `whitespace-pre-wrap text-[15px] leading-[1.7] text-white/90` | `ExplainSubView.tsx:107` |
| Disclaimer container | className | `border-t border-white/[0.08] px-4 py-3` | `ExplainSubViewDisclaimer.tsx:11` |
| Disclaimer text | className | `text-xs leading-relaxed text-white/40` | `ExplainSubViewDisclaimer.tsx:12` |
| Disclaimer literal text | copy | "This reflection was generated by an AI. It's one way this passage might land — not the only way, not the best way, and maybe not your way." | spec §"The disclaimer" (LOCKED) |
| Action icon | Lucide import | `Lightbulb` from `lucide-react` | plan-phase decision (this plan) |
| Action label | copy | "Reflect on this passage" | spec §"Entry point" |
| Action sublabel | copy | "See how it might land today" | spec §"Entry point" |

Zero raw hex values. Every color, border, radius, and font choice is a Tailwind utility referencing existing tokens.

---

## Design System Reminder

**Project-specific quirks `/execute-plan` displays before every UI step:**

- **BB-31 is a Bible reader sub-view, NOT a Daily Hub tab.** The Daily Hub HorizonGlow, textarea white-glow pattern, white pill CTA patterns, FrostedCard Tier 1/2 system, DailyAmbientPillFAB, and `max-w-2xl px-4 py-10 sm:py-14` container pattern are **all irrelevant** to this feature. Do not import `GlowBackground`, `HorizonGlow`, `FrostedCard`, `BackgroundSquiggle`, or any Daily Hub component.
- **BB-31 parallels BB-30.** `ReflectSubView.tsx` is a nearly-verbatim copy of `ExplainSubView.tsx` with three text swaps: the subtitle word ("Reflection" vs "Scholarly context"), the over-limit message ("reflect on" vs "explain"), and the disclaimer component (`ReflectSubViewDisclaimer` vs `ExplainSubViewDisclaimer`). Every class string is identical.
- **The disclaimer text is LOCKED.** Do not "improve" the phrase "maybe not your way" during implementation. It is the load-bearing clause that gives the reader permission to disagree with the reflection. Any copy change must go back through the spec phase.
- **The system prompt is the content work.** BB-31's system prompt is different from BB-30's — different register (contemplative vs scholarly), different rules (interrogative mood required, multi-possibility required, agency clause required). Treat the prompt text as verbatim from the spec §"The system prompt". Do not paraphrase.
- **Icon is `Lightbulb`.** Not `Sparkles` (taken by meditate), not `Brain` (taken by explain), not `Heart` / `Cross` / `Pray` (religious baggage forbidden by spec).
- **`generateExplanation` is untouchable.** Do not refactor the function. Do not extract a shared `generateWithPrompt` helper even if the opportunity looks clean (plan decision: skip the optional refactor to minimize risk of breaking BB-30's 23 existing tests). Write `generateReflection` as a parallel implementation of the same pattern.
- **Lazy-initialized singleton is shared.** `generateReflection` calls `getClient()` — it MUST NOT construct a new `GoogleGenAI` instance. Acceptance criterion 17/18 verifies this.
- **System prompt routes via `config.systemInstruction`.** NOT prepended to `contents`. BB-30 already established this pattern at `geminiClient.ts:125`.
- **No caching, no rate limiting, no retry logic, no streaming, no multi-turn, no persistence, no auth gates.** BB-32 handles caching and rate limiting on top of both features.
- **Pre-existing failing tests are out of scope.** Do not touch them. If any BB-30 test fails after a BB-31 change, revert the change — BB-31 is strictly additive.
- **20-verse cap guard pattern uses unconditional hook call with empty strings.** Do not make the hook call conditional (rules-of-hooks violation). See Architecture Context §"20-verse cap pattern" for the exact shape.
- **StrictMode double-mount requires `queueMicrotask` deferral in the hook effect.** BB-30's `useExplainPassage.ts:107` comment explains the reasoning — the Gemini SDK dispatches `fetch()` synchronously, so without deferral the first StrictMode mount's HTTP request hits the wire before the cleanup runs. Mirror this pattern exactly in `useReflectOnPassage`.
- **`isMountedRef` guard + per-effect `AbortController` + `AbortError` silent discard** — all three are load-bearing in BB-30's hook. Mirror them in BB-31's hook.

**Source:** design system recon, `.claude/rules/09-design-system.md` (Round 3 Visual Patterns confirms the Bible reader sheet is NOT in the Daily Hub scope), BB-30's shipped code (`ExplainSubView.tsx`, `ExplainSubViewDisclaimer.tsx`, `useExplainPassage.ts`, `geminiClient.ts`), and the `_plans/2026-04-10-bb30-explain-this-passage.md` sibling plan.

---

## Shared Data Models (from Master Plan)

N/A — BB-31 does not consume any master-plan interfaces. It reuses the existing `VerseSelection` and `VerseActionContext` types from `@/types/verse-actions` (established by BB-4/BB-6) without modification.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| — | — | **Zero localStorage reads or writes.** Reflections are ephemeral. The `11-local-storage-keys.md` inventory does not need updating. |

---

## Responsive Structure

BB-31 inherits responsive behavior from `VerseActionSheet` without introducing new rules. `ReflectSubView` is rendered inside the sheet's scrollable body and uses the same class strings as `ExplainSubView`, which were themselves built to the sheet's responsive contract.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | `VerseActionSheet` renders as a bottom sheet. `ReflectSubView` fills the scrollable body. Tier 2 callout wraps as needed. Retry button (inherited from `ExplainSubViewError`) is ≥44px tap target. |
| Tablet | 768px | Same bottom-sheet behavior (no desktop-dialog breakpoint in the sheet). |
| Desktop | 1440px | Same bottom-sheet behavior. Sheet container is max-width-constrained upstream; `ReflectSubView` fills available width without forcing its own. |

**Custom breakpoints:** None. BB-31 uses only the existing sheet responsive rules.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature. `ReflectSubView` is a stacked vertical layout: subtitle row → scripture callout → divider → body (or loading/error) → disclaimer. The verse action sheet row itself is an existing layout owned by `VerseActionSheet` and not modified by BB-31.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Subtitle row → Tier 2 callout | `py-1.5` subtitle + `my-2` callout top margin = 14px | `ExplainSubView.tsx:61,68` (mirrored) |
| Tier 2 callout → Divider | `my-2` callout bottom margin (8px) | `ExplainSubView.tsx:68,75` |
| Divider → Body / Loading / Error | 0 (divider abuts content) | `ExplainSubView.tsx:75-113` |
| Body → Disclaimer | `py-3` body bottom padding + disclaimer `border-t` (no extra margin) | `ExplainSubView.tsx:106-111` |

**Verification:** Open `ReflectSubView` side-by-side with `ExplainSubView` in the reader and compare computed spacing. Any gap difference >5px indicates a class-string drift bug.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-30 is shipped and green. Run `cd frontend && pnpm test -- geminiClient ExplainSubView useExplainPassage VerseActionSheet.explain` — all 23 `geminiClient.test.ts` tests plus all `ExplainSubView*` tests plus `useExplainPassage.test.ts` plus `VerseActionSheet.explain.test.tsx` must pass before BB-31 begins. **Spec AC 23: BB-30's 23 existing tests must remain green after every BB-31 step.**
- [ ] `frontend/src/lib/env.ts` exports `requireGeminiApiKey()`. (Confirmed from BB-30 execution.)
- [ ] `frontend/.env.local` contains `VITE_GEMINI_API_KEY`. (Confirmed from BB-30 execution.)
- [ ] `frontend/.env.local` is gitignored. (Confirmed.)
- [ ] `@google/genai` package is in `frontend/package.json`. (Confirmed from BB-30 execution.)
- [ ] Model string `gemini-2.5-flash-lite` is still current — re-verify against <https://ai.google.dev/gemini-api/docs/models> at execution start. If Google has deprecated it since 2026-04-10, flag to user before continuing.
- [ ] All auth-gated actions from the spec are accounted for: **yes, zero** (checklist complete).
- [ ] Design system values are verified from BB-30's shipped code (not guessed): **yes** (all class strings cited).
- [ ] All `[UNVERIFIED]` values are flagged with verification methods: **zero `[UNVERIFIED]` values** — every class string is a verbatim copy from BB-30.
- [ ] Recon report loaded: **N/A** — BB-31 doesn't introduce new visual patterns.
- [ ] Prior specs in the sequence are complete and committed: **yes** — BB-30 commit is `cb212c0 bb-30-explain-this-passage`.
- [ ] No deprecated patterns used: **verified** — BB-31 is not on the Daily Hub, so Caveat/BackgroundSquiggle/GlowBackground/animate-glow-pulse/cyan borders/Lora italic/etc. are all irrelevant. The only design system rule BB-31 follows is the Tier 2 scripture callout pattern, which BB-30 already applies.
- [ ] The icon choice `Lightbulb` doesn't conflict with any existing `SECONDARY_ACTIONS` entry. (Confirmed — Lightbulb is not used anywhere in `verseActionRegistry.ts`.)
- [ ] The prompt testing budget of 1-2 iteration rounds is understood. BB-30 passed in Round 1; BB-31 is harder. Budget accordingly and escalate after round 3 if still failing.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Optional `generateWithPrompt` helper refactor | **Skip.** `generateReflection` is a parallel implementation of `generateExplanation`. | The refactor would touch `generateExplanation`'s code path and risk breaking BB-30's 23 existing tests. Spec explicitly allows skipping. BB-32 is the right place for client-level refactors. |
| Safety-block error copy | Reuse BB-30's `ERROR_COPY.safety` verbatim (still says "explain", not "reflect on"). | Spec edge-case section explicitly allows this for initial ship. Uniform copy avoids a second constant to maintain. BB-32 can parameterize per-feature copy. |
| Over-limit error copy | New string: **"Please select 20 or fewer verses to reflect on."** | Parallels BB-30's "Please select 20 or fewer verses to explain." — only this one literal differs. |
| Icon | `Lightbulb` | `Sparkles` is used by `meditate`, `Brain` by `explain`. `Lightbulb` signals insight without religious baggage. `Eye` rejected for surveillance connotations. |
| Registry position | `SECONDARY_ACTIONS`, immediately after `explain`, before `memorize` | Spec AC 2 — adjacent to Explain because both are AI features; Explain comes first as the foundational reading aid. |
| Shared loading/error components | Import `ExplainSubViewLoading` and `ExplainSubViewError` directly in `ReflectSubView` | Spec §"Sub-view contents" explicitly mandates no parallel variants. The loading/error experiences are identical. |
| Disclaimer as separate component | Create `ReflectSubViewDisclaimer.tsx` as a parallel variant of `ExplainSubViewDisclaimer.tsx`. | Spec §"The disclaimer" — the copy is different enough (positioning the output as "one of many" vs "scholarly") that a shared component with a prop would obscure the intentional register difference. |
| `generateReflection` signature | Matches `generateExplanation`: `(reference: string, verseText: string, signal?: AbortSignal): Promise<ReflectResult>`. | Rules-of-identity with BB-30 enables the hook to be structurally identical. |
| `ReflectResult` type | New exported type `{ content: string, model: string }` — same shape as `ExplainResult` but a distinct identifier. | Spec §"Shape of the new function" — callers should be explicit about which feature they're calling, and future specs may extend one type and not the other. |
| Error classification sharing | BB-31's hook has its own `classifyError` function (duplicated from BB-30's hook) rather than importing it. | Spec §"Error states" — the `classifyError` function structure is identical but the hook should be self-contained so BB-32 can evolve per-feature classification if needed. |
| Prompt test passages | Use the 8 passages from spec §"BB-31's 8 test passages" — different from BB-30's 8. | Spec-locked. The passages are chosen to stress-test BB-31's prompt failure modes specifically. |
| User-prompt template divergence from BB-30 | BB-31's user prompt explicitly asks for "genuine questions and possibilities, not answers or instructions." | Spec §"The user prompt template" — different from BB-30's "Give me the context, what the passage is doing..." because BB-31's register is different. |

---

## Implementation Steps

The steps are ordered so each step is independently verifiable and testable, and earlier steps do not depend on later ones. Steps 1-3 are infrastructure (prompt, client function, hook). Steps 4-5 are UI. Step 6 is registry wiring. Step 7 is sheet-level integration test. Step 8 is the prompt testing script and execution.

---

### Step 1: Create the reflection prompt module

**Objective:** Add `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts` with the spec's locked system prompt and user-prompt builder.

**Files to create/modify:**
- `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts` — new file
- `frontend/src/lib/ai/prompts/__tests__/reflectPassagePrompt.test.ts` — new file

**Details:**

Create `reflectPassagePrompt.ts` with:

1. A header JSDoc block identical in style to `explainPassagePrompt.ts:1-13` but referencing BB-31's spec section and `_plans/recon/bb31-prompt-tests.md`.
2. `export const REFLECT_PASSAGE_SYSTEM_PROMPT = \`...\`` — the exact 10-rule prompt text from spec §"The system prompt". Copy **verbatim**, including the rule numbering, the examples of good/bad phrasing, and the final "Respond with the reflection text only" line. Use a template literal (backticks) so multi-line formatting is preserved.
3. `export function buildReflectPassageUserPrompt(reference: string, verseText: string): string` — returns the 4-line template from spec §"The user prompt template". Interpolate `reference` and `verseText` via template literal.

Do NOT modify `explainPassagePrompt.ts`.

**Auth gating (if applicable):** N/A — pure prompt text module, no runtime behavior.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT paraphrase the system prompt. The rules are content work — deviation changes the feature's output character.
- DO NOT shorten or "improve" the examples of good/bad phrasing inside rule 1.
- DO NOT import from `explainPassagePrompt.ts` — parallel implementation.
- DO NOT use a format string library — plain template literal only.
- DO NOT export additional helpers (future features create their own prompt files).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `REFLECT_PASSAGE_SYSTEM_PROMPT is a non-empty string` | unit | Imports the constant and asserts `typeof === 'string'` and `length > 500` |
| `prompt contains the phrase "interrogative and conditional mood"` | unit | Asserts the substring appears (guards AC 27) |
| `prompt forbids "this passage teaches"` | unit | Asserts the substring "This passage teaches us that" appears in the bad-phrasing examples (guards AC 28) |
| `prompt requires multiple possibilities` | unit | Asserts substring "Offer multiple possibilities" (guards AC 29) |
| `prompt requires the agency clause` | unit | Asserts substring "might not land at all" (guards AC 30) |
| `prompt forbids prescribed practices` | unit | Asserts substring "Do not prescribe practices" (guards AC 31) |
| `prompt forbids pastoral ventriloquism` | unit | Asserts substring "Do not speak for God" (guards AC 32) |
| `prompt forbids the life-lesson voice` | unit | Asserts substring `so the next time you` (guards AC 33) |
| `buildReflectPassageUserPrompt interpolates reference and verseText` | unit | Passes `("Philippians 4:6-7", "...verse text...")`, asserts both literals appear in the output |
| `user prompt asks for genuine questions and possibilities` | unit | Asserts substring "genuine questions and possibilities" |
| `buildReflectPassageUserPrompt handles empty args without throwing` | unit | Defensive test — returns a string even for `("", "")` |

**Expected state after completion:**
- [ ] `reflectPassagePrompt.ts` exists and exports `REFLECT_PASSAGE_SYSTEM_PROMPT` and `buildReflectPassageUserPrompt`
- [ ] `pnpm test reflectPassagePrompt` passes (11 tests)
- [ ] `pnpm lint` clean
- [ ] `explainPassagePrompt.ts` byte-unchanged

---

### Step 2: Add `generateReflection` to the Gemini client

**Objective:** Extend `frontend/src/lib/ai/geminiClient.ts` with a new `generateReflection` function and `ReflectResult` type. `generateExplanation` must remain byte-unchanged.

**Files to create/modify:**
- `frontend/src/lib/ai/geminiClient.ts` — MODIFY (add function + type; do not touch existing exports)
- `frontend/src/lib/ai/__tests__/geminiClient.test.ts` — MODIFY (add new describe block; do not touch existing tests)

**Details:**

At the top of `geminiClient.ts`, add a new import alongside the existing `explainPassagePrompt` import:

```typescript
import {
  REFLECT_PASSAGE_SYSTEM_PROMPT,
  buildReflectPassageUserPrompt,
} from '@/lib/ai/prompts/reflectPassagePrompt'
```

After the `ExplainResult` interface (after line 43), add:

```typescript
/**
 * The return shape for `generateReflection`. Same shape as `ExplainResult`
 * but a distinct exported type so callers are explicit about which feature
 * they're calling, and future features may extend one type and not the other.
 */
export interface ReflectResult {
  content: string
  model: string
}
```

After `generateExplanation` (after line 191), add a new `generateReflection` function that is **byte-for-byte identical to `generateExplanation`** except for:
1. The imports used: `REFLECT_PASSAGE_SYSTEM_PROMPT` and `buildReflectPassageUserPrompt` instead of the `EXPLAIN_PASSAGE_*` equivalents.
2. The return type: `Promise<ReflectResult>` instead of `Promise<ExplainResult>`.
3. The JSDoc block: rewrite to describe contemplative reflection rather than scholarly explanation, keep all `@param` / `@throws` tags identical except for return type.
4. The inner variable names in JSDoc — e.g., "Generate a contemplative reflection" instead of "Generate a scholarly explanation".

Every other detail must be identical:
- Lazy client init via `getClient()` — MUST reuse the module-level `client` singleton, NOT create a new `GoogleGenAI` instance.
- `userPrompt = buildReflectPassageUserPrompt(reference, verseText)` (the only function-call difference).
- `AbortSignal.timeout(REQUEST_TIMEOUT_MS)` composed with caller signal via `AbortSignal.any`.
- `ai.models.generateContent({ model: MODEL, contents: userPrompt, config: { systemInstruction: REFLECT_PASSAGE_SYSTEM_PROMPT, temperature: TEMPERATURE, maxOutputTokens: MAX_OUTPUT_TOKENS, abortSignal: combinedSignal } })` — note `REFLECT_PASSAGE_SYSTEM_PROMPT` in `systemInstruction`.
- Error classification into the five typed error classes (same try/catch structure as `generateExplanation.ts:131-162`).
- Safety block detection across three paths: `response.promptFeedback?.blockReason`, `candidates[0]?.finishReason === 'SAFETY' | 'PROHIBITED_CONTENT'`, and empty `response.text`.
- Return `{ content, model: MODEL }`.

**Do NOT** extract a shared `generateWithPrompt(systemPrompt, userPrompt)` helper. See Edge Cases & Decisions table. The two functions are parallel, not refactored.

**Do NOT** touch `generateExplanation`, the `client` singleton, `getClient()`, `__resetGeminiClientForTests`, the `MODEL` / `REQUEST_TIMEOUT_MS` / `MAX_OUTPUT_TOKENS` / `TEMPERATURE` constants, or the `ExplainResult` type.

**Do NOT** change any imports that already exist.

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT modify `generateExplanation` in any way. Spec AC 22 + AC 23.
- DO NOT create a second `GoogleGenAI` instance. The singleton must be shared. Spec AC 17/18.
- DO NOT change the model string, temperature, or maxOutputTokens. Spec AC 19/21.
- DO NOT prepend the system prompt to `contents`. It MUST route through `config.systemInstruction`. Spec AC 20.
- DO NOT add a separate timeout constant or different timeout behavior.
- DO NOT extract shared code into a private helper. See Edge Cases & Decisions.

**Test specifications:**

Add a new `describe('generateReflection', () => { ... })` block at the bottom of `geminiClient.test.ts`, after the existing `generateExplanation` describe block. Do NOT modify the existing block. Each test below uses `beforeEach` that calls `__resetGeminiClientForTests()` to ensure test isolation, and `vi.mock('@google/genai', ...)` with a mock `GoogleGenAI` constructor.

| Test | Type | Description |
|------|------|-------------|
| `generateReflection returns { content, model } on success` | unit | Mock SDK returns `{ text: 'A reflection.' }`; assert shape and values |
| `generateReflection passes REFLECT_PASSAGE_SYSTEM_PROMPT via config.systemInstruction` | unit | Spy on `generateContent` args; assert `config.systemInstruction === REFLECT_PASSAGE_SYSTEM_PROMPT` |
| `generateReflection passes the built user prompt in contents` | unit | Assert `contents` argument equals `buildReflectPassageUserPrompt("Ref", "Text")` output |
| `generateReflection uses gemini-2.5-flash-lite as the model` | unit | Assert `model === 'gemini-2.5-flash-lite'` |
| `generateReflection shares the lazy-initialized client with generateExplanation` | unit | Call `generateExplanation` first (initializes singleton), then `generateReflection`; assert `GoogleGenAI` constructor called exactly once |
| `generateReflection throws GeminiKeyMissingError when key not set` | unit | Mock `requireGeminiApiKey` to throw; assert `GeminiKeyMissingError` |
| `generateReflection throws GeminiNetworkError on TypeError` | unit | Mock `generateContent` to throw `new TypeError('fetch failed')`; assert `GeminiNetworkError` |
| `generateReflection throws GeminiTimeoutError on DOMException TimeoutError` | unit | Mock to throw `new DOMException('timeout', 'TimeoutError')`; assert `GeminiTimeoutError` |
| `generateReflection throws GeminiApiError on generic error` | unit | Mock to throw `new Error('Invalid API key')`; assert `GeminiApiError` |
| `generateReflection throws GeminiSafetyBlockError when promptFeedback.blockReason is set` | unit | Mock response with `promptFeedback: { blockReason: 'SAFETY' }`; assert error |
| `generateReflection throws GeminiSafetyBlockError when candidates[0].finishReason is SAFETY` | unit | Mock response with `candidates: [{ finishReason: 'SAFETY' }]`; assert error |
| `generateReflection throws GeminiSafetyBlockError when candidates[0].finishReason is PROHIBITED_CONTENT` | unit | Same as above with `PROHIBITED_CONTENT` |
| `generateReflection throws GeminiSafetyBlockError on empty response.text` | unit | Mock response with `text: ''`; assert error |
| `generateReflection propagates caller AbortSignal.aborted and re-throws AbortError` | unit | Pre-abort a controller, pass signal; assert `AbortError` (name === 'AbortError') thrown, NOT wrapped |
| `generateReflection composes caller signal with internal timeout` | unit | Verify `AbortSignal.any([signal, timeoutSignal])` is called when caller provides a signal |
| `existing generateExplanation tests still pass` | regression | Run full test file, assert existing 23 tests remain green | 

**Expected state after completion:**
- [ ] `geminiClient.ts` exports `generateReflection` and `ReflectResult`
- [ ] `generateExplanation` byte-unchanged (compare git diff — only additions)
- [ ] `pnpm test geminiClient` passes all existing 23 tests + ~15 new tests (38 total)
- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean

---

### Step 3: Create the `useReflectOnPassage` hook

**Objective:** Add `frontend/src/hooks/bible/useReflectOnPassage.ts` mirroring `useExplainPassage.ts` byte-for-byte with only the generator function and type names swapped.

**Files to create/modify:**
- `frontend/src/hooks/bible/useReflectOnPassage.ts` — new file
- `frontend/src/hooks/bible/__tests__/useReflectOnPassage.test.ts` — new file

**Details:**

Copy `useExplainPassage.ts` as the starting point and apply these exact swaps:

1. Import `generateReflection, type ReflectResult` from `@/lib/ai/geminiClient` (instead of `generateExplanation, type ExplainResult`).
2. Rename the exported type `ExplainErrorKind` → `ReflectErrorKind`. Keep the five member values identical: `'network' | 'api' | 'safety' | 'timeout' | 'unavailable'`.
3. Rename the exported interface `ExplainState` → `ReflectState`. Keep all field names identical, swap the `result` type from `ExplainResult | null` to `ReflectResult | null`. Rename `errorKind: ExplainErrorKind | null` to `errorKind: ReflectErrorKind | null`.
4. Copy the `ERROR_COPY` map byte-for-byte from `useExplainPassage.ts:29-37`. **Do NOT change the copy** — spec §"Error states" mandates uniform copy, and the safety copy intentionally says "explain" for the initial ship.
5. Copy `classifyError` byte-for-byte. It references the same five `Gemini*Error` classes.
6. Rename the exported hook `useExplainPassage` → `useReflectOnPassage`. Its signature is identical: `(reference: string, verseText: string) => ReflectState & { retry: () => void }`.
7. Inside the effect, replace the single call site `generateExplanation(reference, verseText, controller.signal)` with `generateReflection(reference, verseText, controller.signal)`.
8. **Preserve every other line verbatim**, including:
   - The `useState`, `useEffect`, `useRef`, `useCallback` imports.
   - The `isMountedRef` guard pattern.
   - The per-effect `AbortController` with cleanup `controller.abort()`.
   - The `queueMicrotask` deferral (load-bearing for StrictMode correctness — see `useExplainPassage.ts:97-134` for the comment explaining why).
   - The `setState({ status: 'loading', ... })` reset at effect start.
   - The `if (err instanceof Error && err.name === 'AbortError') return` silent-discard branch.
   - The `retry` callback bumping `attempt` state.
   - The guard `if (!reference || !verseText) return` for over-limit selections.
   - The dependency array `[reference, verseText, attempt]`.

The JSDoc block should be updated to reference BB-31 / "contemplative reflection" instead of BB-30 / "scholarly explanation", but the structural comment at line 97-106 about `queueMicrotask` must be preserved verbatim — it's a load-bearing correctness comment.

**Auth gating:** N/A — hook is zero-auth. Do NOT add `useAuth`, `useAuthModal`, or any auth context import.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT import from `useExplainPassage.ts` — parallel implementation.
- DO NOT change `ERROR_COPY` copy strings. Spec §"Error states" — uniform copy across both hooks.
- DO NOT add auth imports.
- DO NOT add localStorage reads/writes.
- DO NOT skip the `queueMicrotask` deferral — StrictMode will fire two billed Gemini requests without it.
- DO NOT remove the `isMountedRef` guard.
- DO NOT change the dependency array.
- DO NOT merge the two hooks into a generic `useAiGeneration` helper. Parallel implementation.

**Test specifications:**

Mirror `useExplainPassage.test.ts` (399 lines, full state-machine coverage). Mock `@/lib/ai/geminiClient` via `vi.hoisted` and `vi.mock` at module level. Use `renderHook` from `@testing-library/react`.

| Test | Type | Description |
|------|------|-------------|
| `initial state is loading with null result` | unit | `renderHook(() => useReflectOnPassage('Phil 4:6', 'text'))`; assert initial `{ status: 'loading', result: null, errorKind: null, errorMessage: null }` |
| `transitions to success when generateReflection resolves` | unit | Mock resolves with `{ content: 'A reflection.', model: 'gemini-2.5-flash-lite' }`; await state; assert `status === 'success'` and result matches |
| `transitions to error state with network kind on GeminiNetworkError` | unit | Mock rejects with `new GeminiNetworkError('offline')`; assert `errorKind === 'network'` and `errorMessage` matches `ERROR_COPY.network` |
| `transitions to error state with api kind on GeminiApiError` | unit | Same pattern with `GeminiApiError` |
| `transitions to error state with safety kind on GeminiSafetyBlockError` | unit | Same pattern with `GeminiSafetyBlockError` |
| `transitions to error state with timeout kind on GeminiTimeoutError` | unit | Same pattern with `GeminiTimeoutError` |
| `transitions to error state with unavailable kind on GeminiKeyMissingError` | unit | Key missing maps to 'unavailable' per `classifyError` |
| `transitions to error state with unavailable kind on unknown error` | unit | Mock rejects with `new Error('unknown')`; assert `errorKind === 'unavailable'` |
| `does not fire request when reference is empty` | unit | Render with `('', 'text')`; assert `generateReflection` not called; state remains loading |
| `does not fire request when verseText is empty` | unit | Render with `('Phil 4:6', '')`; same |
| `aborts in-flight request on unmount via AbortController` | unit | Start request, unmount, assert controller.signal.aborted is true |
| `silently discards AbortError (does not transition to error)` | unit | Mock throws `new DOMException('abort', 'AbortError')`; assert state stays in loading (not error) |
| `retry() fires a new request` | unit | Initial error → `act(() => result.current.retry())` → assert `generateReflection` called again |
| `setState is not called after unmount` | unit | Start request, unmount before resolve, resolve; assert no React warning about setState on unmounted component |
| `StrictMode double-mount does not fire two network requests` | unit | Render inside React StrictMode; assert `generateReflection` called exactly once (or document if React testing library's StrictMode simulation differs from runtime) |

**Expected state after completion:**
- [ ] `useReflectOnPassage.ts` exists and exports the hook + types
- [ ] `useExplainPassage.ts` byte-unchanged
- [ ] `pnpm test useReflectOnPassage` passes (~15 tests)
- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean

---

### Step 4: Create `ReflectSubViewDisclaimer` component

**Objective:** Add `frontend/src/components/bible/reader/ReflectSubViewDisclaimer.tsx` — a new presentational component with the exact locked disclaimer copy.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReflectSubViewDisclaimer.tsx` — new file
- `frontend/src/components/bible/reader/__tests__/ReflectSubViewDisclaimer.test.tsx` — new file

**Details:**

Mirror `ExplainSubViewDisclaimer.tsx` structure exactly (20 lines). The component:

1. Takes no props.
2. Returns a `<div>` with `className="border-t border-white/[0.08] px-4 py-3"`.
3. Contains a single `<p>` with `className="text-xs leading-relaxed text-white/40"`.
4. The `<p>` text is exactly: **"This reflection was generated by an AI. It's one way this passage might land — not the only way, not the best way, and maybe not your way."**

Escape the apostrophe in "It's" as `It&apos;s` (matching BB-30's JSX-escaping pattern at `ExplainSubViewDisclaimer.tsx:13`). Use a proper em-dash `—` (not `--`).

JSDoc block above the component citing spec §"The disclaimer" and flagging that the text is LOCKED.

**Auth gating:** N/A — pure presentational component.

**Responsive behavior (UI step):**
- **Desktop (1440px):** Renders at sheet width inside the `VerseActionSheet` container. Text reflows naturally.
- **Tablet (768px):** Same behavior inside bottom sheet.
- **Mobile (375px):** Same; text wraps within `px-4` container.

**Inline position expectations:** N/A (stacked layout).

**Guardrails (DO NOT):**
- DO NOT change the disclaimer text. The phrase "maybe not your way" is load-bearing. Spec AC 9.
- DO NOT add a close button. Spec AC 10 — non-dismissible.
- DO NOT gate behind settings. Spec AC 10.
- DO NOT accept props for variant copy. Create a separate component if future specs need a different disclaimer.
- DO NOT import from `ExplainSubViewDisclaimer.tsx`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders the exact disclaimer text` | unit | Asserts the full literal string appears (spec AC 9) |
| `contains the phrase "maybe not your way"` | unit | The load-bearing clause — separate assertion for belt-and-suspenders |
| `applies the disclaimer container classes` | unit | `border-t border-white/[0.08] px-4 py-3` |
| `applies the disclaimer text classes` | unit | `text-xs leading-relaxed text-white/40` |

**Expected state after completion:**
- [ ] `ReflectSubViewDisclaimer.tsx` exists
- [ ] `pnpm test ReflectSubViewDisclaimer` passes (4 tests)
- [ ] `ExplainSubViewDisclaimer.tsx` byte-unchanged

---

### Step 5: Create `ReflectSubView` component

**Objective:** Add `frontend/src/components/bible/reader/ReflectSubView.tsx` — the main sub-view component, mirroring `ExplainSubView.tsx` with the new hook, disclaimer, and subtitle copy.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReflectSubView.tsx` — new file
- `frontend/src/components/bible/reader/__tests__/ReflectSubView.test.tsx` — new file

**Details:**

Copy `ExplainSubView.tsx` (117 lines) as the starting point. Apply these exact swaps:

1. **Imports:**
   - Replace `useExplainPassage` with `useReflectOnPassage`.
   - Replace `ExplainSubViewDisclaimer` with `ReflectSubViewDisclaimer`.
   - **Keep** the imports for `ExplainSubViewLoading` and `ExplainSubViewError` — these are reused directly (spec §"Sub-view contents").
   - Keep `formatReference` import from `verseActionRegistry`.
   - Keep the `VerseSelection`, `VerseActionContext` type imports.

2. **Rename props interface:** `ExplainSubViewProps` → `ReflectSubViewProps`. Fields unchanged: `selection`, `onBack`, `context?`.

3. **Rename exported component:** `ExplainSubView` → `ReflectSubView`. Props parameter destructuring identical.

4. **Replace `useExplainPassage(safeReference, safeVerseText)` with `useReflectOnPassage(safeReference, safeVerseText)`.**

5. **Change subtitle text** (line 62-64 in original): `"Scholarly context for {reference}"` → **`"Reflection for {reference}"`**.

6. **Change over-limit error message:** `"Please select ${MAX_VERSES_PER_REQUEST} or fewer verses to explain."` → **`"Please select ${MAX_VERSES_PER_REQUEST} or fewer verses to reflect on."`**.

7. **Replace `<ExplainSubViewDisclaimer />` with `<ReflectSubViewDisclaimer />`** in the success branch.

8. **Every other line is byte-identical**, including:
   - `MAX_VERSES_PER_REQUEST = 20`
   - The `verseCount`, `isOverLimit`, `safeReference`, `safeVerseText`, `effectiveStatus` derived values.
   - The outer `<div>` with no classes.
   - The subtitle `<div className="px-4 py-1.5">` wrapper.
   - The Tier 2 scripture callout `<div className="mx-4 my-2 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3">` and its inner `<p>` elements.
   - The divider `<div className="border-t border-white/[0.08]" />`.
   - `<ExplainSubViewLoading />` rendered when `effectiveStatus === 'loading'`.
   - `<ExplainSubViewError>` rendered for both the over-limit branch and the hook error branch.
   - The success branch with `<div className="px-4 py-3"><p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-white/90">{state.result.content}</p></div>`.

Update the JSDoc block to reference BB-31 / "Reflect on this passage" and flag that `ExplainSubViewLoading` and `ExplainSubViewError` are deliberately reused (not duplicated) per spec §"Sub-view contents".

**Auth gating:** N/A — zero auth. Do NOT import `useAuth` or `useAuthModal`. Verify with grep after save.

**Responsive behavior (UI step):**
- **Desktop (1440px):** Sub-view fills the verse action sheet body (sheet itself is container-bound). Subtitle row compact, Tier 2 callout full-width inside `mx-4` margin, body text flows naturally with `max-w-2xl`-equivalent reading width (actually the sheet container width).
- **Tablet (768px):** Same as desktop — the sheet is still a bottom sheet on tablet.
- **Mobile (375px):** Bottom-sheet layout. Callout text wraps within `px-4` padding. Retry button inside `ExplainSubViewError` is ≥44px (inherited). No horizontal scroll.

**Inline position expectations:** N/A (stacked vertical layout — no inline rows).

**Guardrails (DO NOT):**
- DO NOT import `useAuth` or `useAuthModal`. Grep before commit. Spec AC 43.
- DO NOT add any localStorage reads/writes.
- DO NOT create `ReflectSubViewLoading` or `ReflectSubViewError` parallel components — reuse BB-30's directly.
- DO NOT change the class strings. The Tier 2 callout pattern must match BB-30 byte-for-byte.
- DO NOT render a back button, close X, or title inside `ReflectSubView`. Sheet chrome is owned by `VerseActionSheet`. This is the CrossRefsSubView pattern — avoid the NoteEditorSubView double-header bug. Spec AC 4.
- DO NOT forward `onBack` or `context` into the child components (they're unused — prefix with `_` like BB-30 at line 42-43).
- DO NOT exceed the 20-verse cap. The guard pattern passes empty strings to keep the hook call unconditional.
- DO NOT parse markdown or HTML in the reflection output. Plain text rendering via `whitespace-pre-wrap` only. Spec AC 55.
- DO NOT use `dangerouslySetInnerHTML` anywhere. Spec AC 55.

**Test specifications:**

Mirror `ExplainSubView.test.tsx` (273 lines). Mock `@/hooks/bible/useReflectOnPassage` at module level via `vi.hoisted` + `vi.mock`. Mock `@/hooks/useReducedMotion` to return `false`.

| Test | Type | Description |
|------|------|-------------|
| `renders "Reflection for {reference}" subtitle` | integration | Mock selection `1 Cor 13:4-7`; assert subtitle text |
| `renders the Tier 2 scripture callout with reference and verse text` | integration | Assert callout contains book/chapter/verse and verse text |
| `applies the Tier 2 callout class string` | integration | Assert `mx-4 my-2 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` on callout div |
| `renders ExplainSubViewLoading when hook is in loading state` | integration | Mock hook returns loading state; assert "Thinking…" label |
| `renders the reflection body in a px-4 py-3 container with whitespace-pre-wrap` | integration | Mock hook returns success; assert body text and class `whitespace-pre-wrap text-[15px] leading-[1.7] text-white/90` |
| `renders ReflectSubViewDisclaimer below the success body` | integration | Mock success; assert disclaimer text appears below body |
| `renders ExplainSubViewError with network kind when hook errors` | integration | Mock hook returns network error; assert error copy + retry button |
| `over-limit selection (21+ verses) shows over-limit error with "reflect on" copy` | integration | Pass selection with endVerse - startVerse >= 21; assert "Please select 20 or fewer verses to reflect on." |
| `over-limit selection does not fire the hook (empty-string guard)` | integration | Spy on the mocked hook; assert it was called with empty strings |
| `handles single-verse selection` | integration | `startVerse === endVerse`; assert single-verse reference rendering |
| `onBack prop is accepted but not consumed` | integration | Assert no back button rendered inside the sub-view (chrome owned by sheet) |
| `no useAuth or useAuthModal calls` | integration | Assert test does NOT need AuthModalProvider wrapping (renders without errors using bare render) |
| `no localStorage writes during render or loading` | integration | Spy on localStorage.setItem; assert not called during render lifecycle |
| `reflection text is rendered as plain text (no HTML parsing)` | integration | Mock content with `<script>alert(1)</script>`; assert rendered as literal text, not executed |

**Expected state after completion:**
- [ ] `ReflectSubView.tsx` exists
- [ ] `ExplainSubView.tsx` byte-unchanged
- [ ] `pnpm test ReflectSubView` passes (14 tests)
- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean
- [ ] Grep confirms no `useAuth`, no `useAuthModal`, no `localStorage` in `ReflectSubView.tsx`

---

### Step 6: Wire `reflect` into the verse action registry

**Objective:** Add the `reflect` action to `SECONDARY_ACTIONS` in `frontend/src/lib/bible/verseActionRegistry.ts` immediately after `explain`, and add registry tests.

**Files to create/modify:**
- `frontend/src/lib/bible/verseActionRegistry.ts` — MODIFY (add `Lightbulb` to lucide import, add `ReflectSubView` import, add `reflect` handler, insert into `SECONDARY_ACTIONS`)
- `frontend/src/lib/bible/__tests__/verseActionRegistry.test.ts` — MODIFY (add tests for the new action)

**Details:**

1. **Add `Lightbulb` to the `lucide-react` import** at line 2-15. The import currently destructures 13 icons; add `Lightbulb` alphabetically or next to `Brain` for adjacency.

2. **Add a new import** after the `ExplainSubView` import at line 17:
   ```typescript
   import { ReflectSubView } from '@/components/bible/reader/ReflectSubView'
   ```

3. **Define the `reflect` handler** immediately after the `explain` const (after line 369):
   ```typescript
   const reflect: VerseActionHandler = {
     action: 'reflect',
     label: 'Reflect on this passage',
     sublabel: 'See how it might land today',
     icon: Lightbulb,
     category: 'secondary',
     hasSubView: true,
     renderSubView: (props) => React.createElement(ReflectSubView, props),
     isAvailable: () => true,
     onInvoke: () => {},
   }
   ```

4. **Insert `reflect` into `SECONDARY_ACTIONS`** (currently at line 420-429) between `explain` and `memorize`:
   ```typescript
   const SECONDARY_ACTIONS: VerseActionHandler[] = [
     pray,
     journal,
     meditate,
     crossRefs,
     explain,
     reflect,   // <-- new
     memorize,
     copy,
     copyWithRef,
   ]
   ```

5. **Add `'reflect'` to the `VerseAction` union type** in `@/types/verse-actions` if not already present. Verify at execution time — if the type is an open string union, no change; if it's a closed literal union, add `'reflect'` to the list. This is the only modification to a BB-6 type that BB-31 may need.

Do NOT modify any other handler. Do NOT reorder actions. Do NOT change the `explain` handler in any way.

**Auth gating:** N/A — registry entry inherits zero-auth from the handler's empty `onInvoke`.

**Responsive behavior:** N/A: no UI impact (the action row is rendered by `VerseActionSheet`, not the registry).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT use `Sparkles` (used by `meditate`) or `Brain` (used by `explain`) as the icon.
- DO NOT place `reflect` anywhere other than directly after `explain` in `SECONDARY_ACTIONS`. Spec AC 2.
- DO NOT modify the `explain` handler's label, sublabel, icon, or position.
- DO NOT change the order of any other handler in `SECONDARY_ACTIONS`.
- DO NOT modify `PRIMARY_ACTIONS`.
- DO NOT add an `onInvoke` body for `reflect` — sub-views are opened by returning a non-null `renderSubView`, not by `onInvoke`.

**Test specifications:**

Mirror the existing `explain` action tests in `verseActionRegistry.test.ts`. Do not modify existing tests.

| Test | Type | Description |
|------|------|-------------|
| `getAllActions includes a reflect action` | unit | Assert `getActionByType('reflect')` returns a defined handler |
| `reflect is in SECONDARY_ACTIONS` | unit | Assert `getSecondaryActions().some(h => h.action === 'reflect')` |
| `reflect is positioned immediately after explain` | unit | Assert `getSecondaryActions()[index('explain') + 1].action === 'reflect'` |
| `reflect has the correct label and sublabel` | unit | Assert label `"Reflect on this passage"` and sublabel `"See how it might land today"` |
| `reflect uses the Lightbulb icon` | unit | Assert `handler.icon === Lightbulb` (imported from lucide-react) |
| `reflect has hasSubView === true` | unit | Assert |
| `reflect.isAvailable returns true for any selection` | unit | Assert |
| `reflect.renderSubView returns a ReflectSubView element` | unit | Render with a mock selection; assert returned element type is ReflectSubView |
| `explain handler is byte-unchanged by this spec` | regression | Compare `explain` handler's label, sublabel, icon, category, hasSubView to hardcoded expected values |

**Expected state after completion:**
- [ ] Registry wires `reflect` immediately after `explain` in `SECONDARY_ACTIONS`
- [ ] `explain` handler unchanged (git diff shows only additions)
- [ ] `pnpm test verseActionRegistry` passes all existing tests + 9 new tests
- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean

---

### Step 7: Sheet-level integration test

**Objective:** Create `frontend/src/components/bible/reader/__tests__/VerseActionSheet.reflect.test.tsx` — end-to-end integration test mirroring `VerseActionSheet.explain.test.tsx`.

**Files to create/modify:**
- `frontend/src/components/bible/reader/__tests__/VerseActionSheet.reflect.test.tsx` — new file

**Details:**

Copy `VerseActionSheet.explain.test.tsx` (246 lines) as the starting point. Apply these swaps:

1. Rename `mockGenerateExplanation` to `mockGenerateReflection`.
2. Update the `vi.mock('@/lib/ai/geminiClient', ...)` factory to export `generateReflection` instead of `generateExplanation`.
3. Rename test descriptions to reference "Reflect" instead of "Explain".
4. Change the action-sheet click target from the "Explain this passage" button to **"Reflect on this passage"** (use `screen.getByText('Reflect on this passage')` or `getByRole('button', { name: /reflect on this passage/i })`).
5. Update assertions:
   - Loading state: "Thinking…" (unchanged — loading component is reused)
   - Success body: assert the mock reflection content appears
   - Disclaimer: assert the exact string `"This reflection was generated by an AI. It's one way this passage might land — not the only way, not the best way, and maybe not your way."`
   - Subtitle: `"Reflection for 1 Corinthians 13:4-7"` (using the test `SELECTION`)
   - Over-limit error copy: `"Please select 20 or fewer verses to reflect on."`

**Keep the mock surface identical** to BB-30's test (Toast, useReducedMotion, useFocusTrap, react-router-dom, @/data/bible, @/lib/bible/crossRefs/loader). These mocks are required for the sheet to render in isolation.

**Test scenarios to cover:**

| Test | Type | Description |
|------|------|-------------|
| `click Reflect → loading state → success → reflection body + disclaimer` | integration | Full happy path |
| `click Reflect → loading → network error → retry → success` | integration | Error recovery via retry button |
| `click Reflect → safety-block error shows safety copy` | integration | Mock throws `GeminiSafetyBlockError` |
| `click Reflect → timeout error shows timeout copy` | integration | Mock throws `GeminiTimeoutError` |
| `click Reflect on 21-verse selection shows over-limit error without calling generateReflection` | integration | Assert `mockGenerateReflection` not called; assert "reflect on" copy |
| `click Reflect shows Lightbulb icon next to the label` | integration | Assert icon element present adjacent to label |
| `click Reflect does NOT trigger any auth modal (logged-out path)` | integration | Render sheet without AuthModalProvider; no auth modal appears |
| `explain and reflect coexist in the sheet` | integration | Assert both buttons visible; clicking one does not close the other's sub-view flow |
| `back button returns from reflect sub-view to main sheet view` | integration | Assert sheet main view is visible again after back |

**Expected state after completion:**
- [ ] `VerseActionSheet.reflect.test.tsx` exists and passes (9 tests)
- [ ] `VerseActionSheet.explain.test.tsx` passes unchanged
- [ ] `pnpm test VerseActionSheet` passes all tests (both files)

---

### Step 8: Prompt test script + execute prompt testing methodology

**Objective:** Create `frontend/scripts/bb31-run-prompt-tests.ts`, run it against the real Gemini API with BB-31's 8 test passages, evaluate outputs against the 10 rules, iterate up to 3 rounds if needed, and save results to `_plans/recon/bb31-prompt-tests.md`.

**Files to create/modify:**
- `frontend/scripts/bb31-run-prompt-tests.ts` — new file
- `_plans/recon/bb31-prompt-tests.md` — new file (append-only across rounds)
- `_plans/recon/bb31-prompt-tests.raw.json` — new file (raw captures from the script)

**Details:**

1. **Copy `frontend/scripts/bb30-run-prompt-tests.ts`** as the starting point. Apply these swaps:
   - Replace inlined `EXPLAIN_PASSAGE_SYSTEM_PROMPT` with BB-31's `REFLECT_PASSAGE_SYSTEM_PROMPT` (copy from `reflectPassagePrompt.ts` verbatim).
   - Replace inlined `buildExplainPassageUserPrompt` with `buildReflectPassageUserPrompt`.
   - Replace `TEST_PASSAGES` with BB-31's 8 passages from spec §"BB-31's 8 test passages":
     1. Psalm 23:1-4 (easy) — bookSlug `psalms`, chapter 23, verses 1-4
     2. Ecclesiastes 3:1-8 (easy) — `ecclesiastes`, 3, 1-8
     3. Matthew 6:25-27 (easy) — `matthew`, 6, 25-27
     4. Romans 8:38-39 (easy) — `romans`, 8, 38-39
     5. Proverbs 13:11 (medium) — `proverbs`, 13, 11-11
     6. 1 Corinthians 13:4-7 (medium) — `1-corinthians`, 13, 4-7
     7. Ephesians 5:22-24 (medium) — `ephesians`, 5, 22-24
     8. Philippians 4:6-7 (medium) — `philippians`, 4, 6-7
   - Update log strings: `[BB-30]` → `[BB-31]`, output path `bb30-prompt-tests.raw.json` → `bb31-prompt-tests.raw.json`.
   - Keep the env-loader, verse-loader, and runner logic identical.

2. **Run `cd frontend && npx tsx scripts/bb31-run-prompt-tests.ts`**. The script reads `VITE_GEMINI_API_KEY` from `.env.local` and calls the real Gemini API with the canonical BB-31 prompt. Outputs are written to `_plans/recon/bb31-prompt-tests.raw.json`.

3. **Create `_plans/recon/bb31-prompt-tests.md`** with the same header format as `bb30-prompt-tests.md` (date, model, API, test executor, pass criterion, evaluation method, script, raw-outputs link).

4. **Round 1 evaluation:** For each of the 8 outputs, write a prose evaluation against all 10 rules in the same format as BB-30's recon file (`Rule X (name): PASS/FAIL — <evidence>`), followed by an `Overall verdict: PASS/FAIL` line. The format is appendix-style, one test per section, verbatim output followed by evaluation.

5. **Pass criterion:** At most 1 of 8 outputs violates any rule. If ≥2 outputs fail, the prompt iterates.

6. **If Round 1 fails:**
   - Identify the dominant failure modes (mood drift, single-possibility drift, missing agency clause, prescribed practices, life-lesson voice, assumed circumstances).
   - Propose targeted prompt edits. The most likely fix is adding more explicit good/bad phrasing examples inside rule 1 or strengthening rule 2 with an "if you can only think of one direction, do not ship" variant.
   - **Update `reflectPassagePrompt.ts`** with the Round 2 prompt.
   - **Re-run the script.**
   - **Append Round 2 to the recon file** — do not overwrite Round 1. The recon file is append-only across rounds.
   - Repeat for Round 3 if needed.

7. **If Round 3 fails:** STOP. Do not ship. Escalate to the user with:
   - A summary of the failure modes that persisted across rounds.
   - The final prompt text.
   - A recommendation (e.g., upgrade model to Flash non-Lite, or narrow the feature's scope to specific passages).

8. **Save the final prompt** — whichever round passed — to `reflectPassagePrompt.ts` as the canonical version. The Step 1 tests will need to be updated if the prompt wording changes between Round 1 and the final round; update those assertions to match the final prompt.

**Auth gating:** N/A — dev-only script, not user-facing.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT skip prompt testing. Spec AC 34 is mandatory before shipping.
- DO NOT mock the Gemini API in this step. The entire point is to run against the real model.
- DO NOT overwrite earlier rounds in the recon file. Append-only.
- DO NOT iterate more than 3 rounds without escalating. Spec AC 38.
- DO NOT update the system prompt without also updating the prompt-structure tests from Step 1. Keep them in sync.
- DO NOT include Joshua 6, Psalm 137:9, Judges 19, or 1 Samuel 15:3 in the test passages. Spec §"No Joshua 6..." explicitly excludes them.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Script runs without throwing when `VITE_GEMINI_API_KEY` is set | manual | Run the script; assert exit code 0 |
| All 8 outputs are captured to the raw JSON file | manual | Inspect `bb31-prompt-tests.raw.json`; assert 8 objects with `output`, `wordCount`, `model`, `capturedAt` fields |
| Recon markdown file evaluates all 8 outputs against all 10 rules | manual | Inspect `bb31-prompt-tests.md`; assert each test section has all 10 rules evaluated |
| At most 1 of 8 outputs violates any rule in the final round | manual | The overall pass criterion — inspect "Overall verdict" lines |
| Every iteration round is preserved in the recon file | manual | Inspect the file has a "Round 1" section; if iterations ran, "Round 2" / "Round 3" sections below it, not replacing Round 1 |

**Expected state after completion:**
- [ ] `bb31-run-prompt-tests.ts` script exists in `frontend/scripts/`
- [ ] `_plans/recon/bb31-prompt-tests.md` exists with ≥1 round of evaluations
- [ ] `_plans/recon/bb31-prompt-tests.raw.json` exists with captured outputs
- [ ] At most 1 of 8 outputs violates any rule in the final round
- [ ] If prompt iterated, the final prompt is committed to `reflectPassagePrompt.ts` and Step 1 tests updated

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create `reflectPassagePrompt.ts` (prompt + user-prompt builder + tests) |
| 2 | 1 | Add `generateReflection` to `geminiClient.ts` (imports from Step 1's module) |
| 3 | 2 | Create `useReflectOnPassage` hook (calls `generateReflection` from Step 2) |
| 4 | — | Create `ReflectSubViewDisclaimer` (no dependencies — pure presentational) |
| 5 | 3, 4 | Create `ReflectSubView` (uses hook from Step 3 + disclaimer from Step 4) |
| 6 | 5 | Wire `reflect` into `verseActionRegistry.ts` (imports `ReflectSubView` from Step 5) |
| 7 | 6 | Sheet-level integration test for reflect flow |
| 8 | 1, 2 | Prompt test script + execute testing (uses Step 1 prompt text + Step 2's SDK pattern reference) |

**Parallelization opportunity:** Steps 1 and 4 are independent of all earlier work and can run in parallel at the start. Step 8 (prompt testing) can start as soon as Step 1 is green — it does not need the UI to exist to exercise the prompt. Consider running Step 8 in parallel with Steps 3-7 to absorb its API-dependent iteration latency.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create the reflection prompt module | [COMPLETE] | 2026-04-10 | Created `reflectPassagePrompt.ts` with `REFLECT_PASSAGE_SYSTEM_PROMPT` (verbatim from spec) + `buildReflectPassageUserPrompt`. 16 tests passing. BB-30 `explainPassagePrompt` byte-unchanged (13 tests still green). |
| 2 | Add `generateReflection` to the Gemini client | [COMPLETE] | 2026-04-10 | Added `generateReflection` fn + `ReflectResult` interface to `geminiClient.ts`. `generateExplanation` byte-unchanged. 43 tests pass (23 existing + 20 new). `tsc --noEmit` clean. Skipped optional `generateWithPrompt` helper refactor per plan — two functions are parallel implementations. |
| 3 | Create the `useReflectOnPassage` hook | [COMPLETE] | 2026-04-10 | Created `useReflectOnPassage.ts` mirroring `useExplainPassage` with identical `ERROR_COPY`, `classifyError`, `queueMicrotask` deferral, `isMountedRef` guard, per-effect `AbortController`, StrictMode correctness. 15 hook tests pass; BB-30's 16 hook tests still green. |
| 4 | Create `ReflectSubViewDisclaimer` component | [COMPLETE] | 2026-04-10 | Created `ReflectSubViewDisclaimer.tsx` with locked disclaimer text. 6 tests including explicit "maybe not your way" clause assertion. `ExplainSubViewDisclaimer` byte-unchanged. |
| 5 | Create `ReflectSubView` component | [COMPLETE] | 2026-04-10 | Created `ReflectSubView.tsx` mirroring `ExplainSubView` with `useReflectOnPassage`, `ReflectSubViewDisclaimer`, "Reflection for {ref}" subtitle, and "reflect on" over-limit copy. Reuses `ExplainSubViewLoading`/`ExplainSubViewError` directly. 19 tests pass, including auth/localStorage absence assertions. Grep confirms no `useAuth` / `useAuthModal` / `localStorage` imports. |
| 6 | Wire `reflect` into the verse action registry | [COMPLETE] | 2026-04-10 | Added `Lightbulb` import + `ReflectSubView` import + `reflect` handler + inserted into `SECONDARY_ACTIONS` immediately after `explain`. Added `'reflect'` to the `VerseAction` literal union in `@/types/verse-actions`. 8 new tests including icon identity (Lightbulb, not Sparkles/Brain), position (after explain, before memorize), and a regression guard for `explain`. Updated 3 pre-existing assertions forced by the insertion (total count 12→13, explain neighbor memorize→reflect, reflect added to stub-filter exclusion list). All 60 registry tests pass. |
| 7 | Sheet-level integration test | [COMPLETE] | 2026-04-10 | Created `VerseActionSheet.reflect.test.tsx` mirroring the explain integration test: happy path, network/safety/timeout errors, retry, 20-verse cap, Explain+Reflect coexistence, "generateReflection fires not generateExplanation" assertion. 10 tests pass; BB-30's 7 still green. `tsc --noEmit` clean. Comprehensive 522-test sweep across lib/ai + hooks/bible + components/bible/reader + verseActionRegistry all green. |
| 8 | Prompt test script + execute prompt testing methodology | [COMPLETE] | 2026-04-11 | Created canonical `frontend/scripts/bb31-run-prompt-tests.ts` with BB-31's 8 spec-locked passages and the verbatim `REFLECT_PASSAGE_SYSTEM_PROMPT`. Loader kept byte-parallel to BB-30's script. Run completed across two sessions (daily free-tier quota ceiling hit mid-run after ~15 successful calls between BB-30 and BB-31; recovered after GCP project was upgraded to paid tier). All 8 reflections captured to `_plans/recon/bb31-prompt-tests.raw.json` (254, 194, 212, 235, 185, 207, 168, 167 words). Full Round 1 prose evaluation written to `_plans/recon/bb31-prompt-tests.md` with per-rule prose judgments for each of 8 outputs. **Round 1 verdict: PASS cleanly — 0 of 8 rule violations**, including strong handling of the 4 stress-test passages (Matthew 6:25-27 anxiety, Proverbs 13:11 poverty, 1 Corinthians 13:4-7 wedding-cliché, Ephesians 5:22-24 moral difficulty, Philippians 4:6-7 anxiety-weaponization). `reflectPassagePrompt.ts` is **locked at v1** — no prompt modifications made. Ad-hoc retry scripts (`bb31-retry-missing.ts`, `bb31-retry-1cor.ts`) created to recover from quota interruption and deleted after Round 1 completion; only the canonical `bb31-run-prompt-tests.ts` remains. |
