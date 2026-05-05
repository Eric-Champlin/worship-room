# Spec 6B Recon — Grow Detail Pages + Day Content
**Date:** 2026-05-04
**Scope:** ReadingPlanDetail, ChallengeDetail, DayContent, ChallengeDayContent, DaySelector, ChallengeDaySelector, PlanNotFound, ChallengeNotFound
**Direction doc:** `_plans/direction/grow-2026-05-04.md`

LOC: ReadingPlanDetail 329, ChallengeDetail 566, DayContent 73, DaySelector 182, ChallengeDayContent 146, ChallengeDaySelector 185, PlanNotFound 29, ChallengeNotFound 29 — total ~1,539 LOC across 8 files.

Test files in scope: `pages/__tests__/ReadingPlanDetail.test.tsx` (~273 LOC, 19 tests), `pages/__tests__/ChallengeDetail.test.tsx` (~287 LOC, ~21 tests), `components/reading-plans/__tests__/DayContent.test.tsx` (37 LOC, 1 test), `components/challenges/__tests__/accessibility.test.tsx` (~283 LOC, ~12 tests covering ChallengeDayContent + ChallengeDaySelector + ActiveChallengeCard + UpcomingChallengeCard + PastChallengeCard).

---

## ReadingPlanDetail.tsx

**Route:** `/reading-plans/:planId`
**LOC:** 329
**Top-level structure:** uses `<Layout>` (default = standard navbar + footer + max-w-7xl content wrap), inner full-bleed `<div className="min-h-screen bg-dashboard-dark">` (line 189), then a hero `<section>`, breadcrumb, day content, day completion celebration, day navigation, plan completion overlay outside `<Layout>` content frame.

### Atmospheric layer
- **Current:** `<div className="min-h-screen bg-dashboard-dark">` (line 189) wrapping all body content. Hero `<section>` has `style={ATMOSPHERIC_HERO_BG}` (radial purple ellipse over `#0f0a1e`, line 193). NO `BackgroundCanvas`.
- **Target (Decision 2):** Wrap below-hero content in `<BackgroundCanvas>`. Hero retains its own `ATMOSPHERIC_HERO_BG` overlay; BackgroundCanvas fills the area below. This will replace or be paired with the existing `bg-dashboard-dark` wrapper.

### Layout system
- `<Layout>` wraps the page (default `transparentNav={false}`) at line 181. `Layout.tsx` line 18-30 shows that without `transparentNav`, the content area gets `mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8` — so `<Layout>` body has its own constrained content frame, but ReadingPlanDetail's `<div className="min-h-screen bg-dashboard-dark">` sits inside that, undoing the max-width constraint visually via the full-bleed `min-h-screen` block.
- Inner `<section>` (hero) is full-bleed `w-full`, breadcrumb has its own max-width, day content / day nav are constrained to `max-w-2xl`.

### Auth gating posture
- Day 1 always visible (logged-out friendly, line 111).
- Day 2+ requires authentication. `handleDayChange` (line 120-133) opens auth modal `'Sign in to start this reading plan'` when logged-out clicks any day past 1.
- Intersection observer at line 66-87 only fires when `isAuthenticated` (line 67); `recordActivity('readingPlan' as ActivityType, 'reading_plan')` writes to faith points.
- Plan completion overlay only fires when progress shows `completedAt` (line 96).

### Section-by-section render-order inventory

| # | Section | Lines | Notes |
|---|---|---|---|
| 1 | SEO + JSON-LD breadcrumb | 183-188 | Standard SEO spread |
| 2 | Outer wrapper `bg-dashboard-dark` | 189 | Atmospheric layer entry point |
| 3 | Hero `<section>` | 191-236 | `ATMOSPHERIC_HERO_BG`, emoji 5xl/6xl, gradient h1 with **font-script** last word, italic subtitle, duration/difficulty pills, optional progress bar |
| 4 | Breadcrumb | 239-246 | Component owns its own `max-w-2xl` |
| 5 | DayContent slot | 249-251 | Forwards `actionStepRef` for IntersectionObserver |
| 6 | DayCompletionCelebration | 254-266 | Conditional on `justCompletedDay === selectedDay` (mounts in `<div className="mx-auto max-w-2xl px-4 sm:px-6">`) |
| 7 | DaySelector + Prev/Next nav | 269-313 | `max-w-2xl pb-12` wrapper |
| 8 | PlanCompletionOverlay | 317-326 | Outside body wrapper, conditional |

### Hero treatment specifics
- **Line 195-197:** Emoji `text-5xl sm:text-6xl` decorative.
- **Line 199-201:** `<h1 ... style={GRADIENT_TEXT_STYLE}>{titlePrefix} <span className="font-script">{titleLastWord}</span></h1>` — last-word Caveat accent split via `titleWords.split(' ')` at line 160-162. **Decision 6:** entire h1 → `GRADIENT_TEXT_STYLE`, drop the inner `<span className="font-script">`.
- **Line 203-205:** `<p className="mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg">{plan.description}</p>` — **Decision 3:** migrate to `text-white/70 leading-relaxed` (drop italic, drop font-serif, lift opacity from /60 to /70).
- **Lines 207-214:** Two `rounded-full bg-white/10 px-4 py-1 text-sm text-white` pills (duration + difficulty).
- **Lines 216-235:** Progress bar with `bg-white/10` track + `bg-primary` fill (line 227). The fill uses `bg-primary` solid — this is data viz / progress, not a CTA, so probably out of Decision 9 button-migration scope, but worth noting.

