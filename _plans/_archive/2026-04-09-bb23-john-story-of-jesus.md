# Implementation Plan: BB-23 — The Story of Jesus (21 Days Through John)

**Spec:** `_specs/bb-23-john-story-of-jesus.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable (content-only spec, no new UI)
**Master Spec Plan:** `_plans/2026-04-09-bb21-reading-plans-architecture.md` (loaded — BB-21 defines all infrastructure this spec uses)

---

## Architecture Context

### What This Spec Is

BB-23 is a **content creation** spec — the second reading plan after BB-22. It ships one JSON data file (the 21-day Gospel of John reading plan), updates the plan manifest from one entry to two, and adds tests. No new components, hooks, routes, pages, or utilities. All rendering infrastructure was built in BB-21 (plan detail page, plan day page, reader banner, completion celebration) and BB-21.5 (plan browser grid).

### Key Differences from BB-22

- **Sequential, not curated.** Days 1-21 map to John chapters 1-21 in order. No emotional arc to construct — John's own narrative arc is the structure.
- **Narrative voice, not contemplative.** Devotionals tell the user what's happening in the chapter, not how to sit with a feeling. Cultural and historical context where it enriches the reading.
- **21 days, not 30.** One chapter per day, full chapters, no verse ranges.
- **10 minutes/day estimate** (John chapters are longer than Psalms).
- **Amber gradient** (warm, narrative) instead of BB-22's indigo (contemplative).

### Key Files

- **Plan types:** `src/types/bible-plans.ts` — `Plan`, `PlanDay`, `PlanPassage`, `PlanMetadata`, `PlanTheme`
- **Plan loader:** `src/lib/bible/planLoader.ts` — `loadManifest()` (sync, reads manifest.json), `loadPlan(slug)` (async, dynamic `import()` of `@/data/bible/plans/${slug}.json`)
- **Manifest:** `src/data/bible/plans/manifest.json` — currently contains 1 entry (`psalms-30-days`)
- **Plans directory:** `src/data/bible/plans/` — contains `manifest.json` and `psalms-30-days.json`
- **Existing plan loader test:** `src/lib/bible/__tests__/planLoader.test.ts` — validates manifest, plan loading, and BB-22's structural/content quality
- **John WEB data:** `src/data/bible/books/json/john.json` — 21 chapters, ~150 KB
- **Plan detail page:** `src/pages/BiblePlanDetail.tsx` — renders plan metadata + day list
- **Plan day page:** `src/pages/BiblePlanDay.tsx` — renders devotional + passages + reflection prompts

### Plan Type (exact shape the JSON must conform to)

```typescript
interface Plan {
  slug: string
  title: string
  shortTitle: string
  description: string
  theme: PlanTheme  // 'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'
  duration: number
  estimatedMinutesPerDay: number
  curator: string
  coverGradient: string  // Tailwind gradient class
  days: PlanDay[]
}

interface PlanDay {
  day: number       // 1-indexed
  title: string
  passages: PlanPassage[]
  devotional?: string
  reflectionPrompts?: string[]
}

