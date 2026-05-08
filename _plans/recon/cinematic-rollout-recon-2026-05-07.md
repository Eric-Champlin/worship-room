# Cinematic Hero Rollout — Per-Page Anatomy Recon (2026-05-07)

**Branch:** `forums-wave-continued` (READ-ONLY — no code changes, no commits).
**Method:** Source read of every candidate page + its hero component, computed-style + animation-name probe via Playwright at 375×812 (mobile control) and 1280×900 (reduced-motion control), cross-reference against `09-design-system.md` § "BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)" and `_forums_master_plan/round3-master-plan.md` Phase 5.
**Component under analysis:** `frontend/src/components/CinematicHeroBackground.tsx` (untracked file, 328 LOC, 9-layer atmospheric).
**Reference implementation:** `frontend/src/pages/DailyHub.tsx` L213–232 (the only current consumer).
**Diagnostic prior art:** `_plans/recon/cinematic-hero-diagnostic-2026-05-07.md` (full /daily seam diagnostic) and `_plans/recon/homepage-hero-anatomy-2026-05-07.md` (homepage video-hero anatomy).

---

## TL;DR

- **6 candidate pages identified, all exist and render today.** None have the cinematic mounted; /daily is the only consumer.
- **Drop-in count: 1.** Only `/bible` (BibleLanding) is a clean drop-in — same `BackgroundCanvas`-at-root architecture, same minimal hero (greeting heading only), same `Navbar transparent` overlay, same hero composition idiom. The cinematic clones onto BibleLanding without any structural changes.
- **Drop-in-with-minor-adjustments count: 1.** `/local-support/*` (Churches/Counselors/CelebrateRecovery) is `BackgroundCanvas`-at-root but the hero is sibling to BackgroundCanvas's `<main>` (the BackgroundCanvas wraps from `<LocalSupportHero>` down inside `<main>`); cinematic mounts inside `<LocalSupportHero>` and inherits the canvas behind it cleanly, but the hero subtitle + extraContent + action stack means content density is moderate, not minimal — content reflow not required.
- **Refactor-required count: 3.** `/grow`, `/ask`, `/music` each have a unique structural conflict (split atmospheric layer, dense composer-textarea hero, audio-cluster preservation rule respectively).
- **Skip count: 1.** `/prayer-wall` — Forums Wave Phase 5 ("Prayer Wall Visual Migration") owns this surface; rolling out cinematic inside Phase 5 vs as part of this rollout is a directional decision, not a technical one.
- **Biggest surprise:** `/grow` mounts `<BackgroundCanvas>` as a SIBLING of the hero (hero uses `ATMOSPHERIC_HERO_BG` static gradient; BackgroundCanvas wraps only the tab bar + tab panels below). The cinematic's `mask-image: ... transparent 100%` would fade to a `dashboard-dark + radial-gradient` static gradient at the hero's base, then a hard structural break drops into the multi-bloom canvas — the seam mismatch is worse than /daily's because two completely different atmospheric stacks meet at the hero/body boundary.

---

## Section 1 — `/bible` (BibleLanding)

### 1.1 Page identification

