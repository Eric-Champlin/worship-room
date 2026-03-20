# Feature: Journal Voice Input

## Overview

Many users come to the Journal tab during vulnerable emotional moments when typing feels like an obstacle — especially on mobile, where small keyboards and autocorrect can interrupt the flow of honest reflection. Voice input removes that friction by letting users speak their thoughts directly into the journal textarea using the Web Speech API. This feature is especially aligned with Worship Room's mission of accessible emotional healing: when someone is struggling, the ability to simply speak what's on their heart — rather than carefully typing it — can be the difference between capturing an honest moment and abandoning the entry entirely.

The microphone button lives inside the journal textarea (bottom-right corner), streams speech into text in real-time, and integrates seamlessly with every existing journal feature: auto-save drafts, character counting, crisis detection, and AI reflection.

## User Stories

- As a **logged-in user**, I want to tap a microphone button and speak my journal entry so that I can express what's on my heart without the friction of typing — especially on mobile.
- As a **logged-in user**, I want to see my spoken words appear in real-time in the textarea so that I know the voice recognition is working and I can correct anything as I go.
- As a **logged-in user**, I want to freely combine typing and voice input in the same entry so that I can start typing and then switch to speaking (or vice versa) without losing anything.

## Requirements

### Microphone Button

1. **Location**: Positioned inside the journal textarea's bottom-right corner, absolutely positioned within the textarea's container (same positioning pattern as the character counter but on the opposite side — bottom-right vs bottom-left).

2. **Feature detection**: The button is only rendered if the browser supports the Web Speech API. Detect via `'SpeechRecognition' in window || 'webkitSpeechRecognition' in window`. If the API is not available, the button is completely hidden — no placeholder, no tooltip, no message.

3. **Auth gating**: The microphone button is only visible to logged-in users. Logged-out users do not see the mic button (since journal saving requires auth, and voice input without saving has limited value). This matches the existing auth-gated save behavior.

4. **Context visibility**: The mic button only appears during active journal writing — both Guided and Free Write modes. It does NOT appear during the "Reflect on my entry" AI reflection view.

5. **Idle state visual**:
   - Icon: Lucide `Mic`
   - Styling: `bg-white/10 rounded-full p-2 text-white/50 hover:text-white/70 hover:bg-white/15`
   - Transition on hover

6. **Active recording state visual**:
   - Icon: Lucide `MicOff`
   - A pulsing red dot indicator adjacent to or overlaid on the button to signal active recording
   - Styling: `bg-red-500/20 text-red-400`
   - Pulsing animation: scale 1 to 1.1 over 1 second, looping infinitely
   - Animation respects `prefers-reduced-motion`: when reduced motion is preferred, the pulse animation is disabled (the button still shows the active recording styling and red dot, just without the scale animation)

7. **Touch target**: Minimum 44px touch target on all devices, critical for mobile usability.

### Voice Recognition Behavior

8. **API configuration**: Use `SpeechRecognition` (or `webkitSpeechRecognition`) with:
   - `continuous = true` (keeps listening until explicitly stopped)
   - `interimResults = true` (streams partial results as the user speaks)
   - `lang = "en-US"`

9. **Appending behavior**: When speech is recognized, append the final transcript to the current textarea value with a space separator. Never replace existing text — always append. This allows the user to type a sentence, then speak a sentence, then type again, building a seamless mixed-input entry.

10. **Interim results display**: While the user is speaking, show interim (not-yet-confirmed) results in a visually distinct way:
    - Interim text appears appended after the committed text in the textarea
    - Interim text is displayed at reduced opacity (`text-white/40`) to distinguish it from confirmed text
    - When the speech engine confirms the result (final transcript), the interim text is replaced with the final text at full opacity

11. **Starting recording**: When the user taps the mic button to start recording:
    - The mic button transitions to the active recording state
    - A brief success-tier toast appears: "Listening... speak your heart."
    - Recognition begins

12. **Stopping recording**: When the user taps the mic button again OR a silence timeout ends the session:
    - The mic button transitions back to idle state
    - A brief success-tier toast appears: "Voice captured."
    - Any pending interim text is finalized

13. **Microphone permission denied**: If the browser blocks microphone access (user denies the permission prompt or has previously blocked it):
    - Show an error-tier toast: "Microphone access is needed for voice input. Check your browser settings."
    - The mic button becomes visually disabled: reduced opacity, non-interactive, cursor not-allowed
    - The button remains in the disabled state for the remainder of the session (do not repeatedly prompt)

### Integration with Existing Journal Features

14. **Auto-save draft**: Voice-appended text triggers the same 1-second debounce auto-save mechanism that typing triggers. The textarea value changes via the same state update path, so auto-save works identically regardless of input method.

15. **Character counter**: Voice-transcribed text counts toward the 5,000-character limit. If the current text plus incoming speech would exceed the limit:
    - Stop the recognition session automatically
    - Truncate the incoming transcript to fit within the remaining character budget
    - The existing character counter warning behavior applies (visual warning near the limit)
    - Show a toast: "Character limit reached."

