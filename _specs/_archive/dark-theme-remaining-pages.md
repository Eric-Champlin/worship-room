# Feature: Dark Theme — Reading Plans, Challenges, Devotional, Settings, Insights, Friends & Profile

## Overview

The remaining light-themed pages — Reading Plans (`/reading-plans`, `/reading-plans/:planId`), Community Challenges (`/challenges`, `/challenges/:challengeId`), Daily Devotional (`/devotional`), Settings (`/settings`), Insights (`/insights`, `/insights/monthly`), Friends (`/friends`), and Growth Profile (`/profile/:userId`) — currently use light backgrounds (`neutral-bg` / `#F5F5F5`) that clash with the dashboard, landing page, Daily Hub, Bible pages, Prayer Wall, and Local Support, which now use a fully dark theme. This spec converts all remaining pages to the unified dark theme, completing the app-wide visual conversion.

This is the **fourth of 6 visual foundation specs**. It builds on the dark theme pattern established in Spec 1 (Daily Hub Dark Theme), Spec 2 (Bible & Ask Dark Theme), and Spec 3 (Prayer Wall & Local Support Dark Theme), applying the same conventions: `#0f0a1e` page background, frosted glass cards at `bg-white/[0.06]` for content and `bg-white/[0.08]` for structural elements, flush dark gradients, and white/opacity text hierarchy.

## User Story

As a **logged-out visitor or logged-in user**, I want all remaining pages to share the same dark theme as the rest of the app, so that navigating anywhere in Worship Room feels like one unified, immersive experience with no visual seams or light/dark page transitions.

## Requirements

### 1. Reading Plan Browser (`/reading-plans`)

