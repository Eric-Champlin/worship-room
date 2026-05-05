# Spec 6C Recon — CreatePlanFlow + Completion Overlays

**Date:** 2026-05-04
**Scope:** CreatePlanFlow, PlanCompletionOverlay, ChallengeCompletionOverlay, MilestoneCard, DayCompletionCelebration
**Direction doc:** `_plans/direction/grow-2026-05-04.md`
**Companion recon:** `_plans/recon/grow-detail-pages-2026-05-04.md` (Spec 6B)

LOC: CreatePlanFlow 320, PlanCompletionOverlay 261, ChallengeCompletionOverlay 256, MilestoneCard 145, DayCompletionCelebration 114 — total **~1,096 LOC across 5 files**.

Test files in scope: `CreatePlanFlow.test.tsx` (220 LOC, 17 tests), `PlanCompletionOverlay.test.tsx` (201 LOC, 17 tests), `ChallengeCompletionOverlay.test.tsx` (201 LOC, 17 tests), `MilestoneCard.test.tsx` (95 LOC, 7 tests), `DayCompletionCelebration.test.tsx` (76 LOC, 7 tests). **Total: 5 test files, 793 LOC, 65 tests.**

Trigger context (read-only): `pages/ReadingPlans.tsx:154` (CreatePlanFlow conditional render when `?create` query param), `pages/ReadingPlanDetail.tsx:254` (DayCompletionCelebration inline), `pages/ReadingPlanDetail.tsx:317` (PlanCompletionOverlay portal), `pages/ChallengeDetail.tsx:422` (MilestoneCard inline), `pages/ChallengeDetail.tsx:541` (ChallengeCompletionOverlay portal). All trigger sites already migrated per Spec 6A/6B — no changes needed at the call sites.

---

## CreatePlanFlow.tsx — detailed audit

**LOC:** 320
**Top-level structure:** full-screen takeover (NOT a modal — the entire viewport becomes the create surface). Mounted inline inside ReadingPlans.tsx via `if (showCreateFlow) return <CreatePlanFlow ... />` — the parent page's content is fully replaced. No portal, no overlay backdrop.
**Layout system:** `<div className="min-h-screen" style={CREATION_BG_STYLE}>` (line 106) → `<div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">` (line 107). No Layout wrapper, no Navbar, no SiteFooter — same shape as PlanNotFound's bypass-Layout pattern but with the inline gradient backdrop.

### State machine
3 sequential steps managed by a single `step: 1 | 2 | 3` state in the parent component (line 50). State variables:
- `step` (1, 2, or 3) — current step
- `topicText` — Step 1 textarea value (driven by `setTopicText`)
- `selectedDuration` — Step 2 selected duration in days (`7 | 14 | 21`)
- `isGenerating` — Step 3 loading flag (gates back-button visibility and Escape handling)

Transitions:
- Step 1 → Step 2: `onNext` callback in StepOne fires `setStep(2)` (line 145). Gated by `topicText.trim()` non-empty (button disabled at line 223).
- Step 2 → Step 3: `handleGenerate` (line 93-103) fires `setStep(3)` + `setIsGenerating(true)` synchronously, then a `setTimeout(2500)` that calls `matchPlanByKeywords()` + `addCustomPlanId()` + `navigate(planId)` + `showToast()`.
- Step 1 ← Step 2: Escape key OR back-arrow button in chrome.
- Step 1 → close: Escape key OR back-arrow → calls `onClose()` (the parent clears `?create` from URL).
- Step 3: NO back navigation possible — Escape disabled (`isGenerating` guard line 58, 71); back arrow not rendered (line 109).

### Atmospheric layer (Decision 13 target)
- **Current:** `CREATION_BG_STYLE` inline gradient at lines 13-17 (verbatim):

```ts
const CREATION_BG_STYLE = {
  backgroundImage:
    'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
  backgroundSize: '100% 100%',
} as const
```

  Applied at line 106: `<div className="min-h-screen" style={CREATION_BG_STYLE}>`. This is the SAME radial+linear pattern that Spec 6A/6B replaced on the detail pages (where it was named `ATMOSPHERIC_HERO_BG` plus `bg-dashboard-dark`). The CreatePlanFlow has its own variant — the linear has 4 stops instead of 1, and the violet `#4A1D96` accent at 55% is unique. Otherwise it's the same family of inline gradient-as-backdrop pattern.

- **Target (Decision 2 + Decision 13):** replace with `<BackgroundCanvas>` wrapper. CreatePlanFlow has no separate hero — the entire surface IS one continuous emotional zone, so a single BackgroundCanvas wrap covers the full step machine. **Side effect:** the warm violet `#4A1D96` mid-gradient that visually identified the create surface as "different from regular grow pages" goes away. The new background reads as canonical Grow atmosphere, not as a special create-mode tint. Direction doc explicitly accepts this (Decision 13). Flag for visual sign-off in spec writing — losing the violet warmth on the create surface is a meaningful aesthetic shift, not just a wrapper swap.

### Cyan textarea glow (Decision 10 target)
- **Location:** line 195, StepOne textarea.
- **Verbatim class string** (the entire `className`):

```
w-full resize-none rounded-xl border border-glow-cyan/30 bg-white/5 p-4 text-white backdrop-blur-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-[0_0_12px_2px_rgba(0,212,255,0.35),0_0_27px_5px_rgba(139,92,246,0.26)] min-h-[120px]
```

