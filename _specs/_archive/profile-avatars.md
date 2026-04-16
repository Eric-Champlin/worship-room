# Feature: Profile and Avatars

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec extends `wr_settings.profile` (Spec 13) and reads `wr_friends`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_daily_activities`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider` and navbar logged-in state; Spec 5 (Streak & Faith Points Engine) provides `useFaithPoints()` for streak/points/level data; Spec 7 (Badge Definitions) provides all ~35 badge definitions with IDs, categories, and unlock triggers; Spec 8 (Celebrations & Badge UI) provides `BadgeGrid` component pattern; Spec 9 (Friends System) provides `wr_friends` data model and friend action logic; Spec 11 (Social Interactions) provides encouragement sending functionality; Spec 13 (Settings & Privacy) provides `wr_settings` with `privacy.streakVisibility` and avatar data fields
- Shared constants: Level thresholds and names from `dashboard/levels.ts`; badge definitions from `dashboard/badges.ts`; mood colors from `dashboard/mood-colors.ts`; encouragement messages from `dashboard/encouragements.ts`
- Shared utilities: `useAuth()` from auth context; `useToast()` from Toast system; `useFaithPoints()` from Spec 5

---

## Overview

The Profile & Avatars feature gives each Worship Room user a public-facing spiritual growth page and a personalized visual identity. In an app centered on emotional healing and community encouragement, a profile page serves as both a celebration of the user's journey and a gateway for friends to offer support. Every badge earned, every streak maintained, and every level achieved becomes visible proof that growth is happening — encouraging both the profile owner and their visitors.

The feature has two major parts:

1. **Public Profile Page** (`/profile/:userId`) — A read-only view of a user's growth data, badge collection, and stats. Accessible to anyone, but engagement data visibility is controlled by the viewed user's privacy settings. Friends can send encouragement directly from this page.

2. **Avatar System** — 16 faith-themed preset avatars across 4 categories, 4 unlockable achievement avatars, photo upload with client-side crop/resize, and an initials-based fallback. The avatar picker modal is reusable and triggered from the Settings page's "Change" button (Spec 13) and from the profile page.

This is frontend-first with localStorage and mock data, consistent with all other dashboard & growth specs.

---

## User Stories

- As a **logged-in user**, I want to view my own profile page to see a summary of my spiritual growth journey — badges, stats, streak, and level — all in one place.
- As a **logged-in user**, I want to view a friend's profile to celebrate their journey and send encouragement.
- As a **logged-in user**, I want to choose a faith-themed avatar that represents my spiritual identity.
- As a **logged-in user**, I want to upload a personal photo as my avatar so that friends recognize me.
- As a **logged-in user**, I want to unlock special avatars by reaching milestones so that my dedication is reflected in my visual identity.
- As a **logged-out visitor**, I want to view a public profile to see a user's faith journey (subject to their privacy settings).

---

## Requirements

### Route & Navigation

- **Route**: `/profile/:userId` — public route (viewable by anyone, but certain data is privacy-gated)
- **Separate from** `/prayer-wall/user/:id` — this is the growth/gamification profile, not the prayer wall author page
- **Entry points**:
  - Friend list items on `/friends` — tapping a friend's name/avatar navigates to `/profile/:friendId`
  - Leaderboard entries — tapping a user row navigates to `/profile/:userId`
  - Milestone feed entries — tapping a user mention navigates to their profile
  - Notification items referencing a user — tapping navigates to `/profile/:userId`
  - Avatar dropdown in navbar — "My Profile" link navigates to `/profile/:ownUserId`
- **Page title**: "[Display Name]'s Profile" (browser tab)

### Profile Page Layout

The profile page uses the dashboard dark theme — dark gradient background, frosted glass cards, vibrant accent colors.

**Profile Header Section:**
- Large circular avatar (120px mobile, 160px desktop) centered at the top
- Display name below the avatar in large white text
- Level badge next to/below the name — the user's current faith level name (e.g., "Blooming") with a small level icon
- Streak display (if visible per privacy): fire emoji + streak count + "day streak" label (e.g., "14-day streak")
- Faith level progress bar below the level badge — thin horizontal bar showing progress toward the next level (same pattern as the dashboard level progress bar)
- If viewing own profile: "Edit Profile" button linking to `/settings` (Profile section)
- If viewing a friend's profile: "Send Encouragement" button
- If viewing a non-friend's profile: "Add Friend" button
- If a pending outgoing request exists to this user: "Request Sent" disabled state
- If a pending incoming request from this user: "Accept Request" button
- If this user is blocked: profile should still render but with no interaction buttons

