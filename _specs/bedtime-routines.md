# Feature: Bedtime Routines — Builder, Playback Engine, Templates

## Overview

Bedtime Routines is the feature that turns Worship Room into a nightly ritual. Instead of manually starting a scene, then queuing up a scripture reading, then setting a sleep timer — users chain all of those steps into a single sequenced experience and launch it with one tap. Pre-built templates offer instant "start my bedtime" moments for new users, while the routine builder lets experienced users craft their own path to sleep. The playback engine handles everything: scene transitions, scripture/story layering over ambient sounds, transition gaps where the ambient "breathes up" between spoken content, and the final fade to silence.

This is the premium feature that makes users open Worship Room every single night. A floating pill shortcut on the Music page learns which routine the user prefers at bedtime and offers it as a one-tap launch. The entire experience is designed to remove friction from the moment a user decides "I want to go to sleep" to the moment ambient sounds are playing and a gentle voice is reading scripture.

This feature depends on: Audio Infrastructure (Spec 1), Ambient Sound Mixer (Spec 2), Scene Presets (Spec 3), Foreground Audio / Sleep Content (Spec 4), Sleep Timer (Spec 5), Music Page Shell (Spec 6), and Music User Features / StorageService (Spec 7).

---

## User Stories

- As a **logged-in user**, I want to start a pre-built bedtime routine with one tap so I can immediately begin winding down without assembling pieces manually.
- As a **logged-in user**, I want to build my own custom routine by sequencing scenes, scripture readings, and bedtime stories so I can create a sleep experience tailored to my personal rhythm.
- As a **logged-in user**, I want to reorder steps in my routine and adjust transition timing between them so I can fine-tune the pacing of my bedtime experience.
- As a **logged-in user**, I want smooth transitions between routine steps — ambient sounds breathing up between spoken content — so the experience feels seamless and intentional, not jarring.
- As a **logged-in user**, I want to skip forward to the next step during playback so I can move past content I'm not in the mood for tonight.
- As a **logged-in user**, I want the routine to end with a sleep timer that fades everything to silence so I naturally drift off without the audio running all night.
- As a **logged-in user**, I want to launch my nightly routine from a floating pill shortcut so I don't even need to navigate to the routines page.
- As a **logged-out visitor**, I want to browse routine templates so I can see the depth of the bedtime experience before creating an account.

---

## Requirements

### 1. Routine Data Model

A routine is an ordered sequence of steps, each referencing a piece of content (a scene, a scripture reading, or a bedtime story), with configurable transition gaps between steps and a sleep timer that governs how the experience ends.

**Routine properties:**
- Unique identifier
- User-given name
- Template flag (true for pre-built, false for user-created)
- Ordered list of steps
- Sleep timer configuration: duration in minutes and fade duration in minutes
- Created and updated timestamps

**Step properties:**
- Unique identifier
- Content type: scene, scripture, or story
- Content reference (ID of the scene, scripture reading, or bedtime story)
- Transition gap in minutes: the pause before this step begins (0 for the first step)

**Storage:** localStorage via StorageService (from Spec 7). Key: `wr_routines`.

### 2. Pre-Built Routine Templates

Three templates ship at launch. Users can clone and customize them but cannot edit or delete the originals.

**Template 1: "Evening Peace"** (the flagship — pill shortcut default for new users)
- Step 1: Still Waters scene (ambient warmup, no transition gap)
- Step 2: Psalm 23 scripture reading (2-minute transition gap)
- No third step — ambient continues after the reading
- Sleep Timer: 45 minutes, 15-minute fade
- Description: "Ease into rest with gentle streams, then let Psalm 23 carry you into God's peace."

**Template 2: "Scripture & Sleep"** (lean, focused)
- Step 1: Midnight Rain scene (no transition gap)
- Step 2: Random scripture from the "Comfort & Rest" collection (1-minute transition gap)
- Sleep Timer: 30 minutes, 10-minute fade
- Description: "Rain, scripture, and silence. A simple path to restful sleep."

