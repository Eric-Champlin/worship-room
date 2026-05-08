# DailyHub Holistic Redesign 1B — Pray + Journal

**Master Plan Reference:** Recon at `_plans/forums/dailyhub-redesign-recon.md`. Builds directly on `_specs/dailyhub-1a-foundation-and-meditate.md` (which built on `_specs/frostedcard-pilot-bible-landing.md` + `_specs/frostedcard-iteration-1-make-it-pop.md`). This is the **second of three** specs migrating DailyHub. Spec 1A shipped the multi-bloom BackgroundCanvas, the `<Button variant="subtle">` variant, the new tab-bar visual treatment, and the Meditate tab migration. Spec 2 (Devotional) follows.

**Branch discipline:** Stay on `forums-wave-continued`. Do not create new branches, commit, push, stash, or reset. The user manages all git operations manually. If you find yourself on a different branch than expected, STOP and ask.

---

## Affected Frontend Routes

- `/daily?tab=pray` (primary visual target)
- `/daily?tab=journal` (primary visual target)
- `/daily?tab=meditate` (regression — 1A surface; tab bar + multi-bloom canvas continue rendering correctly)
- `/daily?tab=devotional` (regression — canvas + tab bar render unchanged; tab content still pre-spec until Spec 2)
- `/bible` (regression — multi-bloom BackgroundCanvas continues rendering correctly; pilot card variants unchanged)

---

## Overview

This spec continues the DailyHub migration shipped in Spec 1A by applying the established visual language to the **two writing tabs (Pray + Journal)**.

The migration is structural rather than delicate: every rolls-own card on these two tabs becomes a `<FrostedCard>` with the appropriate variant (`accent` for the generated prayer; `default` for guided sessions, saved entries, and the draft-conflict dialog; `subdued` for the SaveToPrayerListForm and the AI reflection nested box). Every secondary action becomes `<Button variant="subtle">`. The two primary CTAs ("Help Me Pray" + "Save Entry") become `<Button variant="gradient" size="lg">` — the gradient showstopper. The Journal Guided/Free Write toggle picks up the same color treatment as the DailyHub main tab bar shipped in 1A.

The spec also introduces **one new pattern**: the **violet-glow textarea**. Today, PrayerInput and JournalInput share a "white-glow" treatment (white border + white box-shadow + white-50 placeholder) that worked in the cyan-era visual system. In the new violet-bloom canvas, the white glow reads as out-of-system. This spec replaces it with a violet-glow treatment matching the FrostedCard default-tier surface — `bg-white/[0.04]`, `border-violet-400/30`, dual violet shadow, white-40 placeholder — used identically on both textareas. The pulsing-glow ban (Wave 6) and the static-shadow principle from the existing pattern are preserved; only the color shifts from white to violet.

The emotional intent: when a user opens a writing tab, the textarea should feel like a frosted writing surface that lifts gently off the canvas, with a violet beacon that whispers "this is where you type" without competing with the surrounding cards. The "Help Me Pray" and "Save Entry" buttons should land as showstoppers — gradient pills that resolve the writing flow's momentum into the moment of submission.

## User Story

As a **logged-out visitor or logged-in user on the Daily Hub Pray or Journal tab**, I want the writing surface to feel like a calm, intentional space — textarea glowing softly violet, secondary actions reading as quiet frosted pills, the primary CTA landing as the showstopper, and the surrounding cards (guided prayer sessions, saved journal entries, the AI-generated prayer card) lifting consistently off the canvas — so that I can write or pray without visual noise pulling me out of the moment.

## Requirements

### Functional Requirements

#### 1. Violet-glow textarea pattern (NEW; introduced by this spec)

Both PrayerInput and JournalInput use the same canonical class string. The values match the FrostedCard default-tier surface so the textarea reads as a frosted writing surface, consistent with the cards around it.

**Old pattern (deprecated by this spec):**

```
border border-white/30 bg-white/[0.06]
shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)]
focus:border-white/60 focus:ring-2 focus:ring-white/30
placeholder:text-white/50
```

**New pattern (introduced by this spec):**

```
border border-violet-400/30 bg-white/[0.04]
shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/30
placeholder:text-white/40
```

Visual intent (carry into design notes / docs update):

- Violet glow tells the user "this is where you type" — same beacon affordance as the prior white pattern, in the new palette.
- Background opacity drops `0.06 → 0.04` to match FrostedCard default tier.
- Border opacity 30% on the violet color produces a visible but quiet boundary.
- Focus state strengthens both border and glow (60% / 30% violet ring) without becoming aggressive.
- Placeholder drops `white/50 → white/40` — the violet glow already provides directional affordance, so the placeholder can quiet down.

The textarea remains static (no animation) — the Wave 6 anti-pulsing rule from the existing "Textarea Glow Pattern" carries forward.

#### 2. PrayTabContent migration

##### 2.1 PrayerInput textarea (`frontend/src/components/daily/PrayerInput.tsx`)

Replace the existing white-glow class string on the textarea with the new violet-glow pattern from §1. The textarea's wrapper structure, `ref`, `onChange`, `placeholder` text, voice-input mic absolute positioning anchor, draft-autosave (`wr_prayer_draft`), crisis-banner integration, and other behavior are preserved verbatim.

##### 2.2 PrayerInput "Help Me Pray" button

Replace the rolls-own homepage-primary white pill (`bg-white text-hero-bg` with white shadow + hover glow) with `<Button variant="gradient" size="lg">`. Bind `isLoading={isSubmitting}` to the existing submit-state. The Button component's `isLoading` shows a spinner sized to the size variant, sets `aria-busy` and `aria-disabled`, and preserves layout — replacing whatever manual loading affordance the rolls-own button had. Add `import { Button } from '@/components/ui/Button'` if not already present.

