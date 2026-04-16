# Implementation Plan: Shareable Moments Expansion

**Spec:** `_specs/shareable-moments-expansion.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/shareable-moments-expansion`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon may be stale (captured 2026-03-06, before Round 2/3 dark theme, inner page hero redesigns, navigation consolidation, and many new pages). Canvas rendering is independent of the live app's CSS, so this is acceptable — canvas styles are specified directly in the spec.

---

## Architecture Context

### Relevant Existing Files

**Canvas rendering patterns (the primary patterns to follow):**
- `frontend/src/lib/verse-card-canvas.ts` — 521 lines. Font loading via `document.fonts.load()`, `wrapText()` for word wrapping, `fitVerseText()` for dynamic sizing, `drawLines()` for multi-line rendering. Returns `Promise<Blob>` via `canvas.toBlob()`. Fonts: Lora (serif), Inter (sans-serif), Caveat (cursive).
- `frontend/src/lib/challenge-share-canvas.ts` — 111 lines. Simpler pattern. Single 1080×1080 size. `document.fonts.ready`, gradient background, Caveat title, Inter body, watermark at y=1020. Returns `Promise<Blob>`.
- `frontend/src/lib/testimony-card-canvas.ts` — 106 lines. Uses `wrapText()` imported from verse-card-canvas. Dark gradient base + radial glow. Caveat headings, Lora italic quotes, Inter body. Watermark: `'Worship Room'` at 28px Caveat, white 40%, y=1020.

**Share flow patterns:**
- `frontend/src/components/challenges/ChallengeShareButton.tsx` — 110 lines. Self-contained share button. Uses `useToastSafe()`. Generates canvas, tries Web Share API (`navigator.share` + `canShare`), falls back to download. Loading state via `isGenerating`. This is the closest pattern to what we need — a simple button that generates + shares an image.
- `frontend/src/components/sharing/SharePanel.tsx` — 479 lines. Full share UI with template/size selection, live preview, download, Web Share / clipboard. **Tightly coupled to verse sharing. NOT reusable for these new card types.**

**Celebration system:**
- `frontend/src/components/dashboard/CelebrationOverlay.tsx` — 205 lines. Full-screen portal celebration. Props: `{ badge: BadgeDefinition, onDismiss: () => void, suggestion?: { text, link } }`. Contains: confetti particles, `BadgeIconCircle`, badge name (h2), encouragement message, verse (level-ups only), suggestion link, Continue button (delayed 6s). Uses `useFocusTrap`, `createPortal`, scroll lock. Z-index: `Z.OVERLAY`.
- `frontend/src/components/dashboard/CelebrationQueue.tsx` — 48 lines. Orchestrates celebrations. Uses `useCelebrationQueue` hook. Renders `CelebrationOverlay` for `'overlay'` type, toasts for toast tiers.
- `frontend/src/hooks/useCelebrationQueue.ts` — 202 lines. Processes `newlyEarnedBadges` array. Sorts by tier priority. Full-screen celebrations wait for `dismissCurrent()` promise. Toast celebrations use `showCelebrationToast`. 1.5s initial delay.

**Badge/level/streak data:**
- `frontend/src/constants/dashboard/badges.ts` — Badge definitions. `STREAK_TIERS`: 7/14/30 are `'toast'`, 60/90/180/365 are `'full-screen'`. Level badges: all `'full-screen'`. Each level badge has a `verse` property from `LEVEL_UP_VERSES`.
- `frontend/src/constants/dashboard/badge-icons.ts` — `LEVEL_ENCOURAGEMENT_MESSAGES` (1-6), `STREAK_MILESTONE_MESSAGES` (60/90/180/365 only), `CONFETTI_COLORS`, `getBadgeIcon()`.
- `frontend/src/constants/dashboard/levels.ts` — `LEVEL_THRESHOLDS` with names: Seedling(1), Sprout(2), Blooming(3), Flourishing(4), Oak(5), Lighthouse(6). `LEVEL_ICON_NAMES` maps level numbers to Lucide icon component names.

**Monthly report:**
- `frontend/src/pages/MonthlyReport.tsx` — 211 lines. Auth-gated. Uses `useMonthlyReportData(month, year)`. Already imports and renders `MonthlyShareButton` component. Hero uses `ATMOSPHERIC_HERO_BG` + `GRADIENT_TEXT_STYLE`.
- `frontend/src/components/insights/MonthlyShareButton.tsx` — 22 lines. **Currently a stub** — shows "Share Your Month" button that displays a "coming soon" toast. This will be replaced with real canvas generation + share.
- `frontend/src/hooks/useMonthlyReportData.ts` — Returns `MonthlyReportData` with: `monthName`, `year`, `daysActive`, `pointsEarned`, `longestStreak`, `moodEntries`, `activityCounts` (mood/pray/journal/meditate/listen/prayerWall), `moodTrendPct`.

### Directory Conventions

