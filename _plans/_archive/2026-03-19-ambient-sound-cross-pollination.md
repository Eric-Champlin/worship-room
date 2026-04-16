# Implementation Plan: Ambient Sound Cross-Pollination

**Spec:** `_specs/ambient-sound-cross-pollination.md`
**Date:** 2026-03-19
**Branch:** `claude/feature/ambient-sound-cross-pollination`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon needed — entirely new inline component)
**Master Spec Plan:** not applicable (standalone feature, not part of a multi-spec sequence)

---

## Architecture Context

### Relevant Existing Files and Patterns

**Audio System:**
- `frontend/src/hooks/useScenePlayer.ts` — Scene playback hook. `loadScene(scene)` handles auth gating internally (calls `authModal.openAuthModal('Sign in to play ambient scenes')` when not authenticated, lines 155–170). Returns `{ activeSceneId, loadScene, isLoading, undoAvailable, ... }`.
- `frontend/src/components/audio/AudioProvider.tsx` — Global state via 4 contexts. `useAudioState()` returns `{ activeSounds, isPlaying, currentSceneName, currentSceneId, pillVisible, drawerOpen, foregroundContent, sleepTimer, activeRoutine }`. `useAudioDispatch()` dispatches `OPEN_DRAWER`, `CLOSE_DRAWER`, etc.
- `frontend/src/components/audio/AudioPill.tsx` — Fixed-position floating pill showing now-playing info. Uses `animate-waveform-bar-1/2/3` CSS animations for waveform display. Click opens `AudioDrawer`.
- `frontend/src/components/audio/AudioDrawer.tsx` — Expandable audio controls panel. Desktop: right panel (400px). Mobile: bottom sheet. Controlled by `state.drawerOpen`.
- `frontend/src/data/scenes.ts` — 8 `ScenePreset` objects. `SCENE_BY_ID` Map for lookup by ID. IDs: `garden-of-gethsemane`, `still-waters`, `midnight-rain`, `ember-and-stone`, `morning-mist`, `the-upper-room`, `starfield`, `mountain-refuge`.

**Daily Hub Tabs:**
- `frontend/src/pages/DailyHub.tsx` — Tabbed layout at `/daily`. 3 tabs (Pray, Journal, Meditate) rendered simultaneously, hidden via CSS. Tab content wrapped in `max-w-2xl` containers.
- `frontend/src/components/daily/PrayTabContent.tsx` — Pray tab. Structure: `max-w-2xl` → BackgroundSquiggle → Loading/Prayer display → Input section (heading "What's On Your Heart?" at line ~295, chips, textarea, CrisisBanner, generate button).
- `frontend/src/components/daily/JournalTabContent.tsx` — Journal tab. Structure: `max-w-2xl` → BackgroundSquiggle → Heading "What's On Your Mind?" (line 183) → Mode Toggle → Prompt card → Textarea.
- `frontend/src/components/daily/MeditateTabContent.tsx` — Meditate tab. Structure: `max-w-2xl` → BackgroundSquiggle → Heading "What's On Your Spirit?" (line 54) → Celebration banner → 6 meditation cards.

**Meditation Sub-Pages:**
- All 6 sub-pages follow the same pattern: auth gate (`useAuth()` + `<Navigate>` redirect when logged out), then `<Layout hero={<PageHero ...>}>` wrapping content.
- `BreathingExercise.tsx` — Has `screen` state: `'prestart' | 'exercise' | 'complete'`. Three separate return statements. Has chime + voice audio controls → pill must hide during `'exercise'`.
- `ScriptureSoaking.tsx`, `PsalmReading.tsx` — Have `Screen` type but no conflicting audio → pill always visible.
- `GratitudeReflection.tsx`, `ActsPrayerWalk.tsx`, `ExamenReflection.tsx` — No `Screen` type, simpler structure → pill always visible.

**Auth Pattern:**
- `useAuth()` from `@/hooks/useAuth` (re-exported from `@/contexts/AuthContext.tsx`) — returns `{ isAuthenticated, user, login, logout }`.
- `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` — returns `{ openAuthModal(subtitle?, initialView?) }`.
- `useScenePlayer().loadScene()` already handles auth gating internally — no additional auth code needed in the pill.