##### 2.3 PrayerInput quick-prompt chips

The chip array (renders 4–6 starter chips like "I'm struggling with…", "I'm grateful for…") is currently rolls-own pill `<button>`s. Refresh each to `<Button variant="subtle" size="sm" type="button">`. Preserve every `onClick` handler (which inserts the chip text into the textarea via setState), the wrapping flex-wrap container, and any aria labels.

##### 2.4 PrayerResponse generated prayer card (`frontend/src/components/daily/PrayerResponse.tsx`)

The generated-prayer card (rolls-own `mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6`) becomes:

```tsx
<FrostedCard as="article" variant="accent" eyebrow="Your prayer" className="mb-6">
  {/* existing inner content unchanged */}
</FrostedCard>
```

Add `import { FrostedCard } from '@/components/homepage/FrostedCard'`. The KaraokeText reveal animation, prayer body content, attribution, and any other inner elements are unchanged. Only the card chrome migrates.

##### 2.5 PrayerResponse action buttons

Copy / Read Aloud / Save / Share buttons (currently rolls-own pill or text buttons) each migrate to `<Button variant="subtle" size="sm">`. Preserve every `onClick`, every `aria-label`, and every conditional rendering (e.g., Save may be hidden when not authenticated).

##### 2.6 GuidedPrayerSection cards (`frontend/src/components/daily/GuidedPrayerSection.tsx`)

All 8 guided-prayer cards (currently rolls-own with carousel + min-width snap behavior) become:

```tsx
<FrostedCard
  as="button"
  variant="default"
  onClick={() => handleSessionClick(session)}
  className="relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center sm:min-h-[260px]"
>
  {/* existing inner content: icon + title + description + duration pill */}
</FrostedCard>
```

The auth-modal-trigger logic for unauthenticated users (the existing onClick branch) is preserved verbatim. The `active:scale-[0.98]` is provided by FrostedCard internally and removed from the className override. The "X min" duration pill inside each card stays rolls-own.

##### 2.7 SaveToPrayerListForm (`frontend/src/components/daily/SaveToPrayerListForm.tsx`)

The form wrapper (rolls-own `mt-4 rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm`) becomes `<FrostedCard as="div" variant="subdued" className="mt-4">`. Subdued is correct because this form is nested content rendered inside PrayerResponse when the user clicks Save.

The two action buttons inside the form:

- **Save** → `<Button variant="subtle">` (the affirmative action, but quiet — not a showstopper)
- **Cancel** → `<Button variant="ghost">` (the soft-action variant)

If the cancel button currently uses some other variant or rolls-own classes, align it with `ghost` for consistency.

##### 2.8 PrayTabContent — preserved verbatim

- `DevotionalPreviewPanel` (shared component used outside DailyHub, stays rolls-own)
- `VersePromptCard` (shared component used outside DailyHub, stays rolls-own)
- `CrisisBanner` (alert pattern — distinct visual idiom, stays rolls-own)
- `KaraokeText` reveal animation logic
- Auto-play "The Upper Room" ambient scene logic
- Draft autosave to `wr_prayer_draft`
- The mobile/desktop carousel snap layout on GuidedPrayerSection

#### 3. JournalTabContent migration

##### 3.1 Guided / Free Write toggle (in `JournalTabContent.tsx` or `JournalInput.tsx` — read the file to confirm location)

The toggle that switches between Guided and Free Write modes picks up the **same color treatment** as the DailyHub main tab bar shipped in 1A:

- **Outer container:** `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`
- **Active button:** `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`
- **Inactive button:** `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`

Each button carries `min-h-[44px]`, `rounded-full`, `transition-all`, `duration-base`, `motion-reduce:transition-none`, `active:scale-[0.98]` — the same shared base classes the DailyHub main tab bar uses.

The toggle's existing role / aria pattern is preserved — if it uses `role="tab"` + `role="tablist"`, keep it; if it uses `aria-pressed` (toggle-button pattern), keep that. Don't change semantic patterns. Only the class strings change.

##### 3.2 Guided prompt card (`JournalInput.tsx`)

The guided prompt card (rolls-own `rounded-lg border-l-2 border-primary bg-white/[0.06] p-6`) **stays rolls-own** as a scripture-callout-idiom — same treatment used by Devotional's passage and question callouts. This matches the direction-doc decision and is consistent with how callouts are handled elsewhere in DailyHub. Do not migrate to FrostedCard.

The "Try a different prompt" link inside this card: refresh to `<Button variant="ghost" size="sm">` if it's currently a button. If it's a plain text link (e.g., `<button>` with link styling, or actually an `<a>`), leave the structure alone — don't introduce structural changes for cosmetic alignment.

##### 3.3 JournalInput textarea

Same violet-glow class string from §1 — applied identically to PrayerInput's textarea. Preserve auto-expand behavior, voice-input mic positioning, crisis-banner integration, draft autosave to `wr_journal_draft`, every `onChange` handler.

##### 3.4 Voice input mic button (`JournalInput.tsx`)

The mic button (sits inside the textarea wrapper, absolute-positioned bottom-right) becomes `<Button variant="subtle" size="sm">` with the existing absolute-positioning classes and `aria-label` carried through. The recording-state animation (e.g., `motion-safe:animate-mic-pulse` red glow) is preserved by appending it conditionally on `isRecording`:

```tsx
<Button
  variant="subtle"
  size="sm"
  onClick={handleMicClick}
  className={cn(
    'absolute bottom-2 right-2',
    isRecording && 'motion-safe:animate-mic-pulse border-red-400/60'
  )}
  aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
>
  <Mic className="h-4 w-4" />
</Button>
```

