# /ask Page Redesign — v2 (CONSOLIDATED)

**This spec replaces `_specs/ask-page-redesign.md` (v1) entirely.** Do not read both. Move v1 to `_specs/_archive/` before execution.

**Branch:** `claude/feature/ask-page-redesign` — cut fresh from `main` after the Register Round 2 branch is merged.

**Source of truth for every className before/after in this document:** the playwright-recon capture at `_plans/recon/ask-v2.md` and `frontend/playwright-screenshots/ask-recon/raw-capture.json`. Every "current" className quoted below is the literal rendered className at the time of recon, not a guess.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC MUST stay on branch `claude/feature/ask-page-redesign` throughout the entire execution.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT reset. Do NOT run `git checkout`, `git commit`, `git push`, or any other git subcommand. The user handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current` via `bash`.** If the result is `main`, ask the user to cut the branch, then stop. If the result is any branch name other than `claude/feature/ask-page-redesign`, STOP and surface to the user. Do not proceed until the user confirms the branch.
3. **No new files.** Every change is an edit to a file already in the target list below. Do not create new components, hooks, mock files, or constants.
4. **Preserve the conversational paradigm.** `/ask` is NOT a content-grid marketing page like Register. It is a conversation — question → answer → follow-up. Do NOT refactor to a card-grid layout, do NOT change the linear flow, do NOT remove the right-aligned user bubble. Modernize the visuals inside the existing flow.
5. **Do not touch:** the AI response-generation logic (all mock), the mock data at `frontend/src/mocks/ask-mock-data.ts`, the topic-chip/popular-topics content in `frontend/src/constants/ask.ts`, the AI disclaimer copy, or any AI-safety guardrails.
6. **Do not "improve" scope.** If a pattern elsewhere in the codebase also uses the cyan token or a deprecated opacity, do NOT fix it in this spec. Out-of-scope cyan consumers are documented below.
7. **When this spec says "replace className X with className Y" — do it verbatim.** Do not reorder the Tailwind utilities. Do not drop utilities you think are redundant. Copy the replacement classNames from this spec character-for-character.

---

## Why v2 exists

v1 was specced from code reads alone and was ~70% accurate. v2 is based on a full playwright-recon at 5 viewports with computed styles, contrast ratios, and measurement data. v2 corrects or adds:

- **Two real WCAG AA contrast failures** — the verse-reference link (`text-primary-lt` at 4.05:1 on verse cards, needs 4.5:1) and the ConversionPrompt "Keep exploring" dismiss link (`text-primary-lt` at 4.15:1 on the card). Both are blocker-grade a11y fixes, not style preferences.
- **Correct counts:** 6 topic chips and 5 popular topics. v1 conflated them.
- **Mobile chip layout is 6 stacked rows at 375px** (not wrap-to-two-per-row). Needs explicit 2-column grid fix.
- **Popular Topics heading sits exactly at the fold at 1440 × 900** (y=900px). v1 said "Popular Topics above the fold." Recon says no. Spec specifies concrete vertical-rhythm compression to pull it above.
- **VerseCardActions has 9 buttons per response** (3 per verse × 3 verses) all using `text-xs text-white/60 hover:text-primary` — a separate anti-pattern from the 4 response-level action buttons. v1 said "use judgment." v2 specifies the exact fix.
- **`animate-fade-in-up` already fires on response entrance.** v1 said "add entrance animation." Wrong. v2 preserves the existing animation and specifies per-child staggering separately.
- **Layout wrapper decision:** `/ask` keeps using `<Layout>` (with `transparentNav`). Register is the only page using a direct-shell pattern, and v2 explicitly does NOT adopt that — to minimize surface area and risk.
- **`HeadingDivider`** under the H1 is currently rendered (from PageHero's `showDivider` prop). v2 removes it.
- **Two canonical CTA variants exist** — Daily Hub (`text-hero-bg` + 0.20 white shadow) and Register (`text-primary` + 0.15 white shadow + animate-shine). v2 picks explicitly for each use case.

---

## Files touched

| File | Change type | Approximate line delta |
|---|---|---|
| `frontend/src/pages/AskPage.tsx` | Major: shell restructure, hero refactor, textarea, submit, chip grid, loading state, import cleanup | +40 / −65 |
| `frontend/src/components/ask/AskResponseDisplay.tsx` | Major: every opacity swap, verse cards, tier 2 callout, 4 action buttons, feedback row | +50 / −40 |
| `frontend/src/components/ask/UserQuestionBubble.tsx` | Minor: bubble className swap, add rounded-tr-sm asymmetry | +2 / −2 |
| `frontend/src/components/ask/PopularTopicsSection.tsx` | Moderate: FrostedCard wrapping, opacity swap, hover lift, scroll-reveal, grid | +18 / −12 |
| `frontend/src/components/ask/ConversionPrompt.tsx` | Moderate: FrostedCard wrap, white-pill CTA, shine, body text, dismiss link (WCAG fix) | +15 / −15 |
| `frontend/src/components/ask/SaveConversationButton.tsx` | Minor: white-pill CTA swap | +6 / −4 |
| `frontend/src/components/ask/DigDeeperSection.tsx` | Minor: chip className standardization + border | +6 / −4 |
| `frontend/src/components/ask/VerseCardActions.tsx` | Moderate: 3 inline buttons × 3 verses = 9 buttons, opacity + color swap, note textarea white-glow, save-note button → white pill | +20 / −15 |
| `frontend/src/pages/__tests__/AskPage.test.tsx` | Update className assertions | varies |
| `frontend/src/components/ask/__tests__/*.test.tsx` (if present) | Update assertions that check old classNames | varies |

**No new files. No deletions.** Imports of `BackgroundSquiggle`, `SQUIGGLE_MASK_STYLE`, and `PageHero` are removed from `AskPage.tsx` but the components themselves remain in the codebase (homepage still uses BackgroundSquiggle; other pages still use PageHero).

---

## Canonical visual vocabulary

All values below are the exact, literal tokens to use. Do not substitute equivalents.

### Page shell

- **Wrapper:** `<Layout transparentNav>` — inherited pattern from most pages. `transparentNav` makes the Navbar render in transparent overlay mode and makes Layout's `<main>` element `display: contents` so the child tree renders flat inside Layout's flex container.
- **Atmosphere:** Immediately inside Layout's children, wrap everything in `<GlowBackground variant="fullPage">` — this is the variant added by Register Round 2 (5 orbs distributed across the scroll length at y=5%, 30%, 55%, 75%, 92%). Already in `@/components/homepage/GlowBackground.tsx`. No new variant needed.
- **Page root background color:** provided by Layout as `bg-hero-bg` (#08051A). Do NOT set `bg-dashboard-dark` anywhere in AskPage.
- **SiteFooter:** provided by Layout, renders AFTER the GlowBackground wrapper closes. No direct import needed.

### Hero H1

- Text: `"Ask God's Word"` — NO `scriptWord`, NO cursive italic accent on "Word".
- className (exact, verbatim):
  ```
  pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl animate-gradient-shift
  ```
- Inline style: `GRADIENT_TEXT_STYLE` from `@/constants/gradients`.
- Do NOT render `<HeadingDivider>` under it.
- `animate-gradient-shift` is already defined in CSS from Register Round 2 — 12-second gradient-position loop, respects `prefers-reduced-motion`.

### Hero subtitle

- Text: `"Bring your questions. Find wisdom in Scripture."` (unchanged)
- className (exact, verbatim):
  ```
  mx-auto mt-4 max-w-xl text-base text-white sm:text-lg
  ```
- NO `font-serif`. NO `italic`. NO `text-white/60`. Full `text-white`, sans-serif.

### Primary submit CTA — Daily Hub variant

Used for: `"Find Answers"` submit button on `AskPage.tsx`.

Pulled from `PrayerInput.tsx` line 170 ("Help Me Pray" button).

className (exact, verbatim):
```
inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]
```

Text color is `text-hero-bg` (nearly-black `#08051A`) on white. High contrast.

### Conversion-critical CTA — Register variant with shine

Used for: `"Create Your Account"` in `ConversionPrompt.tsx` (replaces current `"Get Started — It's Free"`).

Pulled from `RegisterPage.tsx` line 166 hero CTA.

className (exact, verbatim):
```
animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none
```

Text color is `text-primary` (purple) on white. Adds `animate-shine` for the 6s-cycle shine sweep. `animate-shine` is already defined in CSS from Register Round 2.

### Inline white-pill CTA — Pattern 1

Used for: the 4 action buttons in `AskResponseDisplay.tsx` (Ask another / Journal about this / Pray about this / Share), and the `"Save this conversation"` button in `SaveConversationButton.tsx`.

className (exact, verbatim):
```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

Note the icon stays at its existing size (h-4 w-4) and inherits the parent's `text-primary` color.

### Topic chip — standardized

Used for: the 6 chips under the textarea in `AskPage.tsx`, and the follow-up chips in `DigDeeperSection.tsx`.

className (exact, verbatim):
```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

DigDeeperSection chips additionally wrap a `<MessageCircle />` icon at `h-4 w-4 shrink-0`. Icon inherits `text-white`.

### Textarea — canonical white-glow

Used for: the main `#ask-input` textarea, and the note-editor textarea inside `VerseCardActions.tsx`.

Pulled from `PrayerInput.tsx` line 137.

className (exact, verbatim — for `#ask-input`, which does not need `resize-y` since `autoExpand` handles height):
```
w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
```

For the VerseCardActions note textarea (smaller, fixed rows=3), use the same pattern but narrower shadow:
```
w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/50 shadow-[0_0_16px_2px_rgba(255,255,255,0.40),0_0_32px_6px_rgba(255,255,255,0.24)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
```

### FrostedCard

Available as `<FrostedCard>` from `@/components/homepage/FrostedCard`. Supports `as="button"` + `onClick` + `tabIndex` + `role` + `onKeyDown` + `className`. Use `as="button"` on Popular Topic cards so they're semantic buttons that inherit the hover-lift.

### Tier 2 scripture callout

Used for: the encouragement block in `AskResponseDisplay.tsx`.

className (exact, verbatim):
```
mt-8 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3
```

Inner paragraph:
```
text-base leading-relaxed text-white
```

### Body copy opacity rules (Round 3 standard)

- `text-white` — primary reading copy (answer paragraphs, verse body, encouragement, prayer body, question text in the user bubble)
- `text-white/80` — secondary prose (verse explanation, conversion-prompt body, any supporting paragraph)
- `text-white/60` — captions, timestamps, the "Was this helpful?" label, the AI disclaimer, draft-saved indicators
- **Never `text-white/70`, `text-white/50`, `text-white/40` on body/link text** in this spec's scope. Those tokens exist in the codebase but are forbidden in `/ask`.

### Scroll-reveal

Use `useScrollReveal` + `staggerDelay` from `@/hooks/useScrollReveal`. Apply to:
- Topic chip grid (stagger 40ms per chip index)
- Popular Topic card grid (stagger 60ms per card index)
- Verse cards within the response (stagger 80ms per verse index)
- 4 response action buttons (stagger 50ms per button index)

Do NOT apply `useScrollReveal` to: hero H1, hero subtitle, textarea, submit button, feedback row, AI disclaimer, ConversionPrompt, SaveConversationButton. These are either always-visible on first paint or have their own animation.

### Existing animations to PRESERVE (do not duplicate)

- **`animate-fade-in-up`** on `AskResponseDisplay`'s root div — already fires when response mounts. Keep exactly as-is.
- **`animate-fade-in`** on `ConversionPrompt`'s outer card — keep, but change to `motion-safe:animate-fade-in` (motion-safe prefix is the modern, cleaner pattern — Tailwind drops the class under reduced motion without needing manual JS checks).
- **`motion-safe:animate-bounce motion-reduce:animate-none`** on the 3 loading dots — keep.

### New animations to ADD

- **`animate-gradient-shift`** on hero H1 — 12s gradient-position loop. Already defined in CSS from Register Round 2.
- **`animate-shine`** on the ConversionPrompt CTA (the conversion-critical button). Already defined in CSS from Register Round 2. **Do NOT add `animate-shine` to the main `"Find Answers"` submit button** — that button uses the Daily Hub variant, which doesn't ship with shine. Consistency with Prayer/Journal tabs wins over extra polish on /ask specifically.

---

## Hero vertical rhythm (compression plan)

**Recon measurements at 1440 × 900:**
- Current H1 top: `y=286`
- Current H1 bottom: `y=356`
- Current subtitle top: `y=396` (gap of 40px to H1 bottom — OK)
- Current subtitle bottom: `y=424`
- Current textarea top: `y=528` (gap of 104px to subtitle bottom — EXCESSIVE)
- Current "Find Answers" Y: `y=820`
- Current Popular Topics heading Y: `y=900` (exactly at viewport bottom at 1440×900 — unusable)

**Target at 1440 × 900:**
- Popular Topics heading Y ≤ 820px (at least one row of cards visible above fold at 900px viewport height)

**Changes needed to hit that target (approximate 100px compression):**

| Measure | Current | Target | How |
|---|---|---|---|
| Hero section top padding | `pt-32 sm:pt-40` (128px / 160px) | `pt-24 sm:pt-28` (96px / 112px) | Shave ~32/48px |
| Subtitle margin-top | `mt-4` (16px) | `mt-4` (unchanged) | Unchanged |
| Hero section bottom padding | `pb-8 sm:pb-12` (32px / 48px) | `pb-6 sm:pb-8` (24px / 32px) | Shave ~8/16px |
| Gap: subtitle bottom → textarea top | 104px | ~40px | Drop the current `<main className="py-10 sm:py-14">` top padding from `py-10` to `pt-2 pb-10` |

**Final hero section className:**
```
px-4 pt-24 pb-6 text-center sm:px-6 sm:pt-28 sm:pb-8
```

**Final input container (`<section>` replacing current `<main>`) className:**
```
mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14
```

Note: the `<main>` element moves to Layout (already provided by `transparentNav && !hero` → `contents` mode). What was previously a `<main>` in AskPage becomes a plain `<section>`.

---

## FILE-BY-FILE CHANGES

### 1. `frontend/src/pages/AskPage.tsx` (major)

#### 1a. Import changes

**Remove these imports:**
```ts
import { Layout } from '@/components/Layout'  // KEEP — still used, but see below
import { PageHero } from '@/components/PageHero'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
```

Wait — re-read: KEEP `Layout`. REMOVE `PageHero`, `BackgroundSquiggle`, `SQUIGGLE_MASK_STYLE`.

**Add these imports:**
```ts
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import type { RefObject } from 'react'
```

#### 1b. Outer shell structure

**REPLACE** the current outer JSX (from the opening `<Layout>` down to the closing `</Layout>`) with this structure. Preserve every functional hook, every callback, every ref, every state variable — only the JSX shell changes.

Current (approximate shape):
```tsx
return (
  <Layout>
    <SEO {...ASK_METADATA} />
    <div className="min-h-screen bg-dashboard-dark">
      <PageHero title="Ask God's Word" scriptWord="Word" showDivider>
        <p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
          Bring your questions. Find wisdom in Scripture.
        </p>
      </PageHero>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative">
          <div style={SQUIGGLE_MASK_STYLE}>
            <BackgroundSquiggle />
          </div>
          <div className="relative">
            {/* input / response / conversion / save */}
          </div>
        </div>
      </main>
    </div>
  </Layout>
)
```

New:
```tsx
const chipsReveal = useScrollReveal({ threshold: 0.1 })
const topicsReveal = useScrollReveal({ threshold: 0.1 })

