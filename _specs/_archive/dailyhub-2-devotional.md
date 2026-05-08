# DailyHub Holistic Redesign 2 — Devotional

**Master Plan Reference:** Recon at `_plans/forums/dailyhub-redesign-recon.md`. Builds directly on `_specs/dailyhub-1a-foundation-and-meditate.md` (multi-bloom BackgroundCanvas, `<Button variant="subtle">`, tab-bar visual treatment, Meditate tab) and `_specs/dailyhub-1b-pray-and-journal.md` (Pray tab, Journal tab, violet-glow textarea pattern). This is the **third and final** spec migrating DailyHub. After Spec 2 ships, all four tabs (Devotional, Pray, Journal, Meditate) and the page shell are migrated; the next phase is rolling the established visual language out across the rest of the app.

**Branch discipline:** Stay on `forums-wave-continued`. Do not create new branches, commit, push, stash, or reset. The user manages all git operations manually. If you find yourself on a different branch than expected, STOP and ask.

---

## Affected Frontend Routes

- `/daily?tab=devotional` (primary visual target)
- `/daily?tab=pray` (regression — 1B surface; tab content + canvas + tab bar render unchanged)
- `/daily?tab=journal` (regression — 1B surface; tab content + canvas + tab bar render unchanged)
- `/daily?tab=meditate` (regression — 1A surface; tab content + canvas + tab bar render unchanged)
- `/bible` (regression — multi-bloom BackgroundCanvas continues rendering correctly; pilot card variants unchanged)

---

## Overview

