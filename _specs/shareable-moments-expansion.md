# Feature: Shareable Moments Expansion

## Overview

The verse share canvas system produces genuinely beautiful, Instagram-worthy images and is the single most shareable feature in the app. But badge unlocks, streak milestones, level-ups, and monthly insights are all deeply personal moments that users would naturally want to share with friends and community, yet there's no way to generate a shareable image for any of them. This spec extends the canvas share system to 4 new shareable moment types, turning personal growth milestones into organic growth channels for the app. Every shared card is a marketing asset that costs nothing and carries authentic emotional testimony.

## User Story

As a **logged-in user**, I want to **share my badge unlocks, streak milestones, level-ups, and monthly insights as beautiful images** so that **I can celebrate my spiritual growth journey with friends and inspire others to begin their own**.

---

## Requirements

### 1. Badge Unlock Share Card

**Trigger:** When a badge is earned and the celebration overlay or toast appears, a "Share" button becomes available.

**Behavior:**
- For tier 2-3 badges that display in the `CelebrationOverlay`, add a "Share" button alongside the existing dismiss/close button
- For tier 1 badges that display as toasts via `CelebrationQueue`, add a small share icon if the toast format supports it cleanly. If it doesn't, skip tier 1 badge sharing rather than forcing a bad UX.
- Tapping "Share" generates a 1080x1080 canvas card and opens the share flow (copy, download, native share)
- The celebration overlay remains visible after sharing; user must explicitly close it

**Canvas card content:**
- Large centered badge icon (emoji from badge definition)
- "Badge Unlocked!" heading
- Badge name in quotes (e.g., "Prayer Warrior")
- Badge description (e.g., "Prayed 50 times on the wall")
- Divider line
- "Worship Room" watermark

**Canvas visual style:**
- Background: dark gradient with subtle purple accent (match the celebration overlay aesthetic). Reference the hero-dark `#0D0620` to hero-mid `#1E0B3E` gradient family with a purple (`#6D28D9`) radial glow.
- Text: white primary text, `rgba(255,255,255,0.7)` secondary text
- Font: Inter for headings/body, fallback to system sans-serif

### 2. Streak Milestone Share Card

**Trigger:** When the user hits a streak milestone (7, 14, 30, 60, 90, 180, 365 days) and the celebration overlay fires, a "Share" button appears.

**Behavior:**
- The `CelebrationOverlay` already handles streak milestones. The share button and card content should adapt based on the celebration type (streak vs badge vs level-up).
- Same share flow as badge cards

**Canvas card content:**
- Large fire emoji centered
- Streak heading (e.g., "30-Day Streak!")
- Milestone-specific encouragement message (see table below)
- Divider line
- "Worship Room" watermark

**Milestone-specific messages (warm, celebratory tone):**

| Days | Message |
|------|---------|
| 7 | "One week of faithfulness. Every day matters." |
| 14 | "Two weeks of showing up. A rhythm is forming." |
| 30 | "One month of showing up. That's not discipline -- that's devotion." |
| 60 | "Two months of walking with God. Your roots are deep." |
| 90 | "Three months. You've built something rare and beautiful." |
| 180 | "Half a year of faithfulness. Look how far you've come." |
| 365 | "One full year. Every single day. This is extraordinary." |

**Canvas visual style:**
- Background: dark gradient with warm amber/orange accent (`#D97706` to `#C2703E` family)
- Message in serif italic (Lora) for emotional warmth
- Font fallback: system serif

### 3. Level Up Share Card

**Trigger:** When the user reaches a new faith level (Sprout, Blooming, Flourishing, Oak, Lighthouse), the celebration overlay fires. A "Share" button appears.

**Behavior:**
- Same share overlay pattern as badge and streak cards
- Level 1 (Seedling) is the starting level and does not produce a level-up event, so no share card needed for it

**Canvas card content:**
- Large level icon (emoji) centered
- "Level Up!" heading
- Level name and number (e.g., "Flourishing -- Level 4")
- Growth-themed scripture verse (WEB translation) in serif italic
- Scripture reference below the verse
- Divider line
- "Worship Room" watermark

**Level-specific content:**

| Level | Name | Icon | Verse (WEB) | Reference |
|-------|------|------|-------------|-----------|
| 2 | Sprout | Sprout emoji | "He will be like a tree planted by the streams of water." | Psalm 1:3 |
| 3 | Blooming | Blossom emoji | "The desert will rejoice and blossom like a rose." | Isaiah 35:1 |
| 4 | Flourishing | Herb emoji | "The righteous shall flourish like the palm tree." | Psalm 92:12 |
| 5 | Oak | Tree emoji | "They will be called oaks of righteousness, the planting of the Lord." | Isaiah 61:3 |
| 6 | Lighthouse | House emoji | "You are the light of the world. A city set on a hill can't be hidden." | Matthew 5:14 |