return (
  <Layout transparentNav>
    <SEO {...ASK_METADATA} />
    <GlowBackground variant="fullPage">
      <section
        aria-labelledby="ask-hero-heading"
        className="px-4 pt-24 pb-6 text-center sm:px-6 sm:pt-28 sm:pb-8"
      >
        <h1
          id="ask-hero-heading"
          className="pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl animate-gradient-shift"
          style={GRADIENT_TEXT_STYLE}
        >
          Ask God's Word
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-white sm:text-lg">
          Bring your questions. Find wisdom in Scripture.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
        {/* Input view (when showInput is true) */}
        {/* Conversation + loading + conversion prompt + save button */}
      </section>
    </GlowBackground>
  </Layout>
)
```

The `chipsReveal` and `topicsReveal` hooks are used further down in the input view. Declare them in the component body, near the other hooks.

**Remove:** the offline early-return's layout is untouched (it delegates to `<OfflineNotice>`, which is a shared component).

**Remove:** the `<div style={SQUIGGLE_MASK_STYLE}><BackgroundSquiggle /></div>` block entirely. Also remove the outer `<div className="relative">` wrapper and the inner `<div className="relative">` wrapper — they were only needed to layer the squiggle. The input/conversation content now sits directly inside the `<section>`.

#### 1c. Textarea (line ~258 in current)

**Before:**
```
w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_12px_2px_rgba(0,212,255,0.35),0_0_27px_5px_rgba(139,92,246,0.26)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50
```

**After (exact, verbatim):**
```
w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
```

Diff summary: border cyan → white/30, shadow cyan+violet → white dual-layer, focus ring primary → white. Adds `transition-[border-color,box-shadow]` so the focus-in is smooth.

The `autoExpand` function and all other behavior unchanged.

#### 1d. Crisis banner

Stays as-is. `<CrisisBanner text={text} />` renders right after the textarea. Pre-existing a11y behavior — do not touch.

#### 1e. Topic chip grid (6 chips)

**Before (wrapper):**
```
mb-6 flex flex-wrap justify-center gap-2
```

**After (wrapper):**
```tsx
<div
  ref={chipsReveal.ref as RefObject<HTMLDivElement>}
  className={cn(
    'mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center',
  )}
