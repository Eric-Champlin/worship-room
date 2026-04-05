# Worship Room — Dashboard & Growth Feature: 16-Spec Implementation Plan (v2)

## Overview

This document is the **complete reference** for building the Dashboard & Growth feature (Phase 2.75). Every design decision, data model, interaction pattern, component structure, and edge case is specified here. Each spec section is self-contained and ready to be handed to `/spec` in Claude Code.

**Build approach**: Frontend-first with localStorage and mock data, identical to the Music and Prayer Wall patterns. Backend wiring deferred to Phase 3.

**Theme**: All-dark dashboard matching the Growth Teasers section — dark purple gradient background, frosted glass cards (`backdrop-blur`, `bg-white/5`, `border border-white/10`), vibrant accent colors for data visualization.

**Gamification philosophy**: "Gentle gamification" — celebrate presence, never punish absence. Mood data is always private. Engagement data (streak, points, level) is controllable by the user via privacy settings.

---

## Spec Overview

| Spec | Name | Key Deliverables |
|------|------|-----------------|
| 1 | Mood Check-In System | Full-screen check-in, mood data model, localStorage persistence |
| 2 | Dashboard Shell | Route switching, hero section, widget grid, collapsible cards, navbar logged-in state |
| 3 | Mood Insights Dashboard Widget | 7-day mood line chart on dashboard, Recharts dependency |
| 4 | `/insights` Full Page | Heatmap, line chart, time ranges, AI insight placeholders |
| 5 | Streak & Faith Points Engine | Activity tracking, point calculation, streak logic, `useFaithPoints` hook |
| 6 | Dashboard Widgets + Activity Integration | Streak card, activity checklist, `recordActivity()` in existing components |
| 7 | Badge Definitions & Unlock Logic | All badge categories, data model, trigger detection, level progression |
| 8 | Celebrations & Badge Collection UI | Toasts, full-screen overlays, confetti, badge grid |
| 9 | Friends System | `/friends` page, mutual friend model, search, invite, mock data |
| 10 | Leaderboard | Friends + global leaderboard, weekly reset, dashboard widget |
| 11 | Social Interactions | Encouragements, milestone feed, nudges, weekly recap |
| 12 | Notification System | Bell icon, dropdown panel, toast system, mock data |
| 13 | Settings & Privacy | `/settings` page, 4 sections, all privacy toggles |
| 14 | Profile & Avatars | Public profile, preset + photo avatars, badge showcase |
| 15 | AI Insights & Monthly Report | Mock AI cards, monthly report UI, email template |
| 16 | Empty States & Polish | All empty states, transition animations, micro-interactions |

---

## Shared Utility: Date Functions

Multiple specs need consistent local-timezone date handling. Create `utils/date.ts` in **Spec 1** — all subsequent specs import from it.

```typescript
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return getLocalDateString(monday);
}
```

**Critical**: Never use `new Date().toISOString().split('T')[0]` for "today" — it returns UTC, not local time. At 11pm EST, it returns *tomorrow's* date.

---

## Spec 1: Mood Check-In System

### Summary

Full-screen daily mood check-in that appears once per day for logged-in users before the dashboard loads. This is the foundational data entry point — everything downstream (insights, streaks, points, AI analysis) consumes mood data.

### Check-In Screen Design

**Entrance**: Fade-in (opacity 0→1, 400ms ease-in-out). No slide, no zoom — gentle and non-jarring.

**Layout**:
- Dark background with subtle radial gradient (deep purple center fading to near-black edges)
- Centered content, vertically and horizontally
- "How are you feeling today, [Name]?" in warm serif typography (e.g., `font-serif text-2xl md:text-3xl text-white/90`)
- Mood buttons below the greeting
- Optional text area below mood buttons (hidden until mood selected)
- "Not right now" skip link at the very bottom, small and understated (`text-sm text-white/40 hover:text-white/60`)

**Mood Buttons**:
- 5 buttons: **Struggling, Heavy, Okay, Good, Thriving**
- Visual style: Abstract colored circles/orbs (~56px diameter mobile, ~64px desktop) with the label beneath
- Each orb uses its mood color as a subtle fill with low opacity at rest, glowing brighter on hover/focus
- Layout: Horizontal row on desktop (5 across), 2-row stacked on mobile (3 top: Struggling, Heavy, Okay + 2 bottom centered: Good, Thriving)
- Idle state: Gentle pulse animation on all orbs (`motion-safe:animate-pulse` with reduced intensity)
- Selected state: Selected orb scales up (1.15x) with full glow in its mood color. Unselected orbs fade to 30% opacity.

**Mood Colors** (used throughout dashboard, charts, heatmap):
| Mood | Value | Color | Hex |
|------|-------|-------|-----|
| Struggling | 1 | Deep warm amber | `#D97706` |
| Heavy | 2 | Muted copper/orange | `#C2703E` |
| Okay | 3 | Neutral gray-purple | `#8B7FA8` |
| Good | 4 | Soft teal | `#2DD4BF` |
| Thriving | 5 | Vibrant green-gold | `#34D399` |

**After Mood Selection**:
1. Selected orb glows, others fade (200ms transition)
2. Text area slides in below: "Want to share what's on your heart?" — textarea with 280-char limit, character counter, placeholder text in `text-white/40`
3. "Continue" button appears below textarea (primary CTA style)
4. User can skip the text and tap Continue immediately

**Crisis Keyword Detection**: The optional text input is checked against the existing crisis keyword detection system (conservative keyword list per `01-ai-safety.md`). If crisis keywords detected: instead of the encouragement verse, show the crisis resource banner (988 Suicide & Crisis Lifeline, SAMHSA). Mood entry is still saved. Dashboard loads after banner is dismissed. Skip crisis check if text input is empty.

**Encouragement Verse Transition** (only if no crisis keywords detected):
- After Continue (or if no text input, directly after mood tap + 500ms pause):
- Screen content fades out (300ms)
- Single encouragement verse fades in, centered, in italic serif typography
- **One verse per mood level, always the same** (creates ritual familiarity):
  - Struggling: "The Lord is near to the brokenhearted, and saves those who have a crushed spirit." — Psalm 34:18 (WEB)
  - Heavy: "Cast your burden on the Lord, and he will sustain you." — Psalm 55:22 (WEB)
  - Okay: "Be still, and know that I am God." — Psalm 46:10 (WEB)
  - Good: "Give thanks to the Lord, for he is good, for his loving kindness endures forever." — Psalm 107:1 (WEB)
  - Thriving: "This is the day that the Lord has made. We will rejoice and be glad in it!" — Psalm 118:24 (WEB)
- Verse displays for 3 seconds, then auto-advances
- No "Continue" button during verse display — the moment is cinematic
- Verse fades out (300ms), dashboard fades in (400ms)

**State Machine**:
```
idle → mood_selected → text_input → [crisis_check] → verse_display → complete
                                    └→ crisis_banner → complete
```

### Skip Behavior

- "Not right now" → skip directly to dashboard, no mood recorded
- **Skip is respected**: Check-in does NOT re-appear later that day. One chance per day.
- The activity checklist on the dashboard shows "Log your mood" as unchecked — this is the only gentle reminder
- No popup, no modal, no guilt

### Auth Gating

- Check-in appears **only for logged-in users**. It is the threshold into the authenticated dashboard experience.
- Logged-out users see the landing page at `/` as before — no check-in, no dashboard.

### Implementation Approach

- **Conditional render inside the Dashboard page component** (not a separate route, not a portal)
- Dashboard component checks: `hasCheckedInToday()` via localStorage lookup
- If false and not skipped → render `<MoodCheckIn onComplete={handleCheckIn} onSkip={handleSkip} />`
- If true or skipped → render `<DashboardContent />`
- The `MoodCheckIn` component manages its own internal state machine

### Data Model

```typescript
interface MoodEntry {
  id: string;              // crypto.randomUUID()
  date: string;            // YYYY-MM-DD (local timezone via getLocalDateString())
  mood: 1 | 2 | 3 | 4 | 5;
  moodLabel: 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';
  text?: string;           // Optional, max 280 chars
  timestamp: number;       // Date.now() — Unix ms
  verseSeen: string;       // The encouragement verse reference (e.g., "Psalm 34:18")
}
```

**localStorage key**: `wr_mood_entries` — JSON array of `MoodEntry` objects, ordered by date descending. Capped at 365 entries (one year of data). Oldest entries pruned on write.

