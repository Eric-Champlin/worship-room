# Implementation Plan: Spec 8B — Bible Cluster MyBible

**Spec:** `_specs/spec-8b-bible-mybible.md`
**Date:** 2026-05-05
**Branch:** `forums-wave-continued` (DO NOT create new branches; user manages all git ops)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; pre-dates Bible cluster recon, but FrostedCard / GRADIENT_TEXT_STYLE / white pill / Tier system values are still authoritative)
**Recon Report:** `_plans/recon/bible-2026-05-05.md` (loaded)
**Direction Document:** `_plans/direction/bible-cluster-2026-05-05.md` (loaded — 19 locked decisions)
**Master Spec Plan:** N/A — Bible cluster is a 3-spec sequence (8B → 8C → 8A) governed by the direction doc; no separate master plan file

---

## Affected Frontend Routes

- `/bible/my` — primary surface. HorizonGlow → BackgroundCanvas; auth gate removed; device-local-storage banner; quick stats cards → FrostedCard; Clear filters button → subtle Button; hero spacing reconciled.
- `/bible/:book/:chapter` — chapter-mount effect ONLY. Adds `recordChapterVisit()` and refactors `localStorage.setItem('wr_bible_progress', ...)` to `markChapterRead()`. No reader chrome changes.
- All routes that render `<BookmarkLabelEditor>` (mounted from BibleReader's `VerseActionSheet`) — Save button → subtle Button.
- All routes that render `<BibleSettingsModal>` (mounted from MyBiblePage settings entry) — Merge button → subtle Button.
- All routes that render `<EmptySearchResults>` (consumed only by MyBiblePage's `MyBibleSearchMode` panel; verified by Step 1 grep) — Clear search button → subtle Button.

The single non-route effect: `useBibleProgress` becomes reactive — BibleProgressMap on `/bible/my` updates during a session as chapters are read in BibleReader.

---

## Architecture Context

### Files & line numbers (verified during recon)

| File | LOC | Notes |
|------|-----|-------|
| `frontend/src/pages/MyBiblePage.tsx` | 464 | Hosts `MyBiblePageInner` (auth-gate shell, lines 64–104) + `MyBibleAuthenticatedInner` (lines 106–425). HorizonGlow imported at line 9; used at lines 71 + 213. Inline drift comment at line 218. Stat-card chrome at lines 277 + 286 + 296. Clear-filters CTA at line 352. Hero spacing `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44` at line 219. |
| `frontend/src/pages/BibleReader.tsx` | 974 | Chapter-mount effect at lines 581–614 (NOT 594–600 as recon said — the wider effect spans 581–614). Direct `localStorage.setItem('wr_bible_progress', ...)` at lines 594–600. Already calls `recordReadToday()` at line 603 (preserve). |
| `frontend/src/hooks/useBibleProgress.ts` | 104 | **NOTE: at `hooks/`, not `hooks/bible/` as spec implied.** Uses `useState(readProgress)` snapshot at line 39. Has gating on `isAuthenticated` for writes — see Edge Case Decision below. Returns 7-property contract (`progress`, `markChapterRead`, `getBookProgress`, `isChapterRead`, `justCompletedBook`, `clearJustCompletedBook`, `getCompletedBookCount`). All 7 must be preserved. |
| `frontend/src/hooks/__tests__/useBibleProgress.test.tsx` | (exists) | Tests live at `hooks/__tests__/`, NOT `hooks/bible/__tests__/`. Update there. |
| `frontend/src/lib/bible/streakStore.ts` | 181 | Canonical Pattern A reactive store template. Module-level `cache`, `listeners` Set, `notifyListeners()`, `subscribe()`, `getStreak()`. **Does NOT implement `storage`-event cross-tab sync** — Change 5c is net-new, not a mirror. |
| `frontend/src/hooks/bible/useStreakStore.ts` | (exists) | Pattern A hook — `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`. Template for new `useBibleProgress` hook. |
| `frontend/src/hooks/bible/useMemorizationStore.ts` | 11 | Canonical Pattern A hook (3-line wrapper around `useSyncExternalStore`). |
| `frontend/src/components/memorize/MemorizationFlipCard.tsx` | 175 | Front face chrome at line 83; back face chrome at line 104. `role="button"` on `<div>` at line 66. `tabIndex={0}` at line 67. Keyboard handler at line 33–38. 3D flip via `transformStyle: 'preserve-3d'` + `perspective: 1000px` on outer wrapper. |
| `frontend/src/components/bible/reader/BookmarkLabelEditor.tsx` | 159 | Save button at line 148–154. Class string: `"rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"`. |
| `frontend/src/components/bible/my-bible/BibleSettingsModal.tsx` | 317 | **NOTE: at `my-bible/`, not `bible/` as spec implied.** Merge button at line 289–294. Class string: `"min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all motion-reduce:transition-none hover:bg-primary/80"`. |
| `frontend/src/components/bible/my-bible/EmptySearchResults.tsx` | 28 | **NOTE: at `my-bible/`, not `bible/` as spec implied.** Clear search button at line 18–24. Class string: `"mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"`. |
| `frontend/src/components/bible/my-bible/BookmarkCard.tsx` | 27 | Label text at line 21: `<p className="text-sm italic text-white/50">`. **NOTE: the italic is on the actual label content, not on a "no label" placeholder as spec wording implies.** Migration target is the `data.label && ...` branch — swap `italic text-white/50` for `text-white/40`. |
| `frontend/src/components/bible/my-bible/HighlightCard.tsx` | 108 | Side-effect subscribe at line 30: `useMemorizationStore() // returns unused result`. Synchronous `isCardForVerse(...)` read at line 43. |
| `frontend/src/components/bible/my-bible/__tests__/HighlightCardMemorize.test.tsx` | 107 | Mocks both `useMemorizationStore` (line 5–7) AND `@/lib/memorize` wholesale (line 9–14). 7 behavioral tests. |
| `frontend/src/hooks/bible/useActivityFeed.ts` | 122 | Subscription block at lines 64–75. Already imports/iterates highlight/bookmark/note/streak; missing `journalStore`. `loadAllActivity()` already loads journal entries (verified at `lib/bible/activityLoader.ts:84`). |
| `frontend/src/lib/heatmap/index.ts` + `chapterVisitStore.ts` | n/a | `recordChapterVisit(book: string, chapter: number)` exported from `@/lib/heatmap`. Idempotent same-day. |
| `frontend/src/lib/memorize/index.ts` + `store.ts` | 6 + 186 | Barrel re-exports `_resetForTesting`, `getAllCards`, `addCard`, `removeCard`, `recordReview`, `isCardForVerse`, `getCardForVerse`, `subscribe`. |
| `frontend/src/components/ui/BackgroundCanvas.tsx` | 26 | Imported via `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'`. JSX shape: `<BackgroundCanvas className="flex flex-col font-sans">` (matches BibleLanding line 81). |
| `frontend/src/components/homepage/FrostedCard.tsx` | 112 | Variants: `'accent' \| 'default' \| 'subdued'`. Default's base classes are `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base`. **NOTE the actual default uses `bg-white/[0.07]` and `rounded-3xl p-6`**, NOT the `bg-white/[0.06]` `rounded-2xl` values quoted in older recon docs. The migration target chrome (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-xl px-4 py-3` on stat cards; `rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4` on flip cards) does NOT exactly match the primitive's defaults — see the FrostedCard Migration Caveat below. Supports `as`, `eyebrow`, `eyebrowColor`, `variant` props. |
| `frontend/src/components/ui/Button.tsx` | (large) | `variant="subtle"` exists. Default-size class string: `'rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]'` + `'px-6 py-2.5 text-sm'` for `size="md"`. Sizes: `sm` `md` `lg`. |

### FrostedCard Migration Caveat (resolves spec ambiguity)

The spec asserts the rolls-own chrome on stat cards and MemorizationFlipCard "exactly matches FrostedCard tier-1 defaults." On inspection, the values match the **older** FrostedCard contract (pre-DailyHub 2 update). The current primitive uses `bg-white/[0.07]` and `rounded-3xl`. Differences:

| Surface | Current rolls-own | FrostedCard `default` |
|---------|-------------------|------------------------|
| MyBiblePage stat cards | `rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] px-4 py-3` | `rounded-3xl bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] p-6 shadow-frosted-base` |
| MemorizationFlipCard faces | `rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4` | same as above |

**Resolution per Direction Decision 18 ("migrate where values exactly match"):** Direction Decision 18 explicitly assumes exact match; the actual values diverge slightly. Still migrate per Decision 18 spirit — the deltas (`bg-white/[0.07]` vs `[0.06]`, `rounded-3xl` vs `rounded-xl`/`rounded-2xl`, `p-6` vs `px-4 py-3`/`p-4`, plus `shadow-frosted-base`) are visually within the tier-1 design intent. Override the divergent properties via `className`:

- **Stat cards (Change 10):** `<FrostedCard as="button" className="rounded-xl !p-3 ...">` — keep tighter `rounded-xl px-4 py-3` because stat cards are dense-grid items. Apply hover/focus chrome via existing `onClick` (auto-applies hover transform) plus `min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1` for layout. The `!p-3` is needed because FrostedCard hard-codes `p-6` in `VARIANT_CLASSES.default.base`. Use `!` (Tailwind important) only on `p-3` to override. Do NOT override `bg-white/[0.07]` back to `[0.06]` — keep the slightly lighter primitive value (visually indistinguishable, tier consistency wins).
- **Flip-card faces (Change 9a/9b):** `<FrostedCard className="absolute inset-0 rounded-2xl !p-4 flex flex-col">` — keep `rounded-2xl` (not `rounded-3xl`) because the flip-card height is `180px` and the larger radius would dominate the visual. Override `p-6` → `!p-4` for the same density reason. Preserve `style={{ backfaceVisibility, transform }}` via FrostedCard's `style` prop.

**`shadow-frosted-base` is forward-compatible.** The new shadow is subtle (already exists in `tailwind.config.js`), and adopting it is part of the tier-1 alignment intent. No regression risk.

### Reactive store discipline (canonical patterns)

- **Pattern A (standalone hook):** `useStreakStore`, `useMemorizationStore`, `usePrayerReactions`. New `useBibleProgress` joins this set.
- **Pattern B (inline `subscribe()` + `useState` + `useEffect`):** `highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`, `chapterVisitStore`, `plansStore`. `useActivityFeed` (Change 6) sticks with Pattern B for its 5 subscriptions.

### Auth gating context

- This spec **REMOVES** auth gating on `/bible/my`. No new auth modals.
- One new auth interaction: device-local-storage banner Sign In CTA → `/?auth=login` (consumed by `App.tsx:219` `<AuthQueryParamHandler />` mounted in Spec 7).
- `useBibleProgress.markChapterRead` historically gates writes on `isAuthenticated` (line 44: `if (!isAuthenticated) return`). This is a real bug given the Bible-wave auth posture (logged-out users SHOULD be able to write progress to localStorage). **Resolution: remove the auth gate from `markChapterRead`** as part of Change 5a — see Edge Case Decisions below.

### Test patterns to match

- AuthModalProvider, ToastProvider, AudioProvider not needed for MyBiblePage tests — current tests mock `useAuthModal`, `useAuth`, `useActivityFeed`. Keep that pattern.
- BibleReader tests are spread across multiple files (`BibleReader.test.tsx`, etc.). The chapter-mount effect tests live in the main `pages/__tests__/BibleReader.test.tsx`.
- For Change 8's BB-45 test pattern: import `_resetForTesting` from `@/lib/memorize`, call in `beforeEach`. Use `act()` from `@testing-library/react` to wrap mutation calls. Use `findByText` / `findByRole` for re-render assertions.

---

## Auth Gating Checklist

Spec 8B explicitly **removes** auth gating on `/bible/my`. The only new auth interaction is the banner's Sign In deep-link.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Land on `/bible/my` (logged-out) | Personal layer renders; no auth wall | Step 4 (Change 2a) | None — auth gate removed |
| Land on `/bible/my` (logged-in) | Personal layer renders; banner hidden | Step 4 (Change 2c) | `!isAuthenticated &&` conditional render |
| Dismiss banner | Persists `wr_mybible_device_storage_seen=true` | Step 4 (Change 2c) | None — localStorage write |
| Click banner Sign In | Navigate to `/?auth=login` | Step 4 (Change 2c) | Spec 7's `<AuthQueryParamHandler />` reads `?auth=login` |
| `markChapterRead` write (logged-out) | Now allowed (was previously gated) | Step 6 (Change 5a) | Auth gate REMOVED from hook |
| `recordChapterVisit` write (logged-out) | Allowed (was already public) | Step 5 (Change 4a) | None — public Bible-wave posture |
| Save bookmark label | Allowed for everyone | Step 3 (Change 3a) | None preserved as-is |
| Merge Bible profiles | Allowed for everyone | Step 3 (Change 3b) | None preserved as-is |
| Clear filters / Clear search | Allowed for everyone | Step 3 (Changes 3c/3d) | None preserved as-is |

**Verification:** All 60+ existing AuthModal trigger sites elsewhere in the app stay wired exactly as Spec 7 left them. Spec 8B does NOT touch `AuthModalProvider`, `AuthQueryParamHandler`, `AuthModal`, or any other auth surface.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| BackgroundCanvas wrapper | className | `"flex flex-col font-sans"` | BibleLanding.tsx pattern (read during recon) |
| BackgroundCanvas import | path | `@/components/ui/BackgroundCanvas` | Verified during recon |
| Hero spacing (target) | className | `pt-28 pb-12` (mobile) — match BibleLanding's `<BibleHero>` rhythm | Direction doc Decision 1 |
| Hero spacing (current — to remove) | className | `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44` | MyBiblePage line 219 |
| GRADIENT_TEXT_STYLE | import | `import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'` | Already imported on MyBiblePage |
| Stat-card hover/focus | className | `transition-[colors,transform] duration-fast hover:border-white/[0.18] hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]` | Preserve from current line 277 |
| FrostedCard variant="default" base | classes | `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` | FrostedCard.tsx VARIANT_CLASSES |
| FrostedCard variant="subdued" base | classes | `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` | FrostedCard.tsx VARIANT_CLASSES |
| Subtle Button | usage | `<Button variant="subtle" size="sm">Cancel</Button>` (size="sm" for inline CTAs like Save/Merge/Clear; size="md" for the banner Sign In) | UnsavedChangesModal.tsx + Button.tsx |
| Subtle Button (`size="sm"`) classes | resolved | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px] px-4 py-2 text-sm` | Button.tsx merged class |
| Banner CTA | structure | `<Link to="/?auth=login"><Button variant="subtle" size="sm" asChild>Sign In</Button></Link>` OR a `<Button>` with `useNavigate()` onClick — use `<Link>` per existing `react-router-dom` import in MyBiblePage | React Router pattern |
| Banner placement | location | After hero divider (line 232 area), BEFORE the heatmap section | Spec 2c option (A) — least intrusive, surfaces immediately for logged-out visitors |
| Banner dismiss button | aria-label | `"Dismiss device-local-storage notice"` | Accessibility requirement (Spec 8B § Non-Functional Requirements) |
| Banner copy headline | text | None (single-paragraph banner — no h-level needed) | Anti-pressure voice rule |
| Banner copy body | text | `"Your data lives on this device. Sign in to keep it safe across devices."` | Spec § Change 2c suggested copy |
| `wr_mybible_device_storage_seen` | type | `"true" \| null` (canonical wr_* one-time flag pattern) | 11-local-storage-keys.md naming convention |
| BookmarkCard label | className | `text-sm text-white/40` (was: `text-sm italic text-white/50`) | Direction Decision 3 |
| FlipCard outer wrapper | structure | `<div className="h-[180px]" style={{ perspective: '1000px' }}>` (preserve) wrapping a `<button>` (Change 9c) wrapping two `<FrostedCard>` faces (Changes 9a/9b) | Decision 17 + 18 |
| MarkChapterRead module export path | path | `import { markChapterRead } from '@/hooks/useBibleProgress'` (Change 5a relocates the function as named export from the hook module) | New convention for this spec |
| recordChapterVisit import | path | `import { recordChapterVisit } from '@/lib/heatmap'` | `lib/heatmap/index.ts:1` |

---

## Design System Reminder

**Project-specific quirks displayed before each UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` for hero h1s on dark backgrounds (already in MyBiblePage at line 80 + 223). DO NOT swap to plain white.
- BackgroundCanvas wrapping pattern is `<BackgroundCanvas className="flex flex-col font-sans">` (matches BibleLanding). DO NOT use `<HorizonGlow />` — that's Daily Hub-only.
- `<FrostedCard>` is in `@/components/homepage/FrostedCard`. Default variant is the canonical tier-1 chrome. The current primitive uses `bg-white/[0.07] rounded-3xl p-6`, slightly different from the older `bg-white/[0.06] rounded-2xl p-6` documented in some recon snapshots — when in doubt, the primitive's `VARIANT_CLASSES` is the source of truth. Override `p-6` and `rounded-3xl` via `className` only when density requires it (stat cards, flip cards) — preserve `bg-white/[0.07]` and `border-white/[0.12]` and `shadow-frosted-base`.
- `<Button variant="subtle">` is the canonical chrome for non-climactic CTAs (Cancel, Save, Merge, Clear, banner Sign In). `size="sm"` for inline use; `size="md"` is also fine. Do NOT use `bg-primary` solid pills for any of these.
- Sticky FAB pattern is NOT relevant to this spec (Spec 8B touches no sticky elements).
- Anti-pressure copy on the banner: no "your data is at risk", no "soon", no "before too late", no "don't lose your work" — just "Your data lives on this device. Sign in to keep it safe across devices."
- BB-45 test anti-pattern is forbidden: do NOT mock `@/lib/memorize` or `@/hooks/bible/useMemorizationStore` wholesale in HighlightCardMemorize.test.tsx (Change 8). Use the real store and mutate via `addCard`/`removeCard` from outside the component, then assert via `findByText`/`findByRole`.
- Reactive store conversion of `useBibleProgress` (Change 5) MUST preserve the existing 7-property hook contract exactly: `{ progress, markChapterRead, getBookProgress, isChapterRead, justCompletedBook, clearJustCompletedBook, getCompletedBookCount }`. Adding `subscribeProgress`/`getProgressSnapshot` as separate named exports is fine; CHANGING the hook's return shape is not.
- The `markChapterRead` auth gate (`if (!isAuthenticated) return` at line 44 of the current hook) is being REMOVED as part of Change 5a. The Bible-wave posture allows logged-out users to write progress to localStorage. The `getCompletedBookCount`/`getBookProgress`/`isChapterRead` auth gates also get removed (they were defensive; the data is already in localStorage and the rest of the app reads it).
- Animation tokens — preserve `duration-fast`, `duration-base`, `ease-decelerate` where currently used. No new hardcoded `200ms` strings.
- Recent-plan deviations to avoid (from Spec 7 + Spec 6 cluster Execution Logs): hardcoded `150ms` strings (use `ANIMATION_DURATIONS` tokens — N/A here since no new animations); `text-primary` on white-pill CTAs (use `text-hero-bg` — N/A here since we delete the white pill); leftover deprecated test imports.

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step.

---

## Shared Data Models (from Master Plan / Direction Doc)

No master spec plan exists. Direction doc decisions are referenced inline. No new TypeScript interfaces are introduced — all reactive-store conversions preserve existing types (`BibleProgressMap`, `MemorizationCard`, `ActivityItem`, etc.).

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_progress` | Both (via `markChapterRead` reactive store) | Existing key, existing shape (`Record<string, number[]>`). Only call site changes — direct `localStorage.setItem` in BibleReader becomes `markChapterRead(book.slug, chapter)`. |
| `wr_chapters_visited` | Write (via `recordChapterVisit` from BibleReader chapter-mount) | Existing key, existing shape. New caller added; no key/shape change. |
| `wr_mybible_device_storage_seen` | Both | **NEW key.** Type `"true" \| null`. Banner dismissal flag. Document in `11-local-storage-keys.md` § "Dashboard & UI State" or new "MyBible" section. |
| `wr_memorization_cards` | Read (via real store, no mocks) | Existing — only Change 8 test rewrite changes the test mocking pattern, not the store itself. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | MyBiblePage hero stacks; quick stats cards horizontal-scroll snap (preserved); banner spans full width with `px-4`; copy may wrap to 2 lines and Sign In CTA stacks below; MemorizationFlipCard 1 per row (preserved); 44×44 minimum tap targets enforced via `<button>` (Change 9c) and `<Button>` primitive. |
| Tablet | 768px | Hero balanced layout; stat cards 2-col grid (preserved via `sm:justify-center sm:overflow-visible` at line 269); banner inline copy + right-side Sign In CTA; flip cards 2 per row (preserved). |
| Desktop | 1440px | Full hero; stat cards 4-col row; banner centered with FrostedCard subdued max-width; flip cards 3 per row (preserved). |

**Custom breakpoints (none introduced).** All migrations preserve existing responsive behavior — `<BackgroundCanvas>`, `<FrostedCard>`, `<Button variant="subtle">` are responsive primitives.

---

## Inline Element Position Expectations

The banner's collapsed-state pill (when shown) has copy + Sign In CTA + dismiss X all inline.

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| Banner row at desktop | Copy paragraph (left), Sign In Button (right of copy), Dismiss X (top-right corner of FrostedCard) | At 1440px and 768px: copy and Sign In Button share the row's vertical span (no wrap). Dismiss X is positioned absolutely top-right of the FrostedCard. | Copy + Sign In may stack at 375px (acceptable). |
| Stat cards row | 4 stat cards (Highlights, Notes, Bookmarks, Books, Streak — variable count) | At 768px+: cards share top-y (±5px since each FrostedCard has identical height by construction). At 375px: horizontal scroll preserved (no wrap, off-screen overflow). | None at any breakpoint (existing behavior preserved). |
| MemorizationFlipCard internal layout | RotateCcw icon (top-right corner of front face) + reference text (centered) + footer (bottom) | These are absolutely positioned within the front/back faces; no inline-row alignment to verify. | N/A |

---

## Vertical Rhythm

Expected spacing between MyBiblePage sections (preserved from current):

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero section → Section divider (`border-t`) | `pt-28 pb-12` on hero (target post-Change 1c); divider has no own padding | BibleLanding-style rhythm |
| Section divider → Heatmap | `py-8` (32px top + 32px bottom on the wrapper at line 236) | Existing `<div className="py-8">` preserved |
| Heatmap → Progress map | `border-t` divider (line 244) + `py-8` (line 246) | Existing |
| Progress map → Memorization deck | `border-t` (line 254) + `py-8` (line 259) | Existing |
| Memorization deck → Banner (NEW — if banner is below memorization) OR Banner → Heatmap (if banner is between hero divider and heatmap) | Per Change 2c placement choice. **Plan locks placement A: between hero divider (line 232) and the heatmap section (line 235)** — see Edge Case Decisions. Gap: `mt-6` between divider and banner; `mb-8` between banner and heatmap section. | Plan decision |
| Quick-stats row → ActivityFilterBar | `py-6` snap row (existing line 269) | Existing |
| Activity feed → Footer trust signal | `py-8` (line 374) | Existing |
| Footer trust signal → SiteFooter | (no extra spacing — `py-8` already includes it) | Existing |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 8B exists and is readable
- [x] Direction doc loaded and decisions 1–19 understood
- [x] Recon doc loaded; line numbers verified to be approximate (the actual MyBiblePage layout currently has BibleProgressMap *below* heatmap and Memorization deck *between* progress map and quick stats — direction doc and recon match)
- [x] Specs 6A/6B/6C/6D and Spec 7 are merged into `forums-wave-continued` (verified via plan file presence and recon doc baseline)
- [x] All 11 changes (1, 1a–c, 2, 2a–d, 3a–d, 4, 4a, 5, 5a–d, 6, 6a–b, 7, 8, 9, 9a–d, 10, 11) are accounted for in the implementation steps below
- [x] All auth-gated actions accounted for in the Auth Gating Checklist
- [x] Design system values verified from primitive source files (FrostedCard.tsx, Button.tsx, BackgroundCanvas.tsx)
- [x] No `[UNVERIFIED]` values flagged (see Edge Case Decisions for resolved ambiguities)
- [x] No deprecated patterns used (no Caveat, no GlowBackground on Daily Hub, no animate-glow-pulse, no cyan textarea border, no italic Lora prose, no soft-shadow 8px-radius cards)
- [x] CC stays on `forums-wave-continued`; user manages all git operations

**Pre-execution gate:** Before Step 1, CC must verify `pnpm install`, `pnpm typecheck`, and `pnpm test` baseline pass on the current branch. Baseline per CLAUDE.md: 9,470 pass / 1 pre-existing fail (or 9,469/2 if the timing-flaky test fires). Any new pre-existing failures must be diagnosed before continuing.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `useBibleProgress.markChapterRead` auth gate (line 44) | **REMOVE the `if (!isAuthenticated) return`** | The Bible-wave posture (per `02-security.md` § "Bible Wave Auth Posture") is "logged-out users can build personal history in localStorage." The current gate is inconsistent with that and contradicts the spec's intent (Change 4 + 5b assume the call lands for everyone). |
| `useBibleProgress.{getBookProgress, isChapterRead, getCompletedBookCount}` auth gates | **REMOVE** | Same reason — defensive guards that contradict Bible-wave posture. After Change 2 removes the page-level auth gate, these guards would silently return empty data for logged-out users on `/bible/my`, defeating the entire point of the spec. |
| BibleReader-side change for `wr_bible_last_read` (line 584–592) | **PRESERVE — do not touch** | Decision 13 bounds Change 4 to chapter-mount effect minimum. The `wr_bible_last_read` write is a sibling but not in scope. Keep it as direct `localStorage.setItem`. |
| `recordReadToday()` call at line 603 | **PRESERVE** | Already correct; the streak store handles its own subscription. Don't touch. |
| Banner placement (Spec § 2c options A vs B) | **Option A — between hero divider and heatmap (above the personal-layer content)** | Surfaces the device-local context BEFORE users see their data, which is the moment the message is most relevant. Option B (after heatmap, before footer) would show the message after users have already scrolled through their data — too late to set context. Anti-pressure note: surfacing it above content does NOT make it pressure-y because the copy is informational, not transactional. |
| Banner pattern (Spec § 2c — banner vs. hero-subtitle alternative) | **Banner with FrostedCard subdued** | Spec offers either; banner is more discoverable than a subtitle line, dismissable (which subtitle isn't), and matches the "small soft note somewhere" user-story language. The hero subtitle (line 227 `text-base text-white/60`) stays focused on counts (`subhead` from useMemo at line 177) — clean separation of concerns. |
| `wr_mybible_device_storage_seen` storage location | **localStorage, root key, type `"true" \| null`** | Matches `wr_install_dismissed`, `wr_welcome_back_shown`, `wr_evening_reflection` precedents. Read on mount via `localStorage.getItem('wr_mybible_device_storage_seen') === 'true'`. |
| `useBibleProgress` hook location after Change 5 | **STAY at `frontend/src/hooks/useBibleProgress.ts`** | Spec hints at `hooks/bible/useBibleProgress.ts`, but moving the file is an unnecessary blast-radius expansion (4+ consumers would need import-path updates). Keep it where it is; just convert internals to reactive store. The store-side state can live in the same file (single module exports `subscribeProgress`, `getProgressSnapshot`, `markChapterRead`, and the `useBibleProgress` hook). |
| Cross-tab sync (Change 5c) | **ADD net-new** (streakStore doesn't have it) | Spec § 5c explicitly authorizes the addition. Worth doing because two-tab usage IS realistic (Bible reader in one tab, MyBiblePage in another). Implementation matches the Change 5c reference shape: top-level `if (typeof window !== 'undefined')` block with `storage` event listener that sets `cachedProgress = null` and calls `notifyListeners()`. |
| FrostedCard migration on stat cards (Change 10) — `as="button"` for clickable cards, `as="div"` for the static "Books" card | **Mixed: 4 of 5 are `<button>`, 1 (`Books` count, line 286–291) is `<div>` per existing structure** | Preserve existing semantics. The clickable Highlights/Notes/Bookmarks/Streak cards already use `<button>`; the Books count is a static stat. FrostedCard `as` prop supports both. |
| Test rewrite for HighlightCard (Change 7) | **Add at most 1 new assertion: re-render after store mutation** | Existing assertions (Layers icon, "In deck" label, click-add, click-remove, propagation, hidden-when-no-info, hidden-when-no-text) ALL pass under the new pattern. Add a new test: "updates 'In deck' badge when card is added externally via `addCard`" — the spec's robustness goal. |
| BookmarkCard line 21 (Change 11) | **Migrate the `data.label && ...` paragraph from `text-sm italic text-white/50` to `text-sm text-white/40`** | Spec describes it as a "no label placeholder", but the actual code applies italic to the rendered label. The migration target is the same line; the spec's de-italicize intent applies. |
| `pt-28 pb-12` (Change 1c) — should sm: and lg: scaling be added to match BibleLanding's `BibleHero` exactly? | **Use plain `pt-28 pb-12` (no breakpoint scaling)** | BibleLanding's `BibleHero.tsx` uses `pt-28 pb-12` flat across breakpoints. MyBiblePage matches by adopting the same flat pattern. The current `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44` (responsive escalation) is the Daily Hub pattern — drop the responsive scaling along with the comment. |
| `EmptySearchResults` consumer audit (recon Step 10) | **Used only by MyBiblePage** | Verified by grep: no other production consumer. Migration scope = MyBiblePage's `MyBibleSearchMode` panel only. |
| HighlightCardMemorize test mocks `useMemorizationStore` AND `@/lib/memorize` | **Remove BOTH mocks** | Both must go for the real-store pattern to work. Real `useMemorizationStore()` calls real `useSyncExternalStore(subscribe, getAllCards, ...)` from real `@/lib/memorize`. Mutations via real `addCard`/`removeCard` propagate via real `subscribe()` to the real `useSyncExternalStore`. Pattern matches what production runs. |
| Activity feed regression — does removing the auth gate cause empty-state flicker? | **No** | The personal layer reads from localStorage already. Logged-out users who have never used the Bible reader see the existing "Your Bible highlights will show up here" empty state (line 327–334) — same as logged-in users with no activity. No new empty-state needed. |
| `loadAllActivity()` already includes journal entries (recon Step 11) | **Confirmed** | Verified at `lib/bible/activityLoader.ts:84` (`for (const entry of getAllJournalEntries())`). Change 6 is the missing one-line subscription only — no loader change. |

---

## Implementation Steps

### Step 1: Pre-execution recon verification + baseline capture

**Objective:** Verify all assumptions in this plan are still valid against the current codebase before any code changes.

**Files to create/modify:** None (read-only verification).

**Details:**

1. Run `cd frontend && pnpm install` (idempotent).
2. Run `cd frontend && pnpm typecheck` (or `pnpm tsc --noEmit`) — expect clean.
3. Run `cd frontend && pnpm test 2>&1 | tail -40` — capture baseline counts. Expected: 9,470 pass / 1 pre-existing fail (or 9,469/2 with timing flake) per CLAUDE.md.
4. Verify import paths via grep (one command each):
   - `grep -n "from '@/components/ui/BackgroundCanvas'" frontend/src/pages/BibleLanding.tsx` → expect single match.
   - `grep -n "from '@/lib/heatmap'" frontend/src/pages/BibleReader.tsx` → may or may not exist (will be added in Change 4a if absent).
   - `grep -rn "import.*EmptySearchResults" frontend/src` → expect 1–2 matches (MyBiblePage + the component itself); if any production consumer outside MyBiblePage, document and expand Change 3d's scope.
5. Verify line numbers (each may have drifted ±N lines):
   - `grep -n "Daily Hub pt-36 pattern" frontend/src/pages/MyBiblePage.tsx` → comment exists, capture exact line.
   - `grep -n "rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white" frontend/src/components/bible/reader/BookmarkLabelEditor.tsx` → Save button class.
   - `grep -n "min-h-\[44px\] rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white" frontend/src/components/bible/my-bible/BibleSettingsModal.tsx` → Merge button class.
   - `grep -n "rounded-full bg-primary px-4 py-2 text-sm font-medium text-white" frontend/src/components/bible/my-bible/EmptySearchResults.tsx` → Clear search button class.
   - `grep -n "rounded-full bg-primary" frontend/src/pages/MyBiblePage.tsx` → Clear filters button (line ~352 area).
   - `grep -n "italic text-white/50" frontend/src/components/bible/my-bible/BookmarkCard.tsx` → label class.
   - `grep -n "useMemorizationStore()" frontend/src/components/bible/my-bible/HighlightCard.tsx` → side-effect-only call.
6. Verify Change 6 prerequisite: `grep -n "getAllJournalEntries\|journal" frontend/src/lib/bible/activityLoader.ts` → expect to find both the import and the iteration loop. **Confirmed during recon — proceed.**
7. Verify `recordChapterVisit` signature: `grep -n "export function recordChapterVisit" frontend/src/lib/heatmap/chapterVisitStore.ts` → expect `(book: string, chapter: number)`. **Confirmed during recon — proceed.**
8. Verify `_resetForTesting` is exported from `@/lib/memorize`: `grep -n "_resetForTesting" frontend/src/lib/memorize/index.ts` → confirmed at line 9.

**Auth gating (if applicable):** N/A — verification only.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT modify any file in this step.
- Do NOT install new dependencies.
- Do NOT run `pnpm test` with an `--update` flag.
- If any assumption fails (line number off by more than ±20, missing import, unexpected consumer), STOP and report findings BEFORE proceeding.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Baseline pass count | regression | Capture exact pass/fail counts before any code change |

**Expected state after completion:**
- [ ] Baseline test counts captured (in plan execution log)
- [ ] All grep verifications produce expected matches
- [ ] No code modified

---

### Step 2: BookmarkCard placeholder de-italicize (Change 11)

**Objective:** Smallest blast-radius change — single-class swap. Land first to verify tooling works and execution loop is healthy.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/BookmarkCard.tsx` — line 21 only.

**Details:**

Replace exactly:

```diff
- <p className="text-sm italic text-white/50">
+ <p className="text-sm text-white/40">
```

No other changes. The `<HighlightedText>` child stays unchanged.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Label renders without italic; opacity slightly reduced. No layout shift.
- Tablet (768px): Same.
- Mobile (375px): Same.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT change the conditional `{data.label && (...)}` wrapper.
- Do NOT remove the `<HighlightedText>` child.
- Do NOT touch the `verseText` paragraph (line 14).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing BookmarkCard tests | regression | If any test asserts `italic text-white/50`, update to `text-white/40`. |

**Expected state after completion:**
- [ ] Line 21's italic class removed; opacity changed to `text-white/40`
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` matches baseline
- [ ] Visual eyeball at `/bible/my` (logged-in, with at least one bookmark with a label): label is no longer italic, slightly more muted

---

### Step 3: bg-primary CTA migrations (Changes 3a / 3b / 3c / 3d)

**Objective:** Migrate four `bg-primary` solid CTAs to `<Button variant="subtle">` per Decision 16. Targeted, mechanical class-string swaps.

**Files to create/modify:**
- `frontend/src/components/bible/reader/BookmarkLabelEditor.tsx` — line 148–154 (Change 3a).
- `frontend/src/components/bible/reader/__tests__/BookmarkLabelEditor.test.tsx` — class-string assertions if any.
- `frontend/src/components/bible/my-bible/BibleSettingsModal.tsx` — line 289–294 (Change 3b).
- `frontend/src/components/bible/my-bible/__tests__/BibleSettingsModal.test.tsx` — class-string assertions if any.
- `frontend/src/pages/MyBiblePage.tsx` — line 348–355 area (Change 3c, the Clear filters button inside `FeatureEmptyState`).
- `frontend/src/components/bible/my-bible/EmptySearchResults.tsx` — line 18–24 (Change 3d).
- `frontend/src/components/bible/my-bible/__tests__/EmptySearchResults.test.tsx` — class-string assertions if any.

**Details:**

For each of the four buttons, follow the same migration pattern:

1. Replace the raw `<button type="button" onClick={...} className="...bg-primary...">Label</button>` with `<Button variant="subtle" size="sm" onClick={...}>Label</Button>`.
2. Add `import { Button } from '@/components/ui/Button'` at the top of each file if not already imported.
3. Preserve the onClick handler, all surrounding JSX (Cancel button beside Save, FeatureEmptyState wrapper for Clear filters/Clear search, etc.), and any disabled-state logic (BookmarkLabelEditor's Save uses `disabled={...}`, BibleSettingsModal's Merge has confirmation flow that runs on click — none of that changes).
4. ARIA wiring: `<Button>` natively supports `aria-label`, `aria-describedby`, etc. The BibleSettingsModal Merge button currently uses `aria-describedby="replace-warning"` on the *adjacent* "Replace local data" button (not on Merge itself), so no aria changes needed for Merge. None of the other three buttons currently have explicit aria attributes — preserve as-is (visible label is sufficient).

**Concrete diffs:**

3a — BookmarkLabelEditor.tsx (line 148–154):

```diff
- <button
-   type="button"
-   onClick={handleSave}
-   className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
- >
-   Save
- </button>
+ <Button variant="subtle" size="sm" onClick={handleSave}>
+   Save
+ </Button>
```

3b — BibleSettingsModal.tsx (line 289–294):

```diff
- <button
-   type="button"
-   onClick={() => handleMerge(importState.export.data)}
-   className="min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all motion-reduce:transition-none hover:bg-primary/80"
- >
-   Merge with local data
- </button>
+ <Button variant="subtle" size="sm" onClick={() => handleMerge(importState.export.data)}>
+   Merge with local data
+ </Button>
```

3c — MyBiblePage.tsx (line 348–355, inside `<FeatureEmptyState>`):

```diff
- <button
-   type="button"
-   onClick={clearFilters}
-   className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]"
- >
-   Clear filters
- </button>
+ <Button variant="subtle" size="sm" onClick={clearFilters} className="mt-3">
+   Clear filters
+ </Button>
```

3d — EmptySearchResults.tsx (line 18–24):

```diff
- <button
-   type="button"
-   onClick={onClear}
-   className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
- >
-   Clear search
- </button>
+ <Button variant="subtle" size="sm" onClick={onClear} className="mt-3">
+   Clear search
+ </Button>
```

For the corresponding test files (BookmarkLabelEditor.test.tsx ~160 LOC, BibleSettingsModal.test.tsx ~378 LOC, EmptySearchResults.test.tsx — exists, smaller):

- Open each file and search for `bg-primary` class assertions. If any, replace with checks against the subtle Button shell (e.g., `expect(button).toHaveClass('bg-white/[0.07]')` if needed). Generally, behavioral assertions (`getByRole('button', { name: /Save/i })`, `getByRole('button', { name: /Merge/i })`, `getByRole('button', { name: /Clear/i })`) DO NOT need to change.
- Run the test files individually after each migration to verify zero new failures.

**Auth gating:** None of these buttons has an auth gate today (BibleReader, MyBiblePage, BibleSettingsModal are all public surfaces) — preserve.

**Responsive behavior:**
- Desktop (1440px): Subtle pills render with `px-4 py-2 text-sm` and `min-h-[44px]`. Clear filters / Clear search keep `mt-3` spacing inside FeatureEmptyState.
- Tablet (768px): Same.
- Mobile (375px): Same. 44×44 tap targets met automatically.

**Inline position expectations:**
- BookmarkLabelEditor: Cancel + Save sit on a single row (existing `flex justify-end gap-2` at line 140). Both should share top-y at all breakpoints (`gap-2` between them).
- BibleSettingsModal: "Replace local data" + "Merge with local data" sit on a single row (existing flex container). Same expectation.

**Guardrails (DO NOT):**
- Do NOT change any onClick handler logic.
- Do NOT change disabled-state logic on BookmarkLabelEditor's Save.
- Do NOT remove the Cancel/sibling buttons next to Save/Merge.
- Do NOT modify `bg-primary/N` decorative tints elsewhere in these files (Decision 11).
- Do NOT migrate other buttons (e.g., the danger-styled "Replace local data" button at BibleSettingsModal:285).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BookmarkLabelEditor: Save button still calls `handleSave` | regression | `getByRole('button', { name: /Save/i })` + `userEvent.click()` |
| BookmarkLabelEditor: Save button class assertion (if existed) | unit | Update from `bg-primary` to subtle Button class signature OR drop class assertions in favor of role/name |
| BibleSettingsModal: Merge button still calls `handleMerge` | regression | Behavioral test |
| BibleSettingsModal: Replace + Merge buttons inline | layout | (Manual eyeball check; test optional) |
| MyBiblePage: Clear filters resets `filter` state | regression | Test exists; verify it still passes |
| EmptySearchResults: Clear search calls `onClear` | regression | Existing test |

**Expected state after completion:**
- [ ] All four `<button>` JSX blocks replaced with `<Button variant="subtle">` JSX
- [ ] All four files import `Button` from `@/components/ui/Button`
- [ ] All onClick handlers, disabled states, and ARIA attributes preserved
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` matches baseline (no new failures; updated assertions pass)
- [ ] Visual eyeball: each button has subtle pill chrome (white/[0.07] background, white/[0.12] border) instead of solid primary

