# AI Proxy: Google Maps + Local Support Frontend Migration (Spec 3 of 5)

**Spec ID:** ai-proxy-maps
**Wave:** Key Protection (5-spec series, this is spec 3 of 5)
**Track:** Backend proxy endpoints + frontend service migration
**Branch:** `claude/feature/ai-proxy-maps` — cut from `main` after Spec 2 merges
**Depends on:** Spec 1 (`ai-proxy-foundation.md`) merged. Spec 2 (`ai-proxy-gemini.md`) merged. Spec 3 reuses Spec 1's `ProxyResponse`, `ProxyError`, `ProxyException`, `WebClient` bean, `RateLimitFilter`, `RequestIdFilter`, `ProxyExceptionHandler`, and the `proxy.google-maps.api-key` config wiring (already present in `ProxyConfig.GoogleMapsProperties`).

> **Prerequisite verification:** run `git log main --oneline -5` and confirm both the "AI proxy foundation" and "Spec 2: migrate Gemini to backend proxy" merge commits are visible. If either is missing, do not proceed.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-proxy-maps` throughout the entire execution.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT reset. Do NOT run `git checkout`, `git commit`, `git push`, or any other git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current` via `bash`.** If the result is not `claude/feature/ai-proxy-maps`, STOP and surface to Eric.
3. **Preserve the `LocalSupportService` interface and its consumers.** `createLocalSupportService()`, `LocalSupportService.search`, and `LocalSupportService.geocode` keep their current signatures. Components and hooks that consume the service (search UI, geocoder UI) get zero changes. Only the internals of `google-local-support-service.ts` are rewritten.
4. **Keep the mock-fallback pattern alive.** `local-support-service.ts` still picks Google vs. mock. The check changes from "is the key configured on the frontend?" to "did the backend tell us Maps is configured?" — see Architecture Decision #5 below for the readiness probe.
5. **Keep the client-side geocode cache in place.** The 50-entry LRU in `geocode-cache.ts` stays untouched. Backend will ALSO cache. Two layers is intentional: client cache avoids the network entirely; backend cache protects the Google API quota across users (matters at scale).
6. **Backend cache is mandatory.** Per `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES", every cache that keys off external user input has a documented size cap, eviction policy, and TTL. This spec adds three bounded caches in `GoogleMapsService` (places-search results, geocode results, photo bytes). All use Caffeine with explicit `maximumSize` + `expireAfterWrite`.
7. **Use exactly the code specified in this spec.** Do not rewrite, refactor, or "improve" patterns. Match Spec 2's conventions (e.g., the `callModels()` test seam from D2b — see Architecture Decision #7 for the analogous pattern here).
8. **Do NOT add Maven dependencies.** Spec 1 added `spring-boot-starter-webflux` (provides `WebClient`) and `spring-boot-starter-validation`. Spec 2 added `google-genai`. This spec needs only what's already present: `WebClient` for HTTP calls, Caffeine (already a transitive of Spring Boot Cache) for in-memory caching. Do NOT add `google-maps-services-java` — it's heavier than necessary for two endpoints + a photo proxy.
9. **The new `/api/v1/proxy/maps/place-photo` endpoint streams image bytes through the backend.** Photo URLs constructed client-side currently embed the API key (`...&key=AIza...`). After this spec, the frontend gets a key-free proxy URL. The backend fetches the image from Google with the real key and streams the bytes back with appropriate `Content-Type` and `Cache-Control` headers. See Architecture Decision #4 for why this is the only correct option.

---

## Why this spec exists

Today, the Local Support feature (`/local-support` route) calls the Google Maps Platform directly from the browser using two endpoints:

- **Places API (text search)** — `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key: VITE_GOOGLE_MAPS_API_KEY` header. Used to find churches, counselors, and Celebrate Recovery groups by category.
- **Geocoding API** — `https://maps.googleapis.com/maps/api/geocode/json?address=...&key=VITE_GOOGLE_MAPS_API_KEY`. Used to convert user-typed location strings (e.g., "Spring Hill, TN") to lat/lng coordinates.

Additionally, every place returned by the search includes a photo, and `google-places-mapper.ts` constructs photo URLs by embedding the API key directly: `https://places.googleapis.com/v1/{photoName}/media?maxWidthPx=400&key=AIza...`. So the key is exposed three ways: in fetch headers, in URL query params, and in `<img src="...">` attributes that anyone can View Source on.

`VITE_GOOGLE_MAPS_API_KEY` is inlined into the production JavaScript bundle at build time. Anyone can find it in DevTools → Sources, or just look at any rendered photo's URL. Google Cloud's HTTP-referrer restriction is defense-in-depth, but referrer headers are trivially forgeable from curl or any server-side caller. The real fix is to keep the key on the server.

This spec:

1. Adds three backend endpoints under `/api/v1/proxy/maps/`:
   - `POST /places-search` — accepts `{lat, lng, radiusMiles, keyword, pageToken?}`, returns `{places, nextPageToken}` where `places` is the raw Google `places` array (so the frontend's existing `google-places-mapper.ts` keeps working unchanged).
   - `GET /geocode?query=...` — returns `{lat, lng}` or `{lat: null, lng: null}` for no-result.
   - `GET /place-photo?name=...` — streams the photo image bytes through the backend so photo URLs in the frontend are key-free.
2. Rewrites `frontend/src/services/google-local-support-service.ts` to fetch from the backend proxy instead of calling Google directly. Public methods (`search`, `geocode`) keep identical signatures.
3. Updates `frontend/src/services/google-places-mapper.ts` so `buildPhotoUrl` returns a backend-proxy URL instead of a Google URL with the key embedded.
4. Adds a backend readiness check exposed through the existing `/api/v1/health` endpoint (already returns provider readiness as booleans per Spec 1's design). `local-support-service.ts` queries this on startup to decide whether to instantiate the Google service or the mock service.
5. Removes `requireGoogleMapsApiKey`, `isGoogleMapsApiKeyConfigured`, and the `GOOGLE_MAPS_API_KEY` module-level constant from `frontend/src/lib/env.ts`.
6. Removes `VITE_GOOGLE_MAPS_API_KEY` from `frontend/.env.example` and from the typed `vite-env.d.ts`.
7. Adds backend caches (Caffeine, bounded) for places-search results, geocode results, and photo bytes. Cuts Google API costs and improves response latency for repeat queries (which are common — many users in the same metro area search for the same categories).
8. Extends `backend/src/main/resources/openapi.yaml` with the three new paths and their schemas.

After this spec ships, viewing the production bundle in a browser and searching for `googleapis.com/v1/places`, `maps.googleapis.com/maps`, `VITE_GOOGLE_MAPS_API_KEY`, or any `AIza...` substring returns nothing. The Maps key is gone from the client. Local Support continues to work identically from the user's perspective, just with an extra hop through the backend.

Spec 4 (`ai-proxy-fcbh`) does the same thing for FCBH (audio Bible). Spec 5 (`ai-proxy-ask`) does it for the Ask AI integration. Spec 3 follows the pattern Spec 2 established, with the wrinkle that Maps has three distinct endpoints (vs. Spec 2's two methods on a single SDK) and one of them streams binary content.

---

## Affected Frontend Routes

- `/local-support`

---

## Files touched

| File | Change | Purpose |
|---|---|---|
| `backend/src/main/java/com/example/worshiproom/proxy/maps/MapsController.java` | Create | Three endpoints — POST `/places-search`, GET `/geocode`, GET `/place-photo` |
| `backend/src/main/java/com/example/worshiproom/proxy/maps/GoogleMapsService.java` | Create | Wraps `WebClient` calls to Places API, Geocoding API, and the Places photo media endpoint. Maps WebClient errors to typed `ProxyException` subclasses. Hosts the three Caffeine caches. |
| `backend/src/main/java/com/example/worshiproom/proxy/maps/PlacesSearchRequest.java` | Create | Request DTO record `{lat, lng, radiusMiles, keyword, pageToken?}` with Bean Validation |
| `backend/src/main/java/com/example/worshiproom/proxy/maps/PlacesSearchResponse.java` | Create | Response DTO record `{places, nextPageToken}` where `places` is the raw Google `places` array represented as `List<Map<String, Object>>` (preserves the existing frontend mapper without coupling backend to frontend types) |
| `backend/src/main/java/com/example/worshiproom/proxy/maps/GeocodeResponse.java` | Create | Response DTO record `{lat, lng}` — both fields `Double` (nullable) so a no-result lookup returns `{lat: null, lng: null}` rather than throwing |
| `backend/src/main/java/com/example/worshiproom/proxy/maps/MapsCacheKeys.java` | Create | Static helpers for cache-key construction (`searchKey(lat, lng, radius, keyword, pageToken)`, `geocodeKey(query)`, `photoKey(name)`). Centralizes normalization logic so cache keys are consistent across reads and writes. |
| `backend/src/main/java/com/example/worshiproom/controller/ApiController.java` | Modify | Update `/api/v1/health` to report `googleMaps: { configured: boolean }` in the providers section so the frontend factory can pick Google vs. mock without exposing the key |
| `backend/src/main/resources/openapi.yaml` | Modify | Add three new paths (`/api/v1/proxy/maps/places-search`, `/api/v1/proxy/maps/geocode`, `/api/v1/proxy/maps/place-photo`) plus request/response schemas. Update health endpoint schema to include `googleMaps` provider readiness. |
| `backend/src/test/java/com/example/worshiproom/proxy/maps/MapsControllerTest.java` | Create | `@WebMvcTest` slice — validates request bodies, response shapes, error mapping for all three endpoints |
| `backend/src/test/java/com/example/worshiproom/proxy/maps/GoogleMapsServiceTest.java` | Create | Unit tests with a mocked `WebClient` — covers each error branch (4xx, 5xx, timeout, network), cache hit/miss, photo SSRF guard |
| `backend/src/test/java/com/example/worshiproom/proxy/maps/MapsIntegrationTest.java` | Create | `@SpringBootTest` end-to-end — mocks `WebClient` at the bean level, asserts full HTTP response including headers and error shape. Includes a photo-streaming round trip. |
| `backend/src/test/java/com/example/worshiproom/proxy/maps/MapsCacheKeysTest.java` | Create | Unit tests for cache-key normalization — same query in different cases/whitespace should hit the same key |
| `frontend/src/services/google-local-support-service.ts` | Modify | Replace direct Google API calls with `fetch` to `/api/v1/proxy/maps/*`. Preserve `search` and `geocode` method signatures. Remove `requireGoogleMapsApiKey` import. Remove module-level `paginationTokens` Map (server returns `nextPageToken` in response; we pass it back on next request, no module state needed). |
| `frontend/src/services/google-places-mapper.ts` | Modify | `buildPhotoUrl` no longer takes `apiKey`. New signature: `buildPhotoUrl(photoName: string): string` returning `${VITE_API_BASE_URL}/api/v1/proxy/maps/place-photo?name=${encodeURIComponent(photoName)}`. Update `mapGooglePlaceToLocalSupport` callers accordingly (one site in `google-local-support-service.ts`). |
| `frontend/src/services/local-support-service.ts` | Modify | Replace `isGoogleMapsApiKeyConfigured()` with a backend readiness probe. New module: import a one-time async helper that calls `/api/v1/health`, reads `providers.googleMaps.configured`, and caches the result. Factory becomes async (or the readiness check happens once at module load). See Architecture Decision #5 for the chosen approach. |
| `frontend/src/lib/env.ts` | Modify | Remove `requireGoogleMapsApiKey`, `isGoogleMapsApiKeyConfigured`, and the `GOOGLE_MAPS_API_KEY` module-level constant |
| `frontend/src/services/__tests__/google-local-support-service.test.ts` | Modify | Swap direct Google API mocks for `fetch` mocks targeting `/api/v1/proxy/maps/*`. Update test fixtures for the new error paths (backend `ProxyError` shape instead of raw Google JSON) |
| `frontend/src/services/__tests__/google-places-mapper.test.ts` | Modify (if present) | Update `buildPhotoUrl` expectations — backend-proxy URL instead of Google URL with key |
| `frontend/src/services/__tests__/local-support-service.test.ts` | Modify (if present) | Update factory tests to mock the readiness probe instead of `isGoogleMapsApiKeyConfigured` |
| `frontend/src/vite-env.d.ts` | Modify | Remove `readonly VITE_GOOGLE_MAPS_API_KEY?: string` from the `ImportMetaEnv` interface |
| `frontend/.env.example` | Modify | Remove `VITE_GOOGLE_MAPS_API_KEY` block (Spec 4 will remove `VITE_FCBH_API_KEY`; Spec 5 wraps up the wave) |

**Net changes:** backend gains ~600 lines of Java (slightly more than Spec 2 due to three endpoints + caches + photo streaming) + ~80 lines of YAML (OpenAPI additions) + ~500 lines of tests. Frontend loses ~120 lines (env helpers, direct-API call code, module-level pagination state) and gains ~100 lines (fetch-based service + readiness probe + updated tests). Total ≈ +1100 / -250. About 20 files touched.

**Net runtime impact:** Local Support gains one extra hop per call (browser → backend → Google instead of browser → Google directly). Photo loads now route through the backend (small additional latency, mitigated by backend cache + browser cache). Backend caching means repeat queries within the cache TTL are zero-network-to-Google — significant cost savings as multiple users in the same area search the same categories.

---

## Architecture decisions

**1. Three endpoints, not two.** Spec 2 had two methods (explain, reflect) on a single LLM SDK. Spec 3 has two distinct API surfaces (Places search, Geocoding) PLUS a binary photo proxy. Each endpoint has its own DTO pair and its own cache. Don't try to unify them into a single endpoint with a discriminated request type — the API surfaces are genuinely different and combining them complicates testing without simplifying the code.

**2. Response shape preserves the existing frontend mapper.** `google-places-mapper.ts` does business logic (denomination inference, specialty inference, business-status filtering) coupled to frontend types and constants like `DENOMINATION_OPTIONS` and `SPECIALTY_OPTIONS`. Moving the mapper to the backend would couple backend types to frontend categories — the wrong direction. So the backend returns the raw Google `places` array (typed loosely as `List<Map<String, Object>>`) and the frontend mapper continues to do the LocalSupportPlace transformation unchanged. The only frontend change is where the Google data comes from.

**3. Pagination tokens are stateless on the backend.** The current frontend code keeps a module-level `paginationTokens: Map<string, string | null>` to remember Google's `nextPageToken` between "load more" clicks. After this spec, the backend is stateless: it returns `nextPageToken` in the response, the frontend stores it in component state (or just passes it along), and sends it back in the next request. Removes module-level mutable state, makes the service easier to test, and aligns with the proxy convention.

**4. Photo bytes proxied through the backend, not redirected.** The Places API photo media endpoint (`https://places.googleapis.com/v1/{name}/media?key=...`) returns image bytes when called with a valid key. Three options for the proxy:

- **Redirect (302)** to the Google URL — requires the backend to construct the URL with the key, then send `Location: ...?key=AIza...`. The browser would follow the redirect and the key would appear in the redirect target. **Defeats the spec's purpose. Rejected.**
- **Return a signed URL** that doesn't include the key — Google does not support pre-signed URLs for Places photos. **Not available. Rejected.**
- **Stream bytes through the backend** — backend GETs the Google URL, reads the response, streams it back to the client with the original `Content-Type` and a sensible `Cache-Control: public, max-age=86400`. Adds backend bandwidth cost (image bytes flow through the backend) but is the only way to keep the key truly off the client. **Selected.**

The backend caches photo bytes by photo name (which is stable for a given Place — Places API photos are immutable). Caffeine cache with `maximumSize(500)` and `expireAfterWrite(7d)`. Photo bytes are typically 30-200 KB, so 500 entries is ~25-100 MB — within reason.

**5. Frontend factory uses backend readiness probe, not key presence.** Today, `local-support-service.ts` calls `isGoogleMapsApiKeyConfigured()` to decide between `createGoogleService()` and `createMockService()`. After this spec, the frontend has no Maps key to check. Two replacement options:

- **Synchronous probe**: keep the factory synchronous, default to `createGoogleService()`, let the first failed request fall back. Bad UX — users see a broken state during the first call.
- **Async probe at module load**: hit `/api/v1/health` once on first import, cache the result, return the appropriate service. Factory becomes async (`createLocalSupportService(): Promise<LocalSupportService>`) OR the readiness check happens once at app boot and the result is read synchronously thereafter. **Selected.**

Implementation: a new module `frontend/src/services/maps-readiness.ts` exports `getMapsReadiness(): Promise<boolean>` that fetches `/api/v1/health` once, caches the result, and returns it. `local-support-service.ts` becomes `async function createLocalSupportService(): Promise<LocalSupportService>`. Existing callers (search UI, geocoder UI) await it. This is a one-time async cost at module load, not per request.

The `/api/v1/health` endpoint already exists from Spec 1 with a `providers` block. This spec adds `googleMaps: { configured: boolean }` to it. Spec 4 will add `fcbh: { configured: boolean }`.

**6. Backend caches use Caffeine, three distinct caches with their own bounds.** Per `02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES":

| Cache | Key | Value | maximumSize | expireAfterWrite | Reason for bounds |
|---|---|---|---|---|---|
| `placesSearchCache` | `searchKey(lat, lng, radius, keyword, pageToken)` | Raw Google response (JSON) | 1000 | 6h | Search results are slow-changing (places open/close monthly, not hourly). 6h TTL balances freshness with cost savings. 1000 entries covers most metro-area+category permutations for a small user base. |
| `geocodeCache` | `geocodeKey(query)` | `{lat, lng}` or null | 500 | 30d | Geocoded coordinates for an address are extremely stable (years). 30d TTL is conservative. 500 entries covers a personal-scale user base; Caffeine evicts oldest on overflow. |
| `photoCache` | `photoKey(name)` | `byte[]` | 500 | 7d | Place photos are immutable (Places API photo names are stable IDs). 500 entries × ~100 KB avg = ~50 MB heap. Bound is for memory pressure, not freshness. |

All three caches are documented inline in `GoogleMapsService.java` with the rationale for each bound. The bounds are chosen for personal-scale use; if the app grows, all three need re-tuning (likely upward) — but the architecture is unchanged.

**7. Test seam for `WebClient` calls follows D2b's pattern.** Spec 2 added a `callModels()` package-private method on `GeminiService` to allow `Mockito.spy()` + `doReturn()` instead of reflectively overwriting the SDK's final field. Same pattern here: `GoogleMapsService` exposes three package-private methods (`callPlacesSearch`, `callGeocode`, `callPlacePhoto`) that are thin passthroughs to `WebClient`. Tests spy on these. This decouples test setup from `WebClient`'s fluent-builder verbosity (mocking `WebClient.get().uri(...).header(...).retrieve().bodyToMono(...)` is brittle and unhelpful).

**8. SSRF guard on `/place-photo`.** The `name` query param is user-provided (well, technically server-relayed from a previous Places search response, but treat all client input as untrusted). The backend MUST validate the format before constructing the Google URL: must match `places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+` exactly. No slashes outside that pattern, no protocol prefix, no query-param injection. Anything else returns 400 INVALID_INPUT before any upstream call. Tests in `GoogleMapsServiceTest` cover the SSRF guard explicitly with attack-shaped inputs (`../etc/passwd`, `evil.com/x`, etc.).

**9. No new exception types.** Spec 2 added `SafetyBlockException` because Gemini has a unique "blocked by safety classifier" failure mode that warranted its own HTTP code (422). Maps has no analogous failure mode — it either returns data, returns "no results" (which is a successful response with an empty array), or fails at the network/auth layer. Existing `UpstreamException` (502) and `UpstreamTimeoutException` (504) cover everything. `INVALID_INPUT` (400, mapped from `MethodArgumentNotValidException` by Spec 1's `ProxyExceptionHandler`) covers Bean Validation failures including the SSRF guard.

**10. Rate limiting is unchanged.** Spec 1's `RateLimitFilter` is scoped to `/api/v1/proxy/**`, so all three new endpoints inherit rate limiting automatically. No filter changes needed. The dev profile's looser limits (120/min with 30-burst) apply to Maps the same way they apply to Gemini.

**11. CORS is unchanged.** Spec 1's `CorsConfig` (also reconciled during the rules audit) covers all `/api/v1/proxy/**` paths and exposes the relevant headers (`X-Request-Id`, `X-RateLimit-*`, `Retry-After`). The new endpoints inherit this.

**12. Photo `Cache-Control` discipline.** When the backend serves a photo, it sets `Cache-Control: public, max-age=86400, immutable` so the browser caches the photo for a day. The `immutable` directive tells the browser not to revalidate within the freshness window, eliminating conditional-request roundtrips. Photo URLs in the Places API are stable identifiers, so `immutable` is correct.

---

## Backend implementation

### Endpoint contracts

#### `POST /api/v1/proxy/maps/places-search`

**Request body** (`PlacesSearchRequest`):

```json
{
  "lat": 35.7501,
  "lng": -86.9303,
  "radiusMiles": 10,
  "keyword": "non-denominational church",
  "pageToken": null
}
```

**Validation:**
- `lat` — required, `-90.0 ≤ lat ≤ 90.0`
- `lng` — required, `-180.0 ≤ lng ≤ 180.0`
- `radiusMiles` — required, `1 ≤ radiusMiles ≤ 50` (matches frontend slider range)
- `keyword` — required, 1–200 chars, trimmed
- `pageToken` — optional, ≤ 200 chars (Google's tokens are typically ~70 chars; 200 is generous)

**Success response** (HTTP 200, `ProxyResponse<PlacesSearchResponse>`):

```json
{
  "data": {
    "places": [
      {
        "id": "ChIJ...",
        "displayName": { "text": "Some Church", "languageCode": "en" },
        "formattedAddress": "123 Main St, Spring Hill, TN 37174, USA",
        "location": { "latitude": 35.7501, "longitude": -86.9303 },
        "rating": 4.8,
        "photos": [{ "name": "places/ChIJ.../photos/AbC123" }],
        "types": ["church", "place_of_worship"],
        "businessStatus": "OPERATIONAL"
      }
    ],
    "nextPageToken": "CqQBA..."
  },
  "meta": { "requestId": "fbfQ6HOYQGe-REXyyltn3Q" }
}
```

`places` is the raw `places` array from Google's Places API response, passed through unchanged so the frontend's `mapGooglePlaceToLocalSupport` continues to work. `nextPageToken` is null when there are no more pages.

**Error responses:** standard `ProxyError` shape via `ProxyExceptionHandler`. Codes: `INVALID_INPUT` (400, validation), `RATE_LIMITED` (429, from filter), `UPSTREAM_ERROR` (502, Google 4xx/5xx that's not auth-related), `UPSTREAM_TIMEOUT` (504, WebClient timeout), `INTERNAL_ERROR` (500, unexpected).

#### `GET /api/v1/proxy/maps/geocode?query=Spring+Hill+TN`

**Query params:**
- `query` — required, 1–200 chars

**Success response** (HTTP 200, `ProxyResponse<GeocodeResponse>`):

```json
{
  "data": { "lat": 35.7501, "lng": -86.9303 },
  "meta": { "requestId": "fbfQ6HOYQGe-REXyyltn3Q" }
}
```

For no-result queries (Google returns `status: ZERO_RESULTS`), the response is still HTTP 200 with `data: { lat: null, lng: null }`. This matches the frontend's existing `Promise<{lat, lng} | null>` contract, where `null` means "no match" rather than "error". The cache layer caches no-results too (frontend already does this; backend should too) to prevent typo hammering.

**Error responses:** same as places-search.

#### `GET /api/v1/proxy/maps/place-photo?name=places/ChIJ.../photos/AbC123`

**Query params:**
- `name` — required, must match `^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$` (SSRF guard)

**Success response** (HTTP 200, raw image bytes):
- `Content-Type`: whatever Google returned (typically `image/jpeg`)
- `Cache-Control`: `public, max-age=86400, immutable`
- `X-Request-Id`: standard request ID header
- Body: raw image bytes (NOT wrapped in `ProxyResponse` — this is binary, not JSON)

**Error responses:** standard JSON `ProxyError` shape (NOT image bytes for the error path — clients distinguish by `Content-Type`). Codes: `INVALID_INPUT` (400, regex failure), `RATE_LIMITED` (429), `UPSTREAM_ERROR` (502, Google failed to serve the photo), `UPSTREAM_TIMEOUT` (504), `INTERNAL_ERROR` (500).

The "binary success / JSON error" pattern is standard for image-serving endpoints. Frontend `<img>` tags handle binary success natively. For programmatic fetches that need to detect errors, check `response.ok` and parse the error body as JSON only when `Content-Type` is `application/json`.

---

### Backend file specifications

#### `PlacesSearchRequest.java`

```java
package com.example.worshiproom.proxy.maps;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PlacesSearchRequest(
    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng,
    @NotNull @Min(1) @Max(50) Integer radiusMiles,
    @NotBlank @Size(min = 1, max = 200) String keyword,
    @Size(max = 200) String pageToken
) {}
```

Notes: `pageToken` is `@Size`-constrained but not `@NotBlank` — null/empty means "first page".

#### `PlacesSearchResponse.java`

```java
package com.example.worshiproom.proxy.maps;

import java.util.List;
import java.util.Map;

public record PlacesSearchResponse(
    List<Map<String, Object>> places,
    String nextPageToken
) {}
```

`places` is intentionally typed loosely as `List<Map<String, Object>>` — this is the raw Google response shape passed through to the frontend. Don't over-model it; the frontend's `GooglePlace` TypeScript interface is the consumer's contract. Backend just relays.

#### `GeocodeResponse.java`

```java
package com.example.worshiproom.proxy.maps;

public record GeocodeResponse(Double lat, Double lng) {
    public static final GeocodeResponse NO_RESULT = new GeocodeResponse(null, null);
}
```

Both fields nullable. `NO_RESULT` constant for the empty case; service returns it (cached) when Google reports `ZERO_RESULTS`.

#### `MapsCacheKeys.java`

```java
package com.example.worshiproom.proxy.maps;

import java.util.Locale;

final class MapsCacheKeys {
    private MapsCacheKeys() {}

    /** Search key: lat/lng to 4 decimal places (~11m precision), normalized keyword, plus pageToken. */
    static String searchKey(double lat, double lng, int radiusMiles, String keyword, String pageToken) {
        String normalizedKeyword = keyword.trim().toLowerCase(Locale.ROOT);
        String tokenPart = (pageToken == null || pageToken.isEmpty()) ? "" : ":" + pageToken;
        return String.format(Locale.ROOT, "%.4f,%.4f:%d:%s%s",
            lat, lng, radiusMiles, normalizedKeyword, tokenPart);
    }

    /** Geocode key: trimmed, lowercased query. Matches the frontend cache key strategy. */
    static String geocodeKey(String query) {
        return query.trim().toLowerCase(Locale.ROOT);
    }

    /** Photo key: the Google photo name itself. Already a stable opaque ID. */
    static String photoKey(String name) {
        return name;
    }
}
```

Package-private (no `public`) — only the service uses these. `Locale.ROOT` to avoid Turkish-i and similar locale-dependent lowercasing surprises.

#### `GoogleMapsService.java`

The full service is ~250 lines. Structure:

```java
package com.example.worshiproom.proxy.maps;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.concurrent.TimeoutException;

@Service
public class GoogleMapsService {

    private static final Logger log = LoggerFactory.getLogger(GoogleMapsService.class);

    private static final String PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
    private static final String GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
    private static final String PHOTO_URL_TEMPLATE = "https://places.googleapis.com/v1/%s/media?maxWidthPx=400&key=%s";
    private static final Pattern PHOTO_NAME_PATTERN =
        Pattern.compile("^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$");
    private static final Duration UPSTREAM_TIMEOUT = Duration.ofSeconds(10);

    private static final String REQUESTED_FIELDS = String.join(",",
        "places.id", "places.displayName", "places.formattedAddress",
        "places.nationalPhoneNumber", "places.internationalPhoneNumber",
        "places.websiteUri", "places.location", "places.rating",
        "places.photos", "places.editorialSummary", "places.regularOpeningHours",
        "places.types", "places.businessStatus", "nextPageToken");

    private final ProxyConfig proxyConfig;
    private final WebClient webClient;

    // Three bounded caches per Architecture Decision #6.
    private final Cache<String, PlacesSearchResponse> placesSearchCache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(Duration.ofHours(6))
        .build();

    private final Cache<String, GeocodeResponse> geocodeCache = Caffeine.newBuilder()
        .maximumSize(500)
        .expireAfterWrite(Duration.ofDays(30))
        .build();

    private final Cache<String, byte[]> photoCache = Caffeine.newBuilder()
        .maximumSize(500)
        .expireAfterWrite(Duration.ofDays(7))
        .build();

    public GoogleMapsService(ProxyConfig proxyConfig, WebClient proxyWebClient) {
        this.proxyConfig = proxyConfig;
        this.webClient = proxyWebClient;
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            log.warn("GOOGLE_MAPS_API_KEY is not configured. /api/v1/proxy/maps/* endpoints "
                + "will return 502 UPSTREAM_ERROR until it is set.");
        }
    }

    public PlacesSearchResponse search(PlacesSearchRequest req) {
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            throw new UpstreamException("Maps service is not configured on the server.");
        }
        String key = MapsCacheKeys.searchKey(
            req.lat(), req.lng(), req.radiusMiles(), req.keyword(), req.pageToken());
        PlacesSearchResponse cached = placesSearchCache.getIfPresent(key);
        if (cached != null) return cached;

        Map<String, Object> body = buildSearchBody(req);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = callPlacesSearch(body)
                .block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("Maps service returned no response.");
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> places =
                (List<Map<String, Object>>) response.getOrDefault("places", List.of());
            String nextPageToken = (String) response.get("nextPageToken");
            PlacesSearchResponse result = new PlacesSearchResponse(places, nextPageToken);
            placesSearchCache.put(key, result);
            return result;
        } catch (WebClientResponseException ex) {
            throw mapUpstreamHttpError("Places API", ex);
        } catch (WebClientRequestException ex) {
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        } catch (RuntimeException ex) {
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException("Maps service timed out. Please try again.", ex);
            }
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        }
    }