**Canvas visual style:**
- Background: dark gradient with green/nature accent (`#27AE60` to `#34D399` family)
- Verse text in Lora serif italic
- Font fallback: system serif

### 4. Monthly Insights Summary Card

**Trigger:** On the Monthly Report page (`/insights/monthly`), a "Share This Month" button generates a visual summary card.

**Behavior:**
- Button placed in the page header or footer area
- Pulls stats from the existing monthly report data (the page already computes these for display)
- Only includes stats with non-zero values (omit lines for activities the user didn't do that month)

**Canvas card content:**
- "My {Month} {Year}" heading (e.g., "My March 2026")
- Vertical stat list with emoji prefixes, one per line:
  - Mood summary with average (e.g., "Mood: Mostly Good (avg 3.8)")
  - Prayer count
  - Journal entry count
  - Meditation count
  - Bible chapter count
  - Best streak length
- Divider line
- "Worship Room" watermark

**Canvas visual style:**
- Background: dark gradient with purple accent (app's primary `#6D28D9` family)
- Stats left-aligned within a centered content block
- Size: 1080x1080 (square) primary. Story size (1080x1920) as a bonus if the vertical stat list fits naturally.

---

## Auth Gating

All 4 shareable moment types are inherently auth-gated because the triggering events only occur for logged-in users:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Badge celebration + share | N/A -- badges only trigger for logged-in users | Share button visible on celebration overlay | N/A |
| Streak milestone + share | N/A -- streaks only tracked for logged-in users | Share button visible on celebration overlay | N/A |
| Level up + share | N/A -- levels only tracked for logged-in users | Share button visible on celebration overlay | N/A |
| Monthly insights share | Page is auth-gated (`/insights/monthly`) | "Share This Month" button visible | N/A (page-level auth gate) |

No additional auth modals needed -- all features exist within already-gated experiences.

---

## Responsive Behavior

### Celebration Overlay (Badges, Streaks, Level-ups)

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Share and Close buttons stack vertically or sit side-by-side within the overlay's existing mobile layout. Both buttons must meet 44px minimum touch target. |
| Tablet (640-1024px) | Share and Close buttons sit side-by-side horizontally |
| Desktop (> 1024px) | Share and Close buttons sit side-by-side horizontally |

The celebration overlay already has responsive behavior. The share button should follow the same pattern as the existing close/dismiss button.

### Monthly Report Share Button

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Full-width button below page header content |
| Tablet (640-1024px) | Inline button in header area |
| Desktop (> 1024px) | Inline button in header area |

### Share Flow (All Types)

The share options (copy, download, native share) should work at all breakpoints. On mobile, native share (Web Share API) is the primary action since it integrates with the OS share sheet.

---

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. All share card content is either system-generated (badge names, streak counts, level names) or pre-authored (milestone messages, growth verses). No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** Cannot trigger any of these events. All features are within auth-gated experiences.
- **Logged-in users:** No new persistence needed. Share card generation is ephemeral (canvas created on demand, not stored). The underlying data (badges, streaks, levels, monthly stats) is already persisted in existing localStorage keys.
- **localStorage usage:** No new keys. Reads from existing keys:
  - `wr_badges` (badge data)
  - `wr_streak` (streak data)
  - `wr_faith_points` (level data)
  - `wr_mood_entries`, `wr_daily_activities`, `wr_meditation_history`, `wr_bible_progress` (monthly stats)

---

## Completion & Navigation

N/A -- standalone sharing feature. No Daily Hub completion tracking integration.

---

## Design Notes

### Shared Canvas Patterns

All 4 card types share common rendering patterns. A shared utility file should provide:
- Canvas creation with dark gradient background
- Watermark rendering ("Worship Room" centered at bottom)
- Divider line drawing
- Centered text rendering with word wrapping
- Font loading (Inter for body, Lora for serif/scripture, with system font fallbacks)

Reference the existing canvas rendering implementations:
- `verse-card-canvas.ts` -- font loading, canvas setup, text rendering patterns
- `challenge-share-canvas.ts` -- stats display and card structure

### Celebration Overlay Share Button

The `CelebrationOverlay` component renders for badges, streak milestones, and level-ups. The share button should be added consistently:

**Placement:** Below celebration content, next to the existing dismiss/close button.

**Styling:** Frosted glass button matching the celebration overlay aesthetic:
- `bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-full`
- Lucide `Share2` icon + "Share" label
- Same visual weight as the close/dismiss button
- 44px minimum touch target height

**Interaction flow:**
1. User sees celebration overlay
2. User taps "Share"
3. Canvas generates (brief loading state if >200ms)
4. Share options appear (copy, download, native share)
5. Celebration overlay remains visible throughout
6. User taps "Close" to dismiss

### Share Flow

The existing `SharePanel` component has template selection and size options designed for verse sharing. The new card types don't need template/size selection (single template, single size each). If `SharePanel` doesn't fit cleanly, create a simpler `ShareImageButton` component that:
- Takes a canvas-generation function
- Provides copy image (clipboard API), download PNG, and native share (Web Share API)
- Falls back to copy + toast if Web Share isn't supported

### Color Accents Per Card Type

Each card type uses a unique accent color within the dark gradient to create visual variety:
- **Badge:** Purple accent (`#6D28D9` family) -- celebration
- **Streak:** Warm amber/orange accent (`#D97706` family) -- fire/warmth
- **Level Up:** Green/nature accent (`#27AE60` / `#34D399` family) -- growth
- **Monthly:** Purple accent (`#6D28D9` family) -- brand

All cards share the dark base gradient (hero-dark `#0D0620` to hero-mid `#1E0B3E`) from the design system recon.

### New Visual Patterns

**Canvas share card dark gradient background:** This is a new pattern not captured in the existing design system recon. The gradient should match the app's dark theme aesthetic (hero-dark to hero-mid base) with a color-specific radial accent. Values should be marked `[UNVERIFIED]` during planning until verified against the live canvas output.

---

## Out of Scope

- Verse share template changes (existing 4 templates x 3 sizes stays as-is)
- Challenge share card changes (already exists and works)
- Answered prayer testimony card changes (separate spec)
- Reading plan completion card changes (separate spec)
- Social media deep-link previews (requires backend OG tags -- Phase 3+)
- Animated/video share output (GIF or video of celebrations)
- Multi-template or multi-size options for new card types (single template, single size each)
- Share analytics (tracking which cards get shared most -- Phase 3+)
- Tier 1 badge toast sharing if the toast format doesn't support a share action cleanly
- Garden snapshot sharing (not included in this spec)

---

## Test Requirements

- Badge share button renders on celebration overlay
- Streak share button renders on streak milestone celebration
- Level-up share button renders on level-up celebration
- Monthly insights share button renders on Monthly Report page
- Each canvas rendering function produces a canvas with correct dimensions (1080x1080)
- Canvas output includes "Worship Room" watermark text
- Share flow works (mock clipboard API and Web Share API)
- Celebration overlay stays open after share action
- Canvas generation error is caught and shows toast (not crash)
- Monthly card omits stats with zero values
- Existing celebration tests pass without regressions (timing, animation, sound, auto-dismiss unchanged)

---

## Acceptance Criteria

### Badge Share
- [ ] "Share" button appears on badge celebration overlays (tier 2-3 badges)
- [ ] Tier 1 badge toasts include share action if format supports it cleanly; omitted if not
- [ ] Canvas card renders with badge icon, "Badge Unlocked!" heading, badge name in quotes, description, and "Worship Room" watermark
- [ ] Share flow works: copy image to clipboard, download PNG, native share via Web Share API

### Streak Share
- [ ] "Share" button appears on streak milestone celebrations (7, 14, 30, 60, 90, 180, 365 days)
- [ ] Canvas card renders with fire emoji, streak count heading, milestone-specific message, and watermark
- [ ] Each of the 7 milestone levels has a unique encouragement message
- [ ] Streak message text uses serif italic font (Lora or system serif fallback)

### Level Up Share
- [ ] "Share" button appears on level-up celebrations (levels 2-6)
- [ ] Canvas card renders with level icon, "Level Up!" heading, level name + number, growth verse, reference, and watermark
- [ ] Each of the 5 levels (Sprout through Lighthouse) has a unique verse
- [ ] All verses use WEB (World English Bible) translation

### Monthly Insights Share
- [ ] "Share This Month" button appears on the Monthly Report page (`/insights/monthly`)
- [ ] Canvas card renders with month/year heading, activity stats with emoji prefixes, and watermark
- [ ] Stats with zero values are omitted from the card (e.g., no meditation line if user didn't meditate)
- [ ] At least mood average and one activity stat are shown (card is not empty)

### General
- [ ] All 4 card types use shared canvas utility functions (gradient background, watermark, divider, centered text)
- [ ] All cards render at 1080x1080 pixels
- [ ] All cards have consistent styling: dark gradient background, white text, "Worship Room" watermark at bottom
- [ ] Share flow works for all 4 types: copy image, download PNG, native share
- [ ] Celebration overlay remains visible after sharing (user must explicitly close it)
- [ ] Canvas generation failure shows an error toast (not a crash or unhandled exception)
- [ ] All share buttons meet 44px minimum touch target height
- [ ] Mobile (375px): share buttons render correctly within celebration overlay layout
- [ ] Desktop (1440px): share buttons render correctly alongside close/dismiss button
- [ ] No existing celebration behavior is changed (timing, animation, sound effects, auto-dismiss patterns)
- [ ] No gamification changes (points, badges, streaks, levels are unaffected by this feature)
- [ ] Level-up growth verses match WEB translation exactly (verified against Bible data)
