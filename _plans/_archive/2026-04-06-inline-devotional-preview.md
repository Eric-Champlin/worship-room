# Implementation Plan: Inline Collapsible Devotional Preview

**Spec:** `_specs/inline-devotional-preview.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/inline-devotional-preview`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This feature adds a collapsible devotional preview panel to the Pray and Journal tabs when the user arrives via devotional cross-feature CTAs. It requires a new component, a type extension, snapshot capture in DevotionalTabContent, and integration in PrayTabContent and JournalInput.

**Key files involved:**

1. **`frontend/src/types/daily-experience.ts`** (112 lines) — Contains `PrayContext` type (lines 107-112). Extend with optional `devotionalSnapshot` field.
2. **`frontend/src/types/devotional.ts`** (40 lines) — Contains `Devotional`, `DevotionalVerse`, `DevotionalPassage`, `DevotionalQuote` types. The new `DevotionalSnapshot` type reuses these sub-types.
3. **`frontend/src/components/daily/DevotionalTabContent.tsx`** (343 lines) — Has CTA callbacks `onSwitchToJournal` and `onSwitchToPray` at lines 278 and 297. These need to capture and pass a snapshot of the current devotional.
4. **`frontend/src/pages/DailyHub.tsx`** (355 lines) — Manages `prayContext` state (line 61) and passes it to PrayTabContent (line 301) and JournalTabContent (line 313). Handlers `handleSwitchToDevotionalJournal` (line 125) and `handleSwitchToDevotionalPray` (line 132) need to accept the snapshot.
5. **`frontend/src/components/daily/PrayTabContent.tsx`** (248 lines) — Renders devotional context banner at lines 204-229 inside a `max-w-2xl` container. The new DevotionalPreviewPanel renders nearby, gated on `prayContext.devotionalSnapshot`.
6. **`frontend/src/components/daily/JournalInput.tsx`** (376+ lines) — Renders devotional context banners at lines 212-237 (guided mode) and 265-288 (free-write mode). The DevotionalPreviewPanel renders above these banners, gated on `prayContext.devotionalSnapshot`.

**Component hierarchy:**
- `DailyHub` → `DevotionalTabContent` (devotional tab, captures snapshot on CTA click)
- `DailyHub` → `PrayTabContent` (receives `prayContext` with snapshot)
- `DailyHub` → `JournalTabContent` → `JournalInput` (receives `prayContext` with snapshot)

**Existing context passing pattern:**
- DevotionalTabContent's `onSwitchToJournal` / `onSwitchToPray` callbacks take `(topic: string, customPrompt: string)` (line 32-33)
- DailyHub handlers create `PrayContext = { from: 'devotional', topic, customPrompt }` and store in state
- PrayTabContent renders context banner when `prayContext?.from === 'devotional'` && `!contextDismissed`
- JournalInput renders context banners in both guided and free-write modes with `contextDismissed` prop

**Test patterns:**
- Both test files wrap components in `MemoryRouter` → `AuthProvider` → `ToastProvider` → `AuthModalProvider`
- PrayTabContent tests use `vi.useFakeTimers()` and mock audio providers
- JournalTabContent tests mock `useUnsavedChanges` and audio providers
- Devotional context tests use `prayContext: { from: 'devotional', topic: 'Trust', customPrompt: '...' }`

**Sticky tab bar z-index:** `z-40` (DailyHub.tsx line 216). The DevotionalPreviewPanel uses `z-30` per spec, sitting below the tab bar.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View collapsed pill | Appears when navigating from devotional CTA | N/A — inherited from existing flow | Panel only renders when `prayContext.devotionalSnapshot` is present |
| Expand/collapse panel | Toggle panel open/closed | N/A — no auth needed | No auth check — read-only display |
| Scroll within expanded panel | Internal scroll | N/A — no auth needed | No auth check |