**Template 3: "Deep Rest"** (long-form, immersive)
- Step 1: Garden of Gethsemane scene (no transition gap)
- Step 2: "Elijah and the Still Small Voice" bedtime story (5-minute transition gap)
- Sleep Timer: 90 minutes, 30-minute fade
- Description: "A deep journey through an ancient garden and a prophet's encounter with God's whisper. For nights when you need to fully let go."

### 3. Routine Builder Page

A dedicated page (not in the main nav dropdown) where users browse templates, manage their routines, and build custom routines.

**Access points:**
- Music hub page: "Your Routines" section in the personalization area (visible for logged-in users who have routines)
- Sleep & Rest tab: "Build a Bedtime Routine" CTA card below the browse content
- Pill shortcut: small "Edit" link next to the routine suggestion
- Direct URL navigation

**Page layout — Top: Existing Routines**
- Cards for each routine (user-created and templates combined)
- Each card shows: routine name, step count, total estimated duration, "Start" button
- User-created routines have a three-dot menu with: Edit, Duplicate, Delete
- Templates have a three-dot menu with: Clone (not Edit or Delete)
- Templates display a "Template" badge
- If no user-created routines exist: show only the 3 templates with "Clone & Customize" buttons

**Below: "Create Routine" Button**
Opens the builder interface.

**Builder Interface:**
- Vertical timeline/stepper layout
- Each step is a card in a vertical column showing:
  - Step number
  - Content type icon (scene, scripture, or story icon)
  - Content name (e.g., "Still Waters", "Psalm 23")
  - "Edit" button to change the content selection
  - "Remove" button to delete the step
  - Drag handle for reordering
- Between steps: transition timing control — "Wait __ minutes before next step" with a number input (default: 2 minutes)

**Adding a step:**
- "+ Add Step" button at the bottom of the step list
- Tapping opens a step-type selector: Scene, Scripture, or Story
- After selecting a type, a content picker shows available items of that type (reusing the browse card components from the scene presets, scripture readings, and bedtime stories catalogs)
- Selecting an item adds it as a new step

**Sleep timer configuration:**
- At the bottom of the builder, below all steps
- Timer duration selector (same style as the standalone sleep timer)
- Fade duration selector
- These values are part of the routine definition

**Saving:**
- "Save Routine" button at the bottom
- Name input (auto-generated from step names if not provided, e.g., "Still Waters + Psalm 23 Routine")
- Saved to localStorage via StorageService

**Editing:**
- Opening an existing routine in the builder loads all its steps
- "Save" overwrites the existing routine

**Cloning (for templates):**
- Creates a user-owned copy with " (Custom)" appended to the name
- Opens immediately in the builder for editing

**Deleting:**
- Confirmation dialog: "Delete [routine name]?"
- "Delete" (red) and "Cancel" buttons
- Permanent removal from localStorage

### 4. Routine Playback Engine

The engine that executes a routine's steps in sequence, managing audio transitions and timing.

**Starting a routine:**
1. User taps "Start" on a routine card or the pill shortcut
2. The routine state is loaded into the audio system: routine ID, current step index (starting at 0), and the full step list
3. Step 1 begins executing

**Step execution by content type:**
- **Scene:** Load the scene's sounds at their preset volumes. If a different scene is already playing, crossfade transition.
- **Scripture:** Start the foreground audio lane with the scripture reading. Ambient from the previous step continues underneath.
- **Story:** Start the foreground audio lane with the bedtime story. Ambient continues underneath.

**Transitions between steps:**
1. Current step's foreground content finishes (scene steps are ambient-only and don't "finish" — they continue)
2. Wait for the next step's transition gap duration
3. During the gap: ambient volume "breathes up" — ambient gain ramps to full configured volume over 5 seconds (removing the foreground/background balance attenuation)
4. When the gap ends: next step begins. If the next step has foreground content, ambient fades back down to the foreground/background balance level.