>
  {ASK_TOPIC_CHIPS.map((chip, index) => (
    <button
      key={chip}
      type="button"
      onClick={() => handleChipClick(chip)}
      className={cn(
        'scroll-reveal',
        chipsReveal.isVisible && 'is-visible',
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]',
      )}
      style={staggerDelay(index, 40)}
    >
      {chip}
    </button>
  ))}
</div>
```

**Mobile layout fix:** `grid-cols-2` means at <640px the 6 chips render as a 3×2 grid (3 rows × 2 columns) — fits on one screen, matches the chip breadth. At ≥640px, `sm:flex sm:flex-wrap sm:justify-center` takes over and chips wrap naturally.

**Per-chip className before:**
```
min-h-[44px] rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-[colors,transform] duration-fast active:scale-[0.98]
```

**Per-chip className after (verbatim):**
```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

Diff: `text-white/70` → `text-white`, `border-white/15` → `border-white/20`, `hover:text-white` removed (already `text-white`), adds `hover:-translate-y-0.5` for hover lift, adds `inline-flex items-center justify-center gap-2` for layout consistency with other CTAs, `duration-fast` → `duration-base`, `motion-reduce:transition-none`, focus ring `ring-primary` → `ring-white/50` with offset color specified.

#### 1f. Submit button ("Find Answers")

**Before:**
```
min-h-[44px] rounded-lg bg-primary py-3 px-8 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]
```

(The `!text.trim() && 'cursor-not-allowed opacity-50'` conditional is appended via `cn()`.)

**After (verbatim, replacing the entire className):**
```
inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]
```

Drop the `!text.trim() && 'cursor-not-allowed opacity-50'` conditional — replace with HTML `disabled={!text.trim()}` attribute (already present), and rely on `disabled:*` Tailwind variants in the className. This matches Daily Hub's pattern exactly.

#### 1g. Loading state (line ~350 in current)

**Bouncing dots:**

Before (each dot):
```
h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary
```

After:
```
h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-white/80
```

Single change: `bg-primary` → `bg-white/80`.

**"Searching Scripture for wisdom..." paragraph:**

Before:
```
text-white/60
```

After:
```
text-white
```

**Psalm 119:105 quote:**

Before:
```
mt-4 font-serif italic text-white/60
```

After:
```
mt-4 font-serif text-white/80
```

Diff: remove `italic` (contradicts Round 3 Spec T — italic on prose retired), `text-white/60` → `text-white/80` (primary reading copy).

**Psalm citation inner span:**

Before:
```
mt-1 block text-sm not-italic
```