**Test Pattern (from `PrayTabContent.test.tsx`):**
- Wrap with `MemoryRouter` (with `v7_startTransition`, `v7_relativeSplatPath` future flags) → `AuthProvider` → `ToastProvider` → `AuthModalProvider`.
- Mock hooks: `vi.mock('@/hooks/useFaithPoints', ...)`, `vi.mock('@/hooks/useScenePlayer', ...)`.
- Set `localStorage` for auth state: `wr_auth_simulated`, `wr_user_name`.
- Use `@testing-library/user-event` for interactions.

**Waveform Animations (already in `tailwind.config.js` lines 72–83, 152–154):**
- `animate-waveform-bar-1`: 1.2s cycle, height 4px↔16px
- `animate-waveform-bar-2`: 1.0s cycle, height 8px↔20px
- `animate-waveform-bar-3`: 1.4s cycle, height 6px↔12px

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Pill visibility (collapsed, idle) | Visible to all users | Step 3, 4 | No auth required |
| Pill click → expand suggestion panel | Available to all users | Step 2 | No auth required |
| Scene card click → play scene | Auth-gated (logged-out → auth modal) | Step 2 | `useScenePlayer.loadScene()` handles internally |
| "Browse all sounds" link | Available to all users | Step 2 | No auth required |
| Pill click when audio playing → toggle drawer | Only reachable by auth'd users (audio requires auth) | Step 2 | Implicitly gated (audio playback requires auth) |

No new auth checks required — `useScenePlayer` already handles the auth gate for scene playback.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Pill (light bg) | background | `bg-gray-100/80 backdrop-blur-md` | spec (new pattern) |
| Pill (light bg) | border | `border border-gray-200/50` | spec |
| Pill (light bg) | border-radius | `rounded-full` | spec + Chip/Tag pattern (design-system.md) |
| Pill (light bg) | padding | `py-2 px-4` | spec |
| Pill (light bg) | icon color | `text-gray-500` | spec |
| Pill (light bg) | text color | `text-gray-600` | spec |
| Pill (light bg) | hover | `hover:bg-gray-200/80` | spec |
| Pill (playing) | left border | `border-l-2 border-l-primary` | spec |
| Pill (playing) | text weight | `font-medium` | spec |
| Panel (light bg) | background | `bg-white/90 backdrop-blur-md` | spec |
| Panel (light bg) | border | `border border-gray-200` | spec |
| Panel (light bg) | border-radius | `rounded-xl` | spec |
| Panel (light bg) | shadow | `shadow-lg` | spec |
| Panel (light bg) | padding | `p-3` | spec |
| Scene card (light bg) | background | `bg-gray-50 hover:bg-gray-100` | spec |
| Scene card (light bg) | border-radius | `rounded-lg` | spec |
| Scene card (light bg) | padding | `p-3` | spec |
| Scene card (light bg) | text color | `text-gray-800` | spec |
| Scene card | min-height | `min-h-[44px]` | spec (touch target) |
| Scene card | focus ring | `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none` | spec |
| Browse link | text | `text-xs text-gray-400 hover:text-gray-600` | spec |
| Waveform bars | animation | `animate-waveform-bar-1/2/3` | tailwind.config.js lines 152–154 |
| Tab content container | max-width | `max-w-2xl` | design-system.md |
| Neutral background | color | `#F5F5F5` | design-system.md |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for hero headings and highlighted words, NOT Lora
- Squiggle backgrounds use `SQUIGGLE_MASK_STYLE` for fade mask — `BackgroundSquiggle` sits inside a `pointer-events-none absolute inset-0` wrapper
- All Daily Hub tabs share `max-w-2xl` container width with `px-4 py-10 sm:py-14` padding
- The pill's light-bg variant is a NEW pattern (frosted glass on `#F5F5F5` background) — verify visually
- Existing `AudioPill` is a separate global fixed-position component — do NOT conflict with it
- `useScenePlayer.loadScene()` handles auth gating internally — do NOT add a second auth check
- Existing waveform animations (`animate-waveform-bar-1/2/3`) are in tailwind.config.js — reuse them
- All meditation sub-pages are already auth-gated at the route level (redirect when logged out)
- Tab content in DailyHub is mounted simultaneously (CSS hidden) — click-outside handlers must not fire from hidden tabs

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Pill: full content width within `max-w-2xl`. Panel: full width. Scene cards: horizontal scroll (`overflow-x-auto snap-x`), each `min-w-[140px] flex-shrink-0 snap-center`. |
| Tablet | >= 640px | Pill: auto-width, left-aligned. Panel: `max-w-[480px]`, left-aligned under pill. Cards: 3 across, no scroll. |
| Desktop | >= 1024px | Same as tablet. Hover states visible on cards. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Tab heading → Pill | 0 (pill sits immediately below heading with `mb-4` gap from heading) | New layout element |
| Pill → next content (chips/toggle/cards) | 16px (`mb-4` on pill wrapper) | Matching existing heading-to-content spacing |
| Panel (when expanded) → next content | 16px (`mb-4` on panel) | Consistent with pill spacing |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All 8 scene presets exist in `data/scenes.ts` with IDs matching the spec's scene mapping
- [x] `useScenePlayer` hook handles auth gating (confirmed at lines 155–170)
- [x] Waveform animations exist in tailwind.config.js (confirmed at lines 72–83, 152–154)
- [x] All auth-gated actions from the spec are accounted for in the plan (scene playback only — handled by existing hook)
- [x] Design system values verified from spec + design-system.md (light-bg frosted glass is new pattern)
- [ ] [UNVERIFIED] Light-bg frosted glass pill (`bg-gray-100/80 backdrop-blur-md`) looks good on `#F5F5F5` background — verify visually after Step 2
- [x] No prior specs in a sequence need to be complete (standalone feature)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth gating approach | Piggyback on `useScenePlayer.loadScene()` internal auth check | Consistent with existing pattern. No auth loophole. No duplicate gate code. |
| Waveform animation | Reuse existing `animate-waveform-bar-1/2/3` from tailwind.config | Already proven in AudioPill. Consistent visual language. Spec suggests different timings (0.4s/0.6s/0.5s) but existing durations (1.2s/1.0s/1.4s) are more subtle and calming. |
| Light vs dark variant | Default to `'light'` for all current placements | All tab contents and meditation sub-pages render on `#F5F5F5` neutral background. Dark variant built for future use but currently unused. |
| Click-outside on hidden tabs | Use check for pill visibility before handling click-outside | Tab content is mounted but hidden — click-outside handlers on hidden tabs must not interfere. Use `element.offsetParent !== null` or ref visibility check. |
| BreathingExercise pill placement | Add pill to `prestart` and `complete` return statements | BreathingExercise has 3 separate returns per screen state. Simplest approach is adding pill to the relevant returns with `visible={screen !== 'exercise'}`. |
| Drawer toggle behavior | Check `state.drawerOpen` and dispatch `CLOSE_DRAWER` or `OPEN_DRAWER` | Spec requirement: "If AudioDrawer is already open, tapping the pill closes it (toggle)." |
| Panel → card click flow | Start scene, then collapse panel after 300ms delay | Allows the user to see the card activate before collapsing. Spec: "Clicking a scene card collapses the panel after starting playback." |
| `prefers-reduced-motion` | Waveform bars rendered static (no animation class). Panel expand/collapse instant (no transition). | Spec requirement. Use `useMediaQuery('(prefers-reduced-motion: reduce)')` or inline media query. |