- Canvas renderers: `frontend/src/lib/` (e.g., `verse-card-canvas.ts`, `challenge-share-canvas.ts`, `testimony-card-canvas.ts`)
- Share components: `frontend/src/components/sharing/` for full UI, or colocated with feature (e.g., `ChallengeShareButton` in `components/challenges/`)
- Constants: `frontend/src/constants/dashboard/`
- Tests mirror source structure with `__tests__/` subdirectories

### Test Patterns

- Vitest + React Testing Library + jsdom
- Mock `useToast` via `vi.mock('@/components/ui/Toast', ...)`
- Mock `navigator.share` and `navigator.clipboard` via `vi.stubGlobal` or `Object.defineProperty`
- Canvas tests mock `HTMLCanvasElement.prototype.getContext` and `HTMLCanvasElement.prototype.toBlob`
- CelebrationOverlay tests: `vi.useFakeTimers()`, check text content, check button visibility after timer advance
- Provider wrapping: CelebrationOverlay is rendered via portal, doesn't need providers in test. MonthlyReport tests need auth mocking.

### Key Observations

1. **Streak celebration tiers**: 7/14/30 are `'toast'` tier — they never show the full-screen `CelebrationOverlay`. Only 60/90/180/365 are `'full-screen'`. The spec says "Share" button on streak milestone celebrations — this means the overlay (full-screen tier only). Toast-tier streaks follow the same rule as tier-1 badges: include if it fits cleanly, skip if not. Decision: **skip toast-tier streak sharing** since the spec explicitly deprioritizes toast sharing.
2. **CelebrationOverlay receives a `BadgeDefinition`** — the component doesn't know if it's a badge, streak, or level-up. It checks `badge.id` patterns (`level_N`, `streak_N`) to determine the type. The share button must do the same.
3. **MonthlyShareButton already exists as a stub** in `MonthlyReport.tsx` — it just needs real implementation. It currently takes no props. It will need `MonthlyReportData` passed down (or access the data itself).
4. **Verse-card-canvas exports `wrapText`** which is already reused by testimony-card-canvas. New canvas renderers should import it too.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Badge celebration + share | N/A — badges only trigger for logged-in users | Step 3 | Inherently gated (overlay only shows for authenticated users via CelebrationQueue in Dashboard) |
| Streak milestone + share | N/A — streaks only tracked for logged-in users | Step 3 | Inherently gated (same as badges) |
| Level up + share | N/A — levels only tracked for logged-in users | Step 3 | Inherently gated (same as badges) |
| Monthly insights share | Page is auth-gated (`/insights/monthly`) | Step 4 | Page-level `Navigate` redirect in MonthlyReport.tsx line 60-62 |

No additional auth modals needed — all features exist within already-gated experiences.

---

## Design System Values (for UI steps)

Canvas rendering is independent of live app CSS. Values come from the spec and existing canvas patterns:

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Canvas size (all cards) | dimensions | 1080×1080 | Spec |
| Dark gradient base | colors | `#0D0620` to `#1E0B3E` | Spec + design-system.md (hero-dark, hero-mid) |
| Badge accent | radial glow | `#6D28D9` at 15% opacity | Spec (purple family) |
| Streak accent | radial glow | `#D97706` at 15% opacity | Spec (amber family) |
| Level-up accent | radial glow | `#27AE60`/`#34D399` at 15% opacity | Spec (green family) |
| Monthly accent | radial glow | `#6D28D9` at 15% opacity | Spec (brand purple) |
| Primary text | color | `#FFFFFF` | Spec + existing canvas patterns |
| Secondary text | color | `rgba(255,255,255,0.7)` | Spec |
| Watermark | font/color | `28px Caveat`, `rgba(255,255,255,0.4)`, y=1020 | testimony-card-canvas.ts pattern |
| Heading | font | `bold 64px Caveat, cursive` | challenge-share-canvas.ts pattern |
| Body | font | `Inter, sans-serif` | Spec |
| Verse/message italic | font | `italic Lora, serif` | Spec |
| Divider line | color | `rgba(255,255,255,0.2)` | Spec + verse-card-canvas.ts |
| Share button (overlay) | classes | `bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-full min-h-[44px]` | Spec |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses Caveat for script/branded headings, not Lora. Canvas watermarks use Caveat.
- Inter is the primary body/heading font. Lora is for scripture/serif italic only.
- All canvas watermarks use pattern: `'Worship Room'` at Caveat 28px, `rgba(255,255,255,0.4)`, centered, y=1020.
- Existing canvas files import `wrapText` from `verse-card-canvas.ts` — reuse it, don't duplicate.
- CelebrationOverlay uses `createPortal(... , document.body)` — share UI must work within this portal context.
- Continue button in CelebrationOverlay has a 6s delay (instant with reduced motion) — share button should be visible immediately, not delayed.
- Toast uses `useToast()` from `'@/components/ui/Toast'`. Challenge share uses `useToastSafe()` — prefer `useToastSafe()` since CelebrationOverlay renders via portal outside the normal provider tree.
- `LEVEL_UP_VERSES` in badges.ts are different from the spec's share card verses. The spec defines specific share card verses per level. The overlay already displays `LEVEL_UP_VERSES` — the share canvas should use the spec's share-specific verses.
- `STREAK_MILESTONE_MESSAGES` in badge-icons.ts only has entries for 60/90/180/365. The spec defines messages for ALL 7 milestones (7/14/30/60/90/180/365). The canvas must use its own constants.

