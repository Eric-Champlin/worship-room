# Implementation Plan: Music User Features — Persistence, Favorites, Saved Mixes, Sharing, Analytics

**Spec:** `_specs/music-user-features.md`
**Date:** 2026-03-09
**Branch:** `claude/feature/music-user-features`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Project Structure

- **Pages:** `frontend/src/pages/MusicPage.tsx` — 3-tab music hub (playlists/ambient/sleep)
- **Audio Components:** `frontend/src/components/audio/` — AudioProvider, AudioDrawer, AudioPill, DrawerTabs, MixerTabContent, TimerTabContent, SceneCard, SoundCard, AmbientBrowser, SleepBrowse
- **Music Components:** `frontend/src/components/music/` — PersonalizationSection, WorshipPlaylistsTab, LofiCrossReference, MusicHint, RecentlyAddedSection
- **Hooks:** `frontend/src/hooks/` — useSoundToggle, useScenePlayer, useForegroundPlayer, useSleepTimer, useAmbientSearch, useMusicHints
- **Types:** `frontend/src/types/music.ts` — Sound, ScenePreset, ScriptureReading, BedtimeStory; `frontend/src/types/audio.ts` — AudioState, AudioAction, ActiveSound, ForegroundContent
- **Data:** `frontend/src/data/scenes.ts` (SCENE_PRESETS, SCENE_BY_ID), `frontend/src/data/sound-catalog.ts` (SOUND_CATALOG, SOUND_BY_ID)
- **Constants:** `frontend/src/constants/audio.ts` — AUDIO_CONFIG

### Key Patterns

- **State management:** AudioProvider uses 4 React contexts + useReducer (`audioReducer.ts`). Dispatch wraps side effects via `enhancedDispatch` in AudioProvider.
- **Auth gating:** `useAuth()` hook returns `{ user, isLoggedIn }` (always false until Phase 3). `useAuthModal()` returns `{ openAuthModal }` from `AuthModalProvider` context. Pattern: check `isLoggedIn`, if false call `openAuthModal('Sign in to ...')`.
- **Toast:** `useToast()` hook from `ToastProvider` context. Call `showToast('message')`.
- **Scene loading:** `useScenePlayer()` hook handles crossfade, undo window. Staggered sound additions (200ms apart).
- **Test patterns:** Vitest + RTL. Mock `AudioEngineService`, `useToast`. Wrap in `MemoryRouter` + `AudioProvider`. Use `userEvent.setup()` for interactions. Tests in `__tests__/` subdirectories.
- **CSS patterns:** Tailwind utility classes, `cn()` for conditional classes. Dark drawer UI uses `bg-[rgba(15,10,30,0.95)]` with white/50 text. Cards use `rounded-xl border border-gray-200 bg-white p-5 shadow-sm`.
- **Provider hierarchy:** App wraps: `ToastProvider` > `AuthModalProvider` > `AudioProvider` > pages. MusicPage is wrapped by all three.
- **Drawer tabs:** `DrawerTabs.tsx` has 3 tabs: Mixer, Timer, Saved. Saved tab is currently a placeholder (`<p className="text-sm text-white/50">Your saved mixes and routines</p>`).

### Existing Files to Modify

| File | Modification |
|------|-------------|
| `frontend/src/types/music.ts` | Add `Favorite`, `SavedMix`, `ListeningSession`, `SessionState` types |
| `frontend/src/components/audio/SceneCard.tsx` | Add heart favorite icon |
| `frontend/src/components/audio/FeaturedSceneCard.tsx` | Add heart favorite icon |
| `frontend/src/components/audio/DrawerTabs.tsx` | Replace Saved tab placeholder with SavedTabContent |
| `frontend/src/components/audio/DrawerNowPlaying.tsx` | Add save icon for custom mixes |
| `frontend/src/components/music/PersonalizationSection.tsx` | Wire to real StorageService data |
| `frontend/src/pages/MusicPage.tsx` | Add shared mix URL parsing, resume prompt, time-of-day section |
| `frontend/src/components/audio/AudioProvider.tsx` | Add listening session logging, session state auto-save |

### Auth Gating Pattern (from existing code)

```typescript
const { isLoggedIn } = useAuth()
const authModal = useAuthModal()

function handleFavorite() {
  if (!isLoggedIn) {
    authModal?.openAuthModal('Sign in to save favorites')
    return
  }
  // ... actual logic
}
```

### Database