### DayContent slot integration
- Line 250: `<DayContent day={currentDayContent} ref={actionStepRef} />` — the ref is forwarded down to the action-step `<section>` at DayContent.tsx:62 for IntersectionObserver to detect "the user has scrolled past the action step ⇒ mark day complete."

### Activity engine integration
- Line 32: destructures `recordActivity, todayActivities` from `useFaithPoints()`.
- Line 76: captures `pointsAlreadyAwardedRef.current = todayActivities.readingPlan` BEFORE mark-complete (so DayCompletionCelebration can decide whether to display "+25 pts" or skip).
- Line 77-79: `completeDay(planId, selectedDay)` (writes to `wr_reading_plan_progress`) → `recordActivity('readingPlan' as ActivityType, 'reading_plan')` → `setJustCompletedDay(selectedDay)`. Out of visual-migration scope but worth knowing — the IO observer must keep working after the FrostedCard wrap.

### Sound effects on completion observers
- **None.** ReadingPlanDetail does NOT call `playSoundEffect`. Only ChallengeDetail does (`playSoundEffect('ascending')` at line 144). Confirms grep results.

### Modals/overlays triggered (note PlanCompletionOverlay is 6C scope)
- DayCompletionCelebration (line 256-264) — inline frosted card, not a modal. Stays as-is for 6B (its `bg-primary` Continue button is Decision 9 / spec 6C scope).
- PlanCompletionOverlay (line 318-325) — full-screen modal. **6C scope** (Caveat removal in headline). 6B leaves it untouched.

### Deprecated patterns enumerated
1. **Caveat font** at line 200 (`<span className="font-script">{titleLastWord}</span>`) → `GRADIENT_TEXT_STYLE` only (Decision 6).
2. **`font-serif italic` subtitle** at line 203 → `text-white/70 leading-relaxed` (Decision 3).
3. **`bg-primary` solid** at line 227 (progress bar fill) — informational only; out of scope per Decision 9 (button-only). Leave as-is.
4. **Rolls-own dark background wrapper** at line 189 (`min-h-screen bg-dashboard-dark`) — replace below-hero content with `<BackgroundCanvas>` per Decision 2.

---

## ChallengeDetail.tsx

**Route:** `/challenges/:challengeId`
**LOC:** 566
**Top-level structure:** `<Layout transparentNav>` (line 250) — uses `transparentNav` to opt out of the default max-w-7xl content wrap (Layout.tsx:30 sets `'contents'` instead). Page is full-bleed throughout. NO `bg-dashboard-dark` wrapper at this level — relies on Layout default + ATMOSPHERIC_HERO_BG only.

### Atmospheric layer
- **Current:** Hero gets a custom `heroStyle` (line 222-225) that COMPOSES `ATMOSPHERIC_HERO_BG` with a per-challenge themeColor radial gradient: `radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 0%, transparent 60%), ${ATMOSPHERIC_HERO_BG.backgroundImage}`. This double-radial preserves the canonical purple ellipse AND adds a brand-color tint at the top. The themeColor part is deliberately weak (`20` = 12.5% alpha) and sits ON TOP of the canonical hero gradient.
- **No `bg-dashboard-dark` wrapper around body.** The page relies on `<Layout transparentNav>` plus the html/body/#root `#08051A` baseline.
- **Target (Decision 2):** wrap below-hero content in `<BackgroundCanvas>`. Theme-color overlay logic on hero stays exactly as-is (it composes into the existing ATMOSPHERIC_HERO_BG).

### Theme-color overlay logic on hero
- Line 222-225 builds `heroStyle` by spreading ATMOSPHERIC_HERO_BG then overriding `backgroundImage` with `radial-gradient(...)${challenge.themeColor}20, ${ATMOSPHERIC_HERO_BG.backgroundImage}`. Decision 2 explicitly preserves this — the spec must not flatten the heroStyle merge or drop the themeColor halo.

### Layout system
- `<Layout transparentNav>` (line 250). Layout.tsx:30 `!hero && transparentNav && 'contents'` means the inner main element passes through with no wrapping max-width.
- All body content is constrained per-section: hero `max-w-4xl` (line 263), breadcrumb its own `max-w-2xl`, day content `max-w-2xl`, completion celebration `max-w-2xl`, day nav `max-w-2xl`.

### Auth gating posture
- Day 1 always visible; for past challenges all days visible (`isPastChallenge` line 103 → `isDayAccessible` returns `true` regardless of auth).
- Active joined: `currentDay+1` and earlier days accessible; locked otherwise.
- Logged-out clicking a locked day → `'Sign in to join this challenge'` modal (line 117).
- `Join Challenge` (line 351) → handleJoin calls auth modal if logged-out (line 175-177).
- Mark Complete only renders when `isCurrentDay && isAuthenticated && !isPastChallenge` (rendered inside ChallengeDayContent, not on this page).

