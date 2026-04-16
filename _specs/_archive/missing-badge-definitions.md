# Feature: Missing Badge Definitions

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec extends `wr_badges`
- Cross-spec dependencies: Spec 7 (Badge Definitions & Unlock Logic) defines the existing ~29 badges and `checkForNewBadges()` flow; Spec 8 (Celebrations & Badge Collection UI) renders celebrations and badge grid; this spec adds 17 new badge definitions to the existing constants
- Shared constants: New badge IDs, celebration tiers, and category labels defined here are consumed by the existing BadgeGrid, GrowthProfile, and CelebrationOverlay components

---

## Overview

The gamification system currently has ~29 badges across 7 categories, but the original design specified ~45. This spec fills the gap by adding 17 new badges across 6 new/expanded categories: Meditation Milestones, Prayer Wall Milestones, Bible Reading Milestones, Gratitude Milestones, Local Support, and Audio Listening. These additions make the achievement system feel comprehensive and rewarding across all feature areas, encouraging users to explore every part of their spiritual journey.

---

## User Stories

- As a **logged-in user**, I want to earn meditation badges at increasing milestones (10, 25, 50, 100 sessions) so that my contemplative practice is celebrated.
- As a **logged-in user**, I want to earn badges for sharing prayers on the Prayer Wall and praying for others so that my community involvement is recognized.
- As a **logged-in user**, I want to earn badges for reading Bible chapters so that my scripture engagement is tracked and celebrated.
- As a **logged-in user**, I want to earn gratitude badges for consistent daily gratitude logging so that my thankfulness habit is acknowledged.
- As a **logged-in user**, I want to earn badges for visiting local support locations so that my real-world community connections are honored.
- As a **logged-in user**, I want to earn a listening badge for accumulating worship listening time so that my devotion through music is celebrated.

---

## Requirements

### New Badge Definitions (17 badges across 6 categories)

**Meditation Milestones (4 new badges):**

| ID | Name | Trigger | Icon | Message | Celebration Tier |
|----|------|---------|------|---------|-----------------|
| `meditate_10` | Peaceful Beginner | Complete 10 meditation sessions | Wind | "10 sessions of stillness. Your mind is learning to rest in God." | toast-confetti |
| `meditate_25` | Mindful Seeker | Complete 25 meditation sessions | Brain | "25 times you've chosen peace. That's a powerful habit." | toast-confetti |
| `meditate_50` | Contemplative Heart | Complete 50 meditation sessions | Heart | "50 moments of meditation. God meets you in the silence." | special-toast |
| `meditate_100` | Master of Stillness | Complete 100 meditation sessions | Sparkles | "100 meditations. You've built a practice that will carry you for a lifetime." | full-screen |

Track via `wr_meditation_history` array length. The existing `activityCounts.meditate` may also be usable, but `wr_meditation_history` is the source of truth for session count since it persists across daily resets.

**Prayer Wall Milestones (3 new badges):**

| ID | Name | Trigger | Icon | Message | Celebration Tier |
|----|------|---------|------|---------|-----------------|
| `prayerwall_first_post` | First Prayer Shared | Post first prayer on Prayer Wall | MessageCircle | "You shared your heart with the community. That takes courage." | toast-confetti |
| `prayerwall_10_posts` | Prayer Warrior | Post 10 prayers on the Prayer Wall | Shield | "10 prayers shared. You're building a community of faith." | toast-confetti |
| `prayerwall_25_intercessions` | Intercessor | Pray for 25 other people's prayer requests (cumulative "Pray for this" taps) | HandHelping | "You've lifted 25 people in prayer. Heaven notices." | special-toast |

Track posts by counting prayer wall items matching the current user's `authorId`. Track intercessions via a new `intercessionCount` counter in `wr_badges` `activityCounts`.

**Bible Reading Milestones (4 new badges):**

