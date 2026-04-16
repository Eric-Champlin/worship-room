# BB-22: 30 Days in the Psalms

**Branch:** `bible-redesign` (no new branch -- all work commits directly here)
**Depends on:** BB-21 (plans architecture -- store, types, loader, manifest, detail page, day page, completion celebration, reader banner), BB-21.5 (plan browser -- the manifest entry becomes visible automatically)
**Hands off to:** BB-23 (The Story of Jesus in John), BB-24 (When You're Anxious), BB-25 (When You Can't Sleep)
**Design system recon:** `_plans/recon/design-system.md` (available)

---

## Overview

Ship the first real reading plan: **30 Days in the Psalms**. A slow, contemplative walk through thirty selected Psalms, one per day, with each day's devotional text, reflection prompts, and passage references curated specifically for emotional healing contexts.

This is the spec that turns BB-21 from "infrastructure" into "product." Until BB-22 ships, a user navigating to `/bible/plans` sees the empty state from BB-21.5. After BB-22 ships, they see one real plan they can start, read, and complete. The Psalms are the book of scripture most explicitly written *in* emotionally vulnerable states -- grief, anxiety, sleeplessness, spiritual dryness. Leading with Psalms signals the app's posture from day one.

This spec is about **content creation**, not architecture. The code work is trivial: one new JSON file, one manifest update, one test addition. The value is the curation.

## User Story

As a **logged-in user**, I want to start a 30-day reading plan through selected Psalms so that I can build a consistent, guided relationship with scripture during a difficult season without having to decide what to read each day.

As a **logged-out visitor**, I want to browse the plan's detail page and read the description and day list so that I can decide whether to create an account and start the plan.

## Requirements

### Functional Requirements

#### Plan Content File

1. A new JSON file at `frontend/src/data/bible/plans/psalms-30-days.json` containing the complete plan data
2. The file must conform to the existing `Plan` type in `frontend/src/types/bible-plans.ts` -- **no schema changes**

#### Type Reconciliation Note

The `Plan` type (BB-21) uses these fields: `slug`, `title`, `shortTitle`, `description`, `theme` (union: `'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'`), `duration`, `estimatedMinutesPerDay`, `curator`, `coverGradient`, `days[]`. Each `PlanDay` has: `day`, `title`, `passages[]`, optional `devotional`, optional `reflectionPrompts` (string array).

The plan phase must map the spec's curation intent to these actual fields:

| Spec Intent | Actual `Plan` Field | Value |
|-------------|-------------------|-------|
| ID: `psalms-30-days` | `slug` | `"psalms-30-days"` |
| Title: "30 Days in the Psalms" | `title` | `"30 Days in the Psalms"` |
| Short title for compact UI | `shortTitle` | `"Psalms"` or similar |
| ~180 word description | `description` | See "Long-Form Description" below |
| Contemplative/devotional tone | `theme` | `"comfort"` or `"prayer"` (closest match from the union) |
| 30 days | `duration` | `30` |
| Minutes per day estimate | `estimatedMinutesPerDay` | ~5-10 (Psalms are short) |
| Author: Worship Room | `curator` | `"Worship Room"` |
| Visual gradient | `coverGradient` | Indigo-toned gradient class (e.g. `"from-indigo-500/30 to-hero-dark"`) |
| Day numbers 1-30 | `days[].day` | 1-indexed |
| Day titles | `days[].title` | See curation below |
| Passages | `days[].passages` | `{ book: "psalms", chapter: N }` |
| Devotional paragraphs | `days[].devotional` | See curation below |
| Reflection prompts | `days[].reflectionPrompts` | String array (1-2 prompts per day) |

**Fields the spec mentions that do NOT exist on `Plan`**: `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`. The plan phase must work within the existing type. If any of these are essential for the plan browser display (BB-21.5), defer the type extension to a follow-up spec -- BB-22 ships within the existing schema.

#### The Long-Form Description (~180 words)

Use this text (revise lightly if needed for final wording):