16. **Crisis detection**: Voice-transcribed text is added to the textarea value through the same state update as typing, which means the existing `CrisisBanner` keyword detection automatically processes it. No additional crisis detection wiring is needed — the existing mechanism handles it.

17. **Guided mode prompts**: In Guided mode, the prompt card is still visible above the textarea. Voice input appends to the textarea below the prompt, identical to typing. The voice input does not interact with or modify the prompt itself.

## Auth Gating

### Logged-out users:
- **Cannot see the microphone button** at all — it is not rendered
- The journal textarea remains visible and typeable (existing behavior), but the mic button is absent
- No auth modal is triggered by the mic button (it simply doesn't exist for logged-out users)

### Logged-in users:
- Can see the microphone button in the journal textarea
- Can start and stop voice recording freely
- Voice-transcribed text is subject to the same save flow as typed text (save button, auth is already confirmed)

### No new auth modal messages are introduced by this feature.

## UX & Design Notes

### Button Positioning
- The textarea container must be `position: relative` to anchor the absolute mic button
- Mic button: `position: absolute; bottom: 8px; right: 8px` (or equivalent Tailwind: `absolute bottom-2 right-2`)
- If the character counter occupies the bottom-left, the mic button in the bottom-right creates a balanced layout
- The button should not overlap the textarea's text content — add sufficient bottom padding to the textarea to prevent text from flowing behind the button

### Toast Messages
- "Listening... speak your heart." — success tier, standard auto-dismiss duration
- "Voice captured." — success tier, standard auto-dismiss duration
- "Microphone access is needed for voice input. Check your browser settings." — error tier, longer auto-dismiss
- "Character limit reached." — warning tier, standard auto-dismiss

### Visual Hierarchy
- The mic button is secondary to the textarea itself — it should be subtle when idle (low opacity, small), becoming prominent only when actively recording
- The pulsing red animation draws attention during recording so the user remembers to stop it
- Interim text at reduced opacity creates a clear visual distinction between "what I've said so far" (confirmed) and "what I'm currently saying" (interim)

### Animations
- Pulse animation on the recording button: `scale(1)` to `scale(1.1)` over 1 second, ease-in-out, infinite loop
- This is a **new animation pattern** — not covered by existing Tailwind animation utilities. It will need a custom keyframe definition.
- `prefers-reduced-motion`: Disable the pulse animation entirely. The red dot and red styling still indicate active recording without motion.

## Responsive Behavior

### Mobile (< 640px)
- The mic button is especially valuable on mobile (typing on phone keyboards is slow and error-prone for emotional content)
- Button uses the same absolute positioning within the textarea — bottom-right corner
- 44px minimum touch target ensures easy tapping
- On very small screens, ensure the button doesn't overlap with the character counter (they're on opposite sides, so this should be fine)

### Tablet (640px - 1024px)
- Same layout as mobile — button inside textarea, bottom-right
- No layout changes needed at this breakpoint

### Desktop (> 1024px)
- Same layout — button inside textarea, bottom-right
- Hover states are active (hover:text-white/70, hover:bg-white/15)
- Users with desktop microphones can use voice input, but it's expected to be used less frequently than on mobile

### All breakpoints
- The button position is the same across all breakpoints (absolute bottom-right of textarea)
- No reflow or repositioning needed — the textarea itself is already responsive, and the absolute-positioned button moves with it

## AI Safety Considerations

- **Crisis detection needed?**: Yes — but NO additional implementation is required. Voice-transcribed text is appended to the textarea value, which already goes through the `CrisisBanner` keyword detection. The existing crisis detection pipeline covers voice input automatically.
- **User input involved?**: Yes — the user is speaking words that become text in the textarea. This text follows the exact same path as typed text and is subject to the same 5,000-character limit, crisis detection, and content policies.
- **AI-generated content?**: No — voice input is user-generated. The transcription is performed by the browser's built-in Web Speech API, not by an AI service.

## Auth & Persistence

- **Logged-out (demo mode)**: The mic button is not rendered. Zero persistence — no new state, no new localStorage keys. The existing textarea behavior is unchanged for logged-out users.
- **Logged-in**: Voice-transcribed text is ephemeral textarea state until the user explicitly saves. The auto-save draft mechanism (existing) persists the draft to localStorage as the user speaks. No new localStorage keys are introduced.
- **Route type**: Public (the Journal tab at `/daily?tab=journal` is public, but the mic button is only rendered for logged-in users)

### localStorage Keys

No new localStorage keys. Voice input writes to the textarea value, which flows through existing auto-save draft logic using the existing `wr_journal_draft` key (or equivalent).

## Accessibility

- **Button labels**: The mic button has an `aria-label` that reflects its current state:
  - Idle: `aria-label="Start voice input"`
  - Recording: `aria-label="Stop voice input"`
  - Disabled (permission denied): `aria-label="Voice input unavailable — microphone access denied"`