```

(Continued in next sub-section — the file is long enough to span multiple chunks for readability.)

```java
    public GeocodeResponse geocode(String query) {
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            throw new UpstreamException("Maps service is not configured on the server.");
        }
        String key = MapsCacheKeys.geocodeKey(query);
        GeocodeResponse cached = geocodeCache.getIfPresent(key);
        if (cached != null) return cached;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = callGeocode(query)
                .block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("Maps service returned no response.");
            }
            String status = (String) response.get("status");
            GeocodeResponse result;
            if ("OK".equals(status)) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
                if (results == null || results.isEmpty()) {
                    result = GeocodeResponse.NO_RESULT;
                } else {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> geometry = (Map<String, Object>) results.get(0).get("geometry");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> location = (Map<String, Object>) geometry.get("location");
                    Double lat = ((Number) location.get("lat")).doubleValue();
                    Double lng = ((Number) location.get("lng")).doubleValue();
                    result = new GeocodeResponse(lat, lng);
                }
            } else if ("ZERO_RESULTS".equals(status)) {
                result = GeocodeResponse.NO_RESULT;
            } else {
                // OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, UNKNOWN_ERROR
                throw new UpstreamException("Maps service rejected the geocode request.");
            }
            geocodeCache.put(key, result);
            return result;
        } catch (WebClientResponseException ex) {
            throw mapUpstreamHttpError("Geocoding API", ex);
        } catch (WebClientRequestException ex) {
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        } catch (RuntimeException ex) {
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException("Maps service timed out. Please try again.", ex);
            }
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        }
    }

    public PhotoBytes fetchPhoto(String name) {
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            throw new UpstreamException("Maps service is not configured on the server.");
        }
        if (!PHOTO_NAME_PATTERN.matcher(name).matches()) {
            // SSRF guard — reject anything that doesn't match the expected Places photo name shape.
            throw new IllegalArgumentException("Invalid photo name format.");
        }
        String key = MapsCacheKeys.photoKey(name);
        byte[] cached = photoCache.getIfPresent(key);
        if (cached != null) return new PhotoBytes(cached, MediaType.IMAGE_JPEG);

        try {
            PhotoBytes result = callPlacePhoto(name).block(UPSTREAM_TIMEOUT);
            if (result == null) {
                throw new UpstreamException("Maps service returned no response.");
            }
            photoCache.put(key, result.bytes());
            return result;
        } catch (WebClientResponseException ex) {
            throw mapUpstreamHttpError("Places photo media", ex);
        } catch (WebClientRequestException ex) {
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        } catch (RuntimeException ex) {
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException("Maps service timed out. Please try again.", ex);
            }
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        }
    }

    /** Public readiness probe used by the controller to populate /api/v1/health. */
    public boolean isConfigured() {
        return proxyConfig.getGoogleMaps().isConfigured();
    }
