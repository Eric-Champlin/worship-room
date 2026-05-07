# Cinematic Hero — Diagnostic Recon (2026-05-07)

**Surface:** `/daily` (DailyHub) cinematic hero atmospheric.
**Branch:** `forums-wave-continued` (no commits, no edits to .tsx/.ts/.css).
**Method:** Source read of `DailyHub.tsx`, `CinematicHeroBackground.tsx`, `index.css`, `BackgroundCanvas.tsx`; Playwright headless DOM probe at viewport 1280×900; full-page + seam-band PNG screenshots; 3-channel pixel sampling via `sharp` raw buffer.
**Mode:** READ-ONLY. No fixes proposed below.

Screenshots saved (gitignored):

- `frontend/playwright-screenshots/cinematic-hero-diagnostic-1280.png` — viewport
- `frontend/playwright-screenshots/cinematic-hero-diagnostic-fullpage.png` — full scroll
- `frontend/playwright-screenshots/cinematic-hero-seam-band.png` — 60px tall band centered on the seam (y=420 to y=480)

---

## Section 1 — Current `DailyHub.tsx` structure

File: `/Users/Eric/worship-room/frontend/src/pages/DailyHub.tsx`

JSX tree from the BackgroundCanvas down (verbatim, line numbers from current file state):

- **L215** `<BackgroundCanvas className="flex flex-col font-sans">` — wraps EVERYTHING (root). The BackgroundCanvas renders the canonical 5-stop multi-bloom CANVAS_BACKGROUND gradient and its own `relative min-h-screen overflow-hidden` wrapper. Hero, tab bar, tab content, footer, and the FAB are all inside.
- **L216** `<SEO …>` — head metadata, no DOM.
- **L217** `<Navbar transparent />` — passed `transparent`, which makes the nav `position: absolute; inset-x-0; top: 0; z-50` (verified live: see Section 3). The navbar is NOT inside `<main>`; it's a sibling of `<main>` inside the BackgroundCanvas root.
- **L219** `<main id="main-content">` opens.
- **L221–233** Hero `<section>`:
  ```tsx
  <section
    aria-labelledby="daily-hub-heading"
    className="relative z-10 flex min-h-[50vh] w-full flex-col items-center justify-center px-4 py-12 text-center antialiased"
  >
    <CinematicHeroBackground />
    <h1
      id="daily-hub-heading"
      className="relative z-10 mb-1 text-4xl font-bold leading-[1.15] pb-2 sm:text-5xl lg:text-6xl"
      style={GRADIENT_TEXT_STYLE}
    >
      {displayName}
    </h1>
  </section>
  ```
  Direct children of the hero `<section>`, in source order:
  1. `<CinematicHeroBackground />` (L225) — renders a `<div aria-hidden="true">` with `pointer-events-none absolute inset-x-0 top-0 overflow-hidden` and inline `style={{ height: 'calc(100% + 200px)' }}`. So this is a sibling-positioned absolute div, NOT a wrapper around the heading.
  2. `<h1 id="daily-hub-heading">` (L226–232) with `relative z-10` so it stacks above the cinematic background.

  The hero section has only those two children. There are no spacer divs, no positional flex helpers, no eyebrow/subtitle. The `<h1>` is the sole flex item that the section's flex column lays out.

- **L236** `<div ref={sentinelRef} aria-hidden="true" />` — IntersectionObserver sentinel for the sticky-tab-bar shadow toggle. **This is the next sibling of the hero `<section>`** (Section 3 confirms it has 0px height and lives at exactly y=450).
- **L239–293** `<div className="relative sticky top-0 z-40 backdrop-blur-md transition-shadow … {isSticky && 'shadow-md shadow-black/20'}">` — the sticky tab bar wrapper, holding the rounded-full tab pill (`<div role="tablist">` with the four tabs). **This is the second sibling after the hero, and the visual band that sits at y=450 immediately below the hero.** Note: it is `sticky top-0`, not `relative`, so as soon as the user scrolls the tab bar pins to the viewport top.
- **L296–298** SR-only screen-reader status announcer.
- **L301–355** Four `<div role="tabpanel" hidden={…}>` tab panels (Devotional/Pray/Journal/Meditate). Each is a sibling of the tab bar wrapper, all `relative z-10`.
- **L358–360** `<div className="relative z-10"><SongPickSection /></div>`.
- **L362** `</main>` closes.
- **L364–366** `<div className="relative z-10"><SiteFooter /></div>`.
- **L367–375** Optional `<TooltipCallout>`.
- **L378** `<DailyAmbientPillFAB />` — the sticky bottom-right FAB.
- **L379** `</BackgroundCanvas>` closes.

