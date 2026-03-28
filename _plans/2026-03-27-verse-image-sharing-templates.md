# Implementation Plan: Verse Image Sharing Templates

**Spec:** `_specs/verse-image-sharing-templates.md`
**Date:** 2026-03-27
**Branch:** `claude/feature/verse-image-sharing-templates`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Components: `frontend/src/components/<feature>/ComponentName.tsx`
- Hooks: `frontend/src/hooks/hookName.ts`
- Lib/utilities: `frontend/src/lib/`
- Constants: `frontend/src/constants/`
- Types: `frontend/src/types/`
- Tests: co-located `__tests__/` directories next to source
- Pages: `frontend/src/pages/PageName.tsx`

### Existing Canvas & Share Infrastructure

**`lib/verse-card-canvas.ts`** — Current single-template canvas renderer:
- 400×600px dark purple gradient (hero-dark → hero-mid → purple)
- `wrapText()` utility for word-wrapping with `ctx.measureText()`
- Dynamic font sizing (28/24/20px based on char length, reduces by 2px until fits)
- Fonts: Lora italic (verse), Inter (reference), Caveat (watermark)
- Exports `generateVerseImage(text, reference): Promise<Blob>`
- Uses `document.fonts.ready` for font loading

**`lib/challenge-share-canvas.ts`** — Separate canvas for challenges:
- 1080×1080px, uses `darkenColor()` and `roundedRect()` helpers

### Current Share Components (to be replaced for verse sharing)

1. **`VerseSharePanel`** (`components/verse-of-the-day/VerseSharePanel.tsx`) — Absolute-positioned dropdown with 3 menu items (Copy, Share Image, Download). Used by: `VerseOfTheDayCard`, `TodaysVerseSection`, `VerseOfTheDayBanner`. Props: `verseText, verseReference, isOpen, onClose, triggerRef`.

2. **`VerseShareMenu`** (`components/bible/VerseShareMenu.tsx`) — Portal-based dropdown with viewport clamping. Same 3 items. Used by: `BibleReader`. Props: `verseText, reference, isOpen, onClose, anchorElement`.

### Integration Points (verse share triggers)

| Location | File | Current Component | Props Pattern |
|----------|------|-------------------|---------------|
| Dashboard Verse of the Day | `components/dashboard/VerseOfTheDayCard.tsx` | `VerseSharePanel` | `verseText={verse.text}` `verseReference={verse.reference}` |
| Daily Hub Verse of the Day Banner | `components/daily/VerseOfTheDayBanner.tsx` | `VerseSharePanel` | same |
| Landing/Daily Hub Today's Verse | `components/TodaysVerseSection.tsx` | `VerseSharePanel` | same |
| Bible Reader | `pages/BibleReader.tsx` | `VerseShareMenu` | `verseText={selectedVerseData.text}` `reference={...}` |
| AI Bible Chat | `pages/AskPage.tsx` | clipboard copy only | Only copies text, no image |
| Devotional | `components/daily/DevotionalTabContent.tsx` | clipboard copy only | Only copies page URL |
| SharedVerse | `pages/SharedVerse.tsx` | none | No share button currently |
| Prayer response | `components/daily/PrayTabContent.tsx` | `ShareButton` (URL sharing) | `shareUrl`, `shareTitle`, `shareText` — no verse image |

### Non-verse share components (DO NOT MODIFY)

- `ChallengeShareButton` — challenge progress images
- `ShareDropdown` — prayer wall link sharing
- `ListingShareDropdown` — local support link sharing
- `MonthlyShareButton` — placeholder
- `ShareButton` — generic URL sharing (used by Pray tab for prayer link sharing)

### Hooks & Utilities

- **`useFocusTrap(isActive, onEscape)`** — Returns `containerRef`. Traps Tab/Shift+Tab, calls `onEscape` on Escape, restores focus on unmount.
- **`useToast()`** — `showToast(message, type?, action?)` from `ToastProvider` context.
- **`cn()`** — clsx + tailwind-merge in `lib/utils.ts`.
- **Fonts available in CSS**: Lora (Google Fonts), Inter (Google Fonts), Caveat (Google Fonts).

### Test Patterns

- Provider wrapping: `<MemoryRouter>` + `<ToastProvider>` for share components
- Mock canvas: `vi.mock('@/lib/verse-card-canvas', ...)`
- `beforeEach`: `localStorage.clear()`, `vi.clearAllMocks()`
- Use `@testing-library/react` + `userEvent` for interactions
- Mock `navigator.clipboard`, `navigator.share`, `navigator.canShare`

---

## Auth Gating Checklist

