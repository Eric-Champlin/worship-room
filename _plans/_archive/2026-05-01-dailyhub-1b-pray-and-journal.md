# Implementation Plan: DailyHub Holistic Redesign 1B — Pray + Journal

**Spec:** `_specs/dailyhub-1b-pray-and-journal.md`
**Date:** 2026-05-01
**Branch:** `forums-wave-continued` (current — spec brief explicitly forbids new branches; user manages git manually)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, see staleness flag below)
**Recon Report:** `_plans/forums/dailyhub-redesign-recon.md` (untracked but staged; the spec body internalizes its findings — read directly during execution if any ambiguity arises)
**Master Spec Plan:** N/A — standalone visual-system spec. Predecessor: `_specs/dailyhub-1a-foundation-and-meditate.md` (plan: `_plans/2026-05-01-dailyhub-1a-foundation-and-meditate.md`). Earlier predecessors: `_specs/frostedcard-pilot-bible-landing.md` + `_specs/frostedcard-iteration-1-make-it-pop.md`.

> **⚠️ Recon staleness flag.** `_plans/recon/design-system.md` was captured 2026-04-05, before the FrostedCard pilot, iteration-1, and 1A shipped. Its values for FrostedCard surface tokens, multi-bloom BackgroundCanvas, Button gradient/subtle variants, and the new DailyHub tab-bar treatment are stale. **Authoritative current values in this plan come from reading the shipped source files directly** (`FrostedCard.tsx`, `Button.tsx`, `tailwind.config.js`, plus the four target component files for migration). The recon is referenced for cross-page context but not for the values this spec touches.

---

## Affected Frontend Routes

- `/daily?tab=pray` (primary visual target)
- `/daily?tab=journal` (primary visual target)
- `/daily?tab=meditate` (regression — 1A surface; tab bar + multi-bloom canvas continue rendering correctly)
- `/daily?tab=devotional` (regression — canvas + tab bar render unchanged; tab content untouched until Spec 2)
- `/bible` (regression — multi-bloom BackgroundCanvas continues rendering correctly; pilot card variants unchanged)

---

## Architecture Context

### Files this spec touches (verified via direct file read 2026-05-01)

| File | Role | Currently | This spec changes |
|---|---|---|---|
| `frontend/src/components/daily/PrayerInput.tsx` | Pray tab textarea + chips + submit | 177 lines. Textarea at line 125–141 with white-glow class string. `<button>` "Help Me Pray" at line 166–174 (rolls-own homepage-primary white pill). Quick-prompt chips at line 109–122 — rolls-own `<button>` with `border-white/15 bg-white/10`, conditional render `showChips = !selectedChip && !text`. **Submission state prop is named `isLoading`, NOT `isSubmitting`.** | Step 1 |
| `frontend/src/components/daily/PrayerResponse.tsx` | Generated prayer card + action buttons | 550 lines. Generated prayer card at line 213 (`mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6`). Action buttons at lines 275–322 (Copy, Save, Save to List + Saved success state). `ReadAloudButton` (line 289–293) and `ShareButton` (lines 354–359 + 366–370) are **separate sub-components**, NOT rolls-own pills. Mobile overflow menu trigger at line 326–333. Reflection buttons "It resonated" / "Something different" / "Journal about this" at lines 400–426 are also rolls-own pills but **not in scope per spec § 1.5** (which lists only Copy/Read Aloud/Save/Share). The classic-prayers section (line 466) is dead-coded behind `false &&`. | Step 2 |
| `frontend/src/components/daily/GuidedPrayerSection.tsx` | 8 guided-prayer cards | 92 lines. 8 `<button>` cards at lines 60–87. Current className: `relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 ... sm:w-auto sm:min-w-0 sm:min-h-[260px] active:scale-[0.98]`. **Spec's recommended className OMITS `sm:w-auto sm:min-w-0`** — these classes reset the carousel min/max width on tablet+ so the desktop grid (`sm:grid sm:grid-cols-2 lg:grid-cols-4`) renders correctly. **They MUST carry through.** Hover classes `hover:bg-white/[0.10] hover:border-white/20 hover:shadow-...` are absorbed by FrostedCard `default` variant's hover treatment. | Step 3 |
| `frontend/src/components/daily/SaveToPrayerListForm.tsx` | Inline form opened from PrayerResponse "Save to List" | 122 lines. Wrapper at line 58 (`mt-4 rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm`). Save button at lines 98–110 — currently `bg-primary` solid purple (NOT a frosted pill). Cancel at lines 111–117 (text link with `text-white/60`). The category pills (line 80–95) and Title input (line 66–74) and the inner CrisisBanner (line 76) are NOT migrated by this spec. | Step 4 |
| `frontend/src/components/daily/JournalTabContent.tsx` | Journal tab shell + draft conflict dialog | Draft conflict dialog at lines 311–342. Wrapper: `mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`. "Start fresh" at lines 325–331 (currently `bg-primary` solid purple). "Keep my current draft" at lines 332–339 (currently `border border-white/[0.12] bg-transparent`, with `autoFocus`). The dialog uses `role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title"`. | Step 5 |
| `frontend/src/components/daily/JournalInput.tsx` | Journal textarea + mode toggle + voice + Save | 350 lines. Mode toggle at lines 162–192 (uses `<div role="group" aria-label="Journal mode">` with `aria-pressed` toggle pattern, NOT tablist/tab). Outer wrapper at line 163 (`mb-6 flex flex-wrap items-center justify-center gap-3`). Inner `inline-flex rounded-lg border border-white/10` at line 164. Buttons use `rounded-l-lg` / `rounded-r-lg` and `bg-primary/20` (active) / `bg-white/10 text-white/70 hover:bg-white/15` (inactive). Guided prompt card at lines 204–225 (`rounded-lg border-l-2 border-primary bg-white/[0.06] p-6` — STAYS rolls-own). "Try a different prompt" at lines 213–222 — currently a rolls-own `<button>` with `text-white/50 hover:text-primary`. Textarea at lines 266–280. Voice mic at lines 289–319 (`absolute bottom-2 right-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors ...` with three conditional branches: permission denied / listening / idle; the listening branch carries `motion-safe:animate-mic-pulse`). "Save Entry" at lines 337–344 — `disabled={!text.trim()}`, NO `isSaving`/`isLoading` async state. | Step 6 |
| `frontend/src/components/daily/SavedEntriesList.tsx` | Saved journal entries feed | 235 lines. Entry article at lines 174–228 (`rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4` + `style={stagger.style}` from `useStaggeredEntrance`). Reflection nested box at lines 197–205 (`mt-3 rounded-lg bg-white/[0.04] p-3`). "Reflect on my entry" at lines 219–226 (text link with `text-primary underline`). NOT migrated: "Write another" / "Done journaling" / "Continue to Meditate" / "Visit the Prayer Wall" / `JournalSearchFilter` / `FeatureEmptyState` (out of scope). | Step 7 |
| `.claude/rules/09-design-system.md` | Canonical home of the textarea-glow pattern | § "Textarea Glow Pattern (Daily Hub Round 3)" at lines 186–198. Daily Experience Components entries for `PrayerInput.tsx` (line 264) and `JournalInput.tsx` (line 265). Deprecated Patterns table at lines 824–842, including line 828 (`animate-glow-pulse on textareas`) and line 834 (`Cyan/purple textarea glow border`). | Step 8 |
| `_plans/recon/design-system.md` | Live recon snapshot | Captured 2026-04-05 (stale relative to pilot + iteration-1 + 1A). May or may not carry a textarea-glow snapshot. | Step 8 (conditional — only if it has a section to update) |

### Test files this spec touches (verified via direct check)

| File | Status |
|---|---|
| `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` | Behavioral. Verify during execution; per recon, no class-string assertions on textarea/card chrome. |
| `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` | Behavioral. Verify during execution. |
| `frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx` | Verify during execution; if any assertion exists on `bg-white/[0.06]` / `border-white/[0.12]`, update to FrostedCard default values. |
| `frontend/src/components/daily/__tests__/SaveToPrayerListForm.test.tsx` | Verify during execution. |
| `frontend/src/components/daily/__tests__/PrayerInput.test.tsx` | DOES NOT EXIST (`PrayerInput` is exercised via `PrayTabContent.test.tsx`). |
| `frontend/src/components/daily/__tests__/JournalInput.test.tsx` | DOES NOT EXIST (`JournalInput` is exercised via `JournalTabContent.test.tsx`). |
| `frontend/src/components/daily/__tests__/PrayerResponse.test.tsx` | DOES NOT EXIST (`PrayerResponse` is exercised via `PrayTabContent.test.tsx`). |
| `frontend/src/components/daily/__tests__/SavedEntriesList.test.tsx` | DOES NOT EXIST (`SavedEntriesList` is exercised via `JournalTabContent.test.tsx`). |
| `frontend/src/components/daily/__tests__/MeditateTabContent.test.tsx` | UNTOUCHED (1A territory). |
| `frontend/src/components/daily/__tests__/HorizonGlow.test.tsx` | UNTOUCHED (1A territory). |

The class-string drift discipline from the spec applies: most existing tests are behavioral, so don't fabricate test changes that aren't needed. Read each file during execution and only update assertions where they actually exist.

### Existing patterns reused (verified in source)

**`FrostedCard.tsx`** (`frontend/src/components/homepage/FrostedCard.tsx`, 103 lines):
- Variants: `'accent' | 'default' | 'subdued'` (default `'default'`).
- Props: `children`, `onClick`, `className`, `as: 'div' | 'button' | 'article'`, `tabIndex`, `role`, `onKeyDown`, `variant`, `eyebrow`, `eyebrowColor: 'violet' | 'white'`, `type: 'button' | 'submit' | 'reset'`.
- When `eyebrow` is set AND (`eyebrowColor === 'violet'` OR `variant === 'accent'` with no explicit color), the eyebrow renders a violet dot + violet-300 uppercase text. **For "Your prayer" eyebrow on the accent prayer card, omit `eyebrowColor` prop — accent variant defaults to violet automatically.**
- When `as="button"`, `type` defaults to `'button'` (prevents accidental form submission).
- Internal hover treatment when `onClick` is set: `hover:-translate-y-0.5`, `motion-reduce:hover:translate-y-0`, `active:scale-[0.98]`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`.
- Variant surface values (authoritative — from `VARIANT_CLASSES` constant in source):
  - `accent`: `bg-violet-500/[0.08] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/70 rounded-3xl p-6 shadow-frosted-accent` + `before:` top-edge hairline pseudo-element.
  - `default`: `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base`.
  - `subdued`: `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5`.

**`Button.tsx`** (`frontend/src/components/ui/Button.tsx`, 117 lines, post-1A):
- Variants: `'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient' | 'subtle'`.
- Sizes: `'sm' | 'md' | 'lg'` (default `'md'`).
- Props: `variant`, `size`, `asChild`, `isLoading`, plus all `ButtonHTMLAttributes<HTMLButtonElement>`.
- When `isLoading={true}`: renders a `<button disabled aria-busy aria-disabled>`, hides children behind `opacity-0`, overlays a `<LoadingSpinner>` sized to `SPINNER_SIZE_BY_BUTTON_SIZE` (sm=16, md=18, lg=20). Layout preserved (children render invisibly to hold width). `isLoading` is ignored when `asChild` is true (warns in dev).
- `subtle` variant base: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]`. Sizes: `sm = px-4 py-2 text-sm`, `md = px-6 py-2.5 text-sm`, `lg = px-8 py-3 text-base`.
- `gradient` variant base: `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]`. Same size table as subtle.
- `ghost` variant base: `text-primary hover:bg-primary/5`. Sizes: `sm = h-9 px-3 text-sm`, `md = h-10 px-4`, `lg = h-12 px-6 text-lg`.

**`cn()` utility** (`frontend/src/lib/utils.ts`): used for the conditional className on the voice mic button (`isRecording && 'motion-safe:animate-mic-pulse border-red-400/60'` overlay).

**`KaraokeText` / `KaraokeTextReveal`** (`frontend/src/components/daily/KaraokeText*.tsx`): unchanged. Continue to be rendered inside the migrated PrayerResponse FrostedCard.

**`CrisisBanner`** (`frontend/src/components/daily/CrisisBanner.tsx`): rolls-own alert idiom. Continues to be rendered inline. Not migrated by this spec.

**`useAuthModal()`** + **`useAuth()`**: existing auth context hooks. Used inside `JournalInput.handleSave` (line 141–147), `PrayerResponse.handleSave` (line 128–134), `PrayerResponse.handleSaveToList` (line 136–149), `GuidedPrayerSection.handleCardClick` (line 38–44). All preserved verbatim — class-string migration does NOT touch these handlers.

### Pattern: provider wrapping for tests

`PrayTabContent.test.tsx` and `JournalTabContent.test.tsx` wrap with `<MemoryRouter>` + `<ToastProvider>` + `<AuthModalProvider>` and mock `useAuth`. `GuidedPrayerSection.test.tsx` follows the same pattern. Any new test added must follow this provider stack — see `_plans/2026-05-01-dailyhub-1a-foundation-and-meditate.md` § Architecture Context for the canonical pattern.

### Auth gating — implementation details

Existing auth gates that this spec preserves verbatim (NO changes to handlers, only to the visual chrome that wraps them):