---

## Implementation Steps

### Step 1: Scene Suggestion Mapping Constants

**Objective:** Create the context-to-scene mapping used by the pill to display the right 3 scene suggestions per location.

**Files to create:**
- `frontend/src/constants/ambient-suggestions.ts` — Scene suggestion mapping + type

**Details:**

```typescript
import { SCENE_BY_ID } from '@/data/scenes'
import type { ScenePreset } from '@/types/music'

export type AmbientContext =
  | 'pray'
  | 'journal'
  | 'meditate'
  | 'breathing'
  | 'soaking'
  | 'other-meditation'

const AMBIENT_SCENE_IDS: Record<AmbientContext, string[]> = {
  pray: ['the-upper-room', 'ember-and-stone', 'still-waters'],
  journal: ['midnight-rain', 'morning-mist', 'starfield'],
  meditate: ['garden-of-gethsemane', 'still-waters', 'mountain-refuge'],
  breathing: ['still-waters', 'morning-mist', 'garden-of-gethsemane'],
  soaking: ['the-upper-room', 'starfield', 'garden-of-gethsemane'],
  'other-meditation': ['garden-of-gethsemane', 'still-waters', 'mountain-refuge'],
}

export function getSuggestedScenes(context: AmbientContext): ScenePreset[] {
  const ids = AMBIENT_SCENE_IDS[context]
  return ids.map((id) => SCENE_BY_ID.get(id)).filter(Boolean) as ScenePreset[]
}
```

