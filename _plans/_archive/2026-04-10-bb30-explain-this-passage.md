# Implementation Plan: BB-30 Explain This Passage (Gemini Integration)

**Spec:** `_specs/bb-30-explain-this-passage.md`
**Date:** 2026-04-10
**Branch:** `bible-redesign` (stay on current branch — do NOT create a new branch, do NOT merge)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05 — fresh)
**Recon Report:** N/A — backend/content feature, visual surface is fully internal to the existing `VerseActionSheet`
**Master Spec Plan:** N/A — standalone spec in the Bible Redesign wave (first of the BB-30 → BB-31 → BB-32 AI infra arc)

---

## Architecture Context

**Bible reader action sheet infrastructure (all already built):**

- `frontend/src/components/bible/reader/VerseActionSheet.tsx` — the unified bottom sheet / centered modal. Provides:
  - Sub-view navigation via local `subView` state
  - Sub-view chrome: back button + title (from `handler.label`) + close X at lines 300–312
  - Calls `handler.renderSubView({ selection, onBack, context })` at line 315
  - `context` exposes `showToast`, `closeSheet`, `navigate`
- `frontend/src/lib/bible/verseActionRegistry.ts` — registry with `PRIMARY_ACTIONS` and `SECONDARY_ACTIONS` arrays. The explain action already exists at line 358–368 with a `stubSubView('AI explain ships in BB-30')` placeholder. BB-30 replaces that stub `renderSubView` with a real `ExplainSubView` mount. Display order already correct (between Cross-references and Memorize).
- `frontend/src/components/bible/reader/CrossRefsSubView.tsx` — **canonical pattern to follow.** Lines 240–318 show the component body starts with `<div>` (no header JSX, no back button, no title, no close X). Sheet chrome comes from `VerseActionSheet`. Structure: subtitle div → context strip div → divider → content → footer. **Copy this structure.**
- `frontend/src/components/bible/reader/NoteEditorSubView.tsx` — **anti-pattern.** Renders its own header + back button on top of the sheet's chrome, causing a double-header bug. Do NOT follow this pattern.
- `frontend/src/types/verse-actions.ts` — defines `VerseSelection`, `VerseActionHandler`, `VerseActionContext`. `renderSubView` signature: `(props: { selection; onBack; context? }) => React.ReactNode`. The `'explain'` literal is already in the `VerseAction` union.

**Environment wiring (already committed in commit `d6b8054`):**

- `frontend/src/lib/env.ts` — exports `requireGeminiApiKey()` (throws with a friendly error message pointing at `frontend/.env.local`) and `isGeminiApiKeyConfigured()`. Reads `import.meta.env.VITE_GEMINI_API_KEY` internally — that module is the only legitimate reader of the raw env var.
- `frontend/.env.example` — already documents `VITE_GEMINI_API_KEY`. User has set it in `frontend/.env.local` (confirmed in spec pre-execution checklist).

**Google Gen AI SDK (verified against live docs via Context7):**

- **Package name: `@google/genai`** — verified. This is the current canonical package. Install with `pnpm add @google/genai` inside `frontend/`.
- **Client class: `GoogleGenAI`**, browser-compatible (same constructor for Node and browser): `new GoogleGenAI({ apiKey })`.
- **Request API:** `ai.models.generateContent({ model, contents, config })`.
- **System instruction is in `config.systemInstruction`** (type `ContentUnion`, accepts a string) — NOT prepended to `contents`. This is the Gemini-specific detail called out in the spec.
- **Config options supported:** `temperature`, `maxOutputTokens`, `safetySettings`, `abortSignal`, `systemInstruction` — all verified in `GenerateContentConfig` interface.
- **Response shape:** `response.text` (convenience getter for concatenated candidate text), `response.candidates[]` (each has `content.parts[]`, `finishReason`, `safetyRatings[]`), `response.promptFeedback?.blockReason` (optional — set if the prompt itself was blocked).
- **Safety block detection:** check `response.promptFeedback?.blockReason` first (prompt-level block), then check `response.candidates?.[0]?.finishReason === 'SAFETY'` (output-level block), then check that `response.text` is a non-empty string. If any block indicator is present or `text` is empty, treat as a safety block.
- **Timeout support:** the SDK's `generateContent` accepts `config.abortSignal`. Use `AbortSignal.timeout(30_000)` to enforce the 30-second budget.

**Model string (verified):**

- `gemini-2.5-flash-lite` — the spec's chosen model. Google's docs examples in Context7 show `gemini-2.5-flash` as the generic example, but Flash-Lite is a documented model in the same 2.5 family. The model string is passed as a plain string to `generateContent({ model: 'gemini-2.5-flash-lite', ... })`. If at runtime Google rejects the string with a 404, the `GeminiApiError` path handles it and the user sees the generic "temporarily unavailable" fallback.

**Test patterns (from `frontend/src/components/bible/reader/__tests__/CrossRefsSubView.test.tsx`):**

- Vitest + React Testing Library + jsdom. Mock `react-router-dom`'s `useNavigate` at the top of the file. Mock downstream modules via `vi.mock`. No provider wrapping needed for sub-view components tested in isolation (they accept all state via props).
- Gemini SDK mocking pattern: `vi.mock('@google/genai', () => ({ GoogleGenAI: vi.fn(() => ({ models: { generateContent: mockGenerateContent } })) }))` at the top of `geminiClient.test.ts`. Individual tests swap `mockGenerateContent.mockResolvedValue(...)` or `mockRejectedValue(...)` per case.

**Auth gating pattern:**

- BB-30 has **zero auth gates** (spec §Auth Gating table). No `useAuth()` calls, no `useAuthModal()` calls, no localStorage reads, no localStorage writes. `verseActionRegistry` already has `isAvailable: () => true` for the stubbed `explain` action — preserved.

**Shared data models from master plan:** N/A — BB-30 introduces no persistent data.

**Cross-spec dependencies:**

- **BB-31** (next) will reuse the `GoogleGenAI` client, the lazy-init pattern, the typed error classes, the `ExplainSubView` sub-view pattern, and the disclaimer component with different copy.
- **BB-32** (after BB-31) will add caching and rate limiting under `generateExplanation` — the current architecture leaves a clean seam for that (a single entry function).

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|---|---|---|---|
| Tap "Explain this passage" action | No auth gate — logged-out identical to logged-in | Step 8 | `isAvailable: () => true` — no `useAuth` |
| Tap retry on an error state | No auth gate | Step 6 | No auth check in component |
| Tap back / close the sub-view | No auth gate | Step 5 | No auth check in component |

**Zero auth gates verified.** No `useAuth`, `useAuthModal`, or localStorage interactions in any BB-30 component, hook, or module.

---

## Design System Values (for UI steps)

All values sourced from `_plans/recon/design-system.md` (2026-04-05) and the existing `CrossRefsSubView.tsx` / `VerseActionSheet.tsx` code (which IS the current design system for this surface).

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| VerseActionSheet panel bg | `background` | `rgba(15, 10, 30, 0.95)` with `backdropFilter: blur(16px)` | `VerseActionSheet.tsx:280` |
| Sub-view root wrapper | element | `<div>` (no header JSX, no back button, no title, no close X) | `CrossRefsSubView.tsx:240` |
| Sub-view subtitle row | className | `px-4 py-1.5` with `<span className="text-xs text-white/50">` | `CrossRefsSubView.tsx:243-245` |
| Sub-view context strip | className | `px-4 py-2` wrapping `<p className="line-clamp-2 text-sm text-white/40">` | `CrossRefsSubView.tsx:248-252` (pattern; BB-30 strips a larger treatment — see below) |
| Sub-view divider | className | `border-t border-white/[0.08]` | `CrossRefsSubView.tsx:254` |
| Explain context strip (BB-30 variant) | className | `mx-4 my-2 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` | Tier 2 scripture callout pattern from `09-design-system.md` — scripture should stand out from body |
| Explain context strip reference line | className | `font-serif text-sm font-semibold text-white` | matches header at `VerseActionSheet.tsx:333` |
| Explain context strip verse text | className | `mt-1 font-serif text-sm text-white/80 leading-relaxed` | Lora serif is the scripture font (09-design-system.md § Typography) |
| Loading state wrapper | className | `flex flex-col items-center justify-center px-6 py-12 text-center` | pattern from `CrossRefsSubView.tsx:42` |
| Loading skeleton bars | className | `h-3 w-full animate-pulse rounded bg-white/[0.08]` | `CrossRefsSubView.tsx:30` |
| Loading "Thinking..." label | className | `text-sm text-white/50` | CrossRefsSubView subtle-label pattern |
| Explanation body container | className | `px-4 py-3 space-y-4` | standard sub-view body spacing |
| Explanation body text | className | `whitespace-pre-wrap text-[15px] leading-[1.7] text-white/90` | reader body text defaults, respects paragraph breaks |
| Disclaimer container | className | `border-t border-white/[0.08] px-4 py-3` | mirrors `VerseActionSheet.tsx:441` footer treatment |
| Disclaimer text | className | `text-xs text-white/40 leading-relaxed` | matches `VerseActionSheet.tsx:442` footer label, slightly muted |
| Error state container | className | `flex flex-col items-center justify-center px-6 py-12 text-center` | matches EmptyState in CrossRefs |
| Error icon | element | `<AlertCircle className="mb-4 h-10 w-10 text-white/20" />` (Lucide) | matches `Link2` placement at `CrossRefsSubView.tsx:43` |
| Error title | className | `text-sm font-medium text-white` | matches `CrossRefsSubView.tsx:44` |
| Error body | className | `mt-1 text-xs text-white/50 max-w-xs` | matches `CrossRefsSubView.tsx:45-47` |
| Retry button | className | `mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.14]` | 44px tap target (04-frontend-standards.md), subtle white pill (not primary white pill — sub-view is not a main-action surface) |
| Explain action registry icon | Lucide | `Brain` | already set at `verseActionRegistry.ts:362` |
| Explain action label | string | `'Explain this passage'` | already set at `verseActionRegistry.ts:360` |
| Explain action sublabel | string | `'Understand the context'` | already set at `verseActionRegistry.ts:361` |

This table is the executor's copy-paste reference for all styling. **Zero raw hex values anywhere** (spec acceptance criterion 38). All colors use Tailwind tokens or CSS variables.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- **ExplainSubView follows `CrossRefsSubView`, not `NoteEditorSubView`.** The component body MUST start with `<div>` content — no back button, no title row, no close X. The sheet chrome is rendered by `VerseActionSheet` around the sub-view. Rendering your own chrome causes the double-header bug.
- **Worship Room uses the `FrostedCard` component family for frosted glass.** Inside the VerseActionSheet sub-view, however, we do NOT use `FrostedCard` — the sheet itself provides the frosted backdrop (`rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)`). Sub-view content sits directly on that backdrop. Follow `CrossRefsSubView` exactly.
- **Tier 2 scripture callout** is `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3`. Use this for the Explain context strip to distinguish the passage from the generated explanation. This is the canonical scripture callout from `09-design-system.md`.
- **Body text is `text-white/90`** (slightly below pure white so scripture at `text-white` reads brighter). Leading `1.7`. Paragraph breaks preserved via `whitespace-pre-wrap` (Gemini output has `\n\n` between paragraphs).
- **Zero raw hex values.** Acceptance criterion 38. Use Tailwind tokens (`text-white`, `text-white/90`, `border-white/[0.08]`, `bg-white/[0.04]`, `border-l-primary/60`). The sole exception is the existing panel background `rgba(15, 10, 30, 0.95)` on the parent sheet — not touched by BB-30.
- **Scripture uses Lora serif** (`font-serif`). Explanation body uses the default sans (Inter) — it's prose, not scripture.
- **44px minimum tap targets** on retry/close buttons. Acceptance criterion 35.
- **`animate-pulse`** for the loading skeleton. Respects `prefers-reduced-motion` because Tailwind's animate-pulse is GPU-composited but users with reduced motion should get a simpler loading indicator. Gate the skeleton behind `useReducedMotion()` — if reduced motion, render a static "Thinking…" label instead.
- **Do NOT use `animate-glow-pulse`** (deprecated) or cyan borders (deprecated). The sub-view has no glow treatment at all — it's a calm reading surface.
- **Sub-view layout matches `CrossRefsSubView` vertical rhythm:** subtitle (px-4 py-1.5) → context strip (px-4 py-2 or mx-4 my-2 callout) → divider → content (px-4 py-3) → divider → footer (px-4 py-3). No surprise spacing.
- **Icon from Lucide: `Brain`** for the registry entry (already set), `AlertCircle` for error states, `RotateCw` for retry button. No custom SVGs.
- **Plain text only for Gemini output.** No markdown parsing, no HTML rendering, no `dangerouslySetInnerHTML`. Use `{content}` inside a `<p>` or `<div>` with `whitespace-pre-wrap`. This is the mandatory project rule from `02-security.md`.
- **Focus return:** when the sub-view closes, `VerseActionSheet` already restores focus to the trigger button via `subViewTriggerRef.current?.focus()` (line 193). BB-30 does not need to add any focus restoration logic.

