# Forums Wave: Spec 1.10g — Security Response Headers Middleware

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.10g (v2.9, Phase 1)
**Branch:** `forums-wave-continued` (continuation branch — no new branch created per Eric's instruction)
**Date:** 2026-04-25

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code, no nginx config, no React component changes. The new filter decorates every HTTP response Worship Room emits but produces no visible UI change. `/verify-with-playwright` is NOT the right verification pass for this spec; the authored `SecurityHeadersConfigTest` (5 test methods) IS the verification, supplemented by post-deploy `curl` checks against the Railway production URL once the spec ships.

---

# Spec 1.10g Brief — Security Response Headers Middleware

**Canonical ID:** `round3-phase01-spec10g-security-headers`
**Phase:** 1
**Size:** S
**Risk:** Low (but easy to misconfigure — CSP too strict breaks the app)
**Branch:** `forums-wave-continued`
**Prerequisites:** 1.4 (Spring Security) ✅, 1.10 (Phase 1 Cutover) ✅
**Unblocks:** Defense-in-depth gap closed for any external security audit.

---

## 1. Goal

Add baseline security response headers to every HTTP response Worship Room emits, both controller-served paths and filter-raised error paths. Closes a defense-in-depth gap that the Spec 1.10 cutover smoke didn't catch but that any external security audit would flag immediately.

Three deliverables:

1. New `SecurityHeadersConfig` Spring `@Configuration` that emits a fixed set of security headers on every response — including filter-raised 401s (`JwtAuthenticationFilter`) and 429s (`LoginRateLimitFilter` / proxy `RateLimitFilter`). Same gap CORS hit during 1.10.
2. Backend tests asserting headers land on every response category (200 controller, 401 filter-raised, 429 filter-raised, 200 actuator, 200 unmatched-path).
3. New runbook at `backend/docs/runbook-security-headers.md`.

Backend-only spec. No frontend changes. No nginx changes (see "Out of Scope" for why).

---

## 2. Master Plan Divergences

Three deviations from master plan v2.9 § Spec 1.10g body:

### 2.1 Architectural template

The master plan says "modify `SecurityConfig.java` OR extract to `SecurityHeadersConfig.java`". This brief picks **extract** AND models on `CorsConfig.java` rather than `SecurityConfig.java`.

**Reason:** the CORS bug fixed during 1.10 proved that Spring Security's declarative `http.headers()` API does NOT decorate filter-raised responses. SecurityHeaders must use the same servlet-filter shape as `CorsConfig` so headers actually land on filter-raised 401s/429s.

### 2.2 Opinionated header set

Master plan names `X-Frame-Options` and `Strict-Transport-Security` as examples. This brief commits to six specific headers (see § 5). Deliberately excludes `Cross-Origin-Embedder-Policy` / `Opener-Policy` / `Resource-Policy` — those break iframe embeds and need their own follow-up spec.

### 2.3 Concrete runbook

Master plan says "doc explaining what to tune when a CDN or font is added." This brief specifies the runbook structure and requires three worked examples (image CDN, frame-ancestors loosening, unsafe-inline removal).

---

## 3. Recon Facts

Verified during brief authoring — re-verify if any feel suspect during execution.

- Backend: Spring Boot 3.5.11 + Spring Security 6.x.
- Existing: `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java` defines the JWT filter chain. Does NOT set response headers.
- Existing servlet-filter pattern: `backend/src/main/java/com/worshiproom/config/CorsConfig.java` — `FilterRegistrationBean<CorsFilter>` at `HIGHEST_PRECEDENCE+5`, paired with `WebMvcConfigurer.addCorsMappings` as belt-and-suspenders.
- Filter chain order: `RequestIdFilter` (`HIGHEST_PRECEDENCE`) → `CorsFilter` (`+5`) → `RateLimitFilter` (`+10`) → `LoginRateLimitFilter` (`+20`) → `JwtAuthenticationFilter` (Spring Security chain).
- New filter slots in at `HIGHEST_PRECEDENCE+6` (after `RequestIdFilter` so MDC populated for any header-related logging, after `CorsFilter` so CORS headers exist on response, before rate-limit and JWT filters so headers land on their 429s and 401s).
- Existing security-header surface: ZERO. Production curl returns no CSP, no HSTS, no `X-Frame-Options`, no `Referrer-Policy`, no `X-Content-Type-Options`, no `Permissions-Policy`.
- Frontend hosting: nginx (alpine) on port 80. `frontend/nginx.conf` is minimal — listens, roots `/usr/share/nginx/html`, serves `index.html`. Sets no security headers today.
- Frontend asset origins: self (Railway frontend domain), Google Fonts (`fonts.googleapis.com` + `fonts.gstatic.com`), Spotify (`open.spotify.com` for embeds).

---

## 4. Architectural Decision: Filter, Not Declarative `http.headers()`

Spring Security offers `http.headers().contentSecurityPolicy(...)`. This brief deliberately rejects that. Three reasons:

1. **Filter-raised responses bypass the declarative decoration.** The Spec 1.10 CORS bug was the canary. `LoginRateLimitFilter` and `JwtAuthenticationFilter` write 429/401 responses via `handlerExceptionResolver.resolveException(...)` BEFORE the response reaches Spring Security's response-decoration layer. Headers set declaratively in `SecurityConfig` would NOT appear on those responses.
2. **Architectural symmetry with `CorsConfig`.** `CorsFilter` at `HIGHEST_PRECEDENCE+5`; `SecurityHeadersFilter` at `+6`. Future readers diff the two configs and immediately see the parallel.
3. **One filter, one place to test.** Custom filter is trivially unit-testable (`MockHttpServletResponse`, invoke filter, assert headers). Declarative API is harder to assert.

**New file:** `backend/src/main/java/com/worshiproom/config/SecurityHeadersConfig.java` (NOT under `auth/` — this is cross-cutting transport security, not authentication).

Contains:

- A `SecurityHeadersFilter` (extends `OncePerRequestFilter`) that calls `response.setHeader(...)` for each of six headers, then `chain.doFilter(...)`.
- A `FilterRegistrationBean<SecurityHeadersFilter>` `@Bean` at `Ordered.HIGHEST_PRECEDENCE+6`, scoped to `/*` (NOT just `/api/**`).
- Header values as constants at top of class. NOT from `application.properties` — security headers are code, not config.

---

## 5. The Header Set (six headers, exact values)

### 5.1 `Strict-Transport-Security: max-age=31536000; includeSubDomains`

- 1-year HSTS with subdomain coverage.
- NO `preload` — one-way door, defer to follow-up spec.

### 5.2 `X-Content-Type-Options: nosniff`

- Prevents browser MIME sniffing.

### 5.3 `X-Frame-Options: DENY`

- Refuse to be framed. Worship Room is never legitimately embedded.

### 5.4 `Referrer-Policy: strict-origin-when-cross-origin`

- Modern browser default, pinned explicitly.

### 5.5 `Content-Security-Policy`

Single-line in actual header; formatted here for readability:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://worship-room-production.up.railway.app https://api.spotify.com;
frame-src 'self' https://open.spotify.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

**Per-directive rationale:**

- `default-src 'self'`: fallback locks everything to same origin.
- `script-src 'self'`: only same-origin scripts. NO `unsafe-inline`, NO `unsafe-eval`. Vite production emits hashed `<script src="/assets/index-XXXX.js">` tags, all same-origin.
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`: `unsafe-inline` required for Tailwind/Vite inline styles. Removal is a future spec (1.10g-bis).
- `font-src 'self' https://fonts.gstatic.com`: Google Fonts.
- `img-src 'self' data: https:`: `data:` for inline SVG/placeholders, `https:` for future user avatars from arbitrary HTTPS origins. Most permissive directive; tighten to specific avatar host list in a future spec.
- `connect-src` self + Railway backend + Spotify API.
- `frame-src` self + Spotify Web Playback SDK.
- `frame-ancestors 'none'`: same intent as `X-Frame-Options DENY`.
- `base-uri` / `form-action 'self'`: prevent base/form-action hijacking.
- `upgrade-insecure-requests`: belt-and-suspenders against mixed content.

### 5.6 `Permissions-Policy: accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`

- Geolocation allowed (Local Support feature). Everything else locked off.

---

## 6. Runbook Structure (`backend/docs/runbook-security-headers.md`)

Six sections required:

1. **The header set (current values)** — quick-reference table.
2. **When to change a header** — three classes (tightening, loosening, adding).
3. **Loosening procedure with three worked examples:**
   - 3.1 Adding a new image CDN origin
   - 3.2 Loosening `frame-ancestors` for a partner embed
   - 3.3 Removing `unsafe-inline` from `style-src` (long-term hardening, requires Vite nonce work — future spec 1.10g-bis)
4. **Verification steps after any change.**
5. **Emergency rollback** (git revert + Railway redeploy, ~2-3 min recovery — same as Spec 1.10 § 8.1).
6. **Related specs.**

Each loosening example must be concrete and end-to-end: edit the constant, update the test, update § 1, push, verify with curl, manual smoke. Theoretical examples are not acceptable.

---

## 7. Tests Required

`backend/src/test/java/com/worshiproom/config/SecurityHeadersConfigTest.java`

Five test methods covering the response-type matrix:

1. `headersPresentOnControllerSuccess()` — `GET /actuator/health` (200 from MVC controller). Assert all six headers.
2. `headersPresentOnFilterRaised401()` — `GET /api/v1/users/me` with no Authorization (401 from `JwtAuthenticationFilter` via `handlerExceptionResolver`). Assert all six headers. **THIS IS THE TEST THAT PROTECTS AGAINST THE 1.10 CORS BUG CLASS.**
3. `headersPresentOnFilterRaised429()` — `POST /api/v1/auth/login` 6+ times same email (429 from `LoginRateLimitFilter` on the 6th). Assert all six headers on the 6th response.
4. `headersPresentOnUnmatchedPath()` — `GET /this-path-does-not-exist` (404 from default error handling). Assert all six headers.
5. `csp_directiveStringMatchesCanonical()` — assert exact CSP directive string matches expected canonical value. Guards against accidental rewording during future tightening.

Tests 1–3 integration-style (`MockMvc` or `@SpringBootTest` with Testcontainers — check `06-testing.md` for the right base class). Tests 4–5 plain unit tests against `MockHttpServletResponse` + filter directly.

**Test baseline:** existing 417 backend tests must still pass. New tests bring count to 422+. Wall-clock impact: <2s for new tests.

---

## 8. Deliverables

**New code files:**

- `backend/src/main/java/com/worshiproom/config/SecurityHeadersConfig.java` (~80–120 lines including doc comment, modeled on `CorsConfig.java`)
- `backend/src/test/java/com/worshiproom/config/SecurityHeadersConfigTest.java` (5 test methods)

**Modified code files:** NONE expected. `SecurityConfig.java` does NOT need modification.

**New documentation:**

- `backend/docs/runbook-security-headers.md` (the runbook)

**Modified documentation:**

- `.claude/rules/02-security.md` — add new "Security Response Headers" section (~10–15 lines) stating the policy and pointing at the runbook for tuning.

---

## 9. Out of Scope

- **Setting headers in `frontend/nginx.conf`.** Doubling up creates drift surface; backend filter is the canonical source. Future spec can mirror to nginx if static-asset header coverage becomes a priority. This is a known gap, documented in the runbook § 1.
- **CSP `report-uri` / `report-to`.** Belongs to Spec 1.10d Sentry wiring.
- **`Cross-Origin-Embedder-Policy` / `Opener-Policy` / `Resource-Policy`.** Next-tier; breaks iframe embeds in subtle ways. Future spec.
- **HSTS preload list submission.** One-way door; needs DNS-stable prod first. Future spec.
- **Subresource Integrity.** No third-party scripts today.
- **Removing `unsafe-inline` from `style-src`.** Documented as 1.10g-bis; requires Vite nonce/hash strategy.
- **Per-route header overrides.** YAGNI; no admin UI yet.
- **Header values driven by environment variables.** Deliberately rejected — security headers are code, not config.
- **Modifying `SecurityConfig.java`.**

---

## 10. Acceptance Criteria

- [ ] `backend/src/main/java/com/worshiproom/config/SecurityHeadersConfig.java` exists, mirrors `CorsConfig.java` structurally, registers `FilterRegistrationBean<SecurityHeadersFilter>` at `Ordered.HIGHEST_PRECEDENCE + 6`.
- [ ] All six headers from § 5 appear with canonical values on `curl` against `https://worship-room-production.up.railway.app/actuator/health` once deployed (post-deploy verification, NOT pre-merge gate).
- [ ] All six headers also appear on 401 from `GET /api/v1/users/me` (no auth) and 429 from `POST /api/v1/auth/login` (6th attempt). Verified by `SecurityHeadersConfigTest`.
- [ ] `SecurityHeadersConfigTest` has all 5 test methods, all green.
- [ ] Backend test baseline: 417+ tests pass, 0 fail, ~5 new tests.
- [ ] `backend/docs/runbook-security-headers.md` exists with all 6 sections, including 3 worked examples.
- [ ] `.claude/rules/02-security.md` has new "Security Response Headers" subsection (~10–15 lines) pointing to runbook.
- [ ] No frontend code changes.
- [ ] No `application.properties` changes.
- [ ] No new dependencies in `pom.xml`.

---

## 11. Guardrails (DO NOT)

- Do NOT modify `frontend/**` anywhere.
- Do NOT modify `frontend/nginx.conf`.
- Do NOT modify `backend/src/main/java/com/worshiproom/auth/SecurityConfig.java`.
- Do NOT use `http.headers().contentSecurityPolicy(...)` or any declarative header API in `SecurityConfig.java`.
- Do NOT add `report-uri` or `report-to` to CSP.
- Do NOT preload HSTS.
- Do NOT loosen any directive beyond what's specified.
- Do NOT add any new env var or `application.properties` entry.
- Do NOT add any new dependency.
- Do NOT commit, push, or do any git operation. Eric handles git.
- Do NOT touch `_forums_master_plan/spec-tracker.md`. Eric flips ✅ manually after spec ships.

---

## 12. Plan Shape Expectation

`/plan-forums` output for this S/Low spec should be tight: 5–7 steps. If plan comes back with 12+ steps, it's over-specified — push back. If it proposes touching `SecurityConfig.java` or any frontend file, that's a scope violation — push back.

**Expected steps:**

1. Read recon (`CorsConfig.java`, `SecurityConfig.java`, `application*.properties`, related rule files).
2. Author `SecurityHeadersConfig.java` modeled on `CorsConfig.java`.
3. Author `SecurityHeadersConfigTest.java` with 5 test methods.
4. Author `backend/docs/runbook-security-headers.md`.
5. Add "Security Response Headers" section to `.claude/rules/02-security.md`.
6. Run `./mvnw test`; iterate on failures.
7. Self-review against acceptance criteria.

---

## 13. Notes for Plan Phase Recon

When `/plan-forums` runs, it should re-verify these recon facts before committing to an implementation:

- **`CorsConfig.java` shape** — confirm the `FilterRegistrationBean<CorsFilter>` pattern (constructor-injected `CorsFilter`, `setOrder(Ordered.HIGHEST_PRECEDENCE + 5)`, `addUrlPatterns("/*")`). The new `SecurityHeadersConfig` should mirror this exactly with `+6` and a private static inner `SecurityHeadersFilter extends OncePerRequestFilter`.
- **`SecurityConfig.java` filter-chain order** — confirm `JwtAuthenticationFilter` is added via `addFilterBefore(...)` and that filter-raised 401s flow through `RestAuthenticationEntryPoint` / `handlerExceptionResolver`. This determines whether the +6 ordering is correct (it should be — both rate-limit filters and JWT filter run AFTER the new filter, so headers are written first and survive the early-write of error responses).
- **Existing test base classes** — check `06-testing.md` § "Testcontainers Setup Pattern". Tests 1–3 likely extend `AbstractIntegrationTest` (PostgreSQL container) since `LoginRateLimitFilter`'s 429 path may interact with the auth tables. Tests 4–5 are pure-unit and need no Spring context.
- **`PublicPaths` list** — confirm `/actuator/health` is in the public-path list so test 1 doesn't trip on JWT auth before reaching the controller.
- **Liquibase / DB independence** — this spec adds NO Liquibase changesets. If the plan proposes one, that's a scope violation.
- **No new dependencies** — Spring Boot 3.5.11 ships `OncePerRequestFilter`, `FilterRegistrationBean`, `MockHttpServletResponse`, and `MockMvc`. No `pom.xml` edits.

---

## 14. Out-of-Band Notes for Eric

- **Branch is `forums-wave-continued` (continuation).** No new branch was cut for this spec per Eric's explicit instruction at spec creation. The skill's default branch creation was overridden.
- **Filename convention.** This spec lives at `_specs/forums/spec-1-10g.md` (canonical short form, matching `spec-1-3b.md`, `spec-1-9b.md`, and the recent `spec-1-10c` commit). The long-form ID `round3-phase01-spec10g-security-headers` is preserved inside the file body for cross-reference but is NOT the on-disk filename. The brief's "should land at `_specs/forums/round3-phase01-spec10g-security-headers.md`" path was overridden in favor of the repo convention.
- **Spec tracker untouched.** Tracker still shows row 26 (Spec 1.10g) as ⬜ — Eric flips to ✅ manually after the spec ships and the post-deploy curl verifies headers on production.
- **Post-deploy verification** is NOT a pre-merge gate. The acceptance criterion that requires `curl https://worship-room-production.up.railway.app/actuator/health` to return all six headers is checked AFTER Eric deploys to Railway, not as part of the green-tests gate before merge. The pre-merge gate is the `SecurityHeadersConfigTest` suite passing locally.
- **Rollback time** is ~2–3 minutes per Spec 1.10 § 8.1 (Railway dashboard → Deployments → Redeploy previous). If CSP misconfig breaks the production frontend (most likely failure mode: a new asset CDN added to the app without a corresponding CSP `connect-src` / `img-src` update), the runbook § 5 is the canonical recovery path.

---

## 15. Related Specs

- **Spec 1.4** (Spring Security) — defines the JWT filter chain that this spec's filter must order correctly against.
- **Spec 1.10** (Phase 1 Cutover) — the cutover whose CORS bug informed the architectural decision in § 4. The CORS fix (CORS as an explicit servlet filter at `HIGHEST_PRECEDENCE+5`) is the model this spec follows.
- **Spec 1.10b** (Deployment Target Selection) — locks Railway as the production target; relevant for the post-deploy curl criterion.
- **Spec 1.10d** (Sentry / UptimeRobot wiring) — owner of any future CSP `report-uri` / `report-to` work.
- **Spec 1.10g-bis** (future, deferred) — removes `unsafe-inline` from `style-src` via Vite nonce/hash strategy. Documented in this spec's § 9 and runbook § 3.3.
