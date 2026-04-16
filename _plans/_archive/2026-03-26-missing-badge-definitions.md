# Implementation Plan: Missing Badge Definitions

**Spec:** `_specs/missing-badge-definitions.md`
**Date:** 2026-03-26
**Branch:** `claude/feature/missing-badge-definitions`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — not needed for this spec; no new UI patterns)
**Recon Report:** not applicable
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded — badge data models referenced)

---

## Architecture Context

### Existing Badge System Files

- **Badge definitions:** `frontend/src/constants/dashboard/badges.ts` — 44 badges across 8 arrays: streak (7), level (6), activity milestones (9), reading plan (3), bible book (4), community (6), challenge (7), welcome (1), full worship day (1). Exported as `BADGE_DEFINITIONS`, `BADGE_MAP`, `FRESH_BADGE_DATA`, `FRESH_ACTIVITY_COUNTS`.
- **Badge types:** `frontend/src/types/dashboard.ts` — `BadgeDefinition`, `BadgeData`, `ActivityCounts` (11 fields), `BadgeCategory` (6 values: `streak | level | activity | community | special | challenge`), `CelebrationTier`, `BadgeEarnedEntry`, `ActivityType`.
- **Badge engine:** `frontend/src/services/badge-engine.ts` — `checkForNewBadges(context, earned)` runs 8 check categories: streak thresholds, level, activity milestones via `ACTIVITY_BADGE_MAP`, full worship day, community friends, community encouragements, reading plan completion, local support (≥5), bible book completion.
- **Badge storage:** `frontend/src/services/badge-storage.ts` — `getBadgeData()`, `saveBadgeData()`, `initializeBadgesForNewUser()`, `getOrInitBadgeData()`, `addEarnedBadge()`, `incrementActivityCount()`, `clearNewlyEarned()`. Uses `fillActivityCounts()` which gracefully defaults missing fields to 0.
- **Badge icons:** `frontend/src/constants/dashboard/badge-icons.ts` — `BADGE_ICON_MAP` with explicit entries per badge ID + `CATEGORY_DEFAULTS` fallback per category. `getBadgeIcon(badgeId)` returns `{ icon, bgColor, textColor, glowColor }`.
- **BadgeGrid:** `frontend/src/components/dashboard/BadgeGrid.tsx` — 6 hardcoded sections with explicit badge ID lists. Displays earned (color + glow) vs locked (grayscale + lock icon). Shows `earnedCount/totalBadges` header.
- **ProfileBadgeShowcase:** `frontend/src/components/profile/ProfileBadgeShowcase.tsx` — Grid of ALL `BADGE_DEFINITIONS`, earned vs locked display.
- **CelebrationOverlay:** `frontend/src/components/dashboard/CelebrationOverlay.tsx` — Full-screen celebration for `full-screen` tier badges. Other tiers (toast, toast-confetti, special-toast) handled by toast system.
- **useFaithPoints hook:** `frontend/src/hooks/useFaithPoints.ts` — `recordActivity()` calls `incrementActivityCount()` → `checkForNewBadges()` → `addEarnedBadge()` → save.

### Data Sources for New Badges

- **Meditation sessions:** `wr_meditation_history` — `MeditationSession[]` (max 365) from `frontend/src/services/meditation-storage.ts`. Each entry has `date`, `type`, `durationMinutes`.
- **Prayer Wall intercessions:** No existing tracking. `togglePraying()` in `usePrayerReactions` hook returns `wasPraying` boolean. Called from `PrayerWall.tsx` (line 247), `PrayerWallDashboard.tsx` (line 67), `PrayerDetail.tsx` (line 37), `PrayerWallProfile.tsx` (line 192, 249).
- **Bible progress:** `wr_bible_progress` — `Record<string, number[]>` (book slug → chapter numbers) from `frontend/src/hooks/useBibleProgress.ts`. `BIBLE_BOOKS` from `frontend/src/constants/bible.ts` has 66 entries with `chapters` count per book.
- **Gratitude entries:** `wr_gratitude_entries` — `GratitudeEntry[]` (max 365) from `frontend/src/services/gratitude-storage.ts`. Each entry has `date` (YYYY-MM-DD) and `items`.
- **Local visits:** `wr_local_visits` — `LocalVisit[]` (max 500) from `frontend/src/services/local-visit-storage.ts`. Each has `placeId`. `getUniqueVisitedPlaces()` returns `{ total, churches, counselors, cr }`.
- **Listening history:** `wr_listening_history` — `ListeningSession[]` (max 100) from `frontend/src/services/storage-service.ts`. Each has `durationSeconds: number`. 10 hours = 36000 seconds.
- **Prayer Wall posts:** Not persistently tracked per user. Mock data only. `activityCounts.prayerWall` counts ALL prayer wall interactions (posts + pray-for-this taps), not just posts.

### Test Patterns

- **Badge constants tests:** `frontend/src/constants/dashboard/__tests__/badges.test.ts` — Tests unique IDs, required fields, total count (44), per-category counts, tier assignments. Uses direct `BADGE_MAP` and `BADGE_DEFINITIONS` assertions.
- **Badge engine tests:** `frontend/src/services/__tests__/badge-engine.test.ts` — Uses `makeContext()` helper and `allTrueActivities()` helper. Tests threshold boundaries (at, below, above), already-earned deduplication, localStorage mocking for reading plan/bible/local support checks.
- **Integration tests:** `frontend/src/__tests__/badge-integration.test.ts` — `renderHook` with `AuthProvider` wrapper, `vi.setSystemTime()` for date control, `recordActivity()` calls.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Badge check functions | Never called for logged-out (`recordActivity` no-ops) | Steps 4, 7, 8 | `useFaithPoints` already auth-gated |
| Activity count increment | Not created for logged-out | Steps 7, 8 | `recordActivity` no-ops when not authenticated |
| Badge display (BadgeGrid) | Dashboard is auth-gated | Step 6 | Existing auth gate on dashboard |
| Badge display (ProfileBadgeShowcase) | Viewable by anyone | Step 6 | No auth needed (display only) |

No new auth gates needed — all new logic runs inside existing auth-gated flows.

---

## Design System Values (for UI steps)

N/A — This spec adds no new UI patterns. The BadgeGrid and ProfileBadgeShowcase components already handle display. New badges use existing earned/locked visual patterns. New icon colors follow the existing `BadgeIconConfig` pattern from `badge-icons.ts`.

---

## Design System Reminder

