# AI Integration: Ask AI Scripture-Grounded Q&A (Spec AI-1 of 3)

**Spec ID:** ai-integration-ask
**Wave:** AI Integration (3-spec series: Ask, Prayer Generation, Journal Reflection — this is AI-1 of 3)
**Track:** Backend Gemini proxy endpoint + frontend mock-to-real swap
**Branch:** `claude/feature/ai-integration-ask` — cut from `main` after the Key Protection wave (Specs 1–3) merges
**Depends on:** Key Protection wave complete. Spec 1 (`ai-proxy-foundation.md`) merged. Spec 2 (`ai-proxy-gemini.md`) merged. Spec 3 (`ai-proxy-maps.md`) merged. AI-1 reuses the full proxy foundation plus Spec 2's `GeminiService` wiring (`google-genai:1.51.0` SDK, `GEMINI_API_KEY` env var already in `backend/.env.local`).

> **Prerequisite verification:** run `git log main --oneline -10` and confirm the "AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", and "Spec 3: Maps proxy migration" merge commits are all visible. If any is missing, do not proceed.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-integration-ask` throughout.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT run `git checkout`, `git commit`, `git push`, or any git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current`.** If it's not `claude/feature/ai-integration-ask`, STOP and surface.
3. **Preserve the `AskResponse` TypeScript contract EXACTLY.** `AskPage.tsx`, `AskResponseDisplay.tsx`, `PopularTopicsSection.tsx`, `UserQuestionBubble.tsx`, `SaveConversationButton.tsx`, and `ConversionPrompt.tsx` all consume `AskResponse` from `@/types/ask`. The shape — `{id, topic, answer, verses[3], encouragement, prayer, followUpQuestions[3]}` — does not change. Gemini's response is transformed to match this shape on the backend BEFORE it crosses the wire. Zero component edits for shape reasons.
4. **Exactly 3 verses, exactly 3 follow-up questions.** The type declares `followUpQuestions: [string, string, string]` — a tuple, not a variable array. The backend must enforce this invariant via response validation after the Gemini call; if Gemini returns fewer or more, retry once with a corrective prompt or fall back to mock.
5. **Crisis detection is defense-in-depth.** The client-side `CrisisBanner` and `containsCrisisKeyword` function stay in place, unchanged. The backend ALSO runs a crisis check BEFORE calling Gemini; if triggered, the backend returns a canned crisis-response `AskResponse` that embeds the 988/Crisis Text/SAMHSA resources, WITHOUT calling Gemini. This guarantees crisis resources are always surfaced even if the client-side layer is bypassed (e.g., by a direct API call).
6. **Mock fallback stays as a last resort.** If the backend returns an error (any status, network failure, timeout, or malformed response), the frontend calls the existing `getAskResponse(question)` mock and renders that instead of throwing. The user never sees a raw error — the mock always has something.
7. **Use exactly the code specified in this spec.** Do not rewrite, refactor, or "improve" patterns. Match Spec 2's conventions verbatim where they apply. Deviations only under the Spec 2 charter (7-condition gate).
8. **Do NOT add Maven dependencies.** `google-genai:1.51.0`, `spring-boot-starter-webflux`, `spring-boot-starter-validation` are all present from Specs 1–2. Caffeine is transitive. No new deps.
9. **Do NOT re-export `getAskResponse` or keep mock-first behavior.** After this spec, the mock is a fallback path only — never the primary source for a happy-path request.

---

## Why this spec exists

Today, `/ask` is a convincing mock. The user types a question, sees a 2-second fake "Searching Scripture for wisdom..." spinner, and receives one of 16 canned responses (15 topics + 1 fallback) selected by a local keyword matcher. The responses themselves are well-crafted — but they're not AI, they don't address the specific question, and the topic coverage is narrow. A user asking about "career change" or "betrayal by a friend" gets the fallback generic response.

This spec wires Ask to real Gemini via the backend proxy. After this spec:

- User types any question → backend calls Gemini with a Scripture-grounded system prompt → Gemini returns structured JSON matching the `AskResponse` shape → frontend renders it through the existing `AskResponseDisplay` component, unchanged
- Crisis keywords detected (client-side AND server-side) → short-circuit to a crisis-response `AskResponse` with 988/Crisis Text/SAMHSA resources. Does not call Gemini in the crisis path.
- Backend fails or returns a malformed response → frontend falls back to the existing mock (`getAskResponse`). User always sees something useful.
- Follow-up questions (`handleFollowUpClick`) pass conversation history to the backend → Gemini sees the context and responds coherently across turns

After this spec ships:

