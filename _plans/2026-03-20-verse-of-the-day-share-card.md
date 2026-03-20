# Implementation Plan: Verse of the Day Shareable Card

**Spec:** `_specs/verse-of-the-day-share-card.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/verse-of-the-day-share-card`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS
- **Styling:** TailwindCSS with custom color tokens (`hero-dark`, `hero-mid`, `primary`, etc.)
- **State:** No backend for this feature — verse computed client-side from date
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library + jsdom

### Relevant Existing Files

| File | Purpose |
|------|---------|
| `frontend/src/mocks/daily-experience-mock-data.ts` | Existing `DAILY_VERSES` (30 verses) + `getVerseOfTheDay()` — must remain unchanged |
| `frontend/src/pages/Home.tsx` | Landing page — insert new section between `JourneySection` and `GrowthTeasersSection` (lines 21-22) |
| `frontend/src/pages/DailyHub.tsx` | Daily Hub — insert verse banner between hero section (line 171) and sentinel/tab bar (line 174) |
| `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` | Dashboard grid — insert new widget after MoodChart (line 71) |
| `frontend/src/components/dashboard/DashboardCard.tsx` | Reusable frosted glass collapsible card |
| `frontend/src/components/daily/ShareButton.tsx` | Existing share dropdown pattern (Web Share API + fallback) — reference for share panel |
| `frontend/src/components/ui/Toast.tsx` | Toast system — `useToast().showToast("Copied!", "success")` |
| `frontend/src/constants/` | Constants directory — new file for verse pool |

### Component Patterns

