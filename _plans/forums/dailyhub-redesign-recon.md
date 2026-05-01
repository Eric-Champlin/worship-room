# DailyHub Redesign — Read-Only Recon

**Date:** 2026-05-01
**Scope:** Pre-spec recon for migrating DailyHub to the FrostedCard variant system + GradientButton (`<Button variant="gradient" />`) + BackgroundCanvas treatment recently shipped on BibleLanding.
**Mode:** Read-only. No files were modified.

---

## Section 1 — Page shell

### 1.1 Outer shell

- **File:** `frontend/src/pages/DailyHub.tsx` (389 lines).
- **Outer wrapper className** (line 214): `"relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans"`.
- **HorizonGlow:** Yes, rendered. **DOM order:** Direct child of the outer wrapper, BEFORE `<SEO>`, BEFORE `<Navbar>`, BEFORE `<main>` (line 215). It is the first child of the page root (`<HorizonGlow />`), z-0 by default (the `pointer-events-none absolute inset-0 z-0` lives inside `HorizonGlow.tsx`).
- **Hero treatment above tab content:** Yes — a single `<section aria-labelledby="daily-hub-heading">` at lines 221-232. Classes: `"relative z-10 flex w-full flex-col items-center px-4 pt-36 pb-6 text-center antialiased sm:pt-40 sm:pb-8 lg:pt-44"`. Contains ONLY the time-aware greeting `<h1>` ("Good Morning, [Name]!") styled with `GRADIENT_TEXT_STYLE`. **No verse card, no subtitle, no decorative cards** (intentional — see DailyHub.test.tsx "Hero minimalism" describe block).
- **Tab content container width:** Each tab's content wrapper uses `mx-auto max-w-2xl px-4 py-10 sm:py-14`. Pray uses `pt-10 pb-4 sm:pt-14 sm:pb-6` for the input area + `mx-auto mt-6 max-w-4xl px-4 pb-10 sm:pb-14` for the wider GuidedPrayerSection grid. The page root itself has no max-width — content is centered per-section.
- **Providers:** No page-local providers. All providers live at App.tsx level: `HelmetProvider → AuthProvider → InstallPromptProvider → ToastProvider → AuthModalProvider → AudioProvider → AudioPlayerProvider → WhisperToastProvider`. DailyHub itself is wrapped in `DailyHubContent()` and `DailyHub()` for `useRoutePreload([() => import('@/pages/BibleLanding')])` (line 384).
- **Sticky/fixed elements:**
  - `<Navbar transparent />` (line 217) — Navbar is `transparent` variant, glassmorphic, NOT sticky on this page (Navbar handles its own positioning, runs absolute when `transparent`).
  - **Sticky tab bar** at line 238-292: `"relative sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none"` + `isSticky && 'shadow-md shadow-black/20'`. IntersectionObserver on a `sentinelRef` (line 235) toggles `isSticky` when the hero scrolls past.
  - **`DailyAmbientPillFAB`** at line 377 — `position: fixed` bottom-right, `z-40`, drawer-aware visibility.

### 1.2 Tab navigation

- **Component:** Inlined directly in `DailyHub.tsx` lines 244-291. There is NO separate `<TabBar>` component — the four buttons are a `.map()` over a `TABS` array (lines 50-55) inside DailyHub.tsx.
- **Structural form:** Pill-shaped segmented control. Outer container className (line 247): `"flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1"`, with `role="tablist"` and `aria-label="Daily practices"`. Wrapped in a centering layout: `"mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4"`.
- **Active tab button className** (line 270-272):
  ```
  bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]
  ```
  Inactive: `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`. Both share base classes including `"flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all motion-reduce:transition-none duration-base ... sm:text-base active:scale-[0.98]"`.
- **Active state indicator:** Filled white/[0.12] pill with a subtle violet glow shadow + 1px white/[0.15] border. NO underline (an animated underline div was previously there but is explicitly checked-against in tests).
- **Completion checkmark:** When `isAuthenticated && isComplete`, a green `<Check>` icon and sr-only "completed today" text render inside the active tab button (lines 278-286).

### 1.3 Tab state