1. New backend endpoint `POST /api/v1/proxy/ai/ask` that accepts `{question, conversationHistory?}`, calls Gemini with structured-output prompting, returns `ProxyResponse<AskResponse>` matching the frontend type exactly.
2. `AskPage.tsx` swaps `getAskResponse(submittedText)` → `fetchAskResponse(submittedText)` (new module) with mock fallback on any error.
3. Backend and frontend both run crisis detection. Backend wins — if server detects crisis, client's CrisisBanner still shows AND the response itself is the crisis resources.
4. `src/mocks/ask-mock-data.ts` stays in place as the fallback. `ASK_RESPONSES.fallback` is the final-resort response.
5. OpenAPI gains the new path + schemas. Gemini safety-block responses (from Spec 2's `SafetyBlockException`) are already mapped.

Downstream specs (AI-2 Prayer, AI-3 Journal) follow the same pattern with different prompts and response shapes.

---

## Affected Frontend Routes

- `/ask`

---

## Files touched

| File | Change | Purpose |
|---|---|---|
| `backend/src/main/java/com/example/worshiproom/proxy/ai/AskController.java` | Create | One POST endpoint (`/ask`) that validates input, delegates to `AskService`. Note: file sits in the existing `proxy.ai` subpackage alongside `GeminiController` from Spec 2. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/AskService.java` | Create | Orchestrates: (1) server-side crisis check → canned response OR (2) Gemini call with structured-output prompt → validation → shape normalization. Delegates the raw Gemini call to a package-private method (D2b test-seam pattern from Spec 2). |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/AskPrompts.java` | Create | `public static final String` constants for the Ask system prompt + a `public static String buildUserPrompt(...)` that assembles the user message with optional conversation history. Verbatim text lives here and nowhere else on the backend. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/AskRequest.java` | Create | Request DTO record `{String question, List<ConversationMessage> conversationHistory}` with Bean Validation. `conversationHistory` is optional (null OK; empty list OK). |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/AskResponseDto.java` | Create | Response DTO record matching the frontend's `AskResponse` shape exactly: `{String id, String topic, String answer, List<AskVerseDto> verses, String encouragement, String prayer, List<String> followUpQuestions}`. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/AskVerseDto.java` | Create | Verse record `{String reference, String text, String explanation}`. Matches frontend `AskVerse` type. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/ConversationMessage.java` | Create | Record `{String role, String content}`. `role` is `"user"` or `"assistant"`. Used for conversation-history passing. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/AskCrisisDetector.java` | Create | Package-private static helpers: `detectsCrisis(String)` and `buildCrisisResponse()`. Crisis keyword list mirrors the frontend's `SELF_HARM_KEYWORDS` constant (source of truth stays frontend — backend list is a defense-in-depth copy, documented as such). |
| `backend/src/main/resources/openapi.yaml` | Modify | Add path for `/api/v1/proxy/ai/ask`, schemas for `AskRequest`, `AskResponseDto`, `AskVerse`, `ConversationMessage`. Reuses shared error responses from Spec 1. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/AskControllerTest.java` | Create | `@WebMvcTest` slice — validates request bodies, response shape, error mapping, crisis path. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/AskServiceTest.java` | Create | Unit tests with `Mockito.spy()` on the service per D2b. Covers structured-output parsing, shape validation, crisis short-circuit, retry-on-shape-mismatch, mock fallback triggers. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/AskIntegrationTest.java` | Create | `@SpringBootTest` end-to-end — mocks `AskService` at bean level (Spec 2 precedent), asserts full HTTP response including headers and error shape. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/AskPromptsTest.java` | Create | Guardrail tests on prompt text — assert that the 8 rules from the system prompt are present verbatim. Prevents accidental prompt drift. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/AskCrisisDetectorTest.java` | Create | Unit tests for the crisis-keyword matcher. Parity test with frontend keyword list. |
| `frontend/src/services/ask-service.ts` | Create | New module: `fetchAskResponse(question, history?)` → returns `AskResponse`. On any error, falls back to `getAskResponse(question)` and returns that instead of throwing. |
| `frontend/src/services/__tests__/ask-service.test.ts` | Create | Fetch mocks targeting `/api/v1/proxy/ai/ask`. Cover: happy path, 400/429/502/504/network error each falling through to mock, timeout, conversation-history passing, crisis response. |
| `frontend/src/pages/AskPage.tsx` | Modify | Two call sites swap from `getAskResponse(submittedText)` → `await fetchAskResponse(submittedText, conversationHistory)`. One in `handleSubmit`, one in `handleFollowUpClick`. Rest of the file unchanged. |
| `frontend/src/constants/ask.ts` | Modify | Change `ASK_LOADING_DELAY_MS` from `2000` to a comment-only constant explaining it's now a minimum perceived-latency floor (see Architecture Decision #6). |
| `frontend/src/pages/__tests__/AskPage.test.tsx` | Modify | Existing tests that called `getAskResponse` directly now need to mock `fetchAskResponse`. Update fixtures for the async path. |
| `frontend/src/pages/__tests__/AskPage.offline.test.tsx` | (verify-only) | No changes needed — offline gating happens before the service call. Verify it still passes. |
| `frontend/src/mocks/ask-mock-data.ts` | (no change) | Stays as-is. The fallback path depends on this file existing. |

**Net changes:** backend gains ~550 lines of Java (service + controller + 4 DTO records + prompts + crisis detector) + ~70 lines of YAML (OpenAPI additions) + ~500 lines of tests. Frontend gains ~80 lines (`ask-service.ts` + test) and changes ~10 lines in `AskPage.tsx`. Total ≈ +1200 / -5. About 15 files touched.

**Net runtime impact:** Ask gains one real network hop per submission (browser → backend → Gemini instead of browser → local setTimeout). Gemini latency is typically 1.5–4s for this class of prompt at `gemini-2.5-flash-lite`. The existing 2-second cosmetic delay is removed — real latency replaces it. Perceived performance is about the same for slow Gemini responses, noticeably slower for fast ones. The frontend shows the existing "Searching Scripture for wisdom..." spinner during the real wait. No server-side cache (each question is unique per user; Caffeine-style caching has low hit-rate and risks serving the wrong user's response).

---

## Architecture decisions

**1. Use Gemini (`gemini-2.5-flash-lite`) for all three AI Integration specs.** Matches Spec 2's model, already tested in production, key already provisioned. OpenAI was the original plan per Eric's memory, but adding a second provider means new config class, new service, new key provisioning (the GCP org-policy dance all over again), and two sets of prompt-engineering disciplines. Using Gemini for all three trades marginal quality differences (OpenAI's conversational tone vs. Gemini's) for a massive reduction in ship complexity. Revisit provider diversification after all three features are live and real user feedback is in.

**2. Force structured JSON output from Gemini via response schema.** The `AskResponse` shape is rich and specific — narrative text blended with structured fields (exactly 3 verses, exactly 3 follow-ups, specific field names). Parsing free-form Gemini output into this shape is brittle (regex hell, hallucinated field names, wrong counts). Use Gemini's structured output mode:
   - `responseMimeType: "application/json"`
   - `responseSchema: <JSON Schema matching AskResponseDto>`
   
   This forces Gemini to emit valid JSON matching the schema on every call. The SDK's `config.responseSchema` field takes a `Schema` object — see `google.genai.types.Schema`. Failure modes drop to: (a) JSON parse fails (never observed with structured mode, but we handle it) → retry once with corrective prompt, (b) JSON parses but fails business validation (e.g., 2 verses instead of 3) → retry once, (c) both retries fail → return mock-style canned response via `getFallbackResponse()` on the server. User always gets a valid `AskResponse`.

**3. Crisis detection runs server-side BEFORE the Gemini call, in addition to client-side.** Client-side already renders `CrisisBanner` when `containsCrisisKeyword(text)` returns true. This is fast and works without network. But if a user somehow bypasses the client-side check (direct API call, modified frontend, non-English phrasing that passes the keyword filter), the backend is the last line of defense. Backend crisis path:
   - Check the user question against a keyword list (parity with frontend's `SELF_HARM_KEYWORDS`)
   - If hit, return a canned `AskResponse` with `id: "crisis"`, `topic: "Help is available"`, an `answer` that acknowledges pain + points to resources, 3 verses (Psalm 34:18, Psalm 147:3, Matthew 11:28), a specific `prayer` that doesn't minimize the crisis, and `followUpQuestions` that redirect to professional help options
   - NO Gemini call. NO LLM involvement. The crisis response is deterministic and pre-written. This guarantees accuracy and tone.
   
   Document the backend's keyword list as "defense-in-depth copy; source of truth is `frontend/src/constants/crisis-resources.ts`." `AskCrisisDetectorTest` includes a parity test that reads the frontend file and asserts the backend list is a superset (broader coverage on backend is fine; narrower coverage isn't).

**4. Preserve the mock fallback as a last-resort path.** `frontend/src/services/ask-service.ts` wraps the fetch in a try/catch; on ANY failure (HTTP error, network error, timeout, parse error), returns `getAskResponse(question)` from the existing mock. User never sees a raw error state. The mock's 16 canned responses (15 topics + fallback) are good enough to degrade gracefully — they were production-quality when the feature shipped in BB-35.
   
   Backend-level fallback: if Gemini returns malformed JSON twice in a row (retry budget exhausted), the backend itself returns a canned "service degraded" `AskResponse` (`id: "fallback"`, `topic: "We had trouble finding an answer"`, generic encouragement + 3 safe verses + generic prayer + 3 generic follow-ups). This is different from the mock — it's a server-owned degradation response. Frontend also falls back to the mock if it receives this, but the backend fallback lets us monitor degradation server-side.

**5. Conversation history support from day one.** `AskPage`'s `handleFollowUpClick` already treats follow-ups as continuing the conversation. The backend's `AskRequest` accepts `conversationHistory: [{role, content}, ...]` — frontend passes the last N turns (N=3 to keep prompt size bounded). System prompt instructs Gemini to treat history as context for understanding the follow-up, not to re-answer the earlier questions. If `conversationHistory` is null or empty, treat as a fresh question.

**6. Replace the 2-second cosmetic delay with real latency.** `ASK_LOADING_DELAY_MS = 2000` currently hides the fact that there's no real backend call. After this spec, real Gemini latency (typically 1.5–4s) replaces it. The loading UI stays the same — same spinner, same Psalm 119:105 quote. Users don't notice the change for slow Gemini responses; fast responses feel slightly less deliberate, which is fine — the instant result is more impressive than the artificial wait. Change the constant to `0` or remove its use; document in a comment that loading UI timing is now driven by actual fetch latency. Skip client-side minimum-latency floors (some UX patterns enforce minimum 400ms to avoid jarring instant responses; we don't need it here because Gemini is always slower than that).

**7. Test seam pattern matches Spec 2's D2b exactly.** `AskService` exposes a package-private `callGeminiForAsk(AskRequest)` that wraps the raw SDK call. Tests spy on `AskService` and `doReturn(fakeGeminiResponse).when(spy).callGeminiForAsk(any())`. Avoids Gemini SDK's final-field reflection surface that forced D2b in the first place.

**8. No backend-side Caffeine cache for Ask responses.** Each question is user-specific and long-tail; cache hit rate would be nearly zero and the storage risk (cross-user response leakage) isn't worth the marginal perf. Gemini itself handles burst rate limiting; rate-limit headers from Spec 1 filter apply as-is.

**9. Safety block handling inherits from Spec 2.** Gemini's three-path safety check (promptFeedback.blockReason, finishReason=SAFETY|PROHIBITED_CONTENT, empty-text) fires for Ask too. Spec 2's `SafetyBlockException` → HTTP 422 → frontend mapping is already in place. Frontend `ask-service.ts` treats 422 as an error and falls through to the mock (which is a reasonable fallback for a blocked question). Backend logs the safety-block with `reference` replaced by `questionLength` to match Spec 2's PII discipline (no verbatim question text in logs).

**10. Response validation before returning to client.** After JSON-parsing Gemini's structured output, `AskService` validates:
   - `id`, `topic`, `answer`, `encouragement`, `prayer` are all non-empty strings
   - `verses` has exactly 3 entries, each with non-empty `reference`, `text`, `explanation`
   - `followUpQuestions` has exactly 3 entries, each a non-empty string
   
   If any validation fails, retry once with a corrective system prompt appended: "Your previous response had validation issues. Ensure exactly 3 verses and exactly 3 follow-up questions, all fields non-empty, JSON matches the schema." If the retry also fails, return the server-side fallback response and log a `Validation failed twice` warning at INFO level.

**11. Topic/id field meaning changes.** In the mock, `id` is one of a fixed set (suffering, forgiveness, etc.) used for analytics and feedback tracking. With real AI, `id` is less meaningful — Gemini doesn't map cleanly to 15 predefined topics. Two options:
   - Have Gemini classify into one of the predefined topics and return that as `id`. Keeps analytics working.
   - Let Gemini generate a short kebab-case topic slug and use that. More accurate to the user's actual question, breaks feedback-key aggregation.
   
   **Chosen: Gemini classifies into one of the 16 predefined values (`suffering`, `forgiveness`, `anxiety`, `purpose`, `doubt`, `prayer`, `grief`, `loneliness`, `anger`, `marriage`, `parenting`, `money`, `identity`, `temptation`, `afterlife`, `fallback`).** The system prompt includes the list with short descriptions and instructs Gemini to pick the best match. `topic` field is human-readable and can be freeform ("Understanding Suffering", "Finding Forgiveness", etc.). This preserves the existing `ASK_FEEDBACK_KEY` localStorage analytics and makes it easy to compare real-AI feedback against mock baselines.

**12. Server-side fallback response is pre-written.** When all retries fail, backend returns this exact `AskResponse`:
   ```json
   {
     "id": "fallback",
     "topic": "Seeking Wisdom",
     "answer": "That's a deep question, and I want to honor it with a thoughtful answer. I'm having trouble reaching our AI service right now — but Scripture has wisdom for every question you bring. Take a moment to pray, open the Bible to a passage that speaks to you, or explore the topics below. You're not alone in wondering.",
     "verses": [3 safe verses: Psalm 46:10, Proverbs 3:5-6, Matthew 7:7],
     "encouragement": "God hears every question of your heart. Keep asking.",
     "prayer": "Lord, I don't have all the answers, and right now I can't see the path clearly. Help me to trust you in what I don't understand. Give me patience to wait on your wisdom and courage to keep asking. Amen.",
     "followUpQuestions": ["How does the Bible say to handle uncertainty?", "What does it mean to trust God?", "How can I grow in faith today?"]
   }
   ```
   Lives as a `public static final AskResponseDto FALLBACK_RESPONSE` in `AskService.java` — NOT in a config file or separate class. Tight coupling with the service that owns the fallback path.

---

## Backend implementation

### Endpoint contract

#### `POST /api/v1/proxy/ai/ask`

**Request body** (`AskRequest`):

```json
{
  "question": "Why does God allow suffering?",
  "conversationHistory": [
    {"role": "user", "content": "Earlier question"},
    {"role": "assistant", "content": "Earlier answer..."}
  ]
}
```

**Validation:**
- `question` — required, 1–500 chars, `@NotBlank @Size(min=1, max=500)`. Matches `ASK_MAX_LENGTH` constant.
- `conversationHistory` — optional (null or missing OK), `@Size(max=6)` (3 user+assistant pairs max). Each entry:
  - `role`: `@NotBlank`, must be `"user"` or `"assistant"` (validated in service, not annotation)
  - `content`: `@NotBlank @Size(min=1, max=2000)`

**Success response** (HTTP 200, `ProxyResponse<AskResponseDto>`):

```json
{
  "data": {
    "id": "suffering",
    "topic": "Understanding Suffering",
    "answer": "That's one of the hardest questions... [2-3 paragraphs]",
    "verses": [
      {"reference": "Romans 8:28", "text": "We know that all things...", "explanation": "Even in suffering..."},
      {"reference": "Psalm 34:18", "text": "Yahweh is near...", "explanation": "God draws close..."},
      {"reference": "James 1:2-4", "text": "Count it all joy...", "explanation": "Trials produce..."}
    ],
    "encouragement": "Your pain matters to God. He meets you in it.",
    "prayer": "Lord, I don't understand why...",
    "followUpQuestions": [
      "How do I pray when I'm in pain?",
      "What does it mean that God works through suffering?",
      "How can I comfort someone else who is hurting?"
    ]
  },
  "meta": {"requestId": "fbfQ6HOYQGe-REXyyltn3Q"}
}
```

**Error responses:** standard `ProxyError` shape via `ProxyExceptionHandler`. Codes:
- `INVALID_INPUT` (400) — validation failure
- `RATE_LIMITED` (429) — from filter (inherits Spec 1 behavior)
- `SAFETY_BLOCK` (422) — Gemini safety triggered (Spec 2 exception type reused)
- `UPSTREAM_ERROR` (502) — Gemini 4xx/5xx or malformed response after retries
- `UPSTREAM_TIMEOUT` (504) — WebClient timeout
- `INTERNAL_ERROR` (500) — unexpected. Should never be user-visible except for bugs.

**Crisis-response success (not an error):** HTTP 200, same shape as a normal success, but `id: "crisis"`. The frontend can detect this and choose to render differently if desired (future enhancement; for now the standard renderer handles it fine because the shape matches).

### Backend file specifications

#### `ConversationMessage.java`

```java
package com.example.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ConversationMessage(
    @NotBlank @Pattern(regexp = "^(user|assistant)$", message = "role must be 'user' or 'assistant'")
    String role,
    @NotBlank @Size(min = 1, max = 2000)
    String content
) {}
```

#### `AskRequest.java`

```java
package com.example.worshiproom.proxy.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AskRequest(
    @NotBlank @Size(min = 1, max = 500) String question,
    @Valid @Size(max = 6) List<ConversationMessage> conversationHistory
) {}
```

Notes: `conversationHistory` is nullable (entire field absent in the JSON is OK). `@Valid` cascades validation into each entry. `@Size(max=6)` enforces 3 round-trips max.

#### `AskVerseDto.java`

```java
package com.example.worshiproom.proxy.ai;

public record AskVerseDto(
    String reference,
    String text,
    String explanation
) {}
```

No validation annotations — Gemini produces these; server-side validation after parsing (see `AskService.validateResponse`).

#### `AskResponseDto.java`

```java
package com.example.worshiproom.proxy.ai;

import java.util.List;

public record AskResponseDto(
    String id,
    String topic,
    String answer,
    List<AskVerseDto> verses,
    String encouragement,
    String prayer,
    List<String> followUpQuestions
) {}
```

Shape matches the frontend's `AskResponse` TypeScript interface EXACTLY. Any field-name divergence breaks the UI.

#### `AskPrompts.java`

System prompt is the heart of this spec — it's the spec's "product surface" even though it lives in backend code. Full text below. CC copies it verbatim; NO paraphrasing, NO re-wording, NO "improvements." The tone and rules are deliberate.

```java
package com.example.worshiproom.proxy.ai;

import java.util.List;
import java.util.stream.Collectors;

public final class AskPrompts {

    private AskPrompts() {}

    public static final String ASK_SYSTEM_PROMPT = """
        You are a warm, pastorally-minded Bible study companion. You answer life questions with Scripture-grounded wisdom in a way that comforts, challenges, and points people toward Jesus.

        Follow these 8 rules for every response:

        1. Use the World English Bible (WEB) translation for all verse quotations. Never invent or paraphrase verse text — quote real verses exactly as they appear in WEB.
        2. Return exactly 3 verses. Each verse must be directly relevant to the question. Prefer well-known passages when they fit; reach for lesser-known ones when the question demands it.
        3. Return exactly 3 follow-up questions that naturally extend the conversation. Make them specific enough to click but open enough to explore.
        4. Write the answer in warm second-person voice ("you", "your"). Avoid theological jargon. 2-3 paragraphs, 200-400 words total.
        5. Acknowledge pain when it's present. Don't minimize struggles or jump straight to "God's plan." Sit with the person first.
        6. The prayer field is a first-person prayer (1 paragraph, 40-80 words) that the user could pray themselves. Don't start with "Dear God" — use varied, natural openings.
        7. The encouragement field is one short sentence (under 20 words) that the user can hold onto as a takeaway.
        8. The id field must be one of these exact strings: suffering, forgiveness, anxiety, purpose, doubt, prayer, grief, loneliness, anger, marriage, parenting, money, identity, temptation, afterlife, fallback. Pick the best match; use "fallback" only if none fit.

        Respond ONLY with valid JSON matching the provided schema. No preamble, no markdown, no code fences.
        """;

    public static final String RETRY_CORRECTIVE_SUFFIX = """

        Your previous response had validation issues. Common problems: fewer or more than 3 verses, fewer or more than 3 follow-up questions, empty fields, or invalid id value. Ensure exactly 3 verses and exactly 3 follow-up questions, all text fields non-empty, id from the approved list, and the JSON matches the schema exactly.
        """;

    /**
     * Builds the user-facing prompt with optional conversation history.
     * History is formatted as "User: ...\nAssistant: ..." turns before the current question.
     */
    public static String buildUserPrompt(String question, List<ConversationMessage> history) {
        if (history == null || history.isEmpty()) {
            return "Question: " + question;
        }
        String historyText = history.stream()
            .map(msg -> (msg.role().equals("user") ? "User: " : "Assistant: ") + msg.content())
            .collect(Collectors.joining("\n\n"));
        return "Previous conversation:\n\n" + historyText + "\n\nFollow-up question: " + question;
    }
}
```

The 8 rules are load-bearing. `AskPromptsTest` verifies each rule's verbatim-substring presence.

#### `AskCrisisDetector.java`

```java
package com.example.worshiproom.proxy.ai;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection. Defense-in-depth against the client-side
 * {@code containsCrisisKeyword} in {@code frontend/src/constants/crisis-resources.ts}.
 * Source of truth is the frontend list; this list is a superset copy.
 *
 * If any keyword matches (case-insensitive substring), the service returns a canned
 * crisis response without calling Gemini.
 */
final class AskCrisisDetector {

    private AskCrisisDetector() {}

    /** MUST include all entries from frontend SELF_HARM_KEYWORDS; may include more. */
    static final List<String> SELF_HARM_KEYWORDS = List.of(
        // Parity with frontend (verified by AskCrisisDetectorTest.parityWithFrontend)
        "suicide",
        "kill myself",
        "end it all",
        "not worth living",
        "hurt myself",
        "end my life",
        "want to die",
        "better off dead",
        // Backend-only additions — broader coverage
        "take my own life",
        "don't want to be here",
        "nobody would miss me",
        "cease to exist"
    );

    static boolean detectsCrisis(String text) {
        if (text == null || text.isBlank()) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String keyword : SELF_HARM_KEYWORDS) {
            if (lower.contains(keyword)) return true;
        }
        return false;
    }

    static AskResponseDto buildCrisisResponse() {
        return new AskResponseDto(
            "crisis",
            "Help is available",
            "I hear how much pain you're in, and I'm so glad you reached out. Please know you're not alone, and there are people ready to listen right now — not to judge, not to rush you, just to be with you in this.\n\nIf you're in crisis, please call or text 988 (the Suicide & Crisis Lifeline) — it's free, confidential, and available 24/7. You can also text HOME to 741741 to reach the Crisis Text Line. These aren't last resorts. They're exactly what they exist for — moments like this.\n\nScripture doesn't shy away from the darkest places. Psalm 34:18 promises that God is near to the broken-hearted. Your pain matters. Your life matters. Please reach out tonight.",
            List.of(
                new AskVerseDto(
                    "Psalm 34:18",
                    "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.",
                    "When you feel most alone, God draws closest — not from a distance, but right into the brokenness with you."
                ),
                new AskVerseDto(
                    "Psalm 147:3",
                    "He heals the broken in heart, and binds up their wounds.",
                    "God's healing isn't metaphorical — he tends to the deepest wounds, one at a time."
                ),
                new AskVerseDto(
                    "Matthew 11:28",
                    "Come to me, all you who labor and are heavily burdened, and I will give you rest.",
                    "Jesus invites you exactly as you are — exhausted, burdened, unable to carry more. You don't have to fix yourself first."
                )
            ),
            "You are seen. You are loved. Please reach out — 988 or text HOME to 741741.",
            "Lord, I'm struggling and I don't know how to keep going. I'm scared, and I'm tired. Please meet me here. Send me the right person to talk to. Remind me that my life matters to you. Help me take the next step, even if it's just one phone call. Amen.",
            List.of(
                "What if I'm afraid to call 988?",
                "How do I find a counselor near me?",
                "Is it okay to feel this way as a Christian?"
            )
        );
    }
}
```

Crisis response is a compile-time constant in spirit — its text should be reviewed by anyone with pastoral care expertise. It's treated as product-critical content, not "code."

#### `AskService.java`

The full service is ~350 lines. Structure in order:

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AskService {

    private static final Logger log = LoggerFactory.getLogger(AskService.class);
    private static final String MODEL = "gemini-2.5-flash-lite";
    private static final int MAX_RETRIES_ON_VALIDATION_FAILURE = 1;

    private final ProxyConfig proxyConfig;
    private final ObjectMapper objectMapper;
    private final Client client;  // may be null if key not configured

    public AskService(ProxyConfig proxyConfig, ObjectMapper objectMapper) {
        this.proxyConfig = proxyConfig;
        this.objectMapper = objectMapper;
        this.client = initClient();
    }

    private Client initClient() {
        if (!proxyConfig.getGemini().isConfigured()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/ask will return UPSTREAM_ERROR.");
            return null;
        }
        return Client.builder().apiKey(proxyConfig.getGemini().getApiKey()).build();
    }

    /** Exposed for ApiController composability (future health field). Not currently consumed. */
    public boolean isConfigured() {
        return client != null;
    }
```

