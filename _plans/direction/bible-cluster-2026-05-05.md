# Direction — Bible Cluster (Specs 8A, 8B, 8C)

**Date:** 2026-05-05
**Recon:** `_plans/recon/bible-2026-05-05.md`
**Scope:** All Bible surfaces — BibleLanding, BibleBrowse, MyBiblePage, PlanBrowserPage, BiblePlanDetail, BiblePlanDay, BibleReader (per documented exception), memorization deck, reading heatmap, progress map, plan completion celebration

## Premise

Bible is the largest cluster in the rollout — ~21,000 LOC across ~150 files, ~111 test files. Recon found 5 different atmospheric treatments live simultaneously, real reactive-store correctness bugs (not just visual drift), and a documented exception (BibleReader's reader-bg theming) that bounds part of the scope.

This is a multi-spec cluster: 8B (MyBible) → 8C (Plans) → 8A (Reader). Memorization folds into 8B. Sub-spec ordering is deliberate — 8B establishes patterns that 8C and 8A consume.

## Locked decisions

### Atmospheric layer

**Decision 1: Standardize on `<BackgroundCanvas>` for all "outer" Bible surfaces.**

BibleLanding (✅ already), BibleBrowse, MyBiblePage, PlanBrowserPage (✅ already), BiblePlanDetail, BiblePlanDay all use BackgroundCanvas. BibleReader stays on its theme-scoped reader-bg per documented Layout Exception in `09-design-system.md`. HorizonGlow stays scoped to Daily Hub — does NOT migrate to MyBiblePage.

Specifically:

- MyBiblePage: HorizonGlow → BackgroundCanvas (Spec 8B)
- BibleBrowse: ATMOSPHERIC_HERO_BG inline + bg-hero-bg body → BackgroundCanvas wrap (Spec 8B or fold into 8C)
- BiblePlanDetail: ATMOSPHERIC_HERO_BG inline + bg-dashboard-dark flat below → BackgroundCanvas wrap (Spec 8C)
- BiblePlanDay: same migration as BiblePlanDetail (Spec 8C)
- BibleReader: NO CHANGE (documented exception)

The "Daily Hub pt-36 pattern" inline comment on MyBiblePage that confesses the drift gets removed when the migration lands.

### Auth posture

**Decision 2: Remove the MyBiblePage auth gate.**

Logged-out users see their localStorage personal layer on MyBiblePage. Aligns with the BB-0–BB-46 promise: "the unauthenticated experience must be complete."

Implementation:

- Remove the auth check that renders `MyBiblePageInner` shell vs `MyBibleAuthenticatedInner` based on `useAuth().isAuthenticated`
- Render the personal layer for everyone — both logged-out and logged-in users see their own localStorage data
- Add a small banner or footer note for logged-out users: "Your data lives on this device. Sign in to keep it safe across devices." (or similar copy — soft, anti-pressure, no urgency)
- The "Get Started — It's Free" CTA shell that previously rendered for logged-out users disappears entirely

Phase 3 will add optional sync; until then, logged-out users see their own work like every other Bible surface allows.

### Scripture text treatment

**Decision 3: Scripture italic Lora is already mostly clean — fix only BookmarkCard placeholder.**

Recon confirmed:

- MemorizationFlipCard back face: `font-serif` (NOT italic) ✅
- NoteEditorSubView: Lora as font option for note text ✅
- VerseOfTheDay: rendered as `<cite>` with `not-italic` ✅

The one drift: BookmarkCard placeholder (`text-sm italic text-white/50` for "no label") gets de-italicized to `text-sm text-white/40` (Spec 8B). Not scripture, not callout — just a placeholder hint, shouldn't be italic.

### Memorization completion treatment

**Decision 4: Memorization stays quiet. No themeColor system, no celebration on add, no flip sound.**

Anti-pressure design wins. MemorizationDeck does NOT parallel Grow's challenge celebration patterns. The flip animation and sortable last-reviewed line are sufficient acknowledgment of activity. Anything more would create pressure.

### Bible plan completion overlay

**Decision 5: PlanCompletionCelebration stays diverged from Grow's PlanCompletionOverlay.**

138 LOC vs 261 LOC. Bible plan completion is intentionally quieter — no Caveat (which is canonical now), no confetti, no sound effect. Reflects the contemplative nature of finishing a Bible reading plan vs the achievement-oriented nature of finishing a Grow challenge.

Don't align them. Different feature, different emotional register.

### Reactive store correctness fixes (real bugs, not visual drift)

**Decision 6: Bug fixes ride along in Spec 8B.**

Five correctness fixes are load-bearing for the visual work and ship in 8B:

1. **BB-43 chapter-visit gap.** Add `recordChapterVisit(bookSlug, chapterNumber)` to BibleReader's chapter-mount effect alongside the existing `wr_bible_progress` write. One-line addition.
2. **`useBibleProgress` non-reactive.** Convert to a real reactive store with `subscribe()`. ~30 LOC. Symmetry with other Bible stores.
3. **`useActivityFeed` missing `journalStore` subscription.** Add `subscribe(journalStore)` alongside existing highlight/bookmark/note/streak subscriptions. One-line addition.
4. **`HighlightCard` brittle subscription.** Refactor to derive `inDeck` from `useMemorizationStore()` return value instead of side-effect-only call. ~10 LOC.
5. **`HighlightCardMemorize.test.tsx` BB-45 test anti-pattern.** Rewrite to use real-store + mutate-from-outside pattern per `06-testing.md`. ~50 LOC.

Total bug-fix scope ~100 LOC. Acceptable scope addition for Spec 8B given each fix is small AND the visual polish work would otherwise ship known-broken UI (heatmap that doesn't update, progress map that goes stale, missing journal entries).

### TodaysPlanCard URL bug

**Decision 7: Fix in Spec 8C.**

`landing/TodaysPlanCard.tsx:22` links to `/reading-plans/{plan.planId}` (Grow's URL). Change to `/bible/plans/{plan.planId}` (Bible's URL). One-line fix. Real navigation bug. In scope for 8C.

### Filter UI orphans

**Decision 8: Delete PlanFilterBar.tsx + PlanFilterPill.tsx.**

90 LOC combined. Built but never imported. Per Eric's call: "There are very many plans so filtering seems unnecessarily complex." Delete in Spec 8C.

If filtering becomes a need later, it can be re-introduced as part of a dedicated UX spec rather than an unmaintained dead-code path.

### Dead code deletion

**Decision 9: Delete BibleStub.tsx + its test file.**

36 LOC production + corresponding test. No production import per `App.tsx:85` comment. Pre-redesign placeholder. Spec 8C cleanup task.

### Heading semantics on BiblePlanDay

**Decision 10: Replace section paragraph labels with `<h2>`.**

`<p className="text-xs uppercase">Reflection</p>` style labels become `<h2 className="text-xs uppercase">Reflection</h2>` with appropriate visual styling. Improves screen reader navigation. Minor visual change (mostly semantic). In scope for 8C.

### `bg-primary` decorative tints

**Decision 11: Decorative `bg-primary/N` tints stay as-is across the cluster.**

The 15+ instances on Bible (search highlight, progress bar fills, day status indicators, ReaderBody selection background, ActivityFilterBar active state, MiniGrid filled cell, etc.) are functional/categorical signals, NOT CTAs. Same precedent as Grow's progress bar fills that Spec 6B preserved.

Migration to `bg-violet-500/X` would be purely aesthetic with no functional improvement and significant test churn. Defer to a future "purple consolidation" spec if you ever decide that's worth doing.

### Animation duration discipline

**Decision 12: Accept the `duration-200` drift on canonical class strings.**

The white-pill CTA canonical class string uses `duration-200`; BB-33 says `duration-base` (250ms). This is documentation drift in `09-design-system.md`, not code drift. Spec 8 doesn't change either. Address in a documentation-only update later.

### Reader chrome scope

**Decision 13: Reader chrome stays unchanged per documented Layout Exception.**

Spec 8A leaves BibleReader's chrome alone visually. The 3 validation-error pages with `bg-primary` ARE in scope for 8A migration. ReaderChrome.tsx, TypographySheet.tsx, VerseActionSheet.tsx, AmbientAudioPicker.tsx, all reader/\* sub-views: NOT migrated.

### Audio cluster scope

**Decision 14: Audio chrome out of scope.**

AmbientAudioPicker (277 LOC), AudioPlayButton, and the BB-26-29-44 audio system have their own design language. Not part of Spec 8A.

### `wr_bible_active_plans` bridge

**Decision 15: Bridge cleanup deferred to a separate spec.**

`useActivePlan` writes the localStorage bridge for `landing/TodaysPlanCard` consumption. Now that `useActivePlan` is fully wired, the bridge could be deleted. But this is non-visual cleanup and not load-bearing for any visual work. File for a later cleanup spec.

### `bg-primary` CTA migrations (the actual buttons)

**Decision 16: All `bg-primary` solid CTA buttons migrate.**

Spec 8B targets:

- BookmarkLabelEditor.tsx:151 (Save) — already deferred from Spec 6D
- BibleSettingsModal.tsx:292 (Merge) — already deferred from Spec 6D
- MyBiblePage.tsx:352 (Clear filters)
- EmptySearchResults.tsx:21 (Clear search)

Spec 8A targets:

- BibleReader.tsx:657, 691, 858 (3 validation-error pages)

All migrate to `<Button variant="subtle">` per established pattern. None are climactic moments warranting gradient.

### MemorizationFlipCard a11y

**Decision 17: Fix `role="button"` on div in Spec 8B (folded from 8D).**

Same a11y deviation as Grow's PastChallengeCard. Replace the div with a real `<button>` element where keyboard activation is intended. Small refactor.

### FrostedCard migration on rolls-own chrome

**Decision 18: Migrate rolls-own card chrome where values exactly match FrostedCard defaults.**

Recon found rolls-own chrome on:

- MyBiblePage stat cards (line 277: `border-white/[0.12] bg-white/[0.06] backdrop-blur-sm`)
- MemorizationFlipCard front + back face (lines 83, 104: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]`)

Values match FrostedCard tier-1 defaults exactly. Migration is mechanical. In scope for 8B.

### `ATMOSPHERIC_HERO_BG` consolidation

**Decision 19: Consolidate the inline hero gradient duplication.**

`PageHero.tsx` exports `ATMOSPHERIC_HERO_BG` as a named export. BiblePlanDetail and BiblePlanDay define inline copies of the gradient string. Once those pages migrate to BackgroundCanvas (Decision 1), the inline copies disappear naturally.

Verification only — no separate task. The migration in 8C handles this.

## Out of scope across the cluster

- BibleReader long-chapter virtualization (defer until Lighthouse flags performance)
- AI panel chrome (BB-30/31 anti-pressure prompt-test recons govern those)
- Audio cluster chrome (BB-26-29-44 has its own design system)
- BB-42 search engine internals
- BB-32 cache internals
- BB-41 push subscription server (Phase 3 backend)
- Forums Wave backend integration (does not touch Bible per master plan)
- Reactive store hook standardization (canonical `useReactiveStorage` doesn't exist yet — separate refactor spec)
- All `bg-primary` decorative tints (Decision 11)
- Audio coordination integrity audit (verification only, no chrome change)

## Sub-spec ordering and execution model

| Spec | Surface | Model (execute)     | Dependency                                |
| ---- | ------- | ------------------- | ----------------------------------------- |
| 8B   | MyBible | **Opus 4.7 xHigh**  | Establishes Bible-cluster conventions     |
| 8C   | Plans   | **Sonnet 4.6 High** | Consumes 8B's atmospheric pattern         |
| 8A   | Reader  | **Sonnet 4.6 High** | Small surgical work, established patterns |

Recon, spec writing, code review stay on Opus xHigh per validated strategy. Verify-with-playwright stays on Sonnet High.