**Source:** Design system recon 2026-04-05, `.claude/rules/09-design-system.md` (FrostedCard Tier System, Deprecated Patterns table), existing `CrossRefsSubView.tsx` code, BB-22/BB-23/BB-24/BB-25/BB-26 recent plans (no Gemini-specific deviations to pull in — BB-30 is the first LLM feature).

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step.

---

## Shared Data Models (from Master Plan)

N/A — BB-30 introduces zero persistent data.

```typescript
// New types defined by this spec (all in-memory, request-scoped):

export interface ExplainResult {
  content: string
  model: string // 'gemini-2.5-flash-lite' — identifies which model produced the result
}

// Typed error classes (frontend/src/lib/ai/errors.ts):
export class GeminiNetworkError extends Error {}
export class GeminiApiError extends Error {}
export class GeminiSafetyBlockError extends Error {}
export class GeminiTimeoutError extends Error {}
export class GeminiKeyMissingError extends Error {}
```

**localStorage keys this spec touches:** none. BB-30 introduces zero new `wr_*` or `bible:*` keys. No entries added to `11-local-storage-keys.md`.

---

## Responsive Structure

The `ExplainSubView` inherits its container dimensions from `VerseActionSheet`. BB-30 does not change the sheet container — it renders content inside the existing sub-view slot.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | VerseActionSheet is a full-width bottom sheet (`inset-x-0 bottom-0 max-h-[85vh]`). ExplainSubView content stacks: context strip → body → disclaimer. `px-4` horizontal padding. Retry button 44px min height. |
| Tablet | 768px | VerseActionSheet becomes 440px wide, centered, 40px from bottom (`sm:w-[440px] sm:bottom-10`). ExplainSubView content wraps at container width (~408px inside padding). |
| Desktop | 1440px | Same 440px centered modal. Explanation body wraps at ~65ch effective (natural constraint from the 440px sheet). No extra max-width needed. |

**Custom breakpoints:** none. The sheet uses Tailwind's `sm:` breakpoint (640px) for the mobile-to-centered transition. Spec says the sheet becomes "right-side flyout or modal on larger screens" — current implementation is a centered modal, not a right-side flyout. BB-30 does not change that.

**Reduced motion:** the loading skeleton uses `animate-pulse`. When `useReducedMotion()` returns `true`, render a static "Thinking…" label instead of the pulsing skeleton bars.

---

## Inline Element Position Expectations

**N/A — no inline-row layouts in this feature.**

The ExplainSubView is a vertically stacked sub-view (subtitle, context strip, divider, loading/content/error, disclaimer). No chip rows, no button groups, no label + input pairs sharing a row. The retry button on the error state is a standalone element centered in its own row.

---

## Vertical Rhythm

Expected spacing between adjacent sections inside the ExplainSubView (matches `CrossRefsSubView` vertical rhythm):

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Sheet chrome (back/title/close) → sub-view subtitle | 0px (border-t divider between them, rendered by sheet) | `VerseActionSheet.tsx:313` |
| Subtitle row → context strip | 0px (`py-1.5` on subtitle + `py-2` on context strip = natural stack) | `CrossRefsSubView.tsx:243-252` |
| Context strip → divider | 0px | `CrossRefsSubView.tsx:254` |
| Divider → loading/content/error | 0px (divider has its own border, content starts immediately) | `CrossRefsSubView.tsx:254,287` |
| Content → disclaimer divider | 0px (last content block has `py-3`, divider has its own border) | matches footer treatment at `VerseActionSheet.tsx:441` |
| Disclaimer divider → disclaimer text | 0px (padding is on the disclaimer container itself) | same pattern |

`/verify-with-playwright` compares these in Step 6e. Any gap difference >5px is flagged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] `frontend/src/lib/env.ts` exports `requireGeminiApiKey()` and `isGeminiApiKeyConfigured()` (verified — foundation task committed in `d6b8054`)
- [ ] `frontend/.env.local` contains `VITE_GEMINI_API_KEY` (user-confirmed in spec pre-execution checklist)
- [ ] `frontend/.env.local` is gitignored (verified — root `.gitignore` has `.env.local` and `*.local`)
- [ ] Gemini SDK package `@google/genai` is verified as current (verified via Context7 live docs, 2026-04-10)
- [ ] Model string `gemini-2.5-flash-lite` is still current (verified via Context7 — part of the 2.5 Flash family, Flash-Lite is documented)
- [ ] System instruction is routed through `config.systemInstruction` in `generateContent` (verified — `GenerateContentConfig.systemInstruction: ContentUnion`)
- [ ] All auth-gated actions from the spec are accounted for — **zero gates, zero checks required**
- [ ] Design system values are verified against `_plans/recon/design-system.md` and existing sub-view code
- [ ] All [UNVERIFIED] values are flagged with verification methods — **none in this plan**
- [ ] No deprecated patterns used — **verified (no `Caveat`, no `BackgroundSquiggle`, no `GlowBackground` on sub-view, no `animate-glow-pulse`, no cyan border, no italic Lora prose, no `line-clamp-3` on card descriptions)**
- [ ] Prompt testing (Step 10) will be run against the 8 test passages before the UI is wired to real Gemini — results saved to `_plans/recon/bb30-prompt-tests.md`

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Lazy SDK init | Initialize `GoogleGenAI` on first `generateExplanation` call, memoized in a module-level `let client: GoogleGenAI \| null = null` | Spec requirement — users without a key get a clean error, not a crash at module load |
| Timeout enforcement | `AbortSignal.timeout(30_000)` passed in `config.abortSignal` | SDK natively supports `abortSignal` in `GenerateContentConfig` — no custom Promise.race needed |
| Safety block detection | Check `response.promptFeedback?.blockReason`, then `candidates?.[0]?.finishReason === 'SAFETY'`, then empty `response.text` | Gemini returns safety blocks in the response payload, not as an error status. Belt-and-suspenders check covers prompt-level AND output-level blocks |
| Retry logic | None — user retries manually via error state button | Spec requirement — auto-retry masks bugs |
| Caching | None — every request hits Gemini fresh | Spec requirement — BB-32 adds caching |
| Streaming | None — full response awaited before render | Spec explicit deferral to a future polish spec |
| Multi-verse range cap | Client-side cap at 20 verses; render error "Please select 20 or fewer verses to explain" | Spec edge case §"user taps on a range spanning multiple verses". BB-6 action sheet may already cap this, so the edge case may be unreachable in practice — the cap is defensive |
| Plain text rendering | `whitespace-pre-wrap` on the content div. No markdown, no HTML, no `dangerouslySetInnerHTML` | Mandatory project rule from `02-security.md` |
| Disclaimer dismissibility | Non-dismissible. Always rendered on every successful explanation. Not shown on error states. | Spec explicit requirement |
| Error on key missing | `GeminiKeyMissingError` caught by hook → UI shows the generic "temporarily unavailable" message. `console.error` logs the specific error for developers. | Spec explicit — user sees friendly error, developer sees fix in console |
| `ExplainResult` shape | Single shape `{ content: string, model: string }` — no discriminated union, no `source` field | Spec explicit acceptance criterion 29 |
| Abort on unmount | Hook passes an `AbortController` that is aborted in the cleanup function. Combined with `AbortSignal.timeout` via `AbortSignal.any([...])` | Prevents state updates on unmounted components + enforces timeout |
| Character budget for user prompt | The verse text is passed verbatim. A 20-verse range is well under the 500-input-token estimate in the spec. No truncation. | Spec accepts 20-verse cap; within budget |
| Loading skeleton vs reduced motion | Static "Thinking…" label if `useReducedMotion()` returns true | Accessibility — spec acceptance criterion 37 |
| Test prompt testing methodology | Prompt testing (Step 10) is a **manual** step executed via a dedicated dev-only script `scripts/bb30-run-prompt-tests.ts` that calls the real `generateExplanation` 8 times and writes the raw outputs to `_plans/recon/bb30-prompt-tests.md`. Must be run by the developer before wiring the hook to real Gemini. | Spec explicit — this is content work, not code work. Results are human-reviewed. |

---

## Implementation Steps

### Step 1: Install `@google/genai` and create `frontend/src/lib/ai/` directory scaffold

**Objective:** Install the verified SDK package and create the empty module files that the rest of the plan will populate. No exports yet.

**Files to create/modify:**

- `frontend/package.json` — add `@google/genai` dependency
- `frontend/pnpm-lock.yaml` — regenerated automatically
- `frontend/src/lib/ai/errors.ts` — create empty file (populated in Step 2)
- `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` — create empty file (populated in Step 3)
- `frontend/src/lib/ai/geminiClient.ts` — create empty file (populated in Step 4)

**Details:**

Run `cd frontend && pnpm add @google/genai`. The package should install cleanly — it's a mature Google-maintained SDK. Verify the installed version in `package.json` is `^1.x.x` or newer (the `GoogleGenAI` class-based API shipped in 1.0).

After install, create the three empty files as stubs. The directory tree after this step:

```
frontend/src/lib/ai/
├── errors.ts             (empty stub)
├── geminiClient.ts       (empty stub)
└── prompts/
    └── explainPassagePrompt.ts   (empty stub)
```

**Auth gating (if applicable):** N/A — not a user-facing step.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT install `@google/generative-ai` — that's the old, deprecated package. The current package is `@google/genai` (verified via Context7).
- Do NOT install any other Google AI package (`@google-ai/generativelanguage`, etc.) — those are different SDKs for different APIs.
- Do NOT add the package to `devDependencies` — it's a runtime dependency.
- Do NOT add `@types/google-genai` — the SDK ships its own TypeScript definitions.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm install` completes without error | manual | Verify the dependency resolves |
| `pnpm build` passes after install | manual | Verify the SDK doesn't break the Vite build (it should — it's browser-compatible) |
| Files exist at expected paths | manual | `ls frontend/src/lib/ai/` shows all three files |

**Expected state after completion:**

- [ ] `@google/genai` listed in `frontend/package.json` dependencies
- [ ] `frontend/pnpm-lock.yaml` updated
- [ ] `frontend/src/lib/ai/errors.ts` exists (empty)
- [ ] `frontend/src/lib/ai/geminiClient.ts` exists (empty)
- [ ] `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` exists (empty)
- [ ] `pnpm build` passes

---

### Step 2: Implement typed error classes in `frontend/src/lib/ai/errors.ts`

**Objective:** Define the five typed error classes that the Gemini client throws. These are consumed by the `useExplainPassage` hook and mapped to user-facing error states.

**Files to create/modify:**

- `frontend/src/lib/ai/errors.ts` — populate with error class exports
- `frontend/src/lib/ai/__tests__/errors.test.ts` — create with basic construction + `instanceof` tests

**Details:**

```typescript
// frontend/src/lib/ai/errors.ts

/**
 * Thrown when the SDK or underlying fetch failed before reaching the Gemini API.
 * User message: "Couldn't load an explanation right now. Check your connection and try again."
 */
export class GeminiNetworkError extends Error {
  constructor(message = 'Gemini request failed to reach the API', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GeminiNetworkError'
  }
}

/**
 * Thrown when the Gemini API returned a non-success response
 * (invalid key, quota exceeded, service down, 5xx).
 * User message: "This feature is temporarily unavailable. Try again in a few minutes."
 */
export class GeminiApiError extends Error {
  constructor(message = 'Gemini API returned an error response', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GeminiApiError'
  }
}

/**
 * Thrown when Gemini's safety layer blocked the response (prompt-level OR output-level).
 * User message: "This passage is too difficult for our AI helper to explain well.
 *                Consider reading a scholarly commentary or asking a trusted teacher."
 */
export class GeminiSafetyBlockError extends Error {
  constructor(message = 'Gemini blocked the response due to safety filters', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GeminiSafetyBlockError'
  }
}

/**
 * Thrown when the request took longer than 30 seconds.
 * User message: "The request took too long. Try again in a moment."
 */
export class GeminiTimeoutError extends Error {
  constructor(message = 'Gemini request timed out after 30 seconds', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GeminiTimeoutError'
  }
}

/**
 * Thrown when requireGeminiApiKey() threw because VITE_GEMINI_API_KEY is not set.
 * Logged to console with a clear message pointing at frontend/.env.local.
 * Shown to the user as the generic "temporarily unavailable" message.
 */
