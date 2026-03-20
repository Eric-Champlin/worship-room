# Implementation Plan: Pray Ceremony Animation & Author Notification

**Spec:** `_specs/pray-ceremony-animation.md`
**Date:** 2026-03-19
**Branch:** `claude/feature/pray-ceremony-animation`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/prayer-wall/InteractionBar.tsx`** — The Pray button lives here (lines 58-70). Uses `HandHelping` icon from lucide-react. `aria-pressed` toggle, `onTogglePraying` callback. Button base classes: `flex items-center gap-1 text-sm min-h-[44px] min-w-[44px] justify-center transition-colors`.
- **`frontend/src/pages/PrayerWall.tsx`** — Container page. `handleTogglePraying` (lines 133-148) calls `togglePraying(prayerId)` from `usePrayerReactions`, then updates prayer count via `setPrayers`. Has access to `useToast()`, `useAuth()`, `useFaithPoints()`.
- **`frontend/src/components/prayer-wall/CommentsSection.tsx`** — Comments list + `CommentInput` at bottom (line 61-66). CTAs go after `CommentInput`.
- **`frontend/src/hooks/usePrayerReactions.ts`** — `togglePraying(prayerId)` returns `wasPraying` boolean. Manages `isPraying` and `isBookmarked` per prayer.
- **`frontend/src/components/ui/Toast.tsx`** — `showToast(message, type)` for standard toasts (auto-dismiss 6s). `showCelebrationToast(badgeName, message, type, icon)` returns Promise (auto-dismiss 4s for `celebration` type).
- **`frontend/src/pages/DailyHub.tsx`** — Context passing pattern: `handleSwitchToJournal(topic)` sets `PrayContext` and switches tab. `prayContext` passed to `JournalTabContent`.
- **`frontend/src/types/daily-experience.ts`** — `PrayContext` type: `{ from: 'pray', topic: string }`.
- **`frontend/tailwind.config.js`** — All animation keyframes defined here. Existing patterns: `animate-celebration-spring` (600ms cubic-bezier), `animate-fade-in` (500ms ease-out).

### Directory Conventions

- Prayer Wall components: `frontend/src/components/prayer-wall/`
- Tests: `__tests__/` subdirectory adjacent to components, named `ComponentName.test.tsx`
- Types: `frontend/src/types/`
- Hooks: `frontend/src/hooks/`

### Component Patterns

- All animations use CSS keyframes in `tailwind.config.js` — no inline animation styles, no JS-driven animations
- `cn()` from `@/lib/utils` for conditional classNames
- `useAuth()` for auth state, `useAuthModal()` for auth gating
- Provider wrapping in tests: `MemoryRouter` → `ToastProvider` → `AuthModalProvider` → Component

### Test Patterns

- Vitest + React Testing Library + userEvent
- Mock `useAuth` via `vi.mock('@/hooks/useAuth', ...)`
- Mock `useFaithPoints` via `vi.mock('@/hooks/useFaithPoints', ...)`
- Render helpers that wrap in `MemoryRouter` with `future` flags
- `MemoryRouter` future flags: `{ v7_startTransition: true, v7_relativeSplatPath: true }`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Pray button tap (ceremony) | Button already auth-gated — logged-out users get auth modal | N/A (existing) | Existing auth gate in PrayerWall.tsx |
| Cross-feature CTAs | Work for logged-out AND logged-in users (no auth modal) | Step 4 | No auth check needed — CTAs navigate to public pages |

No new auth gates required. The Pray button is already gated by the existing flow in `PrayerWall.tsx` (only authenticated users can toggle praying — the `InteractionBar` Pray button's `onTogglePraying` is passed from the container which handles auth). The CTAs are intentionally public.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Icon glow color | box-shadow | `rgba(109, 40, 217, 0.4)` (#6D28D9 at 40%) | design-system.md: Primary `#6D28D9` |
| Ripple color start | background | `rgba(109, 40, 217, 0.3)` | Spec: `primary/30` opacity |
| Float text color | color | `#6D28D9` | design-system.md: `text-primary` |
| Float text font | font | Inter, 12px (text-xs) | design-system.md: Inter font-sans |
| CTA link color | color | `#8B5CF6` (primary-lt) | design-system.md: `text-primary-lt` |
| CTA link hover | color | `#6D28D9` (primary) | design-system.md: `text-primary` |
| CTA font size | font-size | 14px | design-system.md: `text-sm` |
| Active pray button | color | `#6D28D9` | InteractionBar.tsx line 63: `text-primary` |

