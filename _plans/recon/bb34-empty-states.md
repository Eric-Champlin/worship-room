# BB-34 Empty State Audit

**Date:** 2026-04-13
**Branch:** `bible-redesign`
**Status:** READ-ONLY audit — no files modified

## Compliance Standard

Every empty state must be:
1. **Warm** — feels like a caring friend, not a system notification
2. **Second person, present tense** — "Your journal is waiting", not "The journal is empty"
3. **Anti-pressure** — no "Start your journey today!" or urgency language
4. **Specific to the feature** — mentions the feature by name or context

---

## FeatureEmptyState Component Reference

**File:** `frontend/src/components/ui/FeatureEmptyState.tsx`

Shared component renders: Lucide icon (white/30), heading (text-lg font-bold text-white/70), description (text-sm text-white/60), optional CTA (rounded-lg bg-primary). CTA uses `rounded-lg` (not `rounded-full` white pill). Supports `compact` mode and `children` slot.

**Component-level issue:** CTA button uses `rounded-lg bg-primary` instead of canonical Round 3 white pill CTA pattern. This affects all consumers. Fix in Step 2.

---

## HIGH PRIORITY — Almost Every User Sees

### 1. Insights Page — No Mood Data

| Field | Value |
|---|---|
| **File** | `pages/Insights.tsx:253` |
| **Empty condition** | `entries.length < 2` |
| **Current** | FeatureEmptyState: heading="Your story is just beginning", CTA="Check in now" → "/" |
| **Compliant?** | YES — warm, second-person, anti-pressure |
| **Action** | CTA style fix only (automatic via Step 2) |

### 2. Journal Tab — No Saved Entries

| Field | Value |
|---|---|
| **File** | `components/daily/JournalTabContent.tsx:360` |
| **Empty condition** | `savedEntries.length === 0 && isAuthenticated` |
| **Current** | FeatureEmptyState: heading="Your journal is waiting", CTA="Write your first entry" |
| **Compliant?** | YES |
| **Action** | CTA style fix only (automatic via Step 2) |

### 3. Dashboard — Mood Chart

| Field | Value |
|---|---|
| **File** | `components/dashboard/MoodChart.tsx:156` |
| **Empty condition** | No mood entries |
| **Current** | Custom ghosted chart: "Your mood journey starts today" |
| **Compliant?** | YES |
| **Action** | None — custom visual design is intentional |

### 4. Dashboard — Friends Preview

| Field | Value |
|---|---|
| **File** | `components/dashboard/FriendsPreview.tsx:63` |
| **Empty condition** | `friends.length === 0` |
| **Current** | Custom: "Faith grows stronger together" + "You vs. Yesterday" fallback |
| **Compliant?** | YES |
| **Action** | None |

### 5. Dashboard — Notification Panel

| Field | Value |
|---|---|
| **File** | `components/dashboard/NotificationPanel.tsx:97` |
| **Empty condition** | `notifications.length === 0` |
| **Current** | "All caught up! 🎉" |
| **Compliant?** | BORDERLINE — emoji inconsistent, impersonal |
| **Action** | Out of scope for BB-34 plan (minor) |

---

## MEDIUM PRIORITY — Feature-Specific

### 6. My Bible — No Highlights/Bookmarks/Notes

| Field | Value |
|---|---|
| **File** | `pages/MyBiblePage.tsx:277` |
| **Empty condition** | `isEmpty` |
| **Current** | FeatureEmptyState: heading="Nothing here yet.", description="Tap a verse in the reader and choose Highlight, Bookmark, or Note. They'll show up here." |
| **Compliant?** | **NO** — "Nothing here yet" is generic, description is instructional |
| **Action** | **Update copy** (Step 3) |

### 7. My Bible — Filter No Matches

| Field | Value |
|---|---|
| **File** | `pages/MyBiblePage.tsx:292` |
| **Empty condition** | `isFilteredEmpty` |
| **Current** | FeatureEmptyState: heading="No matches", compact, child "Clear filters" |
| **Compliant?** | Acceptable — filter result |
| **Action** | None |

### 8. My Bible — Search No Results

