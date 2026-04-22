# AI Proxy: FCBH Digital Bible Platform Frontend Migration (Spec 4 of 5, closes Key Protection Wave)

**Spec ID:** ai-proxy-fcbh
**Wave:** Key Protection (5-spec series — Spec 1 foundation, Spec 2 Gemini, Spec 3 Maps all merged; this spec 4 closes the wave. Originally-numbered Spec 5 ("ai-proxy-ask") was absorbed into the separate AI Integration wave as AI-1 and has already shipped.)
**Track:** Backend proxy endpoints + frontend service migration
**Branch:** `claude/feature/ai-proxy-fcbh` — cut from `main` after AI-3 (`ai-integration-journal`) merges
**Depends on:** Spec 1 (`ai-proxy-foundation.md`) merged — provides `ProxyResponse`, `ProxyError`, `ProxyException`, `WebClient` bean, `RateLimitFilter`, `RequestIdFilter`, `ProxyExceptionHandler`, `IpResolver`, and the pre-wired `proxy.fcbh.api-key` config binding in `ProxyConfig.FcbhProperties`. Spec 3 (`ai-proxy-maps.md`) merged — provides the closest template (WebClient-based service, Caffeine caches, domain-based URL pattern `/api/v1/proxy/{domain}/*`, health-endpoint readiness probe pattern).

> **Prerequisite verification:** run `git log main --oneline -20` and confirm the "AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration", "AI-1: Ask AI Gemini integration", "AI-2: Prayer generation Gemini integration", and "AI-3: Journal reflection Gemini integration" merge commits are all visible. If any is missing, do not proceed.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-proxy-fcbh` throughout.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT run `git checkout`, `git commit`, `git push`, or any git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current`.** If it's not `claude/feature/ai-proxy-fcbh`, STOP and surface.
3. **Only metadata is proxied. Audio bytes keep streaming directly from signed CloudFront URLs** (`d1gd73roq7kqw6.cloudfront.net`). The backend calls `https://4.dbt.io/api/*` for chapter lookups, but the `path` field in each chapter response is a short-lived signed CloudFront URL that the frontend uses AS-IS for the actual audio playback. Do NOT proxy the mp3 bytes through the backend — that would waste bandwidth, break Howler's range requests, and create an SSRF-adjacent surface. The backend only proxies JSON metadata.
4. **Preserve the DBP `book_id` validation.** The frontend currently guards against a DBP bug where invalid book codes return a 200 OK with a fallback 1 Chronicles recording (see `dbp-client.ts` line 149-153). This guard stays in the frontend after migration. The backend passes the response through unchanged; the client-side check remains the authoritative defense.
5. **Map upstream 404 to backend 404 (not 502).** The frontend treats DBP 404 specially — it's how the AudioPlayButton decides to hide itself when a chapter has no audio. Changing 404 → 502 would break the "hide button on 404" UX. This is a deliberate deviation from Spec 2/3's error mapping (which always route upstream errors through `UpstreamException` → 502). See Architecture Decision #5.
6. **Do NOT add Maven dependencies.** `spring-boot-starter-webflux` (WebClient) and Caffeine (transitive from Spring Boot Cache) are present from Specs 1 and 3. No new deps.
7. **Do NOT touch any Spec 2 / AI-1/2/3 files.** The `ai` subpackage (`GeminiController`, `AskService`, `PrayerService`, `JournalReflectionService`, etc.) is out of scope — FCBH is an unrelated proxy domain.
8. **Do NOT re-export the FCBH key from the frontend after migration.** `requireFcbhApiKey`, `getFcbhApiKey`, `isFcbhApiKeyConfigured` in `frontend/src/lib/env.ts` are all DELETED by this spec. Any lingering reference anywhere in the frontend is a spec violation.

---

## Why this spec exists

Today, the frontend calls FCBH's Digital Bible Platform (DBP) v4 API directly from the browser. `dbp-client.ts` builds request URLs like:

```
https://4.dbt.io/api/bibles/filesets/EN1WEBN2DA/JHN/3?v=4&key=AIza...
```

and sends them from every user's browser. The `VITE_FCBH_API_KEY` is inlined into the production JavaScript bundle at build time. Anyone can find it in DevTools → Sources, View Source on the page, or inspect any audio metadata request in the Network tab.

Per the bb-26 recon (`_plans/recon/bb26-audio-foundation.md` § 1), the pattern observed from DBP — ACAO:*, application-URL registration, client-side-intended — suggests DBP treats keys as client-safe (like Google Maps JS keys). That doesn't change the three practical problems:

1. **Rate-limit exposure.** DBP returns `x-ratelimit-limit: 1500` per key, shared across all Worship Room users. A scraped key lets an attacker exhaust that budget, causing `429 Too Many Requests` for real users. A backend with Caffeine caches absorbs repeat requests before they reach DBP, multiplying the effective ceiling.
2. **GitHub secret-scanning alerts.** GitHub's scanner treats any key-shaped string in the repo as a leak, regardless of the provider's tolerance. Having the key in the bundle and in `.env.example` comments keeps flagging the repo even when the exposure is "acceptable" in DBP's own terms.
3. **Internal inconsistency.** Spec 3's `frontend/src/lib/env.ts` carries a comment warning "No frontend code should reintroduce VITE_GOOGLE_MAPS_API_KEY." Meanwhile `VITE_FCBH_API_KEY` sits three lines above it, still being inlined. That cognitive drift is a trap for future contributors.

This spec:

1. Adds four backend endpoints under `/api/v1/proxy/bible/`:
   - `GET /bibles?language=eng` — list audio bibles. Returns the DBP envelope unchanged.
   - `GET /filesets/{filesetId}` — fileset catalog. Used by `getBibleFilesets()` (currently unused by the app but present in the client for future work; test for parity).
   - `GET /filesets/{filesetId}/{bookCode}/{chapter}` — chapter audio URL lookup. **Hot path.** Called on every chapter open.
   - `GET /timestamps/{filesetId}/{bookCode}/{chapter}` — BB-44 verse-level timing data.
2. Adds three bounded Caffeine caches (bibles list, fileset catalog, per-chapter audio) in `FcbhService` to shield the shared 1500/window DBP budget.
3. Rewrites `frontend/src/lib/audio/dbp-client.ts` to fetch from `/api/v1/proxy/bible/*` instead of calling DBP directly. All four public functions (`listAudioBibles`, `getBibleFilesets`, `getChapterAudio`, `getChapterTimestamps`) keep identical signatures. Error shape stays `DbpError`. The `book_id` validation guard stays.
4. Removes `requireFcbhApiKey`, `getFcbhApiKey`, `isFcbhApiKeyConfigured`, and the `FCBH_API_KEY`/`FCBH_API_KEY_RAW` module-level constants from `frontend/src/lib/env.ts`. Removes `VITE_FCBH_API_KEY` from `frontend/.env.example` (with a decommissioning comment matching the Spec 3 Maps precedent).
5. Replaces the `isFcbhApiKeyConfigured()` call site in the AudioPlayButton gating logic with an async `fcbh-readiness.ts` probe that hits `/api/v1/health` and reads `providers.fcbh.configured`. Mirrors the `maps-readiness.ts` pattern from Spec 3.
6. Extends `backend/src/main/resources/openapi.yaml` with the four new paths and their schemas. Updates the existing health-endpoint schema's providers block (no structural change — `fcbh.configured` is already reported by `ApiController.health()` since Spec 1).

