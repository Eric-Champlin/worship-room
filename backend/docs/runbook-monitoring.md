# Production Monitoring — Operator Runbook

This runbook documents how Sentry is wired into the Worship Room backend and how to operate it. Established by Forums Wave **Spec 1.10d** (Production Monitoring Foundation).

- **Code authority:** `backend/src/main/java/com/worshiproom/config/SentryConfig.java`
- **Policy authority:** `.claude/rules/07-logging-monitoring.md` § Error Tracking — Sentry
- **Test authority:** `backend/src/test/java/com/worshiproom/config/SentryConfigTest.java`
- **Sibling runbooks:** `runbook-security-headers.md`, `env-vars-runbook.md`, `api-error-codes.md`

---

## 1. Purpose and scope

Worship Room ships errors to Sentry when `SENTRY_DSN` is set. The Sentry SDK runs server-side from the Spring Boot JVM. The frontend bundle is unaffected — no Sentry SDK is loaded in the browser. Frontend error monitoring is a separate future spec (1.10d-bis).

The integration is intentionally narrow: **observe the unexpected, ignore the routine**. Auth failures, validation errors, rate-limit hits, upstream timeouts, and safety-filter blocks are deliberately filtered out before reaching Sentry — see § 6 for the full list and the rationale.

Operationally, this runbook supports three workflows:

1. First-time wiring of a new Sentry project into Railway (§§ 3-4).
2. Verifying the integration end-to-end after a config change (§ 5).
3. Triaging an alert when Sentry emails the operator (§ 6).

---

## 2. What's monitored

| Surface | Status | Notes |
|---|---|---|
| Backend unhandled exceptions (5xx that escape every `@RestControllerAdvice`) | ✅ monitored | Captured by the Sentry Spring starter's `@ExceptionHandler` integration. |
| Backend exceptions caught by the catch-all `ProxyExceptionHandler.handleUnexpected` path | ✅ monitored | Same starter integration; the advice handles them but the SDK still observes. |
| Frontend errors (browser-side) | ❌ NOT monitored | `ErrorBoundary` / `ChunkErrorBoundary` / `RouteErrorBoundary` continue to `console.error`. Future spec 1.10d-bis. |
| Uptime (process unreachable, JVM crashed, port not bound) | ❌ NOT monitored via Sentry | Sentry can't catch a dead JVM — a dead process emits no events. UptimeRobot procedure documented in § 7; Railway's platform-level `/actuator/health/readiness` probe is the fallback. |
| APM / performance traces | ❌ NOT captured | `traces-sample-rate=0.0`. Future spec when scoped. |
| Custom metrics / business KPIs (e.g., login success rate, journal save latency) | ❌ NOT captured | Future spec when scoped. |
| Logback ERROR-level events (the Sentry Logback appender) | ❌ DELIBERATELY EXCLUDED | The Spring starter already captures every `@ExceptionHandler`-routed exception. Adding the Logback appender would double-count every error. See § 8. |

---

## 3. Sentry account and project setup

One-time, performed by Eric.

1. Sign up at <https://sentry.io> if no account exists. The personal/free tier (5K events/month, 50 transactions/month) is sufficient for Phase 1 volumes once the `beforeSend` filter is in place.
2. Create an organization (or reuse the existing personal org).
3. Create a project: **Platform = Java / Spring Boot**, **Project name = `worship-room-backend`**.
4. Extract the DSN: Project Settings → **Client Keys (DSN)** → copy the `https://<key>@oXXXX.ingest.sentry.io/<project>` string. Keep it secret — anyone with the DSN can submit events to your project.
5. (Optional) Configure default alert rules. Sentry creates a sane default ("alert on every new issue") that fits the free-tier event budget. Tune later as needed.

The free-tier event budget is 5K events/month. The `beforeSend` filter (§ 6) drops the bulk of routine error noise so the budget tracks real bugs rather than expected behavior.

---

## 4. Wiring `SENTRY_DSN` into Railway

The full env-var detail block is in `backend/docs/env-vars-runbook.md` § 3.6. Summary:

1. Open Railway dashboard → backend service → **Variables**.
2. Add two variables:
   - `SENTRY_DSN` = (the DSN copied from § 3 step 4). **Mark as secret** in the Railway UI if the option is offered.
   - `SENTRY_ENVIRONMENT` = `production`.
