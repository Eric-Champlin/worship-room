# BB-33 Animation Audit

Comprehensive catalogue of every animated element in `frontend/src/`.
Generated from codebase search on the `bible-redesign` branch.

**Canonical tokens** (from `src/constants/animation.ts`):

| Token | Value |
|-------|-------|
| `duration-fast` | 150ms |
| `duration-base` | 250ms |
| `duration-slow` | 400ms |
| `ease-standard` | cubic-bezier(0.4, 0, 0.2, 1) |
| `ease-decelerate` | cubic-bezier(0, 0, 0.2, 1) |
| `ease-accelerate` | cubic-bezier(0.4, 0, 1, 1) |
| `ease-sharp` | cubic-bezier(0.4, 0, 0.6, 1) |

**Global safety net**: `styles/animations.css` contains a `@media (prefers-reduced-motion: reduce)` rule that sets `animation-duration: 0ms !important`, `transition-duration: 0ms !important`, and `scroll-behavior: auto !important` on all elements. This catches most missing per-element guards, but components that conditionally toggle animation classes (e.g., adding `animate-fade-in` only when `motion-safe:`) or use inline JS `transition:` styles still need explicit reduced-motion handling.

---

## 1. Duration Classes

### duration-100

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/music/FavoriteButton.tsx:88 | Favorite button scale | duration-100 | duration-fast (150ms) | |
| components/insights/CalendarHeatmap.tsx:276 | Heatmap cell hover brightness | duration-100 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/ui/WhisperToast.tsx:84 | Toast (reduced motion variant) | duration-100 | duration-fast (150ms) | Applied conditionally for prefers-reduced-motion |

### duration-150

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/bible/reader/VerseBookmarkMarker.tsx:4 | Bookmark marker color | duration-150 | duration-fast (150ms) | Exact match, no change needed |
| components/bible/reader/VerseNoteMarker.tsx:4 | Note marker color | duration-150 | duration-fast (150ms) | Exact match |
| components/insights/MoodTrendChart.tsx:279-280 | Time range filter buttons | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/settings/ToggleSwitch.tsx:48 | Toggle knob transform | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/leaderboard/LeaderboardTab.tsx:15 | Tab fade-in | duration-150 | duration-fast (150ms) | Uses motion-safe: prefix |
| components/my-prayers/PrayerComposer.tsx:157 | Category filter buttons | duration-150 | duration-fast (150ms) | Uses ease-in-out |
| components/daily/KaraokeText.tsx:22 | Word highlight color | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/daily/JournalSearchFilter.tsx:61 | Search filter pills | duration-150 | duration-fast (150ms) | |
| components/dashboard/CustomizePanel.tsx:216 | Toggle knob transform | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/dashboard/DashboardCard.tsx:49 | Card hover border color | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/dashboard/MoodChart.tsx:50 | Chart hover transform | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/echoes/EchoCard.tsx:30 | Card hover color | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |
| components/profile/ProfileBadgeShowcase.tsx:86 | Badge hover scale | duration-150 | duration-fast (150ms) | Uses motion-safe:hover:scale-105 |
| components/StartingPointQuiz.tsx:295 | Quiz option (active) | duration-150 | duration-fast (150ms) | |
| components/prayer-wall/CategoryFilterBar.tsx:72,92,115 | Category filter buttons (x3) | duration-150 | duration-fast (150ms) | |
| components/prayer-wall/InlineComposer.tsx:171 | Submit button | duration-150 | duration-fast (150ms) | Uses ease-in-out |
| pages/Insights.tsx:121-122 | Insight tab buttons | duration-150 | duration-fast (150ms) | Has motion-reduce:transition-none |