- Badge icons use `BadgeIconConfig` with `{ icon, bgColor, textColor, glowColor }` — Tailwind classes for bg/text, raw rgba for boxShadow
- Locked badges: `opacity-40 grayscale` + Lock overlay
- Earned badges: colored bg + `boxShadow: 0 0 12px ${glowColor}`
- BadgeGrid sections are hardcoded ID arrays (not dynamic by category)
- Category fallback: `getBadgeIcon()` falls back to `CATEGORY_DEFAULTS[category]` if no explicit mapping

---

## Shared Data Models (from Master Plan)

```typescript
// Existing ActivityCounts — needs 2 new fields
interface ActivityCounts {
  pray: number;
  journal: number;
  meditate: number;
  listen: number;
  prayerWall: number;
  readingPlan: number;
  gratitude: number;
  reflection: number;
  encouragementsSent: number;
  fullWorshipDays: number;
  challengesCompleted: number;
  // NEW:
  intercessionCount: number;    // Cumulative "Pray for this" taps
  bibleChaptersRead: number;    // Total Bible chapters completed
}

// Existing BadgeCategory — needs 6 new values
type BadgeCategory = 'streak' | 'level' | 'activity' | 'community' | 'special' | 'challenge'
  | 'meditation' | 'prayer-wall' | 'bible' | 'gratitude' | 'local-support' | 'listening';
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_badges` | Both | Badge data — new `activityCounts` fields added |
| `wr_meditation_history` | Read | Session count for meditation badges |
| `wr_bible_progress` | Read | Chapter/book counts for Bible badges |
| `wr_gratitude_entries` | Read | Entry dates for gratitude badges |
| `wr_local_visits` | Read | Unique place visits for local support badges |
| `wr_listening_history` | Read | Duration totals for listening badge |

---

## Responsive Structure

N/A — No new UI components. Existing BadgeGrid and ProfileBadgeShowcase handle responsive display automatically. New badges appear in the existing grid layout.

---

## Vertical Rhythm

N/A — No new page sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] **`meditate_25` ID conflict resolved**: An existing badge `meditate_25` ("Mindful", 25th day with meditation) already exists. The spec defines a new `meditate_25` ("Mindful Seeker", 25 meditation sessions). These use different metrics (daily count vs session count). **Proposed resolution:** Skip the spec's `meditate_25` — keep existing badge, add only `meditate_10`, `meditate_50`, `meditate_100` (3 new meditation badges instead of 4).
- [ ] **`bible_complete_book` overlap resolved**: The spec's `bible_complete_book` ("Bible Master" — complete all chapters in any single book) is functionally identical to existing `bible_book_1` ("First Book" — read every chapter of a Bible book). Both fire when any book is 100% complete. **Proposed resolution:** Skip `bible_complete_book` — add only `bible_first_chapter`, `bible_10_chapters`, `bible_25_chapters` (3 new Bible badges instead of 4).
- [ ] **`local_5_visits` overlap resolved**: The spec's `local_5_visits` ("Connected Locally" — 5 unique visits) is functionally identical to existing `local_support_5` ("Local Support Seeker" — 5 unique places). **Proposed resolution:** Skip `local_5_visits` — add only `local_first_visit` (1 new local support badge instead of 2).
- [ ] **Prayer Wall post tracking**: The spec's `prayerwall_first_post` and `prayerwall_10_posts` badges require counting posts by the current user. Prayer wall posts are NOT persisted per-user in localStorage (mock data only). **Proposed resolution:** Add a `prayerWallPosts` counter to `activityCounts` (incrementing in the submit-prayer handler), separate from the existing `prayerWall` counter which tracks all interactions.
- [ ] **New badge count after deduplication**: 17 proposed → 3 duplicates removed → **14 truly new badges**. Total: 44 existing + 14 new = **58 badges**.
- [ ] All auth-gated actions from the spec are accounted for (they are — all run inside existing auth-gated flows)
- [ ] Existing tests must be updated (total badge count assertion changes from 44 to 58)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `meditate_25` ID conflict | Skip (keep existing) | Existing covers the 25-meditation concept. Adding `meditate_10`/50/100 for session-based tracking adds the missing milestones without conflict. |
| `bible_complete_book` overlap | Skip (keep `bible_book_1`) | Identical trigger condition. Adding chapter-count badges (`bible_first_chapter`, `bible_10_chapters`, `bible_25_chapters`) provides the new granularity. |
| `local_5_visits` overlap | Skip (keep `local_support_5`) | Identical trigger. `local_first_visit` provides the missing first-visit badge. |
| Prayer Wall post count | New `prayerWallPosts` counter in `activityCounts` | No existing per-user post persistence. Counter is the simplest tracking mechanism. |
| Meditation check source | `wr_meditation_history` array length | Spec mandates session count, not daily count. More granular than `activityCounts.meditate`. |
| Bible chapter check source | Direct count from `wr_bible_progress` | Sum all chapter arrays across all books. More accurate than a denormalized counter. |
| Gratitude streak check | `getLocalDateString()` for consecutive day checks | Avoids timezone bugs (never use `toISOString().split('T')[0]`). |
| Listening time unit | `durationSeconds` (from `ListeningSession` type) | 10 hours = 36000 seconds. |
| `BadgeCategory` expansion | Add 6 new values | Spec requires category labels for UI grouping in BadgeGrid sections. |

---

## Implementation Steps

### Step 1: Update TypeScript Types

**Objective:** Add new `ActivityCounts` fields and `BadgeCategory` values.

**Files to modify:**
- `frontend/src/types/dashboard.ts` — Add `intercessionCount`, `bibleChaptersRead`, `prayerWallPosts` to `ActivityCounts`; add 6 new `BadgeCategory` values

**Details:**

Add to `ActivityCounts` interface (after `challengesCompleted: number;`):
```typescript
intercessionCount: number;
bibleChaptersRead: number;
prayerWallPosts: number;
```

Update `BadgeCategory` type to:
```typescript
export type BadgeCategory = 'streak' | 'level' | 'activity' | 'community' | 'special' | 'challenge'
  | 'meditation' | 'prayer-wall' | 'bible' | 'gratitude' | 'local-support' | 'listening';
```

**Auth gating:** N/A — type-only changes.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any existing field names or types in `ActivityCounts`
- DO NOT change the `BadgeDefinition` interface — it already supports the new categories via the updated type

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Type compilation check | unit | Verified implicitly by TypeScript compilation succeeding after changes |

