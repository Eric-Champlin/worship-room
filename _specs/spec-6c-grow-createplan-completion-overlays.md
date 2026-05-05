# Spec 6C: CreatePlanFlow + Completion Overlays

**Master Plan Reference:** Direction document at `_plans/direction/grow-2026-05-04.md` is the locked decision set (15 numbered decisions, with one refinement noted in this spec). Recon at `_plans/recon/grow-create-overlays-2026-05-04.md` is the source of truth for the current state of CreatePlanFlow and the four celebration overlays. This is the third and final Grow sub-spec. Spec 6A (Grow shell + Plans tab + Challenge cards) shipped first; Spec 6B (detail pages + day content + not-found pages) shipped second; this spec lands the create surface and all four celebration overlays. After 6C ships, the Round 3 visual migration covers Homepage → DailyHub → BibleLanding/plans → Dashboard → Local Support → Grow — the full top-level user-facing surface. Each sub-spec is independently shippable; failures in one do not block the others. The split mirrors Dashboard 4A/4B/4C.

This spec lands four pattern types: BackgroundCanvas atmospheric replacement of `CREATION_BG_STYLE`, canonical violet textarea glow replacing the cyan one-off, Caveat removal across 5 sites (3 with `GRADIENT_TEXT_STYLE` migration and 2 with `themeColor` preservation per the refinement below), and `bg-primary` solid CTA migration to `<Button variant="subtle">` (2 sites) and `<Button variant="gradient">` (1 site — the canonical climax). The gradient variant is a Button primitive extension if it doesn't already exist; pre-execution recon determines which path applies.

Patterns this spec USES (already shipped): `FrostedCard` `default` + `subdued` variants, multi-bloom `BackgroundCanvas`, `Button` `subtle` variant + `asChild` prop, the canonical violet textarea glow pattern (originated on DailyHub Pray/Journal during Round 4), `GRADIENT_TEXT_STYLE`, `ATMOSPHERIC_HERO_BG` (preserved on overlays where applicable), the theme-color inline-style preservation pattern (Decision 8 throughout the Grow rollout). Patterns this spec INTRODUCES: `<Button variant="gradient">` primitive variant (added in Change 9 if not already present). Patterns this spec MODIFIES: Direction doc Decision 6 — see "Refinement to direction doc" below.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. The recon and direction docs are intentional input context for this spec and remain on disk regardless of git state.

---

## Affected Frontend Routes

- `/grow?create=true` — primary surface for CreatePlanFlow; receives BackgroundCanvas wrap (replacing CREATION_BG_STYLE), 2 hero h1 Caveat removals (StepOne + StepTwo), cyan textarea glow → canonical violet textarea glow, Step 1 Next button → subtle Button, Step 2 Generate button → gradient Button (canonical climax site), CrisisBanner + CharacterCount safety wiring preserved unchanged
- `/reading-plans/:planId` — surfaces `PlanCompletionOverlay` (Caveat h2 → GRADIENT_TEXT_STYLE merged with fadeStyle) on plan completion AND `DayCompletionCelebration` (Continue button → subtle Button) on per-day completion
- `/challenges/:challengeId` — surfaces `ChallengeCompletionOverlay` (Caveat h2 → drop font-script, retain themeColor inline style per refinement) on final-day completion AND `MilestoneCard` (Caveat h2 → drop font-script, retain themeColor) on milestone-day completion
- `/grow?tab=plans` — regression surface (Spec 6A — verify nothing drifts after CreatePlanFlow migration lands)
- `/grow?tab=challenges` — regression surface (Spec 6A)
- `/grow` (no query) — regression surface (Spec 6A — verify shell unchanged)
- `/reading-plans` — legacy redirect to `/grow?tab=plans`; verify redirect still fires post-migration
- `/challenges` — legacy redirect to `/grow?tab=challenges`; verify redirect still fires post-migration
- `/` — regression surface (Dashboard — verify atmospheric continuity)
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surface (the canonical violet textarea glow originated here; verify it still reads identically post-migration)
- `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — regression surface (Spec 5)
- `/bible` — regression surface (BibleLanding atmospheric continuity)

---

## Refinement to direction doc

**Direction doc Decision 6 refinement (Challenge celebration h2s):** Direction doc states "ALL `font-script` Caveat usages migrate to `GRADIENT_TEXT_STYLE`. No exceptions." This spec refines that intent for two sites: `ChallengeCompletionOverlay.tsx:191` and `MilestoneCard.tsx:109`. Both h2s currently combine `font-script` with `style={{ color: themeColor }}`. This spec drops the `font-script` class (Caveat fully deprecated, consistent with Decision 6) but RETAINS the `style={{ color: themeColor }}` inline style. `GRADIENT_TEXT_STYLE` is NOT applied to these two sites because doing so would override the themeColor with the white-to-purple gradient and flatten 5 seasonal palette identities (Lent purple, Easter gold, Pentecost red, Advent deep blue, New Year token) into a single uniform brand expression at the most emotional moment of the challenge.

The themeColor on a celebration h2 IS the brand expression — the same logic Decision 8 applied to ChallengeCompletionOverlay's badge swatch (`style={{ backgroundColor: themeColor, opacity: 0.7 }}`), confetti palette (`[themeColor, '#FFD700', '#FFFFFF']`), Mark Complete button (`style={{ backgroundColor: themeColor }}`), and MilestoneCard's share button (`style={{ backgroundColor: themeColor }}`). Keeping themeColor on the celebration heading aligns the heading with the rest of the celebration surface's brand expression rather than introducing an inconsistency where the heading uses gradient and everything around it uses themeColor.

The third Caveat site on a celebration overlay (`PlanCompletionOverlay.tsx:192`, "Plan Complete!") has NO themeColor — reading plans don't carry a themeColor concept — so it gets the canonical Decision 6 treatment: drop `font-script`, apply `GRADIENT_TEXT_STYLE` merged with the existing `fadeStyle(3)` style spread.

This is parallel to Spec 6B's Decision 6 refinement on PlanNotFound + ChallengeNotFound recovery links (which migrated to subtle Button rather than plain underlined link). Direction doc remains authoritative on intent (drop Caveat, never use deprecated patterns); each spec implements that intent contextually for the specific surfaces it touches. Recorded here so future readers and the inevitable cross-spec audit have the trail.

**5 Caveat removal sites total in 6C scope:**
- 3 sites get `GRADIENT_TEXT_STYLE`: `CreatePlanFlow.tsx:182` (StepOne h1), `CreatePlanFlow.tsx:251` (StepTwo h1), `PlanCompletionOverlay.tsx:192` (h2)
- 2 sites get themeColor-preserved plain bold heading: `ChallengeCompletionOverlay.tsx:191` (h2), `MilestoneCard.tsx:109` (h2)

---

## Overview

CreatePlanFlow is the create surface for the Reading Plans feature — a 3-step form where a user types what's on their heart, picks a journey duration (7/14/21 days), and the app matches them to a personalized plan via deterministic keyword matching wrapped in a 2.5-second simulated AI generation animation. It is the highest-density deprecated-pattern surface in the Grow rollout: an inline `radial-gradient + linear-gradient` `CREATION_BG_STYLE` constant that hardcodes the create surface's atmospheric layer (instead of consuming `BackgroundCanvas`); two `font-script` Caveat h1s ("What's on your heart?" / "How long of a journey?") that predate Decision 6's Caveat retirement; a cyan textarea glow (`border-glow-cyan/30` + cyan box-shadow `rgba(0,212,255,0.35)`) that's the last surviving cyan-glow holdout in the app — every other authoring textarea (DailyHub Pray, DailyHub Journal) uses the canonical violet glow; and two `bg-primary` solid CTAs (Step 1 Next, Step 2 Generate) that need different treatments per Decision 9's emotional-weight tiering.

The four celebration overlays are the emotional peaks of the Grow feature cluster — the moments a user has been working toward. `PlanCompletionOverlay` fires when a user finishes the last day of a reading plan (portal-rendered to `document.body`, 7-step animation sequence revealing icon → heading → plan title → stats card → scripture → CTAs over 2 seconds, `'ascending'` sound effect on heading reveal, Lora-italic scripture blockquote, 15-second auto-dismiss, canonical `useFocusTrap()` hook). `ChallengeCompletionOverlay` fires on final-day Mark Complete in ChallengeDetail (also portal-rendered, custom focus trap rolls own, click-outside-to-dismiss enabled, 12-second auto-dismiss, theme-color brand expression at 3 sites: h2, badge swatch, confetti palette). `MilestoneCard` is inline (not a portal) and renders within ChallengeDetail's flow when a milestone day fires (e.g., "Week 1 Complete!" / "Halfway There!"), generating a share image via Canvas and prompting the user to share or keep going. `DayCompletionCelebration` is the simplest of the four — inline within ReadingPlanDetail's flow, a top-border-divider section with an animated SVG checkmark, an optional "+15 pts" pill, and a Continue button (only renders when `!isLastDay`).

This spec migrates all five surfaces in one coordinated change set. The CreatePlanFlow migration is the densest — six independent changes on a single file (atmospheric layer, two Caveat h1s, textarea glow, two button migrations) — and includes a primitive extension to support the gradient Generate button. The four overlays are smaller individual changes (one Caveat removal each, plus one bg-primary migration on DayCompletionCelebration). Together they complete the Grow visual migration.

The migration is visual + class-string + primitive-extension. No data-fetching changes, no hook changes (`useFaithPoints.recordActivity`, `playSoundEffect`, `useFocusTrap`, `useReducedMotion`, `useAuth`, `addCustomPlanId`, `matchPlanByKeywords`, `showToast`, `showCelebrationToast`, `generatePlanCompletionImage`, `generateChallengeShareImage`), no new sound effects, no new auth gates, no new localStorage keys. Behavioral preservation is non-negotiable: every existing test that asserts on behavior — step transitions, chip pre-fill, character count visibility, escape-key navigation, back-arrow visibility, focus-trap behavior, click-outside-to-dismiss, auto-dismiss timeouts, body scroll lock, confetti rendering with motion-reduce safety net, sound effects firing at the right moment, ARIA wiring including `aria-describedby` on the textarea connecting to CharacterCount's `id`, `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on both completion overlays, share-image generation, focus restoration on overlay dismiss — must continue to pass without modification.

Two safety-critical surfaces require explicit verification: `<CrisisBanner text={topicText} />` mounts inside StepOne directly above the textarea and must stay there with its `text={topicText}` prop wired so crisis keywords detected as the user types fire crisis resources immediately; and `<CharacterCount ... id="plan-char-count" />` mounts directly below the textarea with `aria-describedby="plan-char-count"` on the textarea connecting the two for screen reader announcements. These are behavior-defining components, not visual chrome — the visual migration touches the textarea's class string only.