**No auth gating required.** The spec explicitly states all share panel actions are available to all users (logged-out and logged-in). Sharing scripture is a conversion opportunity.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| All share panel actions | No auth gate | N/A | None required |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Share panel background | background-color | `#1a0f2e` | spec (custom dark) |
| Share panel border | border | `1px solid rgba(255,255,255,0.1)` | spec: `border-white/10` |
| Share panel shadow | box-shadow | `shadow-2xl` | spec |
| Mobile bottom sheet radius | border-radius | `rounded-t-2xl` (16px top) | spec |
| Desktop modal radius | border-radius | `rounded-xl` (12px) | spec |
| Backdrop | background | `bg-black/50 backdrop-blur-sm` | spec |
| Drag handle | dimensions | `w-10 h-1 bg-white/20 rounded-full` | spec |
| Template thumb (unselected) | style | `bg-white/[0.06] border border-white/10 rounded-lg` | spec |
| Template thumb (selected) | style | `border-primary ring-2 ring-primary/30` | spec |
| Template label | style | `text-xs text-white/50 mt-1 text-center` | spec |
| Size pill (unselected) | style | `bg-white/10 text-white/60 px-4 py-2 rounded-full text-sm` | spec |
| Size pill (selected) | style | `bg-primary/20 text-white border border-primary/30 px-4 py-2 rounded-full text-sm` | spec |
| Primary button | style | `bg-primary text-white font-medium py-3 px-6 rounded-xl` | spec |
| Secondary button | style | `bg-white/10 text-white/80 border border-white/10 py-3 px-6 rounded-xl` | spec |
| Primary color | hex | `#6D28D9` | design-system.md |
| Primary light | hex | `#8B5CF6` | design-system.md |
| Lora font | family | `Lora, serif` | design-system.md: `font-serif` |
| Inter font | family | `Inter, sans-serif` | design-system.md: `font-sans` |
| Caveat font | family | `Caveat, cursive` | design-system.md: `font-script` |
| Loading shimmer | style | `bg-white/5 animate-pulse` | spec |

---

## Design System Reminder

**Project-specific quirks for every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, NOT Lora
- Lora (`font-serif`) is for scripture text only
- Inter (`font-sans`) is the body/heading font
- Primary button: `bg-primary text-white font-medium rounded-xl`
- All interactive elements need min 44px touch targets
- Toast system: `useToast()` from `@/components/ui/Toast`
- Focus indicators: never `outline-none` without visible replacement — use `focus-visible:ring-2`
- `cn()` from `@/lib/utils` for conditional classNames
- `@/` path aliases for all imports
- Dark panels use: `bg-hero-mid border-white/15` (existing dropdowns) — the share panel uses a custom darker `bg-[#1a0f2e]` per spec

---

## Shared Data Models

### New Types

```typescript
// types/verse-sharing.ts
export type ShareTemplate = 'classic' | 'radiant' | 'nature' | 'bold'
export type ShareSize = 'square' | 'story' | 'wide'

export interface ShareSizeDimensions {
  width: number
  height: number
  label: string
  hint: string
}

export interface ShareTemplateConfig {
  id: ShareTemplate
  name: string
  render: (
    ctx: CanvasRenderingContext2D,
    text: string,
    reference: string,
    width: number,
    height: number,
  ) => void
}
```