```

(Continued in next sub-section — package-private test seams + helpers.)

```java
    // ─── Package-private test seams (D2b pattern from Spec 2) ─────────────

    Mono<Map<String, Object>> callPlacesSearch(Map<String, Object> body) {
        String apiKey = proxyConfig.getGoogleMaps().getApiKey();
        return webClient.post()
            .uri(PLACES_TEXT_SEARCH_URL)
            .header("X-Goog-Api-Key", apiKey)
            .header("X-Goog-FieldMask", REQUESTED_FIELDS)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
    }

    Mono<Map<String, Object>> callGeocode(String query) {
        String apiKey = proxyConfig.getGoogleMaps().getApiKey();
        return webClient.get()
            .uri(uriBuilder -> uriBuilder
                .scheme("https").host("maps.googleapis.com").path("/maps/api/geocode/json")
                .queryParam("address", query)
                .queryParam("key", apiKey)
                .build())
            .retrieve()
            .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
    }

    Mono<PhotoBytes> callPlacePhoto(String name) {
        String apiKey = proxyConfig.getGoogleMaps().getApiKey();
        String url = String.format(PHOTO_URL_TEMPLATE, name, apiKey);
        return webClient.get()
            .uri(url)
            .retrieve()
            .toEntity(byte[].class)
            .map(entity -> {
                MediaType contentType = entity.getHeaders().getContentType();
                if (contentType == null) contentType = MediaType.IMAGE_JPEG;
                byte[] body = entity.getBody();
                if (body == null || body.length == 0) {
                    throw new UpstreamException("Maps service returned empty photo body.");
                }
                return new PhotoBytes(body, contentType);
            });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private static Map<String, Object> buildSearchBody(PlacesSearchRequest req) {
        Map<String, Object> circle = Map.of(
            "center", Map.of("latitude", req.lat(), "longitude", req.lng()),
            "radius", req.radiusMiles() * 1609.344);
        java.util.LinkedHashMap<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("textQuery", req.keyword());
        body.put("locationBias", Map.of("circle", circle));
        body.put("maxResultCount", 20);
        if (req.pageToken() != null && !req.pageToken().isEmpty()) {
            body.put("pageToken", req.pageToken());
        }
        return body;
    }

    private static UpstreamException mapUpstreamHttpError(String surface, WebClientResponseException ex) {
        // 4xx (auth, quota, malformed) and 5xx (Google internal) all map to UPSTREAM_ERROR.
        // Generic user-safe message — never include ex.getResponseBodyAsString().
        return new UpstreamException(
            "Maps service is temporarily unavailable. Please try again.", ex);
    }

    private static boolean isTimeout(Throwable ex) {
        Throwable cur = ex;
        while (cur != null) {
            if (cur instanceof TimeoutException || cur instanceof java.util.concurrent.TimeoutException) {
                return true;
            }
            cur = cur.getCause();
        }
        return false;
    }

    public record PhotoBytes(byte[] bytes, MediaType contentType) {}
}
```

**Notes on the service:**

- The three `call*` methods are package-private to enable Spec 2's D2b test pattern (`Mockito.spy()` + `doReturn()`). Public methods call them through `this` so `spy()` can intercept.
- `mapUpstreamHttpError` is the chokepoint for the "Never Leak Upstream Error Text" rule (`02-security.md`). Always returns the generic message; the original `WebClientResponseException` is preserved as the cause for server-side logs only.
- `isTimeout` walks the cause chain because `WebClient` wraps timeouts in different exception types depending on whether the timeout came from the reactive `Mono.timeout()` or from the underlying Netty connection.
- `PhotoBytes` is a public nested record so the controller can return it without exposing the cache or the `Mono` machinery.
- The `@SuppressWarnings("unchecked")` annotations on the cast to `Map<String, Object>` are unavoidable when working with parsed-but-untyped JSON. Lombok or a stronger DTO would help but adds friction; the `@SuppressWarnings` is the documented trade-off.

---

#### `MapsController.java`

```java
package com.example.worshiproom.proxy.maps;

import com.example.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/proxy/maps")
@Validated
public class MapsController {

    private static final Logger log = LoggerFactory.getLogger(MapsController.class);

    private final GoogleMapsService service;

    public MapsController(GoogleMapsService service) {
        this.service = service;
    }