No database tables for this spec — all persistence is localStorage. The StorageService abstraction will swap to API calls in Phase 3+.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap heart to favorite | Auth modal: "Sign in to save favorites" | Step 4 | useAuth + useAuthModal |
| Save a custom mix | Auth modal: "Sign in to save your mix" | Step 5 | useAuth + useAuthModal |
| Edit/delete/duplicate a saved mix | Only available when logged in (mixes only exist if saved) | Step 6 | useAuth (section hidden for logged-out) |
| Save a shared mix to favorites | Auth modal: "Sign in to save this mix" | Step 8 | useAuth + useAuthModal |
| Listening analytics logged | No tracking for logged-out users | Step 9 | useAuth check before logging |
| Session state saved | No session state for logged-out users | Step 10 | useAuth check before saving |
| Resume prompt shown | Not shown for logged-out users | Step 10 | useAuth check before rendering |
| Personalized recommendations | Generic for logged-out, personalized for logged-in with history | Step 11 | useAuth check for personalization branch |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Heart icon (favorited) | color | `#E74C3C` (danger) | Spec + design-system.md |
| Heart icon (unfavorited) | color | `rgba(255,255,255,0.5)` on dark bg | Spec |
| Heart icon (logged-out) | color | `rgba(255,255,255,0.3)` on dark bg | Spec (outlined, non-interactive) |
| Heart bounce animation | transform | `scale(1.2)` for 100ms | Spec |
| Card (meditation-style) | classes | `rounded-xl border border-gray-200 bg-white p-5 shadow-sm` | design-system.md |
| Primary CTA button | classes | `rounded-lg bg-primary py-3 px-8 font-semibold text-white` | design-system.md |
| Danger button (delete) | classes | `rounded-lg bg-danger py-2 px-6 font-semibold text-white` | design-system.md + danger color |
| Resume banner | background | `bg-primary/10` with `border border-primary/20` | Spec (subtle violet) |
| Time-of-day heading | font | Inter bold, `text-lg sm:text-xl font-bold text-text-dark` | design-system.md Section H2 pattern scaled down |
| Drawer save input | classes | `rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white` | Matches drawer dark theme |
| Delete confirmation dialog | backdrop | `fixed inset-0 z-50 bg-black/50` | Same as AuthModal |
| Delete confirmation dialog | panel | `rounded-xl bg-white p-6 shadow-xl max-w-sm mx-4` | Same as AuthModal pattern |
| Type badge on favorites | classes | `rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary` | Chip pattern adapted |
| Shared mix hero | background | Inner page hero gradient: `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #F5F5F5 100%)` | design-system.md |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] On branch `claude/feature/music-user-features` with clean working directory
- [ ] `pnpm test` passes (all existing tests green)
- [ ] `pnpm dev` starts successfully
- [ ] MusicPage currently renders with all 3 tabs functional
- [ ] DrawerTabs "Saved" tab is still a placeholder
- [ ] PersonalizationSection currently receives no data (renders nothing)
- [ ] All auth-gated actions from the spec are accounted for in the plan (8 gated actions)
- [ ] Design system values are verified from `_plans/recon/design-system.md`

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UUID generation for saved mixes | Use `crypto.randomUUID()` | Available in all modern browsers, no dependency needed |
| localStorage quota exceeded | Catch `DOMException` (QuotaExceededError), revert optimistic UI, show toast | Spec requires this exact behavior |
| Base64url encoding for shared links | Use `btoa()` + replace `+/=` with `-_` (URL-safe) | No dependency needed; standard Base64url encoding |
| Max mix name length | 50 characters with `maxLength` attribute | Spec requirement; no crisis detection needed |
| Listening history cap | Prune oldest entries when adding beyond 100 | Spec requirement; FIFO queue behavior |
| Session state expiry | 24 hours from `savedAt` timestamp | Spec requirement; auto-clear on check |
| `beforeunload` reliability | Best-effort save; may not complete in all browsers | Known limitation; periodic auto-save (60s) is the primary mechanism |
| Heart icon on SceneCard (dark bg) | White outline unfavorited, red filled favorited | Matches dark bg context; danger red for filled heart per spec |
| Three-dot menu vs long-press | Three-dot menu only (no long-press) | Simpler implementation; long-press has poor discoverability and conflicts with mobile text selection |
| Shared mix hero dismissal | X button sets a React state flag; hero hides, browse view shows | No localStorage persistence for dismissal — it's per-visit |
| Night mode default tab override | During 10pm-6am, default tab becomes `sleep` instead of `ambient` | Spec: "Default tab could switch to Sleep & Rest during this bracket" |

---

## Implementation Steps

### Step 1: Types & StorageService Interface

**Objective:** Define all TypeScript types for persistence and create the StorageService abstraction with localStorage implementation.

**Files to create:**
- `frontend/src/types/storage.ts` — All persistence-related types
- `frontend/src/services/storage-service.ts` — StorageService interface + localStorage implementation

**Files to modify:**
- (none)

**Details:**

`types/storage.ts`:
```typescript
export type FavoriteType = 'scene' | 'sleep_session' | 'custom_mix'

export interface Favorite {
  type: FavoriteType
  targetId: string
  createdAt: string // ISO date
}

export interface SavedMix {
  id: string // crypto.randomUUID()
  name: string
  sounds: { soundId: string; volume: number }[]
  createdAt: string
  updatedAt: string
}

export interface ListeningSession {
  id: string
  contentType: 'ambient' | 'scene' | 'scripture' | 'story' | 'routine'
  contentId: string
  startedAt: string
  durationSeconds: number
  completed: boolean
}

export interface SessionState {
  activeSounds: { soundId: string; volume: number }[]
  foregroundContentId: string | null
  foregroundPosition: number
  masterVolume: number
  savedAt: string
}

export interface SharedMixData {
  sounds: { id: string; v: number }[]
}
```

