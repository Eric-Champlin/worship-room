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

## 10. Activity dual-write gap: `wr:activity-recorded` event paths bypass Spec 2.7 (resolved)

**Status:** Resolved 2026-04-28.

**Fix shipped:** Extracted `postActivityToBackend` to `frontend/src/services/activity-backend.ts`; `useListenTracker.recordListenActivity` now invokes it gated by `isBackendActivityEnabled()`. Spec 2.10 backfill remains gated on useFaithPoints.recordActivity (intentional — fires once per session on any non-music activity).

**Captured:** During Spec 2.7 execution, 2026-04-26.

**The gap:** Spec 2.7 wires fire-and-forget `POST /api/v1/activity` into `useFaithPoints.recordActivity` only. External code paths that update faith-points localStorage directly without going through `useFaithPoints.recordActivity` continue to bypass the backend dual-write entirely.

**Identified emitter (verified by `grep wr:activity-recorded` on 2026-04-26):**

- `frontend/src/hooks/useListenTracker.ts:114` — fires `wr:activity-recorded` with `{ type: 'listen' }` after the music player's 30-second listen timer completes. Writes localStorage directly via `faith-points-storage` services. **Backend will be missing every `'listen'` activity until this is wired.**

**Identified listeners (refresh-only, no shadow write):**

- `frontend/src/hooks/useFaithPoints.ts:356` — refreshes React state via `setState(loadState())`.
- `frontend/src/hooks/useChallengeAutoDetect.ts:94` — forwards to challenge auto-completion.

**Why deferred:** Spec 2.7 declared this out of scope to keep the spec M-sized. Wiring requires (a) finding/touching `useListenTracker` and any future external emitter, (b) deciding whether the emitter or the listener does the dual-write (emitter wins because the listener has no access to the activity payload), (c) supplying a `sourceFeature` per emitter.

**Suggested fix shape:** Add a `postActivityToBackend` invocation directly in `useListenTracker` after the localStorage write, gated by the same `isBackendActivityEnabled()` flag, with `sourceFeature: 'music'`. Spec 2.10 (Historical Activity Backfill) will eventually backfill the missed `'listen'` rows from localStorage anyway, so the gap is tolerable until then.

**Priority:** MEDIUM. Skews the backend `activity_log` toward non-music activities until wired. Backfill closes the gap eventually.

---

## GrowthGarden test time-of-day flake

**Date discovered:** 2026-04-27
**Discovered during:** Spec 2.9 (Phase 2 cutover) execution at Step 6 verification
**Severity:** Low (test-only; production code is correct)
**Status:** Open

**Symptom:** 14 tests in `frontend/src/components/dashboard/__tests__/GrowthGarden.test.tsx` fail when the test suite runs during the "dawn" or "night" time-of-day windows. Fail count is 0 outside those windows.

**Cause:** `GrowthGarden.tsx:44-47`'s `getGardenAriaLabel` function appends `" at dawn"` or `" at night"` to the aria-label based on real-wall-clock time-of-day. The test assertions were written expecting the no-suffix branch only and were never taught to mock the time-of-day reading.

**Origin commit:** `5afccf0` (growth-garden-enhancement, 2026-04-01) added the time-of-day branch but did not update the corresponding tests.

**Why this matters now:** Spec 2.9 verification at Step 6 ran during the dawn window and surfaced the failures. The failures are unrelated to Spec 2.9's flag flip (Vite does not read `.env.example` at runtime; GrowthGarden has no reference to `VITE_USE_BACKEND_ACTIVITY`). Verified by code inspection.

**Fix sketch:** Mock the time-of-day reading in the test setup to a fixed value (e.g., always return `'day'`). Or refactor `getGardenAriaLabel` to take `timeOfDay` as a parameter so the test can pass it explicitly.

**Scope to fix:** A small standalone spec — modifies only `GrowthGarden.test.tsx` (and possibly `GrowthGarden.tsx` if the parameter-injection refactor is preferred). No production behavior change.

