# Feature: Surprise & Delight System

**Master Plan Reference:** N/A — standalone feature

---

## Overview

Every reward in Worship Room currently follows a predictable pattern: do activity, get points, hit threshold, see overlay. There are no hidden rewards, no contextual surprises, no moments that make the user think "this app knows me." This spec introduces 5 specific surprise moments that break predictability and create genuine delight — the kind of moments users screenshot and share. These moments make the app feel less like a system and more like a caring friend who notices.

Surprise works because it violates expectation. A badge at 10 journal entries is expected. A whisper-toast saying "You highlighted a verse here 3 weeks ago — your journey with this passage continues" is unexpected — it makes the user feel seen. That's the difference between gamification and emotional connection.

## User Story

As a **logged-in user**, I want to occasionally encounter unexpected, warm moments that reference my personal history with the app so that I feel seen, known, and delighted rather than just tracked.

## Design Principles

Surprises must be:

- **Infrequent** — maximum 1 surprise per day, and most days should have none
- **Contextual** — triggered by real user behavior, not random timers
- **Warm** — the tone should feel like a caring friend noticing something, not a system notification
- **Non-blocking** — whisper-toasts or inline reveals, never full-screen overlays. The user's flow is sacred.
- **Skippable** — auto-dismiss after 6-8 seconds. No forced interaction.

## Requirements

### 1. Whisper-Toast Component

A new shared UI element used by 4 of the 5 surprise types. Distinct from existing toasts — gentler, more atmospheric.

**Visual design:**
- Position: bottom-center of the viewport, above any page-level navigation
- Container: `bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3`
- Text: `text-white/70 text-sm font-serif italic` (Lora italic)
- Max width: `max-w-sm`
- Animation: fade in from bottom (200ms translate-y), persist for duration, fade out (300ms)
- Tapping the toast dismisses it immediately
- No close button — auto-dismisses
- Respects `prefers-reduced-motion`: skip animations, still show content (fade only, no translate)

### 2. Scripture Echo

**Trigger:** User opens a Bible chapter that contains a verse they previously highlighted or prayed about.

**Detection logic:**
- When BibleReader loads a chapter, check the chapter's book + chapter against:
  - `wr_bible_highlights` — look for highlights in this chapter
  - `wr_prayer_list` — look for prayers that reference this book/chapter in their topic
- If a match is found, show the whisper-toast after a 3-second delay (let the user start reading first)
- Only trigger once per chapter per session (track shown chapters in component state)
- Must pass the daily surprise frequency check

**Whisper-toast content (contextual):**
- Highlight match: "You highlighted a verse here on [date]. Your journey with this passage continues."
- Prayer match: "You prayed about [topic] and this chapter speaks to that. God's Word meets you where you are."
- Generic fallback: "You've been here before. There's something in this chapter for you today."

**Duration:** 6 seconds

**Sound:** `whisper` sound effect (very soft, almost subliminal)

### 3. Anniversary Moment

**Trigger:** User opens the dashboard on their 7-day, 30-day, 90-day, or 365-day anniversary of first using the app.

**Detection logic:**
- Calculate days since the user's first mood entry (earliest date in `wr_mood_entries`) or first activity (earliest key in `wr_daily_activities`)
- If `daysSinceFirst` equals exactly 7, 30, 90, or 365, trigger
- Only trigger once per milestone (persist shown milestones in `wr_anniversary_milestones_shown`)
- Trigger after mood check-in completes and dashboard is visible
- Must pass the daily surprise frequency check

**Display — inline card at top of dashboard widget grid (not an overlay):**

| Milestone | Heading | Closing Message |
|-----------|---------|-----------------|
| 7 days | "One Week with Worship Room" | "Keep going — God is growing something beautiful in you." |
| 30 days | "One Month with Worship Room" | "A month of showing up. That's not discipline — that's devotion." |
| 90 days | "Three Months with Worship Room" | "You've built something rare — a rhythm of faith. Don't stop now." |
| 365 days | "One Year with Worship Room" | "A full year of walking with God through this room. You are not the same person who first walked in." |

**Stats to show (omit any that are zero):**
- Total prayers (count from `wr_daily_activities` entries where pray is true)
- Total journal entries (count from journal storage)
- Total meditations (count from `wr_meditation_history`)
- Current streak
- Garden growth (current level name vs starting level — e.g., "Your garden grew from a seedling to a sprout")