```java
    /**
     * Orchestrates the full request lifecycle:
     * 1. Crisis check → canned response, no Gemini call
     * 2. Gemini structured-output call with retry on validation failure
     * 3. Final fallback to server-owned canned response on repeated failure
     */
    public AskResponseDto ask(AskRequest request) {
        // Step 1: Crisis check (server-side, defense-in-depth)
        if (AskCrisisDetector.detectsCrisis(request.question())) {
            log.info("Ask crisis path triggered questionLength={}", request.question().length());
            return AskCrisisDetector.buildCrisisResponse();
        }

        // Step 2: Ensure Gemini is configured
        if (client == null) {
            throw new UpstreamException("AI service is not configured on the server.");
        }

        // Step 3: Call Gemini with retry-on-validation-failure
        int attempts = 0;
        while (attempts <= MAX_RETRIES_ON_VALIDATION_FAILURE) {
            try {
                GenerateContentResponse response = callGeminiForAsk(request, attempts > 0);
                AskResponseDto dto = parseAndValidate(response);
                if (dto != null) {
                    return dto;
                }
                log.info("Ask response validation failed attempt={}", attempts + 1);
                attempts++;
            } catch (SafetyBlockException | UpstreamException | UpstreamTimeoutException ex) {
                throw ex;  // let handler map these
            } catch (RuntimeException ex) {
                throw mapGeminiException(ex);
            }
        }

        // Step 4: Both attempts exhausted — return server-side fallback
        log.warn("Ask retries exhausted questionLength={}", request.question().length());
        return FALLBACK_RESPONSE;
    }
```