### localStorage Keys

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_share_last_template` | Both | Last selected template (`"classic"` \| `"radiant"` \| `"nature"` \| `"bold"`) |
| `wr_share_last_size` | Both | Last selected size (`"square"` \| `"story"` \| `"wide"`) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Bottom sheet (slides up), thumbnails ~70px, preview ~300px, buttons full-width side-by-side |
| Tablet | 640-1024px | Centered modal (max-width 480px), thumbnails ~80px, preview ~360px |
| Desktop | > 1024px | Centered modal (max-width 520px), thumbnails ~80px, preview ~400px, "Copy Image" replaces "Share" |

---

## Vertical Rhythm

N/A — This is a modal/bottom sheet overlaying existing pages. No inter-section spacing to verify.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All auth-gated actions from the spec are accounted for (none — all public)
- [x] Design system values are verified from spec + design-system.md
- [ ] Lora, Inter, and Caveat fonts load correctly in canvas context (test manually)
- [ ] The current `generateVerseImage` tests still pass after refactoring
- [ ] AskPage and DevotionalTabContent currently only do clipboard text copy — the spec says to upgrade them to use the new share panel. Confirm this is desired for AskPage (which shares question+verse text, not just a verse) and DevotionalTabContent (which shares a URL, not a verse).

**Assumption:** AskPage's "Share" copies question+verse text (not a pure verse). The spec says to open the share panel for "supporting verse cards." This means adding a per-verse share button on each verse card in the AI chat response, NOT replacing the existing top-level share. DevotionalTabContent shares a URL — the spec says "share button for the devotional scripture passage." This means adding a share button specifically for the devotional's scripture passage, NOT replacing the URL share.

**Assumption:** SharedVerse page (`/verse/:id`) currently has no share button. The spec says to add one.

**Assumption:** PrayTabContent's `ShareButton` shares prayer links. The spec says "Prayer response — Share button on generated prayer display (shares the prayer verse, not the prayer text)." This means adding a verse-specific share button for the verse that accompanied the prayer, NOT replacing the link share.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canvas rendering at full resolution vs preview size | Render at full resolution (1080+px), display scaled via CSS `max-width` on `<img>` | Ensures downloaded image is high quality; preview is just a scaled display |
| Font fallback if Google Fonts unavailable | `serif` for Lora, `sans-serif` for Inter, `cursive` for Caveat | Spec requirement §15 |
| Debounce strategy for preview updates | 300ms debounce on template/size change, loading shimmer while rendering | Spec requirement §6 |
| Web Share API unavailable on desktop | Replace "Share" with "Copy Image" using `navigator.clipboard.write` | Spec requirement §19 |
| Long verse text overflow | Dynamic font sizing (28/22/18px) with iterative reduction until fits safe area | Spec requirement §16 |
| Canvas toBlob failure | Show error toast "Failed to generate image" | Existing pattern from `VerseSharePanel` |
| Bottom sheet vs modal breakpoint | < 640px (sm) = bottom sheet; ≥ 640px = modal | Spec requirement §1 |
| Thumbnail aspect ratio | Thumbnails maintain selected size's aspect ratio (1:1, 9:16, ~2:1) | Spec requirement §4 note about "aspect ratio matching the selected size" |
| AskPage share integration | Add per-verse share icon on each supporting verse card, keep existing top-level share | Spec §22: "Share button on supporting verse cards in `/ask`" |
| DevotionalTabContent integration | Add verse-specific share button next to scripture passage, keep existing URL share | Spec §22: "share button for the devotional scripture passage" |
| PrayTabContent integration | Add verse share button on the prayer's accompanying verse, keep link share | Spec §22: "Share button on generated prayer display (shares the prayer verse, not the prayer text)" |

---

## Implementation Steps

### Step 1: Types & Constants

**Objective:** Define the shared types, size dimensions, template configs, and localStorage keys for the sharing system.

**Files to create/modify:**
- `frontend/src/types/verse-sharing.ts` — New types file
- `frontend/src/constants/verse-sharing.ts` — New constants file

**Details:**

Create `types/verse-sharing.ts`:
```typescript
export type ShareTemplate = 'classic' | 'radiant' | 'nature' | 'bold'
export type ShareSize = 'square' | 'story' | 'wide'

export interface ShareSizeDimensions {
  width: number
  height: number
  label: string
  hint: string
}
```

Create `constants/verse-sharing.ts`:
```typescript
import type { ShareTemplate, ShareSize, ShareSizeDimensions } from '@/types/verse-sharing'

export const SHARE_SIZES: Record<ShareSize, ShareSizeDimensions> = {
  square: { width: 1080, height: 1080, label: 'Square', hint: 'Instagram, FB' },
  story: { width: 1080, height: 1920, label: 'Story', hint: 'Stories, TikTok' },
  wide: { width: 1200, height: 630, label: 'Wide', hint: 'Twitter/X, OG' },
}

export const SHARE_TEMPLATES: { id: ShareTemplate; name: string }[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'radiant', name: 'Radiant' },
  { id: 'nature', name: 'Nature' },
  { id: 'bold', name: 'Bold' },
]

export const DEFAULT_TEMPLATE: ShareTemplate = 'classic'
export const DEFAULT_SIZE: ShareSize = 'square'