- **PrayerInput "Help Me Pray" submit** — gating happens in the parent `PrayTabContent.handleSubmit` after `onSubmit(text)` fires; preserved.
- **PrayerResponse "Save"** — `handleSave` at `PrayerResponse.tsx` line 128–134. `if (!isAuthenticated) authModal?.openAuthModal('Sign in to save your prayers')`. Preserved.
- **PrayerResponse "Save to List"** — `handleSaveToList` at line 136–149. `authModal?.openAuthModal('Sign in to save prayers to your list.')`. Preserved.
- **GuidedPrayerSection card click** — `handleCardClick` at line 38–44. `authModal?.openAuthModal('Sign in to start a guided prayer session')`. Preserved.
- **JournalInput "Save Entry"** — `handleSave` at `JournalInput.tsx` line 139–147. Conditional auth modal subtitle: empty draft → "Sign in to save your journal entries"; non-empty draft → "Sign in to save your journal entries. Your draft is safe — we'll bring it back after." Preserved verbatim (Spec V draft-persistence pattern).
- **SavedEntriesList "Reflect on my entry"** — `onReflect(entry.id)` callback. The auth gate fires inside the parent `JournalTabContent` (which owns the `onReflect` handler). Preserved.

### Dependencies between steps

Step 1 (PrayerInput), Step 2 (PrayerResponse), Step 3 (GuidedPrayerSection), Step 4 (SaveToPrayerListForm) all touch the Pray tab subtree but operate on different files — they can run in any order, including in parallel.

Step 5 (JournalTabContent draft-conflict dialog), Step 6 (JournalInput), Step 7 (SavedEntriesList) all touch the Journal tab subtree on different files — they can run in any order, including in parallel.

Step 8 (documentation) lands last so the design-system docs reflect the new patterns after they're shipped.

Recommended execution order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Each step is independently verifiable. The Pray group (1–4) and Journal group (5–7) can be reviewed in two visual passes.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|---|---|---|---|
| Type into PrayerInput textarea | No gate | Step 1 | N/A — class-string change only; existing `onChange` handler preserved |
| Click "Help Me Pray" | Existing gate preserved (parent owns) | Step 1 | Button `onClick` → existing `handleSubmit` → `onSubmit(text)` callback to parent |
| Click a quick-prompt chip | No gate | Step 1 | Button `onClick={() => handleChipClick(chip)}` preserved verbatim |
| Click Copy / Read Aloud on PrayerResponse | No gate (read-only actions) | Step 2 | Existing `handleCopy` and `ReadAloudButton` preserved |
| Click Save on PrayerResponse | Existing gate preserved | Step 2 | Button `onClick={handleSave}` → `if (!isAuthenticated) authModal?.openAuthModal('Sign in to save your prayers')` |
| Click Save to List on PrayerResponse | Existing gate preserved | Step 2 | Button `onClick={handleSaveToList}` → `if (!isAuthenticated) authModal?.openAuthModal('Sign in to save prayers to your list.')` |
| Click Share on PrayerResponse | No gate (anonymous share) | Step 2 | `ShareButton` sub-component preserved unchanged (out of migration scope per spec) |
| Click a guided-prayer card | Existing gate preserved | Step 3 | FrostedCard `onClick={() => handleCardClick(session)}` → `if (!isAuthenticated) authModal?.openAuthModal('Sign in to start a guided prayer session')` |
| Submit SaveToPrayerListForm | Form gated upstream by `handleSaveToList` | Step 4 | No new gate — the form only renders when authenticated |
| Click Cancel on SaveToPrayerListForm | No gate | Step 4 | Button `onClick={onCancel}` preserved |
| Click Start fresh / Keep my current draft on Draft conflict dialog | Existing gate preserved (dialog only renders for users with conflicting drafts) | Step 5 | No new gate — dialog gated upstream by draft-conflict detection |
| Toggle Guided / Free Write | No gate | Step 6 | Button `onClick={() => onModeChange('guided' / 'free')}` preserved with `aria-pressed` |
| Click "Try a different prompt" | No gate | Step 6 | Button `onClick={onTryDifferentPrompt}` preserved |
| Type into JournalInput textarea | No gate | Step 6 | Existing `onChange` + auto-expand preserved |
| Click voice mic button | Browser-level permission, not auth | Step 6 | Button `onClick={handleVoiceToggle}` preserved; existing `isAuthenticated && isVoiceSupported` conditional render preserved |
| Click "Save Entry" | Existing gate preserved | Step 6 | Button `onClick={handleSave}` → `if (!isAuthenticated) authModal?.openAuthModal(<conditional subtitle>)` |
| Click "Reflect on my entry" | Existing gate preserved | Step 7 | Button `onClick={() => onReflect(entry.id)}` preserved; the auth gate fires inside the parent `JournalTabContent.handleReflect` |

Every spec-defined auth gate is accounted for. None are added or removed by this spec — every interaction's onClick handler is preserved verbatim, and only the visual chrome around the click target changes.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|---|---|---|---|
| **Violet-glow textarea (NEW)** | full class string | `border border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40` | spec § Pattern: Violet-glow textarea |
| `FrostedCard variant="accent"` | base | `bg-violet-500/[0.08] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/70 rounded-3xl p-6 shadow-frosted-accent` + `before:` hairline | `FrostedCard.tsx` line 29 |
| `FrostedCard variant="accent"` | hover | `hover:bg-violet-500/[0.13] hover:shadow-frosted-accent-hover hover:-translate-y-0.5` | `FrostedCard.tsx` line 30 |
| `FrostedCard variant="accent"` | eyebrow (auto-violet when no `eyebrowColor` prop) | violet-400 dot + violet-300 uppercase tracking-[0.15em] text | `FrostedCard.tsx` lines 84–98 |
| `FrostedCard variant="default"` | base | `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` | `FrostedCard.tsx` line 33 |
| `FrostedCard variant="default"` | hover | `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5` | `FrostedCard.tsx` line 34 |
| `FrostedCard variant="subdued"` | base | `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` | `FrostedCard.tsx` line 37 |
| `FrostedCard variant="subdued"` | hover (interactive) | `hover:bg-white/[0.04]` | `FrostedCard.tsx` line 38 |
| `Button variant="gradient" size="lg"` | base | `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]` + `px-8 py-3 text-base` | `Button.tsx` lines 50, 63 |
| `Button variant="subtle" size="sm"` | base | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` + `px-4 py-2 text-sm` | `Button.tsx` lines 52, 61 |
| `Button variant="subtle" size="md"` | size class | `px-6 py-2.5 text-sm` | `Button.tsx` line 62 |
| `Button variant="ghost" size="sm"` | base | `rounded-md text-primary hover:bg-primary/5 h-9 px-3 text-sm` | `Button.tsx` lines 46, 57, 58 |
| Journal Guided/Free Write toggle (outer) | base classes | `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md` | spec § 3.1 |
| Journal Guided/Free Write toggle (active) | base classes | `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]` + shared base | spec § 3.1 |
| Journal Guided/Free Write toggle (inactive) | base classes | `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent` + shared base | spec § 3.1 |
| Journal toggle shared button base | classes | `min-h-[44px] flex-1 rounded-full transition-all duration-base motion-reduce:transition-none active:scale-[0.98] text-sm font-medium` | spec § 3.1 + DailyHub 1A tab-bar parity |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- **Worship Room textarea pattern is shifting.** As of this spec, the canonical textarea-glow treatment for PrayerInput and JournalInput becomes **violet-glow** (`border-violet-400/30 bg-white/[0.04]` + dual violet shadow `rgba(167,139,250,0.18)` / `rgba(167,139,250,0.10)` + focus to `border-violet-400/60` + `ring-violet-400/30` + placeholder `white/40`). The old white-glow pattern (`border-white/30 bg-white/[0.06]` + white shadow) is deprecated. Do NOT use `animate-glow-pulse` (deprecated since Wave 6). Do NOT use cyan border (deprecated since Round 3). The textarea remains static (no animation) — preserves the Wave 6 anti-pulsing rule.
- **DailyHub uses `BackgroundCanvas` (multi-bloom, 1A) at the page root, not per-section `GlowBackground`.** Tab content components keep transparent backgrounds — the multi-bloom canvas shows through. This spec does NOT change tab content wrappers; only the chrome on cards and inputs inside.
- **FrostedCard variants are the canonical card primitive.** Do NOT roll your own card with `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` — that's the pre-pilot pattern. Use `<FrostedCard variant="accent" | "default" | "subdued">`. The eyebrow prop on accent cards renders a violet dot + violet-300 uppercase text automatically.
- **Button variants are the canonical button primitive.** Gradient = primary CTA showstopper (Help Me Pray, Save Entry). Subtle = refreshed secondary actions (chips, action buttons, mic). Ghost = soft text-style actions (Cancel, Try a different prompt). Do NOT roll your own pill buttons. The `isLoading` prop on Button handles spinner + aria-busy + aria-disabled + layout preservation — replaces any rolls-own manual loading state.
- **Animation tokens (BB-33).** All transitions on Button gradient/subtle and FrostedCard already use the canonical tokens (`transition-all motion-reduce:transition-none duration-base ease-decelerate`). Do NOT hardcode `200ms` or `cubic-bezier(...)` strings.
- **Reduced-motion safety net.** Global rule in `frontend/src/styles/animations.css` disables animations when the OS flag is on. The voice mic recording animation (`motion-safe:animate-mic-pulse`) already respects this. Do NOT add per-component `prefers-reduced-motion` checks.
- **Inline element layouts.** The PrayerInput quick-prompt chip row (Step 1) wraps via `flex flex-wrap` — chips wrap to row 2 below 640px when content overflow occurs. This is acceptable. Document the wrap tolerance below.
- **No deprecated patterns introduced.** Verified absent: no `Caveat` headings, no `BackgroundSquiggle` on Daily Hub, no `GlowBackground` on Daily Hub, no `animate-glow-pulse`, no cyan textarea border, no italic Lora prompts, no hand-rolled card with soft shadow + 8px radius, no `PageTransition`, no `line-clamp-3` on guided prayer cards.
- **Auth gating preservation.** Every existing auth gate (`useAuthModal()` calls in PrayerResponse.handleSave / .handleSaveToList, JournalInput.handleSave, GuidedPrayerSection.handleCardClick, parent's onReflect) MUST be preserved verbatim. Only the visual chrome around the click target changes; the click handlers themselves are untouched.
- **Aria pattern preservation on the Journal Guided/Free Write toggle.** The toggle uses `<div role="group" aria-label="Journal mode">` with `aria-pressed` on each button. This is the toggle-button pattern, NOT the tablist/tab pattern used by DailyHub's main tab bar. The spec's "same color treatment" applies to class strings only — semantic structure is preserved.
- **44px touch targets.** All migrated Buttons (gradient lg, subtle sm/md, ghost sm) carry `min-h-[44px]` (gradient/subtle) or `h-9 px-3` (ghost — 36px height; explicitly acceptable per spec for soft text-style actions). FrostedCard inherits content height; the migrated cards exceed 44px naturally. The voice mic button preserves `min-h-[44px] min-w-[44px]` via the subtle variant + the existing absolute-positioned classes.

---

## Shared Data Models (from Master Plan)

N/A — visual-system spec. No TypeScript interfaces, no localStorage keys, no shared constants are introduced or modified.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|---|---|---|
| `wr_prayer_draft` | Read/Write | Existing — Pray textarea draft autosave (1s debounce). Behavior preserved verbatim. Constant: `PRAYER_DRAFT_KEY` from `@/constants/daily-experience`. |
| `wr_journal_draft` | Read/Write | Existing — Journal textarea draft autosave (1s debounce). Behavior preserved verbatim. Constant: `JOURNAL_DRAFT_KEY` from `@/constants/daily-experience`. |

No new keys. No reads/writes added. No changes to `wr_journal_mode`, `wr_journal_milestones`, `wr_daily_completion` — all preserved.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|---|---|---|
| Mobile | 375px | PrayerInput textarea retains `min-h-[200px] max-h-[500px] resize-y`. Quick-prompt chips wrap (`flex flex-wrap items-center justify-center gap-2`). GuidedPrayerSection cards stay in horizontal carousel (`w-[220px] min-w-[220px] flex-shrink-0 snap-center` + `overflow-x-auto snap-x snap-mandatory`). FrostedCard variants use `backdrop-blur-md` (8px) + `backdrop-blur-sm` (subdued tier) on mobile. JournalInput Guided/Free Write toggle uses `backdrop-blur-md` + `flex w-full p-1` so the two pills span the available width. Voice mic stays absolute-positioned bottom-right inside the textarea wrapper. |
| Tablet | 768px | The `md:` breakpoint kicks in on FrostedCard tiers: accent gets `backdrop-blur-[12px]`; default/subdued get `backdrop-blur-md` (8px). GuidedPrayerSection switches from horizontal carousel to a 2-column grid (`sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible`); the `sm:w-auto sm:min-w-0` reset on the FrostedCard className override is **CRITICAL** — without it, the cards retain their 220px fixed width and break the grid. SavedEntriesList entries render full-width within the `max-w-2xl` container. |
| Desktop | 1440px | Same tier behavior as tablet. GuidedPrayerSection switches to 4-column grid (`lg:grid-cols-4 lg:gap-5`). PrayerResponse generated prayer card renders at full `max-w-2xl` width inside the tab content wrapper. JournalInput textarea retains auto-expand based on content. Multi-bloom canvas (1A) renders all five layers behind the tab content. |

**Custom breakpoints:** None added. Existing `sm:` (640px) and `lg:` (1024px) breakpoints on `GuidedPrayerSection.tsx` are preserved as-is.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---|---|---|---|
| PrayerInput quick-prompt chip row | 4 starter chips (`I'm struggling with…`, `Help me forgive…`, `I feel lost about…`) | Same y ±5px at 1440px and 768px | Wrapping below 640px is acceptable — chip count and width may exceed mobile container width. The container uses `flex flex-wrap items-center justify-center gap-2`. Y-alignment ±5px on each row of chips post-wrap. |
| PrayerResponse action button row | Copy, Read Aloud, Save, Save to List + (mobile) overflow trigger / (desktop) Share | Same y ±5px at every breakpoint | Never wraps within a row at 1440px (desktop has Share inline). At 768px, 5 buttons may wrap depending on browser; ±5px y-alignment within each row. At 375px, mobile overflow trigger replaces inline Share — 4 buttons inline (Copy/ReadAloud/Save/SaveToList) + the trigger; should fit on one row but may wrap to 2 rows on narrow phones. |
| GuidedPrayerSection grid (existing — no spec change to layout) | 8 cards | Pairs (tablet) / quads (desktop) of cards on each row share y-coordinate ±5px | Never wraps within a row at the chosen breakpoint — `grid grid-cols-2 lg:grid-cols-4` is rigid. Mobile carousel is single-row horizontal scroll. |
| Draft conflict dialog action row | "Start fresh" + "Keep my current draft" | Same y ±5px at every breakpoint | Wrapping below 480px acceptable — uses `flex flex-wrap gap-3`. |
| Journal Guided/Free Write toggle | 2 pill buttons (Guided / Free Write) | Always inline, same y, never wraps | Each pill takes `flex-1` of the `flex w-full` outer; cannot wrap. |
| SavedEntriesList "Write another" + "Done journaling" row (existing — no spec change to layout) | 2 text-link buttons | Same y ±5px at every breakpoint | Container `flex items-center gap-4`. |

