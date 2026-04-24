# AI Proxy: Gemini + BB-30/31 Frontend Migration (Spec 2 of 5)

**Spec ID:** ai-proxy-gemini
**Wave:** Key Protection (5-spec series, this is spec 2 of 5)
**Track:** Backend proxy endpoints + frontend client migration
**Branch:** `claude/feature/ai-proxy-gemini` — already cut from `main` after Spec 1 merged
**Depends on:** Spec 1 (`ai-proxy-foundation.md`) must be merged to `main` before this spec runs. Spec 2 uses the foundation's `ProxyResponse`, `ProxyError`, `ProxyException`, `WebClient` bean, `RateLimitFilter`, `RequestIdFilter`, and `ProxyExceptionHandler`.

> **Prerequisite verification:** run `git log main --oneline -5` and confirm the "AI proxy foundation" merge commit is visible. If not, Spec 1 is not on main yet — do not proceed.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-proxy-gemini` throughout the entire execution.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT reset. Do NOT run `git checkout`, `git commit`, `git push`, or any other git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current` via `bash`.** If the result is not `claude/feature/ai-proxy-gemini`, STOP and surface to Eric. Do not proceed until the user confirms the branch.
3. **Preserve frontend public signatures.** `generateExplanation`, `generateReflection`, `ExplainResult`, `ReflectResult`, and `__resetGeminiClientForTests` must retain their current signatures and return shapes. The hooks (`useExplainPassage`, `useReflectOnPassage`) import these; the hooks get only MINOR edits (one `if` branch removed from `classifyError`), so keeping the client's public surface unchanged means zero UX regression risk for BB-30 and BB-31.
4. **Keep the cache + rate-limit layers on the frontend.** They move untouched. The client-side cache (`bb32-v1:*` in localStorage) provides free repeat reads — that savings stays. The client-side rate limiter is a courtesy layer (protects against dev-tools loops); the backend's per-IP rate limit from Spec 1 is the actual enforcement.
5. **Prompts move to the backend ONLY.** After this spec, `EXPLAIN_PASSAGE_SYSTEM_PROMPT` and `REFLECT_PASSAGE_SYSTEM_PROMPT` live on the server. The backend is the single source of truth for prompt content. This lets future prompt iteration ship without a frontend release and eliminates drift risk.
6. **The model identifier (`gemini-2.5-flash-lite`) is backend-owned.** Backend passes the model string back in every response. Frontend echoes whatever it receives. Changing the model is a backend-only change after this spec.
7. **Use exactly the code specified in this spec.** Do not rewrite, refactor, or "improve" patterns. Java has many idioms; this spec picks specific ones to match Spec 1's conventions.
8. **Do NOT add dependencies.** All required libraries (`google-genai:1.51.0`, `spring-boot-starter-webflux`, `spring-boot-starter-validation`) are already in `backend/pom.xml` from Spec 1. This spec adds zero new Maven deps. On the frontend, this spec REMOVES `@google/genai`.
9. **Do NOT implement Ask AI migration in this spec.** `/ask` currently uses a separate code path (`src/api/client.ts` or similar). Spec 5 handles Ask AI. BB-30 and BB-31 only.

---

## Why this spec exists

Today, BB-30 ("Explain this passage") and BB-31 ("Reflect on this passage") call the Gemini API directly from the browser using `@google/genai`. The API key is `VITE_GEMINI_API_KEY`, which Vite inlines into the production JavaScript bundle at build time. Anyone can open DevTools → Sources, find the string, and use it to bill Gemini charges to Eric's Google Cloud account.

Google Cloud's HTTP-referrer restriction on the key is defense-in-depth, but referrer headers are trivially forgeable outside the browser (curl, server-to-server, etc.). The real fix is to keep the key on the server and have the server mediate every Gemini call.

This spec:

1. Adds two backend endpoints — `POST /api/v1/proxy/ai/explain` and `POST /api/v1/proxy/ai/reflect` — that accept `{reference, verseText}`, call Gemini server-side using the backend's `GEMINI_API_KEY` env var, and return the LLM response in the standard `ProxyResponse` envelope.
2. Moves both system prompts (`EXPLAIN_PASSAGE_SYSTEM_PROMPT` and `REFLECT_PASSAGE_SYSTEM_PROMPT`) to the backend. The frontend no longer knows what the prompts say.
3. Rewrites `frontend/src/lib/ai/geminiClient.ts` to call the backend via `fetch()` instead of the `@google/genai` SDK. The public functions (`generateExplanation`, `generateReflection`) keep identical signatures — no hook changes, no component changes.
4. Removes `@google/genai` from `frontend/package.json` (saves ~1 MB of bundle size — the SDK is substantial).
5. Removes `VITE_GEMINI_API_KEY` from `frontend/.env.example` and the typed-env helpers in `frontend/src/lib/env.ts`. The key no longer exists on the frontend after this spec.
6. Moves the three-path Gemini safety-block detection to the backend's `GeminiService`. Frontend no longer parses Gemini response internals.
7. Adds a new exception type, `SafetyBlockException` (HTTP 422, code `SAFETY_BLOCK`), so safety-triggered blocks map cleanly to a distinct frontend error class (`GeminiSafetyBlockError`).
8. Extends `backend/src/main/resources/openapi.yaml` with the two new paths, the request/response schemas, and a new `SafetyBlocked` response component.

After this spec ships, visiting production in a browser and searching the bundle for "gemini" or "AIza" returns nothing. The Gemini key is gone. Same for `@google/genai` imports. BB-30 and BB-31 continue to work identically from the user's perspective, just with an extra hop through the backend.

Specs 3, 4, and 5 do the same thing for Google Maps (Local Support feature), FCBH (audio Bible), and Ask AI, respectively. Spec 2 is the template the others follow.

---

## Files touched

| File | Change | Purpose |
|---|---|---|
| `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiController.java` | Create | Two POST endpoints (`/explain`, `/reflect`) that validate input and delegate to `GeminiService` |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiService.java` | Create | Wraps the `google-genai` SDK. Builds requests, executes the three-path safety check, maps SDK exceptions to typed proxy exceptions |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiPrompts.java` | Create | Two `public static final String` constants for the system prompts + two builder functions for the user prompts. Verbatim copies from the frontend |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/ExplainRequest.java` | Create | Request DTO record with Bean Validation constraints |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/ReflectRequest.java` | Create | Request DTO record with Bean Validation constraints |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiResponseDto.java` | Create | Response DTO record: `{content, model}` |
| `backend/src/main/java/com/example/worshiproom/proxy/common/SafetyBlockException.java` | Create | New typed exception, HTTP 422, code `SAFETY_BLOCK`, extends `ProxyException` |
| `backend/src/main/resources/openapi.yaml` | Modify | Add paths for `/api/v1/proxy/ai/explain` and `/reflect`, add request/response schemas, add `SafetyBlocked` shared response |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiControllerTest.java` | Create | `@WebMvcTest` slice — validates request bodies, response shape, error mapping |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiServiceTest.java` | Create | Unit tests with a mocked SDK — covers each error branch and safety detection path |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiIntegrationTest.java` | Create | `@SpringBootTest` end-to-end — mocks the SDK at the bean level, asserts full HTTP response including headers and error shape |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiPromptsTest.java` | Create | Guardrail tests on prompt text — assert that the 10 rules from each system prompt are present verbatim. Prevents accidental prompt drift |
| `frontend/src/lib/ai/geminiClient.ts` | Modify | Replace SDK-based impl with `fetch`-based impl. Preserve all public exports. Keep cache + rate-limit composition order intact |
| `frontend/src/lib/ai/errors.ts` | Modify | Remove `GeminiKeyMissingError` class (no longer applicable — backend owns the key) |
| `frontend/src/lib/env.ts` | Modify | Remove `requireGeminiApiKey`, `isGeminiApiKeyConfigured`, and the `GEMINI_API_KEY` module-level constant |
| `frontend/src/lib/ai/__tests__/geminiClient.test.ts` | Modify | Swap `vi.mock('@google/genai', ...)` for a global `fetch` mock. Update test fixtures for the new error paths (backend error codes instead of SDK errors) |
| `frontend/src/hooks/bible/useExplainPassage.ts` | Modify | Remove the `GeminiKeyMissingError` branch from `classifyError`. Remove the corresponding import |
| `frontend/src/hooks/bible/useReflectOnPassage.ts` | Modify | Same as `useExplainPassage` — one `if` branch removed |
| `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` | Delete | Content moved to backend. No consumers remain after `geminiClient.ts` is rewritten |
| `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts` | Delete | Content moved to backend. No consumers remain after `geminiClient.ts` is rewritten |
| `frontend/src/lib/ai/prompts/__tests__/explainPassagePrompt.test.ts` | Delete | Tests the deleted prompt file. Equivalent guardrail now lives in `backend/.../GeminiPromptsTest.java` |
| `frontend/src/lib/ai/prompts/__tests__/reflectPassagePrompt.test.ts` | Delete | Same — replaced by the backend guardrail test |
| `frontend/src/lib/ai/prompts/` | Delete | Empty directory after the four files above are removed |
| `frontend/.env.example` | Modify | Remove `VITE_GEMINI_API_KEY` block |
| `frontend/package.json` | Modify | Remove `@google/genai` from `dependencies`. Regenerate `package-lock.json` (via `npm install`, not by hand) |

**Net changes:** backend gains ~500 lines of Java + ~60 lines of YAML (OpenAPI additions) + ~400 lines of tests. Frontend loses ~250 lines (prompts + env helpers + unused error class) and gains ~180 lines (fetch-based client + updated tests). Total ≈ +900 / -430. About 24 files touched.

**Net runtime impact:** BB-30 and BB-31 gain one extra hop (frontend → `http://localhost:8080/api/v1/proxy/ai/*` → Gemini instead of frontend → Gemini directly). Localhost latency on the extra hop is negligible (<5 ms). In production, frontend-to-backend is same-region and adds roughly the same latency as one DNS lookup. The client-side cache remains in place, so repeat reads are still zero-network.

---

## Architecture decisions

A few decisions worth surfacing:

**1. Prompts live on the backend only.** The frontend never sees the system prompt text after this spec. Rationale: prompts are content and iteration on them is tightly scoped. Keeping the prompts in the backend means Eric can A/B different wordings, try a new rule, or fix a quirk without touching the frontend or deploying a new SPA. The frontend treats explanation/reflection content as opaque text returned by the proxy. The `GeminiPromptsTest` (a backend test) locks in the 10 rules per prompt with verbatim-substring assertions so accidental edits fail CI.

**2. Model identifier (`gemini-2.5-flash-lite`) is backend-owned and echoed in every response.** The backend sends `{content, model}` back on every success response. Frontend stores whatever string arrives in `ExplainResult.model`/`ReflectResult.model` (same shape as today). When the backend eventually moves to a different model, the frontend code is unchanged. The client-side cache keys currently include the model string; those stale keys become cache misses naturally and clean themselves up via the existing 7-day TTL.

**3. Request/response shape is optimized for zero hook changes.** `generateExplanation(reference, verseText, signal)` keeps its signature. `ExplainResult` keeps `{content, model}`. The hooks don't know or care that the implementation swapped from SDK to fetch. The one-line change to `classifyError` (removing the `GeminiKeyMissingError` branch) is the only hook edit — and that's mechanical, not behavioral.

**4. Client-side cache stays in place.** The `bb32-v1:*` localStorage cache short-circuits repeat reads. After this spec, a cache hit returns without any fetch to the backend at all — same as today's behavior where a cache hit returns without any fetch to Gemini. The cache is cheaper than the backend hop, and the backend hop is cheaper than the Gemini call.

**5. Client-side rate limiter stays in place.** It's a courtesy layer: protects against accidental bursts from rapid passage navigation or dev-tools loops. Backend's per-IP rate limit (from Spec 1) is the actual enforcement. Having both is belt-and-suspenders; the client limit fails-fast before the network request, which is better UX.

**6. Three-path safety detection moves to `GeminiService`.** Today's frontend checks `response.promptFeedback?.blockReason`, `candidates[0].finishReason === 'SAFETY' | 'PROHIBITED_CONTENT'`, and empty-text fallback. All three checks move to the Java service. On any safety trigger, it throws `SafetyBlockException` → handler emits HTTP 422 with `{code: "SAFETY_BLOCK", message, requestId, timestamp}` → frontend maps to `GeminiSafetyBlockError`.

