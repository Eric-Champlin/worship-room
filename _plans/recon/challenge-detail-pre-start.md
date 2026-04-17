# Playwright Recon: Challenge Detail (Pre-Start) — `fire-of-pentecost`

**Source URL:** http://localhost:5174/challenges/fire-of-pentecost
**Captured:** 2026-04-17 (today = 2026-04-17, challenge starts 2026-05-24 → 37 days out)
**Capture age:** 0 days — fresh
**Purpose:** Visual + behavioral spec for the "pre-start Challenge Community UX problem"
**Screens:** 1 (single detail page, `isFutureChallenge` branch of ChallengeDetail.tsx)
**Confidence:** HIGH — measured from live page, cross-referenced with source

**Screenshots** (in `frontend/playwright-screenshots/`):
- `recon-fire-pentecost-desktop-1440.png` (full page)
- `recon-fire-pentecost-desktop-1440-viewport.png` (above fold)
- `recon-fire-pentecost-mobile-375.png` (mobile full page)

---

## TL;DR — The bug you came for

**`CommunityFeed` renders unconditionally for pre-start challenges**, producing fabricated activity ("Daniel S. completed Day 1 just now", "Joshua W. started the challenge 3h ago", "Emily C. hit a 14-day challenge streak") for a challenge that doesn't start for 37 days.

Root cause — `frontend/src/pages/ChallengeDetail.tsx:436-440`:

```tsx
{/* Community feed */}
{challenge && (
  <CommunityFeed
    dayNumber={selectedDay}
    challengeDuration={challenge.durationDays}
  />
)}
```

The participant count (line 288) and community goal (line 296) both guard with `{!isFutureChallenge && ...}`. `CommunityFeed` does not. The component itself has zero state awareness — it takes only `dayNumber: number` and `challengeDuration: number` and renders 6 mock activity rows every time.

When `isFutureChallenge === true`, `selectedDay` defaults to `progress?.currentDay ?? 1` (so 1), which `getActivityItems(1, 21, 6)` happily renders as if the challenge were live.

---

## 1. Page Structure Overview

```
<body bg="#08051A">
  <nav> Navbar (OPAQUE bg-hero-dark, NOT transparent variant) </nav>
  <main class="flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section role="hero" style={ATMOSPHERIC_HERO_BG + themeColor overlay}>
      <!-- Icon (Flame, Pentecost red #DC2626) -->
      <!-- h1 (gradient text) -->
      <!-- description -->
      <!-- season label + duration ("Pentecost · 21 days") -->
      [isFutureChallenge branch:]
      <!-- "Starts in 37 days" -->
      <!-- "May 24, 2026" -->
      <!-- Action button pair: [Remind me] [Back to Challenges] -->
    </section>
    <Breadcrumb />    <!-- visually BELOW the hero, above community -->
    <!-- no day navigation rendered (gated by !isFutureChallenge) -->
    <!-- no MilestoneCard rendered -->
    <CommunityFeed />  <!-- ⚠ THE BUG — renders regardless of status -->
  </main>
  <SiteFooter />
</body>
```

**Key layout facts:**
- `ChallengeDetail` uses `<Layout>` wrapper → delivers Navbar + SiteFooter. `GrowPage` and `DailyHub` do NOT use `<Layout>`; they mount Navbar directly with `transparent` prop. **Nav treatment differs:** `/challenges/:id` gets the **opaque** navbar (`bg-hero-dark`, rgb(13,6,32), position: static); `/grow` and `/daily` get **transparent glassmorphic overlay** navbar.
- Hero DOES NOT use HorizonGlow or GlowBackground. It uses `ATMOSPHERIC_HERO_BG` (PageHero.tsx:10-14) plus a themeColor radial overlay applied per-challenge in ChallengeDetail.tsx:203-206.
- Breadcrumb is rendered **after** the hero section (ChallengeDetail.tsx:387), which is structurally unusual but visually above the CommunityFeed.

---

## 2. Hero Heading — Computed Styles