---

## Design System Reminder

- All animations defined as CSS keyframes in `tailwind.config.js` — never inline `@keyframes` or JS-driven animation
- Worship Room uses `motion-safe:` Tailwind prefix for animation classes to respect `prefers-reduced-motion`
- Inter is the body/UI font (`font-sans`), Caveat is script (`font-script`), Lora is scripture (`font-serif`)
- Primary color: `#6D28D9` (`text-primary`, `bg-primary`)
- Primary Light: `#8B5CF6` (`text-primary-lt`)
- Touch targets: minimum 44×44px (`min-h-[44px] min-w-[44px]`)
- `cn()` utility for all conditional classNames
- Toast types: `success` (green left border), `celebration` (golden frosted glass, no confetti)

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Same ceremony animations (contained to button area). CTAs stack vertically. |
| Tablet | 768px | Same as desktop. CTAs display horizontally. |
| Desktop | 1440px | Same ceremony. CTAs display horizontally with `gap-3`. |

The ceremony animation is self-contained within the button's bounding box (icon pulse, ripple, float text all absolutely positioned relative to the button). No responsive layout changes needed for the animation itself.

CTA breakpoint: `flex-col sm:flex-row` — stack below 640px, horizontal at 640px+.

---

## Vertical Rhythm

No new sections or page-level layout changes. The CTAs are appended inside the existing `CommentsSection` container. The ceremony animation is overlaid on the existing button. No vertical rhythm concerns.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec defines no new user text input — no AI safety checks needed
- [x] No new localStorage keys — all state is ephemeral React state
- [x] No database writes — animations and toasts are client-only
- [x] All auth-gated actions from the spec are accounted for (none new)
- [x] Design system values verified from design-system.md recon and codebase inspection
- [x] No [UNVERIFIED] values — all styling uses existing design tokens
- [x] Pray button is already auth-gated (logged-out cannot toggle)
- [ ] Toast auto-dismiss: spec says 4s for success toast, but existing `showToast` auto-dismisses at 6s. The plan uses `setTimeout` to fire the toast at 600ms delay but relies on existing 6s auto-dismiss. Spec says 4 seconds — **confirm if we should modify showToast or if 6s is acceptable**. (Plan proceeds with existing 6s; can adjust if user requests.)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Toast auto-dismiss timing | Use existing 6s auto-dismiss for success toast | Spec says 4s but existing system uses 6s. Changing it risks affecting all other toasts. Could add a `duration` parameter later. |
| Rapid toggle (untoggle + re-toggle) | Cancel any running ceremony timeout, restart fresh | Prevents stale toast from firing after untoggle. Clear timeout ref on each toggle. |
| Author notification — matching userId | Compare `prayer.userId` to `user?.id` from `useAuth()` | With mock data, simulated user ID may not match mock prayer userIds. Plan includes a note in test specs. |
| Ripple element lifecycle | Render conditionally via React state, remove after 600ms | Not a pseudo-element (spec says separate element). `pointer-events-none` + `aria-hidden="true"`. |
| CTA context passing | Use `useNavigate()` with state parameter | Same pattern as Pray→Journal CTA in DailyHub. Navigate to `/daily?tab=pray` or `?tab=journal` with state carrying prayer content. |

---

## Implementation Steps

### Step 1: Add Ceremony CSS Keyframes to Tailwind Config

**Objective:** Define the 3 ceremony animations as CSS keyframes in `tailwind.config.js` so they're available as Tailwind utility classes.

**Files to modify:**
- `frontend/tailwind.config.js` — Add 3 new keyframes + 3 new animation utilities

