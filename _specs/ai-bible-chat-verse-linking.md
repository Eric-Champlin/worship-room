# Feature: AI Bible Chat — Verse Linking & Follow-Up Questions

**Spec sequence:** This is Spec 2 (final) of the AI Bible Chat sequence, building on Spec 1's `/ask` page, question input, keyword-matched response engine, and response display. This spec adds interactive verse linking to the Bible reader, a follow-up question system for conversational depth, and curated popular topic cards for first-time users.

**Depends on:** `_specs/ai-bible-chat-input-response.md` (Spec 1 / Spec 36) — the `/ask` page, textarea, mock response engine, response display, action buttons, and feedback row must be built first.

**Also depends on:** `_specs/bible-reader-browser.md` (Spec 23) and `_specs/bible-reader-highlights-notes.md` (Spec 24) — the Bible reader route (`/bible/:book/:chapter`) and the `wr_bible_notes` / `wr_bible_highlights` localStorage model must be built first. Verse links navigate to the Bible reader; "Highlight in Bible" and "Save note" actions write to the same storage.

---

## Overview

The first spec created a standalone question-and-answer experience — type a question, get a Scripture-grounded answer. But real Bible study is a conversation, not a single exchange. When someone asks "Why does God allow suffering?", the answer often raises new questions: "What if my suffering doesn't end?", "How did Jesus handle pain?", "Can faith coexist with therapy?" The best spiritual mentors don't just answer — they help you dig deeper.

This spec transforms the `/ask` page from a one-shot Q&A tool into a conversational Bible study experience. Three enhancements work together:

1. **Verse linking** — Every Scripture reference in AI responses becomes a clickable link to the Bible reader, with quick-action buttons to highlight verses or save notes. This bridges the gap between "reading about a verse" and "reading the verse in context," encouraging users to spend time in the actual text of Scripture.

2. **Follow-up questions** — After each response, contextually relevant follow-up chips invite users to explore related angles. Clicking a follow-up starts a new exchange, building a conversational thread on the page. This models the rhythm of real discipleship: question leads to insight leads to deeper question.

3. **Popular topic cards** — Curated entry points for first-time users who aren't sure what to ask. These lower the barrier to engagement and surface the breadth of topics the feature can address.

Together, these features create a spiritual study companion that meets users where they are and guides them deeper into Scripture — exactly what Worship Room's mission of emotional healing through God's Word demands.

---

## User Stories

- As a **logged-in user**, I want to click on a Bible verse reference in an AI response so that I can read the full verse in context within the Bible reader.
- As a **logged-in user**, I want to highlight a referenced verse directly from the chat response so that I can mark it for later without leaving the conversation.
- As a **logged-in user**, I want to save a personal note on a referenced verse from the chat response so that I can capture my thoughts while the insight is fresh.
- As a **logged-in user**, I want to see follow-up questions after an AI response so that I can explore related angles and go deeper into the topic.
- As a **logged-in user**, I want a scrollable conversation thread so that I can see my full chain of questions and answers in one place.
- As any user, I want to save my conversation to clipboard so that I can paste it into my journal or share it with a friend.
- As a **logged-out visitor**, I want to see popular topic cards on the Ask page so that I can understand what kinds of questions are supported before signing in.

---

## Requirements

### 1. Verse Linking — Inline References

Every Bible verse reference that appears within the AI response answer text (e.g., "As Paul reminds us in Romans 8:28...") should be a clickable link.

- **Detection**: Parse the answer text for patterns matching standard Bible reference formats (e.g., "Romans 8:28", "Psalm 23:1-3", "1 Corinthians 13:4", "John 3:16"). The response bank hardcodes these references within the answer text, so the parser should handle common formats: `[Book] [Chapter]:[Verse]` and `[Number] [Book] [Chapter]:[Verse]`.
- **Link destination**: Navigate to `/bible/:bookSlug/:chapter#verse-:verseNumber`. The book slug is the lowercase, hyphenated version of the book name (e.g., "Romans" → `romans`, "1 Corinthians" → `1-corinthians`, "Song of Solomon" → `song-of-solomon`). For verse ranges (e.g., "23:1-3"), link to the first verse in the range.
- **Link style**: `text-primary-lt` with `hover:underline`. The link should be visually distinct from surrounding body text but not overly prominent.
- **Coming soon books**: If the referenced book doesn't have full content in the Bible reader yet, the link still works — it navigates to the chapter view, which shows the placeholder message. This is acceptable and expected.
- **Accessibility**: Links must have descriptive text (the reference itself serves as the accessible name). Screen readers should announce them as links.