### "Has checked in today?" Logic

```typescript
function hasCheckedInToday(): boolean {
  const today = getLocalDateString(); // From utils/date.ts
  const entries = getStoredMoodEntries();
  return entries.some(e => e.date === today);
}
```

### Edge Cases

- **Midnight rollover**: Check-in should NOT pop up mid-session if the clock crosses midnight. Only check on initial page load / route navigation to `/`. Use a `useRef` flag set on mount; don't re-check reactively.
- **Timezone**: Use browser local time via `getLocalDateString()` for "today" determination. Store `timestamp` as UTC for future backend compatibility.
- **Multiple tabs**: localStorage is shared across tabs. If user checks in on Tab A, Tab B should see the dashboard on next navigation (localStorage event listener or check on focus).
- **No auth yet (frontend-first)**: Simulate auth state through an `AuthProvider` context that reads from localStorage. See Spec 2 for details.

### Also Delivers

- `utils/date.ts` — shared date utilities used by all subsequent specs
- Crisis keyword integration for mood text input

### Accessibility

- Full-screen check-in uses `role="dialog"` with `aria-labelledby` pointing to the greeting text
- Mood buttons are a radio group: `role="radiogroup"` with `role="radio"` on each button, `aria-checked` state
- Keyboard navigation: Arrow keys to move between mood options, Enter/Space to select
- Skip link ("Not right now") is focusable and announced
- Auto-advance verse: Announce verse text via `aria-live="polite"` region so screen readers catch it before the 3-second auto-advance
- Crisis banner: fully accessible, matches existing crisis banner pattern
- `prefers-reduced-motion`: Disable pulse animation, orb glow transitions, fade transitions become instant

### Test Coverage

- Renders check-in when no mood entry exists for today
- Renders dashboard directly when mood entry exists for today
- Selecting a mood updates visual state (selected glow, others fade)
- Optional text input appears after mood selection with 280-char limit
- Skip link bypasses check-in and renders dashboard
- Correct verse displays for each mood level
- Auto-advance after 3 seconds transitions to dashboard
- Mood entry is persisted to localStorage with correct schema
- `hasCheckedInToday()` returns correct boolean using local timezone
- Keyboard navigation through mood buttons (arrow keys, enter)
- Screen reader announcements for mood selection and verse
- Crisis keywords in text input trigger crisis banner instead of verse
- Reduced motion: no animations
- Multiple entries cap at 365

---

## Spec 2: Dashboard Shell

### Summary

The container that holds all dashboard widgets. Handles route switching (`/` renders Dashboard when authenticated, Home when not), the dark hero section, the widget grid layout, collapsible card behavior, and the navbar logged-in state.

### Route Switching

In `App.tsx` (or the router config):
```tsx
<Route path="/" element={isAuthenticated ? <Dashboard /> : <Home />} />
```

`isAuthenticated` reads from an `AuthProvider` context (see Auth Provider section below).

### Auth Provider (Frontend-First)

Create a minimal `AuthProvider` that wraps the app and works through the existing auth context pattern:

```tsx
interface AuthContextValue {
  isAuthenticated: boolean;
  user: { name: string; id: string } | null;
  login: (name: string) => void;
  logout: () => void;
}
```

- `login()` sets `wr_auth_simulated: true` and `wr_user_name` in localStorage
- `logout()` clears `wr_auth_simulated` and `wr_user_name` but preserves ALL other `wr_*` data (mood, points, badges, friends, etc.)
- If an `AuthProvider` / `useAuth()` already exists in the codebase, extend it rather than creating a parallel system
- This becomes the real JWT auth provider in Phase 3 — only the internals change, not the API

### "Simulate Login" Dev Toggle

A temporary developer utility on the landing page (only visible in development mode via `import.meta.env.DEV`):
- Small button in the footer or corner: "Simulate Login"
- Calls `auth.login("Eric")` which sets localStorage flags
- Reloads page, which now renders Dashboard instead of Home
- "Simulate Logout" button on dashboard calls `auth.logout()` — clears auth but preserves user data

### Hero Section