**Details:**

Add under `keyframes`:

```javascript
'pray-icon-pulse': {
  '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 0px rgba(109, 40, 217, 0))' },
  '50%': { transform: 'scale(1.3)', filter: 'drop-shadow(0 0 8px rgba(109, 40, 217, 0.6))' },
  '100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 0px rgba(109, 40, 217, 0))' },
},
'pray-ripple': {
  '0%': { transform: 'scale(1)', opacity: '0.3' },
  '100%': { transform: 'scale(2.5)', opacity: '0' },
},
'pray-float-text': {
  '0%': { transform: 'translateY(0)', opacity: '1' },
  '100%': { transform: 'translateY(-20px)', opacity: '0' },
},
```

Add under `animation`:

```javascript
'pray-icon-pulse': 'pray-icon-pulse 300ms ease-out forwards',
'pray-ripple': 'pray-ripple 600ms ease-out forwards',
'pray-float-text': 'pray-float-text 500ms ease-out forwards',
```

**Guardrails (DO NOT):**
- DO NOT use inline `@keyframes` or `style` attributes for animations
- DO NOT modify any existing keyframes or animations
- DO NOT add animations that run infinitely — all ceremony animations use `forwards` fill mode

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Tailwind config snapshot | unit | Verify new keyframe names exist in config (optional — covered by component tests) |

**Expected state after completion:**
- [x] `animate-pray-icon-pulse`, `animate-pray-ripple`, `animate-pray-float-text` available as Tailwind classes
- [x] Animations use `motion-safe:` prefix in components (handled in Step 2)
- [x] No existing animations affected

---

### Step 2: Add Ceremony Animation to InteractionBar Pray Button

**Objective:** Transform the Pray button tap (toggle ON) into a 3-part simultaneous ceremony: icon pulse+glow, ripple, floating "+1 prayer" text. No ceremony on untoggle.

**Files to modify:**
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — Add animation state, DOM elements, conditional classes

**Details:**

1. Add `isAnimating` state and a `timeoutRef` for cleanup:

```typescript
const [isAnimating, setIsAnimating] = useState(false)
const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

2. Add a new `onPrayClick` handler wrapping the existing `onTogglePraying`:

```typescript
const handlePrayClick = useCallback(() => {
  // If currently praying, this is an untoggle — no ceremony
  if (isPraying) {
    onTogglePraying()
    return
  }
  // Toggle ON — start ceremony
  // Cancel any stale timeout from rapid re-toggle
  if (animationTimeoutRef.current) {
    clearTimeout(animationTimeoutRef.current)
  }
  setIsAnimating(true)
  onTogglePraying()
  // Clean up after longest animation (600ms ripple)
  animationTimeoutRef.current = setTimeout(() => {
    setIsAnimating(false)
  }, 600)
}, [isPraying, onTogglePraying])
```

3. Clean up timeout on unmount:

```typescript
useEffect(() => {
  return () => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
  }
}, [])
```

4. Wrap the Pray button in a `relative` container and add animation elements:

```tsx
{/* Pray button wrapper — relative for absolute-positioned animation elements */}
<div className="relative">
  <button
    type="button"
    onClick={handlePrayClick}
    className={cn(
      btnBase,
      isPraying ? 'font-medium text-primary' : 'text-text-light hover:text-primary',
      // Untoggle: quick 150ms transition (already in btnBase via transition-colors)
    )}
    aria-label={isPraying ? `Stop praying for this request (${prayer.prayingCount} praying)` : `Pray for this request (${prayer.prayingCount} praying)`}
    aria-pressed={isPraying}
  >
    <HandHelping
      className={cn(
        'h-4 w-4',
        isAnimating && 'motion-safe:animate-pray-icon-pulse',
      )}
      aria-hidden="true"
    />
    <span>({prayer.prayingCount})</span>
  </button>

  {/* Ripple — absolutely positioned circle behind button */}
  {isAnimating && (
    <span
      className="pointer-events-none absolute inset-0 motion-safe:animate-pray-ripple rounded-full bg-primary/30"
      aria-hidden="true"
    />
  )}

  {/* Floating "+1 prayer" text */}
  {isAnimating && (
    <span
      className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-sans text-primary motion-safe:animate-pray-float-text"
      aria-hidden="true"
    >
      +1 prayer
    </span>
  )}