- **Route:** `path="/bible"` → `BibleLanding` (App.tsx:236).
- **Component file:** `frontend/src/pages/BibleLanding.tsx` (251 lines, with inner `BibleLandingInner` wrapped by `BibleDrawerProvider` + `AuthModalProvider`).
- **Hero subcomponent:** `frontend/src/components/bible/landing/BibleHero.tsx` (23 lines).
- **Lands:** the Study Bible feature (book browser + reader entry, search mode, streak chip, today's plan, quick actions, BibleSearchEntry).
- **Auth-gated?** No. Bible features are intentionally unauthenticated per Bible-wave decision — see `02-security.md` § "Bible Wave Auth Posture".

### 1.2 Current hero anatomy

`BibleLanding.tsx` L140–145:
```tsx
return (
  <BackgroundCanvas className="flex flex-col font-sans">
    <Navbar transparent />
    <SEO {...seoMetadata} jsonLd={bibleBreadcrumbs} />

    <main id="main-content" className="relative z-10 flex-1">
      <BibleHero />
```

`BibleHero.tsx` L4–22 (verbatim):
```tsx
<section
  aria-labelledby="bible-hero-heading"
  className="relative flex w-full flex-col items-center px-4 pt-28 pb-12 text-center antialiased sm:pt-32 sm:pb-14 lg:pt-32"
>
  <h1 id="bible-hero-heading" className="px-1 sm:px-2">
    <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
      Your
    </span>
    <span
      className="block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1 pb-2"
      style={GRADIENT_TEXT_STYLE}
    >
      Study Bible
    </span>
  </h1>
</section>
```

- **Hero container className verbatim:** `relative flex w-full flex-col items-center px-4 pt-28 pb-12 text-center antialiased sm:pt-32 sm:pb-14 lg:pt-32`
- **Hero direct children in source order:** 1 child — the `<h1>` containing two `<span>` lines (the 2-line `SectionHeading` pattern: small white "Your" + larger gradient "Study Bible").
- **What lives inside:** 2-line gradient heading only. No subheading, no eyebrow, no breadcrumbs, no CTAs, no buttons, no search bar, no tab bar, no illustration. Sparse.
- **Estimated hero height @ 900px viewport:** `pt-28 + pb-12 + content` ≈ 112 + 48 + ~80 (heading) ≈ **240px** (lg breakpoint: pt-32+pb-14 ≈ 128+56 ≈ ~264px). Note: `BibleLanding` doesn't enforce `min-h-[XXvh]` on the hero — the height is purely intrinsic to padding + content. (Verified shape; exact pixel size depends on font metrics.)
- **Atmospheric layer today:** **`BackgroundCanvas` at the page root** (BibleLanding.tsx L141 — the `<BackgroundCanvas>` wraps Navbar + SEO + `<main>` + drawer + modals). Same architecture as DailyHub.
- **Navbar:** mounted at L142 with `transparent` prop. `<main>` is `relative z-10 flex-1`. `BibleHero` is the first child of `<main>`.

### 1.3 Composition compatibility check

- **Clear bounded `<section>`?** Yes — `<section aria-labelledby="bible-hero-heading">` is the discrete hero region.
- **`position: relative` already?** Yes — `relative` is in the className.
- **`overflow: hidden`?** No — the section has `overflow: visible` (default). Cinematic's `calc(100% + 200px)` extension renders correctly outside the section's content box. Same as /daily.
- **Navbar `transparent`?** Yes. Cinematic shows through behind the navbar. Same as /daily.
- **What atmospheric paints in hero region today?** BackgroundCanvas. Cinematic's mask-fade-to-transparent reveals the same multi-bloom canvas the page already paints — proven seam-architecture from /daily applies verbatim.

### 1.4 Content density assessment

**Sparse.** A single 2-line heading. Lower content density than /daily (which has a 1-line greeting). The cinematic stars + warm beam read as atmospheric supporting the heading rather than competing with it. **No content reflow needed.**

### 1.5 Structural deltas from /daily

- /daily: `<section className="relative z-10 flex min-h-[30vh] w-full flex-col items-center justify-center px-4 pb-12 pt-[145px]">`
- /bible: `<section className="relative flex w-full flex-col items-center px-4 pt-28 pb-12 text-center sm:pt-32 sm:pb-14 lg:pt-32">`
- **Differences:**
  - No `z-10` on /bible hero. (`<main>` carries `relative z-10`, so the hero inherits stacking-context placement above the canvas. Cinematic's children would still need `z-10` to stack above the cinematic; the heading on /bible has no `z-10` today.)
  - No `min-h-[30vh]`. Hero height is intrinsic, not viewport-locked.
  - Padding scheme differs slightly: /daily uses single `pt-[145px] pb-12`; /bible uses `pt-28 pb-12 sm:pt-32 sm:pb-14 lg:pt-32` (responsive).
  - `text-center` is on the section className (vs. /daily where the content is centered via flex justify only).
  - `justify-center` is absent on /bible. Cinematic doesn't care; it positions absolutely.
  - Heading is two `<span>`s (top white "Your", bottom gradient "Study Bible"), not one h1 like /daily.
  - **Sticky elements below hero?** Not directly — `<BibleHero>` is followed by a `border-t border-white/[0.08] max-w-6xl mx-auto` divider then a `<div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-8">` content block. No sticky tab bar (BibleLanding doesn't have tabs at the page level).

### 1.6 Recommended mount approach

**Direct drop-in.** Add `<CinematicHeroBackground />` as the first child of the `<section>` in `BibleHero.tsx` (above the `<h1>`), and add `relative z-10` to the heading/spans wrapper so they stack above the cinematic. The hero's `relative` positioning, lack of `overflow: hidden`, and BackgroundCanvas-at-root ancestry all match /daily. Pattern is identical.

**Caveats:**
- The hero's intrinsic height (~240px) is shorter than /daily's 450px. The cinematic's `calc(100% + 200px)` extension will be ~440px tall — narrower star coverage region but the proportion still works. Consider whether the mask-image fade percentages (`black 0% 35%, ... transparent 100%`) need adjusting for a shorter hero — possibly. Not a blocker.
- Spec 1A's structural decision means no per-page `<HorizonGlow>` exists; cinematic is the only atmospheric layer above BackgroundCanvas. Good.

---

## Section 2 — `/local-support/*` (Churches, Counselors, CelebrateRecovery)

### 2.1 Page identification

- **Routes:** `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` (App.tsx:267–270).
- **Page wrappers:** `frontend/src/pages/Churches.tsx`, `Counselors.tsx`, `CelebrateRecovery.tsx` (each is a thin SEO wrapper around a single shared component).
- **Shared component:** `frontend/src/components/local-support/LocalSupportPage.tsx` (475 lines).
- **Hero subcomponent:** `frontend/src/components/local-support/LocalSupportHero.tsx` (39 lines).
- **Lands:** the Local Support feature (church/counselor/CR locator with search, results list/map, bookmarks).
- **Auth-gated?** Search is **public** (Decision 12 — see `02-security.md`). Only bookmark and visit-recording are auth-gated.

### 2.2 Current hero anatomy

`LocalSupportPage.tsx` L242–256:
```tsx
return (
  <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
    <a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>
    <Navbar transparent />
    <BackgroundCanvas className="flex flex-1 flex-col">
      <LocalSupportHero
        headingId={config.headingId}
        title={config.title}
        subtitle={config.subtitle}
        extraContent={config.extraHeroContent}
      />

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
```

`LocalSupportHero.tsx` L19–38 (verbatim):
```tsx
<section
  aria-labelledby={headingId}
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
>
  <h1 id={headingId} className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
    {title}
  </h1>
  <p className="mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">
    {subtitle}
  </p>
  {extraContent && <div className="mt-4">{extraContent}</div>}
  {action && <div className="mt-6">{action}</div>}
</section>
```

- **Hero container className verbatim:** `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40`
- **Hero direct children in source order:** `<h1>` (gradient title) → `<p>` (subtitle, max-w-2xl, sentence-length) → optional `<div>` (extraContent) → optional `<div>` (action).
- **What lives inside:** Heading + subtitle (~2-3 sentences for Churches: "Your healing journey was never meant to be walked alone..."). Optional extraContent and action are not used by current consumers but are part of the API.
- **Estimated hero height @ 900px viewport:** `pt-32 + pb-8 + h1 + p` ≈ 128 + 32 + ~60 + ~80 ≈ **300px** (lg: pt-40 = 160 → ~330px).
- **Atmospheric layer today:** **`BackgroundCanvas`** wraps `<LocalSupportHero>` + `<main>` (LocalSupportPage L250). Outer `<div>` has `bg-dashboard-dark` (#0f0a1e) but BackgroundCanvas's `min-h-screen overflow-hidden` with the canonical 5-stop gradient paints over it.
- **Navbar:** `<Navbar transparent />` at L249 — sibling of BackgroundCanvas inside the outer `<div>`. Hero starts at viewport top; navbar overlays.

### 2.3 Composition compatibility check

- **Clear bounded `<section>`?** Yes.
- **`position: relative` already?** Yes.
- **`overflow: hidden`?** No (section default visible). The OUTER BackgroundCanvas has `overflow: hidden`, but it's at min-h-screen level — the cinematic's 200px extension fits inside the canvas's overflow box, no clipping. Same as /daily.
- **Navbar `transparent`?** Yes.
- **What atmospheric paints in hero region today?** BackgroundCanvas (multi-bloom). Cinematic's fade-to-transparent reveals the same. ✅ Seam-architecture matches /daily.

### 2.4 Content density assessment

**Moderate.** Heading + a real sentence-length subtitle + optional CTA. Denser than /daily (greeting only) and /bible (heading only). The cinematic stars behind a moderate-density hero may read as background sparkle rather than centerpiece. Not a blocker — just less impactful than on a sparse hero.

### 2.5 Structural deltas from /daily

- /daily: `min-h-[30vh] flex justify-center` (vertically centered greeting).
- /local-support: no `min-h`, no `justify-center` (top-aligned content with `pt-32` baseline). Content stacks vertically: heading → subtitle → optional extras.
- /local-support has subtitle paragraph as a child — not just heading. Two children minimum, three or four with extras. Each child needs `relative z-10` to stack above cinematic (currently none have z-10 because there's no cinematic to stack above).
- No sticky tab bar below hero — instead `<main>` directly follows. The hero/main boundary is where mask-image fade lands.
- Each of the 3 page wrappers passes a different subtitle string but same hero shape. Cinematic mounts inside `LocalSupportHero` once and applies to all three pages.

### 2.6 Recommended mount approach

**Drop-in with minor adjustments.** Add `<CinematicHeroBackground />` as the first child of the `<section>` in `LocalSupportHero.tsx`, then add `relative z-10` to the heading, subtitle paragraph, and extras wrappers so they stack above. Three z-10 additions (vs. /bible's one) but same drop-in pattern.

**Caveats:**
- Hero is taller than /daily (~300–330px vs 450 — wait, /daily's 450px hero @ min-h-[50vh] but this is min-h-[30vh] now, so /daily is ~270px when the user's window is 900px). Cinematic still gets a `calc(100% + 200px)` extension that lands inside `<main>` content — needs visual verification that the mask-fade region doesn't bleed into the disclaimer banner or search controls.
- Local Support is auth-public for search (Decision 12), so the cinematic appears for both logged-in and logged-out visitors. No auth-gating considerations.

---

## Section 3 — `/grow` (GrowPage)

### 3.1 Page identification

- **Route:** `path="/grow"` → `GrowPage` (App.tsx:231).
- **Component file:** `frontend/src/pages/GrowPage.tsx` (152 lines).
- **Hero:** inline within GrowPage, NOT a subcomponent.
- **Lands:** Reading Plans + Challenges (tabbed `?tab=plans|challenges`).
- **Auth-gated?** No.

### 3.2 Current hero anatomy

`GrowPage.tsx` L60–82 (the page wrapper opens at L60, hero at L67–82):
```tsx
return (
  <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
    <SEO {...GROW_METADATA} />
    <Navbar transparent />

    <main id="main-content">
      {/* Hero Section */}
      <section
        aria-labelledby="grow-heading"
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12"
        style={ATMOSPHERIC_HERO_BG}
      >
        <h1 ... style={GRADIENT_TEXT_STYLE}>Grow in Faith</h1>
        <p className="mt-2 text-base text-white/70 leading-relaxed sm:text-lg">
          Structured journeys to deepen your walk with God
        </p>
      </section>

      <BackgroundCanvas>
        {/* Sentinel for sticky tab bar shadow */}
        <div ref={sentinelRef} aria-hidden="true" />
        {/* Sticky Tab Bar */}
        <div className={cn('sticky top-0 z-40 backdrop-blur-md ...')}>
          <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
            <Tabs ... />
          </div>
        </div>
        {/* Tab Panels */}
        ...
      </BackgroundCanvas>
    </main>

    <SiteFooter />
  </div>
)
```

- **Hero container className verbatim:** `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12`
- **Inline `style`:** `ATMOSPHERIC_HERO_BG` (i.e., `backgroundColor: '#0f0a1e' + radial-gradient(ellipse at top center, rgba(109,40,217,0.15) 0%, transparent 70%)`).
- **Hero direct children:** `<h1>` (gradient "Grow in Faith") → `<p>` (subtitle "Structured journeys...").
- **What lives inside:** heading + subtitle (similar density to Local Support, slightly less verbose).
- **Estimated hero height @ 900px viewport:** ~300px.
- **Atmospheric layer today:** **SPLIT** — hero uses `ATMOSPHERIC_HERO_BG` static gradient (purple-radial-on-dashboard-dark), THEN BackgroundCanvas wraps the tab bar + tab panels below. **Two different atmospheric stacks meet at the hero/body boundary.**
- **Navbar:** `<Navbar transparent />` outside main.

### 3.3 Composition compatibility check

- **Clear bounded `<section>`?** Yes.
- **`position: relative` already?** Yes.
- **`overflow: hidden`?** No.
- **Navbar `transparent`?** Yes.
- **What atmospheric paints in hero region today?** ATMOSPHERIC_HERO_BG (dashboard-dark + small purple radial). The cinematic's mask-fade-to-transparent would fade to ATMOSPHERIC_HERO_BG (a flat dark color with small purple radial), NOT to BackgroundCanvas (which paints below the hero in a sibling region). **This is a fundamental architectural mismatch.** The cinematic was designed to fade into the BackgroundCanvas multi-bloom; here it would fade into a different atmospheric, then a hard structural seam drops into BackgroundCanvas at the section boundary.

### 3.4 Content density assessment

Moderate. Heading + subtitle. Sticky tab bar lives directly below the hero (inside BackgroundCanvas).

### 3.5 Structural deltas from /daily

- **Major:** /daily has BackgroundCanvas as the OUTER wrapper of everything; /grow has BackgroundCanvas wrapping ONLY the body content (post-hero).
- /grow hero uses `ATMOSPHERIC_HERO_BG` inline style directly (documented intentional drift originally established for Settings/Insights, also used here).
- Sticky tab bar is below hero (inside BackgroundCanvas). Cinematic's 200px extension would render INTO the sticky tab bar's region (z-40), creating a stack contention.

### 3.6 Recommended mount approach

**Requires hero refactor first.** Two options surface (don't decide):

1. **Promote BackgroundCanvas to the page root** (matching /daily pattern). Hoist `<BackgroundCanvas>` to wrap the entire page. Remove `style={ATMOSPHERIC_HERO_BG}` from the hero. Then cinematic drops in cleanly.
2. **Make CinematicHeroBackground self-contained** — paint a solid base + fade to that solid via mask. Then cinematic works regardless of what atmospheric the page uses below it.

Either approach is a structural change beyond a simple drop-in. /grow is the canonical example of why this rollout needs a directional decision before spec-drafting.

---

## Section 4 — `/ask` (AskPage)

### 4.1 Page identification

- **Route:** `path="/ask"` → `AskPage` (App.tsx:229).
- **Component file:** `frontend/src/pages/AskPage.tsx` (417 lines).
- **Hero:** inline within AskPage, NOT a subcomponent.
- **Lands:** AI Bible chat with follow-ups (real Gemini via backend proxy, AI-1).
- **Auth-gated?** No (logged-out users can ask once; conversion prompt + auth-gated for save/follow-up/feedback).

### 4.2 Current hero anatomy

`AskPage.tsx` L253–271 (within return):
```tsx
return (
  <Layout transparentNav>
    <SEO {...ASK_METADATA} />
    <BackgroundCanvas>
      <section
        aria-labelledby="ask-hero-heading"
        className="px-4 pt-32 pb-10 text-center sm:px-6 sm:pt-40 sm:pb-12"
      >
        <h1
          id="ask-hero-heading"
          className="pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl animate-gradient-shift"
          style={GRADIENT_TEXT_STYLE}
        >
          Ask God&apos;s Word
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-white sm:text-lg">
          Bring your questions. Find wisdom in Scripture.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
        {showInput && (
          <>
            <div className="relative mb-4">
              <textarea ... className="... shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] ..." />
            </div>
            <CrisisBanner text={text} />
            <div ref={chipsReveal.ref ...}>{ASK_TOPIC_CHIPS.map(...)}</div>
            <div className="flex justify-center"><button>Find Answers</button></div>
            <PopularTopicsSection ... />
          </>
        )}
        ...
      </section>
    </BackgroundCanvas>
  </Layout>
)
```

- **Hero container className verbatim:** `px-4 pt-32 pb-10 text-center sm:px-6 sm:pt-40 sm:pb-12`
- **Hero direct children:** `<h1>` (gradient "Ask God's Word") → `<p>` (subtitle "Bring your questions...").
- **What lives inside the hero `<section>`:** heading + subtitle. Similar density to /grow and /local-support.
- **What lives INSIDE the IMMEDIATELY-FOLLOWING section** (not the hero itself, but visually-conjoined):** large violet-glow textarea, CrisisBanner, topic chips, "Find Answers" CTA, PopularTopicsSection. Visually this is a continuous "search hero" experience even though the JSX puts heading+subtitle in one `<section>` and the input in another.
- **Estimated hero `<section>` height @ 900px viewport:** ~280px (excluding the input section below it).
- **Atmospheric layer today:** **`BackgroundCanvas`** wraps both sections. ✅ Same architecture as /daily and /bible.
- **Navbar:** `<Layout transparentNav>` (L254) — Layout default is `transparentNav: true` post-Spec-12 anyway. Navbar overlays.
- **Notable:** the heading uses `animate-gradient-shift` (continuous gradient animation), unique to AskPage. Cinematic + animated gradient text is a layered effect — should still work, but visually busier than /daily.

### 4.3 Composition compatibility check

- **Clear bounded `<section>`?** Yes — but the visual hero EXTENDS into the second `<section>` with the textarea. The cinematic's `calc(100% + 200px)` extension would land mid-textarea region.
- **`position: relative` already?** No — hero `<section>` has no `relative`. **Would need adding.**
- **`overflow: hidden`?** No (default visible).
- **Navbar `transparent`?** Yes (default).
- **What atmospheric paints in hero region today?** BackgroundCanvas. ✅
- **Stacking conflict with violet-glow textarea?** The textarea has `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]` — soft violet glow. With cinematic's warm amber light beam blending in the same region (cinematic extends 200px below hero), there's potential for the warm beam + violet glow to muddy each other visually. Not a stacking bug; an aesthetic consideration.

### 4.4 Content density assessment

**Mixed.** Hero `<section>` itself is moderate (heading + subtitle). But the visual hero region — what the user perceives as "the top half of the page" — includes the textarea, chips, and CTA. Total density is high. Cinematic stars + warm beam behind a textarea reads as "writing under starlight" — could be evocative or could read as visual noise. Subjective.

### 4.5 Structural deltas from /daily

- /daily hero: single `<h1>`, vertically centered via flex.
- /ask hero: two children (h1 + p), top-aligned via padding.
- /ask hero has NO `relative` (would need addition for cinematic stacking-context).
- /ask has a SECOND section directly below hero with the composer; cinematic's 200px extension lands in that second section's textarea region.
- /ask uses `Layout transparentNav` wrapper (which mounts `<Navbar transparent /> ... <SiteFooter />`); /daily doesn't use Layout (DailyHub mounts Navbar + SiteFooter directly). Different ancestor chains, but functional outcome is the same.

### 4.6 Recommended mount approach

**Drop-in with minor adjustments** (lighter than /grow but heavier than /bible). Required changes:
- Add `relative` to hero `<section>` className (currently missing).
- Add `relative z-10` to h1 and p (currently missing).
- Decide whether cinematic mounts inside the hero `<section>` (200px extension overlaps textarea region) OR is adjusted to a smaller extension (e.g., `calc(100% + 50px)`) for /ask specifically. This is a "cinematic prop" question — see G.2.

---

## Section 5 — `/music` (MusicPage)

### 5.1 Page identification

- **Route:** `path="/music"` → `MusicPage` (App.tsx:257).
- **Component file:** `frontend/src/pages/MusicPage.tsx` (294 lines).
- **Hero:** uses canonical `<PageHero>` component.
- **Lands:** the Music feature (3 tabs: Worship Playlists | Ambient Sounds | Sleep & Rest).
- **Auth-gated?** No.

### 5.2 Current hero anatomy

`MusicPage.tsx` L169–179:
```tsx
return (
  <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
    <SEO {...MUSIC_METADATA} jsonLd={musicBreadcrumbs} />
    <Navbar transparent />

    <main id="main-content">
      <PageHero
        title="Music"
        subtitle="Worship, rest, and find peace in God's presence."
      />
      ...
```

`PageHero.tsx` L27–55 (canonical):
```tsx
<section
  aria-labelledby="page-hero-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
  <h1 ... style={GRADIENT_TEXT_STYLE}>{title}</h1>
  ...
  {subtitle && <p className="mx-auto max-w-xl text-base text-white sm:text-lg">{subtitle}</p>}
  ...
</section>
```

- **Hero container className verbatim:** (PageHero canonical) `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40`
- **Inline `style`:** `ATMOSPHERIC_HERO_BG` (dashboard-dark + small purple radial).
- **Hero direct children:** `<h1>` "Music" + `<p>` "Worship, rest, and find peace in God's presence."
- **What lives inside:** Heading + subtitle. Same shape as /grow and /local-support.
- **Estimated hero height @ 900px viewport:** ~300px.
- **Atmospheric layer today:** **`ATMOSPHERIC_HERO_BG`** static gradient on hero. NO BackgroundCanvas anywhere on `/music`. The page outer `<div>` uses `bg-dashboard-dark` (#0f0a1e) — that's the body background.
- **Navbar:** `<Navbar transparent />` outside main.

### 5.3 Composition compatibility check

- **Clear bounded `<section>`?** Yes (PageHero `<section>`).
- **`position: relative` already?** Yes.
- **`overflow: hidden`?** No.
- **Navbar `transparent`?** Yes.
- **What atmospheric paints in hero region today?** ATMOSPHERIC_HERO_BG. **Below the hero, body is `bg-dashboard-dark` (#0f0a1e) — NO BackgroundCanvas.** Cinematic's mask-fade-to-transparent fades to ATMOSPHERIC_HERO_BG inside the hero's box (since hero's background paints under cinematic), but BELOW the hero box, cinematic's 200px extension would render over `bg-dashboard-dark` — a flat dark color with no atmospheric depth. Two-color seam at the hero base.

### 5.4 Content density assessment

Moderate (heading + short subtitle).

### 5.5 Structural deltas from /daily

- **Major:** No BackgroundCanvas. `/music` is one of three documented intentional-drift pages that does NOT use BackgroundCanvas (Settings + Insights + Music — see `09-design-system.md` § "BackgroundCanvas Atmospheric Layer" → "Documented intentional drift").
- **Hard rule from `09-design-system.md` § Daily Hub Visual Architecture and § BackgroundCanvas:** "No future spec migrates Music chrome to `BackgroundCanvas`, `FrostedCard`, or any other canonical atmospheric primitive without first reconciling against the AudioProvider / audioReducer / AudioContext cluster integrity (Decision 24 from Music direction)."
- This means rolling the cinematic onto /music CANNOT come with "promote BackgroundCanvas to page root" as a side effect. The cinematic would need to be self-contained (paint solid base + fade to that solid) for /music to work — see G.1.
- /music also uses the `PageHero` shared component, which also powers `/music/routines` (RoutinesPage uses PageHero — see App.tsx:261). Touching PageHero ripples to multiple surfaces.

### 5.6 Recommended mount approach

**Requires hero refactor first.** And, by Decision 24, requires audio cluster reconciliation before any chrome change. This is the highest-risk candidate. Two options surface (don't decide):

1. **Skip /music entirely** — leave on canonical PageHero + ATMOSPHERIC_HERO_BG. Music is documented intentional drift; cinematic rollout respects that.
2. **Self-contained cinematic** — make CinematicHeroBackground paint its own solid base AND fade to that solid base. Then it works on /music without touching the page architecture or audio cluster. This is the only path to cinematic on /music that respects Decision 24.

---

## Section 6 — `/prayer-wall` (PrayerWall)

### 6.1 Page identification

- **Route:** `path="/prayer-wall"` → `PrayerWall` (App.tsx:262).
- **Component file:** `frontend/src/pages/PrayerWall.tsx` (~750+ lines).
- **Hero subcomponent:** `frontend/src/components/prayer-wall/PrayerWallHero.tsx` (27 lines).
- **Lands:** the Prayer Wall feature (community prayer feed, QOTD, categories).
- **Auth-gated?** No (read public; post/comment/bookmark gated).

### 6.2 Current hero anatomy

`PrayerWall.tsx` L629–668:
```tsx
return (
  <div className="flex min-h-screen flex-col overflow-x-hidden bg-dashboard-dark font-sans">
    <SEO {...PRAYER_WALL_METADATA} jsonLd={prayerWallBreadcrumbs} />
    <Navbar transparent />
    <PrayerWallHero action={...isAuthenticated ? <Share + Dashboard pair> : <Share button>} />

    <div ref={filterSentinelRef} aria-hidden="true" />
    <div className={cn('sticky top-0 z-30 transition-shadow ...', isFilterSticky && 'shadow-md')}>
      <CategoryFilterBar ... />
    </div>
    ...
    <main id="main-content" className="mx-auto max-w-[720px] flex-1 px-4 py-6 sm:py-8">
```

`PrayerWallHero.tsx` L11–26 (verbatim):
```tsx
<section
  aria-labelledby="prayer-wall-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
  <h1 ... style={GRADIENT_TEXT_STYLE}>
    Prayer <span className="font-script">Wall</span>
  </h1>
  <p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
    You&apos;re not alone.
  </p>
  {action && <div className="mt-6">{action}</div>}
</section>
```

- **Hero container className verbatim:** `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40`
- **Inline `style`:** `ATMOSPHERIC_HERO_BG`.
- **Hero direct children:** `<h1>` ("Prayer Wall" with the `Wall` script-font accent — note this is a remaining `font-script` use that hasn't been migrated to gradient-only) → `<p>` ("You're not alone." in `font-serif italic text-white/60` — also a documented Visual Rollout drift, since italic on subtitles is deprecated elsewhere) → `<div>` (action: "Share a Prayer Request" button + optional My Dashboard link).
- **What lives inside:** Heading + subtitle + CTA (action button). Highest content density of the candidates.
- **Estimated hero height @ 900px viewport:** ~360px (heading + subtitle + button row + padding).
- **Atmospheric layer today:** **`ATMOSPHERIC_HERO_BG`** static gradient. NO BackgroundCanvas. Outer `<div>` is `bg-dashboard-dark`. Same architecture as /music and /grow's hero.
- **Sticky filter bar:** `<CategoryFilterBar>` is wrapped in `sticky top-0 z-30 backdrop-blur-md` — sits directly below hero. Same z-stacking risk as /grow's tab bar.

### 6.3 Composition compatibility check

- **Clear bounded `<section>`?** Yes.
- **`position: relative` already?** Yes.
- **`overflow: hidden`?** No.
- **Navbar `transparent`?** Yes.
- **What atmospheric paints in hero region today?** ATMOSPHERIC_HERO_BG (no BackgroundCanvas). Cinematic's mask-fade-to-transparent reveals ATMOSPHERIC_HERO_BG inside the hero, then `bg-dashboard-dark` flat dark below. Same seam mismatch as /music.
- Note: The PrayerWallHero contains the deprecated `font-script` "Wall" accent and the deprecated `font-serif italic text-white/60` subtitle treatment — these are slated for cleanup in Phase 5 anyway.

### 6.4 Content density assessment

**Highest of the candidates.** Heading + subtitle + 1-2 CTAs (composer button, optional dashboard link). The cinematic stars behind a button-bearing hero risks reading as "decoration" rather than "atmospheric." Content reflow not required, but the visual impact is lower than on a sparse hero.

### 6.5 Structural deltas from /daily

- No BackgroundCanvas (matches /music's drift pattern, not /daily's canonical pattern).
- Hero has 3 children including a CTA button (vs /daily's 1 child = h1).
- Sticky CategoryFilterBar sits directly below hero (z-30, backdrop-blur). Cinematic's 200px extension would render through it.
- `font-script` and `font-serif italic` legacy treatments still present — Phase 5 territory.

### 6.6 Recommended mount approach

**Skip this page** in the cinematic rollout — defer to Forums Wave Phase 5 (Prayer Wall Visual Migration). See G.7 below.

If a cinematic mount IS pursued here outside Phase 5, it would be the same shape as /music's: requires either page-architecture promotion to BackgroundCanvas or self-contained-cinematic (G.1). And it would need to compose with the deprecated `font-script` + italic-subtitle cleanup that Phase 5 plans to do anyway. Stacking two visual reworks on the same surface is what Phase 5 was created to avoid.

---

## Section G — Global Analysis

### G.1 BackgroundCanvas dependency

The cinematic's mask-image fade-to-transparent works seamlessly on /daily because BackgroundCanvas paints continuously below it; there is one atmospheric layer, and the cinematic blends into it.

**Pages with BackgroundCanvas at root** (cinematic drops in same as /daily):
- `/daily` (current consumer)
- `/bible` — drop-in candidate (Section 1)
- `/local-support/*` — drop-in candidate (Section 2)
- `/ask` — drop-in candidate (Section 4, with minor structural adjustments)

**Pages WITHOUT BackgroundCanvas at root** (cinematic does not seamlessly compose):
- `/grow` — uses BackgroundCanvas only for body, not hero (Section 3)
- `/music` — no BackgroundCanvas anywhere; documented intentional drift + Decision 24 audio-cluster preservation rule (Section 5)
- `/prayer-wall` — no BackgroundCanvas; ATMOSPHERIC_HERO_BG hero (Section 6)
- `/settings`, `/insights` — out of scope (utility pages)
- `/music/routines` — out of scope (uses PageHero shared with /music)

**Surfaced options for non-canvas pages (no decision):**

1. **Promote BackgroundCanvas to page root for /grow** — this is the simplest fix for /grow because no Decision-24-style preservation rule applies to it. /grow's intentional drift on hero (using ATMOSPHERIC_HERO_BG) was inherited from PageHero conventions, not protected by a constraint. Migration would be a small structural change.

2. **Make CinematicHeroBackground self-contained** — refactor cinematic to paint a solid base + fade-to-that-solid via mask AND match-color. Then it works on any page regardless of body atmospheric. **This is the only path that respects Decision 24 (Music) and Phase 5 (Prayer Wall) without disrupting either.** Trade-off: introduces a `bgColor` prop (or similar) so callers can match the page's body color.

3. **Skip non-canvas pages.** Cinematic stays on BackgroundCanvas-using surfaces only. Music, Prayer Wall, /grow, Settings, Insights stay on their current chrome. This is the lowest-risk option but limits the rollout's reach.

### G.2 Component reusability — surfaced prop ideas (no decision)

CinematicHeroBackground currently takes zero props. Surfaced prop ideas based on per-page analysis:

- **`maskFadeStart` / `maskFadeEnd`** — `/bible`'s shorter hero (~240px) may need a higher `transparent 100%` start point than /daily's 450px hero. Currently hardcoded `linear-gradient(to bottom, black 0%, black 35%, ..., transparent 100%)`.
- **`bgColor`** — for self-contained variant per G.1.2. Default `#08051A` (current `bg-hero-bg`); `/music` and `/prayer-wall` would pass `#0f0a1e` (`dashboard-dark`).
- **`extensionPx`** — `/ask`'s composer textarea sits ~200px below the hero; cinematic's `calc(100% + 200px)` extension lands in that region. A `extensionPx={50}` prop would shorten the extension for tighter pages.
- **`starDensity` / `starCount`** — currently hardcoded 400 far + 200 mid + 60 bright + 10 glints = 670 SVG primitives. Smaller heroes might benefit from lower density. Mobile may also benefit (see G.4).
- **`enableWarmBeam`** — the warm amber light beam may compete with /ask's violet textarea glow or /prayer-wall's brand voice. A `enableWarmBeam={false}` prop disables Layer 6 only.
- **`reducedMotion`** override — currently relies entirely on the global media-query rule. No per-instance override exposed.

(None of these are recommendations. They are surfaced to inform the spec author's API design.)

### G.3 Performance impact

**Per-render cost:** The component is `memo`'d (L107) and uses `useMemo` for all four star arrays (L108–150). On re-render with the same props (`memo` short-circuits) the SVG output is reused; **the SVG primitives are NOT regenerated on every render.** Star generation runs once per component mount.

**Per-mount cost:** ~670 SVG circles + 1 SVG `<feTurbulence>` filter + 4 CSS animations (light beam drift, mid-star twinkle, bright-star halo twinkle, cross-glint pulse). Browser layout/paint cost is the dominant factor, not React reconciliation.

**Cross-route navigation:** When the user navigates from `/daily` to `/bible` (post-rollout), the cinematic component unmounts on /daily and remounts on /bible. The seeded RNG ensures the same star pattern renders both times (seeds are hardcoded constants: `0xc0ffee`, `0xfade`, `0xbeef`, `0xc1a55`), but the DOM is rebuilt. There is no shared SVG sprite or pre-rendered atmospheric layer cached across routes.

**If shipped to 5 inner pages:**
- Each page pays one full mount cost (one-time per visit) ≈ 670 circles painted.
- Memoization within a page works correctly; navigating between tabs on /daily does NOT re-mount the cinematic.
- Cross-page navigation: full re-mount each time. No shared atmospheric.

**Single-shared-SVG-sprite optimization (surfaced, not recommended):** Move the 670 stars into a `<svg>` rendered at `App.tsx` level with `<defs>` containing star groups; each page references via `<use>`. Pros: one paint cost amortized. Cons: complicates layout (the `<svg>` must always be present; the cinematic wrapper would just be a positioning + mask), AND the seeded randomness becomes a design constraint instead of a per-page tunable. **This is not necessary for the rollout to ship; it's an optimization for later if performance becomes an issue.**

**Memory footprint:** ~670 DOM nodes per mount × 5 pages = up to 3350 nodes if all 5 pages have ever been visited (and React/Vite kept them in memory, which it doesn't — only the current page is mounted). In practice the upper bound is 670 nodes at any moment.

### G.4 Mobile behavior

**Probe result @ 375×812:** The cinematic wrapper is 446px tall (vs /daily's 650px @ 1280×900). The hero `<section>` resolves to 246px tall (vs /daily's 450px). Mask-image computed correctly: `linear-gradient(rgb(0,0,0) 0%, rgb(0,0,0) 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.2) 88%, rgba(0,0,0,0) 100%)`.

**SVG viewBoxes:** all 4 SVGs use `viewBox="0 0 1920 1080"` with `preserveAspectRatio="xMidYMid slice"`. On a 375px-wide viewport with a ~246px-tall hero (375×246 aspect = 1.524, vs 1920×1080 aspect = 1.778), the SVG slices crop the LEFT/RIGHT edges of the 1920×1080 starfield. Stars distributed by `random() * 1920` get mapped to viewport pixels — meaning the visible portion of the starfield is the center ~1300 source-pixels of the 1920 canvas.

**Density: still works.** Far stars are 400-count across the full 1920×1080 source canvas; the visible mobile slice shows roughly 70% of them (the middle horizontal band). With 280 visible far stars in a 375×246 area, density per square pixel is roughly comparable to desktop. Bright stars (60 count, `avoidCenter: true` skips the center 15% horizontal band) get the same treatment.

**Visual outcome:** Mobile screenshot saved at `frontend/playwright-screenshots/cinematic-rollout-recon-mobile-daily.png`. Probe data captured. The cinematic renders cleanly at 375px without obvious density issues; the warm beam (anchored at `12% 8%` source coords, so left-of-top-edge) is visually present in the upper-left of the hero. No mobile-specific bug surfaced.

**Potential mobile concern:** The warm beam's `circle at 12% 8%` source coordinates map to a fixed left-edge position regardless of viewport size. On a narrower mobile viewport, "12%" of source-1920 is approximately "12%" of 375 (~45px from left edge) — the beam stays anchored. This is fine.

### G.5 Reduced-motion verification

**Probe result @ 1280×900 with `reducedMotion: 'reduce'`:**

- `.cinematic-light-beam` → `animation-name: none`, `animation-duration: 0s`. ✅ Light beam drift stops.
- `.cinematic-star-twinkle` → `animation-name: none`, `animation-duration: 0s`. ✅ Star twinkle stops.
- `.cinematic-glint-pulse` → `animation-name: none`, `animation-duration: 0s`. ✅ Cross-glint pulse stops.
- `window.matchMedia('(prefers-reduced-motion: reduce)').matches: true`. ✅ Media query active.

**Mechanism:** Two layers redundantly disable the animations:
1. The global `*` rule in `frontend/src/styles/animations.css` (`animation-duration: 0.01ms !important; animation-iteration-count: 1 !important`).
2. A component-specific media query in `frontend/src/index.css` L391–397: `.cinematic-light-beam, .cinematic-star-twinkle, .cinematic-glint-pulse { animation: none !important; }`.

The component-specific block is redundant given the global safety net, but harmless. **Static atmospheric stays visible:** the SVG circles render with their static `opacity` attributes; the warm beam paints with its static `background` gradient (just no `background-position` drift); cross-glints render at their static `opacity`. The cinematic still functions visually — it's only the motion that's removed.

Screenshot saved at `frontend/playwright-screenshots/cinematic-rollout-recon-reduced-motion.png`.

### G.6 Existing test coverage

`frontend/src/pages/__tests__/DailyHub.test.tsx` does NOT test the cinematic directly. The closest assertions:

- L116–120: "devotional card is not rendered in hero" — checks that `Daily Devotional` / `Read today` text is absent from the hero. Doesn't reference the cinematic.
- L129–158: "Hero minimalism" describe block — checks the hero contains only the greeting heading (no FrostedCard classes, no `font-serif.italic`, no Share button). Indirectly enforces minimalism that cinematic respects.
- L144–148: hero bottom padding is `pb-6 sm:pb-8`. **This test is now stale** — current hero className is `pb-12 pt-[145px]` (verified in DailyHub.tsx:222), not `pb-6 sm:pb-8`. The test would fail or pass based on which value the test is checking. (Out of scope for this recon; flag for later.)

**Gaps:**
- No test asserts `<CinematicHeroBackground />` renders inside the hero.
- No test asserts the cinematic's `aria-hidden="true"` accessibility attribute.
- No test asserts navbar overlay compensation (the `pt-[145px]` value chosen specifically to push content below the navbar).
- No test asserts the hero's `relative z-10` flex column setup for stacking the heading above the cinematic.
- No tests reference the cinematic's reduced-motion behavior, mobile behavior, or seam-with-BackgroundCanvas behavior.

If the rollout adds cinematic to /bible, /local-support/*, /ask, the per-page tests for those surfaces would need analogous assertions added.

### G.7 Forums Wave Phase 5 overlap

Forums Wave Phase 5 is "Prayer Wall Visual Migration" (master plan L502, 6 specs estimated, scoped specifically because every other page was already migrated via the Round 3 Visual Rollout). Phase 5 explicitly covers:

- `PrayerCard.tsx` — migrate inline frosted styles to `<FrostedCard>` (L1577).
- `PageShell.tsx` — HorizonGlow integration (L1593) [note: this entry is stale — Phase 5 plans HorizonGlow but Visual Rollout Spec 1A made HorizonGlow orphaned legacy; Phase 5 will need a reconciliation pass to swap HorizonGlow for BackgroundCanvas].
- `PrayerWallHero.tsx` — replace with canonical `PageHero` (L1594) [also stale — `PageHero` uses ATMOSPHERIC_HERO_BG, not BackgroundCanvas. Same reconciliation concern].
- `QotdComposer.tsx` — visual migration in Phase 5 (L1596).

**Surfaced concern (no decision):** If the cinematic rollout includes /prayer-wall, it pre-empts Phase 5's visual work AND the Phase 5 plan-text references stale primitives (HorizonGlow, PageHero) that were already deprecated by the Visual Rollout. Adding cinematic to /prayer-wall in this rollout would force a reconciliation between:

1. Cinematic mount (this rollout)
2. PrayerWallHero canonical-PageHero migration (Phase 5's plan)
3. HorizonGlow → BackgroundCanvas migration (post-Visual-Rollout reality, not yet in Phase 5 plan-text)
4. `font-script` "Wall" + `font-serif italic` subtitle cleanup (Visual Rollout deprecation, deferred to Phase 5)

**Three options surface:**

1. **Defer /prayer-wall to Phase 5.** Phase 5 owns the visual work; rolling cinematic in via Phase 5 specs keeps the changes coherent. Recon recommends this option implicitly by including `/prayer-wall` in the "skip" count.

2. **Do /prayer-wall now in this rollout.** Pre-empts Phase 5's PrayerWallHero work; would require updating Phase 5's master plan plan-text to reflect the new state (or removing PrayerWallHero migration from Phase 5 entirely).

3. **Do /prayer-wall in this rollout BUT scope it narrowly to cinematic-only** (i.e., add the cinematic to PrayerWallHero, do not touch the other Phase 5 deprecations like font-script/italic). Then Phase 5 picks up the rest. This is doable but introduces visual inconsistency in the interim window between this rollout and Phase 5.

This is a directional question for Eric, not a technical one.

### G.8 Documentation drift

`/Users/Eric/worship-room/.claude/rules/09-design-system.md` was updated through the Visual Rollout (2026-04-30 → 2026-05-07). It documents:

- ✅ BackgroundCanvas as canonical inner-page atmospheric (under "BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)").
- ✅ BackgroundCanvas pages-using list (DailyHub, BibleLanding, MyBiblePage, BiblePlanDetail, BiblePlanDay, PlanBrowserPage, ReadingPlanDetail, ChallengeDetail, GrowPage, LocalSupportPage, AskPage, RegisterPage, CreatePlanFlow). Note: /grow IS listed here despite using BackgroundCanvas only for body, not hero — the documentation reflects the actual file consumption (`<BackgroundCanvas>` is imported and used) but doesn't capture the structural nuance that /grow's hero uses ATMOSPHERIC_HERO_BG. **Documentation drift surfaced.**
- ✅ Documented intentional drift list (Settings + Insights, Music, BibleReader). Prayer Wall is NOT listed as documented intentional drift in this section because the original Visual Rollout deferred Prayer Wall to Phase 5 — but Prayer Wall today still uses ATMOSPHERIC_HERO_BG, not BackgroundCanvas. **Documentation drift surfaced** — Prayer Wall's atmospheric architecture should be documented somewhere (either as additional drift, or with a Phase 5 reference).
- ✅ Decision 24 for Music (audio-cluster preservation rule) is fully documented.
- ✅ HorizonGlow is documented as orphaned legacy pending cleanup.
- ❌ `CinematicHeroBackground` is NOT documented in 09-design-system.md. It's not in the component inventory, not in the Round 3 Visual Patterns section, not in the Daily Hub Visual Architecture section. As a brand-new (untracked) component, this is expected — but if rollout proceeds, 09-design-system.md needs entries for:
  - The component itself (location, props if any, intended composition)
  - "Cinematic Hero Pattern" subsection under Round 3 Visual Patterns or a new section
  - Pages-using list
  - Composition rules (requires BackgroundCanvas at root, requires Navbar transparent, requires `relative z-10` on heading)
  - Reduced-motion + mobile behavior

If rollout proceeds, the spec ALSO needs to update:
- `_plans/reconciliation/discoveries.md` (HorizonGlow cleanup is filed there; cinematic is a new pattern that may merit similar tracking)
- `frontend/src/pages/__tests__/DailyHub.test.tsx` (add cinematic-presence assertions; the existing test set has gaps per G.6)
- For each page that gains the cinematic: that page's test file, if any, needs analogous coverage.

---

## Section H — Open Questions for Eric

These are decisions that need to be made before drafting a spec:

### H.1 Architectural posture: drop-in vs self-contained

The cinematic's mask-fade-to-transparent design assumes BackgroundCanvas paints below it. Three pages (`/grow`, `/music`, `/prayer-wall`) don't have BackgroundCanvas at the right level. **Decide:**

- **(a)** Promote BackgroundCanvas to page root on `/grow` (low cost) — but skip `/music` (Decision 24) and `/prayer-wall` (Phase 5).
- **(b)** Refactor cinematic to be self-contained (paint solid base + fade to solid). Works everywhere. Requires `bgColor` prop.
- **(c)** Drop-in only — cinematic ships only on BackgroundCanvas-canonical pages. /grow, /music, /prayer-wall stay on their current chrome.

### H.2 Prayer Wall — defer to Phase 5 or fold in here?

If the cinematic rollout does NOT include /prayer-wall, Phase 5 picks it up. Phase 5's plan-text references stale primitives (HorizonGlow, PageHero) that were superseded by the Visual Rollout — Phase 5 will need a small reconciliation pass regardless. Adding cinematic to that reconciliation is one possibility.

If the cinematic rollout DOES include /prayer-wall, pre-empt Phase 5's PrayerWallHero work and amend Phase 5's plan-text.

### H.3 Cinematic component API

If self-contained variant is pursued (H.1.b), the component needs at minimum a `bgColor` prop. If different pages need different mask-fade depths (H.1 considerations + Section 1.6 caveat re: /bible's shorter hero), `maskFadeStart` / `maskFadeEnd` or a `extensionPx` prop is also needed.

If kept zero-prop (H.1.a or H.1.c), the rollout is simpler but less flexible.

### H.4 Test coverage policy

Add cinematic-presence assertions to each consuming page's test file? The existing /daily test file does NOT have such assertions (G.6). Decide whether to backfill /daily AND add new ones to /bible, /local-support/*, /ask, OR establish a single shared component test for `<CinematicHeroBackground />` itself and skip per-page assertions.

### H.5 Documentation update scope

When rollout proceeds, update `09-design-system.md` to add a "Cinematic Hero Pattern" section (G.8). Decide whether to also fix the documented-drift section to include /grow's mixed atmospheric and /prayer-wall's pre-Phase-5 ATMOSPHERIC_HERO_BG usage.

### H.6 /ask + /grow textarea + tab-bar interaction

`/ask`'s textarea has its own violet box-shadow glow (canonical violet textarea glow). The cinematic's warm amber beam blends in the same upper-left region. Subjective: does that read as evocative or muddy? This question requires a Playwright comparison once the cinematic mounts on /ask (NOT being done in this recon since cinematic isn't there yet).

`/grow`'s sticky tab bar at z-40 sits in the cinematic extension region. The mask-fade-to-transparent reaches `transparent 100%` at the section base; the 200px extension below paints over the tab bar's z-index region with the cinematic's bottom-most layer. Layers below the mask's 100% transparent line don't paint, so this is likely a non-issue, but it's worth verifying empirically once mounted.

---

## Appendix

### File paths referenced (all absolute)

**Pages analyzed:**
- `/Users/Eric/worship-room/frontend/src/pages/DailyHub.tsx` (reference, current consumer)
- `/Users/Eric/worship-room/frontend/src/pages/BibleLanding.tsx`
- `/Users/Eric/worship-room/frontend/src/pages/MusicPage.tsx`
- `/Users/Eric/worship-room/frontend/src/pages/GrowPage.tsx`
- `/Users/Eric/worship-room/frontend/src/pages/AskPage.tsx`
- `/Users/Eric/worship-room/frontend/src/pages/PrayerWall.tsx`
- `/Users/Eric/worship-room/frontend/src/pages/Churches.tsx`, `Counselors.tsx`, `CelebrateRecovery.tsx` (thin wrappers)

**Hero subcomponents:**
- `/Users/Eric/worship-room/frontend/src/components/CinematicHeroBackground.tsx` (the rollout target)
- `/Users/Eric/worship-room/frontend/src/components/PageHero.tsx` (canonical, used by Music, Routines)
- `/Users/Eric/worship-room/frontend/src/components/bible/landing/BibleHero.tsx`
- `/Users/Eric/worship-room/frontend/src/components/local-support/LocalSupportHero.tsx`
- `/Users/Eric/worship-room/frontend/src/components/local-support/LocalSupportPage.tsx`
- `/Users/Eric/worship-room/frontend/src/components/prayer-wall/PrayerWallHero.tsx`

**Atmospheric / canonical:**
- `/Users/Eric/worship-room/frontend/src/components/ui/BackgroundCanvas.tsx` (5-stop canvas)
- `/Users/Eric/worship-room/frontend/src/index.css` L335–397 (cinematic CSS animations + reduced-motion media query)

**Routing:**
- `/Users/Eric/worship-room/frontend/src/App.tsx` L229–270 (route-to-component mappings)

**Documentation:**
- `/Users/Eric/worship-room/.claude/rules/09-design-system.md` § "BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)" (line range covers the Visual Rollout patterns)
- `/Users/Eric/worship-room/.claude/rules/09-design-system.md` § "Daily Hub Visual Architecture"
- `/Users/Eric/worship-room/_forums_master_plan/round3-master-plan.md` L502 (Phase 5 catalog), L1571–1602 (Prayer Wall component audit)

**Recon / diagnostic prior art:**
- `/Users/Eric/worship-room/_plans/recon/cinematic-hero-diagnostic-2026-05-07.md`
- `/Users/Eric/worship-room/_plans/recon/homepage-hero-anatomy-2026-05-07.md`

**Diagnostic artifacts created during this recon:**
- `/Users/Eric/worship-room/frontend/scripts/cinematic-rollout-probe.mjs` (Playwright probe — mobile + reduced-motion)
- `/Users/Eric/worship-room/frontend/playwright-screenshots/cinematic-rollout-recon-mobile-daily.png` (375×812 mobile, full hero region)
- `/Users/Eric/worship-room/frontend/playwright-screenshots/cinematic-rollout-recon-reduced-motion.png` (1280×900 with reducedMotion: 'reduce')

### Mobile probe result (verbatim)

```json
{
  "heroBox": { "y": 0, "height": 246.39, "width": 375 },
  "cinematicBox": { "y": 0, "height": 446.39, "width": 375 },
  "svgCount": 5,
  "svgViewBoxes": ["0 0 1920 1080", "0 0 1920 1080", "0 0 1920 1080", "0 0 1920 1080", null],
  "cinematicComputed": {
    "height": "446.391px",
    "width": "375px",
    "maskImage": "linear-gradient(rgb(0,0,0) 0%, rgb(0,0,0) 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.2) 88%, rgba(0,0,0,0) 100%)"
  }
}
```

### Reduced-motion probe result (verbatim)

```json
{
  "beam":  { "animationName": "none", "animationDuration": "0s" },
  "star":  { "animationName": "none", "animationDuration": "0s" },
  "glint": { "animationName": "none", "animationDuration": "0s" },
  "mediaQueryMatches": true
}
```

### Candidate page summary table

| Page | Route | Component | Hero file | BackgroundCanvas at root? | Hero density | Recommendation |
|---|---|---|---|---|---|---|
| Bible | `/bible` | `BibleLanding.tsx` | `BibleHero.tsx` | ✅ Yes | Sparse (heading only) | **Direct drop-in** |
| Local Support | `/local-support/*` | `LocalSupportPage.tsx` | `LocalSupportHero.tsx` | ✅ Yes | Moderate (heading + subtitle, optional CTA) | **Drop-in with minor adjustments** (z-10 on 3 children) |
| Ask | `/ask` | `AskPage.tsx` | inline | ✅ Yes | Mixed (hero sparse, but conjoined to violet textarea below) | **Drop-in with minor adjustments** (add `relative` + z-10) |
| Grow | `/grow` | `GrowPage.tsx` | inline | ⚠️ Body only, not hero | Moderate | **Requires hero refactor first** (promote canvas OR self-contained cinematic) |
| Music | `/music` | `MusicPage.tsx` | `PageHero.tsx` (shared) | ❌ No (intentional drift) | Moderate | **Requires hero refactor + Decision 24 audio-cluster reconciliation, OR skip** |
| Prayer Wall | `/prayer-wall` | `PrayerWall.tsx` | `PrayerWallHero.tsx` | ❌ No | Highest (heading + subtitle + CTA + sticky filter bar below) | **Skip — defer to Forums Wave Phase 5** |

Total: 6 candidates → 1 direct drop-in, 2 drop-in-with-adjustments, 2 refactor-required, 1 skip-defer.

### Cinematic component layer breakdown (for reference)

From `CinematicHeroBackground.tsx`:

| Layer | Lines | What |
|---|---|---|
| Wrapper | L153–162 | `aria-hidden div`, `pointer-events-none absolute inset-x-0 top-0 overflow-hidden`, `height: calc(100% + 200px)`, mask-image fade to transparent |
| 0 (base) | L165 | `absolute inset-0 bg-hero-bg` (solid #08051A) |
| 1 (nebula) | L168–174 | `radial-gradient(ellipse at 50% 40%, rgba(60,40,110,0.15) → transparent)` |
| 2 (far stars) | L177–192 | 400 SVG circles, no twinkle |
| 3 (mid stars) | L195–220 | 200 SVG circles, ~30% twinkle |
| 4 (bright stars) | L223–266 | 60 SVG circles with halo (r * 3.5 + r), ~50% twinkle |
| 5 (cross-glints) | L269–305 | 10 anchored cross-shaped glints (rect + rect + circle), ~30% pulse |
| 6 (warm beam) | L308 | `cinematic-light-beam` class — radial-gradient at 12% 8%, 60s drift animation |
| 7 (film grain) | L311–324 | SVG `feTurbulence` with `mixBlendMode: overlay`, opacity 0.04 |

Mask-image (verbatim from L158–161):
```
linear-gradient(to bottom,
  black 0%,
  black 35%,
  rgba(0,0,0,0.85) 55%,
  rgba(0,0,0,0.50) 72%,
  rgba(0,0,0,0.20) 88%,
  transparent 100%
)
```

Star generation seeds (deterministic):
- far stars: `0xc0ffee` (12648430)
- mid stars: `0xfade` (64222)
- bright stars: `0xbeef` (48879, with `avoidCenter: true`)
- cross-glints: `0xc1a55` (793173) — anchors at fixed positions, jittered ±40px

### CSS animations (referenced in component, defined in index.css)

| Class | Keyframes | Duration | Description |
|---|---|---|---|
| `.cinematic-light-beam` | `cinematic-light-drift` | 60s | Background-position drift from `12% 8%` ↔ `15% 11%` |
| `.cinematic-star-twinkle` | `cinematic-star-twinkle` | var (4–12s, per star) | Opacity 1.0 ↔ 0.5 |
| `.cinematic-glint-pulse` | `cinematic-glint-pulse` | var (10–15s, per glint) | Opacity 1.0 ↔ 1.15 |

All three disabled via `@media (prefers-reduced-motion: reduce)` block at L391–397.