> The Psalms are the prayer book of the Bible. For three thousand years, people have turned to these poems when they needed language for what they were feeling -- grief, joy, rage, wonder, loneliness, hope. They are the book David wrote, and the book Jesus prayed, and the book the church has held closest in its hardest centuries.
>
> This plan walks through thirty Psalms over thirty days. Not every Psalm, not in order -- a curated path through the ones that most often carry people through difficult seasons. Some are short. Some are long. All of them are honest.
>
> Each day has one Psalm, a few sentences of context, and a question to sit with. You don't need to understand everything. You don't need to feel something specific. You just need to read.
>
> Thirty days is a long time. Some days you'll read and nothing will happen. Other days a single line will land and stay with you for weeks. Both are normal. Both are the point.

#### Manifest Update

3. `manifest.json` at `frontend/src/data/bible/plans/manifest.json` (currently `[]`) must contain an entry for `psalms-30-days` matching `PlanMetadata` (which is `Omit<Plan, 'days'>`)
4. The manifest entry must exactly match the full plan's metadata fields -- no drift

#### Build-Time Validation

5. Every passage's `book` + `chapter` combination must exist in the WEB JSON data
6. Every passage with `startVerse`/`endVerse` must have valid verse numbers
7. The `duration` field must match the length of the `days` array (30)
8. BB-21's plan loader must pass on the new plan file without errors

#### Test Coverage

9. A test case in the validator test file explicitly loads `psalms-30-days.json` and verifies it passes validation

### The 30-Day Curation

#### Curation Principles

- **Not in canonical order.** The order follows an emotional arc: entry, descent, dwelling, wisdom, trust, ascent
- **Mix of lengths.** Some Psalms are 3 verses (Psalm 131), some are 22+ (Psalm 103). Variety keeps daily commitment unpredictable
- **No imprecatory Psalms.** No Psalm 137, 109, 69 (cursing content). Too raw for a contemplative healing plan
- **Include 1-2 "hard" Psalms.** Psalm 88 (ends in darkness, no resolution) teaches that scripture has room for "I'm not okay"
- **Anchor with famous ones.** Psalm 23, 46, 91, 139 must be present -- users expect them and they earn their place
- **Surprise with lesser-known gems.** Psalm 62, 84, 131, 27 -- deeply loved by scholars, less known to casual readers
- **End with ascent and praise.** Last 5 days build toward arrival. The user finishes feeling taken on a journey

#### The 30 Psalms

**Days 1-5: Entry -- "Where you are is okay"**

| Day | Psalm | Title | Why |
|-----|-------|-------|-----|
| 1 | 23 | The Shepherd | The most famous Psalm. Begin with the familiar as a doorway |
| 2 | 46 | The Refuge | "Be still and know." Establishes grounding posture |
| 3 | 121 | The Hills | A pilgrim's Psalm. Short, clear, confident |
| 4 | 62 | The Silence | Quiet Psalm about patience most users haven't read |
| 5 | 27 | The Light | Trust and trouble coexisting |

**Days 6-10: Descent -- "Some days you won't be okay"**

| Day | Psalm | Title | Why |
|-----|-------|-------|-----|
| 6 | 42 | The Thirst | Introduces vocabulary of spiritual longing |
| 7 | 13 | How Long | A lament that ends in trust. Shape of honest prayer |
| 8 | 88 | The Darkness | The only Psalm that ends without resolution. Critical day |
| 9 | 77 | The Memory | Lament that ends in remembering God's past deeds |
| 10 | 51 | The Return | David's confession. Shame and return |

**Days 11-15: Dwelling -- "What it looks like to live with God"**

| Day | Psalm | Title | Why |
|-----|-------|-------|-----|
| 11 | 90 | The Dwelling Place | Moses' Psalm. Brevity of life, eternity of God |
| 12 | 91 | The Shelter | Protection in a present-tense sense |
| 13 | 131 | The Weaned Child | Three verses. Possibly the most tender Psalm |
| 14 | 84 | The Lovely Place | A pilgrim arriving at the temple. Joy without hype |
| 15 | 63 | The Wilderness | Spiritual hunger written from the desert |

