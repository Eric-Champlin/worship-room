# Implementation Plan: Toast & Copy Warmth Pass

**Spec:** `_specs/toast-copy-warmth-pass.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/toast-copy-warmth-pass`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — stale, captured 2026-03-06, before Round 3 changes)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files and Patterns

**Toast system** — `frontend/src/components/ui/Toast.tsx`:
- `ToastProvider` wraps app, provides `useToast()` hook
- `showToast(message: string, type?: StandardToastType, action?: ToastAction)` — standard toast
- `showCelebrationToast(...)` — badge/level-up celebration toasts (excluded from this pass)
- Toast types: `success | error | warning` (standard), `celebration | celebration-confetti | special-celebration` (celebration)
- Standard toasts auto-dismiss at 6000ms, max 3 visible

**WhisperToast system** — `frontend/src/components/ui/WhisperToast.tsx`:
- Separate toast system for surprise/delight moments (scripture echoes, gratitude callbacks)
- Not part of this pass — these are already warm and purpose-built

**FeatureEmptyState component** — `frontend/src/components/ui/FeatureEmptyState.tsx`:
- Accepts `icon`, `heading`, `description`, optional `ctaLabel`/`ctaHref`/`onCtaClick`, `compact`, `className`
- Used in 9 locations across the app

**Toast consumers** — 49+ files call `showToast()`. The toast message string is always the first argument.

**Confirmation dialogs** — 5 dialog components with user-facing copy:
- `components/prayer-wall/DeletePrayerDialog.tsx` — "Delete Prayer Request" / "Are you sure..."
- `components/my-prayers/DeletePrayerDialog.tsx` — "Remove this prayer?" / "This cannot be undone."
- `components/settings/DeleteAccountModal.tsx` — "Delete Your Account?"
- `components/prayer-wall/ReportDialog.tsx` — "Report Prayer Request" / success: "Report submitted. Thank you."
- `components/ui/UnsavedChangesModal.tsx` — "Unsaved Changes"

**AuthModal** — `components/prayer-wall/AuthModal.tsx`:
- Lines 101, 110: "Authentication coming soon", "Password reset coming soon"

**PrayerListEmptyState** — `components/my-prayers/PrayerListEmptyState.tsx`:
- Standalone component (not using FeatureEmptyState), has heading "Your prayer list is empty" and description "Start tracking what's on your heart"

### Test Patterns

- Tests use Vitest + React Testing Library
- Toast tests wrap with `<ToastProvider>` (see `components/ui/__tests__/Toast.test.tsx`)
- Many test files assert on specific toast message strings (e.g., `expect(screen.getByText('Entry saved'))`)
- **Critical**: When toast message strings change, ALL tests asserting on those strings MUST be updated
- Tests that use `AuthModalProvider` + `ToastProvider` wrapping are common across page tests

### Directory Conventions

- Components: `frontend/src/components/{feature}/`
- Pages: `frontend/src/pages/`
- Tests: co-located `__tests__/` directories
- Hooks: `frontend/src/hooks/`

---

## Auth Gating Checklist

N/A — This feature changes only string content in existing toast/empty-state calls. No new interactive elements or auth-gated actions are introduced.

---

## Design System Values (for UI steps)

N/A — This feature changes only string content, not visual styling. No CSS or component structure changes.

---

## Design System Reminder

N/A — No UI/visual changes in this feature. Copy-only pass.

---

## Shared Data Models (from Master Plan)

N/A — No data model changes. No new localStorage keys.

---

## Responsive Structure

N/A — String content changes only. Toast container is already responsive (top-right on desktop, same position on mobile). Longer strings should be spot-checked at 375px to confirm they don't overflow — but this is a verification concern, not a layout change.

---

## Vertical Rhythm

