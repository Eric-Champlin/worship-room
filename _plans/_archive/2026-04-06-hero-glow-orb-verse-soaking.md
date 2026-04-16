# Implementation Plan: Hero Glow Orb Bleed + Verse-to-Soaking Flow

**Spec:** `_specs/hero-glow-orb-verse-soaking.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/hero-glow-orb-verse-soaking`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Components: `frontend/src/components/`
- Pages: `frontend/src/pages/`
- Meditation sub-pages: `frontend/src/pages/meditate/`
- Homepage components: `frontend/src/components/homepage/`
- Dashboard components: `frontend/src/components/dashboard/`
- Types: `frontend/src/types/`
- Constants: `frontend/src/constants/`
- Mocks: `frontend/src/mocks/`

### Key Files

| File | Path | Role |
|------|------|------|
| GlowBackground.tsx | `frontend/src/components/homepage/GlowBackground.tsx` | Glow orb container — `overflow-hidden` on line 80 |
| ScriptureSoaking.tsx | `frontend/src/pages/meditate/ScriptureSoaking.tsx` | Soaking meditation — reads `?verse=` param, selects from soaking verse pool |
| DailyHub.tsx | `frontend/src/pages/DailyHub.tsx` | Daily Hub hero — "Meditate on this verse" link at line 236 |
| VerseOfTheDayCard.tsx | `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` | Dashboard VOTD widget — "Meditate on this verse" link at line 19 |

### Existing Patterns

**URL param handling (ScriptureSoaking, lines 31-41):** Uses `useSearchParams()` from React Router. Gets `verse` param, matches against `verses.findIndex((v) => v.reference === verseParam)`, falls back to random index.

**Link construction (DailyHub line 236, VerseOfTheDayCard line 19):** Both use identical pattern:
```tsx
to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}
```

**Verse types:**
- `VerseOfTheDay` (from `constants/verse-of-the-day.ts`): `{ text, reference, theme, season? }` — used by DailyHub and VOTD widget. Theme is `'hope' | 'comfort' | 'strength' | 'praise' | 'trust' | 'peace'`.
- `DailyVerse` (from `types/daily-experience.ts`): `{ id, reference, text, theme }` — used by ScriptureSoaking. Theme is `string`.

**Soaking verse pool:** 20 `DailyVerse` objects in `mocks/daily-experience-mock-data.ts` (lines 396-419), retrieved via `getSoakingVerses()`.

**Auth gating (ScriptureSoaking, line 24-26):** Route-level redirect via `useAuth()` + `<Navigate>` to `/daily?tab=meditate` when logged out. This is unchanged.

**Test patterns:**
- `ScriptureSoaking-urlparam.test.tsx`: Mocks `useAuth`, `useFaithPoints`, audio providers. Uses `MemoryRouter` with `initialEntries` for URL params. `renderSoaking(searchParams)` helper.
- `GlowBackground.test.tsx`: Direct render, no mocks needed. Checks class names and inline styles.
- `VerseOfTheDayCard.test.tsx`: Wraps in `MemoryRouter` + `ToastProvider`. Mocks `verse-card-canvas`.

### GlowBackground Container Structure (line 80)

```tsx
<div className={cn('relative overflow-hidden bg-hero-bg', className)}>
  {variant !== 'none' && <GlowOrbs variant={variant} glowOpacity={glowOpacity} />}
  <div className="relative z-10">{children}</div>
</div>
```

Orbs are absolutely positioned with `pointer-events-none`, `will-change-transform`, `blur-[60px] md:blur-[80px]`. Changing `overflow-hidden` to `overflow-visible` allows orbs to render past the container boundary. The orbs' natural radial gradient fade provides the soft bleed — no new CSS needed.

---

## Auth Gating Checklist

All auth gating is existing and unchanged. No new auth-gated actions in this spec.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Access ScriptureSoaking page | Existing redirect when logged out | N/A (unchanged) | `useAuth()` + `<Navigate>` (line 24-26) |
| View verse preview on prestart | Auth-gated page (existing) | N/A (unchanged) | Same route-level redirect |
| Click "Try another verse" | Auth-gated page (existing) | N/A (unchanged) | Same route-level redirect |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Verse preview card | background | `bg-white/50` | Spec: "Styled to match ScriptureSoaking light theme" |
| Verse preview card | border | `border border-gray-200` | Spec design notes |
| Verse preview card | radius | `rounded-lg` | Spec design notes |
| Verse preview card | padding | `p-4` | Spec design notes |
| Verse preview card | alignment | `text-center` | Spec design notes |
| Verse text | font | `font-serif italic` | Spec design notes |
| Verse text | size | `text-sm sm:text-base` | Spec responsive table |
| Verse reference | style | `text-xs text-text-light` | Spec design notes |
| GlowBackground container | overflow | `overflow-visible` (was `overflow-hidden`) | Spec requirement 1 |