### duration-200

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/bible/reader/VerseJumpPill.tsx:50 | Jump pill opacity | duration-200 | duration-base (250ms) | Transition |
| components/bible/reader/ReaderBody.tsx:99 | Verse selection highlight | duration-200 | duration-base (250ms) | Conditional |
| components/bible/reader/ShareSubView.tsx:266 | Template option opacity | duration-200 | duration-base (250ms) | Conditional on !reducedMotion |
| components/bible/landing/ActivePlanBanner.tsx:63 | CTA button hover | duration-200 | duration-base (250ms) | White pill CTA |
| components/bible/landing/ResumeReadingCard.tsx:39 | CTA button hover | duration-200 | duration-base (250ms) | White pill CTA |
| components/bible/plans/PlanCompletedCard.tsx:24 | Card hover lift | duration-200 | duration-base (250ms) | Uses motion-safe:hover:-translate-y-1 |
| components/bible/plans/PlanBrowserEmptyState.tsx:29,46 | CTA buttons (x2) | duration-200 | duration-base (250ms) | White pill CTA |
| components/bible/plans/PlanBrowseCard.tsx:14 | Card hover lift | duration-200 | duration-base (250ms) | Uses motion-safe:hover:-translate-y-1 |
| components/bible/plans/PlanCompletionCelebration.tsx:115 | CTA button | duration-200 | duration-base (250ms) | White pill CTA |
| components/bible/books/ChapterJumpOverlay.tsx:12 | Overlay opacity | duration-200 | duration-base (250ms) | |
| components/bible/VerseDisplay.tsx:313 | Verse display animation | duration-200 | duration-base (250ms) | Uses motion-safe: prefix |
| components/bible/BooksDrawerContent.tsx:333 | Book card hover | duration-200 | duration-base (250ms) | Has motion-reduce:hover:translate-y-0 |
| components/ui/WhisperToast.tsx:85 | Toast enter animation | duration-200 | duration-base (250ms) | With ease-out |
| components/homepage/FrostedCard.tsx:33 | Card hover | duration-200 | duration-base (250ms) | With ease-out |
| components/homepage/FinalCTA.tsx:51 | CTA button hover | duration-200 | duration-base (250ms) | White pill CTA |
| components/daily/MeditateTabContent.tsx:123 | Meditation card hover | duration-200 | duration-base (250ms) | With ease-out |
| components/daily/JournalInput.tsx:341 | Save entry button | duration-200 | duration-base (250ms) | White pill CTA |
| components/daily/PrayerInput.tsx:170 | Help Me Pray button | duration-200 | duration-base (250ms) | White pill CTA |
| components/daily/GuidedPrayerSection.tsx:64 | Guided prayer card hover | duration-200 | duration-base (250ms) | |
| components/daily/DevotionalPreviewPanel.tsx:22 | Panel visibility | duration-200 | duration-base (250ms) | |
| components/daily/DailyAmbientPillFAB.tsx:25 | FAB opacity (drawer-aware) | duration-200 | duration-base (250ms) | |
| components/dashboard/DashboardCard.tsx:88 | Chevron rotate | duration-200 | duration-base (250ms) | Has motion-reduce:transition-none |
| components/dashboard/DashboardCard.tsx:100 | Grid row expand | duration-200 | duration-base (250ms) | With ease-in-out, has motion-reduce:transition-none |
| components/dashboard/EveningReflection.tsx:386 | Mood button hover | duration-200 | duration-base (250ms) | |
| components/dashboard/MoodRecommendations.tsx:178 | Recommendation card hover | duration-200 | duration-base (250ms) | |
| components/dashboard/GettingStartedCard.tsx:171,192 | Chevron rotate + grid expand | duration-200 | duration-base (250ms) | Both have motion-reduce:transition-none |
| components/dashboard/WelcomeWizard.tsx:268 | Step indicator | duration-200 | duration-base (250ms) | |
| components/dashboard/WelcomeWizard.tsx:476 | Quiz option hover | duration-200 | duration-base (250ms) | |
| components/dashboard/NotificationItem.tsx:123 | Dismiss slide-out | duration-200 | duration-base (250ms) | Conditional on !prefersReducedMotion |
| components/dashboard/MoodCheckIn.tsx:162 | Mood button focus | duration-200 | duration-base (250ms) | |
| components/dashboard/MoodCheckIn.tsx:171 | Mood orb scale | duration-200 | duration-base (250ms) | |
| components/local-support/ListingCard.tsx:178 | Expand chevron rotate | duration-200 | duration-base (250ms) | |
| components/local-support/ListingCard.tsx:195 | Content expand | duration-200 | duration-base (250ms) | |
| components/JourneySection.tsx:72 | Step circle glow hover | duration-200 | duration-base (250ms) | |
| components/JourneySection.tsx:162 | Step row hover | duration-200 | duration-base (250ms) | |
| components/JourneySection.tsx:181 | Arrow icon hover | duration-200 | duration-base (250ms) | |
| components/StartingPointQuiz.tsx:296 | Quiz option (inactive) | duration-200 | duration-base (250ms) | |
| components/StartingPointQuiz.tsx:368 | Submit button hover | duration-200 | duration-base (250ms) | |
| components/ErrorBoundary.tsx:61 | Retry button | duration-200 | duration-base (250ms) | White pill CTA |
| pages/PrayerWallProfile.tsx:206 | Tab indicator slide | duration-200 | duration-base (250ms) | Uses motion-safe: prefix |
| pages/BiblePlanDetail.tsx:167,177,193 | CTA buttons (x3) | duration-200 | duration-base (250ms) | White pill CTAs |
| pages/GrowPage.tsx:166 | Tab indicator slide | duration-200 | duration-base (250ms) | With ease-in-out |
| pages/DailyHub.tsx:275 | Tab pill button | duration-200 | duration-base (250ms) | |
| pages/meditate/ScriptureSoaking.tsx:229 | Progress bar width | duration-200 | duration-base (250ms) | |
| pages/Friends.tsx:126 | Tab indicator slide | duration-200 | duration-base (250ms) | Uses motion-safe: prefix |
| pages/MusicPage.tsx:238 | Tab indicator slide | duration-200 | duration-base (250ms) | With ease-in-out |
| pages/BiblePlanDay.tsx:270 | CTA button | duration-200 | duration-base (250ms) | White pill CTA |
| pages/PrayerWallDashboard.tsx:320 | Tab indicator slide | duration-200 | duration-base (250ms) | Uses motion-safe: prefix |