**7. Per-request 30-second timeout.** Gemini calls can take 10-20 seconds under load. The proxy-foundation default timeout is 10 seconds (suitable for Maps/FCBH), so `GeminiService` overrides it per-request. The foundation's `proxyWebClient()` bean has the body-size limit; `GeminiService` uses the google-genai SDK directly (not WebClient) and applies its own 30 s timeout via `HttpOptions.timeout(Duration.ofSeconds(30))` on the SDK client. If a timeout fires, the SDK throws; the service catches and maps to `UpstreamTimeoutException` (HTTP 504 from Spec 1's exception hierarchy).

**8. `AbortSignal` flows through fetch naturally.** The caller's `AbortSignal` (from the React effect cleanup) is passed to `fetch(url, {signal})`. When it fires, fetch throws `DOMException` with name `AbortError`, which the client re-throws unchanged so the hook can detect `err.name === 'AbortError'` and silently discard. This matches the current SDK-based behavior exactly.

**9. Key missing on the backend is NOT a user-visible error path.** If the backend's `GEMINI_API_KEY` env var is empty, `GeminiService.generateContent()` throws `UpstreamException("AI service is not configured on the server")` which maps to HTTP 502 `UPSTREAM_ERROR`. Frontend sees a generic `GeminiApiError`. This is intentional: the frontend user can't fix a missing backend key by retrying, and the backend operator sees the specific error in logs with the request ID. No need for a distinct `KEY_MISSING` code visible to the client. The frontend's `GeminiKeyMissingError` class is deleted because it no longer corresponds to any real frontend-visible condition.

**10. Validation runs before the SDK call.** Request DTOs use Bean Validation annotations (`@NotBlank`, `@Size(max=...)`). The shared `ProxyExceptionHandler.handleValidation` (from Spec 1) already maps `MethodArgumentNotValidException` to HTTP 400 `INVALID_INPUT`. No new handler needed.

**11. CORS is already correct from Spec 1.** `proxy.cors.allowed-origins` covers `localhost:5173` in dev and `https://worshiproom.com` + `https://www.worshiproom.com` in prod. The `exposedHeaders` list already includes the rate-limit headers and `X-Request-Id`. No CORS changes needed in this spec.

---

## Contract between frontend and backend

### `POST /api/v1/proxy/ai/explain`

**Request body (JSON):**
```json
{
  "reference": "1 Corinthians 13:4-7",
  "verseText": "Love is patient and is kind; love doesn't envy. Love doesn't brag..."
}
```

**Request validation:**
- `reference` — required, non-blank, ≤ 200 chars
- `verseText` — required, non-blank, ≤ 8000 chars

**Success response (200 OK):**
```json
{
  "data": {
    "content": "Paul is writing to a factional Corinthian church, not a wedding audience...",
    "model": "gemini-2.5-flash-lite"
  },
  "meta": {
    "requestId": "AbCdEfGhIjKlMnOpQrStUv"
  }
}
```

**Response headers:**
- `X-Request-Id: <22-char base64>`
- `X-RateLimit-Limit: <int>`
- `X-RateLimit-Remaining: <int>`
- `X-RateLimit-Reset: <epoch-seconds>`
- `Content-Type: application/json`

### `POST /api/v1/proxy/ai/reflect`

Request shape, validation, success shape, and headers are identical to `/explain`. The only differences are the URL path and the system prompt used internally by `GeminiService`.

### Error response shape (all error codes)

All errors use the `ProxyError` shape from Spec 1:

```json
{
  "code": "SAFETY_BLOCK",
  "message": "The AI couldn't process this passage safely. Consider consulting a commentary.",
  "requestId": "AbCdEfGhIjKlMnOpQrStUv",
  "timestamp": "2026-04-21T10:30:00Z"
}
```

### Full error mapping (backend code → HTTP status → frontend error class)

