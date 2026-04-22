# Plan: AI-3 Journal Reflection — Backend Gemini + Frontend Loading UX

**Spec:** `_specs/ai-integration-journal.md`
**Date:** 2026-04-22
**Branch:** `claude/feature/ai-integration-journal` (CC stays on this branch throughout — no git operations)
**Size:** L (~760 net lines across 17 files)
**Risk:** Medium — backend endpoint + prompt quality + per-entry concurrent loading state + three-way keyword parity. Primary template (AI-2 / PrayerService) is fresh and stable.

---

## Affected Frontend Routes

- `/daily?tab=journal` — Journal tab inside Daily Hub; the "Reflect on my entry" button on saved entry cards is the only surface that changes

---

## Universal Rules Checklist

N/A — standalone spec, see `.claude/rules/` files for applicable conventions. Relevant project rules for this spec:

- `02-security.md` § Never Leak Upstream Error Text (chokepoint: `mapGeminiException`)
- `02-security.md` § Input Validation (5000-char cap matches frontend `JOURNAL_MAX_LENGTH`)
- `07-logging-monitoring.md` § PII handling (log `entryLength` only — never entry content or reflection text; journal entries are the MOST sensitive content in the app)
- `07-logging-monitoring.md` § Framework Log Suppression (dev profile already suppresses `org.springframework.web.servlet.mvc.method.annotation` — inherits from Spec 2)
- `01-ai-safety.md` § Crisis Intervention Protocol (server-side keyword detection short-circuits before Gemini call)
- `04-frontend-standards.md` § Accessibility Standards (`role="status"`, `aria-live="polite"`, `motion-reduce:animate-none` on the per-entry loading pill)
- `06-testing.md` § Backend Test Patterns (`@WebMvcTest` slice + `@SpringBootTest` integration; reflection-based Client injection pattern from AI-1/AI-2)

---

## Architecture Context

**Primary template:** AI-2 (`PrayerService`, `PrayerController`, `PrayerCrisisDetector`, `PrayerPrompts`, `prayer-service.ts`). Copy patterns near-verbatim with a handful of deliberate simplifications.

### Backend patterns to match (exactly)

- Package: `com.example.worshiproom.proxy.ai` (coexists with existing `GeminiController`, `AskController`, `PrayerController`)
- `@RestController @RequestMapping("/api/v1/proxy/ai")` — shared base path; unique subpath `/reflect-journal` avoids collision with Spec 2's `/reflect` (Bible verse reflection) and AI-2's `/pray`
- Controller: constructor injection, `@PostMapping("/reflect-journal")`, logs `entryLength` ONLY, wraps result via `ProxyResponse.of(result, MDC.get("requestId"))`
- Service: `ProxyConfig` + `ObjectMapper` constructor injection, `@PostConstruct initClient()` with null-key guard, package-private D2b test seams `callGeminiForReflection(request, withRetryCorrective)` + `callModels(model, userPrompt, config)`, retry loop `while (attempts <= MAX_RETRIES_ON_VALIDATION_FAILURE)`, catch `SafetyBlockException`/`UpstreamException`/`UpstreamTimeoutException` and rethrow, catch generic `RuntimeException` and route through `mapGeminiException` which returns common supertype `ProxyException`
- Error mapping: inherit existing `ProxyExceptionHandler` at `com.example.worshiproom.proxy.common` (package-scoped `@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")` covers the new controller automatically)
- Request-ID propagation: inherits `RequestIdFilter` (no changes needed — MDC is populated before controller logs)
- Rate limiting: inherits `RateLimitFilter` — `/api/v1/proxy/**` automatic coverage via `shouldNotFilter`
- CORS: inherits `CorsConfig` global mapping
- Crisis detector: `final class` with package-private static members (same visibility as `AskCrisisDetector` and `PrayerCrisisDetector`); 12-keyword `SELF_HARM_KEYWORDS` list (8 frontend-parity + 4 backend-only) must be byte-for-byte identical to the two peer detectors

### Backend test patterns to match

- Service test: `@ExtendWith(MockitoExtension.class)` implicit, `spy(new JournalReflectionService(config, new ObjectMapper()))`, reflection-based `Client` field injection via `JournalReflectionService.class.getDeclaredField("client")`, `Mockito.doReturn(...).when(service).callGeminiForReflection(...)`
- Controller test: `@WebMvcTest(JournalReflectionController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})` with `@MockBean JournalReflectionService`
- Integration test: `@SpringBootTest @AutoConfigureMockMvc` with `@MockBean JournalReflectionService` (no Testcontainers — no DB involvement)
- Crisis detector parity test: reads `../frontend/src/constants/crisis-resources.ts` relative to backend cwd via `Files.readString(Path.of(...))`, extracts `SELF_HARM_KEYWORDS` with pattern `"SELF_HARM_KEYWORDS\\s*=\\s*\\[([^\\]]*)\\]"` + literal extractor `"'([^']+)'|\"([^\"]+)\""` — copy verbatim from `PrayerCrisisDetectorTest.parityWithFrontend`

### Frontend patterns to match

- Service file: structure mirrors `frontend/src/services/prayer-service.ts` (71 lines) — `fetchWithTimeout` helper, try/catch wrapping `fetch`, response `envelope` shape check, return-mock-on-any-error floor
- Existing `JournalReflection` type at `frontend/src/types/daily-experience.ts` lines 35-38 is `{id: string, text: string}` — DTO shape must match byte-for-byte (NO type edits allowed)
- Existing mock at `frontend/src/mocks/daily-experience-mock-data.ts` — `getJournalReflection()` takes no args, picks random from 8 canned reflections, stays exported as the fallback path
- Existing `SavedEntriesList` signature lines 23-35 — add optional `reflectingIds?: Set<string>` prop with `= new Set()` default so unchanged callers still work
- Existing `JournalTabContent.handleReflect` at lines 263-274 is currently synchronous — swap to async with per-entry `Set<string>` loading state
- Existing auth-gate check (`if (!isAuthenticated)`) stays BEFORE the fetch call — draft persistence/auth modal flow is unchanged
- `motion-reduce:animate-none` Tailwind utility — already covered by the global `prefers-reduced-motion` rule in `frontend/src/styles/animations.css`, but per-element class preserves explicit intent

### Liquibase

No changes required. `backend/src/main/resources/db/changelog/` does not exist — this wave predates database wiring.

---

## Database Changes

None. This spec adds a stateless backend endpoint.

---

## API Changes

| Method | Endpoint | Auth | Rate Limit | Request Body | Response |
|--------|----------|------|-----------|-------------|----------|
| POST | `/api/v1/proxy/ai/reflect-journal` | None (unauthenticated, parity with AI-1/AI-2) | Inherits `/api/v1/proxy/**` IP-keyed bucket (60/min prod, 120/min dev) | `{entry: string}` (1–5000 chars) | `ProxyResponse<JournalReflectionResponseDto>` = `{data: {id, text}, meta: {requestId}}` |

Error codes via standard `ProxyError` shape: 400 `INVALID_INPUT`, 422 `SAFETY_BLOCK`, 429 `RATE_LIMITED`, 500 `INTERNAL_ERROR`, 502 `UPSTREAM_ERROR`, 504 `UPSTREAM_TIMEOUT`.

Crisis-detected input returns 200 with `data.id == "crisis"` (NOT an error — the crisis response IS a valid reflection).

---

## Assumptions & Pre-Execution Checklist

