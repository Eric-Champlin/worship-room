# Implementation Plan: BB-22 — 30 Days in the Psalms

**Spec:** `_specs/bb-22-psalms-30-days-plan.md`
**Date:** 2026-04-09
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable (content-only spec, no new UI)
**Master Spec Plan:** `_plans/2026-04-09-bb21-reading-plans-architecture.md` (loaded — BB-21 defines all infrastructure this spec uses)

---

## Architecture Context

### What This Spec Is

BB-22 is a **content creation** spec. It ships one JSON data file (the 30-day Psalms reading plan), updates the plan manifest from `[]` to one entry, and adds a test. No new components, hooks, routes, pages, or utilities. All rendering infrastructure was built in BB-21 (plan detail page, plan day page, reader banner, completion celebration) and BB-21.5 (plan browser grid).

### Key Files

- **Plan types:** `src/types/bible-plans.ts` — `Plan`, `PlanDay`, `PlanPassage`, `PlanMetadata`, `PlanTheme`
- **Plan loader:** `src/lib/bible/planLoader.ts` — `loadManifest()` (sync, reads manifest.json), `loadPlan(slug)` (async, dynamic `import()` of `@/data/bible/plans/${slug}.json`)
- **Manifest:** `src/data/bible/plans/manifest.json` — currently `[]`
- **Plans directory:** `src/data/bible/plans/` — currently only contains `manifest.json`
- **Existing plan loader test:** `src/lib/bible/__tests__/planLoader.test.ts` — tests empty manifest, nonexistent slug, missing fields
- **Psalms WEB data:** `src/data/bible/books/json/psalms.json` — 150 chapters, verse structure `{ number, text }`
- **Psalms hook:** `src/hooks/bible/usePlan.ts` — loads plan by slug
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
  book: string      // lowercase slug, e.g. "psalms"
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

### WEB Translation Verification — Critical

The spec's example devotionals quote scripture phrases from **non-WEB translations**. Verified divergences:

| Spec Quote | Actual WEB Text | Source |
|------------|----------------|--------|
| "I shall not want" (Psalm 23:1) | "I shall lack nothing" | ESV/KJV vs WEB |
| "Though I walk through the valley..." (Psalm 23:4) | "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me." | Abbreviated vs WEB |
| "you have caused my beloved and my friend to shun me; my companions have become darkness" (Psalm 88:18) | "You have put lover and friend far from me, and my friends into darkness." | ESV vs WEB |
| "Taste and see that the Lord is good" (Psalm 34:8) | "Oh taste and see that the LORD is good." | Missing "Oh", different capitalization |

**All quoted WEB phrases in the final devotionals must be verified against the actual WEB JSON data** before inclusion. The spec examples are illustrative only — the executor must cross-reference `psalms.json` for exact WEB wording.

### Verse Counts for All 30 Psalms (verified against WEB data)

| Day | Psalm | Verses | Reading Time (~5s/verse) |
|-----|-------|--------|-------------------------|
| 1 | 23 | 6 | ~0.5 min |
| 2 | 46 | 11 | ~1 min |
| 3 | 121 | 8 | ~0.7 min |
| 4 | 62 | 12 | ~1 min |
| 5 | 27 | 14 | ~1.2 min |
| 6 | 42 | 11 | ~1 min |
| 7 | 13 | 6 | ~0.5 min |
| 8 | 88 | 18 | ~1.5 min |
| 9 | 77 | 20 | ~1.7 min |
| 10 | 51 | 19 | ~1.6 min |
| 11 | 90 | 17 | ~1.4 min |
| 12 | 91 | 16 | ~1.3 min |
| 13 | 131 | 3 | ~0.3 min |
| 14 | 84 | 12 | ~1 min |
| 15 | 63 | 11 | ~1 min |
| 16 | 139 | 24 | ~2 min |
| 17 | 103 | 22 | ~1.8 min |
| 18 | 32 | 11 | ~1 min |
| 19 | 19 | 14 | ~1.2 min |
| 20 | 1 | 6 | ~0.5 min |
| 21 | 16 | 11 | ~1 min |
| 22 | 34 | 22 | ~1.8 min |
| 23 | 40 | 17 | ~1.4 min |
| 24 | 116 | 19 | ~1.6 min |
| 25 | 73 | 28 | ~2.3 min |
| 26 | 100 | 5 | ~0.4 min |
| 27 | 145 | 21 | ~1.8 min |
| 28 | 136 | 26 | ~2.2 min |
| 29 | 150 | 6 | ~0.5 min |
| 30 | 103 | 22 | ~1.8 min |