`/verify-with-playwright` Step 6l consumes this table to compare `boundingBox().y` values between elements.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|---|---|---|
| Tab bar → PrayerInput chips/textarea | unchanged | Tab content wrapper preserves `mx-auto max-w-2xl px-4 py-10 sm:py-14` |
| PrayerInput chips → textarea | unchanged | `mb-6` on chip container preserved |
| PrayerInput textarea → CharacterCount → CrisisBanner → "Help Me Pray" button | unchanged | Existing `mb-4`, `mb-2`, `mt-1` spacing preserved verbatim |
| PrayerResponse: prayer label → generated prayer card → action buttons → SaveToPrayerListForm (when expanded) → Reflection prompt → Secondary CTAs | unchanged | Existing `mb-2`, `mb-6`, `mb-4`, `mt-6`, `mb-8` spacing preserved verbatim. The FrostedCard accent variant has `p-6` (same as the rolls-own `p-6` it replaces) so internal padding does not drift. |
| GuidedPrayerSection heading → carousel/grid | unchanged | `mb-5` on `<h2>` preserved |
| Carousel/grid card-to-card | unchanged | `gap-3` mobile, `sm:gap-4`, `lg:gap-5` preserved |
| Journal toggle → DevotionalPreviewPanel → Guided prompt card → textarea | unchanged | Existing `mb-6`, `mb-4` spacing preserved verbatim |
| Journal textarea → CrisisBanner → Save Entry | unchanged | Existing `mb-2`, `mb-4`, `mb-8` spacing preserved verbatim |
| SavedEntriesList article-to-article | unchanged | `space-y-6` on parent preserved |
| SavedEntriesList entry body → reflection nested box | unchanged | `mt-3` on the nested box preserved (FrostedCard subdued has `p-5` default; we override with `p-3` to match the rolls-own) |
| Draft conflict dialog → next content (verse prompt card) | unchanged | `mb-6` on dialog wrapper preserved |

The FrostedCard default tier has `p-6` and `rounded-3xl`; rolls-own card chrome being replaced uses `p-4` / `p-6` and `rounded-lg` / `rounded-2xl`. The `className` override pattern (e.g., `className="p-4"` on SavedEntriesList article) preserves the more compact padding where the spec explicitly requires it. `rounded-3xl` (FrostedCard) replaces `rounded-2xl` and `rounded-lg` — visually similar enough that vertical rhythm is preserved (radius increase is decorative, not load-bearing). `/verify-with-playwright` should compare these against pre-spec captured values and flag any gap difference >5px as a regression.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] You are on branch `forums-wave-continued`. The spec brief explicitly forbids new branches; user manages git manually. If on a different branch, STOP and ask.
- [ ] Spec 1A (`_specs/dailyhub-1a-foundation-and-meditate.md`) is committed/present in the working tree. Verify by reading `frontend/src/components/ui/Button.tsx` line 14 — the variant union must include `'subtle'`. Verify `BackgroundCanvas.tsx` has 5+ `radial-gradient(` calls in its `style.background` (multi-bloom) via `grep -c 'radial-gradient' frontend/src/components/ui/BackgroundCanvas.tsx` (expect ≥4).
- [ ] FrostedCard pilot + iteration-1 are present. Verify by reading `FrostedCard.tsx` — `VARIANT_CLASSES` constant must define accent/default/subdued. Verify `Button.tsx` has `gradient` variant (line 50–51).
- [ ] All auth-gated actions from the spec are accounted for (verified — every existing handler is preserved verbatim; this spec adds no new auth gates and removes none).
- [ ] Design system values are verified (read directly from `FrostedCard.tsx` and `Button.tsx` source on 2026-05-01 — see Design System Values table).
- [ ] Recon snapshot at `_plans/recon/design-system.md` is stale (captured 2026-04-05 before pilot/iteration-1/1A) — values for FrostedCard surface, BackgroundCanvas, and Button variants in the recon do NOT match the shipped state. The plan uses shipped values throughout, NOT recon values.
- [ ] No deprecated patterns introduced — verified above in Design System Reminder.
- [ ] All `[UNVERIFIED]` values are flagged with verification methods (3 flags below).

### [UNVERIFIED] values

```
[UNVERIFIED] #1 — JournalInput "Save Entry" button isLoading binding.
→ Best guess: There is no `isSaving` state in JournalInput today. `handleSave` is synchronous
  (calls `onSave(...)` callback to parent). The spec example (`isLoading={isSaving}`) does
  not reflect the actual prop surface. Plan recommendation in Step 6: omit `isLoading` and
  rely on `disabled={!text.trim()}` only. This matches existing behavior — saves are too fast
  to need a spinner today.
→ To verify: Read `JournalInput.tsx` lines 50–157. Confirm `text` and `lastSavedTextRef` are
  the only save-related state; confirm there is no async save indicator.
→ If wrong (parent intends to introduce async save): Add a transient `isSaving` state inside
  `handleSave`, set true immediately, set false when `onSave` completes (note: `onSave` is
  void-returning today; would need a callback or promise change in the parent contract). For
  now, the simplest correct implementation is omit `isLoading`. Spec § 3.5 line "If submission
  state is tracked via different state, adjust the prop accordingly" anticipates this.

[UNVERIFIED] #2 — PrayerResponse action buttons migration scope.
→ Best guess: Spec § 1.5 lists "Copy / Read Aloud / Save / Share". Of those four, ReadAloud
  (line 289–293 of PrayerResponse.tsx) is `<ReadAloudButton>` — a separate component with its
  own visual treatment. Share (line 354–359 + 366–370) is `<ShareButton>` — also a separate
  component. Migrating these two would require also migrating the sub-components, which is
  out of spec scope. Plan migrates only the rolls-own `<button>` elements: Copy, Save, Save
  to List (with the savedToList success span), and the mobile overflow trigger button. Adds
  a scope note in Step 2.
→ To verify: Read `PrayerResponse.tsx`. Confirm `ReadAloudButton` and `ShareButton` are
  imported from sibling component files (lines 17 and 20).
→ If wrong (user intends to migrate the sub-components too): Defer to a follow-up spec —
  `ReadAloudButton` and `ShareButton` have their own test suites, their own consumers (verse
  share page, classic prayers section) and would need a wider audit.

[UNVERIFIED] #3 — Violet-glow textarea exact opacity values vs. perceptual coherence.
→ Best guess: The spec's exact violet-glow values (border `violet-400/30`, bg `white/[0.04]`,
  shadow `rgba(167,139,250,0.18)` / `rgba(167,139,250,0.10)`, focus border `violet-400/60`,
  focus ring `violet-400/30`, placeholder `white/40`) are taken verbatim from the spec. They
  are NEW — no recon snapshot exists. Per spec § Design Notes, the textarea is intended to
  read as "a frosted writing surface, consistent with the cards around it" with `bg-white/[0.04]`
  matching the FrostedCard subdued surface (which is actually `bg-white/[0.05]` in source —
  close but not exactly identical). The 0.04 value is an intentional choice in the spec.
→ To verify: After Step 1 lands, capture `/daily?tab=pray` (focused + unfocused) at 1440px
  and 375px and compare to FrostedCard default tier surfaces in the same view. The textarea
  should read as "of the same family" — slightly quieter than default cards (0.04 vs 0.07
  bg-white) but with the violet glow standing in for the FrostedCard's frosted-base shadow.
→ If wrong (textarea reads as out-of-system once placed in context): Adjust the bg-white
  opacity to 0.05 (subdued match) or 0.07 (default match). Keep border + shadow violet
  values — the violet glow is the load-bearing affordance. Update both PrayerInput and
  JournalInput in lockstep so they remain identical. Re-verify against the FrostedCard
  default tier in the same screen.
```

### Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Should the JournalInput Save Entry button bind `isLoading`? | NO — bind only `disabled={!text.trim()}` | Save is synchronous today (no async state). Adding fake `isSaving` state would be premature; if persistence becomes async in a future spec it can opt into `isLoading` then. See [UNVERIFIED] #1. |
| Should `ReadAloudButton` and `ShareButton` migrate to subtle variant? | NO — out of scope | They are separate sub-components with their own tests/consumers. Migrating them would expand scope significantly. Plan flags this in Step 2 and recommends a follow-up spec. See [UNVERIFIED] #2. |
| Should the post-prayer reflection buttons ("It resonated", "Something different", "Journal about this") migrate? | NO — out of scope | Spec § 1.5 explicitly enumerates "Copy / Read Aloud / Save / Share" — the reflection buttons are not in the list. Plan flags this in Step 2 as scope clarification. |
| Should the GuidedPrayerSection FrostedCard className preserve `sm:w-auto sm:min-w-0`? | YES — REQUIRED | Without these, the 220px fixed mobile-carousel width persists on tablet+ and breaks the `sm:grid sm:grid-cols-2 lg:grid-cols-4` desktop grid. Spec's recommended className omits these; plan adds them back. |
| Should the Journal Guided/Free Write toggle change semantic structure to match DailyHub tablist? | NO — preserve `aria-pressed` toggle pattern | Spec § 3.1 explicitly: "Don't change semantic patterns. Only the class strings change." The DailyHub tab bar uses `role="tablist"` because it switches view content via `?tab=` query param; the Journal toggle is a local mode toggle (Guided vs Free Write) — `aria-pressed` is the correct pattern. |
| Should "Try a different prompt" link migrate to Button ghost? | YES, conditionally — it's currently a rolls-own `<button>` | Spec § 3.2: "refresh to `<Button variant="ghost" size="sm">` if it's currently a button". Source confirms it IS a `<button>` (line 213–222 of JournalInput.tsx) with rolls-own classes. Plan migrates. |
| Should the SavedEntriesList Cancel button on SaveToPrayerListForm migrate to Button ghost? | YES — `<Button variant="ghost">` matches the soft-text-link idiom | Current Cancel uses `text-white/60 hover:text-white` text-link pattern. Migrating to `<Button variant="ghost" size="sm">` preserves the soft-action visual idiom (no pill chrome) while picking up the standard focus ring and 44px touch target. |
| Should the inner Title input on SaveToPrayerListForm migrate to violet-glow? | NO — out of scope | Spec § 1.7 limits the migration to the form wrapper + Save/Cancel buttons. The Title input, category pills, inner CrisisBanner stay rolls-own. |
| Should the deprecated white-glow class string be removed from `09-design-system.md` § "Textarea Glow Pattern"? | YES — replace it with the violet-glow pattern as canonical | Spec § Change 3. The white-glow pattern is moved to the "Deprecated Patterns" table. The "Daily Experience Components" entries for `PrayerInput.tsx` and `JournalInput.tsx` are updated to say "violet textarea glow". |

---

## Implementation Steps

### Step 1: Migrate PrayerInput — violet-glow textarea + gradient "Help Me Pray" + subtle quick-prompt chips

**Objective:** Replace the white-glow textarea class string with the violet-glow pattern; replace the rolls-own homepage-primary "Help Me Pray" white pill with `<Button variant="gradient" size="lg" isLoading={isLoading}>`; refresh each quick-prompt chip from rolls-own pill to `<Button variant="subtle" size="sm">`.