---

## Design System Reminder

- GlowBackground orbs use `pointer-events-none` — no click interference from overflow-visible change.
- ScriptureSoaking is a **light-themed** page (white/gray background, `text-text-dark` text). It does NOT use FrostedCard or dark theme patterns.
- The verse preview card uses `bg-white/50` to match the existing light page — NOT `FrostedCard` (spec explicitly says "FrostedCard is NOT used").
- `DailyVerse` type has `id` field; constructed synthetic verse needs a fake `id`.
- URL encoding: `encodeURIComponent()` handles special characters in verse text (apostrophes, quotes). `useSearchParams().get()` auto-decodes.
- Duration options come from `DURATION_OPTIONS` constant. The prestart screen already has duration selector + "Try another verse" + "Begin" button. The verse preview card is added as a new element.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone feature.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | — | No new keys. Existing meditation tracking unchanged. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Verse preview card: full width within `max-w-lg`, `text-sm` verse text, `text-xs` reference |
| Tablet | 768px | Same as mobile — single column within `max-w-lg` |
| Desktop | 1440px | Same layout, verse text scales to `sm:text-base` |

The GlowBackground overflow change is responsive by nature — orbs already scale between mobile (`w-[300px]`) and desktop (`md:w-[600px]`).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| AmbientSoundPill → "Try another verse" | `mb-6` (existing) | ScriptureSoaking.tsx line 220 |
| Verse preview → "Try another verse" | `mb-4` (new) | Plan — preview card positioned above "Try another verse" |
| "Try another verse" → Duration selector | `mb-8` (existing) | ScriptureSoaking.tsx line 231 |

---

## Assumptions & Pre-Execution Checklist

- [x] GlowBackground is the only component that needs overflow change (spec confirms other consumers unaffected)
- [x] ScriptureSoaking light theme is preserved (no dark theme conversion)
- [x] All auth-gated actions from the spec are accounted for (all existing, unchanged)
- [x] Design system values are verified (from spec design notes — light theme page, not design-system.md)
- [x] `VerseOfTheDay.theme` values (`hope`, `comfort`, etc.) are compatible with `DailyVerse.theme` (string type) — no type conflict
- [x] URL-encoded verse text (100-200 chars) + params fit within ~2000 char browser URL limit

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Synthetic verse `id` value | `'custom-url-verse'` | Needs a unique, non-matching ID so it doesn't collide with soaking verse IDs (`soak-1` through `soak-20`) |
| Default theme when `verseTheme` absent | `'peace'` | Neutral default matching most VOTD themes. Theme is only metadata — doesn't affect the meditation experience. |
| Preview card position | Above "Try another verse" button | Logically groups: see current verse → option to change → select duration → begin |
| "Try another verse" after custom verse | Clears custom, shuffles soaking list | Spec: "does not restore the custom URL verse" — once user changes, custom is gone |
| `verseText` absent but `verse` present | Fall back to existing behavior (match or random) | Spec requirement 9: "No custom verse construction without text" |

---

## Implementation Steps

### Step 1: GlowBackground overflow-visible

**Objective:** Change GlowBackground container from `overflow-hidden` to `overflow-visible` so glow orbs bleed past the container boundary.

**Files to create/modify:**
- `frontend/src/components/homepage/GlowBackground.tsx` — Change overflow class
- `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` — Add overflow-visible test

**Details:**

In `GlowBackground.tsx` line 80, replace `overflow-hidden` with `overflow-visible`:

```tsx
// Before:
<div className={cn('relative overflow-hidden bg-hero-bg', className)}>

// After:
<div className={cn('relative overflow-visible bg-hero-bg', className)}>
```

In `GlowBackground.test.tsx`, add one test:

```tsx
it('uses overflow-visible to allow glow bleed', () => {
  const { container } = render(
    <GlowBackground>
      <p>Content</p>
    </GlowBackground>
  )
  const outer = container.firstElementChild as HTMLElement
  expect(outer.className).toContain('overflow-visible')
  expect(outer.className).not.toContain('overflow-hidden')
})
```

**Auth gating:** N/A — no auth-gated actions.

**Responsive behavior:** N/A — `overflow-visible` is a CSS property that works identically across all viewports. Orbs already scale responsively.