export const SHARE_PREF_TEMPLATE_KEY = 'wr_share_last_template'
export const SHARE_PREF_SIZE_KEY = 'wr_share_last_size'
```

**Auth gating:** None.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add any UI rendering code in this step
- DO NOT import from components — these are pure data/type definitions
- DO NOT add unused types speculatively

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SHARE_SIZES has correct dimensions | unit | Verify width/height for all 3 sizes |
| SHARE_TEMPLATES has 4 entries | unit | Verify ids match ShareTemplate type |
| Default values are correct | unit | Verify DEFAULT_TEMPLATE='classic', DEFAULT_SIZE='square' |

**Expected state after completion:**
- [ ] `types/verse-sharing.ts` exports `ShareTemplate`, `ShareSize`, `ShareSizeDimensions`
- [ ] `constants/verse-sharing.ts` exports all constants
- [ ] Tests pass

---

### Step 2: Canvas Template Renderers

**Objective:** Refactor `lib/verse-card-canvas.ts` into a multi-template, multi-size rendering system. Each template has its own render function. The existing `wrapText` and `generateVerseImage` are preserved but the latter is updated to accept template and size parameters.

**Files to create/modify:**
- `frontend/src/lib/verse-card-canvas.ts` — Refactor to support templates and sizes

**Details:**

Preserve the existing `wrapText()` function. Refactor `generateVerseImage()` to accept optional template and size params (defaults to 'classic' and the original 400×600 behavior for backward compat, but when called from the new SharePanel it uses full resolution).

Add a new exported function:
```typescript
export async function generateVerseImageTemplated(
  text: string,
  reference: string,
  template: ShareTemplate,
  size: ShareSize,
): Promise<Blob>
```

This function:
1. Calls `document.fonts.load('italic 28px Lora')` and `document.fonts.load('bold 28px Inter')` to preload fonts (with try/catch to handle unavailable fonts).
2. Creates canvas at `SHARE_SIZES[size].width` × `SHARE_SIZES[size].height`.
3. Calls the appropriate template renderer.
4. Returns PNG blob.

**Template render functions** (all internal, not exported):

**`renderClassic(ctx, text, reference, w, h)`:**
- Gradient: linear top-to-bottom `#1a0533` → `#0f0a1e`
- Verse: Lora italic, white, centered horizontally and vertically, 15% padding each side
- Reference: `rgba(255,255,255,0.6)`, below verse
- Watermark: "Worship Room" in Caveat, `rgba(255,255,255,0.2)`, bottom center

**`renderRadiant(ctx, text, reference, w, h)`:**
- Gradient: linear top-to-bottom `#1a0533` → `#4c1d95` → `#831843`
- Radial glow: `ctx.createRadialGradient` centered, `rgba(255,255,255,0.05)` → transparent
- Verse: Lora italic, white, text-shadow via `ctx.shadowColor = 'rgba(0,0,0,0.3)'`, `ctx.shadowBlur = 8`, `ctx.shadowOffsetY = 2`
- Reference: in pill — draw rounded rect `rgba(255,255,255,0.2)` behind reference text
- Watermark: same position as Classic

**`renderNature(ctx, text, reference, w, h)`:**
- Gradient: linear top-to-bottom `#0f172a` → `#134e4a`
- Verse: Lora italic, `#fef3c7` (cream), centered
- Decorative lines: 1px `rgba(212,165,116,0.3)` horizontal lines above and below verse, width = 60% of canvas, centered
- Reference: cream at 60% opacity
- Watermark: cream at 20% opacity

**`renderBold(ctx, text, reference, w, h)`:**
- Background: solid `#0a0a0a`
- Verse: Inter Bold, white, LEFT-aligned (not centered), large
- Reference: `#8b5cf6` (primary purple), left-aligned
- 3px vertical accent bar: `#8b5cf6`, left edge of text block
- Watermark: "Worship Room" in Caveat, `rgba(255,255,255,0.2)`, bottom-RIGHT

**Dynamic font sizing** (scaled proportionally from 1080px square base):
- Scale factor: `Math.min(w, h) / 1080`
- Short (< 100 chars): `28 * scale`
- Medium (100-250): `22 * scale`
- Long (> 250): `18 * scale`
- Reduce by `2 * scale` until fits safe area (15% padding each side)
- Min font size: `12 * scale`

**Size-specific text positioning:**
- Square: centered vertically and horizontally
- Story: upper third (start Y at ~25% of height, extra padding below for Instagram UI)
- Wide: centered vertically, slightly larger base font (multiply by 1.15)

Keep the original `generateVerseImage(text, reference)` function signature working by having it call `renderClassic` at 400×600 internally.

**Auth gating:** None.

**Responsive behavior:** N/A: no UI impact (canvas rendering library).

**Guardrails (DO NOT):**
- DO NOT remove or change the original `generateVerseImage` function signature — existing code depends on it
- DO NOT use `dangerouslySetInnerHTML` or DOM rendering — all canvas API
- DO NOT hardcode canvas dimensions — use `SHARE_SIZES` from constants
- DO NOT forget `ctx.save()`/`ctx.restore()` around shadow operations (Radiant template)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| generateVerseImageTemplated returns blob for each template | unit | Call with all 4 templates × 'square', verify Blob returned |
| generateVerseImageTemplated returns blob for each size | unit | Call with 'classic' × all 3 sizes, verify dimensions |
| original generateVerseImage still works | unit | Backward compat — call original, verify blob returned |
| wrapText wraps long text | unit | Verify lines array for text exceeding maxWidth |
| wrapText handles single word | unit | Single long word → single line |
| font preloading called | unit | Verify document.fonts.load is called |

**Expected state after completion:**
- [ ] `generateVerseImageTemplated()` exported and working for all 12 template×size combos
- [ ] `generateVerseImage()` backward-compatible
- [ ] All tests pass

