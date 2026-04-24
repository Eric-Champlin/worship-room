# AI Integration: Prayer Generation (Spec AI-2 of 3)

**Spec ID:** ai-integration-pray
**Wave:** AI Integration (3-spec series: Ask, Prayer Generation, Journal Reflection — this is AI-2 of 3)
**Track:** Backend Gemini proxy endpoint + frontend mock-to-real swap for the Pray tab's free-form prayer generation
**Branch:** `claude/feature/ai-integration-pray` — cut from `main` after AI-1 (`ai-integration-ask`) merges
**Depends on:** Full AI-1 wave in main. Spec 1 (`ai-proxy-foundation.md`) merged. Spec 2 (`ai-proxy-gemini.md`) merged. Spec 3 (`ai-proxy-maps.md`) merged. Spec AI-1 (`ai-integration-ask.md`) merged — AI-2 reuses the patterns AI-1 established (D2b test seam with reflection-based Client injection, retry-on-validation, server-side fallback constant, crisis parity test, backend mock fallback path).

> **Prerequisite verification:** run `git log main --oneline -15` and confirm the "AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration", and "AI-1: Ask AI Gemini integration" merge commits are all visible. If any is missing, do not proceed.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-integration-pray` throughout.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT run `git checkout`, `git commit`, `git push`, or any git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current`.** If it's not `claude/feature/ai-integration-pray`, STOP and surface.
3. **Preserve the `MockPrayer` TypeScript contract EXACTLY.** `PrayTabContent.tsx`, `PrayerResponse.tsx`, and anything else that consumes a `MockPrayer` from `@/types/daily-experience` must see the same `{id, topic, text}` shape it sees today. The backend `PrayerResponseDto` is that shape, byte-for-byte. Zero component edits for shape reasons.
4. **"Dear God...Amen." structural invariant.** The existing mock's text always starts with a salutation (typically "Dear God,") and ends with "Amen." Existing tests assert `prayer.text.match(/^Dear God/)` and `/Amen\.$/`. Real Gemini output must uphold both invariants. The system prompt enforces them; the backend validator double-checks them before returning; if Gemini drifts off-pattern, retry once, then fall through to the server-side fallback canned prayer.
5. **Crisis detection is defense-in-depth.** The client-side `CrisisBanner` in `PrayerInput` stays in place unchanged. The backend ALSO runs a crisis check BEFORE calling Gemini; if triggered, the backend returns a canned crisis-response `PrayerResponseDto` that embeds 988/Crisis Text/SAMHSA resources directly in the prayer text, WITHOUT calling Gemini. This guarantees crisis resources surface even if the client-side layer is bypassed.
6. **Mock fallback stays as a last resort.** If the backend returns any error (HTTP status, network failure, timeout, or malformed response), the frontend calls the existing `getMockPrayer(text)` and renders that. The user never sees a raw error or empty prayer. The mock's 10 canned prayers are production-quality fallback content.
7. **Use exactly the code specified in this spec.** Match AI-1's conventions verbatim where they apply (they will apply almost everywhere). Deviations only under the charter's seven-condition gate.
8. **Do NOT add Maven dependencies.** `google-genai:1.51.0`, `spring-boot-starter-webflux`, `spring-boot-starter-validation` are all present from Specs 1–2. No new deps.
9. **Do NOT re-export `getMockPrayer` or keep mock-first behavior.** After this spec, the mock is a fallback path only — never the primary source for a happy-path request.

---

## Why this spec exists

Today, `/daily?tab=pray` is a convincing mock. The user types a prayer request (free text, up to 500 chars), sees a 1.5-second fake "generating" state, and receives one of 10 canned prayers selected by a local keyword matcher (anxiety, gratitude, healing, guidance, grief, forgiveness, relationships, strength, general, devotional). The prayers are well-crafted but they're not personalized — a user asking "pray for my custody hearing tomorrow" gets the generic "general" prayer because none of the 8 topic-keyword lists match "custody."

This spec wires Prayer Generation to real Gemini via the backend proxy. After this spec:

- User submits any prayer request → backend calls Gemini with a pastoral-tone system prompt → Gemini returns structured JSON matching the `MockPrayer` shape → frontend renders it through the existing `PrayerResponse` component, unchanged
- Crisis keywords detected (client-side AND server-side) → short-circuit to a crisis-response `PrayerResponseDto` with 988/Crisis Text/SAMHSA resources embedded in the prayer text. Does not call Gemini in the crisis path.
- Backend fails or returns malformed response → frontend falls back to the existing mock (`getMockPrayer`). User always sees a valid prayer.
- The "Dear God, ... Amen." structural contract is preserved by system-prompt rules AND server-side regex validation.

After this spec ships:

1. New backend endpoint `POST /api/v1/proxy/ai/pray` that accepts `{request}`, calls Gemini with structured-output prompting, returns `ProxyResponse<PrayerResponseDto>` matching the frontend `MockPrayer` type exactly.
2. `PrayTabContent.handleGenerate` swaps the `setTimeout(() => getMockPrayer(...), 1500)` block for `fetchPrayer(inputText).then(...)` with mock fallback on any error.
3. Backend and frontend both run crisis detection. Backend wins on response content — if server detects crisis, the prayer text IS the crisis resources (988, text HOME to 741741, etc.) in a pastoral frame.
4. `src/mocks/daily-experience-mock-data.ts` stays in place as the fallback. `getMockPrayer` remains exported and importable — unused on the happy path, the fallback path only.
5. OpenAPI gains the new path + schemas. Gemini safety-block responses (from Spec 2's `SafetyBlockException`) are already mapped.

---

## Affected Frontend Routes

- `/daily?tab=pray` (the Pray tab inside the Daily Hub)

---

## Files touched

| File | Change | Purpose |
|---|---|---|
| `backend/src/main/java/com/example/worshiproom/proxy/ai/PrayerController.java` | Create | One POST endpoint (`/pray`) that validates input, delegates to `PrayerService`. Sits in the existing `proxy.ai` subpackage alongside `GeminiController` (Spec 2) and `AskController` (AI-1). |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/PrayerService.java` | Create | Orchestrates: (1) server-side crisis check → canned response OR (2) Gemini call with structured-output prompt → validation (shape + "Dear God...Amen." regex) → server-side fallback. Same D2b test-seam pattern as AI-1. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/PrayerPrompts.java` | Create | `public static final String` constants for the prayer system prompt + retry corrective suffix. User prompt is constructed inline (no history, no helper needed). |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/PrayerRequest.java` | Create | Request DTO record `{String request}` with `@NotBlank @Size(min=1, max=500)`. Field is named `request` (not `prayer` or `question`) to match the UX terminology — user is submitting a prayer request, not a prayer. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/PrayerResponseDto.java` | Create | Response DTO record `{String id, String topic, String text}` matching the frontend's `MockPrayer` shape exactly. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/PrayerCrisisDetector.java` | Create | Package-private static helpers: `detectsCrisis(String)` and `buildCrisisResponse()`. **The keyword list is IDENTICAL to `AskCrisisDetector.SELF_HARM_KEYWORDS`** — but we duplicate the constant rather than share it (see AD #5). Parity test asserts both backend detectors have the same keywords, AND that they're a superset of the frontend's `SELF_HARM_KEYWORDS`. |
| `backend/src/main/resources/openapi.yaml` | Modify | Add path for `/api/v1/proxy/ai/pray`, schemas for `PrayerRequest`, `PrayerResponse`. Reuses shared error responses from Specs 1–2. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/PrayerControllerTest.java` | Create | `@WebMvcTest` slice — validates request bodies, response shape, error mapping, crisis path. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/PrayerServiceTest.java` | Create | Unit tests with `Mockito.spy()` + reflection-based `Client` field injection (matches `GeminiServiceTest.setUp()` and AI-1's `AskServiceTest.setUp()`). Covers structured-output parsing, "Dear God...Amen." regex validation, crisis short-circuit, retry-on-shape-mismatch, server fallback triggers. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/PrayerIntegrationTest.java` | Create | `@SpringBootTest` end-to-end — mocks `PrayerService` at bean level, asserts full HTTP response including headers and error shape. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/PrayerPromptsTest.java` | Create | Guardrail tests on prompt text — assert that the 6 rules from the system prompt are present verbatim. Prevents accidental prompt drift. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/PrayerCrisisDetectorTest.java` | Create | Unit tests for the crisis-keyword matcher. Parity test with BOTH the frontend and `AskCrisisDetector`. |
| `frontend/src/services/prayer-service.ts` | Create | New module: `fetchPrayer(request)` → returns `MockPrayer`. On any error, falls back to `getMockPrayer(request)` and returns that instead of throwing. |
| `frontend/src/services/__tests__/prayer-service.test.ts` | Create | Fetch mocks targeting `/api/v1/proxy/ai/pray`. Cover: happy path, 400/429/502/504/network error each falling through to mock, timeout, "Dear God...Amen." shape preserved, crisis response. |
| `frontend/src/components/daily/PrayTabContent.tsx` | Modify | One call site swap inside `handleGenerate`: `setTimeout(() => { const result = getMockPrayer(inputText); ... }, 1500)` → `fetchPrayer(inputText).then((result) => { ... })`. Side effects (markPrayComplete, recordActivity, localStorage removal) run inside the `.then()` on success. |
| `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` | Modify | Existing tests that advance fake timers for the 1500ms delay now await the mocked promise from `fetchPrayer`. Update fixtures for the async path. |

**Net changes:** backend gains ~380 lines of Java (service + controller + 3 DTO records + prompts + crisis detector) + ~40 lines of YAML (OpenAPI additions) + ~350 lines of tests. Frontend gains ~60 lines (`prayer-service.ts` + test) and changes ~15 lines in `PrayTabContent.tsx`. Total ≈ +800 / -10. About 14 files touched.

**Net runtime impact:** Prayer generation gains one real network hop per submission. Gemini latency is typically 1.5–3.5s at `gemini-2.5-flash-lite` for this prompt class (smaller output than Ask's — ~120 words vs Ask's ~400 words — so faster). The existing 1500ms cosmetic delay is removed; real latency replaces it. The "Help Me Pray" button UX stays identical; the existing loading state / audio auto-play / completion tracking all preserve their current behavior.

---

## Architecture decisions

**1. Use Gemini (`gemini-2.5-flash-lite`) — same model as AI-1 and Spec 2.** Key already provisioned from Spec 2; no new provisioning. This is AD #1 of the AI Integration wave, unchanged for AI-2.

**2. Force structured JSON output from Gemini via response schema.** The `MockPrayer` shape is simple — `{id, topic, text}` — but we still use `responseMimeType: "application/json"` + `responseSchema: <JSON Schema>` for consistency with AI-1 and predictability. The schema enforces `id` as string, `topic` as one of 10 allowed enum values, `text` as a string with minLength 50 (if SDK supports). Post-parse validation is the authoritative check (see AD #4).

**3. Crisis detection runs server-side BEFORE the Gemini call, in addition to client-side.** Identical to AI-1 AD #3. Client-side `CrisisBanner` already renders inside `PrayerInput` when `containsCrisisKeyword(text)` is true (rendered at form-input time, well before submit). Backend runs the same check at request time — if the `request` text matches a self-harm keyword, return a canned crisis response without calling Gemini. The crisis response's prayer text is pre-written: it's a pastoral prayer that explicitly names 988, Crisis Text, and SAMHSA while acknowledging the user's pain. No LLM call, no hallucination risk.

**4. "Dear God...Amen." structural invariant enforced by regex.** Existing mock tests (`daily-experience-mock-data.test.ts`) assert:
   - `prayer.text.match(/^Dear God/)` — prayer STARTS with "Dear God"
   - `prayer.text.match(/Amen\.$/)` — prayer ENDS with "Amen."

   Real Gemini output must uphold both. The system prompt includes these as explicit rules (#1 and #2 in the 6-rule list). The backend's `validateResponse()` method checks both regexes on the `text` field AFTER parsing. If either fails, retry once with a corrective prompt. If the retry also fails, return the server-side fallback canned prayer (which is pre-verified to match). Frontend code does NOT validate the regex — the backend is authoritative and the fallback guarantees compliance.

**5. Crisis keyword list DUPLICATED between `AskCrisisDetector` and `PrayerCrisisDetector`, not shared.** The two detectors live in the same package (`proxy.ai`), so sharing a `private static final List<String> SELF_HARM_KEYWORDS` in a new `CrisisKeywords.java` utility class would be tempting. **We do NOT do that.** Reasons:
   - Each detector's response is feature-specific (the Ask crisis response has verses + follow-ups; the Pray crisis response has a single pastoral prayer text). Co-locating the keyword list with its crisis-response factory keeps the "trigger + response" pair glanceable in one file.
   - A shared utility creates a coupling that future AI specs (AI-3 Journal, plus anything after) would inherit silently. Each detector owning its list is clearer at the cost of ~12 lines of duplication.
   - `PrayerCrisisDetectorTest.parityWithAskDetector` asserts the two lists are equal, catching drift at CI time. Adding a keyword to one detector without the other fails CI loudly.
   
   If a third or fourth feature joins and the duplication becomes onerous, refactor to a shared utility. For now, keep it co-located.

**6. Preserve the mock fallback as a last-resort path.** `frontend/src/services/prayer-service.ts` wraps the fetch in a try/catch; on ANY failure (HTTP error, network error, timeout, parse error, "Dear God/Amen." regex mismatch), returns `getMockPrayer(request)` from the existing mock. User never sees a broken state. Backend-level fallback: if Gemini returns malformed/off-pattern output twice in a row (retry budget exhausted), the backend itself returns a pre-written generic prayer matching `MockPrayer` shape. Frontend treats this as a valid response and renders it normally.

**7. No conversation history for prayer.** Prayer generation is single-shot; there's no "follow-up" UX for prayer like there is for Ask. The request shape is just `{request: string}`, much simpler than AI-1's `{question, conversationHistory?}`. If a future feature introduces multi-turn prayer coaching, that's a separate spec.

**8. No explicit `context` parameter for devotional mode.** The frontend's `PrayContext` type carries devotional-snapshot metadata for UI rendering (e.g., the `DevotionalPreviewPanel`), but the backend doesn't need it — the user's submitted text already contains devotional phrases like "today's devotional" or "what I've read" when they arrive from a devotional. Gemini classifies the topic from the text content, same as the current mock's keyword matcher. Keeps the wire contract minimal.

**9. Replace the 1500ms cosmetic delay with real latency.** The `setTimeout(..., 1500)` in `PrayTabContent.handleGenerate` exists to make the mock feel less instantaneous. After this spec, real Gemini latency (typically 1.5–3.5s) replaces it. The existing loading UI (spinner + ambient-audio auto-play) stays identical. Do NOT add a minimum-latency floor (e.g., `Promise.all([fetchPrayer(...), delay(800)])`) — Gemini is always slower than the floor would be.

**10. Response validation before returning to client.** After JSON-parsing Gemini's structured output, `PrayerService.validateResponse()` checks:
   - `id` is non-empty string
   - `topic` is one of 10 `ALLOWED_TOPICS` (anxiety, gratitude, healing, guidance, grief, forgiveness, relationships, strength, general, devotional)
   - `text` is non-empty string
   - `text` matches `/^Dear God/` (starts with "Dear God")
   - `text` matches `/Amen\.$/` (ends with "Amen.")
   - `text.length` is within sensible bounds (50 to 2000 chars — prevents both truncation and runaway generation)
   
   If any check fails, retry once with a corrective prompt appended. If the retry also fails, return `FALLBACK_PRAYER` and log at WARN level.

**11. Test-seam pattern matches AI-1 (and by extension Spec 2's D2b).** `PrayerService` exposes a package-private `callGeminiForPrayer(PrayerRequest, boolean withRetryCorrective)` that wraps the raw SDK call. Tests spy on `PrayerService` and stub this method. Tests also use reflection to inject a non-null `Client` into the private field after `new PrayerService(...)` since `@PostConstruct initClient()` doesn't fire in manual construction (same rationale and pattern as `GeminiServiceTest.setUp()` and `AskServiceTest.setUp()`).

**12. No backend-side Caffeine cache.** Same reasoning as AI-1 AD #8. Each prayer request is user-specific; cache hit-rate would be near-zero; cross-user risk isn't worth it.

**13. Safety block handling inherits from Spec 2 / AI-1.** Gemini's three-path safety check (promptFeedback.blockReason, finishReason=SAFETY|PROHIBITED_CONTENT, empty-text) fires for prayer requests too. Spec 2's `SafetyBlockException` → HTTP 422 mapping applies. Frontend `prayer-service.ts` treats 422 as an error and falls through to the mock.

**14. Server-side FALLBACK_PRAYER is pre-written.** When all retries fail, backend returns:
   ```json
   {
     "id": "fallback",
     "topic": "general",
     "text": "Dear God, I come before You with an open heart, even when I don't have all the words. You know what I carry today — the hopes, the worries, the things I can't name. Meet me in this moment. Fill me with Your peace, Your patience, and Your presence. Help me to trust that You hear me even in the silence, that You are working even when I can't see it. Draw me closer to You today. Amen."
   }
   ```
   Lives as `public static final PrayerResponseDto FALLBACK_PRAYER` in `PrayerService.java`. Verified at compile time to match the "Dear God...Amen." regex pattern (via a unit test in `PrayerServiceTest.fallbackPrayer_matchesStructuralInvariant`).

**15. Topic classification into 10 predefined values.** Matches the existing mock's topic set. Gemini classifies based on request content; if no topic fits cleanly, it uses `"general"`. The `"crisis"` topic is NOT in `ALLOWED_TOPICS` for Gemini's output — it's only produced by `PrayerCrisisDetector.buildCrisisResponse()` (same divergence pattern as AI-1: OpenAPI enum is 11 values including "crisis", but `ALLOWED_TOPICS` validator set is 10).

---

## Backend implementation

### Endpoint contract

#### `POST /api/v1/proxy/ai/pray`

**Request body** (`PrayerRequest`):

```json
{
  "request": "I'm anxious about my custody hearing tomorrow"
}
```

**Validation:**
- `request` — required, 1–500 chars, `@NotBlank @Size(min=1, max=500)`. Matches the frontend's `maxLength={500}` on the PrayerInput textarea.

**Success response** (HTTP 200, `ProxyResponse<PrayerResponseDto>`):

```json
{
  "data": {
    "id": "prayer-anxiety-gen-a8f3",
    "topic": "anxiety",
    "text": "Dear God, I come to You with the weight of tomorrow pressing on me... [125 words] ...I trust You to walk with me into that courtroom. Amen."
  },
  "meta": {"requestId": "fbfQ6HOYQGe-REXyyltn3Q"}
}
```

**Error responses:** standard `ProxyError` shape via `ProxyExceptionHandler`. Codes:
- `INVALID_INPUT` (400) — validation failure (missing, blank, or oversized `request`)
- `RATE_LIMITED` (429) — from filter (inherits Spec 1 behavior)
- `SAFETY_BLOCK` (422) — Gemini safety triggered
- `UPSTREAM_ERROR` (502) — Gemini 4xx/5xx or malformed output after retries (when backend fallback itself is unreachable — effectively never, since `FALLBACK_PRAYER` is a constant)
- `UPSTREAM_TIMEOUT` (504) — WebClient timeout
- `INTERNAL_ERROR` (500) — unexpected

**Crisis-response success (not an error):** HTTP 200, same shape as normal success, but `id: "crisis"` and `topic: "crisis"`. The frontend renders it identically to any other prayer (no special casing needed).

---

### Backend file specifications

#### `PrayerRequest.java`

```java
package com.example.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PrayerRequest(
    @NotBlank @Size(min = 1, max = 500) String request
) {}
```

Matches `PrayerInput`'s `maxLength={500}` and the `/^.+$/` non-blank requirement.

#### `PrayerResponseDto.java`

```java
package com.example.worshiproom.proxy.ai;

public record PrayerResponseDto(
    String id,
    String topic,
    String text
) {}
```

Shape matches the frontend's `MockPrayer` TypeScript interface EXACTLY. Field order `{id, topic, text}` matches the TS interface.

#### `PrayerPrompts.java`

```java
package com.example.worshiproom.proxy.ai;

public final class PrayerPrompts {

    private PrayerPrompts() {}

    public static final String PRAYER_SYSTEM_PROMPT = """
        You are a warm, pastorally-minded prayer companion. When someone shares what's on their heart, you write a first-person prayer they can pray along with — not about them, but WITH them.

        Follow these 6 rules for every prayer you generate:

        1. Start the text with "Dear God," (or "Dear Lord," / "Father,") — always a salutation that addresses God directly.
        2. End the text with "Amen." — always that exact word with a period. Never "In Jesus' name" or other closings without also ending "Amen."
        3. Write in first person ("I", "me", "my"). The user prays these words themselves.
        4. 100-180 words total. Long enough to feel substantive, short enough to pray in one breath-cycle.
        5. Acknowledge the specific thing the person shared. If they mentioned anxiety, name it. If they mentioned a loss, sit with it. Don't generalize their pain away.
        6. The topic field must be one of these exact strings: anxiety, gratitude, healing, guidance, grief, forgiveness, relationships, strength, general, devotional. Pick the best match for the request. Use "general" if no other fits. Use "devotional" only if the request explicitly references reading, Scripture, or a devotional they just completed.

        Respond ONLY with valid JSON matching the provided schema. No preamble, no markdown, no code fences.
        """;

    public static final String RETRY_CORRECTIVE_SUFFIX = """

        Your previous response had validation issues. Common problems: text didn't start with "Dear God" or similar salutation, text didn't end with "Amen.", text was too short (<100 words) or too long (>200 words), or topic was not one of the 10 allowed values. Ensure the text starts with a direct salutation to God, ends with "Amen.", is 100-180 words, and topic is from the approved list.
        """;
}
```

The 6 rules are load-bearing. `PrayerPromptsTest` verifies each rule's verbatim-substring presence.

Note the absence of a `buildUserPrompt` helper — prayer has no conversation history. The user prompt is constructed inline in `PrayerService.callGeminiForPrayer`: `"Prayer request: " + request.request()`.

#### `PrayerCrisisDetector.java`

```java
package com.example.worshiproom.proxy.ai;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection for prayer requests. Defense-in-depth
 * against the client-side {@code containsCrisisKeyword} in
 * {@code frontend/src/constants/crisis-resources.ts}.
 *
 * The keyword list is INTENTIONALLY DUPLICATED from {@code AskCrisisDetector}
 * (see spec AD #5). {@code PrayerCrisisDetectorTest.parityWithAskDetector}
 * asserts the two backend lists stay equal; both must be supersets of the
 * frontend source of truth.
 *
 * If any keyword matches (case-insensitive substring), the service returns a
 * canned crisis prayer without calling Gemini.
 */
final class PrayerCrisisDetector {

    private PrayerCrisisDetector() {}

    /** MUST match AskCrisisDetector.SELF_HARM_KEYWORDS exactly. Verified by test. */
    static final List<String> SELF_HARM_KEYWORDS = List.of(
        // Parity with frontend
        "suicide",
        "kill myself",
        "end it all",
        "not worth living",
        "hurt myself",
        "end my life",
        "want to die",
        "better off dead",
        // Backend-only additions (also in AskCrisisDetector)
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

    static PrayerResponseDto buildCrisisResponse() {
        return new PrayerResponseDto(
            "crisis",
            "crisis",
            "Dear God, I come to You carrying a weight that feels unbearable. You see every tear, every fear, every moment when hope feels far away. Right now, I need You, and I need people who can be Your hands and voice for me tonight. Please give me the courage to reach out. Help me to call 988, the Suicide and Crisis Lifeline, where someone is waiting to listen without judgment. Help me to text HOME to 741741 if words are easier on a screen. Remind me that my life is precious to You, that I am not a burden, and that this pain — as real as it is — is not the whole of my story. Hold me close tonight. Send me the right person to talk to. Be the peace that guards my heart until morning. Amen."
        );
    }
}
```

Crisis prayer is hardcoded. It names the resources directly (988, 741741) so they're unmistakable even to a user in distress skimming through the text. Opens with "Dear God" and closes with "Amen." so it passes the structural invariant check.

#### `PrayerService.java`

The service follows AI-1's `AskService.java` structure nearly line-for-line. Key differences:
- No `ObjectMapper` constructor arg required if Gemini's structured output reliably returns parseable JSON — **but include it anyway** to match AI-1 and to have the fallback parse path. Constructor takes `ProxyConfig, ObjectMapper`.
- `MAX_RETRIES_ON_VALIDATION_FAILURE = 1` (same as AI-1)
- Model: `gemini-2.5-flash-lite` (same)
- Structured output schema is simpler (3 fields vs AI-1's 7)
- Validation includes two regex checks for "Dear God..." and "...Amen." (AI-1 had no regex checks)
- `FALLBACK_PRAYER` constant at bottom
- `ALLOWED_TOPICS` is a 10-element set (not 16 like AI-1)

Full `PrayerService.java` structure (condensed; CC expands using AI-1's `AskService.java` as template):

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;

@Service
public class PrayerService {

    private static final Logger log = LoggerFactory.getLogger(PrayerService.class);
    private static final String MODEL = "gemini-2.5-flash-lite";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);
    private static final int MAX_RETRIES_ON_VALIDATION_FAILURE = 1;

    private static final Pattern STARTS_WITH_SALUTATION =
        Pattern.compile("^Dear (God|Lord|Father)[,.]", Pattern.CASE_INSENSITIVE);
    private static final Pattern ENDS_WITH_AMEN =
        Pattern.compile("Amen\\.\\s*$");

    private static final Set<String> ALLOWED_TOPICS = Set.of(
        "anxiety", "gratitude", "healing", "guidance", "grief",
        "forgiveness", "relationships", "strength", "general", "devotional"
    );

    private final ProxyConfig proxyConfig;
    private final ObjectMapper objectMapper;
    private Client client;  // set by @PostConstruct; null-guarded in ask path

    public PrayerService(ProxyConfig proxyConfig, ObjectMapper objectMapper) {
        this.proxyConfig = proxyConfig;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void initClient() {
        String apiKey = proxyConfig.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/pray will return UPSTREAM_ERROR until it is set.");
            this.client = null;
            return;
        }
        HttpOptions httpOptions = HttpOptions.builder()
            .timeout((int) REQUEST_TIMEOUT.toMillis())
            .build();
        this.client = Client.builder()
            .apiKey(apiKey)
            .httpOptions(httpOptions)
            .build();
    }

    public boolean isConfigured() {
        return client != null;
    }
```

(The orchestration + retry + validation + error-mapping methods follow the same structure as `AskService.java`. CC fills these in using AI-1 as template, substituting: `ask()` → `pray()`, `AskResponseDto` → `PrayerResponseDto`, `AskRequest` → `PrayerRequest`, AI-1's validation logic → the prayer-specific validation below.)

Key methods unique to `PrayerService` (copy these verbatim; fill in orchestration boilerplate from AI-1):

```java
    /** Orchestrator. Same structure as AskService.ask() — crisis short-circuit, retry loop, fallback. */
    public PrayerResponseDto pray(PrayerRequest request) {
        if (PrayerCrisisDetector.detectsCrisis(request.request())) {
            log.info("Prayer crisis path triggered requestLength={}", request.request().length());
            return PrayerCrisisDetector.buildCrisisResponse();
        }

        if (client == null) {
            throw new UpstreamException("AI service is not configured on the server.");
        }

        int attempts = 0;
        while (attempts <= MAX_RETRIES_ON_VALIDATION_FAILURE) {
            try {
                GenerateContentResponse response = callGeminiForPrayer(request, attempts > 0);
                PrayerResponseDto dto = parseAndValidate(response);
                if (dto != null) {
                    return dto;
                }
                log.info("Prayer response validation failed attempt={}", attempts + 1);
                attempts++;
            } catch (SafetyBlockException | UpstreamException | UpstreamTimeoutException ex) {
                throw ex;
            } catch (RuntimeException ex) {
                throw mapGeminiException(ex);
            }
        }

        log.warn("Prayer retries exhausted requestLength={}", request.request().length());
        return FALLBACK_PRAYER;
    }

    /** D2b test seam. Tests spy + doReturn on this method. */
    GenerateContentResponse callGeminiForPrayer(PrayerRequest request, boolean withRetryCorrective) {
        String systemPrompt = PrayerPrompts.PRAYER_SYSTEM_PROMPT
            + (withRetryCorrective ? PrayerPrompts.RETRY_CORRECTIVE_SUFFIX : "");
        String userPrompt = "Prayer request: " + request.request();

        GenerateContentConfig config = GenerateContentConfig.builder()
            .systemInstruction(Content.fromParts(Part.fromText(systemPrompt)))
            .responseMimeType("application/json")
            .responseSchema(buildResponseSchema())
            .build();

        return callModels(MODEL, userPrompt, config);
    }

    /** D2b second seam. Tests can stub this directly for tests that exercise callGeminiForPrayer's prompt logic. */
    GenerateContentResponse callModels(String model, String userPrompt, GenerateContentConfig config) {
        return client.models.generateContent(model, userPrompt, config);
    }

    /** Prayer-specific validation. Includes the two regex checks. */
    static boolean validateResponse(PrayerResponseDto dto) {
        if (dto == null) return false;
        if (isBlank(dto.id()) || isBlank(dto.topic()) || isBlank(dto.text())) return false;
        if (!ALLOWED_TOPICS.contains(dto.topic())) return false;
        if (!STARTS_WITH_SALUTATION.matcher(dto.text()).find()) return false;
        if (!ENDS_WITH_AMEN.matcher(dto.text()).find()) return false;
        int len = dto.text().length();
        if (len < 50 || len > 2000) return false;  // character bounds matching AD #10
        return true;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
```

`parseAndValidate`, `isSafetyBlocked`, `extractText`, `mapGeminiException`, `isTimeout`, `buildResponseSchema` — copy from AI-1's `AskService` verbatim, substituting `AskResponseDto` → `PrayerResponseDto` where applicable. The schema builder outputs:
- `id`: string
- `topic`: string with enum of the 10 `ALLOWED_TOPICS`
- `text`: string with minLength 50 (if SDK supports)
- `required`: all 3

**`FALLBACK_PRAYER` constant** (at bottom of class):

```java
    static final PrayerResponseDto FALLBACK_PRAYER = new PrayerResponseDto(
        "fallback",
        "general",
        "Dear God, I come before You with an open heart, even when I don't have all the words. "
            + "You know what I carry today — the hopes, the worries, the things I can't name. "
            + "Meet me in this moment. Fill me with Your peace, Your patience, and Your presence. "
            + "Help me to trust that You hear me even in the silence, that You are working even when I can't see it. "
            + "Draw me closer to You today. Amen."
    );
}
```

The fallback's text is hand-verified to match both regexes: starts with "Dear God,", ends with "Amen." A unit test (`PrayerServiceTest.fallbackPrayer_matchesStructuralInvariant`) asserts this at CI time as a guardrail against accidental edits.

#### `PrayerController.java`

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
public class PrayerController {

    private static final Logger log = LoggerFactory.getLogger(PrayerController.class);

    private final PrayerService service;

    public PrayerController(PrayerService service) {
        this.service = service;
    }

    @PostMapping("/pray")
    public ProxyResponse<PrayerResponseDto> pray(@Valid @RequestBody PrayerRequest request) {
        log.info("Prayer request received requestLength={}", request.request().length());
        PrayerResponseDto result = service.pray(request);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
```

**Notes:**
- Coexists with `AskController` and `GeminiController` under the shared `@RequestMapping("/api/v1/proxy/ai")` base. Different subpaths (`/ask`, `/pray`, `/explain`, `/reflect`).
- Log line: `requestLength` only. NEVER the request content. NEVER the response text (that would leak the user's request back into logs via the generated prayer).
- No `@Validated` — only `@RequestBody` validation.
- Framework log suppression from Spec 2 D7 covers this controller's `@RequestBody` deserialization automatically.

---

### Backend tests

Five new test classes under `backend/src/test/java/com/example/worshiproom/proxy/ai/`. Match AI-1's patterns.

#### `PrayerCrisisDetectorTest.java`

Plain JUnit unit tests. 8 tests:

1. `detectsCrisis_returnsTrueForExactKeyword` — each of the 12 keywords triggers true (parameterized).
2. `detectsCrisis_caseInsensitive` — "KILL MYSELF" / "Kill Myself" / "kIlL mYsElF" all trigger.
3. `detectsCrisis_substringMatch` — "I want to die tonight" triggers.
4. `detectsCrisis_returnsFalseForNullOrBlank` — null, "", "   " all return false.
5. `detectsCrisis_returnsFalseForUnrelatedText` — "pray for my job interview" returns false.
6. `parityWithFrontend` — reads `frontend/src/constants/crisis-resources.ts` via relative path, extracts `SELF_HARM_KEYWORDS`, asserts every frontend keyword appears in `PrayerCrisisDetector.SELF_HARM_KEYWORDS`. Uses the same regex-extraction pattern as `AskCrisisDetectorTest.parityWithFrontend`.
7. **`parityWithAskDetector`** — **unique to this spec**. Asserts `PrayerCrisisDetector.SELF_HARM_KEYWORDS` equals `AskCrisisDetector.SELF_HARM_KEYWORDS` exactly (order-sensitive or element-set-equal — use `assertThat(...).containsExactlyInAnyOrderElementsOf(...)`). This catches drift if a future spec adds a keyword to one detector without the other. Enforces AD #5.
8. `buildCrisisResponse_returnsValidShape` — calls `buildCrisisResponse()`, asserts: `id == "crisis"`, `topic == "crisis"`, `text` contains "988" literal, `text` matches `^Dear God/`, `text` matches `/Amen\.$/`, `text.length()` between 100-2000.

#### `PrayerPromptsTest.java`

6 tests, one per rule, plus 1 class-level invariant:

1. `systemPrompt_rule1_startWithDearGod` — contains `"Dear God,"` (the literal salutation example)
2. `systemPrompt_rule2_endWithAmen` — contains `"Amen."` (the literal closing)
3. `systemPrompt_rule3_firstPerson` — contains `"first person"`
4. `systemPrompt_rule4_wordCount` — contains `"100-180 words"`
5. `systemPrompt_rule5_acknowledgeSpecific` — contains `"Acknowledge the specific thing"`
6. `systemPrompt_rule6_topicEnum` — contains all 10 `ALLOWED_TOPICS` values (loop + assert each)
7. `retryCorrectiveSuffix_mentionsKeyRequirements` — contains `"Dear God"`, `"Amen."`, `"100-180 words"`

#### `PrayerServiceTest.java`

**Setup (mirrors `GeminiServiceTest.setUp()` and `AskServiceTest.setUp()`):** `@PostConstruct initClient()` doesn't fire with manual `new PrayerService(...)`. Tests inject a non-null `Client` via reflection:

```java
private ProxyConfig config;
private PrayerService service;

@BeforeEach
void setUp() throws Exception {
    config = new ProxyConfig();
    config.getGemini().setApiKey("fake-test-key");
    service = spy(new PrayerService(config, new ObjectMapper()));
    Client dummyClient = mock(Client.class);
    Field clientField = PrayerService.class.getDeclaredField("client");
    clientField.setAccessible(true);
    clientField.set(service, dummyClient);
}
```

Then stub `callGeminiForPrayer` via `doReturn(...)` / `doThrow(...)` per test.

**Test list (~16 tests):**

**Crisis path (2):**
1. `pray_crisisKeywordShortCircuits` — request "I want to die" → returns `PrayerCrisisDetector.buildCrisisResponse()`. Verify `callGeminiForPrayer` never invoked.
2. `pray_crisisResponseMatchesStructuralInvariant` — trigger crisis, assert returned text matches `/^Dear God/` AND `/Amen\.$/` AND contains "988".

**Happy path (3):**
3. `pray_happyPath_returnsValidResponse` — spy returns valid Gemini JSON (well-formed prayer text); assert parsed DTO matches.
4. `pray_topicClassifiedIntoAllowedValue` — spy returns JSON with `topic: "anxiety"`; assert topic persists through.
5. `pray_unclassifiableRequestFallsBackToGeneral` — spy returns JSON with `topic: "general"` for a vague request ("help me pray"); assert it's accepted.

**Validation + retry (5):**
6. `pray_textMissingSalutationTriggersRetry` — first call returns text not starting with "Dear God"; second call returns valid; assert 2 calls, second with `withRetryCorrective=true`.
7. `pray_textMissingAmenTriggersRetry` — first call text doesn't end with "Amen."; retry fires.
8. `pray_invalidTopicTriggersRetry` — first call returns `topic: "fear"` (not in allowed set); retry fires.
9. `pray_tooShortTriggersRetry` — first call returns 40-char text (below the 50-char floor); retry fires.
10. `pray_twoValidationFailuresFallBackToCanned` — both calls return off-pattern text. Assert final result equals `PrayerService.FALLBACK_PRAYER`. Assert WARN log.

**Error mapping (4):**
11. `pray_nullClient_throwsUpstreamNotConfigured` — use reflection to set `client = null` (per AI-1 pattern). Assert `UpstreamException` with message containing "not configured".
12. `pray_safetyBlockThrowsSafetyBlockException` — spy returns response with `finishReason=SAFETY`; assert `SafetyBlockException`.
13. `pray_webClientTimeoutMapsTo504` — spy throws wrapped `TimeoutException`; assert `UpstreamTimeoutException`.
14. `pray_sdkErrorMapsTo502` — spy throws generic `RuntimeException`; assert `UpstreamException` with generic message.

**No-leak invariant (1):**
15. `noLeakOfUpstreamErrorText` — spy throws `RuntimeException("GoogleSecretKeyABC")`; assert thrown exception message contains zero instances of "GoogleSecretKeyABC", "AIza", "gemini", "google", "key=".

**Constants + structural invariants (2):**
16. `fallbackPrayer_matchesStructuralInvariant` — `FALLBACK_PRAYER.text()` matches `/^Dear God/`, `/Amen\.$/`, length between 100-2000, topic `"general"`.
17. `validateResponse_rejectsOffPattern` — 6 sub-cases: (a) no salutation, (b) no Amen, (c) unknown topic, (d) text too short, (e) text too long (>2000), (f) blank fields. Each rejected.

**Making `validateResponse` testable:** package-private `static` method so tests in the same package can call directly. Same pattern AI-1 used.

#### `PrayerControllerTest.java`

`@WebMvcTest(PrayerController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})`. `@MockBean PrayerService`. ~8 tests:

1. `pray_happyPath_returns200WithBody` — service returns canonical DTO; assert 200, body `$.data.id`, `$.data.topic`, `$.data.text` present, `$.meta.requestId` present.
2. `pray_missingRequest_returns400` — body `{}`; assert 400 `INVALID_INPUT`.
3. `pray_blankRequest_returns400` — `request: "   "`; assert 400 via `@NotBlank`.
4. `pray_requestTooLong_returns400` — 501-char request; assert 400 via `@Size(max=500)`.
5. `pray_serviceThrowsSafetyBlock_returns422` — assert `SAFETY_BLOCK` code.
6. `pray_serviceThrowsUpstream_returns502` — assert `UPSTREAM_ERROR`.
7. `pray_serviceThrowsTimeout_returns504` — assert `UPSTREAM_TIMEOUT`.
8. `pray_xRequestIdHeaderPresent` — verify header on success.

#### `PrayerIntegrationTest.java`

`@SpringBootTest(webEnvironment = RANDOM_PORT) @AutoConfigureMockMvc @MockBean PrayerService`. ~5 tests (mirrors AI-1's pattern):

1. `fullLifecycle_pray_returnsExpectedHeaders` — all rate-limit + request-id headers present, body has `data.*` + `meta.requestId`.
2. `fullLifecycle_pray_propagatesClientRequestId` — client-supplied `X-Request-Id: test-pray-id` round-trips.
3. `fullLifecycle_invalidInput_returnsProxyErrorShape` — 400 body matches `{code, message, requestId, timestamp}`.
4. `fullLifecycle_noUpstreamErrorTextLeaks` — mock service throws with secret-leaking cause; response body contains zero instances of the secret.
5. `fullLifecycle_crisisPathBypassesGemini` — mock service returns `PrayerCrisisDetector.buildCrisisResponse()` directly; assert `data.topic == "crisis"` and `data.text` contains "988".

---

### OpenAPI additions

Insert into `backend/src/main/resources/openapi.yaml`.

**Path addition (under `paths:`):**

```yaml
/api/v1/proxy/ai/pray:
  post:
    tags: [Proxy / AI]
    summary: Generate a personalized prayer
    description: |
      Takes a user's prayer request (free text, up to 500 chars) and returns
      a first-person prayer ("Dear God...Amen.") that addresses the specific
      content of the request. Crisis keywords trigger a canned crisis prayer
      with 988/Crisis Text resources, without calling the upstream AI model.
    operationId: generatePrayer
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: '#/components/schemas/PrayerRequest' }
    responses:
      '200':
        description: Generated prayer or crisis prayer
        content:
          application/json:
            schema:
              type: object
              required: [data, meta]
              properties:
                data: { $ref: '#/components/schemas/PrayerResponse' }
                meta: { $ref: '#/components/schemas/ResponseMeta' }
      '400': { $ref: '#/components/responses/BadRequest' }
      '422': { $ref: '#/components/responses/SafetyBlocked' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }
      '500': { $ref: '#/components/responses/InternalError' }
```

**Schema additions (under `components.schemas`):**

```yaml
PrayerRequest:
  type: object
  required: [request]
  properties:
    request:
      type: string
      minLength: 1
      maxLength: 500
      example: "I'm anxious about my custody hearing tomorrow"

PrayerResponse:
  type: object
  required: [id, topic, text]
  properties:
    id:
      type: string
      example: "prayer-anxiety-gen-a8f3"
    topic:
      type: string
      enum:
        - anxiety
        - gratitude
        - healing
        - guidance
        - grief
        - forgiveness
        - relationships
        - strength
        - general
        - devotional
        - crisis
    text:
      type: string
      pattern: "^Dear (God|Lord|Father)[,.].*Amen\\.\\s*$"
      example: "Dear God, I come to You with the weight of tomorrow pressing on me... Amen."
```

**Note on enum size:** OpenAPI `PrayerResponse.topic` enum has 11 values (10 Gemini-producible + "crisis"). Backend `ALLOWED_TOPICS` has only 10 (no "crisis" — Gemini can't produce it). Same pattern AI-1 established.

**Note on pattern:** OpenAPI's `pattern` field is informational for most validators but documents the "Dear God...Amen." invariant in the generated docs. Backend enforcement is via `PrayerService.validateResponse()`.

---

## Frontend implementation

### `services/prayer-service.ts` (new file)

```typescript
// Prayer generation — frontend service layer.
//
// Calls the backend proxy; on ANY error (HTTP 4xx/5xx, network, timeout, parse,
// shape mismatch), falls through to the existing mock in
// @/mocks/daily-experience-mock-data. User never sees a raw error state — the
// mock's 10 canned prayers are the graceful-degradation floor.

import type { MockPrayer } from '@/types/daily-experience'
import { getMockPrayer } from '@/mocks/daily-experience-mock-data'

const PROXY_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/pray`
const REQUEST_TIMEOUT_MS = 30_000  // matches backend WebClient timeout

interface PrayerEnvelope {
  data: MockPrayer
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

/**
 * Fetches a personalized prayer from the backend proxy. Falls through to the
 * local mock on any failure, so callers never need to handle errors — a valid
 * MockPrayer is always returned.
 *
 * The mock fallback is intentional: Prayer must never show a raw error. If the
 * backend is down, Gemini is slow, or the network is flaky, the user still
 * gets a thoughtful prayer from the 10 curated mock topics.
 */
export async function fetchPrayer(request: string): Promise<MockPrayer> {
  try {
    const response = await fetchWithTimeout(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request }),
    })

    if (!response.ok) {
      return getMockPrayer(request)
    }

    const envelope = (await response.json()) as PrayerEnvelope
    if (
      !envelope.data ||
      !envelope.data.id ||
      !envelope.data.topic ||
      typeof envelope.data.text !== 'string' ||
      !/^Dear /.test(envelope.data.text) ||
      !/Amen\.\s*$/.test(envelope.data.text)
    ) {
      return getMockPrayer(request)
    }

    return envelope.data
  } catch {
    return getMockPrayer(request)
  }
}
```

One export: `fetchPrayer`. The shape-validation branches (lines checking `id`, `topic`, `text`, and both regexes) catch any backend response that slips through without proper "Dear God...Amen." structure. Defense-in-depth — the backend's `validateResponse` already enforces these, but the frontend check ensures even an unexpected bypass still produces a valid `MockPrayer` via mock fallback.

### `components/daily/PrayTabContent.tsx` (modified)

ONE call-site change. Lines ~147–165 in the current file.

**Before (current state):**

```typescript
setIsLoading(true)
setTimeout(() => {
  const result = getMockPrayer(inputText)
  setPrayer(result)
  setIsLoading(false)
  markPrayComplete()
  recordActivity('pray')
  try {
    localStorage.removeItem(PRAYER_DRAFT_KEY)
  } catch {
    // localStorage failure is non-critical
  }
}, 1500)
```

**After:**

```typescript
setIsLoading(true)
fetchPrayer(inputText).then((result) => {
  setPrayer(result)
  setIsLoading(false)
  markPrayComplete()
  recordActivity('pray')
  try {
    localStorage.removeItem(PRAYER_DRAFT_KEY)
  } catch {
    // localStorage failure is non-critical
  }
})
```

The `.then()` callback body is identical to what was inside the `setTimeout` callback. Every side effect (`markPrayComplete`, `recordActivity`, localStorage removal) runs on successful resolution — and because `fetchPrayer` never rejects (it always resolves with a `MockPrayer`, either real or mock), these side effects always fire. Users who hit backend errors still get marked as having prayed (reasonable — they did submit a request and receive a prayer, even if it was the mock).

**Import updates:**

- Add: `import { fetchPrayer } from '@/services/prayer-service'`
- Remove: `import { getMockPrayer } from '@/mocks/daily-experience-mock-data'` (mock is now imported inside `prayer-service.ts`)

**Note:** The audio auto-play block (lines ~130–146) runs BEFORE the service call, unchanged. Audio setup doesn't depend on the prayer result. Preserve the existing logic exactly.

**Note on `extractTopic()`:** This client-side helper stays. It extracts a topic label from the user's submitted text for UI display purposes (passed to `PrayerResponse` as the `topic` prop). It's orthogonal to the `MockPrayer.topic` field returned by the service. Don't touch it.

### `constants/daily-experience.ts` — no changes needed

The 1500ms delay was hard-coded inline in `PrayTabContent.tsx`, not exported as a named constant (unlike Ask's `ASK_LOADING_DELAY_MS`). There's no constant to tombstone. The removal happens entirely within `PrayTabContent.tsx`.

---

### Frontend test updates

#### `services/__tests__/prayer-service.test.ts` (new)

`vi.stubGlobal('fetch', ...)`. ~12 tests:

**Happy path (3):**
1. `fetchPrayer_callsBackendProxyWithCorrectBody` — fetch mock verifies URL is `/api/v1/proxy/ai/pray`, method POST, body `{request: "anxious"}`, `Content-Type: application/json`.
2. `fetchPrayer_returnsParsedEnvelope` — fetch returns valid envelope with well-formed prayer; assert returned value deep-equals `envelope.data`.
3. `fetchPrayer_passesCrisisResponseThrough` — fetch returns envelope with `topic: "crisis"` and prayer text including "988"; assert returned value is that crisis DTO (not the mock fallback).

**Fallback paths (6): all must fall back to mock**
4. `fetchPrayer_400_fallsBackToMock` — fetch returns 400; result equals `getMockPrayer(request)`.
5. `fetchPrayer_422SafetyBlock_fallsBackToMock` — 422 → fallback.
6. `fetchPrayer_502_fallsBackToMock` — 502 → fallback.
7. `fetchPrayer_networkError_fallsBackToMock` — fetch rejects → fallback.
8. `fetchPrayer_timeoutTriggersFallback` — fetch never resolves; abort fires after 30s; result is mock. Uses `vi.useFakeTimers()`.
9. `fetchPrayer_malformedShape_fallsBackToMock` — fetch returns 200 with `{data: {id: null}}`; fallback fires.

**Shape validation (3):**
10. `fetchPrayer_missingDearGodSalutation_fallsBackToMock` — fetch returns 200 with valid shape but text starts "Lord, please..."; fallback fires because frontend validator rejects.
11. `fetchPrayer_missingAmenEnding_fallsBackToMock` — fetch returns text ending "...help me today." (no Amen); fallback fires.
12. `fetchPrayer_keywordMockSelectedOnFallback` — fetch rejects; call with `"I feel anxious"`; returned value is `MOCK_PRAYERS` entry with `topic: "anxiety"` (confirms keyword matcher flows through).

#### `components/daily/__tests__/PrayTabContent.test.tsx` (modified)

The existing test file uses `vi.advanceTimersByTime(1600)` to skip past the 1500ms delay. After Step 9, the page calls `fetchPrayer` asynchronously instead. Update pattern:

1. **Add mock module at top of file:**
   ```typescript
   vi.mock('@/services/prayer-service', () => ({
     fetchPrayer: vi.fn(),
   }))
   ```

2. **Update the `generatePrayer` helper (used across many tests):**

   The current helper types text into the textarea and clicks the button. It relies on the 1500ms timer advancing to reveal the prayer. Change it to:
   ```typescript
   import { fetchPrayer } from '@/services/prayer-service'
   const mockFetchPrayer = fetchPrayer as ReturnType<typeof vi.fn>
   
   async function generatePrayer(user: UserEvent, inputText: string) {
     // Default mock — tests can override per-test via mockResolvedValueOnce
     if (!mockFetchPrayer.mock.calls.length) {
       mockFetchPrayer.mockResolvedValue({
         id: 'test-prayer-id',
         topic: 'general',
         text: 'Dear God, test prayer. Amen.',
       })
     }
     const textarea = screen.getByLabelText('Prayer request')
     await user.type(textarea, inputText)
     const generateBtn = screen.getByRole('button', { name: /help me pray/i })
     await user.click(generateBtn)
   }
   ```

3. **Replace timer-advance patterns:**

   Before:
   ```typescript
   await generatePrayer(user, 'anxious')
   act(() => { vi.advanceTimersByTime(1600) })
   expect(mockRecordActivity).toHaveBeenCalledWith('pray')
   ```

   After:
   ```typescript
   await generatePrayer(user, 'anxious')
   await waitFor(() => expect(mockRecordActivity).toHaveBeenCalledWith('pray'))
   ```

   The `waitFor` handles React's re-render after the mocked promise resolves. No fake timers needed for the prayer-generation flow.

4. **Audio auto-play tests:** These assert audio dispatch fires on `generatePrayer` — the dispatch happens BEFORE the service call (synchronously on submit), so they don't need the async await pattern. The dispatch assertion can remain synchronous after the click. The 1600ms `advanceTimersByTime` call in those tests can be REMOVED entirely since the audio dispatch doesn't wait for the prayer.

5. **Guardrails (DO NOT):**
   - Do NOT remove `vi.useFakeTimers()` globally — other parts of the test file rely on fake timers for scroll/transition logic.
   - Do NOT delete any existing tests. Every test either needs the mock-module addition (trivial), the async-await swap, or no changes at all (auth-gate tests, routing tests).
   - Do NOT add net-new tests in this file. AI-2's new test coverage lives in `prayer-service.test.ts`.

**Verification:**
- [ ] `cd frontend && npm test -- --run PrayTabContent.test` passes
- [ ] Full frontend suite green

---

## Pre-Execution Checklist

### Branch state

- [ ] Current branch: `claude/feature/ai-integration-pray`
- [ ] `git status` clean
- [ ] `git log main --oneline -15` shows all four predecessor wave commits: "AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration", "AI-1: Ask AI Gemini integration"

### Backend baseline

- [ ] `cd backend && ./mvnw test` passes on current branch baseline. Expected: 148 tests green from Specs 1–3 + AI-1.
- [ ] `backend/.env.local` has `GEMINI_API_KEY=AIza...` populated (reused from Spec 2; unchanged across AI-1 and AI-2).
- [ ] `GeminiService`, `AskService`, and `AskCrisisDetector` compile and their tests pass (smoke check that prior specs are healthy).

### Frontend baseline

- [ ] `cd frontend && npm test -- --run` passes baseline.
- [ ] `cd frontend && npm run build` succeeds.
- [ ] Verify `/daily?tab=pray` loads in dev server with current mock behavior.
- [ ] Verify `/ask` still works end-to-end with real Gemini (AI-1 regression check).

### CI / dev-loop readiness

- [ ] Backend runs via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` (non-Docker pattern from Spec 3 D-addendum).
- [ ] `/api/v1/health` returns `providers.gemini.configured: true`.

### Charter carryover

Same 7-condition charter as Specs 2/3 and AI-1. Uncertainty = stop. Expected carryover behaviors:

- D2b test seam + reflection-based Client injection (AI-1 precedent)
- D7 framework log suppression active
- D9 enum-based safety detection
- Crisis keyword parity test pattern (AI-1 precedent)
- Non-Docker smoke (Spec 3 D-addendum)

### Expected deviations to anticipate

- **Schema construction detail**: google-genai 1.51.0 `Schema.builder()` may or may not support `enum` arrays or `minLength`. If unsupported, `validateResponse()` is authoritative. Don't invent unofficial schema mechanisms.
- **`@PostConstruct` in tests**: will not fire on manual `new`. Use reflection to inject Client (AI-1 fix in its plan already documents this).

---

## Acceptance Criteria

### Functional

- [ ] `POST /api/v1/proxy/ai/pray` returns 200 with `{data: PrayerResponseDto, meta: {requestId}}` for valid requests, hitting real Gemini upstream
- [ ] Crisis-keyword requests (e.g., "I want to die") return 200 with `data.topic == "crisis"`, `data.text` contains "988", NO Gemini upstream call (verify via backend log)
- [ ] Generated prayer text starts with "Dear God" (or "Dear Lord" / "Father") and ends with "Amen."
- [ ] Prayer length falls within 100–180 words for real Gemini responses (enforced by system prompt; validator allows 50–2000 chars as safety margin)
- [ ] Topic classification produces one of the 10 allowed values (anxiety, gratitude, healing, guidance, grief, forgiveness, relationships, strength, general, devotional) — never "crisis" from Gemini
- [ ] Invalid bodies return 400 with `ProxyError` shape (missing, blank, or oversized `request`)
- [ ] Gemini safety blocks return 422 with `code: SAFETY_BLOCK`
- [ ] Visiting `/daily?tab=pray`, submitting any free-text prayer request produces an AI-generated response (not a canned mock). Verify by: (a) response is unique across submissions (call twice with same input, get different texts), (b) network tab shows POST to `/api/v1/proxy/ai/pray`
- [ ] A request that would have hit the mock's `general` fallback (e.g., "pray for my custody hearing tomorrow") now produces a prayer that actually addresses custody/legal concerns

### Frontend graceful degradation

- [ ] With backend stopped, `/daily?tab=pray` still works — submitting a request returns a mock prayer from `getMockPrayer(request)`. No error toasts, no broken UI, no blank state
- [ ] Slow Gemini (>30s) aborts and falls back to mock within the timeout budget
- [ ] Malformed backend response (`{data: {text: "No salutation"}}`) falls through to mock — frontend shape validator catches it
- [ ] Audio auto-play behavior unchanged (still fires on submit regardless of real-vs-mock response)
- [ ] Side effects (`markPrayComplete`, `recordActivity('pray')`, localStorage draft removal) still fire on both real and mock paths

### Security invariants (inherit from Specs 1–3 + AI-1)

- [ ] No upstream error text leaks to client. Verified by `noLeakOfUpstreamErrorText` in `PrayerServiceTest` and `fullLifecycle_noUpstreamErrorTextLeaks` in `PrayerIntegrationTest`.
- [ ] Backend logs contain ONLY `requestLength` for prayer requests — never `request` content, never response `text` content. Verify via `grep 'request=' backend.log | wc -l` = 0 post-request.
- [ ] `X-Request-Id` and rate-limit headers present on all responses
- [ ] No new API keys on the frontend — bundle grep for `AIza` still returns 0 post-merge

### Crisis response invariants

- [ ] Crisis prayer text starts with "Dear God" and ends with "Amen." (matches structural invariant)
- [ ] Crisis prayer text contains "988" literal
- [ ] Crisis prayer contains references to "Crisis Text Line" or "741741" (the text-based resource)
- [ ] Backend `SELF_HARM_KEYWORDS` list is: (a) a superset of frontend `SELF_HARM_KEYWORDS`, (b) equal to `AskCrisisDetector.SELF_HARM_KEYWORDS`. Verified by `parityWithFrontend` and `parityWithAskDetector` tests.

### Quality invariants

- [ ] Prompt rules enforced by `PrayerPromptsTest` — all 6 rules present verbatim
- [ ] `FALLBACK_PRAYER` passes the structural invariant check (verified by `fallbackPrayer_matchesStructuralInvariant`)
- [ ] Retry-on-validation-failure works (verified by `pray_textMissingSalutationTriggersRetry`, etc.)
- [ ] After 2 validation failures, service returns `FALLBACK_PRAYER` with WARN log

### Test coverage

- [ ] All ~17 tests in `PrayerServiceTest` pass
- [ ] All 8 tests in `PrayerControllerTest` pass
- [ ] All 5 tests in `PrayerIntegrationTest` pass
- [ ] All 7 tests in `PrayerPromptsTest` pass
- [ ] All 8 tests in `PrayerCrisisDetectorTest` pass (including `parityWithAskDetector`)
- [ ] All ~12 tests in `services/__tests__/prayer-service.test.ts` pass
- [ ] Updated `PrayTabContent.test.tsx` still passes (all existing tests, no regressions)
- [ ] No tests skipped, no `xit` / `it.skip` / `it.todo`

### CI / build

- [ ] `cd backend && ./mvnw test` exit 0 — expected ~193 tests green (148 baseline + 45 new)
- [ ] `cd frontend && npm run build` succeeds
- [ ] `cd frontend && npm test -- --run` exit 0 — expected 12+ new tests, no regressions
- [ ] Bundle scans: `AIza` 0, `VITE_GEMINI_API_KEY` 0, `generativelanguage.googleapis.com` 0, `/api/v1/proxy/ai/pray` ≥1

### Runtime verification (Docker-free smoke, per Spec 3 pattern)

- [ ] Start backend via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- [ ] Health probe: `curl -s http://localhost:8080/api/v1/health | jq .providers.gemini.configured` returns `true`
- [ ] Prayer smoke (real Gemini):
  ```bash
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/pray \
    -H 'Content-Type: application/json' \
    -d '{"request":"I feel anxious about my job"}' \
    | jq '{id: .data.id, topic: .data.topic, startsWith: (.data.text | startswith("Dear ")), endsWith: (.data.text | endswith("Amen.")), textLength: (.data.text | length)}'
  ```
  Expect: `topic` in allowed list, `startsWith: true`, `endsWith: true`, `textLength` 500–1200.
- [ ] Crisis smoke: `curl -s .../ai/pray -d '{"request":"I want to die"}' | jq '{topic: .data.topic, has988: (.data.text | contains("988"))}'` returns `topic: "crisis"`, `has988: true`. Backend log shows zero Gemini calls for this request ID.
- [ ] Invalid input: `curl -s .../ai/pray -d '{"request":""}' | jq .code` returns `"INVALID_INPUT"`.
- [ ] PII leak grep: `grep -iE 'request=.+(anxious|pray|God|grief)' /tmp/worship-room-backend.log | wc -l` returns `0`.
- [ ] Rate-limit headers present on success response.
- [ ] `/ask` still works (AI-1 regression check — same Gemini key, shared infrastructure).

### Operational

- [ ] After merge: nothing to do. Gemini key unchanged. Users immediately see real AI on `/daily?tab=pray`.

---

## See Also

- `_specs/ai-proxy-foundation.md` (Spec 1, merged) — provides shared proxy infrastructure
- `_specs/ai-proxy-gemini.md` (Spec 2, merged) — Gemini SDK patterns, D2b test seam, D7 framework log suppression, D9 enum-based safety detection
- `_specs/ai-proxy-maps.md` (Spec 3, merged) — non-Docker smoke pattern
- `_specs/ai-integration-ask.md` (Spec AI-1, merged or merging) — **primary structural template for this spec**. Copy patterns verbatim: `AskService` → `PrayerService`, `AskController` → `PrayerController`, `AskCrisisDetector` → `PrayerCrisisDetector`, `AskPrompts` → `PrayerPrompts`. Reflection-based Client injection in tests. Retry-once-then-fallback. Crisis parity test.
- `_specs/ai-integration-journal.md` (Spec AI-3, future) — closes the AI Integration wave. Journal reflection has the same single-call-site pattern as prayer; AI-3 will borrow heavily from this spec.
- `frontend/src/mocks/daily-experience-mock-data.ts` — source of the 10 canned fallback prayers. Not modified by this spec.
- `frontend/src/constants/crisis-resources.ts` — frontend source of truth for crisis keywords.
- `.claude/rules/01-ai-safety.md` § Crisis Intervention Protocol — server-side crisis short-circuit satisfies this
- `.claude/rules/02-security.md` § Never Leak Upstream Error Text — enforced via `mapGeminiException`
- `.claude/rules/07-logging-monitoring.md` § PII handling — controller logs `requestLength` only

---

## Out of Scope (deferred to future specs)

- **AI-3 Journal Reflection** — `POST /api/v1/proxy/ai/reflect-journal`. Same single-call-site pattern; different prompt (gentle-mirror tone, no "Dear God/Amen." constraint); `JournalReflection` shape `{id, text}` (even simpler than `MockPrayer`).
- **Server-side caching** — each prayer request is long-tail; cache hit-rate near zero.
- **Streaming prayer output** — Gemini supports streaming but synchronous is simpler; prayer is short enough (100–180 words) that streaming's perceived-latency gains are marginal.
- **OpenAI as an alternative provider** — Gemini is used for the whole AI Integration wave per AD #1. Revisit post-wave if prayer quality feedback suggests it.
- **Saved prayers persistence** — the `SaveToPrayerListForm` already handles localStorage persistence; no backend storage in scope.
- **Multi-turn prayer coaching** — e.g., follow-up questions about the prayer experience. Future feature; out of scope.
- **Devotional snapshot passthrough** — passing the devotional passage/reflection text to the backend for richer context-aware prayer. Current design infers context from user text; future spec could add a `devotionalContext` field if the heuristic proves insufficient.
- **Guided prayer sessions AI** — the "Guided Prayer" section of the Pray tab uses pre-authored sessions; AI-generated guided sessions are a future feature.
- **Voice-guided audio prayer** — TTS over the generated prayer text. Future.
- **Prayer feedback loop** — thumbs up/down on generated prayers for quality monitoring. Future.
- **Model swap to larger Gemini variant** — `gemini-2.5-flash` or `gemini-2.5-pro` could improve pastoral tone at higher cost. One-line change in `PrayerService.MODEL` if desired.
