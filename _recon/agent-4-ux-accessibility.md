# Agent 4: UX & Accessibility Audit

## 1. Accessibility -- Form Components

The codebase has a well-built `FormField` component (`frontend/src/components/ui/FormField.tsx`) that properly injects `aria-invalid`, `aria-describedby`, character counts, error messages, and required indicators. However, it is **not used by any production component** -- only by its own test file. Every form in the app hand-rolls its own accessibility attributes, leading to inconsistent coverage.

### Form Accessibility Gap Table

| Component | Gap | File | Line(s) |
|---|---|---|---|
| AuthModal (register) -- First name | No `aria-invalid`, no `aria-describedby`, no inline error | `components/prayer-wall/AuthModal.tsx` | 209-214 |
| AuthModal (register) -- Last name | No `aria-invalid`, no `aria-describedby`, no inline error | `components/prayer-wall/AuthModal.tsx` | 217-225 |
| AuthModal (register) -- Confirm password | No `aria-invalid`, no `aria-describedby`, no inline error, no validation | `components/prayer-wall/AuthModal.tsx` | 282-290 |
| AuthModal -- Reset email | No `aria-invalid`, no inline error feedback | `components/prayer-wall/AuthModal.tsx` | 174-180 |
| InlineComposer -- textarea | Missing `aria-invalid` when content exceeds max | `components/prayer-wall/InlineComposer.tsx` | 105-115 |
| ReportDialog -- textarea | No character count, no max length enforcement | `components/prayer-wall/ReportDialog.tsx` | 111-119 |
| RoutineBuilder -- name input | No label element, no `aria-label`, no validation, no character count | `components/music/RoutineBuilder.tsx` | 34 |
| BibleSearchMode -- search input | No `aria-describedby` for search results status | `components/bible/BibleSearchMode.tsx` | 50-52 |
| SearchControls (Local Support) -- location input | No `aria-label`, no `aria-describedby` for geo-message feedback | `components/local-support/SearchControls.tsx` | ~28+ |
| VerseCardActions -- inline note textarea | No `aria-invalid` | `components/ask/VerseCardActions.tsx` | 120 |
| SleepTimerPanel -- custom minutes input | No `aria-label`, no validation error display | `components/bible/SleepTimerPanel.tsx` | 246-247 |
| WelcomeWizard -- display name input | Incomplete: error shown only after blur + Next, no `aria-describedby` linking | `components/dashboard/WelcomeWizard.tsx` | ~55 |
| GratitudeWidget -- three inputs | No validation feedback for empty save, no `aria-describedby` | `components/dashboard/GratitudeWidget.tsx` | 152-160 |
| EveningReflection -- highlight textarea | No `aria-invalid`, no inline error for empty submit | `components/dashboard/EveningReflection.tsx` | ~72 |
| EveningReflection -- gratitude inputs | Same pattern as GratitudeWidget: no error feedback | `components/dashboard/EveningReflection.tsx` | ~73 |
| QotdComposer -- textarea | Missing character count (based on usage pattern) | `components/prayer-wall/QotdComposer.tsx` | -- |
| PrayerComposer -- category fieldset | Missing `aria-invalid` and `aria-describedby` on the fieldset for category error | `components/my-prayers/PrayerComposer.tsx` | 119 |

**Systemic issue**: The `FormField` component exists but zero production components use it. Either migrate forms to use `FormField`, or document that hand-rolled attributes are the accepted pattern and audit each instance.

---

## 2. Accessibility -- aria-live Regions & Screen Reader Announcements

Dynamic content that updates without page reload requires `aria-live` to be announced. Audit findings:

### Well-Covered
- **Toast system** (`components/ui/Toast.tsx`): Uses `role="alert"` / `role="status"` with `aria-live` -- correct.
- **Crisis banners**: Use `role="alert"` with `aria-live="assertive"` -- correct and safety-critical.
- **CharacterCount**: Uses `aria-live="polite"` with zone-change announcements -- excellent.
- **MoodCheckIn verse display**: Uses `aria-live="polite"` -- correct.
- **JournalInput draft saved**: Uses `aria-live="polite"` -- correct.
- **ProfileSection "Saved" indicator**: Uses `aria-live="polite"` -- correct.
- **NotificationPanel, StreakCard**: Use `aria-live="polite"` -- correct.