This spec finishes the DailyHub migration shipped in 1A + 1B by applying the established visual language to the **last remaining tab — Devotional**. The patterns themselves are locked: FrostedCard tiers (`accent` / `default` / `subdued`) from the BibleLanding pilot, `<Button variant="subtle">` and `<Button variant="gradient">` from 1A + 1B, the rolls-own Tier 2 scripture-callout idiom (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`) already used by the devotional passage today and the Bible reader's verse callouts. Spec 2 is **migration + careful test surgery**, not new design.

The Devotional tab today renders six visual surfaces in vertical order: a passage scripture callout (already Tier 2 — stays unchanged), a reflection body card (currently default FrostedCard — promotes to accent), a saint/author quote card (currently default FrostedCard — stays default, made explicit), a reflection question card (currently default FrostedCard with a left-stripe override — migrates to rolls-own Tier 2 to match the passage callout above), an authentic Pray flow CTA section (rolls-own white pill — promotes to gradient showstopper, the page's emotional peak), and a Share + Read Aloud action row at the bottom (rolls-own frosted pills — refresh to subtle).

The directional rationale: the Devotional tab is the page's primary reading surface. The reflection body is the longest piece of writing on the page, so it earns the accent tier with an eyebrow ("Today's reflection") that gives it presence as the page's centerpiece. The quote is supporting commentary, so it stays at default tier — quieter, but still lifted off the canvas. The reflection question and the passage become visually unified callouts (same Tier 2 idiom) — both are "scripture/prompt" content, distinct from FrostedCard prose. The Pray CTA becomes the gradient showstopper because of the four cross-feature exits the tab offers ("Meditate on this passage," "Journal about this question," "Pray about today's reading," and the Share/Read-Aloud pair), praying about the passage is the deepest engagement and the strongest spiritual lift, so it earns the page's only gradient.

The hardest part of this spec is **test surgery** — `DevotionalTabContent.test.tsx` (550 lines) carries class-string assertions on the migrated surfaces, and each assertion needs to be updated in lockstep with the source migration so behavioral coverage is preserved while visual assertions track the new tier values. The recon flagged ~11 specific assertions; the planner reads the file in full during execution and updates only the ones that touch migrated elements.

## User Story

As a **logged-out visitor or logged-in user reading today's devotional on `/daily?tab=devotional`**, I want the reflection body to feel like the page's centerpiece — accent-tier card with a violet glow and a "Today's reflection" eyebrow that signals "this is what you came to read" — the quote to read as a quieter supporting voice, the reflection question to feel as continuous with the scripture passage above it as the visual rhythm allows (matching Tier 2 callout idiom), and the "Pray about today's reading" button to land as the page's emotional peak (a gradient pill that resolves the reading flow into a prayerful next step) — so that the visual hierarchy guides me through reading → reflecting → quote → question → prayer without competing for my attention.

## Requirements

### Functional Requirements

#### 1. Reflection body card → FrostedCard accent + eyebrow

Locate the reflection body card in `frontend/src/components/daily/DevotionalTabContent.tsx` (around lines 252–258; the wrapping `<div className="py-6 sm:py-8">` block above it stays unchanged).

**Currently:**

```tsx
<FrostedCard className="p-5 sm:p-8">
  <div className="space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg">
    {devotional.reflection.map((paragraph, i) => (
      <p key={i}>{paragraph}</p>
    ))}
  </div>
</FrostedCard>
```

**Replace with:**

```tsx
<FrostedCard
  variant="accent"
  eyebrow="Today's reflection"
  className="p-5 sm:p-8"
>
  <div className="space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg">
    {devotional.reflection.map((paragraph, i) => (
      <p key={i}>{paragraph}</p>
    ))}
  </div>
</FrostedCard>
```

The accent variant gives the card the violet border + glow treatment. The eyebrow prop renders "TODAY'S REFLECTION" with a violet leading dot above the inner content. The `p-5 sm:p-8` padding override is preserved — the reflection body is the page's primary reading surface and deserves generous breathing room (a default `p-6` would feel too compact for prose at `text-[17px] sm:text-lg leading-[1.8]`). The inner `space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg` and the paragraph map stay unchanged verbatim.

#### 2. Quote card → FrostedCard default (explicit)

Locate the quote card (around lines 263–271).

**Currently:**

```tsx
<FrostedCard className="p-5 sm:p-6">
  <span className="font-serif text-5xl leading-none text-white/25" aria-hidden="true">
    &ldquo;
  </span>
  <blockquote className="mt-2 font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
    {devotional.quote.text}
  </blockquote>
  <p className="mt-3 text-sm text-white/80">&mdash; {devotional.quote.attribution}</p>
</FrostedCard>
```

**Replace with:**

```tsx
<FrostedCard variant="default" className="p-5 sm:p-6">
  <span className="font-serif text-5xl leading-none text-white/25" aria-hidden="true">
    &ldquo;
  </span>
  <blockquote className="mt-2 font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
    {devotional.quote.text}
  </blockquote>
  <p className="mt-3 text-sm text-white/80">&mdash; {devotional.quote.attribution}</p>
</FrostedCard>
```

`variant="default"` is technically the default value, but the explicit declaration makes the tier choice readable in code (the reflection body above is `variant="accent"`; this one is `variant="default"`; the contrast reads at a glance during future code review). The decorative left quote, the italic blockquote, the attribution, and the `p-5 sm:p-6` padding override stay unchanged verbatim.

#### 3. Reflection question card → rolls-own Tier 2 callout

Locate the reflection question card (around lines 274–297). The wrapping `<div className="py-6 sm:py-8" ref={questionRef}>` block stays — **the `ref={questionRef}` is load-bearing** because it drives the intersection observer that fires `recordActivity('devotional', 'devotional')` and `onComplete?.()` when the user scrolls past the question (this is the page's completion-tracking trigger). The ref must remain on the wrapping `<div>`, not on the FrostedCard / new rolls-own div inside it. Verify by reading the file during execution.

**Currently:**

```tsx
<FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">
  <p className="text-xs font-medium uppercase tracking-widest text-white/70">
    Something to think about
  </p>
  <p className="mt-2 text-xl font-medium leading-[1.5] text-white sm:text-2xl">
    {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
  </p>
  <div className="mt-5">
    <button
      type="button"
      onClick={() => {
        const reflectionQuestion = devotional.reflectionQuestion.replace(
          'Something to think about today: ',
          '',
        )
        onSwitchToJournal?.(devotional.theme, reflectionQuestion, buildSnapshot())
      }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-[colors,transform] duration-fast hover:bg-gray-100 active:scale-[0.98]"
    >
      Journal about this question &rarr;
    </button>
  </div>
</FrostedCard>
```

**Replace with rolls-own Tier 2 div:**

```tsx
<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">
  <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3">
    Something to think about
  </p>
  <p className="text-xl font-medium leading-[1.5] text-white sm:text-2xl mb-5">
    {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
  </p>
  <Button
    variant="subtle"
    size="sm"
    type="button"
    onClick={() => {
      const reflectionQuestion = devotional.reflectionQuestion.replace(
        'Something to think about today: ',
        '',
      )
      onSwitchToJournal?.(devotional.theme, reflectionQuestion, buildSnapshot())
    }}
  >
    Journal about this question &rarr;
  </Button>
</div>
```

Critical decisions captured here:

- **Wrapper:** migrates from `<FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">` to a rolls-own `<div>` whose class string matches the passage callout (line 222) **exactly**: `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`. The two callouts now read as a unified Tier 2 visual idiom across the tab.
- **Eyebrow:** migrates from `text-white/70` (the prior callout's `text-xs font-medium uppercase tracking-widest`) to `text-white/50` with `tracking-[0.15em]` — quieter, more refined letterspacing — and gains an explicit `mb-3` (replacing the `mt-2` on the question paragraph). The eyebrow stays inline as a plain `<p>` rather than using FrostedCard's `eyebrow` prop, because the wrapper is now a rolls-own `<div>`, not a FrostedCard. **The eyebrow does NOT have a leading violet dot** — Tier 2 callouts don't have dots; only the Tier 1 accent FrostedCard's eyebrow does.
- **Question paragraph:** `text-xl font-medium leading-[1.5] text-white sm:text-2xl` is preserved verbatim. The vertical rhythm collapses onto the wrapper's gap controls — `mb-5` on the question paragraph replaces the prior `<div className="mt-5">` button wrapper, simplifying the markup.
- **CTA migration:** the rolls-own white pill `<button>` becomes `<Button variant="subtle" size="sm" type="button" onClick={...}>` — same pattern as 1B's secondary CTAs. The handler logic is preserved verbatim (computes the question text, calls `onSwitchToJournal` with theme, question, and snapshot). The wrapping `<div className="mt-5">` is removed because the Button absorbs the layout role.
- **`<Link>` is NOT used here.** The original is a `<button>` that fires the `onSwitchToJournal` callback — not a navigation. The Button's `asChild` pattern is the wrong shape; use the direct `<Button onClick={...}>` form.
- **`Button` import:** add `import { Button } from '@/components/ui/Button'` if not already present at the top of the file.

#### 4. "Meditate on this passage" CTA → subtle Button

Locate the "Meditate on this passage" `<Link>` (around lines 235–241) inside the passage section, below the passage scripture callout.

**Currently:**

```tsx
<div className="mt-4 flex items-center gap-4">
  <Link
    to={`/meditate/soaking?verse=${encodeURIComponent(devotional.passage.reference)}&verseText=${encodeURIComponent(devotional.passage.verses.map((v) => v.text).join(' '))}&verseTheme=${encodeURIComponent(devotional.theme)}`}
    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
  >
    Meditate on this passage &rarr;
  </Link>
</div>
```

**Replace with:**

```tsx
<div className="mt-4 flex items-center gap-4">
  <Button variant="subtle" size="md" asChild>
    <Link
      to={`/meditate/soaking?verse=${encodeURIComponent(devotional.passage.reference)}&verseText=${encodeURIComponent(devotional.passage.verses.map((v) => v.text).join(' '))}&verseTheme=${encodeURIComponent(devotional.theme)}`}
    >
      Meditate on this passage &rarr;
    </Link>
  </Button>
</div>
```

The `<Link>` href and the inline url-encoding logic are preserved verbatim (devotional reference, joined verse text, theme — all encoded via `encodeURIComponent`). The Button's `asChild` prop forwards its rendering to the underlying `<Link>` so the variant chrome wraps a real react-router-dom `<Link>` (not an `<a>`), preserving SPA navigation. The wrapping `<div className="mt-4 flex items-center gap-4">` stays — it controls the spacing relative to the passage callout above. **Note from the recon brief:** the spec's example showed `to="/daily?tab=meditate&..."`, but the actual Link target is `/meditate/soaking?verse=...&verseText=...&verseTheme=...` (the per-meditation deep link, per Spec Z's verse-aware meditation contract). Preserve the actual href.

**Note on the verse-aware meditation flow (Spec Z):** Per `10-ux-flows.md` § "Verse-Aware Meditation Flow," this Link historically went directly to `/meditate/soaking?verse=...` (and still does in the current file). Spec Z documents the `/daily?tab=meditate&verseRef=...` flow as the canonical contract going forward, where the meditate tab routes the verse to either Soaking or Breathing via the verse banner. **This spec preserves the existing href verbatim — do not refactor the Spec Z routing as part of Spec 2.** The Link href change is out of scope; this spec only changes the Button chrome.

#### 5. "Pray about today's reading" CTA → gradient showstopper

Locate the "Pray about today's reading" CTA section (around lines 299–315). This is the page's emotional peak.

**Currently:**

```tsx
<div className="py-6 sm:py-8">
  <div className="flex flex-col items-center gap-3 text-center">
    <p className="text-sm text-white/60">Ready to pray about today&apos;s reading?</p>
    <button
      type="button"
      onClick={() => {
        const verseText = devotional.passage.verses.map((v) => v.text).join(' ')
        const customPrompt = `I'm reflecting on today's devotional about ${devotional.theme}. The passage is ${devotional.passage.reference}: "${verseText}". Help me pray about what I've read.`
        onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot())
      }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-[colors,transform] duration-fast hover:bg-gray-100 active:scale-[0.98]"
    >
      Pray about today&apos;s reading &rarr;
    </button>
  </div>
</div>
```

**Replace with:**

```tsx
<div className="py-6 sm:py-8">
  <div className="flex flex-col items-center gap-3 text-center">
    <p className="text-sm text-white/60">Ready to pray about today&apos;s reading?</p>
    <Button
      variant="gradient"
      size="lg"
      type="button"
      onClick={() => {
        const verseText = devotional.passage.verses.map((v) => v.text).join(' ')
        const customPrompt = `I'm reflecting on today's devotional about ${devotional.theme}. The passage is ${devotional.passage.reference}: "${verseText}". Help me pray about what I've read.`
        onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot())
      }}
    >
      Pray about today&apos;s reading &rarr;
    </Button>
  </div>
</div>
```

Critical decisions:

- **Button shape:** the spec brief noted ambiguity over `<Link>` vs `<button>`. The actual element is a `<button onClick={...}>` that fires the `onSwitchToPray` callback — same shape as the question's "Journal about this question" CTA. It is **NOT** navigation; it is a parent-state-update via callback. So the Button uses `onClick={...}` directly — no `asChild`, no `<Link>`.
- **Variant + size:** `variant="gradient" size="lg"` is the showstopper combo from 1B (used by "Help Me Pray" and "Save Entry"). This is the only gradient on the Devotional tab.
- **Layout preservation:** the wrapping `<div className="flex flex-col items-center gap-3 text-center">` stays — it centers the preceding "Ready to pray about today's reading?" text and the button itself. The Button's intrinsic min-h-[44px] satisfies the touch target floor.
- **Handler logic:** the inline customPrompt construction (concatenating theme, reference, joined verse text into the conversational prompt) is preserved verbatim. The `buildSnapshot()` call is preserved.
- **Preceding text:** `<p className="text-sm text-white/60">Ready to pray about today's reading?</p>` is preserved exactly — the Button replacing the rolls-own `<button>` should NOT collapse the text into the button itself.

#### 6. Share + Read Aloud action buttons → subtle Buttons

Locate the Share + Read Aloud row (around lines 337–356).

**Currently (both buttons share the same class string verbatim):**

```tsx
<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
  <button
    onClick={handleShareClick}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] active:scale-[0.98]"
  >
    <Share2 size={18} aria-hidden="true" />
    Share today&apos;s devotional
  </button>
  <button
    onClick={handleReadAloudClick}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] active:scale-[0.98]"
  >
    <Volume2 size={18} aria-hidden="true" />
    {readAloud.state === 'idle'
      ? 'Read aloud'
      : readAloud.state === 'playing'
        ? 'Pause'
        : 'Resume'}
  </button>
</div>
```

**Replace with:**

```tsx
<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
  <Button variant="subtle" size="md" onClick={handleShareClick}>
    <Share2 size={18} aria-hidden="true" />
    Share today&apos;s devotional
  </Button>
  <Button variant="subtle" size="md" onClick={handleReadAloudClick}>
    <Volume2 size={18} aria-hidden="true" />
    {readAloud.state === 'idle'
      ? 'Read aloud'
      : readAloud.state === 'playing'
        ? 'Pause'
        : 'Resume'}
  </Button>
</div>
```

Decisions:

- **Wrapping flex container preserved:** `mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center` stays — it controls the vertical-on-mobile / horizontal-on-tablet+ stacking that's specific to this row.
- **Icon sizes preserved verbatim:** `<Share2 size={18}>` and `<Volume2 size={18}>`. **The recon brief showed `h-4 w-4`** as an example, but the actual file uses `size={18}`. Preserve `size={18}` — both ergonomically (slightly larger reads better on a primary action row at the bottom of the page) and to avoid drift from existing visual density.
- **Read Aloud dynamic label preserved:** `{readAloud.state === 'idle' ? 'Read aloud' : readAloud.state === 'playing' ? 'Pause' : 'Resume'}` stays verbatim.
- **Handlers preserved:** `handleShareClick` (clipboard write + toast) and `handleReadAloudClick` (TTS state machine) are the existing imports/closures, untouched.
- **Aria affordances preserved:** the icons are already `aria-hidden="true"`. The Button component handles the rest of the focus/keyboard chrome.

#### 7. Surfaces NOT migrated (preserved verbatim)

This is critical for regression safety — the Devotional tab has multiple shared and rolls-own surfaces that **stay rolls-own** by design.

- **Passage scripture callout** (around line 222): `<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">` containing the verse-numbered `<sup>` superscripts and the WEB Bible verses rendered in `font-serif text-lg leading-[1.75] text-white sm:text-xl`. **UNCHANGED** — this is the canonical Tier 2 scripture callout pattern from `09-design-system.md` § "FrostedCard Tier System" (Spec T) and stays as the visual reference the Spec 2 reflection question now matches.
- **Date navigation strip** (around lines 159–197): the previous-day / next-day chevron buttons with min-h-[44px] / min-w-[44px] touch targets, the dateStr, and the "Completed" inline indicator. UNCHANGED.
- **Devotional title `<h3>`** (around lines 200–202): `text-2xl font-bold text-white sm:text-3xl` heading. UNCHANGED.
- **Verse share button** (around lines 213–220): the rolls-own Share2 icon button next to the passage reference. This is a small icon-only affordance distinct from the row of subtle buttons at the bottom; leave it rolls-own per scope (the brief does not call it out, and migrating an icon-only button to `<Button>` would change its visual density). UNCHANGED.
- **`SharePanel`** (around lines 242–247): shared component. UNCHANGED.
- **`RelatedPlanCallout`** (around lines 318–325): shared component used outside DailyHub. EXPLICITLY DEFERRED to a future shared-component sweep spec. UNCHANGED.
- **`EchoCard`** (around lines 327–335): shared component (BB-46) mounted on Dashboard + Daily Hub. EXPLICITLY DEFERRED. UNCHANGED.
- **`buildReadAloudText`, `buildSnapshot`, intersection observer, swipe handlers, completion tracking** (all the supporting logic): UNCHANGED. **Verify in particular** that:
  - The `ref={questionRef}` stays on the wrapping `<div className="py-6 sm:py-8" ref={questionRef}>` of the reflection question section, because it drives the IntersectionObserver that records `recordActivity('devotional', 'devotional')` and fires `onComplete?.()` at scroll-past-50%.
  - The `onComplete?.()` and `playSoundEffect('chime')` on completion stay UNCHANGED.
  - The `useEffect` that reads `wr_devotional_reads` from localStorage and the one that writes today's date back to it stay UNCHANGED.
- **`DevotionalPreviewPanel`, `VersePromptCard`** (referenced from other tabs but not directly mounted on Devotional content): explicitly out of scope. Preserved.

### Non-Functional Requirements

- **Type safety:** TypeScript strict (project default). `pnpm tsc --noEmit` (or equivalent — `pnpm build` exercises typecheck) must pass cleanly. The Button component's variant prop union already includes `'subtle' | 'gradient' | 'default' | 'ghost'` per 1A + 1B, so no new type wiring.
- **Test pass:** `pnpm test` must pass. **No new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files documented in `CLAUDE.md`).** This spec performs **explicit test surgery** in `DevotionalTabContent.test.tsx`. After the migration:
  - Behavioral tests (renders content, intersection observer fires, navigation handlers fire, "Completed" badge appears, date navigation works, swipe handlers register, share + read-aloud handlers fire) MUST continue to pass unchanged.
  - Class-string assertions on migrated elements are updated in lockstep — see § "Test surgery" below for the canonical list.
  - Test failures in `DevotionalTabContent.test.tsx` after migration are a regression, not "expected churn." Each one must be addressed before considering the spec complete.
- **Accessibility (preserved, not improved):**
  - Reflection body card: FrostedCard accent variant carries the focus-ring + role/tabIndex chrome it already provides on Daily Hub. No regression.
  - Reflection question rolls-own `<div>`: a non-interactive container (the question is read content, the CTA inside is the interactive surface). No new aria.
  - "Journal about this question" Button: `<Button variant="subtle" size="sm" type="button">` — the Button component carries min-h-[44px]. The handler signature is preserved.
  - "Meditate on this passage" Button: `asChild` forwards the underlying `<Link>` semantics — focus management, route navigation, and `tabIndex` flow through React Router unchanged.
  - "Pray about today's reading" Button: `<Button variant="gradient" size="lg">` — gradient variant carries the canonical shipped focus ring (1A + 1B). The min-h-[44px] is preserved.
  - Share / Read Aloud Buttons: `<Button variant="subtle" size="md">` — both inherit min-h-[44px] from the size variant. The dynamic Read Aloud label stays unchanged. Icons retain `aria-hidden="true"`.
  - **Heading hierarchy unchanged.** No new `<h*>` elements introduced.
  - **No new aria-live regions.** Crisis detection, completion state, etc. — all unchanged.
- **Performance:** No new runtime dependencies. No new tokens. Zero impact on Lighthouse Performance — the migration replaces inline class strings + rolls-own buttons with FrostedCard variants and Button variants whose CSS resolves at build time. Render cost is identical.
- **Visual regression scope:**
  - **Pilot route (intentionally redesigned):** `/daily?tab=devotional` — full devotional flow with all 6 surfaces in vertical scroll order.
  - **Untouched DailyHub tab content:** `/daily?tab=pray` (1B), `/daily?tab=journal` (1B), `/daily?tab=meditate` (1A) — content cards must look identical to pre-spec. The shared chrome (canvas + tab bar + DailyAmbientPillFAB) continues to render as in 1A + 1B.
  - **Manual verification list before commit:** see § "Manual visual verification" in Acceptance Criteria below.

## Auth Gating

This is a visual-system spec on a tab whose interactions are largely **visual and atmospheric** rather than auth-gated. The Devotional tab content is explicitly readable without login (per `02-security.md` — devotional reading and viewing devotional content are not auth-gated). The migration changes class strings and component composition (rolls-own → FrostedCard variants + Button variants), but **does not gain or lose any auth-gated actions**. Every existing auth gate is preserved verbatim.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Read the devotional content (passage, reflection, quote, question) | Allowed (no gate) | Allowed | N/A — reading is not gated |
| Click Previous-day / Next-day chevrons | Allowed (no gate) | Allowed | N/A — date navigation is not gated |
| Click "Meditate on this passage" Link | Navigates to `/meditate/soaking?verse=...` — meditation auth gating is then handled by Spec Z's logged-out flow (verse banner appears; clicking a verse-compatible meditation card triggers the auth modal, which preserves the verse params after auth) | Same navigation path; verse params consumed correctly | Existing meditation auth modal message preserved (unchanged by this spec) |
| Click "Journal about this question" Button | `onSwitchToJournal?.(...)` callback fires — DailyHub.tsx routes to the Journal tab with the question as the prompt. The Journal tab's textarea is reachable without auth; the "Save Entry" gate fires later if/when the user attempts to save (1B preserved that gate). | Same | Existing Journal save-entry auth modal message preserved (unchanged by this spec) |
| Click "Pray about today's reading" Button | `onSwitchToPray?.(...)` callback fires — DailyHub.tsx routes to the Pray tab with the contextual prompt. The Pray tab's textarea is reachable without auth; the "Help Me Pray" gate fires when the user submits (1B preserved that gate). | Same | Existing Pray "Help Me Pray" auth modal message preserved (unchanged by this spec) |
| Click "Share today's devotional" Button | Allowed — copies window.location.href to clipboard, shows toast | Same | N/A — sharing is not gated |
| Click "Read aloud" Button | Allowed — toggles browser SpeechSynthesis playback | Same | N/A — TTS is not gated |
| Click verse-share icon (next to passage reference) | Allowed — opens SharePanel | Same | N/A — verse sharing is not gated |
| Scroll past the reflection question | Logged-out: nothing fires (intersection observer is gated on `isAuthenticated`) | Logged-in: marks devotional read, increments faith points, fires `onComplete?.()`, plays chime sound effect | N/A — completion tracking is silent |

`02-security.md` § "Auth Gating Strategy" remains canonical for which actions on `/daily` require login. Every gate listed there is preserved exactly; only the visual chrome around the click target changes.

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | Devotional tab content layout preserved exactly. Reflection body FrostedCard accent uses `p-5` (the `sm:p-8` kicks in at 640px+). Quote FrostedCard default uses `p-5`. Reflection question rolls-own `<div>` uses `px-5 py-6` (matching the passage callout's mobile padding). "Journal about this question" Button at `size="sm"` (min-h-[44px]). "Meditate on this passage" Button at `size="md"`. "Pray about today's reading" gradient Button at `size="lg"` (min-h-[44px]). Share + Read Aloud row stacks vertically (`flex-col`) with `gap-3`; both Buttons render at `size="md"` (min-h-[44px]). FrostedCard accent variant uses `backdrop-blur-md` (~8px) on mobile per the pilot. |
| Tablet (640–1024px) | Reflection body uses `sm:p-8`; quote uses `sm:p-6`; question callout uses `sm:px-7 sm:py-7` — matching the passage callout's tablet padding. Share + Read Aloud row transitions to horizontal (`sm:flex-row sm:justify-center`) with `gap-3`. The accent FrostedCard's `md:` breakpoint kicks in for `backdrop-blur-[12px]` per the pilot. The default FrostedCard's `md:` breakpoint kicks in for `backdrop-blur-md`. |
| Desktop (≥ 1024px) | Same tier behavior as tablet. Reflection body's accent eyebrow renders at full intent — violet leading dot + uppercase tracked label — at the top of the card. Gradient "Pray about today's reading" Button renders at full intent — gradient pill, `lg` size, drop shadow, hover lift. Multi-bloom canvas (1A) renders all five layers behind the tab content. |

**Responsive notes:**

- This spec changes NO existing layouts, grids, or breakpoint behavior. Every layout change is a class-string substitution with the same effective bounding box. The wrapping `<div className="py-6 sm:py-8">` blocks around each section stay verbatim, preserving the vertical rhythm.
- Hover states (translate, shadow change, color shift) only fire at hover-capable breakpoints; mobile taps trigger `active:scale-[0.98]` (FrostedCard / Button) instead. The reflection body card and the gradient CTA both animate down on press, providing tactile feedback.
- The reflection question rolls-own `<div>` does not need a hover state — it's a non-interactive container; the interactive Button inside it carries its own hover affordance.
- All button variants (`subtle`, `gradient`) respect `motion-reduce:transition-none` from the canonical animation tokens (BB-33).
- The "Read aloud" Button's dynamic label triggers a re-render but no layout shift — the Button component's `size="md"` keeps the bounding box stable across `'Read aloud' | 'Pause' | 'Resume'` (all 3 labels fit comfortably).

## AI Safety Considerations

This is a visual-system spec — no change to crisis detection, content moderation, AI prompt logic, or AI safety guardrails on any consumer flow.

- **No user input on the Devotional tab.** The tab is a reading surface. The textarea for prayer / journal lives on the Pray and Journal tabs respectively (1B). When the user clicks "Journal about this question" or "Pray about today's reading," control transfers to those tabs via the existing `onSwitchToJournal` / `onSwitchToPray` callbacks — those tabs handle their own crisis detection on the user's typed input via `CrisisBanner`.
- **No AI-generated content rendered on the Devotional tab.** The reflection body, quote, passage, and question are all hardcoded in `frontend/src/data/devotionals.ts` (50 entries with WEB-translation passages). The "Pray about today's reading" CTA passes a contextual prompt to the Pray tab, which then triggers the AI prayer generation flow (Gemini via the backend proxy at `/api/v1/proxy/ai/*`) — that flow is unchanged.
- **No AI safety boundaries crossed.** Spec 2 does not touch the `containsCrisisKeyword()` fast-path or the backend classifier. Existing safety semantics are preserved.

N/A — this feature does not involve AI-generated content or free-text user input on the Devotional tab itself. No crisis detection required for the migrated surfaces.

## Auth & Persistence

- **Logged-out users:** Visual changes only. No new persistence. Existing localStorage reads/writes on this tab — `wr_devotional_reads` (read on mount, written on intersection observer fire) — only fire when `isAuthenticated` is true (gated by the existing `useEffect` predicate). Logged-out users can read the devotional, navigate dates, click cross-feature CTAs, share, and use Read Aloud, but no completion state is recorded.
- **Logged-in users:** Visual changes only. No new database tables, columns, or backend endpoints. Devotional completion continues to write to `wr_devotional_reads` (max 365 entries, day-keyed). Faith points (`recordActivity('devotional', 'devotional')`) continue to fire via the existing `useFaithPoints()` hook.
- **localStorage usage:** No new keys introduced. Existing keys read/written on this tab (`wr_devotional_reads`, `wr_echoes_dismissed_session` via `useEcho`) are untouched.
- **Route type:** Public (`/daily` is public). Some interactions on this tab gate to login on the destination tabs (Pray, Journal, Meditate) per the existing 1A + 1B + Spec Z gates. This spec preserves every gate.

## Completion & Navigation

This spec preserves the entire completion + navigation contract. Specifically:

- **Devotional completion tracking:** the `useEffect` with the `IntersectionObserver` watching `questionRef.current` (the wrapping `<div>` of the reflection question section) at threshold 0.5 stays UNCHANGED. The `ref={questionRef}` MUST be on the wrapping `<div>`, not on the new rolls-own callout div inside it — verify by reading the file during execution. Crossing the threshold writes today's date to `wr_devotional_reads` (capped at 365 entries), calls `recordActivity('devotional', 'devotional')`, plays the `'chime'` sound effect, and fires `onComplete?.()` to notify the DailyHub completion tracking system.
- **Cross-tab navigation:** the three CTAs that route to other tabs preserve their existing context-passing:
  - "Meditate on this passage" → React Router navigation to `/meditate/soaking?verse=...&verseText=...&verseTheme=...` (the per-meditation deep link, NOT the meditate-tab fan-out).
  - "Journal about this question" → callback `onSwitchToJournal?.(devotional.theme, reflectionQuestion, buildSnapshot())` — the parent (DailyHub.tsx) updates `prayContext` and routes to the Journal tab with the snapshot mounted in `DevotionalPreviewPanel`.
  - "Pray about today's reading" → callback `onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot())` — parent routes to the Pray tab with the contextual prompt and snapshot.
- **Date navigation:** the `navigateDay(direction)` callback continues to update searchParams with `replace: true`, preserving back-button history. The swipe handlers (`onSwipeLeft → navigateDay(1)`, `onSwipeRight → navigateDay(-1)`) stay UNCHANGED.

## Design Notes

**No new patterns introduced.** Spec 2 reuses every pattern shipped in 1A + 1B + the BibleLanding pilot.

**Patterns reused (already shipped — referenced, not re-defined):**

- `<FrostedCard variant="accent" eyebrow="Today's reflection">` — used for the reflection body card. Variant + eyebrow API shipped in pilot + 1A.
- `<FrostedCard variant="default">` — used for the saint quote card. Variant API shipped in pilot.
- Rolls-own Tier 2 scripture-callout idiom (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`) — used for the reflection question. **Exact class string match with the existing passage callout** (line 222 of DevotionalTabContent.tsx). This idiom is documented in `09-design-system.md` § "FrostedCard Tier System" Tier 2.
- Tier 2 callout eyebrow (`text-xs font-medium uppercase tracking-[0.15em] text-white/50`) — Tier 2 callouts have NO leading violet dot (only Tier 1 accent FrostedCard's eyebrow does). Documented as a discrete sub-pattern alongside the Tier 2 callout idiom.
- `<Button variant="subtle" size="sm" | "md">` — used for "Journal about this question," "Meditate on this passage," "Share today's devotional," "Read aloud." Variant shipped in 1A.
- `<Button variant="gradient" size="lg">` — used for "Pray about today's reading" — the page's only gradient. Variant shipped in BibleLanding pilot, used on Pray + Journal tabs in 1B.
- `Button` `asChild` prop — used by "Meditate on this passage" to forward the underlying `<Link>`. Shipped pattern.
- Multi-bloom BackgroundCanvas (DailyHub root, 1A) — already mounted; no per-tab change.

**Existing components reused (do not reinvent):**

- `cn()` utility from `@/lib/utils` — class-name merging. Used on the existing date-navigation chevrons (preserved).
- `FrostedCard` (`frontend/src/components/homepage/FrostedCard.tsx`) — used as-is via `variant`, `eyebrow`, `className` props.
- `Button` (`frontend/src/components/ui/Button.tsx`) — used as-is via `variant`, `size`, `asChild`, `onClick`, `type` props.
- `VerseLink` (`frontend/src/components/shared/VerseLink.tsx`) — preserved on the passage reference. UNCHANGED.
- `SharePanel` (`frontend/src/components/sharing/SharePanel.tsx`) — preserved for verse sharing.
- `RelatedPlanCallout`, `EchoCard`, `useEcho` — preserved verbatim.
- `useReadAloud` hook — preserved for the dynamic Read Aloud label + handler.
- `useSwipe`, `useSearchParams`, `useFaithPoints`, `useSoundEffects`, `useReadingPlanProgress`, `useToast`, `useAuth` — all preserved verbatim.

**Eyebrow color note (Tier 2 callout vs Tier 1 FrostedCard accent):**

Spec 2 introduces a fine-grained distinction worth noting in the design system:

- **Tier 1 (FrostedCard accent + eyebrow):** uppercase tracked label preceded by a violet leading dot. The dot is the visual signature of the most prominent tier.
- **Tier 2 (rolls-own callout + eyebrow):** uppercase tracked label, NO leading dot. The left-stripe accent (`border-l-4 border-l-primary/60`) is the Tier 2 signature; adding a dot would double-up on accent.

This distinction is implicit in 1A + 1B's component code (only FrostedCard accent renders the dot) but is now externally visible because Spec 2 introduces a Tier 2 callout with an eyebrow paragraph. **Documentation update for this spec:** when the spec ships, capture this dot-vs-no-dot distinction in `09-design-system.md` § "FrostedCard Tier System" so future Tier 2 callouts know which idiom to follow. Lightweight one-paragraph addition.

**Pre-existing inconsistencies acknowledged but NOT fixed in this spec (deferred):**

- **`RelatedPlanCallout`, `EchoCard`, `VersePromptCard`, `DevotionalPreviewPanel`** — shared components used outside DailyHub. Migrating them requires audit of every consumer. Deferred to a future shared-component sweep spec.
- **Verse-share icon button** (next to passage reference, line 213): icon-only rolls-own button. Migration to `<Button>` would change the visual density of an icon-only affordance. Deferred to a future icon-button audit spec.
- **`SharePanel`** (`frontend/src/components/sharing/SharePanel.tsx`) — out of scope for the visual migration (it's a shared modal-style component used across the app). Deferred.
- **Token system cleanups** — focus-ring offset color drift, deprecated `Card.tsx`, unused `liquid-glass` utility (deferred from 1A + 1B).
- **Spec Z routing** — the "Meditate on this passage" Link goes directly to `/meditate/soaking?...` rather than the canonical `/daily?tab=meditate&verseRef=...` flow documented in Spec Z. The href change is out of scope; this spec only refreshes the Button chrome.

**Reference points (context for /plan):**

- `_specs/dailyhub-1a-foundation-and-meditate.md` — defines the FrostedCard variant API in DailyHub context, the `Button variant="subtle"` shipped, and the multi-bloom BackgroundCanvas.
- `_specs/dailyhub-1b-pray-and-journal.md` — defines the Pray + Journal tab migrations Spec 2 mirrors; in particular the gradient + subtle Button variant patterns.
- `_specs/frostedcard-pilot-bible-landing.md` — defines the FrostedCard variant API and the `Button variant="gradient"` shipped originally.
- `_specs/frostedcard-iteration-1-make-it-pop.md` — canonical surface opacities and editorial polish patterns (accent variant uses `bg-violet-500/[0.08]` background, NOT `bg-white/[0.07]` like default).
- `09-design-system.md` § "FrostedCard Tier System" — Tier 1 / Tier 2 distinction.
- `09-design-system.md` § "Round 3 Visual Patterns" + § "Daily Hub Visual Architecture".
- Aesthetic target: same FPU/Lovable visual energy as BibleLanding post-iteration-1 + Pray/Journal post-1B + Meditate post-1A — frosted cards lifted off a richly atmospheric canvas, the reflection body owning the page's center of gravity at accent tier, the Pray gradient CTA landing as the emotional peak.

## Test surgery — DevotionalTabContent.test.tsx

This is the high-leverage / high-risk part of Spec 2. The recon flagged ~11 class-string assertions in `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` (550 lines) that touch the migrated surfaces. The planner must:

1. **Read the test file in full during execution** (not skim — read all 550 lines).
2. **Identify EVERY class-string assertion that touches a migrated element** (reflection body, quote, reflection question, "Pray about today's reading" CTA, Share / Read Aloud buttons). Note: assertions on the **passage callout** stay UNCHANGED — that surface is not migrated.
3. **Update each in lockstep** with the source migration.
4. **Preserve all behavioral tests** (renders content, intersection observer fires, onSwitchToJournal/onSwitchToPray fire correctly, navigation works, swipe handlers register, "Completed" badge appears at the right time, share + read-aloud handlers fire, useEffect deps are correct).

### Assertions to UPDATE (reflection body — Tier 3 → Tier 1 accent)

The recon called these out specifically:

- `'Tier 3: reflection body is wrapped in FrostedCard'` — CONCEPTUAL SHIFT: the reflection body is now a FrostedCard `accent` variant, not the original (default-tier) FrostedCard. The test's intent (the body IS in a FrostedCard) still holds; the variant changes. Update the assertion to check for accent variant classes:
  - Background: `bg-violet-500/[0.08]` (NOT `bg-white/[0.07]` which is default)
  - Border: `border-violet-400/45` (NOT `border-white/[0.12]`)
  - Eyebrow rendered: assert "Today's reflection" appears (text content match)
- `'Tier 3: reflection FrostedCard has generous padding'` — UNCHANGED. Padding `p-5 sm:p-8` is preserved.
- Any `'bg-white/[0.07]'` assertion on the reflection card → update to `'bg-violet-500/[0.08]'`.
- Any `'border-white/[0.12]'` assertion on the reflection card → update to `'border-violet-400/45'` (per the iteration-1 accent-tier surface in `09-design-system.md`).

### Assertions to UPDATE (reflection question — FrostedCard with override → rolls-own Tier 2)

- `'reflection question card has border-l-primary'` — CONCEPTUAL SHIFT: the card is no longer a FrostedCard with override; it's a rolls-own `<div>` with `border-l-4 border-l-primary/60`. Update assertion:
  - Old: assert `border-l-2 border-l-primary` (or similar)
  - New: assert `border-l-4` AND `border-l-primary/60` (matching the passage callout's exact stripe width and color)
- Any `'bg-white/[0.07]'` assertion on the question card → update to `'bg-white/[0.04]'` (rolls-own Tier 2 surface).
- Any assertion on the embedded "Journal about this question" white pill (`bg-white text-primary`) → CONCEPTUAL SHIFT: the button is now a `<Button variant="subtle" size="sm">`. Update the assertion to either:
  - Assert behavioral (the button renders with the text "Journal about this question →" and clicking fires `onSwitchToJournal`), OR
  - Assert subtle-variant classes (border-white/[0.12], bg-white/[0.06], etc. — match the canonical subtle variant from 1B).
  - Recommended: behavioral assertion + variant class spot-check — that's the lowest-churn approach.

### Assertions to UPDATE ("Pray about today's reading" — white pill → gradient)

- `'CTA button has bg-white'` (or similar pill assertion on the Pray CTA) — CONCEPTUAL SHIFT: the button no longer has `bg-white text-primary`; it has gradient classes (`from-violet-400`, `to-violet-300`, `bg-gradient-to-br`, or whatever the gradient variant emits). Update or remove the white-pill-specific assertion.
  - Best path: replace with behavioral assertion (button renders with "Pray about today's reading →" text, clicking fires `onSwitchToPray` with the right args) AND a variant class spot-check (assert `bg-gradient-to-br` or `from-violet-400` to verify the gradient variant rendered).
  - The "Ready to pray about today's reading?" preceding text assertion (if it exists) stays UNCHANGED.

### Assertions to UPDATE (Share + Read Aloud — rolls-own pills → subtle Buttons)

- Any rolls-own pill class assertion on the Share or Read Aloud buttons (`border-white/[0.12]`, `bg-white/[0.06]`, etc.) — these classes happen to overlap with the subtle Button variant's class string, so the assertion may pass unchanged. **Verify by reading the file** — if the assertion is intent-explicit (e.g., "rolls-own pill") update; if it's just class-string match (e.g., "has bg-white/[0.06]") it likely passes unchanged.
- The dynamic Read Aloud label assertion (`'Read aloud' | 'Pause' | 'Resume'`) — UNCHANGED. The `useReadAloud` hook contract is preserved.
- Handler-firing assertions (clicking Share calls `handleShareClick`, clicking Read Aloud calls `handleReadAloudClick`) — UNCHANGED.

### Assertions to PRESERVE UNCHANGED

- **All passage callout assertions** — `border-l-4`, `border-l-primary/60`, `bg-white/[0.04]`, `rounded-xl`, `leading-[1.75]`, `text-white`, verse superscript styling. The passage callout is not migrated.
- **All behavioral tests** — renders devotional title, renders today's date, intersection observer fires correctly, navigation handlers fire, swipe handlers register, "Completed" badge appears at the right time, useEffect dependency arrays are stable, recordActivity / playSoundEffect / onComplete fire on completion threshold cross.
- **All Tier 1 / Tier 2 / Tier 3 padding assertions** that don't touch the migrated elements — stay UNCHANGED. Tier 1 was the passage; Tier 2 was the reflection body; Tier 3 was the question (per the existing test naming). The naming may not perfectly match the new tier semantics post-migration — that's a documentation drift to flag, not a behavioral concern; the planner can rename the describe-block titles if they're stale, but only if the rename is unambiguous.
- **Verse superscript tests** — the `<sup>` rendering of verse numbers inside the passage callout. UNCHANGED.

### Assertions to ADD (optional, but valuable)

- **"Today's reflection" eyebrow renders on the accent reflection card:**
  ```tsx
  expect(screen.getByText("Today's reflection")).toBeInTheDocument()
  ```
  This is a one-liner that verifies the new eyebrow prop fired. Strongly recommended.
- **"Pray about today's reading" uses gradient variant:**
  ```tsx
  const button = screen.getByRole('button', { name: /pray about today's reading/i })
  expect(button.className).toContain('bg-gradient-to-br') // or 'from-violet-400'
  ```
  Verifies the gradient showstopper rendered. Optional but valuable as a regression guard.
- **"Reflection question callout matches Tier 2 idiom" (visual unification check):**
  ```tsx
  // Find both callouts (passage + question), assert both have the same identifying class string
  ```
  Optional. Valuable as a regression guard if a future spec accidentally drifts one callout away from the other.

### Class-string drift discipline

The recon estimated ~11 specific assertions. The actual count may differ (10, 12, 15) — the planner should verify by reading the file. **Do not fabricate test changes that aren't needed.** If an assertion already passes unchanged after the migration (e.g., a passage callout assertion, a behavioral assertion that doesn't touch class strings), leave it alone. The migration-test surgery is surgical, not exhaustive.

### Other test files in scope (verify, but likely no changes)

- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — primary test surgery target.
- Other Daily Hub test files (PrayTabContent.test.tsx, JournalTabContent.test.tsx, MeditateTabContent.test.tsx, GuidedPrayerSection.test.tsx, etc.) — out of scope. Run them to verify regression baseline; do not modify.
- Shared component test files (RelatedPlanCallout.test.tsx, EchoCard.test.tsx if they exist) — out of scope; the components are unchanged.

## Out of Scope

- **Pray tab migration** — already shipped in 1B.
- **Journal tab migration** — already shipped in 1B.
- **Meditate tab migration** — already shipped in 1A.
- **DailyHub page shell, tab bar, hero greeting** — 1A.
- **`BackgroundCanvas` component** — already updated in 1A.
- **`Button` component** — already has `gradient` + `subtle` variants from 1A + 1B + pilot.
- **`FrostedCard` component** — already shipped in pilot.
- **`RelatedPlanCallout`, `EchoCard`, `VersePromptCard`, `DevotionalPreviewPanel`** — shared components used outside DailyHub; explicitly stay rolls-own. Future shared-component sweep spec.
- **Passage scripture callout** (the WEB Bible verses with `<sup>` superscripts) — already canonical Tier 2 idiom; UNCHANGED.
- **Verse share icon button** (next to passage reference) — out of scope; future icon-button audit.
- **`SharePanel` modal** — out of scope.
- **`useReadAloud` hook + Speech Synthesis playback logic** — untouched.
- **Intersection observer + completion tracking logic** — untouched.
- **`wr_devotional_reads` localStorage contract** — untouched.
- **Date navigation chevrons + swipe handlers** — untouched.
- **`<h3>` devotional title** — untouched.
- **`SongPickSection`, `Navbar`, `DailyAmbientPillFAB`, `SiteFooter`** — untouched.
- **Other surfaces:** Homepage, Dashboard, PrayerWall, Settings, Insights, Music, MyBible, BibleReader, AskPage, RegisterPage — all post-DailyHub rollout phases.
- **AuthModal redesign** — separate spec.
- **Spec Z routing change** — "Meditate on this passage" Link still goes to `/meditate/soaking?...` directly; the change to `/daily?tab=meditate&verseRef=...` is out of scope.
- **Token system cleanups** — focus-ring offset color drift, deprecated `Card.tsx`, unused `liquid-glass` utility.
- **Playwright visual regression baseline** — no infrastructure exists yet; manual eyeball review on the affected route is the verification path.
- **New localStorage keys, backend changes, API shapes, content changes:** None. Pure visual-system spec.
- **Crisis detection or AI safety guardrails** — none added or modified.
- **New tests beyond the surgery in DevotionalTabContent.test.tsx** — optional eyebrow + gradient class-string assertions can be added (see § "Test surgery"), but no new test files.

## Acceptance Criteria

### Reflection body card (FrostedCard accent)

- [ ] Reflection body card uses `<FrostedCard variant="accent" eyebrow="Today's reflection" className="p-5 sm:p-8">`
- [ ] The inner `<div className="space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg">` and the paragraph map (`devotional.reflection.map((paragraph, i) => ...)`) are preserved verbatim
- [ ] "TODAY'S REFLECTION" eyebrow with violet leading dot renders above the inner paragraphs (visible during manual verification)

### Quote card (FrostedCard default — explicit)

- [ ] Quote card uses `<FrostedCard variant="default" className="p-5 sm:p-6">`
- [ ] The decorative left quote (`<span className="font-serif text-5xl leading-none text-white/25">`), the italic blockquote (`font-serif text-xl italic leading-[1.6] text-white sm:text-2xl`), and the attribution (`text-sm text-white/80`) are preserved verbatim

### Reflection question (rolls-own Tier 2 callout)

- [ ] Reflection question wrapper migrates from `<FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">` to a rolls-own `<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">`
- [ ] The wrapping `<div className="py-6 sm:py-8" ref={questionRef}>` block is PRESERVED — `ref={questionRef}` stays on the OUTER wrapping div, NOT moved onto the inner rolls-own callout div
- [ ] "Something to think about" eyebrow renders as inline `<p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3">` (no leading violet dot — Tier 2 callouts have no dot)
- [ ] Question paragraph renders as `<p className="text-xl font-medium leading-[1.5] text-white sm:text-2xl mb-5">` with the existing `replace('Something to think about today: ', '')` transform preserved
- [ ] "Journal about this question" CTA inside the callout uses `<Button variant="subtle" size="sm" type="button">` with the existing `onClick` handler that fires `onSwitchToJournal?.(devotional.theme, reflectionQuestion, buildSnapshot())` — verbatim
- [ ] The intersection observer (in the `useEffect` watching `questionRef.current`) continues to fire correctly when the user scrolls past the question (verified by manual scroll test + behavioral test pass)

### "Meditate on this passage" CTA (subtle Button via asChild)

- [ ] "Meditate on this passage" uses `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link>`
- [ ] The `<Link>` href is preserved verbatim: `to={\`/meditate/soaking?verse=${encodeURIComponent(devotional.passage.reference)}&verseText=${encodeURIComponent(devotional.passage.verses.map((v) => v.text).join(' '))}&verseTheme=${encodeURIComponent(devotional.theme)}\`}`
- [ ] The wrapping `<div className="mt-4 flex items-center gap-4">` stays UNCHANGED

### "Pray about today's reading" CTA (gradient showstopper)

- [ ] "Pray about today's reading" uses `<Button variant="gradient" size="lg" type="button">` with the existing `onClick` handler — NOT `<Link>` / NOT `asChild`
- [ ] The handler logic is preserved verbatim: computes `verseText`, builds `customPrompt` template literal, calls `onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot())`
- [ ] The wrapping `<div className="flex flex-col items-center gap-3 text-center">` stays UNCHANGED — preserves the centered layout
- [ ] The "Ready to pray about today's reading?" preceding `<p className="text-sm text-white/60">` stays UNCHANGED
- [ ] This is the ONLY gradient Button variant on the Devotional tab — verified by inspection

### Share + Read Aloud action buttons (subtle Buttons)

- [ ] "Share today's devotional" Button uses `<Button variant="subtle" size="md" onClick={handleShareClick}>` with `<Share2 size={18} aria-hidden="true">` icon
- [ ] "Read aloud" Button uses `<Button variant="subtle" size="md" onClick={handleReadAloudClick}>` with `<Volume2 size={18} aria-hidden="true">` icon
- [ ] Read Aloud Button's dynamic label preserved exactly: `{readAloud.state === 'idle' ? 'Read aloud' : readAloud.state === 'playing' ? 'Pause' : 'Resume'}`
- [ ] Wrapping flex container preserved: `<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">` — vertical-on-mobile / horizontal-on-tablet+ layout intact
- [ ] Icon sizes preserved as `size={18}` (NOT `h-4 w-4`)

### Imports

- [ ] `import { Button } from '@/components/ui/Button'` is present at the top of `DevotionalTabContent.tsx` (likely needs to be added — verify)
- [ ] Existing `FrostedCard` import (already present per line 6) is preserved
- [ ] Existing imports for `EchoCard`, `RelatedPlanCallout`, `VerseLink`, `SharePanel`, `cn`, all hooks, all data sources — UNCHANGED

### Preserved logic (regression-critical)

- [ ] Passage scripture callout (line 222) UNCHANGED — `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7` with WEB Bible verse rendering and `<sup>` superscripts
- [ ] Date navigation chevrons (lines 159–197) UNCHANGED — Previous-day / Next-day buttons with min-h-[44px] / min-w-[44px] touch targets, `cn()` for disabled state styling, swipe handlers via `useSwipe`
- [ ] Devotional title `<h3>` UNCHANGED — `text-2xl font-bold text-white sm:text-3xl`
- [ ] Verse-share icon button (next to passage reference, lines 213–220) UNCHANGED — rolls-own icon button is out of scope
- [ ] `SharePanel` integration UNCHANGED
- [ ] `RelatedPlanCallout` UNCHANGED — shared component, deferred
- [ ] `EchoCard` UNCHANGED — shared component, deferred
- [ ] `useEffect` reading `wr_devotional_reads` from localStorage on mount UNCHANGED
- [ ] `useEffect` setting up `IntersectionObserver` on `questionRef.current` UNCHANGED — predicate `if (!isAuthenticated || dayOffset !== 0 || isCompleted) return` preserved; threshold 0.5 preserved; `recordActivity('devotional', 'devotional')`, `playSoundEffect('chime')`, `onComplete?.()` all fire on observation
- [ ] `wr_devotional_reads` write logic preserved — capped at 365 entries, day-keyed via `new Date().toLocaleDateString('en-CA')`
- [ ] `navigateDay(direction)`, `useSwipe` handlers, `handleShareClick` (clipboard + toast), `handleReadAloudClick` (TTS state machine), `buildReadAloudText`, `buildSnapshot` — all UNCHANGED
- [ ] `useReadAloud()` hook contract preserved (state machine `idle | playing | paused` drives the dynamic label)

### Tests (DevotionalTabContent.test.tsx — surgical updates)

- [ ] Test file read in full during execution (550 lines)
- [ ] Reflection body assertions updated from default (`bg-white/[0.07]`) to accent variant (`bg-violet-500/[0.08]`) classes
- [ ] Reflection question card assertions updated from FrostedCard with `border-l-2 border-l-primary` override to rolls-own Tier 2 (`border-l-4 border-l-primary/60`, `bg-white/[0.04]`) classes
- [ ] "Pray about today's reading" assertion updated from white pill (`bg-white text-primary`) to gradient variant (`bg-gradient-to-br` or `from-violet-400`) classes — OR replaced with a behavioral assertion if the prior test was specifically checking the white-pill chrome
- [ ] Passage callout assertions UNCHANGED (passage stays rolls-own Tier 2)
- [ ] All behavioral tests preserved and passing (renders content, intersection observer fires, navigation handlers fire, swipe handlers register, "Completed" badge appears, share + read-aloud handlers fire, useEffect deps stable)
- [ ] Optional: new test asserts "Today's reflection" eyebrow renders on the accent reflection card
- [ ] Optional: new test asserts "Pray about today's reading" Button renders with gradient variant classes

### Type & test pass

- [ ] `pnpm tsc --noEmit` passes (typecheck clean) — Button variant prop union already accepts `'subtle' | 'gradient' | 'default' | 'ghost'`, no new typing required
- [ ] `pnpm test` passes; no new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files)
- [ ] DevotionalTabContent.test.tsx behavioral coverage preserved — every previously-passing behavioral test passes after the migration
- [ ] No tests mock the entire `FrostedCard` or `Button` modules (would bypass variant rendering)

### Documentation update (lightweight)

- [ ] `09-design-system.md` § "FrostedCard Tier System" gains a one-paragraph note on the dot-vs-no-dot distinction between Tier 1 (FrostedCard accent eyebrow has violet leading dot) and Tier 2 (rolls-own callout eyebrow has NO leading dot). This is an externally-visible distinction now that Spec 2 introduces a Tier 2 callout with an eyebrow.

### Manual visual verification (eyeball review — no Playwright infrastructure yet)

On `/daily?tab=devotional`:

- [ ] Reflection body card has visible violet accent border + violet glow + "Today's reflection" eyebrow rendered with a violet leading dot above the body paragraphs
- [ ] Quote card reads as quieter default tier — no violet border, just the standard frosted glass treatment lifting it off the canvas; the decorative left quote and italic blockquote render unchanged
- [ ] Reflection question callout (the "Something to think about" + question + "Journal about this question" CTA) visually matches the passage callout above it — both Tier 2 idiom with `border-l-4 border-l-primary/60` left stripe on `bg-white/[0.04]` muted background; the question's eyebrow does NOT have a leading dot (matches passage callout — neither has a dot, only Tier 1 accent has dot)
- [ ] "Meditate on this passage" reads as a quiet subtle pill — frosted glass, white text, hover lift via shadow
- [ ] "Journal about this question" reads as a quiet subtle pill (same chrome as "Meditate on this passage")
- [ ] "Pray about today's reading" is the gradient showstopper — visibly the most important action on the page; gradient pill, lg size, drop shadow, hover lift; the "Ready to pray about today's reading?" preceding text renders unchanged
- [ ] "Share today's devotional" + "Read aloud" buttons read as quiet subtle pills at the bottom; on mobile they stack vertically with `gap-3`; on tablet+ they sit side-by-side, centered
- [ ] All shared components (RelatedPlanCallout when shown, EchoCard when shown, SharePanel when opened) look unchanged from before
- [ ] Navigating away from the day (Previous-day / Next-day chevrons) and back: the date strip and devotional content render correctly; the new visual hierarchy renders correctly on yesterday's / day-before-yesterday's content (the migration is content-agnostic — every day's devotional uses the same surfaces)

Regression checks:

- [ ] `/daily?tab=pray` — still looks like 1B (textarea has violet glow, "Help Me Pray" gradient showstopper, generated prayer card accent, guided prayer cards default tier)
- [ ] `/daily?tab=journal` — still looks like 1B (toggle has violet active pill, textarea violet glow, "Save Entry" gradient, saved entries default tier)
- [ ] `/daily?tab=meditate` — still looks like 1A (6 meditation cards, multi-bloom canvas, tab bar)
- [ ] `/bible` — BibleLanding renders correctly (multi-bloom canvas, pilot card variants unchanged)
- [ ] DailyAmbientPillFAB still renders bottom-right on all 4 tabs and auto-hides when the AudioDrawer opens
- [ ] Multi-bloom BackgroundCanvas continues to render all five layers behind the Devotional tab content
