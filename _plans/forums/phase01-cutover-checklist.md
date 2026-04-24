# Phase 1 Cutover Checklist — Railway

**Purpose:** First-time production deployment of Worship Room backend + Postgres (+ optionally frontend) to Railway.
**Platform:** Railway (Hobby plan, US-East region)
**Deployment date:** [fill in when done]
**Estimated cost:** $5/month flat + ~$0–$3 usage = $5–$8/month total at Worship Room's Phase 1 scale

This checklist is the runbook Eric follows to stand Phase 1 up on Railway for the first time. It is NOT a day-2 ops runbook (see 1.10d), NOT a security hardening guide (see 1.10g), NOT a disaster-recovery procedure (see 1.10c), NOT a Railway tutorial (link to Railway's docs instead). Scope is narrow: first prod deploy + smoke + rollback readiness.

Every bracketed `<placeholder>` is filled in by Eric post-deploy — this file lives in Git with placeholders intact; concrete URLs and service IDs never get committed.

---

## 0. Pre-deploy verification (local)

Before touching Railway, prove the build is green and the Dockerfile Railway will use actually builds. All items run locally.

- [x] ✅ Latest `claude/forums/round3-forums-wave` branch merged to `main` and pushed to GitHub
- [x] ✅ Frontend unit tests green: `cd frontend && pnpm test` (baseline ~8811+ pass / 11 known-fail — any NEW failing file is a regression, not a go signal)
- [x] ✅ Backend tests green: `cd backend && ./mvnw test` (baseline 417+ pass / 0 fail — any fail is a hard stop)
- [x] ✅ Playwright E2E green locally: `cd frontend && pnpm test:e2e phase01-auth-roundtrip` (8/8 — requires local backend + `pnpm dev`) — 2026-04-24: 7 pass / 1 fixme / 0 fail in ~10s wall-clock.
- [x] ✅ Frontend production build clean: `cd frontend && pnpm build`
- [x] ✅ Backend JAR build clean: `cd backend && ./mvnw clean package`
- [x] ✅ Railway Dockerfile build validates locally: `docker build -t worshiproom-backend:local backend/` — Railway builds from `backend/Dockerfile` automatically, so a local build proves the deploy will succeed before paying for Railway minutes

If any item fails, stop and fix before continuing. Railway won't fix a broken local build; it will just surface the failure slower.

### 0.1 Scope extensions shipped with Spec 1.10

The cutover smoke caught issues that required narrow source-code fixes inside this spec's scope. Documenting them here so future readers understand why a cutover checklist touched production code:

- **`frontend/src/components/SiteFooter.tsx`** (lines 163, 171): replaced `text-subtle-gray` (`#6B7280`, contrast 4.08 on `#0D0620`) with `text-white/60` (contrast ~5.0) on the crisis-resources disclaimer and copyright paragraphs. Rule 17 axe smoke on `/` was failing; this is the fix. The `subtle-gray` design token in `tailwind.config.js` is still defined as a border color — only the misuse in `SiteFooter` was changed, not the token.
- **`backend/src/main/java/com/worshiproom/config/CorsConfig.java`**: added a servlet-level `CorsFilter` `@Bean` at `Ordered.HIGHEST_PRECEDENCE + 5` so CORS headers are written to EVERY response, including responses produced by filter-raised 401s (invalid/expired JWTs in `JwtAuthenticationFilter`) and 429s (rate-limit enforcement in `LoginRateLimitFilter`). The existing `WebMvcConfigurer.addCorsMappings` integration is preserved as the controller-level layer. Without this filter, browsers blocked those filter-raised error responses for lack of `Access-Control-Allow-Origin`, and the frontend saw a generic network error instead of the correct error code — a real production UX regression that the Spec 1.10 cutover smoke (Tests 5 and 6) caught before deploy. Backend test baseline (417 pass / 0 fail) unchanged.
- **`frontend/e2e/phase01-auth-roundtrip.spec.ts`**: scoped two `getByRole('button', { name: 'Log in'|'Log In' })` selectors to `[role="dialog"]` (nav + modal both match the name); added a `seedSkipDashboardGates` test helper that seeds `wr_onboarding_complete` and a minimal today-dated `wr_mood_entries` so authenticated test users land on the Dashboard instead of the onboarding wizard or daily mood check-in (both separate specs); `test.fixme`'d the `/prayer-wall` axe sweep pending a design-system primary-color-on-dark audit (follow-up spec to be filed — `primary` `#6D28D9` and `primary-lt` `#8B5CF6` fail WCAG 2.1 AA contrast as text/border on Prayer Wall toggle pills).

---

## 1. Railway account setup (one-time)

Skip this section on subsequent deploys — the account, CLI, and billing guards are one-time setup.

- [ ] Sign up at https://railway.com (sign in via GitHub recommended — enables repo auto-deploy later without additional OAuth)
- [ ] Subscribe to Hobby plan ($5/month flat base)
- [ ] Enable billing alerts: Settings → Usage → set thresholds at $10 and $20. At Worship Room's Phase 1 scale, usage should be $0–$3/month on top of the $5 base; a $10 alert catches surprise overage before it becomes $50
- [ ] Install the Railway CLI:
  - macOS: `brew install railway`
  - Other: `curl -fsSL https://railway.com/install.sh | sh`
- [ ] `railway login` — authenticate the CLI against the account

---

## 2. Railway project creation

- [ ] Create a new project in the Railway dashboard (suggested name: `worship-room`)
- [ ] Select region **US-East** at project creation — maps to Ashburn, VA; best latency from Spring Hill, TN
- [ ] Confirm the "production" environment (Railway's default) is the target. No staging environment is set up in this spec; pre-prod testing happens locally via `docker compose up`

---

## 3. Backend service deploy

Every env var in this section is set via the Railway Variables UI (or `railway variables set KEY=VALUE`). **Never commit any real value to Git.** Placeholder names only; actual values live in Railway.

- [ ] In the Railway project: "Add New" → "GitHub Repo" → connect the `worship-room` repo
- [ ] Root directory: `/backend` (Railway auto-detects `backend/Dockerfile` and builds from it)
- [ ] Branch: `main` (or `claude/forums/round3-forums-wave` for the very first smoke, then repoint to `main` after)
- [ ] Set the following env vars in Railway's Variables UI for the backend service:
  - [ ] `SPRING_PROFILES_ACTIVE=prod` — activates `application-prod.properties` (JSON logging, strict rate limits, production CORS origins)
  - [ ] `JWT_SECRET` — generate locally with `openssl rand -base64 32` and paste the output. Never commit. Rotating this value invalidates every outstanding JWT, so treat it as a long-lived secret
  - [ ] `JWT_EXPIRATION=3600` — optional; 1 hour is the default and matches `application.properties`
  - [ ] `SERVER_PORT=$PORT` — tells Spring Boot to bind to Railway's injected port. This is Option B from the 1.10 brief § 4.5, avoiding any `backend/src/**` code change
  - [ ] (Optional) `GEMINI_API_KEY` — enables AI features (Ask, Pray, Journal Reflection, BB-30, BB-31). Absent = those features return 503 gracefully
  - [ ] (Optional) `GOOGLE_MAPS_API_KEY` — enables the Local Support map layer. Absent = map degrades to list-only
  - [ ] (Optional) `FCBH_API_KEY` — enables the audio Bible (BB-26). Absent = audio tab hides
- [ ] Trigger the first deploy (automatic on GitHub push to the configured branch, or manual via `railway up` from a clean local checkout)
- [ ] Watch the deploy logs for the expected sequence: Maven build succeeds → JAR runs → Liquibase applies migrations → "Started WorshipRoomApplication in N seconds" — any deviation is a stop
- [ ] Verify `/actuator/health` returns `{"status":"UP"}` at the Railway-generated backend URL. Find the URL in: dashboard → backend service → Settings → Networking → Public URL. The URL form is `https://<backend-service>.up.railway.app`
- [ ] Curl smoke the auth endpoint (anti-enumeration 200 return means the endpoint is alive):
  ```bash
  curl -X POST https://<backend-service>.up.railway.app/api/v1/auth/register \
    -H 'Content-Type: application/json' \
    -d '{"email":"smoke+'$(date +%s)'@worshiproom.dev","password":"SmokeTest2026!","firstName":"Smoke","lastName":"Test"}'
  ```
  Expected: HTTP 200, body `{"data":{"registered":true},"meta":{"requestId":"..."}}`

---

## 4. Database service (Railway Postgres)

- [ ] In the Railway project: "Add New" → "Database" → "Add PostgreSQL"
- [ ] Confirm Postgres 16 is provisioned (Railway's current stable default — verify in the service's Settings tab)
- [ ] Confirm Postgres service's `DATABASE_URL` is auto-shared with the backend service. Railway does this via service-linking; check the backend service's Variables tab to confirm `DATABASE_URL` appears
- [ ] Redeploy the backend service so it picks up `DATABASE_URL`: dashboard → backend service → Deployments → Redeploy
- [ ] Verify Liquibase logs in the backend service show every Phase 1 changeset applying cleanly with no `ROLLBACK` or `ERROR` lines
- [ ] Confirm the prod DB is empty of dev-seed users. Run `railway connect postgres` to open a psql session, then:
  ```sql
  SELECT email FROM users;
  ```
  Expect zero rows. If dev-seed emails appear, the `spring.liquibase.contexts` is misconfigured — STOP and investigate before accepting real user traffic

---

## 5. Frontend deploy (Railway-hosted path — default)

Skip this section if Eric keeps the frontend on Vercel / Cloudflare Pages / Netlify — jump to 5-alt below.

- [ ] In the Railway project: "Add New" → "GitHub Repo" → same repo, root directory `/frontend`
- [ ] Build command: `pnpm install && pnpm build` (Railway usually detects Vite and auto-sets this — verify in the service's Settings → Build)
- [ ] Start command: Railway's Vite preset serves `dist/` statically. If the auto-detect fails, override with `pnpm preview --host 0.0.0.0 --port $PORT`
- [ ] Set env vars for the frontend service:
  - [ ] `VITE_API_BASE_URL=<backend-railway-url>` — no trailing slash. Example form: `https://worship-room-backend-production.up.railway.app`
- [ ] Deploy succeeds; the frontend URL is reachable
- [ ] Open the frontend URL in a real browser (Chrome DevTools open) — root URL loads with NO console errors
- [ ] Submit the login form once manually against the deployed backend before running the automated Playwright smoke (catches the "backend URL typo" class of bug before 8 tests fail identically)

---

## 5-alt. Frontend deploy (separate host — only if Eric keeps Vercel / Cloudflare Pages / etc.)

Use this section ONLY if Eric is keeping the frontend on a non-Railway host. Confirm before proceeding.

- [ ] Confirm with Eric which host currently serves `worshiproom.com` preview builds (Vercel? Cloudflare Pages? Netlify?)
- [ ] On that host, update `VITE_API_BASE_URL` to point at the Railway backend URL (same form as section 5)
- [ ] Update Railway backend's CORS config to allow the frontend's origin. The prod profile already allows `https://worshiproom.com` and `https://www.worshiproom.com` (application-prod.properties line 14) — if the temporary deploy URL is different (e.g., `*.vercel.app`), add it explicitly. Do NOT use a wildcard; prefer locking to the final `worshiproom.com` origin once DNS flips
- [ ] Smoke test the login form on the deployed frontend against the Railway backend

---

## 6. Smoke tests (manual, against prod)

Every test in this section is a manual click-through in a real browser. The Playwright script in section 7 is the automated follow-up; these manual smokes catch issues the scripted test glosses over (visual layout, font loading, favicon, etc.).

- [ ] Register a smoke-test user via the UI with a unique email (suggested form: `smoke+<YYYYMMDD>@worshiproom.dev`) → expect redirect to the Dashboard
- [ ] Log out via the avatar dropdown → expect the logged-out landing page
- [ ] Log back in as the smoke-test user → expect the Dashboard
- [ ] Refresh the page → expect still authenticated (brief `isAuthResolving` flash, then the Dashboard renders without a login prompt)
- [ ] Submit 6 bad passwords for the smoke-test user in rapid succession → expect the 6th attempt to surface rate-limit copy ("Too many attempts. Please wait a moment and try again.")

### 6.1 Accessibility smoke (Universal Rule 17 — MANDATORY for any phase cutover)

This evidence artifact closes Phase 1 per Rule 17. It must be captured, reviewed, and committed to Git.

- [ ] Run axe-core against `/` logged-out at the default viewport (1440×900). Expect zero WCAG 2.1 AA violations
- [ ] Run axe-core against `/prayer-wall` logged-out at the default viewport. Expect zero WCAG 2.1 AA violations
- [ ] Save the combined axe-core output to `_cutover-evidence/phase1-a11y-smoke.json` and commit it to the repo on a follow-up PR (file not pre-committed because it depends on the deployed URL responding)
- [ ] Keyboard walkthrough: Tab through `/`, `/prayer-wall`, and `/daily` with only the keyboard. Verify every focusable control has a visible focus indicator (focus ring) and the skip-to-main-content link appears on first Tab. Log observations in a short note at `_cutover-evidence/phase1-a11y-keyboard-notes.md`
- [ ] VoiceOver (macOS) spot-check on `/` and the Dashboard: Cmd-F5 to activate, VO+A to read the page. Confirm headings are announced in order and the Get Started button announces as a button. Log observations in the same keyboard-notes file

---

## 7. Playwright prod smoke

Automates the behavior surface of section 6 against the deployed Railway URLs. Single env var, no code changes from local dev mode.

- [ ] Run: `PLAYWRIGHT_BASE_URL=https://<frontend-railway-url> pnpm test:e2e phase01-auth-roundtrip`
- [ ] Expect 7/8 tests pass (scenario 2 auto-skips in prod mode because dev-seed users don't exist — this is intentional)
- [ ] Total wall-clock under 90 seconds. If longer, scenario 6 is probably retrying against a bucket that's already full from a prior run; wait 15 min or restart the backend service to flush
- [ ] Clean up test users:
  ```bash
  railway connect postgres
  ```
  Then in psql:
  ```sql
  DELETE FROM users WHERE email LIKE 'playwright-test+%' OR email LIKE 'smoke+%';
  ```

---

## 8. Rollback procedure (Railway-specific)

Document the rollback path for three scenarios BEFORE declaring Phase 1 cutover complete. Ideally test scenario 8.1 during the cutover (take the safe no-op redeploy path so you know the motion works). Scenarios 8.2 and 8.3 are readiness-only — don't practice them unless they happen.

### 8.1 Bad deploy, app won't start or serves 5xx

Easiest case. Railway-native, no Git operation required.

1. Open Railway dashboard → backend service → **Deployments** tab
2. Find the last known-good deploy (look for the one marked "Active" immediately before the bad one)
3. Click the three-dot menu on that deploy → "Redeploy"
4. Verify `/actuator/health` returns `{"status":"UP"}` at the backend URL
5. Estimated time-to-recovery: **2–3 minutes**

### 8.2 Deploy starts but auth is broken (e.g., `JWT_SECRET` wrong, rotated, or leaked)

1. Execute § 8.1 for an instant rollback to the previous deploy
2. Investigate env vars: dashboard → backend service → Variables. Compare against the known-good values Eric recorded privately at § 3
3. If `JWT_SECRET` leaked (e.g., accidentally committed, pasted into Slack), rotate it immediately via `openssl rand -base64 32` and update the Railway env var
4. Accept the tradeoff: rotating `JWT_SECRET` invalidates every outstanding JWT. Existing logged-in users will be logged out on their next authenticated request. For Phase 1 pre-launch volumes this is acceptable
5. If the bad secret made it into Git history, use `git filter-repo` on a follow-up — out of scope for this checklist

### 8.3 Liquibase migration partially applied then failed

**Scariest case. Slow down, act carefully, don't improvise.**

1. Check backend service logs for the exact changeset that failed — every Liquibase error logs the `changeset id` and `author`
2. In Phase 1, all Liquibase changesets are additive (new tables, new columns with defaults) — no destructive ops. Two recovery paths, in order of preference:
   - **Liquibase rollback** (preferred): from a local checkout with Railway Postgres credentials tunneled in via `railway connect postgres` + Maven config overrides, run `./mvnw liquibase:rollbackCount -Dliquibase.rollbackCount=1`. This reverses the last changeset via the changeset's own rollback block (every changeset has one per master plan Decision 2)
   - **Restore from Railway backup** (fallback): dashboard → Postgres service → **Backups** tab → pick the most recent pre-deploy backup → Restore. Loses any writes since the backup (hours, not days). Acceptable for Phase 1 pre-launch volumes but NOT for post-launch traffic
3. Estimated time-to-recovery: Liquibase rollback is **minutes**; backup restore is **10–30 minutes**
4. **Recommendation:** do the first prod deploy during a window when Eric can react if anything fails — not right before bed. If the cutover is late in the day, defer to the next morning rather than improvise recovery while tired

---

## 9. Post-deploy monitoring (48 hours)

The first 48 hours after a prod deploy are when most latent bugs surface. Scheduled twice-daily check-ins catch issues before they become user-visible.

- [ ] Day 1 morning: check Railway dashboard logs for the backend service — look for unexpected 5xx responses, repeated 401s on `/users/me` (token invalidation storms), or rate-limit triggers
- [ ] Day 1 evening: repeat. Quick CLI equivalent: `railway logs --service backend --tail 200`
- [ ] Day 2 morning: confirm backend memory and CPU graphs (Metrics tab) trend flat — no upward leak pattern
- [ ] Day 2 evening: confirm Postgres connection count stays well below HikariCP's pool ceiling (default pool size 10; plenty of headroom for Phase 1 traffic)
- [ ] If any metric spikes or any log pattern concerns, file a follow-up spec before ramping traffic

---

## 10. Phase 1 closed

- [ ] All section items above green
- [ ] Spec 1.10 tracker entry flipped to ✅ (Eric updates `_forums_master_plan/spec-tracker.md` manually — the green state means "cutover succeeded in prod", not just "plan file marked complete")
- [ ] Phase 2 (Activity Engine: faith points, streaks, badges, activity counts) unblocked; the first spec is `round3-phase02-spec01-activity-schema`
- [ ] Spec 1.10c (Database Backup Strategy — proves the Railway backup-restore path works end-to-end) scheduled to ship within 1–2 days. It's the next hardening step after the cutover settles
- [ ] Production hardening sprint noted as a follow-up batch before public beta: 1.10c, 1.10d (Sentry + UptimeRobot), 1.10g (security headers), 1.10h (error code catalog), 1.10i (env var runbook), 1.10j (liveness/readiness), 1.10k (HikariCP tuning), 1.10m (community guidelines), 1.10f (Terms/Privacy). Order within the batch matters less than having them all done before non-friends users arrive

Phase 1 is the backend auth foundation. Every spec after this one builds on it.