**Days 16-20: Wisdom -- "What God is like"**

| Day | Psalm | Title | Why |
|-----|-------|-------|-----|
| 16 | 139 | The Search | God's inescapable attention. Intimacy |
| 17 | 103 | The Mercy | A long Psalm worth every verse |
| 18 | 32 | The Forgiven | David's settled reflection on confession |
| 19 | 19 | The Heavens | Creation and scripture both speaking |
| 20 | 1 | The Tree | The book's introduction, placed here so the user appreciates it |

**Days 21-25: Trust -- "Who God is to me"**

| Day | Psalm | Title | Why |
|-----|-------|-------|-----|
| 21 | 16 | The Refuge | "You will not abandon my soul." Quietly confident |
| 22 | 34 | The Testimony | "Taste and see that the Lord is good" |
| 23 | 40 | The New Song | Answered lament. "He put a new song in my mouth" |
| 24 | 116 | The Gratitude | Recovery from near-death. Gratitude without embellishment |
| 25 | 73 | The Sanctuary | Envy of the wicked, resolved in the sanctuary |

**Days 26-30: Ascent -- "The walk home"**

| Day | Psalm | Title | Why |
|-----|-------|-------|-----|
| 26 | 100 | The Joyful Noise | Short, pure praise. Begin the final ascent |
| 27 | 145 | The King | Last acrostic Psalm. Orderly praise |
| 28 | 136 | The Refrain | "His steadfast love endures forever" -- meditative repetition |
| 29 | 150 | The Finale | Six verses of exultation. The final Psalm |
| 30 | 103 (reprise) | The Return | Intentional reprise of day 17. The plan ends where it was halfway through |

**No Psalm is repeated except Psalm 103 on day 30.** The reprise is deliberate -- the point isn't forward motion, it's depth. The day 30 devotional must explicitly call out and explain the reprise.

#### Devotional Text Requirements

Each day has a devotional paragraph (100-180 words, **hard upper limit 200 words**) that does three things:

1. **Sets context** -- what was happening when this Psalm was written, or what it's about
2. **Names the emotional terrain** -- what a reader might be feeling as they approach this text
3. **Closes the gap** -- connects the ancient text to the user's present moment

**Voice**: Restrained, honest, never saccharine. No "God wants to speak to you today." Yes to "This Psalm was written by someone who lost everything. You don't have to have lost everything to read it."

**Example -- Day 1, Psalm 23:**

> You already know this one. Or you know pieces of it. "The Lord is my shepherd, I shall not want." "He leads me beside still waters." "Though I walk through the valley of the shadow of death." These lines have survived three thousand years because they keep working, even for people who don't believe in shepherds or valleys.
>
> David wrote this as a king looking back on being a shepherd boy. He wasn't writing metaphor -- he was writing memory. He knew what it was like to lead sheep to actual water, to fight actual predators, to count actual lost ones.
>
> Read it slowly today. Don't try to feel anything specific. The Psalm is doing the work.

**Example -- Day 8, Psalm 88:**

> This is the hardest Psalm in the Bible. It is the only one that ends in darkness. The last verse -- "you have caused my beloved and my friend to shun me; my companions have become darkness" -- closes the Psalm without any resolution, any turn, any pivot toward hope. It just ends.
>
> The Bible keeps it in the book anyway.
>
> That's worth sitting with. There is room in scripture for a prayer that doesn't resolve. For a person who couldn't reach the other side. For the Tuesday where the darkness was still there at the end of the day. You are not outside the faith if you feel like this. You are in a Psalm.
>
> Read it today even if you can't identify with it. Someday you might. When you do, you'll remember this Psalm was waiting.

**WEB translation verification**: All quoted phrases in devotionals must match the WEB text in the codebase (from BB-4), not paraphrases from NIV or ESV memory. Cross-reference before finalizing.

#### Reflection Prompt Requirements

Each day has 1-2 reflection prompts as a string array. Each prompt is 30-140 characters. All 30 days must have distinct prompts -- no repeated phrasing. Each prompt should feel written for its specific Psalm on its specific day.