```java
    /**
     * Package-private test seam (D2b pattern). Wraps the raw Gemini SDK call.
     * Spy on AskService and doReturn(...) on this method in tests.
     *
     * @param withRetryCorrective if true, appends AskPrompts.RETRY_CORRECTIVE_SUFFIX
     */
    GenerateContentResponse callGeminiForAsk(AskRequest request, boolean withRetryCorrective) {
        String systemPrompt = AskPrompts.ASK_SYSTEM_PROMPT
            + (withRetryCorrective ? AskPrompts.RETRY_CORRECTIVE_SUFFIX : "");
        String userPrompt = AskPrompts.buildUserPrompt(request.question(), request.conversationHistory());

        GenerateContentConfig config = GenerateContentConfig.builder()
            .systemInstruction(Content.fromParts(Part.fromText(systemPrompt)))
            .responseMimeType("application/json")
            .responseSchema(buildResponseSchema())
            .build();

        return callModels(MODEL, userPrompt, config);
    }

    /**
     * Package-private test seam matching Spec 2's pattern. See Spec 2 D2b for the
     * reflection-over-final-field problem this avoids.
     */
    GenerateContentResponse callModels(String model, String userPrompt, GenerateContentConfig config) {
        return client.models.generateContent(model, userPrompt, config);
    }

    /**
     * Builds the JSON schema Gemini must follow. See google.genai.types.Schema for the
     * SDK's schema builder.
     */
    private static Schema buildResponseSchema() {
        // NOTE: Schema construction is SDK-version specific. The google-genai:1.51.0
        // Schema API uses Schema.builder().type(Type.Known.OBJECT).properties(Map.of(...))
        // — see the SDK's types package. Full builder code is ~40 lines. CC uses the SDK's
        // actual API; this spec documents the shape the schema must enforce:
        //
        //   id:                string (enum of 16 allowed values)
        //   topic:             string
        //   answer:            string (minLength 50)
        //   verses:            array of exactly 3 objects, each { reference, text, explanation }
        //   encouragement:     string
        //   prayer:            string (minLength 30)
        //   followUpQuestions: array of exactly 3 strings
        //
        // required: all of the above
        //
        // See also: https://ai.google.dev/gemini-api/docs/structured-output for schema semantics.
        throw new UnsupportedOperationException("Implement per SDK API — see inline comment for shape");
    }
```

The schema builder is deliberately left as a spec-time TODO because the google-genai 1.51.0 API for `Schema` construction is verbose (30-40 lines of builder chains) and verifying the exact API shape requires checking the SDK source. Step 4 of the plan handles schema construction using the SDK's actual API. The validation logic (below) is the safety net — if Gemini ignores schema and returns malformed JSON, the parse+validate step catches it.

```java
    /**
     * Parses Gemini's text response (expected JSON due to structured-output mode) into
     * AskResponseDto and validates business rules. Returns null on parse or validation
     * failure — caller retries.
     *
     * Safety-block detection runs here too, before JSON parsing. Same three-path check
     * Spec 2 uses in GeminiService.
     */
    private AskResponseDto parseAndValidate(GenerateContentResponse response) {
        // Three-path safety detection (Spec 2 D9 pattern, enum-based)
        if (isSafetyBlocked(response)) {
            throw new SafetyBlockException("This question was blocked by safety filters. Please rephrase.");
        }

        String text = extractText(response);
        if (text == null || text.isBlank()) {
            return null;  // empty → retry
        }

        AskResponseDto dto;
        try {
            dto = objectMapper.readValue(text, AskResponseDto.class);
        } catch (Exception parseEx) {
            log.info("Ask JSON parse failed: {}", parseEx.getClass().getSimpleName());
            return null;  // parse error → retry
        }

        if (!validateResponse(dto)) {
            return null;  // validation failure → retry
        }

        return dto;
    }

    /** Returns false if the DTO fails business validation. */
    private static boolean validateResponse(AskResponseDto dto) {
        if (dto == null) return false;
        if (isBlank(dto.id()) || isBlank(dto.topic()) || isBlank(dto.answer())
            || isBlank(dto.encouragement()) || isBlank(dto.prayer())) return false;
        if (!ALLOWED_IDS.contains(dto.id())) return false;
        if (dto.verses() == null || dto.verses().size() != 3) return false;
        for (AskVerseDto v : dto.verses()) {
            if (v == null || isBlank(v.reference()) || isBlank(v.text()) || isBlank(v.explanation())) return false;
        }
        if (dto.followUpQuestions() == null || dto.followUpQuestions().size() != 3) return false;
        for (String q : dto.followUpQuestions()) {
            if (isBlank(q)) return false;
        }
        return true;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static final java.util.Set<String> ALLOWED_IDS = java.util.Set.of(
        "suffering", "forgiveness", "anxiety", "purpose", "doubt", "prayer",
        "grief", "loneliness", "anger", "marriage", "parenting", "money",
        "identity", "temptation", "afterlife", "fallback"
    );
```