After (unchanged — `not-italic` is now redundant since the parent isn't italic, but keeping it is harmless defensive CSS):
```
mt-1 block text-sm text-white/60
```

Adds explicit `text-white/60` (citation is caption-level, opacity OK).

#### 1h. OfflineNotice early-return

Unchanged. `<OfflineNotice>` is a shared component governed by its own spec. Do not modify.

#### 1i. State/prop cleanup

- Remove the `prefersReducedMotion` JS variable calculation (lines ~60-62):
  ```ts
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ```
  Delete this. It was used to conditionally gate `animate-fade-in-up` and `animate-fade-in` — after v2, we use Tailwind's `motion-safe:` / `motion-reduce:` prefixes consistently, so runtime JS checks are unnecessary.

- Update `prefersReducedMotion` prop passing: in the `<AskResponseDisplay>` invocation and the `<ConversionPrompt>` invocation, these props were previously passed as `prefersReducedMotion={prefersReducedMotion}`. Change both to `prefersReducedMotion={false}` for now (we keep the prop signature for ABI stability), OR remove the prop entirely from both component interfaces. **Chosen path: remove the prop from both component signatures** (section 2 and 5 below).

- The `window.scrollTo` and `scrollIntoView` calls that use `behavior: prefersReducedMotion ? 'auto' : 'smooth'` — replace with:
  ```ts
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  // ... in the callback:
  scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  ```
  i.e., inline the check where it's actually needed. Don't keep the component-level variable.

#### 1j. JSX for input view

Full structure of the input view (replaces lines ~245-310 in current):

```tsx
{showInput && (
  <>
    {/* Textarea */}
    <div className="relative mb-4">
      <label htmlFor="ask-input" className="sr-only">
        Your question
      </label>
      <textarea
        id="ask-input"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          autoExpand(e.target)
        }}
        placeholder="What's on your heart? Ask anything..."
        maxLength={ASK_MAX_LENGTH}
        rows={3}
        aria-label="Your question"
        aria-describedby="ask-char-count"
        className="w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
      />
      <CharacterCount
        current={charCount}
        max={ASK_MAX_LENGTH}
        warningAt={400}
        dangerAt={480}
        visibleAt={300}
        id="ask-char-count"
        className="absolute bottom-2 right-3"
      />
    </div>

    {/* Crisis Banner — unchanged */}
    <CrisisBanner text={text} />

    {/* Topic Chips — new grid layout + stagger reveal */}
    <div
      ref={chipsReveal.ref as RefObject<HTMLDivElement>}
      className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center"
    >
      {ASK_TOPIC_CHIPS.map((chip, index) => (
        <button
          key={chip}
          type="button"
          onClick={() => handleChipClick(chip)}
          className={cn(
            'scroll-reveal',
            chipsReveal.isVisible && 'is-visible',
            'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]',
          )}
          style={staggerDelay(index, 40)}
        >
          {chip}
        </button>
      ))}
    </div>

    {/* Submit Button */}
    <div className="flex justify-center">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
      >
        Find Answers
      </button>
    </div>

    {/* Popular Topics — see PopularTopicsSection changes */}
    <PopularTopicsSection onTopicClick={handleTopicClick} />
  </>
)}
```

---

### 2. `frontend/src/components/ask/AskResponseDisplay.tsx` (major)

#### 2a. Props signature

Remove `prefersReducedMotion` from the props interface:
```ts
interface AskResponseDisplayProps {
  response: AskResponse
  isFirstResponse: boolean
  onFollowUpClick: (question: string) => void
  // prefersReducedMotion: boolean   // REMOVE
  isLoading?: boolean
  onAskAnother?: () => void
  onJournal?: () => void
  onPray?: () => void
  onShare?: () => void
  feedback?: 'up' | 'down' | null
  feedbackThanks?: boolean
  onFeedback?: (type: 'up' | 'down') => void
}
```

Root div's animation class changes:

Before:
```tsx
<div className={prefersReducedMotion ? '' : 'animate-fade-in-up'}>
```

After:
```tsx
<div className="motion-safe:animate-fade-in-up">
```

Tailwind's `motion-safe:` variant drops the class under reduced motion natively — no JS check needed.

#### 2b. Response verse-card reveal

Add `useScrollReveal` at component level to stagger verse cards:

```ts
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
// ...
const versesReveal = useScrollReveal({ threshold: 0.1 })
```

Wrap the verse list `{response.verses.map(...)}` — the existing `<div className="space-y-4">` wrapper gets the ref; each verse card gets the `scroll-reveal` + `is-visible` + staggerDelay pattern.

#### 2c. Direct-answer paragraphs (line ~46)

Before:
```
mb-4 text-base leading-relaxed text-white/80
```

After:
```
mb-4 text-base leading-relaxed text-white
```

Single diff: `text-white/80` → `text-white` (this is primary reading copy, full opacity).

#### 2d. "What Scripture Says" h2

Unchanged. Stays at `mb-4 text-xl font-semibold text-white`.

#### 2e. Verse cards (line ~58)

Before (each card wrapper):
```
rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm
```

After — **use `<FrostedCard>` component**:

```tsx
<div
  ref={i === 0 ? (versesReveal.ref as RefObject<HTMLDivElement>) : undefined}
  className={cn('scroll-reveal', versesReveal.isVisible && 'is-visible')}
  style={staggerDelay(i, 80)}
>
  <FrostedCard className="p-5">
    {/* verse reference link, body, explanation, actions */}
  </FrostedCard>
</div>
```

Import `FrostedCard` from `@/components/homepage/FrostedCard`.

**Rationale:** FrostedCard provides `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` + decorative shadow. Note the border goes from `border-white/10` → `border-white/[0.12]` (more visible per Round 3). We override padding to `p-5` via className prop.

#### 2f. Verse reference link — **WCAG CONTRAST FIX**

Current contrast: **4.05:1** (FAILS WCAG AA 4.5:1). This is a real a11y bug, not polish.

Before:
```
font-bold text-primary-lt transition-colors hover:underline
```

After (verbatim):
```
font-semibold text-white underline decoration-primary/60 underline-offset-4 transition-[text-decoration-color,text-decoration-thickness] duration-base motion-reduce:transition-none hover:decoration-primary hover:decoration-2
```

Diff: `text-primary-lt` → `text-white` (fixes contrast); `font-bold` → `font-semibold` (less shouty against white); add `underline` with `decoration-primary/60` + `underline-offset-4` so the purple accent is preserved decoratively; hover intensifies the underline color and thickness instead of adding an underline (cleaner affordance).

Verified contrast: `text-white` (rgb 255,255,255) on verse card `rgba(255, 255, 255, 0.06)` over `bg-hero-bg` (rgb 8, 5, 26) = effective bg `rgb(23, 20, 40)` → contrast 17.4:1. Passes WCAG AAA.

#### 2g. Verse body text

Before:
```
mt-2 font-serif italic text-white/70
```

After:
```
mt-2 font-serif text-white
```

Diff: remove `italic` (contradicts Round 3 Spec T — italic retired on prose, even for scripture body since the font-serif already provides the quoted-scripture feel), `text-white/70` → `text-white`.

#### 2h. Verse explanation

Before:
```
mt-2 text-sm text-white/50
```

After:
```
mt-2 text-sm text-white/80
```

Diff: `text-white/50` → `text-white/80`. Explanation is secondary prose, /80 is the correct tier.

#### 2i. Tier 2 encouragement callout

Before:
```
mt-8 rounded-r-lg border-l-2 border-primary bg-white/[0.06] p-4
```

After (verbatim):
```
mt-8 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3
```

Diff: `rounded-r-lg` (asymmetric right-only) → `rounded-xl` (all corners); `border-l-2 border-primary` → `border-l-4 border-l-primary/60` (thicker but softer opacity); `bg-white/[0.06]` → `bg-white/[0.04]` (subtler); `p-4` → `px-4 py-3` (tighter vertical).

Inner `<p>` className:

Before:
```
text-white/80
```

After:
```
text-base leading-relaxed text-white
```

Diff: `text-white/80` → `text-white` (primary copy), add explicit `text-base leading-relaxed` for consistency with answer paragraphs.

#### 2j. Prayer section

Heading `<p>` — unchanged (`mb-2 text-sm font-semibold text-white`).

Prayer body:

Before:
```
font-serif italic leading-relaxed text-white/60
```

After:
```
leading-relaxed text-white/80
```

Diff: **remove `font-serif`** (prayer is prose, not quoted Scripture), **remove `italic`** (Round 3 Spec T), `text-white/60` → `text-white/80` (secondary prose tier).

#### 2k. AI disclaimer

Unchanged. Stays at `mt-6 text-center text-xs text-white/60`. This is caption-tier — /60 opacity is correct.

#### 2l. Dig Deeper section

Handled in `DigDeeperSection.tsx` — see section 7 below.

#### 2m. 4 action buttons (Ask another / Journal about this / Pray about this / Share)

**Container (was `grid grid-cols-2 gap-3 sm:flex sm:flex-row`):**
```
mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4
```

Diff: add `sm:flex-wrap sm:justify-center sm:gap-4` so the row breathes at tablet/desktop and wraps gracefully if additional buttons are added in the future.

Add `useScrollReveal`:

```ts
const actionsReveal = useScrollReveal({ threshold: 0.1 })
```

Wrapper div gets the ref; each button gets `scroll-reveal` + `is-visible` + `staggerDelay(i, 50)`.

**Per-button className, before (all 4 buttons identical):**
```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors
```

**Per-button className, after (verbatim):**
```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

Diff: `bg-white/10` → `bg-white`; `text-white/70` → `text-primary`; `rounded-lg` → `rounded-full` (pill); `px-3 py-2` → `px-6 py-2.5`; add `font-semibold`; add white glow shadow; add motion-safe transition tokens. Full white-pill Pattern 1 treatment.

Icons (`<RefreshCw className="h-4 w-4" />`, `<BookOpen />`, `<Heart />`, `<Share2 />`) stay at `h-4 w-4` — they now inherit `text-primary` (purple) instead of `text-white/70`.

#### 2n. Feedback row ("Was this helpful?")

**Container** unchanged: `mt-6 flex items-center justify-center gap-4`.

**Label span:**

Before:
```
text-sm text-white/60
```

After:
```
text-sm text-white/60
```

**Unchanged** — caption tier, /60 correct.

**Thumbs buttons (up + down, identical structure):**

Before:
```
min-h-[44px] min-w-[44px] rounded-lg bg-white/10 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors hover:bg-white/15
```

After (verbatim):
```
inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 border border-white/20 p-2.5 transition-colors duration-base motion-reduce:transition-none hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg
```

Diff: `rounded-lg` → `rounded-full`; add `border border-white/20`; `p-2` → `p-2.5`; add `duration-base motion-reduce:transition-none`; focus ring `ring-primary` → `ring-white/50` with offset. Matches chip-family shape.

**Thumb icons:**

Before (thumbs-up):
```tsx
<ThumbsUp
  className={cn(
    'h-5 w-5',
    feedback === 'up' ? 'fill-primary text-primary' : 'text-white/60',
  )}
/>
```

After:
```tsx
<ThumbsUp
  className={cn(
    'h-5 w-5 transition-colors duration-base motion-reduce:transition-none',
    feedback === 'up' ? 'fill-primary text-primary' : 'text-white',
  )}
/>
```

Diff: default color `text-white/60` → `text-white` (fully opaque unselected — matches other icon patterns). Keep `fill-primary text-primary` on selected — the purple-filled selected state is the intentional "you chose this" signal.

Same change for ThumbsDown (default `text-white` unselected, `fill-danger text-danger` selected).

**Feedback thanks toast:**

Before:
```tsx
{feedbackThanks && (
  <p
    className={cn(
      'mt-2 text-center text-sm text-white/60',
      !prefersReducedMotion && 'animate-fade-in',
    )}
  >
    Thank you for your feedback!
  </p>
)}
```

After:
```tsx
{feedbackThanks && (
  <p className="mt-2 text-center text-sm text-white/60 motion-safe:animate-fade-in">
    Thank you for your feedback!
  </p>
)}
```

Diff: replace manual `prefersReducedMotion` conditional with `motion-safe:` Tailwind prefix.

---

### 3. `frontend/src/components/ask/UserQuestionBubble.tsx` (minor)

**Entire file before:**
```tsx
interface UserQuestionBubbleProps {
  question: string
}

export function UserQuestionBubble({ question }: UserQuestionBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl bg-primary/20 p-4 sm:max-w-[80%]">
        <p className="text-white">{question}</p>
      </div>
    </div>
  )
}
```

**Entire file after:**
```tsx
interface UserQuestionBubbleProps {
  question: string
}

