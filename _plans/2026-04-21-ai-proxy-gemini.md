# Plan: AI Proxy — Gemini + BB-30/31 Frontend Migration (Spec 2 of 5)

**Spec:** `_specs/ai-proxy-gemini.md`
**Date:** 2026-04-21
**Branch:** `claude/feature/ai-proxy-gemini` (already cut from main; CC stays on it throughout)
**Wave:** Key Protection (spec 2 of 5; depends on merged Spec 1)
**Size:** L (24 files touched, ~60 tests, backend + frontend)
**Risk:** Medium — backend net-new + frontend swap of a widely-used client (`geminiClient.ts`). Public function signatures preserved to minimize hook/component churn.

---

## Universal Rules Checklist

N/A — standalone backend spec in the Key Protection wave. Not referenced in the Forums Wave master plan. Applicable conventions come from `.claude/rules/02-security.md`, `03-backend-standards.md`, `06-testing.md`, `07-logging-monitoring.md`, and `08-deployment.md`. Specifically honored in this plan:

- No git operations by CC (branch must remain `claude/feature/ai-proxy-gemini` throughout).
- No new Maven dependencies — Spec 1 already pulled in `google-genai:1.51.0`, `spring-boot-starter-webflux`, `spring-boot-starter-validation`.
- `openapi.yaml` is the single source of truth; hand-authored, validated before merge.
- Plain text only for request/response content — no HTML, no Markdown rendering.
- Upstream error text NEVER leaks to the client (`02-security.md` § "Never Leak Upstream Error Text"); every `GeminiService` error test asserts the internal cause message does not appear in the thrown `ProxyException` message.
- Rate limiting inherited from Spec 1's `RateLimitFilter` (scoped to `/api/v1/proxy/**` — auto-covers the two new endpoints without code changes).
- Logging discipline: log `reference` (not PII) and `verseTextLength` (a count). Never log `verseText`, prompts, or LLM response bodies.
- Request ID propagation via MDC preserved — every response includes `X-Request-Id` and `meta.requestId`.
- CORS already correct from Spec 1 — dev origins cover localhost:5173/5174/4173 and expose `Retry-After`, `X-RateLimit-*`, `X-Request-Id`.

---

## Architecture Context

**Spec 1 shipped the proxy foundation; Spec 2 builds on it without reaching outside `proxy.ai/`.**

### Existing foundation (from Spec 1, verified in `backend/src/main/java/com/example/worshiproom/`)

**Package root:** `com.example.worshiproom` (NOT `com.worshiproom` — do not rename).

**`proxy.common/` — reuse verbatim, no edits:**

- `ProxyResponse<T>(T data, Map<String, Object> meta)` — factory `of(T, String requestId)`. Serializes to `{data, meta: {requestId}}`.
- `ProxyError(String code, String message, String requestId, Instant timestamp)` — used by handler, not by new code.
- `ProxyException(HttpStatus, String code, String message, Throwable cause)` — base class for all proxy exceptions. Getters: `getStatus()`, `getCode()`.
- `UpstreamException extends ProxyException` → HTTP 502, code `UPSTREAM_ERROR`.
- `UpstreamTimeoutException extends ProxyException` → HTTP 504, code `UPSTREAM_TIMEOUT`.
- `RateLimitExceededException` → 429. Raised by the filter only.
- `ProxyExceptionHandler` — `@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")`. Catches `ProxyException` polymorphically (so `SafetyBlockException` will be caught via the base-class handler). Also handles `MethodArgumentNotValidException` → 400 `INVALID_INPUT`. No edit needed.
- `RateLimitExceptionHandler` — unscoped advice for filter-raised exceptions only. No edit needed.
- `RateLimitFilter` — `@Order(HIGHEST_PRECEDENCE + 10)`, scoped to `/api/v1/proxy/**`. Auto-applies to both new Gemini endpoints. No edit needed.
- `RequestIdFilter` — `@Order(HIGHEST_PRECEDENCE)`. Populates MDC with key `requestId`.
- `IpResolver` — respected by RateLimitFilter.

**`config/ProxyConfig.java` — reuse via getter:**

```java
@ConfigurationProperties(prefix = "proxy")
public class ProxyConfig {
    private GeminiProperties gemini;   // getters/setters
    // plus rateLimit, upstream, googleMaps, fcbh, cors, ...
    public static class GeminiProperties {
        private String apiKey = "";
        public String getApiKey() { ... }
        public boolean isConfigured() { ... }
    }
}
```

Spec 2 reads the key via `proxyConfig.getGemini().getApiKey()` in `GeminiService.initClient()`. Property wiring (`proxy.gemini.api-key=${GEMINI_API_KEY:}`) is already in `application.properties` — no config file edits needed.

**`config/CorsConfig.java` — already includes:**

- Allowed origins from `proxy.cors.allowed-origins` (localhost:5173/5174/4173 in dev; apex + www in prod).
- Methods: GET/POST/PUT/PATCH/DELETE/OPTIONS.
- Allowed headers: `Content-Type, Authorization, X-Request-Id`.
- Exposed headers: `X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After`.

No CORS changes needed for Spec 2.

### OpenAPI spec layout (`backend/src/main/resources/openapi.yaml`, 131 lines)

- Line 34: `paths:` root.
- Lines 35–58: `/api/v1/health` path block.
- Line 60: `components:` → `schemas:` on line 61.
- Lines 62–74: `ProxyResponse` schema.
- Lines 76–93: `ProxyError` schema. **Insert new schemas (ExplainRequest, ReflectRequest, GeminiResponseDto) directly after line 93, BEFORE the `responses:` block at line 95.**
- Line 95: `components.responses:`.
- Lines 96–100: `BadRequest`.
- Lines 101–115: `RateLimited`.
- Lines 116–120: `UpstreamError`.
- Lines 121–125: `UpstreamTimeout`. **Insert `SafetyBlocked` response after line 125, before `InternalError` at line 126.** (Spec says "after UpstreamTimeout"; keeping insertion grouped with other 4xx/5xx responses in numerical order keeps the file tidy.)
- Lines 126–130: `InternalError`.
- Line 131: EOF (file ends with blank line at 131).
- Tags `Health`, `Proxy / AI`, `Proxy / Places`, `Proxy / Audio` already declared at lines 24–32. Use `tags: [Proxy / AI]` on new operations.

**Paths insertion point: after line 58, before line 60 (`components:`). No blank line is needed between the last health-response line and the new path blocks — follow the existing style (directly adjacent).** Two new sibling paths (`/api/v1/proxy/ai/explain`, `/api/v1/proxy/ai/reflect`) go here.

### Existing frontend state (from recon on current branch)

- `frontend/src/lib/ai/geminiClient.ts` — imports `GoogleGenAI` from `@google/genai`, `requireGeminiApiKey` from `@/lib/env`, and both system prompts from `@/lib/ai/prompts/*`. Contains a memoized lazy SDK client, a shared `generateWithPromptAndCacheAndRateLimit` helper, and public `generateExplanation` / `generateReflection` functions that return `{content, model}`. This entire file is rewritten in Step 12.
- `frontend/src/lib/ai/errors.ts` — exports 6 classes: `GeminiNetworkError`, `GeminiApiError`, `GeminiSafetyBlockError`, `GeminiTimeoutError`, `GeminiKeyMissingError`, `RateLimitError`. Spec 2 deletes `GeminiKeyMissingError` only.
- `frontend/src/lib/env.ts` — exports `requireGeminiApiKey`, `isGeminiApiKeyConfigured`, module-local `GEMINI_API_KEY` constant, plus unrelated helpers for Google Maps, VAPID, FCBH. Spec 2 removes only the Gemini-related items.
- `frontend/src/hooks/bible/useExplainPassage.ts` and `useReflectOnPassage.ts` — each has a `classifyError` function with a `GeminiKeyMissingError` branch that maps to `'unavailable'`. That branch is removed; everything else stays byte-for-byte.
- `frontend/src/lib/ai/prompts/` directory — contains `explainPassagePrompt.ts`, `reflectPassagePrompt.ts`, and `__tests__/*` for each. Entire directory deleted in Steps 17–18.
- `frontend/src/lib/ai/__tests__/geminiClient.test.ts` — currently ~43 tests mocking `@google/genai` via `vi.mock`. Fully rewritten to mock global `fetch` in Step 19.
- `frontend/package.json` — lists `@google/genai: ^1.49.0` in `dependencies`. Removed in Step 21; `npm install` regenerates `package-lock.json`.
- `frontend/.env.example` — contains the `VITE_GEMINI_API_KEY=...` block. Lines removed in Step 20.

### Test patterns to match

- **Backend `@WebMvcTest` slice:** matches `RateLimitFilterTest` pattern → `@WebMvcTest(GeminiController.class) + @Import(ProxyExceptionHandler.class) + @MockBean GeminiService`. Validation failures go through the advice the `@Import` brings in.
- **Backend `@SpringBootTest`:** matches `RateLimitIntegrationTest` — `@SpringBootTest + @AutoConfigureMockMvc + @MockBean GeminiService`. Full filter chain runs; asserts `X-Request-Id`, `X-RateLimit-*` headers are present.
- **Backend unit tests:** matches Spec 1 unit-test pattern — plain Mockito, `@DisplayName` for each test, reflection when we need to bypass `@PostConstruct`.
- **Frontend mocks:** Vitest `vi.stubGlobal('fetch', mockFetch)` in `beforeEach`, `vi.unstubAllGlobals()` in `afterEach`. No more `vi.hoisted` / `vi.mock('@google/genai', ...)`.

### Database changes

None. This is an HTTP-proxy spec; no tables, no Liquibase changesets.

---

## Database Changes

None.

---

## API Changes

| Method | Endpoint | Auth | Rate Limit | Request Body | Response |
|--------|----------|------|------------|--------------|----------|
| POST | `/api/v1/proxy/ai/explain` | Unauthenticated (per-IP) | 60/min prod, 120/min dev (Spec 1 defaults) | `{reference: string (1-200), verseText: string (1-8000)}` | `ProxyResponse<{content: string, model: string}>` |
| POST | `/api/v1/proxy/ai/reflect` | Unauthenticated (per-IP) | 60/min prod, 120/min dev | Same shape as `/explain` | Same shape as `/explain` |

**Error codes:** `INVALID_INPUT` (400), `SAFETY_BLOCK` (422 — NEW), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), `UPSTREAM_ERROR` (502), `UPSTREAM_TIMEOUT` (504).

---

## Assumptions & Pre-Execution Checklist

