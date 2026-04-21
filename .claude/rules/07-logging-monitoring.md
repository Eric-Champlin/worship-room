## Logging & Monitoring

### Structured Logging (Spring Boot)
- **Format:** JSON logs via Logback for machine parsing
- **Levels:** INFO (normal operations), WARN (degraded but recoverable), ERROR (failures requiring attention)
- **Every log entry includes:** timestamp, log level, logger name, request ID (from `X-Request-Id` header), user ID (if authenticated)
- **Action logging:** Log key user actions (post_created, comment_added, friend_request_sent, report_filed) at INFO level with action name + metadata
- **Error logging:** Log full exception + stack trace + request ID at ERROR level for server-side debugging

### PII Handling (CRITICAL)
- **Never log in application logs:** user input text (posts, comments, journal content, prayer text, verse text bodies sent to the AI proxy), email addresses, passwords or tokens, or LLM response bodies (AI-generated explanations, reflections, prompts, insights).
- **Safe to log:** user UUIDs, timestamps, action names, content IDs, mood values (numeric), Bible references like "John 3:16" (citations, not content), error codes, HTTP status codes, request body lengths (as counts, not contents).
- **AI proxy logging discipline:** Controllers log the reference (e.g., `"John 3:16"`) and `verseTextLength` (a number). They NEVER log `verseText`, the generated `content`, or any part of the LLM response body. `GeminiController` (Spec 2) is the canonical example: `log.info("Explain request received reference={} verseTextLength={}", reference, verseText.length())`.
- **IP addresses:** Used transiently for rate limiting. NOT persisted in the database. The narrow exception is rate-limit-diagnostic INFO logs (`log.info("Rate limit hit for ip={} ...")` in `RateLimitFilter`) — these go to stdout for operational visibility and are acceptable because (a) the IP is already the rate-limit bucket key, (b) stdout logs are ephemeral, and (c) they are essential for diagnosing a 429 in production. The IP MUST still be stripped from any structured log fields that flow to Sentry, log aggregators, or long-term storage — the Sentry PII scrubber handles this (see below).
- **Admin audit log:** Stored in `admin_audit_log` table using admin_user_id (UUID only, no email).

### Framework Log Suppression (MANDATORY for proxy endpoints)

The PII rules above govern what **our own code** logs. Spring's built-in request-processing loggers at DEBUG level emit their own messages that include deserialized request bodies via each record's default `toString()`, which defeats controller-level discipline. For proxy endpoints whose DTOs contain user-submitted content (verse text, journal entries, place queries, Bible ids with query params, etc.), this is a back-door PII leak even when the controller only logs `reference` + `verseTextLength`.

**Prod profile is already safe** — `logging.level.org.springframework.web=WARN` suppresses DEBUG body-processor chatter entirely. **Dev profile must suppress it explicitly**, because dev sets `logging.level.org.springframework.web=DEBUG` for useful framework diagnostics (mapping lookups, handler discovery) which collaterally re-enables body logging.

**Required addition to `backend/src/main/resources/application-dev.properties`:**

```properties
# Suppress Spring's body-processor DEBUG output so request-body records' toString()
# representations (which contain user content like verseText) don't leak into application logs.
# Required by 07-logging-monitoring.md § Framework Log Suppression — the PII rule is absolute,
# not prod-only. Keeping other org.springframework.web DEBUG output useful.
logging.level.org.springframework.web.servlet.mvc.method.annotation=INFO
```

**Why the narrow package** (`...mvc.method.annotation`) **rather than the broader** `...mvc` **or** `...web`: the body-processor (`RequestResponseBodyMethodProcessor`) lives in this specific subpackage. Suppressing only this package keeps mapping / handler / view-resolution DEBUG intact, which is useful during local dev.

**Rule for new proxy DTOs:** Any time a new proxy spec adds a DTO record containing user-submitted content, this dev-profile suppression applies automatically (the config line above catches all `@RequestBody` deserialization for all proxy endpoints). No per-endpoint action needed. What IS required: do not override `logging.level.org.springframework.web.servlet.mvc.method.annotation` back to DEBUG in any profile-specific or local-override properties file — that re-opens the leak.

**Verification during Step 24 (end-to-end smoke for any proxy spec):** After a happy-path request, grep `docker compose logs backend` for the user-content fields of your DTO. If any match, the suppression isn't working. Also verify the controller-level INFO log (with the safe-to-log fields like `reference` and `verseTextLength`) still appears.

### Error Tracking — Sentry (Spec 1.10d)
- **Platform:** Sentry (not Rollbar — decision made in Spec 1.10d)
- **PII scrubber:** Mandatory Sentry `beforeSend` hook that strips: email addresses, user names, IP addresses (including any that might appear in log-message strings captured from rate-limit diagnostics), request body content, verse text sent to the AI proxy, LLM response bodies, and journal/prayer text from error payloads.
- **Track:** 500 errors, unhandled exceptions, AI API failures, database errors, auth failures, rate limit violations
- **DSN:** Via `SENTRY_DSN` env var (empty = disabled, for local dev)
- **Environment tagging:** `SENTRY_ENVIRONMENT=development|staging|production`

### Uptime Monitoring (Spec 1.10d)
- **Platform:** UptimeRobot (or Better Stack)
- **Monitored endpoint:** `GET /api/v1/health` — returns 200 when app is healthy
- **Health check includes:** database connectivity, Redis connectivity (if configured), disk space
- **Alert channel:** Email to `ADMIN_EMAIL` on downtime
- **Check interval:** Every 5 minutes

### Audit Logging
- **Admin/moderator actions:** ALL logged to `admin_audit_log` table
- **Fields:** admin_user_id, action (e.g., "deleted_post", "banned_user", "resolved_report"), target_type, target_id, details (JSONB), mandatory moderator_note (50+ chars for Spec 10.7b actions), created_at
- **Retention:** Indefinite (audit logs are never purged — they contain no user content, only action records)
- **Access:** Admin-only endpoint for viewing audit history

### Performance Monitoring (deferred)
- **APM dashboards** (Datadog, etc.): Deferred to future wave per Appendix D
- **Distributed tracing** (OpenTelemetry): Deferred to future wave
- **Log aggregation** (Loki, etc.): Deferred — stdout capture is MVP
- **Current MVP approach:** Sentry for errors + UptimeRobot for uptime + Spring Boot Actuator for basic metrics

### Request ID Propagation (MANDATORY)

Every request receives a 22-character base64 request ID via `RequestIdFilter` (Spec 1):
- Set as response header `X-Request-Id`
- Placed in SLF4J MDC under key `requestId` so every log line emitted during the request lifecycle includes it (plain text: `[%X{requestId:-no-req}]` prefix; JSON: dedicated `requestId` field via `logstash-logback-encoder`)
- Cleared in a `finally` block after the filter chain completes so MDC doesn't leak across requests in the thread pool
- If the client sends their own `X-Request-Id` header (≤64 chars), the server honors it for end-to-end tracing; otherwise it generates a fresh ID

All error responses include the same `requestId` value inside the `ProxyError` body, so a user reporting a failure can quote the ID and the operator can `grep` backend logs for that string to retrieve the full server-side context. This is the primary debugging workflow — do not break it by introducing log statements that omit the MDC prefix or code paths that skip `RequestIdFilter`.

### Spring Boot Actuator
- **Enabled endpoints:** `/actuator/health`, `/actuator/info`, `/actuator/metrics`
- **Secured:** Actuator endpoints require admin auth in production (public in dev)
- **Health indicators:** Database, Redis, disk space