export function UserQuestionBubble({ question }: UserQuestionBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl rounded-tr-sm border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-4 sm:max-w-[80%]">
        <p className="text-white">{question}</p>
      </div>
    </div>
  )
}
```

Diff: `bg-primary/20` (purple tint) → `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]` (frosted glass, matches FrostedCard shape). Adds `rounded-tr-sm` — a subtle top-right corner notch that signals "outbound message" direction without the heavy purple.

Preserved: right-alignment via parent `flex justify-end`, `max-w-[90%] sm:max-w-[80%]`, `text-white` body.

---

### 4. `frontend/src/components/ask/PopularTopicsSection.tsx` (moderate)

#### 4a. Imports

Add:
```ts
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import type { RefObject } from 'react'
```

#### 4b. Component body

Add at the top of the function body:
```ts
const sectionReveal = useScrollReveal({ threshold: 0.1 })
```

#### 4c. Section heading

Before:
```tsx
<h2 className="mb-4 text-lg font-semibold text-white">Popular Topics</h2>
```

After (unchanged — already correct):
```tsx
<h2 className="mb-4 text-lg font-semibold text-white">Popular Topics</h2>
```

#### 4d. Grid wrapper

Before:
```
grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3
```

After (unchanged grid, adds scroll-reveal ref):
```tsx
<div
  ref={sectionReveal.ref as RefObject<HTMLDivElement>}
  className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
>
```

Only 5 topics, so at desktop (lg:grid-cols-3) the layout is 3+2. That's intentional — the existing content drives it.

#### 4e. Each card

Before (whole `<button>`):
```tsx
<button
  key={topic.topic}
  type="button"
  onClick={() => onTopicClick(topic.starterQuestion)}
  className={cn(
    'flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] p-4 text-left',
    'hover:bg-white/[0.08] transition-colors cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'min-h-[44px]',
  )}
>
  <div>
    <p className="font-semibold text-white/80">{topic.topic}</p>
    <p className="mt-1 text-sm text-white/50">{topic.description}</p>
  </div>
  <ChevronRight className="h-5 w-5 shrink-0 text-white/40" aria-hidden="true" />
</button>
```

After:
```tsx
<div
  key={topic.topic}
  className={cn('scroll-reveal', sectionReveal.isVisible && 'is-visible')}
  style={staggerDelay(index, 60)}
>
  <FrostedCard
    as="button"
    onClick={() => onTopicClick(topic.starterQuestion)}
    className="flex min-h-[44px] w-full items-center justify-between !p-4 text-left"
  >
    <div>
      <p className="font-semibold text-white">{topic.topic}</p>
      <p className="mt-1 text-sm text-white/80">{topic.description}</p>
    </div>
    <ChevronRight className="h-5 w-5 shrink-0 text-white/60" aria-hidden="true" />
  </FrostedCard>
</div>
```

Note: `.map((topic, index) => ...)` — add `index` to the callback signature.

Diff:
- Wrap in a div for stagger-reveal
- Replace ad-hoc card styling with `<FrostedCard as="button">` — gets canonical `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` + hover elevation + focus ring automatically
- Override padding via `!p-4` (important flag overrides FrostedCard's default `p-6`)
- Add `w-full` so button fills grid cell
- Title: `text-white/80` → `text-white`
- Description: `text-white/50` → `text-white/80` (WCAG-compliant secondary copy)
- Chevron: `text-white/40` → `text-white/60` (more visible but still tertiary)

**Verified contrast for the description at /80:** `rgba(255, 255, 255, 0.8)` on card `rgba(255, 255, 255, 0.06)` over `rgb(8, 5, 26)` ≈ 11.27:1. Passes WCAG AAA.

---

### 5. `frontend/src/components/ask/ConversionPrompt.tsx` (moderate)

#### 5a. Props signature

Remove `prefersReducedMotion` from props (no longer needed — use Tailwind motion-safe).

#### 5b. Entire file after rewrite

```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { cn } from '@/lib/utils'

interface ConversionPromptProps {
  onDismiss: () => void
}

export function ConversionPrompt({ onDismiss }: ConversionPromptProps) {
  const authModal = useAuthModal()

  return (
    <div className="mt-8 motion-safe:animate-fade-in">
      <FrostedCard className="text-center">
        <h3 className="text-lg font-semibold text-white">
          This is just the beginning.
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Create an account to save your prayers, journal your thoughts, track your
          growth, and join a community that cares.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => authModal?.openAuthModal(undefined, 'register')}
            className="animate-shine inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
          >
            Create Your Account
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'mt-3 text-sm text-white/70 hover:text-white underline decoration-white/30 hover:decoration-white underline-offset-4 transition-[color,text-decoration-color] duration-base motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
            'min-h-[44px]',
          )}
        >
          Keep exploring
        </button>
      </FrostedCard>
    </div>
  )
}
```

Key changes:

1. **Drop `<Link to="/register">`** in favor of `authModal?.openAuthModal(undefined, 'register')`. Register now exists as a real redesigned page, but the conversion moment should open the auth modal directly — matches the Register hero CTA behavior (single click → sign-up modal).
2. **Wrap in `<FrostedCard>`** instead of ad-hoc `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm`. Gets canonical shape + responsive padding automatically.
3. **CTA text:** `"Get Started — It's Free"` → `"Create Your Account"` (matches Register, removes "Free" claim per Register Round 2's removal of "Free forever" language).
4. **CTA className:** replaces `bg-primary text-white` with the full Register-variant white-pill + `animate-shine` (WCAG contrast + shine is the "conversion moment" signal).
5. **Body copy:** `text-white/70` → `text-white/80` (secondary prose tier, per Round 3).
6. **Dismiss link — WCAG CONTRAST FIX** — the current `text-primary-lt` on `bg-white/5` over dashboard-dark is 4.15:1 (FAILS AA 4.5:1). After: `text-white/70 hover:text-white underline decoration-white/30 hover:decoration-white` — white link with decorative underline. Verified contrast: rgba(255,255,255,0.7) on card bg ≈ 9.04:1. Passes AAA.
7. **Animation:** `animate-fade-in` kept but wrapped in `motion-safe:` prefix (drop the manual `prefersReducedMotion` conditional from v1).

#### 5c. AskPage invocation update

In `AskPage.tsx`, update the `<ConversionPrompt>` invocation:

Before:
```tsx
<ConversionPrompt
  onDismiss={() => setConversionDismissed(true)}
  prefersReducedMotion={prefersReducedMotion}
