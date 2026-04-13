# BB-45: Verse Memorization Deck — Architecture Notes

## Data Model

`MemorizationCard` interface at `frontend/src/types/memorize.ts`:
- id, book, bookName, chapter, startVerse, endVerse
- verseText (captured at creation, immutable)
- reference (formatted string)
- createdAt, lastReviewedAt (nullable), reviewCount

## Integration Points

1. **Store** (`lib/memorize/store.ts`): Reactive pattern matching BB-7/BB-43
2. **VerseActionSheet** (`lib/bible/verseActionRegistry.ts`): `memorize` action — immediate toggle (add/remove), no sub-view
3. **MyBiblePage** (`pages/MyBiblePage.tsx`): Deck section between BB-43 progress map and quick stats
4. **Activity Feed** (`components/bible/my-bible/HighlightCard.tsx`): "Add to memorize" icon affordance on highlight items

## Anti-Pressure Decisions

- No spaced repetition, quizzing, scoring, or mastery tracking
- No daily reminders or streak integration
- No social/sharing features for the deck
- Review = flipping a card (front→back). No "did you remember?" assessment.

## Deferred Follow-ups

- BB-46: Verse echoes (may reference memorized verses)
- Card editing (currently: remove and re-add)
- Deck export
- Card categories/tags
- Sort controls beyond newest-first
- Search within the deck
- Backend API persistence (Phase 3)
