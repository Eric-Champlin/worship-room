# Toast & Copy Warmth Pass

**Master Plan Reference:** N/A — standalone feature (copy-only pass across existing features)

---

## Overview

Worship Room exists to meet hurting people with comfort and care. Every interaction — including the micro-moments after saving, copying, or deleting — is an opportunity to affirm the user emotionally. Today, ~40 toast messages and several empty state strings read like database event confirmations ("Entry saved", "Prayer deleted", "Mix saved!"). This spec rewrites those strings to sound like a caring friend, not a system notification, transforming transactional receipts into moments of warmth.

## User Story

As a logged-in user completing spiritual activities (journaling, praying, saving mixes), I want confirmation messages that acknowledge the emotional weight of what I just did so that even small interactions feel like care, not bureaucracy.

As a logged-out visitor browsing empty states, I want inviting language that draws me in so that I feel welcomed rather than facing a blank wall.

## Requirements

### 1. Toast Message Rewrites (Master Table)

Find every `show()` or `toast()` call in the codebase. Rewrite each one per the table below. If marked "Keep as-is", leave it unchanged.

| File | Current Message | New Message | Notes |
|------|----------------|-------------|-------|
| `pages/PrayerWallDashboard.tsx` | "Prayer marked as answered." | "What a testimony. God is faithful." | Sacred moment |
| `pages/PrayerWallDashboard.tsx` | "Prayer deleted." | "Prayer removed from your list." | Softer verb |
| `pages/PrayerWall.tsx` | "Your prayer has been shared." | "Your prayer is on the wall. Others can now lift it up." | Community |
| `pages/PrayerWall.tsx` | "Your prayer has been lifted up" | Keep as-is | Already warm |
| `pages/MyPrayers.tsx` | "Prayer added" | "Added to your prayer list. We'll keep it close." | Intimacy |
| `pages/MyPrayers.tsx` | "Prayer removed" | "Removed from your list." | Simple, not cold |
| `components/daily/JournalTabContent.tsx` | "Entry saved" | "Your words are safe. Well done today." | Journaling is brave |
| `components/daily/PrayerResponse.tsx` | "Prayer copied to clipboard" | "Prayer copied — share it with someone who needs it." | Encourage sharing |
| `components/daily/PrayerResponse.tsx` | "Save feature coming soon" | "Saving prayers is coming soon. For now, try copying it." | Helpful redirect |
| `components/daily/DevotionalTabContent.tsx` | "Link copied!" | "Link copied — pass it along." | Gentle encouragement |
| `components/local-support/LocalSupportPage.tsx` | "Visit recorded! +10 faith points" | "Visit recorded. That took courage. +10 faith points." | Affirm the act |
| `components/bible/VerseDisplay.tsx` | "Copied!" | "Verse copied." | Slightly more specific |
| `components/bible/VerseDisplay.tsx` | "Note limit reached. Delete an existing note to add a new one." | "You've filled your notebook! Remove an older note to make room." | Warmer framing |
| `components/audio/SaveMixButton.tsx` | "Mix saved!" | "Your mix is saved. It'll be here whenever you need it." | Reassurance |
| `components/dashboard/GratitudeWidget.tsx` | "Gratitude logged! Thank you for counting your blessings." | Keep as-is | Already warm |
| `components/challenges/ChallengeDaySelector.tsx` | "Complete today's challenge to unlock the next day." | "Today's step comes first — take it at your pace." | Remove pressure |
| `components/ask/SaveConversationButton.tsx` | "Couldn't copy — try selecting the text manually." | "We couldn't copy that. Try selecting the text and copying manually." | Friendlier |
| `pages/AskPage.tsx` | "Copied to clipboard" | "Copied — ready to share." | Brief + purpose |
| `components/pwa/InstallBanner.tsx` | "Worship Room installed! Find it on your home screen." | "Worship Room is on your home screen now. Welcome home." | Emotional landing |

### 2. Additional Toast Audit

Search the entire codebase for ALL toast calls (patterns: `show(`, `toast(`, `useToast()` consumers). For each toast not in the master table:

- **Already warm and specific** — leave unchanged
- **Clinical or generic** ("Success", "Error", "Done", "Saved") — rewrite following the tone guidelines below
- **"Coming soon" stub** — make it helpful: tell the user what they CAN do instead

### 3. Empty State Copy Rewrites

| File | Current | New | Notes |
|------|---------|-----|-------|
| `components/my-prayers/PrayerListEmptyState.tsx` | "Your prayer list is empty" / "Start tracking what's on your heart." | "Your prayer list is waiting." / "Bring what's on your heart. God is already listening." | "Tracking" is clinical |
| `pages/PrayerWallDashboard.tsx` | "No comments yet." | "No comments yet. Be the first to encourage." | Invite action |
| `pages/PrayerWallProfile.tsx` | "No prayer requests yet." | "No prayers shared yet." | Softer |

**FeatureEmptyState component audit:** The shared `FeatureEmptyState.tsx` component is used in 10+ locations. Check each instance's heading and description:
- "No [items] yet" headings should become "Your [feature] is waiting" or "This space is yours"
- Action-oriented descriptions ("Add your first...") are fine — keep them
- Passive descriptions ("Nothing here yet") should add an invitation

