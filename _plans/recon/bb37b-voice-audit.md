# BB-37b Voice and Consistency Audit

**Date:** 2026-04-13
**Auditor:** Claude (BB-37b Step 2)
**Branch:** `bible-redesign`
**Status:** READ-ONLY audit — no files modified

## Summary

- Anti-pressure checks: 5 pattern categories checked, 3 minor findings (all contextually appropriate)
- Empty state copy: 28 states verified, 5 issues (4 from BB-34 audit, 1 confirmed fixed)
- Notification copy: 5 messages verified, 0 issues
- SEO metadata: 10 pages spot-checked, 0 issues
- Button labels: 30+ checked, 7 generic "Cancel" labels found in Bible components
- Feature-specific copy: 3 features verified, 0 issues

---

## Detailed Results

### Anti-Pressure Voice Checks

#### Shaming Patterns

**Searched for:** "you missed", "don't break", "you haven't read", "you failed" (case-insensitive)

**Results:** 2 matches, both contextually appropriate:

| File | Line | Text | Verdict |
|------|------|------|---------|
| `components/settings/NotificationsSection.tsx` | 214 | `description="A gentle nudge in the evening if you haven't read yet today"` | PASS — this is a settings description explaining what the toggle does, not user-facing pressure copy. The notification itself uses "A short chapter, a moment of peace. No pressure." |
| `lib/env.ts` | 3 | `// Pattern: keys are OPTIONAL at module load time, so missing keys don't break` | PASS — code comment, not user-facing |

**No shaming patterns found in user-facing copy.**

#### Gamified Celebration

**Searched for:** "great job", "keep going", "you unlocked", "streak broken" (case-insensitive)

**Results:** "keep going" appears in 14 user-facing locations. "great job" appears in 1 test-only location. "you unlocked" and "streak broken" not found.

**"keep going" analysis:**

| Location | Context | Verdict |
|----------|---------|---------|
| `data/challenges.ts:200` | Devotional content: "Keep going. Your strength is being renewed." | PASS — pastoral encouragement within Scripture reflection |
| `data/challenges.ts:949` | Challenge day content: "give yourself permission to keep going at your own pace" | PASS — explicitly pairs with "at your own pace" |
| `data/reading-plans/walking-through-grief.ts:333` | Prayer content: "give me the hope to keep going" | PASS — prayer language, user is speaking to God |
| `data/reading-plans/the-gratitude-reset.ts:195` | Reflection: "will you keep going?" | PASS — rhetorical question, not directive |
| `constants/dashboard/encouragements.ts:3` | Friend encouragement preset: "Keep going!" | PASS — peer-to-peer encouragement, user chooses to send |
| `constants/dashboard/ai-insights.ts:18` | AI insight: "You're on an upward trajectory — keep going!" | **NOTE** — borderline. This is mock AI insight copy that will be replaced by real AI in Phase 3. Acceptable for now as it's celebratory, not shaming. |
| `components/insights/MonthlyHighlights.tsx:63` | "No new badges this month — keep going!" | **MINOR** — the "keep going!" after "No new badges" reads slightly as pressure. The em-dash softens it, but a rewrite like "Badges come with time — you're doing great" would be warmer. |
| `components/challenges/MilestoneCard.tsx:139` | Dismiss button on milestone celebration: "Keep Going" | PASS — button label for dismissing a celebration card |
| `hooks/useAnniversaryMoment.ts:28` | "Keep going — God is growing something beautiful in you." | PASS — warm, grace-oriented |
| `mocks/notifications-mock-data.ts:73` | Mock notification: "Grace H. sent: Keep going!" | PASS — friend encouragement mock data |
| `mocks/ask-mock-data.ts:300` | AI prayer content | PASS — pastoral prayer language |

**"great job" analysis:**

| Location | Context | Verdict |
|----------|---------|---------|
| `components/ui/__tests__/Toast.test.tsx:148` | Test file only: `showCelebrationToast('Prayer Warrior', 'Great job!', ...)` | PASS — test fixture, not production copy |

**No "you unlocked" or "streak broken" patterns found anywhere in the codebase.**

