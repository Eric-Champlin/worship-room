# Implementation Plan: BB-24 — When You're Anxious (14-Day Topical Plan)

**Spec:** `_specs/bb-24-when-youre-anxious.md`
**Date:** 2026-04-10
**Branch:** `bible-redesign` (no new branch)
**Design System Reference:** `_plans/recon/design-system.md` (not applicable — content-only spec, no new UI)
**Recon Report:** not applicable (content-only spec, no new UI)
**Master Spec Plan:** `_plans/2026-04-09-bb21-reading-plans-architecture.md` (loaded — BB-21 defines all infrastructure this spec uses)

---

## Architecture Context

### What This Spec Is

BB-24 is a **content creation** spec — the third reading plan after BB-22 (Psalms, 30 days) and BB-23 (John, 21 days). It ships one JSON data file (the 14-day *When You're Anxious* topical plan), updates the plan manifest from two entries to three, and adds a new describe block to the existing plan loader test file. **No new components, hooks, routes, pages, or utilities.** All rendering infrastructure was built in BB-21 (plan detail page, plan day page, reader banner, completion celebration) and BB-21.5 (plan browser grid).

### Key Differences from BB-22 and BB-23

- **Topical, not sequential or curated-by-book.** Mixes passages across Old and New Testament books (Psalms, 1 Kings, Matthew, 1 Samuel, Mark, Philippians, Isaiah, Luke, 2 Corinthians, Lamentations).
- **Verse ranges, not full chapters.** 9 of the 14 days use `startVerse`/`endVerse`; 5 days are full chapters (Psalm 13, Psalm 46, Psalm 131 — short Psalms — and… only those three as full chapters). **BB-24 is the first plan in the codebase to use verse ranges.** BB-22 and BB-23 both use full chapters only.
- **14 days, not 30 or 21.** Shorter container — the anxious user has limited bandwidth.
- **7 minutes/day estimate** (mixed length; honor the "user in distress has low bandwidth" principle).
- **Sage/emerald gradient**, visually distinct from BB-22 (indigo) and BB-23 (amber).
- **`emotional` theme**, not `comfort` (BB-22) or `foundation` (BB-23).
- **Direct, permission-giving, restrained voice** — distinct from BB-22's contemplative voice and BB-23's narrative voice. Short sentences. Acknowledges history users may have with weaponized verses.
- **Content is the highest-stakes writing in the Bible wave.** The spec makes this explicit: if a user opens the plan during a panic attack and finishes day 1 feeling met, it worked; if they feel preached at, it failed.

### Key Files

- **Plan types:** `frontend/src/types/bible-plans.ts` (54 lines) — `Plan`, `PlanDay`, `PlanPassage`, `PlanMetadata`, `PlanTheme`
- **Plan loader:** `frontend/src/lib/bible/planLoader.ts` — `loadManifest()` (sync), `loadPlan(slug)` (async, dynamic `import()` of `@/data/bible/plans/${slug}.json`)
- **Manifest:** `frontend/src/data/bible/plans/manifest.json` — currently contains **2 entries** (`psalms-30-days`, `john-story-of-jesus`)
- **Plans directory:** `frontend/src/data/bible/plans/` — contains `manifest.json`, `psalms-30-days.json`, `john-story-of-jesus.json`
- **Existing plan loader test:** `frontend/src/lib/bible/__tests__/planLoader.test.ts` (225 lines) — validates manifest, plan loading, BB-22's structural/content quality, BB-23's structural/content quality. **This is where BB-24's test describe block goes.**
- **Bible book JSONs:** `frontend/src/data/bible/books/json/*.json` — one file per book; structure is an array of chapter objects each with `bookSlug`, `chapter`, `verses` (array of `{ number, text }`)
- **Plan detail page:** `frontend/src/pages/BiblePlanDetail.tsx` (renders plan metadata + day list)
- **Plan day page:** `frontend/src/pages/BiblePlanDay.tsx` (renders devotional + passages + reflection prompts)

### Plan Type (exact shape the JSON must conform to)

```typescript
type PlanTheme = 'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'

interface PlanPassage {
  book: string          // lowercase slug, e.g. "psalms", "1-samuel", "2-corinthians"
  chapter: number
  startVerse?: number   // optional — only for verse-range days
  endVerse?: number     // optional — only for verse-range days
  label?: string        // optional — not used by BB-24
}

interface PlanDay {
  day: number           // 1-indexed
  title: string
  passages: PlanPassage[]
  devotional?: string
  reflectionPrompts?: string[]
}

interface Plan {
  slug: string
  title: string
  shortTitle: string
  description: string
  theme: PlanTheme
  duration: number
  estimatedMinutesPerDay: number
  curator: string
  coverGradient: string    // Tailwind gradient class
  days: PlanDay[]
}

type PlanMetadata = Omit<Plan, 'days'>
```

### Book Slug Verification (Pre-Confirmed)

All book slugs referenced by BB-24's passages exist in `frontend/src/data/bible/books/json/`. Verified via `ls`:

| Book (display) | Slug in JSON | File |
|----------------|--------------|------|
| Psalms | `psalms` | `psalms.json` |
| 1 Kings | `1-kings` | `1-kings.json` |
| Matthew | `matthew` | `matthew.json` |
| 1 Samuel | `1-samuel` | `1-samuel.json` |
| Mark | `mark` | `mark.json` |
| Philippians | `philippians` | `philippians.json` |
| Isaiah | `isaiah` | `isaiah.json` |
| Luke | `luke` | `luke.json` |
| 2 Corinthians | `2-corinthians` | `2-corinthians.json` |
| Lamentations | `lamentations` | `lamentations.json` |

**Slug format:** lowercase, numbered-book books use hyphens (`1-kings`, `1-samuel`, `2-corinthians`). This matches the `bookSlug` field inside each book JSON.

### Book JSON Structure (for verse-count validation)

```json
[
  {
    "bookSlug": "1-samuel",
    "chapter": 1,
    "verses": [
      { "number": 1, "text": "..." },
      { "number": 2, "text": "..." },
      ...
    ]
  },
  { "bookSlug": "1-samuel", "chapter": 2, "verses": [...] },
  ...
]
```

To validate a verse range (e.g. Psalm 139:1-12), the test imports the book JSON, finds the chapter where `chapter === passage.chapter`, and asserts `endVerse <= verses.length`.

### Plan Loader Validation (BB-21)

`loadPlan(slug)` validates: `data.slug`, `data.title`, `data.duration`, and `Array.isArray(data.days)`. If any are missing, returns `{ plan: null, error }`. The BB-24 JSON must pass all four checks.

### Existing Test File Structure (planLoader.test.ts)

Current structure:
1. Imports: `loadManifest`, `loadPlan`, `johnPlanData`, `planData` (psalms), `manifestData`, `VALID_THEMES`
2. `describe('loadManifest')` — checks 2 entries, both slugs present
3. `describe('loadPlan')` — 5 tests (nonexistent, never throws, validates required fields, loads psalms, loads john)
4. `describe('psalms-30-days plan validation')` — metadata, continuous numbering, required fields, valid Psalms, word counts, char ranges, no duplicate prompts, valid theme, manifest drift
5. `describe('john-story-of-jesus plan validation')` — same pattern, 10 tests, plus "no passage has verse ranges" and "passages in order"

BB-24's describe block mirrors this pattern but **inverts** the "no passage has verse ranges" test — BB-24 is the first plan that *does* use verse ranges, and has its own constraint: ranges must be valid against the actual WEB verse counts.

### WEB Translation Verification — Critical

Devotional text must not misquote WEB. Any phrase in double quotes in the devotional must be verified against the actual WEB text in `frontend/src/data/bible/books/json/*.json`. Key phrases to cross-reference at execution time:

| Day | Key WEB Phrase to Verify |
|-----|--------------------------|
| 1 | Psalm 139:1 — "you have searched me" vs "you have searched me and known me" |
| 2 | 1 Kings 19:12 — the "still small voice" phrase in WEB (WEB uses "still small voice" or "gentle whisper"?) |
| 3 | Matthew 6:26 — "look at the birds" vs "consider the birds" — WEB exact |
| 4 | 1 Samuel 1:13 — Hannah's lips moving, her voice not heard |
| 5 | Psalm 13:1 — "How long, Yahweh?" — WEB uses "Yahweh", not "O Lord" |
| 6 | Mark 4:39 — "Peace, be still!" WEB exact |
| 7 | Philippians 4:6-7 — "don't be anxious about anything" WEB exact, and the "peace of God which surpasses all understanding" phrasing |
| 8 | Psalm 46:10 — "Be still, and know that I am God" — WEB exact |
| 9 | Luke 22:44 records the sweat-as-drops-of-blood; Matthew 26 has "let this cup pass from me" — verify Matthew 26:39 WEB exact |
| 10 | Isaiah 43:2 — "When you pass through the waters" WEB exact |
| 11 | Luke 8:46 — "Someone did touch me, for I perceived power going out of me" WEB exact |
| 12 | Psalm 131:2 — "weaned child with his mother" WEB exact |
| 13 | 2 Corinthians 12:9 — "My grace is sufficient for you, for my power is made perfect in weakness" WEB exact |
| 14 | Lamentations 3:22-23 — "mercies new every morning" phrasing in WEB — WEB may render this as "lovingkindnesses" or similar |

**If a quoted phrase in the devotional does not match the WEB text verbatim, rewrite the devotional to paraphrase without quotes, OR use the exact WEB wording.**

### Recent Execution Log Deviations

The 3 most recent plans are:
- `2026-04-09-bb23-john-story-of-jesus.md` — 3 steps, zero deviations, all devotionals within word count, all WEB quotes verified
- `2026-04-09-bb22-psalms-30-days-plan.md` — zero deviations
- `2026-04-09-bb21-5-plan-browser.md` — UI spec, not content; not relevant to BB-24

No design system deviations to flag. The content-plan pattern (Step 1 JSON / Step 2 manifest / Step 3 tests) is proven.

---

## Auth Gating Checklist

**BB-24 introduces zero new auth-gated actions.** All auth gating is inherited from BB-21:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View plan in browser grid | Public — no auth | N/A (no new code) | N/A |
| View plan detail page (description, day list) | Public — no auth | N/A (no new code) | N/A |
| Start the plan | Inherited from BB-21 | N/A (no new code) | BB-21's `useAuth` + `useAuthModal` |
| Mark day complete | Inherited from BB-21 | N/A (no new code) | BB-21's `useAuth` + `useAuthModal` |
| View plan day page (devotional, passage) | Public — no auth | N/A (no new code) | N/A |
| Read passage from plan (navigates to Bible reader) | Public — no auth | N/A (no new code) | N/A |
| Pause plan | Inherited from BB-21 | N/A (no new code) | BB-21's `useAuth` + `useAuthModal` |

**Security verification required at execution time:** Confirm (via manual browse or existing tests) that logged-out users can read the full `when-youre-anxious` detail page and every day's devotional without being interrupted by the auth modal. This is called out specifically in the spec's Safety Integrity acceptance criteria.

---

## Design System Values (for UI steps)

N/A — BB-24 creates no UI. All rendering is handled by existing BB-21 components:

- Plan detail page: `BiblePlanDetail.tsx`
- Plan day page: `BiblePlanDay.tsx`
- Plan browser card: `PlanBrowseCard.tsx` (BB-21.5)
- Reader banner: `ActivePlanReaderBanner.tsx`
- Completion celebration: `PlanCompletionCelebration.tsx` (uses the existing `emotional` category text verbatim — BB-24 does not customize)

The only visual decision is `coverGradient`, which determines the plan card's background color in the browser grid and detail page hero. Candidate values (all valid Tailwind classes already in the repo's arbitrary gradient utility syntax):