**Guardrails (DO NOT):**
- Do NOT hardcode scene objects — always look up from `SCENE_BY_ID` so data stays in sync
- Do NOT add new localStorage keys
- Do NOT create new routes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getSuggestedScenes returns 3 scenes for each context` | unit | Iterate all `AmbientContext` values, verify each returns exactly 3 `ScenePreset` objects |
| `getSuggestedScenes returns correct scene names per context` | unit | Verify Pray returns "The Upper Room", "Ember & Stone", "Still Waters" etc. |
| `getSuggestedScenes handles missing scene IDs gracefully` | unit | If `SCENE_BY_ID` is ever out of sync, function filters out undefined entries |

**Expected state after completion:**
- [x] New file `constants/ambient-suggestions.ts` exports `AmbientContext` type and `getSuggestedScenes()` function
- [x] All 6 contexts map to exactly 3 valid scene IDs from `data/scenes.ts`
- [x] No runtime errors if called with any valid context

---

### Step 2: AmbientSoundPill Component

**Objective:** Build the core pill component with 3 visual states (idle, playing, expanded suggestion panel), waveform animation, click-outside dismissal, keyboard navigation, and accessibility.

**Files to create:**
- `frontend/src/components/daily/AmbientSoundPill.tsx` — Main component

**Details:**

**Props interface:**
```typescript
interface AmbientSoundPillProps {
  context: AmbientContext
  variant?: 'light' | 'dark' // default: 'light'
  visible?: boolean          // default: true (for BreathingExercise hide logic)
}
```

**State management:**
- `expanded: boolean` — suggestion panel open/closed (React state, reset on navigation)
- No new localStorage keys. No persistence.

**Context hooks consumed:**
- `useAudioState()` — read `isPlaying`, `currentSceneName`, `currentSceneId`, `activeSounds`, `drawerOpen`, `pillVisible`
- `useAudioDispatch()` — dispatch `OPEN_DRAWER` / `CLOSE_DRAWER`
- `useScenePlayer()` — `loadScene(scene)` (handles auth internally), `activeSceneId`

**Audio-playing detection logic:**
```typescript
const hasActiveAudio = audioState.activeSounds.length > 0 || audioState.pillVisible
```

**Three render states:**

1. **Idle pill** (no audio playing, `!expanded`):
   - Lucide `Music` icon (16px) + "Enhance with sound" text
   - Click → set `expanded = true`, focus first scene card
   - Light variant: `bg-gray-100/80 backdrop-blur-md border border-gray-200/50 rounded-full py-2 px-4`
   - Hover: `hover:bg-gray-200/80`

2. **Playing pill** (audio active, `!expanded`):
   - 3 waveform bars (using existing `animate-waveform-bar-1/2/3` classes, `w-[3px] rounded-full bg-primary`) + "Playing: [scene name]" (from `audioState.currentSceneName` or "Custom mix" fallback)
   - Left border accent: `border-l-2 border-l-primary`
   - Click → toggle AudioDrawer (`dispatch({ type: drawerOpen ? 'CLOSE_DRAWER' : 'OPEN_DRAWER' })`)
   - Waveform respects `prefers-reduced-motion`: static bars (no animation class) when preferred

3. **Expanded panel** (idle, `expanded`):
   - Inline below pill (not modal, not drawer)
   - Container: `bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg p-3 mt-2`
   - 3 scene cards in flex row: `flex gap-2` (mobile: `overflow-x-auto snap-x snap-mandatory`, each card `min-w-[140px] flex-shrink-0 snap-center`)
   - Each card: scene name + small category icon. `bg-gray-50 hover:bg-gray-100 rounded-lg p-3 min-h-[44px] cursor-pointer transition-colors`. Focus: `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none`
   - Card click: call `loadScene(scene)`, then collapse panel after 300ms (`setTimeout`)
   - "Browse all sounds →" link below cards: `text-xs text-gray-400 hover:text-gray-600`, href=`/music?tab=ambient`
   - Panel expand animation: `transition-all duration-200 ease-out` on `max-height` and `opacity`. `prefers-reduced-motion`: instant.

**Click-outside dismissal:**
- Add `mousedown` event listener on `document` when `expanded`
- Check if click target is outside the pill+panel container ref
- Also check that the pill's container is actually visible (not a hidden tab's pill): use `pillRef.current.offsetParent !== null`
- Collapse panel on click outside

**Escape key:**
- Add `keydown` listener when `expanded`
- On `Escape`: collapse panel, return focus to pill button

**Focus management:**
- On expand: focus first scene card (using `ref` + `setTimeout` for DOM readiness)
- On collapse (Escape or click-outside): focus returns to pill button

**Accessibility:**
- Pill button: `role="button"`, `aria-expanded={expanded}`, `aria-controls="ambient-panel-{context}"`, `aria-label` based on state ("Enhance with sound" or "Playing: Scene Name, click to open audio controls")
- Panel: `role="region"`, `aria-label="Ambient sound suggestions"`, `id="ambient-panel-{context}"`
- Scene cards: `role="button"`, `tabIndex={0}`, accessible name = scene name
- Waveform: `aria-hidden="true"` (decorative)
- Screen reader announcement: `aria-expanded` on pill button handles expand/collapse announcement

**`visible` prop:**
- When `visible === false`: render nothing (return `null`)
- When `visible === true` or undefined: render normally

**Responsive behavior:**
- Mobile (< 640px): `w-full` pill, `w-full` panel, horizontal-scroll cards
- Tablet/Desktop (>= 640px): `w-auto` pill, `max-w-[480px] sm:w-auto` panel, cards in row

**Guardrails (DO NOT):**
- Do NOT import or modify `AudioPill.tsx` (the global floating pill) — this is a separate component
- Do NOT add new auth checks — `useScenePlayer.loadScene()` handles auth internally
- Do NOT write to localStorage
- Do NOT create any new routes
- Do NOT use `dangerouslySetInnerHTML`
- Do NOT add inline styles when Tailwind classes exist (exception: `max-height` transition for panel expand)
- Do NOT render the panel as a modal or portal — it's inline in the DOM flow

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders idle pill with Music icon and "Enhance with sound"` | unit | Default render, verify icon + text |
| `renders playing pill with waveform and scene name` | unit | Mock `useAudioState` with active sounds + scene name |
| `renders "Custom mix" when no scene name` | unit | Mock active sounds but `currentSceneName: null` |
| `expands suggestion panel on click` | integration | Click pill, verify 3 scene cards appear |
| `shows correct scenes for each context` | unit | Render with each context, verify scene names in cards |
| `calls loadScene on scene card click` | integration | Click card, verify `loadScene` called with correct scene |
| `collapses panel after scene card click` | integration | Click card, wait 300ms, verify panel collapsed |
| `collapses on click-outside` | integration | Click outside, verify panel collapsed |
| `collapses on Escape key` | integration | Press Escape, verify panel collapsed + focus returns to pill |
| `toggles AudioDrawer when playing pill clicked` | integration | Mock drawerOpen=false, click pill, verify OPEN_DRAWER dispatched |
| `closes AudioDrawer when already open` | integration | Mock drawerOpen=true, click pill, verify CLOSE_DRAWER dispatched |
| `renders nothing when visible=false` | unit | Pass `visible={false}`, verify empty render |
| `waveform has aria-hidden` | unit | Verify waveform bars have `aria-hidden="true"` |
| `pill button has aria-expanded` | unit | Verify `aria-expanded` toggles with panel |
| `respects prefers-reduced-motion for waveform` | unit | Mock `matchMedia` for reduced motion, verify no animation classes on bars |
| `"Browse all sounds" links to /music?tab=ambient` | unit | Verify link href |
| `does not fire click-outside from hidden tab` | integration | Render pill with offsetParent=null, verify click-outside is no-op |

