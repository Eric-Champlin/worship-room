# Spec 9: AskPage Round 3 Visual Migration + Light UX

**Master Plan Reference:** Direction document at `_plans/direction/ask-2026-05-05.md` is the locked decision set (19 numbered decisions). Recon at `_plans/recon/ask-2026-05-05.md` is the source of truth for the current state of `AskPage.tsx`, the eight `components/ask/*` children, the existing `?q=` auto-submit handler, the silent-mock-fallback error posture in `services/ask-service.ts`, the BB-45 memorization store wire-up, and the verse-action registry shape. This is the ninth top-level visual spec following the Round 3 visual migration cycle (Specs 4A/4B/4C Dashboard, Spec 5 Local Support, Specs 6A/6B/6C/6D Grow, Spec 7 Auth surfaces, Specs 8B/8C/8A Bible cluster). After Spec 9 ships, the only `<GlowBackground variant="fullPage">` holdout is `/register`, which migrates with Spec 13.

This is a **medium-light spec** — single primary surface (`/ask`), two cross-feature bridge entry points (BibleReader VerseActionSheet, Daily Hub Devotional CTA), and a memorize button on Ask response verse cards. Total LOC delta ~200-300 production + ~80-150 test. Comparable to Spec 7 (Auth surfaces) in scope shape: small visual deltas plus targeted UX additions that mirror established patterns. The recon found AskPage already mostly on Round 3 — `GRADIENT_TEXT_STYLE` + `animate-gradient-shift` on the hero h1, canonical white-pill primary CTA, `FrostedCard` adoption across PopularTopicsSection / DigDeeperSection / VerseCard / ConversionPrompt, `ANIMATION_DURATIONS` tokens already imported, `useFocusTrap` not needed (no modal here), `pendingAutoSubmitRef` already wired for homepage typewriter `?q=` arrivals. The page-level visual delta is small: the atmospheric layer migrates from `<GlowBackground variant="fullPage">` to `<BackgroundCanvas>` (the canonical outer-surface treatment used by Dashboard, Local Support, BibleLanding, PlanBrowserPage, CreatePlanFlow), and the question textarea migrates from white-glow to violet-glow (Daily Hub 1B parity, canonical per `09-design-system.md` § "Textarea Glow Pattern"). The bulk of Spec 9 is light UX: three a11y wins (loading region semantics, focus management on response arrival, defensive disabled guard on submit), two cross-feature bridges that mirror the existing Daily-Hub-to-Meditate Spec Z pattern, and a memorize button that wires Ask verse cards to the existing BB-45 store via the canonical `useMemorizationStore()` Pattern A hook.