**Files to create/modify:**

- `frontend/src/components/daily/PrayerInput.tsx` — apply the three migrations.

**Details:**

1. Add `import { Button } from '@/components/ui/Button'` near the top of the file (alongside the existing Lucide and `CrisisBanner` imports).

2. **Textarea (line 137).** Replace the existing className verbatim:

   FROM:
   ```
   w-full resize-y min-h-[200px] max-h-[500px] rounded-lg border border-white/30 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
   ```

   TO:
   ```
   w-full resize-y min-h-[200px] max-h-[500px] rounded-lg border border-violet-400/30 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
   ```

   Preserve `id="pray-textarea"`, `ref={textareaRef}`, `value={text}`, `onChange`, `placeholder="Start typing here..."`, `maxLength={500}`, `rows={8}`, and all aria attributes (`aria-label`, `aria-describedby`, `aria-invalid`).

3. **Quick-prompt chip row (lines 110–122).** Replace each rolls-own `<button>` with `<Button variant="subtle" size="sm" type="button">`. The chip array map iterates `DEFAULT_PRAYER_CHIPS` from `@/constants/daily-experience`. Final structure:

   ```tsx
   {showChips && (
     <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
       {DEFAULT_PRAYER_CHIPS.map((chip) => (
         <Button
           key={chip}
           variant="subtle"
           size="sm"
           type="button"
           onClick={() => handleChipClick(chip)}
         >
           {chip}
         </Button>
       ))}
     </div>
   )}
   ```

   Remove the rolls-own className `min-h-[44px] shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition-[colors,transform] duration-fast hover:border-primary hover:text-primary active:scale-[0.98]` — the subtle variant absorbs all of this.

4. **"Help Me Pray" submit button (lines 165–174).** Replace the rolls-own `<button>` with:

   ```tsx
   <div className="text-center">
     <Button
       variant="gradient"
       size="lg"
       type="button"
       onClick={handleSubmit}
       disabled={isLoading}
       isLoading={isLoading}
     >
       Help Me Pray
     </Button>
   </div>
   ```

   The existing prop is named `isLoading` (NOT `isSubmitting` as the spec example shows). Bind to that. Remove the rolls-own className (`inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] ...`) — Button gradient lg absorbs all of this.

   `type="button"` is explicit (matching existing behavior) — the form submit handler is on the parent component.

**Auth gating:** N/A for this step — typing and chip clicks are unauthenticated; the "Help Me Pray" submit's auth gate (if applicable) lives in the parent `PrayTabContent.handleSubmit` callback, not in this component. No changes here.

**Responsive behavior:**

- Desktop (1440px): Chip row centers on a single horizontal row; textarea fills `max-w-2xl` container width; "Help Me Pray" centers below.
- Tablet (768px): Same as desktop; chip count and width fit on one row.
- Mobile (375px): Chip row may wrap to 2 rows via `flex-wrap` (acceptable per Inline Element Position Expectations table).

**Inline position expectations (this step renders an inline-row layout):**

- Quick-prompt chips share y-coordinate ±5px at 1440px and 768px. Wrapping below 640px is acceptable.

**Guardrails (DO NOT):**

- Do NOT change `id="pray-textarea"`, `ref={textareaRef}`, `aria-label`, `aria-describedby`, `aria-invalid`, `maxLength`, `rows`, or `placeholder`.
- Do NOT remove the `showChips = !selectedChip && !text` conditional render.
- Do NOT remove the `motion-safe:animate-fade-in` on the "Draft saved" indicator (line 149).
- Do NOT touch `useEffect` blocks for draft autosave, retry-prompt focus, or initial-text sync.
- Do NOT remove the `CrisisBanner` (line 156).
- Do NOT remove the `nudge` error message (line 158–162).
- Do NOT remove the `CharacterCount` component (line 142–144).
- Do NOT introduce a new ARIA role on the chip container (it currently has none — the chips are equivalent to a flex-wrapped row of buttons, not a role-grouped widget).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing `PrayTabContent.test.tsx` behavioral tests | integration | Verify they continue to pass unchanged (chips render, clicking inserts text, textarea is rendered, submit fires onSubmit). |
| (new — only if missing) "Help Me Pray button uses gradient variant" | unit | Append to `PrayTabContent.test.tsx` if no existing assertion: render PrayTabContent, find the submit button, assert `aria-busy` is set when `isLoading` is true. |
| (only if existing class-string assertion exists) update textarea class assertion | unit | If `PrayTabContent.test.tsx` asserts the white-glow string, update to assert `border-violet-400/30` + `bg-white/[0.04]` substrings. Per recon, no such assertion exists today — verify before adding. |

**Expected state after completion:**

- [ ] `PrayerInput.tsx` imports `Button` from `@/components/ui/Button`.
- [ ] Textarea uses the violet-glow class string verbatim.
- [ ] Quick-prompt chips render as `<Button variant="subtle" size="sm" type="button">` with the existing `onClick` and key.
- [ ] "Help Me Pray" submit renders as `<Button variant="gradient" size="lg" type="button" onClick={handleSubmit} disabled={isLoading} isLoading={isLoading}>`.
- [ ] No rolls-own pill className strings remain in the file (verify via `grep 'rounded-full bg-white' PrayerInput.tsx` returning empty).
- [ ] All preserved logic intact: voice mic absolute positioning anchor (which is set up in `JournalInput.tsx`, not here — PrayerInput has no voice mic); draft autosave; crisis banner; chip-conditional render; nudge error.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test --run PrayTabContent` passes with no new failures.

---

### Step 2: Migrate PrayerResponse — accent FrostedCard for generated prayer + subtle Button on action row

**Objective:** Replace the rolls-own generated-prayer card chrome with `<FrostedCard variant="accent" eyebrow="Your prayer">`; refresh the four rolls-own action buttons (Copy, Save, Save to List + Saved success state, Mobile overflow trigger) to `<Button variant="subtle" size="sm">`. **`ReadAloudButton` and `ShareButton` sub-components are out of scope per [UNVERIFIED] #2 — they are NOT migrated by this spec.** **The post-prayer reflection buttons ("It resonated" / "Something different" / "Journal about this") are NOT in the spec's enumeration and stay rolls-own.**

**Files to create/modify:**

- `frontend/src/components/daily/PrayerResponse.tsx` — apply both migrations.

**Details:**

1. Add imports:
   ```tsx
   import { Button } from '@/components/ui/Button'
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   ```

2. **Generated prayer card (lines 207–246).** Currently:
   ```tsx
   {prayer && !isLoading && (
     <div className="motion-safe:animate-fade-in" aria-live="polite">
       <p className="mb-2 text-sm font-medium text-white/50">
         Your prayer:
       </p>
       <div className="mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6">
         {/* sr-only span + aria-hidden KaraokeText / KaraokeTextReveal */}
       </div>
       ...
     </div>
   )}
   ```

   Refactor:
   ```tsx
   {prayer && !isLoading && (
     <div className="motion-safe:animate-fade-in" aria-live="polite">
       <FrostedCard
         as="article"
         variant="accent"
         eyebrow="Your prayer"
         className="mb-6"
       >
         <span className="sr-only">{prayer.text}</span>
         <div aria-hidden="true">
           {revealComplete ? (
             <KaraokeText
               text={prayer.text}
               currentWordIndex={prayerWordIndex}
               className="font-serif text-lg leading-relaxed text-white/80"
             />
           ) : (
             <KaraokeTextReveal
               text={prayer.text}
               msPerWord={80}
               forceComplete={forceRevealComplete}
               onRevealComplete={() => setRevealComplete(true)}
               className="font-serif text-lg leading-relaxed text-white/80"
             />
           )}
         </div>
       </FrostedCard>
       ...
     </div>
   )}
   ```

   - Remove the `<p className="mb-2 text-sm font-medium text-white/50">Your prayer:</p>` line — its function is now served by the FrostedCard's eyebrow prop.
   - Remove the rolls-own card wrapper `<div className="mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6">`.
   - Apply `eyebrow="Your prayer"` (no `eyebrowColor` — accent variant defaults to violet automatically).
   - The `as="article"` semantic is appropriate (a generated prayer is article content).
   - The `className="mb-6"` preserves the bottom margin.
   - All inner content (sr-only span, KaraokeText/KaraokeTextReveal) is preserved verbatim.

3. **Action button row — Copy (lines 275–283).** Currently a rolls-own pill `<button>`. Replace:
   ```tsx
   <Button
     variant="subtle"
     size="sm"
     type="button"
     onClick={handleCopy}
     aria-label="Copy prayer"
   >
     <Copy className="h-4 w-4" aria-hidden="true" />
     <span className="hidden sm:inline">Copy</span>
   </Button>
   ```

4. **Action button row — Save (lines 295–303).** Currently a rolls-own pill `<button>`. Replace:
   ```tsx
   <Button
     variant="subtle"
     size="sm"
     type="button"
     onClick={handleSave}
     aria-label="Save prayer"
   >
     <Bookmark className="h-4 w-4" aria-hidden="true" />
     <span className="hidden sm:inline">Save</span>
   </Button>
   ```

   The existing auth-modal call inside `handleSave` (`if (!isAuthenticated) authModal?.openAuthModal('Sign in to save your prayers')`) is preserved verbatim — only the Button chrome changes.

5. **Action button row — Save to List (lines 306–321).** Currently has two branches (`!savedToList` → button; `savedToList` → success span). Replace:
   ```tsx
   {!savedToList ? (
     <Button
       variant="subtle"
       size="sm"
       type="button"
       onClick={handleSaveToList}
       aria-label="Save to prayer list"
     >
       <ListPlus className="h-4 w-4" aria-hidden="true" />
       <span className="hidden sm:inline">Save to List</span>
     </Button>
   ) : (
     <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/[0.12] px-4 py-2 text-sm text-success backdrop-blur-sm">
       <Check className="h-4 w-4" aria-hidden="true" />
       <span className="hidden sm:inline">Saved</span>
     </span>
   )}
   ```

   The success span keeps its rolls-own structure but adopts the same visual surface as the subtle Button (a non-interactive informational pill — Button has no "saved success" variant, so a `<span>` with the same surface tokens is the right fit). The `text-success` color override remains.

6. **Action button row — Mobile overflow menu trigger (lines 326–333).** Replace:
   ```tsx
   <Button
     variant="subtle"
     size="sm"
     type="button"
     onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
     aria-label="More actions"
     aria-expanded={mobileMenuOpen}
   >
     <MoreHorizontal className="h-4 w-4" />
   </Button>
   ```

   The wrapping `<div ref={mobileMenuRef} className="relative sm:hidden">` is preserved (it scopes the dropdown menu's positioning) — only the inner trigger `<button>` migrates.

7. **`ReadAloudButton`, `ShareButton`, post-prayer reflection buttons, "Skip" link, audio "Change"/"Stop" links, mobile overflow menu items, classic prayer card buttons (dead-coded behind `false &&`)** — DO NOT TOUCH. Out of scope per spec § 1.5 enumeration and per [UNVERIFIED] #2.

**Auth gating:**

- Save button → existing `handleSave` auth gate preserved verbatim (`authModal?.openAuthModal('Sign in to save your prayers')`).
- Save to List button → existing `handleSaveToList` auth gate preserved verbatim (`authModal?.openAuthModal('Sign in to save prayers to your list.')`).
- Copy button → no auth gate (read-only).
- Mobile overflow trigger → no auth gate (UI-only).

**Responsive behavior:**

- Desktop (1440px): Action button row inline (Copy + ReadAloudButton + Save + Save to List + ShareButton). Mobile overflow menu hidden via `sm:hidden`.
- Tablet (768px): Same as desktop; 5 buttons inline.
- Mobile (375px): Action button row shows Copy + ReadAloudButton + Save + Save to List + Mobile overflow trigger (which expands a dropdown with Save to List + Share menu items). Text labels collapse to icon-only via `<span className="hidden sm:inline">…</span>` — Button subtle size sm with icon-only is ~36px wide, comfortably fits.

**Inline position expectations:**

- Action button row at desktop/tablet: 5 buttons share y ±5px on a single row. At mobile, ±5px y on the row of 5 buttons (Copy + ReadAloud + Save + SaveToList + overflow trigger). Mobile may wrap to 2 rows on very narrow phones (<340px); ±5px y within each row.

**Guardrails (DO NOT):**

- Do NOT migrate `ReadAloudButton`, `ShareButton`, or the post-prayer reflection buttons — out of scope.
- Do NOT remove the `<span className="sr-only">{prayer.text}</span>` — accessibility-critical for screen readers during the karaoke reveal.
- Do NOT remove the `aria-hidden="true"` wrapper around the karaoke text — pairs with the sr-only span.
- Do NOT change `motion-safe:animate-fade-in`, `aria-live="polite"`, or any KaraokeText/KaraokeTextReveal props.
- Do NOT change the `revealComplete` / `forceRevealComplete` / `reflectionVisible` / `reflectionDismissed` / `resonatedMessage` / `resonatedFading` / `sectionFading` / `saveToListOpen` / `savedToList` / `mobileMenuOpen` / `classicOpen` / `classicReadAloudId` / `classicWordIndex` state hooks.
- Do NOT touch `useEffect` blocks (mobile menu outside-click, reflection visibility timer).
- Do NOT remove the audio sound indicator block (lines 248–271) — that's the "Sound: The Upper Room" line.
- Do NOT touch the `SaveToPrayerListForm` mount (line 374–387) — Step 4 handles its internal migration.
- Do NOT delete the dead-coded classic prayers section (`{false && (...)}`) — it stays as documented dead code per existing convention (line 463–503, plus the `ClassicPrayerCard` component at line 508–550).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing `PrayTabContent.test.tsx` behavioral tests | integration | Verify they continue to pass unchanged (prayer renders, action buttons fire callbacks, save triggers auth modal when unauthed). |
| (only if existing assertion) update generated-prayer card class assertion | unit | If any test asserts `bg-white/[0.06]` or `rounded-2xl` on the prayer card, update to assert `bg-violet-500/[0.08]` + `border-violet-400/70` + the eyebrow text "Your prayer". Verify before adding. |

**Expected state after completion:**

- [ ] `PrayerResponse.tsx` imports `Button` and `FrostedCard`.
- [ ] Generated prayer card uses `<FrostedCard as="article" variant="accent" eyebrow="Your prayer" className="mb-6">`.
- [ ] The `<p className="mb-2 text-sm font-medium text-white/50">Your prayer:</p>` line is removed (eyebrow replaces it).
- [ ] Copy, Save, Save to List action buttons use `<Button variant="subtle" size="sm">`.
- [ ] Saved success span uses the matching frosted-pill surface (`bg-white/[0.07] border-white/[0.12] backdrop-blur-sm`).
- [ ] Mobile overflow trigger uses `<Button variant="subtle" size="sm">`.
- [ ] `ReadAloudButton`, `ShareButton`, post-prayer reflection buttons unchanged.
- [ ] Existing auth gates inside `handleSave` and `handleSaveToList` preserved verbatim.
- [ ] All preserved logic intact: KaraokeText reveal, Skip link, audio sound indicator, mobile menu outside-click, dead-coded classic prayers.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test --run PrayTabContent` passes with no new failures.

