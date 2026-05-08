# Spec 8B: Bible Cluster — MyBible

**Master Plan Reference:** Direction document at `_plans/direction/bible-cluster-2026-05-05.md` is the locked decision set (19 numbered decisions covering all three Bible sub-specs). Recon at `_plans/recon/bible-2026-05-05.md` is the source of truth for current line numbers, component structures, atmospheric treatments, reactive-store wiring, and the BB-43/`useBibleProgress`/`useActivityFeed`/`HighlightCard`/`HighlightCardMemorize` correctness gaps. Spec 8B is the **first sub-spec** of the Bible cluster — it establishes the patterns (BackgroundCanvas atmospheric layer, FrostedCard primitive adoption, subtle Button bg-primary CTA migration, anti-pressure logged-out posture, reactive-store correctness fixes) that Specs 8C (Plans) and 8A (Reader) will consume. Specs 6A/6B/6C/6D (Grow cluster) and Spec 7 (Auth surfaces) are prerequisites — verify all merged into the working branch at execution start.

This is a **large spec**. Scope combines (1) atmospheric layer migration on MyBiblePage (HorizonGlow → BackgroundCanvas), (2) auth gate removal with anti-pressure device-local-storage copy for logged-out users, (3) four `bg-primary` solid CTA → `<Button variant="subtle">` migrations (BookmarkLabelEditor Save, BibleSettingsModal Merge, MyBiblePage Clear filters, EmptySearchResults Clear search), (4) five reactive-store correctness bug fixes that ride along with the visual work because the visual polish would otherwise ship known-broken UI (BB-43 chapter-visit gap, `useBibleProgress` non-reactive snapshot, `useActivityFeed` missing `journalStore` subscription, `HighlightCard` brittle subscription, `HighlightCardMemorize.test.tsx` BB-45 anti-pattern), (5) FrostedCard primitive adoption on rolls-own chrome that exactly matches tier-1 defaults (MyBiblePage stat cards, MemorizationFlipCard front + back face), (6) MemorizationFlipCard `role="button"` on div → real `<button>` element a11y refactor, and (7) BookmarkCard "no label" placeholder de-italicization. Memorization scope folds in from what would have been Spec 8D. ~100 LOC of real bug fixes ride alongside the visual work; total diff including test updates ~50–80 class-string assertion changes plus the HighlightCardMemorize test rewrite.

Patterns this spec USES (already shipped via Specs 4A–7): `<BackgroundCanvas>` atmospheric layer (canonical on Dashboard, Local Support, Grow `/grow`, BibleLanding, PlanBrowserPage); `<FrostedCard variant="default">` and `<FrostedCard variant="subdued">` primitives (canonical Round 3 component pattern); `<Button variant="subtle">` (canonical for non-climactic CTAs across the app); `useSyncExternalStore` reactive store pattern (canonical via `useStreakStore`, `useMemorizationStore`, `usePrayerReactions`); `recordChapterVisit()` from `@/lib/heatmap` (already wired into the BB-43 heatmap rendering pipeline, just missing one caller); the Sign In CTA deep-link `/?auth=login` from Spec 7's `AuthQueryParamHandler`. Patterns this spec INTRODUCES for the Bible cluster: anti-pressure device-local-storage banner copy for logged-out users on a personal-data surface (parallel to the existing public Bible reader posture — "the unauthenticated experience must be complete" per BB-0–BB-46); reactive-store conversion of `useBibleProgress` from `useState(readProgress)` snapshot to canonical `useSyncExternalStore` pattern with cross-tab sync and a public `markChapterRead()` mutation API; BB-45 test pattern migration (real-store import + mutate-from-outside via `addCard`/`removeCard`, no `vi.mock('@/lib/memorize')`).

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/bible-2026-05-05.md`, `_plans/direction/bible-cluster-2026-05-05.md`) are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/bible/my` — primary surface. HorizonGlow → BackgroundCanvas atmospheric migration. Auth gate removed; logged-out users see their localStorage personal layer. New device-local-storage banner (FrostedCard subdued, dismissable, persists dismissal in `wr_mybible_device_storage_seen`, contains subtle Button Sign In CTA pointing at `/?auth=login`). Quick stats cards migrated from rolls-own chrome to `<FrostedCard variant="default">` primitive. Clear filters button migrated from `bg-primary` solid to `<Button variant="subtle">`. Hero spacing reconciled from Daily Hub `pt-36` pattern to BibleLanding `pt-28 pb-12` rhythm. The "Daily Hub pt-36 pattern" inline drift-confessing comment deleted.
- `/bible/:book/:chapter` — secondary surface, scope strictly bounded by Decision 13 (reader chrome stays unchanged per documented Layout Exception). Only the chapter-mount effect changes: adds `recordChapterVisit(book.slug, chapter)` call alongside the existing `wr_bible_progress` write, and refactors the direct `localStorage.setItem('wr_bible_progress', ...)` to call the new `markChapterRead(book.slug, chapter)` reactive-store mutation. No reader chrome, ReaderChrome, TypographySheet, VerseActionSheet, AmbientAudioPicker, sub-views, validation-error pages, or any other reader internals touched.
- All routes that render `<BookmarkLabelEditor>` — the bookmark label editor opens as a sub-view from BibleReader's verse-action sheet. Its Save button class string changes from `bg-primary` solid to `<Button variant="subtle">`. The component itself is consumed only from BibleReader, but the chrome change appears wherever BookmarkLabelEditor renders.
- All routes that render `<BibleSettingsModal>` — the settings modal opens from the user's avatar dropdown / settings entry on Bible surfaces. Its Merge button class string migrates the same way.
- All routes that render `<EmptySearchResults>` — used in the MyBibleSearchMode panel on `/bible/my` and (per pre-execution recon Step 4 verification) potentially on global Bible search surfaces. Its Clear search button migrates the same way; if the component is consumed outside `/bible/my`, the migration applies app-wide.

The single non-UI-route effect: `useBibleProgress` becomes a reactive store, so any mounted consumer of the hook (BibleProgressMap on `/bible/my`, BibleReader's progress writes, any other consumer) re-renders when chapters are read. This is a behavior change visible to the user as "BibleProgressMap and ReadingHeatmap update during a session when reading chapters" — not a new route.

---

## Overview

`/bible/my` is the personal-layer surface — where a reader's highlights, notes, bookmarks, memorization deck, reading heatmap, and 66-book progress map come together as one view of "what I've been doing in scripture." The recon found the page on the Daily Hub atmospheric layer (HorizonGlow + the inline `pt-36` confession comment), gated behind an auth wall that contradicted the Bible wave's BB-0–BB-46 "the unauthenticated experience must be complete" promise, with rolls-own card chrome that exactly matched FrostedCard tier-1 defaults but predated the primitive's existence, a `bg-primary` solid Clear filters CTA from before subtle Button became canonical, and — most importantly — five reactive-store correctness bugs that meant the page silently lied to the user. Adding a chapter to your reading history wouldn't update the progress map. Writing a Bible journal entry wouldn't appear in the activity feed. Adding a verse to the memorization deck wouldn't update the in-deck badge on its highlight card. Visiting a chapter wouldn't show up on the reading heatmap because the chapter-mount effect wrote `wr_bible_progress` but skipped `recordChapterVisit()`. The visual polish was load-bearing on these reactive-store paths working — shipping the BackgroundCanvas migration without the bug fixes would have produced a beautiful dead surface.

This spec migrates MyBiblePage onto `<BackgroundCanvas>` (the canonical atmospheric layer for outer Bible surfaces per Decision 1 — BibleLanding, BibleBrowse, MyBiblePage, PlanBrowserPage, BiblePlanDetail, BiblePlanDay all standardize on it; HorizonGlow stays scoped to Daily Hub). It removes the auth gate per Decision 2: logged-out users see their own localStorage personal layer just like they read the Bible, build memorization decks, take notes, and run AI Explain/Reflect without an account today. A small device-local-storage banner with anti-pressure copy ("Your data lives on this device. Sign in to keep it safe across devices.") replaces the previous "Get Started — It's Free" auth-wall CTA. The banner is dismissable, persists dismissal in `wr_mybible_device_storage_seen`, and contains a subtle Button Sign In CTA that uses the `/?auth=login` deep-link pattern Spec 7 wired up.

The four `bg-primary` solid CTAs across the Bible cluster's MyBible scope migrate to `<Button variant="subtle">` per Decision 16 — none are climactic moments warranting gradient. BookmarkLabelEditor's Save button and BibleSettingsModal's Merge button were deferred from Spec 6D and ship here. MyBiblePage's Clear filters and EmptySearchResults's Clear search buttons round out the set. MyBiblePage's quick stats cards and MemorizationFlipCard's front + back faces migrate from rolls-own chrome (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]`) to `<FrostedCard variant="default">` per Decision 18 — values exactly match tier-1 defaults; migration is mechanical. MemorizationFlipCard's `role="button"` on a `<div>` becomes a real `<button>` element per Decision 17, the same a11y deviation that Grow's PastChallengeCard carries (deferred there, fixed here because it's already in scope for the chrome migration). BookmarkCard's "no label" placeholder loses the italic per Decision 3 — not scripture, not callout, just a placeholder hint, shouldn't be italic.

