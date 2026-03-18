# Feature: Settings and Privacy

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_settings`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider` and avatar dropdown with "Settings" link; Spec 9 (Friends System) provides `wr_friends` data with `blockedUsers` array; Spec 10 (Leaderboard) reads `privacy.showOnGlobalLeaderboard`; Spec 11 (Social Interactions) reads `privacy.nudgePermission`; Spec 12 (Notification System) reads notification toggles from `wr_settings.notifications`; Spec 14 (Profile & Avatars) provides the avatar picker component that "Change" button links to
- Shared constants: Level names from `dashboard/levels.ts`, avatar preset IDs from Spec 14
- Shared utilities: `useAuth()` from auth context, `useToast()` from `components/ui/Toast.tsx`

---

## Overview

The Settings page gives logged-in users full control over their Worship Room identity, notification preferences, privacy boundaries, and account lifecycle. In an app that touches emotional and spiritual well-being, user control over data visibility is not a nice-to-have — it's essential. This page ensures every user can set boundaries around what friends and the community see, decide what notifications they receive, and delete all their data instantly if they choose.

The page is organized into four clear sections — Profile, Notifications, Privacy, and Account — navigated via a left sidebar on desktop or top tabs on mobile. All settings persist immediately to `wr_settings` in localStorage (no "Save" button).

---

## User Stories

- As a **logged-in user**, I want to edit my display name and bio so that my friends see who I am.
- As a **logged-in user**, I want to control which notifications I receive so that my experience stays peaceful and non-intrusive.
- As a **logged-in user**, I want to control who can see my streak, level, and leaderboard presence so that I feel safe sharing my faith journey.
- As a **logged-in user**, I want to manage blocked users so that I can unblock someone if I change my mind.
- As a **logged-in user**, I want to delete my account and all stored data so that I can fully exit the platform.

---

## Requirements

### Route and Entry Point

- **Route**: `/settings` — protected (entire page requires authentication)
- **Entry**: Avatar dropdown menu in the navbar (already placed by Spec 2) contains a "Settings" link that navigates to `/settings`
- **Page title**: "Settings" (browser tab title and page heading)
- **No sub-routes**: All four sections live on the single `/settings` page, switched by section navigation

### Page Layout and Section Navigation

The page uses a two-panel layout on desktop and a tabbed layout on mobile:

**Desktop (> 1024px):**
- Left sidebar (~240px) with 4 navigation links: Profile, Notifications, Privacy, Account
- Active link highlighted with `bg-white/10` and `text-white` (or primary accent)
- Right content panel (remaining width) displays the active section
- Sidebar uses `role="navigation"` with `aria-label="Settings"`
- Clicking a sidebar link scrolls the content panel to that section (or swaps the rendered section)

**Tablet (640-1024px):**
- Same sidebar layout as desktop but sidebar narrows (~200px)
- Content panel adjusts to remaining space

**Mobile (< 640px):**
- Top horizontal tabs replacing the sidebar
- 4 tabs: Profile, Notifications, Privacy, Account
- Tabs scroll horizontally if needed (but 4 short labels should fit)
- Uses `role="tablist"` with `role="tab"` on each tab and `role="tabpanel"` on the content
- Active tab: underline or background highlight matching primary accent
- Content area below tabs displays the active section

### Dark Theme

