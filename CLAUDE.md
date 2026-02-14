# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support.

### Mission
Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, and community support.

### End Goal
Guide users toward curated Spotify worship playlists (integration method TBD).

## Planned Features

### Core Features
- **Mood Selector** - Users select their emotional state
- **Scripture Fade-ins** - Dynamic scripture display based on selected mood
- **Journaling Panel** - Personal reflection and writing space
- **Prayer Wall (Forum)** - Community prayer requests and support
- **Guided Meditations/Quiet Moments** - Peaceful spiritual exercises
- **Interactive Verse/Song of the Day** - Daily inspirational content

### AI-Powered Features
- Generated prayers based on user context
- Biblical encouragement and support
- Journaling prompts tailored to mood/situation
- Summarized Scripture reflections

### Locator Features
- **Church Locator** - Find nearby churches (Google Maps API)
- **Christian Counselor Locator** - Find professional support (Google Maps API)

### Future Integrations
- Spotify playlist integration (method TBD)
- User authentication and accounts
- Google Maps API for locators
- AI API (OpenAI, Anthropic, or similar)

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Routing**: React Router
- **Data Fetching**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge

### Backend
- **Framework**: Spring Boot 3.2.2
- **Language**: Java 21
- **Build**: Maven
- **API Style**: RESTful

### Database
- **Current**: Firebase (for initial development)
- **Future**: PostgreSQL (for production scale)

### Deployment
- **Target**: Netlify or Vercel (decision pending)
- **Containerization**: Docker (configured for local dev)

## Development Workflow

### Git Workflow
1. Create feature branch from main
2. Work on feature branch
3. Commit changes when ready
4. Push to remote
5. Squash merge into main

### Commit Guidelines
- **Always ask before creating commits**
- Use descriptive commit messages that explain "why" not just "what"
- Follow conventional commit format when possible (feat:, fix:, docs:, etc.)

### Testing
- **Run tests automatically** after code changes
- Write tests for new features
- Ensure tests pass before commits

### Code Organization
```
worship-room/
├── frontend/          # React TypeScript app
│   ├── src/
│   │   ├── api/      # API client layer
│   │   ├── components/ # Reusable components
│   │   │   └── ui/   # Base UI primitives
│   │   ├── lib/      # Utilities
│   │   ├── pages/    # Route pages
│   │   └── ...
│   └── ...
├── backend/          # Spring Boot API
│   └── src/main/java/com/example/worshiproom/
│       ├── config/   # Configuration classes
│       ├── controller/ # REST controllers
│       ├── service/  # Business logic (TBD)
│       ├── repository/ # Data access (TBD)
│       ├── model/    # Entities/DTOs (TBD)
│       └── ...
└── ...
```

## Coding Standards

### General Principles
- Write clean, readable code
- Prefer functional React components
- Use TypeScript types for everything
- Keep components focused and single-purpose

### Frontend
- Use `@/` path aliases for imports
- Export components from `components/index.ts`
- Use `cn()` utility for conditional classNames
- Validate forms with Zod schemas
- Use React Query for data fetching

### Backend
- Follow standard Spring Boot patterns
- Use service layer for business logic
- Use DTOs for API requests/responses
- Validate inputs with Spring Validation

### Naming (Evolving)
- Components: PascalCase
- Files: Match component name
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE

## Claude's Behavior Guidelines

### Autonomy Level
- **Be autonomous**: Implement features and fixes without asking for permission
- **Ask clarifying questions**: When requirements are unclear or ambiguous
- **Confirm understanding**: If a prompt doesn't make sense, ask before proceeding
- **Suggest alternatives**: When you see better approaches or potential issues

### Communication Style
- **Regular/conversational**: No need to be overly formal
- **Clear and concise**: Explain what you're doing and why
- **Proactive**: Point out potential issues or improvements

### What to Ask About
- Unclear feature requirements
- Ambiguous prompts
- Design decisions that significantly impact UX/architecture
- Breaking changes
- When multiple valid approaches exist

### What NOT to Ask About
- Standard code organization
- Common patterns and best practices
- Bug fixes and improvements
- Refactoring for clarity
- Adding tests

## Project Context

### Target Users
- **Primary**: Christians seeking emotional support and spiritual growth
- **Secondary**: Anyone looking for peace and encouragement
- **Accessibility**: Designed to be welcoming and easy to use for all ages

### Tone & Design Philosophy
- **Safe and peaceful**: Create a calming, non-judgmental space
- **Encouraging**: Focus on hope and healing
- **Accessible**: Simple, intuitive interface
- **Authentic**: Genuine spiritual support, not superficial

### Content Sensitivity
- Handle emotional/spiritual content with care
- Respect diverse Christian traditions
- Maintain appropriate tone for mental health topics
- Prayer wall requires moderation (future feature)

## API Integration Notes

### Google Maps API (Future)
- Church locator
- Counselor locator
- Consider rate limits and API costs

### AI API (Future)
- Prayer generation
- Scripture summarization
- Journaling prompts
- Biblical encouragement
- Choose provider based on quality and cost

### Spotify Integration (TBD)
- Explore Spotify Web API
- Consider embed player vs. deep linking
- Curated playlist management strategy

## Authentication (Future)

### Requirements
- User accounts for personalized experience
- Secure prayer wall posting
- Save journal entries privately
- Track mood history
- Bookmark favorite scriptures/prayers

### Considerations
- Firebase Auth or custom Spring Security
- Social login options (Google, Facebook)
- Privacy-first approach
- GDPR compliance for user data

## Development Commands

### Frontend
```bash
cd frontend
pnpm install      # Install dependencies
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Build for production
pnpm lint         # Lint code
pnpm format       # Format with Prettier
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
docker-compose up --build  # Start both services
docker-compose down        # Stop services
```

### Just (Task Runner)
```bash
just install         # Install frontend dependencies
just dev-frontend    # Start frontend
just dev-backend     # Start backend
just build           # Build both projects
```

## Current Status

### ✅ Completed
- Project scaffolding (frontend + backend)
- Development environment setup
- TailwindCSS configuration
- React Query setup
- Form validation (React Hook Form + Zod)
- Basic UI components (Button, Card, Layout)
- API client structure
- Docker configuration

### 🚧 In Progress
- Feature planning and design

### 📋 TODO
- Database setup (Firebase or PostgreSQL)
- User authentication
- Mood selector UI
- Scripture database/API
- AI integration
- Prayer wall/forum
- Spotify integration
- Google Maps integration
- Deployment setup

## Important Reminders

1. **Ask clarifying questions** - If a prompt is unclear, ask before coding
2. **Always confirm before commits** - Get approval for git commits
3. **Run tests automatically** - Ensure quality with every change
4. **Be autonomous** - Implement features without micro-management
5. **Feature branches** - Always work on feature branches, never directly on main

## Questions to Ask When Needed

- "Which mood options should the mood selector have?"
- "How should scripture be organized/categorized?"
- "What prayer wall moderation features are needed?"
- "Should journal entries be encrypted?"
- "Which Spotify playlists should be featured?"
- "What metadata should we store for each prayer request?"
- "How should the AI generate contextual prayers?"

---

**Remember**: This project touches on emotional and spiritual well-being. Approach features with empathy, respect, and care for users' experiences.