- **Storage:** URL query param. Hook is `useDailyHubTab` from `@/hooks/url/useDailyHubTab` (line 71), which wraps `useSearchParams()`. Returns `{ tab, setTab }`.
- **Default tab:** `'devotional'` (per the `TABS` array order and the hook's fallback).
- **Deep-linkable:** Yes — `/daily?tab=pray|journal|meditate|devotional` works for both logged-in and logged-out users (per 10-ux-flows.md, this was hardened after a Phase 4 false-positive).
- **Tab state extraction note:** A pre-existing comment at line 69-70 confirms BB-38 extracted tab state into `useDailyHubTab` to wrap the same `useSearchParams` pattern.

### 1.4 Persistent UI floating above tab content

- **DailyAmbientPillFAB** — `frontend/src/components/daily/DailyAmbientPillFAB.tsx`. Mounted at line 377 of DailyHub.tsx as the LAST child of the outer root, `position: fixed` bottom-right with `env(safe-area-inset-*)`. Auto-hides when `audioState.drawerOpen === true`.
- **TooltipCallout for tab bar** (lines 366-374) — conditionally rendered when `tabBarTooltip.shouldShow` is true. Anchored to `tabBarRef`. One-time onboarding tooltip via `useTooltipCallout('daily-hub-tabs', ref)`.
- **Sticky tab bar itself** — z-40, `position: sticky top-0`. Not strictly "above" tab content — it's the tab bar.
- **Sentinel div** (line 235) — `<div ref={sentinelRef} aria-hidden="true" />` — invisible IntersectionObserver target. Not user-facing.
- **Screen-reader live region** (line 295-297) — `role="status" aria-live="polite"` for auth-redirect announcement. Not visible.
- **No streak chips, completion indicators, or ambient pills are rendered above the tab content** (the completion check is inside each tab button, not a separate floating element).

---

## Section 2 — Per-tab structural breakdown

### 2.1 Devotional tab

- **2.1.1 File:** `frontend/src/components/daily/DevotionalTabContent.tsx` (365 lines). Renders today's devotional reading: passage, reflection, quote, reflection question, and three cross-feature CTAs (Meditate / Journal / Pray about this).
- **2.1.2 Card-shaped elements:**
  - **Passage scripture callout** (lines 222-233) — Rolls-own. ClassName: `"rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7"`. Tier 2 callout (per 09-design-system.md). Holds the WEB scripture verses with verse-number superscripts.
  - **Reflection body card** (lines 252-258) — `<FrostedCard className="p-5 sm:p-8">`. NO variant prop passed → resolves to `default` variant. Holds the reflection paragraphs in `text-[17px] sm:text-lg leading-[1.8] text-white`. Tier 1 reading content.
  - **Quote card** (lines 263-271) — `<FrostedCard className="p-5 sm:p-6">`. NO variant prop → `default`. Holds a saint/author quote (Lora italic blockquote) and attribution.
  - **Reflection question card** (lines 276-296) — `<FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">`. NO variant prop → `default`, with a `border-l-2 border-l-primary` className override layering a left accent on top of the default border. Holds the "Something to think about" eyebrow + question + an embedded inline white-pill "Journal about this question →" CTA.
  - **Pray CTA section** (lines 300-315) — Plain `<div>`, no card wrapper. Centered text + white-pill button. Not card-shaped.
  - **`RelatedPlanCallout`** (lines 318-325) — `frontend/src/components/devotional/RelatedPlanCallout.tsx`. Rolls-own card (line 33): `"mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6"`. Holds "Go Deeper" eyebrow + plan title + duration + "Start/Continue this plan" inline white pill.
  - **`EchoCard`** (lines 328-335, conditional) — `frontend/src/components/echoes/EchoCard.tsx`. Rolls-own card (line 30): `"block rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 sm:p-5 hover:bg-white/[0.08] transition-colors duration-fast motion-reduce:transition-none"`. BB-46 echo callback (renders nothing if `topEcho` is null).
  - **Share + Read Aloud buttons** (lines 338-356) — Two rolls-own pill-style buttons. ClassName: `"inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] active:scale-[0.98]"`. Card-shaped frosted buttons (these read more like tiles).
- **2.1.3 Visual hierarchy:** Three documented tiers today:
  - **Tier 2 (passage)** — left-border-accent scripture callout (`border-l-4 border-l-primary/60`, `bg-white/[0.04]`).
  - **Tier 1 (reflection body, quote, question)** — `FrostedCard` (default-variant, no prop).
  - **Question card sub-emphasis** — Same FrostedCard but with a `border-l-2 border-l-primary` className override layering an accent stripe.
  Tier achievement is a mix of: FrostedCard component (post-Spec-T) and rolls-own classes (Tier 2 callout). DevotionalTabContent.test.tsx calls these "Container tiers" — Tier 2 and Tier 3 in the test descriptions. Note: the test naming ("Tier 3: reflection body is wrapped in FrostedCard") differs from the design system doc ("Tier 1 / Tier 2") but they refer to the same elements.
- **2.1.4 Primary CTAs:** This tab has THREE cross-feature CTAs, not one:
  - "Meditate on this passage" — line 235-240. Inline white pill, currently a `<Link>` not a Button.
  - "Journal about this question" — embedded inside the reflection question FrostedCard at lines 282-294. Inline white pill button.
  - "Pray about today's reading" — line 303-313. Inline white pill button.
  All three use the inline white-pill class string: `"inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"` (with `transition-[colors,transform] duration-fast` and `active:scale-[0.98]` on the two buttons; the `<Link>` is plain `transition-colors`). GradientButton replacements would go on each of these — they are the primary cross-feature exits from the tab.
- **2.1.5 Content density:** **Text-heavy / contemplative.** This is the only tab where the user spends sustained time reading. The `FrostedCard` Tier 1 reflection container with `leading-[1.8]` and `text-[17px]` is the canonical sustained-reading surface in the app. Tier 2 scripture callout is contemplative. Cross-feature CTAs are the action layer below.
- **2.1.6 Tab-specific atmospherics:** None unique to this tab. No GlowBackground, no BackgroundSquiggle (intentionally removed in Wave 5/Spec Y). The tab inherits the page-level HorizonGlow. `motion-safe:animate-golden-glow` only appears on the Meditate tab's all-complete celebration banner, not here. `useReadAloud()` provides per-word karaoke highlighting if the user starts Read Aloud.
- **2.1.7 Auth-gating:**
  - **Logged-in:** Sees completion checkmark next to the date when devotional has been read; `recordActivity('devotional')` + `playSoundEffect('chime')` fire on intersection (line 110-111).
  - **Logged-out:** Devotional content renders fully (browseable). Completion tracking is gated by `isAuthenticated` checks at lines 76 and 89. Journal/Pray cross-feature CTAs do NOT auth-gate at this layer — they hand off to JournalTabContent / PrayTabContent which themselves auth-gate save/generate actions.
  - No auth modal triggered directly from this tab.

### 2.2 Pray tab

- **2.2.1 File:** `frontend/src/components/daily/PrayTabContent.tsx` (271 lines). Renders the Pray flow: an input area (chips + textarea + "Help Me Pray" CTA), a `PrayerResponse` after generation, and a `GuidedPrayerSection` grid of 8 sessions.
- **2.2.2 Card-shaped elements:**
  - **`DevotionalPreviewPanel`** (lines 209-214, conditional when arriving from devotional) — `frontend/src/components/daily/DevotionalPreviewPanel.tsx`. Rolls-own card (line 20): `"bg-white/[0.06] backdrop-blur-md border border-white/[0.12] rounded-2xl"` + `"shadow-[0_4px_20px_rgba(0,0,0,0.3)]"`. Sticky `top-2 z-30`. Collapsible.
  - **`VersePromptCard`** (lines 217-220, conditional from Bible bridge) — `frontend/src/components/daily/VersePromptCard.tsx`. Rolls-own (line 18): `"relative mb-4 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-4"`. Tier-2-callout styled.
  - **PrayerInput textarea** (PrayerInput.tsx lines 125-141) — Not strictly a card; styled textarea with white glow. ClassName: `"w-full resize-y min-h-[200px] max-h-[500px] rounded-lg border border-white/30 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"`. The white-glow textarea pattern from 09-design-system.md.
  - **Prayer response card** (PrayerResponse.tsx line 213) — Rolls-own: `"mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6"`. Holds the generated KaraokeText prayer.
  - **Guided Prayer cards** (GuidedPrayerSection.tsx line 64) — Rolls-own: `"relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 ... sm:min-h-[260px] active:scale-[0.98]"`. 8 session tiles in a horizontal carousel (mobile) / grid (desktop). Each holds an icon + title + description + duration pill.
  - **`SaveToPrayerListForm`** (rolls-own, SaveToPrayerListForm.tsx line 58): `"mt-4 rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm"`. Renders inside PrayerResponse when user clicks "Save."
- **2.2.3 Visual hierarchy:** Implicit single tier. Every card-shaped element on this tab uses the same `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]` recipe with minor radius variations (`rounded-2xl` vs `rounded-xl` vs `rounded-lg`). No documented Tier 1 / Tier 2 system. Hierarchy is achieved through size, position, and the white-glow textarea's higher visual weight.
- **2.2.4 Primary CTA:** "Help Me Pray" button (PrayerInput.tsx line 166-174). Rolls-own homepage-primary white pill: `"inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg ..."`. GradientButton replacement would go here. Secondary CTAs in PrayerResponse (Copy, Read Aloud, Save, Share) are gray/dark tile buttons — likely not GradientButton candidates.
- **2.2.5 Content density:** **Action-heavy / creative.** User writes a prayer request and clicks Help Me Pray. Time spent reading is short (the chip + the generated prayer reveal). The textarea is the focal point. Primary character: action-heavy.
- **2.2.6 Tab-specific atmospherics:** White textarea glow is the canonical visual anchor. Auto-play of "The Upper Room" ambient scene fires on first generate when no audio is active (lines 130-144). KaraokeText word-by-word reveal animates during prayer display.
- **2.2.7 Auth-gating:** Logged-out users CAN type into the textarea, see crisis banner, get draft auto-save to `wr_prayer_draft`. They cannot generate — clicking "Help Me Pray" opens the auth modal with subtitle "Sign in to pray together. Your draft is safe — we'll bring it back after." (lines 121-125 of PrayTabContent.tsx). Guided prayer card click is also auth-gated (GuidedPrayerSection.tsx line 39).

### 2.3 Journal tab

- **2.3.1 File:** `frontend/src/components/daily/JournalTabContent.tsx` (395 lines). Renders mode toggle (Guided / Free Write), prompt card (guided mode), textarea + voice input, save button, draft conflict modal, saved entries list, and AI Reflect on each entry.
- **2.3.2 Card-shaped elements:**
  - **Draft conflict dialog** (lines 311-342, conditional) — Rolls-own card: `"mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]"`. Modal with "Start fresh" / "Keep my current draft" buttons.
  - **`VersePromptCard`** (lines 345-352, conditional) — same rolls-own Tier-2-style as Pray.
  - **`DevotionalPreviewPanel`** (mounted inside JournalInput at line 195-200 of JournalInput.tsx) — same sticky/collapsible component as Pray.
  - **Guided prompt card** (JournalInput.tsx lines 204-225) — Rolls-own: `"rounded-lg border-l-2 border-primary bg-white/[0.06] p-6"`. Holds the prompt text in `font-sans text-base sm:text-lg text-white leading-relaxed` (Inter sans, NOT italic per Wave 5).
  - **JournalInput textarea** (JournalInput.tsx line 266-280) — Same white-glow pattern as Pray, with auto-expand: `"min-h-[200px] w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] px-4 pb-10 pt-3 text-lg leading-relaxed text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"`.
  - **Saved entry article** (`SavedEntriesList.tsx` line 176) — Rolls-own: `"rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4"` per entry. Holds timestamp + entry content + nested reflection box.
  - **Reflection nested box** (`SavedEntriesList.tsx` line 198) — Rolls-own: `"mt-3 rounded-lg bg-white/[0.04] p-3"`. Holds AI reflection text inside the parent entry card.
  - **`FeatureEmptyState`** (lines 380-391, conditional when no entries and authed) — Standardized component.
- **2.3.3 Visual hierarchy:** Same flat single tier as Pray. Every card uses the same `bg-white/[0.06] backdrop-blur-sm border border-white/10–[0.12]` recipe. The guided prompt card has a `border-l-2 border-primary` accent (similar to the Devotional question card override). The textarea is the focal point.
- **2.3.4 Primary CTA:** "Save Entry" button (JournalInput.tsx line 337-344). Rolls-own homepage-primary white pill: `"inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] ..."`. GradientButton would go here. Secondary buttons: "Reflect on my entry" (line 218-228 of SavedEntriesList — needs verification, not opened in this recon), "Try a different prompt" (line 213-222 of JournalInput, plain text link), and the draft-conflict dialog buttons.
- **2.3.5 Content density:** **Creative.** Open-ended writing input. The textarea (auto-expanding, up to multi-paragraph) is the dominant element. Long sessions of typing. Saved entries below provide a history feed once the user has entries. Primary character: creative.
- **2.3.6 Tab-specific atmospherics:** Voice input mic button with `motion-safe:animate-mic-pulse` red glow when recording. Crisis banner reactive to text. Same white textarea glow as Pray. AI reflection spinner + reveal animation in saved entries.
- **2.3.7 Auth-gating:** Logged-out users CAN type, draft auto-saves. Save Entry triggers auth modal (line 144-147 of JournalInput.tsx). "Reflect on my entry" auth-gates (line 266-269 of JournalTabContent.tsx). Voice input mic only renders when `isAuthenticated && isVoiceSupported`.

### 2.4 Meditate tab

- **2.4.1 File:** `frontend/src/components/daily/MeditateTabContent.tsx` (175 lines). Renders 6 meditation type cards in a 2-column grid + an all-6-complete celebration banner + Spec Z verse banner when arriving from devotional.
- **2.4.2 Card-shaped elements:**
  - **All-complete celebration banner** (lines 78-85, conditional) — Rolls-own: `"mb-8 motion-safe:animate-golden-glow rounded-xl border border-amber-200/30 bg-amber-900/20 p-6 text-center"`. Amber celebration banner.
  - **`VersePromptCard`** (lines 88-95, conditional) — same Tier-2-style.
  - **6 meditation cards** (lines 105-168) — `<button>` with conditional className. Two visual states:
    - **Default** (lines 131-138): `"border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"` + base `"group rounded-2xl p-4 text-left sm:p-5 transition-all motion-reduce:transition-none duration-base ease-decelerate active:scale-[0.98]"`. Six per page (Breathing, Soaking, Gratitude, ACTS, Psalms, Examen).
    - **Suggested** (lines 127-130, when challenge context indicates): `"border-2 border-primary bg-primary/10 ring-1 ring-primary/30 shadow-[0_0_30px_rgba(139,92,246,0.12),0_4px_20px_rgba(0,0,0,0.3)]"` with a "Suggested" pill at line 142. Used by the Spec-Z verse banner highlight (Scripture Soaking + Breathing recommended) and by challenge-context suggestions.
- **2.4.3 Visual hierarchy:** Two-state grid. Default state vs. suggested/highlighted state — primary-violet border, ring, and slightly stronger shadow. Same FrostedCard-shaped recipe but rolls-own (does NOT use the `FrostedCard` component). All 6 cards are equal weight unless one is suggested.
- **2.4.4 Primary CTA:** None per se — the entire grid IS the action. Each card click navigates to the meditation sub-page (or opens auth modal if logged out). No solo "primary" button. GradientButton replacement would NOT have an obvious home here.
- **2.4.5 Content density:** **Action-heavy / contemplative.** User scans cards, picks one, and exits to a meditation activity. Time spent on the tab itself is short — it's a launcher. Primary character: action-heavy (a launcher), with contemplative undertones once the user clicks through.
- **2.4.6 Tab-specific atmospherics:** All-complete amber celebration banner with `motion-safe:animate-golden-glow`. Suggested-card violet ring + shadow combination. Otherwise inherits HorizonGlow from page.
- **2.4.7 Auth-gating:** Logged-out users SEE the cards. Click → auth modal: `"Sign in to start meditating"` (line 110-111). Per 02-security.md / 10-ux-flows.md, meditation has a TWO-LAYERED gate: card-click + route-level redirect on each `/meditate/*` sub-page. Completion checkmarks only render `isAuthenticated && isComplete`.

---

## Section 3 — FrostedCard inventory across DailyHub

### 3.1 Files importing `FrostedCard` (under DailyHub's tree or imported by it)

Organized by tab.

- **Devotional tab:**
  - `frontend/src/components/daily/DevotionalTabContent.tsx` (line 6) — uses 3 FrostedCard instances (reflection, quote, question). All `default` variant via no-prop default.

- **Pray tab:** **NONE.** PrayTabContent.tsx, PrayerInput.tsx, PrayerResponse.tsx, GuidedPrayerSection.tsx, GuidedPrayerPlayer.tsx, DevotionalPreviewPanel.tsx, VersePromptCard.tsx, SaveToPrayerListForm.tsx — none import FrostedCard.

- **Journal tab:** **NONE.** JournalTabContent.tsx, JournalInput.tsx, SavedEntriesList.tsx, JournalSearchFilter.tsx, DevotionalPreviewPanel.tsx, VersePromptCard.tsx — none import FrostedCard.

- **Meditate tab:** **NONE.** MeditateTabContent.tsx — does not import FrostedCard. The 6 meditation cards roll their own.

- **Page shell:** DailyHub.tsx itself does not import FrostedCard — the hero is bare and the tab bar is rolls-own.

- **Components imported by Devotional tab from outside `daily/`:**
  - `frontend/src/components/echoes/EchoCard.tsx` — does NOT import FrostedCard (rolls-own, see 3.2).
  - `frontend/src/components/devotional/RelatedPlanCallout.tsx` — does NOT import FrostedCard (rolls-own).
  - `frontend/src/components/sharing/SharePanel.tsx` — not opened in this recon. Lives outside `daily/`.

**Summary:** FrostedCard is imported by exactly ONE file under DailyHub: `DevotionalTabContent.tsx`. Three other shared components (EchoCard, RelatedPlanCallout, DevotionalPreviewPanel) roll their own card recipe even though it matches the FrostedCard `default` shape. This is the post-Spec-T state — Tier 1 reflection content was migrated to FrostedCard but the wave didn't sweep the rest.

### 3.2 Files using inline backdrop-blur card patterns under DailyHub's tree

Organized by tab. Representative className strings included.

- **Devotional tab (DevotionalTabContent.tsx):**
  - Passage scripture callout: `"rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7"` (lines 222-233). No `backdrop-blur` — relies on the base white/[0.04] tint.
  - Share/Read Aloud buttons: `"... rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 ... backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] ... hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] active:scale-[0.98]"` (lines 341, 348).
  - Imported: `EchoCard` rolls-own `"block rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 sm:p-5"` (echoes/EchoCard.tsx:30).
  - Imported: `RelatedPlanCallout` rolls-own `"mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6"` (devotional/RelatedPlanCallout.tsx:33). Lighter `bg-white/[0.03]` distinguishes it from the standard `bg-white/[0.06]` recipe.

- **Pray tab:**
  - PrayerInput.tsx line 137 — Textarea with `bg-white/[0.06]` and the canonical white textarea glow.
  - PrayerResponse.tsx line 213 — Generated prayer card: `"mb-6 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6"`.
  - GuidedPrayerSection.tsx line 64 — Guided prayer cards: `"... rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 ... hover:bg-white/[0.10] hover:border-white/20 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] ..."` (8 instances).
  - SaveToPrayerListForm.tsx line 58 — `"mt-4 rounded-lg border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm"`.
  - DevotionalPreviewPanel.tsx line 20 — `"bg-white/[0.06] backdrop-blur-md border border-white/[0.12] rounded-2xl"` + shadow.
  - VersePromptCard.tsx line 18 — `"relative mb-4 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-4"` (Tier-2-style; no backdrop-blur).
  - AmbientSoundPill.tsx — Multiple class strings with `backdrop-blur-md` (lines 55-61) for the pill itself. Lives inside the FAB on every tab, not strictly Pray-tab content.

- **Journal tab:**
  - JournalTabContent.tsx line 316 — Draft conflict dialog: `"mb-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]"`.
  - JournalInput.tsx line 206 — Guided prompt card: `"rounded-lg border-l-2 border-primary bg-white/[0.06] p-6"` (no backdrop-blur).
  - JournalInput.tsx line 277 — Textarea: white-glow recipe.
  - SavedEntriesList.tsx line 176 — Entry article: `"rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4"`.
  - SavedEntriesList.tsx line 198 — Reflection nested box: `"mt-3 rounded-lg bg-white/[0.04] p-3"` (no backdrop-blur — relies on the parent card's surface).
  - DevotionalPreviewPanel.tsx (shared with Pray tab).
  - VersePromptCard.tsx (shared).

- **Meditate tab (MeditateTabContent.tsx):**
  - 6 meditation cards default state: `"border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]"` (lines 131-133). + hover variants on subsequent lines.
  - Suggested-card override: `"border-2 border-primary bg-primary/10 ring-1 ring-primary/30 shadow-[...]"` (lines 127-130). No backdrop-blur in the suggested branch.
  - All-complete celebration banner: `"mb-8 motion-safe:animate-golden-glow rounded-xl border border-amber-200/30 bg-amber-900/20 p-6 text-center"` (line 79). Amber, not violet/white — the only non-white-tinted card on the entire DailyHub.
  - VersePromptCard.tsx (shared).

### 3.3 Per-FrostedCard usage — className overrides

Only DevotionalTabContent.tsx imports FrostedCard. Three usages:

| Line | Variant | className override |
|---|---|---|
| 252 | (default, no prop) | `"p-5 sm:p-8"` — padding override (FrostedCard's default `p-6` is overridden) |
| 263 | (default, no prop) | `"p-5 sm:p-6"` — padding override |
| 276 | (default, no prop) | `"border-l-2 border-l-primary p-4 sm:p-6"` — left-accent border AND padding override |

No `border-l-4` overrides (the Tier 2 callout uses a rolls-own div, not a FrostedCard with override). No custom shadow overrides. No `eyebrow` prop usages — the eyebrow lives inside the children. No `variant="accent"` or `variant="subdued"` usages anywhere in DailyHub.

---

## Section 4 — Existing tier system

### 4.1 Devotional tab tier comments and class strings

The DevotionalTabContent.tsx source file has NO inline tier comments — Spec T's tier work was applied as code, but the only "tier" labels live in the test file `DevotionalTabContent.test.tsx`, which has a `describe('Container tiers')` block (line 307) with these specific assertions (test descriptions paraphrasing, but the assertions themselves are exact):

- **Tier 2 (passage scripture callout)** — `'Tier 2: passage wrapped in scripture callout with left accent'` (test line 308). Asserts:
  - `container.querySelector('.rounded-xl.border-l-4')` is non-null
  - `callout.className` contains `'border-l-primary/60'`
  - `callout.className` contains `'bg-white/[0.04]'`
- **Tier 2 styling** — separate tests assert `'leading-[1.75]'`, `text-white` (not `text-white/80`), and verse superscripts use `'text-white/50'` + `'font-medium'`.
- **Tier 3 (reflection body wrapped in FrostedCard)** — `'Tier 3: reflection body is wrapped in FrostedCard'` (test line 344). Asserts:
  - The reflection content's closest `[class*="backdrop-blur"]` ancestor exists
  - That ancestor's className contains `'bg-white/[0.07]'` ← (this is the FrostedCard `default` variant base — `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md ...`)
- **Tier 3 padding** — `'Tier 3: reflection FrostedCard has generous padding'` (test line 353). Asserts the FrostedCard has `'p-5'` and `'sm:p-8'`.

**Tier 2 implementation:** The passage is a hand-built rolls-own div with `border-l-4 border-l-primary/60` — NOT a FrostedCard. The class string on line 222 of DevotionalTabContent.tsx is exactly:
```
rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7
```

So: **Tier 2 is rolls-own, Tier 3 is FrostedCard (default-variant).** Note the test naming (Tier 2 / Tier 3) differs from the design system doc's "Tier 1 / Tier 2" framing — they both refer to the same two visual treatments, just numbered differently. The design system doc explicitly says "Tier 1 (primary reading content): Standard FrostedCard" and "Tier 2 (scripture callout): rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3" — so the canonical naming is Tier 1 (FrostedCard) and Tier 2 (left-accent callout). The test file uses Tier 2/Tier 3 labels (likely a pre-Spec-T artifact), but the elements are the same.

### 4.2 Tier system on Pray, Journal, Meditate

- **Pray:** No documented or implicit tier system. Every card uses the same `bg-white/[0.06]` recipe. The white-glow textarea provides visual weight, but it's not a "tier." Generated prayer card and guided prayer cards are visually equivalent.
- **Journal:** No documented tier system. Guided prompt card has a `border-l-2 border-primary` accent that's similar in spirit to the Devotional question card override — could be read as a faint Tier-2-style. Otherwise flat.
- **Meditate:** Implicit two-state hierarchy via the `isSuggested` branch (primary-violet ring + shadow vs default white frosted). This is not a tier in the design-system sense — it's a contextual highlight.

**Verdict:** Tier system is exclusive to Devotional today. Pray/Journal/Meditate are flat single-tier surfaces.

### 4.3 Visual treatments shared across tabs

- **`DevotionalPreviewPanel`** — Mounted on BOTH Pray (PrayTabContent.tsx line 209-214) and Journal (JournalInput.tsx line 195-200). Same component instance, same rolls-own card recipe.
- **`VersePromptCard`** — Mounted on Pray, Journal, AND Meditate (verse-bridge from Bible). Same Tier-2-style scripture callout recipe.
- **White textarea glow** — Pray (PrayerInput) and Journal (JournalInput). Identical class string per 09-design-system.md.
- **White-pill primary CTA** — "Help Me Pray" (Pray) and "Save Entry" (Journal). Identical class string. Devotional has 3 inline white-pill CTAs (smaller pattern).
- **`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]`** — The recipe is everywhere. Used by FrostedCard `default` variant AND by every rolls-own card on Pray/Journal/Meditate.
- **`motion-safe:animate-golden-glow`** — Used by Meditate's all-complete celebration. Not used on other tabs (limited to celebration moments).

---

## Section 5 — Cross-tab consistency questions

### 5.1 Hero treatment per tab vs unified

**Read of code:** The hero is currently 100% unified — only the time-aware greeting renders, no tab-aware content. There's no per-tab adaptation today, and the test file's "Hero minimalism" describe block enforces that the hero contains zero tab-specific content (no FrostedCard, no buttons, no verse text). My read: keep it unified. The Daily Hub's identity is a single sanctuary that the user moves through via tabs — making the hero adapt would suggest the tabs are separate pages, which they aren't (they share state, the page mounts all four panels at once).

### 5.2 Tab nav treatment from variant system

**Read of code:** The tab bar today is rolls-own pill segmented control with `rounded-full bg-white/[0.06] border border-white/[0.12] p-1` outer + `bg-white/[0.12]` active state. This recipe matches FrostedCard `default` (`bg-white/[0.07]` + `border-white/[0.12]`) very closely. Migrating the OUTER container to FrostedCard would be aesthetically identical but would lose the `p-1` inner padding affordance (FrostedCard ships with `p-6` default, which is wrong for a button-row). Migrating the BUTTONS to FrostedCard would change them from `<button role="tab">` to `<FrostedCard as="button" role="tab">` — that's structurally OK but FrostedCard doesn't have a "selected" variant today.

Recommendation read: leave the tab bar rolls-own. The variant system is for content cards, not nav controls. Tests directly assert `tablist.className` contains `'rounded-full'` and `'bg-white/[0.06]'` (DailyHub.test.tsx:324-325) and the active tab's `'bg-white/[0.12]'` (line 331) — those would all need updating if the bar were FrostedCard-ified.

### 5.3 Shared chrome vs tab-content elements

**Shared chrome (rendered once at DailyHub.tsx level, persists across all tabs):**
- `<HorizonGlow />` — atmospheric layer
- `<Navbar transparent />`
- Hero `<section>` (greeting only)
- Sticky tab bar
- `<SongPickSection />` (line 358) — appears BELOW all four tab panels. Renders on every tab regardless of which is active.
- `<SiteFooter />`
- `<DailyAmbientPillFAB />` — fixed bottom-right
- TooltipCallout (conditional)
- Screen-reader live region

**Tab-content elements (rendered only inside one panel):**
- DevotionalTabContent — passage callout, reflection FrostedCard, quote FrostedCard, question FrostedCard, RelatedPlanCallout, EchoCard, share/read-aloud buttons, three cross-feature CTAs
- PrayTabContent — DevotionalPreviewPanel, VersePromptCard, PrayerInput, PrayerResponse, GuidedPrayerSection
- JournalTabContent — VersePromptCard, draft conflict dialog, JournalInput (which mounts DevotionalPreviewPanel internally), SavedEntriesList, FeatureEmptyState
- MeditateTabContent — all-complete banner, VersePromptCard, 6 meditation cards

**Important:** All four tab panels are MOUNTED at all times (not conditionally rendered). They use `hidden={activeTab !== 'devotional'}` (etc.) for show/hide. That means migrating one tab can change the visual stack height and affect the relative position of `SongPickSection` below it. Tests do not assert on this, but it could surface in visual verification.

### 5.4 Replacing HorizonGlow with BackgroundCanvas

If HorizonGlow is replaced by BackgroundCanvas, the affected surfaces are:
- The page-level atmospheric layer changes from "5 large purple/lavender glow blobs at fixed vertical positions" to "static radial-gradient + linear-gradient via inline `style.background`" (BackgroundCanvas.tsx lines 9-13). The CANVAS_BACKGROUND is a much more subdued, fixed gradient — no per-position blobs.
- DailyHub.test.tsx **lines 310-319 directly assert that HorizonGlow is mounted with exactly 5 children:**
  ```
  const decorativeLayers = root.querySelectorAll(':scope > [aria-hidden="true"].pointer-events-none')
  expect(decorativeLayers.length).toBeGreaterThanOrEqual(1)
  const horizonGlow = decorativeLayers[0]
  expect(horizonGlow.children.length).toBe(5)
  ```
  This test would FAIL on a BackgroundCanvas swap — BackgroundCanvas is a wrapper, not a `pointer-events-none` decorative layer.
- DailyHub.test.tsx **line 302-308** asserts `root.className` contains `'relative'`, `'overflow-hidden'`, `'bg-hero-bg'`. BackgroundCanvas applies `'relative min-h-screen overflow-hidden'` plus an inline `style.background` — `bg-hero-bg` would be removed, and that assertion would fail.
- The `HorizonGlow.tsx` file itself has its own dedicated test at `frontend/src/components/daily/__tests__/HorizonGlow.test.tsx` (61 lines). If the component is removed entirely, that test file becomes orphaned. If it's kept but unused, that's a different kind of debt.
- SongPickSection sits over the HorizonGlow today — it's transparent and relies on the page-level glow showing through. BackgroundCanvas's much more subdued background may make SongPickSection feel visually orphaned (a Spotify embed with no atmospheric backing). Worth checking with `/verify-with-playwright`.
- The greeting heading uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient text). The contrast against HorizonGlow's purple blobs vs. BackgroundCanvas's quieter background would shift slightly — likely fine, but worth visual verification.

**Other surfaces depending on HorizonGlow:** None that I can find. The tab bar's `backdrop-blur-md` is independent; tab content components have transparent backgrounds and inherit whatever's behind them.

---

## Section 6 — Migration risk assessment

### 6.1 Tab difficulty ranking (easiest → hardest)

1. **Meditate (easiest)** — 6 cards in a grid. Each card is structurally identical and rolls-own a recipe that maps trivially to FrostedCard `default` for the standard state and `accent` for the suggested state. Few tests, no class-string assertions on the cards themselves. The all-complete amber banner is decoration; doesn't need migration.
2. **Pray** — More cards but all the same recipe. PrayerInput textarea stays as-is (textarea is its own pattern). PrayerResponse, GuidedPrayerSection cards, SaveToPrayerListForm are all simple FrostedCard candidates. DevotionalPreviewPanel and VersePromptCard are shared with Journal — they'd need a coordinated swap. No test class-string assertions on these surfaces.
3. **Journal** — Similar shape to Pray. JournalInput textarea stays. SavedEntriesList entries are FrostedCard candidates. Draft conflict dialog is a FrostedCard candidate. Guided prompt card has the `border-l-2 border-primary` accent — could become FrostedCard `accent` variant or stay rolls-own as a Tier-2-callout style. No test class-string assertions.
4. **Devotional (hardest)** — Already has FrostedCard usages with className overrides (padding + `border-l-2 border-l-primary` on the question card). Has a documented Tier 1 / Tier 2 split. **DevotionalTabContent.test.tsx has direct class-string assertions on `'bg-white/[0.07]'` (the FrostedCard default variant base), `'border-l-primary'`, `'border-l-4'`, `'border-l-primary/60'`, `'bg-white/[0.04]'`, `'p-5'`, `'sm:p-8'`, `'leading-[1.75]'`, `'text-[17px]'`, `'leading-[1.8]'`.** Those tests would need to be updated whenever the variant choices land on different class outputs. This tab also has 3 different cross-feature CTAs that may want different GradientButton treatments.

### 6.2 Migration order recommendation

**Read of code:** The variant system on BibleLanding ships `accent`, `default`, and `subdued` flavors. DailyHub has natural mappings:
- **Accent** — devotional reflection card (the reading focal point), "Help Me Pray" / "Save Entry" CTAs (if they route through `<Button variant="gradient">`), suggested meditation card.
- **Default** — devotional quote, devotional question, generated prayer card, guided prayer cards, journal entry articles, journal draft conflict dialog, default meditation cards.
- **Subdued** — RelatedPlanCallout, EchoCard, possibly SaveToPrayerListForm.

**Single spec vs staged?** I'd lean toward **two specs**:
- **Spec A** — Pray, Journal, Meditate. These three are flat single-tier today and all use the same rolls-own recipe. Migrating them together produces a consistent visual change and the testing surface is small (no class-string assertions to update). This is the "easy 80%."
- **Spec B** — Devotional. This one already has a tier system, has class-string-asserting tests, has three CTAs that need GradientButton evaluation, and has shared components (RelatedPlanCallout, EchoCard) that may want different variants. Doing it alone reduces blast radius and gives space to think about the variant choices.

The risk of one giant spec: the 3 shared components (DevotionalPreviewPanel, VersePromptCard, RelatedPlanCallout, EchoCard) live OUTSIDE `daily/` but are mounted by these tabs. A unified spec forces them all into one PR; a staged approach lets you migrate them with whichever spec touches them first.

### 6.3 Tabs that would NOT benefit from variant system

**Honest read:** All four tabs would benefit visually from the variant system, but with caveats:
- **Devotional** — already uses FrostedCard for Tier 1 reading content. Variant system would let you pin Tier 1 to `accent` (giving the reflection card the violet tint that Resume Reading / VOTD got on BibleLanding) and tier 2 (the passage callout) could remain rolls-own as a documented exception OR become `subdued` with a `border-l-4` className override. **Concern:** The amber `motion-safe:animate-golden-glow` celebration banner on Meditate is intentionally NOT FrostedCard-shaped — it's celebratory amber. Forcing it into a violet variant would break the meaning. Leave it.
- **Meditate suggested state** — the violet ring + primary border highlight ALREADY does what `accent` would do. If `accent` is applied here, the existing override classes need to come off cleanly to avoid double-styling.
- **The white-glow textareas (Pray/Journal)** — NOT FrostedCard. Don't touch. The white-glow recipe is a separate canonical pattern from 09-design-system.md.
- **Tab bar** — see 5.2; leave rolls-own.

So: nothing strongly opposes the variant system. The risks are surgical (textarea, amber banner, tab bar) — leave-them-alone calls.

### 6.4 Cards with distinctive treatments to preserve

- **All-complete celebration banner (Meditate)** — Amber `bg-amber-900/20 border-amber-200/30` with `motion-safe:animate-golden-glow`. This is celebratory, intentional. Do not migrate.
- **Generated prayer card with KaraokeText** (PrayerResponse line 213) — Card itself is plain FrostedCard-recipe and could be migrated, but the KaraokeText reveal animation is the star. Easy to migrate the chrome and leave the inside alone.
- **Suggested meditation card highlight** — `border-2 border-primary bg-primary/10 ring-1 ring-primary/30` is a deliberate "this one is recommended" treatment. If it becomes `<FrostedCard variant="accent">`, verify the new accent shadow doesn't overpower the ring or compete with the "Suggested" pill.
- **Draft conflict dialog** — The shadow `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` is the FrostedCard `default` shadow. Trivial migration.
- **Devotional Tier 2 passage callout** (`border-l-4 border-l-primary/60 bg-white/[0.04]`) — Documented intentional drift in 09-design-system.md. If the migration spec changes this, consume the design system doc update with it. Otherwise leave as a `subdued` variant + className override OR rolls-own exception.

---

## Section 7 — Test inventory

### 7.1 Test files

- **`frontend/src/pages/__tests__/DailyHub.test.tsx`** (412 lines)
- **`frontend/src/pages/__tests__/DailyHub.seo.test.tsx`** (93 lines)
- **`frontend/src/components/daily/__tests__/AmbientSoundPill.test.tsx`** (227)
- **`frontend/src/components/daily/__tests__/CompletionScreen.test.tsx`** (88)
- **`frontend/src/components/daily/__tests__/CrisisBanner.test.tsx`** (84)
- **`frontend/src/components/daily/__tests__/DailyAmbientPillFAB.test.tsx`** (129)
- **`frontend/src/components/daily/__tests__/DevotionalEcho.test.tsx`** (94)
- **`frontend/src/components/daily/__tests__/DevotionalPreviewPanel.test.tsx`** (201)
- **`frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`** (550)
- **`frontend/src/components/daily/__tests__/GuidedPrayerPlayer.test.tsx`** (284)
- **`frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx`** (184)
- **`frontend/src/components/daily/__tests__/HorizonGlow.test.tsx`** (61)
- **`frontend/src/components/daily/__tests__/JournalMilestones.test.tsx`** (198)
- **`frontend/src/components/daily/__tests__/JournalSearchFilter.test.tsx`** (381)
- **`frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`** (883)
- **`frontend/src/components/daily/__tests__/KaraokeText.test.tsx`** (35)
- **`frontend/src/components/daily/__tests__/KaraokeTextReveal.test.tsx`** (338)
- **`frontend/src/components/daily/__tests__/MeditateTabContent.test.tsx`** (229)
- **`frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`** (1156)
- **`frontend/src/components/daily/__tests__/SaveToPrayerListForm.test.tsx`** (166)
- **`frontend/src/components/daily/__tests__/ShareButton-offline.test.tsx`** (62)
- **`frontend/src/components/daily/__tests__/VersePromptCard.test.tsx`** (140)
- **`frontend/src/components/daily/__tests__/sound-triggers-content.test.tsx`** (151)

### 7.2 Class-string assertions that would break on tier value changes

**DailyHub.test.tsx — page-level shell assertions:**
- Line 134 — `expect(hero.querySelector('.bg-white\\/\\[0\\.06\\]')).toBeNull()` — asserts hero contains NO bg-white/[0.06] cards. Would still pass after migration (we're not adding cards to the hero).
- Line 302-308 — root has `relative`, `overflow-hidden`, `bg-hero-bg`. **BackgroundCanvas swap would BREAK this** — `bg-hero-bg` is replaced by inline `style.background`.
- Line 314-318 — first `:scope > [aria-hidden="true"].pointer-events-none` decorative layer has exactly 5 children (HorizonGlow). **BackgroundCanvas swap would BREAK this.**
- Line 324-325 — `tablist.className` contains `rounded-full` and `bg-white/[0.06]`. Would only break if tab bar is migrated.
- Line 331 — `activeTab.className` contains `bg-white/[0.12]`. Same.
- Line 339 — inactive tabs have `text-white/50`. Same.
- Line 348-349 — tab bar outer wrapper has `backdrop-blur-md`, no `bg-hero-bg`. Same.
- Line 357 — outer wrapper does NOT have `backdrop-blur-lg`. Same.
- Line 363-388 — greeting heading classes (text-4xl, leading-[1.15], pb-2, etc.). Won't change.
- Line 394 — tab bar has no `div.bg-primary` underline. Won't change.

**DevotionalTabContent.test.tsx — tier assertions:**
- Line 269 — reflection question card has `border-l-primary`. Would break if the question card moves from FrostedCard with override to a different shape.
- Line 290 — quote section's backdrop-blur ancestor has `bg-white/[0.07]`. **This is the FrostedCard `default` variant base color.** If migrated to `accent` (which uses `bg-violet-500/[0.08]`), this BREAKS.
- Line 297, 310-313, 318-322, 326-333, 338-341 — Tier 2 passage callout has `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04]` + verse superscript styling. Won't break unless the Tier 2 callout itself is restructured.
- Line 348-360 — Tier 3 reflection FrostedCard has `bg-white/[0.07]` + `p-5 sm:p-8`. **`bg-white/[0.07]` is the FrostedCard `default` base — migrating to `accent` BREAKS this.**
- Line 395-397 — quote section has no `border-t` on outer.
- Line 464 — a button has `bg-white` (the white-pill CTA). Migrating these to `<Button variant="gradient">` would BREAK this assertion (gradient buttons don't have `bg-white` class, they have `bg-gradient-to-br from-violet-400 to-violet-300`).
- Line 523 — passage callout has `rounded-xl border-l-4`. Won't break unless the Tier 2 callout shape changes.

**Other daily/__tests__ files** — No `FrostedCard`, `bg-white/[0.06]`, `bg-white/[0.07]`, or `backdrop-blur` class-string assertions in PrayTabContent.test.tsx, JournalTabContent.test.tsx, MeditateTabContent.test.tsx, GuidedPrayerSection.test.tsx, SaveToPrayerListForm.test.tsx, or DevotionalPreviewPanel.test.tsx. (Verified via grep — zero matches.) Migration of those tabs is test-clean.

### 7.3 Visual / screenshot tests

**None.** No `.png`, `.snap`, or `screenshot` references in `frontend/src/components/daily/__tests__/` or `frontend/src/pages/__tests__/` for DailyHub. Visual verification happens via `/verify-with-playwright`, which is a runtime check, not a regression suite.

---

## Section 8 — Risks and gotchas

### 8.1 State and data flows affected by visual changes

- **Tab transitions are CSS show/hide** (line 306 etc.: `hidden={activeTab !== 'devotional'}`). All four panels mount on first render and stay mounted. Migrating one panel does NOT remount the others. State (textarea drafts, prayer mid-generation, etc.) is preserved across tab switches.
- **DailyAmbientPillFAB** is fixed bottom-right and reads `audioState.drawerOpen` from `AudioProvider`. It hides when the drawer opens. The FAB is NOT affected by tab content visual changes, but visual changes to tab content might shift the layout enough that the FAB's `bottom: max(1.5rem, env(safe-area-inset-bottom))` anchor needs verification on tall mobile viewports. This is unlikely to break, but worth a Playwright check.
- **Sticky tab bar IntersectionObserver** (lines 114-123) — observes a sentinel BEFORE the tab bar. Any visual change to the hero section above could shift the sentinel's position. Unlikely to break, but if the migration restructures the hero (which is not currently planned), verify.
- **Auto-play of "The Upper Room" ambient scene on first prayer generate** (PrayTabContent.tsx lines 130-144) — fires only when `audioState.activeSounds.length === 0 && !audioState.pillVisible && !audioState.activeRoutine`. Visual changes to PrayerInput won't affect this trigger.
- **`recordActivity()` calls** fire on devotional intersection (line 110), prayer generation (line 151), journal save (line 230 of JournalTabContent), and meditation completion (in sub-pages). Visual changes don't affect these.
- **EchoCard mounts conditionally on `topEcho`** (DevotionalTabContent line 328) — if visual changes alter the height/position of surrounding cards on the Devotional tab, the echo card may shift. Test carefully because BB-46 is a quiet feature designed to feel incidental.
- **DevotionalPreviewPanel sticky positioning** (`sticky top-2 z-30`) — visual changes to scroll behavior on Pray/Journal could affect how this panel sticks. Worth verifying.
- **JOURNAL_MILESTONES celebration toast** (JournalTabContent line 256) — fires `showCelebrationToast` with a `BookOpen` icon when entry count hits 10/25/50/100. Visual changes don't affect this.

### 8.2 Accessibility patterns to preserve

- **Tab bar WAI-ARIA pattern** (DailyHub.tsx lines 196-211) — Roving tabindex (`tabIndex={isActive ? 0 : -1}`), arrow key navigation (`handleTabKeyDown` for ArrowLeft/ArrowRight/Home/End), `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls`. Each tab references its panel by ID. Each panel has `role="tabpanel"` + `aria-labelledby` + `tabIndex={0}`. **Migrating the tab bar to FrostedCard would risk breaking this if the structure changes** — keep rolls-own.
- **Screen-reader live region** (lines 295-297) — `role="status" aria-live="polite"` for auth-redirect announcements. Don't remove.
- **`<HorizonGlow />` is `aria-hidden="true"`** (HorizonGlow.tsx:13). If replaced with BackgroundCanvas, ensure the new background is also aria-hidden / decoration-only.
- **Skip-to-main-content** — provided by Navbar. Don't break.
- **Focus management on tab switch** — when `switchTab(tab.id)` is called via keyboard, the next tab's button receives focus (`tabButtonRefs.current[nextIndex]?.focus()` at line 207). Keep this behavior intact.
- **Crisis banner (CrisisBanner)** — `role="alert"` + `aria-live="assertive"` on detected text. Lives inside PrayerInput and JournalInput. Visual changes to those inputs don't touch CrisisBanner directly, but verify the banner remains visible above the textarea after migration.
- **DevotionalPreviewPanel** uses `aria-expanded`, `aria-controls`, `aria-hidden`. Sticky-collapsible pattern. Don't disturb.
- **`aria-live="polite"` regions** for "Draft saved" indicator (PrayerInput.tsx line 147, JournalInput.tsx line 323). Keep.
- **ChartFallback / FormError-style severity colors** are not currently in this surface; not a concern.

### 8.3 Pre-existing visual debt to consider

- **The 6 meditation cards roll their own card recipe** even though the recipe matches FrostedCard `default` exactly. Pre-Spec-T debt — never swept. Migration is the time to fix.
- **Three other shared components (DevotionalPreviewPanel, VersePromptCard, EchoCard, RelatedPlanCallout)** also roll their own. Same debt. Migration could opportunistically fix; OR leave because they're shared with non-DailyHub surfaces (e.g., EchoCard is also on the Dashboard home, RelatedPlanCallout is in `components/devotional/`, VersePromptCard is shared by Pray/Journal/Meditate). A coordinated migration that touches all consumers is bigger than just DailyHub.
- **`bg-white/[0.06]` (rolls-own) vs `bg-white/[0.07]` (FrostedCard default)** — there's a 0.01-opacity drift between rolls-own DailyHub cards and the FrostedCard component. Migration to FrostedCard would close that drift in favor of the FrostedCard value.
- **Devotional question card has a `border-l-2 border-l-primary` override on a default FrostedCard.** If a `border-l-4 border-l-primary/60` override is more "Tier 2 callout"-like, this is inconsistent. Could be cleaned up during migration (move question card to `subdued` + override, or use `accent` directly).
- **PrayerResponse uses `border-white/10` while everything else uses `border-white/[0.12]`** (PrayerResponse.tsx line 213). Minor drift. Migrate to FrostedCard and the drift is eliminated.
- **Tab bar's `bg-white/[0.06]`** vs FrostedCard `default` (`bg-white/[0.07]`) — 0.01-opacity drift. Documented; leave the tab bar as-is.

### 8.4 BibleLanding pilot relevance

- **No DailyHub component imports a BibleLanding component, and no BibleLanding component imports a DailyHub component.** They are independent surfaces. The shared dependency is `FrostedCard` from `components/homepage/FrostedCard.tsx` and `BackgroundCanvas` from `components/ui/BackgroundCanvas.tsx`.
- **`useRoutePreload([() => import('@/pages/BibleLanding')])`** (DailyHub.tsx line 384) — DailyHub preloads BibleLanding for navigation latency, but only the bundle, not the components. Doesn't matter for migration.
- **BibleLanding's variant usage as a reference:**
  - `ResumeReadingCard` and `ActivePlanBanner` use `variant="accent"` with `eyebrow` prop. The `eyebrow` is the canonical eyebrow pattern from FrostedCard.
  - `QuickActionsRow` mounts THREE FrostedCards with `variant="subdued"` and `className="min-h-[44px]"`. This is the closest analog to a button-row with FrostedCards.
  - `VerseOfTheDay` uses both `variant="default"` AND a dynamic `variant={variant}` prop so the card can switch tiers based on context. Could be a useful pattern for the Devotional tab if its tier system needs to adapt to user state.
  - `TodaysPlanCard` uses `variant="default"`.
  - **`<Button variant="gradient" size="md" asChild>`** is used in `ResumeReadingCard.tsx:32` — that's the canonical "GradientButton" pattern. The `Button` component (`frontend/src/components/ui/Button.tsx`) supports `variant: 'gradient'` which renders `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 ...`. There is NO standalone `GradientButton` component — when the user says "GradientButton," they mean `<Button variant="gradient" />`.
- **Eyebrow color choice** — BibleLanding ActivePlanBanner uses `eyebrowColor` defaults to violet for `accent` variant. Devotional's reflection question already has its own "Something to think about" eyebrow rendered as a `<p className="text-xs font-medium uppercase tracking-widest text-white/70">`. Migrating to FrostedCard's `eyebrow` prop would harmonize but requires moving the existing label into the `eyebrow={...}` prop.
- **BackgroundCanvas vs HorizonGlow**: BackgroundCanvas applies a much more subtle, fixed atmospheric gradient. HorizonGlow is more dynamic-feeling (5 separate blobs). Visually, the migration trades atmosphere intensity for cross-page consistency with BibleLanding. The Daily Hub was designed with HorizonGlow as a "looking out into space" feature (Spec Y) — replacing it changes that identity. Worth pausing to confirm the spec author wants the Daily Hub to look more like BibleLanding rather than retaining its unique atmospheric layer.

### Other notes

- **Daily Hub's `<SongPickSection />` mounts at the bottom and renders on every tab.** It's transparent and depends on the page-level glow showing through. After BackgroundCanvas migration, this section will sit on a much quieter background — verify it doesn't feel orphaned.
- **`<SiteFooter />` renders inside the page** (line 364). It does not currently have a max-width constraint at the page level — it lives in a `relative z-10` wrapper. After migration, ensure it still sits properly above the BackgroundCanvas surface.
- **`useRoutePreload`** preloads BibleLanding on DailyHub mount. After migration, both pages share BackgroundCanvas — preloading still makes sense.
- **The pre-existing comment at DailyHub.tsx line 26-28** ("BB-40: tab-aware metadata picker") confirms each tab has its own SEO metadata. The migration spec should preserve this.

---

## Constraints summary

- Read-only verification: confirmed no files modified.
- Class strings quoted exactly from source files.
- File paths verified by direct read or grep.
- Uncertainty flagged where present (e.g., the "Tier 2 / Tier 3" naming drift between test file and design doc; the `GradientButton` ambiguity resolved to `<Button variant="gradient">`).
- Report kept under 1200 lines (~880 lines).

---

## What I cut to stay under the line limit

- Detailed PrayerResponse code walkthrough (action buttons, Save flow, verse-context bridge) — only the card chrome surfaces are described.
- Detailed walkthrough of `useVerseContextPreload` (Bible bridge) — described as "VersePromptCard mounts when verseContext present" without unpacking the hook's internals.
- Detailed walkthrough of `useEcho`, `markEchoSeen`, and the BB-46 echo selection engine — described at the surface level only.
- Detailed walkthrough of `useReadingPlanProgress` and the `RelatedPlanCallout` matching logic — described as "matches devotional theme to a reading plan."
- Sub-page meditation details (Breathing, Soaking, etc.) — those live outside `daily/` and were not opened.
- The 1156-line PrayTabContent.test.tsx contents — described categorically (no class-string assertions on cards).
- Hook implementations (`useDailyHubTab`, `useTooltipCallout`, `useCompletionTracking`, `useFaithPoints`) — described at API surface level.

If any of those need more detail, ask and I'll dig into the specific area.