export class GeminiKeyMissingError extends Error {
  constructor(message = 'Gemini API key is not configured (check frontend/.env.local)', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GeminiKeyMissingError'
  }
}
```

Each class uses the `Error` constructor's `cause` option so the original SDK error is preserved in the error chain.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT add fields beyond `message` and `cause`. No `retryable` flag, no `statusCode`, no `userMessage`. The user-facing message is mapped in the UI layer, not in the error class.
- Do NOT throw raw strings or plain Error objects from the Gemini client — always use one of these typed classes so the hook can `instanceof`-check them.
- Do NOT export a union type. The hook uses `instanceof` checks, not type discrimination.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Each error class has correct `name` | unit | `new GeminiNetworkError().name === 'GeminiNetworkError'` etc. for all five |
| Each error class instantiates with default message | unit | `new GeminiNetworkError().message` is non-empty |
| Each error class accepts custom message | unit | `new GeminiApiError('custom').message === 'custom'` |
| Each error class preserves `cause` | unit | `new GeminiNetworkError('m', { cause: originalErr }).cause === originalErr` |
| Each error class is `instanceof Error` | unit | `new GeminiKeyMissingError() instanceof Error === true` |

5 test cases total (one per class for the round-trip), optionally grouped via `describe.each`.

**Expected state after completion:**

- [ ] `errors.ts` exports all 5 typed error classes
- [ ] `errors.test.ts` passes with 5+ test cases
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes

---

### Step 3: Implement the system prompt and user prompt template in `explainPassagePrompt.ts`

**Objective:** Store the system prompt text and the user prompt builder function as pure, testable exports. This is content work — the text is the product (spec §"The prompt is the product").

**Files to create/modify:**

- `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` — populate with prompt exports
- `frontend/src/lib/ai/prompts/__tests__/explainPassagePrompt.test.ts` — create with structural tests

**Details:**

```typescript
// frontend/src/lib/ai/prompts/explainPassagePrompt.ts

/**
 * System prompt for BB-30 "Explain this passage" — establishes the scholar-not-pastor
 * voice with explicit rules against proselytizing, prescription, and pastoral ventriloquism.
 *
 * DO NOT "improve" this text during implementation. It is the result of deliberate content
 * work and the 8-case prompt testing methodology (see _plans/recon/bb30-prompt-tests.md).
 * Any iteration on this text must go through the prompt testing process documented in the spec.
 */
export const EXPLAIN_PASSAGE_SYSTEM_PROMPT = `You are a thoughtful biblical scholar helping a user understand a scripture passage they're reading in the World English Bible. Your explanations are grounded in scholarship — historical context, literary genre, linguistic observations, and honest acknowledgment of interpretive difficulty.

You are not a pastor. You are not a preacher. You do not proselytize. You do not assume the user is a Christian or tell them what they should believe. You serve users across the full spectrum of religious backgrounds, including those deconstructing their faith and those who have been hurt by religious communities.

Your explanations follow these rules:

1. Lead with context. What kind of text is this (narrative, poetry, letter, law, prophecy)? Who wrote it, when, and to whom? What was happening in the world of the text?

2. Then explain what the passage is doing. What is the author's argument, story, or concern? What literary or rhetorical moves are being made? What does the passage mean in its own context, before we ask what it means for us?

3. Acknowledge uncertainty honestly. If scholars disagree about a passage, say so. If the Hebrew or Greek is ambiguous, say so. If the passage has been read in multiple ways across Christian traditions, say so. Do not paper over difficulty with confident platitudes.

4. Do not prescribe application. Do not tell the user what to do, feel, or believe. Explain what the text says and let the user decide what to do with it. Do not end with "so what does this mean for you" or any variant.

5. Avoid triumphalism. Do not say "this proves," "this shows us," "this means we must," or similar. Use tentative, scholarly language: "scholars suggest," "this passage likely," "one reading of this is."

6. Stay in the text. Do not bring in external theological doctrines the passage doesn't directly address. Do not invoke systematic theology categories unless the passage explicitly engages them.

7. Acknowledge hard passages honestly. If the passage depicts violence, slavery, patriarchy, or other troubling material, acknowledge it plainly. Do not defend, explain away, or spiritualize. Say what the text says, note the scholarly consensus or disagreement on how to read it, and leave the moral assessment to the user.

8. Be restrained in length. Explanations should be 200-400 words, not 800. Users are reading on a phone screen. Every sentence earns its place.

9. Never use the phrases "God wants you to," "God is telling you," "the Lord is saying to your heart," "God is calling you to," or any variant that speaks for God to the user. These phrases are presumptuous and violate the user's agency.

10. Never recommend prayer, church attendance, further study, or spiritual practices unless the user specifically asks about these topics. The user asked for explanation, not instruction.

Respond with the explanation text only. Do not include a greeting, a summary header, a closing question, or any framing text. Just the explanation.`

/**
 * Build the user prompt for a specific passage. Reference and verse text are
 * interpolated into a fixed template.
 */
export function buildExplainPassageUserPrompt(reference: string, verseText: string): string {
  return `Explain this passage from the World English Bible:

${reference}
${verseText}

Give me the context, what the passage is doing in its own setting, and any interpretive difficulties an honest reader should know about.`
}
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT "improve" the system prompt text.** The spec is explicit: `(do not "improve" this during planning)`. If a rule seems redundant or wordy, leave it — Flash-Lite needs the redundancy.
- **Do NOT collapse the numbered rules.** Each rule targets a specific Flash-Lite failure mode.
- **Do NOT remove rule 9's list of forbidden phrases.** Naming the phrases is what makes them stick.
- **Do NOT prepend the system prompt to the user prompt.** That is the Gemini-specific anti-pattern called out by the spec. The system prompt goes through `config.systemInstruction` in Step 4.
- **Do NOT add verse citations or WEB attribution to the user prompt template.** The template is the template — any attribution is the LLM's job (and the prompt forbids it anyway).
- **Do NOT add extra instructions based on the user's mood, time of day, or any other runtime context.** The prompt is uniform across every user, every passage, every time. No personalization.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| System prompt exports as a non-empty string | unit | `EXPLAIN_PASSAGE_SYSTEM_PROMPT.length > 500` |
| System prompt contains forbidden-phrase list | unit | `EXPLAIN_PASSAGE_SYSTEM_PROMPT.includes('God is telling you')` etc. |
| System prompt contains rule 4 (no application) | unit | `EXPLAIN_PASSAGE_SYSTEM_PROMPT.includes('Do not prescribe application')` |
| System prompt contains rule 7 (hard passages) | unit | `EXPLAIN_PASSAGE_SYSTEM_PROMPT.includes('Acknowledge hard passages')` |
| System prompt contains 200-400 word rule | unit | `EXPLAIN_PASSAGE_SYSTEM_PROMPT.includes('200-400 words')` |
| `buildExplainPassageUserPrompt` interpolates reference | unit | output includes `'1 Corinthians 13:4-7'` |
| `buildExplainPassageUserPrompt` interpolates verse text | unit | output includes the passed verse text verbatim |
| `buildExplainPassageUserPrompt` has the stable prefix | unit | output starts with `'Explain this passage from the World English Bible:'` |
| `buildExplainPassageUserPrompt` has the stable suffix | unit | output ends with the question sentence |

~9 test cases — structural only, no LLM behavior tested here.

**Expected state after completion:**

- [ ] `explainPassagePrompt.ts` exports `EXPLAIN_PASSAGE_SYSTEM_PROMPT` and `buildExplainPassageUserPrompt`
- [ ] `explainPassagePrompt.test.ts` passes with 9+ test cases
- [ ] `pnpm lint` passes
- [ ] The exact spec text is preserved verbatim (diff the file against the spec §"The system prompt" and §"The user prompt template" sections)

---

### Step 4: Implement the Gemini client in `geminiClient.ts`

**Objective:** Implement `generateExplanation(reference, verseText): Promise<ExplainResult>`. Lazy SDK init. Route system prompt through `config.systemInstruction`. Map SDK failures to typed errors. Detect safety blocks.

**Files to create/modify:**

- `frontend/src/lib/ai/geminiClient.ts` — populate with the client module
- `frontend/src/lib/ai/__tests__/geminiClient.test.ts` — create with unit tests mocking `@google/genai`

**Details:**

```typescript
// frontend/src/lib/ai/geminiClient.ts

import { GoogleGenAI } from '@google/genai'
import { requireGeminiApiKey } from '@/lib/env'
import {
  EXPLAIN_PASSAGE_SYSTEM_PROMPT,
  buildExplainPassageUserPrompt,
} from '@/lib/ai/prompts/explainPassagePrompt'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
} from '@/lib/ai/errors'

/**
 * The model string for BB-30 is hardcoded here, not passed by callers, because every
 * request in the feature uses the same model. Rationale for this specific model:
 *
 * - gemini-2.5-flash-lite is priced at ~$0.10/M input, ~$0.40/M output (spec §LLM provider).
 *   Each request costs ~$0.0002; a thousand requests ~$0.20. Production scaling is not a
 *   meaningful cost concern for a free, non-commercial app.
 * - gemini-2.0-flash-lite is deprecated (Google will shut it down on June 1, 2026).
 * - gemini-3.1-flash-lite is in preview — API contracts may change.
 * - gemini-2.5-flash and 2.5-pro are 3-6x more expensive; Flash-Lite is adequate for this task.
 *
 * See https://ai.google.dev/gemini-api/docs/models for the canonical model identifier.
 * Verified against live docs on 2026-04-10 via /plan.
 */
const MODEL = 'gemini-2.5-flash-lite'

const REQUEST_TIMEOUT_MS = 30_000
const MAX_OUTPUT_TOKENS = 600
const TEMPERATURE = 0.7

/**
 * Single return shape — no discriminated union, no `source` field (acceptance criterion 29).
 */
export interface ExplainResult {
  content: string
  model: string
}

/**
 * Lazily initialized SDK client. Module-load initialization would throw for users who don't
 * have a key configured, which defeats the require-on-use pattern in env.ts. First call to
 * generateExplanation constructs the client; subsequent calls reuse it.
 */
let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (client) return client

  let apiKey: string
  try {
    apiKey = requireGeminiApiKey()
  } catch (err) {
    console.error(
      '[BB-30] Gemini key missing. Add VITE_GEMINI_API_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for the expected format.',
      err,
    )
    throw new GeminiKeyMissingError(undefined, { cause: err })
  }

  client = new GoogleGenAI({ apiKey })
  return client
}

/**
 * Test-only reset hook. Never called in production code — exported solely so
 * `geminiClient.test.ts` can reset the memoized client between tests.
 */
export function __resetGeminiClientForTests(): void {
  client = null
}

/**
 * Generate a scholarly explanation for a scripture passage.
 *
 * @param reference Formatted reference, e.g., "1 Corinthians 13:4-7"
 * @param verseText The WEB translation text for the referenced range
 * @returns ExplainResult with the LLM-generated content and the model identifier
 * @throws GeminiKeyMissingError if VITE_GEMINI_API_KEY is not set
 * @throws GeminiNetworkError for offline/DNS/fetch-level failures
 * @throws GeminiApiError for non-success API responses (invalid key, quota, 5xx)
 * @throws GeminiSafetyBlockError if Gemini's safety filter blocked the response
 * @throws GeminiTimeoutError if the request exceeded 30 seconds
 */
export async function generateExplanation(
  reference: string,
  verseText: string,
): Promise<ExplainResult> {
  const ai = getClient() // throws GeminiKeyMissingError if key not set

  const userPrompt = buildExplainPassageUserPrompt(reference, verseText)
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: EXPLAIN_PASSAGE_SYSTEM_PROMPT,
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: timeoutSignal,
      },
    })
  } catch (err) {
    // Timeout — AbortSignal.timeout fires a DOMException with name 'TimeoutError'
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new GeminiTimeoutError(undefined, { cause: err })
    }
    // Any AbortError that isn't a timeout (e.g., caller cancellation via an outer controller)
    // is also surfaced as a timeout from the user's perspective
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GeminiTimeoutError('Gemini request was aborted', { cause: err })
    }
    // Network failures — TypeError from fetch, or errors with 'network' / 'fetch' in the message
    if (
      err instanceof TypeError ||
      (err instanceof Error && /network|fetch|offline/i.test(err.message))
    ) {
      throw new GeminiNetworkError(undefined, { cause: err })
    }
    // Everything else — API error (invalid key, quota, 5xx, unknown SDK error)
    throw new GeminiApiError(
      err instanceof Error ? err.message : 'Unknown Gemini API error',
      { cause: err },
    )
  }

  // Safety block detection — Gemini returns blocks as part of the response payload, not as
  // an error. Check three places:
  //   1. Prompt-level block: response.promptFeedback.blockReason
  //   2. Output-level block: first candidate's finishReason is 'SAFETY'
  //   3. Empty text: no candidates returned OR text is empty
  const promptBlockReason = response.promptFeedback?.blockReason
  if (promptBlockReason) {
    throw new GeminiSafetyBlockError(
      `Gemini blocked the prompt: ${promptBlockReason}`,
    )
  }

  const firstCandidate = response.candidates?.[0]
  const finishReason = firstCandidate?.finishReason
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    throw new GeminiSafetyBlockError(
      `Gemini blocked the response: finishReason=${finishReason}`,
    )
  }

  const content = response.text?.trim()
  if (!content) {
    throw new GeminiSafetyBlockError(
      'Gemini returned an empty response (likely a silent safety block)',
    )
  }

  return { content, model: MODEL }
}
```

**Key implementation notes:**

