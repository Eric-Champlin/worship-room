## Testing Standards

### Frameworks
- **Frontend:** Vitest + React Testing Library
- **Backend:** JUnit 5 + Spring Boot Test + Testcontainers
- **E2E:** Playwright (visual verification via `/verify-with-playwright`)

### General Rules
- Run tests automatically after code changes
- Write tests alongside feature development
- Ensure ALL tests pass before commits: `./mvnw test && cd frontend && pnpm test`
- Aim for 80%+ code coverage on new code
- Focus on critical paths: auth, data persistence, crisis detection, reactive store subscriptions, API contracts, database migrations

---

## Backend Test Patterns (Forums Wave)

### Test Categories

**Unit tests** (`@ExtendWith(MockitoExtension.class)`):
- Service layer logic with mocked repositories
- DTO validation logic
- Utility functions
- Naming: `{ClassName}Test.java`

**Controller slice tests** (`@WebMvcTest` — no DB, no Testcontainers):
- For controllers whose services don't touch the database (proxy controllers that call external APIs — Gemini, Maps, FCBH — and have nothing to persist)
- Loads ONLY the web layer: `@WebMvcTest(FooController.class)` + `@Import(ProxyExceptionHandler.class)` if the shared advice is needed for error-shape assertions
- Service dependencies stubbed via `@MockBean`
- Fast (~500ms per class) — prefer over `@SpringBootTest` when no DB involvement is needed
- Naming: `{ControllerName}Test.java`
- Example: `GeminiControllerTest` (Spec 2) uses `@WebMvcTest(GeminiController.class)` + `@Import(ProxyExceptionHandler.class)` + `@MockBean private GeminiService geminiService`

**Integration tests** (`@SpringBootTest`):
- Full Spring context. For database-touching flows, add Testcontainers PostgreSQL + Redis per the Testcontainers Setup Pattern below.
- For proxy/external-API flows that don't touch the database, `@SpringBootTest` + `@AutoConfigureMockMvc` + `@MockBean` on the service is sufficient — no Testcontainers needed. Locks in the full filter chain (RequestIdFilter, RateLimitFilter, exception advices) end-to-end.
- End-to-end flows: HTTP request → filter chain → controller → service → repository → database (when relevant)
- Naming: `{ClassName}IntegrationTest.java`

**Repository tests** (`@DataJpaTest` + Testcontainers):
- JPA repository queries with real PostgreSQL
- Verify custom queries, constraints, indexes
- Naming: `{RepositoryName}Test.java`

**Controller tests** (`@WebMvcTest` or `MockMvc` in `@SpringBootTest`):
- HTTP status codes, response shapes, validation errors
- Auth gating (401 for unauthenticated, 403 for unauthorized)
- Rate limiting behavior (429 on excess requests)

**Liquibase migration tests:**
- Testcontainers integration test that applies all changesets and verifies table structure
- `LiquibaseSmokeTest.java` — runs on every test suite execution
- Verify columns, constraints, indexes exist after migration

### Testcontainers Setup Pattern (database-touching tests only)

**When to use:** Any test that exercises JPA repositories, Liquibase migrations, or SQL behavior. Not required for proxy controller/service tests that don't touch the database — those use `@WebMvcTest` or `@SpringBootTest` + `@MockBean` instead.

All backend integration tests that need a database extend `AbstractIntegrationTest` (created in Spec 1.7), which manages the Testcontainers PostgreSQL container. **Never create containers per-test-class — use the shared base class.**

```java
// AbstractIntegrationTest.java (created in Phase 1, Spec 1.7)
@Testcontainers
@SpringBootTest
public abstract class AbstractIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("worship_room_test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}

// Your integration test extends it:
class PostControllerIntegrationTest extends AbstractIntegrationTest {
    // tests here — container is already running
}
```