    @PostMapping("/places-search")
    public ProxyResponse<PlacesSearchResponse> placesSearch(@Valid @RequestBody PlacesSearchRequest req) {
        log.info("Places search received lat={} lng={} radiusMiles={} keywordLength={} hasPageToken={}",
            req.lat(), req.lng(), req.radiusMiles(), req.keyword().length(),
            req.pageToken() != null && !req.pageToken().isEmpty());
        PlacesSearchResponse result = service.search(req);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/geocode")
    public ProxyResponse<GeocodeResponse> geocode(
        @RequestParam @NotBlank @Size(min = 1, max = 200) String query
    ) {
        log.info("Geocode received queryLength={}", query.length());
        GeocodeResponse result = service.geocode(query);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/place-photo")
    public ResponseEntity<byte[]> placePhoto(
        @RequestParam
        @NotBlank
        @Pattern(regexp = "^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$",
                 message = "must match places/{placeId}/photos/{photoId}")
        String name
    ) {
        log.info("Place photo received nameLength={}", name.length());
        GoogleMapsService.PhotoBytes photo = service.fetchPhoto(name);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(photo.contentType());
        headers.setCacheControl("public, max-age=86400, immutable");
        // X-Request-Id is added by RequestIdFilter; don't duplicate here.
        return ResponseEntity.ok().headers(headers).body(photo.bytes());
    }
}
```

**Notes on the controller:**

- `@Validated` on the class enables method-level constraints on `@RequestParam` (e.g., the `@Pattern` on `place-photo`'s `name`). Without it, only `@Valid @RequestBody` constraints fire.
- The log lines follow `07-logging-monitoring.md` § PII handling: numeric counts and coordinates only, no `keyword`, no `query`, no `name` content. Coordinates are fine to log (they're not PII at rural-zip granularity).
- `place-photo` returns `ResponseEntity<byte[]>` directly (NOT wrapped in `ProxyResponse`). Per Architecture Decision #4, photo responses are binary; only error responses are JSON. The `@RestControllerAdvice` from Spec 1 still fires for exceptions thrown from this method, returning a JSON `ProxyError` with the appropriate status. Browsers and `<img>` tags handle the binary success natively.
- The `@Pattern` regex on `name` is the SSRF guard's first line of defense (rejected at the controller boundary with `MethodArgumentNotValidException` → 400 INVALID_INPUT). The `GoogleMapsService` re-checks the pattern as defense-in-depth (in case the controller is bypassed in a future test or refactor).

---

#### `ApiController.java` modification (health endpoint update)

The existing `/api/v1/health` endpoint adds a `googleMaps` provider entry. Spec 1 established the providers shape:

```java
// In ApiController.health():
return Map.of(
    "status", "ok",
    "providers", Map.of(
        "gemini", Map.of("configured", proxyConfig.getGemini().isConfigured()),
        "googleMaps", Map.of("configured", proxyConfig.getGoogleMaps().isConfigured()),  // NEW
        "fcbh", Map.of("configured", proxyConfig.getFcbh().isConfigured())               // already present, awaiting Spec 4 to wire to a real service
    )
);
```

Spec 1 provisioned all three provider stubs in the response (`gemini`, `googleMaps`, `fcbh`) so each subsequent Key Protection spec only needs to confirm the boolean is reading from the right config field. No new fields needed; verify the field is already there by reading the current `ApiController.java` before editing. If it's not (because Spec 1 only stubbed Gemini), add it.

---

### Backend tests

Four new test classes under `backend/src/test/java/com/example/worshiproom/proxy/maps/`. Mirror Spec 2's pattern (`@WebMvcTest` slice + `@SpringBootTest` integration + plain unit tests), with the testing seam from D2b applied to `WebClient` calls.

#### `MapsCacheKeysTest.java`

Plain JUnit unit tests. Six tests minimum:

1. `searchKey_normalizesKeywordCase()` — "CHURCH" and "church" produce the same key.
2. `searchKey_normalizesKeywordWhitespace()` — "  church  " and "church" produce the same key.
3. `searchKey_includesPageTokenWhenPresent()` — distinct page tokens produce distinct keys.
4. `searchKey_omitsPageTokenWhenNullOrEmpty()` — null and "" pageToken produce the same key (first page).
5. `geocodeKey_normalizesQueryCaseAndWhitespace()` — "Spring Hill, TN" and "  spring hill, tn  " produce the same key.
6. `photoKey_returnsNameUnchanged()` — photo names are stable opaque IDs; no normalization needed.

These ensure cache hits behave as expected and prevent subtle bugs where a UI variation in keyword casing causes cache misses and unnecessary upstream calls.

#### `GoogleMapsServiceTest.java`

Unit tests using `Mockito.spy()` on the service per D2b's pattern. Mock the three `call*` methods. ~18-22 tests minimum:

**Search method (8 tests):**

1. `search_happyPath_returnsPlacesAndPageToken()` — spy `callPlacesSearch` returns a Map with one place; assert `PlacesSearchResponse` shape.
2. `search_emptyResults_returnsEmptyList()` — Google returns `{}` (no `places` key); assert empty list, null token.
3. `search_cacheHitOnSecondCall()` — call twice with same params; spy fires once.
4. `search_cacheMissOnDifferentKeyword()` — different keywords → two upstream calls.
5. `search_pageTokenChangesCacheKey()` — same params with different `pageToken` → two upstream calls.
6. `search_4xxErrorMapsToUpstream()` — spy throws `WebClientResponseException(4xx)`; assert `UpstreamException` with generic message; assert original exception text NOT in thrown message.
7. `search_5xxErrorMapsToUpstream()` — same as above with 5xx.
8. `search_timeoutMapsToUpstreamTimeout()` — spy throws `TimeoutException` (or wraps one); assert `UpstreamTimeoutException`.

**Geocode method (6 tests):**

9. `geocode_happyPath_returnsCoords()` — spy returns `{status: "OK", results: [...]}`; assert lat/lng.
10. `geocode_zeroResults_returnsNoResult()` — spy returns `{status: "ZERO_RESULTS"}`; assert `GeocodeResponse.NO_RESULT`.
11. `geocode_emptyResults_returnsNoResult()` — spy returns `{status: "OK", results: []}`; assert `NO_RESULT`.
12. `geocode_overQueryLimit_throwsUpstream()` — spy returns `{status: "OVER_QUERY_LIMIT"}`; assert `UpstreamException`.
13. `geocode_cacheHitOnSecondCall()` — same query twice; spy fires once.
14. `geocode_negativeResultIsCached()` — failed lookup cached so typo hammering doesn't re-hit Google.

**Photo method (6 tests):**

15. `fetchPhoto_happyPath_returnsBytes()` — spy returns `PhotoBytes(bytes, JPEG)`; assert non-empty bytes.
16. `fetchPhoto_invalidNameRejected()` — pass `"../etc/passwd"`; assert `IllegalArgumentException` (becomes 400 via `ProxyExceptionHandler`).
17. `fetchPhoto_protocolInjectionRejected()` — pass `"https://evil.com/x"`; assert `IllegalArgumentException`.
18. `fetchPhoto_extraSlashRejected()` — pass `"places/x/photos/y/extra"`; assert `IllegalArgumentException`.
19. `fetchPhoto_cacheHitOnSecondCall()` — same valid name twice; spy fires once.
20. `fetchPhoto_emptyBodyMapsToUpstream()` — spy returns 200 with zero bytes; assert `UpstreamException`.

**Configuration boundary (2 tests):**

21. `nullClientConfig_throwsUpstream()` — `proxyConfig.getGoogleMaps().getApiKey()` is empty/null; assert `UpstreamException("Maps service is not configured on the server.")`.
22. `noLeakOfUpstreamErrorText()` — assert across all error paths that the original Google response body or exception message NEVER appears in the thrown `UpstreamException`'s message. Use `assertThat(ex).hasMessage(EXPECTED_GENERIC).hasNoMessageContaining("AIza", "google", "places.googleapis", "key=")`.

#### `MapsControllerTest.java`

`@WebMvcTest(MapsController.class)` slice. Mocks `GoogleMapsService` via `@MockBean`. Imports `ProxyExceptionHandler.class` AND `ProxyConfig.class` (D8 from Spec 2 — slice tests need ProxyConfig to bootstrap proxy properties). 12-15 tests:

**Places search endpoint (5 tests):**

1. `placesSearch_happyPath_returns200WithBody()` — POST valid body, mock service returns one place, assert response shape `{data: {places, nextPageToken}, meta: {requestId}}`.
2. `placesSearch_missingLat_returns400()` — missing required field; assert `INVALID_INPUT`.
3. `placesSearch_invalidLatRange_returns400()` — lat=100; assert `INVALID_INPUT`.
4. `placesSearch_invalidRadius_returns400()` — radiusMiles=51; assert `INVALID_INPUT`.
5. `placesSearch_serviceThrows_propagatesAsConfigured()` — service throws `UpstreamException`; assert 502 via handler.

**Geocode endpoint (3 tests):**

6. `geocode_happyPath_returns200WithCoords()` — assert response shape.
7. `geocode_missingQuery_returns400()` — assert `INVALID_INPUT`.
8. `geocode_emptyResult_returns200WithNulls()` — service returns `NO_RESULT`; assert `{data: {lat: null, lng: null}}`.

**Place photo endpoint (5 tests):**

9. `placePhoto_happyPath_returns200WithImageBytes()` — service returns `PhotoBytes`; assert `Content-Type: image/jpeg`, `Cache-Control: public, max-age=86400, immutable`, body length matches.
10. `placePhoto_invalidNameFormat_returns400()` — `name=../etc/passwd`; assert `INVALID_INPUT` JSON body (NOT image bytes).
11. `placePhoto_missingName_returns400()` — assert `INVALID_INPUT`.
12. `placePhoto_serviceThrowsUpstream_returns502JsonError()` — assert error body is JSON `ProxyError`, not bytes.
13. `placePhoto_xRequestIdHeaderPresent()` — verify `X-Request-Id` header on success response.

#### `MapsIntegrationTest.java`

`@SpringBootTest(webEnvironment = RANDOM_PORT)` + `@AutoConfigureMockMvc`. Mocks `WebClient` at the bean level so the full filter chain (RequestIdFilter, RateLimitFilter) runs but no real network calls happen. ~6-8 tests:

1. `fullLifecycle_placesSearch_returnsExpectedHeaders()` — `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` all present. Body matches contract.
2. `fullLifecycle_geocode_propagatesRequestId()` — `meta.requestId` in body matches `X-Request-Id` header.
3. `fullLifecycle_placePhoto_streamsBytesWithCorrectHeaders()` — happy path, assert `Content-Type` matches, `Cache-Control: public, max-age=86400, immutable` set, body bytes match expected.
4. `fullLifecycle_invalidInput_returnsProxyErrorShape()` — assert `{code, message, requestId, timestamp}` shape.
5. `fullLifecycle_rateLimitTriggers429()` — fire 31+ rapid requests, assert eventual 429 with `Retry-After`. (Dev profile burst is 30; this test should run with default rate limits, possibly via test-profile override.)
6. `fullLifecycle_corsHeadersPresent()` — preflight OPTIONS, assert `Access-Control-Allow-Origin`, `Access-Control-Expose-Headers` includes the three rate-limit headers + `Retry-After`.
7. `fullLifecycle_unconfiguredKeyReturns502()` — set `proxy.google-maps.api-key=""` in test properties, hit `/places-search`, assert 502 `UPSTREAM_ERROR` with message "Maps service is not configured on the server."
8. `fullLifecycle_noUpstreamErrorTextLeaks()` — mock WebClient throws an exception with secret-y text; assert response body has zero matches for the original exception message.

---

### OpenAPI additions

Three new path entries plus three new schemas plus an updated `Health` response schema. Insert into `backend/src/main/resources/openapi.yaml`. The exact insertion points should be verified against the current file structure (CC reads the file before editing per the standard plan-vs-reality discipline).

**Tag declarations (verify already present from Spec 1):**

```yaml
tags:
  - name: Health
  - name: Proxy / AI
  - name: Proxy / Places   # already declared in Spec 1; this spec uses it
  - name: Proxy / Audio
```

**Path additions (insert in path order):**

```yaml
/api/v1/proxy/maps/places-search:
  post:
    tags: [Proxy / Places]
    summary: Search for places by text query within a radius
    operationId: placesSearch
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: '#/components/schemas/PlacesSearchRequest' }
    responses:
      '200':
        description: Search results
        content:
          application/json:
            schema:
              type: object
              required: [data, meta]
              properties:
                data: { $ref: '#/components/schemas/PlacesSearchResponse' }
                meta: { $ref: '#/components/schemas/ResponseMeta' }
      '400': { $ref: '#/components/responses/BadRequest' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }
      '500': { $ref: '#/components/responses/InternalError' }

/api/v1/proxy/maps/geocode:
  get:
    tags: [Proxy / Places]
    summary: Geocode a free-text location query to coordinates
    operationId: geocode
    parameters:
      - in: query
        name: query
        required: true
        schema: { type: string, minLength: 1, maxLength: 200 }
        example: "Spring Hill, TN"
    responses:
      '200':
        description: Geocode result (coords or null pair for no-result)
        content:
          application/json:
            schema:
              type: object
              required: [data, meta]
              properties:
                data: { $ref: '#/components/schemas/GeocodeResponse' }
                meta: { $ref: '#/components/schemas/ResponseMeta' }
      '400': { $ref: '#/components/responses/BadRequest' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }
      '500': { $ref: '#/components/responses/InternalError' }

/api/v1/proxy/maps/place-photo:
  get:
    tags: [Proxy / Places]
    summary: Stream a Google Places photo by name
    operationId: placePhoto
    parameters:
      - in: query
        name: name
        required: true
        schema:
          type: string
          pattern: "^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$"
        example: "places/ChIJ.../photos/AbC123"
    responses:
      '200':
        description: Photo image bytes
        headers:
          Cache-Control:
            schema: { type: string, example: "public, max-age=86400, immutable" }
        content:
          image/jpeg:
            schema: { type: string, format: binary }
          image/png:
            schema: { type: string, format: binary }
          image/webp:
            schema: { type: string, format: binary }
      '400': { $ref: '#/components/responses/BadRequest' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }
      '500': { $ref: '#/components/responses/InternalError' }
```

**Schema additions (insert under `components.schemas`):**

```yaml
PlacesSearchRequest:
  type: object
  required: [lat, lng, radiusMiles, keyword]
  properties:
    lat: { type: number, format: double, minimum: -90, maximum: 90 }
    lng: { type: number, format: double, minimum: -180, maximum: 180 }
    radiusMiles: { type: integer, minimum: 1, maximum: 50 }
    keyword: { type: string, minLength: 1, maxLength: 200 }
    pageToken: { type: string, maxLength: 200, nullable: true }

PlacesSearchResponse:
  type: object
  required: [places]
  properties:
    places:
      type: array
      description: Raw Google Places API "places" array, passed through unchanged.
      items: { type: object, additionalProperties: true }
    nextPageToken: { type: string, nullable: true }

GeocodeResponse:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number, format: double, nullable: true }
    lng: { type: number, format: double, nullable: true }