Adjust the absolute-positioning classes to match the file's actual values. The recording animation visual is preserved; only the button chrome (frosted pill background, border, shadow) becomes the new subtle variant.

##### 3.5 "Save Entry" button

Replace the rolls-own homepage-primary white pill with `<Button variant="gradient" size="lg" type="submit" disabled={!isValid} isLoading={isSaving}>`. Same pattern as PrayerInput's "Help Me Pray." Preserve all existing disabled-state logic, validation logic, and `onClick`/`onSubmit` handlers.

##### 3.6 Saved entry articles (`frontend/src/components/daily/SavedEntriesList.tsx`)

Each saved entry article (rolls-own `rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4`) becomes:

```tsx
<FrostedCard as="article" variant="default" className="p-4">
  {/* existing entry content: timestamp, body, nested reflection box */}
</FrostedCard>
```

The `p-4` override preserves the more compact padding (FrostedCard default is `p-6`, which is too generous for a feed-style entry list).

##### 3.7 Reflection nested box (`SavedEntriesList.tsx`)

The AI reflection nested box (rolls-own `mt-3 rounded-lg bg-white/[0.04] p-3`) becomes:

```tsx
<FrostedCard as="div" variant="subdued" className="mt-3 p-3">
  {/* AI reflection text */}
</FrostedCard>
```

Subdued is correct — this is nested content INSIDE the entry card, and it should visually recede so the parent entry reads as the dominant surface. The `p-3` override preserves the compact nested padding.

##### 3.8 "Reflect on my entry" button (`SavedEntriesList.tsx`)

Refresh to `<Button variant="subtle" size="sm">`. Preserve auth-gating logic, `onClick` handler, loading state.

##### 3.9 Draft conflict dialog (`JournalTabContent.tsx`)

The dialog wrapper (rolls-own `mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`) becomes:

```tsx
<FrostedCard as="div" variant="default" className="mb-6">
  {/* existing dialog content: heading, description, action buttons */}
</FrostedCard>
```

Inside the dialog, both action buttons become `<Button variant="subtle" size="md">`:

- **Start fresh** → `<Button variant="subtle">`
- **Keep my current draft** → `<Button variant="subtle">`

Both get the same treatment. They're paired equal-weight choices; neither is the showstopper. The "destructive vs. safe" distinction is communicated via the existing wording, not via visual hierarchy.

##### 3.10 JournalTabContent — preserved verbatim

- `VersePromptCard` (shared component, stays rolls-own)
- `DevotionalPreviewPanel` (shared component, stays rolls-own)
- `CrisisBanner` (alert pattern, stays rolls-own)
- `FeatureEmptyState` (canonical empty-state primitive — used when no entries)
- `JournalSearchFilter` (separate visual decision; out of scope for this spec)
- Voice input recognition logic (the mic button gets refreshed; the speech recognition logic is untouched)
- Auto-expand textarea logic
- Draft autosave to `wr_journal_draft`
- `JOURNAL_MILESTONES` celebration toast trigger logic

#### 4. Documentation update — design system

Update **`.claude/rules/09-design-system.md`** § "Textarea Glow Pattern (Daily Hub Round 3)" (lines ~186–198) to:

- Document the violet-glow pattern as the canonical textarea treatment for PrayerInput and JournalInput.
- Mark the prior white-glow pattern as deprecated (move to the "Deprecated Patterns" table).
- Update the "Daily Experience Components" entries for `PrayerInput.tsx` and `JournalInput.tsx` (lines ~264–265) to say "violet textarea glow" instead of "white textarea glow".
- Update the "Deprecated Patterns" table row currently labeled "Cyan/purple textarea glow border → White border with white glow shadow" to a new row: "White textarea glow → Violet textarea glow (Daily Hub Round 4 / DailyHub 1B)" and append a new row capturing the cyan→white→violet history.

If `_plans/recon/design-system.md` (repo root, not `frontend/`) carries a snapshot of the textarea glow pattern, update it to match. If neither file has a section to update, document the new pattern in `.claude/rules/09-design-system.md` § "Textarea Glow Pattern" so it has a canonical home.

This is documentation-only — no code change in the rule file area.

### Non-Functional Requirements

- **Type safety:** TypeScript strict (project default). `pnpm tsc --noEmit` must pass cleanly.
- **Test pass:** `pnpm test` must pass. No new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files documented in `CLAUDE.md`). The migration is structural — most existing tests are behavioral and continue to pass unchanged. Class-string assertions on migrated cards (if any exist after recon) are updated to FrostedCard variant values.
- **Accessibility (preserved, not improved):**
  - PrayerInput, JournalInput, PrayerResponse, GuidedPrayerSection, SavedEntriesList: existing `<button>` semantics, `onClick` handlers, auth-modal triggers, `aria-label` props are preserved. FrostedCard's `tabIndex` / `role` / `onKeyDown` / focus-visible ring behavior covers what the rolls-own buttons had.
  - The Guided/Free Write toggle's existing role / aria pattern is preserved exactly — class strings only.
  - Button subtle and gradient variants both carry `min-h-[44px]`, satisfying the 44px touch-target floor.
  - Button gradient variant respects `motion-reduce:hover:translate-y-0` (shipped in pilot).
  - Voice mic button retains `aria-label` and the recording-state announcement; the recording animation is in `motion-safe:` only and respects the global reduced-motion safety net.
  - The new violet-glow textarea pattern is static (no animation) — preserves the Wave 6 anti-pulsing rule.