**Examples:**

- Day 1 (Psalm 23): "What are you most afraid of today? Does the shepherd language change how you hold that fear?"
- Day 8 (Psalm 88): "Is there a place in your life where you'd be willing to pray this Psalm honestly?"
- Day 16 (Psalm 139): "Which verses made you feel seen? Which ones made you want to hide?"
- Day 30 (Psalm 103 reprise): "You've been walking for 30 days. What has changed? What hasn't?"

### Non-Functional Requirements

- **Performance**: The plan JSON is lazy-loaded on demand (not bundled in main chunk), per BB-21's loader architecture
- **Accessibility**: Inherited from BB-21's plan infrastructure (detail page, day page, reader banner all have accessibility built in)

## Auth Gating

Inherited entirely from BB-21. No new interactive elements in BB-22.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View plan in browser grid | Can view card | Can view card | N/A |
| View plan detail page | Can view description and day list | Full access | N/A |
| Start the plan | Auth modal | Starts plan | "Sign in to start a reading plan" |
| Mark day complete | Auth modal | Marks complete | "Sign in to track your progress" |
| View plan day page | Can view devotional and passages | Full access | N/A |
| Read passage from plan | Navigates to Bible reader (public) | Same | N/A |

## Responsive Behavior

Inherited entirely from BB-21's plan detail page and plan day page responsive behavior.

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, collapsible day list, sticky mark-complete button |
| Tablet (640-1024px) | Single column wider margins, passage cards in 2-col if >= 2 passages |
| Desktop (> 1024px) | Hero full-width, day list full-width or sidebar, inline mark-complete |

