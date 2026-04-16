# Implementation Plan: BB-13 Share as Image

**Spec:** `_specs/bb-13-share-as-image.md`
**Date:** 2026-04-08
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone feature within Bible redesign wave

---

## Architecture Context

### Project Structure

Bible reader files relevant to BB-13:

- **Action registry (share stub):** `src/lib/bible/verseActionRegistry.ts:284-293` — the `share` handler has `hasSubView: true` and `renderSubView: stubSubView('Share panel ships in BB-13')`. Needs replacement with real sub-view.
- **Action sheet (sub-view host):** `src/components/bible/reader/VerseActionSheet.tsx` — manages sub-view stack. Sub-view header (back button + label + X close) is rendered by the sheet itself (lines 300-312). The sub-view content area is `<div className="flex-1 overflow-y-auto">` containing the result of `renderSubView({ selection, onBack, context })`.
- **Verse types:** `src/types/verse-actions.ts` — `VerseSelection { book, bookName, chapter, startVerse, endVerse, verses: Array<{number, text}> }`, `VerseActionContext { showToast, closeSheet, navigate }`, `VerseActionHandler.renderSubView` signature.
- **Highlight colors:** `src/constants/bible.ts:26-32` — `HIGHLIGHT_EMOTIONS = [ {key:'peace', label:'Peace', hex:'#7DD3FC'}, {key:'conviction', label:'Conviction', hex:'#FB923C'}, {key:'joy', label:'Joy', hex:'#FDE047'}, {key:'struggle', label:'Struggle', hex:'#C4B5FD'}, {key:'promise', label:'Promise', hex:'#6EE7B7'} ]`
- **Highlight store:** `src/lib/bible/highlightStore.ts` — `getHighlightForVerse(book, chapter, verse)` returns `Highlight | null` with `.color` field matching `HighlightColor` type.
- **Existing canvas renderer:** `src/lib/verse-card-canvas.ts` (522 lines) — 4 templates × 3 sizes for VotD sharing. Uses `document.fonts.load()`, `wrapText()` word wrapping, `fitVerseText()` auto-sizing, `Canvas.toBlob()` export. **BB-13 does NOT reuse this renderer** — it creates a new one with different visual design (dark cinematic gradient, different formats, orb tinting).
- **Existing share panel:** `src/components/sharing/SharePanel.tsx` (480 lines) — VotD share UI with download/copy/share. Has `canUseWebShare()`, `slugify()`, iOS detection, clipboard write, Web Share API patterns. BB-13 references these patterns but builds its own sub-view component.
- **Format reference helper:** `src/lib/bible/verseActionRegistry.ts:47-53` — `formatReference(sel)` returns `"John 3:16"` or `"John 3:16–18"` (en-dash for ranges).
- **Selection text helper:** `src/lib/bible/verseActionRegistry.ts:56-58` — `getSelectionText(sel)` joins verse texts with spaces.
- **Toast system:** `src/components/ui/Toast.tsx` — `useToast()` hook returning `{ showToast(message, type?, action?) }`.
- **Focus trap:** `src/hooks/useFocusTrap.ts` — `useFocusTrap(isOpen, onEscape)`.
- **Reduced motion:** `src/hooks/useReducedMotion.ts` — `useReducedMotion()` returns boolean.

### Sub-View Pattern (from Highlight, Note, Cross-References)

Sub-views are React components rendered via `renderSubView` in the registry. The action sheet provides:
1. **Header** with back button (ArrowLeft), action label, and X close button — rendered by `VerseActionSheet.tsx:300-312`
2. **Scrollable content area** — `<div className="flex-1 overflow-y-auto">` containing the sub-view component
3. **Props:** `{ selection: VerseSelection, onBack: () => void, context?: VerseActionContext }`

BB-13's sub-view renders inside this existing scaffold. The "Share" title and back/close buttons are already handled by the sheet. The sub-view content starts with the verse reference subtitle and format picker.

### Canvas Rendering Precedent

The existing `verse-card-canvas.ts` provides patterns for:
- **Font loading:** `await Promise.all([document.fonts.load('400 48px Lora'), document.fonts.load('400 16px Inter')])`
- **Word wrapping:** `wrapText(ctx, text, maxWidth)` — splits on spaces, measures via `ctx.measureText()`, handles overflow
- **Font auto-sizing:** `fitVerseText(ctx, text, maxWidth, maxHeight, scale)` — iterative reduction from base size based on char count
- **Blob export:** `canvas.toBlob(resolve, 'image/png')` wrapped in Promise
- **Radial gradients:** `ctx.createRadialGradient()` for glow effects
- **Watermark:** Small muted text at bottom with low opacity

BB-13's renderer follows these Canvas API patterns but with a completely different visual design.

### Download/Copy/Share Precedent

The existing `SharePanel.tsx` provides patterns for:
- **Download:** Create blob URL → temp `<a download>` → click → revoke (lines 240-258)
- **Copy image:** `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` (lines 269-274)
- **Native share:** `navigator.share({ files: [file] })` with `canUseWebShare()` check (lines 53-60, 265-267)
- **Error handling:** AbortError (user cancelled) caught silently; other errors show toast