**Guardrails (DO NOT):**
- DO NOT change any glow orb sizes, positions, colors, or opacities
- DO NOT change the `pointer-events-none` on orbs
- DO NOT add any new CSS properties (the bleed effect comes entirely from the overflow change)
- DO NOT modify any other GlowBackground props or behavior

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `uses overflow-visible to allow glow bleed` | unit | Assert outer container has `overflow-visible` and NOT `overflow-hidden` |

**Expected state after completion:**
- [ ] GlowBackground container uses `overflow-visible`
- [ ] All 15 existing GlowBackground tests pass
- [ ] 1 new test passes (overflow-visible assertion)
- [ ] No visual regressions on homepage, Daily Hub, or any GlowBackground consumer (CSS-only change)

---

### Step 2: ScriptureSoaking custom verse from URL + preview card

**Objective:** Add `verseText` and `verseTheme` URL param handling. Construct synthetic `DailyVerse` when params are present but verse doesn't match the soaking list. Add verse preview card on prestart screen.

**Files to create/modify:**
- `frontend/src/pages/meditate/ScriptureSoaking.tsx` — URL param reading, custom verse state, preview card JSX, handleBegin update

**Details:**

**A. Read new URL params (after line 32):**

```tsx
const verseTextParam = searchParams.get('verseText')
const verseThemeParam = searchParams.get('verseTheme')
```

**B. Add custom verse state (after the new param reads):**

Replace the existing `verseIndex` initializer (lines 35-41) with logic that also checks for custom verse construction:

```tsx
const [customVerse, setCustomVerse] = useState<DailyVerse | null>(() => {
  if (verseParam && verseTextParam) {
    const matchIndex = verses.findIndex((v) => v.reference === verseParam)
    if (matchIndex === -1) {
      return {
        id: 'custom-url-verse',
        reference: verseParam,
        text: verseTextParam,
        theme: verseThemeParam || 'peace',
      }
    }
  }
  return null
})

const [verseIndex, setVerseIndex] = useState(() => {
  if (verseParam) {
    const matchIndex = verses.findIndex((v) => v.reference === verseParam)
    if (matchIndex !== -1) return matchIndex
  }
  return Math.floor(Math.random() * verses.length)
})
```

**C. Derive active verse:**

Add a computed value after the state declarations:

```tsx
const activeVerse = customVerse ?? verses[verseIndex]
```

**D. Update handleTryAnother (line 65-71):**

Clear custom verse when user clicks "Try another verse":

```tsx
const handleTryAnother = () => {
  setCustomVerse(null)
  let next = Math.floor(Math.random() * verses.length)
  while (next === verseIndex && verses.length > 1) {
    next = Math.floor(Math.random() * verses.length)
  }
  setVerseIndex(next)
}
```

**E. Update handleBegin (line 106):**

Use `activeVerse` instead of `verses[verseIndex]`:

```tsx
// Before:
setSelectedVerse(verses[verseIndex])

// After:
setSelectedVerse(activeVerse)
```

**F. Add verse preview card in prestart screen (after "Try another verse" button, before duration selector — between lines 228 and 230):**

```tsx
{/* Verse preview */}
<div className="mb-4 rounded-lg border border-gray-200 bg-white/50 p-4 text-center">
  <p className="font-serif text-sm italic leading-relaxed text-text-dark sm:text-base">
    &ldquo;{activeVerse.text}&rdquo;
  </p>
  <p className="mt-2 text-xs text-text-light">
    — {activeVerse.reference}
  </p>
</div>
```

**Auth gating:** N/A — ScriptureSoaking is already route-level auth-gated (line 24-26, unchanged).

**Responsive behavior:**
- Desktop (1440px): Preview card within `max-w-lg` container, verse text `sm:text-base`
- Tablet (768px): Same as desktop — `max-w-lg` constrains width
- Mobile (375px): Full width within `max-w-lg`, verse text `text-sm`, reference `text-xs`

**Guardrails (DO NOT):**
- DO NOT change the existing soaking verse pool or `getSoakingVerses()` function
- DO NOT modify the exercise screen or KaraokeTextReveal component
- DO NOT change completion tracking (meditation session, faith points, completion marking)
- DO NOT change the auth redirect behavior
- DO NOT use FrostedCard for the verse preview — this is a light-themed page
- DO NOT add custom verse back to "Try another verse" rotation
- DO NOT construct a custom verse when `verseText` is absent — fall back to existing behavior

**Test specifications:**

Tests are in Step 4.