### Section-by-section render-order inventory

| # | Section | Lines | Notes |
|---|---|---|---|
| 1 | SEO | 252-256 | Standard `CHALLENGE_DETAIL_METADATA` spread |
| 2 | Hero `<section>` | 259-408 | full-bleed, themeColor halo composed with ATMOSPHERIC_HERO_BG |
| 3 | Breadcrumb | 411-418 | own `max-w-2xl` |
| 4 | MilestoneCard (conditional) | 421-435 | 6C scope (Caveat removal in headline) — NOT 6B |
| 5 | ChallengeDayContent slot | 438-456 | conditional on `showDayContent` |
| 6 | CommunityFeed | 459-469 | state-aware (active/upcoming/completed) |
| 7 | Inline completion banner | 472-484 | rolls-own `rounded-2xl border border-success/20 bg-success/10 p-6` — DOES NOT match Decision 7's "DayContent action callout → subdued" mapping; this is a different banner. Not enumerated in direction doc; flagging below in cross-cutting findings. |
| 8 | Day navigation (selector + prev/next) | 487-534 | constrained to `max-w-2xl pb-12` |
| 9 | SwitchChallengeDialog (conditional) | 537-551 | 6C overlay scope |
| 10 | ChallengeCompletionOverlay (conditional) | 554-563 | 6C overlay scope |

### Hero treatment specifics
- **Line 264-269:** `<ChallengeIcon style={{ color: challenge.themeColor }}>` — 12×12 icon, themeColor preserved (Decision 11 preserves themeColor for ChallengeIcon).
- **Line 271-276:** `<h1 ... style={GRADIENT_TEXT_STYLE}>{challenge.title}</h1>` — NO inner font-script span, h1 already uses gradient. Test at ChallengeDetail.test.tsx:259-264 already asserts `h1.querySelector('.font-script')` is null. **Decision 6 is already satisfied for this h1.** No change needed (cross-check the direction doc table at line 105 which says "ChallengeDetail.tsx:278 h1 last word → entire h1 uses GRADIENT_TEXT_STYLE" — this is already done; the doc is overstating scope here).
- **Line 278-280:** `<p className="mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg">{challenge.description}</p>` — **Decision 3:** migrate to `text-white/70 leading-relaxed` (same as ReadingPlanDetail).
- **Line 282-289:** Two season + duration pills (`rounded-full bg-white/10 px-4 py-1 text-sm text-white`).
- **Line 292-314:** Progress bar with `bg-white/10` track + themeColor fill (line 304-307).
- **Line 317-322:** Participant count icon + count.
- **Line 325-347:** Community goal mini progress bar — themeColor fill at line 339.
- **Line 350-359:** Join Challenge button with `style={{ backgroundColor: challenge.themeColor }}` and `getContrastSafeColor()` not invoked here (text is hardcoded white at line 354). Decision 8 preserves the themeColor inline style.
- **Line 362-406:** Future challenge countdown UI with bell toggle and Back to Challenges link.

### `style={{ backgroundColor: themeColor }}` button sites
1. **Line 355:** Hero "Join Challenge" button. Preserved per Decision 8.
2. **ChallengeDayContent line 98:** "Mark Complete" button. Preserved per Decision 8.
3. **ChallengeDayContent line 126:** "Go to {actionLabel} →" link, `style={{ color: themeColor }}` (text color, not bg). Preserved per Decision 11 themeColor brand expression.
4. **ChallengeShareButton line 86:** Share button. Preserved per Decision 8 (inside ChallengeDayContent).

### ChallengeDayContent slot integration
- Line 438-456: passes `themeColor`, `isCurrentDay`, `isAuthenticated`, `isPastChallenge`, `onMarkComplete`, `actionRoute`, `actionLabel`, `challengeId`, `challengeTitle`, `completedDaysCount`, `streak`, `totalDays`. The component owns its own day title h2, scripture/reflection sections, and the action callout.

### Activity engine integration
- Line 23: imports `useFaithPoints`.
- Line 60-68: `recordActivityForChallenge` wraps `rawRecordActivity(type, 'challenge')` (memoized).
- Line 65-77: passes the wrapped recordActivity into `useChallengeAutoDetect()` (auto-completes the challenge day if the user already did the action via the linked feature, e.g., posted on Prayer Wall).
- Line 138-171 `handleMarkComplete`: calls `completeDay(challengeId, selectedDay, recordActivityForChallenge)` then `playSoundEffect('ascending')`. Then either fires `setCompletionOverlay` (if final day) or `setActiveMilestone` (if a milestone day matches).

### Sound effects on completion observers
- **Line 144:** `playSoundEffect('ascending')` fires immediately after `completeDay()` (synchronous). NOT wrapped in IntersectionObserver — fires on click of Mark Complete.
- ReadingPlanDetail has NO equivalent sound. Asymmetry between the two pages — flag for product if 6B should harmonize.

### Modals/overlays triggered (note overlays are 6C scope)
- **MilestoneCard (line 422-435)** — inline card, not a modal. Caveat removal in 6C.
- **SwitchChallengeDialog (line 540-550)** — 6C-scope.
- **ChallengeCompletionOverlay (line 555-562)** — 6C-scope.
- 6B leaves all three untouched.