/>
```

After:
```tsx
<ConversionPrompt onDismiss={() => setConversionDismissed(true)} />
```

---

### 6. `frontend/src/components/ask/SaveConversationButton.tsx` (minor)

Button className only.

Before:
```
inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-white/10 border border-white/10 px-3 py-2 sm:w-auto text-sm text-white/70 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors
```

After (verbatim):
```
inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] sm:w-auto
```

Diff: Full Pattern 1 inline white-pill. Keeps `w-full sm:w-auto` for mobile-full/tablet-compact responsive behavior.

Icon (`<ClipboardCopy className="h-4 w-4" />`) inherits `text-primary` — purple on white.

---

### 7. `frontend/src/components/ask/DigDeeperSection.tsx` (minor)

Per-chip className before:
```
inline-flex items-center gap-2 min-h-[44px] rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-[colors,transform] duration-fast active:scale-[0.98]
```

Per-chip className after (matches the standardized topic chip in section 1e):
```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

Diff: add `border border-white/20`, `text-white/70` → `text-white`, remove `hover:text-white` (redundant), `duration-fast` → `duration-base`, focus ring `ring-primary` → `ring-white/50` with offset, add `hover:-translate-y-0.5` for hover lift. Full match with the input-view topic chips.

`<MessageCircle className="h-4 w-4 shrink-0" />` icon unchanged — inherits `text-white`.

Wrapper div className unchanged: `mt-6 border-t border-white/10 pt-4`.

Heading unchanged: `mb-3 font-semibold text-white`.

Chip container:

Before:
```
flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2
```

After (unchanged — this is already the right responsive wrap):
```
flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2
```

No scroll-reveal on Dig Deeper chips — they appear within the already-fading-in response block. Adding stagger on top of `animate-fade-in-up` parent would create nested animation noise.

---

### 8. `frontend/src/components/ask/VerseCardActions.tsx` (moderate)

This component renders 3 inline buttons per verse card (Highlight / Save note / Share). 3 verses per fallback response → 9 buttons per response. All three use `text-xs text-white/60 hover:text-primary` which fails the purple-on-dark readability and contributes to the overall purple-heavy feel.

#### 8a. The 3 inline action buttons (lines ~102-130 in current)

Before (each button — all three have this className):
```
inline-flex min-h-[44px] items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-primary
```

After (verbatim):
```
inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-white/80 transition-colors duration-base motion-reduce:transition-none hover:text-white
```

Diff: `text-white/60` → `text-white/80` (readable tier); `hover:text-primary` → `hover:text-white` (white-intensify hover matches rest of redesign, removes purple); add `font-medium` for slight weight; add `duration-base motion-reduce:transition-none` for motion safety.

Icon (`<Highlighter />`, `<StickyNote />`, `<Share2 />`) unchanged at `h-3.5 w-3.5` — inherits `text-white/80`.

Wrapper unchanged: `mt-3 flex gap-3`.

#### 8b. Note textarea (line ~182 in current)

Before:
```
w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50
```

After (verbatim — canonical white-glow, smaller variant per vocabulary section):
```
w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/50 shadow-[0_0_16px_2px_rgba(255,255,255,0.40),0_0_32px_6px_rgba(255,255,255,0.24)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
```

#### 8c. Note save/cancel buttons (lines ~201-219 in current)

**Character count span:**

Before:
```
text-xs text-white/60
```

After (unchanged — caption tier):
```
text-xs text-white/60
```

**Cancel button:**

Before:
```
min-h-[44px] rounded-lg px-3 py-1 text-xs text-white/50 transition-colors hover:text-white/70
```

After:
```
min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition-colors duration-base motion-reduce:transition-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg
```

Diff: `text-white/50` → `text-white/70`; `hover:text-white/70` → `hover:text-white`; add font-medium, motion-safe tokens, focus ring (was missing).

**Save button:**

Before:
```
min-h-[44px] rounded-lg bg-primary px-3 py-1 text-xs text-white transition-colors hover:bg-primary-lt
```

After (mini white-pill variant — pattern 1 compressed):
```
inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-primary shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
```

Diff: `bg-primary text-white rounded-lg` → `bg-white text-primary rounded-full` (mini white-pill); add shadow, motion-safe tokens, focus ring. `px-3 py-1` → `px-4 py-1.5` for tighter proportions in the inline edit context.

Drop the `!noteText.trim() && 'cursor-not-allowed opacity-50'` conditional — use HTML `disabled={!noteText.trim()}` + Tailwind `disabled:*` variants.

---

## Animations (final rollup)

All animations respect `prefers-reduced-motion: reduce` via Tailwind's `motion-safe:` / `motion-reduce:` variants — no manual JavaScript matchMedia checks.

| Animation | Element(s) | Class | Defined in |
|---|---|---|---|
| `animate-gradient-shift` | Hero H1 | — | Register Round 2 CSS (existing) |
| `animate-shine` | ConversionPrompt CTA only | — | Register Round 2 CSS (existing) |
| `animate-fade-in-up` | AskResponseDisplay root | `motion-safe:animate-fade-in-up` | Existing (BB-33) |
| `animate-fade-in` | ConversionPrompt wrapper, feedback toast | `motion-safe:animate-fade-in` | Existing (BB-33) |
| `animate-bounce` | 3 loading dots | `motion-safe:animate-bounce motion-reduce:animate-none` | Tailwind default |
| Staggered scroll-reveal (fade+translate) | Topic chip grid, Popular Topic grid, Verse cards, Response action buttons | `scroll-reveal` + `is-visible` + `staggerDelay(i, X)` | Existing hook (BB-33) |
| Hover lift | Topic chips, Popular Topic cards (via FrostedCard) | `hover:-translate-y-0.5 motion-reduce:hover:translate-y-0` | Tailwind inline |

**Explicitly out of scope:** Framer Motion, GSAP, Lottie, scroll-synced animations, character-by-character text reveals, cursor-following effects, typing-indicator animations. No new dependencies. No new keyframes beyond what Register Round 2 already added to CSS.

---

## Responsive behavior matrix

| Element | <640px (mobile) | 640–1023px (tablet) | ≥1024px (desktop) |
|---|---|---|---|
| Hero padding | pt-24 pb-6 px-4 | pt-28 pb-8 px-6 | pt-28 pb-8 px-6 |
| Hero H1 font-size | text-4xl (36px) | text-5xl (48px) | text-6xl (60px) |
| Hero subtitle font-size | text-base (16px) | text-lg (18px) | text-lg (18px) |
| Input container max-width | full width with px-4 | max-w-3xl with px-6 | max-w-3xl with px-6 |
| Topic chip grid | grid-cols-2 (3 rows of 2) | flex-wrap justify-center | flex-wrap justify-center |
| Popular Topics grid | grid-cols-1 (5 rows) | grid-cols-2 (2+2+1) | grid-cols-3 (3+2) |
| Response action buttons | grid-cols-2 (2 rows) | flex-wrap justify-center | flex-wrap justify-center (single row likely) |
| DigDeeper chips | flex-col | flex-row flex-wrap | flex-row flex-wrap |
| ConversionPrompt padding | p-6 (FrostedCard default) | p-6 | p-6 |
| Thumbs feedback buttons | side-by-side inline | side-by-side inline | side-by-side inline |