No new auth gates needed. The panel is purely a read-only display of content already visible on the Devotional tab.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Pill (collapsed) | background | `bg-white/[0.06]` | FrostedCard pattern, spec |
| Pill (collapsed) | backdrop | `backdrop-blur-md` | spec |
| Pill (collapsed) | border | `border border-white/[0.12]` | FrostedCard pattern |
| Pill (collapsed) | border-radius | `rounded-2xl` | FrostedCard pattern |
| Pill (collapsed) | shadow | `shadow-[0_4px_20px_rgba(0,0,0,0.3)]` | spec |
| Pill hover | background | `hover:bg-white/[0.09]` | FrostedCard hover pattern |
| Pill label | style | `text-xs font-semibold uppercase tracking-widest text-white/60` | spec |
| Pill title | style | `text-sm font-medium text-white truncate` | spec |
| Pill chevron | style | `text-white/60`, rotates 180deg on expand | spec |
| Pill focus ring | style | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | spec |
| BookOpen icon | color | `text-primary` | spec |
| Expanded separator | style | `border-t border-white/[0.08]` | spec |
| Expanded max-height | value | `max-h-[50vh]` with `overflow-y-auto` | spec |
| Expand animation | duration | `300ms ease-out` via max-height transition | spec |
| Passage label | style | `text-xs uppercase tracking-widest text-white/60` | spec |
| Passage text | style | `font-serif` (Lora) | spec, matches DevotionalTabContent line 211 |
| Verse numbers | style | `align-super font-sans text-xs font-medium text-white/50` | DevotionalTabContent line 214 |
| Reflection callout | style | `rounded-xl border-l-2 border-l-primary bg-white/[0.04]` | spec |
| Reflection body | style | `text-[15px] leading-[1.75] text-white/90` | spec |
| Quote | style | `font-serif italic text-white/90` | spec |
| Sticky positioning | value | `sticky top-2 z-30` | spec |
| Bottom margin | value | `mb-4` | spec |
| Primary color | hex | `#6D28D9` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `font-serif` (Lora) for scripture/devotional text, `font-sans` (Inter) for UI
- FrostedCard base: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`
- Verse number superscripts: `align-super font-sans text-xs font-medium text-white/50` (from DevotionalTabContent line 214)
- All readable text defaults to `text-white` on dark backgrounds; muted opacities only for decorative/secondary elements
- `cn()` utility from `@/lib/utils` for conditional classes
- Icons from `lucide-react` (BookOpen, ChevronDown)
- `GRADIENT_TEXT_STYLE` NOT used here (this is a utility panel, not a section heading)
- Sticky tab bar is `z-40`; this panel is `z-30` — must not overlap
- GlowBackground uses `glowOpacity={0.30}` on all live call sites (never the component defaults)
- Focus rings: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`

---

## Shared Data Models

**New type (`DevotionalSnapshot`):**

```typescript
export interface DevotionalSnapshot {
  date: string
  title: string
  passage: {
    reference: string
    verses: { number: number; text: string }[]
  }
  reflection: string[]
  reflectionQuestion: string
  quote: {
    text: string
    attribution: string
  }
}
```

**Extended type (`PrayContext`):**

```typescript
export interface PrayContext {
  from: 'pray' | 'devotional'
  topic: string
  customPrompt?: string
  devotionalSnapshot?: DevotionalSnapshot  // NEW
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | No new localStorage keys. Panel state is ephemeral React state. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Full-width pill, collapsed `px-4 py-3`, expanded `px-5 py-5`. Touch-friendly (entire pill is button, ≥44px). |
| Tablet | 768px | Same layout, slightly more generous padding |
| Desktop | 1440px | Panel constrained by parent `max-w-2xl`. Expanded `px-6 py-6`. |

No special stacking or hiding between breakpoints — identical behavior at all sizes with padding adjustments only.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Panel → context banner (Pray/Journal) | 16px (`mb-4`) | spec |
| Panel → textarea (if no context banner) | 16px (`mb-4`) | spec |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/inline-devotional-preview` exists and is checked out
- [ ] The devotional context banner with "View full devotional" link is already implemented (Spec W / `devotional-context-banner-link` plan) and committed
- [ ] All auth-gated actions from the spec are accounted for in the plan (none — read-only panel)
- [ ] Design system values verified from FrostedCard.tsx and DevotionalTabContent.tsx
- [ ] No [UNVERIFIED] values — all styling comes from spec + existing component inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to render panel in Pray tab | In PrayTabContent (above PrayerInput), co-located with existing context banner | Context banner already lives in PrayTabContent, not PrayerInput. Keeps dismiss logic unified. |
| Where to render panel in Journal tab | In JournalInput, above existing context banners | JournalInput already manages context display and has `contextDismissed` prop. |
| Snapshot type location | New `DevotionalSnapshot` in `types/daily-experience.ts` alongside `PrayContext` | Co-locates the snapshot with the context that carries it. Avoids circular imports with `types/devotional.ts`. |
| Height measurement for animation | CSS `max-height` transition with generous upper bound, NOT JavaScript measurement | Simpler, no layout thrashing. Trade-off: slight overshoot on transition timing for short content. Acceptable per spec. |
| Max-height value when expanded | `max-h-[50vh]` as CSS class | Matches spec "50% of viewport height". |
| Collapsed height | Natural height from content (~50px) | Let content determine pill height rather than fixing a pixel value. |
| Panel in free-write mode (Journal) | Panel appears regardless of journal mode (guided/free) | The panel provides reference material useful in both modes. Context banner already appears in both modes. |