---

### Step 4: MyBiblePage atmospheric layer + auth gate removal + device-local-storage banner (Changes 1, 2, 3c already in Step 3, 10)

**Objective:** Largest single-file change. Migrates HorizonGlow → BackgroundCanvas, removes auth-gate shell, adds the device-local-storage banner, migrates stat cards to FrostedCard, reconciles hero spacing, deletes the inline drift comment.

**Files to create/modify:**
- `frontend/src/pages/MyBiblePage.tsx` — Changes 1a, 1b, 1c, 2a, 2b, 2c, 10.
- `frontend/src/pages/__tests__/MyBiblePage.test.tsx` — Change 2d (logged-out test rewrites).
- `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx` — Change 2d if needed.
- `frontend/.claude/rules/11-local-storage-keys.md` (project rule file) — document `wr_mybible_device_storage_seen`. **Note: this is a CLAUDE rule file, not a test/source file** — see the doc-update detail below.

**Details:**

#### 4a — Replace HorizonGlow with BackgroundCanvas (Change 1a)

In `MyBiblePage.tsx`:

1. Delete the import on line 9: `import { HorizonGlow } from '@/components/daily/HorizonGlow'`.
2. Add the import: `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` (already imported in BibleLanding line 6 — match that exact path).
3. Replace lines 70–99 (the `MyBiblePageInner` logged-out shell) with the new consolidated rendering — see Step 4b below.
4. Replace lines 212–214 (the `MyBibleAuthenticatedInner` outer wrapper):