---

### Step 3: SharePanel Component — Core UI

**Objective:** Build the `SharePanel` component with template picker, size selector, live preview, and action buttons. This is the main new component.

**Files to create/modify:**
- `frontend/src/components/sharing/SharePanel.tsx` — New component

**Details:**

Props:
```typescript
interface SharePanelProps {
  verseText: string
  reference: string
  isOpen: boolean
  onClose: () => void
}
```

**Structure:**
1. **Overlay/container**: On mobile (< 640px via `window.innerWidth` or media query): bottom sheet with `fixed inset-0 z-50`. On desktop: centered modal with backdrop.
2. **Backdrop** (desktop): `bg-black/50 backdrop-blur-sm`, click to close.
3. **Panel**: `bg-[#1a0f2e] border border-white/10 shadow-2xl`. Mobile: `rounded-t-2xl` anchored to bottom, `max-h-[90vh] overflow-y-auto`. Desktop: `rounded-xl max-w-[520px] w-full` centered via flex.
4. **Drag handle** (mobile only): `w-10 h-1 bg-white/20 rounded-full mx-auto mb-4`.
5. **Close button** (desktop only): X icon `text-white/40 hover:text-white/70` top-right.
6. **Template thumbnails**: Horizontal scroll row (`flex gap-3 overflow-x-auto` with `scrollbar-hide` class). Each ~80px wide (mobile: ~70px). Render miniature canvas previews. Selected: `border-primary ring-2 ring-primary/30`. Label below each.
7. **Live preview**: `<img>` element displaying the rendered canvas at preview size (300/360/400px depending on breakpoint). Maintain aspect ratio. Show shimmer (`bg-white/5 animate-pulse rounded-lg`) while rendering. `alt` text: `"Preview of {reference} in {template} template"`.
8. **Size pills**: `flex gap-2 justify-center`. 3 pills with labels and platform hints.
9. **Action buttons**: `flex gap-3`. "Download" + "Share"/"Copy Image" depending on platform.

**State management:**
- `template`: initialized from `localStorage.getItem(SHARE_PREF_TEMPLATE_KEY) || DEFAULT_TEMPLATE`
- `size`: initialized from `localStorage.getItem(SHARE_PREF_SIZE_KEY) || DEFAULT_SIZE`
- `previewUrl`: `string | null` — object URL from canvas blob
- `isRendering`: boolean — shimmer state
- On template/size change: save to localStorage, debounce 300ms, re-render canvas

**Canvas rendering pipeline:**
1. On template/size change → set `isRendering = true` → debounce 300ms
2. Call `generateVerseImageTemplated(verseText, reference, template, size)`
3. Create object URL from blob → set `previewUrl`, `isRendering = false`
4. Clean up old object URL via `URL.revokeObjectURL` in useEffect cleanup

**Thumbnail previews:**
- Render each template at a small fixed size (e.g., 160×160 for square) using `generateVerseImageTemplated` on mount
- Cache as object URLs in a `useRef` map
- Clean up all URLs on unmount

**Action handlers:**
- **Download**: Call `generateVerseImageTemplated`, create blob, use `URL.createObjectURL` + anchor click pattern. Filename: `worship-room-{reference-slugified}-{template}-{size}.png`
- **Share** (mobile, Web Share API available): `navigator.share({ files: [file] })`
- **Copy Image** (desktop or Web Share unavailable): `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`. Show toast "Image copied!" on success.

**Accessibility:**
- `role="dialog"` + `aria-label="Share verse"` on the panel
- `useFocusTrap(isOpen, onClose)` for focus trapping
- Template thumbnails: `role="radiogroup"` with `role="radio"` + `aria-checked` on each, arrow key navigation
- Size pills: same `role="radiogroup"` pattern
- All buttons: clear accessible labels, `min-h-[44px]`
- Close on Escape (handled by `useFocusTrap`)

