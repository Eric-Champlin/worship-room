# Plan: AI Proxy FCBH — DBP v4 metadata migration (Key Protection Wave Spec 4, closing spec)

**Spec:** `_specs/ai-proxy-fcbh.md`
**Date:** 2026-04-22
**Branch:** `claude/feature/ai-proxy-fcbh` (already cut, already checked out)
**Wave:** Key Protection (Specs 1–3 merged; this spec closes the wave)
**Size:** L (~17 files, ~780 lines net)
**Risk:** Medium — hot-path network rewrite. Audio playback must keep working end-to-end. Test-mock cleanup touches 8+ BibleReader test files.

---

## Affected Frontend Routes

- `/bible/:book/:chapter` — BibleReader with the AudioPlayButton (the only consumer of `dbp-client.ts`).

---

## Universal Rules Checklist

N/A — standalone spec, not a Forums Wave master-plan spec. Applicable conventions come from `.claude/rules/02-security.md`, `.claude/rules/03-backend-standards.md`, `.claude/rules/06-testing.md`, `.claude/rules/07-logging-monitoring.md`, and `.claude/rules/08-deployment.md`. The seven-condition charter inherited from Specs 2/3/AI-1/AI-2/AI-3 (no public API change, no behavior change, no rules/spec/plan edits, no new security/CORS/logging/PII/rate-limit surface, no scope change, no cross-spec precedent beyond extending existing patterns, alternative strictly worse) governs deviations — uncertainty = stop and surface.

Key rules-grounded invariants this spec MUST respect:

- [ ] Bounded caches per `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES" (FCBH caches are keyed on `filesetId`/`bookCode`/`chapter` from path params — validated by `@Pattern` before caching, but MUST still be size-bounded).
- [ ] Never leak upstream error text per `02-security.md` § "Never Leak Upstream Error Text" — every `WebClientResponseException` is mapped to a user-safe `UpstreamException`/`UpstreamTimeoutException`/`FcbhNotFoundException` message. Service-test `noLeakOfApiKeyInExceptionMessages` and integration-test `fullLifecycle_noApiKeyLeakInErrorBody` enforce this.
- [ ] PII logging discipline per `07-logging-monitoring.md` — controllers log `filesetId`/`bookCode`/`chapter`/`language` only. Service logs cache-hit/miss + IDs. NEVER the signed CloudFront `path`, NEVER the API key, NEVER `Signature=` query strings.
- [ ] XFF handling and per-IP rate limits continue to flow through the existing `RateLimitFilter` (scoped to `/api/v1/proxy/**`) — no new filter or config needed; new endpoints inherit the behavior.
- [ ] Request-ID propagation via `RequestIdFilter` + MDC is automatic; every new endpoint must surface `MDC.get("requestId")` in its `ProxyResponse.of(...)` call and in `ProxyError` bodies.
- [ ] `@RestControllerAdvice(basePackages="com.example.worshiproom.proxy")` on `ProxyExceptionHandler` already covers subpackages — `proxy.bible` is automatically in scope when added.
- [ ] Backend Java package convention: `com.example.worshiproom.proxy.bible` (matches the spec's explicit naming and the `proxy.maps`/`proxy.ai` precedent of naming by domain, not by vendor).

---

## Architecture Context

**Branch + baseline** (verified during recon):

- Current branch: `claude/feature/ai-proxy-fcbh` (confirmed via `git branch --show-current`).
- Git working tree: only new untracked file is `_specs/ai-proxy-fcbh.md`.
- Backend base package: `com.example.worshiproom` (Spec 1 decision, do NOT rename).
- `backend/src/main/resources/db/changelog/` does NOT exist — this spec makes NO database changes and creates NO Liquibase changesets.

**Existing proxy scaffolding (reused, no edits):**

- `config/ProxyConfig.java` — already exposes `FcbhProperties` with `apiKey` + `isConfigured()` (wired in Spec 1). `proxy.fcbh.api-key` is already bound from `application-{profile}.properties` + `backend/.env.local`.
- `proxy/common/ProxyResponse.java` — record `(T data, Map<String,Object> meta)` + factories `of(data, requestId)` and `of(data, requestId, extraMeta)`.
- `proxy/common/ProxyError.java` — record `(code, message, requestId, timestamp)` + factory `of(code, message, requestId)` (timestamp = `Instant.now()`).
- `proxy/common/ProxyException.java` — base (`HttpStatus status, String code, String message`, optional `cause`).
- `proxy/common/UpstreamException.java` — 502 `UPSTREAM_ERROR`. Extend for generic backend→DBP failures.
- `proxy/common/UpstreamTimeoutException.java` — 504 `UPSTREAM_TIMEOUT`. Extend for DBP timeouts.
- `proxy/common/ProxyExceptionHandler.java` — `@RestControllerAdvice(basePackages="com.example.worshiproom.proxy")`. Current branches (in order): `ProxyException` → status/code/message, `MethodArgumentNotValidException` → 400 `INVALID_INPUT`, `ConstraintViolationException` → 400 `INVALID_INPUT`, `HandlerMethodValidationException` → 400 `INVALID_INPUT`, `MissingServletRequestParameterException` → 400 `INVALID_INPUT`, `Throwable` → 500 `INTERNAL_ERROR`. We will add a new branch BEFORE the generic `ProxyException` handler so that `FcbhNotFoundException` → 404 (instead of being swallowed into the 502-ish ProxyException path).
- `proxy/common/RateLimitFilter.java` — scoped to `/api/v1/proxy/**` via `shouldNotFilter`. All new `/api/v1/proxy/bible/*` endpoints are automatically rate-limited with existing per-IP buckets.
- `proxy/common/RequestIdFilter.java` — `@Order(HIGHEST_PRECEDENCE)`. Populates MDC `requestId` for every request, honors client-supplied `X-Request-Id` (≤64 chars).
- `controller/ApiController.java` — `/api/v1/health` already reports `providers.fcbh.configured` (Spec 1 wiring).

**Service template** (`proxy/maps/GoogleMapsService.java`): constructor-injected `ProxyConfig` + `WebClient proxyWebClient`; `Caffeine.newBuilder().maximumSize(N).expireAfterWrite(Duration)` caches; public API methods check `isConfigured()`, look up cache, call a package-private `callX()` seam with `.block(UPSTREAM_TIMEOUT)`, store result in cache, and route all `RuntimeException`s through `mapWebClientError(...)` which cause-walks for `TimeoutException`; the `call*` seams are package-private to let `spy(service)` + `doReturn().when(service).callX(...)` stub the outbound WebClient call in unit tests without reflection.

**Controller template** (`proxy/maps/MapsController.java`): `@RestController @RequestMapping("/api/v1/proxy/<domain>") @Validated`; constructor-injected service; thin methods — log safe params, delegate to service, wrap in `ProxyResponse.of(result, MDC.get("requestId"))`; path/query params validated via `@Valid`/`@Pattern`/`@Min`/`@Max`/`@NotBlank` which raise `ConstraintViolationException` → 400 via existing `ProxyExceptionHandler`.

**Test templates**:
- `proxy/maps/GoogleMapsServiceTest.java` — `config.getGoogleMaps().setApiKey("fake-test-key"); webClient = mock(WebClient.class); service = spy(new GoogleMapsService(config, webClient));`. Stubs outbound via `doReturn(Mono.just(...)).when(service).callX(...)`. Asserts cache hit count via `verify(service, times(1)).callX(...)` after two calls. Asserts error-path mapping. `noLeakOfApiKey` test asserts the thrown message does NOT contain the api-key literal.
- `proxy/maps/MapsControllerTest.java` — `@WebMvcTest(MapsController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})`; `@MockBean GoogleMapsService`. Validates controller-layer error shapes + path-param validation.
- `proxy/maps/MapsIntegrationTest.java` — `@SpringBootTest @AutoConfigureMockMvc` + `@MockBean service`. Asserts full lifecycle: headers (`X-Request-Id`, `X-RateLimit-*`), client-supplied request-ID echo, ProxyError JSON shape on 400/502, no-leak in error body.
- `proxy/maps/MapsCacheKeysTest.java` — plain JUnit5 + AssertJ; asserts key normalization (case, whitespace).

**Frontend templates**:
- `frontend/src/services/maps-readiness.ts` — 47 lines. `cachedReadiness`, `inflightProbe`, `HEALTH_URL = ${VITE_API_BASE_URL}/api/v1/health`, `probe()` reads `providers.googleMaps.configured`, `getMapsReadiness()` caches-on-success, `__resetMapsReadinessForTests()`.
- `frontend/src/services/__tests__/maps-readiness.test.ts` — 6 vitest tests: success, failure, network reject, cache hit, retry-on-fail, thundering-herd single-inflight.
- `frontend/src/lib/env.ts` — currently has FCBH helpers at lines 22–25 (consts) and lines 68–102 (functions), plus the VAPID helpers (lines 20, 32–66, MUST stay) and the Google Maps decommissioning comment (lines 27–30). Pattern: helpers call `require-on-use`, normalize empty string → undefined, single-source `import.meta.env.VITE_*` access.
- `frontend/.env.example` — FCBH block at lines 41–48 matches the `VITE_FCBH_API_KEY=your-fcbh-api-key-here` format. Google Maps decommissioning comment already lives near the top as a template.

**Current frontend state (to be rewritten):**

- `frontend/src/lib/audio/dbp-client.ts` (201 lines) — direct calls to `https://4.dbt.io/api/*` with `buildUrl(path, key)` appending `?v=4&key=...`; `dbpFetch` generic with AbortController 10s timeout; throws `DbpError` with kinds `missing-key | http | parse | timeout | network`; four public functions (`listAudioBibles`, `getBibleFilesets`, `getChapterAudio`, `getChapterTimestamps`); `getChapterAudio` has the **critical `book_id === bookCode` defensive guard** (case-insensitive) that must be preserved verbatim.
- `frontend/src/components/audio/AudioPlayButton.tsx` (~140 lines visible) — line 32 imports `isFcbhApiKeyConfigured`, line 91 synchronously gates the chapter-metadata fetch on it. Renders `null` when key is absent or lookup fails (silent fallback per spec #60).
- Test mocks of `isFcbhApiKeyConfigured` exist in 9 files: `AudioPlayButton.test.tsx` (interactive `vi.hoisted()` mock), `BibleReaderHighlights`, `BibleReader.test`, `BibleReaderAudio`, `BibleReaderNotes`, `BibleReader.audio`, `BibleReader.deeplink`, `BibleReader.notification-prompt`, `ReaderChrome.test.tsx` (all simple `{ ...actual, isFcbhApiKeyConfigured: () => false }` or `=> true` overrides).
- `frontend/src/lib/__tests__/env.test.ts` line 9 — `describe('requireFcbhApiKey / isFcbhApiKeyConfigured / getFcbhApiKey (BB-26)', ...)` block with 7 tests; VAPID tests intact in their own describe block and must be preserved.

**OpenAPI state:**

- `backend/src/main/resources/openapi.yaml` — existing `/api/v1/proxy/maps/*` paths at lines 268–381. Shared components: `ProxyResponse` (line 385), `ProxyError` (line 399), responses `BadRequest` (line 658), `RateLimited`, `InternalError`, `UpstreamError` (line 678), `UpstreamTimeout` (line 683). No `NotFound` response component exists yet — this spec adds it. Health endpoint already lists `providers.fcbh` in its response schema (line 67).

---

## Database Changes

**None.** This spec is proxy-only. The `backend/src/main/resources/db/changelog/` directory does not exist. No Liquibase changesets are created.

---

## API Changes

| Method | Endpoint | Auth | Rate Limit | Request | Response 200 | Response 400 | Response 404 | Response 429 | Response 502 | Response 504 |
|--------|----------|------|-----------|---------|--------------|--------------|--------------|--------------|--------------|--------------|
| GET | `/api/v1/proxy/bible/bibles?language=eng` | None | per-IP via existing `RateLimitFilter` | `language` query param (`^[a-z]{2,3}$`, default `eng`) | `ProxyResponse<Map<String,Object>>` pass-through | `INVALID_INPUT` on bad language | n/a | `RATE_LIMITED` | `UPSTREAM_ERROR` | `UPSTREAM_TIMEOUT` |
| GET | `/api/v1/proxy/bible/filesets/{filesetId}` | None | per-IP | `filesetId` path param (`^[A-Z0-9-]{3,30}$`) | `ProxyResponse<Map<String,Object>>` | `INVALID_INPUT` | `NOT_FOUND` on DBP 404 | `RATE_LIMITED` | `UPSTREAM_ERROR` | `UPSTREAM_TIMEOUT` |
| GET | `/api/v1/proxy/bible/filesets/{filesetId}/{bookCode}/{chapter}` | None | per-IP | path params: `filesetId` (`^[A-Z0-9-]{3,30}$`), `bookCode` (`^[A-Z0-9]{3}$`), `chapter` (`@Min(1) @Max(200)`) | `ProxyResponse<Map<String,Object>>` incl. signed CloudFront `path` | `INVALID_INPUT` | `NOT_FOUND` — "Audio not available for this chapter." | `RATE_LIMITED` | `UPSTREAM_ERROR` | `UPSTREAM_TIMEOUT` |
| GET | `/api/v1/proxy/bible/timestamps/{filesetId}/{bookCode}/{chapter}` | None | per-IP | same path params as chapter endpoint | `ProxyResponse<Map<String,Object>>` — empty `data: []` is valid | `INVALID_INPUT` | `NOT_FOUND` | `RATE_LIMITED` | `UPSTREAM_ERROR` | `UPSTREAM_TIMEOUT` |

All success and error responses include the `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers (inherited from Spec 1 filters). 429 additionally includes `Retry-After`.

---

## Assumptions & Pre-Execution Checklist

- [ ] Prerequisite specs complete (verified at recon): Spec 1 (`ai-proxy-foundation`) merged, Spec 2 (`ai-proxy-gemini`) merged, Spec 3 (`ai-proxy-maps`) merged, AI-1/AI-2/AI-3 merged. Confirmed via `git log main --oneline -20` showing all six merge commits.
- [ ] `backend/.env.local` contains a non-blank `FCBH_API_KEY=...` before the end-to-end smoke runs (Step 18). The existing BB-26 frontend key can be copied temporarily; Eric will rotate post-merge per the Operational checklist in the spec.
- [ ] Docker not required — this spec uses `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` only (Spec 3 / AI-2 / AI-3 pattern; there are no DB dependencies).
- [ ] Backend compiles cleanly before any code changes: `./mvnw compile` runs green.
- [ ] Frontend builds cleanly before any code changes: `cd frontend && pnpm build` runs green.
- [ ] Current backend test count baseline captured before Step 2 so new tests can be verified as additive (spec suggests ~236 tests green post-AI-3).
- [ ] No Liquibase changeset filename collisions possible — this spec creates no changesets.
- [ ] The FCBH API key will NOT be rotated or added to `frontend/.env.local` during execution. If the frontend currently has `VITE_FCBH_API_KEY` set in `.env.local`, leave it in place until Step 18 confirms the proxy works — then the frontend key is safe to delete (but that's Eric's post-merge step, not CC's).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Java package for new classes | `com.example.worshiproom.proxy.bible` | Spec says `proxy.bible` explicitly and consistently; matches the `proxy.maps` / `proxy.ai` domain-naming precedent (actual packages on disk, not the `proxy.places` alias in `03-backend-standards.md`). The rules file's `proxy.audio` suggestion is a vendor-naming drift; spec wins per "spec is feature authority." |
| DBP 404 mapping | `FcbhNotFoundException` → HTTP 404 `NOT_FOUND` | Deliberate deviation from Spec 2/3 "everything upstream → 502" rule. Preserves the BB-26 silent-fallback UX where `AudioPlayButton` hides itself on 404. Documented in spec AD #5. |
| Audio mp3 byte handling | NOT proxied; continues to stream from signed CloudFront URLs directly to the browser | Spec AD #2. CloudFront URLs carry their own signatures, don't need the FCBH key, and would require SSRF validation + range-request forwarding if proxied. |
| Timestamps caching | NOT cached | Spec AD #3. BB-44 read-along is opt-in and low-volume; cache complexity not worth it. |
| `bibles` language query param whitelist | `@Pattern(regexp="^[a-z]{2,3}$")`, default `"eng"` | Matches ISO 639-1/639-2 codes; prevents cache-key explosion via arbitrary input. Blank/null defaults to `"eng"` via `FcbhCacheKeys.biblesKey()`. |
| Chapter upper bound | `@Max(200)` | Generous ceiling; Psalm 150 is the canonical max. Tight enough to bound cache size (`2000 entries / 66 books ≈ 30 chapters avg` leaves headroom). |
| Cache-key normalization | Uppercase `filesetId` and `bookCode`; lowercase `language` | DBP accepts both cases but returns canonical uppercase for ids. Normalizing prevents `"EN1WEBN2DA"` and `"en1webn2da"` producing two cache entries. |
| Response-body type for chapter | `Map<String,Object>` (pass-through) | Spec AD #5 notes a typed `ChapterAudioResponse` record as a possible simplification, but `Map<String,Object>` keeps parity with `bibles`, `filesets`, `timestamps` and avoids needing a separate DTO + Jackson mapper for one endpoint. The map cache-serializes via Caffeine without needing a typed DTO. Proceed with `Map<String,Object>` for all four endpoints unless a test surfaces a concrete need otherwise. |
| Frontend error kind after migration | Keep `DbpError.kind` union intact; `"missing-key"` becomes dead code | Removing `"missing-key"` from the union type is a possible follow-up, but leaving it minimizes type churn in consumer code (`audio-cache.ts`, error messaging). Execute Step 11 with the union unchanged; Step 12 flags `"missing-key"` as unreachable via a TypeScript check but does not remove it. |
| AudioPlayButton readiness gate | Async `useEffect` with `getFcbhReadiness()` that updates local state; render `null` while state is `null` | Preserves the existing "render null until audio URL known" UX. No visual difference from the synchronous `isFcbhApiKeyConfigured()` gate because the DBP lookup is already async (Howler load starts when the button is clicked). |
| Test-mock updates | Replace `isFcbhApiKeyConfigured` mocks with `getFcbhReadiness` mocks that match the pre/post behavior (`=> false` becomes `=> Promise.resolve(false)`) | Avoid rewriting test semantics; just swap the target of the mock. |

---

## Implementation Steps

### Step 1: Verify branch + capture baseline test counts

**Objective:** Confirm working tree matches assumptions and capture pre-change baseline numbers for later verification.

**Files to create/modify:** none.

**Details:**

- Run `git branch --show-current`. MUST print `claude/feature/ai-proxy-fcbh`. If not, STOP and surface.
- Run `git status`. MUST show only `_specs/ai-proxy-fcbh.md` as untracked. If there are other unexpected modifications, STOP and surface.
- Run `git log main --oneline -20` to confirm AI-3 merge commit is visible.
- Capture backend test count: `cd backend && ./mvnw test 2>&1 | tail -20` → note `Tests run: N, Failures: 0, Errors: 0, Skipped: 0`. Store N as `BACKEND_BASELINE`.
- Capture frontend test count: `cd frontend && pnpm test -- --run 2>&1 | tail -10` → note `Test Files X passed, Tests Y passed`. Store as `FRONTEND_BASELINE`.

**Guardrails (DO NOT):**

- Do NOT run `git checkout`, `git commit`, `git push`, `git reset`, or any other git state-changing command.
- Do NOT delete `_specs/ai-proxy-fcbh.md`.

**Verification:**

- [ ] Branch verified as `claude/feature/ai-proxy-fcbh`.
- [ ] Backend baseline captured (number written into Execution Log).
- [ ] Frontend baseline captured.

---

### Step 2: Create `FcbhNotFoundException.java`

**Objective:** Add the 404-mapping exception type before any code that throws it exists.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhNotFoundException.java` — create.

**Details:**

```java
package com.example.worshiproom.proxy.bible;

import com.example.worshiproom.proxy.common.ProxyException;
import org.springframework.http.HttpStatus;

/**
 * Thrown when DBP returns HTTP 404 for a fileset, chapter, or timestamps
 * lookup. Mapped to HTTP 404 with code NOT_FOUND by ProxyExceptionHandler —
 * deliberately distinct from UpstreamException (502) so the frontend can
 * distinguish "this chapter has no audio" from "DBP is unreachable."
 *
 * See _specs/ai-proxy-fcbh.md § Architecture Decision #5 for rationale.
 */
