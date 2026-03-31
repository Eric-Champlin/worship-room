# Implementation Plan: Bible Reader Engagement Bridges

**Spec:** `_specs/bible-reader-engagement-bridges.md`
**Date:** 2026-03-31
**Branch:** `claude/feature/bible-reader-engagement-bridges`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/pages/BibleReader.tsx`** — Main page component. Currently renders: hero → breadcrumb → chapter selector → audio controls → book completion card → content (VerseDisplay / ChapterPlaceholder / error / skeleton) → `ChapterNav` → cross-feature CTAs (plain links to `/daily?tab=pray` and `/daily?tab=journal` with no context passing). The cross-feature CTAs (lines 349-363) will be **replaced** by the new `ChapterEngagementBridge` component.
- **`frontend/src/components/bible/ChapterNav.tsx`** — Stateless prev/next chapter navigation. Uses `Link`, `ChevronLeft`, `ChevronRight` from lucide-react. Styled with `border-white/20`, `bg-white/10`, `text-white/70`, `min-h-[44px]`.
- **`frontend/src/constants/bible.ts`** — `BIBLE_BOOKS` array with `{ name, slug, chapters, testament, category, hasFullText }`. Display names: "Genesis", "1 Samuel", "Psalms", "Song of Solomon", "3 John", etc.
- **`frontend/src/pages/DailyHub.tsx`** — Reads URL params `context` and `prompt` on mount via `useRef(searchParams.get('context'))` and `useRef(searchParams.get('prompt'))`. Passes `initialContext` to `PrayTabContent` and `urlPrompt` to `JournalTabContent`. Cleans URL params after consuming.
- **`frontend/src/components/daily/PrayTabContent.tsx`** — Accepts `initialContext?: string | null` prop. Pre-fills textarea when `initialContext` is provided (line 63-67). Also reads `prayWallContext` and `challengeContext` from `location.state`.
- **`frontend/src/components/daily/JournalTabContent.tsx`** — Accepts `urlPrompt?: string | null` prop. When provided, switches to Guided mode and sets context prompt (lines 108-116). Also accepts `prayContext` prop for intra-DailyHub tab switching.
- **`frontend/src/pages/meditate/ScriptureSoaking.tsx`** — Reads `?verse=` query param. Matches against `verses.findIndex(v => v.reference === verseParam)`. Auth-gated at route level (redirects logged-out users to `/daily?tab=meditate`).
- **`frontend/src/pages/AskPage.tsx`** — Reads `?q=` query param. Auto-populates textarea and triggers submission.
- **`frontend/src/types/daily-experience.ts`** — `PrayContext` type: `{ from: 'pray' | 'devotional'; topic: string }`.

### Directory Conventions

- Components: `frontend/src/components/bible/` for Bible-specific components
- Tests: `frontend/src/pages/__tests__/BibleReader.test.tsx` (co-located test file)
- Component tests: `frontend/src/components/bible/__tests__/` (would be created)

### Styling Patterns

The Bible reader uses dark theme throughout:
- Page background: `bg-dashboard-dark`
- Hero: `ATMOSPHERIC_HERO_BG` (radial gradient with subtle purple glow over `#0f0a1e`)
- Content container: `mx-auto max-w-2xl px-4 sm:px-6`
- ChapterNav buttons: `border border-white/20 bg-white/10 text-white/70 min-h-[44px] rounded-lg`
- Existing cross-feature CTAs: `text-white/50 hover:text-white/80 text-sm`

### Test Patterns

- Vitest + React Testing Library
- `MemoryRouter` + `Routes` wrapping for route params
- Mock hooks: `useAuth`, `useBibleHighlights`, `useBibleNotes`, `useBibleProgress`, `useBibleAudio`, `useToast`, `useSoundEffects`, audio provider mocks
- Mock `loadChapter` returning resolved chapter data
- `waitFor` for async chapter loading assertions

---

## Auth Gating Checklist

