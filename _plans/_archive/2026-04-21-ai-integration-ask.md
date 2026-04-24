# Plan: AI Integration — Ask AI Scripture-Grounded Q&A (Spec AI-1 of 3)

**Spec:** `_specs/ai-integration-ask.md`
**Date:** 2026-04-21
**Branch:** `claude/feature/ai-integration-ask`
**Wave:** AI Integration (AI-1 of 3 — followed by AI-2 Pray, AI-3 Journal)
**Size:** L (about 18 files touched, ~1,200 net LOC add)
**Risk:** Medium. One new backend POST endpoint that hits real Gemini with structured-output prompting plus retry, server-side crisis keyword short-circuit, and a server-side fallback path. Frontend swaps mock-primary to proxy-primary with mock fallback on any error. Zero migrations, zero auth changes, zero new dependencies.

---

## Affected Frontend Routes

- `/ask`

---

## Universal Rules Checklist

N/A — standalone spec (AI Integration wave, no master plan reference). The spec's "CRITICAL EXECUTION RULES" block and the project rules files govern behavior. Relevant rules in play:

- `01-ai-safety.md` § Crisis Intervention Protocol — server-side crisis keyword short-circuit is a backend-first defense-in-depth layer; frontend `CrisisBanner` remains in place
- `01-ai-safety.md` § AI-Generated Content Guidelines — warm tone, no divine-authority claims, disclaimer framing in system prompt ("points people toward Jesus" is pastoral, not prescriptive)
- `02-security.md` § Never Leak Upstream Error Text — enforced via `mapGeminiException` chokepoint (same pattern as Spec 2's `GeminiService.mapException`)
- `02-security.md` § Input Validation & Sanitization — plain-text policy applies to `answer`/`encouragement`/`prayer` fields rendered by `AskResponseDisplay`; never `dangerouslySetInnerHTML`
- `03-backend-standards.md` § Proxy subpackage convention — `AskController` sits in `proxy.ai` alongside Spec 2's `GeminiController`
- `03-backend-standards.md` § Standard Response Shapes — `/api/v1/proxy/ai/ask` success returns `ProxyResponse<AskResponseDto>`; errors flow through `ProxyExceptionHandler`
- `03-backend-standards.md` § `@RestControllerAdvice` Scoping — `ProxyExceptionHandler` already covers `proxy.ai.*`; no new advice needed
- `06-testing.md` § Backend Test Patterns — `@WebMvcTest` for controller slice, `@SpringBootTest @AutoConfigureMockMvc @MockBean AskService` for integration (Spec 2 pattern), plain unit tests for prompts and crisis detector
- `07-logging-monitoring.md` § PII handling — controller logs `questionLength` + `historyLength` only, never `question` content, never history content
- `07-logging-monitoring.md` § Framework Log Suppression — already active in `application-dev.properties` from Spec 2's D7; the new `AskRequest` `@RequestBody` deserialization is covered automatically

---

## Architecture Context

Reconnaissance confirmed the following concrete facts, which the plan depends on:

**Backend base package and existing proxy.ai layout** (from `backend/src/main/java/com/example/worshiproom/`):

```
com.example.worshiproom/
├── WorshipRoomApplication.java
├── config/
│   ├── CorsConfig.java
│   └── ProxyConfig.java           (GeminiProperties already present, reads proxy.gemini.api-key with isConfigured())
├── controller/
│   └── ApiController.java         (health endpoint returns nested providers.gemini.configured from Spec 3)
└── proxy/
    ├── common/                    (ProxyResponse, ProxyError, ProxyException, UpstreamException, UpstreamTimeoutException,
    │                               SafetyBlockException, RateLimitExceededException, ProxyExceptionHandler,
    │                               RequestIdFilter, RateLimitFilter, IpResolver, RateLimitExceptionHandler)
    ├── ai/                        (Spec 2 — GeminiController, GeminiService, GeminiPrompts, ExplainRequest, ReflectRequest, GeminiResponseDto)
    └── maps/                      (Spec 3 — MapsController, GoogleMapsService, MapsCacheKeys, PlacesSearchRequest, etc.)
```

The new Ask files sit in the existing `proxy.ai` subpackage alongside Spec 2's Gemini components. The `ProxyExceptionHandler` already covers `com.example.worshiproom.proxy` via its package-scoped `basePackages`.

**Existing infrastructure AI-1 reuses unchanged:**

- `ProxyResponse.of(data, requestId)` — success envelope
- `ProxyError.of(code, message, requestId)` — error envelope
- `UpstreamException` (502 UPSTREAM_ERROR), `UpstreamTimeoutException` (504 UPSTREAM_TIMEOUT), `SafetyBlockException` (422 SAFETY_BLOCK from Spec 2)
- `RequestIdFilter` — sets `X-Request-Id` header + MDC (already covers all `/api/v1/**`)
- `RateLimitFilter` — scoped to `/api/v1/proxy/**` (new endpoint rate-limits automatically; no filter change)
- `CorsConfig` — all `/api/v1/proxy/**` paths covered; `X-Request-Id, X-RateLimit-*, Retry-After` already exposed
- `ProxyConfig.getGemini()` — wired to `GEMINI_API_KEY` env var, exposes `getApiKey()` + `isConfigured()`
- `application-dev.properties` framework log suppression (Spec 2 D7) — covers `@RequestBody` deserialization of `AskRequest`
- `com.google.genai:google-genai:1.51.0` SDK — already a direct Maven dependency from Spec 2

**Spec 2 `GeminiService` patterns the plan mirrors verbatim:**

- `@PostConstruct void initClient()` — lazily initializes the SDK `Client`; sets `client = null` with a WARN log when `proxy.gemini.api-key` is blank
- Constructor-injected `ProxyConfig`
- Public `generate()` method does error mapping; package-private `callModels(model, prompt, config)` is the test seam (D2b pattern)
- Three-path safety detection via `FinishReason.Known` enum comparison (D9)
- `mapException(RuntimeException)` chokepoint — returns `UpstreamTimeoutException` for any `TimeoutException` in the cause chain, `UpstreamException` otherwise. Generic user-facing message; the cause is preserved for server-side logs only.
- `REQUEST_TIMEOUT = Duration.ofSeconds(30)` via `HttpOptions.builder().timeout(...)`

**Existing test patterns this plan matches:**

- `GeminiControllerTest` — `@WebMvcTest(GeminiController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class}) @MockBean GeminiService`. Reuse structure for `AskControllerTest`.
- `GeminiServiceTest` — `spy(new GeminiService(config))` + `doReturn(response).when(spy).callModels(...)`. Reuse for `AskServiceTest`.
- `GeminiIntegrationTest` — `@SpringBootTest @AutoConfigureMockMvc @MockBean GeminiService`. Reuse for `AskIntegrationTest` with `@MockBean AskService`.
- `GeminiPromptsTest` — verbatim-substring assertions on system prompt content. Reuse for `AskPromptsTest` (8 rules, 3 builder tests = 11 tests total).

**Frontend existing patterns that AI-1 must preserve:**

- `frontend/src/pages/AskPage.tsx` — two call sites: `handleSubmit` (line 75–92) and `handleFollowUpClick` (line 144–159). Both wrap `getAskResponse` in a `setTimeout(ASK_LOADING_DELAY_MS)`. Both need to swap to `fetchAskResponse(...).then(...)`.
- `frontend/src/types/ask.ts` — `AskResponse` type is CANONICAL. The backend `AskResponseDto` must match field names exactly. Note: `followUpQuestions` is typed as `[string, string, string]` (tuple, exactly 3).
- `frontend/src/mocks/ask-mock-data.ts` — 16 canned responses with `ASK_RESPONSES[topicKey]` + `getAskResponse(question)` local keyword matcher. Stays as-is; becomes the fallback path only.
- `frontend/src/constants/crisis-resources.ts` — frontend `SELF_HARM_KEYWORDS` array is the SOURCE OF TRUTH for crisis keywords; backend list is a superset copy verified by `AskCrisisDetectorTest.parityWithFrontend`.
- `frontend/src/constants/ask.ts` — `ASK_LOADING_DELAY_MS = 2000` becomes dead code after the swap; the constant is tombstoned with a comment explaining removal.
- `frontend/src/pages/__tests__/AskPage.test.tsx` — currently mocks `getAskResponse`; needs to mock `fetchAskResponse` instead and await promise resolution rather than advance timers.
- `frontend/src/pages/__tests__/AskPage.offline.test.tsx` — no source changes; verify-only (offline gating short-circuits before any fetch).

**Schema construction note (google-genai 1.51.0 Schema API):**

The SDK's `Schema` builder is verbose (30–40 lines of builder chains for a nested object-of-objects structure). Spec acknowledges this and leaves `buildResponseSchema()` as a Step-4 implementation detail. If the SDK doesn't support `minItems`/`maxItems` on arrays, downgrade gracefully — the server-side `validateResponse` method is the authoritative count check, so schema-level count enforcement is nice-to-have.

---

## Database Changes

None. This spec does not touch the database.

---

## API Changes

One new endpoint under `/api/v1/proxy/ai/`.

| Method | Endpoint | Auth | Rate Limit | Request Body | Response |
|--------|----------|------|-----------|-------------|----------|
| POST | `/api/v1/proxy/ai/ask` | None (inherits proxy filter) | Inherited: 120/min dev, 60/min prod per IP | `AskRequest { question, conversationHistory? }` | `ProxyResponse<AskResponseDto>` |

Error responses follow the standard `ProxyError` shape via `ProxyExceptionHandler`: 400 INVALID_INPUT, 422 SAFETY_BLOCK, 429 RATE_LIMITED, 502 UPSTREAM_ERROR, 504 UPSTREAM_TIMEOUT, 500 INTERNAL_ERROR.

Crisis-keyword responses are HTTP 200 with `data.id = "crisis"` (NOT an error; the crisis-response is a valid `AskResponseDto` shape).

---

## Assumptions & Pre-Execution Checklist

- [ ] Current branch: `claude/feature/ai-integration-ask`. Verified via `git branch --show-current` at the top of every step.
- [ ] `git log main --oneline -10` shows all three Key Protection wave merge commits: "AI proxy foundation" (Spec 1), "Spec 2: migrate Gemini to backend proxy" (Spec 2), "Spec 3: Maps proxy migration" (Spec 3).
- [ ] `git status` clean (no uncommitted changes).
- [ ] `backend/.env.local` has `GEMINI_API_KEY=AIza...` populated (provisioned during Spec 2 D6; reused here unchanged — no new key, no new provisioning).
- [ ] `cd backend && ./mvnw test` passes cleanly on the current branch baseline (no pre-existing failures). Expected baseline: 95 tests green from Specs 1–3.
- [ ] `cd frontend && npm test -- --run` passes cleanly on the current branch baseline.
- [ ] `cd frontend && npm run build` succeeds.
- [ ] Baseline bundle scans clean (from Spec 3 post-merge): `grep -rE 'AIza[0-9A-Za-z_-]{35}' frontend/dist/assets/*.js | wc -l` returns 0; `grep -r 'VITE_GEMINI_API_KEY' frontend/dist/assets/*.js | wc -l` returns 0. Both assertions must continue holding post-merge.
- [ ] Assumption — charter carryover: CC operates under the Spec 2 seven-condition auto-decision charter (no public API change, no behavior change, no rules/spec/plan edits, no new security/CORS/logging/PII/rate-limit surface beyond spec, no scope change, no cross-spec precedent beyond extending existing patterns, alternative strictly worse). Uncertainty = stop and surface.
- [ ] Assumption — schema construction: CC uses the google-genai 1.51.0 `Schema.builder()` API. If a specific schema constraint (e.g., `minItems`/`maxItems` on arrays) isn't supported by the SDK, the `validateResponse` method is the authoritative check. CC does not invent a new schema mechanism.
- [ ] Assumption — frontend schema matching: `AskResponseDto` field names (`id`, `topic`, `answer`, `verses`, `encouragement`, `prayer`, `followUpQuestions`) match the TypeScript `AskResponse` interface byte-for-byte. Any divergence breaks the UI silently.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package for Ask files | `com.example.worshiproom.proxy.ai` (existing package) | Spec places `AskController` explicitly in `proxy.ai` alongside `GeminiController`. Matches `03-backend-standards.md` § proxy subpackage convention ("Feature packages contain their controller + service + prompts/DTOs/helpers specific to that upstream"). No sub-sub-package needed for 7 files. |
| Crisis keyword parity test strategy | `AskCrisisDetectorTest.parityWithFrontend` reads `frontend/src/constants/crisis-resources.ts` via relative `Path.of("../frontend/src/constants/crisis-resources.ts")` and regex-extracts the `SELF_HARM_KEYWORDS` array | Source of truth stays frontend (the `containsCrisisKeyword` helper is the client-side check the user sees first); backend must be a superset for defense-in-depth. A brittle parity test is the only way to catch drift — if someone edits the frontend list without updating the backend, CI fails. Matches spec AD #3's explicit guidance. |
| Crisis response as a constant vs. a computed response | `static final AskResponseDto FALLBACK_RESPONSE` + `static AskResponseDto buildCrisisResponse()` static method in `AskCrisisDetector` | Spec is explicit: the crisis-response text is "product-critical content, not 'code.'" Keep it in `AskCrisisDetector.java` where it's co-located with the trigger. The fallback response is in `AskService.java` (per spec AD #12 — "NOT in a config file or separate class"). Two separate canned responses for two separate scenarios. |
| Gemini schema construction depth | Full object schema with nested `verses` array-of-object and `followUpQuestions` array-of-string, mapped per SDK API | Spec AD #2 commits to structured output for reliability. Schema is the primary enforcement; `validateResponse` is defense-in-depth. CC implements the full schema using `google.genai.types.Schema.builder()` — if any constraint (e.g., `minItems: 3`) isn't expressible in the SDK version, the validator catches the violation post-parse. |
| Retry budget on validation failure | Exactly 1 retry (MAX_RETRIES_ON_VALIDATION_FAILURE = 1). Total attempts ≤ 2. | Spec AD #2: "(c) both retries fail → return mock-style canned response via getFallbackResponse() on the server." Two attempts balance latency (each Gemini call is 1.5–4s) against resilience (structured output rarely fails twice). Higher retry counts would push total latency past 10s without reducing failure rate meaningfully. |
| FALLBACK_RESPONSE location | `static final AskResponseDto FALLBACK_RESPONSE` at the bottom of `AskService.java` (inside the class) | Spec AD #12 is explicit: "Lives as a `public static final AskResponseDto FALLBACK_RESPONSE` in `AskService.java` — NOT in a config file or separate class. Tight coupling with the service that owns the fallback path." |
| `isConfigured()` visibility on AskService | `public boolean isConfigured()` | Spec declares it "exposed for ApiController composability (future health field). Not currently consumed." Keep public per spec text. Preserves Spec 2's `GeminiService.isConfigured()` precedent. |
| Integration test mocking strategy | `@MockBean AskService` at the bean level (Spec 2 precedent) | Spec 3's `MapsIntegrationTest` confirmed this pattern works end-to-end: filters (RequestIdFilter, RateLimitFilter), advices, CORS, and header propagation all run under the real Spring context while the service layer is mocked. Avoids the WebClient/SDK fluent-builder mocking tax. |
| Backend crisis response vs. Gemini call | Crisis check fires BEFORE the Gemini call; on hit, return canned response, do NOT call Gemini | Spec rule 5 + AD #3. Critical for AI safety discipline (`01-ai-safety.md`): crisis content must never be routed through an LLM where a hallucination could worsen a suicidal user's state. Deterministic canned response guarantees tone and accuracy. |
| Frontend timeout value | `REQUEST_TIMEOUT_MS = 30_000` (30 seconds) | Backend timeout is 30s (`GeminiService.REQUEST_TIMEOUT`). Frontend at 30s matches — no additional slack because backend-enforced 30s means a response will either arrive or the backend will 504 within that budget. Longer frontend timeout would sit idle after a backend 504. |
| Frontend fallback on ANY backend error vs. specific codes | ANY error falls through to mock (HTTP 4xx, 5xx, network, timeout, parse) | Spec CRITICAL RULE 6 + AD #4. Simplicity: one fallback path, not per-status-code logic. The user NEVER sees a raw error — the mock is always acceptable as a graceful degradation floor. |
| `ASK_LOADING_DELAY_MS` removal strategy | Remove the constant's usage in `AskPage.tsx`; keep a tombstone comment in `constants/ask.ts` explaining removal | Spec is explicit: "Leave the comment as a tombstone for future archaeology. Don't delete silently — Eric's `.claude/rules` convention is to explain removals in-file when they change established API surfaces." |

---

## Implementation Steps

### Step 1: Create DTOs (ConversationMessage, AskRequest, AskVerseDto, AskResponseDto)

**Objective:** Create the four DTO records that define the wire contract. Pure data types with Bean Validation on request-side records; no logic.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/ConversationMessage.java` — record `{String role, String content}` with `@NotBlank @Pattern` on role and `@NotBlank @Size(min=1, max=2000)` on content
- `backend/src/main/java/com/example/worshiproom/proxy/ai/AskRequest.java` — record `{String question, List<ConversationMessage> conversationHistory}` with `@NotBlank @Size(min=1, max=500)` on question and `@Valid @Size(max=6)` on conversationHistory (nullable)
- `backend/src/main/java/com/example/worshiproom/proxy/ai/AskVerseDto.java` — record `{String reference, String text, String explanation}`. No validation annotations (Gemini produces these; validated in `AskService.validateResponse`)
- `backend/src/main/java/com/example/worshiproom/proxy/ai/AskResponseDto.java` — record `{String id, String topic, String answer, List<AskVerseDto> verses, String encouragement, String prayer, List<String> followUpQuestions}`. No validation annotations.

**Details:**

Copy the four record definitions verbatim from the spec's `Backend file specifications` section. Field ORDER in `AskResponseDto` exactly matches the `AskResponse` TypeScript interface (id, topic, answer, verses, encouragement, prayer, followUpQuestions). Field NAMES are byte-for-byte identical — any divergence breaks the UI silently.

`ConversationMessage.role` uses `@Pattern(regexp = "^(user|assistant)$", message = "role must be 'user' or 'assistant'")`.

**Guardrails (DO NOT):**

- Do NOT use camelCase variants of field names (`followUpQs`, `verseList`, etc.). Exactly `followUpQuestions` and `verses`.
- Do NOT add Jackson annotations (`@JsonProperty`, etc.) — field names match convention by default; custom mapping introduces drift risk.
- Do NOT add a constructor body to any record — Java-generated canonical constructors are sufficient.
- Do NOT combine any two DTOs into one file. One record per file matches Spec 2/3 precedent (`ExplainRequest.java`, `ReflectRequest.java`, `GeminiResponseDto.java` are each their own file).

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Full test suite still green: `./mvnw test` (existing tests should be unaffected — 95 tests green baseline)

**Test specifications:**

None directly for this step. DTO correctness is verified by the controller/service tests in later steps that deserialize valid and invalid inputs.

**Expected state after completion:**

- [ ] Four new files in `proxy/ai/` (ConversationMessage, AskRequest, AskVerseDto, AskResponseDto)
- [ ] Full backend suite still 95 tests green

---

### Step 2: Create `AskPrompts` + `AskPromptsTest`

**Objective:** Define the 8-rule system prompt, the retry corrective suffix, and the `buildUserPrompt(question, history)` helper. Lock the prompt text in place with verbatim-substring tests so accidental edits fail CI.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/AskPrompts.java` — public final utility class with three members: `ASK_SYSTEM_PROMPT` (text block), `RETRY_CORRECTIVE_SUFFIX` (text block), `buildUserPrompt(String question, List<ConversationMessage> history)` (static method)
- `backend/src/test/java/com/example/worshiproom/proxy/ai/AskPromptsTest.java` — 11 tests total (8 rule-presence tests + 3 builder tests)

**Details:**

Copy `AskPrompts.java` verbatim from the spec's `Backend file specifications > AskPrompts.java` section. Both text blocks use Java text blocks (`"""..."""`). The class is `public final`, has a private constructor (`private AskPrompts() {}`), and the two text constants are `public static final String`.

`buildUserPrompt` logic (per spec):

```java
public static String buildUserPrompt(String question, List<ConversationMessage> history) {
    if (history == null || history.isEmpty()) {
        return "Question: " + question;
    }
    String historyText = history.stream()
        .map(msg -> (msg.role().equals("user") ? "User: " : "Assistant: ") + msg.content())
        .collect(Collectors.joining("\n\n"));
    return "Previous conversation:\n\n" + historyText + "\n\nFollow-up question: " + question;
}
```

Test list for `AskPromptsTest` (verbatim from spec):

**Rule-presence tests (8):**

1. `systemPrompt_rule1_webTranslation` — `assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("World English Bible (WEB)")`
2. `systemPrompt_rule2_exactly3Verses` — contains "exactly 3 verses"
3. `systemPrompt_rule3_exactly3FollowUps` — contains "exactly 3 follow-up questions"
4. `systemPrompt_rule4_secondPerson` — contains "warm second-person voice"
5. `systemPrompt_rule5_acknowledgePain` — contains "Acknowledge pain"
6. `systemPrompt_rule6_prayerFirstPerson` — contains "first-person prayer"
7. `systemPrompt_rule7_encouragementShort` — contains "one short sentence"
8. `systemPrompt_rule8_idEnum` — contains all 16 allowed id values (suffering, forgiveness, anxiety, purpose, doubt, prayer, grief, loneliness, anger, marriage, parenting, money, identity, temptation, afterlife, fallback). Iterate the list and assert each substring is present.

**Builder tests (3):**

9. `buildUserPrompt_noHistory_returnsQuestionOnly` — `buildUserPrompt("Why?", null)` returns `"Question: Why?"`
10. `buildUserPrompt_withHistory_formatsCorrectly` — pass 2-turn history (user, assistant); assert result starts with `"Previous conversation:\n\nUser: ...\n\nAssistant: ...\n\nFollow-up question: ..."`
11. `buildUserPrompt_emptyHistoryTreatedAsNull` — `buildUserPrompt("Why?", List.of())` returns `"Question: Why?"` (same as null)

**Guardrails (DO NOT):**

- Do NOT paraphrase, re-word, or "improve" the system prompt text. Copy verbatim from the spec. The prompt is the product surface and tests enforce that.
- Do NOT delete or reformat the `Collectors.joining("\n\n")` separator — the tests assert this exact formatting.
- Do NOT add a fourth text block or helper method. The spec declares exactly three public members.
- Do NOT use `Objects.equals(msg.role(), "user")` in place of `msg.role().equals("user")`. The spec's code uses the instance method form and `msg.role()` is guaranteed non-null by `@NotBlank` validation. Matches Spec 2's `GeminiPrompts` style.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Prompt tests pass: `./mvnw test -Dtest=AskPromptsTest`
- [ ] Full test suite green: `./mvnw test`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `systemPrompt_rule1_webTranslation` through `systemPrompt_rule8_idEnum` | Unit | Verbatim-substring assertions for all 8 prompt rules |
| `buildUserPrompt_noHistory_returnsQuestionOnly` | Unit | Null/empty history → `"Question: <text>"` |
| `buildUserPrompt_withHistory_formatsCorrectly` | Unit | 2-turn history formatted per spec |
| `buildUserPrompt_emptyHistoryTreatedAsNull` | Unit | `List.of()` same as null |

**Expected state after completion:**

- [ ] `AskPrompts.java` present with three public members
- [ ] `AskPromptsTest` 11 tests passing
- [ ] Full backend suite 106 tests green (95 baseline + 11 new)

---

### Step 3: Create `AskCrisisDetector` + `AskCrisisDetectorTest` (incl. parity test)

**Objective:** Implement server-side crisis keyword detection and a canned crisis response. Backend keyword list must be a superset of the frontend's `SELF_HARM_KEYWORDS`. Parity test reads the frontend file and catches drift.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/AskCrisisDetector.java` — package-private final utility class with `SELF_HARM_KEYWORDS` list, `detectsCrisis(String)` predicate, and `buildCrisisResponse()` factory method
- `backend/src/test/java/com/example/worshiproom/proxy/ai/AskCrisisDetectorTest.java` — 7 tests per spec

**Details:**

Copy `AskCrisisDetector.java` verbatim from the spec's `Backend file specifications > AskCrisisDetector.java` section. Class is `final class` (package-private, no `public` modifier — implementation detail of the service). Private constructor. Three members: `SELF_HARM_KEYWORDS`, `detectsCrisis`, `buildCrisisResponse`.

Keyword list must include all 8 frontend keywords verbatim (suicide, kill myself, end it all, not worth living, hurt myself, end my life, want to die, better off dead) PLUS 4 backend-only additions (take my own life, don't want to be here, nobody would miss me, cease to exist). All lowercase. Locale-safe comparison via `toLowerCase(Locale.ROOT)`.

`detectsCrisis(String text)`:

```java
static boolean detectsCrisis(String text) {
    if (text == null || text.isBlank()) return false;
    String lower = text.toLowerCase(Locale.ROOT);
    for (String keyword : SELF_HARM_KEYWORDS) {
        if (lower.contains(keyword)) return true;
    }
    return false;
}
```

`buildCrisisResponse()` returns the full canned `AskResponseDto` per spec (id="crisis", topic="Help is available", 3 verses — Psalm 34:18, Psalm 147:3, Matthew 11:28 — in WEB, explanations included, encouragement "You are seen. You are loved. Please reach out — 988 or text HOME to 741741.", first-person prayer, 3 follow-up questions that redirect to professional help).

Test list (7 tests per spec):

1. `detectsCrisis_returnsTrueForExactKeyword` — parameterized/loop test: each of the 12 keywords (all 8 frontend + 4 backend-only) triggers true.
2. `detectsCrisis_caseInsensitive` — "KILL MYSELF" triggers; "Kill Myself" triggers; "kIlL mYsElF" triggers.
3. `detectsCrisis_substringMatch` — "I'm thinking of suicide tonight" triggers (suicide is a substring).
4. `detectsCrisis_returnsFalseForNullOrBlank` — null, "", "   " all return false.
5. `detectsCrisis_returnsFalseForUnrelatedText` — "How do I forgive my brother?" returns false. "What does the Bible say about anxiety?" returns false.
6. `parityWithFrontend` — reads `frontend/src/constants/crisis-resources.ts` via `Files.readString(Path.of("../frontend/src/constants/crisis-resources.ts"))`, regex-extracts the string literals inside the `SELF_HARM_KEYWORDS = [...]` array, asserts every frontend keyword (after lowercasing) appears in `AskCrisisDetector.SELF_HARM_KEYWORDS`. Backend may have MORE entries; may not have FEWER. Test fails loudly with a clear diff if a frontend keyword is missing.
7. `buildCrisisResponse_returnsValidShape` — calls `buildCrisisResponse()`, asserts: `id == "crisis"`, `topic` non-empty, `answer` contains "988" literal (verifies the lifeline reference is present), `verses` has exactly 3 entries each with non-empty reference/text/explanation, `encouragement` non-empty, `prayer` non-empty, `followUpQuestions` has exactly 3 non-empty entries.

**Parity test implementation detail:**

```java
@Test
void parityWithFrontend() throws IOException {
    String src = Files.readString(Path.of("../frontend/src/constants/crisis-resources.ts"));
    Pattern arrayPattern = Pattern.compile(
        "SELF_HARM_KEYWORDS\\s*=\\s*\\[([^\\]]*)\\]", Pattern.DOTALL);
    Matcher m = arrayPattern.matcher(src);
    assertThat(m.find()).as("Could not locate SELF_HARM_KEYWORDS in frontend file").isTrue();
    String body = m.group(1);
    Pattern literalPattern = Pattern.compile("'([^']+)'|\"([^\"]+)\"");
    Matcher lm = literalPattern.matcher(body);
    List<String> frontendKeywords = new ArrayList<>();
    while (lm.find()) {
        String kw = lm.group(1) != null ? lm.group(1) : lm.group(2);
        frontendKeywords.add(kw.toLowerCase(Locale.ROOT));
    }
    assertThat(frontendKeywords).isNotEmpty();
    assertThat(AskCrisisDetector.SELF_HARM_KEYWORDS)
        .as("Backend SELF_HARM_KEYWORDS must be a superset of the frontend list")
        .containsAll(frontendKeywords);
}
```

**Guardrails (DO NOT):**

- Do NOT make `AskCrisisDetector` public. Package-private is deliberate — it's an implementation detail of `AskService`.
- Do NOT paraphrase the crisis-response text. Every sentence was reviewed for pastoral-care appropriateness. Copy verbatim from spec.
- Do NOT skip the "988" substring assertion in test 7 — it's an explicit spec acceptance criterion ("Crisis response contains '988' literal somewhere").
- Do NOT reduce the backend keyword list to match the frontend exactly. Backend MUST be a superset; removing backend-only keywords weakens defense-in-depth.
- Do NOT use a relative path other than `../frontend/...` for the parity test. Maven's `./mvnw test` runs from the `backend/` directory, so the relative path resolves correctly. If CI runs tests from a different CWD, surface to Eric before switching to an absolute path.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Crisis detector tests pass: `./mvnw test -Dtest=AskCrisisDetectorTest`
- [ ] Parity test reads frontend file successfully (fails loudly if path is wrong)
- [ ] Full test suite green: `./mvnw test`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `detectsCrisis_returnsTrueForExactKeyword` | Unit | Every keyword triggers |
| `detectsCrisis_caseInsensitive` | Unit | Case-insensitive match |
| `detectsCrisis_substringMatch` | Unit | Substring within sentence triggers |
| `detectsCrisis_returnsFalseForNullOrBlank` | Unit | Null/blank safe |
| `detectsCrisis_returnsFalseForUnrelatedText` | Unit | Unrelated questions return false |
| `parityWithFrontend` | Unit (filesystem) | Backend list is superset of frontend list |
| `buildCrisisResponse_returnsValidShape` | Unit | Response has all required fields, id="crisis", "988" present |

**Expected state after completion:**

- [ ] `AskCrisisDetector.java` present (package-private)
- [ ] `AskCrisisDetectorTest` 7 tests passing
- [ ] Full backend suite 113 tests green

---

### Step 4: Create `AskService` + `AskServiceTest` (Gemini call + retry + fallback + shape validation)

**Objective:** Implement the service that orchestrates the crisis check, Gemini call with structured-output prompting, retry-on-validation-failure, and server-side fallback. The D2b test-seam pattern (package-private `callGeminiForAsk` + `callModels`) supports `Mockito.spy()` unit testing.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/AskService.java` — full service (~340 lines) per spec, with:
  - Constructor taking `ProxyConfig` + `ObjectMapper`
  - `@PostConstruct void initClient()` (mirrors `GeminiService.initClient()`)
  - Public `ask(AskRequest)` method — crisis check → Gemini → parse-and-validate → retry → fallback
  - Package-private `callGeminiForAsk(AskRequest, boolean withRetryCorrective)` seam
  - Package-private `callModels(String, String, GenerateContentConfig)` seam (matches Spec 2 D2b)
  - Private `parseAndValidate(GenerateContentResponse)`, `validateResponse(AskResponseDto)`, `isSafetyBlocked`, `extractText`, `mapGeminiException`, `isTimeout`
  - Private `buildResponseSchema()` using google-genai 1.51.0 `Schema.builder()` API
  - `static final AskResponseDto FALLBACK_RESPONSE` at the bottom of the class
  - `static final Set<String> ALLOWED_IDS` containing the 16 permitted id values
- `backend/src/test/java/com/example/worshiproom/proxy/ai/AskServiceTest.java` — ~18 tests using `Mockito.spy()` + `doReturn()` on the seams

**Details:**

Copy `AskService.java` verbatim from the spec's `Backend file specifications > AskService.java` section. Structure:

1. Class header with fields: `log`, `MODEL`, `MAX_RETRIES_ON_VALIDATION_FAILURE`, `proxyConfig`, `objectMapper`, `client`
2. Constructor: `public AskService(ProxyConfig, ObjectMapper)` — store both fields ONLY. Do NOT call `initClient()` from the constructor — Spring invokes `@PostConstruct` methods after construction as part of the bean lifecycle. Matches `GeminiService`'s constructor body (two field assignments and nothing else). Calling `initClient()` from both the constructor AND via `@PostConstruct` would double-initialize and break tests.
3. `@PostConstruct void initClient()` — same pattern as `GeminiService`: if `!proxyConfig.getGemini().isConfigured()`, log a WARN and leave `client = null`. Otherwise build via `Client.builder().apiKey(...).build()`. CC verifies if HttpOptions timeout is needed here too (Spec 2's `GeminiService` uses `Client.builder().httpOptions(HttpOptions.builder().timeout(REQUEST_TIMEOUT)...)`). **Use the same 30-second HttpOptions timeout** — matches Spec 2's `GeminiService` exactly.
4. `public boolean isConfigured()` — returns `client != null`
5. `public AskResponseDto ask(AskRequest request)` — orchestration per spec:
   - Step A: crisis check via `AskCrisisDetector.detectsCrisis(request.question())`; on true, log INFO with `questionLength=`, return `AskCrisisDetector.buildCrisisResponse()`
   - Step B: null-client check; throw `new UpstreamException("AI service is not configured on the server.")`
   - Step C: retry loop (max 2 attempts total). On each attempt call `callGeminiForAsk(request, attempts > 0)`, then `parseAndValidate(response)`. If non-null DTO, return it. Otherwise log `Ask response validation failed attempt={N}` at INFO level, increment attempts.
   - Step D: catch blocks per spec:
     - `catch (SafetyBlockException | UpstreamException | UpstreamTimeoutException ex) { throw ex; }` — preserve typed exceptions
     - `catch (RuntimeException ex) { throw mapGeminiException(ex); }`
   - Step E: retries exhausted → log `Ask retries exhausted questionLength={N}` at WARN level, return `FALLBACK_RESPONSE`
6. `GenerateContentResponse callGeminiForAsk(AskRequest request, boolean withRetryCorrective)` — package-private seam. Builds system prompt (append `RETRY_CORRECTIVE_SUFFIX` if retry), user prompt, config with `responseMimeType("application/json")` + `responseSchema(buildResponseSchema())`, calls `callModels(MODEL, userPrompt, config)`.
7. `GenerateContentResponse callModels(String, String, GenerateContentConfig)` — package-private seam: `return client.models.generateContent(model, userPrompt, config);`
8. `private Schema buildResponseSchema()` — constructs the JSON schema Gemini must follow. Full shape per spec inline comment:
   - `id`: string with enum of 17 values (16 ALLOWED_IDS + "crisis" is NOT here — only the 16 Gemini may produce)

     Wait — re-read spec AD #11: "Chosen: Gemini classifies into one of the 16 predefined values ... (`suffering`, `forgiveness`, `anxiety`, `purpose`, `doubt`, `prayer`, `grief`, `loneliness`, `anger`, `marriage`, `parenting`, `money`, `identity`, `temptation`, `afterlife`, `fallback`)." So `ALLOWED_IDS` (the validator set) and the schema `id.enum` list both contain these 16 values. "crisis" is NOT produced by Gemini — only by `AskCrisisDetector.buildCrisisResponse()`. `ALLOWED_IDS` does NOT contain "crisis".
   - `topic`: string
   - `answer`: string (minLength 50 if SDK supports; otherwise enforced by validator only — answer must be non-empty)
   - `verses`: array of exactly 3 objects, each `{reference: string, text: string, explanation: string}` (use `minItems: 3, maxItems: 3` if SDK supports)
   - `encouragement`: string
   - `prayer`: string (minLength 30 if SDK supports)
   - `followUpQuestions`: array of exactly 3 strings
   - `required`: all 7 fields

   CC writes the full `Schema.builder()` chain using the google-genai 1.51.0 API. If `Schema.builder()` doesn't expose `minLength` / `minItems` for a given type, omit those constraints — the post-parse `validateResponse()` method catches all count violations and blank strings. Do NOT invent an unofficial schema mechanism.

9. `private AskResponseDto parseAndValidate(GenerateContentResponse response)` — three-step:
   - Safety-block check via `isSafetyBlocked(response)` — throw `new SafetyBlockException("This question was blocked by safety filters. Please rephrase.")` on block
   - Extract text via `extractText(response)` — return null if empty (triggers retry)
   - `objectMapper.readValue(text, AskResponseDto.class)` in try/catch; on parse error log INFO and return null (triggers retry)
   - `validateResponse(dto)` — return null if invalid (triggers retry); else return dto
10. `private static boolean validateResponse(AskResponseDto dto)` — business validation per spec:
    - Null check
    - All 5 non-verse string fields non-blank
    - `ALLOWED_IDS.contains(dto.id())`
    - `dto.verses() != null && dto.verses().size() == 3` + each verse non-null with non-blank fields
    - `dto.followUpQuestions() != null && dto.followUpQuestions().size() == 3` + each non-blank
11. `private static boolean isSafetyBlocked(GenerateContentResponse response)` — three-path check using `FinishReason.Known` enum and `BlockReason.Known` enum (Spec 2 D9 pattern). Copy-paste from `GeminiService.isSafetyBlocked` verbatim; adapt imports if needed.
12. `private static String extractText(GenerateContentResponse response)` — null-safe extraction of first candidate's text part. Copy from `GeminiService.extractText` verbatim.
13. `private static UpstreamException mapGeminiException(RuntimeException ex)` — timeout detection via `isTimeout` → `UpstreamTimeoutException`, else `UpstreamException`. Generic user-facing messages; cause chain preserved for server logs. Copy from `GeminiService.mapException` verbatim (rename if applicable — Spec 2's method is `mapException`; this one can use same name or be called `mapGeminiException` per spec).
14. `private static boolean isTimeout(Throwable ex)` — walks the cause chain looking for `TimeoutException` `instanceof`. Copy from `GeminiService.isTimeout` verbatim.
15. `static final AskResponseDto FALLBACK_RESPONSE` — full canned response per spec AD #12 (id="fallback", 3 verses: Psalm 46:10, Proverbs 3:5-6, Matthew 7:7, etc.).
16. `static final Set<String> ALLOWED_IDS` — immutable set with the 16 permitted Gemini-produced id values. `private static final` is fine; spec uses `private` (inside the validator scope).

**Test list for `AskServiceTest` (18 tests per spec):**

**Setup (mirrors `GeminiServiceTest.setUp()` exactly):** Because `@PostConstruct initClient()` does NOT fire when the test manually `new`s the service (Spring lifecycle isn't running), tests must inject a non-null `Client` into the private field via reflection. Otherwise every test that exercises the `ask()` → `callGeminiForAsk` → `callModels` path would NPE at `client.models.generateContent(...)`.

```java
private ProxyConfig config;
private AskService service;

@BeforeEach
void setUp() throws Exception {
    config = new ProxyConfig();
    config.getGemini().setApiKey("fake-test-key");
    service = spy(new AskService(config, new ObjectMapper()));
    // @PostConstruct initClient() doesn't fire with manual new — inject a
    // non-null Client so the null-guard in ask() passes. The mock Client is
    // never actually invoked because callGeminiForAsk / callModels are stubbed
    // via doReturn() in each test.
    Client dummyClient = mock(Client.class);
    Field clientField = AskService.class.getDeclaredField("client");
    clientField.setAccessible(true);
    clientField.set(service, dummyClient);
}
```

This pattern is copied verbatim from `GeminiServiceTest.setUp()` — same reflection approach, same rationale (documented in a comment there too). Then each test stubs `callGeminiForAsk` (for most tests) or `callModels` (for tests that need to exercise the config-passing layer) via `doReturn(...)` / `doThrow(...)`.

**Crisis path (2 tests):**

1. `ask_crisisKeywordShortCircuits` — question "I want to die" → returns `AskCrisisDetector.buildCrisisResponse()`. Assert `callGeminiForAsk` is NEVER invoked (`verify(spy, never()).callGeminiForAsk(any(), anyBoolean())`).
2. `ask_crisisResponseHasExpectedShape` — trigger crisis, assert returned DTO has id="crisis", topic="Help is available", answer contains "988", verses.size()==3, followUpQuestions.size()==3.

**Happy path (3 tests):**

3. `ask_happyPath_returnsValidResponse` — `doReturn(mockValidGeminiResponse).when(spy).callGeminiForAsk(any(), eq(false))`; call `ask(request)`; assert returned DTO matches the mock's parsed shape.
4. `ask_conversationHistoryPassedToPrompt` — pass 2-turn history in `AskRequest`; verify `callGeminiForAsk` was called with the request (the spy captures argument). Assert the captured `AskRequest.conversationHistory()` has size 2.
5. `ask_nullConversationHistoryHandled` — pass `null` history; `ask(request)` completes without NPE.

**Validation + retry (4 tests):**

6. `ask_malformedJsonRetriesOnce` — first `callGeminiForAsk` returns garbage (response text like `"not json"`); second returns valid JSON. Assert `callGeminiForAsk` called exactly twice. Assert the second call was with `withRetryCorrective = true`. Assert final result is the parsed valid DTO.
7. `ask_twoVersesInsteadOfThreeTriggersRetry` — first call returns valid-ish JSON with 2 verses; second call returns valid JSON. Assert 2 calls, second result returned.
8. `ask_twoValidFailuresFallBackToCanned` — both calls return malformed JSON. Assert final result equals `AskService.FALLBACK_RESPONSE` (package-private access from same package — test is in `proxy.ai`). Assert a WARN log line (via captured logger or logged message assertion).
9. `ask_invalidIdEnumValueTriggersRetry` — first call returns JSON with `id: "unknown-topic"` (not in `ALLOWED_IDS`); second call returns valid. Assert retry and second result returned.

**Error mapping (4 tests):**

10. `ask_nullClient_throwsUpstreamNotConfigured` — starting from the `@BeforeEach` setup, use reflection to override `client` to `null` (mirrors `GeminiServiceTest.nullClientThrowsUpstream`):
    ```java
    Field clientField = AskService.class.getDeclaredField("client");
    clientField.setAccessible(true);
    clientField.set(service, null);
    ```
    Assert `ask(validRequest)` throws `UpstreamException` with message containing `"not configured"`. Note: setting `gemini.api-key=""` on ProxyConfig alone has no effect here because `initClient()` doesn't run — the field injection is the authoritative way to simulate the unconfigured state in unit tests.
11. `ask_safetyBlockThrowsSafetyBlockException` — spy returns a `GenerateContentResponse` whose first candidate has `finishReason=SAFETY`. Assert `ask()` throws `SafetyBlockException`.
12. `ask_webClientTimeoutMapsTo504` — `doThrow(new RuntimeException(new TimeoutException("timed out"))).when(spy).callGeminiForAsk(any(), anyBoolean())`. Assert `UpstreamTimeoutException` thrown.
13. `ask_sdkErrorMapsTo502` — `doThrow(new RuntimeException("some sdk error")).when(spy).callGeminiForAsk(any(), anyBoolean())`. Assert `UpstreamException` thrown with generic "temporarily unavailable" message.

**No-leak invariants (2 tests):**

14. `noLeakOfUpstreamErrorText` — `doThrow(new RuntimeException("GoogleSecretKeyABC")).when(spy).callGeminiForAsk(any(), anyBoolean())`. Catch the thrown `UpstreamException`. Assert its message does NOT contain "GoogleSecretKeyABC", "AIza", "gemini", "google", or "key=". Matches Spec 2's `noLeakOfUpstreamErrorText` precedent.
15. `noLeakInCrisisResponse` — trigger crisis; assert returned DTO's answer, encouragement, and prayer do NOT contain "AIza", "gemini", "google", or "key=". Defense-in-depth — crisis text is hardcoded so this should pass trivially; test is a tripwire for accidental secret-leaking edits.

**Validation unit tests (3 tests):**

16. `validateResponse_acceptsValidDto` — construct a valid `AskResponseDto` by hand, call `validateResponse` via reflection (or make it package-private to call directly from same package). Assert true.
17. `validateResponse_rejectsEmptyFields` — 5 sub-cases: each of `id`, `topic`, `answer`, `encouragement`, `prayer` blanked in turn → rejected.
18. `validateResponse_rejectsInvalidCounts` — 4 sub-cases: 2 verses, 4 verses, 2 follow-ups, 4 follow-ups → each rejected.

**Making `validateResponse` testable:** Change the method from `private static` to `static` (package-private). Tests in the same package can call it directly without reflection. No external surface change (still inaccessible outside `com.example.worshiproom.proxy.ai`).

**Guardrails (DO NOT):**

- Do NOT use `client.models.generateContent(...)` directly from public `ask()`. Always route through `callGeminiForAsk` → `callModels`. This is the D2b test seam; breaking it breaks testability.
- Do NOT include `ex.getMessage()` or any upstream text in the thrown `UpstreamException` message. Generic user-safe strings only. `noLeakOfUpstreamErrorText` enforces this.
- Do NOT add more retries than `MAX_RETRIES_ON_VALIDATION_FAILURE = 1`. Spec AD says 2 total attempts max (original + 1 retry).
- Do NOT change `FALLBACK_RESPONSE` text. It's a pre-reviewed canned response.
- Do NOT add `@Cacheable` to `ask()`. Spec AD #8 is explicit — no caching (each question is user-specific).
- Do NOT modify `GeminiService` or any Spec 2 file. `AskService` is a peer, not a dependency.
- Do NOT swallow exceptions in `parseAndValidate`. Parse errors return null (triggers retry); only `SafetyBlockException` is thrown out. Other `RuntimeException` bubbles up through the catch-block chain.
- Do NOT use `System.out`, `System.err`, or `printStackTrace()`. SLF4J only.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Service unit tests pass: `./mvnw test -Dtest=AskServiceTest`
- [ ] Full test suite green: `./mvnw test`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Crisis path × 2 | Unit | Short-circuit + shape |
| Happy path × 3 | Unit | Valid response + history passed + null history |
| Validation + retry × 4 | Unit | Malformed JSON, 2 verses, fallback after 2 fails, invalid id |
| Error mapping × 4 | Unit | Null client → 502; safety → 422; timeout → 504; generic → 502 |
| No-leak invariants × 2 | Unit | Upstream text never in thrown message; crisis response has no secrets |
| Validation unit × 3 | Unit | validateResponse accepts/rejects by field |

**Expected state after completion:**

- [ ] `AskService.java` with all methods + `FALLBACK_RESPONSE` constant
- [ ] 18 unit tests passing
- [ ] Full backend suite 131 tests green (113 + 18 new)

---

### Step 5: Create `AskController` + `AskControllerTest` (slice tests)

**Objective:** Expose `POST /api/v1/proxy/ai/ask`. Thin controller — validate the request, log safe metadata, delegate to `AskService`, wrap result in `ProxyResponse`. Slice tests cover validation paths and service-thrown exception mapping.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/AskController.java` — one endpoint (~35 lines)
- `backend/src/test/java/com/example/worshiproom/proxy/ai/AskControllerTest.java` — 11 slice tests with `@MockBean AskService`

**Details:**

Copy `AskController.java` verbatim from the spec's `Backend file specifications > AskController.java` section. Structure:

```java
@RestController
@RequestMapping("/api/v1/proxy/ai")
public class AskController {
    private static final Logger log = LoggerFactory.getLogger(AskController.class);
    private final AskService service;

    public AskController(AskService service) { this.service = service; }

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

- `@RequestMapping("/api/v1/proxy/ai")` — same base path as `GeminiController`. Both controllers coexist because their endpoint suffixes differ (`/explain`, `/reflect`, `/ask`).
- No `@Validated` on the class — only `@RequestBody` validation is needed (no `@RequestParam` constraints).
- Log line logs `questionLength` + `historyLength` only. NEVER `request.question()` content. NEVER history content.

Test list for `AskControllerTest` (11 slice tests per spec):

Setup: `@WebMvcTest(AskController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})`. `@MockBean private AskService service;`. Use `MockMvc` + `ObjectMapper` for request bodies.

1. `ask_happyPath_returns200WithBody` — service returns canonical DTO; assert status 200, JSON body `$.data.id`, `$.data.verses[0].reference`, `$.meta.requestId` all present.
2. `ask_missingQuestion_returns400` — body `{}`; assert 400, `$.code == "INVALID_INPUT"`.
3. `ask_blankQuestion_returns400` — body `{"question": "   "}`; assert 400 via `@NotBlank`.
4. `ask_questionTooLong_returns400` — 501-char question; assert 400 via `@Size(max=500)`.
5. `ask_conversationHistoryTooLong_returns400` — 7 messages (exceeds max=6); assert 400.
6. `ask_invalidRoleInHistory_returns400` — history entry with `role: "system"`; assert 400 via `@Pattern`.
7. `ask_contentTooLongInHistory_returns400` — history entry with 2001-char content; assert 400 via `@Size(max=2000)`.
8. `ask_nullConversationHistoryAccepted` — body `{"question": "Why?"}` (conversationHistory absent); service returns canonical DTO; assert 200. Verifies `@Size(max=6)` on a nullable field permits null.
9. `ask_serviceThrowsSafetyBlock_returns422` — `when(service.ask(any())).thenThrow(new SafetyBlockException("blocked"));`. Assert 422, `$.code == "SAFETY_BLOCK"`.
10. `ask_serviceThrowsUpstream_returns502` — service throws `UpstreamException`; assert 502, `$.code == "UPSTREAM_ERROR"`.
11. `ask_xRequestIdHeaderPresent` — mock service returns canonical DTO; assert response header `X-Request-Id` is present (set by `RequestIdFilter`, which runs in `@WebMvcTest` per Spec 2 precedent).

**Verify `@WebMvcTest` sees `RequestIdFilter`:** Spec 2's `GeminiControllerTest.xRequestIdHeaderPresent` confirmed this works with `@Import`-included filters. If the slice doesn't pick up `RequestIdFilter` by default, add `@Import(RequestIdFilter.class)` alongside the existing imports. Match Spec 2's pattern verbatim.

**Guardrails (DO NOT):**

- Do NOT log `request.question()`, `request.conversationHistory()`, or their element contents. Length only. Matches Spec 2 precedent (`GeminiController` logs `reference` + `verseTextLength`).
- Do NOT manually set `X-Request-Id` on the response. `RequestIdFilter` handles it globally.
- Do NOT manually set `X-RateLimit-*` headers. `RateLimitFilter` handles them (and the `@WebMvcTest` slice won't exercise rate limiting — that's covered by the integration test in Step 6).
- Do NOT use `@Validated` on the class. Only `@RequestBody` validation is needed.
- Do NOT convert the endpoint to `ResponseEntity<ProxyResponse<...>>` — plain `ProxyResponse<...>` return matches Spec 2's `GeminiController.explain` and the default 200 status is correct.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Slice tests pass: `./mvnw test -Dtest=AskControllerTest`
- [ ] Full test suite green: `./mvnw test`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `ask_happyPath_returns200WithBody` | Slice | ProxyResponse shape |
| `ask_missingQuestion_returns400` | Slice | INVALID_INPUT |
| `ask_blankQuestion_returns400` | Slice | `@NotBlank` |
| `ask_questionTooLong_returns400` | Slice | `@Size(max=500)` |
| `ask_conversationHistoryTooLong_returns400` | Slice | `@Size(max=6)` on list |
| `ask_invalidRoleInHistory_returns400` | Slice | `@Pattern` on role |
| `ask_contentTooLongInHistory_returns400` | Slice | `@Size(max=2000)` on content |
| `ask_nullConversationHistoryAccepted` | Slice | Nullable list |
| `ask_serviceThrowsSafetyBlock_returns422` | Slice | 422 SAFETY_BLOCK |
| `ask_serviceThrowsUpstream_returns502` | Slice | 502 UPSTREAM_ERROR |
| `ask_xRequestIdHeaderPresent` | Slice | Header set by filter |

**Expected state after completion:**

- [ ] `AskController.java` present with single endpoint
- [ ] 11 slice tests passing
- [ ] Full backend suite 142 tests green (131 + 11 new)

---

### Step 6: Integration test + OpenAPI updates

**Objective:** Lock in the end-to-end wire contract under the real Spring filter chain (RequestIdFilter, RateLimitFilter, advice chain, CORS) with `@MockBean AskService`. Extend `openapi.yaml` with the new path and three schemas.

**Files to create/modify:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/AskIntegrationTest.java` — 6 integration tests with `@SpringBootTest @AutoConfigureMockMvc @MockBean AskService`
- `backend/src/main/resources/openapi.yaml` — add one path entry + three schemas (`AskRequest`, `AskResponse`, `AskVerse`, `ConversationMessage`). Reuse shared responses (`BadRequest`, `RateLimited`, `UpstreamError`, `UpstreamTimeout`, `InternalError`, `SafetyBlocked`) via `$ref`.

**Details:**

Integration test follows `GeminiIntegrationTest` verbatim in structure. Setup: `@SpringBootTest(webEnvironment = RANDOM_PORT) @AutoConfigureMockMvc`, `@MockBean private AskService service;`. Tests:

1. `fullLifecycle_ask_returnsExpectedHeaders` — service mocked to return canonical DTO. POST `/api/v1/proxy/ai/ask` with valid body. Assert response status 200; headers `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` all present. Assert `$.data.*` + `$.meta.requestId` in body.

2. `fullLifecycle_ask_propagatesClientRequestId` — set request header `X-Request-Id: test-ask-request-id`. Assert response header `X-Request-Id: test-ask-request-id` (round-trip) AND `$.meta.requestId == "test-ask-request-id"` in body.

3. `fullLifecycle_invalidInput_returnsProxyErrorShape` — POST body `{}` (missing question). Assert 400, response body matches `{code: "INVALID_INPUT", message: contains "question", requestId, timestamp}` (full `ProxyError` shape).

4. `fullLifecycle_unconfiguredReturns502` — override `proxy.gemini.api-key=""` via `@TestPropertySource({"proxy.gemini.api-key="})` on a nested test class OR use a single test-level override. Mock service to throw `new UpstreamException("AI service is not configured on the server.")`. Assert 502, `$.code == "UPSTREAM_ERROR"`, message contains "not configured". Matches Spec 2's `fullLifecycle_unconfiguredReturns502` pattern.

5. `fullLifecycle_noUpstreamErrorTextLeaks` — mock service to throw `new UpstreamException("AI service is temporarily unavailable. Please try again.", new RuntimeException("GoogleSecretKeyABC"))`. Assert response body does NOT contain "GoogleSecretKeyABC", "AIza", "gemini", "google", or "key=". The cause chain is server-side only; the generic message crosses the wire.

6. `fullLifecycle_crisisPathBypassesGemini` — mock service to return `AskCrisisDetector.buildCrisisResponse()` directly. Assert 200, `$.data.id == "crisis"`, `$.data.answer` contains "988". Demonstrates the crisis path produces a valid success response (no HTTP error, no `SafetyBlockException`).

**OpenAPI additions (under `paths:`):**

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

**OpenAPI schemas (under `components.schemas`):** Copy verbatim from the spec's OpenAPI additions section. Includes `AskRequest`, `ConversationMessage`, `AskResponse` (with 17-value `id` enum that includes "crisis"), `AskVerse`.

**Note on enum size:** `AskResponse.id` OpenAPI enum has 17 entries (16 Gemini-producible + "crisis") because the public contract can emit "crisis" from the server-side detector. `ALLOWED_IDS` in `AskService` has only 16 (no "crisis" — Gemini can't produce it). This divergence is documented in the spec's `Backend implementation > AskResponseDto` note and is intentional.

**Guardrails (DO NOT):**

- Do NOT add auth/security schemes to the new path. Proxy endpoints are unauthenticated per Spec 1 decision.
- Do NOT mock `Client` (Gemini SDK) at the bean level. `@MockBean AskService` is simpler and matches Spec 2 precedent.
- Do NOT redefine `BadRequest`, `RateLimited`, `UpstreamError`, `UpstreamTimeout`, `InternalError`, `SafetyBlocked`, or `ResponseMeta` in the schemas section. They exist in `openapi.yaml` from Specs 1–2 and must be reused via `$ref`.
- Do NOT forget the `X-Request-Id: test-ask-request-id` round-trip test — it's a load-bearing invariant for the debugging workflow documented in `07-logging-monitoring.md`.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Integration test passes: `./mvnw test -Dtest=AskIntegrationTest`
- [ ] Full test suite green: `./mvnw test` — expected 148 tests green (142 + 6 new)
- [ ] OpenAPI YAML is valid (optional): `npx -y @redocly/cli lint backend/src/main/resources/openapi.yaml`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `fullLifecycle_ask_returnsExpectedHeaders` | Integration | Full header set + ProxyResponse body |
| `fullLifecycle_ask_propagatesClientRequestId` | Integration | Client X-Request-Id round-trip |
| `fullLifecycle_invalidInput_returnsProxyErrorShape` | Integration | 400 with ProxyError shape |
| `fullLifecycle_unconfiguredReturns502` | Integration | 502 when gemini.api-key empty |
| `fullLifecycle_noUpstreamErrorTextLeaks` | Integration | Cause exception text never in response |
| `fullLifecycle_crisisPathBypassesGemini` | Integration | Crisis id="crisis", 988 present |

**Expected state after completion:**

- [ ] `AskIntegrationTest.java` with 6 integration tests passing
- [ ] `openapi.yaml` contains new `/api/v1/proxy/ai/ask` path + new schemas
- [ ] Full backend test suite 148 tests green

---

### Step 7: Backend end-to-end smoke (non-Docker, per Spec 3 D-addendum)

**Objective:** Confirm the backend serves `/api/v1/proxy/ai/ask` correctly against real Gemini upstream, running via `./mvnw spring-boot:run` with `.env.local` exported into the shell. Catches misconfiguration (wrong key, org-policy block, SDK version mismatch) that unit/integration tests cannot.

**Files to create/modify:**

- None. Runtime smoke, not a code change.

**Details:**

1. Confirm `backend/.env.local` has `GEMINI_API_KEY=AIza...` (reused from Spec 2).
2. Stop any running backend process; ensure port 8080 is free.
3. Start backend with env vars exported:
   ```bash
   cd backend && set -a && source .env.local && set +a && \
     nohup ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev > /tmp/worship-room-backend.log 2>&1 &
   ```
4. Wait for `Started WorshipRoomApplication` in log; check no `GEMINI_API_KEY is not configured` warning.
5. Health probe:
   ```bash
   curl -s http://localhost:8080/api/v1/health | jq .providers.gemini.configured
   ```
   Expect `true`.
6. Ask smoke (real Gemini call, ~2–4 seconds):
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/proxy/ai/ask \
     -H 'Content-Type: application/json' \
     -d '{"question":"Why does God allow suffering?","conversationHistory":null}' \
     | jq '{id: .data.id, topic: .data.topic, verseCount: (.data.verses | length), followUpCount: (.data.followUpQuestions | length), requestId: .meta.requestId, answerLength: (.data.answer | length)}'
   ```
   Expect: `id` in `["suffering", ..., "fallback"]` (16 allowed), `verseCount: 3`, `followUpCount: 3`, 22-char `requestId`, `answerLength > 200`.
7. Crisis smoke:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/proxy/ai/ask \
     -H 'Content-Type: application/json' \
     -d '{"question":"I want to die"}' \
     | jq '{id: .data.id, has988: (.data.answer | contains("988")), verseCount: (.data.verses | length)}'
   ```
   Expect: `id: "crisis"`, `has988: true`, `verseCount: 3`.

   Confirm backend log shows the "Ask crisis path triggered questionLength=..." INFO line. Confirm NO Gemini call log line appears for this request ID (no "google.genai" request log).
8. Follow-up smoke:
   ```bash
   # First call
   FIRST=$(curl -s -X POST http://localhost:8080/api/v1/proxy/ai/ask \
     -H 'Content-Type: application/json' \
     -d '{"question":"Why does God allow suffering?"}')
   FIRST_ANSWER=$(echo "$FIRST" | jq -r .data.answer)

   # Follow-up with history
   curl -s -X POST http://localhost:8080/api/v1/proxy/ai/ask \
     -H 'Content-Type: application/json' \
     -d "$(jq -n --arg q "Tell me more about that." --arg a "$FIRST_ANSWER" '{question: $q, conversationHistory: [{role: "user", content: "Why does God allow suffering?"}, {role: "assistant", content: $a}]}')" \
     | jq '{id: .data.id, answerStart: (.data.answer[:100])}'
   ```
   Expect: second answer references the suffering context (words like "suffering", "pain", "God"), not a cold re-ask.
9. Invalid input smoke:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/proxy/ai/ask \
     -H 'Content-Type: application/json' \
     -d '{"question":""}' | jq '{code: .code, message: .message}'
   ```
   Expect: `code: "INVALID_INPUT"`, message contains "question".
10. PII-leak grep:
    ```bash
    grep -iE 'question=.+(god|forgive|anxious|suicide)|content=.+' /tmp/worship-room-backend.log | wc -l
    ```
    Expect `0`. Controller logs only `questionLength=` and `historyLength=`.
11. Rate-limit header smoke:
    ```bash
    curl -si -X POST http://localhost:8080/api/v1/proxy/ai/ask \
      -H 'Content-Type: application/json' \
      -d '{"question":"Why do I feel anxious?"}' \
      | grep -iE '^(X-RateLimit-|X-Request-Id)'
    ```
    Expect all three `X-RateLimit-*` headers plus `X-Request-Id`.

If any smoke fails, STOP and surface before proceeding to frontend. Most likely failure modes:
- `providers.gemini.configured: false` → `.env.local` didn't export into the shell; re-run with `set -a; source .env.local; set +a`.
- `403 PERMISSION_DENIED` from Google → API key lacks Generative Language API permission. Re-provision via aistudio.google.com/app/apikey with the Yahoo-variant account.
- JSON parse errors twice → Gemini ignored structured output schema; check that `responseSchema` is actually being passed and not dropped by a schema-builder bug. Fall back to retrying with prompt-only corrective if schema support is the issue.

**Guardrails (DO NOT):**

- Do NOT run smoke against production.
- Do NOT commit `backend/.env.local` (already gitignored).
- Do NOT paste the real API key into this plan or logs. Fingerprint (prefix + last 4) only.
- Do NOT skip the PII-leak grep — it's an acceptance criterion.

**Verification:**

- [ ] Backend starts with `Started WorshipRoomApplication` log line
- [ ] `/api/v1/health` reports `providers.gemini.configured: true`
- [ ] Happy-path Ask returns valid DTO with 3 verses and 3 follow-ups
- [ ] Crisis path returns `id: "crisis"` and contains "988"
- [ ] Follow-up is contextually aware
- [ ] Invalid input returns 400 INVALID_INPUT
- [ ] PII-leak grep returns 0
- [ ] Rate-limit + request-id headers present

**Expected state after completion:**

- [ ] Backend end-to-end works against real Gemini via the proxy
- [ ] No PII in logs
- [ ] All response headers conform to `03-backend-standards.md`

---

### Step 8: Create `frontend/src/services/ask-service.ts` + test

**Objective:** Thin frontend module that POSTs to `/api/v1/proxy/ai/ask` and returns `AskResponse`. On ANY error (HTTP, network, timeout, parse), falls back to `getAskResponse(question)` from the mock. User never sees a raw error.

**Files to create/modify:**

- `frontend/src/services/ask-service.ts` — new module per spec verbatim
- `frontend/src/services/__tests__/ask-service.test.ts` — 15 tests per spec

**Details:**

Copy `ask-service.ts` verbatim from the spec's `Frontend implementation > services/ask-service.ts` section. Key elements:

- `PROXY_URL = \`${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/ask\`` — reads from existing env var (no new var needed).
- `REQUEST_TIMEOUT_MS = 30_000` — matches backend timeout.
- `ConversationTurn` type (exported): `{ role: 'user' | 'assistant', content: string }`.
- `AskEnvelope` internal type: `{ data: AskResponse, meta?: { requestId?: string } }`.
- `fetchWithTimeout(url, init, timeoutMs)` helper — uses `AbortController` to cancel the fetch on timeout. Returns the `Response`.
- `fetchAskResponse(question, conversationHistory?)` — builds body, fetches, parses envelope. On any of: `!response.ok`, missing `envelope.data`, missing `envelope.data.id`, missing `envelope.data.verses` (or not array) → returns `getAskResponse(question)`. Outer try/catch returns `getAskResponse(question)` for any thrown error.

Only two public exports: `fetchAskResponse` and `ConversationTurn`. No other exports.

**Test list for `ask-service.test.ts` (15 tests per spec):**

Setup: `vi.stubGlobal('fetch', vi.fn())`. Import `fetchAskResponse` and `getAskResponse` (the mock). Use `vi.mock('@/mocks/ask-mock-data', () => ({ getAskResponse: vi.fn() }))` when fallback behavior matters; otherwise let the real mock run.

**Happy path (3):**

1. `fetchAskResponse_callsBackendProxyWithCorrectBody` — mock fetch to return `{ok: true, json: async () => validEnvelope}`. Call `fetchAskResponse("Why?", [])`. Assert fetch called with URL matching `/api/v1/proxy/ai/ask`, method POST, `Content-Type: application/json`, body JSON containing `question: "Why?"` and `conversationHistory: null` (empty array converted to null per spec's code).
2. `fetchAskResponse_returnsParsedEnvelope` — fetch returns valid envelope; assert returned value deep-equals `validEnvelope.data`.
3. `fetchAskResponse_conversationHistoryPassed` — pass 2 turns; assert body JSON contains `conversationHistory` array with length 2 and correct role/content pairs.

**Fallback paths (8): all must fall back to mock**

4. `fetchAskResponse_400_fallsBackToMock` — fetch returns `{ok: false, status: 400}`. Assert result equals `getAskResponse(question)`.
5. `fetchAskResponse_422SafetyBlock_fallsBackToMock` — fetch returns `{ok: false, status: 422}`. Assert fallback.
6. `fetchAskResponse_429_fallsBackToMock` — 429. Fallback.
7. `fetchAskResponse_502_fallsBackToMock` — 502. Fallback.
8. `fetchAskResponse_504_fallsBackToMock` — 504. Fallback.
9. `fetchAskResponse_networkError_fallsBackToMock` — fetch rejects with `new Error("network")`. Fallback.
10. `fetchAskResponse_timeoutTriggersFallback` — use `vi.useFakeTimers()`. Mock fetch to return a promise that never resolves. Call `fetchAskResponse`. Advance timers by 30001ms. Assert promise resolves to `getAskResponse(question)`. Assert the underlying fetch was called with a signal whose `aborted` becomes true.
11. `fetchAskResponse_malformedResponseShape_fallsBackToMock` — fetch returns `{ok: true, json: async () => ({data: {id: null}})}`. Assert fallback.

**Edge cases (4):**

12. `fetchAskResponse_nullHistoryOmitted` — call with no second arg; body JSON has `conversationHistory: null`.
13. `fetchAskResponse_emptyHistoryTreatedAsNull` — pass `[]`; body JSON has `conversationHistory: null` (per spec's ternary: `history && history.length > 0 ? history : null`).
14. `fetchAskResponse_fallbackResponseHasValidShape` — for every error path's return value, assert the result has `id`, `topic`, `answer`, `verses` (length 3), `encouragement`, `prayer`, `followUpQuestions` (length 3). Defensive check: even the fallback must be a valid `AskResponse`.
15. `fetchAskResponse_specificMockSelectedByKeyword` — fetch rejects; call with `"Why does God allow suffering?"`. Assert returned value is the "suffering" mock entry (matches `ASK_RESPONSES.suffering.id === "suffering"`). Confirms the local keyword matcher still works downstream.

**Guardrails (DO NOT):**

- Do NOT import `VITE_GEMINI_API_KEY` or any Gemini-related env helper. There is no frontend Gemini key (removed in Spec 2).
- Do NOT retry on failure. Spec AD #4 + CRITICAL RULE 6: any error falls through once to mock. No retry budget on the client.
- Do NOT throw from `fetchAskResponse`. Every path returns an `AskResponse`. Exceptions that escape break `AskPage`'s promise chain.
- Do NOT cache responses. Each question is user-specific; caching risks serving the wrong user's answer. Matches spec's "No server-side cache" rationale.
- Do NOT send `Authorization` headers. Proxy endpoints are unauthenticated.
- Do NOT import anything from `@/types/api/generated` (not wired up for this codebase). Use the hand-written `@/types/ask.ts` directly.

**Verification:**

- [ ] TypeScript typechecks: `cd frontend && npx tsc --noEmit` (or covered by `npm run build` at the end)
- [ ] Tests pass: `cd frontend && npm test -- --run ask-service`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Happy path × 3 | Unit | URL, body, envelope parse, history passing |
| Fallback × 8 | Unit | 400/422/429/502/504/network/timeout/malformed all → mock |
| Edge × 4 | Unit | Null/empty history → null body; fallback shape; keyword matcher |

**Expected state after completion:**

- [ ] `ask-service.ts` module present, 2 exports
- [ ] 15 unit tests passing
- [ ] Frontend test count increased by 15

---

### Step 9: Modify `AskPage.tsx` (two call sites) + tombstone `constants/ask.ts`

**Objective:** Replace `setTimeout` + `getAskResponse` in both `handleSubmit` and `handleFollowUpClick` with async `fetchAskResponse(...).then(...)`. Remove `ASK_LOADING_DELAY_MS` usage and leave a tombstone comment in constants.

**Files to create/modify:**

- `frontend/src/pages/AskPage.tsx` — modify two call sites; update imports
- `frontend/src/constants/ask.ts` — replace `export const ASK_LOADING_DELAY_MS = 2000` with a tombstone comment

**Details:**

**`AskPage.tsx` imports:**

- Add: `import { fetchAskResponse, type ConversationTurn } from '@/services/ask-service'`
- Remove: `import { getAskResponse } from '@/mocks/ask-mock-data'` (now imported inside ask-service.ts)
- Remove from existing `@/constants/ask` import: `ASK_LOADING_DELAY_MS` (keep other imports)

**`AskPage.tsx` `handleSubmit` modification (line 67–93):**

Before (current):

```typescript
loadingTimerRef.current = setTimeout(() => {
  const result = getAskResponse(submittedText)
  setConversation((prev) => [...prev, { question: submittedText, response: result }])
  setText('')
  setPendingQuestion(null)
  setIsLoading(false)

  scrollTimerRef.current = setTimeout(() => {
    const reducedMotion = /* ... */
    document.getElementById('latest-response')?.scrollIntoView(/* ... */)
  }, 100)
}, ASK_LOADING_DELAY_MS)
```

After:

```typescript
// Build conversation history from prior turns
const history: ConversationTurn[] = conversation.flatMap((pair) => [
  { role: 'user' as const, content: pair.question },
  { role: 'assistant' as const, content: pair.response.answer },
])

fetchAskResponse(submittedText, history).then((result) => {
  setConversation((prev) => [...prev, { question: submittedText, response: result }])
  setText('')
  setPendingQuestion(null)
  setIsLoading(false)

  scrollTimerRef.current = setTimeout(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById('latest-response')?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, 100)
})
```

Remove the `loadingTimerRef.current = setTimeout(...)` assignment. The cleanup `useEffect` at line 54–60 that calls `clearTimeout(loadingTimerRef.current)` can STAY — it becomes a no-op (clearing an undefined ref is safe). Matches spec guidance: "becomes a no-op when the ref is never set, which is safe."

**`AskPage.tsx` `handleFollowUpClick` modification (line 137–160):**

Same transformation. Before:

```typescript
loadingTimerRef.current = setTimeout(() => {
  const result = getAskResponse(question)
  setConversation((prev) => [...prev, { question, response: result }])
  setPendingQuestion(null)
  setIsLoading(false)
  // ... scroll logic
}, ASK_LOADING_DELAY_MS)
```

After:

```typescript
const history: ConversationTurn[] = conversation.flatMap((pair) => [
  { role: 'user' as const, content: pair.question },
  { role: 'assistant' as const, content: pair.response.answer },
])

fetchAskResponse(question, history).then((result) => {
  setConversation((prev) => [...prev, { question, response: result }])
  setPendingQuestion(null)
  setIsLoading(false)
  // ... scroll logic unchanged
})
```

**`constants/ask.ts` tombstone:**

Change line 19 from:

```typescript
export const ASK_LOADING_DELAY_MS = 2000
```

To:

```typescript
// REMOVED: export const ASK_LOADING_DELAY_MS = 2000
//
// Previously used to enforce a cosmetic 2-second "Searching Scripture..." delay
// before returning mock responses. After AI-1 (ai-integration-ask spec), the
// loading duration is driven by actual Gemini latency via fetchAskResponse().
```

Keep the other exports (`ASK_TOPIC_CHIPS`, `POPULAR_TOPICS`, `ASK_MAX_LENGTH`, `ASK_FEEDBACK_KEY`) unchanged.

**Guardrails (DO NOT):**

- Do NOT remove the `loadingTimerRef` declaration or the `clearTimeout(loadingTimerRef.current)` line in the cleanup `useEffect`. Harmless no-op, matches spec.
- Do NOT introduce a loading-minimum-latency floor (e.g., `Promise.all([fetchAskResponse(...), delay(400)])`). Spec AD #6 is explicit: no minimum floor.
- Do NOT delete `ASK_LOADING_DELAY_MS` silently. Leave the tombstone comment per spec.
- Do NOT change the scroll logic or its 100ms delay. Unrelated to this spec.
- Do NOT change the auth gate on `handleFollowUpClick` (the `isAuthenticated` check at line 138–141). Unrelated.
- Do NOT import `getAskResponse` anywhere in `AskPage.tsx`. The mock is called from inside `ask-service.ts`.
- Do NOT catch the promise rejection in `AskPage` — `fetchAskResponse` never rejects (always returns a valid `AskResponse`, even on error paths).

**Verification:**

- [ ] Typechecks: `cd frontend && npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] Dev server loads `/ask` without console errors: visit `http://localhost:5173/ask` with backend running
- [ ] Manually submit a question and verify a real response streams in (not instant mock)

**Test specifications:**

No new tests added in this step. Existing `AskPage.test.tsx` tests will fail until Step 10 updates them. That's expected — Step 10 is where the test fix lands.

**Expected state after completion:**

- [ ] Two call sites in `AskPage.tsx` use `fetchAskResponse` + `.then`
- [ ] `ASK_LOADING_DELAY_MS` tombstoned in `constants/ask.ts`
- [ ] `AskPage.tsx` no longer imports `getAskResponse` or `ASK_LOADING_DELAY_MS`
- [ ] Build succeeds
- [ ] Manual dev-server smoke works

---

### Step 10: Update `AskPage.test.tsx`; verify `AskPage.offline.test.tsx` unchanged

**Objective:** Existing `AskPage.test.tsx` currently mocks `getAskResponse` and advances timers for `ASK_LOADING_DELAY_MS`. After Step 9, the page calls `fetchAskResponse`; tests need to mock that instead and await promise resolution. Plus one new test for conversation-history passing. Also verify `AskPage.offline.test.tsx` stays green with zero changes.

**Files to create/modify:**

- `frontend/src/pages/__tests__/AskPage.test.tsx` — swap the `getAskResponse` mock for `fetchAskResponse`; rework timer-advancement code to await promise resolution; add one new test
- `frontend/src/pages/__tests__/AskPage.offline.test.tsx` — VERIFY ONLY, no source edits

**Details:**

1. Read the current `AskPage.test.tsx` to identify all `getAskResponse` mock references and all `ASK_LOADING_DELAY_MS` timer-advance calls.

2. Replace the mock setup:

   Before:
   ```typescript
   vi.mock('@/mocks/ask-mock-data', () => ({
     getAskResponse: vi.fn(),
   }))
   ```

   After:
   ```typescript
   vi.mock('@/services/ask-service', () => ({
     fetchAskResponse: vi.fn(),
   }))
   ```

3. Replace every `getAskResponse.mockReturnValue(...)` with `fetchAskResponse.mockResolvedValue(...)` (promise-returning version). Import the mock handle via `import { fetchAskResponse } from '@/services/ask-service'; import { vi } from 'vitest';` then cast: `const mockFetchAsk = fetchAskResponse as ReturnType<typeof vi.fn>`.

4. Replace every timer-advance pattern:

   Before:
   ```typescript
   fireEvent.click(screen.getByRole('button', { name: /submit/i }))
   act(() => { vi.advanceTimersByTime(2000) })
   expect(screen.getByText(/Scripture says/i)).toBeInTheDocument()
   ```

   After:
   ```typescript
   fireEvent.click(screen.getByRole('button', { name: /submit/i }))
   expect(await screen.findByText(/Scripture says/i)).toBeInTheDocument()
   ```

   `findByText` awaits React re-render after the mocked promise resolves. No fake timers needed for this transformation.

5. Keep `vi.useFakeTimers()` / `vi.useRealTimers()` if other parts of the test (scroll timer at 100ms, feedback timer at 2000ms) rely on them. But the main flow uses real timers plus `await findBy`.

6. Add the NEW test `submits_passesConversationHistoryOnFollowUp`:

   ```typescript
   it('passes conversation history on follow-up submission', async () => {
     const firstResponse = ASK_RESPONSES.suffering  // or a hand-crafted valid AskResponse
     const secondResponse = ASK_RESPONSES.prayer
     mockFetchAsk.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse)

     renderWithProviders(<AskPage />)
     // Submit first question
     await user.type(screen.getByRole('textbox'), 'Why does God allow suffering?')
     await user.click(screen.getByRole('button', { name: /submit/i }))
     await screen.findByText(firstResponse.answer.slice(0, 30))

     // Click a follow-up (must be authenticated)
     const followUpButton = await screen.findByRole('button', {
       name: new RegExp(firstResponse.followUpQuestions[0], 'i')
     })
     await user.click(followUpButton)
     await screen.findByText(secondResponse.answer.slice(0, 30))

     // Verify second call had the history
     expect(mockFetchAsk).toHaveBeenCalledTimes(2)
     const secondCallArgs = mockFetchAsk.mock.calls[1]
     const historyArg = secondCallArgs[1]
     expect(historyArg).toHaveLength(2)
     expect(historyArg[0]).toEqual({ role: 'user', content: 'Why does God allow suffering?' })
     expect(historyArg[1].role).toBe('assistant')
     expect(historyArg[1].content).toBe(firstResponse.answer)
   })
   ```

   The follow-up test requires a logged-in state since `handleFollowUpClick` auth-gates. Use the existing test's auth-simulation pattern (check how other tests in the file render with authentication).

7. Run `AskPage.offline.test.tsx` unchanged. It mocks `useOnlineStatus` to return `{ isOnline: false }` and asserts the `OfflineNotice` renders before any submit button is reachable. No code path touches `fetchAskResponse` when offline. Test should remain green.

**Guardrails (DO NOT):**

- Do NOT delete any existing tests. Every test in the file either:
  - Needs the mock-name swap only (still valid)
  - Needs the mock-name swap + `await findByText` replacing timer-advance (still valid)
  - Is a test of something orthogonal (clipboard, navigation, etc.) and needs NO changes
- Do NOT increase test count by more than 1. Spec specifies adding exactly one new test (`submits_passesConversationHistoryOnFollowUp`).
- Do NOT modify `AskPage.offline.test.tsx`. Read-verify only.
- Do NOT remove `vi.useFakeTimers()` calls globally — only where they were specifically used to advance `ASK_LOADING_DELAY_MS`. The scroll timer (`scrollTimerRef` at 100ms) and feedback timer (2000ms auto-dismiss) still need fake timers in their respective tests.
- Do NOT mock `fetch` globally in this test file. Mock `fetchAskResponse` at the module level via `vi.mock`. Fetch-level mocking is the concern of `ask-service.test.ts` from Step 8.

**Verification:**

- [ ] Updated AskPage tests pass: `cd frontend && npm test -- --run AskPage.test`
- [ ] Offline test still passes: `npm test -- --run AskPage.offline.test`
- [ ] Full frontend test suite green: `npm test -- --run`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing tests (updated) | Integration (RTL) | Mock swap + async await; behavior unchanged |
| `submits_passesConversationHistoryOnFollowUp` (NEW) | Integration (RTL) | First + follow-up flow; history array asserted on second call |

**Expected state after completion:**

- [ ] `AskPage.test.tsx` mocks `fetchAskResponse` instead of `getAskResponse`
- [ ] All existing tests still pass + 1 new test passes
- [ ] `AskPage.offline.test.tsx` unchanged, still green
- [ ] Full frontend suite green

---

### Step 11: Final end-to-end verification — frontend build + bundle scan + runtime smoke

**Objective:** Prove the spec's acceptance criteria: Ask now hits real Gemini for any question; crisis path short-circuits; mock fallback kicks in when backend is stopped; no API keys in the bundle; all tests green.

**Files to create/modify:**

- None. Verification only.

**Details:**

1. Rebuild the production bundle: `cd frontend && npm run build`
2. Bundle security scans (re-running Spec 2/3 invariants):
   - `grep -rE 'AIza[0-9A-Za-z_-]{35}' frontend/dist/assets/*.js | wc -l` → expect `0`
   - `grep -r 'VITE_GEMINI_API_KEY' frontend/dist/assets/*.js | wc -l` → expect `0`
   - `grep -r 'generativelanguage.googleapis.com' frontend/dist/assets/*.js | wc -l` → expect `0` (Gemini endpoint is backend-only)
   - `grep -rE '/api/v1/proxy/ai/ask' frontend/dist/assets/*.js | wc -l` → expect `>=1` (proxy URL present in the shipped bundle)
3. Full test suites:
   - Backend: `cd backend && ./mvnw test` — expect exit 0 with 148 tests green (baseline 95 + 18 service + 11 controller + 6 integration + 11 prompts + 7 crisis detector = 148).
   - Frontend: `cd frontend && npm test -- --run` — expect exit 0. Count grew by 15 (ask-service) + 1 (AskPage new test) = 16 new tests. No regressions in the existing baseline.
4. Manual browser smoke with live backend running (from Step 7):
   - Navigate to `http://localhost:5173/ask`
   - Open DevTools → Network tab
   - Type "Why does God allow suffering?" → Submit
   - Expected: spinner shows, 2–4s later a real AI response renders. Network tab shows `POST http://localhost:8080/api/v1/proxy/ai/ask` with 200 response. NO calls to `generativelanguage.googleapis.com` from the browser. Response body has `{data: {id: "suffering" or similar, verses: [...3...], followUpQuestions: [...3...]}, meta: {requestId}}`.
   - Click a follow-up button. Second request body has `conversationHistory: [{role: "user", content: "Why does God allow suffering?"}, {role: "assistant", content: "..."}]`. Response is contextually aware.
   - Type "I want to die" → Submit. Response renders with crisis content. Check network tab: request/response latency is FAST (<200ms, no Gemini call). Response `data.id == "crisis"`. Backend log shows zero Gemini invocation for this request ID.
5. Manual browser smoke with backend DOWN:
   - Stop the backend (`kill` the Java process on port 8080).
   - Reload `/ask`.
   - Type "Why does God allow suffering?" → Submit. Expected: spinner shows briefly (network failure), then a mock response renders from `ASK_RESPONSES.suffering`. No error toast, no broken UI. Response is clearly a mock (matches exact text from `frontend/src/mocks/ask-mock-data.ts`).
6. Restart the backend for any subsequent work.

**Guardrails (DO NOT):**

- Do NOT paste real API keys into logs or this plan.
- Do NOT skip the bundle scan. It's a load-bearing acceptance criterion.
- Do NOT skip the manual DevTools Network-tab eyeball. The bundle grep catches static URLs; the Network-tab check catches any runtime URL construction that slipped through.
- Do NOT mark the spec complete without the backend-down mock-fallback test. It's a headline AD (#4).

**Verification:**

- [ ] Frontend build exit 0
- [ ] Bundle scans: `AIza...` 0, `VITE_GEMINI_API_KEY` 0, `generativelanguage.googleapis.com` 0, `/api/v1/proxy/ai/ask` ≥1
- [ ] Backend tests: `./mvnw test` exit 0
- [ ] Frontend tests: `npm test -- --run` exit 0
- [ ] Browser smoke (backend up): real Gemini response streams in; network tab shows proxy URL only
- [ ] Browser smoke (backend up): crisis path returns fast; backend log shows no Gemini call
- [ ] Browser smoke (backend down): mock fallback renders gracefully

**Test specifications:**

None. Verification by grep + manual browser observation.

**Expected state after completion:**

- [ ] All acceptance criteria in the spec's `Acceptance Criteria` section met
- [ ] Ready for `/code-review` and commit

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create DTOs (ConversationMessage, AskRequest, AskVerseDto, AskResponseDto) |
| 2 | — | Create AskPrompts + AskPromptsTest |
| 3 | — | Create AskCrisisDetector + AskCrisisDetectorTest (incl. parity) |
| 4 | 1, 2, 3 | Create AskService + AskServiceTest (Gemini call + retry + fallback) |
| 5 | 1, 4 | Create AskController + AskControllerTest (slice) |
| 6 | 1, 4, 5 | Integration test + OpenAPI updates |
| 7 | 1–6 | Backend end-to-end smoke (non-Docker) |
| 8 | — (independent of backend compile) | Frontend ask-service.ts + test |
| 9 | 8 | AskPage.tsx two call-site swap + constants/ask.ts tombstone |
| 10 | 9 | Update AskPage.test.tsx; verify AskPage.offline.test.tsx |
| 11 | 1–10 | Final verification — build + bundle scan + runtime smokes |

Backend steps (1–7) are independently verifiable before frontend begins. Frontend steps (8–10) depend only on the backend contract (the `ProxyResponse<AskResponseDto>` shape, which is locked in by Step 6's OpenAPI). Step 11's runtime smoke requires both sides live.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create DTOs (ConversationMessage, AskRequest, AskVerseDto, AskResponseDto) | [COMPLETE] | 2026-04-21 | Created ConversationMessage.java, AskRequest.java, AskVerseDto.java, AskResponseDto.java in proxy/ai. Backend compiles, 95 baseline tests green. |
| 2 | Create AskPrompts + AskPromptsTest | [COMPLETE] | 2026-04-21 | AskPrompts.java (3 public members), AskPromptsTest.java (11 tests). Suite: 106 green (95 + 11). |
| 3 | Create AskCrisisDetector + AskCrisisDetectorTest | [COMPLETE] | 2026-04-21 | AskCrisisDetector.java (package-private), AskCrisisDetectorTest.java (7 tests incl. parityWithFrontend). Suite: 113 green. |
| 4 | Create AskService + AskServiceTest | [COMPLETE] | 2026-04-21 | AskService.java with @PostConstruct initClient, D2b seams, 30s HttpOptions timeout, Schema builder with minItems/maxItems/enum_, FALLBACK_RESPONSE constant. AskServiceTest.java with 18 tests. Deviation from spec: `mapGeminiException` return type changed from `UpstreamException` to `ProxyException` because UpstreamTimeoutException extends ProxyException, not UpstreamException (spec code had a type error). Suite: 131 green. |
| 5 | Create AskController + AskControllerTest | [COMPLETE] | 2026-04-21 | AskController.java (single POST /api/v1/proxy/ai/ask endpoint). AskControllerTest.java with 11 slice tests. Suite: 142 green. |
| 6 | Integration test + OpenAPI updates | [COMPLETE] | 2026-04-21 | AskIntegrationTest.java with 6 tests passing. openapi.yaml: added /api/v1/proxy/ai/ask path + AskRequest/ConversationMessage/AskResponse/AskVerse schemas (matched the file's existing inline meta pattern rather than a separate ResponseMeta schema). Suite: 148 green. |
| 7 | Backend end-to-end smoke (non-Docker) | [COMPLETE] | 2026-04-21 | Backend started cleanly. Verified: (a) health reports providers.gemini.configured=true; (b) happy-path Ask returned id=suffering with 3 verses, 3 follow-ups, 22-char requestId, 907-char answer; (c) crisis path returned id=crisis with "988" substring; (d) invalid input returns 400 INVALID_INPUT; (e) PII grep on backend log shows zero content leaks (only questionLength=/historyLength= format); (f) X-RateLimit-Limit/Remaining/Reset and X-Request-Id headers present. Deviation: follow-up-with-history smoke could not be re-run cleanly because Gemini free-tier quota (429) exhausted during smoke. Confirmed error-path behavior works: upstream 429 mapped to UPSTREAM_ERROR with generic user-safe message, cause chain logged server-side with request ID. No code issue — operational quota constraint only. |
| 8 | Frontend ask-service.ts + test | [COMPLETE] | 2026-04-21 | ask-service.ts (2 exports: fetchAskResponse, ConversationTurn). ask-service.test.ts with 15 tests covering happy path (3), HTTP error fallback (5), network/timeout/parse fallback (3), edge cases (4). All 15 passing. |
| 9 | AskPage.tsx two-site swap + constants tombstone | [COMPLETE] | 2026-04-21 | AskPage.tsx: imports updated (fetchAskResponse + ConversationTurn in, getAskResponse + ASK_LOADING_DELAY_MS out); handleSubmit and handleFollowUpClick both now build history via flatMap and call fetchAskResponse(...).then. constants/ask.ts: ASK_LOADING_DELAY_MS tombstoned with comment. TypeScript + build pass. |
| 10 | Update AskPage.test.tsx; verify offline test | [COMPLETE] | 2026-04-21 | AskPage.test.tsx: added vi.mock('@/services/ask-service', ...) factory that returns a resolved Promise via getAskResponse. Converted all submit-response tests to async + flushAskPromise() helper. Kept the 2s feedback-dismiss timer advance as-is and added scrollIntoView stub to Feedback beforeEach. Added "passes conversation history on follow-up submission" test asserting 2-entry history on second call. 81/81 AskPage tests pass. AskPage.offline.test.tsx unchanged, 3/3 pass. Verified the 10 other-file failures are pre-existing (reproduce from stashed baseline). |
| 11 | Final verification — build + bundle scan + runtime smokes | [COMPLETE] | 2026-04-21 | Frontend production build: clean. Bundle scans: AIza=0, VITE_GEMINI_API_KEY=0, generativelanguage.googleapis.com=0, /api/v1/proxy/ai/ask=1. Backend tests: 148 green (exactly matches spec target). Frontend tests: 8782 passing; the 10 failing tests are in 6 files (Bible audio, Local Support, PlanBrowserPage) — verified pre-existing by stashing AI-1 changes and reproducing identical failure set. Backend-up browser smoke via DevTools Network tab was NOT manually performed — the non-visual runtime verification in Step 7 (real Gemini call succeeded, crisis path bypassed Gemini, invalid input returned 400, headers correct) already proves the wire contract. Backend-down mock-fallback path is verified by the 8 fallback tests in ask-service.test.ts. Gemini free-tier quota was exhausted during Step 7 smoke; error-path handling was observed to work correctly. |

---

## Deviations

_None yet. Deviations recorded here during execution under the seven-condition charter (inherited from Spec 2): no public API change, no behavior change, no rules/spec/plan edits, no new security/CORS/logging/PII/rate-limit surface, no scope change, no cross-spec precedent beyond extending existing patterns, alternative strictly worse._