**Deferred until:** A future cleanup spec; not urgent.

---

## 11. Per-user rate limiting on friends write endpoints (medium priority)

**Status:** Deferred from Spec 2.5.3 per its Divergence 1.

**What's missing:** Spec 2.5.3 ships 8 friends endpoints with JWT auth as the only gate. The master plan's Forums Wave Rate Limits (`02-security.md`) specify:

- Friend requests: 10 per day per user
- Encouragements: 3 per friend per day (client-side primary, backend belt-and-suspenders)
- Nudges: 1 per friend per week (client-side primary, backend belt-and-suspenders)

These limits are not enforced by 2.5.3.

**Why deferred:** The current `RateLimitFilter` (Phase 1 Spec 1) is per-IP, scoped only to `/api/v1/proxy/**`. Building per-user rate limiting just for friends endpoints would either (a) duplicate filter infrastructure that Phase 10.9 (`round3-phase10-spec09-rate-limit-tightening`) will rebuild correctly across all Forums Wave endpoints, or (b) require a substantive RateLimitFilter refactor that warrants its own spec. JWT auth is the meaningful gate for the Phase 2.5 wave; abuse mitigation arrives with Phase 10.

**Revisit criterion:** Before Phase 10.9 ships, OR before backend friends becomes source-of-truth for reads (Phase 2.5 cutover is shadow-only — no public read path). Whichever comes first.

**Caught during:** Spec 2.5.3 planning, 2026-04-27.

**Priority:** MEDIUM. No abuse vector today (friends writes are dual-write shadow-only; localStorage is primary), but goes hot when Phase 7 reads friends from backend.

---

## 12. Spec 2.5.7 — Mute filter integration in Prayer Wall feed reads (medium priority)

**Status:** Deferred from Spec 2.5.7 per its Divergence 3 — data layer ships now, read-path integration ships in Phase 3.

**Owner:** Phase 3 — Spec 3.3 (Posts Read Endpoints, backend) + Spec 3.10 (Frontend Service API Implementations, frontend).

**What's missing:** Spec 2.5.7 ships the mute data layer (`user_mutes` table, `MuteService.isMuted(viewerId, posterId)`, `useMutes` hook, Settings UI). No consumer fires `isMuted` today. The spec's premise — "muted users' posts won't appear in your feed" — is not yet observable end-to-end.

**Verifies:**
- `MuteService.isMuted(viewerId, posterId)` is called from `FeedService` so muted users' posts are excluded from `GET /api/v1/feed` responses.
- On the frontend, `useMutes.muted` filters muted user IDs out of the rendered feed list.
- Muted users' presence excluded from active-now / suggestions surfaces.
- Muted users' reactions on the muter's OWN posts still appear (asymmetric semantic preserved — Spec 2.5.7 § "What Mute Means").

**Why deferred:** Spec 2.5.7 ships the data layer; Phase 3 owns the read paths.

**Caught during:** Spec 2.5.7 planning, 2026-04-27.

**Priority:** MEDIUM. Mute is dormant until Phase 3 wires the read filter.

---

## 13. Spec 2.5.7 — Backend rate limiting on mute endpoints (medium priority)

**Status:** Deferred from Spec 2.5.7 per Watch-For #8 and the Spec 2.5.3 Divergence 1 precedent.

**Owner:** Phase 10.9 (`round3-phase10-spec09-rate-limit-tightening`).

**What's missing:** Spec 2.5.7 ships 3 mute endpoints (`POST /api/v1/mutes`, `DELETE /api/v1/mutes/{userId}`, `GET /api/v1/mutes`) with JWT auth as the only gate. No per-user rate limiting.

**Verifies:**
- POST/DELETE/GET on mute endpoints return 429 RATE_LIMITED with `Retry-After` after exceeding the configured per-user limit.
- Standard `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` headers present on every response.
- Suggested limits to consider when Phase 10.9 lands: 30 mutes/hour, 30 unmutes/hour (mirrors the friends-action category in `02-security.md` § Forums Wave Rate Limits).

