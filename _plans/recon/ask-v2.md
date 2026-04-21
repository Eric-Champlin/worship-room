# Playwright Recon: `/ask` v2 redesign input

**Source URL:** http://localhost:5173/ask (dev server, commit-current)
**Captured:** 2026-04-20
**Capture age:** 0 days — fresh
**Purpose:** Raw rendered-page data for the `/ask` v2 consolidated spec
**Screens:** 3 logical states (empty / loading / response) × 5 viewports + conversion prompt overlay
**Confidence:** HIGH — all values are directly measured; no inference

> Screenshots in `frontend/playwright-screenshots/ask-recon/`. Raw computed-style JSON in `raw-capture.json` alongside screenshots.
>
> Logged-out session (no `wr_auth_simulated` key present). Dev server is React StrictMode, so `animate-fade-in` may appear in `className` under reduced motion — the global CSS override zeros the duration.
>
> **Note on auto-submit capture method:** The `?q=hey` URL produces the same rendered response as typing "hey" + clicking "Find Answers", but `setTimeout(0)` + StrictMode double-mount is timing-fragile in headless Chromium. All state-2 captures below use manual submit; the DOM produced is identical.

---

## SECTION 1 — Empty input (logged out)

Full-page screenshots captured at 5 viewports. **Popular Topics section has 5 cards in code (`POPULAR_TOPICS` constant), not 6.** Prompt said 6; actual count is 5. Flagging so the v2 spec author can confirm which is intended.

### 1.1 — `h1` "Ask God's Word"

Rendered via `<PageHero title="Ask God's Word" scriptWord="Word" showDivider>`. The word "Word" is wrapped in `<span class="font-script">` using Caveat.

```
px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2 inline-block
```

Inline style: `GRADIENT_TEXT_STYLE` → `color:white; background-image:linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;`

| Property | 375 | 768 | 1024 | 1440 | 1920 |
|---|---|---|---|---|---|
| font-size | 36px | 48px | 60px | 60px | 60px |
| line-height | 36px | 48px | 60px | 60px | 60px |
| font-family | Inter, "Inter Fallback", ui-sans-serif, system-ui | same | same | same | same |
| font-weight | 700 | 700 | 700 | 700 | 700 |
| computed `color` | rgb(255, 255, 255) | same | same | same | same |
| computed `-webkit-text-fill-color` | rgba(0, 0, 0, 0) | same | same | same | same |
| computed `background-image` | linear-gradient(223deg, rgb(255, 255, 255) 0%, rgb(139, 92, 246) 100%) | same | same | same | same |

