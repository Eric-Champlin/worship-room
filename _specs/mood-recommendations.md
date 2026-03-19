# Feature: Mood-to-Content Personalized Recommendations

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: This spec consumes `MoodEntry` from Spec 1 — specifically the `mood` value (1-5) just selected
- Cross-spec dependencies: Spec 1 (Mood Check-In) provides the mood entry via `onComplete`; Spec 2 (Dashboard Shell) owns the `DashboardPhase` state machine where the new phase is inserted
- Shared constants: Mood colors from `constants/dashboard/mood.ts` (`MOOD_COLORS`)

---

## Overview

After the mood check-in verse display fades out, users currently land immediately on the full dashboard. This feature inserts a brief "Recommended for You" transition screen that shows 2-3 personalized activity suggestions based on the mood the user just selected.

The recommendations serve as a gentle bridge between the reflective moment of the check-in and the data-heavy dashboard. They guide users toward the activity most likely to help them in their current emotional state — pointing someone who is struggling toward prayer and community, or someone who is thriving toward worship and encouragement of others.

This is a stateless, ephemeral display. Nothing is saved to localStorage. The mood value is passed via React state from the check-in, and the recommendation mapping is a static constant. The screen auto-advances to the dashboard after 5 seconds or when the user interacts.

---

## User Stories

- As a **logged-in user** who just completed the mood check-in, I want to see personalized activity suggestions that match how I'm feeling so that I know where to go next in the app.
- As a **logged-in user** who is struggling, I want to be gently pointed toward prayer, scripture, and community so that I feel supported, not alone.
- As a **logged-in user** who is thriving, I want to be encouraged to celebrate, share joy, and pour into others so that my positive energy is channeled into meaningful activity.
- As a **logged-in user** in a hurry, I want the recommendations to auto-advance or be skippable so that I'm never stuck on a screen I didn't ask for.

---

## Requirements

### Core Flow

1. **Trigger**: After the mood check-in's verse display phase completes (or crisis banner is dismissed), instead of immediately entering the dashboard, the "recommendations" phase renders
2. **Content**: 2-3 activity suggestion cards based on the mood value (1-5) just selected
3. **Duration**: The recommendations screen displays for 5 seconds, then auto-advances to the dashboard
4. **Interaction**: If the user clicks a suggestion card, navigate to that route immediately (bypassing auto-advance). If the user clicks "Go to Dashboard," advance to the dashboard immediately
5. **Phase placement**: This is a new phase inserted into the existing `DashboardPhase` state machine between the check-in completing and `dashboard_enter`

### Recommendation Mapping

Each mood maps to exactly 3 suggestions. Each suggestion has: a title, a description (one sentence), a Lucide icon name, and a target route.

| Mood | Value | Suggestion 1 | Suggestion 2 | Suggestion 3 |
|------|-------|--------------|--------------|--------------|
| Struggling | 1 | "Talk to God" — Let prayer carry what feels too heavy to hold. → `/daily?tab=pray` | "Find Comfort in Scripture" — Rest in words that have held others through the storm. → `/music?tab=sleep` | "You're Not Alone" — See how others are lifting each other up right now. → `/prayer-wall` |
| Heavy | 2 | "Write It Out" — Sometimes the weight lifts when you put it into words. → `/daily?tab=journal` | "Breathe and Be Still" — A quiet moment to slow down and just breathe. → `/daily?tab=meditate` | "Listen to Calming Sounds" — Let gentle sounds create space for peace. → `/music?tab=ambient` |
| Okay | 3 | "Reflect on Your Day" — Take a few minutes to notice what God is doing. → `/daily?tab=journal` | "Worship with Music" — Let worship shift your focus and lift your spirit. → `/music?tab=playlists` | "Explore a Meditation" — A guided moment of stillness and presence. → `/daily?tab=meditate` |
| Good | 4 | "Give Thanks" — Gratitude turns what you have into more than enough. → `/meditate/gratitude` | "Encourage Someone" — Your words could be exactly what someone needs today. → `/prayer-wall` | "Deepen Your Worship" — Let music draw you closer to God's heart. → `/music?tab=playlists` |
| Thriving | 5 | "Celebrate with Worship" — Let your joy overflow into praise. → `/music?tab=playlists` | "Share Your Joy" — Spread encouragement to those who need it most. → `/prayer-wall` | "Pour into Others" — Your strength today can lift someone else up. → `/friends` |

### Phase System Integration

The existing `DashboardPhase` type in the Dashboard component is:
```
'onboarding' | 'check_in' | 'dashboard_enter' | 'dashboard'
```

This feature adds a new phase: `'recommendations'`

Updated flow after check-in completes:
```
check_in → [MoodCheckIn calls onComplete(entry)] → recommendations → dashboard_enter → dashboard
```