| ID | Name | Trigger | Icon | Message | Celebration Tier |
|----|------|---------|------|---------|-----------------|
| `bible_first_chapter` | First Chapter | Read first Bible chapter to completion | BookOpen | "Your first chapter! The Word is a lamp to your feet." | toast |
| `bible_10_chapters` | Bible Explorer | Complete 10 Bible chapters | Compass | "10 chapters explored. You're discovering the depth of God's Word." | toast-confetti |
| `bible_25_chapters` | Scripture Scholar | Complete 25 Bible chapters | GraduationCap | "25 chapters. You're building a foundation that will never crack." | special-toast |
| `bible_complete_book` | Bible Master | Complete all chapters in any single book | Award | "You finished an entire book! That's dedication to the Word." | full-screen |

Track via `wr_bible_progress` — count total completed chapters across all books for the first 3 badges. For Bible Master, check if any single book in the progress data has all its chapters marked complete (requires knowing total chapter counts per book from the Bible data).

**Gratitude Milestones (3 new badges):**

| ID | Name | Trigger | Icon | Message | Celebration Tier |
|----|------|---------|------|---------|-----------------|
| `gratitude_7_streak` | Thankful Heart | Log gratitude for 7 consecutive days | Heart | "A week of gratitude. Your perspective is shifting." | toast-confetti |
| `gratitude_30_days` | Gratitude Habit | Log gratitude for 30 days total (not necessarily consecutive) | Sun | "30 days of counting blessings. Gratitude is becoming part of who you are." | toast-confetti |
| `gratitude_100_days` | Overflowing Cup | Log gratitude for 100 days total | Star | "100 days of gratitude. Your cup truly overflows." | full-screen |

Track via `wr_gratitude_entries` — count unique dates for total days, check consecutive dates for streak badge.

**Local Support (2 new badges):**

| ID | Name | Trigger | Icon | Message | Celebration Tier |
|----|------|---------|------|---------|-----------------|
| `local_first_visit` | Community Seeker | Visit first local support location (church, counselor, or CR) | MapPin | "You took a step into your local community. That matters." | toast-confetti |
| `local_5_visits` | Connected Locally | Visit 5 local support locations | Map | "5 local connections. Faith is lived in community." | toast-confetti |

Track via `wr_local_visits` length (unique `placeId` values).

**Audio Listening (1 new badge):**

| ID | Name | Trigger | Icon | Message | Celebration Tier |
|----|------|---------|------|---------|-----------------|
| `listen_10_hours` | Worship Listener | Accumulate 10 hours of ambient sound or music listening time | Headphones | "10 hours of worship and peace. Music is your companion in faith." | toast-confetti |

Track via `wr_listening_history` — sum all session durations.

### New `activityCounts` Fields

Two new counters needed in the `wr_badges` `activityCounts` object:

| Counter | Purpose |
|---------|---------|
| `intercessionCount` | Cumulative "Pray for this" taps on other users' prayers. Incremented when user taps "Pray for this" on a prayer that is not their own. |
| `bibleChaptersRead` | Total Bible chapters read to completion. Incremented when a chapter is marked complete in `wr_bible_progress`. |

These supplement (not replace) the existing counters. The `meditate` counter already exists; meditation badges can also cross-reference `wr_meditation_history` for accurate session count.

### Badge Category Labels

The existing badge system has categories (streak, level, activity, community, special). Add these new category labels:

| Category | Badges |
|----------|--------|
| `meditation` | meditate_10, meditate_25, meditate_50, meditate_100 |
| `prayer-wall` | prayerwall_first_post, prayerwall_10_posts, prayerwall_25_intercessions |
| `bible` | bible_first_chapter, bible_10_chapters, bible_25_chapters, bible_complete_book |
| `gratitude` | gratitude_7_streak, gratitude_30_days, gratitude_100_days |
| `local-support` | local_first_visit, local_5_visits |
| `listening` | listen_10_hours |

### Integration with Existing Badge System

1. **Badge definitions**: Add all 17 new definitions to the existing badge constants file, using the same structure as current badges (id, name, description, icon, category, tier, check function).
2. **Check functions**: Each new badge's check function follows the existing pattern — read relevant localStorage data, count the relevant metric, return `true` if the threshold is met.
3. **Badge evaluation cycle**: The new badge checks run during the existing `checkForNewBadges()` flow inside `recordActivity()`. Some badges also need checks triggered from their respective feature contexts (e.g., Bible chapter completion, gratitude save, local visit check-in, intercession tap).
4. **Celebration system**: All celebrations use the existing tier system — no new celebration patterns needed. Tier assignments as specified per badge.
5. **Badge display**: New badges appear in the existing BadgeGrid component — locked (grayscale + lock icon) until earned, same as existing badges.
6. **Badge counts**: Any UI displaying "X badges earned" or "X total badges" must reflect the new total (~46 badges).

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All badge names, descriptions, and messages are hardcoded constants. No crisis detection required.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Zero data persistence.** Badge checking does not run for unauthenticated users because `recordActivity()` is already a no-op when not authenticated.
- No badge data is created or modified for logged-out users.

