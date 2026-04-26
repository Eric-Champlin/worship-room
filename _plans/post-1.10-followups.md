# Post-1.10 Follow-Ups

Issues, hygiene, and small refactors discovered during or after the Spec 1.10 cutover. None of these blocked production launch; all are tracked here for a future cleanup batch.

---

## 1. Logout → MoodCheckIn flash (low priority)

**Repro:** Log in, complete onboarding + mood check-in, then click logout.

**Observed:** "How are you feeling today, Eric?" flashed briefly before the logged-out landing page rendered. Did not reproduce on a second attempt.

**Suspected cause:** Dashboard renders one frame while AuthContext is mid-transition. `phase === 'check_in'` evaluates from stale localStorage before the auth state flip propagates and the route redirects to landing.

**Likely fix surface:** `frontend/src/pages/Dashboard.tsx` — gate phase computation behind `isAuthenticated && !isAuthResolving`. OR `AuthContext.logout` clears user-keyed localStorage before flipping state.

**Caught during:** Spec 1.10 cutover, manual § 6 smoke testing, 2026-04-24.

**Priority:** LOW. Visual flash only, no security or data implications.

---

## 2. Test 5 prod regression — bogus JWT not cleared from localStorage on 401 (low priority)

**Status:** Caught by § 7 Playwright prod smoke during Spec 1.10 cutover, 2026-04-24.

**Repro:** Run `PLAYWRIGHT_BASE_URL=https://worship-room-frontend-production.up.railway.app pnpm test:e2e phase01-auth-roundtrip -g "5\."` against the deployed stack.

**Observed:** Test 5 fails on `expect(token).toBeNull()` — the UI correctly restores to unauthenticated state (Get Started visible), but `wr_jwt_token` retains the corrupted value in localStorage. Same scenario passes in local dev.

**Most likely cause:** Filter-raised 401 from JwtAuthenticationFilter on `/users/me` not being CORS-allowed for the Railway frontend origin in prod. AuthContext.catch sets isAuthenticated=false (UI restores), but apiFetch's 401-specific clearStoredToken handler never fires because browser blocked the response.

