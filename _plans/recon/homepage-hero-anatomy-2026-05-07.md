# Homepage Hero Anatomy — Inner-Page Rollout Recon

**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**Status:** Read-only research. No code changed.
**Purpose:** Surface the facts and open questions Eric needs to decide whether to port the homepage hero treatment to inner pages.

---

## TL;DR for the impatient

- One MP4 (~12 MB) hosted on **CloudFront** (`d8j0ntlcm91z4.cloudfront.net`). Not in repo.
- Always dimmed to **40% max opacity** via JS-driven RAF loop. Fades 0→0.4 in first 0.5s, 0.4→0 in last 0.5s, blackout 100ms, restart.
- **`bg-hero-bg` (#08051A)** behind the video; `from-hero-bg` top + bottom gradient overlays sandwich it. The "fade-into-body" is a top/bottom gradient overlay, **not a CSS mask**.
- `prefers-reduced-motion`: video element is **not rendered at all** (`{!prefersReduced && <video />}`). Section degrades to pure gradient.
- The hero is **not a reusable primitive today.** `HeroSection.tsx` is bespoke for the homepage — typewriter input, "How're you feeling today?", quiz teaser. None of that maps cleanly to inner pages.
- Inner pages currently use a **completely different architecture** (`PageHero` + `BackgroundCanvas`), not video.

---

## Section 1 — Component anatomy

### Mount point

`frontend/src/pages/Home.tsx:48` mounts `<HeroSection />` inside `<main id="main-content">`, directly under the **transparent navbar** (`<Navbar transparent hideBanner />` at `Home.tsx:46`). The `transparent` prop on Navbar makes it `position: absolute` so the hero starts at viewport top with the navbar floating over it. The navbar is 100% glassmorphic — see project memory: "Navbar is always glassmorphic; `transparent` prop only controls positioning."

### File location & full DOM

`frontend/src/components/HeroSection.tsx:81-162`

```tsx
<section
  aria-label="Welcome to Worship Room"
  className={cn(
    'relative flex w-full flex-col items-center justify-start overflow-hidden text-center',
    'px-4 pt-36 pb-20 sm:pt-40 sm:pb-24 lg:pt-44 lg:pb-28',
    'bg-hero-bg antialiased'
  )}
>
  {/* Layer 0 — video (z-auto = 0). Conditionally rendered. */}
  {!prefersReducedMotion && (
    <video
      ref={setVideoEl}
      autoPlay muted playsInline aria-hidden="true"
      className="hero-video pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ opacity: 0 }}              // JS animates this 0 → 0.4 → 0
    >
      <source src={VIDEO_URL} type="video/mp4" />
    </video>
  )}

  {/* Layer 1a — top gradient overlay (z-1) */}
  <div
    className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-1/3
               bg-gradient-to-b from-hero-bg via-hero-bg/50 to-transparent"
    aria-hidden="true"
  />
  {/* Layer 1b — bottom gradient overlay (z-1) */}
  <div
    className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/3
               bg-gradient-to-t from-hero-bg via-hero-bg/50 to-transparent"
    aria-hidden="true"
  />

  {/* Layer 2 — content (z-10) */}
  <div className="relative z-10 mx-auto w-full max-w-3xl">
    <h1 className="hero-gradient-text mb-4 pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl"
        style={{ color: 'white', backgroundImage: WHITE_PURPLE_GRADIENT, ...textClipProps }}>
      How're You<br />Feeling Today?
    </h1>
    <p className="mx-auto mb-10 max-w-xl ...text-white/60 ...">Get AI-powered guidance...</p>
    <TypewriterInput onSubmit={handleInputSubmit} variant="glow" />
    <p className="mt-5 ...">Not sure where to start? <button>Take a 30-second quiz</button>...</p>
  </div>
</section>
```

### z-index choreography

| Layer | z-index | Element |
|---|---|---|
| Section background | 0 (auto, on `<section>`) | `bg-hero-bg` solid color |
| Video | 0 (auto, but absolute-positioned over bg) | `<video>` with JS-managed opacity 0–0.4 |
| Top + bottom overlays | `z-[1]` | gradient divs, `pointer-events-none` |
| Content | `z-10` | `<h1>`, subtitle, TypewriterInput, quiz teaser |

The Navbar (mounted by `Home.tsx`, **not** by `HeroSection`) is a sibling of the `<main>` element with `position: absolute` (via `transparent` prop), so it sits over the hero in stacking order. Navbar provides its own glassmorphic style.

### Padding spec (defines hero height)

`pt-36 pb-20 sm:pt-40 sm:pb-24 lg:pt-44 lg:pb-28`

Hero is intrinsically sized — height is `pt + content + pb`, no `min-h-screen`, no `aspect-ratio`. On a 1440×900 viewport with the typewriter + quiz teaser, observed height is roughly viewport-height-minus-fold (not measured precisely in this recon).

---

## Section 2 — Video asset

### Provenance

```
URL:  https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4
```

Defined as a string constant `VIDEO_URL` in `HeroSection.tsx:8-9`. **Not checked into the repo.** Hosted on Amazon CloudFront fronting an S3 bucket (storage class `INTELLIGENT_TIERING`).

The path segment `user_38xzZboKViGWJOttwIXH07lWA1P` and filename prefix `hf_20260308_114720_...` strongly suggest this is an AI-generated video from a third-party generation service (`hf` is consistent with Higgsfield / similar). Treat it as **AI-generated content from an external provider whose ongoing availability is not under our direct control** — see Section 7 open questions.

### File metadata (HEAD response)

| Property | Value |
|---|---|
| Content-Type | `video/mp4` |
| Content-Length | **12,047,303 bytes (~11.5 MB)** |
| Last-Modified | Sun, 08 Mar 2026 11:51:19 GMT |
| Cache-Control | `public, max-age=31536000, immutable` (1-year browser cache) |
| ETag | `"9ecdcaffec0e8d08314b548304408a24"` |
| accept-ranges | `bytes` (range requests supported) |
| Server | AmazonS3 via CloudFront PoP `ATL58-P4` |
| HTTP version | HTTP/2 + h3/QUIC alt-svc |

### Codec / dimensions / duration / audio

**Could not be determined in this recon** — `ffprobe` is not available on the dev machine. The browser receives MP4 only (no WebM fallback declared). What I can infer:

- File extension `.mp4` + `Content-Type: video/mp4` → MP4 container.
- Most likely H.264 + AAC (or H.265) — typical for AI-generation services. **Eric should confirm via DevTools → Network → media response, or by downloading and running `ffprobe` locally.**
- **Audio:** The `<video>` element has `muted` + `playsInline` and no `controls`. Whether the source file contains an audio track is unverified — `muted` mutes regardless, so it doesn't affect the user experience, but stripping audio would shave bytes.
- **Duration:** The `useVideoFade` hook reads `video.duration` and uses it dynamically — code does not hardcode duration. `ended` event is what triggers the loop restart, suggesting the video ends naturally rather than looping seamlessly.
- **Dimensions:** Unknown. `object-cover` on a full-section element means the video is cropped/scaled to cover whatever aspect ratio the section presents at any breakpoint.

### Loop handling

**Not seamless.** `HeroSection.tsx:61-68` wires an `ended` listener that:

1. Sets `video.style.opacity = '0'` immediately,
2. Waits 100ms,
3. Resets `currentTime = 0` and calls `video.play()`.

So the loop is JS-driven with a deliberate 100ms blackout between cycles. The 0.5s in/out fades on each side hide the reset boundary. There is no `loop` attribute on the `<video>` element.

### Poster frame

**No `poster` attribute is set.** Before the video has loaded enough frames to render, the section shows `bg-hero-bg` (#08051A solid black-purple) with the gradient overlays on top, plus the content layer. Slow-network users see the bg color until the first frames arrive.

### `preload` attribute

**Not set.** Browsers default to `preload="metadata"` (Chrome/Firefox) or `preload="auto"` (Safari, depending on connection). With `autoPlay`, browsers typically begin downloading aggressively regardless. **The 11.5 MB asset starts downloading on every homepage visit.**

---

## Section 3 — Visual treatment

### Bottom fade-into-body

Implemented via a **second gradient `<div>` overlay**, NOT a CSS `mask-image`.

- Top overlay: `h-1/3` of section, `from-hero-bg via-hero-bg/50 to-transparent` (top→bottom). Hides upper 33% of video; ensures navbar contrast.
- Bottom overlay: `h-1/3` of section, `from-hero-bg via-hero-bg/50 to-transparent` (bottom→top, via `bg-gradient-to-t`). Bottom 33% of video fades smoothly into the next section's `bg-hero-bg`.
- Middle 33% of section: video shows through at full 40% max opacity over `bg-hero-bg`.

The next section in `Home.tsx:49` is `<JourneySection />`, which itself uses `bg-hero-bg` as its base — so the gradient resolves into a consistent dark base color, no visible seam.

### Color overlays / blur / vignette

None beyond:
- The 40% opacity ceiling on the video itself (`VIDEO_MAX_OPACITY = 0.4`).
- The two gradient overlay divs.

No `backdrop-blur`, no color tinting layer, no vignette layer.

### Animations

- **Video itself drifts** (it's a video — content is whatever the generated MP4 contains).
- **Opacity envelope** is JS-driven via `requestAnimationFrame` reading `currentTime` / `duration`. See `HeroSection.tsx:28-79`.
- No CSS transition on the video element, no Ken Burns / scale animation.
- Loop is JS-managed (see Section 2 above).

### Heading gradient

`h1` uses `WHITE_PURPLE_GRADIENT` from `@/constants/gradients` clipped to text via `WebkitBackgroundClip: 'text'`. Class `hero-gradient-text` exists for the forced-colors-mode override (`index.css:270-275` reverts to plain `CanvasText`).

---

## Section 4 — Responsive behavior

### Same video at every breakpoint

There is no media query, no `<source media="..." />`, no responsive switch. The same 11.5 MB MP4 ships to every device, mobile included. `object-cover` reframes the video to fill whatever aspect ratio the section presents.

### Hero height by breakpoint

Driven by Tailwind padding tokens on the `<section>`:

- **Mobile (`<sm`):** `pt-36 pb-20` → 144px top + 80px bottom + content
- **Small/tablet (`sm`):** `pt-40 pb-24` → 160px + 96px + content
- **Large (`lg`):** `pt-44 pb-28` → 176px + 112px + content

Content `max-w-3xl`. No min-height enforcement; height grows with content (typewriter input + quiz teaser are fixed height, so it's effectively predictable).

### Fade adapts to short vs. tall heroes

The fade is `h-1/3` (33% of section height), so a taller hero gets a proportionally taller fade and a shorter one gets a shorter fade. The middle 33% always shows undimmed video. **This means a short hero (e.g., a hypothetical inner-page variant with less content) would have a smaller "video-visible window" — the overlays would dominate.**

---

## Section 5 — Performance & accessibility

### Lazy-load behavior

- `autoPlay muted playsInline` on the `<video>`, no `preload`, no `loading="lazy"` (which doesn't apply to `<video>` anyway).
- Browsers begin fetching as soon as the element mounts. Since `HeroSection` is at the top of `Home`, it's part of the initial render — the 11.5 MB download starts immediately for every homepage visitor without `prefers-reduced-motion`.

### LCP impact

The `<video>` is **likely not the LCP** because Lighthouse identifies LCP as the largest contentful element rendered above the fold. The `<h1>` ("How're You Feeling Today?") spans a wide area at 7xl text and would typically be the LCP candidate. The video starts at `opacity: 0` (CSS inline style) and only fades in once playback begins, so during the LCP measurement window it isn't visually contributing. **Worth verifying via Lighthouse — recon could not run live perf tests.**

11.5 MB on the critical path will hit `Total Blocking Time` and bandwidth budgets even if it isn't the LCP element. First-load on a slow 4G connection would noticeably delay TTI.

### `prefers-reduced-motion` fallback

Two-layer protection:

1. **Render-time guard:** `HeroSection.tsx:101` — `{!prefersReducedMotion && <video ... />}`. The video element isn't even rendered. The hook (`HeroSection.tsx:11-26`) listens to `matchMedia` change events.
2. **CSS safety net:** `index.css:219-221` — `.hero-video { display: none !important; }` inside `@media (prefers-reduced-motion: reduce)`. Belt-and-suspenders for any path where the video element does render.

Reduced-motion users see: `bg-hero-bg` + top/bottom gradient overlays + content. Static, calm, fully accessible.

### Slow-connection / load-failure fallback

There is **no explicit fallback**. No poster frame, no SVG/CSS gradient placeholder beyond the bg color the section already has. If CloudFront returns 404 or the connection is too slow, the user sees `bg-hero-bg` solid black-purple under the gradient overlays — visually identical to the reduced-motion state. Functionally fine; visually unremarkable.

### Accessibility

- `aria-hidden="true"` on the video — screen readers ignore it. ✅
- `pointer-events-none` — keyboard users can't accidentally tab into the video. ✅
- `<section aria-label="Welcome to Worship Room">` — landmark named. ✅
- `muted` autoplay — passes browser autoplay policy without user gesture. ✅
- No captions/transcript — but the video is decorative AI-generated abstract content with no spoken or written content, so captions are not required by WCAG. ✅
- HeroSection.test.tsx (`HeroSection.test.tsx`) covers the content layer (heading, input, quiz CTA, navigation, scroll behavior) but does **not** test video lifecycle, fade, or reduced-motion fallback.

---

## Section 6 — Adaptation feasibility

### Could the same hero be lifted to inner pages?

**Partially. The visual treatment can be lifted; the component cannot.**

`HeroSection.tsx` is a **bespoke component** with hardcoded content (heading text, subtitle, TypewriterInput, quiz teaser, navigation handler). It is not a reusable primitive — there is no `videoSrc` prop, no children slot, no title prop. To reuse the visual treatment (video + overlays + cinematic feel), you would either:

1. **Refactor HeroSection into a generic `<VideoHero>` primitive** with props for `videoUrl`, `posterUrl?`, `maxOpacity?`, `className?`, and a `children` slot for the content layer. Then port `HeroSection` to consume it (preserving homepage-specific content) and have inner pages compose their own content layer.
2. **Create a parallel `<InnerPageVideoHero>` component** that bakes in inner-page content patterns (PageHero-style heading + subtitle + optional CTA). Less reuse, more duplication, faster to ship per page.

Option 1 is the cleaner architecture; option 2 may be quicker if inner pages have wildly different content needs.

### What would change between homepage and inner-page mounting?

| Concern | Homepage | Inner-page implication |
|---|---|---|
| **Hero height** | `pt-36 pb-20` (large, viewport-filling-ish) | Inner pages currently use `pt-32 pb-8` (`PageHero.tsx:30`) — much shorter. A 1/3 top + 1/3 bottom fade on a short hero leaves a tiny middle window for video. Would need height adjustment OR fade-percentage adjustment per page. |
| **Content composition** | Heading + subtitle + TypewriterInput + quiz CTA | Inner pages are heading + subtitle + (optional CTA, divider, breadcrumbs). Less vertical content → shorter section → smaller video window. |
| **Background continuation** | Section bg = `bg-hero-bg`, next section also `bg-hero-bg` (seamless) | Inner pages use `BackgroundCanvas` (5-stop gradient) at page root. The video hero would need to overlay on `BackgroundCanvas`, OR replace `BackgroundCanvas` for the hero region only. The fade-out color must match whatever the body uses or the seam will be visible. |
| **Navbar interaction** | `<Navbar transparent hideBanner />` overlays the hero | Inner pages today mount `<Navbar />` non-transparent (their own dark bg). Would need to switch inner pages to `transparent` mode, which means the navbar's glassmorphic style now overlays a video. Current navbar style was designed against solid backgrounds — visual review needed. |
| **Above-the-fold content density** | Minimal — heading, input, one CTA | Inner pages often have heading + subtitle + tabs + first content card. Video behind dense content loses readability fast. |

### What would NOT carry over

- `TypewriterInput` glow variant + quiz scroll handler — homepage-specific behavior.
- The "How're You Feeling Today?" centerpiece — homepage UVP.
- The implicit assumption that the next section has `bg-hero-bg` to fade into — inner pages have varied next sections.

### Is the hero component reusable?

**Not as written.** The video logic (`usePrefersReducedMotion`, `useVideoFade`, video element + overlays) is tangled with content (heading, subtitle, input, CTA). Refactoring to extract a `<VideoHero>` primitive is the right move if Eric wants this pattern on multiple pages. Estimated scope for refactor: small-to-medium — the video-specific code is ~50 lines of clearly delineated hooks and JSX.

---

## Section 7 — Open questions for Eric

These are the decisions the recon cannot make for you. Each is load-bearing for any rollout plan.

1. **One video for all inner pages, OR per-page video assets, OR variant prop on a shared component?**
   - Same video everywhere keeps it simple, but the homepage video carries a "How're you feeling today?" emotional register that may not fit Settings or Insights.
   - Per-page videos multiply the bandwidth cost (each first-visit pays the full download) and the AI-generation cost.
   - Variant prop (e.g., `tone="ocean" | "forest" | "abstract"`) lets a small library of 2–4 videos cover the app.

2. **Performance budget — bandwidth math.**
   - Current single video: 11.5 MB. With 1-year `immutable` cache, repeat visits are free.
   - Adding the same video to 8 inner pages costs **0 additional bytes** for repeat visitors (browser cache is shared by URL).
   - Adding 8 different videos costs an additional ~80–90 MB across the app, paid one section at a time on first visit per section.
   - Mobile users on metered data are the bigger concern. Consider: do we want a `prefers-reduced-data` (Save-Data header) check that falls back to a static gradient or poster image even without `prefers-reduced-motion`?

3. **Cinematic look + content density tension.**
   - The homepage hero works partly because it's content-light (one heading, one input, one CTA). The video has room to breathe.
   - Inner pages are heavier (Daily Hub: tabs + multiple FrostedCards. Bible: chapter selector + Resume Reading + Today's Plan + streak chip). Putting a moving video behind dense UI is a readability risk.
   - Eric should decide: **does the cinematic treatment belong in the hero strip only (a smaller `~30vh` band at the top), or should it cover the full inner-page background like `BackgroundCanvas` does today?**
   - If only the hero strip, the video stays calm and inner-page content sits cleanly below. If full-page, you're replacing `BackgroundCanvas` everywhere — that's a bigger architectural decision and conflicts with Music's documented intentional drift (Decision 24).

4. **Failure-mode acceptance.**
   - If CloudFront is down or the AI-generation service revokes the asset URL (the path looks user-bucket-specific — `user_38xzZboKViGWJOttwIXH07lWA1P` — which raises a question about long-term ownership of the asset), the user sees `bg-hero-bg` + content. Functionally fine but visually unremarkable.
   - **Should we mirror the asset to our own S3/Cloudflare R2 bucket** to control its lifetime? The `Cache-Control: immutable` headers don't protect us from upstream deletion.
   - **Should we add a poster frame** (a single high-quality JPG extracted from the video) so even on slow connections / failures, users see *something* visually rich? Cost: one JPG asset per video (~50–200 KB), simple to ship.

5. **Hero component refactor vs. parallel component.**
   - Option A: extract `<VideoHero>` primitive, port HeroSection to consume it, add inner-page wrappers.
   - Option B: leave HeroSection alone, build a parallel `<InnerPageVideoHero>` primitive.
   - Option A is cleaner long-term; option B avoids touching the homepage hero (which is currently working and tested).

6. **Reduced-motion aesthetic.**
   - Today, reduced-motion users see `bg-hero-bg` + gradient overlays + content. It's serviceable but visually quieter than the video version. Is that acceptable for inner pages too, or do we want a richer non-motion fallback (e.g., a poster frame at full opacity, or a CSS-only animated gradient that doesn't trigger `prefers-reduced-motion`)?

7. **Inner-page hero height variance.**
   - The current `h-1/3` top/bottom fade-percentage works because the homepage hero is tall. Inner-page heroes today are `pt-32 pb-8` — much shorter. A 1/3 fade on a short section eats most of the video window. Either:
     - Inner-page heroes get taller (more whitespace, scroll-cost),
     - OR the fade-percentage becomes a prop (`fadeHeight="33%" | "20%" | "10%"`),
     - OR the fade switches to a fixed-height value (`h-32` always, regardless of section height).

8. **Existing `PageHero` and the `ATMOSPHERIC_HERO_BG` ecosystem.**
   - `frontend/src/components/PageHero.tsx` is the canonical inner-page hero today. It's a `<section>` with title + subtitle + optional `HeadingDivider` + optional children, styled with `ATMOSPHERIC_HERO_BG` (a radial-gradient style object exported from the same file).
   - Used by Prayer Wall hero, Local Support hero, and consumed as a constant by Settings and Insights.
   - The Visual Rollout (Spec 8C / 6A) consolidated the `ATMOSPHERIC_HERO_BG` export specifically. Replacing it with a video-based primitive on every page touches **a lot** of consumers and conflicts with Music's hands-off rule.
   - Open question: **does the new video hero replace `PageHero`, sit above `PageHero`, or coexist as a separate "premium" hero variant for select pages only?**

---

## Appendix — file references

| File | Purpose |
|---|---|
| `frontend/src/pages/Home.tsx` | Homepage — mounts `<HeroSection />` at line 48 |
| `frontend/src/components/HeroSection.tsx` | The hero itself — 162 lines |
| `frontend/src/components/PageHero.tsx` | Inner-page hero today (no video) |
| `frontend/src/components/dashboard/DashboardHero.tsx` | Dashboard hero — gradient `from-dashboard-gradient to-dashboard-dark` |
| `frontend/src/components/local-support/LocalSupportHero.tsx` | LocalSupport hero — no bg style, relies on parent |
| `frontend/src/components/prayer-wall/PrayerWallHero.tsx` | Prayer Wall hero — uses `ATMOSPHERIC_HERO_BG` |
| `frontend/src/components/ui/BackgroundCanvas.tsx` | Canonical inner-page atmospheric layer (5-stop gradient) |
| `frontend/src/index.css:219-221` | `.hero-video { display: none !important; }` reduced-motion override |
| `frontend/src/index.css:270-275` | `.hero-gradient-text` forced-colors-mode override |
| `frontend/tailwind.config.js:13-22` | hero color tokens (`hero-bg`, `hero-mid`, `hero-dark`, etc.) |
| `frontend/src/components/__tests__/HeroSection.test.tsx` | Tests cover content; do NOT cover video lifecycle |
| `.claude/rules/09-design-system.md:234` | "HeroSection.tsx — Landing page hero ... UNTOUCHED by homepage redesign." |
| `.claude/rules/09-design-system.md:636-665` | BackgroundCanvas Atmospheric Layer documentation |

---

*Recon authored 2026-05-07. Read-only — no code changes, no commits.*