### Deprecated patterns enumerated
1. **`font-serif italic` subtitle** at line 278 → `text-white/70 leading-relaxed` (Decision 3).
2. **No Caveat in this file's h1** (already gradient — direction-doc line 105 may overstate scope).
3. **No `min-h-screen bg-dashboard-dark` wrapper** at this level — Decision 2 BackgroundCanvas wraps below-hero content. (Detail page differs from ReadingPlanDetail in this respect.)
4. **`bg-primary` solid** in scope: NONE on this page. Only progress fills use `themeColor` (which stays).
5. **Inline completion banner at line 474** uses rolls-own `rounded-2xl border border-success/20 bg-success/10 p-6` — NOT enumerated in direction doc Decision 7. See cross-cutting findings.

---

## DayContent.tsx

**LOC:** 73
**Imports:** `forwardRef` (React), `VerseLink` from `@/components/shared/VerseLink`, `PlanDayContent` type.
**Used by:** ReadingPlanDetail.tsx:250 only.
**ref forwarding:** the entire root `<div>` does NOT receive the ref; the action-step `<section>` (line 62) gets `ref={ref}` so the IntersectionObserver in ReadingPlanDetail observes the action-step coming into view.

### Section structure
| # | Section | Lines | Treatment |
|---|---|---|---|
| 1 | Day title h2 | 15-17 | `pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl` (no border-top — first section) |
| 2 | Passage | 20-37 | reference + verses, scripture italic Lora |
| 3 | Reflection | 40-49 | reflection paragraphs (white/80) |
| 4 | Closing Prayer | 52-59 | font-serif italic prayer |
| 5 | Action Step | 62-69 | rolls-own callout with `ref={ref}` |

### Action callout chrome
- **Current (line 63):** `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">` — rolls-own.
- **Target (Decision 7):** `<FrostedCard variant="subdued">`. The primitive's `subdued` variant uses `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` (FrostedCard.tsx:39-42). Side effects:
  - Border opacity drops slightly (`/10` → `/[0.10]` — same value, different format).
  - Background opacity unchanged (`bg-white/5` → `bg-white/[0.05]`).
  - Radius bumps `rounded-2xl` → `rounded-3xl` (16px → 24px).
  - Padding changes from `p-4 sm:p-6` → `p-5` (no sm bump). Direction doc accepts this side effect (line 138-139).
  - **CRITICAL:** the `ref={ref}` forwarding currently goes on the wrapping `<section>`, not on the rolls-own div. Migrating to `<FrostedCard>` — IF the spec wants the ref on the FrostedCard root — needs FrostedCard to accept a ref or the ref stays on the outer `<section>`. Recommendation: keep `ref={ref}` on the `<section>` (current pattern); the FrostedCard sits inside as the visible chrome. IO observer threshold is 0.5, which keys off the outer `<section>` boundingbox; behavior is preserved.

### Scripture rendering
- Line 27-36: `<div className="font-serif text-base italic leading-relaxed text-white/90 sm:text-lg">` — `font-serif italic` ON SCRIPTURE PROSE.
- **Decision 4:** scripture stays `font-serif italic` (canonical exception). DO NOT migrate.
- Verse number sup at line 30-32: `font-sans text-xs not-italic text-white/30` — already correct, scripture exception applies to the prose only.

### Prayer rendering structure
- Line 53-58: `<p className="font-serif text-base italic leading-relaxed text-white/80">{day.prayer}</p>` — same `font-serif italic`. **Direction doc Decision 4 mentions scripture only** — does prayer text count as scripture-adjacent or as a body subtitle? The prayer is user-facing prose, not a Bible quote. Flag for product/design (open question below).
- Eyebrow label "Closing Prayer" at line 53-55 uses `text-xs font-medium uppercase tracking-widest text-white/60` — same eyebrow pattern as Reflection.

### Tonal icon opportunities
- DayContent has NO Lucide icons currently. Eyebrows are uppercase text only.
- Direction doc Decision 11 does not enumerate any icons for DayContent. No tonal-icon work for 6B in DayContent.

### Activity completion handlers
- DayContent itself does NOT call recordActivity / playSoundEffect. The IntersectionObserver lives in ReadingPlanDetail; DayContent only forwards the ref.

### Section dividers
- Each `<section>` after the title has `border-t border-white/10` (lines 20, 40, 52, 62). This is internal section divider chrome — out of scope per Decision 7 mapping (only the action callout migrates). Leave as-is.

---

## ChallengeDayContent.tsx

**LOC:** 146
**Imports:** Lucide icons (Brain, Heart, MessageSquare, Music2, PenLine, Smile, LucideIcon), Link from react-router-dom, `ChallengeShareButton`, `getMusicDestination`, `ChallengeActionType` + `DayChallengeContent` types.
**Used by:** ChallengeDetail.tsx:439 only.

### Section structure
| # | Section | Lines | Treatment |
|---|---|---|---|
| 1 | Day title h2 | 54-56 | same shape as DayContent |
| 2 | Scripture | 59-66 | reference + scripture text, italic Lora |
| 3 | Reflection (h3) | 69-78 | reflection paragraphs |
| 4 | Daily action callout | 81-143 | rolls-own with ActionIcon, action button (themeColor bg), Link, ChallengeShareButton |