---

## Shared Data Models

No new TypeScript interfaces needed beyond function parameter types. Reads from existing:

```typescript
// Already exists in types/dashboard.ts
interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  celebrationTier: CelebrationTier;
  verse?: { text: string; reference: string };
}

// Already exists in hooks/useMonthlyReportData.ts
interface MonthlyReportData {
  monthName: string;
  year: number;
  daysActive: number;
  pointsEarned: number;
  longestStreak: number;
  moodEntries: MoodEntry[];
  activityCounts: Record<string, number>;
  moodTrendPct: number;
  // ... other fields
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_badges` | Read | Badge data (for overlay context) |
| `wr_streak` | Read | Streak data (for overlay context) |
| `wr_faith_points` | Read | Level data (for overlay context) |
| `wr_mood_entries` | Read | Monthly stats (via useMonthlyReportData) |
| `wr_daily_activities` | Read | Monthly stats (via useMonthlyReportData) |

No new keys. No writes.

---

## Responsive Structure

**Celebration Overlay share button:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Share + Continue stack vertically, full-width, 44px min-height each |
| Tablet | 768px | Share + Continue side-by-side, centered |
| Desktop | 1440px | Share + Continue side-by-side, centered |

**Monthly report share button:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Full-width button (already the case) |
| Tablet | 768px | Inline auto-width button (already the case) |
| Desktop | 1440px | Inline auto-width button (already the case) |

---

## Vertical Rhythm

N/A — this feature adds buttons to existing UI surfaces (celebration overlay, monthly report page). No new sections or page-level spacing changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is clear and complete — no ambiguities identified
- [x] All auth-gated actions from the spec are accounted for (all inherently gated)
- [x] Design system values are specified in the spec (canvas is independent of CSS)
- [x] `wrapText` from verse-card-canvas.ts is exported and importable
- [x] CelebrationOverlay renders for both level-up and streak full-screen badges
- [x] MonthlyShareButton is a stub ready to be replaced
- [x] MonthlyReportData provides all fields needed for the share card
- [ ] `useToastSafe` is available for use in portal-rendered components (ChallengeShareButton uses it)
- [ ] Verify Lora, Inter, Caveat fonts are loaded in the app (they are — Google Fonts in index.html)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Toast-tier streak sharing (7/14/30) | Skip | Only 60/90/180/365 trigger full-screen overlay. Toast format doesn't support share cleanly. Spec says "skip tier 1 badge sharing if toast format doesn't support it" — same logic. |
| Toast-tier badge sharing | Skip | Spec: "add a small share icon if the toast format supports it cleanly. If it doesn't, skip tier 1 badge sharing." Toast UI is transient and small — share icon doesn't fit cleanly. |
| Level 1 (Seedling) share card | Skip | Spec: "Level 1 is the starting level and does not produce a level-up event, so no share card needed." |
| Share canvas verses vs overlay verses for level-ups | Use spec's share-specific verses | Spec defines different verses for share cards than what `LEVEL_UP_VERSES` has for the overlay. The overlay shows its own verses; the canvas shows the spec's. |
| Streak share messages overlap with STREAK_MILESTONE_MESSAGES | Use spec's messages for canvas | Spec defines messages for all 7 milestones. Existing constant only has 4. Create new share-specific constants. |
| Monthly card story size (1080×1920) | Include as bonus | Spec says "Story size as a bonus if the vertical stat list fits naturally." The stat list is vertically oriented — it fits. |
| Share flow after canvas generation | Web Share API → clipboard copy → download fallback | Follow ChallengeShareButton pattern. Spec: "copy, download, native share." |
| MonthlyShareButton props | Pass `MonthlyReportData` from parent | MonthlyReport.tsx already has the data; pass it down rather than having the button re-derive it. |
| Celebration overlay stays open after sharing | Keep current dismiss flow | Spec: "The celebration overlay remains visible after sharing; user must explicitly close it." Share action does not call `onDismiss`. |
| Canvas generation error handling | Show toast, don't crash | Spec: "Canvas generation error is caught and shows toast (not crash)." |

---

## Implementation Steps

### Step 1: Shared Canvas Utilities — `celebration-share-canvas.ts`

**Objective:** Create the shared canvas rendering module with 4 card-type renderers and shared utility functions (dark gradient background, watermark, divider, accent glow).

**Files to create/modify:**
- `frontend/src/lib/celebration-share-canvas.ts` — NEW — all 4 canvas renderers + shared helpers
- `frontend/src/constants/dashboard/share-card-content.ts` — NEW — share-specific milestone messages and level-up verses

**Details:**

**Constants file** (`share-card-content.ts`):

