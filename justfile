# Worship Room task runner

# Install all dependencies
install:
    @echo "Installing frontend dependencies..."
    cd frontend && pnpm install
    @echo "Backend uses Maven wrapper - no install needed"

# Run frontend dev server
dev-frontend:
    cd frontend && pnpm dev

# Run backend dev server
dev-backend:
    cd backend && ./mvnw spring-boot:run

# Run both frontend and backend in parallel (requires 'just' with --jobs flag or use two terminals)
dev:
    @echo "Start both servers in separate terminals:"
    @echo "  Terminal 1: just dev-backend"
    @echo "  Terminal 2: just dev-frontend"
    @echo ""
    @echo "Or use: just dev-backend & just dev-frontend"

# Build frontend for production
build-frontend:
    cd frontend && pnpm build

# Build backend JAR
build-backend:
    cd backend && ./mvnw clean package

# Build both
build: build-frontend build-backend

# Lint frontend code
lint-frontend:
    cd frontend && pnpm lint

# Format frontend code
format-frontend:
    cd frontend && pnpm format

# Clean build artifacts
clean:
    rm -rf frontend/dist frontend/node_modules
    cd backend && ./mvnw clean

# Start with Docker Compose
docker-up:
    docker-compose up -d

# Stop Docker Compose
docker-down:
    docker-compose down

# Show help
help:
    @just --list