No new responsive patterns introduced by BB-22.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can browse the plan detail and day pages (read-only). Cannot start or track progress
- **Logged-in users:** Full plan lifecycle via `bible:plans` localStorage key (BB-21's plansStore)
- **Route type:** Public (viewing), Protected (starting/completing)
- **No new localStorage keys** -- BB-22 uses BB-21's existing `bible:plans` key

## Completion & Navigation

Inherited from BB-21:
- Completing all 30 days triggers `PlanCompletionCelebration.tsx`
- The celebration identifies the plan's theme and shows appropriate reflective text
- Reading a Psalm from within a plan day shows the reader banner (`ActivePlanReaderBanner.tsx`)
- Marking day complete from the reader banner advances the day pointer
- The plan detail page renders the full day list with titles and reflection prompts visible

## Design Notes

- The plan uses an indigo-toned cover gradient for visual identity (contemplative, ancient). The exact Tailwind gradient class should be determined in the plan phase to match the existing design system tokens
- Future plans reserve different color spaces: BB-23 John (amber), BB-24 Anxious (sage), BB-25 Sleep (midnight)
- All UI rendering uses BB-21's existing components -- no new components for BB-22
- Devotional text renders as plain `<p>` elements split on double newlines -- no HTML, no markdown (per BB-21 requirement #33)

## Out of Scope

- **No new code beyond the JSON file, manifest update, and test.** No new components, hooks, or utilities. BB-21 and BB-21.5 built everything BB-22 needs
- **No schema changes to the `Plan` type.** If the existing type is missing fields (e.g., `coverEmoji`, `tags`, `category`), defer type extensions to a follow-up spec
- **No new design tokens.** Work within existing Tailwind classes
- **No translation other than WEB.** All passage references are WEB
- **No audio version.** BB-26 handles FCBH audio
- **No images.** Cover gradient only, no cover art or per-day illustrations
- **No commentary beyond the day devotional.** No footnotes, external links, or verse-by-verse breakdown
- **No seasonal timing.** The plan is evergreen, not tied to liturgical calendar
- **No personalization.** Every user gets the same 30 days in the same order
- **No analytics.** Not tracking which Psalm is most-read
- **No branching paths.** Linear: day 1, day 2, ..., day 30
- **No music recommendations per Psalm.** No linking to ambient sounds
- **No external resources.** No commentaries, sermons, or podcasts
- **No user ratings or feedback collection.**

## Execution Notes

- **The curation is the work.** Each of the 30 devotional paragraphs deserves real effort. Do not produce 30 formulaic devotionals. Budget time for the writing
- **Day 8 (Psalm 88) is the most important day.** Get it right. A user who reads Psalm 88 and feels seen instead of preached-at is a user who trusts the whole plan
- **The day 30 reprise is deliberate.** Do not substitute a different Psalm "for variety." The point is the return. The devotional text must explicitly call out the reprise and explain why
- **Verify WEB translation.** Cross-reference quoted phrases against actual WEB text in `frontend/src/data/bible/` JSON files. Example: verify Psalm 46 says "Be still, and know that I am God" in WEB specifically
- **Total devotional word count: 3000-5400 words** (100-180 words x 30 days). No day shorter than 100 words or longer than 200 words
- **40 passages, all from Psalms.** Every passage references the book of Psalms only

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/data/bible/plans/psalms-30-days.json` | Complete plan data conforming to `Plan` type |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/data/bible/plans/manifest.json` | Add `psalms-30-days` entry (currently `[]`) |
| Validator test file (if exists, or create) | Add test case loading `psalms-30-days.json` |

## Acceptance Criteria

### Plan File Structure
- [ ] New file exists at `frontend/src/data/bible/plans/psalms-30-days.json`
- [ ] File validates against BB-21's `Plan` TypeScript type (all required fields present)
- [ ] `slug` is `"psalms-30-days"` (unique across all plans)
- [ ] `duration` is exactly `30`
- [ ] `days` array contains exactly 30 entries
- [ ] Each day entry has a `day` field (1-indexed, continuous 1-30)
- [ ] Each day entry has a non-empty `title` field
- [ ] Each day entry has at least one passage in its `passages` array
- [ ] Every passage has `book: "psalms"` (no other books in this plan)
- [ ] Every passage's `chapter` is a valid Psalm chapter in the WEB data
- [ ] `theme` is one of the allowed `PlanTheme` values

### Content Quality
- [ ] Each day has a non-empty `devotional` field (100-200 words)
- [ ] Total devotional word count is between 3000 and 5400 words
- [ ] Each day has a non-empty `reflectionPrompts` array (1-2 prompts per day)
- [ ] Each reflection prompt is 30-140 characters
- [ ] All 30 reflection prompts are distinct (no repeated phrasing)
- [ ] The description field is approximately 180 words with restrained, honest tone
- [ ] All quoted WEB scripture in devotionals matches the actual WEB translation text

### Curation Integrity
- [ ] The 30 Psalms include Psalm 23, 46, 91, and 139 (anchor Psalms)
- [ ] The plan includes Psalm 88 (unresolved lament) with careful devotional
- [ ] No imprecatory Psalms (no Psalm 137, 109, 69, etc.)
- [ ] No Psalm is repeated except Psalm 103 on day 30 (intentional reprise)
- [ ] Day 30's devotional explicitly explains the reprise
- [ ] The emotional arc follows: entry (1-5), descent (6-10), dwelling (11-15), wisdom (16-20), trust (21-25), ascent (26-30)
- [ ] Days 26-30 end with praise/ascent Psalms
- [ ] Devotional voice is consistent: restrained, honest, no saccharine promises

### Manifest & Validation
- [ ] `manifest.json` contains an entry for `psalms-30-days` matching `PlanMetadata`
- [ ] Manifest entry matches the full plan's metadata (no drift)
- [ ] BB-21's plan loader loads the plan without errors
- [ ] A test case explicitly validates `psalms-30-days.json`

### Integration (verified via existing BB-21 infrastructure)
- [ ] Plan appears in the BB-21.5 plan browser grid
- [ ] Starting the plan creates a progress record in plansStore
- [ ] Completing all 30 days triggers the completion celebration
- [ ] Reading a Psalm from a plan day shows the reader banner
- [ ] Marking a day complete from the reader banner advances the day pointer
- [ ] Plan detail page renders the full day list with titles and reflection prompts