- `"from-emerald-600/30 to-hero-dark"` — preferred (sage/emerald, "earthy, alive but not loud")
- `"from-teal-600/30 to-hero-dark"` — alternate
- `"from-green-700/30 to-hero-dark"` — alternate

**Decision: `from-emerald-600/30 to-hero-dark`.** Rationale in Edge Cases table below.

---

## Design System Reminder

N/A — No UI steps in this plan. All rendering is handled by existing components. The only visual field is `coverGradient`, which is a plain Tailwind class string passed through to BB-21's existing plan card rendering.

---

## Shared Data Models (from BB-21)

### Types consumed (not modified)

```typescript
// frontend/src/types/bible-plans.ts — all types created in BB-21, consumed by BB-24's JSON
Plan, PlanDay, PlanPassage, PlanMetadata, PlanTheme
```

BB-24 adds no new types and modifies no existing types. **No schema changes to `Plan`.**

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:plans` | Read (by BB-21 infrastructure only — BB-24 does not write directly) | Plan progress store. BB-24 adds no new writes. Users starting/completing the anxiety plan write through BB-21's existing `plansStore` API. |

BB-24 adds no new localStorage keys. **No update to `11-local-storage-keys.md`** is required.

---

## Responsive Structure

N/A — No new UI. Responsive behavior is inherited from BB-21's plan detail and plan day pages.

| Breakpoint | Width | Inherited Layout |
|-----------|-------|------------------|
| Mobile | < 640px | Single column, collapsible day list, sticky mark-complete button. Devotional body text at `text-[17px] leading-[1.75-1.8]`. 44px minimum tap targets. |
| Tablet | 640-1024px | Single column, wider margins |
| Desktop | > 1024px | Hero full-width, day list full-width, inline mark-complete |

---

## Inline Element Position Expectations

N/A — no inline-row layouts introduced in this feature. All rendering flows through BB-21's existing plan detail and plan day components, which were verified during the BB-21 execution.

---

## Vertical Rhythm

N/A — no new UI sections. Spacing is inherited from BB-21's plan detail page and plan day page.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-21 (reading plans architecture) is committed on `bible-redesign`
- [ ] BB-21.5 (plan browser) is committed on `bible-redesign`
- [ ] BB-22 (`psalms-30-days`) is committed on `bible-redesign`
- [ ] BB-23 (`john-story-of-jesus`) is committed on `bible-redesign`
- [ ] `frontend/src/data/bible/plans/manifest.json` currently contains exactly 2 entries (`psalms-30-days`, `john-story-of-jesus`)
- [ ] `frontend/src/types/bible-plans.ts` exists unchanged with `PlanTheme` union containing `'emotional'`
- [ ] `frontend/src/lib/bible/planLoader.ts` exists with `loadManifest()` and `loadPlan()` functions
- [ ] `frontend/src/lib/bible/__tests__/planLoader.test.ts` currently contains the `john-story-of-jesus plan validation` describe block (line ~142)
- [ ] All 10 book JSONs referenced exist in `frontend/src/data/bible/books/json/` (psalms, 1-kings, matthew, 1-samuel, mark, philippians, isaiah, luke, 2-corinthians, lamentations) — pre-verified above
- [ ] All auth-gated actions are inherited from BB-21 — no new auth gates
- [ ] Design system values are verified (N/A — no UI)
- [ ] All [UNVERIFIED] values flagged with verification methods — there are **0** UNVERIFIED values in this plan (all passages are canonical, all metadata is spec-locked, `coverGradient` choice is documented in Edge Cases)
- [ ] Recon report loaded if available — N/A, content-only spec
- [ ] Prior specs in the sequence (BB-21, BB-21.5, BB-22, BB-23) are complete and committed
- [ ] No deprecated patterns used (N/A — no UI code)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `theme` value | `"emotional"` | Direct match in the `PlanTheme` union. Spec says "emotional topical plan." Completion celebration text is keyed on this category value. |
| `shortTitle` value | `"Anxious"` | Per spec. Compact display in plan browser cards and TodaysPlanCard widget. |
| `coverGradient` value | `"from-emerald-600/30 to-hero-dark"` | Per spec's "sage/earthy" intent and the 🌿 emoji rationale. Emerald-600 at 30% alpha reads as calming, grounding. Distinct from BB-22 indigo and BB-23 amber. Teal was considered but reads cooler; emerald is warmer-earthy. |
| `estimatedMinutesPerDay` | `7` | Per spec. Passages are mixed length — some are short (Psalm 131 is 3 verses), some are full chapters. 7 honors "user in distress has low bandwidth" without over-promising. Matches BB-22's 7, lower than BB-23's 10. |
| `duration` | `14` | Per spec. Matches the length of the curated `days` array. |
| `curator` | `"Worship Room"` | Per spec. |
| Day 1 verse range | `startVerse: 1, endVerse: 12` on Psalm 139 | Per spec acceptance criteria — Day 1 uses verses 1-12, NOT the full Psalm. The "if I ascend into heaven... darkness and light are both alike to you" portion. Day 1 pragmatic test: a user in distress cannot read a 24-verse Psalm on day 1. |
| Day 5, 8, 12 full-chapter use | No `startVerse`/`endVerse` on Psalm 13, Psalm 46, Psalm 131 | These are short Psalms (Psalm 13: 6 verses, Psalm 46: 11 verses, Psalm 131: 3 verses). Full-chapter reads are manageable. |
| Days 2, 3, 4, 6, 7, 9, 10, 11, 13, 14 verse ranges | Use `startVerse`/`endVerse` | Per spec acceptance criteria — passages are hard-locked to specific verse ranges. |
| Manifest order | `when-youre-anxious` as the **third** entry (after `psalms-30-days`, `john-story-of-jesus`) | Per spec. The plan browser renders manifest order. |
| Devotional voice | Direct, short sentences, permission-giving, acknowledging | Per spec. **Must** be distinguishable from BB-22 (contemplative) and BB-23 (narrative). If a BB-24 devotional could be dropped into BB-22 or BB-23, it is wrong. |
| Forbidden content | Jeremiah 29:11 (any reference, any quote), "if you have enough faith" and variants, "God will heal you" and variants, clinical language (anxiety disorder, DSM), "open your heart", "let God in", "God wants to speak to you", "just trust", "the devil is attacking you", faith-failure framing, therapist/medication recommendations, "share your testimony", "are you feeling better?" prompts | Zero tolerance. Plan phase must scan every draft against this list. |
| Day 7 Philippians devotional | Must reclaim the verse: acknowledge it has been used to shame anxious people + note Paul is in prison + reframe "anxious for nothing" as invitation from someone on the other side + clarify "peace of God" is not a promise anxiety goes away | Load-bearing devotional #1. The spec says getting this wrong undermines the whole plan. |
| Day 9 Gethsemane devotional | Must state: Jesus himself was in distress, asked to be delivered, was not delivered, the angel came to strengthen not remove. Language equivalent to "the most trusting person in human history was in agony and was not removed from it." | Load-bearing devotional #2. Central theological claim of the plan: anxiety is not a faith failure because Jesus had it. |
| Day 14 Lamentations devotional | Must be quiet, not triumphant. Must not promise user is "done" with anxiety. Must acknowledge user will still be anxious sometimes tomorrow. | Closing move. No "victory" framing. |
| Day 5 reflection prompt | Canonical: "What would it look like to be that honest with God about what you're feeling?" | Spec-locked. |
| Day 14 reflection prompt | Canonical: "What's one verse from these 14 days you want to remember on a hard day?" | Spec-locked. |
| Description phrase | Must include "scripture used as a club against it" verbatim (or an exact equivalent). Spec says non-negotiable. | The single line that signals to anxious Christians with religious trauma that the plan is different. |
| Description named figures | Must name ≥ 4 of: Hannah, Elijah, the disciples, David, Jesus in Gethsemane | Per acceptance criteria. |
| Description length | 180-240 words inclusive | Per acceptance criteria. |
| Reference text in spec | Use as direction, may refine but must not soften | The spec provides a reference description (~235 words) and reference devotional tones for days 7, 9, 14. The plan phase can tighten but cannot weaken any of the four load-bearing moves. |
| Completion celebration | Inherited `emotional` category text verbatim, no customization | Per spec. BB-21 owns this copy; BB-24 does not override. |
| Badges for completing anxiety plan | None — do not add | Per spec: "A user who finishes 14 days does not need a digital trophy." |
| Analytics on anxiety plan | None — zero tracking | Per spec: "Especially not this one." |
| AI safety runtime checks | N/A — no AI content, no user input | Content is curated offline. Safety is enforced through the forbidden-phrases list and the code review pass, not through runtime checks. |
| In-devotional crisis disclaimers | **Do not add.** No "consult a doctor" inserts in devotional bodies. | Per spec. Interrupts the reading experience for a user already in distress. |
| `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`, `id`, `durationDays` | **Do not add** these fields to the JSON | They do not exist on the `Plan` type. Same constraint as BB-22 and BB-23. |

**No [UNVERIFIED] values in this plan.** Every passage is canonical, every field is either spec-locked or decided in this table with rationale. The only subjective decision is the exact wording of 14 devotionals and 14 reflection prompts, which is content work guarded by the forbidden-phrases acceptance criteria and code review.

---

## Implementation Steps

### Step 1: Create Plan JSON File

**Objective:** Create `frontend/src/data/bible/plans/when-youre-anxious.json` containing the complete 14-day reading plan with all 14 devotionals, reflection prompts, and passage references (with verse ranges where applicable).

**Files to create:**
- `frontend/src/data/bible/plans/when-youre-anxious.json` — CREATE: complete plan data conforming to the `Plan` type

**Details:**

Create the JSON file with these top-level metadata fields:

```json
{
  "slug": "when-youre-anxious",
  "title": "When You're Anxious",
  "shortTitle": "Anxious",
  "description": "<180-240 word description — see Description section below>",
  "theme": "emotional",
  "duration": 14,
  "estimatedMinutesPerDay": 7,
  "curator": "Worship Room",
  "coverGradient": "from-emerald-600/30 to-hero-dark",
  "days": [ /* 14 PlanDay objects — see 14-day structure below */ ]
}
```

**The 14-day structure (hard-locked passages — do not change):**

| Day | Book | Chapter | startVerse | endVerse | Title |
|-----|------|---------|------------|----------|-------|
| 1 | `psalms` | 139 | 1 | 12 | You are seen |
| 2 | `1-kings` | 19 | 1 | 13 | Elijah in the cave |
| 3 | `matthew` | 6 | 25 | 34 | Look at the birds |
| 4 | `1-samuel` | 1 | 1 | 20 | Hannah's prayer |
| 5 | `psalms` | 13 | — | — | How long, O Lord? |
| 6 | `mark` | 4 | 35 | 41 | The disciples in the storm |
| 7 | `philippians` | 4 | 4 | 9 | Be anxious for nothing |
| 8 | `psalms` | 46 | — | — | Be still, and know |
| 9 | `matthew` | 26 | 36 | 46 | Gethsemane |
| 10 | `isaiah` | 43 | 1 | 5 | I have called you by name |
| 11 | `luke` | 8 | 40 | 48 | The woman who touched the hem |
| 12 | `psalms` | 131 | — | — | A weaned child |
| 13 | `2-corinthians` | 12 | 7 | 10 | My grace is sufficient |
| 14 | `lamentations` | 3 | 19 | 26 | Mercies new every morning |

For days 5, 8, 12: omit `startVerse` and `endVerse` entirely (full chapters).
For all other days: include both `startVerse` and `endVerse` as numbers.

**Per-day JSON shape:**

```json
{
  "day": 1,
  "title": "You are seen",
  "passages": [{ "book": "psalms", "chapter": 139, "startVerse": 1, "endVerse": 12 }],
  "devotional": "<100-200 word devotional — see voice requirements below>",
  "reflectionPrompts": ["<30-140 char prompt, specific to this passage>"]
}
```

For full-chapter days (5, 8, 12):

```json
{
  "day": 5,
  "title": "How long, O Lord?",
  "passages": [{ "book": "psalms", "chapter": 13 }],
  "devotional": "...",
  "reflectionPrompts": ["What would it look like to be that honest with God about what you're feeling?"]
}
```

**The description (~180-240 words, load-bearing):**

Use the spec's reference description (spec lines 71-77) as the working draft. Word count the final text. It must:

1. Acknowledge the user's likely history with weaponized anxiety verses (hurt and helped, sometimes both)
2. Include the phrase **"scripture used as a club against it"** verbatim (or an exact equivalent that unambiguously acknowledges harmful religious advice)
3. Name ≥ 4 biblical figures who were anxious: pick from {Hannah, Elijah, the disciples, David, Jesus in Gethsemane}
4. Set honest expectations — contain language equivalent to "This plan won't fix your anxiety" (or "Nothing in fourteen days will")
5. End quietly — not triumphantly. The last sentence is a permission, not a promise.

The spec's reference text (lines 71-77) is approximately 235 words and hits all 5 criteria. **Plan phase may tighten for word count but must not soften any of the 5 criteria.** If the reference text already falls within 180-240 words, use it as-is. Verify the word count.

**Devotional writing requirements (apply to every day):**

1. **Word count: 100-200 words per day (hard limits). Total across 14 days: 1400-2800 words.** Count words per day with `devotional.split(/\s+/).filter(w => w.length > 0).length`.
2. **Voice:** Direct. Short sentences. Permission-giving. Acknowledging. Restrained at the heavy moments (Gethsemane, Hannah, Lamentations — let the text carry the weight).
3. **Must not sound like BB-22 (contemplative) or BB-23 (narrative).** If a BB-24 devotional could be dropped into BB-22 or BB-23, rewrite it.
4. **Stay close to the text.** Name what's happening in the passage: concrete images, specific moments. Do not extract universal lessons or prescribe application.
5. **Do not promise healing.** Do not ask the user to perform progress.
6. **Day 3, 7, 8, 14: explicitly acknowledge the user's history with the verse.** These are weaponized or famous-and-misunderstood passages. Each devotional must name the weaponization and reframe.
7. **Day 7 (Philippians 4:4-9) is load-bearing #1.** Must: (a) state the verse has been used to make anxious people feel guilty, (b) note Paul is writing from prison, (c) reframe "be anxious for nothing" as an invitation from someone on the other side, (d) clarify "peace of God which surpasses all understanding" is NOT a promise that anxiety goes away but a promise that something else is also there when it doesn't. Use the spec reference tone (lines 144-146) as direction; refine but do not soften.
8. **Day 9 (Matthew 26:36-46, Gethsemane) is load-bearing #2.** Must state: Jesus himself was in distress, Jesus himself asked to be delivered, Jesus himself was not given the deliverance. The angel came to strengthen, not remove. Language equivalent to "the most trusting person in human history was in agony and was not removed from it." Use the spec reference tone (lines 153-154) as direction.
9. **Day 14 (Lamentations 3:19-26) is the closing devotional.** Must be quiet, not triumphant. Must not promise the user is "done" with anxiety. Must contain language acknowledging the user will still be anxious sometimes tomorrow. Must read Lamentations in its actual context (written after Jerusalem was destroyed — a book of grief, not uplift). Use the spec reference tone (lines 159-160) as direction.
10. **Forbidden phrases (zero tolerance, scan every draft):**
    - "if you have enough faith" / "if you trusted enough" / "if your faith were stronger" / "if you had more faith"
    - "God will heal you" / any variant promising that anxiety will be cured
    - **"Jeremiah 29:11"** — do not reference, do not quote, do not include in any passage. Also scan for the phrase "plans to prosper you" or "plans to give you a future."
    - "God wants to speak to you" / "open your heart" / "let God in"
    - "just trust" / "just pray more" / "the devil is attacking you"
    - Any phrase framing anxiety as a faith failure, spiritual attack, moral failing, or sin
    - Clinical language: "anxiety disorder", "generalized anxiety", DSM category names, medication names
    - Therapist/treatment/app recommendations
    - "share your testimony" / "victory" / "conquered anxiety"
    - "are you feeling better?" in any form
11. **WEB verification mandate:** Every quoted scripture phrase in a devotional must match the WEB text in `frontend/src/data/bible/books/json/*.json`, not paraphrased from ESV, NIV, KJV, or NLT. If a quote is hard to verify, paraphrase without quotes.
12. **HTML and Markdown forbidden:** Devotional text is plain text split on double newlines. No `<em>`, no `**bold**`, no bullets. Paragraph breaks are `\n\n`.

**Reflection prompt requirements:**

1. Each day has exactly 1 prompt in a string array (`reflectionPrompts: ["..."]`).
2. Each prompt is **30-140 characters** (count `prompt.length`).
3. All 14 prompts must be distinct — no repeated phrasing across any two days.
4. Each prompt must reference something specific from its passage — must not work for a different day.
5. **Day 5 prompt (canonical):** "What would it look like to be that honest with God about what you're feeling?" (89 chars — within range).
6. **Day 14 prompt (canonical):** "What's one verse from these 14 days you want to remember on a hard day?" (72 chars — within range).
7. **Forbidden prompt patterns:**
   - "Are you feeling better?" / any variant asking the user to perform progress
   - "What is God trying to teach you through your anxiety?" / any variant that frames anxiety as a lesson
   - Generic "what stood out to you?" prompts — must be passage-specific

**Auth gating:** N/A — data file only.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A — no inline-row layouts.

**Guardrails (DO NOT):**

- DO NOT exceed 200 words on any single devotional. Count words before committing.
- DO NOT go below 100 words on any single devotional. Count words.
- DO NOT let any prompt fall outside 30-140 characters.
- DO NOT repeat a reflection prompt across days.
- DO NOT reference, quote, or link to Jeremiah 29:11 anywhere.
- DO NOT use any forbidden phrase from item 10 above.
- DO NOT use scripture quotes from ESV, NIV, KJV, or NLT — verify every quoted phrase against `*.json` in `frontend/src/data/bible/books/json/`.
- DO NOT use HTML or Markdown in devotional text — plain text split on `\n\n`.
- DO NOT add fields not in the `Plan` type (no `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`, `id`, `durationDays`).
- DO NOT modify the existing `psalms-30-days.json` or `john-story-of-jesus.json` files.
- DO NOT change the passage list in the 14-day structure table. All passages are hard-locked by the spec.
- DO NOT introduce clinical language or mental health diagnoses.
- DO NOT add in-devotional crisis hotline disclaimers or "consult a professional" inserts.
- DO NOT soften the Day 7, Day 9, or Day 14 load-bearing moves. Acknowledging the weaponization, naming Jesus' distress, and refusing to promise recovery are non-negotiable.
- DO NOT add `startVerse`/`endVerse` to Days 5, 8, 12 — those are full chapters and the validation test checks for the absence of those properties on those days.
- DO NOT omit `startVerse`/`endVerse` on Days 1, 2, 3, 4, 6, 7, 9, 10, 11, 13, 14 — those days have spec-locked ranges.
- DO NOT promise any kind of healing, fix, victory, or "done-ness" with anxiety.
- DO NOT suggest ambient audio, music, meditation techniques, or paired media in the devotional text.

**Test specifications:** N/A — tested in Step 3.

**Expected state after completion:**

- [ ] `frontend/src/data/bible/plans/when-youre-anxious.json` exists
- [ ] JSON is valid and parseable (run `node -e "JSON.parse(require('fs').readFileSync('frontend/src/data/bible/plans/when-youre-anxious.json', 'utf-8'))"`)
- [ ] `slug` is `"when-youre-anxious"`
- [ ] `title` is `"When You're Anxious"`
- [ ] `shortTitle` is `"Anxious"`
- [ ] `theme` is `"emotional"`
- [ ] `duration` is `14`
- [ ] `estimatedMinutesPerDay` is `7`
- [ ] `curator` is `"Worship Room"`
- [ ] `coverGradient` is `"from-emerald-600/30 to-hero-dark"`
- [ ] `days` array has exactly 14 entries, numbered 1-14 with no gaps
- [ ] Every day has `day`, `title`, `passages` (≥ 1), `devotional` (100-200 words), `reflectionPrompts` (exactly 1 entry, 30-140 chars)
- [ ] Days 1, 2, 3, 4, 6, 7, 9, 10, 11, 13, 14 use verse ranges matching the table above
- [ ] Days 5, 8, 12 are full chapters (no `startVerse` or `endVerse`)
- [ ] All passage books use the correct lowercase slugs from the table
- [ ] Description is 180-240 words
- [ ] Description contains "scripture used as a club against it" (verbatim or exact equivalent)
- [ ] Description names ≥ 4 biblical figures who were anxious
- [ ] Description contains language equivalent to "This plan won't fix your anxiety"
- [ ] Day 5 reflection prompt matches the canonical text
- [ ] Day 14 reflection prompt matches the canonical text
- [ ] Day 7 devotional hits all 4 Philippians load-bearing moves
- [ ] Day 9 devotional hits all Gethsemane load-bearing moves
- [ ] Day 14 devotional is quiet, not triumphant, and acknowledges ongoing anxiety
- [ ] All 14 reflection prompts are distinct and passage-specific
- [ ] Zero forbidden phrases present in any devotional
- [ ] Zero Jeremiah 29:11 references
- [ ] All WEB-quoted phrases verified against `frontend/src/data/bible/books/json/*.json`
- [ ] No HTML or Markdown in devotional text
- [ ] No extra fields beyond the `Plan` type

---

### Step 2: Update Manifest

**Objective:** Add the `when-youre-anxious` entry to `manifest.json` as the third item so the plan appears in the browser grid.

**Files to modify:**

- `frontend/src/data/bible/plans/manifest.json` — MODIFY: add third entry to the array

**Details:**

Append the plan's metadata to the manifest array after the existing `john-story-of-jesus` entry:

```json
[
  {
    "slug": "psalms-30-days",
    ...existing BB-22 entry unchanged...
  },
  {
    "slug": "john-story-of-jesus",
    ...existing BB-23 entry unchanged...
  },
  {
    "slug": "when-youre-anxious",
    "title": "When You're Anxious",
    "shortTitle": "Anxious",
    "description": "<same description as in the plan JSON>",
    "theme": "emotional",
    "duration": 14,
    "estimatedMinutesPerDay": 7,
    "curator": "Worship Room",
    "coverGradient": "from-emerald-600/30 to-hero-dark"
  }
]
```

**Critical: zero drift.** Every metadata field in the manifest entry must byte-exactly match the plan JSON's top-level fields (except `days`). Copy-paste from the plan JSON to avoid drift. Both existing manifest entries must remain untouched.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT include `days` in the manifest entry — `PlanMetadata = Omit<Plan, 'days'>`
- DO NOT add any fields not in the `Plan` type
- DO NOT introduce any difference between manifest metadata and plan JSON metadata (even trailing whitespace in the description counts — the test compares with `toEqual`)
- DO NOT modify the existing `psalms-30-days` or `john-story-of-jesus` manifest entries
- DO NOT reorder the entries — `psalms-30-days` first, `john-story-of-jesus` second, `when-youre-anxious` third

**Test specifications:** N/A — tested in Step 3.

**Expected state after completion:**

- [ ] `manifest.json` contains exactly 3 entries
- [ ] First entry is `psalms-30-days` (unchanged)
- [ ] Second entry is `john-story-of-jesus` (unchanged)
- [ ] Third entry is `when-youre-anxious`
- [ ] All metadata fields match the plan JSON exactly (no drift)
- [ ] `days` field is not present in any manifest entry

---

### Step 3: Add Tests

**Objective:** Add a new describe block to `planLoader.test.ts` that explicitly loads and validates `when-youre-anxious.json`. Update the existing manifest test to check for 3 entries. Add a `loadPlan` test that loads the new plan without error.

**Files to modify:**

- `frontend/src/lib/bible/__tests__/planLoader.test.ts` — MODIFY: add plan import, update manifest test count, add loadPlan test, add full validation describe block

**Details:**

1. **Add import** at the top of the file (beneath the existing `johnPlanData` import):

   ```typescript
   import anxiousPlanData from '@/data/bible/plans/when-youre-anxious.json'
   ```

   Also add a helper import for the 10 book JSONs used by BB-24's verse-range validation (see test 6 below). Pattern: import each book JSON as a typed array of chapter objects. Example:

   ```typescript
   import psalmsBook from '@/data/bible/books/json/psalms.json'
   import firstKingsBook from '@/data/bible/books/json/1-kings.json'
   import matthewBook from '@/data/bible/books/json/matthew.json'
   import firstSamuelBook from '@/data/bible/books/json/1-samuel.json'
   import markBook from '@/data/bible/books/json/mark.json'
   import philippiansBook from '@/data/bible/books/json/philippians.json'
   import isaiahBook from '@/data/bible/books/json/isaiah.json'
   import lukeBook from '@/data/bible/books/json/luke.json'
   import secondCorinthiansBook from '@/data/bible/books/json/2-corinthians.json'
   import lamentationsBook from '@/data/bible/books/json/lamentations.json'
   ```

   Build a lookup map inside the describe block:

   ```typescript
   const BOOK_LOOKUP: Record<string, Array<{ chapter: number; verses: Array<{ number: number; text: string }> }>> = {
     'psalms': psalmsBook,
     '1-kings': firstKingsBook,
     'matthew': matthewBook,
     '1-samuel': firstSamuelBook,
     'mark': markBook,
     'philippians': philippiansBook,
     'isaiah': isaiahBook,
     'luke': lukeBook,
     '2-corinthians': secondCorinthiansBook,
     'lamentations': lamentationsBook,
   }
   ```

2. **Update `loadManifest` test** (currently lines 13-19, asserts 2 entries): update the length assertion to 3 and add a `find` check for `when-youre-anxious`:

   ```typescript
   it('returns array containing all three plan entries', () => {
     const result = loadManifest()
     expect(result).toHaveLength(3)
     expect(result.find((p) => p.slug === 'psalms-30-days')).toBeDefined()
     expect(result.find((p) => p.slug === 'john-story-of-jesus')).toBeDefined()
     expect(result.find((p) => p.slug === 'when-youre-anxious')).toBeDefined()
   })
   ```

3. **Add `loadPlan` test** inside the existing `describe('loadPlan', ...)` block:

   ```typescript
   it('loads when-youre-anxious without error', async () => {
     const result = await loadPlan('when-youre-anxious')
     expect(result.error).toBeNull()
     expect(result.plan).not.toBeNull()
     expect(result.plan!.slug).toBe('when-youre-anxious')
     expect(result.plan!.duration).toBe(14)
     expect(result.plan!.days).toHaveLength(14)
     expect(result.plan!.title).toBe("When You're Anxious")
   })
   ```

4. **Add `describe('when-youre-anxious plan validation', ...)` block** at the bottom of the file, mirroring the `john-story-of-jesus plan validation` pattern but with BB-24-specific assertions. Include exactly these tests:

   | # | Test | Description |
   |---|------|-------------|
   | 1 | has correct metadata | Asserts slug, title, shortTitle, duration (14), theme ('emotional'), curator, estimatedMinutesPerDay (7), coverGradient ('from-emerald-600/30 to-hero-dark') |
   | 2 | has all 14 days with continuous numbering | `days.length === 14` and day numbers are `[1..14]` |
   | 3 | every day has required fields | `title`, `passages.length >= 1`, `devotional` truthy, `reflectionPrompts.length === 1` |
   | 4 | all passages match the canonical 14-day structure | Iterate days 1-14 and assert `passages[0].book` and `passages[0].chapter` match the canonical table. For days 5, 8, 12: assert `startVerse` and `endVerse` are absent. For the other 11 days: assert `startVerse` and `endVerse` are numbers matching the canonical table. |
   | 5 | verse ranges are valid (endVerse >= startVerse) | For days with ranges: `endVerse >= startVerse` |
   | 6 | verse ranges fit within actual WEB chapter verse counts | For days with ranges: look up `BOOK_LOOKUP[book]`, find the chapter, assert `endVerse <= verses.length` |
   | 7 | devotional word counts in range (100-200) | Per-day word count via `split(/\s+/).filter(w => w.length > 0).length` |
   | 8 | total devotional word count in range (1400-2800) | Sum of all 14 daily word counts |
   | 9 | reflection prompts in character range (30-140) | Per-prompt `length` |
   | 10 | no duplicate reflection prompts | `new Set(allPrompts).size === allPrompts.length` |
   | 11 | Day 5 reflection prompt matches canonical | Strict equality to the canonical Day 5 text |
   | 12 | Day 14 reflection prompt matches canonical | Strict equality to the canonical Day 14 text |
   | 13 | description is 180-240 words | Word count via same `split(/\s+/)` filter |
   | 14 | description contains "scripture used as a club" (case-insensitive substring) | `description.toLowerCase().includes('scripture used as a club')` |
   | 15 | description mentions at least 4 of the anxious biblical figures | Count matches for `['Hannah', 'Elijah', 'disciples', 'David', 'Gethsemane']` in description — assert count >= 4 |
   | 16 | description contains honest-expectation language | Case-insensitive substring check for "won't fix" OR "will not fix" OR "nothing in fourteen days" |
   | 17 | no devotional contains forbidden phrases | Iterate all 14 devotionals AND the description. For each, assert none of these substrings are present (case-insensitive): `'if you have enough faith'`, `'if you trusted enough'`, `'if your faith were stronger'`, `'if you had more faith'`, `'god will heal you'`, `'jeremiah 29:11'`, `'plans to prosper you'`, `'god wants to speak to you'`, `'open your heart'`, `'let god in'`, `'just trust'`, `'just pray more'`, `'the devil is attacking you'`, `'anxiety disorder'`, `'generalized anxiety'`, `'are you feeling better'`. Use `expect(text.toLowerCase()).not.toContain(forbidden)`. |
   | 18 | theme is a valid PlanTheme value | `VALID_THEMES` contains `'emotional'` |
   | 19 | manifest metadata matches plan metadata (no drift) | Destructure `days` out and iterate remaining keys, assert each matches the manifest entry exactly |
   | 20 | day 9 devotional acknowledges Jesus' distress | Case-insensitive substring check for `'jesus'` AND for one of `['distress', 'agony', 'anguish']` AND for one of `['not removed', 'not delivered', 'not taken']` (verifies the load-bearing Gethsemane framing) |
   | 21 | day 14 devotional does not promise being "done" with anxiety | Negative substring check — none of `'conquered'`, `'no longer anxious'`, `'you're done'`, `'you are done'`, `'fixed'` (case-insensitive) |
   | 22 | no passage anywhere references Jeremiah | Iterate all passages, assert `book !== 'jeremiah'` for every one |

5. **Do not modify or remove any existing BB-22 or BB-23 tests.**

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT mock the plan JSON or any book JSON — import the real files for validation
- DO NOT test UI rendering — BB-21 owns that
- DO NOT add snapshot tests — they're brittle for content files
- DO NOT modify or remove any existing BB-22 (psalms) or BB-23 (john) tests
- DO NOT rename the existing `johnPlanData` or `planData` (psalms) variables — add a separate `anxiousPlanData` import
- DO NOT skip the verse-range-in-bounds test (#6) — BB-24 is the first plan using verse ranges, and this is the spec's build-time validation requirement
- DO NOT skip the forbidden-phrases test (#17) — this is the spec's zero-tolerance enforcement point
- DO NOT put the forbidden-phrases list in a separate constants file — inline it in the test so the spec violations are visible at the point of enforcement

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| manifest contains all three plans | unit | `loadManifest()` returns array with 3 entries |
| anxiety plan loads without error | unit | `loadPlan('when-youre-anxious')` returns `{ plan, error: null }` with 14 days |
| anxiety plan has correct metadata | unit | All 9 metadata fields match canonical values |
| all 14 days continuous numbering | unit | `[1..14]` with no gaps |
| every day has required fields | unit | title, passages, devotional, reflectionPrompts all valid |
| canonical 14-day passage structure | unit | Book + chapter + verse range match canonical table for all 14 days |
| verse ranges valid (endVerse >= startVerse) | unit | For days with ranges |
| verse ranges fit WEB chapter bounds | unit | `endVerse <= verses.length` looked up against actual book JSON |
| devotional word count per day (100-200) | unit | Per-day validation |
| total devotional word count (1400-2800) | unit | Sum validation |
| reflection prompt char count (30-140) | unit | Per-prompt validation |
| no duplicate reflection prompts | unit | All 14 distinct |
| day 5 canonical reflection prompt | unit | Strict match |
| day 14 canonical reflection prompt | unit | Strict match |
| description 180-240 words | unit | Word count |
| description contains "scripture used as a club" | unit | Substring check |
| description names ≥ 4 anxious biblical figures | unit | Pattern count |
| description contains honest-expectation language | unit | Substring check |
| no forbidden phrases in any devotional or description | unit | Case-insensitive substring negation across 16 forbidden patterns |
| theme is valid PlanTheme | unit | `'emotional'` in `VALID_THEMES` |
| manifest matches plan metadata | unit | Zero drift |
| day 9 devotional acknowledges Jesus' distress | unit | Substring pattern match |
| day 14 devotional does not promise "done-ness" | unit | Substring negation |
| no passage references Jeremiah | unit | Book slug check |

**Expected state after completion:**

- [ ] All new tests pass
- [ ] All existing BB-22 tests still pass
- [ ] All existing BB-23 tests still pass
- [ ] `pnpm test -- planLoader` passes with zero failures
- [ ] `pnpm test` passes with zero failures (full suite)
- [ ] New validation tests cover: structure, metadata drift, verse-range bounds, word counts, char ranges, prompt uniqueness, canonical prompts, description quality, forbidden phrases, load-bearing devotional markers, Jeremiah exclusion

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create plan JSON (all book slugs pre-verified, no upstream dependencies) |
| 2 | 1 | Update manifest (needs plan metadata to exist so values can be copied without drift) |
| 3 | 1, 2 | Add tests (imports both the plan JSON and the manifest JSON) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create plan JSON | [COMPLETE] | 2026-04-10 | Created `frontend/src/data/bible/plans/when-youre-anxious.json`. Description 213 words (contains "scripture used as a club against it", names 5 biblical figures, includes "won't fix" and "nothing in fourteen days" honest-expectation language). All 14 days 133-161 words each (total 2080). All 14 reflection prompts 64-116 chars, all distinct, passage-specific. Days 5, 8, 12 are full chapters (no startVerse/endVerse). Days 1,2,3,4,6,7,9,10,11,13,14 use verse ranges matching canonical table. Day 5 + Day 14 prompts match canonical text verbatim. Zero forbidden phrases. Zero Jeremiah references. All WEB-quoted phrases verified against book JSONs (note: spec's verification table said Psalm 13:1 uses "Yahweh" but WEB actually uses "LORD" — devotional paraphrases without direct quote, so no misquote). Day 7 hits all 4 Philippians load-bearing moves (weaponization acknowledged, Paul in prison / in a cell, invitation from the other side, peace ≠ anxiety disappearance). Day 9 Gethsemane contains "jesus" + "distress"/"agony" + "not removed"/"not rescued". Day 14 contains no "conquered"/"no longer anxious"/"you're done"/"you are done"/"fixed" substrings; explicitly says "Tomorrow you'll probably still be anxious sometimes." |
| 2 | Update manifest | [COMPLETE] | 2026-04-10 | Modified `frontend/src/data/bible/plans/manifest.json`: added `when-youre-anxious` as the third entry. Existing `psalms-30-days` and `john-story-of-jesus` entries untouched. All 9 metadata fields copied byte-exactly from plan JSON — zero drift verified programmatically. `days` field correctly absent from manifest entry. |
| 3 | Add tests | [COMPLETE] | 2026-04-10 | Modified `frontend/src/lib/bible/__tests__/planLoader.test.ts`: added `anxiousPlanData` import + 10 book JSON imports (psalms, 1-kings, matthew, 1-samuel, mark, philippians, isaiah, luke, 2-corinthians, lamentations) typed as `BookChapter[]`; added `BOOK_LOOKUP` map; updated `loadManifest` test to expect 3 entries including `when-youre-anxious`; added `loads when-youre-anxious without error` test inside existing `loadPlan` describe block; appended new `describe('when-youre-anxious plan validation', ...)` block with 22 tests covering metadata, continuous numbering, required fields, canonical 14-day passage structure (with full-chapter assertion for days 5/8/12 and verse-range assertion for the other 11 days), verse range validity, verse ranges within WEB chapter bounds, per-day word counts (100-200), total word count (1400-2800), prompt char ranges (30-140), prompt uniqueness, canonical Day 5 + Day 14 prompts, description word count (180-240), "scripture used as a club" substring, ≥4 biblical figures, honest-expectation language, forbidden-phrase scan across all 14 devotionals + description, valid PlanTheme, manifest/plan metadata drift, Day 9 Gethsemane markers, Day 14 negative closing checks, no Jeremiah passages. **Result: 48 planLoader tests pass (previous 26 + new 22). `pnpm vitest run src/lib/bible/__tests__/planLoader.test.ts` passes cleanly. `pnpm build` passes cleanly (0 TypeScript errors). The 59 pre-existing failures elsewhere in the suite (GrowthGarden, etc.) are unrelated to BB-24 and exist on the base commit as well (verified via git stash).** |