`services/storage-service.ts`:
- Export a `StorageService` interface with all methods from the spec
- Export a `LocalStorageService` class implementing the interface
- Export a singleton `storageService` instance
- localStorage keys: `wr_favorites`, `wr_saved_mixes`, `wr_listening_history`, `wr_session_state`
- All methods use `try/catch` around `localStorage.setItem()` to handle QuotaExceededError
- `logListeningSession()` caps at 100 entries (prune oldest)
- `createShareableLink()` encodes `SharedMixData` as JSON → Base64url
- `decodeSharedMix()` decodes Base64url → JSON → `SharedMixData` (returns null on failure)

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` anywhere
- DO NOT store any PII in localStorage
- DO NOT create React components in this step — pure service layer only

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `storage-service.test.ts` | unit | `getFavorites()` returns empty array initially |
| | unit | `addFavorite()` persists to localStorage, `isFavorite()` returns true |
| | unit | `removeFavorite()` removes from localStorage |
| | unit | `saveMix()` creates with UUID, persists, returns SavedMix |
| | unit | `updateMixName()` updates name and updatedAt |
| | unit | `deleteMix()` removes from localStorage |
| | unit | `duplicateMix()` creates copy with " Copy" suffix |
| | unit | `logListeningSession()` caps at 100 entries |
| | unit | `saveSessionState()` / `getSessionState()` / `clearSessionState()` round-trip |
| | unit | `createShareableLink()` produces valid Base64url |
| | unit | `decodeSharedMix()` decodes valid data, returns null for invalid |
| | unit | Handles QuotaExceededError gracefully (throws typed error) |

**Expected state after completion:**
- [ ] All types exported from `types/storage.ts`
- [ ] `StorageService` interface defined with all methods
- [ ] `LocalStorageService` implementation passes all unit tests
- [ ] `storageService` singleton exported for app-wide use
- [ ] All localStorage keys prefixed with `wr_`

---

### Step 2: React Hooks for StorageService

**Objective:** Create React hooks that wrap the StorageService, providing reactive state and auth-gated access.

**Files to create:**
- `frontend/src/hooks/useFavorites.ts` — Favorites management hook
- `frontend/src/hooks/useSavedMixes.ts` — Saved mixes management hook
- `frontend/src/hooks/useListeningHistory.ts` — Listening history hook
- `frontend/src/hooks/useSessionPersistence.ts` — Session state persistence hook

**Details:**

`useFavorites()`:
- Returns `{ favorites, isFavorite(type, id), toggleFavorite(type, id), isLoading }`
- Reads from `storageService.getFavorites()` on mount
- `toggleFavorite()`: checks `isLoggedIn` → opens auth modal if not → optimistic UI toggle → catch localStorage error → revert + toast
- Uses `useState` for favorites array; updates sync to localStorage

`useSavedMixes()`:
- Returns `{ mixes, saveMix(name, sounds), updateName(id, name), deleteMix(id), duplicateMix(id) }`
- All mutation methods check `isLoggedIn` first
- `saveMix()` also needs to know the current scene name for suggested naming

`useListeningHistory()`:
- Returns `{ logSession(session), getLastSession(), getRecentSessions(limit) }`
- `logSession()` only logs if `isLoggedIn`

`useSessionPersistence()`:
- Returns `{ sessionState, saveSession(state), clearSession(), hasValidSession }`
- `hasValidSession`: true if session exists and is < 24 hours old
- Auto-clears expired sessions on mount

**Guardrails (DO NOT):**
- DO NOT import `useAuth` or `useAuthModal` inside the StorageService — only in hooks
- DO NOT write to localStorage for logged-out users (check in every mutation hook)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `useFavorites.test.ts` | unit | Returns empty favorites initially |
| | unit | `toggleFavorite` opens auth modal when logged out |
| | unit | `toggleFavorite` adds favorite when logged in |
| | unit | Reverts on localStorage error with toast |
| `useSavedMixes.test.ts` | unit | Returns empty mixes initially |
| | unit | `saveMix` opens auth modal when logged out |
| | unit | `saveMix` persists and returns new mix when logged in |
| | unit | `deleteMix` removes from state and localStorage |
| | unit | `duplicateMix` creates " Copy" suffixed duplicate |
| `useSessionPersistence.test.ts` | unit | `hasValidSession` false when no session |
| | unit | `hasValidSession` false when session > 24h old |
| | unit | Auto-clears expired session on mount |

**Expected state after completion:**
- [ ] All 4 hooks exported and testable
- [ ] Auth gating works in each mutation method
- [ ] Optimistic UI with revert on error in useFavorites
- [ ] All tests pass

---

### Step 3: FavoriteButton Component

**Objective:** Create a reusable heart button component used on scene cards, sleep cards, and saved mix cards.

**Files to create:**
- `frontend/src/components/music/FavoriteButton.tsx` — Reusable heart button
- `frontend/src/components/music/__tests__/FavoriteButton.test.tsx` — Tests

**Details:**

```typescript
interface FavoriteButtonProps {
  type: FavoriteType
  targetId: string
  targetName: string
  className?: string
}
```

- Uses `useFavorites()` hook to get `isFavorite` and `toggleFavorite`
- Uses `useAuth()` for `isLoggedIn`
- **Logged-out**: renders outlined heart at `text-white/30`, `cursor-default`, `aria-disabled="true"`, no onClick
- **Logged-in unfavorited**: outlined heart at `text-white/50`, `aria-pressed="false"`, `aria-label="Add {name} to favorites"`
- **Logged-in favorited**: filled heart at `text-danger` (#E74C3C), `aria-pressed="true"`, `aria-label="Remove {name} from favorites"`
- Heart icon: Lucide `Heart` (outline) / `Heart` with `fill="currentColor"` (filled)
- Bounce animation on toggle: `transform scale-125` for 100ms via CSS transition
- `role="button"` explicit
- `stopPropagation()` on click to prevent triggering parent card's onClick
- Size: `h-5 w-5` icon inside `h-8 w-8` button with `rounded-full bg-black/20` backdrop

**Guardrails (DO NOT):**
- DO NOT render the heart as an `<a>` tag — must be `<button>`
- DO NOT allow the heart click to bubble to the parent card's play action

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| FavoriteButton.test.tsx | unit | Renders outlined heart when not favorited |
| | unit | Renders filled heart when favorited |
| | unit | Shows `aria-pressed="true"` when favorited |
| | unit | Shows `aria-pressed="false"` when not favorited |
| | unit | Has correct `aria-label` with item name |
| | unit | Calls toggleFavorite on click (logged-in) |
| | unit | Opens auth modal on click (logged-out) |
| | unit | Renders `aria-disabled="true"` when logged out |
| | unit | Click does not propagate to parent |

**Expected state after completion:**
- [ ] FavoriteButton renders correctly in all 3 states
- [ ] ARIA attributes are correct
- [ ] Auth gating works
- [ ] Event propagation stopped

---

### Step 4: Add Heart Icons to Scene & Sleep Cards

**Objective:** Integrate FavoriteButton into existing scene preset cards and sleep session cards.

**Files to modify:**
- `frontend/src/components/audio/SceneCard.tsx` — Add FavoriteButton overlay
- `frontend/src/components/audio/FeaturedSceneCard.tsx` — Add FavoriteButton overlay
- `frontend/src/components/audio/ScriptureSessionCard.tsx` — Add FavoriteButton (type: `sleep_session`)
- `frontend/src/components/audio/BedtimeStoryCard.tsx` — Add FavoriteButton (type: `sleep_session`)

**Details:**

**SceneCard.tsx** (currently a `<button>` element):
- Wrap the existing content in a relative container
- Add `<FavoriteButton type="scene" targetId={scene.id} targetName={scene.name} />` positioned `absolute top-2 right-2`
- The heart must be above the gradient overlay (`z-10`)
- The existing `onClick={() => onPlay(scene)}` stays on the outer button — FavoriteButton's `stopPropagation` prevents double-fire

**FeaturedSceneCard.tsx** (same pattern):
- Add FavoriteButton `absolute top-3 right-3` (larger card, more padding)

**ScriptureSessionCard.tsx** / **BedtimeStoryCard.tsx**:
- Add FavoriteButton with `type="sleep_session"` and `targetId={reading.id}` / `targetId={story.id}`
- Position: `absolute top-2 right-2`

**Auth gating:**
- Logged-out: Heart visible but non-interactive (handled by FavoriteButton internally)
- Logged-in: Heart toggles favorite

**Responsive behavior:**
- Heart icon same size at all breakpoints (`h-8 w-8` touch target meets 44px via padding)

**Guardrails (DO NOT):**
- DO NOT change the existing play/onPlay behavior of any card
- DO NOT remove existing ARIA attributes
- DO NOT change the card layout or sizing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SceneCard.test.tsx | integration | Heart icon renders on scene card |
| | integration | Heart click does not trigger onPlay |
| ScriptureSessionCard.test.tsx | integration | Heart icon renders with type "sleep_session" |

**Expected state after completion:**
- [ ] Heart icon visible on all scene cards (SceneCard + FeaturedSceneCard)
- [ ] Heart icon visible on all sleep cards (ScriptureSessionCard + BedtimeStoryCard)
- [ ] Hearts are non-interactive for logged-out users
- [ ] Hearts toggle favorites for logged-in users
- [ ] Existing card play behavior unchanged
- [ ] All existing tests still pass

---

### Step 5: Saved Mixes — Save Flow (Drawer Integration)

**Objective:** Add the save icon to DrawerNowPlaying and build the inline save input in the drawer.

**Files to create:**
- `frontend/src/components/audio/SaveMixButton.tsx` — Save icon + inline input
- `frontend/src/components/audio/__tests__/SaveMixButton.test.tsx`

**Files to modify:**
- `frontend/src/components/audio/DrawerNowPlaying.tsx` — Add SaveMixButton next to scene name

**Details:**

**SaveMixButton.tsx:**
- Props: none (reads from AudioState context)
- Uses `useAudioState()` to determine: `activeSounds`, `currentSceneName`
- Uses `useSavedMixes()` for `saveMix()`
- Uses `useAuth()` + `useAuthModal()` for auth gating

**Visibility logic (when to show the save icon):**
- Show when: `activeSounds.length > 0` AND (no scene loaded OR mix is modified from scene)
- "Modified from scene" detection: compare `activeSounds` against the scene's `sounds` array — if different IDs or different volumes, it's modified
- DO NOT show when: an unmodified scene preset is playing (user should favorite the scene instead)

**Save flow:**
1. Tap save icon → auth check → if logged out, auth modal "Sign in to save your mix"
2. If logged in: toggle inline input visible (expand below the save icon)
3. Suggested name: if `currentSceneName` → `"[Scene Name] Custom"`, else → sound names joined with " + " (from SOUND_BY_ID lookups)
4. Text input: `maxLength={50}`, `aria-label="Name your mix"`, auto-focused
5. "Save" button + "Cancel" text button
6. On save: call `saveMix(name, activeSounds)` → toast "Mix saved!" → collapse input

**Integration into DrawerNowPlaying.tsx:**
- Add `<SaveMixButton />` below the artwork/play section, between the title area and the volume slider
- Position: inline with the scene name / "Custom Mix" label

**Auth gating:**
- Logged-out: save icon visible but triggers auth modal
- Logged-in: full save flow

**Guardrails (DO NOT):**
- DO NOT use a modal for the save input — it's an inline expansion in the drawer
- DO NOT allow HTML in the mix name — plain text via `<input type="text">`
- DO NOT allow names longer than 50 characters

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SaveMixButton.test.tsx | unit | Not visible when no sounds active |
| | unit | Not visible when unmodified scene is playing |
| | unit | Visible when custom mix is playing |
| | unit | Opens auth modal when logged out |
| | unit | Shows inline input when clicked (logged in) |
| | unit | Pre-populates name from scene name |
| | unit | Pre-populates name from sound names when no scene |
| | unit | Limits name to 50 characters |
| | unit | Calls saveMix and shows toast on save |

**Expected state after completion:**
- [ ] Save icon appears in drawer when mix is custom/modified
- [ ] Save icon hidden for unmodified scene presets
- [ ] Auth modal for logged-out users
- [ ] Inline input with suggested name, 50-char max
- [ ] Toast on successful save

---

### Step 6: Saved Mixes — Management (SavedTabContent + MixCard)

**Objective:** Replace the Saved tab placeholder with a real saved mixes list, including load/edit/delete/duplicate/share actions.

**Files to create:**
- `frontend/src/components/audio/SavedTabContent.tsx` — Saved tab body
- `frontend/src/components/audio/SavedMixRow.tsx` — Individual saved mix row in drawer
- `frontend/src/components/music/SavedMixCard.tsx` — Saved mix card for ambient tab / personalization
- `frontend/src/components/music/MixActionsMenu.tsx` — Three-dot dropdown menu
- `frontend/src/components/music/DeleteMixDialog.tsx` — Delete confirmation dialog
- `frontend/src/components/music/__tests__/SavedTabContent.test.tsx`
- `frontend/src/components/music/__tests__/DeleteMixDialog.test.tsx`

**Files to modify:**
- `frontend/src/components/audio/DrawerTabs.tsx` — Import and render `SavedTabContent` instead of placeholder

**Details:**

**SavedTabContent.tsx:**
- Uses `useSavedMixes()` to get `mixes`
- Empty state: centered text "No saved mixes yet" + subtext "Create a custom mix and tap Save to keep it"
- Filled state: scrollable list of `SavedMixRow` items

**SavedMixRow.tsx:**
- Layout: mix name (left), sound count + icons (small Lucide icons from `getSoundIcon`), three-dot menu (right)
- "Load" action: calls `useScenePlayer`-like loading — dispatch STOP_ALL on current, then load each sound with stagger. Use the `storageService` to get the sound list, then dispatch ADD_SOUND for each.
- Three-dot menu opens `MixActionsMenu`

**MixActionsMenu.tsx:**
- Dropdown with: Load, Edit Name, Duplicate, Share, Delete
- Uses Escape to close, click-outside to close
- "Edit Name" → toggles inline text input on the row
- "Duplicate" → calls `duplicateMix(id)` → toast "Mix duplicated!"
- "Share" → calls share logic (Step 8)
- "Delete" → opens `DeleteMixDialog`

**DeleteMixDialog.tsx:**
- `role="alertdialog"`, `aria-modal="true"`
- Focus trapped via `useFocusTrap()`
- Text: "Delete {mixName}?"
- Buttons: "Cancel" (outlined) + "Delete" (red `bg-danger text-white`)
- On delete: calls `deleteMix(id)` → toast "Mix deleted" → close dialog

**DrawerTabs.tsx modification:**
- Replace the placeholder `<div>` in the Saved tab with `<SavedTabContent />`

**SavedMixCard.tsx** (for ambient tab + personalization sections):
- Used outside the drawer, on white/neutral backgrounds
- Card style: `rounded-xl border border-gray-200 bg-white p-4 shadow-sm`
- Shows: mix name, sound icon thumbnails, FavoriteButton (type: `custom_mix`), three-dot menu
- Play button overlay on hover
- Responsive: horizontal scroll on mobile, 2-col grid on tablet, 3-col grid on desktop

**Auth gating:**
- Entire Saved tab content hidden for logged-out users (already ensured by no saved mixes existing)
- "Your Saved Mixes" section on ambient tab: hidden for logged-out users

**Responsive behavior:**
- Drawer: full-width list at all breakpoints
- Ambient tab section: horizontal scroll on mobile, `grid grid-cols-2` on tablet, `grid grid-cols-3` on desktop

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for mix names
- DO NOT auto-delete without confirmation dialog
- DO NOT use native `window.confirm` — use the custom DeleteMixDialog

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SavedTabContent.test.tsx | unit | Shows empty state when no mixes |
| | unit | Renders list of saved mixes |
| | integration | Load action dispatches sounds |
| DeleteMixDialog.test.tsx | unit | Shows mix name in confirmation text |
| | unit | Has `role="alertdialog"` |
| | unit | Focus is trapped |
| | unit | "Delete" calls deleteMix |
| | unit | "Cancel" closes without deleting |

**Expected state after completion:**
- [ ] Saved tab in drawer shows real saved mixes
- [ ] Load, Edit Name, Duplicate, Delete, Share all work
- [ ] Delete has confirmation dialog with focus trap
- [ ] SavedMixCard works on ambient tab
- [ ] All existing tests still pass

---

### Step 7: "Your Saved Mixes" Section on Ambient Tab

**Objective:** Add a "Your Saved Mixes" section above scene presets on the ambient tab for logged-in users.

**Files to modify:**
- `frontend/src/components/audio/AmbientBrowser.tsx` — Add saved mixes section above existing content

**Details:**

- Import `useSavedMixes()` and `useAuth()`
- If `isLoggedIn && mixes.length > 0`: render "Your Saved Mixes" section before the existing featured scenes
- Section heading: `<h2 className="mb-3 text-sm font-semibold text-white">Your Saved Mixes</h2>`
- Render `SavedMixCard` components in a responsive grid
- On mobile: horizontal scroll (same pattern as PersonalizationSection)
- On tablet: `grid grid-cols-2 gap-3`
- On desktop: `grid grid-cols-3 gap-4`
- If logged out or no mixes: section not rendered (no empty state)

**Guardrails (DO NOT):**
- DO NOT change the existing scene browse layout
- DO NOT show this section for logged-out users

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AmbientBrowser updated tests | integration | "Your Saved Mixes" section renders for logged-in user with mixes |
| | integration | Section hidden for logged-out users |
| | integration | Section hidden when no mixes exist |

**Expected state after completion:**
- [ ] "Your Saved Mixes" appears above scene presets for logged-in users with mixes
- [ ] Section hidden for logged-out users
- [ ] Responsive grid layout works at all breakpoints

---

### Step 8: Shareable Mix Links

**Objective:** Implement share action and "Play This Mix" landing experience for shared mix URLs.

**Files to create:**
- `frontend/src/components/music/SharedMixHero.tsx` — Hero banner for shared mix URLs
- `frontend/src/components/music/__tests__/SharedMixHero.test.tsx`
- `frontend/src/hooks/useShareMix.ts` — Share action logic

**Files to modify:**
- `frontend/src/pages/MusicPage.tsx` — Parse `mix` query param, render SharedMixHero
- `frontend/src/components/music/MixActionsMenu.tsx` — Wire share action

**Details:**

**useShareMix():**
- `shareMix(sounds: { soundId: string; volume: number }[])`:
  1. Encode sounds to SharedMixData JSON → Base64url
  2. Build URL: `${window.location.origin}/music?tab=ambient&mix=${encoded}`
  3. Try `navigator.share({ url, title })` if available (mobile)
  4. Fallback: `navigator.clipboard.writeText(url)` → toast "Mix link copied!"
  5. If clipboard fails: select-all in a hidden input fallback

**MusicPage.tsx modifications:**
- On mount: check `searchParams.get('mix')` for shared mix data
- If present: decode Base64url → validate `SharedMixData` (check all sound IDs exist in SOUND_BY_ID)
- If valid: set `sharedMixData` state, force `activeTab` to `'ambient'`
- Render `<SharedMixHero>` above the ambient tab content when `sharedMixData` is set

**SharedMixHero.tsx:**
- Props: `{ mixData: SharedMixData; onPlay: () => void; onDismiss: () => void }`
- Layout: purple gradient background (inner page hero pattern from design-system.md)
- Content:
  - Mix name: auto-generated from sound names (e.g., "Rain + Fireplace + Piano") — lookup names via SOUND_BY_ID
  - Sound list: small icons from `getSoundIcon` + name + volume bar (thin div with width = volume %)
  - `aria-label={`Shared ambient mix with ${sounds.length} sounds`}`
- Large "Play This Mix" button: `rounded-lg bg-primary py-4 px-8 font-semibold text-white text-lg` — centered
- X dismiss button: `absolute top-4 right-4`
- FavoriteButton (type: `custom_mix`) with a generated ID from the encoded data hash

**"Play This Mix" flow:**
1. User clicks "Play This Mix" (user gesture for AudioContext)
2. Call dispatch STOP_ALL (clear any existing audio)
3. For each sound in `mixData.sounds`: dispatch ADD_SOUND with soundId and volume (staggered 200ms)
4. Set `sharedMixData` to null (hide hero)
5. Remove `mix` param from URL: `setSearchParams({ tab: 'ambient' }, { replace: true })`

**Auth gating:**
- No auth required to play — anyone can play a shared mix
- FavoriteButton on the hero: auth modal "Sign in to save this mix" for logged-out users

**Responsive behavior:**
- Mobile: full-width hero, sounds listed vertically, play button full-width
- Tablet: centered with padding, sound list in 2 columns
- Desktop: centered max-width container, sound list in a horizontal row

**Guardrails (DO NOT):**
- DO NOT auto-play on page load — require user click for AudioContext policy
- DO NOT persist the shared mix to localStorage — only play it
- DO NOT trust the mix data blindly — validate all sound IDs exist in SOUND_BY_ID

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SharedMixHero.test.tsx | unit | Renders mix name from sound names |
| | unit | Renders sound list with icons |
| | unit | Has correct aria-label with sound count |
| | unit | "Play This Mix" button calls onPlay |
| | unit | X button calls onDismiss |
| | unit | FavoriteButton shows auth modal for logged-out |
| useShareMix.test.ts | unit | `shareMix` encodes sounds correctly |
| | unit | `shareMix` calls navigator.clipboard.writeText |
| MusicPage.test.tsx | integration | Parses `mix` query param and shows SharedMixHero |
| | integration | Invalid mix data is silently ignored |

**Expected state after completion:**
- [ ] Share action generates URL and copies to clipboard
- [ ] Mobile share uses `navigator.share()` when available
- [ ] Shared mix URL loads "Play This Mix" hero
- [ ] Hero shows sound list, play button, dismiss button
- [ ] Play button starts all sounds (no auth required)
- [ ] Invalid mix data is silently ignored (no crash)
- [ ] FavoriteButton on hero auth-gates for logged-out

---

### Step 9: Listening Analytics Integration

**Objective:** Auto-log listening sessions from the AudioProvider when audio starts and ends.

**Files to create:**
- `frontend/src/components/audio/ListeningLogger.tsx` — Inner component of AudioProvider that logs sessions

**Files to modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — Add ListeningLogger as child component

**Details:**

**ListeningLogger.tsx:**
- A non-rendering component (returns null) that observes AudioState changes
- Uses `useAuth()` to check `isLoggedIn` — if false, does nothing
- Uses `useListeningHistory()` for `logSession()`
- Tracks session via `useRef`:
  - When `isPlaying` becomes true and no active session: create a new ListeningSession with `startedAt: new Date().toISOString()`, `contentType` and `contentId` derived from state
  - Content type detection: if `foregroundContent` exists → use its type. Else if `currentSceneName` → 'scene'. Else → 'ambient'
  - Content ID: `foregroundContent.contentId` or `currentSceneName` or 'custom-mix'
  - When `isPlaying` becomes false (or STOP_ALL): calculate `durationSeconds` from start time, set `completed` based on whether content naturally ended
  - Log the session via `storageService.logListeningSession()`

**Integration into AudioProvider.tsx:**
- Add `<ListeningLogger />` inside the provider, after `SleepTimerBridge`
- This keeps the logging logic isolated from the core provider

**Guardrails (DO NOT):**
- DO NOT log sessions for logged-out users
- DO NOT log sessions shorter than 5 seconds (avoid noise from accidental taps)
- DO NOT block or await the localStorage write — fire and forget

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ListeningLogger.test.tsx | unit | Does not log when user is logged out |
| | unit | Creates session when playback starts |
| | unit | Updates session duration when playback stops |
| | unit | Does not log sessions shorter than 5 seconds |

**Expected state after completion:**
- [ ] Listening sessions auto-logged for logged-in users
- [ ] Sessions not logged for logged-out users
- [ ] Duration calculated correctly
- [ ] History capped at 100 entries

---

### Step 10: Session Persistence + Resume Prompt

**Objective:** Auto-save session state and show a "Welcome back! Resume?" banner on return.

**Files to create:**
- `frontend/src/components/audio/SessionAutoSave.tsx` — Inner component for periodic auto-save
- `frontend/src/components/music/ResumePrompt.tsx` — Banner component
- `frontend/src/components/music/__tests__/ResumePrompt.test.tsx`

**Files to modify:**
- `frontend/src/components/audio/AudioProvider.tsx` — Add SessionAutoSave component
- `frontend/src/pages/MusicPage.tsx` — Add ResumePrompt above personalization

**Details:**

**SessionAutoSave.tsx:**
- Non-rendering component inside AudioProvider
- Uses `useAuth()` — if not logged in, does nothing
- Uses `useSessionPersistence()` for `saveSession()`
- Uses `useAudioState()` to read current state
- **Periodic save:** `setInterval` every 60 seconds when `isPlaying` is true
- **beforeunload save:** `addEventListener('beforeunload', ...)` — save current state
- **Sleep timer complete save:** listen for `sleepTimer?.phase === 'complete'` → save state
- Builds `SessionState` from current AudioState:
  ```
  activeSounds: state.activeSounds.map(s => ({ soundId: s.soundId, volume: s.volume }))
  foregroundContentId: state.foregroundContent?.contentId ?? null
  foregroundPosition: state.foregroundContent?.playbackPosition ?? 0
  masterVolume: state.masterVolume
  savedAt: new Date().toISOString()
  ```

**ResumePrompt.tsx:**
- Uses `useSessionPersistence()` for `{ sessionState, hasValidSession, clearSession }`
- Uses `useAuth()` — if not logged in, returns null
- If `!hasValidSession`, returns null
- Renders a banner at top of MusicPage:
  - `role="alert"`
  - Text: "Welcome back! Resume your last session?"
  - "Resume" button (primary style): loads the saved state — dispatch STOP_ALL, then ADD_SOUND for each saved sound, set master volume
  - "Dismiss" button (text style): calls `clearSession()`, hides banner
  - Auto-focus on "Resume" button via `useEffect` + `ref.current?.focus()`
  - Background: `bg-primary/10 border border-primary/20 rounded-xl p-4`

**Integration into MusicPage.tsx:**
- Render `<ResumePrompt />` above `<PersonalizationSection />`

**Responsive behavior:**
- Mobile: full-width banner, buttons stacked vertically
- Tablet/Desktop: buttons side by side

**Guardrails (DO NOT):**
- DO NOT show resume prompt for logged-out users
- DO NOT restore exact foreground position — just reload the ambient sounds (spec says "starts from beginning of the verse")
- DO NOT block the page render while checking session state

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ResumePrompt.test.tsx | unit | Not rendered when logged out |
| | unit | Not rendered when no session state |
| | unit | Not rendered when session > 24 hours old |
| | unit | Renders banner with "Welcome back!" text |
| | unit | Has `role="alert"` |
| | unit | "Resume" button loads saved state |
| | unit | "Dismiss" clears state and hides |
| | unit | Auto-focuses "Resume" button |

**Expected state after completion:**
- [ ] Session state auto-saved every 60s while playing
- [ ] Session state saved on beforeunload
- [ ] Session state saved on sleep timer complete
- [ ] Resume prompt shows on return within 24h
- [ ] Resume loads saved mix state
- [ ] Dismiss clears state
- [ ] Not shown for logged-out or expired sessions

---

### Step 11: Time-of-Day Recommendations

**Objective:** Show a "Suggested for You" section above the tabs with content appropriate to the time of day.

**Files to create:**
- `frontend/src/hooks/useTimeOfDayRecommendations.ts` — Time bracket logic + content selection
- `frontend/src/components/music/TimeOfDaySection.tsx` — UI section above tabs
- `frontend/src/components/music/__tests__/TimeOfDaySection.test.tsx`

**Files to modify:**
- `frontend/src/pages/MusicPage.tsx` — Add TimeOfDaySection above tab bar

**Details:**

**useTimeOfDayRecommendations(history?: ListeningSession[]):**
- Returns `{ heading, items: ContentRecommendation[], timeBracket }`
- Time bracket detection: `new Date().getHours()`
  - Morning (6-11): heading "Suggested for You", feature worship playlists + Morning Mist, Mountain Refuge scenes
  - Afternoon (12-17): heading "Great for Focus", feature Ember & Stone, ambient sounds
  - Evening (18-21): heading "Wind Down Tonight", feature calming scenes + sleep content
  - Night (22-5): heading "Ready for Rest", feature sleep content prominently
- Each `ContentRecommendation`: `{ id, type: 'scene' | 'sleep' | 'playlist', title, subtitle?, artworkUrl?, onPlay? }`
- If `history` is provided (logged-in with data): weight toward content types the user plays most at this time bracket
- If no history: use generic bracket recommendations

**TimeOfDaySection.tsx:**
- Renders the heading + horizontal scroll of recommendation cards
- `aria-label="Suggested for this time of day"`
- Cards: small landscape cards with artwork, title, play button
- Clicking a scene card: loads the scene (same as SceneCard click)
- Clicking a sleep card: switches to Sleep tab
- Clicking a playlist card: switches to Playlists tab and scrolls to the relevant embed
- Cards use: `rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden` (white bg cards on neutral-bg page)

**MusicPage.tsx integration:**
- Render `<TimeOfDaySection />` between `<RecentlyAddedSection />` and the sentinel div
- Also: if `timeBracket === 'night'` and no `tab` query param present, default to `'sleep'` tab instead of `'ambient'`

**Responsive behavior:**
- Mobile: horizontal scroll, 2 cards visible
- Tablet: horizontal scroll, 3 cards visible
- Desktop: horizontal scroll or row, 4-5 cards visible

**Guardrails (DO NOT):**
- DO NOT use external APIs for time detection — `new Date()` only
- DO NOT show personalized recommendations for logged-out users (generic only)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useTimeOfDayRecommendations.test.ts | unit | Returns "Suggested for You" heading at 9am |
| | unit | Returns "Great for Focus" heading at 2pm |
| | unit | Returns "Wind Down Tonight" heading at 8pm |
| | unit | Returns "Ready for Rest" heading at 11pm |
| | unit | Returns generic items when no history |
| TimeOfDaySection.test.tsx | unit | Has `aria-label="Suggested for this time of day"` |
| | unit | Renders heading and cards |
| MusicPage.test.tsx | integration | Night bracket defaults to sleep tab |

**Expected state after completion:**
- [ ] Time-of-day section renders with correct heading per bracket
- [ ] 4 time brackets: morning/afternoon/evening/night
- [ ] Generic recommendations for all users
- [ ] Personalized if logged-in with history
- [ ] Night mode defaults to sleep tab
- [ ] All cards are clickable and navigate to correct content

---

### Step 12: Wire PersonalizationSection to Real Data

**Objective:** Connect the existing PersonalizationSection component to real StorageService data.

**Files to modify:**
- `frontend/src/components/music/PersonalizationSection.tsx` — Replace placeholder props with real data from hooks
- `frontend/src/pages/MusicPage.tsx` — Pass real data to PersonalizationSection

**Details:**

**PersonalizationSection.tsx:**
- Import `useFavorites()`, `useSavedMixes()`, `useListeningHistory()`
- `continueListening`: from `getLastSession()` — map to `{ title, type, onPlay }` where onPlay loads the last session's content
- `favorites`: from `favorites` array — map to full card data including artwork lookup from SCENE_BY_ID / data catalogs
- `savedMixes`: from `mixes` array — map to card data with play action
- Replace current simple cards with richer cards: artwork thumbnail, name, type badge, FavoriteButton, play button

**Type badge on favorite cards:**
- `<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Scene</span>` / "Sleep" / "Mix"

**Play action on favorite cards:**
- Scene: call `loadScene()` from `useScenePlayer`
- Sleep session: switch to Sleep tab and start the session
- Custom mix: load sounds from the saved mix

**Guardrails (DO NOT):**
- DO NOT change the section's visibility logic — it already returns null for logged-out users
- DO NOT show empty subsections — already handled

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PersonalizationSection.test.tsx | integration | Renders "Continue Listening" with last session |
| | integration | Renders "Your Favorites" with favorited items |
| | integration | Renders "Your Saved Mixes" with saved mixes |
| | integration | Hidden for logged-out users |

**Expected state after completion:**
- [ ] PersonalizationSection shows real favorites, mixes, and last session
- [ ] Cards have artwork, names, type badges, play buttons
- [ ] Play actions work for each content type
- [ ] Still hidden for logged-out users

---

### Step 13: Final Integration Test & Cleanup

**Objective:** Run full test suite, fix any broken tests, verify the complete feature end-to-end.

**Files to modify:**
- Any test files that need updating due to new components being rendered in existing components

**Details:**

1. Run `pnpm test` — fix any failures caused by:
   - SceneCard/FeaturedSceneCard now rendering FavoriteButton (may need mock providers in tests)
   - DrawerTabs now rendering SavedTabContent instead of placeholder
   - AmbientBrowser now rendering "Your Saved Mixes" section
   - MusicPage now rendering ResumePrompt and TimeOfDaySection

2. Ensure all new tests pass

3. Run `pnpm build` — verify no TypeScript errors

4. Run `pnpm lint` — fix any linting issues

5. Verify localStorage keys are all prefixed with `wr_`:
   - `wr_favorites`
   - `wr_saved_mixes`
   - `wr_listening_history`
   - `wr_session_state`

**Guardrails (DO NOT):**
- DO NOT skip updating existing tests that break due to new child components
- DO NOT disable or skip any tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full suite | all | `pnpm test` passes with 0 failures |
| Build | build | `pnpm build` succeeds with 0 errors |

**Expected state after completion:**
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Lint passes
- [ ] All acceptance criteria from spec are met

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & StorageService interface + localStorage implementation |
| 2 | 1 | React hooks wrapping StorageService (useFavorites, useSavedMixes, etc.) |
| 3 | 2 | FavoriteButton component |
| 4 | 3 | Add hearts to SceneCard, FeaturedSceneCard, sleep cards |
| 5 | 2 | Save mix flow (SaveMixButton in drawer) |
| 6 | 2, 5 | Saved mixes management (SavedTabContent, delete dialog, actions menu) |
| 7 | 6 | "Your Saved Mixes" section on ambient tab |
| 8 | 1 | Shareable mix links (encoding/decoding, SharedMixHero, share action) |
| 9 | 2 | Listening analytics (ListeningLogger in AudioProvider) |
| 10 | 2, 9 | Session persistence + resume prompt |
| 11 | 9 | Time-of-day recommendations |
| 12 | 2, 3, 6, 9 | Wire PersonalizationSection to real data |
| 13 | All | Final integration test & cleanup |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & StorageService | [COMPLETE] | 2026-03-09 | Created `types/storage.ts` (6 types), `services/storage-service.ts` (StorageService interface + LocalStorageService + StorageQuotaError + singleton), `services/__tests__/storage-service.test.ts` (24 tests). All localStorage keys prefixed with `wr_`. |
| 2 | React Hooks for StorageService | [COMPLETE] | 2026-03-09 | Created `useFavorites.ts` (6 tests), `useSavedMixes.ts` (6 tests), `useListeningHistory.ts`, `useSessionPersistence.ts` (7 tests). All mutations auth-gated. Optimistic UI with revert in useFavorites. |
| 3 | FavoriteButton Component | [COMPLETE] | 2026-03-09 | Created `FavoriteButton.tsx` (3 states: logged-out/unfavorited/favorited, bounce animation, stopPropagation) + 10 tests. All ARIA attributes correct. |
| 4 | Add Hearts to Scene & Sleep Cards | [COMPLETE] | 2026-03-09 | Added FavoriteButton to SceneCard, FeaturedSceneCard, ScriptureSessionCard, BedtimeStoryCard. Converted card roots from `<button>` to `<div role="button">` to fix DOM nesting. Updated 4 existing test files with FavoriteButton mocks. Added heart/play integration tests. |
| 5 | Save Mix Flow (Drawer) | [COMPLETE] | 2026-03-09 | Created `SaveMixButton.tsx` (inline save input, scene modification detection, suggested name generation) + 11 tests. Integrated into `DrawerNowPlaying.tsx`. Auth-gated save flow. |
| 6 | Saved Mixes Management | [COMPLETE] | 2026-03-09 | Created `SavedTabContent.tsx`, `SavedMixRow.tsx`, `SavedMixCard.tsx`, `MixActionsMenu.tsx`, `DeleteMixDialog.tsx`. Replaced Saved tab placeholder in DrawerTabs. Load uses crossfade (REMOVE_SOUND per sound, SET_SCENE_NAME null, staggered ADD_SOUND). 8 tests. |
| 7 | Saved Mixes on Ambient Tab | [COMPLETE] | 2026-03-09 | Added "Your Saved Mixes" section to `AmbientBrowser.tsx` above featured scenes. Renders `SavedMixCard` in responsive grid. Hidden for logged-out users or when no mixes exist. |
| 8 | Shareable Mix Links | [COMPLETE] | 2026-03-09 | Created `SharedMixHero.tsx`, `useShareMix.ts`. Modified `MusicPage.tsx` to parse `mix` query param, render hero, handle play/dismiss. 8 tests (6 SharedMixHero + 2 useShareMix). |
| 9 | Listening Analytics | [COMPLETE] | 2026-03-09 | Created `ListeningLogger.tsx` (non-rendering component, observes AudioState, logs sessions >5s for logged-in users). Added to AudioProvider inside SleepTimerBridge. 4 tests. |
| 10 | Session Persistence + Resume Prompt | [COMPLETE] | 2026-03-09 | Created `SessionAutoSave.tsx` (60s interval + beforeunload + sleep timer complete), `ResumePrompt.tsx` (banner with Resume/Dismiss, auto-focus, role="alert"). Added to AudioProvider and MusicPage. 8 tests. |
| 11 | Time-of-Day Recommendations | [COMPLETE] | 2026-03-09 | Created `useTimeOfDayRecommendations.ts` (4 time brackets, scene recommendations per bracket), `TimeOfDaySection.tsx` (horizontal scroll cards with artwork). Integrated into `MusicPage.tsx` with `useScenePlayer` for scene loading. Night mode defaults to sleep tab. Fixed 6 pre-existing test failures (missing useToast/useAuth mocks in DrawerNowPlaying, AudioDrawer, SleepBrowse, BedtimeStoriesGrid, ScriptureCollectionRow). 7 new tests. |
| 12 | Wire PersonalizationSection | [COMPLETE] | 2026-03-09 | Rewrote `PersonalizationSection.tsx` to use hooks directly (`useFavorites`, `useSavedMixes`, `useListeningHistory`) instead of receiving props. Added artwork thumbnails, type badges (`Scene`/`Sleep`/`Mix`), content title resolution from data catalogs (`SCENE_BY_ID`, `SCRIPTURE_READING_BY_ID`, `BEDTIME_STORY_BY_ID`). Rewrote tests (6 tests). |
| 13 | Final Integration & Cleanup | [COMPLETE] | 2026-03-09 | All 900 tests pass (114 test files). Build succeeds. No new lint errors. All localStorage keys `wr_`-prefixed. Fixed pre-existing test failures in DrawerNowPlaying, AudioDrawer, SleepBrowse, BedtimeStoriesGrid, ScriptureCollectionRow (missing mock providers after earlier steps added FavoriteButton/SaveMixButton). |
