# Implementation Plan: Journal Voice Input

**Spec:** `_specs/journal-voice-input.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/journal-voice-input`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files & Patterns

- **JournalTabContent.tsx** (`frontend/src/components/daily/JournalTabContent.tsx`) — The primary file to modify. Contains the journal textarea, character counter, mode toggle (Guided/Free Write), auto-save draft debounce, crisis detection integration, save handler with auth gating, and saved entries section.
- **Textarea structure** (lines 387–412): Wrapped in `<div className="relative mb-2">`. Textarea has `value={text}`, `onChange` updates `text` state, `maxLength={5000}`. Character counter is positioned `absolute bottom-2 right-3`.
- **Draft auto-save** (lines 142–154): `useEffect` with 1s debounce saves `text` to `JOURNAL_DRAFT_KEY` in localStorage.
- **CrisisBanner** (line 424): `<CrisisBanner text={text} />` — automatically processes textarea value for crisis keywords. Voice input appends to `text` state, so crisis detection works automatically.
- **useAuth** (`frontend/src/contexts/AuthContext.tsx`) — Returns `{ isAuthenticated, user, login, logout }`. Auth state from localStorage (`wr_auth_simulated`).
- **useToast** (`frontend/src/components/ui/Toast.tsx`) — Returns `{ showToast, showCelebrationToast }`. Standard types: `'success' | 'error'`. **No 'warning' type exists** — must add one.
- **useAnnounce** (`frontend/src/hooks/useAnnounce.tsx`) — Returns `{ announce, AnnouncerRegion }`. Existing pattern for screen reader announcements with debouncing. `announce(msg, 'polite' | 'assertive')`.
- **useReadAloud** (`frontend/src/hooks/useReadAloud.ts`) — Speech Synthesis (TTS output), NOT Speech Recognition (input). Different API, no code to reuse.
- **tailwind.config.js** — Custom keyframes and animation definitions. Has existing patterns like `sound-pulse` (scale 1 to 1.02) that are similar to the needed `mic-pulse` animation.
- **App.tsx** — Provider order: `AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > Routes`.
- **Constants** (`frontend/src/constants/daily-experience.ts`): `JOURNAL_DRAFT_KEY`, `JOURNAL_MODE_KEY`, `JOURNAL_MILESTONES_KEY`.

### Test Patterns to Match

From `JournalTabContent.test.tsx` and `JournalSearchFilter.test.tsx`:

```typescript
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  vi.useFakeTimers()
})

function renderJournalTab() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <JournalTabContent />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
```

- Mock `AudioProvider`, `useScenePlayer`, `useFaithPoints` at module level with `vi.mock()`
- Use `fireEvent.change()` for fast text input, `userEvent.setup()` for realistic interactions
- Use `vi.advanceTimersByTime()` for debounce testing
- Assert with `getByLabelText()`, `getByRole()`, `getByText()`, `queryByLabelText()` (null-safe)

### Key Architectural Decisions

1. **Interim text display**: Standard HTML `<textarea>` cannot render mixed-opacity text. Instead of fighting the textarea, interim text will be appended to the textarea value and updated in-place on each `onresult` event. A small overlay indicator below the textarea will show "Listening..." status. When interim becomes final, the text stays in the textarea at full opacity. This is the standard pattern used by Google Docs, iOS dictation, etc.

2. **Character counter position change**: The character counter is currently at `absolute bottom-2 right-3`. The spec places the mic button at bottom-right, so the character counter must move to `absolute bottom-2 left-3` to create a balanced layout.

3. **New hook**: `useVoiceInput` — encapsulates all Web Speech API logic (SpeechRecognition lifecycle, permission handling, transcript management). Returns clean state and controls for the component to consume.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Show mic button | Only visible to logged-in users | Step 4 | `isAuthenticated` from `useAuth()` — conditionally render |