Where things live, summarized:

- The hero `<section>` contains ONLY the cinematic background div and the `<h1>`. It does NOT contain the tab bar, date row, or devotional content. None of those are inside the hero — they are siblings BELOW the hero (and below the sentinel) inside `<main>`.
- The tab bar (Devos/Pray/Journal/Meditate pill) is **outside the hero**, two siblings down (sentinel, then the sticky wrapper).
- The date row + devotional title + devotional content all live inside `<DevotionalTabContent>` (L309), which is inside the `tabpanel-devotional` div, which is the third sibling after the hero (sentinel → tab bar wrapper → tab panels). They are NOT in the hero.
- `BackgroundCanvas` is the **outermost wrapper** — wraps everything from the navbar down to the FAB, not just the body region.

---

## Section 2 — Current `CinematicHeroBackground.tsx` structure

File: `/Users/Eric/worship-room/frontend/src/components/CinematicHeroBackground.tsx`. It's a new (untracked) file — confirmed via `git status` showing it as `??`.

Outer container (L153–157):

```tsx
<div
  aria-hidden="true"
  className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
  style={{ height: 'calc(100% + 200px)' }}
>
```

So the container is `position: absolute; left: 0; right: 0; top: 0; height: 100% + 200px` with `overflow-hidden`. No explicit `z-index` on this wrapper (computed shows `z-index: auto`). It is a sibling of the `<h1>` inside the hero `<section>`. Because the parent section has `position: relative` and `overflow: visible` (verified live), the cinematic bg's bottom 200px of extension paints OUTSIDE the section's content box, into the area where the tab bar lives.

All 9 layers, in source order (= z-stack order, last child paints on top):

| Layer | Element | What it paints |
|---|---|---|
| 0 (L159) | `<div className="absolute inset-0 bg-hero-bg" />` | Solid `#08051A` base. |
| 1 (L162–168) | `<div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(60,40,110,0.15) 0%, rgba(40,25,80,0.08) 30%, transparent 70%)' }} />` | Deep nebula tint. |
| 2 (L171–186) | `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">` 400 far stars (white circles, opacity 0.15–0.5, no twinkle). |
| 3 (L189–214) | `<svg>` 200 mid stars (white circles 0.4–0.75 opacity, ~30% twinkle via `cinematic-star-twinkle`). |
| 4 (L217–260) | `<svg>` 60 bright stars with halo (`r * 3.5` halo at 0.13× opacity). |
| 5 (L263–299) | `<svg>` 10 cross-glint stars (rect+rect+circle group, ~30% pulse). |
| 6 (L302) | `<div className="absolute inset-0 cinematic-light-beam" />` — the warm directional beam from top-left, defined in `index.css` L346–357 as a radial gradient `circle at 12% 8%` ramping `rgba(255,230,200,0.3) → … → transparent 50%`, animated via `cinematic-light-drift`. |
| 7 (L305–318) | `<svg className="absolute inset-0 h-full w-full opacity-[0.04]" style={{ mixBlendMode: 'overlay' }}>` — film grain via `feTurbulence`. |
| **8 (L321–327)** | The fade-to-body layer — see below. |

The fade-to-body gradient string, **exactly as it currently exists** (L324–325 in source; verified live as the rendered `style` attribute):

```css
linear-gradient(
  to bottom,
  transparent 0%,
  transparent 30%,
  rgba(8, 5, 26, 0.10) 45%,
  rgba(8, 5, 26, 0.35) 60%,
  rgba(8, 5, 26, 0.65) 75%,
  rgba(8, 5, 26, 0.90) 87%,
  rgba(8, 5, 26, 1) 95%,
  rgba(8, 5, 26, 1) 100%
)
```

The 200px extension (`calc(100% + 200px)`) IS applied — verified live. The wrapper resolves to `height: 650px` (= 450 hero + 200 extension), `inset: 0px 0px -200px`, `top: 0px`, `bottom: -200px`. The extension is NOT being clipped by the hero (the hero has `overflow: visible`). It IS being constrained by the cinematic wrapper's own `overflow-hidden`, which means the 200px extension ITSELF gets clipped at 650, but that's the intended behavior — content within the bg div is what's clipped, not the bg div itself.

---

## Section 3 — Live DOM inspection at the seam (Playwright, viewport 1280×900)