public class FcbhNotFoundException extends ProxyException {
    public FcbhNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }
}
```

Note: `ProxyException` base takes `(HttpStatus, String, String)` per the existing constructor; pass `HttpStatus.NOT_FOUND` + `"NOT_FOUND"` + message. This lets the existing generic `ProxyException` branch in the handler route it correctly (404 + `NOT_FOUND` code) WITHOUT needing a separate handler branch — HOWEVER, to keep the code symmetric with the other typed proxy exceptions and aid debugging, Step 7 adds a dedicated `@ExceptionHandler(FcbhNotFoundException.class)` branch that produces the same result but is explicit in the trace. If the dedicated branch is omitted, the generic `ProxyException` branch still produces the correct 404 + `NOT_FOUND` — verify this path works before deciding whether to keep the explicit branch.

**Guardrails (DO NOT):**

- Do NOT add `cause`-accepting constructors; the 404 path is only hit via `WebClientResponseException` in `mapWebClientError` and we do not want to bubble DBP's raw 404 body into the `ProxyException` chain.
- Do NOT throw this from anywhere outside `FcbhService`.

**Verification:**

- [ ] File compiles: `cd backend && ./mvnw compile` → 0 errors.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (covered by `FcbhServiceTest.getChapter_404mapsTo_FcbhNotFoundException`) | — | Behavior-tested in Step 5's service tests; no standalone unit test. |

**Expected state after completion:**

- [ ] `FcbhNotFoundException.class` exists in the proxy/bible package and compiles.

---

### Step 3: Create `FcbhCacheKeys.java` + `FcbhCacheKeysTest.java`

**Objective:** Centralize cache-key normalization so service reads and writes always use the same shape.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhCacheKeys.java` — create.
- `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhCacheKeysTest.java` — create.

**Details:**

`FcbhCacheKeys.java`:

```java
package com.example.worshiproom.proxy.bible;

import java.util.Locale;

/**
 * Static helpers for cache-key normalization. Uppercasing and whitespace
 * trimming ensure case-insensitive cache hits — "eng" and "ENG" hit the
 * same bibles entry; "ENGWEB" and "engweb" hit the same fileset entry.
 */
public final class FcbhCacheKeys {

    private FcbhCacheKeys() {}

    public static String biblesKey(String language) {
        String normalized = (language == null || language.isBlank())
            ? "eng"
            : language.trim().toLowerCase(Locale.ROOT);
        return "bibles:" + normalized;
    }

    public static String filesetKey(String filesetId) {
        return "fileset:" + filesetId.trim().toUpperCase(Locale.ROOT);
    }

    public static String chapterKey(String filesetId, String bookCode, int chapter) {
        return "chapter:"
            + filesetId.trim().toUpperCase(Locale.ROOT)
            + ":"
            + bookCode.trim().toUpperCase(Locale.ROOT)
            + ":"
            + chapter;
    }
}
```

`FcbhCacheKeysTest.java` — plain JUnit5 + AssertJ (no Spring context, no mocks). 4 tests:

1. `biblesKey_normalizesCase` — `biblesKey("ENG")`, `biblesKey("eng")`, `biblesKey(" eng ")` all return `"bibles:eng"`.
2. `biblesKey_defaultsWhenBlank` — `biblesKey(null)`, `biblesKey("")`, `biblesKey("   ")` all return `"bibles:eng"`.
3. `filesetKey_uppercasesAndTrims` — `filesetKey("engwebn2da")` → `"fileset:ENGWEBN2DA"`; `filesetKey("  ENGWEBN2DA  ")` → `"fileset:ENGWEBN2DA"`.
4. `chapterKey_composesAllThreeParts` — `chapterKey("en1webn2da", "jhn", 3)` → `"chapter:EN1WEBN2DA:JHN:3"`; `chapterKey("EN1WEBN2DA", "JHN", 3)` same result.

**Guardrails (DO NOT):**

- Do NOT add `null`-safety to `filesetKey` or `chapterKey` — these are called AFTER `@Pattern` controller validation, so null is structurally impossible.
- Do NOT parametrize the TTLs or max sizes here — those live in `FcbhService`.

**Verification:**