The settings page follows the dashboard dark theme:
- Page background: dark gradient matching dashboard (`bg-gradient-to-b from-hero-dark to-hero-mid` or equivalent)
- Content cards: frosted glass (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- Text: `text-white` for headings, `text-white/70` for labels, `text-white/40` for hints
- Inputs: dark backgrounds (`bg-white/10 border border-white/15 text-white`) with focus glow

---

### Section 1: Profile

Contained within a single frosted glass card.

**Display Name:**
- Text input, pre-filled with current name from `wr_settings.profile.displayName` (or `wr_user_name` as fallback)
- Validation: 2-30 characters, alphanumeric + spaces only
- Live character count (e.g., "12/30")
- Changes save immediately on blur (debounced, no Save button)
- Updates `wr_settings.profile.displayName` AND `wr_user_name` (keeps both in sync for backward compat)
- Success: brief inline "Saved" confirmation text that fades after 2 seconds
- Error: inline validation message below input ("Display name must be 2-30 characters")

**Avatar Preview:**
- Circular avatar preview (80px) showing current avatar (preset icon, uploaded photo, or initials fallback)
- "Change" button next to/below the avatar
- "Change" button is a stub that shows a toast: "Avatar picker coming soon" (Spec 14 builds the actual picker)
- Once Spec 14 is built, "Change" opens the avatar picker modal

**Bio:**
- Textarea, optional, 160 character limit
- Live character count (e.g., "42/160")
- Placeholder: "Tell your friends a little about yourself..."
- Changes save immediately on blur
- Stubbed — the bio value is stored in `wr_settings.profile.bio` but is not displayed anywhere publicly yet (future: profile page)
- Muted hint below textarea: "Your bio will appear on your profile (coming soon)"

### Section 2: Notifications

A list of 9 toggle switches, each with a label and optional description. All toggles immediately persist to `wr_settings.notifications` on change (no Save button).

| Toggle | Key | Default | Description |
|--------|-----|---------|-------------|
| In-app notifications | `inAppNotifications` | ON | "Show notifications in the bell icon" |
| Push notifications | `pushNotifications` | OFF | "Get notified even when you're away (coming soon)" |
| Email weekly digest | `emailWeeklyDigest` | ON | "Weekly summary of your faith journey (coming soon)" |
| Email monthly report | `emailMonthlyReport` | ON | "Monthly insights and growth recap (coming soon)" |
| Encouragement notifications | `encouragements` | ON | "When friends send you encouragement" |
| Milestone notifications | `milestones` | ON | "When you earn badges or level up" |
| Friend request notifications | `friendRequests` | ON | "When someone wants to be your friend" |
| Nudge notifications | `nudges` | ON | "When friends send a gentle nudge" |
| Weekly recap | `weeklyRecap` | ON | "Your weekly community highlights" |

**Toggle behavior:**
- Visual: pill-shaped toggle switch with `bg-primary` when ON, `bg-white/20` when OFF
- Each toggle has `role="switch"` with `aria-checked` state
- "Push notifications" toggle: when toggled ON, shows an inline note: "Push notifications will be available in a future update" — it stores the flag but does not call browser permissions API
- Stubs (push, email weekly, email monthly): toggling stores the boolean but has no functional effect. Each has "(coming soon)" in its description.
- The `inAppNotifications` master toggle: when OFF, the bell icon's unread badge still shows but the notification panel does not pop up toasts for new notifications (panel still accessible via click). This provides a "do not disturb" mode.

**Section grouping:**
- Group 1: "General" — In-app notifications, Push notifications
- Group 2: "Email" — Email weekly digest, Email monthly report
- Group 3: "Activity" — Encouragements, Milestones, Friend requests, Nudges, Weekly recap
- Groups separated by subtle dividers (`border-t border-white/10`) with muted group headers (`text-xs text-white/40 uppercase tracking-wider`)

### Section 3: Privacy

**Toggle settings (boolean):**

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Show on global leaderboard | `showOnGlobalLeaderboard` | ON | "Appear on the community leaderboard" |
| Activity status | `activityStatus` | ON | "Show friends when you're active" |

Both use the same toggle switch style as Notifications section.

**Radio group settings:**

| Setting | Key | Default | Options |
|---------|-----|---------|---------|
| Who can send nudges | `nudgePermission` | `friends` | Everyone / Friends / Nobody |
| Who can see your streak & level | `streakVisibility` | `friends` | Everyone / Friends / Only me |

- Radio buttons styled as selectable pill chips or standard radio buttons on dark theme
- Each group has a label above it and uses `role="radiogroup"` with `role="radio"` on each option
- Selected state: `bg-primary/20 border-primary text-white` pill; unselected: `bg-white/5 border-white/15 text-white/60` pill
- Changes persist immediately to `wr_settings.privacy`

**Blocked Users List:**
- Section header: "Blocked Users"
- If no blocked users: muted text "You haven't blocked anyone"
- If blocked users exist: list of blocked user display names with an "Unblock" button next to each
- "Unblock" click: removes user from `wr_settings.privacy.blockedUsers` AND from `wr_friends.blockedUsers` (keeps both in sync)
- Confirm before unblocking: no confirmation needed (low-risk action, easily reversible by re-blocking from friends page)
- After unblocking: show brief toast "Unblocked [Name]"
- Blocked user entries display: avatar (initials fallback) + display name + "Unblock" button

### Section 4: Account

**Email Display:**
- Shows current email address (from simulated auth context or `wr_settings.profile.email`, defaulting to "user@example.com" in demo)
- "Change Email" link/button → stub: shows toast "Email change coming soon"
- Email is display-only (not editable inline)

**Change Password:**
- "Change Password" button → stub: shows toast "Password change coming soon"
- No password fields rendered

**Delete Account:**
- Red danger button: "Delete Account"
- Button style: `bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30`
- Click opens a confirmation modal

**Delete Confirmation Modal:**
- Uses `role="alertdialog"` with `aria-labelledby` and `aria-describedby`
- Focus-trapped (keyboard focus stays within modal)
- Dark overlay backdrop (`bg-black/60`)
- Modal content: frosted glass card style
- Title: "Delete Your Account?"
- Body: "This will permanently delete all your Worship Room data including mood entries, journal drafts, badges, friends, and settings. This action cannot be undone."
- Two buttons:
  - "Cancel" — secondary style, closes modal
  - "Delete Everything" — red danger style (`bg-red-500 text-white`)
- On confirm:
  1. Clear ALL localStorage keys that start with `wr_` (use a loop over localStorage keys, not a hardcoded list, to be future-proof)
  2. Call `logout()` from AuthProvider (clears auth state)
  3. Navigate to `/` (landing page)
  4. No toast after deletion (user is now logged out and seeing the landing page)
- Escape key closes modal
- Clicking outside modal closes it

---

## UX & Design Notes

- **Tone**: Calm, empowering, never pressuring. Settings labels use plain language. Privacy descriptions explain what each toggle does without fear-mongering.
- **Colors**: Dashboard dark theme throughout. Frosted glass cards for each section. Primary accent (`#6D28D9`) for active states and toggle ON. Red (`#E74C3C` / `bg-red-500`) only for Delete Account.
- **Typography**: Section headings in `text-lg font-semibold text-white`. Labels in `text-sm font-medium text-white/80`. Descriptions in `text-xs text-white/40`. Inter throughout (no serif on this page).
- **Animations**: Section transitions should be subtle — cross-fade or instant swap between sections. Toggle switches animate the knob sliding (150ms ease). `prefers-reduced-motion`: all animations are instant.
- **Spacing**: Consistent vertical rhythm — 16px between fields within a section, 24px between groups, 32px between sections (mobile). Cards have `p-4 md:p-6` padding matching dashboard card pattern.
- **Dividers**: `border-t border-white/10` between toggle groups and between major sections in a card.

### Design System Recon References

- **Frosted glass card**: Match dashboard card pattern from `09-design-system.md` — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Dark page gradient**: Match dashboard background (`from-hero-dark to-hero-mid`)
- **Toggle switch**: New pattern (not yet in design system) — pill shape, 48px wide, 24px tall, `bg-primary` (ON) / `bg-white/20` (OFF), white circle knob (20px), 150ms transition
- **Radio pill chips**: New pattern — rounded-full pill buttons in a horizontal row, selected/unselected states described above
- **Input fields**: Dark input pattern — `bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/50`
- **Danger button**: New pattern — `bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg`
- **Confirmation modal**: Match auth modal pattern (backdrop + frosted glass card + focus trap) but with danger styling

**New visual patterns**: 4 (toggle switch, radio pill chips, dark input fields, danger button). These should be marked `[UNVERIFIED]` during planning until confirmed via Playwright.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — no free-text user input that could contain crisis language. The bio field has a 160-char limit and is not AI-analyzed; it's stored as plain text.
- **User input involved?**: Yes — display name (validated, alphanumeric + spaces only, 2-30 chars) and bio (plain text, 160 chars). Neither is sent to an AI. Both use standard input sanitization.
- **AI-generated content?**: No — all content on this page is static labels and user-entered values.
- **Bio content policy**: Bio is stored as plain text. When it is eventually displayed publicly (Spec 14's profile page), it must be rendered as plain text with `white-space: pre-wrap` — never `dangerouslySetInnerHTML`. No HTML, no Markdown.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Cannot access `/settings`** — the route is fully protected
- **Behavior**: redirect to `/` (landing page) or show the auth modal with message "Sign in to access settings"
- **Zero data persistence** — no reads or writes to `wr_settings`

### Logged-in users:
- Full access to all 4 sections
- All changes persist immediately to `wr_settings` in localStorage
- `logout()` does NOT clear `wr_settings` — data persists for next login (consistent with other `wr_*` keys)
- **Exception**: "Delete Account" clears ALL `wr_*` keys including `wr_settings`

### Route type: Protected

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `/settings` route | Redirect to `/` or show auth modal "Sign in to access settings" | Full settings page rendered |
| Avatar dropdown "Settings" link | Not rendered (avatar dropdown only visible when authenticated) | Navigates to `/settings` |
| Display name input | N/A (page inaccessible) | Edit and save, validated |
| Avatar "Change" button | N/A | Shows "Avatar picker coming soon" toast (stub) |
| Bio textarea | N/A | Edit and save |
| All notification toggles | N/A | Toggle ON/OFF, immediately persisted |
| All privacy toggles/radios | N/A | Change values, immediately persisted |
| Blocked users "Unblock" | N/A | Removes user from blocked list |
| "Change Email" button | N/A | Shows "Email change coming soon" toast (stub) |
| "Change Password" button | N/A | Shows "Password change coming soon" toast (stub) |
| "Delete Account" button | N/A | Opens confirmation modal |
| Delete confirmation "Delete Everything" | N/A | Clears all `wr_*` keys, logs out, redirects to `/` |

---

## Data Model

### `wr_settings` localStorage key

```
UserSettings {
  profile: {
    displayName: string         // 2-30 chars, alphanumeric + spaces
    avatarId: string            // Preset avatar ID or 'custom' for photo upload
    avatarUrl?: string          // Base64 data URL for custom photo (Spec 14)
    bio?: string                // Optional, max 160 chars
    email?: string              // Display only, default "user@example.com"
  }
  notifications: {
    inAppNotifications: boolean          // default: true
    pushNotifications: boolean           // default: false (stub)
    emailWeeklyDigest: boolean           // default: true (stub)
    emailMonthlyReport: boolean          // default: true (stub)
    encouragements: boolean              // default: true
    milestones: boolean                  // default: true
    friendRequests: boolean              // default: true
    nudges: boolean                      // default: true
    weeklyRecap: boolean                 // default: true
  }
  privacy: {
    showOnGlobalLeaderboard: boolean     // default: true
    activityStatus: boolean              // default: true
    nudgePermission: 'everyone' | 'friends' | 'nobody'    // default: 'friends'
    streakVisibility: 'everyone' | 'friends' | 'only_me'  // default: 'friends'
    blockedUsers: string[]               // array of user IDs
  }
}
```

**Default initialization**: If `wr_settings` does not exist when the settings page loads, initialize it with all defaults listed above. Profile fields populated from `wr_user_name` (if exists) and the auth context.

**Corruption handling**: If `wr_settings` contains invalid JSON, re-initialize with defaults. No crash.

**Cross-spec reads**: Other specs read from `wr_settings` but never write to it:
- Spec 10 (Leaderboard): reads `privacy.showOnGlobalLeaderboard` to determine if user appears
- Spec 11 (Social Interactions): reads `privacy.nudgePermission` to filter nudge senders
- Spec 12 (Notification System): reads notification toggles to filter which notifications generate toasts
- Spec 14 (Profile): reads `privacy.streakVisibility` to determine what visitors see

---

## Edge Cases

- **Display name empty on blur**: Revert to previous valid name (don't allow saving empty/too-short name)
- **Display name special characters**: Strip any characters that aren't alphanumeric or spaces. Show inline validation error.
- **Bio with line breaks**: Allow line breaks in bio (stored with `\n`). Character count includes line breaks.
- **Blocked users list is empty**: Show "You haven't blocked anyone" muted text. No empty card/illustration needed.
- **Blocked user was a friend**: Unblocking does NOT automatically re-add as friend. They return to "not friends" state. User must re-send/accept friend request.
- **Toggle rapid clicks**: Debounce localStorage writes (100ms) to prevent rapid-fire writes. UI state updates immediately for responsiveness.
- **Delete account confirmation**: Typing confirmation is overkill for localStorage-only data. Simple modal with two buttons is sufficient.
- **Multiple tabs**: Listen for `storage` events on `wr_settings` to sync toggle states across tabs.
- **wr_settings doesn't exist on first visit**: Initialize with defaults before rendering.
- **Back navigation after delete**: After deletion + redirect to `/`, pressing browser back should NOT return to `/settings` (user is logged out, route redirects again to `/`).
- **Keyboard navigation**: Tab through sidebar/tabs, then into the active section's fields. Arrow keys within radio groups. Enter/Space on toggle switches.

---

## Responsive Behavior

### Mobile (< 640px)
- Top horizontal tab bar with 4 tabs (Profile, Notifications, Privacy, Account)
- Tab bar: `role="tablist"`, horizontally scrollable if needed, sticky below navbar
- Active tab: underline indicator using primary accent color
- Content fills full width below tabs with `px-4` padding
- All inputs are full-width
- Radio pill chips stack to 2 per row if needed (they should fit 3 across at 375px)
- Blocked users: each entry is a full-width row
- Delete modal: full-width with `mx-4` margin, buttons stack vertically ("Cancel" below "Delete Everything")
- Toggle rows: label on left, toggle on right, description below label (2-line layout)

### Tablet (640-1024px)
- Left sidebar (~200px) + content panel
- Sidebar navigation uses icons + text labels
- Content panel adjusts to remaining width
- Radio pill chips fit in a single row (3 options)
- Delete modal: centered, ~400px max-width
- Toggle rows: single-line layout (label + description on left, toggle on right)

### Desktop (> 1024px)
- Left sidebar (~240px) + content panel (~640px max-width, centered in remaining space)
- Sidebar navigation: text labels, active state background highlight
- Generous spacing between fields
- Radio pill chips in a single row
- Delete modal: centered, ~480px max-width
- Toggle rows: single-line layout with hover states on the row

---

## Out of Scope

- **Real authentication** — Phase 3 (uses simulated auth from Spec 2's AuthProvider)
- **Backend API persistence** — Phase 3 (all settings in localStorage)
- **Avatar picker modal** — Spec 14 (this spec stubs the "Change" button with a toast)
- **Real email/push notifications** — Phase 3 (toggles store flags only)
- **Email change flow** — Phase 3 (stub button with toast)
- **Password change flow** — Phase 3 (stub button with toast)
- **Profile page** — Spec 14 (bio is stored here but not displayed publicly yet)
- **Data export** — not in MVP
- **Two-factor authentication** — not in MVP
- **Account deactivation** (soft delete) — not in MVP; delete is a hard clear of localStorage
- **Theme preference** (dark/light mode toggle) — separate feature, not in this spec
- **Language / localization settings** — not in MVP
- **Connected accounts (Google, Facebook)** — not in MVP

---

## Acceptance Criteria

### Route and Access

- [ ] `/settings` route exists and is protected (logged-out users are redirected to `/` or shown auth modal with "Sign in to access settings")
- [ ] Avatar dropdown in navbar contains a "Settings" link that navigates to `/settings`
- [ ] Page title (browser tab): "Settings"
- [ ] Page renders with dark gradient background matching dashboard theme

### Section Navigation

- [ ] Desktop (> 1024px): left sidebar with 4 navigation links (Profile, Notifications, Privacy, Account)
- [ ] Desktop: active sidebar link has highlighted background (`bg-white/10`)
- [ ] Desktop: sidebar uses `role="navigation"` with `aria-label="Settings"`
- [ ] Tablet (640-1024px): same sidebar layout, narrower width
- [ ] Mobile (< 640px): top horizontal tabs replacing sidebar
- [ ] Mobile: tabs use `role="tablist"` with `role="tab"` and `role="tabpanel"`
- [ ] Mobile: active tab has underline or background highlight in primary accent
- [ ] Clicking a navigation item/tab shows the corresponding section content

### Profile Section

- [ ] Display name text input pre-filled with current name
- [ ] Display name validates: 2-30 characters, alphanumeric + spaces only
- [ ] Display name shows live character count (e.g., "12/30")
- [ ] Display name saves on blur with inline "Saved" confirmation that fades after 2 seconds
- [ ] Display name validation error shown inline ("Display name must be 2-30 characters") for invalid input
- [ ] Display name change updates both `wr_settings.profile.displayName` and `wr_user_name`
- [ ] Avatar preview (80px circle) shows current avatar or initials fallback
- [ ] Avatar "Change" button shows toast "Avatar picker coming soon"
- [ ] Bio textarea with 160-character limit and live character count
- [ ] Bio placeholder text: "Tell your friends a little about yourself..."
- [ ] Bio saves on blur to `wr_settings.profile.bio`
- [ ] Bio hint text below: "Your bio will appear on your profile (coming soon)" in muted style

### Notifications Section

- [ ] 9 toggle switches rendered with correct labels and descriptions
- [ ] Toggles organized in 3 groups (General, Email, Activity) with dividers and group headers
- [ ] Group headers: `text-xs text-white/40 uppercase tracking-wider`
- [ ] Push notifications defaults to OFF; all others default to ON
- [ ] Each toggle immediately persists to `wr_settings.notifications` on change
- [ ] Toggle visual: pill-shaped, `bg-primary` when ON, `bg-white/20` when OFF, 150ms knob animation
- [ ] Each toggle uses `role="switch"` with `aria-checked`
- [ ] Push notifications toggle shows inline note "Push notifications will be available in a future update" when toggled ON
- [ ] Stub toggles (push, email weekly, email monthly) have "(coming soon)" in their descriptions

### Privacy Section

- [ ] "Show on global leaderboard" toggle defaults to ON
- [ ] "Activity status" toggle defaults to ON
- [ ] Both privacy toggles use same visual style as notification toggles
- [ ] "Who can send nudges" radio group with 3 options: Everyone, Friends, Nobody
- [ ] Nudge radio defaults to "Friends"
- [ ] "Who can see your streak & level" radio group with 3 options: Everyone, Friends, Only me
- [ ] Streak visibility radio defaults to "Friends"
- [ ] Radio groups use `role="radiogroup"` with `role="radio"` on each option
- [ ] Selected radio pill: `bg-primary/20 border-primary text-white`; unselected: `bg-white/5 border-white/15 text-white/60`
- [ ] Privacy changes persist immediately to `wr_settings.privacy`
- [ ] Blocked users section shows "You haven't blocked anyone" when list is empty
- [ ] Blocked users section shows list of blocked users with "Unblock" button when list is populated
- [ ] "Unblock" removes user from `wr_settings.privacy.blockedUsers` AND `wr_friends.blockedUsers`
- [ ] "Unblock" shows toast "Unblocked [Name]"

### Account Section

- [ ] Email displayed (from auth context or `wr_settings.profile.email`, defaulting to "user@example.com")
- [ ] "Change Email" button shows toast "Email change coming soon"
- [ ] "Change Password" button shows toast "Password change coming soon"
- [ ] "Delete Account" button rendered with red danger styling (`bg-red-500/20 text-red-400 border border-red-500/30`)
- [ ] Clicking "Delete Account" opens a confirmation modal
- [ ] Confirmation modal uses `role="alertdialog"` with proper `aria-labelledby` and `aria-describedby`
- [ ] Modal is focus-trapped (keyboard focus stays within modal)
- [ ] Modal backdrop: dark overlay (`bg-black/60`)
- [ ] Modal title: "Delete Your Account?"
- [ ] Modal body explains data deletion clearly: mood entries, journal drafts, badges, friends, settings
- [ ] "Cancel" button closes modal without action
- [ ] "Delete Everything" button: red danger style (`bg-red-500 text-white`)
- [ ] Confirming deletion clears ALL localStorage keys starting with `wr_` (not a hardcoded list — iterates over all keys)
- [ ] Confirming deletion calls `logout()` from AuthProvider
- [ ] Confirming deletion navigates to `/` (landing page)
- [ ] Escape key closes the delete confirmation modal
- [ ] Clicking outside the modal closes it

### Data Persistence

- [ ] `wr_settings` initialized with all defaults if it doesn't exist on page load
- [ ] Corrupted `wr_settings` (invalid JSON) re-initializes with defaults, no crash
- [ ] Cross-tab sync: `storage` event listener updates displayed settings when another tab modifies `wr_settings`
- [ ] Toggle changes are debounced for localStorage writes (100ms) while UI updates are immediate

### Accessibility

- [ ] All toggle switches have `role="switch"` with `aria-checked`
- [ ] All radio groups use `role="radiogroup"` / `role="radio"` with `aria-checked`
- [ ] Desktop sidebar navigation: `role="navigation"` with `aria-label="Settings"`
- [ ] Mobile tabs: `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`
- [ ] Delete modal: `role="alertdialog"` with focus trap
- [ ] All interactive elements have visible focus outlines
- [ ] All touch targets are minimum 44px
- [ ] Keyboard navigation: Tab through sidebar/tabs into active section fields
- [ ] Arrow keys navigate within radio groups
- [ ] Enter/Space activates toggle switches
- [ ] `prefers-reduced-motion`: toggle animations and section transitions are instant
- [ ] Screen reader: toggle state changes announced (via `aria-checked` update)
- [ ] Screen reader: section changes announced (via `aria-live` region or tab panel association)

### Responsive Behavior

- [ ] Mobile (< 640px): top horizontal tabs, full-width content, toggle rows use 2-line layout (label + description on separate lines from toggle), radio pills fit 3 across or wrap to 2 rows, delete modal buttons stack vertically
- [ ] Tablet (640-1024px): left sidebar (~200px), single-line toggle rows, radio pills in one row, delete modal centered at ~400px
- [ ] Desktop (> 1024px): left sidebar (~240px), content panel ~640px max-width centered, generous spacing, hover states on toggle rows

### Visual Verification Criteria

- [ ] Page background gradient matches dashboard (`from-hero-dark to-hero-mid`)
- [ ] Section cards use frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Toggle switch ON state uses `bg-primary` (`#6D28D9`)
- [ ] Toggle switch OFF state uses `bg-white/20`
- [ ] Selected radio pill uses `bg-primary/20` with `border-primary`
- [ ] Unselected radio pill uses `bg-white/5` with `border-white/15`
- [ ] Delete Account button uses `bg-red-500/20 text-red-400 border border-red-500/30`
- [ ] Delete modal backdrop is `bg-black/60`
- [ ] "Delete Everything" button uses `bg-red-500 text-white`
- [ ] Sidebar active link uses `bg-white/10`
- [ ] Notification group headers use muted uppercase styling
- [ ] Input fields use dark style (`bg-white/10 border border-white/15`)
- [ ] Vertical spacing between fields within a section is consistent (~16px)