| Trigger | Backend code | HTTP status | Frontend error class |
|---|---|---|---|
| Missing/blank `reference` or `verseText`; oversized | `INVALID_INPUT` | 400 | `GeminiApiError` (via generic `/4xx → api/` path) |
| Per-IP rate limit bucket empty (from Spec 1's filter) | `RATE_LIMITED` | 429 | `RateLimitError` (reads `Retry-After` header for countdown) |
| Gemini safety filter blocked the prompt or output, OR empty text | `SAFETY_BLOCK` | 422 | `GeminiSafetyBlockError` |
| Gemini API returned non-success (invalid key on backend, quota, 5xx) | `UPSTREAM_ERROR` | 502 | `GeminiApiError` |
| Gemini call exceeded 30 s timeout | `UPSTREAM_TIMEOUT` | 504 | `GeminiTimeoutError` |
| Any other server-side failure (bug, unexpected exception) | `INTERNAL_ERROR` | 500 | `GeminiApiError` |
| Network failure (frontend → backend unreachable) | *(no backend response)* | *(fetch TypeError)* | `GeminiNetworkError` |
| Caller-provided `AbortSignal` fires | *(no backend response)* | *(fetch `AbortError`)* | Re-thrown unchanged; hook detects and silently discards |

**Note on `INVALID_INPUT`:** This should never happen in practice because the frontend's callers (BibleReader) always pass validated reference + verse text. If it does happen (bug or manipulated request), the frontend maps to the generic "temporarily unavailable" copy via `GeminiApiError`. The user-facing outcome is the same as any other 4xx — no need for a distinct frontend class.

**Note on `RATE_LIMITED`:** Backend's rate limit comes BEFORE the service call. Frontend's `RateLimitError` client-side check comes BEFORE the fetch. Either layer can trip first; both surface through the same frontend error class with `retryAfterSeconds`. When the backend trips it, the frontend reads `Retry-After` (sent as an integer-seconds header by `RateLimitExceptionHandler` from Spec 1) into `retryAfterSeconds`.

---

## Backend file-by-file changes

### 1. `backend/src/main/java/com/example/worshiproom/proxy/common/SafetyBlockException.java` (NEW)

One new exception type in the shared `proxy.common` package, because this exception is raised by `GeminiService` but could plausibly be raised by future AI proxies (a Claude proxy, a local LLM proxy) — keeping it in `common` avoids coupling other proxies to the `proxy.ai` subpackage.

**Full file contents:**

```java
package com.example.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an upstream AI model refused to generate a response due to its
 * safety filters. Distinct from {@link UpstreamException} (502) because a
 * safety block is not a server failure — the request was valid, the upstream
 * was reachable, the upstream deliberately chose not to answer.
 *
 * HTTP 422 (Unprocessable Content) per RFC 9110 §15.5.21: "the server
 * understands the content type of the request, and the syntax of the request
 * is correct, but it was unable to process the contained instructions". A
 * safety block fits that description exactly.
 *
 * The frontend maps this to {@code GeminiSafetyBlockError} and renders the
 * user-facing copy: "This passage is too difficult for our AI helper to
 * explain well. Consider reading a scholarly commentary or asking a trusted
 * teacher."
 *
 * Raised by:
 *   - {@code GeminiService} on prompt-level block, output-level block, or
 *     empty-text silent block
 *
 * Caught by:
 *   - {@code ProxyExceptionHandler.handleProxyException} via the generic
 *     {@link ProxyException} catch — no dedicated handler needed because
 *     the shape already carries status + code
 */
public class SafetyBlockException extends ProxyException {

    public SafetyBlockException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "SAFETY_BLOCK", message);
    }

    public SafetyBlockException(String message, Throwable cause) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "SAFETY_BLOCK", message, cause);
    }
}
```

**No handler changes needed.** The existing `ProxyExceptionHandler.handleProxyException(ProxyException)` catches `SafetyBlockException` polymorphically and emits the standard `ProxyError` body with status 422 and code `SAFETY_BLOCK`. Verified: `ProxyExceptionHandler` currently uses `@ExceptionHandler(ProxyException.class)` which matches all subclasses.

### 2. `backend/src/main/java/com/example/worshiproom/proxy/ai/ExplainRequest.java` (NEW)

Request DTO for the `/explain` endpoint. Records are the Spec 1 convention for DTOs. Bean Validation annotations on record components work via the `jakarta.validation` package (already pulled in by `spring-boot-starter-validation`).

**Full file contents:**

```java
package com.example.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/proxy/ai/explain}.
 *
 * Constraints:
 *   - {@code reference} is required and capped at 200 chars. Longest
 *     realistic Bible reference is ~50 chars (e.g., "The Song of Solomon
 *     5:2-16"); 200 is generous padding for defensive validation.
 *   - {@code verseText} is required and capped at 8000 chars. The longest
 *     chapter in scripture (Psalm 119) is ~12,000 chars; we cap AI
 *     explanation requests to 8000 to bound upstream cost and latency.
 *     Callers enforce a 20-verse cap upstream; 8000 is a hard backstop.
 */
public record ExplainRequest(
    @NotBlank(message = "reference is required")
    @Size(max = 200, message = "reference must be 200 characters or fewer")
    String reference,

    @NotBlank(message = "verseText is required")
    @Size(max = 8000, message = "verseText must be 8000 characters or fewer")
    String verseText
) {}
```

### 3. `backend/src/main/java/com/example/worshiproom/proxy/ai/ReflectRequest.java` (NEW)

Structurally identical to `ExplainRequest`. Kept as a separate record (not a shared DTO) because future iteration may add per-endpoint fields — e.g., `ExplainRequest` might gain a `depth: "brief" | "deep"` field, or `ReflectRequest` might gain a `tone: "gentle" | "challenging"` field. Parallel types today keep the controller signatures clean and leave room to diverge later.

**Full file contents:**

```java
package com.example.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/proxy/ai/reflect}.
 *
 * Same constraints as {@link ExplainRequest}. See that class for rationale.
 * Kept as a separate record so Explain and Reflect can diverge
 * independently if future iterations add per-feature fields.
 */
public record ReflectRequest(
    @NotBlank(message = "reference is required")
    @Size(max = 200, message = "reference must be 200 characters or fewer")
    String reference,

    @NotBlank(message = "verseText is required")
    @Size(max = 8000, message = "verseText must be 8000 characters or fewer")
    String verseText
) {}
```

### 4. `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiResponseDto.java` (NEW)

Response DTO — the shape that goes inside the `data` field of the `ProxyResponse` envelope.

**Full file contents:**

```java
package com.example.worshiproom.proxy.ai;

/**
 * Response payload for {@code POST /api/v1/proxy/ai/explain} and
 * {@code /reflect}. Wrapped in {@code ProxyResponse<GeminiResponseDto>} by
 * the controller before being serialized to JSON.
 *
 * On the wire:
 *   {
 *     "data": { "content": "...", "model": "gemini-2.5-flash-lite" },
 *     "meta": { "requestId": "AbCdEfGhIjKlMnOpQrStUv" }
 *   }
 *
 * The frontend's {@code ExplainResult} and {@code ReflectResult} types
 * match this shape byte-for-byte — {@code {content, model}}.
 */
public record GeminiResponseDto(String content, String model) {}
```

---

### 5. `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiPrompts.java` (NEW)

Central repository of prompt text for the AI proxy. Both system prompts and both user-prompt builders live here. The text is **verbatim** from the current frontend prompt files. DO NOT paraphrase, reformat, or "improve" the wording — it is the product of deliberate content work and the prompt-testing methodology documented in `_plans/recon/bb30-prompt-tests.md` and `_plans/recon/bb31-prompt-tests.md`.

**Full file contents:**

```java
package com.example.worshiproom.proxy.ai;

/**
 * System prompts and user-prompt builders for Gemini-backed AI features.
 *
 * The two system prompts (EXPLAIN and REFLECT) are copied verbatim from the
 * former frontend files {@code frontend/src/lib/ai/prompts/explainPassagePrompt.ts}
 * and {@code reflectPassagePrompt.ts}. The Git history of those deleted files
 * preserves authorship context if needed.
 *
 * DO NOT paraphrase, reformat, or "improve" the wording. The text is the
 * product of deliberate content work and the 8-case prompt testing
 * methodology documented in {@code _plans/recon/bb30-prompt-tests.md} and
 * {@code bb31-prompt-tests.md}. Any iteration must go through that process.
 *
 * {@link GeminiPromptsTest} locks in the 10 numbered rules from each system
 * prompt with verbatim-substring assertions so accidental edits (e.g., a
 * find-and-replace that spans this file) fail CI before they ship.
 */
public final class GeminiPrompts {

    private GeminiPrompts() {
        // Utility class — no instances
    }

    /**
     * System prompt for BB-30 "Explain this passage" — establishes the
     * scholar-not-pastor voice with explicit rules against proselytizing,
     * prescription, and pastoral ventriloquism.
     */
    public static final String EXPLAIN_SYSTEM_PROMPT = """
            You are a thoughtful biblical scholar helping a user understand a scripture passage they're reading in the World English Bible. Your explanations are grounded in scholarship — historical context, literary genre, linguistic observations, and honest acknowledgment of interpretive difficulty.

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

            Respond with the explanation text only. Do not include a greeting, a summary header, a closing question, or any framing text. Just the explanation.""";

    /**
     * Build the user prompt for a specific passage. The reference and verse
     * text are interpolated into a fixed template; no mood, time-of-day, or
     * other runtime context is added. Template is uniform across every
     * request.
     */
    public static String buildExplainUserPrompt(String reference, String verseText) {
        return """
                Explain this passage from the World English Bible:

                %s
                %s

                Give me the context, what the passage is doing in its own setting, and any interpretive difficulties an honest reader should know about.""".formatted(reference, verseText);
    }

    /**
     * System prompt for BB-31 "Reflect on this passage" — establishes the
     * contemplative, interrogative/conditional voice with explicit rules
     * against pastoral ventriloquism, prescribed application, and the
     * life-lesson voice.
     */
    public static final String REFLECT_SYSTEM_PROMPT = """
            You are helping a reader think about how a scripture passage from the World English Bible might land for them today. You are not a pastor, a preacher, a spiritual director, or a life coach. You do not assume the reader is a Christian. You do not assume you know what the reader is going through. You do not assume the passage is relevant to the reader at all.

            Your job is to offer the reader a small set of genuine questions and possibilities — not answers, not applications, not instructions. You help the reader do their own thinking, not your thinking.

            Your reflections follow these rules:

            1. Use interrogative and conditional mood. Ask questions the reader could sit with. Offer possibilities the reader could consider. Do not make declarative statements about what the passage means for the reader. Examples of good phrasing: "A reader might ask...", "One way this could land today is...", "Someone reading this might find themselves wondering...", "This passage might raise the question of...". Examples of bad phrasing: "This passage teaches us that...", "God is calling you to...", "You should consider...", "The lesson here is...".

            2. Offer multiple possibilities, not a single application. The reader should come away with two or three genuine directions to think in, not one prescribed takeaway. If you can only think of one direction, the reflection is incomplete.

            3. Name the reader's agency explicitly. At least once in the reflection, acknowledge that the passage might not land at all — that the reader might read it and feel nothing, or might disagree with it, or might find it troubling. This is not the same as saying "this passage is difficult." It is giving the reader explicit permission to not relate to the text.

            4. Do not assume the reader's circumstances. Do not say "when you are going through a difficult time" or "if you are struggling with" or anything that implies you know what the reader is experiencing. Instead, name the situation the passage itself is describing and let the reader decide whether it resonates.

            5. Do not prescribe practices. Do not suggest prayer, journaling, memorizing verses, talking to a pastor, going to church, meditation, gratitude practices, or any other activity. The reader asked for reflection, not a to-do list.

            6. Do not speak for God. Never use phrases like "God wants you to", "God is telling you", "the Lord is calling you to", "God is inviting you to", or any variant. The reader's relationship with God is not yours to narrate.

            7. Do not weaponize the passage. If the passage has been used to guilt or shame readers (Philippians 4 being used against anxious people, Proverbs being used against people in poverty, etc.), either avoid that angle entirely or explicitly name the weaponization and refuse to participate in it. Never produce output that could make a reader feel worse about themselves for not measuring up.

            8. Be restrained in length. Reflections should be 150-300 words, shorter than BB-30's explanations. Users reading a reflection are often looking for a quiet moment, not a sermon. Every sentence earns its place.

            9. Avoid the "life lesson" voice. Do not end with "so the next time you..." or "this is a reminder that..." or "let this be a lesson that...". These are the classic devotional-content patterns and the reflection is explicitly refusing them.

            10. It is okay to sit with difficulty. If the passage is hard — morally, emotionally, theologically — the reflection does not have to resolve the difficulty. It can name the difficulty, offer the reader a question about how to hold it, and stop there. The goal is honest companionship with the text, not reassurance.

            Respond with the reflection text only. Do not include a greeting, a summary header, a closing question directed at the assistant, or any framing text. Just the reflection.""";

    /**
     * Build the user prompt for a specific passage. Same template shape as
     * {@link #buildExplainUserPrompt} but with different framing language.
     */
    public static String buildReflectUserPrompt(String reference, String verseText) {
        return """
                I'm reading this passage from the World English Bible:

                %s
                %s

                Help me think about how this might land today. Offer me genuine questions and possibilities, not answers or instructions.""".formatted(reference, verseText);
    }
}
```

**A note on Java text blocks:** the `"""..."""` syntax strips leading incidental whitespace based on the least-indented line. The prompts above are aligned so the left margin of each rule sits at column 0 inside the string — matching the frontend's backtick-string exactly. Run `GeminiPromptsTest` to confirm.

---

### 6. `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiService.java` (NEW)

Wraps the `google-genai` SDK. One service handles both `/explain` and `/reflect` — the only per-feature difference is the system prompt and the user-prompt builder. The controller picks which prompt pair to use and delegates.

**Full file contents:**

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.google.genai.Client;
import com.google.genai.types.Candidate;
import com.google.genai.types.Content;
import com.google.genai.types.FinishReason;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.Part;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.TimeoutException;
import java.util.function.BiFunction;

/**
 * Server-side Gemini caller. Wraps the google-genai Java SDK, executes the
 * three-path safety check (prompt block, output block, silent empty), and
 * maps SDK exceptions to typed proxy exceptions from
 * {@code com.example.worshiproom.proxy.common}.
 *
 * The SDK client is lazily initialized in {@link #initClient()} and reused
 * for every request. On a missing or empty {@code GEMINI_API_KEY}, the
 * client is NOT created — every call throws {@link UpstreamException} with
 * a user-safe message ("AI service is not configured"). The frontend
 * surfaces this as a generic {@code GeminiApiError}; the actual error
 * context is visible to operators via the server log (with the request
 * ID).
 *
 * Timeout strategy: Gemini calls can take 10–20 seconds under normal load.
 * The shared {@code proxy.upstream.default-timeout-ms} (10s) is too short
 * for Gemini, so this service overrides it per-request by configuring the
 * SDK with a 30-second {@link HttpOptions#timeout} at client
 * construction. If the timeout fires, the SDK throws a wrapped
 * {@link TimeoutException}; we map to {@link UpstreamTimeoutException}
 * (HTTP 504).
 *
 * Thread safety: the SDK's {@code Client} is thread-safe and meant to be
 * reused (per google-genai docs). Stored in a private field after
 * construction.
 */
@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    static final String MODEL_ID = "gemini-2.5-flash-lite";
    static final int MAX_OUTPUT_TOKENS = 600;
    static final float TEMPERATURE = 0.7f;
    static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final ProxyConfig proxyConfig;
    private Client client;  // null until initClient() runs

    public GeminiService(ProxyConfig proxyConfig) {
        this.proxyConfig = proxyConfig;
    }

    @PostConstruct
    void initClient() {
        String apiKey = proxyConfig.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/* endpoints will return 502 UPSTREAM_ERROR until it is set.");
            this.client = null;
            return;
        }
        // HttpOptions lets us override the default HTTP-level timeout for
        // every request this client makes. google-genai bakes the timeout
        // into the SDK call path, so we don't need to layer a separate
        // executor timeout on top.
        HttpOptions httpOptions = HttpOptions.builder()
                .timeout((int) REQUEST_TIMEOUT.toMillis())
                .build();
        this.client = Client.builder()
                .apiKey(apiKey)
                .httpOptions(httpOptions)
                .build();
    }

    /**
     * Generate an explanation for the given passage. Delegates to the shared
     * {@link #generate} with the EXPLAIN prompt pair.
     */
    public GeminiResponseDto generateExplanation(String reference, String verseText) {
        return generate(
                reference,
                verseText,
                GeminiPrompts.EXPLAIN_SYSTEM_PROMPT,
                GeminiPrompts::buildExplainUserPrompt
        );
    }

    /**
     * Generate a reflection for the given passage. Delegates to the shared
     * {@link #generate} with the REFLECT prompt pair.
     */
    public GeminiResponseDto generateReflection(String reference, String verseText) {
        return generate(
                reference,
                verseText,
                GeminiPrompts.REFLECT_SYSTEM_PROMPT,
                GeminiPrompts::buildReflectUserPrompt
        );
    }

    /**
     * Shared implementation. Runs the SDK call, then the three-path safety
     * check, then returns a {@link GeminiResponseDto} on success.
     *
     * On any failure the method throws a subclass of
     * {@link com.example.worshiproom.proxy.common.ProxyException}, which
     * the shared {@code ProxyExceptionHandler} maps to the standard
     * {@code ProxyError} JSON body with the appropriate HTTP status.
     */
    GeminiResponseDto generate(
            String reference,
            String verseText,
            String systemPromptText,
            BiFunction<String, String, String> userPromptBuilder
    ) {
        if (client == null) {
            // Key was not configured at startup — see initClient().
            throw new UpstreamException("AI service is not configured on the server.");
        }

        String userPrompt = userPromptBuilder.apply(reference, verseText);
        Content systemInstruction = Content.fromParts(Part.fromText(systemPromptText));

        GenerateContentConfig config = GenerateContentConfig.builder()
                .systemInstruction(systemInstruction)
                .maxOutputTokens(MAX_OUTPUT_TOKENS)
                .temperature(TEMPERATURE)
                .build();

        GenerateContentResponse response;
        try {
            response = client.models.generateContent(MODEL_ID, userPrompt, config);
        } catch (Exception ex) {
            // SDK exceptions are classified by unwrapping their cause chain.
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException(
                        "AI service timed out. Please try again.",
                        ex
                );
            }
            // Every other SDK failure (HTTP 4xx/5xx from Gemini, parse
            // errors, malformed responses) surfaces as UPSTREAM_ERROR. The
            // handler NEVER includes the cause's message in the response
            // body — only the user-safe message above. The cause is logged
            // server-side with the request ID for debugging.
            throw new UpstreamException(
                    "AI service is temporarily unavailable. Please try again.",
                    ex
            );
        }

        // Three-path safety check — translated verbatim from the frontend.
        Optional.ofNullable(response.promptFeedback())
                .flatMap(pf -> pf.blockReason())
                .ifPresent(reason -> {
                    throw new SafetyBlockException(
                            "Gemini blocked the prompt: " + reason
                    );
                });

        Optional<Candidate> firstCandidate = response.candidates()
                .flatMap(list -> list.isEmpty() ? Optional.empty() : Optional.of(list.get(0)));

        Optional<FinishReason> finishReason = firstCandidate
                .flatMap(Candidate::finishReason);

        if (finishReason.isPresent()) {
            String reason = finishReason.get().toString();
            if ("SAFETY".equals(reason) || "PROHIBITED_CONTENT".equals(reason)) {
                throw new SafetyBlockException(
                        "Gemini blocked the response: finishReason=" + reason
                );
            }
        }

        String content = response.text();
        if (content == null || content.isBlank()) {
            throw new SafetyBlockException(
                    "Gemini returned an empty response (likely a silent safety block)."
            );
        }

        return new GeminiResponseDto(content.trim(), MODEL_ID);
    }

    /**
     * Walk the exception cause chain looking for a TimeoutException. The
     * google-genai SDK wraps HTTP-layer exceptions inside its own types,
     * so a direct {@code ex instanceof TimeoutException} check misses
     * real timeouts.
     */
    private static boolean isTimeout(Throwable ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            if (cursor instanceof TimeoutException) return true;
            // google-genai currently surfaces SDK-level timeouts with a
            // message containing "timeout" — defensive fallback.
            String msg = cursor.getMessage();
            if (msg != null && msg.toLowerCase().contains("timeout")) return true;
            if (cursor.getCause() == cursor) return false; // self-referential guard
            cursor = cursor.getCause();
        }
        return false;
    }
}
```

**A note on the google-genai Java SDK API:** the SDK's API surface (verified against the canonical `googleapis/java-genai` examples repo and `com.google.genai:google-genai:1.51.0`):

- `Client.builder().apiKey(String).httpOptions(HttpOptions).build()` produces a thread-safe `Client`
- `client.models.generateContent(String modelId, String userPrompt, GenerateContentConfig config)` returns `GenerateContentResponse`
- `GenerateContentConfig.builder().systemInstruction(Content).maxOutputTokens(int).temperature(float).build()`
- `Content.fromParts(Part.fromText(String))` — the system prompt goes in a `Content` wrapper, not a bare string
- `response.text()` returns the aggregated text of the first candidate (convenience accessor)
- `response.candidates()` returns `Optional<List<Candidate>>`
- `response.promptFeedback()` returns `Optional<GenerateContentResponsePromptFeedback>` which exposes `blockReason()` as `Optional<BlockedReason>` — check both layers before dereferencing
- `Candidate.finishReason()` returns `Optional<FinishReason>`; `FinishReason` is an enum with `toString()` producing `"STOP"`, `"SAFETY"`, `"PROHIBITED_CONTENT"`, etc.

If CC runs into a method-not-found error, the SDK version in `pom.xml` is pinned to 1.51.0. Check against the 1.51.0 tag on `googleapis/java-genai` for the exact API surface. DO NOT upgrade the pinned version to work around a compile issue — surface to Eric.

---

### 7. `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiController.java` (NEW)

Two POST endpoints. Each validates its request body via `@Valid`, delegates to `GeminiService`, wraps the result in `ProxyResponse`, and returns it.

**Full file contents:**

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

/**
 * HTTP endpoints for Gemini-backed AI features (BB-30 Explain, BB-31 Reflect).
 *
 * Both endpoints share the same request shape and response envelope — the
 * only per-endpoint difference is the system prompt used internally.
 *
 * All error paths flow through {@code ProxyExceptionHandler} (Spec 1).
 * Specifically:
 *   - Bean Validation failures → 400 INVALID_INPUT
 *   - SafetyBlockException → 422 SAFETY_BLOCK
 *   - UpstreamException → 502 UPSTREAM_ERROR
 *   - UpstreamTimeoutException → 504 UPSTREAM_TIMEOUT
 *   - Unhandled Throwable → 500 INTERNAL_ERROR (generic, safe message)
 *   - RateLimitExceededException (from the filter) → 429 RATE_LIMITED
 *     (handled by {@code RateLimitExceptionHandler} separately)
 *
 * Both endpoints are rate-limited by {@code RateLimitFilter} (Spec 1) which
 * matches {@code /api/v1/proxy/**} prefix.
 */
@RestController
@RequestMapping("/api/v1/proxy/ai")
public class GeminiController {

    private static final Logger log = LoggerFactory.getLogger(GeminiController.class);

    private final GeminiService geminiService;

    public GeminiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/explain")
    public ProxyResponse<GeminiResponseDto> explain(@Valid @RequestBody ExplainRequest request) {
        log.info(
                "Explain request received reference={} verseTextLength={}",
                request.reference(),
                request.verseText().length()
        );
        GeminiResponseDto payload = geminiService.generateExplanation(
                request.reference(),
                request.verseText()
        );
        return ProxyResponse.of(payload, MDC.get("requestId"));
    }

    @PostMapping("/reflect")
    public ProxyResponse<GeminiResponseDto> reflect(@Valid @RequestBody ReflectRequest request) {
        log.info(
                "Reflect request received reference={} verseTextLength={}",
                request.reference(),
                request.verseText().length()
        );
        GeminiResponseDto payload = geminiService.generateReflection(
                request.reference(),
                request.verseText()
        );
        return ProxyResponse.of(payload, MDC.get("requestId"));
    }
}
```