**Badge Showcase Section:**
- Section heading: "Badges" with earned count (e.g., "Badges (12/35)")
- Full grid of all ~35 badges
- Earned badges: full color, showing the badge icon and name
- Locked badges: gray silhouette with a small lock icon overlay
- Hover/focus on earned badge: tooltip or expanded view showing badge name + date earned (e.g., "Welcome Badge — Mar 1, 2026")
- Hover/focus on locked badge: tooltip showing badge name + unlock requirement (e.g., "Year of Faith — Maintain a 365-day streak")
- Badge grid adapts responsively (see Responsive Behavior section)
- When viewing own profile: earned badges may have a subtle glow or highlight
- When viewing another's profile: locked badges are visible (shows what's possible) but without unlock progress details

**Stats Section:**
- Three stat cards displayed in a row (desktop) or stacked (mobile):
  - **Total Faith Points**: Large number + "Faith Points" label
  - **Days Active**: Large number + "Days Active" label (count of unique dates in `wr_mood_entries`)
  - **Current Level**: Level name + level number + "Level" label with progress percentage to next level
- Stats use the frosted glass card pattern
- If the viewed user's privacy hides these stats (streakVisibility = "only_me" and viewer is not the user, or "friends" and viewer is not a friend), show a muted message: "This user keeps their stats private" instead of the stat values

**Social Actions Section:**
- "Send Encouragement" button: visible when viewing a friend's profile. Opens a small selection of 4 preset encouragement messages (same messages as Spec 11). On send: toast confirmation "Encouragement sent!", button changes to "Encouragement Sent" with checkmark for 3 seconds, then reverts. Cooldown: once per friend per 24 hours (reads/writes `wr_social_interactions`).
- "Add Friend" button: visible when viewing a non-friend, non-blocked user's profile. Sends a friend request (writes to `wr_friends.pendingOutgoing`). Button changes to "Request Sent" (disabled). If viewing a user who has sent the current user a friend request, show "Accept Request" instead.
- "Friends" indicator: when viewing a mutual friend, show a checkmark badge "Friends" near the name instead of the Add Friend button.

### Privacy Awareness

The profile page **must** respect the viewed user's privacy settings from `wr_settings.privacy`:

**`streakVisibility` setting:**
- `'everyone'`: streak count, faith points, level, and all stats visible to anyone
- `'friends'`: stats visible only to friends of the viewed user; non-friends see "This user keeps their stats private"
- `'only_me'`: stats hidden from everyone except the profile owner themselves

**What is always visible (regardless of privacy settings):**
- Display name
- Avatar
- Badge showcase (earned vs locked status)
- Friend/Add Friend status

**What is privacy-gated:**
- Streak count in header
- Faith points total
- Days active count
- Level name and progress bar
- Level badge in header (hidden when stats are private — just show the name and avatar)

**Viewing own profile**: Always shows all data regardless of privacy settings (the user sees their own full profile).

### Avatar System

#### 16 Preset Avatars

Organized into 4 categories of 4 avatars each. Each preset is a simple line icon rendered on a colored circular background.

**Nature (green palette):**
| Name | Icon | Background |
|------|------|------------|
| Dove | Dove line icon | `#10B981` (emerald) |
| Tree | Tree line icon | `#059669` (green) |
| Mountain | Mountain line icon | `#047857` (darker green) |
| Sunrise | Sunrise line icon | `#34D399` (lighter green) |

**Faith (purple palette):**
| Name | Icon | Background |
|------|------|------------|
| Cross | Cross line icon | `#8B5CF6` (violet) |
| Fish | Fish/Ichthys line icon | `#7C3AED` (darker violet) |
| Flame | Flame line icon | `#A78BFA` (lighter violet) |
| Crown | Crown line icon | `#6D28D9` (primary) |

**Water (blue palette):**
| Name | Icon | Background |
|------|------|------------|
| Wave | Wave line icon | `#3B82F6` (blue) |
| Raindrop | Droplet line icon | `#2563EB` (darker blue) |
| River | River/water-flow line icon | `#60A5FA` (lighter blue) |
| Anchor | Anchor line icon | `#1D4ED8` (deep blue) |

