# BB-45: Verse Memorization Deck

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave. Depends on BB-43 (heatmap), BB-7 (highlights), BB-38 (deep linking), BB-17 (streak system), BB-40 (SEO/metadata). Hands off to BB-46 (verse echoes), BB-33 (animations).

**Branch:** `bible-redesign` (all work commits directly to this branch)

---

## Overview

Scripture memorization is one of the oldest practices in Christian devotional life — and one of the things Bible apps consistently get wrong. The dominant market approach (YouVersion's verse cards, Bible Memory's quizzes, Verses' spaced repetition) treats memorization as a gamified test with scoring, completion bars, and streak pressure. This is exactly the wrong tone for Worship Room.

BB-45 adds a personal memorization deck to Worship Room: a quiet, pressure-free way to collect and revisit verses you want to know by heart. The interaction is closer to a physical notecard you keep in your wallet than a Duolingo-style drill. No quizzes, no scores, no spaced repetition — just a deck of cards you flip through when you choose to.

## User Story

As a **logged-in user**, I want to **mark any verse as "memorize this" and review my collected verses by flipping through cards** so that **the verses I care about settle into my memory through gentle repetition, not pressure**.

## Requirements

### Functional Requirements

#### Data Store

1. A new memorization card store at `frontend/src/lib/memorize/` persists cards to localStorage under `wr_memorization_cards` as a JSON array
2. Each card captures: unique ID, book slug, book display name, chapter, start verse, end verse, verse text (captured at creation time), formatted reference, creation timestamp, last reviewed timestamp (nullable), review count
3. The store exposes: `getAllCards()`, `addCard()`, `removeCard()`, `recordReview()`, `isCardForVerse()`, `subscribe()`
4. The store follows the reactive pattern (in-memory cache, listeners, write-through to localStorage) matching BB-7's highlight store and BB-43's chapter visit store
5. Verse text is captured at card creation time, not lazily loaded — a memorized verse stays exactly as the user first saw it regardless of future Bible data updates
6. `isCardForVerse()` enables the BibleReader and highlights UI to check whether a verse is already in the deck

#### Card Grid Component (MemorizationDeck)

7. A `MemorizationDeck` component renders the user's full deck as a grid of flip cards
8. Each card has a front (verse reference in larger text, small flip icon hint in corner) and a back (verse text, scrollable if long)
9. Cards use frosted-glass treatment: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`
10. Card height is fixed (~180px) so the grid stays visually consistent — long verses scroll within the card back rather than expanding
11. Tapping/clicking anywhere on the card body flips it via CSS 3D transform (`rotateY(180deg)` with `transform-style: preserve-3d`)
12. Each flip records a review (increments `reviewCount`, updates `lastReviewedAt`)
13. The flip animation is 250-300ms and respects `prefers-reduced-motion` (instant transition when reduced motion is enabled)
14. Bottom of each card (both sides): date added in muted text ("Added 3 weeks ago") and a small remove button (X icon) with inline confirmation ("Remove this card?" with Yes/Cancel — not a modal)
15. Section heading: "Memorization deck" with card count ("12 cards")
16. Above the grid: "X cards in your deck" summary — count only, no percentage or progress metric
17. If any card has been reviewed: "Last reviewed [reference] [time ago]" secondary line
18. Empty state: friendly message directing users to the BibleReader — "No memorization cards yet. Tap the bookmark icon on any verse in the Bible reader to start your deck."
19. Cards display in creation order (newest first) — no sort controls in v1

#### BibleReader Integration

20. The BibleReader verse action menu adds a new action: "Add to memorize" with a bookmark-with-flip icon
21. If the verse is already in the deck, the action becomes "Remove from memorize"
22. Multi-verse selections create a single card with the full range (e.g., "Psalm 23:1-3" with concatenated verse texts), if the BibleReader's selection state supports ranges; falls back to single-verse if not
23. Adding a card captures the verse text from the currently loaded chapter data at creation time

#### Activity Feed Integration

24. Highlight items in the My Bible activity feed get an "Add to memorize" affordance (icon button)
25. The affordance is hidden if a verse is already in the deck, replaced by a visual indicator (e.g., a filled icon or "In deck" label)

#### My Bible Page Integration

26. The memorization deck section is placed on `/bible/my` between the BB-43 progress map and the existing quick stats row
27. The section uses the same `max-w-2xl` container and vertical rhythm pattern (`py-8` between sections with `border-t border-white/[0.08]` dividers) as the rest of the page

### Non-Functional Requirements

- **Performance**: Card grid renders up to 100 cards without jank. CSS 3D transforms are GPU-accelerated.
- **Accessibility**: Cards are keyboard-navigable (Enter/Space to flip), have `aria-label` describing the action ("Flip card to reveal verse text" / "Flip card to show reference"), remove confirmation is keyboard-accessible. Touch targets meet 44px minimum.
- **Storage**: Each card is ~200-500 bytes. A deck of 100 cards is ~50KB — well within localStorage limits.

## Auth Gating

The My Bible page is already auth-gated. The BibleReader verse actions are already auth-gated where needed. BB-45 adds zero new auth gates.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View memorization deck on My Bible | Cannot access — My Bible page is auth-gated | Sees deck section with all their cards | N/A |
| "Add to memorize" in BibleReader | Verse action menu may already be auth-gated (verify during recon) | Creates card, shows confirmation | N/A |
| Flip a card | N/A (page auth-gated) | Card flips, review recorded | N/A |
| Remove a card | N/A (page auth-gated) | Inline confirmation, then card removed | N/A |
| "Add to memorize" from activity feed | N/A (page auth-gated) | Creates card from highlight data | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | 1-column card grid, full-width cards within `max-w-2xl` container |
| Tablet (640-1024px) | 2-column card grid |
| Desktop (> 1024px) | 3-column card grid within `max-w-2xl` container |

- Card height is fixed (~180px) at all breakpoints
- On mobile, the remove confirmation buttons (Yes/Cancel) stack if needed but should fit inline at 375px+
- The flip animation works identically at all sizes — CSS 3D transforms are resolution-independent
- Touch targets for the remove button and flip area meet 44px minimum on mobile

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. All content is user-curated verse selections from the existing WEB Bible.

## Auth & Persistence

- **Logged-out users:** Cannot access — My Bible page (`/bible/my`) is auth-gated. No persistence needed.
- **Logged-in users:** Cards persist to localStorage under `wr_memorization_cards` as a JSON array. Migrates to backend API in Phase 3.
- **Route type:** Protected (inherits My Bible page auth gate)
- **localStorage key:** `wr_memorization_cards` — `MemorizationCard[]` (see data model in Architecture section)

## Completion & Navigation

N/A — The memorization deck is not part of the Daily Hub tabbed experience. It lives on the My Bible page as a standalone section. No completion tracking, no streak integration, no daily activity signals.

## Design Notes

- Cards use the existing `FrostedCard` visual treatment (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`) from `09-design-system.md`
- Section follows the My Bible page's vertical rhythm: `py-8` spacing, `border-t border-white/[0.08]` dividers
- Text on card front (reference) uses `text-white` at ~20px for readability; text on card back (verse text) uses `text-white/90` at ~15px with `leading-relaxed`
- Muted metadata text (date added) uses `text-white/50` at `text-xs`
- The flip icon hint on the card front should be subtle (`text-white/30`) — present but not distracting
- The remove button uses `text-white/40` with `hover:text-white/70` — visible on inspection but not competing with the verse content
- The inline remove confirmation uses a slightly darker card background (`bg-white/[0.08]`) to visually distinguish the confirmation state from the normal card state
- Empty state icon should match the Worship Room warm empty state pattern (from `FeatureEmptyState` component if applicable)
- The "Last reviewed" secondary line uses `text-white/60` at `text-sm`
- **New pattern**: CSS 3D card flip. Not yet in the design system. Uses standard `transform-style: preserve-3d` with `backface-visibility: hidden` on both faces. Plan phase should verify iOS Safari compatibility and note any `-webkit-` prefix requirements.