```diff
- return (
-   <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
-     <HorizonGlow />
-     <Navbar transparent />
+ return (
+   <BackgroundCanvas className="flex flex-col font-sans">
+     <Navbar transparent />
```

5. The closing `</div>` at line 423 (paired with the wrapper `<div>` at line 212) becomes `</BackgroundCanvas>`.

#### 4b — Consolidate auth-gate paths (Changes 2a + 2b)

The `MyBiblePageInner` function at lines 64–104 currently branches: logged-out → standalone shell with "Get Started — It's Free" CTA; logged-in → renders `<MyBibleAuthenticatedInner />`. Consolidate to a single rendering path.

Concrete refactor:

1. **Delete the `if (!isAuthenticated) { return (... /* lines 68–101 standalone shell */) }` branch entirely.**
2. **Move the entire `MyBibleAuthenticatedInner` body INTO `MyBiblePageInner`** (single component now, renamed simply `MyBiblePageInner`). The rendering for logged-out users matches logged-in users; the only difference is the device-local-storage banner is conditionally rendered when `!isAuthenticated`.
3. After consolidation, the JSX is:

```tsx
function MyBiblePageInner() {
  const { isAuthenticated } = useAuth()
  // ...all existing hooks from MyBibleAuthenticatedInner
  const navigate = useNavigate()
  const { isOpen: drawerOpen, close: closeDrawer } = useBibleDrawer()
  // ...rest of the existing logic from lines 107–209

  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...MY_BIBLE_METADATA} jsonLd={myBibleBreadcrumbs} />

      <main id="main-content" className="relative z-10 flex-1">
        {/* Hero — pt-28 pb-12 BibleLanding rhythm (Change 1c) */}
        <section className="relative z-10 w-full px-4 pt-28 pb-12">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
              My Bible
            </h1>
            <p className="mt-3 text-base text-white/60 sm:text-lg">{subhead}</p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl border-t border-white/[0.08]" />

        {/* Device-local-storage banner — logged-out only (Change 2c) */}
        {!isAuthenticated && <DeviceLocalStorageBanner />}

        {/* Heatmap, Progress Map, Memorization Deck, quick stats, filters, activity feed — all existing JSX preserved */}
        ...
      </main>

      <SiteFooter />
      {/* All existing modal/drawer JSX preserved */}
    </BackgroundCanvas>
  )
}
```

