# BB-24: When You're Anxious — 14-Day Topical Plan

**Branch:** `bible-redesign` (no new branch — all work commits directly here)
**Depends on:** BB-21 (plans architecture — store, types, loader, manifest, detail page, day page, completion celebration, reader banner), BB-21.5 (plan browser — the manifest entry becomes visible automatically), BB-22 (Psalms plan — contemplative voice), BB-23 (John plan — narrative voice)
**Hands off to:** BB-25 (When You Can't Sleep — same topical pattern, different emotional state)

---

## Overview

Ship the third real reading plan: **When You're Anxious** — a 14-day topical plan for users in active anxiety. Unlike BB-22's contemplative arc through Psalms or BB-23's sequential walk through John, this plan is designed for a user opening the app in distress and needing scripture that meets them where they are.

This is a content spec. The architecture is fully proven by BB-21/BB-22/BB-23. The work is the writing. **BB-24 contains the most carefully written copy in the entire Bible wave.** Every word in the description, every devotional, and every reflection prompt must be considered against the question "would this hurt someone in active anxiety?" If the answer is yes, rewrite it.

**The test that defines success:** If a user opens this plan during a panic attack and finishes day 1 feeling like the app understood them, the spec worked. If they finish day 1 feeling preached at or platitudinously reassured, the spec failed and must be rewritten.

## Why this plan is harder than the first two

BB-22 succeeded because the Psalms do most of the work themselves. BB-23 succeeded because John is a narrative book, already in order. BB-24 is harder for three reasons:

**Anxiety is a state, not a topic.** A user reading BB-24 is, by self-selection, in distress right now. Every day has to land quickly because the user might bail at any moment.

**The most-quoted "anxiety verses" are also the most overused.** Philippians 4:6-7, 1 Peter 5:7, Matthew 6:34, Isaiah 41:10 — these have been weaponized against anxious people for decades. The plan must reclaim these texts for users who've been hurt by them.

**Anxiety lies, and so does most religious advice about anxiety.** The honest plan acknowledges that scripture doesn't cure anxiety the way medication does, but offers something different — a place to put attention, a community of other anxious people across history, and a God who never told anyone in the Bible to "just have more faith."

## User Story

As a **logged-in user** in an anxious season, I want to start a 14-day topical plan that meets me in my actual experience of anxiety (rather than lecturing me about it), so that I can put my attention somewhere when my attention won't stay still.

As a **logged-out visitor**, I want to browse the plan's detail page and read the description so that I can decide whether the voice of this plan is one I want to sit with, before creating an account.

## Requirements

### Functional Requirements

#### Plan Content File

1. A new JSON file at `frontend/src/data/bible/plans/when-youre-anxious.json` containing the complete plan data
2. The file must conform to the existing `Plan` type in `frontend/src/types/bible-plans.ts` — **no schema changes**

#### Type Reconciliation Note

The `Plan` type (BB-21) uses: `slug`, `title`, `shortTitle`, `description`, `theme` (union: `'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'`), `duration`, `estimatedMinutesPerDay`, `curator`, `coverGradient`, `days[]`. Each `PlanDay` has: `day`, `title`, `passages[]`, optional `devotional`, optional `reflectionPrompts` (string array).

The spec's curation intent maps to the actual fields:

| Spec Intent | Actual `Plan` Field | Value |
|-------------|-------------------|-------|
| ID: `when-youre-anxious` | `slug` | `"when-youre-anxious"` |
| Title: "When You're Anxious" | `title` | `"When You're Anxious"` |
| Short title for compact UI | `shortTitle` | `"Anxious"` |
| ~200 word description | `description` | See "Long-Form Description" below |
| Emotional topical plan | `theme` | `"emotional"` (direct match — this category exists in the union) |
| 14 days | `duration` | `14` |
| Minutes per day estimate | `estimatedMinutesPerDay` | `7` (passages are mixed length; honor the "user in distress has low bandwidth" principle by not overpromising) |
| Author: Worship Room | `curator` | `"Worship Room"` |
| Visual gradient (sage/earthy) | `coverGradient` | Sage/emerald-toned gradient (plan phase picks the exact Tailwind classes — e.g. `"from-emerald-600/30 to-hero-dark"` or `"from-teal-600/30 to-hero-dark"`). Must be visually distinct from BB-22 indigo and BB-23 amber. |
| Day numbers 1-14 | `days[].day` | 1-indexed |
| Day titles | `days[].title` | See curation below |
| Passages (mixed chapters + verse ranges) | `days[].passages` | One passage per day, using book/chapter plus `startVerse`/`endVerse` where the day is a verse range |
| Devotional paragraphs | `days[].devotional` | See curation below |
| Reflection prompts | `days[].reflectionPrompts` | String array (1 prompt per day) |

**Fields the spec's original outline mentions that do NOT exist on `Plan`**: `id` (use `slug`), `coverEmoji`, `themeColor`, `category`, `tags`, `subtitle`, `author` (use `curator`), `durationDays` (use `duration`). The plan phase must work within the existing type. Same constraint BB-22 and BB-23 operated under. **The `coverEmoji: 🌿` and `themeColor: accent-sage` from the spec input are descriptive intent only** — BB-21's Plan type does not carry emoji or named theme color fields. The visual identity is carried by `coverGradient` alone.

#### The Long-Form Description (~200 words)

The description is load-bearing. It must acknowledge the user's likely history with religious advice about anxiety, set honest expectations, list Bible characters who were anxious and weren't lectured for it, and contain the phrase **"scripture used as a club against it"** or equivalent acknowledgment of harmful religious advice. This phrase is non-negotiable — it is the line that tells anxious Christians with religious trauma that this plan is different.

> If you're reading this, you might already know the verses. "Be anxious for nothing." "Do not fear." "Cast your cares on him." Maybe people have quoted them at you. Maybe they've helped, and maybe they've hurt — sometimes both. This plan exists for the people who need scripture that meets them in the actual feeling of anxiety, not scripture used as a club against it.
>
> Fourteen days. Some of the readings are familiar. Some aren't. They're not arranged to talk you out of how you feel. They're arranged to give you somewhere to put your attention when your attention won't stay still.
>
> The Bible has a lot of anxious people in it. Hannah, who couldn't stop crying. Elijah, who hid in a cave. The disciples in the boat in the storm, and the disciples in the upper room after the crucifixion. David, all the time. Jesus himself in Gethsemane. None of them were told to calm down. Most of them were just... met.
>
> This plan won't fix your anxiety. Nothing in fourteen days will. But you can read it on a hard day and not feel worse, and on a good day you might feel a little less alone. That's what scripture does at its best. That's what we're trying to do here.

This description does four things the plan phase must not soften:
- **Names the user's likely history with religious advice about anxiety.** A user who has been hurt by Christians wielding verses at them needs to know the app sees that.
- **Sets honest expectations.** "This plan won't fix your anxiety." A user in distress needs a promise that's true, not a promise that sets them up to feel like a failure.
- **Lists Bible characters who were anxious and weren't lectured for it.** The central pastoral move — anxiety is in the Bible, the Bible doesn't shame it, neither will we.
- **Uses the phrase "scripture used as a club against it."** The spec's most important phrase.

#### Manifest Update

3. `manifest.json` must contain an entry for `when-youre-anxious` as the third item (after `psalms-30-days` and `john-story-of-jesus`)
4. The manifest entry must exactly match the full plan's metadata fields — no drift
5. The manifest now contains exactly three plans

#### Build-Time Validation

6. Every passage has a valid WEB book slug (lowercase)
7. Every passage with `startVerse`/`endVerse` has `endVerse >= startVerse` and both within the chapter's actual verse count
8. The `duration` field matches the length of the `days` array (14)
9. BB-21's plan loader loads the plan file without errors

#### Test Coverage

10. A test case in BB-21's plan validator test file (`frontend/src/data/bible/plans/__tests__/validator.test.ts` or the equivalent location where BB-22 and BB-23 added theirs, e.g. `frontend/src/lib/bible/__tests__/planLoader.test.ts`) explicitly loads and validates `when-youre-anxious.json`. The plan phase picks the correct file based on where BB-22/BB-23's existing test cases live.

### The 14-Day Curation

#### Curation Principles

- **Mix anxious-Bible-people days with comfort-of-God days.** Don't make every day "here's a comforting verse." Half the days are about people in scripture who were anxious — Hannah, Elijah, David, the disciples — so the user feels recognized as part of a long line.
- **Reclaim the famous verses by giving them context.** Philippians 4, Matthew 6, and the other weaponized verses are included, but each one gets a devotional that addresses how the verse has been misused and what it actually says when read slowly.
- **Include at least one day about Gethsemane.** Jesus himself was in distress. Any plan about anxiety that doesn't include Gethsemane is missing the most important data point in the New Testament about how God treats people in anguish. (Day 9.)
- **Avoid prosperity-anxiety verses entirely.** Jeremiah 29:11 ("plans to prosper you, not to harm you") is misused as an anti-anxiety verse and is **absolutely forbidden** in this plan. Using it on anxious people is malpractice.
- **Avoid command verses without context.** Each "fear not" verse must be in context — who said it, who they said it to, what was happening.
- **Mix length.** Some days are short passages (5-8 verses). Some are full chapters. The user in distress can't always handle a long read.
- **End with a quiet day, not a triumphant one.** Day 14 is "you made it through 14 days, and tomorrow you'll wake up still anxious sometimes, and that's okay" — not "you conquered anxiety."

#### The 14 Days (canonical — passages are locked)

| Day | Passage | Title | Center |
|-----|---------|-------|--------|
| 1 | Psalm 139:1-12 | You are seen | David describing being fully known; reader chooses to feel that as grace or exposure |
| 2 | 1 Kings 19:1-13 | Elijah in the cave | Post-Carmel collapse; God's first response is food and sleep, not theology |
| 3 | Matthew 6:25-34 | Look at the birds | Jesus points the anxious mind at something specific — not "stop worrying" |
| 4 | 1 Samuel 1:1-20 | Hannah's prayer | Prayer that doesn't look like prayer; wordless, broken, heard anyway |
| 5 | Psalm 13 | How long, O Lord? | David asks how long it will go on; chooses to trust without claiming the trust fixed the feeling |
| 6 | Mark 4:35-41 | The disciples in the storm | Jesus stills the storm first, asks "why were you afraid?" after the rescue |
| 7 | Philippians 4:4-9 | Be anxious for nothing | **Load-bearing day.** Reclaims the most-weaponized anti-anxiety verse in the Bible |
| 8 | Psalm 46 | Be still, and know | "Be still" in Hebrew is closer to "let your hands fall" — posture, not meditation technique |
| 9 | Matthew 26:36-46 | Gethsemane | **Second load-bearing day.** Jesus in distress; the angel came to strengthen, not remove |
| 10 | Isaiah 43:1-5 | I have called you by name | "Through" is the word that matters — not around, not instead of. Through. |
| 11 | Luke 8:40-48 | The woman who touched the hem | Twelve years of shame; Jesus stops the crowd to meet the small gesture she could make |
| 12 | Psalm 131 | A weaned child | Three verses. Not nursing, not crying — just present. Spiritual maturity as rest without needing. |
| 13 | 2 Corinthians 12:7-10 | My grace is sufficient | Paul's thorn; the New Testament's most honest treatment of unanswered prayer |
| 14 | Lamentations 3:19-26 | Mercies new every morning | The famous passage read in its actual context — written after Jerusalem was destroyed |

**The day 7 passage includes the weaponized verses explicitly (Philippians 4:4-9 covers verses 6-7 directly).** The day 9 passage explicitly includes the sweating-blood moment. The day 14 passage is read in the context of Lamentations (a book of grief), not lifted from context.

#### Load-Bearing Devotionals

**Day 7 (Philippians 4:4-9) is the most important devotional in the plan.** The devotional must:

1. Explicitly acknowledge that this verse has been used to make anxious people feel guilty for being anxious
2. Note that Paul is writing from prison — he is not issuing a command from a calm life
3. Reframe "be anxious for nothing" as an invitation from someone who learned, slowly and painfully, what it looks like on the other side
4. Clarify that the "peace of God which surpasses all understanding" is NOT a promise that anxiety goes away — it's a promise that something else is also there even when anxiety doesn't go away

**Reference tone** (the spec input provides this text as the target; the plan phase may refine but must not soften):

> "You may have heard this verse used to make you feel guilty for being anxious. That's not what Paul is doing here. Paul is writing from prison. He's not anxious because he's already been through the worst of what people can do to him. The 'be anxious for nothing' isn't a command issued from a calm life — it's an invitation issued from someone who learned, slowly and painfully, what it looks like on the other side. Paul isn't telling you to flip a switch. He's describing what he found and pointing at it. The next verse — 'and the peace of God which surpasses all understanding will guard your hearts' — is not a promise that anxiety goes away. It's a promise that something else is also there, even when anxiety doesn't go away."

Get Day 7 right and a user who has been hurt by this verse for years can read it again as if for the first time. Get it wrong and the whole plan is undermined.

**Day 9 (Matthew 26:36-46 — Gethsemane) is the second most important devotional.** It contains the central theological claim of the plan: anxiety is not a faith failure, because Jesus had it.

**Reference tone:**

> "Jesus himself was in this much distress. Jesus himself asked to be delivered. Jesus himself was not given the deliverance he asked for. The angel came not to take the cup away but to strengthen him to drink it. If you have ever been told that anxiety means you don't trust God enough, read this passage. The most trusting person in human history was in agony and was not removed from it."

**Day 14 (Lamentations 3:19-26) is the closing devotional.** It must be quiet, not triumphant. It must not promise that the user is "done" with anxiety.

**Reference tone:**

> "You made it through 14 days. Tomorrow you'll probably still be anxious sometimes. The plan didn't fix that. It wasn't going to. What it did, hopefully, is give you fourteen places to put your attention when your attention wouldn't stay still. Fourteen reminders that the Bible has room for anxious people, and that the people in it weren't lectured for being anxious. Tomorrow is a new day. That's not triumphant. It's just true. And that's enough for today."

Day 14 reflection prompt: **"What's one verse from these 14 days you want to remember on a hard day?"**

Day 5 reflection prompt (canonical): **"What would it look like to be that honest with God about what you're feeling?"**

#### Devotional Voice (BB-24)

The voice is different from both BB-22 and BB-23:

- **Direct.** No flowery prose. Short sentences. The user might be reading on a phone screen with shaky hands and tear-blurred vision. Every line counts.
- **Acknowledging.** Every devotional acknowledges what the user might already feel about the verse, especially if the verse has been misused.
- **Honest about scripture's limits.** Scripture doesn't cure anxiety. The plan says so.
- **Permission-giving.** The plan repeatedly tells the user it's okay to feel what they're feeling, and that the Bible characters felt it too.
- **Restrained at the right moments.** When the text is heavy (Gethsemane, Hannah, Lamentations), the devotional gets out of the way.

**If a devotional in BB-24 sounds like it could be in BB-22 or BB-23, it's wrong. The voice is distinct.**

#### Devotional Text Requirements

Each day has a devotional paragraph (**100-200 words hard limit**) that:

1. Names what's happening in the passage — concrete images, specific moments
2. Acknowledges any history the user may have with the verse (especially on days 3, 7, 8, 14)
3. Stays close to the text — does not extract universal lessons or prescribe application
4. Does not promise healing
5. Does not ask the user to perform progress

**Forbidden phrases (non-negotiable):**
- "If you have enough faith" (or any variant: "if you trusted enough", "if your faith were stronger", etc.)
- "God will heal you" (or any variant promising healing)
- "Jeremiah 29:11" — do not reference, do not quote, do not include in any passage or devotional
- "God wants to speak to you," "open your heart," "let God in" — saccharine phrases that would not survive being read aloud to someone in active distress
- "You just need to trust", "you just need to pray more", "the devil is attacking you"
- Any phrase framing anxiety as a faith failure, spiritual attack, or sin

**WEB translation verification**: All quoted phrases in devotionals must match the WEB text in the codebase (`frontend/src/data/bible/books/json/*.json`), not paraphrases from other translations.

#### Reflection Prompt Requirements

Each day has 1 reflection prompt (string array with 1 entry). Each prompt is 30-140 characters. All 14 days must have distinct prompts. Each prompt must reference something specific from its passage.

**Forbidden prompt patterns:**
- "Are you feeling better?" (or any variant that asks the user to perform progress)
- "What is God trying to teach you through your anxiety?" (frames anxiety as a lesson the user must extract)
- Generic "what stood out to you?" prompts — each prompt must be specific to its passage

### Non-Functional Requirements

- **Performance**: The plan JSON is lazy-loaded on demand (not bundled in main chunk), per BB-21's loader architecture
- **Accessibility**: Inherited from BB-21's plan infrastructure

## Auth Gating

Inherited entirely from BB-21. No new interactive elements in BB-24.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View plan in browser grid | Can view card | Can view card | N/A |
| View plan detail page (description, day list) | Can view | Full access | N/A |
| Start the plan | Auth modal | Starts plan | "Sign in to start a reading plan" |
| Mark day complete | Auth modal | Marks complete | "Sign in to track your progress" |
| View plan day page (devotional, passage) | Can view | Full access | N/A |
| Read passage from plan | Navigates to Bible reader (public) | Same | N/A |
| Pause plan | Auth modal | Pauses | "Sign in to track your progress" |

**Pause explicitly supported:** BB-21's pause mechanism handles users who need to step away. The "behind" mechanic was removed from BB-21 precisely so users in anxious seasons don't feel additional pressure. BB-24 depends on this — it is the plan most likely to be paused mid-stream.

## Responsive Behavior

Inherited entirely from BB-21's plan detail page and plan day page responsive behavior. No new responsive patterns introduced by BB-24.

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, collapsible day list, sticky mark-complete button. Devotional body text at `text-[17px] leading-[1.75-1.8]` for readability on small screens under stress. |
| Tablet (640-1024px) | Single column, wider margins |
| Desktop (> 1024px) | Hero full-width, day list full-width, inline mark-complete |

**Additional responsive consideration:** The user reading this plan on mobile may have shaky hands and tear-blurred vision. Tap targets must meet the 44px minimum (inherited from BB-21's infrastructure, but re-verified here).

## AI Safety Considerations

**This feature does not generate AI content and does not accept free-text user input.** No crisis detection required at the plan content level.

**However, the plan is explicitly targeted at users in emotional distress.** The spec enforces safety through content curation, not through runtime checks:

- **No devotional uses the word "disorder,"** references DSM categories, or names specific anxiety conditions. The plan speaks to the experience, not the diagnosis. No clinical language.
- **No in-devotional mental health professional disclaimers.** The plan detail page may carry a small standing disclaimer (e.g., "Not a substitute for professional mental health care") if BB-21's detail page supports a footer slot — if it does not, this spec does **not** add one. The devotional text itself does not interrupt the reading experience with disclaimers.
- **No links to crisis hotlines from individual day pages.** The plan is for users in distress, not in crisis. Crisis resources already live elsewhere in the app (CrisisBanner pattern from the Pray/Journal flows, SiteFooter resources, and the planned BB-34 first-run and BB-41 push notifications).
- **No recommendation of specific therapists, medications, or services.** The plan stays within scripture.
- **No comparison to other anxiety treatments.** The plan does not say "the Bible works better than therapy" or "use this alongside therapy." It just is what it is.

## Auth & Persistence

- **Logged-out users:** Can browse the plan detail and day pages (read-only). Cannot start or track progress. No data persisted.
- **Logged-in users:** Full plan lifecycle via `bible:plans` localStorage key (BB-21's plansStore — `PlansStoreState` with `activePlanSlug` and per-plan `PlanProgress`)
- **Route type:** Public (viewing), Protected (starting/completing)
- **No new localStorage keys** — BB-24 uses BB-21's existing `bible:plans` key. No entry is added to `11-local-storage-keys.md`.
- **No analytics tracking on anxiety plan starts or completions.** Especially not this plan.

## Completion & Navigation

Inherited from BB-21:
- Completing all 14 days triggers `PlanCompletionCelebration.tsx`
- The celebration identifies the plan's theme and shows the **`emotional` category completion text**: "You showed up when it was hard. The scripture you just read is in you now — not as a list of verses, but as a shape that will show up in the weeks ahead without you noticing." This text already exists in BB-21's spec/implementation for the emotional category. BB-24 must not override or customize it further.
- **No "victory testimony" language** on the celebration screen. No "share your testimony" prompts. No "you've conquered anxiety" language. The emotional-category text is load-bearing — do not add triumph.
- Reading a passage from within a plan day shows the reader banner (`ActivePlanReaderBanner.tsx`)
- Marking day complete from the reader banner advances the day pointer
- The plan detail page renders the full 14-day list with titles and reflection prompts visible
- Pause and resume behaviors inherited from BB-21

## Design Notes

- **Cover gradient:** Sage/emerald-toned, visually distinct from BB-22's indigo and BB-23's amber. Earthy, calming, grounding. The plan phase picks exact Tailwind classes; candidates include `"from-emerald-600/30 to-hero-dark"`, `"from-teal-600/30 to-hero-dark"`, or `"from-green-700/30 to-hero-dark"`. Must match the "earthy, alive but not loud" intent (the spec input's 🌿 emoji rationale).
- All UI rendering uses BB-21's existing components — **no new components for BB-24**
- Devotional text renders as plain `<p>` elements split on double newlines — no HTML, no markdown
- After BB-24, the plan browser shows three cards: "30 Days in the Psalms" (indigo), "The Story of Jesus" (amber), and "When You're Anxious" (sage/emerald). Order in the manifest is the order in the grid.
- **No new design tokens, no new visual patterns.** This spec does not introduce new FrostedCard tiers, new CTA styles, or new glow treatments. It reuses BB-21's plan rendering entirely.

## Out of Scope

- **No new code beyond the JSON file, manifest update, and test case.** No new components, hooks, or utilities.
- **No schema changes to the `Plan` type.** Same constraint as BB-22 and BB-23.
- **No `coverEmoji`, `themeColor`, `category`, `tags`, or `subtitle` fields.** These don't exist on the Plan type. The spec input mentions them as descriptive intent only — they are carried by `theme`, `coverGradient`, and `title`/`shortTitle`.
- **No new design tokens.** Work within existing Tailwind classes.
- **No translation other than WEB.** All passage references are WEB.
- **No audio.** BB-26 handles audio Bible integration.
- **No images.** Cover gradient only.
- **No clinical language.** No "anxiety disorder," no DSM references, no specific condition names.
- **No in-devotional disclaimers** ("consult a doctor", "this is not professional help", etc.) that interrupt the reading experience. A standing footer disclaimer on the plan detail page is allowed IF BB-21's detail page already supports one; otherwise not added.
- **No links to crisis hotlines from individual day pages.** Crisis resources live in existing app surfaces.
- **No recommendations of specific therapists, medications, or apps.**
- **No daily breathing exercises or meditation techniques.** Meditation is BB-12 territory. The plan is text-focused, not technique-focused.
- **No "share your testimony" prompts.** The plan does not ask users to publicly share that they completed an anxiety plan.
- **No badges for completing an anxiety plan.** A user who finishes 14 days does not need a digital trophy.
- **No reflection prompts that ask "are you feeling better?"** That question puts pressure on users who aren't feeling better.
- **No streak pressure.** BB-21's pause mechanism handles users who need to step away.
- **No music or audio auto-pairing.** BB-20 ambient audio is optional; the plan does not suggest specific sounds.
- **No analytics tracking on anxiety plan starts, day completions, or finishes.** Especially not this one.
- **No targeted advertising of mental health apps or services.** (Worship Room doesn't advertise anything anyway — reinforced here.)
- **No comparison to other anxiety treatments.** The plan does not say "the Bible works better than therapy" or "use alongside therapy."
- **No "victory testimony" language.** Anxiety is recurrent. The plan is honest about that.
- **No Jeremiah 29:11.** Forbidden. It does not belong in an anxiety plan.
- **No completion celebration customization.** BB-24 uses BB-21's existing emotional-category completion text verbatim.
- **No seasonal timing.** The plan is evergreen.

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/data/bible/plans/when-youre-anxious.json` | Complete plan data conforming to `Plan` type |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/data/bible/plans/manifest.json` | Add `when-youre-anxious` entry as third item (after `psalms-30-days` and `john-story-of-jesus`) |
| Plan validator test file (`frontend/src/data/bible/plans/__tests__/validator.test.ts` OR `frontend/src/lib/bible/__tests__/planLoader.test.ts` — whichever file BB-22 and BB-23's test cases currently live in) | Add test case that explicitly loads and validates `when-youre-anxious.json` |

## Execution Notes

- **The work is the writing.** Do not generate 14 formulaic devotionals. Each one needs real care. The stakes are higher here than in any other plan in the wave.
- **Day 7 (Philippians) and Day 9 (Gethsemane) are the load-bearing devotionals.** Both need to be written with the same care as BB-22's Day 8 (Psalm 88) and BB-23's Day 11 (Lazarus). If the plan phase produces 14 decent devotionals and two great ones, the great ones must be days 7 and 9.
- **Read every devotional out loud, then read it again imagining you have a panic attack and you just opened the app.** Does it land? Does it make you feel worse? If yes, rewrite. The test is whether the prose serves a user in active distress, not whether it's literarily impressive.
- **The voice is more direct than BB-22 or BB-23.** Shorter sentences. Less metaphor.
- **The "scripture used as a club" line in the description is non-negotiable.** Defend it against any attempt to soften.
- **The forbidden phrases ("if you have enough faith," "God will heal you," "Jeremiah 29:11") are non-negotiable.** If any draft contains them, rewrite immediately.
- **Verify quoted text against WEB.** Cross-reference against the book JSONs in `frontend/src/data/bible/books/json/`.
- **Total devotional word count: 1400-2800 words** (100-200 words × 14 days). No day shorter than 100 or longer than 200 words.
- **After this spec ships, a user opens `/bible/plans`, sees three plans, taps "When You're Anxious," reads the description, and either decides to start the plan or doesn't. If they start it, they read 14 days that meet them in their actual experience of anxiety, never lecture them, never weaponize scripture against them, and end with a quiet acknowledgment that tomorrow they'll probably still be anxious sometimes and that's okay. If they finish day 1 and feel less alone, the spec worked. That's the test.**
- **BB-25 (When You Can't Sleep) is next** and is structurally similar — a short topical plan for a specific emotional state — but the curation is meaningfully different. The plan should be its own thing, not a recolored version of BB-24.

## Acceptance Criteria

### Plan File Structure
- [ ] New file exists at `frontend/src/data/bible/plans/when-youre-anxious.json`
- [ ] File validates against BB-21's `Plan` TypeScript type (all required fields present)
- [ ] `slug` is `"when-youre-anxious"` (unique across all plans)
- [ ] `title` is `"When You're Anxious"`
- [ ] `theme` is `"emotional"`
- [ ] `duration` is exactly `14`
- [ ] `days` array contains exactly 14 entries
- [ ] Each day entry has a `day` field (1-indexed, continuous 1-14)
- [ ] Each day entry has a non-empty, concrete `title` field
- [ ] Each day has at least one passage with a valid `book` (lowercase WEB slug) and `chapter`
- [ ] `coverGradient` is a sage/emerald/teal-toned Tailwind gradient class string visually distinct from `from-indigo-500/30 to-hero-dark` (BB-22) and `from-amber-500/30 to-hero-dark` (BB-23)

### Passage Canonical Assertions (hard-locked)
- [ ] Day 1's passage is Psalm 139:1-12 (uses `startVerse: 1, endVerse: 12`, NOT the full Psalm)
- [ ] Day 2's passage is 1 Kings 19:1-13
- [ ] Day 3's passage is Matthew 6:25-34
- [ ] Day 4's passage is 1 Samuel 1:1-20
- [ ] Day 5's passage is Psalm 13 (full chapter)
- [ ] Day 6's passage is Mark 4:35-41
- [ ] Day 7's passage is Philippians 4:4-9
- [ ] Day 8's passage is Psalm 46 (full chapter)
- [ ] Day 9's passage is Matthew 26:36-46
- [ ] Day 10's passage is Isaiah 43:1-5
- [ ] Day 11's passage is Luke 8:40-48
- [ ] Day 12's passage is Psalm 131 (full chapter)
- [ ] Day 13's passage is 2 Corinthians 12:7-10
- [ ] Day 14's passage is Lamentations 3:19-26

### Description Quality
- [ ] The description field is approximately 200 words (180-240 inclusive)
- [ ] The description includes the phrase `"scripture used as a club against it"` or an exact equivalent that acknowledges harmful religious advice about anxiety
- [ ] The description names at least 4 biblical figures who were anxious (from the set: Hannah, Elijah, the disciples, David, Jesus in Gethsemane)
- [ ] The description explicitly sets honest expectations — contains language equivalent to "This plan won't fix your anxiety"
- [ ] The description acknowledges that anti-anxiety verses have been quoted at the reader, helpfully and hurtfully

### Content Quality — Devotionals
- [ ] Each day has a non-empty `devotional` field between 100 and 200 words (hard limits)
- [ ] Total devotional word count is between 1400 and 2800 words
- [ ] Day 7's devotional explicitly acknowledges that Philippians 4:6-7 has been weaponized against anxious people AND re-frames Paul writing from prison
- [ ] Day 7's devotional clarifies that "the peace of God which surpasses all understanding" is not a promise that anxiety goes away
- [ ] Day 9's devotional explicitly states that Jesus himself was in distress and was not delivered from it (contains a claim equivalent to "the most trusting person in human history was in agony and was not removed from it")
- [ ] Day 14's devotional does NOT promise that the user is "done" with anxiety
- [ ] Day 14's devotional contains language acknowledging that the user will still be anxious sometimes tomorrow
- [ ] All quoted WEB scripture in devotionals matches the actual WEB translation text in `frontend/src/data/bible/books/json/*.json`

### Content Quality — Forbidden Content (zero-tolerance)
- [ ] No devotional contains the phrase "if you have enough faith" or any variant ("if you trusted enough", "if your faith were stronger", "if you had more faith")
- [ ] No devotional contains the phrase "God will heal you" or any variant promising that the user's anxiety will be cured
- [ ] No devotional quotes, references, or links to Jeremiah 29:11
- [ ] No passage in any day references Jeremiah 29:11
- [ ] No devotional uses the phrases: "God wants to speak to you", "open your heart", "let God in", "just trust", "just pray more", "the devil is attacking you"
- [ ] No devotional uses clinical language ("anxiety disorder", "generalized anxiety", DSM category names, medication names)
- [ ] No devotional frames anxiety as a faith failure, spiritual attack, moral failing, or sin
- [ ] No devotional recommends specific therapists, services, apps, or treatments

### Content Quality — Reflection Prompts
- [ ] Each day has a non-empty `reflectionPrompts` array (exactly 1 prompt per day)
- [ ] Each reflection prompt is 30-140 characters
- [ ] All 14 reflection prompts are distinct
- [ ] Each day's reflection prompt is specific to its passage — would not work for a different day
- [ ] Day 5's reflection prompt matches or equivalently expresses "What would it look like to be that honest with God about what you're feeling?"
- [ ] Day 14's reflection prompt matches or equivalently expresses "What's one verse from these 14 days you want to remember on a hard day?"
- [ ] No reflection prompt asks "are you feeling better?" or any variant that asks the user to perform progress
- [ ] No reflection prompt frames anxiety as a lesson the user must extract

### Curation Integrity
- [ ] The 14 days include at least 6 days centered on Bible characters who were anxious (Hannah, Elijah, David in Psalm 13, the disciples in the storm, Jesus in Gethsemane, the woman who touched the hem)
- [ ] The 14 days include the three most-weaponized "anxiety verses" — Philippians 4 (day 7), Matthew 6 (day 3), and Psalm 46 (day 8) — with devotionals that reclaim them
- [ ] Day 7 and Day 9 are demonstrably the most carefully written devotionals (prose quality, care with framing, tonal restraint — evaluated during code review)
- [ ] The plan, end-to-end, never tells the user that their anxiety is their fault, a faith failure, or something that scripture is supposed to cure

### Manifest & Validation
- [ ] `manifest.json` contains entries for `psalms-30-days`, `john-story-of-jesus`, AND `when-youre-anxious`
- [ ] Manifest now contains exactly three plans
- [ ] Manifest entry for `when-youre-anxious` matches the full plan's metadata (no drift on slug, title, shortTitle, description, theme, duration, estimatedMinutesPerDay, curator, coverGradient)
- [ ] BB-21's plan loader loads the plan without errors
- [ ] Build-time validator catches any malformed changes
- [ ] A test case explicitly loads and validates `when-youre-anxious.json` in the same test file where BB-22 and BB-23's test cases live

### Integration (verified via existing BB-21 / BB-21.5 infrastructure)
- [ ] Plan appears as the third card in BB-21.5's plan browser grid
- [ ] Plan detail page renders the full 14-day list with titles and reflection prompts
- [ ] Starting the plan creates a progress record in plansStore with `slug: "when-youre-anxious"`
- [ ] Reading a passage from within a plan day shows the reader banner
- [ ] Marking a day complete advances to the next day
- [ ] Pausing the plan works via BB-21's existing pause mechanism (no "behind" pressure)
- [ ] Completing all 14 days triggers the completion celebration
- [ ] The completion celebration shows the existing `emotional` category text verbatim ("You showed up when it was hard...") — no new customization

### Safety Integrity
- [ ] Logged-out users can view the plan detail page and read the description without encountering the auth modal
- [ ] The reading experience (description, day list, individual day devotionals) is not interrupted by disclaimers, crisis hotline cards, or mental health PSAs
- [ ] The plan does not introduce any new analytics events or tracking
- [ ] The plan does not suggest ambient audio, music, or any paired media