#### 1.1 Page Background
- Replace `neutral-bg` (#F5F5F5) page background with solid dark (`#0f0a1e`) edge-to-edge from navbar to footer
- No white or light gray sections anywhere on the page

#### 1.2 Hero Section
- Make the hero gradient flush dark — no floating box appearance, blends seamlessly into the `#0f0a1e` background below
- Hero text (title, subtitle) stays white

#### 1.3 "Create Your Own Plan" Card
- Becomes `bg-primary/[0.08] border border-primary/20` to stand out on the dark background as a distinct CTA
- Card text: title `text-white`, description `text-white/60`
- CTA button stays primary purple

#### 1.4 Filter Pills (Duration & Difficulty)
- Unselected: `bg-white/10 text-white/60`
- Selected: `bg-primary/20 text-primary-lt`

#### 1.5 Plan Cards
- Card container: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Title: `text-white`
- Description: `text-white/60`
- Duration pill: `bg-white/10 text-white/50`
- Difficulty pill: `bg-white/10 text-white/50`
- Theme pill: `bg-white/10 text-white/50`
- "Start Plan" button: stays primary purple
- "Continue" button: `bg-white/10 text-white/70`
- "Completed" badge: stays green

### 2. Reading Plan Detail (`/reading-plans/:planId`)

#### 2.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 2.2 Hero Section
- Flush dark gradient with plan title and progress bar
- Progress bar track: `bg-white/10`, fill stays primary

#### 2.3 Day Content
- Scripture passage: Lora italic, `text-white/70`, verse numbers in `text-white/30`
- Reflection paragraphs: `text-white/80`
- Prayer text: Lora italic, `text-white/60`
- Action step callout: `bg-white/[0.06] border-l-2 border-primary`

#### 2.4 Day Navigation
- Previous/Next day buttons: `bg-white/10 text-white/70`
- Day selector dropdown: `bg-white/[0.08] border border-white/10`
- Locked future days: Lock icon in `text-white/30` with `bg-white/[0.04]`

#### 2.5 AI Plan Creation Flow (3 Steps)
- Step backgrounds: `#0f0a1e`
- Textarea: `bg-white/[0.06] text-white` with `placeholder text-white/40`
- Topic chips: `bg-white/10 text-white/60`; selected `bg-primary/20 text-primary-lt`
- Duration selection cards: `bg-white/[0.06] border border-white/10 hover:border-white/20`
- Loading screen: on dark background with visible spinner/animation

### 3. Challenge Browser (`/challenges`)

#### 3.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge from navbar to footer

#### 3.2 Hero Section
- Flush dark gradient, blends seamlessly into the dark background below
- Hero text stays white

#### 3.3 Active Challenge Featured Card
- `bg-white/[0.06] border-2 border-primary/30` (accent border to stand out as the primary CTA)
- Challenge description: `text-white/70`
- Participant count: `text-white/50`
- Days remaining: displayed in the season theme color (e.g., Lent purple, Easter gold)
- "Join Challenge" button: stays primary purple

#### 3.4 Upcoming Challenge Cards
- `bg-white/[0.06] border border-white/10`
- "Remind me" button: `bg-white/10 text-white/60`

#### 3.5 Past Challenge Cards
- More muted: `bg-white/[0.04] border border-white/[0.06]`
- "Hall of Fame" stats: `text-white/40`

### 4. Challenge Detail (`/challenges/:challengeId`)

#### 4.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 4.2 Hero Section
- Dark gradient with season theme color accent (e.g., subtle purple glow for Lent, gold for Easter)
- Challenge title and season info: `text-white`

#### 4.3 Daily Content
- Same treatment as Reading Plan Detail day content (section 2.3): scripture in Lora italic `text-white/70`, reflections in `text-white/80`, prayer in Lora italic `text-white/60`

#### 4.4 Progress & Navigation
- Progress bar: track `bg-white/10`, fill in season theme color
- Day selector: same dark treatment as Reading Plan (section 2.4)

#### 4.5 Community Activity Feed
- Activity items: `bg-white/[0.04]` with avatar
- Action text: `text-white/70`
- Timestamp: `text-white/40`

#### 4.6 Social & Milestones
- "Share Progress" button: `bg-white/10 text-white/70`
- Milestone celebration cards: frosted glass (`bg-white/[0.06] border border-white/10`)
- Challenge prayer checkbox in composer: visible on dark (label `text-white/70`, checkbox indicator styled for dark)

### 5. Daily Devotional (`/devotional`)

#### 5.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge from navbar to footer

#### 5.2 Hero / Date Navigation
- Flush dark gradient
- Date navigation arrows: `text-white/50 hover:text-white`
- Current date text: `text-white`

#### 5.3 Devotional Content

##### Quote
- Large opening quotation marks: `text-white/20`
- Quote text: Lora italic, `text-white/70`
- Attribution: `text-white/40`

##### Scripture Passage
- Reference: `text-primary-lt`
- Verse text: Lora italic, `text-white/70`
- Verse numbers: `text-white/30`

##### Reflection
- Body paragraphs: `text-white/80`

##### Prayer
- Lora italic, `text-white/60`

##### Reflection Question
- Frosted glass callout: `bg-white/[0.06] border-l-2 border-primary`
- Question text: `text-white/80`

#### 5.4 Section Dividers
- `border-white/10`

#### 5.5 Action Buttons
- Bottom action row (share, complete, etc.): `bg-white/10 text-white/70`
- "Completed" checkmark: stays green

### 6. Settings (`/settings`)

#### 6.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 6.2 Desktop Sidebar
- Background: `bg-white/[0.04] border-r border-white/10`
- Nav items: `text-white/60 hover:text-white hover:bg-white/[0.06]`
- Active nav item: `bg-primary/10 text-primary-lt`

#### 6.3 Mobile Tab Bar
- Frosted glass: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`
- Inactive tab: `text-white/60`
- Active tab: `text-white` with primary indicator

#### 6.4 Content Sections
- Section cards: `bg-white/[0.06] border border-white/10 rounded-xl`
- Section headings: `text-white`

#### 6.5 Form Controls
- Text inputs: `bg-white/[0.06] text-white border border-white/10 focus:border-primary`
- Placeholder text: `text-white/40`
- Labels: `text-white/70`
- Toggle switches: track `bg-white/10` (off), `bg-primary` (on) — existing color states preserved
- Dropdown selects: `bg-white/[0.06] border border-white/10 text-white`

#### 6.6 Avatar Picker Modal
- Modal background: `bg-[#1a0f2e] border border-white/10`
- Avatar options: visible on dark background

#### 6.7 Danger Zone
- Danger zone card: `bg-red-500/[0.06] border border-red-500/20`
- "DELETE" confirmation input: `bg-white/[0.06]` with red border on focus (`focus:border-red-500`)
- Danger text: `text-red-400`

### 7. Insights (`/insights`)

#### 7.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 7.2 Time Range Selector (Sticky Bar)
- Frosted glass: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`
- Pills — unselected: `bg-white/10 text-white/60`; selected: `bg-primary/20 text-primary-lt`

#### 7.3 Calendar Heatmap
- Grid cells: mood colors at appropriate opacity on dark (the mood hex colors already pop on dark backgrounds — verify contrast and visibility)
- Empty day cells: `bg-white/[0.04]`
- Day labels: `text-white/40`
- Month labels: `text-white/50`

#### 7.4 Mood Trend Chart (Recharts)
- Chart background: transparent (no white fill)
- Grid lines: `stroke: rgba(255,255,255,0.1)` (white/10)
- Axis labels: `fill: rgba(255,255,255,0.4)` (white/40)
- Tooltip: dark background (`bg-[#1a0f2e] border border-white/10 text-white`)
- Line/dot colors: stay as-is (mood colors)

#### 7.5 Content Cards
- AI insight cards: `bg-white/[0.06] border border-white/10 rounded-xl`
- Activity correlation cards: same treatment
- Scripture connection cards: same treatment
- Card titles: `text-white`
- Card body text: `text-white/70`

#### 7.6 Meditation History Chart (Recharts)
- Same dark Recharts treatment as the mood trend chart (section 7.4)
- Bar colors: stay as-is

#### 7.7 "View Monthly Report" CTA
- `bg-white/10 text-white/70 hover:bg-white/15`

### 8. Monthly Report (`/insights/monthly`)

#### 8.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 8.2 Month Navigation
- Navigation arrows: `text-white/50 hover:text-white`
- Month/year text: `text-white`

#### 8.3 Stat Cards
- Frosted glass: `bg-white/[0.06] border border-white/10 rounded-xl`
- Stat value: `text-white`
- Stat label: `text-white/60`

#### 8.4 Charts
- Heatmap: same treatment as section 7.3
- Activity bar chart: same dark Recharts treatment as section 7.4

#### 8.5 Highlights & Insight Cards
- Frosted glass: `bg-white/[0.06] border border-white/10 rounded-xl`
- Text hierarchy: title `text-white`, body `text-white/70`

#### 8.6 Share & Email Preview
- Share button: `bg-white/10 text-white/70`
- Email preview modal: `bg-[#1a0f2e] border border-white/10`

### 9. Friends (`/friends`)

#### 9.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 9.2 Tab Bar (Friends / Leaderboard)
- Dark tab bar: `bg-white/[0.08] border-b border-white/10`
- Inactive tab: `text-white/60`
- Active tab: `text-white` with primary underline

#### 9.3 Friends Tab

##### Search
- Search input: `bg-white/[0.06] text-white` with `placeholder text-white/40`

##### Invite Section
- Frosted glass card: `bg-white/[0.06] border border-white/10 rounded-xl`

##### Pending Request Cards
- `bg-white/[0.06] border border-white/10`
- Name: `text-white`
- Accept/Decline buttons: Accept stays primary, Decline `bg-white/10 text-white/60`

##### Friend List Items
- Name: `text-white`
- Status/level text: `text-white/40`
- Encourage button: `bg-white/10 text-white/60`
- Menu dropdown (Remove/Block): `bg-white/[0.08] border border-white/10`

##### Suggestion Cards
- `bg-white/[0.06] border border-white/10`

#### 9.4 Leaderboard Tab

##### Board Selector Pills
- Unselected: `bg-white/10 text-white/60`
- Selected: `bg-primary/20 text-primary-lt`

##### Leaderboard Rows
- Odd rows: `bg-white/[0.04]`
- Even rows: `bg-white/[0.06]`
- Medal icons: stay gold/silver/bronze (no change)
- Username: `text-white`
- Points: `text-white/60`
- Current user row: highlighted with `bg-primary/[0.08]`

### 10. Growth Profile (`/profile/:userId`)

#### 10.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 10.2 Profile Header Card
- Frosted glass: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- User name: `text-white`
- Level/title: `text-white/60`
- Avatar: verify it displays correctly on dark background (no white halo or clipped edges)

#### 10.3 Badge Showcase Grid
- Earned badges: stay colorful (no change)
- Locked badges: `bg-white/[0.04]` with lock icon in `text-white/20`

#### 10.4 Stats Section
- Stat cards: frosted glass (`bg-white/[0.06] border border-white/10 rounded-xl`)
- Stat value: `text-white`
- Stat label: `text-white/60`

#### 10.5 Visual Garden SVG
- Verify the static garden SVG renders correctly on the `#0f0a1e` dark page background — the garden may have built-in background elements that need to be checked

### 11. Cross-Page Consistency

- Verify the SiteFooter has no visible seam where dark content meets the dark footer on **all pages converted in this spec**
- Verify the navbar frosted glass looks correct over the dark page backgrounds
- All frosted glass structural elements use `bg-white/[0.08]`; content cards and inputs use `bg-white/[0.06]`
- All text meets WCAG AA contrast on dark backgrounds

## Acceptance Criteria

### Reading Plan Browser (`/reading-plans`)
- [ ] Page background is solid dark (#0f0a1e) from navbar to footer with no light sections
- [ ] Hero gradient is flush dark — blends seamlessly into the dark background
- [ ] "Create Your Own Plan" card uses `bg-primary/[0.08] border border-primary/20`
- [ ] Filter pills: unselected `bg-white/10`, selected `bg-primary/20 text-primary-lt`
- [ ] Plan cards use `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- [ ] Card text: title `text-white`, description `text-white/60`
- [ ] Metadata pills (duration, difficulty, theme) use `bg-white/10 text-white/50`
- [ ] "Start Plan" button stays primary purple
- [ ] "Continue" button uses `bg-white/10 text-white/70`
- [ ] "Completed" badge stays green

### Reading Plan Detail (`/reading-plans/:planId`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Hero is flush dark with visible progress bar (track `bg-white/10`, fill primary)
- [ ] Scripture text is Lora italic `text-white/70` with verse numbers `text-white/30`
- [ ] Reflection text is `text-white/80`
- [ ] Prayer text is Lora italic `text-white/60`
- [ ] Action step callout uses `bg-white/[0.06] border-l-2 border-primary`
- [ ] Day navigation buttons use `bg-white/10 text-white/70`
- [ ] Day selector dropdown uses `bg-white/[0.08] border border-white/10`
- [ ] Locked future days show Lock icon `text-white/30` with `bg-white/[0.04]`
- [ ] AI plan creation flow: all 3 steps render on dark backgrounds
- [ ] AI flow textarea uses `bg-white/[0.06] text-white`
- [ ] AI flow topic chips use `bg-white/10`; selected `bg-primary/20`
- [ ] AI flow duration cards use `bg-white/[0.06] border border-white/10 hover:border-white/20`
- [ ] AI flow loading screen renders on dark background

### Challenge Browser (`/challenges`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Hero gradient is flush dark
- [ ] Active challenge card uses `bg-white/[0.06] border-2 border-primary/30`
- [ ] Challenge description is `text-white/70`, participant count `text-white/50`
- [ ] "Join Challenge" button stays primary
- [ ] Upcoming cards use `bg-white/[0.06] border border-white/10`
- [ ] "Remind me" button uses `bg-white/10 text-white/60`
- [ ] Past challenge cards use `bg-white/[0.04] border border-white/[0.06]`
- [ ] "Hall of Fame" stats use `text-white/40`

### Challenge Detail (`/challenges/:challengeId`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Hero has season theme color accent on dark gradient
- [ ] Daily content follows Reading Plan detail text treatment
- [ ] Progress bar: track `bg-white/10`, fill in season theme color
- [ ] Community activity items use `bg-white/[0.04]` with `text-white/70` action text
- [ ] "Share Progress" button uses `bg-white/10 text-white/70`
- [ ] Milestone celebration cards use frosted glass
- [ ] Challenge prayer checkbox is visible on dark

### Devotional (`/devotional`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Hero is flush dark with date navigation arrows `text-white/50 hover:text-white`
- [ ] Quote uses Lora italic `text-white/70` with large quotation marks in `text-white/20`
- [ ] Quote attribution is `text-white/40`
- [ ] Scripture reference is `text-primary-lt`
- [ ] Scripture verse text is Lora italic `text-white/70` with verse numbers `text-white/30`
- [ ] Reflection paragraphs are `text-white/80`
- [ ] Prayer is Lora italic `text-white/60`
- [ ] Reflection question callout uses `bg-white/[0.06] border-l-2 border-primary`
- [ ] Section dividers use `border-white/10`
- [ ] Action buttons use `bg-white/10 text-white/70`
- [ ] "Completed" checkmark stays green

### Settings (`/settings`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Desktop sidebar uses `bg-white/[0.04] border-r border-white/10`
- [ ] Sidebar nav: inactive `text-white/60`, active `bg-primary/10 text-primary-lt`
- [ ] Mobile tab bar uses frosted glass (`bg-white/[0.08] backdrop-blur-xl`)
- [ ] Content sections use `bg-white/[0.06] border border-white/10`
- [ ] Form inputs use `bg-white/[0.06] text-white border border-white/10 focus:border-primary`
- [ ] Toggle switch track: `bg-white/10` (off), `bg-primary` (on)
- [ ] Dropdown selects use `bg-white/[0.06] border border-white/10 text-white`
- [ ] Avatar picker modal uses `bg-[#1a0f2e] border border-white/10`
- [ ] Danger zone card uses `bg-red-500/[0.06] border border-red-500/20`
- [ ] "DELETE" input uses `bg-white/[0.06]` with `focus:border-red-500`

### Insights (`/insights`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Time range sticky bar uses frosted glass with pills: unselected `bg-white/10`, selected `bg-primary/20`
- [ ] Calendar heatmap: mood colors visible on dark, empty cells `bg-white/[0.04]`
- [ ] Mood trend chart: transparent background, grid lines white/10, axis labels white/40
- [ ] Recharts tooltip uses dark background (`bg-[#1a0f2e]`)
- [ ] AI insight cards use `bg-white/[0.06] border border-white/10`
- [ ] Meditation history chart uses same dark Recharts treatment
- [ ] "View Monthly Report" CTA uses `bg-white/10 text-white/70`

### Monthly Report (`/insights/monthly`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Month navigation arrows `text-white/50 hover:text-white`
- [ ] Stat cards use frosted glass
- [ ] Charts use dark Recharts treatment
- [ ] Highlights and insight cards use frosted glass
- [ ] Share button uses `bg-white/10 text-white/70`
- [ ] Email preview modal uses `bg-[#1a0f2e] border border-white/10`

### Friends (`/friends`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Tab bar uses `bg-white/[0.08] border-b border-white/10`
- [ ] Friend search input uses `bg-white/[0.06] text-white`
- [ ] Invite section uses frosted glass
- [ ] Pending request cards use `bg-white/[0.06]`
- [ ] Friend list: name `text-white`, status `text-white/40`, Encourage `bg-white/10`
- [ ] Menu dropdown uses `bg-white/[0.08] border border-white/10`
- [ ] Suggestion cards use `bg-white/[0.06]`
- [ ] Leaderboard pills: unselected `bg-white/10`, selected `bg-primary/20`
- [ ] Leaderboard rows alternate `bg-white/[0.04]` and `bg-white/[0.06]`
- [ ] Medal icons stay gold/silver/bronze
- [ ] Current user row highlighted with `bg-primary/[0.08]`

### Growth Profile (`/profile/:userId`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Profile header card uses frosted glass
- [ ] Avatar displays correctly on dark (no white halo or clipping)
- [ ] Earned badges stay colorful; locked badges use `bg-white/[0.04]` with lock icon `text-white/20`
- [ ] Stats cards use frosted glass
- [ ] Garden SVG renders correctly on `#0f0a1e` background

### Responsive
- [ ] Dark theme renders correctly at mobile (375px) on all pages — no light edges, gaps, or overflow
- [ ] Dark theme renders correctly at tablet (768px) on all pages
- [ ] Dark theme renders correctly at desktop (1440px) on all pages
- [ ] Dark background extends full-width with no light edges or gaps at any breakpoint
- [ ] All frosted glass cards are distinguishable from the background (border-white/10 provides edge definition)
- [ ] Settings sidebar is hidden on mobile, replaced by tab bar — both use dark treatment
- [ ] Insights sticky bar remains sticky and functional at all breakpoints

### Accessibility
- [ ] Text contrast meets WCAG AA on the dark background (white/80 on #0f0a1e is approximately 11:1 ratio)
- [ ] All interactive elements remain keyboard-navigable
- [ ] Focus indicators are visible on the dark background
- [ ] Screen readers are unaffected (no changes to ARIA attributes or semantic structure)
- [ ] Recharts charts maintain accessible labels/descriptions

### General
- [ ] No changes to functionality, layout, spacing, or interactive behavior — purely visual
- [ ] SiteFooter has no visible seam on any page converted in this spec
- [ ] All existing tests pass (update test assertions for class name changes if needed)

## UX & Design Notes

- **Tone**: The dark theme creates a more immersive, contemplative atmosphere across all pages
- **Colors**: Follows the exact pattern from Specs 1-3 — `#0f0a1e` page background, `bg-white/[0.06]` content cards, `bg-white/[0.08]` structural elements (sticky bars, sidebars, tab bars, dropdowns), white/opacity text hierarchy
- **Typography**: No font changes — only color changes. All fonts (Inter, Lora, Caveat) remain the same
- **Design system recon reference**: The Inner Page Hero gradient pattern documented in `_plans/recon/design-system.md` is being replaced with flush dark gradients on all pages in this spec. Card patterns, frosted glass conventions, and text hierarchy are established in Specs 1-3.
- **Recharts dark treatment**: This is a new pattern introduced in this spec (Insights page). The convention is: transparent chart background, `rgba(255,255,255,0.1)` grid lines, `rgba(255,255,255,0.4)` axis labels, dark tooltip background. This pattern should be documented for any future chart additions.
- **Settings sidebar**: The desktop sidebar and mobile tab bar conversion introduce a sidebar-on-dark pattern not seen in prior specs. The sidebar uses `bg-white/[0.04]` (lighter than structural `bg-white/[0.08]`) because it is a secondary navigation surface.
- **Danger zone**: The red-tinted frosted glass (`bg-red-500/[0.06] border border-red-500/20`) is a new accent pattern for destructive actions on dark backgrounds.
- **New visual patterns**: Recharts dark treatment (4 properties), Settings sidebar dark pattern, danger zone red accent card, alternating leaderboard row backgrounds. All other patterns are established from Specs 1-3.

### Responsive Behavior

- **Mobile (< 640px)**: Dark background extends full-width on all pages. Content stacks single-column. Settings sidebar is replaced by horizontal tab bar (frosted glass). Insights sticky bar scrolls horizontally if pills overflow. Reading plan cards, challenge cards, friend items all stack vertically. Touch targets remain 44px minimum.
- **Tablet (640px - 1024px)**: Same dark theme. Content uses existing max-width constraints. Settings may show sidebar or tab bar depending on existing breakpoint. Cards may render in 2-column grid where existing layout supports it.
- **Desktop (> 1024px)**: Same dark theme. Settings shows sidebar + content side-by-side. Insights charts use full available width. Leaderboard table uses comfortable row spacing. Frosted glass effects render with full backdrop-blur support.

## AI Safety Considerations

- **Crisis detection needed?**: No — none of the pages in this spec accept user text input that would require crisis keyword detection. (Settings name input and any existing text fields retain their existing validation; no new text input is introduced.)
- **User input involved?**: Minimal — Settings form inputs (name, preferences) and Reading Plans AI creation textarea already have existing handling. No changes to input processing.
- **AI-generated content?**: The AI plan creation flow and AI insight cards display AI-generated text — these retain their existing plain-text rendering. No changes to how AI content is rendered or handled.

## Auth & Persistence

- **No changes to auth gating** — all existing auth gates remain exactly as they are
- **No changes to persistence** — all localStorage keys and data flows remain unchanged
- **Route types**:
  - Public: `/reading-plans`, `/reading-plans/:planId`, `/challenges`, `/challenges/:challengeId`, `/devotional`
  - Protected: `/settings`, `/insights`, `/insights/monthly`, `/friends`, `/profile/:userId`
- This spec is purely visual — it changes CSS classes, not component structure or data flow

### Auth Behavior Summary (unchanged, for reference)

- **Logged-out users CAN**: Browse reading plans, view plan details, browse challenges, view challenge details, read the daily devotional, view growth profiles
- **Logged-out users CANNOT**: Access Settings (redirects to login), access Insights (redirects to login), access Friends page (redirects to login), start a reading plan (auth modal), join a challenge (auth modal), mark devotional as completed (auth modal), use AI plan creation (auth modal)
- **All interactive actions on protected routes require authentication** — this is enforced by existing route guards and is not changed by this spec

## Out of Scope

- **Dark theme for pages already converted** — Specs 1-3 handle Daily Hub, Bible/Ask, Prayer Wall, and Local Support
- **Dark theme for Music page** — Music has its own visual theme that may be addressed in a future spec
- **Dark theme for Meditation sub-pages** — These routes redirect when logged out and have their own visual treatment
- **Dark mode toggle** — This is a permanent dark theme conversion, not a user-togglable dark mode
- **New component creation** — This spec reuses existing components with updated Tailwind classes
- **Backend changes** — No API or backend changes
- **New animations or interactions** — All existing animations remain; no new ones added
- **Navbar or footer changes** — Already dark; only verify no visual seams
- **Tailwind config changes** — All values should be achievable with Tailwind arbitrary values; if a new config token is needed, that's an implementation decision for `/plan`
- **Recharts library upgrades** — Use existing Recharts version; only change color/style props
- **Chart data or logic** — No changes to what data the charts display or how it's calculated