N/A — No layout changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/toast-copy-warmth-pass` exists and is checked out
- [ ] All tests currently pass (`pnpm test`)
- [ ] No other branches have modified toast strings since spec was written (run `git log --oneline main..HEAD` to confirm clean state)
- [ ] Crisis-related strings (crisis banner, crisis resources) will NOT be touched — these are safety-critical
- [ ] Celebration overlay strings (badge, level-up via CelebrationOverlay.tsx and CelebrationQueue.tsx) will NOT be touched — they are already purpose-built
- [ ] WhisperToast content will NOT be touched — it's a separate system with its own warm copy

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dynamic toast messages (template literals with variables) | Keep the variable portion, warm the static text around it | e.g., `Prayer updated` → `Prayer updated` is already warm enough; `Unblocked ${name}` → `${name} has been unblocked` |
| Toast messages in hooks (useSleepTimer, useRoutinePlayer, etc.) | Warm only user-facing functional messages; leave technical/system messages | Timer/audio messages are functional, not emotional moments |
| "Comment posted." appears in 4 files | Use same warm replacement everywhere for consistency | Keeps community interaction tone uniform |
| Error messages in hooks (useSavedMixes, useSoundToggle) | Warm the user-facing ones, keep technical details | Storage errors need to be helpful, not just warm |
| Spec says "5-15 words maximum" but some messages need context | Respect the spirit (brevity) while allowing up to ~20 words for messages that need a helpful redirect | e.g., "Saving prayers is coming soon. For now, try copying it." is 10 words |
| FeatureEmptyState instances already warm | Leave alone per spec: "Action-oriented descriptions ('Add your first...') are fine — keep them" | Only rewrite clinical/passive ones |
| `PrayerListEmptyState` is a standalone component, not `FeatureEmptyState` | Rewrite its strings directly as spec requires | It has its own heading/description props |
| ReportDialog success message | Change from "Report submitted. Thank you." to "Report submitted. Thank you for keeping this community safe." | Spec says: "Should feel safe: 'Help us keep this community safe.'" |
| DeleteAccountModal | Spec says consider adding "We'll miss you." if not manipulative | Add subtle closing line — it's honest, not manipulative, for a free spiritual app |
| `pages/PrayerWallProfile.tsx` "No comments yet." | Spec requires: "No comments yet. Be the first to encourage." | But this is on the profile page — "Be the first to encourage" works here too |

---

## Implementation Steps

### Step 1: Toast Rewrites — Master Table (Daily & Prayer Features)

**Objective:** Rewrite all toast messages from the spec's master rewrite table in the Daily Hub, Prayer, and Journal features.

**Files to modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — "Entry saved" → "Your words are safe. Well done today."
- `frontend/src/components/daily/PrayerResponse.tsx` — "Prayer copied to clipboard" → "Prayer copied — share it with someone who needs it." / "Save feature coming soon" → "Saving prayers is coming soon. For now, try copying it."
- `frontend/src/components/daily/DevotionalTabContent.tsx` — "Link copied!" → "Link copied — pass it along."
- `frontend/src/components/local-support/LocalSupportPage.tsx` — "Visit recorded! +10 faith points" → "Visit recorded. That took courage. +10 faith points."
- `frontend/src/components/bible/VerseDisplay.tsx` — "Copied!" → "Verse copied." / "Note limit reached. Delete an existing note to add a new one." → "You've filled your notebook! Remove an older note to make room."
- `frontend/src/components/audio/SaveMixButton.tsx` — "Mix saved!" → "Your mix is saved. It'll be here whenever you need it."
- `frontend/src/components/challenges/ChallengeDaySelector.tsx` — "Complete today's challenge to unlock the next day." → "Today's step comes first — take it at your pace."
- `frontend/src/components/ask/SaveConversationButton.tsx` — "Couldn't copy — try selecting the text manually." → "We couldn't copy that. Try selecting the text and copying manually."
- `frontend/src/pages/AskPage.tsx` — "Copied to clipboard" → "Copied — ready to share."
- `frontend/src/components/pwa/InstallBanner.tsx` — "Worship Room installed! Find it on your home screen." → "Worship Room is on your home screen now. Welcome home."

**Details:**

For each file, find the exact `showToast(` call and replace the message string. The toast type and any action parameter remain unchanged. Example:

```typescript
// Before
showToast('Entry saved')
// After
showToast('Your words are safe. Well done today.')
```

Leave these messages as-is per spec:
- `GratitudeWidget.tsx`: "Gratitude logged! Thank you for counting your blessings." — already warm
- `PrayerWall.tsx`: "Your prayer has been lifted up" — already warm

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (string content only)

**Guardrails (DO NOT):**
- DO NOT change toast type (success/error/warning) — only the message string
- DO NOT change toast action buttons or auto-dismiss timing
- DO NOT modify CrisisBanner or crisis resource strings
- DO NOT touch the GratitudeWidget "Gratitude logged!" toast (spec says keep as-is)
- DO NOT touch "Your prayer has been lifted up" toast (spec says keep as-is)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update JournalTabContent tests | integration | Update `expect(screen.getByText('Entry saved'))` → `'Your words are safe. Well done today.'` in `__tests__/JournalTabContent.test.tsx` |
| Update DevotionalTabContent tests | integration | Update `'Link copied!'` assertions → `'Link copied — pass it along.'` in `__tests__/DevotionalTabContent.test.tsx` |
| Update SaveMixButton tests | unit | Update `'Mix saved!'` → `"Your mix is saved. It'll be here whenever you need it."` in `__tests__/SaveMixButton.test.tsx` |
| Update LocalSupportPage tests | integration | Update `'Visit recorded! +10 faith points'` → `'Visit recorded. That took courage. +10 faith points.'` in `__tests__/LocalSupportPage.test.tsx` |
| Update VerseDisplay tests (BibleReaderNotes) | integration | Update `'Copied!'` → `'Verse copied.'` and note limit message in `pages/__tests__/BibleReaderNotes.test.tsx` |
| Update ChallengeDaySelector tests | unit | Update challenge unlock message in relevant test files |
| Update SaveConversationButton tests | unit | Update copy error message in `__tests__/SaveConversationButton.test.tsx` |
| Update AskPage tests | integration | Update `'Copied to clipboard'` → `'Copied — ready to share.'` in `pages/__tests__/AskPage.test.tsx` |
| Update InstallBanner tests | unit | Update install message in `__tests__/InstallBanner.test.tsx` |

**Expected state after completion:**
- [ ] All 10 files have updated toast strings per master table
- [ ] All tests asserting on changed strings are updated
- [ ] `pnpm test` passes with 0 failures
- [ ] No toast type or behavior changes — only string content

---

### Step 2: Toast Rewrites — Prayer Wall & My Prayers

**Objective:** Rewrite toast messages in Prayer Wall pages, Prayer Wall Dashboard, and My Prayers page.

**Files to modify:**
- `frontend/src/pages/PrayerWallDashboard.tsx` — Lines ~102, ~110, ~129, ~207, ~251
- `frontend/src/pages/PrayerWall.tsx` — Lines ~199, ~243, ~340
- `frontend/src/pages/PrayerDetail.tsx` — Lines ~73, ~95, ~101
- `frontend/src/pages/MyPrayers.tsx` — Lines ~95, ~97, ~111, ~121
- `frontend/src/pages/PrayerWallProfile.tsx` — Line ~81

**Details:**

Rewrites per spec master table + audit:

| File | Current | New |
|------|---------|-----|
| `PrayerWallDashboard.tsx` | `"Prayer marked as answered."` | `"What a testimony. God is faithful."` |
| `PrayerWallDashboard.tsx` | `"Prayer deleted."` | `"Prayer removed from your list."` |
| `PrayerWallDashboard.tsx` | `"Comment posted."` | `"Comment shared."` |
| `PrayerWallDashboard.tsx` | `"Name updated."` | `"Name updated."` (already fine) |
| `PrayerWallDashboard.tsx` | `"Bio updated."` | `"Bio updated."` (already fine) |
| `PrayerWall.tsx` | `"Your prayer has been shared."` | `"Your prayer is on the wall. Others can now lift it up."` |
| `PrayerWall.tsx` | `"Your response has been shared."` | `"Your response has been shared."` (already warm) |
| `PrayerWall.tsx` | `"Comment posted."` | `"Comment shared."` |
| `PrayerDetail.tsx` | `"Comment posted."` | `"Comment shared."` |
| `PrayerDetail.tsx` | `"Prayer marked as answered."` | `"What a testimony. God is faithful."` |
| `PrayerDetail.tsx` | `"Prayer deleted."` | `"Prayer removed from your list."` |
| `MyPrayers.tsx` | `"Prayer added"` | `"Added to your prayer list. We'll keep it close."` |
| `MyPrayers.tsx` | `"Prayer updated"` | `"Prayer updated."` (already fine) |
| `MyPrayers.tsx` | `"Prayer removed"` | `"Removed from your list."` |
| `PrayerWallProfile.tsx` | `"Comment posted."` | `"Comment shared."` |

Note: "Comment posted." → "Comment shared." is a consistent tone change across all 4 files. It's warmer (sharing, not posting) and consistent.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change the `"Your prayer has been lifted up"` toast in PrayerWall.tsx — spec says keep as-is
- DO NOT change `"Your response has been shared."` — already warm
- DO NOT modify the `PrayerWallDashboard.tsx` "Change Photo (coming soon)" button text — that's a button label, not a toast (handled in Step 5)
- DO NOT change `"Name updated."` or `"Bio updated."` — these are brief and appropriate for settings-style updates

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update PrayerWallDashboard tests | integration | Update `'Prayer marked as answered.'` → `'What a testimony. God is faithful.'` and `'Prayer deleted.'` → `'Prayer removed from your list.'` in `__tests__/PrayerWallDashboard.test.tsx` |
| Update PrayerWall tests | integration | Update `'Your prayer has been shared.'` → `'Your prayer is on the wall. Others can now lift it up.'` in `__tests__/PrayerWall.test.tsx` |
| Update PrayerDetail tests | integration | Update comment/answered/deleted messages in `__tests__/PrayerDetail.test.tsx` |
| Update MyPrayers tests | integration | Update `'Prayer added'` → `"Added to your prayer list. We'll keep it close."` and `'Prayer removed'` → `'Removed from your list.'` in `__tests__/MyPrayers.test.tsx` |

**Expected state after completion:**
- [ ] All Prayer Wall / My Prayers toast strings updated
- [ ] "Comment posted." consistently changed to "Comment shared." across all 4 files
- [ ] All tests asserting on changed strings are updated
- [ ] `pnpm test` passes

---

### Step 3: Toast Audit — Remaining Toast Messages

**Objective:** Audit and warm all remaining toast messages not in the master table — social, sharing, audio, settings, hooks.

**Files to modify (non-exhaustive — full audit during execution):**
- `frontend/src/components/social/EncourageButton.tsx` — Keep `"Encouragement sent to ${friendName}!"` (already warm)
- `frontend/src/components/social/NudgeButton.tsx` — `"Nudge sent to ${friendName}"` → `"${friendName} will see your nudge."` (warmer, more personal)
- `frontend/src/components/friends/InviteSection.tsx` — `"Invite link copied!"` → `"Link copied — share it with a friend."` / `"Invitation sent!"` → `"Invitation sent."` (remove exclamation excess)
- `frontend/src/components/friends/PendingRequests.tsx` — Keep `"You and ${friendName} are now friends!"` (already warm)
- `frontend/src/components/sharing/SharePanel.tsx` — `"Image downloaded!"` → `"Image saved."` / `"Image copied!"` → `"Image copied."` / `"Failed to generate image"` → `"We couldn't create the image. Try again."` / `"Failed to share image"` → `"We couldn't share that. Try again."`
- `frontend/src/components/my-prayers/TestimonyShareActions.tsx` — Same pattern as SharePanel: `"Image downloaded!"` → `"Image saved."` / `"Image copied!"` → `"Image copied."`
- `frontend/src/components/challenges/ChallengeShareButton.tsx` — `"Image downloaded!"` → `"Image saved."` / `"Could not share image"` → `"We couldn't share that. Try again."` / `"Copied!"` → `"Copied — ready to share."` / `"Could not copy text"` → `"We couldn't copy that. Try selecting the text manually."`
- `frontend/src/components/challenges/MilestoneCard.tsx` — `"Image downloaded!"` → `"Image saved."` / `"Could not share image"` → `"We couldn't share that. Try again."`
- `frontend/src/components/audio/SavedMixRow.tsx` — `"Mix duplicated!"` → `"Mix duplicated."` / `"Mix deleted"` → `"Mix removed."`
- `frontend/src/components/music/SavedMixCard.tsx` — Same as SavedMixRow: `"Mix duplicated!"` → `"Mix duplicated."` / `"Mix deleted"` → `"Mix removed."`
- `frontend/src/components/dashboard/GardenShareButton.tsx` — `"Garden image downloaded!"` → `"Garden image saved."` / `"Could not generate garden image. Please try again."` → `"We couldn't create the image. Try again."`
- `frontend/src/components/dashboard/WelcomeBack.tsx` — Keep `"🔥 Streak restored to ${previousStreak} days!"` (already celebration)
- `frontend/src/components/settings/DashboardSection.tsx` — `"Dashboard layout reset to default"` → `"Dashboard layout reset."` (briefer)
- `frontend/src/components/settings/PrivacySection.tsx` — `"Unblocked ${name}"` → `"${name} has been unblocked."`
- `frontend/src/components/profile/ProfileHeader.tsx` — Keep `"Encouragement sent to ${profileData.displayName}!"` (already warm)
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx` — Keep `"Your personalized plan is ready!"` (already warm)
- `frontend/src/components/reading-plans/DaySelector.tsx` — `"Complete the current day to unlock this one."` → `"Take today's step first — it's waiting for you."`
- `frontend/src/components/prayer-wall/SaveToPrayersForm.tsx` — Keep `"Saved to your prayer list"` (already warm enough)
- `frontend/src/components/daily/SaveToPrayerListForm.tsx` — Keep `"Saved to your prayer list"` (same)
- `frontend/src/components/daily/JournalInput.tsx` — `"Character limit reached."` → `"You've reached the limit."` / `"Voice captured."` → `"Got it."` / `"Listening... speak your heart."` → Keep (already warm) / Microphone error → `"Microphone access needed. Check your browser settings."`
- `frontend/src/components/ask/VerseCardActions.tsx` — `"Note saved"` → `"Note saved."` / `"Note limit reached. Delete an existing note to add a new one."` → `"You've filled your notebook! Remove an older note to make room."`
- `frontend/src/pages/BibleReader.tsx` — Keep `"${bookData.name} Complete!"` (already celebration)
- `frontend/src/components/prayer-wall/ShareDropdown.tsx` — `"Couldn't copy link"` → `"We couldn't copy that link. Try again."`
- `frontend/src/hooks/useSavedMixes.ts` — `"Storage is full. Please remove some items."` → `"Storage is full. Remove some items to make room."` / `"Storage is full."` → `"Storage is full. Remove some items to make room."`
- `frontend/src/hooks/useSoundToggle.ts` — Keep `"Your mix has 6 sounds — remove one to add another."` (already helpful) / `"Couldn't load ${sound.name} — tap to retry"` → Keep (already helpful)
- `frontend/src/hooks/useFavorites.ts` — `"Storage is full. Please remove some items."` → `"Storage is full. Remove some items to make room."`
- `frontend/src/hooks/useSleepTimer.ts` — `"Timer cancelled"` → `"Timer cancelled."` / `"Timer complete"` → `"Timer complete. Rest well."`
- `frontend/src/hooks/useRoutinePlayer.ts` — Keep `"Skipped ${step.label} — couldn't load audio"` (already helpful)
- `frontend/src/components/audio/TimerTabContent.tsx` — Keep `"Fade adjusted to fit timer"` (functional, brief, appropriate)

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change celebration toasts (WelcomeBack streak restore, BibleReader book complete, CreatePlanFlow plan ready)
- DO NOT change WhisperToast content (separate system)
- DO NOT change messages that are already warm (EncourageButton, PendingRequests, ProfileHeader)
- DO NOT change badge/celebration-related toasts in any hook or component
- DO NOT add exclamation marks to error messages
- DO NOT exceed ~20 words per toast message

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update SharePanel tests | unit | Update image download/copy/share messages in `__tests__/SharePanel.test.tsx` |
| Update SavedMixCard tests | unit | Update mix duplicated/deleted messages |
| Update GardenShareButton tests | unit | Update garden image messages |
| Update SaveConversationButton tests | unit | Already covered in Step 1 |
| Update ChallengeShareButton tests | unit | Update share/copy messages in `__tests__/ChallengeShareButton.test.tsx` |
| Update MilestoneCard tests | unit | Update image messages in `__tests__/MilestoneCard.test.tsx` |
| Update InviteSection tests | unit | Update invite link/invitation messages in `__tests__/InviteSection.test.tsx` |
| Update NudgeButton tests | unit | Update nudge message in `__tests__/NudgeButton.test.tsx` |
| Update PrivacySection tests | unit | Update unblock message in `__tests__/PrivacySection.test.tsx` |
| Update DashboardSection tests | unit | Update layout reset message in `__tests__/DashboardSection.test.tsx` |
| Update useSleepTimer tests | unit | Update timer messages in `hooks/__tests__/useSleepTimer.test.ts` |
| Update VerseCardActions tests | unit | Update note messages in `__tests__/VerseCardActions.test.tsx` |
| Update TestimonyShareActions tests | unit | Update image messages in `__tests__/TestimonyShareActions.test.tsx` |

**Expected state after completion:**
- [ ] All remaining toast messages audited and warmed per tone guidelines
- [ ] Zero bare "Saved", "Deleted", "Error", "Success", "Done" messages remain
- [ ] All test assertions updated to match new strings
- [ ] `pnpm test` passes

---

### Step 4: Empty State Copy Rewrites

**Objective:** Rewrite the empty state copy in PrayerListEmptyState, PrayerWallDashboard, PrayerWallProfile, and audit all FeatureEmptyState instances.

**Files to modify:**
- `frontend/src/components/my-prayers/PrayerListEmptyState.tsx` — Heading: "Your prayer list is empty" → "Your prayer list is waiting." / Description: "Start tracking what's on your heart" → "Bring what's on your heart. God is already listening."
- `frontend/src/pages/PrayerWallDashboard.tsx` — Find "No comments yet." → "No comments yet. Be the first to encourage."
- `frontend/src/pages/PrayerWallProfile.tsx` — Find "No prayer requests yet." → "No prayers shared yet."

**FeatureEmptyState audit (9 instances):**

| File | Current Heading | Current Description | Action |
|------|----------------|---------------------|--------|
| `pages/ReadingPlans.tsx` | "You've completed every plan!" | "New plans are coming..." | Keep — already warm and action-oriented |
| `pages/Insights.tsx` | "Your story is just beginning" | "Check in with your mood each day..." | Keep — already warm |
| `friends/FriendList.tsx` | "Faith grows stronger together" | "Invite a friend to join your journey..." | Keep — already warm |
| `leaderboard/FriendsLeaderboard.tsx` | "Friendly accountability" | "Add friends to see how you encourage each other..." | Keep — already warm |
| `dashboard/ChallengeWidget.tsx` | "Challenges bring us together" | "Seasonal challenges happen throughout the year..." | Keep — already warm |
| `pages/PrayerWall.tsx` (no results) | "This space is for you" | "Share what's on your heart..." | Keep — already warm |
| `pages/PrayerWall.tsx` (category empty) | "No prayers in ${category} yet" | "Be the first to share." | Keep — already warm |
| `pages/BibleBrowser.tsx` | "Your Bible is ready to mark up" | "Tap any verse while reading..." | Keep — already warm |
| `daily/JournalTabContent.tsx` | "Your journal is waiting" | "Every thought you write becomes a conversation with God..." | Keep — already warm |

**Result:** All 9 FeatureEmptyState instances are already warm (audited during Round 2 empty states polish). No changes needed.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify the FeatureEmptyState component itself — only string props passed to it
- DO NOT change FeatureEmptyState instances that are already warm (all 9 pass audit)
- DO NOT change the CTA labels or button behavior — only heading/description strings

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update PrayerListEmptyState test | unit | Update heading/description assertions in `my-prayers/__tests__/` or `pages/__tests__/MyPrayers.test.tsx` |
| Update PrayerWallDashboard empty comment | integration | Update "No comments yet." → "No comments yet. Be the first to encourage." in `pages/__tests__/PrayerWallDashboard.test.tsx` |
| Update PrayerWallProfile empty prayers | integration | Update "No prayer requests yet." → "No prayers shared yet." in `pages/__tests__/PrayerWallProfile.test.tsx` |

**Expected state after completion:**
- [ ] PrayerListEmptyState heading and description updated
- [ ] PrayerWallDashboard "No comments" empty state updated
- [ ] PrayerWallProfile empty prayers text updated
- [ ] All 9 FeatureEmptyState usages audited — all pass (no changes needed)
- [ ] Tests updated and passing

---

### Step 5: "Coming Soon" Stub Messages & Confirmation Dialogs

**Objective:** Warm "Coming soon" toast messages and update confirmation dialog copy per spec.

**Files to modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — Line 101: `"Authentication coming soon"` → `"Account creation is on the way. For now, explore freely."` / Line 110: `"Password reset coming soon"` → `"Password reset is coming soon. Hang tight."`
- `frontend/src/components/settings/AccountSection.tsx` — Line 53: `"Email change coming soon"` → `"This feature is on the way."` / Line 64: `"Password change coming soon"` → `"This feature is on the way."`
- `frontend/src/components/insights/MonthlyShareButton.tsx` — `"Sharing is coming soon! We're working on beautiful shareable cards for your faith journey."` → `"Sharing your report is coming soon."`

**Confirmation dialog updates:**
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — Title: "Delete Prayer Request" → "Remove this prayer?" / Description: "Are you sure you want to delete this prayer request? This action cannot be undone." → "This will remove the prayer from the wall. This can't be undone." / Button: "Delete" → "Remove"
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — Title: Keep "Report Prayer Request" / Description: `"Please describe why you are reporting this content (optional):"` → `"Help us keep this community safe. Describe the issue (optional):"` / Success: `"Report submitted. Thank you."` → `"Report submitted. Thank you for keeping this safe."`
- `frontend/src/components/settings/DeleteAccountModal.tsx` — Add "We'll miss you." after the description paragraph. Keep everything else as-is — the gravity is appropriate.
- `frontend/src/components/ui/UnsavedChangesModal.tsx` — Keep as-is per spec (clear and honest)
- `frontend/src/components/my-prayers/DeletePrayerDialog.tsx` — Keep as-is (already says "Remove this prayer?" / "This cannot be undone." — already matches spec's desired tone)

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change the UnsavedChangesModal (spec says keep as-is)
- DO NOT change the my-prayers DeletePrayerDialog (already matches spec tone)
- DO NOT add emotional manipulation to delete dialogs — keep honest and clear
- DO NOT change "coming soon" strings that are NOT in user-facing toasts (e.g., settings NotificationsSection descriptions, BookEntry button text, ChapterPlaceholder — these are informational labels, not toast messages)
- DO NOT change crisis-related strings anywhere

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update AuthModal tests | unit | Update `'Authentication coming soon'` → `'Account creation is on the way. For now, explore freely.'` and password reset in `__tests__/AuthModal.test.tsx` |
| Update AccountSection tests | unit | Update email/password coming soon messages in `__tests__/AccountSection.test.tsx` |
| Update MonthlyShareButton tests | unit | Update sharing coming soon message in `__tests__/MonthlyShareButton.test.tsx` |
| Update DeletePrayerDialog (prayer-wall) tests | unit | Update title/description/button text in `__tests__/` |
| Update ReportDialog tests | unit | Update description and success message |
| Update DeleteAccountModal tests | unit | Verify "We'll miss you." appears in rendered output |

**Expected state after completion:**
- [ ] All 5 "Coming soon" toast messages updated
- [ ] Prayer Wall DeletePrayerDialog updated (title, description, button)
- [ ] ReportDialog updated (description, success message)
- [ ] DeleteAccountModal has "We'll miss you." line
- [ ] UnsavedChangesModal unchanged
- [ ] My Prayers DeletePrayerDialog unchanged
- [ ] Tests updated and passing

---

### Step 6: Error Message Pattern Audit & Final Test Pass

**Objective:** Scan for remaining clinical error patterns and run final test validation.

**Files to audit (may require changes):**
- All files touched in Steps 1-5 — verify no error messages use bare "Error", "Failed", or "Invalid input"
- `frontend/src/components/daily/PrayerResponse.tsx` — `"Failed to copy"` (line 121, 184) → `"We couldn't copy that. Try again."`
- `frontend/src/components/daily/DevotionalTabContent.tsx` — `"Could not copy link"` → `"We couldn't copy that link. Try again."`
- `frontend/src/pages/AskPage.tsx` — `"Could not copy to clipboard"` → `"We couldn't copy that. Try again."`
- `frontend/src/components/bible/VerseDisplay.tsx` — `"Failed to copy"` → `"We couldn't copy that. Try again."`

**Details:**

Apply the spec's error message patterns:
- Network/fetch errors: "We hit a bump. Try again in a moment."
- Copy failures: "We couldn't copy that. Try again."
- Rate limit: "Let's slow down for a moment. Try again shortly."

Verify tone guidelines across ALL changes:
- No bare "Saved", "Deleted", "Error", "Success", "Done" without context
- No message exceeds ~20 words
- No message uses more than one "!"
- No patronizing language ("Good job!", "Way to go!")
- Consistent second person ("Your words are safe")
- Crisis strings untouched
- Celebration strings untouched

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT warm error messages that include technical details needed for debugging (console-only errors)
- DO NOT change error types (keep error toasts as `'error'` type)
- DO NOT soften error messages to the point of hiding the error — users need to know something went wrong

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update PrayerResponse error tests | unit | Update `'Failed to copy'` → `"We couldn't copy that. Try again."` in relevant test files |
| Update DevotionalTabContent error test | unit | Update `'Could not copy link'` → `"We couldn't copy that link. Try again."` |
| Update BibleReaderHighlights tests | unit | Update `'Failed to copy'` in `pages/__tests__/BibleReaderHighlights.test.tsx` |
| Full test suite pass | all | Run `pnpm test` — all tests must pass with 0 failures |

**Expected state after completion:**
- [ ] Zero bare clinical error messages remain in user-facing toasts
- [ ] Error messages are honest but warm ("We couldn't..." pattern)
- [ ] All acceptance criteria from spec are met
- [ ] `pnpm test` passes with 0 failures
- [ ] No toast component behavior changes — only string content

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Toast rewrites: master table (daily, prayer, bible, audio, challenges, PWA) |
| 2 | — | Toast rewrites: Prayer Wall & My Prayers |
| 3 | — | Toast audit: remaining messages (social, sharing, hooks, settings) |
| 4 | — | Empty state copy rewrites + FeatureEmptyState audit |
| 5 | — | "Coming soon" stubs + confirmation dialog updates |
| 6 | 1, 2, 3, 4, 5 | Error message audit + final test pass |

**Note:** Steps 1-5 are independent of each other (different files, different features). Step 6 is the final audit and depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Toast rewrites — master table | [COMPLETE] | 2026-04-01 | 11 source files updated (10 planned + VerseCardActions.tsx pulled forward from Step 3 for consistency). 4 test files updated. 5203/5203 tests pass. |
| 2 | Toast rewrites — Prayer Wall & My Prayers | [COMPLETE] | 2026-04-01 | 5 source files updated (PrayerWallDashboard, PrayerWall, PrayerDetail, MyPrayers, PrayerWallProfile). "Comment posted." → "Comment shared." consistently across all 4 files. No test assertions needed updating. 58/58 tests pass. |
| 3 | Toast audit — remaining messages | [COMPLETE] | 2026-04-01 | 17 source files + 10 test files updated. Social, sharing, audio, settings, hooks, prayer-wall all warmed. 5203/5203 tests pass. |
| 4 | Empty state copy rewrites | [COMPLETE] | 2026-04-01 | PrayerListEmptyState heading/description updated. PrayerWallDashboard "No comments" updated. PrayerWallProfile empty prayers updated. All 9 FeatureEmptyState instances audited — all already warm, no changes needed. 1 test file updated (MyPrayers.test.tsx). |
| 5 | "Coming soon" stubs + dialogs | [COMPLETE] | 2026-04-01 | 6 source files updated (AuthModal, AccountSection, MonthlyShareButton, DeletePrayerDialog, ReportDialog, DeleteAccountModal). 5 test files updated. UnsavedChangesModal and my-prayers DeletePrayerDialog left unchanged per plan. |
| 6 | Error message audit + final test pass | [COMPLETE] | 2026-04-01 | 5 source files updated (PrayerResponse 2x, DevotionalTabContent, AskPage, VerseDisplay, InviteSection). All "Failed to copy"/"Could not copy" patterns replaced with "We couldn't..." pattern. Zero bare clinical messages remain. 5203/5203 tests pass. |