**Expected state after completion:**
- [x] `AmbientSoundPill` component renders correctly in all 3 states
- [x] Scene playback works (delegates to `useScenePlayer`)
- [x] Auth modal appears for logged-out scene card clicks (via `useScenePlayer`)
- [x] Click-outside + Escape collapse the panel
- [x] Focus management works (focus card on expand, return to pill on collapse)
- [x] Accessibility attributes correct (aria-expanded, aria-hidden, roles)
- [x] No new localStorage writes, no new routes

---

### Step 3: Integrate Pill into Daily Hub Tabs

**Objective:** Add the `AmbientSoundPill` to the Pray, Journal, and Meditate tab content areas, positioned below the heading and above the main content.

**Files to modify:**
- `frontend/src/components/daily/PrayTabContent.tsx` — Add pill below heading, above chips
- `frontend/src/components/daily/JournalTabContent.tsx` — Add pill below heading, above mode toggle
- `frontend/src/components/daily/MeditateTabContent.tsx` — Add pill below heading, above celebration banner

**Details:**

**PrayTabContent.tsx** — Insert between the heading and the chips/loading area. The pill goes inside the `<div className="relative">` (the BackgroundSquiggle content wrapper), after the loading state and prayer display sections but before the Input Section heading. Actually, looking at the structure more carefully, the heading "What's On Your Heart?" is inside the Input Section starting around line 293-300. The pill should go right after the heading.