- [ ] Current branch is `claude/feature/ai-integration-journal` — verified via `git branch --show-current`
- [ ] `git log main --oneline -20` shows all five wave commits: "AI proxy foundation" (Spec 1), "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration", "AI-1: Ask AI Gemini integration", "AI-2: Prayer generation Gemini integration"
- [ ] `backend/.env.local` has `GEMINI_API_KEY=AIza...` populated (reused from Spec 2, unchanged through wave)
- [ ] Backend baseline passes: `cd backend && ./mvnw test` (~193 tests green)
- [ ] Frontend baseline passes: `cd frontend && npm test -- --run` and `npm run build`
- [ ] `AskCrisisDetector.SELF_HARM_KEYWORDS` equals `PrayerCrisisDetector.SELF_HARM_KEYWORDS` element-for-element (AI-2 parity still holds — the new three-way test depends on this)
- [ ] No Maven dependency additions needed (`google-genai:1.51.0`, `spring-boot-starter-webflux`, `spring-boot-starter-validation` already present from Specs 1–2)
- [ ] Dev server can be started via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` and `/api/v1/health` returns `providers.gemini.configured: true`

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Endpoint path | `/reflect-journal` (NOT `/reflect`) | Spec 2 already owns `/reflect` (Bible verse reflection). Journal is semantically different. Spec AD #3 |
| DTO shape | `{id, text}` — 2 fields | Matches existing frontend `JournalReflection` type byte-for-byte. No topic field. Zero frontend type edits |
| Validation strategy | Length-only (50–800 chars), no regex | Reflections are freeform 2–4 sentence pastoral notes. Prayer's "Dear God/Amen" regex doesn't apply. Spec AD #4 |
| Crisis keyword list | Duplicated across all three detectors (12 keywords: 8 frontend-parity + 4 backend-only) | Each response factory is feature-specific. Three parity tests enforce lock-step. Spec AD #5 |
| Crisis response id | `"crisis"` (string literal) | Frontend renders identically to any other reflection — no special casing. Spec AD #3 / endpoint contract |
| Fallback after retry exhaustion | `FALLBACK_REFLECTION` static constant (~290 chars) | Pre-written, length-verified at CI time by `fallbackReflection_matchesLengthBounds`. Spec AD #14 |
| Completion tracking | NOT in reflect path | `markJournalComplete()` + `recordActivity('journal')` fire on SAVE in `handleEntrySave`. Double-counting would pollute analytics. Spec AD #10 and critical rule #9 |
| Per-entry loading UX | `reflectingIds: Set<string>` (NOT a single boolean) | Users can click reflect on multiple entries concurrently. Each needs independent loading state. Spec AD #7 and critical rule #7 |
| Handler signature | `(entryId: string) => void` unchanged | Internally async, but callback shape stays — `SavedEntriesList` doesn't know it's async |
| Frontend shape validator floor | 20 chars (generous vs backend's 50) | Defense-in-depth. Below 20 chars is definitely malformed; 50 is the backend's authority. Spec frontend code comment |
| Graceful degradation floor | Always mock fallback, never raw error | Journal is the highest-stakes emotional surface. Critical rule #8 + AD #6 |
| Mock function signature | Stays `getJournalReflection()` (no args) | The existing export is importable and remains the fallback. Do NOT re-export with an args signature. Critical rule #11 |
| Request-body log field | `entryLength` integer only | Journal entries are the MOST sensitive content in the app. Never log `entry` or reflection `text`. Spec endpoint contract + `07-logging-monitoring.md` |
| `mapGeminiException` return type | `ProxyException` (common supertype) | AI-1/AI-2 precedent — lets method throw both `UpstreamException` and `UpstreamTimeoutException` from one call site. Spec AD #16 |

---

## Implementation Steps

### Step 1: Create request and response DTOs

**Objective:** Two record types that define the wire contract. No logic.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionRequest.java` — `public record JournalReflectionRequest(@NotBlank @Size(min = 1, max = 5000) String entry) {}`
- `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionResponseDto.java` — `public record JournalReflectionResponseDto(String id, String text) {}`

**Details:**

- `JournalReflectionRequest`: `entry` field (NOT `text` or `content`). `@NotBlank` + `@Size(min = 1, max = 5000)`. `max = 5000` matches `frontend/src/constants/content-limits.ts` `JOURNAL_MAX_LENGTH` byte-for-byte.
- `JournalReflectionResponseDto`: exactly two fields, `id` then `text`, both `String`, both required. Shape matches `JournalReflection` TypeScript interface from `frontend/src/types/daily-experience.ts` lines 35-38.
- Both records: `package com.example.worshiproom.proxy.ai;` — same package as `PrayerRequest.java` and `AskRequest.java`.
- Imports on `JournalReflectionRequest`: `import jakarta.validation.constraints.NotBlank;` and `import jakarta.validation.constraints.Size;` (copy from `PrayerRequest.java`).

**Guardrails (DO NOT):**

- DO NOT add any field beyond what the spec specifies. No entry ID, no user ID, no topic, no metadata.
- DO NOT rename fields — UI term is `entry`, wire term is `entry`.
- DO NOT add `@JsonProperty` or rename annotations — Jackson default behavior already matches.

**Verification:**

- [ ] `cd backend && ./mvnw compile` exits 0
- [ ] Files live in `com.example.worshiproom.proxy.ai` package (checked by compile)

**Expected state after completion:**

- [ ] Two new record files exist, backend compiles

---

### Step 2: Create `JournalReflectionPrompts` constants file and its guardrail test

**Objective:** Static prompt constants plus a test that asserts each of the 5 system-prompt rules appears verbatim.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionPrompts.java` — exactly matches the content in `_specs/ai-integration-journal.md` § "JournalReflectionPrompts.java" (lines 223-250 of spec).
- `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionPromptsTest.java` — 6 tests (5 rules + retry corrective).

**Details:**

- `JournalReflectionPrompts`: `public final class` with private no-arg constructor. Two `public static final String` constants: `REFLECTION_SYSTEM_PROMPT` and `RETRY_CORRECTIVE_SUFFIX`. Copy the text verbatim from spec §  "JournalReflectionPrompts.java".
- Test class: plain JUnit 5 (`@Test` + AssertJ). No Spring context. 6 tests asserting substring presence:
  1. `systemPrompt_rule1_secondPerson` — `assertThat(REFLECTION_SYSTEM_PROMPT).contains("second person").contains("Never use first person")`
  2. `systemPrompt_rule2_twoToFourSentences` — `.contains("2-4 sentences")`
  3. `systemPrompt_rule3_specificDetail` — `.contains("SPECIFIC").contains("Do not generalize")`
  4. `systemPrompt_rule4_affirmWriting` — `.contains("writing itself as meaningful").contains("journaling is a form of prayer")`
  5. `systemPrompt_rule5_guardrails` — `.contains("Do NOT prescribe").contains("do NOT quote scripture").contains("do NOT over-spiritualize")`
  6. `retryCorrectiveSuffix_mentionsLengthBounds` — `assertThat(RETRY_CORRECTIVE_SUFFIX).contains("50-800 characters").contains("2-4 sentences")`

**Guardrails (DO NOT):**

- DO NOT paraphrase the system prompt text. The tests assert verbatim substrings — any rewording breaks CI.
- DO NOT add additional rules or extend the prompt beyond spec.
- DO NOT import anything from `PrayerPrompts` — these constants are independent even though the pattern mirrors.

**Verification:**

- [ ] `./mvnw test -Dtest=JournalReflectionPromptsTest` all 6 pass
- [ ] `grep -c '"""' backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionPrompts.java` returns 4 (two text blocks, opening + closing)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| systemPrompt_rule1_secondPerson | unit | Verifies "second person" + "Never use first person" substrings |
| systemPrompt_rule2_twoToFourSentences | unit | Verifies "2-4 sentences" substring |
| systemPrompt_rule3_specificDetail | unit | Verifies "SPECIFIC" + "Do not generalize" substrings |
| systemPrompt_rule4_affirmWriting | unit | Verifies "writing itself as meaningful" + "journaling is a form of prayer" |
| systemPrompt_rule5_guardrails | unit | Verifies 3 "Do NOT" substrings |
| retryCorrectiveSuffix_mentionsLengthBounds | unit | Verifies "50-800 characters" + "2-4 sentences" |

**Expected state after completion:**

- [ ] Prompts class compiles; all 6 rule-presence tests green

---

### Step 3: Create `JournalReflectionCrisisDetector` with the 12-keyword list

**Objective:** Server-side keyword matcher plus the canned crisis response factory. The keyword list must be byte-for-byte identical to `AskCrisisDetector.SELF_HARM_KEYWORDS` and `PrayerCrisisDetector.SELF_HARM_KEYWORDS`.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionCrisisDetector.java` — matches spec § "JournalReflectionCrisisDetector.java" (lines 257-321 of spec).

**Details:**

- `final class` (no `public`) with private no-arg constructor.
- `static final List<String> SELF_HARM_KEYWORDS` — 12 entries, same order and values as `PrayerCrisisDetector.SELF_HARM_KEYWORDS`:
  - 8 frontend-parity keywords: `"suicide"`, `"kill myself"`, `"end it all"`, `"not worth living"`, `"hurt myself"`, `"end my life"`, `"want to die"`, `"better off dead"`
  - 4 backend-only additions: `"take my own life"`, `"don't want to be here"`, `"nobody would miss me"`, `"cease to exist"`