- **Live region for interim text**: If interim results are displayed as a separate visual element (not inline in the textarea), use `aria-live="polite"` so screen readers announce the transcription progress without being disruptive
- **Recording state announcement**: When recording starts, announce "Recording started" via an `aria-live` region. When recording stops, announce "Recording stopped."
- **Keyboard accessible**: The mic button is focusable via Tab and activatable via Enter or Space
- **Touch target**: 44px minimum on all devices
- **Reduced motion**: Pulse animation disabled when `prefers-reduced-motion: reduce` is active. The red styling and dot still indicate recording state.
- **Focus visible**: The mic button shows a visible focus ring when focused via keyboard (matching existing focus ring patterns)

## Acceptance Criteria

### Feature Detection & Visibility
- [ ] Mic button is not rendered in browsers that lack Web Speech API support
- [ ] Mic button is not rendered for logged-out users
- [ ] Mic button appears inside the journal textarea at the bottom-right corner
- [ ] Mic button appears in both Guided and Free Write journal modes
- [ ] Mic button does NOT appear during the "Reflect on my entry" AI reflection view

### Idle State
- [ ] Idle button shows Lucide `Mic` icon
- [ ] Idle button styling: `bg-white/10 rounded-full p-2 text-white/50`
- [ ] Idle button hover: `hover:text-white/70 hover:bg-white/15`

### Active Recording State
- [ ] Tapping the mic button starts recording and changes icon to Lucide `MicOff`
- [ ] Active state shows red dot indicator
- [ ] Active state styling: `bg-red-500/20 text-red-400`
- [ ] Active state has a pulsing scale animation (1 to 1.1, 1s loop)
- [ ] Pulse animation is disabled when `prefers-reduced-motion` is active (red styling and dot still visible)

### Voice Recognition
- [ ] Speech recognition uses `continuous=true` and `interimResults=true`
- [ ] Speech recognition language is set to `en-US`
- [ ] Recognized text is appended to existing textarea content with a space separator (never replaces)
- [ ] Interim results display at reduced opacity (`text-white/40`) and are replaced by final results
- [ ] User can freely combine typing and voice input in the same entry

### Toasts
- [ ] Starting recording shows success toast: "Listening... speak your heart."
- [ ] Stopping recording shows success toast: "Voice captured."
- [ ] Microphone permission denied shows error toast: "Microphone access is needed for voice input. Check your browser settings."
- [ ] Hitting character limit during recording shows warning toast: "Character limit reached."

### Integration
- [ ] Voice-appended text triggers the existing 1-second debounce auto-save draft
- [ ] Voice-appended text counts toward the 5,000-character limit
- [ ] When character limit is reached during recording, recognition stops automatically and transcript is truncated to fit
- [ ] Voice-transcribed text triggers existing `CrisisBanner` keyword detection (no new wiring needed)
- [ ] In Guided mode, voice input appends to the textarea without affecting the prompt card

### Error Handling
- [ ] If microphone permission is denied, mic button becomes visually disabled (reduced opacity, non-interactive)
- [ ] Disabled state persists for the remainder of the session (no repeated permission prompts)
- [ ] If SpeechRecognition errors occur mid-recording, the button returns to idle state gracefully

### Accessibility
- [ ] Mic button has dynamic `aria-label` reflecting current state (idle / recording / disabled)
- [ ] Recording start/stop is announced via `aria-live` region
- [ ] Button is keyboard-focusable (Tab) and activatable (Enter/Space)
- [ ] Touch target is at least 44px on all devices
- [ ] Focus ring is visible on keyboard focus
- [ ] Reduced motion disables only the animation, not the visual state indicators

### Responsive
- [ ] Button is positioned consistently (bottom-right of textarea) across mobile, tablet, and desktop
- [ ] Button does not overlap with the character counter (opposite corners)
- [ ] Textarea has sufficient bottom padding to prevent text from flowing behind the button

## Out of Scope

- **Speech-to-text via external API (OpenAI Whisper, Google Speech, etc.)**: This feature uses the browser's built-in Web Speech API only. Server-side transcription is a future enhancement for browsers without Web Speech API support.
- **Multiple language support**: Voice recognition is hardcoded to `en-US`. Multi-language support is a post-MVP enhancement.
- **Voice commands ("save entry", "new line", "delete last sentence")**: Only dictation is supported — no voice command parsing.
- **Continuous background recording**: Recording only happens while the mic button is in active state. There is no ambient/always-on listening.
- **Recording indicator in the browser tab**: The browser natively shows a microphone indicator in the tab when the Web Speech API is active — no custom tab indicator is needed.
- **Audio playback of recorded speech**: This is text transcription only. The raw audio is not saved or playable.
- **Offline voice recognition**: Web Speech API typically requires an internet connection for server-side speech processing. Offline fallback is not in scope.
- **Custom wake word**: No "Hey Worship Room" activation. Users must manually tap the mic button.
- **Voice input on the Pray tab textarea**: This spec covers only the Journal tab. Extending to Pray tab is a separate feature.
- **Backend speech processing**: All transcription happens client-side via the browser. No backend endpoint is introduced.