4. Delete the unused imports (`useAuthModal` is no longer needed since the auth modal isn't triggered from this page anymore) — verify with grep: `grep -n "useAuthModal\|authModal" frontend/src/pages/MyBiblePage.tsx` after edits; if 0 hits, delete the import on line 38.

#### 4c — Remove inline drift comment (Change 1b)

Delete the single-line comment at line 218 (`{/* Hero section — Daily Hub pt-36 pattern, no ATMOSPHERIC_HERO_BG */}`) — already gone after the consolidation in 4b's hero JSX, but verify after edit. The new hero comment can be omitted entirely, or replaced with `{/* Hero — BibleLanding pt-28 pb-12 rhythm */}` if a comment is desired (CC's call; default to no comment per CLAUDE.md "default to no comments unless WHY is non-obvious").

#### 4d — Hero spacing reconciliation (Change 1c)

In the new hero `<section>` (replacing line 219):

```diff
- <section className="relative z-10 w-full px-4 pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44">
+ <section className="relative z-10 w-full px-4 pt-28 pb-12">
```

Plain `pt-28 pb-12` (no responsive scaling) matches BibleLanding's `<BibleHero>` rhythm.

#### 4e — Quick stats cards FrostedCard migration (Change 10)

In `MyBibleAuthenticatedInner` (now consolidated), at the quick-stats row (current lines 268–305):

1. Add import at top: `import { FrostedCard } from '@/components/homepage/FrostedCard'` (already imported at line 39 — verify; if absent, add).
2. Replace each of the 5 stat cards. Concrete diffs:

For the clickable Highlights/Notes/Bookmarks loop (current lines 270–284):

```diff
- <button
-   key={stat.key}
-   type="button"
-   onClick={() => setView(stat.filterType as MyBibleViewId)}
-   className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition-[colors,transform] duration-fast hover:border-white/[0.18] hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]"
- >
+ <FrostedCard
+   key={stat.key}
+   as="button"
+   onClick={() => setView(stat.filterType as MyBibleViewId)}
+   className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl !p-3"
+ >
    <stat.icon size={16} className="text-white/40" aria-hidden="true" />
    <span className="text-xl font-bold text-white">{totalCounts[stat.key]}</span>
    <span className="text-xs text-white/50">{stat.label}</span>
- </button>
+ </FrostedCard>
```

The Books static stat (current lines 285–291):

```diff
- <div className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
+ <FrostedCard className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl !p-3">
    <BookOpen size={16} className="text-white/40" aria-hidden="true" />
    <span className="text-xl font-bold text-white">{totalCounts.booksSet.size}</span>
    <span className="text-xs text-white/50">Books</span>
- </div>
+ </FrostedCard>
```

The Streak clickable stat (current lines 292–303):

```diff
- <button
-   type="button"
-   onClick={() => setStreakModalOpen(true)}
-   className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition-[colors,transform] duration-fast hover:bg-white/[0.09] min-h-[44px] active:scale-[0.98]"
-   aria-label={`Reading streak: ${totalCounts.streak} days. Tap for details.`}
- >
+ <FrostedCard
+   as="button"
+   onClick={() => setStreakModalOpen(true)}
+   className="flex min-w-[100px] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-xl !p-3"
+   aria-label={`Reading streak: ${totalCounts.streak} days. Tap for details.`}
+ >
    <Flame size={16} className="text-white/40" aria-hidden="true" />
    <span className="text-xl font-bold text-white">{totalCounts.streak}</span>
    <span className="text-xs text-white/50">Streak</span>
- </button>
+ </FrostedCard>
```

The `!p-3` (Tailwind important) overrides FrostedCard's `p-6` default to keep stat cards dense. The `rounded-xl` overrides `rounded-3xl` for the same reason. FrostedCard's hover/focus/active styling (auto-applied when `onClick` is set) replaces the rolls-own hover classes.

#### 4f — Device-local-storage banner (Change 2c)

Add a new internal component within `MyBiblePage.tsx` (top-level, BEFORE `MyBiblePageInner`):

```tsx
const DEVICE_STORAGE_SEEN_KEY = 'wr_mybible_device_storage_seen'

function DeviceLocalStorageBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DEVICE_STORAGE_SEEN_KEY) === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DEVICE_STORAGE_SEEN_KEY, 'true')
    } catch {
      // localStorage may be unavailable — fail silently
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-4 pt-6">
      <FrostedCard variant="subdued" className="relative">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss device-local-storage notice"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/70 sm:text-base">
            Your data lives on this device. Sign in to keep it safe across devices.
          </p>
          <Link to="/?auth=login" className="flex-shrink-0">
            <Button variant="subtle" size="sm">Sign in</Button>
          </Link>
        </div>
      </FrostedCard>
    </div>
  )
}
```

Add imports at top of file:
- `import { Link } from 'react-router-dom'` (verify if `useNavigate` is already imported from `react-router-dom`; add `Link` to that import: `import { Link, useNavigate } from 'react-router-dom'`).
- `import { X } from 'lucide-react'` — add to existing `import { BookOpen, Paintbrush, ... } from 'lucide-react'` line.
- `import { Button } from '@/components/ui/Button'`.

Place `<DeviceLocalStorageBanner />` in the JSX after the hero section divider and before the heatmap section (per the locked Edge Case Decision):

```tsx
<div className="mx-auto max-w-6xl border-t border-white/[0.08]" />

{/* Device-local-storage banner — logged-out only (Change 2c) */}
{!isAuthenticated && <DeviceLocalStorageBanner />}

{/* Heatmap + Progress Map (BB-43) */}
<div className="relative z-10 mx-auto max-w-2xl px-4">
  ...existing
</div>
```

#### 4g — Test rewrites (Change 2d)

In `pages/__tests__/MyBiblePage.test.tsx`:

1. The "logged-out conversion card (BB-51)" describe block (lines 377–417 per current file) tests behaviors that no longer exist. Rewrite the block:

```tsx
describe('logged-out experience (Spec 8B)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed())
    localStorage.removeItem('wr_mybible_device_storage_seen')
  })

  it('renders the personal-layer page header when logged out', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: /My Bible/i })).toBeInTheDocument()
  })

  it('does not render the legacy Get Started CTA shell', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /Get Started — It's Free/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Track your reading journey, highlights, notes, and bookmarks/i)).not.toBeInTheDocument()
  })

  it('renders the device-local-storage banner', () => {
    renderPage()
    expect(screen.getByText(/Your data lives on this device/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign in/i })).toHaveAttribute('href', '/?auth=login')
  })

  it('dismissing the banner persists to localStorage and hides it', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Dismiss device-local-storage notice/i }))
    expect(localStorage.getItem('wr_mybible_device_storage_seen')).toBe('true')
    expect(screen.queryByText(/Your data lives on this device/i)).not.toBeInTheDocument()
  })

  it('does not render the banner when previously dismissed', () => {
    localStorage.setItem('wr_mybible_device_storage_seen', 'true')
    renderPage()
    expect(screen.queryByText(/Your data lives on this device/i)).not.toBeInTheDocument()
  })

  it('renders the personal layer (heatmap, progress map, memorization deck, activity feed) for logged-out users', () => {
    renderPage()
    // Mock useActivityFeed already returns realistic data; verify a representative element from each section
    expect(screen.getByText(/Memorization/i)).toBeInTheDocument() // memorization deck heading or empty state
    // Optional: assert other sections render based on existing mocks
  })
})

describe('logged-in experience (Spec 8B)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', name: 'Eric' } as any,
      login: vi.fn(),
      logout: vi.fn(),
    })
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed())
  })

  it('hides the device-local-storage banner', () => {
    renderPage()
    expect(screen.queryByText(/Your data lives on this device/i)).not.toBeInTheDocument()
  })
})
```

2. Other describe blocks (logged-in feed rendering, etc.) should pass unchanged after the consolidation. Verify one-by-one.

3. In `pages/__tests__/MyBiblePageHeatmap.test.tsx`: any logged-out-specific tests get the same treatment. If none, no changes needed.

#### 4h — Document new localStorage key

Update `/Users/eric.champlin/worship-room/.claude/rules/11-local-storage-keys.md` to add `wr_mybible_device_storage_seen` under the "Engagement & Surprise Moments" or new "MyBible" subsection:

```markdown
| `wr_mybible_device_storage_seen` | `"true"` | MyBible logged-out device-local-storage banner dismissal flag (Spec 8B). Set when user dismisses the banner. Read on `/bible/my` mount; if `"true"`, banner is hidden. Cleared only by user-initiated localStorage clearance — there's no in-app reset. |
```

Add to the appropriate section. Verify against the file's structure before insertion.

**Auth gating:**
- The page no longer triggers `useAuthModal` for the "Get Started" path (deleted).
- The new banner Sign In CTA uses the `/?auth=login` deep-link pattern (Spec 7's `AuthQueryParamHandler`).
- `useAuth().isAuthenticated` is read at component top to decide banner visibility.

**Responsive behavior:**
- Desktop (1440px): Hero centered; stat cards 4–5 in a row; banner FrostedCard subdued, max-width 2xl, copy + Sign In button inline.
- Tablet (768px): Hero centered; stat cards horizontal scroll OR justify-center per existing `sm:justify-center sm:overflow-visible`; banner same as desktop.
- Mobile (375px): Hero centered with smaller text; stat cards horizontal scroll; banner full-width with `px-4`, copy stacks above Sign In button.

**Inline position expectations:**
- Banner row at desktop (1440px) and tablet (768px): copy + Sign In button share top-y (no wrap, copy in left, button on right). At 375px: stack acceptable.
- Stat cards row: cards share top-y at 768px+. At 375px: horizontal scroll preserved.

**Guardrails (DO NOT):**
- Do NOT remove `<Navbar transparent />`.
- Do NOT remove `<SEO ... />`.
- Do NOT remove `<SiteFooter />`.
- Do NOT remove the `<BibleDrawer>` / `<BibleSettingsModal>` / `<StreakDetailModal>` / `<ActivityActionMenu>` JSX at the bottom.
- Do NOT touch the heatmap (`<ReadingHeatmap>`), progress map (`<BibleProgressMap>`), or memorization deck (`<MemorizationDeck>`) components.
- Do NOT touch the ActivityFilterBar or ColorFilterStrip JSX.
- Do NOT touch the activity feed mapping logic (`items.map`).
- Do NOT touch the FeatureEmptyState fallback.
- Do NOT touch the `useMyBibleView` URL sync useEffect.
- Do NOT use `<HorizonGlow>` anywhere on this page.
- Do NOT keep the `MyBibleAuthenticatedInner` separate function — consolidate fully.
- Do NOT remove the `bg-primary` decorative tints elsewhere in the file (Decision 11).
- Do NOT introduce a new `useAuthModal()` call (it's no longer needed).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Logged-out: banner visible | unit | Mock `useAuth` returns `isAuthenticated: false`; assert banner copy is in the document |
| Logged-out: dismissal persists | integration | Click dismiss; assert `localStorage.getItem(KEY) === 'true'` and banner gone |
| Logged-out: banner hidden after prior dismissal | unit | Set localStorage flag before render; assert banner not rendered |
| Logged-out: Sign In links to `/?auth=login` | unit | Assert href on the Link |
| Logged-in: banner hidden | unit | Mock `isAuthenticated: true`; assert banner not in document |
| Logged-out: personal layer renders (heatmap/progress map/deck/feed) | unit | Verify the page is no longer the auth shell |
| All existing logged-in tests | regression | Should pass unchanged (page consolidation moved logic, not changed it) |
| Hero spacing | visual | Eyeball: hero pt matches BibleLanding's BibleHero rhythm |
| Quick stats cards | visual | Eyeball: stat cards have FrostedCard chrome (border-white/[0.12], white/[0.07] bg) |
| Atmospheric layer | visual | Eyeball: BackgroundCanvas radial gradients visible behind content |

**Expected state after completion:**
- [ ] HorizonGlow import deleted; BackgroundCanvas imported and used
- [ ] Auth-gate branch removed; single rendering path for both auth states
- [ ] "Get Started — It's Free" CTA shell deleted
- [ ] Device-local-storage banner component implemented and conditionally rendered when `!isAuthenticated`
- [ ] Banner is dismissable; persists to `wr_mybible_device_storage_seen`
- [ ] `wr_mybible_device_storage_seen` documented in `11-local-storage-keys.md`
- [ ] Quick stats cards migrated to `<FrostedCard>` (4 buttons + 1 div = 5 cards)
- [ ] Hero spacing migrated from `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44` to `pt-28 pb-12`
- [ ] Inline drift comment deleted
- [ ] Tests rewritten and passing (logged-out describe rewritten, logged-in describes unchanged)
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` matches baseline + new test count delta
- [ ] Visual eyeball: page renders with BackgroundCanvas atmosphere, banner visible logged-out, hidden logged-in

---

### Step 5: BibleReader chapter-mount effect — recordChapterVisit + markChapterRead (Changes 4a + 5b)

**Objective:** Wire the BB-43 reading heatmap data source AND consolidate the direct localStorage write into the new reactive store mutation API. Decision 13 bounds this step to ONLY the chapter-mount effect.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — chapter-mount effect at lines 581–614.
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — add 3 new test cases.

**Details:**

This step has a hard dependency on Step 6 (Change 5a creates the `markChapterRead` named export). Run Step 6 BEFORE Step 5 OR add a temporary fallback. The simplest sequence is **Step 6 first, then Step 5** — execution order in this plan accordingly.

In `BibleReader.tsx` lines 581–614, the current effect:

```tsx
// Read tracking — writes for all users (no auth check)
useEffect(() => {
  if (!bookSlug || !book || isLoading || loadError || verses.length === 0) return

  localStorage.setItem(
    'wr_bible_last_read',
    JSON.stringify({
      book: book.name,
      chapter: chapterNumber,
      verse: 1,
      timestamp: Date.now(),
    }),
  )

  const progressRaw = localStorage.getItem('wr_bible_progress')
  const progress: Record<string, number[]> = progressRaw ? JSON.parse(progressRaw) : {}
  const bookChapters = progress[bookSlug] ?? []
  if (!bookChapters.includes(chapterNumber)) {
    progress[bookSlug] = [...bookChapters, chapterNumber]
    localStorage.setItem('wr_bible_progress', JSON.stringify(progress))
  }

  // Record today's read for the streak system (idempotent within a day)
  const streakResult = recordReadToday()

  // BB-41: Show notification prompt on 2nd+ reading session of the day
  if (
    streakResult.delta === 'same-day' &&
    getPushSupportStatus() !== 'unsupported' &&
    getPermissionState() === 'default' &&
    localStorage.getItem('wr_notification_prompt_dismissed') !== 'true'
  ) {
    setShowNotifPrompt(true)
  }
}, [bookSlug, book, chapterNumber, isLoading, loadError, verses.length])
```

Replace the inner direct localStorage progress logic with `markChapterRead`, AND add `recordChapterVisit`:

```diff
+ import { recordChapterVisit } from '@/lib/heatmap'
+ import { markChapterRead } from '@/hooks/useBibleProgress'
  ...

  // Read tracking — writes for all users (no auth check)
  useEffect(() => {
    if (!bookSlug || !book || isLoading || loadError || verses.length === 0) return

    localStorage.setItem(
      'wr_bible_last_read',
      JSON.stringify({
        book: book.name,
        chapter: chapterNumber,
        verse: 1,
        timestamp: Date.now(),
      }),
    )

-   const progressRaw = localStorage.getItem('wr_bible_progress')
-   const progress: Record<string, number[]> = progressRaw ? JSON.parse(progressRaw) : {}
-   const bookChapters = progress[bookSlug] ?? []
-   if (!bookChapters.includes(chapterNumber)) {
-     progress[bookSlug] = [...bookChapters, chapterNumber]
-     localStorage.setItem('wr_bible_progress', JSON.stringify(progress))
-   }
+   markChapterRead(bookSlug, chapterNumber)
+   recordChapterVisit(bookSlug, chapterNumber)

    // Record today's read for the streak system (idempotent within a day)
    const streakResult = recordReadToday()
    // ... rest unchanged
```

Imports:
1. Add `import { recordChapterVisit } from '@/lib/heatmap'` near the top of BibleReader.tsx with the other lib imports.
2. Add `import { markChapterRead } from '@/hooks/useBibleProgress'` (this is a new named export from Step 6's reactive-store conversion).

**Auth gating:**
- The effect already has `// writes for all users (no auth check)` comment. Preserve.
- `markChapterRead` (post-Step 6) no longer gates on auth — both stores accept writes from logged-out users (Bible-wave posture).
- `recordChapterVisit` is also unconditional.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT touch the `wr_bible_last_read` write at lines 584–592.
- Do NOT touch the `recordReadToday()` call at line 603.
- Do NOT touch the BB-41 notification prompt logic at lines 605–613.
- Do NOT touch any other useEffect, ReaderChrome, TypographySheet, or sub-view in this file (Decision 13).
- Do NOT change the dependency array (the deps `bookSlug, book, chapterNumber, isLoading, loadError, verses.length` stay the same — `markChapterRead` and `recordChapterVisit` are stable module-level exports, NOT subject to React's "stable identity" rule because they're not React hooks).

**Test specifications:**

In `pages/__tests__/BibleReader.test.tsx`:

```tsx
import { recordChapterVisit } from '@/lib/heatmap'
import { markChapterRead, _resetForTesting as resetProgress } from '@/hooks/useBibleProgress' // adjust based on Step 6 exports

vi.mock('@/lib/heatmap', () => ({
  recordChapterVisit: vi.fn(),
  // preserve other exports as needed
}))
vi.mock('@/hooks/useBibleProgress', async () => {
  const actual = await vi.importActual('@/hooks/useBibleProgress')
  return {
    ...actual,
    markChapterRead: vi.fn(),
  }
})

describe('BibleReader chapter-mount effect (Spec 8B)', () => {
  it('calls recordChapterVisit and markChapterRead on chapter mount', async () => {
    renderReader({ bookSlug: 'john', chapter: 3 })
    await waitForBookLoad()
    expect(recordChapterVisit).toHaveBeenCalledWith('john', 3)
    expect(markChapterRead).toHaveBeenCalledWith('john', 3)
  })

  it('calls both functions again on chapter change', async () => {
    const { rerender } = renderReader({ bookSlug: 'john', chapter: 3 })
    await waitForBookLoad()
    vi.clearAllMocks()
    rerender(/* navigate to john 4 */)
    await waitForBookLoad()
    expect(recordChapterVisit).toHaveBeenCalledWith('john', 4)
    expect(markChapterRead).toHaveBeenCalledWith('john', 4)
  })

  it('does NOT call either function while isLoading', () => {
    renderReaderWithLoading({ bookSlug: 'john', chapter: 3, isLoading: true })
    expect(recordChapterVisit).not.toHaveBeenCalled()
    expect(markChapterRead).not.toHaveBeenCalled()
  })

  it('does NOT call either function on loadError', () => {
    renderReaderWithError({ bookSlug: 'john', chapter: 3 })
    expect(recordChapterVisit).not.toHaveBeenCalled()
    expect(markChapterRead).not.toHaveBeenCalled()
  })
})
```

Match the existing BibleReader test setup conventions (fixture data, render helper, etc.) — adjust the test helper names accordingly.

**Expected state after completion:**
- [ ] `recordChapterVisit(bookSlug, chapterNumber)` called in the chapter-mount effect
- [ ] `markChapterRead(bookSlug, chapterNumber)` replaces direct `localStorage.setItem('wr_bible_progress', ...)`
- [ ] Both calls land BEFORE `recordReadToday()` (atomic ordering preserved)
- [ ] Effect short-circuit guard `if (!bookSlug || !book || isLoading || loadError || verses.length === 0) return` unchanged
- [ ] Tests added: 4 new test cases (mount, change, isLoading guard, loadError guard)
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` matches baseline + new test count delta

---

### Step 6: useBibleProgress reactive store conversion (Changes 5a + 5c + 5d)

**Objective:** Convert `useBibleProgress` from a one-time `useState` snapshot to a real reactive store with `subscribe()` / `getProgressSnapshot()` / `markChapterRead()` named exports + cross-tab sync. Preserves the existing 7-property hook contract exactly. **Run BEFORE Step 5** — Step 5 imports `markChapterRead` from this module.

**Files to create/modify:**
- `frontend/src/hooks/useBibleProgress.ts` — full rewrite (preserves public API).
- `frontend/src/hooks/__tests__/useBibleProgress.test.tsx` — add 3+ subscription tests.
- `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx` — add 1 cross-mount reactive update test.

**Details:**

#### 6a — Rewrite the hook module

New `frontend/src/hooks/useBibleProgress.ts`:

```tsx
import { useCallback, useState, useSyncExternalStore } from 'react'

import { BIBLE_PROGRESS_KEY, BIBLE_BOOKS } from '@/constants/bible'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import type { BibleProgressMap } from '@/types/bible'

// --- Module-level reactive store state ---
let cache: BibleProgressMap | null = null
const listeners = new Set<() => void>()

function readFromStorage(): BibleProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(BIBLE_PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as BibleProgressMap
  } catch {
    return {}
  }
}

function writeToStorage(data: BibleProgressMap): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable / quota exceeded — silent fail
  }
}

function getCache(): BibleProgressMap {
  if (cache === null) cache = readFromStorage()
  return cache
}

function notifyListeners(): void {
  for (const listener of listeners) listener()
}

// --- Cross-tab sync (Change 5c) ---
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === BIBLE_PROGRESS_KEY) {
      cache = null // force re-read on next getProgressSnapshot
      notifyListeners()
    }
  })
}