**Diagnostic next step (don't fix without verifying):**
1. Verify backend's `PROXY_CORS_ALLOWED_ORIGINS` env var includes `https://worship-room-frontend-production.up.railway.app` exactly.
2. Verify backend redeploy after CorsFilter code landed actually picked up the new code.
3. Manual reproduction in browser DevTools: corrupt `wr_jwt_token`, reload, watch Network tab. Should be 401; if shows ERR_FAILED then CORS is the issue.

**Security impact:** None. Bogus token can't authenticate; server rejects on every request.

**Priority:** LOW (UX correctness, not security or core functionality).

---

## 3. Login rate-limit smoke false alarm (resolved, captured for lesson)

**Status:** Resolved 2026-04-24. Not a real bug — captured here for the lesson.

**What looked wrong:** During § 6 manual smoke, clicking the Log In button 6 times with a wrong password produced no visible UI change. Initial diagnosis suspected the rate limit wasn't firing in production.

**What was actually wrong:** The test passwords used were too short (1-character placeholders). The frontend's client-side validation rejected the submit before any HTTP request was sent.

**Resolution:** Re-tested with `wrongpassword123` (8+ chars) — backend correctly returned 401 INVALID_CREDENTIALS for attempts 1–5 and 429 RATE_LIMITED with "Too many attempts" copy on attempt 6.

**Lesson:** When smoke-testing rate limits, use passwords that pass client-side validation but are wrong.

---

## 4. Prayer Wall primary-color contrast — design-system gap (medium priority)

**Captured:** `_cutover-evidence/phase1-a11y-smoke.json` shows 1 violation on `/prayer-wall` logged-out:
- `.border-primary` (`#6D28D9`, contrast 2.73 vs 4.5 minimum)
- `.border-primary/40` (`#8B5CF6`, contrast 3.72 vs 4.5 minimum)

Both fail WCAG 2.1 AA. Exact match to existing `test.fixme` at `frontend/e2e/phase01-auth-roundtrip.spec.ts:313`.

**Scope:** Likely affects all uses of `primary` and `primary-lt` as text/border colors on dark backgrounds, not just Prayer Wall. Needs a design-system token audit.

**Priority:** MEDIUM — accessibility violation is real, but no critical-path UX is blocked.

---

## 5. Manual a11y verification deferred from cutover (medium priority)

**Deferred from:** Spec 1.10 § 6.1 (Universal Rule 17 mandatory accessibility smoke).

**What was deferred:**
- Keyboard-only walkthrough with focus-ring + skip-link verification
- VoiceOver (macOS) spot-check

**Why deferred:** Solo-dev pre-launch context (zero real users at risk).

**Resolution path:** Could be folded into the design-system audit spec (item #4) since fixes are likely related.

**Priority:** MEDIUM — Universal Rule 17 nominally requires this evidence at every cutover. Defer is acceptable for solo pre-launch, becomes blocking before public beta.

---

## 6. 48-hour post-deploy monitoring deferred from cutover (low priority)

**Deferred from:** Spec 1.10 § 9 (formal 4-touchpoint monitoring schedule).

**Resolution path:** Informal observation as part of normal app usage replaces the formal schedule for solo-dev pre-launch. When Spec 1.10d (Sentry + UptimeRobot) ships, automated monitoring replaces this manual schedule going forward.

**Priority:** LOW.

---

## 7. Rule file maintenance — oversized files (low priority)

**Discovered during:** Spec 1.10c kickoff, 2026-04-24. CC flagged `.claude/rules/11-local-storage-keys.md` as exceeding the 40 KB performance threshold; surgical trim brought it to 39.16 KB.

**Other oversized files in the same directory:**
- `.claude/rules/09-design-system.md` — **83.21 KB** (2× over)
- `.claude/rules/10-ux-flows.md` — **55.87 KB** (1.4× over)

**Cause:** Both have grown organically across many specs without ever being split. Surgical prose trimming alone won't bring them under 40 KB — they need actual restructuring (split into multiple rule files by topic).

**Likely splits worth considering:**
- `09-design-system.md` → keep design tokens + core component patterns; extract typography/spacing/animation details to a sibling file
- `10-ux-flows.md` → keep the cross-cutting UX rules; extract feature-specific flow docs (Prayer Wall, Daily, Bible reader) to feature-scoped files

**Priority:** LOW. CC currently shows perf warnings but nothing breaks. Worth tackling as its own small "rules-hygiene" maintenance spec when there's a fresh-eyes window.

**Caught during:** Spec 1.10c Phase 1 kickoff, 2026-04-24.

## 9. RateLimitIntegrationTest requires local Postgres on :5432 (low priority)

**Discovered:** Spec 1.10g execution, 2026-04-25.

**Behavior:** RateLimitIntegrationTest uses @SpringBootTest @ActiveProfiles("dev") and connects to a dev-profile Postgres at localhost:5432. If docker-compose isn't running, the test produces 30 cascading failures across the full suite — masking real test results.

**Workaround:** `docker-compose up -d postgres` before running `./mvnw test`.

**Real fix (future):** convert to Testcontainers using AbstractIntegrationTest, like the other integration tests. Not urgent — the dev-Postgres dependency is documented now and the workaround is one command.

**Priority:** LOW.

---

## spec-1-9-auth-flow tablet/desktop click intercept

**Discovered:** 2026-04-25 during spec 1.10l verification.
**Symptom:** `login view`, `login form-error` tests fail at tablet+desktop with 30s click timeout. Backdrop intercepts pointer events. Mobile passes consistently. Non-deterministic on `register` variants.
**Root cause:** `openAuthModalFromLanding` locator `getByRole('button', { name: 'Log in' })` matches navbar's "Log In" button (visible at tablet+) before modal toggle.
**Pre-existing:** Yes — confirmed via byte-level diff against pre-refactor code; locator unchanged. Spec 1.10l's plan "9/9 baseline" was an unverified planning-time assumption.
**Fix sketch:** Scope locator inside the modal: `page.getByRole('dialog').getByRole('button', { name: 'Log in' })` or use a `data-testid` on the toggle.
**Out of scope for:** spec-1-10l (refactor-only). Owner: TBD.

---

## SMTP setup deferred pending domain purchase

**Date:** April 25, 2026
**Status:** Deferred
**Reason:** worshiproom.com is a premium domain currently listed at ~$1,500. Eric is not planning to purchase until closer to public launch.
**Blocks:** Specs 1.5b–g (password reset, email verification, change-password notification, welcome emails, account lockout notification, additional auth-flow emails).
**Decision criteria for revisit:**
- Domain purchased (worshiproom.com OR alternative TLD/name)
- Worship Room within ~30 days of public launch
- Real users about to register, making email flows user-facing-required

**Vendor preference (when revisited):** Resend (3000/mo free tier, modern API, US-East region)
**Pre-decided env vars (when revisited):** RESEND_API_KEY, SMTP_FROM_EMAIL=noreply@<domain>, SMTP_FROM_NAME=Worship Room
**Smoke test:** TBD when domain available

---
