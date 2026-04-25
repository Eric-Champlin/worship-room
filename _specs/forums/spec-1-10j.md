# Forums Wave: Spec 1.10j — Liveness/Readiness Health Checks

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.10j (v2.9, Phase 1)
**Branch:** `forums-wave-continued` (continuation branch — no new branch created per Eric's instruction)
**Date:** 2026-04-25

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code, no React component changes. The new Spring Boot Actuator probe endpoints (`/actuator/health/liveness`, `/actuator/health/readiness`) are platform-facing (Railway) and operator-facing only; users never hit them. `/verify-with-playwright` is NOT the right verification pass for this spec; the authored `LivenessReadinessProbeTest` (5 test methods) IS the verification, supplemented by post-deploy `curl` checks against the Railway production URL once the spec ships.

---

# Spec 1.10j Brief — Liveness/Readiness Health Checks

**Canonical ID:** `round3-phase01-spec10j-liveness-readiness-health-checks`
**Phase:** 1
**Size:** S
**Risk:** Low
**Branch:** `forums-wave-continued`
**Prerequisites:** 1.4 (Spring Security) ✅, 1.10 (Phase 1 Cutover) ✅, 1.10g (Security Headers Middleware) ✅
**Unblocks:** Railway stops routing user traffic to a backend that's still running Liquibase migrations; foundation for graceful zero-downtime deploys.

---

## 1. Goal

Differentiate "is the JVM process alive?" from "is the app ready to serve traffic?" by exposing Spring Boot Actuator's separate liveness and readiness probe endpoints, then point Railway at the readiness probe so the platform stops routing traffic to a backend that's still booting.

Today's gap: Railway has NO healthcheck configured (no `railway.toml` in the repo), which means Railway defaults to TCP checks — "port 8080 is listening, ship traffic." That's not liveness, that's port-binding. During Liquibase migration startup, the Spring Boot process IS alive and DOES bind the port BEFORE Liquibase finishes. Railway happily routes a real user request to a half-booted app, which then 5xx's because the JPA `EntityManager` isn't ready. We've been lucky so far because Phase 1 has zero real users; this fix is cheap insurance before we have any.

Three deliverables:

1. Spring Boot Actuator config that exposes `/actuator/health/liveness` and `/actuator/health/readiness` with the right semantics:
   - Liveness = "process is alive; if false, Railway should restart"
   - Readiness = "process is ready to serve traffic, including DB connectivity confirmed by Liquibase completion; if false, Railway should NOT route requests"
2. Backend tests asserting:
   - Both endpoints exist and return 200 + correct JSON shape when the app is fully booted
   - Both endpoints are publicly accessible without authentication (the existing `PublicPaths` covers `/actuator/health` but NOT the sub-paths `/actuator/health/liveness` and `/actuator/health/readiness` by default — must verify and fix if needed)
   - The new `SecurityHeadersConfig` from 1.10g still emits all six security headers on these endpoints
3. A new `railway.toml` at repo root configuring Railway to use `/actuator/health/readiness` as the platform-level health check.

---

## 2. Master Plan Divergences

Two deviations from master plan v2.9 § Phase 1 Spec 1.10j body:

1. **Railway config is part of the deliverable.** Master plan body describes 1.10j as a backend Spring Boot config change only. This brief extends to include creating `railway.toml` so the probes actually GET USED by the platform. Without that, exposing the endpoints provides no production value — it's just docs that Railway ignores. The `railway.toml` addition is small (~10 lines), low-risk, and the missing piece between "the endpoint exists" and "Railway uses it."

2. **`PublicPaths` investigation required, possibly extended.** The existing `PublicPaths.PATTERNS` includes `/actuator/health` but NOT `/actuator/health/liveness` or `/actuator/health/readiness`. Spring Security path matching may or may not treat `/actuator/health` as a prefix that covers the sub-paths — this depends on whether the existing pattern uses a wildcard. CC must verify in execution and either confirm coverage or extend the patterns list. If the patterns need extending, this is in scope; do it and document it.

---

## 3. Recon Facts (verified during brief authoring)

- **Spring Boot version:** 3.5.11. Liveness/readiness probes have been built-in since Spring Boot 2.3.
- **`spring-boot-starter-actuator`** is already a `pom.xml` dependency. No new dependency needed.
- **Current actuator config in `application.properties`:**
  ```
  management.endpoints.web.exposure.include=health,info
  management.endpoint.health.show-details=always
  management.health.defaults.enabled=true
  ```
- **Current actuator config in `application-prod.properties`:**
  ```
  management.endpoints.web.exposure.include=health,info
  management.endpoint.health.show-details=when-authorized
  ```
- **The probes are AUTO-CONFIGURED on Kubernetes-detected platforms** but must be EXPLICITLY ENABLED on non-Kubernetes platforms (Railway is non-K8s) via:
  ```
  management.endpoint.health.probes.enabled=true
  ```
  This is the single most important config knob in this spec.
- **Once enabled, Spring Boot exposes:**
  - `GET /actuator/health/liveness`  → 200 with `{"status":"UP"}` when alive
  - `GET /actuator/health/readiness` → 200 with `{"status":"UP"}` when ready
  - Both return 503 with `{"status":"DOWN"}` when their respective `HealthIndicator`s report failure.
- **Liveness defaults** to "always UP unless explicitly marked DOWN via `ApplicationAvailability`." This is correct for Worship Room — JVM-process-alive is the right semantic.
- **Readiness defaults** to "UP after `ApplicationContext` refreshes," which empirically happens AFTER Liquibase completes. This is also correct for Worship Room — the DB-connectivity check comes for free.
- **`PublicPaths.PATTERNS`** currently lists `/actuator/health` and `/actuator/info`. Sub-paths `/actuator/health/liveness` and `/actuator/health/readiness` must be verified to be covered. If not covered, add the patterns explicitly.
- **`ApiController`** has its own `/api/health`, `/api/v1/health`, and `/api/hello` endpoints. These are SEPARATE from Actuator's `/actuator/health` and serve different purposes (the `ApiController` ones report upstream API key configured-state). Out of scope — do NOT modify `ApiController`.
- **No `railway.toml`** exists at repo root. Railway is using platform defaults (TCP-port check on 8080).
- **Filter chain order from 1.10g:** `RequestIdFilter` (`HIGHEST_PRECEDENCE`) → `CorsFilter` (+5) → `SecurityHeadersFilter` (+6, NEW from 1.10g) → `RateLimitFilter` (+10) → `LoginRateLimitFilter` (+20) → `JwtAuthenticationFilter`. The new actuator probe responses go through this entire filter chain, which means `SecurityHeadersFilter` decorates them with the six security headers. No extra work needed for that — just verify in tests.

---

## 4. Deliverables

**New code files:** NONE (config-only spec).

**Modified code files:**

- `backend/src/main/resources/application.properties`:
  ```
  management.endpoint.health.probes.enabled=true
  management.health.livenessstate.enabled=true
  management.health.readinessstate.enabled=true
  ```
  These three together explicitly enable the probes on non-K8s platforms.

**Modified code files (PublicPaths — IF NEEDED, verify first):**

- `backend/src/main/java/com/worshiproom/auth/PublicPaths.java`:
  May need to add `/actuator/health/liveness` and `/actuator/health/readiness` if Spring Security path matching doesn't treat `/actuator/health` as a prefix wildcard. CC verifies during execution and reports back.

**New tests:**

- `backend/src/test/java/com/worshiproom/health/LivenessReadinessProbeTest.java` with 5 test methods:
  1. `livenessProbe_returnsUpWithStatusOnly()` — `GET /actuator/health/liveness`, expect 200, JSON `{"status":"UP"}`, no extra fields.
  2. `readinessProbe_returnsUpWhenAppFullyBooted()` — `GET /actuator/health/readiness`, expect 200, JSON `{"status":"UP"}`.
  3. `livenessProbe_isPubliclyAccessible_noJwtRequired()` — `GET /actuator/health/liveness` with no `Authorization` header, expect 200 (NOT 401).
  4. `readinessProbe_isPubliclyAccessible_noJwtRequired()` — same, for readiness.
  5. `probesEmitSecurityHeaders()` — assert that BOTH probes return all six security headers from 1.10g (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`). This is the cross-spec integration test — proves the `SecurityHeadersFilter` decorates probe responses too.

**New configuration file:**

- `railway.toml` at repo root. Minimal Railway service config pointing the platform's health check at the new readiness probe:

  ```toml
  [build]
  builder = "DOCKERFILE"
  dockerfilePath = "backend/Dockerfile"

  [deploy]
  healthcheckPath = "/actuator/health/readiness"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
  ```

  Note: Railway also supports TOML keys for region, replicas, etc. Keep this file minimal — only the healthcheck and restart policy keys. CC must verify the exact key names against current Railway docs (the schema has shifted in recent Railway versions). Reference: https://docs.railway.com/reference/config-as-code

**Modified documentation:**

- `.claude/rules/08-deployment.md` (or similar): add a brief section noting that Railway now uses the readiness probe for health checks. ~5–10 lines.

---

## 5. Why This Matters (Rationale)

The bug class this spec prevents:

1. User registers via the frontend.
2. Backend deploy in progress on Railway. Spring Boot process has bound port 8080 but Liquibase is still running migrations.
3. Railway TCP-checks port 8080, sees it's open, routes the user's `POST /api/v1/auth/register` to the half-booted backend.
4. Spring tries to obtain a JPA `EntityManager`, `EntityManagerFactory` not yet ready, exception bubbles up, user sees 5xx.

With this spec:

1. User registers via the frontend.
2. Backend deploy in progress. Spring Boot has bound port 8080 but Liquibase still running.
3. Railway hits `/actuator/health/readiness`, gets 503 because `ApplicationContext` hasn't finished refreshing.
4. Railway holds the user's request in its queue (or routes to a different healthy instance once we have replicas), serves the request when readiness flips to UP.

**Liveness vs readiness semantically:**

- **Liveness DOWN** → "this process is broken; restart it." Right now Worship Room never marks itself liveness DOWN, which is correct — there's no scenario today where the JVM is alive but the app is permanently wedged. Future specs may add custom liveness indicators (e.g., a deadlocked thread detector).
- **Readiness DOWN** → "don't send me traffic yet; I'll be ready in a moment." Used during boot (Liquibase running) and during graceful shutdown (Spring Boot 2.3+ flips readiness to DOWN before shutting down so in-flight requests can drain).

---

## 6. Tests Required

**Test class:** `LivenessReadinessProbeTest`, integration-style, extends `AbstractIntegrationTest` (per the post-Spec-1.7 pattern documented in `06-testing.md`). Five test methods listed above in § 4 Deliverables.

**Test baseline:** 422 backend tests pass post-1.10g. New tests bring count to 427+. Wall-clock impact: <2s for new tests (no heavy fixtures; just `MockMvc` against the actuator endpoints).

**Note on docker-compose:** the `post-1.10-followups.md` item #9 (`RateLimitIntegrationTest` dev-Postgres dependency) still applies. If `./mvnw test` fails with 30 cascading errors, run `docker-compose up -d postgres` first.

---

## 7. Out of Scope

- **Custom `HealthIndicator` beans** for downstream services (Gemini, Google Maps, FCBH). Out of scope. Spring Boot's built-in `DataSourceHealthIndicator` covers DB connectivity automatically; the upstream API health is reported by `ApiController`'s existing `/api/v1/health` endpoint, which is a separate concern.
- **Marking the app as `readiness=DOWN` during graceful shutdown.** Spring Boot 2.3+ does this automatically; no extra config needed.
- **Adding `/actuator/metrics`, `/actuator/prometheus`,** or other observability endpoints. Belongs to Spec 1.10d (Production Monitoring Foundation).
- **Modifying `ApiController`'s `/api/health`, `/api/v1/health`, or `/api/hello`.** Those endpoints serve a different purpose (upstream API configured-state) and are out of scope.
- **Modifying the existing `/actuator/health` endpoint.** The probes are SIBLINGS, not REPLACEMENTS. `/actuator/health` continues to work and aggregates everything; the probes are more granular.
- **Adding authentication to the probes.** They MUST be public so Railway can call them without credentials.
- **Configuring Railway replicas, region, or scaling.** Out of scope for this spec; `railway.toml` stays minimal.
- **Modifying `frontend/**` anywhere.** Backend-only spec.

---

## 8. Acceptance Criteria

- [ ] `application.properties` has the three probe-enable lines.
- [ ] Local: `GET http://localhost:8080/actuator/health/liveness` returns 200 + `{"status":"UP"}`.
- [ ] Local: `GET http://localhost:8080/actuator/health/readiness` returns 200 + `{"status":"UP"}`.
- [ ] Both endpoints accessible without `Authorization` header (no 401 from `JwtAuthenticationFilter`).
- [ ] Both endpoints carry all six security headers from 1.10g.
- [ ] `LivenessReadinessProbeTest` has all 5 methods, all green.
- [ ] Backend test baseline: 427+ tests pass, 0 fail.
- [ ] `railway.toml` exists at repo root, `healthcheckPath` points at `/actuator/health/readiness`.
- [ ] `.claude/rules/08-deployment.md` updated with health-check section.
- [ ] No frontend changes.
- [ ] No new dependency in `pom.xml`.
- [ ] Post-deploy verification (deferred, not pre-merge gate): `curl https://worship-room-production.up.railway.app/actuator/health/readiness` returns 200 + `{"status":"UP"}` once Railway redeploys.

---

## 9. Guardrails (DO NOT)

- Do NOT change branches. Stay on `forums-wave-continued`.
- Do NOT modify `frontend/**` anywhere.
- Do NOT modify `ApiController.java`. Its `/api/v1/health` is separate from Actuator's `/actuator/health` and serves a different purpose.
- Do NOT modify `SecurityConfig.java` or `SecurityHeadersConfig.java`.
- Do NOT add custom `HealthIndicator` beans (out of scope).
- Do NOT add authentication to the probes.
- Do NOT add `/actuator/metrics`, `/actuator/prometheus`, or other observability endpoints (belongs to 1.10d).
- Do NOT add Railway replicas, scaling, or region config to `railway.toml`. Keep it minimal — healthcheck + restart policy only.
- Do NOT add any new dependency to `pom.xml`. Actuator is already there.
- Do NOT add any new env var (probe config is all in `application.properties`).
- Do NOT commit, push, or do any git operation. Eric handles all git.
- Do NOT touch `_forums_master_plan/spec-tracker.md`. Eric flips ✅ manually.

---

## 10. Plan Shape Expectation

`/plan-forums` output for this S/Low spec should be tight. 5–7 steps:

1. Recon: read 1.10g `SecurityHeadersConfig`, `PublicPaths.java`, `application*.properties`; verify whether `/actuator/health` prefix covers the sub-paths in Spring Security matching.
2. Add three probe-enable lines to `application.properties`.
3. If `PublicPaths` needs the sub-paths added, do so.
4. Write `LivenessReadinessProbeTest.java` with 5 methods.
5. Write `railway.toml` at repo root.
6. Update `.claude/rules/08-deployment.md`.
7. Run `./mvnw test`; iterate.

If plan comes back with 12+ steps, push back. If it proposes custom `HealthIndicator` beans or modifying `ApiController`, push back.

---

## 11. Out-of-Band Notes for Eric

- Spec-tracker still shows 1.10g as ⬜ (was just shipped in commit `88d563a` on this branch); expected to flip to ✅ when Eric updates the tracker. Same for 1.10j once this lands.
- Post-deploy `curl` verification against Railway is deferred and not a pre-merge gate. The pre-merge bar is local `./mvnw test` green + the 5 new test methods passing.
- `railway.toml` is the first config-as-code file Worship Room ships for Railway. Future Railway-related config (replicas, scaling, region) goes in the same file as separate spec scope.