### 4. Error Message Rewrites

Focus on user-facing error messages (not console errors or developer-facing):

| Pattern | Current (typical) | Warm Alternative |
|---------|-------------------|------------------|
| Network/fetch errors | "Something went wrong" | "We hit a bump. Try again in a moment." |
| Invalid input | "Invalid input" | "That doesn't look quite right. Could you check and try again?" |
| Rate limit | "Too many requests" | "Let's slow down for a moment. Try again shortly." |
| Auth required | "Please log in" | "Sign in to keep this moment safe." |
| Feature unavailable | "Coming soon" | "This is on the way. Stay tuned." |

### 5. Confirmation Dialog Copy

| Dialog | Evaluation |
|--------|------------|
| `UnsavedChangesModal` | Keep as-is — clear and honest |
| `DeleteAccountModal` | Keep the gravity. Consider adding "We'll miss you." if it doesn't feel manipulative |
| `DeletePrayerDialog` | Should be clear and simple: "Remove this prayer from your list?" |
| `ReportDialog` | Should feel safe: "Help us keep this community safe." |

### 6. "Coming Soon" Stub Messages

| Location | Current | New |
|----------|---------|-----|
| Auth modal submit | "Authentication coming soon" | "Account creation is on the way. For now, explore freely." |
| Password reset | "Password reset coming soon" | "Password reset is coming soon. Hang tight." |
| Email change | "Email change coming soon" | "This feature is on the way." |
| Password change | "Password change coming soon" | "This feature is on the way." |
| Monthly report share | "Sharing is coming soon!" | "Sharing your report is coming soon." |

### Tone Guidelines (Apply to All Rewrites)

- Sound like a caring friend, not a system notification
- Acknowledge the emotional weight of the user's action (saving a prayer is vulnerable, marking answered is sacred, journaling is brave)
- 5-15 words maximum per toast
- One "!" maximum per message
- Never patronizing ("Good job!", "Way to go!", "You're awesome!")
- Use second person ("Your words are safe") not third person ("The entry has been saved")
- Warm doesn't mean wordy — brevity is key

### Non-Functional Requirements

- Performance: No impact — only string content changes
- Accessibility: Toast content remains accessible via existing `role="status"` / `aria-live` attributes. No structural changes.

## Auth Gating

N/A — This feature changes only string content in existing toast calls and empty states. No new interactive elements are introduced. All existing auth gating remains unchanged.

## Responsive Behavior

N/A — This feature changes only string content, not layout or visual elements. Longer toast strings should be spot-checked at mobile width (375px) to ensure they don't overflow the toast container, but no layout changes are required.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. The crisis banner and crisis resource strings are NOT part of this pass (those are safety-critical and should not be warmed).

## Auth & Persistence

N/A — No data model changes. No new localStorage keys. No persistence changes.

## Completion & Navigation

N/A — standalone feature. No completion tracking or navigation changes.

## Design Notes

- Toast component (`Toast.tsx`) supports types: success, error, celebration (confetti, shimmer). This pass changes only the message strings — toast type, auto-dismiss timing, and action buttons remain unchanged.
- The `FeatureEmptyState.tsx` component accepts heading and description props. Only the string values passed to it change, not the component structure.
- Celebration toasts (badge, level-up via `CelebrationOverlay.tsx` and `CelebrationQueue.tsx`) already have warm, purpose-built copy — they are excluded from this pass.

## Out of Scope

- Toast component styling changes (colors, animation, positioning, timing)
- Adding new toasts where none exist
- Onboarding wizard copy changes (WelcomeWizard)
- Dashboard greeting copy changes (DashboardHero)
- Button label changes
- Crisis resource / crisis banner text changes (safety-critical, do not warm)
- Copy for features not yet built (Phase 3 backend)
- Localization / i18n infrastructure

## Acceptance Criteria

- [ ] Every toast message in the master rewrite table has been updated to the new copy
- [ ] All remaining toast messages have been evaluated — clinical ones rewritten, warm ones kept
- [ ] Zero toast messages use bare "Saved", "Deleted", "Error", "Success", "Done" without context
- [ ] Empty state messages in the key rewrites table are updated
- [ ] All `FeatureEmptyState` usages have been audited — clinical headings/descriptions rewritten
- [ ] "Coming soon" stub toasts are helpful (tell the user what they can do instead)
- [ ] Error messages that users see are honest but warm (not cold, not blaming)
- [ ] No toast message exceeds ~20 words
- [ ] No toast message uses more than one exclamation mark
- [ ] No toast message is patronizing ("Good job!", "Way to go!", "You're awesome!")
- [ ] Tone is consistent across all messages: caring friend, not system notification, not cheerleader
- [ ] All existing toast functionality is preserved (type, auto-dismiss timing, action buttons)
- [ ] No changes to toast component behavior — only string content changes
- [ ] Confirmation dialog copy has been reviewed and updated where specified
- [ ] Crisis-related strings (crisis banner, crisis resources) are NOT modified
- [ ] Celebration overlay strings (badge, level-up) are NOT modified
- [ ] All existing tests pass — tests asserting on specific toast message text are updated to match new strings
- [ ] Spot-check at mobile width (375px) confirms toast messages don't overflow
