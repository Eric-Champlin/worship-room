# Feature: Mood Check-In System

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_mood_entries`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) renders the check-in conditionally; Spec 5 (Streak & Faith Points) calls `recordActivity('mood')` after check-in; Spec 3 (Mood Insights Widget) reads `wr_mood_entries`
- Shared constants: Mood colors, encouragement verses, and `MoodEntry` type defined here are consumed by all downstream dashboard specs

---

## Overview

The Mood Check-In is a full-screen daily ritual that greets logged-in users before the dashboard loads. It asks "How are you feeling today?" with five soft-labeled mood options presented as glowing abstract orbs. Users may optionally share a brief thought, then receive a single encouragement verse matched to their mood — the same verse every time for that mood level, creating a sense of ritual and familiarity.

This is the foundational data entry point for the entire Dashboard & Growth feature set. Everything downstream — mood insights, streak tracking, faith points, AI analysis — consumes the mood data created here.

The check-in appears once per day, respects the user's choice to skip, and never re-appears until the next day. It prioritizes emotional safety through crisis keyword detection on user text input.

---

## User Stories

- As a **logged-in user**, I want to check in with my emotions once a day so that I can receive an encouraging scripture matched to how I'm feeling.
- As a **logged-in user**, I want to optionally share what's on my heart so that my check-in captures more context for future reflection.
- As a **logged-in user**, I want to skip the check-in if I'm not ready so that I don't feel pressured or guilted into emotional disclosure.
- As a **logged-in user** in crisis, I want to see crisis resources immediately if I express self-harm language so that I can get help.

---

## Requirements

### Core Flow

1. **Trigger**: When a logged-in user navigates to `/` and has not checked in today (and has not skipped today), the full-screen check-in renders instead of the dashboard
2. **Greeting**: "How are you feeling today, [Name]?" using the user's display name in warm serif typography
3. **Mood Selection**: 5 abstract colored orbs with soft labels — Struggling, Heavy, Okay, Good, Thriving
4. **Optional Text**: After selecting a mood, a textarea slides in asking "Want to share what's on your heart?" with a 280-character limit and live character counter
5. **Continue**: A "Continue" button appears below the textarea. User may tap Continue with or without entering text
6. **Crisis Check**: If text is non-empty, check against the existing `containsCrisisKeyword()` function from `crisis-resources.ts`. If crisis keywords detected, show the crisis resource banner instead of the encouragement verse
7. **Encouragement Verse**: If no crisis detected, fade to a centered scripture verse matched to the selected mood. Verse displays for 3 seconds, then auto-advances to the dashboard
8. **Persistence**: Save the mood entry to localStorage under `wr_mood_entries`
9. **Skip**: "Not right now" link skips directly to the dashboard. No mood is recorded. Skip is remembered for the rest of the day (check-in does not re-appear)

### Mood Buttons

| Mood | Value | Soft Label | Color (Hex) | Color Description |
|------|-------|------------|-------------|-------------------|
| 1 | 1 | Struggling | `#D97706` | Deep warm amber |
| 2 | 2 | Heavy | `#C2703E` | Muted copper/orange |
| 3 | 3 | Okay | `#8B7FA8` | Neutral gray-purple |
| 4 | 4 | Good | `#2DD4BF` | Soft teal |
| 5 | 5 | Thriving | `#34D399` | Vibrant green-gold |

- Orbs are abstract colored circles (~56px diameter mobile, ~64px desktop) with the label beneath
- Idle state: gentle pulse animation on all orbs (respects `prefers-reduced-motion`)
- Hover/focus: orb glows brighter in its mood color
- Selected state: selected orb scales up (1.15x) with full glow; unselected orbs fade to 30% opacity
- Transitions between states: 200ms ease

### Encouragement Verses (WEB Translation)

Each mood has exactly one verse, always the same — this creates ritual familiarity:

| Mood | Verse | Reference |
|------|-------|-----------|
| Struggling | "The Lord is near to the brokenhearted, and saves those who have a crushed spirit." | Psalm 34:18 |
| Heavy | "Cast your burden on the Lord, and he will sustain you." | Psalm 55:22 |
| Okay | "Be still, and know that I am God." | Psalm 46:10 |
| Good | "Give thanks to the Lord, for he is good, for his loving kindness endures forever." | Psalm 107:1 |
| Thriving | "This is the day that the Lord has made. We will rejoice and be glad in it!" | Psalm 118:24 |

- Verse displays in italic serif typography, centered, on a dark background
- Verse auto-advances after 3 seconds — no Continue button during verse display (the moment is cinematic)
- The verse reference (e.g., "Psalm 34:18") appears below the verse text in smaller, muted type

### State Machine

```
idle → mood_selected → text_input → [crisis_check] → verse_display → complete
                                     └→ crisis_banner → complete
```

- **idle**: Full-screen with greeting + mood orbs + skip link
- **mood_selected**: Selected orb glows, others fade; textarea and Continue button slide in
- **text_input**: User may type or leave empty; Continue button is always enabled
- **crisis_check**: If text is non-empty, run crisis keyword detection. If empty, skip directly to verse_display
- **crisis_banner**: Crisis resources banner renders (matches existing CrisisBanner pattern). User dismisses banner to proceed to dashboard. Mood entry is still saved.
- **verse_display**: Encouragement verse fades in, displays for 3 seconds, auto-advances
- **complete**: Check-in finished. Dashboard renders. Mood entry saved to localStorage.

### Data Model

```
MoodEntry:
  id: string              — unique identifier (UUID)
  date: string            — YYYY-MM-DD in local timezone (via getLocalDateString())
  mood: 1 | 2 | 3 | 4 | 5
  moodLabel: 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving'
  text?: string           — optional, max 280 characters
  timestamp: number       — Unix milliseconds (Date.now())
  verseSeen: string       — verse reference shown (e.g., "Psalm 34:18")
```

**localStorage key**: `wr_mood_entries` — JSON array of MoodEntry objects, ordered by date descending. Capped at 365 entries (oldest entries pruned on write).

### Shared Date Utility

This spec also delivers a shared `utils/date.ts` module used by all subsequent dashboard specs:

- `getLocalDateString(date?)`: Returns `YYYY-MM-DD` using the browser's local timezone. **Critical**: Never use `toISOString().split('T')[0]` — it returns UTC, which at 11pm EST would return tomorrow's date.
- `getYesterdayDateString()`: Returns yesterday's date string in local timezone
- `getCurrentWeekStart()`: Returns Monday's date string for the current week

### "Has Checked In Today?" Logic

- Read `wr_mood_entries` from localStorage
- Check if any entry's `date` field matches `getLocalDateString()` (today in local timezone)
- If match found → user has checked in → render dashboard directly
- If no match and not skipped → render check-in

### Skip Tracking

- When user taps "Not right now", store the skip in session-level state (React state or sessionStorage)
- Skip is respected for the rest of the day — check-in does not re-appear
- Skip resets naturally on next page load after midnight (new day)
- The dashboard's activity checklist (Spec 6) shows "Log your mood" as unchecked — this is the only gentle reminder. No popup, no modal, no guilt.

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes
- **User input involved?**: Yes — optional 280-character text input ("Want to share what's on your heart?")
- **AI-generated content?**: No — verses are hardcoded constants, not AI-generated
- **Crisis keyword handling**: Use the existing `containsCrisisKeyword()` function from `crisis-resources.ts` (same pattern as Pray tab and Journal tab). If crisis keywords detected in the text input:
  - Show the existing crisis resource banner (988 Suicide & Crisis Lifeline, Crisis Text Line, SAMHSA) instead of the encouragement verse
  - The mood entry is still saved (mood selection is valid even during crisis)
  - User dismisses the crisis banner to proceed to the dashboard
  - No auto-flag or admin notification for frontend-only keyword detection (backend classifier handles escalation in Phase 3)