- The `onComplete` handler stores the mood entry and transitions to `'recommendations'` (instead of directly to `'dashboard_enter'`)
- After 5 seconds (or user interaction), transitions to `'dashboard_enter'` (which then runs its existing 800ms fade-in before landing on `'dashboard'`)
- If `prefers-reduced-motion` is active, skip `'recommendations'` entirely and go directly to `'dashboard'` (same as the existing behavior that skips `dashboard_enter`)
- The mood value from the entry is available in Dashboard component state — no new localStorage keys needed

### Auto-Advance Behavior

- The recommendations screen auto-advances to `dashboard_enter` after 5 seconds
- The auto-advance timer starts when the recommendations phase begins rendering
- If the user clicks a suggestion card, the timer is cleared and navigation occurs immediately via React Router
- If the user clicks "Go to Dashboard," the timer is cleared and `dashboard_enter` begins
- The auto-advance respects `prefers-reduced-motion` — if reduced motion is preferred, skip recommendations entirely (same philosophy as skipping `dashboard_enter`)

### Visual Design

#### Layout
- Full-screen dark background matching the mood check-in (same radial gradient)
- Content centered vertically and horizontally within a max-width container
- Section heading: "Based on how you're feeling..." in Lora italic (`font-serif italic`), `text-xl md:text-2xl`, `text-white/80`
- 3 suggestion cards below the heading
- "Go to Dashboard" text link below the cards

