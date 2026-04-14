## Testing
 
### Testing
- **Run tests automatically** after code changes
- Write tests for new features
- Ensure tests pass before commits
- **Frontend**: Vitest + React Testing Library
  - Unit tests for utilities and hooks
  - Component tests for UI components
  - Integration tests for page flows
  - **Reactive store consumer tests** — see "Reactive Store Consumer Pattern" below
- **Backend**: JUnit 5 + Spring Boot Test + Testcontainers
  - Unit tests for services
  - Integration tests for controllers
  - Repository tests with Testcontainers PostgreSQL
  - AI safety tests (self-harm detection, content moderation)
 
### Testing Strategy
- Write tests alongside feature development
- Aim for 80%+ code coverage
- Focus on critical paths (auth, data saving, AI integrations, **AI safety**, **reactive store subscription correctness**)
- Use Testcontainers for realistic database tests
- Manual testing for UX flows
- **AI Safety Testing**:
  - Test self-harm keyword detection
  - Test crisis resource display
  - Test AI content moderation
  - Test inappropriate input handling
 
### Reactive Store Consumer Pattern (BB-45 anti-pattern)
 
The Bible wave introduced reactive stores for personal-layer features (highlights, bookmarks, notes, journal entries, chapter visits, memorization cards, echo dismissals). Each store exposes a custom hook (`useHighlightStore()`, `useBookmarkStore()`, etc.) that internally subscribes to changes via `useSyncExternalStore`. Components consuming these stores **must use the hook** so they re-render when the store mutates from any surface.
 
The BB-45 implementation surfaced the canonical anti-pattern: a component that mirrors the store into local `useState` looks correct on initial render but silently breaks when the store mutates from elsewhere. A memorization card added in BibleReader will not appear in the My Bible feed if the My Bible component uses `useState(getAllMemorizationCards())` instead of `useMemorizationStore()`. **This bug class only manifests in real cross-surface usage and slips past tests that only check initial render.**
 
#### Required test pattern for reactive store consumers
 
Components that read from a reactive store must have a test that verifies subscription behavior, not just initial render. The pattern:
 
```tsx
// Bad — only verifies initial render
test('renders memorization cards', () => {
  addCard(mockCard);
  render(<MemorizationDeck />);
  expect(screen.getByText(mockCard.text)).toBeInTheDocument();
});
 
// Good — verifies subscription
test('renders new memorization cards added after mount', async () => {
  render(<MemorizationDeck />);
  expect(screen.queryByText(mockCard.text)).not.toBeInTheDocument();
 
  // Mutate the store from outside the component
  act(() => {
    addCard(mockCard);
  });
 
  // Component should re-render with the new card
  expect(await screen.findByText(mockCard.text)).toBeInTheDocument();
});
```
 
The key element is mutating the store **after** the component has mounted, then asserting that the component re-renders. A test that only adds cards before render will pass even if the component uses the broken `useState(getAllX())` pattern.
 
#### Forbidden test patterns
 
```tsx
// FORBIDDEN — mocks the entire store and bypasses the subscription mechanism
vi.mock('@/lib/memorize/store', () => ({
  getAllMemorizationCards: () => mockCards,
  useMemorizationStore: () => mockCards,  // also wrong
}));
```
 
Mocking the store means the test no longer exercises the subscription path. Use the real store and the real hook in tests; populate it via the store's mutation methods, not via mocks.
 
#### Stores requiring this test pattern
 
| Store hook              | Spec   | Components to test                                    |
| ----------------------- | ------ | ----------------------------------------------------- |
| `useHighlightStore()`   | BB-7   | BibleReader, MyBible activity feed, ReadingHeatmap (indirect) |
| `useBookmarkStore()`    | BB-7   | BibleReader, MyBible activity feed                    |
| `useNoteStore()`        | BB-8   | BibleReader notes drawer, MyBible activity feed       |
| `useJournalStore()`     | BB-11b | BibleReader journal drawer, MyBible activity feed     |
| `useChapterVisitStore()` | BB-43 | ReadingHeatmap, BibleProgressMap                      |
| `useMemorizationStore()` | BB-45 | MemorizationDeck, BibleReader (verse menu state)      |
| `useEchoStore()`        | BB-46  | EchoCard, echo selection engine                       |
 
Any new component that reads from one of these stores must have at least one subscription test. The deep review protocol at `_protocol/02-prompt-test-suite-audit.md` checks for this in failure category 3f.
 
### Definition of Done (For Any Feature)
 
Before considering a feature "complete", ensure:
 
- UI implemented + responsive (mobile, tablet, desktop)
- Backend endpoint implemented (if needed)
- Tests added/updated (frontend + backend)
- **Reactive store consumer tests added if the feature reads from a reactive store** (see pattern above)
- Rate limiting + logging on AI endpoints (if applicable)
- Error states + loading states handled
- Accessibility basics (labels, keyboard nav, ARIA where needed)
- **Lighthouse targets met** on any page the feature touches:
  - **Performance: 90+** (BB-36 baseline)
  - **Accessibility: 95+** (BB-35 baseline)
  - **Best Practices: 90+**
  - **SEO: 90+** (BB-40 baseline)
- No secrets committed (API keys, passwords, etc.)
- AI safety checks implemented (if user input involved)
- Audio playback tested if applicable (TTS, ambient sounds)
- New localStorage keys documented in `11-local-storage-keys.md`
- Animation durations and easings imported from `frontend/src/constants/animation.ts` (BB-33), not hardcoded
- Documentation updated (if public-facing feature or API change)