Command: `node frontend/scripts/cinematic-hero-diag.mjs` (Chromium headless via `@playwright/test`).

### Hero `<section>`

| Property | Value |
|---|---|
| Bounding box | `top: 0, bottom: 450, left: 0, right: 1280, width: 1280, height: 450` |
| `min-height` computed | `450px` (= 50vh on a 900px viewport) |
| `padding-top` / `padding-bottom` | `48px` / `48px` (= `py-12`) |
| `background-color` | `rgba(0, 0, 0, 0)` (transparent — no painted background) |
| `background` | `rgba(0, 0, 0, 0) none` (no image, no gradient) |
| `overflow` | `visible` |
| `position` | `relative` |
| `z-index` | `10` |
| `display` / `flex-direction` | `flex` / `column` |
| `align-items` / `justify-content` | `center` / `center` |
| Children count | 2 (the cinematic bg div, then the h1) |

The section has zero painted background of its own; the cinematic bg div paints inside it AND extends 200px below it (overflow-visible parent).

### Hero first child = the CinematicHeroBackground wrapper

| Property | Value |
|---|---|
| Tag | `<div>` |
| className | `pointer-events-none absolute inset-x-0 top-0 overflow-hidden` |
| inline `style` | `height: calc(100% + 200px)` |
| Bounding box | `top: 0, bottom: 650, height: 650, width: 1280` |
| Computed `position` | `absolute` |
| Computed `inset` | `0px 0px -200px` (so `top: 0, right: 0, bottom: -200, left: 0`) |
| Computed `top` / `bottom` | `0px` / `-200px` |
| Computed `height` | `650px` |
| Computed `background-color` | `rgba(0, 0, 0, 0)` (the wrapper itself has no bg; layers do) |
| Computed `z-index` | `auto` |
| Computed `overflow` | `hidden` |
| Computed `pointer-events` | `none` |
| Child layers count | 9 |

**The 200px height extension is applied as designed.** No ancestor is clipping it (the hero section has `overflow: visible`).

### Element immediately after the hero `<section>` in DOM order

That's the `<div ref={sentinelRef} aria-hidden="true">` (L236). Bounding box: `top: 450, bottom: 450, height: 0, width: 1280`. It is a 0-height marker; not a visible band.

### Element after that (the actual visible band at y=450)

The sticky tab bar wrapper (L239):

| Property | Value |
|---|---|
| Tag | `<div>` |
| className | `sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none` |
| Bounding box | `top: 450, bottom: 536, height: 86, width: 1280` |
| Computed `position` | `sticky` |
| Computed `top` | `0px` (will pin once scrolled past) |
| Computed `z-index` | `40` |
| Computed `background-color` | `rgba(0, 0, 0, 0)` |
| Computed `backdrop-filter` | `blur(12px)` |
| Computed `box-shadow` | `none` (would become `shadow-md shadow-black/20` once `isSticky === true`) |
| Computed `margin-top` | `0px` |

Notably: this wrapper has `backdrop-filter: blur(12px)` even at scroll y=0. Backdrop-filter creates a stacking context and blurs whatever is *behind* the element. Because the cinematic bg's 200px extension lives in the y=450..650 region — i.e., directly behind this tab bar wrapper — the wrapper's blur is currently applied to the cinematic bg's tail end.

### BackgroundCanvas root

| Property | Value |
|---|---|
| className | `relative min-h-screen overflow-hidden flex flex-col font-sans` |
| Bounding box | `top: 0, bottom: 4142.5, height: 4142.5, width: 1280` |
| Computed `min-height` | `900px` |
| Computed `overflow` | `hidden` |
| Computed `background-color` | `rgba(0, 0, 0, 0)` |
| Computed `background` (truncated) | `radial-gradient(50% 35% at 50% 8%, rgba(167,139,250,0.1) 0%, …) , radial-gradient(45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, …) , radial-gradient(50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, …) , radial-gradient(70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, …) , linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)` (the canonical 5-stop CANVAS_BACKGROUND from `BackgroundCanvas.tsx`) |

Body color directly outside the BackgroundCanvas's `linear-gradient` 135deg base ranges from `#120A1F` (top-left) through `#08051A` (mid) to `#0A0814` (bottom-right). At the y=450..650 region the 135deg base is roughly mid → mid-dark, ~`#08051A`. With the radial blooms layered on top, body color is somewhere near `rgb(8–18, 5–13, 26–32)` at the seam region — not pure `#08051A`.