**Target after changes:** at 1440 × 900 viewport, Popular Topics heading Y ≤ 820px, meaning at least the heading + one row of card tops are visible above the fold.

---

## Testing plan

### Unit tests

Update `frontend/src/pages/__tests__/AskPage.test.tsx` and add/update assertions:

1. **Shell structure**
   - `<Layout transparentNav>` is rendered (verify via `<Navbar transparent>` render or Layout test-id)
   - `<GlowBackground variant="fullPage">` is rendered (verify via presence of ≥3 glow orbs with `data-testid="glow-orb"` — matches Register Round 2 assertion)
   - `<BackgroundSquiggle>` is NOT rendered on the page
   - No element has className containing `bg-dashboard-dark`

2. **Hero**
   - Hero H1 text is exactly "Ask God's Word"
   - Hero H1 has className containing `animate-gradient-shift`
   - Hero H1 has NO element with class `font-script` as descendant (no cursive accent)
   - Hero H1 has NO `HeadingDivider` rendered as sibling
   - Subtitle color is `rgb(255, 255, 255)` (full white), NOT `rgba(255, 255, 255, 0.6)`
   - Subtitle has className NOT containing `italic` or `font-serif`

3. **Textarea**
   - `#ask-input` className contains `border-white/30` (NOT `border-glow-cyan`)
   - `#ask-input` className contains `focus:ring-white/30` (NOT `focus:ring-primary`)
   - `#ask-input` className contains `shadow-[0_0_20px_3px_rgba(255,255,255,0.50)` (white shadow, NOT cyan)
   - `#ask-input` className does NOT contain any `cyan` or `0, 212, 255` substring

4. **Submit button**
   - Submit button className contains `bg-white` and `text-hero-bg` (NOT `bg-primary text-white`)
   - Submit button className contains `rounded-full` (NOT `rounded-lg`)
   - Button is disabled when textarea is empty

5. **Topic chips**
   - 6 chips render
   - Each chip className contains `text-white` (NOT `text-white/70`)
   - Each chip className contains `border-white/20` (NOT `border-white/15`)
   - Chip grid container at breakpoint <640px has className `grid grid-cols-2`

6. **Loading state**
   - After submit with "hey", loading dots render with className containing `bg-white/80` (NOT `bg-primary`)
   - Psalm quote paragraph does NOT have `italic` class

7. **Response state (submit "hey" in test, advance fake timers past ASK_LOADING_DELAY_MS)**
   - `<AskResponseDisplay>` root has className containing `motion-safe:animate-fade-in-up`
   - Answer paragraph has className containing `text-white` (NOT `text-white/80`)
   - Verse card is rendered inside a `<FrostedCard>` (check for data-testid or for the canonical FrostedCard border/shadow className)
   - Verse reference link has className containing `text-white` (NOT `text-primary-lt`)
   - Verse reference link has `underline` class
   - Verse body paragraph has NO `italic` class
   - Verse explanation has className containing `text-white/80` (NOT `text-white/50`)
   - Tier 2 callout has className containing `border-l-4` and `rounded-xl` (NOT `border-l-2 rounded-r-lg`)
   - Prayer body has NO `italic` or `font-serif` class
   - 4 action buttons each have className containing `bg-white` and `text-primary` (NOT `bg-white/10 text-white/70`)

8. **UserQuestionBubble**
   - Bubble className contains `bg-white/[0.06]` and `border-white/[0.12]` (NOT `bg-primary/20`)
   - Bubble className contains `rounded-tr-sm`

9. **PopularTopicsSection**
   - 5 topic cards render
   - Each card's title has className containing `text-white` (NOT `text-white/80`)
   - Each card's description has className containing `text-white/80` (NOT `text-white/50`)
   - Each card is rendered as a `<button>` element (via FrostedCard `as="button"`)

10. **ConversionPrompt (logged-out, after response)**
    - CTA has text `"Create Your Account"` (NOT `"Get Started — It's Free"`)
    - CTA className contains `bg-white` and `text-primary` and `animate-shine`
    - Dismiss link has className containing `text-white/70` (NOT `text-primary-lt`)
    - Clicking CTA opens auth modal in 'register' mode (verify mock is called)

11. **SaveConversationButton**
    - Button className contains `bg-white` and `text-primary` (NOT `bg-white/10 text-white/70`)

12. **Reduced motion**
    - In a test with `matchMedia` mocked to return `matches: true` for reduced-motion, confirm no element has a non-zero `animation-duration` computed style (or use a sample assertion on the hero H1).

### Manual QA checklist

Run `pnpm dev`, visit the following URLs and viewports, verify by eye:

#### `/ask` empty state

**Viewports to check:** 375px, 768px, 1024px, **1440×900**, 1920px.

- [ ] Navbar renders transparent over hero
- [ ] GlowBackground orbs visible (at least 3 drifting, animated gently)
- [ ] Hero H1 "Ask God's Word" — no cursive "Word"
- [ ] Hero H1 gradient shimmers subtly over ~12s
- [ ] No HeadingDivider below H1
- [ ] Subtitle is white, sans-serif, not italic
- [ ] No BackgroundSquiggle visible
- [ ] Textarea has white glow, no cyan
- [ ] 6 topic chips: readable white text, thin white/20 borders, lift on hover
- [ ] At 375px, chips render as 3×2 grid (no longer 6-row stack)
- [ ] "Find Answers" button is white pill with dark text, disabled by default
- [ ] Popular Topics heading visible above the fold at 1440×900 (y<900)
- [ ] 5 popular topic cards render as FrostedCards, hover lifts 2px
- [ ] Popular Topic descriptions are readable at `text-white/80`
- [ ] No console errors on load

#### `/ask?q=hey` response state

- [ ] Auto-submit fires, loading state shows white dots (not purple)
- [ ] Loading Psalm quote is NOT italic (font-serif OK)
- [ ] Response fades/slides in via `animate-fade-in-up`
- [ ] User bubble is frosted glass (NOT purple tint), right-aligned with rounded-tr-sm notch
- [ ] Answer paragraphs are full white
- [ ] Verse cards are FrostedCards with readable content
- [ ] **Verse reference links are readable** (white with purple underline — no more dim purple) — THIS IS THE WCAG FIX
- [ ] Verse body is not italic (font-serif OK)
- [ ] Verse explanation is readable at `/80`
- [ ] Encouragement callout has thick-left-border accent, rounded-xl
- [ ] Prayer body is NOT italic, NOT serif, readable
- [ ] AI disclaimer present, centered, small gray
- [ ] 3 Dig Deeper chips match input chip styling, hover lift
- [ ] 4 action buttons (Ask another / Journal / Pray / Share) are white pills — NOT dim gray
- [ ] Action buttons stagger in with fade-up
- [ ] Feedback "Was this helpful?" label readable
- [ ] Thumb buttons are round, border-white/20
- [ ] Clicking thumbs-up shows purple fill
- [ ] "Thank you for your feedback!" toast fades in under toast div

#### `/ask?q=hey` logged-out ConversionPrompt

- [ ] ConversionPrompt appears below feedback row
- [ ] Rendered as FrostedCard (has frosted-glass border and shadow)
- [ ] Heading "This is just the beginning." is readable
- [ ] Body copy is readable at `/80`
- [ ] CTA text is "Create Your Account" (NOT "Get Started — It's Free")
- [ ] CTA is white pill with purple text, shine sweep animates every 6s
- [ ] **Dismiss link "Keep exploring" is readable** (white/70 with decorative underline, NOT dim purple) — THIS IS THE WCAG FIX
- [ ] Clicking CTA opens the register auth modal
- [ ] Clicking dismiss removes the prompt