```java
    /** Three-path safety detection matching Spec 2 GeminiService pattern (D9 enum-based). */
    private static boolean isSafetyBlocked(GenerateContentResponse response) {
        if (response == null) return false;
        Optional<PromptFeedback> feedback = response.promptFeedback();
        if (feedback.isPresent() && feedback.get().blockReason().isPresent()) {
            BlockReason br = feedback.get().blockReason().get();
            if (br.equals(new BlockReason(BlockReason.Known.SAFETY))) return true;
        }
        List<Candidate> candidates = response.candidates().orElse(List.of());
        if (!candidates.isEmpty()) {
            Candidate first = candidates.get(0);
            Optional<FinishReason> fr = first.finishReason();
            if (fr.isPresent()) {
                FinishReason reason = fr.get();
                if (reason.equals(new FinishReason(FinishReason.Known.SAFETY))) return true;
                if (reason.equals(new FinishReason(FinishReason.Known.PROHIBITED_CONTENT))) return true;
            }
        }
        return false;
    }

    /** Null-safe extraction of the response's first candidate's text. */
    private static String extractText(GenerateContentResponse response) {
        if (response == null) return null;
        List<Candidate> candidates = response.candidates().orElse(List.of());
        if (candidates.isEmpty()) return null;
        Optional<Content> content = candidates.get(0).content();
        if (content.isEmpty()) return null;
        List<Part> parts = content.get().parts().orElse(List.of());
        if (parts.isEmpty()) return null;
        return parts.get(0).text().orElse(null);
    }

    private static UpstreamException mapGeminiException(RuntimeException ex) {
        // Match Spec 2 GeminiService.mapException — never leak upstream text.
        if (isTimeout(ex)) {
            return new UpstreamTimeoutException("AI service timed out. Please try again.", ex);
        }
        return new UpstreamException("AI service is temporarily unavailable. Please try again.", ex);
    }

    private static boolean isTimeout(Throwable ex) {
        Throwable cur = ex;
        while (cur != null) {
            if (cur instanceof java.util.concurrent.TimeoutException) return true;
            cur = cur.getCause();
        }
        return false;
    }
```

```java
    /** Server-side canned response when all retries exhausted. See Architecture Decision #12. */
    static final AskResponseDto FALLBACK_RESPONSE = new AskResponseDto(
        "fallback",
        "Seeking Wisdom",
        "That's a deep question, and I want to honor it with a thoughtful answer. "
            + "I'm having trouble reaching our AI service right now — but Scripture has "
            + "wisdom for every question you bring. Take a moment to pray, open the Bible "
            + "to a passage that speaks to you, or explore the topics below. You're not "
            + "alone in wondering.",
        List.of(
            new AskVerseDto(
                "Psalm 46:10",
                "Be still, and know that I am God.",
                "Sometimes the answer isn't another piece of information — it's slowing down enough to hear God in the quiet."
            ),
            new AskVerseDto(
                "Proverbs 3:5-6",
                "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
                "Trusting God's wisdom above your own opens the door for his guidance in every situation."
            ),
            new AskVerseDto(
                "Matthew 7:7",
                "Ask, and it will be given you. Seek, and you will find. Knock, and it will be opened for you.",
                "God honors the honest question. Asking is itself an act of faith."
            )
        ),
        "God hears every question of your heart. Keep asking.",
        "Lord, I don't have all the answers, and right now I can't see the path clearly. Help me to trust you in what I don't understand. Give me patience to wait on your wisdom and courage to keep asking. Amen.",
        List.of(
            "How does the Bible say to handle uncertainty?",
            "What does it mean to trust God?",
            "How can I grow in faith today?"
        )
    );
}
```

That closes `AskService.java`. Total ~340 lines including the two constants.

---

#### `AskController.java`

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/proxy/ai")
public class AskController {

    private static final Logger log = LoggerFactory.getLogger(AskController.class);

    private final AskService service;

    public AskController(AskService service) {
        this.service = service;
    }

    @PostMapping("/ask")
    public ProxyResponse<AskResponseDto> ask(@Valid @RequestBody AskRequest request) {
        int historyLength = request.conversationHistory() == null
            ? 0 : request.conversationHistory().size();
        log.info("Ask request received questionLength={} historyLength={}",
            request.question().length(), historyLength);
        AskResponseDto result = service.ask(request);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
```

**Notes:**
- Sits in the same `proxy.ai` package as `GeminiController` from Spec 2. Shared `@RequestMapping` base path; different endpoint paths (`/explain`, `/reflect` from Spec 2; `/ask` from this spec). No conflict.
- Log line follows `07-logging-monitoring.md` PII discipline: `questionLength` + `historyLength`, never `question` content, never history content. Matches Spec 2 precedent.
- No `@Validated` on the class — only `@RequestBody` validation here, no `@RequestParam`. (Contrast with Spec 3's `MapsController` which needed `@Validated` for the query-param `@Pattern` guards.)
- Framework log suppression from Spec 2's D7 automatically covers this controller's `@RequestBody` deserialization — no new logging config needed.

---

### Backend tests

Five new test classes under `backend/src/test/java/com/example/worshiproom/proxy/ai/` (alongside Spec 2's tests). Mirror Spec 2's patterns.

#### `AskCrisisDetectorTest.java`

Plain JUnit unit tests. 6 tests minimum:

1. `detectsCrisis_returnsTrueForExactKeyword()` — each of the 12 keywords triggers true.
2. `detectsCrisis_caseInsensitive()` — "KILL MYSELF" and "Kill Myself" both trigger.
3. `detectsCrisis_substringMatch()` — "I'm thinking of suicide tonight" triggers.
4. `detectsCrisis_returnsFalseForNullOrBlank()` — null, "", "   " all return false.
5. `detectsCrisis_returnsFalseForUnrelatedText()` — "How do I forgive my brother?" returns false.
6. `parityWithFrontend()` — reads `frontend/src/constants/crisis-resources.ts`, extracts the `SELF_HARM_KEYWORDS` array, asserts every frontend keyword appears in the backend's list (backend may add more; may not remove any). Uses `Files.readString(Path.of("../frontend/src/constants/crisis-resources.ts"))` and a regex to pull the array contents. This test is load-bearing — it catches drift if someone edits the frontend file without updating the backend copy.
7. `buildCrisisResponse_returnsValidShape()` — calls `buildCrisisResponse()`, validates every field is populated and matches business rules (3 verses, 3 follow-ups, all non-empty, id="crisis").

#### `AskPromptsTest.java`

8 tests, one per rule, each asserting verbatim-substring presence of the rule's key phrase in `ASK_SYSTEM_PROMPT`:

1. `systemPrompt_rule1_webTranslation()` — contains "World English Bible (WEB)"
2. `systemPrompt_rule2_exactly3Verses()` — contains "exactly 3 verses"
3. `systemPrompt_rule3_exactly3FollowUps()` — contains "exactly 3 follow-up questions"
4. `systemPrompt_rule4_secondPerson()` — contains "warm second-person voice"
5. `systemPrompt_rule5_acknowledgePain()` — contains "Acknowledge pain"
6. `systemPrompt_rule6_prayerFirstPerson()` — contains "first-person prayer"
7. `systemPrompt_rule7_encouragementShort()` — contains "one short sentence"
8. `systemPrompt_rule8_idEnum()` — contains all 16 allowed id values

Plus: `buildUserPrompt_noHistory_returnsQuestionOnly()`, `buildUserPrompt_withHistory_formatsCorrectly()`, `buildUserPrompt_emptyHistoryTreatedAsNull()`.

#### `AskServiceTest.java`

`Mockito.spy()` on the service per D2b. ~18 tests minimum:

**Crisis path (2):**
1. `ask_crisisKeywordShortCircuits()` — question "I want to die" → returns crisis response, `callGeminiForAsk` is never invoked.
2. `ask_crisisResponseHasExpectedShape()` — validates crisis response shape (id="crisis", 3 verses, etc.).

**Happy path (3):**
3. `ask_happyPath_returnsValidResponse()` — spy returns a valid Gemini JSON response; assert parsed DTO matches.
4. `ask_conversationHistoryPassedToPrompt()` — assert `buildUserPrompt` is called with the history argument (verify via the spy's recorded call to `callGeminiForAsk`).
5. `ask_nullConversationHistoryHandled()` — null history doesn't throw.

**Validation + retry (4):**
6. `ask_malformedJsonRetriesOnce()` — first call returns garbage, second call returns valid JSON; assert final result is valid, assert 2 calls to `callGeminiForAsk`, second call's `withRetryCorrective` is true.
7. `ask_twoVersesInsteadOfThreeTriggersRetry()` — first call has 2 verses; assert retry fires.
8. `ask_twoValidFailuresFallBackToCanned()` — both calls return malformed JSON; assert `FALLBACK_RESPONSE` returned, assert warn-level log.
9. `ask_invalidIdEnumValueTriggersRetry()` — first call returns id="unknown-topic"; retry fires.

**Error mapping (4):**
10. `ask_nullClient_throwsUpstreamNotConfigured()` — create service with empty API key; assert `UpstreamException("AI service is not configured on the server.")`.
11. `ask_safetyBlockThrowsSafetyBlockException()` — spy returns a response with `finishReason=SAFETY`; assert `SafetyBlockException` thrown.
12. `ask_webClientTimeoutMapsTo504()` — spy throws wrapped `TimeoutException`; assert `UpstreamTimeoutException`.
13. `ask_sdkErrorMapsTo502()` — spy throws generic `RuntimeException`; assert `UpstreamException` with generic message.

**No-leak invariants (2):**
14. `noLeakOfUpstreamErrorText()` — spy throws `RuntimeException("GoogleSecretKeyABC")`; assert thrown `UpstreamException.getMessage()` does not contain "GoogleSecretKeyABC", "AIza", "gemini", "google", "key=".
15. `noLeakInCrisisResponse()` — crisis response text contains no API keys or upstream details.

**Validation unit tests (3):**
16. `validateResponse_acceptsValidDto()` — handcrafted valid DTO passes.
17. `validateResponse_rejectsEmptyFields()` — each required field blanked → rejected.
18. `validateResponse_rejectsInvalidCounts()` — 2 verses, 4 follow-ups, etc. → rejected.

#### `AskControllerTest.java`

`@WebMvcTest(AskController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})`. `@MockBean AskService`. ~10 tests:

1. `ask_happyPath_returns200WithBody()` — POST valid body, mock service returns canonical DTO, assert `ProxyResponse` envelope shape.
2. `ask_missingQuestion_returns400()` — assert `INVALID_INPUT`.
3. `ask_blankQuestion_returns400()` — `question: "   "` triggers `@NotBlank`.
4. `ask_questionTooLong_returns400()` — 501-char question; assert 400.
5. `ask_conversationHistoryTooLong_returns400()` — 7 messages; assert 400 via `@Size(max=6)`.
6. `ask_invalidRoleInHistory_returns400()` — `role: "system"`; assert 400 via `@Pattern`.
7. `ask_contentTooLongInHistory_returns400()` — 2001-char content; assert 400 via `@Size`.
8. `ask_nullConversationHistoryAccepted()` — field omitted entirely → 200 success.
9. `ask_serviceThrowsSafetyBlock_returns422()` — assert `SAFETY_BLOCK` code.
10. `ask_serviceThrowsUpstream_returns502()` — assert `UPSTREAM_ERROR`.
11. `ask_xRequestIdHeaderPresent()` — verify header on success.

#### `AskIntegrationTest.java`

`@SpringBootTest(webEnvironment = RANDOM_PORT) @AutoConfigureMockMvc @MockBean AskService`. ~6 tests (matches Spec 2 pattern):

1. `fullLifecycle_ask_returnsExpectedHeaders()` — all rate-limit + request-id headers present, body has `data.*` + `meta.requestId`.
2. `fullLifecycle_ask_propagatesClientRequestId()` — client-supplied `X-Request-Id: test-id-1` round-trips.
3. `fullLifecycle_invalidInput_returnsProxyErrorShape()` — 400 body matches `{code, message, requestId, timestamp}`.
4. `fullLifecycle_unconfiguredReturns502()` — override `proxy.gemini.api-key=""`, mock service to throw the configured-check exception, assert 502 with generic message.
5. `fullLifecycle_noUpstreamErrorTextLeaks()` — mock service throws with secret-leaking cause; assert response body has zero matches for the secret.
6. `fullLifecycle_crisisPathBypassesGemini()` — mock service to short-circuit (simulate crisis); assert response `data.id == "crisis"` and `data.answer` contains "988".

---

### OpenAPI additions

Insert into `backend/src/main/resources/openapi.yaml`. CC reads the current file structure before editing.

**Path addition (under `paths:`):**

```yaml
/api/v1/proxy/ai/ask:
  post:
    tags: [Proxy / AI]
    summary: Ask a Scripture-grounded question
    description: |
      Returns an AI-generated answer with 3 supporting Bible verses (WEB translation),
      a prayer, encouragement, and 3 follow-up questions. Conversation history may be
      included for multi-turn context. Crisis keywords in the question trigger a canned
      crisis response without calling the upstream AI model.
    operationId: askQuestion
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: '#/components/schemas/AskRequest' }
    responses:
      '200':
        description: Structured answer or crisis response
        content:
          application/json:
            schema:
              type: object
              required: [data, meta]
              properties:
                data: { $ref: '#/components/schemas/AskResponse' }
                meta: { $ref: '#/components/schemas/ResponseMeta' }
      '400': { $ref: '#/components/responses/BadRequest' }
      '422': { $ref: '#/components/responses/SafetyBlocked' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }
      '500': { $ref: '#/components/responses/InternalError' }
