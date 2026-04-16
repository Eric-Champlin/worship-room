# Feature: Reading Plans AI Plan Generation

**Spec sequence:** This is Spec 3 of a 3-spec reading plans sequence, the final spec in the series. It builds on Spec 1 (`reading-plans-browser.md`) which delivers the `/reading-plans` browser page, plan data model, day content rendering, and `wr_reading_plan_progress` localStorage model, and Spec 2 (`reading-plans-progress-dashboard.md`) which adds progress tracking, gamification integration, dashboard widget, and cross-feature connections.

**Master Plan Reference:** Consumes data models from the Reading Plans specs and Dashboard & Growth specs (Phase 2.75):
- Shared data models: `wr_reading_plan_progress` (owned by Spec 1), `wr_daily_activities` (owned by Streak & Faith Points Engine), `wr_custom_plans` (NEW, owned by this spec)
- Cross-spec dependencies: Spec 1 provides the 10 preset reading plan data files, plan browser page, plan detail routes, and `useReadingPlanProgress` hook. Spec 2 provides the gamification integration that the matched plan will benefit from once started.
- Shared constants: Reading plan IDs, themes, and keyword associations from `data/reading-plans/`

---

## Overview

The reading plans browser (Spec 1) offers 10 curated multi-day plans, and the progress tracking system (Spec 2) integrates them into the gamification ecosystem. But users often arrive with a specific struggle that doesn't neatly map to a single plan title. They need a way to describe what they're going through in their own words and receive a personalized recommendation.

This spec adds an AI-powered "Create Your Own Plan" flow to the `/reading-plans` browser page. In the current frontend-first phase, the "AI generation" is mocked using keyword matching against the existing 10 plans. When the backend is built (Phase 3+), this flow will call a real AI endpoint that generates truly unique plans with custom passages and reflections tailored to the user's specific situation.

The creation flow is a 3-step wizard within the `/reading-plans` route (using a `?create=true` query parameter). It asks the user what's on their heart, how long a journey they want, then "generates" a plan by matching their input against the existing plan themes. The experience is designed to feel personal and intentional, even during the mock phase, creating an emotional bridge between the user's pain point and curated content that addresses it.

---

## User Stories

- As a **logged-in user** who is hurting but doesn't know where to start, I want to describe what I'm going through and receive a personalized reading plan so that I feel seen and guided toward relevant Scripture.
- As a **logged-in user**, I want to choose how long my reading journey will be so that I can commit to a duration that fits my current capacity.
- As a **logged-out visitor**, I want to see the "Create Your Own Plan" option so that I know this feature exists and am motivated to create an account.
- As a **logged-in user** who has generated a plan, I want to find it again easily so that I don't lose track of which plan was recommended for me.

---

## Requirements

### Create Your Own Plan Card (Browser Page)

1. **A "Create Your Own Plan" card** appears at the top of the `/reading-plans` browser page, above the grid of preset plan cards. It is visually distinct from the preset plan cards.

2. **Card styling:** The card has a `border-primary/10` (faint violet) border instead of the standard `border-white/10`, a Lucide `Sparkles` icon to indicate AI-powered content, and a subtle gradient or glow accent to differentiate it from the static plan cards.

3. **Card content:**
   - Heading: "Create Your Own Plan" in bold white text
   - Subtext: "Tell us what you're going through and we'll create a personalized Scripture journey just for you."
   - "Create Plan" button in primary CTA style (`bg-primary text-white font-semibold py-3 px-6 rounded-lg`)

4. **Auth gating:** Clicking "Create Plan" when logged out triggers the auth modal with the message: "Sign in to create a personalized reading plan." The card itself is always visible to all users.

### Creation Flow (3-Step Wizard)

5. **The creation flow opens as a full-screen view** within the `/reading-plans` route, activated by the `?create=true` query parameter. It uses the same dark background as the reading plan detail page (not a modal, not a separate route). Back navigation (browser back button) returns to the plan browser.

6. **Progress indicator:** 3 dots at the top of the creation flow, indicating which step the user is on. Active dot is `bg-primary`, inactive dots are `bg-white/20`. The dots are centered horizontally.

7. **Back navigation:** Each step has a back arrow (or the browser back button works). From Step 1, back returns to the `/reading-plans` browser. From Step 2, back returns to Step 1. From Step 3, there is no back (generation is in progress). Pressing Escape also navigates back (same as back button behavior).

#### Step 1: "What's on your heart?"