BB-13 separates these into 3 distinct buttons instead of the existing panel's 2-button approach (Download + Share/Copy fallback).

### Test Patterns

- Sub-view tests follow the pattern in `src/lib/bible/__tests__/verseActionRegistry.test.ts` — testing `renderSubView` returns a React element
- Canvas rendering tests mock `HTMLCanvasElement.prototype.getContext` and `toBlob`
- Component tests wrap with: `MemoryRouter > ToastProvider > AuthModalProvider`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap Share in action sheet | No auth required | Step 5 | N/A — opens for all users |
| Download card | No auth required | Step 3 | N/A — works for all users |
| Copy image | No auth required | Step 3 | N/A — works for all users |
| Native share | No auth required | Step 3 | N/A — works for all users |

**Share is fully available without authentication.** This is intentional — share is the marketing funnel.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Card background gradient | start | `#0D0620` (hero-dark) | design-system.md / index.css |
| Card background gradient | mid | `#1E0B3E` (hero-mid) | design-system.md / index.css |
| Card background gradient | end | `#251248` (hero-deep) | design-system.md / index.css |
| Glow orb base color | fill | `rgba(139, 92, 246, 0.25-0.50)` (primary-lt) | design-system.md |
| Verse text font | family | Lora (serif) | 09-design-system.md typography |
| Reference/wordmark font | family | Inter (sans-serif) | 09-design-system.md typography |
| Action sheet background | fill | `rgba(15, 10, 30, 0.95)` + `backdrop-blur(16px)` | VerseActionSheet.tsx:280-282 |
| Sub-view separator | border | `border-white/[0.08]` | VerseActionSheet.tsx:313 |
| Icon button (sub-view) | class | `ICON_BTN_SM` = `flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | VerseActionSheet.tsx:22-23 |
| Highlight emotion colors | Peace | `#7DD3FC` (blue) | constants/bible.ts:27 |
| Highlight emotion colors | Conviction | `#FB923C` (amber) | constants/bible.ts:28 |
| Highlight emotion colors | Joy | `#FDE047` (gold) | constants/bible.ts:29 |
| Highlight emotion colors | Struggle | `#C4B5FD` (violet) | constants/bible.ts:30 |
| Highlight emotion colors | Promise | `#6EE7B7` (green) | constants/bible.ts:31 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The share sub-view lives INSIDE the existing `VerseActionSheet` — it does NOT use `FrostedCard`, `GlowBackground`, or `HorizonGlow`. The sheet already provides the dark frosted glass backdrop.
- The action sheet renders its own sub-view header (back + label + close). The share sub-view should NOT render its own header row — that would duplicate navigation.
- Zero raw hex values in component code (Tailwind tokens only). Hex values ARE allowed inside the canvas renderer (unavoidable for canvas gradient stops).
- `HIGHLIGHT_EMOTIONS` from `@/constants/bible` is the source of truth for emotion colors. Do NOT define a separate color mapping.
- Canvas text must use `document.fonts.load()` before drawing. Never render with fallback fonts.
- `animate-glow-pulse` is deprecated — do NOT use for the glow ring on format thumbnails. Use a static box-shadow or ring utility.
- Download/copy/share patterns should follow `SharePanel.tsx` for iOS detection, clipboard write, and Web Share API — proven patterns.
- All tap targets ≥ 44px on mobile. Use `min-h-[44px] min-w-[44px]` for action buttons.
- `prefers-reduced-motion`: thumbnail fade-in becomes instant, no preview animations.

---

## Shared Data Models

No shared data models from a master plan. BB-13 is standalone.

**New types for this spec:**

