# Feature: Starting Point Quiz

## Overview
Many visitors arrive at Worship Room during a difficult moment but feel overwhelmed by the options available. The Starting Point Quiz is a gentle, guided 3-question-to-5-question experience embedded directly on the landing page that helps newcomers discover which feature best matches their current emotional and spiritual needs. It answers the question "Where do I even begin?" — routing visitors toward prayer, journaling, meditation, music, community support, or local resources based on their honest answers. This removes friction for first-time visitors and ensures they reach the right healing tool quickly.

## User Story
As a **logged-out visitor**, I want to **take a short quiz about my emotional state and spiritual needs** so that **I'm guided to the Worship Room feature most likely to help me right now, without having to figure it out on my own**.

## Requirements

### Section Placement & Anchor
- The quiz section is embedded directly on the landing page, positioned after the Growth Teasers section
- The section container has `id="quiz"` so the hero quiz teaser link can smooth-scroll to it
- The section is always visible inline (not a modal or overlay)

### Background Transition
- The Growth Teasers section above has a dark purple background (Hero Dark #0D0620)
- This section transitions back to white using a CSS gradient at the top: Hero Dark (#0D0620) fading into white (#FFFFFF)
- The quiz card and heading sit on the white portion of the gradient

### Section Heading
- Main heading: "Not Sure Where to **Start**?" — with the word "Start" rendered in the Caveat decorative script font (consistent with Journey Section and Growth Teasers heading accents)
- Subheading: "Take a 30-second quiz and we'll point you in the right direction."
- Centered text, dark text color on white background

### Quiz Card
- Centered card with a maximum width of approximately 600px
- White background, subtle shadow, rounded corners
- Light gray border
- Shows one question at a time

### Progress Indicator
- Thin progress bar at the top of the quiz card that fills left-to-right as the user progresses (20% per question)
- Styled in the Primary violet color
- Text indicator below: "Question X of 5" (updates per question)
- Progress bar width animates smoothly

### Questions (5 Total)
- 5 multiple-choice questions, each with 4 single-select options
- Questions cover: what brought them here, current emotional state, what sounds most helpful, when they need support most, and their experience level with faith practices
- Each answer maps to point values for one or more of the 7 possible destination features (exact questions, options, and point values defined in CLAUDE.md "Starting Point Quiz Flow")

### Answer Options
- Styled as selectable card-style buttons (not raw radio inputs)
- Each option is a rounded rectangle with a border
- Unselected state: light background, gray border
- Selected state: Primary violet border, light violet background tint, checkmark icon
- Only one option selectable per question
- Clicking an option auto-advances to the next question after a brief delay (~400ms) so the user sees their selection acknowledged before transitioning

### Navigation
- "Back" button on the left side — hidden on Question 1, visible on Questions 2–5
- No explicit "Next" button — answer selection auto-advances
- Smooth slide-left animation when advancing, slide-right animation when going back

### Scoring Logic
- Maintains a score for each of 7 possible destination features: Pray, Journal, Meditate, Music, Sleep & Rest, Prayer Wall, Local Support
- Each answer adds points to one or more features (point values defined in CLAUDE.md)
- After Question 5, the feature with the highest total score is recommended
- Tiebreaker rule: Pray wins ties (strongest first-time experience)
- Going back and changing a previously selected answer must subtract the old points and add the new points (accurate recalculation)

### Result Card
- Replaces the quiz card after Question 5 with a slide transition
- Personalized headline: "We'd recommend starting with [Feature Name]"
- 2–3 sentence description explaining why this feature is a good fit (hardcoded per destination, defined in CLAUDE.md)
- An encouraging scripture verse displayed in the Lora serif italic font with verse reference
- Primary CTA button: "Go to [Feature Name]" linking to the destination route
- Secondary link: "Or explore all features" with an up arrow — smooth-scrolls to the Journey Section
- "Retake Quiz" text link that resets all state and returns to Question 1

### 7 Possible Destinations
- **Pray** — routes to /scripture
- **Journal** — routes to /journal
- **Meditate** — routes to /meditate
- **Music** — routes to /music
- **Sleep & Rest** — routes to /music/sleep
- **Prayer Wall** — routes to /prayer-wall
- **Local Support** — routes to /churches

Each destination has a unique headline, description, scripture verse, and CTA label (all defined in CLAUDE.md "Starting Point Quiz Flow").

### Responsive Design
- Desktop: quiz card centered with comfortable padding
- Tablet: same layout, slightly less padding
- Mobile: card goes full-width with minimal side margins, answer options stack naturally

### Animation
- Section fades in on scroll (Intersection Observer, consistent with other landing page sections)
- Questions slide left/right on navigation transitions
- Result card slides in from the right after Question 5
- Progress bar width animates smoothly via CSS transition

## Acceptance Criteria
- [ ] Quiz section renders on the landing page below the Growth Teasers section
- [ ] Section has `id="quiz"` and hero teaser link smooth-scrolls to it
- [ ] Background gradient transitions from dark purple to white
- [ ] Heading displays with Caveat accent on "Start"
- [ ] Progress bar updates correctly (20% increments) and animates smoothly
- [ ] "Question X of 5" text updates per question
- [ ] All 5 questions display with correct text and 4 answer options each
- [ ] Answer options use card-style buttons (not raw radio inputs)
- [ ] Selected option shows violet border, tinted background, and checkmark
- [ ] Selecting an answer auto-advances after ~400ms delay
- [ ] Back button appears on Q2–Q5 and is hidden on Q1
- [ ] Going back and changing an answer correctly recalculates scores
- [ ] After Q5, result card displays with correct recommendation based on scoring
- [ ] Tiebreaker correctly resolves to Pray
- [ ] Result card shows correct headline, description, scripture verse, and CTA for each of the 7 destinations
- [ ] CTA button links to the correct route
- [ ] "Or explore all features" link scrolls to the Journey Section
- [ ] "Retake Quiz" resets all state and returns to Q1
- [ ] Responsive layout works on mobile, tablet, and desktop
- [ ] Slide animations work for forward, backward, and result transitions
- [ ] Section fade-in animation triggers on scroll
- [ ] Tests cover: rendering, progress updates, answer selection, back navigation, scoring logic (multiple combinations), result display, retake reset, and CTA routing

## UX & Design Notes
- **Tone**: Gentle and guided — like a counselor intake, warm but purposeful. The quiz should feel like a helping hand, not a test.
- **Colors**: Primary violet (#6D28D9) for progress bar and selected states. Primary Light (#8B5CF6) for selection tint. Hero Dark (#0D0620) for gradient transition. Text Dark (#2C3E50) for headings. Text Light (#7F8C8D) for subheading.
- **Typography**: Inter bold for heading (with Caveat accent on "Start"). Inter for question text and options. Lora italic for scripture verse on result card.
- **Responsive**: Mobile-first (< 640px card full-width), tablet (640–1024px), desktop (> 1024px card centered ~600px max-width)
- **Animations**: Gentle slide transitions between questions (~300ms). Fade-in on scroll for section entry. Smooth progress bar fill via CSS transition. Brief 400ms delay after selection before advancing.
- **Card styling**: White background, subtle box-shadow, 16px border radius, 1px solid light gray border (#E5E7EB)

## AI Safety Considerations
- **Crisis detection needed?**: No — the quiz is a static navigation tool with predefined questions and answers. No free-text user input is collected, and no AI processing occurs.
- **User input involved?**: No — all interactions are predefined multiple-choice selections. No text input fields.
- **AI-generated content?**: No — all quiz content (questions, options, result descriptions, scripture verses) is hardcoded. No calls to OpenAI or any AI service.
- **Distress indicators**: Although no crisis detection is needed for the quiz itself, the result descriptions and scripture verses are chosen to be encouraging and comforting. The quiz does not attempt to assess mental health status — it is purely a feature-routing tool.

## Auth & Persistence
- **Logged-out (demo mode)**: Full quiz experience with zero data persistence. All quiz state lives in React component state (useState). No cookies, no localStorage, no analytics tracking on quiz answers. State resets on page refresh — this is intentional and privacy-respecting.
- **Logged-in**: Same behavior as logged-out for MVP. Future enhancement: optionally save quiz result to user preferences to inform AI recommendations.
- **Route type**: Public (part of the landing page at `/`)

## Out of Scope
- Saving quiz results to the database (future enhancement for logged-in users)
- AI-powered question generation or dynamic scoring
- Multi-language support (English only per MVP non-goals)
- Analytics tracking on quiz answers or completion rates
- A/B testing different question sets
- Adaptive questions based on previous answers (all 5 questions are always shown in order)
- Integration with onboarding flow (separate feature #56)
- Crisis detection within the quiz (no free-text input exists)