Patterns this spec USES (already shipped): `<BackgroundCanvas>` atmospheric layer (canonical outer surface treatment); violet-glow textarea idiom (Daily Hub 1B canonical, used by Pray, Journal, CreatePlanFlow Step 1); `<Button variant="subtle">` (canonical for non-climactic cross-feature CTAs, established across Specs 6A–8A); white-pill primary CTA (page-level reservation pattern); `FrostedCard` primitive (already in use across all `components/ask/*` cards); Tonal Icon Pattern; `ANIMATION_DURATIONS` tokens from `frontend/src/constants/animation.ts` (Ask already uses `duration-base` / `duration-fast`); BB-45 memorization store + `useMemorizationStore()` Pattern A hook (canonical reactive-store consumption per `11b-local-storage-keys-bible.md` § "Reactive Store Consumption"); the existing AskPage `?q=` auto-submit handler (already serving homepage typewriter arrivals — bridge arrivals reuse it verbatim); the existing two-layer crisis detection design (server-side authoritative `AskCrisisDetector` + client-side `CrisisBanner` fast-path). Patterns this spec INTRODUCES: a new verse action `'ask'` registered in `lib/bible/verseActionRegistry.ts` next to `'explain'` and `'reflect'`, joining the existing `'highlight'` / `'note'` / `'pray'` / `'journal'` / `'meditate'` / `'copy'` / `'share'` set; a new URL builder `lib/bible/verseActions/buildAskUrl.ts` mirroring the existing `buildDailyHubVerseUrl.ts` pattern; an "Ask about this passage" CTA in BibleReader VerseActionSheet; an "Ask about this" inline CTA in Daily Hub Devotional tab content. Patterns this spec MODIFIES: AskPage atmospheric layer (`GlowBackground` → `BackgroundCanvas`); AskPage textarea glow (white → violet); VerseCardActions order (Highlight, Save note, Share → Highlight, Memorize, Save note, Share — Memorize inserted as the 2nd action, the other three preserved exactly).

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs (`_plans/recon/ask-2026-05-05.md`, `_plans/direction/ask-2026-05-05.md`) are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/ask` — primary migration surface. Atmospheric layer swaps from `<GlowBackground variant="fullPage">` to `<BackgroundCanvas>`. Question textarea swaps from white-glow shadow class string to canonical violet-glow per `09-design-system.md` § "Textarea Glow Pattern". Loading wrapper gains `role="status"` + `aria-busy="true"` + an sr-only "Searching Scripture for wisdom" announcement that survives any future visible-text restyle. The latest response's `<h2>` "What Scripture Says" gains `id="latest-response-heading"` + `tabIndex={-1}` and receives focus on response arrival via `focus({ preventScroll: true })` (the existing `scrollIntoView` for visual continuity is preserved alongside the focus move). The Find Answers submit button gains `disabled={!text.trim() || isLoading}` (defense-in-depth — `showInput` already unmounts the button during loading) and `aria-label={isLoading ? 'Searching Scripture' : 'Find Answers'}`. Response verse cards gain a Memorize button as the 2nd action in the `VerseCardActions` row (Highlight, **Memorize**, Save note, Share). The hero h1, hero subtitle, conversation thread chrome, PopularTopicsSection, ConversionPrompt, DigDeeperSection, LinkedAnswerText, UserQuestionBubble, SaveConversationButton (clipboard-copy-only behavior preserved), and the `useState<ConversationPair[]>` conversation state (no localStorage shadow added) are all preserved exactly.
- `/ask?q=<prefilled>` — auto-submit deep-link target. Already wired via the existing `?q=` handler that serves homepage typewriter arrivals. Both new bridges (BibleReader VerseActionSheet "Ask" action, Daily Hub Devotional "Ask about this" CTA) target this URL pattern. The handler's `pendingAutoSubmitRef` race-condition guard against React Strict Mode double-mounts is preserved exactly.
- `/bible/:book/:chapter` — regression surface. The reader chrome itself stays untouched per the documented Layout Exception in `09-design-system.md` and the Bible-cluster Decision 13 boundary that Spec 8A respected. The change is scoped to `components/bible/reader/VerseActionSheet.tsx` (which is reachable from this route via the verse-tap interaction) — the verse action sheet gains an "Ask about this passage" entry next to the existing "Explain" and "Reflect" entries. Tapping Ask navigates to `/ask?q=<encoded "Help me understand <reference>: \"<verse text>\"">` and closes the sheet. Focus mode behavior is unchanged (the verse action sheet works in focus mode today and continues to work after Ask joins it). NO touches to `ReaderChrome` top toolbar (Decision 13 boundary preserved — no new icon there). NO ambient panel below ReaderBody. NO chapter-level Ask entry. NO additions to `DEEP_LINKABLE_ACTIONS` in `lib/url/validateAction.ts` (Ask navigates AWAY from BibleReader to AskPage and has no sub-view, so it behaves like `'pray'` / `'journal'` / `'meditate'` / `'copy'` — fire-and-forget navigations).
- `/daily?tab=devotional` — regression surface. The change is scoped to `components/daily/DevotionalTabContent.tsx` — the devotional tab gains an inline "Ask about this" CTA paralleling the existing "Journal about this question" / "Pray about this" CTAs. Same `<Button variant="subtle" size="sm">` chrome. Routes to `/ask?q=<encoded reflection question>`. The reflection question text is passed directly (no "Help me understand" wrapping — the reflection question already reads as a question, per direction Decision 7). The existing "Journal about this question" CTA already strips the "Something to think about today: " prefix; the new Ask CTA reuses that same stripped text. The Daily Hub Pray and Journal tabs are unchanged — only the Devotional tab is modified.

The single non-route effect: test files for the affected components/pages (`pages/__tests__/AskPage.test.tsx`, `components/ask/__tests__/AskResponseDisplay.test.tsx`, `components/ask/__tests__/VerseCardActions.test.tsx`, `lib/bible/__tests__/verseActionRegistry.test.ts`, `lib/bible/verseActions/__tests__/buildAskUrl.test.ts` (new file), `components/bible/reader/__tests__/VerseActionSheet.test.tsx`, `components/daily/__tests__/DevotionalTabContent.test.tsx`) get updated assertions — most existing assertions pass unchanged because the AskPage textarea behavior tests check placeholder text / char count / max length rather than the shadow class string. Class-string assertions tightly coupled to the white-glow shadow shift to the violet-glow shadow. The glow-orb count assertion at `pages/__tests__/AskPage.test.tsx:88` (currently `[data-testid="glow-orb"]` count ≥3) shifts to a BackgroundCanvas presence check, mirroring the precedent in `LocalSupportHero.test.tsx:99`.

---

## Overview

AskPage is one of Worship Room's two AI conversation surfaces (the other is the Daily Hub Pray flow). It is the page a user lands on when they have a question — typed into the homepage typewriter, clicked on a popular topic, or now also tapped from a Bible verse action sheet or a Daily Hub devotional reflection prompt. The recon found AskPage already mostly canonical for Round 3: the gradient hero h1, the white-pill primary CTA, the FrostedCard adoption across all child cards, the ANIMATION_DURATIONS token discipline, the canonical `aria-live="polite"` parent on the conversation thread. Two visual outliers remain. The atmospheric layer is the only logged-out-facing page still using `<GlowBackground variant="fullPage">` — every other outer surface migrated to `<BackgroundCanvas>` during Specs 4A/4B/4C/5/6A/6B/6C/8B/8C. The question textarea uses a white-glow shadow that predates the violet-glow idiom canonized in Daily Hub 1B (which Pray, Journal, and CreatePlanFlow Step 1 all now use). After Spec 9, AskPage's atmospheric register and authoring affordance match the rest of the app — the user feels the same "this is where you put something emotionally weighted" cue on the Ask textarea as on the Pray and Journal textareas.

The bulk of Spec 9 is not visual — it is light UX work: three a11y wins, two cross-feature bridges, and a memorize button. The a11y wins are surgical. The loading wrapper currently has no `aria-busy` or `role="status"`, so screen-reader users hear the response heading appear (via the parent `aria-live="polite"`) but get no announcement that the search is in progress. Adding `aria-busy="true"` + `role="status"` + an sr-only "Searching Scripture for wisdom" announcement closes that gap; the sr-only span lives outside the visible loading text so the announcement happens even if the visible text is later restyled. Focus management on response arrival currently relies on `scrollIntoView` to bring the response into the viewport, but keyboard / screen-reader users don't have focus moved to the response heading — they have to manually re-find it. Adding `tabIndex={-1}` + `id="latest-response-heading"` to the latest `<h2>` "What Scripture Says" and a `target?.focus({ preventScroll: true })` call alongside the existing `scrollIntoView` matches the AuthModal focus-on-error canonical pattern. The submit button currently disables on `!text.trim()` only; it never sees `isLoading` because the `showInput = conversation.length === 0 && !isLoading` guard at line 233 unmounts the input block during loading. This is correct today, but adding `disabled={!text.trim() || isLoading}` and `aria-label={isLoading ? 'Searching Scripture' : 'Find Answers'}` is defense-in-depth — any future spec that keeps the button visible during loading inherits the correct disabled and aria-label semantics for free.

The two cross-feature bridges close gaps the recon flagged. **BibleReader → Ask.** Today a user reading a verse who wants to ask "what does this mean to me right now?" has two paths: BB-30 Explain (which gives a concise interpretive paragraph) and BB-31 Reflect (which gives a short reflective prompt). Neither is a full conversation — they're fire-and-forget AI single-shots. For "I want to talk through this passage," the user has to leave BibleReader, navigate to /ask, and retype or paste the verse. The fix is small: register a new `'ask'` action in `lib/bible/verseActionRegistry.ts` next to `'explain'` and `'reflect'`, add a `buildAskUrl.ts` URL builder mirroring the existing `buildDailyHubVerseUrl.ts` pattern, and have VerseActionSheet's existing action-routing wire it up to a `routerNavigate(buildAskUrl(selection))` + close-the-sheet handler. The URL contract is `?q=<encoded "Help me understand <reference>: \"<verse text>\"">` — the `formatReference` and `getSelectionText` helpers already exist in `lib/bible/verseActionRegistry.ts`, so the builder is a thin wrapper. Auto-submit on arrival is handled by AskPage's existing `?q=` handler — no new infrastructure needed. Crucially, this is NOT added to `DEEP_LINKABLE_ACTIONS` in `lib/url/validateAction.ts` because Ask navigates AWAY from BibleReader to AskPage and has no sub-view inside the reader; it behaves exactly like the existing `'pray'` / `'journal'` / `'meditate'` / `'copy'` actions which are also not deep-linkable. **Daily Hub Devotional → Ask.** Today the devotional tab has "Journal about this question" and "Pray about this" inline CTAs that bridge to the Daily Hub Journal and Pray tabs respectively, passing the reflection question text through. There is no equivalent "Ask about this" — a user who wants to talk through a reflection question has to copy the text manually. The fix mirrors the existing CTA pattern: `<Button variant="subtle" size="sm">` chrome, routes to `/ask?q=<encoded reflection question>`, reuses the same prefix-stripping logic ("Something to think about today: ") that the existing "Journal about this question" CTA uses. Per direction Decision 7, the reflection question text is passed directly without "Help me understand" wrapping — the reflection question already reads as a question.

The memorize button on Ask response verse cards closes a different gap. Today the AI response renders verse cards with three actions: Highlight, Save note, Share. A user who wants to memorize a verse the AI surfaced has to navigate to BibleReader, find the verse, tap the verse action sheet's Memorize entry. The fix adds Memorize as the 2nd action in `VerseCardActions` (Highlight, **Memorize**, Save note, Share — Memorize sits next to Highlight as the two "scripture engagement" primitives). The wire-up uses the canonical `useMemorizationStore()` Pattern A hook so that adding a card from BibleReader and then returning to an Ask conversation containing the same verse updates the indicator reactively (cross-mount sync). Auth posture is unauthenticated — this mirrors BibleReader's BB-45 memorization auth posture per `02-security.md` § "Bible Wave Auth Posture". A logged-out user who lands on /ask, asks a question, sees a response, and taps Memorize on a verse card adds the card to their device-local deck without an auth modal interruption — the same posture that holds in BibleReader. On mobile, four actions in a row will wrap to two lines (2x2 grid); per direction Decision 9 this is acceptable.

What this spec deliberately does not change. AI integration is closed scope: no prompt template changes (`AskPrompts.java`, `AskService.java`, `AskCrisisDetector.java`, `AskController.java`, all DTOs preserved exactly); no backend Gemini integration changes; no model swap; no streaming response (deferred to Spec 9b/future); no BB-32-style cache for Ask answers (deferred). The 30-second timeout + silent-mock-fallback error posture is preserved exactly per `services/ask-service.ts:1-6` doc comment — the silent fallback to mock data on any error is the canonical Worship Room error posture for emotionally vulnerable surfaces, and Spec 9b will revisit error UX framing when conversation persistence ships. Crisis detection wiring is preserved exactly: server-side authoritative `AskCrisisDetector` + client-side `CrisisBanner` for fast-path UX. Conversation state stays in `useState<ConversationPair[]>` — no localStorage shadow added in Spec 9 (deferred to Spec 9b alongside potential Forums Wave Phase 3 backend `ask_threads` table). `wr_chat_feedback` schema is unchanged (no entry-source telemetry added — deferred to Spec 9b). `SaveConversationButton` remains clipboard-copy-only despite the name; auth-gated render preserved (component returns null for logged-out users). `ConversionPrompt` (the "This is just the beginning" upsell card with `animate-shine` on its white-pill register CTA) is unchanged. `PopularTopicsSection` is unchanged — five FrostedCards (intentional five, not six, resolved in recon). The hero h1, hero subtitle, loading state copy ("Searching Scripture for wisdom...", the Psalm 119:105 verse), Find Answers button chrome, OfflineNotice rendering, and all crisis banner triggering on textarea text are all preserved exactly. The VerseCardActions inline note composer textarea (which uses the same white-glow pattern as the page-level question textarea) is OUT OF SCOPE per direction Decision 2 — touching it would cross into Bible reader audit territory; deferred. `/register` GlowBackground migration is deferred to Spec 13 — after Spec 9 ships, `/register` is the last fullPage holdout.

After this spec ships, AskPage joins the rest of the app's atmospheric register: BackgroundCanvas blooms at the edges, violet-glow on the question textarea matching Pray/Journal/CreatePlan, three a11y wins that cost nothing visually but help screen-reader and keyboard users meaningfully, two new bridge entry points that make the Ask flow reachable from the surfaces where users actually have questions (a Bible verse, a devotional reflection question), and a memorize button that closes the loop on "the AI showed me a verse worth keeping." The Round 3 visual migration is one step closer to complete (only `/register` remains); the Bible-cluster bridges respect Decision 13's boundary; and every preserved behavior — crisis detection, silent-mock-fallback, conversation state, anti-pressure tone — stays exactly as the recon documented.

---

## User Story

As a **logged-out visitor or logged-in user opening `/ask`** (typed directly, clicked from the homepage typewriter, arrived via a bridge from BibleReader or Daily Hub Devotional), I want the page to feel like the same calm atmospheric outer surface every other Worship Room page does — BackgroundCanvas radial blooms at the edges instead of the older fullPage glow orbs, the question textarea wearing the canonical violet glow that signals "this is the place where you put something emotionally weighted" (matching the Pray and Journal textareas on Daily Hub), the white-pill submit button reading as quiet competence (because the gradient register is reserved for the emotional climax of generating something genuinely new — auth and Ask are different categories), the hero h1 unchanged because it already wears the canonical gradient. When I submit a question, I want the loading region to announce itself to my screen reader ("Searching Scripture for wisdom") even when my visible focus is elsewhere on the page; when the response arrives, I want my keyboard focus to land on the "What Scripture Says" heading so I can tab through the response cards directly without having to re-find them by page-down or arrow-keys; and when the submit button is in a loading state (defense-in-depth — currently unmounted, but a future spec might keep it visible), I want the button correctly disabled and the aria-label correctly switched to "Searching Scripture" so my screen reader knows what's happening.

When I'm reading a Bible verse and want to ask the AI to talk through it with me, I want a one-tap path. I select the verse (or hold-tap on mobile), the verse action sheet opens, I see Ask sitting next to Explain and Reflect — the three AI-adjacent verse actions in one row — I tap Ask, the sheet closes, I land on /ask with the question pre-filled as `Help me understand John 3:16: "For God so loved the world..."`, and the question is auto-submitted on mount so I see my question in flight without having to press Submit. When I'm reading a devotional in Daily Hub and the reflection question hits ("What in your life right now most needs to be remembered as held by grace?") and I want to talk through it rather than journal or pray about it, I want a third inline CTA next to "Journal about this question" and "Pray about this" that says "Ask about this" — same `<Button variant="subtle">` chrome, same one-tap navigation, same auto-submit on arrival.

When the AI's response surfaces a verse I want to memorize, I want the verse card to offer Memorize as a first-class action — sitting next to Highlight as one of the two "scripture engagement" primitives, with Save note and Share following as the reflection / social actions. When I tap Memorize, the verse is added to my BB-45 memorization deck immediately, no auth modal interruption (logged-out users can memorize on Ask just as they can on BibleReader — the Bible Wave auth posture). The button updates to "Memorized" with `aria-pressed={true}` and an aria-label that announces "Remove from memorization deck". When I add the same verse to my deck from BibleReader (a different surface, a different mount), and then return to the Ask conversation containing that verse, the button reflects "Memorized" reactively — because both surfaces consume the same `useMemorizationStore()` Pattern A hook and subscribe to the same store mutations.

When I lose my Wi-Fi mid-conversation, the OfflineNotice still renders. When I type a crisis keyword into the textarea, the CrisisBanner still triggers immediately (client-side fast-path) and the server-side `AskCrisisDetector` still has authority over the response shape. When the AI request times out at 30 seconds or the upstream Gemini call fails, the silent-mock-fallback kicks in and I see a real-feeling response sourced from `mocks/ask-mock-data.ts` rather than an angry error toast — Worship Room's anti-pressure stance preserved. When I refresh the page, my conversation is lost (this is preserved Spec-9 behavior — conversation persistence is Spec 9b). When I tap SaveConversationButton, the conversation is copied to my clipboard (also preserved — despite the name, no real save happens; that's Spec 9b). When the page loads with `?q=<something>`, the existing `?q=` handler auto-submits exactly as it does today for homepage typewriter arrivals — bridge arrivals from BibleReader and Daily Hub Devotional reuse this infrastructure verbatim, with the existing `pendingAutoSubmitRef` race-condition guard against React Strict Mode double-mounts intact.

---

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. **Verify all prior specs are merged into the working branch.** Spec 8A (Bible Reader validation errors), Spec 8C (Bible Plans), Spec 8B (Bible MyBible), Spec 7 (Auth surfaces), Specs 6A/6B/6C/6D (Grow cluster), Spec 5 (Local Support sub-specs), Spec 4 (Grow cluster initial), Spec 3 (Local Support cluster), Spec 2 (Daily Hub), Specs 1A/1B (Dashboard) — all expected to be on `forums-wave-continued` at execution start. Re-confirm by spot-checking that BibleReader's three validation-error CTAs render `<Button variant="subtle">` chrome (Spec 8A), `/grow` renders `<BackgroundCanvas>` (Spec 6A), Auth Modal renders the canonical panel chrome (Spec 7), and Daily Hub Pray/Journal textareas render canonical violet-glow (Spec 1B).

2. **Verify the direction doc** at `_plans/direction/ask-2026-05-05.md` is present and the locked decisions match — particularly Decisions 1 (BackgroundCanvas migration), 2 (textarea violet-glow), 3 (white-pill submit preserved), 5 (conversation persistence deferred), 6 (two bridges only — BibleReader VerseActionSheet + Daily Hub Devotional CTA), 7 (pre-fill templates: "Help me understand <ref>: \"<text>\"" for BibleReader bridge, raw reflection question for Daily Hub bridge), 8 (auto-submit enabled), 9 (memorize button as 2nd action with unauthenticated posture), 10a/10b/10c (three a11y wins), 11 (silent-mock-fallback preserved), 13 (crisis detection preserved), 14 (AI integration closed scope), 19 (test update strategy). If any decision in this spec disagrees with the direction doc, STOP and reconcile before writing code.

3. **Verify the recon doc** at `_plans/recon/ask-2026-05-05.md` is present. The recon is the source of truth for current line numbers in `AskPage.tsx`, `AskResponseDisplay.tsx`, `VerseCardActions.tsx`, `verseActionRegistry.ts`, `VerseActionSheet.tsx`, and `DevotionalTabContent.tsx`. Treat recon line numbers as approximate hints; use grep / structural anchors (function names, JSX attribute names, const names) to locate the exact migration target during execution.

4. **AskPage current atmospheric.** Confirm `frontend/src/pages/AskPage.tsx` line 248 area uses `<GlowBackground variant="fullPage">`. Capture the exact import (`import { GlowBackground } from '@/components/ui/GlowBackground'`) and the JSX wrap shape so the swap is verbatim.

5. **AskPage current textarea class string.** Confirm `AskPage.tsx` line 285 area uses the white-glow shadow pattern (`border-white/30`, `shadow-[0_0_20px_3px_rgba(255,255,255,0.50)...]`, `focus:border-white/60`, `focus:ring-white/30`). Capture the exact class string for diff comparison. The replacement is the canonical violet-glow per `09-design-system.md` § "Textarea Glow Pattern": `border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:ring-violet-400/30 placeholder:text-white/40`.

6. **AskPage submit button.** Confirm the submit button at line 317-325 area has `disabled={!text.trim()}` and the `min-h-[44px]` tap target. Confirm `showInput = conversation.length === 0 && !isLoading` at line 233 area (the unmount logic preserved as defense-in-depth context).

7. **AskPage loading region.** Confirm the loading wrapper at line 370 area has no `aria-busy` and no `role="status"` today, and that the parent `aria-live="polite"` on the conversation thread at line 333 area is in place. Capture the loading wrapper's children (bouncing dots, "Searching Scripture for wisdom..." copy, Psalm 119:105 verse) so the JSX rewrap is structural-only.

8. **AskPage focus management.** Confirm the existing `setTimeout(100ms) → document.getElementById('latest-response')?.scrollIntoView(...)` pattern at lines 90-98 area and 162-170 area, including the existing `prefers-reduced-motion` fallback at lines 91-95 + 163-167. The change adds focus alongside scroll, not replacing scroll.

9. **VerseCardActions current order.** Confirm `frontend/src/components/ask/VerseCardActions.tsx` renders three actions today: Highlight, Save note, Share. Capture mobile/desktop wrap behavior (the recon flagged that 3 actions fit one row on desktop and may wrap on small mobile; 4 actions will wrap to a 2x2 grid on mobile — acceptable per direction Decision 9).

10. **`useMemorizationStore` import path + return shape.** Confirm `import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore'` resolves and returns the cards array. Verify `isCardForVerse(verseRef, card)` is exported from `@/lib/memorize/store` (or `@/lib/memorize` index) for the toggle-state check, and that `addCard` and `removeCard` are exported from the same module. Confirm `_resetForTesting()` exists for test isolation.