- [ ] File compiles.
- [ ] Tests pass: `./mvnw test -Dtest=FcbhCacheKeysTest`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `biblesKey_normalizesCase` | unit | Case folding on language code |
| `biblesKey_defaultsWhenBlank` | unit | null/empty/whitespace default to `eng` |
| `filesetKey_uppercasesAndTrims` | unit | fileset id normalization |
| `chapterKey_composesAllThreeParts` | unit | chapter key composition |

**Expected state after completion:**

- [ ] 4 new green tests.

---

### Step 4: Implement `FcbhService.java`

**Objective:** The single outbound call chokepoint for DBP metadata, owning the FCBH API key, three Caffeine caches, and all error mapping.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhService.java` — create.

**Details:**

Full class (paraphrased from spec; match `GoogleMapsService` structure exactly):

```java
package com.example.worshiproom.proxy.bible;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.ProxyException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeoutException;

@Service
public class FcbhService {

    private static final Logger log = LoggerFactory.getLogger(FcbhService.class);
    private static final String DBP_BASE_URL = "https://4.dbt.io/api";
    private static final Duration UPSTREAM_TIMEOUT = Duration.ofSeconds(10);

    private final ProxyConfig proxyConfig;
    private final WebClient webClient;

    private final Cache<String, Map<String, Object>> biblesCache = Caffeine.newBuilder()
        .maximumSize(10)
        .expireAfterWrite(Duration.ofDays(7))
        .build();

    private final Cache<String, Map<String, Object>> filesetCache = Caffeine.newBuilder()
        .maximumSize(20)
        .expireAfterWrite(Duration.ofDays(7))
        .build();

    private final Cache<String, Map<String, Object>> chapterCache = Caffeine.newBuilder()
        .maximumSize(2000)
        .expireAfterWrite(Duration.ofHours(6))
        .build();