## Anti-Pressure Design Decisions

These are non-negotiable and reflect Worship Room's core positioning:

- **No spaced repetition algorithm.** No SuperMemo, no SM-2, no Anki-style scheduling.
- **No quizzing or self-testing.** No "did you remember it?" buttons after the flip.
- **No completion percentage** or memorization mastery tracking.
- **No scoring.** No point values, no streaks for memorization, no leaderboard.
- **No daily review reminders.** Users come to their deck when they choose to.
- **No deck sharing or social features.** Each user has their own private deck.
- **No public deck templates.** Every card is user-created from their own reading.

## Out of Scope

- Spaced repetition algorithm (no SM-2, no Anki-style scheduling)
- Quizzing, self-testing, or "did you remember it?" interaction
- Completion percentages, mastery tracking, or progress bars
- Scoring, point values, or streak tracking for memorization
- Daily review reminders or push notifications
- Multi-verse cards beyond the BibleReader's existing selection range
- Deck sharing, social features, or public deck templates
- Deck export (future spec)
- Card editing (remove and re-add instead)
- Card categories, tags, or labels (future spec if demand)
- Sort controls (newest-first only in v1)
- Search within the deck (future spec if needed)
- Card customization (color, font, layout)
- Backend API (Phase 3)
- New SDK packages
- Changes to BB-7's highlight store, BB-17's streak store, or BB-43's chapter visit store