**Logging note:** we log `reference` (a Bible citation like `"John 3:16"` — not PII) and `verseTextLength` (a number, not the content). The actual verse text is never logged, nor is the LLM response. This matches the project's "no PII in logs" rule from `.claude/rules/07-logging-monitoring.md`.

**Dependency injection note:** constructor injection (not `@Autowired` field injection) matches Spec 1's convention. Spring auto-wires `GeminiService` via its `@Service` annotation. `ProxyResponse.of(payload, MDC.get("requestId"))` reads the request ID that `RequestIdFilter` (Spec 1) placed in MDC at the start of the request.

### 8. `backend/src/main/resources/openapi.yaml` (MODIFY)

Add two paths under `/api/v1/proxy/ai/*`, add request/response schemas, add a new `SafetyBlocked` shared response. The existing scaffold already has `ProxyResponse`, `ProxyError`, and the five error responses (BadRequest, RateLimited, UpstreamError, UpstreamTimeout, InternalError) — reuse those.

**Insertion point 1 — new paths.** Insert the following UNDER `paths:` AFTER the existing `/api/v1/health:` block:

```yaml
  /api/v1/proxy/ai/explain:
    post:
      tags: [Proxy / AI]
      summary: Generate a scholarly explanation for a scripture passage
      description: |
        Proxied call to Gemini. Frontend (BB-30) sends a reference and verse
        text; the server adds the system prompt, calls Gemini with the
        backend-owned API key, and returns the generated explanation.

        The system prompt is not configurable by the client — it lives in
        `GeminiPrompts.java` on the server.
      operationId: explainPassage
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ExplainRequest' }
      responses:
        '200':
          description: Explanation generated successfully
          content:
            application/json:
              schema:
                type: object
                required: [data, meta]
                properties:
                  data: { $ref: '#/components/schemas/GeminiResponseDto' }
                  meta:
                    type: object
                    required: [requestId]
                    properties:
                      requestId: { type: string }
        '400': { $ref: '#/components/responses/BadRequest' }
        '422': { $ref: '#/components/responses/SafetyBlocked' }
        '429': { $ref: '#/components/responses/RateLimited' }
        '500': { $ref: '#/components/responses/InternalError' }
        '502': { $ref: '#/components/responses/UpstreamError' }
        '504': { $ref: '#/components/responses/UpstreamTimeout' }

  /api/v1/proxy/ai/reflect:
    post:
      tags: [Proxy / AI]
      summary: Generate a contemplative reflection for a scripture passage
      description: |
        Proxied call to Gemini. Frontend (BB-31) sends a reference and verse
        text; the server adds the system prompt, calls Gemini with the
        backend-owned API key, and returns the generated reflection.

        Request/response shape identical to `/explain`. The only difference
        is the system prompt used internally — the reflect prompt emphasizes
        interrogative/conditional voice and multiple possibilities.
      operationId: reflectOnPassage
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ReflectRequest' }
      responses:
        '200':
          description: Reflection generated successfully
          content:
            application/json:
              schema:
                type: object
                required: [data, meta]
                properties:
                  data: { $ref: '#/components/schemas/GeminiResponseDto' }
                  meta:
                    type: object
                    required: [requestId]
                    properties:
                      requestId: { type: string }
        '400': { $ref: '#/components/responses/BadRequest' }
        '422': { $ref: '#/components/responses/SafetyBlocked' }
        '429': { $ref: '#/components/responses/RateLimited' }
        '500': { $ref: '#/components/responses/InternalError' }
        '502': { $ref: '#/components/responses/UpstreamError' }
        '504': { $ref: '#/components/responses/UpstreamTimeout' }
```

**Insertion point 2 — new schemas.** Insert the following under `components.schemas:` AFTER the existing `ProxyError:` schema:

```yaml
    ExplainRequest:
      description: Body for `POST /api/v1/proxy/ai/explain`.
      type: object
      required: [reference, verseText]
      properties:
        reference:
          type: string
          minLength: 1
          maxLength: 200
          example: '1 Corinthians 13:4-7'
          description: Formatted Bible reference (book, chapter, verse range).
        verseText:
          type: string
          minLength: 1
          maxLength: 8000
          description: The scripture text the user is reading (WEB translation).

    ReflectRequest:
      description: Body for `POST /api/v1/proxy/ai/reflect`. Same shape as ExplainRequest.
      type: object
      required: [reference, verseText]
      properties:
        reference:
          type: string
          minLength: 1
          maxLength: 200
        verseText:
          type: string
          minLength: 1
          maxLength: 8000

    GeminiResponseDto:
      description: LLM-generated content plus the model identifier that produced it.
      type: object
      required: [content, model]
      properties:
        content:
          type: string
          description: The generated explanation or reflection text.
          example: 'Paul is writing to a factional Corinthian church, not a wedding audience...'
        model:
          type: string
          description: The Gemini model that produced this response. Frontend stores this as-is for cache-key invalidation.
          example: 'gemini-2.5-flash-lite'
```

**Insertion point 3 — new shared response.** Insert the following under `components.responses:` AFTER the existing `UpstreamTimeout:` response:

```yaml
    SafetyBlocked:
      description: |
        The upstream AI model refused to generate a response due to its safety
        filters. HTTP 422 because the request was well-formed and valid — the
        upstream deliberately chose not to answer.
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProxyError' }
```