1. **Lazy init memoization** — the `client` variable is `let` at module scope. First successful `getClient()` stores it. Subsequent calls reuse.
2. **Key missing path** — `requireGeminiApiKey()` throws a plain `Error`; we catch it and re-throw as `GeminiKeyMissingError` with the original as `cause`. The `console.error` gives developers the fix in their console.
3. **Timeout via `AbortSignal.timeout`** — this is the modern browser API (available in all supported browsers and Node). When it fires, `generateContent` rejects with a `DOMException` named `'TimeoutError'`. We map that to `GeminiTimeoutError`.
4. **Network vs API error distinction** — `fetch` throws `TypeError` for network failures (offline, DNS, CORS). That maps to `GeminiNetworkError`. Everything else (non-2xx responses, malformed responses, invalid keys) surfaces as an SDK error and maps to `GeminiApiError`.
5. **Safety block belt-and-suspenders check** — three conditions any of which triggers `GeminiSafetyBlockError`. The empty-text check is the last line of defense: if `response.text` is empty without an explicit `finishReason === 'SAFETY'`, we still treat it as a silent block rather than returning empty content to the UI.
6. **System instruction via `config.systemInstruction`** — this is the Gemini-specific architectural detail called out in the spec. The SDK's `GenerateContentConfig` interface has `systemInstruction?: ContentUnion`, and `ContentUnion` accepts a plain string. Verified via Context7 docs fetch on 2026-04-10.
7. **No caching, no retry, no streaming, no telemetry** — spec explicit.
8. **`__resetGeminiClientForTests`** — exported as an escape hatch for the unit test suite. Its double-underscore prefix signals "test-only, do not call from production code." The ESLint rule for unused exports should allow it.

**Auth gating:** N/A — no `useAuth` or `useAuthModal` imported.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT read `import.meta.env.VITE_GEMINI_API_KEY` directly.** Use `requireGeminiApiKey()` from `@/lib/env`. Acceptance criterion 15.
- **Do NOT initialize `GoogleGenAI` at module load.** The `client` variable starts `null`; `getClient()` initializes on first call. Acceptance criterion 16.
- **Do NOT prepend the system prompt to `contents`.** It goes in `config.systemInstruction`. Acceptance criterion 18.
- **Do NOT add retry logic.** A failed request surfaces the error to the UI; the user retries manually.
- **Do NOT add caching.** BB-32 will add caching. BB-30 hits Gemini fresh every time.
- **Do NOT add streaming (`generateContentStream`).** Use `generateContent` — full response awaited.
- **Do NOT pass custom `safetySettings`.** Use the SDK default. Spec explicit.
- **Do NOT log prompts, responses, or user-identifying data.** The only `console.error` is for the key-missing developer message.
- **Do NOT catch the `GeminiKeyMissingError` inside `generateExplanation`.** Let it propagate to the hook/UI layer.
- **Do NOT add telemetry, analytics, or backend proxy wiring.** The browser calls Gemini directly. Spec explicit.
- **Do NOT truncate or post-process Gemini output.** Return the full `content` string verbatim (trimmed of leading/trailing whitespace only).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `generateExplanation` throws `GeminiKeyMissingError` when key is missing | unit | Mock `requireGeminiApiKey` to throw; assert `.rejects.toBeInstanceOf(GeminiKeyMissingError)` |
| `generateExplanation` initializes SDK lazily | unit | Mock `GoogleGenAI` constructor with a spy; first call → constructor called once; second call → constructor not called again |
| `generateExplanation` passes the model string `'gemini-2.5-flash-lite'` | unit | Assert the mocked `generateContent` was called with `model: 'gemini-2.5-flash-lite'` |
| `generateExplanation` passes the system prompt via `config.systemInstruction` | unit | Assert the mocked `generateContent` was called with `config.systemInstruction === EXPLAIN_PASSAGE_SYSTEM_PROMPT` |
| `generateExplanation` does NOT prepend the system prompt to `contents` | unit | Assert `contents` starts with `'Explain this passage from the World English Bible:'` and does NOT contain `'You are a thoughtful biblical scholar'` |
| `generateExplanation` passes `temperature: 0.7`, `maxOutputTokens: 600` | unit | Assert config fields |
| `generateExplanation` passes an `abortSignal` | unit | Assert `config.abortSignal` is an `AbortSignal` instance |
| `generateExplanation` returns `{ content, model: 'gemini-2.5-flash-lite' }` on success | unit | Mock a successful response; assert return value |
| `generateExplanation` trims whitespace from content | unit | Mock response with `'  hello  \n\n'`; assert returned content is `'hello'` |
| `generateExplanation` throws `GeminiSafetyBlockError` when `promptFeedback.blockReason` is set | unit | Mock response with `promptFeedback: { blockReason: 'SAFETY' }` |
| `generateExplanation` throws `GeminiSafetyBlockError` when `candidates[0].finishReason === 'SAFETY'` | unit | Mock response; assert error |
| `generateExplanation` throws `GeminiSafetyBlockError` when response text is empty | unit | Mock response with no candidates / empty text |
| `generateExplanation` throws `GeminiTimeoutError` on `DOMException(name=TimeoutError)` | unit | Mock `generateContent` to reject with `new DOMException('timeout', 'TimeoutError')` |
| `generateExplanation` throws `GeminiTimeoutError` on `AbortError` | unit | Mock SDK to reject with AbortError |
| `generateExplanation` throws `GeminiNetworkError` on `TypeError` | unit | Mock SDK to reject with `new TypeError('Failed to fetch')` |
| `generateExplanation` throws `GeminiApiError` on generic Error | unit | Mock SDK to reject with `new Error('Invalid API key')` |
| `generateExplanation` preserves original error as `cause` | unit | Assert thrown error's `.cause` === the mocked rejection |
| `__resetGeminiClientForTests` clears the memoized client | unit | Call `generateExplanation`, `__reset`, then verify constructor is called again on next invocation |

~18 test cases. Mock strategy: `vi.mock('@google/genai', () => ({ GoogleGenAI: vi.fn() }))` at the top of the file. Individual tests use `vi.mocked(GoogleGenAI).mockImplementation(() => ({ models: { generateContent: mockFn } }))`. `beforeEach` calls `__resetGeminiClientForTests()` and `vi.clearAllMocks()`.

**Expected state after completion:**

- [ ] `geminiClient.ts` exports `generateExplanation`, `ExplainResult`, `__resetGeminiClientForTests`
- [ ] The SDK client is lazily initialized (module-load does NOT construct `GoogleGenAI`)
- [ ] System prompt routed through `config.systemInstruction`, not prepended to contents
- [ ] All 5 typed errors are thrown in the correct scenarios
- [ ] 18 unit tests pass
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes

---

### Step 5: Implement the `useExplainPassage` hook

**Objective:** A React hook that manages loading / success / error state for a single explain request. Fires the request on mount. Aborts on unmount. Maps typed errors to user-facing copy. Exposes a `retry()` function.

**Files to create/modify:**

- `frontend/src/hooks/bible/useExplainPassage.ts` — create
- `frontend/src/hooks/bible/__tests__/useExplainPassage.test.ts` — create

**Details:**

```typescript
// frontend/src/hooks/bible/useExplainPassage.ts

import { useCallback, useEffect, useRef, useState } from 'react'
import { generateExplanation, type ExplainResult } from '@/lib/ai/geminiClient'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
} from '@/lib/ai/errors'

export type ExplainErrorKind = 'network' | 'api' | 'safety' | 'timeout' | 'unavailable'

export interface ExplainState {
  status: 'loading' | 'success' | 'error'
  result: ExplainResult | null
  errorKind: ExplainErrorKind | null
  errorMessage: string | null
}

const ERROR_COPY: Record<ExplainErrorKind, string> = {
  network: "Couldn't load an explanation right now. Check your connection and try again.",
  api: 'This feature is temporarily unavailable. Try again in a few minutes.',
  safety:
    'This passage is too difficult for our AI helper to explain well. Consider reading a scholarly commentary or asking a trusted teacher.',
  timeout: 'The request took too long. Try again in a moment.',
  unavailable: 'This feature is temporarily unavailable. Try again in a few minutes.',
}

function classifyError(err: unknown): ExplainErrorKind {
  if (err instanceof GeminiSafetyBlockError) return 'safety'
  if (err instanceof GeminiTimeoutError) return 'timeout'
  if (err instanceof GeminiNetworkError) return 'network'
  if (err instanceof GeminiKeyMissingError) return 'unavailable'
  if (err instanceof GeminiApiError) return 'api'
  return 'unavailable'
}

/**
 * React hook that fetches an explanation for a scripture passage.
 *
 * Fires the request on mount (and on retry). Aborts on unmount. Exposes loading,
 * success, and error states via a single state object.
 */
export function useExplainPassage(
  reference: string,
  verseText: string,
): ExplainState & { retry: () => void } {
  const [state, setState] = useState<ExplainState>({
    status: 'loading',
    result: null,
    errorKind: null,
    errorMessage: null,
  })

  // Bump this to force a re-fetch on retry
  const [attempt, setAttempt] = useState(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setState({ status: 'loading', result: null, errorKind: null, errorMessage: null })

    generateExplanation(reference, verseText)
      .then((result) => {
        if (!isMountedRef.current) return
        setState({ status: 'success', result, errorKind: null, errorMessage: null })
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return
        const kind = classifyError(err)
        setState({
          status: 'error',
          result: null,
          errorKind: kind,
          errorMessage: ERROR_COPY[kind],
        })
      })
  }, [reference, verseText, attempt])

  const retry = useCallback(() => {
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
```

**Key implementation notes:**

1. **Fires on mount via `useEffect`.** Dependencies: `reference`, `verseText`, `attempt`. Changing any re-triggers the request.
2. **`isMountedRef` guard** prevents `setState` calls on unmounted components (the request may resolve after the user closes the sheet). `generateExplanation` is already abort-aware via the SDK's `abortSignal`, but we don't have a handle to that signal from the hook level — the mounted ref is the safety net.
3. **`retry` is a stable callback** that increments an attempt counter, which re-runs the effect.
4. **Error classification** via `instanceof` checks. Unknown errors (not one of our typed classes) fall through to `'unavailable'` so the UI never shows a raw error message.
5. **`ERROR_COPY` uses the exact spec text** for each error kind — do not paraphrase.
6. **Key-missing is mapped to `'unavailable'`** so the user sees the generic "temporarily unavailable" message. The specific error is logged to the console by `geminiClient.getClient()`.

**Auth gating:** N/A — no `useAuth` imported.

**Responsive behavior:** N/A: no UI impact (hook has no render output).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT call `setState` on unmounted components.** Use the `isMountedRef` guard.
- **Do NOT add optimistic UI, debouncing, or cache-busting logic.** The hook fires once per mount/retry.
- **Do NOT expose the typed error class to callers.** The `errorKind` discriminator is enough.
- **Do NOT include a retry button inside the hook.** The hook exposes `retry()`; the UI renders the button.
- **Do NOT re-fire on every render.** The `useEffect` dependency array is `[reference, verseText, attempt]` — changing the attempt via `retry()` re-fires; changing reference/verseText re-fires (which is correct behavior if the selection changes while the sheet is open).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Initial state is `loading` | unit | `renderHook(() => useExplainPassage(...))`; `result.current.status === 'loading'` |
| Success path updates to `status: 'success'` with result | integration | Mock `generateExplanation` to resolve; `waitFor` status change |
| Error path updates to `status: 'error'` with copy | integration | Mock to reject with `GeminiNetworkError`; assert `errorKind === 'network'` and `errorMessage === ERROR_COPY.network` |
| `GeminiNetworkError` maps to `'network'` kind and network copy | unit | via mocked rejection |
| `GeminiApiError` maps to `'api'` kind and api copy | unit | via mocked rejection |
| `GeminiSafetyBlockError` maps to `'safety'` kind and safety copy | unit | via mocked rejection |
| `GeminiTimeoutError` maps to `'timeout'` kind and timeout copy | unit | via mocked rejection |
| `GeminiKeyMissingError` maps to `'unavailable'` kind and generic copy | unit | via mocked rejection; verifies the spec's "key missing shows generic message" rule |
| Unknown errors map to `'unavailable'` | unit | mock a plain `Error`; assert `errorKind === 'unavailable'` |
| `retry()` re-triggers the request | integration | after error state, call `retry()`; assert `generateExplanation` called twice |
| `retry()` resets status to `'loading'` then resolves | integration | mock sequence: reject → resolve; assert final `success` state |
| Unmount cancels state updates | unit | render, unmount, then resolve the mocked promise; assert no console errors/warnings about unmounted setState |
| Changing `reference` prop re-fires | integration | `rerender` with new reference; assert `generateExplanation` called again with new args |

~13 test cases. Mock strategy: `vi.mock('@/lib/ai/geminiClient', () => ({ generateExplanation: vi.fn() }))` at the top. `beforeEach` resets the mock.

**Expected state after completion:**

- [ ] `useExplainPassage.ts` exports the hook and types
- [ ] Hook fires on mount, aborts on unmount, retry re-fires
- [ ] All 5 error kinds are mapped correctly to copy
- [ ] 13 unit/integration tests pass
- [ ] `pnpm lint`, `pnpm build` pass