**Expected state after completion:**
- [ ] `verseText` and `verseTheme` URL params are read from the URL
- [ ] Custom verse is constructed when `verse` + `verseText` present and no soaking list match
- [ ] Verse preview card displays active verse text and reference on prestart screen
- [ ] Preview card updates when "Try another verse" is clicked
- [ ] handleBegin passes correct verse (custom or soaking list) to exercise screen
- [ ] "Try another verse" clears custom verse and shuffles soaking list only
- [ ] Existing behavior preserved for: matched verse, no params, verse-only (no verseText)

---

### Step 3: DailyHub + VerseOfTheDayCard link enhancements

**Objective:** Add `verseText` and `verseTheme` URL params to the "Meditate on this verse" links in DailyHub hero and VerseOfTheDayCard dashboard widget.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — Update link at line 236
- `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` — Update link at line 19

**Details:**

**A. DailyHub.tsx (line 236):**

```tsx
// Before:
to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}

// After:
to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}&verseText=${encodeURIComponent(verse.text)}&verseTheme=${encodeURIComponent(verse.theme)}`}
```

The `verse` variable (line 68) is `getTodaysVerse()` which returns `VerseOfTheDay` with `text`, `reference`, and `theme` properties.

**B. VerseOfTheDayCard.tsx (line 19):**

```tsx
// Before:
to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}

// After:
to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}&verseText=${encodeURIComponent(verse.text)}&verseTheme=${encodeURIComponent(verse.theme)}`}
```

The `verse` variable (line 8) is also `getTodaysVerse()` with the same properties.

**Auth gating:** N/A — links are visible to all users. ScriptureSoaking handles auth gating at the route level.

**Responsive behavior:** N/A: no UI impact — only URL string change in `to` prop.

**Guardrails (DO NOT):**
- DO NOT change any styling, layout, or behavior of these links
- DO NOT modify the verse fetching logic (`getTodaysVerse()`)
- DO NOT add any new imports
- DO NOT change the link text ("Meditate on this verse >")

**Test specifications:**

Tests are in Step 4.

**Expected state after completion:**
- [ ] DailyHub "Meditate on this verse" link includes `verseText` and `verseTheme` URL params
- [ ] VerseOfTheDayCard "Meditate on this verse" link includes `verseText` and `verseTheme` URL params
- [ ] Both links properly encode all params with `encodeURIComponent()`
- [ ] No visual changes to either component

---

### Step 4: Tests for all changes

**Objective:** Add and update tests covering the custom verse flow, preview card, and enhanced links.

**Files to create/modify:**
- `frontend/src/pages/meditate/__tests__/ScriptureSoaking-urlparam.test.tsx` — Add tests for custom verse, preview card
- `frontend/src/components/dashboard/__tests__/VerseOfTheDayCard.test.tsx` — Update link assertion

**Details:**

**A. ScriptureSoaking-urlparam.test.tsx — Add new tests:**

Follow existing pattern in this file (mocks, `renderSoaking()` helper, `MemoryRouter` with `initialEntries`).

New tests to add:

```tsx
it('constructs custom verse when verseText present and no soaking list match', async () => {
  const user = userEvent.setup()
  const customRef = 'Philippians 4:6-7'
  const customText = 'In nothing be anxious'
  renderSoaking(`?verse=${encodeURIComponent(customRef)}&verseText=${encodeURIComponent(customText)}`)

  // Preview card shows custom verse text
  expect(screen.getByText(/In nothing be anxious/)).toBeInTheDocument()
  expect(screen.getByText(/Philippians 4:6-7/)).toBeInTheDocument()

  // Begin with custom verse
  await user.click(screen.getByText('5 min'))
  await user.click(screen.getByText('Begin'))

  // Exercise screen shows custom verse
  expect(screen.getByText(/In nothing be anxious/)).toBeInTheDocument()
})

it('shows verse preview card on prestart screen', () => {
  renderSoaking()

  // Preview card renders with verse text in serif italic
  const previewCard = document.querySelector('.font-serif.italic')
  expect(previewCard).toBeInTheDocument()
})

it('preview card updates after Try Another Verse', async () => {
  const user = userEvent.setup()
  const customRef = 'Philippians 4:6-7'
  const customText = 'In nothing be anxious'
  renderSoaking(`?verse=${encodeURIComponent(customRef)}&verseText=${encodeURIComponent(customText)}`)

  // Initially shows custom verse
  expect(screen.getByText(/In nothing be anxious/)).toBeInTheDocument()

  // Click try another — custom verse cleared, soaking verse shown
  await user.click(screen.getByText('Try another verse'))

  // Custom verse text should no longer be in preview
  expect(screen.queryByText(/In nothing be anxious/)).not.toBeInTheDocument()
})

it('falls back to existing behavior when verseText is missing', async () => {
  const user = userEvent.setup()
  renderSoaking('?verse=Nonexistent%2099%3A99')

  // Should render prestart with a soaking verse preview (not custom)
  expect(screen.getByText('Begin')).toBeInTheDocument()

  await user.click(screen.getByText('5 min'))
  await user.click(screen.getByText('Begin'))

  // A soaking verse renders (not a custom verse)
  expect(screen.getByRole('blockquote')).toBeInTheDocument()
})

it('uses matched soaking verse when verse param matches pool entry with verseText present', async () => {
  const user = userEvent.setup()
  // Psalm 139:13-14 is in the soaking pool — should use pool version, not construct custom
  renderSoaking('?verse=Psalm%20139%3A13-14&verseText=Custom%20text%20here')

  await user.click(screen.getByText('5 min'))
  await user.click(screen.getByText('Begin'))

  // Should show the pool verse (Psalm 139:13-14), not the custom text
  expect(screen.getByText(/Psalm 139:13-14 WEB/)).toBeInTheDocument()
})
```