The five correctness fixes ride along per Decision 6. **(1) BB-43 chapter-visit gap:** BibleReader's chapter-mount effect writes `wr_bible_progress` directly via `localStorage.setItem` but never calls `recordChapterVisit(bookSlug, chapter)` — meaning the BB-43 reading heatmap silently misses every chapter visit on the reader. One-line addition. **(2) `useBibleProgress` non-reactive:** the hook reads `wr_bible_progress` once on mount via `useState(readProgress)` and never resubscribes — meaning BibleProgressMap on MyBiblePage stays frozen even when the reader writes new chapters in the same session. Convert to canonical `useSyncExternalStore` reactive store with `subscribe()`, `getProgressSnapshot()`, `markChapterRead()` mutation API, and `storage`-event cross-tab sync matching `streakStore.ts`. ~30 LOC. **(3) `useActivityFeed` missing `journalStore` subscription:** the hook subscribes to highlight, bookmark, note, and streak stores but not journal — meaning Bible journal entries don't appear in the activity feed until a manual reload. One-line addition. **(4) `HighlightCard` brittle subscription:** the component calls `useMemorizationStore()` for side-effect-only subscription then reads `isCardForVerse(...)` synchronously — meaning if a future refactor removes the unused-result line, the subscription dies and the in-deck badge silently stops updating. Refactor to derive `inDeck` from the hook's return value. ~10 LOC. **(5) `HighlightCardMemorize.test.tsx` BB-45 anti-pattern:** the test mocks `@/lib/memorize` wholesale, bypassing the subscription mechanism entirely — exactly the BB-45 anti-pattern documented in `06-testing.md` § "Reactive Store Consumer Pattern" and `11b-local-storage-keys-bible.md` § "Reactive Store Consumption". Rewrite to use the real store, mutate from outside the component via `addCard`/`removeCard`, and assert re-render. ~50 LOC.

Behavioral preservation is non-negotiable on the reader side. Decision 13 (reader chrome stays unchanged per documented Layout Exception) bounds Spec 8B's reader scope to exactly two lines: the `recordChapterVisit()` call addition and the `localStorage.setItem('wr_bible_progress', ...)` → `markChapterRead(...)` refactor, both inside the existing chapter-mount effect. ReaderChrome, TypographySheet, VerseActionSheet, all reader sub-views, AmbientAudioPicker, FocusVignette, VerseJumpPill, VerseBookmarkMarker, VerseNoteMarker, ActivePlanReaderBanner, NotificationPrompt, HighlightColorPicker, and the three validation-error pages stay completely untouched (the validation-error pages migrate in Spec 8A). PlanCompletionCelebration (Decision 5) stays diverged from Grow's PlanCompletionOverlay — the contemplative tone of finishing a Bible reading plan is intentionally quieter than the achievement tone of finishing a Grow challenge. Memorization stays quiet (Decision 4) — no themeColor system, no flip sound, no celebration on add. The flip animation and sortable last-reviewed line are sufficient acknowledgment of activity. `bg-primary` decorative tints (search highlight, progress fills, activity-filter active state, MiniGrid filled cells) stay as-is per Decision 11 — those are functional/categorical signals, not CTAs, and migrating them would be aesthetic churn with no functional improvement and significant test churn. `duration-200` drift on canonical class strings stays as-is per Decision 12 — that's documentation drift in `09-design-system.md`, not code drift, and addressing it belongs in a documentation-only update.

After this spec ships, MyBiblePage is on the canonical Bible-cluster atmospheric layer, the auth gate is gone, the four `bg-primary` solid CTAs in MyBible scope are migrated, the rolls-own chrome on MyBiblePage stat cards and MemorizationFlipCard faces is replaced with the FrostedCard primitive, MemorizationFlipCard uses a real `<button>` element with proper keyboard activation, the BookmarkCard placeholder is no longer italic, the BB-43 heatmap actually records chapter visits from the reader, `useBibleProgress` is reactive across mounts and tabs, the activity feed includes journal entries, HighlightCard's in-deck badge updates correctly when memorization cards are added or removed, and the HighlightCardMemorize test verifies real reactive subscription behavior rather than mocking around it. Specs 8C and 8A inherit the established Bible-cluster conventions: BackgroundCanvas atmospheric, FrostedCard primitive adoption, subtle Button bg-primary migration, BB-45-conformant test patterns.

---

## User Story

As a **logged-out visitor on `/bible/my`**, I want to see my own personal layer — the highlights I've made, the notes I've written, the bookmarks I've saved, the memorization deck I've built, the reading heatmap of where I've been in scripture, the 66-book progress map of what I've covered — without being blocked by an auth wall, because I've been writing to those localStorage stores all along; the previous logged-out experience just hid the result behind a "Get Started — It's Free" CTA shell that contradicted the rest of the Bible wave's "the unauthenticated experience must be complete" promise. When I land on the page logged-out, I want a small soft note somewhere telling me my data lives on this device with a quiet Sign In link if I want to keep it across devices, but I do NOT want to be alarmed, urgented, or pressured. The note should feel like an aside, not a sales pitch. When I dismiss it, it should stay dismissed. When I sign in later, the note should be gone (or replaced by something acknowledging my account). I do NOT want a banner that interrupts my experience.

As a **logged-in user**, I want the page to feel like the same calm, atmospheric Bible surface as BibleLanding and PlanBrowserPage — the soft BackgroundCanvas glow as the page background rather than the harder Daily Hub HorizonGlow chrome that signals "you are in the Daily Hub" (which I am not), the quick stats cards using the canonical FrostedCard primitive that all the rest of the app's card chrome uses (so the visual rhythm holds across the app), and the Clear filters button as a quiet subtle pill rather than a `bg-primary` solid that visually shouts more than its actual importance (filtering is utility, not climax). When I add a verse to my memorization deck from a HighlightCard's in-deck button, I want the in-deck badge on that card to update immediately — not after a page reload. When I read a chapter in the BibleReader during this session, I want the BibleProgressMap on `/bible/my` to update when I navigate back. When I write a Bible journal entry, I want it to appear in the activity feed. When I open my memorization deck and flip a card, I want the chrome to feel like every other card on Worship Room (FrostedCard tier 1) and the keyboard activation to work like a real button does.

As **either logged-out or logged-in**, when I'm in the BibleReader and I navigate to a new chapter, I want my reading heatmap on `/bible/my` to register that visit — because I'm reading scripture, and the heatmap exists to reflect my reading life back to me as encouragement (not pressure). The fact that the previous implementation silently dropped reader chapter visits from the heatmap meant the heatmap looked sparser than my actual reading life — anti-encouragement, the opposite of what BB-43's anti-pressure design intended. When I open the bookmark label editor and save a label, the Save button should feel like the rest of the app's subtle action buttons. When I open the Bible settings modal and merge profiles, the Merge button should feel the same way. When I clear filters or clear a search, the buttons should match.

---

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. **Verify Specs 6A/6B/6C/6D are merged into the working branch.** Spec 6A landed (BackgroundCanvas on `/grow`, FrostedCard adoption across plan/challenge cards, Tonal Icon Pattern, FilterBar deletion, ConfirmDialog subtle Button). Spec 6B landed (BackgroundCanvas on `/reading-plans/:planId` and `/challenges/:challengeId`, Caveat removal on detail h1, hero subtitle treatment, FrostedCard subdued action callouts, not-found page subtle Buttons, ChallengeDetail redundant banner deletion). Spec 6C landed (CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas, two Caveat h1s → GRADIENT_TEXT_STYLE, cyan textarea glow → canonical violet, Step 1 Next subtle Button + Step 2 Generate gradient Button, three celebration overlay Caveat removals with themeColor preservation per the 6C refinement, DayCompletionCelebration Continue subtle Button, Button gradient variant primitive extension). Spec 6D landed (any final Grow polish patches deferred from 6A/6B/6C). Spec 7 landed (auth surface drift cleanup including the `AuthQueryParamHandler` and `/?auth=login` deep-link pattern that this spec consumes for the device-local-storage banner Sign In CTA). Re-confirm at execution start.

2. **Verify the direction doc** at `_plans/direction/bible-cluster-2026-05-05.md` is present and the locked decisions referenced throughout this spec match — particularly Decisions 1 (atmospheric layer standardization), 2 (auth gate removal), 3 (BookmarkCard placeholder de-italicize), 4 (memorization stays quiet — no themeColor / sound / celebration), 5 (PlanCompletionCelebration stays diverged from Grow), 6 (five reactive-store correctness fixes ride along), 11 (decorative `bg-primary/N` tints preserved), 12 (`duration-200` drift accepted), 13 (reader chrome unchanged), 14 (audio cluster out of scope), 16 (`bg-primary` solid CTA migrations — BookmarkLabelEditor/BibleSettingsModal/MyBiblePage/EmptySearchResults), 17 (MemorizationFlipCard `role="button"` → `<button>` a11y fix), 18 (FrostedCard migration on rolls-own chrome that exactly matches tier-1 defaults). If any decision in this spec disagrees with the direction doc, STOP and reconcile before writing code.