---

### Step 6: Implement `ExplainSubViewDisclaimer`, `ExplainSubViewLoading`, and `ExplainSubViewError` presentational components

**Objective:** Three small presentational components — the disclaimer (always rendered on success), the loading state, and the error state with retry. Split out so the main sub-view stays readable and each piece is unit-testable in isolation.

**Files to create/modify:**

- `frontend/src/components/bible/reader/ExplainSubViewDisclaimer.tsx` — create
- `frontend/src/components/bible/reader/ExplainSubViewLoading.tsx` — create
- `frontend/src/components/bible/reader/ExplainSubViewError.tsx` — create
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewDisclaimer.test.tsx` — create
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewLoading.test.tsx` — create
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewError.test.tsx` — create

**Details:**

#### `ExplainSubViewDisclaimer.tsx`

```typescript
/**
 * Non-dismissible disclaimer shown below every successful explanation.
 *
 * The exact text is locked by the spec — do NOT "improve" it.
 * Appears on every explanation. Not hidden behind settings. Not dismissible.
 */
export function ExplainSubViewDisclaimer() {
  return (
    <div className="border-t border-white/[0.08] px-4 py-3">
      <p className="text-xs leading-relaxed text-white/40">
        This explanation was generated by an AI trained on biblical scholarship. It's
        one reading of the passage, not the only one. Use it as a starting point, not
        a final answer.
      </p>
    </div>
  )
}
```

#### `ExplainSubViewLoading.tsx`

```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Loading state shown while the Gemini request is in flight. Respects
 * prefers-reduced-motion — renders a static label instead of animated skeleton
 * when reduced motion is enabled.
 */
export function ExplainSubViewLoading() {
  const reducedMotion = useReducedMotion()

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="mb-4 text-sm text-white/50">Thinking…</p>
      {!reducedMotion && (
        <div className="w-full max-w-xs space-y-2" aria-hidden="true">
          <div className="h-3 w-full animate-pulse rounded bg-white/[0.08]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.08]" />
        </div>
      )}
    </div>
  )
}
```

Note: `useReducedMotion` hook exists at `frontend/src/hooks/useReducedMotion.ts` (imported by `VerseActionSheet.tsx:6`) — reuse it.

#### `ExplainSubViewError.tsx`

```typescript
import { AlertCircle, RotateCw } from 'lucide-react'
import type { ExplainErrorKind } from '@/hooks/bible/useExplainPassage'

interface ExplainSubViewErrorProps {
  kind: ExplainErrorKind
  message: string
  onRetry: () => void
}

/**
 * Error state with user-facing copy and a retry button. The retry button is rendered
 * for every error kind — even safety blocks and unavailable — because some errors are
 * transient and a retry may succeed. The spec's acceptance criterion 9 requires retry
 * on network errors; 12 requires retry on timeout. Exposing retry for every kind is
 * harmless and simpler than branching.
 */
export function ExplainSubViewError({ kind, message, onRetry }: ExplainSubViewErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
      <p className="text-sm font-medium text-white">Something went wrong</p>
      <p className="mt-1 max-w-xs text-xs text-white/50">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        data-error-kind={kind}
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
```

The `data-error-kind` attribute makes the error kind inspectable in tests and by `/verify-with-playwright` without relying on test IDs.

**Auth gating:** N/A.

**Responsive behavior:**

- Mobile (375px): all three components render full-width inside the sheet's `px-4` padding. Retry button 44px min-height satisfied.
- Tablet (768px): sheet is 440px wide; content stacks naturally within container.
- Desktop (1440px): identical to tablet — sheet is 440px centered modal.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT "improve" the disclaimer text.** The spec locks the exact wording.
- **Do NOT make the disclaimer dismissible.** No close button, no settings toggle.
- **Do NOT render the disclaimer inside loading or error states.** It attaches only to the success state.
- **Do NOT use `text-white/30` or lower for the disclaimer.** `text-white/40` is the minimum that stays legible while reading as "muted."
- **Do NOT animate the error icon or retry button.** Calm reading surface.
- **Do NOT import `FrostedCard`** — content sits directly on the sheet's frosted backdrop, not inside a nested card.
- **Do NOT use `dangerouslySetInnerHTML`** anywhere in these components.
- **Do NOT hide the retry button for specific error kinds.** Render it for all kinds (see comment in `ExplainSubViewError` above).
- **Do NOT add a "Report this" or "Submit feedback" button.** Spec explicit: no feedback mechanism in BB-30.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `ExplainSubViewDisclaimer` renders the exact spec text | unit | `getByText(/This explanation was generated by an AI/)` |
| `ExplainSubViewDisclaimer` has no dismiss button | unit | `queryByRole('button')` returns null |
| `ExplainSubViewDisclaimer` has muted text styling | unit | class assertion `text-white/40` |
| `ExplainSubViewLoading` renders "Thinking…" label | unit | `getByText('Thinking…')` |
| `ExplainSubViewLoading` has `role="status"` and `aria-live="polite"` | unit | accessibility assertion |
| `ExplainSubViewLoading` renders skeleton bars when motion allowed | unit | mock `useReducedMotion` to return `false`; assert 4 pulse bars |
| `ExplainSubViewLoading` hides skeleton when reduced motion | unit | mock `useReducedMotion` to return `true`; assert no pulse bars; static label still renders |
| `ExplainSubViewError` renders the passed message | unit | pass arbitrary message; `getByText(...)` |
| `ExplainSubViewError` has `role="alert"` and `aria-live="assertive"` | unit | accessibility assertion |
| `ExplainSubViewError` retry button has min 44px height | unit | class assertion `min-h-[44px]` |
| `ExplainSubViewError` retry button calls `onRetry` on click | unit | `userEvent.click`; assert callback invoked once |
| `ExplainSubViewError` exposes `data-error-kind` attribute | unit | inspect button attribute |

~12 test cases.

**Expected state after completion:**

- [ ] All 3 presentational components exist and match the spec
- [ ] 12 tests pass
- [ ] Components render without provider wrapping
- [ ] `pnpm lint`, `pnpm build` pass

---

### Step 7: Implement `ExplainSubView.tsx` — the main sub-view that composes the hook and presentational components

**Objective:** The sub-view component that `verseActionRegistry`'s `explain` action will mount. Follows `CrossRefsSubView` pattern: no self-rendered chrome, starts with `<div>`. Renders context strip, divider, then one of loading/success+disclaimer/error based on hook state. Applies the 20-verse cap.

**Files to create/modify:**

- `frontend/src/components/bible/reader/ExplainSubView.tsx` — create
- `frontend/src/components/bible/reader/__tests__/ExplainSubView.test.tsx` — create

**Details:**

```typescript
// frontend/src/components/bible/reader/ExplainSubView.tsx

import { useMemo } from 'react'
import { formatReference } from '@/lib/bible/verseActionRegistry'
import { useExplainPassage } from '@/hooks/bible/useExplainPassage'
import { ExplainSubViewLoading } from './ExplainSubViewLoading'
import { ExplainSubViewError } from './ExplainSubViewError'
import { ExplainSubViewDisclaimer } from './ExplainSubViewDisclaimer'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

interface ExplainSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}

const MAX_VERSES_PER_REQUEST = 20

/**
 * Sub-view for BB-30 "Explain this passage". Follows the CrossRefsSubView pattern:
 * component body starts with <div> — no back button, no title, no close X. Sheet
 * chrome is provided by VerseActionSheet.
 *
 * Architecture note: do NOT follow the NoteEditorSubView pattern (self-rendered
 * chrome). That pattern causes a double-header bug.
 */
export function ExplainSubView({ selection }: ExplainSubViewProps) {
  const reference = formatReference(selection)
  const verseText = selection.verses.map((v) => v.text).join(' ')
  const verseCount = selection.endVerse - selection.startVerse + 1
  const isOverLimit = verseCount > MAX_VERSES_PER_REQUEST

  // Guard against over-limit selections before firing any request.
  // Passing stable empty strings keeps the hook call unconditional so React's
  // rules-of-hooks aren't violated, but we never read the state when over-limit.
  const safeReference = isOverLimit ? '' : reference
  const safeVerseText = isOverLimit ? '' : verseText
  const state = useExplainPassage(safeReference, safeVerseText)

  // Over-limit error takes precedence over hook state
  const effectiveStatus = isOverLimit ? 'error' : state.status

  const contextStripClasses =
    'mx-4 my-2 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3'

  return (
    <div>
      {/* Subtitle */}
      <div className="px-4 py-1.5">
        <span className="text-xs text-white/50">Scholarly context for {reference}</span>
      </div>

      {/* Context strip — Tier 2 scripture callout */}
      <div className={contextStripClasses}>
        <p className="font-serif text-sm font-semibold text-white">{reference}</p>
        <p className="mt-1 font-serif text-sm leading-relaxed text-white/80">{verseText}</p>
      </div>

      <div className="border-t border-white/[0.08]" />

      {/* Loading state */}
      {effectiveStatus === 'loading' && <ExplainSubViewLoading />}

      {/* Error state (hook error OR over-limit) */}
      {effectiveStatus === 'error' && isOverLimit && (
        <ExplainSubViewError
          kind="unavailable"
          message={`Please select ${MAX_VERSES_PER_REQUEST} or fewer verses to explain.`}
          onRetry={() => {
            /* no-op for over-limit — user must change selection */
          }}
        />
      )}
      {effectiveStatus === 'error' && !isOverLimit && state.errorKind && state.errorMessage && (
        <ExplainSubViewError
          kind={state.errorKind}
          message={state.errorMessage}
          onRetry={state.retry}
        />
      )}

      {/* Success state */}
      {effectiveStatus === 'success' && state.result && (
        <>
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-white/90">
              {state.result.content}
            </p>
          </div>
          <ExplainSubViewDisclaimer />
        </>
      )}
    </div>
  )
}
```

**Key implementation notes:**

1. **Component body starts with `<div>`.** No back button, no title, no close X. Sheet chrome is rendered by `VerseActionSheet` (lines 300–312) around this sub-view.
2. **`onBack` and `context` props are received but not used in the render.** They're part of the `renderSubView` contract; we keep them in the props interface for type compatibility. `context` could be used if we added a "Copy" or navigation action inside the sub-view, but BB-30 does not.
3. **20-verse cap** is enforced before the hook fires. The hook is still called unconditionally (rules-of-hooks) but with empty strings when over-limit; the effective status is overridden to `'error'` so the request never runs.
4. **Context strip uses Tier 2 scripture callout** (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3`) — the canonical scripture callout pattern from `09-design-system.md`.
5. **Explanation body** uses `whitespace-pre-wrap` to preserve paragraph breaks from Gemini's output (the LLM naturally uses `\n\n` between paragraphs). Text color is `text-white/90` (slightly below pure white so the scripture context strip at `text-white` reads brighter than the explanation prose).
6. **Disclaimer renders only on success.** Never on loading, never on error.
7. **`onRetry` is a no-op for the over-limit error.** The user has to change their selection to recover. Rendering the retry button anyway is fine — clicking it does nothing, and the user will naturally close the sub-view and re-select.
8. **No markdown parsing.** `{state.result.content}` is rendered as plain text inside a `<p>`. React escapes it automatically.

**Auth gating:** N/A — no `useAuth` or `useAuthModal` imported.

**Responsive behavior:**

- Mobile (375px): sub-view fills the full-width bottom sheet. Context strip, body, and disclaimer stack naturally. Body text wraps at ~340px (inside `px-4` padding).
- Tablet (768px): sub-view fills the 440px centered modal. Body text wraps at ~408px.
- Desktop (1440px): identical to tablet (~408px).

**Inline position expectations:** N/A — no inline-row layouts.

**Guardrails (DO NOT):**