```

`SafetyBlocked` response (HTTP 422) was introduced in Spec 2; reused here.

**Schema additions (under `components.schemas`):**

```yaml
AskRequest:
  type: object
  required: [question]
  properties:
    question:
      type: string
      minLength: 1
      maxLength: 500
      example: "Why does God allow suffering?"
    conversationHistory:
      type: array
      maxItems: 6
      nullable: true
      items: { $ref: '#/components/schemas/ConversationMessage' }

ConversationMessage:
  type: object
  required: [role, content]
  properties:
    role:
      type: string
      enum: [user, assistant]
    content:
      type: string
      minLength: 1
      maxLength: 2000

AskResponse:
  type: object
  required: [id, topic, answer, verses, encouragement, prayer, followUpQuestions]
  properties:
    id:
      type: string
      enum:
        - suffering
        - forgiveness
        - anxiety
        - purpose
        - doubt
        - prayer
        - grief
        - loneliness
        - anger
        - marriage
        - parenting
        - money
        - identity
        - temptation
        - afterlife
        - fallback
        - crisis
    topic: { type: string }
    answer: { type: string }
    verses:
      type: array
      minItems: 3
      maxItems: 3
      items: { $ref: '#/components/schemas/AskVerse' }
    encouragement: { type: string }
    prayer: { type: string }
    followUpQuestions:
      type: array
      minItems: 3
      maxItems: 3
      items: { type: string }

AskVerse:
  type: object
  required: [reference, text, explanation]
  properties:
    reference: { type: string, example: "Romans 8:28" }
    text: { type: string }
    explanation: { type: string }
```

Note: `AskResponse.id` includes "crisis" in the OpenAPI enum even though `AskService.ALLOWED_IDS` doesn't (backend only accepts 16 from Gemini; "crisis" is only produced by the server-side crisis detector). The OpenAPI doc reflects the full public contract, so both values are documented.

---

## Frontend implementation

### `services/ask-service.ts` (new file)

```typescript
// Ask AI — frontend service layer.
//
// Calls the backend proxy; on ANY error (HTTP 4xx/5xx, network, timeout, parse),
// falls through to the existing mock in @/mocks/ask-mock-data. User never sees a
// raw error state — the mock's 16 canned responses are the graceful-degradation
// floor.

import type { AskResponse } from '@/types/ask'
import { getAskResponse } from '@/mocks/ask-mock-data'

const PROXY_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/ask`
const REQUEST_TIMEOUT_MS = 30_000  // Gemini can take up to 10s upstream; give plenty of slack

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

interface AskEnvelope {
  data: AskResponse
  meta?: { requestId?: string }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
```

```typescript
/**
 * Fetches a Scripture-grounded answer from the backend proxy. Falls through to
 * the local mock on any failure, so callers never need to handle errors — a
 * valid AskResponse is always returned.
 *
 * The mock fallback is intentional: Ask must never show a raw error. If the
 * backend is down, Gemini is slow, or the network is flaky, the user still gets
 * a thoughtful response from the 16 curated mock topics.
 */
export async function fetchAskResponse(
  question: string,
  conversationHistory?: ConversationTurn[],
): Promise<AskResponse> {
  try {
    const body = {
      question,
      conversationHistory: conversationHistory && conversationHistory.length > 0
        ? conversationHistory
        : null,
    }
    const response = await fetchWithTimeout(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return getAskResponse(question)
    }

    const envelope = (await response.json()) as AskEnvelope
    if (!envelope.data || !envelope.data.id || !Array.isArray(envelope.data.verses)) {
      return getAskResponse(question)
    }

    return envelope.data
  } catch {
    return getAskResponse(question)
  }
}
```

No exports beyond `fetchAskResponse` and `ConversationTurn`. The service is deliberately thin — all complexity (validation, retries, crisis handling) lives server-side. The frontend's only job is: fetch, parse, fall back on any error.

### `pages/AskPage.tsx` (modified)

Two call-site changes. Both are inside existing `setTimeout` blocks that need to become async `fetch` calls.

**Before (current state, Line 75–83):**

```typescript
loadingTimerRef.current = setTimeout(() => {
  const result = getAskResponse(submittedText)
  setConversation((prev) => [...prev, { question: submittedText, response: result }])
  setText('')
  setPendingQuestion(null)
  setIsLoading(false)
  // ... scroll logic
}, ASK_LOADING_DELAY_MS)
```

**After:**

```typescript
// Build conversation history from prior turns, flattened to role/content pairs.
const history: ConversationTurn[] = conversation.flatMap((pair) => [
  { role: 'user' as const, content: pair.question },
  { role: 'assistant' as const, content: pair.response.answer },
])

fetchAskResponse(submittedText, history).then((result) => {
  setConversation((prev) => [...prev, { question: submittedText, response: result }])
  setText('')
  setPendingQuestion(null)
  setIsLoading(false)
  // ... scroll logic (unchanged)
})
```

Same transformation in `handleFollowUpClick` (Line ~144). Both sites:
- Remove `setTimeout(..., ASK_LOADING_DELAY_MS)` wrapper
- Remove `loadingTimerRef.current = setTimeout(...)` assignment (the cleanup `useEffect` that clears `loadingTimerRef` can stay — it becomes a no-op when the ref is never set, which is safe)
- Replace with `fetchAskResponse(submittedText, history).then(...)` using the existing `.then` callback body
- Build `history` array from the existing `conversation` state

Import updates:
- Add: `import { fetchAskResponse, type ConversationTurn } from '@/services/ask-service'`
- Remove: `import { getAskResponse } from '@/mocks/ask-mock-data'` (no longer directly used in the page; the mock is imported inside `ask-service.ts`)
- Remove: `ASK_LOADING_DELAY_MS` from the `@/constants/ask` import (no longer used)

