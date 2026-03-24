# Feature: AI Bible Chat — Question Input & Response Display

## Overview

AI Bible Chat is the first feature in a 2-spec sequence that brings AI-powered biblical Q&A to Worship Room. This is the fastest-growing category in Christian tech for 2026 and directly extends the hero input on the landing page — which already captures free-text spiritual questions — into a full answer experience.

The new `/ask` route provides a focused, peaceful space where users can bring life questions and receive biblically-grounded answers. Each response pairs a warm, compassionate direct answer with supporting Scripture (WEB translation), a closing encouragement, and a suggested prayer. The feature connects deeply to the app's mission: meeting people in their emotional and spiritual need with the wisdom of God's Word.

This spec covers the question input interface, mock response engine, response display, feedback collection, landing page integration, and navbar addition. A follow-up spec (Spec 2) will add conversation history, follow-up questions, and topic browsing.

## User Stories

- As a **logged-out visitor**, I want to browse the Ask page, read topic chips, and type a question so I can explore what the feature offers before creating an account.
- As a **logged-in user**, I want to submit a life question and receive a Scripture-grounded answer so I can find biblical wisdom for what I'm facing.
- As a **logged-in user**, I want to continue from the landing page hero input directly into an answer so the experience feels seamless.
- As a **logged-in user**, I want to journal or pray about an answer so I can deepen my engagement across Worship Room's practices.

---

## Requirements

### 1. Page Structure (`/ask`)

- **Background**: Dark gradient matching the inner page hero pattern (fades to `#F5F5F5` neutral-bg)
- **Hero**: Use the existing `PageHero` component
  - Title: "Ask God's Word" in Caveat script font (same size as other inner page heroes — 72px desktop / 48px mobile)
  - Subtitle: "Bring your questions. Find wisdom in Scripture." in Lora italic, white/85
  - `HeadingDivider` below the subtitle (same pattern as Prayer Wall hero)
- **Content area**: Centered single-column layout, `max-w-2xl`, `mx-auto`, with standard side padding (`px-4 sm:px-6`)
- **Decorative**: `BackgroundSquiggle` with `SQUIGGLE_MASK_STYLE` fade mask (same pattern as Daily Hub tabs)

### 2. Question Input

- **Textarea**: Large, multi-line textarea at the top of the content area
  - Placeholder: "What's on your heart? Ask anything..."
  - Cyan glow-pulse border on focus (same `animate-glow-pulse` style as the Pray tab textarea)
  - 500 character maximum with visible character counter below the textarea (e.g., "127 / 500")
  - Character counter text turns warning color (`text-warning`) at 450+ characters and danger color (`text-danger`) at 490+ characters
  - Auto-expanding height (same behavior as the Journal/Pray textareas)
- **Crisis detection**: `CrisisBanner` component monitors textarea input for crisis keywords, displays crisis resources immediately if detected (same pattern as Pray tab)
- **Submit button**: "Find Answers" — primary CTA button style (`bg-primary text-white font-semibold py-3 px-8 rounded-lg`), positioned below the textarea, centered
  - Disabled state when textarea is empty (opacity 50%)

### 3. Quick-Start Topic Chips

- 6 chips displayed below the textarea, above the submit button:
  1. "Why does God allow suffering?"
  2. "How do I forgive someone?"
  3. "What does the Bible say about anxiety?"
  4. "How do I know God's plan for me?"
  5. "Is it okay to doubt?"
  6. "How do I pray better?"
- **Style**: Same chip/tag pattern as Pray tab starter chips (`rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:bg-gray-50 min-h-[44px]`)
- **Behavior**: Clicking a chip pre-fills the textarea with that chip's text (same interaction pattern as prayer starter chips — replaces any existing text)
- **Layout**: Flex wrap, centered, `gap-2`

### 4. Auth Gating

#### Logged-out users CAN:
- View the `/ask` page (hero, textarea, chips, decorative elements)
- Type in the textarea (text entry is unrestricted)
- Click topic chips to pre-fill the textarea
- See the character counter update
- Trigger and see the `CrisisBanner` if crisis keywords are detected