---

### Step 3: Migrate GuidedPrayerSection — 8 cards to FrostedCard default (preserving carousel layout)

**Objective:** Replace each of the 8 rolls-own card `<button>` elements with `<FrostedCard as="button" variant="default" onClick={...}>`, **preserving the `sm:w-auto sm:min-w-0` reset that lets the desktop grid render correctly.**

**Files to create/modify:**

- `frontend/src/components/daily/GuidedPrayerSection.tsx` — apply the migration.

**Details:**

1. Add `import { FrostedCard } from '@/components/homepage/FrostedCard'` at the top.

2. **8-card map (lines 55–88).** Currently each card is a rolls-own `<button>` with the entire 4-line className. Replace each with:

   ```tsx
   <FrostedCard
     key={session.id}
     as="button"
     variant="default"
     onClick={() => handleCardClick(session)}
     className="relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center sm:w-auto sm:min-w-0 sm:min-h-[260px] text-left"
   >
     {isComplete && (
       <CheckCircle2
         className="absolute right-3 top-3 h-4 w-4 text-success"
         aria-hidden="true"
       />
     )}

     {ThemeIcon && (
       <ThemeIcon className="mb-3 h-8 w-8 text-primary" aria-hidden="true" />
     )}

     <h3 className="font-semibold text-base text-white">{session.title}</h3>

     <p className="mt-1 text-sm leading-relaxed text-white/70 flex-1">
       {session.description}
     </p>

     <span className="mt-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
       {session.durationMinutes} min
     </span>
   </FrostedCard>
   ```

   **Critical layout notes:**
   - The className override carries `sm:w-auto sm:min-w-0` — without these, the carousel's 220px fixed width persists on tablet+ and breaks the `sm:grid sm:grid-cols-2 lg:grid-cols-4` parent grid (line 54). The spec's recommended className OMITS these — plan ADDS them back.
   - `text-left` is preserved on the className override since FrostedCard's default styling does not enforce text alignment, and the cards left-align internally.
   - `relative` is preserved for the absolute-positioned CheckCircle2 (line 67–70 of original).
   - The dropped classes (absorbed by FrostedCard default variant): `rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.10] hover:border-white/20 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]`. FrostedCard default provides equivalent or superior treatment for all of these (rounded-3xl instead of rounded-2xl is the only delta — decorative, not load-bearing).
   - The dropped `hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]` is replaced by FrostedCard's `hover:shadow-frosted-hover` token shipped in the pilot.
   - The focus ring shifts from `ring-primary ring-offset-hero-bg` (rolls-own) to `ring-white/50` (FrostedCard internal) — slightly different visual but equally accessible.

3. **Auth-gate logic (lines 38–44).** Preserved verbatim:
   ```tsx
   const handleCardClick = (session: GuidedPrayerSession) => {
     if (!isAuthenticated) {
       authModal?.openAuthModal('Sign in to start a guided prayer session')
       return
     }
     onStartSession(session)
   }
   ```

   The migration changes the visual chrome around the click target only — the click handler is forwarded via FrostedCard's `onClick` prop, which forwards directly to the underlying `<button>` element (verified in `FrostedCard.tsx` lines 62–66).

4. **`isComplete` check + CheckCircle2 + ThemeIcon + title + description + duration pill** — all preserved verbatim inside the FrostedCard children.

**Auth gating:**

- FrostedCard `onClick={() => handleCardClick(session)}` → existing auth modal (`Sign in to start a guided prayer session`) for unauthenticated users.

**Responsive behavior:**

- Desktop (1440px): 4-column grid (`lg:grid-cols-4 lg:gap-5`). Cards span the full grid cell width via `sm:w-auto sm:min-w-0`.
- Tablet (768px): 2-column grid (`sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible`). Same width reset.
- Mobile (375px): Horizontal carousel (`flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4`). Cards are `w-[220px] min-w-[220px] flex-shrink-0 snap-center`.

**Inline position expectations:**

- 4-card row at 1440px: all 4 cards share y ±5px. 2-card row at 768px: pairs share y ±5px. Mobile carousel is single-row (horizontal-scroll), no y-alignment concern.

**Guardrails (DO NOT):**

- Do NOT remove `sm:w-auto sm:min-w-0` from the className override — this is the carousel-vs-grid switching mechanism.
- Do NOT touch the parent `<section aria-labelledby="guided-prayer-heading" id="guided-prayer-section">` (line 47).
- Do NOT touch the parent `<h2 id="guided-prayer-heading">` (line 48–53).
- Do NOT touch the parent flex/grid container (line 54): `mt-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-5`.
- Do NOT change `useAuth`, `useAuthModal`, `useCompletionTracking`.
- Do NOT change `ICON_COMPONENTS` lookup.
- Do NOT change `GUIDED_PRAYER_SESSIONS` data import.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing `GuidedPrayerSection.test.tsx` behavioral tests | integration | Verify they continue to pass (renders 8 cards, click navigates, auth modal triggers when unauthed, CheckCircle2 renders for completed sessions). |
| (only if existing assertion) update card class assertions | unit | If any test asserts `bg-white/[0.06]` or `border-white/[0.12]` directly on the card, update to assert FrostedCard default variant classes (`bg-white/[0.07]`, `border-white/[0.12]`). Per recon, no such assertion exists today — verify before adding. |

**Expected state after completion:**

- [ ] `GuidedPrayerSection.tsx` imports `FrostedCard`.
- [ ] All 8 cards render as `<FrostedCard as="button" variant="default" onClick={...} className="relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center sm:w-auto sm:min-w-0 sm:min-h-[260px] text-left">`.
- [ ] No rolls-own `bg-white/[0.06]` or `border-white/[0.12]` class strings on the card buttons (verify via grep in this file).
- [ ] Mobile carousel layout works (220px fixed width, snap-center).
- [ ] Tablet/desktop grid layout works (`sm:w-auto` reset takes effect).
- [ ] Auth gate preserved.
- [ ] CheckCircle2 absolute positioning works (FrostedCard root has `relative` from the className override).
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test --run GuidedPrayerSection` passes with no new failures.

---

### Step 4: Migrate SaveToPrayerListForm — subdued FrostedCard wrapper + subtle Save + ghost Cancel

**Objective:** Replace the rolls-own form wrapper with `<FrostedCard variant="subdued">`; refresh Save button from `bg-primary` solid pill to `<Button variant="subtle">`; refresh Cancel from text-link to `<Button variant="ghost">`.

**Files to create/modify:**

- `frontend/src/components/daily/SaveToPrayerListForm.tsx` — apply the migration.

**Details:**

1. Add imports:
   ```tsx
   import { Button } from '@/components/ui/Button'
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   ```

2. **Form wrapper (line 58).** Currently:
   ```tsx
   <div className="mt-4 rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm">
   ```

   Replace with:
   ```tsx
   <FrostedCard as="div" variant="subdued" className="mt-4">
   ```

   The FrostedCard subdued variant has `p-5` default padding (vs the rolls-own `p-4`); the className override does NOT include `p-4` because FrostedCard's `p-5` is appropriate for a nested form (`p-5` reads as more accommodating than `p-4` for inputs/labels). The compactness comes from the form's inner content density, not from container padding.

3. **Save button (lines 98–110).** Currently `bg-primary` solid pill. Replace:
   ```tsx
   <Button
     variant="subtle"
     size="md"
     type="button"
     onClick={handleSave}
     disabled={!category}
   >
     Save
   </Button>
   ```

   The disabled state is preserved via `disabled={!category}`. Button subtle has `disabled:cursor-not-allowed disabled:opacity-50` from the shared base, which provides equivalent styling to the rolls-own `cursor-not-allowed bg-white/20`. The visual treatment shifts from `bg-primary` (solid purple, very visible) to subtle (frosted, quiet) — this is the spec's explicit choice (see Edge Cases & Decisions table).

4. **Cancel button (lines 111–117).** Currently a text-link `<button>`. Replace:
   ```tsx
   <Button
     variant="ghost"
     size="sm"
     type="button"
     onClick={onCancel}
   >
     Cancel
   </Button>
   ```

   Ghost variant uses `text-primary hover:bg-primary/5` and `h-9 px-3 text-sm` — note this differs from the existing `text-white/60 hover:text-white` (white-leaning text-link). The spec explicitly asks for ghost variant; ghost uses `text-primary` (purple). This is a visual shift from white text to purple text, but it remains the soft-action idiom (no pill chrome, just text + minimal hover). [If user prefers white text, keep the rolls-own `<button>` with the existing classes — but spec § 1.7 explicitly says "align it with `ghost` for consistency".]

5. **Title input (lines 66–74), Category pills (lines 80–95), Inner CrisisBanner (line 76)** — DO NOT TOUCH. Out of scope per spec § 1.7.

**Auth gating:** N/A for this step — the form only renders for authenticated users (gated upstream by `PrayerResponse.handleSaveToList`).

**Responsive behavior:**

- Desktop (1440px): Form wrapper centers within `max-w-2xl` parent. Save + Cancel inline at `mt-4 flex items-center gap-3`.
- Tablet (768px): Same as desktop.
- Mobile (375px): Same flex row; both buttons fit on one row given the short labels.

**Inline position expectations:**

- Save + Cancel buttons share y ±5px at every breakpoint.

**Guardrails (DO NOT):**

- Do NOT change `extractDefaultTitle` utility (lines 18–23).
- Do NOT change the `useState`, `useCallback`, `addPrayer`, `useToast` imports/calls.
- Do NOT change `<h4>` heading (line 59–61).
- Do NOT change Title `<input>` (lines 66–74).
- Do NOT change inner `CrisisBanner` (line 76).
- Do NOT change Category label (line 78) or Category pills (lines 79–95).
- Do NOT alter `verseContext` prop forwarding.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing `SaveToPrayerListForm.test.tsx` behavioral tests | integration | Verify they continue to pass (form renders, title prefilled, category selection, Save fires `addPrayer`, Cancel fires `onCancel`, prayer-limit toast on overflow). |
| (only if existing class assertion) update wrapper class | unit | If any test asserts `rounded-lg` or `bg-white/[0.06]` on the form wrapper, update to FrostedCard subdued (`bg-white/[0.05]`, `border-white/[0.10]`, `rounded-3xl`). Per recon, no such assertion exists — verify before adding. |

**Expected state after completion:**

- [ ] `SaveToPrayerListForm.tsx` imports `Button` and `FrostedCard`.
- [ ] Form wrapper uses `<FrostedCard as="div" variant="subdued" className="mt-4">`.
- [ ] Save button uses `<Button variant="subtle" size="md" disabled={!category}>`.
- [ ] Cancel button uses `<Button variant="ghost" size="sm">`.
- [ ] Title input, category pills, inner CrisisBanner unchanged.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test --run SaveToPrayerListForm` passes with no new failures.

---

### Step 5: Migrate JournalTabContent draft-conflict dialog — default FrostedCard + 2 subtle buttons

**Objective:** Replace the rolls-own draft-conflict dialog wrapper with `<FrostedCard variant="default">`; refresh both action buttons ("Start fresh" + "Keep my current draft") to `<Button variant="subtle" size="md">`. Preserve `role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title"` and the `autoFocus` on "Keep my current draft".