Repository slice tests extend a sibling base class, `AbstractDataJpaTest`, which carries `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = Replace.NONE)`. Both base classes share the same singleton PostgreSQL container via `TestContainers.POSTGRES` (started once per JVM run), so mixing integration tests and `@DataJpaTest` slice tests in the same suite incurs exactly one container start. Subclasses of either base may declare their own `@DynamicPropertySource` method (with a distinct name from the base's `registerBaseDatasourceProperties`) to register test-specific properties such as `jwt.secret` or `auth.rate-limit.*` — Spring aggregates across the inheritance hierarchy and both methods run, subclass values layered on top. The existing example above stays valid.

**CRITICAL: Never use H2 for testing.** H2 lies about PostgreSQL behavior (different SQL dialect, different constraint enforcement, different type handling). Testcontainers with real PostgreSQL is the only acceptable approach.

### API Contract Test Pattern
```java
@Test
void createPost_returnsStandardResponseShape() throws Exception {
    mockMvc.perform(post("/api/v1/posts")
            .header("Authorization", "Bearer " + validToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.id").exists())
        .andExpect(jsonPath("$.meta.requestId").exists());
}
```

### Test Data Patterns
- Use `@BeforeEach` to seed test data, `@AfterEach` or `@Transactional` to clean up
- SQL INSERT for repository tests (not JPA save — tests the actual migration schema)
- Use constants for test data, grouped by context, alphabetized within groups
- Test both happy paths AND error paths (invalid input, missing auth, rate limits)

### Drift Detection Tests (Decision 12)

Where the same logic exists in both frontend and backend (faith point calculation, badge eligibility, level thresholds, streak rules), a drift-detection test runs both implementations against shared test cases from `_test_fixtures/activity-engine-scenarios.json` and asserts parity. Neither implementation is the "reference" — they are peers that must agree. The test lives in the backend test suite and parses the frontend constants file. Target: under 30 seconds total. Runs in CI on every PR.

### Test Count Expectations (per spec size, from Decision 12)

| Spec Size | Expected Tests |
|---|---|
| Small (S) | 5–10 |
| Medium (M) | 10–20 |
| Large (L) | 20–40 |
| Extra-Large (XL) | 40+ |

Reactive store specs always include at least one cross-mount subscription test regardless of size.

---

## Frontend Test Patterns

### Vitest + React Testing Library
- Unit tests for utilities and hooks
- Component tests for UI behavior
- Integration tests for page flows
- **Reactive store consumer tests** (see below)

### Reactive Store Consumer Pattern (BB-45 anti-pattern)

Bible wave reactive stores (`useHighlightStore()`, `useBookmarkStore()`, etc.) require subscription tests — not just initial-render tests. The BB-45 anti-pattern: a component that mirrors the store into local `useState` looks correct initially but breaks when the store mutates from elsewhere.

**Required pattern:** Mutate the store AFTER the component mounts, then assert re-render:
```tsx
test('renders new cards added after mount', async () => {
  render(<MemorizationDeck />);
  expect(screen.queryByText(mockCard.text)).not.toBeInTheDocument();
  act(() => { addCard(mockCard); });
  expect(await screen.findByText(mockCard.text)).toBeInTheDocument();
});
```

**Forbidden:** Mocking the entire store (`vi.mock(...)`) bypasses the subscription mechanism.

**Stores requiring this pattern:** `useHighlightStore`, `useBookmarkStore`, `useNoteStore`, `useJournalStore`, `useChapterVisitStore`, `useMemorizationStore`, `useEchoStore`

---

## Definition of Done

Before considering any feature complete:

- [ ] Backend compiles cleanly: `./mvnw compile`
- [ ] Backend tests pass: `./mvnw test`
- [ ] Frontend builds cleanly: `pnpm build`
- [ ] Frontend tests pass: `pnpm test`
- [ ] Reactive store consumer tests added (if feature reads from a reactive store)
- [ ] API responses follow standard shape from `03-backend-standards.md`
- [ ] Liquibase changesets apply cleanly (verified via Testcontainers)
- [ ] Rate limiting + logging on write endpoints and AI endpoints
- [ ] Error states and loading states handled
- [ ] Accessibility basics (labels, keyboard nav, ARIA)
- [ ] Lighthouse Performance 90+, Accessibility 95+, Best Practices 90+, SEO 90+ on touched pages
- [ ] No secrets committed
- [ ] New localStorage keys documented in `11-local-storage-keys.md`
- [ ] Animation tokens imported from `frontend/src/constants/animation.ts` (not hardcoded)
- [ ] Master plan acceptance criteria checked off
- [ ] Documentation updated (if public-facing feature or API change)
- [ ] OpenAPI spec updated and frontend types regenerated (if API change)
