# Implementation Plan: Profile & Avatars

**Spec:** `_specs/profile-avatars.md`
**Date:** 2026-03-18
**Branch:** `claude/feature/profile-avatars`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Relevant Existing Files & Patterns

**Auth system:**
- `contexts/AuthContext.tsx` — `AuthProvider` with `useAuth()` hook. Returns `{ isAuthenticated, user: { name, id }, login, logout }`. Simulated auth via localStorage (`wr_auth_simulated`, `wr_user_name`, `wr_user_id`).
- `components/prayer-wall/AuthModalProvider.tsx` — `useAuthModal()` for gating actions. Shows "Sign in to [action]" modal.

**Dashboard components (frosted glass dark theme):**
- `components/dashboard/BadgeGrid.tsx` — Renders all ~35 badges in sections, earned (colored) vs locked (grayscale + lock icon), tooltips. Uses `getBadgeData()` from `services/badge-storage.ts`.
- `components/dashboard/StreakCard.tsx` — Streak count, faith points, level, progress bar. Progress bar uses `h-1.5 rounded-full bg-white/10` with `bg-primary` fill.
- `components/dashboard/DashboardCard.tsx` — Reusable frosted glass card wrapper.
- `components/dashboard/CelebrationOverlay.tsx` — Full-screen celebration with confetti.

**Settings system:**
- `components/settings/ProfileSection.tsx` — Avatar preview (initials circle `h-20 w-20`), "Change" button (currently shows "Avatar picker coming soon" toast), display name input, bio textarea. All in frosted glass card.
- `services/settings-storage.ts` — `getSettings()`, `saveSettings()`, `updateSettings()`. Default avatarId is `'default'`.
- `types/settings.ts` — `UserSettingsProfile` has `displayName`, `avatarId`, `avatarUrl?`, `bio?`, `email?`. `UserSettingsPrivacy` has `streakVisibility: 'everyone' | 'friends' | 'only_me'`.

**Friends system:**
- `hooks/useFriends.ts` — `useFriends()` returns friends, pendingIncoming, pendingOutgoing, blocked, suggestions, and action functions. Auth-gated (returns empty data when logged out).
- `mocks/friends-mock-data.ts` — `MOCK_FRIENDS` (10 profiles), `ALL_MOCK_USERS` (20+), `MOCK_SUGGESTIONS`. Each `FriendProfile` has `id, displayName, avatar, level, levelName, currentStreak, faithPoints, weeklyPoints, lastActive`.
- `components/friends/FriendRow.tsx` — Already navigates to `/profile/${friend.id}` on click.

**Social interactions:**
- `components/social/EncourageButton.tsx` — Heart icon button, opens `EncouragePopover` with 4 preset messages. Uses `useSocialInteractions()` for `sendEncouragement()` and `canEncourage()`.
- `components/social/EncouragePopover.tsx` — Shows 4 preset messages in dropdown (desktop) or bottom sheet (mobile). Fully accessible with arrow key nav.
- `services/social-storage.ts` — `canEncourage()` checks `getEncouragementCountToday() < MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY` (3/day). `getSocialInteractions()` reads `wr_social_interactions`.

**Existing Avatar component (Prayer Wall):**
- `components/prayer-wall/Avatar.tsx` — Simple avatar with initials fallback. Sizes: sm (32px), md (40px), lg (64px). Deterministic color from userId via char code sum modulo 8 colors. Does NOT support preset avatars. Uses `AVATAR_COLORS` array: `['#6D28D9', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D']`.

**Badge definitions:**
- `constants/dashboard/badges.ts` — All ~35 badge definitions. Key IDs for unlockable avatars: `streak_365` (Year of Faith), `level_6` (Lighthouse), `full_worship_day` (repeatable with count), `streak_7` through `streak_365` (all streak milestones).
- `constants/dashboard/badge-icons.ts` — `getBadgeIcon(badgeId)` returns `{ icon, bgColor, textColor, glowColor }`. Pattern: category defaults + per-badge overrides.

**Level system:**
- `constants/dashboard/levels.ts` — `LEVEL_THRESHOLDS`: Seedling(0), Sprout(100), Blooming(500), Flourishing(1500), Oak(4000), Lighthouse(10000). `getLevelForPoints(points)` returns level, name, pointsToNextLevel.

**Mood storage:**
- `services/mood-storage.ts` — `getMoodEntries()` returns `MoodEntry[]` from `wr_mood_entries`.

**Routing:**
- `App.tsx` — Provider stack: `QueryClientProvider → BrowserRouter → AuthProvider → ToastProvider → AuthModalProvider → AudioProvider → Routes`. No `/profile/:userId` route yet.
- `RootRoute()` — renders `Dashboard` when authenticated, `Home` when not.

**Navbar:**
- `components/Navbar.tsx` — `AVATAR_MENU_LINKS` array: Dashboard, Friends, Journal, Prayer Requests, Favorites, Insights, Settings. NO "My Profile" link yet. `MOBILE_DRAWER_EXTRA_LINKS` for mobile drawer. Avatar dropdown shows user initial in circle.

### Directory Conventions

- Pages: `src/pages/*.tsx`
- Components by feature: `src/components/{feature}/*.tsx`
- Shared components: `src/components/shared/*.tsx` or `src/components/ui/*.tsx`
- Tests: `src/components/{feature}/__tests__/*.test.tsx` or co-located
- Hooks: `src/hooks/*.ts`
- Constants: `src/constants/dashboard/*.ts`
- Types: `src/types/*.ts`
- Mock data: `src/mocks/*.ts`
- Services: `src/services/*.ts`
- Utilities: `src/lib/*.ts`

### Test Patterns