**Files to create/modify:**

- `frontend/src/components/daily/JournalTabContent.tsx` — apply the migration to lines 311–342.

**Details:**

1. Add imports (near the top of the file):
   ```tsx
   import { Button } from '@/components/ui/Button'
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   ```

2. **Draft conflict dialog (lines 311–342).** Currently:
   ```tsx
   {draftConflictPending && prayContext?.from === 'devotional' && (
     <div
       role="dialog"
       aria-modal="true"
       aria-labelledby="draft-conflict-title"
       className="mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]"
     >
       <h3 id="draft-conflict-title" className="mb-2 text-lg font-semibold text-white">
         You have an unsaved draft
       </h3>
       <p className="mb-4 text-sm text-white/80">
         Would you like to start fresh with today's devotional prompt, or keep working on your current draft?
       </p>
       <div className="flex flex-wrap gap-3">
         <button
           type="button"
           onClick={handleStartFresh}
           className="min-h-[44px] rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
         >
           Start fresh
         </button>
         <button
           type="button"
           onClick={handleKeepDraft}
           className="min-h-[44px] rounded-lg border border-white/[0.12] bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
           autoFocus
         >
           Keep my current draft
         </button>
       </div>
     </div>
   )}
   ```

   Replace with:
   ```tsx
   {draftConflictPending && prayContext?.from === 'devotional' && (
     <FrostedCard
       as="div"
       variant="default"
       className="mb-6"
     >
       <div role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title">
         <h3 id="draft-conflict-title" className="mb-2 text-lg font-semibold text-white">
           You have an unsaved draft
         </h3>
         <p className="mb-4 text-sm text-white/80">
           Would you like to start fresh with today's devotional prompt, or keep working on your current draft?
         </p>
         <div className="flex flex-wrap gap-3">
           <Button
             variant="subtle"
             size="md"
             type="button"
             onClick={handleStartFresh}
           >
             Start fresh
           </Button>
           <Button
             variant="subtle"
             size="md"
             type="button"
             onClick={handleKeepDraft}
             autoFocus
           >
             Keep my current draft
           </Button>
         </div>
       </div>
     </FrostedCard>
   )}
   ```

   **Critical notes:**
   - FrostedCard `as="div"` takes a `<div>` host. The `role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title"` ARIA attributes need a stable host element. FrostedCard does NOT forward arbitrary props (no `...rest` spread on the host). To preserve the dialog ARIA, **wrap the dialog content in an inner `<div role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title">` inside the FrostedCard children**. The visual chrome (frosted glass card) stays on FrostedCard; the dialog semantics live on the inner div.
   - `autoFocus` on the second Button is preserved verbatim — Button forwards arbitrary HTML attributes via `...props` (verified in `Button.tsx` lines 38, 84, 110).
   - The dropped custom shadow (`shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`) is replaced by FrostedCard default's `shadow-frosted-base`. Visual delta: the rolls-own had a slight purple cast; FrostedCard default is more neutral. Acceptable per spec (visual coherence with surrounding default-tier cards).

3. **`handleStartFresh` and `handleKeepDraft` handlers** — preserved verbatim. They are defined elsewhere in `JournalTabContent.tsx` (likely near the top with the other state/handlers). Step 5 does NOT touch them.

**Auth gating:** N/A — dialog only renders for users with conflicting drafts (gated upstream).

**Responsive behavior:**

- Desktop (1440px): Dialog full-width within `max-w-2xl` parent. Two buttons inline.
- Tablet (768px): Same as desktop.
- Mobile (375px): Two buttons may wrap to 2 rows via `flex-wrap` if labels are wide. Acceptable (already happens in current implementation).

**Inline position expectations:**

- "Start fresh" + "Keep my current draft" share y ±5px at desktop/tablet. Mobile may wrap.

**Guardrails (DO NOT):**

- Do NOT change `draftConflictPending` state hook or `prayContext?.from === 'devotional'` conditional render.
- Do NOT change the `<h3 id="draft-conflict-title">` or the descriptive `<p>`.
- Do NOT change `handleStartFresh` or `handleKeepDraft` callbacks.
- Do NOT remove `autoFocus` from the second button.
- Do NOT remove the `role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title"` ARIA — preserved on the inner `<div>` inside FrostedCard.
- Do NOT touch other parts of `JournalTabContent.tsx` (the `VersePromptCard` mount at line 346+, the JournalInput mount, the SavedEntriesList mount).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing `JournalTabContent.test.tsx` draft-conflict tests | integration | Verify they continue to pass (dialog renders when draft conflict, "Start fresh" calls handleStartFresh, "Keep my current draft" has autoFocus and calls handleKeepDraft, ARIA attributes set). |
| (only if existing class assertion) update dialog wrapper class | unit | If any test asserts the rolls-own custom shadow string, update to FrostedCard default. Per recon, unlikely — verify. |

**Expected state after completion:**

- [ ] `JournalTabContent.tsx` imports `Button` and `FrostedCard` (if not already from earlier steps in this batch).
- [ ] Draft conflict dialog uses `<FrostedCard as="div" variant="default" className="mb-6">` with an inner `<div role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title">` carrying the dialog ARIA.
- [ ] Both action buttons use `<Button variant="subtle" size="md">`.
- [ ] `autoFocus` preserved on "Keep my current draft".
- [ ] Existing handlers preserved.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test --run JournalTabContent` passes with no new failures.

---

### Step 6: Migrate JournalInput — violet-glow textarea + tab-bar-style toggle + subtle voice mic + gradient Save Entry + ghost "Try a different prompt"

**Objective:** Apply five migrations to `JournalInput.tsx`: violet-glow textarea, Guided/Free Write toggle visual alignment, voice mic to subtle Button, "Save Entry" to gradient Button, "Try a different prompt" to ghost Button.

**Files to create/modify:**

- `frontend/src/components/daily/JournalInput.tsx` — apply all five migrations.

**Details:**

1. Add `import { Button } from '@/components/ui/Button'` near the top of the file.

2. **Guided/Free Write toggle (lines 162–192).** Currently:
   ```tsx
   <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
     <div className="inline-flex rounded-lg border border-white/10" role="group" aria-label="Journal mode">
       <button
         type="button"
         onClick={() => onModeChange('guided')}
         className={cn(
           'min-h-[44px] rounded-l-lg px-4 py-2 text-sm font-medium transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
           mode === 'guided'
             ? 'bg-primary/20 text-white'
             : 'bg-white/10 text-white/70 hover:bg-white/15',
         )}
         aria-pressed={mode === 'guided'}
       >
         Guided
       </button>
       <button
         type="button"
         onClick={() => onModeChange('free')}
         className={cn(
           'min-h-[44px] rounded-r-lg px-4 py-2 text-sm font-medium transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
           mode === 'free'
             ? 'bg-primary/20 text-white'
             : 'bg-white/10 text-white/70 hover:bg-white/15',
         )}
         aria-pressed={mode === 'free'}
       >
         Free Write
       </button>
     </div>
   </div>
   ```

   Replace with:
   ```tsx
   <div className="mb-6 flex items-center justify-center">
     <div
       className="flex w-full max-w-xs rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md"
       role="group"
       aria-label="Journal mode"
     >
       <button
         type="button"
         onClick={() => onModeChange('guided')}
         aria-pressed={mode === 'guided'}
         className={cn(
           'min-h-[44px] flex-1 rounded-full text-sm font-medium transition-all duration-base motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
           mode === 'guided'
             ? 'bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]'
             : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
         )}
       >
         Guided
       </button>
       <button
         type="button"
         onClick={() => onModeChange('free')}
         aria-pressed={mode === 'free'}
         className={cn(
           'min-h-[44px] flex-1 rounded-full text-sm font-medium transition-all duration-base motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
           mode === 'free'
             ? 'bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]'
             : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
         )}
       >
         Free Write
       </button>
     </div>
   </div>
   ```

   **Critical notes:**
   - Outer wrapper: `mb-6 flex items-center justify-center` centers the toggle. The previous `flex-wrap items-center justify-center gap-3` is simplified — no other elements live in this row, so flex-wrap + gap is unneeded.
   - Inner toggle container: `flex w-full max-w-xs` — `w-full` would make the toggle stretch to the full container width (`max-w-2xl`), which is too wide for a 2-button toggle. `max-w-xs` (320px) caps the width to a comfortable size while still allowing `flex-1` on each button for equal sizing.
   - Both buttons share the base classes: `min-h-[44px] flex-1 rounded-full text-sm font-medium transition-all duration-base motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`.
   - Active branch: `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]` (matches DailyHub 1A active tab pill exactly).
   - Inactive branch: `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent` (matches DailyHub 1A inactive tab pill exactly).
   - `aria-pressed` toggle pattern preserved (NOT changed to `role="tab"` + `aria-selected`).
   - The `rounded-l-lg`/`rounded-r-lg` half-radius pattern is replaced by full `rounded-full` on each pill — they sit inside the rounded-full outer container with `p-1` padding, creating the inset-pill look from the DailyHub main tab bar.

3. **Guided prompt card (lines 204–225).** STAYS ROLLS-OWN — explicitly out of scope per spec § 3.2. Only the "Try a different prompt" link inside it migrates (next step).

4. **"Try a different prompt" button (lines 213–222).** Currently a rolls-own `<button>` with text-link styling. Replace:
   ```tsx
   <Button
     variant="ghost"
     size="sm"
     type="button"
     onClick={onTryDifferentPrompt}
     aria-label="New prompt"
   >
     <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
     Try a different prompt
   </Button>
   ```

   The wrapping `<div className="mt-2 text-center">` (line 211) is preserved (centers the button below the prompt card).

   Note: ghost variant uses `text-primary hover:bg-primary/5` (purple text on faint purple hover). The existing rolls-own had `text-white/50 hover:text-primary` (white text shifting to purple on hover). The visual shift is from white to purple text — spec § 3.2 explicitly requires ghost variant for consistency.

5. **Textarea (lines 266–280).** Replace the existing className verbatim:

   FROM:
   ```
   min-h-[200px] w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] px-4 pb-10 pt-3 text-lg leading-relaxed text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
   ```

   TO:
   ```
   min-h-[200px] w-full resize-none rounded-lg border border-violet-400/30 bg-white/[0.04] px-4 pb-10 pt-3 text-lg leading-relaxed text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
   ```

   Preserve `ref={textareaCallbackRef}`, `value`, `onChange`, `onInput` (auto-expand), `placeholder` (mode-conditional), `maxLength={JOURNAL_MAX_LENGTH}`, `rows={6}`, `aria-label`, `aria-describedby`.

6. **Voice mic button (lines 289–319).** Currently a rolls-own `<button>` with absolute positioning + 3-state conditional className. Replace:
   ```tsx
   {isAuthenticated && isVoiceSupported && (
     <Button
       variant="subtle"
       size="sm"
       type="button"
       onClick={handleVoiceToggle}
       disabled={isPermissionDenied}
       className={cn(
         'absolute bottom-2 right-2 min-w-[44px] !rounded-full !px-0',
         isPermissionDenied
           ? 'opacity-40'
           : isListening
             ? 'motion-safe:animate-mic-pulse !border-red-400/60 !bg-red-500/20 !text-red-400'
             : '',
       )}
       aria-label={
         isPermissionDenied
           ? 'Voice input unavailable — microphone access denied'
           : isListening
             ? 'Stop voice input'
             : 'Start voice input'
       }
     >
       {isListening ? (
         <>
           <MicOff className="h-5 w-5" />
           <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
         </>
       ) : (
         <Mic className="h-5 w-5" />
       )}
     </Button>
   )}
   ```

   **Critical notes on the className overrides:**
   - The voice mic is a square icon-only button (44×44px), but Button subtle size sm has `px-4 py-2 text-sm` (rectangular). Override with `!px-0 min-w-[44px] !rounded-full` to force it back to a square circle. The `!` important markers are needed because Button's subtle size sm `px-4 py-2 text-sm` has equal specificity.
   - Recording-state styling: `!border-red-400/60 !bg-red-500/20 !text-red-400` overrides the subtle variant's `bg-white/[0.07]` / `border-white/[0.12]` / `text-white` defaults. The `!` important markers ensure the recording state visually dominates.
   - The recording animation `motion-safe:animate-mic-pulse` is preserved — same as before.
   - The red dot indicator `<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />` (visible when listening) is preserved verbatim.
   - `disabled={isPermissionDenied}` triggers Button's built-in disabled styling (`disabled:cursor-not-allowed disabled:opacity-50`). The `opacity-40` override matches the rolls-own opacity for permission-denied (slightly more transparent than the default `opacity-50`).
   - `min-w-[44px]` enforces the 44×44 touch target (Button subtle has `min-h-[44px]` only).
   - The `flex items-center justify-center` is provided by Button's shared base — no need to override.

7. **"Save Entry" button (lines 337–344).** Currently a rolls-own homepage-primary white pill. Replace:
   ```tsx
   <div className="mb-8 text-center">
     <Button
       variant="gradient"
       size="lg"
       type="button"
       onClick={handleSave}
       disabled={!text.trim()}
     >
       Save Entry
     </Button>
   </div>
   ```

   **Per [UNVERIFIED] #1: do NOT bind `isLoading`.** There is no `isSaving` state in JournalInput; `handleSave` is synchronous; saves are too fast to need a spinner. Rely on `disabled={!text.trim()}` only.

**Auth gating:**

- Voice mic button → conditional render `isAuthenticated && isVoiceSupported` preserved verbatim.
- Save Entry button → existing `handleSave` auth gate preserved verbatim (line 141–147, conditional auth modal subtitle based on draft content).
- Toggle and "Try a different prompt" → no auth gate.

**Responsive behavior:**

- Desktop (1440px): Toggle centers within `max-w-2xl`, capped at `max-w-xs` (320px). Textarea full-width within `max-w-2xl`. Voice mic absolute bottom-right inside textarea wrapper. Save Entry centers below.
- Tablet (768px): Same as desktop.
- Mobile (375px): Toggle stays at `max-w-xs` (320px) — fits comfortably with side margins. Textarea fills container width. Voice mic remains absolute. Save Entry stays centered.

**Inline position expectations:**

- Guided/Free Write toggle: 2 pills always inline (`flex w-full` + `flex-1` per pill); never wraps.
- Voice mic: absolute-positioned, no inline-row concern.

**Guardrails (DO NOT):**

- Do NOT change the toggle's `aria-pressed` pattern to `role="tab"` + `aria-selected`. Spec § 3.1: "Don't change semantic patterns."
- Do NOT change `mode`, `onModeChange`, `currentPrompt`, `onTryDifferentPrompt`, `showPromptRefresh`, `prayContext`, `contextDismissed`, `onDismissContext`, `onSave`, `onTextareaRef`, `draftClearSignal` props.
- Do NOT touch the `useState`, `useRef`, `useCallback`, `useEffect` blocks for text state, draft autosave, voice input, draft clear signal, last-saved tracking.
- Do NOT touch the `useToast`, `useAuthModal`, `useAuth`, `useAnnounce`, `useUnsavedChanges`, `useVoiceInput` hook calls.
- Do NOT touch `<DevotionalPreviewPanel>` mount (line 195–200).
- Do NOT touch the Free Write context note blocks (lines 228–262).
- Do NOT touch `<CrisisBanner>` mount (line 333).
- Do NOT touch `<UnsavedChangesModal>` mount (line 347).
- Do NOT touch `<CharacterCount>` mount (line 281–288).
- Do NOT touch the "Draft Saved" indicator block (lines 322–330).
- Do NOT touch the guided prompt card wrapper (line 206 — `rounded-lg border-l-2 border-primary bg-white/[0.06] p-6`). Only the inner "Try a different prompt" button migrates.
- Do NOT add `isLoading` to the Save Entry Button (per [UNVERIFIED] #1).
- Do NOT remove the recording-state red dot indicator (`<span className="absolute -right-0.5 -top-0.5 ...">`).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing `JournalTabContent.test.tsx` behavioral tests | integration | Verify they continue to pass (mode toggle, autosave, draft conflict, save, save auth gate, milestone toast, FeatureEmptyState rendering). |
| (only if existing class assertion) update toggle/textarea class | unit | If any test asserts `bg-primary/20` (toggle active) or the white-glow textarea string, update to violet-glow values. Per recon, no such assertion exists — verify. |
| (new — only if missing) "Voice mic uses subtle variant in idle state" | unit | If no existing assertion, append a render-and-find test that confirms the voice mic button has `bg-white/[0.07]` (subtle base) when not listening. |

**Expected state after completion:**

- [ ] `JournalInput.tsx` imports `Button`.
- [ ] Guided/Free Write toggle uses the DailyHub-1A-style class strings (violet active, transparent border inactive, `flex w-full max-w-xs rounded-full ... backdrop-blur-md` outer).
- [ ] `aria-pressed` toggle pattern preserved (NOT changed to tablist).
- [ ] "Try a different prompt" uses `<Button variant="ghost" size="sm">`.
- [ ] Textarea uses violet-glow class string verbatim (matches PrayerInput exactly).
- [ ] Voice mic uses `<Button variant="subtle" size="sm">` with absolute-positioning + circle override + recording-state animation preserved.
- [ ] Recording-state red dot indicator preserved.
- [ ] Save Entry uses `<Button variant="gradient" size="lg" disabled={!text.trim()}>` (NO `isLoading` per [UNVERIFIED] #1).
- [ ] Existing auth gate inside `handleSave` preserved verbatim.
- [ ] All hooks, state, useEffect blocks unchanged.
- [ ] Guided prompt card wrapper, DevotionalPreviewPanel, CrisisBanner, CharacterCount, UnsavedChangesModal preserved.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test --run JournalTabContent` passes with no new failures.