</div>
```

5. **Reduced motion behavior**: All animation classes use `motion-safe:` prefix. When `prefers-reduced-motion: reduce` is active, the animation classes don't apply. The `isAnimating` state still sets/clears (which is fine — the DOM elements exist briefly but have no visible animation, and they're `aria-hidden`). The icon color change and count increment happen instantly as before.

**Responsive behavior:**
- All breakpoints: identical. Animation is self-contained within the button's relative container.

**Guardrails (DO NOT):**
- DO NOT use JavaScript animation APIs (requestAnimationFrame, Web Animations API) — CSS keyframes only
- DO NOT change the existing `aria-pressed` or `aria-label` attributes
- DO NOT modify the button's existing touch target (min-h/min-w 44px)
- DO NOT add animation to untoggle (toggle OFF) — only quick 150ms color transition
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Ceremony starts on pray toggle ON | integration | Click pray button → verify ripple element and float text appear in DOM |
| No ceremony on pray toggle OFF | integration | Set isPraying=true, click → verify no ripple or float text appear |
| Animation elements have aria-hidden | unit | Verify ripple and float text have `aria-hidden="true"` |
| Animation elements have pointer-events-none | unit | Verify ripple and float text have `pointer-events-none` class |
| Pray button preserves aria-pressed | unit | Verify `aria-pressed` still toggles correctly |
| Reduced motion: no animation classes applied | unit | Mock `prefers-reduced-motion: reduce`, verify no `animate-` classes on elements |

**Expected state after completion:**
- [x] Tapping Pray (toggle ON) shows 3 simultaneous animations for 600ms
- [x] Tapping Pray (toggle OFF) shows no ceremony, just color transition
- [x] All animation elements are `aria-hidden` and `pointer-events-none`
- [x] Reduced motion users see instant color change only
- [x] Existing pray button accessibility (aria-pressed, aria-label, 44px target) preserved

---

### Step 3: Add Toast Notifications on Pray Ceremony

**Objective:** Fire a success toast after the 600ms ceremony completes ("Your prayer has been lifted up"), and optionally an author notification toast ~200ms later if the prayer author matches the logged-in user.

**Files to modify:**
- `frontend/src/pages/PrayerWall.tsx` — Modify `handleTogglePraying` to add toast timing

**Details:**

1. Add a ref to track ceremony timeouts for cleanup:

```typescript
const ceremonyTimeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])
```

2. Modify `handleTogglePraying`:

```typescript
const handleTogglePraying = useCallback(
  (prayerId: string) => {
    // Clear any pending ceremony timeouts (rapid toggle protection)
    ceremonyTimeoutRefs.current.forEach(clearTimeout)
    ceremonyTimeoutRefs.current = []

    const wasPraying = togglePraying(prayerId)
    if (!wasPraying) {
      recordActivity('prayerWall')

      // Success toast after 600ms ceremony
      const successTimeout = setTimeout(() => {
        showToast('Your prayer has been lifted up')
      }, 600)
      ceremonyTimeoutRefs.current.push(successTimeout)

      // Author notification: check if prayer author is the logged-in user
      const prayer = prayers.find(p => p.id === prayerId)
      if (prayer?.userId && prayer.userId === user?.id) {
        const authorTimeout = setTimeout(() => {
          showCelebrationToast(
            '',
            '🙏 Someone is praying for your request',
            'celebration',
          )
        }, 800)
        ceremonyTimeoutRefs.current.push(authorTimeout)
      }
    }
    // No toast on untoggle

    setPrayers((prev) =>
      prev.map((p) =>
        p.id === prayerId
          ? { ...p, prayingCount: p.prayingCount + (wasPraying ? -1 : 1) }
          : p,
      ),
    )
  },
  [togglePraying, recordActivity, showToast, showCelebrationToast, prayers, user],
)
```

3. Add `showCelebrationToast` to the destructured toast hook:

```typescript
const { showToast, showCelebrationToast } = useToast()
```

4. Clean up timeouts on unmount:

```typescript
useEffect(() => {
  return () => {
    ceremonyTimeoutRefs.current.forEach(clearTimeout)
  }
}, [])
```

**Auth gating:** Toast only fires when `!wasPraying` (toggle ON). Toggle ON is already impossible for logged-out users (pray button is auth-gated via existing flow).

**Guardrails (DO NOT):**
- DO NOT fire any toast on untoggle (toggle OFF)
- DO NOT change the existing `recordActivity('prayerWall')` call
- DO NOT modify the prayer count update logic
- DO NOT use confetti tier — use `celebration` (golden frosted glass, no confetti)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Success toast fires after pray toggle ON | integration | Mock `useAuth` as logged in, click pray → advance timers 600ms → verify "Your prayer has been lifted up" toast |
| No toast on untoggle | integration | Set prayer as already praying, click → advance timers → verify no toast |
| Author toast fires when userId matches | integration | Create prayer with userId matching logged-in user, click pray → advance timers 800ms → verify celebration toast appears |
| Author toast does NOT fire when userId doesn't match | integration | Create prayer with different userId, click pray → advance timers → verify only success toast |
| Rapid toggle cancels pending toasts | integration | Click pray ON, immediately click OFF → advance timers → verify no toast fires |

**Expected state after completion:**
- [x] "Your prayer has been lifted up" success toast at 600ms after toggle ON
- [x] "🙏 Someone is praying for your request" celebration toast at 800ms (if author matches)
- [x] No toasts on untoggle
- [x] Rapid toggle doesn't produce stale toasts

---

### Step 4: Add Cross-Feature CTAs to CommentsSection

**Objective:** Add "Pray about this →" and "Journal about this →" text links at the bottom of each expanded comment section, below the CommentInput.

**Files to modify:**
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — Add CTA links after `CommentInput`

**Details:**

1. Add new props to `CommentsSectionProps`:

```typescript
interface CommentsSectionProps {
  prayerId: string
  isOpen: boolean
  comments: PrayerComment[]
  totalCount: number
  onSubmitComment: (prayerId: string, content: string) => void
  prayerContent: string  // NEW: prayer text for CTA context
}
```

2. Import `Link` (already imported) and `useNavigate`:

```typescript
import { Link, useNavigate } from 'react-router-dom'
```

3. Add CTA links after `CommentInput`, inside the existing `<div className="mt-3 border-t border-gray-100 pt-3">`:

```tsx
<CommentInput
  prayerId={prayerId}
  onSubmit={onSubmitComment}
  initialValue={replyTo}
  onLoginClick={() => authModal?.openAuthModal()}