No new auth modal messages are introduced. The mic button is simply not rendered for logged-out users.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Mic button (idle) | background | `bg-white/10` | spec |
| Mic button (idle) | text color | `text-white/50` | spec |
| Mic button (idle) | padding | `p-2` | spec |
| Mic button (idle) | border-radius | `rounded-full` | spec |
| Mic button (hover) | text color | `hover:text-white/70` | spec |
| Mic button (hover) | background | `hover:bg-white/15` | spec |
| Mic button (active) | background | `bg-red-500/20` | spec |
| Mic button (active) | text color | `text-red-400` | spec |
| Mic button position | absolute | `absolute bottom-2 right-2` | spec |
| Character counter | position (moved) | `absolute bottom-2 left-3` | was `right-3`, moved per spec |
| Textarea | existing styles | `min-h-[200px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 font-serif text-lg leading-relaxed text-text-dark` | JournalTabContent.tsx line 400 |
| Warning toast | left border | `border-l-4 border-warning` (`#F39C12`) | [UNVERIFIED] extrapolated from success (green) / error (red) pattern |

---

## Design System Reminder

- Worship Room uses Caveat for script/highlighted headings, not Lora
- All Daily Hub tabs share `max-w-2xl` container width
- Textarea uses `font-serif` (Lora) for journal entries — NOT the cyan glow animation (that's on the Pray tab textarea only)
- Journal textarea border is `border-gray-200`, not `border-glow-cyan/30`
- Focus ring pattern: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Touch targets: minimum 44px on all interactive elements
- `prefers-reduced-motion` must disable all scale/transform animations but preserve color/opacity changes

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Mic button especially valuable here. Same absolute positioning. 44px touch target critical. |
| Tablet | 768px | No layout changes from mobile — button inside textarea, bottom-right |
| Desktop | 1440px | Same layout. Hover states active (`hover:text-white/70`, `hover:bg-white/15`) |

The mic button position is identical across all breakpoints (absolute bottom-right of textarea container). The textarea is already responsive; the absolute-positioned button moves with it.

---

## Vertical Rhythm

Not applicable — this feature adds an element inside an existing textarea container. No new sections or spacing between sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The branch `claude/feature/journal-voice-input` exists and is checked out
- [ ] The spec mentions `text-white/40` for interim text in the textarea — this is not possible in a native `<textarea>`. Decision: use real-time text updates in textarea + "Listening..." visual indicator (see Edge Cases). Confirm this approach is acceptable.
- [ ] The character counter will be moved from bottom-right to bottom-left to make room for the mic button
- [ ] All auth-gated actions from the spec are accounted for in the plan (just the mic button visibility)
- [ ] Design system values are verified (from spec + codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] No backend changes needed (all client-side via Web Speech API)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Interim text opacity | Real-time textarea updates instead of mixed-opacity rendering | Native `<textarea>` cannot render mixed opacity text. Interim text updates in-place; a "Listening..." indicator shows recording status separately. This is the standard pattern (Google Docs, iOS dictation). |
| Warning toast type | Add `'warning'` to `StandardToastType` with amber/orange styling | Spec requires "Character limit reached." as warning tier. Currently only success/error exist. |
| Character counter position | Move from `bottom-2 right-3` to `bottom-2 left-3` | Spec says mic button is bottom-right, character counter bottom-left. Creates balanced layout. |
| Textarea bottom padding | Add `pb-10` to textarea to prevent text from flowing behind the mic button | Spec requirement: "sufficient bottom padding to prevent text from flowing behind the button" |
| Permission denied persistence | Use `useRef` to track denied state for session lifetime | Spec says "disabled state for the remainder of the session (do not repeatedly prompt)". A ref persists across re-renders but resets on page refresh (new session). |
| Recognition errors | Return to idle state, no toast | Spec says "the button returns to idle state gracefully". Transient network errors shouldn't alarm the user. |
| `webkitSpeechRecognition` | Feature detect with prefix fallback | `SpeechRecognition` is the standard, `webkitSpeechRecognition` is the Chrome implementation. Both must be checked. |

---

## Implementation Steps

### Step 1: Add Warning Toast Type

**Objective:** Extend the toast system with a 'warning' tier (amber/orange) for the "Character limit reached." toast.

**Files to modify:**
- `frontend/src/components/ui/Toast.tsx` — Add 'warning' to `StandardToastType`, add amber styling

**Details:**

1. Update `StandardToastType` to `'success' | 'error' | 'warning'`
2. Add warning styling in the toast rendering logic (where success gets green border and error gets red border):
   - Warning: `border-l-4 border-warning` (uses existing `warning: '#F39C12'` color from tailwind config)
   - Icon: Amber/orange color for the warning indicator

**Guardrails (DO NOT):**
- Do NOT change existing success/error behavior
- Do NOT modify `CelebrationToastType` or celebration toast logic
- Do NOT change auto-dismiss duration for warning (use same as success/error)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Warning toast renders with amber border | unit | `showToast('msg', 'warning')` renders toast with warning styling |
| Warning toast auto-dismisses | unit | Toast disappears after standard duration |

**Expected state after completion:**
- [ ] `showToast('msg', 'warning')` works with amber/orange left border
- [ ] Existing success/error toasts unchanged
- [ ] All existing toast tests still pass

---

### Step 2: Add Mic-Pulse Animation to Tailwind Config

**Objective:** Add the custom `mic-pulse` keyframe animation for the active recording state.

**Files to modify:**
- `frontend/tailwind.config.js` — Add `mic-pulse` keyframe and animation

**Details:**

Add to `keyframes`:
```javascript
'mic-pulse': {
  '0%, 100%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.1)' },
},
```

Add to `animation`:
```javascript
'mic-pulse': 'mic-pulse 1s ease-in-out infinite',
```

Usage will be: `animate-mic-pulse` class, wrapped in a `motion-safe:` prefix to respect `prefers-reduced-motion`.

**Guardrails (DO NOT):**
- Do NOT modify any existing keyframes or animations
- Do NOT add any other new animations beyond `mic-pulse`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (No tests needed) | — | Tailwind config changes are verified visually and by consuming components' tests |

**Expected state after completion:**
- [ ] `animate-mic-pulse` class available in Tailwind
- [ ] Animation: scale 1 → 1.1 → 1 over 1 second, infinite loop

---

### Step 3: Create `useVoiceInput` Custom Hook

**Objective:** Encapsulate all Web Speech API logic into a reusable hook.

**Files to create:**
- `frontend/src/hooks/useVoiceInput.ts` — The custom hook

**Details:**

```typescript
interface UseVoiceInputOptions {
  onTranscript: (text: string) => void  // Called with final transcript text to append
  onInterimUpdate?: (interim: string) => void  // Called with current interim text
  maxLength?: number  // Character budget remaining
  onMaxLengthReached?: () => void  // Called when max length hit during recording
}

interface UseVoiceInputReturn {
  isSupported: boolean          // Web Speech API available
  isListening: boolean          // Currently recording
  isPermissionDenied: boolean   // Mic permission was denied
  startListening: () => void    // Start speech recognition
  stopListening: () => void     // Stop speech recognition
}
```

Implementation details:

1. **Feature detection**: Check `'SpeechRecognition' in window || 'webkitSpeechRecognition' in window` on mount. Set `isSupported` accordingly.

2. **SpeechRecognition setup** (in `startListening`):
   - Create new `SpeechRecognition` instance (with webkit prefix fallback)
   - Set `continuous = true`, `interimResults = true`, `lang = 'en-US'`
   - Attach event handlers: `onresult`, `onerror`, `onend`

3. **`onresult` handler**:
   - Iterate through `event.results` starting from `event.resultIndex`
   - Collect all finalized transcripts (where `result.isFinal === true`) — concatenate and call `onTranscript` with the finalized text (space-separated)
   - Collect current interim transcript — call `onInterimUpdate` with it
   - If appending would exceed `maxLength`, truncate the transcript to fit, call `onMaxLengthReached`, and stop listening

4. **`onerror` handler**:
   - If `event.error === 'not-allowed'`: set `isPermissionDenied = true`, set `isListening = false`
   - Other errors: set `isListening = false` (graceful return to idle)

5. **`onend` handler**:
   - Set `isListening = false`
   - If `continuous` was set and user didn't explicitly stop, the browser may auto-end on silence — this is fine, just update state

6. **`stopListening`**: Call `recognition.stop()`, set `isListening = false`

7. **Cleanup**: On unmount, call `recognition.abort()` if listening

8. **Ref management**: Store SpeechRecognition instance in a `useRef` to avoid recreation. Store `isPermissionDenied` in a `useRef` (persists for session, not re-prompted).

**Guardrails (DO NOT):**
- Do NOT use any external speech-to-text APIs (OpenAI Whisper, Google Cloud Speech, etc.)
- Do NOT store audio data — this is text transcription only
- Do NOT retry after permission denied — disable permanently for the session
- Do NOT import any component-specific code — this hook must be purely about the Web Speech API

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns isSupported=false when SpeechRecognition not available | unit | Mock window without SpeechRecognition |
| Returns isSupported=true when SpeechRecognition available | unit | Mock window.SpeechRecognition |
| startListening creates recognition and starts | unit | Verify recognition.start() called |
| stopListening stops recognition | unit | Verify recognition.stop() called |
| Calls onTranscript with final transcript text | unit | Simulate onresult event with isFinal=true |
| Calls onInterimUpdate with interim text | unit | Simulate onresult event with isFinal=false |
| Sets isPermissionDenied on not-allowed error | unit | Simulate onerror with 'not-allowed' |
| Returns to idle on other errors | unit | Simulate onerror with 'network' |
| Truncates transcript when maxLength reached | unit | Set maxLength, simulate long transcript |
| Calls onMaxLengthReached when truncated | unit | Verify callback invoked |
| Cleans up on unmount | unit | Verify abort called |

**Expected state after completion:**
- [ ] `useVoiceInput` hook is functional and tested
- [ ] Feature detection works for both `SpeechRecognition` and `webkitSpeechRecognition`
- [ ] All error states handled gracefully

---

### Step 4: Integrate Voice Input into JournalTabContent

**Objective:** Add the mic button to the journal textarea with full visual states, toast messages, accessibility, and integration with existing features.

**Files to modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — Add mic button, move character counter, wire up hook

**Details:**

#### 4a. Imports

Add to existing imports:
```typescript
import { Mic, MicOff } from 'lucide-react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useAnnounce } from '@/hooks/useAnnounce'
```

#### 4b. Hook Setup

Inside the component, after existing hooks:

```typescript
const { announce, AnnouncerRegion } = useAnnounce()

const {
  isSupported: isVoiceSupported,
  isListening,
  isPermissionDenied,
  startListening,
  stopListening,
} = useVoiceInput({
  onTranscript: (transcript) => {
    setText((prev) => {
      const separator = prev && !prev.endsWith(' ') ? ' ' : ''
      return prev + separator + transcript
    })
  },
  maxLength: 5000 - text.length,  // Remaining character budget
  onMaxLengthReached: () => {
    showToast('Character limit reached.', 'warning')
  },
})
```

#### 4c. Toggle Handler

```typescript
const handleVoiceToggle = () => {
  if (isListening) {
    stopListening()
    showToast('Voice captured.', 'success')
    announce('Recording stopped')
  } else {
    startListening()
    showToast('Listening... speak your heart.', 'success')
    announce('Recording started')
  }
}
```

#### 4d. Move Character Counter

Change the character counter positioning from `absolute bottom-2 right-3` to `absolute bottom-2 left-3`:

```tsx
<span
  id="journal-char-count"
  className="absolute bottom-2 left-3 text-xs text-text-light/60"
  aria-live={text.length >= 4500 ? 'polite' : 'off'}
  role="status"
>
  {text.length.toLocaleString()}/5,000
</span>
```

#### 4e. Add Bottom Padding to Textarea

Add `pb-10` to the textarea className to prevent text from flowing behind the mic button:

```tsx
className="min-h-[200px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 pb-10 pt-3 font-serif text-lg leading-relaxed text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
```

(Change `py-3` to `pb-10 pt-3`)

#### 4f. Mic Button Rendering

Add the mic button inside the `<div className="relative mb-2">` container, after the character counter `<span>`, before the closing `</div>`:

```tsx
{isAuthenticated && isVoiceSupported && (
  <button
    type="button"
    onClick={handleVoiceToggle}
    disabled={isPermissionDenied}
    className={cn(
      'absolute bottom-2 right-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      isPermissionDenied
        ? 'cursor-not-allowed opacity-40'
        : isListening
          ? 'bg-red-500/20 text-red-400 motion-safe:animate-mic-pulse'
          : 'bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/70',
    )}
    aria-label={
      isPermissionDenied
        ? 'Voice input unavailable — microphone access denied'
        : isListening
          ? 'Stop voice input'
          : 'Start voice input'
    }
  >
    {isListening ? (
      <>
        <MicOff className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
      </>
    ) : (
      <Mic className="h-5 w-5" />
    )}
  </button>
)}
```

Key details:
- **Auth gating**: Only rendered when `isAuthenticated` is true
- **Feature detection**: Only rendered when `isVoiceSupported` is true
- **Disabled state**: `isPermissionDenied` makes button non-interactive with `opacity-40 cursor-not-allowed`
- **Active recording**: Red styling with pulsing animation (`motion-safe:animate-mic-pulse` — respects `prefers-reduced-motion`)
- **Red dot**: `absolute -right-0.5 -top-0.5` on the button — small red circle indicating active recording
- **Touch target**: `min-h-[44px] min-w-[44px]` ensures 44px minimum on all devices
- **Focus ring**: Standard pattern `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

#### 4g. Permission Denied Toast

In the `useVoiceInput` hook's error handling, the `isPermissionDenied` state is set. But the toast needs to fire once. Add a `useEffect` in JournalTabContent:

```typescript
const prevPermissionDenied = useRef(false)
useEffect(() => {
  if (isPermissionDenied && !prevPermissionDenied.current) {
    showToast('Microphone access is needed for voice input. Check your browser settings.', 'error')
    prevPermissionDenied.current = true
  }
}, [isPermissionDenied, showToast])
```

#### 4h. AnnouncerRegion Placement

Add `<AnnouncerRegion />` inside the component's return, near the top (inside the root div):

```tsx
<AnnouncerRegion />
```

**Auth gating:**
- Mic button rendered only when `isAuthenticated === true` AND `isVoiceSupported === true`
- Logged-out users see no mic button — no auth modal triggered, button simply absent

**Responsive behavior:**
- Desktop (1440px): Same positioning. Hover states active.
- Tablet (768px): Same positioning. No layout changes.
- Mobile (375px): Same absolute positioning. 44px touch target critical. Button doesn't overlap character counter (opposite corners).

**Guardrails (DO NOT):**
- Do NOT replace the existing textarea with a contentEditable div
- Do NOT modify the auto-save draft logic — it works automatically because `setText()` triggers the existing useEffect
- Do NOT add new crisis detection wiring — `CrisisBanner text={text}` already handles voice-appended text
- Do NOT modify the Guided mode prompt card or its behavior
- Do NOT add the mic button to the Pray tab textarea (out of scope per spec)
- Do NOT add new localStorage keys
- Do NOT use `dangerouslySetInnerHTML` for interim text display
- Do NOT show the mic button during the reflection view (it's on the textarea which is separate from saved entries, so this is automatically satisfied)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Mic button not rendered when logged out | integration | Set `wr_auth_simulated` to false, verify `queryByLabelText('Start voice input')` returns null |
| Mic button not rendered when SpeechRecognition unavailable | integration | Remove window.SpeechRecognition, verify button absent |
| Mic button rendered for authenticated user with SpeechRecognition | integration | Auth + mock SpeechRecognition, verify button present |
| Mic button toggles between Mic/MicOff icons | integration | Click button, verify icon changes |
| Starting recording shows success toast | integration | Click mic, verify toast "Listening... speak your heart." |
| Stopping recording shows success toast | integration | Click mic twice, verify toast "Voice captured." |
| Permission denied shows error toast and disables button | integration | Mock onerror with 'not-allowed', verify toast + disabled state |
| Voice text appends to existing textarea content | integration | Type text, then simulate voice transcript, verify both present |
| Character counter moved to bottom-left | integration | Verify counter has left positioning |
| Aria-label changes with state | integration | Verify dynamic aria-label for idle/recording/disabled |
| Recording start announced to screen readers | integration | Verify announce region content |
| Recording stop announced to screen readers | integration | Verify announce region content |
| Mic button visible in both Guided and Free Write modes | integration | Toggle modes, verify button present in both |

**Expected state after completion:**
- [ ] Mic button visible in journal textarea for authenticated users with Web Speech API support
- [ ] Button toggles between idle/recording states with correct visual styling
- [ ] Voice text appends to textarea (never replaces)
- [ ] Character counter at bottom-left, mic button at bottom-right
- [ ] All toast messages fire at correct times
- [ ] Crisis detection works on voice-transcribed text (via existing mechanism)
- [ ] Auto-save draft triggers for voice-appended text (via existing mechanism)
- [ ] Accessibility: aria-labels, keyboard focus, screen reader announcements, 44px touch target
- [ ] `prefers-reduced-motion` disables pulse animation but preserves red styling

---

### Step 5: Write Tests for `useVoiceInput` Hook

**Objective:** Comprehensive unit tests for the voice input hook.

**Files to create:**
- `frontend/src/hooks/__tests__/useVoiceInput.test.ts`

**Details:**

Create a mock `SpeechRecognition` class for testing:

```typescript
class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
}
```

Assign to `window.SpeechRecognition` in test setup, delete in teardown.

Use `renderHook` from `@testing-library/react` to test the hook in isolation.

Test cases (from Step 3 test specifications):
1. `isSupported` returns false when SpeechRecognition not in window
2. `isSupported` returns true when SpeechRecognition available
3. `startListening` creates recognition instance and calls `.start()`
4. `stopListening` calls recognition `.stop()`
5. Final transcript calls `onTranscript` with text
6. Interim result calls `onInterimUpdate`
7. `onerror` with 'not-allowed' sets `isPermissionDenied`
8. `onerror` with 'network' returns to idle without permission denied
9. When transcript + existing text exceeds `maxLength`, truncates and calls `onMaxLengthReached`
10. On unmount, calls `.abort()` if listening
11. Multiple final results concatenated with spaces

**Guardrails (DO NOT):**
- Do NOT test actual browser SpeechRecognition (use mocks)
- Do NOT import React components — this tests the hook in isolation

**Expected state after completion:**
- [ ] All 11+ test cases pass
- [ ] Mock SpeechRecognition simulates realistic event flow
- [ ] Edge cases covered (permission denied, mid-recording errors, max length)

---

### Step 6: Write Integration Tests for Journal Voice Input

**Objective:** Integration tests verifying the mic button behavior within JournalTabContent.

**Files to modify:**
- `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` — Add new `describe('Voice Input')` block

**Details:**

Add a `describe('Voice Input', () => { ... })` block to the existing test file. Setup:

```typescript
describe('Voice Input', () => {
  let MockRecognition: any

  beforeEach(() => {
    MockRecognition = vi.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
    }))
    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockRecognition,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    delete (window as any).SpeechRecognition
  })
})
```

Test cases (from Step 4 test specifications):
1. **Not rendered when logged out**: Set auth to false, verify no mic button
2. **Not rendered without SpeechRecognition**: Delete window.SpeechRecognition, verify absent
3. **Rendered for authenticated user**: Verify `getByLabelText('Start voice input')` exists
4. **Present in both Guided and Free Write**: Toggle mode, verify button present
5. **Toggle icon on click**: Click button → verify MicOff icon (or aria-label change to "Stop voice input")
6. **Start recording toast**: Click mic → verify "Listening... speak your heart." toast
7. **Stop recording toast**: Click mic twice → verify "Voice captured." toast
8. **Permission denied toast + disabled**: Simulate error → verify error toast + `aria-label="Voice input unavailable — microphone access denied"` + disabled attribute
9. **Voice text appends**: Simulate typing "Hello" then voice "world" → textarea value is "Hello world"
10. **Aria-label states**: Verify all 3 aria-label values (idle, recording, disabled)
11. **Screen reader announcements**: Check `data-testid="announce-polite"` or `data-testid="announce-assertive"` for "Recording started"/"Recording stopped"
12. **Character counter position**: Verify the counter element doesn't have `right-3` class (moved to `left-3`)

**Guardrails (DO NOT):**
- Do NOT test SpeechRecognition internals (those are in Step 5)
- Do NOT duplicate existing JournalTabContent tests — only add voice-specific tests
- Do NOT modify existing tests

**Expected state after completion:**
- [ ] All new voice input tests pass
- [ ] All existing JournalTabContent tests still pass
- [ ] Coverage for auth gating, feature detection, visual states, toast messages, text appending, accessibility

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add warning toast type |
| 2 | — | Add mic-pulse animation |
| 3 | — | Create useVoiceInput hook |
| 4 | 1, 2, 3 | Integrate voice input into JournalTabContent |
| 5 | 3 | Write useVoiceInput hook tests |
| 6 | 4 | Write JournalTabContent integration tests |

Steps 1, 2, and 3 are independent and can be executed in parallel.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add Warning Toast Type | [COMPLETE] | 2026-03-20 | `Toast.tsx`: Added 'warning' to StandardToastType, amber border-l-warning styling, data-toast-type attr |
| 2 | Add Mic-Pulse Animation | [COMPLETE] | 2026-03-20 | `tailwind.config.js`: Added mic-pulse keyframe (scale 1→1.1→1) and animation (1s infinite) |
| 3 | Create useVoiceInput Hook | [COMPLETE] | 2026-03-20 | Created `frontend/src/hooks/useVoiceInput.ts` — SpeechRecognition + webkitSpeechRecognition detection, permission handling, transcript management |
| 4 | Integrate into JournalTabContent | [COMPLETE] | 2026-03-20 | `JournalTabContent.tsx`: Added Mic/MicOff imports, useVoiceInput + useAnnounce hooks, voice toggle handler, permission denied effect, AnnouncerRegion, moved char counter to left, added pb-10 to textarea, mic button with auth gating + feature detection. Voice block placed after text state to avoid TDZ error. |
| 5 | useVoiceInput Hook Tests | [COMPLETE] | 2026-03-20 | Created `frontend/src/hooks/__tests__/useVoiceInput.test.ts` — 13 tests covering feature detection, start/stop, transcripts, interim updates, permission denied, errors, maxLength truncation, unmount cleanup, natural end |
| 6 | JournalTabContent Integration Tests | [COMPLETE] | 2026-03-20 | Added 12 tests in `describe('Voice Input')` block: auth gating (logged out, no SpeechRecognition), rendering, mode toggle, aria-label states, toast messages, permission denied, text appending, char counter position, screen reader announcements |