**Card styling:**
- Frosted glass: same as existing dashboard cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6`)
- Subtle golden border glow: `ring-1 ring-amber-500/10`
- Heading: `text-white text-lg font-semibold`
- Stats: `text-white/70 text-sm`
- Closing: `text-white/60 text-sm font-serif italic` (Lora italic)
- Dismiss button: `text-white/40 hover:text-white/60 text-sm` right-aligned

**Sound:** `sparkle` sound when card first renders

### 4. Midnight Verse

**Trigger:** User opens the app between 12:00 AM and 3:59 AM.

**Detection logic:**
- Check `new Date().getHours()` — if between 0 and 3 (inclusive), trigger
- Only trigger once per late-night session (use sessionStorage — not localStorage — to prevent re-triggering on same-night navigation)
- **Independent of the daily surprise limit** — late-night users are a special case

**Whisper-toast content:**
- Header: "Can't sleep? God is awake with you."
- Verse: one of 4 rotating late-night verses (WEB), selected by `new Date().getDate() % 4`:
  1. "He who watches over Israel will neither slumber nor sleep." — Psalm 121:4
  2. "When I said, 'My foot is slipping,' your loving kindness, O Lord, held me up." — Psalm 94:18
  3. "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you." — Isaiah 26:3
  4. "Come to me, all you who labor and are heavily burdened, and I will give you rest." — Matthew 11:28
- CTA link: "Listen to sleep sounds" navigates to `/music?tab=sleep`

**Duration:** 10 seconds (longer — user is likely moving slowly at this hour)

**Sound:** `whisper` sound effect

**Scope:** Triggers on any page (app-level detection, not page-specific)

### 5. Streak Weather (Garden Rainbow)

**Trigger:** User's streak reaches 7 days for the first time ever.

**Detection logic:**
- When `wr_streak.currentStreak` reaches 7 AND `wr_surprise_shown_rainbow` is not set in localStorage
- This is a one-time event — persist as `wr_surprise_shown_rainbow` = "true"
- **Overrides the daily surprise limit** since it can never happen again
- Trigger on the dashboard when the streak counter updates

**Display — visual change on the Growth Garden SVG:**
- A rainbow arc appears in the sky area of the garden
- Subtle gradient arc — 5-6 color bands with low opacity (0.3-0.4)
- Fades in over 2 seconds when dashboard first renders after streak reaches 7
- Persists on the garden for that day only
- Accompanying whisper-toast: "A rainbow in your garden! 7 days of faithfulness."

**Sound:** `sparkle` sound when rainbow appears

### 6. Gratitude Callback

**Trigger:** User has logged at least 7 gratitude entries. On a subsequent dashboard visit, one of their past entries is resurfaced.

**Detection logic:**
- Check `wr_gratitude_entries` — if length >= 7
- Pick a random entry from more than 3 days ago (not recent — that's too close to feel like a callback)
- Only trigger once per week (persist last shown date in `wr_gratitude_callback_last_shown`)
- Trigger on dashboard after mood check-in
- Must pass the daily surprise frequency check

**Whisper-toast content:**
- Framing: "A little while ago, you were thankful for:"
- User's own words in quotes (Lora italic, `text-white/80`)
- Closing: "Isn't it beautiful to look back?"

**Duration:** 8 seconds

**Sound:** `chime` sound effect (gentle, affirming)

**Privacy:** The gratitude entry is the user's own data, shown only to them. No sharing, no external exposure.

### 7. Surprise Frequency Management

To prevent surprise fatigue, a shared frequency limiter governs all surprise types:

**Rules:**
- Maximum 1 surprise per day (except Midnight Verse, which uses sessionStorage independently)
- Priority order when multiple could trigger on the same day: Anniversary > Gratitude Callback > Scripture Echo > Streak Weather
- Persist the last surprise date in `wr_last_surprise_date`. If today matches, skip all surprise checks (except Midnight Verse).
- Streak Weather is a one-time event — it overrides the daily limit since it can never happen again

### 8. New localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `wr_anniversary_milestones_shown` | number[] | Array of shown milestone days (7, 30, 90, 365) |
| `wr_surprise_shown_rainbow` | "true" | One-time flag for streak rainbow |
| `wr_gratitude_callback_last_shown` | string (date) | Last date a gratitude callback was shown |
| `wr_last_surprise_date` | string (date) | Last date any surprise fired (frequency limiter) |

## Auth Gating

All surprise features require authenticated users because they depend on user data stored in localStorage (highlights, mood entries, streaks, gratitude entries) which is only written when authenticated.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Scripture Echo | Never triggers (no highlights/prayers to match) | Triggers on Bible chapter load if match found | N/A |
| Anniversary Moment | Never triggers (no mood entries or activity data) | Triggers on dashboard if milestone day matches | N/A |
| Midnight Verse | Never triggers (only for authenticated users) | Triggers between 12-4 AM on any page | N/A |
| Streak Weather | Never triggers (no streak data) | Triggers on dashboard when streak first hits 7 | N/A |
| Gratitude Callback | Never triggers (no gratitude entries) | Triggers on dashboard if 7+ entries and weekly cooldown passed | N/A |

No auth modal is shown for any surprise — they simply don't appear for logged-out users.

## Responsive Behavior

| Breakpoint | Whisper-Toast Layout | Anniversary Card Layout |
|-----------|---------------------|------------------------|
| Mobile (< 640px) | Full-width minus gutters (`mx-4`), bottom-center | Full-width, single column stats |
| Tablet (640-1024px) | `max-w-sm` centered, bottom-center | Same as mobile |
| Desktop (> 1024px) | `max-w-sm` centered, bottom-center | Full-width within dashboard grid column |

- Whisper-toasts are always bottom-center with fixed positioning
- Anniversary card renders at the top of the DashboardWidgetGrid, spanning the full width
- Garden rainbow is part of the SVG — scales with the garden's existing responsive behavior
- Touch targets: dismiss button on anniversary card meets 44px minimum; whisper-toast entire area is tappable to dismiss

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All displayed text is either hardcoded (verses, messages) or the user's own previously-saved data (gratitude entries, highlight dates, prayer topics). No crisis detection required.

## Auth & Persistence

- **Logged-out users:** No surprises trigger. Zero data written.
- **Logged-in users:** Surprise state persisted in localStorage via 4 new keys (see Requirements section 8). All surprise data reads from existing localStorage keys (`wr_bible_highlights`, `wr_prayer_list`, `wr_mood_entries`, `wr_daily_activities`, `wr_meditation_history`, `wr_streak`, `wr_gratitude_entries`, `wr_faith_points`).
- **Route type:** N/A — surprises trigger on existing pages (Dashboard, BibleReader, any page for Midnight Verse)

## Completion & Navigation

N/A — standalone feature. Surprises are passive moments, not completable activities. They do not affect streaks, points, or activity tracking.

## Design Notes

- **Whisper-toast** is a new visual pattern — not the same as the existing Toast component. It's atmospheric and gentle: frosted glass, Lora italic, lower opacity text, no close button. The existing Toast component (`components/ui/Toast.tsx`) handles system notifications and celebrations; the whisper-toast is for surprise moments only.
- **Anniversary card** reuses the existing Dashboard Card Pattern from the design system (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) with the addition of a subtle `ring-1 ring-amber-500/10` golden glow.
- **Garden rainbow** is an SVG addition to the existing GrowthGarden component. It should use a multi-stop gradient arc behind foreground elements but in front of the sky. Low opacity (0.3-0.4) to keep it subtle.
- **Sounds** use the existing `useSoundEffects()` hook which already handles `wr_sound_effects_enabled` gating and `prefers-reduced-motion` respect. Sound types to use: `whisper` (Scripture Echo, Midnight Verse), `sparkle` (Anniversary, Streak Weather), `chime` (Gratitude Callback).
- **New visual patterns introduced:** Whisper-toast (frosted glass atmospheric notification), garden rainbow SVG arc. These are not yet in the design system recon and should be marked `[UNVERIFIED]` during planning.

## Out of Scope

- AI-generated personalized surprises (Phase 3 — requires real AI)
- Surprise moments in features other than Dashboard and Bible Reader (except Midnight Verse which is app-level)
- Push notification surprises (Phase 3 backend)
- Sharing surprise moments (no share action on whisper-toasts)
- More than 5 surprise types (this is the foundation — more can be added later)
- Surprise analytics or tracking (which surprises users engage with most)
- Backend persistence of surprise state (currently localStorage only)

## Acceptance Criteria

### Scripture Echo
- [ ] Whisper-toast appears when opening a Bible chapter with a previously-highlighted verse
- [ ] Toast content references the user's history with this passage (highlight date or prayer topic)
- [ ] Toast auto-dismisses after 6 seconds
- [ ] `whisper` sound plays (respects `wr_sound_effects_enabled` and `prefers-reduced-motion`)
- [ ] Only triggers once per chapter per session
- [ ] Respects daily surprise limit via `wr_last_surprise_date`

### Anniversary Moment
- [ ] Card appears on the dashboard at exactly 7, 30, 90, and 365 days since first activity
- [ ] Card shows personalized stats (prayers, journals, meditations, streak, garden level)
- [ ] Stats with zero values are omitted (not shown as "0 prayers")
- [ ] Card dismisses on button click and does not reappear (milestone persisted in `wr_anniversary_milestones_shown`)
- [ ] `sparkle` sound plays when card renders
- [ ] Closing message matches the milestone level per the content table
- [ ] Card has subtle golden glow (`ring-1 ring-amber-500/10`)

### Midnight Verse
- [ ] Whisper-toast appears between 12:00 AM and 3:59 AM local time
- [ ] Toast includes a comfort verse (WEB) and a CTA link to sleep sounds
- [ ] "Listen to sleep sounds" link navigates to `/music?tab=sleep`
- [ ] Only triggers once per late-night session (sessionStorage, not localStorage)
- [ ] Independent of the daily surprise limit
- [ ] Verse rotates daily by day-of-month

### Streak Weather (Rainbow)
- [ ] Rainbow arc appears in Growth Garden SVG when streak first reaches 7 days
- [ ] Rainbow is a subtle gradient arc with low opacity (0.3-0.4)
- [ ] Rainbow fades in over 2 seconds (CSS transition)
- [ ] Accompanying whisper-toast: "A rainbow in your garden! 7 days of faithfulness."
- [ ] Only happens once ever (persisted in `wr_surprise_shown_rainbow`)
- [ ] `sparkle` sound plays

### Gratitude Callback
- [ ] Whisper-toast surfaces a past gratitude entry from 3+ days ago
- [ ] Only triggers when user has 7+ gratitude entries
- [ ] Only triggers once per week (7 days between callbacks)
- [ ] User's own words are displayed in quotes with Lora italic
- [ ] `chime` sound plays
- [ ] Respects daily surprise limit

### Frequency Management
- [ ] Maximum 1 surprise per day (except Midnight Verse)
- [ ] Priority order respected: Anniversary > Gratitude Callback > Scripture Echo > Streak Weather
- [ ] `wr_last_surprise_date` correctly prevents multiple surprises on same day
- [ ] Streak Weather overrides daily limit (one-time event)
- [ ] Midnight Verse uses sessionStorage independently

### Global
- [ ] All surprises respect `prefers-reduced-motion` (animations disabled, content still shows)
- [ ] All surprises respect `wr_sound_effects_enabled`
- [ ] All sounds are gentle (whisper, sparkle, chime — no jarring alerts)
- [ ] Mobile (375px): whisper-toasts render correctly, full-width with side margins
- [ ] Desktop (1440px): whisper-toasts are `max-w-sm` centered, anniversary card within grid
- [ ] No existing functionality is broken by surprise triggers (dashboard, Bible reader, garden tests pass)
- [ ] Logged-out users never see any surprise (no errors, no empty toasts)

## Test Requirements

- Test Scripture Echo: set up a highlight in localStorage, navigate to that chapter, verify whisper-toast appears after 3s delay
- Test Anniversary: mock first activity date to 7 days ago, verify card appears on dashboard
- Test Midnight Verse: mock `Date` to 2:00 AM, verify whisper-toast appears with correct verse
- Test Streak Weather: mock streak reaching 7 for the first time, verify rainbow renders in garden SVG
- Test Gratitude Callback: add 7+ gratitude entries (oldest 4+ days ago), verify whisper-toast surfaces a past entry
- Test frequency limiter: trigger one surprise, set `wr_last_surprise_date` to today, verify a second surprise does not fire
- Test persistence: verify milestone shown flags persist across component unmount/remount
- Test reduced motion: verify animations are disabled but content still shows with `prefers-reduced-motion: reduce`
- Run existing dashboard, Bible reader, and garden tests to verify no regressions