### duration-300

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/bible/reader/NotificationPrompt.tsx:24 | Prompt enter | duration-300 | duration-slow (400ms) for slide | With ease-out |
| components/bible/landing/ActivePlanBanner.tsx:48 | Progress bar fill | duration-300 | duration-slow (400ms) | |
| components/bible/landing/StreakChip.tsx:45 | Streak chip hover | duration-300 | duration-base (250ms) for transition | |
| components/bible/BooksDrawerContent.tsx:345 | Progress bar fill | duration-300 | duration-slow (400ms) | |
| components/SiteFooter.tsx:107 | Link underline scale | duration-300 | duration-slow (400ms) for slide | after: pseudo-element |
| components/Navbar.tsx:38,115 | Nav link underlines (x2) | duration-300 | duration-slow (400ms) for slide | after: pseudo-element |
| components/ask/VerseCardActions.tsx:113 | Expand/collapse content | duration-300 | duration-slow (400ms) for expansion | |
| components/memorize/MemorizationFlipCard.tsx:75 | Card flip transform | duration-300 | duration-slow (400ms) for flip | With ease-out |
| components/leaderboard/LeaderboardRow.tsx:53 | Row entrance + transform | duration-300 | duration-slow (400ms) | With ease-in-out, has motion-reduce:transition-none |
| components/my-prayers/PrayerComposer.tsx:71 | Composer expand | duration-300 | duration-slow (400ms) for expansion | With ease-in-out |
| components/daily/DevotionalPreviewPanel.tsx:45 | Chevron rotate | duration-300 | duration-slow (400ms) | |
| components/daily/DevotionalPreviewPanel.tsx:66 | Panel max-height expand | duration-300 | duration-slow (400ms) for expansion | With ease-out |
| components/daily/PrayerResponse.tsx:432 | Disclaimer fade | duration-300 | duration-base (250ms) for transition | |
| components/dashboard/CustomizePanel.tsx:96 | Overlay backdrop opacity | duration-300 | duration-slow (400ms) for slide | Has motion-reduce:transition-none |
| components/dashboard/CustomizePanel.tsx:120 | Panel slide transform | duration-300 | duration-slow (400ms) for slide | With ease-in-out, has motion-reduce:transition-none |
| components/dashboard/WeeklyGodMoments.tsx:57 | Card opacity | duration-300 | duration-base (250ms) for transition | |
| components/dashboard/DashboardWidgetGrid.tsx:105 | Widget reorder | duration-300 | duration-slow (400ms) | With ease-in-out, has motion-reduce:transition-none |
| components/dashboard/GettingStartedCard.tsx:107 | Card opacity | duration-300 | duration-base (250ms) for transition | Has motion-reduce:transition-none |
| components/dashboard/GettingStartedCard.tsx:217 | Checklist item opacity | duration-300 | duration-base (250ms) for transition | Has motion-reduce:transition-none |
| components/dashboard/MoodCheckIn.tsx:253 | Verse fade | duration-300 | duration-base (250ms) for transition | |
| components/LocalSupportDropdown.tsx:118,193 | Link underlines (x2) | duration-300 | duration-slow (400ms) for slide | after: pseudo-element |
| components/audio/ScriptureTextPanel.tsx:44 | Text color transition | duration-300 | duration-base (250ms) for transition | |
| components/audio/AudioPill.tsx:65,112 | Pill opacity (x2) | duration-300 | duration-base (250ms) for transition | |
| components/friends/PendingRequests.tsx:65,114 | Request fade (x2) | duration-300 | duration-base (250ms) for transition | Has motion-reduce:duration-0 |
| components/StartingPointQuiz.tsx:95 | Progress bar fill | duration-300 | duration-slow (400ms) | With ease-out |
| components/StartingPointQuiz.tsx:354 | Validation message fade | duration-300 | duration-base (250ms) for transition | |
| components/prayer-wall/CommentsSection.tsx:39 | Comments expand | duration-300 | duration-slow (400ms) for expansion | With ease-in-out |
| components/prayer-wall/SaveToPrayersForm.tsx:59 | Grid row expand | duration-300 | duration-slow (400ms) for expansion | With ease-in-out |
| components/prayer-wall/QotdComposer.tsx:52 | Composer expand | duration-300 | duration-slow (400ms) for expansion | With ease-in-out |
| components/prayer-wall/InlineComposer.tsx:103 | Composer expand | duration-300 | duration-slow (400ms) for expansion | With ease-in-out |
| pages/SharedVerse.tsx:98 | Attribution fade | duration-300 | duration-base (250ms) for transition | |
| pages/BiblePlanDetail.tsx:155 | Progress bar fill | duration-300 | duration-slow (400ms) | |
| pages/meditate/ScriptureSoaking.tsx:197 | Verse label fade | duration-300 | duration-base (250ms) for transition | |
| pages/meditate/ActsPrayerWalk.tsx:107 | Progress bar width | duration-300 | duration-slow (400ms) | |
| pages/meditate/ExamenReflection.tsx:115 | Progress bar width | duration-300 | duration-slow (400ms) | |

### duration-500

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/challenges/ActiveChallengeCard.tsx:78 | Progress bar fill | duration-500 | duration-slow (400ms) | |
| components/daily/GuidedPrayerPlayer.tsx:181,200 | Phase text fade (x2) | duration-500 | duration-slow (400ms) | Conditional on !prefersReduced |
| components/daily/PrayerResponse.tsx:394 | Section fade-out | duration-500 | duration-slow (400ms) | |
| components/dashboard/EveningReflection.tsx:328 | Close fade-out | duration-500 | duration-slow (400ms) | |
| components/dashboard/ReadingPlanWidget.tsx:144 | Progress bar fill | duration-500 | duration-slow (400ms) | |
| components/dashboard/ChallengeWidget.tsx:54 | SVG stroke dashoffset | duration-500 | duration-slow (400ms) | Uses motion-safe: prefix |
| components/JourneySection.tsx:155 | Step reveal | duration-500 | duration-slow (400ms) | With ease-out |
| pages/RegisterPage.tsx:82,129,171,193,224 | Section entrance (x5) | duration-500 | duration-slow (400ms) | All with ease-out |
| pages/ChallengeDetail.tsx:274,307 | Progress bars (x2) | duration-500 | duration-slow (400ms) | |
| pages/ReadingPlanDetail.tsx:224 | Progress bar fill | duration-500 | duration-slow (400ms) | |

### duration-700

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/insights/MonthlyStatCards.tsx:116 | Progress bar fill | duration-700 | duration-slow (400ms) | |

### Custom duration-[...]

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/bible/VerseDisplay.tsx:330 | Verse highlight fade | duration-[2000ms] | N/A (intentional slow) | 2s highlight-then-fade effect |
| components/daily/GuidedPrayerPlayer.tsx:219 | Guided prayer progress bar | duration-[250ms] | duration-base (250ms) | Exact match to token |
| components/dashboard/GrowthGarden.tsx:731 | Garden opacity | duration-[2000ms] | N/A (intentional slow) | 2s garden fade-in, uses motion-safe: prefix |
| pages/meditate/BreathingExercise.tsx:215 | Inhale circle scale | duration-[4000ms] | N/A (breathing phase) | 4s inhale, with ease-in-out |
| pages/meditate/BreathingExercise.tsx:217 | Hold circle | duration-[7000ms] | N/A (breathing phase) | 7s hold |
| pages/meditate/BreathingExercise.tsx:218 | Exhale circle scale | duration-[8000ms] | N/A (breathing phase) | 8s exhale, with ease-in-out |

