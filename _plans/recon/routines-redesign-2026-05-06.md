# Spec 11c Recon — RoutinesPage Design Density Audit

**Date:** 2026-05-06
**Branch:** `forums-wave-continued`
**Subject:** `/music/routines` (RoutinesPage + RoutineCard + RoutineBuilder + ContentPicker + RoutineStepCard + DeleteRoutineDialog)
**Posture:** Analysis only — no spec or direction is in this doc. No code changes are made.
**Inputs read:** the 6 RoutinesPage-stack files; Settings, Insights, DailyHub, MusicPage, AskPage as peer surfaces; FeaturedSceneCard, ScriptureSessionCard, BedtimeStoryCard, BibleSleepSection, TonightScripture, scene-backgrounds.ts, ROUTINE_TEMPLATES; Spec 10A / 10B / 11A / 11B precedent in `09-design-system.md`, `04-frontend-standards.md`, and the music direction doc at `_plans/direction/music-2026-05-06.md`.

---

## Section A — Current State (RoutinesPage anatomy after 11A + 11B + 6-patch)

### A.1 Page chrome shell

`pages/RoutinesPage.tsx` post-11B:

- `<Layout>` wrapper → mounts canonical `Navbar` (transparent on this page via Layout default) + canonical `SiteFooter`. The `Layout` body root provides `bg-dashboard-dark` (verified — same canonical inner-page atmospheric posture as Friends/Grow/Settings/MyPrayers/Insights/Music established by Direction Decision 1 of the 11A/11B cluster).
- `<SEO ...MUSIC_ROUTINES_METADATA>` mounted at the top — preserved.
- No `<HorizonGlow />`, no `<BackgroundCanvas>`, no per-section `<GlowBackground>`. The atmospheric layer is the inline `ATMOSPHERIC_HERO_BG` style on the hero section only — a subtle single radial purple ellipse at top center (same const `PageHero.tsx` exports for Settings/Insights to share).

### A.2 Hero composition (the load-bearing surface for Spec 11c)

```tsx
<section className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40" style={ATMOSPHERIC_HERO_BG}>
  <Link to="/music" className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Music
  </Link>
  <h1 className="px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
    Bedtime Routines
  </h1>
  <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
    End your day in stillness.
  </p>
</section>
```

Density inventory of the current hero (4 elements):

1. Back link to `/music` (`text-white/50` → hover `text-white/70`)
2. Single h1 wordmark "Bedtime Routines" with gradient text (no font-script span post-11B; no HeadingDivider)
3. One-line subtitle "End your day in stillness." in `text-white/60`
4. Single subtle `ATMOSPHERIC_HERO_BG` radial gradient behind everything