After this spec ships, all 9 Caveat sites enumerated in Decision 6 are migrated (2 from 6B's hero h1s — only ReadingPlanDetail had one, ChallengeDetail's was already correct; 2 from PlanNotFound + ChallengeNotFound recovery links per 6B's refinement; 5 from this spec's overlay h2s and CreatePlanFlow h1s). All 4 `bg-primary` solid CTA sites enumerated in Decision 9 are migrated (1 from 6A's ConfirmDialog "Pause & Start New" + 3 from this spec). The cyan textarea glow holdout is gone. CREATION_BG_STYLE is deleted. The Round 3 visual system covers the entire user-facing surface area of the app.

---

## User Story

As a **logged-out visitor or logged-in user opening the create flow at `/grow?create=true`**, I want the create surface to feel like the same calm, atmospheric room as the rest of the Grow cluster — gentle blooms gently visible behind the step cards, the StepOne heading "What's on your heart?" rendering as a uniform violet-to-white gradient (not a Caveat-script flourish that reads as decorative whimsy on what should be a focused authoring moment), the textarea glowing in the same intimate violet hue as the Pray and Journal textareas on DailyHub (so I recognize "this is where I write something meaningful" without thinking about it), the Next button at the bottom of StepOne reading as quiet utility navigation, and the Generate My Plan button at the bottom of StepTwo announcing itself as the climax — a gradient showstopper button that signals "you're about to receive something personalized" because that IS what the moment is. When I'm a fraction of a second from generating my plan, the textarea must still be wired to the CrisisBanner so that if I typed something concerning while writing what's on my heart, the resources appear immediately above the textarea — and the character count below the textarea must still announce zone changes ("approaching limit", "near limit") via screen reader so I'm aware as I write.

When I complete a reading plan and the `PlanCompletionOverlay` fires, the "Plan Complete!" heading should match the canonical celebration aesthetic (gradient text, dropped Caveat script) while the rest of the overlay — the 7-step animation sequence that fades in icon, heading, plan title, stats, scripture, and CTAs over 2 seconds; the ascending sound effect on the heading's reveal; the italic Lora scripture blockquote; the 15-second auto-dismiss; the focus trap that restores my focus when I press Escape — works exactly as it did before. When I complete the final day of a challenge and the `ChallengeCompletionOverlay` fires, the challenge title heading should still wear the seasonal themeColor (the way Lent purple identifies the Lent challenge from the Easter challenge at the celebration moment is brand expression I'd lose if it flattened to a uniform gradient) while the rest of the overlay — the 5 sub-CTA cards in their 2-column grid, the badge swatch in themeColor, the confetti palette including themeColor + gold + white, the click-outside-to-dismiss, the 12-second auto-dismiss, the custom focus trap, the share image generation — works exactly as it did before. Same pattern when a milestone day fires and `MilestoneCard` renders inline within the challenge detail page (smaller heading at `text-3xl sm:text-4xl` reflecting incremental rather than final-climax weight, but still wearing the themeColor on the heading and the themeColor on the share button).

When I complete an interim day on a reading plan and `DayCompletionCelebration` renders inline, the Continue button I tap to move to the next day should read as quiet utility (subtle Button, not gradient showstopper) because per-day completion is incremental — the gradient is reserved for moments when something genuinely new is being created (Generate My Plan in CreatePlanFlow). The animated SVG checkmark, the optional "+15 pts" pill, the conditional render gating on `!isLastDay` (no Continue button on the final day, since PlanCompletionOverlay handles that climax), the reduced-motion safety net — all of that works exactly as it did before.

---

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. **Verify Spec 6A and Spec 6B are merged into the working branch.** Spec 6A landed: `BackgroundCanvas` wraps below-hero content on `/grow`; PlanCard / UpcomingChallengeCard / ActiveChallengeCard / NextChallengeCountdown / PastChallengeCard / HallOfFame all consume `FrostedCard`; Tonal Icon Pattern applied on Plans + Challenges tab icons; dead `FilterBar.tsx` deleted; ConfirmDialog "Pause & Start New" migrated to subtle Button. Spec 6B landed: `BackgroundCanvas` wraps below-hero content on `/reading-plans/:planId` and `/challenges/:challengeId`; ReadingPlanDetail h1 Caveat removed; both detail-page hero subtitles migrated from `font-serif italic text-white/60` to `text-white/70 leading-relaxed`; both day-content components consume `<FrostedCard variant="subdued">` for the action callout; both not-found pages wrap centered content in BackgroundCanvas and use `<Button variant="subtle" asChild>` for the recovery action; ChallengeDetail's redundant inline completion banner deleted. Re-confirm both prior specs at execution start.

2. **Verify the direction doc** at `_plans/direction/grow-2026-05-04.md` is present and the locked decisions referenced throughout this spec match — particularly Decision 2 (BackgroundCanvas added to all Grow surfaces), Decision 4 (scripture italic preserved as Lora exception — applies to PlanCompletionOverlay blockquote and CreatePlanFlow Step 3 Jeremiah quote), Decision 6 (Caveat retired from non-emotional-peak headings — see refinement above for the Challenge celebration h2 contextual override), Decision 8 (theme-color CTAs and brand expressions preserved as inline-styled rolls-own), Decision 9 (`bg-primary` solid CTAs migrate per emotional weight — subtle for navigation, gradient for climax), Decision 10 (cyan textarea glow → canonical violet textarea glow), Decision 13 (CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas).

3. **Verify the recon** at `_plans/recon/grow-create-overlays-2026-05-04.md` is present.

4. **Button primitive variant inventory.** Read `frontend/src/components/ui/Button.tsx` (or wherever the Button primitive lives — verify path during execution; the canonical Spec 6A/6B import was `@/components/ui/Button`) and capture the current variant inventory. Specifically:
   - **Does `variant="gradient"` already exist?**
   - If yes: capture the class string the variant resolves to. Compare against design system § "White Pill CTA Patterns" Pattern 2 (canonical gradient: `rounded-full`, gradient background `violet-400 → violet-300`, `text-black` text color, gradient-glow shadow `0_0_30px_rgba(167,139,250,0.4)` on default and `0_0_40px_rgba(167,139,250,0.5)` on hover, hover lift `-translate-y-0.5` with `motion-reduce:hover:translate-y-0`, `transition-all duration-base motion-reduce:transition-none`, `disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`). If the existing variant matches the canonical pattern, proceed to Change 7 directly. If it diverges, STOP and flag — discuss whether to update the variant before using it on the canonical climactic site or whether the divergence is intentional.
   - If no: this spec's Change 9 adds the variant per the canonical pattern above. Document this decision in the execution log.

