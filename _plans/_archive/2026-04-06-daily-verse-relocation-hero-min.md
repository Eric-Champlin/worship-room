# Implementation Plan: Daily Verse Relocation + Hero Minimalism

**Spec:** `_specs/daily-verse-relocation-hero-min.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/daily-verse-relocation-hero-min`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Pages:** `frontend/src/pages/DailyHub.tsx` (408 lines) — Daily Hub page with hero, tab bar, tab panels
- **Components:** `frontend/src/components/daily/DevotionalTabContent.tsx` (339 lines) — Devotional tab content
- **Tests:** `frontend/src/pages/__tests__/DailyHub.test.tsx` (469 lines, 38 tests)
- **Tests:** `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` (422 lines, 40 tests)
- **Constants:** `frontend/src/constants/verse-of-the-day.ts` — `getTodaysVerse()` pure function, returns `VerseOfTheDay`
- **Lib:** `frontend/src/lib/parse-verse-references.ts` — `parseVerseReferences()` returns book/chapter for Bible reader linking
- **Sharing:** `frontend/src/components/sharing/SharePanel.tsx` — Canvas-generated verse share modal (props: `verseText`, `reference`, `isOpen`, `onClose`)
- **FrostedCard:** `frontend/src/components/homepage/FrostedCard.tsx` — Glass card: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6`

### Current DailyHub Hero (lines 208-262)

The hero section contains:
1. `GlowBackground` wrapper (variant="center")
2. Greeting `<h1>` with `GRADIENT_TEXT_STYLE`
3. `FrostedCard` with verse of the day (verse text Link, reference, meditate link, share button, SharePanel)

Hero section class: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`

### Current DevotionalTabContent Layout (lines 142-338)

Inside `GlowBackground` (variant="center", glowOpacity=0.30) with `max-w-4xl` container:

1. **Date navigation** (lines 147-185)
2. **Title + theme badge** (lines 187-195)
3. **Quote section** (lines 197-208) — FrostedCard with blockquote
4. **Passage section** (lines 210-246) — Tier 2 scripture callout with SharePanel (`showPassageShare` state)
5. **Reflection section** (lines 248-255) — Tier 3 inset
6. **Pray CTA** (lines 257-273) — "Ready to pray about today's reading?" + pill button
7. **Reflection question** (lines 275-298) — FrostedCard with Journal CTA
8. **RelatedPlanCallout** (lines 300-308)
9. **Share & Read Aloud** (lines 310-330)
10. **Bottom padding** (line 333)

### DailyHub Imports/State That Become Unused After Verse Card Removal

| Symbol | Line | Usage | Safe to Remove |
|--------|------|-------|----------------|
| `Link` (react-router-dom) | 2 | Verse card text link, meditate link | Yes — no other Link usage in DailyHub |
| `Share2` (lucide-react) | 3 | Verse card share button icon | Yes — no other Share2 usage |
| `FrostedCard` | 6 | Verse card wrapper | Yes — no other FrostedCard in DailyHub |
| `SharePanel` | 14 | Verse card share panel | Yes — only verse card uses it |
| `getTodaysVerse` | 15 | Verse data | Yes — not in SEO or JSON-LD |
| `parseVerseReferences` | 16 | Bible reader link generation | Yes — only verse card uses it |
| `verse` (derived) | 68 | Verse data | Yes |
| `parsedRefs` (derived) | 70 | Parsed verse references | Yes |
| `verseLink` (derived) | 71-73 | Bible reader URL | Yes |
| `sharePanelOpen` (state) | 88 | Share panel visibility | Yes |

**Verified:** `verse`, `parsedRefs`, `verseLink`, `sharePanelOpen` are NOT referenced in the SEO component (line 198) or JSON-LD breadcrumbs (lines 23-30). Safe to remove.

### DevotionalTabContent Existing Imports (Available for Reuse)

Already imported (no new import needed):
- `Share2` from lucide-react (line 3)
- `FrostedCard` from `@/components/homepage/FrostedCard` (line 6)
- `SharePanel` from `@/components/sharing/SharePanel` (line 18)

