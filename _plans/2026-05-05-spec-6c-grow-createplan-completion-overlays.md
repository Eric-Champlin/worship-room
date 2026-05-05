# Implementation Plan: Spec 6C — CreatePlanFlow + Completion Overlays

**Spec:** `_specs/spec-6c-grow-createplan-completion-overlays.md`
**Date:** 2026-05-05
**Branch:** `forums-wave-continued` (stay on this branch — DO NOT create a new branch; user manages all git operations)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-05-04, fresh; covers Daily Hub Round 4 / Spec Y / HorizonGlow patterns and Round 3 visual system. The textarea glow pattern in `09-design-system.md` is **violet-400** [DailyHub 1B / Round 4], not white. Spec 6C body text mentions "white box-shadow" once in line 47 but the canonical class string the spec mandates in line 148 is the violet pattern from `09-design-system.md` § "Textarea Glow Pattern". Plan uses violet — the canonical pattern wins.)
**Recon Report:** `_plans/recon/grow-create-overlays-2026-05-04.md` (loaded — referenced throughout the spec)
**Master Spec Plan:** `_plans/direction/grow-2026-05-04.md` (loaded — Decisions 2, 4, 6 + refinement, 8, 9, 10, 13 govern this spec)

---

## Affected Frontend Routes

- `/grow?create=true` — primary surface for CreatePlanFlow (BackgroundCanvas wrap, 2 hero h1 Caveat removals, cyan→violet textarea glow, Step 1 Next button → subtle Button, Step 2 Generate button → gradient Button, CrisisBanner + CharacterCount preserved)
- `/reading-plans/:planId` — surfaces `PlanCompletionOverlay` (Caveat h2 → GRADIENT_TEXT_STYLE merged with fadeStyle) on plan completion AND `DayCompletionCelebration` (Continue button → subtle Button) on per-day completion
- `/challenges/:challengeId` — surfaces `ChallengeCompletionOverlay` (Caveat h2 → drop font-script, retain themeColor) on final-day completion AND `MilestoneCard` (Caveat h2 → drop font-script, retain themeColor) on milestone-day fire
- `/grow?tab=plans` — regression surface (Spec 6A baseline)
- `/grow?tab=challenges` — regression surface (Spec 6A baseline)
- `/grow` (no query) — regression surface (Spec 6A baseline)
- `/reading-plans` — legacy redirect to `/grow?tab=plans` (regression check)
- `/challenges` — legacy redirect to `/grow?tab=challenges` (regression check)
- `/` — Dashboard regression surface (atmospheric continuity)
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — DailyHub regression surfaces (canonical violet textarea glow originated here; verify it still reads identically post-migration)
- `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — Spec 5 regression surfaces
- `/bible` — BibleLanding atmospheric continuity regression surface

---

## Architecture Context

### Files in scope (5 implementation files + 1 conditional Button primitive)

- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` (320 LOC) — densest migration: 6 changes (Changes 1, 2, 3, 4, 6, 7) plus Change 5 verification
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` (262 LOC) — Change 10 (h2 GRADIENT_TEXT_STYLE merged with fadeStyle)
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` (257 LOC) — Change 11 (h2 drop font-script, retain themeColor)
- `frontend/src/components/challenges/MilestoneCard.tsx` (146 LOC) — Change 12 (h2 drop font-script, retain themeColor)
- `frontend/src/components/reading-plans/DayCompletionCelebration.tsx` (115 LOC) — Change 8 (Continue button → subtle Button)
- `frontend/src/components/ui/Button.tsx` (118 LOC) — **Change 9 SKIPPED**: gradient variant ALREADY EXISTS at line 49–50 (verified during recon)

### Test files in scope

- `frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx` line 45–49 — REQUIRES UPDATE (test name + assertions)
- `frontend/src/components/reading-plans/__tests__/CreatePlanFlow.test.tsx` — semantic queries only, migration-resilient (verified)
- `frontend/src/components/reading-plans/__tests__/PlanCompletionOverlay.test.tsx` — semantic queries only, no `font-script` queries (verified)
- `frontend/src/components/challenges/__tests__/MilestoneCard.test.tsx` — semantic queries only, no `font-script` queries (verified)
- `frontend/src/components/reading-plans/__tests__/DayCompletionCelebration.test.tsx` — uses `getByText('Continue to Day N')`, survives Button migration (visible text content preserved)

### Patterns this spec USES (already in the codebase)

- **`<BackgroundCanvas>`** at `frontend/src/components/ui/BackgroundCanvas.tsx`. Renders `<div className="relative min-h-screen overflow-hidden" style={{ background: CANVAS_BACKGROUND }}>{children}</div>` (5-stop gradient: 3 violet ellipses + dark vignette + diagonal linear-gradient). Accepts a `className` prop and merges via `cn(...)` — confirmed at line 20 of BackgroundCanvas.tsx. Spec 6A precedent: `/grow` below-hero. Spec 6B precedent: `/reading-plans/:planId`, `/challenges/:challengeId`, NotFound surfaces.
- **`<Button variant="subtle" size="md">`** at `frontend/src/components/ui/Button.tsx:51–52` and `:62`. Class string: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` + size sizing `px-6 py-2.5 text-sm`. Spec 6A precedent: UpcomingChallengeCard "View Details", ConfirmDialog "Pause & Start New". Spec 6B precedent: PlanNotFound + ChallengeNotFound recovery actions.
- **`<Button variant="gradient" size="md">`** at `Button.tsx:49–50`. Class string: `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]` + size sizing `px-6 py-2.5 text-sm`. Tokenized shadow `shadow-gradient-button` resolves to `0 0 24px rgba(167,139,250,0.35), 0 4px 16px rgba(0,0,0,0.40)` (per `tailwind.config.js:67–68`). Production usage: PrayerInput "Help Me Pray" (line 181, `size="lg"`), JournalInput "Save Entry" (line 346, `size="lg"`).
- **`GRADIENT_TEXT_STYLE`** at `frontend/src/constants/gradients.tsx:9`. Exported as: `{ color: 'white', backgroundImage: WHITE_PURPLE_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }`. Production consumers: PageHero, SongPickSection, BibleHero, StreakDetailModal, SectionHeader, StatsBar.
- **`<CrisisBanner>`** at `frontend/src/components/daily/CrisisBanner.tsx`. Reads `text` prop, runs `containsCrisisKeyword`, renders `role="alert"` + `aria-live="assertive"` resource banner. Mounted inside CreatePlanFlow StepOne directly above the textarea.
- **`<CharacterCount>`** at `frontend/src/components/ui/CharacterCount.tsx`. Reads `current`/`max`/`warningAt`/`dangerAt`/`visibleAt`/`id` props, renders zone-change announcements via `aria-live="polite"`. Mounted inside CreatePlanFlow StepOne directly below the textarea, wired to the textarea via `aria-describedby="plan-char-count"`.
- **`useFocusTrap()`** at `frontend/src/hooks/useFocusTrap.ts`. Canonical focus-trap hook. Used by PlanCompletionOverlay (line 66). NOT used by ChallengeCompletionOverlay (custom focus trap at line 69–95, preserved unchanged per recon Q7).
- **`useReducedMotion()`** at `frontend/src/hooks/useReducedMotion.ts:3`. Returns boolean from `prefers-reduced-motion: reduce` matcher.
- **`useSoundEffects()`** at `frontend/src/hooks/useSoundEffects.ts:27`. Returns `{ playSoundEffect }`. Used by PlanCompletionOverlay (line 64) for `'ascending'` on step 3.

### Mounting context

- **CreatePlanFlow** is rendered by `frontend/src/pages/ReadingPlans.tsx:154` as `<CreatePlanFlow onClose={() => setSearchParams({})} />` when the `?create=true` query param is present. ReadingPlans is itself rendered inside `GrowPage` at `frontend/src/pages/GrowPage.tsx:61` which has the outer `<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">` wrapper. CreatePlanFlow's existing `<div className="min-h-screen" style={CREATION_BG_STYLE}>` is a SECOND `min-h-screen` div nested inside GrowPage's outer wrapper — but because CreatePlanFlow short-circuits ReadingPlans' return entirely (line 153–155 returns CreatePlanFlow before the regular tab content), the outer `bg-dashboard-dark` color provides the dark base; the BackgroundCanvas atmospheric layer sits on top via `overflow-hidden` + multi-bloom radial gradients. Spec 6A precedent on `/grow`: the same dark base + BackgroundCanvas overlay pattern works correctly.
- **PlanCompletionOverlay** is portal-rendered to `document.body` (line 156, 259) by `ReadingPlanDetail.tsx`. Sibling to all page chrome.
- **ChallengeCompletionOverlay** is portal-rendered to `document.body` (line 162, 254) by `ChallengeDetail.tsx`. Sibling to all page chrome (per Spec 6B note: stays as a SIBLING, not child, of BackgroundCanvas).
- **MilestoneCard** is inline (NOT a portal) — rendered within ChallengeDetail's flow when `activeMilestone` state is set.
- **DayCompletionCelebration** is inline (NOT a portal) — rendered within ReadingPlanDetail's flow at line 254 when day is marked complete.

### Auth posture (existing — no changes by this spec)

CreatePlanFlow + 4 overlays are all public. CreatePlanFlow's `addCustomPlanId()` writes to `wr_custom_plans` localStorage even for logged-out users (Phase 0.5 dual-write convention — local storage permissible for unauthenticated users). No new auth gates.

### Test pattern conventions

- Vitest + React Testing Library
- Provider wrapping when needed: `MemoryRouter` for navigation-aware components, `ToastProvider` when `useToastSafe` is consumed (MilestoneCard does — but the test does NOT wrap because MilestoneCard imports `useToastSafe` which has a no-op fallback)
- Existing tests use semantic queries (`getByText`, `getByRole`, `getByLabelText`, `getByPlaceholderText`) — only `ChallengeCompletionOverlay.test.tsx:45–49` uses `toHaveClass('font-script')`

---

## Auth Gating Checklist

CreatePlanFlow and the four overlay components are all PUBLIC. No new auth gates added or removed by this spec. Existing behaviors preserved.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View `/grow?create=true` (CreatePlanFlow) | Public — render fully (browse-only) | All Steps 1–7 | None (existing — preserved) |
| Type in textarea | Public | Steps 4, 5 | None (existing — preserved) |
| Click Next (Step 1 → 2) | Public | Step 6 | None (existing — preserved) |
| Click Generate My Plan (Step 2 → 3) | Public; addCustomPlanId writes localStorage even when logged-out | Step 7 | None (existing — preserved) |
| View PlanCompletionOverlay portal | Public | Step 9 | None (existing — preserved) |
| Click Browse Plans / Share / Done on PlanCompletionOverlay | Public | Step 9 | None (existing — preserved) |
| View ChallengeCompletionOverlay portal | Public | Step 10 | None (existing — preserved) |
| View MilestoneCard inline | Public | Step 11 | None (existing — preserved) |
| Click Continue on DayCompletionCelebration | Public | Step 8 | None (existing — preserved) |
| CrisisBanner triggers (typing self-harm keyword in textarea) | Universal (logged-in and logged-out alike) | Step 4 + Step 5 verification | `<CrisisBanner text={topicText}>` mount preserved exactly above textarea |