---

## 2. Easing Classes (in className strings)

### ease-out (Tailwind class)

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/bible/reader/NotificationPrompt.tsx:24 | Prompt entrance | ease-out | ease-decelerate | |
| components/ui/WhisperToast.tsx:85 | Toast entrance | ease-out | ease-decelerate | |
| components/homepage/FrostedCard.tsx:33 | Card hover | ease-out | ease-decelerate | |
| components/Navbar.tsx:38,115 | Nav link underlines (x2) | after:ease-out | ease-decelerate | |
| components/memorize/MemorizationFlipCard.tsx:75 | Card flip | ease-out | ease-decelerate | Has motion-reduce:duration-0 |
| components/dashboard/ChallengeWidget.tsx:54 | SVG stroke | motion-safe:ease-out | ease-decelerate | Uses motion-safe: prefix |
| components/LocalSupportDropdown.tsx:118,193 | Link underlines (x2) | after:ease-out | ease-decelerate | |
| components/daily/MeditateTabContent.tsx:123 | Card hover | ease-out | ease-decelerate | |
| components/daily/DevotionalPreviewPanel.tsx:66 | Panel expand | ease-out | ease-decelerate | |
| components/JourneySection.tsx:155 | Step reveal | ease-out | ease-decelerate | |
| components/StartingPointQuiz.tsx:95 | Progress bar | ease-out | ease-decelerate | |
| pages/RegisterPage.tsx:82,129,171,193,224 | Section entrances (x5) | ease-out | ease-decelerate | |

### ease-in-out (Tailwind class)

| File | Element/Context | Current Value | Token | Notes |
|------|----------------|---------------|-------|-------|
| components/leaderboard/LeaderboardRow.tsx:53 | Row entrance | ease-in-out | ease-standard | Has motion-reduce:transition-none |
| components/my-prayers/PrayerComposer.tsx:71 | Composer expand | ease-in-out | ease-standard | |
| components/my-prayers/PrayerComposer.tsx:157 | Category filter | ease-in-out | ease-standard | |
| components/dashboard/CustomizePanel.tsx:120 | Panel slide | ease-in-out | ease-standard | Has motion-reduce:transition-none |
| components/dashboard/DashboardCard.tsx:100 | Grid row expand | ease-in-out | ease-standard | Has motion-reduce:transition-none |
| components/dashboard/DashboardWidgetGrid.tsx:105 | Widget reorder | ease-in-out | ease-standard | Has motion-reduce:transition-none |
| components/dashboard/GettingStartedCard.tsx:192 | Grid row expand | ease-in-out | ease-standard | Has motion-reduce:transition-none |
| components/prayer-wall/CommentsSection.tsx:39 | Comments expand | ease-in-out | ease-standard | |
| components/prayer-wall/SaveToPrayersForm.tsx:59 | Grid expand | ease-in-out | ease-standard | |
| components/prayer-wall/QotdComposer.tsx:52 | Composer expand | ease-in-out | ease-standard | |
| components/prayer-wall/InlineComposer.tsx:103 | Composer expand | ease-in-out | ease-standard | |
| components/prayer-wall/InlineComposer.tsx:171 | Submit button | ease-in-out | ease-standard | |
| pages/PrayerWallProfile.tsx:206 | Tab indicator | motion-safe:ease-in-out | ease-standard | Uses motion-safe: prefix |
| pages/GrowPage.tsx:166 | Tab indicator | ease-in-out | ease-standard | |
| pages/meditate/BreathingExercise.tsx:215,218 | Breathing circle (x2) | ease-in-out | ease-standard | Intentional breathing animation |
| pages/Friends.tsx:126 | Tab indicator | motion-safe:ease-in-out | ease-standard | Uses motion-safe: prefix |
| pages/MusicPage.tsx:238 | Tab indicator | ease-in-out | ease-standard | |
| pages/PrayerWallDashboard.tsx:320 | Tab indicator | motion-safe:ease-in-out | ease-standard | Uses motion-safe: prefix |

### ease-in (standalone, no className uses found)

No Tailwind `ease-in` class was found in any className string.

### cubic-bezier in className strings

No inline cubic-bezier was found in any className string. All cubic-bezier values are in:
- `src/constants/animation.ts` (token definitions)
- `src/styles/animations.css` (:focus-visible ring)
- Inline style objects (see Section 3)

---

## 3. Inline Style Animations

### style={{ transition: ... }}