```typescript
// Streak milestone messages for share cards (all 7 milestones)
export const STREAK_SHARE_MESSAGES: Record<number, string> = {
  7: 'One week of faithfulness. Every day matters.',
  14: 'Two weeks of showing up. A rhythm is forming.',
  30: "One month of showing up. That's not discipline — that's devotion.",
  60: 'Two months of walking with God. Your roots are deep.',
  90: "Three months. You've built something rare and beautiful.",
  180: 'Half a year of faithfulness. Look how far you\'ve come.',
  365: 'One full year. Every single day. This is extraordinary.',
}

// Level-up share card verses (WEB translation) — distinct from LEVEL_UP_VERSES used in overlay
export const LEVEL_SHARE_CONTENT: Record<number, { name: string; icon: string; verse: string; reference: string }> = {
  2: { name: 'Sprout', icon: '🌱', verse: 'He will be like a tree planted by the streams of water.', reference: 'Psalm 1:3' },
  3: { name: 'Blooming', icon: '🌸', verse: 'The desert will rejoice and blossom like a rose.', reference: 'Isaiah 35:1' },
  4: { name: 'Flourishing', icon: '🌿', verse: 'The righteous shall flourish like the palm tree.', reference: 'Psalm 92:12' },
  5: { name: 'Oak', icon: '🌳', verse: 'They will be called oaks of righteousness, the planting of the Lord.', reference: 'Isaiah 61:3' },
  6: { name: 'Lighthouse', icon: '🏠', verse: "You are the light of the world. A city set on a hill can't be hidden.", reference: 'Matthew 5:14' },
}

// Mood labels for monthly card
export const MOOD_SHARE_LABELS: Record<number, string> = {
  1: 'Struggling', 2: 'Heavy', 3: 'Okay', 4: 'Good', 5: 'Thriving',
}
```

**Canvas module** (`celebration-share-canvas.ts`):

Import `wrapText` from `verse-card-canvas.ts`. Export 4 async functions, each returning `Promise<Blob>`:

1. `generateBadgeShareImage(badge: { name: string; description: string; icon: string }): Promise<Blob>`
   - 1080×1080 canvas
   - Dark gradient: `#0D0620` → `#1E0B3E` linear vertical
   - Purple radial glow: `#6D28D9` at 15% opacity, centered at (540, 400), radius 500
   - Icon text at y~320, 80px font
   - "Badge Unlocked!" heading: Caveat bold 56px, white, y~420
   - Badge name in quotes: Inter 32px, white, y~490
   - Badge description: Inter 22px, `rgba(255,255,255,0.7)`, y~545
   - Divider line: `rgba(255,255,255,0.2)`, 200px wide, centered, y~600
   - Watermark: Caveat 28px, `rgba(255,255,255,0.4)`, centered, y=1020

2. `generateStreakShareImage(days: number, message: string): Promise<Blob>`
   - 1080×1080 canvas
   - Dark gradient: `#0D0620` → `#1E0B3E`
   - Amber radial glow: `#D97706` at 15% opacity
   - 🔥 emoji at y~300, 80px
   - Streak heading (e.g., "30-Day Streak!"): Caveat bold 56px, white, y~400
   - Message: Lora italic 28px, `rgba(255,255,255,0.85)`, word-wrapped, centered, y~480
   - Divider line: `rgba(255,255,255,0.2)`, 200px wide, y~620
   - Watermark

3. `generateLevelUpShareImage(level: number): Promise<Blob>`
   - Look up `LEVEL_SHARE_CONTENT[level]`. Return rejection if not found.
   - 1080×1080 canvas
   - Dark gradient: `#0D0620` → `#1E0B3E`
   - Green radial glow: `#34D399` at 15% opacity
   - Level icon emoji at y~280, 80px
   - "Level Up!" heading: Caveat bold 56px, white, y~380
   - Level name + number (e.g., "Flourishing — Level 4"): Inter 28px, white, y~440
   - Verse: Lora italic 24px, `rgba(255,255,255,0.85)`, word-wrapped, max-width 800, y~520
   - Reference: Inter 18px, `rgba(255,255,255,0.5)`, below verse
   - Divider: y~700
   - Watermark

4. `generateMonthlyShareImage(data: MonthlyShareData): Promise<Blob>`
   - Interface: `{ monthName: string; year: number; moodAvg: number; moodLabel: string; prayCount: number; journalCount: number; meditateCount: number; bibleChapterCount: number; bestStreak: number }`
   - 1080×1080 canvas
   - Dark gradient + purple radial glow
   - "My {Month} {Year}" heading: Caveat bold 56px, white, y~300
   - Stats list (left-aligned within centered 600px block), Inter 26px, white, y starting ~420, 50px line spacing. Each line: emoji prefix + label + value. Only include non-zero stats.
   - Emoji map: 😊 Mood, 🙏 Prayers, 📖 Journal, 🧘 Meditation, 📚 Bible, 🔥 Best Streak
   - Divider: below last stat + 60px
   - Watermark

