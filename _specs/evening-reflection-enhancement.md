# Feature: Evening Reflection Enhancement

**Master Plan Reference:** N/A — enhancement of existing feature (original spec: `_specs/evening-reflection-prompt.md`)

---

## Overview

The Evening Reflection is the ritual anchor of the user's day — the moment they close their spiritual practice before sleep. Currently it's functional but flat: a 4-step form (mood, highlights, gratitude, static prayer) with no ambient atmosphere, no connection to the morning, and no personalization. This spec transforms it into an immersive evening wind-down ritual with ambient sound, morning gratitude recall, a personalized closing prayer, a completion sound, and a seamless bridge to Sleep & Rest content. A user who ends their day well in the app is far more likely to return tomorrow morning.

---

## User Stories

- As a **logged-in user**, I want ambient sound to auto-play when I start my evening reflection so that the experience feels like an atmosphere, not a form.
- As a **logged-in user**, I want to see what I was grateful for this morning so that my evening reflection connects to my whole day.
- As a **logged-in user**, I want my closing prayer to reference what I actually did today so that the prayer feels personal and specific to my day.
- As a **logged-in user**, I want a gentle sound when I finish my evening reflection so that there's a clear emotional signal marking the end of my day's spiritual practice.
- As a **logged-in user**, I want a smooth transition from the Evening Reflection to Sleep & Rest content so that my spiritual wind-down flows naturally into rest.

---

## Requirements

### 1. Ambient Sound Auto-Play on Reflection Open

When the Evening Reflection overlay opens (after the user taps "Start Evening Peace"), automatically start playing a gentle ambient sound to set the atmosphere.

**Behavior:**
- Play a calming scene preset (e.g., "Still Waters" or "Midnight Rain") at `0.3` master volume (soft background)
- Fade in over 2 seconds
- Continue playing through all 4 steps
- Fade out over 3 seconds when the reflection closes (via "Done" or Sleep transition)