3. Save. Railway auto-redeploys the service.
4. Wait for the readiness probe to flip UP (~60 seconds typical). The backend now ships exceptions to Sentry.

`SENTRY_ENVIRONMENT` is technically optional — if absent, events ship without an environment tag and land in Sentry's default bucket. Strongly recommended in prod so you can filter by environment in the Sentry UI.

---

## 5. Verifying the integration end-to-end

After a fresh wiring or a Sentry SDK version bump, verify with these steps. CC's test suite already proves the DSN-absent path is silent and the bean factory doesn't crash; this section verifies the DSN-present path against a real Sentry endpoint.

1. Confirm Railway redeploy completed. `railway logs --service backend --tail 100` should show the app booted and readiness UP.
2. Trigger one unhandled exception. Two paths:
   - **Wait for an organic one** — appropriate for Phase 1 (no real user traffic yet). Patient verification.
   - **Add a temporary throw** — push a one-line test endpoint that throws `new RuntimeException("Sentry verify probe")`, deploy, hit it once with `curl`, **then immediately roll back the temp commit and redeploy**. Sentry probe commits never live past one deploy. The probe `RuntimeException` is unexpected (not in `EXPECTED_EXCEPTIONS`), so it reaches Sentry.
3. Open Sentry dashboard → confirm event appears within ~30 seconds. The event must show:
   - **Environment tag:** `production` (matches `SENTRY_ENVIRONMENT`).
   - **Stack trace:** full frames, including the controller and the synthetic throw.
   - **Tags / context:** the request ID. Cross-reference against the corresponding backend log line (`grep <request-id>`); both should agree on time and exception class.
   - **User:** if the test request was authenticated, the user's UUID under "User Context". No email, no displayName, no IP — that's the PII boundary.
4. Discard the test event in the Sentry UI to keep the dashboard clean.