// --- Public API ---

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getProgressSnapshot(): BibleProgressMap {
  return getCache()
}

function getServerSnapshot(): BibleProgressMap {
  return {}
}

/** Mark a chapter as read. Idempotent: no-op if already in progress. */
export function markChapterRead(bookSlug: string, chapter: number): { justCompletedBook: string | null } {
  const current = getCache()
  const bookProgress = current[bookSlug] ?? []
  if (bookProgress.includes(chapter)) {
    return { justCompletedBook: null }
  }
  const updated: BibleProgressMap = { ...current, [bookSlug]: [...bookProgress, chapter] }
  cache = updated
  writeToStorage(updated)
  notifyListeners()

  // Increment Bible chapters read counter for badges (preserve existing behavior)
  const badgeData = getBadgeData()
  saveBadgeData({
    ...badgeData,
    activityCounts: {
      ...badgeData.activityCounts,
      bibleChaptersRead: badgeData.activityCounts.bibleChaptersRead + 1,
    },
  })

  // Check if the book is now complete (preserve existing behavior)
  const bookData = BIBLE_BOOKS.find((b) => b.slug === bookSlug)
  let justCompletedBook: string | null = null
  if (bookData) {
    const updatedBookProgress = updated[bookSlug] ?? []
    if (updatedBookProgress.length >= bookData.chapters) {
      justCompletedBook = bookSlug
    }
  }
  return { justCompletedBook }
}

// --- React hook ---

export function useBibleProgress(): {
  progress: BibleProgressMap
  markChapterRead: (bookSlug: string, chapter: number) => void
  getBookProgress: (bookSlug: string) => number[]
  isChapterRead: (bookSlug: string, chapter: number) => boolean
  justCompletedBook: string | null
  clearJustCompletedBook: () => void
  getCompletedBookCount: () => number
} {
  const progress = useSyncExternalStore(subscribeProgress, getProgressSnapshot, getServerSnapshot)
  const [justCompletedBook, setJustCompletedBook] = useState<string | null>(null)

  const markChapterReadHook = useCallback((bookSlug: string, chapter: number) => {
    const result = markChapterRead(bookSlug, chapter)
    if (result.justCompletedBook) {
      setJustCompletedBook(result.justCompletedBook)
    }
  }, [])

  const clearJustCompletedBook = useCallback(() => setJustCompletedBook(null), [])

  const getCompletedBookCount = useCallback((): number => {
    const current = getCache()
    return BIBLE_BOOKS.filter((book) => {
      const chapters = current[book.slug] ?? []
      return chapters.length >= book.chapters
    }).length
  }, [])

  const getBookProgress = useCallback(
    (bookSlug: string): number[] => progress[bookSlug] ?? [],
    [progress],
  )

  const isChapterRead = useCallback(
    (bookSlug: string, chapter: number): boolean => (progress[bookSlug] ?? []).includes(chapter),
    [progress],
  )

  return {
    progress,
    markChapterRead: markChapterReadHook,
    getBookProgress,
    isChapterRead,
    justCompletedBook,
    clearJustCompletedBook,
    getCompletedBookCount,
  }
}

// --- Test helper ---

export function _resetForTesting(): void {
  cache = null
  listeners.clear()
}
```

Key points:

- The `useBibleProgress` hook's return shape is **exactly preserved**: `{ progress, markChapterRead, getBookProgress, isChapterRead, justCompletedBook, clearJustCompletedBook, getCompletedBookCount }`. Existing consumers (BibleProgressMap, MyBiblePage, badge code, etc.) need ZERO call-site changes.
- `markChapterRead` is exported as a top-level named function (callable from BibleReader without going through the hook) AND as a hook return value (`markChapterRead: markChapterReadHook` — the hook variant additionally manages local `justCompletedBook` state).
- Auth gating is REMOVED from all read methods (`getBookProgress`, `isChapterRead`, `getCompletedBookCount`) and from `markChapterRead`. The Bible-wave posture allows logged-out reads/writes to localStorage.
- `useAuth` import is no longer needed — verify and delete.
- `setProgress` is gone — the new `progress` value comes from `useSyncExternalStore`, not from local state.
- `justCompletedBook` stays as local hook state because it's a transient "celebrate this once" signal — preserve existing behavior.
- Cross-tab `storage` event listener registered at module top level when `window` exists.
- `_resetForTesting()` clears the cache + listeners for test isolation.

#### 6b — Tests for useBibleProgress (Change 5d)

In `frontend/src/hooks/__tests__/useBibleProgress.test.tsx`, add or update tests:

```tsx
import { renderHook, act, render, screen } from '@testing-library/react'
import { useBibleProgress, markChapterRead, _resetForTesting } from '@/hooks/useBibleProgress'
import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('useBibleProgress reactive store (Spec 8B Change 5)', () => {
  it('returns the same hook contract as before (regression guard)', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current).toEqual({
      progress: expect.any(Object),
      markChapterRead: expect.any(Function),
      getBookProgress: expect.any(Function),
      isChapterRead: expect.any(Function),
      justCompletedBook: null,
      clearJustCompletedBook: expect.any(Function),
      getCompletedBookCount: expect.any(Function),
    })
  })

  it('updates reactively when markChapterRead is called from outside the component', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})

    act(() => {
      markChapterRead('john', 3) // module-level export, NOT through the hook
    })

    expect(result.current.progress).toEqual({ john: [3] })
    expect(result.current.isChapterRead('john', 3)).toBe(true)
  })

  it('cross-component subscriptions update when one component mutates', () => {
    function ConsumerA() {
      const { progress } = useBibleProgress()
      return <span data-testid="a">{Object.keys(progress).length}</span>
    }
    function ConsumerB() {
      const { progress } = useBibleProgress()
      return <span data-testid="b">{progress.john?.length ?? 0}</span>
    }

    render(<><ConsumerA /><ConsumerB /></>)
    expect(screen.getByTestId('a').textContent).toBe('0')
    expect(screen.getByTestId('b').textContent).toBe('0')

    act(() => { markChapterRead('john', 3) })

    expect(screen.getByTestId('a').textContent).toBe('1')
    expect(screen.getByTestId('b').textContent).toBe('1')
  })

  it('does not double-add when the same chapter is marked twice (idempotent)', () => {
    const { result } = renderHook(() => useBibleProgress())
    act(() => {
      markChapterRead('john', 3)
      markChapterRead('john', 3)
    })
    expect(result.current.progress.john).toEqual([3])
  })

  it('writes through to localStorage', () => {
    act(() => { markChapterRead('john', 3) })
    expect(JSON.parse(localStorage.getItem('wr_bible_progress')!)).toEqual({ john: [3] })
  })

  it('cross-tab storage event invalidates cache and notifies listeners', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})

    // Simulate another tab writing
    localStorage.setItem('wr_bible_progress', JSON.stringify({ romans: [8] }))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'wr_bible_progress' }),
      )
    })
    expect(result.current.progress).toEqual({ romans: [8] })
  })

  it('logged-out users can write progress (auth gate removed)', () => {
    // No auth setup needed — gate is gone
    act(() => { markChapterRead('john', 3) })
    expect(localStorage.getItem('wr_bible_progress')).toBeTruthy()
  })
})
```

Existing tests in this file (if any) that asserted auth-gated returns (`getBookProgress` returning empty for logged-out users) get rewritten or deleted — those gates are gone.

#### 6c — MyBiblePageHeatmap reactive test (Change 5d)

In `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx`, add a cross-mount reactivity test:

```tsx
import { markChapterRead } from '@/hooks/useBibleProgress'