| File | Element/Context | Current Value | Notes |
|------|----------------|---------------|-------|
| components/bible/reader/ReaderChapterNav.tsx:32 | Chapter nav opacity | `opacity ${chromeTransitionMs ?? 200}ms ease` | Dynamic ms value |
| components/bible/reader/ActivePlanReaderBanner.tsx:30 | Plan banner opacity | `opacity ${chromeTransitionMs}ms ease` | Dynamic ms value |
| components/bible/reader/FocusVignette.tsx:18,29 | Vignette overlays (x2) | `opacity ${transitionMs}ms ease` | Dynamic ms value |
| components/bible/reader/ReaderBody.tsx:107 | Verse highlight glow | `box-shadow 1.5s ease-out` | Guarded: reducedMotion ? 'none' |
| components/bible/reader/VerseActionSheet.tsx:319 | Swipe offset | `swipeOffset !== 0 ? 'none' : undefined` | Disables during swipe |
| components/bible/reader/ReaderChrome.tsx:72 | Chrome fade | `opacity ${chromeTransitionMs}ms ease` | Dynamic ms value |
| components/bible/BibleDrawer.tsx:90 | Drawer slide | `transform 300ms ease-out` | Disabled during swipe |
| components/bible/FloatingActionBar.tsx:161 | FAB opacity | `opacity 150ms ease-out` | Guarded: prefersReduced ? 'none' |
| components/ui/TooltipCallout.tsx:345-349 | Tooltip fade in/out | `opacity/transform Nms ease-out` (in) / `ease-in` (out) | Guarded: prefersReduced ? 'none' |
| components/reading-plans/PlanCompletionOverlay.tsx:122 | Overlay entrance | `opacity/transform ${durationMs}ms ease-out` | |
| components/reading-plans/PlanCompletionOverlay.tsx:164 | Cross-fade | `opacity 300ms ease-out` | Guarded: reducedMotion ? undefined |
| components/reading-plans/DayCompletionCelebration.tsx:48 | Check entrance | `opacity/transform 300ms ease-out` | |
| components/reading-plans/DayCompletionCelebration.tsx:83 | SVG stroke | `stroke-dashoffset 500ms ease-out 200ms` | Guarded: reducedMotion check |
| components/challenges/ChallengeBanner.tsx:125 | Banner collapse | `max-height/opacity 200ms ease-out` | Guarded: prefersReduced ? 'none' |
| components/SeasonalBanner.tsx:70-72 | Banner collapse | `max-height/opacity 200ms ease-out` | Guarded: prefersReduced ? 'none' |
| components/my-prayers/PrayerAnsweredCelebration.tsx:108 | Overlay entrance | `opacity/transform ${durationMs}ms ease-out` | |
| components/my-prayers/PrayerAnsweredCelebration.tsx:124 | Cross-fade | `opacity 300ms ease-out` | Guarded: reducedMotion ? undefined |
| components/daily/KaraokeTextReveal.tsx:113 | Word reveal | `opacity/transform 200ms ease-out` | |
| components/dashboard/DashboardHero.tsx:169-171 | Progress bar width | `width 600ms ease-out, box-shadow 300ms ease-out` | Guarded: prefersReduced ? 'none' |
| components/dashboard/StreakCard.tsx:322-324 | XP bar width | `width 600ms ease-out, box-shadow 300ms ease-out` | Guarded: prefersReduced ? 'none' |
| components/dashboard/GettingStartedCard.tsx:152 | SVG stroke | `stroke-dashoffset 500ms ease-out` | Guarded: reducedMotion check |
| components/dashboard/ActivityChecklist.tsx:159 | SVG stroke | `stroke-dashoffset 500ms ease-out` | Guarded: reducedMotion check |
| components/audio/TimerProgressRing.tsx:43 | Timer ring stroke | `stroke-dashoffset 1s linear` | No reduced-motion guard |
| components/audio/AudioDrawer.tsx:114 | Drawer slide | `transform 300ms ease-out` | Disabled during swipe |
| components/StartingPointQuiz.tsx:99 | Progress bar width | `width 300ms ease` | Conditional on !isDark |
| pages/BibleReader.tsx:683-685 | Chapter swipe | `transform 200ms ease-out` | |

### style={{ animation: ... }}

| File | Element/Context | Current Value | Notes |
|------|----------------|---------------|-------|
| components/challenges/ChallengeCompletionOverlay.tsx:31 | Confetti particles | `confetti-fall 2.5s ${delay}s ease-in forwards` | |

### style={{ animationDelay / animationDuration }}

| File | Element/Context | Current Value | Notes |
|------|----------------|---------------|-------|
| components/ui/Toast.tsx:78 | Confetti particle stagger | animationDelay: `${i * 50}ms` | |
| components/reading-plans/PlanCompletionOverlay.tsx:41 | Confetti stagger | animationDelay: `${delay}s` | |
| components/leaderboard/GlobalLeaderboard.tsx:127 | Row stagger | animationDelay: max 500ms, animationDuration: 300ms | |
| components/leaderboard/LeaderboardRow.tsx:60 | Row stagger | animationDelay: `${delay}ms`, animationDuration: 300ms | |
| components/my-prayers/PrayerAnsweredCelebration.tsx:40 | Confetti stagger | animationDelay: `${delay}s` | |
| components/dashboard/garden/SeasonalOverlay.tsx:51,82 | Seasonal elements (x2) | animationDelay | Guarded: prefersReduced ? undefined |
| components/dashboard/garden/ActivityElements.tsx:35 | Activity sparkles | animationDelay: `${i * 100}ms` | Guarded: prefersReduced ? undefined |
| components/dashboard/garden/NightSky.tsx:45,68 | Stars and shooting stars (x2) | animationDelay | Guarded: prefersReduced ? undefined |
| components/dashboard/DashboardWidgetGrid.tsx:104 | Widget stagger | animationDelay: `${(start + i) * 100}ms` | |
| components/dashboard/WelcomeBack.tsx:124 | Welcome stagger | animationDelay/animationFillMode | Guarded: prefersReduced ? {} |
| components/dashboard/MoodRecommendations.tsx:184 | Card stagger | animationDelay: `${index * 150}ms` | Guarded: !prefersReduced |
| components/dashboard/GrowthGarden.tsx:196 | Garden elements | animationDelay | |
| components/dashboard/GettingStartedCelebration.tsx:33 | Confetti stagger | animationDelay: `${delay}s` | |
| components/dashboard/CelebrationOverlay.tsx:43 | Confetti stagger | animationDelay: `${delay}s` | |
| components/social/MilestoneFeed.tsx:59 | Feed item stagger | animationDelay: `${delay}ms`, animationDuration: 300ms | |
| components/JourneySection.tsx:158 | Step stagger | transitionDelay via staggerDelay() | |
| hooks/useScrollReveal.ts:56 | Scroll reveal delay | transitionDelay: `${initialDelay + index * baseDelay}ms` | |
| hooks/useStaggeredEntrance.ts:39 | Stagger utility | animationDelay: `${index * staggerDelay}ms` | |
| pages/RegisterPage.tsx:134,176 | Register section stagger (x2) | transitionDelay: `${index * 100}ms` / `${index * 50}ms` | |
| pages/Dashboard.tsx:451,522,536 | Dashboard entrance (x3) | animationDelay: 0ms/100ms | Conditional on shouldAnimate |
| pages/AskPage.tsx:360,364 | Loading dots (x2) | animationDelay: 150ms/300ms | |
| pages/MonthlyReport.tsx:39 | Section stagger | animationDelay: `${index * 100}ms` | |
| pages/Insights.tsx:143 | Tab stagger | animationDelay: `${index * 100}ms` | |

