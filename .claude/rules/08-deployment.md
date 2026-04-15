## Deployment

### Deployment
- **Frontend**: Vercel (React app with CI/CD)
- **Backend**: Railway, Render, or Fly.io (Spring Boot API)
- **Database**: Railway PostgreSQL, Supabase, or Neon
- **Containerization**: Docker (configured for local dev)
- **CI/CD**: GitHub Actions (integrated with deployment platforms)
- **Error Tracking**: Sentry or Rollbar
- **Monitoring**: Vercel Analytics (frontend), Spring Boot Actuator (backend)

## Development Commands

### Frontend
```bash
cd frontend
pnpm install      # Install dependencies
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Build for production
pnpm lint         # Lint code
pnpm format       # Format with Prettier
pnpm test         # Run Vitest tests
pnpm test:watch   # Run tests in watch mode
```

### Backend
```bash
cd backend
./mvnw spring-boot:run  # Start dev server (http://localhost:8080)
./mvnw test             # Run tests
./mvnw clean package    # Build JAR
```

### Docker
```bash
docker-compose up --build  # Start both services + PostgreSQL
docker-compose down        # Stop services
docker-compose logs -f     # View logs
```

### Just (Task Runner)
```bash
just install         # Install frontend dependencies
just dev-frontend    # Start frontend
just dev-backend     # Start backend
just build           # Build both projects
just test            # Run all tests
```

## Environment Variables

**Standard Environment Variable Naming**:
```bash
# AI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...
JWT_EXPIRATION=3600

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
ADMIN_EMAIL=admin@example.com

# Maps
GOOGLE_MAPS_API_KEY=...

# Encryption
ENCRYPTION_KEY=...
ENCRYPTION_SALT=...

# Rate Limiting
RATE_LIMIT_AI_REQUESTS_PER_HOUR=20
RATE_LIMIT_PRAYER_POSTS_PER_DAY=5

# Environment
NODE_ENV=development|production
SPRING_PROFILES_ACTIVE=dev|prod
```

### Deployment Strategy
- Deploy frontend to Vercel when MVP features are ready
- Deploy backend to Railway, Render, or Fly.io
- Deploy database to Railway PostgreSQL, Supabase, or Neon
- Use preview deployments for feature branches
- Set up CI/CD with GitHub Actions
- Environment variables for API keys (never commit keys)
- Monitor performance with Vercel Analytics (frontend), Spring Boot Actuator (backend)
- Error tracking with Sentry or Rollbar

### BB-26 → BB-39 PWA service worker follow-up

When BB-39's PWA service worker is next extended to handle audio assets, it MUST exclude FCBH CloudFront audio URLs from runtime caching.

- **URL pattern to exclude:** any URL matching `*.cloudfront.net/audio/*` that originates from a DBP request (the exact host observed in recon is `d1gd73roq7kqw6.cloudfront.net`, but CloudFront distributions may rotate — match by path, not host).
- **Where to add the rule:** `frontend/vite.config.ts` → `VitePWA` → `injectManifest` → `globIgnores` (for bundled assets) AND a runtime caching strategy that explicitly skips the pattern (for network-fetched URLs).
- **Reason:** DBP license terms state: "not store content for offline use unless it is explicitly marked as allowed." FCBH audio files are not marked as cacheable; persisting them to a service worker cache violates the license.
- **Why BB-39's problem, not BB-26's:** BB-26 doesn't touch the service worker config. BB-26's audio cache layer (`bb26-v1:audioBibles`) stores only metadata (the bibles list), not audio binaries. Per-chapter URLs are held in memory only and die with the page. Runtime audio requests go through Howler's `<audio>` element and would only be cached if the service worker runtime caching rule picks them up — which becomes a live concern as soon as BB-39's PWA strategy is extended to cover audio-tier runtime caching.
- **Created by:** BB-26 (`_specs/bb-26-fcbh-audio-bible-integration.md` + recon at `_plans/recon/bb26-audio-foundation.md`).
- **Verification:** After implementing the exclusion, load a chapter while online, go offline, reload, and confirm the audio file fails to load (rather than replaying from cache). The player's error state should surface "Connection problem. Check your network and try again."