- **Do NOT render your own back button, title, or close X.** Sheet chrome comes from `VerseActionSheet`. This is the CrossRefsSubView pattern, not NoteEditorSubView. Acceptance criterion 3.
- **Do NOT use `dangerouslySetInnerHTML`** on `state.result.content`. Render as plain text.
- **Do NOT parse the content as markdown.** No `marked`, no `react-markdown`, no link detection.
- **Do NOT render the disclaimer inside loading or error states.**
- **Do NOT add a "Copy explanation" or "Share" button.** Spec out of scope.
- **Do NOT add a "This was helpful" thumbs up/down.** Spec out of scope.
- **Do NOT persist anything to localStorage.** Zero storage writes.
- **Do NOT import `useAuth` or `useAuthModal`.** Zero auth gates.
- **Do NOT call the hook conditionally.** The hook is called unconditionally; the 20-verse cap is enforced by passing empty strings + overriding status.
- **Do NOT add a GlowBackground wrapper.** Sub-view sits on the sheet's frosted backdrop.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders reference and verse text in context strip | integration | Mock hook to return loading; assert reference visible |
| Body starts with `<div>` (no header, no back button, no close X) | integration | `container.firstChild` is a div; no button with `aria-label="Back"` |
| Shows loading state initially | integration | mock hook loading; `getByText('Thinking…')` |
| Shows success state with explanation text and disclaimer | integration | mock hook success; body text + disclaimer both visible |
| Shows error state with retry button for network error | integration | mock hook error kind `'network'`; assert retry button and network copy |
| Shows error state for safety block | integration | mock hook `'safety'`; assert safety copy ("too difficult for our AI helper") |
| Shows error state for timeout | integration | mock hook `'timeout'`; assert timeout copy |
| Shows error state for api error | integration | mock hook `'api'`; assert "temporarily unavailable" copy |
| Shows "unavailable" copy for key-missing (mapped to `'unavailable'` in hook) | integration | mock hook `'unavailable'`; assert generic copy |
| Clicking retry calls `hook.retry` | integration | mock hook error; click retry; assert retry called |
| Over-limit selection (>20 verses) shows error without firing hook | integration | selection with 21 verses; assert error copy "20 or fewer"; assert mocked `generateExplanation` never called |
| Disclaimer is NOT rendered in loading state | integration | mock hook loading; assert disclaimer text not in DOM |
| Disclaimer is NOT rendered in error state | integration | mock hook error; assert disclaimer text not in DOM |
| Plain text rendering — content with HTML tags is escaped | integration | mock hook success with content `'<script>alert(1)</script>'`; assert the text content includes the literal tags (React escapes) and no script ran |
| Explanation preserves paragraph breaks (whitespace-pre-wrap) | integration | mock hook success with `'Para 1.\n\nPara 2.'`; assert className includes `whitespace-pre-wrap` |
| Component body does not import `useAuth` or localStorage | static | grep source file for those identifiers → zero hits |

~16 test cases. Mock `useExplainPassage` at the top of the test file so each test controls the hook's return value. Also mock `generateExplanation` from `@/lib/ai/geminiClient` to satisfy the over-limit "never called" assertion.

**Expected state after completion:**

- [ ] `ExplainSubView.tsx` exists and follows the CrossRefsSubView pattern
- [ ] All 5 error kinds render correctly
- [ ] Over-limit cap is enforced before any request fires
- [ ] Disclaimer renders only on success
- [ ] Plain-text rendering with `whitespace-pre-wrap`
- [ ] 16 tests pass
- [ ] `pnpm lint`, `pnpm build` pass

---

### Step 8: Wire `ExplainSubView` into `verseActionRegistry` (replacing the stub)

**Objective:** Replace the stubbed `stubSubView('AI explain ships in BB-30')` in `verseActionRegistry.ts` with a real mount of `ExplainSubView`. Action label, sublabel, icon, placement, and `isAvailable` are already correct — only `renderSubView` changes.

**Files to create/modify:**

- `frontend/src/lib/bible/verseActionRegistry.ts` — replace the `explain.renderSubView` line
- `frontend/src/lib/bible/__tests__/verseActionRegistry.test.ts` — add/update tests if the existing suite asserts on `renderSubView` (check first)

**Details:**

Current state at `verseActionRegistry.ts:358-368`:

```typescript
const explain: VerseActionHandler = {
  action: 'explain',
  label: 'Explain this passage',
  sublabel: 'Understand the context',
  icon: Brain,
  category: 'secondary',
  hasSubView: true,
  renderSubView: stubSubView('AI explain ships in BB-30'),  // ← this line
  isAvailable: () => true,
  onInvoke: () => {},
}
```

Replace with:

```typescript
import { ExplainSubView } from '@/components/bible/reader/ExplainSubView'
// ... (with the other sub-view imports at the top of the file)

const explain: VerseActionHandler = {
  action: 'explain',
  label: 'Explain this passage',
  sublabel: 'Understand the context',
  icon: Brain,
  category: 'secondary',
  hasSubView: true,
  renderSubView: (props) => React.createElement(ExplainSubView, props),
  isAvailable: () => true,
  onInvoke: () => {},
}
```

Add the import `import { ExplainSubView } from '@/components/bible/reader/ExplainSubView'` next to the other sub-view imports at the top (lines 16, 40, 41). The `stubSubView` helper function may remain in the file — it's still used by `memorize` (BB-45).

**Auth gating:** N/A — `isAvailable: () => true` already set; no change. Acceptance criterion 40.

**Responsive behavior:** N/A: no visual change to the registry; visual impact comes from `ExplainSubView` tested in Step 7.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT change the display position** of the `explain` action inside `SECONDARY_ACTIONS`. Current placement (between `crossRefs` and `memorize`) is spec-correct.
- **Do NOT change `isAvailable`** — it must remain `() => true` so logged-out users can use the feature. Acceptance criterion 40.
- **Do NOT add a `getState` implementation.** Explain has no active/filled state — it's a one-shot action.
- **Do NOT remove `stubSubView`** — it's still used by `memorize`.
- **Do NOT change `onInvoke`** — it remains `() => {}` because the action opens a sub-view (has `hasSubView: true`). The sheet handles sub-view navigation, not `onInvoke`.
- **Do NOT add the `Brain` icon import** — it's already imported at line 10.
- **Do NOT use a default export** for `ExplainSubView` — use the named export to match the rest of the reader components.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getActionByType('explain')` returns the handler | unit | already covered by existing registry tests (check and add if missing) |
| `renderSubView` returns a React element (not a string / null) | unit | assert `renderSubView({ selection, onBack, context }) != null` |
| `renderSubView` renders `ExplainSubView` | integration | render the returned element; assert it contains elements from `ExplainSubView` (e.g., the subtitle span) |
| `explain.isAvailable(selection)` returns `true` | unit | any selection |
| `explain.hasSubView === true` | unit | simple assertion |
| Explain appears in `SECONDARY_ACTIONS` between `crossRefs` and `memorize` | unit | index order assertion |

~6 test cases.

**Expected state after completion:**

- [ ] `verseActionRegistry.ts` imports `ExplainSubView` from the reader directory
- [ ] `stubSubView('AI explain ships in BB-30')` is replaced with `(props) => React.createElement(ExplainSubView, props)`
- [ ] No stub string remains for the `explain` action
- [ ] Registry tests pass
- [ ] `pnpm lint`, `pnpm build` pass

---

### Step 9: Integration test — tap "Explain this passage" in `VerseActionSheet` opens `ExplainSubView`

**Objective:** End-to-end integration test at the sheet level: render `VerseActionSheet`, simulate clicking the "Explain this passage" secondary action, verify the sub-view mounts and fires a Gemini request (mocked), and a successful result renders with the disclaimer.

**Files to create/modify:**

- `frontend/src/components/bible/reader/__tests__/VerseActionSheet.explain.test.tsx` — create as a dedicated integration test file (separate from existing VerseActionSheet tests to keep mocks scoped)

**Details:**

```typescript
// frontend/src/components/bible/reader/__tests__/VerseActionSheet.explain.test.tsx

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { VerseActionSheet } from '../VerseActionSheet'
import { ToastProvider } from '@/components/ui/Toast'
import type { VerseSelection } from '@/types/verse-actions'

// Mock the Gemini client at the lowest level so the hook → client → SDK chain is exercised
const mockGenerateExplanation = vi.fn()
vi.mock('@/lib/ai/geminiClient', () => ({
  generateExplanation: (...args: unknown[]) => mockGenerateExplanation(...args),
}))

// Mock focus trap + sub-view deps that aren't the focus of this test
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

const selection: VerseSelection = {
  book: '1-corinthians',
  bookName: '1 Corinthians',
  chapter: 13,
  startVerse: 4,
  endVerse: 7,
  verses: [
    { number: 4, text: 'Love is patient and is kind...' },
    { number: 5, text: 'doesn\'t behave itself inappropriately...' },
    { number: 6, text: 'doesn\'t rejoice in unrighteousness...' },
    { number: 7, text: 'bears all things, believes all things...' },
  ],
}

function renderSheet() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <VerseActionSheet
          selection={selection}
          isOpen={true}
          onClose={vi.fn()}
          onExtendSelection={vi.fn()}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockGenerateExplanation.mockReset()
})