| Field | Value |
|---|---|
| **File** | `components/bible/my-bible/EmptySearchResults.tsx:14` |
| **Empty condition** | Search returns zero |
| **Current** | FeatureEmptyState: heading=`No matches for "{query}"`, compact |
| **Compliant?** | Acceptable — search result |
| **Action** | None |

### 9. Prayer Wall — Empty Feed

| Field | Value |
|---|---|
| **File** | `pages/PrayerWall.tsx:498` |
| **Empty condition** | No prayers, no active category |
| **Current** | FeatureEmptyState: heading="This space is for you", CTA="Share a prayer request" |
| **Compliant?** | YES |
| **Action** | CTA style fix only (automatic via Step 2) |

### 10. Prayer Wall — Empty Category

| Field | Value |
|---|---|
| **File** | `pages/PrayerWall.tsx:515` |
| **Empty condition** | Category filter, no results |
| **Current** | FeatureEmptyState: heading=`No prayers in {category} yet`, description="Be the first to share." |
| **Compliant?** | BORDERLINE — "Be the first" is mild pressure |
| **Action** | Out of scope for BB-34 plan (filter result) |

### 11. Reading Plans — All Completed

| Field | Value |
|---|---|
| **File** | `pages/ReadingPlans.tsx:215` |
| **Empty condition** | `allCompleted` |
| **Current** | FeatureEmptyState: heading="You've completed every plan!", CTA="Create a custom plan" |
| **Compliant?** | YES — celebratory |
| **Action** | CTA style fix only (automatic via Step 2) |

### 12. Memorization Deck — No Cards

| Field | Value |
|---|---|
| **File** | `components/memorize/MemorizationDeck.tsx:13` |
| **Empty condition** | `cards.length === 0` |
| **Current** | FeatureEmptyState: heading="No memorization cards yet", description="Tap the memorize action on any verse..." |
| **Compliant?** | **BORDERLINE** — "No X yet" pattern, instructional description |
| **Action** | **Update copy** (Step 3) |

### 13. Friends Leaderboard — No Friends

| Field | Value |
|---|---|
| **File** | `components/leaderboard/FriendsLeaderboard.tsx:51` |
| **Empty condition** | `friends.length === 0` |
| **Current** | FeatureEmptyState: heading="Friendly accountability", CTA="Find friends" |
| **Compliant?** | YES |
| **Action** | CTA style fix only (automatic via Step 2) |

### 14. Friend List — No Friends

| Field | Value |
|---|---|
| **File** | `components/friends/FriendList.tsx:22` |
| **Empty condition** | `friends.length === 0` |
| **Current** | FeatureEmptyState: heading="Faith grows stronger together", CTA="Invite a friend" |
| **Compliant?** | YES |
| **Action** | CTA style fix only (automatic via Step 2) |

### 15. Challenge Widget — No Active Challenges

| Field | Value |
|---|---|
| **File** | `components/dashboard/ChallengeWidget.tsx:162` |
| **Empty condition** | No challenges available |
| **Current** | FeatureEmptyState: heading="Challenges bring us together", compact, no CTA |
| **Compliant?** | YES — communal "us" is intentional |
| **Action** | None |

### 16. My Prayers — Empty List

| Field | Value |
|---|---|
| **File** | `components/my-prayers/PrayerListEmptyState.tsx` |
| **Empty condition** | `prayers.length === 0` |
| **Current** | **Custom component**: heading="Your prayer list is waiting.", CTA="Add Prayer" (bg-primary, Plus icon) |
| **Compliant?** | YES (copy) but custom component + non-standard CTA |
| **Action** | **Migrate to FeatureEmptyState** (Step 3) |

### 17. Offline Notice

| Field | Value |
|---|---|
| **File** | `components/pwa/OfflineNotice.tsx` |
| **Empty condition** | User offline |
| **Current** | FeatureEmptyState: heading="You're offline", CTA="Read the Bible" → /bible |
| **Compliant?** | YES |
| **Action** | CTA style fix only (automatic via Step 2) |

---

## LOW PRIORITY — Rare or Contextual

### 18. Cross-References — No Refs