**Content load failure:**
- Retry 3 times with exponential backoff (1s, 2s, 4s)
- If all retries fail: skip the step, proceed to the next
- Show a toast: "Skipped [step name] — couldn't load audio"
- Ambient from the previous step never stops — it continues throughout

**Catastrophic failure (all remaining steps fail to load):**
- Ambient continues playing with the sleep timer active
- Worst case: "ambient sounds with a timer" — still a valid sleep experience, never silence

**End of routine (last step completes or is skipped):**
- Ambient continues at full volume
- Sleep timer begins its countdown (or continues if already running)
- The timer handles the final fade to silence (existing sleep timer behavior)

### 5. Routine Progress in the Audio Drawer

When a routine is actively playing, a progress indicator appears between the drawer's now-playing section and the tab bar (Mixer, Timer, Saved tabs).

**Layout:** Horizontal stepper
- An icon for each step: scene icon, scripture icon, story icon
- A timer icon at the end representing the sleep timer phase
- Current step: highlighted in purple, slightly larger
- Completed steps: checkmarked, muted
- Future steps: outlined, muted
- Step labels below icons (truncated if needed)

**Skip-forward button:** A forward-skip icon next to the stepper. Tapping it:
- If foreground content is playing: crossfade out over 2 seconds, advance to the next step
- If in a transition gap: skip the remaining gap, start the next step immediately
- If on the last step: skip to ambient-only + timer mode

**No skip-backward.** Sleep routines move forward only.

**The progress indicator is always visible** regardless of which drawer tab is selected.

### 6. Pill Routine Shortcut

The floating pill on the Music page gains a routine suggestion mode.

**When no audio is playing AND the user has saved routines:**
- The pill becomes visible with: play icon + "Start [routine name]"
- The routine shown is the most frequently used routine at the current time-of-day bracket (from listening history). If no history, default to the first template ("Evening Peace").
- One tap launches the routine immediately
- A small edit icon links to the routines page

**When audio IS playing:** The pill shows its normal playing state (waveform bars, scene name, play/pause). No routine shortcut — the routine is already active or the user is in manual mode.

### 7. Routine vs. Manual Interaction

**If the user manually loads a scene or foreground content during an active routine:**
- Confirmation dialog: "This will end your current routine. Continue?"
- "End Routine": ends the routine sequence, loads the manually selected content
- "Keep Routine": dismisses the dialog, routine continues
- The dialog has focus trapping and `role="alertdialog"`

---

## Auth Gating

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| View routine templates on the routines page | Yes — all templates visible with full details | Yes |
| Start a template routine | Auth modal: "Sign in to use bedtime routines" | Routine starts |
| Create a custom routine | Auth modal: "Sign in to create bedtime routines" | Builder opens |
| Clone a template | Auth modal: "Sign in to create bedtime routines" | Clone created and builder opens |
| Edit a user-created routine | N/A — no routines exist when logged out | Builder opens with routine loaded |
| Delete a user-created routine | N/A | Confirmation dialog, then deletion |
| Duplicate a user-created routine | N/A | Copy created |
| See the pill routine shortcut | No — pill not shown (no routines to suggest) | Yes — shown when no audio is playing and routines exist |
| Skip forward during routine playback | N/A — cannot start a routine | Skip-forward button works |

---

## Responsive Behavior

### Mobile (< 640px)
- Routine cards: full-width, stacked vertically
- Builder: full-width, vertical stepper takes up most of the screen
- Step cards: full-width with drag handles on the left edge
- Content picker (when adding a step): full-screen modal overlay
- Drawer progress stepper: compact icons only (no labels)
- Pill shortcut: centered at the bottom of the viewport