3. **Verify the recon doc** at `_plans/recon/bible-2026-05-05.md` is present. The recon is the source of truth for current line numbers, file structures, atmospheric treatments, reactive-store wiring, and class strings; all line-number references in this spec come from the recon and may have shifted by ±N lines if other commits have touched these files since the recon was written. Treat recon line numbers as approximate hints; use grep / structural anchors (function names, JSX attribute names, `const` names, import statements) to locate the exact migration target during execution.

4. **HorizonGlow component reference.** Read `frontend/src/pages/MyBiblePage.tsx` and confirm the current HorizonGlow import path and JSX usage. Capture the line numbers for the migration target (recon notes the inline drift-confessing comment is at line 218; the import and JSX usage will be earlier in the file). The migration replaces the HorizonGlow import + JSX wrapper with a BackgroundCanvas import + JSX wrapper, preserving everything inside.

5. **BackgroundCanvas import path.** Confirm `<BackgroundCanvas>` is importable from the same path used in BibleLanding and PlanBrowserPage. Capture the import statement for reuse. The expected path is `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` based on Round 3 / Bible cluster convention; verify during execution.

6. **Reactive store conversion pattern.** Read `frontend/src/lib/bible/streakStore.ts` (or whichever existing reactive store has the cleanest exports — `lib/memorize/store.ts` is also acceptable) to capture the canonical pattern: top-level cached snapshot variable, listener Set, `subscribe(listener)` function returning unsubscribe, `getSnapshot()` function, mutation functions that update cache + write to localStorage + notify listeners, and a hook that wraps `useSyncExternalStore` with `(subscribe, getSnapshot, getServerSnapshot)`. The `useBibleProgress` conversion in Change 5 follows this pattern exactly. Verify whether `streakStore.ts` implements `storage`-event cross-tab sync and capture that pattern too if it exists — Change 5c mirrors it.

7. **`useReactiveStorage` hook check.** Recon noted "There is no `useReactiveStorage` hook in the codebase." Confirm via grep. The Pattern A canonical hook for `useBibleProgress` conversion will be a custom `useBibleProgress` hook using `useSyncExternalStore` directly, matching `useStreakStore` and `useMemorizationStore` — NOT a generic `useReactiveStorage` wrapper. Hook standardization is a separate refactor spec, explicitly out of scope here per the direction doc.

8. **`recordChapterVisit` import path.** Confirm the export from `@/lib/heatmap/index.ts` (or `@/lib/heatmap/chapterVisitStore.ts`) and capture the function signature. Expected: `recordChapterVisit(bookSlug: string, chapterNumber: number)` per `11b-local-storage-keys-bible.md` § "Bible Reader" / `wr_chapters_visited` reactive store entry. If the signature differs (e.g., takes a single object argument, takes additional parameters), report findings before writing Change 4 and align to the actual signature.

9. **HighlightCardMemorize test current shape.** Read `frontend/src/components/bible/my-bible/__tests__/HighlightCardMemorize.test.tsx` to capture the current mocking pattern before rewriting (Change 8). The recon described it as wholesale-mocking `@/lib/memorize` via `vi.mock('@/lib/memorize')`. Compare to `06-testing.md` § "Reactive Store Consumer Pattern" for the target pattern: real-store import, mutate from outside via the store's exposed `addCard`/`removeCard` APIs, assert the component re-renders. The behavioral assertions in the existing tests (e.g., "renders in-deck badge when card is in deck", "doesn't render badge when card is not in deck", "calls correct mutation on click") should not change — only the mocking pattern.

10. **EmptySearchResults consumer audit.** Grep for imports of `EmptySearchResults` to confirm whether it's consumed only on `/bible/my` (MyBibleSearchMode panel) or elsewhere (global Bible search). Change 3d's blast radius depends on this — if it's used on global Bible search too, the migration applies app-wide; if only on `/bible/my`, the diff is scoped to one consumer surface.

11. **`loadAllActivity()` audit (Change 6 prerequisite).** Read `frontend/src/lib/bible/activityLoader.ts` and verify `loadAllActivity()` already includes Bible journal entries in the unified activity feed. If yes, Change 6 is the missing one-line `subscribeJournal(reload)` subscription only. If `loadAllActivity()` doesn't load journal entries either, that's a separate (larger) bug — report findings BEFORE fixing and treat the loader change as a scope expansion that needs explicit confirmation.

12. **MyBiblePage tests inventory.** Read the exports of `frontend/src/pages/__tests__/MyBiblePage.test.tsx` and `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx` to identify which tests assert on the logged-out auth-gate flow. Those tests get rewritten in Change 2d to assert the new logged-out experience (personal layer renders + device-local-storage banner visible). Existing tests on the logged-in experience should pass without modification.

13. **localStorage key naming convention.** Verify against `11-local-storage-keys.md` whether `wr_mybible_device_storage_seen` matches the canonical `wr_*` snake_case naming convention. The expected shape is `wr_<feature>_<state>` (e.g., `wr_install_dismissed`, `wr_welcome_back_shown`, `wr_evening_reflection`). `wr_mybible_device_storage_seen` follows the convention. Document the new key in `11-local-storage-keys.md` as part of the spec execution per Definition of Done in `06-testing.md`.

If any pre-execution finding diverges from spec assumptions, CC reports findings BEFORE writing changes and waits for direction.

#### Change set

The 11 changes below are the locked migration set for Spec 8B. Order suggested: smallest blast radius first (Change 11 placeholder de-italicize), then targeted CTA migrations (Changes 3a–3d), then atmospheric + auth + banner on MyBiblePage (Changes 1, 2, 3c, 10), then reactive-store fixes (Changes 4, 5, 6, 7), then memorization chrome + a11y (Change 9), then test rewrite (Change 8). CC may reorder for execution efficiency but every change must land.

14. **Change 1 — MyBiblePage atmospheric layer migration.** Modify `frontend/src/pages/MyBiblePage.tsx`. Sub-changes 1a–1c.

15. **Change 1a — Replace HorizonGlow with BackgroundCanvas.** Locate the HorizonGlow import (likely `import { HorizonGlow } from '@/components/daily-hub/HorizonGlow'`) and the JSX usage. Replace with `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` and a `<BackgroundCanvas className="flex flex-col font-sans">` wrapping the existing page structure. Preserve the inner page structure (Navbar, SEO, main, SiteFooter, all child sections) unchanged. Only the atmospheric wrapper changes. Match BibleLanding's wrapping pattern exactly.

16. **Change 1b — Remove the "Daily Hub pt-36 pattern" inline comment.** Recon noted line 218 has a comment confessing the drift: `// Hero section — Daily Hub pt-36 pattern, no ATMOSPHERIC_HERO_BG` (or similar wording). Delete the comment when the migration lands. The comment was load-bearing as a TODO marker; once the migration completes, it's stale.

17. **Change 1c — Verify hero spacing matches BibleLanding pattern.** BibleLanding uses `pt-28 pb-12` on its hero zone. MyBiblePage's hero zone may currently use Daily Hub's `pt-36` spacing (per recon and the inline drift-confessing comment). After the BackgroundCanvas migration, verify the hero spacing visually matches BibleLanding's rhythm. Adjust the hero zone classes from `pt-36` (or whatever the current value is) to `pt-28 pb-12` if needed. Eyeball at runtime and confirm the visual rhythm matches BibleLanding within ±2px.

18. **Change 2 — Remove MyBiblePage auth gate.** Modify `frontend/src/pages/MyBiblePage.tsx`. Sub-changes 2a–2d.

19. **Change 2a — Remove the auth-gate branch.** Recon described MyBiblePageInner as having two paths: a `MyBiblePageInner` shell (auth gate / sign-in CTA) for logged-out users and a `MyBibleAuthenticatedInner` for logged-in users. Consolidate to a single rendering path that works for both auth states. Remove the `useAuth().isAuthenticated` branch that gates the content. The personal layer (highlights, notes, bookmarks, memorization, heatmap, progress map) reads from localStorage already; both logged-out and logged-in users have been writing to those stores all along. Now they can see the result.

20. **Change 2b — Remove the "Get Started — It's Free" CTA shell.** The existing logged-out CTA (per recon: "the homepage primary white-pill CTA `'Get Started — It's Free'`") that previously rendered for unauthenticated users disappears entirely. Delete the JSX block that rendered it.

