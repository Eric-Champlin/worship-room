# Spec 1.10 Brief — Phase 1 Cutover and End-to-End Test

**Canonical ID:** `round3-phase01-spec10-phase1-cutover`
**Phase:** 1
**Size:** M
**Risk:** Medium
**Branch:** `claude/forums/round3-forums-wave`
**Prerequisites:** 1.9 ✅, 1.9b ✅, 1.10b ✅ (deployment target selected: Railway)
**Unblocks:** Phase 1 closed, Phase 2 can begin
**Platform decision (locked):** Railway, bundled (app + Postgres on one platform). Frontend hosting also on Railway's static site service unless Eric overrides (see § 4.1).

> **Version note:** This brief supersedes the earlier `[PLATFORM TBD]` draft. Platform selection was made per Spec 1.10b's recommendation (bundled Railway). All previously-placeholder sections are now filled in.

---

## 1. Goal

Close Phase 1 by doing three things:

1. **Prove end-to-end.** Write a Playwright test that exercises the real backend auth roundtrip (register → auto-login → authenticated request to `/users/me` → logout → 401 on retry). This is the first phase-level E2E test in the repo; it becomes the template for Phase 2's end-of-phase test.
2. **Document the deployment runbook.** Produce a cutover checklist at `_plans/forums/phase01-cutover-checklist.md` covering first-time Railway deploy, smoke tests, monitoring sanity, and rollback procedure.
3. **Update CLAUDE.md.** Reflect the new Railway-specific commands, env vars, and URLs so the next dev to touch the repo (or a future Claude session) has accurate context.

This is the ceremony that closes Phase 1. After 1.10 ships and Eric verifies the Railway deploy works, the backend foundation is done and Phase 2 (Activity Engine) begins.

---

## 2. Deliverables

Three files (two new, one modified):

- **NEW:** `frontend/e2e/phase01-auth-roundtrip.spec.ts` — the phase-level E2E test
- **NEW:** `_plans/forums/phase01-cutover-checklist.md` — the Railway deployment runbook
- **MODIFIED:** `CLAUDE.md` — updated with Railway URLs, CLI commands, and env var list

No code changes to `frontend/src/**` or `backend/src/**`. No database changes. No API changes. If CC finds itself modifying production code during this spec, something is wrong — push back.

---

## 3. Master Plan Divergences

Three divergences from the master plan v2.9 stub (lines 1988–2006). All three flow from Spec 1.9's execution reality and 1.10b's platform selection.

### 3.1 `VITE_USE_BACKEND_AUTH` flag does not exist

The master plan stub's acceptance criterion "`VITE_USE_BACKEND_AUTH` flipped to `true` in `.env.example` and verified in dev" is obsolete. Spec 1.9 shipped real JWT auth migration WITHOUT introducing a feature flag (verified via grep: the string `VITE_USE_BACKEND_AUTH` appears nowhere in the codebase). JWT auth is already the only path.

**Correct framing for 1.10:** instead of "flip the flag to activate new auth," the spec is "verify that the already-active JWT auth works end-to-end against a real Railway-deployed backend, and document how to deploy and roll back."

### 3.2 Directory naming — `_plans/forums-wave/` vs `_plans/forums/`

Master plan references `_plans/forums-wave/phase01-cutover-checklist.md` at line 1994. Repo convention is `_plans/forums/` (verified — no `forums-wave/` directory exists; `deployment-target-options.md` already lives in `_plans/forums/`). **Write the checklist to `_plans/forums/phase01-cutover-checklist.md`.** Do NOT create a `_plans/forums-wave/` directory.

### 3.3 Rollback procedure is Railway-specific, not flag-based

Master plan stub line 2001 says "Rollback procedure documented in cutover checklist (set flag to `false`, restart frontend)." That flag doesn't exist. Railway's actual rollback mechanism:

- **App rollback:** Railway dashboard → select service → Deployments tab → find previous known-good deploy → click "Redeploy." Single-click revert with no Git operation required. Alternatively: revert the commit on `main` and push — Railway auto-deploys the reverted SHA on GitHub integration.
- **Database rollback:** Railway Postgres is managed with daily backups + 7-day retention. No native PITR. For a bad schema migration in Phase 1 (all additive per Liquibase design), Liquibase's own rollback (`liquibase rollbackCount N`) is the primary path. For data corruption, the Railway Postgres backup-restore flow (dashboard-driven) is the fallback. Document both.