8. **Heading:** "What's on your heart?" in Caveat script font (`font-script`), large size, white text, centered.

9. **Textarea:** 500 character max, with the placeholder text "I'm struggling with anxiety about my job...". The textarea has a cyan glow-pulse border on focus (matching the existing `animate-glow-pulse` pattern from the Pray tab textarea). Character count display below the textarea in muted text (`text-white/40`), showing "X/500".

10. **Crisis detection:** The textarea has crisis keyword detection via the existing `CrisisBanner` component. If crisis keywords are detected, the crisis resources banner appears immediately above the textarea, matching the Pray tab's crisis detection behavior.

11. **Quick-start topic chips:** 6 chips displayed below the textarea:
    - "Anxiety"
    - "Grief"
    - "Relationship struggles"
    - "Finding purpose"
    - "Strengthening faith"
    - "Forgiveness"

12. **Chip behavior:** Clicking a chip pre-fills the textarea with a starter sentence related to the topic:
    - Anxiety: "I've been feeling anxious about..."
    - Grief: "I'm grieving the loss of..."
    - Relationship struggles: "I'm struggling in my relationship with..."
    - Finding purpose: "I've been searching for my purpose because..."
    - Strengthening faith: "I want to grow deeper in my faith because..."
    - Forgiveness: "I'm trying to forgive..."

    The cursor is placed at the end of the pre-filled text so the user can continue typing. If the textarea already has content, clicking a chip replaces it with the starter sentence.

13. **Chip styling:** Each chip is a rounded pill button (`rounded-full px-4 py-2 text-sm`), `bg-white/10 text-white/80 border border-white/15`, with `hover:bg-white/15` transition. Responsive: single row on desktop, wrapping to 2 rows of 3 on mobile.

14. **"Next" button:** Primary CTA style, centered below the chips. Disabled (reduced opacity, not clickable) when the textarea is empty. Enabled when the textarea has at least 1 character.

#### Step 2: "How long of a journey?"

15. **Heading:** "How long of a journey?" in Caveat script font, same style as Step 1.

16. **Three duration cards**, only one selectable at a time (radio-button behavior), default none selected:

    | Duration | Label | Description | Icon |
    |----------|-------|-------------|------|
    | 7 days | Quick Focus | "A focused week to address what's on your heart" | Lucide `Zap` |
    | 14 days | Deeper Dive | "Two weeks to explore and reflect more deeply" | Lucide `Layers` |
    | 21 days | Full Transformation | "Three weeks to build lasting spiritual habits" | Lucide `Sunrise` |

17. **Card styling:** Each card is a frosted glass card (`bg-white/5 border border-white/10 rounded-xl p-5`). When selected, the border changes to `border-primary` with a subtle primary glow. Unselected cards have `hover:bg-white/10` transition. Each card shows the icon, label in bold white, and description in muted text.

18. **"Generate Plan" button:** Primary CTA style, centered below the cards. Disabled when no duration is selected. Button text: "Generate My Plan".

#### Step 3: "Generating your plan..."

