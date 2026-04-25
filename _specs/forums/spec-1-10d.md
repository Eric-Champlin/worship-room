# Forums Wave: Spec 1.10d — Production Monitoring Foundation

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.10d (v2.9, Phase 1)
**Branch:** `forums-wave-continued` (continuation branch — no new branch created per Eric's instruction)
**Date:** 2026-04-25

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code, no React component changes, no nginx config touch. The Sentry SDK fires server-side from the JVM only; there is no browser-visible behavior change. `/verify-with-playwright` is NOT the right verification pass for this spec; the authored `SentryConfigTest` (5 test methods) IS the in-suite verification, supplemented by post-deploy manual verification per the runbook (signed-up Sentry account → wired DSN → deliberate exception → confirmed event landing in dashboard within ~30 seconds).

---

# Spec 1.10d Brief — Production Monitoring Foundation

**Canonical ID:** `round3-phase01-spec10d-production-monitoring-foundation`
**Phase:** 1
**Size:** M
**Risk:** Low (additive operational tooling; DSN-absent path is a graceful no-op)
**Branch:** `forums-wave-continued`
**Prerequisites:** 1.4 (Spring Security) ✅, 1.10 (Phase 1 Cutover) ✅, 1.10g (Security Headers) ✅, 1.10i (Env Vars Runbook) ✅
**Unblocks:** Phase 2 (Activity Engine) — six new endpoints land into a backend whose unhandled exceptions are visible to Eric, instead of vanishing into Railway log scrollback.

---

## 1. Goal

Wire Sentry into the BACKEND so unexpected production exceptions land in a dashboard Eric can actually see, instead of vanishing into Railway log scrollback. Foundation only — no UptimeRobot, no frontend Sentry, no APM tracing. Just "if a 5xx fires in prod, Eric gets an alert."

The honest motivation: today, if a real user registers and the backend throws an unexpected `RuntimeException`, the user sees a generic error and Eric finds out only if the user complains. Phase 1 has zero real users so this gap is theoretical, but Phase 2 (Activity Engine) introduces 6 new endpoints whose failures need visibility. Land the foundation now so Phase 2 inherits it instead of needing a follow-up spec mid-wave.

Three deliverables:

1. **Sentry SDK** wired into the backend via the official `sentry-spring-boot-starter-jakarta`. Configured to gracefully no-op when `SENTRY_DSN` env var is absent (so dev/test runs never spam Sentry, and prod only captures when explicitly wired).

2. **A `SentryConfig.java`** that customizes:
   - User context attachment from JWT subject (`user.id` only — NEVER email, NEVER PII)
   - Environment tagging (production / dev / test)
   - Sane defaults for sample rates (events: 1.0, traces: 0.0)
   - `beforeSend` filtering to drop expected business exceptions (anything in the "expected error" categories from `backend/docs/api-error-codes.md` — auth failures, validation errors, rate limits, upstream errors, safety blocks)

3. **A new operator runbook** at `backend/docs/runbook-monitoring.md` covering: account/project setup, DSN extraction, Railway env var wiring, how to triage an alert, and the explicit "what's NOT in scope yet" list (UptimeRobot, frontend Sentry, custom metrics, alerting routing rules).

---

## 2. Master Plan Divergences

Three deviations from master plan v2.9 § Spec 1.10d body:

### 2.1 Backend-only scope

The master plan implies both backend and frontend Sentry land in this spec. This brief defers frontend Sentry to a follow-up (call it 1.10d-bis when scoped).

**Reasons:**

- Two-platform Sentry doubles the surface area: separate SDK, separate DSN, separate sample rates, separate source-map upload pipeline, separate error boundary integration.
- Backend errors are the high-value targets — silent server failures hurt users invisibly. Frontend errors at least manifest as the existing ErrorBoundary's "something went wrong" UI; users notice and complain.
- Tighter spec ships faster and gets exercised against real traffic before frontend layers on.
- Existing `frontend/src/components/ErrorBoundary.tsx` and `ChunkErrorBoundary.tsx` already have `componentDidCatch` hooks calling `console.error` — clean integration points when 1.10d-bis ships.

### 2.2 No UptimeRobot in scope

The master plan body bundles "Sentry + UptimeRobot" together. This brief keeps the runbook section that DOCUMENTS UptimeRobot setup (so Eric has the procedure when he wants it) but does NOT actually configure or test it.

**Reasons:**

- UptimeRobot is an external service config, not code. It's a "click around in their dashboard, paste a URL, set alert email" flow — Eric does this in 5 minutes when ready, no CC involvement needed.
- Sentry already covers in-process exceptions, which is the 90% case. UptimeRobot covers "the entire process is unreachable" which Railway's own healthcheck (1.10j) already handles to a first approximation.
- Documenting it in the runbook beats wiring it speculatively.

### 2.3 Event filtering is part of foundation, not future

Master plan body treats "what to capture vs ignore" as future tuning. This brief commits to a specific filter rule in the foundation spec: drop exceptions that map to the "expected error" codes from `backend/docs/api-error-codes.md` (auth / validation / rate limit / upstream / safety). Without this filter, Sentry's free tier (5K events/month) gets eaten in days by routine 401s and 429s, defeating the alerting purpose. The filter must ship with the foundation or the foundation is broken.

---

## 3. Recon Facts

Verified during brief authoring — re-verify suspect ones during execution.

- Backend: Spring Boot 3.5.11, Java 21.
- Sentry SDK: `io.sentry:sentry-spring-boot-starter-jakarta` is the correct artifact for Spring Boot 3.x. CC must verify the current stable version against Maven Central during recon (Sentry releases monthly; brief authored without Maven Central access).
- Existing `pom.xml` does NOT contain Sentry. New dependency required. (Verified by inspection.)
- Existing exception handler topology:
  - `ProxyExceptionHandler` — `@RestControllerAdvice(basePackages = "com.worshiproom.proxy")`. Has a `Throwable.class` catch-all that returns `INTERNAL_ERROR` 500.
  - `AuthExceptionHandler` — `@RestControllerAdvice` in `com.worshiproom.auth`. NO `Throwable.class` catch-all.
  - `AuthValidationExceptionHandler`, `UserValidationExceptionHandler` — package-scoped advices for validation.
  - `RateLimitExceptionHandler` — global advice (no `basePackages` filter) to handle filter-raised rate-limit exceptions where the dispatcher sees `handler=null`.
  - No global `@RestControllerAdvice` catch-all that covers auth/user packages. Per `backend/docs/api-error-codes.md` § 6.3, this is a known gap.
- 14 canonical error codes documented at `backend/docs/api-error-codes.md` (shipped by Spec 1.10h). This brief uses that catalog to define which exceptions are "expected" (filter out of Sentry) vs "unexpected" (send to Sentry).
- Existing logging: Logback with `logstash-logback-encoder` for JSON output in prod. Sentry has a Logback appender that can ship ERROR-level log events as Sentry events; this brief does NOT enable that path (would double-count exceptions with the Spring Boot starter's auto-capture). Documented as a deliberate exclusion.
- Existing env vars (per 1.10i runbook): `SPRING_PROFILES_ACTIVE`, `SERVER_PORT`, `SPRING_DATASOURCE_*`, `JWT_SECRET`, `JWT_EXPIRATION`, `PROXY_CORS_ALLOWED_ORIGINS`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY`. This spec adds: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` (optional). The 1.10i runbook must be updated as part of this spec.
- `08-deployment.md` § "Optional / Phase-specific" already lists `SENTRY_DSN` and `SENTRY_ENVIRONMENT` as aspirational env vars introduced by Spec 1.10d. They're documented in `backend/docs/env-vars-runbook.md` § 6.1 as future. This spec migrates them from the aspirational list to the main catalog.
- Spec 1.10g (security headers) added a CSP that does NOT include any Sentry origin in `connect-src`. This is FINE for the backend Sentry SDK — the SDK fires server-side from the JVM, never from the browser. The CSP only matters for frontend Sentry (1.10d-bis), which IS out of scope. Note this in the runbook to prevent the mistake of "loosening CSP for backend Sentry."

---

## 4. Architectural Decisions

### 4.1 Use the official Spring Boot starter, not manual SDK init

`sentry-spring-boot-starter-jakarta` auto-wires the Sentry SDK into Spring Boot's lifecycle: HTTP request hooks via servlet filter, `@ExceptionHandler` integration, MDC propagation, graceful no-op when DSN is empty. Manual init would reimplement all of this and miss future starter updates.

### 4.2 DSN-absent must no-op

`SENTRY_DSN` empty (or absent) MUST produce zero outbound HTTP traffic, zero log noise, zero startup warnings. Verified by:

- Local dev runs (no DSN set in `application-dev.properties`) boot identically to current behavior.
- Test runs (no DSN; `@DynamicPropertySource` doesn't supply one) produce identical test output.
- Spring Boot startup log includes Sentry's auto-config but the Sentry SDK itself is silent.

The starter handles this natively — just don't override its default behavior in our `SentryConfig`.

### 4.3 User context from JWT, never from request body

When a request is authenticated, attach `user.id` (UUID) to the Sentry scope so events can be filtered by user. NEVER attach email, display_name, IP, or any request-body content. This is privacy-preserving and matches the "no PII in logs" rule from `.claude/rules/07-logging-monitoring.md`.

**Implementation:** a Servlet filter or `HandlerInterceptor` that reads the `AuthenticatedUser` principal from `SecurityContextHolder` and calls `Sentry.configureScope`.

### 4.4 Event filtering via `beforeSend` hook

In `SentryConfig`, register a `beforeSend` callback that drops events for exceptions in the "expected" set:

- `AuthException` (all subclasses — 401s)
- `InvalidCredentialsException`, `TokenExpiredException`, etc.
- `MethodArgumentNotValidException` (400s — validation)
- `HandlerMethodValidationException`, `ConstraintViolationException`
- `RateLimitExceededException` (429s — rate limit)
- `UpstreamException` (502s — upstream APIs)
- `UpstreamTimeoutException` (504s)
- `SafetyBlockException` (422s — Gemini safety blocks)
- `FcbhNotFoundException` (404s — expected for missing chapters)
- `UserException` (400s — expected validation outcomes)

Everything else — including the catch-all `Throwable` handled by `ProxyExceptionHandler.handleUnexpected` — DOES go to Sentry. That's the whole point.

The filter list is PINNED in code (not env-var-tunable) because changing it should require code review.

### 4.5 Environment tag from `SENTRY_ENVIRONMENT`, fallback to Spring profile

`SENTRY_ENVIRONMENT` explicit beats spring profile inferred. Default fallback: `production` if active profile is `prod`; `development` if `dev`; `test` if no profile set (matches Spring's default). This means dev runs that accidentally ship a DSN tag events as `development`, not `production` — Eric can filter Sentry's UI accordingly.

### 4.6 Sample rates pinned, not tuned

- `tracesSampleRate = 0.0` (no APM tracing; defer to a future spec when load justifies it)
- `sampleRate` (events) = 1.0 (capture every error event; filter via `beforeSend`, not via sampling)

These are pinned in `SentryConfig` as code constants. Not env-var-tunable. Tuning is its own follow-up spec.

### 4.7 No Logback integration

Sentry can ship ERROR-level log events as Sentry events via its Logback appender. We deliberately DO NOT enable this path — the Spring Boot starter already captures exceptions through the `@ExceptionHandler` chain, and adding Logback ingestion would double-count every exception. Logback continues to write structured JSON to stdout per the existing `logback-spring.xml`.

---

## 5. Deliverables

### 5.1 New code files

**`backend/src/main/java/com/worshiproom/config/SentryConfig.java`**
~80–120 lines including doc comment. Modeled on the structure of `CorsConfig.java` / `SecurityHeadersConfig.java` for architectural symmetry. Contains:

- `@Configuration` class
- The expected-exception filter set as a `private static final Set<Class<? extends Throwable>>`
- `@Bean SentryOptions.BeforeSendCallback` that consults the set
- `@Bean` (or `@Component`) the filter/interceptor that attaches `user.id` to the Sentry scope from `SecurityContextHolder`

**`backend/src/test/java/com/worshiproom/config/SentryConfigTest.java`**
Test methods covering:

- `beforeSend_dropsExpectedExceptions()` — for each class in the expected set, build a synthetic `SentryEvent` and assert `beforeSend` returns null
- `beforeSend_keepsUnexpectedExceptions()` — for a synthetic `RuntimeException`, assert `beforeSend` returns the event unchanged
- `dsnAbsent_doesNotCrashOnStartup()` — Spring context loads cleanly with no `SENTRY_DSN` property
- `userScopeAttachment_idOnly_noPii()` — set up an `AuthenticatedUser` in `SecurityContextHolder`, invoke the interceptor/filter, assert the Sentry scope captured `user.id` and NOTHING else (no email, no displayName)
- `userScopeAttachment_anonymousRequest_noUserSet()` — empty `SecurityContextHolder`, assert no user is attached to scope

### 5.2 Modified code files

**`backend/pom.xml`** — add `sentry-spring-boot-starter-jakarta` dependency. CC verifies the current stable version against Maven Central. NO other dependency changes.

**`backend/src/main/resources/application.properties`** — add:

```properties
sentry.dsn=${SENTRY_DSN:}
sentry.environment=${SENTRY_ENVIRONMENT:}
sentry.send-default-pii=false
sentry.traces-sample-rate=0.0
sentry.enable-tracing=false
```

(`sentry.dsn` empty default → graceful no-op. PII flag MUST be false; the starter has options that would auto-attach request bodies and headers, which would leak journal entries / prayer text / passwords into Sentry. Hard rule: false.)

**`backend/src/main/resources/application-prod.properties`** — no changes needed. Spring's relaxed binding pulls `SENTRY_DSN` from env; the env-driven values flow through at runtime.

### 5.3 New documentation

**`backend/docs/runbook-monitoring.md`** — sections:

1. Purpose and scope
2. What's monitored (backend exceptions only — explicit "frontend errors NOT YET monitored", "uptime NOT YET monitored", "performance NOT YET monitored")
3. Sentry account and project setup (the click-by-click vendor procedure: sign up at sentry.io, create organization if needed, create project named "worship-room-backend" with platform "Java/Spring Boot", extract DSN from project Settings → Client Keys)
4. Wiring `SENTRY_DSN` into Railway (point at 1.10i runbook procedure; this is just var addition)
5. Verifying the integration end-to-end (after Railway redeploy, hit a known-broken endpoint or temporarily throw from a test endpoint; expect event to appear in Sentry within ~30 seconds)
6. Triaging an alert (when Sentry emails Eric: open the event, check stack trace, check user context for reproduction, check tags for environment + release, decide: real bug → file follow-up; expected error → add to `beforeSend` filter)
7. UptimeRobot setup procedure (DOCUMENTED, not configured — external dashboard clicks: sign up, add HTTP(s) monitor pointing at `https://worship-room-production.up.railway.app/actuator/health/readiness`, interval 5min, alert contact Eric's email. Ship this section so Eric has the procedure when he wants it)
8. Known gaps and follow-ups
   - Frontend Sentry (1.10d-bis follow-up)
   - APM/tracing (future spec when load justifies)
   - Custom metrics dashboards (future spec)
   - Logback ERROR-level ingestion (deliberately excluded — see § 4.7 of architectural decisions)
   - Alert routing beyond default email (Slack, PagerDuty, etc.)
9. Related documents
   - `.claude/rules/07-logging-monitoring.md`
   - `backend/docs/env-vars-runbook.md`
   - `backend/docs/api-error-codes.md` (the source of the expected-exception filter set)

### 5.4 Modified documentation

**`backend/docs/env-vars-runbook.md`** — three changes:

(a) Add `SENTRY_DSN` to § 2 quick-start matrix (Sensitivity: secret, optional everywhere — graceful no-op when empty)
(b) Add `SENTRY_ENVIRONMENT` to § 2 quick-start matrix (Sensitivity: config, optional everywhere)
(c) Add per-var detail blocks in a new § 3.6 Monitoring category for both vars
(d) Remove `SENTRY_DSN` and `SENTRY_ENVIRONMENT` from the § 6.1 aspirational list — they're now real, not aspirational

**`.claude/rules/07-logging-monitoring.md`** — add a "Sentry Integration" subsection (~15 lines) covering: where to read the runbook, the user-id-only PII rule, the DSN-absent no-op guarantee, and a pointer to the `beforeSend` filter list as the canonical "expected vs unexpected" boundary.

---

## 6. Tests Required

Test class: `SentryConfigTest` in `com.worshiproom.config` (same package as `SentryConfig.java` so the `beforeSend` bean and the interceptor/filter are reachable as package-private if needed).

Five test methods listed in § 5.1.

Test baseline post-1.10j: 427 tests pass. New tests bring count to ~432. Wall-clock impact: <1s for new tests (no external HTTP, no Testcontainers needed — pure unit tests against the `SentryConfig` bean and a lightweight `SecurityContext` mock).

The DSN-absent test must NOT actually call Sentry's network layer. The starter's own no-op behavior takes care of that when the property is empty; the test just asserts the Spring context loads cleanly.

NO test sends real events to Sentry. NO test requires a real DSN. The integration is verified post-deploy by Eric (per runbook § 5), not in the test suite.

---

## 7. Database Changes

None.

---

## 8. API Changes

None. Sentry is operational, not a public API. No `openapi.yaml` modification.

---

## 9. Copy Deck

None. No user-facing copy.

---

## 10. Anti-Pressure Copy Checklist

N/A — no user-facing surfaces.

---

## 11. Anti-Pressure Design Decisions

N/A — operational tooling only.

---

## 12. Out of Scope

- Frontend Sentry (`@sentry/react`). Deferred to a follow-up spec (1.10d-bis when scoped). The existing `ErrorBoundary`, `ChunkErrorBoundary`, and `RouteErrorBoundary` stay `console.error`-only for now.
- UptimeRobot CONFIGURATION. The runbook documents the procedure; Eric executes it when ready.
- APM / performance tracing. `tracesSampleRate` pinned to 0.0.
- Custom metrics, dashboards, or business KPIs.
- Alerting routing beyond Sentry's default email.
- Source-map upload pipeline (relevant only when frontend Sentry ships).
- Logback ERROR-level → Sentry ingestion (would double-count; deliberately excluded).
- CSP loosening to allow a Sentry origin (not needed — backend SDK fires server-side, never from the browser).
- Any modification to existing `ExceptionHandler` classes. Sentry integration goes through the starter's own `@ControllerAdvice` hooks; existing handlers are not touched.
- Modification of `openapi.yaml` (Sentry is operational, not a public API).
- Real user identifiers beyond `user.id` UUID. Email, display name, IP, request body — never.

---

## 13. Acceptance Criteria

- [ ] `sentry-spring-boot-starter-jakarta` added to `pom.xml` at a current stable version verified against Maven Central.
- [ ] `application.properties` has the five Sentry config lines with empty defaults for DSN and environment.
- [ ] `SentryConfig.java` exists at the canonical `config/` path, registers a `beforeSend` bean and a user-context attachment bean.
- [ ] `beforeSend` filter set covers all 9 expected-exception classes from § 4.4.
- [ ] User context attachment captures `user.id` ONLY. No email, no displayName, no other PII. Verified by test.
- [ ] DSN-absent boots cleanly with zero outbound traffic and no warnings. Verified by local dev run + test.
- [ ] `backend/docs/runbook-monitoring.md` exists with all 9 sections.
- [ ] `backend/docs/env-vars-runbook.md` updated: `SENTRY_DSN` + `SENTRY_ENVIRONMENT` in main catalog § 3.6 + § 2 matrix; removed from § 6.1 aspirational list.
- [ ] `.claude/rules/07-logging-monitoring.md` has the new Sentry Integration subsection.
- [ ] Backend test baseline: 432+ tests pass, 0 fail.
- [ ] No frontend changes.
- [ ] All other security-headers, CORS, JWT, and rate-limit behavior unchanged (regression check via existing tests).
- [ ] Post-deploy verification (Eric does this, NOT a pre-merge gate):
  1. Sign up for Sentry account if needed.
  2. Create `worship-room-backend` project, extract DSN.
  3. Add `SENTRY_DSN` + `SENTRY_ENVIRONMENT=production` to Railway backend service Variables.
  4. Trigger a known unhandled exception (suggestion in runbook § 5: temporary throw from a test endpoint, OR wait for the first real one).
  5. Confirm event appears in Sentry within ~30 seconds with correct environment tag and stack trace.

---

## 14. Notes for Plan Phase Recon

`/plan-forums` output for this M/Low spec should be 7–10 steps:

1. Recon: read existing exception handler topology, confirm Sentry version against Maven Central, read the existing `AuthenticatedUser` principal shape in `SecurityContextHolder`.
2. Add `sentry-spring-boot-starter-jakarta` to `pom.xml` at the verified version.
3. Add the five Sentry config lines to `application.properties`.
4. Author `SentryConfig.java` with the `beforeSend` bean and the user-context attachment bean.
5. Author `SentryConfigTest.java` with the five test methods.
6. Author `backend/docs/runbook-monitoring.md`.
7. Update `backend/docs/env-vars-runbook.md` (three sections).
8. Update `.claude/rules/07-logging-monitoring.md` with the Sentry Integration subsection.
9. Run `./mvnw test`; iterate.
10. Self-review against acceptance criteria.

If plan comes back with 15+ steps, push back. If it proposes modifying any existing `ExceptionHandler`, modifying frontend code, or enabling Logback ingestion, push back hard — those are explicit guardrail violations.

---

## 15. Guardrails (DO NOT)

- Do NOT change branches. Stay on `forums-wave-continued`.
- Do NOT modify `frontend/**` anywhere.
- Do NOT modify any existing `ExceptionHandler` class.
- Do NOT modify `SecurityConfig.java`, `CorsConfig.java`, or `SecurityHeadersConfig.java`.
- Do NOT enable Sentry's Logback appender (would double-count).
- Do NOT enable APM tracing (`tracesSampleRate` stays 0.0).
- Do NOT attach email, display name, IP, request body, or any PII beyond `user.id` to Sentry events.
- Do NOT loosen CSP. Backend Sentry doesn't need it.
- Do NOT add a Sentry origin to `PROXY_CORS_ALLOWED_ORIGINS`. Backend Sentry doesn't need that either.
- Do NOT actually configure UptimeRobot. Document only.
- Do NOT add frontend Sentry SDK (`@sentry/react`) to `package.json`.
- Do NOT modify `openapi.yaml`.
- Do NOT touch the `spec-tracker.md`.
- Do NOT commit, push, or do any git operation. Eric handles all git.
- Do NOT send real events to Sentry from any test.
- Do NOT hardcode a real DSN anywhere — env var only, with empty default.

---

## 16. Out-of-Band Notes for Eric

**Tracker discrepancy noted:** `_forums_master_plan/spec-tracker.md` line 49 currently shows Spec 1.10d as ✅ (Production Monitoring Foundation). On disk, no `spec-1-10d.md` exists prior to this authoring pass — the ✅ was stale. After this spec ships, the tracker will accurately reflect reality. No action required from Eric on the tracker until execution completes.

**Phase 2 inheritance:** When Phase 2 (Activity Engine) ships, the six new endpoints (`/api/v1/activity/*`) will inherit Sentry coverage automatically because the starter's `@ExceptionHandler` integration is package-agnostic. No per-endpoint wiring needed.

**Sentry free tier budget:** 5K events/month. With the `beforeSend` filter dropping all 9 expected-exception classes, real-world burn rate should be near-zero in Phase 1 (no real users) and bounded by genuine 5xx incidents in Phase 2+. If burn rate climbs unexpectedly, the runbook § 6 triage flow points at adding the offending class to the filter.

**1.10d-bis (frontend Sentry) when scoped:** The frontend ErrorBoundary integration points are `frontend/src/components/ErrorBoundary.tsx` (catches render errors) and `ChunkErrorBoundary.tsx` (catches lazy-load failures). Both call `console.error` today. A future spec adds `Sentry.init` to `frontend/src/main.tsx`, captures from those boundaries via `Sentry.captureException`, and adds a Sentry origin to the CSP `connect-src` directive in `SecurityHeadersConfig`.

---

**End of brief.**
