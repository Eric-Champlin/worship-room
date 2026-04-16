# Implementation Plan: BB-25 — When You Can't Sleep (7-Day Topical Plan)

**Spec:** `_specs/bb-25-plan-when-you-cant-sleep.md`
**Date:** 2026-04-10
**Branch:** `bible-redesign` (no new branch — commits directly)
**Design System Reference:** `_plans/recon/design-system.md` (not applicable — content-only spec, no new UI)
**Recon Report:** not applicable (content-only spec, no new UI)
**Master Spec Plan:** `_plans/2026-04-09-bb21-reading-plans-architecture.md` (loaded — BB-21 defines all infrastructure)

---

## Architecture Context

### What This Spec Is

BB-25 is the **fourth and final reading-plan content spec** in the Bible redesign wave. It ships one JSON data file, adds a fourth entry to the plan manifest, adds a per-plan validation `describe` block to the existing plan loader test file, and **extends BB-24's existing forbidden-phrase scan** to cover all four plans plus new sleep-specific forbidden phrases.

**No new components, hooks, routes, pages, or utilities.** All rendering infrastructure was built in BB-21 (plan detail page, plan day page, reader banner, completion celebration) and BB-21.5 (plan browser grid). BB-22 (Psalms), BB-23 (John), and BB-24 (Anxious) ship the preceding plans and the test patterns BB-25 follows.

### Key Differences from BB-22, BB-23, BB-24