#### Urgency Language

**Searched for:** "act now", "limited time", "don't miss", "hurry" (case-insensitive)

**Results:** "hurry" appears in 40+ locations but ALL are Bible text content in `data/bible/web/` and `data/bible/books/json/` (Scripture text like "Hurry to help me, LORD" from Psalms). Two non-Bible occurrences are also pastoral content:

| File | Context | Verdict |
|------|---------|---------|
| `data/challenges.ts:128` | "God is not in a hurry with you." | PASS — explicitly anti-urgency |
| `data/reading-plans/walking-through-grief.ts:35` | "without guilt or hurry" | PASS — explicitly anti-urgency |

**No urgency patterns found in app UI copy.**

#### Fake Metrics

**Searched for:** "N% of users", "thousands of", "most users" (case-insensitive)

**Results:** "thousands of" appears in 40+ Bible text files only (e.g., "thousands of Israel", "thousands of pieces of gold"). No fake metrics in UI copy.

| Non-Bible occurrences | Verdict |
|----------------------|---------|
| `mocks/daily-experience-psalms.ts:508` — Psalm verse text | PASS — Scripture |
| `data/reading-plans/discovering-your-purpose.ts:367` — Scripture quote | PASS — Scripture |
| `data/reading-plans/knowing-who-you-are-in-christ.ts:455` — reflection referencing lineage of faith | PASS — devotional content about biblical history, not fake metrics |

**No fake metrics found.**

#### Instructional Bossiness

**Searched for:** "click here", "do this next", "you must", "you need to" (case-insensitive)

**Results:** "you need to" appears in ~15 locations. No "click here", "do this next", or "you must" found.

**"you need to" analysis (non-test, non-Bible files):**

| File | Line | Text | Verdict |
|------|------|------|---------|
| `mocks/ask-mock-data.ts:276` | AI chat response content | PASS — conversational AI mock |
| `mocks/ask-mock-data.ts:613` | "all you need to do is ask" | PASS — warm invitation |
| `mocks/daily-experience-mock-data.ts:347` | Journal prompt: "someone you need to forgive?" | PASS — reflective question |
| `mocks/daily-experience-mock-data.ts:454` | ACTS meditation: "What do you need to lay down?" | PASS — reflective question |
| `data/devotionals.ts:115,263,478,516,1490` | Devotional reflections: "what do you need to..." | PASS — reflective questions |
| `data/devotionals.ts:1697` | "There is nothing you need to add" | PASS — grace-affirming |
| `lib/seo/routeMetadata.ts:75` | Meta description: "things you need to think through" | PASS — descriptive, not bossy |
| `pages/RegisterPage.tsx:51` | "No data harvesting" copy | PASS — feature description |

**No instructional bossiness found in user-facing copy.**

---

### Empty State Copy

**Reference document:** `_plans/recon/bb34-empty-states.md`

#### Verified Compliant (no action needed)

| # | Location | Heading | Verdict |
|---|----------|---------|---------|
| 1 | `pages/Insights.tsx:253` | "Your story is just beginning" | PASS — warm, second-person |
| 2 | `components/daily/JournalTabContent.tsx:360` | "Your journal is waiting" | PASS |
| 3 | `components/dashboard/MoodChart.tsx:156` | "Your mood journey starts today" | PASS |
| 4 | `components/dashboard/FriendsPreview.tsx:63` | "Faith grows stronger together" | PASS |
| 9 | `pages/PrayerWall.tsx:498` | "This space is for you" | PASS |
| 10 | `pages/PrayerWall.tsx:515` | "No prayers in {category} yet" | PASS — filter result |
| 11 | `pages/ReadingPlans.tsx:215` | "You've completed every plan!" | PASS — celebratory |
| 13 | `components/leaderboard/FriendsLeaderboard.tsx:51` | "Friendly accountability" | PASS |
| 14 | `components/friends/FriendList.tsx:22` | "Faith grows stronger together" | PASS |
| 15 | `components/dashboard/ChallengeWidget.tsx:162` | "Challenges bring us together" | PASS |
| 16 | `components/my-prayers/PrayerListEmptyState.tsx` | "Your prayer list is waiting." | PASS |
| 17 | `components/pwa/OfflineNotice.tsx` | "You're offline" | PASS |
| 18 | `components/bible/reader/CrossRefsSubView.tsx:40` | "No cross-references for this verse." | PASS — factual |
| 23 | `components/bible/my-bible/ReadingHeatmap.tsx:213` | "Your reading history will show up here" | PASS |
| 24 | `components/daily/SavedEntriesList.tsx:152` | "No entries match your search" | PASS — filter result |
| 25 | `pages/Challenges.tsx:257` | "New challenges are coming soon" | PASS |