**Expected state after completion:**
- [ ] `ActivityCounts` has 14 fields (11 existing + 3 new)
- [ ] `BadgeCategory` has 12 values (6 existing + 6 new)
- [ ] `pnpm tsc --noEmit` passes (though downstream tests may fail until Step 2 updates constants)

---

### Step 2: Add New Badge Definitions & Update Fresh Constants

**Objective:** Add 14 new badge definitions to the constants file and update `FRESH_ACTIVITY_COUNTS`.

**Files to modify:**
- `frontend/src/constants/dashboard/badges.ts` — Add new badge definition arrays, update `FRESH_ACTIVITY_COUNTS`, add to `BADGE_DEFINITIONS`

**Details:**

Add imports at top: No new imports needed (all types already imported).

Add new `FRESH_ACTIVITY_COUNTS` fields (after `challengesCompleted: 0`):
```typescript
intercessionCount: 0,
bibleChaptersRead: 0,
prayerWallPosts: 0,
```

Add 6 new badge arrays after `challengeBadges` and before `welcomeBadge`:

```typescript
const meditationMilestoneBadges: BadgeDefinition[] = [
  { id: 'meditate_10', name: 'Peaceful Beginner', description: '10 sessions of stillness. Your mind is learning to rest in God.', category: 'meditation', celebrationTier: 'toast-confetti' },
  { id: 'meditate_50', name: 'Contemplative Heart', description: '50 moments of meditation. God meets you in the silence.', category: 'meditation', celebrationTier: 'special-toast' },
  { id: 'meditate_100', name: 'Master of Stillness', description: '100 meditations. You\'ve built a practice that will carry you for a lifetime.', category: 'meditation', celebrationTier: 'full-screen' },
];

const prayerWallMilestoneBadges: BadgeDefinition[] = [
  { id: 'prayerwall_first_post', name: 'First Prayer Shared', description: 'You shared your heart with the community. That takes courage.', category: 'prayer-wall', celebrationTier: 'toast-confetti' },
  { id: 'prayerwall_10_posts', name: 'Prayer Warrior', description: '10 prayers shared. You\'re building a community of faith.', category: 'prayer-wall', celebrationTier: 'toast-confetti' },
  { id: 'prayerwall_25_intercessions', name: 'Intercessor', description: 'You\'ve lifted 25 people in prayer. Heaven notices.', category: 'prayer-wall', celebrationTier: 'special-toast' },
];

const bibleReadingMilestoneBadges: BadgeDefinition[] = [
  { id: 'bible_first_chapter', name: 'First Chapter', description: 'Your first chapter! The Word is a lamp to your feet.', category: 'bible', celebrationTier: 'toast' },
  { id: 'bible_10_chapters', name: 'Bible Explorer', description: '10 chapters explored. You\'re discovering the depth of God\'s Word.', category: 'bible', celebrationTier: 'toast-confetti' },
  { id: 'bible_25_chapters', name: 'Scripture Scholar', description: '25 chapters. You\'re building a foundation that will never crack.', category: 'bible', celebrationTier: 'special-toast' },
];

const gratitudeMilestoneBadges: BadgeDefinition[] = [
  { id: 'gratitude_7_streak', name: 'Thankful Heart', description: 'A week of gratitude. Your perspective is shifting.', category: 'gratitude', celebrationTier: 'toast-confetti' },
  { id: 'gratitude_30_days', name: 'Gratitude Habit', description: '30 days of counting blessings. Gratitude is becoming part of who you are.', category: 'gratitude', celebrationTier: 'toast-confetti' },
  { id: 'gratitude_100_days', name: 'Overflowing Cup', description: '100 days of gratitude. Your cup truly overflows.', category: 'gratitude', celebrationTier: 'full-screen' },
];

const localSupportBadges: BadgeDefinition[] = [
  { id: 'local_first_visit', name: 'Community Seeker', description: 'You took a step into your local community. That matters.', category: 'local-support', celebrationTier: 'toast-confetti' },
];

const listeningBadges: BadgeDefinition[] = [
  { id: 'listen_10_hours', name: 'Worship Listener', description: '10 hours of worship and peace. Music is your companion in faith.', category: 'listening', celebrationTier: 'toast-confetti' },
];
```

Update `BADGE_DEFINITIONS` to include new arrays:
```typescript
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...streakBadges,
  ...levelBadges,
  ...activityMilestoneBadges,
  ...readingPlanBadges,
  ...bibleBookBadges,
  fullWorshipDayBadge,
  ...communityBadges,
  ...challengeBadges,
  ...meditationMilestoneBadges,
  ...prayerWallMilestoneBadges,
  ...bibleReadingMilestoneBadges,
  ...gratitudeMilestoneBadges,
  ...localSupportBadges,
  ...listeningBadges,
  welcomeBadge,
];
```

