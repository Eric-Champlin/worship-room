# Ask AI Recon — Gemini Rewrite of `/ask`

**Date:** 2026-04-21
**Branch:** `claude/feature/ask-page-redesign`
**Scope:** Reconnaissance only. No code changes. Answers three gating questions for the upcoming Gemini-powered `/ask` spec.

---

## QUESTION 1 — Other AI-generation surfaces

**Short answer:** BB-30 Explain and BB-31 Reflect are the **only** surfaces in the codebase that fire real LLM calls. Every other "AI" surface — Pray, Journal reflection, Reading Plans create, AI Bible chat (`/ask`), dashboard AI insights — is a hardcoded mock.

### LLM SDK imports across `frontend/src`

Grep for `@google/genai|@anthropic-ai/sdk|from 'openai'|GoogleGenAI|GoogleGenerativeAI` returned **one** production import:

| File | SDK | Line |
|---|---|---|
| `frontend/src/lib/ai/geminiClient.ts` | `@google/genai` → `GoogleGenAI` | 1 |

All other matches are test files mocking `@google/genai` (`frontend/src/lib/ai/__tests__/geminiClient.test.ts`). **No `openai` or `@anthropic-ai/sdk` imports anywhere.** The only network-calling LLM code path in the frontend goes through `geminiClient.ts`.

### Per-surface audit

#### 1. Daily Hub Pray tab — NOT real AI

- Entry: `src/components/daily/PrayerInput.tsx` renders the textarea. It calls `onSubmit(text)` → parent (`PrayTabContent`) passes the text to a mock function.
- Generation: `src/mocks/daily-experience-mock-data.ts:504` — `getMockPrayer(userInput)`. Logic: lowercase the input, check for devotional-context keywords, then iterate `MOCK_PRAYERS` and match against `TOPIC_KEYWORDS`. Returns a hardcoded `MockPrayer` from a 9-entry array at `mocks/daily-experience-mock-data.ts:246` (MOCK_PRAYERS).
- Display: `src/components/daily/PrayerResponse.tsx` renders the mock prayer via `KaraokeTextReveal` (word-by-word reveal animation gives the illusion of streaming).
- **No call to `generateContent`, `generateExplanation`, `generateReflection`, or any LLM SDK.** No Gemini, OpenAI, or Anthropic in this path.

#### 2. Daily Hub Journal "Reflect on your entry" — NOT real AI

- Entry: `src/components/daily/JournalTabContent.tsx:263` — `handleReflect(entryId)`. Auth-gated (logged-out → auth modal).
- Generation: same file line 268 — `const reflection = getJournalReflection()`. That function at `src/mocks/daily-experience-mock-data.ts:531` returns `JOURNAL_REFLECTIONS[Math.floor(Math.random() * JOURNAL_REFLECTIONS.length)]` — random pick from a hardcoded array.
- **No LLM call.** The "AI reflection" is a random static string.

#### 3. Reading Plans AI generation (`CreatePlanFlow.tsx`) — NOT real AI

- Entry: `src/components/reading-plans/CreatePlanFlow.tsx:93-103` — `handleGenerate`.
- "Generation": `setTimeout(() => { const planId = matchPlanByKeywords(topicText); addCustomPlanId(planId); navigate('/reading-plans/' + planId) }, 2500)`.
- `matchPlanByKeywords` lives at `frontend/src/utils/plan-matcher.ts` and is pure keyword matching against existing hand-authored plans in `frontend/src/data/reading-plans/`. The 2500ms delay simulates thinking time.
- Archived spec `_specs/_archive/reading-plans-ai-generation.md` describes this is mock-by-design; real AI generation was deferred.
- **No LLM call.** Grep for `generateContent|gemini|openai|anthropic|llm` under `frontend/src/components/reading-plans/` returns zero matches (only a false-positive on the word "plan").

#### 4. AI Bible chat (`/ask`, the current page being redesigned) — NOT real AI