it('BibleProgressMap updates when markChapterRead is called during the same session', async () => {
  // Mock useAuth, useActivityFeed setup as existing tests do
  const { rerender } = renderPage()
  // initial state: empty progress map
  expect(/* find an unread chapter cell */).toBeInTheDocument()

  act(() => { markChapterRead('john', 3) })
  rerender(/* same component */)

  // expect the corresponding chapter cell to now be in "read" state
  // (specific selector depends on BibleProgressMap's current rendered structure — verify in source)
})
```

Match the existing `MyBiblePageHeatmap.test.tsx` setup helpers (mock factories, render helper).

**Auth gating:** The hook no longer reads `useAuth()`. Verify by grep: `grep -n "useAuth\|isAuthenticated" frontend/src/hooks/useBibleProgress.ts` after edits → expect 0 matches.

**Responsive behavior:** N/A: hook only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT change the hook's return shape. Existing consumers (BibleProgressMap on MyBiblePage:126; any other consumer found via `grep -rn "useBibleProgress"`) must work unchanged.
- Do NOT remove the badge counter logic (`bibleChaptersRead++`).
- Do NOT remove the book-completion check.
- Do NOT change the `BibleProgressMap` type.
- Do NOT introduce a `useReactiveStorage` generic wrapper (out of scope per direction doc).
- Do NOT skip the `_resetForTesting` export — tests need it.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Hook contract regression | unit | Assert all 7 properties on the hook return object |
| Cross-mount reactive update | unit | `markChapterRead` from outside causes hook re-render |
| Multi-consumer subscription | unit | Two `<Consumer>` components both update on same mutation |
| Idempotent same chapter | unit | Marking twice doesn't double the array |
| localStorage writes | unit | `wr_bible_progress` contains the new chapter after `markChapterRead` |
| Cross-tab storage event | unit | Dispatching a `storage` event invalidates cache and updates consumers |
| Logged-out write allowed | unit | Auth gate removal verified |
| MyBiblePage progress map cross-mount | integration | BibleProgressMap updates when markChapterRead called during session |

**Expected state after completion:**
- [ ] `useBibleProgress.ts` rewritten as reactive store
- [ ] `subscribeProgress`, `getProgressSnapshot`, `markChapterRead`, `_resetForTesting` exported as named exports
- [ ] Hook return shape preserved exactly (7 properties)
- [ ] Auth gates removed from all hook methods AND `markChapterRead`
- [ ] Cross-tab `storage` event listener registered
- [ ] Tests added (7+ new tests in useBibleProgress.test.tsx; 1 in MyBiblePageHeatmap.test.tsx)
- [ ] `pnpm typecheck` clean (especially: verify all 4+ existing consumers compile without changes)
- [ ] `pnpm test` matches baseline + new test count delta
- [ ] No new BB-45 anti-patterns introduced

---

### Step 7: useActivityFeed journal subscription (Changes 6a + 6b)

**Objective:** Add the missing `journalStore` subscription so Bible journal entries appear in the My Bible activity feed without requiring a page reload.

**Files to create/modify:**
- `frontend/src/hooks/bible/useActivityFeed.ts` — line 64–75 (the subscription block).
- `frontend/src/hooks/bible/__tests__/useActivityFeed.test.tsx` — add 1 reactive subscription test.

**Details:**

In `useActivityFeed.ts`:

```diff
  import { subscribe as subscribeHighlights } from '@/lib/bible/highlightStore'
  import { subscribe as subscribeBookmarks } from '@/lib/bible/bookmarkStore'
  import { subscribe as subscribeNotes } from '@/lib/bible/notes/store'
  import { subscribe as subscribeStreak } from '@/lib/bible/streakStore'
+ import { subscribe as subscribeJournal } from '@/lib/bible/journalStore'
  ...

  // Subscribe to store changes
  useEffect(() => {
    const reload = () => {
      setAllItems(loadAllActivity())
    }
    const unsubs = [
      subscribeHighlights(reload),
      subscribeBookmarks(reload),
      subscribeNotes(reload),
      subscribeStreak(reload),
+     subscribeJournal(reload),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])
```

Verify `journalStore.ts` exports `subscribe` (existing per `lib/bible/journalStore.ts`).

#### Test (Change 6b)

In `frontend/src/hooks/bible/__tests__/useActivityFeed.test.tsx`:

```tsx
import { createJournalEntry } from '@/lib/bible/journalStore' // verify exact API

it('reactively updates when a journal entry is added externally', async () => {
  const { result } = renderHook(() => useActivityFeed())
  expect(result.current.items.filter(i => i.type === 'journal').length).toBe(0)

  act(() => {
    createJournalEntry({ /* params per JournalEntry type */ })
  })

  await waitFor(() => {
    expect(result.current.items.filter(i => i.type === 'journal').length).toBe(1)
  })
})
```

Match existing `useActivityFeed.test.tsx` test setup conventions. Use `_resetForTesting` from `journalStore` if it exposes one (verify; if not, clear localStorage in beforeEach).

**Auth gating:** N/A.

**Responsive behavior:** N/A: hook only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT change `loadAllActivity()` — already includes journal entries (verified).
- Do NOT change the order of subscriptions (cosmetic — but appending at the end matches the spec's diff).
- Do NOT introduce `useState` mirrors of journal data (BB-45 anti-pattern).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Reactive journal update | unit | Adding entry via real store causes feed to include it |

**Expected state after completion:**
- [ ] One-line `subscribeJournal(reload)` added to subscription list
- [ ] One new test passing
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` matches baseline + 1

---

### Step 8: HighlightCard brittle subscription refactor (Change 7)

**Objective:** Convert `useMemorizationStore()` from a side-effect-only call to a proper data-derivation read. Robustness improvement — no behavior change.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/HighlightCard.tsx` — lines 29–45.

**Details:**

In `HighlightCard.tsx`:

```diff
  import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore'
- import { isCardForVerse, addCard, getCardForVerse, removeCard } from '@/lib/memorize'
+ import { addCard, getCardForVerse, removeCard } from '@/lib/memorize'
  ...

  export function HighlightCard({ ... }: HighlightCardProps) {
-   // Subscribe to memorization store so inDeck recomputes on add/remove
-   useMemorizationStore()
+   const cards = useMemorizationStore()
    ...

    const hasVerseInfo = ...
-   const inDeck = hasVerseInfo
-     ? isCardForVerse(book, chapter, startVerse, endVerse)
-     : false
+   const inDeck = hasVerseInfo
+     ? cards.some(
+         (c) =>
+           c.book === book &&
+           c.chapter === chapter &&
+           c.startVerse === startVerse &&
+           c.endVerse === endVerse,
+       )
+     : false
```

`isCardForVerse` is no longer needed (replaced by inline `cards.some(...)`); delete from imports. `addCard`, `getCardForVerse`, `removeCard` are still used in `handleMemorize`.

The behavior is equivalent: `cards.some(predicate)` matches what `isCardForVerse` does internally (`getCache().find(predicate)` returns truthy/falsy with the same predicate).

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI change.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT change `addCard`/`removeCard`/`getCardForVerse` callers in `handleMemorize` — those still work via direct imports.
- Do NOT remove `useMemorizationStore` import — now used for its return value.
- Do NOT break the predicate (book/chapter/startVerse/endVerse equality) — must match `isCardForVerse`'s internal logic exactly.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing HighlightCard tests | regression | All pass under new pattern |

**Expected state after completion:**
- [ ] `useMemorizationStore()` return value used to derive `inDeck`
- [ ] `isCardForVerse` removed from imports
- [ ] All existing tests pass (the test mocks remain valid for now — Change 8 fixes those next)
- [ ] `pnpm typecheck` clean

---

### Step 9: HighlightCardMemorize BB-45 test rewrite (Change 8)

**Objective:** Replace wholesale module mocking with real-store + mutate-from-outside pattern per `06-testing.md` § "Reactive Store Consumer Pattern". This is the canonical migration example for the BB-45 anti-pattern.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/__tests__/HighlightCardMemorize.test.tsx` — full rewrite (~107 LOC).

**Details:**

Replace the entire test file:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { HighlightCard } from '../HighlightCard'
import { addCard, removeCard, _resetForTesting } from '@/lib/memorize'

const baseProps = {
  data: { type: 'highlight' as const, color: 'peace' as const },
  verseText: 'For God so loved the world...',
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('HighlightCard memorize affordance (Spec 8B Change 8 — real-store BB-45 pattern)', () => {
  it('renders Layers icon when verse not in deck', () => {
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByLabelText('Add to memorization deck')).toBeInTheDocument()
  })

  it('renders "In deck" label when verse is in deck', () => {
    addCard({
      book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16,
      verseText: 'For God so loved the world...', reference: 'John 3:16',
    })
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByText('In deck')).toBeInTheDocument()
  })

  it('clicking Add icon adds verse to the real deck', () => {
    render(<HighlightCard {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Add to memorization deck'))
    // assert side-effect via the real store's getter
    const { getAllCards } = require('@/lib/memorize')
    const cards = getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      book: 'john', chapter: 3, startVerse: 16, endVerse: 16,
      reference: 'John 3:16',
    })
  })

  it('clicking "In deck" removes from the real deck', () => {
    addCard({
      book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16,
      verseText: 'For God so loved the world...', reference: 'John 3:16',
    })
    render(<HighlightCard {...baseProps} />)
    fireEvent.click(screen.getByLabelText('In memorization deck'))
    const { getAllCards } = require('@/lib/memorize')
    expect(getAllCards()).toHaveLength(0)
  })

  it('updates "In deck" badge reactively when card added externally (BB-45 subscription verification)', async () => {
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByLabelText('Add to memorization deck')).toBeInTheDocument()

    act(() => {
      addCard({
        book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16,
        verseText: 'For God so loved the world...', reference: 'John 3:16',
      })
    })

    expect(await screen.findByText('In deck')).toBeInTheDocument()
  })

  it('updates "In deck" badge reactively when card removed externally', async () => {
    const card = addCard({
      book: 'john', bookName: 'John', chapter: 3, startVerse: 16, endVerse: 16,
      verseText: 'For God so loved the world...', reference: 'John 3:16',
    })
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByText('In deck')).toBeInTheDocument()

    act(() => { removeCard(card.id) })

    expect(await screen.findByLabelText('Add to memorization deck')).toBeInTheDocument()
  })

  it('click stops propagation', () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <HighlightCard {...baseProps} />
      </div>,
    )
    fireEvent.click(screen.getByLabelText('Add to memorization deck'))
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('hides affordance when verse info missing', () => {
    const { data, verseText } = baseProps
    render(<HighlightCard data={data} verseText={verseText} />)
    expect(screen.queryByLabelText(/memorization deck/)).not.toBeInTheDocument()
  })

  it('hides affordance when verseText is null', () => {
    render(<HighlightCard {...baseProps} verseText={null} />)
    expect(screen.queryByLabelText(/memorization deck/)).not.toBeInTheDocument()
  })
})
```

Key changes from the old file:
- Delete `vi.mock('@/hooks/bible/useMemorizationStore', ...)` and `vi.mock('@/lib/memorize', ...)`.
- Import the REAL `addCard`, `removeCard`, `_resetForTesting` from `@/lib/memorize`.
- `beforeEach` clears localStorage AND calls `_resetForTesting()`.
- New tests verify reactive subscription: external `addCard`/`removeCard` cause re-render.
- Use `act()` from `@testing-library/react` to wrap mutations.
- Use `findByText`/`findByLabelText` for re-render assertions; `queryBy*` for absence.

**Auth gating:** N/A.

**Responsive behavior:** N/A: tests only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT mock `@/lib/memorize`.
- Do NOT mock `@/hooks/bible/useMemorizationStore`.
- Do NOT mock `useSyncExternalStore` (would defeat the BB-45 pattern verification).
- Do NOT delete the behavioral assertions — only the mocking pattern changes.
- Do NOT use `vi.useFakeTimers()` — the reactive store uses synchronous notifications.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| 9 tests above | integration | Cover all original behaviors + 2 new reactive subscription verifications |

**Expected state after completion:**
- [ ] No `vi.mock` calls in HighlightCardMemorize.test.tsx
- [ ] Real `addCard`/`removeCard`/`_resetForTesting` used
- [ ] 2 new tests verifying reactive subscription on external mutation
- [ ] All 9 tests pass
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` matches baseline + new test count delta

---

### Step 10: MemorizationFlipCard chrome migration + a11y fix (Changes 9a + 9b + 9c + 9d)

**Objective:** Migrate front and back faces to `<FrostedCard>`; replace `role="button"` on `<div>` with a real `<button>` element.

**Files to create/modify:**
- `frontend/src/components/memorize/MemorizationFlipCard.tsx` — lines 63–120.
- `frontend/src/components/memorize/__tests__/MemorizationFlipCard.test.tsx` — class-string + role assertions.

**Details:**

Restructure the component:

```tsx
import { useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { timeAgo } from '@/lib/time'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import type { MemorizationCard } from '@/types/memorize'

// ... interface unchanged ...

export function MemorizationFlipCard({ card, onRemove, onReview }: MemorizationFlipCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const handleFlip = () => {
    setFlipped((prev) => {
      const next = !prev
      if (next) queueMicrotask(() => onReview(card.id))
      return next
    })
  }

  const dateAdded = timeAgo(new Date(card.createdAt).toISOString())

  const footer = (
    <CardFooter
      card={card}
      dateAdded={dateAdded}
      confirmingRemove={confirmingRemove}
      onStartRemove={(e) => { e.stopPropagation(); setConfirmingRemove(true) }}
      onConfirmRemove={(e) => { e.stopPropagation(); onRemove(card.id); setConfirmingRemove(false) }}
      onCancelRemove={(e) => { e.stopPropagation(); setConfirmingRemove(false) }}
    />
  )

  return (
    <div className="h-[180px]" style={{ perspective: '1000px' }}>
      <button
        type="button"
        onClick={handleFlip}
        aria-label={flipped ? 'Flip card to show reference' : 'Flip card to reveal verse text'}
        aria-pressed={flipped}
        className="relative h-full w-full transition-transform motion-reduce:transition-none duration-base ease-decelerate motion-reduce:duration-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <FrostedCard
          className="absolute inset-0 rounded-2xl !p-4 flex flex-col"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xl font-semibold text-white text-center">
              {card.reference}
            </span>
          </div>
          <RotateCcw size={14} className="absolute top-3 right-3 text-white/50" aria-hidden="true" />
          {footer}
        </FrostedCard>

        {/* Back face */}
        <FrostedCard
          className="absolute inset-0 rounded-2xl !p-4 flex flex-col"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="flex-1 overflow-y-auto">
            <p className="text-[15px] text-white/90 leading-relaxed font-serif">
              {card.verseText}
            </p>
          </div>
          {footer}
        </FrostedCard>
      </button>
    </div>
  )
}

// CardFooter unchanged
```

Key changes:

1. `role="button"` div → real `<button type="button">` element.
2. Manual `onKeyDown` handler removed — the native `<button>` activates on Enter and Space natively, no need for `handleKeyDown`.
3. `tabIndex={0}` removed — `<button>` is focusable by default.
4. `aria-pressed={flipped}` added — semantic state announcement for screen readers.
5. Front and back `<div>` faces → `<FrostedCard>` with `className="absolute inset-0 rounded-2xl !p-4 flex flex-col"` and `style={{ backfaceVisibility, transform }}`. The `!p-4` overrides FrostedCard's default `p-6`. The `rounded-2xl` overrides default `rounded-3xl`.
6. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl` added to the button for keyboard focus indicator (the rounded-2xl matches the inner FrostedCards so the ring follows the card's actual shape).
7. The 3D transform is preserved on the `<button>` element — `transformStyle: preserve-3d` and the rotateY animation work identically on a button vs. div.
8. The `CardFooter` inner buttons (Yes/Cancel/X) inside the FrostedCard faces — these are NOT modified. Note: HTML doesn't allow nested `<button>` elements. Verify whether the footer's interactive children are buttons (currently they are: lines 143, 152, 167). **This creates an invalid-HTML problem.**

**Critical structural decision: nested buttons are invalid HTML.** The current `<div role="button">` allows nested buttons because the outer is a div. Switching the outer to `<button>` breaks this.

**Resolution: Move the interactive elements (X remove button, Yes/Cancel confirm buttons) OUTSIDE the flip button.** Restructure so the outer wrapper is a `<div>` with the `<button>` as the flippable card surface, and the footer interactive elements sit OUTSIDE the button but ON TOP of it (positioned absolutely):

Updated structure:

```tsx
return (
  <div className="relative h-[180px]" style={{ perspective: '1000px' }}>
    <button
      type="button"
      onClick={handleFlip}
      aria-label={flipped ? 'Flip card to show reference' : 'Flip card to reveal verse text'}
      aria-pressed={flipped}
      className="relative h-full w-full transition-transform motion-reduce:transition-none duration-base ease-decelerate motion-reduce:duration-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
      style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
    >
      <FrostedCard className="absolute inset-0 rounded-2xl !p-4 flex flex-col" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xl font-semibold text-white text-center">{card.reference}</span>
        </div>
        <RotateCcw size={14} className="absolute top-3 right-3 text-white/50" aria-hidden="true" />
        {/* Front-face footer placeholder (just date display; no interactive elements) */}
        <FrontFaceDateDisplay dateAdded={dateAdded} />
      </FrostedCard>

      <FrostedCard className="absolute inset-0 rounded-2xl !p-4 flex flex-col" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <div className="flex-1 overflow-y-auto">
          <p className="text-[15px] text-white/90 leading-relaxed font-serif">{card.verseText}</p>
        </div>
        <BackFaceDateDisplay dateAdded={dateAdded} />
      </FrostedCard>
    </button>

    {/* Interactive footer overlays — OUTSIDE the flip button to avoid nested-button HTML */}
    <CardFooterOverlay
      card={card}
      flipped={flipped}
      confirmingRemove={confirmingRemove}
      onStartRemove={() => setConfirmingRemove(true)}
      onConfirmRemove={() => { onRemove(card.id); setConfirmingRemove(false) }}
      onCancelRemove={() => setConfirmingRemove(false)}
    />
  </div>
)
```

Where `<CardFooterOverlay>` is positioned absolutely (`absolute bottom-3 left-3 right-3 z-10`) on top of the card and follows the flip orientation visually (could use `transform: rotateY(0deg)` on front, hidden when back, or use opacity transitions). Simplest: position it absolutely at the bottom of the OUTER wrapper, outside the flipping button — it stays visually on the card without being inside the rotating element.

**However, this is a significant restructure that may not be necessary if the footer interactive elements can be safely nested.** HTML5 forbids `<button>` inside `<button>`, but React may not lint it without an explicit a11y rule. **Real-world risk:** screen readers may announce nested buttons inconsistently.

**Final structural choice — wrap, don't nest:**

Keep the outer `<div>` (no role) for the 3D context AND for the absolute-positioned footer. Make ONLY the card-face surface the `<button>`. The footer overlay is a sibling, not a child.

```tsx
return (
  <div className="relative h-[180px]" style={{ perspective: '1000px' }}>
    <button
      type="button"
      onClick={handleFlip}
      aria-label={flipped ? 'Flip card to show reference' : 'Flip card to reveal verse text'}
      aria-pressed={flipped}
      className="relative block h-full w-full transition-transform motion-reduce:transition-none duration-base ease-decelerate motion-reduce:duration-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
      style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
    >
      <FrostedCard className="absolute inset-0 rounded-2xl !p-4 flex flex-col" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xl font-semibold text-white text-center">{card.reference}</span>
        </div>
        <RotateCcw size={14} className="absolute top-3 right-3 text-white/50" aria-hidden="true" />
        <span className="absolute bottom-3 left-3 text-xs text-white/50">Added {dateAdded}</span>
      </FrostedCard>

      <FrostedCard className="absolute inset-0 rounded-2xl !p-4 flex flex-col" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="text-[15px] text-white/90 leading-relaxed font-serif">{card.verseText}</p>
        </div>
        <span className="absolute bottom-3 left-3 text-xs text-white/50">Added {dateAdded}</span>
      </FrostedCard>
    </button>

    {/* Remove control — OUTSIDE the flip button. Visible on both faces (since 3D flip applies to button only). */}
    <div className="absolute bottom-2 right-2 z-10">
      {confirmingRemove ? (
        <ConfirmRemovePill
          onConfirm={(e) => { e.stopPropagation(); onRemove(card.id); setConfirmingRemove(false) }}
          onCancel={(e) => { e.stopPropagation(); setConfirmingRemove(false) }}
        />
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setConfirmingRemove(true) }}
          aria-label={`Remove ${card.reference} from memorization deck`}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  </div>
)
```

`<ConfirmRemovePill>` is a simple inline component containing the Yes / Cancel buttons. Since the remove control sits OUTSIDE the flip button, it doesn't rotate with the card — it stays in the same screen position regardless of flip state. The "Added {dateAdded}" text moves inside the flippable surface (one on each face).

This resolves the nested-button problem. Visual change: the X button no longer participates in the flip animation (acceptable trade-off — it's a control overlay, not part of the card content). The "Remove this card?" confirmation pill appears in the same anchored bottom-right location.

**This is a meaningful structural refactor.** Plan execution should proceed carefully, verify visually on the running dev server, and update tests to match.

#### 10b — Tests update (Change 9d)

In `frontend/src/components/memorize/__tests__/MemorizationFlipCard.test.tsx`:

1. Class assertions on `bg-white/[0.06]` etc. → either drop class assertions in favor of role/name, OR check for the FrostedCard's resulting class signature (`bg-white/[0.07]`).
2. `getByRole('button')` was previously the div with `role="button"`. Now it resolves to the actual `<button>` element. With the X remove button outside, there are now TWO buttons per card: the flip button + the X button. Disambiguate via `name` matcher: `getByRole('button', { name: /Flip card/i })` for the flip surface; `getByRole('button', { name: /Remove .* from memorization deck/i })` for the X.
3. Keyboard activation (Enter/Space): native `<button>` activates `onClick` on Enter and Space — no separate keydown test needed (or, if existing test used `fireEvent.keyDown`, switch to `fireEvent.click` since native handling works).
4. `aria-pressed` test: assert that the flip button has `aria-pressed="false"` initially and `aria-pressed="true"` after click.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Card height `h-[180px]` preserved. Flip button fills the card. X / confirm pill in bottom-right corner. FrostedCard chrome on both faces.
- Tablet (768px): Same.
- Mobile (375px): Same. 44×44 tap targets met (X button is `h-11 w-11` = 44×44).

**Inline position expectations:** N/A (no inline-row layout).

**Guardrails (DO NOT):**
- Do NOT remove the 3D flip animation.
- Do NOT remove the `transformStyle: preserve-3d`, `perspective: 1000px`, `backfaceVisibility: hidden` styles.
- Do NOT add `themeColor` (Decision 4).
- Do NOT add a flip sound effect (Decision 4).
- Do NOT add a celebration on add (Decision 4).
- Do NOT remove `queueMicrotask(() => onReview(card.id))` — preserve the deferred-review pattern.
- Do NOT remove the `motion-reduce:duration-0` reduced-motion handling.
- Do NOT nest `<button>` inside `<button>` — the structural refactor above prevents that.
- Do NOT remove `aria-label` from either the flip button or the remove button.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Flip button is real `<button>` | unit | `getByRole('button', { name: /Flip card/i }).tagName === 'BUTTON'` |
| Flip button has `aria-pressed` | unit | toggles between `"false"` and `"true"` |
| Click flips card | integration | `fireEvent.click(flipButton)` triggers flip |
| Enter key flips card (native) | integration | `userEvent.keyboard('{Enter}')` after focus |
| Space key flips card (native) | integration | `userEvent.keyboard(' ')` after focus |
| Remove button is separate from flip | unit | Two distinct buttons; X button click does not flip |
| Remove confirmation flow works | integration | X → "Remove this card?" → Yes/Cancel |
| `onReview` fires on front-to-back flip | unit | `queueMicrotask` resolves after flip |

**Expected state after completion:**
- [ ] `role="button"` on `<div>` replaced with real `<button type="button">`
- [ ] Front and back faces use `<FrostedCard>` (with `!p-4 rounded-2xl` overrides)
- [ ] Remove button moved OUTSIDE the flip button (avoids nested-button HTML)
- [ ] `aria-pressed` added for flip state
- [ ] `aria-label` on both flip button and remove button
- [ ] 3D flip animation preserved
- [ ] Keyboard activation works natively (Enter/Space on focused button)
- [ ] Touch activation works (tap to flip)
- [ ] Tests updated and passing
- [ ] No themeColor, no flip sound, no on-add celebration (Decision 4)
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` matches baseline + delta
- [ ] Visual eyeball: cards flip smoothly; X button stays in bottom-right; FrostedCard chrome on both faces

---

### Step 11: Final regression sweep + acceptance verification

**Objective:** Verify all changes integrate, no regressions on out-of-scope surfaces, all spec acceptance criteria satisfied.

**Files to create/modify:** None (verification only); ONE rule-doc update per Step 4 (already covered).

**Details:**

1. **Walk through every Acceptance Criterion checkbox in Spec § 442–551.** For each, verify pass:
   - MyBiblePage atmospheric + auth + chrome (15 items)
   - Bug fixes Decision 6 (12 items)
   - bg-primary CTA migrations (5 items)
   - Memorization (9 items)
   - Other (1 item — BookmarkCard)
   - Tests (8 items)
   - Manual eyeball checks logged-out (5 items)
   - Manual eyeball checks logged-in (3 items)
   - Manual eyeball checks visual (7 items)
   - Regression checks (12 items)
   - Branch discipline (3 items)

2. **Regression check on out-of-scope surfaces** — verify visually + via test suite that NONE of these changed:
   - `/bible` (BibleLanding)
   - `/bible/browse` (BibleBrowse)
   - `/bible/plans` (PlanBrowserPage)
   - `/bible/plans/:slug` (BiblePlanDetail)
   - `/bible/plans/:slug/day/:dayNumber` (BiblePlanDay)
   - `/bible/:book/:chapter` (BibleReader chrome — only the chapter-mount effect changed)
   - All Daily Hub tabs
   - Dashboard
   - Local Support pages
   - Grow
   - Music
   - Prayer Wall

3. **Verify `git diff` (read-only — user manages commits)** to confirm files touched are exactly:
   - `frontend/src/pages/MyBiblePage.tsx`
   - `frontend/src/pages/__tests__/MyBiblePage.test.tsx`
   - `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx`
   - `frontend/src/pages/BibleReader.tsx` (chapter-mount effect ONLY — `git diff frontend/src/pages/BibleReader.tsx` should show changes confined to lines 581–614)
   - `frontend/src/pages/__tests__/BibleReader.test.tsx`
   - `frontend/src/hooks/useBibleProgress.ts` (full rewrite)
   - `frontend/src/hooks/__tests__/useBibleProgress.test.tsx`
   - `frontend/src/hooks/bible/useActivityFeed.ts` (one-line addition)
   - `frontend/src/hooks/bible/__tests__/useActivityFeed.test.tsx` (one new test)
   - `frontend/src/components/memorize/MemorizationFlipCard.tsx` (full rewrite)
   - `frontend/src/components/memorize/__tests__/MemorizationFlipCard.test.tsx` (test updates)
   - `frontend/src/components/bible/my-bible/HighlightCard.tsx` (small refactor)
   - `frontend/src/components/bible/my-bible/__tests__/HighlightCardMemorize.test.tsx` (full rewrite)
   - `frontend/src/components/bible/my-bible/BibleSettingsModal.tsx` (one button)
   - `frontend/src/components/bible/my-bible/__tests__/BibleSettingsModal.test.tsx` (test updates)
   - `frontend/src/components/bible/my-bible/EmptySearchResults.tsx` (one button)
   - `frontend/src/components/bible/my-bible/__tests__/EmptySearchResults.test.tsx` (test updates)
   - `frontend/src/components/bible/my-bible/BookmarkCard.tsx` (one className)
   - `frontend/src/components/bible/reader/BookmarkLabelEditor.tsx` (one button)
   - `frontend/src/components/bible/reader/__tests__/BookmarkLabelEditor.test.tsx` (test updates)
   - `.claude/rules/11-local-storage-keys.md` (new key documented)

   Total: ~20 files. If any other file is in `git diff`, investigate.

4. **No git operations performed by CC.** User commits manually.

5. **Test counts:**
   - Pre-Spec-8B baseline: 9,470 pass / 1 pre-existing fail (per CLAUDE.md).
   - Post-Spec-8B expected: ~9,490 pass / 1 pre-existing fail (delta ~+20 from new tests across Steps 5, 6, 7, 8, 9, 10).
   - Any NEW failing file = regression. STOP and diagnose before marking done.

6. **`pnpm build` succeeds.** Test the production bundle: `cd frontend && pnpm build`.

7. **`pnpm lint` passes.** No new ESLint errors.

8. **Verify no `VITE_*_API_KEY` references introduced** (Key Protection Wave invariant): `grep -rn "VITE_.*_API_KEY" frontend/src` → expected: 0 hits.