### 2. Verse Linking — Supporting Verse Cards

The 3 supporting verse cards in the "What Scripture Says" section (already built in Spec 1) also get clickable verse references.

- **Card reference link**: The verse reference text at the top of each card (e.g., "Romans 8:28") becomes a clickable link with the same `text-primary-lt hover:underline` style. Clicking navigates to the Bible reader at that verse.
- **Two action buttons** below each verse card, displayed in a compact row:
  - **"Highlight in Bible"** — Small button with Lucide `Highlighter` icon + text. Navigates to the Bible reader at the verse location AND auto-triggers the highlight action bar with yellow pre-selected. Implementation: navigate to `/bible/:bookSlug/:chapter?highlight=:verseNumber` — the Bible reader should detect the `highlight` query param and auto-open the floating action bar on that verse with yellow pre-selected.
  - **"Save note"** — Small button with Lucide `StickyNote` icon + text. Expands an inline note textarea directly below the verse card (within the chat response, not in the Bible reader). The textarea has the same styling as the Bible reader note editor: placeholder "Add a note about this verse...", 300 character max, Save/Cancel buttons. Saving writes to `wr_bible_notes` localStorage using the same data model as Spec 24: `{ id: string, book: string, chapter: number, verseNumber: number, text: string, createdAt: string, updatedAt: string }`. The `book` field uses the full book name (e.g., "Romans"), consistent with Spec 24.
- **Button style**: Small, muted buttons — `text-xs text-text-light hover:text-primary transition-colors`. Icon size 14px. Buttons sit in a `flex gap-3` row below the verse card content, above the card's bottom padding.

### 3. Auth Gating for Verse Card Actions

- **Verse reference links** (both inline and on cards): Work for ALL users (logged-in and logged-out). Navigating to the Bible reader is a public action.
- **"Highlight in Bible" button**: Requires auth. Logged-out users clicking this see the auth modal with message: **"Sign in to save highlights and notes"**.
- **"Save note" button**: Requires auth. Logged-out users clicking this see the auth modal with message: **"Sign in to save highlights and notes"**.
- **Note textarea** (when expanded): Only appears for logged-in users (the button triggers auth modal for logged-out users, so the textarea never renders for them).

### 4. Follow-Up Questions — "Dig Deeper" Section

After the AI response (below the verse cards, encouragement callout, and prayer), display a "Dig Deeper" section with 3 follow-up question chips.

- **Section label**: "Dig Deeper" in Inter semibold, `text-text-dark`, with a subtle bottom border or divider above it (`border-t border-gray-200 pt-4 mt-6`)
- **3 follow-up chips**: Each chip is a short question (under 60 characters) that explores a related angle of the original question's topic.
- **Chip style**: Same rounded chip pattern as the quick-start topic chips from Spec 1 (`rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:bg-gray-50 min-h-[44px]`). Add a small Lucide `MessageCircle` icon before the text to distinguish follow-up chips from topic chips.
- **Data source**: Each response object in the mock response bank gets a new `followUpQuestions` field — an array of 3 strings. Examples:
  - Suffering response: `["What if my suffering doesn't end?", "How did Jesus handle pain?", "Can faith and therapy work together?"]`
  - Anxiety response: `["What if my anxiety doesn't go away?", "How did Jesus handle stress?", "Can faith and therapy work together?"]`
  - Forgiveness response: `["What if I can't forgive myself?", "Does forgiving mean forgetting?", "How do I forgive someone who isn't sorry?"]`
  - Fallback response: `["How do I hear God's voice?", "What does it mean to have faith?", "How can I trust God with my future?"]`
  - All 15 topic responses plus the fallback get follow-up questions.

### 5. Follow-Up Question Interaction

Clicking a follow-up chip behaves like asking a new question:

1. The chip's text is displayed as a new user question in the conversation thread (right-aligned bubble)
2. The loading state appears (same bouncing dots + "Searching Scripture for wisdom..." from Spec 1)
3. After the mock delay, a new response renders below (keyword-matched against the follow-up question text)
4. The previous Q&A pair remains visible above
5. The page auto-scrolls to the latest response smoothly (`scrollIntoView({ behavior: 'smooth', block: 'start' })`)

### 6. Conversation Thread Layout

When multiple Q&A pairs exist (from follow-up questions or submitting new questions via the textarea), they display as a vertical conversation thread:

- **User question bubble**: Right-aligned, `bg-primary/20 rounded-2xl p-4`, `max-w-[80%]` on desktop / `max-w-[90%]` on mobile. Text in Inter, `text-text-dark`.
- **AI response**: Left-aligned, standard response layout from Spec 1 (full width within the content column). Includes answer text, verse cards with linking/actions, encouragement, prayer, and follow-up chips.
- **Divider between pairs**: `border-t border-white/5 my-8` — subtle separation.
- **First Q&A pair**: The initial question (from textarea submission) gets the same right-aligned bubble treatment. The entire response section from Spec 1 (answer, verses, encouragement, prayer, action buttons, feedback row) appears as the first AI response in the thread.
- **Subsequent Q&A pairs**: Follow-up responses include the full response layout (answer, verse cards, encouragement, prayer, follow-up chips) but do NOT repeat the action buttons row ("Ask another question", "Journal about this", etc.) or the feedback row. Those only appear once, after the first response.
- **Follow-up chips**: Each response in the thread has its own set of follow-up chips. Clicking any chip always appends a new Q&A pair to the bottom of the thread.
- **Scrolling**: Natural page scroll. New responses append at the bottom. Auto-scroll to the latest response when it appears.

### 7. Conversation Persistence

- **NOT persisted to localStorage** — refreshing the page starts a fresh session. This is intentional: the mock responses are keyword-matched, so a persisted conversation could feel repetitive when the same keywords match the same responses. When real AI is wired up in Phase 3, conversation persistence will make sense.
- **Conversation state lives in React state only** — an array of `{ question: string, response: ResponseObject }` pairs.

### 8. "Save This Conversation" Button

After 2 or more Q&A pairs exist in the thread, display a "Save this conversation" button at the bottom of the thread.

- **Button style**: Outline/secondary style with Lucide `ClipboardCopy` icon + "Save this conversation" text. Same button styling as the action buttons from Spec 1.
- **Behavior**: Copies the entire conversation to clipboard as formatted plain text:
  ```
  Q: [question text]
  A: [first ~150 chars of answer text]...
  Verses: [reference 1], [reference 2], [reference 3]

  Q: [question text]
  A: [first ~150 chars of answer text]...
  Verses: [reference 1], [reference 2], [reference 3]

  — Saved from Worship Room (worshiproom.com)
  ```
- **Toast**: Shows "Conversation copied to clipboard!" using the existing toast system.
- **Auth**: Does NOT require login. Clipboard copy is a public action (same rationale as verse copy in the Bible reader).

### 9. Recent Questions Section

When the user first lands on `/ask` (before submitting a question), display a "Popular Topics" section below the input area.

- **Section heading**: "Popular Topics" in Inter semibold, `text-text-dark`
- **5 topic cards**:

  | Topic | Description | Starter Question |
  |-------|-------------|-----------------|
  | Understanding Suffering | Why pain exists and how to endure it | "Why does God allow suffering?" |
  | Finding Forgiveness | Letting go of hurt and finding freedom | "How do I forgive someone who hurt me?" |
  | Overcoming Anxiety | Finding peace when worry overwhelms | "What does the Bible say about anxiety?" |
  | Knowing God's Will | Discovering purpose and direction | "How do I know God's plan for my life?" |
  | Building Stronger Faith | Growing deeper in trust and belief | "How can I grow stronger in my faith?" |

- **Card style**: White card on neutral background — `bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer`. Each card shows the topic title in Inter semibold, description in `text-sm text-text-light`, and a right-pointing Lucide `ChevronRight` icon in `text-text-light`.
- **Interaction**: Clicking a card pre-fills the textarea with the starter question and auto-submits (same flow as clicking "Find Answers": loading state → response). For logged-out users, clicking a card pre-fills the textarea only (does not auto-submit, since submission is auth-gated).
- **Visibility**: The Popular Topics section hides once the user has submitted a question (the conversation thread replaces it). It does not reappear until the page is refreshed.

### 10. Integration with Existing Spec 1 Elements

This spec enhances — does not replace — Spec 1's elements:

- **Quick-start topic chips** (the 6 chips below the textarea): Remain as-is. The Popular Topics cards are a separate section below.
- **Action buttons row** (Ask another, Journal, Pray, Share): Remain after the first response. "Ask another question" now clears the entire conversation thread and re-shows the Popular Topics section.
- **Feedback row**: Remains after the first response only.
- **Character counter, crisis banner, loading state**: All unchanged.

