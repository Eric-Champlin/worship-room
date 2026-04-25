# Backend Environment Variables Runbook

**Status:** Canonical reference for every environment variable the Worship Room backend reads. Established by Spec 1.10i.

---

## 1. Purpose and scope

This document is the canonical reference for backend environment variables. Use it when:

- Provisioning a new environment (local dev, staging, production).
- Debugging a startup failure that smells like a missing or misconfigured env var.
- Rotating a secret.
- Onboarding a teammate who needs to answer "what env vars does this backend need to start?"

**In scope:** every env var the Spring Boot backend reads, either via an explicit `${VAR}` placeholder in `application*.properties` or via Spring Boot's relaxed-binding name conversion (`SPRING_DATASOURCE_URL` → `spring.datasource.url`, etc.).

**Out of scope:**

- Frontend Vite env vars (`VITE_API_BASE_URL`, `VITE_VAPID_PUBLIC_KEY`, etc.). Those are inlined at frontend build time, not read by the backend at runtime. A sibling `frontend/docs/env-vars-runbook.md` belongs at the frontend level if/when that audience needs one.
- Secrets management beyond the Railway Variables tab (Doppler, Vault, AWS Secrets Manager). Future hardening; see § 6.6.

**Audience:** anyone deploying, debugging, or rotating credentials. Not a tutorial on Spring Boot configuration; assumes familiarity with `application.properties` precedence and profile activation.

---

## 2. Quick-start matrix

Every env var the backend currently reads, grouped by category, alphabetical within group. **Required-in** answers "must this be set, or is the default safe?" — `auto` means the dev/test profile supplies a default that works locally without action.

| Category | Variable | Dev | Test | Prod | Sensitivity | One-line purpose |
|---|---|---|---|---|---|---|
| Spring framework | `SERVER_PORT` | auto | auto | **required** | config | HTTP port the JVM binds to. |
| Spring framework | `SPRING_PROFILES_ACTIVE` | auto | auto | **required** | config | Selects `application-{profile}.properties` (dev / prod). |
| Datasource | `SPRING_DATASOURCE_PASSWORD` | auto | auto | **required** | secret | Postgres password. |
| Datasource | `SPRING_DATASOURCE_URL` | auto | auto | **required** | config | JDBC URL for Postgres. |
| Datasource | `SPRING_DATASOURCE_USERNAME` | auto | auto | **required** | config | Postgres username. |
| JWT | `JWT_EXPIRATION` | optional | optional | optional | config | Token lifetime in seconds. Default 3600. |
| JWT | `JWT_SECRET` | auto (dev fallback) | auto (inherits dev) | **required** | secret | HS256 signing key, ≥32 bytes. |
| CORS | `PROXY_CORS_ALLOWED_ORIGINS` | auto | auto | **required** | config | Comma-separated allow-list of frontend origins. |
| Monitoring | `SENTRY_DSN` | optional | optional | optional | secret | Sentry DSN; empty = no-op (graceful disable). Spec 1.10d. |
| Monitoring | `SENTRY_ENVIRONMENT` | optional | optional | optional | config | Environment tag for Sentry events (`development` / `production`). Spec 1.10d. |
| Upstream API key | `FCBH_API_KEY` | optional | optional | optional | secret | Faith Comes By Hearing audio Bible (Spec 4). |
| Upstream API key | `GEMINI_API_KEY` | optional | optional | optional | secret | Google Gemini AI proxy (Spec 2). |
| Upstream API key | `GOOGLE_MAPS_API_KEY` | optional | optional | optional | secret | Google Maps Places + Geocoding (Spec 3). |

**Reading the matrix:**

- **required:** the app will not boot, will boot with wrong behavior, or will fail at runtime if absent.
- **auto:** a hardcoded default in `application*.properties` makes the env var unnecessary for that environment. Local dev "just works" without setting it.
- **optional:** the app boots and operates without the var; a feature degrades gracefully when absent (upstream API features return controlled errors or report `providers.* = false` on `/api/v1/health`).

---

## 3. The catalog

Per-var detail blocks. Grouped by category, alphabetical within category.

### 3.1 Spring framework

#### `SERVER_PORT`

