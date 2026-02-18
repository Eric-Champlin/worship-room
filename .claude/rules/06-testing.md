## Testing

### Testing
- **Run tests automatically** after code changes
- Write tests for new features
- Ensure tests pass before commits
- **Frontend**: Vitest + React Testing Library
  - Unit tests for utilities and hooks
  - Component tests for UI components
  - Integration tests for page flows
- **Backend**: JUnit 5 + Spring Boot Test + Testcontainers
  - Unit tests for services
  - Integration tests for controllers
  - Repository tests with Testcontainers PostgreSQL
  - AI safety tests (self-harm detection, content moderation)

### Testing Strategy
- Write tests alongside feature development
- Aim for 80%+ code coverage
- Focus on critical paths (auth, data saving, AI integrations, **AI safety**)
- Use Testcontainers for realistic database tests
- Manual testing for UX flows
- **AI Safety Testing**:
  - Test self-harm keyword detection
  - Test crisis resource display
  - Test AI content moderation
  - Test inappropriate input handling