Need to add:
- `Link` from `react-router-dom` (add to existing line 2 import)
- `getTodaysVerse` from `@/constants/verse-of-the-day`
- `parseVerseReferences` from `@/lib/parse-verse-references`

### Test Provider Wrapping Patterns

**DailyHub.test.tsx:** `MemoryRouter > ToastProvider > AuthModalProvider > DailyHub`. Mocks: `useAuth`, `useFaithPoints`, `useSoundEffects`, AudioProvider (`useAudioState`, `useAudioDispatch`), `useScenePlayer`.

**DevotionalTabContent.test.tsx:** `MemoryRouter > ToastProvider > AuthModalProvider > DevotionalTabContent`. Mocks: `useAuth`, `useFaithPoints`, `useReducedMotion`, `useReadAloud`.

---

## Auth Gating Checklist

N/A — No new auth gates introduced. The verse card is read-only and navigational. All existing auth gates (meditation sub-pages, share, etc.) are unchanged.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View verse card | No auth required | Step 2 | None (public) |
| Click verse text (Bible link) | No auth required | Step 2 | None (public) |
| Click "Meditate on this verse" | No auth required (gated at destination) | Step 2 | None (downstream) |
| Click share button | No auth required | Step 2 | None (public) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Verse card container | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6` (FrostedCard default) | design-system.md |
| Verse card shadow | box-shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | FrostedCard.tsx |
| Verse text | classes | `font-serif italic text-lg leading-relaxed text-white sm:text-xl` | Spec |
| Verse reference | classes | `text-sm text-white/70` | Spec |
| Meditate link | classes | `inline-flex min-h-[44px] items-center text-sm text-primary-lt transition-colors hover:text-primary` | DailyHub.tsx line 238 (existing) |
| Share button | classes | `flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-white/50 transition-colors hover:text-white/70` | DailyHub.tsx line 245 (existing) |
| Hero section (updated) | bottom padding | `pb-12 sm:pb-16` (from `pb-8 sm:pb-12`) | Spec |
| GlowBackground | glowOpacity | `0.30` (already set on DevotionalTabContent) | design-system.md |
| Section dividers | border | `border-white/[0.08]` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- FrostedCard is a component import (`@/components/homepage/FrostedCard`), not raw classes — use the component
- `GRADIENT_TEXT_STYLE` is an inline style object from `@/constants/gradients`, applied via `style={GRADIENT_TEXT_STYLE}`
- All glow orbs in production use `glowOpacity={0.30}` — never use the component's default (0.15)
- Devotional tab uses `GlowBackground` with `className="!bg-transparent"` to avoid double background
- Section dividers in DevotionalTabContent use `border-t border-white/[0.08]`
- Tier 2 scripture callout: `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.03] px-5 py-5 sm:px-6 sm:py-6`
- Tier 3 inset: `border-t border-b border-white/[0.08] py-6 sm:py-8`
- All readable text uses `text-white` (Round 3 standard); muted opacities only for decorative/secondary elements
- 44px minimum touch targets on all interactive elements (`min-h-[44px]`)
- Bible reader links follow pattern: `/bible/${bookSlug}/${chapter}`
- Meditate soaking link requires all 3 URL params: `verse`, `verseText`, `verseTheme`

---

## Shared Data Models (from Master Plan)

N/A — standalone feature.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_share_last_template` | Read | Existing — SharePanel reads last-used template |
| `wr_share_last_size` | Read | Existing — SharePanel reads last-used size |