```

**Health endpoint schema update (modify existing `Health` schema):**

```yaml
Health:
  type: object
  properties:
    status: { type: string, example: "ok" }
    providers:
      type: object
      properties:
        gemini:
          type: object
          properties: { configured: { type: boolean } }
        googleMaps:    # NEW (or verify present from Spec 1 stub)
          type: object
          properties: { configured: { type: boolean } }
        fcbh:
          type: object
          properties: { configured: { type: boolean } }
```

CC verifies these schemas exist via the Spec 1 OpenAPI structure (read first, then insert only what's missing). The `Proxy / Places` tag and the shared `BadRequest`/`RateLimited`/`UpstreamError`/`UpstreamTimeout`/`InternalError` responses + `ProxyError`/`ResponseMeta` schemas are already defined by Spec 1; this spec just references them.

---

## Frontend implementation

### `services/maps-readiness.ts` (new file)

```typescript
// One-time backend readiness probe for the Maps proxy. Called once at module
// load by local-support-service.ts to decide between Google and Mock services.
//
// Resolves to the cached boolean after the first successful health probe;
// retries indefinitely on probe failure (network down at app load shouldn't
// permanently fall back to mock).

let cachedReadiness: boolean | undefined
let inflightProbe: Promise<boolean> | undefined

const HEALTH_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/health`

async function probe(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, { method: 'GET' })
    if (!response.ok) return false
    const data = await response.json()
    return Boolean(data?.providers?.googleMaps?.configured)
  } catch {
    return false
  }
}

export async function getMapsReadiness(): Promise<boolean> {
  if (cachedReadiness !== undefined) return cachedReadiness
  if (inflightProbe) return inflightProbe
  inflightProbe = probe().then((ready) => {
    cachedReadiness = ready
    inflightProbe = undefined
    return ready
  })
  return inflightProbe
}

/** Test-only reset. Used by Vitest to clear cached state between tests. */
export function __resetMapsReadinessForTests(): void {
  cachedReadiness = undefined
  inflightProbe = undefined
}
```

The inflight-promise pattern prevents thundering-herd if multiple components call `getMapsReadiness()` concurrently before the first probe resolves. Returns `false` on any error (treats network failure as "not ready" → fall back to mock). The `__resetMapsReadinessForTests` follows the same pattern as `__resetGeminiClientForTests` from Spec 2.

### `services/local-support-service.ts` (modified)

The factory becomes async. Existing callers update to `await createLocalSupportService()`.

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

**Caller updates:** Every site that currently calls `createLocalSupportService()` needs `await`. CC searches for callers via `grep -r 'createLocalSupportService' frontend/src --include='*.ts' --include='*.tsx'` and updates each one. Most callers are likely already inside `useEffect` or async event handlers — adding `await` is a one-line change. If any caller is in a synchronous render path, refactor to a `useState`-cached service ref initialized inside an effect.

### `services/google-local-support-service.ts` (rewritten)

```typescript
import type { LocalSupportCategory, SearchParams, SearchResult } from '@/types/local-support'
import type { LocalSupportService } from './local-support-service'
import { calculateDistanceMiles } from '@/lib/geo'
import { mapGooglePlaceToLocalSupport, type GooglePlace } from './google-places-mapper'
import { geocodeCache } from './geocode-cache'

const PROXY_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/maps`
const PROXY_PLACES_SEARCH_URL = `${PROXY_BASE}/places-search`
const PROXY_GEOCODE_URL = `${PROXY_BASE}/geocode`
const REQUEST_TIMEOUT_MS = 15000  // backend has 10s upstream timeout; client gives 5s slack

// Map of (cacheKey → nextPageToken) populated from server responses.
// Mirrors Spec 2's pattern of preserving frontend client behavior even after
// the implementation moved server-side.
const pageTokens = new Map<string, string | null>()

function paramKey(params: SearchParams): string {
  const normalizedKeyword = params.keyword.trim().toLowerCase()
  return `${params.lat.toFixed(4)},${params.lng.toFixed(4)}:${params.radius}:${normalizedKeyword}`
}

function categoryFromKeyword(keyword: string): LocalSupportCategory {
  const lower = keyword.toLowerCase()
  if (lower.includes('celebrate recovery')) return 'celebrate-recovery'
  if (lower.includes('counselor') || lower.includes('therapist')) return 'counselors'
  return 'churches'
}

```typescript
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function readBackendError(response: Response): Promise<string> {
  // Backend errors are JSON ProxyError shape. Read defensively in case body
  // is empty or not JSON (network proxy stripped it, etc.).
  try {
    const data = await response.json()
    return typeof data?.message === 'string'
      ? data.message
      : `Maps service error ${response.status}`
  } catch {
    return `Maps service error ${response.status}`
  }
}

class GoogleLocalSupportService implements LocalSupportService {
  async search(params: SearchParams, page: number): Promise<SearchResult> {
    const category = categoryFromKeyword(params.keyword)
    const cacheKey = paramKey(params)

    let pageToken: string | null | undefined
    if (page > 0) {
      pageToken = pageTokens.get(cacheKey)
      if (!pageToken) return { places: [], hasMore: false }
    }

    const body = {
      lat: params.lat,
      lng: params.lng,
      radiusMiles: params.radius,
      keyword: params.keyword,
      pageToken: pageToken ?? null,
    }

    const response = await fetchWithTimeout(PROXY_PLACES_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(await readBackendError(response))
    }

```typescript
    const envelope = (await response.json()) as {
      data: { places?: GooglePlace[]; nextPageToken?: string | null }
      meta?: { requestId?: string }
    }

    const places = (envelope.data.places ?? [])
      .map((gp) => mapGooglePlaceToLocalSupport(gp, category))
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // Distance filter unchanged from pre-migration behavior — backend's
    // locationBias is a soft preference, so we enforce the hard radius here.
    const filtered = places.filter((p) => {
      const dist = calculateDistanceMiles(params.lat, params.lng, p.lat, p.lng)
      return dist <= params.radius
    })

    pageTokens.set(cacheKey, envelope.data.nextPageToken ?? null)
    return { places: filtered, hasMore: Boolean(envelope.data.nextPageToken) }
  }

  async geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const cached = geocodeCache.get(query)
    if (cached !== undefined) return cached

    const url = `${PROXY_GEOCODE_URL}?query=${encodeURIComponent(query)}`
    const response = await fetchWithTimeout(url, { method: 'GET' })

    if (!response.ok) {
      throw new Error(await readBackendError(response))
    }

    const envelope = (await response.json()) as {
      data: { lat: number | null; lng: number | null }
      meta?: { requestId?: string }
    }

    const result =
      envelope.data.lat == null || envelope.data.lng == null
        ? null
        : { lat: envelope.data.lat, lng: envelope.data.lng }

    geocodeCache.set(query, result)
    return result
  }
}

export function createGoogleService(): LocalSupportService {
  return new GoogleLocalSupportService()
}

