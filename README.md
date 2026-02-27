# Worship Room

A Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, community prayer support, and worship music.

## Project Structure

```
worship-room/
├── frontend/          # React 18 + TypeScript + Vite + TailwindCSS
├── backend/           # Spring Boot 3 + Maven + Java 21
├── _specs/            # Feature spec files (product requirements)
├── _plans/            # Implementation plan files (technical plans)
├── .claude/           # Claude Code rules and skills
├── justfile           # Task runner commands
├── docker-compose.yml # Docker orchestration
├── CLAUDE.md          # Project guide and conventions
└── README.md
```

## Prerequisites

- **Node.js** 18+ and **pnpm** (for frontend)
- **Java 21** (for backend)
- **Maven** (wrapper included)
- **Just** (optional, for task runner) - install via `brew install just`
- **Docker** (optional, for containerized setup)

## Quick Start

### Option 1: Using Just (Recommended)

```bash
# Install frontend dependencies
cd frontend && pnpm install && cd ..

# Terminal 1 - Start backend
just dev-backend

# Terminal 2 - Start frontend
just dev-frontend
```

### Option 2: Manual Commands

```bash
# Terminal 1 - Backend (http://localhost:8080)
cd backend
./mvnw spring-boot:run

# Terminal 2 - Frontend (http://localhost:5173)
cd frontend
pnpm install
pnpm dev
```

### Option 3: Docker Compose

```bash
# Build and start both services
docker-compose up --build

# Access:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8080
```

## Available Commands (Just)

```bash
just install         # Install all dependencies
just dev-frontend    # Run frontend dev server
just dev-backend     # Run backend dev server
just build           # Build both projects
just lint-frontend   # Lint frontend code
just format-frontend # Format frontend code
just clean           # Clean build artifacts
just docker-up       # Start with Docker
just docker-down     # Stop Docker containers
just help            # Show all commands
```

## API Endpoints

- `GET /api/health` → `{ "status": "ok" }`
- `GET /api/hello` → `{ "message": "Hello" }`
- `GET /actuator/health` → Spring Boot Actuator health check

## Testing the Setup

1. Start both services (backend on port 8080, frontend on port 5173)
2. Open http://localhost:5173 in your browser
3. Click "Check Backend Health" link
4. You should see successful responses from both `/api/health` and `/api/hello` endpoints

## Implemented Features

### Landing Page (Complete)
- Hero section with typewriter input and mood-to-scripture flow
- 6-step Journey to Healing timeline
- Growth Teasers section (3 blurred preview cards)
- Starting Point Quiz (5-question recommendation engine)
- Full footer with crisis resources

### Prayer Wall (Frontend Complete — Mock Data)
- Community prayer feed with inline composer and inline comments
- Prayer cards with avatars, "Show more" in-place expand, interaction bar
- Share dropdown (copy link, email, SMS, Facebook, X)
- Public user profiles with tabs (Prayers, Replies, Reactions)
- Private dashboard with tabs (My Prayers, Comments, Bookmarks, Reactions, Settings)
- Auth modal for login/register gates
- Report dialog, answered prayer badges, delete confirmation
- Client-side crisis keyword detection on user input
- 274 frontend tests passing

### Other Pages
- Daily page (Verse & Song of the Day — placeholder)
- Insights page (mood analytics — placeholder)

## Frontend Stack

- React 18 + TypeScript (strict) + Vite
- TailwindCSS for styling
- React Router for navigation
- Vitest + React Testing Library for tests
- ESLint + Prettier configured
- Lucide React for icons

## Backend Stack

- Java 21 + Spring Boot 3.5
- Maven build system
- CORS configured for frontend origin
- Actuator for health checks
- Validation support built-in
- Database, auth, AI integration, and remaining backend features are not yet implemented

## Development

### Frontend

```bash
cd frontend
pnpm dev      # Start dev server
pnpm build    # Build for production
pnpm test     # Run Vitest tests
pnpm lint     # Run ESLint
pnpm format   # Format with Prettier
```

### Backend

```bash
cd backend
./mvnw spring-boot:run    # Start dev server
./mvnw clean package      # Build JAR
./mvnw test               # Run tests
./mvnw clean              # Clean build directory
```

## Environment Variables

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:8080
```

### Backend (application.properties)

```properties
server.port=8080
spring.application.name=worship-room-backend
```

## Troubleshooting

**Frontend can't connect to backend:**
- Ensure backend is running on port 8080
- Check CORS configuration in `backend/src/main/java/com/example/worshiproom/config/CorsConfig.java`
- Verify VITE_API_BASE_URL in frontend/.env

**Backend won't start:**
- Ensure Java 21 is installed: `java -version`
- Check if port 8080 is already in use: `lsof -i :8080`
- Verify JAVA_HOME is set correctly

**Maven wrapper issues:**
- The mvnw script will auto-download Maven on first run
- Ensure execute permissions: `chmod +x mvnw`

## License

MIT