---

### Step 7: Migrate SavedEntriesList — default FrostedCard entries + subdued reflection box + subtle "Reflect on my entry"

**Objective:** Replace each rolls-own entry article wrapper with `<FrostedCard variant="default">`; replace the rolls-own reflection nested box with `<FrostedCard variant="subdued">`; refresh "Reflect on my entry" from text-link to `<Button variant="subtle" size="sm">`.

**Files to create/modify:**

- `frontend/src/components/daily/SavedEntriesList.tsx` — apply the migration to the entry article (lines 174–228) and "Reflect on my entry" button (lines 219–226).

**Details:**

1. Add imports:
   ```tsx
   import { Button } from '@/components/ui/Button'
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   ```

2. **Entry article (lines 174–228).** Currently a rolls-own `<article>` with `style={stagger.style}` from `useStaggeredEntrance`. Replace:
   ```tsx
   <FrostedCard
     key={entry.id}
     as="article"
     variant="default"
     className={cn('p-4', stagger.className)}
     // Note: FrostedCard does not accept an inline `style` prop.
     // The stagger animation is applied via stagger.className (a pre-computed class string).
   >
     {/* existing inner content unchanged */}
   </FrostedCard>
   ```

   **Critical: FrostedCard does NOT accept an arbitrary `style` prop.** The `useStaggeredEntrance` hook returns `{ className, style }` per item — `className` is a pre-computed CSS class for the stagger animation, `style` is the inline animation-delay value. To preserve the staggered entrance animation, we need to either:
   - **Option A (recommended):** Use only `stagger.className` (the pre-computed class) and accept that the inline style (per-item animation delay) is lost. If `stagger.className` already includes the per-item delay via something like `style={{ animationDelay }}` at the hook level, this loses the delay variability.
   - **Option B:** Wrap FrostedCard in a `<div style={stagger.style}>` outer element to carry the inline style.

   **Verification required during execution:** Read `frontend/src/hooks/useStaggeredEntrance.ts` to determine whether `stagger.style` is essential or whether `stagger.className` alone produces the staggered animation. If essential, use Option B:

   ```tsx
   <div
     key={entry.id}
     className={stagger.className}
     style={stagger.style}
   >
     <FrostedCard
       as="article"
       variant="default"
       className="p-4"
       aria-label={`Journal entry from ${formatDateTime(new Date(entry.timestamp))}`}
     >
       {/* existing inner content unchanged */}
     </FrostedCard>
   </div>
   ```

   This wraps the FrostedCard in a stagger container that carries the inline style. Drawback: adds one DOM node per entry. Acceptable trade-off.

   The `aria-label={`Journal entry from ${formatDateTime(...)}`}` survives via FrostedCard's children — wait, FrostedCard does not forward arbitrary props (no `...rest`). The `aria-label` would need to live on the inner article element. **Verification required:** check if `aria-label` is forwarded by FrostedCard. Reading source: lines 60–67 of `FrostedCard.tsx` show that only `onClick`, `tabIndex`, `role`, `onKeyDown`, and `type` (when `as="button"`) are forwarded — `aria-label` is NOT forwarded. **Need to handle this.** The cleanest path:
   - Pass `aria-label` via the children (an inner wrapper).

   Final structure (assuming `stagger.style` is essential):

   ```tsx
   <div
     key={entry.id}
     className={stagger.className}
     style={stagger.style}
   >
     <FrostedCard as="article" variant="default" className="p-4">
       <div aria-label={`Journal entry from ${formatDateTime(new Date(entry.timestamp))}`}>
         <p className="mb-2 text-xs text-white/60">
           {/* existing timestamp + Guided pill */}
         </p>
         {entry.promptText && (
           <p className="mb-2 text-xs italic text-white/60">
             Prompt: {entry.promptText}
           </p>
         )}
         <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-white/80">
           {entry.content}
         </p>
         {/* reflection block (see step 3 below) */}
       </div>
     </FrostedCard>
   </div>
   ```

   ⚠ Adding an inner `<div>` to carry `aria-label` is not ideal — `aria-label` on a non-semantic `<div>` requires a `role` attribute to expose it to assistive tech. Better path: **add `aria-label` via a `role="article"`-tagged inner div** OR **forward `aria-label` via the existing FrostedCard `as="article"` element by extending FrostedCard's prop API to accept `aria-label`** (out of scope for this spec — would require a FrostedCard component change).

   **Simpler resolution:** Use a `<section>` or `<div role="article" aria-label={...}>` inside FrostedCard, OR drop the `aria-label` and rely on the timestamp `<p>` inside the article for context.

   **Plan recommendation:** Drop the `aria-label` from the FrostedCard host element. The article's content (timestamp + journal body) already provides clear context for screen readers. The `aria-label` was a redundant verbalization. If user pushback during code review, extend FrostedCard's prop API in a follow-up spec to forward `aria-label`.

   Final structure:
   ```tsx
   <div
     key={entry.id}
     className={stagger.className}
     style={stagger.style}
   >
     <FrostedCard as="article" variant="default" className="p-4">
       <p className="mb-2 text-xs text-white/60">
         {formatDateTime(new Date(entry.timestamp))}
         {entry.mode === 'guided' && (
           <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
             <span className="sr-only">Mode: </span>Guided
           </span>
         )}
       </p>
       {entry.promptText && (
         <p className="mb-2 text-xs italic text-white/60">
           Prompt: {entry.promptText}
         </p>
       )}
       <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-white/80">
         {entry.content}
       </p>
       {/* reflection block */}
     </FrostedCard>
   </div>
   ```

3. **Reflection nested box (lines 197–205).** Currently:
   ```tsx
   {entry.reflection ? (
     <div className="mt-3 rounded-lg bg-white/[0.04] p-3">
       <p className="mb-1 text-xs font-medium text-primary">
         Reflection
       </p>
       <p className="text-sm leading-relaxed text-white/80">
         {entry.reflection}
       </p>
     </div>
   ) : reflectingIds.has(entry.id) ? (
     ...
   ) : (
     ...
   )}
   ```

   Replace the first branch:
   ```tsx
   {entry.reflection ? (
     <FrostedCard as="div" variant="subdued" className="mt-3 p-3">
       <p className="mb-1 text-xs font-medium text-primary">
         Reflection
       </p>
       <p className="text-sm leading-relaxed text-white/80">
         {entry.reflection}
       </p>
     </FrostedCard>
   ) : reflectingIds.has(entry.id) ? (
     /* existing "Reflecting on your words..." spinner block — unchanged */
   ) : (
     /* "Reflect on my entry" Button — see step 4 below */
   )}
   ```

   The `mt-3 p-3` on the FrostedCard className override — the `p-3` overrides FrostedCard subdued's default `p-5` to preserve the compact nested padding (matches the rolls-own `p-3`).

4. **"Reflect on my entry" button (lines 219–226).** Currently a rolls-own text-link `<button>`. Replace:
   ```tsx
   <Button
     variant="subtle"
     size="sm"
     type="button"
     onClick={() => onReflect(entry.id)}
     className="mt-3"
     aria-label={`Reflect on entry from ${formatDateTime(new Date(entry.timestamp))}`}
   >
     Reflect on my entry
   </Button>
   ```

   The `mt-3` margin is preserved via className override. The aria-label dynamic value is preserved.