### `constants/ask.ts` (modified)

Change `ASK_LOADING_DELAY_MS` from `2000` to remove or repurpose:

```typescript
// REMOVED: export const ASK_LOADING_DELAY_MS = 2000
//
// Previously used to enforce a cosmetic 2-second "Searching Scripture..." delay
// before returning mock responses. After AI-1 (ai-integration-ask spec), the
// loading duration is driven by actual Gemini latency via fetchAskResponse().
```

Leave the comment as a tombstone for future archaeology. Don't delete silently — Eric's `.claude/rules` convention is to explain removals in-file when they change established API surfaces.

### Frontend test updates

#### `services/__tests__/ask-service.test.ts` (new)

`vi.stubGlobal('fetch', ...)` for fetch mocks. ~15 tests:

**Happy path (3):**

1. `fetchAskResponse_callsBackendProxyWithCorrectBody()` — fetch mock verifies URL is `/api/v1/proxy/ai/ask`, method POST, body shape matches `AskRequest`.
2. `fetchAskResponse_returnsParsedEnvelope()` — fetch returns `{data: validResponse, meta: {requestId: "test-id"}}`; assert returned value matches `validResponse`.
3. `fetchAskResponse_conversationHistoryPassed()` — pass 2-turn history; assert body contains `conversationHistory` with 2 entries.

**Fallback paths (8):** (all must fall back to mock)

4. `fetchAskResponse_400_fallsBackToMock()` — fetch returns 400; result is `getAskResponse(question)`.
5. `fetchAskResponse_422SafetyBlock_fallsBackToMock()` — fetch returns 422.
6. `fetchAskResponse_429_fallsBackToMock()` — fetch returns 429.
7. `fetchAskResponse_502_fallsBackToMock()` — fetch returns 502.
8. `fetchAskResponse_504_fallsBackToMock()` — fetch returns 504.
9. `fetchAskResponse_networkError_fallsBackToMock()` — fetch rejects.
10. `fetchAskResponse_timeoutTriggersFallback()` — fetch never resolves; after 30s the abort fires; result is mock.
11. `fetchAskResponse_malformedResponseShape_fallsBackToMock()` — fetch returns 200 but `{data: {id: null}}`; fallback fires.

**Edge cases (4):**

12. `fetchAskResponse_nullHistoryOmitted()` — no history arg → body has `conversationHistory: null`.
13. `fetchAskResponse_emptyHistoryTreatedAsNull()` — `[]` → body has `conversationHistory: null`.
14. `fetchAskResponse_fallbackResponseHasValidShape()` — every error path's fallback result passes `AskResponse` type checks.
15. `fetchAskResponse_specificMockSelectedByKeyword()` — question "Why does God allow suffering?" + network error → fallback returns the "suffering" mock response specifically (verifies the local keyword matcher still works).

Use `vi.useFakeTimers()` for the timeout test; use `vi.mock('@/mocks/ask-mock-data')` with `getAskResponse` as a spy to verify it's called on fallback paths.

#### `pages/__tests__/AskPage.test.tsx` (modified)

The existing test file mocks `getAskResponse`. After this spec, mock `fetchAskResponse` instead:

```typescript
vi.mock('@/services/ask-service', () => ({
  fetchAskResponse: vi.fn(),
}))
```

Update ~6 existing tests that reference `getAskResponse`:
- Swap `getAskResponse` mock setup → `fetchAskResponse` mock setup returning a `Promise<AskResponse>`
- Tests that advance timers for `ASK_LOADING_DELAY_MS` change to awaiting the promise resolution (use `await screen.findByText(...)` instead of `act(() => vi.advanceTimersByTime(2000))`)
- Add one NEW test: `submits_passesConversationHistoryOnFollowUp` — submit first question, wait for response, click a follow-up, assert `fetchAskResponse` was called on the second invocation with a history array of length 2.

#### `pages/__tests__/AskPage.offline.test.tsx` (verify only)

No changes needed — offline gating happens before the service call (the `OfflineNotice` returns early in the render). Run the test suite and confirm it stays green.

---

## Pre-Execution Checklist

Before running `/execute-plan-forums`, verify (or CC verifies and surfaces):

### Branch state

- [ ] Current branch: `claude/feature/ai-integration-ask`
- [ ] `git status` clean (no uncommitted changes from prior work)
- [ ] `git log main --oneline -10` shows all three Key Protection wave merge commits ("AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration")

### Backend baseline

