# Agent 3: Cross-Feature Integration & Retention Audit

## Journey Completion Audit

### 1. Onboarding Wizard -> Getting Started Checklist

**Status: WORKING.** `WelcomeWizard` calls `setOnboardingComplete()` on finish, which sets `wr_onboarding_complete` in localStorage. `Dashboard.tsx:79` checks `isOnboardingComplete()` to decide whether to show onboarding. `useGettingStarted.ts:90-93` gates visibility on `isOnboardingComplete() && !dismissed`, so the checklist appears immediately after the wizard completes. The 6 items (mood, pray, journal, meditate, ambient, prayer wall) each link to the correct destination. No gap here.

### 2. Daily Hub Devotional -> Journal/Pray Prompt

**Status: WORKING.** `DevotionalTabContent.tsx:322-336` has two cross-tab CTAs: "Journal about this" (passes `devotional.theme` to journal) and "Pray about today's reading" (passes passage reference to pray). Both call parent callbacks that set `prayContext` and switch the tab via `setSearchParams`. The journal tab consumes `prayContext` at `JournalTabContent.tsx:78-82` and auto-selects Guided mode with a contextual prompt. Solid integration.

### 3. Reading Plan Day -> Bible Reader Chapter

**Status: WORKING.** `DayContent.tsx:22-25` uses `VerseLink` for the passage reference, which links to `/bible/{bookSlug}/{chapter}#verse-{verseStart}`. The parser in `parse-verse-references.ts` handles standard references. The day content has scripture inline, and users can click through to the full Bible chapter. No gap.

### 4. Bible Chapter -> Journal/Prayer/AI Chat/Meditation Bridge

**Status: PARTIAL GAP.** The Bible reader (`BibleReader.tsx`) has rich functionality (highlighting, notes, audio, ambient chip, sleep timer) but **no cross-feature CTAs after reading a chapter**. After reading a chapter there is no "Journal about this passage", "Pray about what you read", "Ask a question about this chapter", or "Meditate on this passage" link.

- **Missing CTA location:** `BibleReader.tsx`, after the `VerseDisplay` section (~line 320), before the `ChapterNav` at the bottom. A small CTA strip with links to `/daily?tab=journal&context=...`, `/daily?tab=pray&context=...`, `/ask?q=...`, and `/meditate/soaking?verse=...` would close this gap.
- **Severity: HIGH.** The Bible reader is a high-traffic page, and failing to bridge users into active engagement (journaling, praying) after reading reduces session depth.

### 5. Meditation Session -> Journal/Prayer Prompt

**Status: WORKING.** All 6 meditation sub-pages use `CompletionScreen` with CTAs. For example, `BreathingExercise.tsx:191-193` offers "Continue to Pray", "Continue to Journal", and "Visit the Prayer Wall". The `CompletionScreen` component also shows `MiniHubCards` linking back to the other Daily Hub tabs. Good bridge.

### 6. Community Challenge Day -> Dashboard Reflection

**Status: PARTIAL GAP.** `ChallengeDayContent.tsx:93-101` has a "Mark Complete" button and a "Go to [action]" link that routes to the relevant Daily Hub tab (pray, journal, meditate) with `challengeContext` state. This is good for directing users to the action. However, there is **no bridge from the challenge day back to the dashboard evening reflection**. When a user completes a challenge day, the completion triggers faith points via `recordActivity`, which the dashboard picks up. But there is no "Return to Dashboard" or "Check your progress" CTA after completing the challenge action.

- **Missing CTA location:** `ChallengeDayContent.tsx`, after the "Mark Complete" button (~line 101). A "Back to Dashboard" or "See your streak" link would help.
- **Severity: MEDIUM.** Users who mark complete may not know to return to the dashboard to see their progress reflected.

### 7. AI Bible Chat -> Save/Bookmark/Share Response

**Status: WORKING.** `AskResponseDisplay.tsx:100-155` provides 4 action buttons after the first response: "Ask another question", "Journal about this" (routes to journal with context), "Pray about this" (routes to pray with context), and "Share" (copies to clipboard). `SaveConversationButton` appears after 2+ Q&A pairs. Verse cards link directly to the Bible reader. Feedback (thumbs up/down) is persisted.