**Why deferred:** Same precedent as item #11 (friends rate limiting) — per-user rate limiting is centralized in Phase 10.9, not retrofitted per-spec. The current `RateLimitFilter` is per-IP and scoped to `/api/v1/proxy/**` only.

**Caught during:** Spec 2.5.7 planning, 2026-04-27.

**Priority:** MEDIUM. Mute is dual-write shadow-only with default-off env flag — no abuse vector today.

---

## 14. Replace kebab-case username derivation with users.username lookup (low priority)

**Status:** Wave-interim shim shipped in Spec 3.3 (`UserResolverService.resolveByKebabCase`).

**Owner:** Phase 8.1 (`round3-phase08-spec01-username-system`).

**What's deferred:** `UserResolverService.resolveByKebabCase()` derives a viewer-visible identifier from `first_name + '-' + last_name` (lowercased) so `GET /api/v1/users/{username}/posts` can resolve a path param to a UUID. When Phase 8.1 ships the `users.username` column + uniqueness invariants, swap the derivation for a single-column lookup and remove the kebab-case fallback. Caught during Spec 3.3 planning, 2026-04-28.

**Priority:** LOW. Kebab-case derivation works for current mock seed (single-word first/last names). Becomes incorrect when users with multi-word names (e.g., "Mary Anne Smith") arrive — Phase 8.1 lands well before that.

---

## 15. LLM-classifier-based crisis detection on post creation (deferred)

**Status:** Deferred per Spec 3.5 Divergence 1, 2026-04-28.

**Owner:** Future spec, likely Phase 4 once production keyword-detector signal is collected.

**Approach:** Per `01-ai-safety.md`: route through `/api/v1/proxy/ai/*` Gemini, parse JSON `{ isCrisis, confidence, category }`, fail-closed on parse failure (UI shows resources), do NOT auto-flag on parse failure (no admin alert). Composes with Spec 3.5's `PostCrisisDetector` keyword path; both run, OR semantics. Consume signal from `posts.crisis_flag` accumulation to tune classifier threshold.

**Why deferred:** Spec 3.5 ships keyword-only to match existing detector pattern (deterministic, no upstream timeout failure modes), and to collect production false-positive/false-negative signal before tuning a classifier.

**Priority:** MEDIUM. Crisis detection is safety-critical; the keyword path is sufficient for MVP, but the classifier improves recall on phrasings like "I just want it all to stop."

---

## 16. SMTP email alert on crisis-flagged posts (deferred)

**Status:** Deferred per Spec 3.5 Divergence 2, 2026-04-28.

**Owner:** Phase 15.x (likely Phase 15.1b Welcome Email Sequence or 15.x SMTP cutover).

**Approach:** When SMTP unblocks, add `EmailService.sendCrisisAlert(postId, userId)` call to `CrisisAlertService.alert(...)`. The Sentry alert continues alongside (defense-in-depth: if SMTP queues fail or admin email filters bury the message, Sentry is the second channel).

**Why deferred:** SMTP infrastructure not shipped (Phase 1.5b–g specs are SMTP-blocked). Spec 3.5 uses Sentry + `posts.crisis_flag=true` as the alert mechanism for now.

**Priority:** HIGH (when SMTP unblocks). Email alerts are the established admin notification channel for safety-critical events; Sentry is a defensible interim but not the long-term answer.

---

## 17. `@RequireVerifiedEmail` gate on post writes (deferred)

**Status:** Deferred per Spec 3.5 recon, 2026-04-28.

**Owner:** Phase 1.5d (Email Verification spec) when SMTP unblocks.