#### Verse card action buttons (click on any expanded verse)

- [ ] Highlight in Bible / Save note / Share buttons render at `text-white/80` (readable, not dim)
- [ ] Hover intensifies to full white (not purple)
- [ ] Clicking "Save note" opens inline textarea with white glow
- [ ] Save button in note editor is a mini white pill (purple text on white)

#### Accessibility

- [ ] Run axe extension on `/ask` — 0 critical issues
- [ ] Run axe extension on `/ask?q=hey` — 0 critical issues (previous 2 color-contrast failures gone)
- [ ] Tab order: textarea → chip 1 → chip 2 ... → chip 6 → Find Answers → Popular Topic 1 ... → Popular Topic 5
- [ ] After response: Dig Deeper chips → action buttons → thumbs up → thumbs down → ConversionPrompt CTA → dismiss
- [ ] Focus rings visible on every interactive element
- [ ] Enable `prefers-reduced-motion: reduce` in DevTools — verify orbs freeze, H1 stops shimmering, response entrance is instant, shine stops, hover lifts disabled

### Build check

```
cd frontend && pnpm build
```

Bundle-size delta expected < 2KB. No new dependencies. If `pnpm build` reports any new chunk or a >5KB delta on the main bundle, something snuck in — investigate before committing.

### Playwright check

Run code-review first, then:

```
/verify-with-playwright /ask _plans/2026-04-20-ask-page-redesign-v2.md
```

Then a second run at the query-param state:

```
/verify-with-playwright /ask?q=hey _plans/2026-04-20-ask-page-redesign-v2.md
```

---

## Acceptance criteria (rollup)

A reviewer opens `/ask` and `/ask?q=hey` and verifies each of the following:

1. ✅ Page renders inside `<Layout transparentNav>` with `<GlowBackground variant="fullPage">` wrapping content
2. ✅ Hero H1 "Ask God's Word" — NO cursive "Word"
3. ✅ Hero H1 shimmers with `animate-gradient-shift` on a 12s cycle
4. ✅ Hero subtitle is full `text-white`, sans-serif, NOT italic
5. ✅ No `<HeadingDivider>` rendered on page
6. ✅ No `<BackgroundSquiggle>` rendered on page
7. ✅ No `bg-dashboard-dark` className anywhere
8. ✅ Textarea has white glow shadow, NO cyan
9. ✅ Textarea focus ring is white (NOT purple)
10. ✅ "Find Answers" button is white pill with dark text, purple glow halo
11. ✅ Topic chips are fully white text with white/20 borders, hover-lift active
12. ✅ At 375px viewport, topic chip grid renders as 3 rows × 2 columns
13. ✅ Popular Topics heading visible above the fold at 1440×900
14. ✅ Popular Topic cards render as FrostedCards with hover-lift
15. ✅ Popular Topic descriptions readable at `text-white/80`
16. ✅ Loading dots are white (NOT purple)
17. ✅ Loading Psalm quote is NOT italic
18. ✅ User question bubble is frosted glass (NOT purple tint) with right-corner notch
19. ✅ Answer paragraphs render at full `text-white`
20. ✅ Verse cards are FrostedCards
21. ✅ **Verse reference links readable (white with purple underline) — WCAG contrast ≥ 4.5:1**
22. ✅ Verse body is NOT italic
23. ✅ Verse explanation readable at `text-white/80`
24. ✅ Encouragement callout has `border-l-4 border-l-primary/60` + `rounded-xl`
25. ✅ Prayer body is NOT italic, NOT serif, readable at `text-white/80`
26. ✅ 4 response action buttons are canonical inline white pills
27. ✅ Dig Deeper chips match input-view chip styling
28. ✅ VerseCardActions 3-buttons-per-card render at `text-white/80` (NOT `text-white/60 hover:text-primary`)
29. ✅ VerseCardActions note textarea has white glow (NOT old pattern)
30. ✅ VerseCardActions Save button is mini white pill
31. ✅ Feedback thumbs buttons are rounded-full with white/20 border
32. ✅ Feedback icons default to `text-white` (not `/60`)
33. ✅ ConversionPrompt wrapped in FrostedCard
34. ✅ ConversionPrompt CTA text is "Create Your Account"
35. ✅ ConversionPrompt CTA has shine
36. ✅ **ConversionPrompt dismiss link readable (white/70 with decorative underline) — WCAG contrast ≥ 4.5:1**
37. ✅ SaveConversationButton is canonical inline white pill
38. ✅ All animations respect `prefers-reduced-motion: reduce`
39. ✅ No `text-primary` on body copy, links, or icons (except the white-pill CTA interior where it's the text color — that's correct)
40. ✅ No `bg-primary` on any CTA
41. ✅ No manual `prefersReducedMotion` JS checks remaining in `AskPage.tsx`, `AskResponseDisplay.tsx`, or `ConversionPrompt.tsx`
42. ✅ No horizontal scroll at any breakpoint from 320px up
43. ✅ No console errors / warnings / network failures on load
44. ✅ Bundle-size delta < 2KB (no new dependencies)
45. ✅ Register page unchanged (no regression)
46. ✅ Homepage unchanged (BackgroundSquiggle still renders on JourneySection)
47. ✅ Daily Hub unchanged (PrayerInput / JournalInput classNames untouched)
48. ✅ CC stayed on branch `claude/feature/ask-page-redesign` throughout

---

## Out-of-scope cyan-token consumers (document, do NOT fix)

The recon found 6 files using the deprecated `glow-cyan` token. Only `AskPage.tsx` is fixed in this spec. The other 5 are explicitly OUT OF SCOPE — they get their own follow-up specs later. Do NOT touch them in this spec even if the diff looks trivial:

- `frontend/src/components/dashboard/MoodCheckIn.tsx` (mood textarea focus ring)
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` (AI plan textarea)
- `frontend/src/components/music/RoutineStepCard.tsx` (scene-variant step card)
- `frontend/src/components/music/RoutineBuilder.tsx` (selector chip)
- `frontend/src/components/TypewriterInput.tsx` (non-glass branch)

Document the scope boundary in the commit message: `fix: remove cyan from /ask; other consumers tracked in follow-up`.

---

## Out of scope (future specs if needed)

- Topic-chip / Popular-Topics **content consolidation** (the 6 chips and 5 popular topics have overlapping themes — suffering, anxiety, forgiveness, God's plan). Consolidating is a product decision; bundle into a separate follow-up.
- **FAQPage JSON-LD** per BB-40 (good SEO opportunity for `/ask`). Separate spec.
- **AskSkeleton** component. Page is static — no skeleton needed until lazy data loads ship.
- **Chat-bubble vs content-panel paradigm shift** — explicitly preserved in v2. Any future model change is a separate spec.
- **Real AI backend integration.** All responses are mock today. Backend work is Phase 3 flag-gated separately.
- **Light mode toggle** (deferred).
- **AskPage i18n / localization** (deferred).
- **PageHero component deprecation** — many pages still use it. Universal retirement is a big migration; out of this spec.
- **Fixing the 5 other cyan consumers** (see scope boundary above).
- **`?q=` URL cleanup after submit** (URL stays `/ask?q=hey` after conversation starts). Behavior unchanged in v2; separate UX decision later.

---

## Final reminder

**CC must confirm branch BEFORE writing any code.** Run:

```
git branch --show-current
```

Expected: `claude/feature/ask-page-redesign`.

If anything else, STOP and ask the user to resolve.

Then execute file-by-file in the order given above (1 → 8). Run `pnpm test` after section 2 (biggest change set) and again at the end. Run `pnpm build` at the end. Do NOT commit. Paste diffs for user review before handing off.
