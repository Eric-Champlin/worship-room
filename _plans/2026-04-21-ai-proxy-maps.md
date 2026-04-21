# Plan: AI Proxy — Google Maps + Local Support Frontend Migration

**Spec:** `_specs/ai-proxy-maps.md`
**Date:** 2026-04-21
**Branch:** `claude/feature/ai-proxy-maps`
**Wave:** Key Protection (Spec 3 of 5)
**Size:** L (about 20 files touched, ~1,100 net LOC add)
**Risk:** Medium. Three new backend endpoints (one streams binary). Frontend factory becomes async which touches every caller of `createLocalSupportService()`. Breaking shape change on `/api/v1/health` providers block. One SSRF guard. Zero migrations, zero auth changes.

---

## Affected Frontend Routes

- `/local-support/churches`
- `/local-support/counselors`
- `/local-support/celebrate-recovery`

---

## Universal Rules Checklist

N/A — standalone spec, see `.claude/rules/` files for applicable conventions. The relevant rules in play for this spec are:

- `02-security.md` § BOUNDED EXTERNAL-INPUT CACHES — applied to all three Caffeine caches in `GoogleMapsService`
- `02-security.md` § Never Leak Upstream Error Text — enforced via `mapUpstreamHttpError` chokepoint and the `noLeakOfUpstreamErrorText` test
- `03-backend-standards.md` § Proxy subpackage convention — places maps service under `com.example.worshiproom.proxy.maps`
- `07-logging-monitoring.md` § PII handling — controllers log counts and coordinates only, never `keyword`, `query`, or `name`
- `07-logging-monitoring.md` § Framework Log Suppression — already active in `application-dev.properties` from Spec 2's D7; covers the new `PlacesSearchRequest` body deserialization automatically

---

## Architecture Context

Reconnaissance confirmed the following concrete facts, which the plan depends on:

**Backend base package and proxy subpackage layout** (from `backend/src/main/java/com/example/worshiproom/`):

```
com.example.worshiproom/
├── WorshipRoomApplication.java
├── config/
│   ├── CorsConfig.java
│   └── ProxyConfig.java           (GoogleMapsProperties already present, reading from proxy.google-maps.api-key)
├── controller/
│   └── ApiController.java         (currently returns FLAT providers.googleMaps: boolean)
└── proxy/
    ├── common/                    (ProxyResponse, ProxyError, ProxyException, UpstreamException, UpstreamTimeoutException, ProxyExceptionHandler, RequestIdFilter, RateLimitFilter, IpResolver, SafetyBlockException, RateLimitExceededException, RateLimitExceptionHandler)
    └── ai/                        (Spec 2 — GeminiController, GeminiService, GeminiPrompts, ExplainRequest, ReflectRequest, GeminiResponseDto)
```

The new `com.example.worshiproom.proxy.maps` package sits alongside `proxy.ai` and is automatically covered by `ProxyExceptionHandler`'s `basePackages = "com.example.worshiproom.proxy"` scope.

**Note on package name:** `03-backend-standards.md` recommends `proxy.places` for Maps; the spec explicitly says `proxy.maps`. Plan follows the spec per "spec is the feature authority." The OpenAPI tag `Proxy / Places` (set by Spec 1) is unchanged.

**Existing infrastructure Spec 3 reuses unchanged:**

- `ProxyResponse.of(data, requestId)` — success envelope
- `ProxyError.of(code, message, requestId)` — error envelope
- `UpstreamException` (502 UPSTREAM_ERROR) and `UpstreamTimeoutException` (504 UPSTREAM_TIMEOUT)
- `RequestIdFilter` — sets `X-Request-Id` header + MDC
- `RateLimitFilter` — scoped to `/api/v1/proxy/**` (so all three new endpoints rate-limit automatically with no filter change)
- `CorsConfig` — all `/api/v1/proxy/**` paths covered; `X-Request-Id, X-RateLimit-*, Retry-After` already in `exposedHeaders`
- `WebClient` bean at `ProxyConfig.proxyWebClient()` — injected into `GoogleMapsService`
- `proxy.google-maps.api-key` property wired to `GOOGLE_MAPS_API_KEY` env var via `application.properties`