### CSS File Inline Transitions/Animations

| File | Element/Context | Current Value | Notes |
|------|----------------|---------------|-------|
| index.css:163 | .scroll-reveal | `opacity 600ms ease-out, transform 600ms ease-out` | Homepage scroll animation |
| index.css:171 | .scroll-reveal-fade | `opacity 600ms ease-out` | Homepage fade-only variant |
| index.css:178 | .border-pulse-glow | `animation: 3s ease-in-out infinite` | |
| index.css:263 | .animate-challenge-pulse | `animation: 2s ease-in-out infinite` | Has prefers-reduced-motion: none |
| styles/animations.css:34-36 | Global reduced-motion | `animation-duration: 0ms !important; transition-duration: 0ms !important` | Safety net |
| styles/animations.css:49 | :focus-visible | `box-shadow 150ms cubic-bezier(0, 0, 0.2, 1)` | |

---

## 4. Missing motion-reduce Guards

The following files have `transition-*` or `animate-*` classes in their className strings but do NOT contain any `motion-reduce:`, `motion-safe:`, `prefers-reduced-motion`, `prefersReduced`, or `reducedMotion` reference. While the global CSS safety net in `styles/animations.css` catches most of these at the `transition-duration`/`animation-duration` level, files that conditionally apply animation classes or use JS-driven animation logic may still need explicit guards.

**Note**: Files marked with (CSS safety net covers) rely on the global `prefers-reduced-motion: reduce` rule that zeroes all transition/animation durations. Files that apply animation via JS conditionals or inline styles may need explicit handling.

### Components with transition- but no motion guard

