# Feature: Skeleton Loading System

**Master Plan Reference:** N/A — standalone infrastructure feature

---

## Overview

As Worship Room prepares for Phase 3 (real API calls replacing localStorage reads), every page will experience loading latency for the first time. Without consistent loading states, users will see blank screens or content flashes — jarring for an app designed around peace and emotional safety. This spec defines a unified skeleton loading system: shared primitives that compose into page-specific skeleton screens, creating smooth visual continuity while content loads.

## User Story

As a **logged-in user or logged-out visitor**, I want to see a calm, recognizable placeholder of the page layout while content loads so that the experience feels smooth and intentional rather than broken or empty.

## Requirements

### Functional Requirements

#### Skeleton Primitives

1. **SkeletonBlock** — a single animated placeholder rectangle.
   - Props: `width` (string | number, default `"100%"`), `height` (string | number, default `"16px"`), `rounded` (string, default `"rounded-md"`), `className` (optional).
   - Renders a `div` with `bg-white/[0.06]` and a shimmer animation.
   - Shimmer: a subtle left-to-right gradient sweep (`linear-gradient` at 90deg: `transparent 0%`, `white/[0.04] 50%`, `transparent 100%`) that moves across the block over 1.5 seconds on infinite loop.
   - Shimmer is purely CSS: `background-size: 200% 100%`, animate `background-position` from `200%` to `-200%`.
   - On `prefers-reduced-motion`: shimmer stops, block is a static `bg-white/[0.06]`.

2. **SkeletonText** — a group of SkeletonBlock lines simulating a text paragraph.
   - Props: `lines` (number, default `3`), `gap` (string, default `"gap-2"`), `lastLineWidth` (string, default `"60%"`).
   - Renders the specified number of SkeletonBlock elements stacked vertically.
   - The last line uses `lastLineWidth` to simulate a natural paragraph ending.

3. **SkeletonCircle** — a circular skeleton for avatars.
   - Props: `size` (number, default `40`).
   - Renders a SkeletonBlock with `rounded-full` and equal width/height.

4. **SkeletonCard** — a full card skeleton combining multiple primitives.
   - Renders a frosted glass container: `bg-white/[0.06] border border-white/10 rounded-xl p-4`.
   - Props: `variant` (string) selecting from pre-built card layouts, `className` (optional).

#### Page-Specific Skeleton Screens

5. **DashboardSkeleton** — mimics the dashboard layout.
   - Hero section: SkeletonText (2 lines for greeting and subtitle).
   - 2-column grid (desktop) / single column (mobile) of 6 SkeletonCard elements matching dashboard widget sizes:
     - Garden area: large SkeletonBlock (200px tall, `rounded-2xl`).
     - Streak card: SkeletonCircle (flame icon area) next to SkeletonText (2 lines).
     - Mood chart: SkeletonBlock (180px tall) for chart area.
     - Activity checklist: 6 short SkeletonBlock lines with SkeletonCircle (checkbox area) next to each.
     - Two additional widget cards with generic SkeletonText content.

6. **DailyHubSkeleton** — mimics the Daily Hub.
   - Hero area: 2 SkeletonCards side by side (VOTD and devotional placeholders).
   - Tab bar: 4 SkeletonBlock pills (60px wide, 32px tall, `rounded-full`) in a row.
   - Content area: large SkeletonBlock (textarea placeholder) + 3 small SkeletonBlock pills (starter chips).

7. **PrayerWallSkeleton** — mimics the Prayer Wall feed.
   - SkeletonCard for the composer area.
   - Row of SkeletonBlock pills for category filters.
   - 4 SkeletonCards stacked vertically, each containing: SkeletonCircle (avatar) + SkeletonText (2 lines for author and content) + row of small SkeletonBlocks (interaction buttons).

8. **BibleBrowserSkeleton** — mimics the Bible browser.
   - SkeletonBlock for the Books/Search toggle.
   - Two large SkeletonCards (OT and NT accordion sections) each containing 5-6 SkeletonBlock rows (book list items).

9. **BibleReaderSkeleton** — mimics the Bible chapter reading view.
   - **Note:** The existing `ChapterPlaceholder` component is NOT a loading skeleton — it's a "content not available" fallback linking to BibleGateway. This is a separate, new component.
   - 20 SkeletonText blocks (simulating verses) with varying widths.
   - Small SkeletonBlock elements inline before each text block (verse number superscripts).