**Element:** `<h1>Fire of Pentecost: 21 Days of the Spirit</h1>`
**Classes:** `mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2`
**Inline style:** `GRADIENT_TEXT_STYLE` (from `@/constants/gradients`)

| Property | Value | Tailwind Class |
|---|---|---|
| font-family | `Inter, "Inter Fallback", ui-sans-serif, system-ui` | `font-sans` |
| font-size (desktop) | 48px | `lg:text-5xl` |
| font-weight | 700 | `font-bold` |
| line-height | 48px | (implicit from `leading-tight` equivalent; computed 48px == 1.0) |
| color | rgb(255,255,255) (overridden by `-webkit-text-fill-color: rgba(0,0,0,0)`) | `text-white` |
| background | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | inline via `GRADIENT_TEXT_STYLE` |
| background-clip | `text` | `bg-clip-text` |
| -webkit-text-fill-color | `rgba(0,0,0,0)` | `text-transparent` |
| text-align | center | `text-center` (from parent) |
| pb | 8px | `pb-2` |
| mt | 16px | `mt-4` |

**Evidence:** `background-image: linear-gradient(223deg, rgb(255, 255, 255) 0%, rgb(139, 92, 246) 100%)` matches `GRADIENT_TEXT_STYLE` exactly.

**Responsive scaling** (per class list, not measured at 375px):
- Base: `text-3xl` → 30px
- sm (≥640px): `text-4xl` → 36px
- lg (≥1024px): `text-5xl` → 48px

---

## 3. Hero Background — Atmospheric Layering

**Class:** `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40`
**Inline style** (ChallengeDetail.tsx:203-206):
```js
const heroStyle = {
  ...ATMOSPHERIC_HERO_BG,
  backgroundImage: `radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 0%, transparent 60%), ${ATMOSPHERIC_HERO_BG.backgroundImage}`,
}
```

**Computed:**
| Property | Value |
|---|---|
| background-color | `rgb(15, 10, 30)` (= `#0f0a1e`, "dashboard-dark") |
| background-image | `radial-gradient(circle at 50% 30%, rgba(220, 38, 38, 0.125) 0%, transparent 60%), radial-gradient(at 50% 0%, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` |
| padding-top | 160px (lg:pt-40) |
| padding-bottom | 48px (sm:pb-12) |
| min-height | 0px (no enforced min) |

**Layers top→bottom:**
1. **Pentecost red tint:** `rgba(220,38,38,0.125)` at 50% 30% — sourced from `challenge.themeColor = '#DC2626'` with `20` alpha hex (= 0.125 opacity)
2. **Primary purple tint:** `rgba(109,40,217,0.15)` at 50% 0% — the base `ATMOSPHERIC_HERO_BG`
3. **Solid `#0f0a1e`** base