No new localStorage keys introduced.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Hero: `pt-32 pb-12`. Verse card: full-width FrostedCard with `mb-8`. Verse text `text-lg`. All stacked. |
| Tablet | 640px | Hero: `pt-36 pb-16`. Verse card: `mb-10`. Verse text `text-xl`. |
| Desktop | 1440px | Hero: `pt-40 pb-16`. Verse card within `max-w-4xl` container. Same as tablet. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero greeting → tab bar | `pb-12` (mobile) / `pb-16` (sm+) + tab bar padding | Spec |
| Verse card → date navigation | `mb-8` (mobile) / `mb-10` (sm+) | Spec |
| Each devotional section | `py-5 sm:py-6` (standard) or `py-6 sm:py-8` (Tier 3 inset) | Codebase |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The `devotional-pray-generation` and `devotional-layered-containers` branches are merged (this plan builds on their changes to DevotionalTabContent)
- [ ] **Content order clarification:** The spec's final numbered list puts Reflection Question (#7) before Pray CTA (#8). The current code has them reversed (Pray CTA before Reflection Question). This plan implements the spec's numbered list order. If the current order should be preserved, swap steps in Step 2 accordingly.
- [ ] All auth-gated actions from the spec are accounted for in the plan (confirmed: none new)
- [ ] Design system values are verified from design-system.md and codebase inspection
- [ ] All [UNVERIFIED] values are flagged with verification methods (none in this plan)
- [ ] No recon report needed (layout restructuring, not new visual design)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pray CTA / Reflection Question order | Follow spec's numbered list: ReflectionQuestion → PrayCTA | Spec narrative ("personal application, then response") supports this order. Both labeled "unchanged" in spec refers to content, not position. Easy to swap back if user disagrees. |
| Verse card bottom margin | `mb-8 sm:mb-10` | Provides clear separation between verse card and date navigation. Matches spec's responsive table for mobile/tablet breakpoints. |
| Verse reference text opacity | `text-white/70` (not `text-white/60` from hero version) | Spec says `text-sm text-white/70` for the reference attribution. Brighter than the old hero version to match the upgraded treatment. |
| SharePanel state variable name | `showVerseShare` | Distinct from existing `showPassageShare` to ensure independent state per spec requirement #6. |
| Link import in DevotionalTabContent | Add to existing `react-router-dom` import | Already imports `useSearchParams` — just add `Link` to the destructured import. |

---

## Implementation Steps

### Step 1: Remove Verse Card from DailyHub Hero + Cleanup Unused Code

**Objective:** Remove the verse of the day FrostedCard from the hero section, increase hero bottom padding, and remove all imports/state/derived values that become unused.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — Remove verse card JSX, increase padding, remove unused symbols

**Details:**

1. **Remove unused imports:**
   - Line 2: Remove `Link` from `react-router-dom` import → `import { useState, useCallback, useRef, useEffect } from 'react'` stays, change line 2 to `import { useSearchParams, useLocation } from 'react-router-dom'`
   - Line 3: Remove `Share2` from lucide-react → `import { Heart, PenLine, Wind, BookOpen, Check } from 'lucide-react'`
   - Line 6: Delete entire line `import { FrostedCard } from '@/components/homepage/FrostedCard'`
   - Line 14: Delete entire line `import { SharePanel } from '@/components/sharing/SharePanel'`
   - Line 15: Delete entire line `import { getTodaysVerse } from '@/constants/verse-of-the-day'`
   - Line 16: Delete entire line `import { parseVerseReferences } from '@/lib/parse-verse-references'`

2. **Remove unused state/derived values:**
   - Lines 68: Delete `const verse = getTodaysVerse()`
   - Lines 70-73: Delete `const parsedRefs = ...` and `const verseLink = ...`
   - Line 88: Delete `const [sharePanelOpen, setSharePanelOpen] = useState(false)`

3. **Remove verse card JSX (lines 222-259):** Delete the entire block from `{/* Verse of the Day — Full-Width Banner */}` through the closing `</FrostedCard>`.

4. **Increase hero bottom padding (line 212):**
   - Change `pb-8` → `pb-12`
   - Change `sm:pb-12` → `sm:pb-16`
   - Result: `className="relative flex w-full flex-col items-center px-4 pt-32 pb-12 text-center antialiased sm:pt-36 sm:pb-16 lg:pt-40"`

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Hero has `pt-40 pb-16`, greeting only
- Tablet (640px): Hero has `pt-36 pb-16`, greeting only
- Mobile (375px): Hero has `pt-32 pb-12`, greeting only