```typescript
// src/types/bible-share.ts (new file)

export type ShareFormat = 'square' | 'story' | 'portrait' | 'wide'

export interface ShareFormatDimensions {
  /** Canvas render width (2x for Retina) */
  canvasWidth: number
  /** Canvas render height (2x for Retina) */
  canvasHeight: number
  /** Export width (1x) */
  exportWidth: number
  /** Export height (1x) */
  exportHeight: number
  label: string
  hint: string
}

export interface ShareCardOptions {
  format: ShareFormat
  includeReference: boolean
  highlightColor: HighlightColor | null
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | BB-13 uses no localStorage. All state is ephemeral per session. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Sub-view is full-width within the action sheet bottom panel. Format thumbnails scroll horizontally if needed. Main preview scales to fit available width. Action buttons 3-across with icon + label. |
| Tablet | 768px | Same as mobile but more breathing room. Format thumbnails all visible without scroll. |
| Desktop | 1440px | Sub-view within the 440px-wide action sheet panel. Format thumbnails fit comfortably. Preview centered with generous padding. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Format picker thumbnails | Square, Story, Portrait, Wide | Same y ±5px at all breakpoints | N/A — horizontal scroll on mobile if needed |
| Action buttons row | Download, Copy, Share | Same y ±5px at all breakpoints | All 3 always on one row (flex, equal width) |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Sub-view header separator → verse reference subtitle | 12-16px | Codebase inspection (other sub-views use `px-4 py-3`) |
| Verse reference subtitle → format picker | 12-16px | Spec-driven (tight layout inside sheet) |
| Format picker → main preview | 16-20px | Spec-driven |
| Main preview → options section | 16px | Spec-driven |
| Options section → action buttons | 16-20px | Spec-driven |
| Action buttons → footer caption | 12px | Spec-driven |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-4 (reader + verse spans + WEB data) is complete and committed
- [x] BB-6 (action sheet + registry + sub-view stack) is complete and committed
- [x] BB-7 (highlight colors for optional card tinting) is complete and committed
- [x] All auth-gated actions from the spec are accounted for (none — share is fully public)
- [x] Design system values are verified (from recon + codebase inspection)
- [x] No deprecated patterns used
- [ ] Lora font is loaded by the app and available via `document.fonts.load()` — verify during Step 2

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canvas renderer vs HTML-to-canvas | Canvas API (programmatic draw calls) | Spec requirement #22. Pixel-perfect, deterministic, zero dependencies, consistent cross-browser. |
| Thumbnail rendering strategy | Render at small canvas dimensions, not downscale from full | Spec requirement #35. Faster rendering, less memory. ~60px tall thumbnails with correct aspect ratio. |
| Renderer cache strategy | Module-level `Map<string, Blob>` keyed by `${format}-${includeRef}-${highlightColor}` | Spec requirement #36. Switching formats is instant from cache. Cleared when sub-view unmounts. |
| iOS download fallback | Open blob URL in new tab + toast | Spec requirement #38. iOS Safari blocks programmatic `<a download>` on blob URLs. |
| Native share button visibility | Completely hidden (not disabled) when `!canShare` | Spec requirement #45. Uses `canUseWebShare()` from SharePanel pattern. |
| Copy image failure | Toast "Copy image isn't supported in this browser" — no fallback | Spec requirement #43. No text copy fallback. |
| Long passage advisory threshold | 800 characters | Spec requirement #20. Advisory only, does not block rendering. |
| "Match my highlight color" toggle | Implement in full (not deferred) | Spec notes it's cuttable, but implementation cost is low — it's just orb hue shifts in the canvas renderer. |
| Sub-view title | Rendered by VerseActionSheet, not by share sub-view | The action sheet already renders "Share" in the sub-view header. The sub-view adds the verse reference as a subtitle below the separator. |
| Font sizes at 2x canvas | Short (<100ch): 72px, Medium (100-250ch): 56px, Long (250-500ch): 44px, Floor: 56px (28px at 1x) | Spec requirement #26. Scaled for 2x canvas (2160px width). |

---

## Implementation Steps

### Step 1: Types and Constants

**Objective:** Define the share format types, dimensions, and color mapping constants.

**Files to create/modify:**
- `frontend/src/types/bible-share.ts` — new file with share format types
- `frontend/src/constants/bible-share.ts` — new file with format dimensions, orb color mapping

**Details:**

Create `types/bible-share.ts`:
```typescript
import type { HighlightColor } from '@/types/bible'

export type ShareFormat = 'square' | 'story' | 'portrait' | 'wide'

export interface ShareFormatDimensions {
  canvasWidth: number
  canvasHeight: number
  exportWidth: number
  exportHeight: number
  label: string
  hint: string
}

export interface ShareCardOptions {
  format: ShareFormat
  includeReference: boolean
  highlightColor: HighlightColor | null
}
```

Create `constants/bible-share.ts`:
```typescript
import type { ShareFormat, ShareFormatDimensions } from '@/types/bible-share'
import type { HighlightColor } from '@/types/bible'

export const SHARE_FORMATS: Record<ShareFormat, ShareFormatDimensions> = {
  square:   { canvasWidth: 2160, canvasHeight: 2160, exportWidth: 1080, exportHeight: 1080, label: 'Square',   hint: 'Instagram, Facebook' },
  story:    { canvasWidth: 2160, canvasHeight: 3840, exportWidth: 1080, exportHeight: 1920, label: 'Story',    hint: 'Stories, Reels' },
  portrait: { canvasWidth: 2160, canvasHeight: 2700, exportWidth: 1080, exportHeight: 1350, label: 'Portrait', hint: 'Instagram Post' },
  wide:     { canvasWidth: 3840, canvasHeight: 2160, exportWidth: 1920, exportHeight: 1080, label: 'Wide',     hint: 'Twitter/X, Desktop' },
}

export const SHARE_FORMAT_IDS: ShareFormat[] = ['square', 'story', 'portrait', 'wide']

/** Orb hue-shift colors for highlight tinting on share cards */
export const HIGHLIGHT_ORB_COLORS: Record<HighlightColor, string> = {
  peace:      'rgba(125, 211, 252, 0.35)',   // blue
  conviction: 'rgba(251, 146, 60, 0.35)',    // amber
  joy:        'rgba(253, 224, 71, 0.35)',     // gold
  struggle:   'rgba(196, 181, 253, 0.35)',    // violet
  promise:    'rgba(110, 231, 183, 0.35)',    // green
}