### Action callout chrome
- **Current (line 82):** `<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">` — same rolls-own as DayContent.
- **Target (Decision 7):** `<FrostedCard variant="subdued">`. Same side effects as DayContent (radius bump, padding shift). No `ref` to worry about (no IO observer on this surface — Mark Complete is a button click, not a scroll trigger).

### Scripture rendering
- Line 63-65: `<p className="font-serif text-base italic leading-relaxed text-white/90 sm:text-lg">{day.scripture.text}</p>`. Decision 4 preserves `font-serif italic`.
- Line 60-62: reference eyebrow uses uppercase tracked-widest white/60 — same pattern as DayContent.

### Theme-color usage internal to day content
- **Line 84-88:** `<ActionIcon className="h-5 w-5 shrink-0" style={{ color: themeColor }} aria-hidden="true" />` — themeColor preserved as icon color per Decision 11 (theme-color brand expression).
- **Line 96-101:** Mark Complete button with `style={{ backgroundColor: themeColor }}` — preserved per Decision 8.
- **Line 125-127:** "Go to {actionLabel} →" Link with `style={{ color: themeColor }}` — preserved per Decision 11.

### Differences from DayContent
- Has an Reflection h3 instead of an eyebrow `<p>` (line 70 — `<h3 className="mb-4 text-xs font-medium uppercase tracking-widest text-white/60">Reflection</h3>`). Actual `<h3>` semantic vs DayContent's `<p>`.
- Has tier-3 icon + button + link + ChallengeShareButton inside the callout — much more visual density than DayContent's plain text action step.
- No closing prayer section.
- ActionIcon comes from `ACTION_TYPE_ICONS` map (line 8-15) keyed by `day.actionType`. Per-action category icons (pray/journal/meditate/music/gratitude/prayerWall) — these have their own brand association (themeColor) so Decision 11's tonal icon pattern does NOT apply (they stay themeColor).
- ChallengeShareButton renders inside the callout (line 131-141) when authenticated and progress > 0 — adds a 4th interactive element to the card.

### Tonal icon opportunities
- ActionIcon (line 84-88) — already uses themeColor, stays per Decision 11.
- No other icons in scope. Decision 11 does not enumerate any tonal-icon work for ChallengeDayContent.

### Activity completion handlers
- ChallengeDayContent itself does NOT call recordActivity. It calls `onMarkComplete` (prop, line 96) — the parent (ChallengeDetail) handles `playSoundEffect('ascending')` + `recordActivityForChallenge` + state machine.

---

## DaySelector.tsx

**LOC:** 182
**Used by:** ReadingPlanDetail.tsx:271.

### Canonical pattern verification

Direction doc says "verification only — currently uses canonical patterns." **Confirmed canonical** with no drift:

- ✅ **Listbox ARIA + keyboard nav:** `aria-haspopup="listbox"` on trigger (line 124), `aria-expanded={isOpen}` (line 125), `role="listbox"` + `aria-label="Select a day"` on panel (line 139-140).
- ✅ **Keyboard handling (line 54-87):** ArrowDown/Up/Enter/Space/Escape — all implemented.
- ✅ **`role="option"` + `aria-selected` + `aria-disabled` + `tabIndex={-1}`** on each item (line 152-155).
- ✅ **Outside-click dismissal:** mousedown listener at line 90-104.
- ✅ **`scrollIntoView` on focused item:** line 107-113.
- ✅ **44px min trigger:** `min-h-[44px]` at line 126.
- ✅ **Animation tokens:** `transition-transform motion-reduce:transition-none` (line 131) for chevron rotation. `transition-colors hover:bg-white/15` (line 126) for trigger hover. NO hardcoded `200ms` or `cubic-bezier(...)`. ✅ canonical.

### Day completion visual states
- Completed: `<Check size={16} className="text-success" />` (line 167) — green check inside the row.
- Locked: `<Lock size={14} className="text-white/30" />` (line 169) — gray lock + `cursor-not-allowed text-white/30` row.
- Current: `bg-white/10` row highlight (line 159).
- Focused (keyboard): `bg-white/5` (line 160).
- Hover (non-current, non-locked): `hover:bg-white/10` (line 162).

### Button vs role="option" usage
- Trigger is `<button>` (line 117).
- Items use `role="option"` on `<div>` (line 150) NOT a real `<button>`. Acceptable per ARIA listbox pattern (the listbox handles keyboard nav at the parent level via `onKeyDown` on the wrapping div at line 116).
- No PastChallengeCard-style `role="button"` on `<div>` deviation here — the `role="option"` is the canonical listbox child.

### Drift findings: NONE
- Day selector is canonical. No 6B work needed beyond test-runtime smoke after FrostedCard migrations elsewhere don't break it.

---

## ChallengeDaySelector.tsx

**LOC:** 185
**Used by:** ChallengeDetail.tsx:490.

### Canonical pattern verification

Same shape as DaySelector. Differences from DaySelector:

- Adds `isPastChallenge` prop (line 14, 23) → unlocks all days for past challenges (line 37).
- `handleSelect` toast copy: "Today's step comes first — take it at your pace." vs DaySelector's "Take today's step first — it's waiting for you." (Two different anti-pressure phrasings — neither is wrong; both feel canonical for Worship Room voice.)
- All other ARIA, keyboard, completion-state visual treatment IDENTICAL to DaySelector.

### Theme-color usage
- **None inside the selector.** No themeColor inline style anywhere. Completion/lock states use neutral tokens (`text-success`, `text-white/30`).
- This is consistent with the broader recon — selector is theme-neutral; the parent (ChallengeDetail) handles themeColor on hero/buttons.

### Drift findings: NONE
- Canonical. 6B verification pass only.

---

## PlanNotFound.tsx

**LOC:** 29
**Used by:** ReadingPlanDetail.tsx:145, 158 (twice — once for missing meta, once for missing plan after async load).

### Caveat usage location
- **Line 18-23:** the "Browse Reading Plans" Link is `<Link to="/grow?tab=plans" className="font-script text-2xl text-primary transition-colors hover:text-primary-lt">Browse Reading Plans</Link>`.
- **Two violations on this single line:**
  1. **`font-script`** (Decision 6 — but PlanNotFound link gets the utility-nav exception, NOT GRADIENT_TEXT_STYLE).
  2. **`text-primary` ghost link color** (Decision 9 doesn't enumerate ghost links — but utility-nav exception applies).

### Replacement target per Decision 6
- "PlanNotFound + ChallengeNotFound link styling: use plain text-white/80 underlined link (these are utility nav, not celebration)."
- Suggested target: `text-base text-white/80 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark` (or equivalent). Need to drop `text-2xl` (sized down to a normal link), drop `font-script`, drop `text-primary`/`hover:text-primary-lt`, add `underline`.
- Side effect: link visually shrinks dramatically (text-2xl → text-base) — design call to confirm if Browse link should be a button-styled CTA instead. Direction doc says "plain text-white/80 underlined link" so the small-link interpretation is correct per the locked decision.

### Surrounding chrome
- Line 7-12: `<div className="min-h-screen bg-dashboard-dark"><Navbar transparent /><div className="flex min-h-[60vh] items-center justify-center">...`. Standard `bg-dashboard-dark` wrapper with a centered card pattern. Layout uses `Navbar` directly + `SiteFooter` directly (line 9 + 26) instead of `<Layout>`. Out of scope to change for 6B unless we also want PlanNotFound + ChallengeNotFound to get BackgroundCanvas (Decision 2 mentions detail pages, not their not-found fallbacks — flag as open question).
- h1 at line 12-14: `text-3xl font-bold text-white sm:text-4xl` — plain white heading, not gradient. NOT enumerated in Decision 6's site list. Leave as-is.
- `text-white/60` description (line 15) — out of Decision 3 scope (Decision 3 is about subtitles in detail-page heroes specifically). Leave as-is.

---

## ChallengeNotFound.tsx

**LOC:** 29
**Used by:** ChallengeDetail.tsx:206 (single use — when `getChallenge(challengeId)` returns undefined).

Identical structure to PlanNotFound. Same Caveat link at line 18-23 with same `font-script text-2xl text-primary` violation.

### Differences from PlanNotFound
- "Challenge Not Found" headline.
- "Browse Challenges" link → `/grow?tab=challenges`.
- Otherwise byte-identical.

### Replacement target
- Same as PlanNotFound: plain `text-white/80` underlined link.

---

## Cross-cutting findings

### Sub-section visual patterns NOT enumerated in direction doc
1. **ChallengeDetail inline completion banner (line 472-484)** uses `rounded-2xl border border-success/20 bg-success/10 p-6 text-center`. This is rolls-own banner chrome NOT covered by Decision 7's table. It's a standalone success card that fires only when `justCompletedFinalDay` is true (line 472). Since a real ChallengeCompletionOverlay also fires on `setCompletionOverlay`, this inline banner appears redundant — it's a fallback that may never fire in practice (the overlay always opens via `setCompletionOverlay` immediately after). Suggest the spec drop the inline banner entirely OR migrate to `<FrostedCard variant="subdued">`. **Open question for product.**
2. **Hero subtitles use `text-white/60`** (both detail pages, lines 203 + 278) — direction doc says target `text-white/70`. Decision 3 lifts opacity from /60 → /70 (subtle but documented change for both subtitles).
3. **Day title h2 in DayContent + ChallengeDayContent** (`text-2xl font-bold text-white sm:text-3xl`) is white solid — matches the "default to text-white on Daily Hub" standard. No migration needed.

### `bg-primary` solid buttons in scope NOT enumerated in direction doc
- ReadingPlanDetail line 227: `bg-primary` is a PROGRESS BAR FILL, not a CTA button. Decision 9 only covers buttons. Leave as-is. (No `bg-primary` solid CTAs in 6B's scope.)

### `text-primary` ghost links in scope NOT enumerated in direction doc
- PlanNotFound line 20 (`text-primary transition-colors hover:text-primary-lt`) — covered by Decision 6's utility-nav exception, replaced with `text-white/80` plain underlined link. ✅ enumerated.
- ChallengeNotFound line 20 — same. ✅ enumerated.
- No other `text-primary` ghost links in 6B scope.

### Reactive-store consumers (BB-45 anti-pattern check)
- **No reactive stores read in 6B scope.** Both `useReadingPlanProgress` and `useChallengeProgress` are plain `useState`-backed CRUD hooks (not the BB-7 reactive store pattern). Note: `bible:plans` (mentioned in CLAUDE.md as a Pattern B store) is a Bible-wave reading-plans store, distinct from `wr_reading_plan_progress` used by GrowPage's reading plans. The Grow detail pages use the LATTER, which is plain useState — no subscription required, no BB-45 risk.
- ChallengeShareButton + reactive store consumers in CommunityFeed are out of scope.

### Animation token discipline
- ReadingPlanDetail: ✅ uses `duration-slow` (line 227) and `motion-reduce:transition-none` consistently. No hardcoded ms or cubic-bezier.
- ChallengeDetail: ✅ uses `duration-slow` (line 303, 336) and `duration-fast` (line 354, 378). No hardcoded values.
- DayContent, ChallengeDayContent, DaySelector, ChallengeDaySelector, PlanNotFound, ChallengeNotFound: ✅ no transition-duration hardcoded values; only `transition-colors`, `transition-transform`, `transition-opacity` keyword classes (Tailwind defaults). No drift.

### Accessibility observations within scope
- **Skip-to-main-content:** ReadingPlanDetail uses `<Layout>` which mounts the canonical Navbar skip link. ChallengeDetail uses `<Layout transparentNav>` — same Navbar, same skip link. PlanNotFound + ChallengeNotFound mount `<Navbar>` directly so they get the skip link too. ✅ all canonical.
- **Focus management:** DaySelector + ChallengeDaySelector implement focus restoration (`triggerRef.current?.focus()` after select / Escape). ✅ canonical.
- **ARIA on listbox:** verified canonical (see DaySelector + ChallengeDaySelector sections).
- **Mark Complete + Join Challenge:** both `<button>` elements with `min-h-[44px]` and `focus-visible:ring-2 focus-visible:ring-primary-lt/70`. ✅ canonical.
- **Breadcrumb:** standard `<Breadcrumb>` component with `<nav aria-label="breadcrumb">`. ✅ canonical.
- **Theme-color contrast:** ChallengeDayContent Mark Complete button uses themeColor as background with hardcoded white text (line 100 — `text-white`). For low-luminance themeColors this is fine; for very light themeColors (e.g., a pale gold) this could fail WCAG. The `getContrastSafeColor()` helper exists in `ChallengeShareButton` but is NOT used here. Pre-existing concern; out of 6B scope.
- **DayCompletionCelebration "Continue" `bg-primary`** (out of 6B scope per direction doc — 6C scope). Noted for completeness.

---

## Tests inventory

### `pages/__tests__/ReadingPlanDetail.test.tsx`
- **Path:** `/Users/eric.champlin/worship-room/frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx`
- **LOC:** 273
- **Test count:** ~19 tests across 3 describe blocks (top-level + Breadcrumb).
- **At-risk assertions after FrostedCard migration:**
  - Line 220-225: `'has all-dark background'` — queries `document.querySelector('.bg-hero-dark')`. **Currently passes** because Layout's content frame contains a `bg-hero-dark` element somewhere; the query is loose. **Fragile after BackgroundCanvas wrap** — BackgroundCanvas uses inline `style={{ background: ... }}` (no `bg-hero-dark` class). If the existing `bg-dashboard-dark` wrapper is removed in favor of BackgroundCanvas, this test may pass-by-accident or fail. **Spec must update this test to query for the new background marker (BackgroundCanvas's known class signature, or a data-testid).**
  - Line 113-119: hero text + duration + difficulty assertions — should survive the subtitle migration since the description text doesn't change.
  - Line 149-154: action step "Today's Action Step" + body text. **Survives FrostedCard migration** (the text content is the same, only the wrapping chrome changes from rolls-own to FrostedCard primitive).
- **No snapshot tests.** All assertions are `findByText` / `findByRole` semantic queries. Migration-resilient.

### `pages/__tests__/ChallengeDetail.test.tsx`
- **Path:** `/Users/eric.champlin/worship-room/frontend/src/pages/__tests__/ChallengeDetail.test.tsx`
- **LOC:** 287
- **Test count:** ~21 tests across 3 describe blocks (top-level + Breadcrumb + Facelift).
- **At-risk assertions after migration:**
  - Line 259-264: `'hero h1 does NOT use font-script'` — `expect(h1.querySelector('.font-script')).toBeNull()`. **Already passes today** (h1 already gradient-only). Continues to pass.
  - Line 280-285: `'completed challenge does NOT render avatar-based activity items'` — queries `div.h-8.w-8.rounded-full[aria-hidden="true"]`. Out of 6B scope (CommunityFeed-related).
  - Line 286: closing of describe block.
  - **No fragile DOM-class queries** for FrostedCard migration on ChallengeDetail itself — the action callout chrome is in ChallengeDayContent, not the page.

### `components/reading-plans/__tests__/DayContent.test.tsx`
- **Path:** `/Users/eric.champlin/worship-room/frontend/src/components/reading-plans/__tests__/DayContent.test.tsx`
- **LOC:** 37
- **Test count:** 1 test (`'reading plan day reference is a link'`).
- **At-risk assertions:** NONE. The single test asserts the VerseLink href, not the action callout chrome. **Migration-resilient.**
- **Drift-prone:** none. No structural / class-string queries.

### `components/challenges/__tests__/accessibility.test.tsx`
- **Path:** `/Users/eric.champlin/worship-room/frontend/src/components/challenges/__tests__/accessibility.test.tsx`
- **LOC:** 283
- **Test count:** ~12 tests across 5 describe blocks (ActiveChallengeCard 5, UpcomingChallengeCard 1, PastChallengeCard 3, ChallengeDaySelector 2, ChallengeDayContent 2).
- **In-scope tests (only ChallengeDaySelector + ChallengeDayContent):**
  - Line 193-240: ChallengeDaySelector `'locked days have aria-disabled'` + `'keyboard navigation works'`. **Migration-resilient.** ARIA contract holds across visual migration.
  - Line 242-281: ChallengeDayContent `'Mark Complete button has min-h-[44px]'` (queries `container.querySelector('button')` — fragile if there are multiple buttons after FrostedCard migration; today there's exactly one button before the Link, so the query returns Mark Complete) + `'uses h3 for section headings'`. **Mark Complete button query is fragile if FrostedCard subdued migration adds any wrapping interactive element**, but since `variant="subdued"` is non-interactive (no onClick prop in the migration), the button count stays at 1. **Survives.**
  - Note: the same test file at lines 17-191 has Spec 6A tests (ActiveChallengeCard, UpcomingChallengeCard, PastChallengeCard) — those are out of 6B scope.
- **Drift-prone snapshots:** none. All semantic queries.

### Test-suite resilience summary
- Total in-scope tests: ~19 + ~21 + 1 + 4 (relevant subset) = **~45 tests** across 4 files.
- High-risk (must update in spec): 1 — `'has all-dark background'` in ReadingPlanDetail.test.tsx:220-225.
- Medium-risk (verify after migration): the Mark Complete button query in accessibility.test.tsx:259 if FrostedCard subdued ever becomes interactive. Currently safe.
- Low-risk: everything else.

---

## Open questions for product/design

1. **Inline ChallengeDetail completion banner (line 472-484).** The rolls-own success-tinted banner appears redundant with ChallengeCompletionOverlay, which fires immediately on `setCompletionOverlay` after `justCompletedFinalDay = true`. Direction doc Decision 7 doesn't enumerate it. Options: (a) drop entirely, (b) migrate to `<FrostedCard variant="subdued">` and treat as fallback, (c) leave as-is rolls-own. **Recommend (a) drop entirely** if the overlay is the canonical celebration moment and the inline banner would only flash briefly under it.

2. **Closing Prayer text in DayContent (line 53-58).** Currently `font-serif italic` like scripture. Decision 4 says "scripture" stays italic. Is the closing prayer scripture-adjacent (treat as italic exception) or body prose (migrate to non-italic)? **Recommend treat as italic exception** — it's quoted prayer voice, semantically closer to scripture than to body prose, and visually anchors the section.

3. **PlanNotFound + ChallengeNotFound BackgroundCanvas wrap.** Decision 2 mentions `/reading-plans/:planId` and `/challenges/:challengeId` detail pages. The not-found fallback components ALSO render at those routes (when planId/challengeId is invalid). Should they get BackgroundCanvas too? **Recommend yes** — they're rendered at the same routes, atmospheric continuity matters.

4. **PlanNotFound + ChallengeNotFound link sizing.** Going from `text-2xl font-script` to plain `text-white/80 underlined` shrinks the link visual weight significantly. Confirm this is the intent vs. styling it as a small white-pill CTA button (still no Caveat, but more visually anchored as the primary action of the not-found page).

5. **DayContent action-step ref forwarding.** The `ref={ref}` currently sits on the wrapping `<section>` (line 62), not on the rolls-own div. Migration recommendation: keep the ref on the `<section>`, place `<FrostedCard variant="subdued">` inside as the visible chrome. IO observer threshold (0.5) keys off the outer section. Confirm this satisfies the "use the FrostedCard primitive" intent of Decision 7 — alternatively, the spec could reshape the ref forwarding to land on the FrostedCard root (would require updating FrostedCard.tsx to accept a ref or using a wrapping div).

6. **ChallengeDetail Mark Complete button** (Decision 8 says theme-color preserved; verify the Mark Complete button is a Decision 8 site). **Confirmed** — line 96-101 of ChallengeDayContent has `style={{ backgroundColor: themeColor }}` on Mark Complete. Decision 8 explicitly preserves this. ✅ no question, just verifying.

7. **Day selector themed pulse / completion check.** ChallengeDaySelector has NO themeColor styling — completion checkmark is `text-success` (green), not themeColor. **Selector stays theme-neutral.** No question, just verifying scope is intentionally narrow.

8. **Asymmetry: ReadingPlanDetail has no completion sound effect; ChallengeDetail does (`playSoundEffect('ascending')` on line 144).** Should 6B harmonize this (add an ascending sound to readingPlan day completion, or remove from challenge)? **Out of visual-migration scope** — flag for future spec.