**B. VerseOfTheDayCard.test.tsx — Update existing tests:**

Update the `shows meditation link` test (line 78-83) and `meditation link encodes verse reference` test (line 85-92) to also check for `verseText` and `verseTheme` params:

```tsx
it('meditation link includes verseText and verseTheme params', () => {
  renderCard()
  const meditateLink = screen.getByText('Meditate on this verse >')
  const href = meditateLink.closest('a')?.getAttribute('href') ?? ''
  expect(href).toContain('verseText=')
  expect(href).toContain('verseTheme=')
})
```

**Auth gating:** N/A — no new auth-gated actions to test.

**Responsive behavior:** N/A: no UI impact — tests only.

**Guardrails (DO NOT):**
- DO NOT remove or modify any existing passing tests
- DO NOT change the test helper functions (`renderSoaking`, `renderCard`)
- DO NOT mock `getSoakingVerses` — use real soaking verse data for realistic testing
- DO NOT add audio-related assertions (audio is mocked and irrelevant to this feature)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `constructs custom verse when verseText present and no soaking list match` | integration | Verify custom DailyVerse constructed from URL params, shown in preview and exercise |
| `shows verse preview card on prestart screen` | unit | Verify preview card renders with serif italic text |
| `preview card updates after Try Another Verse` | integration | Verify custom verse cleared, soaking verse shown after shuffle |
| `falls back to existing behavior when verseText is missing` | integration | Verify no custom verse when only `verse` param present |
| `uses matched soaking verse when verse param matches pool entry with verseText present` | integration | Verify pool match takes precedence over custom verse construction |
| `meditation link includes verseText and verseTheme params` (VOTD) | unit | Verify link href contains verseText and verseTheme params |

**Expected state after completion:**
- [ ] 5 new ScriptureSoaking URL param tests pass
- [ ] 1 new VerseOfTheDayCard test passes
- [ ] All 4 existing ScriptureSoaking URL param tests still pass
- [ ] All 7 existing VerseOfTheDayCard tests still pass
- [ ] Full test suite passes with 0 regressions

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | GlowBackground overflow-visible (CSS-only) |
| 2 | — | ScriptureSoaking custom verse + preview card |
| 3 | — | DailyHub + VerseOfTheDayCard link enhancements |
| 4 | 2, 3 | Tests for all changes |

Steps 1, 2, and 3 are independent and can be executed in any order. Step 4 depends on 2 and 3 being complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | GlowBackground overflow-visible | [COMPLETE] | 2026-04-06 | Changed `overflow-hidden` → `overflow-visible` in GlowBackground.tsx line 80. Added 1 new test. 17/17 tests pass. |
| 2 | ScriptureSoaking custom verse + preview card | [COMPLETE] | 2026-04-06 | Added `verseText`/`verseTheme` URL params, `customVerse` state, `activeVerse` derived value, verse preview card above "Try another verse", updated handleTryAnother and handleBegin. TypeScript compiles clean. |
| 3 | DailyHub + VerseOfTheDayCard link enhancements | [COMPLETE] | 2026-04-06 | Added `verseText` and `verseTheme` params to both "Meditate on this verse" links. No new imports, no styling changes. |
| 4 | Tests for all changes | [COMPLETE] | 2026-04-06 | 5 new ScriptureSoaking tests, 1 new VOTD test. Fixed 3 existing tests (JournalTabContent ×2, PrayTabContent ×1) that referenced `.overflow-hidden` → `.overflow-visible`. All 5555 relevant tests pass; 13 pre-existing GrowthGarden failures remain (unrelated). |