**Note:** this is the **same pattern** used by GrowPage, PageHero, and all other inner-page heroes. It is NOT HorizonGlow (that's Daily Hub only). The spec should preserve this atmospheric pattern — changing the background is out of scope.

---

## 4. Challenge Community Component — The Bug Surface

**File:** `frontend/src/components/challenges/CommunityFeed.tsx` (52 lines, no state awareness)
**Mounted at:** `ChallengeDetail.tsx:436-440` — **unconditional** except for `{challenge && ...}`

**Section wrapper:**
| Property | Value | Notes |
|---|---|---|
| tag | `<section>` | |
| classes | `border-t border-white/10 py-8 sm:py-10` | |
| border-top | `1px solid rgba(255,255,255,0.1)` | separates from hero/action-button cluster above |
| padding | `40px 0px` desktop (sm:py-10 = 40px) | |
| background | transparent | |
| inner container | `mx-auto max-w-2xl px-4 sm:px-6` | narrower than `<main>` max-w-7xl |

**"Challenge Community" heading:**
| Property | Value | Tailwind Class |
|---|---|---|
| tag | `<h3>` | |
| font-family | Inter | `font-sans` |
| font-size | 18px | `text-lg` |
| font-weight | 600 | `font-semibold` |
| color | rgb(255,255,255) | `text-white` |
| paired with | `<Users />` icon (h-5 w-5 text-white/60) | |

**Activity items (6 rows rendered by `getActivityItems(selectedDay=1, 21, 6)`):**
1. "DS · Daniel S. completed Day 1 · just now"
2. "HB · Hannah B. prayed for the community · 2h ago"
3. "JW · Joshua W. started the challenge · 3h ago"
4. "EC · Emily C. hit a 14-day challenge streak · 5h ago"
5. "AF · Andrew F. completed Day 1 · 8h ago"
6. "SN · Sophia N. shared a prayer · 12h ago"

Each row:
- `<li class="flex items-center gap-3 py-3">`
- Avatar: `h-8 w-8 shrink-0 rounded-full text-xs font-semibold text-white` with inline `backgroundColor: AVATAR_COLORS[colorIndex]`
- Name: `text-sm font-medium text-white/90`
- Action: `text-sm text-white/60`
- Timestamp: `shrink-0 text-xs text-white/60`
- `<ul class="divide-y divide-white/5">` separators

**"Pray for the community" link (CommunityFeed.tsx:42-48):**
| Property | Value | Tailwind Class |
|---|---|---|
| href | `/prayer-wall?filter=challenge` | |
| icon | Heart (h-4 w-4) | |
| display | inline-flex | `inline-flex` |
| min-height | 44px | `min-h-[44px]` |
| padding | 10px 20px | `px-5 py-2.5` |
| font-size | 14px | `text-sm` |
| color | rgba(255,255,255,0.7) | `text-white/70` |
| border | 1px solid rgba(255,255,255,0.2) | `border border-white/20` |
| border-radius | 8px | `rounded-lg` |
| background | transparent | |
| hover | `hover:bg-white/5` (captured hover state — not triggered by JS event but class applies) | |
| margin-top | 16px | `mt-4` |

**Pre-start UX problems (concrete):**
1. "Daniel S. completed Day 1 just now" — Day 1 content starts May 24, 2026. Nothing exists today.
2. "Joshua W. started the challenge 3h ago" — challenge is unavailable; the UI's own "Join Challenge" button is replaced by "Remind me" because of `isFutureChallenge`.
3. "Emily C. hit a 14-day challenge streak" — impossible for a challenge that hasn't begun.
4. "Pray for the community" link takes user to `/prayer-wall?filter=challenge` — the filter is unclear for pre-start state; the prayer wall has no associated challenge activity because no one has joined.

**This is the spec's primary target.**

---

## 5. Action Buttons — Remind me / Back to Challenges

Both sit inside the hero, centered, in a flex row (`flex items-center justify-center gap-3 mt-6`).

### Remind me — `<button>` (ChallengeDetail.tsx:365-~377)

Renders different icon + label based on `getReminders().includes(challenge.id)`:
- Not reminding: `<Bell />` + "Remind me"
- Already reminding: `<BellOff />` + "Reminder on" (approximate — verify in source)

**Default state (not reminding):**
| Property | Value | Tailwind Class |
|---|---|---|
| tag | `<button>` | |
| background-color | rgba(255,255,255,0.1) | `bg-white/10` |
| color | rgb(255,255,255) | `text-white` |
| border | 1px solid rgba(255,255,255,0.2) | `border border-white/20` |
| border-radius | 9999px | `rounded-full` |
| padding | 12px 24px | `px-6 py-3` |
| min-height | 44px | `min-h-[44px]` |
| font-size | 14px | `text-sm` |
| font-weight | 500 | `font-medium` |
| box-shadow | none | |
| hover (class) | `hover:bg-white/15` | defined in className |
| focus-visible | `ring-2 ring-primary-lt/70` | |
| active | `active:scale-[0.98]` | canonical press-feedback token |

**Bounding box:** 148.5×46 px at y=639 (inside hero, 95px below the countdown text).

### Back to Challenges — `<a>` (ChallengeDetail.tsx:377-381)

Visually **identical** to Remind me. Same classes. Differences:
- `<a href="/grow?tab=challenges">` instead of `<button>`
- No icon
- No `active:scale-[0.98]` or `transition-[colors,transform]` — only `transition-colors`
- No `duration-fast` token

**Bounding box:** 178.4×46 px at y=639 (sibling to Remind me, 12px gap from `gap-3`).

**Hover evidence:** Both buttons' computed background stayed at `rgba(255,255,255,0.1)` during synthetic `mouseenter`. The class `hover:bg-white/15` IS defined and will apply on real user hover — synthetic events don't trigger Tailwind's `:hover` pseudo. No regression.

**Design-system observation:** These buttons do NOT match the white-pill Daily Hub primary CTA (`bg-white text-primary shadow-[white glow]`). They're the "glassmorphic secondary" variant — appropriate for this context because the primary action for a pre-start challenge isn't "commit to the challenge," it's "optionally remind me later." No change recommended to these button styles.

---

## 6. Breadcrumb — Structural Oddity

**Component:** `components/ui/Breadcrumb.tsx` (semantic `<nav aria-label="Breadcrumb">` with `<ol>`, mobile ellipsis collapse when 3+ items).
**Mounted at:** `ChallengeDetail.tsx:387-395` — **below** the hero section, **above** CommunityFeed.

```tsx
<Breadcrumb
  items={[
    { label: 'Grow', href: '/grow?tab=challenges' },
    { label: 'Challenges', href: '/grow?tab=challenges' },
    { label: challenge.title },  // current page, no href
  ]}
/>
```

**Outer container:**
| Property | Value |
|---|---|
| tag | `<nav aria-label="Breadcrumb">` |
| classes | `py-2` |
| inner wrapper | `mx-auto px-4 sm:px-6 max-w-2xl` |

**Mobile behavior** (not captured visually but source-confirmed):
- `showEllipsis = items.length >= 3` → true here
- Items before the last two are `hidden sm:flex` on mobile
- A leading "…" + `<ChevronRight>` appears on mobile, both `text-white/30`

**Links:**
- Non-last: `text-white/50 hover:text-white/70 hover:underline` + `<Link>`
- Last: `text-white/80` aria-current="page", `<span>`, no href
- Separator: `<ChevronRight class="h-3.5 w-3.5 shrink-0 text-white/30">`
- Gap: 6px (`gap-1.5`)
- Font size: `text-xs sm:text-sm` (12/14px)

**UX note:** The breadcrumb being BELOW the hero (not above) is unusual but consistent with the site pattern on other inner pages. The spec should NOT move it — that's a larger navigation convention decision outside this scope.

---

## 7. Navbar Treatment (confirms page-specific override)

| Property | `/challenges/:id` | `/daily` | `/grow` |
|---|---|---|---|
| Variant | **Opaque `bg-hero-dark`** | Transparent glassmorphic overlay | Transparent glassmorphic overlay |
| Wrapper | `<Layout>` (components/Layout.tsx) | Mounted inline on page | Mounted inline on page |
| `transparent` prop | `false` (default) | `true` | `true` |
| position | static | absolute | absolute |
| background | rgb(13, 6, 32) | transparent | transparent |
| backdrop-filter | none | (blur applied when scrolled) | (blur applied when scrolled) |
| z-index | 50 | 50 | 50 |

**This difference is intentional — Layout's default is opaque.** If the spec needs the glassmorphic variant on ChallengeDetail, that's a deliberate call; flag it.

---

## 8. Pre-start State — What IS handled correctly

For context on what NOT to re-implement:

| Guarded by `isFutureChallenge` check? | Location | Behavior |
|---|---|---|
| ✅ Participant count | Line 288 | Hidden pre-start |
| ✅ Community goal progress bar | Line 296 | Hidden pre-start |
| ✅ "Starts in N days" + date block | Line 333-356 | SHOWN pre-start (branch exclusive) |
| ✅ Remind me button vs. Join button | Conditional render | Remind me pre-start; Join button active |
| ✅ Day content display | Line 219 (`showDayContent`) | Hidden pre-start |
| ✅ Day navigation | Line 459 | Hidden pre-start |
| ❌ **CommunityFeed** | Line 436 | **Shown pre-start — THE BUG** |
| ❌ **Pray for the community CTA** (inside CommunityFeed) | CommunityFeed.tsx:42-48 | Shown pre-start — same root cause |

---

## 9. Text Content Snapshot (Screen 1)

| Element | Text |
|---|---|
| `<h1>` (gradient) | "Fire of Pentecost: 21 Days of the Spirit" |
| Description `<p>` | "Explore the person and work of the Holy Spirit across 21 days. From the promise of power to being sent on mission, discover how the Spirit transforms your daily life." |
| Season + duration | "Pentecost · 21 days" |
| Countdown (h2/large) | "Starts in 37 days" (18px, `text-lg font-semibold text-white`) |
| Date subtitle | "May 24, 2026" (14px, `text-sm text-white/60 mt-1`) |
| Button 1 | "Remind me" (when not reminding) |
| Button 2 | "Back to Challenges" |
| Breadcrumb | "Grow › Challenges › Fire of Pentecost: 21 Days of the Spirit" |
| Community heading | "Challenge Community" |
| Community items | 6 fabricated rows (see §4) |
| Community CTA | "Pray for the community" |

---

## 10. CSS Mapping Table — All Styles Captured

| Element | Property | Computed Value | Tailwind Class | Inline Style |
|---|---|---|---|---|
| Hero section | background-color | `#0f0a1e` | — | `style={ATMOSPHERIC_HERO_BG + ...}` (ChallengeDetail.tsx:203) |
| Hero section | background-image | radial × 2 (red + purple) | — | see §3 |
| Hero section | padding | `160px 16px 48px` | `pt-32 sm:pt-36 lg:pt-40 pb-8 sm:pb-12 px-4` | — |
| Hero `<h1>` | background | `linear-gradient(223deg, #FFF 0%, #8B5CF6 100%)` | `bg-clip-text text-transparent` | `GRADIENT_TEXT_STYLE` |
| Hero `<h1>` | font-size | 48px (lg) / 36px (sm) / 30px (base) | `text-3xl sm:text-4xl lg:text-5xl` | — |
| Hero `<h1>` | font-weight | 700 | `font-bold` | — |
| Countdown text | font-size | 18px | `text-lg` | — |
| Countdown text | color | white | `text-white` | — |
| Date subtitle | font-size | 14px | `text-sm` | — |
| Date subtitle | color | rgba(255,255,255,0.6) | `text-white/60` | — |
| Remind me button | bg | `rgba(255,255,255,0.1)` | `bg-white/10` | — |
| Remind me button | border | `1px solid rgba(255,255,255,0.2)` | `border border-white/20` | — |
| Remind me button | border-radius | 9999px | `rounded-full` | — |
| Remind me button | padding | 12px 24px | `px-6 py-3` | — |
| Remind me button | min-height | 44px | `min-h-[44px]` | — |
| Back link | — | (identical styling to Remind me) | same classes | — |
| Breadcrumb wrapper | — | `py-2 mx-auto max-w-2xl px-4 sm:px-6` | (composed) | — |
| Breadcrumb item (non-last) | color | `rgba(255,255,255,0.5)` | `text-white/50 hover:text-white/70 hover:underline` | — |
| Breadcrumb item (last) | color | `rgba(255,255,255,0.8)` | `text-white/80` | — |
| Breadcrumb separator | color | `rgba(255,255,255,0.3)` | `text-white/30` | — |
| Community section | border-top | `1px solid rgba(255,255,255,0.1)` | `border-t border-white/10` | — |
| Community section | padding | 40px 0px | `py-8 sm:py-10` | — |
| Community inner | max-width | 672px | `max-w-2xl` | — |
| Community heading | — | 18px / 600 / white | `text-lg font-semibold text-white` | — |
| Community row | display | flex | `flex items-center gap-3 py-3` | — |
| Community avatar | — | 32×32, rounded-full, colored bg | `h-8 w-8 rounded-full` | `backgroundColor: AVATAR_COLORS[i]` |
| Community name | color | rgba(255,255,255,0.9) | `text-white/90` | — |
| Community action text | color | rgba(255,255,255,0.6) | `text-white/60` | — |
| Community timestamp | — | 12px / `text-white/60` | `text-xs text-white/60` | — |
| "Pray for the community" | — | border outline pill (not white-fill) | see §4 row by row | — |

---

## 11. Vertical Rhythm (desktop 1440, above breadcrumb+community)

| From → To | Gap (px) | How Achieved |
|---|---|---|
| Nav bottom → Hero top | 0 | Hero has `pt-40` (160px internal padding) |
| Hero h1 → description `<p>` | ~16px | `mt-4` on description |
| Description → Season pill | ~24px | `mt-6` on season row |
| Season pill → Countdown | ~24px | `mt-6` on future-block |
| "Starts in 37 days" → "May 24, 2026" | 4px | `mt-1` |
| Date → Action buttons | 24px | `mt-6` on actions flex row |
| Action buttons → Hero bottom | ~48px | `pb-12` on hero |
| Hero bottom → Breadcrumb top | 32px | Breadcrumb `py-2` + main `py-8` |
| Breadcrumb → Community section | ~30px | Community `py-10` top + `border-t` |
| (NO day navigation between, because `!isFutureChallenge` gates it) | | |

---

## 12. Recommended spec targets

Based on this recon, the spec should address:

1. **Primary: Guard `CommunityFeed` with `{!isFutureChallenge && ...}`** at ChallengeDetail.tsx:436 to match the guards on participant count (:288) and community goal (:296). Minimal change, highest impact.

2. **Secondary (optional, depends on product intent):** Replace the hidden feed with an "upcoming" state — e.g., a `FeatureEmptyState` (canonical per BB-34) saying "Community activity will start when the challenge begins on May 24, 2026" + optional "Browse the Prayer Wall" CTA. Avoids silence if the spec wants presence.

3. **Tertiary (if in scope):** `CommunityFeed` itself could accept a `status` prop (`'active' | 'upcoming' | 'past'`) and render appropriate copy for each. More invasive but future-proofs "past challenge" recon too (where fabricated "just now" activity is equally wrong). Not required for the MVP fix.

4. **Out of scope (do NOT touch):**
   - Hero background (ATMOSPHERIC_HERO_BG + themeColor is canonical inner-page pattern)
   - Navbar variant (Layout opacity is deliberate for detail pages)
   - Action button styling (glassmorphic secondary is right for this context — white pill would over-emphasize an optional reminder)
   - Breadcrumb placement below hero (site-wide convention)

---

## Plan Handoff Checklist

| Section | Present? | Used By /plan For |
|---|---|---|
| Screen Inventory | YES (1 screen: pre-start detail) | Understanding flow structure |
| Per-Screen Component Audit | YES | Ensuring plan covers every component |
| CSS Mapping Table | YES | Exact classes for any matching work |
| Gradient tables | YES (hero h1, hero bg) | Replicating gradient if needed |
| Vertical Rhythm tables | YES | Preserving spacing on fix |
| Link inventory | YES (Back, breadcrumb ×2, Pray for community) | Verifying `<a>` vs `<button>` semantics |
| States tables (hover/focus) | Partial — classes captured; synthetic hover events didn't trigger Tailwind `:hover`. Real hover behavior is class-defined (`hover:bg-white/15`). | Verification should use real pointer hover. |
| Conditional/dynamic content | YES (`isFutureChallenge` branch fully mapped) | The spec IS about a conditional — fully documented |
| Responsive CSS Mapping | Partial — class-level responsive tokens captured (`sm:`, `lg:`); mobile 375 screenshot taken but per-breakpoint computed table not extracted (screenshot sufficient for visual QA) | — |
| Text Content Snapshot | YES | Verification of copy |

---

## Raw recon artifacts

- **Data JSON:** `/tmp/recon-fire-pentecost-data.json` (200 lines, all computed styles)
- **Script:** `/tmp/recon-fire-of-pentecost.mjs`
- **Screenshots:** `frontend/playwright-screenshots/recon-fire-pentecost-*.png`