- Entry: `src/pages/AskPage.tsx:67-80` — `handleSubmit`.
- Generation: `AskPage.tsx:76` — `const result = getAskResponse(submittedText)` after a `setTimeout` of `ASK_LOADING_DELAY_MS` (constant in `constants/ask.ts`).
- `getAskResponse` lives at `src/mocks/ask-mock-data.ts` — returns one of 16 topic-bucketed entries with hardcoded answer, verses[], encouragement, prayer, and followUpQuestions[]. Topic selection is keyword matching on `submittedText`.
- Return shape: `AskResponse` (`src/types/ask.ts`), structure `{ id, topic, answer, verses[], encouragement, prayer, followUpQuestions[] }`.
- **No LLM call.** This is the surface the new spec aims to replace.

#### 5. Dashboard AI insights, AI prayer generation for dashboard — NOT real AI

- `constants/dashboard/ai-insights.ts` — 16 hardcoded insight cards rotating by day-of-year. Documented in `09-design-system.md` as "Real AI insights in Phase 3."
- No separate `@google/genai` or other SDK import in dashboard code.

### Other call sites of `generateExplanation()` / `generateReflection()`

Only the intended hooks + tests reference these two functions. Grep for `generateExplanation|generateReflection|generateContent` returned 12 files. After excluding `geminiClient.ts` itself, `cache.ts`, and test files, the production call sites are exactly:

| File | Function called | Purpose |
|---|---|---|
| `frontend/src/hooks/bible/useExplainPassage.ts` | `generateExplanation` | BB-30 ExplainPanel |
| `frontend/src/hooks/bible/useReflectOnPassage.ts` | `generateReflection` | BB-31 ReflectPanel |

Everything else in the 12-file list is a test file (`__tests__/*.test.ts[x]`) — `VerseActionSheet.explain.test.tsx`, `VerseActionSheet.reflect.test.tsx`, `ReflectSubView.test.tsx`, `ExplainSubView.test.tsx`, `verseActionRegistry.test.ts`, and the two hook tests.

**Conclusion:** A new `/ask` Gemini integration cannot reuse any existing "real-AI" production hook — `useExplainPassage` and `useReflectOnPassage` are BB-30/BB-31-specific. It can reuse the shared infrastructure in `lib/ai/` (geminiClient, cache, rate limit, errors) but would need a new `generateAskAnswer` function in `geminiClient.ts` (or parallel module) with a new `AIFeature` discriminator in `cache.ts` (currently `'explain' | 'reflect'`).

---

## QUESTION 2 — Structured output handling in BB-30/BB-31

**Short answer:** BB-30/BB-31 return prose only. Zero use of Gemini's JSON mode / responseSchema anywhere in the codebase. The codebase has a well-established **prose-evaluation** prompt testing methodology, but no existing JSON-output integration to model the Ask response shape on.

### Gemini structured output — not used

Grep of `frontend/src/lib/ai/` for `responseSchema|response_mime_type|responseFormat|responseMimeType|application/json` returned **zero matches**.

`geminiClient.ts:176-185` calls `ai.models.generateContent` with:

```
config: {
  systemInstruction: systemPrompt,
  temperature: 0.7,
  maxOutputTokens: 600,
  abortSignal: combinedSignal,
}
```

No `responseMimeType: 'application/json'`, no `responseSchema`. The return value is `response.text?.trim()` stored in `{ content: string, model: string }` — plain prose. Both `ExplainResult` and `ReflectResult` types (same file, lines 55-69) are just `{ content: string; model: string }`.

### `parse-verse-references.ts` — exists, regex-based

Location: `frontend/src/lib/parse-verse-references.ts` (77 lines).