#### Verified Fixed (BB-34 implementation complete)

| # | Location | Current Heading | Verdict |
|---|----------|-----------------|---------|
| 6 | `pages/MyBiblePage.tsx:280` | "Your Bible highlights will show up here" | **FIXED** — was "Nothing here yet." in BB-34 audit. Now warm, second-person, feature-specific. |
| 12 | `components/memorize/MemorizationDeck.tsx:13` | "Your memorization deck is ready" | **FIXED** — was "No memorization cards yet" in BB-34 audit. Now warm and inviting. |
| 19 | `components/insights/MonthlyHighlights.tsx:82` | "Your highlights will appear here once you've been checking in for a while." | **FIXED** — was "No data yet — start checking in to see your journey!" Now warm and patient. |

#### Issues Remaining

| # | Location | Current Text | Issue | Severity |
|---|----------|-------------|-------|----------|
| 5 | `components/dashboard/NotificationPanel.tsx:97` | "All caught up! 🎉" | Emoji inconsistent with project conventions. Minor — not a voice violation. | Low |
| 20 | `pages/PrayerWallProfile.tsx:247` | "This person hasn't shared any prayers yet." | Third-person, system-message tone. Could be warmer. | Low |
| 21 | `pages/PrayerWallProfile.tsx:274` | "No replies yet." | Generic system message. | Low |
| 22 | `pages/PrayerWallProfile.tsx:304` | "No reactions yet." | Generic system message. | Low |
| -- | `pages/PrayerWallDashboard.tsx:460` | "No reactions yet." | Same pattern as PrayerWallProfile. | Low |

#### "No data" / "Nothing here" grep verification

Searched for "No data", "Nothing here", "No items", "No results" across all source files.