## Acceptance Criteria

- [ ] A new module at `frontend/src/lib/memorize/` exports the memorization card store with `getAllCards`, `addCard`, `removeCard`, `recordReview`, `isCardForVerse`, and `subscribe`
- [ ] Cards are persisted to localStorage under `wr_memorization_cards` as a JSON array
- [ ] Card creation captures the verse text at creation time, not lazily on render
- [ ] The store follows the reactive pattern (in-memory cache, listeners, write-through) matching BB-7 and BB-43
- [ ] A new `MemorizationDeck` component at `frontend/src/components/memorize/MemorizationDeck.tsx` renders the user's full deck as a grid of cards
- [ ] Each card has a front (reference) and back (verse text) with CSS 3D flip animation (`rotateY(180deg)` with `transform-style: preserve-3d`)
- [ ] Tapping or clicking a card flips it and records a review via `recordReview()`
- [ ] The flip animation (250-300ms) respects `prefers-reduced-motion` and falls back to an instant transition
- [ ] Long verses on the card back scroll within the card (fixed ~180px height) rather than expanding the card
- [ ] Each card displays the date added in muted text ("Added 3 weeks ago" via relative time formatting)
- [ ] Each card has a remove button with inline confirmation ("Remove this card?" with Yes/Cancel — not a modal)
- [ ] The deck is responsive: 1 column on mobile (< 640px), 2 columns on tablet (640-1024px), 3 columns on desktop within `max-w-2xl`
- [ ] Section heading "Memorization deck" with the card count displayed
- [ ] Above the grid: "X cards in your deck" — count only, no percentage or progress metric
- [ ] If any card has been reviewed, show "Last reviewed [reference] [time ago]" as a secondary line
- [ ] Empty state shows a friendly message directing users to the BibleReader bookmark icon
- [ ] The `MemorizationDeck` component is integrated into `MyBiblePage` between the BB-43 progress map and the existing quick stats row
- [ ] The BibleReader verse action menu adds "Add to memorize" action with bookmark-with-flip icon
- [ ] If a verse is already in the deck, the BibleReader action becomes "Remove from memorize"
- [ ] Multi-verse selections create a single card with the range (if BibleReader supports ranges; single-verse fallback otherwise)
- [ ] Activity feed highlight items get an "Add to memorize" affordance (icon button)
- [ ] The "Add to memorize" affordance is hidden when a verse is already in the deck, replaced by a visual indicator
- [ ] All BB-30 through BB-43 tests continue to pass unchanged
- [ ] At least 15 unit tests cover the memorization store (CRUD, reactive updates, edge cases)
- [ ] At least 12 component tests cover `MemorizationDeck` (rendering, flip interaction, empty state, remove confirmation, review recording)
- [ ] At least 5 integration tests cover the BibleReader "Add to memorize" action and highlights feed affordance
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates
- [ ] Exactly one new localStorage key: `wr_memorization_cards`
- [ ] The new key is documented in `.claude/rules/11-local-storage-keys.md`
- [ ] A documentation file at `_plans/recon/bb45-memorization.md` documents the data model, integration points, anti-pressure decisions, and deferred follow-ups
- [ ] Cards use frosted-glass treatment matching the wave: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`
- [ ] Card grid maintains consistent visual rhythm with fixed card heights (~180px)
- [ ] Keyboard navigation works: Enter/Space flips cards, Tab navigates between cards, remove flow is keyboard-accessible

## Notes for Plan Phase Recon

These items must be verified during `/plan` reconnaissance before execution begins:

1. **BibleReader verse action menu structure** — What file, what actions exist today, what props the actions take. Can BB-45 add an action without rewriting the menu?
2. **BB-7 highlight store structure** — Verify the verse text storage format so card creation can capture text correctly.
3. **My Bible activity feed component** — Identify the component and the highlight item rendering location for the "Add to memorize" affordance.
4. **BibleReader selection state** — Does it expose a verse range (startVerse, endVerse), or is it single-verse only? This determines multi-verse card support.
5. **CSS 3D flip on iOS Safari** — Verify `transform-style: preserve-3d` works in the existing flexbox/grid context. Note any `-webkit-` prefix requirements.
6. **Card height value** — Test the proposed ~180px against both a short verse (one-line proverb) and a long verse (300+ character Pauline sentence) in the chosen layout.