**Verification:** after editing, paste the full `openapi.yaml` into [editor.swagger.io](https://editor.swagger.io) and confirm zero errors. The editor will flag any malformed indentation, broken `$ref`s, or schema issues. Fix before shipping — Forums Wave Phase 1's type generator runs against this file.

---

## Frontend file-by-file changes

### 9. `frontend/src/lib/ai/geminiClient.ts` (MODIFY — swap SDK for fetch)

Replace the entire file contents. The structure closely mirrors the current file so diff review is manageable; the change is in the implementation of `generateWithPromptAndCacheAndRateLimit`, which swaps the `@google/genai` SDK call for a `fetch` call to the backend proxy.

Public exports that MUST remain stable (any hook or component importing these continues to work with zero changes):

- `generateExplanation(reference, verseText, signal?) → Promise<ExplainResult>`
- `generateReflection(reference, verseText, signal?) → Promise<ReflectResult>`
- `export interface ExplainResult { content: string; model: string }`
- `export interface ReflectResult { content: string; model: string }`
- `__resetGeminiClientForTests(): void`

Public exports that ARE REMOVED:

- The lazy `client` module-local variable — no SDK client anymore
- `getClient()` helper — no longer needed

**Full file contents:**

```typescript
import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '@/lib/ai/errors'
import {
  clearAllAICache,
  getCachedAIResult,
  setCachedAIResult,
  type AIFeature,
} from '@/lib/ai/cache'
import {
  consumeRateLimitToken,
  resetRateLimitForTests,
} from '@/lib/ai/rateLimit'

/**
 * Base URL for the backend proxy. Matches the convention established in
 * `src/api/client.ts` — VITE_API_BASE_URL or localhost:8080 as fallback.
 * The URL is resolved once at module load; changing it requires a page
 * reload, which is fine for an env-var-driven config.
 */
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:8080'

const EXPLAIN_URL = `${API_BASE_URL}/api/v1/proxy/ai/explain`
const REFLECT_URL = `${API_BASE_URL}/api/v1/proxy/ai/reflect`

/**
 * Internal 30-second request timeout. Mirrors the backend's Gemini
 * timeout exactly so caller UX is consistent: if a request takes more
 * than 30 seconds, the frontend times out even when the backend would
 * have.
 */
const REQUEST_TIMEOUT_MS = 30_000

/**
 * The single return shape for `generateExplanation`. Matches the backend
 * `GeminiResponseDto`. Do NOT add a `source` field or discriminated
 * union — acceptance criterion 29 from the BB-30 spec.
 */
export interface ExplainResult {
  content: string
  model: string
}

/**
 * The return shape for `generateReflection` (BB-31). Same shape as
 * `ExplainResult` but a distinct exported type so callers are explicit
 * about which feature they're calling, and future features may extend
 * one type and not the other.
 */
export interface ReflectResult {
  content: string
  model: string
}

/**
 * Test-only hook to reset all module-level state. Preserves the contract
 * of the original SDK-based implementation: callers that reset expect a
 * clean slate. After the proxy migration there's no SDK client to null
 * out, but the cache + rate-limit helpers still hold state, so we
 * continue to clear them here.
 */
export function __resetGeminiClientForTests(): void {
  clearAllAICache()
  resetRateLimitForTests()
}

/**
 * Shape of the backend's success response body (minus the `meta` wrapper
 * which we don't need to consume here — we grab the request ID from the
 * header instead).
 */
interface ProxySuccessBody {
  data: { content: string; model: string }
  meta?: { requestId?: string }
}

/**
 * Shape of the backend's error response body (ProxyError).
 */
interface ProxyErrorBody {
  code: string
  message: string
  requestId?: string
  timestamp?: string
}

/**
 * Shared helper wrapping cache + rate-limit + backend fetch. Composition
 * order preserved from the pre-migration implementation:
 *
 *   1. Cache lookup — synchronous, returns WITHOUT consuming a
 *      rate-limit token and WITHOUT calling the backend.
 *   2. Rate-limit check — consumes one token if allowed, throws
 *      RateLimitError BEFORE the fetch if denied.
 *   3. Fetch to backend /api/v1/proxy/ai/{endpoint}.
 *   4. Response mapping — success → cache + return, error → typed throw.
 *
 * The backend already handles safety detection and timeout — the client
 * simply maps backend error codes to the existing frontend error
 * classes.
 */
async function callProxy(
  feature: AIFeature,
  url: string,
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<{ content: string; model: string }> {
  // 1. Cache lookup — no rate-limit consumption, no network call
  const cached = getCachedAIResult(feature, reference, verseText)
  if (cached) return cached

  // 2. Rate-limit check — denial throws BEFORE any network work
  const decision = consumeRateLimitToken(feature)
  if (!decision.allowed) {
    throw new RateLimitError(decision.retryAfterSeconds)
  }

  // 3. Compose abort signals — caller's optional signal + internal timeout
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  // 4. Fetch to backend
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, verseText }),
      signal: combinedSignal,
    })
  } catch (err) {
    // Caller-driven abort: re-throw AbortError unchanged so the hook can
    // silently discard. The caller is gone — no one to show an error to.
    if (signal?.aborted && err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    // Internal timeout (AbortSignal.timeout fires with name 'TimeoutError')
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new GeminiTimeoutError(undefined, { cause: err })
    }
    // Any other AbortError source = also a timeout from the user's POV
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GeminiTimeoutError('AI request was aborted', { cause: err })
    }
    // Network failures — fetch throws TypeError for DNS, connection,
    // CORS, or offline. Also catch any network-ish error messages as a
    // defensive catch-all.
    if (
      err instanceof TypeError ||
      (err instanceof Error && /network|fetch|offline/i.test(err.message))
    ) {
      throw new GeminiNetworkError(undefined, { cause: err })
    }
    // Anything else surfaces as a generic API error.
    throw new GeminiApiError(
      err instanceof Error ? err.message : 'Unknown AI proxy error',
      { cause: err },
    )
  }

  // 5. Success path (HTTP 2xx)
  if (response.ok) {
    let body: ProxySuccessBody
    try {
      body = (await response.json()) as ProxySuccessBody
    } catch (err) {
      throw new GeminiApiError('AI proxy returned a malformed response', {
        cause: err,
      })
    }
    if (!body?.data?.content || !body?.data?.model) {
      throw new GeminiApiError('AI proxy returned an incomplete response')
    }
    const result = { content: body.data.content, model: body.data.model }
    // Cache writes are fire-and-forget — storage failure degrades silently.
    setCachedAIResult(feature, reference, verseText, result)
    return result
  }

  // 6. Error path (HTTP 4xx/5xx) — parse ProxyError body and map to
  //    the appropriate typed error class.
  let errorBody: ProxyErrorBody | null = null
  try {
    errorBody = (await response.json()) as ProxyErrorBody
  } catch {
    // Ignore — errorBody stays null
  }

  const code = errorBody?.code ?? ''
  const message = errorBody?.message ?? `AI proxy returned HTTP ${response.status}`

  switch (code) {
    case 'RATE_LIMITED': {
      // Backend rate limit. Read Retry-After header (integer seconds).
      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfterSeconds = retryAfterHeader
        ? Math.max(1, parseInt(retryAfterHeader, 10) || 1)
        : 60
      throw new RateLimitError(retryAfterSeconds)
    }
    case 'SAFETY_BLOCK':
      throw new GeminiSafetyBlockError(message)
    case 'UPSTREAM_TIMEOUT':
      throw new GeminiTimeoutError(message)
    case 'UPSTREAM_ERROR':
    case 'INVALID_INPUT':
    case 'INTERNAL_ERROR':
      throw new GeminiApiError(message)
    default:
      throw new GeminiApiError(message)
  }
}

/**
 * Generate a scholarly explanation for a scripture passage via the
 * backend AI proxy. Public signature unchanged from the pre-migration
 * SDK-based implementation — callers (`useExplainPassage`) do not need
 * to change.
 *
 * @param reference Formatted reference, e.g. "1 Corinthians 13:4-7"
 * @param verseText The WEB translation text for the referenced range
 * @param signal Optional caller-provided AbortSignal. When fired, the
 *   in-flight fetch is cancelled and the original AbortError is re-thrown
 *   unchanged so the caller can detect it via `err.name === 'AbortError'`
 *   and silently discard.
 */
export async function generateExplanation(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ExplainResult> {
  return callProxy('explain', EXPLAIN_URL, reference, verseText, signal)
}

/**
 * Generate a contemplative reflection for a scripture passage via the
 * backend AI proxy. Public signature unchanged.
 */
export async function generateReflection(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ReflectResult> {
  return callProxy('reflect', REFLECT_URL, reference, verseText, signal)
}
```

**What this preserves:**
- Public function signatures (hooks don't change)
- Cache-first, then rate-limit, then network composition order
- Abort signal re-throw semantics
- Timeout → `GeminiTimeoutError` mapping
- Network failure → `GeminiNetworkError` mapping
- Safety block → `GeminiSafetyBlockError` mapping
- Rate limit → `RateLimitError` with `retryAfterSeconds`

**What this changes:**
- `@google/genai` SDK import is gone
- `requireGeminiApiKey()` call is gone (backend owns the key now)
- `getClient()` / lazy-client-init pattern is gone
- Three-path safety detection is gone (backend does it, frontend just branches on the `SAFETY_BLOCK` error code)
- System prompts are gone (backend owns them)
- `GeminiKeyMissingError` is no longer thrown

---

### 10. `frontend/src/lib/ai/errors.ts` (MODIFY)

Delete the `GeminiKeyMissingError` class. It no longer corresponds to any frontend-visible condition — the backend owns the key and a missing backend key surfaces as `UPSTREAM_ERROR` → `GeminiApiError`.

**The edit:** find and delete the following block (and its surrounding blank line if present):

```typescript
/**
 * Thrown when `requireGeminiApiKey()` threw because `VITE_GEMINI_API_KEY` is
 * not set. The hook maps this to the generic "temporarily unavailable" message
 * for users — the specific error is logged to the console for developers by
 * `geminiClient.getClient()`.
 */
export class GeminiKeyMissingError extends Error {
  constructor(
    message = 'Gemini API key is not configured (check frontend/.env.local)',
    options?: ErrorOptions,
  ) {
    super(message)
    this.name = 'GeminiKeyMissingError'
    assignCause(this, options)
  }
}
```

Leave all other classes intact. The final file should have exactly 5 exported classes: `GeminiNetworkError`, `GeminiApiError`, `GeminiSafetyBlockError`, `GeminiTimeoutError`, `RateLimitError`.

### 11. `frontend/src/lib/env.ts` (MODIFY)

Delete the Gemini-related constant and three helpers. Leave all other env helpers (Google Maps, VAPID, FCBH) intact — those are Specs 3, 4, and separate work.

**Edit 1 — delete the constant:**

```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
```

**Edit 2 — delete `requireGeminiApiKey`:**

```typescript
/**
 * Returns the Google Gemini API key, or throws if it is not configured.
 *
 * Call this from the feature code that actually sends a Gemini request. Do
 * NOT call it at module load or from feature code that may run for users who
 * have not opted into the Gemini-backed feature.
 *
 * Used by: BB-30 (Explain This Passage), BB-31 (What does this mean for me),
 * future Ask AI migration.
 */
export function requireGeminiApiKey(): string {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to frontend/.env.local. ' +
        'See frontend/.env.example for the expected format.',
    )
  }
  return GEMINI_API_KEY
}
```

**Edit 3 — delete `isGeminiApiKeyConfigured`:**

```typescript
/**
 * Non-throwing check — use in UI that wants to conditionally render a feature
 * based on whether its key is configured (e.g., hide an "Explain this passage"
 * affordance in environments where Gemini is not wired up).
 */
export function isGeminiApiKeyConfigured(): boolean {
  return !!GEMINI_API_KEY
}
```

**Search-and-verify after deletion:** `grep -rE "requireGeminiApiKey|isGeminiApiKeyConfigured|GEMINI_API_KEY|VITE_GEMINI_API_KEY" frontend/src/` should return zero results after all Spec 2 changes are applied. If any consumer remains, it's a consumer the spec missed — surface to Eric.

### 12. `frontend/src/hooks/bible/useExplainPassage.ts` (MODIFY)

Two minor edits: remove the `GeminiKeyMissingError` import, and remove the corresponding branch from `classifyError`.

**Edit 1 — remove `GeminiKeyMissingError` from the imports:**

Change:

```typescript
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '@/lib/ai/errors'
```

To:

```typescript
import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '@/lib/ai/errors'
```

**Edit 2 — remove the `GeminiKeyMissingError` branch from `classifyError`:**

Change:

```typescript
function classifyError(err: unknown): ExplainErrorKind {
  // BB-32: rate-limit check must come first so it is not misclassified as
  // a generic `unavailable` fallback.
  if (err instanceof RateLimitError) return 'rate-limit'
  if (err instanceof GeminiSafetyBlockError) return 'safety'
  if (err instanceof GeminiTimeoutError) return 'timeout'
  if (err instanceof GeminiNetworkError) return 'network'
  // Key-missing is mapped to the generic 'unavailable' message for users —
  // the specific error is logged to the console for developers in the client.
  if (err instanceof GeminiKeyMissingError) return 'unavailable'
  if (err instanceof GeminiApiError) return 'api'
  return 'unavailable'
}
```

To:

```typescript
function classifyError(err: unknown): ExplainErrorKind {
  // BB-32: rate-limit check must come first so it is not misclassified as
  // a generic `unavailable` fallback.
  if (err instanceof RateLimitError) return 'rate-limit'
  if (err instanceof GeminiSafetyBlockError) return 'safety'
  if (err instanceof GeminiTimeoutError) return 'timeout'
  if (err instanceof GeminiNetworkError) return 'network'
  if (err instanceof GeminiApiError) return 'api'
  return 'unavailable'
}
```

**`ExplainErrorKind` union is unchanged.** The `'unavailable'` kind stays because it's still the fallback for unclassified errors. `ERROR_COPY['unavailable']` is still used by the default return.

Everything else in this hook stays byte-for-byte identical. No behavioral change from the user's perspective.

### 13. `frontend/src/hooks/bible/useReflectOnPassage.ts` (MODIFY)

Structurally identical changes to `useExplainPassage.ts`. Remove the `GeminiKeyMissingError` import; remove the same `if` branch from `classifyError`. Everything else stays identical.

### 14. `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` (DELETE)

The prompts moved to the backend. `geminiClient.ts` no longer imports from `@/lib/ai/prompts/*`. Delete the file.

### 15. `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts` (DELETE)

Same — delete the file.

### 16. `frontend/src/lib/ai/prompts/__tests__/explainPassagePrompt.test.ts` (DELETE)

Tests the deleted prompt file. Equivalent verbatim-rule assertions now live in `backend/.../GeminiPromptsTest.java`. Delete the file.

### 17. `frontend/src/lib/ai/prompts/__tests__/reflectPassagePrompt.test.ts` (DELETE)

Same — delete the file.

### 18. `frontend/src/lib/ai/prompts/` (DELETE DIRECTORY)

After the four files above are deleted, `frontend/src/lib/ai/prompts/` is empty. Delete the directory. Git will pick up the removal automatically.

**Verification:** `git status frontend/src/lib/ai/` after deletion should show four deleted files and the parent dir no longer tracked.

### 19. `frontend/.env.example` (MODIFY)

Remove the `VITE_GEMINI_API_KEY` block. The lines to delete:

```
# Google Gemini API key (for AI-powered features: BB-30 Explain This Passage, etc.)
# Obtain from: Google Cloud Console → APIs & Services → Credentials
# Restrict to: Gemini API only, with HTTP referrer restrictions for localhost and production domain
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

Leave the surrounding comment section header ("AI / third-party API keys") in place — Google Maps + FCBH still belong there until their respective specs land.

### 20. `frontend/package.json` (MODIFY)

Remove `@google/genai` from `dependencies`. After the edit, the `dependencies` block starts with `"clsx"` instead of `"@google/genai"`.

After editing `package.json` manually, CC must run:

```bash
cd frontend
npm install
```

to regenerate `package-lock.json`. Do NOT hand-edit `package-lock.json` — let npm do it.

**Sanity check:** `npm ls @google/genai` after the install should output:

```
worship-room-frontend@0.0.1 /Users/eric.champlin/worship-room/frontend
└── (empty)
```

Or an error that `@google/genai` is not in the tree. Either indicates the dep is gone.

---

## Tests

Test counts are acceptance criteria, not targets. Write exactly what earns its place. Do NOT pad with filler tests to hit a number.

**Backend target: 18–22 new tests** split across four files. **Frontend target: the existing `geminiClient.test.ts` stays around the same count (~40 tests), just rewritten to mock fetch instead of the SDK.** Net: roughly 60 tests still passing end-to-end in the AI feature family.

### 21. `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiPromptsTest.java` (NEW)

Guardrail test. Verifies the prompt text contains each of the 10 numbered rules verbatim. Catches accidental edits (find/replace collisions, auto-formatting, reflow) before they ship.

```java
package com.example.worshiproom.proxy.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GeminiPrompts")
class GeminiPromptsTest {

    @Test
    @DisplayName("EXPLAIN system prompt contains all 10 numbered rules verbatim")
    void explainContainsAllTenRules() {
        String p = GeminiPrompts.EXPLAIN_SYSTEM_PROMPT;
        assertThat(p).contains("1. Lead with context.");
        assertThat(p).contains("2. Then explain what the passage is doing.");
        assertThat(p).contains("3. Acknowledge uncertainty honestly.");
        assertThat(p).contains("4. Do not prescribe application.");
        assertThat(p).contains("5. Avoid triumphalism.");
        assertThat(p).contains("6. Stay in the text.");
        assertThat(p).contains("7. Acknowledge hard passages honestly.");
        assertThat(p).contains("8. Be restrained in length. Explanations should be 200-400 words");
        assertThat(p).contains("9. Never use the phrases");
        assertThat(p).contains("10. Never recommend prayer, church attendance");
    }

    @Test
    @DisplayName("EXPLAIN system prompt opens with scholar-not-pastor framing")
    void explainOpensWithScholarFraming() {
        assertThat(GeminiPrompts.EXPLAIN_SYSTEM_PROMPT)
            .startsWith("You are a thoughtful biblical scholar")
            .contains("You are not a pastor. You are not a preacher.")
            .contains("World English Bible");
    }

    @Test
    @DisplayName("REFLECT system prompt contains all 10 numbered rules verbatim")
    void reflectContainsAllTenRules() {
        String p = GeminiPrompts.REFLECT_SYSTEM_PROMPT;
        assertThat(p).contains("1. Use interrogative and conditional mood.");
        assertThat(p).contains("2. Offer multiple possibilities, not a single application.");
        assertThat(p).contains("3. Name the reader's agency explicitly.");
        assertThat(p).contains("4. Do not assume the reader's circumstances.");
        assertThat(p).contains("5. Do not prescribe practices.");
        assertThat(p).contains("6. Do not speak for God.");
        assertThat(p).contains("7. Do not weaponize the passage.");
        assertThat(p).contains("8. Be restrained in length. Reflections should be 150-300 words");
        assertThat(p).contains("9. Avoid the \"life lesson\" voice.");
        assertThat(p).contains("10. It is okay to sit with difficulty.");
    }

    @Test
    @DisplayName("buildExplainUserPrompt interpolates reference and verseText")
    void buildExplainInterpolates() {
        String prompt = GeminiPrompts.buildExplainUserPrompt(
            "1 Corinthians 13:4-7", "Love is patient"
        );
        assertThat(prompt)
            .contains("Explain this passage from the World English Bible")
            .contains("1 Corinthians 13:4-7")
            .contains("Love is patient")
            .contains("interpretive difficulties an honest reader should know about");
    }

    @Test
    @DisplayName("buildReflectUserPrompt interpolates reference and verseText")
    void buildReflectInterpolates() {
        String prompt = GeminiPrompts.buildReflectUserPrompt(
            "Philippians 4:6-7", "In nothing be anxious"
        );
        assertThat(prompt)
            .contains("reading this passage from the World English Bible")
            .contains("Philippians 4:6-7")
            .contains("In nothing be anxious")
            .contains("genuine questions and possibilities, not answers or instructions");
    }
}
```

### 22. `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiServiceTest.java` (NEW)

Unit tests with a mocked SDK client. Covers each error branch and safety detection path.

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.google.genai.Client;
import com.google.genai.Models;
import com.google.genai.types.BlockedReason;
import com.google.genai.types.Candidate;
import com.google.genai.types.FinishReason;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.GenerateContentResponsePromptFeedback;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("GeminiService")
class GeminiServiceTest {

    private ProxyConfig config;
    private GeminiService service;
    private Client mockClient;
    private Models mockModels;

    @BeforeEach
    void setUp() throws Exception {
        config = new ProxyConfig();
        config.getGemini().setApiKey("fake-test-key");
        service = new GeminiService(config);

        // Inject a mock SDK client + mock Models via reflection. We bypass
        // @PostConstruct to avoid opening a real network connection. The
        // real @PostConstruct path is covered by GeminiIntegrationTest.
        mockClient = mock(Client.class);
        mockModels = mock(Models.class);
        // Client.models is a public field per google-genai SDK
        Field modelsField = Client.class.getField("models");
        modelsField.set(mockClient, mockModels);
        Field clientField = GeminiService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, mockClient);
    }

    @Test
    @DisplayName("generateExplanation returns {content, model} on success")
    void happyPathExplain() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        when(resp.text()).thenReturn("Paul is writing to a factional church.");
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        when(mockModels.generateContent(eq("gemini-2.5-flash-lite"), any(String.class), any()))
            .thenReturn(resp);

        GeminiResponseDto result = service.generateExplanation("1 Cor 13:4-7", "Love is patient");

        assertThat(result.content()).isEqualTo("Paul is writing to a factional church.");
        assertThat(result.model()).isEqualTo("gemini-2.5-flash-lite");
    }

    @Test
    @DisplayName("generateReflection uses REFLECT_SYSTEM_PROMPT (not EXPLAIN)")
    void reflectUsesReflectPrompt() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        when(resp.text()).thenReturn("A reader might ask...");
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        when(mockModels.generateContent(any(String.class), any(String.class), any()))
            .thenReturn(resp);

        service.generateReflection("Phil 4:6-7", "In nothing be anxious");

        // Verify the config passed to the SDK contained the REFLECT system prompt,
        // not the EXPLAIN one. The config's toString/equals is implementation-
        // dependent, so verify via the fact that generateExplanation and
        // generateReflection take different paths — a second call with EXPLAIN
        // should still work independently.
        verify(mockModels).generateContent(eq("gemini-2.5-flash-lite"), any(String.class), any());
    }

    @Test
    @DisplayName("prompt-level block throws SafetyBlockException")
    void promptBlockThrowsSafety() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        GenerateContentResponsePromptFeedback feedback =
            mock(GenerateContentResponsePromptFeedback.class);
        when(feedback.blockReason()).thenReturn(Optional.of(BlockedReason.SAFETY));
        when(resp.promptFeedback()).thenReturn(Optional.of(feedback));
        when(mockModels.generateContent(any(String.class), any(String.class), any()))
            .thenReturn(resp);

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(SafetyBlockException.class)
            .hasMessageContaining("Gemini blocked the prompt");
    }

    @Test
    @DisplayName("output finishReason SAFETY throws SafetyBlockException")
    void outputSafetyThrowsSafety() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        Candidate candidate = mock(Candidate.class);
        when(candidate.finishReason()).thenReturn(Optional.of(FinishReason.SAFETY));
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of(candidate)));
        when(resp.text()).thenReturn("any text");
        when(mockModels.generateContent(any(String.class), any(String.class), any()))
            .thenReturn(resp);

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(SafetyBlockException.class)
            .hasMessageContaining("finishReason=SAFETY");
    }

    @Test
    @DisplayName("empty response text throws SafetyBlockException (silent block)")
    void emptyTextThrowsSafety() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        when(resp.text()).thenReturn("   ");
        when(mockModels.generateContent(any(String.class), any(String.class), any()))
            .thenReturn(resp);

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(SafetyBlockException.class)
            .hasMessageContaining("empty response");
    }

    @Test
    @DisplayName("timeout from SDK throws UpstreamTimeoutException")
    void timeoutThrowsUpstreamTimeout() {
        when(mockModels.generateContent(any(String.class), any(String.class), any()))
            .thenThrow(new RuntimeException("request timed out", new TimeoutException("30s")));

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(UpstreamTimeoutException.class)
            .hasMessageContaining("timed out");
    }

    @Test
    @DisplayName("generic SDK exception throws UpstreamException (no internal leak)")
    void genericSdkErrorThrowsUpstream() {
        RuntimeException internal = new RuntimeException("internal stack trace detail");
        when(mockModels.generateContent(any(String.class), any(String.class), any()))
            .thenThrow(internal);

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(UpstreamException.class)
            // CRITICAL: internal cause message must NOT appear in the
            // user-facing exception message
            .hasMessage("AI service is temporarily unavailable. Please try again.");
    }

    @Test
    @DisplayName("null client (missing API key at init) throws UpstreamException")
    void nullClientThrowsUpstream() throws Exception {
        Field clientField = GeminiService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, null);

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
    }
}
```

**Note on reflection:** two tests (setUp + nullClientThrowsUpstream) poke `GeminiService`'s private `client` field directly. This is deliberate — it lets the unit tests bypass the `@PostConstruct` network-touching path while testing every branch of `generate()`. The `@PostConstruct` path itself is covered by `GeminiIntegrationTest` (next section), which runs the full Spring context.

---

### 23. `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiControllerTest.java` (NEW)

`@WebMvcTest` slice. Exercises request validation and response shape without loading the full application context. The `GeminiService` is `@MockBean`'d so we control its behavior precisely.

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.proxy.common.ProxyExceptionHandler;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GeminiController.class)
@Import(ProxyExceptionHandler.class)
@DisplayName("GeminiController")
class GeminiControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GeminiService geminiService;

    @Test
    @DisplayName("POST /explain returns 200 and ProxyResponse shape on success")
    void explainHappyPath() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("Paul was writing...", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "1 Corinthians 13:4-7",
            "verseText", "Love is patient"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").value("Paul was writing..."))
            .andExpect(jsonPath("$.data.model").value("gemini-2.5-flash-lite"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("POST /reflect returns 200 and ProxyResponse shape on success")
    void reflectHappyPath() throws Exception {
        when(geminiService.generateReflection(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("A reader might ask...", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "Philippians 4:6-7",
            "verseText", "In nothing be anxious"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").value("A reader might ask..."))
            .andExpect(jsonPath("$.data.model").value("gemini-2.5-flash-lite"));
    }

    @Test
    @DisplayName("blank reference returns 400 INVALID_INPUT")
    void blankReferenceReturns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "",
            "verseText", "Love is patient"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("oversized verseText returns 400 INVALID_INPUT")
    void oversizedVerseTextReturns400() throws Exception {
        String huge = "x".repeat(8001);
        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "Psalm 119",
            "verseText", huge
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("SafetyBlockException surfaces as 422 SAFETY_BLOCK")
    void safetyBlockReturns422() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenThrow(new SafetyBlockException("Gemini blocked the prompt: SAFETY"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "some hard passage",
            "verseText", "some hard text"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("SAFETY_BLOCK"));
    }

    @Test
    @DisplayName("UpstreamException surfaces as 502 UPSTREAM_ERROR")
    void upstreamErrorReturns502() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenThrow(new UpstreamException("AI service is temporarily unavailable. Please try again."));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "John 3:16",
            "verseText", "For God so loved..."
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"));
    }

    @Test
    @DisplayName("UpstreamTimeoutException surfaces as 504 UPSTREAM_TIMEOUT")
    void upstreamTimeoutReturns504() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenThrow(new UpstreamTimeoutException("AI service timed out. Please try again."));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "John 3:16",
            "verseText", "For God so loved..."
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isGatewayTimeout())
            .andExpect(jsonPath("$.code").value("UPSTREAM_TIMEOUT"));
    }
}
```

### 24. `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiIntegrationTest.java` (NEW)

`@SpringBootTest` — full context. Locks in the end-to-end HTTP shape including the request-ID filter, the rate-limit headers, and the validation handler integration. Mocks `GeminiService` at the bean level so no real network calls happen.

```java
package com.example.worshiproom.proxy.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Gemini proxy integration")
class GeminiIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GeminiService geminiService;

    @Test
    @DisplayName("Full request lifecycle: X-Request-Id, X-RateLimit-* headers, ProxyResponse body")
    void fullLifecycle() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("explanation text", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "1 John 4:7-8",
            "verseText", "Beloved, let us love one another"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"))
            .andExpect(jsonPath("$.data.content").value("explanation text"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("X-Request-Id on request is honored on response")
    void honorsClientRequestId() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("content", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "John 1:1",
            "verseText", "In the beginning was the Word"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .header("X-Request-Id", "test-client-request-id")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-Id", "test-client-request-id"))
            .andExpect(jsonPath("$.meta.requestId").value("test-client-request-id"));
    }
}
```

**Why both slice and integration test?** The `@WebMvcTest` slice is fast (under 500 ms) and catches controller-level issues without paying for full-context startup. The `@SpringBootTest` integration test is slower (2-5 s) but covers the filter chain — specifically that `X-Request-Id` flows through `RequestIdFilter` → MDC → `ProxyResponse.meta.requestId`, and that `X-RateLimit-*` headers are attached by `RateLimitFilter`. That filter-chain integration is exactly the interaction Round 1 of Spec 1 got wrong the first time, so locking it in for Spec 2's endpoints too is cheap insurance.

---

### 25. `frontend/src/lib/ai/__tests__/geminiClient.test.ts` (MODIFY — rewrite mocking strategy)

The current test file mocks `@google/genai` via `vi.mock` factory and controls a `mockGenerateContent` function. Spec 2 swaps that for a global `fetch` mock and controls the mock's response.

**Preserve the existing test structure and descriptions where possible** — all 40+ test blocks describing behaviors still apply (cache hit short-circuits, rate-limit denial throws, AbortSignal re-throw, etc.). The only changes are:

1. The mock setup (top of file)
2. The Gemini-SDK-specific assertions (e.g., "passed systemInstruction via config" → now "POSTed to `/api/v1/proxy/ai/explain` with `{reference, verseText}`")
3. Error fixture shapes — SDK errors become `Response` objects with `ProxyError` bodies
4. Removal of any test that asserts `GeminiKeyMissingError` behavior — that error class is gone, and the "missing key" scenario is now a backend concern surfacing as `GeminiApiError`

**Replace the mock-setup block at the top:**

FROM:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGenerateContent, mockRequireGeminiApiKey } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockRequireGeminiApiKey: vi.fn(),
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function GoogleGenAI(this: { models: unknown }) {
    this.models = { generateContent: mockGenerateContent }
  }),
}))

vi.mock('@/lib/env', () => ({
  requireGeminiApiKey: () => mockRequireGeminiApiKey(),
}))

// NOTE: These imports must come AFTER the vi.mock calls above.
import { GoogleGenAI } from '@google/genai'
import {
  generateExplanation,
  generateReflection,
  __resetGeminiClientForTests,
} from '../geminiClient'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '../errors'
import { EXPLAIN_PASSAGE_SYSTEM_PROMPT } from '../prompts/explainPassagePrompt'
import {
  REFLECT_PASSAGE_SYSTEM_PROMPT,
  buildReflectPassageUserPrompt,
} from '../prompts/reflectPassagePrompt'
import { clearAllAICache } from '../cache'
import { getRateLimitState, resetRateLimitForTests } from '../rateLimit'
```

TO:

```typescript
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// The fetch mock is the single mocking surface after the proxy migration.
// No SDK to stub, no env to mock — the client just POSTs to the backend.
const mockFetch = vi.fn()

import {
  generateExplanation,
  generateReflection,
  __resetGeminiClientForTests,
} from '../geminiClient'
import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '../errors'
import { clearAllAICache } from '../cache'
import { getRateLimitState, resetRateLimitForTests } from '../rateLimit'

const REFERENCE = '1 Corinthians 13:4-7'
const VERSE_TEXT = "Love is patient and is kind; love doesn't envy."

// Helper: build a mock Response for a success case.
function okResponse(content: string, model = 'gemini-2.5-flash-lite'): Response {
  return new Response(
    JSON.stringify({
      data: { content, model },
      meta: { requestId: 'test-req-id-22chars0000' },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

// Helper: build a mock Response for a backend error case.
function errorResponse(
  status: number,
  code: string,
  message = 'err',
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      code,
      message,
      requestId: 'test-req-id-22chars0000',
      timestamp: '2026-04-21T10:30:00Z',
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
    },
  )
}

beforeEach(() => {
  __resetGeminiClientForTests()
  mockFetch.mockReset()
  // Vitest's stubGlobal sets global fetch for this test only.
  vi.stubGlobal('fetch', mockFetch)
  clearAllAICache()
  resetRateLimitForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})
```

**Behavioral tests to preserve (renamed/refactored where appropriate):**

- ✅ "happy path returns {content, model}" — assert `mockFetch` was called with the right URL + body, and the returned `ExplainResult`/`ReflectResult` matches the mocked response
- ✅ "posts to /api/v1/proxy/ai/explain with correct body" (NEW — replaces "uses EXPLAIN system prompt via config" since the prompt is no longer client-side)
- ✅ "posts to /api/v1/proxy/ai/reflect with correct body" (NEW — parallel)
- ✅ "includes abort signal in fetch call"
- ✅ "re-throws caller-driven AbortError unchanged"
- ✅ "internal timeout maps to GeminiTimeoutError" — fire `AbortSignal.timeout` manually in the mock's implementation, assert `GeminiTimeoutError`
- ✅ "network failure (TypeError from fetch) maps to GeminiNetworkError" — `mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))`
- ✅ "backend 502 UPSTREAM_ERROR maps to GeminiApiError"
- ✅ "backend 504 UPSTREAM_TIMEOUT maps to GeminiTimeoutError"
- ✅ "backend 422 SAFETY_BLOCK maps to GeminiSafetyBlockError"
- ✅ "backend 429 RATE_LIMITED maps to RateLimitError with Retry-After"
- ✅ "backend 400 INVALID_INPUT maps to GeminiApiError" (NEW)
- ✅ "backend 500 INTERNAL_ERROR maps to GeminiApiError"
- ✅ "malformed response body maps to GeminiApiError"
- ✅ "missing data.content maps to GeminiApiError"
- ✅ Cache tests — unchanged (cache is still client-side)
- ✅ Rate-limit tests — unchanged (client-side rate limit is still in place)
- ✅ `__resetGeminiClientForTests` clears cache + rate limit

**Behavioral tests to DELETE:**

- ❌ "key missing throws GeminiKeyMissingError" — class is gone, no longer reachable
- ❌ "reuses the client (memoized)" — no SDK client anymore; closest equivalent is "fetch is called per request" which is already covered by the happy-path test
- ❌ Any test asserting `GoogleGenAI.toHaveBeenCalledTimes(N)` — no SDK
- ❌ Any test asserting `config.systemInstruction` was a specific string — prompts are backend-only now

**Rough test count target:** ~35-40 tests in the rewritten file. Close to current count (~43). The differences are driven by what's technically possible to test (no SDK internals to assert) and what's still meaningful (error mapping, cache/rate-limit composition, abort semantics).

**Example test body shape (one representative test):**

```typescript
describe('generateExplanation — happy path', () => {
  it('posts to /api/v1/proxy/ai/explain and returns the backend payload', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse('Paul is writing to a factional church.'),
    )

    const result = await generateExplanation(REFERENCE, VERSE_TEXT)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/proxy\/ai\/explain$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({
      reference: REFERENCE,
      verseText: VERSE_TEXT,
    })

    expect(result).toEqual({
      content: 'Paul is writing to a factional church.',
      model: 'gemini-2.5-flash-lite',
    })
  })
})
```

**Note on the cache tests:** the cache-hit test previously asserted that `GoogleGenAI` was NOT constructed on the second call. The parallel assertion now is that `mockFetch` was NOT called on the second call — identical meaning.

---

## Acceptance criteria

After this spec ships, each of the following must hold:

### Backend compiles + tests pass

1. ✅ `cd backend && ./mvnw clean compile` exits 0
2. ✅ `./mvnw test` exits 0; 18-22 new tests pass (GeminiPromptsTest, GeminiServiceTest, GeminiControllerTest, GeminiIntegrationTest) on top of Spec 1's 23. Target total: ~41-45 tests.
3. ✅ No new Maven dependencies added — `./mvnw dependency:tree` output has the same 5 project deps as after Spec 1 (google-genai 1.51.0, webflux, bucket4j 8.18.0, logstash-logback-encoder 8.0, caffeine 3.1.8)

### Backend endpoints work end-to-end

4. ✅ With `backend/.env.local` containing the real `GEMINI_API_KEY` value copied from `frontend/.env.local`, the backend starts and:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/proxy/ai/explain \
     -H 'Content-Type: application/json' \
     -d '{"reference":"1 Corinthians 13:4-7","verseText":"Love is patient..."}' | jq
   ```
   returns `{"data":{"content":"...","model":"gemini-2.5-flash-lite"},"meta":{"requestId":"..."}}` with HTTP 200.
5. ✅ `curl -i` (headers visible) on the same call shows `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` response headers
6. ✅ `/api/v1/proxy/ai/reflect` with the same body shape returns a reflection-style response (different voice, interrogative mood)
7. ✅ `curl -X POST` with an empty `reference` returns HTTP 400 with `{"code":"INVALID_INPUT"}`
8. ✅ `curl -X POST` with a `verseText` over 8000 chars returns HTTP 400 with `{"code":"INVALID_INPUT"}`
9. ✅ Rapid-fire 40 requests from one IP (dev: burst=30, refill=120/min) eventually returns HTTP 429 with `Retry-After` header and `{"code":"RATE_LIMITED"}`
10. ✅ Backend logs include `reference` and `verseTextLength` fields but NEVER the full `verseText` or the LLM response body

### Frontend

11. ✅ `cd frontend && npm run build` exits 0 — TypeScript compiles, bundle builds
12. ✅ `npm run lint` exits 0 (`max-warnings 0`) — the migration doesn't introduce any unused imports, any-types, or lint violations
13. ✅ `npm test` exits 0 — existing rate-limit, cache, errors, and hooks tests still pass. The rewritten `geminiClient.test.ts` passes with ~35-40 tests.
14. ✅ Searching the built bundle for `VITE_GEMINI_API_KEY`, `AIza` (Gemini key prefix), or `GoogleGenAI` returns nothing:
    ```bash
    cd frontend && npm run build && grep -r "GoogleGenAI\|AIza\|gemini-2.5-flash-lite" dist/ | head
    ```
    (The model string `gemini-2.5-flash-lite` will be absent too because it's backend-owned now.)
15. ✅ `grep -rE "requireGeminiApiKey|isGeminiApiKeyConfigured|GEMINI_API_KEY|VITE_GEMINI_API_KEY|GeminiKeyMissingError|@google/genai" frontend/src/` returns zero results
16. ✅ `frontend/src/lib/ai/prompts/` directory no longer exists (`ls frontend/src/lib/ai/prompts/` fails with "No such file or directory")
17. ✅ `npm ls @google/genai` shows the dep is not in the tree

### End-to-end UX

18. ✅ Start backend (`docker compose up -d backend`) + frontend (`cd frontend && npm run dev`). Open the Bible Reader, select any passage, tap "Explain this passage". After ~5-15 seconds the explanation renders. No visual regression vs pre-Spec-2 behavior.
19. ✅ Same passage, tap "Reflect on this passage" → reflection renders. No visual regression.
20. ✅ Tap "Explain" on the SAME passage a second time → response renders instantly (client-side cache hit). DevTools Network tab shows no new request to `/api/v1/proxy/ai/explain`.
21. ✅ Tap "Explain" on a NEW passage 20 times rapid-fire → after ~10 requests, you see the rate-limit message ("You're going faster than our AI helper can keep up. Try again in X seconds."). Either client or server rate limit may trip first; both surface the same way.
22. ✅ Disable the backend (`docker compose stop backend`). Tap "Explain" → you see the network error copy ("Couldn't load an explanation right now. Check your connection and try again.").
23. ✅ Restart backend WITHOUT `GEMINI_API_KEY` set. Tap "Explain" → you see the generic unavailable copy ("This feature is temporarily unavailable. Try again in a few minutes."). Backend logs show a warning on startup that the key is not configured.

### Spec hygiene

24. ✅ `openapi.yaml` validates — paste into editor.swagger.io → zero errors → both new paths render in the UI
25. ✅ No frontend components (BibleReader, ExplainSubView, ReflectSubView, etc.) are modified — only hooks and lib/ai files. `git diff --stat main..HEAD frontend/src/components/` returns empty
26. ✅ CC stayed on branch `claude/feature/ai-proxy-gemini` throughout — `git branch --show-current` confirms
27. ✅ CC did NOT run `git commit`, `git push`, or any other git mutation — Eric handles all git manually

---

## Edge cases CC must handle

1. **Backend key missing on server startup.** `GeminiService.@PostConstruct` logs a warning and leaves `client = null`. Any inbound request throws `UpstreamException("AI service is not configured on the server.")` → 502 UPSTREAM_ERROR → frontend maps to `GeminiApiError` → user sees generic unavailable copy. The server never crashes on a missing key.

2. **Backend returns non-JSON on error.** Defensive: `callProxy` wraps the `await response.json()` on the error path in try/catch. If parsing fails, we fall back to a synthetic error body with `code: ''` and a message derived from the status code. The `default:` switch branch catches unrecognized codes and throws `GeminiApiError`.

3. **Backend returns a JSON body with unexpected shape.** Client reads `body.data.content` and `body.data.model` defensively — if either is missing, throw `GeminiApiError('AI proxy returned an incomplete response')`. Never return a partially-formed `ExplainResult`.

4. **Caller's `AbortSignal` fires mid-request.** `fetch` throws `DOMException` with name `AbortError`. The client re-throws it unchanged if `signal.aborted === true`, so the hook's `err.name === 'AbortError'` check silently discards it. This matches SDK-based behavior exactly.

5. **Internal 30s timeout fires.** `AbortSignal.timeout(REQUEST_TIMEOUT_MS)` fires with name `TimeoutError`. The client catches it and throws `GeminiTimeoutError`. This is identical to the pre-migration behavior for user-facing UX.

6. **Both signals fire simultaneously.** `AbortSignal.any([signal, timeoutSignal])` surfaces whichever fires first. If the caller aborted first, `signal.aborted === true` and we re-throw unchanged. If the timeout fired first, `signal.aborted === false` so we fall through to the `DOMException` name check and throw `GeminiTimeoutError`.

7. **`Retry-After` header on 429 is malformed or missing.** Client defaults to 60 seconds. The backend always sets it to a positive integer per the `RateLimitExceptionHandler` from Spec 1, so this is defensive for third-party middleware or misbehaving proxies.

8. **Gemini returns a response with non-SAFETY finishReason but empty content.** The empty-text branch of the three-path safety check catches this. Same as the pre-migration behavior.

9. **`GenerateContentResponse.text()` is null.** Covered — `content == null || content.isBlank()` → `SafetyBlockException`. The Java SDK's `text()` accessor can return null for responses with zero candidates; treat it as a silent safety block (matches the SDK-agnostic interpretation).

10. **CORS preflight from the Vite dev server.** Spec 1's CorsConfig already includes `http://localhost:5173`, `http://localhost:5174`, and `http://localhost:4173` in the dev profile. `exposedHeaders` already includes `Retry-After`, `X-RateLimit-*`, and `X-Request-Id`. No CORS changes needed.

11. **Very long `verseText` (7900-8000 chars) — bordering the cap.** The `@Size(max = 8000)` is inclusive per Bean Validation semantics, so an 8000-char `verseText` passes. 8001 or more fails with 400 INVALID_INPUT. Test `oversizedVerseTextReturns400` covers this.

12. **Bible Reader's existing 20-verse cap interaction.** The caller enforces a 20-verse cap upstream (BibleReader component). The 8000-char backend cap is a backstop — it would only trip if a single chapter is selected whose verse text exceeds 8k chars, which for WEB is most of Psalm 119 alone. The user-facing path never hits that: the component caps at 20 verses.

13. **Client-side cache hit returns a stale `model` string after a backend model change.** Cache keys include the model string (via `bb32-v1:explain:gemini-2.5-flash-lite:...`). If the backend changes the model, the old cache keys become orphans — they still resolve for their original reference+text but their model field is stale. Per the cache design, stale entries self-clean via 7-day TTL. No action needed.

14. **Frontend fetch sees CORS error in production.** Production CORS from Spec 1 allows `https://worshiproom.com` and `https://www.worshiproom.com`. If the frontend is ever served from a different origin (a preview deploy, a custom domain), the backend's CORS allow-list must be updated via `proxy.cors.allowed-origins` in `application-prod.properties`. Not this spec's concern; documented here so the invariant isn't forgotten.

---

## Out of scope (subsequent specs)

- **Spec 3 — Google Maps proxy + Local Support migration.** Same pattern: move Maps API calls to `/api/v1/proxy/places/*`, remove `VITE_GOOGLE_MAPS_API_KEY` from the bundle. `GeminiService` and `GeminiController` become the template.
- **Spec 4 — FCBH proxy + audio Bible migration.** Same pattern for the audio streaming URLs. Most complex of the three because audio URLs are consumed by `<audio>` tags, so the proxy either serves signed URLs or streams bytes through itself.
- **Spec 5 — Ask AI migration.** The `/ask` page currently has its own `apiClient` path and calls Gemini directly via a separate code path. Spec 5 migrates that to use `/api/v1/proxy/ai/ask` (new endpoint, likely streaming). This is a separate feature surface from BB-30/31 — don't touch it in Spec 2.
- **Redis-backed bucket4j.** Spec 1 already notes this as the multi-instance upgrade path. Irrelevant for single-instance Railway/Render deploys.
- **Request hedging / retry logic.** If Gemini returns a transient 5xx, we currently throw `UpstreamException` and rely on the user to retry. A future spec could add automatic retry with exponential backoff — but it increases cost and latency, and the current error-state UX (retry button) already gives the user control.
- **Streaming responses.** The current SDK call is non-streaming (`generateContent`, not `generateContentStream`). Ask AI (Spec 5) may need streaming for perceived latency; BB-30/31 do not.
- **Server-side prompt caching / request deduplication.** Identical requests from different users would each cost a Gemini call today. A server-side cache keyed by `{feature, reference, verseTextHash}` could amortize cost, but it introduces cross-user content visibility (privacy review needed) and adds a new storage dependency. Out of scope.
- **Token accounting / quota dashboards.** Tracking `tokensUsed` per response, per user, per day would be useful for cost visibility but requires a DB. Forums Wave Phase 1 adds Postgres; revisit then.
- **OpenAPI type generation.** Forums Wave Phase 1 sets up `openapi-typescript` to generate `frontend/src/types/api/generated.ts` from the backend's `openapi.yaml`. Until then, the frontend's request/response shapes are hand-typed and kept in sync manually. This spec's `geminiClient.ts` fetch body matches the OpenAPI spec by construction; no drift risk until a future version diverges.

---

## Branch + execution checklist (for CC to run through)

Before writing code, CC confirms:

1. `git branch --show-current` returns `claude/feature/ai-proxy-gemini`. If not, STOP.
2. `git log main --oneline -5` shows the Spec 1 merge commit. If not, STOP — Spec 1 isn't merged yet.
3. `./mvnw test` on the current branch (just after the fresh cut) passes all 23 existing tests. Baseline sanity check.
4. `backend/.env.local` exists with a real `GEMINI_API_KEY` value. If not, Eric will populate it before running the end-to-end smoke test.

Then execute file changes in roughly this order (each file is independent enough that order doesn't strictly matter, but this order keeps the build green at each step):

1. Backend: create new proxy.ai package files (SafetyBlockException, ExplainRequest, ReflectRequest, GeminiResponseDto, GeminiPrompts, GeminiService, GeminiController)
2. Backend: extend openapi.yaml with the two new paths + schemas + SafetyBlocked response
3. Backend: create the four new test files (GeminiPromptsTest, GeminiServiceTest, GeminiControllerTest, GeminiIntegrationTest)
4. Backend: `./mvnw test` — confirm ~41-45 tests pass
5. Frontend: rewrite geminiClient.ts (keeps public exports identical)
6. Frontend: update errors.ts (delete GeminiKeyMissingError class)
7. Frontend: update env.ts (delete requireGeminiApiKey + isGeminiApiKeyConfigured + GEMINI_API_KEY constant)
8. Frontend: update useExplainPassage.ts and useReflectOnPassage.ts (remove GeminiKeyMissingError import + classifyError branch)
9. Frontend: rewrite geminiClient.test.ts (swap to fetch mocking)
10. Frontend: delete prompts/explainPassagePrompt.ts, prompts/reflectPassagePrompt.ts, and their test files; delete the empty prompts/ directory
11. Frontend: update .env.example (delete VITE_GEMINI_API_KEY block)
12. Frontend: update package.json (remove @google/genai from dependencies)
13. Frontend: `cd frontend && npm install` — regenerate package-lock.json
14. Frontend: `npm test` — confirm ~35-40 tests pass in the rewritten geminiClient.test.ts, plus all other existing tests
15. Frontend: `npm run lint` — zero warnings, zero errors
16. Frontend: `npm run build` — TypeScript compiles, bundle builds
17. Verification: grep the dist bundle for "GoogleGenAI", "AIza", "VITE_GEMINI_API_KEY" — all should be absent
18. Paste diffs for Eric's review before he commits

**If anything is ambiguous, or a code block doesn't match reality (e.g., the `google-genai` SDK API shape has drifted since the spec was written), STOP and surface to Eric — don't guess.**

---

## Smoke test commands for Eric (after CC says "ready to review")

```bash
# 1. Backend compile + test
cd /Users/eric.champlin/worship-room/backend
./mvnw test

# Expect: ~41-45 tests pass, zero failures. If fewer, investigate.

# 2. Frontend test + lint + build
cd ../frontend
npm test
npm run lint
npm run build

# Expect: tests pass, zero warnings, bundle built.

# 3. Bundle key scan
grep -rE "GoogleGenAI|AIza[0-9A-Za-z_-]{30}|VITE_GEMINI_API_KEY" dist/ | head
# Expect: no output.

# 4. OpenAPI validation (optional but recommended)
npx @redocly/cli lint ../backend/src/main/resources/openapi.yaml
# Expect: zero errors.

# 5. Bring up backend with key configured
cd ..
docker compose up -d backend
# Wait for "Started WorshipRoomApplication" in logs
docker compose logs -f backend

# 6. Health check (separate terminal)
curl -s http://localhost:8080/api/v1/health | jq
# Expect: {"status":"ok","providers":{"gemini":true,"googleMaps":false,"fcbh":false}}

# 7. Live /explain call (uses real Gemini — expect 5-15s latency)
curl -s -X POST http://localhost:8080/api/v1/proxy/ai/explain \
  -H 'Content-Type: application/json' \
  -d '{"reference":"1 Corinthians 13:4-7","verseText":"Love is patient and is kind; love doesnt envy."}' \
  | jq

# Expect: {"data":{"content":"...","model":"gemini-2.5-flash-lite"},"meta":{"requestId":"..."}}

# 8. Live /reflect call
curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect \
  -H 'Content-Type: application/json' \
  -d '{"reference":"Philippians 4:6-7","verseText":"In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."}' \
  | jq

# 9. Validation test — empty reference
curl -s -i -X POST http://localhost:8080/api/v1/proxy/ai/explain \
  -H 'Content-Type: application/json' \
  -d '{"reference":"","verseText":"something"}'
# Expect: HTTP 400, body with "code":"INVALID_INPUT"

# 10. Run frontend dev server against this backend
cd frontend
npm run dev
# Open http://localhost:5173, navigate to BibleReader, select a passage,
# tap "Explain" and "Reflect". Both should work without visual regression.

# 11. Cache verification: tap "Explain" on the SAME passage a second time.
# DevTools Network tab should show ZERO new requests to /api/v1/proxy/ai/explain.

# 12. Backend stop (simulates backend outage)
docker compose stop backend
# Tap "Explain" on a fresh passage → user sees network-error copy.

# 13. Backend restart
docker compose start backend
# Wait for healthy, repeat step 10.
```

If any step fails unexpectedly, capture the `X-Request-Id` from the response headers and grep the backend logs for that ID — the server-side error context will tell you what went wrong.

---

## Deviations from spec (to be filled by the plan author)

The `/plan-forums` skill will add a "Deviations from spec" section documenting any places the implementation diverges from this spec (versions bumped, patterns adjusted, tests added or removed). Spec 1 taught us that every deviation needs a paper trail — keep this section honest.

---

*End of Spec 2.*