Find the heading block:
```tsx
<h2 className="mb-6 text-center ...">What's On Your <span ...>Heart?</span></h2>
```
Insert `<AmbientSoundPill context="pray" />` after the `<h2>`, wrapped in a `<div className="mb-4">`.

**JournalTabContent.tsx** — Insert after the heading "What's On Your Mind?" (line 183), before the Mode Toggle (line 188).

Find the heading block:
```tsx
<h2 className="mb-6 text-center ...">What's On Your <span ...>Mind?</span></h2>
```
Insert `<AmbientSoundPill context="journal" />` after the `<h2>`, wrapped in `<div className="mb-4">`.

Note: Adjust the heading's `mb-6` to `mb-4` and add `mb-4` to the pill wrapper so spacing stays balanced.

**MeditateTabContent.tsx** — Insert after the heading "What's On Your Spirit?" (line 54), before the celebration banner / card grid (line 61).

Find the heading:
```tsx
<h2 className="mb-6 text-center ...">What's On Your <span ...>Spirit?</span></h2>
```
Insert `<AmbientSoundPill context="meditate" />` after the `<h2>`, wrapped in `<div className="mb-4">`.

**Import for all 3 files:**
```tsx
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
```

**Responsive behavior:**
- Mobile (< 640px): Pill is full width within the `max-w-2xl` container
- Tablet/Desktop (>= 640px): Pill is auto-width, left-aligned (or centered to match heading alignment)

**Guardrails (DO NOT):**
- Do NOT move or restructure existing elements beyond inserting the pill
- Do NOT change any existing functionality in the tab components
- Do NOT add auth checks — pill visibility is not auth-gated; playback auth is handled by `useScenePlayer`
- Do NOT change the BackgroundSquiggle wrapper or SQUIGGLE_MASK_STYLE
- Do NOT change the tab mounting strategy (all tabs mounted simultaneously)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayTabContent renders ambient sound pill` | integration | Render PrayTabContent, verify "Enhance with sound" text present |
| `JournalTabContent renders ambient sound pill` | integration | Render JournalTabContent, verify pill present |
| `MeditateTabContent renders ambient sound pill` | integration | Render MeditateTabContent, verify pill present |
| `Pray pill shows correct scene suggestions` | integration | Click pill in Pray tab, verify "The Upper Room", "Ember & Stone", "Still Waters" |
| `Journal pill shows correct scene suggestions` | integration | Click pill in Journal tab, verify "Midnight Rain", "Morning Mist", "Starfield" |
| `Meditate pill shows correct scene suggestions` | integration | Click pill in Meditate tab, verify scene names |

**Expected state after completion:**
- [x] All 3 Daily Hub tabs show the "Enhance with sound" pill below their heading
- [x] Each tab shows contextually correct scene suggestions when expanded
- [x] Pill does not break existing tab functionality or layout
- [x] No visual regression in existing tab content

---

### Step 4: Integrate Pill into Meditation Sub-Pages

**Objective:** Add the `AmbientSoundPill` to all 6 meditation sub-pages, with special visibility logic for BreathingExercise.

**Files to modify:**
- `frontend/src/pages/meditate/BreathingExercise.tsx` — Add pill with `visible={screen !== 'exercise'}`
- `frontend/src/pages/meditate/ScriptureSoaking.tsx` — Add pill (always visible)
- `frontend/src/pages/meditate/GratitudeReflection.tsx` — Add pill (always visible)
- `frontend/src/pages/meditate/ActsPrayerWalk.tsx` — Add pill (always visible)
- `frontend/src/pages/meditate/PsalmReading.tsx` — Add pill (always visible)
- `frontend/src/pages/meditate/ExamenReflection.tsx` — Add pill (always visible)

**Details:**

**BreathingExercise.tsx:**

The component has 3 separate return statements for each screen state. Add the pill to the `prestart` and `complete` returns. The `exercise` return does not get the pill (hidden during active exercise).

In `BreathingExerciseContent`, the `screen` state is already available. Pass `visible={screen !== 'exercise'}` to a single pill instance rendered before the screen-specific returns. Actually, since the component has early returns for `complete` and `exercise`, the cleanest approach is:

- Add `<AmbientSoundPill context="breathing" visible={screen !== 'exercise'} />` inside the `<Layout>` children for the `prestart` return (the final return statement, around line 225)
- Add `<AmbientSoundPill context="breathing" />` inside the `<Layout>` children for the `complete` return (line 154–167), before `<CompletionScreen>`

Actually, a cleaner approach: since the pill should appear at the top of the content area (below hero, above content) for both `prestart` and `complete`, and should hide for `exercise`, we can add the pill to all three returns but with `visible={screen !== 'exercise'}`. The pill will render nothing during `exercise`.

For the `prestart` screen, add inside the Layout content, before the duration selector:
```tsx
<Layout hero={<PageHero ...>}>
  <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
    <AmbientSoundPill context="breathing" visible={screen !== 'exercise'} />
    {/* existing duration selector */}
  </div>