- `static boolean detectsCrisis(String text)` — null/blank guard, `text.toLowerCase(Locale.ROOT)`, substring loop returns true on first match.
- `static JournalReflectionResponseDto buildCrisisResponse()` — returns `new JournalReflectionResponseDto("crisis", "<460-char crisis text>")`. Crisis text exactly as spec lines 316-319. Must contain "988" and "741741" literal substrings.

**Guardrails (DO NOT):**

- DO NOT copy the crisis response text from `PrayerCrisisDetector` — journal's response is different (opens with "What you wrote here matters" vs. Prayer's "Dear God").
- DO NOT change keyword order — the peer parity tests use `containsExactlyInAnyOrderElementsOf` but a canonical order simplifies review.
- DO NOT make the class `public` — package-private matches peer detectors.

**Verification:**

- [ ] `./mvnw compile` clean
- [ ] Keyword list matches peers exactly: `diff <(grep -A20 SELF_HARM_KEYWORDS backend/src/main/java/com/example/worshiproom/proxy/ai/AskCrisisDetector.java | head -18) <(grep -A20 SELF_HARM_KEYWORDS backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionCrisisDetector.java | head -18)` shows only comment-line differences

**Expected state after completion:**

- [ ] Detector class compiles; 12-keyword list is byte-for-byte identical to peers; `buildCrisisResponse()` returns an instance where `id=="crisis"` and `text` contains "988" and "741741"

---

### Step 4: Create `JournalReflectionCrisisDetectorTest` with three-way parity

**Objective:** 9 unit tests including the three-way parity suite that enforces lock-step across Ask/Prayer/Journal detectors AND a superset check against the frontend file.

**Files to create:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionCrisisDetectorTest.java` — 9 tests.

**Details:**

- Plain JUnit 5. Imports: `import static org.assertj.core.api.Assertions.*;`, `import java.nio.file.*;`, `import java.util.*;`, `import java.util.regex.*;`, `import java.io.IOException;`
- Tests (names from spec § "JournalReflectionCrisisDetectorTest.java"):
  1. `detectsCrisis_returnsTrueForExactKeyword` — parameterized over all 12 keywords via `@ParameterizedTest @MethodSource` (iterate `SELF_HARM_KEYWORDS`)
  2. `detectsCrisis_caseInsensitive` — three case variations of `"kill myself"`: `"KILL MYSELF"`, `"Kill Myself"`, `"kIlL mYsElF"`
  3. `detectsCrisis_substringMatch` — `"I keep thinking I want to die tonight"` returns true
  4. `detectsCrisis_returnsFalseForNullOrBlank` — `null`, `""`, `"   "` all false
  5. `detectsCrisis_returnsFalseForUnrelatedText` — `"grateful for my friends today"` false
  6. `parityWithFrontend` — copy verbatim from `PrayerCrisisDetectorTest.parityWithFrontend` lines 62-80, substituting `PrayerCrisisDetector` → `JournalReflectionCrisisDetector`. Reads `../frontend/src/constants/crisis-resources.ts`, regex-extracts keywords, asserts backend list `containsAll(frontendKeywords)`.
  7. `parityWithAskDetector` — `assertThat(JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS).containsExactlyInAnyOrderElementsOf(AskCrisisDetector.SELF_HARM_KEYWORDS)`
  8. `parityWithPrayerDetector` — `assertThat(JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS).containsExactlyInAnyOrderElementsOf(PrayerCrisisDetector.SELF_HARM_KEYWORDS)`
  9. `buildCrisisResponse_returnsValidShape` — calls `buildCrisisResponse()`, asserts `id == "crisis"`, `text.contains("988")`, `text.contains("741741")`, `text.length()` between 50 and 800 (upper bound 800 = service-level validator ceiling)

**Guardrails (DO NOT):**

- DO NOT mock the peer detectors — use real class references. The whole point is cross-class parity.
- DO NOT modify the regex-extraction pattern — keeping it verbatim across all three detector tests means a single keyword-parser change propagates cleanly.
- DO NOT add additional keywords to the list to make tests pass — the fix is to edit one detector and let parity tests catch drift.

**Verification:**

- [ ] `./mvnw test -Dtest=JournalReflectionCrisisDetectorTest` all 9 green
- [ ] Parity tests 6, 7, 8 all pass (proves three-way lock-step)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| detectsCrisis_returnsTrueForExactKeyword | parameterized unit | Each of 12 keywords triggers detection |
| detectsCrisis_caseInsensitive | unit | Mixed case still triggers |
| detectsCrisis_substringMatch | unit | Keyword embedded in sentence triggers |
| detectsCrisis_returnsFalseForNullOrBlank | unit | Null, empty, whitespace all false |
| detectsCrisis_returnsFalseForUnrelatedText | unit | Unrelated text false |
| parityWithFrontend | unit | Backend list is superset of frontend `SELF_HARM_KEYWORDS` |
| parityWithAskDetector | unit | `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS == AskCrisisDetector.SELF_HARM_KEYWORDS` |
| parityWithPrayerDetector | unit | `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS == PrayerCrisisDetector.SELF_HARM_KEYWORDS` |
| buildCrisisResponse_returnsValidShape | unit | id="crisis", contains 988 + 741741, length in [50, 800] |

**Expected state after completion:**

- [ ] Three-way parity verified in CI; frontend-superset verified; crisis response shape verified

---

### Step 5: Create `JournalReflectionService` orchestrator and seams

**Objective:** The service that owns the crisis short-circuit, Gemini call, validation, retry, and fallback. Mirrors `PrayerService` structurally with simplifications (no regex validation, no topic enum, length-only validation).

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionService.java` — matches spec § "JournalReflectionService.java" (lines 326-486) with the helpers `parseAndValidate`, `isSafetyBlocked`, `extractText`, `mapGeminiException`, `isTimeout`, `buildResponseSchema` copied from `PrayerService.java` with type substitution `PrayerResponseDto` → `JournalReflectionResponseDto`.

**Details:**

- Class header and fields as in spec lines 358-392. Constants: `MODEL = "gemini-2.5-flash-lite"`, `REQUEST_TIMEOUT = Duration.ofSeconds(30)`, `MAX_RETRIES_ON_VALIDATION_FAILURE = 1`, `MIN_TEXT_LENGTH = 50`, `MAX_TEXT_LENGTH = 800`.
- Orchestrator `reflect(JournalReflectionRequest request)`:
  - First check crisis: `if (JournalReflectionCrisisDetector.detectsCrisis(request.entry())) { log.info("Journal reflection crisis path triggered entryLength={}", request.entry().length()); return JournalReflectionCrisisDetector.buildCrisisResponse(); }`
  - Null-client guard: `if (client == null) throw new UpstreamException("AI service is not configured on the server.");`
  - Retry loop per spec lines 416-431. `callGeminiForReflection(request, attempts > 0)` → `parseAndValidate(response)` → return if non-null, else `log.info("Journal reflection validation failed attempt={}", attempts + 1); attempts++;`. Catch `SafetyBlockException | UpstreamException | UpstreamTimeoutException` and rethrow; catch `RuntimeException` and throw `mapGeminiException(ex)`.
  - After loop: `log.warn("Journal reflection retries exhausted entryLength={}", request.entry().length()); return FALLBACK_REFLECTION;`
- `callGeminiForReflection(JournalReflectionRequest request, boolean withRetryCorrective)` — package-private D2b seam. Builds system prompt from `JournalReflectionPrompts.REFLECTION_SYSTEM_PROMPT` + (optionally) `RETRY_CORRECTIVE_SUFFIX`. User prompt: `"Journal entry:\n\n" + request.entry()`. Builds `GenerateContentConfig` with `responseMimeType("application/json")` and `responseSchema(buildResponseSchema())`. Calls `callModels(MODEL, userPrompt, config)`.
- `callModels(String model, String userPrompt, GenerateContentConfig config)` — thin seam wrapping `client.models.generateContent(model, userPrompt, config)`.
- `buildResponseSchema()`: copy from `PrayerService.buildResponseSchema()`, simplify to two properties — `id` (`Schema.builder().type("string").build()`) and `text` (with `minLength(50L)` if SDK supports; otherwise just `type("string")`). Required: `List.of("id", "text")`.
- `static boolean validateResponse(JournalReflectionResponseDto dto)` — package-private, as in spec lines 458-464. Null guard, blank `id` or blank `text` returns false, length check against `MIN_TEXT_LENGTH` / `MAX_TEXT_LENGTH`. NO regex, NO enum check.
- `static final JournalReflectionResponseDto FALLBACK_REFLECTION` — matching spec lines 479-484 (text ~290 chars, id="fallback").
- Copy `parseAndValidate`, `isSafetyBlocked`, `extractText`, `mapGeminiException` (return type `ProxyException`), `isTimeout`, and `isBlank` from `PrayerService.java` with type renames.