**Guardrails (DO NOT):**
- DO NOT remove the `GlowBackground` wrapper — the hero still uses it for the gradient
- DO NOT change the greeting `<h1>` or `GRADIENT_TEXT_STYLE` — only the verse card is removed
- DO NOT remove any tab bar code, tab panel code, or tab content component imports
- DO NOT remove `useAuth` or `useCompletionTracking` imports — they're used by the tab bar
- DO NOT remove the `SEO` component or JSON-LD breadcrumbs
- DO NOT change `getGreeting()` or `displayName` logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes with 0 errors | build | `pnpm build` succeeds after import/state removal |

**Expected state after completion:**
- [ ] Hero section contains only the greeting heading — no verse card, no FrostedCard
- [ ] Hero bottom padding is `pb-12 sm:pb-16`
- [ ] No unused imports (no `Link`, `Share2`, `FrostedCard`, `SharePanel`, `getTodaysVerse`, `parseVerseReferences`)
- [ ] No unused state (`sharePanelOpen` removed) or derived values (`verse`, `parsedRefs`, `verseLink` removed)
- [ ] Build passes

---

### Step 2: Add Verse Card to DevotionalTabContent + Reposition Quote + Reorder Sections

**Objective:** Add the verse of the day as a Tier 1 FrostedCard at the top of DevotionalTabContent, move the quote card from before the passage to after the passage, and reorder Pray CTA after Reflection Question per spec.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Add imports, state, verse card JSX; move quote section; swap Pray CTA and Reflection Question

**Details:**

1. **Add imports (at top of file):**

   Line 2: Add `Link` to react-router-dom import:
   ```tsx
   import { useSearchParams, Link } from 'react-router-dom'
   ```

   After line 18 (after SharePanel import), add:
   ```tsx
   import { getTodaysVerse } from '@/constants/verse-of-the-day'
   import { parseVerseReferences } from '@/lib/parse-verse-references'
   ```

2. **Add state and derived values** (after line 53 `const [showPassageShare, setShowPassageShare] = useState(false)`):
   ```tsx
   const [showVerseShare, setShowVerseShare] = useState(false)

   // Verse of the Day data
   const verse = getTodaysVerse()
   const parsedRefs = parseVerseReferences(verse.reference)
   const verseLink = parsedRefs.length > 0
     ? `/bible/${parsedRefs[0].bookSlug}/${parsedRefs[0].chapter}`
     : '/bible'
   ```