If the event does NOT appear:
- Verify the DSN is correct (Sentry's "test event" tooling at Project Settings → Client Keys → "Send Test Event" can confirm DSN reachability without app code involvement).
- Check Railway logs for any Sentry init warning. The starter logs `Sentry initialized` (or similar) on first request — absence suggests the DSN was read as empty.
- Verify your synthetic exception class is not accidentally in `EXPECTED_EXCEPTIONS`. The filter set is package-visible from `SentryConfig.java`.

---

## 6. Triaging an alert

When Sentry emails Eric (or another configured contact):

1. Open the event in Sentry. The link in the email goes straight to the issue page.
2. Inspect:
   - **Stack trace** — top frame is usually the most informative.
   - **Environment tag** — distinguish prod from staging/dev if those exist.
   - **User UUID** — present only when the request was authenticated. Cross-reference against `users.id` in the prod database if the bug is user-specific.
   - **Request ID** — every error response and every backend log line carries the same `requestId` via MDC. `grep <request-id>` on the backend logs (or Railway's logs UI) yields the full server-side context.
3. Categorize:
   - **Real bug (server-side fault)** — file a follow-up ticket, fix in a regular spec workflow. Sentry's "Resolve" button closes the issue once fixed; new occurrences re-open it.
   - **Expected error that escaped the filter** — add the exception class to `SentryConfig.EXPECTED_EXCEPTIONS` in a follow-up spec; add the corresponding test row to `SentryConfigTest.beforeSend_dropsEachExpectedException`. **Do NOT silence in the Sentry UI** — code is the source of truth, and a UI ignore drifts out of sync with future deploys.
   - **Third-party noise** (an upstream library throws an exception we can't fix) — tune `beforeSend` further (add the upstream's exception class to `EXPECTED_EXCEPTIONS`) OR Sentry's "Inbound Filters" UI for vendor-side noise. Prefer the code path so the filter set stays auditable.

The `EXPECTED_EXCEPTIONS` set lives in `SentryConfig.java`. As of Spec 1.10d it covers:

- `AuthException` (auth domain — UNAUTHORIZED, INVALID_CREDENTIALS, TOKEN_*)
- `UserException` (user-domain validation — INVALID_INPUT, USER_NOT_FOUND)
- `MethodArgumentNotValidException` (Spring `@Valid` failures)
- `HandlerMethodValidationException` (Spring 6 method-arg validation)
- `ConstraintViolationException` (Jakarta Validation programmatic checks)
- `RateLimitExceededException` (RATE_LIMITED, 429)
- `UpstreamException` (UPSTREAM_ERROR, 502 — Gemini / Maps / FCBH unreachable)
- `UpstreamTimeoutException` (UPSTREAM_TIMEOUT, 504)
- `SafetyBlockException` (SAFETY_BLOCK, 422 — AI safety filter refusal)
- `FcbhNotFoundException` (NOT_FOUND, 404 — DBP fileset/chapter missing)

The filter walks the cause chain: a `RuntimeException` whose `getCause()` is one of these classes is also dropped. Updating the set is a code change reviewed via the standard spec workflow — NOT env-var-tunable.

---

## 7. UptimeRobot setup procedure (NOT YET CONFIGURED)

Sentry observes errors; it cannot observe a dead process. UptimeRobot is the documented procedure for the "process unreachable" failure mode. Eric runs the dashboard clicks when ready.

1. Sign up at <https://uptimerobot.com>. The free tier covers 50 monitors at 5-minute intervals — vastly sufficient for a single backend service.
2. Add a new HTTP(s) monitor:
   - **URL:** `https://<railway-backend>.up.railway.app/actuator/health/readiness` (replace placeholder with the actual Railway-assigned domain).
   - **Method:** GET.
   - **Interval:** 5 minutes (free-tier minimum; sufficient).
   - **Expected response code:** 200. The readiness endpoint returns 200 when the app is fully booted and 503 during shutdown / startup.
   - **Timeout:** 30 seconds (the readiness probe is fast; 30s catches genuine network hangs).
3. Add an alert contact: Eric's email (the `ADMIN_EMAIL` env var value, typically). Optional: SMS on the paid tier.
4. Save. The monitor begins polling immediately. The first failure triggers an email and turns the monitor red on the dashboard.

This is independent of Sentry — UptimeRobot covers the failure mode where Sentry can't help (the JVM is dead, the port isn't bound, Railway dropped the service). The two complement each other.

`/actuator/health/readiness` is excluded from `RateLimitFilter.shouldNotFilter`, public per `PublicPaths.PATTERNS`, and carries the standard security headers — UptimeRobot can poll at platform cadence without budget concerns.

---

## 8. Known gaps and follow-ups

- **Frontend Sentry → spec 1.10d-bis** when scoped. ErrorBoundary integration points: `frontend/src/components/ErrorBoundary.tsx`, `ChunkErrorBoundary.tsx`, `RouteErrorBoundary.tsx` — all `console.error` today. Will need: `@sentry/react` dependency, `Sentry.init` in `main.tsx`, `Sentry.captureException` from each ErrorBoundary `componentDidCatch`, and a Sentry origin added to the CSP `connect-src` directive in `SecurityHeadersConfig.java` so the browser SDK can POST events.
- **APM / tracing → future spec.** `traces-sample-rate=0.0` is pinned. Raising it is a separate concern (cost, signal-to-noise, transaction definition).
- **Custom metrics / dashboards → future spec.** Sentry has a custom-metrics product; not in scope here.
- **Alerting routing → future spec.** Sentry's default email goes to the project owner. Slack / PagerDuty / on-call rotation requires Sentry integration setup that is its own piece of work.
- **Logback ERROR ingestion → DELIBERATELY EXCLUDED.** Do NOT enable the Sentry Logback appender without first removing the Spring starter's `@ExceptionHandler` integration. They double-count.
- **CSP loosening for backend Sentry → NOT NEEDED.** The backend SDK fires server-side; the browser CSP `connect-src` directive is irrelevant. Only frontend Sentry (1.10d-bis) requires a CSP change. Do not preemptively add a Sentry origin to `connect-src`.

---

## 9. Related documents

- `.claude/rules/07-logging-monitoring.md` — § Error Tracking (Sentry), § Uptime Monitoring, § Audit Logging.
- `backend/docs/env-vars-runbook.md` — § 3.6 `SENTRY_DSN` and `SENTRY_ENVIRONMENT` detail blocks (rotation, defaults, behavior-if-absent).
- `backend/docs/api-error-codes.md` — the canonical source of "expected" error codes that map to `EXPECTED_EXCEPTIONS`.
- `backend/docs/runbook-security-headers.md` — sibling runbook for the related `SecurityHeadersConfig` operator surface.
- Spec 1.10d itself: `_specs/forums/spec-1-10d.md` — full acceptance criteria and rationale.