Average reading time: ~1.2 min/day. With devotional + reflection: **estimatedMinutesPerDay: 7** (reading + devotional + sitting with prompt).

### Recent Execution Log Deviations

BB-21 and BB-21.5 both had zero deviations. No design-system misunderstandings to flag.

---

## Auth Gating Checklist

**BB-22 introduces zero new auth-gated actions.** All auth gating is inherited from BB-21:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Start the plan | Inherited from BB-21 | N/A (no new code) | `useAuth` + `useAuthModal` (BB-21) |
| Mark day complete | Inherited from BB-21 | N/A (no new code) | `useAuth` + `useAuthModal` (BB-21) |
| View plan detail | Public — no auth | N/A | N/A |
| View plan day | Public — no auth | N/A | N/A |

---

## Design System Values (for UI steps)

N/A — BB-22 creates no UI. All rendering is handled by existing BB-21 components:
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
// src/types/bible-plans.ts — all types created in BB-21, consumed by BB-22's JSON
Plan, PlanDay, PlanPassage, PlanMetadata, PlanTheme
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:plans` | Read (by BB-21 infrastructure) | Plan progress — BB-22 adds no new writes |

BB-22 adds no new localStorage keys.

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

- [ ] BB-21 (reading plans architecture) is committed on `bible-redesign` — all 12 steps complete
- [ ] BB-21.5 (plan browser) is committed on `bible-redesign` — plan cards render from manifest
- [ ] `src/data/bible/plans/manifest.json` currently contains `[]`
- [ ] `src/data/bible/books/json/psalms.json` exists with 150 chapters
- [ ] `src/types/bible-plans.ts` exists with `Plan`, `PlanDay`, `PlanPassage`, `PlanMetadata` types
- [ ] `src/lib/bible/planLoader.ts` exists with `loadManifest()` and `loadPlan()` functions
- [ ] No deprecated patterns used (N/A — no UI code)
- [ ] All auth-gated actions inherited from BB-21 (no new auth gates)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `theme` value | `"comfort"` | The plan's emotional arc (entry → descent → ascent) is oriented toward healing/comfort, not prayer methodology. `"comfort"` is the closest match from the union. |
| `shortTitle` value | `"Psalms"` | Compact display in plan browser cards and the TodaysPlanCard widget. |
| `coverGradient` value | `"from-indigo-500/30 to-hero-dark"` | Indigo tone matches spec's "contemplative, ancient" direction. Future plans reserve amber (John), sage (Anxious), midnight (Sleep). |
| `estimatedMinutesPerDay` | `7` | Average Psalm reading (~1.2 min) + devotional (~1.5 min) + reflection prompt (~4 min sitting). Conservative estimate that doesn't overpromise. |
| Day 30 Psalm 103 reprise | Explicit — same chapter reference, unique devotional explaining the return | Spec requires the reprise to be called out in the devotional text. The `passages` array contains `{ book: "psalms", chapter: 103 }` — same as day 17. |
| Devotional quoted text | All WEB text verified against `psalms.json` before inclusion | Spec examples use ESV/KJV wording. Every quoted phrase must match WEB exactly. |
| Reflection prompt length | 30-140 characters per prompt, 1-2 prompts per day | Per spec. All 30 days must have distinct prompts — no repeated phrasing. |
| Devotional word count | 100-200 words per day, 3000-5400 total | Hard upper limit 200 per spec. The executor must count words per devotional. |
| Book field value | `"psalms"` (lowercase) | Matches the slug convention used by `BOOK_LOADERS` in `src/data/bible/index.ts`. Verify the exact slug before finalizing. |

---

## Implementation Steps

### Step 1: Verify Book Slug Convention

**Objective:** Confirm the exact book slug used for Psalms in the codebase so all passage references are correct.

**Files to read:**
- `src/constants/bible.ts` — check `BIBLE_BOOKS` for the Psalms slug
- `src/data/bible/index.ts` — check `BOOK_LOADERS` for the import key

**Details:**

Before creating the JSON file, verify whether the Psalms slug is `"psalms"`, `"psalm"`, or `"Psalms"`. The `PlanPassage.book` field must match whatever the Bible reader and BOOK_LOADERS use. Check:

1. The key used in `BOOK_LOADERS` for the Psalms import
2. The `slug` field in `BIBLE_BOOKS` for Psalms
3. Any existing passage references in the codebase (e.g., `votd` data)

This takes 2 minutes but prevents a broken plan where clicking "Read Psalm 23" navigates to a 404.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT assume the slug is `"psalms"` — verify
- DO NOT modify any existing files in this step

**Test specifications:** N/A — read-only step.

**Expected state after completion:**
- [ ] Confirmed exact Psalms book slug (expected: `"psalms"`)
- [ ] Confirmed slug matches `BOOK_LOADERS` key and `BIBLE_BOOKS` entry

---

### Step 2: Create Plan JSON File

**Objective:** Create `frontend/src/data/bible/plans/psalms-30-days.json` containing the complete 30-day reading plan with all 30 curated devotionals, reflection prompts, and passage references.

**Files to create:**
- `frontend/src/data/bible/plans/psalms-30-days.json` — CREATE: complete plan data

**Details:**

Create the JSON file conforming to the `Plan` type with these metadata fields:

```json
{
  "slug": "psalms-30-days",
  "title": "30 Days in the Psalms",
  "shortTitle": "Psalms",
  "description": "<~180 word description from spec>",
  "theme": "comfort",
  "duration": 30,
  "estimatedMinutesPerDay": 7,
  "curator": "Worship Room",
  "coverGradient": "from-indigo-500/30 to-hero-dark",
  "days": [ /* 30 PlanDay objects */ ]
}
```

Each day entry:

```json
{
  "day": 1,
  "title": "The Shepherd",
  "passages": [{ "book": "<verified-slug>", "chapter": 23 }],
  "devotional": "<100-200 word devotional paragraph>",
  "reflectionPrompts": ["<30-140 char prompt>"]
}
```

**The 30-day curation (from spec):**

| Day | Psalm | Title | Arc Phase |
|-----|-------|-------|-----------|
| 1 | 23 | The Shepherd | Entry |
| 2 | 46 | The Refuge | Entry |
| 3 | 121 | The Hills | Entry |
| 4 | 62 | The Silence | Entry |
| 5 | 27 | The Light | Entry |
| 6 | 42 | The Thirst | Descent |
| 7 | 13 | How Long | Descent |
| 8 | 88 | The Darkness | Descent |
| 9 | 77 | The Memory | Descent |
| 10 | 51 | The Return | Descent |
| 11 | 90 | The Dwelling Place | Dwelling |
| 12 | 91 | The Shelter | Dwelling |
| 13 | 131 | The Weaned Child | Dwelling |
| 14 | 84 | The Lovely Place | Dwelling |
| 15 | 63 | The Wilderness | Dwelling |
| 16 | 139 | The Search | Wisdom |
| 17 | 103 | The Mercy | Wisdom |
| 18 | 32 | The Forgiven | Wisdom |
| 19 | 19 | The Heavens | Wisdom |
| 20 | 1 | The Tree | Wisdom |
| 21 | 16 | The Refuge | Trust |
| 22 | 34 | The Testimony | Trust |
| 23 | 40 | The New Song | Trust |
| 24 | 116 | The Gratitude | Trust |
| 25 | 73 | The Sanctuary | Trust |
| 26 | 100 | The Joyful Noise | Ascent |
| 27 | 145 | The King | Ascent |
| 28 | 136 | The Refrain | Ascent |
| 29 | 150 | The Finale | Ascent |
| 30 | 103 | The Return | Ascent (reprise) |

**Devotional writing requirements:**

1. Each devotional is 100-200 words (hard upper limit 200). Total across 30 days: 3000-5400 words.
2. Each devotional does three things: sets context, names the emotional terrain, closes the gap between ancient text and present moment.
3. Voice: restrained, honest, never saccharine. No "God wants to speak to you today." Yes to "This Psalm was written by someone who lost everything."
4. **Day 8 (Psalm 88) is the most important day.** The devotional must convey that scripture has room for unresolved darkness. The tone must make the reader feel seen, not preached at.
5. **Day 30 (Psalm 103 reprise):** The devotional must explicitly call out that this is a return to day 17's Psalm and explain why. The reprise is about depth, not forward motion.
6. **WEB verification mandate:** Every quoted scripture phrase must be verified against `frontend/src/data/bible/books/json/psalms.json`. The spec's example quotes use ESV/KJV wording — do NOT copy them verbatim. Cross-reference the actual WEB text.

**Reflection prompt requirements:**

1. Each day has 1-2 prompts in a string array.
2. Each prompt is 30-140 characters.
3. All 30 days must have distinct prompts — no repeated phrasing across any two days.
4. Each prompt must feel specific to its Psalm and its day in the arc.

**Description text (~180 words):** Use the spec's provided description, with light revision if any wording references non-WEB translations.

**Auth gating:** N/A — data file only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT use any scripture quotes from ESV, NIV, KJV, or any translation other than WEB. Verify every quoted phrase against `psalms.json`.
- DO NOT exceed 200 words on any single devotional. Count words.
- DO NOT repeat a reflection prompt's phrasing across days.
- DO NOT include any imprecatory Psalms (Psalm 137, 109, 69, etc.)
- DO NOT include any Psalm other than the 30 specified in the curation table
- DO NOT use HTML or markdown in devotional text — plain text only, split on double newlines renders as `<p>` elements
- DO NOT add fields not in the `Plan` type (no `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`)
- DO NOT use `dangerouslySetInnerHTML` or any HTML in the JSON values

**Test specifications:** N/A — tested in Step 4.

**Expected state after completion:**
- [ ] `frontend/src/data/bible/plans/psalms-30-days.json` exists
- [ ] JSON is valid and parseable
- [ ] `slug` is `"psalms-30-days"`
- [ ] `duration` is `30`
- [ ] `days` array has exactly 30 entries
- [ ] Every day has `day` (1-30), `title`, `passages` (with `book: "<verified-slug>"`, `chapter`), `devotional`, `reflectionPrompts`
- [ ] Every `devotional` is 100-200 words
- [ ] Every `reflectionPrompts` entry is 30-140 characters
- [ ] No duplicate reflection prompts
- [ ] All scripture quotes verified against WEB
- [ ] Day 8 devotional handles Psalm 88 with care
- [ ] Day 30 devotional explicitly explains the Psalm 103 reprise
- [ ] No imprecatory Psalms present
- [ ] Emotional arc follows: entry (1-5), descent (6-10), dwelling (11-15), wisdom (16-20), trust (21-25), ascent (26-30)

---

### Step 3: Update Manifest

**Objective:** Add the `psalms-30-days` entry to `manifest.json` so the plan appears in the browser grid and is discoverable by the plan loader.

**Files to modify:**
- `frontend/src/data/bible/plans/manifest.json` — MODIFY: replace `[]` with one-entry array

**Details:**

Replace the contents of `manifest.json` with an array containing the plan's metadata (all fields from the JSON file except `days`):

```json
[
  {
    "slug": "psalms-30-days",
    "title": "30 Days in the Psalms",
    "shortTitle": "Psalms",
    "description": "<same description as in the plan JSON>",
    "theme": "comfort",
    "duration": 30,
    "estimatedMinutesPerDay": 7,
    "curator": "Worship Room",
    "coverGradient": "from-indigo-500/30 to-hero-dark"
  }
]
```

**Critical: No drift.** Every metadata field must exactly match the plan JSON. If the plan JSON has `"curator": "Worship Room"`, the manifest must have the identical string. Copy-paste to avoid drift.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT include `days` in the manifest entry — `PlanMetadata = Omit<Plan, 'days'>`
- DO NOT add any fields not in the `Plan` type
- DO NOT have any difference between manifest metadata and plan JSON metadata

**Test specifications:** N/A — tested in Step 4.

**Expected state after completion:**
- [ ] `manifest.json` contains exactly 1 entry
- [ ] Manifest entry's `slug` is `"psalms-30-days"`
- [ ] All metadata fields match the plan JSON exactly (no drift)
- [ ] `days` field is not present in the manifest entry

---

### Step 4: Add Tests

**Objective:** Add test cases that validate the plan JSON loads correctly and passes structural validation. Update existing tests that assert on the empty manifest.

**Files to modify:**
- `frontend/src/lib/bible/__tests__/planLoader.test.ts` — MODIFY: update empty manifest test, add plan validation tests

**Details:**

The existing `planLoader.test.ts` has a test `'returns empty array'` for `loadManifest()`. This test will fail now that the manifest has an entry. Update it and add new tests:

1. **Update manifest test:** Change `expect(result).toEqual([])` to verify the manifest contains the `psalms-30-days` entry with correct metadata shape.

2. **Add plan loading test:** Test that `loadPlan('psalms-30-days')` returns `{ plan: <Plan>, error: null }` and the plan has:
   - `slug === 'psalms-30-days'`
   - `duration === 30`
   - `days.length === 30`
   - `title === '30 Days in the Psalms'`

3. **Add structural validation tests:**
   - Every day has `day` number 1-30 (continuous, no gaps)
   - Every day has a non-empty `title`
   - Every day has at least one passage in `passages`
   - Every passage has `book` matching the verified Psalms slug and a valid `chapter` (1-150)
   - Every day has a non-empty `devotional`
   - Every day has a non-empty `reflectionPrompts` array with 1-2 entries

4. **Add content quality tests:**
   - No devotional exceeds 200 words
   - No devotional is under 100 words
   - Every reflection prompt is 30-140 characters
   - No duplicate reflection prompts across all 30 days
   - `theme` is one of the valid `PlanTheme` values
   - Manifest metadata matches plan metadata (no drift)

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT mock the plan JSON — import the real file for validation
- DO NOT test UI rendering — that's BB-21's responsibility
- DO NOT add snapshot tests — they're brittle for content files

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| manifest contains psalms-30-days | unit | Verify `loadManifest()` returns array with the plan entry |
| plan loads without error | unit | `loadPlan('psalms-30-days')` returns `{ plan, error: null }` |
| plan has correct metadata | unit | slug, title, duration, theme, curator match expected |
| all 30 days present with continuous numbering | unit | days 1-30 with no gaps |
| every day has required fields | unit | title, passages, devotional, reflectionPrompts all non-empty |
| all passages reference valid Psalms | unit | book slug correct, chapter 1-150 |
| devotional word counts in range | unit | 100-200 words per day |
| reflection prompts in character range | unit | 30-140 chars each |
| no duplicate reflection prompts | unit | All prompts are distinct |
| manifest matches plan metadata | unit | Every PlanMetadata field matches between manifest and plan |

**Expected state after completion:**
- [ ] All new tests pass
- [ ] `pnpm test` passes (including updated manifest test)
- [ ] Plan validation covers structure, content quality, and manifest/plan consistency

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Verify book slug convention |
| 2 | 1 | Create plan JSON (needs correct slug) |
| 3 | 2 | Update manifest (needs plan metadata) |
| 4 | 2, 3 | Add tests (needs both files to exist) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Verify book slug convention | [COMPLETE] | 2026-04-09 | Confirmed slug is `"psalms"` — matches BIBLE_BOOKS, BOOK_LOADERS, and psalms.json |
| 2 | Create plan JSON | [COMPLETE] | 2026-04-09 | Created `psalms-30-days.json` — 30 days, 4565 total words, 33 prompts, all WEB-verified |
| 3 | Update manifest | [COMPLETE] | 2026-04-09 | `manifest.json` updated — 1 entry, zero drift from plan JSON |
| 4 | Add tests | [COMPLETE] | 2026-04-09 | 14 tests in planLoader.test.ts + fixed usePlansManifest.test.ts empty-manifest assertion. All pass. Build clean. |