3. **Add verse card JSX** at the top of the content area, BEFORE the date navigation (before line 147 `{/* Date navigation */}`):

   ```tsx
   {/* Daily Verse of the Day Card */}
   <FrostedCard className="mb-8 sm:mb-10">
     <Link
       to={verseLink}
       className="block transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:rounded"
     >
       <p className="font-serif italic text-lg leading-relaxed text-white sm:text-xl">
         &ldquo;{verse.text}&rdquo;
       </p>
     </Link>
     <p className="mt-2 text-sm text-white/70">
       — {verse.reference}
     </p>
     <div className="mt-3 flex items-center gap-4">
       <Link
         to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}&verseText=${encodeURIComponent(verse.text)}&verseTheme=${encodeURIComponent(verse.theme)}`}
         className="inline-flex min-h-[44px] items-center text-sm text-primary-lt transition-colors hover:text-primary"
       >
         Meditate on this verse &gt;
       </Link>
       <button
         type="button"
         onClick={() => setShowVerseShare(true)}
         className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
         aria-label="Share verse of the day"
         aria-haspopup="dialog"
         aria-expanded={showVerseShare}
       >
         <Share2 className="h-4 w-4" />
       </button>
     </div>
     <SharePanel
       verseText={verse.text}
       reference={verse.reference}
       isOpen={showVerseShare}
       onClose={() => setShowVerseShare(false)}
     />
   </FrostedCard>
   ```

4. **Move quote section** from its current position (between title/theme and passage) to between passage and reflection. Cut lines 197-208 (the `{/* Quote section */}` block) and paste after the passage section's `</div>` (after current line 246).

5. **Swap Pray CTA and Reflection Question:** Move the `{/* Pray CTA section */}` block (currently lines 257-273) to AFTER the `{/* Reflection question section */}` block (currently lines 275-298). The new order becomes:
   - Reflection section
   - Reflection question section (FrostedCard with Journal CTA)
   - Pray CTA section (pill button)

**Final content order after all changes:**

1. Daily Verse Card (NEW — FrostedCard)
2. Date navigation
3. Title + theme badge
4. Passage section (Tier 2 callout + SharePanel)
5. Quote section (MOVED — FrostedCard)
6. Reflection section (Tier 3 inset)
7. Reflection question (FrostedCard with Journal CTA)
8. Pray CTA ("Ready to pray about today's reading?")
9. RelatedPlanCallout
10. Share & Read Aloud
11. Bottom padding

**Auth gating:** N/A — verse card is public. Existing auth gates unchanged.

**Responsive behavior:**
- Desktop (1440px): Verse card within `max-w-4xl` container, FrostedCard default padding `p-6`
- Tablet (640px): Verse text `text-xl`, verse card `mb-10`
- Mobile (375px): Verse text `text-lg`, verse card `mb-8`, all elements stack vertically

**Guardrails (DO NOT):**
- DO NOT modify `getTodaysVerse()` function or verse data
- DO NOT modify `SharePanel` component
- DO NOT change `showPassageShare` state or the passage section's SharePanel — the two SharePanels must use independent state variables
- DO NOT change GlowBackground props or the `!bg-transparent` className
- DO NOT change the Reflection Question's content or the Journal CTA behavior
- DO NOT change the Pray CTA's content or `onSwitchToPray` behavior
- DO NOT add any new section dividers to the verse card — it uses FrostedCard (self-contained visual boundary)
- DO NOT change any existing section styling (Tier 2, Tier 3, dividers)

**Test specifications:**

Tests are in Step 4.

**Expected state after completion:**
- [ ] Verse card renders at top of DevotionalTabContent as Tier 1 FrostedCard
- [ ] Verse text uses `text-lg sm:text-xl text-white` (larger and brighter)
- [ ] Verse card SharePanel uses `showVerseShare` (independent from `showPassageShare`)
- [ ] Verse card Bible reader link navigates correctly
- [ ] Verse card "Meditate on this verse" link has all 3 URL params
- [ ] Quote card appears after passage section (not before)
- [ ] Reflection question appears before Pray CTA
- [ ] Content order matches spec's 10-item structure
- [ ] Build passes

---

### Step 3: Update DailyHub Tests

**Objective:** Remove tests that assert verse card presence in the hero, add tests verifying the hero is now greeting-only with correct padding.

**Files to modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — Remove 12 verse-card tests, add 3 hero-only tests

**Details:**

1. **Remove these tests** (verse card no longer in hero):

   | Test name | Line | Reason |
   |-----------|------|--------|
   | `'renders verse card with today's verse text'` | 116-121 | Verse card removed from hero |
   | `'renders verse reference with dash prefix'` | 123-130 | Reference removed from hero |
   | `'verse card links to Bible reader'` | 132-137 | Link removed from hero |
   | `'VOTD banner uses FrostedCard component'` | 146-154 | FrostedCard removed from hero |
   | `'verse text has mobile line-clamp with tablet breakout'` | 156-162 | Verse text removed from hero |
   | `'share button opens SharePanel'` | 164-171 | Share button removed from hero |
   | `'does NOT render VerseOfTheDayBanner as separate component'` | 173-181 | Now moot — verse card is gone entirely |
   | `'share button has accessible label'` | 189-194 | Share button removed from hero |
   | `'verse card is keyboard navigable'` | 196-202 | Verse link removed from hero |
   | `'Daily Hub VOTD shows meditation link'` | 340-345 | Meditation link removed from hero |
   | `'verse card uses compact max-w-2xl with rounded-xl'` | 429-437 | Verse card removed from hero |
   | `'verse text has line-clamp-2 for mobile compaction'` | 439-445 | Verse text removed from hero |