/>

{/* Cross-feature CTAs */}
<div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:gap-3">
  <Link
    to={`/daily?tab=pray`}
    state={{ prayWallContext: prayerContent.slice(0, 100) }}
    className="text-sm text-primary-lt transition-colors hover:text-primary"
  >
    Pray about this →
  </Link>
  <Link
    to={`/daily?tab=journal`}
    state={{ prayWallContext: prayerContent.slice(0, 100) }}
    className="text-sm text-primary-lt transition-colors hover:text-primary"
  >
    Journal about this →
  </Link>
</div>
```

4. Update `PrayerWall.tsx` to pass `prayerContent` to `CommentsSection`:

```tsx
<CommentsSection
  prayerId={prayer.id}
  isOpen={openComments.has(prayer.id)}
  comments={[...(localComments[prayer.id] ?? []), ...getMockComments(prayer.id)]}
  totalCount={prayer.commentCount}
  onSubmitComment={handleSubmitComment}
  prayerContent={prayer.content}  // NEW
/>
```

5. **Context consumption in DailyHub**: The Pray tab and Journal tab need to read `location.state.prayWallContext`. Update `PrayTabContent.tsx` and `JournalTabContent.tsx` to check for this state and pre-fill/display context.

In `PrayTabContent.tsx`, add near the top of the component:

```typescript
const location = useLocation()
const prayWallContext = (location.state as { prayWallContext?: string } | null)?.prayWallContext
```

If `prayWallContext` exists, pre-fill the textarea with it (or display as context banner). Follow the existing pattern where chips pre-fill the textarea.

In `JournalTabContent.tsx`, add similar logic. If `prayWallContext` exists, set guided mode and generate a contextual prompt: `"Reflect on this prayer request: '${prayWallContext}'. What feelings does it stir in you?"`.

**Responsive behavior:**
- Mobile (< 640px): CTAs stack vertically (`flex-col`)
- Tablet/Desktop (≥ 640px): CTAs display horizontally (`sm:flex-row`)

**Auth behavior:** Both links navigate to public pages. No auth modal triggered. The destination pages handle auth gating for actions (generate prayer, save journal entry).

**Guardrails (DO NOT):**
- DO NOT add auth modal to the CTA links — they navigate to public pages
- DO NOT pass the full prayer content — truncate to 100 characters
- DO NOT use `dangerouslySetInnerHTML` for CTA text
- DO NOT modify the existing CommentInput component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CTAs render when comments are open | integration | Render CommentsSection with isOpen=true → verify "Pray about this →" and "Journal about this →" links |
| CTAs not visible when comments are closed | integration | Render with isOpen=false → verify links are hidden (aria-hidden container) |
| "Pray about this" links to /daily?tab=pray | unit | Verify href of the Pray CTA link |
| "Journal about this" links to /daily?tab=journal | unit | Verify href of the Journal CTA link |
| CTAs stack on mobile, row on desktop | unit | Verify flex-col and sm:flex-row classes on CTA container |
| CTAs work for logged-out users | integration | Mock useAuth as logged out → verify CTAs still render and are clickable |

**Expected state after completion:**
- [x] "Pray about this →" and "Journal about this →" appear at bottom of expanded comments
- [x] Links navigate to Daily Hub with prayer context in state
- [x] CTAs stack vertically on mobile, horizontal on tablet+
- [x] No auth modal on CTA clicks
- [x] Pray tab reads context from location state and pre-fills textarea
- [x] Journal tab reads context from location state and sets guided prompt

---

### Step 5: Tests for Ceremony Animation and Toasts

**Objective:** Add comprehensive tests for the ceremony animation, toast timing, and CTA functionality.

**Files to create:**
- `frontend/src/components/prayer-wall/__tests__/PrayCeremony.test.tsx` — Ceremony animation tests
- Update `frontend/src/components/prayer-wall/__tests__/CommentsSection.test.tsx` — Add CTA tests

**Files to modify:**
- `frontend/src/components/prayer-wall/__tests__/InteractionBar.test.tsx` — Add animation-specific tests

**Details:**

**PrayCeremony.test.tsx** — Integration tests for the full ceremony flow:

```typescript
// Test ceremony at PrayerWall page level (full provider wrapping)
// - Mock useAuth as authenticated
// - vi.useFakeTimers() for setTimeout assertions
// - Click pray → verify animation elements appear
// - Advance 600ms → verify success toast
// - Advance 800ms → verify author toast (when userId matches)
// - Test untoggle: no animation elements, no toast
// - Test rapid toggle: cancel stale toasts
```

**InteractionBar.test.tsx updates:**
- Add test for animation elements appearing on click
- Add test for `aria-hidden` on animation elements
- Add test for no animation on untoggle (when isPraying=true and clicked)

**CommentsSection.test.tsx updates:**
- Add `prayerContent` prop to existing `renderSection` helper
- Add tests for CTA link rendering and hrefs
- Add test for CTA visibility when closed vs open

**Test wrapping pattern** (follow existing PrayerWall.test.tsx):
```typescript
render(
  <MemoryRouter initialEntries={['/prayer-wall']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ToastProvider>
      <AuthModalProvider>
        <PrayerWall />
      </AuthModalProvider>
    </ToastProvider>
  </MemoryRouter>,
)
```

**Guardrails (DO NOT):**
- DO NOT test CSS animation visuals (can't test keyframe rendering in jsdom)
- DO NOT skip the provider wrapping — ToastProvider is required for toast tests
- DO NOT import from implementation internals — test through public API (render + user events)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Ceremony animation elements appear on pray toggle ON | integration | Full page render, click pray → check for ripple/float text in DOM |
| No ceremony elements on pray toggle OFF | integration | Set as praying, click → verify no animation elements |
| Success toast after 600ms | integration | Click pray, advance timers 600ms → verify toast text |
| Author notification after 800ms | integration | Logged-in user with matching prayer userId → advance 800ms → verify celebration toast |
| No author notification when userId differs | integration | Different userId → advance 800ms → verify no celebration toast |
| Rapid toggle cancels ceremony | integration | Click ON, click OFF quickly → advance timers → verify no stale toast |
| CTA links render in open comments | integration | Open comments → verify CTA links present |
| CTA links hidden in closed comments | integration | Closed comments → verify CTA links not visible |
| CTA links navigate correctly | unit | Verify to prop on Link elements |
| CTAs accessible to logged-out users | integration | Logged out → verify CTAs still render |
| Animation elements cleaned up after 600ms | integration | Click pray, advance 600ms → verify animation elements removed |
| aria-hidden on animation elements | unit | Verify `aria-hidden="true"` on ripple and float text |

**Expected state after completion:**
- [x] All ceremony tests pass
- [x] All toast timing tests pass
- [x] All CTA tests pass
- [x] Existing InteractionBar and CommentsSection tests still pass
- [x] No regression in existing PrayerWall tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | CSS keyframes in tailwind.config.js |
| 2 | 1 | InteractionBar ceremony animation (uses new keyframes) |
| 3 | 2 | Toast notifications in PrayerWall.tsx (fires after ceremony) |
| 4 | — | Cross-feature CTAs in CommentsSection (independent of animation) |
| 5 | 2, 3, 4 | Tests for all new functionality |

Steps 1→2→3 are sequential (each depends on prior). Step 4 is independent and can be done in parallel with Steps 1-3. Step 5 depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | CSS Keyframes | [COMPLETE] | 2026-03-19 | Added `pray-icon-pulse`, `pray-ripple`, `pray-float-text` keyframes + animation utilities to `frontend/tailwind.config.js` |
| 2 | Ceremony Animation | [COMPLETE] | 2026-03-19 | Added `isAnimating` state, `handlePrayClick` handler, ripple + float text elements to `InteractionBar.tsx`. All `motion-safe:` prefixed. Existing tests pass. |
| 3 | Toast Notifications | [COMPLETE] | 2026-03-19 | Added `showCelebrationToast`, ceremony timeout refs, success toast at 600ms, author notification at 800ms, rapid toggle protection in `PrayerWall.tsx`. All 94 prayer-wall tests pass. |
| 4 | Cross-Feature CTAs | [COMPLETE] | 2026-03-19 | Added `prayerContent` prop (optional) to `CommentsSection.tsx`, CTA links with `state`, passed prop from `PrayerWall.tsx`. Added `prayWallContext` reading to `PrayTabContent.tsx` (pre-fills textarea) and `JournalTabContent.tsx` (sets guided prompt). 159 tests pass. Deviation: `prayerContent` made optional (default `''`) since `CommentsSection` is used in `PrayerWallDashboard` and `PrayerWallProfile` without prayer content access. CTAs only render when `prayerContent` is non-empty. |
| 5 | Tests | [COMPLETE] | 2026-03-19 | Created `PrayCeremony.test.tsx` (7 tests: ceremony animation, toast timing, rapid toggle). Updated `InteractionBar.test.tsx` (+4 animation tests). Updated `CommentsSection.test.tsx` (+7 CTA tests). Total: 112 tests pass across 17 prayer-wall test files. Used `fireEvent.click` instead of `userEvent.click` in PrayCeremony tests to avoid fake timer conflicts. |