- Purpose: given arbitrary text, returns `ParsedVerseReference[]` with `{ raw, book, bookSlug, chapter, verseStart, verseEnd?, startIndex, endIndex }`.
- Mechanism: regex built from `BIBLE_BOOKS` (sorted by name length desc to prevent partial-match overlaps), with `"Psalm"` aliased to `"Psalms"`. Pattern: `(BookName) space (chapter):(verseStart)(optional -verseEnd)` with lookbehind on whitespace/quote/paren/comma.
- Callers: used by the linked-answer renderer and search result parser (see `components/shared/LinkedAnswerText.tsx`, already modified on this branch).
- **Robustness vs hallucination:** The parser extracts references that **syntactically look** like Bible references. It does NOT validate that the reference is a real verse (e.g., "Psalm 151:1" or "John 100:5" would still parse). Verification against the WEB Bible data is a separate step — `frontend/src/lib/bible/*` modules load chapter JSON and can confirm whether the chapter+verse exists.
- **No recorded hallucination issues in `_plans/recon/` or `_plans/`.** I grepped for "hallucin", "invalid verse", "bad reference", "wrong reference" across `_plans/` — no hits. BB-30 and BB-31 don't emit verse references in their outputs (per the prompt rules — they explain the passage the user is already on, they don't recommend other verses), so hallucination of references was never a BB-30/BB-31 concern. This is a **new** risk that `/ask` will introduce because the Ask feature is expected to cite supporting verses.

### Prompt-testing methodology — established and reusable

Canonical artifacts:

- `_plans/recon/bb30-prompt-tests.md` — evaluation results (303 lines).
- `_plans/recon/bb30-prompt-tests.raw.json` — raw outputs.
- `_plans/recon/bb31-prompt-tests.md` + `.raw.json` — same pattern for Reflect.
- `frontend/scripts/bb30-run-prompt-tests.ts` — the test runner script.

**Methodology (from bb30-prompt-tests.md header):**

- **Model:** `gemini-2.5-flash-lite` against the real Gemini API via `@google/genai` SDK, `VITE_GEMINI_API_KEY` from `frontend/.env.local`.
- **Test executor:** Claude Code via `/execute-plan`.
- **Pass criterion:** ≤1 of 8 outputs violates any rule.
- **Evaluation method:** Prose judgment by CC, written verbatim into the `.md`. **No regex or mechanical pattern matching** — one human-readable paragraph per rule per test case. Word count is the sole numeric exception (rule 8 is definitionally numeric).
- **Test fixtures:** 8 passages per prompt, stratified by difficulty:
  - 4 "Easy" (John 3:16, Psalm 23:1, 1 Cor 13:4-7, Philippians 4:6-7)
  - 4 "Medium" (Leviticus 19:19, Genesis 22:1-2, 1 Timothy 2:11-12, Romans 1:26-27) — chosen to stress-test rules about hard passages (violence, patriarchy, purity codes).
- **Iteration loop:** if Round 1 passes (≤1 violation), ship the prompt. If it fails, iterate on the prompt and run a new round. BB-30 passed on Round 1 8/8 with zero violations; Final section at bb30-prompt-tests.md:303 says "no iteration needed."
- **Output location:** both `.md` (evaluation) and `.raw.json` (unedited model output) committed to repo for auditability.

**Applicability to `/ask`:** This methodology transfers cleanly. For a Gemini-powered `/ask` system prompt, a plan should specify:
- 8-ish test queries stratified across topic difficulty (easy pastoral question, medium theological question, hard moral/political question, potential crisis query, off-topic query, etc.)
- A rule list the prompt must satisfy (anti-proselytizing, anti-pastoral-ventriloquism, crisis-safe, verse citation accuracy, response length bound, etc.)
- A runner script analogous to `bb30-run-prompt-tests.ts` at `frontend/scripts/ask-run-prompt-tests.ts`
- Evaluation written into `_plans/recon/ask-prompt-tests.md` with raw outputs in `.raw.json`

There is **no existing JSON-output Gemini integration** to copy, so a plan choosing option (a) (Gemini JSON mode) would be establishing a new pattern. Option (b) (prose → client-side parser) would extend the existing `parse-verse-references.ts` infrastructure, which is already load-bearing on this branch (see AskResponseDisplay.tsx modifications).