10. **GrowPageSkeleton** — mimics the `/grow` page.
    - Tab bar: 2 SkeletonBlock pills.
    - SkeletonCard (Create Your Own Plan CTA).
    - Row of SkeletonBlock pills (filters).
    - 2-column grid of 4 SkeletonCards (plan cards).

11. **InsightsSkeleton** — mimics the insights page.
    - Row of SkeletonBlock pills (time range selector).
    - Large SkeletonBlock (300px tall, for heatmap/chart area).
    - 3 SkeletonCards (AI insight cards).

12. **FriendsSkeleton** — mimics the friends page.
    - Tab bar: 2 SkeletonBlock pills.
    - SkeletonBlock (search input).
    - 5 SkeletonCards each with SkeletonCircle (avatar) + SkeletonText (1 line for name) + small SkeletonBlock (action button).

13. **SettingsSkeleton** — mimics settings.
    - Sidebar: 4 SkeletonBlock rows (nav items).
    - Content area: 3 SkeletonCards each containing SkeletonText (3 lines) + SkeletonBlock toggles.

14. **MyPrayersSkeleton** — mimics the prayer list.
    - SkeletonCard (composer).
    - 4 SkeletonCards each with SkeletonText (2 lines for title and description) + SkeletonBlock pills (category badge, status badge).

15. **MusicSkeleton** — mimics the music page.
    - Tab bar: 3 SkeletonBlock pills.
    - Large SkeletonCard (hero playlist).
    - 2x2 grid of SkeletonCards (playlist cards).

16. **ProfileSkeleton** — mimics the growth profile.
    - Large SkeletonCard (profile header with SkeletonCircle for avatar + SkeletonText for name/level).
    - Grid of small SkeletonCircles (badge showcase).

#### useLoadingState Hook

17. **`useLoadingState`** hook manages the loading-to-content transition.
    - Accepts `isLoading` (boolean).
    - Returns `shouldShowSkeleton` (boolean) with a minimum display time of 300ms:
      - If data arrives in under 300ms: skip the skeleton entirely, show content immediately.
      - If data takes longer than 300ms: show the skeleton until data arrives, then transition to content.
    - Returns a `contentRef` that triggers a content fade-in animation when transitioning from skeleton to content.
    - Skeleton-to-content transition: content fades in (opacity 0→1 over 300ms), skeleton fades out simultaneously (opacity 1→0 over 150ms).
    - On `prefers-reduced-motion`: instant swap, no animation.

#### Integration (Phase 2 — Now)

18. **Bible reader chapter loading** — Use BibleReaderSkeleton while Bible chapter JSON files are being lazy-loaded. Do not replace `ChapterPlaceholder` (that serves a different purpose — "content not available" fallback).

19. **Spotify embed loading** — Show a skeleton placeholder until the Spotify iframe loads or times out.

20. **React.lazy Suspense fallback** — The existing pulsing logo fallback (from route code splitting) remains for route-level loading. Page-specific skeletons are for content within a route, not route transitions.

#### Phase 3 Preparation

21. All skeleton components exported from a central index (`components/skeletons/index.ts`).

22. Each page component receives a comment at the top noting which skeleton to use: `// Loading state: use DashboardSkeleton` — enabling fast Phase 3 migration.

### Non-Functional Requirements

- **Performance**: Shimmer animation is pure CSS — no JavaScript animation frames, no re-renders.
- **Accessibility**: All skeletons are `aria-hidden="true"` with an `sr-only` "Loading" text for screen readers. Each skeleton's parent container has `aria-busy="true"`.
- **Reduced motion**: All shimmer animations use `motion-safe:` guards. On `prefers-reduced-motion`, blocks are static. Skeleton-to-content transitions are instant swaps.
- **Dark theme**: All skeletons use `bg-white/[0.06]` on the app's dark background (`#0f0a1e`).

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View skeleton loading states | Skeletons display identically | Skeletons display identically | N/A |

Skeleton screens are purely visual placeholders — no interactive elements, no auth gating needed. They appear and disappear automatically based on content loading state.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All skeleton grids collapse to single column. Tab pill rows wrap naturally. Card skeletons stack vertically. |
| Tablet (640-1024px) | 2-column grids where the real page uses them. Settings sidebar becomes top tabs. |
| Desktop (> 1024px) | Full multi-column layouts matching actual page structure (e.g., Dashboard 60/40 split). |

Each page skeleton mirrors the responsive behavior of the actual page it represents. If the real Dashboard uses a 2-column grid on desktop that stacks on mobile, the DashboardSkeleton does the same.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. Skeletons are inert visual placeholders.

## Auth & Persistence