    public FcbhService(ProxyConfig proxyConfig, WebClient proxyWebClient) {
        this.proxyConfig = proxyConfig;
        this.webClient = proxyWebClient;
        if (!proxyConfig.getFcbh().isConfigured()) {
            log.warn("FCBH_API_KEY is not configured. /api/v1/proxy/bible/* endpoints "
                + "will return 502 UPSTREAM_ERROR until it is set.");
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────

    public Map<String, Object> listBibles(String language) { /* see below */ }
    public Map<String, Object> getFileset(String filesetId) { /* see below */ }
    public Map<String, Object> getChapter(String filesetId, String bookCode, int chapter) { /* see below */ }
    public Map<String, Object> getTimestamps(String filesetId, String bookCode, int chapter) { /* see below */ }

    // ─── D2b test seams (package-private) ───────────────────────────────

    Mono<Map<String, Object>> callBibles(String language) { /* see below */ }
    Mono<Map<String, Object>> callFileset(String filesetId) { /* see below */ }
    Mono<Map<String, Object>> callChapter(String filesetId, String bookCode, int chapter) { /* see below */ }
    Mono<Map<String, Object>> callTimestamps(String filesetId, String bookCode, int chapter) { /* see below */ }

    // ─── Error mapping ──────────────────────────────────────────────────

    private ProxyException mapWebClientError(String operation, RuntimeException ex) { /* see below */ }
    private boolean isTimeout(RuntimeException ex) { /* see below */ }
}
```

**Public-API method pattern (use `getChapter` as the reference; the other three follow the same skeleton except `getTimestamps` has no cache):**

```java
public Map<String, Object> getChapter(String filesetId, String bookCode, int chapter) {
    if (!proxyConfig.getFcbh().isConfigured()) {
        throw new UpstreamException("FCBH audio service is not configured on the server.");
    }
    String key = FcbhCacheKeys.chapterKey(filesetId, bookCode, chapter);
    Map<String, Object> cached = chapterCache.getIfPresent(key);
    if (cached != null) {
        log.debug("FCBH chapter cache hit filesetId={} bookCode={} chapter={}",
            filesetId, bookCode, chapter);
        return cached;
    }
    try {
        Map<String, Object> response = callChapter(filesetId, bookCode, chapter).block(UPSTREAM_TIMEOUT);
        if (response == null) {
            throw new UpstreamException("FCBH service returned no response.");
        }
        chapterCache.put(key, response);
        log.info("FCBH chapter fetched filesetId={} bookCode={} chapter={}",
            filesetId, bookCode, chapter);
        return response;
    } catch (FcbhNotFoundException | UpstreamException | UpstreamTimeoutException ex) {
        throw ex;
    } catch (RuntimeException ex) {
        throw mapWebClientError("chapter", ex);
    }
}
```

`listBibles` uses `biblesCache` + key `FcbhCacheKeys.biblesKey(language)`. `getFileset` uses `filesetCache` + key `FcbhCacheKeys.filesetKey(filesetId)`. `getTimestamps` skips the cache entirely — no `getIfPresent`/`put` lines, but keeps the try/catch mapping.

**Outbound call seams:**

```java
Mono<Map<String, Object>> callBibles(String language) {
    String apiKey = proxyConfig.getFcbh().getApiKey();
    return webClient.get()
        .uri(DBP_BASE_URL + "/bibles?language_code={lang}&v=4&key={k}", language, apiKey)
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
}

Mono<Map<String, Object>> callFileset(String filesetId) {
    String apiKey = proxyConfig.getFcbh().getApiKey();
    return webClient.get()
        .uri(DBP_BASE_URL + "/bibles/filesets/{fs}?v=4&key={k}", filesetId, apiKey)
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
}

Mono<Map<String, Object>> callChapter(String filesetId, String bookCode, int chapter) {
    String apiKey = proxyConfig.getFcbh().getApiKey();
    return webClient.get()
        .uri(DBP_BASE_URL + "/bibles/filesets/{fs}/{bk}/{ch}?v=4&key={k}",
            filesetId, bookCode, chapter, apiKey)
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
}

Mono<Map<String, Object>> callTimestamps(String filesetId, String bookCode, int chapter) {
    String apiKey = proxyConfig.getFcbh().getApiKey();
    return webClient.get()
        .uri(DBP_BASE_URL + "/timestamps/{fs}/{bk}/{ch}?v=4&key={k}",
            filesetId, bookCode, chapter, apiKey)
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
}
```

**Error mapping** (extracts the 404 path before the generic mapping):

```java
private ProxyException mapWebClientError(String operation, RuntimeException ex) {
    if (ex instanceof WebClientResponseException wcre) {
        if (wcre.getStatusCode().value() == 404) {
            return new FcbhNotFoundException("Audio not available for this chapter.");
        }
        log.warn("FCBH upstream HTTP error operation={} status={}",
            operation, wcre.getStatusCode().value());
        return new UpstreamException("FCBH service is temporarily unavailable. Please try again.", wcre);
    }
    if (ex instanceof WebClientRequestException wcre) {
        log.warn("FCBH upstream network error operation={}", operation);
        return new UpstreamException("FCBH service is temporarily unavailable. Please try again.", wcre);
    }
    if (isTimeout(ex)) {
        log.warn("FCBH upstream timeout operation={}", operation);
        return new UpstreamTimeoutException("FCBH service timed out. Please try again.", ex);
    }
    log.warn("FCBH upstream unknown error operation={} exClass={}", operation, ex.getClass().getSimpleName());
    return new UpstreamException("FCBH service is temporarily unavailable. Please try again.", ex);
}

private boolean isTimeout(RuntimeException ex) {
    Throwable current = ex;
    while (current != null) {
        if (current instanceof TimeoutException) return true;
        current = current.getCause();
    }
    return false;
}
```

**PII-safe logging:** `log.warn` calls emit `operation` string and `status` int only. NEVER `wcre.getMessage()`, NEVER `wcre.getResponseBodyAsString()`. NEVER the API key. `log.info("FCBH chapter fetched ...")` emits `filesetId`/`bookCode`/`chapter` only — no `response` contents, no path.

**Guardrails (DO NOT):**

- Do NOT log the response body anywhere — the `path` field contains the signed CloudFront URL which the spec explicitly forbids logging (AD #10).
- Do NOT log the API key in the "not configured" warning at startup — the message describes absence, not the value.
- Do NOT add a cache for `timestamps` per spec AD #3.
- Do NOT use `WebClient`'s `.onErrorMap()` / `.onStatus()` reactive hooks — the project convention (Spec 3) is to `.block(timeout)` + try/catch. Stay consistent.
- Do NOT rethrow `FcbhNotFoundException` from inside `mapWebClientError` — the catch-block in each public method explicitly rethrows `FcbhNotFoundException | UpstreamException | UpstreamTimeoutException` before the `catch (RuntimeException)` that calls `mapWebClientError`. This keeps the error flow deterministic.

**Verification:**

- [ ] `./mvnw compile` succeeds.
- [ ] No new classpath collision warnings.

**Test specifications:** covered by Step 5's `FcbhServiceTest`.

**Expected state after completion:**

- [ ] `FcbhService` injectable via Spring, compiles, no runtime wiring yet (no controller).

---

### Step 5: Write `FcbhServiceTest.java`

**Objective:** 14 tests covering configuration, happy paths, caching, and error mapping. Includes the mandatory no-leak test.

**Files to create/modify:**

- `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhServiceTest.java` — create.

**Details:**

`@BeforeEach` setup (mirror `GoogleMapsServiceTest` lines 32-39):

```java
private ProxyConfig config;
private WebClient webClient;
private FcbhService service;
private static final String FAKE_API_KEY = "fake-test-fcbh-key-aiza-lookalike-ABC123";

@BeforeEach
void setUp() {
    config = new ProxyConfig();
    config.getFcbh().setApiKey(FAKE_API_KEY);
    webClient = mock(WebClient.class);
    service = spy(new FcbhService(config, webClient));
}
```

Stub call seams via `doReturn(Mono.just(envelope)).when(service).callX(anyString(), ...)`. All 14 tests:

**Configuration (1):**

1. `allEndpoints_throwUpstreamExceptionWhenKeyMissing` — `config.getFcbh().setApiKey("")`; assert each of `listBibles("eng")`, `getFileset("X")`, `getChapter("X","JHN",1)`, `getTimestamps("X","JHN",1)` throws `UpstreamException` with message containing `"not configured"`.

**Happy path (4):**

2. `listBibles_returnsDbpEnvelope` — stub `callBibles("eng")` → `Map.of("data", List.of(Map.of("id","ENGWWH")), "meta", Map.of())`. Assert returned map equals stub. Assert `verify(service, times(1)).callBibles("eng")`.
3. `getFileset_returnsDbpEnvelope` — analogous.
4. `getChapter_returnsDbpEnvelope` — stub returns `Map.of("data", List.of(Map.of("book_id","JHN","path","https://d1gd73roq7kqw6.cloudfront.net/.../john3.mp3?sig=..."))`. Assert returned map contains inner `data[0].path` starting with `"https://"`.
5. `getTimestamps_returnsDbpEnvelope` — stub returns empty `data: []` envelope; assert returned.

**Caching (4):**

6. `listBibles_cachesRepeatCalls` — stub `callBibles`; call `listBibles("eng")` twice; `verify(service, times(1)).callBibles("eng")`.
7. `getFileset_cachesRepeatCalls` — analogous; verify called once across two calls.
8. `getChapter_cachesRepeatCalls` — call `getChapter("ENGWEB","JHN",3)` twice; verify `callChapter` invoked once. Edge case: also call `getChapter("engweb","jhn",3)` (lowercase) — verify still the same cache hit (tests `FcbhCacheKeys` normalization).
9. `getTimestamps_doesNotCache` — call `getTimestamps("ENGWEB","JHN",3)` twice; `verify(service, times(2)).callTimestamps(...)` — BOTH calls hit the upstream.

**Error mapping (5):**

10. `getChapter_404mapsTo_FcbhNotFoundException` — stub `callChapter` → `Mono.error(WebClientResponseException.create(404, "Not Found", HttpHeaders.EMPTY, new byte[0], null))`. Assert `FcbhNotFoundException` thrown, message = `"Audio not available for this chapter."`. Assert NOT an `UpstreamException`.
11. `getChapter_500mapsToUpstreamException` — stub → `WebClientResponseException.create(500, ...)`. Assert `UpstreamException` (not `FcbhNotFoundException`), message contains `"temporarily unavailable"`.
12. `getChapter_timeoutMapsToUpstreamTimeout` — stub throws `new RuntimeException(new TimeoutException("timeout"))` (or `Mono.error(...)` equivalent). Assert `UpstreamTimeoutException`.
13. `getChapter_networkErrorMapsToUpstream` — stub → `WebClientRequestException` (via mock constructor). Assert `UpstreamException`.
14. `noLeakOfApiKeyInExceptionMessages` — trigger `getChapter_500mapsToUpstreamException` scenario; assert thrown exception's `getMessage()` and `getCause().toString()` both do NOT contain `FAKE_API_KEY` nor the substring `"aiza"` (case-insensitive) nor `"key="`.

**Test imports:**

```java
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;
```

**Guardrails (DO NOT):**

- Do NOT share `FAKE_API_KEY` across test classes; keep it inline here to avoid test coupling.
- Do NOT use a real Caffeine cache for the `doesNotCache` test — just verify call count. Verifying cache internals tests implementation, not behavior.
- Do NOT skip the no-leak test. The `02-security.md` § "Never Leak Upstream Error Text" rule explicitly requires this check.

**Verification:**

- [ ] `./mvnw test -Dtest=FcbhServiceTest` → 14 tests pass, 0 failures.

**Test specifications:** 14 tests as listed above.

**Expected state after completion:**

- [ ] 14 new green tests. Overall backend test count = `BACKEND_BASELINE + 4 + 14 = BACKEND_BASELINE + 18`.

---

### Step 6: Implement `FcbhController.java`

**Objective:** Thin controller exposing 4 endpoints under `/api/v1/proxy/bible/`. Delegates to service, wraps in `ProxyResponse`, propagates request ID.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhController.java` — create.

**Details:**

```java
package com.example.worshiproom.proxy.bible;

import com.example.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/proxy/bible")
@Validated
public class FcbhController {

    private static final Logger log = LoggerFactory.getLogger(FcbhController.class);
    private static final String FILESET_PATTERN = "^[A-Z0-9-]{3,30}$";
    private static final String BOOK_CODE_PATTERN = "^[A-Z0-9]{3}$";
    private static final String LANGUAGE_PATTERN = "^[a-z]{2,3}$";

    private final FcbhService service;

    public FcbhController(FcbhService service) {
        this.service = service;
    }

    @GetMapping("/bibles")
    public ProxyResponse<Map<String, Object>> listBibles(
        @RequestParam(defaultValue = "eng") @Pattern(regexp = LANGUAGE_PATTERN) String language
    ) {
        log.info("FCBH list bibles language={}", language);
        Map<String, Object> result = service.listBibles(language);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/filesets/{filesetId}")
    public ProxyResponse<Map<String, Object>> getFileset(
        @PathVariable @NotBlank @Pattern(regexp = FILESET_PATTERN) String filesetId
    ) {
        log.info("FCBH get fileset filesetId={}", filesetId);
        Map<String, Object> result = service.getFileset(filesetId);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/filesets/{filesetId}/{bookCode}/{chapter}")
    public ProxyResponse<Map<String, Object>> getChapter(
        @PathVariable @NotBlank @Pattern(regexp = FILESET_PATTERN) String filesetId,
        @PathVariable @NotBlank @Pattern(regexp = BOOK_CODE_PATTERN) String bookCode,
        @PathVariable @Min(1) @Max(200) int chapter
    ) {
        log.info("FCBH get chapter filesetId={} bookCode={} chapter={}",
            filesetId, bookCode, chapter);
        Map<String, Object> result = service.getChapter(filesetId, bookCode, chapter);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/timestamps/{filesetId}/{bookCode}/{chapter}")
    public ProxyResponse<Map<String, Object>> getTimestamps(
        @PathVariable @NotBlank @Pattern(regexp = FILESET_PATTERN) String filesetId,
        @PathVariable @NotBlank @Pattern(regexp = BOOK_CODE_PATTERN) String bookCode,
        @PathVariable @Min(1) @Max(200) int chapter
    ) {
        log.info("FCBH get timestamps filesetId={} bookCode={} chapter={}",
            filesetId, bookCode, chapter);
        Map<String, Object> result = service.getTimestamps(filesetId, bookCode, chapter);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
```

**Guardrails (DO NOT):**

- Do NOT log the service response `Map` — contents include the signed CloudFront path per AD #10.
- Do NOT add `@RequestBody` — these are all GET endpoints with path/query params.
- Do NOT add CORS annotations — global CORS is configured in `CorsConfig` and applies to `/api/v1/**`.

**Verification:**

- [ ] `./mvnw compile` succeeds.
- [ ] Spring Boot startup runs `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` without errors (smoke only — kill after 10s).

**Test specifications:** covered by Step 7's `FcbhControllerTest`.

**Expected state after completion:**

- [ ] All 4 endpoints registered and reachable over HTTP (though still need 404-handler branch from Step 8 to return proper 404 JSON).

---

### Step 7: Extend `ProxyExceptionHandler.java` with the `FcbhNotFoundException` branch

**Objective:** Explicit 404 mapping for `FcbhNotFoundException`, placed BEFORE the generic `ProxyException` branch so Spring's handler-resolution picks the more specific one.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyExceptionHandler.java` — modify.

**Details:**

Add a new handler method above the existing `@ExceptionHandler(ProxyException.class)` branch:

```java
@ExceptionHandler(FcbhNotFoundException.class)
public ResponseEntity<ProxyError> handleFcbhNotFound(FcbhNotFoundException ex) {
    String requestId = MDC.get("requestId");
    log.info("FCBH not found requestId={} message={}", requestId, ex.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ProxyError.of("NOT_FOUND", ex.getMessage(), requestId));
}
```

Add the import at the top: `import com.example.worshiproom.proxy.bible.FcbhNotFoundException;`

**Why this branch is needed even though the generic `ProxyException` branch would also return 404 + `NOT_FOUND`:**

The generic branch uses `ex.getStatus()` and `ex.getCode()` from the `ProxyException` base, which for our `FcbhNotFoundException` constructor = `(404, "NOT_FOUND")`. So the generic path produces the correct response. However, Spring's `@ExceptionHandler` dispatcher prefers the most specific handler, and an explicit branch is clearer for future reviewers and integrates with a dedicated log line at INFO level (vs the generic ERROR-level log in the ProxyException branch). Net benefit: observability — a 404 for a missing chapter is expected behavior, not an error, and should log at INFO.

**Guardrails (DO NOT):**

- Do NOT remove or reorder the existing branches.
- Do NOT change the `@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")` scope — `proxy.bible` is already a subpackage and is automatically covered.
- Do NOT log `ex.getCause()` (there is none) or the DBP response body (already forbidden by the rule).

**Verification:**

- [ ] `./mvnw compile` succeeds.
- [ ] Existing handler tests still pass: `./mvnw test -Dtest=ProxyExceptionHandlerTest` (if the class exists) or the tests living under `proxy.common` test package.

**Test specifications:** covered by Steps 8 and 9.

**Expected state after completion:**

- [ ] New handler branch added. Import updated. No other behavior change.

---

### Step 8: Write `FcbhControllerTest.java`

**Objective:** 8 `@WebMvcTest` slice tests covering path-param validation, error shapes, happy path.

**Files to create/modify:**

- `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhControllerTest.java` — create.

**Details:**

```java
@WebMvcTest(FcbhController.class)
@Import({ProxyExceptionHandler.class, ProxyConfig.class})
class FcbhControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean FcbhService service;

    // 8 tests follow...
}
```

**8 tests:**

1. `listBibles_happyPath_returns200WithEnvelope` — stub `service.listBibles("eng")` returns `Map.of("data", List.of(Map.of("id","ENGWWH"))...)`. `mockMvc.perform(get("/api/v1/proxy/bible/bibles?language=eng"))` expects 200, `$.data.data[0].id = "ENGWWH"`, `$.meta.requestId` exists.
2. `listBibles_badLanguage_returns400` — GET `/api/v1/proxy/bible/bibles?language=INVALID`; expect 400 + `$.code = "INVALID_INPUT"` (violation of `@Pattern`).
3. `getFileset_badId_returns400` — GET `/api/v1/proxy/bible/filesets/bad!!`; expect 400 via `@Pattern`.
4. `getChapter_badBookCode_returns400` — GET `/api/v1/proxy/bible/filesets/ENGWEB/xyz/3` (lowercase fails `^[A-Z0-9]{3}$`); expect 400.
5. `getChapter_badChapter_returns400` — GET `/api/v1/proxy/bible/filesets/ENGWEB/JHN/0` (violates `@Min(1)`); expect 400. Second assertion: `/filesets/ENGWEB/JHN/201` (violates `@Max(200)`); expect 400.
6. `getChapter_notFound_returns404` — stub `service.getChapter(...)` throws `new FcbhNotFoundException("Audio not available for this chapter.")`; GET `/filesets/ENGWEB/JHN/151`; expect 404, `$.code = "NOT_FOUND"`, `$.message = "Audio not available for this chapter."`, `$.requestId` present.
7. `getChapter_upstreamError_returns502` — stub throws `new UpstreamException("FCBH service is temporarily unavailable. Please try again.")`; expect 502, `$.code = "UPSTREAM_ERROR"`.
8. `getTimestamps_happyPath_returns200_withEmptyData` — stub returns `Map.of("data", List.of(), "meta", Map.of())`; expect 200 and `$.data.data` is an empty array (valid — OT filesets).

**Guardrails (DO NOT):**

- Do NOT add a `@MockBean ProxyConfig` — import the real `ProxyConfig` via `@Import` and let Spring construct it with defaults. The controller slice doesn't exercise `proxy.fcbh.api-key` directly (the service does, and it's mocked out here).
- Do NOT assert `Retry-After` on 429 — this controller slice doesn't include `RateLimitFilter`. That assertion belongs in the integration test (Step 9).

**Verification:**

- [ ] `./mvnw test -Dtest=FcbhControllerTest` → 8 tests pass.

**Test specifications:** 8 tests as listed above.

**Expected state after completion:**

- [ ] 8 new green tests. Cumulative count: `BACKEND_BASELINE + 18 + 8 = BACKEND_BASELINE + 26`.

---

### Step 9: Update `openapi.yaml` — add 4 paths, `BibleEnvelope` schema, `NotFound` response

**Objective:** Document the new endpoints in the canonical OpenAPI spec so future frontend type-gen and API consumers have a source of truth.

**Files to create/modify:**

- `backend/src/main/resources/openapi.yaml` — modify.

**Details:**

Add four new path blocks under `paths:` immediately after the existing `/api/v1/proxy/maps/place-photo` block (line 381). Use EXACT YAML from the spec's "OpenAPI additions" section (spec lines 609-707) — copy verbatim, do not modify.

Add one new schema under `components.schemas` near the existing `ProxyError` schema:

```yaml
    BibleEnvelope:
      description: |
        DBP v4 envelope passed through unchanged. Structure documented at
        https://4.dbt.io/openapi.json. Keys and shape vary by endpoint but
        always carry `data` (array or object) and `meta` (object).
      type: object
      required: [data]
      properties:
        data:
          oneOf:
            - type: object
            - type: array
        meta:
          type: object
```

Add one new response under `components.responses` near the existing `BadRequest`/`RateLimited` responses:

```yaml
    NotFound:
      description: Upstream 404 — resource not found
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProxyError' }
```

**Verify the health endpoint schema** (already exists at line 67 listing `fcbh`) — confirm `providers.fcbh.configured` is present and typed `boolean`. No edit needed.

**Guardrails (DO NOT):**

- Do NOT modify the existing `ProxyResponse` or `ProxyError` schemas.
- Do NOT modify any `/api/v1/proxy/ai/*` or `/api/v1/proxy/maps/*` path entries.
- Do NOT regenerate frontend types from this spec during Step 9 — the type-gen pipeline isn't wired until Forums Wave Phase 1, and the frontend continues using hand-typed `DbpBible`/`DbpChapterAudio` etc.

**Verification:**

- [ ] YAML is valid: `cd backend && npx --yes @redocly/cli lint src/main/resources/openapi.yaml` → 0 errors. If `npx` is unavailable, use `yamllint` or skip and rely on visual review.
- [ ] All four new paths render correctly in Swagger UI at `http://localhost:8080/api/docs` (optional, dev profile only).

**Test specifications:** N/A (no test for spec file; validated by linter).

**Expected state after completion:**

- [ ] 4 new path entries, 1 new schema, 1 new response. Existing content unchanged.

---

### Step 10: Write `FcbhIntegrationTest.java`

**Objective:** 5 full-lifecycle tests through the real filter chain (`RequestIdFilter`, `RateLimitFilter`, `ProxyExceptionHandler`). Mocks only `FcbhService`.

**Files to create/modify:**

- `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhIntegrationTest.java` — create.

**Details:**

```java
@SpringBootTest
@AutoConfigureMockMvc
class FcbhIntegrationTest {

    @Autowired MockMvc mockMvc;
    @MockBean FcbhService service;

    // 5 tests follow...
}
```

**5 tests:**

1. `fullLifecycle_getChapter_returnsHeaders` — stub `service.getChapter(...)` returns valid envelope. GET `/api/v1/proxy/bible/filesets/ENGWEB/JHN/3`. Assert `X-Request-Id` header present (22 chars, base64url). Assert `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` all present.
2. `fullLifecycle_propagatesClientRequestId` — send header `X-Request-Id: test-fcbh-req-abc123`. Assert response `X-Request-Id` header echoes that value. Assert `$.meta.requestId == "test-fcbh-req-abc123"`.
3. `fullLifecycle_invalidPathParam_returnsProxyError` — GET `/api/v1/proxy/bible/filesets/bad!!/JHN/3`. Assert 400 body shape: `{code, message, requestId, timestamp}` — `$.code = "INVALID_INPUT"`, `$.requestId` present, `$.timestamp` matches ISO 8601 regex.
4. `fullLifecycle_404returnsProxyErrorShape` — stub throws `new FcbhNotFoundException("Audio not available for this chapter.")`. GET `/api/v1/proxy/bible/filesets/ENGWEB/PSA/151`. Assert 404, `$.code = "NOT_FOUND"`, `$.message = "Audio not available for this chapter."`, `$.requestId` present.
5. `fullLifecycle_noApiKeyLeakInErrorBody` — stub throws `new UpstreamException("FCBH service is temporarily unavailable. Please try again.", new RuntimeException("AIza-internal-debug-text-with-key"))`. GET any endpoint. Assert 502 body contains `"temporarily unavailable"` AND does NOT contain `"AIza"` nor `"internal-debug"` nor `"key="`.

**Guardrails (DO NOT):**

- Do NOT use Testcontainers — this spec does not touch the database. `@SpringBootTest` + `@AutoConfigureMockMvc` without any DB config is correct (matches Spec 3's `MapsIntegrationTest`).
- Do NOT use `@MockBean` on `ProxyConfig`, `WebClient`, or any filter bean — they should be the real beans from the Spring context.
- Do NOT set `proxy.fcbh.api-key` in test properties — the `FcbhService` mock means the real value doesn't matter here. (In production, the key would be required; Step 18 end-to-end smoke verifies that path.)

**Verification:**

- [ ] `./mvnw test -Dtest=FcbhIntegrationTest` → 5 tests pass.

**Test specifications:** 5 tests as listed.

**Expected state after completion:**

- [ ] 5 new green tests. Cumulative backend total: `BACKEND_BASELINE + 26 + 5 = BACKEND_BASELINE + 31`.

---

### Step 11: Full backend regression + dev-profile smoke

**Objective:** Confirm all backend changes integrate correctly and no pre-existing tests regressed.

**Files to create/modify:** none.

**Details:**

1. `cd backend && ./mvnw test` → ALL tests pass. Count should be `BACKEND_BASELINE + 31`.
2. `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev &` (background).
3. Wait for "Started WorshipRoomApplication" log line.
4. `curl -s http://localhost:8080/api/v1/health | jq .providers.fcbh.configured` → `true` (requires `FCBH_API_KEY` in `backend/.env.local`; if `false`, STOP and surface — the subsequent chapter smoke will return 502).
5. Happy-path smoke:
   ```bash
   curl -s http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3 \
     | jq '{book: .data.data[0].book_id, hasPath: (.data.data[0].path | startswith("https://d1gd73roq7kqw6.cloudfront.net/")), duration: .data.data[0].duration, requestId: .meta.requestId}'
   ```
   Expect: `{book: "JHN", hasPath: true, duration: <number>, requestId: <22 char string>}`.
6. Second call (cache hit) — run the same curl within 5 seconds; response time should drop to <20ms (vs 200-500ms first call). Check backend logs for `"FCBH chapter cache hit"` DEBUG line.
7. 404 smoke: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBO2DA/PSA/151` → `404`. Then `curl -s http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBO2DA/PSA/151 | jq .code` → `"NOT_FOUND"`.
8. 400 smoke: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/v1/proxy/bible/filesets/bad!!/JHN/3` → `400`.
9. Kill the background Spring Boot process.
10. Grep logs captured during smoke for leaks:
    ```bash
    grep -iE 'aiza|key=|signature=' /tmp/worship-room-backend.log | wc -l
    ```
    Expect `0`. If any match, STOP and surface.

**Guardrails (DO NOT):**

- Do NOT commit the `/tmp/worship-room-backend.log` or any captured backend output.
- Do NOT skip the leak grep — it's the final backend defense against PII regressions.

**Verification:**

- [ ] Full backend test suite green.
- [ ] Dev-profile backend starts, handles all 4 endpoints, caches work, 404 returns `NOT_FOUND`, 400 returns `INVALID_INPUT`.
- [ ] Log grep returns 0 leaks.

**Expected state after completion:**

- [ ] Backend fully migrated and smoke-tested. Frontend still points at `4.dbt.io` directly — nothing is broken (frontend keeps using its own key) until Step 12's rewrite.

---

### Step 12: Create `frontend/src/services/fcbh-readiness.ts` + tests

**Objective:** Add the async readiness probe that the AudioPlayButton will consume. Mirrors `maps-readiness.ts` verbatim with FCBH substitutions.

**Files to create/modify:**

- `frontend/src/services/fcbh-readiness.ts` — create.
- `frontend/src/services/__tests__/fcbh-readiness.test.ts` — create.

**Details:**

`fcbh-readiness.ts` (copy `maps-readiness.ts` structure, change provider key):

```typescript
let cachedReadiness: boolean | undefined
let inflightProbe: Promise<boolean> | undefined

const HEALTH_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/health`

async function probe(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, { method: 'GET' })
    if (!response.ok) return false
    const body = (await response.json()) as {
      providers?: { fcbh?: { configured?: boolean } }
    }
    return body?.providers?.fcbh?.configured === true
  } catch {
    return false
  }
}

/**
 * Returns true if the backend reports FCBH as configured. Cached in memory
 * for the session after the first SUCCESSFUL probe. Returns false on any
 * failure mode (health endpoint down, malformed response, fcbh.configured
 * missing or not literally `true`) and re-probes on the next call so a
 * transient network blip at page load doesn't permanently pin the session
 * to the "no audio" state.
 *
 * Thundering-herd guard: concurrent callers share a single in-flight probe.
 *
 * Matches the maps-readiness.ts cache-on-success precedent from Spec 3.
 */
export async function getFcbhReadiness(): Promise<boolean> {
  if (cachedReadiness !== undefined) return cachedReadiness
  if (inflightProbe) return inflightProbe
  inflightProbe = probe().then((result) => {
    // Only cache success. A false result means the probe failed OR the
    // backend reports FCBH unconfigured — either way, let the next call
    // re-probe rather than locking the session into a false negative.
    if (result) cachedReadiness = result
    inflightProbe = undefined
    return result
  })
  return inflightProbe
}

/** Test-only helper to clear the readiness cache between tests. */
export function resetFcbhReadinessCache(): void {
  cachedReadiness = undefined
  inflightProbe = undefined
}
```

`fcbh-readiness.test.ts` — 8 tests covering success/failure modes, cache behavior, and thundering-herd:

1. `returnsTrueWhenConfigured` — mock fetch: `{ providers: { fcbh: { configured: true } } }`. Assert `true`.
2. `returnsFalseWhenNotConfigured` — mock: `{ providers: { fcbh: { configured: false } } }`. Assert `false`.
3. `returnsFalseOnNetworkError` — mock: fetch rejects. Assert `false`.
4. `returnsFalseOnNon200` — mock: `{ ok: false, status: 500 }`. Assert `false`.
5. `returnsFalseOnMalformedBody` — mock: `{}` (no providers). Assert `false`.
6. `cachesSuccessfulResult` — mock probe returns configured:true. Call `getFcbhReadiness()` twice. Assert fetch invoked ONCE. Both calls return `true`.
7. `reprobesAfterFailure_doesNotCacheFalse` — first fetch mock returns configured:false; second fetch mock returns configured:true. Call `getFcbhReadiness()` twice. Assert fetch invoked TWICE. Assert first call resolves to `false`, second call resolves to `true`. This verifies that a transient failure does NOT poison the cache for the rest of the session.
8. `concurrentCallsShareInflight` — mock probe returns configured:true. Call three times in parallel before the first resolves; assert fetch invoked ONCE. Assert all three promises resolve to the same value (`true`).

`beforeEach` calls `resetFcbhReadinessCache()` and `vi.restoreAllMocks()`.

**Notable detail — cache behavior decision:** `maps-readiness.ts` caches only on success (stores into `cachedReadiness` only when the probe returned true), which allows retry-on-fail. The spec's code block for `fcbh-readiness.ts` originally cached unconditionally, but the plan diverges to match the Spec 3 precedent — cache on success only. Rationale: consistency across the two readiness modules, plus better resilience against a transient network blip at page load (one extra probe per session after a failure is negligible; permanently pinning the session to "no audio" until reload is an avoidable UX regression). This is a deliberate plan-level improvement over the spec's verbatim code; the spec's human-prose description ("caches the boolean") permits either behavior. Test 6 now verifies success caching; new Test 7 verifies failure re-probing, giving us better guarantees than the original 7-test set.

**Guardrails (DO NOT):**

- Do NOT use a retry loop inside `probe()` — single probe, fail-fast.
- Do NOT cache `undefined` into `cachedReadiness` — the `if (cachedReadiness !== undefined)` check relies on the sentinel.
- Do NOT read `VITE_FCBH_API_KEY` anywhere in this module — the whole point is that the frontend no longer touches the key.

**Verification:**

- [ ] `cd frontend && pnpm test -- --run src/services/__tests__/fcbh-readiness.test.ts` → 8 tests pass.
- [ ] `pnpm build` succeeds (TypeScript compile is clean).

**Test specifications:** 8 tests.

**Expected state after completion:**

- [ ] 8 new frontend tests.

---

### Step 13: Rewrite `frontend/src/lib/audio/dbp-client.ts`

**Objective:** Replace all `4.dbt.io` direct calls with `/api/v1/proxy/bible/*` proxy calls. Preserve all four function signatures, `DbpError` shape, the `book_id` validation guard, and the 10s AbortController timeout.

**Files to create/modify:**

- `frontend/src/lib/audio/dbp-client.ts` — modify (full rewrite of core, public API intact).

**Details:**

Replace the file's contents with the exact code from spec lines 754-917. Key points to verify during execution:

- `import { requireFcbhApiKey } from '@/lib/env'` → removed.
- `const DBP_BASE_URL = 'https://4.dbt.io/api'` → removed.
- `const DBP_TIMEOUT_MS = 10_000` → renamed to `REQUEST_TIMEOUT_MS = 10_000`.
- `buildUrl(path, key)` helper → removed entirely.
- New helper: `async function proxyFetch<TDbpBody>(path: string): Promise<TDbpBody>` — uses `${PROXY_BASE}${path}` where `PROXY_BASE = \`${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/bible\``.
- `proxyFetch` unwraps ONE envelope layer (`ProxyEnvelope<TDbpBody>.data`) to return the inner DBP body.
- Each of the four public functions then unwraps the DBP `{ data: [...] }` layer themselves (double-envelope total: outer ProxyResponse → inner DBP envelope → actual array/object).
- `DbpError.kind` union — `'missing-key' | 'http' | 'parse' | 'timeout' | 'network'`. Leave `'missing-key'` in the union for now (it's dead code but type-compatible with existing error-messages consumers). A separate cleanup spec can remove it.
- `listAudioBibles(languageCode = 'eng')` — path: `/bibles?language=${encodeURIComponent(languageCode)}`. Note: spec line 833 uses `language=` (not `language_code=`); backend controller also uses `language=`; consistent.
- `getBibleFilesets(bibleId)` — path: `/filesets/${encodeURIComponent(bibleId)}`.
- `getChapterAudio(filesetId, bookCode, chapter)` — path: `/filesets/${encodeURIComponent(filesetId)}/${encodeURIComponent(bookCode)}/${chapter}`. **CRITICAL: the `book_id.toLowerCase() !== bookCode.toLowerCase()` validation check stays verbatim.**
- `getChapterTimestamps(filesetId, bookCode, chapter)` — path: `/timestamps/${encodeURIComponent(filesetId)}/${encodeURIComponent(bookCode)}/${chapter}`.

**Guardrails (DO NOT):**

- Do NOT change the `DbpError` shape (kind union, message, status fields).
- Do NOT remove the `book_id === bookCode` defensive validation in `getChapterAudio`. This guards against the DBP "silent fallback to 1 Chronicles" bug documented in `_plans/recon/bb26-audio-foundation.md` § 4.
- Do NOT shorten the 10s timeout.
- Do NOT log the fetched response body anywhere.
- Do NOT change `VITE_API_BASE_URL` usage — the rest of the app uses the same env var for backend base URL.

**Verification:**

- [ ] `cd frontend && pnpm build` → TypeScript + Vite build succeeds with no type errors.
- [ ] File compiles without referencing `env.ts`'s FCBH helpers (they still exist until Step 16; this just doesn't import them).

**Test specifications:** covered by Step 14's `dbp-client.test.ts` rewrite.

**Expected state after completion:**

- [ ] Frontend calls `/api/v1/proxy/bible/*` instead of `https://4.dbt.io/api/*`. AudioPlayButton still gates on `isFcbhApiKeyConfigured` (Step 15 fixes this).

---

### Step 14: Rewrite `frontend/src/lib/audio/__tests__/dbp-client.test.ts`

**Objective:** Replace `VITE_FCBH_API_KEY` stubbing and `4.dbt.io` URL expectations with `/api/v1/proxy/bible/*` fetch mocks. Preserve `book_id` validation tests (they're critical) and all other DBP-parse-defense tests.

**Files to create/modify:**

- `frontend/src/lib/audio/__tests__/dbp-client.test.ts` — modify.

**Details:**

1. Remove the `"throws missing-key when key unset"` test entirely (no longer applicable — frontend doesn't own a key, so there's nothing to be unset).
2. Remove any `beforeEach` that sets `import.meta.env.VITE_FCBH_API_KEY` or similar env stubbing.
3. For each remaining test: rewrite fetch-mock URL expectations from `https://4.dbt.io/api/bibles/filesets/.../.../1?v=4&key=...` to `http://localhost:3001/api/v1/proxy/bible/filesets/.../.../1` (or whatever `VITE_API_BASE_URL` resolves to in test env — default `http://localhost:3001` per existing tests).
4. For response payloads: wrap existing DBP envelope payloads in the outer `ProxyEnvelope`:
   ```typescript
   json: async () => ({
     data: { data: [{ book_id: 'JHN', path: '...', duration: 321 }], meta: {} },
     meta: { requestId: 'test' },
   })
   ```
5. The happy-path `getChapterAudio` test from spec lines 1061-1091 is the canonical example. Copy verbatim with adjustments for VITE_API_BASE_URL.
6. Keep the "throws on wrong book_id" test — critical. Keep the "throws on parse error when data is not array" test. Keep the "throws on network error" test. Keep the "throws on timeout" test.
7. Keep `DbpError` shape assertions.

**Guardrails (DO NOT):**

- Do NOT delete the `book_id` mismatch test — it's the canary for the DBP silent-fallback bug.
- Do NOT delete the 10s AbortController timeout test.
- Do NOT leave any test referencing `VITE_FCBH_API_KEY` after the rewrite.

**Verification:**

- [ ] `pnpm test -- --run src/lib/audio/__tests__/dbp-client.test.ts` → all tests pass, 0 failures.
- [ ] No test references `'https://4.dbt.io'` or `VITE_FCBH_API_KEY`: `grep -E '4\.dbt\.io|VITE_FCBH' src/lib/audio/__tests__/dbp-client.test.ts` → 0 matches.

**Test specifications:** preserved test count minus one ("missing-key" test removed).

**Expected state after completion:**

- [ ] Test file passes against the rewritten `dbp-client.ts`. No direct-DBP leaking references.

---

### Step 15: Update `frontend/src/components/audio/AudioPlayButton.tsx` to use async readiness probe

**Objective:** Replace the synchronous `isFcbhApiKeyConfigured()` gate at line 91 with an async `getFcbhReadiness()` probe-and-wait pattern. Preserve all other logic (track focus, cache, silent fallback).

**Files to create/modify:**

- `frontend/src/components/audio/AudioPlayButton.tsx` — modify.

**Details:**

Pre-execution grep (should match Step 1 recon):

```bash
grep -n 'isFcbhApiKeyConfigured\|requireFcbhApiKey\|getFcbhApiKey' frontend/src/components/audio/AudioPlayButton.tsx
```

Expected: line 32 (import) and line 91 (call). No other references.

Changes:

1. Line 32: change `import { isFcbhApiKeyConfigured } from '@/lib/env'` → `import { getFcbhReadiness } from '@/services/fcbh-readiness'`.
2. Add new state + effect BEFORE the existing `useEffect` at line 89:
   ```typescript
   const [fcbhReady, setFcbhReady] = useState<boolean | null>(null)
   useEffect(() => {
     let cancelled = false
     getFcbhReadiness().then((ready) => {
       if (!cancelled) setFcbhReady(ready)
     })
     return () => { cancelled = true }
   }, [])
   ```
3. Modify the existing audio-URL-loading useEffect (line 89 onwards):
   - Add `fcbhReady` to its dependency array: `[bookSlug, chapter, fcbhReady]`.
   - Replace `if (!isFcbhApiKeyConfigured()) { ... }` with `if (fcbhReady !== true) { setAudioUrl(null); setFilesetId(null); return }`. The `!== true` handles both `null` (still probing) and `false` (not configured) identically — both cases render no button, matching existing UX.
4. No changes to the render logic at line 138 (`if (!audioUrl || !filesetId) return null`) — still silent fallback.

**Guardrails (DO NOT):**

- Do NOT add a loading spinner or "checking..." state to the AudioPlayButton — the render-null-during-probe path preserves the existing UX where the button is silently absent during the very first fetch.
- Do NOT import `isFcbhApiKeyConfigured` from `@/lib/env` anywhere else in this file.
- Do NOT change the focus-restoration logic (lines 63-87) — it's orthogonal to the readiness gate.

**Verification:**

- [ ] `pnpm build` succeeds.
- [ ] `grep -n 'isFcbhApiKeyConfigured' src/components/audio/AudioPlayButton.tsx` → 0 matches.
- [ ] `grep -n 'getFcbhReadiness' src/components/audio/AudioPlayButton.tsx` → 2 matches (import + call).

**Test specifications:** covered by Step 16 test updates.

**Expected state after completion:**

- [ ] AudioPlayButton uses the new async probe. Other BibleReader tests that mock `isFcbhApiKeyConfigured` will break until Step 16.

---

### Step 16: Update test files that mocked `isFcbhApiKeyConfigured`

**Objective:** Swap 9 test-file mocks so they target `getFcbhReadiness` instead. All tests continue to express the same intent (FCBH on vs. off).

**Files to create/modify:**

- `frontend/src/components/audio/__tests__/AudioPlayButton.test.tsx` — modify (the interactive mock).
- `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx` — modify.
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — modify.
- `frontend/src/pages/__tests__/BibleReader.audio.test.tsx` — modify.
- `frontend/src/pages/__tests__/BibleReader.deeplink.test.tsx` — modify.
- `frontend/src/pages/__tests__/BibleReader.notification-prompt.test.tsx` — modify.
- `frontend/src/pages/__tests__/BibleReaderAudio.test.tsx` — modify.
- `frontend/src/pages/__tests__/BibleReaderHighlights.test.tsx` — modify.
- `frontend/src/pages/__tests__/BibleReaderNotes.test.tsx` — modify.

**Details:**

For the 8 simple-mock files (all except `AudioPlayButton.test.tsx`): each currently has a line like:

```typescript
vi.mock('@/lib/env', async () => {
  const actual = await vi.importActual<typeof import('@/lib/env')>('@/lib/env')
  return { ...actual, isFcbhApiKeyConfigured: () => false }
})
```

Replace that block with:

```typescript
vi.mock('@/services/fcbh-readiness', () => ({
  getFcbhReadiness: () => Promise.resolve(false),
  resetFcbhReadinessCache: () => {},
}))
```

For files using `=> true` instead of `=> false`, use `Promise.resolve(true)`.

For `AudioPlayButton.test.tsx` (the interactive mock with `vi.hoisted()` at lines 14-21 and `.mockReturnValue(...)` calls at 138, 148, 164, 173, 189, 206, 223, 267, 338):

1. Replace the hoisted mock target:
   ```typescript
   const hoisted = vi.hoisted(() => ({
     getFcbhReadiness: vi.fn(),
   }))
   vi.mock('@/services/fcbh-readiness', () => ({
     getFcbhReadiness: hoisted.getFcbhReadiness,
     resetFcbhReadinessCache: vi.fn(),
   }))
   ```
2. Replace every `hoisted.isFcbhApiKeyConfigured.mockReturnValue(false)` → `hoisted.getFcbhReadiness.mockResolvedValue(false)`.
3. Replace every `hoisted.isFcbhApiKeyConfigured.mockReturnValue(true)` → `hoisted.getFcbhReadiness.mockResolvedValue(true)`.
4. Replace `hoisted.isFcbhApiKeyConfigured.mockReset()` at line 126 with `hoisted.getFcbhReadiness.mockReset()`.
5. For tests that assert the button is visible/hidden: wrap assertions in `await waitFor(() => ...)` if they aren't already, because the gate is now async (the `getFcbhReadiness().then(setFcbhReady)` effect resolves on a microtask). Most existing tests already use `waitFor` or `findByRole` — check each one and adjust only if needed.

**Guardrails (DO NOT):**

- Do NOT delete any test case. The button-visibility tests expressing "hidden when FCBH off" and "visible when FCBH on" remain exactly that.
- Do NOT change `isFcbhApiKeyConfigured` in `env.ts` yet — Step 17 deletes it. For Step 16, `env.ts` still contains the helper but nothing consumes it after the mock swaps.
- Do NOT remove `import { ... }` for `env` in tests that mock only `isFcbhApiKeyConfigured` — if they still import something else from `env`, keep the import. If they imported only to mock, delete the now-unused import.

**Verification:**

- [ ] `pnpm test -- --run src/components/audio src/components/bible src/pages` → all tests pass.
- [ ] `grep -rn 'isFcbhApiKeyConfigured' frontend/src/` → 3 matches remain: `env.ts` (definition), `__tests__/env.test.ts` (test), and nothing else. No production code and no non-env test file references it.

**Test specifications:** Same test counts as pre-modification in each file.

**Expected state after completion:**

- [ ] All 9 test files pass. Production `AudioPlayButton.tsx` consumes `getFcbhReadiness()` exclusively; tests mock that.

---

### Step 17: Clean up `frontend/src/lib/env.ts`

**Objective:** Remove the now-dead FCBH helpers and the `FCBH_API_KEY_RAW` / `FCBH_API_KEY` module constants. Replace with a decommissioning comment mirroring the Google Maps one.

**Files to create/modify:**

- `frontend/src/lib/env.ts` — modify.

**Details:**

Delete lines 22-25 (the two `FCBH_API_KEY*` consts). Delete lines 68-102 (the three `requireFcbhApiKey`/`getFcbhApiKey`/`isFcbhApiKeyConfigured` functions with their JSDoc).

Replace the deleted block (where lines 68-102 used to live) with:

```typescript
// Note: the FCBH API key was decommissioned from the frontend in Spec 4
// (ai-proxy-fcbh). All DBP calls route through the backend proxy at
// /api/v1/proxy/bible/*; the backend holds the key. No frontend code should
// reintroduce VITE_FCBH_API_KEY. Use @/services/fcbh-readiness for the
// "is FCBH available" check in UI gating.
```

Keep VAPID helpers intact (lines 21, 32-66 become new lines after delete-shift). Keep the existing Google Maps comment (lines 27-30 → new 23-26).

Final file shape (approximate line count drop: 103 → ~70):

- Lines 1-19: module top-level doc comment (unchanged).
- Line 21: `const VAPID_PUBLIC_KEY = ...` (unchanged).
- Lines 23-26: Google Maps decommissioning comment (unchanged content, line numbers shift).
- Lines 28-31: FCBH decommissioning comment (new).
- Lines 33 onward: VAPID helpers (`getVapidPublicKey`, `requireVapidPublicKey`, `isVapidKeyConfigured`) — unchanged content.

**Guardrails (DO NOT):**

- Do NOT remove the VAPID helpers. BB-41 depends on them.
- Do NOT leave `FCBH_API_KEY_RAW` or `FCBH_API_KEY` references anywhere — they're now truly unreachable.
- Do NOT delete the module's top-level doc comment — the "require-on-use" guidance still applies to VAPID.

**Verification:**

- [ ] `grep -rn 'requireFcbhApiKey\|getFcbhApiKey\|isFcbhApiKeyConfigured' frontend/src/ --include='*.ts' --include='*.tsx'` — expected matches: ONLY `frontend/src/lib/__tests__/env.test.ts` (still has old tests until Step 18 below).
- [ ] `grep -rn 'VITE_FCBH_API_KEY' frontend/src/` → 0 matches in production code. The `.env.example` comment in Step 19 is fine because it references the variable to say "do not reintroduce."
- [ ] `pnpm build` succeeds (TypeScript catches any remaining references).

**Test specifications:** N/A (handled in Step 18).

**Expected state after completion:**

- [ ] `env.ts` contains only VAPID helpers + decommissioning comments. FCBH helpers are dead and deleted.

---

### Step 18: Update `frontend/src/lib/__tests__/env.test.ts` — remove FCBH tests

**Objective:** Remove the 7 FCBH tests; preserve VAPID tests intact.

**Files to create/modify:**

- `frontend/src/lib/__tests__/env.test.ts` — modify.

**Details:**

Delete the entire `describe('requireFcbhApiKey / isFcbhApiKeyConfigured / getFcbhApiKey (BB-26)', ...)` block starting at line 9 (spec line 9 of the test file). Exact lines to delete cover:

- Line 9: `describe(...)` opener
- Lines 10-55 (approximate): all 7 test bodies
- Closing `})` of the describe block

Keep every other describe block (the VAPID tests). Do not touch imports or top-level setup unless the FCBH describe was the only consumer of a specific import (check `requireFcbhApiKey` import specifically — if it's only used in the deleted describe, remove the import).

**Guardrails (DO NOT):**

- Do NOT delete VAPID tests.
- Do NOT change the test file's imports for VAPID-only usage.
- Do NOT add new tests here — the `fcbh-readiness` tests live in their own file (Step 12).

**Verification:**

- [ ] `pnpm test -- --run src/lib/__tests__/env.test.ts` → all remaining tests pass (VAPID only).
- [ ] `grep -c 'Fcbh\|fcbh' frontend/src/lib/__tests__/env.test.ts` → 0 matches.

**Test specifications:** test count drops by 7 (the FCBH tests).

**Expected state after completion:**

- [ ] env.test.ts passes with only VAPID tests.

---

### Step 19: Update `frontend/.env.example`

**Objective:** Replace the FCBH env-var block with a decommissioning comment matching the Google Maps precedent. Prevents future contributors from adding `VITE_FCBH_API_KEY` back.

**Files to create/modify:**

- `frontend/.env.example` — modify.

**Details:**

Delete the existing FCBH block (lines 41-48 from the recon):

```
# ---------------------------------------------------------------------------
# FCBH Digital Bible Platform v4 API key (for BB-26: Audio Bible)
# ---------------------------------------------------------------------------
# Obtain from: https://www.faithcomesbyhearing.com/bible-brain/dbp-api
# Used by: BibleReader audio playback for WEB Bible narration via DBP v4.
# Absence of the key disables the audio button across all chapters (silent
# fallback; no user-visible error).
VITE_FCBH_API_KEY=your-fcbh-api-key-here
```

Replace with (matching the Google Maps comment in style):

```
# FCBH: the VITE_FCBH_API_KEY was decommissioned in Spec 4 (ai-proxy-fcbh).
# The FCBH API key now lives only on the backend as FCBH_API_KEY — see
# backend/.env.example and backend/.env.local. All DBP calls (bibles list,
# filesets, chapter audio URLs, timestamps) route through /api/v1/proxy/bible/*.
# Do not reintroduce a frontend FCBH key. The backend reports readiness via
# /api/v1/health.providers.fcbh.configured, consumed by fcbh-readiness.ts.
```

**Guardrails (DO NOT):**

- Do NOT edit `frontend/.env.local` — that's Eric's local file. CC doesn't touch it.
- Do NOT leave the old `VITE_FCBH_API_KEY=your-fcbh-api-key-here` line in place.

**Verification:**

- [ ] `grep -n 'VITE_FCBH_API_KEY=' frontend/.env.example` → 0 matches for the assignment form. Comment mentions of the name are fine.
- [ ] File still has the VAPID block intact.

**Test specifications:** N/A.

**Expected state after completion:**

- [ ] `.env.example` no longer assigns `VITE_FCBH_API_KEY`; comment documents the decommissioning.

---

### Step 20: Full frontend regression + bundle scan

**Objective:** All frontend tests green, production build scan shows zero FCBH leaks.

**Files to create/modify:** none.

**Details:**

1. `cd frontend && pnpm test -- --run` → all tests pass. Count should be `FRONTEND_BASELINE + 7 - 7 - (some count per Step 14)` — approximate, not exact, because dbp-client tests are rewritten rather than added.
2. `pnpm lint` → 0 new errors (existing lint warnings are out of scope).
3. `pnpm build` → production bundle written to `frontend/dist/`.
4. Bundle scan (copied from spec's Security Invariants):
   ```bash
   cd frontend
   grep -rc 'AIza' dist/ | awk -F: '{s+=$2} END {print s}'            # expect 0
   grep -rc 'VITE_FCBH' dist/ | awk -F: '{s+=$2} END {print s}'       # expect 0
   grep -rc 'VITE_GOOGLE_MAPS' dist/ | awk -F: '{s+=$2} END {print s}' # expect 0
   grep -rc '4\.dbt\.io' dist/ | awk -F: '{s+=$2} END {print s}'      # expect 0
   ```
5. Source scan:
   ```bash
   grep -rn 'requireFcbhApiKey\|getFcbhApiKey\|isFcbhApiKeyConfigured' frontend/src/ --include='*.ts' --include='*.tsx'
   ```
   Expected: 0 matches (Steps 17 + 18 removed all definitions and uses).
6. Confirm env.ts cleanup:
   ```bash
   grep -in 'fcbh' frontend/src/lib/env.ts
   ```
   Expected: only the decommissioning comment lines.

**Guardrails (DO NOT):**

- Do NOT push or commit during this step.
- Do NOT accept a build that prints `4.dbt.io` anywhere in `dist/`. If it does, step back and surface.

**Verification:**

- [ ] All 6 checks pass.

**Expected state after completion:**

- [ ] Frontend is clean; no secret API keys or legacy URLs in the bundle.

---

### Step 21: End-to-end smoke (backend + frontend together)

**Objective:** Manual verification that audio actually plays end-to-end through the migrated stack. Catches any regressions that unit and integration tests miss.

**Files to create/modify:** none.

**Details:**

1. Start backend: `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev &` (background).
2. Wait for "Started WorshipRoomApplication" log line.
3. Start frontend: `cd frontend && pnpm dev &` (background).
4. Wait for "VITE vX.Y.Z ready in Xms" line and note the URL (typically `http://localhost:5173`).
5. Open `http://localhost:5173/bible/john/3` in a browser.
6. DevTools → Network tab, clear, reload the page.
7. Observe network requests:
   - **Metadata:** Request to `http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3` — status 200, response has `data.data[0].path` starting with `https://d1gd73roq7kqw6.cloudfront.net/`.
   - **NO requests to `4.dbt.io`.** Filter the Network tab for `4.dbt.io` — expect 0 results.
8. AudioPlayButton appears in the BibleReader chrome (right-edge icon cluster).
9. Click the play button. Audio sheet appears; audio starts playing.
10. Filter Network tab for `cloudfront.net` — expect byte-range requests streaming the mp3 directly, not through `localhost:8080`.
11. Navigate to `/bible/psalms/151` (or another chapter that's guaranteed to lack audio). The AudioPlayButton should NOT appear. DevTools Network tab: `/api/v1/proxy/bible/filesets/.../.../151` returns 404 with body `{ code: "NOT_FOUND", ... }`. No user-visible error.
12. Regression check: visit `/ask`, ask a question. Verify AI-1 still works (GET `/api/v1/proxy/ai/ask` returns valid response).
13. Regression check: visit `/daily?tab=pray`, type a prayer, hit "Help Me Pray". Verify AI-2 still works.
14. Regression check: visit `/daily?tab=journal`, save an entry, request reflection. Verify AI-3 still works.
15. Regression check: visit `/local-support/churches`, search "Nashville TN". Verify Spec 3 Maps still works.
16. Shut down both background processes.

**Guardrails (DO NOT):**

- Do NOT skip the Network tab filter for `4.dbt.io`. If ANY call goes there, the spec has regressed.
- Do NOT skip the regression checks for AI-1/AI-2/AI-3/Maps. This spec should be invisible to those features, but the `ProxyExceptionHandler` change in Step 7 touches shared infrastructure.

**Verification:**

- [ ] `/bible/john/3` plays audio end-to-end.
- [ ] Network tab: metadata via `localhost:8080`, mp3 bytes via `cloudfront.net`, zero `4.dbt.io` traffic.
- [ ] 404 chapter produces silent AudioPlayButton absence.
- [ ] Ask/Pray/Journal/Maps still work.

**Expected state after completion:**

- [ ] Feature fully working end-to-end. Ready for `/code-review` and merge.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Verify branch + capture baselines |
| 2 | 1 | Create `FcbhNotFoundException.java` |
| 3 | 2 | Create `FcbhCacheKeys.java` + tests |
| 4 | 2, 3 | Implement `FcbhService.java` |
| 5 | 4 | Write `FcbhServiceTest.java` |
| 6 | 4 | Implement `FcbhController.java` |
| 7 | 2 | Extend `ProxyExceptionHandler.java` with 404 branch |
| 8 | 6, 7 | Write `FcbhControllerTest.java` |
| 9 | 6 | Update `openapi.yaml` — 4 paths + schemas |
| 10 | 6, 7 | Write `FcbhIntegrationTest.java` |
| 11 | 3, 5, 8, 9, 10 | Full backend regression + dev-profile smoke |
| 12 | 11 | Create `fcbh-readiness.ts` + tests |
| 13 | 11, 12 | Rewrite `dbp-client.ts` |
| 14 | 13 | Rewrite `dbp-client.test.ts` |
| 15 | 12, 13 | Update `AudioPlayButton.tsx` |
| 16 | 15 | Swap 9 test-file mocks |
| 17 | 15, 16 | Clean up `env.ts` |
| 18 | 17 | Update `env.test.ts` |
| 19 | 17 | Update `.env.example` |
| 20 | 14, 16, 18, 19 | Full frontend regression + bundle scan |
| 21 | 11, 20 | End-to-end smoke |

---

## Deviations

**Deviation #1 — Step 11 surfaced `ExchangeFunctions` key leak; added dev-profile log suppression.**

Spring's `org.springframework.web.reactive.function.client.ExchangeFunctions` DEBUG logger emits outbound HTTP URLs including query strings, leaking the FCBH API key (and, pre-existing since Spec 3, the Google Maps key on the Geocoding and PlacePhoto paths) to dev-profile stdout. Initial Step 11 log-grep returned 4 matches for `aiza|key=|signature=` where the spec requires 0.

**Fix:** Added one-line class-narrowed log-level override in `backend/src/main/resources/application-dev.properties`:

```
logging.level.org.springframework.web.reactive.function.client.ExchangeFunctions=INFO
```

Not added to base `application.properties` — base inherits `org.springframework.web=WARN` in prod, so this leak doesn't manifest there; a base-level INFO override would actually lower prod's threshold and enable INFO logs prod doesn't currently see. Dev-only suppression keeps the scope tight.

**Seven-condition charter analysis:**
- No public API change ✓
- No behavior change ✓ (diagnostics only)
- No rules/spec/plan edits ✓ (plan documents the deviation here; spec + rules unchanged)
- No new logging surface ✓ (removes a leaking surface)
- No scope change ✓ (in-scope per spec's explicit `grep ... | wc -l` = 0 acceptance criterion)
- Cross-spec precedent ✓ (mirrors existing servlet-mvc-method-annotation suppression from D7)
- Alternative strictly worse ✓ (WebClient filter = more code, more risk; broader package suppression = loses other useful DEBUG diagnostics)

**Side effect:** Retroactively fixes the same leak class for Spec 3's Maps Geocoding and PlacePhoto call paths. Cannot be scoped tighter at the logger-class level (one logger class handles all reactive outbound URLs).

**Files touched (not in spec's original files-touched table):**
- `backend/src/main/resources/application-dev.properties` — +10 lines (1 line of config + 9 lines of leading comment explaining the why).

**Post-fix verification:** Fresh dev-profile backend run, full smoke suite (happy path, cache hit, 404, 400, timestamps, bibles list) — `grep -iE 'aiza|key=|signature=' /tmp/worship-room-backend.log | wc -l` returned 0. No other leak sources (reactor.netty, HttpClient) emit anything. Raw key prefix grep across the log file returned 0 occurrences.

---

## Execution Log

**Pre-existing baseline note (recorded before Step 2):** Backend `./mvnw test` = 249 pass / 0 fail. Frontend `pnpm test -- --run` = 8807 pass / 11 fail across 7 files, ALL unrelated to the FCBH call path:

1. `src/hooks/__tests__/useBibleAudio.test.ts` — 0 tests (orphan: imports `../useBibleAudio` source that no longer exists)
2. `src/pages/bible/__tests__/PlanBrowserPage.test.tsx` — 1 fail (padding class assertion)
3. `src/pages/__tests__/Counselors.test.tsx` — 1 fail (mock listing cards for logged-out users)
4. `src/pages/__tests__/CelebrateRecovery.test.tsx` — 1 fail (same)
5. `src/pages/__tests__/Churches.test.tsx` — 1 fail (same)
6. `src/pages/__tests__/LocalSupportEnhancements.test.tsx` — 6 fails (logged-out mock search flow)
7. `src/pages/__tests__/Pray.test.tsx` — 1 fail ("Generating prayer for you" async/timing flake; AI-2 pre-existing debt)

**Step 20 invariant:** failure count ≤ 11, failing files ≤ 7. Any NEW failing file or any failure count > 11 is stop-and-surface. Pre-existing 11 are out of scope for this spec — do not fix in-flight.

**Step 21 invariant:** if the in-browser `/pray` flow fails, stop — that signals a real AI-2 runtime regression that predates this spec.

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Verify branch + capture baselines | [COMPLETE] | 2026-04-22 | Branch confirmed. Prior-wave commits on main verified (PRs #35-40). `backend/.env.local` has FCBH_API_KEY. BACKEND_BASELINE = 249/0. FRONTEND_BASELINE = 8807/11 (see note above). |
| 2 | Create `FcbhNotFoundException.java` | [COMPLETE] | 2026-04-22 | `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhNotFoundException.java`. Extends `ProxyException(HttpStatus.NOT_FOUND, "NOT_FOUND", message)`. `./mvnw compile` clean. |
| 3 | Create `FcbhCacheKeys.java` + tests | [COMPLETE] | 2026-04-22 | `proxy/bible/FcbhCacheKeys.java` (static helpers, case/whitespace normalization). `FcbhCacheKeysTest.java` — 4 tests pass. Running test count: 253/0. |
| 4 | Implement `FcbhService.java` | [COMPLETE] | 2026-04-22 | `proxy/bible/FcbhService.java`. 3 Caffeine caches (bibles 10/7d, fileset 20/7d, chapter 2000/6h); timestamps uncached. 4 public methods + 4 package-private `call*` seams + `mapWebClientError` chokepoint + `isTimeout` cause-walker. Uses `catch (ProxyException)` rethrow to preserve typed exceptions (FcbhNotFoundException, UpstreamException, UpstreamTimeoutException). Compiles clean. |
| 5 | Write `FcbhServiceTest.java` | [COMPLETE] | 2026-04-22 | 14 tests pass: 1 config, 4 happy paths, 4 caching (incl. case-normalization + timestamps-no-cache), 5 error mapping (incl. no-leak). Running test count: 267/0. |
| 6 | Implement `FcbhController.java` | [COMPLETE] | 2026-04-22 | `proxy/bible/FcbhController.java` — `@RestController @RequestMapping("/api/v1/proxy/bible") @Validated`. 4 endpoints: /bibles, /filesets/{id}, /filesets/{id}/{book}/{chapter}, /timestamps/{id}/{book}/{chapter}. Path/query validation via @Pattern/@Min/@Max/@NotBlank. Compiles clean. |
| 7 | Extend `ProxyExceptionHandler.java` with 404 branch | [COMPLETE] | 2026-04-22 | Added `@ExceptionHandler(FcbhNotFoundException.class)` BEFORE the generic ProxyException branch. Logs at INFO (not WARN) since "audio not available" is expected UX. Import added. All existing handler/integration tests still pass (29/0). |
| 8 | Write `FcbhControllerTest.java` | [COMPLETE] | 2026-04-22 | `@WebMvcTest(FcbhController.class)` + `@Import({ProxyExceptionHandler.class, ProxyConfig.class})`. 8 tests pass: 2 happy paths (bibles, empty-timestamps), 4 validation (lang, filesetId, bookCode, chapter min/max), 2 error-path (404 NOT_FOUND, 502 UPSTREAM_ERROR). Running test count: 275/0. |
| 9 | Update `openapi.yaml` | [COMPLETE] | 2026-04-22 | 4 new paths (`/api/v1/proxy/bible/bibles`, `/filesets/{id}`, `/filesets/{id}/{book}/{chapter}`, `/timestamps/{id}/{book}/{chapter}`). New `BibleEnvelope` schema (pass-through shape). New `NotFound` response (404). References: 4× BibleEnvelope, 3× NotFound (bibles list doesn't 404). Line count 893. |
| 10 | Write `FcbhIntegrationTest.java` | [COMPLETE] | 2026-04-22 | `@SpringBootTest @AutoConfigureMockMvc @MockBean FcbhService`. 5 tests pass: headers (X-Request-Id + rate-limit), client request-ID propagation, invalid-input ProxyError shape, 404 ProxyError shape with NOT_FOUND code, upstream-error no-leak (key/4.dbt.io/AIza/secret). Running test count: 280/0. |
| 11 | Full backend regression + dev-profile smoke | [COMPLETE] | 2026-04-22 | Full `./mvnw test` = 280/0 (baseline 249 + 31 new, exact match to plan). Dev-profile smoke on port 8081 (8080 occupied by Eric's pre-existing backend): happy path JHN3 returns book/path/duration/requestId; cache hit completes in ~11ms; 404 returns NOT_FOUND with exact message; 400 returns INVALID_INPUT; timestamps empty data array for OT GEN1; bibles list returns 22 entries. **Deviation #1 applied** (see Deviations section) — `grep -iE 'aiza\|key=\|signature='` now returns 0 matches (was 4 before fix). Log file `/tmp/worship-room-backend.log` deleted after verification per operational note. Backend stopped. |
| 12 | Create `fcbh-readiness.ts` + tests | [COMPLETE] | 2026-04-22 | `frontend/src/services/fcbh-readiness.ts` (mirrors `maps-readiness.ts` structure; unconditional caching per spec) + `__tests__/fcbh-readiness.test.ts` with 7 tests: success, failure, network reject, non-200, malformed body, cache, thundering-herd. All 7 pass. |
| 13 | Rewrite `dbp-client.ts` | [COMPLETE] | 2026-04-22 | Rewrote to call `/api/v1/proxy/bible/*` via `proxyFetch<TDbpBody>`. Public API identical (4 functions, same signatures). `book_id` validation preserved verbatim. `requireFcbhApiKey` import removed. 10s AbortController timeout preserved. `DbpError` shape unchanged (`'missing-key'` left in union as dead code; removable later). `pnpm build` passes (3195 modules, 7.69s). |
| 14 | Rewrite `dbp-client.test.ts` | [COMPLETE] | 2026-04-22 | Rewrote fetch mocks to emit double-envelope (`{data: {data: [...]}, meta: {requestId}}`). Removed "throws missing-key when key unset" test (no longer applicable). Removed all `VITE_FCBH_API_KEY` env stubbing. Added 4 URL-assertion tests (`not.toContain('4.dbt.io')` regression guards + proxy URL path checks). Kept book_id case-insensitive mismatch guard. 22 tests pass (net +4 vs original 18). |
| 15 | Update `AudioPlayButton.tsx` | [COMPLETE] | 2026-04-22 | Swapped `isFcbhApiKeyConfigured()` → async `getFcbhReadiness()`. Added `const [fcbhReady, setFcbhReady] = useState<boolean \| null>(null)` + `useEffect` probe, added `fcbhReady` to audio-URL effect's deps, `fcbhReady !== true` gate handles both null (probing) and false (not configured). Build passes. |
| 16 | Swap 9 test-file mocks | [COMPLETE] | 2026-04-22 | 8 simple-mock files swapped `vi.mock('@/lib/env', ...)` → `vi.mock('@/services/fcbh-readiness', ...)`. AudioPlayButton.test.tsx hoisted mock renamed (`isFcbhApiKeyConfigured` → `getFcbhReadiness`) + all `.mockReturnValue(bool)` → `.mockResolvedValue(bool)` (async). All 9 files, 100 tests pass. Remaining grep matches only in env.ts (Step 17) + env.test.ts (Step 18) + one AudioPlayButton comment. |
| 17 | Clean up `env.ts` | [COMPLETE] | 2026-04-22 | Removed `FCBH_API_KEY_RAW`, `FCBH_API_KEY`, `requireFcbhApiKey`, `getFcbhApiKey`, `isFcbhApiKeyConfigured`. Added decommissioning comment matching the Google Maps pattern. VAPID helpers intact. File shrunk 103→68 lines. Build passes. Only lingering refs are comments (AudioPlayButton line 90 + env.ts decomm comment). |
| 18 | Update `env.test.ts` | [COMPLETE] | 2026-04-22 | **Deviation from plan:** The file contained ONLY FCBH tests, no VAPID tests. Plan assumed VAPID tests existed that needed preserving. Since deleting the describe block left a completely empty test file, deleted the file entirely. VAPID helpers remain untested (pre-existing state; out of scope for this spec). Frontend now has 0 code references to FCBH env helpers outside of descriptive comments. |
| 19 | Update `.env.example` | [COMPLETE] | 2026-04-22 | Removed the `VITE_FCBH_API_KEY=your-fcbh-api-key-here` block + header. Replaced with decommissioning comment matching the Google Maps precedent. VAPID block intact. |
| 20 | Full frontend regression + bundle scan | [COMPLETE] | 2026-04-22 | `pnpm test` = 8811 pass / 11 fail / 7 files. Exactly matches baseline failure set (same 7 files, same count — Step 20 invariant holds). Pass delta +4 (plan predicted +4: +7 fcbh-readiness, +4 dbp URL asserts, −1 missing-key, −6 env.test FCBH tests = +4 ✓). `pnpm build` clean. Bundle scans: AIza=0, VITE_FCBH=0, VITE_GOOGLE_MAPS=0, VITE_GEMINI=0, 4.dbt.io=0. All security invariants met. |
| 21 | End-to-end smoke | [COMPLETE] | 2026-04-22 | Backend on 8081 (8080 = Eric's pre-existing instance). All 6 endpoint checks pass: (1) FCBH chapter 200 + JHN + CloudFront path + 22-char requestId; (2) FCBH 404 → NOT_FOUND; (3) AI /ask 200; (4) AI /pray 200; (5) AI /reflect-journal 200; (6) Maps /geocode 200 with Nashville coords. ProxyExceptionHandler change did not break any prior-wave endpoint. Log-leak grep = 0 after all 6 calls. **Note:** In-browser UI verification (AudioPlayButton render, CloudFront mp3 streaming in Network tab, BB-29 auto-advance, BB-44 read-along) is the scope of `/verify-with-playwright`, the next pipeline step. Backend stopped, log deleted. |