### Missing aria-live
| Dynamic Content | File | Issue |
|---|---|---|
| Prayer Wall feed updates (new prayers, praying count increment) | `pages/PrayerWall.tsx` | No live region when "Praying for you" count increments or new prayers load |
| Ask page -- AI response appearing | `pages/AskPage.tsx` | No `aria-live` on the response container; screen readers may not announce the new AI answer |
| Prayer generation result | `components/daily/PrayerResponse.tsx` | The generated prayer appears via KaraokeText but the container lacks `aria-live`; the full text is only announced word-by-word through visual animation |
| Reading plan day completion celebration | `components/reading-plans/DayCompletionCelebration.tsx` | Visual celebration but no screen reader announcement |
| Challenge day completion | `pages/ChallengeDetail.tsx` | Completion result is visual only |
| Bible search results | `components/bible/BibleSearchMode.tsx` | No results count announcement |
| Friend search results count | `components/friends/FriendSearch.tsx` | Results appear visually but no "N results found" announcement |
| Badge earned -- celebration toasts | `components/ui/Toast.tsx` | Celebration toasts use `role="status"` which is correct, but the `aria-live="polite"` may not fire when multiple toasts queue rapidly |
| SceneUndoToast | `components/audio/SceneUndoToast.tsx` | Has `aria-live` -- covered |

---

## 3. Contrast Concerns -- WCAG AA

The primary theme is dark with light text. The Tailwind config defines these relevant pairings:

### Likely Failing Pairings