---

## Auth & Persistence

### Logged-out users (demo mode):
- **See the landing page at `/`** — no check-in, no dashboard
- Zero data persistence. The check-in is an authenticated-only experience.

### Logged-in users:
- See the check-in on first daily visit to `/`
- Mood entry saved to `wr_mood_entries` in localStorage (frontend-first, Phase 2.75)
- Data persists across sessions until 365-entry cap triggers pruning
- In Phase 3, this data migrates to the backend API

### Route type:
- Not a separate route. Conditional render inside the Dashboard page component at `/`
- Dashboard itself is auth-gated: `isAuthenticated ? <Dashboard /> : <Home />`

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Mood orb buttons | Not visible (landing page shown instead) | Selectable; triggers mood_selected state |
| Text input | Not visible | Optional; 280-char limit with counter |
| Continue button | Not visible | Advances to crisis check / verse display |
| "Not right now" skip | Not visible | Skips to dashboard, no data saved |
| Crisis banner | Not visible | Shown when crisis keywords detected in text |
| Encouragement verse | Not visible | Auto-displays for 3 seconds after mood + text |

---

## UX & Design Notes

### Visual Design

- **Background**: Dark radial gradient — deep purple center fading to near-black edges. Should feel like a quiet, intimate space. Reference the landing page hero gradient values from the design system recon (`radial-gradient` with `rgb(59, 7, 100)` center, fading through `rgb(13, 6, 32)`)
- **Greeting typography**: Warm serif font (`font-serif`), `text-2xl` mobile / `text-3xl` desktop, `text-white/90`
- **Mood orb labels**: `font-sans`, `text-sm`, `text-white/70`, centered below each orb
- **Textarea**: Dark semi-transparent background (`bg-white/5`), white text, `border border-white/15`, `rounded-xl`, placeholder in `text-white/40`. Matches the textarea style from the Pray tab (glow-cyan border on focus)
- **Character counter**: `text-xs text-white/40` aligned right below textarea. Turns `text-warning` at 250+ chars, `text-danger` at 280
- **Continue button**: Primary CTA style — `bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-2`
- **Skip link**: `text-sm text-white/40 hover:text-white/60 underline-offset-4` — intentionally understated, positioned at the very bottom
- **Verse typography**: Italic serif (`font-serif italic`), `text-xl md:text-2xl`, `text-white/90`, centered. Verse reference below in `text-sm text-white/50`
- **Overall tone**: Peaceful, intimate, non-intrusive. Like a gentle greeting at the door before entering your space.

### Animations

- **Entrance**: Fade-in (opacity 0→1, 400ms ease-in-out). No slide, no zoom — gentle.
- **Mood orb idle**: Subtle pulse animation on all orbs (`motion-safe` only)
- **Mood selection**: Selected orb scales to 1.15x with full glow (200ms). Unselected orbs fade to 30% opacity (200ms).
- **Textarea reveal**: Slides in from below with fade (300ms)
- **Verse transition**: Content fades out (300ms), verse fades in (400ms), verse fades out after 3s (300ms), dashboard fades in (400ms)
- **`prefers-reduced-motion`**: All animations disabled. Transitions become instant. Orb pulse disabled.

### Responsive Behavior

#### Mobile (< 640px)
- Full viewport height (`min-h-screen`), content centered vertically
- Greeting: `text-2xl`
- Mood orbs: 56px diameter, arranged in 2 rows — 3 on top (Struggling, Heavy, Okay), 2 on bottom centered (Good, Thriving)
- Textarea: Full width with `px-4` side padding
- Skip link: Fixed at bottom of viewport or below all content with comfortable touch target (44px minimum)