export const LONG_PASSAGE_THRESHOLD = 800
```

**Auth gating:** N/A — types and constants only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT reuse types from `types/verse-sharing.ts` — those are for the VotD share panel with different format names/dimensions
- DO NOT use raw hex colors in the orb mapping — use rgba values that can be painted directly to canvas

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| SHARE_FORMATS has all 4 formats | unit | Verify square/story/portrait/wide exist with correct dimensions |
| SHARE_FORMAT_IDS matches SHARE_FORMATS keys | unit | Array matches object keys |
| HIGHLIGHT_ORB_COLORS covers all HighlightColor values | unit | Every key in HighlightColor type has an entry |
| Each format has 2x canvas dimensions | unit | canvasWidth = 2 × exportWidth for each format |

**Expected state after completion:**
- [ ] `types/bible-share.ts` exists with `ShareFormat`, `ShareFormatDimensions`, `ShareCardOptions` types
- [ ] `constants/bible-share.ts` exists with `SHARE_FORMATS`, `SHARE_FORMAT_IDS`, `HIGHLIGHT_ORB_COLORS`, `LONG_PASSAGE_THRESHOLD`
- [ ] Build passes, tests pass

---

### Step 2: Canvas Card Renderer

**Objective:** Create the Canvas API renderer that produces the dark cinematic verse card as a Blob, supporting all 4 formats, font auto-sizing, word wrapping, glow orbs, highlight tinting, and Worship Room branding.

**Files to create/modify:**
- `frontend/src/lib/bible/shareCardRenderer.ts` — new file (the core renderer)

**Details:**

Follow the Canvas API pattern from `verse-card-canvas.ts` but with BB-13's distinct visual design.

**Public API:**
```typescript
export async function renderShareCard(
  verses: Array<{ number: number; text: string }>,
  reference: string,
  options: ShareCardOptions,
): Promise<Blob>
```

**Internal functions:**

1. **`loadFonts()`** — `await Promise.all([document.fonts.load('400 48px Lora'), document.fonts.load('400 16px Inter')])`. Block until fonts are ready. Never render with fallback.

2. **`wrapText(ctx, text, maxWidth)`** — Word-by-word wrapping. Split on spaces, measure each word, break line when accumulated width exceeds maxWidth. Handle extremely long single words by character-level break. Return `string[]` of lines.

3. **`calculateFontSize(charCount, canvasWidth)`** — Auto-size based on total character count at 2x canvas resolution:
   - Short (<100 chars): `canvasWidth * 0.033` → ~72px at 2160w
   - Medium (100–250 chars): `canvasWidth * 0.026` → ~56px at 2160w
   - Long (250–500 chars): `canvasWidth * 0.020` → ~44px at 2160w
   - Very long (500+ chars): `canvasWidth * 0.016` → ~35px at 2160w
   - Floor: `Math.max(result, canvasWidth * 0.026)` → ~56px at 2160w (28px at 1x). For Wide format (3840w), floor is `canvasWidth * 0.015` → ~58px.

4. **`drawBackground(ctx, w, h)`** — Linear gradient from `#0D0620` (top) → `#1E0B3E` (40%) → `#251248` (bottom). Full canvas fill.

5. **`drawOrbs(ctx, w, h, highlightColor)`** — 2-3 radial gradient orbs. Default color: `rgba(139, 92, 246, X)` where X is 0.25-0.50. When `highlightColor` is set, shift orb hue using `HIGHLIGHT_ORB_COLORS[highlightColor]`. Position orbs to frame text without competing (top-right, bottom-left, center-bottom).

6. **`drawVerseText(ctx, verses, w, h, fontSize, safeArea)`** — Render verse text in Lora. For multi-verse, prefix each verse with its number in muted color (`rgba(255,255,255,0.4)`, smaller font). Center-aligned for Square/Story/Portrait. Left-aligned on left ~60% for Wide format.

7. **`drawReference(ctx, reference, w, h, safeArea)`** — Below verse text, smaller Inter font, `rgba(255,255,255,0.6)`. Omitted when `includeReference === false`.

8. **`drawWordmark(ctx, w, h)`** — "Worship Room" in Inter, small (~24px at 2x), `rgba(255,255,255,0.35)`, bottom center above WEB attribution.

9. **`drawAttribution(ctx, w, h)`** — "World English Bible · Public Domain" in Inter, tiny (~20px at 2x), `rgba(255,255,255,0.25)`, bottom center.

10. **`canvasToBlob(canvas)`** — `new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(...), 'image/png'))`.

**Safe margins:** 8% inset on all sides. `safeArea = { x: w * 0.08, y: h * 0.08, width: w * 0.84, height: h * 0.84 }`.

**Wide format special layout:** Verse text occupies left ~58% of safe area, reference + wordmark stack on the right ~38%, separated by a thin muted vertical line.

**Auth gating:** N/A — pure utility function.

**Responsive behavior:** N/A: no UI impact (canvas rendering is resolution-independent).