### Logged-in users:
- New badge definitions are added to the existing badge constants (code, not localStorage).
- New `activityCounts` fields (`intercessionCount`, `bibleChaptersRead`) are added to the `wr_badges` data model.
- Existing `wr_badges` data in localStorage is backward-compatible — missing `activityCounts` fields default to 0 on read.
- Badge data persists across sessions and page reloads.
- `logout()` does NOT clear badge data.

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| New badge check functions | Never called (`recordActivity()` no-ops) | Run during badge evaluation cycle |
| New `activityCounts` fields | Not created | Initialized to 0 on first access, incremented on relevant actions |
| Badge display (BadgeGrid) | Not visible (dashboard is auth-gated) | New badges appear as locked until earned |
| Badge counts in UI | Not visible | Reflect new total (~46 badges) |

---

## Responsive Behavior

This spec adds no new UI components — only new badge definitions and tracking logic. The existing BadgeGrid and GrowthProfile components already handle responsive display:

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | BadgeGrid displays in 3-4 column grid, badges wrap naturally |
| Tablet (640-1024px) | BadgeGrid expands to wider grid |
| Desktop (> 1024px) | Full badge grid with larger icons |

No responsive changes needed. The existing components accommodate additional badges automatically.

---

## Completion & Navigation

N/A — This is a data/logic layer addition to the existing badge system. No new routes, pages, or navigation.

---

## Design Notes

- Reference the existing BadgeGrid component for badge display (locked = grayscale + lock icon, earned = full color)
- Reference the existing CelebrationOverlay component for full-screen celebrations
- Reference the existing Toast component for toast/toast-confetti/special-toast celebrations
- All icons are from Lucide React (Wind, Brain, Heart, Sparkles, MessageCircle, Shield, HandHelping, BookOpen, Compass, GraduationCap, Award, MapPin, Map, Sun, Star, Headphones)
- No new visual patterns — all celebrations and displays use existing patterns
- Design system recon (`_plans/recon/design-system.md`) is available but not needed for this spec since no new UI patterns are introduced

---

## Edge Cases

- **Existing users with `wr_badges` missing new `activityCounts` fields**: On read, default missing fields to 0. No migration needed — the fields are populated as users perform relevant actions.
- **Bible Master check requires chapter count data**: The check function needs to know how many chapters each Bible book has. This data should come from the existing Bible data files (the 66-book structure already loaded for the Bible reader).
- **Gratitude streak calculation**: Must handle timezone correctly using `getLocalDateString()` from existing utils. Consecutive days = no gaps when sorted by date.
- **Local visits deduplication**: Count unique `placeId` values in `wr_local_visits`, not total visit entries (a user could visit the same church twice).
- **Listening time calculation**: Sum all session `duration` values from `wr_listening_history`. Duration is in milliseconds or seconds (match the format used in the existing listening history data model). 10 hours = 36,000 seconds or 36,000,000 milliseconds.
- **Meditation session count vs `activityCounts.meditate`**: `activityCounts.meditate` counts unique days with meditation activity. `wr_meditation_history` counts individual sessions (multiple per day possible). Meditation badges should use `wr_meditation_history` length for accurate session counts.
- **Prayer Wall post count**: Must count posts where the current user is the author. This requires reading prayer wall data and filtering by `authorId`. If prayer wall data is in localStorage, read it directly. If not yet persisted, the badge check returns false gracefully.
- **Badge IDs must not conflict with existing IDs**: All 17 new badge IDs use distinct prefixes (`meditate_`, `prayerwall_`, `bible_`, `gratitude_`, `local_`, `listen_10_hours`) that don't overlap with existing IDs.

---

## Out of Scope