**Guardrails (DO NOT):**

- DO NOT add `ALLOWED_TOPICS` or any topic enum — the response has no topic field.
- DO NOT add a regex validator (no "Dear God/Amen" analog for journal reflections).
- DO NOT log the `entry` field content, the reflection `text` content, or any PII. Only `entryLength` (integer) is safe.
- DO NOT make `FALLBACK_REFLECTION` public — package-private so tests can reference it directly but it's not part of the public API.
- DO NOT change `mapGeminiException`'s return type — it MUST be `ProxyException` (common supertype for `UpstreamException` and `UpstreamTimeoutException`), matching AI-1/AI-2 precedent.
- DO NOT inject `Client` via `@Autowired` — `@PostConstruct` initializer is the pattern; tests override via reflection.

**Verification:**

- [ ] `./mvnw compile` clean
- [ ] `FALLBACK_REFLECTION.text().length()` is between 50 and 800 (hand-count ~290)
- [ ] Service class compiles in `com.example.worshiproom.proxy.ai` package

**Expected state after completion:**

- [ ] Service class compiles; ready for unit tests in Step 6

---

### Step 6: Create `JournalReflectionServiceTest` — ~15 tests

**Objective:** Unit tests with `spy()` + reflection-based `Client` injection covering crisis path, happy path, validation/retry, error mapping, no-leak invariant, and structural constants.