**Light (warm palette):**
| Name | Icon | Background |
|------|------|------------|
| Star | Star line icon | `#F59E0B` (amber) |
| Candle | Candle/flame line icon | `#D97706` (darker amber) |
| Lighthouse | Lighthouse line icon | `#FBBF24` (yellow) |
| Rainbow | Rainbow line icon | `#F97316` (orange) |

Each preset avatar renders as a circle with the background color and a white line icon centered inside. Icons should use Lucide icons where a match exists, or simple custom SVG paths where Lucide doesn't have an exact match (e.g., Ichthys fish symbol).

**Default avatar**: "Dove" (Nature category) — assigned to new users who haven't selected an avatar.

#### 4 Unlockable Avatars

Special premium avatars earned through achievements. Rendered with a shimmer/metallic effect to distinguish them from standard presets.

| Name | Unlock Condition | Visual |
|------|-----------------|--------|
| Golden Dove | "Year of Faith" badge (365-day streak) | Gold-tinted dove icon on golden gradient circle |
| Crystal Tree | Lighthouse level reached (10,000+ faith points) | Crystal/ice-tinted tree on silver-blue gradient circle |
| Phoenix Flame | 10 "Full Worship Day" badges earned | Fiery flame icon on warm red-orange gradient circle |
| Diamond Crown | All streak milestone badges earned | Diamond-textured crown on diamond-white gradient circle |

Unlockable avatars appear in the avatar picker with a lock overlay when not yet earned. Hovering/focusing on a locked unlockable shows the requirement. Once unlocked, they appear with their full gradient/shimmer effect and are selectable.

#### Photo Upload

- File input accepting `.jpg, .jpeg, .png, .webp`
- Maximum input file size: 2MB (validated before processing; over-limit shows inline error: "Photo must be under 2MB")
- Client-side processing via canvas:
  1. Load image into an `Image` element
  2. Crop to square (center-crop the shorter dimension)
  3. Resize to 200x200px
  4. Compress to JPEG at 80% quality via `canvas.toDataURL('image/jpeg', 0.8)`
  5. Result is a base64 data URL (~10-30KB, safe for localStorage)
- Photo preview: shows the processed result before confirming
- "Remove Photo" option available after upload (reverts to previous preset or default)
- Stored in `wr_settings.profile.avatarUrl` as the base64 data URL; `wr_settings.profile.avatarId` set to `'custom'`

#### Avatar Picker Modal

Triggered from:
- Settings page "Change" button next to avatar preview (Spec 13 currently stubs this)
- Profile page "Edit Profile" flow (optional — could link to Settings instead)

**Modal structure:**
- Dark overlay backdrop (`bg-black/60`)
- Frosted glass modal card centered on screen
- Title: "Choose Your Avatar"
- Two tabs: "Presets" (default) | "Upload Photo"
- Close button (X) in top-right corner

**Presets tab:**
- 4 category sections: Nature, Faith, Water, Light
- Each category: section heading + 4 avatar circles in a row
- Unlockable section at the bottom: "Unlockable Avatars" heading + 4 avatar circles
- Selected avatar has a ring outline (`ring-2 ring-primary`)
- Locked avatars: grayscale with lock icon overlay; clicking shows tooltip with requirement
- Unlocked avatars: full color, selectable
- Selecting a preset immediately updates the preview at the top of the modal
- "Save" button confirms the selection

**Upload Photo tab:**
- Current avatar preview (120px circle)
- "Choose File" button or drag-and-drop zone
- After file selection: shows processed preview alongside the original
- "Use This Photo" button to confirm
- "Remove Photo" button (visible only if a custom photo is currently set)
- File validation errors shown inline

**Modal behavior:**
- Focus-trapped
- Escape key closes
- Clicking outside closes (with confirmation if changes are unsaved)
- Uses `role="dialog"` with `aria-labelledby`
- Tab navigation between Presets/Upload uses `role="tablist"` pattern

#### Initials Fallback

When no avatar is set (no preset selected, no photo uploaded):
- Display a circle with the first letter (or first two initials if the name has multiple words) of the display name
- Text: white, bold, centered
- Background color: deterministic from user ID — hash the user ID string and map to one of 8 predefined colors:
  - `#6D28D9` (purple), `#2563EB` (blue), `#059669` (green), `#D97706` (amber), `#DC2626` (red), `#0891B2` (cyan), `#7C3AED` (violet), `#C026D3` (fuchsia)