- **Logged-out users:** Skeletons display normally. No data involved.
- **Logged-in users:** Skeletons display normally. No data involved.
- **localStorage usage:** None. Skeletons are stateless visual components.

## Completion & Navigation

N/A — standalone infrastructure feature. Skeletons appear and disappear automatically as content loads.

## Design Notes

- **Colors**: Use `bg-white/[0.06]` for skeleton blocks (matches the frosted glass card pattern from the design system: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`).
- **Card containers**: Use `bg-white/[0.06] border border-white/10 rounded-xl p-4` for SkeletonCard (slightly less rounded than dashboard cards to differentiate, but same opacity/border pattern).
- **Shimmer gradient**: `transparent → white/[0.04] → transparent` — extremely subtle, not distracting. The shimmer should feel calm and meditative, not anxious.
- **Typography reference**: Skeleton text line heights should approximate the design system's body text (16px default height for SkeletonBlock).
- **Dashboard layout**: Mirror the 60/40 column split with frosted glass cards.
- **Existing animations**: The shimmer animation should be registered in `tailwind.config` alongside existing custom animations (`animate-glow-pulse`, `animate-fade-in`, etc.). Name it `animate-shimmer`.
- **Design system recon**: Reference `_plans/recon/design-system.md` for exact card border-radius, padding, and background opacity values when implementing.

## Out of Scope

- **Changing any feature behavior, data loading, or component structure** — this spec only creates skeleton components and integrates them at existing loading points.
- **Real API loading states** — Phase 3 work. This spec builds the components; Phase 3 will wire them to actual API calls.
- **Dark mode variants** — skeletons are already dark-themed by default.
- **Error states or retry UI** — separate concern from loading skeletons.
- **Replacing `ChapterPlaceholder`** — that component serves a "content not available" purpose (linking to BibleGateway), not a "content is loading" purpose. Both can coexist.
- **Changing the route-level Suspense fallback** — the pulsing logo is fine for route transitions. Page skeletons are for content within routes.
- **Backend work** — purely frontend components.
- **Loading skeleton for Ask God's Word (`/ask`)** — the AI chat interface doesn't have a traditional "page load" pattern; it starts empty and fills as the user interacts.

## Acceptance Criteria

- [ ] `SkeletonBlock` renders a `div` with `bg-white/[0.06]` and accepts `width`, `height`, `rounded`, and `className` props
- [ ] `SkeletonBlock` shimmer animation sweeps left-to-right over 1.5 seconds on infinite loop
- [ ] `SkeletonBlock` shimmer stops on `prefers-reduced-motion`, showing a static `bg-white/[0.06]` block
- [ ] `SkeletonText` renders the correct number of lines with the last line at `lastLineWidth`
- [ ] `SkeletonCircle` renders a circular skeleton with `rounded-full` and specified size
- [ ] `SkeletonCard` renders a frosted glass container (`bg-white/[0.06] border border-white/10 rounded-xl p-4`) with variant-based content
- [ ] All 12 page-specific skeletons (Dashboard, DailyHub, PrayerWall, BibleBrowser, BibleReader, GrowPage, Insights, Friends, Settings, MyPrayers, Music, Profile) are implemented
- [ ] Each page skeleton mirrors the responsive layout of its corresponding real page (single column on mobile, multi-column on desktop)
- [ ] `useLoadingState` hook returns `shouldShowSkeleton: false` when data arrives in under 300ms (no skeleton flash)
- [ ] `useLoadingState` hook returns `shouldShowSkeleton: true` when data takes longer than 300ms, then transitions to content
- [ ] Skeleton-to-content transition: content fades in (opacity 0→1, 300ms), skeleton fades out (opacity 1→0, 150ms)
- [ ] On `prefers-reduced-motion`, skeleton-to-content swap is instant (no animation)
- [ ] All skeletons have `aria-hidden="true"` with `sr-only` "Loading" text
- [ ] Parent containers of skeletons have `aria-busy="true"`
- [ ] Shimmer animation uses `motion-safe:` Tailwind guard
- [ ] Bible reader shows `BibleReaderSkeleton` while chapter JSON loads (existing `ChapterPlaceholder` unchanged)
- [ ] Spotify embed areas show a skeleton placeholder until the iframe loads or times out
- [ ] All skeleton components exported from `components/skeletons/index.ts`
- [ ] Each page component has a comment noting which skeleton to use (e.g., `// Loading state: use DashboardSkeleton`)
- [ ] Shimmer animation registered in `tailwind.config` as `animate-shimmer`
- [ ] No existing feature behavior, data loading, or component structure is changed