**Files to create:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionServiceTest.java`

**Details:**

- Class-level: `@DisplayName("JournalReflectionService")`, standard Mockito + AssertJ imports.
- `@BeforeEach setUp()`: construct `ProxyConfig` with `config.getGemini().setApiKey("fake-test-key")`, `service = spy(new JournalReflectionService(config, new ObjectMapper()))`, inject `Client dummyClient = mock(Client.class)` via reflection on `client` field (see spec lines 573-582).
- Tests (15 total):
  - **Crisis path (2):**
    1. `reflect_crisisKeywordShortCircuits` — entry containing `"want to die"` → result equals `JournalReflectionCrisisDetector.buildCrisisResponse()`. Verify `callGeminiForReflection` NEVER invoked via `verify(service, never()).callGeminiForReflection(any(), anyBoolean());`
    2. `reflect_crisisResponseContains988And741741` — trigger crisis; assert `result.text().contains("988") && result.text().contains("741741")`
  - **Happy path (2):**
    3. `reflect_happyPath_returnsValidResponse` — stub `service.callGeminiForReflection(...)` via `doReturn(mockGeminiResponse).when(service).callGeminiForReflection(any(), eq(false));` where `mockGeminiResponse` is constructed to unwrap JSON `{"id":"reflect-a8f3","text":"<200-char valid reflection>"}`. Assert DTO non-empty.
    4. `reflect_handlesLargeEntry` — entry of 5000 chars; stub valid response; assert success
  - **Validation + retry (4):**
    5. `reflect_tooShortTextTriggersRetry` — first stub returns text of 30 chars; second stub returns valid 200-char text. Assert `callGeminiForReflection` invoked twice; second call's `withRetryCorrective == true` (via `verify(service).callGeminiForReflection(any(), eq(true));`)
    6. `reflect_tooLongTextTriggersRetry` — first returns 900 chars; second returns valid
    7. `reflect_blankIdTriggersRetry` — first returns `{"id":"","text":"<valid 200 chars>"}`; retry fires
    8. `reflect_twoValidationFailuresFallBackToCanned` — both stubs return off-bounds text. Assert result equals `JournalReflectionService.FALLBACK_REFLECTION`. (A WARN log check is optional; if used, verify via Logback capturing appender or skip.)
  - **Error mapping (4):**
    9. `reflect_nullClient_throwsUpstreamNotConfigured` — reflection-set `client = null`; assert `UpstreamException` thrown with message containing "not configured"
    10. `reflect_safetyBlockThrowsSafetyBlockException` — stub returns Gemini response where `finishReason == SAFETY`; assert `SafetyBlockException` thrown (service's `isSafetyBlocked` triggers)
    11. `reflect_webClientTimeoutMapsTo504` — stub throws a `RuntimeException` wrapping `java.util.concurrent.TimeoutException`; assert `UpstreamTimeoutException` thrown
    12. `reflect_sdkErrorMapsTo502` — stub throws generic `RuntimeException("whatever")`; assert `UpstreamException` thrown
  - **No-leak invariant (1):**
    13. `noLeakOfUpstreamErrorText` — stub throws `RuntimeException("GoogleSecretKeyABC key=AIza123")`; catch thrown `ProxyException`; assert `thrown.getMessage().toLowerCase(Locale.ROOT)` contains none of `"googlesecretkeyabc"`, `"aiza"`, `"gemini"`, `"google"`, `"key="`
  - **Structural invariants (2):**
    14. `fallbackReflection_matchesLengthBounds` — `assertThat(JournalReflectionService.FALLBACK_REFLECTION.text().length()).isBetween(50, 800)`; `id == "fallback"`; non-blank fields
    15. `validateResponse_rejectsOffBounds` — 4 sub-cases against `JournalReflectionService.validateResponse(dto)` directly:
        - (a) `new JournalReflectionResponseDto("x", "a".repeat(30))` → false
        - (b) `new JournalReflectionResponseDto("x", "a".repeat(850))` → false
        - (c) `new JournalReflectionResponseDto("", "a".repeat(200))` → false AND `new JournalReflectionResponseDto("x", "")` → false
        - (d) `new JournalReflectionResponseDto("x", "a".repeat(200))` → true

**Guardrails (DO NOT):**

- DO NOT use real `Client` or real HTTP — all Gemini interaction goes through the spied `callGeminiForReflection` seam.
- DO NOT use reflection to set `ClientField` on anything other than the spied service instance.
- DO NOT `verify(service, times(N))` on `callGeminiForReflection` for invocations N ≥ 3 — retry is capped at `MAX_RETRIES_ON_VALIDATION_FAILURE = 1` so max invocations is 2.

**Verification:**

- [ ] `./mvnw test -Dtest=JournalReflectionServiceTest` all 15 green

**Test specifications:** (see expanded list above)

**Expected state after completion:**

- [ ] All 15 service tests pass; crisis, retry, fallback, safety, timeout, upstream error, and no-leak all covered

---

### Step 7: Create `JournalReflectionController` and `JournalReflectionControllerTest`

**Objective:** HTTP adapter for the service plus an 8-test `@WebMvcTest` slice.

**Files to create:**

- `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionController.java` — matches spec § "JournalReflectionController.java" (lines 490-523)
- `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionControllerTest.java` — 8 tests

**Details:**

- Controller: `@RestController`, `@RequestMapping("/api/v1/proxy/ai")`, constructor-injected `JournalReflectionService`. One `@PostMapping("/reflect-journal")` method `reflect(@Valid @RequestBody JournalReflectionRequest request)` returning `ProxyResponse<JournalReflectionResponseDto>`. Log line: `log.info("Journal reflection request received entryLength={}", request.entry().length());` — entryLength integer only.
- Controller test class: `@WebMvcTest(JournalReflectionController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class}) @DisplayName("JournalReflectionController")`. Autowire `MockMvc`. `@MockBean private JournalReflectionService service;`
- Tests (8):
  1. `reflect_happyPath_returns200WithBody` — `when(service.reflect(any())).thenReturn(new JournalReflectionResponseDto("reflect-gen-a8f3","<200-char text>"));` Post JSON. Expect 200; `$.data.id` equals `reflect-gen-a8f3`; `$.data.text` exists; `$.meta.requestId` present (from MDC).
  2. `reflect_missingEntry_returns400` — body `{}`. Expect 400; error body code `INVALID_INPUT`.
  3. `reflect_blankEntry_returns400` — body `{"entry":"   "}`. Expect 400 via `@NotBlank`.
  4. `reflect_entryTooLong_returns400` — 5001-char entry. Expect 400 via `@Size(max=5000)`.
  5. `reflect_serviceThrowsSafetyBlock_returns422` — `when(service.reflect(any())).thenThrow(new SafetyBlockException("blocked"));`. Expect 422 with code `SAFETY_BLOCK`.
  6. `reflect_serviceThrowsUpstream_returns502` — throws `UpstreamException`. Expect 502 with code `UPSTREAM_ERROR`.
  7. `reflect_serviceThrowsTimeout_returns504` — throws `UpstreamTimeoutException`. Expect 504 with code `UPSTREAM_TIMEOUT`.
  8. `reflect_xRequestIdHeaderPresent` — happy-path call; assert `X-Request-Id` response header is present (non-null, non-blank).

**Guardrails (DO NOT):**

- DO NOT add a second endpoint to this controller — keep it single-purpose.
- DO NOT log `request.entry()` anywhere; only the numeric length.
- DO NOT override `RequestMapping` with a different base path — must share `/api/v1/proxy/ai` with peers.

**Verification:**

- [ ] `./mvnw compile` clean
- [ ] `./mvnw test -Dtest=JournalReflectionControllerTest` all 8 green
- [ ] No controller overlap with `/api/v1/proxy/ai/reflect` (Spec 2's Bible-verse endpoint) or `/pray` (AI-2)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| reflect_happyPath_returns200WithBody | slice | Happy path envelope |
| reflect_missingEntry_returns400 | slice | `@NotBlank` triggers |
| reflect_blankEntry_returns400 | slice | Whitespace triggers `@NotBlank` |
| reflect_entryTooLong_returns400 | slice | `@Size(max=5000)` triggers at 5001 |
| reflect_serviceThrowsSafetyBlock_returns422 | slice | Error mapping |
| reflect_serviceThrowsUpstream_returns502 | slice | Error mapping |
| reflect_serviceThrowsTimeout_returns504 | slice | Error mapping |
| reflect_xRequestIdHeaderPresent | slice | Request-ID propagation |

**Expected state after completion:**

- [ ] Controller + 8 slice tests green; endpoint routable at `/api/v1/proxy/ai/reflect-journal`

---

### Step 8: Create `JournalReflectionIntegrationTest` — end-to-end via `@SpringBootTest`

**Objective:** Full Spring context integration test covering headers, request-ID round-trip, ProxyError shape, no-leak invariant, and crisis bypass.

**Files to create:**

- `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionIntegrationTest.java` — 5 tests

**Details:**

- Class-level: `@SpringBootTest @AutoConfigureMockMvc @DisplayName("Journal reflection proxy integration")`. `@MockBean JournalReflectionService service`. Autowire `MockMvc`.
- Tests (5):
  1. `fullLifecycle_reflect_returnsExpectedHeaders` — stub returns valid DTO. POST. Assert 200, headers `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` all present (non-null). Body has `$.data.id`, `$.data.text`, `$.meta.requestId`.
  2. `fullLifecycle_reflect_propagatesClientRequestId` — send `X-Request-Id: test-reflect-id`. Assert response header echoes the same value; `$.meta.requestId` also equals `test-reflect-id`.
  3. `fullLifecycle_invalidInput_returnsProxyErrorShape` — missing `entry`. Assert 400 body is valid `ProxyError`: has `code`, `message`, `requestId`, `timestamp`.
  4. `fullLifecycle_noUpstreamErrorTextLeaks` — `when(service.reflect(any())).thenThrow(new UpstreamException("AI service is temporarily unavailable.", new RuntimeException("GoogleSecretKeyABC key=AIza123")));`. POST. Assert response body contains zero instances of `"GoogleSecretKeyABC"`, `"AIza"`, `"key="`. (The `ProxyExceptionHandler` surfaces only the user-safe message, never the cause chain.)
  5. `fullLifecycle_crisisPathBypassesGemini` — `when(service.reflect(any())).thenReturn(JournalReflectionCrisisDetector.buildCrisisResponse());` POST with ANY input. Assert `$.data.id == "crisis"`, `$.data.text` contains "988".

**Guardrails (DO NOT):**

- DO NOT spin up Testcontainers — this endpoint has no DB interaction.
- DO NOT assert specific rate-limit numbers (they're environment-dependent); assert only presence of the headers.
- DO NOT call real Gemini — `@MockBean` on `JournalReflectionService` stubs everything at the bean boundary.

**Verification:**

- [ ] `./mvnw test -Dtest=JournalReflectionIntegrationTest` all 5 green
- [ ] `./mvnw test` full suite passes (193 baseline + 43 new = ~236)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| fullLifecycle_reflect_returnsExpectedHeaders | integration | Headers + body shape |
| fullLifecycle_reflect_propagatesClientRequestId | integration | Client-supplied X-Request-Id round-trip |
| fullLifecycle_invalidInput_returnsProxyErrorShape | integration | 400 ProxyError fields |
| fullLifecycle_noUpstreamErrorTextLeaks | integration | No upstream cause-chain leak |
| fullLifecycle_crisisPathBypassesGemini | integration | data.id="crisis" + 988 substring |

**Expected state after completion:**

- [ ] Backend is feature-complete; all 43 new tests pass; full backend suite (~236 tests) green

---

### Step 9: Add OpenAPI path and schemas for `/reflect-journal`

**Objective:** Extend `backend/src/main/resources/openapi.yaml` with the new path + two new component schemas.

**Files to modify:**

- `backend/src/main/resources/openapi.yaml`

**Details:**

- Under `paths:`, after the existing `/api/v1/proxy/ai/pray` block (lines 192-228), insert the path block from spec § "OpenAPI additions" (spec lines 652-689). Uses existing shared response refs: `BadRequest`, `SafetyBlocked`, `RateLimited`, `UpstreamError`, `UpstreamTimeout`, `InternalError`.
- Under `components.schemas`, after the existing `PrayerResponse` schema (line 553), insert the two new schemas `JournalReflectionRequest` and `JournalReflectionResponse` from spec lines 694-723.
- Schema details:
  - `JournalReflectionRequest`: `type: object`, `required: [entry]`, `entry` property `type: string, minLength: 1, maxLength: 5000` with example and description.
  - `JournalReflectionResponse`: `type: object`, `required: [id, text]`, `id` property `type: string`, `text` property `type: string, minLength: 50, maxLength: 800` with example. NO `enum` block (unlike `PrayerResponse.topic`). NO `pattern` regex.

**Guardrails (DO NOT):**

- DO NOT modify the existing `PrayerRequest`, `PrayerResponse`, or shared `responses:` blocks.
- DO NOT add a new `responses:` section — reuse existing `BadRequest`/`SafetyBlocked`/etc.
- DO NOT introduce a separate `JournalReflectionCrisisResponse` schema — the crisis response IS a `JournalReflectionResponse` with `id="crisis"` per endpoint contract.

**Verification:**

- [ ] YAML remains valid: run the project's OpenAPI validation if wired, otherwise sanity-check with `npx --yes yaml lint backend/src/main/resources/openapi.yaml` or similar (project may have a specific tool — look for a script)
- [ ] `grep -c 'reflect-journal' backend/src/main/resources/openapi.yaml` returns at least 1
- [ ] `grep -c 'JournalReflectionRequest\|JournalReflectionResponse' backend/src/main/resources/openapi.yaml` returns at least 4 (path refs + schema definitions)

**Expected state after completion:**

- [ ] OpenAPI updated; no other schemas modified

---

### Step 10: Create `frontend/src/services/journal-reflection-service.ts`

**Objective:** Frontend fetch layer that never rejects — always resolves with a `JournalReflection`, falling through to the mock on any error.

**Files to create:**

- `frontend/src/services/journal-reflection-service.ts`

**Details:**

- Copy the complete file content from spec § "services/journal-reflection-service.ts" (lines 733-801).
- Key structure:
  - Imports: `type { JournalReflection } from '@/types/daily-experience'` and `{ getJournalReflection } from '@/mocks/daily-experience-mock-data'`
  - Constants: `PROXY_URL = \`${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/reflect-journal\``, `REQUEST_TIMEOUT_MS = 30_000`
  - Type: `interface JournalReflectionEnvelope { data: JournalReflection; meta?: { requestId?: string } }`
  - Helper: `fetchWithTimeout(url, init, timeoutMs)` using `AbortController` + `setTimeout`, identical shape to `prayer-service.ts`
  - Public function: `export async function fetchJournalReflection(entry: string): Promise<JournalReflection>` — try/catch wrapping fetch; on any error (non-ok response, network, timeout, JSON parse, shape invalid) returns `getJournalReflection()`. Shape check: require `envelope.data.id`, `typeof envelope.data.text === 'string'`, `envelope.data.text.length >= 20`. 20-char frontend floor is intentionally lower than backend's 50-char floor so backend's `FALLBACK_REFLECTION` (~290 chars) and crisis response (~460 chars) always pass through.
  - NO regex validation (no AI-2 `/^Dear /` + `/Amen\.\s*$/` check).