- **Performance:** No new runtime dependencies. No new tokens. Zero impact on Lighthouse Performance — the migration replaces inline class strings with component variant lookups that resolve at build time.
- **Visual regression scope:**
  - **Pilot routes (intentionally redesigned):** `/daily?tab=pray` (full Pray flow) and `/daily?tab=journal` (Guided + Free Write modes, Saved Entries list, Draft conflict dialog).
  - **Untouched DailyHub tab content:** `/daily?tab=meditate` content cards (1A surface) and `/daily?tab=devotional` content cards must look identical to pre-spec. The shared chrome (canvas + tab bar) continues to render as in 1A.
  - **Manual verification list before commit:** `/daily?tab=pray` (textarea unfocused + focused, chips, generated prayer card, action buttons, guided-prayer carousel, SaveToPrayerListForm expanded), `/daily?tab=journal` (Guided + Free Write toggle, textarea unfocused + focused, mic button idle + recording, Save Entry, saved entries list, draft conflict dialog), `/daily?tab=meditate` (1A regression — cards still render correctly), `/bible` (BackgroundCanvas regression).

## Auth Gating

This is a visual-system spec. It changes class strings, component composition (rolls-own → FrostedCard variants, rolls-own pills → Button variants), and the textarea's color treatment, but **does not gain or lose any auth-gated actions**. Every existing auth gate is preserved verbatim.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Type into PrayerInput textarea | Allowed (UI accepts input; draft saves to `wr_prayer_draft`) | Allowed | N/A — typing is not gated |
| Click "Help Me Pray" | Auth modal triggers (existing behavior) | Generates prayer (existing flow) | Existing message preserved (e.g., "Sign in to generate a prayer") — not changed by this spec |
| Click a quick-prompt chip | Inserts text into textarea (no gate) | Same | N/A — chip insertion is not gated |
| Click Copy / Read Aloud / Share on PrayerResponse | Existing behavior preserved | Existing behavior preserved | N/A unless existing logic gated them |
| Click Save on PrayerResponse | Auth modal triggers (existing behavior — saving requires auth per `02-security.md`) | Opens SaveToPrayerListForm | Existing message preserved (e.g., "Sign in to save this prayer") |
| Submit SaveToPrayerListForm | Existing behavior preserved (form is reachable only after auth) | Saves to prayer list | N/A — form gated upstream |
| Click a guided-prayer card | Auth modal triggers (existing behavior — gated per `02-security.md` § "What requires login: Meditation: card clicks in MeditateTabContent" and the equivalent gate on guided prayer sessions) | Navigates to guided prayer player | Existing message preserved |
| Type into JournalInput textarea | Allowed (UI accepts input; draft saves to `wr_journal_draft`) | Allowed | N/A — typing is not gated |
| Click voice mic button | Existing behavior preserved (Web Speech API permission prompt) | Same | N/A — browser-level permission, not auth |
| Toggle Guided / Free Write | No gate (UI mode toggle) | Same | N/A — toggle is not gated |
| Click "Try a different prompt" | No gate (cycles guided prompt) | Same | N/A |
| Click "Save Entry" | Auth modal triggers (existing behavior per `02-security.md`: "Journal entry saving" requires login) | Saves to journal | Existing message preserved (e.g., "Sign in to save this entry") |
| Click "Reflect on my entry" | Auth modal triggers (existing behavior — Journal AI Reflection requires login) | Triggers AI reflection | Existing message preserved |
| Click Start fresh / Keep my current draft on Draft conflict dialog | Existing behavior preserved (dialog only renders for authenticated users with conflicting drafts) | Existing behavior preserved | N/A — dialog gated upstream |

`02-security.md` § "Auth Gating Strategy" remains canonical for which actions on `/daily` require login. Every gate listed there is preserved exactly; only the visual chrome around the click target changes.

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | Pray + Journal tab content layouts preserved exactly. Textarea retains `min-h-[200px]` (Pray) / auto-expand (Journal). Quick-prompt chips wrap (`flex-wrap`) — Button subtle `size="sm"` keeps `min-h-[44px]` so chip touch targets stay ≥ 44px. GuidedPrayerSection horizontal carousel snap behavior preserved (`w-[220px] min-w-[220px] flex-shrink-0 snap-center`). FrostedCard variants use `backdrop-blur-md` (8px) on mobile per the pilot. Guided/Free Write toggle uses `backdrop-blur-md` on outer; pill shape (`rounded-full`) and 44px touch targets work identically. Button gradient `size="lg"` keeps `min-h-[44px]`. |
| Tablet (640–1024px) | Same tier visual definitions. The `md:` breakpoint kicks in on FrostedCard accent/default tiers per the pilot (`backdrop-blur-[12px]` for accent, `backdrop-blur-md` for default, ~6px for subdued). The GuidedPrayerSection layout transitions to its existing tablet/desktop arrangement (the spec does NOT change card grid behavior). |
| Desktop (≥ 1024px) | Same tier behavior as tablet. The "Help Me Pray" and "Save Entry" gradient buttons render at full intent — gradient pill, lg size, drop shadow, hover lift. Multi-bloom canvas (1A) renders all five layers behind the tab content. |

**Responsive notes:**

- This spec changes NO existing layouts, grids, or breakpoint behavior. Every layout change is a class-string substitution with the same effective bounding box.
- Hover states (translate, shadow change, color shift) only fire at hover-capable breakpoints; mobile taps trigger `active:scale-[0.98]` (FrostedCard) instead. Button subtle and gradient variants follow the same pattern.
- The violet-glow textarea uses static box-shadow (no animation) — there is no reduced-motion concern.
- The recording-state mic animation (`motion-safe:animate-mic-pulse`, if currently used) is preserved and continues to respect the global reduced-motion safety net.

## AI Safety Considerations

This is a visual-system spec — no change to crisis detection, content moderation, AI prompt logic, or AI safety guardrails on any consumer flow.