/** Test-only: clear the page-token map between tests. */
export function __resetPageTokensForTests(): void {
  pageTokens.clear()
}
```

**Notes on the rewrite:**

- Public methods (`search`, `geocode`) keep identical signatures. The `LocalSupportService` interface is unchanged. Components that consume the service see no contract change.
- `mapGooglePlaceToLocalSupport` is called WITHOUT an `apiKey` argument (signature change covered in the next subsection).
- The frontend `geocodeCache` continues to short-circuit; backend cache provides a second layer for cache-miss scenarios.
- Distance filtering stays client-side (small response body, no value moving it server-side).
- Error responses from the backend are parsed for the user-safe message via `readBackendError`. Per Spec 1's `ProxyError` shape, `message` is always a generic user-safe string — never upstream error text.

### `services/google-places-mapper.ts` (modified)

Two changes:

1. `buildPhotoUrl` no longer takes `apiKey`. New signature: `buildPhotoUrl(photoName: string): string`. Body returns the backend-proxy URL.
2. `mapGooglePlaceToLocalSupport` signature drops the `apiKey` parameter (it was only used to construct photo URLs).

```typescript
const PROXY_PHOTO_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/maps/place-photo`

export function buildPhotoUrl(photoName: string): string {
  return `${PROXY_PHOTO_URL}?name=${encodeURIComponent(photoName)}`
}

export function mapGooglePlaceToLocalSupport(
  gp: GooglePlace,
  category: LocalSupportCategory,
): LocalSupportPlace | null {
  if (!gp.displayName?.text || !gp.location) return null
  if (gp.businessStatus === 'CLOSED_PERMANENTLY') return null

  const name = gp.displayName.text
  const description = gp.editorialSummary?.text ?? null
  const photoUrl = gp.photos?.[0]?.name ? buildPhotoUrl(gp.photos[0].name) : null
  const denomination = category === 'churches' ? inferDenomination(name, description) : null
  const specialties = category === 'counselors' ? inferSpecialties(name, description) : null

  return {
    id: gp.id,
    name,
    address: gp.formattedAddress ?? 'Address unavailable',
    phone: gp.nationalPhoneNumber ?? gp.internationalPhoneNumber ?? null,
    website: gp.websiteUri ?? null,
    lat: gp.location.latitude,
    lng: gp.location.longitude,
    rating: gp.rating ?? null,
    photoUrl,
    description,
    hoursOfOperation: gp.regularOpeningHours?.weekdayDescriptions ?? null,
    category,
    denomination,
    specialties,
  }
}
```

`inferDenomination`, `inferSpecialties`, the `GooglePlace` interface, and the `DENOMINATION_OPTIONS`/`SPECIALTY_OPTIONS` imports are all unchanged. Only `buildPhotoUrl`'s body and `mapGooglePlaceToLocalSupport`'s signature change.

### `lib/env.ts` (modified)

Remove three exports and the module-level constant:

- Delete `requireGoogleMapsApiKey` function
- Delete `isGoogleMapsApiKeyConfigured` function
- Delete the `GOOGLE_MAPS_API_KEY` constant at the top of the file

The leading comment block stays unchanged. The other helpers (VAPID, FCBH, all unchanged) stay.

### `vite-env.d.ts` (modified)

Remove the `readonly VITE_GOOGLE_MAPS_API_KEY?: string` line from the `ImportMetaEnv` interface. The other env vars (`VITE_API_BASE_URL`, `VITE_AUDIO_BASE_URL`, `VITE_VAPID_PUBLIC_KEY`, `VITE_FCBH_API_KEY`) remain.

### `.env.example` (modified)

Remove the `VITE_GOOGLE_MAPS_API_KEY=` block. Spec 4 will remove `VITE_FCBH_API_KEY`; Spec 5 wraps up the wave.

### Frontend test rewrites

#### `services/__tests__/google-local-support-service.test.ts`

Replace the existing direct-Google-API mocks with `fetch` mocks targeting the backend proxy. Test count stays roughly the same (~25-30 tests). New test categories:

**Happy path (4 tests):**

1. `search_callsBackendProxyWithCorrectBody()` — fetch mock asserts URL is `/api/v1/proxy/maps/places-search` and body matches `PlacesSearchRequest` shape.
2. `search_returnsMappedAndDistanceFilteredResults()` — fetch returns mock places, assert filter applied.
3. `search_paginatesViaPageToken()` — first call stores token, second call sends it.
4. `geocode_callsBackendProxyWithEncodedQuery()` — fetch mock asserts URL is `/api/v1/proxy/maps/geocode?query=...`.

**Backend error mapping (5 tests):**

5. `search_400FromBackendThrowsWithUserSafeMessage()` — fetch returns 400 with `{code, message, requestId}`; assert thrown error includes the message text.
6. `search_429FromBackendIncludesRetryHint()` — assert message includes "rate limit" or "Try again".
7. `search_502FromBackendThrowsUnavailable()` — assert generic "temporarily unavailable" message.
8. `search_504FromBackendThrowsTimeout()` — assert "timed out" message.
9. `geocode_502FromBackendThrows()` — same shape as search.

**Cache behavior (3 tests):**

10. `geocode_clientCacheShortCircuitsRepeatLookups()` — second call with same query, fetch fires once.
11. `geocode_negativeResultIsCached()` — null result still caches.
12. `geocode_differentQueryHitsBackendAgain()` — different query → second fetch.

**Network errors (3 tests):**

13. `search_networkErrorPropagates()` — fetch throws (network down); assert error propagates.
14. `search_abortRespected()` — calling with an already-aborted signal throws AbortError immediately.
15. `search_timeoutTriggersAbort()` — slow fetch (>15s) aborts, throws.

**Pagination (3 tests):**

16. `search_secondPageWithoutFirstReturnsEmpty()` — page=1 without prior page=0 → empty result, no fetch.
17. `search_pageTokenMapResetByHelper()` — `__resetPageTokensForTests()` clears state.
18. `search_distinctParamsHaveDistinctTokens()` — different keywords have independent token state.

#### `services/__tests__/google-places-mapper.test.ts`

Update `buildPhotoUrl` expectations to assert the backend-proxy URL shape. Update `mapGooglePlaceToLocalSupport` callers to drop the `apiKey` argument. ~3-4 test updates.

#### `services/__tests__/local-support-service.test.ts`

Update factory tests to mock `getMapsReadiness` instead of `isGoogleMapsApiKeyConfigured`. ~3-4 tests:

1. `factory_returnsGoogleServiceWhenBackendReady()` — mock `getMapsReadiness` returns `true`.
2. `factory_returnsMockServiceWhenBackendNotReady()` — mock returns `false`.
3. `factory_returnsMockServiceOnReadinessProbeFailure()` — mock throws/rejects → mock service.
4. `factory_isAsync()` — type-level assertion that the return is `Promise<LocalSupportService>`.

Also test the new `maps-readiness.ts` module separately:

#### `services/__tests__/maps-readiness.test.ts` (new)

5 tests:

1. `getMapsReadiness_returnsTrueWhenHealthReports configured()` — fetch mock returns `{providers: {googleMaps: {configured: true}}}`.
2. `getMapsReadiness_returnsFalseWhenHealthReportsNotConfigured()` — `{configured: false}`.
3. `getMapsReadiness_returnsFalseOnFetchError()` — fetch rejects.
4. `getMapsReadiness_cachesAfterFirstSuccess()` — call twice, fetch fires once.
5. `getMapsReadiness_concurrentCallsShareInflightProbe()` — two `Promise.all` calls fire one fetch.

---

## Pre-Execution Checklist

Before kicking off `/execute-plan-forums` for this spec, Eric verifies (or CC verifies and surfaces):

### Branch state

- [ ] Current branch: `claude/feature/ai-proxy-maps`
- [ ] `git status` clean (no uncommitted changes from prior work)
- [ ] `git log main --oneline -5` shows BOTH the Spec 1 ("AI proxy foundation") and Spec 2 ("Spec 2: migrate Gemini to backend proxy") merge commits

### Backend baseline

- [ ] `cd backend && ./mvnw test` passes — all Spec 1 + Spec 2 tests green (count should match what was on main after Spec 2 merged)
- [ ] `proxy.google-maps.api-key` config wiring is present in `ProxyConfig.java` (already there from Spec 1)
- [ ] `backend/.env.local` has `GOOGLE_MAPS_API_KEY=AIza...` populated

### Maps key provisioning (Spec 3 specific — this is the long-pole prerequisite)

Per Spec 2's D6 lessons, the frontend Maps key (`VITE_GOOGLE_MAPS_API_KEY`) is HTTP-referer-restricted and won't work for server-to-server calls. A new backend-only Maps key MUST be provisioned via Cloud Console:

- [ ] New Maps key created in [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials), signed in as Eric's **personal** Google account (echamplin3@yahoo.com), NOT @daveramsey.com
- [ ] **Application restrictions: None** (server-to-server, no referer header to match)
- [ ] **API restrictions: Restrict key**, with both **Places API (New)** AND **Geocoding API** checked. The "(New)" suffix matters — there are two Places APIs, and the v1 endpoint we use is the New one.
- [ ] Both APIs enabled in the project: APIs & Services → Library → Places API (New) → Enable; same for Geocoding API
- [ ] (Recommended) Daily quota cap on each API: APIs & Services → Quotas → set ~500-1000/day as a runaway-cost safety net while solo dev
- [ ] Key value pasted into `backend/.env.local` as `GOOGLE_MAPS_API_KEY=AIza...` (NOT prefixed with `VITE_`)

**Org-policy gotcha (per Spec 2 D6):** if you hit "must bind to service account" when creating the key, your Google account is governed by a Google Workspace org policy. There's no AI Studio escape hatch for Maps (unlike Gemini). Workarounds:
1. Switch to an incognito window with a non-Workspace personal Google account
2. Or accept the service-account dance (additional 10-15 minutes of GCP UI navigation)

CC should surface this if the curl smoke at Step N (TBD by /plan-forums) returns a 403 with "REQUEST_DENIED" — diagnostic signature is the same as Spec 2's D6 referer-block.