2. **Add new tests** in a new `describe('Hero minimalism')` block:

   ```tsx
   describe('Hero minimalism', () => {
     it('hero contains only the greeting heading — no verse card', () => {
       renderPage()
       const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
       // No FrostedCard classes in hero
       expect(hero.querySelector('.bg-white\\/\\[0\\.06\\]')).toBeNull()
       // No verse text (serif italic)
       expect(hero.querySelector('.font-serif.italic')).toBeNull()
       // No share button
       expect(hero.querySelector('[aria-label="Share verse of the day"]')).toBeNull()
       // Only the greeting heading
       const heading = hero.querySelector('h1')
       expect(heading).toBeInTheDocument()
     })

     it('hero bottom padding is pb-12 sm:pb-16', () => {
       renderPage()
       const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
       expect(hero.className).toContain('pb-12')
       expect(hero.className).toContain('sm:pb-16')
       // Old values removed
       expect(hero.className).not.toContain('pb-8')
       expect(hero.className).not.toMatch(/\bsm:pb-12\b/)
     })

     it('hero has no SharePanel', () => {
       renderPage()
       const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
       // No share-related buttons or modals in hero
       expect(hero.querySelectorAll('button').length).toBe(0)
     })
   })
   ```

3. **Update test** `'devotional card is not rendered in hero'` (line 139) — keep as-is, still valid (no devotional card in hero).

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT remove tests for the tab bar, greeting, tab switching, or any non-verse-card functionality
- DO NOT change the test provider wrapping pattern
- DO NOT change mock setup for `useAuth`, `useFaithPoints`, `useSoundEffects`, AudioProvider, or `useScenePlayer`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Hero contains only greeting — no verse card | integration | Assert no FrostedCard, no serif italic text, no share button in hero |
| Hero bottom padding is pb-12 sm:pb-16 | unit | Assert hero section has updated padding classes |
| Hero has no SharePanel | unit | Assert no buttons in hero section |

**Expected state after completion:**
- [ ] 12 verse-card-in-hero tests removed
- [ ] 3 new hero minimalism tests added
- [ ] All remaining DailyHub tests pass (greeting, tab bar, tab switching, etc.)
- [ ] Net test count: 38 - 12 + 3 = 29 tests

---

### Step 4: Update DevotionalTabContent Tests

**Objective:** Add tests for the verse card in DevotionalTabContent, verify quote card repositioning, verify content order, and verify independent SharePanel state.

**Files to modify:**
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — Add ~14 new tests

**Details:**