**Approach:** Once Spec 1.5d ships and `@RequireVerifiedEmail` annotation exists in the codebase, apply it to `POST /api/v1/posts`, `PATCH /api/v1/posts/{id}`, and (if appropriate) write endpoints in subsequent specs. Per `02-security.md`, writes require verified email; reads have a 7-day grace.

**Why deferred:** Phase 1.5d is in the SMTP-blocked cluster. Spec 3.5 dropped the gate to avoid blocking on the SMTP cluster; without 1.5d, `is_email_verified=false` for all users would block all post creation.

**Priority:** MEDIUM. Email-verification gating prevents anonymous-disposable-account abuse but is a hardening pass, not an MVP blocker.

---

## 18. Strict unknown-field rejection on post DTOs (deferred)

**Status:** Deferred per Spec 3.5 Deviation #1, 2026-04-28.

**Owner:** Future spec when stricter input validation matters operationally.

**What's missing:** Spec 3.5 added `@JsonIgnoreProperties(ignoreUnknown = false)` to `CreatePostRequest` and `UpdatePostRequest` records expecting Jackson to throw `HttpMessageNotReadableException` on unknown fields like `id` or `crisisFlag`. In Spring Boot 3.5.11 / Jackson 2.x, the global setting `spring.jackson.deserialization.fail-on-unknown-properties=false` overrides the record-level annotation, so unknown fields are silently dropped instead of rejected.

**Why this is currently safe:** The typed record fields are the only ones the service-layer code ever uses — silently-dropped unknown values cannot influence post state. `crisisFlag` is server-managed regardless of what the client sends; `id` is generated server-side via `UUID.randomUUID()`. The dropped values do not produce a path to security or correctness issues today.

**Approach:** Add a Spring `Jackson2ObjectMapperBuilderCustomizer` that enables `FAIL_ON_UNKNOWN_PROPERTIES` for these specific record types via a `BeanDeserializerModifier` + `MixIn`, OR convert the records to classes with explicit `@JsonCreator` constructors that validate field presence.

**Why deferred:** The plan-validated invariants of the spec (`crisisFlag` server-managed, `id` server-generated) are upheld today; strict rejection is a defense-in-depth hardening rather than a correctness bug. The fix is a 50-100 line Spring config change, but it requires a test harness to verify it doesn't break other endpoints that accept unknown fields.

**Priority:** LOW. The values are dropped, not used; no exploit path today. Re-prioritize if a future feature flips a server-managed field to client-controlled and we need strict gating.

---

## 19. Rename `PostsRateLimitConfig` to `PostsConfig` (deferred)

**Status:** Deferred per Spec 3.5 code review, 2026-04-28.

**Owner:** Future maintenance pass; or any spec that adds a third-or-fourth concern under `worshiproom.posts.*`.

**What's misleading:** The class `PostsRateLimitConfig` (in `backend/src/main/java/com/worshiproom/post/PostsRateLimitConfig.java`) carries three distinct concerns — rate limiting (`rateLimit.maxPerDay`, `rateLimit.bucketCacheSize`), the PATCH edit window (`editWindowMinutes`), and idempotency cache sizing (`idempotency.cacheSize`). The "RateLimit" name hides the other two settings; a future reader looking for `worshiproom.posts.edit-window-minutes` will not find it under this class name.

**Why deferred:** The class works correctly today; the binding via `@ConfigurationProperties(prefix = "worshiproom.posts")` is correct. This is a naming / discoverability nit, not a bug. Renaming touches the field declarations in `PostService`, `PostsRateLimitService`, `PostsIdempotencyService`, and three unit-test classes.

**Approach when picked up:** Rename to `PostsConfig`, add a class-level Javadoc enumerating the three sub-sections, OR split into three classes (`PostsRateLimitConfig`, `PostsEditWindowConfig`, `PostsIdempotencyConfig`) each with its own narrow prefix. The split is cleaner but adds two beans; the rename is one find-and-replace.

**Priority:** LOW. Internal naming with no external surface impact. Pick up opportunistically when the file is next touched.

---
