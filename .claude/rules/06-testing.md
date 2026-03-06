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

### Definition of Done (For Any Feature)

Before considering a feature "complete", ensure:

- UI implemented + responsive (mobile, tablet, desktop)
- Backend endpoint implemented (if needed)
- Tests added/updated (frontend + backend)
- Rate limiting + logging on AI endpoints (if applicable)
- Error states + loading states handled
- Accessibility basics (labels, keyboard nav, ARIA where needed)
- No secrets committed (API keys, passwords, etc.)
- AI safety checks implemented (if user input involved)
- Audio playback tested if applicable (TTS, ambient sounds)
- Documentation updated (if public-facing feature or API change)