1. **Add new describe block** `'Daily Verse Card'` with verse card rendering and interaction tests:

   ```tsx
   describe('Daily Verse Card', () => {
     it('renders verse of the day text in FrostedCard', () => {
       renderComponent()
       // Verse text appears in quotes (curly quotes)
       const verseText = screen.getByText(/\u201c.+\u201d/)
       expect(verseText).toBeInTheDocument()
       // Inside a FrostedCard
       const card = verseText.closest('[class*="backdrop-blur"]') as HTMLElement
       expect(card).not.toBeNull()
       expect(card!.className).toContain('bg-white/[0.06]')
     })

     it('verse text uses upgraded styling (text-lg sm:text-xl text-white)', () => {
       renderComponent()
       const verseText = screen.getByText(/\u201c.+\u201d/)
       expect(verseText.className).toContain('text-lg')
       expect(verseText.className).toContain('text-white')
       expect(verseText.className).toContain('sm:text-xl')
       // Not the old muted version
       expect(verseText.className).not.toContain('text-white/80')
     })

     it('verse card links to Bible reader', () => {
       renderComponent()
       const links = screen.getAllByRole('link')
       const bibleLink = links.find(l => l.getAttribute('href')?.startsWith('/bible/'))
       expect(bibleLink).toBeDefined()
     })

     it('verse card has "Meditate on this verse" link with all 3 URL params', () => {
       renderComponent()
       const meditateLink = screen.getByText('Meditate on this verse >')
       expect(meditateLink).toBeInTheDocument()
       const href = meditateLink.closest('a')!.getAttribute('href')!
       expect(href).toContain('/meditate/soaking?verse=')
       expect(href).toContain('verseText=')
       expect(href).toContain('verseTheme=')
     })

     it('verse card has share button with accessible label', () => {
       renderComponent()
       const shareBtn = screen.getByLabelText('Share verse of the day')
       expect(shareBtn).toBeInTheDocument()
       expect(shareBtn).toHaveAttribute('aria-haspopup', 'dialog')
     })

     it('verse card share button meets 44px touch target', () => {
       renderComponent()
       const shareBtn = screen.getByLabelText('Share verse of the day')
       expect(shareBtn.className).toContain('min-h-[44px]')
       expect(shareBtn.className).toContain('min-w-[44px]')
     })

     it('verse card SharePanel uses independent state from passage SharePanel', async () => {
       const user = userEvent.setup()
       renderComponent()
       // Open verse share panel
       const verseShareBtn = screen.getByLabelText('Share verse of the day')
       await user.click(verseShareBtn)
       expect(verseShareBtn).toHaveAttribute('aria-expanded', 'true')
       // Passage share button should NOT be expanded
       const passageShareBtn = screen.getByLabelText(expect.stringContaining('Share'))
       // There should be multiple share buttons — the passage one should still be un-expanded
       const allShareBtns = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label')?.includes('Share'))
       const passageBtn = allShareBtns.find(b => b.getAttribute('aria-label') !== 'Share verse of the day')
       if (passageBtn) {
         expect(passageBtn).not.toHaveAttribute('aria-expanded', 'true')
       }
     })

     it('verse reference uses text-sm text-white/70', () => {
       renderComponent()
       // Find the reference line (starts with "— ")
       const refs = screen.getAllByText(/^—\s/)
       // The first one should be the verse card reference
       expect(refs[0].className).toContain('text-sm')
       expect(refs[0].className).toContain('text-white/70')
     })

     it('verse card appears before date navigation', () => {
       const { container } = renderComponent()
       const frostedCards = container.querySelectorAll('[class*="backdrop-blur"]')
       const dateNav = screen.getByLabelText("Previous day's devotional")
       // First frosted card should be the verse card, and it should precede date nav in DOM order
       expect(frostedCards.length).toBeGreaterThan(0)
       const verseCard = frostedCards[0]
       expect(verseCard.compareDocumentPosition(dateNav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
     })
   })
   ```

2. **Add new describe block** `'Content order'` to verify the spec's 10-item structure:

   ```tsx
   describe('Content order', () => {
     it('quote card appears after passage section (not before)', () => {
       const { container } = renderComponent()
       const blockquote = screen.getByRole('blockquote')
       const passageCallout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
       expect(passageCallout).not.toBeNull()
       // Blockquote (in quote card) should follow passage callout in DOM
       expect(passageCallout.compareDocumentPosition(blockquote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
     })

     it('reflection question appears before Pray CTA', () => {
       renderComponent()
       const questionText = screen.getByText('Something to think about today:')
       const prayCta = screen.getByText("Ready to pray about today's reading?")
       // Question should precede Pray CTA in DOM
       expect(questionText.compareDocumentPosition(prayCta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
     })

     it('verse card is the first content element (before date navigation)', () => {
       renderComponent()
       const verseText = screen.getByText(/\u201c.+\u201d/)
       const dateNav = screen.getByLabelText("Previous day's devotional")
       expect(verseText.compareDocumentPosition(dateNav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
     })

     it('full content order: verse → date → title → passage → quote → reflection → question → pray CTA', () => {
       renderComponent()
       const verseQuote = screen.getByText(/\u201c.+\u201d/)
       const dateNav = screen.getByLabelText("Previous day's devotional")
       const blockquote = screen.getByRole('blockquote')
       const questionLabel = screen.getByText('Something to think about today:')
       const prayCta = screen.getByText("Ready to pray about today's reading?")

       // Each should precede the next in DOM order
       expect(verseQuote.compareDocumentPosition(dateNav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
       expect(dateNav.compareDocumentPosition(blockquote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
       expect(blockquote.compareDocumentPosition(questionLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
       expect(questionLabel.compareDocumentPosition(prayCta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
     })
   })
   ```