- **Type:** integer
- **Default:** `8080` (`application.properties:4`)
- **Required in:** prod (must be set to Railway's injected port). Dev/test use the default.
- **Sensitivity:** config
- **Consumed by:** Spring Boot itself (Tomcat HTTP connector binding).
- **Behavior if absent:**
  - Dev / test: binds to `:8080`. Matches `docker-compose.yml` port mapping.
  - Prod: binds to `:8080` instead of Railway's dynamically assigned port. Healthcheck (`/actuator/health/readiness`) becomes unreachable; Railway routes traffic to the wrong port; deploy fails after `restartPolicyMaxRetries` (3).
- **Rotation procedure:** N/A (not a secret).
- **Cross-references:**
  - Railway requires the value `${{PORT}}` (double-curly Railway template syntax). Single-`$` shell syntax (`$PORT`) does not interpolate and crashes startup. See `_plans/forums/phase01-cutover-checklist.md` § 3 line 73.
  - Related: `railway.toml` healthcheck path.

#### `SPRING_PROFILES_ACTIVE`

- **Type:** string (one of `dev`, `prod`; `test` is reserved for future use but no `application-test.properties` exists today)
- **Default:** unset; `spring.profiles.default=dev` (`application.properties:8`) is the fallback Spring uses when no active profile is set.
- **Required in:** prod (must be `prod`). Dev/test inherit `dev` via `spring.profiles.default`.
- **Sensitivity:** config
- **Consumed by:** Spring Boot itself (selects `application-{profile}.properties`).
- **Behavior if absent:**
  - Dev / test: dev profile loads. Verbose logging, looser rate limits, dev CORS origins, dev datasource credentials pointing at `localhost:5432`.
  - Prod: **dev profile loads**, with all the dev-mode side effects above. The app boots and serves traffic, but with localhost datasource credentials it cannot connect to the production Postgres — startup fails on the first JPA query. Subtler failure mode than a missing datasource URL because the property layout looks normal in actuator until the connection is attempted.
- **Rotation procedure:** N/A.
- **Cross-references:**
  - `docker-compose.yml:32` provides a fallback `SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE:-dev}` for local containerized runs.
  - Related profile-scoped properties: `application-dev.properties`, `application-prod.properties`.

### 3.2 Datasource

All three datasource vars are read by Spring Boot itself via relaxed binding (`SPRING_DATASOURCE_URL` → `spring.datasource.url`). They override the dev-profile hardcoded values at `application-dev.properties:50-52`.

#### `SPRING_DATASOURCE_URL`

- **Type:** JDBC URL (e.g., `jdbc:postgresql://host:port/database`)
- **Default:** `jdbc:postgresql://localhost:5432/worshiproom_dev` (dev profile only, `application-dev.properties:50`). No default in base or prod profiles.
- **Required in:** prod (mandatory). Dev/test use the dev-profile default.
- **Sensitivity:** config (the URL itself; the password is separate).
- **Consumed by:** Spring Boot DataSource autoconfiguration → HikariCP pool → JPA / Liquibase.
- **Behavior if absent:**
  - Dev / test: dev-profile default applies; backend connects to local Docker Compose Postgres.
  - Prod: under the prod profile no default exists — Spring Boot's DataSource autoconfiguration fails with "Failed to determine a suitable driver class" and the app refuses to start. Confirmed at cutover (see checklist § 3 line 74; Eric had to add this var after the first deploy attempt).
- **Rotation procedure:** N/A (the URL itself is not a secret; password rotation is the Postgres side).
- **Cross-references:**
  - Production value uses Railway cross-service template: `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}`. The `${{Postgres.*}}` syntax is Railway-specific; it pulls live values from the Postgres service at deploy time.
  - Spring Boot does NOT auto-read Heroku's `DATABASE_URL` convention. See § 6.4.

#### `SPRING_DATASOURCE_USERNAME`

- **Type:** string
- **Default:** `worshiproom` (dev profile only, `application-dev.properties:51`).
- **Required in:** prod (mandatory). Dev/test use the dev-profile default.
- **Sensitivity:** config (the username; password is separate).
- **Consumed by:** Spring Boot DataSource autoconfiguration.
- **Behavior if absent:**
  - Dev / test: dev-profile default applies.
  - Prod: HikariCP pool init fails with authentication error. App refuses to start.
- **Rotation procedure:** Railway-managed at the Postgres service tier. No manual procedure at the Hobby plan tier.
- **Cross-references:** Production value: `${{Postgres.PGUSER}}`.

#### `SPRING_DATASOURCE_PASSWORD`

- **Type:** string
- **Default:** `worshiproom` (dev profile only, `application-dev.properties:52`).
- **Required in:** prod (mandatory). Dev/test use the dev-profile default.
- **Sensitivity:** **secret**
- **Consumed by:** Spring Boot DataSource autoconfiguration.
- **Behavior if absent:**
  - Dev / test: dev-profile default applies.
  - Prod: HikariCP pool init fails with authentication error. App refuses to start.
- **Rotation procedure:** Deferred — Railway manages the Postgres password automatically via the cross-service `${{Postgres.PGPASSWORD}}` reference. No manual rotation procedure at the Hobby plan tier. If/when the deployment moves off Railway-managed Postgres, document the rotation procedure here.
- **Cross-references:** Production value: `${{Postgres.PGPASSWORD}}`.

### 3.3 JWT

#### `JWT_SECRET`

- **Type:** string (raw bytes; ≥32 bytes / 256 bits required for HS256)
- **Default:** empty string `""` in base `application.properties:76`. The dev profile supplies a 74-character hardcoded fallback at `application-dev.properties:58` (NEVER use in prod — placeholder string is not cryptographically secure and is checked into the repo).
- **Required in:** prod (mandatory; fail-fast). Dev/test auto-supply the dev fallback.
- **Sensitivity:** **secret**
- **Consumed by:** `JwtConfig.secret` → `JwtService.@PostConstruct validateAndInitialize()` (`backend/src/main/java/com/worshiproom/auth/JwtService.java:30-49`).
- **Behavior if absent:**
  - Dev / test: dev-profile fallback applies; app boots; tokens sign and verify against the placeholder secret.
  - Prod: `IllegalStateException` thrown from `@PostConstruct` with message `"JWT_SECRET is not configured. Set the JWT_SECRET environment variable (at least 32 bytes) or provide jwt.secret in a dev profile fallback."` — Spring `ApplicationContext` refresh fails, app does not boot, Railway readiness probe never goes UP, Railway restarts the container three times, then the deploy fails.
  - Same fail-fast triggers if the secret is non-empty but `< 32` bytes (`"JWT_SECRET must be at least 32 bytes for HS256. Got N bytes."`) — protects against accidentally pasting a short string.
- **Rotation procedure:** see § 5.1.
- **Cross-references:**
  - Introduced by Forums Wave Spec 1.4 (JWT auth foundation).
  - Related: `JWT_EXPIRATION`.
  - Cutover history: rotated once during Spec 1.10 cutover after exposure in chat transcripts; final value lives only in personal password manager (see checklist § 3 line 71).

#### `JWT_EXPIRATION`

- **Type:** integer (seconds)
- **Default:** `3600` (1 hour) — `application.properties:77` via `${JWT_EXPIRATION:3600}` placeholder.
- **Required in:** never strictly required; default works in every environment.
- **Sensitivity:** config
- **Consumed by:** `JwtConfig.expirationSeconds` → `JwtService.generateToken()`.
- **Behavior if absent:** falls back to 3600 seconds. Tokens issued during the absence are 1-hour tokens.
- **Rotation procedure:** N/A. Changing this value invalidates existing tokens once they pass the new `exp` claim time, but does not require coordinated rotation.
- **Cross-references:** related: `JWT_SECRET`. The Railway Variables tab currently sets this to `3600`, which agrees with the default — see § 6.6 for the redundancy note.

### 3.4 CORS

#### `PROXY_CORS_ALLOWED_ORIGINS`

- **Type:** comma-separated list of origin URLs (e.g., `https://example.com,https://www.example.com`)
- **Default:**
  - Dev profile: `http://localhost:5173,http://localhost:5174,http://localhost:4173` (`application-dev.properties:44`)
  - Prod profile: `https://worshiproom.com,https://www.worshiproom.com` (`application-prod.properties:17`)
- **Required in:** prod (mandatory in practice — see "Behavior if absent" below). Dev/test use the dev-profile default.
- **Sensitivity:** config
- **Consumed by:** `CorsConfig.@Value("${proxy.cors.allowed-origins}") String[] allowedOrigins` (`backend/src/main/java/com/worshiproom/config/CorsConfig.java:70-71`). Applied by both layers — the global `CorsFilter` bean and `WebMvcConfigurer.addCorsMappings`.
- **Behavior if absent:**
  - Dev / test: dev-profile default applies; Vite dev server (`:5173`) and preview server (`:4173`) can call the backend.
  - Prod (var unset, default applies): the prod-profile file default `https://worshiproom.com,https://www.worshiproom.com` applies. If the production frontend is hosted at any other origin (e.g., the Railway-assigned `*.up.railway.app` URL), the browser blocks every cross-origin request with a CORS preflight failure. The frontend appears completely broken; the backend logs nothing wrong because the preflight is handled correctly per spec — the issue is that the spec excludes the unlisted origin. Confirmed at cutover (see checklist § 3 line 77; Eric had to override the file default to add the Railway frontend origin).
  - Prod (var unbound at startup): if neither the env var nor the prod profile properties supply a value, `CorsConfig` would likely fail at startup with an error such as `BeanCreationException` because `String[] allowedOrigins` would be `null` and `setAllowedOrigins(Arrays.asList(null))` would throw. This failure mode is inferred from reading the code path; it has not been reproduced under test.
- **Rotation procedure:** N/A. Edit the Railway Variables tab to add a new origin; no restart required for non-CORS-related downstream behavior, but the running container must be redeployed for the new list to take effect.
- **Cross-references:**
  - `02-security.md` § "CORS Policy" — defines the methods, headers, exposed-headers, credentials, and max-age values that pair with the origin list.
  - `03-backend-standards.md` § "CORS Policy" — same content, slightly different framing.

### 3.5 Upstream API keys

All three upstream API keys share the same shape: empty default in base `application.properties`, optional in every environment, graceful degradation when absent. They are bound to `ProxyConfig.{Gemini,GoogleMaps,Fcbh}Properties` nested classes, each with an `isConfigured()` method that callers use to gate feature behavior.

#### `GEMINI_API_KEY`

- **Type:** string (Google Gemini API key)
- **Default:** empty string `""` (`application.properties:54` via `${GEMINI_API_KEY:}` placeholder).
- **Required in:** never required — feature degrades gracefully.
- **Sensitivity:** **secret**
- **Consumed by:** `ProxyConfig.GeminiProperties.apiKey` → `GeminiService` (Spec 2 — AI proxy).
- **Behavior if absent:** `GeminiProperties.isConfigured()` returns `false`. `/api/v1/health` reports `providers.gemini = false`. AI Explain (BB-30), AI Reflect (BB-31), AI Bible Chat (`/ask`), AI Prayer Generation, and AI Journal Reflection all fail with a controlled error (`502 UPSTREAM_ERROR`) instead of crashing.
- **Rotation procedure:** see § 5.2.
- **Cross-references:**
  - Introduced by Key Protection Wave Spec 2 (`ai-proxy-gemini`).
  - Frontend never holds this key — `VITE_GEMINI_API_KEY` was removed from the frontend bundle in the Key Protection Wave.

#### `GOOGLE_MAPS_API_KEY`

- **Type:** string (Google Cloud API key with Places API + Geocoding API enabled)
- **Default:** empty string `""` (`application.properties:55` via `${GOOGLE_MAPS_API_KEY:}` placeholder).
- **Required in:** never required — feature degrades gracefully.
- **Sensitivity:** **secret**
- **Consumed by:** `ProxyConfig.GoogleMapsProperties.apiKey` → Maps proxy services (Spec 3 — Local Support).
- **Behavior if absent:** `GoogleMapsProperties.isConfigured()` returns `false`. `/api/v1/health` reports `providers.googleMaps = false`. Local Support search (Churches / Counselors / Celebrate Recovery locators) returns controlled errors; UI falls back to the documented logged-out mock listings.
- **Rotation procedure:** see § 5.2.
- **Cross-references:** introduced by Key Protection Wave Spec 3 (`ai-proxy-maps`).

#### `FCBH_API_KEY`

- **Type:** string (Faith Comes By Hearing Digital Bible Platform API key)
- **Default:** empty string `""` (`application.properties:56` via `${FCBH_API_KEY:}` placeholder).
- **Required in:** never required — feature degrades gracefully.
- **Sensitivity:** **secret**
- **Consumed by:** `ProxyConfig.FcbhProperties.apiKey` → FCBH proxy services (Spec 4 — Bible audio).
- **Behavior if absent:** `FcbhProperties.isConfigured()` returns `false`. `/api/v1/health` reports `providers.fcbh = false`. Bible audio playback (BB-26 / BB-27 / BB-29 / BB-44) fails with a controlled error; the BibleReader continues to render and read silently.
- **Rotation procedure:** see § 5.2.
- **Cross-references:** introduced by Key Protection Wave Spec 4 (`ai-proxy-fcbh`).

### 3.6 Monitoring

Established by Forums Wave Spec 1.10d. See `backend/docs/runbook-monitoring.md` for the operator runbook (account setup, alert triage, UptimeRobot procedure).

#### `SENTRY_DSN`

- **Type:** string (Sentry project DSN, e.g., `https://<key>@oXXXX.ingest.sentry.io/<project>`)
- **Default:** empty string `""` (`application.properties` via `${SENTRY_DSN:}` placeholder).
- **Required in:** never required — the Sentry SDK becomes a no-op when DSN is empty.
- **Sensitivity:** **secret** (the DSN contains the public ingest key; do not expose in client bundles, logs, or screenshots).
- **Consumed by:** `sentry-spring-boot-starter-jakarta` auto-configuration → `io.sentry.Sentry` SDK → `SentryConfig.@Bean BeforeSendCallback` (filters expected exceptions) and `SentryConfig.@Bean SentryUserContextFilter` (attaches `user.id`).
- **Behavior if absent:** SDK initializes in no-op mode. Zero outbound HTTP, zero log noise, zero startup warnings. `SentryConfig` beans still register but their effect is invisible because the SDK won't emit events.
- **Rotation procedure:** Generate a new DSN in Sentry project Settings → Client Keys → "Generate new key", paste into Railway Variables, save. Railway auto-redeploys. Old DSN can stay valid for a grace period (Sentry honors both until you revoke the old key in the Sentry UI).
- **Cross-references:**
  - Introduced by Forums Wave Spec 1.10d.
  - `backend/docs/runbook-monitoring.md` § 3 — DSN extraction procedure.
  - `backend/docs/runbook-monitoring.md` § 4 — Railway wiring procedure.
  - `02-security.md` privacy rule — frontend Sentry (when 1.10d-bis ships) gets its own DSN, also routed through Railway env vars; the backend DSN is NOT shared with the frontend.

#### `SENTRY_ENVIRONMENT`

- **Type:** string (typically `development`, `staging`, or `production`)
- **Default:** empty string `""` (`application.properties` via `${SENTRY_ENVIRONMENT:}` placeholder). Sentry treats absent environment as "no environment tag" — events appear in the default bucket.
- **Required in:** never required — but strongly recommended in prod so Eric can filter Sentry's UI by environment.
- **Sensitivity:** config (no secret value).
- **Consumed by:** Sentry SDK environment tagging. Every event emitted carries this tag.
- **Behavior if absent:** events ship without an environment tag. Functional, but Sentry UI lumps every environment into one stream — harder to filter.
- **Rotation procedure:** N/A. Edit the Railway Variables tab → Railway redeploys → new tag applied to subsequent events.
- **Cross-references:** introduced by Forums Wave Spec 1.10d. Set to `production` on the Railway backend service post-deploy.

---

## 4. Provisioning procedures

### 4.1 Local development

**Default path (zero env vars set):**

1. `docker compose up postgres` — starts the Postgres container with the credentials hardcoded in `docker-compose.yml`.
2. `cd backend && ./mvnw spring-boot:run` — boots the backend on `:8080` under the dev profile.
3. The backend connects to `localhost:5432/worshiproom_dev` via the dev-profile defaults at `application-dev.properties:50-52`. JWT, CORS, rate limits, and logging all operate on dev-profile defaults. All three upstream API keys are absent → `/api/v1/health` reports `providers.* = false`, all AI / Maps / FCBH features degrade gracefully.

**With upstream API keys (recommended for full local development):**

1. `cp backend/.env.example backend/.env.local` — creates a gitignored env file.
2. Fill in real values for `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY`. Acquire keys from the respective vendor consoles (see § 5.2).
3. `docker compose up backend` — `docker-compose.yml` line 28 declares `env_file: ./backend/.env.local` as `required: false`, so it is loaded if present and silently skipped if not.
4. Same dev-profile defaults apply for everything else.

**Postgres container vars vs. backend datasource:** `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in `docker-compose.yml` (lines 8-11) are consumed by the Postgres container itself, not by the backend. They must match the hardcoded dev datasource credentials in `application-dev.properties:50-52` — if either side changes, both must change in lockstep, or local backend startup will fail with a Postgres authentication error. See § 3.2 for the prod equivalent (`SPRING_DATASOURCE_URL` and friends).

### 4.2 Test runs

Tests inherit the dev profile via `spring.profiles.default=dev`. There is no `application-test.properties` file; `AbstractIntegrationTest` and `AbstractDataJpaTest` register `@DynamicPropertySource` overrides for the values that must differ from dev (`spring.liquibase.contexts=test`, Testcontainers-supplied datasource URL/credentials, etc.). See `06-testing.md` § "Testcontainers Setup Pattern" and `05-database.md` § "Test-profile context override (no application-test.properties)" for the canonical mechanism.

In practice this means: **tests need zero env vars set on the developer machine.** Testcontainers handles datasource provisioning per test class; the dev-profile JWT fallback handles auth; upstream API keys default to empty and corresponding tests use mocked services.

### 4.3 Production (Railway)

The canonical source-of-truth list of production env vars is `_plans/forums/phase01-cutover-checklist.md` § 3 (the cutover that originally provisioned them). Reproduced here for convenience; consult the checklist for current values:

| Variable | Production value pattern | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Activates `application-prod.properties`. |
| `SERVER_PORT` | `${{PORT}}` | Railway template syntax (double-curly), NOT shell `$PORT`. |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` | Cross-service reference to the Postgres service. |
| `SPRING_DATASOURCE_USERNAME` | `${{Postgres.PGUSER}}` | Same. |
| `SPRING_DATASOURCE_PASSWORD` | `${{Postgres.PGPASSWORD}}` | Same. |
| `JWT_SECRET` | `<generate via openssl rand -base64 32>` | Sole copy in personal password manager. |
| `JWT_EXPIRATION` | `3600` | Redundant with file default; see § 6.6. |
| `PROXY_CORS_ALLOWED_ORIGINS` | `https://<railway-frontend>.up.railway.app,https://worshiproom.com,https://www.worshiproom.com` | Must include every frontend origin; profile default omits the Railway URL. |
| `GEMINI_API_KEY` | `<from Google Cloud console>` | Optional; AI features degrade gracefully if absent. |
| `GOOGLE_MAPS_API_KEY` | `<from Google Cloud console>` | Optional; Local Support degrades gracefully if absent. |
| `FCBH_API_KEY` | `<from FCBH developer portal>` | Optional; Bible audio degrades gracefully if absent. |

Railway's Postgres plugin auto-injects `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` into the Postgres service. Backend cross-service references (`${{Postgres.PG*}}`) read these at deploy time and substitute literal values into the backend's env vars. Backend code never reads `PG*` directly. The plugin also auto-injects `DATABASE_URL` into the backend service — this var is not used; see § 6.4.

### 4.4 Future environments (e.g., staging)

No staging environment exists today. When one is added, the pattern matches production with environment-specific values:

- A separate Railway project (or environment within the existing project) with its own Postgres service.
- Environment-scoped `JWT_SECRET` (rotate independently from prod).
- Environment-scoped `PROXY_CORS_ALLOWED_ORIGINS` listing the staging frontend origin.
- Same upstream API keys can be reused, or separate keys can be provisioned with stricter rate quotas in the vendor consoles.

---

## 5. Secret rotation procedures

### 5.1 `JWT_SECRET`

**When to rotate:**

- Suspected leak (e.g., committed to git, pasted into a chat transcript, included in a screenshot).
- Routine rotation cadence (not yet established; deferred until post-launch when a security policy is written).
- After any contractor / outside collaborator with access leaves.

**Procedure:**

1. Generate a new secret on a trusted machine: `openssl rand -base64 32`. The output is a 44-character base64 string representing 32 bytes of entropy — exactly the HS256 minimum.
2. Store the new value in a personal password manager BEFORE pasting it anywhere else. Once the old value is overwritten in Railway, there is no recovery.
3. In the Railway dashboard, navigate to the backend service → Variables → edit `JWT_SECRET` → paste the new value → save.
4. Railway redeploys the backend service automatically on env var change. The deploy goes through the usual sequence (build → start → Liquibase → readiness UP).
5. **Consequence: every outstanding JWT is invalidated.** Existing logged-in users get a `401 TOKEN_INVALID` on their next authenticated request and are redirected to the login screen by the frontend's auth-invalidation handler. For Phase 1 pre-launch volumes (Eric + a handful of friends) this is acceptable.
6. Verify the rotation: log in via the production frontend, confirm a fresh JWT works end-to-end (POST a Prayer Wall comment or similar write).
7. Update the personal password manager entry's "last rotated" timestamp.

**Do not use:** `--no-edit` or any in-place edit that loses the old value before the new one is verified working.

### 5.2 Upstream API keys (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY`)

**When to rotate:**

- Suspected leak.
- Vendor reports anomalous usage in their console.
- After any contractor / outside collaborator with vendor-console access leaves.

**Procedure (vendor-specific):**

| Key | Vendor console | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio (`aistudio.google.com`) → API keys | Generate a new key, paste into Railway, then revoke the old key in the console. Order matters — revoke last, not first, or there is a gap where the backend has no working key. |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials | Same pattern. Restrict the new key to `Places API` + `Geocoding API` only. |
| `FCBH_API_KEY` | FCBH Digital Bible Platform developer portal (`dbp.fcbh.org`) | Same pattern. |

After updating the Railway env var, Railway redeploys the backend. Verify by hitting `GET /api/v1/health` and confirming `providers.<key>: true` for the rotated key.

### 5.3 Datasource password

Deferred. Railway manages the Postgres password automatically via the cross-service `${{Postgres.PGPASSWORD}}` reference. No manual rotation procedure is needed at the Hobby plan tier. If the deployment moves off Railway-managed Postgres (e.g., to Supabase or Neon, or to a self-hosted Postgres on a different cloud), document the rotation procedure here.

---

## 6. Known gaps and follow-ups

### 6.1 Aspirational env vars in `08-deployment.md`

`.claude/rules/08-deployment.md` § "Optional / Phase-specific" lists env vars that the backend will eventually read, but does not yet — their introducing specs have not shipped. They are aspirational placeholders, not current requirements. Do NOT set them on any environment today; setting them has no effect because no code reads them.

When the introducing spec ships, the var migrates from this section into the main catalog (§ 3) as part of that spec's deliverables.

| Variable | Introducing spec | One-line purpose |
|---|---|---|
| `ADMIN_EMAIL` | Forums Wave (Phase 1 admin seeding) | Email of the seeded admin user (`is_admin=true`). |
| `ENCRYPTION_KEY` | Phase 3 journal encryption | App-layer encryption key for journal entries at rest. |
| `REDIS_URL` | Spec 5.6 | Redis connection URL for distributed rate limiting and caching. |
| `STORAGE_PROVIDER` | Spec 1.10e | Object storage provider selector (`r2` / `s3` / `minio`). |
| `STORAGE_ENDPOINT` | Spec 1.10e | S3-compatible endpoint URL. |
| `STORAGE_ACCESS_KEY` | Spec 1.10e | Object storage access key. |
| `STORAGE_SECRET_KEY` | Spec 1.10e | Object storage secret key. |
| `STORAGE_BUCKET` | Spec 1.10e | Object storage bucket name. |
| `SMTP_HOST` | Spec 15.1 | SMTP server for transactional and welcome emails. |
| `SMTP_PORT` | Spec 15.1 | SMTP port. |
| `SMTP_USER` | Spec 15.1 | SMTP username. |
| `SMTP_PASS` | Spec 15.1 | SMTP password. |
| `BACKUP_CRON` | Spec 1.10c | Cron expression for scheduled database backups. |
| `BACKUP_RETENTION_DAYS` | Spec 1.10c | Number of days to retain backups before purge. |
| `RATE_LIMIT_BACKEND` | Spec 5.6 | `redis` (multi-instance) vs `in-memory` (single-instance fallback) toggle. |

### 6.2 Postgres container vars (local dev only)

`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` in `docker-compose.yml:8-11` are not backend env vars — they are read by the Postgres container's entrypoint to initialize the database on first boot. They are listed here only so a reader scanning for "every env var related to local startup" sees them. The lockstep dependency on `application-dev.properties:50-52` is described in § 4.1.

### 6.3 `08-deployment.md` ships a `DATABASE_URL` reference that does not match reality

`08-deployment.md` § "Required (backend)" lists `DATABASE_URL=postgresql://...` as a required backend env var. The backend does NOT read `DATABASE_URL`; production uses three separate vars (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`). The `DATABASE_URL` line in `08-deployment.md` is pre-cutover documentation that became inaccurate after the cutover discovered Spring Boot's non-handling of Heroku-style URLs. Future cleanup: rewrite that section in `08-deployment.md` to match § 3.2 of this runbook. Out of scope for Spec 1.10i.

### 6.4 Railway auto-injects `DATABASE_URL`, but the backend does not use it

Railway's Postgres plugin injects `DATABASE_URL` into the backend service via Heroku convention. Spring Boot does NOT auto-parse Heroku-style `DATABASE_URL` — it requires explicit `SPRING_DATASOURCE_*` properties. The variable sits on the backend service unused. Future cleanup: harmless; can be deleted from the backend service's Variables tab in Railway, but not urgent. Does not affect any code path. Out of scope for Spec 1.10i.

### 6.5 `application-dev.properties:48-49` comment is stale

The comment block on lines 48-49 reads: "Local-only PostgreSQL via docker-compose. Credentials match the POSTGRES_* env vars in docker-compose.yml. Production datasource comes from `DATABASE_URL` (Spec 1.10b) and NEVER from this file." Actual behavior post-cutover: prod uses `SPRING_DATASOURCE_URL`, not `DATABASE_URL`. The comment is a pre-cutover breadcrumb that became inaccurate after the cutover discovered Spring Boot's `DATABASE_URL` non-handling. Future cleanup: rewrite the comment to reflect reality. Out of scope for Spec 1.10i.

### 6.6 `JWT_EXPIRATION` redundancy on Railway

`JWT_EXPIRATION=3600` is set on Railway per cutover checklist § 3. `application.properties:77` also defaults to `3600` via `${JWT_EXPIRATION:3600}`. Both values agree, but the Railway entry is redundant — removing it leaves the file default in place and the app behaves identically. Future cleanup: remove from the Railway Variables tab if a tidier env list is desired. No behavioral consequence either way. Out of scope for Spec 1.10i.

### 6.7 Future hardening: secrets management

When secrets management evolves beyond Railway env vars (e.g., to Doppler, HashiCorp Vault, or AWS Secrets Manager), the rotation procedure section (§ 5) becomes the canonical place to document the new workflow. Consider this section the starting checklist for that future migration:

- All secrets currently in Railway Variables must move to the new system.
- The `Sensitivity: secret` field on each catalog entry identifies which vars require migration (`JWT_SECRET`, `SPRING_DATASOURCE_PASSWORD`, all three upstream API keys).
- Rotation procedures must be re-validated against the new system's APIs.

---

## 7. Related documents

- `.claude/rules/03-backend-standards.md` — general backend conventions (CORS policy, error codes, controller structure).
- `.claude/rules/02-security.md` — secret-handling rules (CORS allow-list, X-Forwarded-For trust policy, JWT storage, password policy).
- `.claude/rules/08-deployment.md` — deployment + healthcheck conventions; lists aspirational env vars that `§ 6.1` of this runbook tracks separately.
- `_plans/forums/phase01-cutover-checklist.md` — canonical record of what was set on Railway at production cutover; the source of § 4.3 of this runbook.
- `backend/docs/api-error-codes.md` — sibling doc, established by Spec 1.10h.
- `backend/docs/runbook-security-headers.md` — sibling doc, established by Spec 1.10g.

---

## 8. Appendix — Tunable via env (relaxed binding), not currently set

The properties below are bound to typed configuration classes (`ProxyConfig`, `LoginRateLimitFilter`'s `@Value` constructor parameters) and overridable by env var via Spring Boot's relaxed binding (e.g., set `PROXY_RATE_LIMIT_REQUESTS_PER_MINUTE=150` to override the dev default). They are not currently set in any environment — defaults from `application*.properties` apply everywhere. Listed here so a future operator who wants to tune them without recompiling knows the env var name to use.

| Variable | Maps to property | Default | Why someone might tune it |
|---|---|---|---|
| `PROXY_RATE_LIMIT_REQUESTS_PER_MINUTE` | `proxy.rate-limit.requests-per-minute` | 60 (base / prod) / 120 (dev) | Loosen for load testing; tighten if upstream quotas are squeezed. |
| `PROXY_RATE_LIMIT_BURST_CAPACITY` | `proxy.rate-limit.burst-capacity` | 10 (base / prod) / 30 (dev) | Allow more concurrent requests per IP without permanent rate increase. |
| `PROXY_UPSTREAM_DEFAULT_TIMEOUT_MS` | `proxy.upstream.default-timeout-ms` | 10000 | Increase if a specific upstream is slow under load; decrease to fail fast for user-experience reasons. |
| `PROXY_MAX_REQUEST_BODY_BYTES` | `proxy.max-request-body-bytes` | 2097152 (2 MB) | Raise if a future upstream needs larger payloads (Places photo uploads, etc.). Note: incoming client bodies are still capped at 1 MB by `spring.servlet.multipart.max-request-size`. |
| `PROXY_TRUST_FORWARDED_HEADERS` | `proxy.trust-forwarded-headers` | false (dev) / true (prod) | Set true when adding a new trusted reverse proxy in front of the app; set false if the proxy is removed. See `02-security.md` § "X-Forwarded-For Trust Policy" for the threat model. |
| `AUTH_RATE_LIMIT_PER_EMAIL_CAPACITY` | `auth.rate-limit.per-email.capacity` | 5 | Loosen for legitimate users hitting the limit (typo-prone teammates); tighten under attack. |
| `AUTH_RATE_LIMIT_PER_EMAIL_WINDOW_MINUTES` | `auth.rate-limit.per-email.window-minutes` | 15 | Pair with capacity tuning. |
| `AUTH_RATE_LIMIT_PER_IP_CAPACITY` | `auth.rate-limit.per-ip.capacity` | 20 | Distributed-attack ceiling; should always exceed per-email capacity by ~4x. |
| `AUTH_RATE_LIMIT_PER_IP_WINDOW_MINUTES` | `auth.rate-limit.per-ip.window-minutes` | 15 | Pair with capacity tuning. |

These properties are also overridable via per-profile properties files; the env var route is preferred for production tuning because it requires no code change and no redeploy beyond the env-var-triggered restart.
