# Implementation Plan: Song Pick & Sound Enhancement Visual Polish

**Spec:** `_specs/song-pick-sound-pill-polish.md`
**Date:** 2026-03-31
**Branch:** `claude/feature/song-pick-sound-pill-polish`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before the Round 2 dark theme redesign (~2026-03-25). The Song Pick Section Pattern in the recon shows `h-[352px]` for the Spotify iframe, but the actual codebase uses `height="280"`. The recon also shows an outlined primary-color Follow button, but the actual code uses a solid white bg button. Use codebase values, not recon values.

---

## Architecture Context

### Relevant Files

| File | Role | Lines |
|------|------|-------|
| `frontend/src/components/SongPickSection.tsx` | Song Pick section component | 76 |
| `frontend/src/components/daily/AmbientSoundPill.tsx` | "Enhance with sound" pill | 228 |
| `frontend/src/components/daily/PrayerInput.tsx` | Pray tab input (contains heading + pill) | ~160 |
| `frontend/src/components/daily/JournalInput.tsx` | Journal tab input (contains heading + pill) | ~230 |
| `frontend/src/components/daily/MeditateTabContent.tsx` | Meditate tab (contains heading + pill) | ~145 |
| `frontend/src/components/daily/DevotionalTabContent.tsx` | Devotional tab (NO pill — confirmed) | ~345 |
| `frontend/src/pages/DailyHub.tsx` | Daily Hub page (renders SongPickSection at line 410) | ~427 |

### Current AmbientSoundPill Placement

| Tab | File | Placement | Line |
|-----|------|-----------|------|
| Pray | `PrayerInput.tsx` | Between h2 heading and chips/textarea | 85 |
| Journal | `JournalInput.tsx` | Between h2 heading and mode toggle | 153 |
| Meditate | `MeditateTabContent.tsx` | Between h2 heading and meditation cards | 75 |
| Devotional | `DevotionalTabContent.tsx` | **Not present** | N/A |

The pill currently floats between heading and content on all 3 tabs. It uses `<div className="mb-4">` as its root wrapper.

### Current SongPickSection Structure

```
<section bg-hero-dark px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20>
  <div mx-auto max-w-5xl text-center>
    <h2 font-script text-[2.7rem] font-bold text-white> "Today's Song Pick"
    <HeadingDivider>
    <div mx-auto max-w-xl>
      <iframe height="280" (Spotify embed)>
    </div>
    <a rounded-full bg-white text-primary> "Follow Our Playlist"
    <p text-xs text-white/70> "Join 117K+ other followers!"
  </div>
</section>
```

