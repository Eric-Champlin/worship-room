# DailyHub Iteration: Make It Right

**Master Plan Reference:** Iteration on top of `_specs/dailyhub-1a-foundation-and-meditate.md`, `_specs/dailyhub-1b-pray-and-journal.md`, and `_specs/dailyhub-2-devotional.md`. Post-ship review surfaced 11 issues across the three shipped tabs (Devotional, Pray, Journal) plus two app-wide Button pattern decisions (gradient text color, ghost text color). This spec lands all of them in one coherent commit so DailyHub is locked in before Spec 3 begins shared-component rollout.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually.

---

## Affected Frontend Routes

- `/daily?tab=devotional` — primary surface for Changes 1, 2, 3, 4
- `/daily?tab=pray` — primary surface for Changes 5, 6, 7
- `/daily?tab=journal` — primary surface for Changes 10, 11, 12, 13
- `/grow/reading-plans` — regression surface for Change 4 (RelatedPlanCallout consumer, if rendered there)
- `/bible/john/3` and any active-plan branch of `/bible` — regression surface for Change 8 (`ResumeReadingCard` uses gradient Button)
- `/dashboard` — regression surface for Change 9 (`CelebrationOverlay` uses ghost Button)
- `/prayer-wall` — regression surface for Change 9 (`InlineComposer` and `QotdComposer` use ghost Button on Cancel)

---

## Overview

The DailyHub trilogy (1A, 1B, 2) shipped successfully and the page now reads close to its target visual energy. Post-ship review identified eleven specific issues — three vertical-rhythm tighten-ups (date→title on Devotional, textarea→submit on Pray and Journal), one constraint expansion (Pray character limit 500→1000 to accommodate the Devotional contextual prompt), one constraint relaxation (Journal manual resize), one structural change (saint quote pull-quote layout), one shared-component promotion (RelatedPlanCallout to FrostedCard accent with eyebrow), and two app-wide Button pattern decisions (gradient text → black, ghost text → white/80) that ripple to every consuming surface in the app.

The two Button pattern changes are intentional global decisions, not local fixes. They are the load-bearing decisions of this spec — every gradient Button across the entire app picks up black text, every ghost Button picks up white text. Pre-execution, the implementer enumerates consumers via grep and visually verifies each one for coherence.

This iteration is the final landing for DailyHub before Spec 3 begins rolling out shared components (EchoCard, VersePromptCard, DevotionalPreviewPanel) to other surfaces.

## User Story

As a **logged-out visitor or logged-in reader on the DailyHub**, I want each tab's vertical rhythm to read as a tight, deliberate composition without downstream voids; the saint quote on the devotional to read as a traditional pull-quote with text bracketed by oversized typographic marks; the "Go Deeper" callout to read as a weighted, intentional secondary CTA rather than an easy-to-miss footer; the Pray textarea to accept the full devotional contextual prompt without truncation; the Journal textarea to support manual resize for long-form writing; and every gradient and ghost Button across the app to render with the correct text color for its dark-theme surface — so that DailyHub locks in at production polish and the two Button pattern decisions ripple cleanly through the rest of the app.

## Requirements

### Functional Requirements

#### Critical concept: page rhythm tightening (NOT local gap-closing)

Three of the changes below (Changes 1, 6, 10) reduce vertical spacing between elements. The intent is **whole-page tightening**, not local gap-closing.

The wrong outcome is moving a single element up while leaving a void below it. If we reduce the top margin of the "Help Me Pray" button container from `mt-6` to `mt-3`, the button moves up 12px BUT everything below stays in place — a new 12px void opens below the button. The page hasn't tightened; we've created a downstream gap.

The right outcome is: **target element moves up AND every element below moves up by the same amount.** The page becomes proportionally tighter. No new voids appear.

For each spacing change, the implementer:

1. Reads the file and identifies how spacing is structured. Common patterns:

   **Pattern A — Spacing on the moving element's own padding/margin:**
   ```tsx
   <div className="mb-8">
     <textarea ... />
   </div>
   <div className="text-center"><Button>...</Button></div>
   <NextElement />
   ```
   Reducing the textarea wrapper's `mb-8` moves the button up; `NextElement` follows naturally because nothing anchors it to a fixed position. **This is the cleanest pattern.**

   **Pattern B — Spacing on individual element bottom margins:**
   ```tsx
   <textarea className="mb-8" />
   <Button className="mb-6">...</Button>
   <NextElement />
   ```
   Reducing only the textarea's `mb-8` moves the button up but leaves the gap between the button and `NextElement` unchanged. Reduce BOTH proportionally so the whole rhythm tightens.

   **Pattern C — Vertical rhythm via parent gap:**
   ```tsx
   <div className="space-y-8">
     <textarea />
     <Button>...</Button>
     <NextElement />
   </div>
   ```
   Reducing `space-y-8` to `space-y-4` tightens every gap inside the parent uniformly.

2. Applies the minimum-blast-radius reduction that achieves whole-page tightening. Eyeball judgment during execution — typical reduction is 33–50% of current spacing.

3. After landing, visually verifies:
   - The target gap is noticeably tighter
   - The next downstream element has moved up by the same amount
   - No new voids appear anywhere below

If the spacing structure is ambiguous (mixed patterns, unclear ownership of the gap), prefer the conservative move: reduce in lockstep across the moving element AND its immediate downstream neighbor.

---

#### Change 1 — Devotional: tighten date → title rhythm

Modify `frontend/src/components/daily/DevotionalTabContent.tsx`.

The devotional title is at line 201:

```tsx
<h3 className="pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl">
  {devotional.title}
</h3>
```

This is **Pattern A** — the title's own `pt-8 sm:pt-10` provides the gap from the date strip above (currently ~32px mobile / ~40px desktop).

Reduce to `pt-3 sm:pt-4` (~12–16px gap, target from the brief). The whole devotional section below the title — passage callout, reflection FrostedCard, saint quote, reflection question, Pray CTA, RelatedPlanCallout, EchoCard, share/read-aloud row — shifts up correspondingly because nothing is anchored to a fixed position. No void below the title; the whole page tightens.