| File | Animated Properties | Risk Level | Notes |
|------|-------------------|------------|-------|
| components/SiteFooter.tsx | after:transition-transform (underline) | Low | CSS safety net covers |
| components/SongPickSection.tsx | transition-opacity | Low | CSS safety net covers |
| components/SpotifyBadge.tsx | transition-colors | Low | CSS safety net covers |
| components/ErrorBoundary.tsx | transition-all (button) | Low | CSS safety net covers |
| components/ChunkErrorBoundary.tsx | transition-all | Low | CSS safety net covers |
| components/HeroSection.tsx | transition-colors | Low | Uses prefers-reduced-motion for other things, but not all transitions guarded |
| components/ask/DigDeeperSection.tsx | transition-colors | Low | CSS safety net covers |
| components/ask/PopularTopicsSection.tsx | transition-colors | Low | CSS safety net covers |
| components/ask/SaveConversationButton.tsx | transition-colors | Low | CSS safety net covers |
| components/ask/VerseCardActions.tsx | transition-all (expand) | Medium | Expansion animation, CSS safety net covers but could be jarring |
| components/audio/AmbientBrowser.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/BedtimeStoryCard.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/BibleSleepSection.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/ContentSwitchDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/DrawerTabs.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/FeaturedSceneCard.tsx | transition-all | Low | CSS safety net covers |
| components/audio/MixerSoundRow.tsx | transition-all | Low | CSS safety net covers |
| components/audio/MixerTabContent.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/RoutineInterruptDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/RoutineStepper.tsx | transition-all | Low | CSS safety net covers |
| components/audio/SaveMixButton.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/SavedMixRow.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/SceneCard.tsx | transition-all | Low | CSS safety net covers |
| components/audio/SceneUndoToast.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/ScriptureSessionCard.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/SleepBrowse.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/SoundCard.tsx | transition-all | Low | CSS safety net covers |
| components/audio/TimerTabContent.tsx | transition-colors | Low | CSS safety net covers |
| components/audio/TonightScripture.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/AudioControlBar.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/BibleSearchMode.tsx | transition-all | Low | CSS safety net covers |
| components/bible/BookCompletionCard.tsx | transition-all | Low | CSS safety net covers |
| components/bible/BookEntry.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/BookNotFound.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/ChapterEngagementBridge.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/ChapterGrid.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/ChapterNav.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/ChapterPlaceholder.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/ChapterSelector.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/NoteIndicator.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/SleepTimerPanel.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/TestamentAccordion.tsx | transition-transform | Low | CSS safety net covers |
| components/bible/books/ContinueReadingCallout.tsx | transition-all | Low | CSS safety net covers |
| components/bible/my-bible/ActivityActionMenu.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/my-bible/ActivityFilterBar.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/my-bible/BibleProgressMap.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/my-bible/BibleSettingsModal.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/my-bible/EmptySearchResults.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/my-bible/HighlightCard.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/my-bible/ReadingHeatmap.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/plans/PlanFilterPill.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/plans/PlanInProgressCard.tsx | transition-all | Low | CSS safety net covers |
| components/bible/reader/AmbientAudioPicker.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/reader/BookmarkLabelEditor.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/reader/CrossRefsSubView.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/reader/ExplainSubViewError.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/reader/TypographySheet.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/streak/StreakDetailModal.tsx | transition-colors | Low | CSS safety net covers |
| components/bible/streak/StreakResetWelcome.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/ActiveChallengeCard.tsx | transition-all (progress bar) | Low | CSS safety net covers |
| components/challenges/ChallengeDayContent.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/ChallengeDaySelector.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/ChallengeNotFound.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/ChallengeShareButton.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/CommunityFeed.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/NextChallengeCountdown.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/PastChallengeCard.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/SwitchChallengeDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/challenges/UpcomingChallengeCard.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/DevotionalTabContent.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/JournalTabContent.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/MiniHubCards.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/ReadAloudButton.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/SaveToPrayerListForm.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/SavedEntriesList.tsx | transition-all | Low | CSS safety net covers |
| components/daily/ShareButton.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/VerseOfTheDayBanner.tsx | transition-colors | Low | CSS safety net covers |
| components/daily/VersePromptCard.tsx | transition-all | Low | CSS safety net covers |
| components/dashboard/AnniversaryCard.tsx | transition-colors | Low | CSS safety net covers |
| components/dashboard/EveningReflectionBanner.tsx | transition-all | Low | CSS safety net covers |
| components/dashboard/GardenShareButton.tsx | transition-colors | Low | CSS safety net covers |
| components/dashboard/GratitudeWidget.tsx | transition-colors | Low | CSS safety net covers |
| components/dashboard/InstallCard.tsx | transition-colors | Low | CSS safety net covers |
| components/dashboard/PrayerListWidget.tsx | transition-colors | Low | CSS safety net covers |
| components/dashboard/ReadingPlanWidget.tsx | transition-all (progress bar) | Low | CSS safety net covers |
| components/dashboard/RecentHighlightsWidget.tsx | transition-colors | Low | CSS safety net covers |
| components/dashboard/VerseOfTheDayCard.tsx | transition-colors | Low | CSS safety net covers |
| components/dashboard/WeeklyRecap.tsx | transition-colors | Low | CSS safety net covers |
| components/dev/DevAuthToggle.tsx | transition-colors | Low | CSS safety net covers |
| components/devotional/RelatedPlanCallout.tsx | transition-all | Low | CSS safety net covers |
| components/friends/FriendMenu.tsx | transition-colors | Low | CSS safety net covers |
| components/friends/FriendRow.tsx | transition-colors | Low | CSS safety net covers |
| components/friends/FriendSearch.tsx | transition-colors | Low | CSS safety net covers |
| components/friends/InviteSection.tsx | transition-colors | Low | CSS safety net covers |
| components/friends/SuggestionsSection.tsx | transition-colors | Low | CSS safety net covers |
| components/homepage/DashboardPreview.tsx | transition-all | Low | CSS safety net covers |
| components/insights/EmailPreviewModal.tsx | transition-colors | Low | CSS safety net covers |
| components/insights/MonthlySuggestions.tsx | transition-colors | Low | CSS safety net covers |
| components/insights/PrayerLifeSection.tsx | transition-colors | Low | CSS safety net covers |
| components/leaderboard/BoardSelector.tsx | transition-colors | Low | CSS safety net covers |
| components/leaderboard/GlobalRow.tsx | transition-colors | Low | CSS safety net covers |
| components/leaderboard/TimeToggle.tsx | transition-colors | Low | CSS safety net covers |
| components/local-support/ListingCTAs.tsx | transition-colors | Low | CSS safety net covers |
| components/local-support/ListingShareDropdown.tsx | transition-colors | Low | CSS safety net covers |
| components/local-support/LocalSupportPage.tsx | transition-colors | Low | CSS safety net covers |
| components/local-support/ResultsList.tsx | transition-colors | Low | CSS safety net covers |
| components/local-support/SearchControls.tsx | transition-colors | Low | CSS safety net covers |
| components/local-support/SearchStates.tsx | transition-colors | Low | CSS safety net covers |
| components/music/ContentPicker.tsx | transition-colors | Low | CSS safety net covers |
| components/music/DeleteMixDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/music/DeleteRoutineDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/music/MixActionsMenu.tsx | transition-colors | Low | CSS safety net covers |
| components/music/RoutineBuilder.tsx | transition-colors | Low | CSS safety net covers |
| components/music/RoutineCard.tsx | transition-colors | Low | CSS safety net covers |
| components/music/RoutineStepCard.tsx | transition-colors | Low | CSS safety net covers |
| components/music/SavedMixCard.tsx | transition-colors | Low | CSS safety net covers |
| components/music/SharedMixHero.tsx | transition-all | Low | CSS safety net covers |
| components/my-prayers/DeletePrayerDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/EditPrayerForm.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/MarkAnsweredForm.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/PrayerCardActions.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/PrayerCardOverflowMenu.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/PrayerItemCard.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/PrayerListActionBar.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/PrayerListEmptyState.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/ReminderToggle.tsx | transition-colors | Low | CSS safety net covers |
| components/my-prayers/TestimonyShareActions.tsx | transition-all | Low | CSS safety net covers |
| components/prayer-wall/CategoryBadge.tsx | transition-colors | Low | CSS safety net covers |
| components/prayer-wall/CommentInput.tsx | transition-colors | Low | CSS safety net covers |
| components/prayer-wall/DeletePrayerDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/prayer-wall/InteractionBar.tsx | transition-colors | Low | CSS safety net covers |
| components/prayer-wall/PrayerCard.tsx | transition-all | Low | CSS safety net covers |
| components/prayer-wall/QuestionOfTheDay.tsx | transition-colors | Low | CSS safety net covers |
| components/prayer-wall/ShareDropdown.tsx | transition-colors | Low | CSS safety net covers |
| components/profile/ProfileHeader.tsx | transition-colors | Low | CSS safety net covers |
| components/pwa/InstallPrompt.tsx | transition-colors | Low | CSS safety net covers |
| components/pwa/UpdatePrompt.tsx | transition-colors | Low | CSS safety net covers |
| components/reading-plans/CreatePlanFlow.tsx | transition-colors | Low | CSS safety net covers |
| components/reading-plans/DaySelector.tsx | transition-colors | Low | CSS safety net covers |
| components/reading-plans/FilterBar.tsx | transition-colors | Low | CSS safety net covers |
| components/reading-plans/PlanCard.tsx | transition-all | Low | CSS safety net covers |
| components/reading-plans/PlanNotFound.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/AccountSection.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/AppSection.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/DashboardSection.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/DeleteAccountModal.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/NotificationsSection.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/PrivacySection.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/ProfileSection.tsx | transition-colors | Low | CSS safety net covers |
| components/settings/RadioPillGroup.tsx | transition-colors | Low | CSS safety net covers |
| components/shared/AvatarPickerModal.tsx | transition-opacity | Low | CSS safety net covers |
| components/shared/LinkedAnswerText.tsx | transition-colors | Low | CSS safety net covers |
| components/shared/VerseLink.tsx | transition-colors | Low | CSS safety net covers |
| components/sharing/ShareImageButton.tsx | transition-colors | Low | CSS safety net covers |
| components/sharing/SharePanel.tsx | transition-colors | Low | CSS safety net covers |
| components/social/EncourageButton.tsx | transition-colors | Low | CSS safety net covers |
| components/social/EncouragePopover.tsx | transition-colors | Low | CSS safety net covers |
| components/social/NudgeButton.tsx | transition-colors | Low | CSS safety net covers |
| components/social/NudgeDialog.tsx | transition-colors | Low | CSS safety net covers |
| components/ui/Button.tsx | transition-colors | Low | CSS safety net covers |
| components/ui/FeatureEmptyState.tsx | transition-colors | Low | CSS safety net covers |