All 4 renderers share these helpers (private to module):
- `drawDarkGradient(ctx, w, h)` — linear gradient #0D0620 → #1E0B3E
- `drawAccentGlow(ctx, w, h, color)` — radial gradient with color at 15% opacity
- `drawDivider(ctx, w, y)` — centered 200px line, `rgba(255,255,255,0.2)`
- `drawWatermark(ctx, w)` — "Worship Room" at Caveat 28px, white 40%, y=1020
- `loadShareFonts()` — `Promise.all([document.fonts.load('italic 28px Lora'), document.fonts.load('bold 56px Caveat'), document.fonts.load('28px Inter')])`

**Auth gating:** N/A — canvas utility, no UI.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import or couple to any React components — this is a pure canvas utility
- DO NOT create new canvas size variants beyond 1080×1080 (monthly story size deferred)
- DO NOT duplicate `wrapText` — import from `verse-card-canvas.ts`
- DO NOT use emoji rendering via canvas `fillText` for the icon — use emoji Unicode characters directly (Canvas renders emoji via system font)
- DO NOT hardcode month names — accept them as parameters

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `generateBadgeShareImage returns a Blob` | unit | Call with mock badge data, verify returns Blob |
| `generateBadgeShareImage canvas is 1080x1080` | unit | Mock canvas, verify width/height set correctly |
| `generateStreakShareImage returns a Blob for each milestone` | unit | Call with days=7,14,30,60,90,180,365 |
| `generateLevelUpShareImage returns Blob for levels 2-6` | unit | Call with each level, verify no rejection |
| `generateLevelUpShareImage rejects for level 1` | unit | Verify rejection for level 1 (Seedling) |
| `generateMonthlyShareImage omits zero-value stats` | unit | Mock canvas context, verify fillText calls don't include zero-value lines |
| `generateMonthlyShareImage includes non-zero stats` | unit | Verify fillText called with mood, prayer count, etc. |
| `drawWatermark renders "Worship Room"` | unit | Verify fillText called with 'Worship Room' |
| `STREAK_SHARE_MESSAGES has entries for all 7 milestones` | unit | Check keys 7,14,30,60,90,180,365 |
| `LEVEL_SHARE_CONTENT has entries for levels 2-6` | unit | Check keys 2,3,4,5,6 |
| `All level share verses use WEB translation` | unit | Verify verse text matches spec exactly |

**Expected state after completion:**
- [ ] `celebration-share-canvas.ts` created with 4 exported generator functions
- [ ] `share-card-content.ts` created with share-specific constants
- [ ] All 11 tests passing
- [ ] `wrapText` imported from verse-card-canvas (not duplicated)

---

### Step 2: ShareImageButton Component

**Objective:** Create a reusable share button component that takes a canvas-generation function, handles the share flow (Web Share API → clipboard → download fallback), and shows loading + error states.

**Files to create/modify:**
- `frontend/src/components/sharing/ShareImageButton.tsx` — NEW

**Details:**

Props interface:
```typescript
interface ShareImageButtonProps {
  generateImage: () => Promise<Blob>
  filename: string
  shareTitle?: string
  shareText?: string
  className?: string
  variant?: 'primary' | 'ghost' // primary = bg-primary, ghost = bg-white/10
  label?: string // default: "Share"
}
```

Implementation pattern — follow `ChallengeShareButton.tsx`:
1. `isGenerating` state for loading
2. On click: `setIsGenerating(true)`, call `generateImage()`, try `navigator.share()` with file, fall back to `navigator.clipboard.write()` with `ClipboardItem`, fall back to download link creation
3. Error handling: catch all, show toast via `useToastSafe()` ("We couldn't share that. Try again."), never crash
4. User-cancelled share (`AbortError`) is silently ignored (not treated as error)

Button rendering:
- Lucide `Share2` icon + label text
- `min-h-[44px]` touch target
- Loading state: "Sharing..." text, `disabled` attribute
- `variant='primary'`: `bg-primary text-white font-semibold rounded-lg hover:opacity-90`
- `variant='ghost'`: `bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-full`

The `ghost` variant is for the celebration overlay. The `primary` variant is for the monthly report.

**Auth gating:** N/A — reusable component, auth responsibility is on the parent.

**Responsive behavior:** N/A: no UI impact (button styling is handled by parent layout).