**Known gap Spec 3 must close:** `ProxyExceptionHandler` today handles `MethodArgumentNotValidException` (for `@Valid @RequestBody`) but NOT `ConstraintViolationException`, which is what `@Validated` + `@RequestParam @NotBlank/@Size/@Pattern` validation raises. Without a new handler, validation failures on `/geocode?query=` and `/place-photo?name=` would fall through to the `Throwable` catch-all and return 500 INTERNAL_ERROR instead of 400 INVALID_INPUT. Step 1 adds this handler. (The spec's acceptance criteria require 400 for these cases.)

**Known shape mismatch Spec 3 must close:** `ApiController.health()` currently returns `providers: { gemini: boolean, googleMaps: boolean, fcbh: boolean }` (flat). The spec's frontend readiness probe reads `data?.providers?.googleMaps?.configured`, which requires the nested shape `providers: { gemini: { configured: boolean }, googleMaps: { configured: boolean }, fcbh: { configured: boolean } }`. Step 2 migrates to the nested shape and updates the existing `ApiControllerTest` expectations + `openapi.yaml` Health schema.

**Gemini service pattern that GoogleMapsService mirrors** (from `GeminiService.java`):

- Constructor-injected `ProxyConfig` + `proxyWebClient` bean
- Public API methods (`search`, `geocode`, `fetchPhoto`) do the error mapping
- Package-private test seams (`callPlacesSearch`, `callGeocode`, `callPlacePhoto`) are thin WebClient wrappers — D2b pattern from Spec 2 for `Mockito.spy() + doReturn()` without the WebClient fluent-builder mocking tax
- Upstream HTTP errors funnel through a single `mapUpstreamHttpError` chokepoint that returns a user-safe generic message and preserves the original exception as `cause` for server-side logs only

**Existing test patterns this plan matches:**

- `ApiControllerTest`: `@WebMvcTest` + `@TestConfiguration @EnableConfigurationProperties(ProxyConfig.class)` + `@TestPropertySource` for property binding. Reuse for `MapsControllerTest`.
- `GeminiServiceTest`: `spy(new GeminiService(config))` + `doReturn(response).when(service).callModels(...)`. Reuse for `GoogleMapsServiceTest`.
- `GeminiControllerTest`: `@WebMvcTest(GeminiController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})` + `@MockBean GeminiService`. Reuse for `MapsControllerTest`.
- `GeminiIntegrationTest`: `@SpringBootTest @AutoConfigureMockMvc @MockBean GeminiService`. Reuse for `MapsIntegrationTest`, with `@MockBean GoogleMapsService` (simpler than mocking `WebClient` at the bean level — the filter chain still runs end-to-end, which is what the integration test is asserting).

**Frontend patterns to match:**

- `frontend/src/services/geocode-cache.ts` — LRU, untouched by this spec
- `frontend/src/services/local-support-service.ts` — factory, becomes async
- `frontend/src/services/google-local-support-service.ts` — fully rewritten (no direct Google API calls remain)
- `frontend/src/services/google-places-mapper.ts` — only `buildPhotoUrl` signature changes; denomination/specialty inference untouched
- `frontend/src/components/local-support/LocalSupportPage.tsx` — single caller of `createLocalSupportService()`. Needs to await the async factory.

**Caffeine availability:** `backend/pom.xml` already has `com.github.ben-manes.caffeine:caffeine` as a direct dependency (introduced for the rate-limit bucket map in Spec 1). No new dependencies for this spec. Spec 1 also added `spring-boot-starter-webflux` (WebClient) and `spring-boot-starter-validation`. Spec 3 uses only what's already present.

---

## Database Changes

None. This spec does not touch the database.

---

## API Changes

Three new endpoints under `/api/v1/proxy/maps/`, one shape change on `/api/v1/health`.

| Method | Endpoint | Auth | Rate Limit | Request Body | Response |
|--------|----------|------|-----------|-------------|----------|
| POST | `/api/v1/proxy/maps/places-search` | None (inherits proxy filter) | Inherited: 120/min dev, 60/min prod per IP | `PlacesSearchRequest { lat, lng, radiusMiles, keyword, pageToken? }` | `ProxyResponse<PlacesSearchResponse { places: List<Map>, nextPageToken: string? }>` |
| GET | `/api/v1/proxy/maps/geocode?query=...` | None | Same | — | `ProxyResponse<GeocodeResponse { lat: Double?, lng: Double? }>` |
| GET | `/api/v1/proxy/maps/place-photo?name=...` | None | Same | — | `image/*` bytes with `Cache-Control: public, max-age=86400, immutable` |
| GET | `/api/v1/health` (modified) | None | Not rate-limited (outside `/api/v1/proxy/**`) | — | `{ status, providers: { gemini: { configured }, googleMaps: { configured }, fcbh: { configured } } }` (nested, shape change) |

Error responses for all three proxy endpoints follow the standard `ProxyError` shape. Binary success for `place-photo` distinguished from JSON error by `Content-Type`.

---

## Assumptions & Pre-Execution Checklist

- [ ] Current branch: `claude/feature/ai-proxy-maps`. Verified via `git branch --show-current`.
- [ ] `git log main --oneline -5` shows both the Spec 1 foundation merge and Spec 2 Gemini merge.
- [ ] `git status` clean (no uncommitted changes).
- [ ] Docker Desktop running.
- [ ] `backend/.env.local` has `GOOGLE_MAPS_API_KEY=AIza...` populated with a **backend-only** Maps key (Application restrictions: None; API restrictions: Places API (New) + Geocoding API both enabled). The current frontend key (`VITE_GOOGLE_MAPS_API_KEY`, HTTP-referer-restricted) will NOT work for server-to-server calls — that was Spec 2's D6 pattern and Spec 3's pre-execution checklist says to provision a fresh server key. If Eric hasn't done this, surface before starting Step 6 (the first step that exercises an actual upstream call via the smoke test in Step 7).
- [ ] `cd backend && ./mvnw test` passes cleanly on the current branch baseline (no pre-existing failures).
- [ ] `cd frontend && npm test -- --run` passes cleanly.
- [ ] `cd frontend && npm run build` succeeds.
- [ ] Baseline bundle key leak count: `grep -r 'AIzaSyB32xNSMGT7NJiITWAyTsUF89IQEsyWNOg' frontend/dist/assets/*.js 2>/dev/null | wc -l` reports `1` pre-migration (the current Maps key). Post-migration this must report `0`.
- [ ] Assumption — package naming: plan uses `com.example.worshiproom.proxy.maps` per the spec's explicit file paths. This deviates from `03-backend-standards.md`'s recommendation of `proxy.places` but matches the spec verbatim. Spec is the feature authority. If Eric prefers `proxy.places`, flag at review time and CC will adjust all file paths and imports consistently.
- [ ] Assumption — shape change on `/api/v1/health`: plan migrates all three providers (gemini, googleMaps, fcbh) to the nested `{ configured: boolean }` shape simultaneously. No frontend reads from `providers.gemini` or `providers.fcbh` today, so the migration is a breaking change without a consumer — safe to do all at once rather than leaving two providers flat and one nested.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `ConstraintViolationException` handler | Add to existing `ProxyExceptionHandler` (not a new class) | The handler class is already the correct home for validation exceptions; adding a second handler class would split the concern. Mapping stays identical to `MethodArgumentNotValidException`: first violation → 400 INVALID_INPUT with human-readable message. |
| Health-endpoint shape migration scope | Migrate all three providers (gemini, googleMaps, fcbh) to nested shape in one step | Frontend today reads from `providers.googleMaps.configured` (this spec) but never from `providers.gemini` or `providers.fcbh`. No consumer to break. Leaving two providers flat and one nested is inconsistent. |
| `MapsIntegrationTest` upstream mocking strategy | `@MockBean GoogleMapsService` in the integration test | Spec text suggests "mock WebClient at the bean level" but the existing `GeminiIntegrationTest` precedent uses `@MockBean GeminiService` and that pattern is the documented Spec 2 convention. WebClient-bean mocking is strictly more brittle (fluent-builder mocking tax) without buying additional coverage — the RequestIdFilter, RateLimitFilter, CORS, and advice chain all still run end-to-end with the service mocked. Matches Spec 2 pattern verbatim. |
| Frontend package manager | `npm` | Spec's pre-execution checklist and acceptance criteria use `npm` commands. The frontend tooling is npm-compatible. CC follows the spec's exact commands rather than substituting `pnpm`. |
| Photo response `Content-Type` on cache hit | Always `image/jpeg` (the `fetchPhoto` return type the service declares on cache hit) | Spec acknowledges the cache layer stores only bytes, not the original `Content-Type`. Places API photos are overwhelmingly JPEG; returning JPEG on cache hit is acceptable given the cache is a performance optimization and the browser will tolerate mislabelled JPEG content. An alternative (caching `{bytes, contentType}` as a struct) adds complexity for negligible benefit. |
| Photo URL `maxWidthPx` | Hardcoded `400` in `PHOTO_URL_TEMPLATE` (matching current frontend) | Spec's example code uses `maxWidthPx=400`; current frontend mapper uses `buildPhotoUrl(photoName, apiKey, maxWidthPx = 400)`. Keep the default. Configurable per-request width is out of scope. |
| LocalSupportPage async factory migration | Initialize the service once in a `useEffect` on mount, store in a `useState` ref | The factory is async after this spec. Components should call it inside an effect, hold the resolved service in state, and render a brief loading state until the service is ready. Spec's guidance: "If any caller is in a synchronous render path, refactor to a `useState`-cached service ref initialized inside an effect." |
| `googleMaps.api-key` null safety in service | Check `proxyConfig.getGoogleMaps().isConfigured()` at the top of each public method | Mirrors `GeminiService.generate()`'s null-client guard pattern. Throws `UpstreamException("Maps service is not configured on the server.")` before any WebClient call attempt. Matches acceptance criterion `fullLifecycle_unconfiguredKeyReturns502`. |

---

## Implementation Steps

### Step 1: Add `ConstraintViolationException` handler to `ProxyExceptionHandler`

**Objective:** Enable `@RequestParam` Bean Validation failures (missing `query`, oversized `name`, SSRF-guard regex failure) to return 400 INVALID_INPUT with the standard `ProxyError` shape instead of 500 INTERNAL_ERROR.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyExceptionHandler.java` — add one `@ExceptionHandler(ConstraintViolationException.class)` method
- `backend/src/test/java/com/example/worshiproom/proxy/common/ProxyExceptionHandlerTest.java` — add one test verifying the new handler emits 400 INVALID_INPUT with a sensible message

**Details:**

Add a new method inside `ProxyExceptionHandler`:

```java
@ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
public ResponseEntity<ProxyError> handleConstraintViolation(
        jakarta.validation.ConstraintViolationException ex) {
    var requestId = MDC.get("requestId");
    var firstViolation = ex.getConstraintViolations().stream()
        .findFirst()
        .map(v -> {
            // Path form is like "endpoint.paramName" — extract the leaf
            String path = v.getPropertyPath().toString();
            String leaf = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
            return leaf + ": " + v.getMessage();
        })
        .orElse("Invalid input");
    log.info("Constraint violation: {}", firstViolation);
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(ProxyError.of("INVALID_INPUT", firstViolation, requestId));
}
```

Import `jakarta.validation.ConstraintViolationException` at the top.

Test addition: extend `ProxyExceptionHandlerTest` with a minimal test controller method that uses `@Validated` + `@RequestParam @NotBlank`, hit it without the param, assert 400 + `INVALID_INPUT` code. If the existing test file doesn't already spin up a test controller, add a nested `@Validated` test controller class within the test.

**Guardrails (DO NOT):**

- Do NOT change the scope of `ProxyExceptionHandler` (`basePackages = "com.example.worshiproom.proxy"` stays). ConstraintViolationException from proxy controllers flows through the same scoped advice.
- Do NOT use `org.hibernate.validator.*` types. The API is `jakarta.validation.*`.
- Do NOT include the full property path in the message (e.g., `placesSearch.request.name: ...`) — extract the leaf for a cleaner user-facing message.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] `ProxyExceptionHandlerTest` passes: `./mvnw test -Dtest=ProxyExceptionHandlerTest`
- [ ] Full test suite still green: `./mvnw test`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `constraintViolation_returns400WithInvalidInput` | Unit / slice | Test that a missing `@RequestParam @NotBlank` yields HTTP 400 + `{code: "INVALID_INPUT", message: contains param name}` |

**Expected state after completion:**

- [ ] `ProxyExceptionHandler` has four `@ExceptionHandler` methods (ProxyException, MethodArgumentNotValidException, ConstraintViolationException, Throwable)
- [ ] New test passes in isolation and in the full suite

---

### Step 2: Migrate `/api/v1/health` to nested provider shape

**Objective:** Change the health endpoint response from flat `providers: { gemini: bool, googleMaps: bool, fcbh: bool }` to nested `providers: { gemini: { configured: bool }, googleMaps: { configured: bool }, fcbh: { configured: bool } }` so Spec 3's frontend readiness probe (`data?.providers?.googleMaps?.configured`) reads correctly. Update the existing test and OpenAPI schema together.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/controller/ApiController.java` — change `buildHealth()` to emit nested objects
- `backend/src/test/java/com/example/worshiproom/controller/ApiControllerTest.java` — update the three `jsonPath` assertions to the nested path
- `backend/src/main/resources/openapi.yaml` — update the `/api/v1/health` 200 response schema to the nested shape

**Details:**

Replace `ApiController.buildHealth()` body with:

```java
private Map<String, Object> buildHealth() {
    var providers = new LinkedHashMap<String, Object>();
    providers.put("gemini", Map.of("configured", config.getGemini().isConfigured()));
    providers.put("googleMaps", Map.of("configured", config.getGoogleMaps().isConfigured()));
    providers.put("fcbh", Map.of("configured", config.getFcbh().isConfigured()));

    var result = new LinkedHashMap<String, Object>();
    result.put("status", "ok");
    result.put("providers", providers);
    return result;
}
```

Update `ApiControllerTest.healthReturnsProviderStatuses()`:

- `$.providers.gemini` → `$.providers.gemini.configured`
- `$.providers.googleMaps` → `$.providers.googleMaps.configured`
- `$.providers.fcbh` → `$.providers.fcbh.configured`

Update `openapi.yaml` `/api/v1/health` response schema to nested shape:

```yaml
providers:
  type: object
  required: [gemini, googleMaps, fcbh]
  properties:
    gemini:
      type: object
      required: [configured]
      properties:
        configured: { type: boolean }
    googleMaps:
      type: object
      required: [configured]
      properties:
        configured: { type: boolean }
    fcbh:
      type: object
      required: [configured]
      properties:
        configured: { type: boolean }
```

**Guardrails (DO NOT):**

- Do NOT leave any provider in the flat shape — all three migrate simultaneously.
- Do NOT drop the legacy `/api/health` alias; it also uses `buildHealth()` and gets the nested shape automatically.
- Do NOT introduce a new DTO type for the provider entry — `Map.of("configured", boolean)` is simpler and matches the `buildHealth()` style.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] `ApiControllerTest` passes with new assertions: `./mvnw test -Dtest=ApiControllerTest`
- [ ] Manual curl against running dev server (Step 7 will cover this with Docker Compose up): response shape matches nested

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `healthReturnsProviderStatuses` (updated) | Slice | Asserts `$.providers.{gemini,googleMaps,fcbh}.configured` are boolean |
| `legacyHealthReturnsSameShape` (unchanged) | Slice | Asserts `$.status` is `"ok"` — nested shape propagates via shared `buildHealth()` |

**Expected state after completion:**

- [ ] `ApiController.buildHealth()` returns nested objects
- [ ] `ApiControllerTest` green
- [ ] OpenAPI Health schema matches runtime shape

---

### Step 3: Create maps-package DTOs and cache-key helper