---

## 4. Railway-Specific Facts (Locked per 1.10b)

### 4.1 Frontend hosting assumption

**Default:** Railway also hosts the frontend via its static site service. This keeps everything single-vendor, single-dashboard, single-bill.

**Override condition:** if Eric is currently serving worshiproom.com preview builds on Vercel, Cloudflare Pages, or Netlify and wants to keep that, the cutover checklist's § 4 (Frontend Deploy) changes — only the backend + DB migrate to Railway. CC should ask Eric which path before starting Step 4 of the plan. If no preference, default to Railway-hosts-frontend.

### 4.2 Railway architecture for Worship Room

- **Backend service:** Railway builds from the repo's `backend/Dockerfile` automatically. GitHub integration triggers deploy on push to the configured branch.
- **Postgres service:** Railway Postgres add-on provisions PostgreSQL 16 with one click. Injects `DATABASE_URL` env var into connected services automatically.
- **Frontend service (if Railway-hosted):** Railway detects Vite, runs `pnpm build`, serves the `dist/` directory via their static site layer.
- **Environments:** Railway's Environments feature provides per-env config — "production" is the target for this spec. A separate "staging" env is out of scope; pre-production testing happens locally via `docker compose up`.

### 4.3 Railway CLI commands CC and Eric will reference

| Command | Purpose |
|---|---|
| `railway login` | Authenticate the CLI against Eric's Railway account (one-time) |
| `railway link` | Link the local repo checkout to the Railway project (one-time per machine) |
| `railway up` | Deploy current checkout (alternative to GitHub-triggered deploy) |
| `railway variables` | Inspect/set env vars from the CLI |
| `railway logs` | Stream logs for the linked service |
| `railway status` | Show deploy state and URLs |
| `railway redeploy` | Redeploy the latest deploy (or pick a previous one in dashboard) |

