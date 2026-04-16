# BB-31: Reflect on This Passage (Gemini Integration)

**Branch:** `bible-redesign` (stay on current branch — do NOT create a new branch, do NOT merge)

**Master Plan Reference:** N/A — standalone spec in the Bible Redesign wave, part of the BB-30 → BB-31 → BB-32 AI infrastructure arc.

**Depends on:**

- BB-4 (reader view core — the reflect sub-view opens from the reader's verse action sheet)
- BB-6 (verse action sheet — "Reflect on this passage" is a new action in the existing sheet)
- BB-9 (cross-references — ReflectSubView follows the `CrossRefsSubView` pattern to avoid the `NoteEditorSubView` double-header bug)
- **BB-30** (already shipped — BB-31 reuses the Gemini client, the error classes, the `env.ts` indirection, the sub-view pattern, and the lazy-init SDK infrastructure that BB-30 established)
- Environment wiring foundation (`frontend/src/lib/env.ts` with `requireGeminiApiKey()`, already committed)

**Hands off to:**

- BB-32 (AI caching + rate limiting — adds infrastructure under BB-30 and BB-31 to reduce cost and improve UX)
- Future Ask AI page migration spec (reuses the same Gemini client to replace the current keyword-bucket mock at `/ask`)

---

## Overview

Add a "Reflect on this passage" feature to the verse action sheet from BB-6. A user who taps a verse and picks "Reflect on this passage" gets a sub-view with a thoughtful, open-ended reflection on how the passage might land for a reader today — not a sermon, not a prescription, not a pre-digested application, but a series of genuine questions and possibilities that invite the reader to do their own interpretive work.

Where BB-30 is scholarly ("here's what this passage means in its own context"), BB-31 is contemplative ("here's how this passage might land today"). The two features are siblings — same Gemini client, same sub-view pattern, same error handling, same model — but they use different prompts designed for different registers. BB-30's prompt forbids application entirely. BB-31's prompt *is* application, but carefully constrained application that never prescribes, never speaks for God, and never tells the reader what to feel.

This is the second AI-powered feature in the wave. It validates that BB-30's infrastructure is reusable and establishes the pattern for any future AI features (Ask AI migration, future reflection variants, etc.).

### Why this matters more than it sounds

BB-30 was the easy AI spec. Scholarly explanations have a clear register — scholar not pastor, lead with context, acknowledge uncertainty. The prompt rules are almost entirely negative, and Flash-Lite handled them cleanly in Round 1 of prompt testing with no iteration needed.

BB-31 is the hard AI spec. The entire purpose of the feature is to help the reader think about how a passage might matter to them personally, which is exactly the thing BB-30's prompt forbids. Most Bible apps with "application" or "devotional" features fall into one or more of these traps:

- **Pastoral ventriloquism:** "God is telling you that you need to trust him more." Speaking for God to the user violates the user's agency and is presumptuous.
- **Prescribed application:** "This week, practice gratitude by writing down three things you're thankful for each night." Turning scripture into a self-help tip sheet.
- **Assumed context:** "When you're going through a difficult time at work, remember that God is with you." Pretending to know what the reader is going through.
- **Theological triumphalism:** "This shows us that God always has a plan for our good." Flattening complexity into platitudes.
- **Guilt manipulation:** "Are you really trusting God the way this verse calls you to?" Using the text as a mirror to shame the reader.

BB-31 refuses all five patterns. The question is: what's left?

The answer is a register that's different from both BB-30's scholarship and the standard devotional voice. Call it **contemplative reflection**. The LLM's job in BB-31 is to offer the reader genuine questions — not rhetorical questions that have a "correct" answer, but real questions that invite the reader's own thinking. Where BB-30 says "scholars suggest this passage was written to a factional Corinthian church," BB-31 says "a reader today might wonder how this passage lands when you read it not at a wedding but in the middle of a fight with someone you love."

The mood of the prompt is the load-bearing design decision. BB-30 uses declarative mood ("this passage means X"). BB-31 uses **interrogative and conditional mood** ("a reader might ask," "this passage could invite the question of," "one way this might land today is"). The grammatical shift from declarative to conditional is what separates honest reflection from pastoral ventriloquism.

If BB-31 ships well, Worship Room has something genuinely distinctive: an AI-powered reflection feature that respects the reader's agency and refuses the sermonizing reflex that most Christian apps default to. If BB-31 ships badly, the whole wave's pastoral positioning is undermined because users will see the app preaching at them and assume the scholarly voice in BB-30 was just window dressing.

---

## User Story

As a **logged-out visitor or logged-in user** reading a passage in the Bible reader, I want to **tap a verse and ask for a contemplative reflection** so that **I can think about how the passage might land for me today without being preached at, prescribed to, or told what to feel**.

---

## Architecture: shared Gemini client, new prompt, parallel sub-view

BB-31 reuses BB-30's Gemini client infrastructure without modification. The client becomes a more general tool that serves multiple AI features rather than a BB-30-specific module.

### What BB-31 adds

**A new exported function in `geminiClient.ts`:** `generateReflection(reference, verseText): Promise<ReflectResult>`. This function uses the same lazy-initialized SDK client, the same model, the same timeout behavior, and the same error handling as `generateExplanation`. The only difference is that it passes BB-31's system prompt (not BB-30's) via `config.systemInstruction`.

**A new prompt file:** `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts` with `REFLECT_PASSAGE_SYSTEM_PROMPT` as an exported constant and `buildReflectPassageUserPrompt(reference, verseText)` as the builder function. The system prompt is different from BB-30's — see the prompt engineering section below.