---

## Implementation Steps

### Step 1: Extend PrayContext with DevotionalSnapshot

**Objective:** Add the `DevotionalSnapshot` type and extend `PrayContext` so the snapshot can flow through the existing context mechanism.

**Files to create/modify:**
- `frontend/src/types/daily-experience.ts` — Add `DevotionalSnapshot` interface and optional field on `PrayContext`

**Details:**

Add `DevotionalSnapshot` interface above `PrayContext`:

```typescript
export interface DevotionalSnapshot {
  date: string
  title: string
  passage: {
    reference: string
    verses: { number: number; text: string }[]
  }
  reflection: string[]
  reflectionQuestion: string
  quote: {
    text: string
    attribution: string
  }
}
```

Add `devotionalSnapshot?: DevotionalSnapshot` to `PrayContext`:

```typescript
export interface PrayContext {
  from: 'pray' | 'devotional'
  topic: string
  customPrompt?: string
  devotionalSnapshot?: DevotionalSnapshot
}
```

**Auth gating:** N/A — type definitions only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any other types in this file
- DO NOT import from `types/devotional.ts` (avoid circular deps — inline the passage/quote shapes)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Type-only change; TypeScript compiler validates |

**Expected state after completion:**
- [ ] `DevotionalSnapshot` interface exported from `types/daily-experience.ts`
- [ ] `PrayContext` has optional `devotionalSnapshot` field
- [ ] TypeScript compiles without errors
- [ ] All existing tests still pass (no runtime changes)

---

### Step 2: Create DevotionalPreviewPanel Component

**Objective:** Build the new collapsible preview panel component with collapsed pill, expanded content, sticky positioning, animation, and full accessibility.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalPreviewPanel.tsx` — New component

**Details:**

Props interface:

```typescript
import type { DevotionalSnapshot } from '@/types/daily-experience'