### Tablet (640px - 1024px)
- Routine cards: 2-column grid
- Builder: full-width with comfortable padding
- Content picker: large modal centered on screen
- Drawer progress stepper: icons with truncated labels

### Desktop (> 1024px)
- Routine cards: 3-column grid
- Builder: centered, max-width ~700px for comfortable editing
- Content picker: side panel or large modal
- Drawer progress stepper: full icons and labels

---

## UX & Design Notes

- **Tone:** This is the nighttime companion feature. The routines page should feel like setting up a ritual — warm, intentional, unhurried. Template cards should inspire ("Tonight, let Psalm 23 carry you into peace"), not feel like configuration.
- **Colors:** Use the design system dark palette. Template cards use subtle gradient backgrounds with a "Template" badge in a muted accent color. The builder uses the same dark glass aesthetic as the audio drawer. Step cards in the builder have a left border accent matching the content type (scene: teal, scripture: warm gold, story: soft purple).
- **Typography:** Inter for all UI text. Template descriptions in regular weight at slightly reduced opacity for a softer feel. Routine names in semi-bold.
- **Builder timeline:** The vertical timeline should use a thin connecting line between step cards. The line connects drag handle circles. Between-step transition timing controls sit on the line with a clock icon.
- **Card design:** Routine cards show a compact summary: name, step icons in a row (e.g., scene icon → scripture icon), total time estimate, and a prominent "Start" button. Templates include the description below the step summary.
- **Animations:** Gentle only. Step cards animate in when added. Drag reorder uses smooth position transitions. The progress stepper in the drawer uses a subtle slide animation when advancing steps. No jarring transitions — this is a sleep feature.
- **Existing components to reference:** Use Toast for all notifications. Use the existing auth modal pattern (AuthModal + useAuthModal) for all auth gates. Use the existing confirmation dialog pattern for delete and routine-interrupt dialogs.

---

## AI Safety Considerations

- **Crisis detection needed?** No — the only user text input is routine naming, which is a short label (not emotional content).
- **User input involved?** Yes — routine naming only. Input should be limited to a reasonable length (e.g., 50 characters max). No HTML rendering of the name — display as plain text only.
- **AI-generated content?** No — all content is user-assembled from curated catalog items. No AI generation occurs in this feature.
- **No `dangerouslySetInnerHTML`** — routine names rendered as plain text via React's default escaping.
- **All content references local catalog** — no external data fetched.

---

## Auth & Persistence

- **Logged-out (demo mode):** Can browse routine templates on the routines page (names, descriptions, step summaries, durations). Cannot start, create, clone, or interact with routines. Zero persistence — no localStorage writes. Auth modal triggers on any action beyond browsing.
- **Logged-in:** Full access to all features. Routines persist in localStorage via StorageService (key: `wr_routines`). Listening history for routine sessions is logged (key: `wr_listening_history`). When the database exists (Phase 3+), StorageService swaps from localStorage to API calls.
- **Route type:** Public — the routines page is publicly accessible for browsing. All actions beyond browsing are auth-gated at the interaction level, not the route level.

---

## Worship Room Safety

- No user text input beyond routine naming (short text, max 50 characters, no crisis detection needed)
- No `dangerouslySetInnerHTML` usage anywhere in this feature
- localStorage data is not sensitive — contains only content IDs, timing values, and user-given routine names (no PII)
- Routine names are rendered as plain text only — React's default escaping prevents XSS
- No database writes — all persistence is client-side localStorage
- All content references are to the local curated catalog — no external data sources

---

## Out of Scope