**Responsive behavior:**
- Desktop (> 1024px): Modal centered via `flex items-center justify-center`, max-width 520px, preview ~400px wide
- Tablet (640-1024px): Modal centered, max-width 480px, preview ~360px wide
- Mobile (< 640px): Bottom sheet anchored to bottom, preview ~300px wide, drag handle visible, close button hidden

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT forget to revoke object URLs (memory leak)
- DO NOT render full-size canvas in the DOM — render off-screen, display as `<img src={objectUrl}>`
- DO NOT make the bottom sheet dismissable by drag (keep it simple — close via X/backdrop/Escape only)
- DO NOT add animation for the bottom sheet slide-up in this step (can add later if needed, use `transition-transform` if added)
- DO NOT forget `aria-modal="true"` on the dialog

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders nothing when isOpen=false | unit | No dialog in DOM |
| renders dialog when isOpen=true | unit | `role="dialog"` present |
| shows 4 template thumbnails | unit | 4 radio buttons in template radiogroup |
| shows 3 size pills | unit | 3 radio buttons in size radiogroup |
| template selection updates state | integration | Click Radiant → selected state changes |
| size selection updates state | integration | Click Story → selected state changes |
| Download button triggers download | integration | Mock canvas, verify anchor click |
| Copy Image button copies to clipboard | integration | Mock clipboard.write, verify toast |
| Share button uses Web Share API | integration | Mock navigator.share, verify called with file |
| closes on backdrop click (desktop) | integration | Fire click on backdrop, verify onClose called |
| closes on Escape | integration | Fire Escape key, verify onClose called |
| focus trapped within dialog | integration | Verify focus stays in dialog |
| preferences saved to localStorage | integration | Change template, verify localStorage updated |
| preferences loaded from localStorage | integration | Set localStorage, open panel, verify selection |
| loading shimmer shown during render | unit | Verify shimmer element while isRendering=true |

**Expected state after completion:**
- [ ] `SharePanel` renders as bottom sheet (mobile) or modal (desktop)
- [ ] Template picker with 4 thumbnails, live preview, size selector, action buttons
- [ ] Preferences persist to localStorage
- [ ] Accessible: focus trap, keyboard nav, aria attributes
- [ ] All tests pass

---

### Step 4: Integration — Verse of the Day Components

**Objective:** Replace `VerseSharePanel` usage in the 3 Verse of the Day locations with the new `SharePanel`.

**Files to modify:**
- `frontend/src/components/dashboard/VerseOfTheDayCard.tsx`
- `frontend/src/components/daily/VerseOfTheDayBanner.tsx`
- `frontend/src/components/TodaysVerseSection.tsx`

**Details:**

In each file:
1. Replace `import { VerseSharePanel } from '@/components/verse-of-the-day/VerseSharePanel'` with `import { SharePanel } from '@/components/sharing/SharePanel'`.
2. Replace `<VerseSharePanel verseText={...} verseReference={...} isOpen={...} onClose={...} triggerRef={...} />` with `<SharePanel verseText={verse.text} reference={verse.reference} isOpen={sharePanelOpen} onClose={handleClosePanel} />`.
3. Remove the `triggerRef` ref creation if it was only used for VerseSharePanel (keep if used for `aria-expanded` on the trigger button).
4. The `relative` wrapper div around the trigger button is no longer needed (the new SharePanel is a fixed-position modal, not absolute-positioned). Remove unnecessary `relative` containers.
5. Keep the trigger button's `aria-haspopup` but change value from `"menu"` to `"dialog"`.

**VerseOfTheDayCard.tsx:**
- Remove: `useRef` import (if only used for triggerRef), `VerseSharePanel` import
- Add: `SharePanel` import
- Change: `aria-haspopup="dialog"`, remove `relative` wrapper if present

**VerseOfTheDayBanner.tsx:**
- Same pattern. The trigger button ref is still needed for `aria-expanded`, just remove the triggerRef prop from the share component.

**TodaysVerseSection.tsx:**
- Same pattern.

**Auth gating:** None.

**Responsive behavior:**
- Desktop (> 1024px): Share panel opens as centered modal overlay (no change to trigger button layout)
- Tablet (640-1024px): Same modal
- Mobile (< 640px): Share panel opens as bottom sheet

**Guardrails (DO NOT):**
- DO NOT delete the old `VerseSharePanel` component file yet (do that in cleanup step)
- DO NOT change the trigger button styling — only the `aria-haspopup` value
- DO NOT modify the verse text/reference data flow

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| VerseOfTheDayCard share opens SharePanel | integration | Click share → dialog appears |
| VerseOfTheDayBanner share opens SharePanel | integration | Click share → dialog appears |
| TodaysVerseSection share opens SharePanel | integration | Click share → dialog appears |

**Expected state after completion:**
- [ ] All 3 VotD locations open the new SharePanel modal
- [ ] Old `VerseSharePanel` is no longer imported by these files
- [ ] Tests pass

---

### Step 5: Integration — Bible Reader

**Objective:** Replace `VerseShareMenu` in the Bible Reader with the new `SharePanel`.

**Files to modify:**
- `frontend/src/pages/BibleReader.tsx`

**Details:**

