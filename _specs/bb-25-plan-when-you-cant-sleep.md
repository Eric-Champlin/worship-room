# BB-25: Plan — When You Can't Sleep

**Branch:** `bible-redesign` (no new branch — all work commits directly here)
**Depends on:** BB-21 (plans architecture — store, types, loader, manifest, detail page, day page, completion celebration, reader banner), BB-21.5 (plan browser — the manifest entry becomes visible automatically), BB-22 (Psalms — contemplative voice), BB-23 (John — narrative voice), BB-24 (Anxious — emotional/topical voice and the forbidden-phrase scan pattern)
**Hands off to:** No further plan content specs in the wave. BB-26 begins the Audio Bible section.

---

## Overview

Ship the fourth and final reading plan: **When You Can't Sleep** — a 7-day topical plan for users in active sleeplessness. Where BB-24 is for users in emotional distress about *something*, BB-25 is for users who are awake when they don't want to be, and the being-awake is itself the problem. The texture of sleeplessness is slower and lonelier than anxiety — more about the physical reality of being awake when the world is asleep — and the plan must reflect that.

This is a content spec. The architecture is fully proven by BB-21 through BB-24. The deliverable is one JSON file, a manifest update, and a validator test case. The work is the curation and the writing.

**This is the last content spec in the wave.** After BB-25 ships, the manifest contains four real plans — 30 Days in the Psalms, The Story of Jesus, When You're Anxious, and When You Can't Sleep — each with a distinct voice, length, and emotional register. BB-26 begins a meaningfully different kind of work (FCBH audio Bible integration).

**The test that defines success:** if a user reading at 2 AM on their phone in a dark room can finish a day without having to concentrate, and can put their phone down afterward feeling accompanied rather than lectured, the spec worked.

## Why this plan is different from BB-24

BB-24 and BB-25 overlap emotionally but serve different needs, different timelines, and different reading contexts:

- **BB-24 is for active emotional distress** — the user might be reading at any time of day, calm enough to absorb meaning, able to handle denser passages and longer devotionals. Fourteen days respects the seasonal nature of anxiety.
- **BB-25 is for the physical reality of being awake at night** — the user is reading at 11 PM, 1 AM, 3 AM, 4 AM on a phone with the brightness turned down in a dark room. They've been trying to sleep for hours. Their mind won't stop. They have no cognitive bandwidth. Seven days respects the episodic nature of sleeplessness (a few bad nights, not a fourteen-night season).
- **BB-24 can be read in normal daylight.** BB-25 will mostly be read in the dark in bed. Everything is optimized for "this is what I needed right now and now I can put my phone down."

If a devotional in BB-25 could have been written for BB-22, BB-23, or BB-24, it is wrong. The voice is the most restrained in the wave.

## User Story

As a **logged-in user** who cannot sleep, I want to open a short reading plan at 2 AM and find a brief, gentle passage and a few paragraphs that don't require concentration, so that I can put my attention somewhere that meets me where I am without promising me sleep I can't have.

As a **logged-out visitor**, I want to browse the plan's detail page and read the description so that I can tell whether this plan will meet me in the dark or pretend I'm not in it, before creating an account.

## Requirements

### Functional Requirements

#### Plan Content File

1. A new JSON file at `frontend/src/data/bible/plans/when-you-cant-sleep.json` containing the complete plan data
2. The file must conform to the existing `Plan` type in BB-21 — **no schema changes**

#### Type Reconciliation Note

Same constraint BB-22, BB-23, and BB-24 operated under. The spec's input mentions fields that do NOT exist on the `Plan` type (`id`, `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author`, `durationDays`). Those are descriptive intent only. The plan phase must work within the existing type:

| Spec Intent | Actual `Plan` Field | Value |
|-------------|-------------------|-------|
| ID: `when-you-cant-sleep` | `slug` | `"when-you-cant-sleep"` |
| Title: "When You Can't Sleep" | `title` | `"When You Can't Sleep"` |
| Short title for compact UI | `shortTitle` | `"Sleep"` |
| ~150 word description | `description` | See "Long-Form Description" below |
| Sleep/emotional topical plan | `theme` | `"emotional"` (direct match — the `sleep` enum value also exists in the `theme` union per BB-21; the plan phase MUST verify which value triggers the correct completion-celebration text. **Use `"emotional"` unless inspection of BB-21's `PlanCompletionCelebration.tsx` shows `"sleep"` has its own category text.** Acceptance criteria lock this to `"emotional"` as the default so the existing restrained emotional-category text fires unchanged.) |
| 7 days | `duration` | `7` |
| Minutes per day estimate | `estimatedMinutesPerDay` | `3` (honor the "the user at 3 AM cannot focus" principle — do not overpromise engagement time) |
| Author: Worship Room | `curator` | `"Worship Room"` |
| Deep midnight blue gradient | `coverGradient` | Midnight/indigo-blue-toned gradient. Must be visually distinct from BB-22's indigo (`from-indigo-500/30`), BB-23's amber, and BB-24's emerald. Candidates: `"from-blue-950/40 to-hero-dark"`, `"from-indigo-950/40 to-hero-dark"`, `"from-slate-900/40 to-hero-dark"`. Darker than BB-22's indigo-500 — this plan is the midnight one. The plan phase picks the exact class; see Design Notes. |
| Day numbers 1-7 | `days[].day` | 1-indexed, 1-7 |
| Day titles | `days[].title` | See curation below |
| Passages (short verse ranges) | `days[].passages` | One passage per day, using book/chapter plus `startVerse`/`endVerse`. Every passage is a verse range (no full chapters). |
| Devotional paragraphs | `days[].devotional` | See curation below |
| Reflection prompts | `days[].reflectionPrompts` | String array (1 prompt per day) |

**The `coverEmoji: 🌙` and `themeColor: accent-midnight` from the spec input are descriptive intent only.** BB-21's Plan type does not carry emoji or named theme color fields. Visual identity is carried by `coverGradient` alone.

#### The Long-Form Description (~150 words)

The description is load-bearing. It must:

- Acknowledge the user's physical situation (late, on a phone, unable to sleep)
- Set honest expectations ("You shouldn't have to think hard")
- Reframe scripture's relationship to sleeplessness (Bible characters were awake too, and none of them got fixed — they got accompanied)
- **NOT promise sleep** in any form

**Reference text** (the spec input provides this as the target; the plan phase may refine but must not soften):

> If you're reading this, it's probably late. Or early — the kind of early that doesn't feel like morning yet. You've been trying to sleep and it isn't working. Your mind won't slow down or your body won't settle or both, and you reached for your phone, and you ended up here.
>
> This plan is seven short readings for nights like that. Each one is brief on purpose. You shouldn't have to scroll much. You shouldn't have to think hard. The Bible has more night passages than you might expect, written by people who were also awake when they didn't want to be. David's late prayers. Jacob alone in the dark. The disciples in a boat through the small hours. None of them got fixed by reading scripture either. Some of them just got accompanied through it.
>
> Read one tonight. Maybe read another tomorrow night if you need to. The plan will wait.

This description does four things the plan phase must not soften:
- **Names the user's physical situation.** On a phone, late, reaching for it because sleep isn't coming.
- **Sets honest expectations.** "You shouldn't have to think hard." Permission slip.
- **Reframes scripture's posture.** Bible people were awake too. The plan's central pastoral claim.
- **Never promises sleep.** "Read one tonight. Maybe read another tomorrow night if you need to. The plan will wait." That's all.

#### Manifest Update

3. `manifest.json` must contain an entry for `when-you-cant-sleep` as the fourth item (after `psalms-30-days`, `john-story-of-jesus`, and `when-youre-anxious`)
4. The manifest entry must exactly match the full plan's metadata fields — no drift
5. The manifest now contains exactly four plans

#### Build-Time Validation

6. Every passage has a valid WEB book slug (lowercase)
7. Every passage with `startVerse`/`endVerse` has `endVerse >= startVerse` and both within the chapter's actual verse count. The build-time verse range validation introduced by BB-24 must pass for all BB-25 verse ranges.
8. The `duration` field matches the length of the `days` array (7)
9. BB-21's plan loader loads the plan file without errors

#### Test Coverage

10. A test case added in the same plan validator test file where BB-22, BB-23, and BB-24's test cases live (`frontend/src/data/bible/plans/__tests__/validator.test.ts` or the equivalent location — plan phase picks the correct file by inspection). The test explicitly loads and validates `when-you-cant-sleep.json`.

11. **Forbidden-phrase scan extension.** BB-24 introduced a forbidden-phrase scan test (Test #17 in its test file). BB-25 **extends the existing test** to cover this plan and adds sleep-specific forbidden phrases. Do NOT create a new test file. The same test scans all four plans and fails if any plan contains any forbidden phrase.

Sleep-specific additions to the existing forbidden-phrase scan:

- `"you'll sleep when"` (any casing)
- `"just let go and you'll fall asleep"`
- `"the reason you can't sleep is"`
- `"anxiety is keeping you awake"`
- `"your phone is the problem"`
- `"try not to think about it"`
- `"count your blessings instead of sheep"` (and variations like `"count sheep"`)
- `"this too shall pass"`
- Clinical sleep terms: `"insomnia"`, `"sleep disorder"`, `"sleep hygiene"`, `"insomnia disorder"`
- `"if you just"` / `"if you would only"` (already covered by BB-24's scan — verify coverage, do not duplicate)

### The 7-Day Curation

#### Curation Principles

- **Every devotional under 120 words.** Hard ceiling. Most days should be under it. Short enough to read on a single phone screen without scrolling.
- **Every reflection prompt under 80 characters.** Not a real prompt — a closing line the user glances at and lets drift.
- **Every passage under 12 verses.** No full chapters. The user at 3 AM cannot focus on a long passage.
- **Quiet language, no metaphors that require unpacking.** Plain prose. No layered imagery that requires concentration.
- **Mix "Bible characters who were awake" days with "passages about night" days.** Half the plan is about people who were awake when they didn't want to be (Jacob, Elijah, the disciples in the boat). Half is about passages that explicitly name night as a condition God is present in.
- **No "and then they slept peacefully" endings.** The plan does not promise the user will sleep. Bible characters who were awake stayed awake. The plan honors that.
- **End with a benediction-style day.** Day 7 is a closing prayer the user reads and puts the phone down with. Not a triumph. A quiet release.

#### The 7 Days (canonical — passages are locked)

| Day | Passage | Title | Center |
|-----|---------|-------|--------|
| 1 | Psalm 4:1-8 | Lying down in peace | David's evening prayer; the user may not feel it, and that's okay |
| 2 | Genesis 28:10-17 | Jacob's stone | The worst pillow in scripture; God met him there anyway |
| 3 | 1 Kings 19:4-8 | Elijah under the broom tree | Two naps and two meals; the gentlest divine response in the Bible |
| 4 | Mark 4:35-41 | Jesus asleep in the boat | **Load-bearing day.** The disciples couldn't sleep; they were not shamed for it |
| 5 | Psalm 63:1-8 | On my bed I remember you | "The watches of the night" — David was up at the same hour the user is |
| 6 | Lamentations 3:21-26 | Mercies new every morning | "Mercies new every morning" read in its actual context (Lamentations = catastrophe); a promise of dawn, not healing |
| 7 | Numbers 6:24-26 | The blessing | **Closing benediction.** The Aaronic blessing spoken over the user; day 7's reflection prompt is "Goodnight." |

**No full chapters.** Day 1 uses Psalm 4:1-8 explicitly (acceptance criterion). Every other day is already a verse range.

**The "Day 4 pastoral move" is non-negotiable.** Day 4's devotional must explicitly include the central claim: the disciples were the ones awake, Jesus was the one sleeping, and the disciples were NOT shamed for being unable to sleep through the storm. The usual church reading of Mark 4 is "Jesus stills storms" — BB-25 flips it to "the disciples were not shamed for being awake when they couldn't be calm." That reframe is the plan's central pastoral move for Day 4.

**Day 7 is the load-bearing day.** Like BB-22's Psalm 88, BB-23's Lazarus, and BB-24's Gethsemane — but in a completely different way. Day 7 functions as the closing prayer of the whole plan. The user reads the Aaronic blessing, sees the single word "Goodnight." as the reflection prompt, and puts the phone down. **The "Goodnight." reflection prompt is non-negotiable.** If day 7 is too long or too instructive, the plan loses its closing gesture.

#### Load-Bearing Devotionals

**Day 4 (Mark 4:35-41) — "Jesus asleep in the boat"** is the central pastoral move. The devotional must:

1. Name the situation concretely (disciples in a boat in a storm at night; Jesus asleep in the back on a cushion)
2. Flip the usual reading — the disciples couldn't sleep through it, and Jesus did NOT shame them for it
3. End by applying that directly to the user: "You are not being shamed for being awake tonight."

**Reference tone** (from the spec input — plan phase may refine but must not soften the central claim):

> The disciples were in a boat in a storm at night. They were terrified. Jesus was asleep in the back of the boat with his head on a cushion.
>
> The disciples couldn't sleep through it. Jesus could.
>
> When they woke him, he didn't shame them for being scared. He didn't ask them why they couldn't trust him while he slept. He just stood up and stilled the storm. The lesson the church usually pulls from this story is "Jesus stills storms." Tonight try a different lesson: the disciples were not shamed for being awake when they couldn't be calm. Neither are you.

**Day 7 (Numbers 6:24-26) — "The blessing"** is the closing benediction. The devotional must:

1. Be brief enough to read in the time it takes to put a phone down
2. Function as the plan's closing prayer, not a call to action
3. Speak the blessing OVER the user directly (tonight they are spoken over you)
4. NOT ask the user to do anything — not journal, not share, not recommit
5. End with permission: put the phone down; the plan will be here if needed again

**Reference tone:**

> Three verses. The oldest blessing in the Bible. Priests have been speaking these words over people for three thousand years.
>
> Tonight they are spoken over you.
>
> The Lord bless you and keep you. The Lord make his face shine on you and be gracious to you. The Lord lift up his face on you and give you peace.
>
> Now put the phone down. The plan will be here if you need it again.

**Day 7 reflection prompt: `"Goodnight."`** Single word, single sentence, closing line. Non-negotiable.

#### Devotional Voice (BB-25)

The voice is the most restrained of the four plans. It is:

- **Brief.** Nothing longer than it has to be. Short sentences. Short paragraphs.
- **Tender.** Sleeplessness is exhausting and lonely. The voice should never feel sharp.
- **Grounded in physical reality.** Acknowledges the user is reading on a phone in the dark. Doesn't pretend they're in a study with coffee.
- **Permission-giving about not sleeping.** Never says "and now you'll sleep." Bible characters who were awake stayed awake. The user might too. That's okay.
- **Closing-prayer-like at the end.** Day 7 is structured as a benediction the user reads and puts down.

The "you may not feel it" pattern from Day 1 is the plan's **signature move**: the verse is true even if the user's body doesn't agree yet. This pattern recurs across the plan and is the central pastoral claim — scripture can be true while the user feels nothing, and the plan respects that gap rather than pretending it doesn't exist.

**If a devotional in BB-25 sounds like it could be in BB-22 (contemplative), BB-23 (narrative), or BB-24 (direct emotional), it's wrong.** The voice is distinct — shorter, quieter, more restrained than all three.

#### Devotional Text Requirements

Each day has a devotional paragraph (**60-120 words hard limit** — lower floor than BB-24's 100-200 range because BB-25 is briefer on purpose) that:

1. Names what's happening in the passage concretely — one or two specific images
2. Stays close to the text — does not extract universal lessons
3. Does not promise the user will sleep
4. Does not ask the user to perform progress or do anything
5. Is readable in the cognitive state of a user at 3 AM who has been trying to sleep for hours

**Forbidden phrases (non-negotiable, enforced by the extended forbidden-phrase scan test):**

- Anything promising the user will sleep (see forbidden-phrase list above)
- `"insomnia"` — do not use the word in any devotional
- `"this too shall pass"` or any variant
- `"if you just"` / `"if you would only"` or any variant (inherited from BB-24)
- Clinical sleep language (`"sleep disorder"`, `"sleep hygiene"`, DSM categories)
- Medical advice (`"try chamomile"`, `"stop looking at your phone"`, etc.)
- Any forbidden phrase inherited from BB-24's scan (`"if you have enough faith"`, `"God will heal you"`, `"Jeremiah 29:11"`, `"you just need to trust"`, etc.)
- `"count your blessings instead of sheep"` / `"count sheep"`

**WEB translation verification**: All quoted phrases in devotionals must match the WEB text in the codebase (`frontend/src/data/bible/books/json/*.json`), not paraphrases from other translations.

#### Reflection Prompt Requirements

Each day has 1 reflection prompt (string array with 1 entry). Each prompt is **under 80 characters**. All 7 must be distinct. Each prompt is a closing line, not a question the user answers.

**Canonical reflection prompts (from spec input — plan phase may refine wording but must respect length and tone):**

- Day 1: `"Read the last verse one more time. Let it be true even if you don't feel it yet."`
- Day 2: `"The Lord is in this place. Even now. Even here."`
- Day 3: `"You are not too much for God. Not even tonight."`
- Day 4: `"You are not being shamed for being awake tonight."`
- Day 5: `"The watches of the night. You're not the first one to be up."`
- Day 6: `"Sunrise will come. That's all you need to believe right now."`
- Day 7: `"Goodnight."`

**Forbidden prompt patterns:**

- Prompts that ask the user to do anything (journal, pray aloud, share)
- Prompts that ask "did this help?" or "do you feel better?"
- Questions that require thought or answer
- Any prompt over 80 characters

### Non-Functional Requirements

- **Performance**: The plan JSON is lazy-loaded on demand (not bundled in main chunk), per BB-21's loader architecture
- **Accessibility**: Inherited from BB-21's plan infrastructure. The touch-target and readability requirements matter more here than usual — the user may be reading on a dimmed phone screen with tired eyes.

## Auth Gating

Inherited entirely from BB-21. No new interactive elements in BB-25.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View plan in browser grid | Can view card | Can view card | N/A |
| View plan detail page (description, day list) | Can view | Full access | N/A |
| Start the plan | Auth modal | Starts plan | "Sign in to start a reading plan" |
| Mark day complete | Auth modal | Marks complete | "Sign in to track your progress" |
| View plan day page (devotional, passage) | Can view | Full access | N/A |
| Read passage from plan | Navigates to Bible reader (public) | Same | N/A |
| Pause plan | Auth modal | Pauses | "Sign in to track your progress" |

**Pause explicitly supported.** BB-21's pause mechanism handles users who need to step away. The "behind" mechanic was removed from BB-21 precisely so users in difficult seasons don't feel additional pressure. BB-25 depends on this — a user who reads Day 1 tonight, skips a few nights, and comes back next week should find the plan exactly where they left it. No nagging.

## Responsive Behavior

Inherited entirely from BB-21's plan detail page and plan day page responsive behavior. No new responsive patterns introduced by BB-25.

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, collapsible day list, sticky mark-complete button. Devotional body text at `text-[17px] leading-[1.75-1.8]` for readability on small screens in the dark. |
| Tablet (640-1024px) | Single column, wider margins |
| Desktop (> 1024px) | Hero full-width, day list full-width, inline mark-complete |

**Additional responsive consideration:** This is the plan most likely to be read on mobile in a dark room on a dimmed screen. The existing BB-21 infrastructure already meets the 44px tap target minimum — re-verified here. No new responsive work in this spec.

## AI Safety Considerations

**This feature does not generate AI content and does not accept free-text user input.** No crisis detection required at the plan content level.

However, the plan is targeted at users in physical distress (sleeplessness is exhausting and can cascade into emotional distress). The spec enforces safety through content curation, not runtime checks:

- **No clinical language.** No `"insomnia disorder"`, no DSM categories, no `"sleep hygiene"`, no medication names. The plan speaks to the experience, not the diagnosis.
- **No medical advice.** The plan does NOT say `"try chamomile tea"`, `"stop looking at your phone"` (despite the irony), or suggest any sleep aid. It stays in scripture.
- **No in-devotional disclaimers.** The plan detail page may carry the same standing disclaimer (if any) that BB-24 introduced, if BB-21's detail page supports one. If it does not, BB-25 does NOT add one. Devotionals do not interrupt the reading experience with disclaimers — a user at 3 AM does not need a PSA about sleep hygiene.
- **No links to crisis hotlines from individual day pages.** Crisis resources already live elsewhere in the app (CrisisBanner on Pray/Journal flows, SiteFooter resources).
- **No recommendations of specific therapists, sleep apps, meditation services, or medications.**
- **No "take a break from your phone" advice beyond Day 7's closing line** ("Now put the phone down"). The user is aware of the irony of using a phone to read a plan about being awake; the plan does not lecture them about screen time.
- **No prayers the user is asked to say aloud.** Reading is enough.
- **No journal prompts.** The user is not in a state to journal at 3 AM. The plan does not ask.

## Auth & Persistence

- **Logged-out users:** Can browse the plan detail and day pages (read-only). Cannot start or track progress. No data persisted.
- **Logged-in users:** Full plan lifecycle via `bible:plans` localStorage key (BB-21's plansStore — `PlansStoreState` with `activePlanSlug` and per-plan `PlanProgress`)
- **Route type:** Public (viewing), Protected (starting/completing)
- **No new localStorage keys** — BB-25 uses BB-21's existing `bible:plans` key. No entry is added to `11-local-storage-keys.md`.
- **No sleep tracking.** The plan does NOT ask the user to log when they slept, how long, or how well. That would be the opposite of the plan's posture.
- **No analytics tracking on plan starts, day completions, or finishes.** Especially not this plan.

## Completion & Navigation

Inherited from BB-21:

- Completing all 7 days triggers `PlanCompletionCelebration.tsx`
- The celebration identifies the plan's `theme` and shows the **emotional-category completion text** already defined in BB-21: *"You showed up when it was hard. The scripture you just read is in you now — not as a list of verses, but as a shape that will show up in the weeks ahead without you noticing."* BB-25 must NOT override or customize this text. No new completion-celebration language.
- **No "you slept better" text on the celebration screen.** No "share your testimony" prompts. No "you conquered sleeplessness" language. The emotional-category text is load-bearing — do not add triumph.
- Reading a passage from within a plan day shows the reader banner (`ActivePlanReaderBanner.tsx`)
- Marking day complete from the reader banner advances the day pointer
- The plan detail page renders the full 7-day list with titles and reflection prompts visible
- Pause and resume behaviors inherited from BB-21

## Design Notes

- **Cover gradient:** Deep midnight blue — darker than BB-22's `from-indigo-500/30`. The plan is "the midnight one" of the four, reserved for this specific use case. Visually distinct from BB-22's indigo (lighter contemplative), BB-23's amber (warm daylight), and BB-24's emerald/sage (grounding, earthy). The plan phase picks exact Tailwind classes; candidates: `"from-blue-950/40 to-hero-dark"`, `"from-indigo-950/40 to-hero-dark"`, `"from-slate-900/40 to-hero-dark"`. Must read as "moonlit midnight" on the plan browser card. **Flag:** if none of the `blue-950` / `indigo-950` / `slate-900` Tailwind classes produce a result visually distinct from BB-22 at 30-40% opacity, the plan phase marks the chosen value as `[UNVERIFIED]` and verification is handled via `/verify-with-playwright` against the plan browser grid.
- All UI rendering uses BB-21's existing components — **no new components for BB-25**
- Devotional text renders as plain `<p>` elements split on double newlines — no HTML, no markdown
- After BB-25, the plan browser shows four cards in this order: "30 Days in the Psalms" (indigo), "The Story of Jesus" (amber), "When You're Anxious" (emerald/sage), "When You Can't Sleep" (midnight blue). Order in the manifest is the order in the grid.
- **No new design tokens, no new visual patterns.** This spec does not introduce new FrostedCard tiers, CTA styles, or glow treatments. It reuses BB-21's plan rendering entirely.

## Out of Scope

- **No new code beyond the JSON file, manifest update, and extending the existing validator test.** No new components, hooks, or utilities.
- **No schema changes to the `Plan` type.** Same constraint as BB-22, BB-23, BB-24.
- **No `coverEmoji`, `themeColor`, `category`, `tags`, or `subtitle` fields.** These don't exist on the Plan type. The spec input mentions them as descriptive intent only — carried by `theme`, `coverGradient`, and `title`/`shortTitle`.
- **No new design tokens.** Work within existing Tailwind classes.
- **No translation other than WEB.** All passage references are WEB.
- **No audio integration.** BB-26 handles audio Bible integration. A user might want rain sounds while reading this plan, but the plan does NOT suggest specific sounds, does NOT auto-start ambient audio, and does NOT cross-reference BB-20's ambient controls. The user can start audio themselves if they want — the plan stays silent on the topic.
- **No bedtime story format.** This is not Calm's Sleep Stories. The plan is scripture, not narration designed to put the user to sleep.
- **No dark mode toggle in the plan reader.** The whole wave is dark-themed already.
- **No "read this if it's 3 AM" branching.** The plan is the same whether the user opens it at 11 PM or 4 AM. No time-of-night detection.
- **No "share this with someone who needs it" prompt.** A user awake at 3 AM is not in the mood to recommend the app.
- **No commentary on biblical sleep customs or ancient Near Eastern night culture.** The devotionals stay simple.
- **No suggestion to put the phone down beyond Day 7's single closing line.** The plan does not lecture the user about screen time.
- **No prayers the user is asked to say aloud.** Reading is enough.
- **No cross-reference to BB-24's anxiety plan.** A user might be experiencing both, but BB-25 is its own plan. They're discoverable separately in the browser; the plans do not link to each other.
- **No sleep tracking.** No "did you sleep?" question. No "how long did you sleep?" logger. No sleep-quality rating. None of it.
- **No badges for completing a sleep plan.** A user who finishes 7 nights does not need a digital trophy.
- **No reflection prompts that ask "are you sleeping better?"** That question puts pressure on users who aren't.
- **No streak pressure.** BB-21's pause mechanism handles users who open the plan erratically.
- **No music or audio auto-pairing.** See above.
- **No analytics tracking on plan starts, day completions, or finishes.** Especially not this one.
- **No journal prompts.** The user is not in a state to journal.
- **No completion celebration customization.** BB-25 uses BB-21's existing emotional-category completion text verbatim.
- **No seasonal timing.** The plan is evergreen.
- **No "victory" language anywhere in the plan.** Not in the description, devotionals, prompts, or celebration.

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/data/bible/plans/when-you-cant-sleep.json` | Complete plan data conforming to `Plan` type |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/data/bible/plans/manifest.json` | Add `when-you-cant-sleep` entry as fourth item (after `psalms-30-days`, `john-story-of-jesus`, `when-youre-anxious`) |
| Plan validator test file (same location as BB-22, BB-23, BB-24 test cases) | Add test case that explicitly loads and validates `when-you-cant-sleep.json`; extend BB-24's forbidden-phrase scan to cover BB-25 with sleep-specific additions |

## Execution Notes

- **The brevity is the feature.** Do not let the plan phase write longer devotionals "to add value." 120 words is the ceiling, and most days should be under it. A user at 3 AM cannot absorb more.
- **Read every devotional out loud in your head, at 3 AM, in a dark room, with tired eyes.** That's the actual reading context. Does it land? Or does it require focus you don't have? Rewrite if it requires focus.
- **Day 4 (Mark 4) and Day 7 (Numbers 6) are the load-bearing days.** Both need to be written with the same care as BB-22's Psalm 88, BB-23's Lazarus, and BB-24's Gethsemane — but in a completely different way. If the plan phase produces five decent devotionals and two great ones, the great ones must be Day 4 and Day 7.
- **The "you may not feel it" pattern from Day 1 is the plan's signature move.** This pattern recurs across the plan — the verse can be true while the user feels nothing. Defend this pattern against any attempt to soften it into "and soon you'll feel it."
- **The forbidden-phrase scan test extends BB-24's existing test, not a new file.** Same file, additional phrases, scans all four plans.
- **The voice is more restrained than BB-22, BB-23, or BB-24.** Shorter sentences. Less metaphor. If a devotional in BB-25 could have fit in BB-24, it's too long or too emotionally active.
- **The `"Goodnight."` reflection prompt for Day 7 is non-negotiable.** Defend it against any attempt to expand it into a question.
- **No promise of sleep, anywhere.** If any draft contains language suggesting the user will sleep after reading, rewrite immediately.
- **Verify quoted text against WEB.** Cross-reference against the book JSONs in `frontend/src/data/bible/books/json/`.
- **Total devotional word count: 420-840 words** (60-120 words × 7 days). No day shorter than 60 or longer than 120 words.
- **After this spec ships, the Reading Plans section of the wave is complete.** Four plans with distinct lengths, voices, and emotional registers. A user browsing `/bible/plans` can find a contemplative Psalms walk (30d), a narrative John walk (21d), a topical anxiety plan (14d), and a topical sleeplessness plan (7d). Each one hand-curated, each one feels distinct. None feel like content marketing. That's the test.
- **BB-26 (FCBH audio Bible integration) is next** and begins the Audio Bible section — heavy technical integration with a third-party SDK, no curation work, real risk around how the audio system coexists with BB-20's ambient audio. Expect BB-26 to be one of the more technically complex specs in the wave.

## Acceptance Criteria

### Plan File Structure

- [ ] New file exists at `frontend/src/data/bible/plans/when-you-cant-sleep.json`
- [ ] File validates against BB-21's `Plan` TypeScript type (all required fields present)
- [ ] `slug` is `"when-you-cant-sleep"` (unique across all plans)
- [ ] `title` is `"When You Can't Sleep"`
- [ ] `theme` is `"emotional"` (triggers BB-21's existing emotional-category completion text)
- [ ] `duration` is exactly `7`
- [ ] `days` array contains exactly 7 entries
- [ ] Each day entry has a `day` field (1-indexed, continuous 1-7)
- [ ] Each day entry has a non-empty, concrete `title` field
- [ ] Each day has at least one passage with a valid `book` (lowercase WEB slug) and `chapter`
- [ ] `coverGradient` is a midnight/deep-blue-toned Tailwind gradient class string, darker than `from-indigo-500/30` (BB-22), visually distinct from `from-amber-500/30` (BB-23) and `from-emerald-600/30` (BB-24)

### Passage Canonical Assertions (hard-locked)

- [ ] Day 1's passage is Psalm 4:1-8 (explicit `startVerse: 1, endVerse: 8`)
- [ ] Day 2's passage is Genesis 28:10-17
- [ ] Day 3's passage is 1 Kings 19:4-8
- [ ] Day 4's passage is Mark 4:35-41
- [ ] Day 5's passage is Psalm 63:1-8
- [ ] Day 6's passage is Lamentations 3:21-26
- [ ] Day 7's passage is Numbers 6:24-26
- [ ] Every passage is no more than 12 verses long
- [ ] No passage is a full chapter

### Description Quality

- [ ] The description field is approximately 150 words (130-180 inclusive)
- [ ] The description acknowledges the user is reading at night on a phone (contains references to phone, scrolling, late-night reading, or equivalent language)
- [ ] The description sets honest expectations — contains language equivalent to "You shouldn't have to think hard" or "brief on purpose"
- [ ] The description names at least 2 biblical figures who were awake at night (from: David, Jacob, Elijah, the disciples)
- [ ] The description does NOT promise the user will sleep
- [ ] The description does NOT use the word `"insomnia"`
- [ ] The description ends with permission to read tonight and return another night — contains language equivalent to "The plan will wait"

### Content Quality — Devotionals

- [ ] Each day has a non-empty `devotional` field between 60 and 120 words (hard limits)
- [ ] Total devotional word count is between 420 and 840 words
- [ ] Day 1's devotional contains a version of the "you may not feel it" pattern — explicitly acknowledges the verse can be true even if the user doesn't feel it tonight
- [ ] Day 4's devotional explicitly states that the disciples were not shamed for being awake (contains a claim equivalent to "the disciples were not shamed for being awake; neither are you")
- [ ] Day 4's devotional preserves the central pastoral flip — the usual church reading is "Jesus stills storms," the plan's reading is "the disciples were not shamed for being unable to sleep through it"
- [ ] Day 7's devotional functions as a closing benediction, NOT a call to action
- [ ] Day 7's devotional does NOT ask the user to journal, share, recommit, or do anything other than put the phone down
- [ ] Day 7's devotional speaks the Aaronic blessing over the user directly
- [ ] All quoted WEB scripture in devotionals matches the actual WEB translation text in `frontend/src/data/bible/books/json/*.json`

### Content Quality — Forbidden Content (zero-tolerance, enforced by extended scan)

- [ ] No devotional or reflection prompt promises the user will sleep (any variant of "you'll sleep when," "just let go and you'll fall asleep," etc.)
- [ ] No devotional uses the word `"insomnia"`
- [ ] No devotional uses `"sleep disorder"`, `"sleep hygiene"`, `"insomnia disorder"`, or any clinical sleep term
- [ ] No devotional uses `"this too shall pass"` or any variant
- [ ] No devotional uses `"if you just"` or `"if you would only"` or any variant (inherited from BB-24)
- [ ] No devotional uses `"count your blessings instead of sheep"` or any variant of counting sheep
- [ ] No devotional gives medical or sleep advice (e.g., `"try chamomile"`, `"put your phone down"` outside Day 7's closing line, `"avoid caffeine"`, etc.)
- [ ] No devotional references medications, therapy, or specific sleep services
- [ ] No devotional frames sleeplessness as a faith failure, spiritual attack, moral failing, or sin
- [ ] No devotional contains the BB-24-inherited forbidden phrases (`"if you have enough faith"`, `"God will heal you"`, `"Jeremiah 29:11"`, `"you just need to trust"`, etc.)

### Content Quality — Reflection Prompts

- [ ] Each day has a non-empty `reflectionPrompts` array (exactly 1 prompt per day)
- [ ] Each reflection prompt is no more than 80 characters
- [ ] All 7 reflection prompts are distinct
- [ ] Day 4's reflection prompt explicitly references NOT being shamed for being awake (matches or equivalently expresses "You are not being shamed for being awake tonight.")
- [ ] Day 7's reflection prompt is `"Goodnight."` (exactly, as a single-word closing line — or an equivalent single-word closing if the plan phase determines a stronger variant, but NO question mark, NO sentence, NO longer than 15 characters)
- [ ] No reflection prompt asks a question requiring thought or answer
- [ ] No reflection prompt asks "did this help?" or "are you sleeping better?" or any variant that asks the user to perform progress

### Curation Integrity

- [ ] The 7 days mix "Bible characters who were awake" days with "passages about night" days
- [ ] At least 3 days are centered on specific people who were awake (Jacob in Gen 28, Elijah in 1 Kings 19, the disciples in Mark 4)
- [ ] At least 2 days are centered on passages explicitly about night, bed, or watches of the night (Psalm 4, Psalm 63)
- [ ] The plan, end-to-end, never tells the user that their sleeplessness is their fault, a faith failure, or something that scripture is supposed to cure
- [ ] The plan, end-to-end, never promises the user will sleep

### Manifest & Validation

- [ ] `manifest.json` contains entries for `psalms-30-days`, `john-story-of-jesus`, `when-youre-anxious`, AND `when-you-cant-sleep`
- [ ] Manifest now contains exactly four plans
- [ ] `when-you-cant-sleep` is the fourth entry in the manifest
- [ ] Manifest entry for `when-you-cant-sleep` matches the full plan's metadata (no drift on slug, title, shortTitle, description, theme, duration, estimatedMinutesPerDay, curator, coverGradient)
- [ ] BB-21's plan loader loads the plan without errors
- [ ] Build-time validator catches any malformed changes
- [ ] BB-24's build-time verse range validation passes for all BB-25 verse ranges
- [ ] A test case explicitly loads and validates `when-you-cant-sleep.json` in the same test file where BB-22, BB-23, BB-24 test cases live
- [ ] BB-24's forbidden-phrase scan test (Test #17) is **extended** (not duplicated) to cover BB-25 with the sleep-specific phrase additions
- [ ] The extended forbidden-phrase scan passes against all four plans

### Integration (verified via existing BB-21 / BB-21.5 infrastructure)

- [ ] Plan appears as the fourth card in BB-21.5's plan browser grid
- [ ] Plan detail page renders the full 7-day list with titles and reflection prompts
- [ ] Starting the plan creates a progress record in plansStore with `slug: "when-you-cant-sleep"`
- [ ] Reading a passage from within a plan day shows the reader banner
- [ ] Marking a day complete advances to the next day
- [ ] Pausing the plan works via BB-21's existing pause mechanism (no "behind" pressure)
- [ ] Completing all 7 days triggers the completion celebration
- [ ] The completion celebration shows the existing `emotional` category text verbatim — no new customization
- [ ] No "you slept better" or "you conquered sleeplessness" language appears anywhere in the completion flow

### Safety Integrity

- [ ] Logged-out users can view the plan detail page and read the description without encountering the auth modal
- [ ] The reading experience (description, day list, individual day devotionals) is not interrupted by disclaimers, crisis hotline cards, or sleep-health PSAs
- [ ] The plan does not introduce any new analytics events or tracking
- [ ] The plan does not suggest ambient audio, music, or any paired media
- [ ] The plan does not ask the user to log sleep data (time asleep, quality, wake count, etc.)
- [ ] The plan does not cross-reference BB-24's anxiety plan