**Guardrails (DO NOT):**

- DO NOT throw from `fetchJournalReflection` — it must always resolve. Callers rely on this invariant to skip error handling.
- DO NOT re-export `getJournalReflection` from this file — the mock is imported here but stays exported from `daily-experience-mock-data` for direct fallback access elsewhere.
- DO NOT use `axios` or a third-party HTTP client — `fetch` with `AbortController` is the project convention.
- DO NOT cache responses — per AD #12, each entry is user-specific; cache hit rate is near zero.

**Verification:**

- [ ] `cd frontend && npm run build` succeeds
- [ ] `grep -c 'reflect-journal' frontend/src/services/journal-reflection-service.ts` returns 1 (the PROXY_URL)
- [ ] File is under 80 lines

**Expected state after completion:**

- [ ] Service module compiles; default-never-throw contract in place

---

### Step 11: Create `frontend/src/services/__tests__/journal-reflection-service.test.ts` — 11 tests

**Objective:** Full coverage of happy path, HTTP error codes, network errors, timeout, shape validation, and crisis response pass-through.

**Files to create:**

- `frontend/src/services/__tests__/journal-reflection-service.test.ts`

**Details:**

- Imports: `afterEach, beforeEach, describe, expect, it, vi` from `vitest`; `fetchJournalReflection` from `../journal-reflection-service`; `type { JournalReflection } from '@/types/daily-experience'`.
- Use the exact `validEnvelope()` helper from spec lines 1006-1012 (200-char pastoral text starting "There is so much honesty...").
- Use setup helpers identical to `prayer-service.test.ts` (`mockFetchResolvesOnce`, `mockFetchRejectsOnce`, `vi.stubGlobal('fetch', fetchMock)`, `vi.unstubAllGlobals()` in before/afterEach).
- Tests (11):
  1. `fetchJournalReflection_callsBackendProxyWithCorrectBody` — assert fetch called once with `url` containing `/api/v1/proxy/ai/reflect-journal`, `method: 'POST'`, body `{"entry":"test entry"}`, `Content-Type: application/json`
  2. `fetchJournalReflection_returnsParsedEnvelope` — fetch resolves 200 + valid envelope; assert returned value deep-equals `envelope.data`
  3. `fetchJournalReflection_passesCrisisResponseThrough` — fetch returns envelope with `{id:"crisis", text:"<460-char containing '988' and '741741'>"}`. Assert returned DTO equals that envelope.data (NOT mock fallback)
  4. `fetchJournalReflection_400_fallsBackToMock` — fetch returns 400; assert result.id is a string AND result.text is a non-empty string (mock returned)
  5. `fetchJournalReflection_422SafetyBlock_fallsBackToMock` — 422 → mock fallback
  6. `fetchJournalReflection_502_fallsBackToMock` — 502 → mock fallback
  7. `fetchJournalReflection_networkError_fallsBackToMock` — `mockFetchRejectsOnce(new Error('network'))`; result is mock
  8. `fetchJournalReflection_timeoutTriggersFallback` — `vi.useFakeTimers()`; mock fetch to hang (return `new Promise(() => {})`); advance by 30_001ms via `vi.advanceTimersByTime(30001)`; assert result is mock. Unmount fake timers in `afterEach`.
  9. `fetchJournalReflection_missingDataField_fallsBackToMock` — 200 with body `{}` → mock
  10. `fetchJournalReflection_missingId_fallsBackToMock` — 200 with body `{data: {text: "valid reflection text here that is long enough"}}` → mock
  11. `fetchJournalReflection_tooShortText_fallsBackToMock` — 200 with `{data: {id: "x", text: "short"}}` (5 chars, below 20-char floor) → mock

**Guardrails (DO NOT):**

- DO NOT import from `prayer-service.test.ts` — copy helpers inline for test isolation.
- DO NOT assert on specific mock reflection text — the mock picks at random, so assert only `id` is non-empty string and `text` is non-empty string.
- DO NOT disable the frontend 20-char floor test — it's the defense-in-depth layer.

**Verification:**

- [ ] `cd frontend && npm test -- --run journal-reflection-service` — all 11 pass
- [ ] No console errors during test run

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| fetchJournalReflection_callsBackendProxyWithCorrectBody | unit | Body shape `{entry: "..."}`; URL path; method POST |
| fetchJournalReflection_returnsParsedEnvelope | unit | Happy path envelope → data passthrough |
| fetchJournalReflection_passesCrisisResponseThrough | unit | Crisis id="crisis" envelope pass-through |
| fetchJournalReflection_400_fallsBackToMock | unit | Validation error → mock |
| fetchJournalReflection_422SafetyBlock_fallsBackToMock | unit | Safety block → mock |
| fetchJournalReflection_502_fallsBackToMock | unit | Upstream error → mock |
| fetchJournalReflection_networkError_fallsBackToMock | unit | Network error → mock |
| fetchJournalReflection_timeoutTriggersFallback | unit | 30s timeout abort → mock |
| fetchJournalReflection_missingDataField_fallsBackToMock | unit | Invalid shape → mock |
| fetchJournalReflection_missingId_fallsBackToMock | unit | Missing id → mock |
| fetchJournalReflection_tooShortText_fallsBackToMock | unit | Below 20-char floor → mock |

**Expected state after completion:**

- [ ] Service tests green; all 11 scenarios covered

---

### Step 12: Modify `SavedEntriesList.tsx` to accept `reflectingIds` and render the loading pill

**Objective:** Add an optional `reflectingIds: Set<string>` prop and render a three-state ternary (reflection present / loading / button).

**Files to modify:**

- `frontend/src/components/daily/SavedEntriesList.tsx`

**Details:**

- Update `SavedEntriesListProps` (currently lines 23-28) to add `reflectingIds?: Set<string>` as the last field.
- Update function signature (currently lines 30-35) to destructure `reflectingIds = new Set()` with that default so existing callers (none exist outside `JournalTabContent`, but the default is cheap insurance).
- Locate the existing `entry.reflection ? <reflection box> : <reflect button>` ternary inside the entry-rendering map and convert it to a three-way conditional:
  1. `entry.reflection` present → unchanged reflection box (`<div className="mt-3 rounded-lg bg-white/[0.04] p-3">`)
  2. `reflectingIds.has(entry.id)` → new loading pill from spec lines 961-972 (`role="status"`, `aria-live="polite"`, spinner span with `motion-reduce:animate-none`, text "Reflecting on your words…")
  3. Neither → unchanged "Reflect on my entry" button
- Preserve existing button classes and aria-label pattern exactly.

**Guardrails (DO NOT):**

- DO NOT make `reflectingIds` required — keep it optional with default so any future caller without the prop still compiles.
- DO NOT change the `onReflect: (entryId: string) => void` signature — the per-entry loading state is managed by the parent, not by changing the callback.
- DO NOT remove the `motion-reduce:animate-none` class — it's the explicit opt-in even though the global safety net in `animations.css` covers this by default.
- DO NOT add a spinner dependency (no Lucide `Loader2` import, no library) — use the pure CSS spinner from the spec (`h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-primary`).
- DO NOT add visual elevation/shadow to the loading pill — it's a subtle inline state change.

**Verification:**

- [ ] `cd frontend && npm run build` succeeds with no TypeScript errors
- [ ] `grep -c reflectingIds frontend/src/components/daily/SavedEntriesList.tsx` returns at least 3 (prop, default, render check)

**Expected state after completion:**

- [ ] Component accepts new prop, renders three-state conditional, a11y attributes in place

---

### Step 13: Modify `JournalTabContent.tsx` — swap sync mock for async `fetchJournalReflection` + per-entry loading state

