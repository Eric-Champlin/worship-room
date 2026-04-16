# BB-23: The Story of Jesus — 21 Days Through John

**Branch:** `bible-redesign` (no new branch — all work commits directly here)
**Depends on:** BB-21 (plans architecture — store, types, loader, manifest, detail page, day page, completion celebration, reader banner), BB-21.5 (plan browser — the manifest entry becomes visible automatically), BB-22 (first content plan — establishes the content pattern this spec follows)
**Hands off to:** BB-24 (When You're Anxious), BB-25 (When You Can't Sleep) — both follow the same content pattern

---

## Overview

Ship the second real reading plan: **The Story of Jesus** — a 21-day sequential walk through the Gospel of John, one chapter per day. Unlike BB-22's curated thematic arc through Psalms, this plan follows John in order from chapter 1 to chapter 21 because John is a story, and stories should be read in the order they were written.

This is a content spec. The architecture is fully proven by BB-22. BB-23 reuses the same JSON shape, the same loader, the same reader integration, the same completion celebration. The work is the writing — 21 day titles, 21 devotional paragraphs (100-180 words each), and 21 reflection prompts. The devotional voice is narrative (telling you what's happening in the chapter), not contemplative (sitting quietly with a feeling). A user who reads BB-22 and then BB-23 should feel the tonal shift.

## User Story

As a **logged-in user**, I want to start a 21-day plan that walks me through the Gospel of John, one chapter per day, so that I can read an entire Gospel in order with guided context for each chapter.

As a **logged-out visitor**, I want to browse the plan's detail page and see the day list and description so that I can decide whether to create an account and start the plan.

## Requirements

### Functional Requirements

#### Plan Content File

1. A new JSON file at `frontend/src/data/bible/plans/john-story-of-jesus.json` containing the complete plan data
2. The file must conform to the existing `Plan` type in `frontend/src/types/bible-plans.ts` — **no schema changes**

#### Type Reconciliation Note

The `Plan` type (BB-21) uses: `slug`, `title`, `shortTitle`, `description`, `theme` (union: `'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'`), `duration`, `estimatedMinutesPerDay`, `curator`, `coverGradient`, `days[]`. Each `PlanDay` has: `day`, `title`, `passages[]`, optional `devotional`, optional `reflectionPrompts` (string array).

The spec's curation intent maps to the actual fields:

| Spec Intent | Actual `Plan` Field | Value |
|-------------|-------------------|-------|
| ID: `john-story-of-jesus` | `slug` | `"john-story-of-jesus"` |
| Title: "The Story of Jesus" | `title` | `"The Story of Jesus"` |
| Short title for compact UI | `shortTitle` | `"John"` |
| ~180 word description | `description` | See "Long-Form Description" below |
| Gospel/narrative tone | `theme` | `"foundation"` (closest match — this plan is foundational Gospel reading) |
| 21 days | `duration` | `21` |
| Minutes per day estimate | `estimatedMinutesPerDay` | `10` (John chapters average longer than Psalms) |
| Author: Worship Room | `curator` | `"Worship Room"` |
| Visual gradient | `coverGradient` | Amber-toned gradient class (e.g. `"from-amber-500/30 to-hero-dark"`) |
| Day numbers 1-21 | `days[].day` | 1-indexed |
| Day titles | `days[].title` | See curation below |
| Passages | `days[].passages` | `[{ book: "john", chapter: N }]` — one passage per day, full chapter |
| Devotional paragraphs | `days[].devotional` | See curation below |
| Reflection prompts | `days[].reflectionPrompts` | String array (1 prompt per day) |

**Fields the spec's original outline mentions that do NOT exist on `Plan`**: `id` (use `slug`), `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author` (use `curator`), `durationDays` (use `duration`). The plan phase must work within the existing type. Same constraint BB-22 operated under.

#### The Long-Form Description (~180 words)

> John was the last of the four Gospels written. By the time John picked up his pen, three other accounts of Jesus's life were already in circulation. So John didn't write another biography. He wrote a meditation. He picked seven miracles, seven "I am" statements, seven long conversations, and built them into a portrait of who Jesus actually was.
>
> This plan walks through John in order — chapter 1 to chapter 21, one chapter per day for three weeks. You'll read the prologue ("In the beginning was the Word") on day one and the post-resurrection breakfast on the beach on day 21. In between, you'll meet Nicodemus in the dark, the Samaritan woman at the well, the man born blind, Lazarus walking out of the tomb, and a Jesus who washes feet and weeps and asks Peter three times if he loves him.
>
> If you've never read a Gospel all the way through, this is the one to start with. If you've read John before, read it again. Twenty-one days is enough time for it to change shape in you.

#### Manifest Update

3. `manifest.json` must contain an entry for `john-story-of-jesus` as the second item (after `psalms-30-days`)
4. The manifest entry must exactly match the full plan's metadata fields — no drift
5. The manifest now contains exactly two plans

#### Build-Time Validation

6. Every passage's `book` is `"john"` (lowercase)
7. Every passage's `chapter` is 1-21
8. No passage has `startVerse` or `endVerse` — every day reads a full chapter
9. The `duration` field matches the length of the `days` array (21)
10. Days 1 through 21 reference John chapters 1 through 21 in order with no gaps and no repeats
11. BB-21's plan loader loads the plan file without errors

#### Test Coverage

12. A test case in `frontend/src/lib/bible/__tests__/planLoader.test.ts` explicitly loads and validates `john-story-of-jesus.json`

### The 21-Day Curation

#### Curation Principles

- **Sequential, no skipping.** John 1 on day 1, John 21 on day 21. Don't reorder for "emotional arc" — the book has its own arc
- **Each day's title names the chapter's center.** A concrete image or moment, not a verse reference or theme word. "The Word becomes flesh," "Nicodemus in the dark," "Lazarus, come out"
- **Devotionals match the chapter's tone.** Chapter 11 (Lazarus, Jesus weeping) and chapter 18 (the arrest) need more emotional weight. Chapter 6 (the bread of life discourse) needs more theological weight. Chapter 21 (the post-resurrection breakfast) needs gentleness
- **Reflection prompts are specific to the chapter.** Generic "what stood out to you?" prompts are forbidden. Each prompt must reference something concrete from that day's chapter
- **No "what this means for you" overreach.** Devotionals stay close to the text. The user extrapolates
- **No suspense-killing in early days.** Don't reference the crucifixion or resurrection in days 1-12. Let the story unfold
- **No references to other Gospels' parallel accounts.** This is the John plan, not a harmony

#### The 21 Days

| Day | Chapter | Title | Center |
|-----|---------|-------|--------|
| 1 | John 1 | The Word becomes flesh | The prologue — placing Jesus before the beginning of time |
| 2 | John 2 | Water into wine, and a temple cleared | Gentleness and fierceness in the same chapter |
| 3 | John 3 | Nicodemus in the dark | The famous night conversation, read slowly |
| 4 | John 4 | The woman at the well | Jesus's longest conversation — with someone the world dismissed |
| 5 | John 5 | The man at the pool | "Do you want to be healed?" after 38 years of waiting |
| 6 | John 6 | Bread for everyone | The miracle is easy; the teaching that follows is hard |
| 7 | John 7 | Brothers and skeptics | Other people's reactions to Jesus — confusion, mockery, wonder |
| 8 | John 8 | The woman, the stones, and the light | Jesus writing in the dirt + the first "I am" statement |
| 9 | John 9 | The man born blind | Faith growing slowly: "the man called Jesus" → "Lord, I believe" |
| 10 | John 10 | The shepherd | "I am the good shepherd" — the Psalm 23 connection |
| 11 | John 11 | Lazarus, come out | Jesus weeps. The load-bearing day of the plan |
| 12 | John 12 | Mary's perfume, the donkey, the seed | The hinge of the Gospel — the public ministry ends |
| 13 | John 13 | The towel | The foot washing — including Judas |
| 14 | John 14 | Do not let your hearts be troubled | The Farewell Discourse begins — gentle words for people about to lose him |
| 15 | John 15 | I am the vine | Abiding vs. striving — the difference that matters for the exhausted |
| 16 | John 16 | Sorrow into joy | Jesus promises his presence through a hard life, not an easy one |
| 17 | John 17 | The high priestly prayer | Jesus prays for you — verse 20, two thousand years ahead of time |
| 18 | John 18 | The arrest, the trial | Peter's denial told with painful detail — the leader failed and was forgiven |
| 19 | John 19 | The crucifixion | John structures it as coronation. Don't soften it, don't over-spiritualize it |
| 20 | John 20 | Mary in the garden | Resurrection in John is slow, confused, intimate — not triumphant |
| 21 | John 21 | Breakfast on the beach | 153 fish, a fire, bread, and "Do you love me?" three times |

#### Key Devotional Days

**Day 11 (Lazarus) is the most important day.** Jesus arrives four days late, on purpose. He knows what he's about to do. And he weeps anyway. He doesn't explain, doesn't reassure. He cries with the people who are crying. This devotional must earn the user's trust — get the tone right and the whole plan holds.

**Day 21 (Breakfast on the beach) is the second most important day.** The plan ends with breakfast, not a doctrinal statement. Jesus has made them breakfast. Then he walks down the beach with Peter and asks "Do you love me?" three times — once for each denial. The devotional must be quiet and tender.

**Day 19 (The crucifixion) is the hardest.** John structures the crucifixion as Jesus's coronation — "King of the Jews" in three languages. The devotional does not soften the violence and does not over-spiritualize it. It acknowledges the assignment.

#### Devotional Voice (Narrative, Not Contemplative)

The voice is different from BB-22:

- **Specific to the chapter.** Names a concrete phrase, moment, or image and lingers there
- **Quietly historical.** Explains cultural context when relevant (Samaritan-Jewish relations, foot washing norms, "I am" as the burning bush phrase)
- **Restrained about meaning.** Notes what's in the chapter without over-explaining what it means for the user
- **Honest about the hard parts.** John 6 is hard. John 11 is heavy. John 19 is brutal
- **Tender at the right moments.** John 13 (foot washing), John 11 (Lazarus), John 21 (breakfast)

If a devotional could be transposed to a different chapter without changing — it's wrong.

#### Devotional Text Requirements

Each day has a devotional paragraph (100-180 words, **hard upper limit 200 words**) that:

1. **Tells the user what's happening** — what the chapter contains, what to notice
2. **Provides historical or cultural context** where it enriches the reading
3. **Stays close to the text** — does not extract universal lessons or prescribe application

**Forbidden phrases:** "God wants to speak to you," "open your heart," "let God in," or any saccharine language that wouldn't survive being read aloud in a serious moment.

**WEB translation verification**: All quoted phrases in devotionals must match the WEB text in the codebase (`frontend/src/data/bible/books/json/john.json`), not paraphrases from other translations.

#### Reflection Prompt Requirements

Each day has 1 reflection prompt (string array with 1 entry). Each prompt is 30-140 characters. All 21 days must have distinct prompts. Each prompt must reference something specific from its chapter.

### Non-Functional Requirements

- **Performance**: The plan JSON is lazy-loaded on demand (not bundled in main chunk), per BB-21's loader architecture
- **Accessibility**: Inherited from BB-21's plan infrastructure

## Auth Gating

Inherited entirely from BB-21. No new interactive elements in BB-23.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View plan in browser grid | Can view card | Can view card | N/A |
| View plan detail page | Can view description and day list | Full access | N/A |
| Start the plan | Auth modal | Starts plan | "Sign in to start a reading plan" |
| Mark day complete | Auth modal | Marks complete | "Sign in to track your progress" |
| View plan day page | Can view devotional and passages | Full access | N/A |
| Read passage from plan | Navigates to Bible reader (public) | Same | N/A |

## Responsive Behavior

Inherited entirely from BB-21's plan detail page and plan day page responsive behavior. No new responsive patterns introduced by BB-23.

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, collapsible day list, sticky mark-complete button |
| Tablet (640-1024px) | Single column wider margins |
| Desktop (> 1024px) | Hero full-width, day list full-width, inline mark-complete |

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can browse the plan detail and day pages (read-only). Cannot start or track progress
- **Logged-in users:** Full plan lifecycle via `bible:plans` localStorage key (BB-21's plansStore)
- **Route type:** Public (viewing), Protected (starting/completing)
- **No new localStorage keys** — BB-23 uses BB-21's existing `bible:plans` key

## Completion & Navigation

Inherited from BB-21:
- Completing all 21 days triggers `PlanCompletionCelebration.tsx`
- The celebration identifies the plan's theme and shows appropriate reflective text
- Reading a John chapter from within a plan day shows the reader banner (`ActivePlanReaderBanner.tsx`)
- Marking day complete from the reader banner advances the day pointer
- The plan detail page renders the full 21-day list with titles and reflection prompts visible

## Design Notes

- The plan uses an amber-toned cover gradient for visual identity (warm, narrative, story-driven). Distinct from BB-22's contemplative indigo. The exact Tailwind gradient class should be determined in the plan phase
- All UI rendering uses BB-21's existing components — no new components for BB-23
- Devotional text renders as plain `<p>` elements split on double newlines — no HTML, no markdown
- After BB-23, the plan browser shows two cards: "30 Days in the Psalms" (indigo) and "The Story of Jesus" (amber). The empty state from BB-21.5 is no longer the default

## Out of Scope

- **No new code beyond the JSON file, manifest update, and test.** No new components, hooks, or utilities
- **No schema changes to the `Plan` type.** Same constraint as BB-22
- **No new design tokens.** Work within existing Tailwind classes
- **No translation other than WEB.** All passage references are WEB
- **No audio.** BB-26 handles audio Bible
- **No images.** Cover gradient only
- **No commentary beyond the daily devotional.** No footnotes, cross-references, or verse-by-verse breakdown
- **No companion content from other Gospels.** No parallel passages or harmony references
- **No multi-passage days.** Each day is one chapter, one passage entry
- **No suggested reading time.** The user discovers the variation
- **No verse memorization tie-in.** Deferred to BB-45
- **No prayer prompts.** Reflection prompts only — the user can pray if they want
- **No journal integration tie-in.** BB-21's day page links to journal generically
- **No social sharing per day.** Sharing happens at completion
- **No quiz, comprehension check, or reading time estimate**
- **No theological commentary on contested passages.** The woman caught in adultery (John 8) is textually disputed — the devotional stays in the WEB text
- **No skip option.** The chapter is the chapter
- **No seasonal timing.** The plan is evergreen

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/data/bible/plans/john-story-of-jesus.json` | Complete plan data conforming to `Plan` type |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/data/bible/plans/manifest.json` | Add `john-story-of-jesus` entry as second item |
| `frontend/src/lib/bible/__tests__/planLoader.test.ts` | Add test cases for the new plan |

## Execution Notes

- **The work is the writing.** Do not generate 21 formulaic devotionals. Each one needs real care
- **Day 11 is the most important day.** Lazarus and Jesus weeping. If only one devotional is great, this should be the one
- **Day 21 is the second most important day.** The plan ends on a beach with breakfast, not with a triumphant doctrinal statement
- **The devotionals are narrative, not contemplative.** Different voice from BB-22. Tell the user what's happening. Notice things. Linger on specific moments
- **Don't reference other Gospels' parallel accounts.** The user is reading John, not a harmony
- **Verify quoted text against WEB.** Cross-reference against `frontend/src/data/bible/books/json/john.json`
- **The manifest now has two plans.** Verify the plan browser correctly displays both
- **Total devotional word count: 2100-3780 words** (100-180 words x 21 days). No day shorter than 100 words or longer than 200 words

## Acceptance Criteria

### Plan File Structure
- [ ] New file exists at `frontend/src/data/bible/plans/john-story-of-jesus.json`
- [ ] File validates against BB-21's `Plan` TypeScript type (all required fields present)
- [ ] `slug` is `"john-story-of-jesus"` (unique across all plans)
- [ ] `duration` is exactly `21`
- [ ] `days` array contains exactly 21 entries
- [ ] Each day entry has a `day` field (1-indexed, continuous 1-21)
- [ ] Each day entry has a non-empty `title` field that is evocative and concrete
- [ ] Each day has exactly one passage in its `passages` array
- [ ] Every passage has `book: "john"` (lowercase)
- [ ] Every passage's `chapter` matches its day number (day 1 = chapter 1, etc.)
- [ ] No passage has `startVerse` or `endVerse` — every day reads a full chapter
- [ ] `theme` is one of the allowed `PlanTheme` values

### Content Quality
- [ ] Each day has a non-empty `devotional` field (100-200 words)
- [ ] Total devotional word count is between 2100 and 4200 words
- [ ] Each day has a non-empty `reflectionPrompts` array (1 prompt per day)
- [ ] Each reflection prompt is 30-140 characters
- [ ] All 21 reflection prompts are distinct (no repeated phrasing)
- [ ] Each day's reflection prompt is specific to its chapter — would not work for a different day
- [ ] The description field is approximately 180 words with narrative tone
- [ ] All quoted WEB scripture in devotionals matches the actual WEB translation text

### Curation Integrity
- [ ] Days 1-21 follow John chapters 1-21 sequentially with no gaps or repeats
- [ ] No two day titles are identical or near-duplicates
- [ ] No day's devotional contains saccharine phrasing ("God wants to speak to you," "open your heart," etc.)
- [ ] Devotional voice is consistently narrative — tells the user what's happening in the chapter
- [ ] Day 11's devotional (Lazarus) is carefully written and demonstrates the spec's tone requirements
- [ ] Day 21's devotional (breakfast on the beach) closes with tenderness, not triumph
- [ ] Day 19's devotional (crucifixion) does not soften the violence or over-spiritualize
- [ ] Days 1-12 do not reference the crucifixion or resurrection (no spoilers)
- [ ] No devotional references parallel accounts from other Gospels

### Manifest & Validation
- [ ] `manifest.json` contains entries for both `psalms-30-days` and `john-story-of-jesus`
- [ ] Manifest now contains exactly two plans
- [ ] Manifest entry for `john-story-of-jesus` matches the full plan's metadata (no drift)
- [ ] BB-21's plan loader loads the plan without errors
- [ ] Test cases explicitly validate `john-story-of-jesus.json`

### Integration (verified via existing BB-21 infrastructure)
- [ ] Plan appears as the second card in the plan browser grid
- [ ] Starting the plan creates a progress record in plansStore
- [ ] Reading John 1 from within plan day 1 shows the reader banner
- [ ] Marking day 1 complete advances to day 2 (John 2)
- [ ] Completing all 21 days triggers the completion celebration
- [ ] The plan detail page renders the full 21-day list with titles and reflection prompts