1. Replace `import { VerseShareMenu } from '@/components/bible/VerseShareMenu'` with `import { SharePanel } from '@/components/sharing/SharePanel'`.
2. Replace the `<VerseShareMenu>` invocation with `<SharePanel>`.
3. Props mapping: `verseText={selectedVerseData.text}`, `reference={`${book.name} ${chapterNumber}:${selectedVerse} WEB`}`, `isOpen={showShareMenu}`, `onClose={() => { setShowShareMenu(false); handleDismissActionBar(); }}`.
4. Remove `anchorElement` prop (not used by SharePanel — it's a full modal).
5. The FloatingActionBar's `onShare` callback sets `showShareMenu = true` — this stays the same.

**Auth gating:** None.

**Responsive behavior:**
- Desktop: Modal overlay on top of Bible reader
- Mobile: Bottom sheet

**Guardrails (DO NOT):**
- DO NOT change the FloatingActionBar component
- DO NOT remove the `selectedElement` state if used for other purposes (highlight positioning)
- DO NOT modify Bible reader scroll/verse selection logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Bible reader share opens SharePanel | integration | Click share in action bar → dialog appears |
| SharePanel receives correct verse text and reference | integration | Verify props passed correctly |

**Expected state after completion:**
- [ ] Bible reader share button opens new SharePanel
- [ ] `VerseShareMenu` no longer imported by BibleReader
- [ ] Tests pass

---

### Step 6: Integration — AI Bible Chat, Devotional, SharedVerse, Prayer Response

**Objective:** Add verse-specific share buttons in the remaining 4 integration points.

**Files to modify:**
- `frontend/src/pages/AskPage.tsx` — Add share icon on each supporting verse card
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Add share button for scripture passage
- `frontend/src/pages/SharedVerse.tsx` — Add share button
- `frontend/src/components/daily/PrayTabContent.tsx` — Add share button for prayer's verse

**Details:**

**AskPage.tsx:**
- In the response display area where supporting verses are listed, add a small share icon (`Share2`, 16px) on each verse card.
- Clicking it opens `<SharePanel verseText={verse.text} reference={verse.reference} isOpen={...} onClose={...} />`.
- Use local state `shareVerseIndex: number | null` to track which verse's panel is open.
- Keep the existing top-level `handleShare` (clipboard copy) unchanged.

**DevotionalTabContent.tsx:**
- Find the scripture passage display section. Add a share icon button (`Share2`) next to or below the passage.
- The devotional has a `passage` field with reference and text. Pass these to `<SharePanel>`.
- Keep the existing "Share today's devotional" URL copy button unchanged.

**SharedVerse.tsx:**
- Add a share button below the verse reference (in the hero section, after the reference text).
- Style: `rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white` (same as TodaysVerseSection pattern).
- Opens `<SharePanel verseText={verse.text} reference={`${verse.reference} WEB`} isOpen={...} onClose={...} />`.

**PrayTabContent.tsx:**
- In the generated prayer display section, the prayer response includes a verse. Add a small share icon on the verse portion.
- Import `SharePanel`. Track open state. Pass verse text and reference.
- Keep the existing `ShareButton` for prayer URL sharing.

**Auth gating:** None — all share actions are public.

**Responsive behavior:**
- Desktop (> 1024px): All share triggers open modal
- Tablet (640-1024px): Same modal
- Mobile (< 640px): All share triggers open bottom sheet

**Guardrails (DO NOT):**
- DO NOT remove the existing share functionality in AskPage (clipboard copy) or DevotionalTabContent (URL copy) or PrayTabContent (ShareButton URL share)
- DO NOT add share buttons to non-verse content
- DO NOT modify the prayer text or AI response formatting

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AskPage verse card has share button | integration | Verify share icon on verse cards |
| AskPage share button opens SharePanel | integration | Click → dialog appears |
| DevotionalTabContent has scripture share button | integration | Verify share icon near passage |
| SharedVerse page has share button | integration | Verify share button in hero |
| PrayTabContent has verse share button | integration | Verify share icon on prayer verse |

**Expected state after completion:**
- [ ] All 4 integration points have verse-specific share buttons opening SharePanel
- [ ] Existing share functionality preserved in all locations
- [ ] Tests pass

---

### Step 7: Cleanup & Old Component Removal

**Objective:** Remove the old `VerseSharePanel` and `VerseShareMenu` components that are no longer used, and update their tests.

**Files to modify/delete:**
- `frontend/src/components/verse-of-the-day/VerseSharePanel.tsx` — Delete
- `frontend/src/components/verse-of-the-day/__tests__/VerseSharePanel.test.tsx` — Delete
- `frontend/src/components/bible/VerseShareMenu.tsx` — Delete
- `frontend/src/components/bible/__tests__/VerseShareMenu.test.tsx` — Delete

**Details:**

1. Verify with `grep` that no files still import `VerseSharePanel` or `VerseShareMenu`.
2. Delete the 4 files.
3. If any shared test utilities or helpers were co-located with these files, ensure they're either unused or migrated.

**Auth gating:** None.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT delete files if any imports still reference them (run grep first)
- DO NOT delete `verse-card-canvas.ts` — it's still used (refactored, not removed)
- DO NOT delete the `components/verse-of-the-day/` directory if other files live there

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No remaining imports of VerseSharePanel | unit | Grep codebase, verify 0 results |
| No remaining imports of VerseShareMenu | unit | Grep codebase, verify 0 results |
| All existing tests pass | integration | Full test suite green |

**Expected state after completion:**
- [ ] Old share components deleted
- [ ] No broken imports
- [ ] Full test suite passes

---

### Step 8: Regression Verification

**Objective:** Verify that non-verse sharing components are unaffected and the full test suite passes.

**Files to verify (read-only):**
- `frontend/src/components/challenges/ChallengeShareButton.tsx` — Unchanged
- `frontend/src/components/prayer-wall/ShareDropdown.tsx` — Unchanged
- `frontend/src/components/local-support/ListingShareDropdown.tsx` — Unchanged
- `frontend/src/components/insights/MonthlyShareButton.tsx` — Unchanged

**Details:**

1. Run full test suite: `cd frontend && pnpm test`.
2. Verify zero changes to the 4 non-verse share components (check git diff).
3. Verify "Copy verse" text functionality still works in Bible reader (the FloatingActionBar's copy action is separate from the share panel).

**Auth gating:** None.

**Responsive behavior:** N/A: verification step.

**Guardrails (DO NOT):**
- DO NOT modify any non-verse sharing components
- DO NOT add new tests in this step — just run existing ones

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite passes | integration | `pnpm test` exits 0 |
| ChallengeShareButton tests pass | integration | Existing tests unchanged |
| ShareDropdown tests pass | integration | Existing tests unchanged |
| ListingShareDropdown tests pass | integration | Existing tests unchanged |

**Expected state after completion:**
- [ ] Full test suite passes
- [ ] No regressions in non-verse sharing
- [ ] Feature is complete

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & constants |
| 2 | 1 | Canvas template renderers |
| 3 | 1, 2 | SharePanel component |
| 4 | 3 | Integration: Verse of the Day (3 files) |
| 5 | 3 | Integration: Bible Reader |
| 6 | 3 | Integration: AskPage, Devotional, SharedVerse, PrayTab |
| 7 | 4, 5, 6 | Cleanup old components |
| 8 | 7 | Regression verification |

Steps 4, 5, 6 can run in parallel after Step 3 is complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Constants | [COMPLETE] | 2026-03-27 | Created `types/verse-sharing.ts` + `constants/verse-sharing.ts` + `constants/__tests__/verse-sharing.test.ts`. 5/5 tests pass. |
| 2 | Canvas Template Renderers | [COMPLETE] | 2026-03-27 | Refactored `lib/verse-card-canvas.ts`: added 4 template renderers (classic/radiant/nature/bold), `generateVerseImageTemplated()`, exported `wrapText()`. Original `generateVerseImage()` preserved. Fixed pre-existing TS errors in AudioDrawer, AuthModal.test, AskPage. 15/15 tests pass. |
| 3 | SharePanel Component | [COMPLETE] | 2026-03-27 | Created `components/sharing/SharePanel.tsx` + `__tests__/SharePanel.test.tsx`. Mobile bottom sheet / desktop modal, template picker, size selector, live preview, download/share/copy. 15/15 tests pass. |
| 4 | Integration: Verse of the Day | [COMPLETE] | 2026-03-27 | Updated VerseOfTheDayCard, VerseOfTheDayBanner, TodaysVerseSection, DailyHub to use SharePanel. Changed aria-haspopup from "menu" to "dialog". Updated 5 test files for new role/aria assertions. All tests pass. |
| 5 | Integration: Bible Reader | [COMPLETE] | 2026-03-27 | Replaced VerseShareMenu with SharePanel in BibleReader.tsx. Removed anchorElement prop dependency. 15/15 tests pass. |
| 6 | Integration: AI Chat, Devotional, SharedVerse, Prayer | [COMPLETE] | 2026-03-27 | Added Share button to VerseCardActions (AskPage verse cards), DevotionalTabContent (passage share), SharedVerse (hero share button). **Deviation:** Skipped PrayTabContent — MockPrayer type has no verse field, so there's no accompanying verse to share. Added ToastProvider to SharedVerse test wrapper. All tests pass. |
| 7 | Cleanup Old Components | [COMPLETE] | 2026-03-27 | Deleted `components/verse-of-the-day/` directory (VerseSharePanel + test), `components/bible/VerseShareMenu.tsx` + test. No remaining imports. Build clean. |
| 8 | Regression Verification | [COMPLETE] | 2026-03-27 | Full test suite: 4714/4715 pass (1 pre-existing PrayCeremony timeout). Non-verse share components verified unchanged. Build clean. |