11. **`verseActionRegistry.ts` current shape.** Read `frontend/src/lib/bible/verseActionRegistry.ts` and capture how existing actions (`'explain'`, `'reflect'`, `'highlight'`, `'note'`, `'pray'`, `'journal'`, `'meditate'`, `'copy'`, `'share'`) are registered. Note the canonical fields (`id`, `label`, `icon`, `hasSubView`, `requiresAuth`, any `urlBuilder` indirection). The new `'ask'` action joins this set with `hasSubView: false` and `requiresAuth: false`. Capture the canonical Lucide icon `BibleReader` already uses for a "memorize" action — `Layers` is plausible but the recon did not capture the exact icon; verify during execution. Also verify which icon is canonical for "ask"-shaped actions (`MessageCircle` is plausible but verify against the existing reader sub-view icon family — Explain uses `Sparkles`, Reflect uses `Heart` or similar; pick the icon that reads as "conversational" without colliding with Explain/Reflect).

12. **`VerseAction` type union.** Read `frontend/src/types/verse-actions.ts` (or the equivalent path — search if needed). Confirm whether the union needs `'ask'` added explicitly or is already extensible (e.g., string-keyed indexed type). The new `'ask'` must be a valid `VerseAction` after this change.

13. **`buildDailyHubVerseUrl.ts` template.** Read `frontend/src/lib/bible/verseActions/buildDailyHubVerseUrl.ts`. The new `buildAskUrl.ts` mirrors this pattern: takes a `VerseSelection`, returns `/ask?q=<encodedPrefilled>` where `prefilled = `Help me understand ${reference}: "${verseText}"``. Capture the import paths for `formatReference`, `getSelectionText`, and `VerseSelection` so the new builder uses the same imports.