interface PlanPassage {
  book: string      // lowercase slug, e.g. "john"
  chapter: number
  startVerse?: number
  endVerse?: number
  label?: string
}
```

### PlanMetadata (manifest entry shape)

`PlanMetadata = Omit<Plan, 'days'>` — every field except `days`. The manifest entry must exactly match the plan's top-level metadata.

### Plan Loader Validation

`loadPlan(slug)` validates: `data.slug`, `data.title`, `data.duration`, and `Array.isArray(data.days)`. If any are missing, returns `{ plan: null, error }`. The JSON must pass all four checks.

### Book Slug Verification (Pre-Confirmed)

The Gospel of John uses slug `"john"` (lowercase). Verified in:
- `src/constants/bible.ts` line 196: `{ name: 'John', slug: 'john', chapters: 21 }`
- `src/data/bible/index.ts` line 142: `john: () => import('./books/json/john.json')`
- File exists: `src/data/bible/books/json/john.json` (150 KB, 21 chapters)

### WEB Translation Verification — Critical

Devotional text must reference WEB scripture accurately. Any quoted phrases must be verified against `frontend/src/data/bible/books/json/john.json`, not paraphrased from ESV, NIV, or KJV. Key passages to cross-reference:

| Day | Key WEB Phrase to Verify |
|-----|-------------------------|
| 1 | "In the beginning was the Word" (John 1:1) |
| 3 | "born again" vs "born anew" — check WEB exact wording |
| 8 | "I am the light of the world" — verify exact WEB |
| 11 | "Jesus wept" — verify (John 11:35) |
| 14 | "Don't let your heart be troubled" — verify WEB phrasing |
| 15 | "I am the vine" — verify WEB exact |
| 17 | "I pray... for those who will believe" — verify verse 20 WEB |
| 21 | "Do you love me?" — verify WEB exact wording (John 21:15-17) |

### Recent Execution Log Deviations

BB-22 execution log (the most recent plan): all 4 steps completed with zero deviations. No design system misunderstandings to flag.

---

## Auth Gating Checklist

**BB-23 introduces zero new auth-gated actions.** All auth gating is inherited from BB-21:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Start the plan | Inherited from BB-21 | N/A (no new code) | `useAuth` + `useAuthModal` (BB-21) |
| Mark day complete | Inherited from BB-21 | N/A (no new code) | `useAuth` + `useAuthModal` (BB-21) |
| View plan detail | Public — no auth | N/A | N/A |
| View plan day | Public — no auth | N/A | N/A |

---

## Design System Values (for UI steps)

N/A — BB-23 creates no UI. All rendering is handled by existing BB-21 components:
- Plan detail page: `BiblePlanDetail.tsx`
- Plan day page: `BiblePlanDay.tsx`
- Plan browser card: `PlanBrowseCard.tsx` (BB-21.5)
- Reader banner: `ActivePlanReaderBanner.tsx`

The only visual decision is `coverGradient`, which determines the plan card's background color in the browser and detail page hero.

---

## Design System Reminder

N/A — No UI steps in this plan. All rendering is handled by existing components.

---

## Shared Data Models (from BB-21)

### Types consumed (not modified)

```typescript
// src/types/bible-plans.ts — all types created in BB-21, consumed by BB-23's JSON
Plan, PlanDay, PlanPassage, PlanMetadata, PlanTheme
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:plans` | Read (by BB-21 infrastructure) | Plan progress — BB-23 adds no new writes |

BB-23 adds no new localStorage keys.

---

## Responsive Structure

N/A — No new UI. Responsive behavior is inherited from BB-21 plan detail and plan day pages.

---

## Inline Element Position Expectations

N/A — no inline-row layouts in this feature.

---

## Vertical Rhythm

N/A — no new UI sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-21 (reading plans architecture) is committed on `bible-redesign`
- [ ] BB-21.5 (plan browser) is committed on `bible-redesign`
- [ ] BB-22 (psalms-30-days) is committed on `bible-redesign`
- [ ] `src/data/bible/plans/manifest.json` currently contains 1 entry (`psalms-30-days`)
- [ ] `src/data/bible/books/json/john.json` exists with 21 chapters
- [ ] `src/types/bible-plans.ts` exists with `Plan`, `PlanDay`, `PlanPassage`, `PlanMetadata` types
- [ ] `src/lib/bible/planLoader.ts` exists with `loadManifest()` and `loadPlan()` functions
- [ ] Book slug `"john"` verified against `BIBLE_BOOKS` and `BOOK_LOADERS`
- [ ] No deprecated patterns used (N/A — no UI code)
- [ ] All auth-gated actions inherited from BB-21 (no new auth gates)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `theme` value | `"foundation"` | Spec direction: foundational Gospel reading, not comfort-oriented. `"foundation"` is the closest match from the PlanTheme union. |
| `shortTitle` value | `"John"` | Per spec. Compact display in plan browser cards and the TodaysPlanCard widget. |
| `coverGradient` value | `"from-amber-500/30 to-hero-dark"` | Per spec. Amber tone = warm, narrative, story-driven. Distinct from BB-22's indigo (contemplative). |
| `estimatedMinutesPerDay` | `10` | Per spec. John chapters average longer than Psalms. Conservative estimate for chapter reading + devotional + reflection. |
| Day-chapter mapping | Strict 1:1 (day N = John chapter N) | Per spec. John is a story; sequential reading preserves the narrative arc. |
| Devotional voice | Narrative, not contemplative | Per spec. Different from BB-22. Each devotional tells the user what's happening in the chapter. |
| No spoilers in days 1-12 | Crucifixion and resurrection not referenced before day 13 | Per spec. Let the story unfold. |
| No parallel Gospel references | John only, no Matthew/Mark/Luke parallels | Per spec. The user is reading John, not a harmony. |
| John 8 (woman caught in adultery) | Stay in the WEB text, no note about textual dispute | Per spec. Out of scope for BB-23 to address textual criticism. |
| Manifest order | `john-story-of-jesus` as second item (after `psalms-30-days`) | Per spec. The plan browser shows two cards in manifest order. |

---

## Implementation Steps

### Step 1: Create Plan JSON File

**Objective:** Create `frontend/src/data/bible/plans/john-story-of-jesus.json` containing the complete 21-day reading plan with all 21 curated devotionals, reflection prompts, and passage references.

**Files to create:**
- `frontend/src/data/bible/plans/john-story-of-jesus.json` — CREATE: complete plan data

**Details:**

Create the JSON file conforming to the `Plan` type with these metadata fields:

```json
{
  "slug": "john-story-of-jesus",
  "title": "The Story of Jesus",
  "shortTitle": "John",
  "description": "<~180 word description from spec>",
  "theme": "foundation",
  "duration": 21,
  "estimatedMinutesPerDay": 10,
  "curator": "Worship Room",
  "coverGradient": "from-amber-500/30 to-hero-dark",
  "days": [ /* 21 PlanDay objects */ ]
}
```

Each day entry:

```json
{
  "day": 1,
  "title": "The Word becomes flesh",
  "passages": [{ "book": "john", "chapter": 1 }],
  "devotional": "<100-200 word devotional paragraph>",
  "reflectionPrompts": ["<30-140 char prompt>"]
}
```

**The 21-day curation (from spec — strictly sequential):**

| Day | Chapter | Title |
|-----|---------|-------|
| 1 | John 1 | The Word becomes flesh |
| 2 | John 2 | Water into wine, and a temple cleared |
| 3 | John 3 | Nicodemus in the dark |
| 4 | John 4 | The woman at the well |
| 5 | John 5 | The man at the pool |
| 6 | John 6 | Bread for everyone |
| 7 | John 7 | Brothers and skeptics |
| 8 | John 8 | The woman, the stones, and the light |
| 9 | John 9 | The man born blind |
| 10 | John 10 | The shepherd |
| 11 | John 11 | Lazarus, come out |
| 12 | John 12 | Mary's perfume, the donkey, the seed |
| 13 | John 13 | The towel |
| 14 | John 14 | Do not let your hearts be troubled |
| 15 | John 15 | I am the vine |
| 16 | John 16 | Sorrow into joy |
| 17 | John 17 | The high priestly prayer |
| 18 | John 18 | The arrest, the trial |
| 19 | John 19 | The crucifixion |
| 20 | John 20 | Mary in the garden |
| 21 | John 21 | Breakfast on the beach |

**Description text (~180 words):** Use the spec's provided long-form description verbatim (it is well-written and at the right length).

**Devotional writing requirements:**

1. Each devotional is 100-200 words (hard upper limit 200). Total across 21 days: 2100-4200 words.
2. Voice is narrative, not contemplative: tells the user what's happening in the chapter, provides historical/cultural context, stays close to the text.
3. **Day 11 (Lazarus) is the most important day.** Jesus arrives four days late, on purpose. He weeps. The devotional must earn the user's trust — get the tone right and the whole plan holds.
4. **Day 21 (Breakfast on the beach) is the second most important day.** Quiet and tender. The plan ends with breakfast, not a doctrinal statement.
5. **Day 19 (The crucifixion) is the hardest.** John structures it as coronation. Don't soften the violence, don't over-spiritualize.
6. **Days 1-12: no spoilers.** Do not reference the crucifixion or resurrection in early devotionals. Let the story unfold.
7. **No references to other Gospels' parallel accounts.** This is the John plan, not a harmony.
8. **WEB verification mandate:** Every quoted scripture phrase must be verified against `frontend/src/data/bible/books/json/john.json`.
9. **Forbidden phrases:** "God wants to speak to you," "open your heart," "let God in," or any saccharine language.

**Reflection prompt requirements:**

1. Each day has exactly 1 prompt in a string array.
2. Each prompt is 30-140 characters.
3. All 21 days must have distinct prompts — no repeated phrasing across any two days.
4. Each prompt must reference something specific from its chapter — would not work for a different day.

**Auth gating:** N/A — data file only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT use any scripture quotes from ESV, NIV, KJV, or any translation other than WEB. Verify every quoted phrase against `john.json`.
- DO NOT exceed 200 words on any single devotional. Count words.
- DO NOT go below 100 words on any single devotional. Count words.
- DO NOT repeat a reflection prompt's phrasing across days.
- DO NOT reference the crucifixion or resurrection in days 1-12 devotionals.
- DO NOT reference parallel accounts from Matthew, Mark, or Luke.
- DO NOT use HTML or markdown in devotional text — plain text only, split on double newlines renders as `<p>` elements.
- DO NOT add fields not in the `Plan` type (no `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`).
- DO NOT use saccharine phrases ("God wants to speak to you," "open your heart," "let God in").
- DO NOT use generic reflection prompts that could apply to any chapter.
- DO NOT use `startVerse` or `endVerse` on any passage — every day reads a full chapter.

**Test specifications:** N/A — tested in Step 3.

**Expected state after completion:**
- [ ] `frontend/src/data/bible/plans/john-story-of-jesus.json` exists
- [ ] JSON is valid and parseable
- [ ] `slug` is `"john-story-of-jesus"`
- [ ] `duration` is `21`
- [ ] `days` array has exactly 21 entries
- [ ] Every day has `day` (1-21), `title`, `passages` (with `book: "john"`, `chapter` matching day number), `devotional`, `reflectionPrompts`
- [ ] Every `devotional` is 100-200 words
- [ ] Every `reflectionPrompts` entry is 30-140 characters
- [ ] No duplicate reflection prompts
- [ ] All scripture quotes verified against WEB `john.json`
- [ ] Day 11 (Lazarus) devotional handles the tone with care
- [ ] Day 21 (breakfast) devotional closes with tenderness
- [ ] Day 19 (crucifixion) devotional doesn't soften or over-spiritualize
- [ ] Days 1-12 contain no crucifixion/resurrection references
- [ ] No parallel Gospel references
- [ ] No saccharine language
- [ ] Days follow John 1-21 in strict sequential order

---

### Step 2: Update Manifest

**Objective:** Add the `john-story-of-jesus` entry to `manifest.json` as the second item so the plan appears in the browser grid.

**Files to modify:**
- `frontend/src/data/bible/plans/manifest.json` — MODIFY: add second entry to the array

**Details:**

Add the plan's metadata to the manifest array as the second item (after `psalms-30-days`):

```json
[
  {
    "slug": "psalms-30-days",
    ...existing BB-22 entry unchanged...
  },
  {
    "slug": "john-story-of-jesus",
    "title": "The Story of Jesus",
    "shortTitle": "John",
    "description": "<same description as in the plan JSON>",
    "theme": "foundation",
    "duration": 21,
    "estimatedMinutesPerDay": 10,
    "curator": "Worship Room",
    "coverGradient": "from-amber-500/30 to-hero-dark"
  }
]
```

**Critical: No drift.** Every metadata field must exactly match the plan JSON. Copy-paste to avoid drift. The existing `psalms-30-days` entry must remain untouched.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT include `days` in the manifest entry — `PlanMetadata = Omit<Plan, 'days'>`
- DO NOT add any fields not in the `Plan` type
- DO NOT have any difference between manifest metadata and plan JSON metadata
- DO NOT modify the existing `psalms-30-days` manifest entry
- DO NOT reorder the entries — `psalms-30-days` first, `john-story-of-jesus` second

**Test specifications:** N/A — tested in Step 3.

**Expected state after completion:**
- [ ] `manifest.json` contains exactly 2 entries
- [ ] First entry is `psalms-30-days` (unchanged)
- [ ] Second entry is `john-story-of-jesus`
- [ ] All metadata fields match the plan JSON exactly (no drift)
- [ ] `days` field is not present in either manifest entry

---

### Step 3: Add Tests

**Objective:** Add test cases that validate the John plan JSON loads correctly and passes structural validation. Update existing manifest test to account for 2 entries.

**Files to modify:**
- `frontend/src/lib/bible/__tests__/planLoader.test.ts` — MODIFY: add John plan import, update manifest test count, add plan validation tests

**Details:**

1. **Add import** at the top of the file:
   ```typescript
   import johnPlanData from '@/data/bible/plans/john-story-of-jesus.json'
   ```

2. **Update manifest test** (line 12): The existing test checks `result.length >= 1`. Update to verify both entries exist:
   ```typescript
   it('returns array containing both plan entries', () => {
     const result = loadManifest()
     expect(result).toHaveLength(2)
     expect(result.find(p => p.slug === 'psalms-30-days')).toBeDefined()
     expect(result.find(p => p.slug === 'john-story-of-jesus')).toBeDefined()
   })
   ```

3. **Add loadPlan test:**
   ```typescript
   it('loads john-story-of-jesus without error', async () => {
     const result = await loadPlan('john-story-of-jesus')
     expect(result.error).toBeNull()
     expect(result.plan).not.toBeNull()
     expect(result.plan!.slug).toBe('john-story-of-jesus')
     expect(result.plan!.duration).toBe(21)
     expect(result.plan!.days).toHaveLength(21)
     expect(result.plan!.title).toBe('The Story of Jesus')
   })
   ```

4. **Add `john-story-of-jesus plan validation` describe block** mirroring the psalms validation pattern with these tests:

| Test | Type | Description |
|------|------|-------------|
| has correct metadata | unit | slug, title, shortTitle, duration, theme, curator, estimatedMinutesPerDay, coverGradient all match expected values |
| has all 21 days with continuous numbering | unit | days 1-21 with no gaps |
| every day has required fields | unit | title, passages, devotional, reflectionPrompts all non-empty |
| all passages reference John chapters in order | unit | `book === "john"`, `chapter === day.day` for every day |
| no passage has verse ranges | unit | No `startVerse` or `endVerse` on any passage — full chapters only |
| devotional word counts in range (100-200) | unit | 100-200 words per day |
| reflection prompts in character range (30-140) | unit | 30-140 chars each |
| no duplicate reflection prompts | unit | All 21 prompts are distinct |
| theme is a valid PlanTheme value | unit | `"foundation"` is in the VALID_THEMES array |
| manifest metadata matches plan metadata (no drift) | unit | Every PlanMetadata field matches between manifest and plan |

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT mock the plan JSON — import the real file for validation
- DO NOT test UI rendering — that's BB-21's responsibility
- DO NOT add snapshot tests — they're brittle for content files
- DO NOT modify or remove any existing BB-22 (psalms) tests
- DO NOT rename the existing `psalms-30-days` variable — add a separate import for John

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| manifest contains both plans | unit | `loadManifest()` returns array with 2 entries |
| john plan loads without error | unit | `loadPlan('john-story-of-jesus')` returns `{ plan, error: null }` |
| john plan has correct metadata | unit | slug, title, duration, theme, curator match expected |
| all 21 days with continuous numbering | unit | days 1-21 with no gaps |
| every day has required fields | unit | title, passages, devotional, reflectionPrompts all non-empty |
| all passages reference John in order | unit | `book === "john"`, `chapter === day.day` |
| no passage has verse ranges | unit | No startVerse or endVerse |
| devotional word counts 100-200 | unit | Per-day word count validated |
| reflection prompts 30-140 chars | unit | Per-prompt character count validated |
| no duplicate prompts | unit | All 21 prompts distinct |
| theme is valid PlanTheme | unit | "foundation" in VALID_THEMES |
| manifest matches plan metadata | unit | Zero drift between manifest entry and plan JSON |

**Expected state after completion:**
- [ ] All new tests pass
- [ ] All existing BB-22 tests still pass
- [ ] `pnpm test` passes with zero failures
- [ ] John plan validation covers structure, content quality, passage ordering, and manifest/plan consistency

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create plan JSON (book slug pre-verified) |
| 2 | 1 | Update manifest (needs plan metadata) |
| 3 | 1, 2 | Add tests (needs both files to exist) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create plan JSON | [COMPLETE] | 2026-04-09 | Created `frontend/src/data/bible/plans/john-story-of-jesus.json` — 21 days, 3317 total words, all devotionals 100-200 words, all prompts 30-140 chars unique, all WEB quotes verified against john.json |
| 2 | Update manifest | [COMPLETE] | 2026-04-09 | Added john-story-of-jesus as second entry in manifest.json. All metadata matches plan JSON exactly — zero drift. No days field in manifest. psalms-30-days unchanged. |
| 3 | Add tests | [COMPLETE] | 2026-04-09 | Updated `planLoader.test.ts`: added John import, updated manifest test to check 2 entries, added loadPlan test, added 10 validation tests. 25 tests total, all pass. |