**Guardrails (DO NOT):**
- DO NOT import from `verse-card-canvas.ts` — BB-13's renderer has a different visual design and different format dimensions
- DO NOT use HTML-to-canvas libraries (html2canvas, dom-to-image) — spec explicitly requires Canvas API
- DO NOT skip font loading — every render must await `document.fonts.load()`
- DO NOT use `ctx.fillText()` without prior `wrapText()` — Canvas has no built-in text wrapping
- DO NOT render the Worship Room wordmark in Caveat font — use Inter (Caveat is deprecated for non-logo use)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renderShareCard returns a Blob | unit | Mock canvas, verify toBlob is called and resolves |
| wrapText wraps short text to 1 line | unit | Text shorter than maxWidth → single line |
| wrapText wraps multi-word text | unit | Text exceeding maxWidth → multiple lines |
| wrapText handles single long word | unit | Word longer than maxWidth → character break |
| wrapText handles punctuation at line breaks | unit | Punctuation stays with preceding word |
| calculateFontSize returns large for short text | unit | <100 chars → largest tier |
| calculateFontSize returns medium for medium text | unit | 100-250 chars → medium tier |
| calculateFontSize returns small for long text | unit | 250-500 chars → smaller tier |
| calculateFontSize never goes below floor | unit | 500+ chars → still ≥ floor |
| calculateFontSize scales with canvas width | unit | Wide format (3840) → proportionally larger values |
| drawOrbs uses highlight color when provided | unit | Verify radialGradient color matches HIGHLIGHT_ORB_COLORS |
| drawOrbs uses default purple when no highlight | unit | Default rgba(139,92,246,...) |
| Multi-verse text includes inline verse numbers | unit | Verify verse numbers drawn in muted color |
| Reference is omitted when includeReference=false | unit | No reference drawText call when flag is off |
| Wordmark always appears | unit | "Worship Room" text drawn regardless of options |
| WEB attribution always appears | unit | "World English Bible · Public Domain" always drawn |
| Wide format uses left-aligned layout | unit | Verify text alignment differs for 'wide' format |
| Font loading is awaited | unit | Verify document.fonts.load() called before any draw |

**Expected state after completion:**
- [ ] `src/lib/bible/shareCardRenderer.ts` exists with `renderShareCard()` as the public API
- [ ] All word wrapping, font sizing, and rendering functions are implemented
- [ ] Canvas renders dark cinematic gradient + orbs + verse text + reference + wordmark + attribution
- [ ] Build passes, all unit tests pass

---

### Step 3: Share Action Utilities

**Objective:** Create utility functions for download, copy image, native share, iOS detection, share URL building, and filename generation.

**Files to create/modify:**
- `frontend/src/lib/bible/shareActions.ts` — new file

**Details:**

```typescript
import type { VerseSelection } from '@/types/verse-actions'

/** Build a chapter-level URL for share text payload */
export function buildShareUrl(sel: VerseSelection): string {
  const bookSlug = sel.book.toLowerCase()
  return `worshiproom.com/bible/${bookSlug}/${sel.chapter}`
}

/** Build a download filename */
export function buildShareFilename(sel: VerseSelection): string {
  const bookSlug = sel.book.toLowerCase()
  const endSuffix = sel.endVerse !== sel.startVerse ? `-${sel.endVerse}` : ''
  return `worship-room-${bookSlug}-${sel.chapter}-${sel.startVerse}${endSuffix}.png`
}

/** Detect iOS Safari for download fallback */
export function isIOSSafari(): boolean {
  return /iPhone|iPad/.test(navigator.userAgent)
}

/** Check if native share with files is supported */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    return navigator.canShare?.({ files: [new File([], 'test.png', { type: 'image/png' })] }) ?? false
  } catch {
    return false
  }
}

/** Download a blob as a PNG file */
export async function downloadImage(
  blob: Blob,
  filename: string,
  showToast: (msg: string, type?: string) => void,
): Promise<void> {
  if (isIOSSafari()) {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    showToast('Long-press the image to save it to Photos.')
    // Revoke after a delay to allow the new tab to load
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('Image saved.')
}

/** Copy a blob to clipboard */
export async function copyImage(
  blob: Blob,
  showToast: (msg: string, type?: string) => void,
): Promise<void> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    showToast('Copied to clipboard')
  } catch {
    showToast("Copy image isn't supported in this browser", 'error')
  }
}

/** Share a blob via Web Share API */
export async function shareImage(
  blob: Blob,
  filename: string,
  reference: string,
  shareUrl: string,
  showToast: (msg: string, type?: string) => void,
): Promise<void> {
  try {
    const file = new File([blob], filename, { type: 'image/png' })
    await navigator.share({
      files: [file],
      title: reference,
      text: `${reference} — ${shareUrl}`,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    showToast("Couldn't share the image. Try again.", 'error')
  }
}
```