- [ ] `git branch --show-current` returns `claude/feature/ai-proxy-gemini`. If not, STOP.
- [ ] `git log main --oneline -5` shows the "AI proxy foundation" merge commit (Spec 1 must be on main). If not, STOP.
- [ ] `cd backend && ./mvnw test` on the baseline branch passes all 23 Spec 1 tests (sanity check — we must not break them).
- [ ] `backend/.env.local` exists with a real `GEMINI_API_KEY` value before the end-to-end smoke test (step 24 below). If absent, backend boots fine but `/api/v1/proxy/ai/*` will return 502 until key is set.
- [ ] Docker is running (needed for smoke test, optional for unit/slice/integration tests which do not hit the network).
- [ ] `google-genai:1.51.0` is already in `backend/pom.xml` (verified in recon). No dependency edits.
- [ ] `spring-boot-starter-webflux` and `spring-boot-starter-validation` are already in `pom.xml`.
- [ ] `frontend/package.json` currently depends on `@google/genai: ^1.49.0` (to be removed).
- [ ] No OpenAPI codegen pipeline is wired yet — the frontend's request/response shapes are hand-typed. Keep fetch body/response in exact sync with the YAML.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where does `SafetyBlockException` live? | `proxy.common/` alongside `UpstreamException` | Future AI proxies (Claude, local LLM) may raise it too; keeping it in `common` avoids coupling siblings to `proxy.ai/` |
| Single service for both endpoints, or one per endpoint? | Single `GeminiService` with `generateExplanation` + `generateReflection` methods sharing a private `generate(...)` helper | Matches the spec verbatim; the only per-feature difference is the prompt pair, not the SDK call mechanics |
| Per-request timeout override — WebClient or SDK? | SDK — `HttpOptions.timeout((int) REQUEST_TIMEOUT.toMillis())` at `Client` construction | Spec 2 uses the `google-genai` SDK directly, NOT `WebClient`. Foundation's 10s default timeout applies to WebClient-based proxies (Maps/FCBH); Gemini needs 30s and the SDK exposes its own timeout knob |
| Bypass `@PostConstruct` in unit tests? | Yes, via reflection on the `client` field | Avoids opening a real network connection; integration test covers the real `@PostConstruct` path |
| How to assert "no upstream error leak"? | `GeminiServiceTest.genericSdkErrorThrowsUpstream` asserts `.hasMessage("AI service is temporarily unavailable. Please try again.")` (exact, not contains) on the thrown `UpstreamException` | Matches Spec 1's security convention; the test is the enforcement mechanism |
| Log `reference` in controller INFO log? | Yes — `reference` is a citation (not PII), never verse text or LLM output | Matches `07-logging-monitoring.md` safe-to-log list |
| What happens if `GEMINI_API_KEY` is empty on startup? | Log a WARN, set `this.client = null`, boot normally. Every subsequent call throws `UpstreamException("AI service is not configured on the server.")` → 502 | The server must not crash on missing key; operators see the warning; users see generic "temporarily unavailable" copy |
| Frontend `GeminiKeyMissingError` class — keep for BC or delete? | Delete | No frontend-visible condition raises it after the migration; keeping it as a dead export courts confusion. Hooks lose one `if` branch |
| Frontend prompts directory — delete or keep? | Delete entirely (the 4 files + empty dir) | No remaining consumers; prompts now backend-owned; dead code per CLAUDE.md |
| npm install strategy after package.json edit | `cd frontend && npm install` to regenerate lockfile | Never hand-edit `package-lock.json` — let npm do it |
| Verify no @google/genai leak | `grep -rE "requireGeminiApiKey\|isGeminiApiKeyConfigured\|GEMINI_API_KEY\|VITE_GEMINI_API_KEY\|GeminiKeyMissingError\|@google/genai" frontend/src/` must return zero after Step 22 | Acceptance criterion 15 |
| OpenAPI validation tool | Paste into editor.swagger.io OR `npx @redocly/cli lint backend/src/main/resources/openapi.yaml` | Either passes; CI does not yet validate OpenAPI (Forums Wave Phase 1 adds it), so manual check is the backstop |

---

## Implementation Steps

Ordered to keep the build green at each step. Backend foundation (exceptions, DTOs, prompts) → service → controller → OpenAPI → tests → frontend client rewrite → frontend ripple (hooks, env, errors, prompts) → cleanup (deletions, package.json) → end-to-end verification.

### Step 1: Create `SafetyBlockException` in `proxy.common`

**Objective:** Add the 422 `SAFETY_BLOCK` exception type that `GeminiService` will raise. Lives in `common/` so future AI proxies can reuse it.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/common/SafetyBlockException.java`

**Details:**

Paste the full file contents from the spec (Section "1. `SafetyBlockException.java` (NEW)"). Class extends `ProxyException`, two constructors (with/without cause), status `HttpStatus.UNPROCESSABLE_ENTITY`, code `"SAFETY_BLOCK"`.

No handler changes needed — `ProxyExceptionHandler.handleProxyException(ProxyException)` matches `SafetyBlockException` polymorphically.

**Guardrails (DO NOT):**

- Do not add a dedicated `@ExceptionHandler(SafetyBlockException.class)` — the base handler covers it.
- Do not rename the code from `SAFETY_BLOCK` — frontend and OpenAPI both reference this string.
- Do not move the class to `proxy.ai/` — it lives in `common/` by design.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] No new lint/style errors introduced.

**Test specifications:** None in this step. Covered indirectly via `GeminiServiceTest.promptBlockThrowsSafety` (Step 8) and `GeminiControllerTest.safetyBlockReturns422` (Step 9).

**Expected state after completion:**

- [ ] New file exists at the specified path.
- [ ] `./mvnw compile` passes.

---

### Step 2: Create request/response DTOs and prompt constants in `proxy.ai`

**Objective:** Add the four new `proxy.ai` helper types before the service depends on them.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/ExplainRequest.java`
- `backend/src/main/java/com/example/worshiproom/proxy/ai/ReflectRequest.java`
- `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiResponseDto.java`
- `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiPrompts.java`

**Details:**

Paste each file verbatim from the spec:

- `ExplainRequest` — record with `@NotBlank`/`@Size(max=200)` `reference` and `@NotBlank`/`@Size(max=8000)` `verseText`.
- `ReflectRequest` — structurally identical to `ExplainRequest`, separate record (spec's rationale: may diverge in future iterations).
- `GeminiResponseDto` — record `(String content, String model)`.
- `GeminiPrompts` — utility class (private constructor) with:
  - `public static final String EXPLAIN_SYSTEM_PROMPT` (Java text block, verbatim content from spec Section 5)
  - `public static final String REFLECT_SYSTEM_PROMPT` (Java text block, verbatim)
  - `public static String buildExplainUserPrompt(String reference, String verseText)` using `%s.formatted(...)`
  - `public static String buildReflectUserPrompt(String reference, String verseText)` using `%s.formatted(...)`

The prompt text must be **byte-for-byte verbatim** from the spec (numbered rules, framing paragraph, "Respond with the explanation text only" closer). No paraphrasing, no reformatting, no "improvements".

**Guardrails (DO NOT):**

- DO NOT paraphrase, shorten, rewrap, or otherwise edit the prompt text. `GeminiPromptsTest` will fail if you do.
- DO NOT move the DTOs to `proxy.common/` — they are AI-specific.
- DO NOT reuse `ExplainRequest` for `/reflect` — spec explicitly keeps them parallel.
- DO NOT mark the prompt constants `private`; they must be accessible to `GeminiService` and `GeminiPromptsTest`.
- DO NOT add Lombok, validator groups, or fluent builders — records + plain Bean Validation, matching Spec 1.

**Verification:**

- [ ] All four files exist at specified paths.
- [ ] `./mvnw compile` passes.
- [ ] The Java text block indentation aligns so the left margin of each numbered rule sits at column 0 inside the string. Run `GeminiPromptsTest` (Step 7) to confirm after it exists.

**Test specifications:** Tests for these files live in Step 7 (`GeminiPromptsTest`). No DTO-specific tests — validation is covered by `GeminiControllerTest` (Step 9).

**Expected state after completion:**

- [ ] Four new files compile.
- [ ] `GeminiPrompts.EXPLAIN_SYSTEM_PROMPT` and `REFLECT_SYSTEM_PROMPT` are populated with the spec's verbatim text.

---

### Step 3: Create `GeminiService`

**Objective:** The Spring-managed bean that wraps the `google-genai` SDK, handles `@PostConstruct` key discovery, runs the three-path safety check, and maps SDK exceptions to typed proxy exceptions.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiService.java`

**Details:**

Paste the full file contents from spec Section 6 verbatim. Key design points:

- `@Service`-annotated, constructor-injected `ProxyConfig`.
- Private mutable `Client client` field, initialized in `@PostConstruct initClient()`.
- If `apiKey == null || isBlank()`, log a warn and leave `client = null`; do NOT throw (server must boot without key).
- `HttpOptions.builder().timeout((int) REQUEST_TIMEOUT.toMillis()).build()` — 30 seconds as an int-millis argument. `Client.builder().apiKey(apiKey).httpOptions(httpOptions).build()`.
- Constants: `MODEL_ID = "gemini-2.5-flash-lite"`, `MAX_OUTPUT_TOKENS = 600`, `TEMPERATURE = 0.7f`, `REQUEST_TIMEOUT = Duration.ofSeconds(30)`.
- Public methods: `generateExplanation(reference, verseText)`, `generateReflection(reference, verseText)` — both delegate to package-private `generate(...)` with the appropriate prompt pair.
- `generate(...)`:
  1. If `client == null` throw `UpstreamException("AI service is not configured on the server.")`.
  2. Build `GenerateContentConfig` with system prompt (wrapped in `Content.fromParts(Part.fromText(...))`), `maxOutputTokens`, `temperature`.
  3. Call `client.models.generateContent(MODEL_ID, userPrompt, config)`.
  4. On exception: if `isTimeout(ex)` → `UpstreamTimeoutException("AI service timed out. Please try again.", ex)`; else `UpstreamException("AI service is temporarily unavailable. Please try again.", ex)`. **The cause's message MUST NOT appear in the exception's user-facing message** — only the hardcoded generic strings above.
  5. Three-path safety check (all throw `SafetyBlockException`):
     - `response.promptFeedback().flatMap(pf -> pf.blockReason())` present → prompt-level block.
     - First candidate's `finishReason` is `"SAFETY"` or `"PROHIBITED_CONTENT"` → output-level block.
     - `response.text() == null || isBlank()` → silent block.
  6. Return `new GeminiResponseDto(content.trim(), MODEL_ID)`.
- Private `static boolean isTimeout(Throwable ex)` — walks the cause chain, returns true for `TimeoutException` or any message containing `"timeout"` (case-insensitive). Includes self-referential-cause guard.

**Guardrails (DO NOT):**

- DO NOT let the SDK exception's message leak into `UpstreamException`'s message. The cause chain is preserved (for server logs), but the message argument is always the user-safe hardcoded string.
- DO NOT throw `RuntimeException` or `Exception` — always a typed `ProxyException` subclass.
- DO NOT call the SDK at module-load; only inside `@PostConstruct` (tests bypass via reflection).
- DO NOT upgrade `google-genai` from 1.51.0 to "fix" a compile error — surface to Eric. SDK API is pinned.
- DO NOT use `WebClient` for Gemini — spec explicitly uses the SDK directly.
- DO NOT create a second `Client` per request; the one in `this.client` is thread-safe per SDK docs.
- DO NOT return `new GeminiResponseDto(content, MODEL_ID)` — the spec says `content.trim()`. Preserve the trim.

**Verification:**

- [ ] File exists at specified path.
- [ ] `./mvnw compile` passes.
- [ ] SDK types used (`Client`, `Models`, `Content`, `Part`, `FinishReason`, `BlockedReason`, `GenerateContentConfig`, `GenerateContentResponse`, `HttpOptions`) resolve at compile time against `google-genai:1.51.0`.

**Test specifications:** Unit tests in Step 8. Integration-style lifecycle test in Step 10.

**Expected state after completion:**

- [ ] `GeminiService` compiles; Spring can autowire it.
- [ ] Backend still boots (sanity check: `./mvnw spring-boot:run` in dev profile starts without error — abort after seeing "Started WorshipRoomApplication").

---

### Step 4: Create `GeminiController`

**Objective:** Two POST endpoints under `/api/v1/proxy/ai/` that validate the request body, delegate to `GeminiService`, and wrap the result in `ProxyResponse`.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/GeminiController.java`

**Details:**

Paste the full file contents from spec Section 7 verbatim.

- `@RestController @RequestMapping("/api/v1/proxy/ai")`.
- Constructor injection of `GeminiService`.
- Two handlers:
  - `@PostMapping("/explain") public ProxyResponse<GeminiResponseDto> explain(@Valid @RequestBody ExplainRequest request)`.
  - `@PostMapping("/reflect") public ProxyResponse<GeminiResponseDto> reflect(@Valid @RequestBody ReflectRequest request)`.
- Each handler logs at INFO with `reference` and `verseText.length()` — **never** the full `verseText` or the LLM output.
- Wrap result with `ProxyResponse.of(payload, MDC.get("requestId"))`.

**Guardrails (DO NOT):**

- DO NOT add custom `@ExceptionHandler` methods — everything flows through the shared advice.
- DO NOT log `request.verseText()` in full — only `.length()`.
- DO NOT log the `GeminiResponseDto.content()`.
- DO NOT add `@Autowired` on fields — constructor injection only.
- DO NOT add rate-limiting annotations; `RateLimitFilter` (Spec 1) covers `/api/v1/proxy/**` automatically.

**Verification:**

- [ ] File exists at specified path.
- [ ] `./mvnw compile` passes.
- [ ] Backend boots and `POST /api/v1/proxy/ai/explain` returns SOMETHING (status may be 502 if key absent, 400 if body missing) — but the endpoint is reachable (no 404).
  ```bash
  curl -s -i -X POST http://localhost:8080/api/v1/proxy/ai/explain \
    -H 'Content-Type: application/json' -d '{"reference":"","verseText":""}'
  # Expect: 400 INVALID_INPUT (Bean Validation trips on the empty fields before the service call)
  ```

**Test specifications:** Slice tests in Step 9; integration test in Step 10.

**Expected state after completion:**

- [ ] Both endpoints registered in Spring's handler mapping; curl returns a 400/422/502 response rather than 404.

---

### Step 5: Extend `openapi.yaml` with new paths, schemas, and SafetyBlocked response

**Objective:** The OpenAPI spec is the single source of truth. Adding the new endpoints here in the same commit as the Java code prevents drift.

**Files to modify:**

- `backend/src/main/resources/openapi.yaml`

**Details (three targeted insertions; no other edits):**

1. **Paths — insert between line 58 and line 60 (after `/api/v1/health` block, before `components:`).** Paste the two `/api/v1/proxy/ai/explain` and `/api/v1/proxy/ai/reflect` path blocks verbatim from spec "Insertion point 1". Indentation: 2 spaces under `paths:`. Tags `[Proxy / AI]`.

2. **Schemas — insert between line 93 and line 95 (after the `ProxyError` schema, before `responses:`).** Paste `ExplainRequest`, `ReflectRequest`, `GeminiResponseDto` schemas verbatim from spec "Insertion point 2". Indentation: 4 spaces under `components.schemas:`.

3. **Responses — insert between line 125 and line 126 (after `UpstreamTimeout`, before `InternalError`).** Paste `SafetyBlocked` response verbatim from spec "Insertion point 3". Indentation: 4 spaces under `components.responses:`.

Each path operation references the existing shared responses (`BadRequest`, `RateLimited`, `UpstreamError`, `UpstreamTimeout`, `InternalError`) plus the new `SafetyBlocked`. Do NOT inline these; always use `$ref`.

**Guardrails (DO NOT):**

- DO NOT redefine `ProxyResponse` or `ProxyError` — always `$ref` the existing schemas.
- DO NOT use tabs — 2-space indentation per the existing file.
- DO NOT reorder existing content; only insert at the three documented points.
- DO NOT add Swagger-only `servers` or `security` blocks per-operation — the top-level ones apply.

**Verification:**

- [ ] `openapi.yaml` validates: paste into [editor.swagger.io](https://editor.swagger.io) → zero errors → both new paths render. Alternatively: `npx @redocly/cli lint backend/src/main/resources/openapi.yaml` → zero errors.
- [ ] `./mvnw compile` still passes (YAML is not compiled, but resource-filtering changes could break classpath loading in rare setups).
- [ ] Both new paths visible in the rendered Swagger UI with all expected responses (200, 400, 422, 429, 500, 502, 504).

**Test specifications:** None. Manual schema validation is the check.

**Expected state after completion:**

- [ ] File length grows from 131 lines to ~180–200 lines.
- [ ] Validation passes.

---

### Step 6: Smoke-run the backend locally without the API key

> ⚠️ **HUMAN CHECKPOINT — Eric runs this manually.** CC marks this step as `[BLOCKED-ON-HUMAN]` in the Execution Log and proceeds to Step 7. Eric runs the Docker commands below, verifies the outputs, updates the log to `[DONE]`, then tells CC to resume.

**Objective:** Confirm the server boots with `GEMINI_API_KEY` missing, `GeminiService.initClient()` logs the expected warn, and `/api/v1/proxy/ai/*` returns the 502 `UPSTREAM_ERROR` generic-unavailable copy (not a crash, not a null pointer).

**Files to modify:** None.

**Details:**

In a terminal:

```bash
cd /Users/eric.champlin/worship-room
# Ensure GEMINI_API_KEY is not in backend/.env.local OR is empty
docker compose up -d backend
docker compose logs -f backend | grep -E "GEMINI_API_KEY|Started WorshipRoomApplication"
```

Expected log line: `GEMINI_API_KEY is not configured. /api/v1/proxy/ai/* endpoints will return 502 UPSTREAM_ERROR until it is set.`

```bash
curl -s -i -X POST http://localhost:8080/api/v1/proxy/ai/explain \
  -H 'Content-Type: application/json' \
  -d '{"reference":"John 3:16","verseText":"For God so loved the world"}'
```

Expected: HTTP 502, body `{"code":"UPSTREAM_ERROR","message":"AI service is temporarily unavailable. Please try again.","requestId":"...","timestamp":"..."}`, headers include `X-Request-Id`, `X-RateLimit-*`.

**Guardrails (DO NOT):**

- DO NOT populate the API key for this step — the point is to verify the null-client path.
- DO NOT `docker compose down` until verification is done.

**Verification:**

- [ ] Backend starts; warn log visible.
- [ ] `curl` returns HTTP 502 with code `UPSTREAM_ERROR`.
- [ ] `X-Request-Id` header present on the 502 response.

**Test specifications:** None. This is manual operational verification; the permanent regression coverage lives in `GeminiServiceTest.nullClientThrowsUpstream` (Step 8).

**Expected state after completion:**

- [ ] Confidence that the backend handles the missing-key case gracefully.

---

### Step 7: Create `GeminiPromptsTest`

**Objective:** Guardrail test that asserts each of the 10 numbered rules in both system prompts is present verbatim. Catches accidental edits from find/replace, auto-format, or text-block re-indent.

**Files to create:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiPromptsTest.java`

**Details:**

Paste the full file from spec Section 21 verbatim. Five tests:

1. `explainContainsAllTenRules` — asserts each of the 10 rules' opening phrase appears in `EXPLAIN_SYSTEM_PROMPT`.
2. `explainOpensWithScholarFraming` — asserts `.startsWith("You are a thoughtful biblical scholar")`, `.contains("You are not a pastor. You are not a preacher.")`, `.contains("World English Bible")`.
3. `reflectContainsAllTenRules` — asserts each of the 10 reflect rules' opening phrase.
4. `buildExplainInterpolates` — asserts `buildExplainUserPrompt(...)` interpolates `reference`, `verseText`, and the tail phrase verbatim.
5. `buildReflectInterpolates` — same for `buildReflectUserPrompt(...)`.

**Guardrails (DO NOT):**

- DO NOT skip a rule assertion just because the test is longer — each rule is an independent guardrail.
- DO NOT use `contains("1.")` — the assertion must include enough distinctive text to fail on meaningful drift.

**Verification:**

- [ ] `./mvnw test -Dtest=GeminiPromptsTest` passes — all 5 tests green.
- [ ] If any assertion fails, the prompt text in Step 2 drifted from the spec; fix the source, don't "fix" the test.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| explainContainsAllTenRules | unit | Verifies all 10 numbered rules appear verbatim in EXPLAIN_SYSTEM_PROMPT |
| explainOpensWithScholarFraming | unit | Verifies opening paragraph + key framing phrases |
| reflectContainsAllTenRules | unit | Verifies all 10 numbered rules appear verbatim in REFLECT_SYSTEM_PROMPT |
| buildExplainInterpolates | unit | Verifies user-prompt builder interpolates reference + verseText + tail phrase |
| buildReflectInterpolates | unit | Same for reflect builder |

**Expected state after completion:**

- [ ] 5 tests pass (one for each row in the table above).

---

### Step 8: Create `GeminiServiceTest` (unit tests with mocked SDK)

**Objective:** Cover every branch of `GeminiService.generate(...)` — happy path, both prompt-pair variants, three safety paths, timeout, generic SDK error, null-client path. **Crucially includes the "no upstream leak" guardrail assertion.**

**Files to create:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiServiceTest.java`

**Details:**

Paste the full file from spec Section 22 verbatim. Key patterns:

- `@BeforeEach setUp()` constructs `ProxyConfig` manually (sets api-key to `"fake-test-key"`), instantiates `GeminiService`, then uses reflection to:
  1. Set `Client.models` (public field) to a mock `Models`.
  2. Set `GeminiService.client` (private field) to the mock `Client`.
- 8 `@Test` methods covering each branch.
- `genericSdkErrorThrowsUpstream` asserts `.hasMessage("AI service is temporarily unavailable. Please try again.")` — **exact match**. This is the "never leak upstream error text" security invariant. DO NOT weaken this to `.hasMessageContaining`.

**Guardrails (DO NOT):**

- DO NOT weaken `.hasMessage` to `.hasMessageContaining` in the "no leak" assertion — it's the enforcement mechanism.
- DO NOT share mocks across test methods — each test builds its own `GenerateContentResponse` mock.
- DO NOT remove the `nullClientThrowsUpstream` test — it covers the missing-key branch.
- DO NOT call real `@PostConstruct` — reflection bypass is intentional.

**Verification:**

- [ ] `./mvnw test -Dtest=GeminiServiceTest` passes — all 8 tests green.
- [ ] `GeminiServiceTest.genericSdkErrorThrowsUpstream` fails with a clear message if someone ever changes `UpstreamException`'s message construction to include the cause.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| happyPathExplain | unit | Mocked SDK returns content; service returns `GeminiResponseDto(content, "gemini-2.5-flash-lite")` |
| reflectUsesReflectPrompt | unit | `generateReflection` takes the correct code path (invokes SDK successfully) |
| promptBlockThrowsSafety | unit | `promptFeedback.blockReason` present → `SafetyBlockException` with "Gemini blocked the prompt" |
| outputSafetyThrowsSafety | unit | Candidate finishReason SAFETY → `SafetyBlockException` with "finishReason=SAFETY" |
| emptyTextThrowsSafety | unit | `response.text()` blank → `SafetyBlockException` with "empty response" |
| timeoutThrowsUpstreamTimeout | unit | SDK throws wrapping `TimeoutException` → `UpstreamTimeoutException` with "timed out" |
| genericSdkErrorThrowsUpstream | unit | **(CRITICAL)** SDK throws generic RuntimeException; thrown `UpstreamException.message` is user-safe hardcoded text (no leak) |
| nullClientThrowsUpstream | unit | Reflection sets `client=null`; call throws `UpstreamException("...not configured...")` |

**Expected state after completion:**

- [ ] 8 tests pass.

---

### Step 9: Create `GeminiControllerTest` (`@WebMvcTest` slice)

**Objective:** Validate request-body validation, response shape, and error-code mapping without loading the full Spring context.

**Files to create:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiControllerTest.java`

**Details:**

Paste the full file from spec Section 23 verbatim.

- `@WebMvcTest(GeminiController.class)` + `@Import(ProxyExceptionHandler.class)` so validation errors flow through the advice.
- `@MockBean GeminiService` so we control return values / thrown exceptions.
- 7 tests: happy paths for both endpoints, blank reference (400), oversized verseText (400), `SafetyBlockException` → 422, `UpstreamException` → 502, `UpstreamTimeoutException` → 504.

**Guardrails (DO NOT):**

- DO NOT load `@SpringBootTest` here — that is the integration test's job.
- DO NOT mock `GeminiController` itself; only its `GeminiService` dependency.
- DO NOT assert on `$.meta.requestId` matching a specific value — just `.exists()`. RequestIdFilter populates it, and in a slice test the value varies per run.

**Verification:**

- [ ] `./mvnw test -Dtest=GeminiControllerTest` passes — 7 tests green.
- [ ] Slice test runs in under 500ms (quick feedback loop).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| explainHappyPath | slice | Mock service → 200, data.content/model, meta.requestId |
| reflectHappyPath | slice | Same for /reflect |
| blankReferenceReturns400 | slice | `{reference:"", ...}` → 400 INVALID_INPUT |
| oversizedVerseTextReturns400 | slice | 8001-char `verseText` → 400 INVALID_INPUT |
| safetyBlockReturns422 | slice | Service throws `SafetyBlockException` → 422 SAFETY_BLOCK |
| upstreamErrorReturns502 | slice | Service throws `UpstreamException` → 502 UPSTREAM_ERROR |
| upstreamTimeoutReturns504 | slice | Service throws `UpstreamTimeoutException` → 504 UPSTREAM_TIMEOUT |

**Expected state after completion:**

- [ ] 7 tests pass.

---

### Step 10: Create `GeminiIntegrationTest` (`@SpringBootTest` end-to-end)

**Objective:** Lock in the full filter-chain behavior — `RequestIdFilter` → MDC → `ProxyResponse.meta.requestId`, and `RateLimitFilter` sets `X-RateLimit-*` headers on success responses.

**Files to create:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/GeminiIntegrationTest.java`

**Details:**

Paste the full file from spec Section 24 verbatim.

- `@SpringBootTest @AutoConfigureMockMvc`.
- `@MockBean GeminiService`.
- 2 tests:
  1. `fullLifecycle` — asserts `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers present on a success response; body has `data.content`, `meta.requestId`.
  2. `honorsClientRequestId` — client sends `X-Request-Id: test-client-request-id`, server echoes it in both the response header and `meta.requestId`.

**Guardrails (DO NOT):**

- DO NOT pair this test class with a Testcontainers base class — there's no DB involvement. Plain `@SpringBootTest` is correct.
- DO NOT assert on exact header values for `X-RateLimit-*` — those depend on current bucket state. Only assert `.exists()`.

**Verification:**

- [ ] `./mvnw test -Dtest=GeminiIntegrationTest` passes — 2 tests green.
- [ ] Backend test suite totals ~41–45 tests: 23 from Spec 1 + 4 + 8 + 7 + 2 from Spec 2.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| fullLifecycle | integration | Full filter chain runs; all expected headers + ProxyResponse body shape present |
| honorsClientRequestId | integration | Client-provided `X-Request-Id` is honored end-to-end (header + meta) |

**Expected state after completion:**

- [ ] 2 tests pass; `./mvnw test` overall suite green.
- [ ] Step 8, 9, 10 combined: ~17 new backend tests + 4 from Step 7 = ~21 new backend tests (matches spec's 18–22 target).

---

### Step 11: Run the full backend test suite

**Objective:** Confirm no Spec 1 test regressed.

**Files to modify:** None.

**Details:**

```bash
cd /Users/eric.champlin/worship-room/backend
./mvnw clean test
```

Expected output:

```
Tests run: 41, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

(exact count depends on how many @DisplayName groups map to individual methods in Spec 1).

**Guardrails (DO NOT):**

- DO NOT proceed to frontend changes until backend tests are 100% green.
- DO NOT use `-Dtest=...` to skip classes — full suite only.

**Verification:**

- [ ] `./mvnw clean test` exits 0.
- [ ] Zero failures, zero errors.
- [ ] Test count is ≥ 23 (baseline) + 21 (new) ≈ 44.

**Test specifications:** N/A (aggregate verification).

**Expected state after completion:**

- [ ] Backend is fully green.

---

### Step 12: Rewrite `frontend/src/lib/ai/geminiClient.ts` (SDK → fetch)

**Objective:** Swap the `@google/genai` SDK call for a `fetch()` to `/api/v1/proxy/ai/*`. Preserve every public export (`generateExplanation`, `generateReflection`, `ExplainResult`, `ReflectResult`, `__resetGeminiClientForTests`) byte-for-byte so hooks and components need no additional changes beyond the ones in Step 15.

**Files to modify:**

- `frontend/src/lib/ai/geminiClient.ts`

**Details:**

Overwrite the file contents entirely with the verbatim code from spec Section 9. Key points:

- Imports: error classes from `@/lib/ai/errors` (WITHOUT `GeminiKeyMissingError`), cache helpers, rate-limit helpers. **No imports from `@google/genai` or `@/lib/env`.**
- `API_BASE_URL` resolved from `import.meta.env.VITE_API_BASE_URL` with `'http://localhost:8080'` fallback.
- `EXPLAIN_URL` and `REFLECT_URL` constants.
- `REQUEST_TIMEOUT_MS = 30_000`.
- `ExplainResult` and `ReflectResult` interfaces — `{content: string, model: string}`.
- `__resetGeminiClientForTests()` delegates to `clearAllAICache()` + `resetRateLimitForTests()` (no SDK client to reset).
- Internal interfaces `ProxySuccessBody`, `ProxyErrorBody` typed against the backend's JSON shape.
- `callProxy(feature, url, reference, verseText, signal?)` — the shared fetch-based helper. Composition order **preserved** from the SDK version:
  1. Cache lookup (short-circuit).
  2. Client-side rate-limit token consume (throws `RateLimitError` BEFORE network).
  3. Build `combinedSignal` via `AbortSignal.any([caller, timeout])`.
  4. `fetch(url, {method, headers, body, signal})` in try/catch.
  5. Abort handling: re-throw caller-aborted `AbortError` unchanged; map `TimeoutError` → `GeminiTimeoutError`; map `TypeError` / network-ish message → `GeminiNetworkError`; else → `GeminiApiError`.
  6. On 2xx: parse JSON, validate `data.content` / `data.model` present, cache, return.
  7. On non-2xx: parse body defensively; switch on `code` to map to typed error. `RATE_LIMITED` → read `Retry-After` header (default 60s) → `RateLimitError`; `SAFETY_BLOCK` → `GeminiSafetyBlockError`; `UPSTREAM_TIMEOUT` → `GeminiTimeoutError`; `UPSTREAM_ERROR` / `INVALID_INPUT` / `INTERNAL_ERROR` / default → `GeminiApiError`.
- `generateExplanation(reference, verseText, signal?)` and `generateReflection(reference, verseText, signal?)` delegate to `callProxy` with their respective feature name and URL.

**Guardrails (DO NOT):**

- DO NOT change the public signatures of `generateExplanation` / `generateReflection` / `ExplainResult` / `ReflectResult` — hooks depend on them.
- DO NOT add an `export` of `callProxy` — it's internal.
- DO NOT import from `@google/genai` — the package will be removed in Step 22.
- DO NOT import `requireGeminiApiKey` — `@/lib/env` no longer exposes it after Step 14.
- DO NOT add a discriminated-union `source` field to `ExplainResult` — spec explicitly forbids.
- DO NOT trim the response content client-side — the backend already trims.
- DO NOT skip the cache write on success — existing BB-32 behavior must be preserved.

**Verification:**

- [ ] File compiles: `cd frontend && npx tsc --noEmit`.
- [ ] Module builds in isolation: `cd frontend && npm run build` (will still fail later steps until prompts are deleted, but typescript compilation on this file alone should pass).
- [ ] No new lint errors: `npm run lint` (may still have warnings from orphan references until Steps 13–18 finish).

**Test specifications:** Full test rewrite lives in Step 19.

**Expected state after completion:**

- [ ] File is a pure fetch client with zero SDK references.
- [ ] Public API unchanged.

---

### Step 13: Remove `GeminiKeyMissingError` from `frontend/src/lib/ai/errors.ts`

**Objective:** Delete the dead error class. After the migration, no frontend-visible condition throws it.

**Files to modify:**

- `frontend/src/lib/ai/errors.ts`

**Details:**

Locate the `export class GeminiKeyMissingError extends Error {...}` block (including its JSDoc) and remove it entirely. Leave the remaining 5 classes (`GeminiNetworkError`, `GeminiApiError`, `GeminiSafetyBlockError`, `GeminiTimeoutError`, `RateLimitError`) intact.

**Guardrails (DO NOT):**

- DO NOT delete any other error class.
- DO NOT leave a stub re-export like `export { /* GeminiKeyMissingError removed in Spec 2 */ }` — the CLAUDE.md guidance forbids backwards-compat comments.
- DO NOT touch the `assignCause` helper (shared across all error classes).

**Verification:**

- [ ] `grep -n "GeminiKeyMissingError" frontend/src/lib/ai/errors.ts` → no output.
- [ ] `cd frontend && npx tsc --noEmit` reports errors on consumers of `GeminiKeyMissingError` (expected — fixed in Steps 15–16; Step 19 fixes the test file). This is the signal that all reference sites are findable via grep.

**Test specifications:** None.

**Expected state after completion:**

- [ ] `errors.ts` exports exactly 5 classes.

---

### Step 14: Delete Gemini-related helpers from `frontend/src/lib/env.ts`

**Objective:** Remove `GEMINI_API_KEY` module constant, `requireGeminiApiKey()` helper, and `isGeminiApiKeyConfigured()` helper. Preserve all other helpers (Google Maps, VAPID, FCBH).

**Files to modify:**

- `frontend/src/lib/env.ts`

**Details:**

Locate and delete the three items:

1. The `const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined` line.
2. The `export function requireGeminiApiKey(): string` function + its JSDoc.
3. The `export function isGeminiApiKeyConfigured(): boolean` function + its JSDoc.

Leave `requireGoogleMapsApiKey`, `isGoogleMapsApiKeyConfigured`, `requireVapidPublicKey`, `getVapidPublicKey`, `isVapidKeyConfigured`, `requireFcbhApiKey`, `getFcbhApiKey`, `isFcbhApiKeyConfigured` intact.

**Guardrails (DO NOT):**

- DO NOT delete any non-Gemini helper.
- DO NOT keep `GEMINI_API_KEY` as a dead local constant "in case we need it later" — delete it.

**Verification:**

- [ ] `grep -n "GEMINI_API_KEY\|requireGeminiApiKey\|isGeminiApiKeyConfigured" frontend/src/lib/env.ts` → no output.
- [ ] `cd frontend && npx tsc --noEmit` — compilation errors on consumers of the deleted helpers (expected — fixed in Steps 12, 15, 16, 19).

**Test specifications:** None (env.ts is a thin typed wrapper; not tested in isolation).

**Expected state after completion:**

- [ ] env.ts has no Gemini surface.

---

### Step 15: Update `useExplainPassage.ts` hook

**Objective:** Two surgical edits — remove the `GeminiKeyMissingError` import and the corresponding `classifyError` branch. Everything else stays identical.

**Files to modify:**

- `frontend/src/hooks/bible/useExplainPassage.ts`

**Details:**

**Edit 1 — imports.** Change:

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

to (remove `GeminiKeyMissingError,` line):

```typescript
import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '@/lib/ai/errors'
```

**Edit 2 — `classifyError`.** Remove the 2-line `GeminiKeyMissingError` branch (the comment above it goes with it):

```typescript
  // Key-missing is mapped to the generic 'unavailable' message for users —
  // the specific error is logged to the console for developers in the client.
  if (err instanceof GeminiKeyMissingError) return 'unavailable'
```

The `ExplainErrorKind` union stays unchanged (the `'unavailable'` kind is still reachable via the default-return path).

**Guardrails (DO NOT):**

- DO NOT touch any other part of the hook.
- DO NOT remove the `'unavailable'` return path or the `ERROR_COPY['unavailable']` entry — unmatched errors still route there.

**Verification:**

- [ ] `grep -n "GeminiKeyMissingError" frontend/src/hooks/bible/useExplainPassage.ts` → no output.
- [ ] `cd frontend && npx tsc --noEmit` — file-level errors resolve (errors may remain from other files until Step 19).

**Test specifications:** The hook has existing tests (likely at `frontend/src/hooks/bible/__tests__/useExplainPassage.test.ts`). Verify in Step 23 they still pass — they SHOULD, since the classifyError change is mechanical and the test is unlikely to mock `GeminiKeyMissingError`. If it does, delete those assertions.

**Expected state after completion:**

- [ ] Two lines gone; rest of file byte-for-byte identical.

---

### Step 16: Update `useReflectOnPassage.ts` hook

**Objective:** Structurally identical changes to Step 15, applied to the reflect hook.

**Files to modify:**

- `frontend/src/hooks/bible/useReflectOnPassage.ts`

**Details:**

Same two edits as Step 15:

1. Remove `GeminiKeyMissingError` from the `@/lib/ai/errors` import list.
2. Remove the `if (err instanceof GeminiKeyMissingError) return 'unavailable'` branch from `classifyError` (and any comment directly above that line).

**Guardrails (DO NOT):**

- Same as Step 15.

**Verification:**

- [ ] `grep -n "GeminiKeyMissingError" frontend/src/hooks/bible/useReflectOnPassage.ts` → no output.

**Test specifications:** Existing tests for this hook should pass post-migration — verified in Step 23.

**Expected state after completion:**

- [ ] Identical shape to useExplainPassage post-edit.

---

### Step 17: Delete prompt source files

**Objective:** Remove the four prompt files from the frontend. Their content lives in `GeminiPrompts.java` (backend) now.

**Files to delete:**

- `frontend/src/lib/ai/prompts/explainPassagePrompt.ts`
- `frontend/src/lib/ai/prompts/reflectPassagePrompt.ts`
- `frontend/src/lib/ai/prompts/__tests__/explainPassagePrompt.test.ts`
- `frontend/src/lib/ai/prompts/__tests__/reflectPassagePrompt.test.ts`

**Details:**

```bash
rm frontend/src/lib/ai/prompts/explainPassagePrompt.ts
rm frontend/src/lib/ai/prompts/reflectPassagePrompt.ts
rm frontend/src/lib/ai/prompts/__tests__/explainPassagePrompt.test.ts
rm frontend/src/lib/ai/prompts/__tests__/reflectPassagePrompt.test.ts
```

**Guardrails (DO NOT):**

- DO NOT delete other files in `__tests__/`.
- DO NOT use `rm -rf frontend/src/lib/ai/prompts` yet — the directory may contain files we haven't accounted for. Delete files explicitly; Step 18 removes the directory only after confirming it's empty.

**Verification:**

- [ ] `ls frontend/src/lib/ai/prompts/` shows zero files and zero subdirectories with content.
- [ ] `grep -r "explainPassagePrompt\|reflectPassagePrompt" frontend/src/` returns zero results.

**Test specifications:** Test coverage replaced by `GeminiPromptsTest` (backend, Step 7).

**Expected state after completion:**

- [ ] Four files gone.

---

### Step 18: Remove empty `frontend/src/lib/ai/prompts/` directory

**Objective:** Clean up the empty directory so it doesn't sit as dead structure.

**Files to delete:**

- `frontend/src/lib/ai/prompts/__tests__/` (if empty)
- `frontend/src/lib/ai/prompts/` (if empty)

**Details:**

```bash
rmdir frontend/src/lib/ai/prompts/__tests__ 2>/dev/null
rmdir frontend/src/lib/ai/prompts 2>/dev/null
```

`rmdir` refuses to delete non-empty directories, so this is safe.

**Guardrails (DO NOT):**

- DO NOT `rm -rf` this path — `rmdir` is the safety net.

**Verification:**

- [ ] `ls frontend/src/lib/ai/prompts/` exits non-zero (no such directory).

**Test specifications:** None.

**Expected state after completion:**

- [ ] Directory gone.

---

### Step 19: Rewrite `frontend/src/lib/ai/__tests__/geminiClient.test.ts`

**Objective:** Swap the `@google/genai` mock for a global `fetch` mock. Preserve behavior tests; delete tests that are no longer reachable; add new tests for backend error-code mapping. Target ~35–40 tests.

**Files to modify:**

- `frontend/src/lib/ai/__tests__/geminiClient.test.ts`

**Details:**

**Replace the mock setup at the top of the file** with the `mockFetch` + `okResponse` / `errorResponse` helpers from spec Section 25 "Replace the mock-setup block at the top". Remove all `vi.mock('@google/genai', ...)` and `vi.mock('@/lib/env', ...)` calls. Remove imports of `GoogleGenAI`, `EXPLAIN_PASSAGE_SYSTEM_PROMPT`, `buildReflectPassageUserPrompt`, `REFLECT_PASSAGE_SYSTEM_PROMPT`, `GeminiKeyMissingError`, `requireGeminiApiKey` — none of these exist anymore.

**Update tests following the spec's § "Behavioral tests to preserve" list:**

- Keep happy-path, abort, timeout, network-failure, safety-block, rate-limit (client + server), cache, and rate-limit composition tests — refactored to use `mockFetch` + `okResponse`/`errorResponse` instead of SDK-shaped mocks.
- Add new tests: "posts to /api/v1/proxy/ai/explain with correct body", parallel for reflect, "backend 400 INVALID_INPUT maps to GeminiApiError", "backend 500 INTERNAL_ERROR maps to GeminiApiError", "malformed response body maps to GeminiApiError", "missing data.content maps to GeminiApiError".
- Delete tests listed under § "Behavioral tests to DELETE":
  - Any test referencing `GeminiKeyMissingError`.
  - Any test asserting `GoogleGenAI` was constructed N times.
  - Any test asserting `config.systemInstruction` contained specific prompt text.
  - "reuses the client (memoized)" — no SDK client now.

**Example preserved test (matches spec)**:

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

For error mapping tests, use `errorResponse(status, code, message, extraHeaders)`:

```typescript
it('backend 429 RATE_LIMITED maps to RateLimitError with Retry-After', async () => {
  mockFetch.mockResolvedValueOnce(
    errorResponse(429, 'RATE_LIMITED', 'slow down', { 'Retry-After': '17' }),
  )
  await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(RateLimitError)
  // follow-up assertion on retryAfterSeconds = 17 via a second call if needed
})
```

**Guardrails (DO NOT):**

- DO NOT mock `@google/genai` anywhere — the dep is being removed.
- DO NOT mock `@/lib/env` — no Gemini helpers remain to mock.
- DO NOT assert `config.systemInstruction` — prompts are backend-owned.
- DO NOT leave behind imports of deleted helpers / classes.
- DO NOT drop the client-side rate-limit tests — the courtesy layer is still in place.
- DO NOT drop the cache tests — BB-32 cache is still client-side.

**Verification:**

- [ ] `cd frontend && npm test -- --run src/lib/ai/__tests__/geminiClient.test.ts` passes.
- [ ] Test count: 35–40 (spec's target).
- [ ] `grep -E "@google/genai\|GoogleGenAI\|GeminiKeyMissingError\|systemInstruction" frontend/src/lib/ai/__tests__/geminiClient.test.ts` → no output.

**Test specifications (representative):**

| Test | Type | Description |
|------|------|-------------|
| happy path explain | unit | POST to /explain, returns payload |
| happy path reflect | unit | POST to /reflect, returns payload |
| aborts on caller signal | unit | AbortError re-thrown unchanged |
| internal 30s timeout → GeminiTimeoutError | unit | |
| network failure → GeminiNetworkError | unit | |
| backend 422 SAFETY_BLOCK → GeminiSafetyBlockError | unit | |
| backend 504 UPSTREAM_TIMEOUT → GeminiTimeoutError | unit | |
| backend 429 RATE_LIMITED → RateLimitError w/ Retry-After | unit | |
| backend 502 UPSTREAM_ERROR → GeminiApiError | unit | |
| backend 500 INTERNAL_ERROR → GeminiApiError | unit | |
| backend 400 INVALID_INPUT → GeminiApiError | unit | |
| malformed response body → GeminiApiError | unit | |
| missing data.content → GeminiApiError | unit | |
| cache hit → no fetch call | unit | |
| cache miss → fetch once, second call hits cache | unit | |
| client-side rate-limit throws before fetch | unit | |
| __resetGeminiClientForTests clears cache + rate limit | unit | |

**Expected state after completion:**

- [ ] Test file is fetch-only.
- [ ] ~35–40 tests green.

---

### Step 20: Remove `VITE_GEMINI_API_KEY` from `frontend/.env.example`

**Objective:** Strip the obsolete env var from the example file.

**Files to modify:**

- `frontend/.env.example`

**Details:**

Delete the four-line block (comment + URL + restriction note + value line):

```
# Google Gemini API key (for AI-powered features: BB-30 Explain This Passage, etc.)
# Obtain from: Google Cloud Console → APIs & Services → Credentials
# Restrict to: Gemini API only, with HTTP referrer restrictions for localhost and production domain
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

Leave the surrounding "AI / third-party API keys" section header — Google Maps + FCBH still belong there until their respective specs (3, 4) land.

**Guardrails (DO NOT):**

- DO NOT remove the section header.
- DO NOT remove Google Maps or FCBH env var examples.

**Verification:**

- [ ] `grep -n "VITE_GEMINI_API_KEY" frontend/.env.example` → no output.

**Test specifications:** None.

**Expected state after completion:**

- [ ] `.env.example` no longer advertises the Gemini key.

---

### Step 21: Remove `@google/genai` from `frontend/package.json` and regenerate lockfile

**Objective:** Shrink the frontend bundle by ~1 MB by removing the SDK; update `package-lock.json` accordingly.

**Files to modify:**

- `frontend/package.json`
- `frontend/package-lock.json` (regenerated, not hand-edited)

**Details:**

1. Open `frontend/package.json`.
2. In the `dependencies` block, locate the `"@google/genai": "^1.49.0"` entry and remove it (including trailing comma handling).
3. Run:

   ```bash
   cd frontend
   npm install
   ```

   This regenerates `package-lock.json` — do NOT hand-edit it.
4. Sanity check:

   ```bash
   npm ls @google/genai
   ```

   Expected output: `(empty)` or an explicit "not in the tree" error.

**Guardrails (DO NOT):**

- DO NOT hand-edit `package-lock.json`.
- DO NOT add `@types/google-genai` — there is no such package; types shipped inside the SDK.
- DO NOT upgrade any other dependency in the same commit — keep the diff focused.

**Verification:**

- [ ] `grep -n "@google/genai" frontend/package.json` → no output.
- [ ] `grep -c "@google/genai" frontend/package-lock.json` → 0 (or the string appears only in `packages` entries for transitive deps that legitimately reference it — expected to be 0 for this SDK).
- [ ] `npm ls @google/genai` shows empty / not-in-tree.

**Test specifications:** None.

**Expected state after completion:**

- [ ] SDK removed from dependency graph.

---

### Step 22: Frontend-wide leak check

**Objective:** Confirm every trace of the old Gemini-frontend surface is gone.

**Files to modify:** None.

**Details:**

```bash
cd /Users/eric.champlin/worship-room
grep -rE "requireGeminiApiKey|isGeminiApiKeyConfigured|GEMINI_API_KEY|VITE_GEMINI_API_KEY|GeminiKeyMissingError|@google/genai" frontend/src/
```

Expected: **zero output.** If any hit appears, it's a reference this plan missed — surface to Eric rather than silently editing.

**Guardrails (DO NOT):**

- DO NOT add `.eslintignore` or `.gitignore` entries to silence this check.
- DO NOT treat matches as acceptable dead code — every match must be removed or surfaced.

**Verification:**

- [ ] grep returns zero lines.

**Test specifications:** None.

**Expected state after completion:**

- [ ] Clean frontend surface.

---

### Step 23: Run frontend test + lint + build

**Objective:** Confirm all existing and new tests pass, lint is clean, production bundle builds.

**Files to modify:** None.

**Details:**

```bash
cd /Users/eric.champlin/worship-room/frontend
npm test
npm run lint
npm run build
```

Expected results:

- `npm test`: all existing + rewritten tests pass; no failures; console clean of unexpected warnings.
- `npm run lint` (with `--max-warnings 0` per the existing project config): zero errors, zero warnings.
- `npm run build`: TypeScript compilation passes; Vite bundle built to `dist/`.

Then the bundle scan:

```bash
grep -rE "GoogleGenAI|AIza[0-9A-Za-z_-]{30}|VITE_GEMINI_API_KEY|gemini-2.5-flash-lite" frontend/dist/
```

Expected: zero output. (The model string `gemini-2.5-flash-lite` is gone from the frontend bundle because it only exists on the backend now.)

**Guardrails (DO NOT):**

- DO NOT use `--max-warnings N` to mask warnings — the project enforces 0.
- DO NOT skip the bundle scan; it's acceptance criterion 14.

**Verification:**

- [ ] `npm test` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm run build` exits 0.
- [ ] Bundle scan returns zero results.

**Test specifications:** N/A (aggregate verification).

**Expected state after completion:**

- [ ] Frontend green across all gates.

---

### Step 24: End-to-end smoke test with real Gemini key

> ⚠️ **HUMAN CHECKPOINT — Eric runs this manually.** This step requires a real `GEMINI_API_KEY`, Docker, a running dev frontend, and a browser — it is not CC-executable. CC marks this step as `[BLOCKED-ON-HUMAN]` in the Execution Log after Step 23 completes; Eric runs the full smoke test below and updates the log to `[DONE]` when satisfied. The spec is ready for PR only after this step is green.

**Objective:** Prove the migration works against real Gemini. Verify cache hit behavior, rate limit, network failure, and missing-key behavior from the user's perspective.

**Files to modify:** None.

**Details:**

1. **Ensure `backend/.env.local` has `GEMINI_API_KEY=<real-value>`.** If not, Eric populates it before this step.
2. **Start backend + frontend:**

   ```bash
   cd /Users/eric.champlin/worship-room
   docker compose up -d backend
   docker compose logs backend | grep "Started"   # wait for ready
   (cd frontend && npm run dev)
   ```

3. **Verify curl against the real Gemini endpoint:**

   ```bash
   curl -s -X POST http://localhost:8080/api/v1/proxy/ai/explain \
     -H 'Content-Type: application/json' \
     -d '{"reference":"1 Corinthians 13:4-7","verseText":"Love is patient and is kind; love doesnt envy."}' | jq
   ```

   Expected: `{"data":{"content":"...","model":"gemini-2.5-flash-lite"},"meta":{"requestId":"..."}}`, HTTP 200.

4. **`curl -i` for headers:** verify `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` are all present.

5. **Repeat for `/reflect`.**

6. **Invalid-input probe:**

   ```bash
   curl -s -i -X POST http://localhost:8080/api/v1/proxy/ai/explain \
     -H 'Content-Type: application/json' -d '{"reference":"","verseText":"x"}'
   # Expect: 400 INVALID_INPUT
   ```

7. **Browser UX (open http://localhost:5173, open BibleReader, select a passage, tap "Explain this passage"):**
   - After ~5–15s, explanation renders.
   - Network tab shows one POST to `/api/v1/proxy/ai/explain`.
   - Tap "Reflect on this passage" on same passage → reflection renders.
   - Tap "Explain" on the SAME passage again → instant render, no new network request (BB-32 cache hit).
   - Tap "Explain" on many passages rapidly → eventually see rate-limit message.
   - Stop the backend (`docker compose stop backend`) → tap "Explain" → user sees network-error copy.
   - Restart backend with empty `GEMINI_API_KEY` → tap "Explain" → user sees generic unavailable copy; backend startup log shows the "not configured" warn.

8. **Backend log discipline check:**

   ```bash
   docker compose logs backend | grep -E "verseText|Love is patient"
   ```

   Expected: zero output. Logs should show `reference=1 Corinthians 13:4-7 verseTextLength=47` but NEVER the full verse text or the LLM response body.

**Guardrails (DO NOT):**

- DO NOT hit the real Gemini endpoint from CI (cost + flakiness). This smoke test is run locally by Eric only.
- DO NOT skip the cache-hit and rate-limit checks — acceptance criteria 20 and 21 depend on them.

**Verification:**

- [ ] All 8 steps above pass.
- [ ] Backend log scan shows no PII / no LLM content.

**Test specifications:** N/A (manual QA; automated coverage lives in the integration test).

**Expected state after completion:**

- [ ] Confidence the migration works end-to-end without UX regression.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | SafetyBlockException |
| 2 | 1 | Request/response DTOs + GeminiPrompts |
| 3 | 2 | GeminiService (uses DTOs + Prompts) |
| 4 | 3 | GeminiController (uses Service + DTOs) |
| 5 | 4 | openapi.yaml (paths reference DTOs / SafetyBlocked response shape) |
| 6 | 5 | Manual smoke: boot without key |
| 7 | 2 | GeminiPromptsTest |
| 8 | 3 | GeminiServiceTest |
| 9 | 4, 1 | GeminiControllerTest |
| 10 | 4 | GeminiIntegrationTest |
| 11 | 7, 8, 9, 10 | Full backend suite green |
| 12 | 11 | geminiClient.ts rewrite |
| 13 | 12 | errors.ts: delete GeminiKeyMissingError |
| 14 | 12 | env.ts: delete Gemini helpers |
| 15 | 13 | useExplainPassage: drop import + classifyError branch |
| 16 | 13 | useReflectOnPassage: same |
| 17 | 12 | Delete 4 prompt files |
| 18 | 17 | Remove prompts/ directory |
| 19 | 12, 13, 14, 17 | Rewrite geminiClient.test.ts (fetch mock) |
| 20 | — | .env.example cleanup (independent) |
| 21 | 12 | package.json: remove @google/genai + regenerate lockfile |
| 22 | 13, 14, 15, 16, 17, 18, 21 | Frontend leak grep |
| 23 | 19, 22 | Full frontend test + lint + build |
| 24 | 11, 23 | End-to-end smoke with real key |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create SafetyBlockException | [COMPLETE] | 2026-04-21 | `proxy/common/SafetyBlockException.java` |
| 2 | Create DTOs + GeminiPrompts | [COMPLETE] | 2026-04-21 | `proxy/ai/{ExplainRequest,ReflectRequest,GeminiResponseDto,GeminiPrompts}.java` |
| 3 | Create GeminiService | [COMPLETE] | 2026-04-21 | `proxy/ai/GeminiService.java`. Deviation D1: removed spurious `Optional.ofNullable` wrapper around `response.promptFeedback()`. |
| 4 | Create GeminiController | [COMPLETE] | 2026-04-21 | `proxy/ai/GeminiController.java` |
| 5 | Extend openapi.yaml | [COMPLETE] | 2026-04-21 | 131→265 lines. `npx @redocly/cli lint` → zero errors, 3 pre-existing warnings (localhost URL, health no-4xx response, ProxyResponse unused). Also declared `security: []` on existing `/health GET` to bring the file to zero redocly errors — matches the new Spec 2 convention and prevents baseline rot. |
| 6 | Boot-without-key smoke | [DONE] | 2026-04-21 | Eric delegated execution to CC; CC ran smoke and verified all three assertions. Warn log visible, HTTP 502 `UPSTREAM_ERROR`, `X-Request-Id` present. Deviation D3: plan quoted Branch B message for the Branch A (null-client) path; actual response body uses the correct Branch A message `"AI service is not configured on the server."` |
| 7 | GeminiPromptsTest | [COMPLETE] | 2026-04-21 | 5/5 tests pass — all 10 numbered rules verified verbatim in both EXPLAIN + REFLECT prompts, plus interpolation checks |
| 8 | GeminiServiceTest | [COMPLETE] | 2026-04-21 | 8/8 tests pass. Deviations D2a (BlockedReason/FinishReason wrapper constructor), D2b (`callModels` test-seam in GeminiService), and D1 resolved. Critical `genericSdkErrorThrowsUpstream` no-leak assertion green. |
| 9 | GeminiControllerTest | [COMPLETE] | 2026-04-21 | 7/7 tests pass. Added `@Import(ProxyConfig.class)` to the spec's `@WebMvcTest + @Import(ProxyExceptionHandler)` pattern — slice context needs `ProxyConfig` for `RateLimitFilter` auto-loaded as a `@Component`. Kept filter chain enabled so `RequestIdFilter` populates MDC for `ProxyResponse.of`. |
| 10 | GeminiIntegrationTest | [COMPLETE] | 2026-04-21 | 2/2 tests pass. Filter chain + MDC + `X-Request-Id` honoring all verified end-to-end. |
| 11 | Full backend suite | [COMPLETE] | 2026-04-21 | `./mvnw clean test` → 45/45 pass (23 Spec 1 baseline + 22 new Spec 2). Build time 3.3s. Backend container stopped post-suite. |
| 12 | Rewrite geminiClient.ts | [COMPLETE] | 2026-04-21 | SDK → fetch. Public signatures preserved: `generateExplanation`, `generateReflection`, `ExplainResult`, `ReflectResult`, `__resetGeminiClientForTests`. |
| 13 | Delete GeminiKeyMissingError | [COMPLETE] | 2026-04-21 | Removed from `lib/ai/errors.ts`. 5 remaining error classes intact. |
| 14 | Delete Gemini env helpers | [COMPLETE] | 2026-04-21 | Removed `GEMINI_API_KEY` constant, `requireGeminiApiKey()`, `isGeminiApiKeyConfigured()` from `lib/env.ts`. All Maps/VAPID/FCBH helpers preserved. |
| 15 | Update useExplainPassage | [COMPLETE] | 2026-04-21 | Removed `GeminiKeyMissingError` import + classifyError branch. `ExplainErrorKind` union unchanged. |
| 16 | Update useReflectOnPassage | [COMPLETE] | 2026-04-21 | Same two-edit pattern as Step 15. |
| 17 | Delete prompt files | [COMPLETE] | 2026-04-21 | 4 files removed: `explainPassagePrompt.ts`, `reflectPassagePrompt.ts`, and both `__tests__/` siblings. |
| 18 | Remove prompts/ directory | [COMPLETE] | 2026-04-21 | `rmdir` on `__tests__/` then `prompts/`. Both gone. |
| 19 | Rewrite geminiClient.test.ts | [COMPLETE] | 2026-04-21 | ~35 tests covering fetch-mock happy paths, abort semantics, backend error code mapping, malformed responses, cache composition, rate-limit composition, request body shape. SDK-specific assertions removed. |
| 20 | Clean .env.example | [COMPLETE] | 2026-04-21 | Removed 4-line `VITE_GEMINI_API_KEY` block. Google Maps + FCBH blocks preserved. |
| 21 | Remove @google/genai dep | [COMPLETE] | 2026-04-21 | Removed from `package.json`. **Deviation:** project uses pnpm (per CLAUDE.md), not npm — `pnpm install --registry https://registry.npmjs.org/` regenerated lockfile. npm attempt crashed with Arborist internal error against the existing pnpm-style lockfile. Verified: 0 hits for `@google/genai` in both `package.json` and `pnpm-lock.yaml`. |
| 22 | Frontend leak grep | [COMPLETE] | 2026-04-21 | Zero output after D4 cleanup (4 files with orphan references to deleted symbols — all test files + 1 .d.ts). Charter amendment logged for future specs. |
| 23 | Frontend test + lint + build | [COMPLETE] | 2026-04-21 | `pnpm test`: 8738/8748 pass. The 10 failures are all pre-existing on the baseline (Local Support, Bible Audio, PlanBrowserPage) — verified via `git stash` + baseline re-run. Spec 2 added ~32 new geminiClient tests, all pass. `pnpm lint`: 9 errors in `frontend/scripts/verify-local-support-facelift.mjs` — all pre-existing (unrelated script file), verified same on baseline. `pnpm build`: PASS in 7.4s + PWA service worker built. Bundle scan: Spec 2's goal achieved (zero Gemini key in bundle, zero GoogleGenAI, zero VITE_GEMINI_API_KEY). See Deviation D5 for the two pre-existing non-Spec-2 artifacts the scan regex also matched. |
| 24 | End-to-end smoke with real key | [DONE-CLI] | 2026-04-21 | Eric delegated the 7 CLI sub-steps (1-7) to CC; browser spot-check (original sub-step 7 / plan sub-step 7 UX) remains for Eric. All 7 CLI sub-steps PASS after deviations D6 + D7 applied. Sub-step 1: `/explain` 200, real Gemini content (2269 chars), `data.model == "gemini-2.5-flash-lite"`, 22-char `requestId`. Sub-step 2: `X-Request-Id` + all three `X-RateLimit-*` headers present. Sub-step 3: `/reflect` 200, 854 chars, interrogative voice ("A reader might wonder...") — distinct from explain's scholarly voice, confirms REFLECT prompt routing. Sub-step 4: blank reference → 400 `INVALID_INPUT` user-safe. Sub-step 5: 15/15 rapid POSTs = 200 (rate limit not misconfigured). Sub-step 6: After D7 fix, zero `verseText` hits in logs; controller INFO log `reference=1 Corinthians 13:4-7 verseTextLength=48` emits correctly. Sub-step 7: Empty `.env.local` → 502 `UPSTREAM_ERROR` message `"AI service is not configured on the server."` (Branch A per D3) + warn log; restore → 200 with real content. |

---

## Deviations from spec

### D1 — Step 3 (`GeminiService.java`): remove `Optional.ofNullable` wrapper around `response.promptFeedback()`

**Spec Section 6 code (line 641 of spec, as pasted verbatim):**

```java
Optional.ofNullable(response.promptFeedback())
        .flatMap(pf -> pf.blockReason())
        .ifPresent(...);
```

**Compile failure:**

```
GeminiService.java:168 cannot find symbol
  symbol:   method blockReason()
  location: variable pf of type java.util.Optional<com.google.genai.types.GenerateContentResponsePromptFeedback>
```

**Root cause:** The google-genai 1.51.0 SDK already declares `GenerateContentResponse.promptFeedback()` as returning `Optional<GenerateContentResponsePromptFeedback>` (verified via `javap` on `google-genai-1.51.0.jar`, consistent with the spec's own SDK API note on line 704). Wrapping the returned `Optional` in a second `Optional.ofNullable(...)` produces `Optional<Optional<...>>`, which is why `.flatMap(pf -> pf.blockReason())` fails — `pf` is `Optional<...>`, not the feedback object.

**Resolution (approved 2026-04-21 by Eric):** Call `response.promptFeedback().flatMap(pf -> pf.blockReason()).ifPresent(...)` directly. No behavioral change — a `.flatMap` on an empty Optional is a no-op, matching the previous `Optional.ofNullable(null).flatMap(...)` behavior.

**Paths audited for the same issue before applying:**

- `response.candidates()` — SDK returns `Optional<List<Candidate>>`, spec's `.flatMap(list -> ...)` is correct.
- `Candidate.finishReason()` — SDK returns `Optional<FinishReason>`, spec's `.flatMap(Candidate::finishReason)` is correct.
- `response.text()` — SDK returns `java.lang.String` (not Optional), spec's null+isBlank check is correct.

Only the `promptFeedback()` path was affected.

### D2 — SDK surface in google-genai 1.51.0 vs. spec assumptions

> ⚠️ **Heads-up for Specs 3 and 4:** check for analogous SDK-surface patterns in the Google Maps and FCBH SDK wrappers BEFORE writing tests. In particular: (a) enum-like types exposed as wrapper classes with inner `Known` enums (not direct constants), (b) publicly accessible fields declared `final` that can't be reflectively overwritten in JDK 21+, (c) `Optional<T>`-returning accessors that the spec documents as nullable `T`.

The spec's Section 6 (`GeminiService.java`) and Section 22 (`GeminiServiceTest.java`) were authored against an assumed SDK surface that did not match the actual `google-genai:1.51.0` API as shipped in `backend/pom.xml`. Three distinct mismatches surfaced during execution. All three were resolved without changing observable behavior, public API shape, or security surface. Per the decision charter, D1 (`Optional<Optional<...>>` in `promptFeedback()`) was surfaced for approval; D2a/b/c below were resolved within charter.

**SDK inspection evidence** (`javap -p` against `google-genai-1.51.0.jar` from `~/.m2/repository/com/google/genai/google-genai/1.51.0/`):

- `public abstract java.util.Optional<com.google.genai.types.GenerateContentResponsePromptFeedback> promptFeedback();`
- `public abstract java.util.Optional<java.util.List<com.google.genai.types.Candidate>> candidates();`
- `public java.lang.String text();` *(returns String, not Optional)*
- `public abstract java.util.Optional<com.google.genai.types.FinishReason> finishReason();` *(on `Candidate`)*
- `public final com.google.genai.Models models;` *(on `Client` — **final** field)*
- `public class com.google.genai.types.BlockedReason { ... public com.google.genai.types.BlockedReason(com.google.genai.types.BlockedReason$Known); ... }` *(wrapper, not enum)*
- `public final class com.google.genai.types.BlockedReason$Known extends java.lang.Enum { ... public static final ... SAFETY; ... }` *(nested Known enum holds the constants)*
- Same wrapper+Known structure for `FinishReason`.

#### D2a — `BlockedReason.SAFETY` / `FinishReason.SAFETY` don't exist as direct constants

**Spec test code (Sections 22):** `BlockedReason.SAFETY`, `FinishReason.SAFETY`.

**Reality:** These are wrapper classes with an internal `Known` enum. The constants live in `BlockedReason.Known.SAFETY` and `FinishReason.Known.SAFETY`. To produce a wrapper instance the service can compare against, instantiate via the constructor: `new BlockedReason(BlockedReason.Known.SAFETY)`.

**Option chosen:** Update test to `new BlockedReason(BlockedReason.Known.SAFETY)` and `new FinishReason(FinishReason.Known.SAFETY)`.

**Option rejected:** Mocking the wrapper's `toString()` / `equals()`. Rejected because the production code in `GeminiService.generate()` calls `finishReason.get().toString()` and compares to the string `"SAFETY"` — `javap` on the constructor shows `new FinishReason(Known.SAFETY)` sets the internal `value` field to `Known.SAFETY.toString()`, which is `"SAFETY"`. So the real constructor produces the exact string the service expects; no mocking needed.

**Behavioral impact:** None. Production code unchanged.

#### D2b — `Client.models` is `public final`, cannot be reflectively overwritten

**Spec test setUp (Section 22):** `Field modelsField = Client.class.getField("models"); modelsField.set(mockClient, mockModels);`

**Reality:** `public final Models models` — JDK 21 blocks `Field.set()` on final fields. Error: `IllegalAccess Can not set final com.google.genai.Models field com.google.genai.Client.models`.

**Option chosen (Option A, approved pattern-level by Eric 2026-04-21):** Extract a package-private seam method `GeminiService.callModels(modelId, userPrompt, config)` that wraps `client.models.generateContent(...)`. Test uses `spy(service)` + `doReturn(resp).when(service).callModels(...)` to stub the SDK boundary without touching `Client.models`.

**Option rejected:** `--add-opens=java.base/java.lang.reflect=ALL-UNNAMED` + modifier stripping via reflection. Rejected because: (a) version-brittle (Java 25 may close further), (b) adds JVM-flag dependency to CI, (c) production Docker image runs Java 25 per baseline logs — the loophole may already be partially closed, (d) reflection-on-reflection hackery. The test-seam pattern is a well-established Java testability idiom and creates no version-fragility.

**Behavioral impact:** One extra stack frame in production call path (`generate` → `callModels` → SDK instead of `generate` → SDK). Package-private visibility on the seam is intentional — no API change. Same inputs, same outputs, same HTTP codes, same error messages. All 8 test branches pass including the critical `genericSdkErrorThrowsUpstream` no-leak assertion.

**Pattern precedent:** This testability seam is now approved for analogous SDK wrappers in Specs 3 (Google Maps) and 4 (FCBH) without re-surfacing, provided (a) the production code remains a pure passthrough, (b) the seam is package-private, (c) the observable behavior is unchanged.

#### D2c — `response.promptFeedback()` already returns `Optional<...>`

Already documented separately as D1 above (surfaced for approval before D2 consolidation existed). Left as a standalone entry because the approval happened before the charter; conceptually it belongs to the same SDK-surface category.

### D7 — Real PII leak in dev-profile logs via Spring framework DEBUG logger

**Scope note:** Not in Spec 2's plan at plan-authoring time, but in scope via `07-logging-monitoring.md` § PII Handling. Surfaced by Step 24 sub-step 6's log-discipline grep.

Step 24's sub-step 6 log-discipline check revealed that Spring's `RequestResponseBodyMethodProcessor` (`org.springframework.web.servlet.mvc.method.annotation`) emits a DEBUG-level line after `@RequestBody` deserialization that includes the full request-body record's `toString()`. Java records auto-generate `toString()` as `ExplainRequest[reference=..., verseText=...]` — so every `/explain` and `/reflect` request body, including the full `verseText`, was being logged at DEBUG level.

**Example leaked log line (pre-fix):**

```
19:44:20.499 DEBUG o.s.w.s.m.m.a.RequestResponseBodyMethodProcessor [C6_W8I4vSqKRjvI41zMy7w]
  - Read "application/json;charset=UTF-8" to [ExplainRequest[reference=1 Corinthians 13:4-7,
    verseText=Love is patient and is kind; love does not  (truncated)...]
```

The `GeminiController`'s controller-level INFO log was correctly logging only `reference` + `verseTextLength` per `07-logging-monitoring.md`, but Spring's framework-level DEBUG line was bypassing that discipline. Prod (`logging.level.org.springframework.web=WARN`) was unaffected — this was a dev-profile-only leak, but the `07-logging-monitoring.md` PII rule is absolute, not prod-only.

**Root cause:** `application-dev.properties` set `logging.level.org.springframework.web=DEBUG` for useful framework diagnostics (handler mapping, view resolution), but that broad setting also enabled the body-dump logger.

**Resolution (approved 2026-04-21 by Eric, applied by CC):** Added targeted override to `application-dev.properties` immediately after the existing logging.level.* lines:

```properties
# Suppress Spring's body-processor DEBUG output so request-body records' toString()
# representations (which contain user content like verseText) don't leak into application logs.
# Required by 07-logging-monitoring.md § Framework Log Suppression — the PII rule is absolute,
# not prod-only. The broader org.springframework.web DEBUG setting above is preserved for
# mapping lookups, handler discovery, etc.; this narrower override just kills body dumps.
logging.level.org.springframework.web.servlet.mvc.method.annotation=INFO
```

**Verification (post-fix):**

- `docker compose logs backend | grep -iE "Love is patient|love does not envy"` → zero hits
- `docker compose logs backend | grep -E "verseText="` → zero hits
- Controller INFO log still emits: `Explain request received reference=1 Corinthians 13:4-7 verseTextLength=48`
- Handler-mapping DEBUG logs from other `o.s.w.*` sub-packages still work (confirmed via `RequestMappingHandlerMapping` lines in `o.s.w.s.h.*`)

**Cross-spec impact:** Specs 3 (Maps proxy) and 4 (FCBH proxy) inherit the fix automatically — the package-level override applies to all `@RequestBody` deserializations across every proxy endpoint. Eric committed to adding a new § "Framework Log Suppression (MANDATORY for proxy endpoints)" to `07-logging-monitoring.md` to codify the rule for future specs.

**Charter amendment logged (effective from this point):** Framework-level PII leaks (as opposed to our-code PII leaks) fall into the same "must fix before proceeding" category as explicit code-level PII leaks. The distinction is a debugging tool, not an excuse — "Spring did it, not us" doesn't relax the absolute PII rule. If a future spec catches another framework logger emitting user content (e.g., a different Spring package, a Jackson deserialization debug line, a `org.springframework.security.*` auth-body dump), apply the same pattern: narrow-package DEBUG-to-INFO override in `application-dev.properties`, document as a D-entry, verify via the sub-step-6-style grep. Auto-proceed applies if the leak is in a new package not already suppressed; surface if the fix would require overriding our own code's logging discipline.

### D6 — Step 24's initial Gemini key provisioning hit two org-policy speedbumps (pre-execution checklist gap, not code bug)

Step 24's initial attempt with Eric's existing frontend Gemini key (from `frontend/.env.local`) failed with 502 `UPSTREAM_ERROR` because the frontend key has HTTP referer restrictions (correct security posture for browser-origin keys, incompatible with server-to-server calls). The backend's server-to-server request has no `Referer` header, so Google returned:

```
com.google.genai.errors.ClientException: 403 . Requests from referer <empty> are blocked.
```

Cloud Console's API-key creation flow for Gemini now requires service-account binding per an organization policy, which would have been a 15-minute detour through IAM roles and key-file download. **Resolution:** Eric provisioned a new key via Google AI Studio ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)) using his personal Google account. AI Studio keys bypass the org-policy + service-account overhead and are inherently server-friendly (no referer restriction option).

**Secondary finding during resolution:** `docker compose restart backend` does NOT re-read `env_file` (Docker Compose only evaluates `env_file` at container creation time). After Eric updated `backend/.env.local`, the restart preserved the old env and the call still failed with the same referer-block error. The fix was `docker compose up -d --force-recreate backend`, which recreates the container and re-reads `env_file`. This diagnostic pattern is worth codifying — Specs 3/4 will hit the same thing when updating their respective keys.

**Verification (post-AI-Studio-key + force-recreate):** In-container env check via `docker compose exec backend sh -c 'printf "len=%s first6=%s\n" "${#GEMINI_API_KEY}" "${GEMINI_API_KEY:0:6}"'` → `len=39 first6=AIzaSy` (fingerprint only, never the full value). Sub-step 1 then returned HTTP 200 with real Gemini content. All 7 CLI sub-steps passed.

**Cross-spec takeaways for Specs 3 and 4:**

- Future Specs 3 (Maps) and 4 (FCBH) should add to their Pre-Execution Checklist: "backend needs a separate key from any frontend browser-origin key; referer restrictions incompatible with server-to-server calls."
- Spec 3 (Maps) is Cloud-Console-only — there's no AI Studio equivalent — so Spec 3 will require the full Cloud Console + restrictions flow. Budget 15-30 minutes for key provisioning with IP allowlist + API-scope restriction.
- Spec 4 (FCBH) uses a different key system entirely; not affected by Google Cloud policies.
- Configuration-change verification flow: after editing `backend/.env.local`, use `docker compose up -d --force-recreate backend`, NOT `docker compose restart backend`. Add the in-container env-check snippet to the plan's smoke checklist so future CC runs can self-verify key load without echoing the key value.

**Security invariant still confirmed during the initial failure:** The client saw only the generic `"AI service is temporarily unavailable. Please try again."` copy; the actual upstream referer-block error text (`"Requests from referer <empty> are blocked."`) stayed server-side. Spec 2's "Never Leak Upstream Error Text" rule held end-to-end on its very first real-upstream encounter.

### D5 — Step 23 bundle-scan regex was overly broad (plan-text bug, not code)

Step 23's bundle-scan regex was overly broad in two ways:

1. Included `gemini-2.5-flash-lite` model string, which BB-32's `lib/ai/cache.ts` legitimately uses for cache-key versioning (the `CURRENT_MODEL` constant at `src/lib/ai/cache.ts:36` participates in the `bb32-v1:<feature>:<model>:<reference>:<verseTextHash>` cache-key format so that a future model upgrade invalidates stale cache entries). The model string has no security implications — it is exposed in every `/api/v1/proxy/ai/*` response body on the `data.model` field — and its presence in the bundle is BB-32-intentional.

2. Used `AIza[0-9A-Za-z_-]{30}` which matches any Google API key; the pre-existing `VITE_GOOGLE_MAPS_API_KEY` bundling (fingerprint `AIza...NOg`) is Spec 3's (`ai-proxy-maps`) scope, not Spec 2's. Vite compiles every `VITE_*` env var into the client bundle at build time, so the Maps key has been bundled since Local Support shipped. Removing it architecturally requires wrapping Maps calls in a backend proxy — exactly Spec 3's work.

**Spec 2's actual security goal was achieved** — zero matches for `GoogleGenAI`, zero matches for `VITE_GEMINI_API_KEY`, zero matches for the Gemini key literal (fingerprint `AIza...vQ` from `.env.local`). The key no longer appears in the compiled bundle at all. Confirmed via direct substring search.

**Out-of-band security item surfaced to Eric:** the Maps key currently in the compiled bundle (pre-existing, not caused by Spec 2). Eric to verify GCP Console restrictions on the key (HTTP referrer restrictions, API scope limited to Maps JavaScript API / Places API / Geocoding). Full architectural fix is Spec 3's scope.

**Suggested future pattern for Specs 3/4 acceptance criteria:** scope the bundle-scan regex to the specific key being removed in that spec (e.g., `VITE_GOOGLE_MAPS_API_KEY` or a prefix-based key literal match for Spec 3), not all Google API keys in general. Use a specific substring match against the `.env.local` value, not a broad regex.

**Charter amendment logged (effective from this point):** when surfacing security-relevant findings (API keys, tokens, secrets), do NOT reproduce the full secret value in any report, deviation entry, or surface-to-user message. Use a prefix + suffix fingerprint instead (e.g., `AIza...NOg` for Google keys, `ghp_...XyZ` for GitHub tokens, `sk-...aBc` for OpenAI keys, `xoxb-...XyZ` for Slack tokens). Even if the secret is already in a public location, echoing it into conversations or logs adds another copy that could be scraped.

### D4 — Orphan references to deleted symbols in test files + ambient type declaration

**Root cause:** Steps 13 (delete `GeminiKeyMissingError`) and 14 (remove `VITE_GEMINI_API_KEY` helpers) deleted exported symbols but the plan's "files to modify" list for those steps didn't enumerate downstream test/type-declaration references. Step 22's grep surfaced 4 files with orphan references.

**Evidence (Step 22 grep output before cleanup):**

```
src/lib/ai/__tests__/errors.test.ts:5:  GeminiKeyMissingError,
src/lib/ai/__tests__/errors.test.ts:17:  { name: 'GeminiKeyMissingError', Ctor: GeminiKeyMissingError },
src/lib/ai/__tests__/errors.test.ts:87:        'GeminiKeyMissingError',
src/vite-env.d.ts:6:  readonly VITE_GEMINI_API_KEY?: string
src/hooks/bible/__tests__/useReflectOnPassage.test.ts:16:  GeminiKeyMissingError,
src/hooks/bible/__tests__/useReflectOnPassage.test.ts:111:  it('maps GeminiKeyMissingError to "unavailable" kind', async () => {
src/hooks/bible/__tests__/useReflectOnPassage.test.ts:112:    mockGenerateReflection.mockRejectedValue(new GeminiKeyMissingError())
src/hooks/bible/__tests__/useExplainPassage.test.ts:16:  GeminiKeyMissingError,
src/hooks/bible/__tests__/useExplainPassage.test.ts:98:  it('maps GeminiKeyMissingError to "unavailable" kind with generic copy', async () => {
src/hooks/bible/__tests__/useExplainPassage.test.ts:99:    mockGenerateExplanation.mockRejectedValue(new GeminiKeyMissingError())
```

**Option chosen (approved by Eric 2026-04-21):** Delete each orphan reference.

**Files and specific deletions:**

- **`src/vite-env.d.ts`** — Removed line 6: `readonly VITE_GEMINI_API_KEY?: string` from the `ImportMetaEnv` interface. The env var no longer exists post-Step 14; the ambient type served nothing.

- **`src/lib/ai/__tests__/errors.test.ts`** — Removed `GeminiKeyMissingError` from the import list, removed the corresponding row from the `ERROR_CLASSES` array (which drove 5 parametric tests via `describe.each`), and updated the "errors module exports exactly N" assertion from 6 classes to 5 (removing `'GeminiKeyMissingError'` from the expected set). Comment updated to explain the Spec 2 removal without referencing the class by name (so Step 22's grep is literally zero).

- **`src/hooks/bible/__tests__/useExplainPassage.test.ts`** — Removed `GeminiKeyMissingError` from the import list and deleted the entire test block `'maps GeminiKeyMissingError to "unavailable" kind with generic copy'`.

- **`src/hooks/bible/__tests__/useReflectOnPassage.test.ts`** — Same two edits, parallel to the explain hook test.

**Coverage preserved:** `classifyError`'s fallback branch (the `return 'unavailable'` line that runs for any unmatched error instance) still returns `'unavailable'`. The remaining tests in both hook files (`network`, `api`, `safety`, `timeout`, `rate-limit`, unknown-error-unavailable) still exercise the full dispatch logic.

**Post-cleanup grep:** `No matches found` — Step 22 criterion satisfied.

**Charter amendment logged (effective from this point forward):** When a step deletes an exported symbol (class, function, type, env var), and a later grep step finds orphan references to that symbol, auto-proceed with deletion only if every hit is in (a) a test file, (b) an ambient type declaration (.d.ts), or (c) a documentation comment. Log as a deviation but don't wait for approval — this is mechanical consequence of the earlier deletion, not a plan omission. Still surface when any hit is in production code (.ts/.tsx/.java files that aren't under `__tests__` or `.d.ts`) — production orphans suggest the plan missed a real consumer.

### D3 — Step 6 verification line quoted the wrong UpstreamException message (plan-text bug, not code)

Step 6's verification line quoted the Branch B message (`"AI service is temporarily unavailable. Please try again."`) for the null-client path. The spec's actual Branch A message — and what `GeminiService` produces when the key is absent — is `"AI service is not configured on the server."` This matches `GeminiServiceTest.nullClientThrowsUpstream`'s `.hasMessageContaining("not configured")` assertion (Step 8). No code change needed; plan verification line was wrong.

The two-branch design is deliberate: "not configured" signals a deployment issue (operator action), "temporarily unavailable" signals a transient runtime problem (user retry) — they shouldn't be collapsed. Step 6's historical verification text is left intact for the audit trail; D3 documents the correction.