#### Tablet (640px–1024px)
- Same as mobile but greeting scales to `text-2xl md:text-3xl`
- Mood orbs: 60px diameter, single horizontal row (5 across)
- Content max-width: ~600px centered

#### Desktop (> 1024px)
- Greeting: `text-3xl`
- Mood orbs: 64px diameter, single horizontal row (5 across) with generous spacing
- Content max-width: ~640px centered
- All interactive elements have visible focus rings for keyboard users

---

## Edge Cases

- **Midnight rollover**: Check-in should NOT pop up mid-session if the clock crosses midnight. Only check `hasCheckedInToday()` on initial component mount (via `useRef` flag). Do not re-check reactively.
- **Multiple tabs**: localStorage is shared across tabs. If user checks in on Tab A, Tab B should see the dashboard on next navigation to `/` (read localStorage on mount, not from cached state)
- **Browser back/forward**: After completing check-in, pressing Back should not re-show the check-in (it's a conditional render, not a route, so browser history is unaffected)
- **Very long names**: If the user's name is very long, the greeting should truncate gracefully (ellipsis or line wrap, not overflow)
- **Empty localStorage**: First-ever visit after simulated login — `wr_mood_entries` doesn't exist yet. Handle gracefully (treat as no entries, show check-in)
- **Corrupted localStorage**: If `wr_mood_entries` contains invalid JSON, treat as empty array (show check-in, don't crash)
- **365-entry cap**: When writing a new entry that would push past 365, remove the oldest entries first
- **Same-day re-check-in**: Should not be possible. `hasCheckedInToday()` prevents re-entry. If a user somehow has two entries for the same date (corrupted data), the check should still return true.

---

## Out of Scope

- **Dashboard shell, hero, widget grid** — Spec 2
- **Mood chart / insights visualization** — Specs 3 and 4
- **Streak tracking / faith points recording for mood activity** — Spec 5 (this spec saves the mood entry; Spec 5 hooks into it to call `recordActivity('mood')`)
- **AuthProvider context and simulated login** — Spec 2 (this spec assumes `isAuthenticated` and `user.name` are available from context; the actual provider is built in Spec 2)
- **Backend API persistence** — Phase 3 (this spec uses localStorage only)
- **AI-powered mood analysis or insights** — Spec 15
- **Real authentication (JWT, Spring Security)** — Phase 3
- **Multi-language support** — not in MVP
- **Mood editing or deletion by the user** — not in MVP
- **Push notifications for missed check-ins** — not in MVP (gentle gamification philosophy: never punish absence)

---

## Acceptance Criteria

### Core Flow
- [ ] Logged-in user navigating to `/` who has not checked in today sees the full-screen mood check-in instead of the dashboard
- [ ] Logged-in user who has already checked in today sees the dashboard directly (no check-in)
- [ ] Greeting displays "How are you feeling today, [Name]?" using the user's display name
- [ ] All 5 mood orbs render with correct colors: Struggling (#D97706), Heavy (#C2703E), Okay (#8B7FA8), Good (#2DD4BF), Thriving (#34D399)
- [ ] Selecting a mood orb scales it to 1.15x with full glow and fades unselected orbs to 30% opacity
- [ ] After mood selection, textarea slides in with placeholder "Want to share what's on your heart?"
- [ ] Textarea enforces 280-character limit with visible character counter
- [ ] Character counter changes color at 250 chars (warning) and 280 chars (danger)
- [ ] Continue button appears after mood selection and is always enabled (text is optional)
- [ ] Tapping Continue with no text skips crisis check and shows encouragement verse
- [ ] Tapping Continue with text runs crisis keyword detection via existing `containsCrisisKeyword()`

### Encouragement Verses
- [ ] Struggling mood shows Psalm 34:18 (WEB)
- [ ] Heavy mood shows Psalm 55:22 (WEB)
- [ ] Okay mood shows Psalm 46:10 (WEB)
- [ ] Good mood shows Psalm 107:1 (WEB)
- [ ] Thriving mood shows Psalm 118:24 (WEB)
- [ ] Verse displays in italic serif typography, centered
- [ ] Verse auto-advances after 3 seconds (no Continue button during verse display)
- [ ] Verse reference appears below verse text in smaller, muted typography

### Crisis Detection
- [ ] Text containing crisis keywords (e.g., "kill myself", "want to die") triggers crisis resource banner instead of encouragement verse
- [ ] Crisis banner displays 988 Suicide & Crisis Lifeline, Crisis Text Line, and SAMHSA resources
- [ ] Mood entry is still saved even when crisis banner is shown
- [ ] Crisis banner uses the existing CrisisBanner component pattern with `role="alert"`
- [ ] Empty text input skips crisis check entirely

### Skip Behavior
- [ ] "Not right now" skip link is visible and focusable at the bottom of the check-in screen
- [ ] Tapping skip renders the dashboard immediately with no mood recorded
- [ ] After skipping, check-in does not re-appear for the rest of the day (respected on re-navigation to `/`)
- [ ] Skip link has minimum 44px touch target on mobile

### Data Persistence
- [ ] Mood entry is saved to `wr_mood_entries` in localStorage with correct MoodEntry schema (id, date, mood, moodLabel, text, timestamp, verseSeen)
- [ ] `date` field uses local timezone via `getLocalDateString()` (NOT `toISOString()`)
- [ ] `timestamp` field uses `Date.now()` (Unix milliseconds)
- [ ] Entries are ordered by date descending in the array
- [ ] Array is capped at 365 entries — oldest entries are pruned when cap is exceeded
- [ ] Corrupted localStorage (invalid JSON) is handled gracefully without crashing

### Shared Utilities
- [ ] `utils/date.ts` exports `getLocalDateString()`, `getYesterdayDateString()`, and `getCurrentWeekStart()`
- [ ] `getLocalDateString()` returns `YYYY-MM-DD` in browser local timezone
- [ ] `getLocalDateString()` does NOT use `toISOString()` (would return UTC)

### Accessibility
- [ ] Full-screen check-in has `role="dialog"` with `aria-labelledby` pointing to the greeting
- [ ] Mood buttons are a radio group (`role="radiogroup"`) with `role="radio"` and `aria-checked` on each
- [ ] Arrow keys navigate between mood options, Enter/Space selects
- [ ] Verse text is announced via `aria-live="polite"` region before auto-advance
- [ ] Skip link is keyboard-focusable and has accessible label
- [ ] `prefers-reduced-motion`: all animations disabled, transitions instant

### Responsive Layout
- [ ] Mobile (< 640px): Mood orbs at 56px, arranged in 2 rows (3 top + 2 bottom centered)
- [ ] Tablet (640–1024px): Mood orbs at 60px, single horizontal row
- [ ] Desktop (> 1024px): Mood orbs at 64px, single horizontal row with generous spacing
- [ ] Content is vertically and horizontally centered at all breakpoints
- [ ] Textarea is full-width with appropriate padding at all breakpoints

### Visual Design
- [ ] Background uses dark radial gradient (deep purple center to near-black edges), matching landing page hero values from design system recon
- [ ] Greeting uses serif font (`font-serif`), white/90 color
- [ ] Verse displays in italic serif, centered, with verse reference in smaller muted text below
- [ ] Continue button uses primary CTA style (`bg-primary`, white text, rounded)
- [ ] Skip link is understated (`text-white/40`, small text)

### Edge Cases
- [ ] Midnight rollover during session does not trigger re-check-in (mount-time check only)
- [ ] Multiple tab scenario: check-in on Tab A prevents re-check-in on Tab B (localStorage shared)
- [ ] First-ever visit (no `wr_mood_entries` key) shows check-in without error
- [ ] Very long display name truncates gracefully (no overflow)
