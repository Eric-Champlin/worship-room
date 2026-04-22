# Worship Room
 
A Christian emotional healing and worship web application — a safe, peaceful online space where users find comfort, guidance, and spiritual support through AI-powered prayer, Scripture, journaling, meditation, worship music, and community support.
 
Free, ad-free, and privacy-respecting in a market where competitors charge $40–$100/yr.
 
## Documentation
 
- **[CLAUDE.md](./CLAUDE.md)** — canonical project guide (feature summary, implementation phases, build health, working guidelines)
- **[.claude/rules/](./.claude/rules/)** — modular conventions (AI safety, security, design system, UX flows, backend/frontend/database standards, logging, deployment, testing, localStorage keys, project reference)
- **[_forums_master_plan/round3-master-plan.md](./_forums_master_plan/round3-master-plan.md)** — Forums Wave master plan (v2.8, 156 specs across 19 phases)
- **[_protocol/](./_protocol/)** — deep code health review protocols (run between major waves; produces consolidated reports in `_reports/`)
 
If anything in this README disagrees with CLAUDE.md or the rule files, the rule files win.
 
## Project Structure
 
```
worship-room/
├── frontend/       # React 18 + TypeScript + Vite + TailwindCSS
├── backend/        # Spring Boot 3 + Maven + Java 21 (proxy layer shipped; Forums Wave extends)
├── _specs/         # Feature spec files
├── _plans/         # Implementation plan files (recon artifacts in _plans/recon/)
├── _protocol/      # Deep code health review protocols (00-99)
├── _reports/       # Generated deep review reports (gitignored; created on demand)
├── .claude/        # Claude Code rules, skills, and agents
├── CLAUDE.md       # Project guide (read this first)
└── README.md       # This file
```
 
## Tech Stack
 
**Frontend:** React 18, TypeScript (strict), Vite, TailwindCSS, React Router, Lucide React, Recharts, Leaflet, react-helmet-async, vite-plugin-pwa. Tested with Vitest + React Testing Library + Playwright.
 
**Backend:** Spring Boot 3, Java 21, Maven, Spring Security + JWT (Forums Wave Phase 1), PostgreSQL + Liquibase (Forums Wave Phase 1). Proxy layer (`com.example.worshiproom.proxy.*`) already ships: three services (Gemini, Google Maps, FCBH) wrap external APIs behind `/api/v1/proxy/*` with bucket4j rate limiting, request-ID propagation, and a PII-scrubbing exception handler. ~280 backend tests.
 
## Prerequisites
 
- Node.js 18+ and pnpm
- Java 21 (backend only)
- Just task runner (optional): `brew install just`
- Docker (optional)
 
## Quick Start
 
```bash
# Frontend (http://localhost:5173)
cd frontend
pnpm install
pnpm dev
 
# Backend (http://localhost:8080) — optional, scaffold only
cd backend
./mvnw spring-boot:run
```
 
Or with Just:
 
```bash
just install
just dev-frontend    # terminal 1
just dev-backend     # terminal 2
```
 
## Common Commands
 
```bash
# Frontend
cd frontend
pnpm dev          # dev server
pnpm build        # production build
pnpm test         # Vitest
pnpm lint         # ESLint
pnpm format       # Prettier
 
# Backend
cd backend
./mvnw spring-boot:run
./mvnw test
 
# Docker
docker-compose up --build
```
 
## Deep Code Health Reviews
 
Between major feature waves or quarterly, run the deep review protocols in `_protocol/`. Each protocol runs as a separate Claude Code session and appends to a consolidated dated report at `_reports/deep-review-YYYY-MM-DD.md`. See `CLAUDE.md` § "Deep Code Health Reviews" for the workflow.
 
## Environment Variables
 
**Frontend (`frontend/.env`)**
```env
VITE_API_BASE_URL=http://localhost:8080
```
 
See [.claude/rules/08-deployment.md](./.claude/rules/08-deployment.md) for the full environment variable list (Gemini/Maps/FCBH API keys for the proxy layer, SMTP for Forums Wave email, JWT secret for auth, encryption keys, Redis URL, feature flags, and rate-limit tuning).
 
## Troubleshooting
 
- **Port conflicts:** Frontend uses 5173, backend uses 8080. `lsof -i :5173` / `lsof -i :8080` to check.
- **Maven wrapper:** `chmod +x backend/mvnw` if the wrapper lacks execute permissions.
 
## License
 
MIT