**The CTA strip itself has NO auth gate.** All four buttons are visible and clickable for both logged-out and logged-in users. Target features handle their own auth gating.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View CTA strip | Always visible, no auth | Step 1 | None — renders unconditionally |
| Click Journal | Navigates; Journal tab's own auth gate fires on save | Step 2 | N/A (handled by JournalTabContent) |
| Click Pray | Navigates; Pray tab's own auth gate fires on generate | Step 2 | N/A (handled by PrayTabContent) |
| Click Ask | Navigates; Ask page ungated for first response | Step 2 | N/A (handled by AskPage) |
| Click Meditate | Navigates; ScriptureSoaking auth-gates at route level | Step 2 | N/A (handled by ScriptureSoaking) |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| CTA container | top border | `border-t border-white/10` | Spec: "subtle top border separator" |
| CTA container | spacing | `mt-12 pt-8 pb-4` | Match ChapterNav `mt-12` rhythm |
| CTA heading | font | Inter (font-sans), `text-sm sm:text-base`, `text-white/60` | design-system.md: secondary text ≥60% opacity |
| CTA buttons | background | `bg-white/5 hover:bg-white/10` | Spec + Dashboard Card Pattern |
| CTA buttons | border | `border border-white/10 rounded-xl` | Spec |
| CTA buttons | text | `text-white/80 hover:text-white` | Spec |
| CTA buttons | transition | `transition-colors` | Spec |
| CTA buttons | min height | `min-h-[44px]` | 44px touch targets |
| CTA buttons | padding | `px-4 py-3` | Match ChapterNav button padding |
| CTA buttons | icon-text gap | `gap-2` | Standard icon+label gap |
| Content container | max-width | `max-w-2xl` | BibleReader.tsx line 285 |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Bible reader uses `bg-dashboard-dark` page background, NOT `bg-hero-dark`
- Content container is `mx-auto max-w-2xl px-4 sm:px-6` — all sections share this width
- Text opacity minimums on dark backgrounds: primary ≥ `text-white/70`, secondary ≥ `text-white/60`, interactive ≥ `text-white/50`
- Caveat (`font-script`) is for decorative script accents only — headings use Inter (`font-sans`)
- Gradient text uses `GRADIENT_TEXT_STYLE` inline style — NOT Tailwind gradient classes
- ChapterNav uses `rounded-lg` but spec calls for `rounded-xl` on CTA buttons — these are intentionally different
- Frosted glass pill buttons: `bg-white/5 hover:bg-white/10 border border-white/10` (Dashboard Card Pattern)
- `ATMOSPHERIC_HERO_BG` = `{ backgroundColor: '#0f0a1e', backgroundImage: 'radial-gradient(ellipse at top center, rgba(109,40,217,0.15) 0%, transparent 70%)' }`

---

## Shared Data Models (from Master Plan)

N/A — standalone feature.