**Objective:** Create the three DTO records and the cache-key helper. Pure data structures with Bean Validation constraints — no service logic yet.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/maps/PlacesSearchRequest.java` — record with Bean Validation (`@NotNull`, `@DecimalMin/Max`, `@Min/Max`, `@NotBlank`, `@Size`)
- `backend/src/main/java/com/example/worshiproom/proxy/maps/PlacesSearchResponse.java` — record `{List<Map<String,Object>> places, String nextPageToken}`
- `backend/src/main/java/com/example/worshiproom/proxy/maps/GeocodeResponse.java` — record `{Double lat, Double lng}` with a `NO_RESULT` constant for the null-pair case
- `backend/src/main/java/com/example/worshiproom/proxy/maps/MapsCacheKeys.java` — package-private static helper class with `searchKey`, `geocodeKey`, `photoKey`
- `backend/src/test/java/com/example/worshiproom/proxy/maps/MapsCacheKeysTest.java` — unit tests for key normalization

**Details:**

Copy the DTO code verbatim from the spec's `Backend file specifications` section:

- `PlacesSearchRequest` — the five validated fields (lat, lng, radiusMiles, keyword, pageToken)
- `PlacesSearchResponse` — the two fields (places, nextPageToken)
- `GeocodeResponse` — the two nullable fields plus `public static final GeocodeResponse NO_RESULT = new GeocodeResponse(null, null);`

`MapsCacheKeys` is package-private (no `public` modifier), with three static methods, using `Locale.ROOT` on all lowercasing to avoid Turkish-i bugs (this is in the spec verbatim).

`MapsCacheKeysTest` mirrors the six tests from the spec:

1. `searchKey_normalizesKeywordCase` — "CHURCH" and "church" → same key
2. `searchKey_normalizesKeywordWhitespace` — leading/trailing whitespace normalized
3. `searchKey_includesPageTokenWhenPresent` — distinct tokens produce distinct keys
4. `searchKey_omitsPageTokenWhenNullOrEmpty` — null and "" behave identically
5. `geocodeKey_normalizesQueryCaseAndWhitespace` — case + whitespace normalized
6. `photoKey_returnsNameUnchanged` — photo names are stable opaque IDs

**Guardrails (DO NOT):**

- Do NOT make `MapsCacheKeys` public. It's an implementation detail of `GoogleMapsService`.
- Do NOT add any locale-sensitive method calls without `Locale.ROOT`.
- Do NOT replace `List<Map<String, Object>>` with a strongly-typed DTO for places — the spec explicitly calls this out as intentional pass-through so the frontend mapper keeps working.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Cache-key tests pass: `./mvnw test -Dtest=MapsCacheKeysTest`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `searchKey_normalizesKeywordCase` | Unit | "CHURCH"/"church" → same key |
| `searchKey_normalizesKeywordWhitespace` | Unit | Whitespace trimmed |
| `searchKey_includesPageTokenWhenPresent` | Unit | Distinct pageTokens → distinct keys |
| `searchKey_omitsPageTokenWhenNullOrEmpty` | Unit | null/"" equivalent |
| `geocodeKey_normalizesQueryCaseAndWhitespace` | Unit | Case + whitespace normalized |
| `photoKey_returnsNameUnchanged` | Unit | Opaque ID passes through |

**Expected state after completion:**

- [ ] Four new files in `proxy/maps/` (three DTOs + cache keys class)
- [ ] One new test file passes (6 tests)

---

### Step 4: Create `GoogleMapsService` + unit tests

**Objective:** Implement the service that wraps WebClient calls to Places API, Geocoding API, and the photo media endpoint. Maps HTTP/timeout/network errors to typed `ProxyException` subclasses. Hosts the three Caffeine caches. Tests cover every error branch, cache hit/miss, SSRF guard, and the no-leak invariant.

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/maps/GoogleMapsService.java` — full service (~250 lines) per spec
- `backend/src/test/java/com/example/worshiproom/proxy/maps/GoogleMapsServiceTest.java` — ~22 unit tests with `Mockito.spy()` + `doReturn()` on the package-private `callPlacesSearch/callGeocode/callPlacePhoto` seams

**Details:**

Copy the `GoogleMapsService` body verbatim from the spec's `Backend file specifications` section. Structure:

1. Logger, URL constants (`PLACES_TEXT_SEARCH_URL`, `GEOCODE_URL`, `PHOTO_URL_TEMPLATE`), `PHOTO_NAME_PATTERN` regex, `UPSTREAM_TIMEOUT = Duration.ofSeconds(10)`, `REQUESTED_FIELDS` string
2. Constructor injects `ProxyConfig` + `WebClient proxyWebClient`; logs a warn if key is not configured (mirrors `GeminiService.initClient()` pattern)
3. Three Caffeine caches declared inline as final fields:
   - `placesSearchCache`: `Caffeine.newBuilder().maximumSize(1000).expireAfterWrite(Duration.ofHours(6)).build()`
   - `geocodeCache`: `maximumSize(500).expireAfterWrite(Duration.ofDays(30))`
   - `photoCache`: `maximumSize(500).expireAfterWrite(Duration.ofDays(7))`
4. Three public methods: `search(PlacesSearchRequest)`, `geocode(String)`, `fetchPhoto(String)`
5. One public `isConfigured()` method (used by `ApiController` since Step 2 already reads directly from `ProxyConfig`; `isConfigured()` is spec-required but currently only the internal caller touches it — keep for future composability)
6. Three package-private test seams: `callPlacesSearch`, `callGeocode`, `callPlacePhoto` (thin WebClient passthroughs)
7. Private helpers: `buildSearchBody(PlacesSearchRequest)`, `mapUpstreamHttpError(String, WebClientResponseException)`, `isTimeout(Throwable)` (walks cause chain)
8. Public nested record `PhotoBytes(byte[] bytes, MediaType contentType)` used as the return type of `fetchPhoto`

Every public method begins with `if (!proxyConfig.getGoogleMaps().isConfigured()) throw new UpstreamException("Maps service is not configured on the server.");` — mirrors Gemini's null-client guard.