#### Suggestion Cards
- Frosted glass style: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- Left border accent using the selected mood's color (4px solid border-left in the mood's hex color: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399)
- Each card contains:
  - A Lucide icon (24px, in the mood's accent color)
  - The suggestion title in `font-semibold text-white text-base`
  - The description in `text-sm text-white/60`
- Cards are clickable — the entire card is a navigation link
- Hover state: `bg-white/10` background transition (200ms)
- Focus state: visible focus ring (`focus-visible:ring-2 focus-visible:ring-white/50`)
- Minimum height: 44px (touch target compliance)
- Padding: `p-4`

#### "Go to Dashboard" Link
- Below all cards, centered
- Style: `text-sm text-white/40 hover:text-white/60 underline underline-offset-4` — matches the existing skip link pattern from the mood check-in
- Minimum touch target: 44px height via `min-h-[44px] inline-flex items-center`

#### Stagger Animation
- Cards animate in with a staggered entrance — 150ms delay between each card
- Animation: fade-in + slight upward slide (opacity 0→1, translateY 8px→0, 300ms ease-out)
- Each card delays by `index * 150ms` (card 1: 0ms, card 2: 150ms, card 3: 300ms)
- The heading fades in first (0ms), then cards stagger in after
- `prefers-reduced-motion`: all animations disabled, everything renders immediately

### Responsive Behavior

#### Mobile (< 640px)
- Full viewport height (`min-h-screen`), content centered vertically
- Heading: `text-xl`
- Cards stack vertically, full width, with `gap-3` between them
- Card padding: `p-4`
- "Go to Dashboard" link at the bottom with comfortable spacing (`mt-6`)
- All cards have 44px minimum touch targets

#### Tablet (640px-1024px)
- Same as mobile layout but heading scales to `text-xl md:text-2xl`
- Content max-width: ~600px centered
- Cards stack vertically with `gap-4`

#### Desktop (> 1024px)
- Heading: `text-2xl`
- Cards display in a horizontal row (3 across) with `gap-4`
- Content max-width: ~800px centered
- Each card flexes equally (`flex-1`)
- Cards are taller due to horizontal layout — icon on top, text below (or icon left, text right — either pattern works as long as all 3 cards are visually balanced)
- "Go to Dashboard" centered below cards with `mt-8`

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this screen does not involve any user text input. It's a display-only transition based on the mood already selected and crisis-checked in the check-in phase.
- **User input involved?**: No — the only interactions are clicking cards (navigation) or clicking the skip link.
- **AI-generated content?**: No — all text is hardcoded constants in the recommendation mapping.
- **Mood sensitivity note**: The suggestion text for lower moods (Struggling, Heavy) must be compassionate and never dismissive. "Talk to God" and "You're Not Alone" are phrased as invitations, not commands. Descriptions acknowledge the difficulty without minimizing it.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Never see this screen** — the recommendations phase is part of the mood check-in flow, which only appears for authenticated users. Logged-out users see the landing page at `/`.
- Zero data persistence. Zero cookies. Zero tracking.

### Logged-in users:
- See the recommendations screen after completing the daily mood check-in (once per day)
- **No new localStorage keys** — this is entirely stateless. The mood value comes from React state (the `MoodEntry` returned by `onComplete`), and the recommendation mapping is a static constant.
- Navigation clicks use React Router — no data is saved about which recommendation was clicked.

### Route type:
- Not a separate route. This is a conditional render phase within the Dashboard component at `/`.
- The recommendations phase is only reachable through the mood check-in flow.

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Recommendation cards | Not visible (landing page shown at `/`) | Clickable; navigates to the suggested route |
| "Go to Dashboard" link | Not visible | Clickable; advances to `dashboard_enter` phase |
| Heading text | Not visible | Displays "Based on how you're feeling..." |
| Auto-advance timer | Not active | Advances to dashboard after 5 seconds |

---

## UX & Design Notes

### Emotional Tone

This screen should feel like a gentle suggestion from a friend, not a directive from an app. The heading "Based on how you're feeling..." is intentionally soft and personal. The suggestion descriptions are warm and invitational — "Let prayer carry what feels too heavy to hold" rather than "Click here to pray."

For lower moods (Struggling, Heavy), the suggestions prioritize comfort, expression, and connection. For higher moods (Good, Thriving), they channel positive energy into gratitude, worship, and community encouragement.

### Visual Continuity

The recommendations screen shares the same dark radial gradient background as the mood check-in, creating visual continuity during the transition. The user should feel like they're still in the same "space" — the check-in room — before the dashboard "opens up."

The mood color accent on the card borders carries the mood identity through from the check-in orbs, reinforcing the personalization.

### Design System Recon References

- **Background gradient**: Same as mood check-in — use the radial gradient from the Homepage Hero pattern in the design system recon (`radial-gradient(ellipse at 50% 30%, rgb(59,7,100) 0%, transparent 60%), linear-gradient(rgb(13,6,32) 0%, rgb(30,11,62) 50%, rgb(13,6,32) 100%)`)
- **Card pattern**: Frosted glass dashboard card style from `09-design-system.md` — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`. This is a known pattern from Phase 2.75 specs but applied here at a smaller scale (single cards, not full widget cards).
- **Skip link style**: Matches the existing "Not right now" skip link from the mood check-in (`text-sm text-white/40 hover:text-white/60 underline underline-offset-4`)
- **Stagger animation**: Same stagger pattern used in the landing page JourneySection (150ms between items, fade-in + slide-up)
- **New pattern**: Mood-colored left border accent on frosted glass cards. This is a **new visual pattern** not captured in the design system recon — plan should mark border color values as `[UNVERIFIED]` until visually verified.

---

## Edge Cases

- **User clicks a suggestion for an auth-gated page (e.g., `/meditate/gratitude`)**: Since the user is already authenticated (they just completed a mood check-in), the auth gate will pass. No additional auth modal needed.
- **User clicks "Go to Dashboard" very quickly**: Timer is cleared, dashboard_enter phase begins normally. No double-transition.
- **Auto-advance fires while user is mid-click**: The click handler should take precedence. Use a ref flag or clear the timer on any interaction to prevent competing transitions.
- **User navigates back after clicking a suggestion**: Browser back button returns to `/`, which will render the dashboard (check-in already completed for today). The recommendations phase does not re-appear — it's a one-shot transition after check-in.
- **`prefers-reduced-motion` active**: Skip the recommendations phase entirely. Go directly from check-in completion to dashboard (same as existing behavior that skips `dashboard_enter`).
- **User's mood triggers crisis banner instead of verse**: After the crisis banner is dismissed, should recommendations still show? **Yes** — the recommendations are mood-based, and the user's selected mood is still valid even if crisis keywords were detected in their text. The "Struggling" recommendations (pray, scripture comfort, community) are appropriate follow-ups after a crisis moment.
- **Future `/friends` route not yet built**: The "Pour into Others" suggestion for Thriving (mood 5) links to `/friends`. If this route shows a "Coming Soon" stub or 404, the user will land there gracefully. This is acceptable for the frontend-first build — the link target will be live once Spec 9 (Friends System) is implemented.

---

## Out of Scope

- **Personalized recommendations based on user history** — This uses a static mood-to-suggestions mapping. AI-powered recommendations based on past behavior, journal content, or usage patterns are deferred to Phase 4 (AI Pastoral Companion).
- **Tracking which suggestions users click** — No analytics on recommendation engagement. This would require backend persistence (Phase 3+).
- **User-configurable recommendations** — Users cannot customize or disable the recommendations screen in this spec. A "Don't show me this" toggle could be added in Settings (Spec 13) as a future enhancement.
- **Different recommendations based on time of day** — Morning vs. evening suggestions are not differentiated. Static mapping only.
- **Backend API** — This is entirely frontend. No API endpoint needed.
- **New routes** — No new routes are created. All suggestion cards link to existing routes.
- **Animations beyond stagger entrance** — No card exit animation when the user clicks. Navigation is immediate.

---

## Acceptance Criteria

### Core Flow
- [ ] After completing the mood check-in (verse display auto-advances or crisis banner is dismissed), the recommendations screen appears instead of the dashboard
- [ ] The recommendations screen shows exactly 3 suggestion cards matching the selected mood value
- [ ] Each card displays a Lucide icon, title text, and description text
- [ ] Clicking a suggestion card navigates to the correct route (e.g., Struggling card 1 → `/daily?tab=pray`)
- [ ] Clicking "Go to Dashboard" advances to the dashboard immediately
- [ ] If no interaction occurs, the screen auto-advances to the dashboard after 5 seconds
- [ ] The 5-second auto-advance timer is cleared when any card or the "Go to Dashboard" link is clicked

### Recommendation Content (per mood)
- [ ] Struggling (1): "Talk to God" → `/daily?tab=pray`, "Find Comfort in Scripture" → `/music?tab=sleep`, "You're Not Alone" → `/prayer-wall`
- [ ] Heavy (2): "Write It Out" → `/daily?tab=journal`, "Breathe and Be Still" → `/daily?tab=meditate`, "Listen to Calming Sounds" → `/music?tab=ambient`
- [ ] Okay (3): "Reflect on Your Day" → `/daily?tab=journal`, "Worship with Music" → `/music?tab=playlists`, "Explore a Meditation" → `/daily?tab=meditate`
- [ ] Good (4): "Give Thanks" → `/meditate/gratitude`, "Encourage Someone" → `/prayer-wall`, "Deepen Your Worship" → `/music?tab=playlists`
- [ ] Thriving (5): "Celebrate with Worship" → `/music?tab=playlists`, "Share Your Joy" → `/prayer-wall`, "Pour into Others" → `/friends`

### Visual Design
- [ ] Background matches the mood check-in gradient (dark radial gradient — deep purple center, near-black edges)
- [ ] Heading "Based on how you're feeling..." renders in Lora italic (`font-serif italic`), `text-white/80`
- [ ] Cards use frosted glass style: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- [ ] Each card has a 4px left border in the selected mood's color (Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399)
- [ ] Lucide icons render at 24px in the mood's accent color
- [ ] Card title is `font-semibold text-white text-base`
- [ ] Card description is `text-sm text-white/60`
- [ ] "Go to Dashboard" link uses `text-sm text-white/40 hover:text-white/60 underline underline-offset-4`

### Stagger Animation
- [ ] Heading fades in first
- [ ] Cards stagger in with 150ms delay between each (card 1: 0ms, card 2: 150ms, card 3: 300ms)
- [ ] Each card's entrance is a fade-in + slight upward slide (opacity 0→1, translateY 8px→0, 300ms ease-out)
- [ ] `prefers-reduced-motion`: all animations disabled, everything renders immediately with no delay

### Reduced Motion
- [ ] When `prefers-reduced-motion` is active, the recommendations phase is skipped entirely — check-in completion goes directly to dashboard

### Responsive Layout
- [ ] Mobile (< 640px): Cards stack vertically, full width, `gap-3`, heading `text-xl`
- [ ] Tablet (640-1024px): Cards stack vertically, max-width ~600px centered, `gap-4`, heading `text-xl md:text-2xl`
- [ ] Desktop (> 1024px): Cards in a horizontal row (3 across), max-width ~800px centered, `gap-4`, heading `text-2xl`
- [ ] All cards have 44px minimum touch target height
- [ ] "Go to Dashboard" link has 44px minimum touch target

### Phase System
- [ ] `DashboardPhase` type includes the new `'recommendations'` value
- [ ] After check-in completes, phase transitions to `'recommendations'` (not directly to `'dashboard_enter'`)
- [ ] After recommendations auto-advance or user interaction, phase transitions to `'dashboard_enter'`
- [ ] Existing `dashboard_enter` → `dashboard` transition (800ms) is unchanged
- [ ] Skip flow (user skips mood check-in) still goes directly to `'dashboard'` — does not show recommendations

### Accessibility
- [ ] Recommendation cards are keyboard-navigable (Tab between cards)
- [ ] Each card has a clear accessible name (the suggestion title)
- [ ] Cards have `role="link"` or are implemented as `<a>` / `<Link>` elements
- [ ] "Go to Dashboard" link is keyboard-focusable with visible focus ring
- [ ] Focus is managed when the phase transitions — initial focus moves to the heading or first card
- [ ] Auto-advance does not interrupt screen reader announcements — the heading is in an `aria-live="polite"` region or focus is moved to it

### Edge Cases
- [ ] After crisis banner dismissal, recommendations still appear (with the Struggling mood suggestions if mood was 1)
- [ ] Browser back after clicking a suggestion returns to `/` showing the dashboard (not recommendations again)
- [ ] Auto-advance timer does not fire if user has already navigated away via a card click
- [ ] Very fast "Go to Dashboard" click does not cause double-transition or render glitch