**Minor gap:** The "Journal about this" bridge from `AskPage.tsx:156-158` uses `location.state` (`prayWallContext`) to pass context, and `JournalTabContent.tsx:87-95` picks it up. However, the state key name `prayWallContext` is misleading since it is shared by the AI chat path. This is a code quality issue, not a user-facing gap.

### 8. End-of-Day Reflection -> Sleep & Rest Ambient

**Status: WORKING.** `EveningReflection.tsx:457-463` shows a "Go to Sleep & Rest" button linking to `/music?tab=sleep` at the final step (step 4, phase "done"), alongside a "Done" button. This is a clean bridge from the evening wind-down to sleep content.

### 9. Badge/Streak Milestone -> Next Goal Suggestion

**Status: WORKING.** `CelebrationQueue.tsx:39` calls `getBadgeSuggestion()` which returns context-aware next-step suggestions. `badge-suggestion.ts` maps badge categories to relevant routes: streak badges suggest reading plans, community badges suggest challenges, journal badges suggest Bible highlighting, meditation badges suggest insights, etc. `CelebrationOverlay.tsx` renders the suggestion as a clickable link. Well-implemented.

### 10. Prayer Wall Creation -> Personal Prayer List / Dashboard

**Status: WORKING.** `SaveToPrayersForm.tsx` (used in the Prayer Wall interaction bar) saves prayers to `wr_prayer_list` via `addPrayer()` and shows a toast with "View" action linking to `/my-prayers`. The `PrayerListWidget` on the dashboard reads from the same storage and displays active prayer count, most recent prayer, and a "View all" link. The bridge is complete.

### 11. Favorite Ambient Mix -> Daily Hub / Sleep Flow Access

**Status: GAP.** `wr_favorites` stores favorited sounds, scenes, and mixes. However, **favorites are only accessible from within the Music page**. There is no:
- Dashboard widget showing favorite/recent ambient mixes
- Daily Hub quick-access to "your last ambient session"
- Sleep flow shortcut to favorited sleep content

- **Missing feature location:** `DashboardWidgetGrid.tsx` could include a "Recent Sounds" or "Quick Listen" widget. The `QuickActions.tsx:8` links to `/music` generically but does not deep-link into a favorite mix or last session.
- **Severity: MEDIUM.** Users who build ambient routines have no fast-path back to them outside the Music page.

---

## Speed-to-Peace Assessment

**Path from app open to calming experience:**

**Logged-in user (returning):**
1. App open -> Dashboard (0 taps, auto-loaded)
2. Dashboard -> Quick Actions "Pray" card (1 tap)
3. Pray tab -> type or use chip -> Generate Prayer (2 taps minimum)

**OR via Music:**
1. Dashboard -> Quick Actions "Music" card (1 tap)
2. Music page -> Play ambient scene (2 taps)

**Total: 2-3 taps.** This is acceptable.

**Logged-out user (first visit):**
1. Landing page hero -> type feeling into TypewriterInput (1 action)
2. Submit -> auth modal blocks ("Sign in to ask questions") -- `HeroSection.tsx:91-93` gates on `isAuthenticated`
3. Dead end. User cannot proceed.

**Bottleneck:** The hero input targets `/ask?q={text}` which is auth-gated. Logged-out first-time users hit an auth modal wall on their very first interaction. This contradicts the spec's "Free to use, meaningful to keep" conversion strategy and the rule "Never gate first use."

- **Fix location:** `HeroSection.tsx:90-96`. The `handleInputSubmit` should route to `/ask?q=...` for all users (ask page itself should show the response and gate only saving/follow-ups, or redirect to Pray tab with context pre-filled).
- **Severity: CRITICAL.** This is the primary conversion funnel. A brand-new visitor types their feelings, hits submit, and gets a login wall. The value proposition is never demonstrated.

**No "just start" fast lane exists.** There is no single-tap "Start Praying" or "Play Calming Music" button on the dashboard. The Quick Actions widget requires scanning and selecting. A prominent "Continue where you left off" or ambient auto-resume would reduce friction.