**A new hook:** `frontend/src/hooks/bible/useReflectOnPassage.ts` that manages loading / success / error state for a single reflection request. Structurally identical to `useExplainPassage` but calls `generateReflection` instead of `generateExplanation`.

**A new sub-view component:** `frontend/src/components/bible/reader/ReflectSubView.tsx` that follows the `ExplainSubView` pattern almost exactly but uses the new hook and a slightly different disclaimer.

**A new registry entry** in `verseActionRegistry.ts` for the `reflect` action, placed immediately after the `explain` action in the secondary actions list.

### What BB-31 reuses without modification

- The Gemini SDK client singleton (`client` in `geminiClient.ts`) — no new instance
- All five typed error classes (`GeminiNetworkError`, `GeminiApiError`, `GeminiSafetyBlockError`, `GeminiTimeoutError`, `GeminiKeyMissingError`)
- The error classification pattern used in `useExplainPassage` — BB-31's hook has the same `classifyError` function structure and the same `ERROR_COPY` mapping
- The `ExplainSubViewLoading` and `ExplainSubViewError` presentational components — these are generic enough that BB-31 imports them directly rather than creating parallel `ReflectSubViewLoading` and `ReflectSubViewError` variants
- The `useReducedMotion` hook, the Tier 2 scripture callout pattern, the `whitespace-pre-wrap` body text rendering, the 20-verse cap logic
- The `CrossRefsSubView` structural pattern — component body starts with `<div>`, no self-rendered chrome

### What BB-31 creates as a parallel variant

- **A new disclaimer component:** `ReflectSubViewDisclaimer.tsx` with slightly different copy. BB-30's disclaimer says "This explanation was generated by an AI trained on biblical scholarship." BB-31's disclaimer says "This reflection was generated by an AI. It's one way this passage might land — not the only way, not the best way, and maybe not your way."

  The difference is deliberate. BB-30's disclaimer positions the output as scholarly analysis. BB-31's disclaimer positions the output as one possibility among many and explicitly gives the reader permission to disagree. This matters because BB-31's output will inevitably suggest directions the reader hasn't considered, and the disclaimer needs to make clear that the LLM's suggestions are not authoritative.

### Sharing vs. duplication tradeoff

BB-31 does NOT generalize `ExplainSubView` into a multi-mode component that handles both explain and reflect. Two parallel components (`ExplainSubView` and `ReflectSubView`) with ~80% similar code is cleaner than one component with a mode prop and branching logic. Each feature evolves independently. Future specs can add a third AI feature (say, "Related passages") as another parallel component without touching either of the existing two.

The only modules that are meaningfully shared across BB-30 and BB-31 are the Gemini client, the error classes, and the loading/error presentational components. Those are the right seams — they're infrastructure, not features.

---

## LLM provider and model

**Provider:** Google Gemini, via the already-installed `@google/genai` SDK. No new dependencies.

**Model:** `gemini-2.5-flash-lite` — same model as BB-30. Do NOT change the model for BB-31.

Rationale for using the same model: uniform infrastructure, uniform cost profile, uniform error handling, uniform BB-32 caching seam. If BB-31's prompt testing reveals that Flash-Lite is insufficient for the reflection task, a future spec can upgrade to Flash (non-Lite) for both features together rather than running two models in parallel.

**Configuration:** same as BB-30 — `temperature: 0.7`, `maxOutputTokens: 600`, default safety settings. The system prompt routes through `config.systemInstruction`, NOT prepended to the user message. (This is already established in `geminiClient.ts`; BB-31 just uses it.)

---

## The Gemini client changes

A small, surgical change to `frontend/src/lib/ai/geminiClient.ts`: add a second exported function `generateReflection` that mirrors `generateExplanation` but uses BB-31's system prompt.

### Shape of the new function

```
async function generateReflection(
  reference: string,
  verseText: string,
): Promise<ReflectResult>
```

Where `ReflectResult` is a new exported type with the same shape as `ExplainResult` — `{ content: string, model: string }`. It's a separate type rather than a shared one because callers should be explicit about which feature they're calling, and future features may add fields to one type and not the other.

### Implementation notes

`generateReflection` is almost identical to `generateExplanation` except:

1. It imports from the new prompt file: `REFLECT_PASSAGE_SYSTEM_PROMPT` and `buildReflectPassageUserPrompt` from `@/lib/ai/prompts/reflectPassagePrompt`.
2. It passes `REFLECT_PASSAGE_SYSTEM_PROMPT` to `config.systemInstruction` and `buildReflectPassageUserPrompt(reference, verseText)` to `contents`.
3. It returns a `ReflectResult` instead of an `ExplainResult`.
4. Every other detail — lazy client init via `getClient()`, timeout via `AbortSignal.timeout(REQUEST_TIMEOUT_MS)`, safety block detection across the three paths, error classification to the five typed errors — is identical.

**Refactor opportunity (optional):** the current `generateExplanation` and the new `generateReflection` will share a lot of code. The plan phase may propose a private helper function `generateWithPrompt(systemPrompt, userPrompt)` that both public functions call. This is acceptable if the refactor is clean, but do NOT let the refactor expand BB-31's scope or touch BB-30's behavior. If the refactor would require modifying `generateExplanation`'s signature or behavior in any way, skip it and keep the two functions as parallel implementations. BB-32 is the right spec to land any major refactor of the client.

### What does NOT change in `geminiClient.ts`