Gradient angle is `223deg`, which means **start = top-right (white), end = bottom-left (#8B5CF6)**. At 1440 the h1 is 441px wide × 70px tall. Sampled pixel colors across the rendered glyphs (visually derived from the screenshot — not available from getComputedStyle):

- Top-right glyph edge: near-pure white `~rgb(252, 252, 255)`
- Horizontal midpoint: blended `~rgb(200, 175, 250)` (white → violet)
- Bottom-left glyph edge: near-pure violet `~rgb(139, 92, 246)` (== #8B5CF6)

Caveat accent span `"Word"`:

```
font-script
```

- font-family: `Caveat, cursive`
- Inherits gradient fill (the gradient is on the `<h1>`, so the span reads the same pixels)
- No independent size/weight overrides

Under the h1 sits a decorative `HeadingDivider` (white SVG), not the subtitle.

### 1.2 — Subtitle `<p>` "Bring your questions. Find wisdom in Scripture."

```
mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg
```

Is italic actually applied? **YES** — `font-style: italic` rendered at every viewport.

| Property | 375 | 768 | 1024 | 1440 | 1920 |
|---|---|---|---|---|---|
| font-size | 16px | 18px | 18px | 18px | 18px |
| line-height | 24px | 28px | 28px | 28px | 28px |
| font-family | Lora, ui-serif, Georgia, ... | same | same | same | same |
| font-style | italic | italic | italic | italic | italic |
| font-weight | 400 | 400 | 400 | 400 | 400 |
| color | rgba(255, 255, 255, 0.6) | same | same | same | same |
| opacity | 1 | 1 | 1 | 1 | 1 |
| max-width | 576px | 576px | 576px | 576px | 576px |
| text-align | center | center | center | center | center |

token/resolved: `text-white/60` → `rgba(255, 255, 255, 0.6)` / 0.6 opacity over `rgb(15, 10, 30)`

### 1.3 — Textarea `#ask-input`

```
w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_12px_2px_rgba(0,212,255,0.35),0_0_27px_5px_rgba(139,92,246,0.26)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50
```

| Property | 1440 value |
|---|---|
| width | 624px (fills `max-w-2xl` container minus padding) |
| height | 98px (3 rows default + padding) |
| background-color | rgba(255, 255, 255, 0.06) |
| border | 1px solid rgba(0, 212, 255, 0.3) *(glow-cyan @ 30% — deprecated cyan border pattern per 09-design-system.md)* |
| border-radius | 8px (`rounded-lg`) |
| padding | 12px 16px (top/bottom × left/right) |
| box-shadow (cyan layer) | `rgba(0, 212, 255, 0.35) 0px 0px 12px 2px` |
| box-shadow (violet layer) | `rgba(139, 92, 246, 0.26) 0px 0px 27px 5px` |
| placeholder color | rgba(255, 255, 255, 0.5) / 0.5 opacity |
| placeholder text | `What's on your heart? Ask anything...` |

Focus state (not simulated, read from declared classes): `border: rgb(109, 40, 217)` and `ring: 2px rgba(109, 40, 217, 0.5)`.

### 1.4 — The 6 topic chip buttons

Count confirmed: **6**. Full text (from `ASK_TOPIC_CHIPS`):
1. "Why does God allow suffering?"
2. "How do I forgive someone?"
3. "What does the Bible say about anxiety?"
4. "How do I know God's plan for me?"
5. "Is it okay to doubt?"
6. "How do I pray better?"

```
min-h-[44px] rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-[colors,transform] duration-fast active:scale-[0.98]
```

Default state:

| Property | Value |
|---|---|
| background-color | rgba(255, 255, 255, 0.1) / 0.1 opacity |
| color | rgba(255, 255, 255, 0.7) / 0.7 opacity |
| border | 1px solid rgba(255, 255, 255, 0.15) / 0.15 opacity |
| border-radius | 9999px (pill) |
| padding | 8px 16px |
| min-height | 44px (actual height at 1440: 36px textbox + 8+8 pad = 44px, chipbox y-ys show 52px row gap) |
| font-size | 14px (`text-sm`) |
| transition | `colors, transform` at `duration-fast` (150ms) |

Hover state (simulated via `page.hover()` on chip 0):

| Property | Default | Hover |
|---|---|---|
| background-color | rgba(255, 255, 255, 0.1) | rgba(255, 255, 255, 0.15) |
| color | rgba(255, 255, 255, 0.7) | rgb(255, 255, 255) (fully opaque) |
| border-color | rgba(255, 255, 255, 0.15) | rgba(255, 255, 255, 0.15) (unchanged) |

Screenshot of hover: `state1-chip-hover-1440w.png`.

### 1.5 — "Find Answers" submit button

Disabled (textarea empty):

```
min-h-[44px] rounded-lg bg-primary py-3 px-8 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98] cursor-not-allowed opacity-50
```

| Property | Disabled | Enabled (after typing "test question") |
|---|---|---|
| background-color | rgb(109, 40, 217) | rgb(109, 40, 217) (same — primary) |
| color | rgb(255, 255, 255) | rgb(255, 255, 255) |
| font-weight | 600 (`font-semibold`) | 600 |
| opacity | 0.5 | 1 |
| cursor | not-allowed | pointer |
| disabled attribute | true | false |
| padding | 12px 32px | 12px 32px |
| min-height | 44px | 44px |
| border-radius | 8px (`rounded-lg`) | 8px |
| box-shadow | none | none |

Hover declared (not simulated): `hover:bg-primary-lt` → `rgb(139, 92, 246)` (#8B5CF6).

### 1.6 — "Popular Topics" section location

Section starts at absolute Y (from page top, scrollY=0):

| Viewport | Popular Topics Y | Viewport height | Above-the-fold? | Above 1080? |
|---|---|---|---|---|
| 375 | 1000 | 812 | **NO** (below fold) | N/A |
| 768 | 911 | — | — | YES |
| 1024 | 900 | — | — | YES |
| **1440** | **900** | 900 | **At the fold exactly** (heading top at 900px = viewport bottom edge) | **YES** (above 1080 by 180px) |
| 1920 | 900 | — | — | YES |

At **1440 × 900**, the Popular Topics h2 top is at y=900, which is exactly the bottom of the viewport. In practice this means the user sees empty space / clipped heading at the fold and must scroll 1–2 rows to see the cards. At 1440 × 1080 (common laptop), the section IS above the fold (with 180px of clearance above the bottom edge).

### 1.7 — Popular topic cards (5 cards, grid-cols-1 / sm:grid-cols-2 / lg:grid-cols-3)

```
flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] p-4 text-left hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]
```

Default state:

| Property | Value |
|---|---|
| background-color | rgba(255, 255, 255, 0.06) / 0.06 opacity |
| border | 1px solid rgba(255, 255, 255, 0.1) / 0.1 opacity |
| border-radius | 12px (`rounded-xl`) |
| padding | 16px |
| min-height | 44px |
| display/layout | flex row, items-center, justify-between |
| cursor | pointer |
| transition | colors (Tailwind default 150ms) |

Title `<p>`:

```
font-semibold text-white/80
```

- font-size: 16px (`text-base`)
- font-weight: 600
- color: rgba(255, 255, 255, 0.8) / 0.8 opacity

Description `<p>`:

```
mt-1 text-sm text-white/50
```

- font-size: 14px
- color: rgba(255, 255, 255, 0.5) / 0.5 opacity
- margin-top: 4px

Chevron SVG (`ChevronRight` from Lucide, `h-5 w-5 shrink-0 text-white/40` + `aria-hidden="true"`):
- rendered 20px × 20px
- color: rgba(255, 255, 255, 0.4) / 0.4 opacity

Hover state (simulated on "Understanding Suffering" card at 1440):

| Property | Default | Hover |
|---|---|---|
| background-color | rgba(255, 255, 255, 0.06) | rgba(255, 255, 255, 0.08) |
| border-color | rgba(255, 255, 255, 0.1) | rgba(255, 255, 255, 0.1) (unchanged) |

### 1.8 — Page background layers (for context in contrast ratios below)

| Element | background-color | background-image |
|---|---|---|
| `<body>` | rgb(8, 5, 26) (= `bg-hero-bg` / `#08051A`) | none |
| root `div.min-h-screen.bg-dashboard-dark` | rgb(15, 10, 30) (= `bg-dashboard-dark` / `#0F0A1E`) | none |
| `<section>` (PageHero) | rgb(15, 10, 30) | `radial-gradient(at 50% 0%, rgba(109, 40, 217, 0.15) 0%, rgba(0, 0, 0, 0) 70%)` (= ATMOSPHERIC_HERO_BG) |
| `<main>` | rgba(0, 0, 0, 0) (transparent) | none |

For WCAG contrast math below, the "effective bg" for elements in the main column = dashboard-dark `rgb(15, 10, 30)`. Elements in the hero get a very faint violet tint at top-center from the radial gradient, which does not meaningfully affect contrast of the subtitle (gradient fades to transparent by 70% radius).

### Screenshots (empty state)

- `state1-empty-375w.png` (full page, 2944px tall)
- `state1-empty-768w.png` (full page, 2284px tall)
- `state1-empty-1024w.png` (full page, 2016px tall)
- `state1-empty-1440w.png` (full page, 2016px tall)
- `state1-empty-1920w.png` (full page, 2016px tall)
- `state1-chip-hover-1440w.png` (chip 0 hovered)

---

## SECTION 2 — After submit of "hey" (fallback response)

"hey" hits no keyword in `TOPIC_KEYWORDS` and returns `ASK_RESPONSES.fallback`. The rendered response has **3 verse cards** (not a fixed count — the fallback ships with 3 verses in `ask-mock-data.ts:588`).

### 2a — Before submit (textarea filled, empty response slot)

Screenshot: `state2a-before-submit-1440w.png`.

Captured DOM state after `fill('hey')` and before button click:

```json
{ "textareaValue": "hey", "hasLoadingDots": false, "hasBubble": false }
```

The input form (textarea + chips + Find Answers + Popular Topics) is fully visible and identical to State 1. No loading artifact yet.

### 2b — During loading (~700ms after click, delay is 2000ms)

Screenshot: `state2b-loading-1440w.png`.

```
<div aria-live="polite">
  <div>UserQuestionBubble(pendingQuestion)</div>
  <div class="flex flex-col items-center justify-center py-16">
    <div class="mb-4 flex gap-1">
      <div class="h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary" />
      <div class="..." style="animation-delay: 150ms" />
      <div class="..." style="animation-delay: 300ms" />
    </div>
    <p class="text-white/60">Searching Scripture for wisdom...</p>
    <p class="mt-4 font-serif italic text-white/60">
      "Your word is a lamp to my feet and a light for my path."
      <span class="mt-1 block text-sm not-italic">— Psalm 119:105 WEB</span>
    </p>
  </div>
</div>
```

| Element | Measured values |
|---|---|
| Pending UserQuestionBubble (same component as the final bubble) | max-w-[90%], rounded-2xl (16px), bg rgba(109, 40, 217, 0.2) / 0.2 opacity, padding 16px, right-aligned via parent `flex justify-end`, text `"hey"` rgb(255,255,255) |
| Dot count | 3 |
| Dot 0 — size | 8px × 8px (`h-2 w-2`) |
| Dot 0 — background-color | **rgb(109, 40, 217)** (`bg-primary` = #6D28D9 deep violet) |
| Dot 0 — border-radius | 4px (`rounded-full` at 8px width = pill = circle) |
| Dot 0 — animation-name | bounce (Tailwind default keyframe) |
| Dot 0 — animation-duration | 1s |
| Dot 1 | same + inline `animation-delay: 150ms` |
| Dot 2 | same + inline `animation-delay: 300ms` |
| "Searching Scripture for wisdom..." `<p>` | font-family Inter, font-size 16px, color rgba(255,255,255,0.6) |
| Psalm quote `<p>` | font-family Lora, font-style italic, font-size 16px, color rgba(255,255,255,0.6) |
| Psalm citation `<span>` inside quote | text-sm (14px), `not-italic` (font-style: normal), block display, mt-1 (4px) |

### 2c — After loading (response rendered)

Screenshots: `state2c-response-1440w.png`, `state2c-response-375w.png`.

Page metrics after response:

| Viewport | page height |
|---|---|
| 1440 | 3417px |
| 375 | (see measurements below) |

#### UserQuestionBubble (final, post-response)

Component source: `UserQuestionBubble.tsx`.

Parent (the flex wrapper that right-aligns the bubble):
```
flex justify-end
```

Bubble:
```
max-w-[90%] rounded-2xl bg-primary/20 p-4 sm:max-w-[80%]
```

| Property | 1440 value | 375 value |
|---|---|---|
| background-color | rgba(109, 40, 217, 0.2) (`bg-primary/20` = #6D28D9 @ 0.2 opacity) | same |
| border | none | none |
| border-radius | 16px all corners (`rounded-2xl`) | same |
| padding | 16px | same |
| max-width | 80% (sm: prefix applies at ≥640px = most of the main column) | 90% |
| measured width | 499.9px (at 1440, the actual content "hey" is short so it's much smaller than max) | 98.4px |
| measured height | 56px | 56px |
| alignment | right-aligned via parent `flex justify-end` | right-aligned |
| inner `<p>` text color | rgb(255, 255, 255) (`text-white`) | same |
| inner text | "hey" | "hey" |

#### Answer paragraphs

Wrapper: `<div class="mb-8">`. Each paragraph split on `\n\n`:

```
mb-4 text-base leading-relaxed text-white/80
```

| Property | Value |
|---|---|
| font-size | 16px |
| font-weight | 400 |
| line-height | 26px (`leading-relaxed` = 1.625 × 16 = 26) |
| color | rgba(255, 255, 255, 0.8) / 0.8 opacity |
| font-family | Inter |
| margin-bottom | 16px between paragraphs |
| Fallback answer text | Renders from `ASK_RESPONSES.fallback.answer` (2–3 paragraphs) |

Inline verse references inside the answer are wrapped by `<LinkedAnswerText>` — any match of `parseVerseReferences` becomes a `<Link>` to `/bible/<book>/<chapter>#verse-<n>`.

#### "What Scripture Says" h2

```
mb-4 text-xl font-semibold text-white
```

| Property | Value |
|---|---|
| font-family | Inter |
| font-size | 20px (`text-xl`) |
| font-weight | 600 (`font-semibold`) |
| color | rgb(255, 255, 255) |
| margin-bottom | 16px |

#### Verse cards (3 cards, space-y-4 between them)

```
rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm
```

| Property | Value (computed) |
|---|---|
| background-color | rgba(255, 255, 255, 0.06) / 0.06 opacity |
| border | 1px solid rgba(255, 255, 255, 0.1) / 0.1 opacity |
| border-radius | 12px (`rounded-xl`) |
| padding | 20px |
| backdrop-filter | `blur(4px)` (`backdrop-blur-sm`) |

Verse reference `<Link>`:

```
font-bold text-primary-lt transition-colors hover:underline
```

| Property | Value |
|---|---|
| color | rgb(139, 92, 246) (`text-primary-lt` = #8B5CF6) |
| font-weight | 700 |
| text-decoration | none (underline only on hover) |

Verse body `<p>` (`{verse.text}`):

```
mt-2 font-serif italic text-white/70
```

| Property | Value |
|---|---|
| font-family | Lora |
| font-style | italic (confirmed rendered) |
| color | rgba(255, 255, 255, 0.7) / 0.7 opacity |
| margin-top | 8px |

Verse explanation `<p>` (`{verse.explanation}`):

```
mt-2 text-sm text-white/50
```

| Property | Value |
|---|---|
| font-family | Inter |
| font-size | 14px |
| color | rgba(255, 255, 255, 0.5) / 0.5 opacity |
| margin-top | 8px |

Below each verse text there is a `<VerseCardActions>` row (not separately audited here — ships as part of the card).

#### Encouragement callout (the Tier 2 thing)

```
mt-8 rounded-r-lg border-l-2 border-primary bg-white/[0.06] p-4
```

**This is a left-border accent callout — the border-radius is asymmetric.**

| Property | Computed value |
|---|---|
| border-left | 2px solid rgb(109, 40, 217) (`border-primary`) |
| border-top / border-right / border-bottom | 0 / 0 / 0 (no border except left) |
| border-radius | `0px 8px 8px 0px` (`rounded-r-lg` = right side only has radius) — so **left edge is square, right edge is rounded** |
| padding | 16px |
| background-color | rgba(255, 255, 255, 0.06) |
| margin-top | 32px |
| inner `<p>` color | rgba(255, 255, 255, 0.8) (`text-white/80`) |
| inner `<p>` font | Inter, 16px, 400 weight |

This is a lighter variant of the `09-design-system.md` Tier 2 scripture callout — note the spec callout uses `border-l-4`, this one uses `border-l-2` (thinner).

#### Prayer section ("Pray About This")

Two stacked `<p>`s inside a `<div class="mt-8">`:

Heading `<p>`:

```
mb-2 text-sm font-semibold text-white
```

- font-size: 14px
- font-weight: 600
- color: rgb(255, 255, 255) (fully opaque)

Prayer body `<p>`:

```
font-serif italic leading-relaxed text-white/60
```

- font-family: Lora
- font-style: italic (confirmed rendered)
- font-size: 16px
- line-height: 26px
- color: rgba(255, 255, 255, 0.6) / 0.6 opacity

#### AI disclaimer

```
mt-6 text-center text-xs text-white/60
```

- text "AI-generated content for encouragement. Not professional advice."
- font-size: 12px (`text-xs`)
- color: rgba(255, 255, 255, 0.6)
- text-align: center
- margin-top: 24px
- position: centered below the Prayer section, before "Dig Deeper"

#### "Dig Deeper" follow-up chips

Section wrapper: `mt-6 border-t border-white/10 pt-4`. Heading `<h3 class="mb-3 font-semibold text-white">Dig Deeper</h3>` (font-size 16px, font-weight 600, color rgb(255,255,255)).

Follow-up question count for the fallback response: **3 chips** (from `ASK_RESPONSES.fallback.followUpQuestions`).

Each chip:

```
inline-flex items-center gap-2 min-h-[44px] rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-[colors,transform] duration-fast active:scale-[0.98]
```

Default state (same values as the 6 topic chips in State 1, except these also contain a MessageCircle icon):

| Property | Value |
|---|---|
| display | inline-flex |
| gap | 8px (for icon + label spacing) |
| min-height | 44px |
| border-radius | 9999px (pill) |
| background-color | rgba(255, 255, 255, 0.1) |
| padding | 8px 16px |
| font-size | 14px (`text-sm`) |
| color | rgba(255, 255, 255, 0.7) |
| Icon (MessageCircle) | 16px × 16px (`h-4 w-4 shrink-0`), inherits `color: rgba(255, 255, 255, 0.7)` |
| transition | colors, transform @ 150ms (`duration-fast`) |
| active | `scale(0.98)` press feedback |

**NOTE: DigDeeper chips do NOT have the `border border-white/15` that the topic chips have.** They otherwise match the pill style.

Layout: mobile `flex-col gap-2`, `sm:` `flex-row flex-wrap gap-2`.

#### 4 action buttons (Ask another / Journal / Pray / Share)

Container: `mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row` — 2-col grid on mobile, flex row on ≥640px.

Each button:

```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors
```

| Property | Value |
|---|---|
| display | inline-flex |
| border-radius | 8px (`rounded-lg`) |
| background-color | rgba(255, 255, 255, 0.1) |
| padding | 8px 12px |
| min-height | 44px |
| gap | 8px (icon + text) |
| font-size | 14px |
| font-family | Inter |
| color (text) | rgba(255, 255, 255, 0.7) |
| border | none |
| icon | 16px × 16px (`h-4 w-4`) Lucide: RefreshCw / BookOpen / Heart / Share2 |
| icon color | inherits rgba(255, 255, 255, 0.7) |

Hover state (simulated on "Journal about this" at 1440):

| Property | Default | Hover |
|---|---|---|
| background-color | rgba(255, 255, 255, 0.1) | rgba(255, 255, 255, 0.15) |
| color | rgba(255, 255, 255, 0.7) | rgba(255, 255, 255, 0.7) (unchanged — no hover:text-white on action buttons unlike chips) |

Row height at 1440: **56px** (button `min-h-[44px]` + `py-2`/`px-3` + default intrinsic gap from grid).

#### Feedback row ("Was this helpful?")

Container: `mt-6 flex items-center justify-center gap-4`.

Label `<span>`:

```
text-sm text-white/60
```

- font-size: 14px
- color: rgba(255, 255, 255, 0.6)
- font-family: Inter

Thumbs up button:

```
min-h-[44px] min-w-[44px] rounded-lg bg-white/10 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors hover:bg-white/15
```

| Property | Value |
|---|---|
| min-height / min-width | 44px × 44px |
| background-color | rgba(255, 255, 255, 0.1) |
| border | none |
| border-radius | 8px |
| padding | 8px |
| `aria-label` | "Yes, helpful" |
| `aria-pressed` | `false` in default state |
| Icon | `ThumbsUp` Lucide, 20px × 20px |
| Icon color (default, feedback != 'up') | rgba(255, 255, 255, 0.6) (`text-white/60`) |
| Icon fill (default) | none |
| Icon pressed state | `fill-primary text-primary` → rgb(109, 40, 217) fill + text |

Thumbs down button: identical pattern, `aria-label="No, not helpful"`, pressed state uses `fill-danger text-danger` → `#E74C3C`.

### 2c measurements at 1440

| Metric | Value |
|---|---|
| Total page height | 3417px |
| User question bubble height | 56px |
| Dig Deeper h3 Y (absolute) | 2043px |
| Action button row Y (absolute) | 2207px |
| Action button row height | 56px |
| "Was this helpful?" span Y (absolute) | 2299px |

### 2c measurements at 375

| Metric | Value |
|---|---|
| User question bubble — x | 45.25 |
| User question bubble — y | 298 |
| User question bubble — width | 98.4px |
| User question bubble — height | 56px |

(Bubble is narrower than the max-w-[90%] allows because "hey" is only 3 chars.)

### Screenshots (response state)

- `state2a-before-submit-1440w.png` (textarea filled, response not yet rendered)
- `state2b-loading-1440w.png` (bouncing dots + pending bubble + Psalm 119:105 quote)
- `state2c-response-1440w.png` (full response, fallback variant — 3 verses)
- `state2c-response-375w.png` (same response at mobile)

---

## SECTION 3 — ConversionPrompt (logged-out, after response)

Rendered in `AskPage.tsx`:

```tsx
{!isAuthenticated && conversation.length > 0 && !conversionDismissed && (
  <ConversionPrompt onDismiss={...} prefersReducedMotion={...} />
)}
```

Component source: `components/ask/ConversionPrompt.tsx`.

Outer card:

```
mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm sm:p-5 lg:p-6 animate-fade-in
```

| Property | Value |
|---|---|
| background-color | rgba(255, 255, 255, 0.05) / 0.05 opacity (`bg-white/5`) |
| border | 1px solid rgba(255, 255, 255, 0.1) |
| border-radius | 16px (`rounded-2xl`) |
| padding | 16px (base), 20px (sm:), 24px (lg:) |
| backdrop-filter | `blur(4px)` (`backdrop-blur-sm`) — **confirmed applied** |
| margin-top | 32px |
| text-align | center |
| animation | `fade-in 0.25s cubic-bezier(0, 0, 0.2, 1)` (conditional on `prefersReducedMotion`) |
| box-shadow | none |

Heading:

```
text-lg font-semibold text-white
```

- text: "This is just the beginning."
- font-size: 18px (`text-lg`)
- font-weight: 600
- color: rgb(255, 255, 255) (fully opaque)

Body copy:

```
mx-auto mt-2 max-w-md text-sm text-white/70
```

- font-size: 14px
- color: rgba(255, 255, 255, 0.7)
- max-width: 448px (`max-w-md`)
- text-align: center (inherited)
- text: "Create a free account to save your prayers, journal your thoughts, track your growth, and join a community that cares."

Primary CTA `<Link to="/register">`:

```
inline-block min-h-[44px] rounded-full bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
```

| Property | Value |
|---|---|
| text | `"Get Started — It's Free"` |
| background-color | rgb(109, 40, 217) (`bg-primary`) |
| color | rgb(255, 255, 255) |
| font-weight | 600 |
| border-radius | 9999px (pill) |
| padding | 12px 24px |
| min-height | 44px |
| box-shadow | none (**contrast with the homepage primary white pill CTA pattern, which has `shadow-[0_0_30px_rgba(255,255,255,0.20)]`**) |
| hover | `bg-primary-lt` → rgb(139, 92, 246) |

Dismiss link (`<button>`):

```
mt-3 text-sm text-primary-lt hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]
```

- text: "Keep exploring"
- color: rgb(139, 92, 246) / `text-primary-lt` → resolved = **rgb(139, 92, 246)** (no alpha — full #8B5CF6)
- font-size: 14px
- margin-top: 12px
- hover: `underline` (text-decoration: underline — no color change)

Contrast note: "Keep exploring" is a `<button>` not an `<a>`, so it has no default underline — underline only appears on hover.

---

## SECTION 4 — Measurements

### 4.1 — /ask empty, viewport 1440 × 900

| Metric | Value |
|---|---|
| Hero section `<section>` height (h1 top → subtitle bottom) | **138px** (h1 top at 286, subtitle bottom at 424) |
| Hero `<section>` bounding-box height (from `element.offsetHeight`) | 346px (includes pt-40, pb-12, HeadingDivider) |
| Gap between subtitle bottom and textarea top | **104px** (subtitle bottom at 424, textarea top at 528) |
| Textarea height | 98px (3-row default, 12px padding × 2 + ~23px line-height × 3) |
| Chip grid height | 148px |
| Chip row Ys | [648, 648, 700, 700, 752, 752] → 3 distinct rows (chips of 2 each at 1440, matching `flex flex-wrap justify-center`) |
| "Find Answers" button height | 48px (36px text + 12px padding) |
| "Find Answers" button Y | 820px |
| Popular Topics h2 Y | **900px** (= viewport bottom at 1440×900) |
| Total page height (empty) | 2016px |

### 4.2 — /ask empty, viewport 375 × 812

| Metric | Value |
|---|---|
| Hero section height (h1 top → subtitle bottom) | **142px** (h1 top at 258, subtitle bottom at 400) |
| Gap between subtitle bottom and textarea top | 72px |
| Textarea height | 98px |
| Chip grid height | **304px** |
| Chip row Ys | [592, 644, 696, 748, 800, 852] → **6 distinct rows (all chips stacked, one per row)** |
| "Find Answers" button height | 48px |
| Popular Topics h2 Y | **1000px** |
| Popular Topics above the fold (viewport = 812)? | **NO** (needs 188px of scroll) |
| Total page height (empty) | 2944px |

**The chip grid does NOT wrap into a 2-3-2-ish layout on mobile.** Each chip is wide enough that `flex-wrap justify-center` breaks every chip to its own row, producing a 6-row stack.

### 4.3 — /ask + submitted "hey", viewport 1440 × 900

| Metric | Value |
|---|---|
| Total page height (post-response) | **3417px** |
| User question bubble height | 56px |
| "Dig Deeper" h3 Y (absolute) | **2043px** |
| Action button row Y (absolute) | 2207px |
| Action button row height | 56px |
| "Was this helpful?" span Y (absolute) | **2299px** |

---

## SECTION 5 — Computed accessibility

### 5.1 — axe-core scan (`axe.run()` on `/ask` empty state, logged out)

axe-core **4.10.3** was injected from CDN and run against the default config (WCAG 2.0/2.1 A + AA).

**Critical or serious violations:**

| ID | Impact | Help | Nodes |
|---|---|---|---|
| `color-contrast` | **serious** | Elements must meet minimum color contrast ratio thresholds | **2 nodes** — `.text-[11px]` and `.text-xs` |

Those two targets are the footer links ("Open the App Store to download" / copyright text) — SiteFooter, not the /ask main content. No critical violations. No violations on any of the /ask-specific interactive controls (textarea, chips, submit button, popular topic cards).

### 5.2 — Manual WCAG AA contrast ratios

Formula: WCAG 2.x relative luminance, alpha composited onto the nearest opaque ancestor. Format: fg (token+resolved) : bg (resolved after composite) = ratio (PASS/FAIL at 4.5:1).

| # | Check | fg | bg (resolved) | Ratio | WCAG AA |
|---|---|---|---|---|---|
| 1 | Subtitle text (`text-white/60`) on hero bg `#0F0A1E` (dashboard-dark) | rgba(255, 255, 255, 0.6) / 0.6 opacity | rgb(15, 10, 30) | **7.24:1** | PASS |
| 2 | Topic chip text (`text-white/70`) on chip `bg-white/10` over dashboard-dark | rgba(255, 255, 255, 0.7) / 0.7 opacity | rgb(39, 35, 53) | **8.20:1** | PASS |
| 3 | Popular topic description (`text-white/50`) on card `bg-white/[0.06]` over dashboard-dark | rgba(255, 255, 255, 0.5) / 0.5 opacity | rgb(29, 25, 44) | **5.17:1** | PASS |
| 4 | "Find Answers" button text (white) on `bg-primary` #6D28D9 | rgb(255, 255, 255) | rgb(109, 40, 217) | **7.10:1** | PASS |
| 5 | Verse reference link (`text-primary-lt` #8B5CF6) on verse card `bg-white/[0.06]` over dashboard-dark | rgb(139, 92, 246) | rgb(29, 25, 44) | **4.05:1** | **FAIL** |
| 6 | Verse explanation (`text-white/50`) on verse card `bg-white/[0.06]` over dashboard-dark | rgba(255, 255, 255, 0.5) / 0.5 opacity | rgb(29, 25, 44) | **5.17:1** | PASS |
| 7 | Action button text (`text-white/70`) on `bg-white/10` over dashboard-dark | rgba(255, 255, 255, 0.7) / 0.7 opacity | rgb(39, 35, 53) | **8.20:1** | PASS |
| 8 | Feedback "Was this helpful?" (`text-white/60`) on dashboard-dark (no intermediate bg) | rgba(255, 255, 255, 0.6) / 0.6 opacity | rgb(15, 10, 30) | **7.24:1** | PASS |

### 5.3 — Bonus / related contrast checks (still under 4.5:1 or otherwise notable)

| Check | fg | bg | Ratio | WCAG AA |
|---|---|---|---|---|
| Verse body italic (`text-white/70` Lora italic) on verse card over dashboard-dark | rgba(255, 255, 255, 0.7) | rgb(29, 25, 44) | 8.89:1 | PASS |
| Encouragement callout body (`text-white/80`) on `bg-white/[0.06]` over dashboard-dark | rgba(255, 255, 255, 0.8) | rgb(29, 25, 44) | 11.27:1 | PASS |
| Prayer body (`text-white/60` Lora italic) on dashboard-dark | rgba(255, 255, 255, 0.6) | rgb(15, 10, 30) | 7.24:1 | PASS |
| AI disclaimer (`text-white/60 text-xs`) on dashboard-dark | rgba(255, 255, 255, 0.6) | rgb(15, 10, 30) | 7.24:1 | PASS |
| Answer paragraph (`text-white/80`) on dashboard-dark | rgba(255, 255, 255, 0.8) | rgb(15, 10, 30) | 12.39:1 | PASS |
| Topic card title (`text-white/80 font-semibold`) on card over dashboard-dark | rgba(255, 255, 255, 0.8) | rgb(29, 25, 44) | 11.27:1 | PASS |
| Chevron icon (`text-white/40`) on card over dashboard-dark | rgba(255, 255, 255, 0.4) | rgb(29, 25, 44) | **3.79:1** | **FAIL (decorative — icon has `aria-hidden="true"`, exempt from WCAG text contrast under SC 1.4.11 for inactive UI-component boundaries, but still below 3:1 non-text target at 3.79:1... actually 3.79 >= 3.0 so it passes SC 1.4.11 non-text)** |
| Thumb icon (`text-white/60`) on thumbs button `bg-white/10` over dashboard-dark | rgba(255, 255, 255, 0.6) | rgb(39, 35, 53) | 6.42:1 | PASS |
| Placeholder text (`placeholder:text-white/50`) on textarea `bg-white/[0.06]` over dashboard-dark | rgba(255, 255, 255, 0.5) | rgb(29, 25, 44) | 5.17:1 | PASS |
| ConversionPrompt body (`text-white/70`) on `bg-white/5` over dashboard-dark | rgba(255, 255, 255, 0.7) | rgb(27, 22, 41) | 9.04:1 | PASS |
| ConversionPrompt dismiss "Keep exploring" (`text-primary-lt` #8B5CF6) on `bg-white/5` over dashboard-dark | rgb(139, 92, 246) | rgb(27, 22, 41) | **4.15:1** | **FAIL** |
| UserQuestionBubble text (`text-white`) on `bg-primary/20` over dashboard-dark | rgb(255, 255, 255) | rgb(34, 16, 67) | 17.16:1 | PASS |

### 5.4 — Contrast failures summary

Two `text-primary-lt` (#8B5CF6) links/labels fail WCAG AA 4.5:1 on their respective card backgrounds:

1. **Verse reference link** — 4.05:1 on `bg-white/[0.06]` over dashboard-dark — the most visible occurrence (repeated 3× per response)
2. **ConversionPrompt dismiss "Keep exploring"** — 4.15:1 on `bg-white/5` over dashboard-dark

Both are normal-size body text (font-size ≤ 18px), so the 4.5:1 threshold applies (not the 3:1 large-text threshold).

No other failures in body content. The two axe-flagged footer items (`.text-[11px]` / `.text-xs`) are outside the /ask recon scope (SiteFooter).

---

## SECTION 6 — Animation behavior

### 6.1 — /ask empty state load

Nothing animates in on the empty state.

Sampled DOM at mount at three timepoints (50ms / 300ms / 800ms after `goto`) — the only element with a non-`none` animation-name is the ConversionPrompt (which is present in the DOM but hidden because `conversation.length === 0`) — it references `motion-safe:animate-fade-in` but is not mounted here because the component returns null. Enumerating all elements with `animation-name !== 'none'` on the empty state:

```json
[
  {
    "tag": "div",
    "cls": "motion-safe:animate-fade-in",
    "animationName": "fade-in",
    "animationDuration": "0.25s",
    "animationTimingFunction": "cubic-bezier(0, 0, 0.2, 1)"
  }
]
```

**Note:** that one div IS in the DOM on empty state — it's an empty `<div aria-live="polite">` container used for the response slot, carrying the `motion-safe:animate-fade-in` class from a skeleton wrapper. It has no visible effect because it has no content.

**No shimmer, no gradient-shift, no shine, no pulse animations on the empty page.** The hero radial gradient (`ATMOSPHERIC_HERO_BG`) is static — no keyframes.

Screenshots: `state6-emptyload-50ms.png` (white-ish blank before hydration), `state6-emptyload-300ms.png` (fully rendered), `state6-emptyload-800ms.png` (identical to 300ms — no delayed animation).

### 6.2 — Animation tokens referenced in the rendered /ask className set

Only two custom animation classes appear in the rendered DOM across all states:

| Class | animationName | animationDuration | animationTimingFunction | Source |
|---|---|---|---|---|
| `animate-fade-in` | fade-in | 0.25s | cubic-bezier(0, 0, 0.2, 1) (`decelerate`) | Used on ConversionPrompt, "Thank you for your feedback!" toast, and the `aria-live` response slot |
| `animate-fade-in-up` | fade-in-up | 0.25s | cubic-bezier(0, 0, 0.2, 1) (`decelerate`) | Used on `AskResponseDisplay` root (entire response block) |
| `motion-safe:animate-bounce` | bounce (Tailwind default) | 1s | cubic-bezier(0, 0, 0.2, 1) (browser default easing for the bounce keyframe) | Used on the 3 loading dots |

No other animations (no shimmer, no gradient-shift, no shine, no pulse, no glow-pulse, no typewriter) on /ask.

`transition: colors, transform duration-fast` is applied to chips and submit button — these are transitions, not animations. `duration-fast` resolves to **150ms** (from the BB-33 tokens).

### 6.3 — /ask?q=hey response entrance animation

After the 2000ms loading delay, the response block mounts with `animate-fade-in-up` on its root div:

```
<div class="animate-fade-in-up">
  <!-- answer, verses, Dig Deeper, actions, feedback -->
</div>
```

The response fades and slides up simultaneously over 250ms at `cubic-bezier(0, 0, 0.2, 1)` decelerate easing. ConversionPrompt also mounts with `animate-fade-in` (just fade, no translate) on the same 250ms decelerate curve.

Screenshots:
- `state6-response-just-appeared.png` (captured ~2050ms after click — very start of entrance)
- `state6-response-fading-in.png` (captured ~2450ms after click — animation complete)

### 6.4 — Simulated `prefers-reduced-motion: reduce`

Launched a fresh browser context with `reducedMotion: 'reduce'` on 1440×900. Screenshots:

- `state6-reduced-motion-empty.png` — identical to default empty state (no animations were running anyway)
- `state6-reduced-motion-response.png` — response appears without the fade-in-up translate/fade

Sampled DOM after response:

```json
{
  "fadeInExists": true,
  "fadeInClassName": "motion-safe:animate-fade-in",
  "fadeInAnimationName": "none",
  "fadeInAnimationDuration": "0s",
  "anyAnimated": false
}
```

**Under reduced motion, every animation is disabled** — `animationName: none`, `animationDuration: 0s`, and the page-wide `anyAnimated` check returns `false`. This is handled by the global safety net at `frontend/src/styles/animations.css` (BB-33), not by per-component checks. The `AskResponseDisplay` does conditionally apply the `animate-fade-in-up` class via a `prefersReducedMotion` JS check (see `AskResponseDisplay.tsx:41`) — but that JS check reads `window.matchMedia('(prefers-reduced-motion: reduce)').matches` lazily at component body evaluation. Because of the global CSS safety net, the animation is also zeroed even if the class is present.

The `ConversionPrompt` has the `motion-safe:` variant (`motion-safe:animate-fade-in` — Tailwind's built-in reduced-motion-aware variant), so the class itself drops out under reduced motion.

Loading dots (`motion-safe:animate-bounce motion-reduce:animate-none`): motion-reduce forces `animation: none`, the dots are present but static.

---

## Supplemental — Content exposed by the fallback response

For sizing checks in the v2 spec, note that "hey" → fallback, which ships with:

- `answer`: 2 paragraphs (~110 words total)
- `verses`: 3 entries, each ~50 words (reference + body + explanation)
- `encouragement`: 1 sentence (~15 words)
- `prayer`: 1 paragraph (~70 words)
- `followUpQuestions`: 3 chips

Other topic responses vary in length. `ASK_RESPONSES.suffering` has a 160-word answer + 3 verses (up to 80 words each). The page height of **3417px at 1440** is representative of "short" fallback; topic responses can run ~300-600px taller.

---

## Screenshot manifest

All saved to `frontend/playwright-screenshots/ask-recon/`:

```
state1-empty-375w.png
state1-empty-768w.png
state1-empty-1024w.png
state1-empty-1440w.png
state1-empty-1920w.png
state1-chip-hover-1440w.png
state2a-before-submit-1440w.png
state2b-loading-1440w.png
state2c-response-1440w.png
state2c-response-375w.png
state6-emptyload-50ms.png
state6-emptyload-300ms.png
state6-emptyload-800ms.png
state6-response-just-appeared.png
state6-response-fading-in.png
state6-reduced-motion-empty.png
state6-reduced-motion-response.png
raw-capture.json          (full computed-style JSON for all states)
capture.mjs               (main capture script)
fixup.mjs                 (subtitle + animation + gap re-capture)
contrast-calc.mjs         (contrast ratio computation)
```