#### Logged-out users CANNOT:
- Submit a question by clicking "Find Answers" → auth modal appears with message: **"Sign in to ask questions"**
- See any AI-generated responses

#### Logged-in users CAN:
- All of the above, plus submit questions and receive responses

### 5. Loading State

After submission, show a loading state in the response area (below the input section):

- 3 bouncing dots animation (same pattern as prayer generation loading in PrayTabContent)
- Text message: "Searching Scripture for wisdom..."
- A verse displayed during the wait: *"Your word is a lamp to my feet and a light for my path. — Psalm 119:105 WEB"* in Lora italic, `text-text-light`
- Loading state persists for a mock 2000ms delay before the response appears

### 6. Mock Response Engine

The response is generated client-side by keyword-matching the user's question against a response bank. No API calls in this spec (Phase 3 for real OpenAI integration).

**Response bank**: 15 hardcoded responses covering these topics:
1. Suffering (chip: "Why does God allow suffering?")
2. Forgiveness (chip: "How do I forgive someone?")
3. Anxiety (chip: "What does the Bible say about anxiety?")
4. God's plan / purpose (chip: "How do I know God's plan for me?")
5. Doubt / faith (chip: "Is it okay to doubt?")
6. Prayer / how to pray (chip: "How do I pray better?")
7. Grief / loss
8. Loneliness
9. Anger
10. Marriage / relationships
11. Parenting
12. Financial worry / money
13. Self-worth / identity
14. Temptation / sin
15. Death / afterlife

**Keyword matching**: Simple case-insensitive keyword scan of the user's question text. Match against topic-specific keywords (e.g., "suffer", "pain", "why God" → Suffering response; "forgive", "forgiveness", "hurt me" → Forgiveness response). First match wins. If multiple could match, prioritize by order above.

**Fallback response**: If no keywords match, use a graceful fallback about God's wisdom being available in all circumstances, with general wisdom verses (Proverbs 3:5-6, James 1:5, Psalm 32:8).

**Each response object contains:**
- `id`: Unique identifier (e.g., `"suffering"`, `"forgiveness"`, `"fallback"`)
- `topic`: Display topic name
- `answer`: Direct answer text (2-3 paragraphs in warm second-person voice, referencing Scripture naturally within the text — not as citations but woven in: "As Paul reminds us in Romans 8:28...")
- `verses`: Array of 3 supporting verses, each with:
  - `reference`: e.g., "Romans 8:28"
  - `text`: Full WEB translation text of the verse
  - `explanation`: 1 sentence explaining how this verse applies to the question
- `encouragement`: Closing encouragement (1 sentence)
- `prayer`: Suggested prayer (1 paragraph, warm and personal)

**All Scripture must use the WEB (World English Bible) translation** — public domain, no licensing required.

### 7. Response Display

The response displays in a clean vertical layout below the input section, with a gentle fade-in animation:

1. **Direct answer**: Body text in Inter (`text-text-dark`), standard paragraph spacing. 2-3 paragraphs.