21. **Change 2c — Add device-local-storage copy for logged-out users.** Add a small banner conditionally rendered when `!isAuthenticated`. Implementation: `<FrostedCard variant="subdued">` containing soft, anti-pressure copy and a Sign In CTA. Suggested copy: "Your data lives on this device. Sign in to keep it safe across devices." (Variation acceptable so long as the tone is anti-pressure, the message is accurate per `02-security.md` § "Demo Mode (Logged-Out Experience) Data Policy" which confirms localStorage is allowed for logged-out users with no backend writes, and the urgency is zero.) Placement: CC picks the placement that feels least intrusive — the two acceptable options are (A) near the top of the page, after the hero, before the activity feed, OR (B) near the bottom of the page, after the heatmap, before the footer. CC's judgment call. The banner must:

    - Be dismissable via a small X button (top-right of the FrostedCard) or a "Got it" link
    - Persist dismissal in `wr_mybible_device_storage_seen` (canonical `wr_*` snake_case naming; document the new key in `11-local-storage-keys.md` per Definition of Done)
    - Read the dismissal state on mount; if dismissed, do not render
    - Contain a Sign In CTA as a secondary action — `<Button variant="subtle">` with `to="/?auth=login"` (the deep-link pattern Spec 7's `AuthQueryParamHandler` consumes; opens AuthModal in login view on the homepage)
    - NOT be alarming, urgent, or pressure-inducing in tone

    Alternative if the banner pattern feels too heavy: a single small line of copy in the page hero subtitle that mentions the device-local storage without being a dismissable banner. CC's call. If CC picks the alternative, the `wr_mybible_device_storage_seen` key is not needed and the change scope shrinks accordingly.

22. **Change 2d — Tests update.** `pages/__tests__/MyBiblePage.test.tsx` and `pages/__tests__/MyBiblePageHeatmap.test.tsx` likely have tests covering the logged-out auth-gate flow. Update those tests:

    - Logged-out users now see the personal layer (no sign-in CTA shell) — assertions on the auth-wall content get rewritten to assertions on the personal-layer content
    - Logged-out users see the device-local-storage banner (or whatever pattern CC picks); add an assertion on banner presence and dismissal behavior
    - The previously-asserted "logged-out shows sign-in CTA" tests get rewritten to assert the new logged-out experience

    Tests on the logged-in experience should pass without modification since the rendering path was always `MyBibleAuthenticatedInner` for logged-in users; merging the two paths means the logged-in experience doesn't change.

23. **Change 3 — `bg-primary` CTA migrations.** Four targeted button migrations. Sub-changes 3a–3d.

24. **Change 3a — BookmarkLabelEditor Save button.** Modify `frontend/src/components/bible/reader/BookmarkLabelEditor.tsx` line 151 (per recon). Migrate the Save button from `bg-primary` solid (likely `bg-primary text-white hover:bg-primary-lt` or similar) to `<Button variant="subtle">`. Preserve onClick handler, disabled state logic, ARIA wiring, label/aria-label attributes, and form-submit behavior. Update `frontend/src/components/bible/reader/__tests__/BookmarkLabelEditor.test.tsx` (~160 LOC per recon) — replace any class-string assertions on `bg-primary` with assertions on the subtle Button chrome (the Button primitive's class signature is well-known; CC matches the existing test pattern from other subtle Button assertions across the codebase).

25. **Change 3b — BibleSettingsModal Merge button.** Modify `frontend/src/components/bible/BibleSettingsModal.tsx` line 292 (per recon). Migrate the Merge button from `bg-primary` solid to `<Button variant="subtle">`. Preserve all merge logic, confirmation flow, and the modal's close-on-success behavior. Update `frontend/src/components/bible/__tests__/BibleSettingsModal.test.tsx` (~378 LOC per recon) — same assertion update pattern as Change 3a.

26. **Change 3c — MyBiblePage Clear filters button.** Modify `frontend/src/pages/MyBiblePage.tsx` line 352 (per recon). Migrate the Clear filters button from `bg-primary` solid to `<Button variant="subtle">`. Preserve the clear-filters logic that resets the activity-filter selection state.

27. **Change 3d — EmptySearchResults Clear search button.** Modify `frontend/src/components/bible/EmptySearchResults.tsx` line 21 (per recon). Migrate the Clear search button from `bg-primary` solid to `<Button variant="subtle">`. Preserve the onClick handler. Per pre-execution recon Step 10, if `EmptySearchResults` is consumed outside `/bible/my` (e.g., on global Bible search), the migration applies app-wide.

28. **Change 4 — BB-43 chapter-visit gap fix.** Modify `frontend/src/pages/BibleReader.tsx` chapter-mount effect. This is bounded by Decision 13 — only the chapter-mount effect changes; no other reader logic is touched. Sub-changes 4a.

29. **Change 4a — Add `recordChapterVisit()` call.** Recon noted the chapter-mount effect already writes `wr_bible_progress` via direct `localStorage.setItem` in the line 594-600 area. Add a sibling line calling `recordChapterVisit(book.slug, chapter)` from `@/lib/heatmap`. Also add the import: `import { recordChapterVisit } from '@/lib/heatmap'` (or whichever import path pre-execution recon Step 8 confirms). Effect shape after the change:

    ```tsx
    useEffect(() => {
      if (!book || !chapter || isLoading || loadError) return
      // Existing wr_bible_progress write — refactored in Change 5b
      markChapterRead(book.slug, chapter)
      // NEW — Decision 6.1
      recordChapterVisit(book.slug, chapter)
      // ...other existing logic preserved
    }, [book, chapter, isLoading, loadError])
    ```

    The `markChapterRead` call replaces the direct `localStorage.setItem` per Change 5b; the `recordChapterVisit` call is new. Both land in the same effect for atomicity. Add tests in `pages/__tests__/BibleReader.test.tsx`:

    - On chapter mount, `recordChapterVisit` is called with the correct book slug and chapter number
    - On chapter change (book or chapter dependency change), `recordChapterVisit` is called again with the new values
    - On `isLoading` or `loadError`, `recordChapterVisit` is NOT called

30. **Change 5 — `useBibleProgress` reactive store conversion.** Modify `frontend/src/hooks/bible/useBibleProgress.ts` and consumers. Sub-changes 5a–5d.

31. **Change 5a — Convert to reactive store pattern.** Currently the hook uses `useState(readProgress)` at line 41 (per recon) — a one-time snapshot on mount. Convert to the canonical reactive store pattern matching `streakStore.ts`. Read the existing hook in full before refactoring to capture all returned methods/values; the refactor must preserve the hook's external contract exactly. Reference shape:

    ```tsx
    import { useSyncExternalStore } from 'react'

    const PROGRESS_KEY = 'wr_bible_progress'

    let cachedProgress: BibleProgress | null = null
    const listeners = new Set<() => void>()

    function readProgress(): BibleProgress {
      if (cachedProgress !== null) return cachedProgress
      const raw = localStorage.getItem(PROGRESS_KEY)
      cachedProgress = raw ? JSON.parse(raw) : { /* canonical default — match existing readProgress() */ }
      return cachedProgress
    }

    function notifyListeners() {
      listeners.forEach((l) => l())
    }

    export function subscribeProgress(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    }

    export function getProgressSnapshot(): BibleProgress {
      return readProgress()
    }

    export function markChapterRead(bookSlug: string, chapter: number): void {
      const current = readProgress()
      // mutation logic — preserve exactly what the existing hook's mutation path does
      const updatedProgress = { ...current, /* updated fields */ }
      cachedProgress = updatedProgress
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(updatedProgress))
      notifyListeners()
    }

    export function useBibleProgress() {
      const progress = useSyncExternalStore(
        subscribeProgress,
        getProgressSnapshot,
        getProgressSnapshot, // SSR/hydration fallback
      )
      return { progress, markChapterRead /* + any other methods the existing hook returns */ }
    }
    ```

    The exact API surface (return shape, method names) MUST match the current hook's contract — existing consumers (BibleProgressMap, BibleReader, any other hook consumer) should not need to change call sites. If the existing hook returns additional helpers (e.g., `getBookProgress`, `getOverallProgress`, `clearProgress`), preserve them as exports of the new module and surface them through the hook's return value the same way.

32. **Change 5b — Update BibleReader to use `markChapterRead`.** BibleReader currently calls `localStorage.setItem('wr_bible_progress', ...)` directly in the chapter-mount effect (per recon, line 594-600 area). Refactor to call `markChapterRead(book.slug, chapter)` from the hook — either by importing the function directly (`import { markChapterRead } from '@/hooks/bible/useBibleProgress'`) or by destructuring it from the hook's return value if it's already mounted. Both behaviors land in the same effect (chapter-mount) alongside the new `recordChapterVisit()` call from Change 4a. The direct `localStorage.setItem` line disappears.

33. **Change 5c — Cross-tab sync.** The reactive store should listen for `storage` events to handle cross-tab updates — when the user has Worship Room open in two tabs and reads a chapter in tab A, tab B's MyBiblePage should reflect the update. Match the pattern from `streakStore.ts` if it implements cross-tab sync. Reference shape (top-level, outside React lifecycle):

    ```tsx
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === PROGRESS_KEY) {
          cachedProgress = null // force re-read on next getProgressSnapshot
          notifyListeners()
        }
      })
    }
    ```

    If `streakStore.ts` uses a different pattern (e.g., a deferred initializer, a typeof check inside a function), match that pattern instead — consistency with existing reactive stores wins over minor stylistic preference.

34. **Change 5d — Tests added.** Add tests in `frontend/src/hooks/bible/__tests__/useBibleProgress.test.tsx`:

    - `useBibleProgress` returns reactive snapshot that updates when `markChapterRead` is called from outside the component
    - Cross-component subscriptions update when one component calls `markChapterRead`
    - The hook's return shape exactly matches the previous contract (regression guard against silent API breakage)

    Also add test cases in `frontend/src/pages/__tests__/MyBiblePageHeatmap.test.tsx`:

    - BibleProgressMap on MyBiblePage updates when `markChapterRead` is called in the same render tree (simulating a BibleReader read in the same session)
    - `useMemo([progress], getBibleCoverage)` (or whatever the actual derived computation is) on MyBiblePage updates reactively when progress changes — verify the consequential downstream effect

35. **Change 6 — `useActivityFeed` `journalStore` subscription.** Modify `frontend/src/hooks/bible/useActivityFeed.ts` lines 60-69 (per recon). Sub-changes 6a–6b.

36. **Change 6a — Add `subscribeJournal` to the subscription list.** Add `journalStore` subscription alongside the existing highlight/bookmark/note/streak subscriptions:

    ```tsx
    import { subscribe as subscribeJournal } from '@/lib/bible/journalStore'

    useEffect(() => {
      const unsubscribers = [
        subscribeHighlights(reload),
        subscribeBookmarks(reload),
        subscribeNotes(reload),
        subscribeStreak(reload),
        subscribeJournal(reload), // NEW — Decision 6.3
      ]
      return () => { unsubscribers.forEach((u) => u()) }
    }, [reload])
    ```

    Per pre-execution recon Step 11, verify `loadAllActivity()` in `lib/bible/activityLoader.ts` already includes journal entries in the unified activity feed. If yes, Change 6 is the missing one-line subscription only. If `loadAllActivity()` doesn't load journal entries either, that's a separate (larger) bug — report findings BEFORE fixing and treat the loader change as a scope expansion that needs explicit confirmation.

37. **Change 6b — Tests added.** Add a test in `frontend/src/hooks/bible/__tests__/useActivityFeed.test.tsx`:

    - After adding a Bible journal entry via `journalStore.addEntry()` (real-store mutation, no mocks), the activity feed reactively updates without a full page reload — assert via the same mutate-from-outside pattern that Change 8 uses for HighlightCardMemorize

38. **Change 7 — `HighlightCard` brittle subscription refactor.** Modify `frontend/src/components/bible/my-bible/HighlightCard.tsx` line 30 area (per recon). Currently the card calls `useMemorizationStore()` for side-effect-only subscription, then reads `isCardForVerse(...)` synchronously. This is brittle — if a future refactor removes the unused-result line (because it looks like dead code to lint or to a developer reading the file), the subscription dies and the in-deck badge silently stops updating.

    Refactor to derive `inDeck` from the hook's return value:

    ```tsx
    // Before
    useMemorizationStore() // side-effect subscribe
    const inDeck = isCardForVerse(verseRef)

    // After
    const cards = useMemorizationStore()
    const inDeck = cards.some((c) => isCardForVerse(verseRef, c))
    ```

    Adjust to match the actual hook's return shape — read the hook before refactoring to capture the canonical return type. The behavior is equivalent; the new pattern is robust to refactors that might remove the unused-result line, AND it makes the data dependency explicit (which is what the BB-45 anti-pattern documentation in `11b-local-storage-keys-bible.md` explicitly recommends).

    Update tests in `frontend/src/components/bible/my-bible/__tests__/HighlightCard.test.tsx` if any assertions on the in-deck badge currently rely on the side-effect subscription pattern — they should pass without modification under the new pattern, but verify.

39. **Change 8 — `HighlightCardMemorize.test.tsx` BB-45 test rewrite.** Modify `frontend/src/components/bible/my-bible/__tests__/HighlightCardMemorize.test.tsx`. Currently mocks the entire `@/lib/memorize` module via `vi.mock('@/lib/memorize', () => ({ ... }))`. Per `06-testing.md` § "Reactive Store Consumer Pattern", the canonical test pattern for reactive store consumers is:

    1. Use the REAL store (no `vi.mock('@/lib/memorize')`) — let the actual `useMemorizationStore()` hook run
    2. Mutate the store from outside the component using exposed APIs (`addCard`, `removeCard`)
    3. Assert the component re-renders correctly via `findByText` / `findByRole` (the `find*` family waits for the next render cycle, which matches the subscription-driven re-render timing)

    Rewrite the test file to follow this pattern. Approximately 50 LOC of changes. The tests' behavioral assertions should not change — only the mocking pattern. Concretely:

    - Delete the `vi.mock('@/lib/memorize', ...)` block
    - Import `addCard`, `removeCard` (or the canonical mutation APIs) directly from `@/lib/memorize`
    - In each test, use `act(() => { addCard(mockCard) })` or `act(() => { removeCard(mockCard.id) })` to mutate the store
    - Use `findByText` / `findByRole` for re-render assertions; use `queryByText` / `queryByRole` only for absence assertions
    - Use `beforeEach` to reset the store to a clean state (read the store's existing reset pattern; if it doesn't expose one, clear localStorage and reset the cached snapshot via the store's exposed reset hook or by directly clearing the key)

    This change is the canonical example of the BB-45 test pattern migration that subsequent specs and the wider codebase will follow when other reactive-store-consumer tests get audited.

40. **Change 9 — MemorizationFlipCard chrome migration + a11y fix.** Modify `frontend/src/components/memorize/MemorizationFlipCard.tsx`. Sub-changes 9a–9d.

41. **Change 9a — Front face rolls-own chrome → FrostedCard.** Currently lines 83 area (per recon): `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]`. Migrate to `<FrostedCard variant="default">` (or `<FrostedCard>` if `variant="default"` is the explicit default — verify against the FrostedCard primitive's API). Values exactly match tier-1 defaults per Decision 18; migration is mechanical. Preserve the front face's content and semantics.

42. **Change 9b — Back face same migration.** Lines 104 area (per recon). Same migration as Change 9a. Verify the back face's font-serif treatment (canonical per Decision 3 — NOT italic, just serif) is preserved exactly.

43. **Change 9c — `role="button"` on div a11y fix.** Currently the card uses `role="button"` on a `<div>`. Replace with a real `<button>` element where keyboard activation is intended. This matches the same fix that Grow's PastChallengeCard would receive (deferred there to a separate spec; we're fixing it here because it's already in scope for the chrome migration). Preserve:

    - The 3D flip animation (CSS `transform: rotateY(...)` with `transformStyle: preserve-3d`)
    - All keyboard handlers (Enter and Space activate the flip; Escape may or may not be wired — preserve whatever is there)
    - All touch handlers (tap to flip)
    - All ARIA attributes (`aria-pressed` for flip state if currently wired; `aria-label` for the card's purpose)
    - The card's containing `<FrostedCard>` (the flip-card root may need to remain a wrapper element, with the `<button>` as an inner interactive element — CC's structural call so long as the semantic is "this card is interactive via button")

    A common pattern: outer `<FrostedCard>` (or `<div>` if FrostedCard already renders a `<div>`) for layout + 3D context, inner `<button type="button">` for the interactive flip surface. Adjust to whatever works with the existing 3D transform setup.

44. **Change 9d — Tests update.** `frontend/src/components/memorize/__tests__/MemorizationFlipCard.test.tsx` likely has class-string assertions on the rolls-own chrome AND tests on the `role="button"` interaction. Update both:

    - Class assertions move from rolls-own classes (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]`) to FrostedCard tier-1 defaults — either match the FrostedCard primitive's class signature OR use `data-testid` and check the wrapping element's structure rather than its classes
    - Role assertions update from `role="button"` on div to `<button>` element — `getByRole('button')` should still resolve, but the underlying element type changes from `<div>` to `<button>`
    - Keyboard activation tests should pass without modification (Enter/Space on a real `<button>` activates onClick natively, same behavior as the previous div+keydown handler)

45. **Change 10 — MyBiblePage stat cards rolls-own chrome migration.** Modify `frontend/src/pages/MyBiblePage.tsx` line 277 area (per recon). Currently the quick-stats cards use rolls-own chrome: `border-white/[0.12] bg-white/[0.06] backdrop-blur-sm`. Migrate to `<FrostedCard variant="default">`. Same pattern as Change 9 — values exactly match tier-1 defaults per Decision 18. Preserve the cards' inner content, layout, and any per-card data bindings exactly.

46. **Change 11 — BookmarkCard placeholder de-italicize.** Modify `frontend/src/components/bible/my-bible/BookmarkCard.tsx` line 21 (per recon). Currently: `text-sm italic text-white/50` for the "no label" placeholder. Migrate to: `text-sm text-white/40`. Drop italic. Reduce opacity slightly (0.5 → 0.4) to maintain visual de-emphasis without using italic. Rationale per Decision 3: not scripture, not callout — a placeholder hint shouldn't use italic per the design system's italic-on-prose-body deprecation.

### Non-Functional Requirements

- **Performance.** No measurable performance regression on `/bible/my`. The reactive-store conversion of `useBibleProgress` adds one `useSyncExternalStore` call per consumer, which is well within React's hot-path budget. The cross-tab `storage` listener fires only on cross-tab writes and does negligible work (clears cached snapshot, calls listeners). The `recordChapterVisit()` call on chapter mount writes to the existing `wr_chapters_visited` reactive store, which is already on the BB-43 hot path; the addition is a no-op cost on top of work that was always happening. Total client-side cost: < 1ms additional per chapter mount, < 1ms additional per `useBibleProgress` consumer mount.
- **Accessibility (WCAG 2.2 AA target).** `MemorizationFlipCard`'s `role="button"` on `<div>` → real `<button>` element fix is a direct AA improvement (semantic HTML, native keyboard activation, screen reader announces "button" with proper state). The device-local-storage banner's dismiss button must have an `aria-label` ("Dismiss device-local-storage notice" or similar). The Sign In CTA in the banner inherits `<Button variant="subtle">`'s ARIA wiring (already canonical). The new `<FrostedCard>` migrations preserve existing semantic structure — FrostedCard renders a `<div>` (or `<section>` if explicitly typed), so wrapping headings and lists preserves their semantics. No skip-link changes (BibleReader has its own root-level skip link; MyBiblePage uses Navbar's skip link).
- **Reactive store discipline.** Every component that reads from a reactive store (BibleProgressMap, ReadingHeatmap, MemorizationDeck, HighlightCard, ActivityFeed, all the new and existing consumers) MUST subscribe via the canonical pattern (Pattern A standalone hook OR Pattern B inline `subscribe()`). Spec 8B's reactive-store changes preserve this — Change 5 establishes Pattern A for `useBibleProgress`, Change 6 confirms Pattern B for `useActivityFeed`, Change 7 cleans up `HighlightCard`'s brittle Pattern A consumption, Change 8 verifies the test pattern matches BB-45. No new BB-45 anti-patterns introduced.
- **localStorage discipline.** One new key introduced: `wr_mybible_device_storage_seen` (canonical `wr_*` snake_case naming). Document in `11-local-storage-keys.md` per `06-testing.md` § Definition of Done. Existing keys touched by behavior change: `wr_bible_progress` (now mediated through `markChapterRead` instead of direct `localStorage.setItem`; same key, same shape, same write semantics — only the call site changes), `wr_chapters_visited` (now written by BibleReader's chapter-mount effect via `recordChapterVisit`; existing key, existing shape, existing write semantics — only the caller is added). No key shape changes, no migrations needed, no breaking changes for existing data.
- **Anti-pressure voice.** The device-local-storage banner copy must follow the anti-pressure voice rule from CLAUDE.md / `06-testing.md` Definition of Done. No "your data is at risk" language. No "you'll lose everything" language. No urgency cues (no "soon", "before too long", "don't wait"). The tone is matter-of-fact and informational: "Your data lives on this device. Sign in to keep it safe across devices." The Sign In CTA is a quiet subtle Button, not a climactic primary CTA.

---

## Auth Gating

Spec 8B explicitly REMOVES auth gates on `/bible/my`. The previous behavior (auth wall blocking content for logged-out users, "Get Started — It's Free" CTA shell) is deleted per Decision 2. Logged-out users see the same personal layer as logged-in users — they have been writing to the underlying localStorage stores all along, just couldn't see the result.

The only NEW auth-related interaction is the device-local-storage banner's Sign In CTA, which uses the existing `/?auth=login` deep-link pattern wired in Spec 7. No new auth modal triggers are introduced; no existing auth modal triggers across the app are touched.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|---------------------|---------------------|
| Land on `/bible/my` | Personal layer renders from localStorage. Device-local-storage banner visible (until dismissed). | Personal layer renders from localStorage. Banner hidden. | N/A — no auth gate. |
| Dismiss device-local-storage banner | Sets `wr_mybible_device_storage_seen=true`. Banner hidden for subsequent visits. | N/A — banner not shown. | N/A — no auth gate. |
| Click "Sign In" in device-local-storage banner | Navigates to `/?auth=login`. Spec 7's `AuthQueryParamHandler` opens AuthModal in login view on the homepage. | N/A — banner not shown. | "Welcome back" (existing AuthModal login subtitle from Spec 7). |
| Add a highlight, note, bookmark, journal entry, memorization card | Writes to localStorage. Visible immediately in `/bible/my`. | Writes to localStorage. Visible immediately in `/bible/my`. Phase 3 will add optional sync. | N/A — no auth gate. Bible wave promise per BB-0–BB-46. |
| Read a chapter in BibleReader (during the same session) | `recordChapterVisit()` writes to `wr_chapters_visited`; `markChapterRead()` updates `wr_bible_progress`. ReadingHeatmap and BibleProgressMap on `/bible/my` reactively update. | Same. | N/A — Bible reader is publicly accessible. |
| Open BookmarkLabelEditor and click Save | Saves bookmark label to localStorage. Subtle Button chrome. | Same. | N/A — no auth gate. |
| Open BibleSettingsModal and click Merge | Merges Bible profiles (existing logic preserved). Subtle Button chrome. | Same. | N/A — no auth gate. |
| Click Clear filters on `/bible/my` | Resets activity-filter selection state. Subtle Button chrome. | Same. | N/A — no auth gate. |
| Click Clear search on EmptySearchResults | Resets search input state. Subtle Button chrome. | Same. | N/A — no auth gate. |

No existing auth gates across the app are modified. The 60+ AuthModal trigger sites that Spec 7 enumerated stay wired exactly as they are.

---

## Responsive Behavior

The atmospheric layer migration (Change 1) and FrostedCard chrome migrations (Changes 9, 10) preserve responsive behavior — `<BackgroundCanvas>` and `<FrostedCard>` are responsive primitives that adapt to any container width. The CTA migrations (Changes 3a–3d) preserve responsive button sizing — `<Button variant="subtle">` is the same primitive used across the app and inherits canonical Tailwind responsive classes.

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 640px) | MyBiblePage hero stacks vertically. Quick stats cards stack into a single column (existing responsive behavior preserved through the FrostedCard migration). Device-local-storage banner spans full width with 16px (`px-4`) horizontal padding. Banner copy may wrap to 2 lines; Sign In CTA stacks below copy if width is constrained. Memorization deck cards stack vertically (existing behavior preserved). 44×44 minimum tap targets on MemorizationFlipCard's `<button>` element (a11y win from Change 9c — the previous `role="button"` div may not have enforced this). Activity feed renders 1 column (existing behavior). |
| Tablet (640–1024px) | Hero remains balanced layout (existing behavior preserved). Quick stats cards render 2-column grid (existing behavior). Device-local-storage banner sits at the placement CC chooses (top or bottom of personal layer); copy renders inline with Sign In CTA on the right. Memorization deck cards render 2 per row (existing behavior). Activity feed remains single-column. |
| Desktop (> 1024px) | Full hero layout. Quick stats cards render 4-column grid (or whatever the existing layout is — preserved). Device-local-storage banner renders centered with max-width (matching FrostedCard subdued's standard width treatment) and Sign In CTA on the right. Memorization deck cards render 3-4 per row depending on container width (existing behavior). Activity feed sits beside or below the heatmap depending on existing desktop layout. |

Responsive notes:

- The atmospheric layer migration (HorizonGlow → BackgroundCanvas) does not change layout — both wrap the page; only the visual treatment differs.
- The FrostedCard migrations (Changes 9, 10) inherit the primitive's responsive behavior; rolls-own chrome had hardcoded responsive behavior that exactly matched.
- The device-local-storage banner adopts FrostedCard subdued's standard responsive width and padding.
- MemorizationFlipCard's button element fix (Change 9c) ensures 44×44 touch targets per CLAUDE.md / accessibility working guidelines — the previous div+role might have rendered smaller than 44px in some layouts.
- The page-wide `pt-28 pb-12` hero spacing reconciliation (Change 1c) brings MyBiblePage in line with BibleLanding's mobile/tablet/desktop spacing rhythm; previously `pt-36` (Daily Hub spacing) created excess top padding on mobile that pushed the hero below the fold.

---

## AI Safety Considerations

**N/A — This spec does not involve AI-generated content or free-text user input.** The personal layer surfaces existing user data (highlights, notes, bookmarks, memorization, journal entries) but does not generate any new AI content or accept new free-text input as part of Spec 8B's scope. AI Explain (BB-30), AI Reflect (BB-31), and AI Bible Chat (`/ask`) are governed by separate specs and prompt-test recons; this spec does not touch their entry points or surface chrome.

The reactive-store correctness fixes (Changes 4–8) operate on user-generated data that is already plain text (per `02-security.md` § "Bible notes (BB-8) and Bible journal entries (BB-11b)"); no rendering changes are introduced that could unsafely render HTML/Markdown. The BB-43 chapter-visit recording stores a book slug + chapter number — pure structured data, no free-text.

The device-local-storage banner copy is a static, pre-written string with no user data interpolation. It does not require crisis-keyword detection or content moderation.

---

## Auth & Persistence

- **Logged-out users (demo mode):** The personal layer reads from existing localStorage stores (`wr_bible_progress`, `wr_bible_highlights`, `bible:notes`, `bible:bookmarks`, `bible:journalEntries`, `wr_memorization_cards`, `wr_chapters_visited`, `bible:streak`, `wr_bible_active_plans`). All writes stay client-side per `02-security.md` § "Bible Wave Auth Posture (BB-0 through BB-46)" — zero backend writes. The new `wr_mybible_device_storage_seen` key (banner dismissal flag) follows the same client-side discipline. No new backend writes are introduced. No cookies, no anonymous IDs, no IP persistence.
- **Logged-in users:** Same client-side reads and writes as logged-out users. Phase 3 will introduce optional sync for users who DO have accounts so that personal history can be preserved across devices, but Spec 8B does not introduce any sync — the unauthenticated experience must be complete per the master plan, and the authenticated experience for `/bible/my` is identical to the unauthenticated experience until Phase 3's optional-sync spec lands.
- **Route type:** Public (Decision 2 removes the auth gate). Both `/bible/my` and `/bible/:book/:chapter` are public; both write to localStorage; neither writes to the backend.
- **localStorage usage:** One new key (`wr_mybible_device_storage_seen`, type `"true"`/null, banner dismissal flag); existing keys touched by behavior change (`wr_bible_progress` now mediated through `markChapterRead` reactive store; `wr_chapters_visited` now written by BibleReader's chapter-mount effect via `recordChapterVisit`). Document the new key in `11-local-storage-keys.md` per Definition of Done. No key shape changes; no data migrations needed.

---

## Completion & Navigation

**N/A — `/bible/my` is not part of the Daily Hub tabbed experience.** The page is a standalone Bible-cluster surface. No completion signaling to the Daily Hub tracking system. No post-completion CTAs. No context passing to/from other tabs.

The device-local-storage banner's Sign In CTA navigates to `/?auth=login` (Spec 7's deep-link pattern), which opens AuthModal in login view on the homepage. After successful login, the user lands on the homepage; navigating back to `/bible/my` will show the page without the banner (because `isAuthenticated` is now true) regardless of `wr_mybible_device_storage_seen` state. The existing flow of "user clicks back, returns to /bible/my" is preserved naturally by React Router's history.

The reactive-store fixes (Changes 4–7) introduce one cross-page behavior: reading a chapter in BibleReader during the same session causes BibleProgressMap and ReadingHeatmap on `/bible/my` to update reactively when the user navigates back. This is implicit completion-style feedback, not an explicit completion event.

---

## Design Notes

- **Atmospheric layer:** `<BackgroundCanvas>` is the canonical outer-Bible-surface atmospheric layer per Decision 1 and `09-design-system.md` § "Round 3 Visual Patterns". Match BibleLanding's wrapping pattern exactly — the import path, the JSX shape, the `className="flex flex-col font-sans"` props, and the inner page structure (Navbar → SEO → main → SiteFooter). HorizonGlow stays scoped to Daily Hub; do NOT import it on `/bible/my`.
- **FrostedCard primitive:** `<FrostedCard variant="default">` is the canonical tier-1 card chrome. The rolls-own `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]` values that MyBiblePage stat cards (Change 10) and MemorizationFlipCard front + back faces (Changes 9a, 9b) currently use exactly match FrostedCard tier-1 defaults — migration is mechanical. `<FrostedCard variant="subdued">` is used for the device-local-storage banner (Change 2c) — subdued tier signals "informational, not primary content". Reference `09-design-system.md` § FrostedCard tier system.
- **Subtle Button:** `<Button variant="subtle">` is the canonical chrome for non-climactic CTAs. All four migrated buttons in Change 3 (BookmarkLabelEditor Save, BibleSettingsModal Merge, MyBiblePage Clear filters, EmptySearchResults Clear search) use subtle variant. None are climactic moments warranting gradient. The Sign In CTA in the device-local-storage banner (Change 2c) also uses subtle Button.
- **Hero spacing:** Match BibleLanding's `pt-28 pb-12` hero zone rhythm (Change 1c). The previous `pt-36` Daily Hub pattern was drift documented in the inline comment (Change 1b deletes the comment).
- **Anti-pressure copy:** Device-local-storage banner copy follows the anti-pressure voice rule from CLAUDE.md and `06-testing.md` Definition of Done. Suggested: "Your data lives on this device. Sign in to keep it safe across devices." Variations acceptable so long as the tone is matter-of-fact, the message accurate per `02-security.md` § "Demo Mode (Logged-Out Experience) Data Policy", and the urgency zero. No "your data is at risk" / "you'll lose everything" / "sign in soon" framing.
- **Reactive store pattern:** Pattern A canonical hook (`useSyncExternalStore`) for the new `useBibleProgress` per `11b-local-storage-keys-bible.md` § "Reactive Store Consumption". Match `useStreakStore` and `useMemorizationStore` style exactly. Do NOT introduce a generic `useReactiveStorage` wrapper — that's a separate refactor spec, explicitly out of scope.
- **Sign In CTA:** Uses Spec 7's `/?auth=login` deep-link pattern. The `AuthQueryParamHandler` mounted in Spec 7 reads the query param and opens AuthModal in login view on the homepage. Spec 8B does NOT modify the AuthQueryParamHandler or AuthModal — only consumes the deep-link.
- **`bg-primary` decorative tints preserved:** Decision 11 preserves all `bg-primary/N` decorative tints across the Bible cluster (search highlight, progress bar fills, ActivityFilterBar active state, MiniGrid filled cell, etc.). These are functional/categorical signals, NOT CTAs. Spec 8B does NOT touch them — only the four solid `bg-primary` CTA buttons enumerated in Change 3.
- **`duration-200` drift accepted:** Decision 12 accepts the `duration-200` drift on canonical class strings. Spec 8B does NOT touch animation duration tokens; that's a documentation-only update for `09-design-system.md`, separate from this spec.
- **PlanCompletionCelebration unchanged:** Decision 5 keeps PlanCompletionCelebration diverged from Grow's PlanCompletionOverlay. Bible plan completion is intentionally quieter — no Caveat, no confetti, no sound effect. Spec 8B does NOT touch the celebration component.
- **Memorization stays quiet:** Decision 4 — no themeColor system, no flip sound, no celebration on add. Anti-pressure design wins. The flip animation and sortable last-reviewed line are sufficient acknowledgment of activity.

---

## Out of Scope

- Spec 8C work (Plans cluster — BibleBrowse, BiblePlanDetail, BiblePlanDay, PlanFilterBar/Pill deletion, BibleStub.tsx deletion, TodaysPlanCard URL bug, BiblePlanDay heading semantics)
- Spec 8A work (BibleReader chrome — only the validation-error pages migrate; reader chrome itself is documented intentional drift per Decision 13)
- ReaderChrome, TypographySheet, VerseActionSheet, AmbientAudioPicker, CrossRefsSubView, ExplainSubView, ReflectSubView, ShareSubView, NoteEditorSubView, FocusVignette, VerseJumpPill, VerseBookmarkMarker, VerseNoteMarker, ActivePlanReaderBanner, NotificationPrompt, HighlightColorPicker (all bounded by Decision 13)
- AmbientAudioPicker and the BB-26-29-44 audio cluster (Decision 14)
- AI panels (BB-30 Explain and BB-31 Reflect — governed by separate prompt-test recons)
- BB-42 search engine internals
- BB-32 cache internals
- BB-41 push subscription server (Phase 3 backend territory)
- Forums Wave backend integration (does not touch Bible per master plan)
- Reactive store hook standardization — canonical `useReactiveStorage` wrapper does not exist; introducing it is a separate refactor spec
- `wr_bible_active_plans` localStorage bridge cleanup (Decision 15 — separate cleanup spec)
- PlanCompletionCelebration alignment with Grow's PlanCompletionOverlay (Decision 5 — keep diverged)
- Memorization sound effects, themeColor system, on-add celebration (Decision 4 — memorization stays quiet)
- All `bg-primary/N` decorative tints — search highlight, progress bar fills, ActivityFilterBar active state, MiniGrid filled cells, etc. (Decision 11 — preserved)
- `duration-200` drift on canonical class strings (Decision 12 — documentation-only update for `09-design-system.md`)
- AuthContext, AuthProvider, `mirrorToLegacyKeys` (Phase 2 cutover concerns; the `// Transitional — removed in Phase 2 cutover` comments are load-bearing)
- All non-Bible surfaces (Dashboard, Daily Hub, Local Support, Grow, Music, Prayer Wall — none touched by Spec 8B)
- Real backend sync of personal layer data (Phase 3 — adds optional sync for authenticated users; Spec 8B does NOT introduce any sync)
- AuthModal modifications, new auth gates, or any change to existing auth-modal trigger sites (none touched by this spec)
- VITE_USE_BACKEND_* feature flag changes (Forums Wave dual-write migration concerns; not relevant to Spec 8B)

---

## Acceptance Criteria

### MyBiblePage atmospheric + auth + chrome

- [ ] HorizonGlow import deleted from `frontend/src/pages/MyBiblePage.tsx`
- [ ] `<BackgroundCanvas>` import added (matching BibleLanding's path)
- [ ] `<BackgroundCanvas className="flex flex-col font-sans">` wraps the page structure (matching BibleLanding's pattern)
- [ ] Inner page structure (Navbar, SEO, main, SiteFooter) preserved exactly
- [ ] "Daily Hub pt-36 pattern" inline drift-confessing comment deleted
- [ ] Hero zone spacing migrated from `pt-36` to `pt-28 pb-12` (matching BibleLanding rhythm) within ±2px tolerance
- [ ] Auth gate branch removed; `MyBiblePageInner` shell and `MyBibleAuthenticatedInner` consolidated to a single rendering path that works for both auth states
- [ ] "Get Started — It's Free" CTA shell deleted from logged-out path
- [ ] Device-local-storage banner (or hero-subtitle alternative) added for logged-out users
- [ ] Banner is dismissable; dismissal persists in `wr_mybible_device_storage_seen` (or, if alternative chosen, no new key needed)
- [ ] Banner copy matches anti-pressure voice (no "your data is at risk", no "sign in soon" framing)
- [ ] Banner Sign In CTA is `<Button variant="subtle">` linking to `/?auth=login`
- [ ] Banner is hidden when `isAuthenticated === true`
- [ ] Quick stats cards (line 277 area) migrated from rolls-own chrome to `<FrostedCard variant="default">`
- [ ] Clear filters button (line 352 area) migrated from `bg-primary` solid to `<Button variant="subtle">`

### Bug fixes (Decision 6)

- [ ] BibleReader chapter-mount effect calls `recordChapterVisit(book.slug, chapter)`
- [ ] BibleReader's direct `localStorage.setItem('wr_bible_progress', ...)` replaced with `markChapterRead(book.slug, chapter)` call
- [ ] Both `markChapterRead` and `recordChapterVisit` calls land in the same chapter-mount effect (atomic)
- [ ] Effect short-circuits on `!book || !chapter || isLoading || loadError` BEFORE either call fires
- [ ] `useBibleProgress` is now a reactive store with `subscribe()`, `getProgressSnapshot()`, `markChapterRead()`, and a hook wrapping `useSyncExternalStore`
- [ ] `useBibleProgress` cross-tab sync via `storage` event listener (matching `streakStore.ts` pattern)
- [ ] `useBibleProgress` hook return shape exactly matches the previous contract (regression test added)
- [ ] BibleProgressMap on MyBiblePage updates reactively when chapters are read in BibleReader during the same session (verified via test)
- [ ] `useActivityFeed` subscribes to `journalStore` alongside highlight/bookmark/note/streak stores
- [ ] HighlightCard derives `inDeck` from `useMemorizationStore()` return value rather than side-effect-only call
- [ ] HighlightCardMemorize.test.tsx no longer mocks `@/lib/memorize` wholesale; uses real-store + mutate-from-outside pattern
- [ ] Behavioral assertions in HighlightCardMemorize tests are unchanged (only mocking pattern changes)

### bg-primary CTA migrations

- [ ] BookmarkLabelEditor Save button (line 151) migrated to `<Button variant="subtle">`; tests updated
- [ ] BibleSettingsModal Merge button (line 292) migrated to `<Button variant="subtle">`; tests updated
- [ ] MyBiblePage Clear filters button (line 352) migrated to `<Button variant="subtle">`
- [ ] EmptySearchResults Clear search button (line 21) migrated to `<Button variant="subtle">`; tests updated
- [ ] All four buttons preserve their onClick handlers, disabled state logic, and ARIA wiring

### Memorization (folded from 8D)

- [ ] MemorizationFlipCard front face (line 83 area) migrated from rolls-own chrome to `<FrostedCard variant="default">`
- [ ] MemorizationFlipCard back face (line 104 area) migrated from rolls-own chrome to `<FrostedCard variant="default">`
- [ ] MemorizationFlipCard's `role="button"` on `<div>` replaced with real `<button type="button">` element
- [ ] 3D flip animation preserved (CSS `transform: rotateY(...)`, `transformStyle: preserve-3d`)
- [ ] Keyboard activation preserved (Enter/Space activate flip)
- [ ] Touch activation preserved (tap to flip)
- [ ] All ARIA attributes preserved (`aria-pressed` for flip state, `aria-label` for card purpose)
- [ ] No themeColor system added (Decision 4 — memorization stays quiet)
- [ ] No flip sound added (Decision 4)
- [ ] No on-add celebration added (Decision 4)

### Other

- [ ] BookmarkCard "no label" placeholder (line 21) de-italicized: `text-sm italic text-white/50` → `text-sm text-white/40`

### Tests

- [ ] All existing Bible cluster tests pass; updated tests pass; no new failures
- [ ] Tests added for `useBibleProgress` reactive subscription (cross-mount update via `markChapterRead`)
- [ ] Tests added for `useActivityFeed` journal subscription (real-store mutate-from-outside)
- [ ] Tests added for BibleReader's `recordChapterVisit` call (mount, change, loadError suppression)
- [ ] HighlightCardMemorize test no longer mocks `@/lib/memorize`; uses real store and `addCard`/`removeCard` mutations
- [ ] MyBiblePage tests rewritten: logged-out users see personal layer + banner (or alternative); no sign-in CTA shell
- [ ] `pnpm typecheck` (or `npm run typecheck`) passes
- [ ] `pnpm lint` passes
- [ ] `wr_mybible_device_storage_seen` documented in `11-local-storage-keys.md` (if banner pattern chosen)

### Manual eyeball checks (logged-out)

- [ ] `/bible/my` as logged-out user: full personal layer renders (highlights, notes, bookmarks, memorization deck, heatmap, progress map, activity feed)
- [ ] Device-local-storage banner visible on first visit
- [ ] Data populated from existing localStorage (e.g., highlights made before logout still render)
- [ ] Dismissing banner via X button persists across page reloads (`wr_mybible_device_storage_seen` set to `"true"`)
- [ ] Sign In CTA navigates to `/?auth=login`; AuthModal opens in login view on the homepage

### Manual eyeball checks (logged-in)

- [ ] `/bible/my` as logged-in user: full personal layer renders
- [ ] Device-local-storage banner is hidden
- [ ] Data populated from localStorage (Phase 3 will add backend sync; until then, same as logged-out)

### Manual eyeball checks (visual)

- [ ] BackgroundCanvas atmosphere matches BibleLanding, Dashboard, Local Support visual rhythm — no HorizonGlow drift
- [ ] Quick stats cards render with FrostedCard tier-1 chrome (matching the rest of the app's card chrome)
- [ ] Memorization deck cards render with FrostedCard chrome and proper `<button>` semantics; flip animation works smoothly
- [ ] Memorization keyboard activation: focus a card, press Enter or Space, card flips
- [ ] BookmarkCard "no label" placeholder is no longer italic; opacity slightly reduced (visual de-emphasis preserved)
- [ ] BibleProgressMap and ReadingHeatmap update visibly during a session when reading chapters in BibleReader (open `/bible/my`, navigate to BibleReader, read a chapter, navigate back — coverage updates)
- [ ] Clear filters / Clear search / Save bookmark / Merge buttons all use subtle Button chrome (no `bg-primary` solid)

### Regression checks

- [ ] BibleLanding unchanged visually and behaviorally
- [ ] BibleBrowse unchanged (Spec 8C will migrate it)
- [ ] PlanBrowserPage unchanged
- [ ] BiblePlanDetail unchanged (Spec 8C territory)
- [ ] BiblePlanDay unchanged (Spec 8C territory)
- [ ] BibleReader chrome unchanged — the only diff in BibleReader.tsx is the chapter-mount effect (one-line `recordChapterVisit` addition + one-line `markChapterRead` refactor)
- [ ] ReaderChrome, TypographySheet, VerseActionSheet, AmbientAudioPicker, all reader sub-views unchanged
- [ ] PlanCompletionCelebration unchanged (Decision 5)
- [ ] All non-Bible surfaces (Dashboard, Daily Hub, Local Support, Grow, Music, Prayer Wall) unchanged
- [ ] Memorization card flip animation, keyboard activation, removal flow all work correctly
- [ ] Activity feed shows journal entries (after Change 6 lands)
- [ ] No new BB-45 anti-patterns introduced; existing reactive-store-consumer tests still pass under the canonical real-store + mutate-from-outside pattern
- [ ] No `VITE_*_API_KEY` references introduced (Key Protection Wave invariant preserved)
- [ ] No new auth gates introduced; the 60+ existing AuthModal trigger sites stay wired exactly as Spec 7 left them

### Branch discipline reminder

- [ ] CC stays on `forums-wave-continued` throughout execution
- [ ] No `git checkout -b`, `git branch`, `git switch -c`, `git commit`, `git push`, `git stash`, `git reset`, or any branch-modifying git command
- [ ] User manages all git operations manually