**Guard conditions (do NOT auto-play if any are true):**
- User has `wr_sound_effects_enabled` set to `false`
- User already has ambient sound playing (don't override their current selection)
- Browser autoplay fails silently (reflection still functions normally without sound)

**Browser autoplay note:** The "Start Evening Peace" button click counts as a user interaction, satisfying browser autoplay policies. If autoplay still fails silently, that's acceptable — the reflection works without sound.

### 2. Morning Gratitude Recall (Step 2 Enhancement)

In Step 2 (Highlights), surface one of the user's morning gratitude entries as a gentle reminder of how their day started.

**Detection logic:**
- Read today's entries from `wr_gratitude_entries`
- Pick the most specific entry (longest by character count)
- If no morning gratitude exists for today, skip this enhancement entirely — Step 2 remains unchanged

**Display — inline card above the highlights textarea:**
- Label: "This morning, you were grateful for:" in subtle secondary text
- The gratitude entry displayed in quotes, Lora italic serif font
- Follow-up prompt: "How did the rest of your day unfold?"
- Then the existing highlights textarea below

**Animation:** Fade in (300ms) when Step 2 becomes active. No animation if `prefers-reduced-motion`.

### 3. Personalized Closing Prayer (Step 4 Enhancement)

Replace the static closing prayer with a dynamically assembled prayer that references the user's completed activities and evening mood.

**Prayer structure:**
```
Lord, thank you for this day.

[1-3 activity-specific lines based on today's completed activities]

[Evening mood-specific line based on Step 1 mood selection]

As I rest tonight, I trust You with everything I carry.
Give me peaceful sleep and a heart ready for tomorrow.
In Jesus' name, Amen.
```

**Activity-specific lines (include up to 3, selected by priority):**

| Priority | Activity | Line |
|----------|----------|------|
| 1 | Devotional read | "Thank you for meeting me in Your Word this morning." |
| 2 | Bible chapter read | "Thank you for the time I spent in Your Word today." |
| 3 | Prayer generated | "Thank you for hearing my prayers today." |
| 4 | Journal entry saved | "Thank you for the space to pour out my heart in my journal." |
| 5 | Meditation completed | "Thank you for the stillness I found in meditation." |
| 6 | Prayer Wall posted | "Thank you for the courage to share my heart with others." |
| 7 | Community challenge day completed | "Thank you for another step in this journey." |
| 8 | Gratitude logged | "Thank you for opening my eyes to the blessings around me." |

**If no activities were completed today:** Use generic line: "Thank you for bringing me through this day, even the parts I can't put into words."

**Evening mood-specific lines:**

| Mood | Line |
|------|------|
| Struggling | "I'm hurting tonight, Lord. Hold me close as I sleep." |
| Heavy | "This day was heavy, but You carried me through. I give it all to You." |
| Okay | "Today was ordinary, and that's okay. Thank you for the quiet blessings." |
| Good | "I felt Your goodness today. Let this peace carry into my dreams." |
| Thriving | "My heart is full tonight. Thank you for this beautiful day." |

**If mood was not selected in Step 1:** Omit the mood line entirely.

**Rendering:** Prayer text in Lora italic (`font-serif italic text-white/80`) — consistent with scripture/prayer styling throughout the app.

### 4. Closing Sound Effect

When the user taps "Done" to close the Evening Reflection, play a gentle completion sound.

- Use the `whisper` sound effect (softer and more appropriate for a bedtime context than `bell`)
- Play on "Done" button click, as the overlay begins its close animation
- Only play if `wr_sound_effects_enabled` is `true` and `prefers-reduced-motion` is `false`

### 5. Sleep & Rest Transition Enhancement

The "Go to Sleep & Rest" button in Step 4 navigates to `/music?tab=sleep`. Currently this is an abrupt page change.

**Enhanced behavior:**
- Fade out the Evening Reflection overlay (500ms)
- Fade out ambient audio over 1 second (if auto-playing)
- Then navigate to `/music?tab=sleep`
- A brief silence between reflection and sleep is acceptable

### 6. Unchanged Behavior

These aspects remain exactly as they are:
- Trigger timing (after 6 PM)
- Step 1: Evening mood selector (same orbs, same interaction)
- Step 3: Gratitude inputs (3 inputs with rotating placeholders)
- The "Start Evening Peace" button on the dashboard
- Streak-keeping behavior (evening reflection counts toward keeping the streak alive)
- `recordActivity('reflection')` call on completion
- `wr_evening_reflection` localStorage tracking
- The 4-step flow structure (mood -> highlights -> gratitude -> prayer)
- Mobile responsiveness of the overlay

---

## Auth Gating

The Evening Reflection is already fully auth-gated (it only appears on the dashboard for logged-in users). No new auth gates are needed.

| Action | Logged-Out Behavior | Logged-In Behavior |
|--------|--------------------|--------------------|
| Evening Reflection | Not visible (dashboard is auth-gated) | Full 4-step flow with all enhancements |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Overlay is full-width with `p-4` padding. Gratitude recall card stacks naturally. Prayer text wraps. All enhancements fit within the existing overlay dimensions. |
| Tablet (640-1024px) | Same as mobile — overlay is modal-style, centered. Slightly more breathing room. |
| Desktop (> 1024px) | Overlay is centered modal (max-width constrained). Gratitude recall card and prayer text have comfortable line lengths. |

The existing overlay is already responsive. The enhancements (gratitude recall card, personalized prayer) are simple text content that flows naturally within the existing layout at all breakpoints.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The closing prayer is template-assembled from hardcoded strings, not AI-generated. The highlights textarea and gratitude inputs are pre-existing and already have their own safety handling. No crisis detection changes needed.

---

## Auth & Persistence

- **Logged-out (demo mode):** Feature not visible (dashboard is auth-gated)
- **Logged-in:** No new localStorage keys. Reads from existing keys:
  - `wr_gratitude_entries` (read-only, for morning recall)
  - `wr_daily_activities` (read-only, for personalized prayer)
  - `wr_sound_effects_enabled` (read-only, for audio preference)
  - `wr_evening_reflection` (existing read/write for dismissal tracking)
- **Route type:** Protected (part of the Dashboard)

---

## Design Notes

- **Gratitude recall card styling:** `bg-white/[0.04] border border-white/10 rounded-xl p-4 mb-4` — matches the frosted glass dashboard card pattern from the design system
- **Gratitude entry text:** `text-white/80 text-base font-serif italic` (Lora italic) — consistent with scripture/prayer rendering throughout the app
- **Label text:** `text-white/50 text-sm` (Inter) — matches secondary text opacity standard
- **Prayer text:** `font-serif italic text-white/80` (Lora italic) — same as existing prayer and scripture text patterns
- **Closing prayer structure:** Opening and closing lines are static; middle section is dynamic. This creates a natural, familiar prayer rhythm while personalizing the heart of the prayer.
- **Sound choice:** `whisper` sound effect preferred over `bell` for bedtime context — softer, breathier, more aligned with the wind-down mood
- **Ambient volume:** `0.3` master volume is intentionally lower than the default `0.8` — the sound should be a background atmosphere, not a primary audio experience
- **Text opacity:** All text meets WCAG AA contrast requirements per the design system text opacity standards (`text-white/80` for primary content, `text-white/50` for labels)

---

## Out of Scope

- Changing the evening reflection trigger time (stays at 6 PM)
- Adding new steps to the reflection flow
- Evening reflection for logged-out users (stays auth-gated)
- Push notifications for evening reflection reminder (Phase 3)
- AI-generated closing prayers (Phase 3 — this spec uses template-based assembly)
- Sleep content changes (the Music sleep tab stays as-is)
- Morning gratitude widget changes (the GratitudeWidget stays as-is)
- Activity-specific lines mentioning devotional titles, book names, or challenge names by name (would require reading additional localStorage keys; deferred to keep the prayer builder simple)

---

## Acceptance Criteria

### Ambient Sound
- [ ] A gentle ambient sound auto-plays when the Evening Reflection opens (after "Start Evening Peace" click)
- [ ] Sound fades in over 2 seconds
- [ ] Sound continues through all 4 steps
- [ ] Sound fades out when the reflection closes (Done or Sleep transition)
- [ ] Sound does NOT auto-play if `wr_sound_effects_enabled` is `false`
- [ ] Sound does NOT override existing ambient playback
- [ ] If browser autoplay fails silently, the reflection still functions normally

### Morning Gratitude Recall
- [ ] If the user logged morning gratitude today, one entry appears above the Step 2 textarea in a subtle card
- [ ] The entry is displayed in quotes with Lora italic serif font (`font-serif italic text-white/80`)
- [ ] "How did the rest of your day unfold?" prompt follows the recall
- [ ] If no morning gratitude exists for today, the recall card is not shown (Step 2 is unchanged)
- [ ] The recall card fades in (300ms) when Step 2 becomes active
- [ ] `prefers-reduced-motion` disables the fade-in but content still shows

### Personalized Closing Prayer
- [ ] Step 4 prayer includes 1-3 activity-specific lines for completed activities from `wr_daily_activities`
- [ ] Activity lines are selected by priority order (devotional > Bible > prayer > journal > meditation > others)
- [ ] Maximum 3 activity lines shown (no wall of text)
- [ ] Evening mood line matches the mood selected in Step 1
- [ ] If no activities were completed, a gentle generic line is used instead
- [ ] If mood was skipped in Step 1, the mood line is omitted
- [ ] Prayer renders in Lora italic serif font (`font-serif italic text-white/80`)

### Closing Sound
- [ ] `whisper` sound effect plays when "Done" is tapped
- [ ] Sound respects `wr_sound_effects_enabled` and `prefers-reduced-motion`

### Sleep Transition
- [ ] "Go to Sleep & Rest" navigates to `/music?tab=sleep`
- [ ] Reflection overlay fades out (500ms) before navigation
- [ ] Ambient audio fades out (1s) during transition (no abrupt audio stop)

### General
- [ ] All 4 steps still function correctly (mood, highlights, gratitude, prayer)
- [ ] `recordActivity('reflection')` still fires on completion
- [ ] Streak tracking is unaffected
- [ ] Evening reflection still only appears after 6 PM
- [ ] Mobile (375px): all enhancements render correctly within the overlay
- [ ] Desktop (1440px): layout is clean, gratitude recall card is well-proportioned
- [ ] Existing Evening Reflection tests pass without regression

---

## Test Requirements

- Verify ambient sound dispatch on reflection open (mock audio hooks)
- Verify ambient sound does NOT play when sound effects are disabled
- Verify ambient sound does NOT play when audio is already active
- Verify morning gratitude recall shows when today's gratitude entries exist in `wr_gratitude_entries`
- Verify morning gratitude recall picks the longest entry
- Verify morning gratitude recall is hidden when no entries exist
- Verify personalized prayer includes activity-specific lines for completed activities
- Verify personalized prayer respects the 3-line maximum
- Verify personalized prayer includes mood-specific line matching Step 1 selection
- Verify personalized prayer uses generic line when no activities completed
- Verify personalized prayer omits mood line when mood was not selected
- Verify `whisper` sound plays on "Done" click (mock sound effects)
- Verify navigation to `/music?tab=sleep` on sleep transition
- Verify `recordActivity('reflection')` still fires
- Verify evening reflection still tracks in `wr_evening_reflection`
- Run existing Evening Reflection tests to verify no regressions