---

## UX & Design Notes

- **Tone**: The conversation thread should feel like a guided Bible study — warm, unhurried, and progressively deeper. Follow-up questions should feel like a wise mentor suggesting "Have you also considered...?" rather than a chatbot generating prompts.
- **Colors**: Verse reference links in `text-primary-lt` (#8B5CF6) — a lighter violet that stands out on both light backgrounds (answer text) and white card backgrounds (verse cards). User question bubbles in `bg-primary/20` — a soft violet tint that clearly distinguishes user input from AI responses.
- **Typography**: Consistent with Spec 1. User questions in Inter regular. All Scripture in Lora italic. Follow-up chip text in Inter regular `text-sm`.
- **Animations**: Gentle fade-in for new Q&A pairs appended to the thread. Smooth auto-scroll. Respect `prefers-reduced-motion`. Inline note textarea expands with a smooth height transition.
- **Design system recon**: Reference `_plans/recon/design-system.md` for the Inner Page Hero gradient, meditation card pattern (for verse cards), and chip styling. The user question bubble is a new visual pattern — `bg-primary/20 rounded-2xl p-4` has not been used elsewhere in the app.

### Responsive Behavior

**Mobile (< 640px)**:
- User question bubbles take `max-w-[90%]` width (right-aligned)
- Follow-up chips stack vertically (full width, `flex-col gap-2`)
- Popular Topics cards stack in a single column
- Verse card action buttons stack vertically if needed (though they should fit horizontally at this size given the small text)
- Inline note textarea takes full card width
- "Save this conversation" button takes full width

**Tablet (640px - 1024px)**:
- User question bubbles at `max-w-[80%]`
- Follow-up chips in a horizontal row (flex-wrap if needed)
- Popular Topics cards in a 2-column grid
- Standard content centering at `max-w-2xl`

**Desktop (> 1024px)**:
- User question bubbles at `max-w-[80%]`
- Follow-up chips in a single horizontal row
- Popular Topics cards in a single row of 5 (or 3+2 wrap)
- Standard content centering at `max-w-2xl`

---

## AI Safety Considerations

- **Crisis detection needed?**: No new crisis detection beyond what Spec 1 already implements. The `CrisisBanner` monitors the textarea input. Follow-up question chips are hardcoded (not user-typed), so they cannot contain crisis content. The inline note textarea for verse notes does need crisis detection — it accepts free-text input. Use the same `CrisisBanner` pattern (or the `containsCrisisKeyword()` function from `constants/crisis-resources.ts`) to check note text. Display the crisis banner above the Save button if detected.
- **User input involved?**: Yes — the textarea (already handled by Spec 1) and the inline note textarea for verse notes (new in this spec).
- **AI-generated content?**: No real AI. Mock responses are hardcoded. Follow-up questions are hardcoded. All content has been reviewed for theological accuracy and pastoral sensitivity.
- **Content boundaries**: All hardcoded follow-up questions must follow the AI Content Boundaries in `01-ai-safety.md` — no deterministic theological claims, no medical advice, encouragement-focused.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out | Logged-in |
|---------|-----------|-----------|
| View `/ask` page | Yes | Yes |
| Click verse reference links (inline + cards) | Yes — navigates to Bible reader | Yes |
| Click "Highlight in Bible" on verse card | Auth modal: "Sign in to save highlights and notes" | Navigates to Bible reader with highlight param |
| Click "Save note" on verse card | Auth modal: "Sign in to save highlights and notes" | Expands inline note textarea |
| Save a note via inline textarea | N/A (textarea never renders) | Saves to `wr_bible_notes` |
| Click follow-up question chip | Auth modal: "Sign in to ask questions" (same gate as initial submission) | Appends new Q&A pair to thread |
| Click Popular Topics card | Pre-fills textarea only (no submit) | Pre-fills and auto-submits |
| "Save this conversation" clipboard copy | Yes — no auth required | Yes |
| View Popular Topics section | Yes | Yes |

### Persistence

- **`wr_bible_notes`** (EXISTING from Spec 24): Notes saved from the chat response verse cards write to this same storage. Data model: `{ id: string, book: string, chapter: number, verseNumber: number, text: string, createdAt: string, updatedAt: string }`. Max 200 notes (shared limit with Bible reader notes).
- **`wr_bible_highlights`** (EXISTING from Spec 24): "Highlight in Bible" navigates to the Bible reader, which handles the highlight storage. This spec does NOT write to `wr_bible_highlights` directly — it passes a query param to the Bible reader page.
- **Conversation thread**: React state only. Not persisted. Refreshing starts fresh.
- **No new localStorage keys** introduced by this spec.
- **Route type**: Public (`/ask` is viewable by everyone; interactive actions are auth-gated per the table above).

---

## Edge Cases

- **Follow-up question matches the same response as the original question**: This is expected with keyword matching. The same response re-renders with the same verse cards and follow-up chips. When real AI is connected in Phase 3, responses will be contextual and non-repetitive.
- **Verse reference in answer text doesn't parse correctly**: If the parser can't extract a valid book/chapter/verse from a reference string, render it as plain text (no link). This is a graceful degradation — no broken links.
- **Book slug doesn't match a route in the Bible reader**: The link still navigates. The Bible reader will show "Book not found" or redirect. This is acceptable since all 66 books should have routes even if some are "coming soon."
- **User clicks "Save note" on a verse that already has a note in `wr_bible_notes`**: Pre-fill the inline textarea with the existing note text. The Save button updates the existing note (matching by book + chapter + verseNumber).
- **200 note limit reached**: When saving from the chat, show the same toast as the Bible reader: "Note limit reached. Delete an existing note to add a new one." Save button is disabled.
- **Very long conversation thread (5+ Q&A pairs)**: The page scrolls naturally. No virtualization needed for the mock data phase (threads are unlikely to exceed 5-6 pairs given the limited response bank). Performance should be revisited when real AI enables unlimited conversation length.
- **"Ask another question" button clicked during a multi-pair thread**: Clears the entire conversation thread (React state reset), clears the textarea, re-shows the Popular Topics section, scrolls to top.
- **Clipboard copy fails** (e.g., permissions denied): Show a toast: "Couldn't copy — try selecting the text manually." Use the same try/catch pattern as the Share button in Spec 1.
- **Multiple notes saved for different verses from the same chat response**: Each note is independent, identified by book + chapter + verseNumber. Multiple saves work correctly.

---

## Acceptance Criteria

### Verse Linking — Inline References
- [ ] Bible verse references within AI answer text (e.g., "Romans 8:28") are rendered as clickable links
- [ ] Links use `text-primary-lt` color with `hover:underline` style
- [ ] Clicking an inline verse link navigates to `/bible/:bookSlug/:chapter#verse-:verseNumber`
- [ ] Verse references for books without full content still link correctly (Bible reader shows placeholder)
- [ ] Common reference formats are parsed: "Romans 8:28", "1 Corinthians 13:4", "Psalm 23:1-3"
- [ ] Unrecognized reference patterns render as plain text (no broken links)

### Verse Linking — Supporting Verse Cards
- [ ] The verse reference at the top of each supporting verse card is a clickable link to the Bible reader
- [ ] "Highlight in Bible" button appears below each verse card with `Highlighter` icon
- [ ] "Save note" button appears below each verse card with `StickyNote` icon
- [ ] Buttons use `text-xs text-text-light hover:text-primary` styling with 14px icons
- [ ] Clicking "Highlight in Bible" navigates to the Bible reader with highlight query param
- [ ] Clicking "Save note" expands an inline note textarea below the verse card
- [ ] Inline note textarea has placeholder "Add a note about this verse...", 300 char max, and Save/Cancel buttons
- [ ] Saving a note writes to `wr_bible_notes` with correct book, chapter, verseNumber, and generated UUID
- [ ] If a note already exists for that verse, the textarea pre-fills with the existing note text
- [ ] Crisis keyword detection fires on note text (crisis banner appears if triggered)
- [ ] 200-note limit shows toast and disables Save button when reached

### Auth Gating
- [ ] Logged-out user clicking verse reference links navigates to Bible reader (no auth gate)
- [ ] Logged-out user clicking "Highlight in Bible" sees auth modal: "Sign in to save highlights and notes"
- [ ] Logged-out user clicking "Save note" sees auth modal: "Sign in to save highlights and notes"
- [ ] Logged-out user clicking a follow-up chip sees auth modal: "Sign in to ask questions"
- [ ] Logged-out user clicking a Popular Topics card pre-fills textarea but does not auto-submit
- [ ] "Save this conversation" clipboard copy works without auth

### Follow-Up Questions
- [ ] "Dig Deeper" section appears below the response with 3 follow-up question chips
- [ ] Follow-up chips display with `MessageCircle` icon and rounded-full chip styling
- [ ] Each of the 15 response bank entries has a `followUpQuestions` array of 3 strings
- [ ] Fallback response has generic follow-up questions
- [ ] All follow-up question text is under 60 characters
- [ ] Clicking a follow-up chip displays the question in a right-aligned bubble
- [ ] Loading state appears after clicking a follow-up chip (same bouncing dots)
- [ ] A new keyword-matched response renders below the previous Q&A pair
- [ ] Previous Q&A pairs remain visible above in the conversation thread

### Conversation Thread
- [ ] User questions display in right-aligned bubbles with `bg-primary/20 rounded-2xl p-4 max-w-[80%]`
- [ ] AI responses display in standard left-aligned full-width layout
- [ ] Subtle divider (`border-t border-white/5 my-8`) separates Q&A pairs
- [ ] New responses auto-scroll the page to the latest content smoothly
- [ ] Action buttons row and feedback row appear only after the first response (not repeated)
- [ ] Follow-up chips appear on every response in the thread
- [ ] Conversation is NOT persisted — refreshing the page starts fresh

### Save Conversation
- [ ] "Save this conversation" button appears after 2+ Q&A pairs
- [ ] Button uses Lucide `ClipboardCopy` icon with "Save this conversation" text
- [ ] Clicking copies formatted text to clipboard (Q: / A: / Verses: format with "Saved from Worship Room" footer)
- [ ] Toast "Conversation copied to clipboard!" appears on success
- [ ] Clipboard failure shows fallback toast "Couldn't copy — try selecting the text manually."

### Popular Topics Section
- [ ] "Popular Topics" section appears below input area when no question has been submitted
- [ ] 5 topic cards display with title, description, and `ChevronRight` icon
- [ ] Cards use `bg-white rounded-xl border border-gray-200 shadow-sm` with `hover:shadow-md`
- [ ] Clicking a card pre-fills the textarea with the starter question
- [ ] For logged-in users, clicking a card auto-submits the question
- [ ] Popular Topics section hides after the first question is submitted
- [ ] "Ask another question" re-shows the Popular Topics section

### Responsive
- [ ] On mobile (375px): question bubbles at `max-w-[90%]`, follow-up chips stack vertically, Popular Topics cards in single column
- [ ] On tablet (768px): question bubbles at `max-w-[80%]`, follow-up chips wrap horizontally, Popular Topics in 2-column grid
- [ ] On desktop (1440px): content centered at `max-w-2xl`, follow-up chips in single row, Popular Topics in a row

### Accessibility
- [ ] Verse reference links have descriptive accessible names (the reference text itself)
- [ ] "Highlight in Bible" and "Save note" buttons have accessible labels
- [ ] Follow-up chips are keyboard accessible (Tab + Enter/Space)
- [ ] Inline note textarea has an associated label (can be visually hidden)
- [ ] "Dig Deeper" section uses appropriate heading level
- [ ] Auto-scroll does not disorient screen reader users (new content announced via `aria-live="polite"` region)
- [ ] All new interactive elements have minimum 44px touch targets on mobile
- [ ] Animations respect `prefers-reduced-motion`
- [ ] "Save this conversation" button has accessible label

---

## Out of Scope

- **Real OpenAI API integration** — Phase 3 (backend wiring). Mock keyword-matched responses only.
- **Conversation persistence to localStorage or database** — Intentionally deferred. Mock responses are repetitive; persistence makes sense with real AI.
- **Multi-session conversation history** ("My past conversations" page) — Future enhancement, requires backend.
- **Verse cross-references within responses** — Spec 25 (Bible Reader Audio & Cross-References) covers this for the Bible reader. Not duplicated here.
- **AI-generated follow-up questions** — Follow-ups are hardcoded per response. Real AI will generate contextual follow-ups in Phase 3.
- **Read Aloud for responses** — Could reuse the existing `ReadAloudButton` but not in this spec.
- **KaraokeText word-by-word reveal** — Could be applied to answer text but not in this spec.
- **Voice input for questions** — Future enhancement (could reuse Journal voice input from Spec 12).
- **Sharing individual verse cards from chat** — Future enhancement.
- **Backend rate limiting for AI chat** — Phase 3.
- **Highlight color picker within the chat** (choosing a color other than yellow) — "Highlight in Bible" always uses yellow pre-selected. Users can change the color in the Bible reader.
- **Real-time search/autocomplete as user types** — Future enhancement.