- **7 days — the shortest container in the wave.** 30 (BB-22) → 21 (BB-23) → 14 (BB-24) → 7 (BB-25). The container length mirrors the severity of the moment and the cognitive bandwidth of the user.
- **3 minutes/day estimate — the lowest in the wave.** A user at 3 AM on a phone in a dark room cannot focus. The spec calls this out as the "low bandwidth" principle. BB-22 = 7, BB-23 = 10, BB-24 = 7, **BB-25 = 3.**
- **Topical, not sequential.** Mixes passages across OT/NT (Psalms, Genesis, 1 Kings, Mark, Lamentations, Numbers).
- **Every passage is a verse range. No full chapters.** BB-24 is the first plan to use verse ranges at all; BB-25 uses them universally. This is stricter than BB-24's mix of ranges and full chapters.
- **Devotional word count 60-120 per day (lower floor than BB-24's 100-200).** BB-25 is deliberately the briefest voice — shorter, quieter, more restrained than any other plan in the wave.
- **Midnight/deep-blue gradient**, visually distinct from BB-22 indigo-500/30, BB-23 amber-500/30, BB-24 emerald-600/30.
- **`emotional` theme** (same as BB-24) so the existing `emotional`-category completion text fires without customization. BB-25 is the second `emotional` plan in the manifest; this is fine because the completion-celebration copy keys on the category, not the slug.
- **Voice:** more restrained than any other plan. If a BB-25 devotional could fit in BB-22, BB-23, or BB-24, it's wrong. Short sentences, tender, permission-giving about not sleeping, ends closing-prayer-like on Day 7.
- **Forbidden-phrase scan test is EXTENDED (not duplicated).** BB-24 added the scan but it currently only iterates `anxiousPlanData.days` (verified at `frontend/src/lib/bible/__tests__/planLoader.test.ts` lines 443-472). BB-25 refactors the scan to iterate all four plan data files and adds sleep-specific forbidden phrases. Same test file, unified forbidden list, four plans scanned.

### Key Files

- **Plan types:** `frontend/src/types/bible-plans.ts` — `Plan`, `PlanDay`, `PlanPassage`, `PlanMetadata`, `PlanTheme` (unchanged — no schema modifications)
- **Plan loader:** `frontend/src/lib/bible/planLoader.ts` — `loadManifest()` (sync), `loadPlan(slug)` (async, dynamic `import()` of `@/data/bible/plans/${slug}.json`). Validates `data.slug`, `data.title`, `data.duration`, `Array.isArray(data.days)`.
- **Manifest:** `frontend/src/data/bible/plans/manifest.json` — currently contains **3 entries** (`psalms-30-days`, `john-story-of-jesus`, `when-youre-anxious`). Verified at read-time.
- **Plans directory:** `frontend/src/data/bible/plans/` — contains `manifest.json`, `psalms-30-days.json`, `john-story-of-jesus.json`, `when-youre-anxious.json`. Verified via `ls`.
- **Existing plan loader test:** `frontend/src/lib/bible/__tests__/planLoader.test.ts` (515 lines). Contains imports, `BOOK_LOOKUP`, `loadManifest` test, `loadPlan` tests, and three `describe` blocks (psalms, john, anxious). The BB-25 describe block appends at the bottom. The existing anxious-only forbidden-phrase test (lines 443-472) is **replaced** by a plan-agnostic version that iterates all four plans.
- **Bible book JSONs:** `frontend/src/data/bible/books/json/*.json` — one file per book. Structure: array of chapter objects each with `bookSlug`, `chapter`, `verses: Array<{ number, text }>`. BB-25 needs `psalms.json`, `genesis.json`, `1-kings.json`, `mark.json`, `lamentations.json`, `numbers.json`. All six verified to exist via `ls`.
- **Plan detail/day pages:** `BiblePlanDetail.tsx`, `BiblePlanDay.tsx` — unchanged, render BB-25 data automatically.
- **Completion celebration:** `PlanCompletionCelebration.tsx` — unchanged, `emotional`-category text fires for BB-25 because `theme === "emotional"`.

### Plan Type (exact shape the JSON must conform to)

```typescript
type PlanTheme = 'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'

interface PlanPassage {
  book: string          // lowercase slug, e.g. "psalms", "1-kings", "numbers"
  chapter: number
  startVerse?: number   // REQUIRED for every BB-25 passage (all 7 days use verse ranges)
  endVerse?: number     // REQUIRED for every BB-25 passage
  label?: string        // optional — not used by BB-25
}

interface PlanDay {
  day: number           // 1-indexed, 1-7
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
```

### Book Slug Verification (Pre-Confirmed)

All six book slugs exist at `frontend/src/data/bible/books/json/`. Verified via `ls`:

| Book (display) | Slug | File |
|----------------|------|------|
| Psalms | `psalms` | `psalms.json` |
| Genesis | `genesis` | `genesis.json` |
| 1 Kings | `1-kings` | `1-kings.json` |
| Mark | `mark` | `mark.json` |
| Lamentations | `lamentations` | `lamentations.json` |
| Numbers | `numbers` | `numbers.json` |

Slug format: lowercase, numbered-book books use hyphens. All match the `bookSlug` field inside each book JSON.

Three of these (psalms, 1-kings, mark, lamentations) are already imported in the existing test file for BB-24's verse-range validation. BB-25 adds `genesis` and `numbers` to the existing `BOOK_LOOKUP` map.

### Recent Execution Log Deviations (last 14 days)

The 3 most recent plans:

- `2026-04-10-bb24-when-youre-anxious.md` — 3 steps, zero deviations. Content-only, proved the pattern BB-25 follows. Minor note at execution: the spec's WEB verification table referenced a phrasing ("Yahweh" in Psalm 13:1) that WEB renders differently ("LORD"), so BB-24's plan phase paraphrased without direct quotes in that devotional instead of forcing a misquote. **BB-25 must apply the same discipline:** verify every quoted WEB phrase against the actual book JSON before committing, and paraphrase without quotes if the WEB rendering differs from memory.
- `2026-04-09-bb23-john-story-of-jesus.md` — zero deviations.
- `2026-04-09-bb22-psalms-30-days-plan.md` — zero deviations.

**No design system deviations to flag.** The content-plan pattern (Step 1 JSON → Step 2 manifest → Step 3 tests) is proven across three successive plans.

### WEB Quote Verification — Critical Phrases

Every quoted WEB phrase in a BB-25 devotional must match the actual WEB text in `frontend/src/data/bible/books/json/*.json`, not paraphrased from ESV/NIV/KJV/NLT. Key phrases the plan phase must cross-reference before committing:

| Day | Passage | Phrases Likely to Quote | Cross-Reference |
|-----|---------|-------------------------|-----------------|
| 1 | Psalm 4:1-8 | "in peace I will both lie down and sleep" (v.8) — WEB exact wording | `psalms.json` chapter 4 |
| 2 | Genesis 28:10-17 | "he took one of the stones of the place and put it under his head" (v.11); "Yahweh is in this place" / "surely Yahweh is in this place" (v.16) — WEB exact | `genesis.json` chapter 28 |
| 3 | 1 Kings 19:4-8 | "It is enough. Now, O Yahweh, take away my life" (v.4); broom tree / juniper tree phrasing (v.4); angel touching and food (v.5-7) | `1-kings.json` chapter 19 |
| 4 | Mark 4:35-41 | "asleep on the cushion" (v.38); "Teacher, don't you care that we are dying?" — exact WEB phrasing | `mark.json` chapter 4 |
| 5 | Psalm 63:1-8 | "on my bed" (v.6); "watches of the night" (v.6) — WEB exact | `psalms.json` chapter 63 |
| 6 | Lamentations 3:21-26 | "his compassions don't fail; they are new every morning" (v.22-23) — WEB renders "compassions" / "mercies" / "lovingkindnesses"? Verify. | `lamentations.json` chapter 3 |
| 7 | Numbers 6:24-26 | The full Aaronic blessing — "Yahweh bless you and keep you. Yahweh make his face to shine on you, and be gracious to you. Yahweh lift up his face toward you, and give you peace." — verify exact WEB wording | `numbers.json` chapter 6 |

**If a phrase is uncertain, paraphrase without quotes rather than risk a misquote.** The BB-24 execution log documented this exact discipline.

---

## Auth Gating Checklist

**BB-25 introduces zero new auth-gated actions.** All auth gating is inherited from BB-21:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View plan in browser grid | Public — no auth | N/A (no new code) | N/A |
| View plan detail page (description, day list) | Public — no auth | N/A (no new code) | N/A |
| Start the plan | Inherited from BB-21 | N/A (no new code) | BB-21's `useAuth` + `useAuthModal` |
| Mark day complete | Inherited from BB-21 | N/A (no new code) | BB-21's `useAuth` + `useAuthModal` |
| View plan day page (devotional, passage) | Public — no auth | N/A (no new code) | N/A |
| Read passage from plan (navigates to Bible reader) | Public — no auth | N/A (no new code) | N/A |
| Pause plan | Inherited from BB-21 | N/A (no new code) | BB-21's `useAuth` + `useAuthModal` |

**Safety Integrity verification at execution time:** Confirm (via manual browse against the dev server or a targeted rendering test) that logged-out users can read the full `when-you-cant-sleep` detail page and every day's devotional without being interrupted by the auth modal. The spec's Safety Integrity acceptance criteria call this out specifically (line 486).

---

## Design System Values (for UI steps)

N/A — BB-25 creates no UI. All rendering is handled by existing BB-21 components:

- Plan detail page: `BiblePlanDetail.tsx`
- Plan day page: `BiblePlanDay.tsx`
- Plan browser card: `PlanBrowseCard.tsx` (BB-21.5)
- Reader banner: `ActivePlanReaderBanner.tsx`
- Completion celebration: `PlanCompletionCelebration.tsx` (uses the existing `emotional`-category text verbatim — BB-25 does not customize)

The only visual decision is `coverGradient`, which determines the plan card's background color in the browser grid and detail page hero. Candidates from the spec (lines 58, 317):

- `"from-blue-950/40 to-hero-dark"` — **preferred** (deepest midnight blue, reads as moonlit midnight, clearly darker hue than BB-22's `from-indigo-500/30`, clearly cooler than BB-23's amber and BB-24's emerald)
- `"from-indigo-950/40 to-hero-dark"` — alternate (shares indigo family with BB-22 but nine shade steps darker)
- `"from-slate-900/40 to-hero-dark"` — alternate (cooler, more neutral)

**Decision: `from-blue-950/40 to-hero-dark`** — the deepest-blue candidate, most clearly distinct from all three existing plan gradients.

**Marked [UNVERIFIED]** per spec guidance: the spec explicitly says (line 317) that if no candidate produces a result visually distinct from BB-22 at the chosen opacity, the plan phase should mark the value as `[UNVERIFIED]` and defer verification to `/verify-with-playwright` against the plan browser grid. Even though `blue-950/40` looks correct on paper (different hue family, different shade, different opacity), the only way to confirm visual distinctness on the actual card background in the browser grid is a runtime comparison.

```
[UNVERIFIED] coverGradient: "from-blue-950/40 to-hero-dark"
→ To verify: Run /verify-with-playwright against /bible/plans browser grid
  after execution; confirm the BB-25 card is visually distinguishable from
  the BB-22 indigo card and reads as "moonlit midnight."
→ If wrong: Swap to "from-indigo-950/40 to-hero-dark" and re-verify. If that
  still looks similar to BB-22, fall back to "from-slate-900/40 to-hero-dark".
```

---

## Design System Reminder

N/A — No UI steps in this plan. All rendering is handled by existing BB-21 components. The only visual field is `coverGradient`, which is a plain Tailwind class string passed through to BB-21's existing plan card rendering.

---

## Shared Data Models (from BB-21)

### Types consumed (not modified)

```typescript
// frontend/src/types/bible-plans.ts — all types created in BB-21, consumed by BB-25's JSON
Plan, PlanDay, PlanPassage, PlanMetadata, PlanTheme
```

BB-25 adds no new types and modifies no existing types. **No schema changes to `Plan`.**

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bible:plans` | Read (by BB-21 infrastructure only — BB-25 does not write directly) | Plan progress store. BB-25 adds no new writes. Users starting/completing the sleep plan write through BB-21's existing `plansStore` API. |

BB-25 adds no new localStorage keys. **No update to `11-local-storage-keys.md`** is required.

---

## Responsive Structure

N/A — no new UI. Responsive behavior is inherited from BB-21's plan detail and plan day pages.

| Breakpoint | Width | Inherited Layout |
|-----------|-------|------------------|
| Mobile | < 640px | Single column, collapsible day list, sticky mark-complete button. Devotional body text at `text-[17px] leading-[1.75-1.8]`. 44px minimum tap targets. **Particularly relevant for BB-25** — most likely to be read in a dark room on a dimmed screen with tired eyes. |
| Tablet | 640-1024px | Single column, wider margins |
| Desktop | > 1024px | Hero full-width, day list full-width, inline mark-complete |

---

## Inline Element Position Expectations

N/A — no inline-row layouts introduced in this feature. All rendering flows through BB-21's existing components.

---

## Vertical Rhythm

N/A — no new UI sections. Spacing is inherited from BB-21's plan detail page and plan day page.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-21, BB-21.5, BB-22, BB-23, BB-24 are all committed on `bible-redesign` (verified via `git log`: `76263c1 bb24-when-youre-anxious` is HEAD at plan-write time)
- [ ] `frontend/src/data/bible/plans/manifest.json` currently contains exactly 3 entries (`psalms-30-days`, `john-story-of-jesus`, `when-youre-anxious`) — verified at read-time
- [ ] `frontend/src/types/bible-plans.ts` exists unchanged with `PlanTheme` union containing `'emotional'`
- [ ] `frontend/src/lib/bible/planLoader.ts` exists with `loadManifest()` and `loadPlan()` functions
- [ ] `frontend/src/lib/bible/__tests__/planLoader.test.ts` currently contains the `when-youre-anxious plan validation` describe block at lines 264-515 (verified at read-time)
- [ ] All 6 book JSONs referenced exist in `frontend/src/data/bible/books/json/` (psalms, genesis, 1-kings, mark, lamentations, numbers) — pre-verified above
- [ ] All auth-gated actions are inherited from BB-21 — no new auth gates
- [ ] Design system values are verified (N/A — no UI) except `coverGradient` which is **[UNVERIFIED]** and must be visually confirmed after execution
- [ ] `[UNVERIFIED]` values flagged with verification methods — there is **1** `[UNVERIFIED]` value in this plan (`coverGradient`), documented above
- [ ] No deprecated patterns used (N/A — no UI code)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `theme` value | `"emotional"` | Spec-locked (line 54). Direct match in the `PlanTheme` union. The `sleep` enum value also exists but the spec defaults to `emotional` so the existing restrained `emotional`-category completion text fires unchanged. BB-25 does not customize completion-celebration copy. |
| `shortTitle` value | `"Sleep"` | Spec-locked (line 52). Compact display in plan browser cards and any other compact UI. |
| `coverGradient` value | `"from-blue-950/40 to-hero-dark"` **[UNVERIFIED]** | Deepest-blue candidate, clearly different hue and shade from BB-22 indigo-500/30, BB-23 amber-500/30, BB-24 emerald-600/30. Per spec, mark [UNVERIFIED] and verify visually after execution. |
| `estimatedMinutesPerDay` | `3` | Spec-locked (line 56). Honor the "user at 3 AM cannot focus" principle — do not overpromise engagement time. Lowest in the wave. |
| `duration` | `7` | Spec-locked. Matches the length of the `days` array. |
| `curator` | `"Worship Room"` | Spec-locked (line 53). |
| Every day uses verse ranges | All 7 days include `startVerse` and `endVerse` | Spec-locked (line 61, 128, 146): "No full chapters. Day 1 uses Psalm 4:1-8 explicitly. Every other day is already a verse range." BB-25 is stricter than BB-24 in this regard. |
| Day 1 passage | Psalm 4:1-8 | Spec-locked (line 138). |
| Day 2 passage | Genesis 28:10-17 | Spec-locked (line 139). |
| Day 3 passage | 1 Kings 19:4-8 | Spec-locked (line 140). |
| Day 4 passage | Mark 4:35-41 | Spec-locked (line 141). **Load-bearing day.** |
| Day 5 passage | Psalm 63:1-8 | Spec-locked (line 142). |
| Day 6 passage | Lamentations 3:21-26 | Spec-locked (line 143). |
| Day 7 passage | Numbers 6:24-26 | Spec-locked (line 144). **Load-bearing closing day.** |
| Day 1 devotional pattern | Must explicitly contain the "you may not feel it" pattern — a version of "the verse can be true even if you don't feel it yet" | Spec-locked as the plan's signature move (line 198). Acceptance criterion line 420 tests for this. |
| Day 4 devotional pattern | Must name (a) disciples in a boat in a storm at night, (b) Jesus asleep in the back on a cushion, (c) Jesus did NOT shame them for being unable to sleep, (d) apply directly to user: "You are not being shamed for being awake tonight." | Spec-locked (lines 148, 154-166). Non-negotiable central pastoral move. Acceptance criteria lines 421-422 test for this. |
| Day 7 devotional pattern | Must (a) speak the Aaronic blessing over the user directly, (b) be brief enough to read in the time it takes to put a phone down, (c) NOT ask the user to do anything (no journal, no share, no recommit), (d) end with permission to put the phone down | Spec-locked (lines 168-184). Non-negotiable closing benediction. Acceptance criteria lines 423-425 test for this. |
| Day 7 reflection prompt | Exactly `"Goodnight."` (10 chars, single word, no question mark) | Spec-locked (lines 144, 186). Non-negotiable. Acceptance criterion line 447. |
| Day 4 reflection prompt | `"You are not being shamed for being awake tonight."` | Spec canonical (line 234) + acceptance criterion line 446 requires this. |
| Day 1 reflection prompt | `"Read the last verse one more time. Let it be true even if you don't feel it yet."` | Spec canonical (line 231). 80 chars exactly (inclusive of the acceptance criterion's ≤80 limit). |
| Day 2-6 reflection prompts | Use canonical prompts from spec lines 232-236 verbatim | Spec canonical list. |
| Description length | 130-180 words inclusive | Acceptance criterion line 408. |
| Description content | Must (a) reference phone + late-night reading, (b) contain "You shouldn't have to think hard" or equivalent, (c) name ≥2 of David/Jacob/Elijah/disciples, (d) NOT promise sleep, (e) NOT use "insomnia", (f) end with permission to return another night ("The plan will wait" or equivalent) | Acceptance criteria lines 409-414. |
| Devotional word count | 60-120 words per day (hard limits) | Spec-locked (lines 126, 204). Total 420-840 words. Acceptance criteria lines 418-419. |
| Reflection prompt length | ≤80 characters each | Spec-locked (lines 127, 228). Acceptance criterion line 445. |
| Reflection prompt count | Exactly 1 per day | Spec-locked (line 227). |
| Reflection prompts are closing lines, NOT questions | No question marks except possibly decorative; no prompts asking the user to do anything | Spec-locked (lines 228, 239-244). Acceptance criteria lines 448-449. |
| Extended forbidden-phrase scan | Refactor existing BB-24 test (anxious-only) to iterate ALL four plans; add sleep-specific phrases; unified list scans descriptions AND devotionals for all four | Spec-locked (lines 107, 113-120). "Same file, additional phrases, scans all four plans." DO NOT create a new test file. |
| Forbidden phrases (sleep-specific additions) | `"you'll sleep when"`, `"just let go and you'll fall asleep"`, `"the reason you can't sleep is"`, `"anxiety is keeping you awake"`, `"your phone is the problem"`, `"try not to think about it"`, `"count your blessings instead of sheep"`, `"count sheep"`, `"this too shall pass"`, `"insomnia"`, `"sleep disorder"`, `"sleep hygiene"`, `"insomnia disorder"`, `"if you just"`, `"if you would only"` | Spec-locked (lines 113-120). Note: spec claims `"if you just"` / `"if you would only"` are "already covered by BB-24's scan" — **verified at read-time this is FALSE.** BB-24's current list does not include these phrases. The plan phase must add them. |
| Forbidden-phrase scan coverage | Every devotional + every description of every plan file (4 descriptions + 7+14+21+30 = 72 devotionals) | Per spec intent: the scan is a project-wide quality gate, not a per-plan check. |
| Manifest order | `when-you-cant-sleep` as the **fourth** entry (after `psalms-30-days`, `john-story-of-jesus`, `when-youre-anxious`) | Spec-locked (lines 92, 94, 320, 461-463). Plan browser grid renders manifest order. |
| Completion celebration | Inherited `emotional`-category text verbatim, no customization | Spec-locked (lines 308-309). BB-21 owns this copy. **DO NOT** add "you slept better" / "you conquered sleeplessness" language. |
| Badges for completing sleep plan | None — do not add | Spec (line 340): "A user who finishes 7 nights does not need a digital trophy." |
| Analytics on sleep plan | None — zero tracking | Spec (line 344): "Especially not this one." |
| Ambient audio auto-pairing | None — plan stays silent on the topic | Spec (line 330): user can start audio themselves if they want; plan does not suggest or auto-start. |
| AI safety runtime checks | N/A — no AI content, no user input | Content is curated offline. Safety is enforced through the extended forbidden-phrase scan + code review. |
| In-devotional crisis disclaimers | **Do not add.** No "consult a doctor" / "sleep hygiene tips" / PSA interrupts in devotional bodies. | Spec (line 287): "a user at 3 AM does not need a PSA about sleep hygiene." |
| Sleep tracking / sleep quality logging | **Do not add.** No "did you sleep?" prompt, no duration logger, no quality rating. | Spec (line 339, 300): "would be the opposite of the plan's posture." |
| Cross-reference to BB-24 (anxiety) | **Do not add.** Plans discoverable separately in the browser, do not link to each other. | Spec (line 338). |
| `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`, `id`, `durationDays` | **Do not add** these fields to the JSON | They do not exist on the `Plan` type. Same constraint as BB-22, BB-23, BB-24. Spec explicitly calls this out at lines 46-65 and 327. |

**One `[UNVERIFIED]` value in this plan:** `coverGradient: "from-blue-950/40 to-hero-dark"`, documented in the Design System Values section with verification and correction methods.

---

## Implementation Steps

### Step 1: Create Plan JSON File

**Objective:** Create `frontend/src/data/bible/plans/when-you-cant-sleep.json` containing the complete 7-day reading plan with all 7 devotionals, reflection prompts, and passage references (all with verse ranges — no full chapters).

**Files to create:**

- `frontend/src/data/bible/plans/when-you-cant-sleep.json` — CREATE: complete plan data conforming to the `Plan` type

**Details:**

Create the JSON file with these top-level metadata fields:

```json
{
  "slug": "when-you-cant-sleep",
  "title": "When You Can't Sleep",
  "shortTitle": "Sleep",
  "description": "<130-180 word description — see Description section below>",
  "theme": "emotional",
  "duration": 7,
  "estimatedMinutesPerDay": 3,
  "curator": "Worship Room",
  "coverGradient": "from-blue-950/40 to-hero-dark",
  "days": [ /* 7 PlanDay objects — see 7-day structure below */ ]
}
```

**The 7-day structure (hard-locked passages — do not change):**

| Day | Book | Chapter | startVerse | endVerse | Title |
|-----|------|---------|------------|----------|-------|
| 1 | `psalms` | 4 | 1 | 8 | Lying down in peace |
| 2 | `genesis` | 28 | 10 | 17 | Jacob's stone |
| 3 | `1-kings` | 19 | 4 | 8 | Elijah under the broom tree |
| 4 | `mark` | 4 | 35 | 41 | Jesus asleep in the boat |
| 5 | `psalms` | 63 | 1 | 8 | On my bed I remember you |
| 6 | `lamentations` | 3 | 21 | 26 | Mercies new every morning |
| 7 | `numbers` | 6 | 24 | 26 | The blessing |

**Every day uses a verse range. No full chapters.** Every passage includes both `startVerse` and `endVerse` as numbers.

**Per-day JSON shape:**

```json
{
  "day": 1,
  "title": "Lying down in peace",
  "passages": [{ "book": "psalms", "chapter": 4, "startVerse": 1, "endVerse": 8 }],
  "devotional": "<60-120 word devotional — see voice requirements below>",
  "reflectionPrompts": ["<≤80 char prompt, closing line, not a question>"]
}
```

**The description (130-180 words, load-bearing):**

Use the spec's reference description (spec lines 78-82) as the working draft. That reference is approximately 170 words and hits all six acceptance criteria already. Plan phase may refine wording but **must not soften any of these four things** (spec lines 84-88):

1. Names the user's physical situation (on a phone, late, reaching because sleep isn't coming)
2. Sets honest expectations ("You shouldn't have to think hard" or equivalent)
3. Reframes scripture's posture (Bible people were awake too; none got fixed, just accompanied)
4. Never promises sleep

**Description acceptance criteria** (all enforced by Step 3 tests):

- Word count 130-180 inclusive
- References phone, scrolling, late-night reading, or equivalent
- Contains equivalent of "You shouldn't have to think hard" or "brief on purpose"
- Names ≥ 2 of {David, Jacob, Elijah, disciples} (spec's reference text names all four)
- Does NOT contain "insomnia"
- Does NOT promise sleep (no "you'll sleep", "helps you sleep", etc.)
- Ends with permission language ("The plan will wait" or equivalent)

**Reference description text to use as starting point** (from spec lines 78-82, ~170 words):

> If you're reading this, it's probably late. Or early — the kind of early that doesn't feel like morning yet. You've been trying to sleep and it isn't working. Your mind won't slow down or your body won't settle or both, and you reached for your phone, and you ended up here.
>
> This plan is seven short readings for nights like that. Each one is brief on purpose. You shouldn't have to scroll much. You shouldn't have to think hard. The Bible has more night passages than you might expect, written by people who were also awake when they didn't want to be. David's late prayers. Jacob alone in the dark. The disciples in a boat through the small hours. None of them got fixed by reading scripture either. Some of them just got accompanied through it.
>
> Read one tonight. Maybe read another tomorrow night if you need to. The plan will wait.

Count the final text with `description.split(/\s+/).filter(w => w.length > 0).length` and confirm it's within 130-180. If the reference text falls outside the range after refinement, tighten it without removing any of the four load-bearing moves.

**Devotional writing requirements (apply to every day):**

1. **Word count: 60-120 words per day (hard limits). Total across 7 days: 420-840 words.** Count with `devotional.split(/\s+/).filter(w => w.length > 0).length`.
2. **Voice:** Brief. Tender. Grounded in physical reality (user on a phone in the dark). Permission-giving about not sleeping. Closing-prayer-like on Day 7. More restrained than BB-22, BB-23, or BB-24.
3. **If a devotional could have fit in BB-22, BB-23, or BB-24, rewrite it.** The voice is distinct — shorter, quieter, more restrained.
4. **Stay close to the text.** Name concrete images. Do not extract universal lessons.
5. **Do not promise sleep.** Bible characters who were awake stayed awake. The user might too. That's okay.
6. **Never frame sleeplessness as faith failure, spiritual attack, moral failing, or sin.** (Acceptance criterion line 438.)
7. **Day 1 load-bearing move:** Must explicitly contain the "you may not feel it" pattern — a version of "the verse can be true even if you don't feel it yet." Spec lines 138 ("the user may not feel it, and that's okay") and 198 ("signature move"). Acceptance criterion line 420.
8. **Day 4 load-bearing moves (all four required):**
   - Name concretely: disciples in a boat in a storm at night; Jesus asleep in the back on a cushion
   - Flip the usual reading: the disciples couldn't sleep through it, and Jesus did NOT shame them for it
   - Apply directly to the user: "You are not being shamed for being awake tonight" (or equivalent)
   - Preserve the pastoral flip — usual church reading is "Jesus stills storms," BB-25's reading is "the disciples were not shamed for being unable to sleep through it"
   - Reference tone: spec lines 162-166. Plan phase may refine but must not soften.
9. **Day 7 load-bearing moves (all five required):**
   - Brief enough to read in the time it takes to put a phone down
   - Functions as the plan's closing prayer, not a call to action
   - Speaks the Aaronic blessing OVER the user directly ("Tonight they are spoken over you" or equivalent)
   - Does NOT ask the user to do anything (no journal, no share, no recommit)
   - Ends with permission: put the phone down; the plan will be here if needed again
   - Reference tone: spec lines 177-184. Plan phase may refine but must not soften.
10. **Forbidden phrases (zero tolerance, enforced by Step 3's extended scan):**

    Base list inherited from BB-24:
    - `"if you have enough faith"`, `"if you trusted enough"`, `"if your faith were stronger"`, `"if you had more faith"`
    - `"god will heal you"`, `"jeremiah 29:11"`, `"plans to prosper you"`
    - `"god wants to speak to you"`, `"open your heart"`, `"let god in"`
    - `"just trust"`, `"just pray more"`, `"the devil is attacking you"`
    - `"anxiety disorder"`, `"generalized anxiety"`, `"are you feeling better"`

    BB-25 sleep-specific additions:
    - `"you'll sleep when"` — any promise of sleep
    - `"just let go and you'll fall asleep"` — any variant of "letting go to sleep"
    - `"the reason you can't sleep is"` — diagnostic framing
    - `"anxiety is keeping you awake"` — diagnostic framing
    - `"your phone is the problem"` — lecturing about screen time
    - `"try not to think about it"` — advice the user has already failed at
    - `"count your blessings instead of sheep"`, `"count sheep"` — flip pattern
    - `"this too shall pass"` — cliché
    - `"insomnia"`, `"insomnia disorder"`, `"sleep disorder"`, `"sleep hygiene"` — clinical language
    - `"if you just"`, `"if you would only"` — conditional faith-failure framing

11. **WEB verification mandate:** Every quoted scripture phrase must match the WEB text in `frontend/src/data/bible/books/json/*.json`. If a quote is hard to verify, paraphrase without quotes. Specifically verify before committing:
    - Psalm 4:8 "in peace I will both lie down and sleep" — WEB exact
    - Genesis 28:11 stone phrasing, 28:16 "Yahweh is in this place" — WEB exact
    - 1 Kings 19:4 "broom tree" vs "juniper tree" — WEB renders this specifically
    - Mark 4:38 "asleep on the cushion" — WEB exact
    - Psalm 63:6 "on my bed" + "watches of the night" — WEB exact
    - Lamentations 3:22-23 — WEB wording of "compassions" / "mercies" / "lovingkindnesses"
    - Numbers 6:24-26 — full Aaronic blessing, WEB exact

12. **HTML and Markdown forbidden:** Devotional text is plain text split on double newlines. No `<em>`, no `**bold**`, no bullets. Paragraph breaks are `\n\n`.

**Reflection prompt requirements:**

1. Each day has exactly 1 prompt in a string array (`reflectionPrompts: ["..."]`).
2. Each prompt is **≤80 characters** (count `prompt.length`).
3. All 7 prompts must be distinct — no repeated phrasing.
4. Each prompt is a **closing line, not a question**. No question marks that demand thought. No prompts asking the user to do anything.
5. **Canonical prompts (from spec lines 231-237, use verbatim):**
   - Day 1: `"Read the last verse one more time. Let it be true even if you don't feel it yet."` (80 chars — within limit)
   - Day 2: `"The Lord is in this place. Even now. Even here."` (48 chars)
   - Day 3: `"You are not too much for God. Not even tonight."` (48 chars)
   - Day 4: `"You are not being shamed for being awake tonight."` (50 chars)
   - Day 5: `"The watches of the night. You're not the first one to be up."` (61 chars)
   - Day 6: `"Sunrise will come. That's all you need to believe right now."` (61 chars)
   - Day 7: `"Goodnight."` (10 chars — single word, non-negotiable per spec line 186 and acceptance criterion line 447)
6. **Forbidden prompt patterns:**
   - Prompts asking the user to journal, pray aloud, share, or do anything
   - Prompts asking "did this help?" or "do you feel better?" or "are you sleeping better?"
   - Questions requiring thought or answer
   - Any prompt over 80 characters

**Auth gating:** N/A — data file only.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A — no inline-row layouts.

**Guardrails (DO NOT):**

- DO NOT exceed 120 words on any single devotional. Count words before committing. Most days should be under 120.
- DO NOT go below 60 words on any single devotional. Count words.
- DO NOT let any prompt exceed 80 characters.
- DO NOT repeat a reflection prompt across days.
- DO NOT use any forbidden phrase from item 10 above. The test in Step 3 enforces this across all four plans.
- DO NOT use scripture quotes from ESV, NIV, KJV, or NLT — verify every quoted phrase against `*.json` in `frontend/src/data/bible/books/json/`.
- DO NOT use HTML or Markdown in devotional text — plain text split on `\n\n`.
- DO NOT use full chapters for any day — every day must include `startVerse` and `endVerse`. BB-23 was full-chapter-only; BB-24 mixed ranges and full chapters; BB-25 is verse-range-only.
- DO NOT add fields not in the `Plan` type (no `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`, `id`, `durationDays`).
- DO NOT modify the existing `psalms-30-days.json`, `john-story-of-jesus.json`, or `when-youre-anxious.json` files.
- DO NOT change the passage list in the 7-day structure table. All passages are hard-locked by the spec.
- DO NOT promise sleep anywhere — not in the description, devotionals, prompts, or celebration.
- DO NOT add in-devotional crisis disclaimers, sleep hygiene PSAs, "consult a doctor" inserts, or medical advice.
- DO NOT soften the Day 1 "you may not feel it" pattern, Day 4's "not shamed for being awake" pastoral flip, or Day 7's closing benediction structure.
- DO NOT let Day 7's devotional become a call to action. It is a benediction the user reads and puts the phone down with.
- DO NOT change the Day 7 reflection prompt from `"Goodnight."` — this is non-negotiable per spec line 186 and acceptance criterion line 447.
- DO NOT include any cross-reference to BB-24 (anxiety plan) anywhere in the JSON.
- DO NOT suggest ambient audio, music, or paired media in the devotional text.
- DO NOT add badges, streak bonuses, analytics events, or sleep-tracking fields.
- DO NOT customize completion-celebration copy — BB-21's existing `emotional`-category text fires verbatim.
- DO NOT include "put your phone down" advice anywhere except Day 7's closing line (the user is aware of the irony; the plan does not lecture them).

**Test specifications:** N/A — tested in Step 3.

**Expected state after completion:**

- [ ] `frontend/src/data/bible/plans/when-you-cant-sleep.json` exists
- [ ] JSON is valid and parseable (run `node -e "JSON.parse(require('fs').readFileSync('frontend/src/data/bible/plans/when-you-cant-sleep.json', 'utf-8'))"`)
- [ ] `slug` is `"when-you-cant-sleep"`
- [ ] `title` is `"When You Can't Sleep"`
- [ ] `shortTitle` is `"Sleep"`
- [ ] `theme` is `"emotional"`
- [ ] `duration` is `7`
- [ ] `estimatedMinutesPerDay` is `3`
- [ ] `curator` is `"Worship Room"`
- [ ] `coverGradient` is `"from-blue-950/40 to-hero-dark"` (flagged [UNVERIFIED])
- [ ] `days` array has exactly 7 entries, numbered 1-7 with no gaps
- [ ] Every day has `day`, `title`, `passages` (exactly 1), `devotional` (60-120 words), `reflectionPrompts` (exactly 1 entry, ≤80 chars)
- [ ] Every day's passage includes `startVerse` and `endVerse` as numbers matching the canonical 7-day table
- [ ] No day uses a full chapter (every passage has `startVerse` and `endVerse`)
- [ ] Description is 130-180 words
- [ ] Description references phone / late-night reading
- [ ] Description contains honest-expectation language ("shouldn't have to think hard" or equivalent)
- [ ] Description names ≥ 2 of {David, Jacob, Elijah, disciples}
- [ ] Description does NOT promise sleep
- [ ] Description does NOT contain `"insomnia"`
- [ ] Description ends with permission to return another night ("plan will wait" or equivalent)
- [ ] Day 1 devotional contains a version of the "you may not feel it" pattern
- [ ] Day 4 devotional explicitly references disciples + storm + Jesus asleep + "not shamed" for being awake
- [ ] Day 7 devotional speaks the Aaronic blessing over the user and ends with permission to put the phone down
- [ ] Day 7 devotional does NOT ask the user to journal, share, recommit, or do anything
- [ ] All 7 reflection prompts match the canonical text verbatim
- [ ] Day 7 reflection prompt is exactly `"Goodnight."`
- [ ] All 7 reflection prompts are distinct
- [ ] All 7 reflection prompts are ≤80 characters
- [ ] No forbidden phrase (base BB-24 list + BB-25 sleep additions) in any devotional or the description
- [ ] No `"insomnia"` anywhere
- [ ] All WEB-quoted phrases verified against `frontend/src/data/bible/books/json/*.json`
- [ ] No HTML or Markdown in devotional text
- [ ] No extra fields beyond the `Plan` type

---

### Step 2: Update Manifest

**Objective:** Add the `when-you-cant-sleep` entry to `manifest.json` as the fourth item so the plan appears as the fourth card in the browser grid.

**Files to modify:**

- `frontend/src/data/bible/plans/manifest.json` — MODIFY: add fourth entry to the array

**Details:**

Append the plan's metadata to the manifest array after the existing `when-youre-anxious` entry. Preserve all three existing entries byte-for-byte:

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
    ...existing BB-24 entry unchanged...
  },
  {
    "slug": "when-you-cant-sleep",
    "title": "When You Can't Sleep",
    "shortTitle": "Sleep",
    "description": "<same description as in the plan JSON — byte-exact copy>",
    "theme": "emotional",
    "duration": 7,
    "estimatedMinutesPerDay": 3,
    "curator": "Worship Room",
    "coverGradient": "from-blue-950/40 to-hero-dark"
  }
]
```

**Critical: zero drift.** Every metadata field in the manifest entry must byte-exactly match the plan JSON's top-level fields (except `days`). Copy-paste the description from the plan JSON to avoid drift. All three existing manifest entries must remain untouched (including whitespace, quoting, and field ordering).

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT include `days` in the manifest entry — `PlanMetadata = Omit<Plan, 'days'>`
- DO NOT add any fields not in the `Plan` type
- DO NOT introduce any difference between manifest metadata and plan JSON metadata (even trailing whitespace in the description counts — the test compares with `toEqual`)
- DO NOT modify the existing `psalms-30-days`, `john-story-of-jesus`, or `when-youre-anxious` manifest entries
- DO NOT reorder the entries — `psalms-30-days` first, `john-story-of-jesus` second, `when-youre-anxious` third, `when-you-cant-sleep` fourth

**Test specifications:** N/A — tested in Step 3.

**Expected state after completion:**

- [ ] `manifest.json` contains exactly 4 entries
- [ ] First entry is `psalms-30-days` (unchanged)
- [ ] Second entry is `john-story-of-jesus` (unchanged)
- [ ] Third entry is `when-youre-anxious` (unchanged)
- [ ] Fourth entry is `when-you-cant-sleep`
- [ ] All metadata fields match the plan JSON exactly (no drift)
- [ ] `days` field is not present in any manifest entry

---

### Step 3: Add Tests + Extend Forbidden-Phrase Scan

**Objective:** Add a new describe block to `planLoader.test.ts` that explicitly loads and validates `when-you-cant-sleep.json`. Update the `loadManifest` test to expect 4 entries. Add a `loadPlan` test for the new plan. **Replace** BB-24's anxious-only forbidden-phrase scan (lines 443-472) with a plan-agnostic version that iterates all four plans and incorporates BB-25's sleep-specific additions.

**Files to modify:**

- `frontend/src/lib/bible/__tests__/planLoader.test.ts` — MODIFY: add plan import + 2 book imports, update manifest test count, update `BOOK_LOOKUP`, add `loadPlan` test, replace forbidden-phrase scan with unified 4-plan version, add full validation describe block

**Details:**

1. **Add imports** at the top of the file (beside the existing imports). Add:

   ```typescript
   import sleepPlanData from '@/data/bible/plans/when-you-cant-sleep.json'
   import genesisBook from '@/data/bible/books/json/genesis.json'
   import numbersBook from '@/data/bible/books/json/numbers.json'
   ```

2. **Extend `BOOK_LOOKUP`** (currently at lines 25-36) to add `genesis` and `numbers`:

   ```typescript
   const BOOK_LOOKUP: Record<string, BookChapter[]> = {
     psalms: psalmsBook as BookChapter[],
     '1-kings': firstKingsBook as BookChapter[],
     matthew: matthewBook as BookChapter[],
     '1-samuel': firstSamuelBook as BookChapter[],
     mark: markBook as BookChapter[],
     philippians: philippiansBook as BookChapter[],
     isaiah: isaiahBook as BookChapter[],
     luke: lukeBook as BookChapter[],
     '2-corinthians': secondCorinthiansBook as BookChapter[],
     lamentations: lamentationsBook as BookChapter[],
     genesis: genesisBook as BookChapter[],
     numbers: numbersBook as BookChapter[],
   }
   ```

3. **Update `loadManifest` test** (currently lines 38-47): update the length assertion from 3 to 4 and add a `find` check for `when-you-cant-sleep`:

   ```typescript
   describe('loadManifest', () => {
     it('returns array containing all four plan entries', () => {
       const result = loadManifest()
       expect(Array.isArray(result)).toBe(true)
       expect(result).toHaveLength(4)
       expect(result.find((p) => p.slug === 'psalms-30-days')).toBeDefined()
       expect(result.find((p) => p.slug === 'john-story-of-jesus')).toBeDefined()
       expect(result.find((p) => p.slug === 'when-youre-anxious')).toBeDefined()
       expect(result.find((p) => p.slug === 'when-you-cant-sleep')).toBeDefined()
     })
   })
   ```

4. **Add `loadPlan` test** inside the existing `describe('loadPlan', ...)` block (after the existing `when-youre-anxious` test):

   ```typescript
   it('loads when-you-cant-sleep without error', async () => {
     const result = await loadPlan('when-you-cant-sleep')
     expect(result.error).toBeNull()
     expect(result.plan).not.toBeNull()
     expect(result.plan!.slug).toBe('when-you-cant-sleep')
     expect(result.plan!.duration).toBe(7)
     expect(result.plan!.days).toHaveLength(7)
     expect(result.plan!.title).toBe("When You Can't Sleep")
   })
   ```

5. **Replace the BB-24-only forbidden-phrase scan** (currently at lines 443-472, inside the `describe('when-youre-anxious plan validation', ...)` block) with a plan-agnostic version. **Remove** the existing `it('no devotional or description contains forbidden phrases', ...)` test from the anxious describe block. Instead, add a new top-level `describe('forbidden phrase scan (all plans)', ...)` block after the `loadPlan` describe block and before the per-plan validation blocks:

   ```typescript
   describe('forbidden phrase scan (all plans)', () => {
     const FORBIDDEN_PHRASES = [
       // --- Base list (inherited from BB-24) ---
       'if you have enough faith',
       'if you trusted enough',
       'if your faith were stronger',
       'if you had more faith',
       'god will heal you',
       'jeremiah 29:11',
       'plans to prosper you',
       'god wants to speak to you',
       'open your heart',
       'let god in',
       'just trust',
       'just pray more',
       'the devil is attacking you',
       'anxiety disorder',
       'generalized anxiety',
       'are you feeling better',
       // --- BB-25 sleep-specific additions ---
       "you'll sleep when",
       "just let go and you'll fall asleep",
       "the reason you can't sleep is",
       'anxiety is keeping you awake',
       'your phone is the problem',
       'try not to think about it',
       'count your blessings instead of sheep',
       'count sheep',
       'this too shall pass',
       'insomnia',
       'sleep disorder',
       'sleep hygiene',
       'insomnia disorder',
       'if you just',
       'if you would only',
     ]

     const ALL_PLANS = [
       { name: 'psalms-30-days', data: planData },
       { name: 'john-story-of-jesus', data: johnPlanData },
       { name: 'when-youre-anxious', data: anxiousPlanData },
       { name: 'when-you-cant-sleep', data: sleepPlanData },
     ]

     it('no description or devotional in any plan contains a forbidden phrase', () => {
       for (const { name, data } of ALL_PLANS) {
         const allText: Array<{ label: string; text: string }> = [
           { label: `${name} description`, text: data.description },
         ]
         for (const day of data.days) {
           if (day.devotional) {
             allText.push({ label: `${name} day ${day.day} devotional`, text: day.devotional })
           }
         }
         for (const { label, text } of allText) {
           const lower = text.toLowerCase()
           for (const phrase of FORBIDDEN_PHRASES) {
             if (lower.includes(phrase)) {
               throw new Error(
                 `Forbidden phrase "${phrase}" found in ${label}`,
               )
             }
           }
         }
       }
     })
   })
   ```

   **Rationale for the throw-instead-of-expect pattern:** When a forbidden phrase is found, the thrown error reports exactly which plan, which day, and which phrase — much more diagnostic than a plain `expect().not.toContain()` failure. This matches the spec's "zero tolerance, enforced by build-time test" intent.

   **Important:** The existing psalms and john plans contain neither "if you just" nor "if you would only" nor any sleep-specific phrase (verified by reading `psalms-30-days.json` and `john-story-of-jesus.json` at execution time). If the extended scan surfaces a hit in an earlier plan, **do not modify the scan to accommodate it** — instead, report the hit to the user and rewrite the offending devotional to remove the phrase. The scan is a product-quality gate, not a rubber stamp.

6. **Add `describe('when-you-cant-sleep plan validation', ...)` block** at the bottom of the file, mirroring the `when-youre-anxious` pattern but with BB-25-specific assertions. Include exactly these tests:

   | # | Test | Description |
   |---|------|-------------|
   | 1 | has correct metadata | Asserts slug (`when-you-cant-sleep`), title (`When You Can't Sleep`), shortTitle (`Sleep`), duration (7), theme (`emotional`), curator (`Worship Room`), estimatedMinutesPerDay (3), coverGradient (`from-blue-950/40 to-hero-dark`) |
   | 2 | has all 7 days with continuous numbering | `days.length === 7` and day numbers are `[1..7]` |
   | 3 | every day has required fields | `title`, `passages.length === 1`, `devotional` truthy, `reflectionPrompts.length === 1` |
   | 4 | all passages match the canonical 7-day structure | Iterate days 1-7 and assert `passages[0].book`, `passages[0].chapter`, `passages[0].startVerse`, `passages[0].endVerse` match the canonical table. Assert `typeof startVerse === 'number'` and `typeof endVerse === 'number'` for ALL 7 days (no full chapters). |
   | 5 | every passage uses a verse range (no full chapters) | For every day, assert `startVerse !== undefined && endVerse !== undefined` |
   | 6 | verse ranges are valid (endVerse >= startVerse) | For every day: `endVerse >= startVerse` |
   | 7 | every passage is ≤12 verses long | For every day: `endVerse - startVerse + 1 <= 12` (spec line 128, 403) |
   | 8 | verse ranges fit within actual WEB chapter verse counts | Look up `BOOK_LOOKUP[book]`, find the chapter, assert `endVerse <= verses.length` |
   | 9 | devotional word counts in range (60-120) | Per-day word count via `split(/\s+/).filter(w => w.length > 0).length` — lower floor and ceiling than BB-24 |
   | 10 | total devotional word count in range (420-840) | Sum of all 7 daily word counts |
   | 11 | reflection prompts are ≤80 characters | Per-prompt `length <= 80` (note: spec uses "under 80" but canonical Day 1 example is 80 chars; test uses `<= 80`) |
   | 12 | all 7 reflection prompts are distinct | `new Set(allPrompts).size === allPrompts.length` |
   | 13 | Day 1 reflection prompt matches canonical | Strict equality to `"Read the last verse one more time. Let it be true even if you don't feel it yet."` |
   | 14 | Day 4 reflection prompt matches canonical | Strict equality to `"You are not being shamed for being awake tonight."` |
   | 15 | Day 7 reflection prompt is exactly "Goodnight." | Strict equality to `"Goodnight."` (non-negotiable per spec line 186). Also assert `!prompt.includes('?')` and `prompt.length <= 15`. |
   | 16 | description is 130-180 words | Word count via same `split(/\s+/)` filter |
   | 17 | description references phone / late-night reading | Case-insensitive: contains one of `['phone', 'scrolling', 'late', 'night']` |
   | 18 | description contains honest-expectation language | Case-insensitive: contains one of `['think hard', 'brief on purpose', "shouldn't have to"]` |
   | 19 | description names at least 2 anxious-at-night biblical figures | Count matches for `['David', 'Jacob', 'Elijah', 'disciples']` in description — assert count >= 2 |
   | 20 | description does not promise sleep | Case-insensitive negative substring check — none of `['you will sleep', "you'll sleep", 'help you sleep', 'sleep better', 'fall asleep']` |
   | 21 | description does not contain "insomnia" | Case-insensitive substring negation: `not contain 'insomnia'` |
   | 22 | description ends with permission language | Case-insensitive: contains one of `['plan will wait', 'come back', 'another night', 'the plan will']` |
   | 23 | Day 1 devotional contains "you may not feel it" pattern | Case-insensitive: contains one of `["don't feel", 'not feel', "doesn't feel", 'may not feel']` AND the day1 devotional references the verse being "true" or "real" anyway |
   | 24 | Day 4 devotional names the disciples + storm + Jesus asleep + "not shamed" for being awake | Case-insensitive: contains `'disciples'` AND (`'storm'` OR `'boat'`) AND `'asleep'` AND `'not'` near `'shamed'` (use `.includes('not shamed')` OR `.includes("wasn't shamed")` OR `.includes("weren't shamed")` OR `.includes("didn't shame")`) |
   | 25 | Day 7 devotional speaks the Aaronic blessing and does not ask the user to do anything | Case-insensitive: contains `'bless'` AND `'peace'` (from Num 6:24-26); AND does NOT contain any of `['journal', 'share', 'recommit', 'write down', 'tell someone', 'post']` |
   | 26 | Day 7 devotional ends with permission to put the phone down | Case-insensitive: contains `'phone'` AND (`'down'` OR `'put'`) |
   | 27 | theme is a valid PlanTheme value | `VALID_THEMES` contains `'emotional'` |
   | 28 | manifest metadata matches plan metadata (no drift) | Destructure `days` out and iterate remaining keys, assert each matches the manifest entry exactly |
   | 29 | no devotional or description uses clinical sleep terminology | Case-insensitive negative check across all devotionals + description — none of `['insomnia', 'sleep disorder', 'sleep hygiene', 'insomnia disorder', 'dsm']`. This is a belt-and-suspenders check in addition to the unified forbidden-phrase scan. |
   | 30 | no devotional gives medical advice | Case-insensitive negative check — none of `['chamomile', 'melatonin', 'caffeine', 'medication', 'therapist', 'doctor', 'diagnosis']` |
   | 31 | no devotional promises sleep | Case-insensitive negative check across all 7 devotionals — none of `['you will sleep', "you'll sleep", 'help you sleep', 'fall asleep', 'sleep better', 'sleep peacefully']` |
   | 32 | no devotional tells the user to put their phone down (except Day 7) | Iterate days 1-6, assert `'put the phone down'` and `'put your phone down'` NOT in devotional. Day 7 is exempt (and permitted to contain this phrase by spec line 184). |
   | 33 | no reflection prompt contains a question mark | Iterate all 7 prompts, assert `!prompt.includes('?')` — prompts are closing lines, not questions |
   | 34 | no reflection prompt asks the user to do anything | Case-insensitive negative check per prompt — none of `['write', 'share', 'journal', 'tell', 'did this', 'are you', 'do you feel']` |

7. **Do not modify or remove any existing BB-22, BB-23, or BB-24 tests** — only the forbidden-phrase scan in the BB-24 block is being refactored out and replaced with the unified version in Step 3.5.

8. **Remove the now-obsolete anxious-only forbidden-phrase test** (current lines 443-472 inside the `when-youre-anxious plan validation` describe block). The unified `forbidden phrase scan (all plans)` block replaces it.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- DO NOT mock the plan JSON or any book JSON — import the real files for validation
- DO NOT test UI rendering — BB-21 owns that
- DO NOT add snapshot tests — they're brittle for content files
- DO NOT modify or remove any existing BB-22, BB-23, or BB-24 tests except the forbidden-phrase scan, which is refactored and moved
- DO NOT rename the existing plan data import variables (`planData`, `johnPlanData`, `anxiousPlanData`) — add `sleepPlanData` as a new import
- DO NOT skip the verse-range-in-bounds test (#8) — this is BB-24's build-time validation requirement extended to BB-25
- DO NOT skip the unified forbidden-phrase scan — the spec explicitly requires "extends BB-24's existing test, not a new file" and "scans all four plans"
- DO NOT put the forbidden-phrases list in a separate constants file — inline it in the test so the spec violations are visible at the point of enforcement
- DO NOT add a separate anxious-only forbidden-phrase test back in — the unified scan covers all four plans
- DO NOT loosen any existing BB-22, BB-23, or BB-24 test assertion in the process of making the unified scan work (if an earlier plan fails the new scan because of a phrase like "if you just", rewrite the offending devotional text — do not exclude that plan from the scan)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| manifest contains all four plans | unit | `loadManifest()` returns array with 4 entries |
| sleep plan loads without error | unit | `loadPlan('when-you-cant-sleep')` returns `{ plan, error: null }` with 7 days |
| sleep plan has correct metadata | unit | All 9 metadata fields match canonical values |
| all 7 days continuous numbering | unit | `[1..7]` with no gaps |
| every day has required fields | unit | title, passages (1), devotional, reflectionPrompts (1) all valid |
| canonical 7-day passage structure | unit | Book + chapter + verse range match canonical table for all 7 days |
| every passage uses verse range (no full chapters) | unit | `startVerse` and `endVerse` defined for all 7 days |
| verse ranges valid (endVerse >= startVerse) | unit | For all 7 days |
| every passage ≤12 verses | unit | `endVerse - startVerse + 1 <= 12` |
| verse ranges fit WEB chapter bounds | unit | `endVerse <= verses.length` looked up against actual book JSON |
| devotional word count per day (60-120) | unit | Per-day validation |
| total devotional word count (420-840) | unit | Sum validation |
| reflection prompts ≤80 characters | unit | Per-prompt validation |
| no duplicate reflection prompts | unit | All 7 distinct |
| day 1 canonical reflection prompt | unit | Strict match |
| day 4 canonical reflection prompt | unit | Strict match |
| day 7 reflection prompt is "Goodnight." | unit | Strict match + no question mark + ≤15 chars |
| description 130-180 words | unit | Word count |
| description references phone / late-night | unit | Substring check |
| description contains honest-expectation language | unit | Substring check |
| description names ≥ 2 anxious-at-night figures | unit | Pattern count |
| description does not promise sleep | unit | Substring negation |
| description does not contain "insomnia" | unit | Substring negation |
| description ends with permission language | unit | Substring check |
| day 1 devotional contains "you may not feel it" pattern | unit | Substring pattern match |
| day 4 devotional names disciples + storm + Jesus asleep + "not shamed" | unit | Substring pattern match |
| day 7 devotional speaks the Aaronic blessing and no call to action | unit | Substring match + substring negation |
| day 7 devotional ends with permission to put phone down | unit | Substring match |
| theme is valid PlanTheme | unit | `'emotional'` in `VALID_THEMES` |
| manifest matches plan metadata | unit | Zero drift |
| no devotional or description uses clinical sleep terminology | unit | Substring negation |
| no devotional gives medical advice | unit | Substring negation |
| no devotional promises sleep | unit | Substring negation |
| no non-Day-7 devotional tells user to put phone down | unit | Substring negation |
| no reflection prompt contains a question mark | unit | Per-prompt check |
| no reflection prompt asks user to do anything | unit | Per-prompt substring negation |
| **unified forbidden-phrase scan (all plans)** | unit | Scans descriptions + devotionals of all 4 plans against the full base+sleep forbidden list |

**Expected state after completion:**

- [ ] All new tests pass
- [ ] All existing BB-22 tests still pass
- [ ] All existing BB-23 tests still pass
- [ ] All existing BB-24 tests still pass (minus the removed anxious-only forbidden-phrase test, which is replaced by the unified scan)
- [ ] Unified forbidden-phrase scan passes against all 4 plans
- [ ] `pnpm vitest run src/lib/bible/__tests__/planLoader.test.ts` passes with zero failures
- [ ] `pnpm build` passes cleanly (zero TypeScript errors)
- [ ] Pre-existing unrelated test failures in other files (if any) remain unchanged from base commit — spot-check to confirm nothing BB-25-related regressed

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create plan JSON (all book slugs pre-verified, no upstream dependencies) |
| 2 | 1 | Update manifest (needs plan metadata to exist so values can be copied without drift) |
| 3 | 1, 2 | Add tests (imports both the plan JSON and the manifest JSON; refactors BB-24 forbidden-phrase scan) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create plan JSON | [COMPLETE] | 2026-04-10 | Created `frontend/src/data/bible/plans/when-you-cant-sleep.json`. 7 days, 703 total devotional words (Day 1: 99, Day 2: 104, Day 3: 104, Day 4: 102, Day 5: 95, Day 6: 99, Day 7: 100 — all in 60-120 range). Description 153 words. All prompts ≤80 chars. All WEB quotes verified against source JSONs (Psalm 4:8 "lay myself down and sleep", Genesis 28:16 "Surely the LORD", Psalm 63:6 "on my bed"/"the night watches", Lamentations 3:22-23 "mercies don't fail", Numbers 6:24-26 full blessing with "towards"). Day 3 title kept as "Elijah under the broom tree" per plan lock even though WEB body uses "tree" (avoided quoting "broom tree"/"juniper tree" directly to sidestep the WEB mismatch). Day 3 body uses "lie back down" instead of "sleep" to avoid any sleep-promise substring risk. Day 6 uses "He cannot rest" instead of "He cannot sleep" to keep `sleep` usage minimal. Forbidden-phrase scan clean. |
| 2 | Update manifest | [COMPLETE] | 2026-04-10 | Appended `when-you-cant-sleep` as 4th entry in `manifest.json`. Existing 3 entries unchanged. Zero metadata drift verified via script: all 9 metadata fields byte-match the plan JSON. `days` field absent from manifest entry. |
| 3 | Add tests + extend forbidden-phrase scan | [COMPLETE] | 2026-04-10 | Modified `frontend/src/lib/bible/__tests__/planLoader.test.ts`. Added `sleepPlanData` + `genesisBook` + `numbersBook` imports. Extended `BOOK_LOOKUP` with genesis and numbers. Updated `loadManifest` test to expect 4 entries. Added `loadPlan('when-you-cant-sleep')` test. **Deleted BB-24's anxious-only forbidden-phrase scan** (formerly at lines 443-472 inside the anxious describe block). **Added new top-level `describe('forbidden phrase scan (all plans)', ...)` block** between `loadPlan` and `psalms-30-days plan validation` — throw-instead-of-expect pattern for diagnostic errors that identify exact plan + day + phrase. Added new `describe('when-you-cant-sleep plan validation', ...)` block at EOF with all 34 tests from plan spec. **83 tests total, all pass on first run.** `pnpm build` clean (0 errors, 0 warnings on BB-25 files). Lint clean for BB-25 files (pre-existing errors in unrelated files unchanged). |