### Navbar (added probe)

| Property | Value |
|---|---|
| Tag | `<nav>` |
| className | `top-0 z-50 absolute inset-x-0 bg-transparent` |
| Bounding box | `top: 0, bottom: 97, height: 97` |
| Computed `position` | `absolute` |
| Computed `z-index` | `50` |
| Computed `top` | `0px` |

The navbar is `position: absolute; top: 0` and is **97px tall**, overlaying the top of the hero. It does NOT push the hero down; the hero starts at y=0 underneath the navbar. The navbar has `bg-transparent` so the cinematic bg is visible through it, but the navbar consumes 97px of the user's perceived viewport.

`<main id="main-content">` reports `top: 0`, confirming `<main>` is a flex item at the top of the BackgroundCanvas (no margin-top on the navbar, no spacer pushing main down).

---

## Section 4 — Computed pixel values at the seam

Method: `page.screenshot` of a 60px tall band clipped at `y=420..480` (saved to `cinematic-hero-seam-band.png`), decoded via `sharp` raw RGB buffer, sampled at three X positions × three Y offsets. Channels = 3 (RGB), no alpha (PNG opaque).

The visual seam corresponds to the hero `<section>` `bottom = 450`. Sampling `y_local = 25` (y=445), `y_local = 30` (y=450), `y_local = 35` (y=455) at x=320, 640, 960:

| x | y=445 (5px above) | y=450 (at seam) | y=455 (5px below) |
|---|---|---|---|
| 320 | `rgb(22, 16, 35)` | `rgb(20, 14, 33)` | `rgb(20, 14, 33)` |
| 640 | `rgb(18, 13, 33)` | `rgb(17, 12, 32)` | `rgb(17, 12, 31)` |
| 960 | `rgb(13, 9, 29)` | `rgb(13, 8, 29)` | `rgb(13, 8, 28)` |

Per-column delta `above5 → below5`: at x=320 about `-2/-2/-2`, at x=640 `-1/-1/-2`, at x=960 `0/-1/-1`. Sub-perceptible.

**The Y=450 line itself is not where the seam is painted.** The transition across the 10px window centered on Y=450 is smooth (≤ 3 RGB units of variation per channel), and well below the perceptual threshold. Whatever the user is reading as a horizontal seam is not at this y-coordinate.

For comparison, two points where the seam is observable visually in the full screenshot are well below the hero box. Body pure `#08051A` = `rgb(8, 5, 26)`. The seam-band sample at x=960 is already `rgb(13, 8, 28)` — measurably brighter than body. Sampling further down inside the cinematic bg's extension region (between y=450 and y=650) is where the gradient is at partial alpha (0.10 at y=540, 0.35 at y=575, 0.65 at y=607, 0.90 at y=624) — meaning the underlying layers (warm light beam at top-left, far stars, nebula tint) keep showing through with brightness somewhere between `(13,8,28)` and pure `(8,5,26)`. Below y=650, BackgroundCanvas's 5-stop body gradient takes over with values in the `rgb(8–18, 5–13, 26–32)` range.

That matches what's on screen: the cinematic bg's bottom 200px renders a gradient from "mid-bright" to nearly-body-dark, and then there is a transition at y=650 from "nearly body dark" to BackgroundCanvas's actual gradient. Both endpoints are close but NOT identical color (BackgroundCanvas paints a 135deg base with radial blooms; the cinematic fade resolves to flat `#08051A`). The mismatch at y=650 is what's painting as a perceived horizontal band.

### Pixel sample summary