- **DashboardCard:** Wraps content in frosted glass card with `id`, `title`, `icon`, collapsible behavior, optional `action` link. Class: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6 hover:border-white/20`
- **ShareButton dropdown:** Opens with click, closes on click-outside or Escape, keyboard navigation (ArrowDown/Up/Home/End), focus management, `role="menu"` + `role="menuitem"`
- **Toast:** `const { showToast } = useToast()` → `showToast("Copied!", "success")`

### Test Patterns

- `beforeEach(() => localStorage.clear())`
- Render helper wrapping in `<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`
- Dashboard tests add `<ToastProvider>` wrapping when needed
- `userEvent.setup()` for interaction tests
- Mock `useAuth`, `useFaithPoints` as needed

### Existing Bible References to Avoid (73 unique)

**DAILY_VERSES (30):** Philippians 4:6-7, Jeremiah 29:11, Psalm 147:3, Matthew 11:28-30, Psalm 107:1, Isaiah 40:31, Proverbs 3:5-6, Psalm 34:18, Nehemiah 8:10, Colossians 3:13, Isaiah 26:3, Romans 15:13, Isaiah 53:5, 1 Peter 5:7, 1 Thessalonians 5:18, Philippians 4:13, Psalm 56:3-4, Revelation 21:4, Psalm 16:11, Ephesians 4:32, John 14:27, Romans 8:28, James 5:15, Psalm 94:19, Psalm 100:4, Deuteronomy 31:6, Psalm 37:5, Psalm 73:26, Romans 12:12, Matthew 6:14

**BREATHING_VERSES (20):** Psalm 46:10, Psalm 23:2-3, Isaiah 26:3, Matthew 11:28, Psalm 4:8, John 14:27, Psalm 62:1, Isaiah 41:10, Psalm 91:1-2, Psalm 119:165, Philippians 4:7, Psalm 55:22, Numbers 6:24-26, Psalm 27:1, Isaiah 40:31, Psalm 46:1, Psalm 29:11, Romans 8:26, Psalm 131:2, Exodus 14:14

**SOAKING_VERSES (20):** Psalm 139:13-14, 1 John 3:1, Jeremiah 29:11, Romans 8:38-39, Ephesians 2:10, Zephaniah 3:17, Isaiah 43:1, Lamentations 3:22-23, 2 Corinthians 5:17, Psalm 139:7-10, Isaiah 40:28-29, Psalm 103:11-12, Ephesians 3:17-19, Romans 8:28, Psalm 121:1-2, Galatians 2:20, Psalm 19:14, Deuteronomy 7:9, Isaiah 49:15-16, Joshua 1:9

**GRATITUDE_VERSES (4):** Psalm 107:1, 1 Thessalonians 5:18, Colossians 3:15, Psalm 136:1

**ACTS_STEPS (4):** Psalm 145:3, 1 John 1:9, Psalm 100:4, Philippians 4:6

**MOOD CHECK-IN (5):** Psalm 34:18, Psalm 55:22, Psalm 46:10, Psalm 107:1, Psalm 118:24

---

## Auth Gating Checklist

**No auth gating required for this feature.** All viewing and sharing actions work without login.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View verse (all 3 locations) | No auth required (Req 18) | Steps 3, 4, 5 | None — public |
| Share / Copy / Download | No auth required (Req 18) | Step 2 | None — public |
| Dashboard widget visibility | Inherently auth-gated (Req 19) | Step 3 | Dashboard page itself is auth-gated |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm` | design-system.md |
| Dashboard card | border | `border border-white/10 rounded-2xl` | design-system.md |
| Dashboard card | padding | `p-4 md:p-6` | design-system.md |
| Dashboard card | hover | `hover:border-white/20` | DashboardCard.tsx:49 |
| Hero Outline CTA | full class | `bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30` | design-system.md |
| Dropdown panel | background | `bg-hero-mid` (#1E0B3E) | design-system.md |
| Dropdown panel | border | `border border-white/15 rounded-xl shadow-lg` | design-system.md |
| Scripture font | family | Lora (`font-serif`) | design-system.md |
| Script font | family | Caveat (`font-script`) | design-system.md |
| Footer/dark bg | color | `#0D0620` (`bg-hero-dark`) | design-system.md |
| Hero gradient (landing) | CSS | `linear-gradient(to bottom, #0D0620 0%, #1E0B3E 35%, #4A1D96 100%)` | design-system.md (simplified for card) |
| Share image gradient | CSS | `linear-gradient(to bottom, #0D0620 0%, #1E0B3E 35%, #4A1D96 100%)` | spec Req 16 |

---

## Design System Reminder

- Worship Room uses **Caveat** (`font-script`) for script/branded headings, **Lora** (`font-serif`) for scripture, **Inter** (`font-sans`) for body/UI
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Dropdown panels use dark theme: `bg-hero-mid border border-white/15 shadow-lg rounded-xl`
- Hero gradients go from `#0D0620` → `#1E0B3E` → `#4A1D96`
- All tabs share `max-w-2xl` container width on Daily Hub
- The `cn()` utility from `@/lib/utils` is used for conditional classNames
- Toast: `useToast().showToast(message, type)` — types: 'success', 'error', 'warning'
- Existing `DAILY_VERSES` and `getVerseOfTheDay()` must NOT be modified

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Dashboard: single column. Daily Hub banner: verse truncated to 1 line (`line-clamp-1`). Landing section: `text-lg`, `py-16`. Share panel: popover. |
| Tablet | 640px-1024px | Dashboard: 2-column grid. Daily Hub banner: full verse text. Landing section: `text-2xl`, `py-20`. |
| Desktop | > 1024px | Dashboard: widget in left column (`lg:col-span-3`). Daily Hub banner: full verse + inline reference. Landing section: `text-2xl`, `max-w-2xl` centered. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| JourneySection → Today's Verse section | 0px (sections stack, each has own padding) | Codebase inspection |
| Today's Verse section → GrowthTeasersSection | 0px (sections stack) | Codebase inspection |
| Daily Hub hero → verse banner | 0px (banner sits at end of hero area) | Spec Req 8 |
| Verse banner → sticky tab bar | 0px (sentinel element between) | DailyHub.tsx:174 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/verse-of-the-day-share-card` exists and is checked out
- [ ] All 73 existing Bible references have been cross-checked — the 30 new verses use none of them
- [ ] Lora and Caveat fonts are loaded via Google Fonts in `index.html` (they are — confirmed in design system)
- [ ] No auth gating needed for any share action (spec Req 18 confirms)
- [ ] Design system values are verified from design-system.md recon
- [ ] Canvas font rendering: `document.fonts.ready` API is available in modern browsers
- [ ] Web Share API with files: `navigator.canShare({ files: [...] })` — not all browsers support file sharing

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Verse pool separation | Separate constants file, not modifying existing `DAILY_VERSES` | Spec Req 4: existing array must remain unchanged |
| Day-of-year computation | `Math.floor((date - jan1) / 86400000)` using local date | Spec Req 3: midnight local time boundary |
| Share panel component | New reusable `VerseSharePanel` component | Different from existing ShareButton (which has social links); this one has copy + image + download |
| Share panel positioning | Popover below/beside trigger, not bottom sheet on mobile | Spec Req 15: "small dropdown/popover" — simpler than bottom sheet |
| Canvas font fallback | `serif` for Lora, `cursive` for Caveat | Spec edge case: system font fallback if Google Fonts fail to load |
| Auto-sizing verse text on canvas | Start at 24px, reduce by 2px increments until text fits | Spec Req 16: "auto-size based on text length" |
| Share image dimensions | Fixed 400x600px | Spec Req 16 |

---

## Implementation Steps

### Step 1: Verse Data Constants File

**Objective:** Create the verse pool (30 existing + 30 new WEB verses) and the deterministic `getVerseOfTheDay()` function.

**Files to create:**
- `frontend/src/constants/verse-of-the-day.ts` — verse pool array + getter function

**Details:**

1. Define interface:
```typescript
export interface VerseOfTheDay {
  text: string
  reference: string
  theme: 'hope' | 'comfort' | 'strength' | 'praise' | 'trust' | 'peace'
}
```

2. Create `VERSE_OF_THE_DAY_POOL: VerseOfTheDay[]` with 60 entries:
   - First 30: Copy the existing 30 from `DAILY_VERSES` in `daily-experience-mock-data.ts` (text + reference), assigning each a theme from the 6 categories
   - Next 30: 30 new WEB translation verses, 5 per theme (hope, comfort, strength, praise, trust, peace)
   - **CRITICAL:** Every new reference must be checked against the 73 existing references listed in Architecture Context

3. Create getter function:
```typescript
export function getTodaysVerse(date: Date = new Date()): VerseOfTheDay {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return VERSE_OF_THE_DAY_POOL[dayOfYear % VERSE_OF_THE_DAY_POOL.length]
}
```

**30 New Verses (WEB translation, no duplicates):**

Theme: **Hope** (5)
- Psalm 42:11 — "Why are you in despair, my soul?..."
- Romans 5:3-4 — "Not only this, but we also rejoice in our sufferings..."
- Hebrews 11:1 — "Now faith is assurance of things hoped for..."
- Psalm 130:5 — "I wait for Yahweh. My soul waits..."
- Isaiah 40:29 — "He gives power to the weak..."

Theme: **Comfort** (5)
- 2 Corinthians 1:3-4 — "Blessed be the God and Father..."
- Psalm 23:4 — "Even though I walk through the valley..."
- Matthew 5:4 — "Blessed are those who mourn..."
- Isaiah 49:13 — "Sing, heavens, and be joyful, earth..."
- Psalm 34:17 — "The righteous cry, and Yahweh hears..."

Theme: **Strength** (5)
- Isaiah 40:30-31 — "Even the youths faint and get weary..."
- Psalm 18:32 — "The God who arms me with strength..."
- 2 Timothy 1:7 — "For God didn't give us a spirit of fear..."
- Ephesians 6:10 — "Finally, be strong in the Lord..."
- Psalm 28:7 — "Yahweh is my strength and my shield..."

Theme: **Praise** (5)
- Psalm 150:6 — "Let everything that has breath praise Yah!..."
- Psalm 103:1 — "Praise Yahweh, my soul!..."
- Psalm 95:1 — "Oh come, let's sing to Yahweh..."
- Psalm 63:3 — "Because your loving kindness is better than life..."
- Psalm 96:1 — "Sing to Yahweh a new song!..."

Theme: **Trust** (5)
- Proverbs 3:5 — "Trust in Yahweh with all your heart..."
- Psalm 9:10 — "Those who know your name will put their trust in you..."
- Nahum 1:7 — "Yahweh is good, a stronghold in the day of trouble..."
- Psalm 62:8 — "Trust in him at all times, you people..."
- Isaiah 12:2 — "Behold, God is my salvation..."

Theme: **Peace** (5)
- John 16:33 — "I have told you these things, that in me you may have peace..."
- Colossians 3:15 — (already used in GRATITUDE) → use **Romans 14:17** instead — "For God's Kingdom is not eating and drinking..."
- Psalm 4:8 — (already used in BREATHING) → use **Psalm 119:165** — (already used in BREATHING) → use **Isaiah 32:17** — "The work of righteousness will be peace..."
- 2 Thessalonians 3:16 — "Now may the Lord of peace himself give you peace..."
- Psalm 85:8 — "I will hear what God, Yahweh, will speak, for he will speak peace..."

**NOTE:** The executor must verify each reference against the 73-reference avoid list before writing the file. Adjust any that conflict.

**Guardrails (DO NOT):**
- DO NOT modify `daily-experience-mock-data.ts`
- DO NOT use references from the 73-reference avoid list
- DO NOT use any randomness — computation must be deterministic from date
- DO NOT add any localStorage reads/writes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pool has exactly 60 entries | unit | `VERSE_OF_THE_DAY_POOL.length === 60` |
| Each entry has text, reference, theme | unit | Validate shape of every entry |
| Themes distributed: 10 per theme | unit | Count entries per theme (existing 30 + new 30 may not be perfectly even for existing, but new 30 must be 5 per theme) |
| No duplicate references in pool | unit | Set of references has same size as array |
| No reference collision with existing codebase | unit | Check against hardcoded avoid list |
| Deterministic for same date | unit | `getTodaysVerse(date1) === getTodaysVerse(date1)` |
| Different verses on different days | unit | `getTodaysVerse(day1) !== getTodaysVerse(day2)` for adjacent days |
| Day-of-year wraps correctly | unit | Day 365, day 366 (leap year) both produce valid verses |
| Uses local date, not UTC | unit | Mock dates near midnight |

**Expected state after completion:**
- [ ] `frontend/src/constants/verse-of-the-day.ts` exists with 60 verses and `getTodaysVerse()` function
- [ ] All tests pass
- [ ] No modification to existing files

---

### Step 2: Share Panel Component & Canvas Image Generation

**Objective:** Build the reusable `VerseSharePanel` component with copy, share-as-image, and download-image functionality, plus the canvas image generator.

**Files to create:**
- `frontend/src/components/verse-of-the-day/VerseSharePanel.tsx` — share panel popover
- `frontend/src/lib/verse-card-canvas.ts` — canvas image generation utility

**Details:**

#### `verse-card-canvas.ts` — Canvas image generation

```typescript
export async function generateVerseImage(
  text: string,
  reference: string,
): Promise<Blob> {
  // 1. Wait for fonts
  await document.fonts.ready

  // 2. Create canvas 400x600
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 600
  const ctx = canvas.getContext('2d')!

  // 3. Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, 600)
  gradient.addColorStop(0, '#0D0620')
  gradient.addColorStop(0.35, '#1E0B3E')
  gradient.addColorStop(1, '#4A1D96')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 400, 600)

  // 4. Auto-size verse text (start at 24px, reduce until fits)
  // Margins: 40px left/right, 60px top, text area ends ~100px from bottom
  const maxWidth = 320 // 400 - 40*2
  const maxTextHeight = 380 // ~60px top to ~440px
  let fontSize = text.length < 100 ? 28 : text.length < 200 ? 24 : 20
  ctx.font = `italic ${fontSize}px Lora, serif`
  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  // Word-wrap and measure, reduce font if needed
  // (Implementation: wrap text into lines, check total height)

  // 5. Draw verse text centered in upper 70%
  // 6. Draw reference below verse: 14px, rgba(255,255,255,0.5)
  // 7. Draw "Worship Room" watermark: Caveat 16px, rgba(255,255,255,0.3), centered, 12px from bottom

  // 8. Export as PNG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to generate image'))
    }, 'image/png')
  })
}
```

Include a helper function for word-wrapping text on canvas:
```typescript
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}
```

#### `VerseSharePanel.tsx` — Share panel popover

Props:
```typescript
interface VerseSharePanelProps {
  verseText: string
  verseReference: string
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement>
}
```

Features:
- Three menu items: Copy verse, Share as image, Download image
- Icons: Lucide `Copy`, `Image`, `Download`
- Copy: `navigator.clipboard.writeText(\`"${verseText}" — ${verseReference}\`)` → show "Copied!" toast → close panel
- Fallback: `document.execCommand('copy')` via hidden textarea
- Share as image: call `generateVerseImage()` → check `navigator.canShare?.({ files: [file] })` → if yes, `navigator.share({ files: [file] })` → else download
- Download image: always call `generateVerseImage()` → create `<a>` with blob URL + `download="worship-room-verse-YYYY-MM-DD.png"` → click → revoke URL
- Styling: `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2` (dark dropdown pattern)
- Item styling: `flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 cursor-pointer text-sm text-white/80 hover:text-white transition-colors min-h-[44px]`
- Dismiss: click outside, Escape key — follow `ShareButton.tsx` pattern (lines 43-67)
- Focus management: auto-focus first item on open, ArrowDown/Up navigation, restore focus to trigger on close
- ARIA: `role="menu"` on panel, `role="menuitem"` on items

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT use the existing `ShareButton.tsx` component (it has different items — social links)
- DO NOT persist any data to localStorage
- DO NOT add any loading spinners for canvas generation (it's fast enough to be synchronous-feeling)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders three menu items when open | unit | Copy verse, Share as image, Download image visible |
| Does not render when isOpen is false | unit | Panel not in DOM |
| Copy verse calls clipboard API | integration | Mock `navigator.clipboard.writeText`, verify called with formatted text |
| Copy verse shows toast | integration | Verify `showToast("Copied!", "success")` called |
| Panel closes on Escape | unit | Fire keydown Escape, verify onClose called |
| Panel closes on click outside | unit | Fire mousedown outside, verify onClose called |
| Keyboard navigation works | unit | ArrowDown/Up moves focus between items |
| Items have role="menuitem" | unit | ARIA attribute check |
| Panel has role="menu" | unit | ARIA attribute check |
| Min touch target 44px | unit | Check `min-h-[44px]` class on items |
| generateVerseImage returns a Blob | unit | Mock canvas, verify blob output |
| Download triggers anchor click | integration | Verify anchor created with download attribute |

**Expected state after completion:**
- [ ] `VerseSharePanel.tsx` renders and handles copy/share/download
- [ ] `verse-card-canvas.ts` generates a 400x600 PNG blob
- [ ] All tests pass
- [ ] No regressions

---

### Step 3: Dashboard Widget

**Objective:** Add the "Verse of the Day" widget card to the dashboard grid, positioned after the MoodChart widget.

**Files to modify:**
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — add new card

**Files to create:**
- `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` — widget content component

**Details:**

#### `VerseOfTheDayCard.tsx`

```typescript
import { useState, useRef } from 'react'
import { Share2, BookOpen } from 'lucide-react'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { VerseSharePanel } from '@/components/verse-of-the-day/VerseSharePanel'

export function VerseOfTheDayCard() {
  const verse = getTodaysVerse()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <div>
      <p className="font-serif italic text-lg text-white leading-relaxed">
        "{verse.text}"
      </p>
      <p className="text-sm text-white/50 mt-2">{verse.reference}</p>
      <div className="mt-3 flex justify-end relative">
        <button
          ref={shareBtnRef}
          type="button"
          onClick={() => setSharePanelOpen(prev => !prev)}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Share verse of the day"
          aria-haspopup="menu"
          aria-expanded={sharePanelOpen}
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
        <VerseSharePanel
          verseText={verse.text}
          verseReference={verse.reference}
          isOpen={sharePanelOpen}
          onClose={() => setSharePanelOpen(false)}
          triggerRef={shareBtnRef}
        />
      </div>
    </div>
  )
}
```

#### Modifications to `DashboardWidgetGrid.tsx`

Insert new `DashboardCard` after the MoodChart card (line 71), before the StreakCard (line 73):

```tsx
<DashboardCard
  id="verse-of-the-day"
  title="Verse of the Day"
  icon={<BookOpen className="h-5 w-5" />}
  className={cn('order-2 lg:order-1 lg:col-span-3', verseAnim.className)}
  style={verseAnim.style}
>
  <VerseOfTheDayCard />
</DashboardCard>
```

**Grid order adjustments:** The new widget shares the left column with MoodChart. Adjust `lg:order-*` values:
- MoodChart: `order-2 lg:order-1` (stays)
- **Verse of the Day: `order-3 lg:order-2 lg:col-span-3`** (new — left column, below mood chart)
- Streak: `order-1 lg:order-3 lg:col-span-2` (was order-2, now order-3)
- Activity: `order-4 lg:order-4 lg:col-span-3` (was order-3, now order-4)
- Friends: `order-5 lg:order-5 lg:col-span-2` (was order-4, now order-5)
- Weekly Recap: `order-6 lg:col-span-5` (was order-5, now order-6)
- Quick Actions: `order-7 lg:col-span-5` (was order-6, now order-7)

Also add a `verseAnim` variable using `getAnimProps()` after `moodAnim`:
```typescript
const moodAnim = getAnimProps()
const verseAnim = getAnimProps()  // NEW
const streakAnim = getAnimProps()
// ... rest unchanged
```

Add imports: `BookOpen` from lucide-react, `VerseOfTheDayCard` from `./VerseOfTheDayCard`.

**Responsive behavior:**
- Desktop (1440px): 3-column span in left column, below MoodChart
- Tablet (768px): Full-width in single column
- Mobile (375px): Full-width in single column

**Guardrails (DO NOT):**
- DO NOT change the existing card order semantics beyond incrementing order values
- DO NOT add new props to `DashboardWidgetGrid` — the verse is computed inside the card
- DO NOT add localStorage writes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| VerseOfTheDayCard renders verse text | unit | Verify verse text appears in Lora italic |
| VerseOfTheDayCard renders reference | unit | Verify reference text visible |
| Share button toggles share panel | integration | Click share, verify panel opens |
| DashboardWidgetGrid renders Verse of the Day card | integration | Check "Verse of the Day" heading in grid |
| Card is collapsible | integration | Collapse toggle hides content |
| Card position after MoodChart | integration | Verify DOM order or grid order class |

**Expected state after completion:**
- [ ] Dashboard shows "Verse of the Day" widget with today's verse
- [ ] Widget is collapsible with frosted glass styling
- [ ] Share button opens the share panel
- [ ] Grid order is correct (Verse after MoodChart)
- [ ] All tests pass

---

### Step 4: Daily Hub Verse Banner

**Objective:** Add a compact verse banner to the Daily Hub page, positioned below the hero greeting section and above the tab bar.

**Files to create:**
- `frontend/src/components/daily/VerseOfTheDayBanner.tsx` — compact banner component

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — insert banner between hero section and sentinel

**Details:**

#### `VerseOfTheDayBanner.tsx`

```tsx
import { useState, useRef } from 'react'
import { Share2 } from 'lucide-react'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { VerseSharePanel } from '@/components/verse-of-the-day/VerseSharePanel'

export function VerseOfTheDayBanner() {
  const verse = getTodaysVerse()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="mx-4 mb-2 sm:mx-6">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif italic text-sm text-white/80 line-clamp-1 sm:line-clamp-none">
            "{verse.text}"
          </p>
          <p className="text-xs text-white/40 mt-0.5 sm:mt-0 sm:inline sm:ml-2">
            — {verse.reference}
          </p>
        </div>
        <div className="relative flex-shrink-0">
          <button
            ref={shareBtnRef}
            type="button"
            onClick={() => setSharePanelOpen(prev => !prev)}
            className="rounded-lg p-2 text-white/40 hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Share verse of the day"
            aria-haspopup="menu"
            aria-expanded={sharePanelOpen}
          >
            <Share2 className="h-5 w-5" />
          </button>
          <VerseSharePanel
            verseText={verse.text}
            verseReference={verse.reference}
            isOpen={sharePanelOpen}
            onClose={() => setSharePanelOpen(false)}
            triggerRef={shareBtnRef}
          />
        </div>
      </div>
    </div>
  )
}
```

#### Modifications to `DailyHub.tsx`

Insert the banner between the hero `</section>` (line 171) and the sentinel `<div ref={sentinelRef}>` (line 174):

```tsx
</section>

{/* Verse of the Day Banner */}
<div style={{ backgroundImage: 'linear-gradient(to bottom, #6D28D9, #F5F5F5)' }}>
  <VerseOfTheDayBanner />
</div>

{/* Sentinel for sticky tab bar shadow */}
<div ref={sentinelRef} aria-hidden="true" />
```

Note: The banner sits in the gradient transition zone between hero and content. The background must match the gradient at that point. The hero ends at `#6D28D9 60%` and transitions to `#F5F5F5 100%`. The banner sits around the 65-75% point. We need to set a background that matches the gradient at that position.

[UNVERIFIED] Banner background context: The hero gradient is `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)`. The banner sits right after the hero section's padding ends. The exact background color at that point depends on the hero's height. The `bg-white/5` on the banner itself provides subtle contrast against whatever gradient color is behind it.
→ To verify: Run `/verify-with-playwright` and inspect the banner's visual appearance against the hero gradient
→ If wrong: Adjust by wrapping the banner in a div with explicit background color matching the gradient at that position

**Responsive behavior:**
- Desktop (1440px): Full verse text displayed, reference inline, share icon at right edge
- Tablet (768px): Full verse text, reference inline
- Mobile (< 640px): Verse text truncated to single line (`line-clamp-1`), reference on new line below

**Guardrails (DO NOT):**
- DO NOT change the hero section styling or padding
- DO NOT modify the sticky tab bar behavior
- DO NOT add any state to `DailyHub.tsx` for the banner (state is self-contained in the banner component)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Banner renders verse text | unit | Verify Lora italic text present |
| Banner renders reference | unit | Verify reference visible |
| Share icon button present | unit | Verify button with aria-label |
| Mobile truncation class applied | unit | Verify `line-clamp-1` class on verse text |
| Share panel opens on click | integration | Click share icon, verify panel appears |
| Banner visible in DailyHub | integration | Render DailyHub, verify banner present |

**Expected state after completion:**
- [ ] Compact verse banner visible on Daily Hub between hero and tabs
- [ ] Verse text truncated on mobile, full on desktop
- [ ] Share icon opens share panel
- [ ] No visual disruption to existing hero or tab bar
- [ ] All tests pass

---

### Step 5: Landing Page Section

**Objective:** Add a "Today's Verse" section to the landing page between JourneySection and GrowthTeasersSection.

**Files to create:**
- `frontend/src/components/TodaysVerseSection.tsx` — landing page verse section

**Files to modify:**
- `frontend/src/pages/Home.tsx` — insert new section

**Details:**

#### `TodaysVerseSection.tsx`

```tsx
import { useState, useRef } from 'react'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { VerseSharePanel } from '@/components/verse-of-the-day/VerseSharePanel'

export function TodaysVerseSection() {
  const verse = getTodaysVerse()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <section
      aria-labelledby="todays-verse-heading"
      className="bg-hero-dark py-16 sm:py-20"
    >
      <div className="mx-auto max-w-3xl px-4 text-center">
        <p
          id="todays-verse-heading"
          className="text-xs uppercase tracking-widest text-white/40 font-medium mb-4"
        >
          Today's Verse
        </p>
        <blockquote>
          <p className="font-serif italic text-lg sm:text-2xl text-white leading-relaxed max-w-2xl mx-auto">
            "{verse.text}"
          </p>
          <footer className="text-sm text-white/50 mt-3">
            — {verse.reference}
          </footer>
        </blockquote>
        <div className="mt-8 relative inline-block">
          <button
            ref={shareBtnRef}
            type="button"
            onClick={() => setSharePanelOpen(prev => !prev)}
            className="bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30 hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
            aria-haspopup="menu"
            aria-expanded={sharePanelOpen}
          >
            Share this verse
          </button>
          <VerseSharePanel
            verseText={verse.text}
            verseReference={verse.reference}
            isOpen={sharePanelOpen}
            onClose={() => setSharePanelOpen(false)}
            triggerRef={shareBtnRef}
          />
        </div>
      </div>
    </section>
  )
}
```

#### Modifications to `Home.tsx`

Add import and insert between JourneySection and GrowthTeasersSection:

```tsx
import { TodaysVerseSection } from '@/components/TodaysVerseSection'

// In render:
<HeroSection />
<JourneySection />
<TodaysVerseSection />    {/* NEW */}
<GrowthTeasersSection />
<StartingPointQuiz />
```

**Design values applied:**
- Background: `bg-hero-dark` (`#0D0620`) — solid dark, matching footer/dark sections
- Label: `text-xs uppercase tracking-widest text-white/40 font-medium mb-4`
- Verse: `font-serif italic text-lg sm:text-2xl text-white leading-relaxed max-w-2xl mx-auto`
- Reference: `text-sm text-white/50 mt-3`
- CTA: Hero Outline CTA pattern from design-system.md: `bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30 hover:bg-white/15`
- Section padding: `py-16 sm:py-20`
- Content max-width: `max-w-3xl` container, verse text `max-w-2xl`

**Responsive behavior:**
- Desktop (1440px): Verse `text-2xl`, `max-w-2xl` centered, `py-20`
- Tablet (768px): Same as desktop but narrower viewport
- Mobile (< 640px): Verse `text-lg`, `py-16`, full-width with `px-4` padding

**Guardrails (DO NOT):**
- DO NOT modify JourneySection or GrowthTeasersSection
- DO NOT add any background gradients — use solid `bg-hero-dark` for a clean dark interstitial
- DO NOT add animations (spec says no entrance animation)
- DO NOT use `<h2>` for the label — it's a visual label using `<p>` with `id` for `aria-labelledby`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Section renders verse text | unit | Verify verse text in blockquote |
| Section renders reference | unit | Verify reference in footer element |
| "Today's Verse" label visible | unit | Verify label text present |
| "Share this verse" button present | unit | Verify button text and aria attributes |
| Share panel opens on CTA click | integration | Click CTA, verify panel appears |
| Section has aria-labelledby | unit | Section linked to heading via id |
| Home page renders section between Journey and GrowthTeasers | integration | Verify DOM order |

**Expected state after completion:**
- [ ] "Today's Verse" section visible on landing page between Journey and Growth Teasers
- [ ] Dark background with centered verse, reference, and share CTA
- [ ] Share panel works from the CTA button
- [ ] Section is accessible (aria-labelledby, keyboard-accessible button)
- [ ] All tests pass

---

### Step 6: Integration Testing & Polish

**Objective:** Write integration tests verifying the full feature across all three locations, ensure no regressions, and verify edge cases.

**Files to create:**
- `frontend/src/constants/__tests__/verse-of-the-day.test.ts` — verse data tests (from Step 1)
- `frontend/src/components/verse-of-the-day/__tests__/VerseSharePanel.test.tsx` — share panel tests (from Step 2)
- `frontend/src/lib/__tests__/verse-card-canvas.test.ts` — canvas generation tests (from Step 2)
- `frontend/src/components/dashboard/__tests__/VerseOfTheDayCard.test.tsx` — dashboard widget tests (from Step 3)
- `frontend/src/components/daily/__tests__/VerseOfTheDayBanner.test.tsx` — Daily Hub banner tests (from Step 4)
- `frontend/src/components/__tests__/TodaysVerseSection.test.tsx` — landing page section tests (from Step 5)

**Details:**

Tests are specified per-step above. This step focuses on:

1. **Running all tests together** to catch any import/dependency issues
2. **Regression tests:** Verify existing `DAILY_VERSES` array is unchanged, existing `getVerseOfTheDay()` function is unchanged, no new localStorage keys written
3. **Edge case tests:**
   - Leap year day 366 returns a valid verse
   - Very long verse text wraps correctly in canvas
   - Clipboard API fallback when `navigator.clipboard` is undefined
   - Canvas font fallback when `document.fonts.ready` resolves but fonts not loaded
   - Web Share API not available — triggers download instead
4. **Accessibility audit:**
   - All share buttons have `aria-label`
   - Share panel has `role="menu"`, items have `role="menuitem"`
   - Panel dismisses on Escape
   - Focus returns to trigger after panel closes
   - Toast announcements are screen-reader accessible

**Guardrails (DO NOT):**
- DO NOT skip canvas tests — mock the Canvas API but verify the flow
- DO NOT skip accessibility assertions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No new localStorage keys written | integration | Monitor localStorage during full render cycle |
| Existing DAILY_VERSES unchanged | regression | Import and verify array length/content hash |
| All 3 locations render same verse on same day | integration | Render all 3, verify same text |
| Verse changes on different days | integration | Mock Date, verify different text |

**Expected state after completion:**
- [ ] All tests pass (run `pnpm test`)
- [ ] No regressions in existing tests
- [ ] Full feature is functional across dashboard, Daily Hub, and landing page

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Verse data constants file |
| 2 | 1 | Share panel component + canvas image generation |
| 3 | 1, 2 | Dashboard widget |
| 4 | 1, 2 | Daily Hub verse banner |
| 5 | 1, 2 | Landing page section |
| 6 | 1-5 | Integration testing & polish |

Steps 3, 4, and 5 are independent of each other (only depend on 1 and 2).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Verse Data Constants File | [COMPLETE] | 2026-03-20 | Created `frontend/src/constants/verse-of-the-day.ts` with 60 verses and `getTodaysVerse()`. Fixed DST issue in day-of-year computation (use `Date.UTC` for arithmetic). Replaced 3 plan verses that conflicted with existing refs: Isaiah 40:29→Jeremiah 31:17, Isaiah 40:30-31→Habakkuk 3:19, Proverbs 3:5→Psalm 20:7. Tests: `frontend/src/constants/__tests__/verse-of-the-day.test.ts` (11 tests). |
| 2 | Share Panel + Canvas Image | [COMPLETE] | 2026-03-20 | Created `frontend/src/lib/verse-card-canvas.ts` and `frontend/src/components/verse-of-the-day/VerseSharePanel.tsx`. Tests: `VerseSharePanel.test.tsx` (10 tests), `verse-card-canvas.test.ts` (5 tests). |
| 3 | Dashboard Widget | [COMPLETE] | 2026-03-20 | Created `VerseOfTheDayCard.tsx`, modified `DashboardWidgetGrid.tsx` (added BookOpen import, verseAnim, new card after MoodChart, incremented order values). Tests: `VerseOfTheDayCard.test.tsx` (4 tests). |
| 4 | Daily Hub Verse Banner | [COMPLETE] | 2026-03-20 | Created `VerseOfTheDayBanner.tsx`, modified `DailyHub.tsx` (added import + banner between hero and sentinel with gradient wrapper). Tests: `VerseOfTheDayBanner.test.tsx` (5 tests). |
| 5 | Landing Page Section | [COMPLETE] | 2026-03-20 | Created `TodaysVerseSection.tsx`, modified `Home.tsx` (added import + section between JourneySection and GrowthTeasersSection). Tests: `TodaysVerseSection.test.tsx` (6 tests). |
| 6 | Integration Testing & Polish | [COMPLETE] | 2026-03-20 | All 41 tests pass across 6 test files. No regressions: DAILY_VERSES unchanged, zero localStorage usage in new files. Build succeeds. Visual verification passed: landing page section, Daily Hub banner (desktop+mobile), and dashboard widget all render correctly. |