There is NO greeting line, NO narrative subtitle, NO atmospheric depth beyond the single radial, NO illustrative chrome of any kind, NO section eyebrow inside the hero, NO secondary metadata (active routine count, routine count, time-of-day signal), NO sleep / evening visual idiom in the hero itself. The hero reads like Settings (which is also bare) but the page beneath the hero is structurally lighter than Settings (one card grid + one CTA vs. Settings' six deep panels of content).

### A.3 Breadcrumb

```tsx
<div className="mx-auto max-w-5xl px-4 pt-4">
  <Breadcrumb items={[{ label: 'Music', href: '/music' }, { label: 'Bedtime Routines' }]} maxWidth="max-w-5xl" />
</div>
```

Canonical, preserved. Renders below hero, above content.

### A.4 Content section

```tsx
<section className="mx-auto max-w-5xl px-4 py-8">
  {showBuilder ? <RoutineBuilder ... /> : (
    <>
      {hasUserRoutines && <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-4">Templates</h2>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROUTINE_TEMPLATES.map(renderRoutineCard)}
      </div>
      {hasUserRoutines && (
        <>
          <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-8 sm:mt-10">Your routines</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{userRoutines.map(renderRoutineCard)}</div>
        </>
      )}
      {!hasUserRoutines && (
        <p className="text-white/60 text-sm sm:text-base text-center mt-6 mb-4">Tap a template to start, or create your own.</p>
      )}
      <div className="mt-8 text-center">
        <button onClick={handleCreate} className="...white-pill primary CTA Pattern 2...">Create Routine</button>
      </div>
    </>
  )}
</section>
```

Layout: 1 col mobile, 2 col `sm:`, 3 col `lg:`. `gap-4` between cards. The grid container is plain (no decorative wrapper, no background tint, no separator).

Section affordance state (from 6-patch): the "Templates" + "Your routines" eyebrows ONLY render when `hasUserRoutines` is true. When the user has zero routines, the templates render with NO section header above them — the templates ARE the content, not a labeled "Templates" section, which matches Direction Decision 13 (templates are real content, not empty-state placeholder).

The empty-state hint paragraph "Tap a template to start, or create your own." renders ONLY when the user has no routines, and only between the templates grid and the Create Routine CTA.

### A.5 RoutineCard density audit (post-11B)

```tsx
<div role="article" className="relative rounded-2xl border border-white/[0.12] bg-white/[0.06] p-5 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] hover:bg-white/[0.09] hover:border-white/[0.18]">
  {routine.isTemplate && <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-violet-300">Template</span>}
  <h3 className="text-base font-semibold text-white">{routine.name}</h3>
  {routine.description && <p className="mt-1 text-sm text-white/60">{routine.description}</p>}
  <div className="mt-3 flex items-center gap-1.5">
    {routine.steps.map((step) => <span ... className="flex h-6 w-6 ... rounded-full bg-white/10"><Icon size={12} className="text-white/60" /></span>)}
  </div>
  <p className="mt-2 text-xs text-white/60">{routine.steps.length} steps · ~{durationEstimate} min</p>
  <div className="mt-4 flex items-center gap-2">
    <button onClick={handleStart} className="...white-pill primary CTA Pattern 2... px-8 py-3.5 text-base ... sm:text-lg ... ">
      <Play size={14} fill="currentColor" /> Start
    </button>
    <div className="relative ml-auto">{/* 44x44 kebab MoreVertical + popover with Clone OR Edit/Duplicate/Delete */}</div>
  </div>
</div>
```

Density elements per card (templates):

1. Template badge (`text-violet-300` on `bg-primary/10` — categorical signal, decorative tint preserved per Decision 20)
2. Name (h3, text-base = 16px, semibold, white)
3. Description (text-sm = 14px, white/60) — TEMPLATES ONLY
4. 2-3 small step icons (24×24 gray badges, all rendered with same neutral `text-white/60`, no per-type color identity)
5. Meta line: "{N} steps · ~{N} min" (text-xs = 12px, white/60)
6. Start CTA (canonical white pill, `px-8 py-3.5 text-base sm:text-lg` — same SHOWSTOPPER size as homepage primary)
7. Kebab three-dot menu (44×44, opens popover)

User routines: same except no Template badge, no description (templates have description, user routines don't — verified in 11B Change 7), and the kebab popover offers Edit / Duplicate / Delete instead of Clone.

What's missing relative to FeaturedSceneCard / ScriptureSessionCard / BedtimeStoryCard density (see Section D).

### A.6 RoutineCard step icons (current)

`STEP_ICON_MAP`:
- `scene` → `Mountain` (lucide)
- `scripture` → `BookOpen`
- `story` → `Moon`
- `bible-navigate` → `BookOpen`

All rendered identically: `flex h-6 w-6 items-center justify-center rounded-full bg-white/10` with `<Icon size={12} className="text-white/60" />` — neutral gray badges, no per-type color identity, no size differentiation, no border accent. The 4 templates have 2 steps each (verified in `data/music/routines.ts`), so the row is short — visually it reads as a small generic chip group.

Compare to RoutineStepCard (used INSIDE RoutineBuilder, not on RoutineCard): RoutineStepCard DOES have per-type color identity via `border-l-2` colored borders (`border-glow-cyan` for scene, `border-amber-400` for scripture, `border-primary-lt` for story). RoutineCard step icons do not.

### A.7 Empty-state behavior

When `userRoutines.length === 0`:
- 4 templates render in the grid (no section eyebrow above them)
- The hint paragraph "Tap a template to start, or create your own." renders below the grid
- The Create Routine CTA renders centered below the hint

When `userRoutines.length > 0`:
- "Templates" eyebrow renders above the templates grid
- Templates grid
- "Your routines" eyebrow renders below the templates with `mt-8 sm:mt-10` spacing
- User routines grid
- (No hint paragraph)
- Create Routine CTA

The current page has no `<FeatureEmptyState>` mount at all — Direction Decision 13 explicitly preserves the templates as content rather than swapping in `FeatureEmptyState` for users with no routines. This is intentional drift from how Insights, Friends, MyPrayers, etc. handle the zero state.

### A.8 User-routine vs. template differentiation

Visible signals:
- Template badge ("Template" violet pill in upper-left of card body)
- Description paragraph (templates have one, user routines don't)
- Section eyebrow ("Templates" / "Your routines") — only when both exist
- Kebab menu options (Clone vs. Edit/Duplicate/Delete)

What's missing: there is NO visual atmosphere differentiation (no color/gradient/icon shift between curated and user content), NO "created by you" language, NO timestamp, NO last-played state, NO favorite affordance, NO "active right now" treatment for the routine matching `state.activeRoutine?.id`.

### A.9 Loading states

None. RoutinesPage reads from `storageService.getRoutines()` synchronously on mount. No skeleton. No spinner. No `<Suspense>` boundary around RoutinesPage content (the route-level `<Suspense fallback>` in `App.tsx` covers initial chunk load only). For Spec 11c this likely doesn't matter — the data is local and synchronous — but worth noting that there is no canonical RoutinesPage skeleton in `components/skeletons/`.

### A.10 Error states

`RouteErrorBoundary` wraps the route at the App level (verified in Spec 10A's audit pattern). `storageService.getRoutines()` is defensive (filters malformed routines, returns `[]` for unauthenticated users — see `services/storage-service.ts:272`). No inline error banner on RoutinesPage itself. If the page render crashes, the route fallback engages.

---

## Section B — Peer Surface Comparison (design density gaps)

For each peer surface, what's in its hero, what atmospheric depth it has, what content tiers / sections it ships, what its "card unit" looks like and how dense, and where RoutinesPage falls short.

### B.1 Settings (`/pages/Settings.tsx`)

**Hero:** Same exact composition as Routines — `ATMOSPHERIC_HERO_BG`, back link, single GRADIENT_TEXT_STYLE h1, NO subtitle (Routines actually has one MORE element in the hero than Settings does).

**Atmospheric depth:** Single radial purple ellipse at top center via `ATMOSPHERIC_HERO_BG`. No HorizonGlow, no per-section glow, no secondary atmospheric layer.

**Content tiers:** Six sidebar sections (Profile / Dashboard / Notifications / Privacy / Account / App), each with substantial nested form content (input fields, toggles, modals, action buttons). Sidebar on desktop, top tabs on mobile. The sidebar pattern itself is content-dense — six labeled rows in a frosted strip.

**Card unit:** Settings doesn't have "cards" — it has form sections. Each section is a labeled group of inputs. Density is in form-control complexity.

**Where Routines falls short:** Settings is bare in the hero AND has heavy content below it (six deep panels, each with multiple modals). Routines is bare in the hero AND has light content below it (one card grid + one CTA). The hero pattern matches; the content density doesn't.

### B.2 Insights (`/pages/Insights.tsx`)

**Hero:** Same back link + ATMOSPHERIC_HERO_BG pattern, BUT adds two elements Routines lacks:
- A pre-h1 greeting line: `<p className="mb-2 text-sm text-white/50">{greeting}, {user.name}!</p>` ("Good Morning, Eric!")
- A post-h1 narrative subtitle that adapts to user state: "Your story is just beginning." for new users, "Your story so far." for active users, "Welcome back. Your story continues." for returning users (>14 days since last entry)

**Atmospheric depth:** Same single radial via ATMOSPHERIC_HERO_BG. No additional atmospheric primitive. (Insights gets its visual richness from charts + frosted cards, not background layers.)

**Content tiers:** Sticky time-range pill bar (`30d / 90d / 180d / 1y / All`) right below the hero. Then 11 content sections in `<AnimatedSection>` wrappers, each with fade-in-up + staggered delay: CalendarHeatmap, MoodTrendChart, InsightCards, ActivityCorrelations, GratitudeCorrelationCard, CommunityConnections, GratitudeStreak, ScriptureConnections, PrayerLifeSection, MeditationHistory, View Monthly Report CTA. Each section is a frosted card or chart with substantial content.

**Card unit:** Mixed — frosted cards for static content, Recharts for time series. Each section has its own internal heading + body density.

**Where Routines falls short:**
- No greeting line in Routines hero (Insights has one)
- No narrative subtitle that adapts to user state — Routines' "End your day in stillness." is fixed and decorative; Insights' subtitle reflects user history and feels personal
- No sticky filter / control bar
- No staggered animated reveal on cards (RoutinesPage cards render statically)
- No content tier system (Routines has one tier of cards; Insights has 11 distinct sections)

This is the closest peer comparison and the strongest gap on the hero side.

### B.3 DailyHub (`/pages/DailyHub.tsx`)

**Hero:** Time-aware greeting in h1 with gradient ("Good Morning, Eric!"), no subtitle, no back link. Hero is just the greeting on the HorizonGlow canvas.

**Atmospheric depth:** `<BackgroundCanvas>` wrapper + `<HorizonGlow>` layer providing 5 large blurred glow blobs at strategic vertical positions across the page. Continuous atmospheric layer that shows through every tab.

**Content tiers:** Sticky pill tab bar (Devotional / Pray / Journal / Meditate) with active-state violet glow + completion checkmarks per tab. 4 tab panels mounted, CSS show/hide for state preservation. Each panel uses Tier 1 / Tier 2 FrostedCard system with multiple content types (passage callouts, reflection bodies, saint quotes, question cards with inline CTAs, cross-feature CTAs). Plus the Song Pick section + persistent ambient pill FAB.

**Card unit:** Tier 1 FrostedCard (full glass card) and Tier 2 scripture callout (left-border accent). Tier 1 with `variant="accent"` and eyebrow + violet leading dot is the centerpiece treatment.

**Where Routines falls short:** DailyHub is the most cinematic page in the app and the design system EXPLICITLY scopes HorizonGlow to Daily Hub only. Routines should NOT adopt HorizonGlow (Direction Decision 1 of Spec 11A/11B already established this — Routines stays on `bg-dashboard-dark` + ATMOSPHERIC_HERO_BG). But the FrostedCard tier system, the eyebrow + violet leading dot pattern, the active-state visual treatments, and the persistent ambient FAB are all techniques Routines could borrow without porting HorizonGlow.

DailyHub is NOT a direct peer for hero patterns (different atmospheric architecture by design). It IS a useful reference for:
- Active-state treatment (violet-toned active pill with glow shadow)
- Eyebrow + violet leading dot for "centerpiece tier" content
- Inline cross-feature CTAs as part of cards rather than separate sections
- Sticky control surface (pill tab bar) below hero

### B.4 MusicPage (`/pages/MusicPage.tsx`)

**Hero:** Uses the canonical `<PageHero>` component → title "Music", subtitle "Worship, rest, and find peace in God's presence." Note: `<PageHero>` text size is `text-4xl sm:text-5xl lg:text-6xl` — LARGER than RoutinesPage's `text-3xl sm:text-4xl lg:text-5xl`. RoutinesPage is using a smaller heading size than `<PageHero>` would render, even though the rest of the chrome matches. This is a minor inconsistency worth noting.

**Atmospheric depth:** Same single radial via `ATMOSPHERIC_HERO_BG` (PageHero exports it). No HorizonGlow.

**Content tiers:** Sticky pill tab bar (3 tabs: Worship Playlists / Ambient Sounds / Sleep & Rest) with icons in tab labels. 3 tab panels mounted, CSS show/hide for state preservation. Sleep tab has multiple content tiers — BibleSleepSection (hero card with amber-to-purple gradient strip + book icon container in violet tint, 3 quick-start scene/Bible cards with per-type Play icon coloring), TonightScripture (single featured card with `border-2 border-primary/40` ring accent + 12×12 round white play button), 4 ScriptureCollectionRow horizontal carousels, BedtimeStoriesGrid, "Build a Bedtime Routine" frosted CTA card linking to /music/routines.

**Card unit:** Mix — FeaturedSceneCard (aspect-video, full-card scene gradient backgrounds with overlay text), ScriptureSessionCard (frosted with footer chip cluster + violet "Scripture" badge + bottom-right round play button), BedtimeStoryCard (same shape as ScriptureSessionCard with violet "Story" badge), "Tonight's Scripture" hero card (primary border accent), BibleSleepSection hero (gradient stripe + icon container).

**Where Routines falls short (this is the deepest gap):**
- MusicPage's Sleep tab is RIGHT NEXT DOOR (one click via "Build a Bedtime Routine" card → /music/routines) and ships ~8 distinct content tiers of bedtime atmosphere. RoutinesPage receives that traffic and offers ONE tier (the card grid) with NO atmospheric continuity from where the user came from.
- MusicPage Sleep cards have per-type identity (violet "Scripture" badge, violet "Story" badge, scene-gradient backgrounds for featured scenes). RoutineCard step icons are all neutral gray — zero per-type identity carrying through from the Sleep tab idiom.
- The "Build a Bedtime Routine" frosted CTA on the Sleep tab feels promising and atmospheric ("Chain scenes, scripture, and stories into one seamless sleep experience") but tapping it lands on RoutinesPage which is significantly LESS atmospheric than the page that linked to it.
- RoutinesPage hero size (`text-3xl/4xl/5xl`) is one tier smaller than MusicPage's PageHero (`text-4xl/5xl/6xl`). Inconsistent within the same cluster.

### B.5 AskPage (`/pages/AskPage.tsx`)

**Hero:** `<BackgroundCanvas>` wrapper, gradient h1 "Ask God's Word" with `animate-gradient-shift` (slow color shift), `mt-6` subtitle "Bring your questions. Find wisdom in Scripture." in `text-white` (NOT muted). The hero is large and emotionally weighted.

**Atmospheric depth:** `<BackgroundCanvas>` (a different background primitive — see `components/ui/BackgroundCanvas.tsx`) instead of HorizonGlow. Provides cinematic depth specific to AskPage.

**Content tiers:** Textarea with violet glow (canonical Daily Hub Round 4 pattern) + character count + crisis banner + topic chips with staggered scroll-reveal + canonical white pill "Find Answers" CTA + PopularTopicsSection. After submission: question bubble + AI response display + follow-up chips + ConversionPrompt for logged-out + SaveConversationButton for logged-in.

**Card unit:** UserQuestionBubble + AskResponseDisplay (frosted with verses, follow-ups, action chips). Multi-tier composition.

**Where Routines falls short:**
- AskPage's hero uses a larger heading (`text-4xl sm:text-5xl lg:text-6xl`) AND adds animation (`animate-gradient-shift`). RoutinesPage hero is one tier smaller and static.
- AskPage has `<BackgroundCanvas>` for cinematic depth specific to its page. RoutinesPage has no equivalent — only the single radial.
- AskPage has stagger-reveal on the topic chips (via `useScrollReveal` + `staggerDelay()`). RoutinesPage card grid is static.
- AskPage has a clear "primary input" surface (the textarea) that anchors the page. RoutinesPage has no anchoring surface — the templates grid is the page's visual center but lacks a singular focal element.

### B.6 Summary of gaps

| Peer surface | Hero uplift Routines lacks | Content density Routines lacks |
|---|---|---|
| Settings | None — Routines has more | Heavy form content (6 deep sections) |
| Insights | Greeting line + adaptive narrative subtitle | 11 distinct content sections, sticky filter bar, staggered fade-in animation |
| DailyHub | Active-state treatment with violet glow | FrostedCard tier system, eyebrow + violet leading dot, multi-tier callouts |
| MusicPage | Larger heading size; visual continuity from Sleep tab | Per-type card identity (violet badges); featured / hero / grid tier system; bottom-right play buttons; chip cluster footers; scene-gradient atmospheric cards |
| AskPage | Larger heading + gradient shift animation; cinematic background primitive | Anchoring focal surface; staggered reveal |

**The biggest gaps:** (1) MusicPage Sleep-tab atmospheric continuity (Routines is the only Music-cluster page that doesn't carry the bedtime visual idiom forward), (2) Insights-style narrative subtitle / greeting (Routines hero is the bare-bones tier that Settings established but lacks the personal hook Insights has).

---

## Section C — Bedtime Metaphor Inventory

What design elements already exist in the app that evoke "sleep" / "evening" / "rest", which Spec 11c could carry into RoutinesPage.

### C.1 Color & gradient idioms

From `data/scene-backgrounds.ts` (per-scene CSS gradients used by FeaturedSceneCard):

- **`midnight-rain`** — `#242a30` deep blue-gray base, vertical pinstripe pattern in `rgba(180,200,220,0.04)` evoking rain streaks, gradient `#191f25 → #242a30 → #2f353b`. The most explicitly "night" palette.
- **`starfield`** — `#221e32` deep navy-purple base, 10 small white-dot radial gradients scattered at varying opacities (0.09–0.19) evoking stars, base gradient `#171424 → #27233d → #363055`. Cosmic / contemplative night.
- **`sacred-space`** — `#2f283c` purple-gray base, faint repeating linear pattern in `rgba(200,180,240,0.02)` evoking grid/window light, gradient `#221e32 → #342d47 → #443d57`. Quiet sanctuary tone.
- **`evening-scripture`** — `#5e4a36` warm amber-brown base, 5 small radial dots in amber tones (`rgba(255,200,100,0.08)`) evoking candle / lamp glow, gradient `#443326 → #6e5a46 → #5e4a36`. Lamplight reading idiom.
- **`still-waters`** — `#3d5858` desaturated teal base, ellipse ripple pattern in `rgba(255,255,255,0.04)`, gradient `#2d4747 → #426262 → #527272`. Calm water surface.
- **`garden-of-gethsemane`** — `#3c4135` desaturated olive base, crosshatch pattern. Quiet outdoors.

The scene gradients are atmospheric, NOT photographic — repeating-linear-gradient and radial-gradient patterns over a base color with carefully tuned alpha. They render beautifully on a dark-theme canvas. Each scene has a unique color identity that reads as a place rather than a mood.

### C.2 Iconography

- **Moon** (lucide) — used as the icon for `story` step type in RoutineCard step icons AND as a tab icon in MusicPage's Sleep & Rest tab. Currently the only iconographic "night" signal.
- **BookOpen** (lucide) — used for `scripture` and `bible-navigate` step types AND for BibleSleepSection's "Read the Bible" hero card icon (in violet tint container `bg-primary/10`).
- **Mountain** (lucide) — used for `scene` step type. Reads as outdoors / contemplative landscape rather than specifically "night."
- **Wind** (lucide) — used for the Ambient Sounds tab in MusicPage. Atmospheric without being specifically nocturnal.
- **Music** (lucide) — Worship Playlists tab.
- **Stars / sparkle** — NOT currently used anywhere in the bedtime stack. Available in lucide but unclaimed.

### C.3 Existing bedtime visual language in MusicPage Sleep tab

`BibleSleepSection`:
- Hero card with a 1px-tall amber-to-purple horizontal gradient strip at the top: `<div className="h-1 bg-gradient-to-r from-amber-500 to-purple-600" />`. This is the most "transition from day to night" visual idiom in the app — a literal sunset-to-twilight gradient line.
- Violet icon container `bg-primary/10` for the BookOpen icon (Decision 20 decorative tint precedent).

`TonightScripture`:
- "TONIGHT'S SCRIPTURE" eyebrow in `text-sm font-medium uppercase tracking-wide text-white` (NOTE: this eyebrow uses `text-white` not `text-white/60` — brighter than the canonical "secondary text" tier, calling more attention to the centerpiece status).
- Frosted card with `border-2 border-primary/40` ring accent — primary-tinted border treatment carrying "this is special tonight" weight.
- Round 12×12 white play button with white glow `shadow-[0_0_20px_rgba(255,255,255,0.15)]` bottom-right.

`ScriptureSessionCard` / `BedtimeStoryCard` (the canonical sleep card primitive):
- Frosted card chrome `border-white/[0.12] bg-white/[0.06]` (same as RoutineCard).
- Footer chip cluster: duration / voice / per-type badge.
- Per-type badge: `bg-violet-500/15 text-violet-300` with mini icon — "Scripture" with `BookOpen size={10}` for ScriptureSessionCard, "Story" with `Moon size={10}` for BedtimeStoryCard.
- Round 8×8 white play button bottom-right with `shadow-[0_0_12px_rgba(255,255,255,0.12)]` glow.

### C.4 Sound & audio idioms

The 24 ambient sounds + 11 scene presets (per `09-design-system.md` content inventory) are themselves a "bedtime metaphor inventory" — sounds like rain, fireplace, ocean, white noise, etc. compose the routines. RoutinesPage references step content by ID; the sound library's atmospheric weight isn't surfaced visually anywhere on RoutinesPage today.

### C.5 Template names already establishing the metaphor

From `data/music/routines.ts`:
- "Evening Peace" — Still Waters scene + Psalm 23
- "Scripture & Sleep" — Midnight Rain scene + comfort reading
- "Deep Rest" — Garden of Gethsemane + Elijah bedtime story
- "Bible Before Bed" — Evening Scripture scene + Psalms autoplay

The names ARE atmospheric. The template descriptions ("Ease into rest with Still Waters and the calming words of Psalm 23.", "Midnight rain sets the mood while a comforting scripture reading carries you to sleep.") are already poetic and evocative. The design just doesn't carry the words' atmosphere into pixels.

### C.6 What aesthetic elements could carry into RoutinesPage hero / cards

Without designing yet (this is recon, not direction), the available bedtime palette includes:

1. The amber-to-purple horizontal gradient strip (BibleSleepSection's signature)
2. Per-scene CSS gradient backgrounds (still-waters teal, midnight-rain blue-gray, evening-scripture amber)
3. Star-dot decorative pattern (starfield scene gradient idiom — small white radial dots at varied opacity)
4. Moon iconography (currently only on Story type; could expand)
5. Violet-tinted badges with type-specific mini icons (sleep card precedent)
6. Round white play buttons with subtle white glow (sleep card precedent)
7. Eyebrow in brighter `text-white` (TonightScripture precedent — for centerpiece tier)
8. `border-2 border-primary/40` ring accent for "tonight" / "active" / "featured" treatment

All seven are existing in-codebase patterns. None require new visual primitives.

---

## Section D — RoutineCard Content Density Audit (vs. peer cards)

Side-by-side density comparison of RoutineCard with the three sleep-tab card primitives.

### D.1 RoutineCard (templates branch — most populated branch)

Current content elements:
1. Template badge (text-violet-300 on bg-primary/10)
2. Routine name (h3 text-base semibold)
3. Description (text-sm text-white/60)
4. 2-3 step icons (24×24 neutral gray badges, all the same color, no per-type identity)
5. Step count + duration meta line ("2 steps · ~12 min", text-xs text-white/60)
6. Start CTA (large white pill, `px-8 py-3.5 text-base sm:text-lg`)
7. Kebab menu (44×44 three-dot)

Total visible info per template card: ~5 distinct content blocks (badge, name, desc, step row, meta) + 2 actions.

### D.2 RoutineCard (user routine branch — least populated branch)

1. Routine name (no badge, no description)
2. 2-3 step icons (same neutral gray)
3. Step count + duration meta
4. Start CTA
5. Kebab menu

Total: ~3 content blocks + 2 actions. Notably sparse — a user routine card is less dense than its template cousin even though both occupy the same grid cell size. The hover treatment is identical between them.

### D.3 ScriptureSessionCard (sleep-tab peer)

1. Title (text-sm text-white)
2. Reference (text-xs text-white/60)
3. Footer chip cluster: duration pill (`bg-white/10 text-white/70`) + voice pill + violet "Scripture" badge with BookOpen mini icon
4. Round 8×8 white play button bottom-right with white glow

Total: 3 content blocks + 1 action chip cluster + 1 round-button action. Roughly 4 distinct visual elements but ALL of them carry visible meaning (no neutral gray placeholders).

### D.4 BedtimeStoryCard (sleep-tab peer)

Identical structure to ScriptureSessionCard except:
- Adds a description (text-xs text-white/60 line-clamp-2)
- Adds a "length category" pill (Short / Medium / Long)
- Per-type badge is "Story" with Moon mini icon

Total: 4 content blocks + 1 chip cluster + 1 round-button. Slightly denser than ScriptureSessionCard, and noticeably denser than RoutineCard (templates branch) on a per-element-quality basis — every element on BedtimeStoryCard is meaningful, whereas RoutineCard has placeholder-looking neutral step icons.

### D.5 FeaturedSceneCard (sleep-tab peer, hero tier)

Aspect-video card with:
1. Full-card scene gradient background (per-scene CSS gradient from `scene-backgrounds.ts`)
2. Black-to-transparent overlay gradient on top
3. Name (text-lg sm:text-xl, white, semibold) at bottom
4. Description (text-sm text-white/70, line-clamp-2) below name
5. Hover-revealed center play button (44×44 white circle)
6. FavoriteButton top-right

Total: visible 4 content blocks + 1 hover-revealed action + 1 favorite action. The atmospheric weight is in the BACKGROUND not in chips — the scene gradient does the visual work and the text stays minimal.

### D.6 What's missing on RoutineCard relative to peer density

Real opportunities (without prescribing design):

1. **Per-step-type color identity is absent.** Step icons render as neutral gray badges. Sleep-tab cards use violet badges with type icons. RoutineStepCard (used INSIDE the builder) already has color identity via `border-l-2 border-glow-cyan / border-amber-400 / border-primary-lt`. RoutineCard's step icons could carry that same per-type signal at a smaller scale.
2. **No scene preview / atmospheric hint on the card.** A FeaturedSceneCard shows you the scene visually. A RoutineCard's first step is a scene (3 of the 4 templates), but the card is visually disconnected from the scene's color identity. The scene's gradient palette could appear as a subtle accent on the card (left border accent, top-strip gradient like BibleSleepSection, or full-card very-low-alpha background tint).
3. **No "active right now" treatment.** When `state.activeRoutine?.id === routine.id`, the card has no visible signal. Compare to the "Tonight's Scripture" centerpiece treatment with `border-2 border-primary/40` ring accent.
4. **No estimated end time.** Just "~N min" — could surface "Plays until ~10:42 PM" given current time + sleep timer.
5. **No completion stats / last-played timestamp.** Compare to "30 days ago you highlighted this" echo idiom on the dashboard. Routines could surface "Played 3 times this week" or "Last played 2 days ago" if that data were tracked. (NOTE: today, `wr_listening_history` would need to be queried — Direction Decision 25 in the music direction doc preserved that schema as read-only for 11A/11B; would need to verify whether routine plays are recorded there.)
6. **No sleep-timer iconography on card.** A small `Clock` or `Moon` icon next to the duration could signal "this routine has a 45-min sleep timer with 15-min fade." Today the user has to open the builder or start the routine to see those values.
7. **No favorite affordance.** FeaturedSceneCard, ScriptureSessionCard, BedtimeStoryCard all have FavoriteButton in top-right. RoutineCard does not.
8. **The Start CTA is showstopper-sized.** `px-8 py-3.5 text-base sm:text-lg` is the homepage primary CTA size. On a card-grid surface where 5+ cards are visible at once, every card has a showstopper button — they compete with each other rather than letting one centerpiece win. Compare to ScriptureSessionCard's small bottom-right round play button that sits quietly until you focus on a specific card.

The kebab menu is canonical and works fine. The template badge and description hierarchy work fine. The opportunities are mostly in (a) per-type identity carrying through from scene/scripture/story to step icons, (b) atmospheric continuity from the scene the routine starts with, (c) Start CTA quieting from showstopper to peer-tier so the cards read as a grid rather than a row of competing showstoppers.

---

## Section E — Step Icon Redesign Opportunity

Current state in `RoutineCard.tsx`:

```tsx
<span role="img" className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10" aria-label={step.type}>
  <Icon size={12} className="text-white/60" aria-hidden="true" />
</span>
```

All three step types render with:
- Same container size: 24×24 round
- Same background: `bg-white/10`
- Same icon size: 12×12
- Same icon color: `text-white/60`

The only differentiator is the icon glyph itself (Mountain / BookOpen / Moon / BookOpen-for-bible-navigate). At 12×12 with a white/60 fill, the glyphs are perceptually similar — a viewer scanning the card grid can't easily distinguish a "scene + scripture" routine from a "scene + story" routine.

### E.1 Existing per-type color identity in the codebase

Inside `RoutineBuilder` → `RoutineStepCard` → `BORDER_COLOR_MAP`:
- `scene` → `border-glow-cyan` (cyan)
- `scripture` → `border-amber-400` (amber)
- `story` → `border-primary-lt` (lighter violet)

And inside `RoutineBuilder` → `Add Step` type-picker chips:
- `scene` → `border-glow-cyan/30 bg-glow-cyan/10 text-glow-cyan`
- `scripture` → `border-amber-400/30 bg-amber-400/10 text-amber-400`
- `story` → `border-primary-lt/30 bg-primary-lt/10 text-primary-lt`

So the codebase ALREADY has a 3-color per-type identity scheme — cyan for scene, amber for scripture, violet for story. It's just not surfaced on RoutineCard's step icon row.

**(Caveat — verify before adopting):** the `glow-cyan` token is documented in `09-design-system.md` as a "legacy cyan token, no longer used on Daily Hub textareas" but it's still the canonical color for the Add Step / RoutineStepCard scene type. If Spec 11c expanded cyan into RoutineCard step icons, that's reinforcing a legacy token. The direction phase would need to decide whether to keep the cyan/amber/violet trio as-is (matches RoutineBuilder's existing chrome) or migrate to a more recent palette.

### E.2 MusicPage Sleep-tab per-type signaling

Sleep-tab cards (ScriptureSessionCard, BedtimeStoryCard) use a DIFFERENT per-type color than RoutineBuilder uses:
- Both use `bg-violet-500/15 text-violet-300` for the type badge
- BookOpen mini icon for Scripture, Moon mini icon for Story
- The differentiator on Sleep tab is icon-glyph + label text, not color

So there's drift inside the existing design language already:
- RoutineBuilder uses cyan / amber / violet for scene / scripture / story
- Sleep-tab cards use violet / violet for scripture / story (no scene cards in that area's grid; the FeaturedSceneCard uses the scene gradient itself instead of a badge)
- RoutineCard step icons use neutral gray with no color identity at all

A direction decision will need to pick one palette as canonical for "step type identity" and stick to it. This is real work for the direction phase, not the recon phase.

### E.3 Size / weight options

The current 24×24 step icons feel small. Options the direction phase could consider (NOT prescribing):
- Keep 24×24 but add per-type tint
- Bump to 32×32 with larger icon
- Replace with mini badges that show type label text (like Sleep-tab cards) — would need to truncate or use icon-only on mobile

### E.4 Bible-navigate edge case

The 4th step type `bible-navigate` (used in the "Bible Before Bed" template — step 2 navigates to Psalms in the Bible reader rather than playing a scripture audio) currently maps to BookOpen with no differentiation from scripture. A direction decision should clarify whether this collapses with scripture (same color, same icon) or gets its own treatment. Today it's effectively a hidden type — only one template uses it, and the user-facing builder doesn't expose it (RoutineBuilder filters out `bible-navigate` steps when editing — see `RoutineBuilder.tsx:38`).

---

## Section F — Section Affordance State (Templates / Your routines eyebrows from 6-patch)

Post-6-patch state, verified in `RoutinesPage.tsx:184-202`:

```tsx
{hasUserRoutines && <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-4">Templates</h2>}
<div className="grid ...">
  {ROUTINE_TEMPLATES.map(renderRoutineCard)}
</div>
{hasUserRoutines && (
  <>
    <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-8 sm:mt-10">Your routines</h2>
    <div className="grid ...">
      {userRoutines.map(renderRoutineCard)}
    </div>
  </>
)}
```

The eyebrow class string `text-xs text-white/60 uppercase tracking-wider` matches the canonical Worship Room eyebrow for "ALL CAPS small label" — it's the same idiom used by:

- StatsBar uppercase labels (`text-white/90 ALL CAPS`)
- TonightScripture's "TONIGHT'S SCRIPTURE" (`text-sm font-medium uppercase tracking-wide text-white` — note: brighter `text-white`, not `/60`)
- The Daily Hub Devotional tab's "TODAY'S DEVOTIONAL" eyebrow inside DevotionalPreviewPanel
- Tier 1 FrostedCard `variant="accent"` eyebrow (`text-violet-300 font-semibold tracking-[0.15em]` with violet leading dot)
- Tier 2 scripture callout eyebrow (`text-white/50 font-medium tracking-[0.15em]` with NO leading dot)

The current Routines eyebrow is the muted (`text-white/60`) variant with no leading dot, no violet accent — the quietest tier. This is canonical and works, but the direction phase could consider whether one or both eyebrows deserve the brighter centerpiece treatment. Specifically:

- "Templates" — could read as a curatorial eyebrow ("These were designed for you") and might warrant brighter treatment
- "Your routines" — could read as an identity eyebrow ("These are yours") and might warrant a different accent (violet leading dot for "centerpiece personal content"?)

Or both could stay muted (current) and the design density uplift could happen elsewhere. Recon does not recommend; direction will decide.

The empty-state (zero user routines) suppresses both eyebrows — when `!hasUserRoutines`, the templates render with NO eyebrow above them. This is intentional per Direction Decision 13 (templates ARE the content, not a labeled subsection).

---

## Section G — Empty-State Promotion Candidates

Current empty-state hint placement (only when `!hasUserRoutines`):

```tsx
<p className="text-white/60 text-sm sm:text-base text-center mt-6 mb-4">
  Tap a template to start, or create your own.
</p>
```

Renders BETWEEN the templates grid and the Create Routine CTA. The copy is anti-pressure, sentence case, period-terminated, no exclamation point, no instruction-text imperative — passes the canonical Anti-Pressure Copy Checklist from `09-design-system.md` § "Anti-Pressure Checklist references."

### G.1 Existing hero copy

"End your day in stillness." — fixed string, decorative, not adaptive to user state.

### G.2 Comparison to Insights' adaptive narrative subtitle

```tsx
const narrativeSubtitle = useMemo(() => {
  if (entries.length === 0) return 'Your story is just beginning.'
  if (daysSinceLast > 14) return 'Welcome back. Your story continues.'
  return 'Your story so far.'
}, [entries])
```

Three states for three user phases. Personal voice. The subtitle reflects the user's current relationship with the feature.

### G.3 Promotion candidates

Without prescribing any specific copy (recon phase), candidate hero-tier strings the direction phase could consider — all anti-pressure, all warm, all in the existing template-description voice register:

1. Adaptive subtitle that reflects user state (no routines / has routines / actively running): three strings.
2. A static second line below "End your day in stillness." that adds permissioning ("Listen, read, drift off.") without breaking the present-tense quiet.
3. Pre-h1 greeting line matching Insights pattern: "{Time of evening}, {Name}." — note: would need a "good evening" / "almost midnight" / etc. variant since this is a bedtime context, not an all-day surface.

The empty-state hint could also be promoted upward (moved between templates and ABOVE the eyebrow, or even into the hero subtitle slot for users with no routines) but that's a direction decision.

The current hint is well-placed for transitional bridging. It doesn't need to be promoted — it just needs to exist alongside richer hero content. Spec 11c could ADD without REPLACING.

---

## Section H — Out-of-Scope Preservation

Lifted from the 11A direction doc (`_plans/direction/music-2026-05-06.md`) Decisions 24–26 and applied forward to 11c. These MUST NOT be touched:

1. **`AudioProvider` state + `audioReducer`** — Direction Decision 24. Visual chrome migrations only. Behavioral edits limited to existing dispatches (the only behavioral edit added in 11B was `STOP_ROUTINE` from `handleDelete`).
2. **`audio-engine.ts` / Web Audio Service** — Decision 24. Read-only consumer.
3. **`useRoutinePlayer` hook internals** — engine API stays read-only. RoutinesPage consumes `startRoutine` and `endRoutine`; that's the contract.
4. **`RoutineDefinition` schema** in `types/storage.ts` — no shape changes. No new fields. If 11c wants to surface scene-color identity, it derives from `step.contentId` → `SCENE_BY_ID` lookup, not a new schema field.
5. **`storageService.getRoutines` / saveRoutine / updateRoutine / deleteRoutine / duplicateRoutine** — preserved. Post-6-patch defensive filtering (`isValidRoutine` filter) at `services/storage-service.ts:272–283` is intentional and stays.
6. **All Spec 11A + 11B chrome migrations** — preserve, don't undo. (Inventory in Section I below.)
7. **`wr_session_state.activeRoutine` semantics** — Decision 25 read-only; only the `STOP_ROUTINE` dispatch from 11B mutates via the existing reducer.
8. **`wr_listening_history` schema** — Decision 25 read-only.
9. **BB-26 / BB-27 audio Bible cross-cutting** — Decision 26 untouched.
10. **Auth gates on Create Routine, Clone, Start (when logged out)** — chrome migrates; gates do not move. `useAuthModal` open paths preserved.
11. **`useFocusTrap()` wiring** on DeleteRoutineDialog and the kebab popover — preserved.
12. **`Breadcrumb` component** — preserved.
13. **`DevotionalPreviewPanel` / Daily Hub atmospheric primitives** — not on this page; do not introduce.
14. **`HorizonGlow`** — Daily Hub-only per `09-design-system.md` § "Daily Hub Visual Architecture." Do NOT mount on RoutinesPage.
15. **`<FeatureEmptyState>` for templates** — Direction Decision 13 explicitly rejects this; templates ARE the content. Do not swap.
16. **`<PageHero>` substitution for the inline hero** — the canonical Music-cluster pattern uses inline `ATMOSPHERIC_HERO_BG` per Direction Decision 1. Spec 11c could either keep inline or migrate to PageHero, but the size mismatch noted in Section B.4 (RoutinesPage `text-3xl/4xl/5xl` vs PageHero `text-4xl/5xl/6xl`) is a real consideration if PageHero is adopted — the heading would visually grow, and that's a design choice not a recon finding.
17. **The 4 routine templates in `data/music/routines.ts`** — content preserved exactly. No new templates. No description rewrites. No name changes. (Direction Decision 9 ritual onboarding walkthrough is also deferred to a separate spec — not 11c's scope per the music direction doc Decision 9, deferred from 11A/11B.)

---

## Section I — Known Invariants (carry from Spec 11A + 11B)

Class strings, color choices, and behavioral patterns established by 11A/11B that 11c MUST preserve:

| Invariant | Canonical value / location | Source |
|---|---|---|
| White-pill primary CTA Pattern 2 class string | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark` | `09-design-system.md` § "White Pill CTA Patterns" Pattern 2; applied to RoutineCard Start CTA (line 148), RoutineBuilder Save Routine CTA (line 315), RoutinesPage Create Routine CTA (line 215) |
| Border opacity unification | `border-white/[0.12]` | Spec 11A; RoutineCard chrome (line 104) |
| Active-state opacity (foreground variant) | `bg-white/15 text-white` | Spec 11A muted-white pattern |
| Active-state opacity (isolated-pill variant) | `bg-white/15 text-white border border-white/30` | Spec 11A; used by Insights TimeRangePills active state |
| Template badge text | `text-violet-300` | Spec 11B Change 7b; RoutineCard line 108 |
| Template badge background | `bg-primary/10` | Decision 20 decorative-tint preservation |
| Severity destructive Delete CTA | `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40` | Spec 10A canonical; DeleteRoutineDialog confirm button |
| Section eyebrow class | `text-xs text-white/60 uppercase tracking-wider` | RoutinesPage post-6-patch; matches canonical "muted eyebrow" tier |
| Hero gradient text | `style={GRADIENT_TEXT_STYLE}` | `constants/gradients.tsx`; RoutinesPage h1 |
| Atmospheric hero BG | `style={ATMOSPHERIC_HERO_BG}` (single radial purple ellipse) | `components/PageHero.tsx`; shared with Settings/Insights |
| `font-script` removal precedent | No `Caveat` font on headings | Spec 10A, applied to RoutinesPage in 11B Change 1 |
| `font-serif italic` removal precedent | No italic body prose | Spec 10A, applied to RoutinesPage in 11B Change 2 |
| Empty-state hint copy | "Tap a template to start, or create your own." | Spec 11B Change 4 (Decision 13); preserved verbatim — no copy edits in 11c without explicit direction decision |
| `useFocusTrap()` on every modal/popover | DeleteRoutineDialog + kebab menu | Existing wiring preserved through 11A/11B |
| AudioProvider STOP_ROUTINE on active-routine delete | `state.activeRoutine?.routineId === deletingRoutine.id` check + `endRoutine()` call | Spec 11B Change 5 (Decision 14); RoutinesPage handleDelete lines 81-96 — note: the actual code in handleDelete uses `audioState.activeRoutine?.routineId` and calls `endRoutine()` (which dispatches END_ROUTINE), not directly `STOP_ROUTINE` — verify which action name is canonical before any direction phase that touches this path |

---

## Section J — Mobile / Responsive Assessment

### J.1 Hero compression at 375px (iPhone SE width)

Current hero classes: `pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40` and h1 `text-3xl font-bold sm:text-4xl lg:text-5xl`.

At 375px:
- Top padding 128px (pt-32) — clears the navbar with comfortable breathing room
- "Bedtime Routines" h1 at text-3xl (30px) — fits on a single line at 375px (verified by character width, "Bedtime Routines" is 17 characters which at 30px Inter Bold is ~210px, well under 375px - 32px-padding = 343px available)
- Subtitle "End your day in stillness." text-base (16px), `max-w-lg mx-auto mt-4` — fits on a single line
- Back link "← Music" text-sm (14px) — fits

The hero compresses cleanly. No layout breakage at mobile.

### J.2 Card grid stacking at 375px

`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` — single column at 375px, gap-4 between rows. Each card occupies the full width minus `px-4` page padding = ~343px wide. RoutineCard's content fits comfortably at 343px.

The only concern at 375px: the Start CTA inside RoutineCard is `text-base sm:text-lg` and `px-8 py-3.5` — `text-base` (16px) at 343px-card-width minus 44×44 kebab minus `gap-2` between buttons is ~283px available for the Start button. The button text "▶ Start" is ~70px, padding `px-8` = 64px, total ~134px — fits comfortably. No mobile breakage.

### J.3 Card gap and visual rhythm at mobile

Single column with gap-4 (16px between cards) feels slightly tight given that each card's vertical content is ~140-180px. The cards stack visually fine but the rhythm reads as "list" more than "grid." Direction phase could consider if mobile gap should be larger or if the card content should be denser to fill more vertical real estate — not a recon recommendation.

### J.4 RoutineBuilder modal at mobile

`ContentPicker` uses `items-end` at mobile and `items-center` at sm+ — bottom-sheet on mobile, centered modal on tablet+. `max-h-[90vh]` with internal `overflow-y-auto`. Canonical pattern; works fine at 375px.

`DeleteRoutineDialog` uses `items-center` always with `mx-4 max-w-sm` — centered modal pinned to a max-width. Works fine at 375px.

The inline RoutineBuilder form uses `grid grid-cols-2 gap-4` for the Sleep Timer + Fade Duration row. At 375px with `px-6` builder padding, each select is ~135px wide — readable but tight. No layout breakage.

### J.5 Touch targets

All interactive elements have `min-h-[44px]` per the canonical 44px touch target requirement:
- Back link: text only, no min-h — verify with Section K (accessibility) below
- h1 / subtitle: not interactive
- Cards: tap target is the card body
- Start CTA: `min-h-[44px]` ✓
- Kebab three-dot: `min-h-[44px] min-w-[44px]` ✓
- Create Routine CTA: `min-h-[44px]` ✓
- Inside RoutineBuilder: most buttons have `min-h-[44px]`; the type-picker chips ("Scene"/"Scripture"/"Story" inside RoutineBuilder Add Step) appear to lack `min-h-[44px]` — inspecting `RoutineBuilder.tsx:226-251` shows `px-3 py-2 text-xs` without explicit min-h. Worth verifying in direction or any execution.

### J.6 What needs to work at mobile in any redesign

For Spec 11c to maintain mobile hygiene:
- Hero must compress to single line on h1 + single line on subtitle
- Cards must stack to single column with comfortable gap
- Any new atmospheric layer must not cause horizontal overflow at 375px
- Any decorative gradients/patterns must respect the global reduced-motion safety net (per `09-design-system.md` § BB-33)
- Any new image / SVG / canvas must lazy-load to avoid First Contentful Paint regression
- All new touch targets must hit 44×44

---

## Section K — Accessibility Posture (preservation requirements)

Current RoutinesPage accessibility posture (verified by reading the source):

### K.1 Heading hierarchy

- Single h1 in hero ("Bedtime Routines")
- h2 for "Templates" eyebrow (when `hasUserRoutines`)
- h2 for "Your routines" eyebrow (when `hasUserRoutines`)
- h3 inside RoutineCard for routine name
- h3 inside RoutineBuilder for "Steps"

Sequential, no skipped levels. Single h1 per page. ✓

### K.2 Skip-to-main-content

The canonical skip link is mounted by `Navbar.tsx`. RoutinesPage uses `<Layout>` which includes Navbar, so the skip link is present. ✓

### K.3 Landmark / role hygiene

- `<section>` for hero (no `aria-labelledby` though — Settings and Insights both have `aria-labelledby="settings-heading"` / `aria-labelledby="insights-heading"` linking to the h1; **RoutinesPage hero `<section>` does NOT have aria-labelledby — this is a gap relative to Settings/Insights peers.** Worth flagging for direction phase if hero is touched.)
- `<section>` for content
- No `<main id="main-content">` wrapper — wait, let me re-verify. Looking at `RoutinesPage.tsx:134-232`, the structure is `<Layout><SEO /><section hero /><div breadcrumb /><section content /></Layout>` — no explicit `<main>` element on this page. `<Layout>` likely provides one (verify in Layout.tsx if direction phase touches this).

### K.4 Card ARIA

RoutineCard:
- `role="article"` with descriptive `aria-label` — ✓
- Step icons: `role="img"` with `aria-label={step.type}` — accessible name carries the type ("scene", "scripture", "story") ✓
- Kebab button: `aria-label="Routine options"`, `aria-haspopup="menu"`, `aria-expanded={menuOpen}` — ✓
- Menu items: `role="menuitem"` with arrow-key navigation in `handleMenuKeyDown` — ✓
- Outside-click + Escape dismiss — ✓
- Focus restore to kebab trigger on Escape — ✓ (`menuTriggerRef.current?.focus()` at line 54)

### K.5 Modal ARIA

`DeleteRoutineDialog`:
- `role="alertdialog"`, `aria-modal="true"` — ✓ (canonical alertdialog per Spec 10A)
- `aria-labelledby="delete-routine-title"` linking to h2 — ✓
- `aria-describedby="delete-routine-desc"` linking to body p — ✓
- `useFocusTrap(true, onCancel)` — ✓
- AlertTriangle icon `aria-hidden="true"` — ✓

`ContentPicker`:
- `role="dialog"`, `aria-modal="true"` — ✓
- `aria-labelledby={titleId}` (generated id) — ✓
- `useFocusTrap(true, onClose)` — ✓
- `role="tablist"` for tab strip — ✓
- Per-tab `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` — ✓
- Per-panel `role="tabpanel"`, `aria-labelledby` — ✓
- Arrow key + Home/End navigation — ✓
- Body scroll lock via `document.body.style.overflow = 'hidden'` — ✓

`RoutineStepCard` (inside RoutineBuilder):
- `role="listitem"`, `aria-roledescription="reorderable step"`, descriptive `aria-label` — ✓
- Move-up/down buttons disabled at boundaries with `disabled` attribute (visual + functional) — ✓
- Remove button `aria-label={`Remove step ${stepNumber}`}` — ✓

### K.6 Form ARIA

`RoutineBuilder`:
- Routine Name input: `<label htmlFor="routine-name">`, `aria-invalid` on error, `aria-describedby` linking error message + character count — ✓
- Error: `<p id="routine-name-error" role="alert">` with AlertCircle icon — ✓
- `CharacterCount` component with `aria-live="polite"` zone-change announcements (per `09-design-system.md`) — ✓
- Sleep Timer / Fade Duration selects: `<label htmlFor>` — ✓

### K.7 Color contrast

All text on `bg-dashboard-dark` / `bg-white/[0.06]` card surfaces uses the canonical opacity tiers:
- `text-white` (h3 routine name)
- `text-white/60` (description, meta line, eyebrows, subtitle)
- `text-white/50` (back link)
- `text-violet-300` (Template badge — canonical for accessible badge text per 11B Change 7b)

All meet WCAG AA 4.5:1 against the surrounding background per the canonical opacity table in `09-design-system.md` § "Text Opacity Standards." ✓

### K.8 Focus indicators

Every interactive element has `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-{color}/X` — canonical pattern. ✓

### K.9 Reduced motion

`transition-[background-color,border-color] motion-reduce:transition-none` on the RoutineCard (line 104). The global `prefers-reduced-motion` rule in `frontend/src/styles/animations.css` covers everything else. ✓

### K.10 Accessibility preservation requirements for any 11c work

If 11c adds new UI:

1. Any new heading must respect sequential hierarchy (h1 already taken; new headings start at h2).
2. Any new section must add `aria-labelledby` linking to its heading id (the hero's missing aria-labelledby is a gap worth fixing if hero is touched).
3. Any new modal must use `useFocusTrap()` with focus restoration.
4. Any new icon-only button must have `aria-label`.
5. Any new toggle/state must use `aria-pressed` or `aria-selected`.
6. Any new live region (active routine state, completion announcements) must use appropriate `aria-live` politeness.
7. New decorative SVGs / canvases must use `aria-hidden="true"`.
8. New animations default to global reduced-motion safety net; only request exemption for animations that ARE the feature.
9. Any new color must hit WCAG AA 4.5:1 (or 3:1 for large 18px+ text) against its background — verify before introducing.
10. New touch targets hit 44×44.

The current accessibility posture is canonical and strong. 11c's job is to not regress it.

---

## Closing Notes

This document is recon-only. No spec language. No prescriptive design choices. No commits. No branches. Stay on `forums-wave-continued`.

Three observations worth highlighting for the direction phase:

1. **The MusicPage Sleep tab → RoutinesPage atmospheric discontinuity is the largest gap.** A user clicks "Build a Bedtime Routine" on a tab that ships ~8 atmospheric tiers and lands on a page with one. That's the asymmetry Spec 11c needs to address.

2. **The codebase already has a 3-color step-type palette** (cyan/amber/violet from RoutineBuilder Add Step + RoutineStepCard). Surfacing it on RoutineCard step icons is low-cost and adds real perceptual differentiation. The cyan-as-legacy-token caveat is a direction decision, not a recon recommendation.

3. **The hero is structurally underdesigned compared to Insights.** Insights ships a greeting + adaptive narrative subtitle + identical atmospheric BG. Routines could match that pattern without porting any new atmospheric primitive — just personal copy in the existing slot.

Section H (out-of-scope preservation) is the most important section. The audio engine, `RoutineDefinition` schema, `wr_session_state.activeRoutine` semantics, AudioProvider state shape, all of `useRoutinePlayer`, and the 4 templates in `data/music/routines.ts` MUST NOT be touched in any 11c work. Spec 11c is visual / atmospheric design, not behavioral or schema work.

Awaiting review and direction phase.