---

## Time-of-Day Awareness

**Dashboard:** `DashboardHero.tsx:20-24` uses hour-based greeting (Good morning/afternoon/evening). `EveningReflection` appears after 6 PM via `isEveningTime()`. Liturgical season greeting is also shown. **Working.**

**Daily Hub:** `DailyHub.tsx:48-53` has the same hour-based greeting. The hero shows a time-appropriate message. **Working.**

**Landing page:** The hero section does not adapt by time of day. It always shows "How're You Feeling Today?" regardless of whether it is morning or evening. **Gap.**

**Content selection:** The devotional content, verse of the day, and mood recommendations do NOT change based on time of day. The evening reflection is time-gated, which is good. But there is no morning-specific content variant (e.g., "Start your morning with this verse" vs. "Wind down with this passage"). **Minor gap** -- acceptable for current phase, but a retention opportunity.

**Music/Sleep:** Sleep content is accessible at all times, not surfaced preferentially in the evening. The `useMusicHints` hook exists but the `MusicHint` component is not rendered (kept for re-enable per `09-design-system.md`). **Known deferred item.**

---

## Ritual Building Assessment

**Current state: Disconnected features, no "My Routine" concept.**

The app has excellent individual features (pray, journal, meditate, music, devotional) but **no unified "My Daily Routine" flow** that sequences them. The closest approximation is:

1. **Activity Checklist** (`ActivityChecklist.tsx`) -- shows which activities are done today, but it is passive (no "start next" button).
2. **Quick Actions** -- 4 buttons (Pray, Journal, Meditate, Music) with no sequencing.
3. **Getting Started Checklist** -- one-time only, dismissed after completion.
4. **Bedtime Routines** (`RoutinesPage.tsx`) -- only for audio/sleep content, not cross-feature.

**Missing:** A "My Morning Routine" or "Daily Flow" feature that sequences: Devotional -> Pray -> Journal -> Meditate with ambient, tracking progress through a multi-step flow. The Activity Checklist could evolve into this with a "Start next" button on the first uncompleted item.

- **Severity: HIGH for retention.** Ritual-building is the #1 driver of daily return rates. Users who build multi-feature habits return 3-4x more often than single-feature users.

---

## Retention & Re-engagement

### Engagement Triggers

**Streaks:** Well-implemented. Grace-based repair (1 free/week, 50 pts for additional). `StreakCard.tsx` shows current and longest streak. Evening reflection keeps streak alive. **Working.**

**Daily content refresh:** Verse of the Day rotates daily (60 verses). Devotional rotates daily (50 devotionals). Song of the Day rotates. QOTD rotates (72 questions). **Working.**

**Unfinished indicators:** Activity Checklist shows uncompleted items. Reading Plan Widget shows progress percentage. Challenge Widget shows current day. Tab checkmarks in Daily Hub show completion. **Working.**

**Personalized suggestions:** `MoodRecommendations.tsx` shows mood-aware recommendations after check-in, including unread devotional and active reading plan. `WeeklyGodMoments` summarizes the week. **Working.**

### Re-engagement After 3+ Days of Inactivity

**Status: SIGNIFICANT GAP.** When a user returns after 3+ days of inactivity:

1. **Streak resets silently.** `DashboardHero.tsx:128-129` shows "Start your streak today" when streak is 0. The messaging is gentle per spec ("never punitive"), but there is **no explicit "Welcome back" greeting** that acknowledges the absence warmly.
2. **No re-engagement nudge.** There is no "We missed you" message, no suggestion of where to pick up, no summary of what happened while they were away (new challenges, friend activity, etc.).
3. **Streak repair is available** but must be discovered by the user in the StreakCard -- there is no proactive prompt like "You had a 14-day streak! Use your free repair to keep it going."
4. **The mood check-in fires immediately** as if it is a normal day. No special flow for returning users.

- **Severity: CRITICAL for retention.** The 3-7 day mark is where users are most at risk of permanent churn. A warm "Welcome back" screen with streak repair offer, a summary of what is new, and a gentle one-tap re-entry path would significantly improve return rates.