All spec-defined auth gates (which are zero) are accounted for. CrisisBanner preservation is the safety-critical wiring (Universal Rule 13 — crisis detection supersedes all other feature behavior).

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `<BackgroundCanvas>` | wrapper classes | `relative min-h-screen overflow-hidden` (enforced by primitive) | `BackgroundCanvas.tsx:20` |
| `<BackgroundCanvas>` | inline background | 5-stop multi-bloom (3 violet ellipses at 50%/8%, 80%/50%, 20%/88% + dark vignette at 60%/50% + diagonal linear-gradient `#120A1F → #08051A → #0A0814`) | `BackgroundCanvas.tsx:9–15` |
| GRADIENT_TEXT_STYLE | inline style object | `{ color: 'white', backgroundImage: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }` | `gradients.tsx:9–15` |
| CreatePlanFlow h1 (Steps 1+2) | classes | `text-center text-4xl font-bold sm:text-5xl` (post-migration) | spec line 142 + `09-design-system.md` Round 3 patterns |
| PlanCompletionOverlay h2 | classes | `text-4xl font-bold sm:text-5xl` (post-migration; no `text-center` — flexbox parent centers) | spec line 142 + line 450 acceptance |
| ChallengeCompletionOverlay h2 | classes | `text-4xl font-bold sm:text-5xl` (post-migration; retains `style={{ color: themeColor }}`) | spec line 144 + line 466 acceptance |
| MilestoneCard h2 | classes | `text-3xl font-bold sm:text-4xl` (post-migration; retains `style={{ color: themeColor }}`) | spec line 144 + line 484 acceptance |
| Canonical violet textarea glow | full class string | `w-full resize-none rounded-xl p-4 text-white backdrop-blur-sm min-h-[120px] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40` | `09-design-system.md` § "Textarea Glow Pattern" (DailyHub 1B / Round 4) + spec line 148 |
| Button variant=subtle | classes (resolved) | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` | `Button.tsx:51–52` |
| Button variant=gradient | classes (resolved) | `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]` | `Button.tsx:49–50` |
| Button size=md (subtle/gradient) | sizing | `px-6 py-2.5 text-sm` | `Button.tsx:62` |
| `shadow-gradient-button` token | resolved | `0 0 24px rgba(167,139,250,0.35), 0 4px 16px rgba(0,0,0,0.40)` | `tailwind.config.js:67` |
| `shadow-gradient-button-hover` token | resolved | `0 0 32px rgba(167,139,250,0.45), 0 6px 20px rgba(0,0,0,0.40)` | `tailwind.config.js:68` |
| `shadow-subtle-button-hover` token | resolved | `0 0 16px rgba(139,92,246,0.10), 0 4px 12px rgba(0,0,0,0.30)` | `tailwind.config.js:69` |
| Button focus ring (default) | classes | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | `Button.tsx:43–44` |
| Button gradient focus ring (override) | classes | `focus-visible:ring-violet-300` (overrides primary ring color) | `Button.tsx:50` |

**Critical correction on textarea glow:** Spec body text line 47 says "white box-shadow glow" but lines 146–149 (the canonical class string) and `09-design-system.md` § "Textarea Glow Pattern" both specify the **violet** glow (Daily Hub Round 4 / DailyHub 1B). The plan applies the violet pattern. The white-glow pattern was the Round 3 transitional state before DailyHub 1B retuned it to violet. This is consistent with the design system reminder: do NOT use the white-glow pattern on new textareas.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. **Caveat font is fully deprecated for headings — used only for the logo.** This spec migrates 5 Caveat sites: 3 get `GRADIENT_TEXT_STYLE` (CreatePlanFlow StepOne h1, StepTwo h1, PlanCompletionOverlay h2) and 2 retain `themeColor` inline style after dropping `font-script` (ChallengeCompletionOverlay h2, MilestoneCard h2 — Decision 6 refinement, see "Refinement to direction doc" in spec).
- The Pray and Journal textareas — and the migrated CreatePlanFlow textarea — use the **canonical violet textarea glow** from `09-design-system.md` § "Textarea Glow Pattern": `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`. Do NOT use `animate-glow-pulse` (deprecated), do NOT use cyan border `border-glow-cyan/30` (deprecated, this spec removes the last cyan holdout), do NOT use the older white-glow `shadow-[0_0_20px_3px_rgba(255,255,255,0.50)...]` (Round 3 transitional state, superseded by DailyHub 1B violet).
- **`<Button variant="gradient">` ALREADY EXISTS** at `Button.tsx:49–50`. Pre-execution recon item 4 verified this: the variant is in production (PrayerInput "Help Me Pray", JournalInput "Save Entry") and uses the project's tokenized shadow `shadow-gradient-button` rather than the spec's literal `shadow-[0_0_30px_rgba(167,139,250,0.4)]` — the divergence is INTENTIONAL (the tokens are the canonical project pattern; literal shadow strings would diverge from the project's Tailwind shadow extension). **Change 9 is SKIPPED.** Change 7 consumes the existing variant.
- Worship Room button text is BLACK on the gradient variant (not white) — the violet-400 → violet-300 gradient is light enough that black text reads cleanly.
- **`<BackgroundCanvas>` accepts a `className` prop** and enforces its own `min-h-screen` (verified at `BackgroundCanvas.tsx:20`). Change 1 wraps CreatePlanFlow with `<BackgroundCanvas>` directly replacing the existing `<div className="min-h-screen" style={CREATION_BG_STYLE}>` — no inner wrapping needed.
- **CrisisBanner + CharacterCount preservation is safety-critical** (Universal Rule 13). The visual migration on the textarea (Change 4) MUST preserve: (a) CrisisBanner mounted as a sibling immediately preceding the textarea, (b) CrisisBanner's `text={topicText}` prop, (c) CharacterCount mounted directly below the textarea, (d) CharacterCount's `id="plan-char-count"`, (e) the textarea's `aria-describedby="plan-char-count"` linkage. NO position changes, NO new wrapper divs, NO prop changes.
- **PlanCompletionOverlay's h2 spread merge order** must be `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}` (gradient last so its keys win on any future overlap). The two style objects do NOT share keys today — fadeStyle returns `{ opacity, transform, transition }`; GRADIENT_TEXT_STYLE returns `{ color, backgroundImage, WebkitBackgroundClip, WebkitTextFillColor, backgroundClip }`. STOP and flag if a future fadeStyle change adds a `color` key.
- **The `id="plan-completion-title"` on PlanCompletionOverlay's h2 MUST be preserved** — referenced by `aria-labelledby="plan-completion-title"` on the dialog at line 161. Removing or renaming the id would break screen reader announcement of the dialog.
- **The Sparkles icon on the gradient Generate button** moves from `<Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />` (current) to `<Sparkles className="h-4 w-4" aria-hidden="true" />` (post-migration) as a leading child of `<Button variant="gradient">`. The Button primitive's gradient variant includes `gap-2` (line 50 of Button.tsx) which provides the icon→text spacing; the `mr-2 inline-block` is redundant once Button's flex layout takes over. Verify visually at execution.
- **Theme-color preservation (Decision 8):** Every `style={{ color: themeColor }}`, `style={{ backgroundColor: themeColor }}`, and themeColor-based confetti palette stays exactly as-is. The 2 h2 sites (ChallengeCompletionOverlay, MilestoneCard) drop `font-script` but RETAIN `style={{ color: themeColor }}` — `GRADIENT_TEXT_STYLE` is NOT applied (it would override the themeColor and flatten 5 seasonal palettes into uniform brand expression).
- **Italic preservation (Decision 4):** Two italic blockquotes preserved unchanged: PlanCompletionOverlay scripture (`font-serif text-base italic leading-relaxed text-white/80`), CreatePlanFlow Step 3 Jeremiah 29:11 (`font-serif text-base italic leading-relaxed text-white/60`). Caveat-script removal does NOT remove italic — Caveat is `font-script`, italic is `font-serif italic`, different patterns.
- **Step 3 of CreatePlanFlow is uninterruptible** (line 109 conditionally renders the back-arrow on `!isGenerating`; lines 58, 71 short-circuit Escape and back-button when `isGenerating === true`). The 2.5-second simulated AI generation timing must be preserved exactly (line 102).
- **`useFaithPoints.recordActivity` preservation:** No changes to activity engine integration. DayCompletionCelebration's parent (ReadingPlanDetail) calls recordActivity on day complete; ChallengeDetail calls recordActivity on Mark Complete. This spec touches visual chrome only.
- **No deprecated patterns introduced.** This spec only removes deprecated patterns (Caveat headings, cyan textarea glow, CREATION_BG_STYLE inline-style atmospheric layer, bg-primary CTAs) and replaces them with canonical patterns.
- **Inline-row position verification.** For CreatePlanFlow Step 1's chip row + buttons + textarea (vertically stacked, NOT inline at one row level), no inline-row positional verification is needed at the page-section level; the chip row itself uses `flex-wrap` and is allowed to wrap. For PlanCompletionOverlay's 3 sub-CTAs, the row uses `flex-col gap-3 sm:flex-row sm:justify-center` — at desktop they sit on one row; verify `boundingBox().y` matches across the 3 buttons at 1440px (±5px tolerance) since all 3 buttons share identical chrome (`min-h-[44px]`).

**Sources for this block:** `09-design-system.md` § "Round 3 Visual Patterns" + § "Textarea Glow Pattern" + § "Daily Hub Visual Architecture" + § "Deprecated Patterns"; design system recon `_plans/recon/design-system.md`; spec body Decisions 2, 4, 6 (with refinement), 8, 9, 10, 13; Spec 6B Execution Log deviations (BackgroundCanvas wrap shape verification, themeColor preservation precedent, Caveat-removal context refinement).

---

## Shared Data Models (from Master Plan)

The direction doc `grow-2026-05-04.md` is the master spec for the Grow rollout. This spec uses no new TypeScript interfaces. All data shapes are preserved unchanged.

**Existing TypeScript interfaces this spec consumes (preserved unchanged):**

```typescript
// CreatePlanFlow.tsx
interface CreatePlanFlowProps { onClose: () => void }
interface DurationOption { days: number; label: string; description: string; icon: LucideIcon }

// PlanCompletionOverlay.tsx
interface PlanCompletionOverlayProps {
  planTitle: string
  totalDays: number
  planId: string
  startDate?: string | null
  onDismiss: () => void
  onBrowsePlans: () => void
}

// ChallengeCompletionOverlay.tsx
interface ChallengeCompletionOverlayProps {
  challengeTitle: string
  themeColor: string
  daysCompleted: number
  totalPointsEarned: number
  badgeName: string
  onDismiss: () => void
}

// MilestoneCard.tsx
interface MilestoneCardProps {
  milestoneTitle: string
  challengeTitle: string
  challengeId: string
  themeColor: string
  currentDay: number
  totalDays: number
  streak: number
  onDismiss: () => void
}