**Guardrails (DO NOT):**
- DO NOT import any specific canvas generator — accept `generateImage` as a prop
- DO NOT include template/size selection (that's SharePanel territory)
- DO NOT call `onDismiss` or manipulate parent state
- DO NOT use `useToast()` — use `useToastSafe()` since this may render inside portals

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders with Share label and icon` | unit | Verify Share2 icon and "Share" text rendered |
| `calls generateImage on click` | unit | Mock generator, click, verify called |
| `shows loading state while generating` | unit | Verify "Sharing..." text and disabled state |
| `uses Web Share API when available` | unit | Mock navigator.share, verify called with File |
| `falls back to clipboard when Web Share unavailable` | unit | Mock clipboard.write, verify called |
| `falls back to download when clipboard unavailable` | unit | Verify anchor element created |
| `shows error toast on failure` | unit | Mock generator that throws, verify toast |
| `ignores AbortError (user cancelled)` | unit | Mock navigator.share that rejects with AbortError, verify no toast |
| `accepts custom className and label` | unit | Render with custom props, verify applied |
| `ghost variant has correct classes` | unit | Render with variant="ghost", check classes |

**Expected state after completion:**
- [ ] `ShareImageButton.tsx` created with complete share flow
- [ ] 10 tests passing
- [ ] Component works in both normal React tree and portal contexts

---

### Step 3: CelebrationOverlay Share Button Integration

**Objective:** Add a "Share" button to `CelebrationOverlay` that generates the appropriate canvas card (badge, streak, or level-up) based on the badge type, using `ShareImageButton`.

**Files to create/modify:**
- `frontend/src/components/dashboard/CelebrationOverlay.tsx` — MODIFY — add share button
- `frontend/src/components/dashboard/__tests__/CelebrationOverlay.test.tsx` — MODIFY — add share tests

**Details:**

Modify `CelebrationOverlay.tsx`:

1. Import `ShareImageButton` from `@/components/sharing/ShareImageButton`
2. Import `generateBadgeShareImage`, `generateStreakShareImage`, `generateLevelUpShareImage` from `@/lib/celebration-share-canvas`
3. Import `STREAK_SHARE_MESSAGES`, `LEVEL_SHARE_CONTENT` from `@/constants/dashboard/share-card-content`
4. Import `getBadgeIcon` (already imported)

Add a `useMemo` or `useCallback` to build the `generateImage` function based on badge type:

```typescript
const shareConfig = useMemo(() => {
  // Level badge: level_2 -> 2
  const levelMatch = badge.id.match(/^level_(\d+)$/)
  if (levelMatch) {
    const levelNum = parseInt(levelMatch[1], 10)
    if (levelNum >= 2 && LEVEL_SHARE_CONTENT[levelNum]) {
      return {
        generate: () => generateLevelUpShareImage(levelNum),
        filename: `worship-room-level-${levelNum}.png`,
      }
    }
    return null
  }

  // Streak badge: streak_60 -> 60
  const streakMatch = badge.id.match(/^streak_(\d+)$/)
  if (streakMatch) {
    const days = parseInt(streakMatch[1], 10)
    const message = STREAK_SHARE_MESSAGES[days]
    if (message) {
      return {
        generate: () => generateStreakShareImage(days, message),
        filename: `worship-room-streak-${days}.png`,
      }
    }
    return null
  }

  // Other badges (activity, community, etc.)
  const iconConfig = getBadgeIcon(badge.id)
  // Use emoji from badge definition or a generic star
  return {
    generate: () => generateBadgeShareImage({
      name: badge.name,
      description: badge.description,
      icon: '⭐', // We'll use a generic icon; badge icons are Lucide components, not emoji
    }),
    filename: `worship-room-badge-${badge.id}.png`,
  }
}, [badge])
```

Wait — the spec says "Large centered badge icon (emoji from badge definition)" but badge definitions use Lucide icons (React components), not emoji. The spec's intent is a recognizable icon. For canvas rendering, we need a text-based icon. Decision: Map badge categories to representative emoji for the canvas card:
- streak → 🔥
- level → use `LEVEL_SHARE_CONTENT[n].icon`
- activity → ⭐
- community → 🤝
- special → ✨
- challenge → 🎯
- other → ⭐

Add a small mapping:
```typescript
const BADGE_CATEGORY_EMOJI: Record<string, string> = {
  streak: '🔥', level: '🌱', activity: '⭐', community: '🤝',
  special: '✨', challenge: '🎯', meditation: '🧘', 'prayer-wall': '🙏',
  bible: '📖', gratitude: '💛', 'local-support': '📍', listening: '🎵',
}
```

Place the `ShareImageButton` in the button area, **before** the Continue button, **visible immediately** (not gated by the 6s delay). The Continue button still appears after 6s.

Layout:
- Both buttons centered below the celebration content
- Share button: `variant="ghost"` (frosted glass look: `bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-full`)
- Continue button: keeps its existing style (`border border-white/30 rounded-lg`)
- Mobile: stack vertically (share above continue), both full-width
- Desktop: side-by-side, centered with `gap-3`

```tsx
{/* Share + Continue buttons */}
<div className={`mt-8 flex items-center justify-center gap-3 ${isMobile ? 'flex-col w-full' : ''}`}>
  {shareConfig && (
    <ShareImageButton
      generateImage={shareConfig.generate}
      filename={shareConfig.filename}
      variant="ghost"
      className={isMobile ? 'w-full' : ''}
    />
  )}
  {showContinue && (
    <button ref={continueRef} onClick={onDismiss} ...>
      Continue
    </button>
  )}
</div>
```

Key behaviors:
- Share button visible immediately (no delay)
- Continue button still delayed 6s
- Clicking Share does NOT dismiss the overlay
- After sharing, overlay remains — user must click Continue to dismiss

**Auth gating:** Inherently gated — CelebrationOverlay only renders for authenticated users via CelebrationQueue in Dashboard.

**Responsive behavior:**
- Desktop (1440px): Share + Continue side-by-side, centered with gap-3
- Tablet (768px): Same as desktop
- Mobile (375px): Share + Continue stack vertically, full-width, 44px min-height each

**Guardrails (DO NOT):**
- DO NOT change the Continue button delay (6s) or any existing celebration timing
- DO NOT call `onDismiss` from the share flow
- DO NOT change the confetti animation, sound effects, or auto-dismiss behavior
- DO NOT modify the `useCelebrationQueue` hook — all changes are in CelebrationOverlay
- DO NOT render ShareImageButton for `level_1` (Seedling) — shareConfig returns null

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Share button renders on level-up celebration (level 2-6)` | integration | Render with level_2 badge, verify Share button visible |
| `Share button renders on full-screen streak celebration` | integration | Render with streak_60 badge, verify Share button visible |
| `Share button renders on activity badge celebration` | integration | Render with first_prayer badge, verify Share button visible |
| `Share button does NOT render for level_1 (Seedling)` | integration | Render with level_1, verify no Share button |
| `Share button visible immediately (before Continue)` | integration | Render, verify Share visible at t=0, Continue not yet visible |
| `Continue button still appears after 6s alongside Share` | integration | Advance timers 6s, verify both buttons visible |
| `Clicking Share does not dismiss overlay` | integration | Click Share, verify onDismiss not called |
| `Existing celebration tests still pass` | regression | Run all existing CelebrationOverlay tests unchanged |

**Expected state after completion:**
- [ ] CelebrationOverlay renders Share button for all overlay-tier celebrations
- [ ] Share button works alongside Continue button
- [ ] No existing celebration behavior changed
- [ ] 8 new tests + all existing tests pass

---

### Step 4: MonthlyShareButton Real Implementation

**Objective:** Replace the stub MonthlyShareButton with a real implementation that generates a monthly insights canvas card using the data from MonthlyReport.

**Files to create/modify:**
- `frontend/src/components/insights/MonthlyShareButton.tsx` — MODIFY (replace stub)
- `frontend/src/pages/MonthlyReport.tsx` — MODIFY (pass data props to MonthlyShareButton)
- `frontend/src/components/insights/__tests__/MonthlyShareButton.test.tsx` — MODIFY (replace stub tests)

**Details:**

**MonthlyShareButton.tsx** — Replace the stub:

New props:
```typescript
interface MonthlyShareButtonProps {
  monthName: string
  year: number
  moodEntries: MoodEntry[]
  activityCounts: Record<string, number>
  longestStreak: number
}
```

Implementation:
1. Compute `moodAvg` from `moodEntries` (average mood value, or 0 if empty)
2. Compute `moodLabel` from avg (round to nearest integer, map via `MOOD_SHARE_LABELS`)
3. Build `MonthlyShareData` object for canvas generator
4. Use `ShareImageButton` with `variant="primary"`, `label="Share This Month"`
5. `filename`: `worship-room-${monthName.toLowerCase()}-${year}.png`

Also compute `bibleChapterCount` from `activityCounts` — check if `activityCounts` has a `bibleChaptersRead` or similar field. Looking at `useMonthlyReportData.ts` line 115-132, it tracks: `mood`, `pray`, `journal`, `meditate`, `listen`, `prayerWall`. No bible chapters count in the monthly data. The `wr_bible_progress` localStorage key tracks chapters read per book but isn't aggregated monthly. Decision: **Omit Bible chapter count from monthly card** — the data isn't readily available. Include only the 5 activity types tracked in `activityCounts` + mood average + best streak.

Monthly card stat lines (only include if > 0):
- 😊 Mood: Mostly {label} (avg {avg})
- 🙏 Prayers: {count}
- 📖 Journal entries: {count}
- 🧘 Meditation sessions: {count}
- 🎵 Listening sessions: {count}
- 🤝 Prayer Wall: {count}
- 🔥 Best streak: {days} days

**MonthlyReport.tsx** — Pass data to MonthlyShareButton:

Change line 191:
```tsx
<MonthlyShareButton
  monthName={data.monthName}
  year={data.year}
  moodEntries={data.moodEntries}
  activityCounts={data.activityCounts}
  longestStreak={data.longestStreak}
/>
```

**Auth gating:** Page-level auth gate already exists in MonthlyReport.tsx (line 60-62: `if (!isAuthenticated) return <Navigate to="/" replace />`).

**Responsive behavior:**
- Desktop (1440px): Auto-width button, centered in text-center container (existing layout)
- Tablet (768px): Same
- Mobile (375px): Full-width button via existing `w-full sm:w-auto` classes

**Guardrails (DO NOT):**
- DO NOT change any other part of MonthlyReport.tsx beyond passing props to MonthlyShareButton
- DO NOT add new localStorage reads — use the data already computed by useMonthlyReportData
- DO NOT change the "Preview Email" button below MonthlyShareButton
- DO NOT change the button text from "Share This Month" (spec uses "Share This Month")
- DO NOT include stats with zero values in the canvas card

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders "Share This Month" button` | unit | Verify button text |
| `has correct aria-label` | unit | Verify accessible label |
| `passes correct data to generateMonthlyShareImage` | unit | Mock canvas generator, verify called with correct data |
| `omits zero-value stats` | unit | Pass data with meditateCount=0, verify omitted |
| `shows at least mood when all activities are zero` | unit | Pass data with mood entries but no activities, verify mood line present |
| `button is disabled while generating` | unit | Click, verify disabled state |
| `shows error toast on canvas failure` | unit | Mock generator that throws, verify toast |

**Expected state after completion:**
- [ ] MonthlyShareButton generates real canvas images
- [ ] MonthlyReport passes data props correctly
- [ ] Zero-value stats are omitted from canvas
- [ ] 7 tests passing (replacing 3 stub tests)
- [ ] Build passes, no TypeScript errors

---

### Step 5: End-to-End Verification & Regression Tests

**Objective:** Run the full test suite, verify no regressions in existing celebration/share behavior, and add integration-level tests that verify the full flow.

**Files to create/modify:**
- `frontend/src/lib/__tests__/celebration-share-canvas.test.ts` — already created in Step 1
- `frontend/src/components/sharing/__tests__/ShareImageButton.test.tsx` — already created in Step 2
- `frontend/src/components/dashboard/__tests__/CelebrationOverlay.test.tsx` — already modified in Step 3
- `frontend/src/components/insights/__tests__/MonthlyShareButton.test.tsx` — already modified in Step 4

**Details:**

Run `pnpm test` to verify:
1. All new tests pass (Steps 1-4)
2. All existing tests pass — especially:
   - `CelebrationOverlay.test.tsx` (timing, animation, sound, auto-dismiss)
   - `CelebrationQueue.test.tsx` (queue processing, tier priority)
   - `CelebrationAccessibility.test.tsx` (focus trap, aria)
   - `MonthlyReport.test.tsx` (auth gate, navigation, rendering)
   - `verse-card-canvas.test.ts` (existing canvas tests)
   - `ChallengeShareButton.test.tsx` (existing share tests)

Run `pnpm build` to verify:
1. No TypeScript errors
2. No build warnings from new files

Run `pnpm lint` to verify no new lint errors.

**Auth gating:** N/A — verification step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any test that was passing before this feature
- DO NOT skip or disable any existing test

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Full test suite passes` | regression | `pnpm test` exits 0 |
| `Build succeeds` | regression | `pnpm build` exits 0 |

**Expected state after completion:**
- [ ] All tests pass (existing + new)
- [ ] Build passes with no errors
- [ ] Lint passes with no new errors
- [ ] Feature is complete and ready for code review

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Canvas rendering utilities + share content constants |
| 2 | — | ShareImageButton reusable component |
| 3 | 1, 2 | CelebrationOverlay share button integration |
| 4 | 1, 2 | MonthlyShareButton real implementation |
| 5 | 1, 2, 3, 4 | Full verification and regression testing |

Steps 1 and 2 can be implemented in parallel. Steps 3 and 4 can be implemented in parallel (both depend on 1+2).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Canvas utilities + constants | [COMPLETE] | 2026-04-01 | Created `lib/celebration-share-canvas.ts` (4 generators + shared helpers), `constants/dashboard/share-card-content.ts` (STREAK_SHARE_MESSAGES, LEVEL_SHARE_CONTENT, MOOD_SHARE_LABELS, BADGE_CATEGORY_EMOJI). 11 tests passing. |
| 2 | ShareImageButton component | [COMPLETE] | 2026-04-01 | Created `components/sharing/ShareImageButton.tsx`. Uses `useToastSafe`, Web Share → clipboard → download fallback. Changed clipboard check to `'ClipboardItem' in window` for testability. 10 tests passing. Clipboard-specific test replaced with clipboard-failure-fallback test due to jsdom limitations. Added primary variant test. |
| 3 | CelebrationOverlay integration | [COMPLETE] | 2026-04-01 | Modified `CelebrationOverlay.tsx`: added ShareImageButton with shareConfig useMemo (level/streak/badge detection), BADGE_CATEGORY_EMOJI for canvas icons. Share button visible immediately, Continue still delayed 6s. Fixed confetti test selector (span[aria-hidden] to exclude SVG icons). 19 tests passing (11 existing + 8 new). |
| 4 | MonthlyShareButton implementation | [COMPLETE] | 2026-04-01 | Replaced stub `MonthlyShareButton.tsx` with real implementation using ShareImageButton + generateMonthlyShareImage. Updated `MonthlyReport.tsx` to pass data props. Updated MonthlyReport.test.tsx to match new button text ("Share This Month") and remove stub toast assertion. Bible chapter count omitted per plan (data not available). 7 new tests + 20 existing MonthlyReport tests passing. |
| 5 | Verification & regression | [COMPLETE] | 2026-04-01 | Full suite: 460 test files, 5235 tests, 0 failures. Lint: 0 new errors on all new/modified files. Build: pre-existing workbox-window issue only (no new errors). |