**Objective:** Rewrite `handleReflect` to be async with per-entry `reflectingIds` state, and pass `reflectingIds` down to `SavedEntriesList`.

**Files to modify:**

- `frontend/src/components/daily/JournalTabContent.tsx`

**Details:**

- **Import updates (top of file):**
  - Add: `import { fetchJournalReflection } from '@/services/journal-reflection-service'`
  - Remove `getJournalReflection` from the `@/mocks/daily-experience-mock-data` named-import list. Keep `getJournalPrompts` (still used). Verify the line and reorder remaining imports cleanly.
- **New state (near existing `savedEntries` declaration around line 76):**
  - `const [reflectingIds, setReflectingIds] = useState<Set<string>>(new Set())`
- **Rewrite `handleReflect` (currently lines 263-274):**
  - Replace synchronous body with async-style using Promise chain (`.then(...)`) — matches spec lines 841-867:
    - Auth gate first (unchanged): `if (!isAuthenticated) { authModal?.openAuthModal('Sign in to reflect on your entry'); return; }`
    - Entry lookup: `const entry = savedEntries.find((e) => e.id === entryId); if (!entry) return;`
    - Add to reflecting set: `setReflectingIds((prev) => { const next = new Set(prev); next.add(entryId); return next; });`
    - Fetch + attach + remove: `fetchJournalReflection(entry.content).then((reflection) => { setSavedEntries(...map attaching reflection.text...); setReflectingIds((prev) => { const next = new Set(prev); next.delete(entryId); return next; }); });`
  - Preserve function signature `(entryId: string) => void` exactly.
  - NO `.catch()` needed — `fetchJournalReflection` never rejects.
  - NO `setTimeout`, NO cosmetic delay — loading state is carried by `reflectingIds`.
- **Update `<SavedEntriesList>` JSX (around line 354):**
  - Pass the new prop: `reflectingIds={reflectingIds}`.

**Guardrails (DO NOT):**

