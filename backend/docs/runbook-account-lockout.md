# Account Lockout Runbook

## Overview

Account lockouts fire after 5 failed login attempts within 15 minutes,
locking the account for 15 minutes. The lock auto-clears at the end of the
duration. Operator (Eric) can manually unlock earlier via psql.

This runbook covers the manual procedure. The admin UI for this operation
will ship with Spec 10.10b (Admin Foundation prerequisite). Until then,
manual psql is the only path.

## Manual Unlock Procedure

### 1. Identify the locked account

```sql
SELECT id, email, failed_login_count, failed_login_window_start, locked_until
FROM users
WHERE locked_until IS NOT NULL AND locked_until > NOW();
```

### 2. Clear the lock for a specific user

```sql
UPDATE users
SET failed_login_count = 0,
    failed_login_window_start = NULL,
    locked_until = NULL
WHERE id = '<user-id>';
```

### 3. Verify

Re-run the SELECT from step 1. The user should no longer appear.

## When To Manually Unlock

- User contacts support saying they're locked out and has verified their
  identity through a side channel (email reply, etc.).
- User is in a vulnerable state and the 15-minute wait is harmful UX.

## When NOT to Manually Unlock

- User just hits "I'm locked, please unlock" without identity verification.
- Multiple lockout events in rapid succession (could be active brute force —
  consult application logs first; the in-memory `LoginRateLimitFilter`
  layer should already be throttling at the IP level).

## Logging Each Manual Unlock

Per security best practice, document each manual unlock in the operator's
log (date, account, identity-verification method, requester contact info).
The audit-log table is admin-only; this runbook predates that surface.
When Spec 10.10 ships, this manual entry will route through the admin UI
and audit log automatically.

## Configuration Reference

Lockout thresholds live in `application.properties`:

```properties
auth.lockout.max-failures-per-window=5
auth.lockout.window-minutes=15
auth.lockout.duration-minutes=15
```

To temporarily relax thresholds for an incident, override via env vars
(`AUTH_LOCKOUT_MAX_FAILURES_PER_WINDOW`, etc.) and restart the service.
Permanent threshold changes go through a normal config-change spec.

## Related

- Spec 1.5 — `LoginRateLimitFilter` (in-memory per-email + per-IP rate limiter)
- Spec 1.5f — this lockout layer
- Spec 10.10b — future admin UI for unlock (deferred)