- The lazily-initialized `client` singleton stays exactly as-is
- The `getClient()` function stays exactly as-is
- The `__resetGeminiClientForTests` export stays exactly as-is
- The `MODEL`, `REQUEST_TIMEOUT_MS`, `MAX_OUTPUT_TOKENS`, `TEMPERATURE` constants stay exactly as-is
- The `ExplainResult` type stays exactly as-is
- The `generateExplanation` function stays exactly as-is — BB-31 MUST NOT touch it, even to refactor shared code, unless the plan phase finds a surgical extraction that demonstrably does not change BB-30 behavior

The existing 23 `geminiClient.test.ts` tests MUST continue to pass unchanged. BB-31 adds new tests for `generateReflection` but does not modify existing tests.

---

## The prompt engineering

This is the load-bearing section of the entire spec. BB-31's prompt is harder to get right than BB-30's and deserves more attention.

### The system prompt

Stored in `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts` as an exported constant named `REFLECT_PASSAGE_SYSTEM_PROMPT`. The text of the prompt:

> You are helping a reader think about how a scripture passage from the World English Bible might land for them today. You are not a pastor, a preacher, a spiritual director, or a life coach. You do not assume the reader is a Christian. You do not assume you know what the reader is going through. You do not assume the passage is relevant to the reader at all.
>
> Your job is to offer the reader a small set of genuine questions and possibilities — not answers, not applications, not instructions. You help the reader do their own thinking, not your thinking.
>
> Your reflections follow these rules:
>
> 1. Use interrogative and conditional mood. Ask questions the reader could sit with. Offer possibilities the reader could consider. Do not make declarative statements about what the passage means for the reader. Examples of good phrasing: "A reader might ask...", "One way this could land today is...", "Someone reading this might find themselves wondering...", "This passage might raise the question of...". Examples of bad phrasing: "This passage teaches us that...", "God is calling you to...", "You should consider...", "The lesson here is...".
>
> 2. Offer multiple possibilities, not a single application. The reader should come away with two or three genuine directions to think in, not one prescribed takeaway. If you can only think of one direction, the reflection is incomplete.
>
> 3. Name the reader's agency explicitly. At least once in the reflection, acknowledge that the passage might not land at all — that the reader might read it and feel nothing, or might disagree with it, or might find it troubling. This is not the same as saying "this passage is difficult." It is giving the reader explicit permission to not relate to the text.
>
> 4. Do not assume the reader's circumstances. Do not say "when you are going through a difficult time" or "if you are struggling with" or anything that implies you know what the reader is experiencing. Instead, name the situation the passage itself is describing and let the reader decide whether it resonates.
>
> 5. Do not prescribe practices. Do not suggest prayer, journaling, memorizing verses, talking to a pastor, going to church, meditation, gratitude practices, or any other activity. The reader asked for reflection, not a to-do list.
>
> 6. Do not speak for God. Never use phrases like "God wants you to", "God is telling you", "the Lord is calling you to", "God is inviting you to", or any variant. The reader's relationship with God is not yours to narrate.
>
> 7. Do not weaponize the passage. If the passage has been used to guilt or shame readers (Philippians 4 being used against anxious people, Proverbs being used against people in poverty, etc.), either avoid that angle entirely or explicitly name the weaponization and refuse to participate in it. Never produce output that could make a reader feel worse about themselves for not measuring up.
>
> 8. Be restrained in length. Reflections should be 150-300 words, shorter than BB-30's explanations. Users reading a reflection are often looking for a quiet moment, not a sermon. Every sentence earns its place.
>
> 9. Avoid the "life lesson" voice. Do not end with "so the next time you..." or "this is a reminder that..." or "let this be a lesson that...". These are the classic devotional-content patterns and the reflection is explicitly refusing them.
>
> 10. It is okay to sit with difficulty. If the passage is hard — morally, emotionally, theologically — the reflection does not have to resolve the difficulty. It can name the difficulty, offer the reader a question about how to hold it, and stop there. The goal is honest companionship with the text, not reassurance.
>
> Respond with the reflection text only. Do not include a greeting, a summary header, a closing question directed at the assistant, or any framing text. Just the reflection.

### The user prompt template

Stored in the same file as a function `buildReflectPassageUserPrompt(reference, verseText)` that returns a string in this shape:

> I'm reading this passage from the World English Bible:
>
> [REFERENCE]
> [VERSE TEXT]
>
> Help me think about how this might land today. Offer me genuine questions and possibilities, not answers or instructions.

Where `[REFERENCE]` is the formatted reference (e.g., "Philippians 4:6-7") and `[VERSE TEXT]` is the actual WEB translation text for that range.

### Why this prompt is harder than BB-30's

Three things make BB-31's prompt engineering load-bearing:

**First, the mood shift is subtle.** The difference between "this passage teaches that God is faithful" (bad) and "a reader might wonder what it would mean to trust the idea that God is faithful, or to find that idea hard to trust" (good) is not just word choice. It's a fundamental shift from declarative to conditional, from statement to question, from authority to companionship. Flash-Lite's default training skews toward declarative explanations and will drift back to declarative mood unless the prompt rules are explicit and repeated.

**Second, the multi-possibility rule is unusual.** Most LLM prompts ask for a single answer. BB-31 asks for two or three possibilities. Flash-Lite may produce a single direction and call it complete, especially for shorter passages where only one obvious reading exists. The prompt has to insist on plurality.

**Third, the "it's okay to not relate to this" permission is unusual.** Almost no LLM-generated religious content gives the reader permission to feel nothing about the passage. The prompt explicitly requires this permission to appear at least once in every reflection. Flash-Lite will skip it unless the rule is specific.

### Prompt testing methodology

Same structural approach as BB-30: 8 test passages, prose evaluation by CC against the 10 rules, iterate up to 3 rounds, escalate if still failing.