**Eyeball target after landing:** date and title read as "this devotional, dated this day" — a unit, not two separated zones. Verify at desktop (1440px), tablet (768px), and mobile (375px).

---

#### Change 2 — Devotional: pull-quote layout for saint quote

Modify the saint quote card in `DevotionalTabContent.tsx` (currently at lines 269–278).

**Current:**
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

**Restructure to a pull-quote layout:**

```tsx
<FrostedCard variant="default" className="p-5 sm:p-6">
  <blockquote className="font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
    <span
      className="font-serif text-5xl leading-none text-white/25 align-top mr-1"
      aria-hidden="true"
    >
      &ldquo;
    </span>
    {devotional.quote.text}
    <span
      className="font-serif text-5xl leading-none text-white/25 align-bottom ml-1"
      aria-hidden="true"
    >
      &rdquo;
    </span>
  </blockquote>
  <p className="mt-3 text-sm text-white/80">
    &mdash; {devotional.quote.attribution}
  </p>
</FrostedCard>
```

**Visual intent:**

- Opening quote (`&ldquo;`) anchors to the upper-left, INLINE with the start of the quote text. The decorative giant character sits alongside the first line, not on a separate line above (current behavior — `mt-2` on the blockquote pushes the text below the standalone span).
- Closing quote (`&rdquo;`) anchors to the lower-right, INLINE with the end of the quote text.
- `align-top` on the opening span anchors it to the top of the line box; `align-bottom` on the closing span anchors it to the bottom.
- `mr-1` and `ml-1` provide minimal breathing room between the marks and the text.
- The quote reads as a traditional pull-quote — text bracketed by oversized typographic marks.
- Apply at every breakpoint (no breakpoint-conditional fallback).