After this spec ships, `grep -rc 'AIza\|VITE_FCBH\|4\.dbt\.io' frontend/dist/` returns 0. The only FCBH key in existence lives in `backend/.env.local` (or the hosted platform's env store) and is never sent to a browser. The "zero secret API keys in the frontend bundle" goal is complete — this spec closes the Key Protection Wave.

---

## Affected Frontend Routes

- `/bible/:book/:chapter` — BibleReader with the AudioPlayButton. The only consumer of the DBP client.

---

## Files touched

| File | Change | Purpose |
|---|---|---|
| `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhController.java` | Create | Four GET endpoints under `/api/v1/proxy/bible/`: `/bibles`, `/filesets/{id}`, `/filesets/{id}/{book}/{chapter}`, `/timestamps/{id}/{book}/{chapter}`. Thin — delegates to `FcbhService`. Path-variable validation via `@Validated` + `@Pattern` for filesetId/bookCode (SSRF defense-in-depth even though the upstream URL is built server-side). |
| `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhService.java` | Create | Wraps `WebClient` calls to `https://4.dbt.io/api/*`. Owns the FCBH API key, three Caffeine caches (bibles, filesets, per-chapter), and error mapping. Three package-private test seams (`callBibles`, `callFileset`, `callChapter`, `callTimestamps`) following Spec 2/3's D2b pattern. Maps `WebClientResponseException` with `404` status to a dedicated `FcbhNotFoundException` rather than generic `UpstreamException` — see AD #5. |
| `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhNotFoundException.java` | Create | Extends `ProxyException`. Maps to HTTP 404 via a new branch in `ProxyExceptionHandler`. Carries a user-safe message "Audio not available for this chapter." and an error code of `NOT_FOUND`. |
| `backend/src/main/java/com/example/worshiproom/proxy/bible/FcbhCacheKeys.java` | Create | Static helpers for cache-key normalization: `biblesKey(language)`, `filesetKey(filesetId)`, `chapterKey(filesetId, bookCode, chapter)`, `timestampKey(filesetId, bookCode, chapter)`. Uppercases fileset/book codes so case typos hit the same entry. |
| `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyExceptionHandler.java` | Modify | Add one branch mapping `FcbhNotFoundException` → `ResponseEntity.status(404).body(ProxyError.of("NOT_FOUND", ex.getMessage(), MDC.get("requestId")))`. No other existing branches change. |
| `backend/src/main/java/com/example/worshiproom/proxy/common/ProxyError.java` | No change | `NOT_FOUND` code joins the existing enum-equivalent string constants if one exists. If `ProxyError` uses free-form string codes, no edit; document the new code in the OpenAPI response schema only. |
| `backend/src/main/resources/openapi.yaml` | Modify | Add four new paths (`/api/v1/proxy/bible/bibles`, `/api/v1/proxy/bible/filesets/{filesetId}`, `/api/v1/proxy/bible/filesets/{filesetId}/{bookCode}/{chapter}`, `/api/v1/proxy/bible/timestamps/{filesetId}/{bookCode}/{chapter}`). Add `NotFound` response under `components.responses`. Add pass-through schemas for DBP envelopes. |
| `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhControllerTest.java` | Create | `@WebMvcTest` slice — validates each endpoint's path-param constraints, verifies 404 maps to `NOT_FOUND` code, verifies 502/504 map to `UPSTREAM_ERROR`/`UPSTREAM_TIMEOUT`. Eight tests. |
| `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhServiceTest.java` | Create | Unit tests with `Mockito.spy()` + `doReturn()` on the package-private `call*` seams. Covers cache hit/miss for each cache, 404-distinct path, WebClient error mapping, null-key guard. ~14 tests. |
| `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhIntegrationTest.java` | Create | `@SpringBootTest` end-to-end — `@MockBean FcbhService`, asserts full HTTP response including headers, ProxyError shape on 404/502, request-ID round-trip. Five tests. |
| `backend/src/test/java/com/example/worshiproom/proxy/bible/FcbhCacheKeysTest.java` | Create | Unit tests for cache-key normalization. Four tests — same fileset in different cases hits the same key; book-code case variations; null/blank language defaults to "eng". |
| `frontend/src/lib/audio/dbp-client.ts` | Modify | Rewrite: remove `DBP_BASE_URL = 'https://4.dbt.io/api'`, remove `buildUrl()`, remove `requireFcbhApiKey` import. Add `PROXY_BASE = \`${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/bible\``. Each public function fetches from the corresponding proxy path. All function signatures preserved. `DbpError` shape preserved. The `book_id` validation in `getChapterAudio` stays verbatim. |
| `frontend/src/lib/env.ts` | Modify | Remove `FCBH_API_KEY_RAW`, `FCBH_API_KEY`, `requireFcbhApiKey`, `getFcbhApiKey`, `isFcbhApiKeyConfigured`. Replace the removed section with a two-line decommissioning comment mirroring the Google Maps comment ("FCBH API key decommissioned from frontend in Spec 4. All DBP calls route through /api/v1/proxy/bible/*"). |
| `frontend/src/services/fcbh-readiness.ts` | Create | New module, shape mirrors `maps-readiness.ts`: `checkFcbhReadiness()` hits `/api/v1/health`, reads `providers.fcbh.configured`, caches the boolean, protects against thundering herd via an in-flight promise. Exports `getFcbhReadiness()` and `resetFcbhReadinessCache()` (test helper). |
| `frontend/.env.example` | Modify | Remove the `VITE_FCBH_API_KEY=your-fcbh-api-key-here` line and its surrounding comment block. Replace with a decommissioning comment: "FCBH: the VITE_FCBH_API_KEY was decommissioned in Spec 4 (ai-proxy-fcbh). The FCBH API key now lives only on the backend as FCBH_API_KEY... Do not reintroduce a frontend FCBH key." |
| `frontend/src/lib/audio/__tests__/dbp-client.test.ts` | Modify | Replace per-test env stubbing of `VITE_FCBH_API_KEY` with fetch mocks targeting `/api/v1/proxy/bible/*`. Remove the "throws missing-key when key unset" test (no longer applicable; replaced by a readiness-probe test in the new file). All other existing tests adapt to new URLs; same `DbpError` assertions. |
| `frontend/src/services/__tests__/fcbh-readiness.test.ts` | Create | Tests for the new readiness probe. ~7 tests: happy path (returns true), configured=false (returns false), network error (returns false), cache hit (no re-fetch), thundering herd (single in-flight fetch), reset helper, malformed health response (returns false). |
| `frontend/src/lib/__tests__/env.test.ts` | Modify | Remove all `FCBH_API_KEY` / `requireFcbhApiKey` tests. Keep VAPID-related tests intact. |
| `frontend/src/components/audio/AudioPlayButton.tsx` *(or wherever the visibility gate lives)* | Modify | Swap `isFcbhApiKeyConfigured()` call for `await getFcbhReadiness()`. Recon has not yet pinpointed this file — Step 1 of the plan will grep the frontend for `isFcbhApiKeyConfigured\\(` and adjust only the call sites found. |

**Net changes:** backend gains ~450 lines of Java + ~80 lines of YAML + ~350 lines of tests. Frontend loses ~60 lines (env helpers + key-bearing URL building) and gains ~90 lines (proxy fetch calls + readiness probe + tests). Total ≈ +780 / -100. About 17 files touched.

**Net runtime impact:** Every DBP call now hops through the backend, adding one round trip to the app's own server before reaching DBP. For the hot path (chapter open), the backend cache absorbs repeat calls within 6 hours, so subsequent opens of the same chapter hit cache and are *faster* than today (no DBP call at all). Cold first-open adds ~50-100ms (localhost) or ~200-400ms (deployed) — acceptable given audio load already takes 1-2s.

---

## Architecture decisions

**1. URL path is `/api/v1/proxy/bible/*`, not `/fcbh/*`.** Matches Spec 3's domain-based precedent (`/proxy/maps/*` proxies Google Maps; `/proxy/ai/*` proxies Gemini). `bible` describes the domain — Bible audio metadata — and keeps the frontend agnostic of which upstream provider serves it. If Worship Room ever swaps FCBH for a different Bible audio source, the frontend URL doesn't change.

**2. Backend proxies metadata ONLY. Audio mp3 bytes continue to stream directly from signed CloudFront URLs** (`d1gd73roq7kqw6.cloudfront.net`) to the user's browser. Rationale:
   - The FCBH key is only required for the DBP metadata endpoints (`4.dbt.io/api/*`). The CloudFront audio URLs carry their own query-string signatures and don't need the key.
   - Streaming mp3 bytes through the backend would require loading 2-10 MB per chapter into backend memory OR piping byte-by-byte (both slow and expensive).
   - Howler's HTML5 audio mode uses HTTP range requests for seeking. A backend proxy would need to forward range headers correctly — adding complexity without benefit.
   - CloudFront handles bandwidth at scale for free (to us); our backend does not.
   - SSRF: proxying byte streams requires validating that the URL is actually a signed CloudFront URL from FCBH, opening an SSRF-adjacent surface. Not proxying bytes means no such validation is needed.

**3. Three bounded Caffeine caches in `FcbhService`, all with explicit size + TTL.** Per `02-security.md` § BOUNDED EXTERNAL-INPUT CACHES:

| Cache | Keyed on | Size | TTL | Rationale |
|---|---|---|---|---|
| `biblesCache` | `language` (normalized to `"eng"` etc.) | 10 | 7 days | Small response, rarely changes. Frontend also has a 7-day localStorage cache (`bb26-v1:audioBibles`), so this backend cache mostly serves first-visit cold starts. |
| `filesetCache` | `filesetId.toUpperCase()` | 20 | 7 days | Catalog is static. Rarely queried by the current app, but the cache protects against future features that poll the catalog. |
| `chapterCache` | `filesetId:bookCode:chapter` (uppercased) | 2000 | 6 hours | Hot path. 6h TTL leaves 9h safety margin before the signed `path` URL expires (CloudFront signs URLs for ~15h). 2000 entries = roughly 1200 chapters × ~1.6x (both OT and NT filesets with some overlap). |

Timestamps are NOT cached. BB-44 read-along only runs when the user explicitly enables it, and the payload is small (~100 timestamps per chapter). Adding a fourth cache gives marginal benefit.

**4. `FcbhNotFoundException` extends `ProxyException` and maps to HTTP 404, not 502.** Deviation from Spec 2/3 error mapping. Rationale: the frontend's existing AudioPlayButton visibility logic currently reads `{kind: 'http', status: 404}` to distinguish "this chapter has no audio" from "DBP is down." If the backend squashed all upstream errors into 502, the button would show for chapters that don't exist, the user would tap it, and get a generic "Audio temporarily unavailable" error — regression from today's silent "hide button" UX.

   Implementation: `FcbhService` catches `WebClientResponseException` where `ex.getStatusCode().value() == 404` and throws `new FcbhNotFoundException("Audio not available for this chapter.")`. All other 4xx/5xx statuses still route through `UpstreamException` / `UpstreamTimeoutException` → 502/504.

   On the frontend, `dbp-client.ts` preserves the existing `{kind: 'http', status: response.status}` throw when `response.ok === false`, so a backend 404 still surfaces as `{status: 404}` to the AudioPlayButton. Behavior-preserving.

**5. Pass-through response bodies for `bibles` and `filesets`.** Backend returns the DBP JSON envelope unchanged — `{data: [...], meta: {...}}`. Backend DTOs are typed as `Map<String, Object>` or `JsonNode` (whichever matches Spec 3's `PlacesSearchResponse.places` precedent). This preserves the frontend's existing `DbpBible[]` and `DbpFileset[]` type declarations and avoids duplicating type definitions across the tier boundary.

**6. Chapter response gets a lightly-typed DTO for cache key correctness.** The `/filesets/{id}/{book}/{chapter}` response IS cached in `chapterCache`, and the cache key must survive serialization. A typed `ChapterAudioResponse` record (`{data: List<Map<String, Object>>}`) is simpler to cache and debug than raw JSON. Frontend still consumes it as `DbpChapterAudio`.

**7. Frontend readiness probe pattern copies `maps-readiness.ts` verbatim (with FCBH substitutions).** Single in-flight promise prevents thundering-herd fetches of `/api/v1/health` on initial render. Result cached in-memory for the session. Exports:
   - `getFcbhReadiness(): Promise<boolean>` — returns `true` when `providers.fcbh.configured === true`; `false` otherwise (including health endpoint failure).
   - `resetFcbhReadinessCache()` — test helper.

   The probe result is only consulted when rendering the AudioPlayButton for the first time in a session. Subsequent renders use the cached value. Health endpoint never returns anything user-specific, so caching across the entire session (not per-user) is correct.

**8. No SSRF surface.** The backend never calls a URL derived from user input. Every outbound URL is constructed server-side as `https://4.dbt.io/api/{hardcoded-path}/{path-param}` where path-params are `@Pattern`-validated to `[A-Za-z0-9_-]+` or similar tight regexes. An attacker supplying a bookCode of `../../../admin` would fail validation at the controller before reaching the service.

**9. Request-ID and rate-limit headers inherit from Spec 1.** `RequestIdFilter` runs first; all four endpoints automatically carry `X-Request-Id` on responses. `RateLimitFilter` scoped to `/api/v1/proxy/**` covers the new endpoints without change.

**10. Log statements include IDs and lengths only — NEVER the signed URL from `path`.** The signed CloudFront URL contains the AWS key-pair ID (`Key-Pair-Id=APKAI4ULLVMANLYYPTLQ`), which while not a secret, is still distinctive enough to flag in log scans. Service log lines emit `filesetId`, `bookCode`, `chapter`, and cache-hit/miss boolean. Nothing from the response `path` field. Never the FCBH API key.

**11. No Docker / no new infra.** This spec reuses the existing backend. Dev-profile smoke via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` follows the Spec 3 / AI-2 / AI-3 pattern.

---

## Endpoint contracts

### `GET /api/v1/proxy/bible/bibles?language=eng`

**Query params:**
- `language` — optional, defaults to `"eng"`. `@Pattern(regexp = "^[a-z]{2,3}$")` to constrain to ISO 639-1/639-2 codes.

**Success response** (HTTP 200, `ProxyResponse<Map>`):

```json
{
  "data": {
    "data": [
      {"id": "ENGWWH", "name": "World English Bible - Winfred Henson", ...},
      ...
    ],
    "meta": {"pagination": {...}}
  },
  "meta": {"requestId": "fbfQ6HOYQGe-REXyyltn3Q"}
}
```

The inner `data` object is the DBP envelope, passed through unchanged. The outer `data`/`meta` is the ProxyResponse wrapper.

**Error responses:** `INVALID_INPUT` (400, bad language code), `RATE_LIMITED` (429), `UPSTREAM_ERROR` (502), `UPSTREAM_TIMEOUT` (504), `INTERNAL_ERROR` (500).

---

### `GET /api/v1/proxy/bible/filesets/{filesetId}`

**Path params:**
- `filesetId` — `@Pattern(regexp = "^[A-Z0-9-]{3,30}$")`. Matches `EN1WEBO2DA`, `ENGWEBN2DA-opus16`, etc.

**Success response** (HTTP 200, `ProxyResponse<Map>`): DBP envelope passed through.

**Error responses:** `INVALID_INPUT` (400, bad fileset ID format), `NOT_FOUND` (404, DBP returned 404), `RATE_LIMITED` (429), `UPSTREAM_ERROR` (502), `UPSTREAM_TIMEOUT` (504), `INTERNAL_ERROR` (500).

---

### `GET /api/v1/proxy/bible/filesets/{filesetId}/{bookCode}/{chapter}`

**Path params:**
- `filesetId` — `@Pattern(regexp = "^[A-Z0-9-]{3,30}$")`
- `bookCode` — `@Pattern(regexp = "^[A-Z0-9]{3}$")`. Matches DBP 3-letter codes (`GEN`, `1CO`, `REV`, etc.).
- `chapter` — `@Min(1) @Max(200)` integer. Upper bound is generous (Psalm 150 is the max in canonical scripture; 200 tolerates apocryphal or edge cases).

**Success response** (HTTP 200, `ProxyResponse<ChapterAudioResponse>`):

```json
{
  "data": {
    "data": [
      {
        "book_id": "JHN",
        "chapter_start": 3,
        "path": "https://d1gd73roq7kqw6.cloudfront.net/.../B04_03_JohnEN1WEBN2DA.mp3?Expires=...&Signature=...",
        "duration": 321,
        "filesize_in_bytes": 2560000,
        ...
      }
    ],
    "meta": {...}
  },
  "meta": {"requestId": "..."}
}
```

**Error responses:** `INVALID_INPUT` (400, bad filesetId/bookCode/chapter format), `NOT_FOUND` (404, DBP returned 404 — "Audio not available for this chapter."), `RATE_LIMITED` (429), `UPSTREAM_ERROR` (502), `UPSTREAM_TIMEOUT` (504), `INTERNAL_ERROR` (500).

**Cache behavior:** Response (including the signed `path`) cached in-memory for 6 hours keyed on `filesetId:bookCode:chapter`. The 6h TTL is well under the ~15h CloudFront signature expiry, so cached URLs are always still valid when served.

---

### `GET /api/v1/proxy/bible/timestamps/{filesetId}/{bookCode}/{chapter}`

Same path-param validation as the chapter endpoint.

**Success response** (HTTP 200, `ProxyResponse<Map>`):

```json
{
  "data": {
    "data": [
      {"book": "JHN", "chapter": "3", "verse_start": "1", "timestamp": 0.0},
      {"book": "JHN", "chapter": "3", "verse_start": "2", "timestamp": 5.2},
      ...
    ],
    "meta": {...}
  },
  "meta": {"requestId": "..."}
}
```

Empty `data` array is valid — means "no timing data for this chapter" (OT filesets return empty). Frontend already handles that.

**Error responses:** same codes as the chapter endpoint. NOT cached on the backend.

---

## Backend implementation

### `FcbhNotFoundException.java`

```java
package com.example.worshiproom.proxy.bible;

import com.example.worshiproom.proxy.common.ProxyException;

/**
 * Thrown when DBP returns HTTP 404 for a fileset, chapter, or timestamps
 * lookup. Mapped to HTTP 404 with code {@code NOT_FOUND} by
 * {@code ProxyExceptionHandler} — deliberately distinct from
 * {@code UpstreamException} (502) so the frontend can distinguish
 * "this chapter has no audio" from "DBP is unreachable."
 *
 * See ai-proxy-fcbh.md § AD #5 for the rationale.
 */
public class FcbhNotFoundException extends ProxyException {
    public FcbhNotFoundException(String message) {
        super(message);
    }
}
```

### `FcbhCacheKeys.java`

```java
package com.example.worshiproom.proxy.bible;

import java.util.Locale;

/**
 * Static helpers for cache-key normalization. Centralizes uppercasing so
 * cache reads and writes always use the same key format. "eng" and "ENG"
 * hit the same bibles cache entry; "ENGWEB" and "engweb" hit the same
 * fileset entry.
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

### `FcbhService.java` (outline — CC expands from Spec 3's `GoogleMapsService` template)

Class skeleton mirrors `GoogleMapsService`. Key differences:
- No photo-byte streaming → simpler (no `PhotoBytes` record, no `fetchPhoto()` method).
- Four outbound methods instead of three, one of which distinguishes 404 into a typed exception.
- All four outbound URLs end with `?v=4&key={key}` (DBP v4 auth scheme).

```java
package com.example.worshiproom.proxy.bible;

import com.example.worshiproom.config.ProxyConfig;
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

    // ─── Public API (called by FcbhController) ──────────────────────────

    public Map<String, Object> listBibles(String language) { /* cache + callBibles + error map */ }
    public Map<String, Object> getFileset(String filesetId) { /* cache + callFileset + error map */ }
    public Map<String, Object> getChapter(String filesetId, String bookCode, int chapter) { /* cache + callChapter + error map */ }
    public Map<String, Object> getTimestamps(String filesetId, String bookCode, int chapter) { /* callTimestamps + error map, no cache */ }

    // ─── D2b test seams (package-private) ────────────────────────────────

    Mono<Map<String, Object>> callBibles(String language) { /* WebClient GET */ }
    Mono<Map<String, Object>> callFileset(String filesetId) { /* WebClient GET */ }
    Mono<Map<String, Object>> callChapter(String filesetId, String bookCode, int chapter) { /* WebClient GET */ }
    Mono<Map<String, Object>> callTimestamps(String filesetId, String bookCode, int chapter) { /* WebClient GET */ }

    // ─── Error mapping (ProxyException supertype return, matches AI-1/AI-2/AI-3) ─

    private ProxyException mapWebClientError(String operation, RuntimeException ex) { /* 404 → FcbhNotFoundException, timeout → UpstreamTimeoutException, else UpstreamException */ }
    private boolean isTimeout(RuntimeException ex) { /* walks cause chain for TimeoutException */ }
}
```

Key method implementations — match Spec 3 conventions:

```java
    public Map<String, Object> getChapter(String filesetId, String bookCode, int chapter) {
        if (!proxyConfig.getFcbh().isConfigured()) {
            throw new UpstreamException("FCBH audio service is not configured on the server.");
        }
        String key = FcbhCacheKeys.chapterKey(filesetId, bookCode, chapter);
        Map<String, Object> cached = chapterCache.getIfPresent(key);
        if (cached != null) {
            log.debug("FCBH chapter cache hit filesetId={} bookCode={} chapter={}", filesetId, bookCode, chapter);
            return cached;
        }
        try {
            Map<String, Object> response = callChapter(filesetId, bookCode, chapter).block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("FCBH service returned no response.");
            }
            chapterCache.put(key, response);
            log.info("FCBH chapter fetched filesetId={} bookCode={} chapter={}", filesetId, bookCode, chapter);
            return response;
        } catch (FcbhNotFoundException | UpstreamException | UpstreamTimeoutException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw mapWebClientError("chapter", ex);
        }
    }

    Mono<Map<String, Object>> callChapter(String filesetId, String bookCode, int chapter) {
        String apiKey = proxyConfig.getFcbh().getApiKey();
        return webClient.get()
            .uri(DBP_BASE_URL + "/bibles/filesets/{fs}/{bk}/{ch}?v=4&key={k}",
                filesetId, bookCode, chapter, apiKey)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    private ProxyException mapWebClientError(String operation, RuntimeException ex) {
        if (ex instanceof WebClientResponseException wcre) {
            if (wcre.getStatusCode().value() == 404) {
                return new FcbhNotFoundException("Audio not available for this chapter.");
            }
            log.warn("FCBH upstream HTTP error operation={} status={}", operation, wcre.getStatusCode().value());
            return new UpstreamException("FCBH service is temporarily unavailable. Please try again.", wcre);
        }
        if (ex instanceof WebClientRequestException wcre) {
            return new UpstreamException("FCBH service is temporarily unavailable. Please try again.", wcre);
        }
        if (isTimeout(ex)) {
            return new UpstreamTimeoutException("FCBH service timed out. Please try again.", ex);
        }
        return new UpstreamException("FCBH service is temporarily unavailable. Please try again.", ex);
    }
```

### `FcbhController.java`

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
        log.info("FCBH get chapter filesetId={} bookCode={} chapter={}", filesetId, bookCode, chapter);
        Map<String, Object> result = service.getChapter(filesetId, bookCode, chapter);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/timestamps/{filesetId}/{bookCode}/{chapter}")
    public ProxyResponse<Map<String, Object>> getTimestamps(
        @PathVariable @NotBlank @Pattern(regexp = FILESET_PATTERN) String filesetId,
        @PathVariable @NotBlank @Pattern(regexp = BOOK_CODE_PATTERN) String bookCode,
        @PathVariable @Min(1) @Max(200) int chapter
    ) {
        log.info("FCBH get timestamps filesetId={} bookCode={} chapter={}", filesetId, bookCode, chapter);
        Map<String, Object> result = service.getTimestamps(filesetId, bookCode, chapter);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
```

### `ProxyExceptionHandler` modification

Add one branch (location: in the existing `@ExceptionHandler` handler chain, before the generic `ProxyException` handler if one exists):

```java
@ExceptionHandler(FcbhNotFoundException.class)
public ResponseEntity<ProxyError> handleFcbhNotFound(FcbhNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ProxyError.of("NOT_FOUND", ex.getMessage(), MDC.get("requestId")));
}
```

Verify the handler's class-level `@RestControllerAdvice(basePackages = "com.example.worshiproom.proxy")` already covers `proxy.bible` (yes, it does — package scope includes subpackages).

### Backend tests

Four new test classes. All follow Spec 3 / AI-2 / AI-3 conventions.

#### `FcbhCacheKeysTest.java` — 4 tests

Plain JUnit 5 + AssertJ. No Spring context.

1. `biblesKey_normalizesCase` — `biblesKey("ENG")`, `biblesKey("eng")`, `biblesKey(" eng ")` all return `"bibles:eng"`.
2. `biblesKey_defaultsWhenBlank` — null, `""`, `"   "` all return `"bibles:eng"`.
3. `filesetKey_uppercases` — `filesetKey("engwebn2da")` returns `"fileset:ENGWEBN2DA"`.
4. `chapterKey_composesAllThree` — `chapterKey("en1webn2da", "jhn", 3)` returns `"chapter:EN1WEBN2DA:JHN:3"`.

#### `FcbhServiceTest.java` — 14 tests

`@BeforeEach setUp()` mirrors Spec 3's pattern: construct `ProxyConfig`, set `fcbh.api-key`, `service = spy(new FcbhService(config, mockWebClient))`. No reflection-based injection needed — WebClient is constructor-injected.

Tests:

**Configuration (1):**
1. `allEndpoints_throwUpstreamExceptionWhenKeyMissing` — empty `config.getFcbh().apiKey`; call each of the four public methods; assert `UpstreamException` with message containing "not configured" for all four.

**Happy path (4):**
2. `listBibles_returnsDbpEnvelope` — spy-stub `callBibles("eng")` → valid envelope `{data: [...], meta: {...}}`. Assert returned Map equals the stub.
3. `getFileset_returnsDbpEnvelope` — same pattern.
4. `getChapter_returnsDbpEnvelope` — same pattern; assert the returned envelope's inner `data[0].path` starts with `https://`.
5. `getTimestamps_returnsDbpEnvelope` — same pattern.

**Caching (4):**
6. `listBibles_cachesRepeatCalls` — stub `callBibles(...)` to return envelope. Call `listBibles("eng")` twice. Assert `callBibles` invoked ONCE total.
7. `getFileset_cachesRepeatCalls` — same pattern.
8. `getChapter_cachesRepeatCalls` — same pattern; assert `callChapter` invoked once across two `getChapter("ENGWEB", "JHN", 3)` calls.
9. `getTimestamps_doesNotCache` — stub `callTimestamps(...)`. Two identical calls. Assert `callTimestamps` invoked TWICE (cache is intentionally absent for timestamps per AD #3).

**Error mapping (5):**
10. `getChapter_404mapsTo_FcbhNotFoundException` — stub `callChapter` to return `Mono.error(new WebClientResponseException(404, "Not Found", ...))`. Assert `FcbhNotFoundException` thrown with message "Audio not available for this chapter.". Assert NOT an `UpstreamException`.
11. `getChapter_500mapsToUpstreamException` — stub to return 500. Assert `UpstreamException` (not `FcbhNotFoundException`).
12. `getChapter_timeoutMapsToUpstreamTimeout` — stub to throw `RuntimeException` wrapping `TimeoutException`. Assert `UpstreamTimeoutException`.
13. `getChapter_networkErrorMapsToUpstream` — stub to throw `WebClientRequestException`. Assert `UpstreamException`.
14. `noLeakOfApiKeyInExceptionMessages` — trigger each error path; assert none of the thrown exceptions have `.getMessage().toLowerCase().contains("aiza")` or `.contains("key=")` or the literal API key set in `setUp()`.

#### `FcbhControllerTest.java` — 8 tests

`@WebMvcTest(FcbhController.class) @Import(ProxyExceptionHandler.class) @MockBean FcbhService`. Autowire `MockMvc`.

1. `listBibles_happyPath_returns200WithEnvelope` — stub service; POST `/bibles?language=eng`; assert 200 + `$.data.data` is array + `$.meta.requestId` present.
2. `listBibles_badLanguage_returns400` — GET `/bibles?language=INVALID`; assert 400 `INVALID_INPUT`.
3. `getFileset_badId_returns400` — GET `/filesets/bad!!`; assert 400 via `@Pattern` violation.
4. `getChapter_badBookCode_returns400` — GET `/filesets/ENGWEB/xyz/3` (lowercase); assert 400.
5. `getChapter_badChapter_returns400` — GET `/filesets/ENGWEB/JHN/0`; assert 400 via `@Min(1)`. Also `chapter=201` → 400 via `@Max(200)`.
6. `getChapter_notFound_returns404` — stub service to throw `FcbhNotFoundException("Audio not available for this chapter.")`; assert 404 + `$.code` = `"NOT_FOUND"` + message verbatim.
7. `getChapter_upstreamError_returns502` — stub to throw `UpstreamException`; assert 502 `UPSTREAM_ERROR`.
8. `getTimestamps_happyPath_returns200` — stub service returns empty-data envelope; assert 200 + `$.data.data` is an empty array (valid).

#### `FcbhIntegrationTest.java` — 5 tests

`@SpringBootTest @AutoConfigureMockMvc @MockBean FcbhService`.

1. `fullLifecycle_getChapter_returnsHeaders` — stub service valid response; GET; assert `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` all present.
2. `fullLifecycle_propagatesClientRequestId` — send `X-Request-Id: test-fcbh-req`; assert echo + `$.meta.requestId` matches.
3. `fullLifecycle_invalidPathParam_returnsProxyError` — GET `/filesets/bad!!/JHN/3`; assert 400 body matches `{code, message, requestId, timestamp}`.
4. `fullLifecycle_404returnsProxyErrorShape` — stub throws `FcbhNotFoundException`; assert 404 body has `code: "NOT_FOUND"`, `message: "Audio not available for this chapter."`, `requestId` present.
5. `fullLifecycle_noApiKeyLeakInErrorBody` — stub throws `UpstreamException` wrapping a cause that contains the API key fingerprint; assert response body is clean.

---

### OpenAPI additions

Insert into `backend/src/main/resources/openapi.yaml`.

**Path additions** (under `paths:`, after the existing `/api/v1/proxy/maps/*` block):

```yaml
/api/v1/proxy/bible/bibles:
  get:
    tags: [Proxy / Bible]
    summary: List audio bibles
    operationId: listAudioBibles
    security: []
    parameters:
      - name: language
        in: query
        required: false
        schema: { type: string, pattern: '^[a-z]{2,3}$', default: 'eng' }
    responses:
      '200':
        description: DBP bibles envelope
        content:
          application/json:
            schema:
              type: object
              required: [data, meta]
              properties:
                data: { type: object, description: "DBP v4 bibles response envelope, passed through unchanged" }
                meta:
                  type: object
                  properties:
                    requestId: { type: string }
      '400': { $ref: '#/components/responses/BadRequest' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '500': { $ref: '#/components/responses/InternalError' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }

/api/v1/proxy/bible/filesets/{filesetId}:
  get:
    tags: [Proxy / Bible]
    summary: Get fileset catalog
    operationId: getFileset
    security: []
    parameters:
      - { name: filesetId, in: path, required: true, schema: { type: string, pattern: '^[A-Z0-9-]{3,30}$' } }
    responses:
      '200':
        description: DBP fileset envelope
        content:
          application/json:
            schema: { $ref: '#/components/schemas/BibleEnvelope' }
      '400': { $ref: '#/components/responses/BadRequest' }
      '404': { $ref: '#/components/responses/NotFound' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '500': { $ref: '#/components/responses/InternalError' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }

/api/v1/proxy/bible/filesets/{filesetId}/{bookCode}/{chapter}:
  get:
    tags: [Proxy / Bible]
    summary: Get chapter audio URL
    operationId: getChapterAudio
    security: []
    parameters:
      - { name: filesetId, in: path, required: true, schema: { type: string, pattern: '^[A-Z0-9-]{3,30}$' } }
      - { name: bookCode, in: path, required: true, schema: { type: string, pattern: '^[A-Z0-9]{3}$' } }
      - { name: chapter, in: path, required: true, schema: { type: integer, minimum: 1, maximum: 200 } }
    responses:
      '200':
        description: DBP chapter envelope with signed CloudFront audio URL
        content:
          application/json:
            schema: { $ref: '#/components/schemas/BibleEnvelope' }
      '400': { $ref: '#/components/responses/BadRequest' }
      '404': { $ref: '#/components/responses/NotFound' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '500': { $ref: '#/components/responses/InternalError' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }

/api/v1/proxy/bible/timestamps/{filesetId}/{bookCode}/{chapter}:
  get:
    tags: [Proxy / Bible]
    summary: Get verse-level audio timestamps
    operationId: getChapterTimestamps
    security: []
    parameters:
      - { name: filesetId, in: path, required: true, schema: { type: string, pattern: '^[A-Z0-9-]{3,30}$' } }
      - { name: bookCode, in: path, required: true, schema: { type: string, pattern: '^[A-Z0-9]{3}$' } }
      - { name: chapter, in: path, required: true, schema: { type: integer, minimum: 1, maximum: 200 } }
    responses:
      '200':
        description: DBP timestamps envelope (empty data array if no timings)
        content:
          application/json:
            schema: { $ref: '#/components/schemas/BibleEnvelope' }
      '400': { $ref: '#/components/responses/BadRequest' }
      '404': { $ref: '#/components/responses/NotFound' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '500': { $ref: '#/components/responses/InternalError' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }
```

**Schema additions** (under `components.schemas`):

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

**Response addition** (under `components.responses`):

```yaml
NotFound:
  description: Upstream 404 — resource not found
  content:
    application/json:
      schema: { $ref: '#/components/schemas/ProxyError' }
```

---

## Frontend implementation

### `frontend/src/lib/audio/dbp-client.ts` (modified — rewritten core)

Key behavioral preserved items:
- All four function signatures identical (`listAudioBibles`, `getBibleFilesets`, `getChapterAudio`, `getChapterTimestamps`)
- `DbpError` shape unchanged
- The `book_id === bookCode` defensive validation in `getChapterAudio` stays as-is
- AbortController-based 10s timeout preserved
- `kind: 'http' | 'network' | 'parse' | 'timeout'` error kinds preserved
- `kind: 'missing-key'` **removed** — no longer applicable since the frontend doesn't own a key

Rewritten module (full, replaces the current file):

```typescript
/**
 * BB-26 — FCBH Digital Bible Platform v4 API client.
 *
 * Spec 4 (ai-proxy-fcbh) migrated this module from direct DBP calls to
 * the backend proxy at /api/v1/proxy/bible/*. All four functions keep
 * identical signatures. `DbpError` shape unchanged. The book_id validation
 * for `getChapterAudio` stays — guarding against DBP's silent invalid-book
 * fallback to 1 Chronicles.
 *
 * Endpoints:
 *   GET /api/v1/proxy/bible/bibles?language=eng
 *   GET /api/v1/proxy/bible/filesets/{filesetId}
 *   GET /api/v1/proxy/bible/filesets/{filesetId}/{bookCode}/{chapter}
 *   GET /api/v1/proxy/bible/timestamps/{filesetId}/{bookCode}/{chapter}
 */

import type {
  DbpBible,
  DbpChapterAudio,
  DbpError,
  DbpFileset,
  VerseTimestamp,
} from '@/types/bible-audio'

const PROXY_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/bible`
const REQUEST_TIMEOUT_MS = 10_000

interface ProxyEnvelope<T> {
  data: T
  meta?: { requestId?: string }
}

interface DbpDataEnvelope<T> {
  data: T
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function proxyFetch<TDbpBody>(path: string): Promise<TDbpBody> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${PROXY_BASE}${path}`, { signal: controller.signal })
    if (!response.ok) {
      throw {
        kind: 'http',
        status: response.status,
        message: `Proxy ${response.status}`,
      } satisfies DbpError
    }
    let envelope: ProxyEnvelope<TDbpBody>
    try {
      envelope = (await response.json()) as ProxyEnvelope<TDbpBody>
    } catch {
      throw { kind: 'parse', message: 'Proxy returned invalid JSON' } satisfies DbpError
    }
    if (!isObject(envelope) || envelope.data === undefined) {
      throw { kind: 'parse', message: 'Proxy envelope missing data field' } satisfies DbpError
    }
    return envelope.data
  } catch (e) {
    if (isObject(e) && (e as { name?: string }).name === 'AbortError') {
      throw { kind: 'timeout', message: 'Proxy request timed out' } satisfies DbpError
    }
    if (isObject(e) && 'kind' in e) throw e
    const message = e instanceof Error ? e.message : 'Network error'
    throw { kind: 'network', message } satisfies DbpError
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Lists audio bibles. Returns DBP bibles array unwrapped from the double envelope. */
export async function listAudioBibles(languageCode = 'eng'): Promise<DbpBible[]> {
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/bibles?language=${encodeURIComponent(languageCode)}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data)) {
    throw { kind: 'parse', message: 'DBP bibles list missing data array' } satisfies DbpError
  }
  return dbp.data as DbpBible[]
}

/** Returns the filesets catalog for a single bible id. */
export async function getBibleFilesets(bibleId: string): Promise<DbpFileset[]> {
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/filesets/${encodeURIComponent(bibleId)}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data)) {
    throw { kind: 'parse', message: 'DBP filesets response missing data array' } satisfies DbpError
  }
  return dbp.data as DbpFileset[]
}

/** Returns the audio URL for a specific chapter, with book_id validation preserved. */
export async function getChapterAudio(
  filesetId: string,
  bookCode: string,
  chapter: number,
): Promise<DbpChapterAudio> {
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/filesets/${encodeURIComponent(filesetId)}/${encodeURIComponent(bookCode)}/${chapter}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data) || dbp.data.length === 0) {
    throw { kind: 'parse', message: 'DBP chapter audio response missing data' } satisfies DbpError
  }
  const entry = dbp.data[0]
  if (!isObject(entry)) {
    throw { kind: 'parse', message: 'DBP chapter audio entry is not an object' } satisfies DbpError
  }
  const returnedBook = typeof entry.book_id === 'string' ? entry.book_id : undefined
  const url = typeof entry.path === 'string' ? entry.path : undefined
  if (!returnedBook || !url) {
    throw { kind: 'parse', message: 'DBP chapter audio entry missing book_id or path' } satisfies DbpError
  }
  // Case-insensitive book_id match — guards against DBP's silent invalid-book-code
  // fallback to 1 Chronicles (see _plans/recon/bb26-audio-foundation.md § 4).
  if (returnedBook.toLowerCase() !== bookCode.toLowerCase()) {
    throw { kind: 'parse', message: 'DBP returned wrong book' } satisfies DbpError
  }
  const durationSeconds =
    typeof entry.duration === 'number'
      ? entry.duration
      : typeof entry.length === 'number'
      ? entry.length
      : undefined
  return { book: returnedBook, chapter, url, durationSeconds }
}

interface DbpTimestampRaw {
  book: string
  chapter: string
  verse_start: string
  verse_start_alt: string
  timestamp: number
}

/** BB-44 — Fetches verse-level timing data. Returns [] when no timings exist. */
export async function getChapterTimestamps(
  filesetId: string,
  bookCode: string,
  chapter: number,
): Promise<VerseTimestamp[]> {
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/timestamps/${encodeURIComponent(filesetId)}/${encodeURIComponent(bookCode)}/${chapter}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data)) return []
  const entries = dbp.data as DbpTimestampRaw[]
  return entries
    .filter((e) => {
      const v = parseInt(e.verse_start, 10)
      return !isNaN(v) && v > 0
    })
    .map((e) => ({
      verse: parseInt(e.verse_start, 10),
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}
```

**Key simplifications versus current code:**
- No more `requireFcbhApiKey()` import or call
- No more `buildUrl()` helper (the key-embedding function is gone)
- No more `DBP_BASE_URL = 'https://4.dbt.io/api'`
- No more `missing-key` error path — not applicable
- Double-envelope unwrapping: `proxyFetch` returns the DBP-level envelope (`{data: ...}`), then each public function unwraps that to its final shape

**What stays identical:**
- All four function names, parameters, return types
- `DbpError` shape (except `missing-key` kind is dead code and can be removed from the union type in `types/bible-audio.ts`)
- `book_id` validation + rest of `getChapterAudio` post-response handling
- 10-second timeout via AbortController

### `frontend/src/lib/env.ts` (modified — removes all FCBH helpers)

Current lines 22–29 (`FCBH_API_KEY_RAW`, `FCBH_API_KEY` constants) — DELETE.
Current lines ~68–102 (all four FCBH helper functions with their JSDoc) — DELETE.

Replace the deleted block with a decommissioning comment mirroring the existing Google Maps note at lines 27-30:

```typescript
// Note: the FCBH API key was decommissioned from the frontend in Spec 4
// (ai-proxy-fcbh). All DBP calls route through the backend proxy at
// /api/v1/proxy/bible/*; the backend holds the key. No frontend code should
// reintroduce VITE_FCBH_API_KEY. Use @/services/fcbh-readiness for the
// "is FCBH available" check in UI gating.
```

**What stays in `env.ts`:** All VAPID-related constants and helpers (`VAPID_PUBLIC_KEY`, `getVapidPublicKey`, `requireVapidPublicKey`, `isVapidKeyConfigured`). Module top-level doc comment unchanged.

### `frontend/src/services/fcbh-readiness.ts` (create — mirrors `maps-readiness.ts`)

```typescript
/**
 * FCBH readiness probe.
 *
 * Hits /api/v1/health once per session and caches `providers.fcbh.configured`.
 * Used by UI gates (e.g., AudioPlayButton visibility) to decide whether to
 * surface audio-dependent controls without needing the FCBH API key on the
 * client. Mirrors the Spec 3 maps-readiness pattern.
 *
 * Thundering-herd guard: concurrent callers share a single in-flight probe
 * via the promise cache.
 */

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
 * for the session after the first successful probe. Returns false on any
 * failure mode (health endpoint down, malformed response, fcbh.configured
 * missing or not literally `true`).
 */
export async function getFcbhReadiness(): Promise<boolean> {
  if (cachedReadiness !== undefined) return cachedReadiness
  if (inflightProbe) return inflightProbe
  inflightProbe = probe().then((result) => {
    cachedReadiness = result
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

### `frontend/.env.example` (modified — removes FCBH block)

Replace the current lines 41-47 (the FCBH block):

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

with a decommissioning comment matching the Google Maps precedent:

```
# FCBH: the VITE_FCBH_API_KEY was decommissioned in Spec 4 (ai-proxy-fcbh).
# The FCBH API key now lives only on the backend as FCBH_API_KEY — see
# backend/.env.example and backend/.env.local. All DBP calls (bibles list,
# filesets, chapter audio URLs, timestamps) route through /api/v1/proxy/bible/*.
# Do not reintroduce a frontend FCBH key. The backend reports readiness via
# /api/v1/health.providers.fcbh.configured, consumed by fcbh-readiness.ts.
```

### AudioPlayButton / BibleReader visibility gate

**Pre-execution discovery required.** Run:

```
grep -rn 'isFcbhApiKeyConfigured' frontend/src/
```

to locate every visibility-gate call site. Expected sites based on recon: `AudioPlayButton.tsx` and possibly a parent guard in `BibleReader.tsx` or `ReaderChrome.tsx`.

For each site:
1. Replace the synchronous `isFcbhApiKeyConfigured()` call with an async `getFcbhReadiness()` read.
2. Component state pattern: if the gate is in a component, add `const [fcbhReady, setFcbhReady] = useState<boolean | null>(null)` + a `useEffect` that calls `getFcbhReadiness().then(setFcbhReady)`. While `fcbhReady === null`, render nothing (same visual state as "not configured"). Once resolved, render or hide based on the boolean.
3. If the gate is inside a React context provider that already has async initialization, extend that init to await readiness and expose a boolean.

**Plan step 12 action:** the executing CC discovers the actual call sites via grep and adjusts each one minimally. Do NOT rewrite the component's other logic.

### Update `frontend/src/lib/audio/__tests__/dbp-client.test.ts`

Remove every test case involving `VITE_FCBH_API_KEY` stubbing and the `missing-key` error kind. Rewrite the remaining tests to:

1. Mock `fetch` against `/api/v1/proxy/bible/*` URLs instead of `4.dbt.io/api/*`.
2. Test payloads wrap DBP envelopes in the double-envelope `{data: {data: [...]}}` shape the proxy now returns.
3. Assert fetch URL patterns contain `/api/v1/proxy/bible/filesets/...` etc., NOT the old `4.dbt.io` URL.
4. Keep all `book_id` validation tests — those behaviors are preserved and critical.

Example new happy-path test:

```typescript
it('getChapterAudio returns parsed DTO on 200', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        data: [{
          book_id: 'JHN',
          chapter_start: 3,
          path: 'https://d1gd73roq7kqw6.cloudfront.net/.../john3.mp3?sig=...',
          duration: 321,
        }],
        meta: {},
      },
      meta: { requestId: 'test' },
    }),
  })
  vi.stubGlobal('fetch', fetchMock)
  const { getChapterAudio } = await importClient()
  const result = await getChapterAudio('EN1WEBN2DA', 'JHN', 3)
  expect(result).toEqual({
    book: 'JHN',
    chapter: 3,
    url: expect.stringContaining('cloudfront.net'),
    durationSeconds: 321,
  })
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3'),
    expect.anything(),
  )
})
```

### Create `frontend/src/services/__tests__/fcbh-readiness.test.ts` — 7 tests

1. `returnsTrueWhenConfigured` — mock fetch returns `{providers:{fcbh:{configured:true}}}`. Assert `true`.
2. `returnsFalseWhenNotConfigured` — mock returns `configured:false`. Assert `false`.
3. `returnsFalseOnNetworkError` — fetch rejects. Assert `false`.
4. `returnsFalseOnNon200` — fetch returns 500. Assert `false`.
5. `returnsFalseOnMalformedBody` — fetch returns `{}` (no providers). Assert `false`.
6. `cachesResult` — call twice; assert fetch invoked ONCE total.
7. `concurrentCallsShareInflight` — call three times in parallel before the first resolves; assert fetch invoked ONCE. Assert all three promises resolve to the same value.

Each test calls `resetFcbhReadinessCache()` in a `beforeEach` to prevent state bleed.

---

## Pre-Execution Checklist

### Branch state

- [ ] Current branch: `claude/feature/ai-proxy-fcbh` (run `git branch --show-current`)
- [ ] `git status` clean
- [ ] `git log main --oneline -20` shows all prior wave commits including "AI-3: Journal reflection Gemini integration"

### Backend baseline

- [ ] `cd backend && ./mvnw test` passes baseline (expected: ~236 tests green post-AI-3)
- [ ] `backend/.env.local` has `FCBH_API_KEY=...` populated
- [ ] `curl -s http://localhost:8080/api/v1/health | jq .providers.fcbh.configured` returns `true`
- [ ] `ProxyConfig.FcbhProperties` compiles and `isConfigured()` returns `true` for non-blank key

### Frontend baseline

- [ ] `cd frontend && npm test -- --run` passes baseline
- [ ] `cd frontend && npm run build` succeeds
- [ ] `/bible/john/3` loads and the AudioPlayButton appears (confirms FCBH is currently working via direct DBP calls)

### Pre-discovery

- [ ] `grep -rn 'isFcbhApiKeyConfigured\|requireFcbhApiKey\|getFcbhApiKey' frontend/src/` — enumerate every call site to be rewritten. Expected: `env.ts` (defined), `dbp-client.ts` (calls require), plus 1-3 UI gate sites.
- [ ] `grep -rn '4\.dbt\.io' frontend/src/` — should match only `dbp-client.ts` (the file this spec rewrites). Any other match is unexpected and surfaces for review.

### Charter carryover

Same seven-condition charter as Specs 2/3/AI-1/AI-2/AI-3 plus one addition:
- **Endpoint 404 semantics preserved.** If the execution surfaces a case where returning 404 breaks something that currently works, STOP and surface — don't reroute to 502 as a "fix."

---

## Acceptance Criteria

### Functional — backend

- [ ] `GET /api/v1/proxy/bible/bibles` returns 200 with `{data: {data: DbpBible[], meta}, meta: {requestId}}` envelope
- [ ] `GET /api/v1/proxy/bible/filesets/EN1WEBN2DA` returns 200 with fileset data
- [ ] `GET /api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3` returns 200 with chapter data including a signed CloudFront `path` that starts with `https://d1gd73roq7kqw6.cloudfront.net/`
- [ ] `GET /api/v1/proxy/bible/filesets/EN1WEBO2DA/PSA/151` returns **404** with `$.code = "NOT_FOUND"` and `$.message = "Audio not available for this chapter."`
- [ ] `GET /api/v1/proxy/bible/filesets/BADID/JHN/3` returns 400 `INVALID_INPUT` (pattern mismatch on filesetId)
- [ ] `GET /api/v1/proxy/bible/filesets/EN1WEBN2DA/xyz/3` returns 400 (lowercase book code fails pattern)
- [ ] `GET /api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/0` returns 400 (`@Min(1)` violation)
- [ ] `GET /api/v1/proxy/bible/timestamps/EN1WEBN2DA/JHN/3` returns 200 with timestamp data (possibly empty `data: []`)
- [ ] Every response carries `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers

### Functional — frontend

- [ ] Visiting `/bible/john/3` renders the AudioPlayButton
- [ ] Clicking it loads audio that plays normally (mp3 streams directly from CloudFront, not through the backend)
- [ ] Network tab shows POST/GET to `/api/v1/proxy/bible/*` for metadata, but mp3 byte-range requests go directly to `d1gd73roq7kqw6.cloudfront.net`
- [ ] Navigating to a chapter with no audio (e.g., `/bible/psalms/151` if that route resolves) hides the AudioPlayButton — no user-visible error
- [ ] Continuous playback (BB-29) still works: finishing a chapter auto-advances to the next one
- [ ] BB-44 read-along highlighting still works when enabled

### Security invariants

- [ ] `grep -rc 'AIza' frontend/dist/` returns 0
- [ ] `grep -rc 'VITE_FCBH\|VITE_GEMINI\|VITE_GOOGLE_MAPS' frontend/dist/` returns 0
- [ ] `grep -rc '4\.dbt\.io' frontend/dist/` returns 0
- [ ] `grep -rc 'requireFcbhApiKey\|getFcbhApiKey\|isFcbhApiKeyConfigured' frontend/src/` returns 0
- [ ] `grep -rn 'FCBH\|fcbh' frontend/src/lib/env.ts` shows ONLY the decommissioning comment
- [ ] No upstream error text leaks — verified by `noLeakOfApiKeyInExceptionMessages` test + `fullLifecycle_noApiKeyLeakInErrorBody` integration test
- [ ] Backend logs contain ONLY `filesetId`, `bookCode`, `chapter`, `language` for DBP requests — never the API key, never the signed CloudFront `path`, never the `Signature=` query string. `grep -iE 'aiza|key=|signature=' /tmp/worship-room-backend.log | wc -l` returns 0 after exercising the endpoints.

### Caching behavior

- [ ] Second request for the same chapter within 6h hits cache (verified by backend log: `FCBH chapter cache hit` DEBUG line, or by timing — cached response < 5ms versus uncached ~100ms)
- [ ] Bibles list cache hit on repeat — only first `/bibles` call hits DBP
- [ ] Timestamps are NOT cached — repeat calls issue repeat DBP requests

### Test coverage

- [ ] All 4 tests in `FcbhCacheKeysTest` pass
- [ ] All 14 tests in `FcbhServiceTest` pass (including 404-distinct path, no-leak, cache hit/miss for each cache)
- [ ] All 8 tests in `FcbhControllerTest` pass
- [ ] All 5 tests in `FcbhIntegrationTest` pass
- [ ] Updated `dbp-client.test.ts` passes — fetch URLs assert `/api/v1/proxy/bible/*`, `book_id` validation tests intact
- [ ] All 7 tests in `fcbh-readiness.test.ts` pass
- [ ] `env.test.ts` passes with FCBH cases removed, VAPID cases intact
- [ ] No tests skipped, no `xit` / `it.skip`

### Runtime verification (non-Docker smoke)

- [ ] `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — backend starts
- [ ] `curl -s http://localhost:8080/api/v1/health | jq .providers.fcbh.configured` → `true`
- [ ] Happy-path chapter smoke:
  ```bash
  curl -s http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3 \
    | jq '{book: .data.data[0].book_id, hasPath: (.data.data[0].path | startswith("https://d1gd73roq7kqw6.cloudfront.net/")), duration: .data.data[0].duration, requestId: .meta.requestId}'
  ```
  Expect: `book: "JHN"`, `hasPath: true`, `duration: 321` (or similar), `requestId` is ~22-char base64.
- [ ] 404 smoke:
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBO2DA/PSA/151
  ```
  Expect: `404`. Then `curl -s http://localhost:8080/api/v1/proxy/bible/filesets/EN1WEBO2DA/PSA/151 | jq .code` → `"NOT_FOUND"`.
- [ ] Frontend smoke: open `/bible/john/3`, click play, verify audio plays. Network tab should show the `/api/v1/proxy/bible/...` request for metadata and a direct `d1gd73roq7kqw6.cloudfront.net` request for the mp3 bytes.
- [ ] Regression smoke: AI-1, AI-2, AI-3, and Maps endpoints all still work (hit `/api/v1/proxy/ai/ask`, `/pray`, `/reflect-journal`, `/api/v1/proxy/maps/geocode?query=Nashville+TN`).
- [ ] Bundle scan post-build: `cd frontend && npm run build && grep -rc '4\.dbt\.io\|VITE_FCBH\|AIza' frontend/dist/` → 0

### Operational (post-merge)

- [ ] Eric rotates the FCBH key in the FCBH/BibleBrain portal (old key was in the frontend bundle since BB-26; treat as compromised)
- [ ] New key placed ONLY in `backend/.env.local` (dev) and hosted platform env store (prod)
- [ ] Old `VITE_FCBH_API_KEY` line removed from `frontend/.env.local`
- [ ] GitHub secret-scanning alert for the leaked key marked as resolved
- [ ] Optional: rotate Gemini and Maps keys too since they were previously in the frontend bundle (Specs 2 and 3)

---

## See Also

- `_specs/ai-proxy-foundation.md` (Spec 1, merged) — `ProxyResponse`, `ProxyError`, `ProxyException`, `WebClient` bean, `RateLimitFilter`, `RequestIdFilter`, `ProxyExceptionHandler`, and the pre-wired `proxy.fcbh.api-key` config binding this spec relies on
- `_specs/ai-proxy-gemini.md` (Spec 2, merged) — D2b test-seam pattern, common error-mapping conventions
- `_specs/ai-proxy-maps.md` (Spec 3, merged) — **primary structural template for this spec**. Copy patterns: `GoogleMapsService` → `FcbhService` (similar Caffeine cache structure + WebClient-based outbound calls + package-private `call*` seams), `MapsController` → `FcbhController` (same validation-annotation pattern, same `@Validated` + `@Pattern` on path params), `maps-readiness.ts` → `fcbh-readiness.ts` (nearly verbatim). Key differences: FCBH has 4 endpoints (Maps has 3), FCBH needs `FcbhNotFoundException` for 404-distinct mapping (Maps doesn't), FCBH doesn't proxy binary bytes (Maps does photos).
- `_specs/_archive/bb-26-fcbh-audio-bible-integration.md` — the original FCBH integration spec (frontend-direct). Some context but superseded by this spec for the network layer.
- `_plans/recon/bb26-audio-foundation.md` — authoritative DBP v4 API shape, WEB fileset identification, rate-limit behavior, Error-mode documentation (especially § 3 "WEB fileset structure" and § 4 "Failure modes observed"). Required reading for anyone debugging DBP responses.
- `frontend/src/types/bible-audio.ts` — `DbpBible`, `DbpFileset`, `DbpChapterAudio`, `DbpError`, `VerseTimestamp`. This spec preserves these types. Only change: `missing-key` can be removed from the `DbpError.kind` union (dead path after migration).
- `frontend/src/lib/audio/audio-cache.ts` — unchanged by this spec. The localStorage `bb26-v1:audioBibles` cache and in-memory chapter Map continue to work unchanged (they don't care whether the client calls DBP or a proxy, they cache the parsed DTO).
- `frontend/src/lib/audio/book-codes.ts` — unchanged. Slug-to-DBP-code mapping still authoritative.
- `frontend/src/lib/audio/next-track.ts` — unchanged. Continues to call `getChapterAudio()` via the same signature; 404 skip-to-next logic still works because backend passes 404 through.
- `frontend/src/lib/audio/engine.ts` — unchanged. Howler loads audio from the CloudFront URL in the `DbpChapterAudio.url` field; that URL still points to CloudFront, not to the backend.
- `frontend/src/services/maps-readiness.ts` — direct pattern template for `fcbh-readiness.ts`
- `.claude/rules/02-security.md` § "BOUNDED EXTERNAL-INPUT CACHES" — caches here comply (explicit size + TTL)
- `.claude/rules/02-security.md` § "Never Leak Upstream Error Text" — enforced via `mapWebClientError` chokepoint + dedicated no-leak tests
- `.claude/rules/07-logging-monitoring.md` § "PII handling" — controller logs path-params only (not user content). Service logs cache-hit/miss + IDs. Never logs the signed CloudFront `path` or the API key.

---

## Out of Scope (deferred to future specs)

- **Backend server-side cache invalidation.** No admin endpoint to flush Caffeine caches. The 6h/7d TTLs are sufficient for the current scale. If a bad fileset slips past our tests and poisons the cache, a backend restart clears it.
- **Request coalescing on cache miss.** If 10 simultaneous requests for the same uncached chapter arrive, all 10 hit DBP. Caffeine doesn't provide thundering-herd protection out of the box. At current traffic this is irrelevant; consider `LoadingCache` in a future scaling spec if needed.
- **Response compression.** Backend doesn't `Accept-Encoding: gzip` from DBP. DBP's responses are small JSON (typical ~20-50 KB for bibles list, ~1-5 KB per chapter). Not worth the complexity.
- **Migrating off DBP entirely.** If FCBH ever changes terms, rate limits, or becomes unreliable, the `/api/v1/proxy/bible/*` namespace is provider-agnostic — a future spec can swap the backend upstream without frontend changes. That's a feature, not a todo.
- **Per-user rate limiting on FCBH endpoints.** Shared bucket (1500/window) is protected by backend caching. If a single abuser triggers 429s from DBP despite caching, a per-IP bucket could help — deferred until observed.
- **Audio byte proxying for bandwidth control.** Rejected per AD #2 — CloudFront handles it for free and mp3 range-request complexity isn't worth the bandwidth cost.
- **OpenAPI codegen for backend→frontend types.** DBP envelope types stay typed on the frontend (`DbpBible`, `DbpChapterAudio`, etc.), backend uses `Map<String, Object>` pass-through. Codegen would add complexity for no safety gain — the envelope shape comes from DBP, not from us.
- **DBP license attribution link.** The recon doc flagged that DBP terms require "provide users with a link to DBP Terms and Conditions." This spec doesn't add that UI; it stays a gap against BB-26's license compliance. Best resolved as a small UX spec (add an "Audio: FCBH" attribution link in the expanded player sheet).
- **Timestamps cache.** Not added per AD #3. If BB-44 read-along usage grows, a future spec can add a 1h timestamps cache.
- **Spec 5 of the original wave numbering.** Never ships under that name — the AI Integration wave absorbed the Ask migration as AI-1 and shipped it already. With this spec, the Key Protection Wave is formally closed.

---

## Deviations

_None yet. Deviations recorded here during execution under the seven-condition charter (inherited from Spec 2 / Spec 3 / AI-1 / AI-2 / AI-3): no public API change, no behavior change, no rules/spec/plan edits, no new security/CORS/logging/PII/rate-limit surface, no scope change, no cross-spec precedent beyond extending existing patterns, alternative strictly worse. Uncertainty = stop and surface._