Installation (one-time, Eric's task): `curl -fsSL https://railway.com/install.sh | sh` or via Homebrew: `brew install railway`.

### 4.4 Railway-injected env vars

Railway auto-injects these into the backend service:
- `DATABASE_URL` — full Postgres connection string (Spring Boot auto-parses into datasource URL/username/password)
- `PORT` — the port Railway expects the app to bind to (Railway convention; Spring Boot's `server.port` should pick this up OR be set to match)

Eric/CC manually sets these in Railway's Variables UI per service:
- `SPRING_PROFILES_ACTIVE=prod`
- `JWT_SECRET` — 32+ bytes, generated via `openssl rand -base64 32`
- `JWT_EXPIRATION` (optional, defaults to 3600)
- `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY` (optional proxy features; degrade gracefully)
- For frontend service (if Railway-hosted): `VITE_API_BASE_URL` set to the backend service's Railway-generated URL (e.g., `https://worshiproom-backend-production.up.railway.app`)

### 4.5 Railway-specific gotcha: `server.port` binding

Spring Boot defaults to binding `server.port=8080`. Railway expects the app to bind to `$PORT` (which it injects). Two options:

- **Option A (recommended):** Set `server.port=${PORT:8080}` in `application.properties`. This reads `PORT` in prod, falls back to 8080 in dev. One-line change, but it's a production code change and this spec's guardrails say no `backend/src/**` changes. **Resolution:** this change belongs in a follow-up spec OR gets made by Eric manually before the first Railway deploy. Flag it in the cutover checklist's § 2 (Backend Deploy) as a manual prerequisite.
- **Option B:** Set `SERVER_PORT=$PORT` as a Railway variable. Works the same way without touching code. **Prefer this.** The checklist documents it.

### 4.6 Railway region selection

Pick **US-East** at project creation for best latency from Eric's Spring Hill, TN location. Railway's US-East maps to Ashburn, VA (same as AWS us-east-1). Confirm during account setup.

---

## 5. Recon Facts (Anchor Against These)

Locked as of 2026-04-24:

| Concern | Current State |
|---|---|
| Backend auth | Real JWT, already migrated (Spec 1.9). No feature flag. |
| Backend endpoints in scope | `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/users/me` |
| Backend health check | `/actuator/health` — already wired into docker-compose |
| JWT secret | Required env var `JWT_SECRET`. Prod fails fast on empty/short secret (JwtService @PostConstruct). |
| Prod profile | `SPRING_PROFILES_ACTIVE=prod` activates `application-prod.properties` (JSON logging, strict rate limits, prod CORS origins). |
| CORS origins in prod | Pinned to `https://worshiproom.com` and `https://www.worshiproom.com` (application-prod.properties line 14) |
| Database migrations | Liquibase, context `production` in prod skips dev-seed. |
| Dev-seed users | 5 users in `dev-seed.xml`, password `WorshipRoomDev2026!`. NOT loaded in prod. |
| Frontend env | `VITE_API_BASE_URL` points to backend. Dev is `http://localhost:8080`. Prod is the Railway backend URL. |
| Hibernate mode | `validate` — Hibernate never mutates schema. Liquibase owns schema. |
| Rate limits (prod) | Proxy: 60/min + 10 burst. Auth: 5 login attempts per email / 15 min, 20 per IP / 15 min. |
| Observability | NOT yet wired. Sentry/UptimeRobot are Spec 1.10d. Phase 1 cutover uses Railway's built-in logs and health checks only. |
| SSL/TLS | Railway-managed (automatic Let's Encrypt for `*.up.railway.app` subdomains and custom domains). |
| Custom domain | `worshiproom.com` is the production domain per CORS config. Railway supports custom domain with Cloudflare-or-equivalent DNS CNAME setup (out of scope for this spec; can happen post-deploy). |
| Backups | Railway Postgres: daily backups, 7-day retention. No PITR. 1.10c adds backup verification runbook. |

Key implication: Phase 1 cutover is **production-ready but not production-complete.** Specs 1.10c (backup verification), 1.10d (Sentry/UptimeRobot), 1.10g (security headers), 1.10j (liveness/readiness), 1.10k (HikariCP tuning) all harden the Railway deploy further. Those are follow-ups, not prereqs for closing Phase 1. The bar for 1.10 is: "real users could use this for auth without immediate catastrophe."

---

## 6. Playwright Test Scenarios (`phase01-auth-roundtrip.spec.ts`)

Unlike Spec 1.9's `spec-1-9-auth-flow.spec.ts` (which mocks `/auth/*` endpoints via `page.route`), this test runs against a REAL backend. Two modes of use:

- **Local dev mode** (default when running `pnpm test:e2e` locally): backend on `:8080`, frontend on `:5173`, test exercises the real dev-seed users.
- **Production smoke mode** (post-Railway-deploy manual run): test accepts a `PLAYWRIGHT_BASE_URL` env var; if set, points the test at the deployed frontend instead of localhost. Backend URL is inferred from the frontend's `VITE_API_BASE_URL` at runtime; the test does not need a second env var.

Both modes run the same scenarios; only the target URL differs.

### 6.1 Required scenarios

Six end-to-end flows at the default viewport (1440×900). Each asserts at the application behavior level — NOT the network level. Do not mock.

| # | Scenario | Acceptance |
|---|---|---|
| 1 | Fresh register → auto-login → dashboard | New unique email (timestamp-suffixed), 12+ char password; after submit, modal closes, dashboard greets user by name |
| 2 | Login with dev-seed creds | `sarah@worshiproom.dev` / `WorshipRoomDev2026!` → dashboard loads; `wr_jwt_token` appears in localStorage (local dev mode only — prod mode uses a fresh-register user) |
| 3 | `/users/me` hydration on reload | After login, reload page → brief resolving state, then same authenticated UI (no re-login prompt) |
| 4 | Logout clears state | Click logout → `wr_jwt_token` removed, unauthenticated UI restored |
| 5 | 401 handling after token invalidation | Log in, corrupt `wr_jwt_token` via `page.evaluate`, trigger any authenticated request (e.g., navigate to a profile route), verify clean logout fallback |
| 6 | Rate limit behavior | Submit 6 failed logins in rapid succession → 6th surfaces `RATE_LIMITED` copy in the FormError |

### 6.2 Things explicitly NOT to test here

- AuthModal visual styling across viewports — covered by Spec 1.9b's capture harness.
- Per-field validation errors — covered by Spec 1.9's AuthModal tests.
- AUTO_LOGIN_FAILED copy on register-with-existing-email — covered by Spec 1.9.
- Cross-tab sync via storage event — covered by Spec 1.9's AuthContext tests.

This test is about the **full stack roundtrip working end-to-end.** Coverage overlap with lower-level tests is intentional at ONE point (the happy path) and discouraged everywhere else.

### 6.3 Prerequisites before running

- Backend up and healthy (`/actuator/health` returns 200)
- Database migrations applied (dev-seed users exist in local mode; fresh registration users only in prod mode)
- Frontend dev server up
- No existing user with the test email (the test uses a timestamp-suffixed email like `playwright-test+${Date.now()}@worshiproom.dev` to avoid collisions)

Include a `test.beforeAll` that probes `/actuator/health`; if unreachable, skip all tests with a clear error message.

### 6.4 Runtime budget

Target: under 60 seconds total wall-clock for the 6 scenarios. Rate-limit test (scenario 6) is the slowest — 6 sequential failed logins with ~100ms each. If the total exceeds 90 seconds, the test is over-specified; simplify.

### 6.5 Prod-mode cleanup caveat

Running scenario 1 (fresh register) in production mode creates a real user in the Railway Postgres. This is acceptable for Phase 1 smoke testing but worth flagging:

- The timestamp-suffixed email (e.g., `playwright-test+1745529384@worshiproom.dev`) makes cleanup easy — `DELETE FROM users WHERE email LIKE 'playwright-test+%'` can be run in the Railway Postgres console periodically.
- Document this cleanup query in the cutover checklist § 8 (Post-deploy monitoring).

---

## 7. Cutover Checklist Structure (`phase01-cutover-checklist.md`)

A markdown runbook Eric follows to deploy Phase 1 to Railway for the first time. Template:

```markdown
# Phase 1 Cutover Checklist — Railway

**Purpose:** First-time production deployment of Worship Room backend + Postgres (+ optionally frontend) to Railway.
**Platform:** Railway (Hobby plan, US-East region)
**Deployment date:** [fill in when done]
**Estimated cost:** $5/month flat + ~$0–$3 usage = $5–$8/month total at Worship Room's Phase 1 scale

## 0. Pre-deploy verification (local)

- [ ] Latest `claude/forums/round3-forums-wave` branch merged to `main` and pushed
- [ ] `pnpm test` green locally (8932+ pass, 11 known-fail baseline)
- [ ] `./mvnw test` green locally (417+ pass, 0 fail baseline)
- [ ] Playwright `phase01-auth-roundtrip.spec.ts` passes against local dev
- [ ] `pnpm build` clean in frontend
- [ ] `./mvnw package` clean in backend
- [ ] `docker build -t worshiproom-backend:local backend/` succeeds (validates the Dockerfile Railway will use)

## 1. Railway account setup (one-time)

- [ ] Account created at https://railway.com (sign in via GitHub recommended for repo integration)
- [ ] Hobby plan subscribed ($5/month)
- [ ] Billing alerts enabled at $10 and $20 thresholds (Settings → Usage)
- [ ] Railway CLI installed: `brew install railway` (macOS) or `curl -fsSL https://railway.com/install.sh | sh`
- [ ] CLI authenticated: `railway login`

## 2. Railway project creation

- [ ] New project created (suggested name: `worship-room`)
- [ ] Region: US-East selected at creation
- [ ] Production environment (Railway's default) confirmed as the target environment

## 3. Backend service deploy

- [ ] In Railway dashboard: "Add New" → "GitHub Repo" → connect the `worship-room` repo
- [ ] Root directory: `/backend` (Railway builds from `backend/Dockerfile` automatically)
- [ ] Branch: `main` (or `claude/forums/round3-forums-wave` for the very first smoke)
- [ ] Env vars set in Railway's Variables UI:
  - [ ] `SPRING_PROFILES_ACTIVE=prod`
  - [ ] `JWT_SECRET` — generate locally via `openssl rand -base64 32`, paste into Railway (NEVER commit)
  - [ ] `JWT_EXPIRATION=3600` (optional; 1-hour default)
  - [ ] `SERVER_PORT=$PORT` — tells Spring Boot to bind to Railway's injected port (see § 4.5 of the brief)
  - [ ] `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY` (optional — proxy features degrade gracefully if absent)
- [ ] First deploy triggered (automatic on GitHub push, or manual via `railway up`)
- [ ] Deploy logs show: Maven build succeeds → JAR runs → Liquibase applies migrations → "Started WorshipRoomApplication in N seconds"
- [ ] `/actuator/health` returns `{"status":"UP"}` at the Railway-generated backend URL (find it in dashboard → service → Settings → Networking)
- [ ] Auth smoke: `curl -X POST https://<backend-railway-url>/api/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"smoke+'$(date +%s)'@worshiproom.dev","password":"SmokeTest2026!","firstName":"Smoke","lastName":"Test"}'` returns 200 `{"data":{"registered":true}}`

## 4. Database service (Railway Postgres)

- [ ] In Railway project: "Add New" → "Database" → "Add PostgreSQL"
- [ ] Postgres 16 provisioned (Railway default is current stable; confirm in service details)
- [ ] Postgres service's `DATABASE_URL` auto-shared with backend service (Railway does this via service-link; verify in backend service's Variables tab)
- [ ] Backend redeployed so it picks up `DATABASE_URL` (dashboard → backend service → Redeploy)
- [ ] Liquibase logs show all Phase 1 migrations applying cleanly on prod (check backend service logs)
- [ ] Prod DB is empty of dev-seed users (Liquibase context `production` skips dev-seed — confirm by connecting via `railway connect postgres` and running `SELECT email FROM users;` — expect zero rows)
```

---

```markdown

## 5. Frontend deploy (Railway-hosted path — default)

- [ ] In Railway project: "Add New" → "GitHub Repo" → same repo, root directory `/frontend`
- [ ] Build command: `pnpm install && pnpm build` (Railway usually detects; verify)
- [ ] Start command: static serve of `dist/` (Railway detects Vite; if not, use `pnpm preview --host 0.0.0.0 --port $PORT`)
- [ ] Env vars:
  - [ ] `VITE_API_BASE_URL=<backend-railway-url>` (no trailing slash; e.g., `https://worship-room-backend-production.up.railway.app`)
- [ ] Deploy succeeds, frontend URL reachable
- [ ] Root URL loads without console errors in a real browser (Chrome DevTools)
- [ ] Login form submits successfully against deployed backend (manual one-off before automated smoke)

## 5-alt. Frontend deploy (separate host — if Eric keeps Vercel/etc.)

- [ ] Confirm with Eric which host currently serves `worshiproom.com` preview builds
- [ ] Update `VITE_API_BASE_URL` there to the Railway backend URL
- [ ] Update Railway backend's CORS config: `application-prod.properties` line 14 already allows `worshiproom.com`; if the temporary deploy URL is different (e.g., `*.vercel.app`), add it to the CORS allowlist as a separate deploy prep — but DO NOT commit a wildcard; prefer locking to the final `worshiproom.com` once DNS is pointed
- [ ] Smoke-test: login against deployed Railway backend from the non-Railway frontend

## 6. Smoke tests (manual, against prod)

- [ ] Register a smoke-test user via UI with a unique email → redirected to dashboard
- [ ] Log out → unauthenticated UI
- [ ] Log in as smoke-test user → dashboard
- [ ] Refresh → still authenticated (brief isAuthResolving state, then dashboard)
- [ ] Submit 6 bad passwords for the smoke-test user → 6th surfaces rate-limit copy
- [ ] Accessibility smoke: run axe-core against `/` and `/prayer-wall` logged-out → zero WCAG AA violations (Universal Rule 17)

## 7. Playwright prod smoke

- [ ] `PLAYWRIGHT_BASE_URL=https://<frontend-railway-url> pnpm test:e2e phase01-auth-roundtrip` passes
- [ ] Clean up test users: `railway connect postgres` → `DELETE FROM users WHERE email LIKE 'playwright-test+%' OR email LIKE 'smoke+%';`

## 8. Rollback procedure (Railway-specific)

Three rollback scenarios documented — test at least one during the cutover:

### 8.1 Bad deploy, app won't start or serves 5xx
1. Open Railway dashboard → backend service → Deployments tab
2. Find the last known-good deploy (usually the one marked "Active" before the bad one)
3. Click the three-dot menu → "Redeploy"
4. Verify `/actuator/health` returns UP
5. Estimated time-to-recovery: ~2–3 minutes

### 8.2 Deploy starts but auth is broken (e.g., JWT_SECRET wrong)
1. Follow § 8.1 above for an instant rollback to previous deploy
2. Investigate env vars in Settings → Variables
3. If JWT_SECRET was committed anywhere (hope not), rotate immediately via `openssl rand -base64 32`
4. Any pre-rotation JWTs become invalid — existing users need to log in again. Acceptable tradeoff.

### 8.3 Liquibase migration partially applied then failed
**Scariest case. Act carefully.**
1. Check backend logs for the specific changeset that failed
2. In Phase 1, all Liquibase changesets are additive (new tables, new columns) — no destructive ops. Options:
   - Manual Liquibase rollback: `./mvnw liquibase:rollbackCount -Dliquibase.rollbackCount=1` against the Railway Postgres (requires local connection via `railway connect postgres` and tunneling credentials into Maven)
   - Restore from Railway's daily backup: dashboard → Postgres service → Backups tab → pick most recent pre-deploy → Restore. Loses any writes since the backup (hours, not days). Acceptable for Phase 1 pre-launch volumes.
3. Time-to-recovery depends on path: rollback is minutes, restore is 10–30 minutes
4. **Recommendation:** do the first prod deploy during a window Eric can watch, not right before going to bed

## 9. Post-deploy monitoring (48 hours)

- [ ] Check Railway dashboard logs twice daily for 48 hours — look for unexpected 500s, repeated 401s on `/users/me` (token invalidation storm), or rate-limit triggers
- [ ] `railway logs --service backend --tail 200` as a quick CLI check
- [ ] Backend memory/CPU trending stable — dashboard shows graphs; no leak pattern
- [ ] Postgres connection count well below Railway's default `max_connections` ceiling (HikariCP default pool size = 10; plenty of headroom)

## 10. Phase 1 closed

- [ ] All above items green
- [ ] Tracker updated: 1.10 marked ✅
- [ ] Phase 2 ready to begin
- [ ] Schedule 1.10c (backup verification) within 1–2 days
```

---

### 7.1 What the checklist is NOT

- NOT a runbook for day-2 operations (that's 1.10d Production Monitoring and future runbook specs).
- NOT a security hardening checklist (that's 1.10g Security Headers, 1.10f Terms/Privacy, etc.).
- NOT a disaster recovery procedure (that's 1.10c Database Backup Strategy).
- NOT a scale-testing guide.
- NOT a Railway tutorial (the platform has good docs; link to them rather than reproducing).

This is the first-deploy smoke pass on Railway. Subsequent hardening specs build on it.

---

## 8. CLAUDE.md Update

Scope of the CLAUDE.md update is narrow: reflect the Railway-specific operational context a future dev (or Claude session) needs. Target: 30–50 lines added. Keep tight.

Add a new "Production Deployment (Railway)" section that covers:

```markdown
## Production Deployment (Railway)

**Platform:** Railway Hobby plan, US-East region.
**Projects:** Single Railway project named `worship-room` with three services — backend, postgres, frontend.
**Dashboard:** https://railway.com/project/<project-id>
**Runbook:** `_plans/forums/phase01-cutover-checklist.md`

### URLs
- Backend: https://<backend-service>.up.railway.app
- Frontend: https://worshiproom.com (Railway-hosted or external — confirm at deploy time)
- Health: https://<backend-service>.up.railway.app/actuator/health

### CLI commands
- `railway login` — one-time auth
- `railway link` — link local checkout to the project
- `railway logs --service backend --tail 200` — view recent backend logs
- `railway variables --service backend` — inspect env vars
- `railway connect postgres` — open a psql session to the prod DB (use sparingly)

### Env vars (set in Railway Variables UI, never committed)
- Backend: `SPRING_PROFILES_ACTIVE=prod`, `JWT_SECRET`, `JWT_EXPIRATION=3600`, `SERVER_PORT=$PORT`, optional `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY`
- Frontend (if Railway-hosted): `VITE_API_BASE_URL=<backend-service-url>`
- Auto-injected by Railway: `DATABASE_URL`, `PORT`

### Redeploy / rollback
- Redeploy latest: push to `main`, or `railway up` from a clean checkout
- Rollback: Railway dashboard → service → Deployments → pick previous → Redeploy
- See `_plans/forums/phase01-cutover-checklist.md` § 8 for full rollback scenarios

### Playwright prod smoke
- Run: `PLAYWRIGHT_BASE_URL=https://<frontend-url> pnpm test:e2e phase01-auth-roundtrip`
- Remember to clean up test users after: `railway connect postgres` → `DELETE FROM users WHERE email LIKE 'playwright-test+%';`
```

Do NOT add:
- Extended Railway deploy tutorials (the cutover checklist owns that).
- Architecture diagrams or high-level docs.
- Railway-specific troubleshooting guides (those belong in 1.10d's runbook spec).

---

## 9. Acceptance Criteria

- [ ] File exists at `frontend/e2e/phase01-auth-roundtrip.spec.ts` with all 6 scenarios from § 6.1 implemented.
- [ ] All 6 Playwright scenarios pass against local dev (backend + frontend both running via `docker compose up` or native `./mvnw spring-boot:run` + `pnpm dev`).
- [ ] File exists at `_plans/forums/phase01-cutover-checklist.md` with all 10 sections from § 7's template.
- [ ] Railway-specific commands, URLs, and env var names are concrete in the checklist (not placeholder text). Eric fills in actual URLs post-deploy.
- [ ] CLAUDE.md has a new "Production Deployment (Railway)" section per § 8.
- [ ] `pnpm test` — no new failures (8932 pass / 11 fail baseline maintained).
- [ ] `./mvnw test` — no new failures (417 pass / 0 fail baseline maintained).
- [ ] No code changes in `frontend/src/**` or `backend/src/**`.
- [ ] No new deps added to `package.json` or `pom.xml`.
- [ ] Universal Rule 17 accessibility smoke: axe-core passes on `/` and `/prayer-wall` logged-out at the default viewport with zero WCAG AA violations. (Runs inside the phase01-auth-roundtrip test or as a separate test file; either acceptable.)
- [ ] Spec tracker updated to mark 1.10 as ✅ (Eric does this manually after verifying the actual Railway deploy, NOT just on spec completion — the tracker's green state means "cutover succeeded in prod").

---

## 10. Guardrails (DO NOT)

- Do NOT introduce `VITE_USE_BACKEND_AUTH` or any other feature flag. JWT auth is already the only path.
- Do NOT modify any file under `frontend/src/**` or `backend/src/**`. The `server.port` / `SERVER_PORT` tension (§ 4.5) is resolved via Railway env var, not code change.
- Do NOT add new npm dependencies or Maven dependencies.
- Do NOT mock the backend in the Playwright test. This test runs against real HTTP. Use `page.route` only if the test needs to observe requests, not to replace them.
- Do NOT hardcode dev-seed passwords anywhere except the test file where they're deliberately the target (with a comment noting they are public in `dev-seed.xml`).
- Do NOT include production secrets (JWT secret, API keys) anywhere in the cutover checklist. Secrets belong in Railway's Variables UI, referenced by name only.
- Do NOT deploy anything during this spec's execution. CC writes the checklist and the Playwright test; Eric runs the actual Railway deploy as a follow-up.
- Do NOT create Railway accounts, projects, or resources on Eric's behalf. Claude does not create accounts (safety rule).
- Do NOT commit Railway project IDs, tokens, or service URLs to Git. The CLAUDE.md references placeholder `<backend-service>` forms, not real URLs — Eric substitutes post-deploy.
- Do NOT create a `_plans/forums-wave/` directory — the repo uses `_plans/forums/`.
- Do NOT commit, push, checkout, or do any git operation. Eric handles all git.
- Do NOT extend the Playwright test to cover Phase 2+ flows (activity engine, badges, etc.). Scope is auth roundtrip only.
- Do NOT write platform-specific tutorials into CLAUDE.md. Link to Railway docs for anything beyond the short reference in § 8.

---

## 11. Out of Scope

- Actual production deploy (Eric runs this after 1.10 ships).
- Creating Railway accounts or projects (Eric does this).
- Setting up `worshiproom.com` DNS to point at Railway (outside any Forums Wave spec; Eric or an ops spec later).
- Configuring Sentry, UptimeRobot, monitoring dashboards (Spec 1.10d).
- Database backup automation beyond Railway's built-in daily (Spec 1.10c).
- Security headers / CSP / HSTS (Spec 1.10g).
- Terms of Service / Privacy Policy surfaces (Spec 1.10f).
- HikariCP connection pool tuning (Spec 1.10k).
- Liveness/readiness probes beyond `/actuator/health` (Spec 1.10j).
- Load testing or scale validation.
- Multi-region deploy.
- Blue/green or canary deploy mechanics (Railway's default promote-after-healthcheck is fine for Phase 1).
- Bot/crawler protection.
- Email deliverability (blocked on SMTP — Phase 15.1).
- Database migration away from Railway Postgres (the deployment-target-options.md notes migration to Neon is a ~1-hour operation if PITR becomes load-bearing later; that's a future spec, not this one).

---

## 12. Plan Shape Expectation

`/plan-forums` output should be moderate — probably 5–7 steps:

1. Read existing Playwright setup and `frontend/playwright.config.ts` (verify it supports `PLAYWRIGHT_BASE_URL` or document how to extend it).
2. Author `phase01-auth-roundtrip.spec.ts` with all 6 scenarios.
3. Verify Playwright test passes locally against a running backend (manual run; CC shouldn't start servers).
4. Author `phase01-cutover-checklist.md` with all 10 sections and Railway specifics.
5. Update CLAUDE.md with the new Production Deployment (Railway) section.
6. Verify acceptance criteria (all tests still pass, no src/** changes, etc.).

If the plan comes back with 10+ steps, it's over-specified for M/Medium. Push back.

---

## 13. Rollback Scenarios Worth Thinking About (Railway-Specific)

The cutover checklist's § 8 covers three scenarios in Railway-specific terms. Summary for planning:

1. **Bad deploy, app won't start.** Easy. Railway's Deployments tab → Redeploy previous. 2–3 minutes to recover.
2. **Deploy starts but auth is broken** (e.g., JWT_SECRET wrong). Same mechanism as #1 plus secret rotation if the bad secret leaked anywhere. Users who authenticated with the bad JWT will need to log in again; acceptable.
3. **Liquibase migration partially applies then fails.** Scariest case. Phase 1 changesets are all additive so `liquibase rollbackCount 1` works, BUT running it against prod Railway Postgres requires `railway connect postgres` + Maven tunneling. Alternative: restore from Railway's daily backup (dashboard → Postgres → Backups tab), losing hours of writes. For pre-launch volumes the write loss is acceptable. **Recommend doing the first prod deploy when Eric can react if anything fails — not right before bed.**

Scenario 3 is also why 1.10c (backup verification) should ship within 1–2 days of 1.10. The cutover checklist references Railway's backup feature but doesn't prove it works; 1.10c proves the full restore-to-fresh-cluster path.

---

## 14. Post-Spec Follow-Up (not part of this spec)

After 1.10 ships AND Eric executes the Railway cutover checklist successfully:

1. Mark 1.10 as ✅ in the tracker.
2. Phase 1 is officially closed.
3. **Within 1–2 days:** ship Spec 1.10c (Database Backup Strategy) to prove the Railway backup-restore path works before any real user data accumulates.
4. **Within 1 week of real user traffic:** ship Spec 1.10d (Production Monitoring Foundation) to get Sentry + UptimeRobot catching issues Eric can't eyeball.
5. **Before opening to public beta:** batch 1.10g (security headers), 1.10h (error code catalog), 1.10i (env var runbook), 1.10j (liveness/readiness), 1.10k (HikariCP tuning), 1.10m (community guidelines), 1.10f (Terms/Privacy) as a "production hardening sprint." Order within the batch matters less than having them all done before non-friends users arrive.
6. Phase 2's first spec (round3-phase02-spec01-activity-schema) becomes the logical next authoring target after 1.10 ships, parallel with the production hardening sprint.

---

## 15. Reference: What This Spec Closes

After 1.10 ships and the Railway cutover is verified:

- Phase 1 auth foundation is production-capable on Railway.
- Real users could register, log in, and access authenticated endpoints against a live Railway backend.
- The first end-to-end test exists and becomes the template for Phase 2's phase-level test.
- Eric has a documented Railway cutover procedure he can re-use for future phase deploys.
- The backend foundation is stable enough that Phase 2 (Activity Engine: faith points, streaks, badges, activity counts) can begin planning.
- Railway's monthly cost (~$5–$8) is locked in as the ongoing infrastructure baseline until traffic or data volume justifies the Neon split documented as the escape hatch in `deployment-target-options.md`.

---

*End of brief.*