`fetchPhoto` additionally validates `PHOTO_NAME_PATTERN` before any upstream call (SSRF guard, defense-in-depth after the controller's `@Pattern` check).

`mapUpstreamHttpError` is the single chokepoint for HTTP errors; it returns `new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex)` — the generic message is the only thing the client sees; `ex` is preserved as cause for server-side logs.

Test file follows `GeminiServiceTest` exactly in structure:

- `@BeforeEach` sets up `ProxyConfig` with `setApiKey("fake-test-key")` and `service = spy(new GoogleMapsService(config, webClientMock))`
- `doReturn(mockedResponse).when(service).callPlacesSearch(any())` stubs the upstream boundary
- Each test asserts on the typed exception + message invariants

Test list (22 total, verbatim from spec):

**Search (8 tests):** happyPath, emptyResults, cacheHit, cacheMissDifferentKeyword, pageTokenChangesCacheKey, 4xxError, 5xxError, timeout.

**Geocode (6 tests):** happyPath, zeroResults, emptyResults, overQueryLimit, cacheHit, negativeResultIsCached.

**Photo (6 tests):** happyPath, invalidName (../etc/passwd), protocolInjection (https://evil.com/x), extraSlash (places/x/photos/y/extra), cacheHit, emptyBody.

**Configuration boundary (2 tests):** unconfiguredKey → UpstreamException, noLeakOfUpstreamErrorText (asserts `AIza`, `google`, `places.googleapis`, `key=` never appear in thrown message across all error paths).

**Guardrails (DO NOT):**

- Do NOT add Spring `@Cacheable` annotations. The caches are manual Caffeine instances held as fields. Annotation-based caching would require `@EnableCaching` config and hides the bounded-cache discipline from code review.
- Do NOT change the cache bounds. `1000 / 500 / 500` × `6h / 30d / 7d` are the spec's explicit numbers. A future spec may re-tune these; this one must not.
- Do NOT include `ex.getMessage()` or `ex.getResponseBodyAsString()` in the thrown `UpstreamException`'s message. That breaks the `noLeakOfUpstreamErrorText` invariant.
- Do NOT call the public methods from within themselves (no recursion); the tests spy on the package-private seams, not the public methods.
- Do NOT use `System.out`/`System.err` or `printStackTrace()`. Use SLF4J.
- Do NOT swallow exceptions silently. Every catch branch either maps to a typed `ProxyException` or rethrows.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Service unit tests pass: `./mvnw test -Dtest=GoogleMapsServiceTest`
- [ ] Full test suite still green: `./mvnw test`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Search × 8 | Unit | Happy path + empty + cache hit/miss + page token + 4xx/5xx/timeout |
| Geocode × 6 | Unit | Happy + zero_results + empty + over_query_limit + cache hit + negative cache |
| Photo × 6 | Unit | Happy + 3× SSRF rejects + cache hit + empty body |
| Configuration × 2 | Unit | Null client throws + no-leak invariant across all error paths |

**Expected state after completion:**

- [ ] `GoogleMapsService.java` present with all three public methods + three package-private seams + three Caffeine caches
- [ ] 22 unit tests passing

---

### Step 5: Create `MapsController` + slice tests

**Objective:** Wire the three endpoints and map request/response envelopes. Enforce `@Validated` + Bean Validation on request bodies and query params. Return binary image bytes directly from `/place-photo` (NOT wrapped in `ProxyResponse`).

**Files to create/modify:**

- `backend/src/main/java/com/example/worshiproom/proxy/maps/MapsController.java` — three endpoints
- `backend/src/test/java/com/example/worshiproom/proxy/maps/MapsControllerTest.java` — ~13 slice tests with `@MockBean GoogleMapsService`

**Details:**

Copy the `MapsController` body verbatim from the spec's `Backend file specifications` section:

- Class-level `@RestController`, `@RequestMapping("/api/v1/proxy/maps")`, `@Validated` (the `@Validated` enables method-level constraints on `@RequestParam`)
- Constructor injects `GoogleMapsService`
- `POST /places-search`: `@Valid @RequestBody PlacesSearchRequest` → `ProxyResponse<PlacesSearchResponse>` with `MDC.get("requestId")`. Log line: `Places search received lat={} lng={} radiusMiles={} keywordLength={} hasPageToken={}` — NO `keyword` content, only length.
- `GET /geocode`: `@RequestParam @NotBlank @Size(min=1, max=200) String query`. Log: `Geocode received queryLength={}` — NO `query` content, only length.
- `GET /place-photo`: `@RequestParam @NotBlank @Pattern(regexp="^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$") String name` → `ResponseEntity<byte[]>` with headers `Content-Type: photo.contentType()`, `Cache-Control: public, max-age=86400, immutable`. Log: `Place photo received nameLength={}` — NO `name` content.

Test file follows `GeminiControllerTest`:

- `@WebMvcTest(MapsController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})`
- `@MockBean private GoogleMapsService service`
- Use `ObjectMapper` to build request bodies

Test list (13, verbatim from spec):

**Places search (5):** happyPath, missingLat, invalidLatRange (lat=100), invalidRadius (radiusMiles=51), serviceThrowsUpstream.

**Geocode (3):** happyPath, missingQuery, emptyResult (nulls in body).

**Place photo (5):** happyPath (bytes + correct headers), invalidNameFormat (../etc/passwd), missingName, serviceThrowsUpstream (JSON error body NOT bytes), xRequestIdHeaderPresent.

**Guardrails (DO NOT):**

- Do NOT log `req.keyword()`, `query`, or `name` content. Numeric length only. Coordinates are OK to log (per `07-logging-monitoring.md` they're not PII at this granularity).
- Do NOT wrap `/place-photo` success in `ProxyResponse`. Error responses ARE wrapped (the advice chain handles that automatically); success is raw bytes.
- Do NOT set `X-Request-Id` manually on the photo response. `RequestIdFilter` sets it globally.
- Do NOT use `@Valid` on `@RequestParam` — use `@Validated` on the class and `@NotBlank`/`@Size`/`@Pattern` directly on the parameter.
- Do NOT construct URLs inline inside the controller. Service owns URL construction.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Slice tests pass: `./mvnw test -Dtest=MapsControllerTest`
- [ ] Full suite green: `./mvnw test`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `placesSearch_happyPath_returns200WithBody` | Slice | Response shape `{data:{places,nextPageToken},meta:{requestId}}` |
| `placesSearch_missingLat_returns400` | Slice | INVALID_INPUT |
| `placesSearch_invalidLatRange_returns400` | Slice | INVALID_INPUT for lat=100 |
| `placesSearch_invalidRadius_returns400` | Slice | INVALID_INPUT for radiusMiles=51 |
| `placesSearch_serviceThrowsUpstream_returns502` | Slice | Upstream surfaces as 502 via handler |
| `geocode_happyPath_returns200WithCoords` | Slice | Coords in response |
| `geocode_missingQuery_returns400` | Slice | INVALID_INPUT (relies on Step 1's handler) |
| `geocode_emptyResult_returns200WithNulls` | Slice | `{data:{lat:null,lng:null}}` |
| `placePhoto_happyPath_returns200WithImageBytes` | Slice | Content-Type, Cache-Control, body length correct |
| `placePhoto_invalidNameFormat_returns400` | Slice | INVALID_INPUT JSON body, NOT bytes |
| `placePhoto_missingName_returns400` | Slice | INVALID_INPUT |
| `placePhoto_serviceThrowsUpstream_returns502JsonError` | Slice | JSON ProxyError, NOT bytes |
| `placePhoto_xRequestIdHeaderPresent` | Slice | Request ID header present |

**Expected state after completion:**

- [ ] `MapsController.java` present with three endpoints
- [ ] 13 slice tests passing

---

### Step 6: Integration test + OpenAPI updates

**Objective:** Lock in the end-to-end wire contract for all three endpoints under the real Spring filter chain (RequestIdFilter + RateLimitFilter + advice chain + CORS) with a `@MockBean GoogleMapsService`. Extend `openapi.yaml` with three new paths and three schemas.

**Files to create/modify:**

- `backend/src/test/java/com/example/worshiproom/proxy/maps/MapsIntegrationTest.java` — ~8 integration tests with `@SpringBootTest @AutoConfigureMockMvc @MockBean GoogleMapsService`
- `backend/src/main/resources/openapi.yaml` — three new path entries + three new schemas + verification that the Health schema change from Step 2 is committed

**Details:**

Integration test matches `GeminiIntegrationTest` pattern exactly. For each of the three endpoints, at minimum:

1. `fullLifecycle_placesSearch_returnsExpectedHeaders` — X-Request-Id, X-RateLimit-{Limit,Remaining,Reset} all present. Body has `data.places` array + `meta.requestId`.
2. `fullLifecycle_geocode_propagatesRequestId` — client-supplied `X-Request-Id` round-trips to response header + `meta.requestId` field.
3. `fullLifecycle_placePhoto_streamsBytesWithCorrectHeaders` — Content-Type image/jpeg, Cache-Control `public, max-age=86400, immutable`, body bytes match.
4. `fullLifecycle_invalidInput_returnsProxyErrorShape` — 400 with `{code, message, requestId, timestamp}` (ProxyError shape assertion).
5. `fullLifecycle_placesSearchUnconfiguredReturns502` — override `proxy.google-maps.api-key=""` via `@TestPropertySource`, mock service to throw `UpstreamException("Maps service is not configured on the server.")`, assert 502 UPSTREAM_ERROR with that generic message.
6. `fullLifecycle_noUpstreamErrorTextLeaks` — mock service to throw `new UpstreamException("Maps service is temporarily unavailable. Please try again.", new RuntimeException("GoogleSecretKeyABC"))`, assert response body does NOT contain `GoogleSecretKeyABC`.

The 429 rate-limit burst test and full CORS preflight assertion are covered by Spec 1's existing `RateLimitIntegrationTest` and CORS tests; don't duplicate them. If Eric wants explicit evidence for Maps specifically, add `fullLifecycle_rateLimitTriggers429` as an optional 7th test — but prefer keeping this integration test lean.

OpenAPI additions (copy verbatim from spec):

- Add three path entries under `paths:`: `/api/v1/proxy/maps/places-search`, `/api/v1/proxy/maps/geocode`, `/api/v1/proxy/maps/place-photo`
- Under `components.schemas`: add `PlacesSearchRequest`, `PlacesSearchResponse`, `GeocodeResponse`
- Reuse the existing shared responses (`BadRequest`, `RateLimited`, `UpstreamError`, `UpstreamTimeout`, `InternalError`) via `$ref`
- Reuse the `Proxy / Places` tag (already declared in Spec 1)

**Guardrails (DO NOT):**

- Do NOT mock `WebClient` at the bean level. `@MockBean GoogleMapsService` is simpler and matches Spec 2's precedent.
- Do NOT add a new shared response type for the binary photo success. OpenAPI has per-content-type schema support; use `image/jpeg`, `image/png`, `image/webp` schema entries under the 200 response as the spec shows.
- Do NOT add auth/security schemes to the new paths. Proxy endpoints are unauthenticated per Spec 1's decision; `security: []` is inherited from the operation-level declaration pattern (but the shared empty `security: []` on paths already handles this — just don't add `security:` fields).
- Do NOT forget the `X-Request-Id: test-request-id` header propagation test — it's a load-bearing invariant for the debugging workflow documented in `07-logging-monitoring.md`.

**Verification:**

- [ ] Code compiles: `cd backend && ./mvnw compile`
- [ ] Integration test passes: `./mvnw test -Dtest=MapsIntegrationTest`
- [ ] Full suite green: `./mvnw test`
- [ ] OpenAPI YAML is valid (optional): `npx -y @redocly/cli lint backend/src/main/resources/openapi.yaml`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `fullLifecycle_placesSearch_returnsExpectedHeaders` | Integration | Full headers + ProxyResponse body |
| `fullLifecycle_geocode_propagatesRequestId` | Integration | Client X-Request-Id round-trip |
| `fullLifecycle_placePhoto_streamsBytesWithCorrectHeaders` | Integration | Content-Type + Cache-Control + bytes |
| `fullLifecycle_invalidInput_returnsProxyErrorShape` | Integration | 400 with ProxyError shape |
| `fullLifecycle_placesSearchUnconfiguredReturns502` | Integration | UPSTREAM_ERROR when key empty |
| `fullLifecycle_noUpstreamErrorTextLeaks` | Integration | Cause exception text never in response |

**Expected state after completion:**

- [ ] `MapsIntegrationTest.java` present with 6+ tests passing
- [ ] `openapi.yaml` contains three new paths and schemas; Health schema uses nested shape
- [ ] Full backend test suite green

---

### Step 7: Backend end-to-end smoke via Docker Compose

**Objective:** Confirm the backend, running under `docker compose`, serves all three new endpoints correctly against real Google upstream. Catches misconfiguration (e.g., wrong key type, missing API restrictions, org-policy blocks) that unit/integration tests cannot.

**Files to create/modify:**

- None. This is a runtime smoke, not a code change.

**Details:**

1. Confirm `backend/.env.local` has `GOOGLE_MAPS_API_KEY=AIza...` — a **server key** (Application restrictions: None; API restrictions: Places API (New) + Geocoding API enabled). Per the spec's Pre-Execution Checklist, this is a different key than `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env.local`.
2. Bring backend up fresh: `docker compose up -d --force-recreate backend`
3. Watch logs for clean startup: `docker compose logs backend --tail 30 | grep -E 'Started WorshipRoomApplication|GOOGLE_MAPS_API_KEY is not configured'`. Pass condition: `Started WorshipRoomApplication` present AND no "not configured" warning.
4. Health endpoint smoke: `curl -s http://localhost:8080/api/v1/health | jq .providers.googleMaps.configured` → expect `true`.
5. Places search smoke:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/proxy/maps/places-search \
     -H 'Content-Type: application/json' \
     -d '{"lat":35.7501,"lng":-86.9303,"radiusMiles":10,"keyword":"non-denominational church","pageToken":null}' \
     | jq '{placeCount: (.data.places | length), hasToken: (.data.nextPageToken != null), requestId: .meta.requestId}'
   ```
   Expect: `placeCount > 0`, `requestId` a 22-char string.
6. Geocode smoke:
   ```bash
   curl -s 'http://localhost:8080/api/v1/proxy/maps/geocode?query=Spring+Hill+TN' \
     | jq '{lat: .data.lat, lng: .data.lng, requestId: .meta.requestId}'
   ```
   Expect: numeric lat/lng near 35.75, -86.93.
7. Photo smoke (depends on places-search response):
   - Extract a `photos[0].name` value from step 5
   - `curl -sI "http://localhost:8080/api/v1/proxy/maps/place-photo?name=<URL-encoded>" | head -10`
   - Expect: `HTTP/1.1 200`, `Content-Type: image/jpeg`, `Cache-Control: public, max-age=86400, immutable`
8. SSRF smoke: `curl -s 'http://localhost:8080/api/v1/proxy/maps/place-photo?name=../etc/passwd' | jq .code` → expect `"INVALID_INPUT"`.
9. PII-leak smoke: `docker compose logs backend 2>&1 | grep -E 'keyword=.+(church|counselor)|query=.+(hill|nashville)|name=places' | wc -l` → expect `0` (controller logs length, not content).
10. Rate-limit header smoke on a regular request:
    `curl -si http://localhost:8080/api/v1/proxy/maps/geocode?query=Nashville+TN | grep -E '^(X-RateLimit-|X-Request-Id|Retry-After)'` → expect all three `X-RateLimit-*` headers.

If any smoke fails, STOP and surface to Eric before continuing to the frontend. Per the spec's Pre-Execution Checklist, the most likely failure mode is a 403 REQUEST_DENIED from Google, which indicates either the key's API restrictions don't include the endpoint being called, or an org-policy block is hitting the server key.

**Guardrails (DO NOT):**

- Do NOT run smoke against production. `docker compose` is the local dev backend at `http://localhost:8080`.
- Do NOT commit `backend/.env.local`. It's gitignored already; do not write code that requires committing it.
- Do NOT cache the curl output. Every smoke runs fresh against the live backend.

**Verification:**

- [ ] `docker compose up -d` brings backend up with `Started WorshipRoomApplication` in logs and no unconfigured warning
- [ ] `/api/v1/health` reports `providers.googleMaps.configured: true`
- [ ] All four smoke curls (places-search, geocode, place-photo, SSRF) return expected shapes
- [ ] PII-leak grep returns 0
- [ ] Rate-limit + request-ID headers present on every response

**Expected state after completion:**

- [ ] Backend end-to-end works against real Google APIs via the proxy
- [ ] No PII in logs
- [ ] All response headers conform to `03-backend-standards.md`

---

### Step 8: Create frontend maps-readiness probe + test

**Objective:** One-time async health probe that the frontend factory uses to decide between Google and mock services. Caches the result, shares inflight requests to prevent thundering-herd.

**Files to create/modify:**

- `frontend/src/services/maps-readiness.ts` — new module per spec verbatim
- `frontend/src/services/__tests__/maps-readiness.test.ts` — 5 tests per spec

**Details:**

Copy the module body verbatim from the spec's `Frontend implementation` section:

- Module-level `cachedReadiness: boolean | undefined` and `inflightProbe: Promise<boolean> | undefined`
- `HEALTH_URL` built from `VITE_API_BASE_URL`
- `probe()` internal function that fetches and returns `Boolean(data?.providers?.googleMaps?.configured)`
- `getMapsReadiness()` exported — returns cached value if present, shares inflight promise, resolves to the probed boolean
- `__resetMapsReadinessForTests()` exported for Vitest cleanup — mirrors Spec 2's `__resetGeminiClientForTests` convention

Test list (5, verbatim from spec):

1. `getMapsReadiness_returnsTrueWhenHealthReportsConfigured` — fetch mock returns nested shape with `configured: true`
2. `getMapsReadiness_returnsFalseWhenHealthReportsNotConfigured` — `configured: false`
3. `getMapsReadiness_returnsFalseOnFetchError` — fetch rejects
4. `getMapsReadiness_cachesAfterFirstSuccess` — call twice, fetch fires once
5. `getMapsReadiness_concurrentCallsShareInflightProbe` — `Promise.all([getMapsReadiness(), getMapsReadiness()])` fires one fetch

Use `vi.mock('whatever')`, `vi.stubGlobal('fetch', ...)`, or `vi.spyOn(globalThis, 'fetch')` per the existing project convention. Check other service tests in `frontend/src/services/__tests__/` for the canonical pattern.

**Guardrails (DO NOT):**

- Do NOT import `@/lib/env` — the module reads `import.meta.env.VITE_API_BASE_URL` directly to avoid circular imports with lib/env.ts which is being cleaned up in Step 12.
- Do NOT retry on probe failure within a single session. The spec explicitly says "returns false on error (treat network failure as 'not ready' → fall back to mock)". Future sessions re-probe from scratch.
- Do NOT cache forever across sessions. Module-level state is reset on page refresh, which is intentional — the user might load the app right when the backend is deploying.

**Verification:**

- [ ] Frontend builds: `cd frontend && npm run build` (run after all frontend changes; skip here if it would fail due to missing `fetch` mocks in tests)
- [ ] Tests pass: `cd frontend && npm test -- --run maps-readiness`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getMapsReadiness_returnsTrueWhenHealthReportsConfigured` | Unit | Nested `configured: true` → true |
| `getMapsReadiness_returnsFalseWhenHealthReportsNotConfigured` | Unit | Nested `configured: false` → false |
| `getMapsReadiness_returnsFalseOnFetchError` | Unit | Rejected fetch → false |
| `getMapsReadiness_cachesAfterFirstSuccess` | Unit | Second call → no fetch |
| `getMapsReadiness_concurrentCallsShareInflightProbe` | Unit | `Promise.all` → one fetch |

**Expected state after completion:**

- [ ] `maps-readiness.ts` module present
- [ ] 5 tests passing

---

### Step 9: Modify `google-places-mapper.ts` — drop apiKey from buildPhotoUrl

**Objective:** `buildPhotoUrl` returns a backend-proxy URL instead of a Google URL. `mapGooglePlaceToLocalSupport` signature drops the `apiKey` parameter. Update the one existing test file.

**Files to create/modify:**

- `frontend/src/services/google-places-mapper.ts` — two signatures change, body swaps the URL template
- `frontend/src/services/__tests__/google-places-mapper.test.ts` — update `buildPhotoUrl` expectation and all `mapGooglePlaceToLocalSupport` call sites; if the file doesn't exist currently, check with Glob and add the test file

**Details:**

New `buildPhotoUrl`:

```typescript
const PROXY_PHOTO_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/maps/place-photo`

export function buildPhotoUrl(photoName: string): string {
  return `${PROXY_PHOTO_URL}?name=${encodeURIComponent(photoName)}`
}
```

Drop the `apiKey` and `maxWidthPx` parameters. `maxWidthPx` is now hardcoded server-side inside `GoogleMapsService` at `maxWidthPx=400` in `PHOTO_URL_TEMPLATE`. (If a future spec needs variable widths, extend the proxy signature then.)

New `mapGooglePlaceToLocalSupport`:

```typescript
export function mapGooglePlaceToLocalSupport(
  gp: GooglePlace,
  category: LocalSupportCategory,
): LocalSupportPlace | null {
  // body unchanged except the buildPhotoUrl call no longer passes apiKey
}
```

Change the one inner call site:

- `const photoUrl = gp.photos?.[0]?.name ? buildPhotoUrl(gp.photos[0].name, apiKey) : null`
- → `const photoUrl = gp.photos?.[0]?.name ? buildPhotoUrl(gp.photos[0].name) : null`

Update `google-places-mapper.test.ts` (check if present with Glob first; if missing, create it):

- `buildPhotoUrl` test now asserts backend-proxy URL shape: `expect(buildPhotoUrl('places/abc/photos/xyz')).toMatch(/\/api\/v1\/proxy\/maps\/place-photo\?name=places%2Fabc%2Fphotos%2Fxyz$/)`
- All `mapGooglePlaceToLocalSupport` call sites drop the third arg

**Guardrails (DO NOT):**

- Do NOT leave the `apiKey` parameter in the mapper or `buildPhotoUrl` signatures. Remove entirely — a lingering parameter would enable accidental client-side key usage.
- Do NOT change `inferDenomination` or `inferSpecialties` — those functions stay exactly as they are.
- Do NOT change the `GooglePlace` TypeScript interface. Backend returns the raw Google shape; the interface captures it verbatim.

**Verification:**

- [ ] TypeScript typechecks: `cd frontend && npx tsc --noEmit` (if available in project; otherwise `npm run build` at the end of the frontend steps catches it)
- [ ] Tests pass: `npm test -- --run google-places-mapper`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `buildPhotoUrl_returnsBackendProxyUrl` | Unit | Asserts backend-proxy URL with URL-encoded name |
| `mapGooglePlaceToLocalSupport_skipsClosedPlaces` (updated) | Unit | Call site drops apiKey arg; CLOSED_PERMANENTLY → null |
| (Existing denomination/specialty tests updated) | Unit | Call sites drop apiKey arg |

**Expected state after completion:**

- [ ] `buildPhotoUrl` signature is `(photoName: string) => string`
- [ ] `mapGooglePlaceToLocalSupport` signature is `(gp, category) => LocalSupportPlace | null`
- [ ] All callers updated
- [ ] Tests green

---

### Step 10: Rewrite `google-local-support-service.ts` to call the proxy

**Objective:** Replace direct Google API calls with `fetch` calls to the backend proxy. Preserve the `LocalSupportService` interface (`search(params, page)`, `geocode(query)`) exactly. Swap the existing tests for proxy-targeting mocks.

**Files to create/modify:**

- `frontend/src/services/google-local-support-service.ts` — complete rewrite per spec
- `frontend/src/services/__tests__/google-local-support-service.test.ts` — rewrite tests to mock `fetch` against `/api/v1/proxy/maps/*`

**Details:**

Copy the rewrite verbatim from the spec's `Frontend implementation > google-local-support-service.ts (rewritten)` section. Key points:

- `PROXY_BASE`, `PROXY_PLACES_SEARCH_URL`, `PROXY_GEOCODE_URL` constants from `VITE_API_BASE_URL`
- `REQUEST_TIMEOUT_MS = 15000` (backend has 10s; client gives 5s slack)
- Module-level `pageTokens: Map<string, string | null>` preserved (server returns nextPageToken per request; frontend still bucketizes by search params)
- `paramKey(params)` unchanged from current file
- `categoryFromKeyword(keyword)` unchanged
- `fetchWithTimeout` unchanged
- New `readBackendError(response)` helper that parses `{code, message, requestId}` envelope defensively
- `GoogleLocalSupportService.search` — fetches `POST /places-search` with JSON body, parses `{data: {places, nextPageToken}, meta: {requestId}}` envelope, calls `mapGooglePlaceToLocalSupport(gp, category)` WITHOUT apiKey, keeps distance filter (client-side hard cap on Google's soft locationBias)
- `GoogleLocalSupportService.geocode` — fetches `GET /geocode?query=...`, parses `{data: {lat, lng}}` envelope, writes to local `geocodeCache` including null (negative cache)
- `createGoogleService()` exported as synchronous factory (the factory `createLocalSupportService` in the next step is what becomes async)
- `__resetPageTokensForTests()` exported for Vitest cleanup

`REQUESTED_FIELDS` constant is REMOVED from this file — it lives inside `GoogleMapsService` on the backend now. Drop the full array.

`milesToMeters` is REMOVED — the backend does the conversion.

Test rewrite (~18 tests per spec):

Happy path (4): search body + URL, search returns mapped + filtered, paginate via token, geocode URL + encoded query.

Backend error mapping (5): search 400 / 429 / 502 / 504 / geocode 502 — each returns the user-safe message from the backend.

Cache behavior (3): client geocode cache, negative cache, different query → refetch.

Network errors (3): network error propagates, aborted signal, timeout triggers abort.

Pagination (3): second-page-without-first returns empty, resetTokens helper, distinct params → distinct tokens.

Use `vi.fn()` or `vi.stubGlobal('fetch', ...)` for fetch mocks. Each test verifies the URL, method, headers, and body shape of the fetch call. Assert response-shape parsing via the mocked JSON body.

**Guardrails (DO NOT):**

- Do NOT leave any `https://places.googleapis.com` or `https://maps.googleapis.com` string in the file. Grep for both before considering the step complete.
- Do NOT import `requireGoogleMapsApiKey` or any env-key helper. No API key in this file.
- Do NOT send `X-Goog-Api-Key` or `X-Goog-FieldMask` headers. Those are backend-only concerns now.
- Do NOT remove the distance filter. Google's `locationBias` is a soft preference; the spec explicitly preserves client-side enforcement of the user-chosen radius.
- Do NOT change the `LocalSupportService` interface. `search(params, page): Promise<SearchResult>` and `geocode(query): Promise<{lat, lng} | null>` have identical signatures to the current file.

**Verification:**

- [ ] Tests pass: `cd frontend && npm test -- --run google-local-support-service`
- [ ] Grep clean: `grep -rE 'places\.googleapis|maps\.googleapis\.com/maps/api/geocode' frontend/src/services/google-local-support-service.ts | wc -l` → 0
- [ ] Grep clean: `grep -E 'requireGoogleMapsApiKey|isGoogleMapsApiKeyConfigured' frontend/src/services/google-local-support-service.ts | wc -l` → 0

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `search_callsBackendProxyWithCorrectBody` | Unit | URL + method + body shape |
| `search_returnsMappedAndDistanceFilteredResults` | Unit | Radius filter applied |
| `search_paginatesViaPageToken` | Unit | Token round-trip |
| `geocode_callsBackendProxyWithEncodedQuery` | Unit | URL encoding |
| `search_400/429/502/504FromBackend` × 4 | Unit | Error message propagation |
| `geocode_502FromBackend` | Unit | Same shape as search |
| `geocode_clientCacheShortCircuits` | Unit | Second call → no fetch |
| `geocode_negativeResultIsCached` | Unit | null cached |
| `geocode_differentQueryHitsBackend` | Unit | Cache key correctness |
| `search_networkError` × 3 | Unit | Propagates, aborts, timeout |
| `search_pagination` × 3 | Unit | Page 1 without page 0 empty, reset helper, distinct tokens |

**Expected state after completion:**

- [ ] File no longer calls Google APIs directly
- [ ] All tests pass
- [ ] No imports of `env.ts` Maps helpers

---

### Step 11: Make `local-support-service.ts` async with readiness probe + update single caller

**Objective:** Change the factory to `Promise<LocalSupportService>` driven by `getMapsReadiness()`. Update `LocalSupportPage.tsx` (the only caller) to await the async factory inside `useEffect` with a brief loading state.

**Files to create/modify:**

- `frontend/src/services/local-support-service.ts` — async factory per spec
- `frontend/src/services/__tests__/local-support-service.test.ts` — rewrite to mock `getMapsReadiness` (or create if absent)
- `frontend/src/components/local-support/LocalSupportPage.tsx` — add `useEffect` that creates the service, store in `useState`, show loading state during probe

**Details:**

New `local-support-service.ts` (spec verbatim):

```typescript
import type { SearchParams, SearchResult } from '@/types/local-support'
import { getMapsReadiness } from './maps-readiness'
import { createMockService } from './mock-local-support-service'
import { createGoogleService } from './google-local-support-service'

export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

export async function createLocalSupportService(): Promise<LocalSupportService> {
  const ready = await getMapsReadiness()
  if (ready) {
    return createGoogleService()
  }
  return createMockService()
}
```

`LocalSupportPage.tsx` caller update — find existing `createLocalSupportService()` call. If it's called in a `useMemo` or directly in a render, refactor to:

```typescript
const [service, setService] = useState<LocalSupportService | null>(null)

useEffect(() => {
  let cancelled = false
  createLocalSupportService().then((s) => {
    if (!cancelled) setService(s)
  })
  return () => { cancelled = true }
}, [])

if (!service) {
  return <LocalSupportPageSkeleton /> // or an inline skeleton if one doesn't exist
}
```

Check what the current `LocalSupportPage.tsx` does before deciding on the skeleton — if it has its own loading state pattern, use that. The goal is a brief (typically sub-100ms) loading state during the health probe, then the same rendering as before.

Test file for `local-support-service.ts`:

1. `factory_returnsGoogleServiceWhenBackendReady` — `getMapsReadiness` mocked to resolve `true`
2. `factory_returnsMockServiceWhenBackendNotReady` — mocked to resolve `false`
3. `factory_returnsMockServiceOnReadinessProbeFailure` — mocked to reject
4. `factory_isAsync` — type-level assertion `Awaited<ReturnType<typeof createLocalSupportService>>` matches `LocalSupportService`

Use `vi.mock('./maps-readiness')` with a factory that returns the stubbed `getMapsReadiness`.

**Guardrails (DO NOT):**

- Do NOT leave the factory synchronous. Every caller must await.
- Do NOT call `createLocalSupportService()` at module level or outside of an effect — that would execute the health probe during render, which is forbidden.
- Do NOT import `isGoogleMapsApiKeyConfigured` or any key-presence helper. It no longer exists after Step 12.
- Do NOT add a retry loop in the factory. The readiness probe itself handles concurrent calls; retries belong in the probe if we ever want them, not in the factory.

**Verification:**

- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Tests pass: `npm test -- --run local-support-service`
- [ ] `/local-support/churches` loads without console errors against the Docker Compose backend (manual eyeball; full Playwright verification comes after Step 13)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `factory_returnsGoogleServiceWhenBackendReady` | Unit | Mocked readiness true → Google |
| `factory_returnsMockServiceWhenBackendNotReady` | Unit | Mocked false → Mock |
| `factory_returnsMockServiceOnReadinessProbeFailure` | Unit | Rejected probe → Mock |
| `factory_isAsync` | Type-check | Return type is `Promise<LocalSupportService>` |

**Expected state after completion:**

- [ ] Factory is async
- [ ] `LocalSupportPage.tsx` awaits it in `useEffect`
- [ ] All tests pass
- [ ] App loads `/local-support/*` routes with no regressions

---

### Step 12: Env cleanup — remove frontend Maps key and helpers

**Objective:** Fully decommission `VITE_GOOGLE_MAPS_API_KEY` and the three helpers from the frontend. This is the step that removes the actual security surface the spec exists to close.

**Files to create/modify:**

- `frontend/src/lib/env.ts` — delete `requireGoogleMapsApiKey`, `isGoogleMapsApiKeyConfigured`, and the `GOOGLE_MAPS_API_KEY` module-level constant
- `frontend/src/vite-env.d.ts` — remove `readonly VITE_GOOGLE_MAPS_API_KEY?: string` from `ImportMetaEnv`
- `frontend/.env.example` — remove the `VITE_GOOGLE_MAPS_API_KEY=` line/block with its comment

**Details:**

In `lib/env.ts`:

1. Read the current file to identify the exact lines defining `GOOGLE_MAPS_API_KEY`, `requireGoogleMapsApiKey`, `isGoogleMapsApiKeyConfigured`
2. Delete all three (the const declaration and both function declarations)
3. Leave the rest of the file — other env helpers (VAPID key, FCBH, API base URL) are unchanged. The leading comment block stays.

In `vite-env.d.ts`:

1. Read the file
2. Remove the `VITE_GOOGLE_MAPS_API_KEY` line from the `ImportMetaEnv` interface
3. Other vars (`VITE_API_BASE_URL`, `VITE_AUDIO_BASE_URL`, `VITE_VAPID_PUBLIC_KEY`, `VITE_FCBH_API_KEY`) remain

In `.env.example`:

1. Read the file
2. Remove the `VITE_GOOGLE_MAPS_API_KEY=` line and any associated comment block. Other example lines remain.

**Guardrails (DO NOT):**

- Do NOT delete `GOOGLE_MAPS_API_KEY` from `backend/.env.local` or `backend/application.properties`. The BACKEND key stays — that's the whole point. Only the FRONTEND key is decommissioned.
- Do NOT delete other env helpers from `lib/env.ts`. Only the three Maps ones.
- Do NOT leave a `// TODO: remove` comment where the deleted code was. Silent deletion.

**Verification:**

- [ ] Grep confirms zero hits in frontend source: `grep -rE 'VITE_GOOGLE_MAPS_API_KEY|requireGoogleMapsApiKey|isGoogleMapsApiKeyConfigured' frontend/src frontend/.env.example | wc -l` → 0
- [ ] TypeScript compiles: `cd frontend && npm run build` (should succeed — no callers remain after Steps 10–11)
- [ ] All tests pass: `cd frontend && npm test -- --run`

**Test specifications:**

None directly for this step. The removal is verified by global grep and by the build passing (which confirms no orphan imports).

**Expected state after completion:**

- [ ] Frontend source has zero references to the decommissioned symbols
- [ ] Build succeeds
- [ ] Tests green

---

### Step 13: Final end-to-end verification — bundle scan + manual smoke

**Objective:** Prove the spec's headline security claim: the production bundle contains zero Maps API key material, zero direct Google URLs, and all Maps network traffic flows through the backend proxy.

**Files to create/modify:**

- None. Verification only.

**Details:**

1. Rebuild the production bundle: `cd frontend && npm run build`
2. Bundle key-leak scan (the key is known to be in the current bundle — the specific key value should be pulled from `frontend/.env.local`'s `VITE_GOOGLE_MAPS_API_KEY`):
   - `grep -r "$(grep '^VITE_GOOGLE_MAPS_API_KEY=' frontend/.env.local 2>/dev/null | cut -d= -f2)" frontend/dist/assets/*.js 2>/dev/null | wc -l` → expect `0`
   - If `.env.local` no longer has the key (because Eric already removed it per the spec's operational checklist), fall back to generic scan: `grep -rE 'AIza[0-9A-Za-z_-]{35}' frontend/dist/assets/*.js | wc -l` → expect `0`
3. Google URL scan:
   - `grep -r 'places\.googleapis\.com' frontend/dist/assets/*.js | wc -l` → expect `0`
   - `grep -r 'maps\.googleapis\.com/maps/api/geocode' frontend/dist/assets/*.js | wc -l` → expect `0`
4. Env-var name scan:
   - `grep -r 'VITE_GOOGLE_MAPS_API_KEY' frontend/dist/assets/*.js | wc -l` → expect `0`
5. Manual Playwright smoke (optional; can also be done via `/verify-with-playwright` as documented in the spec):
   - Start the Vite preview: `npm run preview` (or `npm run dev` — preview is more production-realistic)
   - Navigate to `http://localhost:4173/local-support/churches` (or `:5173` for dev)
   - Open DevTools → Network tab
   - Type a location (e.g., "Spring Hill, TN") and search
   - Expected: ALL Maps-related network calls go to `http://localhost:8080/api/v1/proxy/maps/*`. Zero calls to `*.googleapis.com`.
   - Expected: rendered photos have `<img src>` pointing at `localhost:8080/api/v1/proxy/maps/place-photo?name=...` — no `key=AIza...` suffix.
6. Full frontend test suite: `cd frontend && npm test -- --run`
7. Full backend test suite: `cd backend && ./mvnw test`

**Guardrails (DO NOT):**

- Do NOT paste the actual Maps key value into this plan, commits, or logs. Fingerprint it (prefix + last 4 chars) if surfacing to Eric.
- Do NOT skip the network-tab eyeball. The bundle grep catches static URLs; the network-tab check catches any runtime URL construction that slipped through.

**Verification:**

- [ ] Bundle key count: 0
- [ ] Google URL count in bundle: 0
- [ ] `VITE_GOOGLE_MAPS_API_KEY` string count in bundle: 0
- [ ] Network tab: all Maps calls hit the proxy, none hit Google
- [ ] Photo URLs key-free
- [ ] Frontend tests green
- [ ] Backend tests green

**Test specifications:**

None. Verification by grep + manual network-tab observation.

**Expected state after completion:**

- [ ] The spec's headline claim holds: "viewing the production bundle in a browser and searching for `googleapis.com/v1/places`, `maps.googleapis.com/maps`, `VITE_GOOGLE_MAPS_API_KEY`, or any `AIza...` substring returns nothing"
- [ ] Local Support functions identically to pre-migration from the user's perspective

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `ConstraintViolationException` handler to `ProxyExceptionHandler` |
| 2 | — | Migrate `/api/v1/health` to nested provider shape + test + OpenAPI |
| 3 | — | DTOs (PlacesSearchRequest, PlacesSearchResponse, GeocodeResponse) + MapsCacheKeys + test |
| 4 | 3 | `GoogleMapsService` + unit tests |
| 5 | 1, 3, 4 | `MapsController` + slice tests (Step 1 for `@RequestParam` validation to produce 400) |
| 6 | 2, 4, 5 | Integration tests + remaining OpenAPI path additions |
| 7 | 1–6 | Backend Docker Compose end-to-end smoke |
| 8 | 2 | Frontend maps-readiness probe + test (reads nested health shape from Step 2) |
| 9 | — | `google-places-mapper.ts` `buildPhotoUrl` signature change + test |
| 10 | 9 | `google-local-support-service.ts` rewrite + test |
| 11 | 8, 10 | `local-support-service.ts` async factory + `LocalSupportPage.tsx` caller + test |
| 12 | 11 | Remove `VITE_GOOGLE_MAPS_API_KEY` + three helpers from `lib/env.ts`, `vite-env.d.ts`, `.env.example` |
| 13 | 1–12 | Bundle scan + manual network smoke + full test suites |

Backend steps (1–7) are independently verifiable before frontend begins. Frontend steps (8–13) require the backend to be deployed (or at least locally running) for Step 13's smoke.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add ConstraintViolationException handler | [COMPLETE] | 2026-04-21 | `ProxyExceptionHandler.java`, `ProxyExceptionHandlerTest.java`. Also added `HandlerMethodValidationException` and `MissingServletRequestParameterException` handlers during Step 5 — see Deviation 1. |
| 2 | Migrate /api/v1/health to nested shape | [COMPLETE] | 2026-04-21 | `ApiController.java`, `ApiControllerTest.java`, `openapi.yaml` Health schema. |
| 3 | Create maps-package DTOs and cache-key helper | [COMPLETE] | 2026-04-21 | `PlacesSearchRequest.java`, `PlacesSearchResponse.java`, `GeocodeResponse.java`, `MapsCacheKeys.java`, `MapsCacheKeysTest.java`. All 6 cache-key tests pass. |
| 4 | Create GoogleMapsService + unit tests | [COMPLETE] | 2026-04-21 | `GoogleMapsService.java`, `GoogleMapsServiceTest.java`. 22 tests pass. Added `catch (UpstreamException \| UpstreamTimeoutException)` in each method to preserve explicit exception types — see Deviation 2. |
| 5 | Create MapsController + slice tests | [COMPLETE] | 2026-04-21 | `MapsController.java`, `MapsControllerTest.java`. 13 slice tests pass. Discovered Spring 6.1+ uses `HandlerMethodValidationException` not `ConstraintViolationException` for `@RequestParam` validation — extended Step 1's handler class accordingly (Deviation 1). |
| 6 | Integration test + OpenAPI updates | [COMPLETE] | 2026-04-21 | `MapsIntegrationTest.java` (6 tests), three new paths + three new schemas in `openapi.yaml`. Full backend suite: 94 tests green. |
| 7 | Non-Docker backend smoke | [COMPLETE] | 2026-04-21 | Ran via `./mvnw spring-boot:run`. Caught and fixed Spec 1 WebClient buffer sizing (Deviation 3) and two-step Places photo fetch (Deviation 4) and Spring `DispatcherServlet`/`HttpLogging` GET-URL PII leak (Deviation 5). All smoke curls pass: health nested, places-search 20 results, geocode coords, photo streams JPEG 55KB, SSRF guard 400, PII scan 0 leaks, rate-limit + request-id headers present. |
| 8 | maps-readiness probe + test | [COMPLETE] | 2026-04-21 | `services/maps-readiness.ts` + `__tests__/maps-readiness.test.ts`. 5 tests pass. |
| 9 | google-places-mapper.ts signature change | [COMPLETE] | 2026-04-21 | Dropped `apiKey` from `buildPhotoUrl` + `mapGooglePlaceToLocalSupport`. Returns backend-proxy URL. 36 mapper tests pass (no googleapis.com, no AIza, no key= in URLs). |
| 10 | google-local-support-service.ts rewrite | [COMPLETE] | 2026-04-21 | Fetches from `/api/v1/proxy/maps/*`. 19 tests rewritten against fetch mocks. |
| 11 | Async factory + LocalSupportPage caller | [COMPLETE] | 2026-04-21 | `local-support-service.ts` now async; `LocalSupportPage.tsx` holds service in state via effect. New `__tests__/local-support-service.test.ts` with 3 tests. |
| 12 | Frontend env cleanup | [COMPLETE] | 2026-04-21 | Removed `requireGoogleMapsApiKey`, `isGoogleMapsApiKeyConfigured`, `GOOGLE_MAPS_API_KEY` constant from `lib/env.ts`; removed `VITE_GOOGLE_MAPS_API_KEY` from `vite-env.d.ts` and `.env.example`. Replaced with decommission comments. `pnpm build` succeeds. |
| 13 | Final bundle scan + smoke | [COMPLETE] | 2026-04-21 | Bundle scans all pass: 0 key matches, 0 `places.googleapis.com`, 0 `maps.googleapis.com/maps/api/geocode`, 0 `VITE_GOOGLE_MAPS_API_KEY`, backend-proxy URL present. Backend: 94 tests green. Frontend: 8762 pass / 11 fail (same 11 pre-existing baseline failures across 7 files — unchanged from pre-spec baseline of 8742/11). |
| — | Code-review fixes (D6–D9) | [COMPLETE] | 2026-04-21 | Applied 4 surgical fixes from `/code-review` findings: maps-readiness no longer caches probe failures (D6), `isTimeout` drops substring fallback (D7), added `fetchPhoto_emptyBodyMapsToUpstream` test (D8), added two frontend abort/signal tests (D9). Backend: 95 tests green (was 94, +1 from D8). Frontend: 8766 pass / 10 fail (baseline was 8762/11 — net +4 passes, −1 fail; no regressions). Files touched: `frontend/src/services/maps-readiness.ts`, `frontend/src/services/__tests__/maps-readiness.test.ts`, `frontend/src/services/__tests__/google-local-support-service.test.ts`, `backend/.../GoogleMapsService.java`, `backend/.../GoogleMapsServiceTest.java`. |

---

## Deviations

All deviations were taken under the Spec 2 charter's 7-condition gate (no public API change, no behavior change from stated intent, no rules/spec/plan edits, no new security/CORS/logging/PII/rate-limit surface beyond what spec already mandated, no scope change, no cross-spec precedent beyond extending existing patterns, alternative strictly worse).

### Deviation 1 — Extended Step 1's handler class with Spring 6.1+ validation exceptions

**What changed:** Step 1 originally added `@ExceptionHandler(ConstraintViolationException.class)`. Discovered during Step 5 that Spring Boot 3.2+ / Spring 6.1+ routes `@Validated` + `@RequestParam` validation through `HandlerMethodValidationException` instead, and missing required params throw `MissingServletRequestParameterException` from the servlet layer. Added both handlers to `ProxyExceptionHandler` — all three map to 400 `INVALID_INPUT` with a leaf-path or param-name message.

**Why under the charter:** Condition "alternative strictly worse" — without these handlers, `@RequestParam @NotBlank @Size @Pattern` validation returns 500 INTERNAL_ERROR instead of the spec-mandated 400 INVALID_INPUT. The only way for the spec's acceptance criteria to hold is these handlers.

### Deviation 2 — Added narrow `catch (UpstreamException | UpstreamTimeoutException)` block in each GoogleMapsService method

**What changed:** Each of `search`, `geocode`, `fetchPhoto` added a narrow `catch (UpstreamException | UpstreamTimeoutException ex) { throw ex; }` before the `catch (RuntimeException)` block. Without this, the explicit `UpstreamException("Maps service rejected the geocode request.")` thrown in geocode's `OVER_QUERY_LIMIT`/`REQUEST_DENIED` branch was being caught by `catch (RuntimeException)` below and re-wrapped with the generic "temporarily unavailable" message, losing the semantic signal.

**Why under the charter:** The spec's own test case `geocode_overQueryLimit_throwsUpstream` expected the specific "rejected" message, which only passes with this narrow preservation. Alternative (replacing all specific messages with the generic one) would lose diagnostic signal and violate the spec's test expectation.

### Deviation 3 — Raised Spec 1's WebClient codec buffer from 64KB to 2MB

**What changed:** `backend/src/main/resources/application.properties` — `proxy.max-request-body-bytes=65536` → `proxy.max-request-body-bytes=2097152`. Updated the accompanying comment to reflect that WebClient's `maxInMemorySize()` applies to both outbound request bodies and inbound response bodies.

**Why:** Google Places API v1 `searchText` responses routinely exceed 64KB (the 20-place default returns ~150KB), and photo media responses can be larger. 64KB was Spec 1's default that only worked because Gemini responses are small. Incoming client request bodies remain capped at 1MB by `spring.servlet.multipart.max-request-size`.

**Why under the charter:** "Alternative strictly worse" — leaving the limit at 64KB crashes every Places search. A cleaner rename to `proxy.upstream.max-response-bytes` would require coordinated changes across `ProxyConfig.java`, the property file, and documentation — wider scope than bumping an existing value. This is a Spec 1 gap surfaced here; a follow-up spec can do the rename if desired.

### Deviation 4 — Two-step Places photo fetch (metadata JSON → CDN bytes)

**What changed:** `GoogleMapsService.callPlacePhoto` now does two WebClient GETs: first against the Places v1 photo media endpoint (returns `{photoUri}` JSON per Google's current default), then against the CDN-signed `photoUri` (returns actual bytes, no API key in URL).

**Why:** Google Places API v1's `/media` endpoint no longer returns image bytes by default — it returns a JSON response with a pre-signed CDN URL (opt-in 302 redirect via `skipHttpRedirect=false`, but WebClient doesn't follow redirects by default). The two-step pattern is the correct client shape. The `photoUri` CDN URL is key-free, so no API key escapes the backend.

**Why under the charter:** "Alternative strictly worse" — without this fix, every photo returns JSON metadata as bytes with `Content-Type: application/json;charset=UTF-8`, which breaks `<img src>` rendering on the frontend. Unit tests mock `callPlacePhoto` directly so they remained unchanged.

### Deviation 5 — Extended D7 framework-log-suppression to GET-URL PII loggers

**What changed:** `backend/src/main/resources/application-dev.properties` — added two new `logging.level` overrides:
- `logging.level.org.springframework.web.servlet.DispatcherServlet=INFO`
- `logging.level.org.springframework.web.HttpLogging=INFO`

**Why:** Spec 2's D7 closed a PII leak where Spring's request-body-processor DEBUG logged `@RequestBody` record `toString()` representations (which contain user content). Spec 3 introduced GET endpoints where the user content lives in query parameters (`?query=Nashville+TN`, `?name=places/...`), and DispatcherServlet DEBUG / HttpLogging DEBUG print the full request URL including query string. Without these overrides, backend dev logs contained user-submitted geocode queries — a PII leak in the same spirit as D7.

**Why under the charter:** This extends an established precedent (Spec 2's D7) rather than setting a new one. The mechanism is identical (targeted `logging.level` overrides in `application-dev.properties`), the rationale is identical (`07-logging-monitoring.md` § Framework Log Suppression), and the same comment pattern is used. Verified with PII-leak grep post-restart: 0 matches for user content, 3 safe length-only log lines from our controllers.

### Deviation 6 — Don't cache probe failures in `maps-readiness.ts`

**What changed:** `getMapsReadiness()` previously assigned `cachedReadiness = ready` unconditionally inside the `.then()` callback, which meant a single failed probe (network blip at page load, backend not yet up) permanently pinned the session to the mock service. Changed to `if (ready) cachedReadiness = ready` so only successful probes are cached; failures leave `cachedReadiness` undefined and the next call gets a fresh attempt. Concurrent-call deduplication via `inflightProbe` is unchanged. Updated the module header comment to match ("retries on every call after a failure"). Added a test `retries on every call after a failure (does not cache false)` in `maps-readiness.test.ts`.

**Why:** Matches the spec's stated intent: "retries indefinitely on probe failure (network down at app load shouldn't permanently fall back to mock)" (`_specs/ai-proxy-maps.md:989`). The original plan step didn't specify the caching semantics explicitly and the first-pass implementation cached both branches. Code review caught it.

**Why under the charter:** "Alternative strictly worse" — the old behavior contradicted the spec's documented intent and shipped as a silent UX regression for users with transient network issues at boot. No API change, no security/auth surface touched, no new pattern introduced (the same promise-deduplication pattern is preserved). Test count: `maps-readiness.test.ts` 5 → 6 tests.

### Deviation 7 — Drop substring-based timeout detection in `GoogleMapsService.isTimeout`

**What changed:** Removed the `cur.getMessage().toLowerCase().contains("timeout")` fallback branch in `isTimeout()`. Kept the `instanceof TimeoutException` cause-chain walk. Updated the method JavaDoc to note the behavior change explicitly.

**Why:** The substring match was loose — any `RuntimeException` whose message coincidentally contained "timeout" would be classified as 504 UPSTREAM_TIMEOUT instead of 502 UPSTREAM_ERROR. Spring's `Mono.block(Duration)`, `Mono.timeout()`, and Netty connection timeouts all carry a `java.util.concurrent.TimeoutException` in the cause chain, so the `instanceof` check is sufficient for all real timeout paths.

**Why under the charter:** Explicitly authorized by Eric during code review. Behavior change is narrow (mis-classified non-timeout RuntimeExceptions now correctly return 502), strictly more correct. No test changes needed — the existing `search_timeoutMapsToUpstreamTimeout` test wraps a `TimeoutException` in a `RuntimeException`, which still triggers via `instanceof` on the cause.

### Deviation 8 — Add `fetchPhoto_emptyBodyMapsToUpstream` test

**What changed:** Added a 23rd test to `GoogleMapsServiceTest` covering the spec-listed empty-body photo path (`fetchPhoto` receives a 0-byte response and throws `UpstreamException("Maps service returned empty photo body.")`). Because the byte-length check lives inside `callPlacePhoto` (which tests mock), the test stubs `callPlacePhoto` to emit `Mono.error(new UpstreamException(...))` directly and verifies the narrow `catch (UpstreamException | UpstreamTimeoutException)` guard from Deviation 2 preserves the specific message.

**Why:** The spec enumerated this as test #20 for `GoogleMapsServiceTest` (`_specs/ai-proxy-maps.md:768`) but the initial test file substituted a 4xx-maps-to-upstream test instead, leaving the empty-body branch uncovered by assertion even though the service code for it exists at `GoogleMapsService.java:273`.

**Why under the charter:** Pure test-coverage addition. No production code changed. Spec alignment.

### Deviation 9 — Add frontend abort/signal coverage to `google-local-support-service.test.ts`

**What changed:** Added two tests covering the spec-listed abort-signal paths:
- `propagates AbortError when fetch is cancelled` — fetch rejects with an `AbortError`, assert the error propagates through `search()` (no catch/translate).
- `passes an AbortSignal to fetch so REQUEST_TIMEOUT_MS can cancel it` — verifies `fetchWithTimeout` actually wires the signal into `fetch(init)`, which is the production wiring that makes the 15s timeout effective.

The spec listed `search_abortRespected` and `search_timeoutTriggersAbort` as tests 14 and 15 (`_specs/ai-proxy-maps.md:1299-1301`). The original `search_abortRespected` formulation ("calling with an already-aborted signal") doesn't map to `search()`'s API surface since callers don't pass signals — `fetchWithTimeout` creates them internally. Replaced with the signal-wiring assertion, which covers the actual production code path. Dropped the fake-timer/listener-pattern variant initially attempted — it worked but left an unhandled-rejection warning in vitest cleanup because of an abort-event-listener race. The wiring assertion is deterministic and catches the same regression (if fetchWithTimeout ever stopped passing `signal`, the test fails).

**Why under the charter:** Test-coverage addition to match spec enumeration. No production code changed. The abort-wiring formulation is stricter than "already-aborted signal" because the wiring IS the mechanism — if it breaks, every timeout in production silently stops working.

### Non-deviations (charter-allowed auto-decisions)

- Step 3 test file: implemented verbatim 6-test spec from plan. No deviation.
- Step 5 test fixes: fixed `Map.of(..., null)` (Java doesn't allow null values in `Map.of`) and `.isEmpty()` → `.doesNotExist()` for null-omitted JSON fields (Jackson's `non_null` policy is global). Both are test-code bugs that would've surfaced on any first run; not deviations from spec, just fresh test-authoring decisions.
- MockBean deprecation warnings: `@MockBean` is deprecated in Spring Boot 3.4+, but both `GeminiControllerTest` and `GeminiIntegrationTest` (from Spec 2) use it. Staying consistent with Spec 2's established pattern; a future spec can migrate all four test files to `@MockitoBean` together. Not a deviation — this is explicit non-change.