5. **"Reflecting on your words…" spinner branch (lines 206–217)** — UNCHANGED. Keep the existing rolls-own block (it's a transient loading state, not a primary action).

**Auth gating:**

- "Reflect on my entry" Button → existing `onReflect(entry.id)` callback preserved. The auth gate fires inside the parent `JournalTabContent.handleReflect`. No change here.

**Responsive behavior:**

- Desktop (1440px): Entries stack vertically (`space-y-6` on parent at line 170). Each entry is full-width within `max-w-2xl`. Reflection nested box renders inline below entry body.
- Tablet (768px): Same as desktop.
- Mobile (375px): Same as desktop. Compact `p-4` (entry) and `p-3` (reflection) padding preserves readability.

**Inline position expectations:** N/A — entries stack vertically; no inline-row layouts within entries.

**Guardrails (DO NOT):**

- Do NOT touch the parent `<section aria-labelledby="saved-entries-heading">` (line 92).
- Do NOT touch the `<h3 id="saved-entries-heading" className="sr-only">` (line 94–96).
- Do NOT touch the "Write another" / "Done journaling" button row (lines 99–116).
- Do NOT touch the "Done Journaling CTAs" block (lines 118–140) — out of scope.
- Do NOT touch `JournalSearchFilter` (lines 144–153).
- Do NOT touch `FeatureEmptyState` (lines 156–167).
- Do NOT touch `useStaggeredEntrance`, `useState`, `useRef`, `useEffect`, `useMemo` calls.
- Do NOT touch the "Reflecting on your words…" spinner branch.
- Do NOT remove the `aria-label` on the "Reflect on my entry" Button (it's dynamic per entry).
- Do NOT touch the `entry.mode === 'guided'` "Guided" pill (lines 182–186) — stays rolls-own inside the FrostedCard.
- Do NOT change `entry.promptText` italic prompt rendering (lines 188–192).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing `JournalTabContent.test.tsx` saved-entries tests | integration | Verify they continue to pass (entries render, "Reflect on my entry" fires onReflect, reflection text renders, "Reflecting…" spinner renders, FeatureEmptyState when no entries). |
| (only if existing class assertion) update entry/reflection class | unit | If any test asserts `bg-white/[0.06]` on entry article or `bg-white/[0.04]` on reflection box, update to FrostedCard default / subdued. Per recon, no such assertion exists — verify. |

**Expected state after completion:**

- [ ] `SavedEntriesList.tsx` imports `Button` and `FrostedCard`.
- [ ] Each entry wraps in an outer `<div>` carrying `stagger.className` + `stagger.style` (preserves stagger animation).
- [ ] Each entry article is `<FrostedCard as="article" variant="default" className="p-4">`.
- [ ] Reflection nested box (when `entry.reflection` is set) is `<FrostedCard as="div" variant="subdued" className="mt-3 p-3">`.
- [ ] "Reflect on my entry" button is `<Button variant="subtle" size="sm" className="mt-3">`.
- [ ] "Reflecting on your words…" spinner branch unchanged.
- [ ] "Guided" pill, prompt italic, entry body content all preserved.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test --run JournalTabContent` passes with no new failures.

---

### Step 8: Update design system documentation

**Objective:** Update `.claude/rules/09-design-system.md` to make the violet-glow textarea pattern canonical and deprecate the white-glow pattern. Update the recon snapshot at `_plans/recon/design-system.md` if (and only if) it carries a textarea-glow section.

**Files to create/modify:**

- `.claude/rules/09-design-system.md` — § "Textarea Glow Pattern (Daily Hub Round 3)" + Daily Experience Components entries + Deprecated Patterns table.
- `_plans/recon/design-system.md` — conditional, only if it has a textarea-glow snapshot.

**Details:**

1. **`09-design-system.md` § "Textarea Glow Pattern" (lines ~186–198).** Replace the section title and contents with:

   ```markdown
   ## Textarea Glow Pattern (Daily Hub Round 4 / DailyHub 1B)

   The Pray and Journal textareas use a **static violet box-shadow** that matches the FrostedCard default-tier surface, replacing the prior white-glow pattern. The previous `animate-glow-pulse` (Wave 6) and the white-glow shadow (Round 3) are both deprecated. The current pattern reads as a frosted writing surface consistent with the cards around it on the multi-bloom canvas (DailyHub 1A).

   **Canonical class string for textarea glow:**

   ```
   shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
   border border-violet-400/30 bg-white/[0.04]
   focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
   placeholder:text-white/40
   ```

   **Apply to:** PrayerInput textarea, JournalInput textarea. Other textareas (Bible search, AskPage, Reading Plan create flow) may continue using their existing glow treatment or be migrated to this pattern as part of a future spec.
   ```

2. **Daily Experience Components entries (lines ~264–265).** Update both bullet points:

   FROM:
   ```
   - **PrayerInput.tsx** — Pray tab textarea with 3 starter chips, `rows={8} min-h-[200px] max-h-[500px] resize-y`, white textarea glow, draft auto-save (1s debounce, `wr_prayer_draft` key), draft saved indicator, "Help Me Pray" white pill button matching homepage primary CTA style.
   - **JournalInput.tsx** — Journal tab input with mode toggle (Guided/Free Write), prompt card (Inter sans, NOT italic, white text, leading-relaxed), draft auto-save (`wr_journal_draft` key), white textarea glow, "Save Entry" button matching homepage primary CTA. Mounts `DevotionalPreviewPanel` at the top when arriving from devotional context.
   ```

   TO:
   ```
   - **PrayerInput.tsx** — Pray tab textarea with 3 starter chips (`<Button variant="subtle" size="sm">`), `rows={8} min-h-[200px] max-h-[500px] resize-y`, **violet textarea glow** (DailyHub 1B), draft auto-save (1s debounce, `wr_prayer_draft` key), draft saved indicator, "Help Me Pray" `<Button variant="gradient" size="lg">` showstopper.
   - **JournalInput.tsx** — Journal tab input with mode toggle (Guided/Free Write — DailyHub 1A-style violet active pill), prompt card (Inter sans, NOT italic, white text, leading-relaxed — stays rolls-own scripture-callout idiom), draft auto-save (`wr_journal_draft` key), **violet textarea glow** (DailyHub 1B), voice mic (`<Button variant="subtle" size="sm">`), "Save Entry" `<Button variant="gradient" size="lg">` showstopper. Mounts `DevotionalPreviewPanel` at the top when arriving from devotional context.
   ```

3. **Deprecated Patterns table (lines ~824–842).** Update the existing row:

   FROM:
   ```
   | Cyan/purple textarea glow border                                | White border with white glow shadow                                                     |
   ```

   TO:
   ```
   | Cyan/purple textarea glow border                                | Violet textarea glow (Daily Hub Round 4 / DailyHub 1B) — see "Textarea Glow Pattern"     |
   | White border with white glow shadow on Pray/Journal textareas   | Violet textarea glow (Daily Hub Round 4 / DailyHub 1B) — see "Textarea Glow Pattern"     |
   ```

   This adds a new row capturing the cyan → white → violet history, while pointing the existing white-row's replacement to the current pattern.

4. **`_plans/recon/design-system.md`** — conditional. Run `grep -i "textarea\|white-glow" _plans/recon/design-system.md` first. If it carries a textarea-glow snapshot or section, update it to reference the new violet-glow pattern. If it has no such section (likely — recon is page-level visual capture, not pattern documentation), skip this file. **The 1A spec verified the recon does NOT carry a textarea-glow section** (its focus was BackgroundCanvas / FrostedCard / tab bar). Verify and skip.

**Auth gating:** N/A — documentation-only step.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A — documentation step.

**Guardrails (DO NOT):**

- Do NOT remove or rename the "Textarea Glow Pattern" section heading — only update its contents and the parenthetical (Daily Hub Round 3 → Daily Hub Round 4 / DailyHub 1B).
- Do NOT remove the existing Deprecated Patterns table entry for `Caveat font on headings`, `BackgroundSquiggle on Daily Hub`, `GlowBackground per Daily Hub section`, or `animate-glow-pulse on textareas`. Only modify the textarea-glow-related row.
- Do NOT alter the canonical class string for the new pattern beyond what is specified in the spec.

**Test specifications:** N/A — documentation step. No test changes.

**Expected state after completion:**

- [ ] `09-design-system.md` § "Textarea Glow Pattern" documents the violet-glow pattern as canonical (Daily Hub Round 4 / DailyHub 1B).
- [ ] PrayerInput.tsx and JournalInput.tsx bullet entries reference "violet textarea glow" instead of "white textarea glow".
- [ ] Deprecated Patterns table has a new row for the white-glow textarea pattern.
- [ ] `_plans/recon/design-system.md` is either updated (if a textarea-glow section exists) or noted as having no section to update.
- [ ] No code changes in this step (documentation only).
- [ ] Manual review: open the updated `09-design-system.md` and verify the new section reads cleanly in the doc context.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | PrayerInput migration (textarea + chips + Help Me Pray) |
| 2 | — | PrayerResponse migration (accent prayer card + subtle action buttons) |
| 3 | — | GuidedPrayerSection migration (8 cards to default FrostedCard) |
| 4 | — | SaveToPrayerListForm migration (subdued FrostedCard + subtle/ghost buttons) |
| 5 | — | JournalTabContent draft-conflict dialog migration (default FrostedCard + 2 subtle buttons) |
| 6 | — | JournalInput migration (textarea + toggle + voice mic + Save Entry + Try a different prompt) |
| 7 | — | SavedEntriesList migration (default entry + subdued reflection + subtle Reflect button) |
| 8 | 1, 2, 6 | Documentation update (after the new patterns are shipped) |

Steps 1–7 are independent — they touch different files. They can run in any order, including in parallel. Step 8 lands last so the design system docs reflect the shipped state.

Recommended execution order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Run `pnpm tsc --noEmit` and `pnpm test` after each step to catch regressions early.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | PrayerInput — violet-glow textarea + gradient submit + subtle chips | [COMPLETE] | 2026-05-01 | `frontend/src/components/daily/PrayerInput.tsx` — added Button import; textarea → violet-glow; 3 chips → Button subtle sm; Help Me Pray → Button gradient lg with `isLoading={isLoading}`. 72/72 PrayTabContent tests pass. |
| 2 | PrayerResponse — accent FrostedCard + subtle action buttons | [COMPLETE] | 2026-05-01 | `frontend/src/components/daily/PrayerResponse.tsx` — added Button + FrostedCard imports; generated prayer card → `<FrostedCard as="article" variant="accent" eyebrow="Your prayer" className="mb-6">` (replaces rolls-own div + "Your prayer:" header); Copy/Save/SaveToList/Mobile overflow trigger → Button subtle sm; Saved success span uses matching frosted-pill surface. ReadAloud/Share/reflection buttons NOT migrated (out of scope per [UNVERIFIED] #2). Updated 4 test assertions in PrayTabContent.test.tsx from "Your prayer:" to "Your prayer" (eyebrow renders without colon). 72/72 tests pass. |
| 3 | GuidedPrayerSection — 8 cards to default FrostedCard | [COMPLETE] | 2026-05-01 | `frontend/src/components/daily/GuidedPrayerSection.tsx` — added FrostedCard import; 8 rolls-own card buttons → `<FrostedCard as="button" variant="default" onClick={...} className="relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center sm:w-auto sm:min-w-0 sm:min-h-[260px] text-left">` (preserves carousel-vs-grid switching). 12/12 tests pass. |
| 4 | SaveToPrayerListForm — subdued FrostedCard + subtle/ghost buttons | [COMPLETE] | 2026-05-01 | `frontend/src/components/daily/SaveToPrayerListForm.tsx` — added Button + FrostedCard imports; form wrapper → `<FrostedCard as="div" variant="subdued" className="mt-4">`; Save button → Button subtle md; Cancel → Button ghost sm. Title input, category pills, inner CrisisBanner unchanged. 12/12 tests pass. |
| 5 | JournalTabContent — default FrostedCard draft-conflict dialog + 2 subtle buttons | [COMPLETE] | 2026-05-01 | `frontend/src/components/daily/JournalTabContent.tsx` — added Button + FrostedCard imports; draft-conflict dialog wrapper → `<FrostedCard as="div" variant="default" className="mb-6">` with inner `<div role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title">` (preserves dialog ARIA on inner div since FrostedCard doesn't forward arbitrary props); both action buttons → Button subtle md; autoFocus preserved on Keep my current draft. 54/54 tests pass. |
| 6 | JournalInput — violet-glow textarea + tab-bar toggle + subtle voice + gradient Save + ghost Try-prompt | [COMPLETE] | 2026-05-01 | `frontend/src/components/daily/JournalInput.tsx` — added Button import; mode toggle → DailyHub-1A-style violet-active inset pill (`flex w-full max-w-xs rounded-full ... backdrop-blur-md` outer with `bg-violet-500/[0.13] border-violet-400/45` active branch), `aria-pressed` preserved; "Try a different prompt" → Button ghost sm; textarea → violet-glow; voice mic → Button subtle sm with circle override (`!rounded-full !px-0` + recording-state class overrides); Save Entry → Button gradient lg with `disabled={!text.trim()}` (NO isLoading per [UNVERIFIED] #1). Updated 1 test assertion in JournalTabContent.test.tsx (`flex-wrap` → `justify-center`). 54/54 tests pass. |
| 7 | SavedEntriesList — default entry + subdued reflection + subtle Reflect button | [COMPLETE] | 2026-05-01 | `frontend/src/components/daily/SavedEntriesList.tsx` — added Button + FrostedCard imports (cn import removed — no longer used); each entry wraps in outer `<div>` carrying `stagger.className` + `stagger.style` (preserves stagger animation since FrostedCard does NOT accept style/aria-label props), inner article is `<FrostedCard as="article" variant="default" className="p-4">`; `aria-label` dropped from article host element (per [UNVERIFIED] resolution — content provides clear context); reflection nested box → `<FrostedCard as="div" variant="subdued" className="mt-3 p-3">`; "Reflect on my entry" → Button subtle sm with `mt-3` className override and dynamic aria-label preserved. 54/54 tests pass. |
| 8 | Update design system documentation | [COMPLETE] | 2026-05-01 | `.claude/rules/09-design-system.md` — § "Textarea Glow Pattern" updated (Round 3 → Round 4 / DailyHub 1B) with new violet-glow canonical class string; PrayerInput.tsx + JournalInput.tsx Daily Experience entries updated to reference violet textarea glow + new Button variants; Deprecated Patterns table got 2 updated rows (animate-glow-pulse + cyan border) and 1 new row (white-glow on textareas). `_plans/recon/design-system.md` deliberately not updated — recon is a 2026-04-05 point-in-time snapshot per plan recommendation. |