### Push Notifications / Reminders

All notification infrastructure is in-app only (`NotificationPanel.tsx`, `useNotifications.ts`). There are no push notifications, email reminders, or other out-of-app re-engagement mechanisms. This is expected for the current frontend-only phase but is a critical gap for Phase 3.

---

## State & Data Health

### Persistence Across Refresh

All user state is persisted to localStorage via the `wr_*` key system:
- Mood entries: `wr_mood_entries` -- **persisted, survives refresh**
- Faith points: `wr_faith_points` -- **persisted**
- Streaks: `wr_streak` -- **persisted**
- Badges: `wr_badges` -- **persisted**
- Bible progress: `wr_bible_progress` -- **persisted**
- Journal entries: saved via completion tracking -- **persisted**
- Settings: `wr_settings` -- **persisted**

### React-Only State That Should Be Persisted

1. **AI Bible Chat conversation thread** (`AskPage.tsx:28`): `conversation` is `useState` only. Navigating away and returning loses the entire conversation. The `SaveConversationButton` allows saving after 2+ pairs, but the active conversation state is ephemeral.
   - **Severity: MEDIUM.** Users who leave to check a Bible reference and return lose their thread.

2. **Pray tab prayer response** (`PrayTabContent.tsx`): The generated prayer and response state are React-only. If the user switches tabs and comes back, the state is preserved (all tabs are mounted), but if they navigate away from `/daily` entirely and return, the prayer is lost.
   - **Severity: LOW.** This is by design (session-level state), but a "last prayer" recall could be useful.

3. **Evening Reflection in-progress state** (`EveningReflection.tsx`): The multi-step form (mood, highlights, gratitude, prayer) is all React state. Accidentally closing the overlay loses all input.
   - **Severity: LOW.** The flow is short enough that this is acceptable.

### Dead Data Islands

1. **`wr_chat_feedback` (AI Bible Chat feedback):** Written in `AskPage.tsx:197` but **never read by any other feature**. No insights page, no admin view, no feedback summary. The data accumulates with no consumer.
   - **Files:** Written at `AskPage.tsx:197`, constant defined at `constants/ask.ts`.

2. **`wr_challenge_reminders`:** The key is defined in `constants/challenges.ts:23` and the `getReminders`/`toggleReminder` functions exist in `useChallengeProgress.ts`, but the **reminder toggle UI in `ChallengeDetail.tsx` writes to this key** and no background system reads it to actually send reminders. It is UI-only with no notification backend.
   - **Severity: LOW.** Expected for frontend-only phase, but users may think toggling the bell icon actually enables reminders.

3. **`wr_journal_milestones`:** Defined in `constants/daily-experience.ts:3`, used in `JournalTabContent.tsx` to track which milestones have fired celebrations. This is read-and-written by the same component -- not a dead island per se, but it is a single-consumer key that could be surfaced in Insights.

4. **`wr_listening_history`:** Written by audio hooks, but only read by: the Music page history tab and `CompletionScreen.tsx` (meditation stats). Not surfaced on dashboard or insights. **Minor gap** -- could feed a "Your week in audio" insight.

---

## Summary: Top 5 Fixes by Severity

| Priority | Issue | Impact | Location |
|----------|-------|--------|----------|
| **P0** | No "Welcome Back" flow for returning users after 3+ days | Churn at the critical re-engagement window | `Dashboard.tsx` -- add phase check for days-since-last-activity |
| **P0** | Landing page hero input auth-gates first interaction | First-visit conversion funnel hits a login wall | `HeroSection.tsx:91-93` -- allow logged-out access to Ask or redirect to Pray tab |
| **P1** | Bible reader has no cross-feature CTAs after chapter | High-traffic dead end with no engagement bridge | `BibleReader.tsx` ~line 320 -- add journal/pray/ask/meditate strip |
| **P1** | No "My Routine" or sequenced daily flow concept | Ritual formation is impossible, features feel disconnected | New feature: Activity Checklist with "Start next" CTA |
| **P2** | Favorite ambient mixes not accessible outside Music page | Audio habit users have no fast-path back | Dashboard widget or Quick Actions deep-link |