---

## QUESTION 3 — Backend proxy / Phase 3 status

**Short answer:** There is a real backend skeleton but no AI proxy in it, no AI proxy spec in the 138-spec Forums Wave master plan, and no branch or commit suggesting in-flight backend AI work. The Ask AI migration has been **explicitly documented** (in the BB-32 spec) as blocked on a Phase 3 backend proxy that does not yet exist and is not on any near-term roadmap.

### Backend skeleton — exists, minimal, no AI

Repo root contains a `backend/` directory with a Spring Boot 3.5.11 + Java 21 + Maven skeleton. Full contents of `backend/src/main/java/com/example/worshiproom/`:

```
WorshipRoomApplication.java   (@SpringBootApplication bootstrap)
config/CorsConfig.java
controller/ApiController.java
```

`ApiController.java` (23 lines total) exposes exactly two endpoints: `GET /api/health` returning `{status: "ok"}` and `GET /api/hello`. **Zero** AI, Gemini, OpenAI, or LLM code. No controller for `/api/v1/ai`, `/api/ai`, or anything similar. Grep of `backend/` for `gemini|openai|anthropic|ai.?proxy|generateContent` returned zero matches.

### Phase 3 / Forums Wave AI posture — deferred

The Forums Wave master plan (`_forums_master_plan/round3-master-plan.md`, v2.6, 138 specs across Phase 0 → Phase 16) is the authoritative Phase 3 roadmap. Findings:

- `.claude/rules/03-backend-standards.md` § External APIs: **"AI: Not used in Forums Wave MVP (curated content only; LLM integration deferred per master plan)."**
- Grep of the master plan for `ai-proxy|gemini-proxy|AI endpoint|gemini|openai|anthropic|llm` returned 14 hits. **Every hit is in Spec 6.8 (Verse-Finds-You)** and explicitly says the feature ships with a curated 180-passage set, **no LLM in MVP**. Sample language (line 5347): *"The selection algorithm (plain-prose; no LLM in MVP)"*. Line 5543: *"LLM-based verse selection or generation (explicitly deferred; MVP is curated-set only)"*. Line 7923: *"Personalized LLM-generated verse selection — explicitly not-MVP; may never ship (Spec 6.8)"*.
- No spec in the master plan is titled or dedicated to an AI proxy, a Gemini proxy, an Ask AI migration, or server-side AI.
- `_specs/forums/` contains only one file: `backend-foundation-learning.md` (Spec 0.1 — a teaching doc for Eric, not a CC execution spec).

### BB-32 explicitly blocks the Ask AI migration on Phase 3

`_specs/_archive/bb-32-ai-caching-and-rate-limiting.md` is the most recent document that directly addresses the Ask AI question. Relevant quotes (with line numbers from that file):

- Line 13: *"A future Phase 3 backend proxy spec that will replace BB-32's client-side caching and rate limiting with real server-side enforcement"*
- Line 15: *"A future Ask AI migration spec — which is BLOCKED on the Phase 3 backend proxy and **not** unblocked by BB-32 alone"*
- Line 54: *"Mental model: BB-32 is cache + courtesy. It makes the existing AI features faster and more polite. It does not make them safe in any meaningful security sense. Real safety requires a backend proxy (server-side rate limits, session validation, IP throttling) — Phase 3 work."*
- Line 56: *"Critical implication for the Ask AI migration: BB-32 is NOT sufficient protection to enable Ask AI on the home page. Ask AI is a public, ungated, free-text AI surface — exactly the kind of surface that needs server-side rate limiting and bot protection. The Ask AI migration remains blocked on the Phase 3 backend, not on BB-32."*
- Line 447: *"Do NOT migrate the Ask AI page in this spec. Blocked on Phase 3 backend."*

The BB-32 spec's threat-model section (line 364) lists *"No server-side rate limiting. Bypassable by reloading or opening a new tab"* as an explicit limitation of the current client-side approach.