### Frontend baseline

- [ ] `cd frontend && npm install` (in case of any dep drift since last session)
- [ ] `cd frontend && npm test -- --run` — full suite passes against Spec 2 baseline
- [ ] `cd frontend && npm run build` — production build succeeds
- [ ] Bundle scan baseline: `grep -r 'AIzaSyB32xNSMGT7NJiITWAyTsUF89IQEsyWNOg' frontend/dist/assets/*.js | wc -l` should report `1` (the current Maps key is still in the bundle pre-migration; this number drops to `0` after Spec 3 ships)

### CI / Docker readiness

- [ ] Docker Desktop running
- [ ] `docker compose up -d --force-recreate backend` brings backend up clean (verify `Started WorshipRoomApplication` in logs, no "GOOGLE_MAPS_API_KEY is not configured" warn)

### Charter carryover from Spec 2

The decision-charter amendments codified during Spec 2 still apply. CC operates with auto-decision authority for the seven-condition gate (no public API change, no behavior change, no rules/spec/plan edits, no security/auth/CORS/logging/PII/rate-limit surface, no scope change, no cross-spec precedent, alternative is strictly worse). Uncertainty always = stop. Docker Compose lifecycle ops are auto-approved mechanical cleanup. Orphan-symbol cleanup is auto-approved when all hits are in test files / `.d.ts` / doc comments. Framework-level PII leaks treated same as code-level. Secret fingerprints (prefix+suffix) instead of full values when surfacing.

### Documented carryover deviations to expect

Reusing Spec 2's lessons, anticipate these likely deviations during Spec 3 execution and pre-plan responses:

- **D-pattern from D2b**: `WebClient`-based service may have similar test-mocking friction. The `callPlacesSearch`/`callGeocode`/`callPlacePhoto` package-private seams in `GoogleMapsService` are the spec's pre-applied solution. If `WebClient`'s fluent builder is too painful to mock at any test boundary, fall back to `Mockito.spy()` + `doReturn()` on these methods (already the spec's convention).
- **D-pattern from D6**: GCP key provisioning. Pre-execution checklist above is the spec's pre-applied solution.
- **D-pattern from D7**: Framework-level log suppression for `org.springframework.web.servlet.mvc.method.annotation` is already in `application-dev.properties`. The `@RequestBody` body-processor that triggered D7 fires for `MapsController`'s places-search POST too; the existing override covers it. No new logging suppression needed for Spec 3.

---

## Acceptance Criteria

### Functional

- [ ] `POST /api/v1/proxy/maps/places-search` returns 200 with `{data: {places, nextPageToken}, meta: {requestId}}` shape for valid request bodies, hitting real Google Places API.
- [ ] `GET /api/v1/proxy/maps/geocode?query=...` returns 200 with `{data: {lat, lng}, meta: {requestId}}` for resolvable queries; returns 200 with `{data: {lat: null, lng: null}}` for unresolvable queries (matches `ZERO_RESULTS`).
- [ ] `GET /api/v1/proxy/maps/place-photo?name=...` returns 200 with image bytes, correct `Content-Type`, and `Cache-Control: public, max-age=86400, immutable` for valid photo names.
- [ ] All three endpoints return correct error shapes for invalid input (400), rate limit (429), upstream failure (502), upstream timeout (504), unexpected errors (500).
- [ ] `/api/v1/health` includes `providers.googleMaps.configured: boolean` reading from `proxy.google-maps.api-key`.
- [ ] Local Support feature (`/local-support` route) functions identically from the user's perspective: search a category, see paginated results, geocode a location string. No regression in search results, photos, ratings, hours, etc.
- [ ] Pagination works end-to-end: tap "Load more", second page of results appears, eventually exhausts.

### Security (the Spec 3 reason-for-existing)

- [ ] `frontend/dist/assets/*.js` contains ZERO matches for the production Maps API key value (`AIzaSyB32xNSMGT7NJiITWAyTsUF89IQEsyWNOg` or whatever the current frontend key is). Verified via `grep -r '<key-value>' frontend/dist/assets/ | wc -l` returning `0`.
- [ ] `frontend/dist/assets/*.js` contains ZERO matches for `places.googleapis.com` and ZERO matches for `maps.googleapis.com/maps/api/geocode`. The frontend never calls Google directly after this spec.
- [ ] `frontend/dist/assets/*.js` contains ZERO matches for `VITE_GOOGLE_MAPS_API_KEY`. The env var is fully decommissioned from frontend code.
- [ ] Network tab on `/local-support` shows ALL Maps-related requests going to `localhost:8080/api/v1/proxy/maps/*` (or the prod backend equivalent). ZERO requests to `*.googleapis.com`.
- [ ] Photo `<img src="...">` URLs in rendered Local Support cards point to the backend proxy (`/api/v1/proxy/maps/place-photo?name=...`), NOT to `places.googleapis.com/v1/.../media?key=...`.

### Backend security invariants (carried from Spec 1 + Spec 2)

- [ ] No upstream error text leaks to the client. Verified by `noLeakOfUpstreamErrorText` test in `GoogleMapsServiceTest`.
- [ ] All three caches in `GoogleMapsService` have explicit `maximumSize` AND `expireAfterWrite` per `02-security.md` § BOUNDED EXTERNAL-INPUT CACHES.
- [ ] SSRF guard on `place-photo` rejects `../etc/passwd`, `https://evil.com/x`, and `places/x/photos/y/extra` shapes with 400 INVALID_INPUT before any upstream call.
- [ ] Backend logs (dev profile) contain ONLY counts and coordinates for places-search/geocode requests — no `keyword`, `query`, or `name` content. Verified via `docker compose logs backend | grep -E 'keyword|query|name=' | wc -l` returning `0` for sensitive substrings post-request.
- [ ] D7 framework-log-suppression in `application-dev.properties` continues to hold; `RequestResponseBodyMethodProcessor` does not log `PlacesSearchRequest.toString()` content at DEBUG level.
- [ ] `X-Request-Id` header present on all responses (success and error). `meta.requestId` in success body matches the header.
- [ ] `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers present on all responses (inherited from Spec 1's `RateLimitFilter` scoped to `/api/v1/proxy/**`).
- [ ] `Retry-After` header present on 429 responses (also from Spec 1's filter).

### Performance / cost

- [ ] Backend cache hit on places-search (same lat/lng/radius/keyword) returns response in <50ms (vs. ~300-1000ms for upstream call).
- [ ] Backend cache hit on geocode returns response in <20ms.
- [ ] Backend cache hit on photo returns bytes in <30ms (vs. ~100-300ms for upstream + bandwidth).
- [ ] Repeat searches in the same metro area (e.g., 10 users searching "non-denominational church near Spring Hill, TN" within 6h) hit the cache, not Google.

### Test coverage

- [ ] All ~22 backend unit tests in `GoogleMapsServiceTest` pass.
- [ ] All ~13 backend slice tests in `MapsControllerTest` pass.
- [ ] All ~8 backend integration tests in `MapsIntegrationTest` pass.
- [ ] All 6 backend cache-key unit tests in `MapsCacheKeysTest` pass.
- [ ] Frontend test suite (`npm test`) passes with ~30+ updated/new tests for the Maps proxy migration.
- [ ] No tests skipped or marked `xit`/`it.skip`.

### CI / build

- [ ] `cd backend && ./mvnw test` exit code 0.
- [ ] `cd frontend && npm run build` succeeds.
- [ ] `cd frontend && npm test -- --run` exit code 0.
- [ ] `cd backend && ./mvnw verify` (if integration tests run via verify phase) exit code 0.

### Verification with playwright

- [ ] `/verify-with-playwright _plans/<spec-3-plan>.md` (plan-only invocation per the convention) auto-derives `/local-support` route, runs end-to-end. All UI flows pass: search churches near a location, geocode a location string, paginate, see photos render. Bundle scan in playwright-recon confirms zero leaked keys.

### Operational

- [ ] After merge, the OLD frontend Maps key (`AIzaSyB32xNSMGT7NJiITWAyTsUF89IQEsyWNOg` or whatever it is) can be safely deactivated in GCP Console — nothing reads it anymore. (Eric to-do post-merge, not blocking.)
- [ ] After merge, the dead `VITE_GOOGLE_MAPS_API_KEY=` line in personal `frontend/.env.local` files can be deleted (cosmetic only, zero functional effect).

---

## See Also

- `_specs/ai-proxy-foundation.md` (Spec 1, merged) — provides `ProxyResponse`, `ProxyError`, `ProxyException`, `WebClient`, `RateLimitFilter`, `RequestIdFilter`, `ProxyExceptionHandler`, `ProxyConfig.GoogleMapsProperties`, `Health` endpoint with `providers.googleMaps` slot.
- `_specs/ai-proxy-gemini.md` (Spec 2, merged) — pattern reference. Spec 3 follows the same migration shape with three-endpoint variation. D1–D7 deviation log informs Spec 3's pre-execution checklist.
- `_specs/ai-proxy-fcbh.md` (Spec 4, future) — same pattern for FCBH audio. Will likely have one endpoint (audio stream) and follow Spec 3's binary-streaming pattern from `place-photo`.
- `_specs/ai-proxy-ask.md` (Spec 5, future) — wraps up the Key Protection wave with the Ask AI integration.
- `.claude/rules/02-security.md` § BOUNDED EXTERNAL-INPUT CACHES — applied to all three Caffeine caches in `GoogleMapsService`.
- `.claude/rules/02-security.md` § Never Leak Upstream Error Text — enforced via `mapUpstreamHttpError` chokepoint and the `noLeakOfUpstreamErrorText` test.
- `.claude/rules/03-backend-standards.md` § proxy subpackage convention — places `proxy.maps.*` package alongside `proxy.ai.*` and `proxy.common.*`.
- `.claude/rules/07-logging-monitoring.md` § Framework Log Suppression — already covers `MapsController`'s `@RequestBody` deserialization via the package-level override.