Background: `bg-hero-dark` (#0D0620). Page background: `bg-dashboard-dark` (#0f0a1e). Very similar but not identical — both very dark purple.

### Directory Conventions

- Components: `frontend/src/components/`
- Daily components: `frontend/src/components/daily/`
- Tests: co-located `__tests__/` directories
- Import alias: `@/`

### Test Patterns

- **SongPickSection**: `MemoryRouter` wrapper, role-based queries, checks heading/iframe/link presence
- **AmbientSoundPill**: `AuthProvider` + `ToastProvider` + `AuthModalProvider` + `MemoryRouter` wrapping, mocks `useScenePlayer` and `useAudioState`/`useAudioDispatch`, uses `userEvent` for interaction

### Provider Wrapping (for tests)

Tests for components using AmbientSoundPill require:
```tsx
vi.mock('@/hooks/useScenePlayer', () => ({ useScenePlayer: () => ({...}) }))
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockDispatch,
}))
```

---

## Auth Gating Checklist

**No auth-gated actions in this spec.** Both the Song Pick section and the "Enhance with sound" pill are fully accessible to logged-out and logged-in users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View Song Pick | No auth required | N/A | N/A |
| Click Follow Playlist | No auth required | N/A | N/A |
| View pill | No auth required | N/A | N/A |
| Click pill | No auth required | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Frosted glass card (Song Pick) | background | `bg-white/[0.03]` | spec design notes (lighter than dashboard's bg-white/5) |
| Frosted glass card (Song Pick) | backdrop | `backdrop-blur-sm` | Dashboard Card Pattern, design-system.md |
| Frosted glass card (Song Pick) | border | `border border-white/[0.06]` | spec design notes (lighter than dashboard's border-white/10) |
| Frosted glass card (Song Pick) | border-radius | `rounded-2xl` | Dashboard Card Pattern |
| Frosted glass card (Song Pick) | padding | `p-6 sm:p-8` | spec requirement |
| Song Pick heading | font | `font-script text-[2.7rem] font-bold text-white sm:text-[3.4rem] lg:text-[4rem]` | SongPickSection.tsx:32 |
| Song Pick heading icon | size | `h-7 w-7 sm:h-8 sm:w-8` | [UNVERIFIED] scaled relative to heading font size |
| Song Pick heading icon | color | `text-white/40` | decorative, design-system.md text opacity: 20-40% for decorative |
| Pill (dark variant) idle | classes | `border-white/20 bg-white/10 backdrop-blur-md` | AmbientSoundPill.tsx:132 |
| Section background | color | `bg-hero-dark` (#0D0620) | SongPickSection.tsx:25, tailwind.config.js:15 |

[UNVERIFIED] Song Pick heading icon size: `h-7 w-7 sm:h-8 sm:w-8`
→ To verify: Run /verify-with-playwright and check visual proportion against heading text
→ If wrong: Adjust to match the heading's visual weight (h-6/h-8 range)

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- Dashboard Card Pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Song Pick variant uses slightly more transparent values: `bg-white/[0.03]` and `border-white/[0.06]`
- All tabs share `max-w-2xl` container width (Devotional uses `max-w-4xl`)
- Pill already has `mb-4` on its root `<div>` — override with `className="mb-0"` when integrating into heading row
- Tab headings use: `mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl`
- Tab headings' script spans use: `font-script text-3xl text-primary sm:text-4xl lg:text-5xl`
- Spotify iframe is 280px (not 352px as in design-system recon — recon is stale)
- `cn()` utility (clsx + tailwind-merge) resolves conflicting Tailwind classes
- WCAG AA: decorative icons exempt from contrast, use `text-white/40` for decorative elements
- Page bg: `bg-dashboard-dark` (#0f0a1e), Song Pick section bg: `bg-hero-dark` (#0D0620) — very similar

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Song Pick card full-width with `p-6`; pill drops below heading as centered element with `mt-2` |
| Tablet | 768px | Song Pick card at natural width with `p-6`; pill inline right-aligned with heading |
| Desktop | 1440px | Song Pick card constrained by `max-w-xl`; pill inline right-aligned with heading |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Tab content → Song Pick section | 48-64px | SongPickSection.tsx: `pt-16 sm:pt-20` → will become `py-12 sm:py-16` |
| Song Pick section → Starting Point Quiz | 48-64px | SongPickSection.tsx: `pb-20 sm:pb-24` → will become `py-12 sm:py-16` |
| Heading row → tab content | 16px | wrapper `mb-4` (replaces heading's `mb-4` + pill's `mb-4`) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Devotional tab does NOT have the AmbientSoundPill (confirmed via code search)
- [x] AmbientSoundPill is inside PrayerInput.tsx and JournalInput.tsx (not the parent tab content components)
- [x] Spotify iframe height is 280px in code (not 352px from stale recon)
- [x] All auth-gated actions from the spec are accounted for (none — purely visual)
- [x] Design system values are verified from codebase inspection
- [x] All [UNVERIFIED] values are flagged with verification methods (1 value: icon size)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Song Pick visual approach | Approach A: Frosted glass card | Consistent with Dashboard Card Pattern; creates a clear "contained moment" boundary; radial gradient glow is more subtle and may not provide enough distinction |
| Pill relocation approach | Option A: Integrate into heading row | Spec recommends this; cleanest visual association; works well with existing heading patterns |
| Heading centering with pill | `relative` positioning — pill is `sm:absolute` right-aligned, heading stays `text-center` | Pure flex approach shifts heading left; relative positioning keeps heading perfectly centered regardless of pill width |
| Pill expanded panel on desktop | Panel floats over content below (z-10) | Standard dropdown/popover pattern; panel is temporary and visually distinct |
| AmbientSoundPill className prop | Add `className?: string` prop merged with `cn('mb-4', className)` | Non-breaking change; allows overriding default spacing without modifying all existing usages |
| Music icon in Song Pick heading | Place inside `<h2>` with `inline-flex` layout | HeadingDivider width matches full heading (including icon); looks intentional |
| Devotional tab pill | Do not add | Spec: "If not, don't add it." Confirmed Devotional has no pill. |

---

## Implementation Steps

### Step 1: Add `className` Prop to AmbientSoundPill

**Objective:** Allow consumers to override the pill's default `mb-4` root spacing via a `className` prop.

**Files to modify:**
- `frontend/src/components/daily/AmbientSoundPill.tsx` — Add prop and merge class

**Details:**

1. Add `className?: string` to the `AmbientSoundPillProps` interface (line 10-14):
   ```typescript
   interface AmbientSoundPillProps {
     context: AmbientContext
     variant?: 'light' | 'dark'
     visible?: boolean
     className?: string
   }
   ```

2. Destructure `className` in the function signature (line 16-20):
   ```typescript
   export function AmbientSoundPill({
     context,
     variant = 'light',
     visible = true,
     className,
   }: AmbientSoundPillProps) {
   ```

3. Add `cn` import if not present. Replace the root div's className (line 113):
   ```typescript
   // Before:
   <div ref={containerRef} className="mb-4">

   // After:
   <div ref={containerRef} className={cn('mb-4', className)}>
   ```

4. Add `import { cn } from '@/lib/utils'` at the top of the file.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — this is an API change only.

**Guardrails (DO NOT):**
- DO NOT change any existing visual behavior — all current usages pass no `className`, so `cn('mb-4', undefined)` = `'mb-4'` (no change)
- DO NOT modify the pill's internal styling, interaction, or expanded panel behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `applies custom className` | unit | Render with `className="mb-0"`, verify root div has `mb-0` (tailwind-merge resolves conflict) |
| `uses default mb-4 when no className` | unit | Render without className prop, verify root div has `mb-4` |

**Expected state after completion:**
- [x] AmbientSoundPill accepts optional `className` prop
- [x] Existing usages unchanged (no className passed → `mb-4` default)
- [x] `cn('mb-4', 'mb-0')` → `'mb-0'` (tailwind-merge resolves correctly)

---

### Step 2: Song Pick Section — Frosted Glass Card Enhancement

**Objective:** Wrap the Song Pick section content in a frosted glass card with a music icon to create visual distinction.

**Files to modify:**
- `frontend/src/components/SongPickSection.tsx` — Add frosted glass card, music icon, adjust spacing

**Details:**

1. Add `Music` icon import:
   ```typescript
   import { Music } from 'lucide-react'
   ```

2. Restructure the JSX. The current structure:
   ```tsx
   <section className="bg-hero-dark px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20">
     <div className="mx-auto max-w-5xl text-center">
       <!-- all content -->
     </div>
   </section>
   ```

   Becomes:
   ```tsx
   <section
     aria-labelledby="song-pick-heading"
     className="px-4 py-12 sm:px-6 sm:py-16"
   >
     <div className="mx-auto max-w-xl">
       <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center backdrop-blur-sm sm:p-8">
         <!-- all content (heading, divider, embed, button, follower count) -->
       </div>
     </div>
   </section>
   ```

3. Change the heading to `inline-flex` to accommodate the music icon:
   ```tsx
   <h2
     ref={headingRef}
     id="song-pick-heading"
     className="inline-flex items-center justify-center gap-2 font-script text-[2.7rem] font-bold text-white sm:text-[3.4rem] lg:text-[4rem]"
   >
     <Music className="h-7 w-7 text-white/40 sm:h-8 sm:w-8" aria-hidden="true" />
     Today&apos;s Song Pick
   </h2>
   ```

4. The remaining content (HeadingDivider, iframe with skeleton, Follow button, follower count) stays structurally the same inside the card.

5. Change the outer container from `max-w-5xl` to `max-w-xl` since the card constrains width. The iframe's `mx-auto max-w-xl` wrapper is no longer needed — the card itself is max-w-xl.

6. Remove the section-level `bg-hero-dark` — the page background (`bg-dashboard-dark`) is nearly identical, and the frosted glass card provides the visual distinction. Keep `aria-labelledby`.

7. Remove the `mx-auto mt-8 max-w-xl relative` wrapper around the iframe — the card's max-w-xl already constrains it. The iframe's `mt-8` spacing remains via a new `mt-6` on the iframe wrapper (slightly tighter since the card provides padding).

**Responsive behavior:**
- Desktop (1440px): Card at `max-w-xl` (~576px) centered, `p-8` padding, ample breathing room
- Tablet (768px): Card fills available width up to `max-w-xl`, `p-6` padding
- Mobile (375px): Card fills width minus `px-4` (16px each side) = 343px content, `p-6` padding

**Auth gating:** N/A

**Guardrails (DO NOT):**
- DO NOT change the Spotify iframe height (280px), src URL construction, or lazy loading behavior
- DO NOT change the "Follow Our Playlist" button's href, target, or rel attributes
- DO NOT change the `getSongOfTheDay()` data fetching logic
- DO NOT change the `useOnlineStatus()` or offline handling
- DO NOT change the `useElementWidth()` pattern for HeadingDivider

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders frosted glass card wrapper` | unit | Verify the section contains a div with `rounded-2xl` and `border-white/[0.06]` classes |
| `renders music icon in heading` | unit | Query for `Music` icon (aria-hidden svg) adjacent to heading text |
| `existing tests still pass` | regression | `SongPickSection.test.tsx` tests for heading, iframe, Follow link still pass |

**Expected state after completion:**
- [x] Song Pick section wrapped in frosted glass card (`bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl`)
- [x] Music icon (Lucide `Music`) appears next to heading
- [x] HeadingDivider renders correctly (width driven by heading including icon)
- [x] Spotify iframe loads and plays within the card at 280px height
- [x] "Follow Our Playlist" link and follower count render below embed
- [x] Offline state renders correctly within the card

---

### Step 3: Relocate Pill in PrayerInput (Pray Tab)

**Objective:** Move the "Enhance with sound" pill into the heading row on the Pray tab, right-aligned on desktop, centered below heading on mobile.

**Files to modify:**
- `frontend/src/components/daily/PrayerInput.tsx` — Restructure heading + pill into a shared row

**Details:**

Current structure (`PrayerInput.tsx` lines 78-85):
```tsx
<h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
  What&apos;s On Your{' '}
  <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
    Heart?
  </span>
</h2>

<AmbientSoundPill context="pray" variant="dark" />
```

New structure:
```tsx
<div className="relative mb-4">
  <h2 className="text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
    What&apos;s On Your{' '}
    <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
      Heart?
    </span>
  </h2>
  <div className="mt-2 flex justify-center sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:mt-0 z-10">
    <AmbientSoundPill context="pray" variant="dark" className="mb-0" />
  </div>
</div>
```

Changes:
1. Remove `mb-4` from the `<h2>` — spacing moves to the wrapper `<div>`
2. Wrap heading + pill in `<div className="relative mb-4">`
3. Wrap AmbientSoundPill in a positioning div:
   - Mobile: `mt-2 flex justify-center` — pill centered below heading with 8px gap
   - Desktop (sm+): `sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:mt-0` — pill right-aligned, vertically centered
4. Add `z-10` to the pill wrapper so the expanded suggestion panel floats above content
5. Pass `className="mb-0"` to AmbientSoundPill to remove its default bottom margin inside the positioned wrapper

**Responsive behavior:**
- Desktop (1440px): Heading centered, pill absolutely positioned right, vertically centered with heading
- Tablet (768px): Same as desktop (sm breakpoint applies)
- Mobile (375px): Heading centered full-width, pill centered on next line with `mt-2` gap

**Auth gating:** N/A

**Guardrails (DO NOT):**
- DO NOT change the pill's `context` or `variant` props
- DO NOT change the heading text or styling (font, size, color)
- DO NOT modify the pill's click handler, expanded panel, or audio behavior
- DO NOT remove or modify the `retryPrompt` display or chips section below

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pill renders in heading row` | integration | In PrayerInput, verify both heading and "Enhance with sound" are present |

**Expected state after completion:**
- [x] Pill appears right-aligned next to heading on desktop
- [x] Pill appears centered below heading on mobile
- [x] Pill click still opens suggestion panel / audio drawer
- [x] Heading remains visually centered

---

### Step 4: Relocate Pill in JournalInput (Journal Tab)

**Objective:** Move the "Enhance with sound" pill into the heading row on the Journal tab, matching the Pray tab pattern from Step 3.

**Files to modify:**
- `frontend/src/components/daily/JournalInput.tsx` — Restructure heading + pill into a shared row

**Details:**

Current structure (`JournalInput.tsx` lines 148-153):
```tsx
<h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
  What&apos;s On Your{' '}
  <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Mind?</span>
</h2>

<AmbientSoundPill context="journal" variant="dark" />
```

New structure — identical pattern to Step 3:
```tsx
<div className="relative mb-4">
  <h2 className="text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
    What&apos;s On Your{' '}
    <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">Mind?</span>
  </h2>
  <div className="mt-2 flex justify-center sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:mt-0 z-10">
    <AmbientSoundPill context="journal" variant="dark" className="mb-0" />
  </div>
</div>
```

Changes are identical to Step 3:
1. Remove `mb-4` from the `<h2>`
2. Wrap heading + pill in `<div className="relative mb-4">`
3. Wrap AmbientSoundPill in positioning div (mobile: centered below; desktop: absolute right)
4. Pass `className="mb-0"` to AmbientSoundPill

**Responsive behavior:**
- Desktop (1440px): Heading centered, pill right-aligned
- Tablet (768px): Same as desktop
- Mobile (375px): Heading centered, pill centered below with `mt-2`

**Auth gating:** N/A

**Guardrails (DO NOT):**
- DO NOT change the pill's `context` or `variant` props
- DO NOT change the heading text or styling
- DO NOT modify the mode toggle, context banner, or textarea below

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pill renders in heading row` | integration | In JournalInput, verify both heading and "Enhance with sound" are present |

**Expected state after completion:**
- [x] Pill appears right-aligned next to heading on desktop
- [x] Pill appears centered below heading on mobile
- [x] Pill position is identical to Pray tab (Step 3)

---

### Step 5: Relocate Pill in MeditateTabContent (Meditate Tab)

**Objective:** Move the "Enhance with sound" pill into the heading row on the Meditate tab, matching the pattern from Steps 3-4.

**Files to modify:**
- `frontend/src/components/daily/MeditateTabContent.tsx` — Restructure heading + pill into a shared row

**Details:**

Current structure (`MeditateTabContent.tsx` lines 68-75):
```tsx
<h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
  What&apos;s On Your{' '}
  <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
    Spirit?
  </span>
</h2>

<AmbientSoundPill context="meditate" variant="dark" />
```

New structure — identical pattern:
```tsx
<div className="relative mb-4">
  <h2 className="text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
    What&apos;s On Your{' '}
    <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
      Spirit?
    </span>
  </h2>
  <div className="mt-2 flex justify-center sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:mt-0 z-10">
    <AmbientSoundPill context="meditate" variant="dark" className="mb-0" />
  </div>
</div>
```

Changes are identical to Steps 3-4.

**Responsive behavior:**
- Desktop (1440px): Heading centered, pill right-aligned
- Tablet (768px): Same as desktop
- Mobile (375px): Heading centered, pill centered below with `mt-2`

**Auth gating:** N/A

**Guardrails (DO NOT):**
- DO NOT change the pill's `context` or `variant` props
- DO NOT change the heading text or styling
- DO NOT modify the celebration banner, meditation cards, or auth gating logic below

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pill renders in heading row` | integration | In MeditateTabContent, verify both heading and "Enhance with sound" are present |

**Expected state after completion:**
- [x] Pill appears right-aligned next to heading on desktop
- [x] Pill appears centered below heading on mobile
- [x] Pill position is identical to Pray and Journal tabs

---

### Step 6: Tests

**Objective:** Update existing tests and add new tests for the visual changes. Verify all existing tests pass.

**Files to create/modify:**
- `frontend/src/components/__tests__/SongPickSection.test.tsx` — Add card wrapper and icon tests
- `frontend/src/components/daily/__tests__/AmbientSoundPill.test.tsx` — Add className prop test

**Details:**

**1. SongPickSection.test.tsx — Add tests:**

```typescript
it('wraps content in frosted glass card', () => {
  renderComponent()
  const section = screen.getByRole('region', { name: /today's song pick/i })
    ?? document.querySelector('section[aria-labelledby="song-pick-heading"]')
  const card = section?.querySelector('.rounded-2xl')
  expect(card).toBeInTheDocument()
  expect(card).toHaveClass('border')
  expect(card).toHaveClass('backdrop-blur-sm')
})

it('renders music icon in heading', () => {
  renderComponent()
  const heading = screen.getByRole('heading', { name: /today's song pick/i })
  // Icon is inside heading, aria-hidden
  const svg = heading.querySelector('svg')
  expect(svg).toBeInTheDocument()
})
```

**2. AmbientSoundPill.test.tsx — Add className prop test:**

Add to the existing describe block:
```typescript
it('applies custom className to root container', () => {
  renderPill({ className: 'mb-0' })
  const pill = screen.getByLabelText('Enhance with sound')
  // The root container is the parent of the pill button
  expect(pill.closest('[class*="mb-0"]')).toBeInTheDocument()
})

it('uses default mb-4 when no className provided', () => {
  renderPill()
  const pill = screen.getByLabelText('Enhance with sound')
  expect(pill.closest('[class*="mb-4"]')).toBeInTheDocument()
})
```

**3. Run full test suite:**

```bash
cd frontend && pnpm test
```

Verify all existing tests pass, including:
- `SongPickSection.test.tsx` (3 existing tests)
- `SongPickSection-offline.test.tsx` (existing offline tests)
- `AmbientSoundPill.test.tsx` (22 existing tests)
- `PrayTabContent.test.tsx`, `JournalTabContent.test.tsx`, `MeditateTabContent.test.tsx` (existing integration tests)
- `DailyHub.test.tsx` (existing page tests)

**Responsive behavior:** N/A: no UI impact — these are test files.

**Auth gating:** N/A

**Guardrails (DO NOT):**
- DO NOT modify the existing test assertions that still apply (heading, iframe, Follow link)
- DO NOT remove mocks that other tests depend on
- DO NOT add excessive tests for purely visual concerns (verify with /verify-with-playwright instead)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `frosted glass card wrapper` | unit | SongPickSection has rounded-2xl card with backdrop-blur |
| `music icon in heading` | unit | SongPickSection heading contains SVG icon |
| `className prop applies` | unit | AmbientSoundPill root gets custom class via cn() merge |
| `default className preserved` | unit | AmbientSoundPill root has mb-4 when no className |
| All existing tests | regression | Full test suite passes with no failures |

**Expected state after completion:**
- [x] 4-5 new tests pass
- [x] All existing tests (~4862+) pass without modification
- [x] Build succeeds with 0 errors, 0 warnings

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add className prop to AmbientSoundPill |
| 2 | — | Song Pick frosted glass card enhancement |
| 3 | 1 | Relocate pill in PrayerInput (uses className="mb-0") |
| 4 | 1 | Relocate pill in JournalInput (uses className="mb-0") |
| 5 | 1 | Relocate pill in MeditateTabContent (uses className="mb-0") |
| 6 | 1, 2, 3, 4, 5 | Tests for all changes |

Steps 2-5 can run in parallel after Step 1 completes. Step 6 runs after all others.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add className prop to AmbientSoundPill | [COMPLETE] | 2026-03-31 | Added `className?: string` prop, `cn` import, merged with `cn('mb-4', className)` on root div. All 22 existing tests pass. |
| 2 | Song Pick frosted glass card | [COMPLETE] | 2026-03-31 | Added frosted glass card wrapper, Music icon in heading, reduced section padding, removed bg-hero-dark, changed max-w-5xl→max-w-xl. All 6 existing tests pass. |
| 3 | Relocate pill in PrayerInput | [COMPLETE] | 2026-03-31 | Wrapped heading+pill in relative div, pill absolute right on sm+, centered below on mobile. 39 PrayTabContent + 31 DailyHub tests pass. |
| 4 | Relocate pill in JournalInput | [COMPLETE] | 2026-03-31 | Same pattern as Step 3. 21 JournalTabContent tests pass. |
| 5 | Relocate pill in MeditateTabContent | [COMPLETE] | 2026-03-31 | Same pattern as Steps 3-4. No separate MeditateTabContent test file; covered by DailyHub tests. |
| 6 | Tests | [COMPLETE] | 2026-03-31 | Added 2 SongPickSection tests (frosted glass card, music icon) + 2 AmbientSoundPill tests (className apply, default mb-4). Full suite: 4954 pass, 4 pre-existing failures in ChallengeDetail/Challenges (unrelated). |