</Layout>
```

For the `complete` screen:
```tsx
<Layout hero={<PageHero ...>}>
  <AmbientSoundPill context="breathing" />
  <CompletionScreen ... />
</Layout>
```

For the `exercise` screen: don't add the pill (it would just return null anyway, but cleaner to omit).

**ScriptureSoaking.tsx:**
- Context: `'soaking'`
- Add to `ScriptureSoakingContent`, inside `<Layout>` children, at the top of the content area
- Always visible regardless of screen state

**GratitudeReflection.tsx, ActsPrayerWalk.tsx, ExamenReflection.tsx:**
- Context: `'other-meditation'`
- Add inside the respective `*Content` component's `<Layout>` children, at the top of the content area
- Always visible

**PsalmReading.tsx:**
- Context: `'other-meditation'`
- Add inside `PsalmReadingContent`'s `<Layout>` children
- Always visible

**Import for all 6 files:**
```tsx
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
```

**Placement pattern for non-BreathingExercise pages:**
```tsx
<Layout hero={<PageHero title="..." subtitle="..." />}>
  <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
    <AmbientSoundPill context="soaking" />  {/* or 'other-meditation' */}
    {/* existing content */}
  </div>
</Layout>
```

If the Layout's children don't have a containing div, wrap the pill + existing content in a fragment or add the pill as the first child.

**Responsive behavior:**
- Same as Daily Hub: full width on mobile, auto-width on tablet/desktop
- Pill stays within the page's `max-w-lg` or equivalent content container

**Guardrails (DO NOT):**
- Do NOT change the auth gate pattern (route-level redirect) on any meditation sub-page
- Do NOT change the Screen state logic in BreathingExercise
- Do NOT add the pill to the `exercise` screen return in BreathingExercise
- Do NOT change existing meditation completion tracking or faith points recording
- Do NOT restructure the Layout/PageHero/CompletionScreen wrappers

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `BreathingExercise shows pill on prestart screen` | integration | Render BreathingExercise (authenticated), verify pill visible |
| `BreathingExercise hides pill during exercise` | integration | Start exercise, verify pill is not visible |
| `BreathingExercise shows pill on complete screen` | integration | Complete exercise, verify pill visible |
| `ScriptureSoaking shows pill with soaking context` | integration | Render, verify pill with correct scene suggestions |
| `GratitudeReflection shows pill with other-meditation context` | integration | Render, verify pill present |
| `All 6 meditation sub-pages render pill without errors` | integration | Render each, verify no console errors |

**Expected state after completion:**
- [x] All 6 meditation sub-pages show the ambient sound pill
- [x] BreathingExercise hides pill during active exercise, shows on prestart and complete
- [x] Correct scene suggestions shown per sub-page context
- [x] No regressions in meditation flow (completion tracking, faith points, etc.)

---

### Step 5: Tests

**Objective:** Write comprehensive tests for the AmbientSoundPill component and integration tests for its placement in Daily Hub tabs and meditation sub-pages.

**Files to create:**
- `frontend/src/components/daily/__tests__/AmbientSoundPill.test.tsx` — Component tests
- `frontend/src/constants/__tests__/ambient-suggestions.test.ts` — Unit tests for mapping

**Details:**

**Test file structure for `AmbientSoundPill.test.tsx`:**

Mock setup:
```typescript
// Mock useScenePlayer
const mockLoadScene = vi.fn()
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: mockLoadScene,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

