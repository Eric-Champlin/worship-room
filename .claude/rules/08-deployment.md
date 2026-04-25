## Deployment

### Platform Targets (Spec 1.10b)
- **Frontend:** Vercel (React/Vite with CI/CD)
- **Backend:** Railway or Render (Spring Boot JAR) — decision finalized in Spec 1.10b
- **Database:** Railway PostgreSQL, Supabase, or Neon — decision finalized in Spec 1.10b
- **Redis:** Upstash (serverless Redis) or Railway Redis — for rate limiting and caching (Spec 5.6)
- **Object Storage:** Cloudflare R2 (S3-compatible) — for backups and user uploads (Spec 1.10e)
- **Email:** Postmark, SendGrid, or Resend — for transactional and welcome emails (Spec 15.1)
- **Error Tracking:** Sentry (Spec 1.10d)
- **Uptime Monitoring:** UptimeRobot or Better Stack (Spec 1.10d)
- **Containerization:** Docker Compose for local dev (PostgreSQL + Redis + backend)

### Deploy Pipeline
1. Push to feature branch → CI runs `./mvnw test` + `pnpm test` + `pnpm build`
2. Merge to main → auto-deploy frontend to Vercel, backend to Railway/Render
3. **Liquibase migrations run automatically on backend startup** — Spring Boot applies pending changesets before the app accepts traffic
4. Post-deploy health check: `GET /api/v1/health` returns 200

### Railway Health Checks (Spec 1.10j)
- Railway uses `/actuator/health/readiness` as its platform-level healthcheck (configured in `railway.toml` at repo root, key `[deploy].healthcheckPath`).
- Readiness flips UP only after the Spring `ApplicationContext` finishes refreshing — which happens AFTER Liquibase completes. This prevents Railway from routing user traffic to a process whose port is bound but whose JPA layer isn't ready yet.
- Liveness (`/actuator/health/liveness`) is the sibling probe Spring Boot exposes. Worship Room never marks itself liveness=DOWN today (no scenarios where the JVM is alive but the app is permanently wedged), so Railway's restart trigger relies on readiness flapping past `restartPolicyMaxRetries`.
- Both probes are public (no JWT required — `PublicPaths.PATTERNS` lists them explicitly) and carry the six security headers from Spec 1.10g.
- Probes are NOT rate-limited. `RateLimitFilter` only scopes to `/api/v1/proxy/**`; Railway can poll the probes at platform cadence without bucket exhaustion.

### Liquibase in Deploy
- Changesets are applied automatically on Spring Boot startup (`spring.liquibase.enabled=true`)
- **Zero-downtime requirement:** Changesets must be backward-compatible (no DROP COLUMN on active columns, no NOT NULL on existing columns without defaults)
- **Rollback:** Each changeset has a rollback block; manual rollback via `liquibase rollback` if needed
- **Changeset ordering:** Alphabetical by filename — the `YYYY-MM-DD-NNN` prefix ensures correct order

## Development Commands

### Frontend
```bash
cd frontend
pnpm install     # Install dependencies
pnpm dev         # Start dev server (http://localhost:5173)
pnpm build       # Build for production
pnpm lint        # Lint code
pnpm format      # Format with Prettier
pnpm test        # Run Vitest tests
pnpm test:watch  # Run tests in watch mode
```

### Backend
```bash
cd backend
./mvnw spring-boot:run   # Start dev server (http://localhost:8080)
./mvnw test              # Run all tests (includes Testcontainers)
./mvnw compile           # Compile only (fast check)
./mvnw clean package     # Build JAR for deployment
```

### Docker (local dev)
```bash
docker-compose up -d     # Start PostgreSQL + Redis (detached)
docker-compose down      # Stop services
docker-compose logs -f   # View logs
```

### Just (Task Runner)
```bash
just install         # Install frontend dependencies
just dev-frontend    # Start frontend
just dev-backend     # Start backend
just build           # Build both projects
just test            # Run all tests (frontend + backend)
```

## Environment Variables

The canonical reference for every env var the backend actually reads — with required-in (dev / test / prod), sensitivity (secret / config), where in code each is consumed, and behavior-if-absent per environment — lives at `backend/docs/env-vars-runbook.md` (Spec 1.10i). It also covers secret rotation procedures, the production Railway provisioning matrix, and known drift between the lists below and current reality (notably: `DATABASE_URL` is shown below but the backend actually reads `SPRING_DATASOURCE_URL`; several "Optional / Phase-specific" vars below are aspirational placeholders for specs that have not shipped). **Consult the runbook when provisioning a new environment, debugging a startup failure, rotating a secret, or before introducing a new env var in any new spec.** Treat the quick-reference lists below as illustrative — the runbook is the source of truth.

### Required (backend)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/worship_room

# Auth
JWT_SECRET=your-256-bit-secret-here
JWT_EXPIRATION=3600

# Admin
ADMIN_EMAIL=admin@worshiproom.com

# Encryption (journal entries)
ENCRYPTION_KEY=your-encryption-key
```

### Required (frontend)
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### Optional / Phase-specific
```bash
# Key Protection wave (Specs 1–4 of ai-proxy-*; all merged)
# These are loaded from backend/.env.local via docker-compose env_file directive
# (with required: false, so the backend boots without them and /api/v1/health
# reports providers.* as false). In production, your hosting platform
# (Railway/Render) injects them directly.
#
# The Key Protection Wave is closed: ALL three VITE_*_API_KEY variables are
# REMOVED from the frontend. GEMINI_API_KEY (Spec 2), GOOGLE_MAPS_API_KEY
# (Spec 3), and FCBH_API_KEY (Spec 4) are sole sources of truth on the backend.
# If you find VITE_GEMINI_API_KEY, VITE_GOOGLE_MAPS_API_KEY, or VITE_FCBH_API_KEY
# referenced anywhere in the frontend post-merge, that's a regression — the
# variables were deleted from frontend/.env.local and the helper functions that
# read them were removed from frontend/src/lib/env.ts.
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
FCBH_API_KEY=your-fcbh-api-key-here

# Rate-limit + XFF tuning (Spec 1 defaults; override per deploy if needed)
# proxy.rate-limit.requests-per-minute=60
# proxy.rate-limit.burst-capacity=10
# proxy.trust-forwarded-headers=true   # REQUIRED in prod (Railway/Vercel sanitize XFF)

# Redis (Spec 5.6 — omit for in-memory Caffeine fallback; required for multi-instance deploys)
REDIS_URL=redis://localhost:6379

# Sentry (Spec 1.10d — omit to disable)
SENTRY_DSN=https://...@sentry.io/...

# Object Storage (Spec 1.10e)
STORAGE_PROVIDER=r2|s3|minio
STORAGE_ENDPOINT=https://...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=worship-room-uploads

# Email (Spec 15.1)
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Backup (Spec 1.10c)
BACKUP_CRON=0 3 * * *
BACKUP_RETENTION_DAYS=30

# Feature Flags (dual-write migration)
VITE_USE_BACKEND_AUTH=false
VITE_USE_BACKEND_ACTIVITY=false
VITE_USE_BACKEND_FRIENDS=false
VITE_USE_BACKEND_SOCIAL=false
VITE_USE_BACKEND_PRAYER_WALL=false

# Rate Limiting (configurable, not hardcoded)
RATE_LIMIT_BACKEND=redis|in-memory
```