| Field | Value |
|---|---|
| **File** | `components/bible/reader/CrossRefsSubView.tsx:40` |
| **Current** | Custom inline: "No cross-references for this verse." |
| **Compliant?** | Acceptable — factual |
| **Action** | None |

### 19. Monthly Highlights — No Best Day

| Field | Value |
|---|---|
| **File** | `components/insights/MonthlyHighlights.tsx:82` |
| **Current** | "No data yet — start checking in to see your journey!" |
| **Compliant?** | **NO** — "No data yet" is generic system language |
| **Action** | **Update copy** (Step 3) |

### 20. Prayer Wall Profile — No Prayers

| Field | Value |
|---|---|
| **File** | `pages/PrayerWallProfile.tsx:247` |
| **Current** | "No prayers shared yet." |
| **Compliant?** | **NO** — third-person, system message |
| **Action** | **Update copy** (Step 3) |

### 21. Prayer Wall Profile — No Replies

| Field | Value |
|---|---|
| **File** | `pages/PrayerWallProfile.tsx:274` |
| **Current** | "No replies yet." |
| **Compliant?** | **NO** — system message |
| **Action** | Out of scope for BB-34 plan (discovered, not in plan's Step 3 target list) |

### 22. Prayer Wall Profile — No Reactions

| Field | Value |
|---|---|
| **File** | `pages/PrayerWallProfile.tsx:303` |
| **Current** | "No reactions yet." |
| **Compliant?** | **NO** — system message |
| **Action** | Out of scope for BB-34 plan (discovered, not in plan's Step 3 target list) |

### 23. Reading Heatmap — No Data

| Field | Value |
|---|---|
| **File** | `components/bible/my-bible/ReadingHeatmap.tsx:213` |
| **Current** | "Your reading history will show up here as you read." |
| **Compliant?** | YES |
| **Action** | None (spec: leave BB-43 unchanged) |

### 24. Journal Saved Entries — No Filter Matches

| Field | Value |
|---|---|
| **File** | `components/daily/SavedEntriesList.tsx:152` |
| **Current** | "No entries match your search" |
| **Compliant?** | Acceptable — filter result |
| **Action** | None |

### 25. Challenges Page — No Challenges

| Field | Value |
|---|---|
| **File** | `pages/Challenges.tsx:257` |
| **Current** | "New challenges are coming soon. Check back during the next season." |
| **Compliant?** | Acceptable |
| **Action** | None (out of scope) |

### 26. Bible Plans Browser — No Manifest / Filtered / All Started

| Field | Value |
|---|---|
| **File** | `components/bible/plans/PlanBrowserEmptyState.tsx` |
| **Current** | Custom component, CTA already uses white pill |
| **Compliant?** | BORDERLINE ("all-started" variant has "Finish one to unlock" pressure) |
| **Action** | None per plan — CTA already white pill |

### 27. Mood Trend Chart — No Data

| Field | Value |
|---|---|
| **File** | `components/insights/MoodTrendChart.tsx:189` |
| **Current** | Custom ghosted chart: "Start checking in to see your mood trend" |
| **Compliant?** | BORDERLINE — instructional |
| **Action** | Out of scope (custom visual design) |

### 28. Local Support — Search States

| Field | Value |
|---|---|
| **File** | `components/local-support/SearchStates.tsx` |
| **Current** | Custom inline search prompts/no-results |
| **Compliant?** | Acceptable — contextual search states |
| **Action** | None |

---

## Summary

### Actions for BB-34 Plan

| Action | Count | Mechanism |
|---|---|---|
| CTA style fix (bg-primary → white pill) | 11 consumers | Step 2: fix FeatureEmptyState component |
| Update copy (non-compliant) | 4 files | Step 3: MyBiblePage, MemorizationDeck, MonthlyHighlights, PrayerWallProfile |
| Migrate to FeatureEmptyState | 1 file | Step 3: PrayerListEmptyState |
| No action needed | 17 states | Already compliant or out of scope |

### Discovered Issues (Out of Plan Scope)

- PrayerWallProfile replies/reactions: "No replies yet." / "No reactions yet." — could be warmer
- NotificationPanel: emoji inconsistent with project conventions
- MoodTrendChart: instructional copy
- PlanBrowserEmptyState "all-started" variant: mild pressure language