### Recent activity — no AI-proxy work in flight

- **Current branch:** `claude/feature/ask-page-redesign` (the branch this recon is written on).
- **Other live branches (`git branch -a | head -30`):** `audio-wave-bb-26-29-44` (Bible audio wave) plus ~20 `backup/pre-execute-*` branches (automated pre-execution snapshots). No branch name contains "ai", "gemini", "proxy", "backend-ai", or similar.
- **Recent commits (`git log --oneline -20`):** all are frontend UI work — register page redesign, local support facelift + Google Places, music page facelift, grow/challenge facelift, bible polish rounds 2-5, bible-reference-aware-search. The top commit (`a5653ef`) is yesterday's "Add /ask page redesign v2 spec + playwright recon" — i.e. the spec the user is writing now. There is no commit suggesting backend AI or proxy work.
- No open work on `backend/` — the three Java files haven't been touched since the initial skeleton.

### Practical implication for the new `/ask` spec

Given the above, the spec author has three realistic positions:

1. **Wait for a Phase 3 backend AI proxy spec to be written and shipped first.** There is no such spec today and none scheduled in the 138-spec Forums Wave plan. Wait time is indefinite.

2. **Build directly against the client-side `lib/ai/geminiClient.ts` + `lib/ai/cache.ts` + `lib/ai/rateLimit.ts`**, accepting that:
    - The `VITE_GEMINI_API_KEY` is shipped in the frontend bundle (same posture as BB-30/BB-31 today).
    - The client-side rate limit (`RATE_LIMIT_BUCKET_SIZE = 10`, refilling at 10/min) is courtesy-only and trivially bypassable.
    - BB-32's spec explicitly argued against doing this for the Ask surface specifically because Ask is public/ungated/free-text, whereas BB-30/BB-31 are scoped to Bible reader verses.
    - Migration to a backend proxy later would require a new spec that swaps the internals of the Ask hook without disturbing its consumers — feasible, but a real refactor.

3. **Write a small backend AI proxy spec first** (not in the 138-spec master plan, but the `backend/` skeleton is ready to accept new controllers). This is a meaningful expansion of scope but would unblock Ask AI plus retroactively improve BB-30/BB-31 safety.

Only the spec author can decide which of these is the right call — the recon can't. But the decision is the single highest-risk choice in the upcoming spec, because the three options imply very different implementation plans and very different risk postures.

---

## Summary table

| Question | Answer |
|---|---|
| How many surfaces currently fire real LLM calls? | **2** — BB-30 Explain and BB-31 Reflect. Everything else (Pray, Journal reflection, Reading Plans create, Ask page, dashboard insights) is a hardcoded mock. |
| Does the codebase use Gemini JSON mode? | **No.** Zero use of `responseSchema` / `responseMimeType` / `application/json` anywhere in `lib/ai/`. BB-30/BB-31 return prose only. |
| Does `parse-verse-references.ts` exist and work? | **Yes.** Regex-based, iterates `BIBLE_BOOKS`, supports verse ranges. Syntactic parse only — doesn't validate that the reference points to a real WEB verse. No recorded hallucination-bug history (BB-30/BB-31 don't emit references). |
| Is there an established prompt-testing methodology? | **Yes.** 8-passage stratified-difficulty suite, prose-evaluation (no regex), pass criterion ≤1 of 8 violations, runner script + `.md` + `.raw.json` artifact pattern. Lives at `_plans/recon/bb30-prompt-tests.md` and `bb31-prompt-tests.md`. |
| Is a backend AI proxy in progress? | **No.** No spec in the 138-spec Forums Wave master plan. The `backend/` skeleton has only `/api/health` and `/api/hello`. No branch or commit suggests in-flight work. |
| Is the Ask AI migration unblocked? | **No, per BB-32's own spec.** BB-32 explicitly says Ask AI remains blocked on a Phase 3 backend proxy that has not been specified. |