5. **Capture a test baseline before any change.** Run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80` and `pnpm typecheck`. Record total pass/fail counts. The current baseline per CLAUDE.md is **9,470 pass / 1 pre-existing fail** (`useFaithPoints — intercession activity drift`), with an occasional flake of `useNotifications — returns notifications sorted newest first` bringing the baseline to **9,469 pass / 2 fail across 2 files**. Spec 6B reported 47/47 verification assertions passing on its clean baseline. Reconcile against the live count at execution start; the live number is authoritative. Any NEW failure introduced by this spec must be explicitly reconciled before the spec is considered complete.

6. **Read each of the 5 implementation files in scope plus the relevant test files** to confirm current import sets (lucide-react `Sparkles`, `BackgroundCanvas` location, `FrostedCard`, `Button`, `GRADIENT_TEXT_STYLE` location, `CrisisBanner` location, `CharacterCount` location, `useFocusTrap`, `useReducedMotion`, `playSoundEffect`, `showCelebrationToast`, `generatePlanCompletionImage`, `generateChallengeShareImage`, `getContrastSafeColor`, `cn` utility, `Link` from React Router, `createPortal` from `react-dom`), current chrome tokens, current conditional rendering branches, and current ARIA wiring on every overlay.

7. **Verify the GRADIENT_TEXT_STYLE import path.** Spec 6B imports `GRADIENT_TEXT_STYLE` from a specific module — verify the canonical export location (likely `@/lib/styles` or `@/constants/styles` or co-located with the design system tokens) and use the same import in CreatePlanFlow Step 1, CreatePlanFlow Step 2, and PlanCompletionOverlay. ChallengeCompletionOverlay and MilestoneCard do NOT import `GRADIENT_TEXT_STYLE` (they retain themeColor inline).

8. **Verify the `BackgroundCanvas` prop API for the CreatePlanFlow wrap (Change 1).** Spec 6A and 6B wrapped below-hero content with `<BackgroundCanvas>` (no `className` prop in those usages — the primitive enforces its own `min-h-screen`-equivalent layering). For CreatePlanFlow, the original surface wraps with `<div className="min-h-screen" style={CREATION_BG_STYLE}>`. The migration replaces this with `<BackgroundCanvas className="min-h-screen">` IF the primitive accepts a `className` prop and forwards it to the outer wrapper. If `BackgroundCanvas` does NOT accept `className` OR does NOT enforce `min-h-screen` on its own, fall back to:
   ```tsx
   <div className="min-h-screen">
     <BackgroundCanvas>
       <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
         {/* step content */}
       </div>
     </BackgroundCanvas>
   </div>
   ```
   Document the chosen wrapping shape in the execution log.

9. **Verify the spread-style merge order on PlanCompletionOverlay h2 (Change 10).** The h2 currently uses `style={fadeStyle(3)}` which returns an opacity + transform + transition object. Migration adds `GRADIENT_TEXT_STYLE` which returns a background-image + WebkitBackgroundClip + color object. The two style objects do NOT share keys, so spread order is theoretically forgiving — but the canonical pattern is `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}` (gradient last so its keys "win" in case of any future overlap). Verify no conflicts before merging; if a key conflict surfaces (e.g., a future fadeStyle change adds a `color` key), STOP and flag.

10. **Verify CrisisBanner + CharacterCount preservation wiring (Change 5 — verification only, no code change).** Read `CreatePlanFlow.tsx` lines around 187 and 199-201 and confirm:
    - `<CrisisBanner text={topicText} />` is mounted directly above the textarea, INSIDE the StepOne component
    - `<CharacterCount current={topicText.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="plan-char-count" />` is mounted directly below the textarea
    - The textarea's `aria-describedby="plan-char-count"` matches CharacterCount's `id="plan-char-count"`
    - CrisisBanner's `text={topicText}` prop wires it to detect crisis keywords as the user types
    These components are safety-critical. The visual migration on the textarea (Change 4) MUST NOT relocate them, modify their props, wrap them in a new container that interferes with their styling, or break the `aria-describedby` wiring. If any wiring drift surfaces during execution, STOP and flag.

11. **Verify the Sparkles icon survives the gradient Button migration (Change 7).** The Generate My Plan button currently renders `<Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />` as a leading icon child of the button element. Migration moves the icon as a child of `<Button variant="gradient">`. The Button primitive likely renders children with default flex+gap layout (Spec 6A's UpcomingChallengeCard "View Details" subtle Button has a similar pattern and works correctly). The migrated icon class becomes `<Sparkles className="h-4 w-4" aria-hidden="true" />` — the `mr-2 inline-block` is replaced by the Button's child layout. Verify visually at execution time that the icon + text render correctly with appropriate spacing. If the spacing is wrong, the icon may need a wrapper or a re-applied `mr-2` class.

12. **Verify the existing tests' class-string and assertion behaviors** before changing any class strings or test files:
    - `frontend/src/components/reading-plans/__tests__/CreatePlanFlow.test.tsx` (220 LOC, 17 tests) — per recon, ALL 17 tests use semantic queries (getByText, getByRole, getByLabelText, getByPlaceholderText). NO class-string assertions. Migration-resilient. CC verifies and confirms.
    - `frontend/src/components/reading-plans/__tests__/PlanCompletionOverlay.test.tsx` (201 LOC, 17 tests) — per recon, NO `font-script` queries, NO `bg-primary` queries. The `aria-labelledby="plan-completion-title"` reference at line 137-140 requires the h2's `id="plan-completion-title"` to be preserved through the migration; CC verifies. Migration-resilient.
    - `frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx` (201 LOC, 17 tests) — **HIGH RISK: 1 test (line 45-49) explicitly asserts `expect(title).toHaveClass('font-script')` AND uses the test name `'renders challenge title in Caveat font'`.** This test BREAKS after `font-script` removal. Spec MUST update both the test name and the assertions. New name: `'renders challenge title with themeColor brand expression'`. New assertions: `expect(title).not.toHaveClass('font-script')` AND `expect(title).toHaveStyle({ color: defaultProps.themeColor })`. The other 16 tests in the file use semantic queries and survive.
    - `frontend/src/components/challenges/__tests__/MilestoneCard.test.tsx` (95 LOC, 7 tests) — per recon, NO `font-script` queries. All 7 tests use semantic queries. Migration-resilient.
    - `frontend/src/components/reading-plans/__tests__/DayCompletionCelebration.test.tsx` (76 LOC, 7 tests) — per recon, lines 47, 52, 58 query `screen.getByText('Continue to Day N')`. The migration to subtle Button preserves visible text content (Button renders children as visible text), so the assertions survive. CC verifies the Button primitive doesn't transform the label.

13. **State machine verification for CreatePlanFlow (no code change, sanity check).** Read the `step` state machine at lines 50-103 and confirm:
    - Step transitions are gated correctly (`onNext` requires non-empty `topicText.trim()`; `handleGenerate` requires non-null `selectedDuration`)
    - Step 3's `isGenerating` flag gates back-button visibility (line 109) and Escape-key handling (lines 58, 71) so the user CANNOT interrupt the 2.5-second generation animation
    - The 2.5-second `setTimeout` in `handleGenerate` calls `matchPlanByKeywords()` + `addCustomPlanId()` + `navigate(planId)` + `showToast()` synchronously
    - `wr_custom_plans` localStorage is written via `addCustomPlanId()` (Phase 2 dual-write spec preserved)
    Visual migration touches none of this; preservation is mandatory.

14. **Document the Button gradient class string final form.** If Change 9 adds the variant, the canonical class string per design system § "White Pill CTA Patterns" Pattern 2 is:
    ```
    rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black px-6 py-2.5 min-h-[44px] font-semibold shadow-[0_0_30px_rgba(167,139,250,0.4)] hover:shadow-[0_0_40px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-base motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_30px_rgba(167,139,250,0.4)]
    ```
    Critical: text color is BLACK on the gradient, not white — the violet-400 → violet-300 gradient is light enough that black text reads cleanly with sufficient contrast. This matches the homepage primary CTA pattern. Verify `duration-base` resolves to a BB-33 animation token (it should). Confirm the class string against the live design system file before finalizing the variant; if the design system has tightened the canonical pattern since recon was captured, prefer the live design system over the recon recap.

#### Pattern application (locked at planning time)

**Pattern: BackgroundCanvas atmospheric layer (Decision 2 + Decision 13 application).** CreatePlanFlow replaces its inline `CREATION_BG_STYLE` constant + inline `style` prop with `<BackgroundCanvas>` wrapping the entire surface. The constant is deleted entirely (lines 13-17). Side effect documented in direction doc Decision 13: the warm violet `#4A1D96` mid-gradient is removed; CreatePlanFlow's atmosphere becomes canonical Grow atmosphere; the "specialness" cue migrates from the atmospheric tint to the gradient Generate button (Change 7). Direction doc explicitly accepts this aesthetic shift.

**Pattern: Caveat removal with GRADIENT_TEXT_STYLE (Decision 6 application — 3 sites).** CreatePlanFlow StepOne h1 ("What's on your heart?"), CreatePlanFlow StepTwo h1 ("How long of a journey?"), and PlanCompletionOverlay h2 ("Plan Complete!") all drop `font-script` and apply `style={GRADIENT_TEXT_STYLE}` (or merged with `fadeStyle(3)` on PlanCompletionOverlay). Class string becomes `text-center text-4xl font-bold sm:text-5xl` for the CreatePlanFlow h1s and `text-4xl font-bold sm:text-5xl` for the PlanCompletionOverlay h2 (no `text-center` on the overlay because the overlay's parent flexbox handles centering). The `id="plan-completion-title"` on the overlay h2 MUST be preserved (referenced by `aria-labelledby` on the dialog).

**Pattern: Caveat removal with themeColor preservation (Decision 6 refinement — 2 sites).** ChallengeCompletionOverlay h2 (challenge title) and MilestoneCard h2 (milestone title) drop `font-script` but RETAIN `style={{ color: themeColor }}`. Class string becomes `text-4xl font-bold sm:text-5xl` for ChallengeCompletionOverlay's h2 and `text-3xl font-bold sm:text-4xl` for MilestoneCard's h2 (smaller heading reflects incremental-milestone vs final-climax emotional weight). Critical: GRADIENT_TEXT_STYLE is NOT applied — that would override the themeColor.

**Pattern: Cyan textarea glow → canonical violet textarea glow (Decision 10 application).** CreatePlanFlow StepOne textarea migrates from the cyan glow class string to the canonical violet glow per design system § "Textarea Glow Pattern":
```
w-full resize-none rounded-xl p-4 text-white backdrop-blur-sm min-h-[120px] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40
```
Critical preservations: `id`, `value`, `onChange`, `placeholder`, `aria-describedby="plan-char-count"`, and `min-height` of 120px stay exactly. Placeholder color shifts from `text-white/50` to `text-white/40` per the canonical pattern's subtle dimming.

**Pattern: bg-primary CTA migration per emotional weight (Decision 9 application — 3 sites).** CreatePlanFlow Step 1 Next button → `<Button variant="subtle" size="md">` (rationale: navigation between steps, not climax). CreatePlanFlow Step 2 Generate My Plan button → `<Button variant="gradient" size="md">` (rationale: THIS is the emotional climax — the user has been building up to this moment for 2 steps; gradient showstopper reserved for genuine emotional peaks). DayCompletionCelebration Continue button → `<Button variant="subtle" size="md">` (rationale: per-day completion is incremental, not climax). Sparkles icon on Generate My Plan stays as a leading child of the Button.

**Pattern: Button primitive extension (Change 9 — conditional).** If `<Button variant="gradient">` doesn't exist in the Button primitive's variant inventory (Pre-execution recon item 4), the variant is added per the canonical class string captured in Pre-execution recon item 14. A corresponding test is added to the Button primitive's test file asserting that `<Button variant="gradient">` renders with the gradient class string, that children render as visible text, and that the disabled state applies correctly. If the variant already exists and matches the canonical pattern, no primitive extension is needed.

#### Preservation requirements (non-negotiable)

**A. Behavioral preservation.** Every existing test that asserts on behavior must continue to pass without modification (with the single documented exception of `ChallengeCompletionOverlay.test.tsx:45-49`, which gets a name + assertion update). This explicitly includes:
   - CreatePlanFlow step transition logic (Step 1 → Step 2 → Step 3, with Escape and back-arrow handling on Steps 1 and 2, and isGenerating gating on Step 3)
   - CreatePlanFlow chip pre-fill via `handleChipClick` with `requestAnimationFrame` cursor positioning
   - CreatePlanFlow `handleGenerate` 2.5-second `setTimeout` → `matchPlanByKeywords()` + `addCustomPlanId()` + `navigate()` + `showToast()`
   - CreatePlanFlow `wr_custom_plans` localStorage write via `addCustomPlanId()`
   - PlanCompletionOverlay 7-step animation sequence (icon → heading → plan title → stats → scripture → CTAs over 2 seconds)
   - PlanCompletionOverlay `playSoundEffect('ascending')` on step 3
   - PlanCompletionOverlay 15-second auto-dismiss
   - PlanCompletionOverlay `useFocusTrap()` canonical hook with focus restoration on dismiss
   - PlanCompletionOverlay body scroll lock with prior-style restoration
   - PlanCompletionOverlay scripture random selection via stable `useState` initializer
   - PlanCompletionOverlay confetti rendering with mobile=15 / desktop=30 / reduced-motion=0
   - PlanCompletionOverlay 3 sub-CTAs (Browse Plans, Share, Done — all canonical neutral chrome, no migration target)
   - PlanCompletionOverlay share image generation via `generatePlanCompletionImage()`
   - ChallengeCompletionOverlay custom focus trap (preserved per recon Q7 — out of 6C scope; future a11y spec will harmonize)
   - ChallengeCompletionOverlay click-outside-to-dismiss on backdrop
   - ChallengeCompletionOverlay 12-second auto-dismiss
   - ChallengeCompletionOverlay 2-second-delay "Tap anywhere to dismiss" hint
   - ChallengeCompletionOverlay confetti rendering with mobile=12 / desktop=24 / reduced-motion=0 / colors=[themeColor, '#FFD700', '#FFFFFF']
   - ChallengeCompletionOverlay 5 sub-CTAs (See your growth, Check the leaderboard, Share your achievement, Browse more plans, Browse more challenges — all canonical neutral chrome)
   - ChallengeCompletionOverlay share image generation via `generateChallengeShareImage()`
   - MilestoneCard inline (non-portal) rendering within ChallengeDetail flow
   - MilestoneCard `showCelebrationToast` on mount with `'celebration-confetti'` toast type, gated by `prefersReduced`
   - MilestoneCard share image generation via `generateChallengeShareImage()` with object URL cleanup on unmount
   - MilestoneCard 2 sub-CTAs (Share Your Milestone — themeColor button per Decision 8, preserved; Keep Going — neutral outlined button)
   - DayCompletionCelebration conditional render gating on `!isLastDay` (no Continue button on final day)
   - DayCompletionCelebration animated SVG checkmark with `ANIMATION_DURATIONS.slow` and 200ms initial delay
   - DayCompletionCelebration "+15 pts" pill conditional render based on `pointsAwarded` prop
   - DayCompletionCelebration reduced-motion safety net via `prefersReducedMotion` short-circuit
   - All ARIA wiring on every overlay (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-label` on close buttons, `aria-hidden` on decorative SVGs, `role="alert"` + `aria-live="assertive"` on CrisisBanner, `aria-live="polite"` on CharacterCount, `aria-describedby` on textarea linking to CharacterCount's id, `role="group"` + `aria-label` on progress dots)

**B. Theme-color preservation (Decision 8 + refinement).** Every theme-color inline style stays as-is:
   - ChallengeCompletionOverlay h2 `style={{ color: themeColor }}` — preserved (the refinement above is the rationale)
   - ChallengeCompletionOverlay badge swatch `style={{ backgroundColor: themeColor, opacity: 0.7 }}` — preserved per Decision 8
   - ChallengeCompletionOverlay confetti color palette `[themeColor, '#FFD700', '#FFFFFF']` — preserved per Decision 8
   - MilestoneCard h2 `style={{ color: themeColor }}` — preserved (refinement)
   - MilestoneCard share button `style={{ backgroundColor: themeColor }}` — preserved per Decision 8
   - `getContrastSafeColor()` accessibility helper — preserved (no migration touches the helper)

**C. Italic preservation (Decision 4).** Italic stays on:
   - PlanCompletionOverlay scripture blockquote (`font-serif text-base italic leading-relaxed text-white/80`) — explicit Decision 4 preservation
   - CreatePlanFlow Step 3 Jeremiah 29:11 blockquote (`font-serif text-base italic leading-relaxed text-white/60`) — explicit Decision 4 preservation
   No new italic is introduced. The two h1 migrations (StepOne + StepTwo) remove Caveat, not italic — Caveat-script and Lora-italic are different patterns; the h1s use `font-script` (Caveat), not `font-serif italic`.

**D. Activity engine + sound effects + crisis detection.** No change in behavior.
   - `useFaithPoints.recordActivity` calls preserved (DayCompletionCelebration on day complete, both completion overlays' parents on completion)
   - `playSoundEffect('ascending')` preserved on PlanCompletionOverlay step 3
   - `showCelebrationToast` preserved on MilestoneCard mount (gated by `prefersReduced`)
   - CrisisBanner mounting + props + position above CreatePlanFlow's textarea preserved exactly
   - No new user free-text input is added or removed; crisis detection scope is unchanged

**E. Modal infrastructure preservation.** No change in:
   - `createPortal(...)` mount target (`document.body` for both completion overlays)
   - `useFocusTrap()` canonical hook on PlanCompletionOverlay
   - Custom focus trap on ChallengeCompletionOverlay (preserved per recon Q7 — pre-existing inconsistency, out of 6C scope)
   - Body scroll lock on both completion overlays
   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` / `aria-label` ARIA wiring
   - Click-outside-to-dismiss semantics (enabled on ChallengeCompletionOverlay, disabled on PlanCompletionOverlay)
   - Auto-dismiss timeouts (15s on Plan, 12s on Challenge)

**F. CreatePlanFlow non-CTA bg-primary preservation (per recon).** Three `bg-primary` uses are NOT migrated because they are visual indicators / selection states, not CTAs:
   - Step 1/2/3 progress dots (active step glows `bg-primary`) — visual indicator, preserved
   - Step 3 bouncing loading dots (3 `bg-primary` dots with staggered animation-delay) — loading state, preserved
   - Step 2 duration card selected state (`border-primary shadow-[0_0_15px_rgba(109,40,217,0.3)]`) — selection state, preserved
   Same precedent as Spec 6B preserving ReadingPlanDetail's `bg-primary` progress bar fill. Decision 9 enumerates buttons only.

**G. CreatePlanFlow topic chips preservation.** The 6 starter chips (Anxiety, Grief, Relationship struggles, Finding purpose, Strengthening faith, Forgiveness) at lines 205-216 use canonical chip chrome (`min-h-[44px]`, `rounded-full`, `bg-white/10`, `text-white/80`) — clean, no `font-script`, no `text-primary`, no `bg-primary`. Direction doc does not enumerate. Preserved unchanged.

**H. PlanCompletionOverlay + ChallengeCompletionOverlay sub-CTA preservation.** All 3 PlanCompletionOverlay CTAs and all 5 ChallengeCompletionOverlay CTAs use the canonical neutral CTA chrome (`bg-white/[0.08] border border-white/10 hover:bg-white/[0.12]`). Direction doc does not enumerate. Preserved unchanged.

#### Change-by-change scope

| # | File | Change |
|---|------|--------|
| 1 | `frontend/src/components/reading-plans/CreatePlanFlow.tsx` | CREATION_BG_STYLE → BackgroundCanvas wrap; delete the constant entirely; verify wrapping shape per recon item 8 |
| 2 | `frontend/src/components/reading-plans/CreatePlanFlow.tsx` | StepOne h1 ("What's on your heart?") drop font-script, apply GRADIENT_TEXT_STYLE; class becomes `text-center text-4xl font-bold sm:text-5xl` |
| 3 | `frontend/src/components/reading-plans/CreatePlanFlow.tsx` | StepTwo h1 ("How long of a journey?") drop font-script, apply GRADIENT_TEXT_STYLE; same class string as Change 2 |
| 4 | `frontend/src/components/reading-plans/CreatePlanFlow.tsx` | StepOne textarea cyan glow → canonical violet glow; preserve id/value/onChange/placeholder/aria-describedby and 120px min-height exactly |
| 5 | `frontend/src/components/reading-plans/CreatePlanFlow.tsx` | CrisisBanner + CharacterCount preservation verification (no code change; recon item 10 verification) |
| 6 | `frontend/src/components/reading-plans/CreatePlanFlow.tsx` | Step 1 Next button bg-primary → `<Button variant="subtle" size="md">`; preserve disabled state on `!topicText.trim()` |
| 7 | `frontend/src/components/reading-plans/CreatePlanFlow.tsx` | Step 2 Generate My Plan button bg-primary → `<Button variant="gradient" size="md">`; preserve disabled state on `!selectedDuration`; preserve Sparkles icon as leading child |
| 8 | `frontend/src/components/reading-plans/DayCompletionCelebration.tsx` | Continue button bg-primary → `<Button variant="subtle" size="md">`; preserve `!isLastDay` conditional render gate; preserve "Continue to Day {dayNumber + 1}" text |
| 9 | `frontend/src/components/ui/Button.tsx` (conditional) | Add `variant="gradient"` per canonical class string IF it doesn't exist; add corresponding test in Button.test.tsx |
| 10 | `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` | h2 ("Plan Complete!") drop font-script, apply GRADIENT_TEXT_STYLE merged with fadeStyle(3) via spread; class becomes `text-4xl font-bold sm:text-5xl`; preserve `id="plan-completion-title"` for aria-labelledby |
| 11 | `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` | h2 (challenge title) drop font-script, RETAIN `style={{ color: themeColor }}`; class becomes `text-4xl font-bold sm:text-5xl` |
| 12 | `frontend/src/components/challenges/MilestoneCard.tsx` | h2 (milestone title) drop font-script, RETAIN `style={{ color: themeColor }}`; class becomes `text-3xl font-bold sm:text-4xl` (smaller heading sizing preserved) |

#### Test updates

- **`frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx`** — line 45-49 `'renders challenge title in Caveat font'` test:
   - Update test name to `'renders challenge title with themeColor brand expression'`
   - Replace `expect(title).toHaveClass('font-script')` with TWO assertions:
     - `expect(title).not.toHaveClass('font-script')`
     - `expect(title).toHaveStyle({ color: defaultProps.themeColor })`
- **`frontend/src/components/ui/__tests__/Button.test.tsx`** (or wherever Button is tested) — IF Change 9 extends the primitive:
   - Add `'renders with gradient variant'` test asserting the gradient class string is applied
   - Add assertion that children render as visible text content
   - Add assertion that the disabled state applies the `disabled:opacity-50` and `disabled:cursor-not-allowed` classes
   - These tests follow the existing Button test patterns (verify against the file's existing structure during execution)

If new failures appear in any test file not listed above, CC reads the failure and decides whether (a) the failure is a real regression to fix in implementation, (b) the test is asserting on a class string this spec migrates and needs an assertion update, or (c) the test is genuinely broken by an unrelated issue — in case (c), STOP and surface to the user.

### Non-Functional Requirements

- **Performance**: No new network requests, no new lazy-loaded chunks, no new heavy computation. The migration is class-string + primitive-extension only. CreatePlanFlow's existing 2.5-second simulated AI generation timing is preserved exactly.
- **Accessibility (WCAG 2.2 AA)**:
   - All ARIA wiring preserved exactly (CrisisBanner `role="alert"` + `aria-live="assertive"`; CharacterCount `aria-live="polite"`; textarea `aria-describedby="plan-char-count"`; both completion overlays' `role="dialog"` + `aria-modal="true"` + `aria-labelledby`/`aria-label`; progress dots `role="group"` + `aria-label`; Sparkles icon `aria-hidden="true"`; close buttons `aria-label="Close"`; back button `aria-label="Go back"`)
   - All keyboard navigation preserved exactly (Escape key on Steps 1+2 of CreatePlanFlow, focus trap Tab cycling on PlanCompletionOverlay via canonical hook and ChallengeCompletionOverlay via custom implementation, focus restoration on overlay dismiss)
   - All touch targets ≥ 44px (subtle Button + gradient Button at `size="md"` resolve to `min-h-[44px]` per Spec 6A's verified Button primitive defaults; CreatePlanFlow chip buttons preserve `min-h-[44px]`; DayCompletionCelebration Continue button preserves `min-h-[44px]` via Button)
   - `prefers-reduced-motion` respected by all animation tokens — confetti rendering gates motion-reduce to 0 particles on both completion overlays; MilestoneCard's `showCelebrationToast` is gated by `prefersReduced`; DayCompletionCelebration's SVG checkmark uses `prefersReducedMotion` short-circuit; CreatePlanFlow's bouncing loading dots use `motion-reduce:animate-none`; PlanCompletionOverlay's 7-step animation sequence respects reduced-motion via inline transition logic
   - Subtle Button + gradient Button hover/focus states satisfy 3:1 contrast against the BackgroundCanvas atmospheric layer (already verified in Spec 6A's UpcomingChallengeCard "View Details" usage; gradient variant's `text-black` against `violet-400 → violet-300` gradient verified against design system § "White Pill CTA Patterns" Pattern 2)
   - No new color-only state indicators introduced
- **Bundle size**: Net-zero or net-negative. Removing the `CREATION_BG_STYLE` constant + the cyan textarea glow class string + 3 inline `bg-primary` button class strings should shrink the bundle slightly. New imports beyond what's already shipped: `BackgroundCanvas` (already in tree-shaken graph from Spec 6A/6B), `Button` (already in tree-shaken graph), `GRADIENT_TEXT_STYLE` (already in tree-shaken graph from Spec 6B). If Change 9 extends the Button primitive, the addition is one variant-class-mapping line in the variant resolver — negligible bundle impact.
- **Test runtime**: No appreciable change. ~3-4 test files touched at most for assertion updates (1 ChallengeCompletionOverlay update; 1 Button test addition if Change 9 lands).

---

## Auth Gating

CreatePlanFlow and the four overlay components are public — no auth gates added or removed by this spec. Existing auth-modal behavior on the underlying actions is preserved exactly.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| View `/grow?create=true` (CreatePlanFlow) | Renders fully (browse-only); typing in textarea works; chip pre-fill works; navigation between Steps 1 and 2 works | Renders fully | N/A |
| Generate My Plan (Step 2 → Step 3) | Existing behavior preserved (the matchPlanByKeywords + addCustomPlanId + navigate flow runs; `wr_custom_plans` localStorage write occurs even when logged out, per Phase 0.5 dual-write spec) | Same | N/A — no new modal added |
| View PlanCompletionOverlay portal | Renders when triggered by ReadingPlanDetail's progress logic | Same | N/A |
| Click overlay sub-CTAs (Browse Plans, Share, Done on PlanCompletionOverlay; See growth, Leaderboard, Share, Browse more plans, Browse more challenges on ChallengeCompletionOverlay) | Navigates as today; Share triggers Web Share API or Canvas image download; Done dismisses | Same | N/A |
| Mark Complete on ChallengeDetail (parent of ChallengeCompletionOverlay) | Existing behavior preserved (recordActivity no-op when unauthenticated per `recordActivity` policy in `02-security.md`); overlay still fires | Records activity, fires sound, fires overlay | N/A — no new modal |
| Click "Continue to Day N" on DayCompletionCelebration | Navigates as today | Same | N/A |
| MilestoneCard Share Your Milestone / Keep Going | Existing share / dismiss behavior preserved | Same | N/A |
| CrisisBanner triggers (typing crisis-keyword text in CreatePlanFlow textarea) | Crisis resources rendered immediately above textarea | Same | N/A — crisis surface is universal |

Auth-modal copy and gating logic are unchanged by this spec. CrisisBanner's behavior is universal (logged-in and logged-out alike) — crisis detection is supersession-class behavior per `02-security.md` Universal Rule 13.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | CreatePlanFlow surface centered in `max-w-2xl` container with `px-4 py-6` padding; h1s render at `text-4xl` with GRADIENT_TEXT_STYLE; textarea renders full-width with the canonical violet glow; Step 1 Next button + Step 2 Generate button render full-width via `className="w-full sm:w-auto"` on the migrated Buttons; topic chips wrap at the existing flex-wrap behavior. PlanCompletionOverlay portal centers over `bg-black/70 backdrop-blur-sm`; content card renders at `max-w-md` with `mx-4` for safe margin; sub-CTAs render in 1-column. ChallengeCompletionOverlay portal centers over `bg-black/80 backdrop-blur-sm`; content renders card-less with `px-6 py-8` inset; 5 sub-CTA cards render in 1-column grid (`grid-cols-1`). MilestoneCard renders inline at `max-w-2xl` with `px-4 py-6`; share + Keep Going buttons render full-width. DayCompletionCelebration renders inline as a top-border-divider section with full-width Continue button. The BackgroundCanvas atmospheric layer renders behind CreatePlanFlow content across all breakpoints. |
| Tablet (640-1024px) | h1s bump to `sm:text-5xl` on CreatePlanFlow + PlanCompletionOverlay; ChallengeCompletionOverlay h2 bumps to `sm:text-5xl`; MilestoneCard h2 bumps to `sm:text-4xl` (smaller scale preserved per recon). Buttons render at natural width via `sm:w-auto`. ChallengeCompletionOverlay's 5 sub-CTAs bump to 2-column grid via `sm:grid-cols-2` with the last card spanning both columns and centering. CreatePlanFlow's surface stays at `max-w-2xl` (no widening at tablet breakpoint). |
| Desktop (> 1024px) | Same as tablet for h1s, buttons, and grid. PlanCompletionOverlay confetti density bumps to 30 particles; ChallengeCompletionOverlay confetti density bumps to 24 particles; MilestoneCard celebration toast confetti renders at higher density per the toast system's defaults. |

**Cross-breakpoint preservation.** Every Button migration consumes `size="md"` which resolves to `min-h-[44px]` per Spec 6A's verified primitive defaults — touch targets meet the 44px minimum across all breakpoints. The CreatePlanFlow textarea's canonical violet glow renders identically at every breakpoint (the design system pattern is breakpoint-agnostic). The CrisisBanner + CharacterCount accessibility wiring is breakpoint-agnostic (visibility, ARIA semantics, screen reader announcements unchanged). The two completion overlays' portal positioning + backdrop blur work identically at every breakpoint.

---

## AI Safety Considerations

**CrisisBanner preservation is THE safety-critical concern in this spec.** CreatePlanFlow's StepOne textarea is one of the few user free-text inputs in the app outside of DailyHub Pray/Journal. The current code wires `<CrisisBanner text={topicText} />` directly above the textarea inside StepOne (line ~187). When the user types text containing self-harm keywords (per `01-ai-safety.md` SELF_HARM_KEYWORDS list), CrisisBanner renders crisis resources (988 Suicide & Crisis Lifeline, Crisis Text Line, SAMHSA Helpline) with `role="alert"` and `aria-live="assertive"` so screen readers announce the resources immediately.

The visual migration on the textarea (Change 4 — cyan glow → canonical violet glow) MUST NOT:
- Relocate CrisisBanner away from its current position above the textarea
- Modify CrisisBanner's `text={topicText}` prop wiring
- Wrap CrisisBanner in a new container that interferes with its `role="alert"` semantics or its visual styling
- Introduce a layout change that pushes CrisisBanner below the user's natural reading flow when crisis content is detected (the resources must remain visible immediately above the textarea — a user typing crisis content needs to see the resources without scrolling)

The character count below the textarea (`<CharacterCount ... id="plan-char-count" />`) is similarly safety-adjacent: the textarea's `aria-describedby="plan-char-count"` wires the count to the textarea so screen readers announce zone changes ("approaching limit", "near limit", "over limit") via CharacterCount's `aria-live="polite"`. Migration MUST preserve the `aria-describedby`/`id` linkage.

Pre-execution recon item 10 mandates verification of these wirings before code changes; pre-execution recon item 12 mandates verification of test files that exercise this wiring. If any drift surfaces during execution, STOP and flag.

**Crisis detection scope is unchanged.** No new user free-text input surface is added or removed by this spec. The keyword list, the upstream backend AI proxy crisis classifier, the resources display logic — all preserved. The CreatePlanFlow textarea has a 500-char limit (`max={500}` on CharacterCount); short-form text is the design intent (the user is writing a topic prompt, not a journal entry), so the existing limit holds.

**No AI-generated output is added.** The "AI Plan Generation" feature in CreatePlanFlow is a deterministic mock per `CLAUDE.md` (matchPlanByKeywords does keyword → plan ID matching with a 2.5-second simulated delay). No real LLM call, no real AI output to render. If a future spec wires real AI plan generation, the safety policy in `01-ai-safety.md` § "AI-Generated Content Guidelines" applies: plain text only, no HTML/Markdown rendering, content moderation pre-applied upstream, length limits enforced, treat all output as untrusted in render. That work is out of 6C scope.

---

## Auth & Persistence

- **Logged-out (demo mode)**: All five surfaces render fully. CreatePlanFlow's `addCustomPlanId()` writes to `wr_custom_plans` localStorage (per Phase 0.5 dual-write convention — local storage permissible for unauthenticated users; backend writes gated to authenticated users only). No new persistence introduced. No new localStorage keys.
- **Logged-in**: Existing behaviors preserved exactly. `useFaithPoints.recordActivity` writes to `wr_daily_activities` + `wr_faith_points` (per `11-local-storage-keys.md`) on day completion (DayCompletionCelebration's parent ReadingPlanDetail) and on Mark Complete (ChallengeCompletionOverlay's parent ChallengeDetail). `addCustomPlanId()` writes to `wr_custom_plans`.
- **localStorage usage**: No new keys. No existing-key shape changes. The `wr_custom_plans` shape (string array of plan IDs, max 200) is preserved.
- **Route type**: Public.

---

## Completion & Navigation

N/A — These are not Daily Hub tabs. They are:
- A create surface (CreatePlanFlow) that lives at `/grow?create=true` and navigates the user to `/reading-plans/<generated-plan-id>` on Generate My Plan
- Two completion overlays (PlanCompletionOverlay, ChallengeCompletionOverlay) that fire when their parent pages detect completion conditions, with sub-CTAs navigating to `/grow?tab=plans`, `/grow?tab=challenges`, `/`, `/friends?tab=leaderboard`, or dismissing in place
- An inline milestone card (MilestoneCard) that renders within ChallengeDetail's flow on milestone-day fire and dismisses to clear the parent's `activeMilestone` state
- An inline day-completion section (DayCompletionCelebration) that renders within ReadingPlanDetail's flow on day complete with a Continue button (when `!isLastDay`) advancing the user to the next day

This spec does NOT touch any completion-tracking signal or any Daily Hub tab logic. The completion overlays' parent pages handle the activity engine integration; this spec migrates visual chrome only.

---

## Design Notes

**Reference patterns from `_plans/direction/grow-2026-05-04.md`:**

- **Decision 2**: BackgroundCanvas atmospheric layer added to all Grow surfaces. CreatePlanFlow is the last Grow surface to migrate. After 6C ships, every Grow page uses BackgroundCanvas.
- **Decision 4**: Scripture italic preserved as Lora exception. Applies to PlanCompletionOverlay's blockquote and CreatePlanFlow Step 3's Jeremiah 29:11 quote — both preserved unchanged.
- **Decision 6 (with refinement)**: Caveat retired from non-emotional-peak headings. The 3 sites in 6C scope without themeColor (CreatePlanFlow StepOne h1, CreatePlanFlow StepTwo h1, PlanCompletionOverlay h2) get GRADIENT_TEXT_STYLE. The 2 sites with themeColor (ChallengeCompletionOverlay h2, MilestoneCard h2) drop font-script but RETAIN themeColor inline style — see "Refinement to direction doc" above.
- **Decision 8**: Theme-color brand expressions preserved as inline-styled rolls-own. Applies to ChallengeCompletionOverlay h2 + badge swatch + confetti palette, and MilestoneCard h2 + share button.
- **Decision 9**: `bg-primary` solid CTAs migrate per emotional weight. CreatePlanFlow Step 1 Next + DayCompletionCelebration Continue → subtle (navigation, not climax). CreatePlanFlow Step 2 Generate → gradient (THE climax — "create my plan").
- **Decision 10**: Cyan textarea glow → canonical violet textarea glow. CreatePlanFlow's textarea is the last cyan-glow holdout in the app.
- **Decision 13**: CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas. Aligns the create surface with the rest of the rollout.

**Reference components (already shipped, this spec consumes):**

- `BackgroundCanvas` — multi-bloom atmospheric layer; consumed on `/grow`, `/reading-plans/:planId`, `/challenges/:challengeId`, PlanNotFound, ChallengeNotFound, Dashboard, BibleLanding, Local Support, Daily Hub
- `Button` (`subtle` variant) — quiet utility CTA; consumed on Spec 6A's UpcomingChallengeCard "View Details" + ConfirmDialog "Pause & Start New", Spec 6B's PlanNotFound + ChallengeNotFound recovery actions
- `Button` (`gradient` variant) — climactic CTA; new variant introduced in 6C IF not already present (Change 9 conditional). Class string per design system § "White Pill CTA Patterns" Pattern 2.
- `GRADIENT_TEXT_STYLE` — uniform white-to-purple gradient text style; consumed on Spec 6B's ReadingPlanDetail h1 (post-Caveat-removal); imported here for CreatePlanFlow StepOne h1, StepTwo h1, and PlanCompletionOverlay h2
- `CrisisBanner` (preserved unchanged) — safety-critical crisis-keyword detection component; mounted inside CreatePlanFlow's StepOne above the textarea
- `CharacterCount` (preserved unchanged) — character count with zone-change announcements; mounted inside CreatePlanFlow's StepOne below the textarea, wired via `id="plan-char-count"` to the textarea's `aria-describedby`

**Reference design system patterns:**

- **Textarea Glow Pattern** (canonical violet): `border-violet-400/30 bg-white/[0.04]` + `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]` + `focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/30` + `placeholder:text-white/40`. Originated on DailyHub Pray/Journal (Round 4); now applied to CreatePlanFlow's textarea.
- **White Pill CTA Patterns Pattern 2** (canonical gradient): `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black px-6 py-2.5 min-h-[44px] font-semibold shadow-[0_0_30px_rgba(167,139,250,0.4)] hover:shadow-[0_0_40px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-base motion-reduce:transition-none`. The text color is BLACK on the gradient (the violet-400 → violet-300 gradient is light enough that black text reads cleanly with sufficient contrast).

**Reference recon (already captured):**

- `_plans/recon/grow-create-overlays-2026-05-04.md` is the source of truth for current state across all 5 files. CC reads it during pre-execution. The recon includes 9 open questions; this spec resolves them as follows: Q1 (Decision 6 vs Decision 8 conflict on Challenge h2s) → Decision 8 hybrid per refinement; Q2 (Button gradient variant existence) → CC verifies during pre-execution recon item 4 and either consumes existing or extends primitive; Q3 (CREATION_BG_STYLE warmth loss) → accepted per Decision 13; Q4 (Button subtle text rendering) → verified during recon item 12; Q5 (duration card border-primary selected state) → preserved per "selection state ≠ CTA" precedent; Q6 (progress dots / loading dots bg-primary) → preserved per "visual indicator ≠ CTA" precedent; Q7 (custom focus trap on ChallengeCompletionOverlay) → out of 6C scope, future a11y spec; Q8 (sound effect harmonization) → out of 6C scope, future sound-design spec; Q9 (MilestoneCard chrome → FrostedCard) → out of 6C scope, preserved per Decision 7's mapping not enumerating it.

**No `[UNVERIFIED]` values expected.** Every token, variant, and prop in this spec is already in production use elsewhere — except the gradient Button variant if Change 9 introduces it. If the planner surfaces an unknown value during planning beyond the gradient variant's class string (verified against design system in pre-execution), surface to the user.

---

## Out of Scope

- **Triggering pages** (ReadingPlans.tsx, ReadingPlanDetail.tsx, ChallengeDetail.tsx) — already migrated in 6A/6B; preserved exactly. Visual migration in 6C only touches the 5 in-scope files plus optional Button primitive extension.
- **CrisisBanner component** — preserved exactly. The migration verifies its mounting position and prop wiring (recon item 10) but does not modify the component itself, its props, its position, or its `role="alert"` + `aria-live="assertive"` semantics.
- **CharacterCount component** — preserved exactly. The migration verifies the `aria-describedby` wiring on the textarea but does not modify CharacterCount's component code.
- **ChallengeCompletionOverlay's custom focus trap** (lines 69-95) — pre-existing inconsistency with the canonical `useFocusTrap()` hook; out of 6C scope per recon Q7. Future a11y spec will harmonize.
- **Sound effect asymmetry** between PlanCompletionOverlay (`'ascending'` on heading reveal) and ChallengeCompletionOverlay (no overlay sound; sound fires upstream on Mark Complete) — pre-existing asymmetry; out of 6C scope per recon Q8. Future sound-design spec will harmonize.
- **MilestoneCard's celebration-card chrome** (`bg-white/10 backdrop-blur-md`) — pre-existing rolls-own celebration-card variant; not enumerated in Decision 7's mapping table; out of 6C scope per Decision 7 and recon Q9. Preserved exactly.
- **CreatePlanFlow Step 2 duration card `border-primary` selected state** — selection state, not CTA; preserved per "selection state ≠ CTA" precedent.
- **CreatePlanFlow progress dots / Step 3 bouncing loading dots** — visual indicators, not CTAs; preserved per "visual indicator ≠ CTA" precedent (same as Spec 6B's ReadingPlanDetail progress bar fill).
- **CreatePlanFlow topic chips** — canonical chrome; preserved exactly.
- **CreatePlanFlow plan-match / navigation logic** — `handleGenerate`, `matchPlanByKeywords`, `addCustomPlanId`, `navigate`, `showToast` all preserved unchanged.
- **Confetti animations** on PlanCompletionOverlay + ChallengeCompletionOverlay — preserved with motion-reduce safety net.
- **Activity engine integration** — `useFaithPoints.recordActivity` calls preserved exactly.
- **ChallengeCompletionOverlay backdrop click-outside-to-dismiss semantics** — preserved exactly.
- **PlanCompletionOverlay 7-step animation sequence** — preserved exactly.
- **Auto-dismiss timeouts** (15s on Plan, 12s on Challenge) — preserved exactly.
- **Body scroll lock + prior-style restoration** on both completion overlays — preserved exactly.
- **`generateChallengeShareImage()` / `generatePlanCompletionImage()` Canvas image generation** — preserved exactly. No migration touches the share-image generators.
- **`FrostedCard`, `BackgroundCanvas` primitives** (other than `Button` Change 9 conditional) — preserved as-is; no prop API changes.
- **Service files** — none touched.
- **Hardcoded `#27AE60` success color** in DayCompletionCelebration's SVG checkmark stroke — pre-existing; out of 6C scope per recon. Future cleanup spec.
- **Hardcoded `text-primary-lt` icon color** on CreatePlanFlow Step 2 duration card icons (Zap, Layers, Sunrise) — pre-existing; not enumerated in Decision 11; out of 6C scope.
- **A11y semantic refactoring** — out of scope. Existing ARIA verified canonical.
- **Performance optimization** — out of scope. No new lazy chunks, no new heavy computation.
- **API/backend changes** — N/A. Frontend visual + primitive-extension spec.
- **New localStorage keys, new database columns, new endpoints** — none.
- **BB-33 animation token cleanup on ChallengeCompletionOverlay** (line 31's hardcoded `'2.5s ${delay}s ease-in forwards'`, lines 55+63's `12_000`/`2000` setTimeout literals) — pre-existing technical debt; out of 6C scope per recon. Future BB-33 cleanup spec.

---

## Acceptance Criteria

### CreatePlanFlow

- [ ] BackgroundCanvas wraps the full create surface; `CREATION_BG_STYLE` constant deleted entirely from the file (lines 13-17 gone)
- [ ] StepOne h1 "What's on your heart?" uses `style={GRADIENT_TEXT_STYLE}`; class string contains `text-center text-4xl font-bold sm:text-5xl`; DOM inspection confirms `font-script` is absent
- [ ] StepTwo h1 "How long of a journey?" uses `style={GRADIENT_TEXT_STYLE}`; same class string as StepOne; DOM inspection confirms `font-script` is absent
- [ ] StepOne textarea uses canonical violet glow class string (`border-violet-400/30`, `bg-white/[0.04]`, shadow with `rgba(167,139,250,0.18)` + `rgba(167,139,250,0.10)`, `focus:border-violet-400/60`, `focus:ring-2 focus:ring-violet-400/30`, `placeholder:text-white/40`); DOM inspection confirms `border-glow-cyan/30` and `rgba(0,212,255,...)` shadow are absent
- [ ] StepOne textarea preserves `id`, `value={topicText}`, `onChange={(e) => setTopicText(e.target.value)}`, `placeholder` text, `aria-describedby="plan-char-count"`, and 120px min-height exactly
- [ ] CrisisBanner mounted directly above the textarea inside StepOne (verified via DOM inspection — CrisisBanner element appears as a sibling immediately preceding the textarea)
- [ ] CrisisBanner's `text={topicText}` prop preserved
- [ ] CharacterCount mounted directly below the textarea with `id="plan-char-count"` (verified via DOM inspection)
- [ ] CharacterCount's props preserved exactly: `current={topicText.length}`, `max={500}`, `warningAt={400}`, `dangerAt={480}`, `visibleAt={300}`, `id="plan-char-count"`
- [ ] Textarea's `aria-describedby="plan-char-count"` matches CharacterCount's `id="plan-char-count"` (verified via accessibility tree inspection)
- [ ] StepOne Next button renders as `<Button variant="subtle" size="md">` with `type="button"`, `onClick={onNext}`, `disabled={!topicText.trim()}`, `className="w-full sm:w-auto"`
- [ ] StepTwo Generate My Plan button renders as `<Button variant="gradient" size="md">` with `type="button"`, `onClick={onGenerate}`, `disabled={!selectedDuration}`, `className="w-full sm:w-auto"`
- [ ] Sparkles icon preserved as leading child of the gradient Button: `<Sparkles className="h-4 w-4" aria-hidden="true" />`; visual smoke test confirms appropriate spacing between icon and "Generate My Plan" text
- [ ] StepThree progress dots (3 dots, active step uses `bg-primary`) preserved unchanged
- [ ] StepThree bouncing loading dots (3 `bg-primary` dots with staggered animation-delay 0/150/300ms, `motion-reduce:animate-none`) preserved unchanged
- [ ] StepThree scripture blockquote (Jeremiah 29:11 WEB) preserves `font-serif italic` (Decision 4 exception)
- [ ] Topic chips (6 starter chips) preserved unchanged in markup, props, click handler, and class string
- [ ] Step 2 duration card selected state (`border-primary shadow-[0_0_15px_rgba(109,40,217,0.3)]`) preserved unchanged
- [ ] handleGenerate logic, plan matching via `matchPlanByKeywords`, `addCustomPlanId` localStorage write to `wr_custom_plans`, `navigate(planId)`, `showToast` all preserved unchanged
- [ ] 2.5-second `setTimeout` in `handleGenerate` preserved exactly
- [ ] State machine (step 1 ↔ step 2 ↔ step 3, isGenerating gating) preserved unchanged
- [ ] Escape key handling preserved (Steps 1+2 dismiss; Step 3 disabled per `isGenerating` guard)
- [ ] Back-arrow button visibility preserved (rendered on Steps 1+2 with `aria-label="Go back"`; not rendered on Step 3)

### Button primitive (Change 9 conditional)

- [ ] `<Button variant="gradient">` exists in the Button primitive's variant inventory after this spec lands (either pre-existing per pre-execution recon OR added by Change 9)
- [ ] If added by Change 9: gradient variant class string matches design system § "White Pill CTA Patterns" Pattern 2 (`rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black px-6 py-2.5 min-h-[44px] font-semibold shadow-[0_0_30px_rgba(167,139,250,0.4)] hover:shadow-[0_0_40px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-base motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_30px_rgba(167,139,250,0.4)]`)
- [ ] If added by Change 9: text color is BLACK on the gradient (not white)
- [ ] Disabled state applies `disabled:opacity-50` + `disabled:cursor-not-allowed` correctly (verified by visual smoke test on the StepTwo Generate My Plan button when `selectedDuration` is null)
- [ ] If added by Change 9: corresponding test added to Button.test.tsx asserting (a) gradient class string is applied, (b) children render as visible text, (c) disabled state applies correctly

### PlanCompletionOverlay

- [ ] h2 "Plan Complete!" uses `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}` (or equivalent merged spread); class string contains `text-4xl font-bold sm:text-5xl`; DOM inspection confirms `font-script` is absent
- [ ] `id="plan-completion-title"` preserved on the h2 (referenced by dialog's `aria-labelledby` at line 161)
- [ ] `fadeStyle(3)` opacity + transform + transition logic preserved (the merged spread does not break the 7-step animation sequence)
- [ ] Confetti rendering preserved (mobile=15 / desktop=30 / reduced-motion=0 particles)
- [ ] `useFocusTrap()` canonical hook preserved with focus restoration on dismiss
- [ ] Body scroll lock with prior-style restoration preserved
- [ ] 15-second auto-dismiss preserved
- [ ] Scripture blockquote `font-serif italic` preserved (Decision 4)
- [ ] `playSoundEffect('ascending')` on step 3 preserved
- [ ] All 3 sub-CTAs (Browse Plans, Share, Done) preserved as canonical neutral chrome — no migration target on these
- [ ] Done button auto-focus on step 7 preserved via `doneButtonRef`
- [ ] Share image generation via `generatePlanCompletionImage()` preserved

### ChallengeCompletionOverlay

- [ ] h2 (challenge title) drops `font-script`; RETAINS `style={{ color: themeColor }}` exactly (Decision 6 refinement)
- [ ] Class string becomes `text-4xl font-bold sm:text-5xl` (no `text-center` because the parent flexbox handles centering)
- [ ] GRADIENT_TEXT_STYLE is NOT applied to the h2 (the themeColor inline style is the brand expression for this site)
- [ ] Test at `frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx:45-49` updated:
   - Test name changed from `'renders challenge title in Caveat font'` to `'renders challenge title with themeColor brand expression'`
   - Assertion changed from `expect(title).toHaveClass('font-script')` to `expect(title).not.toHaveClass('font-script')` AND `expect(title).toHaveStyle({ color: defaultProps.themeColor })`
- [ ] Confetti palette `[themeColor, '#FFD700', '#FFFFFF']` preserved
- [ ] Confetti rendering preserved (mobile=12 / desktop=24 / reduced-motion=0 particles)
- [ ] Badge swatch `style={{ backgroundColor: themeColor, opacity: 0.7 }}` preserved
- [ ] Custom focus trap (lines 69-95) preserved unchanged (out of 6C scope; future a11y spec)
- [ ] Click-outside-to-dismiss on backdrop preserved
- [ ] 12-second auto-dismiss preserved
- [ ] 2-second-delay "Tap anywhere to dismiss" hint preserved with `prefersReduced` gate
- [ ] All 5 sub-CTAs (See your growth, Check the leaderboard, Share your achievement, Browse more plans, Browse more challenges) preserved as canonical neutral chrome
- [ ] Share image generation via `generateChallengeShareImage()` preserved

### MilestoneCard

- [ ] h2 (milestone title) drops `font-script`; RETAINS `style={{ color: themeColor }}` exactly (Decision 6 refinement)
- [ ] Class string becomes `text-3xl font-bold sm:text-4xl` (smaller heading sizing preserved per recon — incremental milestone vs final climax)
- [ ] GRADIENT_TEXT_STYLE is NOT applied to the h2
- [ ] Card chrome `bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 sm:p-8` preserved (per Decision 7 — not enumerated in mapping table; rolls-own celebration variant preserved)
- [ ] `showCelebrationToast('', milestoneTitle, 'celebration-confetti')` on mount preserved with `prefersReduced` gate
- [ ] Share Your Milestone button `style={{ backgroundColor: themeColor }}` preserved (Decision 8)
- [ ] Keep Going button (neutral outlined) preserved unchanged
- [ ] Share image generation + object URL cleanup on unmount preserved
- [ ] Inline (non-portal) rendering within ChallengeDetail flow preserved

### DayCompletionCelebration

- [ ] Continue button renders as `<Button variant="subtle" size="md">` with `type="button"`, `onClick={onContinue}`, `className="mt-3 w-full sm:w-auto"`
- [ ] Continue button text "Continue to Day {dayNumber + 1}" preserved (visible text content; survives existing test assertions at lines 47, 52, 58)
- [ ] Conditional render gate `{!isLastDay && (...)}` preserved (no Continue button on the final day; PlanCompletionOverlay handles the climax)
- [ ] Animated SVG checkmark preserved with `ANIMATION_DURATIONS.slow` (400ms) and 200ms initial delay
- [ ] `prefersReducedMotion` short-circuit preserved on the SVG animation
- [ ] "+15 pts" pill conditional render based on `pointsAwarded` prop preserved with `text-primary-lt` class
- [ ] Top-border-divider section chrome (`border-t border-white/10 py-8 sm:py-10`) preserved
- [ ] Inline (non-portal) rendering within ReadingPlanDetail flow preserved

### Behavioral preservation

- [ ] All existing tests pass post-migration; no NEW failures introduced (with the single documented exception of `ChallengeCompletionOverlay.test.tsx:45-49` getting a name + assertion update)
- [ ] Test baseline preserved relative to the live count captured at execution start (the spec's narrative cites 9,470/1 as the post-Spec-6B baseline; reconcile against the live run)
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `useFaithPoints.recordActivity` calls fire as today (DayCompletionCelebration's parent on day complete; ChallengeDetail on Mark Complete)
- [ ] `playSoundEffect('ascending')` fires on PlanCompletionOverlay step 3 — preserved
- [ ] `playSoundEffect` upstream call on ChallengeDetail Mark Complete — preserved (out of 6C; recon flag)
- [ ] `showCelebrationToast` fires on MilestoneCard mount — preserved
- [ ] `useFocusTrap()` canonical hook on PlanCompletionOverlay — preserved
- [ ] Custom focus trap on ChallengeCompletionOverlay — preserved unchanged (out of 6C; recon Q7)
- [ ] `generatePlanCompletionImage()` + `generateChallengeShareImage()` Canvas generators preserved unchanged
- [ ] `addCustomPlanId()` writes to `wr_custom_plans` localStorage on Generate My Plan — preserved
- [ ] CrisisBanner detects crisis keywords in CreatePlanFlow's textarea text and renders resources (verified by manual smoke test: typing a self-harm keyword in the textarea triggers the banner above the textarea immediately)

### Theme-color preservation (Decision 8 + refinement)

- [ ] All theme-color inline styles preserved: ChallengeCompletionOverlay h2 + badge swatch + confetti palette; MilestoneCard h2 + share button background
- [ ] `getContrastSafeColor()` accessibility helper preserved (no migration touches it)
- [ ] ChallengeCompletionOverlay h2 renders with seasonal palette (e.g., during Lent it's deep purple; during Easter it's gold) — verified visually with the current season's challenge OR via test fixture
- [ ] MilestoneCard h2 renders with seasonal themeColor — verified visually OR via test fixture (recon notes activation isn't possible without an active challenge; visual via storybook/test or wait for Pentecost activation if needed)

### Manual eyeball check — CreatePlanFlow

- [ ] `/grow?create=true` opens the create surface
- [ ] StepOne renders with: gradient violet-to-white h1, canonical violet textarea glow (the textarea visually matches DailyHub Pray/Journal textareas), CrisisBanner mounted immediately above the textarea (visible when crisis keywords are typed), CharacterCount mounted below the textarea (visible when typing past 300 chars), 6 topic chips, subtle Next button at the bottom (full-width on mobile, natural width on desktop)
- [ ] StepTwo renders with: gradient violet-to-white h1, 3 duration cards with selection state preserved (border-primary glow on selected), gradient Generate My Plan button at the bottom (climactic visual — the button itself announces this is THE moment) with Sparkles icon as a leading child
- [ ] StepThree renders with: 3 progress dots (current step glows bg-primary), 3 bouncing loading dots, italic Lora Jeremiah 29:11 blockquote, no back-arrow button (Step 3 is uninterruptible)
- [ ] BackgroundCanvas atmospheric blooms gently visible behind all 3 steps; the warm violet `#4A1D96` mid-gradient is gone (canonical Grow atmosphere replaces it)

### Manual eyeball check — completion overlays

- [ ] Plan completion (set localStorage to mock complete state on a 7-day plan): PlanCompletionOverlay portal opens with gradient h2 "Plan Complete!", italic Lora scripture blockquote, 3 sub-CTAs in canonical neutral chrome; 7-step animation sequence reveals the elements in order; ascending sound fires on heading reveal; Escape dismisses with focus restoration
- [ ] Challenge completion (cannot test without an active challenge in current season; visual via storybook/test fixture or wait for Pentecost activation): ChallengeCompletionOverlay portal opens with themeColor h2 (challenge title), badge swatch in themeColor, confetti palette with themeColor; 5 sub-CTA cards in 2-column grid (1-column on mobile); click-outside-to-dismiss works; 12-second auto-dismiss fires
- [ ] MilestoneCard (cannot test without an active challenge mid-progress; visual via test fixture): inline card renders within ChallengeDetail flow with themeColor h2 (milestone title) at smaller `text-3xl sm:text-4xl` size; themeColor share button; neutral Keep Going button
- [ ] DayCompletionCelebration on a non-final day completion: subtle Continue button renders with "Continue to Day N" visible text; animated SVG checkmark plays; "+15 pts" pill renders if `pointsAwarded` is true
- [ ] DayCompletionCelebration on the final day completion: NO Continue button renders (gate on `!isLastDay`); PlanCompletionOverlay portal handles the climax instead

### Regression checks (verify no drift on neighbors)

- [ ] `/grow` (Spec 6A) reads identically — BackgroundCanvas, plan cards, challenge cards, tab icons, sticky tab bar all unchanged
- [ ] `/grow?tab=plans` and `/grow?tab=challenges` (Spec 6A) unchanged
- [ ] `/reading-plans/<plan-id>` (Spec 6B) unchanged — BackgroundCanvas atmospheric continuity, FrostedCard subdued action callout, hero h1 + subtitle migrations all preserved
- [ ] `/challenges/<challenge-id>` (Spec 6B) unchanged
- [ ] `/reading-plans/<invalid-id>` and `/challenges/<invalid-id>` (Spec 6B not-found surfaces) unchanged
- [ ] DailyHub (`/daily?tab=*`) unchanged — the canonical violet textarea glow on Pray + Journal originated here; verify it still reads identically
- [ ] Dashboard (`/`) unchanged
- [ ] Local Support (`/local-support/*`) unchanged
- [ ] BibleLanding (`/bible`) unchanged

---

## Risks & Mitigations

**Risk:** `<Button variant="gradient">` may not exist in the Button primitive today. Change 9 is conditional; the spec assumes pre-execution recon item 4 determines the path.
**Mitigation:** Pre-execution recon item 4 mandates verification BEFORE any code change. If the variant exists, capture the class string and compare against the canonical pattern in design system § "White Pill CTA Patterns" Pattern 2. If it diverges, STOP and flag — discuss whether to update the variant or whether the divergence is intentional. If the variant doesn't exist, Change 9 adds it per the canonical class string captured in pre-execution recon item 14, with a corresponding test added to the Button primitive's test file.

**Risk:** The CREATION_BG_STYLE warmth loss (`#4A1D96` mid-gradient violet accent gone) is a meaningful aesthetic shift. Currently the create surface visually announces itself as different from regular plan browsing; after migration it's visually indistinguishable.
**Mitigation:** Direction doc Decision 13 explicitly accepts this. The "specialness" cue migrates from atmosphere to the gradient Generate button — which is arguably a better location for the cue (the moment of creation is the climax; the atmospheric tint was a constant the user couldn't escape). Recon Q3 flagged this for product sign-off; this spec accepts it. If post-migration eyeballs flag the loss as too cold, a follow-up spec could optionally add a low-opacity radial overlay on top of BackgroundCanvas to retain a subtle warm hue — that's a NEW design pattern, not a Spec 6C scope item.

**Risk:** The CrisisBanner safety wiring could be inadvertently disrupted by the textarea migration. The current code has CrisisBanner mounted at line 187 directly above the textarea at line 195; both are inside the StepOne component. If a careless migration moved the textarea OR wrapped it in a container that breaks the visual flow, crisis content might not display the resources immediately.
**Mitigation:** Pre-execution recon item 10 mandates verification of CrisisBanner + CharacterCount preservation BEFORE any code change. The migration only touches the textarea's class string (Change 4), not its position, props, parent, or sibling order. CC reads the file structure post-migration and verifies CrisisBanner remains immediately above the textarea inside StepOne. If any drift surfaces, STOP and flag.

**Risk:** GRADIENT_TEXT_STYLE merged with fadeStyle(3) on PlanCompletionOverlay h2 could break the 7-step animation sequence if a future fadeStyle change adds a key that conflicts with GRADIENT_TEXT_STYLE.
**Mitigation:** Pre-execution recon item 9 mandates verification of the spread merge order. Today the two style objects have no overlapping keys (fadeStyle returns opacity/transform/transition; gradient returns background-image/WebkitBackgroundClip/color). The canonical spread order is `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}` (gradient last so its keys win in case of any future conflict). If a key conflict surfaces, STOP and flag.

**Risk:** Decision 6 refinement on Challenge celebration h2s could be misread as silent drift from the direction doc.
**Mitigation:** The "Refinement to direction doc" section above explicitly documents the rationale, parallels Spec 6B's not-found-page Decision 6 refinement, and records the trail for future audits. The direction doc remains authoritative on intent (drop Caveat, never use deprecated patterns); this spec implements that intent contextually. Code review (`/code-review`) should flag any future re-introduction of `font-script` on these h2s.

**Risk:** ChallengeCompletionOverlay's custom focus trap (lines 69-95) is a pre-existing inconsistency with the canonical `useFocusTrap()` hook. Spec 6C touches this file's h2 class string and might be tempted to migrate the focus trap as a side effect.
**Mitigation:** Out of 6C scope per recon Q7. Future a11y spec will harmonize. CC verifies the focus trap is preserved unchanged during execution and does NOT migrate it as a side effect.

**Risk:** The CreatePlanFlow textarea migration could inadvertently break the `wr_custom_plans` localStorage write or the navigation logic if `onChange={(e) => setTopicText(e.target.value)}` is accidentally modified.
**Mitigation:** Change 4 explicitly preserves the textarea's `id`, `value`, `onChange`, `placeholder`, `aria-describedby` props. Only the `className` changes. CC verifies post-migration that the state machine still works (Step 1 → Step 2 transition gated on non-empty `topicText.trim()`; chip pre-fill works; character count visibility works).

**Risk:** Sparkles icon spacing on the gradient Generate My Plan button could read wrong if the Button primitive's child layout doesn't include flex+gap.
**Mitigation:** Pre-execution recon item 11 mandates visual verification at execution time. Spec 6A's UpcomingChallengeCard "View Details" subtle Button has a similar icon+text pattern and works correctly. If spacing reads wrong on the gradient variant, the icon may need a wrapper or a re-applied `mr-2` class — document the chosen path in the execution log.

**Risk:** The DayCompletionCelebration test at lines 47, 52, 58 queries `screen.getByText('Continue to Day N')` and might break if the Button primitive transforms the label (e.g., wrapping it in a span with custom layout that breaks `getByText` matching).
**Mitigation:** Pre-execution recon item 12 verifies the Button primitive renders children as visible text content. Spec 6A's button migrations preserved visible text on `getByText` queries. If a regression surfaces, fall back to a more permissive query (e.g., `getByRole('button', { name: /Continue to Day/ })`) — same pattern Spec 6A used for a similar concern.

---

## Implementation Notes (for /plan)

The brief enumerates 12 changes. The plan should one-to-one those changes into execution steps, with the recon items 1-14 as the pre-execution gate (steps 1-N before any code change), the 12 changes as the migration body (one step per change), and the test-update + smoke-test verification as the closing steps.

**Suggested step ordering:**

1. Pre-execution recon (items 1-14 from "Pre-execution recon" above)
2. Capture test baseline + typecheck baseline
3. Read all 5 implementation files + the conditional Button primitive file + relevant test files
4. Verify Button primitive `variant="gradient"` existence (recon item 4) — branch decision
5. Verify GRADIENT_TEXT_STYLE import path (recon item 7)
6. Verify BackgroundCanvas prop API for CreatePlanFlow wrap (recon item 8)
7. Verify CrisisBanner + CharacterCount wiring (recon item 10) — sanity check, no code change
8. State machine verification on CreatePlanFlow (recon item 13) — sanity check, no code change
9. Apply Change 9 IF needed: extend Button primitive with gradient variant + add primitive test
10. Apply Change 1 (CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas) — verify visually
11. Apply Change 2 (CreatePlanFlow StepOne h1 GRADIENT_TEXT_STYLE) — verify visually
12. Apply Change 3 (CreatePlanFlow StepTwo h1 GRADIENT_TEXT_STYLE) — verify visually
13. Apply Change 4 (CreatePlanFlow textarea cyan → violet glow) — verify visually + verify CrisisBanner + CharacterCount wiring still intact
14. Apply Change 5 (CrisisBanner + CharacterCount preservation verification) — verification only, no code change
15. Apply Change 6 (CreatePlanFlow Step 1 Next button → subtle Button) — verify visually + verify disabled state behavior
16. Apply Change 7 (CreatePlanFlow Step 2 Generate button → gradient Button) — verify visually + verify Sparkles icon spacing + verify disabled state behavior
17. Apply Change 8 (DayCompletionCelebration Continue button → subtle Button) — verify on day-complete flow
18. Apply Change 10 (PlanCompletionOverlay h2 GRADIENT_TEXT_STYLE merged with fadeStyle) — verify on plan-complete flow
19. Apply Change 11 (ChallengeCompletionOverlay h2 drop font-script + retain themeColor) — verify visually OR via storybook/test
20. Apply Change 12 (MilestoneCard h2 drop font-script + retain themeColor) — verify visually OR via storybook/test
21. Update test files: `ChallengeCompletionOverlay.test.tsx:45-49` name + assertions; Button.test.tsx if Change 9 lands
22. Run full test suite + `pnpm typecheck`; reconcile against captured baseline
23. Manual eyeball checks on CreatePlanFlow steps 1+2+3, all 4 overlays, and regression neighbors (per acceptance criteria)
24. Document execution-log decisions: Button gradient variant existed vs added (recon item 4 result), BackgroundCanvas wrap shape (recon item 8 result), Sparkles icon spacing path (recon item 11 result), Button child rendering on subtle variant (recon item 12 result)

**Mandatory pre-flight before Changes 7 and 9:** Pre-execution recon item 4 determines whether Change 9 is needed. If the gradient variant exists and matches the canonical pattern, Change 9 is skipped and Change 7 consumes the existing variant. If the variant doesn't exist, Change 9 adds it BEFORE Change 7 (Change 7 cannot complete without the variant existing).

**No `[UNVERIFIED]` values expected** unless pre-execution recon surfaces a Button primitive divergence. Every other token, variant, and prop in this spec is already in production use elsewhere (BackgroundCanvas from Spec 6A/6B, FrostedCard from Spec 6A/6B, Button subtle from Spec 6A/6B, GRADIENT_TEXT_STYLE from Spec 6B, canonical violet textarea glow from DailyHub Round 4, theme-color inline-style preservation pattern from Decision 8 throughout the rollout). If the planner surfaces an unknown value during planning beyond the conditional gradient variant, surface to the user.