- **New celebration patterns or animations** — uses existing toast, toast-confetti, special-toast, and full-screen tiers
- **New badge display components** — uses existing BadgeGrid and GrowthProfile components
- **Badge category filtering/tabs in the UI** — the BadgeGrid already groups by category
- **Backend API persistence** — Phase 3
- **Real authentication** — Phase 3
- **Badge sharing to social media** — not in MVP
- **Custom/user-created badges** — not in MVP
- **Changes to existing badge definitions** — only additions

---

## Acceptance Criteria

### Badge Definitions
- [ ] All 17 new badge definitions are added to the existing badge constants with ID, name, description, icon, category, and celebration tier
- [ ] 4 meditation badges defined with thresholds: 10, 25, 50, 100 sessions
- [ ] 3 prayer wall badges defined: first post, 10 posts, 25 intercessions
- [ ] 4 Bible reading badges defined: first chapter, 10 chapters, 25 chapters, complete book
- [ ] 3 gratitude badges defined: 7-day streak, 30 total days, 100 total days
- [ ] 2 local support badges defined: first visit, 5 visits
- [ ] 1 audio listening badge defined: 10 hours total
- [ ] Each new badge has correct Lucide icon name assigned
- [ ] Each new badge has correct celebration tier: toast, toast-confetti, special-toast, or full-screen
- [ ] New badge IDs do not conflict with any existing badge IDs

### Badge Check Functions
- [ ] Meditation badges check `wr_meditation_history` array length against thresholds (10, 25, 50, 100)
- [ ] Prayer Wall post badges count items in prayer wall data matching current user's `authorId`
- [ ] Intercessor badge checks `activityCounts.intercessionCount >= 25`
- [ ] Bible chapter badges count total completed chapters from `wr_bible_progress`
- [ ] Bible Master badge checks if any single book has all chapters complete
- [ ] Gratitude streak badge checks 7 consecutive days in `wr_gratitude_entries`
- [ ] Gratitude total badges count unique dates in `wr_gratitude_entries` (30, 100)
- [ ] Local support badges count unique `placeId` values in `wr_local_visits` (1, 5)
- [ ] Worship Listener badge sums session durations from `wr_listening_history` and checks >= 10 hours

### Data Model Updates
- [ ] `intercessionCount` added to `wr_badges` `activityCounts` (defaults to 0)
- [ ] `bibleChaptersRead` added to `wr_badges` `activityCounts` (defaults to 0)
- [ ] Existing `wr_badges` data is backward-compatible — missing new fields default to 0 on read
- [ ] No existing badge definitions, celebration logic, or badge display components are modified

### Integration
- [ ] New badge checks run during existing `checkForNewBadges()` evaluation cycle
- [ ] Intercession count increments when user taps "Pray for this" on another user's prayer
- [ ] Bible chapter count increments when a chapter is marked complete
- [ ] New badges appear in BadgeGrid as locked (grayscale + lock icon) until earned
- [ ] New badges appear in GrowthProfile badge showcase
- [ ] Total badge count in any "X badges earned" or "X total badges" UI reflects the new total (~46)

### Test Coverage
- [ ] Each meditation badge fires at exactly the right session count (10, 25, 50, 100)
- [ ] Meditation badges do NOT fire below threshold
- [ ] Prayer Wall post badges fire at correct counts (1, 10)
- [ ] Intercessor badge fires at 25 intercessions
- [ ] Bible chapter badges fire at correct counts (1, 10, 25)
- [ ] Bible Master fires when any single book is fully complete
- [ ] Bible Master does NOT fire when chapters are spread across multiple books without completing any
- [ ] Gratitude streak badge fires after 7 consecutive days of entries
- [ ] Gratitude streak badge does NOT fire with a gap in consecutive days
- [ ] Gratitude total badges fire at 30 and 100 unique days
- [ ] Local support badges fire at 1 and 5 unique visits
- [ ] Local support badges count unique placeIds, not total visit entries
- [ ] Worship Listener badge fires at exactly 10 hours of accumulated listening time
- [ ] All 17 new badges do not re-award if already earned
- [ ] New `activityCounts` fields default to 0 for existing users
- [ ] No existing tests break after adding new badge definitions