- **Crisis detection** — `CrisisBanner` integration in PrayerInput, JournalInput, and (where applicable) PrayerResponse is preserved verbatim. The crisis banner remains rolls-own (alert idiom) — explicitly **not** migrated to FrostedCard.
- **AI-generated prayer content** — KaraokeText reveal animation, prayer body rendering as plain text (no `dangerouslySetInnerHTML`), 1000-char enforcement, and pre-moderation by upstream Gemini are preserved.
- **Journal AI reflection** — The reflection nested box's container migrates from rolls-own to FrostedCard subdued; the reflection content rendering (plain text, escaped on render, length-limited) is unchanged.
- **User text input handling** — Textarea content (Pray + Journal) flows through the existing crisis-detection path (client-side keyword fast-path + backend authoritative classifier per `01-ai-safety.md`). No change to that path.

## Auth & Persistence

- **Logged-out users:** Visual changes only. No new persistence. `wr_prayer_draft` (Pray) and `wr_journal_draft` (Journal) draft autosave continue to work for logged-out users (existing demo-mode-allowed localStorage exception per `02-security.md` § "Demo Mode (Logged-Out Experience) Data Policy" — drafts are client-side and don't violate the no-database-writes rule).
- **Logged-in users:** Visual changes only. No new database tables, columns, or backend endpoints. AI prayer generation continues to flow through `/api/v1/proxy/ai/*`. Journal saving and AI reflection continue to use existing endpoints.
- **localStorage usage:** No new keys introduced. Existing keys read/written on these tabs (`wr_prayer_draft`, `wr_journal_draft`, `wr_journal_mode`, `wr_journal_milestones`) are untouched.
- **Route type:** Public (`/daily` is public). Some interactions on these tabs gate to login per the Auth Gating table; this spec preserves every gate.

## Completion & Navigation

N/A — visual surface changes only. The `wr_daily_completion` reads/writes that drive the DailyHub completion tracking are untouched. Existing in-component navigation (guided prayer card → guided prayer player or auth modal; meditation suggestions; cross-tab CTAs after completion) preserved exactly. No new completion signals, no cross-tab context-passing changes.

## Design Notes

**Patterns introduced (NEW — flag as `[NEW PATTERN]` so /plan marks derived values `[UNVERIFIED]` until verified during execution):**

- **Violet-glow textarea pattern.** Replaces the white-glow pattern documented in `09-design-system.md` § "Textarea Glow Pattern". Used identically by PrayerInput and JournalInput. Static box-shadow (no animation). Color values: `border-violet-400/30`, `bg-white/[0.04]`, dual violet shadow `rgba(167,139,250,0.18)` / `rgba(167,139,250,0.10)`, focus to `border-violet-400/60` + `ring-violet-400/30`, placeholder `white/40`.

**Patterns reused (already shipped in 1A — referenced, not re-defined):**

- `<FrostedCard variant="accent">` with optional `eyebrow` + `eyebrowColor` props — used for the generated-prayer card.
- `<FrostedCard variant="default">` — used for guided-prayer cards, saved entries, draft conflict dialog.
- `<FrostedCard variant="subdued">` — used for SaveToPrayerListForm, AI reflection nested box.
- `<Button variant="gradient" size="lg">` — used for "Help Me Pray" and "Save Entry" CTAs.
- `<Button variant="subtle" size="sm" | "md">` — used for every refreshed secondary action across both tabs.
- `<Button variant="ghost" size="sm">` — reused as-is for soft actions ("Cancel" on SaveToPrayerListForm, "Try a different prompt" link if it's a button).
- DailyHub main tab bar visual treatment — applied unchanged to the Journal Guided/Free Write toggle.
- Multi-bloom BackgroundCanvas — already mounted by DailyHub from 1A; no per-tab change.

**Existing components reused (do not reinvent):**

- `cn()` utility from `@/lib/utils` — class-name merging on the mic button conditional.
- `FrostedCard` (`frontend/src/components/homepage/FrostedCard.tsx`) — used as-is via `as`, `variant`, `eyebrow`, `className` props.
- `Button` (`frontend/src/components/ui/Button.tsx`) — used as-is via `variant`, `size`, `asChild`, `isLoading`, `disabled` props. Both `gradient` and `subtle` variants shipped in the pilot + 1A.
- `KaraokeText` (`frontend/src/components/daily/KaraokeText.tsx`) — preserved inside the migrated PrayerResponse FrostedCard.
- `CrisisBanner` (`frontend/src/components/daily/CrisisBanner.tsx`) — preserved as rolls-own alert idiom.
- `DevotionalPreviewPanel`, `VersePromptCard` — shared components used outside DailyHub; explicitly stay rolls-own.
- `FeatureEmptyState` — canonical empty-state primitive in SavedEntriesList; not migrated.

**Pre-existing inconsistencies acknowledged but NOT fixed in this spec (deferred):**

- Token system cleanups — focus-ring offset color drift, deprecated `Card.tsx`, unused `liquid-glass` utility (deferred from 1A).
- AuthModal redesign.
- `JournalSearchFilter` visual treatment — separate visual decision, deferred.
- Crisis banner visual treatment — alert idiom, deferred.

**Reference points (context for /plan):**

- `_specs/dailyhub-1a-foundation-and-meditate.md` — defines the FrostedCard variant API in DailyHub context, the `Button variant="subtle"` shipped, the multi-bloom BackgroundCanvas, and the tab-bar color treatment that the Guided/Free Write toggle matches. **Read first.**
- `_specs/frostedcard-pilot-bible-landing.md` — defines the FrostedCard variant API and the `Button variant="gradient"` shipped originally.
- `_specs/frostedcard-iteration-1-make-it-pop.md` — canonical surface opacities and editorial polish patterns the DailyHub redesign builds on.
- `09-design-system.md` § "Textarea Glow Pattern" — current home of the white-glow pattern that this spec deprecates.
- `09-design-system.md` § "Round 3 Visual Patterns" + § "Daily Hub Visual Architecture".
- Aesthetic target: same FPU/Lovable visual energy as BibleLanding post-iteration-1 + Meditate tab post-1A — frosted cards lifted off a richly atmospheric canvas, primary CTAs as gradient showstoppers, secondary actions as quiet frosted pills, textarea as a violet-glowing frosted writing surface.

## Out of Scope

- **Devotional tab migration** — Spec 2.
- **Meditate tab migration** — already shipped in 1A.
- **DailyHub page shell, tab bar, hero greeting** — 1A.
- **`BackgroundCanvas` component** — already updated in 1A.
- **`Button` component** — already has `gradient` + `subtle` variants from 1A and the BibleLanding pilot.
- **`FrostedCard` component** — already shipped in pilot.
- **Shared callout components used outside DailyHub** — `DevotionalPreviewPanel`, `VersePromptCard` stay rolls-own.
- **Crisis banner** — alert idiom, stays rolls-own.
- **`KaraokeText`** — animation pattern, untouched.
- **Voice input recognition logic** — the visual mic button is refreshed; the speech recognition logic (Web Speech API integration, transcript handling, error states) is untouched.
- **Auto-play "The Upper Room" ambient scene logic** — untouched.
- **Draft autosave logic** (`wr_prayer_draft`, `wr_journal_draft`) — untouched.
- **`JOURNAL_MILESTONES` celebration toast trigger logic** — untouched.
- **`JournalSearchFilter`** — separate visual decision, deferred.
- **`FeatureEmptyState` (in SavedEntriesList)** — canonical empty-state primitive, not migrated.
- **Hero greeting / "Good Morning" section** — untouched (1A and earlier).
- **`Navbar`, `DailyAmbientPillFAB`, `SongPickSection`, `SiteFooter`** — untouched.
- **Other surfaces:** Homepage, Dashboard, PrayerWall, Settings, Insights, Music, MyBible, BibleReader, AskPage, RegisterPage — all post-DailyHub rollout phases.
- **AuthModal redesign** — separate spec.
- **Token system cleanups** — focus-ring offset color drift, deprecated `Card.tsx`, unused `liquid-glass` utility.
- **Playwright visual regression baseline** — no infrastructure exists yet; manual eyeball review on the affected routes is the verification path.
- **New localStorage keys, backend changes, API shapes, content changes:** None. Pure visual-system spec.
- **Crisis detection or AI safety guardrails** — none added or modified.
- **Tests with class-string assertions on the migrated cards** — verify per recon. Per the brief: most existing tests don't assert these class strings, but if any do, update to FrostedCard variant values. Behavioral tests (renders, click → navigation, auth modal triggers, draft autosave fires, crisis banner appears on keyword) MUST continue to pass unchanged.

## Testing

### `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`

Per recon, the existing tests are behavioral (renders crisis banner on keyword, autosave fires, generated prayer renders, action buttons fire callbacks). Verify by reading the file during execution. After migration:

- Behavioral tests MUST continue to pass unchanged.
- If any test asserts the rolls-own class string for the generated-prayer card (e.g., `bg-white/[0.06] backdrop-blur-sm border border-white/10`), update to assert the FrostedCard accent variant classes (`bg-violet-500/[0.08]`, `border-violet-400/45` per the iteration-1 accent-tier surface) and verify the eyebrow text "Your prayer" renders.
- If any test asserts the rolls-own white-glow textarea classes (`border-white/30`, `bg-white/[0.06]`, white shadow), update to assert the violet-glow classes (`border-violet-400/30`, `bg-white/[0.04]`, violet shadow).

### `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`

Per recon, existing tests are behavioral (Guided/Free Write toggle changes mode, crisis banner triggers, autosave fires, draft conflict dialog renders, milestones toast fires, FeatureEmptyState renders when empty). Verify by reading the file during execution.

- Behavioral tests MUST continue to pass unchanged.
- If any test asserts rolls-own classes on the textarea, draft-conflict dialog, or saved-entry articles, update to the new FrostedCard / violet-glow values.
- The Guided/Free Write toggle's existing role / aria assertions MUST continue to pass — this spec changes class strings only, not the semantic structure.

### `frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx`

Existing tests verify all 8 cards render, click triggers navigation, auth modal triggers when unauthed, carousel snap classes are present.

- Behavioral tests MUST continue to pass unchanged.
- If any test asserts rolls-own classes (`border-white/[0.12]`, `bg-white/[0.06]`, `backdrop-blur-sm`), update to FrostedCard default variant classes (`bg-white/[0.07]`, `border-white/[0.08]`).
- Carousel layout assertions (`w-[220px]`, `min-w-[220px]`, `flex-shrink-0`, `snap-center`, `sm:min-h-[260px]`) continue to pass — those classes are preserved on the className override.

### `frontend/src/components/daily/__tests__/SaveToPrayerListForm.test.tsx`

Existing tests verify form renders when triggered, fields save to prayer list, cancel hides the form.

- Behavioral tests MUST continue to pass unchanged.
- If any test asserts rolls-own wrapper classes, update to FrostedCard subdued variant classes.
- Save / Cancel button behavior (click handlers, validation) continues to pass — only the visual variant changes.

### `frontend/src/components/daily/__tests__/SavedEntriesList.test.tsx` (verify exists; if not, no test surgery needed)

If the file exists: behavioral tests (renders entries from localStorage, "Reflect on my entry" triggers AI reflection, reflection text renders) MUST continue to pass unchanged. If any test asserts rolls-own entry-article or reflection-box classes, update to FrostedCard default / subdued variant classes.

### `frontend/src/components/daily/__tests__/PrayerInput.test.tsx` (if exists)

Existing tests verify textarea autosave, voice mic button toggles, "Help Me Pray" submits.

- Behavioral tests MUST continue to pass unchanged.
- If any test asserts the white-glow textarea classes, update to violet-glow values (per §1).
- If any test asserts the rolls-own "Help Me Pray" button (`bg-white text-hero-bg`), update to assert the gradient variant treatment OR convert to a behavioral assertion (button is rendered, clicking calls submit handler).
- The `isLoading={isSubmitting}` binding replaces whatever existing manual-spinner pattern the rolls-own button had — if a test asserts the manual spinner, update to assert the Button component's `aria-busy="true"` when loading.

### `frontend/src/components/daily/__tests__/JournalInput.test.tsx` (if exists)

Symmetric to PrayerInput.test.tsx. Behavioral tests pass unchanged; class-string assertions update to violet-glow + gradient + subtle Button variants.

### `frontend/src/components/daily/__tests__/PrayerResponse.test.tsx` (if exists)

Behavioral tests (renders prayer text via KaraokeText, action buttons fire callbacks) pass unchanged. If class-string assertions exist on the prayer card or action buttons, update to FrostedCard accent + Button subtle variants.

### Class-string drift discipline

The recon flagged most of these test files as not asserting card / textarea class strings — the migration is structural, not test-surgery-heavy. /plan should verify each file by reading during recon and only update assertions where they actually exist. Don't fabricate test changes that aren't needed.

## Acceptance Criteria

### Violet-glow textarea pattern

- [ ] PrayerInput textarea uses the violet-glow class string verbatim per §1 (`border-violet-400/30`, `bg-white/[0.04]`, dual violet shadow `rgba(167,139,250,0.18)` / `rgba(167,139,250,0.10)`, focus `border-violet-400/60` + `ring-violet-400/30`, placeholder `white/40`)
- [ ] JournalInput textarea uses the same violet-glow class string verbatim per §1 (matches PrayerInput exactly)
- [ ] White-glow class string (`border-white/30`, `bg-white/[0.06]`, white shadow, `placeholder:white/50`) no longer appears on either textarea

### PrayerInput migration

- [ ] PrayerInput textarea behavior preserved: voice-input mic positioning, draft autosave to `wr_prayer_draft`, crisis-banner integration, `ref`, `onChange`, `placeholder` text, wrapper structure all unchanged
- [ ] PrayerInput "Help Me Pray" button uses `<Button variant="gradient" size="lg" type="submit" disabled={!isValid || isSubmitting} isLoading={isSubmitting}>`
- [ ] `isLoading` binding correctly reflects the existing submission state; rolls-own manual spinner (if any) is removed
- [ ] `import { Button } from '@/components/ui/Button'` is present
- [ ] PrayerInput quick-prompt chips use `<Button variant="subtle" size="sm" type="button">`; `onClick` handlers preserved exactly; flex-wrap container preserved; aria labels preserved

### PrayerResponse migration

- [ ] PrayerResponse generated-prayer card uses `<FrostedCard as="article" variant="accent" eyebrow="Your prayer" className="mb-6">`
- [ ] `import { FrostedCard } from '@/components/homepage/FrostedCard'` is present
- [ ] KaraokeText reveal animation, prayer body content, attribution rendered inside FrostedCard unchanged
- [ ] PrayerResponse action buttons (Copy / Read Aloud / Save / Share) use `<Button variant="subtle" size="sm">`; `onClick` handlers, `aria-label` props, conditional rendering (e.g., Save hidden when not authed) all preserved

### GuidedPrayerSection migration

- [ ] All 8 guided-prayer cards use `<FrostedCard as="button" variant="default" onClick={handleSessionClick} className="relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center sm:min-h-[260px]">`
- [ ] Auth-modal-trigger logic for unauthenticated users preserved verbatim on the onClick branch
- [ ] `active:scale-[0.98]` removed from the className override (FrostedCard provides it internally)
- [ ] "X min" duration pill inside each card stays rolls-own, unchanged
- [ ] Mobile/desktop carousel snap layout works unchanged (visual regression check during manual verification)

### SaveToPrayerListForm migration

- [ ] SaveToPrayerListForm wrapper uses `<FrostedCard as="div" variant="subdued" className="mt-4">`
- [ ] Save button uses `<Button variant="subtle">`
- [ ] Cancel button uses `<Button variant="ghost">`
- [ ] Form-field rendering, save-and-cancel handlers, validation logic all preserved

### Journal Guided / Free Write toggle

- [ ] Toggle outer container uses `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`
- [ ] Active button uses `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`
- [ ] Inactive button uses `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`
- [ ] Each button carries `min-h-[44px]`, `rounded-full`, `transition-all`, `duration-base`, `motion-reduce:transition-none`, `active:scale-[0.98]`
- [ ] Existing role / aria pattern (`role="tab"` + `role="tablist"` OR `aria-pressed`) preserved exactly

### JournalInput migration

- [ ] Guided prompt card stays rolls-own (`rounded-lg border-l-2 border-primary bg-white/[0.06] p-6`) — explicitly NOT migrated
- [ ] "Try a different prompt" inside guided prompt card: refreshed to `<Button variant="ghost" size="sm">` if currently a button; left as plain text link if currently an `<a>` (no structural change forced)
- [ ] JournalInput textarea behavior preserved: auto-expand, voice-input mic positioning, crisis-banner integration, draft autosave to `wr_journal_draft`, `onChange` handlers all unchanged
- [ ] Voice mic button uses `<Button variant="subtle" size="sm">` with absolute-positioning class (matched to existing) and conditional `motion-safe:animate-mic-pulse border-red-400/60` when `isRecording`
- [ ] Voice mic button retains `aria-label` (`'Stop recording'` / `'Start voice input'`) and the speech-recognition click handler
- [ ] "Save Entry" button uses `<Button variant="gradient" size="lg" type="submit" disabled={!isValid} isLoading={isSaving}>`
- [ ] Existing disabled-state, validation, and `onClick`/`onSubmit` handlers preserved

### SavedEntriesList migration

- [ ] Saved entry articles use `<FrostedCard as="article" variant="default" className="p-4">` (the `p-4` override preserves compact padding)
- [ ] Entry timestamp, body, and inner content rendered unchanged
- [ ] Reflection nested box uses `<FrostedCard as="div" variant="subdued" className="mt-3 p-3">`
- [ ] AI reflection text rendered inside subdued FrostedCard unchanged
- [ ] "Reflect on my entry" button uses `<Button variant="subtle" size="sm">`; auth-gating logic, `onClick`, loading state preserved

### Draft conflict dialog migration

- [ ] Draft conflict dialog wrapper uses `<FrostedCard as="div" variant="default" className="mb-6">`
- [ ] "Start fresh" button uses `<Button variant="subtle" size="md">`
- [ ] "Keep my current draft" button uses `<Button variant="subtle" size="md">`
- [ ] Both action buttons retain existing `onClick` handlers and the destructive-vs-safe wording
- [ ] Dialog still mounts only on draft conflict (existing trigger logic preserved)

### Preserved logic across both tabs

- [ ] Voice input recognition logic untouched on both tabs
- [ ] Crisis banner integration on PrayerInput, JournalInput, and PrayerResponse preserved verbatim
- [ ] Draft autosave continues to work for logged-out and logged-in users on both tabs
- [ ] Auto-expand textarea logic on JournalInput preserved
- [ ] KaraokeText animation on PrayerResponse preserved
- [ ] Auto-play "The Upper Room" ambient scene logic on PrayTabContent preserved
- [ ] `JOURNAL_MILESTONES` celebration toast trigger logic preserved
- [ ] Auth-gating on guided prayer cards preserved verbatim
- [ ] All shared components left rolls-own: `DevotionalPreviewPanel`, `VersePromptCard`, `CrisisBanner`, `FeatureEmptyState`

### Documentation update

- [ ] `.claude/rules/09-design-system.md` § "Textarea Glow Pattern (Daily Hub Round 3)" updated to document the violet-glow pattern as canonical
- [ ] White-glow pattern moved to / referenced from the "Deprecated Patterns" table in `09-design-system.md`
- [ ] `09-design-system.md` "Daily Experience Components" entries for `PrayerInput.tsx` and `JournalInput.tsx` updated to say "violet textarea glow" instead of "white textarea glow"
- [ ] `_plans/recon/design-system.md` (if it carries a textarea-glow snapshot) updated to match — or noted as "no textarea section to update"

### Tests

- [ ] `pnpm tsc --noEmit` passes (typecheck clean)
- [ ] `pnpm test` passes; no new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files)
- [ ] Behavioral tests in `PrayTabContent.test.tsx`, `JournalTabContent.test.tsx`, `GuidedPrayerSection.test.tsx`, `SaveToPrayerListForm.test.tsx`, and any `PrayerInput` / `JournalInput` / `PrayerResponse` / `SavedEntriesList` test files preserved and passing
- [ ] Class-string assertions on migrated cards / textareas (where they exist) updated to FrostedCard variant + violet-glow values
- [ ] No tests mock the entire `FrostedCard` or `Button` modules (would bypass variant rendering)

### Manual visual verification (eyeball review — no Playwright infrastructure yet)

On `/daily?tab=pray`:

- [ ] Textarea has visible violet glow when not focused; glow strengthens (border + shadow) when focused
- [ ] Quick-prompt chips render as subtle frosted pills — clicking inserts text into textarea
- [ ] "Help Me Pray" renders as the gradient showstopper (purple gradient pill, lg size, drop shadow, hover lift); clicking with an empty textarea is disabled
- [ ] After submission, the generated prayer card has a visible violet accent border + glow + "Your prayer" eyebrow with violet dot — KaraokeText reveal animation plays unchanged
- [ ] Action buttons (Copy / Read Aloud / Save / Share) below the prayer render as subtle frosted pills
- [ ] Guided prayer cards lift off the canvas in default tier treatment — carousel snap behavior works on mobile and desktop
- [ ] Clicking a guided prayer card while logged out triggers the auth modal (regression — gate preserved)
- [ ] SaveToPrayerListForm appears subdued when expanded; Save uses subtle, Cancel uses ghost

On `/daily?tab=journal`:

- [ ] Textarea has the same violet-glow treatment as Pray (focus state matches)
- [ ] Guided/Free Write toggle has the violet active pill matching DailyHub main tab bar
- [ ] Voice mic button is a subtle frosted pill in idle state; recording-state animation works (motion-safe only) with the violet/red border accent
- [ ] "Save Entry" renders as the gradient showstopper
- [ ] Saved entries (if any exist for the test account) render in default-tier FrostedCard with subdued nested AI-reflection boxes
- [ ] Draft conflict dialog (trigger by typing draft, refreshing, typing different content) shows default-tier FrostedCard with two subtle buttons
- [ ] Guided prompt card stays rolls-own (left-stripe accent on quiet surface — explicitly NOT migrated)
- [ ] FeatureEmptyState renders unchanged when no entries (regression — not migrated)

Regression checks:

- [ ] `/daily?tab=meditate` — 6 meditation cards still render correctly; tab bar still works; no layout regressions (1A surface)
- [ ] `/daily?tab=devotional` — content unchanged (Spec 2 territory); canvas + tab bar consistent with 1A
- [ ] `/bible` — BibleLanding renders correctly; multi-bloom canvas still atmospheric; pilot card variants unchanged