### Inline style transitions without explicit motion guard

| File | Transition Property | Risk Level | Notes |
|------|-------------------|------------|-------|
| components/audio/TimerProgressRing.tsx:43 | `stroke-dashoffset 1s linear` | Medium | No prefersReduced check; 1s linear animation on SVG ring |
| components/daily/KaraokeTextReveal.tsx:113 | `opacity/transform 200ms ease-out` | Medium | Word-by-word reveal, no prefersReduced guard on inline style |
| components/reading-plans/DayCompletionCelebration.tsx:48 | `opacity/transform 300ms ease-out` | Low | Celebration overlay |
| components/reading-plans/PlanCompletionOverlay.tsx:122 | `opacity/transform ${durationMs}ms ease-out` | Low | Celebration, but has guard elsewhere in component |
| components/my-prayers/PrayerAnsweredCelebration.tsx:108 | `opacity/transform ${durationMs}ms ease-out` | Low | Celebration, has guard elsewhere |
| components/StartingPointQuiz.tsx:99 | `width 300ms ease` | Low | Progress bar |
| pages/BibleReader.tsx:685 | `transform 200ms ease-out` | Low | Chapter swipe return animation |
| pages/RegisterPage.tsx:134,176 | transitionDelay staggering | Low | CSS safety net covers the transition itself |

### Inline animationDelay/animationDuration without explicit motion guard

| File | Property | Risk Level | Notes |
|------|----------|------------|-------|
| components/ui/Toast.tsx:78 | animationDelay per confetti particle | Low | Decorative confetti |
| components/reading-plans/PlanCompletionOverlay.tsx:41 | animationDelay per confetti | Low | Decorative |
| components/leaderboard/GlobalLeaderboard.tsx:127 | animationDelay + animationDuration: 300ms | Medium | Row stagger, no reduced-motion guard |
| components/leaderboard/LeaderboardRow.tsx:60 | animationDelay + animationDuration: 300ms | Medium | Row stagger, parent has motion-safe: but inline style always applies |
| components/my-prayers/PrayerAnsweredCelebration.tsx:40 | animationDelay per confetti | Low | Decorative |
| components/dashboard/DashboardWidgetGrid.tsx:104 | animationDelay per widget | Low | CSS safety net covers |
| components/dashboard/GrowthGarden.tsx:196 | animationDelay on garden elements | Low | Other garden elements guarded |
| components/dashboard/GettingStartedCelebration.tsx:33 | animationDelay per confetti | Low | Decorative |
| components/dashboard/CelebrationOverlay.tsx:43 | animationDelay per confetti | Low | Decorative |
| components/social/MilestoneFeed.tsx:59 | animationDelay + animationDuration: 300ms | Medium | Feed stagger, no reduced-motion guard |
| hooks/useStaggeredEntrance.ts:39 | animationDelay per item | Low | CSS safety net covers |
| pages/AskPage.tsx:360,364 | animationDelay on loading dots | Low | Decorative loading indicator |
| pages/MonthlyReport.tsx:39 | animationDelay per section | Low | CSS safety net covers |
| pages/Insights.tsx:143 | animationDelay per tab | Low | CSS safety net covers |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Files with duration-100 | 3 (source, excl. tests) |
| Files with duration-150 | 17 (source) |
| Files with duration-200 | 44 occurrences across ~35 files |
| Files with duration-300 | 38 occurrences across ~30 files |
| Files with duration-500 | 16 occurrences across ~12 files |
| Files with duration-700 | 1 file |
| Custom duration-[...] | 6 occurrences across 4 files |
| Tailwind ease-out in className | 12 files |
| Tailwind ease-in-out in className | 11 files |
| Tailwind ease-in in className | 0 files |
| Inline style transitions | 27 files |
| Inline style animation delays | 14+ files |
| Files with transitions but no motion guard | ~130 files (most are low-risk `transition-colors` covered by CSS safety net) |
| Files with medium-risk missing guards | ~6 files (see table above) |

### Token Migration Scope

To migrate all Tailwind duration classes to design tokens:
- **duration-100** (3 files) -> duration-fast
- **duration-150** (17 files) -> duration-fast (already matches)
- **duration-200** (~35 files) -> duration-base
- **duration-300** (~30 files) -> duration-base or duration-slow (context-dependent)
- **duration-500** (~12 files) -> duration-slow
- **duration-700** (1 file) -> duration-slow

To migrate all Tailwind easing classes to design tokens:
- **ease-out** (12 files) -> ease-decelerate
- **ease-in-out** (11 files) -> ease-standard

Inline style transitions (27 files) will need case-by-case migration since they use raw CSS strings with dynamic values. Many already use the correct easing curves.