**Tuning during eyeball review (implementer's judgment based on what they see):**

If the inline giant quote characters introduce line-height or wrapping issues (e.g., the giant character pushes the first line down, or the closing quote wraps awkwardly on long quotes at 375px mobile width), adjust by ONE of:

- Reduce character size from `text-5xl` to `text-4xl` (still decorative but less aggressive)
- Use `inline-block` with `vertical-align: top` and a small negative `mt-1` to pull the character up into the line box
- Reduce opacity from `text-white/25` to `text-white/20` (less visual weight, less crowding)

Implement the base structure first, then visually verify at desktop (1440px), tablet (768px), and mobile (375px). If all three read cleanly, ship as-is. If one or more breakpoints show issues, apply ONE tuning option and re-verify. Do NOT apply multiple tuning options simultaneously without re-verifying after each.

---

#### Change 3 — Devotional: "Pray about today's reading" stays gradient

NO LOCAL CODE CHANGE on this CTA in `DevotionalTabContent.tsx` (currently lines 310–321 — the `<Button variant="gradient" size="lg">`). The Button stays gradient (the page's emotional peak — used ONCE on this tab).

The text color update (`text-violet-900` → `text-black`) lands via Change 8's global Button gradient pattern change. After Change 8, this CTA automatically renders with black text on the violet gradient background.

**Acceptance:** after Change 8 lands, the "Pray about today's reading" Button has black text on the violet gradient.

---

#### Change 4 — Devotional: "Go Deeper" promoted to accent FrostedCard

Modify `frontend/src/components/devotional/RelatedPlanCallout.tsx`.

**Current implementation (rolls-own card):**

```tsx
<div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6">
  <p className="text-xs uppercase tracking-widest text-white/70">Go Deeper</p>
  <p className="mt-2 text-base font-semibold text-white">{planTitle}</p>
  <p className="mt-1 text-sm text-white/60">{planDuration}-day plan</p>
  <Link
    to={`/reading-plans/${planId}`}
    onClick={handleClick}
    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
  >
    {ctaText}
    <ChevronRight size={16} />
  </Link>
</div>
```

**Refactor to FrostedCard accent with eyebrow:**

```tsx
<FrostedCard
  variant="accent"
  eyebrow="Go Deeper"
  className="mt-8"
>
  <p className="text-base font-semibold text-white">{planTitle}</p>
  <p className="mt-1 text-sm text-white/60">{planDuration}-day plan</p>
  <Button variant="subtle" size="md" asChild>
    <Link to={`/reading-plans/${planId}`} onClick={handleClick} className="mt-4">
      {ctaText}
      <ChevronRight size={16} aria-hidden="true" />
    </Link>
  </Button>
</FrostedCard>
```

Specific changes:

- The wrapping `<div>` becomes `<FrostedCard variant="accent" eyebrow="Go Deeper" className="mt-8">`. The `mt-8` (margin between the Pray CTA and this callout on the devotional) is preserved as a `className` override.
- The handwritten `<p className="text-xs uppercase tracking-widest text-white/70">Go Deeper</p>` is REMOVED — `FrostedCard`'s `eyebrow` prop now renders it. Avoid double-rendering. The accent variant renders the eyebrow with the auto-violet treatment (violet leading dot + violet-300 uppercase tracked text) per `09-design-system.md` § "FrostedCard Tier System" — the dot is the visual signature of the most prominent tier.
- The plan title `<p>` loses its `mt-2` (the eyebrow block from FrostedCard already provides the gap below itself via its own `mb-4`).
- The plan duration `<p>` keeps its `mt-1`.
- The white pill `<Link>` migrates to `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link>`. The `mt-4` moves from the Link's className to the inner Link's className (so the spacing above the button is preserved).
- The `subtle` variant is glass chrome (`bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm`) — matches the accent FrostedCard tier visually instead of the high-contrast white pill, which now reads too loud against an accent surface.
- All four props (`planId`, `planTitle`, `planDuration`, `planStatus`) are preserved unchanged. The auth-modal `handleClick` and `useAuth` / `useAuthModal` integration are preserved unchanged. `ctaText` derivation (`'Start this plan'` for unstarted, `'Continue this plan'` otherwise) is preserved unchanged.

**Visual intent:** the "Go Deeper" callout reads as a deliberate, weighted invitation — accent treatment matches its function as the "next step after today's devotional." Promotes from "easy-to-miss footer" to "intentional secondary CTA." The accent tier's inner top-edge highlight (`before:bg-gradient-to-r ... via-white/[0.10]`) and the violet leading dot on the eyebrow give the card the editorial polish that the rolls-own version lacked.

**Ripple to other pages:** this change applies on every page that consumes RelatedPlanCallout. Verify visual coherence on:

- `/daily?tab=devotional` (primary surface)
- `/grow/reading-plans` (if RelatedPlanCallout appears there — verify by grepping for `RelatedPlanCallout` imports during execution)
- Any Bible chapter that surfaces a related reading plan

If a consumer passes additional className overrides (e.g., margin or width adjustments), they continue to work because `className` is forwarded to `FrostedCard`. The accent treatment is the new default; this spec does NOT introduce a per-instance prominence prop.

**Test file:** `frontend/src/components/devotional/__tests__/RelatedPlanCallout.test.tsx` exists. Read before updating to find any assertions about the wrapper `bg-white/[0.03]`, the standalone "Go Deeper" `<p>`, or the white pill. Update or remove those assertions to match the new structure.

---

#### Change 5 — Pray: increase character limit 500 → 1000

Modify `frontend/src/components/daily/PrayerInput.tsx` and (optionally) `frontend/src/constants/daily-experience.ts`.

**Reconnaissance finding:** `PRAYER_MAX_LENGTH` does NOT currently exist as a named constant. PrayerInput.tsx hardcodes the values directly:

```tsx
maxLength={500}                                          // line 137
<CharacterCount current={text.length} max={500} warningAt={400} dangerAt={480} ... />  // line 145
```

The implementer has two options. Pick one:

**Option A (preferred — matches Journal's pattern):** Introduce a named constant in `frontend/src/constants/daily-experience.ts` so the value isn't hardcoded in three places:

```ts
export const PRAYER_MAX_LENGTH = 1000
export const PRAYER_WARNING_THRESHOLD = 800   // 80% of max
export const PRAYER_DANGER_THRESHOLD = 960    // 96% of max
```

Then in `PrayerInput.tsx`:

```tsx
import { ..., PRAYER_MAX_LENGTH, PRAYER_WARNING_THRESHOLD, PRAYER_DANGER_THRESHOLD } from '@/constants/daily-experience'

// ...
maxLength={PRAYER_MAX_LENGTH}
// ...
<CharacterCount current={text.length} max={PRAYER_MAX_LENGTH} warningAt={PRAYER_WARNING_THRESHOLD} dangerAt={PRAYER_DANGER_THRESHOLD} id="pray-char-count" />
```

**Option B (minimum diff):** Update the three hardcoded values directly in `PrayerInput.tsx`:

```tsx
maxLength={1000}
// ...
<CharacterCount current={text.length} max={1000} warningAt={800} dangerAt={960} id="pray-char-count" />
```

**Prefer Option A.** The Journal feature uses this exact pattern (`JOURNAL_MAX_LENGTH`, `JOURNAL_WARNING_THRESHOLD`, `JOURNAL_DANGER_THRESHOLD` from `@/constants/content-limits`). Hoisting `PRAYER_MAX_LENGTH` to a constant matches that convention and lets the constant be referenced from tests, future Pray-feature work, and documentation. If `JOURNAL_MAX_LENGTH` is in `constants/content-limits` (it is — confirmed at line 16 of JournalInput.tsx), the implementer may either co-locate `PRAYER_MAX_LENGTH` there or place it in `daily-experience.ts` next to `PRAYER_DRAFT_KEY` and `DEFAULT_PRAYER_CHIPS` — either location is acceptable, but the constants must be exported and the import path updated accordingly.

**Document the new key in `11-local-storage-keys.md`?** No — this is a constant, not a localStorage key. No documentation update required for `11-local-storage-keys.md`. The new constant should appear in the constants section of `09-design-system.md` if Option A is chosen and a "Daily Hub Limits" line is desired, but this is optional polish.

**Cross-references:**

- `JOURNAL_MAX_LENGTH` (`@/constants/content-limits`) — DO NOT change. Journal has its own behavior and limit.
- Any test file asserting on the 500 limit (e.g., "rejects input longer than 500 chars") — update to 1000. Read the test files in `frontend/src/components/daily/__tests__/` first; do NOT fabricate test changes that aren't needed.

**Visual intent:** accommodates longer prayers, specifically the contextual prompt injected by "Pray about today's reading" from the Devotional tab. The 500-char limit was the bug discovered post-ship — the contextual prompt template `I'm reflecting on today's devotional about ${theme}. The passage is ${reference}: "${verseText}". Help me pray about what I've read.` regularly exceeds 500 chars when the devotional verse text is long.

---

#### Change 6 — Pray: tighten textarea → "Help Me Pray" rhythm

Modify `frontend/src/components/daily/PrayerInput.tsx`.

**Current spacing structure** (read top-down, lines 126–177):

- Textarea wrapper: `<div className="mb-4">` (line 126) containing the textarea + char count
- Draft saved indicator wrapper: `<div className="mb-2 flex h-4 items-center justify-end" aria-live="polite">` (line 149)
- `<CrisisBanner text={text} />` (line 158) — internal spacing
- Conditional nudge error: `<p ... className="mb-4 ...">` (line 161)
- Submit button wrapper: `<div className="text-center">` (line 167) containing the gradient Button

This is **mixed Pattern A + Pattern B**. The relevant gaps are: textarea wrapper `mb-4` + draft indicator `mb-2` + CrisisBanner spacing + nudge `mb-4` + the Button's own `min-h-[44px]`.

**Reduce by ~33–50%:**

- Textarea wrapper: `mb-4` → `mb-2` (or `mb-3` if `mb-2` reads too tight)
- Draft saved indicator: `mb-2` → `mb-1`
- Nudge error: `mb-4` → `mb-2`

CrisisBanner is a separate component with its own internal margins; do not modify it. If the Crisis banner is conditional and rarely visible in the production happy path, it does not contribute to the dominant baseline gap.

**Verify after landing:** the button moves up AND any downstream content (the `PrayerResponse` card that renders post-submit, the `GuidedPrayerSection` below it, the cross-tab CTAs) all moves up correspondingly. If `PrayerResponse` is mounted in a sibling component, its position relative to the Button is owned by the parent — verify by triggering submit and confirming no void appears below the Button.

**Eyeball target after landing:** the textarea and its submit button read as a unit — "compose your prayer, then submit" — not two separated zones with a gulf between.

---

#### Change 7 — Pray: "Help Me Pray" text → black (via Button gradient pattern change)

NO LOCAL CODE CHANGE in `PrayerInput.tsx`. Change 8 applies the gradient text color update globally; "Help Me Pray" picks it up automatically.

**Acceptance:** after Change 8 lands, the "Help Me Pray" Button has black text on the violet gradient.

---

#### Change 8 — Button gradient variant: text color → black (PATTERN CHANGE — APP-WIDE)

Modify `frontend/src/components/ui/Button.tsx`.

**Locate the gradient variant** in the cn() merge (line 49–50):

**Current:**
```ts
variant === 'gradient' &&
  'rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]',
```

**Change to:**
```ts
variant === 'gradient' &&
  'rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]',
```

Single-token change: `text-violet-900` → `text-black`.

**Visual intent:** black text on `from-violet-400 to-violet-300` gradient has stronger contrast than `violet-900` (which reads as near-black with a slight purple cast). True black reads cleaner, more deliberate, more designed.

**Pre-execution: enumerate consumers.** Run:
```bash
grep -rn 'variant="gradient"' frontend/src/
```

**Confirmed consumers (4 actual `Button` surfaces, plus 4 tests, plus 3 `SectionHeader` usages with the same `variant="gradient"` token but on a DIFFERENT component):**

| File | Surface | Notes |
|---|---|---|
| `components/bible/landing/ResumeReadingCard.tsx:32` | `/bible` Resume Reading "Continue reading" | Bible landing |
| `components/daily/DevotionalTabContent.tsx:311` | "Pray about today's reading" | Change 3 |
| `components/daily/JournalInput.tsx:346` | "Save Entry" | Change 13 |
| `components/daily/PrayerInput.tsx:169` | "Help Me Pray" | Change 7 |
| `components/ui/__tests__/Button.test.tsx:232,240,245,252,258,270` | Tests | Update lines 241 + 266 (`text-violet-900` → `text-black`) |
| `components/music/WorshipPlaylistsTab.tsx:30,43` | `<SectionHeader variant="gradient">` | DIFFERENT component — not affected. Skip. |
| `components/audio/AmbientBrowser.tsx:199` | `<SectionHeader variant="gradient">` | DIFFERENT component — not affected. Skip. |
| `components/ui/__tests__/SectionHeader.test.tsx` | Tests for SectionHeader | DIFFERENT component — not affected. Skip. |

**Tests to update:**

- `components/ui/__tests__/Button.test.tsx`:
  - Line 241: `expect(screen.getByRole('button').className).toContain('text-violet-900')` → `text-black`
  - Line 266: `expect(link.className).toContain('text-violet-900')` → `text-black`
  - Line 25: `expect(btn.className).toContain('text-primary')` is on the `light` variant test (NOT gradient). DO NOT change.

Read other test files before updating — do NOT fabricate test changes that aren't needed. If an assertion already passes after migration (e.g., a test asserting `bg-gradient-to-br` or other unchanged classes), leave it alone.

---

#### Change 9 — Button ghost variant: text color → white/80 (PATTERN CHANGE — APP-WIDE)

Modify `frontend/src/components/ui/Button.tsx`.

**Locate the ghost variant** in the cn() merge (line 57):

**Current:**
```ts
'text-primary hover:bg-primary/5': variant === 'ghost',
```

**Change to:**
```ts
'text-white/80 hover:text-white hover:bg-white/5': variant === 'ghost',
```

Three-token change: `text-primary` → `text-white/80`, `hover:bg-primary/5` → `hover:bg-white/5`, plus `hover:text-white` to brighten on hover.

**Visual intent:** ghost variant currently uses `text-primary` (purple), appropriate for light-themed surfaces but doesn't sit naturally on the dark-themed Daily Hub. Switching to white text makes ghost the "soft text-style action on dark backgrounds" idiom, matching the system's primary use case (Worship Room is dark-themed throughout).

**Pre-execution: enumerate consumers.** Run:
```bash
grep -rn 'variant="ghost"' frontend/src/
```

**Confirmed consumers (6 actual `Button` surfaces, all on dark surfaces):**

| File | Surface | Notes |
|---|---|---|
| `components/daily/SaveToPrayerListForm.tsx:110` | Cancel button | Daily Hub |
| `components/daily/JournalInput.tsx:219` | "Try a different prompt" | Change 11 |
| `components/dashboard/CelebrationOverlay.tsx:237` | Dashboard celebration | Dark surface |
| `components/prayer-wall/QotdComposer.tsx:100` | Cancel | Prayer Wall (dark) |
| `components/prayer-wall/InlineComposer.tsx:275` | Cancel | Prayer Wall (dark) |
| `pages/Health.tsx:90` | Back to home | Diagnostic page (dark) |
| `components/sharing/__tests__/ShareImageButton.test.tsx:179` | Test only | Update if it asserts `text-primary` |

**All 6 production surfaces are on dark-theme backgrounds.** No light-themed consumer was found in this enumeration. If the implementer discovers a light-themed surface during execution that relies on the purple-on-light contrast, **flag it for follow-up** — do NOT introduce a per-instance override in this spec; flag and defer.

**Tests to update:**

Read `components/ui/__tests__/Button.test.tsx` for any test asserting `text-primary` on the `ghost` variant specifically (line 25's `text-primary` is on `light`, not ghost — leave alone). Update only ghost-specific assertions. Read `components/sharing/__tests__/ShareImageButton.test.tsx:179` to check what it asserts on the ghost variant — update if it specifically asserts the text color.

---

#### Change 10 — Journal: tighten textarea → "Save Entry" rhythm

Modify `frontend/src/components/daily/JournalInput.tsx`.

**Current spacing structure** (read top-down, lines 271–354):

- Textarea wrapper: `<div className="relative mb-2">` (line 271) containing the textarea + absolutely-positioned CharacterCount + voice mic
- Draft saved indicator wrapper: `<div className="mb-4 flex h-5 items-center justify-end" aria-live="polite">` (line 331)
- `<CrisisBanner text={text} />` (line 341) — internal spacing
- Save button wrapper: `<div className="mb-8 text-center">` (line 344) containing the gradient Button

This is **Pattern B** — multiple per-element bottom margins. To tighten the whole rhythm, reduce in lockstep:

- Textarea wrapper: `mb-2` keep (already tight)
- Draft saved indicator: `mb-4` → `mb-2`
- Save button container: `mb-8` → `mb-4`

The `mb-8` on the Save button container is the dominant gap; reducing it by half is the key move. The draft indicator reduction is secondary tightening to keep the rhythm consistent.

**Match Pray's new rhythm** (Change 6) so the two tabs feel visually consistent. If Change 6 lands with different proportions, adjust here for parity.

**Eyeball target after landing:** textarea and Save Entry read as a unit — "compose your entry, then save." After saving, the entries list, "Write another", and "Done journaling" CTAs that render below the Save button should all shift up correspondingly. No void below the Save button at any state (empty / typing / showing-draft-saved / showing-crisis-banner).

---

#### Change 11 — Journal: "Try a different prompt" text → white (via Button ghost pattern change)

NO LOCAL CODE CHANGE in `JournalInput.tsx`. Change 9 applies the ghost text color update globally; "Try a different prompt" (line 219) picks it up automatically.

**Acceptance:** after Change 9 lands, the "Try a different prompt" Button renders with white/80 text that brightens to white on hover, on a `bg-white/5` hover background.

---

#### Change 12 — Journal: textarea manual resize

Modify `frontend/src/components/daily/JournalInput.tsx` (line 283).

**Current textarea className:**
```
min-h-[200px] w-full resize-none rounded-lg border border-violet-400/30 bg-white/[0.04] px-4 pb-10 pt-3 text-lg leading-relaxed text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
```

**Change to:**
```
min-h-[200px] max-h-[500px] w-full resize-y rounded-lg border border-violet-400/30 bg-white/[0.04] px-4 pb-10 pt-3 text-lg leading-relaxed text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
```

Two-token change: `resize-none` → `resize-y`, add `max-h-[500px]` after `min-h-[200px]`.

**Preserve the existing auto-expand `onInput` handler** (line 279, calls `autoExpand`) — it works WITH manual resize. The user can either let the textarea auto-grow as they type, or grab the resize handle and manually expand. Both work simultaneously.

**Implementer note — interaction with `pb-10` and absolutely-positioned bottom-anchored elements:**

The Journal textarea uses `pb-10` to reserve bottom space for the absolutely-positioned `<CharacterCount>` (line 287, `absolute bottom-2 left-3`) and voice mic Button (line 296, `absolute bottom-2 right-2`). The browser's native resize handle on `resize-y` typically renders in the bottom-right corner of the textarea — same area as the voice mic. Visually verify after landing that:

- The resize handle is grabbable and functional (drag to resize)
- The voice mic Button is still tappable (its `pointer-events` are not occluded by the resize handle)
- The CharacterCount remains visible

If the resize handle visually clashes with the voice mic at the bottom-right corner (it sits in the textarea's chrome, not the document; the conflict is visual not interactive), accept it — this is a documented browser-native behavior. If the conflict makes the voice mic untappable, flag it and revert to a different approach (e.g., move the voice mic to bottom-left or add a custom resize handle).

**Visual intent:** matches Pray's behavior (Pray already has `resize-y max-h-[500px]` from Spec U). Long-form journal entries benefit from a larger writing surface.

---

#### Change 13 — Journal: "Save Entry" text → black (via Button gradient pattern change)

NO LOCAL CODE CHANGE in `JournalInput.tsx`. Change 8 applies the gradient text color update globally; "Save Entry" (line 346) picks it up automatically.

**Acceptance:** after Change 8 lands, the "Save Entry" Button renders with black text on the violet gradient.

---

### Non-Functional Requirements

- **Performance:** No new layout effects, no JS animation. All changes are className edits, a JSX restructure on the saint quote, a constant introduction (Change 5 Option A), and a single CSS structural change to `RelatedPlanCallout`. Bundle size impact is negligible.
- **Accessibility:**
  - Change 2: the saint quote's giant inline quote characters are decorative (`aria-hidden="true"` is preserved on both spans). The blockquote remains semantic; screen readers still announce the quote text correctly without quote-mark interference.
  - Change 4: the FrostedCard accent `eyebrow` prop renders as a labelled context cue, not a heading — the plan title `<p>` (or upgrade to `<h4>` if appropriate) remains the semantic header. Tap targets on the new "Start this plan" subtle Button are 44×44px minimum (the `min-h-[44px]` in subtle variant guarantees this). Auth-modal integration (`useAuth`, `useAuthModal`, `handleClick`) is preserved unchanged; the gating message "Sign in to start this reading plan" is unchanged.
  - Change 5: `aria-describedby` and `aria-invalid` patterns on the textarea are preserved. CharacterCount keeps its `aria-live="polite"` zone-change announcer.
  - Change 8: black-on-violet-300/400 gradient passes WCAG AA at 4.5:1 (true black on `#A78BFA`/`#C4B5FD` is 7+:1). Better contrast than `text-violet-900` (which was `#4C1D95` on the same gradient — passes but with lower margin).
  - Change 9: `text-white/80` on `bg-white/5` (the hover state) on `bg-hero-bg` passes WCAG AA per `09-design-system.md` § "Text Opacity Standards" (interactive text minimum is 50%; 80% exceeds it comfortably). Hover state at `text-white` is 100% opacity.
  - Change 12: the resize handle is browser-native and follows the OS accessibility settings (high-contrast mode, etc.). Auto-expand `onInput` is preserved so users with keyboard-only input still get the same growth behavior.
- **Reduced motion:** No new animations introduced. The existing global reduced-motion safety net at `frontend/src/styles/animations.css` continues to apply. No additional handling needed.

## Auth Gating

This iteration introduces NO new auth gates and modifies NO existing gating behavior. Every interactive element preserves its existing auth posture:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| View Devotional tab | Read all content, click any CTA below | Same | N/A |
| Click "Pray about today's reading" (Change 3) | Switches tab to Pray with contextual prompt; submit triggers auth modal | Switches and submits | "Your draft is safe — we'll bring it back after" (existing) |
| Click "Journal about this question" (existing) | Switches tab to Journal with prompt; save triggers auth modal | Switches and saves | "Sign in to save your journal entries" (existing) |
| Click "Help Me Pray" submit (Change 6/7) | Auth modal | Generates prayer | "Sign in to generate a prayer" (existing) |
| Click "Save Entry" (Change 10/13) | Auth modal | Saves entry | "Sign in to save your journal entries" (existing) |
| Click "Try a different prompt" ghost button (Change 9/11) | Cycles prompt locally (no auth required) | Same | N/A |
| Click "Start this plan" / "Continue this plan" (Change 4) | Auth modal | Navigates to `/reading-plans/<planId>` | "Sign in to start this reading plan" (existing — preserved verbatim) |

The two Button pattern changes (Change 8 + 9) are visual-only; they do not alter any click behavior, route navigation, or auth gating logic.

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | All changes apply identically. Devotional title `pt-3` (Change 1). Saint quote pull-quote layout reads cleanly with `text-5xl` opening/closing marks (verify; if the closing quote wraps awkwardly on a long quote at 375px, apply ONE tuning option per Change 2). RelatedPlanCallout is single-column, FrostedCard accent renders with full padding `p-6`. Pray + Journal textarea→submit gaps tightened. Journal `resize-y` works (browser-native handle is touch-grabbable on iOS/Android). Gradient and ghost Button color updates apply at every breakpoint. |
| Tablet (640–1024px) | All changes apply identically. Devotional title `sm:pt-4` (Change 1). Saint quote retains pull-quote layout. RelatedPlanCallout widens with the container. |
| Desktop (> 1024px) | All changes apply identically. RelatedPlanCallout's accent top-edge highlight (`before:bg-gradient-to-r ... via-white/[0.10]`) renders crisply at the card's full width. |

No layout changes between breakpoints — the iteration only changes spacing, restructures the saint quote JSX, swaps `RelatedPlanCallout`'s wrapper, edits a single tagged template literal in `Button.tsx` for two variants, introduces an optional constant, and swaps two textarea tokens. No flex/grid reorganization, no breakpoint-conditional rendering, no media-query additions.

## AI Safety Considerations

N/A — This iteration is visual polish, constraint expansion (1000-char Pray limit), and component-pattern updates. No AI-generated content, no free-text user input changes that affect crisis detection (the existing `<CrisisBanner text={text} />` integration in PrayerInput and JournalInput is preserved unchanged), no new AI surfaces.

The Pray character limit change (Change 5) does not affect crisis keyword detection — `CrisisBanner` reads the entire `text` value regardless of length, so a 1000-char input is screened identically to a 500-char input.

## Auth & Persistence

- **Logged-out users:** No state changes vs. current. Drafts continue to auto-save to `wr_prayer_draft` and `wr_journal_draft` with the existing 1-second debounce (preserved unchanged). Devotional reads are not persisted (no `wr_devotional_reads` write for logged-out users — preserved unchanged).
- **Logged-in users:** No state changes vs. current. Same draft persistence keys, same `wr_devotional_reads` write on intersection-observer trigger.
- **localStorage usage:** No new keys. No keys removed. No keys' shapes changed. Change 5's `PRAYER_MAX_LENGTH` constant lives in source (`constants/`), not localStorage. **No update required to `11-local-storage-keys.md`.**

## Completion & Navigation

N/A — This is an iteration spec on existing Daily Hub tab content. The completion-tracking signals (`markDevotionalComplete()`, `markPrayComplete()`, `markJournalComplete()`) are preserved unchanged. The cross-feature CTAs (Devotional → Pray, Devotional → Journal, Devotional → Meditate via Spec Z) preserve their existing behavior — Change 5's character limit increase to 1000 fixes the original bug where the contextual prompt was silently truncated when arriving from the Devotional → Pray flow.

The DevotionalPreviewPanel mounting on Pray and Journal tabs (when `prayContext.from === 'devotional'`) is preserved unchanged. The contextual prompt textarea pre-fill in PrayerInput uses the existing `initialText` prop pathway and now succeeds without truncation.

## Design Notes

This iteration USES patterns already shipped — it does not redefine them:

- **FrostedCard variants** (`accent` / `default` / `subdued`) per `09-design-system.md` § "Round 3 Visual Patterns" and "FrostedCard Tier System". Change 4 promotes RelatedPlanCallout from a rolls-own card to FrostedCard accent.
- **FrostedCard `eyebrow` prop** (introduced in `_specs/frostedcard-iteration-1-make-it-pop.md`) — accent variant renders the eyebrow with violet leading dot + violet-300 uppercase tracked text. Change 4 uses this.
- **Button variants** (`gradient` / `subtle` / `ghost`) per `09-design-system.md`. Changes 8 and 9 modify two variants; Change 4 swaps a rolls-own white pill `<Link>` to `<Button variant="subtle" size="md" asChild>`.
- **Tier 2 scripture-callout idiom** (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04]`) per `09-design-system.md`. Used on the devotional passage and reflection question — preserved unchanged.
- **Violet textarea glow pattern** per `09-design-system.md` § "Textarea Glow Pattern". Preserved unchanged on both PrayerInput and JournalInput textareas.

This iteration MODIFIES patterns app-wide (intentional global decisions):

- **Gradient Button text color:** `text-violet-900` → `text-black` (Change 8). Documented in `09-design-system.md` § "White Pill CTA Patterns" the gradient variant note will need a one-line update from "text-violet-900 on the violet gradient" to "text-black on the violet gradient" — defer that doc update to follow-up if not done in this spec's execution.
- **Ghost Button text color:** `text-primary` → `text-white/80` (Change 9). The `09-design-system.md` does not currently document the ghost variant in detail — no pre-existing claim conflicts with this change. If a sentence is added during execution, place it next to the gradient note.

This iteration INTRODUCES one new visual pattern:

- **Pull-quote layout for the Devotional saint quote** (Change 2). Oversized opening quote anchors inline upper-left, oversized closing quote anchors inline lower-right, text wraps between. Apply at every breakpoint with optional tuning (text-5xl → text-4xl, opacity 25% → 20%, or inline-block + negative mt-1) if line-height or wrapping issues surface during eyeball verification. **Mark this as a NEW pattern** so `/plan` knows to mark derived layout values as `[UNVERIFIED]` until visual verification at all three breakpoints confirms the layout.

## Out of Scope

- **Migrating EchoCard, VersePromptCard, DevotionalPreviewPanel** to FrostedCard — deferred to Spec 3 (shared-component rollout).
- **Migrating any other shared component** beyond RelatedPlanCallout — Spec 3.
- **Touching the Meditate tab** — no issues identified post-ship; the multi-bloom canvas, meditation cards, and verse-aware Spec Z flow remain unchanged.
- **DailyHub page shell, hero greeting, tab bar, multi-bloom canvas, SongPickSection** — all preserved unchanged.
- **Spec Z routing migration** — deferred per the brief.
- **Adding new visual variants or tokens** — no new Button variants, no new FrostedCard variants, no new Tailwind tokens, no new animation tokens. Use what `09-design-system.md` already documents.
- **Per-instance overrides for ghost or gradient Button text colors on light-themed surfaces** — none expected; no light-themed consumer was found in the enumeration. If discovered during execution, flag and defer to a follow-up spec.
- **Adjusting the Journal auto-expand `onInput` handler** — preserved verbatim alongside the new manual resize (Change 12).
- **Adjusting the Pray textarea structure** — Pray already has `resize-y max-h-[500px]` from Spec U; only the character limit and rhythm change (Changes 5 + 6).
- **Updating `09-design-system.md` Button variant documentation** to reflect the new gradient and ghost text colors — optional polish during execution; if skipped, flag as a documentation TODO.
- **Branch hygiene, commits, pushes, or any git operations** — the user manages all git operations manually.

## Acceptance Criteria

### Devotional tab

- [ ] **Change 1:** Date strip and devotional title read as a tight unit (~12–16px gap on mobile, slightly more on desktop). Below the title, the entire devotional section (passage callout, reflection FrostedCard, saint quote, reflection question, Pray CTA, RelatedPlanCallout, EchoCard, share/read-aloud row) has shifted up by the same amount as the title. No void below the title at any breakpoint (375px / 768px / 1440px). Verify by comparing against a pre-change screenshot.
- [ ] **Change 2:** Saint quote renders as a pull-quote — the opening `&ldquo;` is INLINE with the start of the first line of quote text (not on a separate line above), the closing `&rdquo;` is INLINE with the end of the last line. Both spans use `font-serif text-5xl leading-none text-white/25` (or one of the documented tuning fallbacks if visual issues required adjustment). Both spans have `aria-hidden="true"`. Attribution `<p>` renders below with `mt-3 text-sm text-white/80`. Renders cleanly at 1440px, 768px, and 375px.
- [ ] **Change 3:** "Pray about today's reading" stays gradient (no local code change in `DevotionalTabContent.tsx` lines 310–321) and after Change 8 has black text on the violet gradient.
- [ ] **Change 4:** RelatedPlanCallout renders as `<FrostedCard variant="accent" eyebrow="Go Deeper" className="mt-8">`. The eyebrow shows the violet leading dot (`bg-violet-400`) + violet-300 uppercase tracked text. The plan title `<p>`, plan duration `<p>`, and CTA Button render inside. The CTA is `<Button variant="subtle" size="md" asChild>` wrapping a `<Link to="/reading-plans/<planId>" onClick={handleClick}>` — glass chrome, white text, `min-h-[44px]`. The standalone "Go Deeper" `<p>` and the rolls-own white pill `<Link>` from the prior implementation are removed.
- [ ] **Change 4 (regression):** auth-modal trigger when clicked while logged out — message is "Sign in to start this reading plan" (unchanged). All four props (`planId`, `planTitle`, `planDuration`, `planStatus`) work identically. `ctaText` derivation (`'Start this plan'` for unstarted, `'Continue this plan'` otherwise) is unchanged.

### Pray tab

- [ ] **Change 5 — Option A (preferred):** `PRAYER_MAX_LENGTH` constant exists (value `1000`) in `constants/daily-experience.ts` or `constants/content-limits.ts`. `PRAYER_WARNING_THRESHOLD` (value `800`) and `PRAYER_DANGER_THRESHOLD` (value `960`) also exported. PrayerInput.tsx imports and uses them. **Or — Change 5 — Option B:** the three hardcoded values in PrayerInput.tsx are updated directly to 1000 / 800 / 960.
- [ ] **Change 5 (cross-cutting):** Pray textarea accepts up to 1000 characters. CharacterCount warningAt threshold scales (warning at 800, danger at 960). `JOURNAL_MAX_LENGTH` constant is unchanged.
- [ ] **Change 6:** Spacing between the textarea and "Help Me Pray" Button is tightened by ~33–50% (textarea wrapper `mb-4`→`mb-2` or `mb-3`, draft indicator `mb-2`→`mb-1`, nudge error `mb-4`→`mb-2`). After Help Me Pray triggers, the rendered `PrayerResponse` card and `GuidedPrayerSection` below it have moved up correspondingly. No void below the Button at any state.
- [ ] **Change 7:** "Help Me Pray" Button has black text on violet gradient (via Change 8).
- [ ] **End-to-end (the original bug fix):** From Devotional tab, click "Pray about today's reading". Confirm the contextual prompt (`I'm reflecting on today's devotional about ${theme}. The passage is ${reference}: "${verseText}". Help me pray about what I've read.`) loads in the Pray textarea WITHOUT exceeding the 1000-character limit and WITHOUT being silently truncated. Manual test: a long-passage devotional (e.g., one with verses summing to >300 chars) should produce a contextual prompt around 600–800 characters that fits comfortably.

### Journal tab

- [ ] **Change 10:** Spacing between the Journal textarea and "Save Entry" Button is tightened (draft indicator `mb-4`→`mb-2`, Save button container `mb-8`→`mb-4`). The post-save entries list, "Write another", "Done journaling" CTAs all move up correspondingly. No void below the Save button at any state. Tighter rhythm matches Pray's (Change 6) for cross-tab visual consistency.
- [ ] **Change 11:** "Try a different prompt" ghost Button renders white/80 text that brightens to white on hover, on `bg-white/5` hover background (via Change 9).
- [ ] **Change 12:** Journal textarea has `min-h-[200px] max-h-[500px]` and `resize-y`. Manual resize handle works (drag the bottom-right corner to expand up to 500px). Auto-expand `onInput` handler still functions when typing. Voice mic Button at `bottom-2 right-2` is still tappable. CharacterCount at `bottom-2 left-3` is still visible. `pb-10` is preserved.
- [ ] **Change 13:** "Save Entry" Button has black text on violet gradient (via Change 8).

### Button component (app-wide)

- [ ] **Change 8:** `Button.tsx` gradient variant uses `text-black` (single token replacement of `text-violet-900` in line 50's tagged template).
- [ ] **Change 9:** `Button.tsx` ghost variant uses `text-white/80 hover:text-white hover:bg-white/5` (three-token replacement of `text-primary hover:bg-primary/5` in line 57's cn() entry).
- [ ] **Change 8 (test updates):** `components/ui/__tests__/Button.test.tsx` lines 241 and 266 assertions updated from `text-violet-900` to `text-black`. Line 25 (`text-primary` on `light` variant) unchanged.
- [ ] **Change 9 (test updates):** Any ghost-variant test assertions updated from `text-primary` to `text-white/80`. `components/sharing/__tests__/ShareImageButton.test.tsx:179` reviewed — updated only if it asserts the ghost text color specifically.
- [ ] **Change 4 (test updates):** `components/devotional/__tests__/RelatedPlanCallout.test.tsx` reviewed — assertions about the rolls-own wrapper (`bg-white/[0.03]`, `border-white/[0.08]`), the standalone "Go Deeper" `<p>`, and the white pill `<Link>` updated or removed to match the FrostedCard accent + eyebrow + subtle Button structure.

### Build and test gates

- [ ] `pnpm typecheck` passes (no TypeScript errors, no signature drift, no unused imports).
- [ ] `pnpm test` passes — all updated tests reflect the new values; no NEW failing test files; total fail count is at the documented regression baseline (8,811 pass / 11 pre-existing fail per `CLAUDE.md`) or better.
- [ ] `pnpm build` succeeds without warnings.
- [ ] `pnpm lint` passes.

### Manual eyeball verification

- [ ] **`/daily?tab=devotional`:** Date and title tight, no void. Pull-quote layout works at desktop (1440px), tablet (768px), and mobile (375px). "Pray about today's reading" gradient with black text. "Go Deeper" accent FrostedCard with eyebrow + violet leading dot + violet-300 tracked text. "Start this plan" subtle Button with glass chrome and white text.
- [ ] **`/daily?tab=pray`:** Tighter rhythm between textarea and "Help Me Pray"; no void below button. Black text on "Help Me Pray". Type 700+ chars and confirm CharacterCount allows up to 1000 (warning at 800, danger at 960). Trigger "Pray about today's reading" from Devotional and confirm the contextual prompt loads in full WITHOUT truncation (the original bug).
- [ ] **`/daily?tab=journal`:** Tighter rhythm between textarea and "Save Entry"; no void below button. White text on "Try a different prompt" (hovers to brighter white). Manual resize handle works on textarea (can drag to expand up to 500px). Auto-expand still works when typing. Voice mic still tappable. Black text on "Save Entry".

### Regression checks (other surfaces affected by Changes 4, 8, 9)

- [ ] **`/daily?tab=meditate`:** Unchanged. Multi-bloom canvas, meditation cards, verse-aware Spec Z banner all render identically. Any gradient or ghost Button on this tab (none expected — verify) renders with the new colors.
- [ ] **`/bible/<book>/<chapter>`:** ResumeReadingCard's gradient "Continue reading" Button renders with black text. Other Bible reader chrome unchanged.
- [ ] **`/bible`:** BibleLanding renders unchanged. RelatedPlanCallout — if it appears on a Bible chapter or BibleLanding-adjacent surface — shows the new accent treatment with eyebrow + violet dot.
- [ ] **`/grow/reading-plans`:** If RelatedPlanCallout is consumed here, verify the new accent treatment renders and is visually coherent with the rest of the Grow page.
- [ ] **`/dashboard`:** CelebrationOverlay's ghost Button renders white text. Other dashboard widgets unchanged.
- [ ] **`/prayer-wall`:** InlineComposer and QotdComposer Cancel buttons (ghost variant) render white text. Other Prayer Wall surfaces unchanged.
- [ ] **`/`** (homepage), **`/register`**, **`/login`**, **`/insights`**, **`/friends`**, **`/settings`**, **`/music`**, **`/local-support/*`**: visually scan for any gradient or ghost Button consumers (`SectionHeader variant="gradient"` does NOT count — it's a different component). Any consumer found shows the new colors and is visually coherent. If anything looks off (e.g., a gradient Button on a light-themed surface where black text is now wrong, or a ghost Button on a light surface where white text disappears), flag for follow-up — do NOT fix in this spec.