- Hash function: simple string hash (sum of char codes modulo 8)
- Consistent: same user ID always produces the same color

---

## Auth Gating

### Logged-out users (demo mode):
- **Can view** `/profile/:userId` — the route is public
- Profile page renders with whatever data is available (mock data for demo profiles)
- **Cannot** send encouragement — clicking "Send Encouragement" shows auth modal: "Sign in to encourage your friends"
- **Cannot** add friend — clicking "Add Friend" shows auth modal: "Sign in to add friends"
- **Cannot** open avatar picker — the "Edit Profile" button is not visible (it only appears on own profile, which requires auth to identify)
- **Zero data persistence** — no writes to any `wr_*` keys

### Logged-in users:
- Full access to all profile features
- Can view any user's profile (privacy settings control data visibility, not page access)
- Can send encouragement to friends (with 24-hour cooldown)
- Can send friend requests to non-friends
- Can access avatar picker and change their avatar
- Avatar changes persist to `wr_settings.profile`

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| `/profile/:userId` route | Accessible, renders profile | Accessible, renders profile |
| Profile header (name, avatar) | Visible | Visible |
| Badge showcase | Visible (earned/locked status) | Visible |
| Stats section | Visible (subject to viewed user's privacy) | Visible (subject to privacy, own profile always full) |
| "Edit Profile" button | Not visible (can't identify own profile) | Visible only on own profile, links to `/settings` |
| "Send Encouragement" button | Auth modal: "Sign in to encourage your friends" | Visible on friend profiles, functional with cooldown |
| "Add Friend" button | Auth modal: "Sign in to add friends" | Visible on non-friend profiles, sends request |
| "Friends" badge | Not visible | Visible on mutual friend profiles |
| "Request Sent" state | Not visible | Visible if outgoing request exists |
| "Accept Request" button | Auth modal: "Sign in to add friends" | Visible if incoming request exists |
| Avatar picker modal | Not accessible | Opens from Settings "Change" button or via profile |

---

## UX & Design Notes

- **Tone**: Celebratory, warm, encouraging. The profile is a place to celebrate growth, not compare or judge. Locked badges show possibility, not failure. The message is "look how far you've come" and "look what's ahead."
- **Colors**: Dashboard dark theme throughout. Frosted glass cards for each section. Accent colors from badge categories and avatar palettes provide visual richness against the dark background.
- **Typography**:
  - Display name: `text-2xl md:text-3xl font-bold text-white`
  - Level name: `text-lg font-medium text-primary-lt`
  - Streak: `text-base text-white/80`
  - Section headings: `text-lg font-semibold text-white`
  - Stat values: `text-3xl font-bold text-white`
  - Stat labels: `text-sm text-white/50`
  - Badge names (tooltip): `text-sm font-medium text-white`
  - All text: Inter (no serif on this page)
- **Animations**:
  - Page entrance: fade-in (400ms) on profile content
  - Badge hover: subtle scale-up (1.05x, 150ms) on earned badges
  - Encouragement sent: button text swap with fade (200ms)
  - Avatar picker modal: fade-in backdrop + scale-in modal (200ms)
  - `prefers-reduced-motion`: all animations instant
- **Spacing**: Consistent vertical rhythm — 24px between sections, 16px between items within sections. Cards use `p-4 md:p-6` padding.

### Design System Recon References

- **Frosted glass card**: Match dashboard card pattern — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Dark page gradient**: Match dashboard background (`from-hero-dark to-hero-mid min-h-screen`)
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg` (for "Send Encouragement", "Add Friend")
- **Outline/secondary button**: `bg-white/10 text-white border border-white/20 rounded-lg py-2 px-6` (for "Edit Profile")
- **Progress bar**: Thin bar (`h-2 rounded-full bg-white/10`) with fill (`bg-primary rounded-full`) — same as level progress bar on dashboard
- **Avatar circle**: `rounded-full object-cover` with sizes: 40px (small/list), 80px (medium/settings preview), 120px (large/mobile profile), 160px (large/desktop profile)
- **Badge grid item**: `w-12 h-12 rounded-xl` (earned: colored bg + white icon) or `bg-white/5 text-white/20` (locked: gray with lock overlay)
- **Tooltip**: `bg-hero-mid border border-white/15 rounded-lg py-2 px-3 text-sm text-white shadow-lg` — positioned above/below on hover with 150ms delay

**New visual patterns**: 3
1. **Unlockable avatar gradient circles** — metallic/shimmer gradient backgrounds (golden, crystal, phoenix, diamond). These are new and should be marked `[UNVERIFIED]` during planning.
2. **Badge tooltip** — dark tooltip appearing on hover/focus over badge items. Pattern described above.
3. **Photo upload drag-and-drop zone** — dashed border area for file drop on the Upload Photo tab.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — no free-text user input on the profile page. The avatar picker and profile actions involve selections (preset choices, file upload, button clicks), not text entry. Display name and bio are edited on the Settings page (Spec 13), not here.
- **User input involved?**: Minimal — file upload only (image, not text). File is validated for type and size. No text content is submitted from the profile page itself.
- **AI-generated content?**: No — all content on this page is user data and static labels.
- **Avatar content safety**: Photo uploads are not AI-moderated in the frontend-first build. Phase 3 (backend) will add photo moderation. For now, the photo is stored only in the user's own localStorage and displayed on their profile.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Can access `/profile/:userId`** — public route
- **Zero data persistence** — no reads/writes to `wr_*` keys
- Profile data for demo profiles comes from mock data (same mock users as friends system)
- Privacy settings for mock users: default to `'friends'` visibility

### Logged-in users:
- Profile page reads from multiple localStorage keys:
  - `wr_settings.profile` — display name, avatar, bio (for own profile)
  - `wr_faith_points` — total points, level, streak data
  - `wr_badges` — earned badges with dates
  - `wr_mood_entries` — count of unique dates for "Days Active"
  - `wr_friends` — friend relationship status with viewed user
  - `wr_social_interactions` — encouragement cooldown state
  - `wr_settings.privacy` — privacy settings (for own profile's public visibility; for other users, read from their mock data)
- Avatar changes persist to `wr_settings.profile.avatarId` and `wr_settings.profile.avatarUrl`
- `logout()` does NOT clear profile/avatar data

### Route type: Public (with auth-gated actions)

---

## Data Model

### Avatar-related fields in `wr_settings.profile` (extends Spec 13)

```
profile: {
  displayName: string
  avatarId: string        // Preset ID (e.g., "nature-dove") or "custom" for photo
  avatarUrl?: string      // Base64 data URL for custom photo (~10-30KB)
  bio?: string
  email?: string
}
```

### Avatar Preset IDs

Format: `{category}-{name}` (lowercase, kebab-case)

Standard presets: `nature-dove`, `nature-tree`, `nature-mountain`, `nature-sunrise`, `faith-cross`, `faith-fish`, `faith-flame`, `faith-crown`, `water-wave`, `water-raindrop`, `water-river`, `water-anchor`, `light-star`, `light-candle`, `light-lighthouse`, `light-rainbow`

Unlockable presets: `unlock-golden-dove`, `unlock-crystal-tree`, `unlock-phoenix-flame`, `unlock-diamond-crown`

### Unlockable Avatar Requirements (reads from `wr_badges`)

| Avatar ID | Required Badge ID | Condition |
|-----------|------------------|-----------|
| `unlock-golden-dove` | `year-of-faith` | "Year of Faith" badge earned (365-day streak) |
| `unlock-crystal-tree` | `lighthouse-level` | Lighthouse level reached (10,000+ points) |
| `unlock-phoenix-flame` | `full-worship-10` | 10 "Full Worship Day" badges earned |
| `unlock-diamond-crown` | `all-streak-milestones` | All streak milestone badges earned |

Badge IDs referenced above must match the badge definitions from Spec 7. The exact badge IDs will be confirmed during planning.

### Profile Data for Other Users (Mock)

When viewing another user's profile, data comes from the mock friend profiles in `wr_friends.friends` (for friends) or from the mock user data in `dashboard-mock-data.ts` (for non-friends). Each mock user has:
- `id`, `displayName`, `avatar`
- `level`, `levelName`, `currentStreak`, `faithPoints`, `weeklyPoints`
- Mock badge data (subset of badges marked as earned)
- Privacy settings defaulting to `{ streakVisibility: 'friends' }`

---

## Edge Cases

- **Own profile with no data**: New user who just signed up has 0 points, Seedling level, 0-day streak, only the Welcome badge. All stats display as zero, not hidden. The level progress bar shows 0% toward Sprout.
- **Invalid userId in URL**: If `:userId` doesn't match any known user (current user or mock users), show a "Profile not found" message with a link back to the friends page or dashboard.
- **Avatar preset not found**: If `wr_settings.profile.avatarId` references an unknown preset ID, fall back to initials.
- **Custom photo corrupted**: If `avatarUrl` contains invalid base64 or doesn't load, fall back to initials.
- **Very long display name**: Truncate with ellipsis at 30 characters in the header. Full name shown on hover/focus via `title` attribute.
- **Encouragement cooldown**: If user already sent encouragement to this friend in the last 24 hours, the button shows "Encouraged today" in a disabled state. Cooldown is per-friend, not global.
- **User viewing their own profile via link**: If the logged-in user navigates to `/profile/:ownId`, show the "Edit Profile" button instead of "Add Friend" or "Send Encouragement."
- **Blocked user's profile**: The profile page renders (name, avatar visible) but all interaction buttons are hidden. Stats are hidden (treated as "only_me" privacy). Badge showcase still visible.
- **Photo upload on mobile**: The file input should trigger the native camera/photo picker on mobile devices. The drag-and-drop zone is hidden on mobile (file input button only).
- **Photo upload errors**: File too large (> 2MB), wrong format, or processing failure — show inline error message, don't close the modal. Previous avatar is preserved.
- **Multiple unlockable badges not yet defined**: If Spec 7's badge IDs don't match exactly, the avatar unlock check should gracefully handle missing badge IDs (avatar stays locked, no error).
- **localStorage quota**: Photo avatars (~10-30KB) should not cause quota issues. If a `QuotaExceededError` occurs on save, show a toast error: "Unable to save avatar — storage is full. Try removing some data."

---

## Responsive Behavior

### Mobile (< 640px)

- **Profile header**: Avatar (120px), name, level, streak — all centered, stacked vertically
- **Action buttons**: Full-width, stacked vertically with 8px gap
- **Badge grid**: 6 columns (48px badges with 8px gap — fits 6 across at 375px with padding)
- **Stats section**: 3 stat cards stacked vertically (full-width each)
- **Avatar picker modal**: Full-screen (or near full-screen) with `inset-4` margins
- **Avatar picker presets tab**: 4 avatars per row per category
- **Avatar picker upload tab**: No drag-and-drop zone (file input button only), full-width preview
- **Badge tooltips**: Tap to show (not hover), dismiss on outside tap
- **Minimum touch targets**: All interactive badges, buttons, and avatars are at least 44px

### Tablet (640-1024px)

- **Profile header**: Avatar (140px), name and level inline, streak below
- **Action buttons**: Inline (side by side) if two buttons, centered
- **Badge grid**: 8 columns
- **Stats section**: 3 stat cards in a row (equal width)
- **Avatar picker modal**: Centered, ~500px max-width
- **Avatar picker presets tab**: 4 avatars per row per category
- **Badge tooltips**: Hover with 150ms delay

### Desktop (> 1024px)

- **Profile header**: Avatar (160px), name and level inline to the right of avatar (horizontal layout), streak and progress bar below the name
- **Action buttons**: Inline next to name/level area
- **Badge grid**: 10 columns (can fit all ~35 badges with manageable scrolling)
- **Stats section**: 3 stat cards in a row with generous spacing
- **Avatar picker modal**: Centered, ~560px max-width
- **Avatar picker presets tab**: 4 avatars per row per category, with category labels
- **Badge tooltips**: Hover with 150ms delay, positioned above badge
- **Page max-width**: ~800px centered content area

---

## Out of Scope

- **Backend API persistence** — Phase 3 (all data in localStorage)
- **Real authentication** — Phase 3 (uses simulated auth from Spec 2's AuthProvider)
- **Photo moderation / content safety on uploads** — Phase 3 backend feature
- **Profile editing inline** (name, bio edits) — handled by Settings page (Spec 13); profile page links to Settings
- **Activity feed / timeline on profile** — not in MVP (future: "Recent Activity" section)
- **Custom profile backgrounds or themes** — not in MVP
- **Profile sharing (social media cards)** — not in MVP
- **Spotify listening history on profile** — not in MVP
- **Prayer wall posts on profile** — separate page at `/prayer-wall/user/:id`
- **Real-time avatar sync across tabs** — listen for `storage` events is nice-to-have but not required for MVP
- **Animated avatar effects** (particle trails, glow animations on unlockable avatars) — too complex for MVP; static gradient backgrounds are sufficient
- **Custom SVG drawing for all 16 icons** — use Lucide icons where available, simple SVG paths for unavailable ones only
- **Photo cropping UI** (crop handles, drag-to-reposition) — auto center-crop is sufficient for MVP; full crop UI is a future enhancement

---

## Acceptance Criteria

### Route & Navigation

- [ ] `/profile/:userId` route exists and is publicly accessible
- [ ] Page title in browser tab shows "[Display Name]'s Profile"
- [ ] Invalid userId shows "Profile not found" message with navigation link
- [ ] Friend list entries on `/friends` navigate to `/profile/:friendId` on tap
- [ ] Leaderboard entries navigate to `/profile/:userId` on tap
- [ ] Avatar dropdown in navbar contains "My Profile" link for logged-in users

### Profile Header

- [ ] Avatar displays at 120px (mobile) / 160px (desktop) using the user's selected preset, uploaded photo, or initials fallback
- [ ] Display name shown in large white bold text, truncated with ellipsis at 30 characters
- [ ] Level badge displays level name and icon next to the display name (when privacy allows)
- [ ] Streak count displays with fire emoji and "day streak" label (when privacy allows)
- [ ] Level progress bar shows percentage toward next level (thin bar, primary fill on white/10 background)
- [ ] On own profile: "Edit Profile" button visible, links to `/settings`
- [ ] On friend's profile: "Send Encouragement" button visible
- [ ] On non-friend's profile: "Add Friend" button visible
- [ ] On pending outgoing request: "Request Sent" disabled state
- [ ] On pending incoming request: "Accept Request" button visible
- [ ] On mutual friend: "Friends" checkmark badge visible

### Badge Showcase

- [ ] All ~35 badges displayed in a responsive grid
- [ ] Earned badges render in full color with badge icon
- [ ] Locked badges render as gray silhouettes with lock icon overlay
- [ ] Hover/focus on earned badge shows tooltip with badge name + date earned
- [ ] Hover/focus on locked badge shows tooltip with badge name + unlock requirement
- [ ] Mobile: badges use tap-to-show tooltip (not hover), dismiss on outside tap
- [ ] Section heading shows earned count: "Badges (N/35)"
- [ ] Badge grid columns adapt: 6 (mobile), 8 (tablet), 10 (desktop)

### Stats Section

- [ ] Three stat cards: Total Faith Points, Days Active, Current Level
- [ ] Stat cards use frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Stats respect viewed user's `streakVisibility` privacy setting
- [ ] When stats are private (non-friend viewing `friends`-only profile, or anyone viewing `only_me`): shows "This user keeps their stats private"
- [ ] Own profile always shows all stats regardless of own privacy setting
- [ ] Days Active calculated from unique dates in `wr_mood_entries`
- [ ] Mobile: stat cards stack vertically; desktop/tablet: 3 in a row

### Social Actions

- [ ] "Send Encouragement" button on friend profiles opens 4 preset message choices
- [ ] Sending encouragement shows toast "Encouragement sent!" and changes button to "Encouragement Sent" with checkmark for 3 seconds
- [ ] Encouragement cooldown: button shows "Encouraged today" (disabled) if already sent within 24 hours to this friend
- [ ] "Add Friend" button sends friend request, writes to `wr_friends.pendingOutgoing`, button changes to "Request Sent"
- [ ] Logged-out user clicking "Send Encouragement" sees auth modal: "Sign in to encourage your friends"
- [ ] Logged-out user clicking "Add Friend" sees auth modal: "Sign in to add friends"

### Privacy

- [ ] Profile respects `streakVisibility = 'everyone'`: all visitors see stats
- [ ] Profile respects `streakVisibility = 'friends'`: only mutual friends see stats
- [ ] Profile respects `streakVisibility = 'only_me'`: only the profile owner sees stats
- [ ] Avatar and display name always visible regardless of privacy
- [ ] Badge showcase always visible regardless of privacy
- [ ] Blocked user's profile: interaction buttons hidden, stats hidden, page still renders

### Avatar System — Presets

- [ ] 16 preset avatars available across 4 categories (Nature, Faith, Water, Light)
- [ ] Each preset renders as a colored circle with a white line icon
- [ ] Preset IDs follow `{category}-{name}` format
- [ ] Default avatar is "Dove" (nature-dove) for users who haven't selected

### Avatar System — Unlockable

- [ ] 4 unlockable avatars displayed in a separate "Unlockable Avatars" section in the picker
- [ ] Locked unlockable avatars show grayscale with lock overlay
- [ ] Locked unlockable hover/focus shows the unlock requirement
- [ ] Unlocked avatars display with gradient/metallic background and are selectable
- [ ] Unlock status correctly reads from `wr_badges` earned badges

### Avatar System — Photo Upload

- [ ] File input accepts `.jpg, .jpeg, .png, .webp`
- [ ] Files over 2MB are rejected with inline error: "Photo must be under 2MB"
- [ ] Image is center-cropped to square, resized to 200x200px, compressed to JPEG 80%
- [ ] Processed image shown as preview before confirming
- [ ] "Remove Photo" option reverts to previous preset or default
- [ ] Saved to `wr_settings.profile.avatarUrl` as base64 data URL; `avatarId` set to `'custom'`
- [ ] Mobile: drag-and-drop zone hidden, file input button only
- [ ] `QuotaExceededError` on save shows toast: "Unable to save avatar — storage is full. Try removing some data."

### Avatar System — Initials Fallback

- [ ] When no avatar is set, displays circle with first letter(s) of display name
- [ ] Background color is deterministic from user ID hash (same ID = same color every time)
- [ ] Initials text is white, bold, centered
- [ ] Works at all avatar sizes (40px, 80px, 120px, 160px)

### Avatar Picker Modal

- [ ] Modal opens with dark overlay backdrop (`bg-black/60`)
- [ ] Modal uses frosted glass card style
- [ ] Title: "Choose Your Avatar"
- [ ] Two tabs: "Presets" (default) and "Upload Photo"
- [ ] Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` pattern
- [ ] Presets tab shows 4 categories with 4 avatars each + unlockable section
- [ ] Selected avatar has ring outline (`ring-2 ring-primary`)
- [ ] "Save" button confirms selection and closes modal
- [ ] Modal is focus-trapped
- [ ] Escape key closes modal
- [ ] Clicking outside closes modal
- [ ] Modal uses `role="dialog"` with `aria-labelledby`
- [ ] Close (X) button in top-right corner

### Accessibility

- [ ] All interactive elements (buttons, badges, avatar options) have minimum 44px touch targets
- [ ] Keyboard navigation: Tab through header actions, badge grid, stat cards
- [ ] Badge grid items are focusable with visible focus outlines
- [ ] Avatar picker radio-like selection supports arrow key navigation
- [ ] Screen reader: badge tooltips announced via `aria-describedby` or similar
- [ ] Screen reader: profile sections have appropriate headings hierarchy
- [ ] `prefers-reduced-motion`: all hover animations, page fade-in, and badge scale-up are instant
- [ ] Color contrast meets WCAG AA on dark backgrounds (white text on dark cards)
- [ ] Encouragement message selection accessible via keyboard

### Responsive Behavior

- [ ] Mobile (< 640px): avatar 120px, centered vertical layout, full-width action buttons, 6-column badge grid, stacked stat cards, near-full-screen avatar picker modal
- [ ] Tablet (640-1024px): avatar 140px, 8-column badge grid, 3-column stat cards, ~500px avatar picker modal
- [ ] Desktop (> 1024px): avatar 160px, horizontal header layout (avatar left, info right), 10-column badge grid, 3-column stat cards, ~560px avatar picker modal, ~800px page max-width

### Visual Verification Criteria

- [ ] Page background gradient matches dashboard (`from-hero-dark to-hero-mid`)
- [ ] Profile header card uses frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Stat cards use frosted glass pattern
- [ ] "Send Encouragement" / "Add Friend" buttons use primary CTA style (`bg-primary text-white rounded-lg`)
- [ ] "Edit Profile" button uses outline style (`bg-white/10 border border-white/20 text-white`)
- [ ] Earned badges render with full color; locked badges render in gray with lock overlay
- [ ] Level progress bar: `h-2 rounded-full bg-white/10` track with `bg-primary` fill
- [ ] Avatar picker modal overlay is `bg-black/60`
- [ ] Avatar picker modal card uses frosted glass pattern
- [ ] Selected avatar in picker has `ring-2 ring-primary` outline
- [ ] Preset avatar circles display colored backgrounds with white icons
- [ ] Unlockable avatars display gradient backgrounds when unlocked
- [ ] Initials fallback circles display deterministic background colors