2. **"What Scripture Says" section**: Section heading in Inter semibold, followed by 3 frosted glass verse cards:
   - Each card: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` (matching the dashboard frosted glass card pattern — but on light background, so use: `bg-white rounded-xl border border-gray-200 shadow-sm p-5` to match the meditation card pattern since content area is light)
   - Card content:
     - Verse reference in Inter bold (`font-bold text-text-dark`)
     - Full verse text in Lora italic (`font-serif italic text-text-dark`)
     - Explanation below in `text-sm text-text-light`
   - Cards stack vertically with `space-y-4` gap

3. **Closing encouragement**: Displayed in a subtle callout — light purple/lavender background (`bg-purple-50 border-l-4 border-primary rounded-r-lg p-4`), Inter text

4. **Suggested prayer**: Displayed in Lora italic (`font-serif italic text-text-dark`), preceded by a small "Pray About This" label in Inter semibold

### 8. Action Buttons

Below the response, display 4 action buttons in a responsive row/grid:

1. **"Ask another question"** — Outline style button. Clears the textarea and response, scrolls to the top of the page smoothly
2. **"Journal about this"** — Navigates to `/daily?tab=journal` with the question text passed as context (same context-passing pattern used between Pray → Journal tabs)
3. **"Pray about this"** — Navigates to `/daily?tab=pray` with the question text pre-filled in the prayer textarea
4. **"Share"** — Copies a summary to clipboard: the question text + the first verse reference + "Found on Worship Room". Shows a toast confirmation ("Copied to clipboard")

**Button style**: Same outline/secondary button pattern. Use icon + text for each (Lucide icons: `RefreshCw`, `BookOpen`, `HandHeart` or `Heart`, `Share2`).

**Layout**: On desktop, 4 buttons in a single row with `gap-3`. On mobile, 2x2 grid.

### 9. Feedback Row

Below the action buttons, show a "Was this helpful?" feedback row:

- Text: "Was this helpful?" in Inter, `text-text-light`
- Two icon buttons: thumbs up and thumbs down (Lucide `ThumbsUp` / `ThumbsDown`)
- Default state: both unselected (outline style)
- Selected state: filled with primary color (thumbs up → `text-primary`, thumbs down → `text-danger`)
- Selecting one deselects the other
- On selection, show a brief thank-you message: "Thank you for your feedback!" that fades in and auto-dismisses after 2 seconds

**Persistence**: Store feedback in localStorage under key `wr_chat_feedback` as an array of objects:
```
{ questionId: string, helpful: boolean, timestamp: string }
```
- `questionId` is the matched response ID (e.g., `"suffering"`, `"fallback"`)
- This data is for future analytics; no current UI reads it beyond the immediate feedback display

### 10. Landing Page Integration

**Change the hero TypewriterInput destination**: Currently, submitting text in the landing page hero input navigates to `/daily?tab=pray&q={encodedText}`. Change this to navigate to `/ask?q={encodedText}` instead.

**Auto-submit behavior on `/ask`**: When the page loads with a `?q=` query parameter:
1. Pre-fill the textarea with the decoded query text
2. If the user is logged in, auto-submit the question (trigger the loading state → response flow automatically)
3. If the user is logged out, pre-fill the textarea only (do not auto-submit since they'd just hit the auth modal)

**The Pray tab remains independently accessible** — users can still navigate to `/daily?tab=pray` and generate prayers. The prayer textarea should no longer receive `?q=` context from the hero input (since that now goes to `/ask`), but the Pray tab still accepts context passed from other tabs (Journal → Pray, etc.).

### 11. Navbar Addition

Add an "Ask" link to the desktop and mobile navigation:

**Desktop navbar order**: `Daily Hub` — `Ask` — `Prayer Wall` — `Music` — `Local Support ▾`

- **Link text**: "Ask"
- **Icon**: Sparkles icon from Lucide (indicates AI-powered), displayed before the text
- **Route**: `/ask`
- **Active state**: Same underline/highlight pattern as other nav links

**Mobile drawer**: Add "Ask" between "Daily Hub" and "Prayer Wall" in the same position

---

## UX & Design Notes

- **Tone**: Warm, inviting, and reverent. The page should feel like opening a Bible with a wise friend, not a search engine. Language is encouraging and personal ("You're not alone in asking this...").
- **Colors**: Dark hero gradient → neutral-bg content area. Verse cards use the light-on-white card pattern (meditation card style). Encouragement callout uses a soft purple accent.
- **Typography**: Caveat for hero title, Lora italic for subtitle/verses/prayer, Inter for body text and UI elements.
- **Animations**: Gentle fade-in for the response section. No jarring transitions. Respect `prefers-reduced-motion`.
- **Scripture display**: All Scripture in Lora italic with the reference in Inter bold. WEB translation exclusively.

### Responsive Behavior

**Mobile (< 640px)**:
- Textarea takes full width with `px-4` side padding
- Topic chips wrap into rows (flex-wrap), approximately 2 chips per row given typical chip widths
- Response verses stack vertically (full width)
- Action buttons display in a 2x2 grid
- Hero title scales to 48px (standard mobile hero)

**Tablet (640px - 1024px)**:
- Content area centered at `max-w-2xl`
- Topic chips can fit 3 per row
- Action buttons in a single row
- Hero title at intermediate size

**Desktop (> 1024px)**:
- Content area centered at `max-w-2xl`
- Topic chips in a single row or 2 rows of 3
- Action buttons in a single row with comfortable spacing
- Hero title at 72px

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the textarea accepts free-text user input about life questions, which may include crisis-related content
- **User input involved?**: Yes — free-text question input (500 char max). Crisis keyword detection via `CrisisBanner` component (same implementation as Pray tab)
- **AI-generated content?**: No real AI in this spec (mock responses only). However, mock responses are hardcoded and should be reviewed for theological accuracy and pastoral sensitivity
- **Content boundaries**: Responses must follow the AI Content Boundaries in `01-ai-safety.md` — never claim divine authority, no denominational bias, encourage professional help where appropriate
- **Medical/psychological disclaimer**: Include the standard small disclaimer below AI-generated responses: "AI-generated content for encouragement. Not professional advice." (even though responses are currently mock data, the disclaimer establishes the pattern for when real AI is connected)

---

## Auth & Persistence

- **Logged-out (demo mode)**: Can view page, type, click chips, see crisis banner. Cannot submit questions (auth modal). Zero data persistence — no localStorage writes, no cookies, no anonymous tracking for logged-out users.
- **Logged-in**: Can submit questions and receive responses. Feedback stored in localStorage (`wr_chat_feedback`). No database writes in this spec (frontend-first build).
- **Route type**: Public (page is viewable by everyone; submission is auth-gated)
- **localStorage key**: `wr_chat_feedback` — array of `{ questionId, helpful, timestamp }` objects. Only written when a logged-in user provides feedback.

---

## Acceptance Criteria

### Page Structure & Navigation
- [ ] `/ask` route is accessible and renders the AI Bible Chat page
- [ ] Page uses `PageHero` with "Ask God's Word" title in Caveat script font and "Bring your questions. Find wisdom in Scripture." subtitle in Lora italic
- [ ] `HeadingDivider` appears below the subtitle
- [ ] `BackgroundSquiggle` with `SQUIGGLE_MASK_STYLE` is present in the content area
- [ ] Content area is centered with `max-w-2xl` max-width
- [ ] "Ask" link appears in the desktop navbar between "Daily Hub" and "Prayer Wall" with a Sparkles icon
- [ ] "Ask" link appears in the mobile drawer in the same position between "Daily Hub" and "Prayer Wall"

### Question Input
- [ ] Textarea renders with placeholder "What's on your heart? Ask anything..."
- [ ] Textarea has cyan glow-pulse border animation on focus (matching Pray tab textarea)
- [ ] Character counter displays below textarea, updates on input (e.g., "127 / 500")
- [ ] Character counter text turns warning color at 450+ characters
- [ ] Character counter text turns danger color at 490+ characters
- [ ] Textarea enforces 500 character max (cannot type beyond 500)
- [ ] "Find Answers" button is disabled (opacity 50%) when textarea is empty
- [ ] 6 topic chips display below the textarea with correct text
- [ ] Clicking a chip pre-fills the textarea with the chip's text
- [ ] `CrisisBanner` appears when crisis keywords are detected in textarea input

### Auth Gating
- [ ] Logged-out user clicking "Find Answers" sees auth modal with message "Sign in to ask questions"
- [ ] Logged-out user can type in textarea, click chips, and see crisis banner without auth modal
- [ ] Logged-in user clicking "Find Answers" triggers the loading state and response flow

### Loading State
- [ ] After submission, 3 bouncing dots animation appears
- [ ] Loading message "Searching Scripture for wisdom..." is displayed
- [ ] Loading verse "Your word is a lamp to my feet and a light for my path. — Psalm 119:105 WEB" appears in Lora italic
- [ ] Loading state persists for approximately 2000ms before response appears

### Response Display
- [ ] Direct answer renders in Inter body text with 2-3 paragraphs
- [ ] "What Scripture Says" section heading appears
- [ ] 3 verse cards render with verse reference in bold, full WEB text in Lora italic, and explanation in `text-sm text-text-light`
- [ ] Verse cards use the meditation card style (`rounded-xl border border-gray-200 bg-white p-5 shadow-sm`)
- [ ] Closing encouragement appears in a subtle purple callout (`bg-purple-50 border-l-4 border-primary`)
- [ ] Suggested prayer appears in Lora italic with "Pray About This" label
- [ ] Response section fades in with gentle animation
- [ ] AI disclaimer "AI-generated content for encouragement. Not professional advice." appears below the response

### Mock Response Engine
- [ ] Typing a question about suffering returns the suffering response with relevant verses
- [ ] Typing a question about forgiveness returns the forgiveness response
- [ ] Typing an unmatched question returns the fallback response with Proverbs 3:5-6, James 1:5, and Psalm 32:8
- [ ] All 15 topic responses are implemented and reachable via keyword matching
- [ ] All Scripture text uses the WEB (World English Bible) translation

### Action Buttons
- [ ] "Ask another question" clears textarea and response, scrolls to top
- [ ] "Journal about this" navigates to `/daily?tab=journal` with question context
- [ ] "Pray about this" navigates to `/daily?tab=pray` with question context
- [ ] "Share" copies question + first verse reference + "Found on Worship Room" to clipboard and shows toast

### Feedback
- [ ] "Was this helpful?" row with thumbs up/down buttons appears below action buttons
- [ ] Selecting thumbs up highlights it in primary color and shows "Thank you for your feedback!"
- [ ] Selecting thumbs down highlights it in danger color and shows the same thank-you message
- [ ] Feedback is stored in localStorage under `wr_chat_feedback`

### Landing Page Integration
- [ ] Hero TypewriterInput on the landing page now navigates to `/ask?q={encodedText}` instead of `/daily?tab=pray&q={encodedText}`
- [ ] Loading `/ask?q=some+question` pre-fills the textarea with "some question"
- [ ] For logged-in users, loading with `?q=` auto-submits the question
- [ ] For logged-out users, loading with `?q=` pre-fills but does not auto-submit

### Responsive
- [ ] On mobile (375px), textarea is full-width, chips wrap into multiple rows, action buttons are in 2x2 grid
- [ ] On tablet (768px), content is centered, chips fit ~3 per row, action buttons in a single row
- [ ] On desktop (1440px), content is centered at `max-w-2xl`, comfortable spacing throughout

### Accessibility
- [ ] Textarea has an associated `<label>` (can be visually hidden)
- [ ] All buttons have accessible names (visible text or aria-label)
- [ ] Topic chips are keyboard accessible (Tab + Enter/Space)
- [ ] Loading state has an `aria-live="polite"` region for screen readers
- [ ] Crisis banner uses `role="alert"` with `aria-live="assertive"`
- [ ] Response section uses appropriate heading hierarchy
- [ ] All interactive elements have minimum 44px touch targets on mobile
- [ ] Animations respect `prefers-reduced-motion`

---

## Out of Scope

- **Conversation history / follow-up questions** — Spec 2 of this sequence
- **Topic browsing / categories page** — Spec 2
- **Real OpenAI API integration** — Phase 3 (backend wiring)
- **Backend persistence of questions/answers** — Phase 3
- **Saved/bookmarked answers** — Future enhancement
- **Multi-turn conversation** — Spec 2
- **Voice input for questions** — Future enhancement (could reuse Journal voice input)
- **Read Aloud for answers** — Could be added but not in this spec
- **KaraokeText word-by-word reveal for answer text** — Could be added but not in this spec
- **Sharing individual verse cards** — Future enhancement
- **Related questions / "People also ask"** — Spec 2
- **Backend rate limiting for AI chat** — Phase 3
- **Analytics dashboard for feedback data** — Future enhancement