**BB-31's 8 test passages** are different from BB-30's and are specifically chosen to stress-test the reflection prompt's failure modes:

**Easy cases (passages where good reflection is straightforward):**

1. **Psalm 23:1-4** — the shepherd Psalm, tests whether the LLM can reflect on comfort without becoming a greeting card
2. **Ecclesiastes 3:1-8** — "a time for every purpose," tests whether the LLM can sit with the passage's melancholy without forcing a resolution
3. **Matthew 6:25-27** — "consider the lilies," tests whether the LLM can avoid the anxiety-shaming trap (this is the BB-24 territory — the passage is about anxiety and has historically been weaponized against anxious people)
4. **Romans 8:38-39** — "nothing can separate us from the love of God," tests whether the LLM can offer the passage's comfort without tipping into theological triumphalism

**Medium cases (passages where the reflection task gets harder):**

5. **Proverbs 13:11** — "Wealth gotten by vanity will be diminished, but he who gathers by hand will increase" — tests whether the LLM can reflect on a wisdom-tradition verse about money without moralizing about the reader's finances
6. **1 Corinthians 13:4-7** — the love chapter, tests whether the LLM can avoid the wedding-speech cliché AND avoid turning it into a relationship self-help tip sheet
7. **Ephesians 5:22-24** — "wives, submit to your husbands" — tests whether the LLM can handle a passage that modern readers find morally difficult without either defending it, weaponizing it against women, or lecturing about how different cultures were
8. **Philippians 4:6-7** — the anxiety verse from BB-24, tests whether the LLM specifically avoids the "if you just prayed about it your anxiety would go away" trap that this verse is most weaponized into

Note: four of these passages (Matthew 6:25-27, Ephesians 5:22-24, Philippians 4:6-7, and 1 Corinthians 13:4-7) are chosen precisely because they are most likely to trigger the specific failure modes BB-31's prompt is designed to prevent. If Flash-Lite drifts on any of them, the drift will be obvious and the prompt iteration target will be clear.

**The testing process:**