9. **Verify no new auth modal trigger sites** introduced (Spec 7's 60+ sites unchanged): no new `useAuthModal()` calls outside what existed before.

10. **Verify `mirrorToLegacyKeys` and `// Transitional — removed in Phase 2 cutover` comments are untouched**: `git diff` should show 0 changes to `contexts/AuthContext.tsx`, `services/auth-service.ts`, `lib/auth-storage.ts`.

11. **Visual eyeball at desktop (1440px), tablet (768px), mobile (375px) on:**
    - `/bible/my` (logged-out): banner visible, personal layer renders, BackgroundCanvas atmosphere
    - `/bible/my` (logged-in): no banner, personal layer renders, same atmosphere
    - `/bible/my` after dismissing banner: banner stays gone, key set in localStorage
    - Memorization deck: cards flip smoothly, FrostedCard chrome, X button accessible
    - BookmarkCard with label: no italic, slightly more muted opacity

**Auth gating:** Verified in Step 11 acceptance verification.

**Responsive behavior:** Verified in Step 11 visual checks.

**Inline position expectations:** Verified in Step 11.

**Guardrails (DO NOT):**
- Do NOT commit, push, branch, stash, reset, or run any git mutation (per Spec § branch discipline).
- Do NOT skip any acceptance criterion.
- Do NOT report Done if any criterion fails.
- Do NOT mark complete if any pre-existing test failures expanded beyond the documented baseline.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full suite | regression | `pnpm test` — counts within expected delta |
| Build | smoke | `pnpm build` succeeds |
| Lint | smoke | `pnpm lint` passes |
| TypeCheck | smoke | `pnpm typecheck` passes |

**Expected state after completion:**
- [ ] Every spec acceptance criterion checked off
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass within expected deltas
- [ ] No regressions on out-of-scope surfaces (BibleLanding, BibleBrowse, PlanBrowserPage, BiblePlanDetail/Day, Dashboard, Daily Hub, Local Support, Grow, Music, Prayer Wall)
- [ ] BibleReader chrome unchanged (only the chapter-mount effect modified)
- [ ] No new BB-45 anti-patterns introduced
- [ ] No `VITE_*_API_KEY` introduced
- [ ] No new auth gates introduced
- [ ] `wr_mybible_device_storage_seen` documented in `11-local-storage-keys.md`
- [ ] Plan ready for `/verify-with-playwright /bible/my` and `/code-review`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pre-execution recon verification + baseline capture |
| 2 | 1 | BookmarkCard placeholder de-italicize (smallest change first) |
| 3 | 1 | bg-primary CTA migrations (4 buttons) |
| 4 | 1 | MyBiblePage atmospheric layer + auth-gate removal + banner + stat cards (depends on Step 3 only because Change 3c is part of MyBiblePage; OK to inline 3c into Step 4 or do Step 3 first — sequence doesn't strictly matter) |
| 6 | 1 | useBibleProgress reactive store conversion (BEFORE Step 5 because Step 5 imports `markChapterRead`) |
| 5 | 1, 6 | BibleReader chapter-mount effect (depends on Step 6's `markChapterRead` export) |
| 7 | 1 | useActivityFeed journal subscription (independent) |
| 8 | 1 | HighlightCard refactor (independent of Step 9 — Step 8's runtime change works under both old and new test mocks) |
| 9 | 1, 8 | HighlightCardMemorize test rewrite (depends on Step 8's source change to verify reactive subscription) |
| 10 | 1 | MemorizationFlipCard chrome + a11y (independent) |
| 11 | 1–10 | Final regression sweep + acceptance verification |

**Recommended sequential execution order:** 1, 2, 3, 4, 6, 5, 7, 8, 9, 10, 11.

**Parallelization (if multiple developers):** Steps 2, 3, 4, 6, 7, 8, 10 are mostly independent after Step 1. Step 5 depends on 6. Step 9 depends on 8. Step 11 is final gate.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pre-execution recon verification + baseline capture | [COMPLETE] | 2026-05-05 | All grep anchors matched plan: BookmarkLabelEditor:151, BibleSettingsModal:292, EmptySearchResults:21, MyBiblePage:218+352, BookmarkCard:21, HighlightCard:30. Recon prereqs confirmed (`getAllJournalEntries` import + loop in `activityLoader.ts`; `recordChapterVisit(book, chapter)` at `chapterVisitStore.ts:52`; `_resetForTesting` at `lib/memorize/index.ts:9`). Only MyBiblePage + test consume EmptySearchResults. **TypeScript:** clean. **Test baseline:** 9,512 pass / 2 fail (drift from CLAUDE.md `9,470/1` post-Spec-5 by +42 tests across Spec 6A/6B/6C/7 — healthy growth). Failures: (1) `useFaithPoints — unauthenticated > returns default values when not authenticated` (documented pre-existing intercession drift); (2) `Navbar > Active route > active top-level link has active styling` (**inherited from Spec 7 commit 36f75ae** — Spec 7 changed active link color `text-white` → `text-primary` and missed updating one of the 10 sibling assertions in this describe block; orthogonal to Spec 8B). Treating 9,512/2 as the new post-Spec-7 baseline. Spec 8B does not touch Navbar. Backup branch: `backup/pre-execute-20260505151728`. |
| 2 | BookmarkCard placeholder de-italicize | [COMPLETE] | 2026-05-05 | `frontend/src/components/bible/my-bible/BookmarkCard.tsx:21` — `italic text-white/50` → `text-white/40`. No co-located test file exists; no stale assertions. TypeScript clean. MyBiblePage tests 25/25. |
| 3 | bg-primary CTA migrations (Bookmark/Settings/Filter/Search) | [COMPLETE] | 2026-05-05 | 4 files migrated `<button bg-primary>` → `<Button variant="subtle" size="sm">`: `BookmarkLabelEditor.tsx:148-154` (Save); `BibleSettingsModal.tsx:289-294` (Merge with local data — sibling Replace/Cancel preserved as raw buttons per Decision 11); `EmptySearchResults.tsx:18-24` (Clear search); `MyBiblePage.tsx:349-355` (Clear filters). Button import added to all 4 files. No class-string assertions on `bg-primary` existed in any of the 4 affected test files — no test rewrites needed. TypeScript clean. Tests 47/47. |
| 4 | MyBiblePage atmospheric + auth + banner + stat cards + hero | [COMPLETE] | 2026-05-05 | `frontend/src/pages/MyBiblePage.tsx`: HorizonGlow import deleted + BackgroundCanvas added; useAuthModal import deleted (no longer used); `Link` added to react-router-dom imports; `X` added to lucide-react imports; new `DEVICE_STORAGE_SEEN_KEY` constant + `DeviceLocalStorageBanner` component added near top. Functions consolidated: `MyBiblePageInner` and `MyBibleAuthenticatedInner` merged into single `MyBiblePageInner` that pulls `isAuthenticated` from `useAuth()`; legacy "Get Started — It's Free" CTA shell removed. Outer wrapper `<div ...><HorizonGlow />...` → `<BackgroundCanvas className="flex flex-col font-sans">`. Hero spacing `pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44` → `pt-28 pb-12` (112px / 48px verified). Inline drift comment removed. Banner placed between hero divider and heatmap section, conditional on `!isAuthenticated`. **Banner CTA pattern correction:** plan suggested `<Link><Button>...</Button></Link>` (invalid HTML: interactive nested) — replaced with the established `<Button asChild><Link>...</Link></Button>` pattern from Spec 6A. Stat cards: 5 cards migrated to `<FrostedCard>` (3 stat-loop buttons + Books div + Streak button); kept tighter `rounded-xl !p-3` density override per FrostedCard Migration Caveat. Test rewrites: removed BB-51 logged-out conversion-card describe block (4 tests), added Spec 8B logged-out describe (6 tests: header renders, no Get Started, banner renders, dismiss persists, hidden after dismiss, footer trust signal renders) + logged-in describe (1 test: banner hidden). Updated hero-spacing test from `pt-36/sm:pt-40/lg:pt-44` to `pt-28/pb-12`. Removed unused `mockOpenAuthModal` variable. Documented `wr_mybible_device_storage_seen` in `.claude/rules/11-local-storage-keys.md` § Engagement & Surprise Moments. **Visual verification:** Playwright at 375/768/1440 (logged-out + logged-in) — BackgroundCanvas radial gradient confirmed via inline-style query (`canvasCount: 1`), outer wrapper class confirmed `relative min-h-screen overflow-hidden flex flex-col font-sans`, banner visible logged-out / hidden logged-in, dismissal persists across reload. **Tests:** 22/22 MyBiblePage tests + 6/6 MyBiblePageHeatmap tests pass. Net test delta: +3 (was 19, now 22). TypeScript clean. |
| 5 | BibleReader chapter-mount effect (recordChapterVisit + markChapterRead) | [COMPLETE] | 2026-05-05 | `frontend/src/pages/BibleReader.tsx`: imports added — `recordChapterVisit` from `@/lib/heatmap`, `markChapterRead` from `@/hooks/useBibleProgress`. Chapter-mount effect at lines ~595-600: replaced 7 lines of direct `localStorage.getItem/setItem('wr_bible_progress', ...)` logic with two function calls — `markChapterRead(bookSlug, chapterNumber)` + `recordChapterVisit(bookSlug, chapterNumber)`. `wr_bible_last_read`, `recordReadToday()`, BB-41 notification prompt, and dependency array all preserved unchanged. **Tests:** added 4 new tests in `BibleReader.test.tsx` (writes `wr_chapters_visited`, atomic writes, no writes on invalid book, no writes on invalid chapter). Added `resetBibleProgress()` and `resetChapterVisits()` to `beforeEach` to clear the new module-level caches between tests. **Caveat:** initially the new `wr_chapters_visited` test failed because `chapterVisitStore`'s module-level cache persisted across tests (its `recordChapterVisit` returned early when seeing the same book+chapter "already recorded today" in the stale cache). Fixed by adding the reset import. 26/26 BibleReader tests pass. TypeScript clean. |
| 6 | useBibleProgress reactive store conversion | [COMPLETE] | 2026-05-05 | `frontend/src/hooks/useBibleProgress.ts` rewritten as Pattern A reactive store. Module-level `cache` + `listeners` Set + `notifyListeners()` + `storage`-event listener registered at module top (cross-tab sync, Change 5c). Named exports added: `subscribeProgress`, `getProgressSnapshot`, `markChapterRead` (returns `{ justCompletedBook }`), `_resetForTesting`. Hook uses `useSyncExternalStore`. **All 4 auth gates removed** (Bible-wave posture per Direction Decision 1): `markChapterRead`, `getBookProgress`, `isChapterRead`, `getCompletedBookCount` — `useAuth` import deleted. **7-property hook contract preserved exactly** — verified by regression-guard test and via the 2 production consumers (`BookEntry.tsx:18` `getBookProgress`, `MyBiblePage.tsx:128` `progress`). Badge counter `bibleChaptersRead++` and book-completion check both preserved. Tests: rewrote `frontend/src/hooks/__tests__/useBibleProgress.test.tsx` from 19 to 26 tests — removed 4 auth-gate-dependent tests, added 7 new tests covering the reactive store (regression guard for hook contract; module-level `markChapterRead` reactivity; cross-component subscription propagation via two real consumer components; module-level write-through to localStorage; `storage` event invalidation; `storage` event for unrelated key does not invalidate; module-level `markChapterRead` returns metadata). **Deviation from plan 6c:** Did NOT add cross-mount reactive test to `MyBiblePageHeatmap.test.tsx` because the file mocks `useBibleProgress` wholesale (lines 28-34) — adding the test would require invasive rework of the mock setup, and the same behavioral assertion is already covered by the new "cross-component subscriptions update when one component mutates" test in `useBibleProgress.test.tsx` (renders two real consumers and verifies cross-mutation). Logged as plan-6c deviation. TypeScript clean. 26/26 hook tests + 22 MyBiblePage + 6 MyBiblePageHeatmap = 54 tests pass. |
| 7 | useActivityFeed journal subscription | [COMPLETE] | 2026-05-05 | `frontend/src/hooks/bible/useActivityFeed.ts`: added `subscribeJournal` import + `subscribeJournal(reload)` to the unsubs array. `useActivityFeed.test.ts`: added `journalListeners` to shared mock state + `vi.mock('@/lib/bible/journalStore', ...)` factory + `shared.journalListeners.clear()` in beforeEach + new test "re-loads when journal store changes (Spec 8B Change 6)" — also asserts `journalListeners.size === 1` to confirm the subscription wires through. 15/15 tests pass (was 14, now +1). TypeScript clean. |
| 8 | HighlightCard brittle subscription refactor | [COMPLETE] | 2026-05-05 | `frontend/src/components/bible/my-bible/HighlightCard.tsx`: removed `isCardForVerse` import; converted `useMemorizationStore()` from side-effect call to `const cards = useMemorizationStore()` data read; replaced `isCardForVerse(book, chapter, startVerse, endVerse)` with inline `cards.some((c) => c.book === book && c.chapter === chapter && c.startVerse === startVerse && c.endVerse === endVerse)`. **Note:** As predicted in the plan dependency map (Step 9 depends on Step 8), 2 tests in `HighlightCardMemorize.test.tsx` now fail because they mock `isCardForVerse` (no longer imported by component) and the wholesale `useMemorizationStore` mock returns `[]` (so `cards.some(...)` is always false). Step 9 rewrites these tests to the real-store pattern. TypeScript clean. |
| 9 | HighlightCardMemorize BB-45 test rewrite | [COMPLETE] | 2026-05-05 | `frontend/src/components/bible/my-bible/__tests__/HighlightCardMemorize.test.tsx` rewritten end-to-end. **Removed:** `vi.mock('@/hooks/bible/useMemorizationStore', ...)`, `vi.mock('@/lib/memorize', ...)`, `mockedIsCard`, `mockedGetCard`, `mockedAddCard`, `mockedRemoveCard`. **Added:** real imports from `@/lib/memorize` (`addCard`, `removeCard`, `getAllCards`, `_resetForTesting`); `beforeEach` calls `localStorage.clear()` + `_resetForTesting()`. **Test count:** 7 → 9 (added 2 new BB-45 subscription verification tests: re-renders when card added externally, re-renders when card removed externally — both use `act()` + `findByText`/`findByLabelText`). All 9 pass. This is now the canonical BB-45 reactive-store-consumer test pattern. |
| 10 | MemorizationFlipCard chrome + a11y | [COMPLETE] | 2026-05-05 | `frontend/src/components/memorize/MemorizationFlipCard.tsx` rewritten end-to-end. **Structural refactor (avoids nested-button HTML):** outer `<div role="button" tabIndex onKeyDown>` → real `<button type="button" aria-pressed>`; X remove control moved OUT of the flip button to a sibling absolutely positioned at `bottom-2 right-2 z-10` of the outer wrapper (no longer rotates with the card — acceptable trade-off per plan). `handleKeyDown` removed (native button handles Enter/Space). Front + back faces migrated to `<FrostedCard>` with `!p-4 rounded-2xl` density overrides — verified at runtime: bg=`rgba(255,255,255,0.07)`, border=`rgba(255,255,255,0.12)`, border-radius=16px. `CardFooter` helper deleted; "Added {dateAdded}" inlined onto each face as a small absolute span. Confirm-remove pill condensed to "Remove? Yes / Cancel" (was "Remove this card? / Yes / Cancel" — fits the smaller anchored space). 3D `transformStyle: preserve-3d`, `perspective`, `backfaceVisibility`, `queueMicrotask(onReview)`, and `motion-reduce:duration-0` all preserved. Tests: rewrote `MemorizationFlipCard.test.tsx` from 11 to 13 tests — added: aria-pressed toggle test, sibling-not-nested structural assertion, FrostedCard chrome assertion. Removed Enter/Space keyDown tests (native button handles those — separate keyDown tests would not exercise real onClick activation; click test is sufficient). Updated "Remove this card?" → "Remove?" assertion. **Visual verification:** Playwright at 1440px confirmed both faces render with FrostedCard chrome, flip button toggles aria-pressed correctly. 13/13 tests pass. TypeScript clean. |
| 11 | Final regression sweep + acceptance verification | [COMPLETE] | 2026-05-05 | **TypeScript:** clean. **Lint:** clean. **Build:** succeeded (`vite build` 103ms; PWA v1.2.0 manifest 344 entries; sw.js generated). **Tests:** 9,530 pass / 2 fail across 2 files. Pre-Spec-8B baseline was 9,512/2/2. **Net delta: +18 tests, +0 failures.** Both failures are documented pre-existing tech debt (`useFaithPoints — intercession activity drift` + `Navbar > Active route > active top-level link has active styling` inherited from Spec 7). **Regression caught + fixed:** mid-suite run found 7 NEW failures in `BibleReaderNotes.test.tsx` — its existing `vi.mock('@/hooks/useBibleProgress', ...)` factory only exposed `useBibleProgress` hook, but Spec 8B's `BibleReader.tsx` chapter-mount effect now imports `markChapterRead` as a named export. Extended the mock to also expose `markChapterRead`, `subscribeProgress`, `getProgressSnapshot`, `_resetForTesting` as `vi.fn()` stubs. After fix: BibleReaderNotes 8/8 pass, full suite restored to 9,530/2. **18 files changed** (vs plan's "~20" estimate; the 2 missing test files were `BibleSettingsModal.test.tsx`, `EmptySearchResults.test.tsx`, `BookmarkLabelEditor.test.tsx` — none had `bg-primary` class-string assertions to update so no diff, and `MyBiblePageHeatmap.test.tsx` per the Step 6c deviation). **Invariants verified:** zero `VITE_*_API_KEY` in code (only 2 references, both in `lib/env.ts` comments documenting the Key Protection Wave); zero new `useAuthModal` triggers in `components/bible/my-bible/`; auth-related files (`AuthContext.tsx`, `auth-service.ts`, `auth-storage.ts`) untouched. Spec 8B ready for `/code-review` and `/verify-with-playwright /bible/my`. |
