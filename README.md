# Worship Room

A full-stack web application for worship room management.

## Project Structure

```
worship-room/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Spring Boot + Maven + Java 21
├── justfile           # Task runner commands
├── docker-compose.yml # Docker orchestration
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

## Frontend Features

- ⚡ Vite for fast development
- 🎯 TypeScript with strict mode
- 🧭 React Router for navigation
- 🔌 Typed API client layer
- 🎨 ESLint + Prettier configured
- 🌍 Environment variable support

## Backend Features

- ☕ Java 21 + Spring Boot 3.2
- 📦 Maven build system
- 🌐 CORS configured for frontend origin
- 📊 Actuator for health checks
- ✅ Validation support built-in

## Development

### Frontend

```bash
cd frontend
pnpm dev      # Start dev server
pnpm build    # Build for production
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