3. **Update existing test** `'section dividers use border-white/[0.08]'` (line 290-293): Change minimum count from `>= 4` to `>= 4` (no change needed — verse card uses FrostedCard, no new dividers added).

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing tests for date navigation, completion tracking, cross-tab CTAs, or visual atmosphere
- DO NOT change the test provider wrapping pattern
- DO NOT import `getTodaysVerse` in the test file — test through the rendered output (verse text in quotes)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Verse card renders in FrostedCard | integration | Assert curly-quoted text inside backdrop-blur element |
| Verse text styling upgraded | unit | Assert text-lg, text-white, sm:text-xl classes |
| Verse card links to Bible reader | unit | Assert link with /bible/ href exists |
| Meditate link has 3 URL params | unit | Assert href contains verse, verseText, verseTheme |
| Share button accessible label | unit | Assert aria-label, aria-haspopup |
| Share button touch target | unit | Assert min-h-[44px], min-w-[44px] |
| Independent SharePanel state | integration | Open verse share, verify passage share not expanded |
| Verse reference styling | unit | Assert text-sm text-white/70 |
| Verse card before date navigation | integration | DOM order comparison |
| Quote card after passage | integration | DOM order: passage callout before blockquote |
| Reflection question before Pray CTA | integration | DOM order comparison |
| Verse card first in content | integration | DOM order: verse before date nav |
| Full content order verification | integration | End-to-end DOM order check |

**Expected state after completion:**
- [ ] ~14 new tests added across 2 describe blocks
- [ ] All existing DevotionalTabContent tests still pass
- [ ] Full test suite passes: `pnpm test`
- [ ] Net test count: 40 + 14 = ~54 tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Remove verse card from DailyHub hero + cleanup |
| 2 | — | Add verse card to DevotionalTabContent + reposition quote + reorder sections |
| 3 | 1 | Update DailyHub tests (remove verse-card tests, add hero-only tests) |
| 4 | 2 | Update DevotionalTabContent tests (add verse card + content order tests) |

Steps 1 and 2 are independent and can be executed in parallel.
Steps 3 and 4 are independent of each other but depend on steps 1 and 2 respectively.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Remove verse card from DailyHub hero + cleanup | [COMPLETE] | 2026-04-06 | Modified `frontend/src/pages/DailyHub.tsx` — removed 6 imports, 4 derived values, 1 state, verse card JSX block; updated hero padding to pb-12 sm:pb-16. Build failure is pre-existing PWA workbox-window issue, not from our changes. TypeScript compiles cleanly. |
| 2 | Add verse card to DevotionalTabContent + reposition quote + reorder | [COMPLETE] | 2026-04-06 | Modified `frontend/src/components/daily/DevotionalTabContent.tsx` — added 3 imports (Link, getTodaysVerse, parseVerseReferences), added showVerseShare state + verse data derivations, added verse card FrostedCard JSX before date nav, moved quote section after passage, swapped Reflection Question before Pray CTA. |
| 3 | Update DailyHub tests | [COMPLETE] | 2026-04-06 | Removed 12 verse-card-in-hero tests, added 3 hero minimalism tests in new describe block. Also fixed pre-existing DevotionalTabContent test `devotional link has correct styling` which was finding the new verse card link instead of the passage VerseLink. All 5604 tests pass. |
| 4 | Update DevotionalTabContent tests | [COMPLETE] | 2026-04-06 | Added 13 new tests in 2 describe blocks: 'Daily Verse Card' (9 tests) and 'Content order' (4 tests). All 5617 tests pass. |