- Framework: Vitest + React Testing Library
- `beforeEach(() => localStorage.clear())`
- Components using auth context: wrap in `AuthProvider` (or mock `useAuth`)
- Components using routing: wrap in `MemoryRouter`
- Components using toast: wrap in `ToastProvider`
- Components using auth modal: wrap in `AuthModalProvider`
- Props: define `DEFAULT_PROPS` const, use `renderComponent(overrides?)` helper

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Send Encouragement | Auth modal: "Sign in to encourage your friends" | Step 6 | `useAuthModal()` |
| Add Friend | Auth modal: "Sign in to add friends" | Step 6 | `useAuthModal()` |
| Accept Request | Auth modal: "Sign in to add friends" | Step 6 | `useAuthModal()` |
| Edit Profile button | Only visible on own profile (requires auth to identify) | Step 6 | `useAuth().isAuthenticated` |
| Avatar picker | Only accessible from Settings (auth-gated page) | Step 4 | Page-level auth gate on `/settings` |
| Avatar data writes | No writes for logged-out users | Step 4 | `useAuth().isAuthenticated` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | gradient | `bg-gradient-to-b from-hero-dark to-hero-mid min-h-screen` | Dashboard.tsx pattern |
| Frosted glass card | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md |
| Card padding | padding | `p-4 md:p-6` | 09-design-system.md |
| Primary CTA button | classes | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | spec visual criteria |
| Outline button | classes | `bg-white/10 text-white border border-white/20 rounded-lg py-2 px-6` | spec visual criteria |
| Progress bar track | classes | `h-2 rounded-full bg-white/10` | spec visual criteria |
| Progress bar fill | classes | `h-full rounded-full bg-primary` | spec visual criteria |
| Display name | typography | `text-2xl md:text-3xl font-bold text-white` | spec UX notes |
| Level name | typography | `text-lg font-medium text-primary-lt` | spec UX notes |
| Streak text | typography | `text-base text-white/80` | spec UX notes |
| Section heading | typography | `text-lg font-semibold text-white` | spec UX notes |
| Stat value | typography | `text-3xl font-bold text-white` | spec UX notes |
| Stat label | typography | `text-sm text-white/50` | spec UX notes |
| Tooltip | classes | `bg-hero-mid border border-white/15 rounded-lg py-2 px-3 text-sm text-white shadow-lg` | spec design notes |
| Modal overlay | classes | `bg-black/60` | spec design notes |
| Selected avatar ring | classes | `ring-2 ring-primary` | spec design notes |
| Badge cell | size | `h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20` | BadgeGrid.tsx:103 |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, but profile page uses Inter only (no serif per spec)
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Badge earned glow: `boxShadow: 0 0 12px {glowColor}` (from BadgeGrid.tsx)
- Level icons: Sprout, Leaf, Flower2, TreePine, Trees, Landmark (from badge-icons.ts)
- Existing Prayer Wall Avatar uses `AVATAR_COLORS` array with `charCodeAt` sum modulo 8 — spec requires same 8 colors for initials fallback (confirmed match: `['#6D28D9', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D']` vs spec's `['#6D28D9', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#7C3AED', '#C026D3']`)
- ⚠️ Spec's 8th color is `#C026D3` (fuchsia) but existing Avatar uses `#BE185D` (pink). Use spec's colors for new ProfileAvatar; existing Prayer Wall Avatar is unchanged.
- `prefers-reduced-motion`: all animations instant
- All interactive elements: minimum 44px touch targets
- No `dangerouslySetInnerHTML` anywhere — all text rendered as plain text

---

## Shared Data Models (from Master Plan)

```typescript
// From types/dashboard.ts — used by profile page
interface FriendProfile {
  id: string; displayName: string; avatar: string;
  level: number; levelName: string; currentStreak: number;
  faithPoints: number; weeklyPoints: number; lastActive: string;
}

interface FriendsData {
  friends: FriendProfile[];
  pendingIncoming: FriendRequest[];
  pendingOutgoing: FriendRequest[];
  blocked: string[];
}

interface BadgeData {
  earned: Record<string, BadgeEarnedEntry>;
  newlyEarned: string[];
  activityCounts: ActivityCounts;
}

// From types/settings.ts — avatar fields
interface UserSettingsProfile {
  displayName: string;
  avatarId: string;       // 'nature-dove', 'faith-cross', 'custom', etc.
  avatarUrl?: string;     // Base64 data URL for custom photo
  bio?: string;
  email?: string;
}

interface UserSettingsPrivacy {
  streakVisibility: 'everyone' | 'friends' | 'only_me';
  // ...other fields
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_settings` | Both | Profile (avatarId, avatarUrl, displayName), Privacy (streakVisibility) |
| `wr_friends` | Read | Friend list, pending requests, blocked users |
| `wr_faith_points` | Read | Total points, level data |
| `wr_streak` | Read | Current streak, longest streak |
| `wr_badges` | Read | Earned badges (for badge showcase + unlockable avatar checks) |
| `wr_mood_entries` | Read | Count unique dates for "Days Active" |
| `wr_social_interactions` | Both | Encouragement cooldown state |
| `wr_daily_activities` | Read | Activity data |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Avatar 120px, centered vertical layout, full-width stacked buttons, 6-col badge grid, stacked stat cards, near-full-screen avatar picker |
| Tablet | 640-1024px | Avatar 140px, 8-col badge grid, 3-col stat cards row, ~500px avatar picker modal |
| Desktop | > 1024px | Avatar 160px, horizontal header (avatar left, info right), 10-col badge grid, 3-col stat cards, ~560px modal, ~800px page max-width |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Page top → Profile Header | `pt-8 md:pt-12` | codebase inspection (Dashboard pattern) |
| Profile Header → Badge Showcase | `mt-6` (24px) | spec: "24px between sections" |
| Badge Showcase → Stats Section | `mt-6` (24px) | spec: "24px between sections" |
| Stats Section → page bottom | `pb-12` | codebase inspection |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 2 (Dashboard Shell) with AuthProvider is complete and committed
- [x] Spec 5 (Streak & Faith Points Engine) with `useFaithPoints()` is complete
- [x] Spec 7 (Badge Definitions) with all ~35 badges is complete
- [x] Spec 8 (Celebrations & Badge UI) with `BadgeGrid` is complete
- [x] Spec 9 (Friends System) with `wr_friends` data model is complete
- [x] Spec 11 (Social Interactions) with encouragement functionality is complete
- [x] Spec 13 (Settings & Privacy) with `wr_settings` and privacy controls is complete
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from design-system.md + codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Fish (Ichthys) and custom SVG icons confirmed during Step 1 implementation

**Design system recon note:** Recon captured 2026-03-06, before dashboard/growth features were built. Dashboard dark theme values come from codebase inspection of existing dashboard components, not from the recon.

**Encouragement cooldown discrepancy:** Spec says "once per friend per 24 hours" on profile page, but existing `MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY = 3`. Decision: Profile page uses a per-friend "already encouraged today" check (`getEncouragementCountToday() > 0`), which is stricter than the friend list's 3/day. This gives the profile page a "one encouragement visit" feel while the friend list allows multiple.

**Progress bar height:** Spec visual criteria says `h-2`, but existing StreakCard uses `h-1.5`. Decision: Use `h-2` for the profile page per spec. This is a minor visual difference from the dashboard that can be unified later.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `avatarId = 'default'` handling | Map to `nature-dove` preset | Spec says Dove is the default; existing settings store 'default' as initial value |
| Unlockable badge ID mappings | `streak_365`, `level_6`, `full_worship_day` (count >= 10), all 7 streak badges | Confirmed from `constants/dashboard/badges.ts` |
| Mock user badge data | Generate heuristically from level/streak | No mock badge data exists; compute plausible earned badges per mock user |
| Mock user "Days Active" | Derive from `faithPoints / 15` (rough average) | FriendProfile type lacks daysActive; heuristic is reasonable |
| Initials fallback colors | Use spec's 8 colors (includes #C026D3 fuchsia) | Spec defines different 8th color than existing Prayer Wall Avatar (#BE185D). New component, new colors. |
| Profile encourage cooldown | `getEncouragementCountToday() > 0` (1/day) | Stricter than friend list (3/day) per spec "once per friend per 24 hours" |
| "Edit Profile" on profile page | Links to `/settings` | Spec acceptance criteria: "links to /settings" |
| Drag-and-drop on mobile | Hidden (file input only) | Spec: "drag-and-drop zone hidden on mobile" |
| Custom SVG icons | Ichthys fish, candle, river | Lucide lacks direct matches; use inline SVG components |
| Profile "not found" | Show message + link to dashboard or friends | Spec edge case for invalid userId |

---

## Implementation Steps

### Step 1: Avatar Data Model & Constants

**Objective:** Define the 16 preset avatars, 4 unlockable avatars, icon mappings, and utility functions for avatar rendering and photo processing.

**Files to create/modify:**
- `frontend/src/constants/dashboard/avatars.ts` — All avatar definitions
- `frontend/src/lib/avatar-utils.ts` — Initials generation, deterministic color, photo processing

**Details:**

`avatars.ts`:
- Define `AvatarPreset` interface: `{ id: string, name: string, category: 'nature' | 'faith' | 'water' | 'light', icon: LucideIcon | React.FC<SVGProps>, bgColor: string }`
- Define `UnlockableAvatar` interface: `{ id: string, name: string, icon: LucideIcon | React.FC<SVGProps>, gradient: string, requiredBadgeId: string | string[], unlockCheck: (badges: BadgeData) => boolean }`
- Export `AVATAR_PRESETS`: 16 presets organized by category with exact hex bg colors from spec
- Export `UNLOCKABLE_AVATARS`: 4 unlockables with gradient CSS and unlock check functions
- Export `AVATAR_CATEGORIES`: `['nature', 'faith', 'water', 'light']`
- Export `DEFAULT_AVATAR_ID = 'nature-dove'`
- Export `getAvatarById(id: string): AvatarPreset | UnlockableAvatar | null`

Lucide icon mappings (confirm at implementation):
- Nature: `Bird` (Dove), `TreePine` (Tree), `Mountain`, `Sunrise`
- Faith: `Cross` (check Lucide availability — may need custom), custom `IchthysFish` SVG, `Flame`, `Crown`
- Water: `Waves` (Wave), `Droplet` (Raindrop), custom `River` SVG or `Waves`, `Anchor`
- Light: `Star`, custom `Candle` SVG or `Flame`, `Landmark` (Lighthouse), `Rainbow`

Unlockable avatar unlock checks:
```typescript
'unlock-golden-dove': (badges) => !!badges.earned['streak_365']
'unlock-crystal-tree': (badges) => !!badges.earned['level_6']
'unlock-phoenix-flame': (badges) => (badges.earned['full_worship_day']?.count ?? 0) >= 10
'unlock-diamond-crown': (badges) => ['streak_7','streak_14','streak_30','streak_60','streak_90','streak_180','streak_365'].every(id => !!badges.earned[id])
```

[UNVERIFIED] Unlockable avatar gradients:
- Golden Dove: `linear-gradient(135deg, #D4A017 0%, #FFD700 50%, #B8860B 100%)`
- Crystal Tree: `linear-gradient(135deg, #87CEEB 0%, #E0E8F0 50%, #5B9BD5 100%)`
- Phoenix Flame: `linear-gradient(135deg, #FF4500 0%, #FF6347 50%, #DC143C 100%)`
- Diamond Crown: `linear-gradient(135deg, #E8E8E8 0%, #FFFFFF 50%, #C0C0C0 100%)`
→ To verify: Run /verify-with-playwright and compare against design intent
→ If wrong: Adjust gradients based on visual review

`avatar-utils.ts`:
- `getInitials(displayName: string): string` — first letter, or first two initials if multiple words
- `getInitialsColor(userId: string): string` — sum of char codes modulo 8, mapped to spec's 8 colors: `['#6D28D9', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#7C3AED', '#C026D3']`
- `processAvatarPhoto(file: File): Promise<string>` — validates type/size, center-crops to square, resizes to 200x200, compresses to JPEG 80%, returns base64 data URL. Throws descriptive errors for invalid file type, oversized file, or processing failure.
- `ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']`
- `MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024` (2MB)

**Guardrails (DO NOT):**
- Do NOT import from or modify Prayer Wall's `Avatar.tsx` — the new avatar system is separate
- Do NOT use animated shimmer effects for unlockables — static gradients only per spec Out of Scope
- Do NOT hardcode badge IDs inline — reference them from `constants/dashboard/badges.ts`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getInitials` with single word name | unit | Returns first letter |
| `getInitials` with multi-word name | unit | Returns first two initials |
| `getInitials` with empty string | unit | Returns '?' or empty |
| `getInitialsColor` deterministic | unit | Same userId always returns same color |
| `getInitialsColor` distribution | unit | Different userIds produce varied colors |
| `getAvatarById` valid preset | unit | Returns correct preset object |
| `getAvatarById` valid unlockable | unit | Returns correct unlockable object |
| `getAvatarById` 'default' maps to nature-dove | unit | Maps legacy 'default' to nature-dove |
| `getAvatarById` unknown ID | unit | Returns null |
| `processAvatarPhoto` rejects > 2MB | unit | Throws with "Photo must be under 2MB" |
| `processAvatarPhoto` rejects invalid type | unit | Throws with descriptive error |
| Unlockable unlock checks with mocked badge data | unit | Each check returns correct boolean |
| All 16 presets have valid data | unit | IDs match `{category}-{name}` format |
| All 4 unlockables have valid data | unit | Each has gradient, icon, unlock check |

**Expected state after completion:**
- [ ] 16 avatar presets defined with categories, icons, and colors
- [ ] 4 unlockable avatars defined with gradient CSS and badge-based unlock checks
- [ ] Utility functions for initials, color, and photo processing
- [ ] `processAvatarPhoto` uses canvas API for client-side image manipulation

---

### Step 2: ProfileAvatar Component

**Objective:** Create a reusable avatar rendering component that supports all avatar types (preset, custom photo, initials fallback) at multiple sizes.

**Files to create/modify:**
- `frontend/src/components/shared/ProfileAvatar.tsx` — The avatar component

**Details:**

```typescript
interface ProfileAvatarProps {
  avatarId: string        // Preset ID, 'custom', or 'default'
  avatarUrl?: string      // Base64 data URL for custom photos
  displayName: string     // For initials fallback
  userId: string          // For deterministic color
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'  // 40px, 80px, 120px, 140px, 160px
  className?: string
  badges?: BadgeData      // For unlockable avatar unlock status
}
```

Size mapping:
- `xs`: `h-10 w-10` (40px) — list items, navbar
- `sm`: `h-20 w-20` (80px) — settings preview
- `md`: `h-[120px] w-[120px]` — mobile profile
- `lg`: `h-[140px] w-[140px]` — tablet profile
- `xl`: `h-[160px] w-[160px]` — desktop profile

Icon size scaling: `xs` → `h-5 w-5`, `sm` → `h-8 w-8`, `md` → `h-12 w-12`, `lg` → `h-14 w-14`, `xl` → `h-16 w-16`

Rendering logic:
1. If `avatarId === 'custom'` and `avatarUrl` is valid → render `<img>` with `rounded-full object-cover` and onError fallback to initials
2. If `avatarId` matches an unlockable and the unlock check passes (via `badges` prop) → render icon on gradient circle
3. If `avatarId` matches a preset → render icon (white) on colored circle
4. If `avatarId` matches an unlockable but NOT unlocked → render icon in grayscale with lock overlay (same as locked badge)
5. Fallback → render initials circle using `getInitials()` and `getInitialsColor()`

Accessibility:
- `role="img"` on the container
- `aria-label="{displayName}'s avatar"` (or `aria-hidden="true"` when decorative next to name text)

**Responsive behavior:**
- Component is size-agnostic — parent controls which size to use
- Icons scale proportionally within the circle

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` for SVG icons — use React components
- Do NOT render locked unlockable avatars as selectable — they show grayscale
- Do NOT modify the existing Prayer Wall `Avatar.tsx`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders preset avatar with correct bg color and icon | unit | Check background-color style and icon presence |
| Renders custom photo as `<img>` tag | unit | Check img src matches avatarUrl |
| Falls back to initials on img error | unit | Simulate onError, check initials render |
| Renders initials when avatarId is empty/unknown | unit | Check initials text and color |
| Renders correct initials for multi-word name | unit | "Sarah M." → "SM" |
| Renders unlocked unlockable with gradient | unit | Pass badges with required badge earned |
| Renders locked unlockable in grayscale | unit | Pass empty badges, check grayscale/lock |
| Maps 'default' to nature-dove | unit | avatarId='default' renders Dove preset |
| All 5 sizes render correctly | unit | Check container dimensions |
| Has correct aria-label | unit | Check role="img" and aria-label |

**Expected state after completion:**
- [ ] ProfileAvatar renders all 4 avatar types correctly
- [ ] Works at all 5 sizes
- [ ] Graceful fallback chain: custom photo → preset → unlockable → initials

---

### Step 3: Avatar Picker Modal

**Objective:** Create the avatar picker modal with Presets tab and Upload Photo tab, fully accessible with focus trapping and keyboard navigation.

**Files to create/modify:**
- `frontend/src/components/shared/AvatarPickerModal.tsx` — The modal

**Details:**

```typescript
interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatarId: string
  currentAvatarUrl?: string
  badges: BadgeData
  onSave: (avatarId: string, avatarUrl?: string) => void
}
```

Modal structure:
- Dark overlay: `fixed inset-0 z-50 bg-black/60`
- Modal card: `fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-[500px] lg:max-w-[560px] sm:w-full max-h-[90vh] overflow-y-auto`
- Card style: `bg-hero-mid border border-white/15 rounded-2xl shadow-xl`
- Padding: `p-4 md:p-6`
- Title: "Choose Your Avatar" — `text-xl font-bold text-white`
- Close (X) button: top-right, `h-8 w-8` with `X` Lucide icon

Tab system (accessible):
- Container: `role="tablist"` with `aria-label="Avatar selection method"`
- Two tabs: "Presets" (default) | "Upload Photo"
- Active tab: `bg-white/10 text-white`, inactive: `text-white/50`
- Tab panels: `role="tabpanel"` with `aria-labelledby`

**Presets tab:**
- 4 category sections: Nature, Faith, Water, Light
- Category heading: `text-xs font-semibold uppercase tracking-wider text-white/40`
- 4 avatar circles per row: Use `ProfileAvatar` at `sm` size (80px) — actually smaller in picker, use `xs` (40px) or custom 56px
- [UNVERIFIED] Avatar circle size in picker: 56px circles with 12px gap
  → To verify: Test at all breakpoints for touch target compliance
  → If wrong: Adjust to 48px minimum for 44px touch target compliance
- Selected avatar: `ring-2 ring-primary ring-offset-2 ring-offset-hero-mid`
- Locked unlockable: grayscale, clicking shows tooltip with requirement
- "Unlockable Avatars" section at bottom

Preview: Current selection shown at top of the Presets tab as a larger (80px) preview circle.

"Save" button at bottom: `bg-primary text-white font-semibold py-3 px-8 rounded-lg w-full`

**Upload Photo tab:**
- Current avatar preview (120px circle) using `ProfileAvatar`
- "Choose File" button: `bg-white/10 text-white border border-white/20 rounded-lg py-3 px-6`
- Hidden `<input type="file" accept=".jpg,.jpeg,.png,.webp">`
- Desktop: Drag-and-drop zone — dashed border area (`border-2 border-dashed border-white/20 rounded-xl p-8`)
- Mobile: No drag-and-drop zone, only file button
- After file selection: processed preview (120px) + "Use This Photo" button
- "Remove Photo" button: visible only when custom photo is currently set
- Inline error display for file validation failures
- QuotaExceededError: caught on save, shows toast "Unable to save avatar — storage is full."

**Accessibility:**
- `role="dialog"` with `aria-labelledby="avatar-picker-title"` and `aria-modal="true"`
- Focus trapped via `useFocusTrap()` hook (existing)
- Escape key closes
- Tab key cycles within modal
- Avatar selection: radio-like pattern. Each avatar in a category group uses `role="radio"` with `aria-checked`. Arrow keys navigate within the group.

**Animations:**
- Modal entrance: `motion-safe:animate-dropdown-in` (existing animation)
- `prefers-reduced-motion`: instant

**Guardrails (DO NOT):**
- Do NOT use `<input type="file" capture>` — this forces camera on mobile; use standard file input which shows camera+gallery picker
- Do NOT store unprocessed photos — always process via `processAvatarPhoto()`
- Do NOT close modal on save failure — show error inline
- Do NOT use `dangerouslySetInnerHTML` for any content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Modal renders with overlay when isOpen=true | unit | Check bg-black/60 overlay |
| Modal hidden when isOpen=false | unit | Nothing rendered |
| Presets tab shows all 16 presets in 4 categories | unit | Count avatar items |
| Unlockable section shows 4 unlockable avatars | unit | Check section and count |
| Selecting a preset updates preview and ring | unit | Click preset, check ring class |
| Save button calls onSave with selected avatarId | unit | Click preset → Save → check callback |
| Locked unlockable shows lock overlay | unit | Empty badges, check grayscale |
| Upload tab: file input triggers on button click | unit | Check file input activation |
| Upload tab: rejects > 2MB file | integration | Mock file, check error message |
| Upload tab: shows processed preview | integration | Mock valid file, check preview |
| Upload tab: "Remove Photo" visible when custom photo set | unit | Check button visibility |
| Escape key closes modal | unit | Simulate Escape, check onClose |
| Focus trapped within modal | unit | Tab key stays in modal |
| Has role="dialog" and aria-labelledby | unit | Check ARIA attributes |
| Tabs use role="tablist" pattern | unit | Check tab ARIA |
| Mobile: no drag-and-drop zone | unit | Mock mobile viewport, check zone hidden |

**Expected state after completion:**
- [ ] Avatar picker modal with two functional tabs
- [ ] Presets tab shows all 20 avatars (16 standard + 4 unlockable)
- [ ] Upload tab processes photos client-side
- [ ] Fully accessible: focus trap, keyboard nav, ARIA roles

---

### Step 4: Settings Integration

**Objective:** Replace the "Avatar picker coming soon" toast in ProfileSection with the actual AvatarPickerModal, wiring avatar selection to settings storage.

**Files to create/modify:**
- `frontend/src/components/settings/ProfileSection.tsx` — Wire avatar picker

**Details:**

Changes to `ProfileSection.tsx`:
1. Add state: `const [pickerOpen, setPickerOpen] = useState(false)`
2. Replace the `onClick={() => showToast('Avatar picker coming soon')}` on the "Change" button with `onClick={() => setPickerOpen(true)}`
3. Replace the initials-only avatar display (`h-20 w-20` circle) with `<ProfileAvatar avatarId={profile.avatarId} avatarUrl={profile.avatarUrl} displayName={displayName || userName || ''} userId={userId} size="sm" />`
4. Add `<AvatarPickerModal>` with `isOpen={pickerOpen}` and handlers
5. `onSave` handler:
   - Call `onUpdateProfile({ avatarId, avatarUrl })` (existing prop)
   - Handle `QuotaExceededError` — catch and show toast
   - Close modal
6. Get `userId` from `useAuth()` — add `const { user } = useAuth()` and `const userId = user?.id || ''`
7. Get `badges` for unlockable status — `const badgeData = useMemo(() => getBadgeData(), [])`

**Auth gating:** Settings page itself is already auth-gated. No additional check needed.

**Guardrails (DO NOT):**
- Do NOT change the displayName or bio logic — only touch avatar-related code
- Do NOT remove the "coming soon" note from the bio section — bio display IS still coming soon on the profile page
- Do NOT change the frosted glass card styling

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Change" button opens avatar picker modal | integration | Click Change, check modal renders |
| Avatar picker Save updates profile avatar display | integration | Select preset → Save → check ProfileAvatar |
| ProfileAvatar renders current preset | unit | Set avatarId, check correct avatar |
| ProfileAvatar renders custom photo | unit | Set avatarId='custom' + avatarUrl |
| ProfileAvatar renders initials fallback | unit | Set avatarId='default', check initials |

**Expected state after completion:**
- [ ] Settings ProfileSection shows actual avatar via ProfileAvatar
- [ ] "Change" button opens AvatarPickerModal
- [ ] Selecting and saving an avatar updates `wr_settings.profile.avatarId` and `avatarUrl`
- [ ] No "coming soon" toast on Change button

---

### Step 5: Profile Data Hook & Mock Profile Data

**Objective:** Create a hook that aggregates profile data for any user (self or other) and mock profile data for non-self users.

**Files to create/modify:**
- `frontend/src/hooks/useProfileData.ts` — Profile data aggregation hook
- `frontend/src/mocks/profile-mock-data.ts` — Mock badge/stats data for mock users

**Details:**

`profile-mock-data.ts`:
- Export `getMockUserProfile(userId: string)` — Looks up user in `ALL_MOCK_USERS`, returns enriched profile data
- For each mock user, generate plausible:
  - `earnedBadges: Record<string, BadgeEarnedEntry>` — derive from level (level badges up to their level), streak (streak badges up to their streak), plus welcome badge. Higher-level users get more badges.
  - `daysActive: number` — `Math.ceil(faithPoints / 15)` (reasonable heuristic)
  - `avatarId: string` — assign each mock user a unique preset avatar (e.g., Sarah → 'nature-dove', James → 'faith-cross', Maria → 'water-wave', etc.)
  - `privacy: { streakVisibility: 'friends' }` — default per spec
- Export `MOCK_USER_AVATARS: Record<string, string>` — maps each mock user ID to an avatar preset ID

`useProfileData.ts`:
```typescript
interface ProfileData {
  found: boolean
  isOwnProfile: boolean
  // User info
  displayName: string
  avatarId: string
  avatarUrl?: string
  userId: string
  bio?: string
  // Stats (null if privacy-hidden)
  totalPoints: number | null
  currentLevel: number | null
  levelName: string | null
  pointsToNextLevel: number | null
  currentStreak: number | null
  longestStreak: number | null
  daysActive: number | null
  // Privacy
  statsVisible: boolean
  privacyMessage?: string  // "This user keeps their stats private"
  // Badges (always visible)
  badgeData: BadgeData
  // Relationship
  relationship: 'self' | 'friend' | 'pending-outgoing' | 'pending-incoming' | 'blocked' | 'none'
}

function useProfileData(userId: string): ProfileData
```

Logic:
1. Get current user from `useAuth()` — if `userId === user.id`, it's own profile
2. Own profile: read from `wr_settings`, `wr_faith_points`, `wr_streak`, `wr_badges`, `wr_mood_entries` → always show all stats
3. Other profile: look up in friends data (`wr_friends`) and mock data
4. Determine relationship: check friends list, pending requests, blocked list
5. Privacy logic: read the viewed user's `streakVisibility`
   - Own profile: always visible
   - `'everyone'`: visible to all
   - `'friends'`: visible only if relationship is 'friend'
   - `'only_me'`: visible only to self
6. Blocked user: treat as `only_me` privacy + hide interaction buttons
7. Return `found: false` if userId doesn't match current user or any mock user

**Guardrails (DO NOT):**
- Do NOT write to any localStorage keys — this hook is read-only
- Do NOT expose mood text or mood data — only engagement stats
- Do NOT return mock data for the current user — always use real localStorage

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Own profile returns correct data from localStorage | unit | Mock localStorage, check all fields |
| Own profile always has statsVisible=true | unit | Regardless of privacy setting |
| Friend profile with privacy='friends' is visible | unit | Check statsVisible=true |
| Non-friend with privacy='friends' hides stats | unit | Check statsVisible=false, privacyMessage |
| Privacy='everyone' shows stats to all | unit | Non-friend can see stats |
| Privacy='only_me' hides from everyone except self | unit | Even friends can't see |
| Blocked user hides stats and shows no interaction buttons | unit | relationship='blocked' |
| Unknown userId returns found=false | unit | Invalid ID handling |
| Mock user has plausible badge data | unit | Check earned badges match level |
| Relationship detection: friend, pending-outgoing, pending-incoming | unit | Check each relationship type |

**Expected state after completion:**
- [ ] `useProfileData` aggregates data from multiple localStorage keys
- [ ] Privacy logic correctly gates stats visibility
- [ ] Mock users have plausible badge, stat, and avatar data
- [ ] Relationship status correctly determined

---

### Step 6: Profile UI Components

**Objective:** Build the three main sections of the profile page as separate components.

**Files to create/modify:**
- `frontend/src/components/profile/ProfileHeader.tsx` — Avatar, name, level, actions
- `frontend/src/components/profile/ProfileStats.tsx` — Three stat cards
- `frontend/src/components/profile/ProfileBadgeShowcase.tsx` — Badge grid for profile

**Details:**

**ProfileHeader.tsx:**

Props: `{ profileData: ProfileData, onEncourage: () => void, onAddFriend: () => void, onAcceptRequest: () => void }`

Structure:
- Desktop (> 1024px): horizontal layout — avatar (160px) left, info block right
- Mobile (< 640px): centered vertical stack — avatar (120px) on top
- Tablet (640-1024px): centered, avatar (140px), info below

Elements:
- `ProfileAvatar` at responsive size (`md`/`lg`/`xl` via responsive classes)
- Display name: `text-2xl md:text-3xl font-bold text-white` — truncate at 30 chars with `title` for full name
- Level badge (when statsVisible): level icon + level name in `text-lg font-medium text-primary-lt`
- Streak (when statsVisible): `🔥 {count}-day streak` in `text-base text-white/80`
- Progress bar (when statsVisible): `h-2 rounded-full bg-white/10` track, `bg-primary` fill
- Action buttons (mutually exclusive):
  - Own profile: "Edit Profile" outline button → `Link to="/settings"`
  - Friend: "Send Encouragement" primary button → opens EncouragePopover
  - Pending outgoing: "Request Sent" disabled button
  - Pending incoming: "Accept Request" primary button
  - Non-friend: "Add Friend" primary button
  - Blocked: no buttons
  - Logged-out + any social button: auth modal

Encourage button on profile:
- Shows 4 presets via `EncouragePopover` (reuse existing component)
- After send: button text → "Encouragement Sent ✓" for 3 seconds, then reverts
- Cooldown: if `getEncouragementCountToday(currentUserId, profileUserId) > 0`, show "Encouraged today" (disabled)

"Friends" badge: When relationship is 'friend', show a `✓ Friends` badge near the name.

**ProfileStats.tsx:**

Props: `{ profileData: ProfileData }`

Structure:
- 3 stat cards in a row (desktop/tablet) or stacked (mobile)
- Desktop/tablet: `grid grid-cols-3 gap-4`
- Mobile: `grid grid-cols-1 gap-4`
- Each card: frosted glass pattern `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`

Cards:
1. Total Faith Points: `{number}` in `text-3xl font-bold text-white`, "Faith Points" in `text-sm text-white/50`
2. Days Active: `{number}` in `text-3xl font-bold text-white`, "Days Active" in `text-sm text-white/50`
3. Current Level: level name in `text-3xl font-bold text-white`, "Level {n}" in `text-sm text-white/50`, progress percentage

When `!statsVisible`: render single card spanning full width with "This user keeps their stats private" in `text-base text-white/40 text-center`

**ProfileBadgeShowcase.tsx:**

Props: `{ badgeData: BadgeData, isOwnProfile: boolean }`

Structure:
- Follows existing `BadgeGrid` pattern but with profile-specific layout
- Section heading: `"Badges ({earnedCount}/{totalCount})"` in `text-lg font-semibold text-white`
- Badge grid: responsive columns — `grid-cols-6` (mobile), `grid-cols-8` (tablet), `grid-cols-10` (desktop)
- Earned badges: full color with icon, glow shadow
- Locked badges: `opacity-40 grayscale` with lock icon overlay
- Tooltips:
  - Earned: "{badge name} — {date earned}"
  - Locked: "{badge name} — {unlock requirement}"
  - Mobile: tap to show, dismiss on outside tap
  - Desktop: hover with 150ms delay

Badge hover animation: `motion-safe:hover:scale-105` (150ms transition)

Own profile earned badges: subtle extra glow (`boxShadow: 0 0 16px` vs `0 0 12px`)

**Auth gating:**
- "Send Encouragement" click when logged out → `openAuthModal('Sign in to encourage your friends')`
- "Add Friend" click when logged out → `openAuthModal('Sign in to add friends')`
- "Accept Request" click when logged out → `openAuthModal('Sign in to add friends')`

**Responsive behavior:**
- Desktop (> 1024px): Header horizontal layout, 10-col badge grid, 3-col stats row
- Tablet (640-1024px): Header centered vertical, 8-col badge grid, 3-col stats row
- Mobile (< 640px): Header centered vertical, 6-col badge grid, stacked stats, full-width buttons

**Guardrails (DO NOT):**
- Do NOT expose mood data (mood level, mood text) — only engagement stats
- Do NOT show unlock progress details on other users' locked badges per spec
- Do NOT make badge grid scrollable on profile (unlike dashboard's `max-h-[60vh]`)
- Do NOT use horizontal scroll for stats — always wrap to new row on mobile

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ProfileHeader renders name and avatar | unit | Check name text and ProfileAvatar |
| ProfileHeader shows "Edit Profile" on own profile | unit | isOwnProfile=true, check button |
| ProfileHeader shows "Send Encouragement" on friend profile | unit | relationship='friend' |
| ProfileHeader shows "Add Friend" on non-friend | unit | relationship='none' |
| ProfileHeader shows "Request Sent" disabled for pending-outgoing | unit | Check disabled state |
| ProfileHeader shows "Accept Request" for pending-incoming | unit | Check button text |
| ProfileHeader hides buttons for blocked | unit | relationship='blocked' |
| ProfileHeader hides level/streak when statsVisible=false | unit | Check elements not rendered |
| ProfileHeader truncates long name | unit | 30+ char name, check truncation |
| ProfileStats renders 3 cards with values | unit | Check 3 cards, values |
| ProfileStats shows privacy message when hidden | unit | statsVisible=false |
| ProfileBadgeShowcase shows earned count | unit | Check "Badges (N/35)" text |
| ProfileBadgeShowcase earned badge has color | unit | Check no grayscale class |
| ProfileBadgeShowcase locked badge has grayscale | unit | Check grayscale + lock icon |
| Badge tooltip shows name + date for earned | unit | Hover/focus, check tooltip |
| Badge tooltip shows requirement for locked | unit | Hover/focus on locked badge |
| Auth modal on encourage when logged out | integration | Mock logged out, click, check modal |
| Auth modal on add friend when logged out | integration | Mock logged out, click, check modal |

**Expected state after completion:**
- [ ] ProfileHeader renders correctly for all 6 relationship states
- [ ] ProfileStats shows 3 cards or privacy message
- [ ] ProfileBadgeShowcase shows all badges with correct earned/locked state
- [ ] Auth gating works for all social actions
- [ ] Responsive at all 3 breakpoints

---

### Step 7: Profile Page & Route Wiring

**Objective:** Create the profile page, add the route to App.tsx, and add "My Profile" to the navbar dropdown.

**Files to create/modify:**
- `frontend/src/pages/GrowthProfile.tsx` — Profile page
- `frontend/src/App.tsx` — Add route
- `frontend/src/components/Navbar.tsx` — Add "My Profile" link

**Details:**

**GrowthProfile.tsx:**

```typescript
export function GrowthProfile() {
  const { userId } = useParams<{ userId: string }>()
  const profileData = useProfileData(userId || '')
  // ...
}
```

Page structure:
- `<Layout>` wrapper (same as other pages)
- Background: `min-h-screen bg-gradient-to-b from-hero-dark to-hero-mid`
- Content: `max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 pb-12`
- Page title: `document.title = \`${profileData.displayName}'s Profile\``

Sections (in order):
1. `<ProfileHeader />` — with handlers for encourage, add friend, accept
2. `<ProfileBadgeShowcase />` — with `mt-6`
3. `<ProfileStats />` — with `mt-6`

Not found state: When `profileData.found === false`:
- Center-aligned message: "Profile not found"
- Link: "Go to Friends" (`/friends`) and "Go Home" (`/`)
- Same dark background

Encouragement handler: Uses `useSocialInteractions()` to `sendEncouragement()`, shows toast, manages button state.

Add Friend handler: Uses `useFriends()` `sendRequest()`, updates relationship state.

Accept Request handler: Uses `useFriends()` `acceptRequest()`, updates relationship.

Page entrance animation: `motion-safe:animate-fade-in` on the content container.

**App.tsx changes:**
- Import `GrowthProfile` from `@/pages/GrowthProfile`
- Add route: `<Route path="/profile/:userId" element={<GrowthProfile />} />`
- Place after other static routes, before the `*` catch-all

**Navbar.tsx changes:**
- Add "My Profile" as the first item in `AVATAR_MENU_LINKS` — but it needs dynamic `to` value based on `user.id`, so render it separately before the static links
- In `DesktopUserActions` avatar dropdown: add `<Link to={/profile/${user.id}}>My Profile</Link>` as first item
- In `MobileDrawer` extra links: add "My Profile" link with dynamic `to`
- Use same styling as other dropdown items

**Guardrails (DO NOT):**
- Do NOT use `useEffect` to set document.title — use a small hook or inline in render
- Do NOT import `useFriends` in GrowthProfile if it's already used in useProfileData — avoid double-reading localStorage. If social actions need write capabilities, import `useFriends` in GrowthProfile for mutation actions only.
- Do NOT add the route inside the `import.meta.env.DEV` conditional — this is a production route
- Do NOT put "My Profile" in the static `AVATAR_MENU_LINKS` array — it needs dynamic URL

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GrowthProfile renders for own profile | integration | Mock auth + localStorage, check page |
| GrowthProfile renders for friend profile | integration | Mock mock user, check page |
| GrowthProfile shows "Profile not found" for invalid userId | integration | Check not-found message |
| Document title set correctly | integration | Check document.title |
| Page has correct background gradient | integration | Check gradient classes |
| Navbar "My Profile" link present in avatar dropdown | integration | Mock auth, check link |
| Navbar "My Profile" navigates to /profile/:userId | integration | Check href |
| Route /profile/:userId renders GrowthProfile | integration | MemoryRouter test |
| Page fade-in animation class present | unit | Check animate-fade-in |

**Expected state after completion:**
- [ ] `/profile/:userId` route works for self, friends, mock users, and invalid IDs
- [ ] Navbar has "My Profile" link in avatar dropdown (desktop + mobile)
- [ ] Page sets browser tab title
- [ ] All profile sections render in correct order with correct spacing

---

### Step 8: Navigation Entry Points

**Objective:** Wire remaining navigation entry points to profile pages (leaderboard, milestone feed, notifications).

**Files to create/modify:**
- `frontend/src/components/friends/LeaderboardTab.tsx` — Add click-to-profile on leaderboard rows (if not already present)
- `frontend/src/components/dashboard/FriendsPreview.tsx` — Add click-to-profile on milestone feed entries
- `frontend/src/components/dashboard/NotificationItem.tsx` — Ensure notification actionUrl points to profile where appropriate

**Details:**

**LeaderboardTab.tsx:**
- Leaderboard rows should navigate to `/profile/:userId` on click
- Add `onClick={() => navigate(/profile/${entry.id})}` and `cursor-pointer` class to each row
- Add `role="link"` and keyboard handler (`Enter`/`Space`)
- Highlight current user's row (no navigation needed for own row — or navigate to own profile)

**FriendsPreview.tsx:**
- Milestone feed entries mention friend names — wrap name in `<Link to={/profile/${event.userId}}>` with `text-white hover:underline`
- Top 3 friend avatars should link to profiles

**NotificationItem.tsx:**
- Notification items that reference a user (encouragement, friend_request, friend_milestone) should have `actionUrl` set to `/profile/:userId`
- Verify that `handleTap()` navigates correctly when `actionUrl` is a profile URL
- No changes needed if `actionUrl` is already populated correctly by the notification creation code

**Guardrails (DO NOT):**
- Do NOT break existing click handlers or interactions on these components
- Do NOT add navigation to blocked users in the leaderboard
- Do NOT change the visual styling of these components — only add navigation behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Leaderboard row navigates to /profile/:id on click | integration | Check navigation |
| Milestone feed friend name links to /profile/:id | unit | Check Link href |
| FriendsPreview friend avatar links to /profile/:id | unit | Check Link href |

**Expected state after completion:**
- [ ] Leaderboard entries clickable → profile
- [ ] Milestone feed names link to profiles
- [ ] Notification items navigate to profiles where appropriate

---

### Step 9: Tests — Avatar System

**Objective:** Comprehensive tests for avatar constants, utilities, ProfileAvatar component, and AvatarPickerModal.

**Files to create/modify:**
- `frontend/src/constants/dashboard/__tests__/avatars.test.ts` — Avatar constant tests
- `frontend/src/lib/__tests__/avatar-utils.test.ts` — Utility function tests
- `frontend/src/components/shared/__tests__/ProfileAvatar.test.tsx` — Component tests
- `frontend/src/components/shared/__tests__/AvatarPickerModal.test.tsx` — Modal tests

**Details:**

Tests are specified in Steps 1-4 above. This step consolidates them into test files.

Test structure follows existing patterns:
- `describe('ComponentName', () => { ... })`
- `beforeEach(() => localStorage.clear())`
- Helper `renderComponent(overrides?)` function
- Wrapper with providers: `MemoryRouter`, `ToastProvider`, `AuthProvider` as needed
- File validation tests for photo upload use mock `File` objects

Focus on:
- All 16 presets have correct IDs, names, categories, colors
- All 4 unlockables have correct unlock conditions
- Photo processing error paths (oversized, wrong type, canvas failure)
- Modal accessibility (focus trap, ARIA, keyboard nav)
- Settings integration (picker → save → avatar updates)

**Expected state after completion:**
- [ ] All avatar constants validated
- [ ] Utility functions edge cases covered
- [ ] ProfileAvatar renders all variant types correctly
- [ ] AvatarPickerModal fully accessible and functional
- [ ] Settings integration tests pass

---

### Step 10: Tests — Profile Page

**Objective:** Comprehensive tests for profile page, profile components, data hook, and navigation.

**Files to create/modify:**
- `frontend/src/hooks/__tests__/useProfileData.test.ts` — Hook tests
- `frontend/src/components/profile/__tests__/ProfileHeader.test.tsx` — Header tests
- `frontend/src/components/profile/__tests__/ProfileStats.test.tsx` — Stats tests
- `frontend/src/components/profile/__tests__/ProfileBadgeShowcase.test.tsx` — Badge showcase tests
- `frontend/src/pages/__tests__/GrowthProfile.test.tsx` — Page integration tests

**Details:**

Tests are specified in Steps 5-8 above. This step consolidates them.

Test wrapper for profile components:
```typescript
function renderWithProviders(ui: ReactElement, options?: { route?: string }) {
  return render(
    <MemoryRouter initialEntries={[options?.route || '/profile/test-id']}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            {ui}
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
```

Key test scenarios:
- Own profile: all data visible, "Edit Profile" button
- Friend profile: stats visible (friends privacy), "Send Encouragement" button
- Non-friend: stats hidden (friends privacy), "Add Friend" button
- Blocked user: no interaction buttons, stats hidden
- Logged-out viewer: auth modal on social actions
- Invalid userId: "Profile not found" state
- Privacy permutations: everyone/friends/only_me × self/friend/non-friend/logged-out
- Encouragement cooldown: send → button disabled → toast shown
- Badge showcase: correct earned/locked counts
- Responsive: action buttons stack on mobile (use container width mocks)

**Expected state after completion:**
- [ ] useProfileData hook tested for all user types and privacy combos
- [ ] Profile components tested for all relationship states
- [ ] Auth gating tested for all protected actions
- [ ] Edge cases covered (empty data, invalid IDs, corrupted localStorage)
- [ ] All tests pass with `pnpm test`

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Avatar data model & constants |
| 2 | 1 | ProfileAvatar component |
| 3 | 1, 2 | Avatar picker modal |
| 4 | 2, 3 | Settings integration |
| 5 | 1 | Profile data hook & mock data |
| 6 | 2, 5 | Profile UI components |
| 7 | 6 | Profile page & route wiring |
| 8 | 7 | Navigation entry points |
| 9 | 1, 2, 3, 4 | Tests — avatar system |
| 10 | 5, 6, 7, 8 | Tests — profile page |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Avatar Data Model & Constants | [COMPLETE] | 2026-03-18 | Created `constants/dashboard/avatars.ts` (16 presets, 4 unlockables, lookup utils) and `lib/avatar-utils.ts` (initials, color, photo processing). Used Lucide `Fish` instead of custom Ichthys SVG. 34 tests passing. |
| 2 | ProfileAvatar Component | [COMPLETE] | 2026-03-18 | Created `components/shared/ProfileAvatar.tsx` with 5-tier fallback chain (custom photo → unlocked unlockable → preset → locked unlockable → initials). 5 sizes, ARIA support. 12 tests passing. |
| 3 | Avatar Picker Modal | [COMPLETE] | 2026-03-18 | Created `components/shared/AvatarPickerModal.tsx` with Presets + Upload Photo tabs, focus trap, ARIA, locked/unlocked states, drag-and-drop (desktop only), photo processing. 14 tests passing. |
| 4 | Settings Integration | [COMPLETE] | 2026-03-18 | Updated `ProfileSection.tsx`: replaced initials avatar with `ProfileAvatar`, replaced "coming soon" toast with `AvatarPickerModal`, wired `onSave` with QuotaExceededError handling. All 14 existing Settings tests pass. |
| 5 | Profile Data Hook & Mock Data | [COMPLETE] | 2026-03-18 | Created `hooks/useProfileData.ts` (aggregates data from localStorage/mock, privacy logic, relationship detection) and `mocks/profile-mock-data.ts` (avatar assignments, badge generation, days active heuristic). 10 tests passing. |
| 6 | Profile UI Components | [COMPLETE] | 2026-03-18 | Created `ProfileHeader.tsx` (6 relationship states, progress bar, encourage popover), `ProfileStats.tsx` (3 stat cards + privacy message), `ProfileBadgeShowcase.tsx` (responsive grid, tooltips, glow). 16 tests passing. |
| 7 | Profile Page & Route Wiring | [COMPLETE] | 2026-03-18 | Created `pages/GrowthProfile.tsx`, added `/profile/:userId` route to App.tsx, added "My Profile" to desktop avatar dropdown and mobile drawer in Navbar.tsx. 6 tests passing. |
| 8 | Navigation Entry Points | [COMPLETE] | 2026-03-18 | Added click-to-profile on `LeaderboardRow.tsx` (with keyboard nav), profile links on `FriendsPreview.tsx` top-3 entries, and profile links on `MilestoneFeed.tsx` avatars. Fixed tests with MemoryRouter. 21 tests passing. |
| 9 | Tests — Avatar System | [COMPLETE] | 2026-03-18 | All avatar system tests consolidated and verified: 34 (avatars constants) + 14 (avatar-utils) + 12 (ProfileAvatar) + 14 (AvatarPickerModal) = 60 tests passing. Tests written alongside Steps 1-4. |
| 10 | Tests — Profile Page | [COMPLETE] | 2026-03-18 | All profile page tests verified: 10 (useProfileData) + 10 (ProfileHeader) + 2 (ProfileStats) + 4 (ProfileBadgeShowcase) + 6 (GrowthProfile page) = 32 tests. Fixed ProfileSection tests (AuthProvider wrapper, updated avatar picker test). Fixed LeaderboardRow/MilestoneFeed/edge-cases tests (MemoryRouter). Full suite: 1969/1970 pass (1 pre-existing test isolation issue in useNotifications — passes in isolation). |