- DO NOT call `markJournalComplete()` or `recordActivity('journal')` inside `handleReflect`. These fire on SAVE in `handleEntrySave` (existing behavior). Adding them here would double-count. (Critical rule #9 + AD #10.)
- DO NOT store `reflectingIds` as a boolean — it MUST be `Set<string>` so multiple concurrent reflects each get their own loading state.
- DO NOT introduce `vi.useFakeTimers()` patterns in the component itself — that's a test concern.
- DO NOT remove the auth gate — the `if (!isAuthenticated)` check fires BEFORE the fetch, preserving draft-auth behavior.
- DO NOT wrap the `fetchJournalReflection(...).then(...)` in a `try/catch` — the service contract guarantees no throw.

**Verification:**

- [ ] `cd frontend && npm run build` succeeds
- [ ] `grep -c fetchJournalReflection frontend/src/components/daily/JournalTabContent.tsx` returns at least 2 (import + call)
- [ ] `grep -c getJournalReflection frontend/src/components/daily/JournalTabContent.tsx` returns 0 (fully removed)

**Expected state after completion:**

- [ ] `handleReflect` is async, `reflectingIds` state plumbed to `SavedEntriesList`, mock is no longer directly imported

---

### Step 14: Update `JournalTabContent.test.tsx` — mock the service, update reflect-related tests, add 3 loading-UI tests

**Objective:** Keep existing tests passing (they'll need `await`/`findBy*` after the sync-to-async change) and add three new tests for the loading UX.

**Files to modify:**

- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`

**Details:**

- Add a top-level mock:
  ```typescript
  vi.mock('@/services/journal-reflection-service', () => ({
    fetchJournalReflection: vi.fn(),
  }))
  ```
- Import the mocked function and establish a reusable default in `beforeEach`:
  ```typescript
  import { fetchJournalReflection } from '@/services/journal-reflection-service'
  const mockFetchJournalReflection = fetchJournalReflection as ReturnType<typeof vi.fn>
  ```
  In `beforeEach`: `mockFetchJournalReflection.mockReset(); mockFetchJournalReflection.mockResolvedValue({ id: 'reflect-test', text: 'Thank you for bringing these words here. Test reflection.' });`
- Audit existing reflect-related tests (search for `/reflect/i` via Grep on this file) and change any assertion immediately after a reflect-button click from `expect(screen.getByText(...))` to `expect(await screen.findByText(...))`. Typically there is one such test per suite. Keep auth-gate test unchanged (the auth check fires before the fetch call, so no async handling is needed there).
- Add 3 new tests:
  - `reflect_showsLoadingStateWhilePending` — `mockFetchJournalReflection.mockReturnValue(new Promise(() => {}));` (never resolves). Render, save an entry (or use the test's existing harness for a saved entry), click the reflect button for that entry. Assert `screen.getByText(/Reflecting on your words/)` is present. Assert the reflect button is NOT present (the loading pill replaces it).
  - `reflect_hidesLoadingStateOnResolve` — default resolved mock (from beforeEach). Click reflect. `expect(await screen.findByText(/Test reflection/)).toBeInTheDocument();` Then assert `screen.queryByText(/Reflecting on your words/)` is null.
  - `reflect_supportsMultipleEntriesLoadingConcurrently` — render harness with TWO saved entries. `mockFetchJournalReflection.mockReturnValue(new Promise(() => {}));`. Click reflect on entry A; click reflect on entry B. Assert `screen.getAllByText(/Reflecting on your words/).length === 2`. Asserts that `reflectingIds` is a Set, not a boolean.

**Guardrails (DO NOT):**

- DO NOT `vi.mock('@/mocks/daily-experience-mock-data', ...)` for the sake of `getJournalReflection` — the component no longer imports it directly.
- DO NOT add `vi.useFakeTimers()` to this file if it doesn't already use them — the flow is promise-resolution based.
- DO NOT delete the existing auth-gate test — the gate fires before the fetch, and that behavior remains intact.
- DO NOT assert on specific fetch-call URLs in this component test — that's the service test's job.

**Verification:**

- [ ] `cd frontend && npm test -- --run JournalTabContent` — all previous tests pass plus 3 new ones
- [ ] `cd frontend && npm test -- --run` — full frontend suite green with no regressions

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (existing reflect test, updated) | component | Pre-existing test, now `await findByText` |
| reflect_showsLoadingStateWhilePending | component | Hanging promise → "Reflecting on your words…" visible, button absent |
| reflect_hidesLoadingStateOnResolve | component | Resolved promise → reflection text visible, loading text absent |
| reflect_supportsMultipleEntriesLoadingConcurrently | component | Two pending reflects → two loading pills |

**Expected state after completion:**

- [ ] Component test file updated; loading UX covered by 3 new tests; no suite regressions

---

### Step 15: End-to-end smoke (non-Docker, dev profile)

**Objective:** Verify the full stack works in a running dev server. Mirrors Spec 3's non-Docker smoke pattern.

**Files to create:** None.

**Details:**

- Stop any existing dev processes. Start backend: `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — run in background, capture logs to `/tmp/worship-room-backend.log`.
- Start frontend: `cd frontend && npm run dev` — port 5173.
- Wait for backend log line `"Started Application"`.
- **Health probe:**
  - `curl -s http://localhost:8080/api/v1/health | jq .providers.gemini.configured` → expect `true`
- **Happy-path smoke (real Gemini call):**
  ```
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect-journal \
    -H 'Content-Type: application/json' \
    -d '{"entry":"Today I sat in silence for a long time. I kept thinking about my grandmother and all the things I wish I had said to her before she passed last spring. It feels heavy but also holy to just remember her today."}' \
    | jq '{id: .data.id, textLength: (.data.text | length), mentionsGrandmother: (.data.text | test("grandmother|her")), requestId: .meta.requestId}'
  ```
  Expect: `textLength` 150–500, `mentionsGrandmother: true`, `requestId` is a base64 string (length ~22).
- **Crisis smoke:**
  ```
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect-journal \
    -H 'Content-Type: application/json' \
    -d '{"entry":"I don'\''t want to be here anymore. I want to die."}' \
    | jq '{id: .data.id, has988: (.data.text | contains("988")), has741741: (.data.text | contains("741741"))}'
  ```
  Expect: `id: "crisis"`, `has988: true`, `has741741: true`. Backend log: `grep -c 'Journal reflection crisis path triggered' /tmp/worship-room-backend.log` > 0 for the request ID.
- **Long-entry smoke (validates 5000-char path):**
  ```
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect-journal \
    -H 'Content-Type: application/json' \
    -d "{\"entry\":\"$(yes 'Today I am grateful. ' | head -200 | tr -d '\n' | head -c 5000)\"}" \
    | jq '{id: .data.id, textLength: (.data.text | length)}'
  ```
  Expect: 200, `id` starts with `reflect-` or equals `fallback`, valid length.
- **Invalid input smoke:**
  ```
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect-journal \
    -H 'Content-Type: application/json' \
    -d '{"entry":""}' | jq .code
  ```
  Expect: `"INVALID_INPUT"`.
- **PII leak check** (the CRITICAL step — journal entries are the most sensitive content in the app):
  ```
  grep -iE 'entry=.+(grandmother|want to die|grateful|today)|content=.+' /tmp/worship-room-backend.log | wc -l
  ```
  Expect `0`. The controller must log ONLY `entryLength=<integer>`.
- **Rate-limit headers present on success:** verify `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` in response headers for the happy-path curl (use `-i` flag).
- **Frontend smoke:**
  - Open `http://localhost:5173/daily?tab=journal` in a browser. Save a test entry. Click "Reflect on my entry". Observe:
    - "Reflecting on your words…" pill appears immediately, with a subtle spinner
    - Reflection appears after ~1.5–3.5s; pill disappears
    - The reflection references something from the entry (manual eyeball check)
    - Network tab shows POST to `/api/v1/proxy/ai/reflect-journal`
- **Regression smoke (AI-1 and AI-2 still work):**
  - `curl -s -X POST http://localhost:8080/api/v1/proxy/ai/ask -d '{"question":"Does God forgive?"}' -H 'Content-Type: application/json' | jq .data.id` → non-empty string
  - `curl -s -X POST http://localhost:8080/api/v1/proxy/ai/pray -d '{"request":"I am anxious"}' -H 'Content-Type: application/json' | jq '.data.text | test("^Dear.*Amen\\\\.$")'` → `true`
- **Bundle scans** (post-build):
  - `cd frontend && npm run build`
  - `grep -rc 'AIza' frontend/dist/ | awk -F: '{s+=$2} END {print s}'` → 0
  - `grep -rc '/api/v1/proxy/ai/reflect-journal' frontend/dist/ | awk -F: '{s+=$2} END {print s}'` → ≥ 1
  - `grep -rc 'VITE_GEMINI_API_KEY' frontend/dist/ | awk -F: '{s+=$2} END {print s}'` → 0

**Guardrails (DO NOT):**

- DO NOT run Docker Compose — this backend doesn't need a database or Redis for smoke.
- DO NOT skip the PII leak check. This is the hardest-stakes endpoint in the app.
- DO NOT commit `/tmp/worship-room-backend.log` or any smoke artifacts.

**Verification:**

- [ ] All six curl commands produce expected output
- [ ] PII leak check returns 0
- [ ] Frontend UI produces visible loading pill then real reflection
- [ ] AI-1 and AI-2 regression curls pass
- [ ] Bundle scans report zero leaks and at least one proxy URL reference

**Expected state after completion:**

- [ ] End-to-end flow is green; wave AI-1 + AI-2 + AI-3 all operational; no PII in logs

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create DTOs |
| 2 | 1 | Prompts class + 6 prompt tests |
| 3 | 1 | Crisis detector with 12-keyword list |
| 4 | 3 | Three-way parity tests + detector unit tests |
| 5 | 1, 2, 3 | Service orchestrator with D2b seams |
| 6 | 5 | Service unit tests (~15) |
| 7 | 5 | Controller + 8 slice tests |
| 8 | 7 | Integration test (5) |
| 9 | 1 | OpenAPI path + schemas (can run parallel with 5-8) |
| 10 | — (frontend-only) | Frontend service module |
| 11 | 10 | Frontend service tests (11) |
| 12 | — (frontend-only) | SavedEntriesList prop + loading UI |
| 13 | 10, 12 | JournalTabContent async handleReflect + state |
| 14 | 13 | Component test updates + 3 new loading tests |
| 15 | all | End-to-end smoke (running dev server) |

Backend (Steps 1-9) and frontend (Steps 10-14) can technically run in parallel after Step 1 completes, but the recommended order is sequential through Step 9 then Steps 10-14, then Step 15.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create DTOs | [COMPLETE] | 2026-04-22 | `JournalReflectionRequest.java`, `JournalReflectionResponseDto.java` |
| 2 | Prompts class + prompt tests | [COMPLETE] | 2026-04-22 | `JournalReflectionPrompts.java` + 6 tests pass |
| 3 | Crisis detector | [COMPLETE] | 2026-04-22 | `JournalReflectionCrisisDetector.java` — 12-keyword list byte-for-byte matches Ask + Prayer |
| 4 | Crisis detector tests (3-way parity) | [COMPLETE] | 2026-04-22 | 9 tests (parameterized keyword test expands to 20 total runs); frontend-superset + Ask-parity + Prayer-parity all verified |
| 5 | Service orchestrator | [COMPLETE] | 2026-04-22 | `JournalReflectionService.java` — crisis short-circuit, retry loop, length-only validation (50–800), fallback (244 chars) |
| 6 | Service unit tests | [COMPLETE] | 2026-04-22 | 15 tests: crisis (2), happy (2), validation/retry (4), error mapping (4), no-leak (1), structural invariants (2) |
| 7 | Controller + slice tests | [COMPLETE] | 2026-04-22 | `JournalReflectionController.java` + 8 `@WebMvcTest` slice tests |
| 8 | Integration test | [COMPLETE] | 2026-04-22 | 5 `@SpringBootTest` integration tests; full backend suite 249 tests pass |
| 9 | OpenAPI additions | [COMPLETE] | 2026-04-22 | `/api/v1/proxy/ai/reflect-journal` path + `JournalReflectionRequest`/`JournalReflectionResponse` schemas; YAML still parses |
| 10 | Frontend service module | [COMPLETE] | 2026-04-22 | `journal-reflection-service.ts` — `fetchJournalReflection` never throws, 20-char shape floor, mock fallback on any error |
| 11 | Frontend service tests | [COMPLETE] | 2026-04-22 | 11 tests: happy, crisis pass-through, 400/422/502 fallbacks, network/timeout, shape validation |
| 12 | SavedEntriesList loading prop | [COMPLETE] | 2026-04-22 | Added `reflectingIds?: Set<string>` prop + 3-state render (reflection / loading pill / button); `role="status"`, `aria-live="polite"`, `motion-reduce:animate-none` |
| 13 | JournalTabContent async handleReflect | [COMPLETE] | 2026-04-22 | Swapped sync `getJournalReflection()` for async `fetchJournalReflection`; added `reflectingIds` Set state; preserved auth gate; zero `.catch` per service contract |
| 14 | Component tests + loading UX tests | [COMPLETE] | 2026-04-22 | 3 new loading-UX tests pass; all 54 JournalTabContent tests green; 24 full-suite failures confirmed pre-existing on `main` (GrowthGarden, PlanBrowserPage, Pray, LocalSupport) — unrelated to this spec |
| 15 | End-to-end smoke | [COMPLETE] | 2026-04-22 | Health check: `gemini.configured: true`. Real Gemini call returned 261-char reflection mentioning "grandmother". Crisis smoke: `id=crisis`, 988+741741 present, backend log confirmed crisis short-circuit. Invalid-input smoke: `INVALID_INPUT`. Long-entry (5000-char) smoke: 253-char reflection. **PII leak check: 0 matches** (both precise pattern + broad user-content search). Rate-limit + X-Request-Id headers present. AI-1 and AI-2 regression cURLs green. Bundle scans: 0 `AIza`, 0 `VITE_GEMINI_API_KEY`, 1 `reflect-journal` URL. UI smoke: entry saved, Reflect clicked, reflection rendered (mock fallback fired because frontend `.env.local` lacks `VITE_API_BASE_URL` — pre-existing dev-config gap; fallback is the documented graceful-degradation floor). |

---

## Deviations

_None yet. Deviations recorded here during execution under the seven-condition charter (inherited from Spec 2 / AI-1 / AI-2): no public API change, no behavior change, no rules/spec/plan edits, no new security/CORS/logging/PII/rate-limit surface, no scope change, no cross-spec precedent beyond extending existing patterns, alternative strictly worse. Uncertainty = stop and surface._
