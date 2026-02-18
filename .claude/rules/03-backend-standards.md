---
paths: ["backend/**"]
---

## Tech Stack

### Backend
- **Framework**: Spring Boot 3.x (pin exact version in pom.xml, currently 3.2.2)
- **Language**: Java 21
- **Build**: Maven
- **API Style**: RESTful
- **Security**: Spring Security + JWT
- **Testing**: JUnit 5 + Spring Boot Test + Testcontainers (for PostgreSQL integration tests)
- **Email**: Spring Mail (SMTP for admin notifications)
- **Logging**: Logback with JSON structured logging
- **Monitoring**: Spring Boot Actuator + error tracking (Sentry or similar)

### External APIs
- **AI**: OpenAI API (default model: `gpt-4o`, configurable via `OPENAI_MODEL` env var for scripture matching, prayer generation, reflections, prompts, moderation)
- **Maps**: Google Maps Places API (church/counselor locator)
- **Music**: Spotify Embed Player + Deep Link (Spotify Web API only if personalization/playback control is needed later)

## API Contract

### REST API Conventions
- **Base Path**: `/api`
- **Authentication**: `Authorization: Bearer <JWT_token>` header for protected endpoints
- **Content Type**: `application/json` for request/response bodies
- **Response Headers**:
  - `X-Request-Id`: Unique identifier for every request/response (for tracking and debugging)
  - **Rate Limiting Headers** (on all responses):
    - `X-RateLimit-Limit`: Maximum requests allowed in window (e.g., "20")
    - `X-RateLimit-Remaining`: Requests remaining in current window (e.g., "15")
    - `X-RateLimit-Reset`: Unix timestamp when limit resets (e.g., "1708095600")
  - **On 429 Too Many Requests**:
    - `Retry-After`: Seconds until user can retry (e.g., "3600" for 1 hour)
- **Standard Error Response Shape**:
  ```json
  {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "requestId": "unique-request-id-for-tracking",
    "timestamp": "2026-02-16T10:30:00Z"
  }
  ```
- **Standard Success Response Shape**:
  ```json
  {
    "data": { ... },
    "meta": {
      "requestId": "unique-request-id"
    }
  }
  ```
- **Pagination** (when needed):
  - Query params: `?page=1&limit=20`
  - Response includes: `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 100 } }`
- **HTTP Status Codes**:
  - `200 OK` - Success
  - `201 Created` - Resource created
  - `400 Bad Request` - Invalid input
  - `401 Unauthorized` - Missing/invalid auth token
  - `403 Forbidden` - Insufficient permissions
  - `404 Not Found` - Resource not found
  - `429 Too Many Requests` - Rate limit exceeded
  - `500 Internal Server Error` - Server error

## Coding Standards

### Backend
- Follow standard Spring Boot patterns
- Use service layer for business logic
- Use DTOs for API requests/responses
- Validate inputs with Spring Validation (`@Valid`, `@NotNull`, etc.)
- Keep controllers thin (delegate to services)
- Use constructor injection for dependencies
- Follow RESTful conventions for endpoints
- Use meaningful HTTP status codes
- **AI Safety**: Always check AI inputs/outputs for safety violations

### Admin Configuration
- **Admin User**: Seed database with admin user using email from `ADMIN_EMAIL` env var, set `is_admin = true`
- **Admin Access**: Backend checks `user.is_admin` boolean (NOT hardcoded email)
- **Email Notifications**: Send flagged prayer posts to admin email from `ADMIN_EMAIL` env var via SMTP
- **Moderation**: Simple CRUD interface at `/admin/prayer-wall`
- **Audit Logging**: All admin actions logged to `admin_audit_log` table

### AI Integration (OpenAI)
- **Model**: Default `gpt-4o` (configurable via `OPENAI_MODEL` env var; alternative: `gpt-4o-mini` for cost savings)
- **Use Cases**:
  - Scripture matching from text input
  - Scripture reflection generation (2-3 sentences)
  - Prayer generation
  - Journaling prompts
  - Mood insights and trends
  - Prayer wall auto-moderation (profanity, abuse, spam detection)
  - **Self-harm detection** (crisis intervention)
- **API Key**: Store in environment variables (`.env` for local, platform env vars for production)
- **Rate Limiting**: 20 AI requests per hour per user (backend enforcement)
- **Safety**: Always check inputs for crisis keywords, inappropriate content

### Google Maps Integration
- **API**: Google Maps Places API
- **Use Cases**:
  - Church locator at `/churches`
  - Christian counselor locator at `/counselors`
- **Implementation**: Real-time search (no database caching)
- **API Key**: Store in environment variables