Three deprecated patterns in this single string:
1. `border border-glow-cyan/30` — cyan border (deprecated; design system § "Deprecated Patterns" lists "Cyan/purple textarea glow border" → violet textarea glow).
2. `shadow-[0_0_12px_2px_rgba(0,212,255,0.35),...]` — cyan box-shadow (the `(0,212,255,...)` is glow-cyan #00D4FF). Deprecated per design system § "Textarea Glow Pattern".
3. `focus:ring-primary/50` — primary purple ring (canonical pattern uses `focus:ring-violet-400/30` per the new violet textarea glow string).

- **Target (Decision 10 + design system § "Textarea Glow Pattern"):** the canonical violet textarea glow string. Verbatim from the direction doc and 09-design-system.md (Daily Hub Round 4 / DailyHub 1B):

```
w-full resize-none rounded-xl p-4 text-white backdrop-blur-sm min-h-[120px]
shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
border border-violet-400/30 bg-white/[0.04]
focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
placeholder:text-white/40
```

Note: the canonical violet pattern uses `placeholder:text-white/40` — the current cyan version uses `placeholder:text-white/50`. Subtle dimming, but documented difference. Spec writer should pick one; defaulting to the canonical `/40` is correct.

### Caveat headlines (Decision 6 target — 2 sites)

**Site 1: StepOne h1** (line 182-184):
```tsx
<h1 className="text-center font-script text-4xl text-white sm:text-5xl">
  What&apos;s on your heart?
</h1>
```
Text content: `What's on your heart?` (note the HTML-encoded apostrophe in source).

**Site 2: StepTwo h1** (line 251-253):
```tsx
<h1 className="text-center font-script text-4xl text-white sm:text-5xl">
  How long of a journey?
</h1>
```
Text content: `How long of a journey?`

- **Target (Decision 6):** entire h1 → `style={GRADIENT_TEXT_STYLE}` (white-to-purple gradient via `background-clip: text`), drop `font-script` and `text-white`. Class string becomes something like `text-center text-4xl font-bold sm:text-5xl` with the inline `style` prop carrying the gradient. Matches the established pattern at ReadingPlanDetail/ChallengeDetail h1s.
- **Side effect:** font weight becomes `font-bold` (700) since GRADIENT_TEXT_STYLE expects an Inter heading, not Caveat's natural cursive. Visual rhythm changes from emotional-handwritten to confident-modern. This is the locked direction across the app — Caveat is fully deprecated.

### `bg-primary` solid buttons (Decision 9 targets — 2 buttons)

**Site 1: Step 1 Next button** (line 219-233):
```tsx
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
```
- **Target (Decision 9):** `<Button variant="subtle">`. Decision rationale: "Just navigation between steps."

**Site 2: Step 2 Generate button** (line 278-293):
```tsx
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
```
- **Target (Decision 9):** `<Button variant="gradient">`. Decision rationale: **THIS is the emotional climax — "create my plan"**. Reserved gradient showstopper. Sparkles icon stays as `mr-2 inline-block` icon adornment inside the button.
- **Side effect:** the gradient variant carries the white-purple gradient background per design system § "White Pill CTA Patterns" Pattern 2 (or whatever `<Button variant="gradient">` resolves to — verify primitive's actual variant set during plan writing). The shift from solid violet to gradient is the visual climax that marks the moment of plan creation.

### Step 3 progress dots + loading (bg-primary uses)

**Progress dots** (lines 122-136):
```tsx
<div className="flex justify-center gap-2" role="group" aria-label={`Step ${step} of 3`}>
  {[1, 2, 3].map((n) => (
    <div
      key={n}
      className={cn(
        'h-2 w-2 rounded-full transition-colors',
        n === step ? 'bg-primary' : 'bg-white/20',
      )}
    />
  ))}
</div>
```
The active dot uses `bg-primary` for the current step. **NOT a button** — these are visual indicators only, sized 8×8px. Decision 9 covers buttons only. **Recommendation:** leave as-is. Progress dots are data viz / state indication, not CTAs. Same precedent as the `bg-primary` progress-bar fill in ReadingPlanDetail (left as-is in Spec 6B).

**Step 3 bouncing dots** (lines 304-308):
```tsx
<div className="flex gap-2">
  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none [animation-delay:0ms]" />
  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none [animation-delay:150ms]" />
  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none [animation-delay:300ms]" />
</div>
```
Three `bg-primary` bouncing loading dots. **Same recommendation:** leave as-is. Loading-state indicators, not buttons.

### Step 2 duration card border-primary glow

Lines 256-275 render 3 `<button>` cards (Quick Focus / Deeper Dive / Full Transformation). The selected state uses:
```
border-primary shadow-[0_0_15px_rgba(109,40,217,0.3)]
```
Where `(109,40,217)` is `#6D28D9` = primary purple. The unselected state is `border-white/10 hover:bg-white/10`. The icon at line 269 is `<Icon className="h-6 w-6 text-primary-lt" />`.

These are interactive selection cards (radio behavior via `aria-pressed`, line 261), NOT primary CTAs in Decision 9's sense. Direction doc does NOT enumerate these. **Recommendation:** leave as-is. The primary-purple selected glow is functioning categorical signal (which option is selected), not a CTA expression. The icon `text-primary-lt` is decoration.

Cross-reference: this matches the broader pattern of "primary-purple in selection states stays; primary-purple in CTAs migrates" that Decision 9 implies.

### Crisis banner integration (preserve)
Line 187: `<CrisisBanner text={topicText} />` mounts inside StepOne above the textarea. Receives `topicText` and renders crisis resources if a self-harm keyword is detected. This is a safety-critical component (`role="alert"` + `aria-live="assertive"` per accessibility patterns). **MUST be preserved unchanged.** Visual migration must not relocate or restructure the banner — it stays directly above the textarea so users see the resources immediately upon typing crisis content.

### Character count integration (preserve)
Lines 199-201:
```tsx
<div className="mt-2 text-right">
  <CharacterCount current={topicText.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="plan-char-count" />
</div>
```
Mounted below the textarea. The textarea has `aria-describedby="plan-char-count"` (line 197) — accessibility wiring must be preserved. CharacterCount has `aria-live="polite"` for zone-change announcements per design system § "Accessibility Patterns". **MUST be preserved unchanged.**

### Topic chips (preserve)
Lines 205-216: 6 starter chips (Anxiety, Grief, Relationship struggles, Finding purpose, Strengthening faith, Forgiveness) rendered as `<button>` elements with `min-h-[44px]`, `rounded-full`, `bg-white/10`, `text-white/80`. Click pre-fills the textarea with a starter phrase via `handleChipClick` (line 79-91), which uses `requestAnimationFrame` to focus the textarea AFTER state update and position the cursor at the end of the starter text.

Direction doc does NOT explicitly enumerate chip migration. Class string is canonical (44px tap target, `bg-white/10`, white/80 text, hover state). **Recommendation:** preserve as-is. These are utility chips, not CTAs. No `font-script`, no `text-primary`, no `bg-primary` — clean.

Cross-reference: design system describes chip-row alignment risks under "Inline Element Layout — Position Verification." 6 chips with `flex-wrap` could wrap unpredictably at mobile widths. Pre-existing concern; not a 6C migration target.

### Plan match / navigation logic (preserve)
Lines 93-103, `handleGenerate`:
```ts
setStep(3)
setIsGenerating(true)
setTimeout(() => {
  const planId = matchPlanByKeywords(topicText)
  addCustomPlanId(planId)
  navigate(`/reading-plans/${planId}`)
  showToast('Your personalized plan is ready!')
}, 2500)
```
The 2.5-second `setTimeout` is the simulated AI generation delay. `matchPlanByKeywords` does keyword → plan ID matching (currently a deterministic mock; AI Plan Generation remains mock per CLAUDE.md). `addCustomPlanId` writes the plan ID to `wr_custom_plans` localStorage so the user's reading plans list can mark it as AI-generated. Navigation lands the user on the detail page; the toast confirms success.

**MUST be preserved unchanged.** This is core feature behavior, not visual chrome. Visual migration can change the StepThree visuals (loading dots styling, scripture blockquote chrome) without touching the `handleGenerate` callback.

### Step 3 scripture blockquote (preserve italic — Decision 4)
Lines 314-316:
```tsx
<blockquote className="mt-8 max-w-md font-serif text-base italic leading-relaxed text-white/60">
  &ldquo;For I know the thoughts that I think toward you,&rdquo; says Yahweh, &ldquo;thoughts of peace, and not of evil, to give you hope and a future.&rdquo;
</blockquote>
<p className="mt-2 text-sm text-white/60">— Jeremiah 29:11 WEB</p>
```
Lora serif italic. Direction doc Decision 4 explicitly enumerates `CreatePlanFlow Jeremiah quote` as scripture-italic exception. **Preserve `font-serif italic` unchanged.** Only chrome migration here is implicit if the surrounding StepThree wrapper changes.

The Step 3 "Creating a Scripture journey just for you..." status text at line 310 is `text-lg text-white/80` — not scripture, body text. Out of Decision 4 scope. Out of Decision 3 scope (Decision 3 is hero subtitles). Leave as-is.

### Deprecated patterns enumerated (CreatePlanFlow)
1. **`CREATION_BG_STYLE` inline gradient** (lines 13-17, applied line 106) → `<BackgroundCanvas>` (Decision 2 + 13).
2. **Cyan textarea glow** at line 195 → canonical violet textarea glow (Decision 10).
3. **`font-script` h1 in StepOne** (line 182) → `style={GRADIENT_TEXT_STYLE}` (Decision 6).
4. **`font-script` h1 in StepTwo** (line 251) → `style={GRADIENT_TEXT_STYLE}` (Decision 6).
5. **`bg-primary` Next button** (line 225) → `<Button variant="subtle">` (Decision 9).
6. **`bg-primary` Generate button** (line 284) → `<Button variant="gradient">` (Decision 9).
7. **`bg-primary` progress dots + bouncing loading dots** — informational only, NOT enumerated. Leave as-is.
8. **`border-primary` Step 2 selection state on duration cards** — selection state, NOT a CTA. Leave as-is.

---

## PlanCompletionOverlay.tsx audit

**LOC:** 261
**Mount type:** `createPortal` to `document.body` (line 156, 259) — full-screen modal.
**Trigger:** `ReadingPlanDetail.tsx:317-326` when `progress?.completedAt` is non-null AND no other dismissal flag set.

### Modal/portal structure
- `createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" ...>, document.body)` (line 156-167) — z-50 backdrop with 70% black + 4px blur. Fade-in on `step >= 1` via inline transition.
- Content card (line 172): `relative mx-4 max-w-md rounded-2xl border border-white/15 bg-hero-mid/90 p-8 sm:p-10`. Uses the `bg-hero-mid` token (#1E0B3E) at 90% opacity — distinct from the BackgroundCanvas pattern. **NOT a FrostedCard primitive** but uses the same `rounded-2xl border border-white/15` family chrome as a default-tier FrostedCard. Direction doc doesn't list this for migration.
- Close button (X, line 174-181): top-right, `text-white/50 hover:text-white`, `aria-label="Close"`.

### Focus trap + ESC handling
- `useFocusTrap(true, onDismiss)` at line 66 — canonical accessibility primitive, manages focus restoration on close. The hook's `onDismiss` parameter wires Escape key → `onDismiss()`.
- Step 7 (`step >= 7`) auto-focuses the Done button via `doneButtonRef.current?.focus()` (line 99). 7-step animation sequence (line 76-90) progressively reveals icon → heading → plan title → stats card → scripture → CTAs over 2 seconds.
- Body scroll lock at line 103-109 (saves prior `document.body.style.overflow`, restores on cleanup).
- 15-second auto-dismiss at line 112-115.

### Caveat headline (Decision 6 target)

**Site (line 189-196):**
```tsx
<h2
  id="plan-completion-title"
  className="font-script text-4xl text-white sm:text-5xl"
  style={fadeStyle(3)}
>
  Plan Complete!
</h2>
```
Text content: `Plan Complete!`. The `id="plan-completion-title"` is referenced by the dialog's `aria-labelledby` (line 161) — preserve the id.

**Target (Decision 6):** drop `font-script` and `text-white`, apply `style={GRADIENT_TEXT_STYLE}` (merged with the existing `fadeStyle(3)`). Spec writer needs to compose two style objects — `fadeStyle(3)` returns `opacity` + `transform` + `transition`; GRADIENT_TEXT_STYLE returns `background`, `WebkitBackgroundClip`, `color`, etc. Use spread: `style={{ ...fadeStyle(3), ...GRADIENT_TEXT_STYLE }}`. Order matters — fadeStyle's `transition` doesn't conflict with gradient's `background`, so spread order is forgiving here.

### Confetti animation
Lines 21-49, `generateConfetti(count)` produces `count` `<span>` particles with randomized `left`, `width`, `height`, `borderRadius`, `backgroundColor` (from `CONFETTI_COLORS`), and `animationDelay`. Particles use `animate-confetti-fall` with `motion-reduce:hidden`. Mobile gets 15 particles, desktop 30 (line 68-69). Reduced motion → 0 particles (line 69).

**Preserve unchanged.** Confetti animation is part of the celebration moment and is correctly motion-gated.

### theme-color usage
**None.** PlanCompletionOverlay does NOT consume themeColor (reading plans don't have themeColor — that's a Challenge concept). The icon is `<BookCheck className="... text-primary-lt" />` (line 186), the active progress is `text-primary-lt` (verifiable). Stats card uses neutral `bg-white/5 border border-white/10`. CTAs use neutral `bg-white/[0.08] border border-white/10`. **No themeColor preservation pattern needed for this overlay.**

### Scripture blockquote (preserve italic — Decision 4)
Lines 218-226:
```tsx
<blockquote
  className="mt-5 font-serif text-base italic leading-relaxed text-white/80"
  style={fadeStyle(6, 300)}
>
  {scripture.text}
</blockquote>
<p className="mt-2 text-sm text-white/60" style={fadeStyle(6, 300)}>
  — {scripture.reference}
</p>
```
Lora serif italic. Direction doc Decision 4 explicitly enumerates `PlanCompletionOverlay blockquote`. **Preserve `font-serif italic` unchanged.**

The scripture comes from `PLAN_COMPLETION_SCRIPTURES` at line 71-73 via random selection (`useState(() => ...)` ensures a stable choice for the overlay's lifetime).

### Sound effects
Line 93-95:
```ts
useEffect(() => {
  if (step === 3) playSoundEffect('ascending')
}, [step, playSoundEffect])
```
`'ascending'` sound fires when the heading appears (step 3 in the animation sequence). NOT during step 0 (initial render) or post-CTA-click. Same `'ascending'` token used by ChallengeDetail mark-complete (recon 6B noted the asymmetry). **Preserve unchanged.**

### Sub-CTAs (3 buttons, lines 232-254)
1. **Browse Plans** — `onClick={onBrowsePlans}`, navigates to `/grow?tab=plans`.
2. **Share** — `onClick={handleShare}`, generates a Canvas image via `generatePlanCompletionImage()` (line 126-154) and uses Web Share API or downloads the file as fallback.
3. **Done** — `onClick={onDismiss}`, ref'd via `doneButtonRef` for auto-focus on step 7.

Class string for all 3: `min-h-[44px] rounded-xl border border-white/10 bg-white/[0.08] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.12]`. Already canonical neutral-CTA pattern (matches ChallengeCompletionOverlay's CTA cards). **No `bg-primary` solid; no migration target.** Direction doc does not enumerate these for migration.

### Deprecated patterns enumerated (PlanCompletionOverlay)
1. **`font-script` h2 headline** at line 192 → `GRADIENT_TEXT_STYLE` merged with `fadeStyle(3)` (Decision 6).
2. **No other migrations.** Content card chrome (`rounded-2xl border border-white/15 bg-hero-mid/90`) and CTA chrome are canonical. Confetti, focus trap, scroll lock, sound effect, scripture italic — all preserve unchanged.

---

## ChallengeCompletionOverlay.tsx audit

**LOC:** 256
**Mount type:** `createPortal` to `document.body` (line 162, 254) — full-screen modal.
**Trigger:** `ChallengeDetail.tsx:541-550` when final-day completion fires (`completionOverlay` state).

### Caveat headline + theme-color halo (Decision 6 target — preserve themeColor)

**Site (line 189-195):**
```tsx
<h2
  className="font-script text-4xl sm:text-5xl"
  style={{ color: themeColor }}
>
  {challengeTitle}
</h2>
```
Text content: `{challengeTitle}` (dynamic — the challenge's display name).

This is the canonical "themeColor halo" preservation site Spec 6B references. The h2 uses `font-script` (deprecated per Decision 6) AND `style={{ color: themeColor }}` (preserved per Decision 8).

**Target (Decision 6 + Spec 6B preservation pattern):**
- Drop `font-script` (Caveat fully deprecated).
- DO NOT apply `GRADIENT_TEXT_STYLE` here — that would override the `style={{ color: themeColor }}` and lose the per-challenge brand expression. Direction doc Decision 8 explicitly preserves themeColor for ChallengeIcon, hero overlays, Mark Complete, ChallengeShareButton, and MilestoneCard share button. The ChallengeCompletionOverlay h2 is a parallel themeColor brand expression — same preservation logic applies.
- **Suggested target:** plain heading class `text-4xl font-bold sm:text-5xl` retaining `style={{ color: themeColor }}`. The themeColor IS the visual brand expression for the challenge's celebration moment.

This is a **deviation from the direction doc Decision 6** which says "ALL `font-script` Caveat usages migrate to `GRADIENT_TEXT_STYLE`. No exceptions." Direction doc enumerates `ChallengeCompletionOverlay.tsx:191` as a target site. **Open question for product:** does Decision 6 supersede Decision 8 here, or does themeColor brand expression supersede gradient consistency?

Two interpretations:
- **Strict Decision 6:** apply GRADIENT_TEXT_STYLE to the h2, lose themeColor on this surface. The challenge themeColor still shines through on the badge swatch (line 213-215) and confetti (line 110-113).
- **Decision 8 hybrid:** preserve themeColor inline on the h2, just drop `font-script`. The themeColor is the climax visual signal — losing it on the most emotional moment of the challenge weakens brand expression.

**Recommend Decision 8 hybrid** — celebration moments should use themeColor at maximum visibility. Flag for product/design sign-off in spec writing.

### Modal/portal structure
- Outer: `fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm` (line 165). Click-outside-to-dismiss via `onClick={onDismiss}` (line 166).
- Content: `relative mx-4 max-w-md px-6 py-8 text-center sm:px-8` (line 172) with `onClick={(e) => e.stopPropagation()}`. **NO border, NO bg, NO rounded chrome** — just transparent inset content. The dialog is "card-less" — relies on the backdrop blur for separation. Distinct from PlanCompletionOverlay's `bg-hero-mid/90` card chrome.
- Different click-outside semantics from PlanCompletionOverlay (which dismisses via X button or focus trap Escape; click-outside is NOT enabled because PlanCompletionOverlay's backdrop area is part of the visible card boundary). ChallengeCompletionOverlay actively encourages backdrop-click-to-dismiss with the bottom "Tap anywhere to dismiss" hint (line 244-249).

### Focus trap + ESC handling
- Custom focus trap implementation at lines 69-95 (NOT using `useFocusTrap()` hook — rolls own).
- Stores `previousFocusRef.current = document.activeElement` at line 70, restores on cleanup at line 105.
- Tab cycling between first/last focusable elements (lines 77-93).
- Escape key dismisses (line 73-76).
- Body scroll lock (line 98-100) with prior-style restoration (line 104).
- 12-second auto-dismiss at line 54-58.
- 2-second delay before "Tap anywhere to dismiss" hint appears (line 61-66, gated by `!reducedMotion`).

**Inconsistency note:** PlanCompletionOverlay uses `useFocusTrap(true, onDismiss)` (canonical hook), ChallengeCompletionOverlay rolls its own. Per design system § "Accessibility Patterns" the canonical primitive is `useFocusTrap()`. **Pre-existing inconsistency, NOT a 6C migration target.** Direction doc doesn't enumerate. Flag for future a11y-focused spec (same bucket as PastChallengeCard `role="button"`).

### Confetti animation
Lines 24-37, `Confetti` component with `confetti-fall` keyframe animation. Lines 110-116 generate the particles array with mobile=12 / desktop=24, colored from `[themeColor, '#FFD700', '#FFFFFF']`. Reduced motion → no confetti rendered (line 176).

**themeColor is one of the 3 confetti colors** — an additional preservation site. Already preserved per Decision 8. No migration target.

### theme-color usage in overlay
1. **Line 192 h2 color:** `style={{ color: themeColor }}` — preserve per Decision 8 (overrides Decision 6 here, see open question above).
2. **Line 211-216 badge swatch:** `<div className="h-12 w-12 rounded-full" style={{ backgroundColor: themeColor, opacity: 0.7 }} aria-hidden="true" />` — preserve per Decision 8.
3. **Line 110-113 confetti palette:** `[themeColor, '#FFD700', '#FFFFFF']` — preserve per Decision 8.

**No themeColor halo on the modal backdrop.** Unlike ChallengeDetail's hero (which uses `radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 ...)` overlay on top of `ATMOSPHERIC_HERO_BG`), the ChallengeCompletionOverlay's backdrop is plain `bg-black/80 backdrop-blur-sm` — no themeColor halo on the backdrop itself.

**Recommendation:** Spec 6C does NOT need to add a themeColor halo to the modal. The themeColor brand expression is carried by the h2 + badge swatch + confetti, which is sufficient. Adding a backdrop themeColor halo would be a NEW design pattern, not a Spec 6C scope item.

### Sub-CTAs (5 cards, lines 220-241)

5 CTA cards in a 2-column grid (last card spans both columns and centers on desktop):
1. **See your growth →** — `LayoutDashboard` icon, navigates to `/`.
2. **Check the leaderboard →** — `Trophy` icon, navigates to `/friends?tab=leaderboard`.
3. **Share your achievement** — `Share2` icon, calls `handleShare()` which generates challenge share image via `generateChallengeShareImage()` (lines 123-152).
4. **Browse more plans →** — `BookOpen` icon, navigates to `/grow?tab=plans`.
5. **Browse more challenges →** — `Compass` icon, navigates to `/grow?tab=challenges`.

Class string for all 5: `flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.08] p-3 text-left transition-colors hover:bg-white/[0.12]` (with conditional `sm:col-span-2 sm:mx-auto sm:max-w-[calc(50%-0.375rem)]` for the last card).

Icon class: `text-white/70` (line 232). Decision 11 (Tonal Icon Pattern) is NOT applied to these icons in the direction doc — they stay neutral white/70. **Recommendation:** preserve. The CTA cards are utility navigation, neutral chrome is correct.

### Deprecated patterns enumerated (ChallengeCompletionOverlay)
1. **`font-script` h2 challenge title** at line 191 → drop `font-script`, RETAIN `style={{ color: themeColor }}` per Decision 8 hybrid (open question — see above).
2. **Custom focus trap** at lines 69-95 (NOT canonical `useFocusTrap()` hook) — pre-existing inconsistency, OUT of 6C scope.
3. **No other migrations.**

---

## MilestoneCard.tsx audit

**LOC:** 145
**Mount type:** inline within ChallengeDetail page flow (NOT a portal/modal). Rendered conditionally at `ChallengeDetail.tsx:422-435` when a milestone-day match fires.
**Container chrome:** `mx-auto max-w-2xl px-4 py-6 sm:px-6` outer (line 107), inner `rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md sm:p-8` (line 108). Rolls-own card chrome, NOT a FrostedCard primitive. The `bg-white/10` (vs `bg-white/[0.06]` canonical default tier) is slightly more opaque than the FrostedCard primitive.

Direction doc does NOT enumerate MilestoneCard chrome migration to FrostedCard. The `rounded-2xl border border-white/20 bg-white/10 p-6` chrome is a celebration-card variant that doesn't match the default/subdued tier system cleanly. **Recommendation:** leave chrome as-is. Migrate Caveat only.

### Caveat headline + theme-color (Decision 6 target — preserve themeColor)

**Site (line 109-111):**
```tsx
<h2 className="font-script text-3xl sm:text-4xl" style={{ color: themeColor }}>
  {milestoneTitle}
</h2>
```
Text content: `{milestoneTitle}` (dynamic — examples from tests: `"Week 1 Complete!"`, `"Halfway There!"`).

Same shape as ChallengeCompletionOverlay h2 (font-script + themeColor). **Same recommendation: Decision 8 hybrid** — drop `font-script`, retain `style={{ color: themeColor }}`. Open question parallels ChallengeCompletionOverlay.

Note: MilestoneCard's heading is `text-3xl sm:text-4xl` (smaller than ChallengeCompletionOverlay's `text-4xl sm:text-5xl`), reflecting MilestoneCard's "incremental milestone" emotional weight vs ChallengeCompletionOverlay's "final climax" weight. Preserve sizing.

### Modal/portal structure: NONE
MilestoneCard is inline, not a modal. No portal, no focus trap, no ESC handling, no backdrop. The user sees it as a celebration card embedded in the challenge detail page after completing a milestone day. Tapping "Keep Going" calls `onDismiss()` which the parent uses to clear `setActiveMilestone(null)`.

### Confetti / celebration animation
Lines 53-59:
```tsx
useEffect(() => {
  if (!prefersReduced) {
    showCelebrationToast('', milestoneTitle, 'celebration-confetti')
  }
}, [])
```
Fires `showCelebrationToast` on mount with `'celebration-confetti'` toast type. The Toast system handles the confetti animation rendering (NOT inline confetti spans like the two completion overlays). Reduced motion guard: `if (!prefersReduced)`. **Preserve unchanged.**

### Share image generation
Lines 34-50: on mount, `generateChallengeShareImage()` is called and the resulting Blob is stored in `shareImageUrl` state. This generates an `<img>` preview shown in the card (line 113-120) AND prepares the file for the share button. Cleanup revokes the object URL on unmount (line 62-66).

### Sub-CTAs (2 buttons, lines 122-141)

1. **Share Your Milestone** (line 123-133):
   ```tsx
   <button
     ...
     style={{ backgroundColor: themeColor }}
     className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg px-8 py-3 font-semibold text-white transition-opacity motion-reduce:transition-none hover:opacity-90 disabled:opacity-60 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
   >
     <Share2 className="h-4 w-4" aria-hidden="true" />
     {isSharing ? 'Sharing...' : 'Share Your Milestone'}
   </button>
   ```
   `style={{ backgroundColor: themeColor }}` — preserve per Decision 8 (themeColor button). NOT enumerated in direction doc Decision 9 (which targets `bg-primary` solids only). **Preserve unchanged.**

2. **Keep Going** (line 134-140):
   ```tsx
   <button
     type="button"
     onClick={onDismiss}
     className="w-full min-h-[44px] rounded-lg border border-white/30 px-6 py-3 text-white/80 transition-colors hover:bg-white/5 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
   >
     Keep Going
   </button>
   ```
   Neutral outlined button. No `bg-primary`, no Caveat, no migration target.

### Deprecated patterns enumerated (MilestoneCard)
1. **`font-script` h2 milestone title** at line 109 → drop `font-script`, RETAIN `style={{ color: themeColor }}` per Decision 8 hybrid (open question).
2. **No other migrations.** Card chrome (`bg-white/10 backdrop-blur-md`) is rolls-own but not enumerated in Decision 7. Theme-color share button preserved. Keep Going button neutral.

---

## DayCompletionCelebration.tsx audit

**LOC:** 114
**Mount type:** inline within ReadingPlanDetail page flow (NOT a portal/modal). Rendered conditionally at `ReadingPlanDetail.tsx:254-264` when `justCompletedDay === selectedDay` AND not the final day's celebration overlay path.
**Container chrome:** `border-t border-white/10 py-8 sm:py-10` (line 42). NO bg, NO rounded — just a top-border-divider section with vertical padding. Plain inline section.

### bg-primary "Continue" button (Decision 9 target)

**Site (line 102-110):**
```tsx
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

- **Conditional render:** only renders when `!isLastDay`. On the final day, no Continue button (PlanCompletionOverlay handles the climax instead).
- **Class string:** `mt-3 w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 sm:w-auto`. NOTE: this uses `hover:bg-primary/90` (90% opacity primary purple), NOT `hover:bg-primary-lt` (the lighter token used by CreatePlanFlow's bg-primary buttons). Subtle inconsistency with the CreatePlanFlow buttons.
- **Target (Decision 9):** `<Button variant="subtle">`. Decision rationale: "Per-day completion is incremental, not climax." Same target as CreatePlanFlow Step 1 Next button.

### No focus trap, no portal, no themeColor
DayCompletionCelebration is the simplest of the 5 in-scope files. No modal infrastructure. No themeColor (reading plans don't have themeColor). No Caveat headlines (Decision 6 doesn't enumerate). No scripture blockquote.

### SVG checkmark animation (preserve)
Lines 55-87: 48×48 SVG with stroke-dashoffset animation that draws the checkmark over `ANIMATION_DURATIONS.slow` (400ms) with 200ms initial delay. Uses canonical animation tokens. Reduced-motion guard via `prefersReducedMotion` short-circuit (line 79).

`stroke="#27AE60"` — hardcoded success green. The `success` Tailwind token is `#27AE60` per design system. Pre-existing hardcoded value (could use `var(--success)` or class-based approach). **Pre-existing concern; out of 6C scope.**

### "+15 pts" pill (preserve)
Line 95-98:
```tsx
{pointsAwarded && (
  <span className="text-sm font-semibold text-primary-lt">
    +15 pts
  </span>
)}
```
Conditional render based on `pointsAwarded` prop (parent passes `false` if the day's points were already awarded earlier, e.g., via a different completion path). `text-primary-lt` is `#8B5CF6` — light violet accent. Decision 11 doesn't enumerate this. Direction doc doesn't migrate. **Preserve unchanged.**

### Deprecated patterns enumerated (DayCompletionCelebration)
1. **`bg-primary` Continue button** at line 106 → `<Button variant="subtle">` (Decision 9).
2. **No other migrations.** Container chrome (border-t divider), checkmark SVG, "+15 pts" pill, conditional render logic — all preserve.

---

## Cross-cutting findings

### Migration scope summary across all 5 files

| File                          | Caveat | bg-primary CTA | Cyan glow | CREATION_BG | themeColor preservation |
| ----------------------------- | ------ | -------------- | --------- | ----------- | ----------------------- |
| CreatePlanFlow                | 2      | 2              | 1         | 1           | n/a                     |
| PlanCompletionOverlay         | 1      | 0              | 0         | 0           | n/a                     |
| ChallengeCompletionOverlay    | 1      | 0              | 0         | 0           | 3 sites (h2, badge, confetti) |
| MilestoneCard                 | 1      | 0              | 0         | 0           | 2 sites (h2, share button) |
| DayCompletionCelebration      | 0      | 1              | 0         | 0           | n/a                     |

**Totals:** 5 Caveat sites, 3 bg-primary CTAs, 1 cyan glow, 1 CREATION_BG_STYLE, 5 themeColor preservation sites.

### Caveat removal — themeColor open question

The 5 Caveat sites split into two categories:

**Category 1 — Plain Caveat → GRADIENT_TEXT_STYLE (3 sites):**
- CreatePlanFlow StepOne h1 ("What's on your heart?") — line 182
- CreatePlanFlow StepTwo h1 ("How long of a journey?") — line 251
- PlanCompletionOverlay h2 ("Plan Complete!") — line 192

**Category 2 — Caveat + themeColor (2 sites, OPEN QUESTION):**
- ChallengeCompletionOverlay h2 (challenge title with `style={{ color: themeColor }}`) — line 191
- MilestoneCard h2 (milestone title with `style={{ color: themeColor }}`) — line 109

Direction doc Decision 6 says "ALL `font-script` Caveat usages migrate to `GRADIENT_TEXT_STYLE`. No exceptions." But Decision 8 says "Theme-color CTAs preserved as rolls-own with inline style" — and the celebration h2s on Challenge surfaces are arguably parallel themeColor brand expressions, not CTAs.

**Recommend the Decision 8 hybrid:** drop `font-script`, retain `style={{ color: themeColor }}` on Category 2 sites. The challenge themeColor brand expression at the moment of celebration is too valuable to flatten to a generic gradient. Direction doc's "no exceptions" wording in Decision 6 may have been overstated for these specific challenge celebration sites — flag for product/design sign-off.

### bg-primary CTA migration tiers (Decision 9)

| Site                                | Current      | Decision 9 target              |
| ----------------------------------- | ------------ | ------------------------------ |
| CreatePlanFlow Step 1 Next          | `bg-primary` | `<Button variant="subtle">`    |
| CreatePlanFlow Step 2 Generate      | `bg-primary` | `<Button variant="gradient">`  |
| DayCompletionCelebration Continue   | `bg-primary` | `<Button variant="subtle">`    |

Of the 4 `bg-primary` CTA migrations Decision 9 enumerates, **3 of them live in 6C scope** — only ConfirmDialog "Pause & Start New" lives in 6A scope. 6C is the heaviest `bg-primary` migration spec.

`<Button variant="gradient">` is the showstopper variant reserved for THE emotional climax of the wave. Spec 6C's StepTwo Generate button is the canonical use site for that variant. Verify the Button primitive's `variant="gradient"` resolves to the homepage primary CTA pattern (white pill with gradient background, white drop-shadow per design system § "White Pill CTA Patterns" Pattern 2) before plan writing — this primitive may need to be added if it doesn't exist yet.

### bg-primary non-CTA leftovers (NOT migrated per Decision 9)

| Site                                          | Type                          |
| --------------------------------------------- | ----------------------------- |
| CreatePlanFlow progress dots (active step)    | Visual indicator              |
| CreatePlanFlow Step 3 bouncing loading dots   | Loading state                 |
| CreatePlanFlow Step 2 duration card border-primary glow (selected state) | Selection state |
| ReadingPlanDetail progress bar fill (Spec 6B) | Data viz                      |

All four are non-CTA usages. Decision 9 enumerates buttons only. Pre-existing precedent (Spec 6B left ReadingPlanDetail's progress bar `bg-primary` fill alone). **Preserve.**

### Sound effects asymmetry across overlays

| Overlay                         | Sound effect                  | Trigger                                   |
| ------------------------------- | ----------------------------- | ----------------------------------------- |
| PlanCompletionOverlay           | `'ascending'`                 | Step 3 of animation sequence (heading appears) |
| ChallengeCompletionOverlay      | NONE                          | Sound fires on Mark Complete in ChallengeDetail (line 144), NOT on overlay mount |
| MilestoneCard                   | NONE (uses celebration toast confetti, not Web Audio sound) | Mount       |
| DayCompletionCelebration        | NONE                          | n/a                                       |
| CreatePlanFlow Step 3           | NONE                          | n/a (silent loading state)                |

Pre-existing asymmetry. PlanCompletionOverlay is the only celebration overlay that fires its own sound effect; ChallengeCompletionOverlay relies on the upstream Mark Complete sound. **Out of 6C visual-migration scope.** Flag for future sound-design harmonization spec (same bucket as the asymmetry recon 6B noted between ReadingPlanDetail and ChallengeDetail).

### Modal infrastructure inconsistencies

| Overlay                       | Focus trap            | Click-outside-to-dismiss | Auto-dismiss |
| ----------------------------- | --------------------- | ------------------------ | ------------ |
| PlanCompletionOverlay         | `useFocusTrap()` hook | NO (X button + ESC only) | 15s          |
| ChallengeCompletionOverlay    | Rolls-own custom      | YES (`onClick={onDismiss}` on backdrop) | 12s |
| MilestoneCard                 | n/a (inline)          | n/a                      | n/a          |
| DayCompletionCelebration      | n/a (inline)          | n/a                      | n/a          |

PlanCompletionOverlay vs ChallengeCompletionOverlay: different focus-trap implementations (canonical hook vs rolls-own), different click-outside semantics, different auto-dismiss timeouts. **Pre-existing inconsistencies; out of 6C visual-migration scope.** Flag for future a11y spec to harmonize on `useFocusTrap()` and align dismiss semantics.

### Animation token discipline check

- **CreatePlanFlow:** uses `animate-bounce` (Tailwind default), `[animation-delay:0ms|150ms|300ms]` arbitrary timing. NOT using BB-33 tokens — pre-existing. The 2.5s `setTimeout` in handleGenerate is hardcoded; not an animation duration but worth noting.
- **PlanCompletionOverlay:** ✅ uses `ANIMATION_DURATIONS.base`, `ANIMATION_EASINGS.decelerate` consistently.
- **ChallengeCompletionOverlay:** ❌ uses inline `2.5s ${delay}s ease-in forwards` for confetti animation (line 31), `12_000`/`2000` setTimeout literals. Not BB-33 token-discipline.
- **MilestoneCard:** ✅ uses `motion-reduce:transition-none` correctly. No hardcoded ms.
- **DayCompletionCelebration:** ✅ uses `ANIMATION_DURATIONS.base`, `ANIMATION_DURATIONS.slow`, `ANIMATION_EASINGS.decelerate`.

ChallengeCompletionOverlay's hardcoded animation values are pre-existing technical debt. **Out of 6C visual-migration scope.** Flag for future BB-33 cleanup spec.

### Reactive-store consumer audit (BB-45 anti-pattern check)

**No reactive stores read in 6C scope.** None of the 5 files read from `wr_memorization_cards`, `bible:streak`, `wr_prayer_reactions`, or any of the Bible-wave personal-layer stores. CreatePlanFlow writes to `wr_custom_plans` via `addCustomPlanId()` (a CRUD service, not a reactive store). ✅ no BB-45 risk.

### Accessibility within scope

- **CreatePlanFlow:** all buttons have `min-h-[44px]`. Progress dots use `role="group"` with `aria-label`. Textarea has `aria-describedby` linking to CharacterCount's id. CrisisBanner uses `role="alert"`. Back button has `aria-label="Go back"`. Step 3 loading uses `aria-live="polite"` (line 302). ✅ canonical.
- **PlanCompletionOverlay:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby="plan-completion-title"` (line 159-161). `useFocusTrap()` canonical. Close button `aria-label="Close"`. ✅ canonical.
- **ChallengeCompletionOverlay:** `role="dialog"` + `aria-modal="true"` + `aria-label={...challenge complete}` (line 168-169). Custom focus trap (NOT canonical hook, but functionally equivalent). ✅ functional, ❌ non-canonical primitive choice.
- **MilestoneCard:** Share button has descriptive `aria-label`. All buttons have `min-h-[44px]`. ✅ canonical.
- **DayCompletionCelebration:** SVG has `aria-hidden="true"`. Button is plain `<button>`. ✅ canonical.

### Theme-color preservation summary

5 themeColor preservation sites across 6C scope (all Challenge surfaces):

| File                          | Site                              | Current pattern                   | Decision |
| ----------------------------- | --------------------------------- | --------------------------------- | -------- |
| ChallengeCompletionOverlay    | h2 challenge title                | `style={{ color: themeColor }}`   | Decision 8 hybrid (open question) |
| ChallengeCompletionOverlay    | Badge swatch (line 213-215)       | `style={{ backgroundColor: ..., opacity: 0.7 }}` | Decision 8 |
| ChallengeCompletionOverlay    | Confetti color palette (line 110-113) | `[themeColor, '#FFD700', '#FFFFFF']` | Decision 8 |
| MilestoneCard                 | h2 milestone title                | `style={{ color: themeColor }}`   | Decision 8 hybrid (open question) |
| MilestoneCard                 | Share button background (line 127)| `style={{ backgroundColor: themeColor }}` | Decision 8 |

All 5 sites preserve themeColor inline; 6C migration only touches the `font-script` class on the 2 h2 headings. The other 3 sites have no Caveat to migrate.

---

## Tests inventory

### `components/reading-plans/__tests__/CreatePlanFlow.test.tsx`
- **LOC:** 220
- **Tests:** 17 across single describe block.
- **At-risk assertions after migration:**
  - Line 55: `screen.getByText("What's on your heart?")` — survives Caveat removal (text content unchanged).
  - Line 113: `screen.getByText('How long of a journey?')` — survives.
  - Line 71: `screen.getByRole('button', { name: 'Next' })` — survives `<Button variant="subtle">` migration since `name` is content, not class.
  - Line 142: `screen.getByRole('button', { name: /Generate My Plan/ })` — survives `<Button variant="gradient">` migration. The `Sparkles` icon is `aria-hidden`, so accessible name is just text.
  - Line 102, 214: `screen.getByRole('group', { name: /Step 1 of 3/ })` — survives (the role/aria-label structure stays).
  - Line 87: `screen.queryByText(/5 \/ 500/)` (CharacterCount visibility check) — survives.
  - Line 165-166: `screen.getByText(/I know the thoughts that I think toward you/)`, `screen.getByText(/Jeremiah 29:11 WEB/)` — survives (scripture text + ref unchanged).
- **Class-string assertions at risk:** NONE. All tests use semantic queries (getByText, getByRole, getByLabelText, getByPlaceholderText). Migration-resilient.
- **Behavioral tests:** all 17 are behavioral. Tests cover step transitions, chip pre-fill, character count visibility, escape key navigation, back arrow visibility on Step 3, progress dot updates.
- **Drift-prone:** NONE. ✅ no test rewrites required for the visual migration.

### `components/reading-plans/__tests__/PlanCompletionOverlay.test.tsx`
- **LOC:** 201
- **Tests:** 17 across 2 describe blocks (12 main + 4 timer-aware).
- **At-risk assertions after migration:**
  - Line 59: `screen.getByText('Plan Complete!')` — survives Caveat removal.
  - Line 60: `screen.getByText('Finding Peace in Anxiety')` — survives.
  - Line 91-93: `screen.getByText('Browse Plans|Share|Done')` — survives (CTA text unchanged).
  - Line 137-140: `screen.getByRole('dialog')` + `aria-modal` + `aria-labelledby="plan-completion-title"` — `aria-labelledby` references the h2's `id="plan-completion-title"` which MUST be preserved through Caveat migration. ✅ flagged as preservation requirement.
  - Line 146-147: `document.querySelectorAll('.animate-confetti-fall')` — survives (confetti class unchanged).
- **Class-string assertions at risk:** NONE. No `font-script` queries, no `bg-primary` queries.
- **Drift-prone:** NONE.

### `components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx`
- **LOC:** 201
- **Tests:** 17 in single describe block.
- **At-risk assertions after migration (HIGH RISK):**
  - **Line 45-49: `'renders challenge title in Caveat font'` test asserts `expect(title).toHaveClass('font-script')`.** This test will FAIL after `font-script` is removed. **Spec 6C MUST update this test** — replace with an assertion that the title is rendered with themeColor inline style (`expect(title).toHaveStyle({ color: defaultProps.themeColor })`) and that `font-script` is gone (`expect(title).not.toHaveClass('font-script')`).
  - Line 51-53: `screen.getByText('Challenge Complete!')` — survives (text content unchanged).
  - Line 105-111: 5 CTA card text queries — survives.
  - Line 188-193: `'CTA cards have frosted glass styling'` — asserts `card?.className.toContain('bg-white')` and `'border-white/10'`. Survives if CTA card chrome stays unchanged (no migration target enumerated).
  - Line 196-200: `'grid is single column on mobile'` — asserts `grid?.className.toContain('grid-cols-1')` and `'sm:grid-cols-2'`. Grid layout preserved; survives.
- **Class-string assertions at risk:** **1 test (line 45-49) breaks.** This is the only fragile assertion in 6C scope.
- **Behavioral tests:** all other 16 are behavioral; all survive.

### `components/challenges/__tests__/MilestoneCard.test.tsx`
- **LOC:** 95
- **Tests:** 7 in single describe block.
- **At-risk assertions after migration:**
  - Line 50: `screen.getByText('Week 1 Complete!')` — survives.
  - Line 56: `expect(mockShowCelebrationToast).toHaveBeenCalledWith('', 'Week 1 Complete!', 'celebration-confetti')` — survives.
  - Line 67-68: `screen.getByText('Keep Going')` + click — survives.
  - Line 75: `screen.getByLabelText('Share your Week 1 Complete! milestone for Pray40: A Lenten Journey')` — survives.
  - Line 81-82: `screen.getByText('Share Your Milestone')` + `screen.getByText('Keep Going')` — survives.
- **Class-string assertions at risk:** NONE. No `font-script` queries.
- **Drift-prone:** NONE.

### `components/reading-plans/__tests__/DayCompletionCelebration.test.tsx`
- **LOC:** 76
- **Tests:** 7 in single describe block.
- **At-risk assertions after migration:**
  - Line 28-32: `screen.getByText('Day 3 Complete')` + `document.querySelector('svg')` — survives.
  - Line 36, 41-42: `screen.getByText('+15 pts')` / `queryByText('+15 pts')` — survives.
  - Line 47, 52, 58: `screen.getByText('Continue to Day 4')` and variants — **survives `<Button variant="subtle">` migration** since text content is preserved. ⚠️ verify the `<Button>` primitive renders the children as visible text content (not as an icon-only or aria-label-only button).
  - Line 70-74: `prefers-reduced-motion` SVG path assertion — survives.
- **Class-string assertions at risk:** NONE.
- **Behavioral tests:** all 7 survive.

### Test-suite resilience summary
- **Total tests in 6C scope:** 65 across 5 files.
- **High-risk (must update in spec):** 1 — `'renders challenge title in Caveat font'` in `ChallengeCompletionOverlay.test.tsx:45-49`. The test name itself becomes misleading after Caveat removal; rewrite both the assertion AND the test name (e.g., `'renders challenge title with themeColor inline style'`).
- **Medium-risk:** 0.
- **Low-risk:** 64. All other tests use semantic queries (getByText/getByRole/getByLabelText) and survive the visual migration.

This test suite is **substantially more migration-resilient than 6B's** — Spec 6B had 1 fragile DOM-class query (`'.bg-hero-dark'` at ReadingPlanDetail.test.tsx:220-225). Spec 6C has 1 fragile `toHaveClass('font-script')` assertion. Both specs land at 1 must-update test; 6C just has more total tests overall.

---

## Deprecated patterns (beyond Spec 6A/6B enumeration)

The Spec 6A/6B work enumerated: rolls-own FrostedCard chrome, Caveat headings, italic hero subtitles, `min-h-screen bg-dashboard-dark` wrappers, cyan textarea glow, `bg-primary` solid CTAs, ghost link `text-primary`. Spec 6C scope adds:

1. **`CREATION_BG_STYLE` inline gradient** (CreatePlanFlow lines 13-17). New deprecation site of the same family as the previously-removed `ATMOSPHERIC_HERO_BG` + `bg-dashboard-dark` pattern. Replace with `<BackgroundCanvas>`.

2. **Custom focus trap on ChallengeCompletionOverlay** (lines 69-95). Pre-existing rolls-own implementation that should use `useFocusTrap()` per design system § "Accessibility Patterns". OUT of 6C scope; flag for future a11y spec.

3. **MilestoneCard rolls-own card chrome** (line 108: `rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md`). Direction doc Decision 7 does NOT enumerate this for FrostedCard primitive migration — the chrome is a celebration-card variant that doesn't fit default/subdued tier. Pre-existing; OUT of 6C scope.

4. **Hardcoded animation values in ChallengeCompletionOverlay** (line 31 confetti animation `'2.5s ${delay}s ease-in forwards'`, lines 55, 63 setTimeout `12_000`/`2000`). Not BB-33 token-discipline. OUT of 6C scope.

5. **`#27AE60` hardcoded success color in DayCompletionCelebration** (lines 66, 73). Should use `var(--success)` or a class-based approach. OUT of 6C scope.

6. **`text-primary-lt` icon color in CreatePlanFlow Step 2 duration cards** (line 269: `<Icon className="h-6 w-6 text-primary-lt" />`). The icons are Zap, Layers, Sunrise from Lucide — Decision 11 doesn't enumerate. Pre-existing; OUT of 6C scope.

7. **No tests covering `CREATION_BG_STYLE`** — no test asserts the inline gradient renders, so the BackgroundCanvas swap has no test to update for atmospheric layer migration.

---

## Open questions for product/design

1. **Decision 6 vs Decision 8 conflict on Challenge celebration h2s.** Direction doc Decision 6 says "ALL `font-script` Caveat usages migrate to `GRADIENT_TEXT_STYLE`. No exceptions." But ChallengeCompletionOverlay h2 (`style={{ color: themeColor }}`) and MilestoneCard h2 (same pattern) are arguably parallel themeColor brand expressions that Decision 8 preserves. **Recommend Decision 8 hybrid:** drop `font-script`, retain `style={{ color: themeColor }}` on both Challenge h2s. Direction doc's "no exceptions" wording may have been overstated for these sites — challenge themeColor at the moment of celebration is brand expression, not a Caveat decoration. **Confirm interpretation before spec writing.**

2. **`<Button variant="gradient">` primitive existence.** Decision 9 prescribes `<Button variant="gradient">` for CreatePlanFlow Step 2 Generate. This may be a NEW primitive/variant that doesn't exist yet — verify the Button component's current variant inventory (`subtle`, possibly `default`, `outline`, etc.) and confirm whether `variant="gradient"` is already wired. If not, the Button primitive needs extension as a side effect of Spec 6C. Spec writer should grep `<Button variant=` to confirm what variants exist today, and check `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 for the canonical class string the gradient variant should resolve to.

3. **CREATION_BG_STYLE warmth loss.** Removing the violet `#4A1D96` mid-gradient from the create surface flattens it into the canonical Grow atmosphere. The warmth loss is meaningful — currently the create flow visually announces itself as different from regular plan browsing. After BackgroundCanvas migration, the create surface is visually indistinguishable from a regular Grow page. **Confirm acceptance.** Could optionally retain a subtle warm hue via a wrapper around BackgroundCanvas (e.g., a low-opacity radial overlay) but that's a NEW design pattern, not a Spec 6C scope item.

4. **`<Button variant="subtle">` rendering.** The DayCompletionCelebration "Continue to Day N" test at line 47, 52, 58 queries by visible text. `<Button variant="subtle">` should render `{children}` as visible text content for this assertion to survive. Confirm the primitive doesn't transform the label (e.g., wrap in a span with custom layout). If it does, the test query needs adjustment.

5. **CreatePlanFlow Step 2 duration cards `border-primary` selected state.** Lines 264-267 use `border-primary shadow-[0_0_15px_rgba(109,40,217,0.3)]` for the selected card — `(109,40,217)` is `#6D28D9` = primary purple. Direction doc doesn't enumerate. **Preserve as-is** (selection state, not CTA). But confirm — if the spec writer wanted to align with the migration pattern, the selected glow could shift to violet-400 (canonical violet textarea glow) for consistency with Decision 10. **Recommend leaving alone** (selection state ≠ textarea authoring), but flag for sign-off.

6. **CreatePlanFlow progress dots / loading dots `bg-primary`.** Three dot uses (progress indicators line 132, bouncing loaders line 305-307). All `bg-primary`. **Preserve as-is** (visual indicators, not CTAs — same precedent as ReadingPlanDetail's progress bar fill in 6B). But flag for sign-off — these could migrate to violet-400 for consistency if the design wants pure-violet across all primary-purple uses.

7. **ChallengeCompletionOverlay focus trap migration.** Custom rolls-own focus trap (lines 69-95) is pre-existing inconsistency — design system § "Accessibility Patterns" canonicalizes `useFocusTrap()`. **Out of 6C visual-migration scope** — flag for future a11y spec. Confirm this is the correct call (alternative: include the focus-trap migration in 6C since the spec is already touching the file's chrome).

8. **Sound effect harmonization.** PlanCompletionOverlay fires `'ascending'` on heading reveal; ChallengeCompletionOverlay relies on the upstream Mark Complete sound. Asymmetry recon 6B already noted. **Out of 6C visual-migration scope** but harmonization could fit naturally during this spec since both files are being touched. Confirm: harmonize now or punt to a sound-design spec?

9. **MilestoneCard's `bg-white/10` chrome vs FrostedCard primitive.** Direction doc Decision 7 doesn't enumerate MilestoneCard for FrostedCard migration. The current chrome is celebration-card variant (more opaque than default tier). **Preserve as-is** (per direction doc), but if the spec writer wants chrome consistency, MilestoneCard could migrate to `<FrostedCard variant="default">` with the visual side effect that the card becomes slightly more transparent and rounded-3xl instead of rounded-2xl. **Recommend leaving alone** per direction doc, but flag for sign-off.

10. **CharacterCount + Crisis banner preservation discipline.** Both are safety-critical components in CreatePlanFlow StepOne. The visual migration MUST NOT disrupt their wiring (textarea `aria-describedby="plan-char-count"`, CrisisBanner mounted directly above textarea). Spec 6C plan should explicitly call out these preservation requirements in the Step 1 textarea migration step so a careless violet-glow class swap doesn't accidentally break the `aria-describedby` link or relocate the crisis banner.