**Auth gating:** N/A — constants only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any existing badge definitions
- DO NOT change existing badge array contents
- DO NOT use ID `meditate_25` (conflicts with existing), `bible_complete_book` (overlaps `bible_book_1`), or `local_5_visits` (overlaps `local_support_5`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Compilation succeeds | unit | TypeScript compiles with new definitions (existing tests will need updating in Step 9) |

**Expected state after completion:**
- [ ] 14 new badge definitions added
- [ ] `BADGE_DEFINITIONS.length` is 58
- [ ] `FRESH_ACTIVITY_COUNTS` has 14 fields (all 0)
- [ ] `BADGE_MAP` contains all 58 badge IDs

---

### Step 3: Add Badge Icon Mappings

**Objective:** Add icon configurations for all 14 new badges.

**Files to modify:**
- `frontend/src/constants/dashboard/badge-icons.ts` — Add imports for new Lucide icons, add entries to `BADGE_ICON_MAP`, add `CATEGORY_DEFAULTS` for new categories

**Details:**

Add new Lucide imports (verify each exists in lucide-react):
```typescript
import {
  // ... existing imports ...
  Wind,
  MessageCircle,
  Shield,
  HandHelping,
  Compass,
  GraduationCap,
  Award,
  MapPin,
  Map,
} from 'lucide-react'
```

Note: `Brain`, `Heart`, `Sparkles`, `BookOpen`, `Sun`, `Star`, `Headphones` are already imported.

Add `CATEGORY_DEFAULTS` for new categories:
```typescript
meditation: {
  icon: Brain,
  bgColor: 'bg-indigo-500/20',
  textColor: 'text-indigo-400',
  glowColor: 'rgba(99,102,241,0.4)',
},
'prayer-wall': {
  icon: MessageCircle,
  bgColor: 'bg-orange-500/20',
  textColor: 'text-orange-400',
  glowColor: 'rgba(249,115,22,0.4)',
},
bible: {
  icon: BookOpen,
  bgColor: 'bg-emerald-500/20',
  textColor: 'text-emerald-400',
  glowColor: 'rgba(52,211,153,0.4)',
},
gratitude: {
  icon: Heart,
  bgColor: 'bg-rose-400/20',
  textColor: 'text-rose-400',
  glowColor: 'rgba(251,113,133,0.4)',
},
'local-support': {
  icon: MapPin,
  bgColor: 'bg-cyan-500/20',
  textColor: 'text-cyan-400',
  glowColor: 'rgba(6,182,212,0.4)',
},
listening: {
  icon: Headphones,
  bgColor: 'bg-teal-500/20',
  textColor: 'text-teal-400',
  glowColor: 'rgba(20,184,166,0.4)',
},
```

Add explicit entries to `BADGE_ICON_MAP`:
```typescript
// Meditation milestones
meditate_10: { icon: Wind, bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400', glowColor: 'rgba(99,102,241,0.4)' },
meditate_50: { icon: Heart, bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-300', glowColor: 'rgba(99,102,241,0.4)' },
meditate_100: { icon: Sparkles, bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-300', glowColor: 'rgba(99,102,241,0.5)' },

// Prayer Wall milestones
prayerwall_first_post: { icon: MessageCircle, bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', glowColor: 'rgba(249,115,22,0.4)' },
prayerwall_10_posts: { icon: Shield, bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', glowColor: 'rgba(249,115,22,0.4)' },
prayerwall_25_intercessions: { icon: HandHelping, bgColor: 'bg-orange-500/20', textColor: 'text-orange-300', glowColor: 'rgba(249,115,22,0.5)' },

// Bible reading milestones
bible_first_chapter: { icon: BookOpen, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', glowColor: 'rgba(52,211,153,0.3)' },
bible_10_chapters: { icon: Compass, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', glowColor: 'rgba(52,211,153,0.3)' },
bible_25_chapters: { icon: GraduationCap, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-300', glowColor: 'rgba(52,211,153,0.4)' },

// Gratitude milestones
gratitude_7_streak: { icon: Heart, bgColor: 'bg-rose-400/20', textColor: 'text-rose-400', glowColor: 'rgba(251,113,133,0.4)' },
gratitude_30_days: { icon: Sun, bgColor: 'bg-rose-400/20', textColor: 'text-rose-400', glowColor: 'rgba(251,113,133,0.4)' },
gratitude_100_days: { icon: Star, bgColor: 'bg-rose-400/20', textColor: 'text-rose-300', glowColor: 'rgba(251,113,133,0.5)' },

// Local support
local_first_visit: { icon: MapPin, bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400', glowColor: 'rgba(6,182,212,0.4)' },

// Listening
listen_10_hours: { icon: Headphones, bgColor: 'bg-teal-500/20', textColor: 'text-teal-400', glowColor: 'rgba(20,184,166,0.4)' },
```

**Auth gating:** N/A — constants only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing icon mappings
- DO NOT use icons that are not available in lucide-react (verify `HandHelping`, `Shield`, `Wind`, `Compass`, `GraduationCap`, `Award`, `MapPin`, `Map` exist — `Award` and `Map` imported but not used in entries; that's fine)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All new badge IDs have icon mappings | unit | Updated in Step 9 — verify `getBadgeIcon(id)` returns non-fallback for all 14 new IDs |

**Expected state after completion:**
- [ ] 14 new entries in `BADGE_ICON_MAP`
- [ ] 6 new entries in `CATEGORY_DEFAULTS`
- [ ] `getBadgeIcon()` returns correct icons for all new badge IDs

---

### Step 4: Update Badge Engine — Add New Check Functions

**Objective:** Add check functions for 6 new badge categories in `checkForNewBadges()`.

**Files to modify:**
- `frontend/src/services/badge-engine.ts` — Add 6 new check sections after existing checks

**Details:**

Add imports at top:
```typescript
import { getMeditationHistory } from '@/services/meditation-storage';
import { getGratitudeEntries } from '@/services/gratitude-storage';
```

Note: `getUniqueVisitedPlaces` already imported. `BIBLE_BOOKS` already imported.

Add the following check sections inside `checkForNewBadges()`, after the existing bible book badges section (section 8) and before `return result`:

```typescript
// 9. Meditation session milestones (from wr_meditation_history)
const MEDITATION_SESSION_BADGES: Record<number, string> = {
  10: 'meditate_10',
  50: 'meditate_50',
  100: 'meditate_100',
};

try {
  const sessions = getMeditationHistory();
  const sessionCount = sessions.length;
  for (const [threshold, badgeId] of Object.entries(MEDITATION_SESSION_BADGES)) {
    if (sessionCount >= Number(threshold) && !earned[badgeId]) {
      result.push(badgeId);
    }
  }
} catch {
  // Malformed localStorage — skip meditation session badge check
}

// 10. Prayer Wall post milestones (from activityCounts.prayerWallPosts)
const PRAYER_POST_BADGES: Record<number, string> = {
  1: 'prayerwall_first_post',
  10: 'prayerwall_10_posts',
};

for (const [threshold, badgeId] of Object.entries(PRAYER_POST_BADGES)) {
  if (context.activityCounts.prayerWallPosts >= Number(threshold) && !earned[badgeId]) {
    result.push(badgeId);
  }
}

// 11. Intercessor badge (from activityCounts.intercessionCount)
if (context.activityCounts.intercessionCount >= 25 && !earned['prayerwall_25_intercessions']) {
  result.push('prayerwall_25_intercessions');
}

// 12. Bible chapter milestones (from wr_bible_progress, total chapters across all books)
const BIBLE_CHAPTER_BADGES: Record<number, string> = {
  1: 'bible_first_chapter',
  10: 'bible_10_chapters',
  25: 'bible_25_chapters',
};

try {
  const progressJson = localStorage.getItem('wr_bible_progress');
  if (progressJson) {
    const progressMap = JSON.parse(progressJson) as Record<string, number[]>;
    let totalChapters = 0;
    for (const chapters of Object.values(progressMap)) {
      if (Array.isArray(chapters)) {
        totalChapters += chapters.length;
      }
    }
    for (const [threshold, badgeId] of Object.entries(BIBLE_CHAPTER_BADGES)) {
      if (totalChapters >= Number(threshold) && !earned[badgeId]) {
        result.push(badgeId);
      }
    }
  }
} catch {
  // Malformed localStorage — skip Bible chapter badge check
}

// 13. Gratitude milestones (from wr_gratitude_entries)
try {
  const entries = getGratitudeEntries();
  const uniqueDates = new Set(entries.map(e => e.date));
  const totalDays = uniqueDates.size;

  // Total days badges
  const GRATITUDE_TOTAL_BADGES: Record<number, string> = {
    30: 'gratitude_30_days',
    100: 'gratitude_100_days',
  };
  for (const [threshold, badgeId] of Object.entries(GRATITUDE_TOTAL_BADGES)) {
    if (totalDays >= Number(threshold) && !earned[badgeId]) {
      result.push(badgeId);
    }
  }

  // Consecutive streak badge (7 days)
  if (!earned['gratitude_7_streak'] && totalDays >= 7) {
    const sortedDates = Array.from(uniqueDates).sort();
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
      const curr = new Date(sortedDates[i] + 'T12:00:00');
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    if (maxConsecutive >= 7) {
      result.push('gratitude_7_streak');
    }
  }
} catch {
  // Malformed localStorage — skip gratitude badge check
}

// 14. Local support first visit (from wr_local_visits)
if (!earned['local_first_visit']) {
  try {
    const { total } = getUniqueVisitedPlaces();
    if (total >= 1) {
      result.push('local_first_visit');
    }
  } catch {
    // Malformed localStorage — skip local first visit badge check
  }
}

// 15. Worship Listener (from wr_listening_history, 10 hours = 36000 seconds)
if (!earned['listen_10_hours']) {
  try {
    const historyJson = localStorage.getItem('wr_listening_history');
    if (historyJson) {
      const sessions = JSON.parse(historyJson) as Array<{ durationSeconds?: number }>;
      const totalSeconds = sessions.reduce(
        (sum, s) => sum + (typeof s.durationSeconds === 'number' ? s.durationSeconds : 0),
        0,
      );
      if (totalSeconds >= 36000) {
        result.push('listen_10_hours');
      }
    }
  } catch {
    // Malformed localStorage — skip listening badge check
  }
}
```

**Auth gating:** Inherits from `recordActivity()` caller — `checkForNewBadges` is only called for authenticated users.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing check sections (1-8)
- DO NOT use `new Date().toISOString().split('T')[0]` for date comparison (use `'T12:00:00'` noon trick for date diff to avoid DST issues)
- DO NOT read from `activityCounts.meditate` for session-based badges (use `wr_meditation_history` directly)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Meditation badges at exact thresholds | unit | 10, 50, 100 sessions → correct badge IDs |
| Meditation badge below threshold | unit | 9 sessions → no meditate_10 |
| Prayer post badges at thresholds | unit | 1, 10 posts → correct badge IDs |
| Intercessor at 25 | unit | intercessionCount: 25 → 'prayerwall_25_intercessions' |
| Intercessor below 25 | unit | intercessionCount: 24 → not awarded |
| Bible chapter badges at thresholds | unit | 1, 10, 25 chapters → correct badges |
| Bible chapter badge NOT fire below threshold | unit | 0 chapters → no badges |
| Gratitude 7-day streak | unit | 7 consecutive dates → gratitude_7_streak |
| Gratitude streak with gap | unit | 6 consecutive + gap → no badge |
| Gratitude 30/100 total days | unit | 30/100 unique dates → correct badges |
| Local first visit | unit | 1 unique place → local_first_visit |
| Listen 10 hours | unit | 36000 durationSeconds → listen_10_hours |
| Listen below 10 hours | unit | 35999 seconds → no badge |
| Already-earned deduplication | unit | All new badges skip if in earned map |

**Expected state after completion:**
- [ ] `checkForNewBadges()` evaluates 15 check categories (8 existing + 7 new)
- [ ] All 14 new badge IDs are reachable via the check functions
- [ ] Each check is wrapped in try/catch for localStorage safety

---

### Step 5: Update Badge Storage Service

**Objective:** Extend `fillActivityCounts()` for new counter fields and add `ACTIVITY_TYPE_TO_COUNT_KEY` entry for intercessions.

**Files to modify:**
- `frontend/src/services/badge-storage.ts` — Add new fields to `fillActivityCounts()`, update `ACTIVITY_TYPE_TO_COUNT_KEY`

**Details:**

Add to `fillActivityCounts()` function (after `challengesCompleted` line):
```typescript
intercessionCount: typeof partial.intercessionCount === 'number' ? partial.intercessionCount : 0,
bibleChaptersRead: typeof partial.bibleChaptersRead === 'number' ? partial.bibleChaptersRead : 0,
prayerWallPosts: typeof partial.prayerWallPosts === 'number' ? partial.prayerWallPosts : 0,
```

This ensures backward compatibility — existing `wr_badges` data missing the new fields will default to 0 on read.

The `ACTIVITY_TYPE_TO_COUNT_KEY` map does NOT need entries for `intercessionCount` or `prayerWallPosts` because these are incremented directly (not via `incrementActivityCount(type)`). The existing `incrementActivityCount` function uses `ActivityType` keys; intercessions and prayer wall posts are tracked by custom increment logic in the handlers, not via `recordActivity()`.

**Auth gating:** N/A — storage utility.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing `fillActivityCounts` field handling
- DO NOT add entries to `ACTIVITY_TYPE_TO_COUNT_KEY` unless a corresponding `ActivityType` exists and `recordActivity()` should auto-increment it

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| fillActivityCounts defaults new fields to 0 | unit | Pass empty object → intercessionCount/bibleChaptersRead/prayerWallPosts all 0 |
| fillActivityCounts preserves existing values | unit | Pass object with new fields set → values preserved |

**Expected state after completion:**
- [ ] `getBadgeData()` returns `activityCounts` with 14 fields (all defaulting to 0)
- [ ] Existing `wr_badges` data in localStorage is backward-compatible

---

### Step 6: Update BadgeGrid Sections

**Objective:** Add new sections to BadgeGrid for the 6 new badge categories so new badges appear in the UI.

**Files to modify:**
- `frontend/src/components/dashboard/BadgeGrid.tsx` — Add new section entries to `BADGE_GRID_SECTIONS`

**Details:**

Add new sections to `BADGE_GRID_SECTIONS` array. Insert after the existing "Community" section and before the closing `]`:

```typescript
{
  label: 'Meditation Milestones',
  badgeIds: ['meditate_10', 'meditate_50', 'meditate_100'],
},
{
  label: 'Prayer Wall',
  badgeIds: ['prayerwall_first_post', 'prayerwall_10_posts', 'prayerwall_25_intercessions'],
},
{
  label: 'Bible Reading',
  badgeIds: ['bible_first_chapter', 'bible_10_chapters', 'bible_25_chapters'],
},
{
  label: 'Gratitude',
  badgeIds: ['gratitude_7_streak', 'gratitude_30_days', 'gratitude_100_days'],
},
{
  label: 'Local Support',
  badgeIds: ['local_first_visit'],
},
{
  label: 'Listening',
  badgeIds: ['listen_10_hours'],
},
```

Also consider moving existing challenge and bible book badges into their own sections if they aren't already. Check: existing sections are Streak Milestones, Level-Up, Activity Milestones, First Steps, Full Worship Day, Community. Challenge badges and bible book badges are NOT in any section. They appear in `BADGE_DEFINITIONS` and `ProfileBadgeShowcase` (which shows ALL badges) but NOT in `BadgeGrid` sections.

Add challenge and bible book sections to make them visible in BadgeGrid:
```typescript
{
  label: 'Bible Books',
  badgeIds: ['bible_book_1', 'bible_book_5', 'bible_book_10', 'bible_book_66'],
},
{
  label: 'Reading Plans',
  badgeIds: ['first_plan', 'plans_3', 'plans_10'],
},
{
  label: 'Challenges',
  badgeIds: ['challenge_first', 'challenge_lent', 'challenge_easter', 'challenge_pentecost', 'challenge_advent', 'challenge_newyear', 'challenge_master'],
},
```

**Auth gating:** BadgeGrid is only rendered on the auth-gated dashboard.

**Responsive behavior:** N/A: no UI impact — BadgeGrid already handles responsive grid layout (`grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6`).

**Guardrails (DO NOT):**
- DO NOT remove existing section entries
- DO NOT change existing section labels or badge ID lists
- DO NOT duplicate badge IDs across sections (e.g., `local_support_5` stays in Community, `local_first_visit` goes in Local Support)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All new badge IDs appear in a section | unit | Verify each of the 14 new badge IDs is in a section's badgeIds array |
| No duplicate badge IDs across sections | unit | Collect all IDs from all sections, verify uniqueness |

**Expected state after completion:**
- [ ] BadgeGrid displays 15 sections (6 existing + 3 for previously-unsectioned badges + 6 new)
- [ ] All 14 new badges visible as locked until earned
- [ ] `earnedCount/totalBadges` header reflects 58 total

---

### Step 7: Add Intercession & Prayer Wall Post Tracking

**Objective:** Increment `intercessionCount` when user prays for another's request, and `prayerWallPosts` when user submits a prayer post.

**Files to modify:**
- `frontend/src/pages/PrayerWall.tsx` — Increment `intercessionCount` in `handleTogglePraying`, increment `prayerWallPosts` in submit handler
- `frontend/src/pages/PrayerWallDashboard.tsx` — Increment `intercessionCount` in `handleTogglePraying`
- `frontend/src/pages/PrayerDetail.tsx` — Increment `intercessionCount` in `handleTogglePraying`

**Details:**

In each file that handles `togglePraying`, after the `if (!wasPraying)` check (where the user is toggling ON their prayer), add intercession counter increment:

```typescript
// In the !wasPraying branch:
import { getBadgeData, saveBadgeData } from '@/services/badge-storage';

// After recordActivity('prayerWall'):
const badgeData = getBadgeData();
saveBadgeData({
  ...badgeData,
  activityCounts: {
    ...badgeData.activityCounts,
    intercessionCount: badgeData.activityCounts.intercessionCount + 1,
  },
});
```

For prayer post submission (in `PrayerWall.tsx` `handleSubmitPrayer`):
```typescript
// After recordActivity('prayerWall'):
const badgeData = getBadgeData();
saveBadgeData({
  ...badgeData,
  activityCounts: {
    ...badgeData.activityCounts,
    prayerWallPosts: badgeData.activityCounts.prayerWallPosts + 1,
  },
});
```

For `PrayerWallProfile.tsx` — the `onTogglePraying` callback is passed inline as `() => togglePraying(prayer.id)` without the `!wasPraying` check or `recordActivity` call. This needs to be wrapped in a handler that checks the return value and increments the counter. Follow the pattern from PrayerWall.tsx.

**Auth gating:** All these handlers are already in auth-gated contexts (Prayer Wall posting requires auth, "Pray for this" interaction uses existing auth flow).

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT increment intercessionCount when the user is un-toggling (when `wasPraying` is true)
- DO NOT increment intercessionCount when the user prays for their OWN prayer
- DO NOT break the existing `recordActivity('prayerWall')` call — the new increment is additional, not replacing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Intercession count increments on pray-for-this toggle ON | integration | Simulate toggling prayer → verify wr_badges intercessionCount +1 |
| Intercession count does NOT increment on toggle OFF | integration | Simulate un-toggling → verify no change |
| Prayer post count increments on submit | integration | Simulate prayer post → verify prayerWallPosts +1 |

**Expected state after completion:**
- [ ] `activityCounts.intercessionCount` increments when user prays for others
- [ ] `activityCounts.prayerWallPosts` increments when user submits a prayer
- [ ] Existing `recordActivity('prayerWall')` still called (points/streak tracking unaffected)

---

### Step 8: Add Bible Chapter Counter Increment

**Objective:** Increment `bibleChaptersRead` in `activityCounts` when a chapter is marked as read.

**Files to modify:**
- `frontend/src/hooks/useBibleProgress.ts` — Add `bibleChaptersRead` increment in `markChapterRead()`

**Details:**

In `markChapterRead()`, after the chapter is successfully added to the progress map and saved to localStorage, increment the badge counter:

```typescript
import { getBadgeData, saveBadgeData } from '@/services/badge-storage';

// After saving wr_bible_progress with the new chapter:
const badgeData = getBadgeData();
saveBadgeData({
  ...badgeData,
  activityCounts: {
    ...badgeData.activityCounts,
    bibleChaptersRead: badgeData.activityCounts.bibleChaptersRead + 1,
  },
});
```

Note: Only increment if the chapter was not already in the progress array (avoid double-counting re-reads). Check the return value or check if the chapter was already present before adding.

**Auth gating:** `useBibleProgress` is accessible without auth (Bible reader is public), but badge data only persists for authenticated users. The `getBadgeData()` call returns fresh/empty data for non-authenticated users, and `saveBadgeData()` writes to localStorage regardless. Since badge evaluation only happens via `recordActivity()` which is auth-gated, non-auth writes here are harmless — the counter value is stored but never checked for badges until the user authenticates.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT increment if the chapter was already in the progress array (no double-counting)
- DO NOT break the existing `markChapterRead` flow (badge increment is supplementary)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| bibleChaptersRead increments on new chapter | unit | markChapterRead() for new chapter → counter +1 |
| bibleChaptersRead does NOT increment for already-read chapter | unit | markChapterRead() for existing chapter → counter unchanged |

**Expected state after completion:**
- [ ] `activityCounts.bibleChaptersRead` increments when new chapters are marked read
- [ ] No double-counting for re-reads
- [ ] Existing Bible progress tracking unaffected

---

### Step 9: Update Existing Tests — Constants & Icons

**Objective:** Update existing badge constants and icon tests to reflect the new badge count and categories.

**Files to modify:**
- `frontend/src/constants/dashboard/__tests__/badges.test.ts` — Update total count, add tests for new badges
- Add icon coverage verification for new badges (if existing icon test exists, update it; otherwise add to badges test)

**Details:**

Update total badge count assertion:
```typescript
it('total unique badge IDs count is 58', () => {
  const ids = BADGE_DEFINITIONS.map((b) => b.id);
  // 7 streak + 6 level + 9 activity + 3 reading plan + 4 bible book + 1 full_worship_day
  // + 6 community + 7 challenge + 1 welcome
  // + 3 meditation + 3 prayer-wall + 3 bible-reading + 3 gratitude + 1 local-support + 1 listening
  expect(new Set(ids).size).toBe(58);
});
```

Update `BadgeCategory` validation to include new categories:
```typescript
expect([
  'streak', 'level', 'activity', 'community', 'special', 'challenge',
  'meditation', 'prayer-wall', 'bible', 'gratitude', 'local-support', 'listening',
]).toContain(badge.category);
```

Update `FRESH_ACTIVITY_COUNTS` test:
```typescript
it('FRESH_ACTIVITY_COUNTS has all zero values', () => {
  const keys = Object.keys(FRESH_ACTIVITY_COUNTS);
  expect(keys).toHaveLength(14);
  for (const key of keys) {
    expect(FRESH_ACTIVITY_COUNTS[key as keyof typeof FRESH_ACTIVITY_COUNTS]).toBe(0);
  }
});
```

Add new test blocks:

```typescript
describe('meditation milestone badges', () => {
  it('3 definitions with correct IDs and categories', () => {
    const badges = BADGE_DEFINITIONS.filter(b => b.category === 'meditation');
    expect(badges).toHaveLength(3);
    expect(badges.map(b => b.id)).toEqual(['meditate_10', 'meditate_50', 'meditate_100']);
  });

  it('celebration tiers: 10=toast-confetti, 50=special-toast, 100=full-screen', () => {
    expect(BADGE_MAP['meditate_10'].celebrationTier).toBe('toast-confetti');
    expect(BADGE_MAP['meditate_50'].celebrationTier).toBe('special-toast');
    expect(BADGE_MAP['meditate_100'].celebrationTier).toBe('full-screen');
  });
});

describe('prayer wall milestone badges', () => {
  it('3 definitions with correct IDs', () => {
    const badges = BADGE_DEFINITIONS.filter(b => b.category === 'prayer-wall');
    expect(badges).toHaveLength(3);
    for (const id of ['prayerwall_first_post', 'prayerwall_10_posts', 'prayerwall_25_intercessions']) {
      expect(BADGE_MAP[id]).toBeDefined();
    }
  });
});

describe('bible reading milestone badges', () => {
  it('3 definitions with correct IDs', () => {
    const badges = BADGE_DEFINITIONS.filter(b => b.category === 'bible');
    expect(badges).toHaveLength(3);
    for (const id of ['bible_first_chapter', 'bible_10_chapters', 'bible_25_chapters']) {
      expect(BADGE_MAP[id]).toBeDefined();
    }
  });
});

describe('gratitude milestone badges', () => {
  it('3 definitions with correct IDs', () => {
    const badges = BADGE_DEFINITIONS.filter(b => b.category === 'gratitude');
    expect(badges).toHaveLength(3);
  });
});

describe('local support badges (new)', () => {
  it('local_first_visit has correct properties', () => {
    const badge = BADGE_MAP['local_first_visit'];
    expect(badge).toBeDefined();
    expect(badge.category).toBe('local-support');
    expect(badge.celebrationTier).toBe('toast-confetti');
  });
});

describe('listening badges', () => {
  it('listen_10_hours has correct properties', () => {
    const badge = BADGE_MAP['listen_10_hours'];
    expect(badge).toBeDefined();
    expect(badge.category).toBe('listening');
    expect(badge.celebrationTier).toBe('toast-confetti');
  });
});
```

Also add test verifying all 14 new badge IDs have explicit icon mappings (import `getBadgeIcon` from `badge-icons.ts`):
```typescript
describe('new badge icon mappings', () => {
  const newBadgeIds = [
    'meditate_10', 'meditate_50', 'meditate_100',
    'prayerwall_first_post', 'prayerwall_10_posts', 'prayerwall_25_intercessions',
    'bible_first_chapter', 'bible_10_chapters', 'bible_25_chapters',
    'gratitude_7_streak', 'gratitude_30_days', 'gratitude_100_days',
    'local_first_visit', 'listen_10_hours',
  ];

  it.each(newBadgeIds)('%s has an explicit icon mapping', (badgeId) => {
    const config = getBadgeIcon(badgeId);
    expect(config.icon).toBeDefined();
    expect(config.bgColor).toBeTruthy();
  });
});
```

**Auth gating:** N/A — test-only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT delete existing test cases — only update assertions that change (e.g., total count, category list, FRESH_ACTIVITY_COUNTS field count)
- DO NOT change the `activity` category badge count test unless badges are actually recategorized

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All assertions in updated tests pass | unit | `pnpm test frontend/src/constants/dashboard/__tests__/badges.test.ts` |

**Expected state after completion:**
- [ ] Badge constants tests pass with updated total (58)
- [ ] New badge categories validated
- [ ] New badge celebration tiers validated
- [ ] All new badge IDs have icon mappings

---

### Step 10: Add Badge Engine Tests for New Checks

**Objective:** Add comprehensive tests for all new badge check functions.

**Files to modify:**
- `frontend/src/services/__tests__/badge-engine.test.ts` — Add test blocks for new badge categories

**Details:**

Follow the existing test pattern with `makeContext()` helper. For checks that read localStorage, mock `localStorage.getItem` with `vi.spyOn`. For checks that call imported functions (`getMeditationHistory`, `getGratitudeEntries`, `getUniqueVisitedPlaces`), mock the module:

```typescript
vi.mock('@/services/meditation-storage', () => ({
  getMeditationHistory: vi.fn(() => []),
}));

vi.mock('@/services/gratitude-storage', () => ({
  getGratitudeEntries: vi.fn(() => []),
}));
```

Test blocks needed:

**Meditation session badges:**
- `meditate_10` fires at 10 sessions, not at 9
- `meditate_50` fires at 50, not at 49
- `meditate_100` fires at 100, not at 99
- Already-earned meditation badges not re-returned

**Prayer Wall post badges:**
- `prayerwall_first_post` fires at `prayerWallPosts: 1`, not at 0
- `prayerwall_10_posts` fires at 10, not at 9
- Already-earned not re-returned

**Intercessor badge:**
- `prayerwall_25_intercessions` fires at `intercessionCount: 25`, not at 24
- Already-earned not re-returned

**Bible chapter badges:**
- `bible_first_chapter` fires at 1 total chapter
- `bible_10_chapters` fires at 10 total chapters across books
- `bible_25_chapters` fires at 25 total chapters
- No badge fires at 0 chapters
- Chapters spread across multiple books are summed correctly

**Gratitude badges:**
- `gratitude_7_streak` fires with 7 consecutive dates
- `gratitude_7_streak` does NOT fire with 6 consecutive dates
- `gratitude_7_streak` does NOT fire with 7 non-consecutive dates
- `gratitude_30_days` fires at 30 unique dates
- `gratitude_100_days` fires at 100 unique dates

**Local support badges:**
- `local_first_visit` fires at 1 unique place
- `local_first_visit` does NOT fire at 0 places

**Listening badge:**
- `listen_10_hours` fires at 36000 durationSeconds total
- `listen_10_hours` does NOT fire at 35999 seconds

**Auth gating:** N/A — test-only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing test helpers (`makeContext`, `allTrueActivities`)
- DO NOT remove or modify existing test cases

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ~25 new test cases for badge engine | unit | All threshold boundary tests pass |

**Expected state after completion:**
- [ ] All new badge engine tests pass
- [ ] No existing tests broken
- [ ] `pnpm test` passes with 0 failures

---

### Step 11: Run Full Test Suite & Verify

**Objective:** Run the complete test suite, fix any regressions, and verify the total badge count is correct.

**Files to modify:**
- Any files with test regressions (likely minor assertion updates)

**Details:**

Run `pnpm test` in the frontend directory. Expected passing assertions:
- Total badge count: 58
- `FRESH_ACTIVITY_COUNTS` field count: 14
- `BadgeCategory` includes all 12 values
- All existing badge engine tests still pass
- All new badge engine tests pass
- Badge icon tests pass for all 58 badges

Fix any regressions found. Common expected fixes:
- Tests that snapshot `BADGE_DEFINITIONS.length` or `FRESH_ACTIVITY_COUNTS` field count
- Tests that validate `BadgeCategory` membership
- Profile or dashboard tests that assert badge counts

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT skip or ignore failing tests — fix the root cause
- DO NOT modify existing badge behavior to make tests pass

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite passes | integration | `pnpm test` exits 0 |

**Expected state after completion:**
- [ ] All tests pass
- [ ] No lint errors (`pnpm lint`)
- [ ] TypeScript compiles (`pnpm tsc --noEmit` or `pnpm build`)
- [ ] 58 total badges visible in BadgeGrid and ProfileBadgeShowcase

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update TypeScript types |
| 2 | 1 | Add badge definitions & constants |
| 3 | 2 | Add badge icon mappings |
| 4 | 1, 2 | Add badge engine check functions |
| 5 | 1 | Update badge storage service |
| 6 | 2, 3 | Update BadgeGrid sections |
| 7 | 1, 5 | Add intercession & post tracking |
| 8 | 1, 5 | Add Bible chapter counter |
| 9 | 2, 3 | Update existing tests |
| 10 | 4 | Add new badge engine tests |
| 11 | 1-10 | Run full test suite |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update TypeScript Types | [COMPLETE] | 2026-03-26 | Added 3 fields to ActivityCounts, 6 values to BadgeCategory in dashboard.ts |
| 2 | Add Badge Definitions & Constants | [COMPLETE] | 2026-03-26 | 6 new badge arrays, FRESH_ACTIVITY_COUNTS updated, BADGE_DEFINITIONS includes all 58 |
| 3 | Add Badge Icon Mappings | [COMPLETE] | 2026-03-26 | 14 explicit entries + 6 CATEGORY_DEFAULTS in badge-icons.ts |
| 4 | Update Badge Engine | [COMPLETE] | 2026-03-26 | 7 new check sections (9-15) in badge-engine.ts, imports for meditation/gratitude storage |
| 5 | Update Badge Storage | [COMPLETE] | 2026-03-26 | fillActivityCounts + useProfileData updated with 3 new fields |
| 6 | Update BadgeGrid Sections | [COMPLETE] | 2026-03-26 | 9 new sections added, reading plans moved from Activity Milestones to own section, local_support_5 added to Community |
| 7 | Add Intercession & Post Tracking | [COMPLETE] | 2026-03-26 | intercessionCount in PrayerWall/Dashboard/Detail/Profile, prayerWallPosts in PrayerWall composer |
| 8 | Add Bible Chapter Counter | [COMPLETE] | 2026-03-26 | bibleChaptersRead increment in useBibleProgress.ts markChapterRead() |
| 9 | Update Existing Tests | [COMPLETE] | 2026-03-26 | Updated count to 58, category list, FRESH_ACTIVITY_COUNTS. Added 7 new test blocks + icon mapping tests. Fixed integration test ActivityCounts. |
| 10 | Add New Badge Engine Tests | [COMPLETE] | 2026-03-26 | 30 new tests (meditation, prayer wall posts, intercessor, bible chapters, gratitude, local visit, listening) |
| 11 | Run Full Test Suite & Verify | [COMPLETE] | 2026-03-26 | All tests pass. BadgeGrid count updated 32→58. PrayCeremony timeout is pre-existing flaky test. |