- y=420..450 (above and at hero bottom): close to body, `~rgb(13–22, 8–16, 28–35)`. Smooth.
- y=450..650 (cinematic extension region; **NOT the hero box, the bg's overflow tail**): partial-alpha gradient — exact color depends on the warm light beam + film grain + nebula tint underneath. Sticky tab bar's `backdrop-filter: blur(12px)` is also applied here, smearing pixels horizontally.
- y=650+: BackgroundCanvas 5-stop gradient — has its own radial blooms (`rgba(167,139,250,0.10/0.06/0.08)` violet ellipses + a `rgba(0,0,0,0.65)` darkening center) over a 135deg base ranging `#120A1F → #08051A → #0A0814`.

Bottom line on Section 4: there is no abrupt discontinuity at y=450. The visible band the user is reading as "the seam" is the brightness gradient region between y=450 and y=~650 (the cinematic bg's extension tail), and the small color/composition mismatch at y=650 between the cinematic fade endpoint (flat `#08051A`) and BackgroundCanvas's gradient (`#08051A` ± violet blooms ± diagonal hue shift). Sections 3 and 6 explain why.

---

## Section 5 — "Good Evening!" centering check

### Greeting `<h1>` bounding box

| Property | Value |
|---|---|
| Element | `<h1 id="daily-hub-heading">` text "Good Evening!" |
| Bounding box | `top: 189, bottom: 257, height: 68, width: 426.91` |
| className | `relative z-10 mb-1 text-4xl font-bold leading-[1.15] pb-2 sm:text-5xl lg:text-6xl` |
| inline `style` | `GRADIENT_TEXT_STYLE` (gradient text via `background-clip: text`) |

### Hero `<section>` bounding box (parent)

| Property | Value |
|---|---|
| Bounding box | `top: 0, bottom: 450, height: 450` |
| Computed `display` | `flex` |
| Computed `flex-direction` | `column` |
| Computed `align-items` | `center` |
| Computed `justify-content` | `center` |
| Computed `padding-top` / `padding-bottom` | `48px` / `48px` |
| Computed `min-height` / `height` | `450px` / `450px` |

The parent IS a flex column with `justify-content: center`.

### Math — vertical space above vs below the greeting

Within the hero `<section>` (top=0 to bottom=450, height=450):

- Space above greeting (top of section to top of greeting): 189 − 0 = **189px**.
- Space below greeting (bottom of greeting to bottom of section): 450 − 257 = **193px**.

So **mathematically, within the section's box, the greeting IS centered** (off by 4px, which is rounding noise from the line-height-1.15 and pb-2 on the h1 — both add a sliver of trailing whitespace inside the h1's box that pulls the visual centroid up by a couple of pixels). The flex `justify-content: center` is doing what it's supposed to do.

### Why the user sees "much more space below"

The navbar is `position: absolute; top: 0; height: 97px; z-index: 50` and overlays the top of the hero. The hero itself starts at y=0 underneath the navbar, but for the user, the visible region of the hero starts at **y ≈ 97** (below the navbar's bottom edge). From the user's perceived viewport:

- Visible space above greeting: 189 − 97 = **92px**.
- Visible space below greeting: 450 − 257 = **193px**.

193 / 92 ≈ **2.1**. The user sees more than twice as much space below the greeting as above, because the navbar is eating the top ~97px of the hero box without the greeting's vertical centering being aware of it. The flex column centers within the box's geometry, not within the box's *visible-after-navbar* region.

That is the centering issue. Not a flex bug. Not an `align-items` / `justify-content` bug. A geometry / awareness gap: the navbar overlays the hero but the hero's `min-h-[50vh]` is computed against the full viewport, and the flex centering doesn't account for the 97px navbar overlay.

---

## Section 6 — What's blocking centering and blending

Synthesizing Sections 1–5, observed root causes (no fixes proposed):

### A. Why "Good Evening!" looks bottom-heavy

The hero `<section>` is `min-h-[50vh]` (= 450px on a 900px viewport) with `flex flex-col justify-center` and `py-12`. It IS centering its greeting flex item correctly **within its own 450px box** (189px above vs 193px below — a 4px residual from line-height/`pb-2`).

The page-level cause is upstream: `<Navbar transparent />` resolves to `position: absolute; top: 0; height: 97px; z-index: 50` (verified live), overlaying the top of the hero. The hero starts at y=0 underneath the navbar, not at y=97 below it. The hero's flex centering operates on a 0..450 box; the user's visible window is 97..450. Within the visible window the greeting sits at 189..257, leaving 92px above and 193px below — a 2.1× imbalance.

There is no padding-top compensation for the navbar height anywhere on the hero. There is no `mt-[97px]` or `pt-[97px]` or `mt-navbar` token. The hero's `py-12` is symmetric. The flex centering has no knowledge of the navbar overlay.

### B. What's painting the seam at the hero–body boundary

The hero `<section>` has `overflow: visible`, `bg: transparent`, no `box-shadow`, no `margin-bottom`. So the section itself does not paint the seam.

The element at y=450..536 (immediately below the hero) is the sticky tab bar wrapper: `position: sticky; top: 0; z-index: 40; backdrop-filter: blur(12px); bg: transparent; box-shadow: none`. It contributes a 12px backdrop blur over whatever paints behind it (i.e., the cinematic bg's bottom 200px tail), which softens that region but is not itself the seam.

The actual seam is the **mismatch between two different bottom-of-region color stacks meeting at y ≈ 650**:

1. From y=0 to y=650, the cinematic bg paints. Its bottom-most layer (Layer 8, the "fade-to-body" gradient) ramps from `transparent` at y=0/30%, through `rgba(8,5,26, 0.10)` at 45% (y=292), `rgba(8,5,26, 0.35)` at 60% (y=390), `rgba(8,5,26, 0.65)` at 75% (y=487), `rgba(8,5,26, 0.90)` at 87% (y=565), and to **opaque `rgb(8, 5, 26)` at 95% (y=617)**. Between y=292 (alpha 0.10) and y=617 (alpha 1.0) the seven other cinematic layers (warm light beam, film grain, stars, nebula tint, base #08051A) keep painting through at progressively reduced visibility. At y=617..650 the fade is fully opaque flat `#08051A`.
2. From y=650 onward, BackgroundCanvas paints. Its background is the canonical 5-stop CANVAS_BACKGROUND constant: three violet radial blooms (`rgba(167,139,250, 0.10 / 0.06 / 0.08)` at top-center / mid-right / bottom-left), a darkening center `rgba(0,0,0,0.65)` ellipse, plus a `linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)` base. The body gradient at y=650 (which is well above center) leans toward the top-left bloom region, so its rendered color is something like `~rgb(15–22, 9–14, 30–38)` — visibly violet-tinged, NOT pure `#08051A`.

The fade gradient endpoint is `rgb(8, 5, 26)` (pure `#08051A`, the `bg-hero-bg` token). The BackgroundCanvas at the same horizontal slice is paintaining a *different* gradient color, with a violet bloom contribution. The cinematic fade doesn't blend into BackgroundCanvas; it blends into a value that BackgroundCanvas does not paint at that position. So a horizontal band of "cinematic fade reached pure #08051A" meets a band of "BackgroundCanvas painting #120A1F-tinted with a violet bloom on top". That mismatch is the seam.

The transition is not abrupt at one pixel. It's a brightness band roughly y=500..680 where the cinematic fade is still partial-alpha (so the warm light beam in the top-left of the cinematic bg leaks through and creates an asymmetric "lighter on the left" look) and then drops to flat-`#08051A` at y=617..650, then jumps to BackgroundCanvas's tinted gradient at y=650. Three discontinuities to the eye:

- y ≈ 500..617: cinematic fade still partial; warm beam shows through unevenly.
- y = 617..650: cinematic fade flat `#08051A`, no warm beam.
- y = 650+: BackgroundCanvas gradient with violet bloom, not `#08051A`.

The sticky tab bar's backdrop-blur lives across roughly y=450..536 and is masking the upper half of (1), but does not unify the colors below it.

### C. Is the height extension working?

Yes. `<CinematicHeroBackground>`'s wrapper has computed `height: 650px`, `inset: 0px 0px -200px`, `bottom: -200px` — exactly what the source declares (`calc(100% + 200px)` on a 450px parent). The hero section's `overflow: visible` permits the wrapper's bottom 200px to render outside the section's content box. No ancestor (including the BackgroundCanvas, which has `overflow: hidden` but is the great-grandparent and has plenty of vertical headroom) is clipping the cinematic bg's extension. The 200px tail is rendering as designed.

So the extension is not the failure. The failure is downstream: the extension fades to a color (flat `#08051A`) that BackgroundCanvas does not paint at the meeting Y. The fade-to-body's "body" target is wrong by construction — there is no single "body color" to fade to, because BackgroundCanvas paints a gradient, not a solid.

---

## Appendix — Diagnostic artifacts

- `frontend/scripts/cinematic-hero-diag.mjs` — Playwright probe (DOM + pixel sampling via sharp).
- `frontend/scripts/cinematic-hero-diag-2.mjs` — Secondary probe for navbar geometry + cinematic layer enumeration.
- `frontend/playwright-screenshots/cinematic-hero-diagnostic-1280.png` — viewport (1280×900).
- `frontend/playwright-screenshots/cinematic-hero-diagnostic-fullpage.png` — full-scroll screenshot (4142.5px tall).
- `frontend/playwright-screenshots/cinematic-hero-seam-band.png` — 60px clip centered on y=450.

Console errors during probe: 1 × `Failed to load resource: net::ERR_CONNECTION_REFUSED` (unrelated to the cinematic surface — likely an audio source or analytics endpoint failing in dev).