- [ ] `cd backend && ./mvnw test` passes on current branch baseline (no pre-existing failures)
- [ ] `backend/.env.local` has `GEMINI_API_KEY=AIza...` populated (provisioned during Spec 2's D6; should still be present)
- [ ] `proxy.gemini.api-key` config wiring is present in `ProxyConfig.java` (from Spec 1, used by Spec 2 — already wired)
- [ ] `GeminiService` in `proxy/ai/` package compiles and its tests pass (smoke check that Spec 2's infrastructure is healthy; if broken, fix before starting this spec)

### Gemini key is reused — no new provisioning

Spec AI-1 reuses Spec 2's backend Gemini key. No GCP console work needed. No new env vars. If the key from Spec 2 was deactivated, re-provision via [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) signed in as the personal Google account (Yahoo variant per D6). Paste into `backend/.env.local`.

### Frontend baseline

- [ ] `cd frontend && npm test -- --run` passes on current branch baseline
- [ ] `cd frontend && npm run build` succeeds
- [ ] Verify `/ask` route loads in dev server with the current mock behavior (baseline smoke)

### CI / dev-loop readiness

- [ ] Backend runs via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` (non-Docker — the Spec 3 D-pattern established this as an accepted alternative to Docker Compose when Docker isn't available)
- [ ] `/api/v1/health` returns `providers.gemini.configured: true` (confirms env loading)

### Charter carryover from Spec 2 + Spec 3

CC operates under the seven-condition auto-decision charter, same as Specs 2 and 3:
- No public API change
- No behavior change
- No rules/spec/plan edits
- No security/auth/CORS/logging/PII/rate-limit surface
- No scope change
- No cross-spec precedent
- Alternative strictly worse

Uncertainty = stop. Spec 2's framework log suppression (D7) is already active; covers this spec's `@RequestBody` deserialization. Non-Docker smoke pattern (Spec 3 D-addendum) is the expected runtime verification path. Orphan-symbol cleanup auto-approved. Secret fingerprinting (prefix+suffix) when surfacing any API key material.

### Expected D-pattern carryovers

Anticipate these deviations during execution; spec is pre-loaded to avoid each:

- **D2b test seam pattern**: `callGeminiForAsk` + `callModels` package-private methods already defined in `AskService` per spec. Tests use `Mockito.spy()` + `doReturn()`.
- **D7 framework log suppression**: already in `application-dev.properties`. No new config needed.
- **D9 enum-based safety detection**: `isSafetyBlocked` uses `FinishReason.Known` enum comparison, not `toString()` match. Matches Spec 2 D9 hardening.
- **Structured output schema construction**: google-genai 1.51.0 Schema builder API is verbose; CC fills in the `buildResponseSchema()` method during Step 4 using the SDK's actual API. Validation logic (in `validateResponse`) is the safety net if Gemini ignores the schema. **If the SDK API doesn't support all schema features (e.g., `minItems`/`maxItems` on arrays), downgrade gracefully — the response validator is the authoritative check.**

---

## Acceptance Criteria

### Functional

- [ ] `POST /api/v1/proxy/ai/ask` returns 200 with `{data: AskResponseDto, meta: {requestId}}` for valid questions, hitting real Gemini upstream
- [ ] Crisis-keyword questions (e.g., "I want to die") return 200 with `data.id == "crisis"`, body contains "988", NO Gemini upstream call verified by backend log showing zero Gemini request for the request ID
- [ ] Follow-up questions with `conversationHistory` produce contextually-aware answers (e.g., "Tell me more about that" after "Why does God allow suffering?" responds to the suffering thread, not a cold re-ask)
- [ ] Invalid bodies return 400 with `ProxyError` shape (missing question, blank question, oversized question, oversized history, invalid role)
- [ ] Gemini safety blocks return 422 with `code: SAFETY_BLOCK`
- [ ] Network failures from backend → Gemini return 502 or 504, with generic user-safe messages
- [ ] Visiting `/ask` in the browser, asking any of the 15 canned topics returns an AI-generated response (not the canned mock) — verify by observing response `id` values that match the topic classification AND by checking the network tab for a POST to `/api/v1/proxy/ai/ask`
- [ ] Asking a novel question (one that doesn't match any keyword in `TOPIC_KEYWORDS`) returns an AI-generated response that actually addresses the question — not the generic fallback

### Frontend graceful degradation

- [ ] With the backend stopped, `/ask` still works — submitting a question returns a mock response from `getAskResponse(question)`. No error toasts, no broken UI
- [ ] With slow Gemini (simulate via `fetchWithTimeout` timeout of 1s in a test), the abort fires and the mock fallback renders within the 30s timeout budget
- [ ] Malformed backend response (return `{data: {id: null}}` from a mocked backend) falls through to mock, user sees a valid response
- [ ] Offline mode continues to work — `OfflineNotice` still renders before any fetch attempt, unchanged by this spec

### Security invariants (carried from Spec 2 + Spec 3)

- [ ] No upstream error text leaks to client. Verified by `noLeakOfUpstreamErrorText` test in `AskServiceTest` and `fullLifecycle_noUpstreamErrorTextLeaks` in `AskIntegrationTest`
- [ ] Backend logs contain ONLY `questionLength` + `historyLength` for Ask requests — never `question` content, never history content. Verified via `grep -E 'question=|content=' backend log | wc -l` returning `0` for any sensitive substring post-request
- [ ] D7 framework-log-suppression continues to hold; `RequestResponseBodyMethodProcessor` does not log `AskRequest.toString()` content at DEBUG level
- [ ] `X-Request-Id` header present on all responses. `meta.requestId` in body matches the header
- [ ] Rate-limit headers (`X-RateLimit-Limit/Remaining/Reset`) present on all responses (inherits from Spec 1's `RateLimitFilter` scoped to `/api/v1/proxy/**`)
- [ ] `Retry-After` header present on 429 responses
- [ ] No new API keys introduced on the frontend — bundle grep for `AIza` returns 0 after the spec ships (same assertion as Specs 2 and 3)

### Quality invariants

- [ ] Prompt discipline enforced by `AskPromptsTest` — all 8 rules present verbatim; accidental edits fail CI
- [ ] Response validation enforces exactly 3 verses + exactly 3 follow-up questions. Verified by `AskServiceTest.validateResponse_rejectsInvalidCounts`
- [ ] Retry-on-validation-failure works. Verified by `AskServiceTest.ask_malformedJsonRetriesOnce` and `ask_twoVersesInsteadOfThreeTriggersRetry`
- [ ] After 2 validation failures, service returns `FALLBACK_RESPONSE` (server-owned) with a warn-level log. Verified by `AskServiceTest.ask_twoValidFailuresFallBackToCanned`

### Crisis response invariants

- [ ] Crisis response's `id` is exactly `"crisis"`
- [ ] Crisis response contains "988" literal somewhere in `answer` or `encouragement` text
- [ ] Crisis response includes at least one link to local support counselors in the spirit of the frontend's CrisisBanner (the response's follow-up questions point users there — e.g., "How do I find a counselor near me?")
- [ ] Backend keyword list has parity with or superset of frontend `SELF_HARM_KEYWORDS`. Verified by `AskCrisisDetectorTest.parityWithFrontend`

### Test coverage

- [ ] All ~18 tests in `AskServiceTest` pass
- [ ] All ~11 tests in `AskControllerTest` pass
- [ ] All 6 tests in `AskIntegrationTest` pass
- [ ] All 11 tests in `AskPromptsTest` pass
- [ ] All 7 tests in `AskCrisisDetectorTest` pass
- [ ] Frontend service: all ~15 tests in `services/__tests__/ask-service.test.ts` pass
- [ ] Frontend page: updated `AskPage.test.tsx` tests green, including the new `submits_passesConversationHistoryOnFollowUp`
- [ ] `AskPage.offline.test.tsx` unchanged and still passes
- [ ] No tests skipped, no `xit` / `it.skip` / `it.todo`

### CI / build

- [ ] `cd backend && ./mvnw test` exit code 0
- [ ] `cd frontend && npm run build` succeeds
- [ ] `cd frontend && npm test -- --run` exit code 0
- [ ] Bundle scan: `grep -r 'AIza[0-9A-Za-z_-]{35}' frontend/dist/assets/*.js | wc -l` returns 0 (same invariant as Spec 2)
- [ ] Bundle scan: `grep -r 'VITE_GEMINI_API_KEY' frontend/dist/assets/*.js | wc -l` returns 0 (same as Spec 2)

### Runtime verification (Docker-free smoke, per Spec 3 D-addendum)

- [ ] Start backend via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` with env from `backend/.env.local`
- [ ] Health probe: `curl -s http://localhost:8080/api/v1/health | jq .providers.gemini.configured` returns `true`
- [ ] Ask smoke (real Gemini):
  ```bash
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/ask \
    -H 'Content-Type: application/json' \
    -d '{"question":"Why does God allow suffering?","conversationHistory":null}' \
    | jq '{id: .data.id, topic: .data.topic, verseCount: (.data.verses | length), followUpCount: (.data.followUpQuestions | length), requestId: .meta.requestId}'
  ```
  Expect: `id` in allowed list, 3 verses, 3 follow-ups, 22-char `requestId`
- [ ] Crisis smoke: `curl -s -X POST .../ai/ask -d '{"question":"I want to die"}' | jq .data.id` returns `"crisis"`. Confirm backend log shows zero Gemini invocation for this request ID
- [ ] Follow-up smoke: submit question, capture answer, submit second question with `conversationHistory` of the first exchange, verify contextual awareness in the second response
- [ ] Invalid input smoke: `curl -s .../ai/ask -d '{"question":""}' | jq .code` returns `"INVALID_INPUT"`
- [ ] PII leak smoke: `grep -E 'question=.+(god|forgive|anxious|suicide)' backend-stdout.log | wc -l` returns `0` (controller logs length only)
- [ ] Rate-limit header smoke: curl a normal request, confirm all three `X-RateLimit-*` headers present
- [ ] Shut down backend cleanly after smoke; confirm no zombie process on port 8080

### Operational

- [ ] After merge: nothing to do. Gemini key unchanged from Spec 2; no new env vars; no new GCP resources. Users immediately see real AI on `/ask`.
- [ ] (Optional, future) Set up a monitoring dashboard for AI request failure rates, fallback rates, and safety-block rates. Out of scope for this spec.

---

## See Also

- `_specs/ai-proxy-foundation.md` (Spec 1, merged) — provides `ProxyResponse`, `ProxyError`, `ProxyException`, `SafetyBlockException`, `WebClient`, `RateLimitFilter`, `RequestIdFilter`, `ProxyExceptionHandler`, `ProxyConfig.GeminiProperties`, `Health` endpoint providers block. This spec reuses ALL of these.
- `_specs/ai-proxy-gemini.md` (Spec 2, merged) — pattern reference. `GeminiController` / `GeminiService` / `GeminiPrompts` / `GeminiResponseDto` are the structural templates for this spec's `AskController` / `AskService` / `AskPrompts` / `AskResponseDto`. D2b test seam, D7 framework log suppression, D9 enum-based safety detection all carry forward verbatim.
- `_specs/ai-proxy-maps.md` (Spec 3, merged) — non-Docker smoke pattern (Step 7 of Spec 3's plan as executed) is the expected runtime verification approach for this spec.
- `_specs/ai-integration-pray.md` (Spec AI-2, future) — same pattern for prayer generation. Will likely reuse `AskService`'s retry/validation/fallback pattern with different DTOs and prompts.
- `_specs/ai-integration-journal.md` (Spec AI-3, future) — same pattern for journal reflections. Closes the AI Integration wave.
- `frontend/src/mocks/ask-mock-data.ts` — the source of the 16 canned fallback responses. Not modified by this spec; its `getAskResponse(question)` function is the frontend fallback path.
- `frontend/src/constants/crisis-resources.ts` — frontend source of truth for crisis keywords. `AskCrisisDetector.java`'s keyword list must be a superset (enforced by `parityWithFrontend` test).
- `.claude/rules/02-security.md` § Never Leak Upstream Error Text — enforced via `mapGeminiException` chokepoint
- `.claude/rules/03-backend-standards.md` § proxy subpackage convention — places `proxy.ai.*` alongside `proxy.maps.*` and `proxy.common.*`
- `.claude/rules/07-logging-monitoring.md` § PII handling + Framework Log Suppression — already covers this spec via Spec 2's `RequestResponseBodyMethodProcessor` override

---

## Out of Scope (deferred to future specs)

- **AI-2 Prayer Generation** — `POST /api/v1/proxy/ai/pray`, pastoral-tone prompt, swap `generatePrayer` mock → proxy. Same `AskService` pattern, different DTO shape matching `MockPrayer`.
- **AI-3 Journal Reflection** — `POST /api/v1/proxy/ai/reflect-journal` (distinct endpoint from Spec 2's `/reflect` Bible-verse reflection), gentle-mirror prompt, swap `JournalReflect` mock → proxy.
- **Server-side caching of Ask responses.** Each question is long-tail user-specific; not worth the cross-user risk.
- **Streaming responses.** Gemini supports streaming via `generateContentStream`; we're using synchronous `generateContent` for simplicity. Future enhancement if perceived latency becomes an issue.
- **OpenAI provider option.** Per AD#1, Gemini is used for all three AI Integration specs. OpenAI can be added later as a parallel provider (new config class, new service, new key provisioning) if AI quality feedback suggests it's worth the complexity.
- **Conversation storage.** Currently conversations are in-memory only (React state); navigating away loses them. Persistent conversations are a `SaveConversationButton` concern already stubbed in the UI — out of scope here.
- **Analytics pipeline for feedback thumbs up/down.** `ASK_FEEDBACK_KEY` localStorage persists feedback locally; no backend reporting today. Future spec.
- **Rate-limit tuning for AI endpoints specifically.** Uses Spec 1's default `/api/v1/proxy/**` rate limits. If AI responses prove expensive, future work can tune these per-endpoint.
- **Model swap to a larger Gemini variant.** Uses `gemini-2.5-flash-lite` per Spec 2. `gemini-2.5-flash` or `gemini-2.5-pro` would give higher quality at higher cost. One-line change in `AskService.MODEL` if desired.