- **Spotify playlists as routine steps** — excluded due to iframe audio conflicts with Web Audio API
- **Routine sharing with other users** — social feature for a future spec
- **Scheduled routines (auto-start at a set time)** — unreliable on web due to background tab timer throttling
- **Morning alarm** — dropped; web platform limitations make reliable alarms impractical
- **Routine analytics and completion streaks** — future engagement system (Features #46-48 in CLAUDE.md)
- **Backend API endpoints** — no server-side work in this spec
- **Database-backed persistence** — Future Phase 3+. StorageService abstraction supports the swap.
- **Dark mode** — Phase 4 feature, not addressed here

---

## Acceptance Criteria

### Data Model & Templates
- [ ] Routine data model exists with: id, name, isTemplate flag, ordered steps (type + contentId + transitionGapMinutes), sleep timer config (durationMinutes + fadeDurationMinutes), created/updated timestamps
- [ ] 3 pre-built templates defined: "Evening Peace", "Scripture & Sleep", "Deep Rest"
- [ ] Template data file exists with all template definitions including descriptions
- [ ] "Evening Peace" has 2 steps: Still Waters scene + Psalm 23 scripture (2-min gap), 45-min timer with 15-min fade
- [ ] "Scripture & Sleep" has 2 steps: Midnight Rain scene + random Comfort & Rest scripture (1-min gap), 30-min timer with 10-min fade
- [ ] "Deep Rest" has 2 steps: Garden of Gethsemane scene + Elijah bedtime story (5-min gap), 90-min timer with 30-min fade

### Routines Page
- [ ] `/music/routines` page shows existing routines and templates as cards
- [ ] Template cards display a "Template" badge
- [ ] Template cards have "Clone & Customize" button (no Edit or Delete)
- [ ] User-created routine cards have Start, Edit, Duplicate, Delete actions via three-dot menu
- [ ] Each routine card shows: name, step count, total estimated duration, "Start" button
- [ ] When no user-created routines exist, only the 3 templates are shown

### Builder — Step Management
- [ ] "Create Routine" button opens the builder interface
- [ ] Builder shows a vertical timeline/stepper layout with step cards
- [ ] Each step card shows: step number, content type icon, content name, Edit button, Remove button, drag handle
- [ ] "+ Add Step" button at the bottom opens a type selector: Scene, Scripture, or Story
- [ ] After selecting a type, a content picker shows available items of that type
- [ ] Selecting a content item adds it as a new step
- [ ] "Edit" button on a step card opens the content picker to replace the step's content
- [ ] "Remove" button removes the step from the routine

### Builder — Ordering & Timing
- [ ] Steps can be reordered via drag-and-drop
- [ ] Drag reorder is keyboard accessible (space to grab, arrow keys to reorder)
- [ ] Transition gap timing is configurable between each step (number input, default 2 minutes)
- [ ] First step always has a transition gap of 0 (not editable)

### Builder — Timer & Save
- [ ] Sleep timer configuration appears at the bottom of the builder with duration and fade duration selectors
- [ ] "Save Routine" button with a name input (auto-generated name from step names if empty)
- [ ] Routine name input limited to 50 characters max
- [ ] Saved routines persist in localStorage via StorageService

### Routine CRUD Operations
- [ ] Clone template creates a user-owned copy with " (Custom)" appended to the name and opens it in the builder
- [ ] Edit opens an existing routine in the builder with all steps loaded; "Save" overwrites
- [ ] Duplicate creates a copy named "[Name] Copy"
- [ ] Delete shows a confirmation dialog: "Delete [routine name]?" with red "Delete" and "Cancel" buttons
- [ ] Delete confirmation dialog has `role="alertdialog"` with focus trapped
- [ ] Delete permanently removes the routine from localStorage

### Playback Engine — Step Execution
- [ ] Starting a routine loads the routine state and begins executing step 1
- [ ] Scene steps: load the scene's sounds at preset volumes with crossfade from any current scene
- [ ] Scripture steps: start foreground audio with the reading; ambient continues underneath
- [ ] Story steps: start foreground audio with the story; ambient continues underneath

### Playback Engine — Transitions
- [ ] When foreground content finishes, the transition gap countdown begins
- [ ] During transition gaps: ambient volume breathes up to full volume over 5 seconds
- [ ] When the gap ends and the next step has foreground content: ambient fades back to the foreground/background balance level
- [ ] Steps execute in sequence until the last step completes

### Playback Engine — Error Handling
- [ ] Step content load failure: retry 3 times with exponential backoff (1s, 2s, 4s)
- [ ] If all retries fail: skip the step and proceed to the next with a toast: "Skipped [step name] — couldn't load audio"
- [ ] Ambient from the previous step never stops during retries or failures
- [ ] Catastrophic failure (all remaining steps fail): ambient continues with sleep timer active — never silence

### Playback Engine — End of Routine
- [ ] After the last step completes or is skipped: ambient continues at full volume
- [ ] Sleep timer handles the final fade to silence (existing timer behavior)
- [ ] If the sleep timer was already running, it continues; if not, it starts at the routine's configured duration

### Drawer Progress Indicator
- [ ] Horizontal stepper appears between the drawer's now-playing section and the tab bar when a routine is playing
- [ ] Each step has an icon matching its content type (scene, scripture, story) plus a timer icon at the end
- [ ] Current step: highlighted in purple, slightly larger
- [ ] Completed steps: checkmarked, muted opacity
- [ ] Future steps: outlined, muted opacity
- [ ] Step labels appear below icons (truncated if needed on smaller screens)
- [ ] Progress indicator is visible regardless of which drawer tab is selected

### Skip Forward
- [ ] Skip-forward button appears next to the progress stepper
- [ ] If foreground content is playing: crossfade out over 2 seconds, advance to next step
- [ ] If in a transition gap: skip the remaining gap, start the next step immediately
- [ ] If on the last step: skip to ambient-only + timer mode
- [ ] No skip-backward functionality

### Pill Routine Shortcut
- [ ] When no audio is playing AND the user has routines: pill shows play icon + "Start [routine name]"
- [ ] The suggested routine is the most frequently used routine at the current time-of-day bracket (from listening history)
- [ ] If no listening history: default to "Evening Peace" template
- [ ] One tap on the pill launches the routine immediately
- [ ] Small edit icon on the pill links to the routines page
- [ ] Pill is not shown for logged-out users
- [ ] When audio is playing: pill shows its normal playing state (no routine shortcut)

### Routine vs. Manual Interaction
- [ ] Manually loading a scene during an active routine triggers a confirmation dialog: "This will end your current routine. Continue?"
- [ ] Manually starting foreground content during an active routine triggers the same dialog
- [ ] "End Routine" stops the routine sequence and loads the manually selected content
- [ ] "Keep Routine" dismisses the dialog and the routine continues
- [ ] Confirmation dialog has `role="alertdialog"` with focus trapped

### Auth Gating
- [ ] Logged-out user tapping "Start" on a template sees auth modal: "Sign in to use bedtime routines"
- [ ] Logged-out user tapping "Create Routine" sees auth modal: "Sign in to create bedtime routines"
- [ ] Logged-out user tapping "Clone & Customize" sees auth modal: "Sign in to create bedtime routines"
- [ ] Logged-out users can browse all template details (names, descriptions, step summaries) without auth
- [ ] The routines page is publicly accessible (no route-level auth gate)

### Accessibility
- [ ] Routine cards have `role="article"` with descriptive `aria-label` (e.g., "Evening Peace routine — 2 steps, approximately 45 minutes")
- [ ] Start buttons have `aria-label="Start [routine name] routine"`
- [ ] Builder steps use `role="list"` with each step as `role="listitem"` and `aria-label="Step 1: Still Waters scene"`
- [ ] Drag reorder has `aria-roledescription="sortable"` and `aria-label` with grab/reorder instructions
- [ ] Skip-forward button has `aria-label="Skip to next routine step"`
- [ ] Progress stepper has `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and descriptive `aria-label`
- [ ] All confirmation dialogs have focus trapping
- [ ] All interactive elements have minimum 44x44px touch targets