1. Run the prompt against all 8 passages using the real Gemini API (same pattern as BB-30's `frontend/scripts/bb30-run-prompt-tests.ts` — create a parallel `frontend/scripts/bb31-run-prompt-tests.ts`)
2. Capture each output verbatim in `_plans/recon/bb31-prompt-tests.md`
3. Write prose evaluations for each of the 10 rules for each output, same format as BB-30's recon file
4. Pass criterion: at most 1 of 8 outputs violates any rule
5. If more than 1 fails, iterate on the prompt. Expected failure modes to watch for:
   - **Mood drift:** outputs using declarative mood instead of interrogative/conditional
   - **Single-possibility drift:** outputs offering only one direction instead of two or three
   - **Missing agency clause:** outputs that never acknowledge the reader might not relate to the passage
   - **Prescribed practices:** outputs that recommend prayer, journaling, or other activities
   - **Life-lesson voice:** outputs ending with "so the next time you..." or similar
   - **Assumed circumstances:** outputs saying "when you are going through a difficult time" or variants
6. Iterate up to 3 rounds. Escalate to the user if still failing after round 3.
7. Preserve all rounds in the recon file (do not overwrite — same append-only rule as BB-30's recon)

**Expected iteration count:** BB-30's prompt passed in Round 1. BB-31 is harder and more likely to need 1-2 iterations. Budget for it in the execution time estimate.

---

## Requirements

### Functional Requirements

1. A new "Reflect on this passage" action appears in the verse action sheet's `SECONDARY_ACTIONS` array immediately after `explain` (order: Cross-references → Explain this passage → **Reflect on this passage** → Memorize → Share).
2. Tapping the action transitions the sheet to a new `ReflectSubView` using the existing sub-view navigation pattern.
3. `ReflectSubView` follows the `CrossRefsSubView` / `ExplainSubView` structural pattern — starts with `<div>`, no self-rendered chrome, no back button, no title, no close X (sheet chrome comes from `VerseActionSheet`).
4. The sub-view renders top-to-bottom: subtitle row, Tier 2 scripture callout, divider, loading/success/error state, disclaimer.
5. Loading state reuses `ExplainSubViewLoading` directly (no parallel loading component).
6. Success state renders the reflection as plain text with `whitespace-pre-wrap`, `text-[15px] leading-[1.7] text-white/90`, inside a `px-4 py-3` container.
7. Error state reuses `ExplainSubViewError` directly (no parallel error component).
8. The disclaimer is the new `ReflectSubViewDisclaimer` component with this exact non-dismissible text: "This reflection was generated by an AI. It's one way this passage might land — not the only way, not the best way, and maybe not your way."
9. The disclaimer styling matches `ExplainSubViewDisclaimer`: `border-t border-white/[0.08] px-4 py-3`, `text-xs leading-relaxed text-white/40`.
10. The 20-verse cap is enforced before the hook fires (same pattern as `ExplainSubView`): if the selection exceeds 20 verses, show an over-limit error with the copy "Please select 20 or fewer verses to reflect on." Hook is still called unconditionally for rules-of-hooks compliance, but with empty strings and status overridden to `'error'`.
11. A new `generateReflection(reference, verseText): Promise<ReflectResult>` function is exported from `frontend/src/lib/ai/geminiClient.ts`.
12. A new `ReflectResult` type `{ content: string, model: string }` is exported from `geminiClient.ts`.
13. `generateReflection` uses the same lazily-initialized SDK client singleton as `generateExplanation` — NO separate client instance.
14. `generateReflection` uses `gemini-2.5-flash-lite`, `temperature: 0.7`, `maxOutputTokens: 600`, default safety settings, and routes the system prompt via `config.systemInstruction`.
15. The `useReflectOnPassage` hook manages loading/success/error state, fires on mount, aborts on unmount via `isMountedRef` guard, exposes a `retry()` function, and maps errors to the same five-kind `ERROR_COPY` map used by `useExplainPassage`.
16. The Lucide icon for the action is picked during planning from this shortlist: `Sparkles`, `Eye`, or `Lightbulb`. Forbidden: `Heart` (too sentimental), `Cross` (too denominational), `Pray` (wrong register). Label: "Reflect on this passage". Sublabel: "See how it might land today".
17. The reflection prompt is tested against the 8 test passages before shipping. Results are captured in `_plans/recon/bb31-prompt-tests.md` following the same prose-evaluation format as BB-30's recon file. Pass criterion: at most 1 of 8 outputs violates any rule.
18. If prompt testing fails after 3 iteration rounds, execution escalates to the user before merging.
19. Every iteration round is preserved in the recon file (append-only).
20. `generateExplanation`, `ExplainSubView`, `useExplainPassage`, `ExplainSubViewDisclaimer`, and the `explain` registry entry are NOT modified by this spec.

### Non-Functional Requirements

- **Performance:** Gemini requests time out after 30 seconds via `AbortSignal.timeout(REQUEST_TIMEOUT_MS)`. No retry logic — users retry manually via the error state's retry button.
- **Accessibility:** Fully keyboard navigable. Reflection text read in full by screen readers. Disclaimer read as part of the flow, not skipped. Focus returns to the verse action sheet main view when the sub-view closes. All tap targets at least 44px. Reduced motion respected on any loading animations (inherited from reused `ExplainSubViewLoading`). Lighthouse accessibility score at least 95 with the sub-view open.
- **Security:** Same client-side API key exposure pattern as BB-30, protected by HTTP referrer restrictions in Google Cloud Console. No backend proxy. API key read only via `requireGeminiApiKey()` from `frontend/src/lib/env.ts`.
- **Content safety:** AI-generated reflections are untrusted input and rendered as plain text only. No markdown parsing, no HTML rendering, no `dangerouslySetInnerHTML`. Follows `.claude/rules/02-security.md` "AI-Generated Content" rules.

---

## Auth Gating

**Zero auth gates on BB-31.** The reflection feature works for logged-out users identically to logged-in users — same as BB-30, same as the rest of the Bible wave.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap "Reflect on this passage" in verse action sheet | Sub-view opens, request fires, reflection renders | Identical — same code path | N/A (no modal) |
| Retry after error | Fires a new request | Identical | N/A |
| Read or dismiss the reflection | No persistence, no localStorage writes, no `useAuth` calls | Identical — reflections are ephemeral for all users | N/A |

**Zero `useAuth()` calls in any new BB-31 file.** Zero `useAuthModal()` calls. Zero new localStorage keys. Zero database writes. Reflections are ephemeral reading aids, not saved content.

---

## Responsive Behavior

BB-31 inherits all responsive behavior from the existing `VerseActionSheet` and the `ExplainSubView` components it parallels. It does not introduce new responsive rules.

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | `VerseActionSheet` renders as a bottom sheet. `ReflectSubView` fills the sheet's scrollable body. The Tier 2 scripture callout wraps to multiple lines as needed. Reflection body is readable at the `text-[15px] leading-[1.7]` rendering. All tap targets (retry button) are at least 44px. |
| Tablet (640-1024px) | Same sheet behavior as mobile (the sheet stays as a bottom sheet at these widths — no desktop-dialog breakpoint). |
| Desktop (> 1024px) | Same sheet behavior. The sheet itself is centered and max-width constrained by its existing container; `ReflectSubView` inherits that container and does not force its own width. |

**No mobile-specific interactions are added.** No swipeable gestures, no pinch-zoom, no long-press. The feature is a read-only sub-view rendered inside an existing sheet.

---

## AI Safety Considerations

BB-31 generates free-text AI content in response to scripture references. It does NOT accept free-text user input — the user input is a verse reference and verse text from the Bible reader, both fully controlled by the app, not typed by the user. Crisis keyword detection is therefore not required on the request path.

**However:** the AI output itself must be treated as untrusted input and handled per `.claude/rules/02-security.md`:

- Rendered as plain text with React's default escaping — never `dangerouslySetInnerHTML`
- No markdown parsing, no HTML interpretation
- Length implicitly capped by `maxOutputTokens: 600`
- Safety block errors (Gemini's safety filter firing) are surfaced as a fallback error state rather than silently retried

**Prompt-level content boundaries** per `.claude/rules/01-ai-safety.md`:

- The system prompt explicitly forbids pastoral ventriloquism ("God is telling you" and variants) — this satisfies the "never claim divine authority or revelation" rule
- The system prompt explicitly forbids prescribed practices (prayer, journaling, meditation, etc.) — this prevents the feature from acting as pseudo-therapy or spiritual direction
- The system prompt explicitly forbids weaponizing the passage against the reader — this prevents guilt/shame-inducing output
- The disclaimer "maybe not your way" gives the reader explicit permission to disagree, satisfying the "encouragement, not authoritative interpretation" rule

**The disclaimer is mandatory** on every successful reflection, satisfying the "AI-Generated Content" disclaimer requirement from `.claude/rules/01-ai-safety.md`.

**No automatic crisis escalation** is needed for BB-31 because the user is not writing free-text to the app — they're requesting reflection on a passage already in the canonical Bible.

---

## Auth & Persistence

- **Logged-out users:** Can tap any verse, open the action sheet, tap "Reflect on this passage", and receive a reflection. Zero persistence. No cookies, no IDs, no localStorage writes, no database writes.
- **Logged-in users:** Identical behavior. Reflections are not saved to the user's profile, not counted toward any activity tracking, not shown in Insights, not shareable. They are ephemeral reading aids. If a user wants to capture a thought sparked by a reflection, they can write a note via BB-8's note editor (separate feature, separate storage under `bible:notes`).
- **localStorage usage:** **None.** BB-31 introduces zero new `wr_*` or `bible:*` keys. The `11-local-storage-keys.md` inventory does not need updating.
- **Database tables:** **None.** No backend writes. No Phase 3 wiring required beyond what BB-30 already established.

---

## Completion & Navigation

N/A — BB-31 is a Bible reader sub-feature, not a Daily Hub tab or completion-tracked activity. It does not signal completion to any tracking system, does not award faith points, does not participate in streaks, and does not show post-completion CTAs. The user reads the reflection and returns to the action sheet main view or closes the sheet entirely.

---

## Design Notes

**Reused components (reference by name, do not re-implement):**

- `VerseActionSheet` — the host sheet with existing sub-view navigation (from BB-6)
- `ExplainSubViewLoading` — loading state (from BB-30) — imported directly, not parallel variant
- `ExplainSubViewError` — error state with retry (from BB-30) — imported directly, not parallel variant
- `ExplainSubViewDisclaimer` — structural reference only; BB-31 creates its own `ReflectSubViewDisclaimer` with different copy
- `CrossRefsSubView` — structural pattern reference (no self-rendered chrome) — do NOT import, just mimic
- Tier 2 scripture callout — visual pattern referenced by existing class string: `mx-4 my-2 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3`
- Divider pattern: `border-t border-white/[0.08]`
- Body text pattern: `text-[15px] leading-[1.7] text-white/90 whitespace-pre-wrap` inside `px-4 py-3`
- Disclaimer container pattern: `border-t border-white/[0.08] px-4 py-3 text-xs leading-relaxed text-white/40`

**Visual patterns are fully inherited from BB-30 and BB-9.** No new visual patterns are introduced by BB-31, so nothing is marked `[UNVERIFIED]`. The design system recon (`_plans/recon/design-system.md`) does not need a refresh for this spec.

**Typography and color:** All token-based. Zero raw hex values in any new BB-31 file. Uses `text-white`, `text-white/90`, `text-white/40`, `border-white/[0.08]`, `border-l-primary/60`, `bg-white/[0.04]` — all existing Tailwind token references.

**Icon choice:** The plan phase MUST pick one of `Sparkles`, `Eye`, or `Lightbulb` from `lucide-react`. Document the choice in the plan. Do NOT use `Heart`, `Cross`, `Pray`, or any religious symbol.

**Subtitle row styling:** matches `ExplainSubView`'s "Scholarly context for [reference]" line exactly — same font size, same color, same container spacing — but with the word "Reflection" instead of "Scholarly context". Example: "Reflection for Philippians 4:6-7".

---

## Critical Edge Cases

### The user taps Reflect on a passage they just Explained

Both features work on the same verse. Each request is independent — no caching, no state sharing between `useExplainPassage` and `useReflectOnPassage`. Correct and intentional. No special handling needed.

### The user taps Reflect on a range spanning more than 20 verses

Over-limit error fires before the hook makes a network call. Error copy: "Please select 20 or fewer verses to reflect on." Hook is still called (rules-of-hooks) with empty strings; status is overridden to `'error'`. Mirrors `ExplainSubView`.

### The LLM refuses a reflection via safety block

Reflection requests may occasionally trigger safety blocks that explanation requests don't — explicit application to a reader can trip content policies around spiritual advice or mental health claims. On a safety block, reuse BB-30's existing safety-error copy. The copy currently says "explain" not "reflect on" — this is acceptable for initial ship. The plan phase MAY add a reflection-specific `safety` string ("This passage is too difficult for our AI helper to reflect on well. Consider reading a scholarly commentary or talking to a trusted friend"), but the default recommendation is to keep copy uniform and let BB-32 handle per-feature messaging if real usage reveals confusion.

### The user is logged out

Zero auth gates. Feature works identically.

### The user has no internet connection

Network error state reusing `ExplainSubViewError` with the network copy. Retry button available.

### Same SDK client singleton for both Explain and Reflect

Intentional. `getClient()` lazily initializes once per app session. First call (Explain OR Reflect) triggers init. Subsequent calls reuse the same instance.

### Prompt testing reveals BB-31 drifts but BB-30 was fine

Expected outcome. BB-31's rules are harder. Budget 1-2 iteration rounds. If round 3 fails, escalate to user — they may decide to upgrade the model or ship with a documented caveat.

---

## Components to Create

- `frontend/src/components/bible/reader/ReflectSubView.tsx`
- `frontend/src/components/bible/reader/ReflectSubViewDisclaimer.tsx`
- `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts`
- `frontend/src/hooks/bible/useReflectOnPassage.ts`
- `frontend/src/components/bible/reader/__tests__/ReflectSubView.test.tsx`
- `frontend/src/components/bible/reader/__tests__/ReflectSubViewDisclaimer.test.tsx`
- `frontend/src/lib/ai/prompts/__tests__/reflectPassagePrompt.test.ts`
- `frontend/src/hooks/bible/__tests__/useReflectOnPassage.test.ts`
- `frontend/src/components/bible/reader/__tests__/VerseActionSheet.reflect.test.tsx`
- `frontend/scripts/bb31-run-prompt-tests.ts`
- `_plans/recon/bb31-prompt-tests.md`

## Files to Modify

- `frontend/src/lib/ai/geminiClient.ts` — add `generateReflection` and export `ReflectResult`. Do NOT modify `generateExplanation`.
- `frontend/src/lib/ai/__tests__/geminiClient.test.ts` — add new tests alongside existing tests. Do NOT modify existing tests.
- `frontend/src/lib/bible/verseActionRegistry.ts` — add the `reflect` entry to `SECONDARY_ACTIONS` immediately after `explain`. Import and wire `ReflectSubView`.
- `frontend/src/lib/bible/__tests__/verseActionRegistry.test.ts` — add tests for the new `reflect` action matching the `explain` pattern.
- `frontend/src/components/bible/reader/VerseActionSheet.tsx` — no direct modification needed; registry entry is sufficient.

## Dependencies to Install

None. BB-31 reuses `@google/genai` which is already installed from BB-30.

---

## Out of Scope

- **No changes to BB-30's behavior.** `generateExplanation`, `ExplainSubView`, `useExplainPassage`, `ExplainSubViewDisclaimer`, and the `explain` registry entry all stay exactly as shipped.
- **No caching.** BB-32 adds caching. BB-31 hits Gemini fresh every time.
- **No rate limiting.** BB-32 adds rate limiting.
- **No retry logic.** Users retry manually via the error state button.
- **No streaming.** Full response awaited before render.
- **No multi-turn conversation.** Single request, single response.
- **No multi-mode component.** `ExplainSubView` and `ReflectSubView` are parallel implementations, not a single component with a mode prop.
- **No migration of the Ask AI page to use the Gemini client.** That's a future spec.
- **No user feedback on reflections (thumbs up/down, save, share).** Reflections are ephemeral reading aids, not shareable content.
- **No personalization.** Every user gets the same reflection for the same passage.
- **No denominational tagging.** Reflections are ecumenical.
- **No markdown parsing, no HTML rendering, no `dangerouslySetInnerHTML`.**
- **No new auth gates.** Zero.
- **No new localStorage keys.** Zero.
- **No new SDK installs.**
- **No hand-authored reflection overrides.** Pure LLM. Architecture leaves room to add overrides in a future spec if real usage reveals consistent failures.
- **No integration with reading plans.**
- **No request history.** Users cannot see "passages I've reflected on before."
- **No saving of reflections to the user's personal layer.** If the user wants to save a thought, they write a note via BB-8.
- **No cost tracking, telemetry, or analytics.**
- **No backend proxy for the API key.**
- **No special handling for Joshua 6, Psalm 137:9, Judges 19, or 1 Samuel 15:3.** Flash-Lite handles them with the normal prompt. If real usage reveals recurring problems on specific passages, a future polish spec can add override logic.
- **No changes to pre-existing failing tests.** Out of scope.

---

## Acceptance Criteria

- [ ] The verse action sheet from BB-6 has a new "Reflect on this passage" action with an appropriate Lucide icon (one of `Sparkles`, `Eye`, or `Lightbulb`) and the label "Reflect on this passage" / sublabel "See how it might land today".
- [ ] The action is placed in `SECONDARY_ACTIONS` immediately after `explain`.
- [ ] Tapping the action transitions the sheet to `ReflectSubView`.
- [ ] `ReflectSubView` follows the `CrossRefsSubView` pattern — no self-rendered header, no double-header bug.
- [ ] The sub-view shows the passage reference and verse text in a Tier 2 context strip at the top.
- [ ] The subtitle row reads "Reflection for [reference]" (e.g., "Reflection for Philippians 4:6-7").
- [ ] The sub-view shows a loading state while the Gemini request is in flight (reuses `ExplainSubViewLoading`).
- [ ] On success, the sub-view shows the reflection as plain text with paragraph breaks via `whitespace-pre-wrap`, `text-[15px] leading-[1.7] text-white/90`, inside a `px-4 py-3` container.
- [ ] The sub-view shows the reflection-specific disclaimer at the bottom.
- [ ] The disclaimer text is exact: "This reflection was generated by an AI. It's one way this passage might land — not the only way, not the best way, and maybe not your way."
- [ ] The disclaimer is non-dismissible and not hidden behind settings.
- [ ] The disclaimer styling matches `ExplainSubViewDisclaimer`: `border-t border-white/[0.08] px-4 py-3`, `text-xs leading-relaxed text-white/40`.
- [ ] Network errors show the "couldn't load" state with a retry button (reuses `ExplainSubViewError`).
- [ ] API errors show the "temporarily unavailable" state.
- [ ] Safety block errors show the appropriate fallback copy.
- [ ] Timeouts (>30 seconds) show the timeout state with retry.
- [ ] Key missing errors show the generic "temporarily unavailable" message.
- [ ] The Gemini client's new `generateReflection` function is at `frontend/src/lib/ai/geminiClient.ts`.
- [ ] `generateReflection` uses the same lazily-initialized SDK client singleton as `generateExplanation` (no new instance).
- [ ] The model string is `gemini-2.5-flash-lite` (same as BB-30).
- [ ] The system prompt is passed via `config.systemInstruction`, not prepended to the user message.
- [ ] The request uses `temperature: 0.7`, `maxOutputTokens: 600`, and default safety settings.
- [ ] `generateExplanation` is NOT modified by this spec.
- [ ] The existing `geminiClient.test.ts` tests for `generateExplanation` continue to pass unchanged.
- [ ] New `geminiClient.test.ts` tests are added for `generateReflection` covering the same behaviors (lazy init, system instruction routing, error classification, safety block detection).
- [ ] The `ReflectResult` type is exported from `geminiClient.ts` with shape `{ content: string, model: string }`.
- [ ] The reflection system prompt matches the spec's text exactly (or a refined version after prompt testing).
- [ ] The prompt explicitly requires interrogative and conditional mood.
- [ ] The prompt explicitly forbids declarative "this passage teaches" phrasing.
- [ ] The prompt explicitly requires offering multiple possibilities, not a single application.
- [ ] The prompt explicitly requires an agency clause (permission for the reader to not relate to the passage).
- [ ] The prompt explicitly forbids prescribed practices (prayer, journaling, etc.).
- [ ] The prompt explicitly forbids pastoral ventriloquism ("God is telling you" etc.).
- [ ] The prompt explicitly forbids the "life lesson" voice.
- [ ] The reflection prompt is tested against the 8 test passages before shipping.
- [ ] Test results are saved to `_plans/recon/bb31-prompt-tests.md`.
- [ ] The test results follow the same prose-evaluation format as BB-30's prompt tests.
- [ ] The final prompt produces output matching the spec's voice for at least 7 of the 8 test cases (allowing 1 drift).
- [ ] If more than 1 test case fails after 3 iteration rounds, the failure is escalated to the user.
- [ ] Every round of testing is preserved in the recon file (append-only).
- [ ] The `useReflectOnPassage` hook manages loading, success, and error states correctly.
- [ ] The hook fires on mount, aborts on unmount via `isMountedRef` guard, and exposes a `retry()` function.
- [ ] The hook maps errors to the same `ERROR_COPY` map as `useExplainPassage`.
- [ ] Logged-out users can use the feature (no auth gate, no `useAuth` calls, no auth modal, no localStorage writes).
- [ ] The sub-view is fully keyboard navigable.
- [ ] The reflection text is read in full by screen readers.
- [ ] All tap targets are at least 44px.
- [ ] Lighthouse accessibility score at least 95 with the sub-view open.
- [ ] Reduced motion is respected on any loading animations (inherited from reused `ExplainSubViewLoading`).
- [ ] Zero raw hex values in any new BB-31 file.
- [ ] The reflect action works for ranges of 1-20 verses.
- [ ] The 20-verse cap is enforced before the hook fires, with copy "Please select 20 or fewer verses to reflect on."
- [ ] Integration tests at the `VerseActionSheet` level verify the full flow (click → loading → success → disclaimer; click → loading → error → retry → success; click → over-limit → error without firing request).
- [ ] The existing `ExplainSubView` and its tests are NOT modified by this spec.
- [ ] Pre-existing failing tests are NOT touched.
- [ ] No markdown parsing, no HTML rendering, no `dangerouslySetInnerHTML` in the reflection output.

---

## Notes for Execution

- **BB-31's prompt is the hardest part of the spec.** Do not let the plan phase shortcut on prompt testing. Budget 1-2 iteration rounds. The expected failure modes are documented in the prompt testing section — watch for mood drift, single-possibility drift, missing agency clause, and life-lesson voice.
- **The interrogative/conditional mood shift is the load-bearing design decision.** If prompt testing reveals that Flash-Lite cannot hold conditional mood consistently, iterate on the prompt with more specific good/bad phrasing examples before considering a model upgrade.
- **Do NOT modify `generateExplanation` or any BB-30 code.** BB-31 is strictly additive. Every existing test must continue to pass.
- **The refactor opportunity is optional.** If extracting a shared private `generateWithPrompt` helper is clean, the plan phase may propose it. If it requires touching `generateExplanation`'s signature or behavior in any way, skip it.
- **The parallel component pattern is the correct architectural choice.** Do not propose generalizing `ExplainSubView` into a multi-mode component.
- **The disclaimer text is exact.** "Maybe not your way" is the load-bearing clause. Do not "improve" it during planning or execution.
- **The icon choice is flexible but must not be religious.** Pick from `Sparkles`, `Eye`, `Lightbulb` only.
- **Zero auth gates.** Same as BB-30. Same as the rest of the Bible wave.
- **Pre-existing failing tests are out of scope.**
- **The ship test:** a user reading Philippians 4:6-7 can tap the verse, tap "Reflect on this passage," and get a 150-300 word reflection that offers 2-3 different ways the passage might land today, acknowledges the reader might find it hard to hear because the verse has been weaponized against anxious people, and ends not with a prescription but with a question the reader can sit with. If the output reads like a devotional from any other Christian app, the spec failed. If it reads like an invitation to the reader's own thinking, the spec worked.
- **BB-32 is next** — adds caching plus rate limiting on top of both BB-30 and BB-31.

---

## Pre-execution Checklist (for CC, before /execute-plan)

Before CC runs `/execute-plan`, confirm these items are in place:

1. BB-30 is shipped and working. The `@google/genai` package is installed, `geminiClient.ts` exists with `generateExplanation`, the error classes exist, `ExplainSubView` exists, the `explain` action is wired in `verseActionRegistry.ts`. Confirm by running the existing BB-30 tests.
2. The environment wiring foundation is committed. `frontend/src/lib/env.ts` exports `requireGeminiApiKey()`.
3. The user has `VITE_GEMINI_API_KEY` in `frontend/.env.local`.
4. `frontend/.env.local` is gitignored.
5. CC has verified the current canonical package name `@google/genai` against Google's docs.
6. CC has verified the model string `gemini-2.5-flash-lite` is still current.
7. The icon choice for the `reflect` action is made during planning (from `Sparkles`, `Eye`, `Lightbulb`).

Items 1-6 are inherited from BB-30's execution. Item 7 is a small plan-phase decision. No user action is required before `/execute-plan` can run.