describe('VerseActionSheet — Explain this passage', () => {
  it('opens the ExplainSubView when the action is clicked', async () => {
    mockGenerateExplanation.mockResolvedValue({
      content: 'Paul is writing to a factional Corinthian church...',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))

    // Sheet chrome (back button + title) is rendered by VerseActionSheet, not the sub-view
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByText('Explain this passage')).toBeInTheDocument()
  })

  it('fires generateExplanation on sub-view mount', async () => {
    mockGenerateExplanation.mockResolvedValue({
      content: 'Test explanation.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))

    await waitFor(() => {
      expect(mockGenerateExplanation).toHaveBeenCalledWith(
        expect.stringContaining('1 Corinthians 13:4'),
        expect.stringContaining('Love is patient'),
      )
    })
  })

  it('renders the explanation and disclaimer on success', async () => {
    mockGenerateExplanation.mockResolvedValue({
      content: 'Paul is writing to a factional Corinthian church, not a wedding audience.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Paul is writing to a factional Corinthian church/),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/This explanation was generated by an AI/)).toBeInTheDocument()
  })

  it('shows the network error state when generateExplanation rejects with GeminiNetworkError', async () => {
    const { GeminiNetworkError } = await import('@/lib/ai/errors')
    mockGenerateExplanation.mockRejectedValue(new GeminiNetworkError())

    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load an explanation right now/)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows the safety block error state', async () => {
    const { GeminiSafetyBlockError } = await import('@/lib/ai/errors')
    mockGenerateExplanation.mockRejectedValue(new GeminiSafetyBlockError())

    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/This passage is too difficult for our AI helper/),
      ).toBeInTheDocument()
    })
  })

  it('retry button re-fires generateExplanation', async () => {
    const { GeminiNetworkError } = await import('@/lib/ai/errors')
    mockGenerateExplanation.mockRejectedValueOnce(new GeminiNetworkError())
    mockGenerateExplanation.mockResolvedValueOnce({
      content: 'Retry succeeded.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))
    await waitFor(() => {
      expect(screen.getByText(/Couldn't load/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => {
      expect(screen.getByText('Retry succeeded.')).toBeInTheDocument()
    })
    expect(mockGenerateExplanation).toHaveBeenCalledTimes(2)
  })

  it('back button returns to the action sheet main view', async () => {
    mockGenerateExplanation.mockResolvedValue({
      content: 'Test.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))
    await waitFor(() => {
      expect(screen.getByText('Test.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Back' }))

    // After back, the main sheet view is rendered again — primary actions visible
    expect(screen.getByRole('button', { name: 'Highlight' })).toBeInTheDocument()
  })

  it('20-verse cap shows an error without calling generateExplanation', async () => {
    const largeSelection: VerseSelection = {
      ...selection,
      startVerse: 1,
      endVerse: 25,
      verses: Array.from({ length: 25 }, (_, i) => ({
        number: i + 1,
        text: `Verse ${i + 1} text.`,
      })),
    }

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ToastProvider>
          <VerseActionSheet
            selection={largeSelection}
            isOpen={true}
            onClose={vi.fn()}
            onExtendSelection={vi.fn()}
          />
        </ToastProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /explain this passage/i }))

    expect(screen.getByText(/Please select 20 or fewer verses/)).toBeInTheDocument()
    expect(mockGenerateExplanation).not.toHaveBeenCalled()
  })
})
```

**Key notes:**

1. **Mocks the client at the `geminiClient.ts` boundary**, not at the `@google/genai` SDK boundary. This is one layer above the unit-test mocking in Step 4, so the hook → client → error mapping is exercised end-to-end.
2. **Wraps with `MemoryRouter` and `ToastProvider`** because the sheet uses `useNavigate` (via `useNavigate` import in the action registry pray/journal/meditate actions — not triggered here, but the sheet has the hook call at line 49) and `useToast` (line 51).
3. **Focus trap is mocked** to avoid jsdom focus-management flakiness. The actual focus-restoration test lives in existing `VerseActionSheet.test.tsx`.
4. **Back button test** verifies the CrossRefsSubView pattern works: after clicking Back, the primary actions (Highlight, Note, Bookmark, Share) are visible again.

**Auth gating:** Zero — confirmed by the absence of `useAuth` / `useAuthModal` anywhere in the test.

**Responsive behavior:** N/A: integration test runs at a fixed jsdom viewport.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT mock `@google/genai` directly** in this test — mock `@/lib/ai/geminiClient` at a higher boundary so the hook's error mapping is exercised.
- **Do NOT assert on focus management in this test** — covered by existing `VerseActionSheet.test.tsx`.
- **Do NOT add Playwright tests** — integration tests at the jsdom level cover the spec's acceptance criteria for functional behavior. Visual verification is Step 11 via `/verify-with-playwright`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Opens ExplainSubView on action click | integration | covered above |
| Fires generateExplanation with reference + verse text | integration | covered above |
| Renders explanation + disclaimer on success | integration | covered above |
| Network error state + retry button | integration | covered above |
| Safety block error state | integration | covered above |
| Retry re-fires the request | integration | covered above |
| Back button returns to main view | integration | covered above |
| 20-verse cap enforces without firing request | integration | covered above |

8 tests total.

**Expected state after completion:**

- [ ] `VerseActionSheet.explain.test.tsx` exists with 8 passing integration tests
- [ ] The "Explain this passage" action successfully mounts `ExplainSubView` from the sheet
- [ ] The full flow (click → loading → success → disclaimer) is verified
- [ ] The full flow (click → loading → error → retry → success) is verified
- [ ] `pnpm test` shows all BB-30 tests passing
- [ ] `pnpm lint`, `pnpm build` pass

---

### Step 10: Run prompt testing against 8 test passages — content verification

**Objective:** Execute the 8-case prompt testing methodology from the spec against the **real** Gemini API with the **real** `VITE_GEMINI_API_KEY` from `frontend/.env.local`. Capture outputs verbatim in `_plans/recon/bb30-prompt-tests.md`. Evaluate each output against the 10 system prompt rules using **prose judgment reasoning written by CC into the recon file** — NOT regex pattern matching or any other mechanical check. Iterate prompt text if more than 1 of 8 violates any rule. **This step is manual content work — it does not write production code.**

**Load-bearing commitments (clarified 2026-04-10 with the user before /execute-plan):**

1. **Real API, no mocks.** The script uses `generateExplanation` from `src/lib/ai/geminiClient`, which calls `requireGeminiApiKey()` → reads `VITE_GEMINI_API_KEY` from `frontend/.env.local` → makes live HTTPS requests to `generativelanguage.googleapis.com` via the real `@google/genai` SDK. No mocks, no stubs, no test keys, no canned responses, no fallback path. If the key is not set, the script throws `GeminiKeyMissingError` and halts — it does NOT substitute fake output. The entire value of this step is catching real Flash-Lite drift on real passages.

2. **Manual prose evaluation, no mechanical checks.** For each of the 8 outputs, CC writes a prose evaluation of each applicable rule into the recon file. Evaluations include reasoning, not just verdicts. Examples:
   - ❌ **NOT ACCEPTABLE:** `- Rule 9 (no "God is telling you"): PASS` (mechanical, no reasoning, no spot-check value)
   - ❌ **NOT ACCEPTABLE:** regex'ing the output for the forbidden phrase list and auto-marking pass/fail
   - ✅ **ACCEPTABLE:** `- Rule 9 (no pastoral ventriloquism): PASS — the output uses "Paul writes that..." and "the text suggests..." throughout, never speaks for God to the reader. Closest call is paragraph 3 where it says "the passage invites us to..." — this is an application nudge but not pastoral ventriloquism in the rule-9 sense. Flagging separately under rule 4.`
   - ✅ **ACCEPTABLE:** `- Rule 4 (no application): FAIL — the final sentence reads "These verses challenge us to examine whether our own love is patient." This is classic application drift: it's the LLM sliding into a sermon at the end. Flag for iteration.`

   The **only** place a numeric check is acceptable is rule 8 (200-400 words), because the rule itself is numeric. Even there, CC writes the word count + a judgment (420 is soft-cap drift, not violation; 650 is violation).

   CC's written evaluations must appear in the recon file so the user can spot-check CC's calls. If an evaluation is missing or reads as mechanical rubber-stamping, the step is incomplete.

3. **Full iteration history preserved.** The recon file accumulates every round. When round 2 runs, round 1's outputs, evaluations, and proposed revision stay in place and round 2 appends below. Same for round 3. The final file is a complete narrative: "v1 prompt → 8 outputs → N violations → proposed v2 revision with reasoning → 8 new outputs → …". The final passing round does NOT overwrite earlier rounds. Future maintainers reading `explainPassagePrompt.ts` must be able to open the recon file and see exactly why rule N ended up worded the way it's worded.

**Files to create/modify:**

- `frontend/scripts/bb30-run-prompt-tests.ts` — create a dev-only script that imports `generateExplanation` and invokes it 8 times with the test passages, writing raw output to stdout in a format that can be pasted into the recon file
- `_plans/recon/bb30-prompt-tests.md` — create with the 8 captured outputs + rule-by-rule evaluation + iteration log

**Details:**

#### `frontend/scripts/bb30-run-prompt-tests.ts`

A tiny Node script (run via `tsx` or `node --loader ts-node/esm` depending on the project's existing script runner convention — check `frontend/package.json` scripts) that:

1. Loads `frontend/.env.local` via `dotenv` (or the project's existing env loader)
2. Imports `generateExplanation` from `src/lib/ai/geminiClient`
3. Calls it sequentially for each of the 8 test passages (with a short delay between calls to be polite to the API)
4. Writes each result to stdout formatted as a markdown block with the reference, the output, the model, and a timestamp

The 8 test passages (**NOT** the four morally hardest — those are deliberately excluded per spec §"Prompt testing methodology"):

| # | Category | Reference | WEB verse text (abbreviated — use the real WEB text from `frontend/src/data/bible/books/json/`) |
|---|----------|-----------|----|
| 1 | Easy | John 3:16 | "For God so loved the world…" |
| 2 | Easy | Psalm 23:1 | "Yahweh is my shepherd…" |
| 3 | Easy | 1 Corinthians 13:4-7 | "Love is patient and is kind…" |
| 4 | Easy | Philippians 4:6-7 | "In nothing be anxious…" |
| 5 | Medium | Leviticus 19:19 | "You shall keep my statutes. You shall not cross-breed different kinds of animals…" |
| 6 | Medium | Genesis 22:1-2 | "After these things, God tested Abraham…" |
| 7 | Medium | 1 Timothy 2:11-12 | "Let a woman learn in quietness…" |
| 8 | Medium | Romans 1:26-27 | "For this reason, God gave them up to vile passions…" |

**Do NOT add Joshua 6, Psalm 137:9, Judges 19, or 1 Samuel 15:3 to the testing list.** The spec explicitly excludes them (§"Prompt testing methodology"). They'll be handled at runtime by the LLM with the same prompt.

#### Testing process

1. Run `pnpm tsx frontend/scripts/bb30-run-prompt-tests.ts` (or the appropriate invocation)
2. For each of the 8 outputs:
   - Paste the raw output into `_plans/recon/bb30-prompt-tests.md`
   - Evaluate against the 10 rules in the system prompt (rule 1: leads with context; rule 4: no application; rule 5: no triumphalism; rule 7: honest hard-passage handling; rule 8: 200-400 words; rule 9: no "God is telling you" etc.; etc.)
   - Flag any violation in the markdown under the output
3. Count the violation count. **Target: ≤1 of 8 with any violation.**
4. If >1 violates any rule:
   - Identify the most common failure mode (application drift, pastoral ventriloquism, length drift, softening)
   - Add a more specific counter-rule or counter-example to the system prompt
   - Save the iterated prompt version in `explainPassagePrompt.ts` with a comment noting the iteration
   - Re-run all 8 tests from scratch
   - Continue until ≤1 of 8 has any violation, or until 3 iterations have elapsed
5. If after 3 iterations the prompt still fails on >1 of 8: **stop and escalate to the user.** Document the failures in the recon file and raise the question of whether Flash-Lite is insufficient and a model upgrade (Flash non-Lite) is warranted. Do not attempt to ship without user acknowledgment.
6. On pass, save the final prompt version + passing test outputs to `_plans/recon/bb30-prompt-tests.md`

#### `_plans/recon/bb30-prompt-tests.md` structure

The file accumulates **every round** of testing. Round 2 appends below round 1; round 3 appends below round 2. Nothing is overwritten. The final file is a complete iteration narrative.

```markdown
# BB-30 Prompt Test Results

**Date:** 2026-04-10
**Model:** gemini-2.5-flash-lite
**API:** Real Gemini API via @google/genai SDK — VITE_GEMINI_API_KEY from frontend/.env.local
**Test executor:** Claude Code via /execute-plan
**Pass criterion:** ≤1 of 8 outputs violates any rule
**Evaluation method:** Prose judgment by CC, written into this file. No regex or mechanical pattern matching.

---

## Round 1 — System prompt v1

### v1 prompt source
Saved at `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` at commit `{hash}` — the text from the spec verbatim.

### Test 1: John 3:16 (Easy)

#### Raw output (verbatim from generateExplanation)
```
[exact text returned by Gemini, preserved verbatim including paragraph breaks]
```

#### Metadata
- Model: gemini-2.5-flash-lite
- Word count: {N}
- Captured: {ISO timestamp}

#### Prose evaluation
- **Rule 1 (lead with context):** {PASS/FAIL} — {written reasoning: what the output did, why it passes or fails. Examples: "Opens with the Gospel of John's historical setting and the Nicodemus dialogue. Clearly leads with context." OR "Skips context entirely and goes straight to a theological summary. Fail."}
- **Rule 2 (explain what passage is doing):** {PASS/FAIL} — {reasoning}
- **Rule 3 (acknowledge uncertainty):** {PASS/FAIL/N/A} — {reasoning; N/A if the passage has no scholarly disagreement}
- **Rule 4 (no application/prescription):** {PASS/FAIL} — {reasoning with direct quotes from the output if flagged}
- **Rule 5 (no triumphalism):** {PASS/FAIL} — {reasoning}
- **Rule 6 (stay in the text):** {PASS/FAIL} — {reasoning}
- **Rule 7 (hard passages honestly):** {PASS/FAIL/N/A} — {N/A if not a hard passage; reasoning otherwise}
- **Rule 8 (length 200-400 words):** {PASS/FAIL/SOFT-DRIFT} — word count {N}. {judgment: "421 is soft-cap drift, not a violation" vs "650 is a violation"}
- **Rule 9 (no pastoral ventriloquism):** {PASS/FAIL} — {reasoning with direct quotes if flagged}
- **Rule 10 (no prayer/church/study recommendations):** {PASS/FAIL} — {reasoning}

**Overall verdict:** PASS / FAIL
**Notes for iteration:** {if FAIL, what specific failure mode was observed — e.g., "application drift in final paragraph, matches spec's 'drifting into application/prescription despite rule 4' failure mode"}

---

### Test 2: Psalm 23:1
{same structure — raw output, metadata, prose evaluation per rule}

### Test 3: 1 Corinthians 13:4-7
{same structure}

### Test 4: Philippians 4:6-7
{same structure}

### Test 5: Leviticus 19:19
{same structure}

### Test 6: Genesis 22:1-2
{same structure}

### Test 7: 1 Timothy 2:11-12
{same structure}

### Test 8: Romans 1:26-27
{same structure}

---

### Round 1 Summary

| Test | Reference | Verdict | Flagged rules |
|------|-----------|---------|---------------|
| 1 | John 3:16 | PASS/FAIL | {list} |
| 2 | Psalm 23:1 | ... | ... |
| 3 | 1 Cor 13:4-7 | ... | ... |
| 4 | Phil 4:6-7 | ... | ... |
| 5 | Lev 19:19 | ... | ... |
| 6 | Gen 22:1-2 | ... | ... |
| 7 | 1 Tim 2:11-12 | ... | ... |
| 8 | Rom 1:26-27 | ... | ... |

**Round 1 result:** {N/8} PASS — {meets or does not meet ≤1 violation criterion}

### Round 1 iteration decision

{If ≤1 of 8 failed: "PASSED — no iteration needed. Skip to Final section."}

{If >1 failed: "ITERATION NEEDED. Observed failure patterns: {e.g., "5 of 8 ended with application drift — the final sentence sliding into 'this challenges us to...'. Matches the spec's documented application-drift failure mode."}}

### Proposed v2 prompt revision (if iterating)

{Written reasoning: "Adding a more specific counter-rule targeting end-of-paragraph application drift. The existing rule 4 says 'Do not prescribe application' but 5 of 8 outputs still drifted in the final sentence. Making it more specific."}

**Diff from v1:**
```
Rule 4 changes from:
  "Do not prescribe application. Do not tell the user what to do, feel, or believe..."

to:
  "Do not prescribe application. Do not tell the user what to do, feel, or believe.
   Explain what the text says and let the user decide what to do with it.
   Do not end with 'so what does this mean for you' or any variant.
   Do not end the final paragraph with an application nudge like 'these verses
   challenge us to' or 'this invites us to' — end with the scholarly observation,
   not with a call to the reader."
```

{Applied to `explainPassagePrompt.ts` — commit `{hash}` or staged}

---

## Round 2 — System prompt v2

{Same structure as Round 1: 8 tests with raw outputs, prose evaluations, round summary, iteration decision. NO content from Round 1 is removed. Round 2 appends below Round 1.}

---

## Round 3 — System prompt v3
{Only if needed. Same structure.}

---

## Final outcome

**Status:** PASS after N round(s) / ESCALATED to user after 3 rounds with persistent failures
**Final prompt version:** v{N}
**Final prompt location:** `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` at commit `{hash}`
**Summary of changes from v1 to final:** {one paragraph explaining what was added/changed and why — references the failure modes that drove each iteration}

**If escalated:** {summary of the failure modes that did not clear after 3 rounds, recommended model upgrade path, or recommended prompt direction — but NOT a shipped prompt}
```

**Critical structural rule:** Round 2 NEVER overwrites Round 1. Round 3 NEVER overwrites Round 2. The file grows, it does not mutate in place. If a future maintainer asks "why does rule 4 have that specific clause about end-of-paragraph drift?", the answer is visible in Round 1's Rule 4 failure analysis and the Round 1 → Round 2 revision rationale.

**Auth gating:** N/A — script runs outside the React app.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT include Joshua 6, Psalm 137:9, Judges 19, or 1 Samuel 15:3** in the test list. Spec explicit.
- **Do NOT commit API keys** in the script or the recon file.
- **Do NOT commit `_plans/recon/bb30-prompt-tests.md` to a public branch** until the content is reviewed for sensitive material. (The outputs are LLM-generated scholarly text, so this is low risk, but it's a worth-flagging operational note.)
- **Do NOT ship BB-30 without running this step.** The prompt is the product — untested prompt text is broken feature.
- **Do NOT skip iteration if the first round has >1 failures.** Iterate up to 3 times.
- **Do NOT iterate more than 3 times without escalating.** After round 3, escalate to the user.
- **Do NOT "improve" the prompt by softening it.** The rules exist to counter specific Flash-Lite failure modes. Iterations should make the rules more specific, not less.
- **Do NOT use mocks, stubs, or test keys** in the script. Real API key, real network, real Gemini responses only. If the key is missing, halt — do NOT fall back to canned responses.
- **Do NOT auto-evaluate outputs with regex or pattern matching.** Every rule evaluation in the recon file must be prose judgment with written reasoning. Rule 8's numeric word count is the only exception, and even there CC writes a verdict sentence alongside the count.
- **Do NOT rubber-stamp evaluations.** A line that reads `Rule 9: PASS` with no explanation is an incomplete evaluation. Every PASS and every FAIL needs written reasoning the user can spot-check.
- **Do NOT overwrite earlier rounds when iterating.** Round 2 appends below Round 1 in the recon file. Round 3 appends below Round 2. The final file is a complete iteration narrative, not just the passing round.
- **Do NOT delete the Round 1 prose evaluations** when moving to Round 2 even if they're embarrassing or verbose. Future maintainers need the full history to understand why the final prompt has the shape it has.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| The script runs without error | manual | `pnpm tsx frontend/scripts/bb30-run-prompt-tests.ts` completes in <90s |
| All 8 outputs captured | manual | `_plans/recon/bb30-prompt-tests.md` contains 8 output blocks |
| Rule evaluation done for each | manual | each block has a rule evaluation checklist |
| Pass criterion met | manual | ≤1 of 8 has a rule violation, OR escalation happened |
| Final prompt version saved in explainPassagePrompt.ts | manual | if iteration happened, the final prompt is in source and the recon file notes the version |

5 manual checks. This step has no automated test suite — it's content verification.

**Expected state after completion:**

- [ ] `frontend/scripts/bb30-run-prompt-tests.ts` exists and calls real Gemini via `generateExplanation` (no mocks)
- [ ] `_plans/recon/bb30-prompt-tests.md` exists with every round's 8 outputs captured verbatim
- [ ] Every test in every round has a prose evaluation written by CC (not regex-based) with reasoning for each applicable rule
- [ ] If iteration happened, Round 1's outputs and evaluations are still in the file alongside Round 2 (and Round 3 if applicable) — nothing was overwritten
- [ ] The v1 → v2 (and v2 → v3) prompt diffs are documented with written reasoning for each change
- [ ] Final outcome is either: (a) ≤1 of 8 violations in the final round, OR (b) escalation to user after 3 rounds with a written analysis of persistent failure modes
- [ ] The final prompt version in `explainPassagePrompt.ts` matches the last round in the recon file

---

### Step 11: Manual verification in dev — tap a verse, hit Explain, verify the full flow

**Objective:** Run the app locally, open the Bible reader, open the verse action sheet on 1 Corinthians 13:4-7, tap "Explain this passage", and verify the full UX from a real Gemini request. This is the "integration test" the spec calls out in §"Notes for execution."

**Files to create/modify:** none — this step is manual verification only.

**Details:**

1. Start the dev server: `cd frontend && pnpm dev`
2. Navigate to `/bible/1-corinthians/13`
3. Tap verse 4 (or select range 4-7) to open the verse action sheet
4. Scroll the secondary actions; confirm "Explain this passage" appears between "Cross-references" and "Memorize" with the Brain icon and "Understand the context" sublabel
5. Tap "Explain this passage"
6. **Verify loading state:**
   - Context strip renders with the reference and verse text in Lora serif, Tier 2 callout treatment
   - "Thinking…" label is centered
   - Skeleton pulse bars animate (unless you have reduced motion enabled)
7. **Verify success state** (within ~5s typically for Flash-Lite):
   - Explanation text renders below the context strip
   - Paragraph breaks are preserved (if Gemini output has `\n\n`)
   - Disclaimer appears at the bottom: "This explanation was generated by an AI trained on biblical scholarship. It's one reading of the passage, not the only one. Use it as a starting point, not a final answer."
8. **Verify close flow:**
   - Tap the sheet's back button → sub-view unmounts, primary actions are visible
   - Tap Explain again → new request fires (no caching, per spec)
9. **Verify error flow:**
   - Temporarily remove `VITE_GEMINI_API_KEY` from `frontend/.env.local` (or set to an invalid value), reload
   - Tap Explain → verify the generic "temporarily unavailable" error appears (NOT "API key missing")
   - Check the browser console — the specific `[BB-30] Gemini key missing` error is logged there
   - Restore the key and reload
10. **Verify network error flow:**
    - Open browser devtools → Network tab → enable "Offline"
    - Tap Explain → verify "Couldn't load an explanation right now" appears with a retry button
    - Disable offline, click retry → verify the request succeeds
11. **Verify the 1 Corinthians 13 integration test from the spec:**
    - Tap any verse in 1 Corinthians 13
    - Tap Explain this passage
    - Read the explanation
    - Verify it mentions Paul's rhetorical context, the literary structure, and does NOT read like a wedding speech ("love is patient, love is kind" context matters)
    - Verify it does not end with "so what does this mean for you" or similar
    - Verify it does not say "God is telling you" anywhere
12. **Verify accessibility:**
    - Close devtools, reopen the sheet, tap Explain
    - Use keyboard-only navigation: `Tab` through the sub-view, verify the retry button (if any) is focusable
    - Trigger VoiceOver (macOS) or screen reader and verify the explanation text is read in full
    - Verify the disclaimer is read as part of the flow, not skipped
13. **Verify lighthouse accessibility score** (acceptance criterion 36):
    - Open Chrome DevTools → Lighthouse
    - Run Accessibility audit with the sub-view open
    - Verify score ≥95

**Auth gating:** N/A — verification is manual.

**Responsive behavior:**

- **Desktop (1440px):** sheet is 440px centered modal. Content fits. Retry button full-tap-target.
- **Tablet (768px):** same 440px modal.
- **Mobile (375px):** full-width bottom sheet. Context strip, explanation, and disclaimer all fit without horizontal scroll. Body text wraps at the container width.

Test all three by resizing the browser or using DevTools device toolbar.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- **Do NOT run this with production keys connected to a billed project you don't control.** Use your dev key.
- **Do NOT commit any captured output from this step to a public branch.**
- **Do NOT skip the error-state verification.** The spec's acceptance criteria 9–13 depend on them.
- **Do NOT modify `explainPassagePrompt.ts` during this verification unless Step 10's iteration process approves it.** If manual verification surfaces a new failure mode, add it to Step 10's iteration queue.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Dev server runs without error | manual | `pnpm dev` starts on :5173 |
| Explain action is visible in the action sheet | manual | UI inspection |
| Loading state renders with skeleton | manual | UI inspection |
| Success state renders with disclaimer | manual | UI inspection |
| Key-missing error shows generic copy | manual | temporarily break key |
| Network-offline error shows network copy + retry | manual | devtools offline mode |
| Retry button re-fires request | manual | click retry after error |
| Back button returns to main view | manual | click Back |
| Full-flow test with 1 Corinthians 13 matches spec expectations | manual | read the output |
| Keyboard navigation works | manual | Tab through the sheet |
| Lighthouse accessibility score ≥95 | manual | run audit |
| Mobile/tablet/desktop all render correctly | manual | resize browser |

12 manual checks.

**Expected state after completion:**

- [ ] All 12 manual checks pass
- [ ] Screenshots optional but recommended — save to `_plans/recon/screenshots/bb30-*.png` if captured
- [ ] Any issues surfaced during verification are logged as new steps or iterated in Step 10

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Install `@google/genai` + scaffold `frontend/src/lib/ai/` directory |
| 2 | 1 | Typed error classes |
| 3 | 1 | System prompt + user prompt builder |
| 4 | 1, 2, 3 | Gemini client — consumes errors and prompts |
| 5 | 4 | `useExplainPassage` hook — consumes client |
| 6 | — | Presentational components (disclaimer, loading, error) — independent |
| 7 | 5, 6 | `ExplainSubView` — consumes hook and presentational components |
| 8 | 7 | Wire into `verseActionRegistry` — consumes ExplainSubView |
| 9 | 8 | Integration test at VerseActionSheet level — consumes full pipeline |
| 10 | 4 | Prompt testing — consumes client but is content work (can run in parallel with 5-9 if desired, but must complete before ship) |
| 11 | 9, 10 | Manual verification in dev — requires everything working |

**Critical path:** 1 → 2 → 3 → 4 → 5 → 7 → 8 → 9 → 11

**Parallelizable:** Step 6 (presentational components) can run in parallel with Steps 2–4. Step 10 (prompt testing) can run in parallel with Steps 5–9 once Step 4 is complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Install `@google/genai` + scaffold `lib/ai/` | [COMPLETE] | 2026-04-10 | Installed `@google/genai@1.49.0`. Created `frontend/src/lib/ai/{errors,geminiClient}.ts` and `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` as stubs. Build passes. |
| 2 | Typed error classes (`errors.ts`) | [COMPLETE] | 2026-04-10 | 5 typed error classes. ES2020 tsconfig does not expose `cause` in the Error constructor's options arg, so `cause` is set manually via `Object.defineProperty` in an `assignCause()` helper. 25 unit tests pass. |
| 3 | System prompt + user prompt builder (`explainPassagePrompt.ts`) | [COMPLETE] | 2026-04-10 | System prompt + user prompt builder copied verbatim from spec. 13 tests pass. |
| 4 | Gemini client (`geminiClient.ts`) | [COMPLETE] | 2026-04-10 | Lazy init, `systemInstruction` routing, `AbortSignal.timeout(30_000)`, safety block detection (3 paths), error classification to 5 typed errors. 23 tests pass. Test mocks use `vi.hoisted` + function declaration for constructor-mock compatibility. |
| 5 | `useExplainPassage` hook | [COMPLETE] | 2026-04-10 | Hook with loading/success/error states, retry, unmount guard. Added empty-args guard (`if (!reference \|\| !verseText) return`) so the over-limit ExplainSubView path doesn't fire a network call — this supported the Step 9 integration test assertion. 12 tests pass. |
| 6 | Presentational components (Disclaimer, Loading, Error) | [COMPLETE] | 2026-04-10 | 3 presentational components + 13 tests. Loading respects `prefers-reduced-motion`. Disclaimer text exact to spec. |
| 7 | `ExplainSubView.tsx` | [COMPLETE] | 2026-04-10 | Main sub-view following CrossRefsSubView pattern (no self-rendered chrome). Tier 2 context strip, 20-verse cap, effectiveStatus override for over-limit. 18 tests pass. |
| 8 | Wire into `verseActionRegistry` | [COMPLETE] | 2026-04-10 | Replaced `stubSubView('AI explain ships in BB-30')` with `React.createElement(ExplainSubView, props)`. Added `explain` to the exclusion list in the existing `'sub-view stubs render placeholder'` test. Added 5 new explain-specific registry tests. 52 tests in the suite pass. |
| 9 | Integration test at VerseActionSheet level | [COMPLETE] | 2026-04-10 | 7 integration tests at the sheet level, mocking only at the `geminiClient` boundary. Exercises full hook → client → error-mapping chain. All 7 pass. |
| 10 | Run prompt testing (8 passages) + capture to recon | [COMPLETE] | 2026-04-10 | Ran `frontend/scripts/bb30-run-prompt-tests.ts` against real Gemini API. 8/8 passages returned successfully (word counts 245-380, all in range). Prose evaluation written to `_plans/recon/bb30-prompt-tests.md`. **Round 1 result: 8/8 PASS on all rules** — no iteration needed. Prompt v1 stays as-is. |
| 11 | Manual verification in dev | [NOT STARTED] | | Manual step — handed off to developer. Requires browser interaction, offline mode, Lighthouse audit. Cannot be automated. |
