## Logging & Monitoring

### Structured Logging (Spring Boot)
- **Format:** JSON logs via Logback for machine parsing
- **Levels:** INFO (normal operations), WARN (degraded but recoverable), ERROR (failures requiring attention)
- **Every log entry includes:** timestamp, log level, logger name, request ID (from `X-Request-Id` header), user ID (if authenticated)
- **Action logging:** Log key user actions (post_created, comment_added, friend_request_sent, report_filed) at INFO level with action name + metadata
- **Error logging:** Log full exception + stack trace + request ID at ERROR level for server-side debugging

### PII Handling (CRITICAL)
- **Never log in application logs:** user input text (posts, comments, journal content, prayer text), email addresses, raw IP addresses, passwords or tokens
- **Safe to log:** user UUIDs, timestamps, action names, content IDs, mood values (numeric), scripture references, error codes, HTTP status codes
- **IP addresses:** Used transiently for rate limiting only (hashed, stored in Redis with 15-min TTL), never in app logs or database
- **Admin audit log:** Stored in `admin_audit_log` table using admin_user_id (UUID only, no email)

### Error Tracking — Sentry (Spec 1.10d)
- **Platform:** Sentry (not Rollbar — decision made in Spec 1.10d)
- **PII scrubber:** Mandatory Sentry `beforeSend` hook that strips: email addresses, user names, IP addresses, request body content, journal/prayer text from error payloads
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

### Spring Boot Actuator
- **Enabled endpoints:** `/actuator/health`, `/actuator/info`, `/actuator/metrics`
- **Secured:** Actuator endpoints require admin auth in production (public in dev)
- **Health indicators:** Database, Redis, disk space