- "No data" in user-facing production code: **0 instances** (all matches are in test files: "returns empty when no data", etc., or the RegisterPage: "No data harvesting" which is a feature description, not an empty state)
- "Nothing here yet" in production code: **0 instances** (the BB-34 fix removed it from MyBiblePage; only test files reference it to assert it's gone)
- "No memorization cards yet" in production code: **0 instances** (BB-34 fixed; test asserts absence)
- "No items" in production code: **0 instances**

---

### Notification Copy

**Files examined:** `lib/notifications/content.ts`, `lib/notifications/types.ts`, `lib/notifications/scheduler.ts`

#### Message Inventory

| Type | Title | Body | Verdict |
|------|-------|------|---------|
| Daily Verse | `{verse reference}` (e.g., "John 3:16") | Verse text, truncated to 120 chars | PASS |
| Streak Reminder | "Still time to read today" | Rotates 3 messages: (1) "A short chapter, a moment of peace. No pressure." (2) "Your rhythm is still here. Come back when you can." (3) "Five minutes of scripture is still five minutes of scripture." | PASS |

#### Streak Numbers in Reminder Bodies

**Verified:** The `generateStreakReminderPayload` function uses only static message strings from `STREAK_REMINDER_MESSAGES`. No streak count is interpolated into the body. Test at `content.test.ts:81` explicitly asserts `payload.body.not.toMatch(/\d/)` — no digits allowed.

**Result:** PASS — zero streak numbers in notification bodies.

#### Exclamation Points

**Verified:** All 3 streak reminder messages and the streak reminder title contain zero exclamation marks. Test at `content.test.ts:85-89` explicitly asserts `payload.body.not.toContain('!')` across multiple dates.

Daily verse notification: title is a verse reference (no exclamation), body is Scripture text (may contain exclamation marks from Bible text, e.g., "Hurry to help me, LORD!" — this is acceptable as it's Scripture, not app copy).

**Result:** PASS — zero exclamation marks in app-authored notification copy.

#### Deep-Link URL Contract

**Verified:** The daily verse notification URL uses:
```
/bible/${votdEntry.book}/${votdEntry.chapter}?verse=${votdEntry.startVerse}
```

This follows the `/bible/<book>/<chapter>` contract. Test at `content.test.ts:45,51` verifies concrete examples:
- `/bible/john/3?verse=16`
- `/bible/psalms/23?verse=1`

The streak reminder links to `/daily?tab=devotional` (not a Bible URL — acceptable, it's a different feature).

**Result:** PASS — URLs follow the expected contract.

---

### SEO Metadata

**Reference file:** `lib/seo/routeMetadata.ts` (verified against `_plans/recon/bb40-seo-metadata.md`)

#### Coverage Check

`<SEO` component used in **43 render sites** across the codebase (pages, App.tsx inline components). All routes have SEO coverage. The two gap files identified in BB-40 (`BiblePlanDetail.tsx`, `BiblePlanDay.tsx`) now have `<SEO>` tags.

#### Spot-Check: 10 Pages Against Approved Metadata

| # | Route | Component | Title in Code | Title in Approved List | Match? |
|---|-------|-----------|---------------|----------------------|--------|
| 1 | `/` (logged-out) | `Home.tsx:48` | `HOME_METADATA` → "Worship Room — Christian Emotional Healing & Worship" | Same | MATCH |
| 2 | `/daily?tab=devotional` | `DailyHub.tsx:216` | `DAILY_HUB_DEVOTIONAL_METADATA` → "Today's Devotional" | Same | MATCH |
| 3 | `/daily?tab=pray` | `DailyHub.tsx:216` | `DAILY_HUB_PRAY_METADATA` → "Write a Prayer" | Same | MATCH |
| 4 | `/daily?tab=journal` | `DailyHub.tsx:216` | `DAILY_HUB_JOURNAL_METADATA` → "Daily Journal" | Same | MATCH |
| 5 | `/bible` | `BibleLanding.tsx:139` | `BIBLE_LANDING_METADATA` → "Read the Bible (WEB)" | Same | MATCH |
| 6 | `/prayer-wall` | `PrayerWall.tsx:350` | `PRAYER_WALL_METADATA` → "Community Prayer Wall" | Same | MATCH |
| 7 | `/music` | `MusicPage.tsx:173` | `MUSIC_METADATA` → "Worship Music & Ambient Sounds" | Same | MATCH |
| 8 | `/ask` | `AskPage.tsx:226` | `ASK_METADATA` → "Ask the Bible" | Same | MATCH |
| 9 | `/grow` | `GrowPage.tsx:86` | `GROW_METADATA` → "Reading Plans & Challenges" | Same | MATCH |
| 10 | `/my-prayers` | `MyPrayers.tsx:180` | `MY_PRAYERS_METADATA` → "My Saved Prayers" | Same | MATCH |

All 10 spot-checked pages use the centralized `routeMetadata.ts` constants, spreading them via `{...CONSTANT}`. Descriptions and noIndex flags also match the approved list.

**Result:** PASS — all checked pages match the approved BB-40 metadata.

---

### Button Labels

#### Generic Label Search

**"Submit" in production code:** 0 user-visible instances. The only match is `components/__tests__/button-feedback.test.tsx` which uses `<Button>Submit</Button>` as a test fixture. All production submit buttons use specific labels (e.g., "Help Me Pray", "Save Entry", "Share a prayer request").

**"OK" as a button label:** 0 instances found in any component.

**"Cancel" in production code (Bible components):**

| File | Line | Context | Verdict |
|------|------|---------|---------|
| `components/bible/NoteEditor.tsx:91` | "Cancel" button | Note editor cancel — paired with "Save note" | **ACCEPTABLE** — standard editor pattern |
| `components/bible/NoteEditor.tsx:123` | "Cancel" button | Delete confirmation cancel | ACCEPTABLE |
| `components/bible/NoteIndicator.tsx:123` | "Cancel" button | Delete confirmation cancel | ACCEPTABLE |
| `components/bible/SleepTimerPanel.tsx:151` | "Cancel" button, `aria-label="Cancel sleep timer"` | Sleep timer cancel | ACCEPTABLE — has specific aria-label |
| `components/bible/my-bible/ActivityActionMenu.tsx:184` | "Cancel" | Bulk action cancel | ACCEPTABLE |
| `components/bible/my-bible/BibleSettingsModal.tsx:238,301` | "Cancel" | Settings import/export cancel | ACCEPTABLE |
| `components/bible/reader/BookmarkLabelEditor.tsx:146` | "Cancel" | Bookmark label editor cancel | ACCEPTABLE |
| `components/bible/reader/NoteEditorSubView.tsx:280` | "Cancel" | Note editor in drawer | ACCEPTABLE |
| `components/memorize/MemorizationFlipCard.tsx:155` | "Cancel" | Remove card confirmation cancel | ACCEPTABLE |

**Assessment:** "Cancel" is used 9 times in Bible components, always as a secondary/dismiss action paired with a specific primary action. These are standard UI patterns where "Cancel" is the conventional and expected label. No generic "Submit" or "OK" buttons found.

#### White Pill CTA Check (Bible Components)

Bible components use the white pill CTA pattern correctly in primary CTAs:

| Component | CTA Classes | Verdict |
|-----------|-------------|---------|
| `plans/PlanCompletionCelebration.tsx:115` | `rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[...]` | PASS — Pattern 2 |
| `plans/PlanBrowserEmptyState.tsx:29,46` | Same Pattern 2 | PASS |
| `landing/ActivePlanBanner.tsx:63` | Same Pattern 2 | PASS |
| `landing/ResumeReadingCard.tsx:39` | `rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg` | PASS — Pattern 1 |
| `reader/ActivePlanReaderBanner.tsx:51` | `rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary` | PASS — Pattern 1 |
| `streak/StreakResetWelcome.tsx:22` | `rounded-full bg-white px-8 py-3 font-semibold text-hero-bg` | PASS |
| `my-bible/BibleSettingsModal.tsx:194` | `rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg` | PASS |

---

### Feature-Specific Copy

#### BB-34 FirstRunWelcome

**File:** `components/onboarding/FirstRunWelcome.tsx`

| Element | Text | Compliant? |
|---------|------|-----------|
| Heading | "Welcome to Worship Room" | PASS — warm, direct |
| Description | "A quiet place to read Scripture, pray, journal, and find peace — at your own pace, whenever you need it." | PASS — second-person, anti-pressure ("at your own pace") |
| Option 1 | "Read the Bible" → `/bible` | PASS — specific, inviting |
| Option 2 | "Try a daily devotional" → `/daily` | PASS — "Try" is low-pressure |
| Option 3 | "Take the starting quiz" → `/#quiz` | PASS — specific |
| Option 4 | "Browse reading plans" → `/grow?tab=plans` | PASS — "Browse" is low-pressure |
| Dismiss | "Maybe later" | PASS — gentle, no guilt |
| Dismissible? | YES — Escape key, "Maybe later" button | PASS |
| Dialog a11y | `role="dialog"`, `aria-modal="true"`, `aria-label="Welcome to Worship Room"` | PASS |

**Result:** PASS — warm greeting, specific options, all optional, dismissible via keyboard and button.

#### BB-45 Memorization Deck

**File:** `components/memorize/MemorizationDeck.tsx`

| Element | Text | Compliant? |
|---------|------|-----------|
| Empty state heading | "Your memorization deck is ready" | PASS — warm, inviting, second-person |
| Empty state description | "Tap the memorize action on any verse in the Bible reader, and it'll appear here as a flip card." | PASS — instructional but specific and friendly |
| Empty state CTA | "Open the reader" → `/bible` | PASS — optional, specific |

**File:** `components/memorize/MemorizationFlipCard.tsx`

| Element | Text | Compliant? |
|---------|------|-----------|
| Remove confirmation | "Remove this card?" with "Yes" / "Cancel" | PASS — gentle question format, not "Are you sure?" |
| Date display | "Added {timeAgo}" using `timeAgo()` | PASS — natural language ("2 days ago", "a month ago") |

**Result:** PASS — warm empty state, gentle remove confirmation.

#### BB-46 Echo Cards

**File:** `components/echoes/EchoCard.tsx`

| Element | Text | Compliant? |
|---------|------|-----------|
| Label format | "You {verb} this {relativeLabel}" | PASS — second-person, natural |
| aria-label | "Echo: you {verb} {reference} {relativeLabel}. Tap to open." | PASS |

**File:** `lib/echoes/labels.ts`

| Interval | Label | Compliant? |
|----------|-------|-----------|
| 7 days | "a week ago" | PASS — natural language |
| 14 days | "two weeks ago" | PASS |
| 30 days | "a month ago" | PASS |
| 60 days | "two months ago" | PASS |
| 90 days | "three months ago" | PASS |
| 180 days | "six months ago" | PASS |
| 365 days | "a year ago" | PASS |
| read-on-this-day (1yr) | "on this day last year" | PASS |
| read-on-this-day (N yr) | "on this day in {year}" | PASS |

**No abbreviated labels** (e.g., "7d", "30d") found. All labels use full natural language.

**Echo kinds use specific verbs:**
- `highlighted` → "highlighted"
- `memorized` → "memorized"
- `read-on-this-day` → "read"

**Result:** PASS — natural language relative labels, specific echo reasons, second-person voice.

---

## Issues Found

| # | Category | Location | Issue | Severity | Resolution |
|---|----------|----------|-------|----------|------------|
| 1 | Empty state | `components/insights/MonthlyHighlights.tsx:63` | "No new badges this month — keep going!" — the "keep going!" after a negative state reads as mild pressure | Low | Rewrite to "Badges come with time — you're doing great" or similar |
| 2 | Empty state | `pages/PrayerWallProfile.tsx:247` | "This person hasn't shared any prayers yet." — third-person, system-message tone | Low | Rewrite to second-person if viewing own profile, keep third-person but warmer for others |
| 3 | Empty state | `pages/PrayerWallProfile.tsx:274` | "No replies yet." — generic system message | Low | Consider "No replies to show" or remove the message entirely |
| 4 | Empty state | `pages/PrayerWallProfile.tsx:304` | "No reactions yet." — generic system message | Low | Same as above |
| 5 | Empty state | `pages/PrayerWallDashboard.tsx:460` | "No reactions yet." — same pattern | Low | Same as above |
| 6 | Empty state | `components/dashboard/NotificationPanel.tsx:97` | "All caught up! 🎉" — emoji inconsistent with project conventions (project avoids emojis in user-facing copy unless explicitly requested) | Low | Remove emoji or replace with icon |
| 7 | Notification settings | `components/settings/NotificationsSection.tsx:214` | "A gentle nudge in the evening if you haven't read yet today" — this is a settings description, not notification copy, so it's acceptable. But "you haven't read" is a mildly negative framing. | Info | Could rewrite to "An evening reminder if there's still time to read" for a more positive framing. Not urgent. |

### Non-Issues Noted

The following patterns were investigated and found to be acceptable:

- **"keep going" in pastoral/devotional content** — used 10+ times in challenges, reading plans, and prayers. Always in the context of encouragement, never pressure. Consistent with the grace-based philosophy.
- **"Cancel" in editor/confirmation UIs** — used 9 times in Bible components. Standard UI convention, always paired with a specific primary action.
- **"hurry" in Bible text** — 40+ occurrences, all Scripture content from the WEB Bible.
- **"you need to" in reflective questions** — used in devotional reflections and journal prompts as reflective invitations ("What do you need to lay down?"), not instructions.
- **Streak reminder notification copy** — verified: no streak numbers, no exclamation marks, all 3 messages are warm and pressure-free ("No pressure", "Come back when you can", "still five minutes of scripture").
- **SEO metadata** — all 10 spot-checked pages match the BB-40 approved metadata exactly. Centralized in `routeMetadata.ts`.