// Mock useAudioState — default: no audio playing
const mockAudioState = {
  activeSounds: [],
  isPlaying: false,
  currentSceneName: null,
  currentSceneId: null,
  pillVisible: false,
  drawerOpen: false,
  foregroundContent: null,
  sleepTimer: null,
  activeRoutine: null,
  masterVolume: 0.8,
}
const mockDispatch = vi.fn()
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockDispatch,
}))

// Mock useFaithPoints
vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling',
    pointsToNextLevel: 100, todayActivities: {},
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0,
    longestStreak: 0, recordActivity: vi.fn(),
  }),
}))

// Render helper
function renderPill(props: Partial<AmbientSoundPillProps> = {}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <AmbientSoundPill context="pray" {...props} />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
```

**Test categories:**

1. **Idle state rendering** — icon, text, correct context mapping
2. **Playing state rendering** — waveform, scene name, "Custom mix" fallback
3. **Panel expand/collapse** — click to expand, click-outside, Escape key
4. **Scene card interactions** — loadScene called, panel collapses
5. **Audio drawer toggle** — OPEN_DRAWER / CLOSE_DRAWER dispatched
6. **Visibility prop** — `visible={false}` renders nothing
7. **Accessibility** — aria-expanded, aria-hidden on waveform, keyboard navigation, focus management
8. **Reduced motion** — no animation classes when preferred

**Test file for `ambient-suggestions.test.ts`:**
- All 6 contexts return exactly 3 scenes
- Each scene is a valid `ScenePreset` object
- Correct scene names per context match spec table
- Function handles edge cases gracefully

**Guardrails (DO NOT):**
- Do NOT skip provider wrapping — component uses audio contexts
- Do NOT test `useScenePlayer` internals (auth gating) — that hook has its own tests
- Do NOT mock child components that are simple (like Lucide icons) — only mock heavy hooks/contexts
- Do NOT import from `@testing-library/react` for user events — use `@testing-library/user-event`

**Expected state after completion:**
- [x] All AmbientSoundPill states tested (idle, playing, expanded)
- [x] All interactions tested (click, click-outside, Escape, scene card, drawer toggle)
- [x] Accessibility attributes verified
- [x] Constants mapping verified
- [x] All tests pass with `pnpm test`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Scene suggestion mapping constants |
| 2 | 1 | AmbientSoundPill component |
| 3 | 2 | Integrate pill into Daily Hub tabs |
| 4 | 2 | Integrate pill into meditation sub-pages |
| 5 | 1, 2, 3, 4 | Tests |

Steps 3 and 4 are independent of each other (both depend on Step 2).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Scene Suggestion Mapping Constants | [COMPLETE] | 2026-03-19 | Created `constants/ambient-suggestions.ts` with `AmbientContext` type and `getSuggestedScenes()` function. All 6 contexts map to 3 valid scene IDs. |
| 2 | AmbientSoundPill Component | [COMPLETE] | 2026-03-19 | Created `components/daily/AmbientSoundPill.tsx` with 3 states (idle, playing, expanded), waveform reuse, click-outside, Escape, focus management, a11y, reduced-motion, light/dark variants. |
| 3 | Integrate into Daily Hub Tabs | [COMPLETE] | 2026-03-19 | Added `AmbientSoundPill` to PrayTabContent (context=pray), JournalTabContent (context=journal), MeditateTabContent (context=meditate). Adjusted heading mb-6→mb-4 for spacing. Visual verification passed at 375px and 1440px. |
| 4 | Integrate into Meditation Sub-Pages | [COMPLETE] | 2026-03-19 | Added pill to all 6 sub-pages. BreathingExercise: pill on prestart + complete screens (not exercise). ScriptureSoaking: context=soaking. Gratitude/ACTS/Psalm/Examen: context=other-meditation. Build passes. |
| 5 | Tests | [COMPLETE] | 2026-03-19 | Created `constants/__tests__/ambient-suggestions.test.ts` (19 tests) and `components/daily/__tests__/AmbientSoundPill.test.tsx` (22 tests). Updated PrayTabContent.test.tsx and JournalTabContent.test.tsx with AudioProvider/useScenePlayer mocks for AmbientSoundPill dependency. All 41 new tests + 3 existing tests pass. |