14. **`DevotionalTabContent.tsx` existing CTA pattern.** Read `frontend/src/components/daily/DevotionalTabContent.tsx` lines 286-299 area (per recon — verify line numbers structurally). Capture the existing "Journal about this question" CTA chrome (`<Button variant="subtle" size="sm">`) and handler signature (`onSwitchToJournal` callback indirection vs `<Link>` navigation vs `useNavigate()` programmatic). The new "Ask about this" CTA mirrors this pattern but routes via either `<Link>` (cleaner for pure navigation) or `useNavigate()` (matches existing handler indirection if that's the canonical pattern in this file). The reflection question text (after the existing "Something to think about today: " prefix is stripped — the strip helper is already in this file or its imports) is passed via `?q=`. CC picks whichever composition matches the existing CTAs' shape.

15. **`?q=` auto-submit handler.** Locate the existing handler in `AskPage.tsx` (`useEffect` reading `searchParams.get('q')`). Confirm the handler's auto-submit semantics — it should fire once on mount when `?q=` is present, with `pendingAutoSubmitRef` guarding against React Strict Mode double-mount re-fires. Bridge arrivals from BibleReader and Daily Hub Devotional reuse this infrastructure verbatim — no new handler logic, no new race-condition guards.

16. **Memorize action precedent in BibleReader.** Find the existing memorize-button pattern in BibleReader's verse action sheet — likely registered as a `'memorize'` action in `lib/bible/verseActionRegistry.ts` (not enumerated in this spec's "joining the existing set" list because the recon flagged it as already present) OR inline in `VerseActionSheet.tsx`. Capture the `addCard` argument shape (the exact fields the store's `addCard` expects: `reference`, `text`, plus any optional fields the BibleReader pattern populates). The Ask verse card's memorize button replicates the same `addCard` / `removeCard` / `isCardForVerse` flow, including identical argument fields.

17. **Test baseline.** Run `pnpm install` (frontend), `pnpm typecheck`, and `pnpm test` from `frontend/`. Capture baseline pass/fail counts. Per CLAUDE.md the post-Spec-5 baseline is 9,470 pass / 1 pre-existing fail (with possible second flaky `useNotifications` failure). After Spec 9 lands, the count grows by the new tests added (a11y region semantics, focus management, defensive disabled guard, memorize button cross-mount sync, two bridge tests, build-ask-url tests, register-ask-action test) and adjusts for the glow-orb → BackgroundCanvas swap; expected delta is +20-40 tests. Any NEW failing file or any increase in fail count is a regression and must be diagnosed.

If any pre-execution finding diverges from spec assumptions, CC reports findings BEFORE writing changes and waits for direction.

#### Change set

The 8 changes below are the locked migration set. Order suggested by direction doc (smallest blast radius first): atmospheric swap, textarea swap, three a11y wins, memorize button, two bridges. CC may reorder for execution efficiency but every change must land.

18. **Change 1 — AskPage atmospheric migration.** In `frontend/src/pages/AskPage.tsx`, replace the import `import { GlowBackground } from '@/components/ui/GlowBackground'` with `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` and replace the JSX wrap `<GlowBackground variant="fullPage">{...}</GlowBackground>` with `<BackgroundCanvas>{...}</BackgroundCanvas>`. The wrap is verbatim — children unchanged. Inner sections (hero, input block, conversation thread, footer) preserve their existing styling exactly. After the swap, run `grep -rn "GlowBackground" frontend/src/pages/AskPage.tsx frontend/src/components/ask/` and confirm zero matches. If `BackgroundCanvas` does not export a `data-testid` attribute on its root, add one (`data-testid="background-canvas"`) in the component itself OR identify a canonical class string the test can query for — match the precedent at `LocalSupportHero.test.tsx:99`.

19. **Change 2 — AskPage textarea violet-glow migration.** In `AskPage.tsx` line 285 area, replace the white-glow class string (`border-white/30 ... shadow-[0_0_20px_3px_rgba(255,255,255,0.50)...] focus:border-white/60 focus:ring-white/30`) with the canonical violet-glow per `09-design-system.md` § "Textarea Glow Pattern" (`border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:ring-violet-400/30 placeholder:text-white/40`). Critical preservations: the placeholder copy `"What's on your heart? Ask anything..."` UNCHANGED; `rows={3}` UNCHANGED; the `autoExpand` callback UNCHANGED; `maxLength={ASK_MAX_LENGTH}` UNCHANGED; `aria-label="Your question"` UNCHANGED; `aria-describedby="ask-char-count"` UNCHANGED; `resize-none` UNCHANGED; Enter-inserts-newline behavior UNCHANGED (no `onKeyDown` added); 500-char limit UNCHANGED. The `VerseCardActions` inline note composer textarea at `VerseCardActions.tsx:134` area uses the same white-glow pattern but is OUT OF SCOPE per direction Decision 2 (defer to future spec).

20. **Change 3 — A11y win 1: Loading region semantics.** In `AskPage.tsx` line 370 area, the loading wrapper (currently `<div className="flex flex-col items-center justify-center py-16">{...}</div>`) gains `role="status"` + `aria-busy="true"` attributes plus a leading `<span className="sr-only">Searching Scripture for wisdom</span>` that lives outside the visible loading text (so the announcement happens even if the visible text is later restyled or replaced). The visible loading copy ("Searching Scripture for wisdom..." plus the Psalm 119:105 verse) is unchanged. The `pendingQuestion && conversation.length === 0` guard above the wrapper that mounts `UserQuestionBubble` is unchanged.

21. **Change 4 — A11y win 2: Focus management on response arrival.** In `AskPage.tsx` lines 90-98 + 162-170 (the two `setTimeout(100ms)` blocks that scroll to `latest-response`), modify the existing scroll logic to also focus the response heading. New shape: `const target = document.getElementById('latest-response-heading') ?? document.getElementById('latest-response'); target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); (target as HTMLElement)?.focus({ preventScroll: true });`. The scrollIntoView runs first; the focus call runs after with `preventScroll: true` to avoid double-scroll. The reduced-motion fallback is preserved exactly. The `aria-live="polite"` parent at line 333 still announces the response — focus move is additive. In `frontend/src/components/ask/AskResponseDisplay.tsx` line 62 area, the `<h2 className="text-xl font-semibold text-white">What Scripture Says</h2>` becomes `<h2 id={isLatestResponse ? 'latest-response-heading' : undefined} tabIndex={isLatestResponse ? -1 : undefined} className="text-xl font-semibold text-white focus:outline-none">What Scripture Says</h2>`. The `isLatestResponse` is a new prop passed by AskPage only to the last-rendered conversation pair (the others don't need the focus target — only the latest does). Add `isLatestResponse?: boolean` to AskResponseDisplay's interface; in AskPage's conversation map, pass `isLatestResponse={index === conversation.length - 1}` (or equivalent — adapt to actual loop shape).

22. **Change 5 — A11y win 3: Submit button defensive disabled guard.** In `AskPage.tsx` lines 317-325, change `disabled={!text.trim()}` to `disabled={!text.trim() || isLoading}` and add `aria-label={isLoading ? 'Searching Scripture' : 'Find Answers'}`. Critical preservations: the class string UNCHANGED (canonical white pill); `min-h-[44px]` UNCHANGED; the `showInput = conversation.length === 0 && !isLoading` unmount at line 233 PRESERVED — the disabled prop is defense-in-depth for any future spec keeping the button visible during loading; the visible button text "Find Answers" UNCHANGED.

23. **Change 6 — Memorize button on Ask response verse cards.** In `frontend/src/components/ask/VerseCardActions.tsx`, reorder the existing three actions (Highlight, Save note, Share) and insert Memorize as the new 2nd action. New order: **Highlight, Memorize, Save note, Share.** Wire-up: `import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore'`; `import { addCard, removeCard, isCardForVerse } from '@/lib/memorize/store'` (verify path during execution per pre-execution Step 10). Inside the component: `const cards = useMemorizationStore(); const memorizationCard = parsedRef ? cards.find((card) => isCardForVerse(parsedRef, card)) : undefined; const isMemorized = !!memorizationCard;`. Handler: `const handleMemorizeToggle = () => { if (!parsedRef || !verseText) return; if (isMemorized && memorizationCard) { removeCard(memorizationCard.id); } else { addCard({ reference: formatReference(parsedRef), text: verseText, /* any other fields per BibleReader's memorize precedent — see pre-execution Step 16 */ }); } };`. JSX: `<button type="button" onClick={handleMemorizeToggle} className="..." aria-pressed={isMemorized} aria-label={isMemorized ? 'Remove from memorization deck' : 'Memorize this verse'}><Layers aria-hidden="true" className="h-4 w-4" /><span>{isMemorized ? 'Memorized' : 'Memorize'}</span></button>`. Match the action-button chrome of the existing Highlight / Save note / Share buttons in this file. The Lucide icon must match BibleReader's verse action sheet memorize icon (verify during execution — `Layers` is plausible). Auth posture: **unauthenticated** — no `useAuthModal()` trigger; the button works for logged-out users, mirroring BibleReader's BB-45 memorization auth posture per `02-security.md` § "Bible Wave Auth Posture". Mobile wrap: 4 actions in a row will wrap to 2 lines (2x2 grid) on small viewports — acceptable per direction Decision 9. If during execution the wrap looks broken, CC reports — but the expected behavior is 2x2 grid on mobile, single row on desktop.

24. **Change 7 — BibleReader → Ask bridge.** Sub-changes 7a–7e.
    - **Change 7a — Register the new action.** In `frontend/src/lib/bible/verseActionRegistry.ts`, add a new `'ask'` action entry next to the existing `'explain'` and `'reflect'` entries. Use the canonical registry shape captured in pre-execution Step 11. Fields: `id: 'ask'`, `label: 'Ask about this passage'`, `icon: <Lucide icon — verify during execution per pre-execution Step 11; MessageCircle is plausible>`, `hasSubView: false` (Ask navigates AWAY from BibleReader to AskPage — no sub-view), `requiresAuth: false` (public Bible-wave posture). Any other registry fields (e.g., `urlBuilder`, `analyticsId`) per the existing pattern.
    - **Change 7b — Update the VerseAction type union.** In `frontend/src/types/verse-actions.ts` (or the equivalent path — verify during execution per pre-execution Step 12), add `'ask'` to the `VerseAction` union if it is not already extensible. Type-safety verification: `getActionByType('ask')` returns the registered action without TS errors.
    - **Change 7c — Add the URL builder.** Create `frontend/src/lib/bible/verseActions/buildAskUrl.ts`: `import { formatReference, getSelectionText } from '../verseActionRegistry'; import type { VerseSelection } from '@/types/bible'; export function buildAskUrl(selection: VerseSelection): string { const reference = formatReference(selection); const verseText = getSelectionText(selection); const prefilled = \`Help me understand ${reference}: "${verseText}"\`; const params = new URLSearchParams({ q: prefilled }); return \`/ask?${params.toString()}\`; }`. Mirrors `buildDailyHubVerseUrl.ts`. Verify the `formatReference` and `getSelectionText` import paths during execution (pre-execution Step 13).
    - **Change 7d — Handle the action in VerseActionSheet.** In `frontend/src/components/bible/reader/VerseActionSheet.tsx`, add an `handleAsk` handler that calls `routerNavigate(buildAskUrl(selection))` and closes the sheet. Wire it to the new `'ask'` action's button render alongside the existing `'explain'` and `'reflect'` handlers. The exact wiring depends on how VerseActionSheet currently routes actions (likely via `getActionByType(action)` from the registry plus a switch/lookup that maps to a handler — the new `'ask'` joins the same pattern). Critical preservations: `ReaderChrome` top toolbar UNCHANGED (Decision 13 boundary preserved); `BibleReader.tsx` page structure UNCHANGED; all other reader sub-views (TypographySheet, AmbientAudioPicker, CrossRefsSubView, ShareSubView, NoteEditorSubView, BookmarkLabelEditor, HighlightColorPicker) UNCHANGED; focus mode behavior UNCHANGED — verse action sheet works in focus mode today and continues to work after Ask joins it.
    - **Change 7e — DEEP_LINKABLE_ACTIONS.** Do NOT add `'ask'` to `DEEP_LINKABLE_ACTIONS` in `lib/url/validateAction.ts`. Ask navigates AWAY from BibleReader to AskPage and has no sub-view; it behaves like the existing `'pray'` / `'journal'` / `'meditate'` / `'copy'` actions which are also not deep-linkable.

25. **Change 8 — Daily Hub Devotional → Ask bridge.** In `frontend/src/components/daily/DevotionalTabContent.tsx`, add an inline "Ask about this" CTA mirroring the existing "Journal about this question" CTA pattern at lines 286-299 area (per recon — verify line numbers structurally during execution per pre-execution Step 14). Add the new CTA inline alongside the existing CTA group; CC determines the best placement during execution to match the existing CTA group's visual flow (likely as a third sibling inside the same CTA row). Chrome: `<Button variant="subtle" size="sm">` matching the existing "Journal about this question" CTA. Routing: `/ask?q=<encoded reflection question>`. The reflection question text is passed directly without "Help me understand" wrapping (per direction Decision 7 — the reflection question already reads as a question). The existing "Journal about this question" CTA already strips the "Something to think about today: " prefix; reuse the same stripped text. Composition: if `<Button asChild>` wrapping `<Link>` is the canonical pattern in this codebase (Spec 8A established it for `<Button variant="subtle" asChild>` wrapping `<Link>`), use that — pure navigation reads cleaner via `<Link>` than via `useNavigate()` callback indirection. If the existing "Journal about this question" CTA uses `useNavigate()` or callback indirection (`onSwitchToJournal`), match that pattern instead — the new "Ask about this" CTA should look architecturally identical to the existing CTAs in this file.

#### Test updates

26. **Change 9 — Test updates for AskPage.** In `frontend/src/pages/__tests__/AskPage.test.tsx`:
    - Replace the glow-orb count assertion at line 88-98 area (currently `container.querySelectorAll('[data-testid="glow-orb"]')` count ≥3) with a BackgroundCanvas presence check (mirror `LocalSupportHero.test.tsx:99` precedent). Use `container.querySelector('[data-testid="background-canvas"]')` (or whichever marker pre-execution Step 4 confirms is canonical).
    - The `bg-dashboard-dark` negative assertion at line 88 area should still pass — BackgroundCanvas does not introduce that class.
    - Existing textarea behavior tests at line 285+ area (placeholder text, char count, max length) pass unchanged because they don't assert on shadow class strings. If any test asserts the white-glow class string explicitly, update to the violet-glow class string.
    - Add a11y test: `it('marks loading region with aria-busy and role=status', ...)` — submit a question, mock the AI service to delay, assert the loading wrapper has both attributes plus the sr-only "Searching Scripture for wisdom" text.
    - Add a11y test: `it('moves focus to response heading on response arrival', ...)` — submit a question, await response, assert `document.activeElement` matches the `latest-response-heading` h2.
    - Add a11y tests for the submit button defensive disabled guard: `it('disables submit button during loading (defense-in-depth)', ...)` and `it('updates aria-label on the submit button to communicate loading', ...)`. These tests may need contrived setup since `showInput` currently unmounts the button during loading — document that the test is for defensive guard behavior.
    - Add bridge entry test: `it('auto-submits the prefilled question when arriving via ?q=', ...)` — render AskPage with `?q=<test prefilled>`, assert the conversation pair appears with the prefilled text and a response (mock or real).

27. **Change 10 — Test updates for AskResponseDisplay.** In `frontend/src/components/ask/__tests__/AskResponseDisplay.test.tsx`, add a test asserting the h2 has `id="latest-response-heading"` and `tabIndex={-1}` when `isLatestResponse={true}` and lacks both attributes when `isLatestResponse={false}` or undefined. Existing tests for the response shape (verse cards rendering, "What Scripture Says" copy, scripture verse pulls) pass unchanged.

28. **Change 11 — Test updates for VerseCardActions.** In `frontend/src/components/ask/__tests__/VerseCardActions.test.tsx`:
    - Add tests using the real BB-45 store + mutate-from-outside pattern (per `06-testing.md` § "Reactive Store Consumer Pattern"). Setup: `beforeEach(() => { _resetForTesting(); })`.
    - `it('shows Memorize button when verse is not in deck', ...)` — render with a verse, assert button label is "Memorize" (and not "Memorized").
    - `it('shows Memorized state when verse is added externally', async ...)` — render, then call `addCard(...)` for the same verse, assert the button updates to "Memorized" via store subscription (cross-mount sync).
    - `it('toggles state on click', async ...)` — click Memorize, assert the store now contains the card; click again, assert the store no longer contains it.
    - `it('works without authentication', ...)` — mock `useAuth` to return `isAuthenticated: false`, click Memorize, assert NO auth modal opens and `addCard` fires.
    - Update existing tests if any assert on the action-button order — the new order is Highlight, Memorize, Save note, Share.

29. **Change 12 — Test updates for verseActionRegistry.** In `frontend/src/lib/bible/__tests__/verseActionRegistry.test.ts` (or the equivalent path — verify during execution): `it('registers the ask action', () => { expect(getActionByType('ask')).toBeDefined(); expect(getActionByType('ask').requiresAuth).toBe(false); expect(getActionByType('ask').hasSubView).toBe(false); })`. Existing tests for other actions pass unchanged.

30. **Change 13 — Tests for buildAskUrl.** Create `frontend/src/lib/bible/verseActions/__tests__/buildAskUrl.test.ts`: `it('builds the correct URL for a single-verse selection', ...)` — assert the URL contains `/ask?q=` and decoded contains "Help me understand". `it('builds the correct URL for a verse range', ...)` — assert the decoded URL contains the range reference (e.g., "John 3:16-18") and "Help me understand". `it('encodes special characters in verse text correctly', ...)` — verse text containing quotes, backslashes, or unicode round-trips through encode/decode.

31. **Change 14 — Test updates for VerseActionSheet.** In `frontend/src/components/bible/reader/__tests__/VerseActionSheet.test.tsx`: `it('navigates to /ask?q=... when Ask action is clicked', async ...)` — render with a selection, click the Ask button, assert navigation happened with the expected URL pattern, assert the sheet closed. Existing tests for other actions (Explain, Reflect, Highlight, etc.) pass unchanged.

32. **Change 15 — Test updates for DevotionalTabContent.** In `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`: `it('renders Ask about this CTA', ...)` — render with mock devotional data, assert the CTA is visible. `it('routes to /ask?q=<reflection question> when clicked', ...)` — click the CTA, assert href contains `/ask?q=` and the decoded reflection question text appears. Existing tests for the "Journal about this question" and "Pray about this" CTAs pass unchanged.

33. **No other test file changes.** Backend tests are unchanged (no backend changes). All non-Ask, non-bridge frontend tests are unchanged.

### Non-Functional Requirements

- **Performance.** Lighthouse Performance 90+ on `/ask` preserved. The atmospheric swap (`<GlowBackground variant="fullPage">` → `<BackgroundCanvas>`) is element-level only — no measurable change. The textarea class-string swap is element-level only. The three a11y additions (sr-only span, h2 id+tabIndex, button disabled+aria-label) are element-level only. The memorize button adds one Lucide icon import (`Layers` — likely already in the bundle for BibleReader); zero net dependency impact. The two bridge changes add a small URL builder (`buildAskUrl.ts`) and a registry entry; no runtime perf impact. Bundle size delta: roughly +1-2 KB minified (the Memorize button JSX, the builder, the registry entry, the test files don't ship). The conversation thread continues to use `useState<ConversationPair[]>` — no virtualization added (deferred to Spec 9b).
- **Accessibility (WCAG 2.2 AA).** Lighthouse Accessibility 95+ on `/ask` preserved AND improved by the three a11y wins. Loading region announces correctly (`role="status"` + `aria-busy="true"` + sr-only fallback text). Focus management on response arrival lands focus on the response heading via `tabIndex={-1}` — keyboard and screen-reader users are not stranded. Submit button defensive disabled guard with switching aria-label ensures the button correctly announces its state if any future spec keeps it visible during loading. Memorize button has `aria-pressed` reflecting in-deck state and `aria-label` describing the toggle action. All touch targets remain `min-h-[44px]`. The textarea still has `aria-label="Your question"` and `aria-describedby="ask-char-count"`. The CrisisBanner trigger and rendering are unchanged. Reduced-motion preference is honored — the focus management change preserves the existing `prefers-reduced-motion` check on `scrollIntoView` behavior.
- **Lighthouse Performance 90+, Accessibility 95+, Best Practices 90+, SEO 90+** on touched pages.
- **No new copy except the inline CTAs and a11y strings.** The user-facing strings introduced by Spec 9 are: "Ask about this passage" (BibleReader VerseActionSheet new entry), "Ask about this" (Daily Hub Devotional new inline CTA), "Memorize" / "Memorized" (VerseCardActions new button visible text), "Memorize this verse" / "Remove from memorization deck" (VerseCardActions aria-label states), "Searching Scripture for wisdom" (AskPage loading region sr-only announcement — same as the existing visible loading copy), "Searching Scripture" (AskPage submit button aria-label during loading). All other copy preserved exactly: hero h1, subtitle, "Find Answers" submit button text, "What Scripture Says" response heading, "What's on your heart? Ask anything..." textarea placeholder, popular topic card copy, conversion prompt copy, save conversation button copy, dig deeper section copy, all existing crisis-banner copy, all existing offline-notice copy.

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Type a question into the AskPage textarea | Allowed — input works freely. | Same. | N/A |
| Click Find Answers / submit a question | Allowed — question submits, AI response streams in. | Same. | N/A |
| Click a popular topic card | Allowed — pre-fills question + auto-submits. | Same. | N/A |
| Click a Dig Deeper follow-up chip | Allowed — pre-fills follow-up question + submits. | Same. | N/A |
| Thumbs-up / thumbs-down feedback on AI answer | Allowed — `wr_chat_feedback` writes locally regardless of auth. | Same. | N/A |
| Save conversation (clipboard copy) | Component renders `null` for logged-out users (existing behavior preserved). | Allowed — copies conversation to clipboard. (Despite the name, no real save — Spec 9b.) | N/A — component hidden, not gated by modal |
| Click Memorize button on a response verse card | Allowed — adds verse to BB-45 deck; no auth modal. Mirrors BibleReader BB-45 posture (Bible Wave Auth Posture per `02-security.md`). | Same. | N/A |
| Click Highlight, Save note, or Share on a response verse card | Behavior preserved exactly from current AskPage — Spec 9 does not touch these three actions' auth posture. | Same. | (whatever their current modals say; no changes) |
| Tap Ask in BibleReader VerseActionSheet | Allowed — navigates to `/ask?q=<prefilled>` and AskPage auto-submits on mount. No auth modal. Mirrors Bible Wave Auth Posture (zero new auth gates). | Same. | N/A |
| Click "Ask about this" inline CTA in Daily Hub Devotional | Allowed — navigates to `/ask?q=<reflection question>` and AskPage auto-submits on mount. No auth modal. | Same. | N/A |
| Crisis banner trigger (textarea contains crisis keyword) | CrisisBanner appears immediately (client-side fast-path); server-side `AskCrisisDetector` has authority over response shape. No auth gate. | Same. | N/A — crisis banner is not an auth surface |

This spec introduces **zero new auth gates**. Memorize-on-Ask is unauthenticated to mirror BibleReader's BB-45 posture per `02-security.md` § "Bible Wave Auth Posture". Both bridges (BibleReader → Ask, Daily Hub Devotional → Ask) are pure navigations — they do not gate. The Bible Wave's "free to read, free to engage" stance plus Daily Hub's existing "browse all you want, only writes gate" stance are both preserved.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | AskPage hero, input block, conversation thread, popular topics, conversion prompt all stack single-column under `<BackgroundCanvas>`. The hero h1 wraps naturally. The textarea spans the available width with `rows={3}` initial size; the `autoExpand` callback grows it as content grows. The Find Answers white-pill submit button stays full content width with `min-h-[44px]` tap target. The conversation thread renders one ConversationPair per row, each pair stacking question bubble → response display → verse cards. Within each response, verse cards stack vertically; within each verse card, the four action buttons (Highlight, Memorize, Save note, Share) wrap to a 2x2 grid on the smallest viewports per direction Decision 9. Each action button has `min-h-[44px]` tap target. The Daily Hub Devotional new "Ask about this" CTA renders inline with the existing "Journal about this question" / "Pray about this" CTAs — wrapping behavior matches whatever the existing CTA group does on mobile (likely stacks vertically below 480px). The BibleReader VerseActionSheet new "Ask" entry renders alongside existing entries — wrapping behavior matches the existing sheet (a row of icon+label tappable cells that wraps to a grid on small screens). The loading region (with new `role="status"` + sr-only span) renders centered with `py-16` vertical padding at all viewport sizes. |
| Tablet (640-1024px) | Same single-column flow with wider max-width on the conversation thread. Verse cards may render four actions in a single row depending on card width and available horizontal space; the wrap to 2x2 only kicks in if the row genuinely runs out of horizontal space. Daily Hub Devotional CTAs render inline horizontally. BibleReader VerseActionSheet renders the entry list with its existing tablet behavior. |
| Desktop (> 1024px) | Same single-column flow centered with the canonical max-width. Verse card actions render in a single row of four (Highlight, Memorize, Save note, Share). Hero h1 reaches its canonical desktop typographic scale. The atmospheric layer (`<BackgroundCanvas>`) renders its radial blooms at the viewport edges as canonical for outer surfaces. The textarea has its canonical desktop width and the violet-glow shadow renders at full intensity. |

The textarea's violet-glow shadow renders at its canonical opacity at all breakpoints (per Daily Hub 1B's textarea pattern). The Memorize button's `aria-pressed` state is announced correctly by mobile screen readers. The focus-management change (focus moves to response heading on arrival) works identically across all breakpoints — keyboard users on desktop and switch-control users on mobile both get focus moved to the response heading. The `prefers-reduced-motion` fallback for `scrollIntoView` behavior is preserved. No swipe gestures, no responsive-only behavior, no breakpoint-specific class overrides for any of the migrated chrome.

---

## AI Safety Considerations

Crisis detection is **PRESERVED EXACTLY** — Spec 9 does not change any AI safety wiring. The two-layer design per `01-ai-safety.md` § "Crisis Intervention Protocol" remains in force:

- **Server-side authoritative classifier (`AskCrisisDetector`).** Sends user input through the backend AI proxy (`/api/v1/proxy/ai/*`) with the JSON-only system prompt; parses `isCrisis` / `confidence` / `category`; fails closed on parse failure (UI shows crisis resources rather than miss a real crisis); does NOT auto-flag content or notify admin unless classification parsing succeeds. This logic is in `AskCrisisDetector.java` and is closed scope for Spec 9.
- **Client-side fast-path (`CrisisBanner`).** The textarea text is run against `containsCrisisKeyword()` for immediate UI feedback (banner appears as the user types crisis keywords without waiting for the server-side classifier). This logic is in `frontend/src/components/daily/CrisisBanner.tsx` and is closed scope for Spec 9 — the banner still triggers on textarea text matching crisis keywords exactly as it does today.
- **Crisis resources display.** When triggered, the banner displays the canonical crisis resources (988 Suicide & Crisis Lifeline, Crisis Text Line, SAMHSA National Helpline) per `01-ai-safety.md`'s hardcoded constants. Unchanged.
- **AI-generated response rendering.** The AI response is treated as untrusted input — escaped on render via React's default text escaping; no `dangerouslySetInnerHTML`. Length limits (per `02-security.md` § "Input Validation & Sanitization" — prayers ~1000 chars, reflections ~500 chars, BB-30 explanations ~2000 chars; Ask responses sized similarly per backend prompt template) are unchanged. No HTML / Markdown rendering of AI output.
- **AI-generated content disclaimer.** Existing "AI-generated content for encouragement. Not professional advice." disclaimer below AI prayers / reflections is unchanged. AskPage already renders the appropriate medical disclaimer per recon — Spec 9 does not touch this.
- **The 30-second timeout + silent-mock-fallback.** Per `services/ask-service.ts:1-6` doc comment, the silent fallback to `mocks/ask-mock-data.ts` on any error is the canonical Worship Room error posture for emotionally vulnerable surfaces. Spec 9 PRESERVES this exactly. (Spec 9b will revisit error UX when conversation persistence ships — a degraded "we couldn't reach the AI right now" framing distinct from the mock degradation may be appropriate at that point. Not Spec 9.)

The new bridges (BibleReader → Ask, Daily Hub Devotional → Ask) feed user-shaped questions into AskPage's existing infrastructure. The pre-fill text comes from app-controlled sources (verse text from the Bible JSON, reflection question from the devotional content) — neither is free-form user input. After auto-submit, the conversation flow is identical to a question typed directly into the textarea: same crisis detection, same classifier path, same response shape, same rate limits (per `02-security.md` § "Rate Limiting" — AI requests are rate-limited per IP today, per user once Forums Wave Phase 1 lands). The Memorize button on response verse cards writes verse data (already-vetted scripture, not free-form user input) to the BB-45 store; no AI input involved.

---

## Auth & Persistence

- **Logged-out users:** Demo-mode zero-persistence rule applies for backend writes. Conversation state lives in `useState<ConversationPair[]>` and is lost on refresh — no localStorage shadow added in Spec 9 (deferred to Spec 9b alongside potential Forums Wave Phase 3 backend `ask_threads` table). Memorize button writes to localStorage `wr_memorization_cards` (existing BB-45 key, per `11b-local-storage-keys-bible.md`) regardless of auth — this is consistent with the Bible Wave Auth Posture per `02-security.md`. Highlight, Save note, Share actions on Ask response verse cards: behavior preserved exactly from current AskPage (Highlight writes to `wr_bible_highlights`; Save note writes to `bible:notes`; Share copies to clipboard or surfaces native share sheet). Thumbs-up/down feedback writes to `wr_chat_feedback` regardless of auth — schema unchanged in Spec 9 (no entry-source field added; deferred to Spec 9b). `wr_journal_draft` and `wr_prayer_draft` are not touched by AskPage. The browser-based `wr_push_subscription` is not affected.
- **Logged-in users:** Same as logged-out for AskPage core flow — conversation in `useState`, no backend persistence in Spec 9. SaveConversationButton renders for logged-in users; on click, copies conversation to clipboard (despite the name, no real save — Spec 9b). Memorize button writes to `wr_memorization_cards` identically to logged-out users. All existing logged-in behavior on response verse cards (Highlight, Save note, Share) preserved exactly.
- **localStorage usage:** No new keys introduced. Spec 9 reads/writes to existing keys via existing reactive stores: `wr_memorization_cards` (BB-45 — read via `useMemorizationStore()` Pattern A hook, write via `addCard` / `removeCard`). Existing AskPage keys (`wr_chat_feedback`) preserved exactly. The two bridges read no localStorage (they are pure navigations); they write no localStorage on click (the destination AskPage behavior on `?q=` arrival is the same as homepage typewriter `?q=` arrival, which writes nothing to localStorage on auto-submit beyond what normal AskPage usage writes).
- **Reactive store consumption.** Per `06-testing.md` § "Reactive Store Consumer Pattern" and `11b-local-storage-keys-bible.md` § "Reactive Store Consumption", VerseCardActions consumes the BB-45 memorization store via the standalone `useMemorizationStore()` hook (Pattern A — `useSyncExternalStore`-based). This avoids the BB-45 anti-pattern (snapshot-without-subscription). Tests for VerseCardActions verify cross-mount sync (mutate the store from outside the component, assert the component re-renders) — see Change 11.
- **Route type.** `/ask` is **Public** (no authentication required). The two bridge sources — `/bible/:book/:chapter` and `/daily?tab=devotional` — are both Public. No new protected routes introduced.

---

## Completion & Navigation

AskPage is not a Daily Hub tabbed surface; it is a standalone outer page. Spec 9 does not change AskPage's navigation shape — no new "completion" signal is added (the conversation is open-ended), no new CTA wiring beyond the existing "Ask another question" affordance after the first response lands.

The two new bridges are CCC entry points into AskPage, not exits:
- **BibleReader → Ask** — closes the verse action sheet, navigates to `/ask?q=<prefilled>`, the existing `?q=` handler auto-submits on mount. The user experiences a single fluid handoff from "I tapped a verse to ask about it" to "the AI is processing my question." After the response lands, the user can continue the conversation via Dig Deeper chips or "Ask another question."
- **Daily Hub Devotional → Ask** — does not switch tabs (unlike "Journal about this question" which switches Daily Hub to the Journal tab). It navigates AWAY from Daily Hub to the standalone `/ask` page. After the conversation, the user navigates back to Daily Hub via the navbar (or browser back button) to continue with their devotional flow. This is consistent with how the Daily Hub Pray flow handles questions that grow into longer conversations: the canonical answer is "follow the bridge to the dedicated surface."

No completion tracking, no streak signal, no faith points awarded for using Ask (Ask is not a tracked activity per `useFaithPoints` — confirmed by recon). The two bridges do not change this. The Memorize button on Ask verse cards adds a card to BB-45 — which, on BibleReader, triggers the `recordChapterVisit` + `markChapterRead` chapter-mount effect. Ask is not a chapter, so that effect does not fire from AskPage; only the BB-45 store mutation happens.

---

## Design Notes

- **Atmospheric layer.** `<BackgroundCanvas>` is the canonical outer-surface treatment per `09-design-system.md`. Visual aspects to match: radial bloom positions, blur intensity, color palette. AskPage's atmospheric register after Spec 9 should feel identical to Dashboard, Local Support, BibleLanding, PlanBrowserPage, CreatePlanFlow.
- **Textarea violet-glow.** Canonical per `09-design-system.md` § "Textarea Glow Pattern" — exact class string is `border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:ring-violet-400/30 placeholder:text-white/40`. Visual aspects to match: the rgba opacity values, the dual-shadow stack (20px / 40px blur), the focus state's border opacity bump (30 → 60), the focus ring opacity (30). After Spec 9 the AskPage textarea reads as visually indistinguishable from Daily Hub Pray and Journal textareas at rest and on focus.
- **Memorize button chrome.** Match the action-button chrome of the existing Highlight / Save note / Share buttons in `VerseCardActions.tsx`. The Memorize button is a sibling action — same visual register, same icon size (`h-4 w-4`), same hover/active states, same text styling. The Lucide icon must match BibleReader's verse action sheet memorize icon (verify during execution per pre-execution Step 16).
- **BibleReader VerseActionSheet new entry.** Match the chrome of the existing Explain and Reflect entries (the two AI-adjacent actions Ask sits next to). Same icon size, same label typography, same tap-target dimensions, same focus/hover treatment. Visual aspects to match: the icon/label horizontal alignment, the button border-radius, the press-state animation duration (`ANIMATION_DURATIONS.fast`).
- **Daily Hub Devotional new inline CTA.** Match the chrome of the existing "Journal about this question" CTA in `DevotionalTabContent.tsx` exactly — `<Button variant="subtle" size="sm">` with the same icon (Lucide `MessageCircle` or whichever the existing CTAs use), same label typography, same horizontal placement within the CTA group. Visual aspects to match: the gap between the CTA group's siblings, the wrapping behavior at small viewports, the focus/hover ring.
- **BB-33 animation token discipline.** All animation durations and easings come from `frontend/src/constants/animation.ts`. The focus management `setTimeout(100ms)` is preserved exactly (already in code). The textarea transition durations are inherited from the canonical violet-glow class string and are not hardcoded in AskPage. No new hardcoded `200ms` or `cubic-bezier(...)` strings introduced.
- **No new visual primitives.** Spec 9 does not introduce any patterns NOT yet captured in the design system — every chrome decision derives from the existing canonical pattern set. The only "new" thing is the verse-action `'ask'` registry entry, which is not a visual primitive but a data-shape extension.

References to `_plans/recon/design-system.md` for exact CSS values: BackgroundCanvas radial-bloom rgba values, the violet-glow shadow rgba values (167,139,250 = violet-400 in the design system table), the FrostedCard glass tier opacities, the white-pill submit-button shadow values. If `_plans/recon/design-system.md` is absent at execution time, fall back to the canonical class strings in `09-design-system.md` directly.

---

## Out of Scope

Per direction Decisions 11–17, recon Appendix B, and the spec brief's explicit exclusions:

- **Conversation persistence.** No localStorage shadow added; no `ask_threads` backend table; conversation lives in `useState` and is lost on refresh. Spec 9b.
- **`/ask/history` page.** Spec 9b.
- **Backend `ask_threads` schema.** Spec 9b alongside Forums Wave Phase 3.
- **Streaming response.** Spec 9b/future. Current 30-second-blocking AI request preserved.
- **Cancel/abort during loading.** No user-visible cancel button during the 30-second AI request window. Couples to conversation persistence (do we save partial state? do we keep the pending question?). Spec 9b.
- **Refined error UX framing.** Silent-mock-fallback preserved exactly. Spec 9b will revisit when conversation persistence ships.
- **Conversation virtualization.** Spec 9b.
- **BB-46 echo integration with Ask history.** Do not wire — would dilute echo signal. Spec 9c at earliest with explicit user save.
- **Shareable Canvas card for Ask answers.** Focused future spec.
- **BibleReader top-toolbar Ask entry.** Spec 9c. Decision 13 boundary preserved — no new icon there.
- **MyBible → Ask history surface.** Spec 9c.
- **Prayer Wall ↔ Ask cross-feature wiring.** Spec 9c.
- **Ask response → Bible note one-tap save.** Spec 9c.
- **Ask response → Bible journal one-tap save.** Spec 9c.
- **Ask response → Daily Hub journal entry better-than-state-passing.** Spec 9c.
- **`/register` GlowBackground migration.** Spec 13.
- **Sound effects on response arrival.** Future polish.
- **Read-aloud (`useReadAloud()`) for Ask answers.** Future polish.
- **Ambient sound suggestion on /ask.** Future polish.
- **Time-of-day-aware popular-topics rotation.** Future polish.
- **Cmd/Ctrl+Enter submit shortcut.** Future polish.
- **Verse share UX consistency (page-level vs verse card).** Future polish.
- **Hook extraction refactor on AskPage.** Spec 9b refactor pass.
- **VerseCardActions inline note composer textarea white-glow → violet-glow migration.** Touches Bible reader audit territory. Defer.
- **`wr_chat_feedback` schema expansion (entry-source field).** Spec 9b alongside conversation persistence schema work.
- **SaveConversationButton real save flow (localStorage shadow / backend / shareable URL).** Spec 9b.
- **AI prompt template / system prompt changes.** Closed scope. `AskPrompts.java`, `AskService.java`, `AskCrisisDetector.java`, `AskController.java`, all DTOs preserved exactly.
- **Backend Gemini integration changes.** Closed scope.
- **Model swap (Gemini 2.5 Flash Lite → other).** Closed scope.
- **BB-32-style cache for Ask answers.** Out of scope. The Ask flow does not benefit meaningfully from per-question caching the way BB-30/BB-31 benefit from per-verse caching.
- **Crisis detection logic changes (server + client).** Preserved exactly.
- **30-second timeout + silent-mock-fallback changes.** Preserved exactly.
- **`ReaderChrome` top toolbar changes.** Decision 13 boundary preserved — no new icon there.
- **Other reader sub-views (TypographySheet, AmbientAudioPicker, CrossRefsSubView, ShareSubView, NoteEditorSubView, BookmarkLabelEditor, HighlightColorPicker).** Unchanged.
- **`BibleReader.tsx` page structure.** Unchanged. No ambient panel below ReaderBody.
- **`ConversionPrompt` changes.** Already canonical. The `animate-shine` on its white-pill register CTA is preserved.
- **`PopularTopicsSection` changes.** Already canonical. The intentional 5 topic FrostedCards (not 6) preserved per recon resolution.
- **Hero h1, hero subtitle, loading state copy.** All already canonical. Preserved exactly.
- **Find Answers button chrome class string.** Already canonical white pill. Preserved exactly.
- **`useState<ConversationPair[]>` state shape.** Preserved. No backend persistence, no localStorage shadow.
- **Non-Ask, non-bridge surfaces.** All Bible cluster surfaces (8B/8C/8A) unchanged. Daily Hub Pray and Journal tabs unchanged. Homepage typewriter `?q=` flow unchanged. Dashboard, Auth, MyBible, Local Support, Grow, Music, Friends, Insights, Settings, Notifications all unchanged.

---

## Acceptance Criteria

### Atmospheric migration
- [ ] `frontend/src/pages/AskPage.tsx` no longer imports `GlowBackground` or wraps content in `<GlowBackground variant="fullPage">`.
- [ ] `frontend/src/pages/AskPage.tsx` imports `BackgroundCanvas` and wraps content in `<BackgroundCanvas>`.
- [ ] `grep -rn "GlowBackground" frontend/src/pages/AskPage.tsx frontend/src/components/ask/` returns zero matches.
- [ ] Hero, conversation thread, popular topics, conversion prompt, and footer all render correctly under `<BackgroundCanvas>` at all three breakpoints.
- [ ] `pages/__tests__/AskPage.test.tsx` glow-orb count assertion replaced with BackgroundCanvas presence check (matches the precedent at `LocalSupportHero.test.tsx:99`).
- [ ] The existing `bg-dashboard-dark` negative assertion at `pages/__tests__/AskPage.test.tsx:88` continues to pass.

### Textarea migration
- [ ] AskPage textarea uses canonical violet-glow class string per `09-design-system.md` § "Textarea Glow Pattern": `border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:ring-violet-400/30 placeholder:text-white/40`.
- [ ] Placeholder copy `"What's on your heart? Ask anything..."` UNCHANGED.
- [ ] All textarea behavior preserved: `rows={3}` initial size, `autoExpand` callback, `maxLength={ASK_MAX_LENGTH}`, `aria-label="Your question"`, `aria-describedby="ask-char-count"`, `resize-none`, Enter-inserts-newline (no `onKeyDown` added), 500-char limit.
- [ ] On focus, the textarea border opacity transitions from 30 to 60 and the violet ring renders.
- [ ] `VerseCardActions` inline note composer textarea (different file, different surface) is UNCHANGED — out of scope.

### A11y wins
- [ ] Loading wrapper at `AskPage.tsx:370` area has `role="status"` and `aria-busy="true"` attributes.
- [ ] Loading wrapper has a leading `<span className="sr-only">Searching Scripture for wisdom</span>` that survives any future visible-text restyle.
- [ ] On response arrival, focus moves to the latest response's `<h2>` "What Scripture Says" via the new `tabIndex={-1}` + `id="latest-response-heading"` + `focus({ preventScroll: true })` sequence.
- [ ] `scrollIntoView` still fires for visual continuity alongside the focus move.
- [ ] Reduced-motion fallback is preserved on `scrollIntoView` behavior.
- [ ] AskResponseDisplay accepts a new `isLatestResponse?: boolean` prop; only the last conversation pair receives it as `true`.
- [ ] Submit button has `disabled={!text.trim() || isLoading}` (defense-in-depth — `showInput` still unmounts the button during loading at line 233 area).
- [ ] Submit button has `aria-label={isLoading ? 'Searching Scripture' : 'Find Answers'}`.
- [ ] Submit button class string UNCHANGED (canonical white pill).
- [ ] Submit button visible text "Find Answers" UNCHANGED.
- [ ] Submit button `min-h-[44px]` UNCHANGED.
- [ ] The parent `aria-live="polite"` on the conversation thread at `AskPage.tsx:333` area is preserved exactly.

### Memorize button
- [ ] `VerseCardActions.tsx` renders four actions in this order: **Highlight, Memorize, Save note, Share**.
- [ ] Memorize button uses `useMemorizationStore()` Pattern A hook from `@/hooks/bible/useMemorizationStore`.
- [ ] Toggles via `addCard` / `removeCard` from `lib/memorize/store`; toggle-state checked via `isCardForVerse(verseRef, card)`.
- [ ] Updates reactively when the store mutates — adding the same verse from BibleReader updates the Ask verse card's button state without a remount.
- [ ] Auth posture is **unauthenticated** — no `useAuthModal()` trigger; logged-out users can memorize without an auth modal.
- [ ] `aria-pressed` reflects in-deck state (`true` when memorized, `false` when not).
- [ ] `aria-label` is `Memorize this verse` when not memorized and `Remove from memorization deck` when memorized.
- [ ] Visible button text is "Memorize" when not memorized and "Memorized" when memorized.
- [ ] Lucide icon matches BibleReader's verse action sheet memorize icon (verify during execution).
- [ ] Mobile wrap behavior is acceptable — 2x2 grid on small viewports, single row on desktop.
- [ ] Each action button retains `min-h-[44px]` tap target.
- [ ] Highlight, Save note, and Share actions' behavior unchanged from current AskPage.

### BibleReader bridge
- [ ] `'ask'` action registered in `frontend/src/lib/bible/verseActionRegistry.ts` next to `'explain'` and `'reflect'`.
- [ ] Action has `hasSubView: false` and `requiresAuth: false`.
- [ ] `VerseAction` type union includes `'ask'`.
- [ ] `frontend/src/lib/bible/verseActions/buildAskUrl.ts` exists and mirrors `buildDailyHubVerseUrl.ts` pattern.
- [ ] URL format: `/ask?q=<encoded "Help me understand <reference>: \"<verse text>\"">`. The `formatReference` and `getSelectionText` helpers are reused (not duplicated).
- [ ] `VerseActionSheet.tsx` handles the new action — clicking "Ask about this passage" navigates to the ask URL and closes the sheet.
- [ ] `'ask'` is NOT in `DEEP_LINKABLE_ACTIONS` in `lib/url/validateAction.ts`.
- [ ] `ReaderChrome` top toolbar UNCHANGED.
- [ ] All other reader sub-views UNCHANGED.
- [ ] Focus mode behavior UNCHANGED — verse action sheet works in focus mode after Ask joins it.
- [ ] BibleReader Layout Exception (Decision 13) boundary preserved — no other reader chrome changes.

### Daily Hub Devotional bridge
- [ ] "Ask about this" inline CTA added to `DevotionalTabContent.tsx`.
- [ ] Chrome: `<Button variant="subtle" size="sm">` matching the existing "Journal about this question" CTA.
- [ ] Routes to `/ask?q=<encoded reflection question>` (the reflection question text passed directly without "Help me understand" wrapping per direction Decision 7).
- [ ] Reuses the existing prefix-stripping logic (strips "Something to think about today: " prefix) from the existing CTAs.
- [ ] Composition (asChild+Link vs useNavigate vs callback indirection) matches the existing CTAs' shape in this file.
- [ ] Existing "Journal about this question" and "Pray about this" CTAs UNCHANGED.
- [ ] Daily Hub Pray and Journal tabs UNCHANGED — only Devotional tab is modified.

### Bridge auto-submit
- [ ] Both bridges trigger AskPage's existing `?q=` auto-submit on mount.
- [ ] `pendingAutoSubmitRef` race-condition guard against React Strict Mode double-mount is preserved exactly.
- [ ] User lands on AskPage and sees their question being processed without additional clicks.
- [ ] BibleReader bridge: question pre-fill format is `Help me understand <reference>: "<verse text>"`.
- [ ] Daily Hub Devotional bridge: question pre-fill is the reflection question text directly (no "Help me understand" wrapping).

### AI integration preservation
- [ ] All AI proxy endpoints unchanged.
- [ ] `AskController.java`, `AskService.java`, `AskCrisisDetector.java`, `AskPrompts.java`, all DTOs preserved exactly.
- [ ] `services/ask-service.ts` silent-mock-fallback preserved exactly.
- [ ] `mocks/ask-mock-data.ts` 16-topic fallback unchanged.
- [ ] Crisis detection unchanged (server `AskCrisisDetector` + client `CrisisBanner`).
- [ ] Conversation history pass-through unchanged.
- [ ] 30-second timeout unchanged.
- [ ] Streaming NOT introduced.
- [ ] BB-32 cache NOT introduced for Ask responses.
- [ ] Crisis banner still triggers on textarea text matching crisis keywords.

### State preservation
- [ ] Conversation state still in `useState<ConversationPair[]>` — no localStorage shadow added.
- [ ] No new localStorage keys introduced (Spec 9 reads/writes only existing keys via existing reactive stores).
- [ ] `wr_chat_feedback` schema unchanged.
- [ ] SaveConversationButton still clipboard-copy-only (despite the name, no real save).
- [ ] SaveConversationButton still renders `null` for logged-out users.
- [ ] ConversionPrompt unchanged.
- [ ] PopularTopicsSection unchanged (intentional 5 topic FrostedCards preserved).
- [ ] DigDeeperSection, LinkedAnswerText, UserQuestionBubble unchanged.

### Tests
- [ ] All existing tests pass; updated tests pass; no new failures (regression baseline preserved per CLAUDE.md § "Build Health").
- [ ] BackgroundCanvas presence test replaces glow-orb count test in `pages/__tests__/AskPage.test.tsx`.
- [ ] A11y test for loading region semantics added (asserts `aria-busy`, `role="status"`, sr-only text).
- [ ] A11y test for focus management on response arrival added (asserts `document.activeElement` matches the heading).
- [ ] A11y tests for submit button defensive disabled guard added (asserts `disabled` and `aria-label` switch on `isLoading`).
- [ ] AskResponseDisplay test for `isLatestResponse` prop added (h2 has id+tabIndex when true, lacks both when false).
- [ ] VerseCardActions tests for memorize button use real BB-45 store + mutate-from-outside pattern with `_resetForTesting()` between tests.
- [ ] VerseCardActions test asserts logged-out users can memorize without an auth modal.
- [ ] verseActionRegistry test asserts the `'ask'` action is registered with `hasSubView: false` and `requiresAuth: false`.
- [ ] buildAskUrl tests cover single-verse, range, and special-character encoding.
- [ ] VerseActionSheet test asserts clicking the Ask button navigates to the ask URL and closes the sheet.
- [ ] DevotionalTabContent test asserts the new "Ask about this" CTA renders and routes correctly.
- [ ] Bridge entry test in AskPage test file asserts auto-submit fires from `?q=`.
- [ ] `pnpm typecheck` passes cleanly.
- [ ] `pnpm build` succeeds.

### Manual eyeball checks
- [ ] `/ask` renders with `<BackgroundCanvas>` atmosphere — radial blooms visible at edges, matching Dashboard / Local Support / BibleLanding atmospheric register.
- [ ] Textarea has violet glow on focus (matches Daily Hub Pray/Journal at rest and on focus, side-by-side comparison).
- [ ] Submit a question → loading region announces correctly to screen readers ("Searching Scripture for wisdom" via the sr-only span and `role="status"` + `aria-busy="true"`).
- [ ] Response arrives → keyboard focus visibly moves to "What Scripture Says" h2 (verifiable via `document.activeElement` in DevTools or via a screen reader announcing the heading).
- [ ] Response verse cards show four actions in this order: Highlight, Memorize, Save note, Share.
- [ ] Click Memorize on a response verse card → button updates to "Memorized" state with `aria-pressed={true}`.
- [ ] Click Memorized → button reverts to "Memorize" state with `aria-pressed={false}`.
- [ ] Logged-out user can click Memorize without an auth modal interruption.
- [ ] Add a verse to memorization deck from BibleReader (different surface), navigate back to an Ask response containing the same verse → button reflects "Memorized" reactively without page refresh.
- [ ] From BibleReader: tap a verse → action sheet shows Ask option next to Explain and Reflect → tap Ask → land on `/ask?q=<...>` with the question auto-submitting.
- [ ] From Daily Hub Devotional: click "Ask about this" inline CTA → land on `/ask?q=<reflection question>` with the question auto-submitting. The reflection question text appears in the question bubble exactly (no "Help me understand" prefix).
- [ ] Crisis banner still triggers on textarea text matching crisis keywords.
- [ ] OfflineNotice still renders when offline.

### Regression checks
- [ ] All Bible cluster surfaces (8B/8C/8A) unchanged.
- [ ] BibleReader chrome unchanged (Decision 13 preserved).
- [ ] All other reader sub-views unchanged (TypographySheet, AmbientAudioPicker, CrossRefsSubView, ShareSubView, NoteEditorSubView, BookmarkLabelEditor, HighlightColorPicker).
- [ ] `BibleReader.tsx` page structure unchanged (no ambient panel below ReaderBody).
- [ ] Daily Hub Pray and Journal tabs unchanged.
- [ ] Daily Hub `MeditateTabContent` unchanged.
- [ ] Homepage typewriter `?q=` flow unchanged.
- [ ] All non-Ask, non-bridge surfaces unchanged (Dashboard, Auth, MyBible, Local Support, Grow, Music, Friends, Insights, Settings, Notifications).
- [ ] `/register` GlowBackground migration NOT in scope — `/register` still uses `<GlowBackground variant="fullPage">` after Spec 9 (Spec 13 will migrate).
- [ ] Lighthouse Performance 90+ on `/ask` preserved.
- [ ] Lighthouse Accessibility 95+ on `/ask` preserved (likely improved by the three a11y wins).
- [ ] Lighthouse Best Practices 90+ on `/ask` preserved.
- [ ] Lighthouse SEO 90+ on `/ask` preserved.
- [ ] Frontend regression baseline: 9,470 pass / 1 pre-existing fail (or 9,469/2 with the flaky `useNotifications` test). Spec 9 may add 20–40 tests; the new failure count should remain at 1 (or 2) and no NEW failing file introduced.
- [ ] Backend regression baseline preserved (no backend changes in Spec 9).
- [ ] Bundle size delta: roughly +1–2 KB minified — well within the canonical bundle-budget tolerance.