19. **Loading screen** with a gentle animation: 3 bouncing dots matching the prayer generation loading pattern (the same CSS animation used in the Pray tab's prayer loading state).

20. **Loading message:** "Creating a Scripture journey just for you..." in `text-lg text-white/80`, centered.

21. **Verse during wait:** "For I know the plans I have for you, declares the Lord." displayed in Lora italic (`font-serif italic text-white/60`), with attribution "-- Jeremiah 29:11 WEB" in `text-white/40 text-sm`. Displayed below the loading message.

22. **Mock generation delay:** 2500ms timeout. During this time, no user interaction is possible (no back button, no escape).

23. **Keyword matching logic (mock AI):** After the delay, match the user's input text against the 10 existing plans using simple case-insensitive keyword matching:

    | Keywords | Matched Plan |
    |----------|-------------|
    | anxiety, worry, stress, anxious, overwhelmed, panic | Finding Peace in Anxiety |
    | grief, loss, death, mourning, died, passing, gone | Walking Through Grief |
    | gratitude, thankful, grateful, blessings, appreciate | The Gratitude Reset |
    | identity, who am i, self-worth, insecurity, confidence | Knowing Who You Are in Christ |
    | forgive, forgiveness, resentment, bitter, grudge, hurt by | The Path to Forgiveness |
    | trust, doubt, uncertain, faith wavering, hard to believe | Learning to Trust God |
    | hope, hopeless, despair, dark times, no way out | Hope When It's Hard |
    | healing, broken, wounded, trauma, pain, recovering | Healing from the Inside Out |
    | purpose, meaning, direction, calling, what should i do | Discovering Your Purpose |
    | relationship, marriage, friendship, family, lonely, isolated | Building Stronger Relationships |

    If multiple keywords match different plans, use the first match found (scan the table top to bottom). If no keywords match, fall back to "Learning to Trust God" as the default.

24. **After matching:** Navigate to the matched plan's detail page (`/reading-plans/:planId`) and show a toast notification: "Your personalized plan is ready!" using the existing toast system.

### "Created for You" Badge

25. **After a plan is "generated"**, store the matched plan ID in a `wr_custom_plans` localStorage key (an array of plan IDs). This persists across sessions.

26. **On the `/reading-plans` browser page**, plans that appear in the `wr_custom_plans` array display a small "Created for you" badge on their card. The badge is a pill-shaped label (`rounded-full px-2 py-0.5 text-xs`) with `bg-primary/20 text-primary-lt` styling, positioned near the top of the card.

27. **The badge is purely cosmetic** — it helps users find the plan that was recommended for them. It does not change the plan's behavior or content.

### No-Persist Until Generation

28. **Steps 1 and 2 store nothing.** If the user navigates away during the creation flow (back button, closing the tab, navigating to another route), no data is saved. Only after Step 3 completes does the matched plan ID get stored in `wr_custom_plans`.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| "Create Your Own Plan" card | Visible on browser page | Visible on browser page |
| "Create Plan" button | Auth modal: "Sign in to create a personalized reading plan" | Opens creation flow |
| Creation flow (Steps 1-3) | Not accessible (auth modal intercepts) | Full interaction |
| "Created for you" badge | Not visible (no `wr_custom_plans` data) | Visible if plan was previously generated |
| Topic chip click | Not accessible | Pre-fills textarea |
| Textarea crisis detection | Not accessible | CrisisBanner appears on crisis keywords |

### Persistence

- **No new localStorage keys for the creation flow itself** — Steps 1-2 are purely in React state.
- **`wr_custom_plans`** (NEW): Array of plan ID strings. Written only after Step 3 completes. Read by the browser page to display "Created for you" badges. Cleared on logout if desired (follows existing data retention pattern).
- **Logged-out users**: Zero persistence. Cannot access the creation flow.

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes. The Step 1 textarea accepts free-form text about emotional struggles. Crisis keywords must be detected using the existing `CrisisBanner` component (same pattern as the Pray tab).
- **User input involved?**: Yes. The textarea in Step 1 accepts up to 500 characters of user text describing what they're going through.
- **AI-generated content?**: No (in this frontend-first phase). The "generated" plan is a keyword match to an existing curated plan. When real AI generation is added in Phase 3+, AI safety checks will be required on the generated content.
- **Theological boundaries**: The loading screen verse (Jeremiah 29:11) is a direct scripture quote, not an interpretive claim. The "personalized plan" framing is honest — even in mock mode, the matched plan IS relevant to the user's topic.

---

## UX & Design Notes

### Emotional Tone

The creation flow should feel intimate and intentional. "What's on your heart?" is a gentle, pastoral question — not a clinical intake form. The loading screen with Jeremiah 29:11 reinforces that this isn't just an algorithm; it's connecting the user's pain with God's word. Even though the mock version is simple keyword matching, the experience should feel warm and personal.

### Visual Design

- **Create Your Own Plan card:** Distinct from preset cards with the `border-primary/10` accent and Sparkles icon. Should feel premium/special without being flashy.
- **Creation flow background:** Same dark gradient as the reading plan detail page hero. Content centered with `max-w-2xl` constraint.
- **Step transitions:** Simple fade between steps (300ms). No complex animations.
- **Duration cards:** Horizontal row on desktop (3 cards side by side), stacked vertically on mobile. Each card is large enough to be easily tappable (44px minimum touch target).
- **Topic chips:** Horizontal single row on desktop, wrapping to 2 rows of 3 on mobile. Clear tap targets.
- **Loading dots:** Match the existing prayer generation bouncing dots animation.

### Design System References

- **Textarea glow:** Reuse `animate-glow-pulse` from the Pray tab textarea
- **Crisis banner:** Reuse existing `CrisisBanner` component
- **Auth modal:** Reuse existing `useAuthModal` pattern from Prayer Wall
- **Toast:** Reuse existing `useToast` from Toast provider
- **Card pattern:** Frosted glass `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- **Primary CTA button:** `bg-primary text-white font-semibold py-3 px-6 rounded-lg`
- **Caveat heading:** `font-script text-4xl sm:text-5xl text-white`
- **Scripture text:** `font-serif italic text-white/60`

### New Visual Patterns

1. **AI-powered card accent:** The `border-primary/10` border with Sparkles icon is a new pattern for indicating AI-powered features. This will be reusable for future AI features.
2. **Step progress dots:** 3 dots indicating wizard step progress. Simple new pattern (not yet in the design system).

---

## Responsive Behavior

### Mobile (< 640px)

- **Create card:** Full width, stacked layout (icon + text + button vertical)
- **Step 1 textarea:** Full width with comfortable padding
- **Topic chips:** Wrap to 2 rows of 3 chips. Each chip is equally sized within its row.
- **Step 2 duration cards:** Stack vertically (3 cards in a single column)
- **"Next" / "Generate" buttons:** Full width
- **Loading screen:** Centered, generous vertical padding

### Tablet (640-1024px)

- **Create card:** Full width within content column
- **Topic chips:** Single row or wrapping as needed
- **Duration cards:** Horizontal row (3 cards side by side)
- **Buttons:** Auto-width, centered

### Desktop (> 1024px)

- **Create card:** Full width within the plan grid area, above the plan cards
- **Topic chips:** Single horizontal row
- **Duration cards:** Horizontal row with comfortable spacing
- **Content:** Constrained to `max-w-2xl`, centered
- **Buttons:** Auto-width, centered

### Touch Targets

All interactive elements (chips, cards, buttons, back arrow) meet the 44px minimum touch target requirement on mobile.

---

## Edge Cases

- **Empty textarea:** "Next" button is disabled. User must type or click a chip.
- **No duration selected:** "Generate My Plan" button is disabled. User must select one card.
- **Multiple chip clicks:** Each click replaces the textarea content with the new starter sentence.
- **Very long input (500 chars):** Character count shows "500/500" and textarea stops accepting input.
- **Crisis keywords in textarea:** CrisisBanner appears immediately. User can still proceed to Step 2 (the crisis banner is informational, not blocking — same as Pray tab behavior).
- **Browser back during Step 3:** No effect. The loading state is not interruptible.
- **Same plan generated twice:** The plan ID is already in `wr_custom_plans`, so no duplicate is added. The badge is already showing.
- **All plans already started/completed:** The matched plan still opens its detail page. The user may already be in progress — that's fine, they can continue where they left off.
- **No keyword match:** Falls back to "Learning to Trust God" — a safe, universal default.
- **User types only spaces or punctuation:** Treated as non-empty (button enables), but will match no keywords and fall back to the default plan.

---

## Out of Scope

- **Real AI plan generation:** Actual OpenAI-powered plan generation with custom passages and reflections is Phase 3+ (backend required). This spec uses keyword matching as a frontend mock.
- **Custom plan data model:** Generated plans are not new data entities — they're pointers to existing plans. True custom plans with unique content require backend storage.
- **Plan duration filtering:** The selected duration (7/14/21 days) is not used in the mock matching — the matched plan's actual duration may differ from what the user selected. In Phase 3+, the AI will generate a plan with the exact requested duration.
- **Multiple custom plans management:** No UI to manage or delete "Created for you" entries. The `wr_custom_plans` array just grows.
- **Social sharing of custom plans:** No "Share my plan" feature for generated plans.
- **Plan recommendations (non-AI):** Algorithmic recommendations based on mood history or activity patterns are handled by the dashboard widget in Spec 2, not this spec.
- **Backend API:** No API endpoints. Entirely frontend with localStorage.

---

## Acceptance Criteria

### Create Your Own Plan Card

- [ ] "Create Your Own Plan" card appears at the top of the `/reading-plans` browser page, above preset plan cards
- [ ] Card has a Lucide `Sparkles` icon and `border-primary/10` border accent
- [ ] Card displays heading "Create Your Own Plan" and descriptive subtext
- [ ] "Create Plan" button uses primary CTA styling
- [ ] Logged-out user clicking "Create Plan" sees auth modal with "Sign in to create a personalized reading plan"
- [ ] Logged-in user clicking "Create Plan" opens the creation flow

### Creation Flow — Navigation

- [ ] Creation flow renders within the `/reading-plans` route with `?create=true` query parameter
- [ ] Same dark background as the reading plan detail page
- [ ] 3-dot progress indicator shows current step (active dot `bg-primary`, inactive `bg-white/20`)
- [ ] Back navigation from Step 1 returns to `/reading-plans` browser
- [ ] Back navigation from Step 2 returns to Step 1
- [ ] Escape key navigates back (same as back button)
- [ ] Browser back button navigates back through steps
- [ ] No back navigation from Step 3 (loading state)

### Step 1 — What's On Your Heart?

- [ ] Heading "What's on your heart?" in Caveat script font, centered
- [ ] Textarea with 500 character max and placeholder "I'm struggling with anxiety about my job..."
- [ ] Textarea has cyan glow-pulse border on focus (matching Pray tab)
- [ ] Character count displays "X/500" in muted text below textarea
- [ ] Crisis keywords in textarea trigger CrisisBanner display
- [ ] 6 topic chips displayed below textarea: Anxiety, Grief, Relationship struggles, Finding purpose, Strengthening faith, Forgiveness
- [ ] Clicking a chip pre-fills textarea with a starter sentence and places cursor at end
- [ ] Clicking a chip when textarea has content replaces existing content
- [ ] "Next" button is disabled when textarea is empty
- [ ] "Next" button is enabled when textarea has at least 1 character
- [ ] On mobile, chips wrap to 2 rows of 3

### Step 2 — How Long of a Journey?

- [ ] Heading "How long of a journey?" in Caveat script font, centered
- [ ] 3 duration cards: 7 days (Quick Focus), 14 days (Deeper Dive), 21 days (Full Transformation)
- [ ] Each card shows an icon, label in bold, and brief description
- [ ] Only one card selectable at a time (radio behavior)
- [ ] Selected card has `border-primary` with subtle glow
- [ ] Default state: no card selected
- [ ] "Generate My Plan" button is disabled when no duration selected
- [ ] "Generate My Plan" button is enabled when a duration is selected
- [ ] On mobile, duration cards stack vertically
- [ ] On desktop, duration cards display in a horizontal row

### Step 3 — Generating

- [ ] Loading animation shows 3 bouncing dots (matching prayer generation pattern)
- [ ] "Creating a Scripture journey just for you..." message displayed
- [ ] Jeremiah 29:11 WEB verse displayed in Lora italic during loading
- [ ] 2500ms mock delay before navigation
- [ ] After delay, navigates to matched plan's detail page
- [ ] Toast notification "Your personalized plan is ready!" appears after navigation
- [ ] Keyword matching correctly maps user input to the right plan (see keyword table)
- [ ] No-match input falls back to "Learning to Trust God"

### Created for You Badge

- [ ] After generation, matched plan ID is stored in `wr_custom_plans` localStorage
- [ ] Plans in `wr_custom_plans` show a "Created for you" badge on the browser page
- [ ] Badge is pill-shaped with `bg-primary/20 text-primary-lt` styling
- [ ] Badge does not appear for logged-out users

### No Persistence Until Generation

- [ ] Navigating away during Step 1 or Step 2 saves nothing
- [ ] Only Step 3 completion writes to `wr_custom_plans`
- [ ] Closing the browser tab during Steps 1-2 loses all entered data

### Responsive Layout

- [ ] Mobile (375px): textarea full-width, chips in 2 rows of 3, duration cards stacked, buttons full-width
- [ ] Tablet (768px): comfortable centered layout, duration cards in a row
- [ ] Desktop (1440px): content constrained to `max-w-2xl`, chips in single row, cards in a row
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] No horizontal overflow at any breakpoint

### Accessibility

- [ ] Textarea has associated label (heading or `aria-label`)
- [ ] Duration cards are keyboard-navigable (arrow keys or tab)
- [ ] Selected duration card has `aria-pressed="true"` or equivalent
- [ ] Progress dots have `aria-label` indicating current step (e.g., "Step 1 of 3")
- [ ] Loading state has `aria-live="polite"` announcement
- [ ] Focus management: focus moves to heading on step transitions
- [ ] `prefers-reduced-motion` disables bouncing dots animation (show static dots)

### No Regressions

- [ ] Existing 10 plan cards still render correctly on the browser page
- [ ] Plan detail page is unchanged
- [ ] Reading plan progress tracking (Spec 2) works correctly for matched plans
- [ ] Gamification integration (faith points, badges) works correctly for matched plans