interface DevotionalPreviewPanelProps {
  snapshot: DevotionalSnapshot
}
```

Component structure:

```tsx
export function DevotionalPreviewPanel({ snapshot }: DevotionalPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentId = 'devotional-preview-content'

  return (
    <div className="sticky top-2 z-30 mb-4">
      <div className={cn(
        'bg-white/[0.06] backdrop-blur-md border border-white/[0.12] rounded-2xl',
        'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
        'transition-all duration-200',
      )}>
        {/* Collapsed Pill (always visible) */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className={cn(
            'flex w-full items-center gap-3 px-4 py-3 sm:px-5 lg:px-6',
            'text-left transition-colors',
            'hover:bg-white/[0.04]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
            'rounded-2xl',
          )}
        >
          <BookOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Today&apos;s Devotional
            </p>
            <p className="truncate text-sm font-medium text-white">
              {snapshot.title} &middot; {snapshot.passage.reference}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-white/60 transition-transform duration-300',
              isExpanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>

        {/* Expanded Content */}
        <div
          id={contentId}
          aria-hidden={!isExpanded}
          className={cn(
            'overflow-hidden transition-[max-height] duration-300 ease-out',
            isExpanded ? 'max-h-[50vh]' : 'max-h-0',
          )}
        >
          <div className="border-t border-white/[0.08] overflow-y-auto max-h-[50vh] px-5 py-5 sm:px-6 sm:py-6 lg:px-6">
            {/* Passage */}
            <div className="mb-5">
              <p className="mb-2 text-xs uppercase tracking-widest text-white/60">
                {snapshot.passage.reference}
              </p>
              <p className="font-serif text-base leading-[1.75] text-white sm:text-lg">
                {snapshot.passage.verses.map((verse) => (
                  <span key={verse.number}>
                    <sup className="mr-1 align-super font-sans text-xs font-medium text-white/50">
                      {verse.number}
                    </sup>
                    {verse.text}{' '}
                  </span>
                ))}
              </p>
            </div>

            {/* Reflection Question Callout */}
            <div className="mb-5 rounded-xl border-l-2 border-l-primary bg-white/[0.04] px-4 py-3">
              <p className="mb-1 text-xs uppercase tracking-widest text-white/60">
                Something to think about
              </p>
              <p className="text-[15px] font-medium leading-[1.5] text-white">
                {snapshot.reflectionQuestion}
              </p>
            </div>

            {/* Reflection Body */}
            <div className="mb-5 space-y-3">
              {snapshot.reflection.map((paragraph, i) => (
                <p key={i} className="text-[15px] leading-[1.75] text-white/90">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="border-l-2 border-white/[0.12] pl-4">
              <p className="font-serif italic text-white/90">
                &ldquo;{snapshot.quote.text}&rdquo;
              </p>
              <p className="mt-1 text-sm text-white/60">
                &mdash; {snapshot.quote.attribution}
              </p>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Imports: `useState` from React, `BookOpen` and `ChevronDown` from `lucide-react`, `cn` from `@/lib/utils`, `DevotionalSnapshot` from `@/types/daily-experience`.

**Auth gating:** N/A — read-only display component.

**Responsive behavior:**
- Desktop (1440px): Constrained by parent `max-w-2xl`. Expanded padding `px-6 py-6`.
- Tablet (768px): Same layout, padding `px-5 py-5` (`sm:` prefix).
- Mobile (375px): Full-width pill within container. Padding `px-4 py-3` collapsed, `px-5 py-5` expanded. Entire pill is the touch target (≥44px via natural content height).

**Guardrails (DO NOT):**
- DO NOT use `GRADIENT_TEXT_STYLE` — this is a utility panel, not a section heading
- DO NOT add a close/dismiss button — the panel is dismissed via the context banner's "Write about something else" button (already exists)
- DO NOT use `FrostedCard` component (need custom structure for the collapsible pill + content pattern)
- DO NOT use JavaScript height measurement — rely on CSS `max-height` transition
- DO NOT add focus trapping — user must be able to Tab freely between panel and textarea
- DO NOT add any localStorage persistence for expand/collapse state

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Renders collapsed pill with title and reference | unit | Verify pill shows "TODAY'S DEVOTIONAL", title, reference, BookOpen icon, ChevronDown |
| Expand on click shows passage content | unit | Click pill, verify passage text and verse numbers visible |
| Collapse on second click | unit | Click twice, verify content hidden again |
| `aria-expanded` reflects state | unit | Check `aria-expanded="false"` initially, `"true"` after click |
| `aria-hidden` on content reflects state | unit | Check `aria-hidden="true"` initially, `"false"` after expand |
| `aria-controls` points to content | unit | Verify `aria-controls` matches content `id` |
| Chevron rotates on expand | unit | Check `rotate-180` class present when expanded |
| Reflection question renders in callout | unit | Expand, verify "Something to think about" label and question text |
| Quote renders with attribution | unit | Expand, verify quote text and attribution |
| Truncates long title | unit | Verify `truncate` class on title element |
| Keyboard accessible (Enter/Space) | unit | Simulate keyboard events, verify toggle |
| Sticky positioning classes | unit | Verify `sticky top-2 z-30` classes on outer wrapper |

**Expected state after completion:**
- [ ] `DevotionalPreviewPanel` component renders correctly in isolation
- [ ] Collapsed state shows pill with icon, label, title, reference, chevron
- [ ] Expanded state shows all devotional content sections
- [ ] CSS animation on expand/collapse via `max-height` transition
- [ ] Full accessibility: `aria-expanded`, `aria-controls`, `aria-hidden`, focus ring
- [ ] No layout shift — sticky positioning at `top-2 z-30`

---

### Step 3: Wire Snapshot Through DevotionalTabContent and DailyHub

**Objective:** Capture the devotional snapshot when the user clicks a cross-feature CTA and pass it through the existing context mechanism to PrayTabContent and JournalInput.

**Files to create/modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Capture snapshot in CTA handlers
- `frontend/src/pages/DailyHub.tsx` — Update handler signatures to accept snapshot

**Details:**

**DevotionalTabContent.tsx changes:**

1. Import `DevotionalSnapshot` from `@/types/daily-experience`.

2. Update `DevotionalTabContentProps` callback signatures:

```typescript
interface DevotionalTabContentProps {
  onSwitchToJournal?: (topic: string, customPrompt: string, snapshot?: DevotionalSnapshot) => void
  onSwitchToPray?: (topic: string, customPrompt: string, snapshot?: DevotionalSnapshot) => void
  onComplete?: () => void
}
```

3. Add a helper function inside the component to build the snapshot from the current `devotional` and `dateStr`:

```typescript
const buildSnapshot = (): DevotionalSnapshot => ({
  date: dateStr,
  title: devotional.title,
  passage: devotional.passage,
  reflection: devotional.reflection,
  reflectionQuestion: devotional.reflectionQuestion.replace('Something to think about today: ', ''),
  quote: devotional.quote,
})
```

4. Update the Journal CTA `onClick` (line 278) to pass the snapshot as the third argument:

```typescript
onClick={() => {
  const reflectionQuestion = devotional.reflectionQuestion.replace(
    'Something to think about today: ',
    '',
  )
  onSwitchToJournal?.(devotional.theme, reflectionQuestion, buildSnapshot())
}}
```

5. Update the Pray CTA `onClick` (line 297) to pass the snapshot as the third argument:

```typescript
onClick={() => {
  const verseText = devotional.passage.verses.map((v) => v.text).join(' ')
  const customPrompt = `I'm reflecting on today's devotional about ${devotional.theme}. The passage is ${devotional.passage.reference}: "${verseText}". Help me pray about what I've read.`
  onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot())
}}
```

**DailyHub.tsx changes:**

1. Import `DevotionalSnapshot` from `@/types/daily-experience`.

2. Update `handleSwitchToDevotionalJournal` (line 125):

```typescript
const handleSwitchToDevotionalJournal = useCallback(
  (topic: string, customPrompt: string, snapshot?: DevotionalSnapshot) => {
    setPrayContext({ from: 'devotional', topic, customPrompt, devotionalSnapshot: snapshot })
    setSearchParams({ tab: 'journal' })
  },
  [setSearchParams],
)
```

3. Update `handleSwitchToDevotionalPray` (line 132):

```typescript
const handleSwitchToDevotionalPray = useCallback(
  (topic: string, customPrompt: string, snapshot?: DevotionalSnapshot) => {
    setPrayContext({ from: 'devotional', topic, customPrompt, devotionalSnapshot: snapshot })
    setSearchParams({ tab: 'pray' })
  },
  [setSearchParams],
)
```

**Auth gating:** N/A — no new auth-gated actions.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change any other DailyHub handler (`handleSwitchToJournal` for pray→journal stays unchanged)
- DO NOT change the `switchTab` function (it resets prayContext to null, which correctly clears the panel on manual tab switches)
- DO NOT modify the existing CTA button text or styling
- DO NOT change the `PrayContext` state initialization or reset behavior

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none — covered in Steps 6-7) | — | CTA wiring verified through integration tests in Steps 6-7 |

**Expected state after completion:**
- [ ] DevotionalTabContent passes `DevotionalSnapshot` to both CTA callbacks
- [ ] DailyHub stores snapshot in `prayContext.devotionalSnapshot`
- [ ] PrayTabContent and JournalInput receive `prayContext` with `devotionalSnapshot` field populated
- [ ] TypeScript compiles without errors
- [ ] All existing tests still pass (callbacks still accept 2 args — third is optional)

---

### Step 4: Integrate DevotionalPreviewPanel in PrayTabContent

**Objective:** Render the DevotionalPreviewPanel at the top of the Pray tab content when the user arrives from a devotional CTA with a snapshot.

**Files to create/modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Add panel rendering

**Details:**

1. Import `DevotionalPreviewPanel` from `@/components/daily/DevotionalPreviewPanel`.

2. Render the panel inside the `max-w-2xl` container (line 202), immediately above the existing devotional context banner (line 204). The panel is gated on the same conditions as the context banner plus the presence of `devotionalSnapshot`:

```tsx
<div className="mx-auto max-w-2xl px-4 pt-10 pb-4 sm:pt-14 sm:pb-6">
  {/* Devotional Preview Panel */}
  {prayContext?.from === 'devotional' && prayContext.devotionalSnapshot && !contextDismissed && !isLoading && !prayer && (
    <DevotionalPreviewPanel snapshot={prayContext.devotionalSnapshot} />
  )}

  {/* Devotional Context Banner (existing) */}
  {prayContext?.from === 'devotional' && prayContext.customPrompt && !contextDismissed && !isLoading && !prayer && (
    ...existing banner JSX...
  )}
```

The panel appears above the context banner. Both share the same visibility conditions (`contextDismissed`, `isLoading`, `prayer`). When the user clicks "Pray about something else" in the context banner, `contextDismissed` becomes `true` and both panel and banner disappear.

**Auth gating:** N/A — read-only panel within existing context flow.

**Responsive behavior:**
- Desktop (1440px): Panel constrained by `max-w-2xl` parent container.
- Tablet (768px): Same.
- Mobile (375px): Full-width within container padding.

**Guardrails (DO NOT):**
- DO NOT modify the existing context banner JSX
- DO NOT change the `contextDismissed` state management
- DO NOT pass additional props to `PrayerInput`
- DO NOT change the z-index stacking or sticky tab bar behavior

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (covered in Step 7) | — | Integration tests for panel visibility in PrayTabContent |

**Expected state after completion:**
- [ ] DevotionalPreviewPanel renders above context banner in Pray tab when snapshot present
- [ ] Panel disappears when context is dismissed
- [ ] Panel disappears during loading and prayer response display
- [ ] Existing Pray tab behavior unchanged when no snapshot present

---

### Step 5: Integrate DevotionalPreviewPanel in JournalInput

**Objective:** Render the DevotionalPreviewPanel at the top of JournalInput when the user arrives from a devotional CTA with a snapshot.

**Files to create/modify:**
- `frontend/src/components/daily/JournalInput.tsx` — Add panel rendering

**Details:**

1. Import `DevotionalPreviewPanel` from `@/components/daily/DevotionalPreviewPanel`.

2. Render the panel above the existing context banners (before line 196 `<div aria-live="polite">`), gated on `prayContext?.devotionalSnapshot` and `!contextDismissed`:

```tsx
{/* Devotional Preview Panel */}
{prayContext?.from === 'devotional' && prayContext.devotionalSnapshot && !contextDismissed && (
  <DevotionalPreviewPanel snapshot={prayContext.devotionalSnapshot} />
)}

{/* Context Banner (Guided mode) — existing */}
<div aria-live="polite">
  ...existing banners...
</div>
```

The panel appears above the context banner in both guided and free-write modes. When the user clicks "Write about something else" in the context banner, `onDismissContext()` fires, `contextDismissed` becomes `true`, and both panel and banner disappear.

**Auth gating:** N/A — read-only panel.

**Responsive behavior:**
- Same as PrayTabContent — constrained by parent `max-w-2xl`.

**Guardrails (DO NOT):**
- DO NOT modify the existing context banner JSX in JournalInput
- DO NOT change the `onDismissContext` callback behavior
- DO NOT add new props to JournalInput (it already receives `prayContext` and `contextDismissed`)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (covered in Step 7) | — | Integration tests for panel visibility in JournalInput |

**Expected state after completion:**
- [ ] DevotionalPreviewPanel renders above context banner in Journal tab when snapshot present
- [ ] Panel appears in both guided and free-write modes
- [ ] Panel disappears when context is dismissed
- [ ] Existing Journal tab behavior unchanged when no snapshot present

---

### Step 6: Tests for DevotionalPreviewPanel

**Objective:** Write comprehensive unit tests for the new DevotionalPreviewPanel component.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/DevotionalPreviewPanel.test.tsx` — New test file

**Details:**

Test file structure follows existing patterns. No provider wrapping needed (component has no context dependencies).

Test fixture:

```typescript
const mockSnapshot: DevotionalSnapshot = {
  date: '2026-04-06',
  title: 'Anchored in Trust',
  passage: {
    reference: 'Proverbs 3:5-6',
    verses: [
      { number: 5, text: "Trust in Yahweh with all your heart, and don't lean on your own understanding." },
      { number: 6, text: 'In all your ways acknowledge him, and he will make your paths straight.' },
    ],
  },
  reflection: [
    'There are seasons in life when the road ahead feels unclear.',
    'Trusting God does not mean you stop thinking or planning.',
  ],
  reflectionQuestion: 'Where in your life are you relying on your own understanding instead of trusting God?',
  quote: {
    text: 'God never made a promise that was too good to be true.',
    attribution: 'D.L. Moody',
  },
}
```

Tests:

1. **renders collapsed pill with icon, label, title, and reference** — Verify "TODAY'S DEVOTIONAL" label, "Anchored in Trust", "Proverbs 3:5-6" visible
2. **does not show expanded content by default** — Verify `aria-hidden="true"` on content
3. **expands on click to show passage** — Click pill, verify verse text visible
4. **expands to show reflection question in callout** — Click pill, verify "Something to think about" and question text
5. **expands to show reflection paragraphs** — Click pill, verify both reflection paragraphs
6. **expands to show quote with attribution** — Click pill, verify quote text and "D.L. Moody"
7. **collapses on second click** — Click twice, verify `aria-hidden="true"` again
8. **aria-expanded toggles correctly** — Verify `false` → `true` → `false`
9. **aria-controls matches content id** — Verify button `aria-controls` equals content `id`
10. **chevron rotates on expand** — Verify `rotate-180` class toggles
11. **has sticky positioning classes** — Verify `sticky`, `top-2`, `z-30` on outer div
12. **keyboard: Enter toggles panel** — Fire `Enter` key on button, verify expansion
13. **title truncates with long text** — Pass long title, verify `truncate` class present

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact (unit tests don't test responsive).

**Guardrails (DO NOT):**
- DO NOT test CSS animations (max-height transitions) — CSS animation testing is unreliable in jsdom
- DO NOT use fake timers for this component (no timeouts or intervals)
- DO NOT add snapshot tests

**Expected state after completion:**
- [ ] 13 tests passing for DevotionalPreviewPanel
- [ ] All tests cover collapsed/expanded states, accessibility attributes, and content rendering

---

### Step 7: Integration Tests for PrayTabContent and JournalTabContent

**Objective:** Add tests verifying the DevotionalPreviewPanel appears/disappears correctly in both Pray and Journal tabs.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — Add tests to existing devotional context describe block
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — Add tests to existing devotional context describe block

**Details:**

**PrayTabContent.test.tsx additions** (add to the `describe('PrayTabContent devotional context')` block starting at line 841):

Update the `prayContext` fixtures used in the existing devotional context tests to include `devotionalSnapshot`:

```typescript
const mockSnapshot: DevotionalSnapshot = {
  date: '2026-04-06',
  title: 'Anchored in Trust',
  passage: {
    reference: 'Proverbs 3:5-6',
    verses: [
      { number: 5, text: "Trust in Yahweh with all your heart." },
      { number: 6, text: 'In all your ways acknowledge him.' },
    ],
  },
  reflection: ['Trusting God does not mean you stop thinking.'],
  reflectionQuestion: 'Where are you relying on your own understanding?',
  quote: { text: 'God never made a promise that was too good to be true.', attribution: 'D.L. Moody' },
}
```

New tests:

1. **preview panel appears when devotionalSnapshot is present** — Render with `prayContext: { from: 'devotional', topic: 'Trust', customPrompt: '...', devotionalSnapshot: mockSnapshot }`. Verify "TODAY'S DEVOTIONAL" pill visible.
2. **preview panel not shown when no snapshot** — Render with `prayContext: { from: 'devotional', topic: 'Trust', customPrompt: '...' }` (no snapshot). Verify pill not present.
3. **preview panel disappears when context dismissed** — Click "Pray about something else", verify pill gone.
4. **preview panel hidden during loading** — Generate prayer (triggers loading), verify pill gone.
5. **preview panel coexists with "View full devotional" link** — Both pill and "View full devotional" link visible simultaneously.

**JournalTabContent.test.tsx additions** (add to the `describe('JournalTabContent devotional context')` block starting at line 541):

New tests:

1. **preview panel appears when devotionalSnapshot is present** — Render with `prayContext: { from: 'devotional', topic: 'Trust', customPrompt: '...', devotionalSnapshot: mockSnapshot }`. Verify "TODAY'S DEVOTIONAL" pill visible.
2. **preview panel not shown when no snapshot** — Render without snapshot. Verify pill not present.
3. **preview panel disappears when "Write about something else" clicked** — Click dismiss, verify pill gone.
4. **preview panel appears in both guided and free-write modes** — Switch to free-write, verify pill still visible.

**Auth gating:** N/A — panel has no auth gating.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing test assertions (add new tests, don't change passing ones)
- DO NOT change the existing provider wrapping pattern
- DO NOT add `devotionalSnapshot` to existing test fixtures that weren't using it (to verify backward compatibility)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| PrayTab: panel appears with snapshot | integration | Verify pill renders when snapshot present |
| PrayTab: panel absent without snapshot | integration | Verify pill absent when no snapshot |
| PrayTab: panel dismissed with context | integration | Verify pill gone after dismiss |
| PrayTab: panel hidden during loading | integration | Verify pill gone during prayer generation |
| PrayTab: coexists with link | integration | Both pill and "View full devotional" visible |
| Journal: panel appears with snapshot | integration | Verify pill renders when snapshot present |
| Journal: panel absent without snapshot | integration | Verify pill absent when no snapshot |
| Journal: panel dismissed | integration | Verify pill gone after dismiss |
| Journal: panel in both modes | integration | Pill visible in guided and free-write |

**Expected state after completion:**
- [ ] 5 new tests in PrayTabContent.test.tsx
- [ ] 4 new tests in JournalTabContent.test.tsx
- [ ] All existing tests still pass (backward compatibility — no snapshot = no panel)
- [ ] Full test suite green

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend PrayContext with DevotionalSnapshot type |
| 2 | 1 | Create DevotionalPreviewPanel component |
| 3 | 1 | Wire snapshot through DevotionalTabContent + DailyHub |
| 4 | 2, 3 | Integrate panel in PrayTabContent |
| 5 | 2, 3 | Integrate panel in JournalInput |
| 6 | 2 | Unit tests for DevotionalPreviewPanel |
| 7 | 4, 5 | Integration tests for PrayTabContent + JournalTabContent |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend PrayContext with DevotionalSnapshot | [COMPLETE] | 2026-04-06 | Added `DevotionalSnapshot` interface and optional `devotionalSnapshot` field on `PrayContext` in `types/daily-experience.ts`. No deviations. |
| 2 | Create DevotionalPreviewPanel component | [COMPLETE] | 2026-04-06 | Created `DevotionalPreviewPanel.tsx` in `components/daily/`. Matches plan exactly — sticky pill, expand/collapse, full a11y, CSS max-height animation. No deviations. |
| 3 | Wire snapshot through CTAs + handlers | [COMPLETE] | 2026-04-06 | Updated DevotionalTabContent props + CTA handlers to pass `buildSnapshot()`. Updated DailyHub handlers to accept and store snapshot. No deviations. |
| 4 | Integrate panel in PrayTabContent | [COMPLETE] | 2026-04-06 | Added DevotionalPreviewPanel above context banner in PrayTabContent. Gated on same conditions. No deviations. |
| 5 | Integrate panel in JournalInput | [COMPLETE] | 2026-04-06 | Added DevotionalPreviewPanel above context banners in JournalInput. Renders in both guided and free-write modes. No deviations. |
| 6 | Tests for DevotionalPreviewPanel | [COMPLETE] | 2026-04-06 | 13 tests passing. Fixed multi-element match for reference text (appears in both pill and passage label). No other deviations. |
| 7 | Integration tests for PrayTabContent + JournalTabContent | [COMPLETE] | 2026-04-06 | 5 new PrayTabContent tests + 4 new JournalTabContent tests. Used `getByRole('button', { name: /today's devotional/i })` to avoid collision with existing context banner text. No other deviations. |