| Text Class | Background | Estimated Ratio | Verdict |
|---|---|---|---|
| `text-white/30` on `hero-dark` (#0D0620) | Dark purple | ~1.8:1 | **FAIL** (body text needs 4.5:1) |
| `text-white/40` on `hero-dark` / `hero-mid` | Dark purple | ~2.5:1 | **FAIL** for body text |
| `text-white/50` on `hero-mid` (#1E0B3E) | Dark purple | ~3.2:1 | **FAIL** for body (passes large text only) |
| `placeholder:text-white/30` | Input bg `bg-white/5` on dark | ~1.7:1 | **FAIL** -- placeholder text is unreadable |
| `placeholder:text-white/40` | Input bg `bg-white/[0.06]` on dark | ~2.4:1 | **FAIL** |
| `text-white/20` for locked badges, icons | Dark backgrounds | ~1.3:1 | **FAIL** (decorative icons are OK, but text labels at /20 are not) |
| `text-text-light` (#7F8C8D) on white (#FFFFFF) | White/light bg | ~3.5:1 | **FAIL** for body, passes for large text |
| `text-subtle-gray` (#6B7280) on dark | Dark backgrounds | Variable | May fail depending on exact bg |
| Help text `text-xs text-white/40` | Dashboard cards `bg-white/5` | ~2.3:1 | **FAIL** |

**Prevalence**: `text-white/30` and `text-white/40` appear in 271 occurrences across 133 files. `placeholder:text-white/40` is used in 28 files. This is systemic.

**Note on placeholder text**: WCAG 2.1 does not exempt placeholder text from contrast requirements. Since this app uses placeholders extensively for emotional prompts ("What's on your heart?"), low-contrast placeholders directly harm usability.

### Recommendation
Increase minimum text opacity to `text-white/60` (approx 4.6:1 on `#0D0620`) for all readable text. Use `text-white/50` only for large text (18px+ or 14px bold). Reserve `/30` and `/20` only for purely decorative elements.

---

## 4. Keyboard Navigation

### Focus Traps -- Well Implemented
The `useFocusTrap` hook (`hooks/useFocusTrap.ts`) is used in 37 modal/dialog components. It correctly:
- Traps Tab within the container
- Re-queries focusable elements on each keypress (handles dynamic content)
- Supports Escape to close
- Restores focus to previously focused element on unmount

### Focus Restore After Modal Close
The `useFocusTrap` hook stores `previouslyFocused` and calls `.focus()` on cleanup. This is correct. Verified in: `UnsavedChangesModal`, `ReportDialog`, `DeleteAccountModal`, `AuthModal`, `AvatarPickerModal`, `DeleteMixDialog`, `AudioDrawer`, `NotificationPanel`.

### Keyboard Gaps

| Component | Issue | File |
|---|---|---|
| Category pill selectors (PrayerComposer, InlineComposer, EditPrayerForm) | Uses `aria-pressed` buttons but no roving tabindex -- all pills are individually tabbable, which is chatty for 8+ categories. Should use a radiogroup or arrow-key navigation. | Multiple files |
| MoodCheckIn orbs | Correctly uses `role="radiogroup"` with roving tabindex and arrow key support -- exemplary. | `components/dashboard/MoodCheckIn.tsx` |
| Horizontal scroll category bars on mobile | `overflow-x-auto` category pills cannot be reached via keyboard if off-screen right. No keyboard scroll mechanism. | `components/prayer-wall/InlineComposer.tsx:142`, `components/my-prayers/PrayerComposer.tsx:121` |
| Prayer Wall "Praying for you" button | After click, the animated icon pulse plays but focus stays in place -- acceptable. | `components/prayer-wall/InteractionBar.tsx` |
| AudioDrawer swipe-to-close | Mobile only; keyboard close via Escape works. No gap. | `components/audio/AudioDrawer.tsx` |
| ComingSoon pages (Login/Register) | No focus management on mount; page is minimal so impact is low. | `App.tsx:75-91` |

---

## 5. Empty States

### Covered Empty States
The `FeatureEmptyState` component is used in 10 locations. Additionally, many dashboard widgets have dedicated empty states (mood chart ghosted example, streak "Day 1" message, badges locked silhouettes, friends invite CTA). These were specified in the dashboard-growth spec and are implemented.

### Missing Empty States

| Feature | What Happens When Empty | File | Fix |
|---|---|---|---|
| Ask page -- no conversation yet | Shows input area with chips -- **acceptable** as an initial state, not a true empty state. | `pages/AskPage.tsx` | N/A |
| Bible Reader -- Highlights & Notes feed | FeatureEmptyState used on Bible Browser -- covered. | `pages/BibleBrowser.tsx` | N/A |
| Evening Reflection -- no activities today | Step 2 shows "You haven't logged any activities yet" text but no warm illustration or CTA | `components/dashboard/EveningReflection.tsx` | Add encouraging illustration and "Start your first activity" link |
| Prayer Wall Dashboard -- My Posts tab when empty | No specific empty state if user has zero posts | `pages/PrayerWallDashboard.tsx` | Add "Share your first prayer request" empty state |
| Reading Plan Detail -- not started state | Shows Day 1 content -- acceptable, acts as the call to begin. | `pages/ReadingPlanDetail.tsx` | N/A |
| Meditation sub-pages -- no completion history | No empty state shown; users just do the meditation. Acceptable for this flow. | Meditation pages | N/A |

---

## 6. Loading States

### Skeleton System
14 skeleton components exist in `components/skeletons/`. Page-level comments in every major page reference which skeleton to use (e.g., `// Loading state: use DashboardSkeleton`). However:

**Critical gap**: The `Suspense` boundary in `App.tsx:149` uses a single generic `RouteLoadingFallback` (pulsing "Worship Room" text) for ALL lazy-loaded routes. The per-page skeletons are **defined but never wired to Suspense**. Users see the generic logo pulse instead of content-shaped skeletons during code-split chunk loading.

| Page | Skeleton Exists | Wired to Suspense? |
|---|---|---|
| Dashboard | `DashboardSkeleton.tsx` | No -- generic fallback |
| DailyHub | `DailyHubSkeleton.tsx` | No -- generic fallback |
| PrayerWall | `PrayerWallSkeleton.tsx` | No -- generic fallback |
| Friends | `FriendsSkeleton.tsx` | No -- generic fallback |
| Settings | `SettingsSkeleton.tsx` | No -- generic fallback |
| Insights | `InsightsSkeleton.tsx` | No -- generic fallback |
| MyPrayers | `MyPrayersSkeleton.tsx` | No -- generic fallback |
| MusicPage | `MusicSkeleton.tsx` | No -- generic fallback |
| GrowPage | `GrowPageSkeleton.tsx` | No -- generic fallback |
| BibleBrowser | `BibleBrowserSkeleton.tsx` | No -- generic fallback |
| BibleReader | `BibleReaderSkeleton.tsx` | **Yes** -- used inline for chapter loading |
| GrowthProfile | `ProfileSkeleton.tsx` | No -- generic fallback |

**Fix**: Wrap each lazy route in its own `Suspense` with the corresponding skeleton as fallback:
```tsx
<Route path="/daily" element={
  <Suspense fallback={<DailyHubSkeleton />}>
    <DailyHub />
  </Suspense>
} />
```

### In-page Loading States
- **Ask page**: Shows a pulsing loading indicator during mock AI response -- covered.
- **Prayer generation**: Shows loading state with disabled button -- covered.
- **Local Support search**: Shows `Loader2` spinner -- covered.
- **Bible chapter loading**: Uses `BibleReaderSkeleton` -- the **only** skeleton actually in use.

---

## 7. Interaction Feedback

### Well-Handled Feedback
- Copy to clipboard: Toast "Prayer copied to clipboard" / "Conversation copied to clipboard"
- Journal save: Toast success + entries list update
- Mood check-in: Sound effect chime + verse display transition
- Badge earned: Celebration toast with confetti
- Streak update: Animated counter
- Delete actions: Confirmation dialog before proceeding
- Friend request: Toast feedback

### Silent or Unclear Feedback

| Action | Issue | File |
|---|---|---|
| Prayer "Save" button | Shows toast "Save feature coming soon" -- acceptable as stub, but misleading. Button should be hidden or show a tooltip. | `components/daily/PrayerResponse.tsx:130` |
| Auth modal form submit | Shows toast "Authentication coming soon" then closes modal -- no error state, no loading state during submit | `components/prayer-wall/AuthModal.tsx:101` |
| Password reset submit | Shows toast "Password reset coming soon" -- same issue | `components/prayer-wall/AuthModal.tsx:110` |
| Email/Password change in Settings | Shows toast "Email change coming soon" / "Password change coming soon" -- buttons suggest real functionality | `components/settings/AccountSection.tsx:53,64` |
| Report submission | Shows "Report submitted. Thank you." inline for 1.5s then auto-closes -- no way to know if it really submitted. Acceptable for stub. | `components/prayer-wall/ReportDialog.tsx:97` |
| Bookmark prayer | Auth-gated, but no feedback after successful bookmark (will be backend-wired in Phase 3) | Prayer Wall |
| Share button clipboard fallback | Covered with toast -- good. | `components/daily/ShareButton.tsx` |
| Monthly report share | Toast "Sharing is coming soon!" -- acceptable as stub. | `components/insights/MonthlyShareButton.tsx` |

---

## 8. Mobile & Responsive Issues

### Touch Targets
The full-site-audit commit addressed 44px touch targets broadly. `min-h-[44px]` appears consistently on buttons, links, and interactive elements. A few remaining concerns:

| Element | Issue | File |
|---|---|---|
| Report button on mobile | Uses `sm:min-h-0 sm:px-0` which removes min-height on small screens (inverted breakpoint logic) | `components/prayer-wall/ReportDialog.tsx:76` |
| NoteEditor Delete/Cancel buttons | Text-only buttons ("Delete", "Cancel") with no explicit min-height | `components/bible/NoteEditor.tsx:98-102` |
| Footer crisis links | Noted as pre-existing known issue in design system docs | `components/SiteFooter.tsx` |
| App Store / Play Store badges | `h-[40px]` -- 4px under 44px minimum | `components/SiteFooter.tsx:32,50` |

### Responsive Fragility

| Pattern | Issue | File(s) |
|---|---|---|
| Category pill horizontal scroll | `flex-nowrap overflow-x-auto` with `lg:flex-wrap` -- on mid-width tablets (768-1023px) pills are still in scroll mode but there's no scroll indicator | `InlineComposer.tsx:142`, `PrayerComposer.tsx:121` |
| GrowthTeasersSection blurred cards | Uses `overflow-hidden` on cards with absolute positioned elements -- clipping may hide content at certain widths | `components/GrowthTeasersSection.tsx` |
| Two-column dashboard grid | Uses `60%/40%` split -- responsive classes appear correct (`grid-cols-1 lg:grid-cols-[3fr_2fr]`) | `DashboardWidgetGrid.tsx` |
| Notification panel | Mobile: `max-h-[400px]` fixed height may truncate on very small screens (320px height in landscape) | `components/dashboard/NotificationPanel.tsx:60` |
| StartingPointQuiz | `max-w-[340px]` on quiz options may cause text truncation on very narrow viewports with large system font | `components/StartingPointQuiz.tsx` |

---

## 9. Decision Fatigue

### Landing Page (logged out)
Visible without scroll: Hero input + "Take a 30-second quiz" link. Two competing CTAs (type to pray vs. take quiz) plus nav bar with 5 top-level links. **Acceptable** -- clear primary action (type), secondary (quiz).

### Daily Hub
4 tabs (Devotional, Pray, Journal, Meditate) plus the hero section, plus "Enhance with Sound" pill, plus quiz teaser. When a tab is active, the tab content itself has a clear single CTA (Generate Prayer, Save Entry, etc.). **Acceptable** -- tabs reduce visible options to one at a time.

### Dashboard (logged in)
The widget grid is dense. Default widget order shows up to 14 widgets:
1. Getting Started card (new users)
2. Evening Reflection banner (after 6 PM)
3. Weekly Recap
4. Mood Chart
5. Activity Checklist
6. Quick Actions (4 buttons)
7. Streak & Faith Points
8. Verse of the Day
9. Today's Devotional
10. Prayer List
11. Reading Plan
12. Gratitude
13. Challenge
14. Recent Highlights
15. Friends Preview

**Concern**: 14+ widgets visible in a single scroll creates significant cognitive load. The new customization panel helps, but the default experience is overwhelming. Quick Actions alone presents 4 equal-weight CTAs without hierarchy.

**Recommendation**: Consider collapsing lower-priority widgets by default for new users, or implementing a "focus mode" that shows only the top 5-6 widgets initially with "Show more" expansion.

---

## 10. Stubs & Incomplete Features

| Feature | Location | Current State | Fix Description |
|---|---|---|---|
| Login page | `App.tsx:198` | `ComingSoon` stub -- "Coming Soon" text only | Phase 3 scope. No action now, but the route is live and reachable. |
| Register page | `App.tsx:199` | Same `ComingSoon` stub | Phase 3 scope. |
| Auth modal form | `components/prayer-wall/AuthModal.tsx:101` | Submit shows toast "Authentication coming soon" -- form validates but does nothing | Phase 3. Consider disabling submit button or adding "Preview mode" label. |
| Password reset | `components/prayer-wall/AuthModal.tsx:110` | Toast "Password reset coming soon" | Phase 3. |
| Email change | `components/settings/AccountSection.tsx:53` | Toast "Email change coming soon" | Phase 3. |
| Password change | `components/settings/AccountSection.tsx:64` | Toast "Password change coming soon" | Phase 3. |
| Prayer save button | `components/daily/PrayerResponse.tsx:130` | Bookmark icon shows toast "Save feature coming soon" | Either remove the button or clearly mark as upcoming. |
| Monthly report sharing | `components/insights/MonthlyShareButton.tsx:11` | Toast about sharing coming soon | Phase 3. |
| Prayer Wall Dashboard photo change | `pages/PrayerWallDashboard.tsx:189-191` | Button says "Change Photo (coming soon)" | Phase 3. |
| Prayer Wall Dashboard notifications | `pages/PrayerWallDashboard.tsx:471` | "Notifications coming soon" | Phase 3. |
| Notification push toggles | `components/settings/NotificationsSection.tsx:72,92,99` | Push, weekly summary, monthly recap marked "coming soon" | Phase 3. |
| Activity Correlations data | `components/insights/ActivityCorrelations.tsx:134` | "Based on example data. Real correlations coming soon." | Phase 3. |
| Scripture Connections | `components/insights/ScriptureConnections.tsx:60` | Same mock data disclaimer | Phase 3. |
| Bible chapter placeholder | `components/bible/ChapterPlaceholder.tsx:12` | "Full text coming soon" with BibleGateway link | Acceptable fallback for books not yet in JSON. |
| Spotify "Continue with" button | `components/prayer-wall/AuthModal.tsx:317-327` | Disabled button -- grayed out but present | Consider removing entirely to avoid confusion, or add explanatory tooltip. |
| App Store badges in footer | `components/SiteFooter.tsx:30-63` | Badges are `cursor-default` spans (not links) | Acceptable -- labeled as "Coming Soon" in UI. |

---

## 11. Summary of Priority Fixes

### P0 -- Accessibility Blockers
1. **Skeleton fallbacks not wired to Suspense**: 13 skeleton components exist but only 1 is used. All lazy routes show generic logo pulse instead of content skeletons. Fix: per-route `Suspense` wrappers.
2. **Contrast failures on `text-white/30` and `text-white/40`**: 271 occurrences across 133 files. Body text at these opacities fails WCAG AA on all dark backgrounds. Placeholder text at `/30` and `/40` also fails. Minimum readable opacity should be `/60`.
3. **Missing `aria-live` on AI response containers**: Ask page responses and generated prayers appear without screen reader announcements.

### P1 -- Significant Gaps
4. **AuthModal register form fields lack validation**: First name, last name, and confirm password have no `aria-invalid`, no inline errors, no validation beyond HTML `required`.
5. **FormField component unused**: Well-built but zero production consumers. Either migrate or remove.
6. **Category pill selectors lack keyboard efficiency**: 8+ individually-tabbable pills per form. Consider roving tabindex.
7. **Report dialog textarea lacks character count and max length**: Unlimited text input with no feedback.

### P2 -- Polish
8. **Dashboard widget count**: 14+ widgets creates cognitive load. Default collapsed state for lower-priority widgets would help new users.
9. **"Coming soon" stubs mislead users**: Auth form submit, prayer save, email/password change all appear functional but show "coming soon" toasts. Consider disabling or labeling more clearly.
10. **Footer app badges undersized**: 40px height vs 44px minimum.
11. **Report button inverted breakpoint**: `sm:min-h-0` removes touch target on small screens (should be the opposite).