- **Background**: Dark gradient matching landing page hero (`bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]` or similar)
- **Content** (centered on mobile, left-aligned on desktop):
  - "Good [morning/afternoon/evening], [Name]" — time-of-day greeting using `new Date().getHours()`. Morning: 5-11, Afternoon: 12-16, Evening: 17-4.
  - **Streak display**: Flame emoji (🔥) + number + "day streak" label. If streak is 0: "Start your streak today". Animated counter on first load after check-in (counts up from yesterday's value).
  - **Level badge**: Current level icon + name (e.g., "🌱 Sprout") + faith points number (e.g., "247 Faith Points"). Small progress bar showing progress to next level.
- **Height**: ~180px desktop, ~200px mobile (content stacks vertically on mobile)
- **No quick-action buttons in hero** — they live in their own widget card lower down

### Widget Grid

- **Desktop**: 2-column layout. Left column ~60% width, right column ~40%. CSS Grid: `grid-cols-5` with left spanning 3 and right spanning 2.
- **Mobile**: Single column, widgets stack in priority order.
- **Gap**: `gap-4 md:gap-6`

**Widget priority order (top to bottom)**:

| Priority | Widget | Column (Desktop) | Description |
|----------|--------|-------------------|-------------|
| 1 | Streak & Faith Points | Right | Streak counter, faith points, level progress, recent badges |
| 2 | 7-Day Mood Chart | Left | Line chart with mood-colored dots, "See More" link |
| 3 | Today's Activity Checklist | Left | 6 items with checkmarks, progress ring |
| 4 | Friends & Leaderboard Preview | Right | Top 3-5 friends, "See all" link |
| 5 | Quick Actions | Left (full-width on mobile) | Pray, Journal, Meditate, Music buttons |

**Desktop layout sketch**:
```
[          Hero: Greeting + Streak + Level          ]
[  Left (60%)              ] [  Right (40%)         ]
[  7-Day Mood Chart        ] [  Streak & Points     ]
[  Activity Checklist      ] [  Friends Preview      ]
[  Quick Actions (full width across both columns)   ]
```

### Widget Card Component

Reusable `DashboardCard` component:
```tsx
interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  collapsible?: boolean;     // default: true
  defaultCollapsed?: boolean; // default: false
  action?: { label: string; to: string }; // "See More" / "See all" link
  children: ReactNode;
}
```

**Visual style**:
- `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- `p-4 md:p-6`
- Header row: icon + title (left) + collapse toggle + action link (right)
- Collapse animation: height transition with `overflow-hidden`
- Collapse state persisted to localStorage (`wr_dashboard_collapsed: { [widgetId]: boolean }`)

### Placeholder Widgets

Spec 2 creates the shell with **placeholder content** in each widget card. Actual widget internals are built in subsequent specs:
- Mood Chart → "Coming in Spec 3"
- Streak & Points → "Coming in Spec 6"
- Activity Checklist → "Coming in Spec 6"
- Friends Preview → "Coming in Spec 9"
- Quick Actions → Functional immediately (navigation links to `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music`)

### Navbar Logged-In State (Global)

The navbar change applies on **ALL pages** when `isAuthenticated` is true — not just the dashboard.

**Desktop navbar changes**:
- "Log In" button → removed
- "Get Started" button → removed
- **Notification bell** added: Lucide `Bell` icon, to the right of nav links and left of avatar. Unread count badge (red circle, white text, top-right of bell). Badge only shows when count > 0. **Click behavior is a no-op until Spec 12** — just the icon renders.
- **User avatar** added: Circular avatar (32px) with dropdown on click. Avatar dropdown menu items per CLAUDE.md: Dashboard, Friends, My Journal Entries, My Prayer Requests, My Favorites, Mood Insights, Settings, divider, Log Out.

**Mobile drawer changes**:
- "Log In" / "Get Started" at bottom → replaced with avatar row at top + notification item + "Log Out" at bottom
- Full drawer nav per CLAUDE.md mobile logged-in structure

**Implementation**: The existing Navbar component checks `isAuthenticated` from the auth context and conditionally renders the appropriate button set.

### Responsive Breakpoints

- **Mobile** (<768px): Single column, all widgets stacked, hero content centered
- **Tablet** (768-1023px): Still single column but wider cards, hero left-aligned
- **Desktop** (1024px+): 2-column grid, hero left-aligned

### Accessibility

- Dashboard uses `<main>` landmark
- Each widget card uses `<section>` with `aria-labelledby` pointing to its title
- Collapse toggles: `aria-expanded`, `aria-controls` pointing to content panel
- Quick action buttons: clear labels, focus-visible outlines
- Avatar dropdown: `aria-haspopup="menu"`, focus management on open/close
- Hero streak/level info: no ARIA issues (static text)

### Test Coverage

- Renders Home when not authenticated
- Renders Dashboard when authenticated
- Hero shows correct time-of-day greeting
- Hero shows streak count and level (placeholder data)
- All 5 widget cards render in correct order
- Cards are collapsible (toggle click hides/shows content)
- Collapse state persists across page reloads (localStorage)
- Quick action buttons navigate to correct routes
- Navbar shows bell + avatar when authenticated
- Navbar shows Log In / Get Started when not authenticated
- Avatar dropdown renders all menu items
- Responsive: single column on mobile, 2-column on desktop
- "Simulate Login" toggle works in dev mode
- "Simulate Logout" preserves user data

---

## Spec 3: Mood Insights Dashboard Widget

### Summary

The 7-day mood chart widget for the dashboard. Introduces Recharts as a new dependency. Small, focused spec — just the widget.

### New Dependency

```bash
npm install recharts
```

Recharts (~45KB gzipped) provides React-native charting components built on D3. Chosen for React idiomatic API and dark theme customization.

### Dashboard Widget (7-Day Mood Chart)

Replaces the "Coming in Spec 3" placeholder in the dashboard's mood chart card.

- **Chart type**: Line chart using Recharts (`<LineChart>`)
- **Data**: Last 7 days of mood entries from `wr_mood_entries` in localStorage
- **X-axis**: Day labels (Mon, Tue, Wed...) or date (3/10, 3/11...)
- **Y-axis**: Mood levels 1-5, labeled with mood names (Struggling → Thriving)
- **Line**: Smooth curve (`type="monotone"`), stroke color: purple accent (`#8B5CF6`)
- **Dots**: Each data point is a `<Dot>` filled with its mood color (from mood color palette)
- **Missing days**: Gap in the line (no interpolation — don't fake data). Use `connectNulls={false}`.
- **Tooltip**: Hover/tap a dot shows date + mood label
- **Theme**: Dark — chart background transparent, grid lines `rgba(255,255,255,0.05)`, axis labels `text-white/50`
- **"See More" link**: Routes to `/insights` (part of the `DashboardCard` `action` prop)
- **Empty state**: Ghosted example chart (7 faded dots at varied heights, ~15% opacity) with overlay text: "Your mood journey starts today"

### Data Hook

```typescript
function useMoodChartData(days: number = 7) {
  // Read from wr_mood_entries
  // Return array of { date, mood, moodLabel, color } for last N days
  // Null entries for days with no check-in
}
```

This hook is reused by Spec 4's `/insights` page with a larger `days` parameter.

### Accessibility

- Chart wrapped in element with `aria-label` describing the trend ("Your mood over the last 7 days")
- Hidden `sr-only` text summary: "Over the last 7 days, you checked in 5 times. Average mood: Good."
- Dots are not individually focusable (too noisy) — the summary provides the information

### Test Coverage

- Chart renders with correct number of data points from localStorage
- Mood-colored dots use correct hex values per mood level
- Missing days show as gaps (no connecting line)
- Empty state renders when no mood data exists
- Tooltip shows on dot hover
- Chart is responsive (fills card width)
- `useMoodChartData` returns correct data for 7-day window

---

## Spec 4: `/insights` Full Page

### Summary

The dedicated mood analytics page at `/insights` with calendar heatmap, line chart, AI insight card placeholders, and time range controls.

### Route & Theme

**Route**: `/insights` (protected — requires auth)
**Theme**: Dark, matching dashboard
**Layout**: Single scrolling page, no tabs
**Entry point**: Dashboard mood chart "See More" link + avatar dropdown "Mood Insights" item

### Time Range Controls

Sticky below page header:
- Pill-style toggle buttons: **30d** (default) | 90d | 180d | 1y | All
- Selected pill: filled purple (`bg-purple-600`), others outlined (`border border-white/20`)
- `role="radiogroup"` with `role="radio"` per option
- Changing range re-renders all visualizations below

### Section 1: Calendar Heatmap

Custom CSS Grid component (no library — full dark theme control):

```tsx
<div className="grid grid-rows-7 grid-flow-col gap-1">
  {squares.map(sq => (
    <div
      key={sq.date}
      className="w-3 h-3 md:w-4 md:h-4 rounded-sm cursor-pointer"
      style={{ backgroundColor: sq.mood ? getMoodColor(sq.mood) : 'rgba(255,255,255,0.05)' }}
      aria-label={`${sq.date}: ${sq.moodLabel || 'No check-in'}`}
    />
  ))}
</div>
```

- Rows = days of week (Mon-Sun), columns = weeks
- Each square colored by mood value using the mood color palette
- Empty days (no check-in): dark/transparent square (`bg-white/5`)
- Hover/tap a square: tooltip shows date + mood label + optional text preview
- Default 30 days: roughly 4-5 columns of 7
- At 365 days: full year view (52 columns), horizontally scrollable container (`overflow-x-auto`) on mobile
- Day labels (Mon, Wed, Fri) on the left side

### Section 2: Line Chart (Mood Trend)

Larger version of the Spec 3 dashboard widget using the same `useMoodChartData(days)` hook with the selected time range:
- Proper axis labels
- Hover tooltip with date + mood + text excerpt
- Optional 7-day moving average overlay line (smoothed trend) — toggle button on/off
- Responsive: full width on all breakpoints

### Section 3: AI Insight Cards (placeholder/mock)

2-column grid on desktop, stacked on mobile. Frosted glass cards.

Card types (all hardcoded mock data — not computed from real entries):
- **Trend summary**: "📈 Your mood has improved 15% over the last 2 weeks"
- **Activity correlation**: "📓 You tend to feel better on days you journal"
- **Scripture connection**: "📖 You found peace in Psalms — it was featured on 4 of your best days"
- **Weekly summary**: "This week: 5 check-ins, average mood: Good"

Rotation: Show 3-4 cards at a time. Different mock cards shown on different days (`dayOfYear % totalCards`).

### Section 4: Activity Correlations (placeholder)

- Simple bar chart or comparison visualization (Recharts `<BarChart>`)
- "Mood on days you journaled vs. days you didn't" (mock data)
- "Mood on days you prayed vs. days you didn't" (mock data)

### Section 5: Scripture Connections (placeholder)

- List of scriptures that appeared on the user's best mood days
- Mock data: 3-4 scripture references with mood context
- Each: verse reference + "Appeared on 3 of your Good days"

### Data Layer

All real data read from `wr_mood_entries` in localStorage. Time range filtering:
```typescript
function getMoodEntries(days: number): MoodEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = getLocalDateString(cutoff);
  return allEntries.filter(e => e.date >= cutoffStr);
}
```

### Accessibility

- Charts: `aria-label` describing the data trend
- Heatmap squares: `aria-label` per square ("March 10: Good")
- Time range toggles: `role="radiogroup"`
- All charts have a hidden `sr-only` text summary

### Test Coverage

- Page renders all 5 sections
- Time range toggle filters data correctly (30/90/180/365/all)
- Heatmap renders correct number of squares with correct colors
- Line chart renders with mood-colored dots for selected range
- Missing days show as gaps
- Moving average toggle works
- Mock AI insight cards render with correct content
- Mock correlation charts render
- Responsive layout (2-col desktop, 1-col mobile for insight cards)
- Tooltip appears on heatmap square hover

---

## Spec 5: Streak & Faith Points Engine

### Summary

The core gamification data engine — activity tracking data model, weighted point calculation, daily multiplier tiers, streak logic, and the `useFaithPoints` hook. **No UI in this spec** — just the engine and data layer.

### Activity Tracking

Six trackable activities, tracked as booleans per day in a single localStorage key.

| Activity | Trigger | Detection |
|----------|---------|-----------|
| Logged mood | Completed mood check-in | `wr_mood_entries` has entry for today |
| Prayed | Generated/viewed a prayer | `recordActivity('pray')` called by Pray tab |
| Journaled | Saved a journal entry | `recordActivity('journal')` called by Journal tab |
| Meditated | Completed a meditation | `recordActivity('meditate')` called by meditation pages |
| Listened | Played any audio for 30+ seconds | `recordActivity('listen')` called by AudioProvider |
| Prayer Wall | Prayed for someone | `recordActivity('prayerWall')` called by Prayer Wall |

**Single source of truth**: `wr_daily_activities` — JSON object keyed by date:
```typescript
interface DailyActivityLog {
  [date: string]: {  // YYYY-MM-DD
    mood: boolean;
    pray: boolean;
    journal: boolean;
    meditate: boolean;
    listen: boolean;
    prayerWall: boolean;
    pointsEarned: number;  // Calculated and cached
    multiplier: number;     // 1 | 1.25 | 1.5 | 2
  };
}
```

No individual per-activity localStorage keys — `wr_daily_activities` handles everything.

### Point Calculation

```typescript
const ACTIVITY_POINTS: Record<ActivityType, number> = {
  mood: 5,
  pray: 10,
  listen: 10,
  prayerWall: 15,
  meditate: 20,
  journal: 25,
};

function calculateDailyPoints(activities: DailyActivities): { points: number; multiplier: number } {
  const completed = Object.entries(activities)
    .filter(([key, val]) => val === true && key in ACTIVITY_POINTS) as [ActivityType, boolean][];
  const count = completed.length;
  const basePoints = completed.reduce((sum, [key]) => sum + ACTIVITY_POINTS[key], 0);
  
  let multiplier = 1;
  if (count >= 6) multiplier = 2;       // Full Worship Day
  else if (count >= 4) multiplier = 1.5;
  else if (count >= 2) multiplier = 1.25;
  
  return { points: Math.round(basePoints * multiplier), multiplier };
}
```

### Faith Points Storage

`wr_faith_points`:
```typescript
interface FaithPointsData {
  totalPoints: number;
  currentLevel: number;       // 1-6
  currentLevelName: string;   // "Seedling" etc.
  pointsToNextLevel: number;  // Remaining points needed
  lastUpdated: string;        // ISO date
}
```

### Streak Logic

`wr_streak`:
```typescript
interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;  // YYYY-MM-DD, null if never active
}
```

```typescript
function updateStreak(today: string): StreakData {
  const data = getStreakData();
  
  // First ever activity
  if (!data.lastActiveDate) {
    return { currentStreak: 1, longestStreak: 1, lastActiveDate: today };
  }
  
  // Already active today
  if (data.lastActiveDate === today) {
    return data;
  }
  
  const yesterday = getYesterdayDateString();
  
  if (data.lastActiveDate === yesterday) {
    data.currentStreak += 1; // Consecutive day
  } else {
    data.currentStreak = 1; // Reset — missed day(s)
  }
  
  data.longestStreak = Math.max(data.longestStreak, data.currentStreak);
  data.lastActiveDate = today;
  return data;
}
```

**No grace period**. Streak resets on any missed day. Gentle messaging handled in Spec 8 (celebrations UI).

### Level Thresholds

```typescript
const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Seedling',     threshold: 0 },
  { level: 2, name: 'Sprout',       threshold: 100 },
  { level: 3, name: 'Blooming',     threshold: 500 },
  { level: 4, name: 'Flourishing',  threshold: 1500 },
  { level: 5, name: 'Oak',          threshold: 4000 },
  { level: 6, name: 'Lighthouse',   threshold: 10000 },
];

function getLevelForPoints(points: number): { level: number; name: string; nextThreshold: number | null } {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].threshold) {
      const next = LEVEL_THRESHOLDS[i + 1]?.threshold ?? null;
      return { level: LEVEL_THRESHOLDS[i].level, name: LEVEL_THRESHOLDS[i].name, nextThreshold: next };
    }
  }
  return { level: 1, name: 'Seedling', nextThreshold: 100 };
}
```

### Core Hook

```typescript
function useFaithPoints() {
  const [state, setState] = useState(() => loadFromLocalStorage());
  
  const recordActivity = useCallback((type: ActivityType) => {
    const today = getLocalDateString();
    // 1. Update wr_daily_activities (set type: true, recalculate points)
    // 2. Update wr_faith_points (add new points to total, recalculate level)
    // 3. Update wr_streak
    // 4. Check for level-up (compare old level vs new) → queue celebration
    // 5. Persist all to localStorage
    // 6. Update React state
  }, []);
  
  return {
    totalPoints: state.totalPoints,
    currentLevel: state.currentLevel,
    levelName: state.levelName,
    pointsToNextLevel: state.pointsToNextLevel,
    todayActivities: state.todayActivities,
    todayPoints: state.todayPoints,
    todayMultiplier: state.todayMultiplier,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    recordActivity,
  };
}
```

### Listen Activity: 30-Second Timer

The AudioProvider needs a mechanism to detect 30 seconds of playback:

```typescript
// Inside AudioProvider or a useListenTracker hook
const listenStartRef = useRef<number | null>(null);
const listenRecordedTodayRef = useRef(false);

useEffect(() => {
  if (isPlaying && !listenRecordedTodayRef.current) {
    if (!listenStartRef.current) {
      listenStartRef.current = Date.now();
    }
    const timer = setInterval(() => {
      if (listenStartRef.current && Date.now() - listenStartRef.current >= 30000) {
        recordActivity('listen');
        listenRecordedTodayRef.current = true;
        clearInterval(timer);
      }
    }, 5000);
    return () => clearInterval(timer);
  }
  if (!isPlaying) {
    listenStartRef.current = null; // Reset on pause (cumulative not required)
  }
}, [isPlaying]);
```

Resets daily so users can earn the listen point again tomorrow.

### Test Coverage

- Point calculation correct for all activity combinations (0 through 6 activities)
- Multiplier tiers: 1x (0-1), 1.25x (2-3), 1.5x (4-5), 2x (6)
- Streak increments on consecutive days
- Streak resets after missed day (including multi-day gaps)
- Streak handles first-ever activity (null lastActiveDate)
- Longest streak persists after reset
- Level progression: correct level at every threshold boundary
- Level-up detection: old level vs new level comparison
- `recordActivity` updates all three localStorage keys atomically
- `useFaithPoints` hook returns correct reactive state
- All data persists across page reloads

---

## Spec 6: Dashboard Widgets + Activity Integration

### Summary

The Streak & Faith Points dashboard card, the Today's Activity Checklist card, and the `recordActivity()` integration calls added to existing components (Pray, Journal, Meditate, AudioProvider, Prayer Wall).

### Dashboard Widget: Streak & Faith Points Card

Replaces the "Coming in Spec 6" placeholder.

**Layout**:
- Top: Large streak number with 🔥 + "day streak". If 0: "Start your streak today" (warm tone). Longest streak smaller below: "Longest: 14 days"
- Middle: Faith points number + level name + level icon (Lucide temp icons). Progress bar: "247 / 500 to Blooming"
- Bottom: Today's multiplier badge if >1x ("1.5x bonus today!"). 3 most recent badges as small icons.

**Lucide temp icons** (custom SVG in Phase 4):
| Level | Lucide Icon |
|-------|-------------|
| Seedling | `Sprout` |
| Sprout | `Leaf` |
| Blooming | `Flower2` |
| Flourishing | `TreePine` |
| Oak | `Trees` |
| Lighthouse | `Landmark` |

### Dashboard Widget: Today's Activity Checklist

**Layout**:
- Circular SVG progress ring showing X/6 activities completed
- List of 6 activities:
  - ✅ Completed: green check icon, activity name, "+X pts" in accent color
  - ⬜ Not yet: empty circle, activity name, "+X pts" in muted
- Multiplier preview: "Complete 2 more for 1.5x bonus!"
- Real-time: React state updates without page reload when activities complete (via `useFaithPoints` hook)

### Existing Component Integration

Add `recordActivity()` calls to these existing components:

| Component | Where to Add | Call |
|-----------|-------------|------|
| Pray tab | On prayer generation complete | `recordActivity('pray')` |
| Journal tab | On journal entry save | `recordActivity('journal')` |
| Meditation pages | On meditation completion | `recordActivity('meditate')` |
| AudioProvider | On 30s playback (via listen tracker) | `recordActivity('listen')` |
| Prayer Wall | On prayer reaction/comment | `recordActivity('prayerWall')` |

Each integration is a single line — import `useFaithPoints` and call `recordActivity` at the appropriate moment. The hook handles all the downstream logic (points, streak, level, localStorage).

**Auth guard**: `recordActivity` should no-op if user is not authenticated. Check `isAuthenticated` inside the hook.

### Test Coverage

- Streak card shows correct streak count, longest streak, and level
- Streak card shows "Start your streak today" when streak is 0
- Progress bar shows correct % to next level
- Multiplier badge appears when >1x
- Activity checklist shows correct completion state for each activity
- Progress ring reflects X/6
- Multiplier preview calculates remaining activities correctly
- `recordActivity('pray')` updates checklist in real-time
- All 5 existing component integrations trigger correctly
- Auth guard: recordActivity no-ops when not authenticated

---

## Spec 7: Badge Definitions & Unlock Logic

### Summary

All badge categories, the badge data model, trigger detection logic, and level-up verses. **No celebration UI in this spec** — just the engine that determines when badges are earned.

### Level-Up Verses (WEB Translation)

| Level | Verse | Reference |
|-------|-------|-----------|
| Seedling (start) | "For we are his workmanship, created in Christ Jesus for good works." | Ephesians 2:10 |
| Sprout | "I planted, Apollos watered, but God gave the increase." | 1 Corinthians 3:6 |
| Blooming | "The righteous shall flourish like the palm tree. He will grow like a cedar in Lebanon." | Psalm 92:12 |
| Flourishing | "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith." | Galatians 5:22 |
| Oak | "He will be like a tree planted by the streams of water, that produces its fruit in its season." | Psalm 1:3 |
| Lighthouse | "You are the light of the world. A city located on a hill can't be hidden." | Matthew 5:14 |

### Badge Definitions

**Streak Milestones** (7 badges):
| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `streak_7` | First Flame | 7-day streak | toast |
| `streak_14` | Steady Flame | 14-day streak | toast |
| `streak_30` | Burning Bright | 30-day streak | toast |
| `streak_60` | Unwavering | 60-day streak | full-screen |
| `streak_90` | Faithful | 90-day streak | full-screen |
| `streak_180` | Half-Year Warrior | 180-day streak | full-screen |
| `streak_365` | Year of Faith | 365-day streak | full-screen |

**Level-Up Badges** (6 badges): One per level, ID: `level_1` through `level_6`. Celebration: full-screen.

**Activity Milestones** (9 badges):
| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `first_prayer` | First Prayer | 1st prayer | toast |
| `prayer_100` | Prayer Warrior | 100th prayer | toast-confetti |
| `first_journal` | First Entry | 1st journal save | toast |
| `journal_50` | Faithful Scribe | 50th journal | toast-confetti |
| `journal_100` | Devoted Writer | 100th journal | toast-confetti |
| `first_meditate` | First Meditation | 1st meditation | toast |
| `meditate_25` | Mindful | 25th meditation | toast-confetti |
| `first_listen` | First Listen | 1st audio 30s+ | toast |
| `listen_50` | Worship in Song | 50th listen | toast-confetti |

**Full Worship Day** (repeatable): ID `full_worship_day`. Counter badge. Celebration: special toast.

**First-Time Badges** (6 badges): `first_prayer`, `first_journal`, `first_meditate`, `first_listen`, `first_prayerwall`, `first_friend`. Each earned once. Celebration: toast.

**Community Badges** (4 badges):
| ID | Name | Trigger | Celebration Tier |
|----|------|---------|-----------------|
| `first_friend` | First Friend | 1st friend added | toast |
| `friends_10` | Inner Circle | 10 friends | toast-confetti |
| `encourage_10` | Encourager | 10 encouragements sent | toast |
| `encourage_50` | Cheerleader | 50 encouragements sent | toast-confetti |

**Welcome Badge**: ID `welcome`. "Welcome to Worship Room" — earned on account creation. Celebration: toast.

**Total: ~35 unique badges.**

### Badge Data Model

`wr_badges`:
```typescript
interface BadgeData {
  earned: {
    [badgeId: string]: {
      earnedAt: string;   // ISO timestamp
      count?: number;      // For repeatable badges (full_worship_day)
    };
  };
  newlyEarned: string[];  // Badge IDs earned but not yet celebrated
  activityCounts: {       // Running counters for milestone badges
    pray: number;
    journal: number;
    meditate: number;
    listen: number;
    prayerWall: number;
    encouragementsSent: number;
    fullWorshipDays: number;
  };
}
```

### Badge Check Logic

`checkForNewBadges()` — runs inside `recordActivity()` after updating points/streak:

```typescript
function checkForNewBadges(context: {
  streak: StreakData;
  level: number;
  todayActivities: DailyActivities;
  activityCounts: ActivityCounts;
  friendCount: number;
}): string[] {
  const newBadges: string[] = [];
  const { earned } = getBadgeData();
  
  // Streak badges
  const streakThresholds = [7, 14, 30, 60, 90, 180, 365];
  for (const threshold of streakThresholds) {
    const id = `streak_${threshold}`;
    if (context.streak.currentStreak >= threshold && !earned[id]) {
      newBadges.push(id);
    }
  }
  
  // Level badges
  const levelId = `level_${context.level}`;
  if (!earned[levelId]) newBadges.push(levelId);
  
  // Full Worship Day
  const allDone = Object.values(context.todayActivities).every(v => v === true);
  if (allDone) newBadges.push('full_worship_day'); // Repeatable
  
  // Activity milestones (check each counter against thresholds)
  // ... etc
  
  return newBadges;
}
```

New badges are added to both `earned` and `newlyEarned`. The celebration system (Spec 8) reads and drains `newlyEarned`.

### Test Coverage

- All ~35 badge definitions have correct IDs and triggers
- Streak badges fire at exactly the right streak values
- Level badges fire on level-up
- Activity milestone badges fire at correct counts
- Full Worship Day detects all 6 activities complete
- Welcome badge awarded on simulated signup
- `newlyEarned` queue populated correctly
- Repeatable badges (Full Worship Day) increment count
- Activity counters increment on each `recordActivity` call
- No duplicate badge awards (except repeatable)

---

## Spec 8: Celebrations & Badge Collection UI

### Summary

Toast notifications, full-screen celebration overlays, confetti effects, and the badge collection grid. Consumes the `newlyEarned` queue from Spec 7.

### Celebration Tiers

| Tier | Used For | UI |
|------|----------|-----|
| `toast` | First-time badges, minor milestones | Small toast, bottom-right (desktop) / bottom-center (mobile). Badge icon + name + congrats text. 4s auto-dismiss. |
| `toast-confetti` | Activity milestones (50th, 100th) | Toast + subtle CSS confetti particles. 5s auto-dismiss. |
| `special-toast` | Full Worship Day | Larger toast: "🎉 Full Worship Day! 2x points earned!" 5s auto-dismiss. |
| `full-screen` | Level-up, streak 60/90/180/365 | Full-screen overlay with animation. See below. |

### Toast System

Check if a reusable toast hook/component already exists in the codebase (Music feature uses toasts for scene undo). If yes: extend with new types. If no: create `useToast` hook.

```typescript
interface ToastOptions {
  type: 'success' | 'info' | 'celebration' | 'celebration-confetti' | 'error';
  duration?: number;  // ms, default 4000
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
}
```

Toast position: bottom-center (mobile), bottom-right (desktop). Max 3 stacked.

### Full-Screen Celebration Overlay

- Dark background with backdrop blur
- Level/badge icon scales in with spring animation (CSS `@keyframes`)
- Name in large serif text
- Encouragement message (level name meanings from Spec 5 engine)
- Level-up verse (from Spec 7 level-up verses table)
- "Continue" button to dismiss
- CSS-only confetti: 20-30 small colored squares/circles with randomized `@keyframes` fall animation
- `prefers-reduced-motion`: No confetti, no scaling, instant appear with "Continue" button

### Streak Reset Messaging

When the dashboard loads and the streak was reset (current streak = 1 but yesterday's wasn't the last active date):
- No celebration — instead, a gentle inline message in the streak widget: "Every day is a new beginning. Start fresh today."
- No toast, no modal, no fanfare about the loss. Just quiet encouragement.

### Celebration Queue Processing

On dashboard load (after check-in completes):
1. Wait 1.5 seconds (let user settle in)
2. Read `newlyEarned` from `wr_badges`
3. Sort by celebration tier (toasts first, full-screen last)
4. Process sequentially: show toast → wait for dismiss → next toast → ... → full-screen last
5. Clear `newlyEarned` after all celebrations complete

### Badge Collection UI

**Dashboard card**: Bottom section of Streak & Faith Points card shows 3 most recent earned badges as small circular icons. Tap any to see full collection.

**Full badge grid** (used on profile page in Spec 14 and potentially accessible from dashboard):
- Grid of all ~35 badges
- Earned: Full color with glow
- Locked: Gray silhouette with lock icon overlay
- Hover/tap earned: tooltip with name + earned date
- Hover/tap locked: tooltip with name + requirement text
- Sort: by category (default) | recently earned

### Test Coverage

- Toast renders with correct icon, message, and auto-dismisses
- Toast-confetti shows particles (when reduced motion is off)
- Full-screen overlay renders for level-up with correct verse
- Full-screen overlay renders for major streak milestones
- "Continue" button dismisses full-screen overlay
- `newlyEarned` queue drains after all celebrations
- Celebrations fire 1.5s after dashboard load
- Sequential processing: toasts before full-screen
- Streak reset shows gentle message, no celebration
- Badge grid shows earned vs locked correctly
- Reduced motion: all animations disabled, instant states
- Existing toast pattern extended (not replaced) if one exists

---

## Spec 9: Friends System

### Summary

The `/friends` page with two tabs (Friends + Leaderboard), friend discovery, mutual friend requests, and mock friend data.

### `/friends` Page Layout

**Route**: `/friends` (protected)
**Entry points**: Dashboard leaderboard widget "See all" link + avatar dropdown "Friends" item
**Tabs**: "Friends" (default) | "Leaderboard" — via `?tab=friends|leaderboard`

### Tab 1: Friends (default)

Page sections (top to bottom):

1. **Header**: "Friends" title + friend count (e.g., "Friends (8)")
2. **Search bar**: Search by display name. Debounced input (300ms), results in dropdown. Searches mock user list.
3. **Invite section**: Side by side (stacked on mobile):
   - "Invite by Link" — generates URL (`${VITE_APP_URL || window.location.origin}/invite/${code}`), copy-to-clipboard button
   - "Invite by Email" — email input + "Send Invite" (mock — success toast)
4. **Pending Requests** (if any): Incoming with Accept/Decline buttons. Outgoing with "Pending" + Cancel.
5. **My Friends**: List rows — avatar + display name + level badge + 🔥 streak + last active. Tap → `/profile/:id`. Three-dot menu: Remove, Block.
6. **People You May Know**: Cards from Prayer Wall interactions (mock data). "Add Friend" button.

### Tab 2: Leaderboard

See Spec 10.

### Friend Data Model

`wr_friends`:
```typescript
interface FriendsData {
  friends: FriendProfile[];
  pendingIncoming: FriendRequest[];
  pendingOutgoing: FriendRequest[];
  blocked: string[];
}

interface FriendProfile {
  id: string;
  displayName: string;
  avatar: string;
  level: number;
  levelName: string;
  currentStreak: number;
  faithPoints: number;
  weeklyPoints: number;
  lastActive: string;
}

interface FriendRequest {
  id: string;
  from: FriendProfile;
  to: FriendProfile;
  sentAt: string;
  message?: string;
}
```

### Mock Data

Seed 10 mock friends:
- "Sarah M." — Level 4, 45-day streak, very active
- "James K." — Level 3, 12-day streak, active
- "Maria L." — Level 5, 90-day streak, very active
- "David R." — Level 2, 3-day streak, moderate
- "Rachel T." — Level 3, 0-day streak (was 21), inactive 5 days (nudge-eligible)
- "Daniel P." — Level 1, 7-day streak, new user
- "Grace H." — Level 4, 60-day streak, active
- "Matthew S." — Level 2, 0-day streak, inactive 8 days (nudge-eligible)
- "Hannah W." — Level 3, 28-day streak, active
- "Joshua B." — Level 6, 180-day streak, very active (top of leaderboard)

2 pending incoming requests, 1 pending outgoing, 3 "People you may know" suggestions.

### Mutual Friend Model

- Send request → added to `pendingOutgoing`
- Accept incoming → both move to `friends`
- Decline → request removed
- Block → added to `blocked`, prevents future requests

### Accessibility

- Search: `aria-label="Search for friends"`, results as `role="listbox"`
- Friend list: `role="list"` / `role="listitem"`
- Accept/Decline: labels include friend name ("Accept friend request from Sarah M.")
- Three-dot menu: `aria-haspopup="menu"`, focus management
- Tabs: `role="tablist"` / `role="tab"` / `role="tabpanel"`

### Test Coverage

- Both tabs render correctly
- Search filters mock list
- Invite link generates and copies to clipboard
- Email invite shows success toast
- Accept moves to friends list
- Decline removes request
- Remove friend removes from list
- Block prevents re-adding
- "People you may know" renders
- Empty state: no friends, shows invite CTA
- Tab switching works via URL params

---

## Spec 10: Leaderboard

### Summary

Friends leaderboard (default) and global leaderboard (optional toggle) as the second tab of the `/friends` page, plus the compact dashboard widget.

### Friends Leaderboard

- Default view on the Leaderboard tab
- Ranked by **weekly faith points** (Monday 00:00 to Sunday 23:59 local time)
- Each row: Rank # + avatar + display name + weekly pts + 🔥 streak + level badge
- Current user highlighted with subtle accent background
- Toggle: "This Week" (default) | "All Time"
  - All Time: ranked by total faith points

### Global Leaderboard

- Toggle: "Friends" (default) | "Global"
- **Weekly faith points only** (resets Monday)
- Each row: Rank # + display name only (no avatar — privacy-preserving)
- Tap name → minimal popup: level + badge collection
- Top 50, "Load more" for pagination
- Current user's rank pinned at top regardless of position ("You're #247 this week")

### Weekly Reset

Weekly points computed from `wr_daily_activities`:
```typescript
function getWeeklyPoints(activities: DailyActivityLog): number {
  const weekStart = getCurrentWeekStart();
  return Object.entries(activities)
    .filter(([date]) => date >= weekStart)
    .reduce((sum, [_, day]) => sum + day.pointsEarned, 0);
}
```

### Dashboard Widget

Compact card in the Friends & Leaderboard position:
- "Leaderboard" title
- Top 3 friends: rank + name + weekly points
- Current user position if not in top 3
- Milestone feed below (2-3 recent friend events)
- "See all" → `/friends?tab=leaderboard`
- Empty state: "Add friends to see your leaderboard" + invite link

### Mock Global Leaderboard Data

Generate 50 mock users with display names and varied weekly points. Current user at position #12.

### Test Coverage

- Friends leaderboard ranks correctly by weekly points
- Global leaderboard ranks correctly
- Toggle Friends/Global works
- This Week/All Time toggle works
- Current user highlighted on friends board
- User rank shown on global board
- Weekly reset calculates correct date range
- Dashboard widget shows top 3 + position
- Empty states render correctly

---

## Spec 11: Social Interactions

### Summary

Quick-tap encouragements, milestone feed, gentle nudges, and weekly community recap.

### Quick-Tap Encouragements

**Location**: Friend list rows, leaderboard rows, profile pages — small "Encourage" button (heart/🙏 icon).

**Flow**:
1. Tap → popover with 4 presets: "🙏 Praying for you" / "🌟 Keep going!" / "💪 Proud of you" / "❤️ Thinking of you"
2. Tap one → stored in `wr_social_interactions`, success toast
3. Generates notification for recipient (mock — stored locally)

**Limit**: 3 per friend per day. Cooldown resets at midnight.

### Milestone Feed

Compact activity stream in the dashboard leaderboard widget:
- "🔥 Sarah hit a 30-day streak!" / "🌿 James leveled up!" / etc.
- Small avatar + event text + relative timestamp
- `wr_milestone_feed`: array of 10-15 mock events, capped at 20. Most recent first.

### Nudges

- Appears on friend list entries where `lastActive` is 3+ days ago
- Tap "Send a nudge" → confirmation → sent (mock localStorage)
- Recipient notification: "❤️ [Name] is thinking of you"
- Limit: 1 per friend per week
- Recipient can disable in Settings (Spec 13)
- **Tone**: Always gentle. Never mentions absence duration.

### Weekly Community Recap

Generated client-side every Monday from mock friend data:
```
📊 Last week, your friend group:
• Prayed 23 times
• Journaled 15 entries
• Completed 8 meditations
• Spent 12 hours in worship music
You contributed 34% of the group's growth! 🌟
```

Shows as: notification in bell + optional dashboard card (collapsible).

### Test Coverage

- Encouragement popover shows 4 options
- 3/day limit enforced per friend
- Milestone feed renders mock events
- Nudge only appears for 3+ day inactive friends
- 1/week nudge limit enforced
- Weekly recap computes correct mock stats
- Notifications generated for all social interactions

---

## Spec 12: Notification System

### Summary

Navbar notification bell behavior (Spec 2 placed the icon), dropdown panel, and mock notification data.

### Bell Behavior

Spec 2 placed the bell icon in the navbar. This spec adds:
- Click toggles dropdown panel
- Unread badge count reads from `wr_notifications` (count where `read: false`)

### Dropdown Panel

- Dark frosted glass, ~360px wide (desktop), full-width sheet (mobile)
- Max height 400px with scroll
- Header: "Notifications" + "Mark all as read" link
- Empty state: "All caught up! 🎉"

**Notification types**:
| Type | Icon | Example |
|------|------|---------|
| `encouragement` | 🙏 | "Sarah sent: Praying for you" |
| `friend_request` | 👤 | "James wants to be your friend" (inline Accept/Decline) |
| `milestone` | 🏆 | "You earned Burning Bright!" |
| `friend_milestone` | 🎉 | "Sarah hit a 30-day streak!" |
| `nudge` | ❤️ | "Sarah is thinking of you" |
| `weekly_recap` | 📊 | "Your weekly recap is ready" |
| `level_up` | ⬆️ | "You leveled up to Sprout!" |

**Each item**: Icon + message + relative timestamp. Unread: brighter bg + dot. Tap: mark read + navigate. X to dismiss (desktop), swipe (mobile).

### Data Model

`wr_notifications`:
```typescript
interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
}
```

### Mock Data

Seed 12 mock notifications spanning 7 days. 5 unread.

### Push Notification Stubs

Settings toggle only — no actual push. Stores permission flag in localStorage. Real implementation Phase 3.

### Test Coverage

- Bell shows correct unread count
- Panel opens/closes
- Notifications render correctly by type
- "Mark all as read" works
- Individual tap marks as read
- Swipe/X dismisses
- Friend request has inline Accept/Decline
- Empty state renders
- Panel scrolls when full

---

## Spec 13: Settings & Privacy

### Summary

Full `/settings` page with Profile, Notifications, Privacy, and Account sections.

### Route & Layout

**Route**: `/settings` (protected)
**Entry**: Avatar dropdown
**Layout**: Left sidebar nav (desktop) / top tabs (mobile) with 4 sections.

### Section 1: Profile

| Field | Type | Details |
|-------|------|---------|
| Display Name | Text input | 2-30 chars, alphanumeric + spaces |
| Avatar | Preview + "Change" button | Opens avatar picker (Spec 14) |
| Bio | Textarea | Optional, 160 chars. Stubbed — not publicly displayed yet |

### Section 2: Notifications

Toggle switches, immediately persist to `wr_settings`:

| Setting | Default |
|---------|---------|
| In-app notifications | ON |
| Push notifications | OFF (stub) |
| Email weekly digest | ON (stub) |
| Email monthly report | ON (stub) |
| Encouragement notifications | ON |
| Milestone notifications | ON |
| Friend request notifications | ON |
| Nudge notifications | ON |
| Weekly recap | ON |

### Section 3: Privacy

| Setting | Default |
|---------|---------|
| Show on global leaderboard | ON |
| Activity status (Active/Offline) | ON |
| Who can send nudges | "Friends" (Everyone / Friends / Nobody) |
| Who can see streak/level | "Friends" (Everyone / Friends / Only me) |
| Blocked users | List with "Unblock" buttons |

### Section 4: Account

| Field | Details |
|-------|---------|
| Email | Display + "Change" (stub form) |
| Password | "Change Password" (stub form) |
| Delete Account | Red danger button → confirmation modal → clears ALL `wr_*` keys → redirect to `/` |

### Data Model

`wr_settings`:
```typescript
interface UserSettings {
  profile: { displayName: string; avatarId: string; bio?: string };
  notifications: Record<string, boolean>;
  privacy: {
    showOnGlobalLeaderboard: boolean;
    activityStatus: boolean;
    nudgePermission: 'everyone' | 'friends' | 'nobody';
    streakVisibility: 'everyone' | 'friends' | 'only_me';
    blockedUsers: string[];
  };
}
```

### Accessibility

- Settings nav: `role="tablist"` (mobile) / `role="navigation"` (desktop sidebar)
- Toggles: `role="switch"`, `aria-checked`
- Radio groups: `role="radiogroup"` / `role="radio"`
- Delete modal: focus-trapped, `role="alertdialog"`

### Test Coverage

- All sections render
- Toggles persist to localStorage immediately
- Privacy toggles affect leaderboard visibility (Spec 10) and nudge availability (Spec 11)
- Display name change updates across app
- Delete account clears all localStorage and redirects
- Blocked users list with unblock
- Responsive: sidebar (desktop) / tabs (mobile)

---

## Spec 14: Profile & Avatars

### Summary

Public profile page, avatar selection (presets + photo upload), and badge showcase.

### Public Profile Page

**Route**: `/profile/:userId` (separate from `/prayer-wall/user/:id`)
**Accessible from**: Friend list, leaderboard, milestone feed, notifications

**Layout**:
- Header: Large avatar + display name + level badge + "🔥 14-day streak"
- Badge showcase: Full grid (earned = color, locked = silhouette)
- Stats: Total faith points, days active, level progress bar
- "Send Encouragement" button (if viewing a friend)
- "Add Friend" / "Friends ✓" status
- Privacy-aware: respect viewed user's streak/level visibility settings

### Avatar System

**16 preset avatars** across 4 categories:
- Nature: Dove, Tree, Mountain, Sunrise
- Faith: Cross, Fish, Flame, Crown
- Water: Wave, Raindrop, River, Anchor
- Light: Star, Candle, Lighthouse, Rainbow

Simple line icons on colored circular backgrounds.

**4 unlockable avatars** (earned via badges):
- Golden Dove → "Year of Faith" (365-day streak)
- Crystal Tree → Lighthouse level
- Phoenix Flame → 10 Full Worship Day badges
- Diamond Crown → All streak milestones

**Photo upload**: File input, crop to square, **resize to 200x200px and compress to JPEG 80%** before base64 encoding (~10-30KB, safe for localStorage). Max input: 2MB. Accept: `.jpg, .jpeg, .png, .webp`.

```typescript
async function processAvatarUpload(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 200, 200);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = URL.createObjectURL(file);
  });
}
```

**Avatar picker**: Modal with two tabs: "Presets" (grid, locked with lock overlay) | "Upload Photo" (current photo + file picker + crop preview).

**Initials fallback**: Circle with first letter(s) of display name. Background color: deterministic hash of user ID.

### Test Coverage

- Profile page renders correct user data
- Avatar picker shows preset grid
- Locked presets show lock overlay
- Unlockable avatars locked/unlocked correctly
- Photo upload resizes to 200x200 and compresses
- Initials fallback when no avatar
- Badge showcase: earned vs locked
- Privacy settings respected on viewed profiles
- Encouragement button works from profile
- Add/Remove friend state correct

---

## Spec 15: AI Insights & Monthly Report

### Summary

Mock AI-generated insight cards on `/insights` and the monthly mood report UI at `/insights/monthly`.

### AI Insight Cards (for `/insights` page)

Extends Section 3 of the `/insights` page (Spec 4) with richer mock content and rotation logic.

**Mock content pool** (rotate 3-4 per day based on `dayOfYear % total`):

Trend summaries (4):
- "📈 Your mood has improved 15% over the last 2 weeks"
- "📊 You've been most consistent on Wednesdays and Thursdays"
- "🌟 This is your best week in the last month!"
- "📉 Your mood dipped mid-week — weekends seem to recharge you"

Activity correlations (3):
- "📓 On days you journal, your average mood is Good (4.1) vs. Okay (3.2) on days you don't"
- "🎵 Listening to worship music correlates with a 20% mood boost the next day"
- "🙏 You tend to pray more on Heavy days — and your mood improves the day after"

Scripture connections (2):
- "📖 Psalm 34:18 appeared on 3 of your Struggling days — and each time, your mood improved the next day"
- "✨ You gravitate toward Psalms when feeling Heavy — they seem to bring peace"

Personalized recommendations (2):
- "💡 Try journaling before bed — your best mood days often follow evening journal entries"
- "🎶 You haven't explored the Sleep & Rest tab yet — it might help on Heavy days"

### Monthly Report Page

**Route**: `/insights/monthly` (protected)
**Entry**: Link on `/insights` + notification + email CTA

**Sections** (single scrolling page):
1. **Header**: "Your [Month] Faith Journey" + date range
2. **Key stats** (4 cards): Days active, total points, level progress, mood trend
3. **Month heatmap**: Same component as `/insights`, locked to one month
4. **Top activities**: Recharts `<BarChart>` — activity distribution
5. **Highlights**: Longest streak, badges earned, best day
6. **AI insights**: 2-3 cards from the pool above
7. **Share button**: "Share your month" → "Coming soon" toast (stub)

**Email template**: React component for visual preview (not actually sent). Subject: "Your [Month] Faith Journey — Worship Room"

**Mock data**: 24/31 days active, 1,847 points, average mood 3.7, improving trend.

### Test Coverage

- AI cards render and rotate by day
- Monthly report renders all 7 sections
- Key stats display correctly
- Bar chart renders activity distribution
- Share button shows "Coming soon" toast
- Email template component renders
- Responsive layout

---

## Spec 16: Empty States & Polish

### Summary

Beautiful empty states for every widget, the check-in → dashboard transition animations, micro-interactions, and the visual polish checklist.

### Empty States

Principle: Show what the *future* looks like + one clear CTA.

| Widget/Page | Empty State | CTA |
|------------|-------------|-----|
| Mood Chart | Ghosted example chart (15% opacity) | "Your mood journey starts today" → trigger check-in |
| Streak (day 1) | "🔥 Day 1 — every journey begins with a single step" | — |
| Faith Points (new) | "0 Faith Points • 🌱 Seedling" + full progress bar | — |
| Badges (new) | Locked silhouettes + glowing "Welcome" badge | "Your collection is just beginning" |
| Activity Checklist | All 6 unchecked | "A new day, a new opportunity to grow" |
| Friends/Leaderboard | CSS circles illustration | "Faith grows stronger together" + invite CTA |
| `/insights` (<7 days) | Partial data shown | "After 7 days, you'll see trends emerge" |
| `/friends` (no friends) | Connected dots illustration | "Invite someone to grow together" + invite form |
| Notifications (empty) | — | "All caught up! 🎉" |
| "You vs. Yesterday" | Self-comparison when no friends | Today's pts vs yesterday's pts |

### Dashboard Transition Animations

**Mood check-in → Dashboard**:
1. Check-in fades out (300ms)
2. Verse fades in (300ms), holds 3s, fades out (300ms)
3. Dashboard fades in (400ms)
4. Simultaneous with dashboard fade-in:
   - Streak counter: counts up over 800ms with easing
   - First check-in bump: subtle 1.0→1.1→1.0 scale (300ms)
   - Mood dot: fades onto chart (400ms, 200ms delay)
   - Activity "Logged mood": check animation (200ms)
   - Points: count up to new total (600ms)

**Badge/Level celebrations**: 1.5s delay after dashboard loads → process `newlyEarned` queue

### Micro-Interactions

- Card collapse: smooth height (300ms ease-in-out)
- Card hover: subtle border brightness (150ms)
- Activity check: circle fills → checkmark draws in (SVG `stroke-dasharray`)
- Leaderboard rank change: number slides up/down
- Encouragement sent: button → checkmark → return
- Progress ring: smooth arc fill animation

### `prefers-reduced-motion` Compliance

ALL animations: instant when `prefers-reduced-motion: reduce`:
- Counter roll-ups → instant value
- Fades → instant opacity
- SVG animations → instant state
- Card collapse → instant height
- Confetti/particles → disabled
- Streak bump → disabled

### Visual Polish Checklist

- [ ] Consistent `rounded-2xl` on all cards
- [ ] Consistent frosted glass values (`bg-white/5 backdrop-blur-sm border border-white/10`)
- [ ] Mood colors match across check-in, charts, heatmap, dots
- [ ] Typography hierarchy: hero → card title → card body → metadata
- [ ] 44px minimum touch targets on all interactive elements
- [ ] Focus-visible: `ring-2 ring-purple-400` on dark backgrounds
- [ ] Loading skeletons for async data
- [ ] WCAG AA contrast on dark backgrounds
- [ ] Thin dark-themed scrollbars on panels
- [ ] No layout shift on collapse/expand

### Test Coverage

- All empty states render with correct messaging and CTAs
- Streak counter animation on check-in
- Mood dot appears on chart
- Activity checklist real-time updates
- Level-up/badge celebrations fire correctly
- Reduced motion: all instant
- 44px touch targets verified
- Focus order logical across widgets

---

## Cross-Spec Integration Points

| Producer | Consumer | Integration |
|----------|----------|-------------|
| Spec 1 (Mood) | Spec 3 (Widget) | Mood entries from `wr_mood_entries` |
| Spec 1 (Mood) | Spec 5 (Engine) | Check-in triggers `recordActivity('mood')` |
| Spec 1 (Mood) | Spec 1 | Crisis keyword detection on text input |
| Spec 2 (Shell) | All pages | Navbar logged-in state (bell + avatar) is global |
| Spec 5 (Engine) | Spec 6 (Widgets) | Streak/points/level data for dashboard cards |
| Spec 5 (Engine) | Spec 7 (Badges) | Point/streak changes trigger badge checks |
| Spec 7 (Badges) | Spec 8 (Celebrations) | `newlyEarned` queue consumed by celebration system |
| Spec 7 (Badges) | Spec 12 (Notifications) | Badge earned → notification |
| Spec 9 (Friends) | Spec 10 (Leaderboard) | Friend list for leaderboard |
| Spec 9 (Friends) | Spec 11 (Social) | Friend list for encouragements/nudges |
| Spec 11 (Social) | Spec 12 (Notifications) | Social interactions → notifications |
| Spec 13 (Settings) | Spec 10 (Leaderboard) | Privacy → leaderboard visibility |
| Spec 13 (Settings) | Spec 11 (Social) | Privacy → nudge permissions |
| Spec 14 (Profile) | Spec 9 (Friends) | Profile linked from friend list |
| All specs | Spec 16 (Polish) | Empty states + animations for all widgets |

### Existing Component Modifications

| Component | Change | Spec |
|-----------|--------|------|
| Pray tab | Add `recordActivity('pray')` | Spec 6 |
| Journal tab | Add `recordActivity('journal')` | Spec 6 |
| Meditation pages | Add `recordActivity('meditate')` | Spec 6 |
| AudioProvider | Add 30s listen tracker | Spec 5 + 6 |
| Prayer Wall | Add `recordActivity('prayerWall')` | Spec 6 |
| App.tsx router | Auth-based route switching for `/` | Spec 2 |
| Navbar | Bell icon + avatar dropdown (logged-in state) | Spec 2 |

---

## localStorage Key Summary

| Key | Spec | Description |
|-----|------|-------------|
| `wr_auth_simulated` | 2 | Dev toggle for simulated login |
| `wr_user_name` | 2 | Simulated user display name |
| `wr_mood_entries` | 1 | Daily mood entries (max 365) |
| `wr_daily_activities` | 5 | Activity log keyed by date |
| `wr_faith_points` | 5 | Total points, level, progress |
| `wr_streak` | 5 | Current streak, longest, last active |
| `wr_badges` | 7 | Earned badges, newly earned queue, activity counters |
| `wr_friends` | 9 | Friend list, requests, blocked |
| `wr_leaderboard_global` | 10 | Mock global leaderboard |
| `wr_social_interactions` | 11 | Encouragements, nudges, cooldowns |
| `wr_milestone_feed` | 11 | Mock friend milestone events |
| `wr_notifications` | 12 | Notification history + read state |
| `wr_settings` | 13 | Profile, notification prefs, privacy |
| `wr_dashboard_collapsed` | 2 | Widget collapse states |