**localStorage keys this spec touches:** None. The CTA strip is stateless.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | CTA buttons in 2×2 grid (`grid-cols-2`), heading text `text-sm` |
| Tablet | 640px–1024px | CTA buttons in single row (`sm:flex sm:flex-row`), heading text `text-base` |
| Desktop | > 1024px | CTA buttons in single horizontal row, centered |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| VerseDisplay/ChapterPlaceholder → CTA strip | `mt-12` + `pt-8` (top border + padding) | Match ChapterNav `mt-12` spacing |
| CTA strip → ChapterNav | `mt-0` (ChapterNav's own `mt-12` provides gap) | ChapterNav.tsx line 19 |
| ChapterNav → footer padding | `pb-16` on surrounding container | Already exists in BibleReader.tsx |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BibleReader.tsx has existing cross-feature CTAs (lines 349-363) that will be replaced
- [x] DailyHub reads `?context=` and `?prompt=` URL params and passes to child tabs
- [x] PrayTabContent accepts `initialContext` prop for pre-filling textarea
- [x] JournalTabContent accepts `urlPrompt` prop for pre-filling guided prompt
- [x] ScriptureSoaking reads `?verse=` query param and pre-selects matching verse
- [x] AskPage reads `?q=` query param and auto-submits
- [x] All auth-gated actions from the spec are accounted for (none on CTA strip itself)
- [x] Design system values are verified from codebase inspection
- [x] Scripture Soaking's verse data only includes curated soaking verses (not arbitrary chapter references) — meditate CTA needs a fallback approach

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Context passing mechanism | URL params (`?context=`, `?prompt=`) instead of `location.state` with `prayContext` | DailyHub already has a working URL param consumption pattern (lines 91-101). URL params are bookmarkable, work with page refreshes, and match the existing cross-feature integration pattern. The spec mentions `location.state` but the codebase uses URL params for cross-feature CTAs. |
| Psalm singular handling | Display "Psalm 23" (not "Psalms 23") by stripping trailing 's' from "Psalms" | Human convention: "Psalm 23" for individual chapters, "Psalms" for the book. The `BIBLE_BOOKS` constant uses "Psalms" as the book name. |
| Meditate CTA target | Navigate to `/daily?tab=meditate` (not `/meditate/soaking?verse=...`) | ScriptureSoaking's `?verse=` param matches against a curated list of soaking verses (from `getSoakingVerses()`), NOT arbitrary Bible chapter references. Passing "Psalm 23" would not match. Sending users to the Meditate tab lets them choose the meditation type. |
| `PrayContext` type extension | Do NOT extend `PrayContext.from` union — use URL params instead | Adding `'bible'` to the `from` union would require changes to PrayTabContent and JournalTabContent to handle the new source. URL params bypass this entirely and reuse existing consumption logic. |
| Existing cross-feature CTAs | Replace entirely with `ChapterEngagementBridge` | The existing plain-text links (lines 349-363) are superseded by the new component. The new component provides the same functionality (journal + pray) plus ask + meditate, with context passing. |
| Song of Solomon display | Display as-is: "Song of Solomon 2" | No special handling needed — `book.name` already returns "Song of Solomon". |
| Book reference construction | Utility function `getChapterDisplayName(bookName, chapter)` | Centralizes the "Psalms" → "Psalm" singular logic. Reusable if other features need the same pattern. |
| CTA strip on error state | Show CTA strip even when chapter fails to load | Spec says "ALWAYS appear after chapter content." Users may want to pray or journal even if content didn't load. Place inside the `max-w-2xl` container, after the content conditional block but before ChapterNav. |

---

## Implementation Steps

### Step 1: Create ChapterEngagementBridge Component

**Objective:** Build the CTA strip component with four navigation buttons.

**Files to create/modify:**
- `frontend/src/components/bible/ChapterEngagementBridge.tsx` — New component

**Details:**

```typescript
interface ChapterEngagementBridgeProps {
  bookName: string    // e.g., "Psalms", "Genesis", "1 Samuel"
  bookSlug: string    // e.g., "psalms", "genesis", "1-samuel"
  chapterNumber: number
}
```

Utility function inside component file:
```typescript
function getChapterDisplayName(bookName: string, chapter: number): string {
  // "Psalms" → "Psalm 23" (singular for individual chapter references)
  const displayName = bookName === 'Psalms' ? 'Psalm' : bookName
  return `${displayName} ${chapter}`
}
```

Component renders:
1. Container: `<section>` with `mt-12 border-t border-white/10 pt-8 pb-4`
2. Heading: `<p>` with "Continue your time with {displayName}" — `text-center text-sm sm:text-base text-white/60 mb-4`
3. Button grid: `<div>` with `grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center`
4. Four `<Link>` buttons, each with:
   - Class: `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:w-auto`
   - Icon (size 18) + label text

Button definitions:
- **Journal**: `PenLine` icon, "Journal" label, navigates to `/daily?tab=journal&prompt=${encodeURIComponent(`Journal about what stood out to you in ${displayName}`)}`
- **Pray**: `HandHeart` icon, "Pray" label, navigates to `/daily?tab=pray&context=${encodeURIComponent(`Pray about what you read in ${displayName}`)}`
- **Ask**: `MessageCircleQuestion` icon, "Ask" label, navigates to `/ask?q=${encodeURIComponent(`What does ${displayName} mean and how can I apply it to my life?`)}`
- **Meditate**: `Wind` icon, "Meditate" label, navigates to `/daily?tab=meditate`

Use `Link` from react-router-dom for all navigation (client-side routing, no full page reload).

**Auth gating:** None. All buttons visible and clickable for all users.

**Responsive behavior:**
- Desktop (> 640px): `sm:flex sm:flex-wrap sm:justify-center` → single horizontal row, centered
- Mobile (< 640px): `grid grid-cols-2 gap-3` → 2×2 grid
- All buttons: `min-h-[44px]` for touch targets

**Guardrails (DO NOT):**
- DO NOT add `recordActivity()` calls on any button click
- DO NOT add sound effects on any button click
- DO NOT add auth checks or auth modal triggers
- DO NOT use `useNavigate()` + click handlers — use `<Link>` for accessibility and standard navigation
- DO NOT use `location.state` — use URL params that DailyHub already consumes
- DO NOT use Caveat/script font — heading uses Inter (font-sans)
- DO NOT use `text-white/50` for the heading — minimum `text-white/60` for WCAG AA on dark backgrounds

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders heading with correct book name and chapter | unit | Verify "Continue your time with Genesis 1" text |
| renders heading with singular "Psalm" for Psalms book | unit | Pass bookName="Psalms", chapter=23, verify "Psalm 23" |
| renders heading with numbered books correctly | unit | Pass bookName="1 Samuel", chapter=3, verify "1 Samuel 3" |
| renders four CTA buttons with correct labels | unit | Verify Journal, Pray, Ask, Meditate labels present |
| Journal button links to correct URL with context param | unit | Verify href contains `/daily?tab=journal&prompt=` with encoded text |
| Pray button links to correct URL with context param | unit | Verify href contains `/daily?tab=pray&context=` with encoded text |
| Ask button links to correct URL with q param | unit | Verify href contains `/ask?q=` with encoded text |
| Meditate button links to correct URL | unit | Verify href is `/daily?tab=meditate` |
| renders Lucide icons (PenLine, HandHeart, MessageCircleQuestion, Wind) | unit | Verify all 4 icons present via test IDs or role |
| all buttons have min-h-[44px] for touch targets | unit | Check class contains `min-h-[44px]` |

**Expected state after completion:**
- [ ] `ChapterEngagementBridge` component exists with 4 navigation buttons
- [ ] `getChapterDisplayName` handles "Psalms" → "Psalm" singular conversion
- [ ] All buttons use `<Link>` with correct URL params
- [ ] Component is styled with frosted glass pill buttons on dark background
- [ ] 10 unit tests pass

---

### Step 2: Integrate ChapterEngagementBridge into BibleReader

**Objective:** Place the CTA strip in BibleReader.tsx, replacing the existing cross-feature CTAs.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — Add import and render, remove old CTAs

**Details:**

1. Add import at top of file:
   ```typescript
   import { ChapterEngagementBridge } from '@/components/bible/ChapterEngagementBridge'
   ```

2. Replace the existing cross-feature CTAs (lines 349-363):
   ```tsx
   {/* Cross-feature CTAs */}
   <div className="mt-8 flex flex-col items-center gap-3 pb-16 text-sm">
     <Link to="/daily?tab=pray" ...>Pray about this chapter &rarr;</Link>
     <Link to="/daily?tab=journal" ...>Journal your thoughts &rarr;</Link>
   </div>
   ```
   With:
   ```tsx
   {/* Engagement bridges */}
   <ChapterEngagementBridge
     bookName={book.name}
     bookSlug={book.slug}
     chapterNumber={chapterNumber}
   />
   ```

3. Position: After `ChapterNav` (line 343-347), before the closing `</div>` of the `max-w-2xl` container. This places the CTA strip BELOW ChapterNav.

   Wait — the spec says "ABOVE the existing ChapterNav component." Let me re-read: "A new component (`ChapterEngagementBridge`) renders at the bottom of chapter content, ABOVE the existing `ChapterNav` component."

   So the order should be: Content → **ChapterEngagementBridge** → ChapterNav.

   Move the component to render AFTER the content conditional block (after line 340's closing paren) and BEFORE ChapterNav (line 343).

4. Remove the `Link` import if no longer used elsewhere in the file. Check: `Link` is used in the hero section (line 200-204) and breadcrumb, so it stays.

5. Remove the existing `pb-16` bottom padding from the old CTA container. The `ChapterNav` already has its own `mt-12`. Add `pb-16` to the `ChapterNav` container or keep the existing bottom padding structure. Looking at the current code: the `pb-16` is on the old CTA div. After removing that div, add `pb-16` below ChapterNav to maintain footer spacing.

**Auth gating:** N/A

**Responsive behavior:** N/A: no new UI — placement only.

**Guardrails (DO NOT):**
- DO NOT remove the `ChapterNav` component — it stays, just moves below the engagement bridge
- DO NOT change the `max-w-2xl` container width
- DO NOT change the hero section, breadcrumb, chapter selector, or audio controls
- DO NOT add any state or hooks to BibleReader for this component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CTA strip renders on Bible reader page | integration | Render `/bible/genesis/1`, verify "Continue your time with Genesis 1" appears |
| CTA strip renders above ChapterNav | integration | Verify CTA strip heading appears before "Next Chapter" in DOM order |
| CTA strip renders on chapter with placeholder content | integration | Render a book with `hasFullText: false`, verify CTA strip still appears |
| old cross-feature CTAs are removed | integration | Verify "Pray about this chapter" and "Journal your thoughts" plain links no longer exist |
| existing Bible reader functionality preserved | integration | Verify breadcrumb, chapter selector, verse display still render correctly |

**Expected state after completion:**
- [ ] CTA strip renders between content and ChapterNav
- [ ] Old plain-text cross-feature CTAs removed
- [ ] CTA strip visible on both full-text and placeholder chapters
- [ ] All existing Bible reader tests still pass
- [ ] 5 integration tests pass

---

### Step 3: Verify Context Reception in Target Features

**Objective:** Verify that Journal, Pray, Ask, and Meditate correctly receive the context passed by the CTA buttons. No code changes expected — this step confirms existing consumption works with the new URLs.

**Files to create/modify:**
- `frontend/src/components/bible/__tests__/ChapterEngagementBridge.test.tsx` — Additional integration tests (may merge with Step 1 test file)

**Details:**

Verify each navigation target:

1. **Pray tab**: DailyHub reads `?context=` param → passes to PrayTabContent as `initialContext` → pre-fills textarea. Already working for other cross-feature CTAs. Verify with a test that renders DailyHub at `/daily?tab=pray&context=Pray about what you read in Genesis 1` and checks PrayTabContent textarea pre-fill.

2. **Journal tab**: DailyHub reads `?prompt=` param → passes to JournalTabContent as `urlPrompt` → switches to Guided mode and sets context prompt. Already working for other cross-feature CTAs. Verify with a test.

3. **Ask page**: Reads `?q=` directly. Already working. Verify with a test that renders AskPage at `/ask?q=What does Genesis 1 mean...` and checks textarea pre-fill.

4. **Meditate tab**: Navigates to `/daily?tab=meditate` with no additional context. The Meditate tab renders the meditation type selection grid. No context consumption needed.

If any target doesn't handle the URL params as expected, document the gap and fix it in this step. Based on codebase analysis, all targets already handle their respective params correctly.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify DailyHub, PrayTabContent, JournalTabContent, or AskPage unless a bug is discovered
- DO NOT add new URL params — reuse existing `context`, `prompt`, and `q` params

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pray tab pre-fills from Bible reader context param | integration | Render DailyHub with `?tab=pray&context=...`, verify textarea contains the context text |
| Journal tab pre-fills from Bible reader prompt param | integration | Render DailyHub with `?tab=journal&prompt=...`, verify guided mode activates with prompt |
| Ask page pre-fills from Bible reader q param | integration | Render AskPage with `?q=...`, verify textarea contains the question |

**Expected state after completion:**
- [ ] All four CTA buttons navigate to correct targets with correct context
- [ ] Context is received and displayed in target features
- [ ] 3 integration tests pass (or existing tests already cover these flows)
- [ ] End-to-end flow verified: Bible reader → CTA → target feature with context

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create `ChapterEngagementBridge` component + unit tests |
| 2 | 1 | Integrate into BibleReader, replace old CTAs + integration tests |
| 3 | 2 | Verify context reception in target features + integration tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create ChapterEngagementBridge component | [COMPLETE] | 2026-03-31 | Created `frontend/src/components/bible/ChapterEngagementBridge.tsx` and `frontend/src/components/bible/__tests__/ChapterEngagementBridge.test.tsx`. 10/10 tests pass. |
| 2 | Integrate into BibleReader | [COMPLETE] | 2026-03-31 | Modified `frontend/src/pages/BibleReader.tsx` (added import, replaced old CTAs with ChapterEngagementBridge above ChapterNav, added pb-16 spacer). Updated `frontend/src/pages/__tests__/BibleReader.test.tsx` (replaced 1 old CTA test with 5 new engagement bridge tests). 19/19 tests pass. |
| 3 | Verify context reception | [COMPLETE] | 2026-03-31 | No code changes needed. Existing tests already cover all 3 URL param flows: DailyHub `?context=` (line 318), DailyHub `?prompt=` (line 324), AskPage `?q=` (lines 526/537/553). All 109 tests pass. |