**Auth gating:** N/A — utility functions only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add a fallback to text-copying when clipboard image write fails — spec says no fallback (requirement #43)
- DO NOT include the URL on the card image itself — the URL goes in the share text payload only (requirement #48)
- DO NOT use `window.location.origin` for the share URL — use the hardcoded `worshiproom.com` domain (requirement #47)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| buildShareUrl single verse | unit | `{ book: 'john', chapter: 3 }` → `"worshiproom.com/bible/john/3"` |
| buildShareUrl range | unit | Same — chapter-level only regardless of verse range |
| buildShareFilename single verse | unit | `{ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }` → `"worship-room-john-3-16.png"` |
| buildShareFilename range | unit | `{ book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6 }` → `"worship-room-psalms-23-1-6.png"` |
| buildShareFilename normalizes book slug | unit | `{ book: 'John' }` → lowercase `"worship-room-john-..."` |
| canShareFiles returns false when navigator.share missing | unit | Mock navigator without share → false |
| isIOSSafari detects iPhone | unit | Mock userAgent with "iPhone" → true |
| isIOSSafari returns false for desktop | unit | Mock desktop userAgent → false |
| downloadImage opens new tab on iOS | unit | Mock isIOSSafari → verify window.open called |
| downloadImage creates temp <a> on desktop | unit | Verify createElement('a') with download attr |
| copyImage calls clipboard.write | unit | Verify navigator.clipboard.write called with ClipboardItem |
| copyImage shows error toast on failure | unit | Mock clipboard.write to reject → verify error toast |

**Expected state after completion:**
- [ ] `src/lib/bible/shareActions.ts` exists with all utility functions
- [ ] Build passes, all unit tests pass

---

### Step 4: ShareSubView Component

**Objective:** Build the React component that renders inside the action sheet sub-view: verse reference subtitle, format picker with live thumbnails, main preview, options toggles, action buttons, and footer.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ShareSubView.tsx` — new file

**Details:**

**Component signature:**
```typescript
interface ShareSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}
```

**State:**
- `format: ShareFormat` — default `'square'`
- `includeReference: boolean` — default `true`
- `matchHighlight: boolean` — default `true` (only matters when highlight exists)
- `thumbnailUrls: Map<ShareFormat, string>` — keyed by format, populated progressively
- `previewUrl: string | null` — current main preview blob URL
- `isRendering: boolean` — loading state for preview

**Cache:**
- Module-level `Map<string, Blob>` keyed by `${format}-${includeRef}-${highlightColor}` for rendered blobs
- Cleared on component unmount via effect cleanup

**Layout (top to bottom inside the scrollable sub-view area):**

1. **Verse reference subtitle** — `px-4 pt-3 pb-2`. Reference text from `formatReference(selection)` in `font-serif text-sm text-white/60`.

2. **Long passage warning** (conditional) — if combined verse text > 800 chars, small `text-white/50 text-xs px-4 pb-2` advisory: "This is a long passage — consider sharing a shorter selection."

3. **Format picker** — `px-4 pb-3`. Horizontal flex row with `gap-3`. Four format thumbnails, each:
   - Container: `relative cursor-pointer rounded-lg overflow-hidden` with aspect-ratio matching the format
   - Thumbnail: `<img>` of the rendered thumbnail (or loading skeleton placeholder)
   - Label: small text below the thumbnail (`text-xs text-white/60`)
   - Selected state: `ring-2 ring-primary shadow-[0_0_12px_rgba(109,40,217,0.5)]` (or tinted ring when matchHighlight is on)
   - Thumbnails render progressively via `useEffect` — each fades in as it completes (opacity transition 200ms, instant if `prefers-reduced-motion`)
   - Thumbnail canvas size: width ~120px × proportional height (small renders, not downscaled from full)
   - Role: `role="radiogroup"` with `aria-label="Card format"`. Each thumbnail is `role="radio"` with `aria-checked`. Arrow key navigation cycles through formats.

4. **Main preview** — `px-4 pb-4`. `<img>` displayed at full fidelity, `max-w-full` with correct aspect ratio. Centered. Loading skeleton while rendering. Dark background behind preview to show card edges.

5. **Options section** — `px-4 pb-3 space-y-3`.
   - "Match my highlight color" toggle — only visible when the selected verse range has an existing BB-7 highlight. Uses `getHighlightForVerse()` to check. Toggle: `<button role="switch">` with label text `text-sm text-white/70` and a pill-shaped switch indicator.
   - "Include reference" toggle — same UI pattern. Default on.

6. **Action buttons row** — `px-4 pb-3 flex gap-3`. Three buttons, equal flex:
   - **Download** — Lucide `Download` icon + "Download" label. `min-h-[44px]`. `bg-white/10 hover:bg-white/15 rounded-xl text-white text-sm`.
   - **Copy** — Lucide `Copy` icon + "Copy" label. Same styling.
   - **Share** — Lucide `Share2` icon + "Share" label. Same styling. **Completely hidden** (not rendered) when `!canShareFiles()`.
   - On click: each button gets the rendered blob from cache (or triggers a fresh render), then calls the corresponding utility from `shareActions.ts`.

7. **Footer caption** — `px-4 pb-4 text-center text-xs text-white/40`: "Cards include a link back to Worship Room"

**Rendering flow:**
1. On mount, render 4 thumbnails concurrently (small canvas dimensions). Progressive fade-in.
2. Render the full preview for the default format (square).
3. On format change: check cache → if cached, update immediately; otherwise render and cache.
4. On option toggle (reference, highlight color): invalidate cache entries, re-render current preview.

**Swipe gesture:** The sub-view already supports swipe-down to pop back via `VerseActionSheet` touch handlers. No additional gesture handling needed.

**Auth gating:** N/A — all actions work for all users.

**Responsive behavior (all within the fixed-width action sheet panel):**
- Desktop (1440px): Sheet panel is ~440px wide. Preview has generous padding. All elements fit.
- Tablet (768px): Same as desktop — sheet panel width unchanged.
- Mobile (375px): Sheet panel is full-width. Format thumbnails in horizontal scroll if needed (unlikely at 4 items with ~60px each). Preview scales to available width. Action buttons stack 3-across.

**Inline position expectations:**
- Format thumbnails (4 items) must share y-coordinate at all breakpoints (±5px tolerance)
- Action buttons (2-3 items) must share y-coordinate at all breakpoints (±5px tolerance)

**Guardrails (DO NOT):**
- DO NOT render a header row (back button, "Share" title, close button) — the action sheet already provides this
- DO NOT use `FrostedCard` for the preview area — it lives inside the sheet's frosted glass backdrop
- DO NOT persist format preference to localStorage — spec says all preferences are ephemeral
- DO NOT show a disabled Share button — hide it completely when not supported
- DO NOT use `animate-glow-pulse` for the selected format ring — use a static ring + shadow
- DO NOT show the "Match my highlight color" toggle when no highlight exists for the selection

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders verse reference subtitle | integration | formatReference output appears in the sub-view |
| Renders 4 format thumbnails | integration | 4 radio items with correct labels |
| Square is selected by default | integration | First thumbnail has `aria-checked="true"` |
| Clicking format updates selection | integration | Click Story → Story gets `aria-checked="true"` |
| Arrow key navigation in format picker | integration | ArrowRight cycles through formats |
| Main preview renders | integration | `<img>` element present with src attribute |
| Long passage warning appears when >800 chars | integration | Warning text visible for long selections |
| Long passage warning hidden for short text | integration | Warning not in DOM for short selections |
| "Include reference" toggle defaults on | integration | Switch has `aria-checked="true"` |
| Toggling reference off re-renders preview | integration | Toggle → verify render triggered |
| "Match my highlight color" visible when highlight exists | integration | Mock getHighlightForVerse → toggle appears |
| "Match my highlight color" hidden when no highlight | integration | Return null from getHighlightForVerse → no toggle |
| Download button present | integration | Button with "Download" label exists |
| Copy button present | integration | Button with "Copy" label exists |
| Share button hidden when canShareFiles() is false | integration | Mock canShareFiles → false → no Share button in DOM |
| Share button visible when canShareFiles() is true | integration | Mock canShareFiles → true → Share button present |
| All action buttons have ≥44px tap target | integration | Check min-h-[44px] class or computed height |
| Footer caption text present | integration | "Cards include a link back to Worship Room" text visible |
| prefers-reduced-motion: thumbnail fade instant | integration | Mock matchMedia → thumbnails have no transition |

**Expected state after completion:**
- [ ] `src/components/bible/reader/ShareSubView.tsx` exists with full layout
- [ ] Format picker with live thumbnails
- [ ] Options toggles (highlight color + include reference)
- [ ] Action buttons call utilities from Step 3
- [ ] Blob cache implemented
- [ ] Build passes, all tests pass

---

### Step 5: Wire Share Action in Registry

**Objective:** Replace the Share stub in `verseActionRegistry.ts` with the real `ShareSubView` component.

**Files to create/modify:**
- `frontend/src/lib/bible/verseActionRegistry.ts` — modify lines 284-293

**Details:**

Replace the stub:
```typescript
// BEFORE (lines 284-293):
const share: VerseActionHandler = {
  action: 'share',
  label: 'Share',
  icon: Share2,
  category: 'primary',
  hasSubView: true,
  renderSubView: stubSubView('Share panel ships in BB-13'),
  isAvailable: () => true,
  onInvoke: () => {},
}

// AFTER:
import { ShareSubView } from '@/components/bible/reader/ShareSubView'

const share: VerseActionHandler = {
  action: 'share',
  label: 'Share',
  icon: Share2,
  category: 'primary',
  hasSubView: true,
  renderSubView: (props) => React.createElement(ShareSubView, props),
  isAvailable: () => true,
  onInvoke: () => {},
}
```

The import goes at the top of the file with the other sub-view imports (CrossRefsSubView, HighlightColorPicker, NoteEditorSubView).

**Auth gating:** N/A — share is always available (`isAvailable: () => true`), no auth check.

**Responsive behavior:** N/A: no UI impact (wiring only).

**Guardrails (DO NOT):**
- DO NOT change `isAvailable` — share is always available for all users
- DO NOT add `getState` — share has no active/inactive state
- DO NOT change `onInvoke` — the sub-view handles all actions internally
- DO NOT change `category: 'primary'` or `hasSubView: true`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Share handler renderSubView returns React element | unit | Call renderSubView with mock props → verify it returns a valid ReactNode |
| Share handler isAvailable returns true | unit | Verify `share.isAvailable(anySelection)` is true |
| Share handler has hasSubView: true | unit | Verify property |
| Existing registry test for share stub passes (updated) | unit | Update the existing stub test to expect a real component |

**Expected state after completion:**
- [ ] Tapping Share in the action sheet opens the ShareSubView component
- [ ] Back button pops to action sheet root (handled by VerseActionSheet)
- [ ] X close button closes the entire sheet (handled by VerseActionSheet)
- [ ] Build passes, all tests pass (including updated registry tests)

---

### Step 6: Integration Testing and Polish

**Objective:** Write integration tests for the full share flow, verify edge cases, ensure performance targets, and polish any visual rough edges.

**Files to create/modify:**
- `frontend/src/components/bible/reader/__tests__/ShareSubView.test.tsx` — new file (integration tests)
- `frontend/src/lib/bible/__tests__/shareCardRenderer.test.ts` — new file (unit tests for renderer)
- `frontend/src/lib/bible/__tests__/shareActions.test.ts` — new file (unit tests for action utilities)

**Details:**

The test files exercise the complete share flow:

1. **Renderer tests** (`shareCardRenderer.test.ts`):
   - Mock `HTMLCanvasElement.prototype.getContext` to return a mock 2D context
   - Mock `canvas.toBlob` to call callback with a dummy Blob
   - Mock `document.fonts.load` to resolve immediately
   - Verify all draw functions are called in correct order
   - Verify font loading is awaited before any drawing
   - Test all 4 format dimensions
   - Test word wrapping edge cases
   - Test font size calculation tiers

2. **Action utility tests** (`shareActions.test.ts`):
   - Test URL building, filename generation, iOS detection
   - Mock clipboard API, navigator.share, DOM createElement
   - Test error paths (clipboard failure, share cancellation)

3. **Component integration tests** (`ShareSubView.test.tsx`):
   - Render ShareSubView with mock selection
   - Verify format picker, options, action buttons
   - Mock canvas rendering (renderer returns a small test Blob)
   - Test keyboard navigation in format picker
   - Test toggle interactions

**Provider wrapping for component tests:**
```typescript
const Wrapper = ({ children }) => (
  <MemoryRouter>
    <ToastProvider>{children}</ToastProvider>
  </MemoryRouter>
)
```

**Auth gating:** N/A — all tests verify features work without auth.

**Responsive behavior:** N/A: no UI impact (test file only).

**Guardrails (DO NOT):**
- DO NOT test actual canvas rendering in component tests — mock the renderer to return a dummy Blob
- DO NOT test actual clipboard/share APIs in component tests — mock them
- DO NOT create Playwright E2E tests in this step — those come via `/verify-with-playwright`

**Test specifications:**

(All tests are defined in the Details section above — this step IS the test step.)

**Expected state after completion:**
- [ ] All unit tests for renderer pass
- [ ] All unit tests for action utilities pass
- [ ] All integration tests for ShareSubView pass
- [ ] Full test suite passes (`pnpm test`)
- [ ] Build passes (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types and constants |
| 2 | 1 | Canvas card renderer (uses types/constants) |
| 3 | 1 | Share action utilities (uses types) |
| 4 | 1, 2, 3 | ShareSubView component (uses renderer + utilities) |
| 5 | 4 | Wire share action in registry |
| 6 | 2, 3, 4, 5 | Integration testing and polish |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types and Constants | [COMPLETE] | 2026-04-08 | Created `types/bible-share.ts` (ShareFormat, ShareFormatDimensions, ShareCardOptions) and `constants/bible-share.ts` (SHARE_FORMATS, SHARE_FORMAT_IDS, HIGHLIGHT_ORB_COLORS, LONG_PASSAGE_THRESHOLD). Tests in `constants/__tests__/bible-share.test.ts` (6 tests). |
| 2 | Canvas Card Renderer | [COMPLETE] | 2026-04-08 | Created `lib/bible/shareCardRenderer.ts` with renderShareCard(), renderShareThumbnail(), wrapText(), calculateFontSize(), drawOrbs(), and all drawing functions. Tests in `lib/bible/__tests__/shareCardRenderer.test.ts` (16 tests). |
| 3 | Share Action Utilities | [COMPLETE] | 2026-04-08 | Created `lib/bible/shareActions.ts` with buildShareUrl(), buildShareFilename(), isIOSSafari(), canShareFiles(), downloadImage(), copyImage(), shareImage(). Tests in `lib/bible/__tests__/shareActions.test.ts` (12 tests). |
| 4 | ShareSubView Component | [COMPLETE] | 2026-04-08 | Created `components/bible/reader/ShareSubView.tsx` with format picker, live thumbnails, main preview, highlight/reference toggles, action buttons, blob cache. Updated shareActions.ts toast type signature to match StandardToastType. Tests in `components/bible/reader/__tests__/ShareSubView.test.tsx` (16 tests). |
| 5 | Wire Share Action in Registry | [COMPLETE] | 2026-04-08 | Replaced stub with `ShareSubView` in `verseActionRegistry.ts`. Added import. Updated existing registry test to exclude share from stub check, added share-specific tests (renderSubView returns element, isAvailable returns true). 47 tests pass. |
| 6 | Integration Testing and Polish | [COMPLETE] | 2026-04-08 | All BB-13 tests pass (97 tests across 5 files). Fixed ref cleanup lint warning in ShareSubView. Build passes, no BB-13 lint errors. Pre-existing test failures (BibleReaderAudio, BibleReaderHighlights, notifications) are unrelated. |