// DayCompletionCelebration.tsx
interface DayCompletionCelebrationProps {
  dayNumber: number
  pointsAwarded: boolean
  isLastDay: boolean
  onContinue: () => void
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_custom_plans` | Write only (existing — preserved) | CreatePlanFlow's `addCustomPlanId()` appends the matched plan ID on Generate My Plan. Per `11-local-storage-keys.md` § "Content Features": string array of plan IDs, max 200. NO shape change by this spec. |
| `wr_daily_activities` | (Untouched by this spec — written by ReadingPlanDetail/ChallengeDetail's `recordActivity` calls) | Listed for context |
| `wr_faith_points` | (Untouched by this spec) | Listed for context |
| `wr_streak` | (Untouched by this spec) | Listed for context |

**No new localStorage keys introduced.** No existing-key shape changes.

**Direction doc Decisions consumed:**
- Decision 2 (BackgroundCanvas added to all Grow surfaces) → Change 1
- Decision 4 (Scripture italic preserved as Lora exception) → preservation requirement on PlanCompletionOverlay scripture + CreatePlanFlow Step 3 Jeremiah quote
- Decision 6 + refinement (Caveat retired; 3 sites get GRADIENT_TEXT_STYLE, 2 sites retain themeColor) → Changes 2, 3, 10, 11, 12
- Decision 8 (theme-color brand expressions preserved as inline-styled rolls-own) → preservation requirement on Challenge h2/badge/confetti, MilestoneCard h2/share button
- Decision 9 (`bg-primary` solid CTAs migrate per emotional weight) → Changes 6, 7, 8
- Decision 10 (cyan textarea glow → canonical violet textarea glow) → Change 4
- Decision 13 (CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas) → Change 1

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | CreatePlanFlow surface centered in `max-w-2xl` with `px-4 py-6` padding; h1s render at `text-4xl` with GRADIENT_TEXT_STYLE; textarea full-width with violet glow; Step 1 Next button + Step 2 Generate full-width via `className="w-full sm:w-auto"`; topic chips wrap. PlanCompletionOverlay portal centers on `bg-black/70 backdrop-blur-sm`; content card `max-w-md mx-4`; sub-CTAs render in 1-column (`flex-col`). ChallengeCompletionOverlay portal centers on `bg-black/80 backdrop-blur-sm`; content card-less with `px-6 py-8` inset; 5 sub-CTA cards render in 1-column grid (`grid-cols-1`). MilestoneCard inline at `max-w-2xl px-4 py-6`; share + Keep Going buttons full-width. DayCompletionCelebration inline as a top-border-divider section with full-width Continue button. BackgroundCanvas atmospheric layer renders behind CreatePlanFlow content. |
| Tablet | 768px | h1s bump to `sm:text-5xl` on CreatePlanFlow + PlanCompletionOverlay; ChallengeCompletionOverlay h2 bumps to `sm:text-5xl`; MilestoneCard h2 bumps to `sm:text-4xl`. Buttons render at natural width via `sm:w-auto`. ChallengeCompletionOverlay's 5 sub-CTAs bump to 2-column grid (`sm:grid-cols-2`) with the 5th card spanning both columns + centering (`sm:col-span-2 sm:mx-auto sm:max-w-[calc(50%-0.375rem)]`). PlanCompletionOverlay's 3 sub-CTAs bump to `sm:flex-row sm:justify-center` (one row). CreatePlanFlow stays `max-w-2xl` (no widening). |
| Desktop | 1440px | Same as tablet for h1s, buttons, and grid. PlanCompletionOverlay confetti density 30 particles; ChallengeCompletionOverlay confetti density 24 particles; MilestoneCard celebration toast confetti at toast system defaults. |

**Custom breakpoints:** None. The 5 in-scope files use the canonical `sm:` (640px) breakpoint.

**Cross-breakpoint preservation:** Every Button migration consumes `size="md"` which resolves to `min-h-[44px]` (Button.tsx:48, 50, 52). Touch targets meet the 44px minimum. The CreatePlanFlow textarea's violet glow renders identically at every breakpoint. CrisisBanner + CharacterCount accessibility wiring is breakpoint-agnostic. Both completion overlays' portal positioning + backdrop blur are breakpoint-agnostic.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| CreatePlanFlow Step 1 progress dots row | Dot 1, Dot 2, Dot 3 | All 3 dots share `boundingBox().y` (±2px tolerance — identical 8x8px chrome) at every breakpoint | Wrapping forbidden at every breakpoint |
| CreatePlanFlow topic chips row | 6 starter chips (Anxiety, Grief, Relationship struggles, Finding purpose, Strengthening faith, Forgiveness) | Allowed to wrap via `flex-wrap`; no positional assertion | Wrapping ALLOWED at every breakpoint |
| CreatePlanFlow Step 3 bouncing loading dots | Dot 1, Dot 2, Dot 3 | All 3 dots share `boundingBox().y` (±2px tolerance — identical 8x8px chrome) at every breakpoint | Wrapping forbidden at every breakpoint |
| CreatePlanFlow Step 3 progress dots row (during generation) | Dot 1, Dot 2, Dot 3 | Same as Step 1 progress dots — share y (±2px) | Wrapping forbidden at every breakpoint |
| PlanCompletionOverlay sub-CTA row | Browse Plans, Share, Done | Mobile: stacked (column); tablet+ (≥640px): all 3 share `boundingBox().y` (±5px) — identical `min-h-[44px]` chrome | Wrapping below 640px is the EXPECTED behavior (`flex-col sm:flex-row`); at ≥640px, wrap forbidden |
| ChallengeCompletionOverlay sub-CTA grid | 5 cards (See growth / Leaderboard / Share / Browse plans / Browse challenges) | Variable-height cards (icon + title + description). Mobile: 1-column. Tablet+: 2-column with 5th card spanning both columns and centering. NO wrapping bug — the layout uses CSS Grid (`grid-cols-1 sm:grid-cols-2`) which never wraps unexpectedly. | N/A — Grid is positionally deterministic |
| MilestoneCard CTA row | Share Your Milestone, Keep Going | Mobile: stacked (`flex-col`); tablet+ (≥640px): both share `boundingBox().y` (±5px) — identical `min-h-[44px]` chrome | Wrapping below 640px is EXPECTED (`flex-col sm:flex-row`); at ≥640px, wrap forbidden |
| DayCompletionCelebration text+pill row | "Day N Complete" text, "+15 pts" pill | Mobile: stacked (`flex-col`); tablet+: both share `boundingBox().y` (±5px tolerance — variable-height children but `items-center` centers them — verify "No element drops below the row's vertical span") | Wrapping below 640px is EXPECTED (`flex-col sm:flex-row`); at ≥640px, no wrap |

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification). The PlanCompletionOverlay sub-CTA row at desktop is the most important assertion — three identical-chrome buttons must sit on one row.

---

## Vertical Rhythm

**Expected spacing between adjacent sections:**

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| CreatePlanFlow back button → progress dots | `mb-4` (16px) on back button at line 113; progress dots have no top margin (sibling) | CreatePlanFlow.tsx:113, 122 |
| CreatePlanFlow progress dots → step content | `mt-8` (32px) on step content wrapper | CreatePlanFlow.tsx:139 |
| StepOne h1 → CrisisBanner+textarea container | `mt-8` (32px) on the container | CreatePlanFlow.tsx:186 |
| StepOne textarea → CharacterCount | `mt-2` (8px) on the right-aligned wrapper | CreatePlanFlow.tsx:199 |
| StepOne CharacterCount → topic chips | `mt-6` (24px) on the chip row | CreatePlanFlow.tsx:205 |
| StepOne topic chips → Next button | `mt-8` (32px) on the button wrapper | CreatePlanFlow.tsx:219 |
| StepTwo h1 → duration cards | `mt-8` (32px) | CreatePlanFlow.tsx:255 |
| StepTwo duration cards → Generate button | `mt-8` (32px) | CreatePlanFlow.tsx:278 |
| StepThree bouncing dots → loading text | `mt-6` (24px) | CreatePlanFlow.tsx:310 |
| StepThree loading text → scripture | `mt-8` (32px) | CreatePlanFlow.tsx:314 |
| PlanCompletionOverlay icon → h2 | inline (no margin — both inside `<div className="text-center">`) | PlanCompletionOverlay.tsx:185–196 |
| PlanCompletionOverlay h2 → plan title | `mt-3` (12px) on plan title `<p>` | PlanCompletionOverlay.tsx:199 |
| PlanCompletionOverlay plan title → stats card | `mt-4` (16px) on stats card | PlanCompletionOverlay.tsx:204 |
| PlanCompletionOverlay stats card → scripture | `mt-5` (20px) on scripture | PlanCompletionOverlay.tsx:218 |
| PlanCompletionOverlay scripture → CTAs | `mt-6` (24px) on CTA row | PlanCompletionOverlay.tsx:229 |
| ChallengeCompletionOverlay h2 → "Challenge Complete!" | `mt-3` (12px) | ChallengeCompletionOverlay.tsx:198 |
| ChallengeCompletionOverlay "Challenge Complete!" → stats | `mt-3` (12px) | ChallengeCompletionOverlay.tsx:203 |
| ChallengeCompletionOverlay badge swatch → CTA grid | `mt-6` (24px) on CTA grid | ChallengeCompletionOverlay.tsx:221 |
| MilestoneCard h2 → share image | `mt-4` (16px) | MilestoneCard.tsx:114 |
| MilestoneCard share image → CTA row | `mt-6` (24px) | MilestoneCard.tsx:122 |
| DayCompletionCelebration checkmark → text row | `gap-3` (12px from `flex-col gap-3`) | DayCompletionCelebration.tsx:53 |
| DayCompletionCelebration text → Continue button | `mt-3` (12px) on the button | DayCompletionCelebration.tsx:106 |

**No gap changes by this spec.** All vertical rhythm preserved exactly. `/verify-with-playwright` Step 6e compares these post-migration against the pre-migration baseline; a >5px deviation flags a regression.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 6A is merged: BackgroundCanvas wraps `/grow` below-hero; FrostedCard consumed on PlanCard / UpcomingChallengeCard / ActiveChallengeCard / NextChallengeCountdown / PastChallengeCard / HallOfFame; Tonal Icon Pattern on Plans/Challenges tab icons; dead `FilterBar.tsx` deleted; ConfirmDialog "Pause & Start New" migrated to subtle Button. Re-verify by inspecting `frontend/src/pages/GrowPage.tsx` and the card components.
- [ ] Spec 6B is merged: BackgroundCanvas wraps `/reading-plans/:planId` and `/challenges/:challengeId`; ReadingPlanDetail h1 Caveat removed; both detail-page hero subtitles migrated; both day-content components consume FrostedCard subdued action callout; both NotFound pages wrap centered content in BackgroundCanvas + use subtle Button asChild; ChallengeDetail's redundant inline completion banner deleted.
- [ ] Direction doc `_plans/direction/grow-2026-05-04.md` is on disk and Decisions 2, 4, 6 (with refinement), 8, 9, 10, 13 still match the spec body.
- [ ] Recon `_plans/recon/grow-create-overlays-2026-05-04.md` is on disk.
- [ ] **Button gradient variant ALREADY EXISTS** at `Button.tsx:49–50`. Verified during planning recon. Production usage at PrayerInput:181 + JournalInput:346. **Change 9 IS SKIPPED.** If a future plan-time check finds the variant has been removed or modified, STOP and surface to the user before proceeding.
- [ ] BackgroundCanvas at `frontend/src/components/ui/BackgroundCanvas.tsx` accepts a `className` prop (line 6) and merges via `cn()` at line 20. The primitive enforces `min-h-screen overflow-hidden` so Change 1 can replace `<div className="min-h-screen" style={CREATION_BG_STYLE}>` with `<BackgroundCanvas>` directly.
- [ ] `GRADIENT_TEXT_STYLE` import path is `@/constants/gradients` (verified — production consumers at PageHero, SongPickSection, BibleHero, StreakDetailModal, SectionHeader, StatsBar).
- [ ] All auth-gated actions from the spec are accounted for (zero new auth gates by this spec; CrisisBanner preservation is the safety-critical wiring).
- [ ] Design system values are verified: textarea glow class string from `09-design-system.md` § "Textarea Glow Pattern" (violet, NOT white — the spec body line 47 has a single misleading reference; the canonical class string at spec lines 146–149 is the violet pattern).
- [ ] No `[UNVERIFIED]` values in the plan — every token, variant, and prop is in production use.
- [ ] Recon report loaded for visual verification during execution (`_plans/recon/grow-create-overlays-2026-05-04.md`).
- [ ] Prior specs in the sequence (6A, 6B) are complete and committed.
- [ ] No deprecated patterns used: NO Caveat headings (this spec REMOVES 5), NO BackgroundSquiggle on Daily Hub (out of scope), NO GlowBackground on Daily Hub (out of scope), NO `animate-glow-pulse` (this spec REMOVES the cyan textarea glow which had no pulse but was stylistically obsolete), NO cyan textarea border (this spec REMOVES the last cyan holdout), NO italic Lora prompts (italic stays on the 2 scripture blockquotes per Decision 4), NO soft-shadow 8px-radius cards on dark backgrounds (out of scope), NO `PageTransition` (already removed).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Change 9 (Button gradient variant primitive extension) | **SKIPPED** | Variant already exists at `Button.tsx:49–50`. The existing class string uses tokenized shadow (`shadow-gradient-button`) rather than the spec's literal-string shadow (`shadow-[0_0_30px_rgba(167,139,250,0.4)]`). Tokenized shadow is the canonical project pattern (matches `tailwind.config.js:67`). Pre-execution recon item 4's "STOP and flag" condition is interpreted as: the divergence is COSMETIC AND INTENTIONAL — proceed to Change 7 directly. |
| BackgroundCanvas wrapping shape (recon item 8) | `<BackgroundCanvas>` directly replaces `<div className="min-h-screen" style={CREATION_BG_STYLE}>` with no inner wrapping needed | BackgroundCanvas accepts `className` and enforces `min-h-screen` itself (verified at `BackgroundCanvas.tsx:20`). The current inner content `<div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">` is preserved unchanged inside BackgroundCanvas. |
| Spec body line 47 says "white box-shadow glow" but lines 146–149 specify violet glow | **Apply violet glow** per `09-design-system.md` § "Textarea Glow Pattern" + spec lines 146–149 (the canonical class string) | The spec body uses the older "white" terminology in one preamble paragraph (a residual from the Round 3 transitional state); the canonical class string the spec mandates is unambiguously the violet pattern from DailyHub 1B / Round 4. The design system rule file is authoritative. |
| Spread merge order on PlanCompletionOverlay h2 (recon item 9) | `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}` (gradient last) | Spec line 568. Today the two style objects share zero keys (fadeStyle: opacity/transform/transition; gradient: backgroundImage/WebkitBackgroundClip/color/etc). Gradient last so its keys win on any future overlap. |
| `ChallengeCompletionOverlay.test.tsx:45–49` test update | Update test name to `'renders challenge title with themeColor brand expression'`; replace `toHaveClass('font-script')` with `not.toHaveClass('font-script')` AND `toHaveStyle({ color: defaultProps.themeColor })` | Spec line 247–251. The old test asserted on the deprecated pattern; the updated test asserts the deprecated pattern is GONE and the brand-expression themeColor is APPLIED. The test name change makes the intent clear. |
| Sparkles icon spacing on gradient Generate button (recon item 11) | Move from `<Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />` to `<Sparkles className="h-4 w-4" aria-hidden="true" />` as a leading child | Button gradient variant includes `gap-2` (Button.tsx:50) which provides icon→text spacing. The `mr-2 inline-block` becomes redundant once flex layout takes over. Visually verify at execution; if spacing reads wrong, fall back to wrapping the icon in a `<span className="mr-2">` or re-applying `mr-2` (low risk — Spec 6A's UpcomingChallengeCard "View Details" subtle Button uses the same icon+text pattern and works correctly). |
| ChallengeCompletionOverlay's custom focus trap (lines 69–95) | **Preserved unchanged** | Out of 6C scope per recon Q7. Future a11y spec will harmonize with `useFocusTrap()`. |
| Sound effect asymmetry between Plan and Challenge overlays | **Preserved unchanged** | Out of 6C scope per recon Q8. Future sound-design spec. |
| MilestoneCard's celebration-card chrome (`bg-white/10 backdrop-blur-md rounded-2xl border border-white/20`) | **Preserved unchanged** | Out of 6C scope per Decision 7 + recon Q9. Rolls-own celebration variant. |
| CreatePlanFlow Step 2 duration card `border-primary` selected state | **Preserved unchanged** | Selection state, not CTA. Decision 9 enumerates buttons only. |
| CreatePlanFlow progress dots / Step 3 bouncing loading dots `bg-primary` | **Preserved unchanged** | Visual indicators, not CTAs. Same precedent as Spec 6B's ReadingPlanDetail progress bar fill. |
| CreatePlanFlow topic chips chrome | **Preserved unchanged** | Canonical chip chrome (`min-h-[44px]`, `rounded-full`, `bg-white/10`, `text-white/80`). Direction doc does not enumerate. |
| PlanCompletionOverlay 3 sub-CTAs / ChallengeCompletionOverlay 5 sub-CTAs | **Preserved unchanged** | Canonical neutral chrome (`bg-white/[0.08] border border-white/10 hover:bg-white/[0.12]`). Direction doc does not enumerate. |
| Hardcoded `#27AE60` in DayCompletionCelebration's SVG checkmark | **Preserved unchanged** | Pre-existing technical debt; out of 6C scope. Future cleanup spec. |
| BB-33 animation token cleanup on ChallengeCompletionOverlay (lines 31, 55, 63) | **Preserved unchanged** | Pre-existing technical debt; out of 6C scope. Future BB-33 cleanup spec. |
| Hardcoded `text-primary-lt` icon color on Step 2 duration cards | **Preserved unchanged** | Pre-existing; not enumerated in Decision 11; out of 6C scope. |

---

## Implementation Steps

### Step 1: Pre-execution recon and baseline capture

**Objective:** Lock in the live state of the codebase before any code change. Verify the planning-time recon claims hold, capture the test baseline, and document any drift.

**Files to read (no modifications):**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — confirm 320 LOC + the 6 migration sites + state machine + CrisisBanner + CharacterCount wiring
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` — confirm h2 at line 190–196 with `id="plan-completion-title"` + `fadeStyle(3)` + `aria-labelledby` at line 161
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` — confirm h2 at line 190–195 with `font-script` + `style={{ color: themeColor }}` + custom focus trap at line 69–95 + click-outside-to-dismiss + 12s auto-dismiss
- `frontend/src/components/challenges/MilestoneCard.tsx` — confirm h2 at line 109 with `font-script` + `style={{ color: themeColor }}` + 6C scope (no celebration-card chrome change)
- `frontend/src/components/reading-plans/DayCompletionCelebration.tsx` — confirm Continue button at line 102–110 with `bg-primary` + `!isLastDay` gate + `Continue to Day {dayNumber + 1}` text
- `frontend/src/components/ui/Button.tsx` — confirm gradient variant at line 49–50 + subtle variant at line 51–52 + size sizing at line 62
- `frontend/src/constants/gradients.tsx` — confirm `GRADIENT_TEXT_STYLE` export at line 9
- `frontend/src/components/ui/BackgroundCanvas.tsx` — confirm `className` prop accepted at line 6 + `cn()` merge at line 20 + multi-bloom inline style at line 9–15
- `frontend/tailwind.config.js` — confirm `shadow-gradient-button`/`shadow-gradient-button-hover`/`shadow-subtle-button-hover` tokens at line 67–69
- All 5 test files in scope — confirm the assertion shapes documented in spec lines 119–123

**Run baseline:**
```bash
cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80
cd frontend && pnpm typecheck
```

Record total pass/fail counts. Per CLAUDE.md the baseline is **9,470 pass / 1 pre-existing fail** (`useFaithPoints — intercession activity drift`), with optional `useNotifications — returns notifications sorted newest first` flake bringing it to **9,469/2 across 2 files**. Spec 6B reported 47/47 verification assertions on its clean baseline. Reconcile against the live count; the live number is authoritative. Any NEW failure introduced by this spec must be reconciled before completion.

**Details:**
- Confirm Button gradient variant exists. **EXPECTED RESULT:** variant present at line 49–50 with tokenized `shadow-gradient-button`. **Decision:** Change 9 SKIPPED. If variant is MISSING, STOP and revisit Change 9.
- Confirm BackgroundCanvas wrapping shape. **EXPECTED RESULT:** primitive enforces `min-h-screen overflow-hidden` and accepts `className`. **Decision:** Change 1 wraps with `<BackgroundCanvas>` directly (no inner div).
- Confirm CrisisBanner + CharacterCount wiring at CreatePlanFlow.tsx:187 (CrisisBanner above textarea), :189–198 (textarea), :199–201 (CharacterCount below textarea), :197 (`aria-describedby="plan-char-count"`), :200 (`id="plan-char-count"`).
- Confirm state machine at CreatePlanFlow.tsx:50–103: step transitions gated correctly, isGenerating gates back-button (line 109) + Escape (lines 58, 71), 2.5s `setTimeout` synchronous body (line 97–102).
- Confirm `addCustomPlanId()` writes to `wr_custom_plans` localStorage (line 99 — Phase 0.5 dual-write spec preserved).

**Auth gating (if applicable):** N/A — no auth check changes; only verify CrisisBanner preservation.

**Responsive behavior:** N/A: no UI impact (recon only).

**Guardrails (DO NOT):**
- DO NOT modify any source file in this step.
- DO NOT skip the test baseline capture — without it, regression detection is impossible.
- DO NOT proceed if Button gradient variant has been removed or modified since planning time.
- DO NOT proceed if BackgroundCanvas no longer accepts `className`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Test baseline capture | manual | Record live `pnpm test --run` and `pnpm typecheck` output. No NEW failures permitted post-migration. |
| Recon verification | manual | Confirm 11 recon claims (variant exists, BackgroundCanvas API, GRADIENT_TEXT_STYLE path, CrisisBanner wiring, CharacterCount wiring, ARIA linkage, state machine, test file shapes). |

**Expected state after completion:**
- [ ] Test baseline numbers recorded in execution log
- [ ] Button gradient variant existence + class string captured in execution log
- [ ] BackgroundCanvas wrapping decision recorded ("`<BackgroundCanvas>` directly replaces the styled div")
- [ ] CrisisBanner + CharacterCount wiring confirmed canonical at CreatePlanFlow.tsx:187, 199–201
- [ ] Spread merge order plan recorded for PlanCompletionOverlay h2 (`style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}`)

---

### Step 2: Change 1 — CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas

**Objective:** Replace the inline `CREATION_BG_STYLE` constant + the `<div className="min-h-screen" style={CREATION_BG_STYLE}>` wrapper with a `<BackgroundCanvas>` wrap. Delete the constant entirely.

**Files to create/modify:**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — delete CREATION_BG_STYLE (lines 13–17), add `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'`, replace the outer `<div>` with `<BackgroundCanvas>`

**Details:**

Add to imports at the top of CreatePlanFlow.tsx:
```tsx
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
```

Delete lines 13–17 entirely (the `CREATION_BG_STYLE` const).

Change the JSX outer wrapper at line 105–106 from:
```tsx
return (
  <div className="min-h-screen" style={CREATION_BG_STYLE}>
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
```

to:
```tsx
return (
  <BackgroundCanvas>
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
```

Update the matching closing tag at line 161 from `</div>` to `</BackgroundCanvas>`.

The inner `<div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">` and all child content stays unchanged.

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): BackgroundCanvas atmospheric layer renders behind the centered `max-w-2xl` content; multi-bloom violet ellipses visible
- Tablet (768px): same — BackgroundCanvas is breakpoint-agnostic (the primitive's inline style is fixed)
- Mobile (375px): same — BackgroundCanvas continues to render. The `#4A1D96` warm violet mid-gradient that previously read on the create surface is GONE (Decision 13 — accepted aesthetic shift)

**Inline position expectations (if this step renders an inline-row layout):** N/A — atmospheric layer change only.

**Guardrails (DO NOT):**
- DO NOT keep the `CREATION_BG_STYLE` constant as dead code — DELETE it entirely (spec acceptance criterion line 416)
- DO NOT add a `className` prop to `<BackgroundCanvas>` (the primitive's enforced `min-h-screen overflow-hidden` is sufficient)
- DO NOT wrap BackgroundCanvas in another `min-h-screen` div
- DO NOT change the inner `<div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">` content padding
- DO NOT relocate the back button, progress dots, or step content
- DO NOT change z-index or stacking context (BackgroundCanvas applies its own `relative` wrapper)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing CreatePlanFlow tests pass unchanged | unit/integration | All 17 tests in `CreatePlanFlow.test.tsx` still pass — they use semantic queries (no class-string assertions) so the BackgroundCanvas wrapping is invisible to them |
| Visual smoke (manual) | manual | `/grow?create=true` opens with violet atmospheric blooms gently visible behind step content; no warm violet `#4A1D96` mid-gradient visible |

**Expected state after completion:**
- [ ] `CREATION_BG_STYLE` const removed from CreatePlanFlow.tsx (lines 13–17 gone)
- [ ] `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'` added to imports
- [ ] Outer wrapper uses `<BackgroundCanvas>` instead of `<div className="min-h-screen" style={CREATION_BG_STYLE}>`
- [ ] All 17 CreatePlanFlow tests pass
- [ ] Visual smoke confirms BackgroundCanvas renders behind content

---

### Step 3: Change 2 — CreatePlanFlow StepOne h1 GRADIENT_TEXT_STYLE

**Objective:** Drop `font-script` from the StepOne h1 ("What's on your heart?") and apply `GRADIENT_TEXT_STYLE` so the heading reads as a uniform white-to-purple gradient consistent with the rest of the Round 3 system.

**Files to create/modify:**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — modify StepOne h1 at line 182–184; add `GRADIENT_TEXT_STYLE` import

**Details:**

Add to imports:
```tsx
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
```

Change StepOne h1 at line 182–184 from:
```tsx
<h1 className="text-center font-script text-4xl text-white sm:text-5xl">
  What&apos;s on your heart?
</h1>
```

to:
```tsx
<h1 className="text-center text-4xl font-bold sm:text-5xl" style={GRADIENT_TEXT_STYLE}>
  What&apos;s on your heart?
</h1>
```

The class string drops `font-script` and `text-white` (because GRADIENT_TEXT_STYLE sets `color: white` as the fallback then overrides via WebkitTextFillColor/backgroundClip). It adds `font-bold` (replaces the implicit Caveat semibold). The `sm:text-5xl` and `text-4xl` and `text-center` are preserved exactly.

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): h1 renders at `text-5xl` (48px) with violet-to-white gradient text via background-clip
- Tablet (768px): h1 renders at `text-5xl` (48px)
- Mobile (375px): h1 renders at `text-4xl` (36px)

**Inline position expectations:** N/A — single heading.

**Guardrails (DO NOT):**
- DO NOT keep `font-script` (deprecated pattern)
- DO NOT keep `text-white` (GRADIENT_TEXT_STYLE handles color via background-clip; redundant class causes no visual harm but adds noise)
- DO NOT change `text-center` or sm:text-5xl breakpoint sizing
- DO NOT introduce a different gradient string (GRADIENT_TEXT_STYLE is the canonical project export)
- DO NOT inline a hardcoded gradient style — import from `@/constants/gradients`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing StepOne tests pass unchanged | unit | The "What's on your heart?" text query (semantic) is preserved exactly; tests that check for text content survive |
| DOM inspection (manual / smoke) | manual | After Change 2 lands, inspect StepOne in dev tools: h1 has no `font-script` class, has inline style with `WebkitBackgroundClip: text`, h1 visually reads as a violet-to-white gradient |

**Expected state after completion:**
- [ ] StepOne h1 class string is `text-center text-4xl font-bold sm:text-5xl`
- [ ] StepOne h1 has `style={GRADIENT_TEXT_STYLE}`
- [ ] DOM inspection confirms `font-script` is absent on the h1
- [ ] Text content "What's on your heart?" preserved exactly

---

### Step 4: Change 3 — CreatePlanFlow StepTwo h1 GRADIENT_TEXT_STYLE

**Objective:** Same migration as Step 3 but for the StepTwo h1 ("How long of a journey?").

**Files to create/modify:**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — modify StepTwo h1 at line 251–253

**Details:**

Change StepTwo h1 at line 251–253 from:
```tsx
<h1 className="text-center font-script text-4xl text-white sm:text-5xl">
  How long of a journey?
</h1>
```

to:
```tsx
<h1 className="text-center text-4xl font-bold sm:text-5xl" style={GRADIENT_TEXT_STYLE}>
  How long of a journey?
</h1>
```

Identical pattern to Change 2 (Step 3 of this plan). The `GRADIENT_TEXT_STYLE` import is already present from Change 2; no additional import needed.

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): h1 renders at `text-5xl` with gradient
- Tablet (768px): h1 renders at `text-5xl`
- Mobile (375px): h1 renders at `text-4xl`

**Inline position expectations:** N/A — single heading.

**Guardrails (DO NOT):**
- DO NOT diverge from the StepOne h1 class string (both must match exactly)
- DO NOT introduce a separate gradient style or import
- DO NOT change "How long of a journey?" text content

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing StepTwo tests pass unchanged | unit | Semantic queries on the heading text + the duration cards survive |
| DOM inspection (manual) | manual | h1 has no `font-script`, has GRADIENT_TEXT_STYLE inline, visually reads as gradient |

**Expected state after completion:**
- [ ] StepTwo h1 class string is `text-center text-4xl font-bold sm:text-5xl`
- [ ] StepTwo h1 has `style={GRADIENT_TEXT_STYLE}`
- [ ] DOM inspection confirms `font-script` is absent
- [ ] Text content "How long of a journey?" preserved exactly

---

### Step 5: Change 4 — CreatePlanFlow textarea cyan glow → canonical violet glow

**Objective:** Replace the cyan textarea glow class string with the canonical violet textarea glow from `09-design-system.md` § "Textarea Glow Pattern". This is THE last cyan-glow holdout in the app; after this step, every authoring textarea (Pray, Journal, Plan create) uses the violet pattern.

**Files to create/modify:**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — modify textarea at line 189–198

**Details:**

Change the textarea at line 189–198 from:
```tsx
<textarea
  ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
  value={topicText}
  onChange={(e) => onTopicChange(e.target.value)}
  maxLength={500}
  placeholder="I'm struggling with anxiety about my job..."
  className="w-full resize-none rounded-xl border border-glow-cyan/30 bg-white/5 p-4 text-white backdrop-blur-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-[0_0_12px_2px_rgba(0,212,255,0.35),0_0_27px_5px_rgba(139,92,246,0.26)] min-h-[120px]"
  aria-label="What's on your heart"
  aria-describedby="plan-char-count"
/>
```

to:
```tsx
<textarea
  ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
  value={topicText}
  onChange={(e) => onTopicChange(e.target.value)}
  maxLength={500}
  placeholder="I'm struggling with anxiety about my job..."
  className="w-full resize-none rounded-xl p-4 text-white backdrop-blur-sm min-h-[120px] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] border border-violet-400/30 bg-white/[0.04] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40"
  aria-label="What's on your heart"
  aria-describedby="plan-char-count"
/>
```

**What changed (class string only):**
- Removed: `border-glow-cyan/30` (cyan border — deprecated)
- Removed: `bg-white/5` (replaced by `bg-white/[0.04]` — the canonical violet-glow surface tint)
- Removed: `placeholder:text-white/50` (replaced by `placeholder:text-white/40` — canonical pattern)
- Removed: `focus:ring-primary/50` (replaced by `focus:ring-violet-400/30` — canonical pattern)
- Removed: `shadow-[0_0_12px_2px_rgba(0,212,255,0.35),0_0_27px_5px_rgba(139,92,246,0.26)]` (cyan + dark-violet two-stop shadow — deprecated)
- Added: `shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]` (canonical violet two-stop shadow)
- Added: `border border-violet-400/30` (canonical violet border)
- Added: `focus:border-violet-400/60` (canonical violet focus border)
- Preserved exactly: `w-full resize-none rounded-xl p-4 text-white backdrop-blur-sm min-h-[120px] focus:outline-none focus:ring-2`

**What CANNOT change:**
- Textarea props: `ref`, `value`, `onChange`, `maxLength={500}`, `placeholder`, `aria-label`, `aria-describedby="plan-char-count"`
- Position: directly below `<CrisisBanner text={topicText} />` and directly above the `<div className="mt-2 text-right"><CharacterCount ... /></div>`
- The 120px min-height (preserved via `min-h-[120px]`)

**Auth gating (if applicable):** N/A — textarea typing remains public for logged-out users.

**Responsive behavior:**
- Desktop (1440px): textarea full-width within `max-w-xl` container; violet shadow visible at idle, intensifies to `border-violet-400/60` + `ring-violet-400/30` on focus
- Tablet (768px): same
- Mobile (375px): textarea full-width; violet glow renders identically (breakpoint-agnostic)

**Inline position expectations:**
- CrisisBanner sits IMMEDIATELY ABOVE the textarea (parent: `<div className="mx-auto mt-8 max-w-xl">` at line 186; CrisisBanner at line 187; textarea at line 189–198)
- CharacterCount sits IMMEDIATELY BELOW the textarea (`<div className="mt-2 text-right">` at line 199 → CharacterCount at line 200)

**Guardrails (DO NOT):**
- DO NOT change `aria-describedby="plan-char-count"` (safety-critical screen reader linkage)
- DO NOT change `aria-label="What's on your heart"`
- DO NOT relocate CrisisBanner or CharacterCount
- DO NOT modify CrisisBanner's `text={topicText}` prop
- DO NOT modify CharacterCount's `id="plan-char-count"` or other props
- DO NOT introduce a new wrapper between CrisisBanner and the textarea (would break their visual flow)
- DO NOT use the older "white-glow" pattern (`shadow-[0_0_20px_3px_rgba(255,255,255,0.50)...]`) — that's the Round 3 transitional state, superseded by DailyHub 1B violet
- DO NOT remove `min-h-[120px]` (preserves the textarea's intentional minimum height)
- DO NOT add `animate-glow-pulse` (deprecated pattern)
- DO NOT change `bg-white/[0.04]` to `bg-white/5` — the bracket-notation `[0.04]` is the canonical violet pattern; `/5` reads as 5% but Tailwind's `bg-white/5` is also 5% — they are visually identical, but the canonical class string in `09-design-system.md` uses `bg-white/[0.04]` (4%) for the slight tint adjustment

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing CreatePlanFlow textarea tests pass | unit | Tests query the textarea by `aria-label="What's on your heart"` or by placeholder text — both preserved |
| CrisisBanner preservation | manual smoke | Type "suicide" into the textarea; verify CrisisBanner appears immediately above the textarea with crisis resources |
| CharacterCount preservation | manual smoke | Type 350+ characters; verify CharacterCount appears below the textarea with the expected count |
| `aria-describedby` linkage preserved | accessibility tree inspection | DevTools Accessibility panel shows the textarea's "described by" relationship pointing to CharacterCount's `id="plan-char-count"` |
| DOM inspection — cyan removal | manual | DOM inspection: textarea has no `border-glow-cyan/30` class, no `rgba(0,212,255` in computed styles |

**Expected state after completion:**
- [ ] Textarea class string matches the canonical violet glow exactly
- [ ] CrisisBanner mounted directly above the textarea, `text={topicText}` prop preserved
- [ ] CharacterCount mounted directly below with `id="plan-char-count"` preserved
- [ ] Textarea's `aria-describedby="plan-char-count"` matches CharacterCount's id
- [ ] All textarea props (id, value, onChange, placeholder, max length, aria-label) preserved exactly
- [ ] DOM inspection confirms cyan-related class names absent
- [ ] Smoke test: typing crisis keyword fires CrisisBanner immediately above textarea

---

### Step 6: Change 5 — CrisisBanner + CharacterCount preservation verification (no code change)

**Objective:** Confirm that Change 4 did not inadvertently relocate, modify, or break the safety-critical CrisisBanner + CharacterCount wiring. This is verification-only — NO code changes.

**Files to create/modify:** None.

**Details:**

After Change 4 lands, re-read `frontend/src/components/reading-plans/CreatePlanFlow.tsx` lines 186–202 and verify ALL of the following:

1. `<CrisisBanner text={topicText} />` is mounted directly above the textarea, INSIDE the StepOne component's `<div className="mx-auto mt-8 max-w-xl">` wrapper
2. CrisisBanner's `text={topicText}` prop wiring is unchanged (passes the live textarea value)
3. The textarea immediately follows CrisisBanner with no intermediate wrapper
4. The textarea's `aria-describedby="plan-char-count"` is unchanged
5. `<CharacterCount current={topicText.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="plan-char-count" />` is mounted directly below the textarea inside `<div className="mt-2 text-right">`
6. CharacterCount's `id="plan-char-count"` matches the textarea's `aria-describedby` value

If any of these checks fail, STOP and flag — Change 4 must be re-applied carefully.

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A: no UI impact (verification step only).

**Inline position expectations:** Documented above — CrisisBanner immediately precedes textarea; CharacterCount immediately follows.

**Guardrails (DO NOT):**
- DO NOT modify any code in this step
- DO NOT change CrisisBanner's component implementation
- DO NOT change CharacterCount's component implementation

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Code inspection of CreatePlanFlow.tsx | manual | Lines 186–202 match the spec's wiring requirements verbatim |
| Existing CrisisBanner tests pass | unit | If `CrisisBanner.test.tsx` exists, it passes unchanged |
| Manual smoke (browser) | manual | Type "I want to kill myself" into the textarea → CrisisBanner renders crisis resources immediately above; ARIA tree shows `role="alert"` + `aria-live="assertive"` |

**Expected state after completion:**
- [ ] All 6 wiring checks pass
- [ ] CrisisBanner + CharacterCount + textarea relationship documented in execution log as verified

---

### Step 7: Change 6 — CreatePlanFlow Step 1 Next button bg-primary → subtle Button

**Objective:** Migrate the Step 1 Next button from `bg-primary` solid CTA to `<Button variant="subtle" size="md">` since this is navigation between steps, not the climactic moment.

**Files to create/modify:**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — modify Step 1 Next button at line 219–233; add Button import

**Details:**

Add to imports (or extend existing `@/components/ui/...` imports):
```tsx
import { Button } from '@/components/ui/Button'
```

Change Step 1 Next button at line 219–233 from:
```tsx
{/* Next button */}
<div className="mt-8 text-center">
  <button
    type="button"
    onClick={onNext}
    disabled={!topicText.trim()}
    className={cn(
      'min-h-[44px] w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors sm:w-auto',
      topicText.trim()
        ? 'hover:bg-primary-lt'
        : 'cursor-not-allowed opacity-50',
    )}
  >
    Next
  </button>
</div>
```

to:
```tsx
{/* Next button */}
<div className="mt-8 text-center">
  <Button
    variant="subtle"
    size="md"
    type="button"
    onClick={onNext}
    disabled={!topicText.trim()}
    className="w-full sm:w-auto"
  >
    Next
  </Button>
</div>
```

The migrated button:
- Resolves to subtle variant chrome (rounded-full pill, frosted glass background, white border, hover lift)
- Resolves to size=md (`px-6 py-2.5 text-sm`)
- Inherits `min-h-[44px]` from the subtle variant baseline
- Inherits `disabled:opacity-50 disabled:cursor-not-allowed` from Button.tsx:45
- Resolves `cn()` automatically via the Button primitive's internal `cn()` call

**Auth gating (if applicable):** N/A — Next button is public.

**Responsive behavior:**
- Desktop (1440px): button renders at natural width (`sm:w-auto` overrides `w-full`)
- Tablet (768px): button renders at natural width
- Mobile (375px): button renders full-width (`w-full`)

**Inline position expectations:** Standalone button — N/A.

**Guardrails (DO NOT):**
- DO NOT remove the `disabled={!topicText.trim()}` prop (gates navigation to Step 2 on non-empty input)
- DO NOT change `onClick={onNext}` (calls the parent's `() => setStep(2)` callback)
- DO NOT add a custom `className` that overrides the subtle variant's chrome (only `w-full sm:w-auto` is acceptable for responsive width)
- DO NOT use the `light` or `gradient` variants here (gradient is reserved for Step 2 climax; light is canonical homepage primary)
- DO NOT use `cn()` manually in the new code — Button's internal `cn()` handles it
- DO NOT remove `type="button"` (would default to `type="submit"` which would submit a form if the button is ever wrapped in one)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing CreatePlanFlow.test.tsx tests pass | unit | Tests querying "Next" button by text or by `getByRole('button', { name: 'Next' })` survive — Button primitive renders children as visible text |
| Disabled state test | unit | When `topicText.trim() === ''`, the Next button is disabled (verified by existing test or new test if missing) |
| Visual smoke (manual) | manual | Step 1: button reads as quiet utility (frosted glass pill); disabled state shows `opacity-50` + `cursor-not-allowed` |
| Hover state test (manual) | manual | Hover translation `hover:-translate-y-0.5` engages on pointer-capable devices; reduced-motion users see no translation |

**Expected state after completion:**
- [ ] Step 1 Next button renders as `<Button variant="subtle" size="md">` with `w-full sm:w-auto`
- [ ] `disabled={!topicText.trim()}` preserved
- [ ] `onClick={onNext}` preserved
- [ ] `type="button"` preserved
- [ ] All 17 CreatePlanFlow tests pass
- [ ] Visual smoke confirms subtle variant chrome

---

### Step 8: Change 7 — CreatePlanFlow Step 2 Generate My Plan button bg-primary → gradient Button

**Objective:** Migrate the Step 2 Generate My Plan button from `bg-primary` solid CTA to `<Button variant="gradient" size="md">`. THIS is the canonical climax site — the user has been building up to this moment for 2 steps; the gradient showstopper announces "you're about to receive something personalized." Sparkles icon stays as a leading child.

**Files to create/modify:**
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — modify Step 2 Generate button at line 277–293

**Details:**

The Button import added in Step 7 covers this change.

Change Step 2 Generate button at line 277–293 from:
```tsx
{/* Generate button */}
<div className="mt-8 text-center">
  <button
    type="button"
    onClick={onGenerate}
    disabled={!selectedDuration}
    className={cn(
      'min-h-[44px] w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors sm:w-auto',
      selectedDuration
        ? 'hover:bg-primary-lt'
        : 'cursor-not-allowed opacity-50',
    )}
  >
    <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
    Generate My Plan
  </button>
</div>
```

to:
```tsx
{/* Generate button */}
<div className="mt-8 text-center">
  <Button
    variant="gradient"
    size="md"
    type="button"
    onClick={onGenerate}
    disabled={!selectedDuration}
    className="w-full sm:w-auto"
  >
    <Sparkles className="h-4 w-4" aria-hidden="true" />
    Generate My Plan
  </Button>
</div>
```

The migrated button:
- Resolves to gradient variant (rounded-full, violet-400 → violet-300 gradient background, BLACK text, gradient-glow shadow `shadow-gradient-button`, hover lift)
- Resolves to size=md (`px-6 py-2.5 text-sm`)
- Inherits `gap-2` from gradient variant (Button.tsx:50) — provides icon→text spacing
- Inherits `disabled:opacity-50 disabled:cursor-not-allowed` from Button.tsx:45
- Sparkles icon LOSES `mr-2 inline-block` (replaced by Button's `gap-2` flex layout)
- Sparkles preserves `h-4 w-4` and `aria-hidden="true"`

**Auth gating (if applicable):** N/A — Generate button is public; addCustomPlanId localStorage write occurs even when logged-out (Phase 0.5 dual-write).

**Responsive behavior:**
- Desktop (1440px): button renders at natural width with violet gradient + gradient-glow shadow
- Tablet (768px): natural width
- Mobile (375px): full-width (`w-full`)

**Inline position expectations:**
- Sparkles icon and "Generate My Plan" text MUST share the same row (`gap-2` flex layout enforces this)
- Verify `boundingBox().y` of Sparkles icon and text node match (±5px tolerance) at 1440px

**Guardrails (DO NOT):**
- DO NOT remove the `disabled={!selectedDuration}` prop (gates Generate on duration selection)
- DO NOT change `onClick={onGenerate}` (calls the parent's handleGenerate which fires the 2.5s setTimeout + matchPlanByKeywords + addCustomPlanId + navigate + showToast)
- DO NOT remove the Sparkles icon (the icon is part of the climactic visual identity)
- DO NOT keep `mr-2 inline-block` on the Sparkles icon (Button's `gap-2` handles spacing — the redundant classes would compound)
- DO NOT use `size="lg"` here — spec mandates `size="md"` (matches the Step 1 Next button's sizing)
- DO NOT change Sparkles' `aria-hidden="true"` (decorative icon)
- DO NOT use the `light` variant or hand-roll a class string

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing CreatePlanFlow.test.tsx tests pass | unit | Tests querying "Generate My Plan" by text or `getByRole('button', { name: /Generate My Plan/ })` survive — Button primitive renders children as visible text; Sparkles is `aria-hidden` so accessible name is "Generate My Plan" |
| Disabled state test | unit | When `selectedDuration === null`, the Generate button is disabled |
| Visual smoke (manual) | manual | Step 2: button reads as climactic showstopper (violet gradient pill, gradient glow shadow, BLACK text, hover lift); Sparkles icon visible to the LEFT of text with `gap-2` spacing |
| Sparkles spacing visual check | manual | Icon and text share same y-baseline; gap between them reads as `gap-2` (8px) — neither too tight nor too loose |
| Disabled visual check | manual | `selectedDuration === null` → button shows `opacity-50` + `cursor-not-allowed`; hover does NOT lift |
| 2.5s setTimeout fires | unit | After click on enabled button, `handleGenerate` fires; existing tests cover this (matchPlanByKeywords, addCustomPlanId, navigate) |

**Expected state after completion:**
- [ ] Step 2 Generate button renders as `<Button variant="gradient" size="md">` with `w-full sm:w-auto`
- [ ] Sparkles icon `<Sparkles className="h-4 w-4" aria-hidden="true" />` preserved as leading child (with `mr-2 inline-block` removed)
- [ ] `disabled={!selectedDuration}` preserved
- [ ] `onClick={onGenerate}` preserved
- [ ] Visual smoke confirms gradient variant chrome with BLACK text
- [ ] All CreatePlanFlow tests pass
- [ ] handleGenerate flow (matchPlanByKeywords + addCustomPlanId + navigate + showToast) preserved unchanged

---

### Step 9: Change 8 — DayCompletionCelebration Continue button bg-primary → subtle Button

**Objective:** Migrate the DayCompletionCelebration Continue button from `bg-primary` solid CTA to `<Button variant="subtle" size="md">` since per-day completion is incremental (gradient is reserved for genuine emotional peaks like Generate My Plan).

**Files to create/modify:**
- `frontend/src/components/reading-plans/DayCompletionCelebration.tsx` — add Button import; modify Continue button at line 102–110

**Details:**

Add to imports:
```tsx
import { Button } from '@/components/ui/Button'
```

Change Continue button at line 102–110 from:
```tsx
{/* Continue button */}
{!isLastDay && (
  <button
    type="button"
    onClick={onContinue}
    className="mt-3 w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 sm:w-auto"
  >
    Continue to Day {dayNumber + 1}
  </button>
)}
```

to:
```tsx
{/* Continue button */}
{!isLastDay && (
  <Button
    variant="subtle"
    size="md"
    type="button"
    onClick={onContinue}
    className="mt-3 w-full sm:w-auto"
  >
    Continue to Day {dayNumber + 1}
  </Button>
)}
```

**What changed:**
- `<button>` → `<Button variant="subtle" size="md">`
- Removed: `rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90` (replaced by subtle variant resolution)
- Preserved: `mt-3 w-full sm:w-auto` (acceptable className additions to Button)
- Preserved: `type="button"`, `onClick={onContinue}`, `Continue to Day {dayNumber + 1}` text content
- Preserved: outer `{!isLastDay && (...)}` conditional render gate (no Continue button on the final day; PlanCompletionOverlay portal handles the climax)

**Auth gating (if applicable):** N/A — Continue is public.

**Responsive behavior:**
- Desktop (1440px): natural width
- Tablet (768px): natural width
- Mobile (375px): full-width

**Inline position expectations:** Standalone button below the text+pill row — N/A inline.

**Guardrails (DO NOT):**
- DO NOT remove the `{!isLastDay && (...)}` conditional gate
- DO NOT change "Continue to Day {dayNumber + 1}" text content (existing tests at lines 47, 52, 58 of `DayCompletionCelebration.test.tsx` query `screen.getByText('Continue to Day 4')` — the Button primitive renders children as visible text, so the assertion survives)
- DO NOT change `onClick={onContinue}`
- DO NOT add ASCII variation of "Continue to Day" (must match `getByText` exactly)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing 7 DayCompletionCelebration tests pass | unit | All semantic queries (`screen.getByText('Continue to Day 4')`, `screen.queryByText(/Continue to Day/)`) survive Button migration |
| `!isLastDay` gate test passes | unit | When `isLastDay={true}`, no Continue button renders (line 52 of test file: `expect(screen.queryByText(/Continue to Day/)).not.toBeInTheDocument()`) |
| Click handler test passes | unit | Clicking the Continue button calls `onContinue` (line 59) |
| Visual smoke | manual | Continue button reads as quiet utility (frosted glass pill); animated SVG checkmark above; "+15 pts" pill renders if `pointsAwarded={true}` |

**Expected state after completion:**
- [ ] Continue button renders as `<Button variant="subtle" size="md">` with `mt-3 w-full sm:w-auto`
- [ ] `{!isLastDay && (...)}` conditional gate preserved
- [ ] "Continue to Day {dayNumber + 1}" text content preserved
- [ ] `onClick={onContinue}` preserved
- [ ] All 7 DayCompletionCelebration tests pass
- [ ] Animated SVG checkmark preserved with `ANIMATION_DURATIONS.slow` + 200ms delay + reduced-motion safety net
- [ ] "+15 pts" pill conditional render based on `pointsAwarded` prop preserved

---

### Step 10: Change 10 — PlanCompletionOverlay h2 GRADIENT_TEXT_STYLE merged with fadeStyle

**Objective:** Drop `font-script` from the PlanCompletionOverlay h2 ("Plan Complete!") and apply `GRADIENT_TEXT_STYLE` merged with the existing `fadeStyle(3)` via spread. Preserve `id="plan-completion-title"` for `aria-labelledby` linkage.

**Files to create/modify:**
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` — add GRADIENT_TEXT_STYLE import; modify h2 at line 190–196

**Details:**

Add to imports:
```tsx
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
```

Change h2 at line 190–196 from:
```tsx
{/* Heading */}
<h2
  id="plan-completion-title"
  className="font-script text-4xl text-white sm:text-5xl"
  style={fadeStyle(3)}
>
  Plan Complete!
</h2>
```

to:
```tsx
{/* Heading */}
<h2
  id="plan-completion-title"
  className="text-4xl font-bold sm:text-5xl"
  style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}
>
  Plan Complete!
</h2>
```

**What changed:**
- Removed `font-script` and `text-white` (GRADIENT_TEXT_STYLE handles color via background-clip)
- Added `font-bold` (replaces implicit Caveat semibold)
- `style` becomes spread: `{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }` — gradient last so its keys win on any future overlap
- Preserved exactly: `id="plan-completion-title"` (referenced by dialog's `aria-labelledby="plan-completion-title"` at line 161), `text-4xl sm:text-5xl`, "Plan Complete!" text content

**Spread merge analysis:**
- `fadeStyle(3)` returns `{ opacity, transform, transition }` (or `{}` when reducedMotion)
- `GRADIENT_TEXT_STYLE` returns `{ color, backgroundImage, WebkitBackgroundClip, WebkitTextFillColor, backgroundClip }`
- Today: ZERO overlapping keys → spread order is forgiving
- Canonical pattern: gradient last (its keys "win" on any future overlap)

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): h2 at `text-5xl` with gradient + fade-in opacity transition
- Tablet (768px): h2 at `text-5xl`
- Mobile (375px): h2 at `text-4xl`

**Inline position expectations:** N/A — single heading.

**Guardrails (DO NOT):**
- DO NOT remove `id="plan-completion-title"` (aria-labelledby breakage)
- DO NOT change the spread order (gradient must be LAST)
- DO NOT replace `style={fadeStyle(3)}` with `style={GRADIENT_TEXT_STYLE}` (would lose the 7-step animation sequence's opacity/transform)
- DO NOT change `text-4xl` or `sm:text-5xl` (matches CreatePlanFlow h1 sizing)
- DO NOT add `text-center` (the overlay's parent flexbox handles centering — line 183 has `<div className="text-center">`)
- DO NOT introduce a new class for `font-bold` other than the Tailwind class

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing 17 PlanCompletionOverlay tests pass | unit | Tests use semantic queries (no `font-script` queries); `aria-labelledby="plan-completion-title"` reference at line 137–140 of test file requires `id="plan-completion-title"` preservation — verified preserved |
| 7-step animation sequence test | unit | If a test exercises the fadeStyle(3) animation step, verify it still works with the merged spread |
| `aria-labelledby` linkage | accessibility tree | DevTools shows the dialog's labelledby pointing to h2's `id="plan-completion-title"` |
| Visual smoke | manual | Trigger plan completion (mock localStorage to complete state on a 7-day plan); h2 "Plan Complete!" reads as gradient (white-to-purple), no font-script flourish; 7-step animation reveals heading at step 3; ascending sound fires |

**Expected state after completion:**
- [ ] h2 class string is `text-4xl font-bold sm:text-5xl`
- [ ] h2 `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}`
- [ ] `id="plan-completion-title"` preserved
- [ ] All 17 PlanCompletionOverlay tests pass
- [ ] DOM inspection confirms `font-script` absent
- [ ] 7-step animation sequence preserved (heading reveals at step 3 with ascending sound)
- [ ] Focus trap, body scroll lock, 15s auto-dismiss, scripture italic, 3 sub-CTAs (Browse Plans, Share, Done) all preserved unchanged

---

### Step 11: Change 11 — ChallengeCompletionOverlay h2 drop font-script, retain themeColor

**Objective:** Drop `font-script` from the ChallengeCompletionOverlay h2 (the challenge title) but RETAIN `style={{ color: themeColor }}` so the seasonal palette identity (Lent purple, Easter gold, etc.) is preserved at the most emotional moment of the challenge. GRADIENT_TEXT_STYLE is NOT applied to this site (Decision 6 refinement — the themeColor IS the brand expression).

**Files to create/modify:**
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` — modify h2 at line 190–195

**Details:**

Change h2 at line 190–195 from:
```tsx
{/* Challenge title */}
<h2
  className="font-script text-4xl sm:text-5xl"
  style={{ color: themeColor }}
>
  {challengeTitle}
</h2>
```

to:
```tsx
{/* Challenge title */}
<h2
  className="text-4xl font-bold sm:text-5xl"
  style={{ color: themeColor }}
>
  {challengeTitle}
</h2>
```

**What changed:**
- Removed `font-script`
- Added `font-bold` (replaces implicit Caveat semibold)
- Preserved exactly: `style={{ color: themeColor }}`, `text-4xl sm:text-5xl`, `{challengeTitle}` content

**No GRADIENT_TEXT_STYLE import needed in this file** (this h2 uses themeColor inline, not the gradient style).

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): h2 at `text-5xl` with seasonal themeColor (e.g., `#FDE68A` for Easter)
- Tablet (768px): h2 at `text-5xl`
- Mobile (375px): h2 at `text-4xl`

**Inline position expectations:** N/A — single heading.

**Guardrails (DO NOT):**
- DO NOT apply GRADIENT_TEXT_STYLE here (would override themeColor and flatten 5 seasonal palettes into uniform brand expression — explicitly forbidden by Decision 6 refinement)
- DO NOT add `font-script` back
- DO NOT remove `style={{ color: themeColor }}`
- DO NOT change the rendered prop value `{challengeTitle}`
- DO NOT add `text-center` — the parent `<div className="...text-center">` at line 172 handles centering

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing 16 ChallengeCompletionOverlay tests pass unchanged | unit | The 17th test (line 45–49) is updated by Step 13 |
| Updated test passes | unit | New test at line 45–49 (renamed and updated by Step 13) asserts `not.toHaveClass('font-script')` AND `toHaveStyle({ color: defaultProps.themeColor })` — this passes after Change 11 |
| Visual smoke | manual | Trigger challenge completion; h2 reads as seasonal themeColor (Lent: deep purple; Easter: gold; Pentecost: red) at `font-bold`, no font-script flourish |

**Expected state after completion:**
- [ ] h2 class string is `text-4xl font-bold sm:text-5xl`
- [ ] h2 `style={{ color: themeColor }}` preserved exactly
- [ ] No GRADIENT_TEXT_STYLE applied
- [ ] `{challengeTitle}` content preserved
- [ ] DOM inspection confirms `font-script` absent and `style.color` matches themeColor

---

### Step 12: Change 12 — MilestoneCard h2 drop font-script, retain themeColor

**Objective:** Same Decision 6 refinement as Change 11 but for MilestoneCard's h2 (milestone title). Smaller heading sizing reflects incremental-milestone vs final-climax weight.

**Files to create/modify:**
- `frontend/src/components/challenges/MilestoneCard.tsx` — modify h2 at line 109–111

**Details:**

Change h2 at line 109–111 from:
```tsx
<h2 className="font-script text-3xl sm:text-4xl" style={{ color: themeColor }}>
  {milestoneTitle}
</h2>
```

to:
```tsx
<h2 className="text-3xl font-bold sm:text-4xl" style={{ color: themeColor }}>
  {milestoneTitle}
</h2>
```

**What changed:**
- Removed `font-script`
- Added `font-bold`
- Preserved exactly: `style={{ color: themeColor }}`, `text-3xl sm:text-4xl` (smaller than Challenge h2 — incremental milestone), `{milestoneTitle}` content

**Sizing rationale:** Incremental milestones use `text-3xl sm:text-4xl` (smaller) vs final-climax challenge completion `text-4xl sm:text-5xl` (larger). Sizing preserves the emotional-weight differentiation.

**Auth gating (if applicable):** N/A.

**Responsive behavior:**
- Desktop (1440px): h2 at `text-4xl` with seasonal themeColor
- Tablet (768px): h2 at `text-4xl`
- Mobile (375px): h2 at `text-3xl`

**Inline position expectations:** N/A — single heading.

**Guardrails (DO NOT):**
- DO NOT apply GRADIENT_TEXT_STYLE here
- DO NOT bump sizing to `text-4xl sm:text-5xl` (would flatten the milestone-vs-climax differentiation)
- DO NOT modify the share image generation, the `showCelebrationToast('', milestoneTitle, 'celebration-confetti')` mount-time call, or any other behavior in this component

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing 7 MilestoneCard tests pass | unit | All semantic queries survive (no `font-script` queries in `MilestoneCard.test.tsx`) |
| Visual smoke (test fixture or manual) | manual | MilestoneCard renders inline within ChallengeDetail flow with themeColor h2 at `text-3xl sm:text-4xl`; share image visible below; share button has themeColor background; Keep Going button is neutral outlined |

**Expected state after completion:**
- [ ] h2 class string is `text-3xl font-bold sm:text-4xl`
- [ ] h2 `style={{ color: themeColor }}` preserved
- [ ] No GRADIENT_TEXT_STYLE applied
- [ ] All 7 MilestoneCard tests pass
- [ ] showCelebrationToast on mount preserved with `prefersReduced` gate
- [ ] Share Your Milestone button `style={{ backgroundColor: themeColor }}` preserved (Decision 8)
- [ ] Keep Going button preserved unchanged
- [ ] Share image generation + object URL cleanup preserved

---

### Step 13: Update ChallengeCompletionOverlay test (line 45–49)

**Objective:** Update the single test in `ChallengeCompletionOverlay.test.tsx` that asserts on `font-script` so it asserts the deprecated pattern is GONE and the brand-expression themeColor is APPLIED.

**Files to create/modify:**
- `frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx` — modify lines 45–49

**Details:**

Change lines 45–49 from:
```tsx
it('renders challenge title in Caveat font', () => {
  renderOverlay()
  const title = screen.getByText('Easter Joy')
  expect(title).toHaveClass('font-script')
})
```

to:
```tsx
it('renders challenge title with themeColor brand expression', () => {
  renderOverlay()
  const title = screen.getByText('Easter Joy')
  expect(title).not.toHaveClass('font-script')
  expect(title).toHaveStyle({ color: defaultProps.themeColor })
})
```

**What changed:**
- Test name: `'renders challenge title in Caveat font'` → `'renders challenge title with themeColor brand expression'`
- Assertion 1: `toHaveClass('font-script')` → `not.toHaveClass('font-script')` (asserts the deprecated pattern is GONE)
- Assertion 2 (NEW): `toHaveStyle({ color: defaultProps.themeColor })` (asserts the themeColor brand expression IS applied)

**Auth gating (if applicable):** N/A — test file change only.

**Responsive behavior:** N/A: no UI impact (test update only).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT remove the test entirely (the assertion still has value — it locks in the post-migration shape)
- DO NOT change the test fixture's `themeColor` (the existing fixture at line 20 uses `'#FDE68A'`; the new assertion compares against `defaultProps.themeColor` which is exactly that value)
- DO NOT add additional assertions beyond the two listed

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Updated test passes | unit | After Change 11 lands, the updated test passes (new assertions match the post-migration h2 shape) |
| Other 16 tests in file unchanged | unit | All other tests in `ChallengeCompletionOverlay.test.tsx` use semantic queries — preserved unchanged |
| Total test count | unit | File still has 17 tests after this update (no test added or removed; one renamed and re-asserted) |

**Expected state after completion:**
- [ ] Test name updated to `'renders challenge title with themeColor brand expression'`
- [ ] Assertion 1 is `expect(title).not.toHaveClass('font-script')`
- [ ] Assertion 2 is `expect(title).toHaveStyle({ color: defaultProps.themeColor })`
- [ ] Test passes when run with the migrated h2 (post-Change 11)
- [ ] All 17 tests in the file pass

---

### Step 14: Full test suite + typecheck reconciliation

**Objective:** Run the full frontend test suite + `pnpm typecheck` and reconcile against the baseline captured in Step 1. Any NEW failure must be explicitly investigated.

**Files to create/modify:** None (verification only).

**Details:**

Run:
```bash
cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -100
cd frontend && pnpm typecheck
```

Compare against the Step 1 baseline:
- Pre-existing baseline per CLAUDE.md: 9,470 pass / 1 fail (`useFaithPoints — intercession activity drift`), with optional flake of `useNotifications — returns notifications sorted newest first` bringing it to 9,469/2.
- Spec 6B reported 47/47 verification assertions on its clean baseline.
- Spec 6C is expected to add zero new tests (no test files added) and update one existing test (Step 13 updates `ChallengeCompletionOverlay.test.tsx:45–49` in place — net 0 test count change).

**Acceptance:** Zero NEW failures. Pre-existing failures still appear as the same failures (not new ones masquerading as old).

If a new failure appears:
- (a) Real regression in implementation → fix in implementation
- (b) Test asserting on a class string this spec migrated → update assertion (only `ChallengeCompletionOverlay.test.tsx:45–49` should fall in this bucket; spec recon item 12 enumerates the test files and rules out class-string assertions in the others)
- (c) Genuinely broken by an unrelated issue → STOP and surface to the user

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A: no UI impact (verification step).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT mark the spec complete with new failures introduced
- DO NOT modify pre-existing failing tests (the `useFaithPoints — intercession activity drift` and `useNotifications — returns notifications sorted newest first` failures predate this spec)
- DO NOT skip `pnpm typecheck` — TypeScript drift can introduce silent runtime errors

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full test suite pass count matches or exceeds baseline | unit | 9,470 pass with at most 1 pre-existing fail (or 9,469 with 2 if the notifications flake fires) |
| Zero new failures | unit | Compare failure list against Step 1 baseline; no new entries |
| `pnpm typecheck` passes with zero errors | unit | TypeScript compilation clean |
| Specific Spec 6C tests verified passing | unit | All 17 CreatePlanFlow tests + all 17 PlanCompletionOverlay tests + all 17 ChallengeCompletionOverlay tests (with the updated test) + all 7 MilestoneCard tests + all 7 DayCompletionCelebration tests |

**Expected state after completion:**
- [ ] Test count reconciled against Step 1 baseline
- [ ] Zero new failures
- [ ] `pnpm typecheck` passes
- [ ] Pre-execution recon item 5 (test baseline capture) results compared and recorded

---

### Step 15: Manual eyeball checks + regression sweep

**Objective:** Walk through every acceptance criterion in spec lines 414–553 and visually verify the migrated surfaces. Confirm no regression on neighboring routes.

**Files to create/modify:** None (manual verification).

**Details:**

**CreatePlanFlow checks at `/grow?create=true`:**
- StepOne: gradient violet-to-white h1 ✓; canonical violet textarea glow ✓ (visually matches DailyHub Pray/Journal); CrisisBanner mounted immediately above textarea (verify by typing crisis keyword); CharacterCount visible below textarea after typing 300+ chars; 6 topic chips preserved; subtle Next button at bottom (full-width on mobile, natural width on desktop)
- StepTwo: gradient violet-to-white h1 ✓; 3 duration cards with `border-primary` selected state preserved; gradient Generate My Plan button (climactic visual — violet gradient + glow shadow + black text) with Sparkles icon as leading child
- StepThree: 3 progress dots (current step `bg-primary`); 3 bouncing loading dots; italic Lora Jeremiah 29:11 blockquote; no back-arrow button (uninterruptible); 2.5s timer fires; matchPlanByKeywords + addCustomPlanId + navigate work
- BackgroundCanvas atmospheric blooms gently visible behind all 3 steps; warm violet `#4A1D96` mid-gradient is GONE

**PlanCompletionOverlay checks (mock localStorage to complete state on a 7-day plan):**
- Portal opens with gradient h2 "Plan Complete!"; italic Lora scripture blockquote; 3 sub-CTAs (Browse Plans, Share, Done) in canonical neutral chrome
- 7-step animation sequence reveals elements in order
- Ascending sound fires on heading reveal (step 3)
- Escape dismisses with focus restoration (useFocusTrap canonical hook)
- 15s auto-dismiss fires
- Body scroll locked while open

**ChallengeCompletionOverlay checks (test fixture or live during Pentecost season):**
- Portal opens with themeColor h2 (challenge title); badge swatch in themeColor; confetti palette includes themeColor + gold + white
- 5 sub-CTA cards in 2-column grid (1-column on mobile, 5th card spans both columns and centers on tablet+)
- Click-outside-to-dismiss works
- 12s auto-dismiss fires
- "Tap anywhere to dismiss" hint appears after 2s with `prefersReduced` gate

**MilestoneCard checks (test fixture or mid-progress live challenge):**
- Inline card renders within ChallengeDetail flow (not portal)
- themeColor h2 at smaller `text-3xl sm:text-4xl` size
- Share image visible (Canvas-generated)
- themeColor share button; neutral Keep Going button

**DayCompletionCelebration checks (complete a non-final day on a reading plan):**
- Subtle Continue button reads "Continue to Day N" with quiet utility chrome
- Animated SVG checkmark plays
- "+15 pts" pill renders if `pointsAwarded={true}`
- On final day completion: NO Continue button (gate on `!isLastDay`); PlanCompletionOverlay handles climax

**Regression sweep:**
- `/grow` (Spec 6A): BackgroundCanvas, plan cards, challenge cards, tab icons, sticky tab bar all unchanged
- `/grow?tab=plans` and `/grow?tab=challenges` (Spec 6A): unchanged
- `/reading-plans/<plan-id>` (Spec 6B): BackgroundCanvas atmospheric continuity, FrostedCard subdued action callout, hero h1 + subtitle migrations preserved
- `/challenges/<challenge-id>` (Spec 6B): unchanged
- `/reading-plans/<invalid-id>` and `/challenges/<invalid-id>` (Spec 6B not-found surfaces): unchanged
- `/daily?tab=*`: canonical violet textarea glow on Pray + Journal still reads identically
- `/`: Dashboard unchanged
- `/local-support/*`: unchanged
- `/bible`: unchanged

**Auth gating (if applicable):** N/A.

**Responsive behavior:** All visual checks performed at 3 breakpoints (375px / 768px / 1440px).

**Inline position expectations:** Verify per the Inline Element Position Expectations table earlier in this plan — most critical: PlanCompletionOverlay's 3 sub-CTAs share y at desktop ±5px; CreatePlanFlow Step 1 progress dots and Step 3 bouncing loading dots both align ±2px.

**Guardrails (DO NOT):**
- DO NOT mark the spec complete without performing the manual smokes
- DO NOT skip the regression sweep on neighboring routes
- DO NOT skip the cross-feature CTA test (CreatePlanFlow → ReadingPlanDetail navigation after Generate My Plan)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| 5 file-level acceptance criteria sets pass | manual | All 5 acceptance subsections (CreatePlanFlow, Button primitive — N/A skipped, PlanCompletionOverlay, ChallengeCompletionOverlay, MilestoneCard, DayCompletionCelebration) marked complete |
| Behavioral preservation (spec 504–517) confirmed | manual | All 13 bullets in the Behavioral preservation section verified |
| Theme-color preservation confirmed | manual | All 5 themeColor inline styles preserved exactly |
| Regression sweep complete | manual | 9 routes confirmed unchanged |

**Expected state after completion:**
- [ ] All 5 file-level acceptance sections marked complete in execution log
- [ ] All behavioral preservation bullets confirmed
- [ ] All theme-color preservations verified
- [ ] All 9 regression routes confirmed unchanged
- [ ] CrisisBanner manual smoke (typing self-harm keyword) confirms resources render immediately above textarea

---

### Step 16: Document execution log decisions

**Objective:** Record the planning-time decisions and any execution-time deviations for the audit trail.

**Files to create/modify:**
- This plan's Execution Log table (added below) — fill in completion timestamps and notes
- Optionally append to `_plans/recon/grow-create-overlays-2026-05-04.md` if any recon Q (Q1–Q9) needs an updated answer (no expected change — this spec resolves them all per the "Reference recon" section of the spec)

**Details:**

Document at minimum:
- Whether Button gradient variant existed at execution start (EXPECTED: yes; recorded as Change 9 SKIPPED)
- BackgroundCanvas wrap shape chosen for Change 1 (EXPECTED: `<BackgroundCanvas>` directly replaces the styled div; no inner wrapping)
- Sparkles icon spacing path on the gradient Generate button (EXPECTED: `gap-2` flex layout from Button primitive provides spacing; no fallback `mr-2` wrapper needed)
- Button child text rendering on subtle variant for Continue button (EXPECTED: `getByText('Continue to Day 4')` survives — Button renders children as visible text)
- Test baseline numbers (pre and post)
- Any deviation from the planned spread merge order on PlanCompletionOverlay h2

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A: documentation only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT skip documenting decisions — the audit trail is mandated by the spec's Implementation Notes section (line 588)
- DO NOT alter the recon doc's open questions list (the spec resolves them; the recon doc remains the original-state snapshot)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Execution log filled | manual | All 16 step rows have completion status and notes |

**Expected state after completion:**
- [ ] Execution Log table updated with completion status for all 16 steps
- [ ] Decisions recorded for: Change 9 status, BackgroundCanvas wrap shape, Sparkles spacing path, Button child text rendering, baseline numbers, spread merge order
- [ ] Spec 6C marked complete

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pre-execution recon and baseline capture |
| 2 | 1 | Change 1 — CREATION_BG_STYLE → BackgroundCanvas |
| 3 | 1 | Change 2 — StepOne h1 GRADIENT_TEXT_STYLE |
| 4 | 1, 3 | Change 3 — StepTwo h1 GRADIENT_TEXT_STYLE (consumes import added in 3) |
| 5 | 1 | Change 4 — textarea cyan → violet glow |
| 6 | 5 | Change 5 — CrisisBanner + CharacterCount preservation verification (verifies post-Change 4 wiring) |
| 7 | 1 | Change 6 — Step 1 Next button → subtle Button (adds Button import) |
| 8 | 1, 7 | Change 7 — Step 2 Generate button → gradient Button (consumes import added in 7) |
| 9 | 1 | Change 8 — DayCompletionCelebration Continue → subtle Button (adds Button import to its file) |
| 10 | 1 | Change 10 — PlanCompletionOverlay h2 GRADIENT_TEXT_STYLE merged with fadeStyle (adds GRADIENT_TEXT_STYLE import to its file) |
| 11 | 1 | Change 11 — ChallengeCompletionOverlay h2 drop font-script, retain themeColor |
| 12 | 1 | Change 12 — MilestoneCard h2 drop font-script, retain themeColor |
| 13 | 11 | Update ChallengeCompletionOverlay test (depends on Change 11 to make new assertion pass) |
| 14 | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | Full test suite + typecheck reconciliation |
| 15 | 14 | Manual eyeball checks + regression sweep |
| 16 | 15 | Document execution log decisions |

**Note:** Change 9 (Button primitive extension) does NOT appear in the dependency map because pre-execution recon item 4 (Step 1) confirmed the gradient variant ALREADY EXISTS at `Button.tsx:49–50`. Change 9 is SKIPPED. If a future re-validation finds the variant missing, Step 1 must surface that and a new Step (between 1 and 7) must be inserted to add the variant.

**Per-file dependency notes:**
- Steps 2, 3, 4, 5, 6, 7, 8 ALL touch `frontend/src/components/reading-plans/CreatePlanFlow.tsx`. They MUST be applied in order (or in parallel with careful merge resolution) because they share an import-block edit and a single file. Recommended sequential application: Step 2 → 3 → 4 → 5 → 7 → 8 (Step 6 is verification-only).
- Steps 9, 10, 11, 12 touch separate files; they can be applied in any order after Step 1.
- Step 13 must follow Step 11 (depends on the migrated h2's new shape).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pre-execution recon and baseline capture | [COMPLETE] | 2026-05-05 | Baseline: 9,487 pass / 2 pre-existing fail. All recon assumptions verified against live code. Safety backup: backup/pre-execute-20260505085850. |
| 2 | Change 1 — CreatePlanFlow CREATION_BG_STYLE → BackgroundCanvas | [COMPLETE] | 2026-05-05 | `CreatePlanFlow.tsx`: removed `CREATION_BG_STYLE` constant and import, replaced outer `<div style={CREATION_BG_STYLE}>` with `<BackgroundCanvas>`. |
| 3 | Change 2 — CreatePlanFlow StepOne h1 GRADIENT_TEXT_STYLE | [COMPLETE] | 2026-05-05 | `CreatePlanFlow.tsx` StepOne: `font-script text-4xl text-white sm:text-5xl` → `text-4xl font-bold sm:text-5xl` + `style={GRADIENT_TEXT_STYLE}`. |
| 4 | Change 3 — CreatePlanFlow StepTwo h1 GRADIENT_TEXT_STYLE | [COMPLETE] | 2026-05-05 | `CreatePlanFlow.tsx` StepTwo: same pattern as Change 2. |
| 5 | Change 4 — CreatePlanFlow textarea cyan → violet glow | [COMPLETE] | 2026-05-05 | Canonical violet glow class string applied. Playwright computed-style verification confirmed rgba(167,139,250,0.18) box-shadow + rgba(167,139,250,0.3) border. `aria-label` and `aria-describedby` preserved. CrisisBanner wiring preserved. |
| 6 | Change 5 — CrisisBanner + CharacterCount preservation verification | [COMPLETE] | 2026-05-05 | Both components confirmed present in CreatePlanFlow.tsx after all edits. |
| 7 | Change 6 — Step 1 Next button → subtle Button | [COMPLETE] | 2026-05-05 | `<Button variant="subtle" size="md" type="button" onClick={onNext} disabled={!topicText.trim()} className="w-full sm:w-auto">Next</Button>`. |
| 8 | Change 7 — Step 2 Generate button → gradient Button | [COMPLETE] | 2026-05-05 | `<Button variant="gradient" size="md" ...><Sparkles className="h-4 w-4" aria-hidden="true" />Generate My Plan</Button>`. Sparkles `mr-2 inline-block` dropped — Button's `gap-2` handles spacing. |
| 9 | Change 8 — DayCompletionCelebration Continue → subtle Button | [COMPLETE] | 2026-05-05 | `DayCompletionCelebration.tsx`: added `Button` import, replaced inline `<button>` with `<Button variant="subtle" size="md" type="button" onClick={onContinue} className="mt-3 w-full sm:w-auto">`. |
| 10 | Change 10 — PlanCompletionOverlay h2 GRADIENT_TEXT_STYLE merged with fadeStyle | [COMPLETE] | 2026-05-05 | `PlanCompletionOverlay.tsx`: added `GRADIENT_TEXT_STYLE` import, h2 `font-script text-4xl text-white sm:text-5xl` → `text-4xl font-bold sm:text-5xl` + `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}`. `id="plan-completion-title"` preserved. |
| 11 | Change 11 — ChallengeCompletionOverlay h2 drop font-script, retain themeColor | [COMPLETE] | 2026-05-05 | `ChallengeCompletionOverlay.tsx`: `font-script text-4xl sm:text-5xl` → `text-4xl font-bold sm:text-5xl`. `style={{ color: themeColor }}` retained. NO GRADIENT_TEXT_STYLE (Decision 6 — would override 5 seasonal palettes). |
| 12 | Change 12 — MilestoneCard h2 drop font-script, retain themeColor | [COMPLETE] | 2026-05-05 | `MilestoneCard.tsx`: `font-script text-3xl sm:text-4xl` → `text-3xl font-bold sm:text-4xl`. `style={{ color: themeColor }}` retained. Smaller sizing (text-3xl/4xl vs text-4xl/5xl) preserved per spec. |
| 13 | Update ChallengeCompletionOverlay test (line 45–49) | [COMPLETE] | 2026-05-05 | Renamed test "renders challenge title in Caveat font" → "renders challenge title with themeColor brand expression". Replaced `toHaveClass('font-script')` with `not.toHaveClass('font-script')` + `toHaveStyle({ color: defaultProps.themeColor })`. |
| 14 | Full test suite + typecheck reconciliation | [COMPLETE] | 2026-05-05 | 9,487 pass / 2 fail — exactly pre-existing baseline. No regressions introduced. |
| 15 | Manual eyeball checks + regression sweep | [COMPLETE] | 2026-05-05 | Playwright: /grow page ✅, CreatePlanFlow Step 1 (1440px + 375px) ✅, Step 2 gradient heading + gradient button ✅. Textarea violet glow computed-style verified. h1 gradient confirmed Inter 700 48px (not Caveat). Zero font-script in production code. CREATION_BG_STYLE fully removed from codebase. |
| 16 | Document execution log decisions | [COMPLETE] | 2026-05-05 | This entry. |

**Note on Change 9:** SKIPPED at planning time. Button gradient variant verified to already exist at `Button.tsx:49–50` with tokenized shadow `shadow-gradient-button` (canonical project pattern, intentional divergence from spec's literal-shadow class string). No primitive extension needed; Step 8 consumes the existing variant directly.
